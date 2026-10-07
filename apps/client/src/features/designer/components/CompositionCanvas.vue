<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import {
  Group as KGroup,
  Image as KImage,
  Layer as KLayer,
  Rect as KRect,
  Shape as KShape,
  Stage as KStage,
  Text as KText,
} from 'vue-konva'
import { injectComposition } from '../useComposition'
import { injectSelection } from '../useSelection'

/*
 * Read-only render of the whole set on the background. Everything is laid out in logical
 * composition units and the stage is only scaled to the container, so resizing never changes the
 * layout. No zone outlines, transformer or handles; nothing listens to events, so the page scrolls
 * normally over it. Item content uses the same builder as the item editor.
 */

const selection = injectSelection()
const composition = injectComposition()

const containerRef = useTemplateRef<HTMLDivElement>('container')
const width = ref(0)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.floor(entry.contentRect.width)
  })
  if (containerRef.value) observer.observe(containerRef.value)
})
onBeforeUnmount(() => observer?.disconnect())

const scale = computed(() => (width.value > 0 ? width.value / composition.size.value.width : 0))
const stageSize = computed(() => ({
  width: width.value,
  height: Math.round(composition.size.value.height * scale.value),
}))

const colors = ref({ muted: '#f3eee7', mutedForeground: '#6b635c', border: '#e5ded5' })
onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  colors.value = {
    muted: read('--muted', colors.value.muted),
    mutedForeground: read('--muted-foreground', colors.value.mutedForeground),
    border: read('--border', colors.value.border),
  }
})

const items = computed(() => composition.scene.value.items)
const label = computed(() => {
  const names = selection.entries.value.map((e) => `món ${e.position}: ${e.product.name}`)
  return `Xem cả bộ trên nền: ${names.join(', ')}`
})
</script>

<template>
  <div
    ref="container"
    class="w-full"
    role="img"
    :aria-label="label"
    data-testid="composition-canvas"
  >
    <KStage
      v-if="scale > 0"
      :config="{ width: stageSize.width, height: stageSize.height, listening: false }"
    >
      <KLayer :config="{ name: 'background', listening: false }">
        <KImage
          v-if="composition.scene.value.background"
          :config="{
            image: composition.scene.value.background,
            width: composition.size.value.width * scale,
            height: composition.size.value.height * scale,
          }"
        />
        <KRect
          v-else
          :config="{
            width: stageSize.width,
            height: stageSize.height,
            fill: colors.muted,
          }"
        />
      </KLayer>

      <!-- Export content: logical units scaled once at the layer. -->
      <KLayer :config="{ name: 'set', listening: false, scaleX: scale, scaleY: scale }">
        <KGroup
          v-for="item in items"
          :key="item.instanceId"
          :config="{
            name: 'set-item',
            id: `set-${item.instanceId}`,
            x: item.x,
            y: item.y,
          }"
        >
          <template v-if="item.image">
            <KImage :config="{ image: item.image, width: item.width, height: item.height }" />
            <KGroup
              v-for="zone in item.zones"
              :key="zone.zoneId"
              :config="{
                x: zone.x,
                y: zone.y,
                clip: { x: 0, y: 0, width: zone.width, height: zone.height },
              }"
            >
              <template v-for="layer in zone.layers" :key="layer.kind">
                <KImage v-if="layer.kind === 'image'" :config="layer.config" />
                <KShape v-else :config="layer.config" />
              </template>
            </KGroup>
          </template>
          <!-- Placeholder keeps the item visible when its product image is unavailable. -->
          <template v-else>
            <KRect
              :config="{
                width: item.width,
                height: item.height,
                fill: colors.muted,
                stroke: colors.border,
                strokeWidth: 2,
                dash: [10, 6],
                cornerRadius: 12,
              }"
            />
            <KText
              :config="{
                text: `Món ${item.position}\n${item.name}`,
                width: item.width,
                height: item.height,
                align: 'center',
                verticalAlign: 'middle',
                padding: 12,
                fontSize: Math.max(14, item.height * 0.08),
                fontFamily: 'Be Vietnam Pro, system-ui, sans-serif',
                fill: colors.mutedForeground,
              }"
            />
          </template>
        </KGroup>
      </KLayer>
    </KStage>
  </div>
</template>
