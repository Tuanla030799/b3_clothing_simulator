<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Move, Trash2 } from '@lucide/vue'
import { Button, Flex, FormField, Typography } from '@lituta/ui'
import { DEFAULT_TEXT_COLOR_ID, textColors } from '../data/designOptions'
import { injectDesigns, type TextResult } from '../useDesigns'

const props = defineProps<{ instanceId: string; zoneId: string }>()

const designs = injectDesigns()
const text = computed(() => designs.zoneDesign(props.instanceId, props.zoneId)?.text)
const fieldId = computed(() => `design-text-${props.instanceId}-${props.zoneId}`)

// The textarea keeps what the customer types; the design keeps the last valid content.
const draft = ref('')
const error = ref<TextResult | null>(null)
const pickedColorId = ref(DEFAULT_TEXT_COLOR_ID)

watch(
  () => [props.instanceId, props.zoneId] as const,
  () => {
    draft.value = text.value?.content ?? ''
    pickedColorId.value = text.value?.colorId ?? DEFAULT_TEXT_COLOR_ID
    error.value = null
  },
  { immediate: true },
)

const colorId = computed(() => text.value?.colorId ?? pickedColorId.value)

const messages: Partial<Record<TextResult, string>> = {
  'too-long': 'Nội dung quá dài cho vùng thêu này. Hãy rút ngắn hoặc xuống dòng.',
  'font-error': 'Chưa tải được kiểu chữ thêu.',
  'no-image': 'Chưa tải được ảnh sản phẩm.',
}
const errorMessage = computed(() => (error.value ? messages[error.value] : undefined))

async function apply(value: string) {
  const { instanceId, zoneId } = props
  const hadText = Boolean(text.value)
  const result = await designs.setText(instanceId, zoneId, value, colorId.value)
  if (result === 'stale') return
  error.value = result === 'ok' || result === 'cleared' ? null : result
  // Show the layer tools when text is placed for the first time.
  if (result === 'ok' && !hadText && instanceId === props.instanceId && zoneId === props.zoneId) {
    designs.selectLayer(zoneId, 'text')
  }
}

function onInput(event: Event) {
  draft.value = (event.target as HTMLTextAreaElement).value
  void apply(draft.value)
}

function pickColor(id: string) {
  pickedColorId.value = id
  designs.setTextColor(props.instanceId, props.zoneId, id)
}

function removeText() {
  designs.removeText(props.instanceId, props.zoneId)
  draft.value = ''
  error.value = null
}

const isSelected = computed(() => {
  const layer = designs.currentLayer.value
  return layer?.zoneId === props.zoneId && layer.kind === 'text'
})
</script>

<template>
  <section aria-labelledby="text-editor-heading">
    <Flex vertical gap="small">
      <Typography id="text-editor-heading" as="h3" variant="body" weight="semibold">Chữ</Typography>

      <FormField
        :for="fieldId"
        label="Nội dung"
        description="Nhấn Enter để xuống dòng."
        :error="errorMessage"
      >
        <template #default="{ id, describedBy, invalid }">
          <textarea
            :id="id"
            :value="draft"
            rows="2"
            maxlength="120"
            :aria-describedby="describedBy"
            :aria-invalid="invalid || undefined"
            class="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
            placeholder="Ví dụ: Bảo Ngọc"
            @input="onInput"
          />
        </template>
      </FormField>
      <Flex v-if="error === 'font-error'" align="center" gap="small" wrap>
        <Button size="small" variant="default" @click="apply(draft)">Thử lại</Button>
      </Flex>
      <Typography
        v-else-if="designs.fontStatus.value === 'loading'"
        variant="caption"
        role="status"
      >
        Đang tải kiểu chữ…
      </Typography>

      <fieldset>
        <legend class="mb-1.5 text-sm font-medium">Màu chữ</legend>
        <Flex wrap gap="small">
          <Button
            v-for="color in textColors"
            :key="color.id"
            :variant="color.id === colorId ? 'primary' : 'default'"
            size="small"
            :aria-pressed="color.id === colorId"
            @click="pickColor(color.id)"
          >
            <template #icon>
              <span
                class="flex size-4 items-center justify-center rounded-full border border-input"
                :style="{ backgroundColor: color.value }"
              >
                <Check
                  v-if="color.id === colorId"
                  class="size-3"
                  :class="color.id === 'white' ? 'text-foreground' : 'text-card'"
                />
              </span>
            </template>
            {{ color.name }}
          </Button>
        </Flex>
      </fieldset>

      <Flex wrap gap="small">
        <Button
          v-if="text"
          variant="default"
          size="small"
          :aria-pressed="isSelected"
          @click="designs.selectLayer(zoneId, isSelected ? null : 'text')"
        >
          <template #icon><Move /></template>
          Chỉnh vị trí chữ
        </Button>
        <Button v-if="text" variant="text" size="small" @click="removeText">
          <template #icon><Trash2 /></template>
          Xóa chữ
        </Button>
      </Flex>
    </Flex>
  </section>
</template>
