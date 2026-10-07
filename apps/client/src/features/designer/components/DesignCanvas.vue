<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch, nextTick } from 'vue'
import type Konva from 'konva'
import {
  Group as KGroup,
  Image as KImage,
  Layer as KLayer,
  Rect as KRect,
  Shape as KShape,
  Stage as KStage,
  Transformer as KTransformer,
} from 'vue-konva'
import { textColors } from '../data/designOptions'
import type { LayerKind } from '../design'
import {
  boxInsideRect,
  containRect,
  normalizeRotation,
  rotatedHalfExtents,
  zoneRect,
  type CanvasBox,
  type LayerTransform,
  type Rect,
} from '../geometry'
import { designFontCss, REFERENCE_FONT_SIZE, type TextLayout } from '../textLayout'
import type { EmbroideryZone } from '../types'
import { injectDesigns } from '../useDesigns'
import { injectSelection } from '../useSelection'

/*
 * Single interactive editor for the active item. Layers:
 *   product  – the product image, letterboxed with "contain"
 *   design   – per-zone groups with the image layer below the text layer (export content)
 *   ui       – zone outlines and the transformer (never part of an export)
 * All positions are derived from the stored zone-relative transforms on every render, so resizing
 * the preview never changes design data.
 */

const selection = injectSelection()
const designs = injectDesigns()

const containerRef = useTemplateRef<HTMLDivElement>('container')
const stageRef = useTemplateRef<{ getNode: () => Konva.Stage }>('stage')
const transformerRef = useTemplateRef<{ getNode: () => Konva.Transformer }>('transformer')
const size = ref({ width: 0, height: 0 })

/*
 * Touch: a gesture that starts on a design layer must move the layer, not scroll the page.
 * Konva works with pointer events, so scrolling is cancelled here with a non-passive touchmove
 * listener, only for touches that began on a layer. Touches elsewhere on the canvas still scroll.
 */
let touchOnLayer = false
function onTouchStart(event: TouchEvent) {
  const stage = stageRef.value?.getNode()
  const touch = event.touches[0]
  if (!stage || !touch || event.touches.length > 1) {
    touchOnLayer = false
    return
  }
  const box = stage.container().getBoundingClientRect()
  const hit = stage.getIntersection({ x: touch.clientX - box.left, y: touch.clientY - box.top })
  touchOnLayer = Boolean(
    hit && (hit.hasName('design-layer') || hit.getParent()?.className === 'Transformer'),
  )
}
function onTouchMove(event: TouchEvent) {
  if (touchOnLayer && event.cancelable) event.preventDefault()
}
function onTouchEnd() {
  touchOnLayer = false
}

let observer: ResizeObserver | undefined
onMounted(() => {
  const el = containerRef.value
  el?.addEventListener('touchstart', onTouchStart, { passive: true })
  el?.addEventListener('touchmove', onTouchMove, { passive: false })
  el?.addEventListener('touchend', onTouchEnd, { passive: true })
  el?.addEventListener('touchcancel', onTouchEnd, { passive: true })
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    // Hidden panels report 0×0; the stage is only rendered with a real size.
    size.value = {
      width: Math.floor(entry.contentRect.width),
      height: Math.floor(entry.contentRect.height),
    }
  })
  if (containerRef.value) observer.observe(containerRef.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  const el = containerRef.value
  el?.removeEventListener('touchstart', onTouchStart)
  el?.removeEventListener('touchmove', onTouchMove)
  el?.removeEventListener('touchend', onTouchEnd)
  el?.removeEventListener('touchcancel', onTouchEnd)
})

const entry = computed(() => selection.activeEntry.value)
watch(
  entry,
  (value) => {
    if (value) void designs.loadProductImage(value.product)
  },
  { immediate: true },
)

const productImage = computed(() => {
  const state = entry.value && designs.productImageState(entry.value.product)
  return state?.status === 'ready' ? state.image : null
})

const drawn = computed(() =>
  productImage.value && size.value.width > 0 && size.value.height > 0
    ? containRect(size.value, productImage.value)
    : null,
)

// Theme tokens for canvas strokes (canvas cannot use Tailwind classes).
const colors = ref({ primary: '#456454', card: '#ffffff', muted: '#6b635c' })
onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  colors.value = {
    primary: read('--primary', colors.value.primary),
    card: read('--card', colors.value.card),
    muted: read('--muted-foreground', colors.value.muted),
  }
})

interface LayerView {
  kind: LayerKind
  id: string
  width: number
  height: number
  transform: LayerTransform
  config: Record<string, unknown>
}

interface ZoneView {
  zone: EmbroideryZone
  rect: Rect
  layers: LayerView[]
}

function nodeConfig(rect: Rect, transform: LayerTransform, width: number, height: number) {
  return {
    x: transform.x * rect.width,
    y: transform.y * rect.height,
    width,
    height,
    offsetX: width / 2,
    offsetY: height / 2,
    rotation: transform.rotation,
    scaleX: 1,
    scaleY: 1,
    name: 'design-layer',
    draggable: true,
    // Keeps the whole rotated box inside the zone while dragging.
    dragBoundFunc(pos: { x: number; y: number }) {
      const { halfWidth, halfHeight } = rotatedHalfExtents(width, height, transform.rotation)
      const zoneAbs = { x: rect.x, y: rect.y }
      return {
        x: clamp(pos.x, zoneAbs.x + halfWidth, zoneAbs.x + rect.width - halfWidth),
        y: clamp(pos.y, zoneAbs.y + halfHeight, zoneAbs.y + rect.height - halfHeight),
      }
    },
  }
}

const clamp = (value: number, min: number, max: number) =>
  max < min ? (min + max) / 2 : Math.min(Math.max(value, min), max)

function textSceneFunc(layout: TextLayout, color: string, height: number) {
  const scale = height / layout.height
  return (context: Konva.Context) => {
    context.save()
    context.scale(scale, scale)
    context.setAttr('font', designFontCss(REFERENCE_FONT_SIZE))
    context.setAttr('textAlign', 'center')
    context.setAttr('textBaseline', 'alphabetic')
    context.setAttr('fillStyle', color)
    for (const line of layout.lines) context.fillText(line.text, line.x, line.y)
    context.restore()
  }
}

// The whole box is the hit area, so thin script strokes are easy to grab.
function boxHitFunc(width: number, height: number) {
  return (context: Konva.Context, shape: Konva.Shape) => {
    context.beginPath()
    context.rect(0, 0, width, height)
    context.closePath()
    context.fillStrokeShape(shape)
  }
}

const zoneViews = computed<ZoneView[]>(() => {
  const current = entry.value
  const image = drawn.value
  if (!current || !image) return []
  return designs.zonesOf(current.product).map((zone) => {
    const rect = zoneRect(image, zone)
    const design = designs.zoneDesign(current.item.instanceId, zone.id)
    const layers: LayerView[] = []

    if (design?.image) {
      const decoded = designs.imageOf(design.image.source)
      const height = design.image.transform.height * rect.height
      const width = height * design.image.aspectRatio
      if (decoded) {
        layers.push({
          kind: 'image',
          id: `image-${zone.id}`,
          width,
          height,
          transform: design.image.transform,
          config: {
            ...nodeConfig(rect, design.image.transform, width, height),
            image: decoded.element,
          },
        })
      }
    }

    if (design?.text) {
      const layout = designs.textLayoutOf(design.text.content)
      if (layout) {
        const height = design.text.transform.height * rect.height
        const width = (height * layout.width) / layout.height
        const color = textColors.find((c) => c.id === design.text!.colorId)?.value ?? '#000000'
        layers.push({
          kind: 'text',
          id: `text-${zone.id}`,
          width,
          height,
          transform: design.text.transform,
          config: {
            ...nodeConfig(rect, design.text.transform, width, height),
            sceneFunc: textSceneFunc(layout, color, height),
            hitFunc: boxHitFunc(width, height),
            fill: 'transparent',
          },
        })
      }
    }

    return { zone, rect, layers }
  })
})

const currentZoneId = computed(() => designs.currentZone.value?.id ?? null)
const currentLayerId = computed(() => {
  const layer = designs.currentLayer.value
  return layer ? `${layer.kind}-${layer.zoneId}` : null
})
const currentZoneView = computed(() =>
  zoneViews.value.find((view) => view.zone.id === designs.currentLayer.value?.zoneId),
)

function selectLayer(zoneId: string, kind: LayerKind | null) {
  designs.selectLayer(zoneId, kind)
}

function onStagePointer(event: Konva.KonvaEventObject<Event>) {
  // Empty canvas or product image: keep the zone, drop the layer selection.
  if (event.target === event.target.getStage() || event.target.name() === 'product') {
    if (currentZoneId.value) selectLayer(currentZoneId.value, null)
  }
}

// Puts a node back to the stored (last valid) transform after a rejected interaction.
function restore(node: Konva.Node, view: ZoneView, layer: LayerView) {
  node.setAttrs({
    x: layer.transform.x * view.rect.width,
    y: layer.transform.y * view.rect.height,
    rotation: layer.transform.rotation,
    scaleX: 1,
    scaleY: 1,
  })
  node.getLayer()?.batchDraw()
}

function onDragEnd(view: ZoneView, layer: LayerView, event: Konva.KonvaEventObject<DragEvent>) {
  const node = event.target
  const instanceId = entry.value?.item.instanceId
  if (!instanceId) return
  const applied = designs.setTransform(instanceId, view.zone.id, layer.kind, {
    ...layer.transform,
    x: node.x() / view.rect.width,
    y: node.y() / view.rect.height,
  })
  if (!applied) restore(node, view, layer)
}

function onTransformEnd(view: ZoneView, layer: LayerView, event: Konva.KonvaEventObject<Event>) {
  const node = event.target
  const instanceId = entry.value?.item.instanceId
  if (!instanceId) return
  const height = node.height() * Math.abs(node.scaleY())
  const next: LayerTransform = {
    x: node.x() / view.rect.width,
    y: node.y() / view.rect.height,
    height: height / view.rect.height,
    rotation: normalizeRotation(node.rotation()),
  }
  // Scale is folded into the stored height; the node is re-rendered from data with scale 1.
  node.scale({ x: 1, y: 1 })
  if (!designs.setTransform(instanceId, view.zone.id, layer.kind, next)) restore(node, view, layer)
}

const minLayerPixels = computed(() => {
  const layer = designs.currentLayer.value
  const view = currentZoneView.value
  const limits = layer && designs.layerTools.limits(layer)
  return limits && view ? limits.min * view.rect.height : 0
})

const transformerConfig = computed(() => ({
  rotateEnabled: true,
  flipEnabled: false,
  keepRatio: true,
  centeredScaling: false,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  rotationSnaps: [0, 90, 180, 270],
  rotationSnapTolerance: 4,
  anchorSize: 12,
  anchorCornerRadius: 6,
  anchorStroke: colors.value.primary,
  anchorFill: colors.value.card,
  borderStroke: colors.value.primary,
  ignoreStroke: true,
  // Rejects any resize or rotation whose rotated box would leave the zone or get too small.
  boundBoxFunc(oldBox: CanvasBox, newBox: CanvasBox) {
    const view = currentZoneView.value
    if (!view) return oldBox
    // newBox.height is the layer's own (unrotated) height after scaling.
    const tooSmall = newBox.height + 0.01 < minLayerPixels.value
    if (tooSmall || !boxInsideRect(newBox, view.rect)) return oldBox
    return newBox
  },
}))

// Attach the transformer to the selected node. vue-konva adds child nodes to the stage in their
// own mounted hooks, which run after this component's post-flush watchers, so wait one tick.
async function attachTransformer() {
  await nextTick()
  const transformer = transformerRef.value?.getNode()
  const stage = stageRef.value?.getNode()
  if (!transformer || !stage) return
  const id = currentLayerId.value
  const node = id ? stage.findOne(`#${id}`) : undefined
  transformer.nodes(node ? [node] : [])
  transformer.getLayer()?.batchDraw()
}
watch([currentLayerId, zoneViews, stageRef, transformerRef], attachTransformer, {
  flush: 'post',
  immediate: true,
})

const label = computed(() =>
  entry.value ? `Xem trước món ${entry.value.position}: ${entry.value.product.name}` : '',
)
</script>

<template>
  <div
    ref="container"
    class="absolute inset-0 bg-card"
    role="img"
    :aria-label="label"
    data-testid="design-canvas"
  >
    <KStage
      v-if="drawn"
      ref="stage"
      :config="{ width: size.width, height: size.height }"
      @pointerdown="onStagePointer"
    >
      <KLayer :config="{ listening: true }">
        <KImage
          :config="{
            name: 'product',
            image: productImage!.element,
            x: drawn.x,
            y: drawn.y,
            width: drawn.width,
            height: drawn.height,
          }"
        />
      </KLayer>

      <KLayer :config="{ name: 'design' }">
        <KGroup
          v-for="view in zoneViews"
          :key="view.zone.id"
          :config="{
            name: 'zone-content',
            x: view.rect.x,
            y: view.rect.y,
            clip: { x: 0, y: 0, width: view.rect.width, height: view.rect.height },
          }"
        >
          <!-- Transparent hit area: tapping a zone selects it. -->
          <KRect
            :config="{ width: view.rect.width, height: view.rect.height, fill: 'transparent' }"
            @pointerdown="selectLayer(view.zone.id, null)"
          />
          <template v-for="layer in view.layers" :key="layer.id">
            <KImage
              v-if="layer.kind === 'image'"
              :config="{ ...layer.config, id: layer.id }"
              :__use-strict-mode="true"
              @pointerdown="selectLayer(view.zone.id, 'image')"
              @dragstart="selectLayer(view.zone.id, 'image')"
              @dragend="onDragEnd(view, layer, $event)"
              @transformend="onTransformEnd(view, layer, $event)"
            />
            <KShape
              v-else
              :config="{ ...layer.config, id: layer.id }"
              :__use-strict-mode="true"
              @pointerdown="selectLayer(view.zone.id, 'text')"
              @dragstart="selectLayer(view.zone.id, 'text')"
              @dragend="onDragEnd(view, layer, $event)"
              @transformend="onTransformEnd(view, layer, $event)"
            />
          </template>
        </KGroup>
      </KLayer>

      <KLayer :config="{ name: 'ui' }">
        <KRect
          v-for="view in zoneViews"
          :key="view.zone.id"
          :config="{
            x: view.rect.x,
            y: view.rect.y,
            width: view.rect.width,
            height: view.rect.height,
            stroke: view.zone.id === currentZoneId ? colors.primary : colors.muted,
            strokeWidth: view.zone.id === currentZoneId ? 2 : 1,
            dash: [6, 4],
            listening: false,
          }"
        />
        <KTransformer ref="transformer" :config="transformerConfig" />
      </KLayer>
    </KStage>
  </div>
</template>
