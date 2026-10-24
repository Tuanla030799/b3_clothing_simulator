<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { Image } from '@lituta/ui'
import type { FileRef } from '../../api/types'
import {
  fitInSlot,
  fullImageRect,
  resizeKeepingAspect,
  visibleAspect,
  type Size,
} from './layoutPreview'
import { moveZone, resizeZone, type ZoneRect } from './zoneGeometry'

/** A real product shown in a slot: its transparent design image and visible box. */
export interface SlotPreview {
  name: string
  image: FileRef
  visible: ZoneRect
}

/*
 * The background of a set layout with one draggable rectangle per slot (fractions of the image,
 * top-left origin). Drag a rectangle to move it, its corner to resize it; with a rectangle focused,
 * arrow keys move it (Shift: resize). Rectangles are edited in place; the parent owns the data.
 *
 * A slot with a preview shows that product fitted inside it exactly as the client places it, and
 * resizing it keeps the product's proportions.
 */
const props = defineProps<{
  image: FileRef | null
  slots: (ZoneRect & { categoryId: string })[]
  /** Text shown in a rectangle (category name and position). */
  labelOf: (index: number) => string
  /** Product shown in each slot (same index as `slots`); null shows an empty frame. */
  previews?: (SlotPreview | null)[]
}>()
const emit = defineEmits<{ change: [] }>()
const selected = defineModel<number>('selected', { default: 0 })
const stage = useTemplateRef<HTMLElement>('stage')
const bg = computed<Size>(() =>
  props.image ? { width: props.image.width, height: props.image.height } : { width: 4, height: 3 },
)
const aspectOf = (index: number) => {
  const preview = props.previews?.[index]
  return preview ? visibleAspect(preview.image, preview.visible) : null
}

/** Where each preview image is drawn (whole image, so its visible box fits the slot). */
const previewRects = computed(() =>
  props.slots.map((slot, index) => {
    const preview = props.previews?.[index]
    const aspect = aspectOf(index)
    if (!preview || !aspect) return null
    return fullImageRect(fitInSlot(slot, aspect, bg.value), preview.visible)
  }),
)
let drag: {
  index: number
  mode: 'move' | 'resize'
  startX: number
  startY: number
  start: ZoneRect
} | null = null

function startDrag(event: PointerEvent, index: number, mode: 'move' | 'resize') {
  selected.value = index
  const target = props.slots[index]
  if (!target) return
  drag = {
    index,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    start: { x: target.x, y: target.y, width: target.width, height: target.height },
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onDrag(event: PointerEvent) {
  const box = stage.value?.getBoundingClientRect()
  const target = drag ? props.slots[drag.index] : undefined
  if (!drag || !box || !target || box.width === 0 || box.height === 0) return
  const dx = (event.clientX - drag.startX) / box.width
  const dy = (event.clientY - drag.startY) / box.height
  const aspect = aspectOf(drag.index)
  Object.assign(
    target,
    drag.mode === 'move'
      ? moveZone(drag.start, dx, dy)
      : aspect
        ? resizeKeepingAspect(drag.start, dx, aspect, bg.value)
        : resizeZone(drag.start, dx, dy),
  )
  emit('change')
}

function endDrag() {
  drag = null
}

function onKey(event: KeyboardEvent, index: number) {
  const step = 0.005
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  const delta = moves[event.key]
  const target = props.slots[index]
  if (!delta || !target) return
  event.preventDefault()
  selected.value = index
  const aspect = aspectOf(index)
  const resized = aspect
    ? resizeKeepingAspect(target, delta[0] || delta[1], aspect, bg.value)
    : resizeZone(target, delta[0], delta[1])
  Object.assign(target, event.shiftKey ? resized : moveZone(target, delta[0], delta[1]))
  emit('change')
}

const percent = (value: number) => `${value * 100}%`
</script>

<template>
  <div
    ref="stage"
    class="relative w-full touch-none overflow-hidden rounded-md border bg-muted select-none"
    :style="{ aspectRatio: image ? `${image.width} / ${image.height}` : '4 / 3' }"
    @pointermove="onDrag"
    @pointerup="endDrag"
    @pointercancel="endDrag"
  >
    <Image
      v-if="image"
      :src="image.url"
      alt="Ảnh nền"
      :width="image.width"
      :height="image.height"
      class="absolute inset-0 size-full"
    />
    <template v-for="(rect, index) in previewRects" :key="`preview-${index}`">
      <div
        v-if="rect && previews?.[index]"
        class="pointer-events-none absolute"
        :style="{
          left: percent(rect.x),
          top: percent(rect.y),
          width: percent(rect.width),
          height: percent(rect.height),
        }"
      >
        <Image :src="previews[index]!.image.url" alt="" class="size-full" />
      </div>
    </template>
    <!-- Slot frames: interactive overlay on the background (no shared component covers this). -->
    <div
      v-for="(slot, index) in slots"
      :key="index"
      role="button"
      tabindex="0"
      :aria-label="labelOf(index)"
      :aria-pressed="index === selected"
      class="absolute cursor-move border-2 border-dashed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="
        index === selected
          ? 'border-primary bg-primary/10'
          : previews?.[index]
            ? 'border-foreground/30'
            : 'border-foreground/60 bg-card/30'
      "
      :style="{
        left: percent(slot.x),
        top: percent(slot.y),
        width: percent(slot.width),
        height: percent(slot.height),
      }"
      @pointerdown="startDrag($event, index, 'move')"
      @keydown="onKey($event, index)"
    >
      <span
        class="pointer-events-none absolute start-0 top-0 max-w-full truncate bg-card/90 px-1 text-xs"
      >
        {{ labelOf(index) }}
      </span>
      <span
        class="absolute -end-1.5 -bottom-1.5 size-3 cursor-se-resize rounded-sm bg-primary"
        aria-hidden="true"
        @pointerdown.stop="startDrag($event, index, 'resize')"
      />
    </div>
  </div>
</template>
