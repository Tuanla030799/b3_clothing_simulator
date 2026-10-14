<script setup lang="ts">
import { computed, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { Plus, Save, Trash2, Undo2 } from '@lucide/vue'
import { Checkbox, Drawer, Input, InputNumber, Spin, Switch } from 'ant-design-vue'
import { Button, Col, EmptyState, Flex, FormField, Image, Row, Typography } from '@lituta/ui'
import { errorMessage, fieldErrors } from '../../api/httpClient'
import { designerApi } from '../../api/resources'
import type { ColorDesigner, EmbroideryZone, ProductColor } from '../../api/types'
import { useFeedback } from '../../composables/useFeedback'
import {
  MAX_ZONES_PER_COLOR,
  moveZone,
  newZone,
  resizeZone,
  round4,
  zoneErrors,
  type ZoneDraft,
} from './zoneGeometry'

/*
 * Designer setup of one product color: embroidery zones drawn on its transparent design image
 * (fractions of the image, top-left origin) and the color's designer flag and display scale.
 * Each zone is saved on its own; the designer can be turned on only with at least one zone.
 */
const props = defineProps<{ productId: string; color: ProductColor | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const feedback = useFeedback()
const loading = ref(false)
const loadError = ref<string | null>(null)
const designer = shallowRef<ColorDesigner | null>(null)

interface EditableZone extends ZoneDraft {
  /** Saved zone id; undefined for a zone not saved yet. */
  id?: string
  saved: EmbroideryZone | null
  dirty: boolean
}
const zones = ref<EditableZone[]>([])
const selected = ref(0)
const zone = computed(() => zones.value[selected.value] ?? null)
const settings = reactive({ designerEnabled: false, displayScale: 1 })
const savingZone = ref(false)
const savingSettings = ref(false)
const serverErrors = ref<Record<string, string>>({})

const toEditable = (saved: EmbroideryZone): EditableZone => ({
  id: saved.id,
  key: saved.key,
  name: saved.name,
  x: saved.x,
  y: saved.y,
  width: saved.width,
  height: saved.height,
  allowText: saved.allowText,
  allowImage: saved.allowImage,
  sortOrder: saved.sortOrder,
  saved,
  dirty: false,
})

async function load() {
  if (!props.color) return
  loading.value = true
  loadError.value = null
  try {
    const result = await designerApi.colorDesigner(props.productId, props.color.id)
    designer.value = result
    zones.value = result.zones.map(toEditable)
    selected.value = 0
    settings.designerEnabled = result.designerEnabled
    settings.displayScale = result.displayScale
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
watch(
  () => props.color?.id,
  (id) => {
    designer.value = null
    zones.value = []
    if (id) void load()
  },
  { immediate: true },
)

const otherKeys = computed(() =>
  zones.value.filter((_, index) => index !== selected.value).map((entry) => entry.key),
)
const errors = computed(() => (zone.value ? zoneErrors(zone.value, otherKeys.value) : {}))
const hasErrors = computed(() => Object.keys(errors.value).length > 0)
const savedCount = computed(() => zones.value.filter((entry) => entry.id).length)

function markDirty() {
  if (zone.value) zone.value.dirty = true
  serverErrors.value = {}
}

function addZone() {
  if (zones.value.length >= MAX_ZONES_PER_COLOR) return
  const keys = zones.value.map((entry) => entry.key)
  zones.value.push({ ...newZone(keys, zones.value.length), saved: null, dirty: true })
  selected.value = zones.value.length - 1
}

function revert() {
  const current = zone.value
  if (!current) return
  if (current.saved) zones.value[selected.value] = toEditable(current.saved)
  else {
    zones.value.splice(selected.value, 1)
    selected.value = Math.max(0, selected.value - 1)
  }
  serverErrors.value = {}
}

async function saveZone() {
  const current = zone.value
  if (!current || !props.color || hasErrors.value) return
  savingZone.value = true
  serverErrors.value = {}
  const body = {
    name: current.name.trim(),
    x: round4(current.x),
    y: round4(current.y),
    width: round4(current.width),
    height: round4(current.height),
    allowText: current.allowText,
    allowImage: current.allowImage,
    sortOrder: current.sortOrder,
  }
  try {
    const saved = current.id
      ? await designerApi.updateZone(props.productId, props.color.id, current.id, body)
      : await designerApi.addZone(props.productId, props.color.id, { ...body, key: current.key })
    zones.value[selected.value] = toEditable(saved)
    feedback.success('Đã lưu vùng thêu.')
    emit('changed')
  } catch (error) {
    serverErrors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    savingZone.value = false
  }
}

function removeZone() {
  const current = zone.value
  if (!current || !props.color) return
  if (!current.id) return revert()
  const color = props.color
  const zoneId = current.id
  feedback.confirmDelete(
    `Xóa vùng “${current.name}”?`,
    'Không xóa được vùng cuối cùng khi màu đang bật thiết kế (tắt thiết kế trước).',
    async () => {
      try {
        await designerApi.removeZone(props.productId, color.id, zoneId)
        zones.value = zones.value.filter((entry) => entry.id !== zoneId)
        selected.value = Math.max(0, Math.min(selected.value, zones.value.length - 1))
        feedback.success('Đã xóa vùng.')
        emit('changed')
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

async function saveSettings() {
  if (!props.color) return
  savingSettings.value = true
  try {
    const result = await designerApi.updateColorDesigner(props.productId, props.color.id, {
      designerEnabled: settings.designerEnabled,
      displayScale: settings.displayScale,
    })
    designer.value = result
    settings.designerEnabled = result.designerEnabled
    settings.displayScale = result.displayScale
    feedback.success('Đã lưu cài đặt thiết kế.')
    emit('changed')
  } catch (error) {
    feedback.error(error)
  } finally {
    savingSettings.value = false
  }
}

// --- drawing on the image: drag a zone to move it, its corner to resize it ---
const stage = useTemplateRef<HTMLElement>('stage')
let drag: {
  index: number
  mode: 'move' | 'resize'
  startX: number
  startY: number
  start: ZoneDraft
} | null = null

function startDrag(event: PointerEvent, index: number, mode: 'move' | 'resize') {
  selected.value = index
  const target = zones.value[index]
  if (!target) return
  drag = { index, mode, startX: event.clientX, startY: event.clientY, start: { ...target } }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onDrag(event: PointerEvent) {
  const box = stage.value?.getBoundingClientRect()
  const target = drag ? zones.value[drag.index] : undefined
  if (!drag || !box || !target || box.width === 0 || box.height === 0) return
  const dx = (event.clientX - drag.startX) / box.width
  const dy = (event.clientY - drag.startY) / box.height
  const next = drag.mode === 'move' ? moveZone(drag.start, dx, dy) : resizeZone(drag.start, dx, dy)
  Object.assign(target, next, { dirty: true })
}

function endDrag() {
  drag = null
}

// Arrow keys move the focused zone (Shift: resize), 0.5% of the image per press.
function onZoneKey(event: KeyboardEvent, index: number) {
  const step = 0.005
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  const delta = moves[event.key]
  const target = zones.value[index]
  if (!delta || !target) return
  event.preventDefault()
  selected.value = index
  const next = event.shiftKey
    ? resizeZone(target, delta[0], delta[1])
    : moveZone(target, delta[0], delta[1])
  Object.assign(target, next, { dirty: true })
}

const percent = (value: number) => `${value * 100}%`
const imageAspect = computed(() => {
  const image = designer.value?.designImage
  return image ? `${image.width} / ${image.height}` : '4 / 3'
})
</script>

<template>
  <Drawer
    :open="Boolean(color)"
    :title="color ? `Vùng thêu · ${color.name}` : ''"
    width="min(1100px, 100vw)"
    destroy-on-close
    @close="emit('close')"
  >
    <Spin :spinning="loading">
      <EmptyState v-if="loadError" title="Chưa tải được cấu hình thiết kế" :description="loadError">
        <template #action>
          <Button @click="load()">Thử lại</Button>
        </template>
      </EmptyState>

      <Row v-else-if="designer" :gutter="[24, 24]">
        <Col :xs="24" :lg="14">
          <Flex vertical gap="small">
            <Typography variant="caption">
              Kéo khung để di chuyển, kéo góc dưới phải để đổi cỡ; hoặc chọn khung rồi dùng phím mũi
              tên (Shift + mũi tên để đổi cỡ). Tọa độ tính theo toàn bộ ảnh thiết kế, không phải
              centimet. Kiểm tra bằng mắt rằng vùng nằm đúng chỗ thêu được trên sản phẩm.
            </Typography>
            <div
              ref="stage"
              class="relative w-full touch-none overflow-hidden rounded-md border bg-muted select-none"
              :style="{ aspectRatio: imageAspect }"
              @pointermove="onDrag"
              @pointerup="endDrag"
              @pointercancel="endDrag"
            >
              <Image
                :src="designer.designImage.url"
                alt="Ảnh thiết kế (nền trong suốt) của màu"
                :width="designer.designImage.width"
                :height="designer.designImage.height"
                class="absolute inset-0 size-full"
              />
              <!-- Zone frames: interactive overlay on the image (no shared component covers this). -->
              <div
                v-for="(entry, index) in zones"
                :key="entry.id ?? `new-${index}`"
                role="button"
                tabindex="0"
                :aria-label="`Vùng ${entry.name}`"
                :aria-pressed="index === selected"
                class="absolute cursor-move border-2 border-dashed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                :class="
                  index === selected
                    ? 'border-primary bg-primary/15'
                    : 'border-foreground/60 bg-card/20'
                "
                :style="{
                  left: percent(entry.x),
                  top: percent(entry.y),
                  width: percent(entry.width),
                  height: percent(entry.height),
                }"
                @pointerdown="startDrag($event, index, 'move')"
                @keydown="onZoneKey($event, index)"
              >
                <span
                  class="pointer-events-none absolute start-0 top-0 max-w-full truncate bg-card/90 px-1 text-xs"
                >
                  {{ entry.name }}{{ entry.dirty ? ' *' : '' }}
                </span>
                <span
                  class="absolute -end-1.5 -bottom-1.5 size-3 cursor-se-resize rounded-sm bg-primary"
                  aria-hidden="true"
                  @pointerdown.stop="startDrag($event, index, 'resize')"
                />
              </div>
            </div>
            <Typography variant="caption">
              Ảnh {{ designer.designImage.width }} × {{ designer.designImage.height }} px
            </Typography>
          </Flex>
        </Col>

        <Col :xs="24" :lg="10">
          <Flex vertical gap="large">
            <section aria-labelledby="designer-settings-heading" class="rounded-lg border p-4">
              <Flex vertical gap="middle">
                <Typography id="designer-settings-heading" as="h3" variant="subheading">
                  Công cụ thiết kế
                </Typography>
                <FormField
                  for="designer-enabled"
                  label="Cho khách thiết kế màu này"
                  :description="
                    savedCount === 0
                      ? 'Cần ít nhất một vùng đã lưu.'
                      : 'Khách thấy các vùng đã lưu.'
                  "
                >
                  <template #default="{ id }">
                    <Switch :id="id" v-model:checked="settings.designerEnabled" />
                  </template>
                </FormField>
                <FormField
                  for="designer-scale"
                  label="Tỉ lệ hiển thị trong bộ"
                  description="1 = cỡ chuẩn; chỉ tỉ lệ giữa các món có ý nghĩa (0,1–3)."
                >
                  <template #default="{ id }">
                    <InputNumber
                      :id="id"
                      v-model:value="settings.displayScale"
                      :min="0.1"
                      :max="3"
                      :step="0.05"
                    />
                  </template>
                </FormField>
                <Button :loading="savingSettings" class="self-start" @click="saveSettings">
                  <template #icon><Save /></template>
                  Lưu cài đặt
                </Button>
              </Flex>
            </section>

            <section aria-labelledby="zones-heading" class="rounded-lg border p-4">
              <Flex vertical gap="middle">
                <Flex align="center" justify="space-between" gap="small">
                  <Typography id="zones-heading" as="h3" variant="subheading">
                    Vùng thêu ({{ zones.length }}/{{ MAX_ZONES_PER_COLOR }})
                  </Typography>
                  <Button
                    size="small"
                    variant="default"
                    :disabled="zones.length >= MAX_ZONES_PER_COLOR"
                    @click="addZone"
                  >
                    <template #icon><Plus /></template>
                    Thêm vùng
                  </Button>
                </Flex>

                <Flex v-if="zones.length" wrap gap="small" role="group" aria-label="Chọn vùng">
                  <Button
                    v-for="(entry, index) in zones"
                    :key="entry.id ?? `new-${index}`"
                    size="small"
                    :variant="index === selected ? 'primary' : 'default'"
                    :aria-pressed="index === selected"
                    @click="selected = index"
                  >
                    {{ entry.name }}{{ entry.dirty ? ' *' : '' }}
                  </Button>
                </Flex>
                <Typography v-else variant="caption">Chưa có vùng nào.</Typography>

                <form v-if="zone" novalidate @submit.prevent="saveZone" @input="markDirty">
                  <Flex vertical gap="middle">
                    <Row :gutter="[12, 12]">
                      <Col :xs="24" :sm="12">
                        <FormField
                          for="zone-key"
                          label="Mã vùng"
                          :description="zone.id ? 'Không đổi được sau khi lưu.' : 'Ví dụ: nguc-ao'"
                          :error="errors.key ?? serverErrors.key"
                          required
                        >
                          <template #default="{ id }">
                            <Input :id="id" v-model:value="zone.key" :disabled="Boolean(zone.id)" />
                          </template>
                        </FormField>
                      </Col>
                      <Col :xs="24" :sm="12">
                        <FormField
                          for="zone-name"
                          label="Tên"
                          :error="errors.name ?? serverErrors.name"
                          required
                        >
                          <template #default="{ id }">
                            <Input :id="id" v-model:value="zone.name" :maxlength="100" />
                          </template>
                        </FormField>
                      </Col>
                      <Col
                        v-for="field in ['x', 'y', 'width', 'height'] as const"
                        :key="field"
                        :xs="12"
                      >
                        <FormField
                          :for="`zone-${field}`"
                          :label="
                            { x: 'X (trái)', y: 'Y (trên)', width: 'Rộng', height: 'Cao' }[field]
                          "
                          :error="errors[field] ?? serverErrors[field]"
                        >
                          <template #default="{ id }">
                            <InputNumber
                              :id="id"
                              v-model:value="zone[field]"
                              :min="0"
                              :max="1"
                              :step="0.01"
                              :precision="4"
                              class="w-full"
                              @change="markDirty"
                            />
                          </template>
                        </FormField>
                      </Col>
                    </Row>
                    <FormField for="zone-allowed" label="Nội dung cho phép" :error="errors.allowed">
                      <template #default="{ id }">
                        <Flex :id="id" gap="middle">
                          <Checkbox v-model:checked="zone.allowText" @change="markDirty"
                            >Chữ</Checkbox
                          >
                          <Checkbox v-model:checked="zone.allowImage" @change="markDirty">
                            Hình
                          </Checkbox>
                        </Flex>
                      </template>
                    </FormField>
                    <FormField for="zone-order" label="Thứ tự">
                      <template #default="{ id }">
                        <InputNumber
                          :id="id"
                          v-model:value="zone.sortOrder"
                          :min="0"
                          :max="1000000"
                          :precision="0"
                          @change="markDirty"
                        />
                      </template>
                    </FormField>
                    <Flex wrap gap="small">
                      <Button
                        html-type="submit"
                        :loading="savingZone"
                        :disabled="hasErrors || !zone.dirty"
                      >
                        <template #icon><Save /></template>
                        Lưu vùng
                      </Button>
                      <Button variant="default" :disabled="!zone.dirty" @click="revert">
                        <template #icon><Undo2 /></template>
                        Hoàn tác
                      </Button>
                      <Button variant="text" @click="removeZone">
                        <template #icon><Trash2 /></template>
                        Xóa vùng
                      </Button>
                    </Flex>
                  </Flex>
                </form>
              </Flex>
            </section>
          </Flex>
        </Col>
      </Row>
    </Spin>
  </Drawer>
</template>
