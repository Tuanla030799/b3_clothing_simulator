<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
} from '@lucide/vue'
import { Button, Flex, Typography } from '@lituta/ui'
import { injectDesigns, type ActiveLayer } from '../useDesigns'

/*
 * Keyboard/DOM equivalent of dragging, resizing and rotating on the canvas. Every control goes
 * through the same bounds rules as the canvas (designs.layerTools).
 */

const props = defineProps<{ layer: ActiveLayer }>()

const designs = injectDesigns()
const tools = designs.layerTools

const transform = computed(
  () =>
    designs.zoneDesign(props.layer.instanceId, props.layer.zoneId)?.[props.layer.kind]?.transform,
)
const limits = computed(() => (transform.value ? tools.limits(props.layer) : null))
const notice = ref('')
watch(
  () => props.layer,
  () => (notice.value = ''),
)

const MOVE_STEP = 0.05
const SIZE_STEP = 0.05
const ROTATE_STEP = 15

function run(applied: boolean, failure: string) {
  notice.value = applied ? '' : failure
}

const move = (dx: number, dy: number) =>
  run(tools.move(props.layer, dx, dy), 'Đã chạm mép vùng thêu.')

function resizeBy(delta: number) {
  const t = transform.value
  if (!t) return
  run(tools.resize(props.layer, t.height + delta), 'Không đủ chỗ để đổi kích thước thêm.')
}

// Range inputs always show the stored value afterwards, even when a step was limited or rejected.
function syncInput(input: HTMLInputElement, value: number | undefined) {
  if (value !== undefined) input.value = String(value)
}

function onSize(event: Event) {
  const input = event.target as HTMLInputElement
  run(tools.resize(props.layer, Number(input.value)), 'Không đủ chỗ để đổi kích thước thêm.')
  syncInput(input, transform.value?.height)
}

function rotateTo(degrees: number) {
  run(tools.rotate(props.layer, degrees), 'Không đủ chỗ để xoay. Hãy thu nhỏ trước.')
}

function onRotation(event: Event) {
  const input = event.target as HTMLInputElement
  rotateTo(Number(input.value))
  syncInput(input, transform.value?.rotation)
}

const sizePercent = computed(() =>
  transform.value && limits.value
    ? Math.round((transform.value.height / limits.value.max) * 100)
    : 0,
)
const sliderId = computed(() => `layer-size-${props.layer.zoneId}-${props.layer.kind}`)
const rotationId = computed(() => `layer-rotation-${props.layer.zoneId}-${props.layer.kind}`)
const title = computed(() => (props.layer.kind === 'text' ? 'Chỉnh chữ' : 'Chỉnh hình'))
</script>

<template>
  <section
    v-if="transform && limits"
    aria-labelledby="layer-controls-heading"
    class="rounded-lg border p-3"
  >
    <Flex vertical gap="middle">
      <Typography id="layer-controls-heading" as="h3" variant="body" weight="semibold">
        {{ title }}
      </Typography>

      <div>
        <Typography as="span" variant="caption" weight="medium">Vị trí</Typography>
        <Flex align="center" gap="small" wrap class="mt-1">
          <div class="grid grid-cols-3 gap-1" role="group" aria-label="Di chuyển">
            <span />
            <Button
              variant="default"
              size="small"
              aria-label="Dịch lên"
              @click="move(0, -MOVE_STEP)"
            >
              <template #icon><ArrowUp /></template>
            </Button>
            <span />
            <Button
              variant="default"
              size="small"
              aria-label="Dịch trái"
              @click="move(-MOVE_STEP, 0)"
            >
              <template #icon><ArrowLeft /></template>
            </Button>
            <Button
              variant="default"
              size="small"
              aria-label="Căn giữa vùng"
              @click="run(tools.center(layer), 'Không thể căn giữa với kích thước hiện tại.')"
            >
              <template #icon><Crosshair /></template>
            </Button>
            <Button
              variant="default"
              size="small"
              aria-label="Dịch phải"
              @click="move(MOVE_STEP, 0)"
            >
              <template #icon><ArrowRight /></template>
            </Button>
            <span />
            <Button
              variant="default"
              size="small"
              aria-label="Dịch xuống"
              @click="move(0, MOVE_STEP)"
            >
              <template #icon><ArrowDown /></template>
            </Button>
            <span />
          </div>
        </Flex>
      </div>

      <div>
        <label :for="sliderId" class="text-sm font-medium">Kích thước: {{ sizePercent }}%</label>
        <Flex align="center" gap="small" class="mt-1">
          <Button variant="default" size="small" aria-label="Thu nhỏ" @click="resizeBy(-SIZE_STEP)">
            <template #icon><Minus /></template>
          </Button>
          <input
            :id="sliderId"
            type="range"
            class="min-w-0 flex-1 accent-primary"
            :min="limits.min"
            :max="limits.max"
            step="0.005"
            :value="transform.height"
            :aria-valuetext="`${sizePercent}%`"
            @input="onSize"
          />
          <Button variant="default" size="small" aria-label="Phóng to" @click="resizeBy(SIZE_STEP)">
            <template #icon><Plus /></template>
          </Button>
        </Flex>
      </div>

      <div>
        <label :for="rotationId" class="text-sm font-medium">
          Góc xoay: {{ Math.round(transform.rotation) }}°
        </label>
        <Flex align="center" gap="small" class="mt-1">
          <Button
            variant="default"
            size="small"
            aria-label="Xoay trái 15 độ"
            @click="rotateTo(transform.rotation - ROTATE_STEP)"
          >
            <template #icon><RotateCcw /></template>
          </Button>
          <input
            :id="rotationId"
            type="range"
            class="min-w-0 flex-1 accent-primary"
            min="-180"
            max="180"
            step="1"
            :value="transform.rotation"
            :aria-valuetext="`${Math.round(transform.rotation)} độ`"
            @input="onRotation"
          />
          <Button
            variant="default"
            size="small"
            aria-label="Xoay phải 15 độ"
            @click="rotateTo(transform.rotation + ROTATE_STEP)"
          >
            <template #icon><RotateCw /></template>
          </Button>
        </Flex>
        <Button variant="link" size="small" class="mt-1" @click="rotateTo(0)">Bỏ xoay</Button>
      </div>

      <p class="min-h-5 text-sm text-muted-foreground" role="status">{{ notice }}</p>
    </Flex>
  </section>
</template>
