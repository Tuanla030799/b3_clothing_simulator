<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { InputNumber, Switch } from 'ant-design-vue'
import { Col, Flex, FormField, Row, Typography } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { productsApi } from '../../api/resources'
import type { PaletteColor, ProductColor } from '../../api/types'
import ImageUploadField from '../../components/ImageUploadField.vue'
import { useFeedback } from '../../composables/useFeedback'
import ColorSwatch from './ColorSwatch.vue'

/*
 * One product color: a palette color (name and swatch come from the API), the display photo and
 * the transparent design image the product's embroidery zones are placed on. While the product
 * designer is on, the design image cannot be replaced (the API answers 409).
 * The parent renders the submit button and calls `save`.
 */
const props = defineProps<{
  productId: string
  color: ProductColor | null
  palette: readonly PaletteColor[]
  /** Palette keys already used by the product's other colors (one color per key). */
  usedKeys: ReadonlySet<string>
  designerEnabled: boolean
}>()
const emit = defineEmits<{ saved: [color: ProductColor] }>()
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})

type FormState = {
  colorKey: string | undefined
  displayImageFileId: string | null
  designImageFileId: string | null
  sortOrder: number | undefined
  isActive: boolean
}
const form = reactive<FormState>(initialState())

function initialState(): FormState {
  const color = props.color
  return {
    colorKey: color?.colorKey,
    displayImageFileId: color?.displayImage.id ?? null,
    designImageFileId: color?.designImage.id ?? null,
    sortOrder: color?.sortOrder ?? 0,
    isActive: color?.isActive ?? true,
  }
}

function reset() {
  Object.assign(form, initialState())
  errors.value = {}
}
const dirty = computed(() => {
  const initial = initialState()
  return (Object.keys(initial) as (keyof FormState)[]).some((key) => form[key] !== initial[key])
})

// A saved or reloaded color replaces the draft, unless it has unsaved edits.
watch(
  () => props.color,
  () => {
    if (!dirty.value) reset()
  },
)

function validate() {
  const next: Record<string, string> = {}
  if (!form.colorKey) next.colorKey = 'Chọn màu.'
  if (!form.displayImageFileId) next.displayImageFileId = 'Chọn ảnh hiển thị.'
  if (!form.designImageFileId) next.designImageFileId = 'Chọn ảnh thiết kế.'
  errors.value = next
  return Object.keys(next).length === 0
}

async function save(): Promise<boolean> {
  if (!validate()) return false
  saving.value = true
  const body = {
    colorKey: form.colorKey!,
    displayImageFileId: form.displayImageFileId!,
    designImageFileId: form.designImageFileId!,
    sortOrder: form.sortOrder ?? 0,
    isActive: form.isActive,
  }
  try {
    const saved = props.color
      ? await productsApi.updateColor(props.productId, props.color.id, body)
      : await productsApi.addColor(props.productId, body)
    feedback.success(props.color ? 'Đã lưu màu.' : 'Đã thêm màu.')
    emit('saved', saved)
    return true
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
    return false
  } finally {
    saving.value = false
  }
}

defineExpose({ save, reset, saving, dirty })
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Row :gutter="[16, 16]">
      <Col :span="24">
        <fieldset aria-describedby="color-key-help">
          <legend class="mb-1.5 text-sm font-medium text-foreground">
            Màu <span class="text-destructive" aria-hidden="true">*</span>
          </legend>
          <Flex wrap gap="small">
            <label v-for="option in palette" :key="option.key" class="relative">
              <input
                v-model="form.colorKey"
                type="radio"
                name="color-key"
                :value="option.key"
                :disabled="usedKeys.has(option.key)"
                :aria-invalid="Boolean(errors.colorKey) || undefined"
                class="peer sr-only"
              />
              <Flex
                as="span"
                align="center"
                :gap="6"
                class="cursor-pointer rounded-full border border-input px-3 py-1.5 text-sm peer-checked:border-primary peer-checked:bg-secondary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-40"
              >
                <ColorSwatch :hex-code="option.hexCode" />
                {{ option.name }}
              </Flex>
            </label>
          </Flex>
          <Typography
            v-if="errors.colorKey"
            id="color-key-help"
            variant="caption"
            class="mt-1.5 text-destructive"
          >
            {{ errors.colorKey }}
          </Typography>
          <Typography v-else id="color-key-help" variant="caption" class="mt-1.5">
            Màu đã có trong sản phẩm bị làm mờ. Chọn “Nhiều màu” cho hoa văn, họa tiết.
          </Typography>
        </fieldset>
      </Col>
      <Col :xs="24" :md="12">
        <ImageUploadField
          id="color-display-image"
          v-model="form.displayImageFileId"
          label="Ảnh hiển thị"
          description="Ảnh sản phẩm trên trang khách (JPEG, PNG hoặc WebP, tối đa 5 MB)."
          :current="color?.displayImage"
          :error="errors.displayImageFileId"
          required
        />
      </Col>
      <Col :xs="24" :md="12">
        <ImageUploadField
          id="color-design-image"
          v-model="form.designImageFileId"
          label="Ảnh thiết kế (nền trong suốt)"
          :description="
            designerEnabled
              ? 'Sản phẩm đang bật thiết kế: tắt trước khi đổi ảnh này, rồi kiểm tra lại các vùng thêu.'
              : 'PNG/WebP nền trong suốt, cùng khung với ảnh thiết kế các màu khác (vùng thêu dùng chung).'
          "
          :current="color?.designImage"
          :error="errors.designImageFileId"
          transparent
          required
        />
      </Col>
      <Col :xs="24" :md="12">
        <FormField for="color-order" label="Thứ tự" description="Số nhỏ hiển thị trước.">
          <template #default="{ id }">
            <InputNumber
              :id="id"
              v-model:value="form.sortOrder"
              :min="0"
              :max="1000000"
              :precision="0"
              style="width: 100%"
            />
          </template>
        </FormField>
      </Col>
      <Col :xs="24" :md="12">
        <FormField
          for="color-active"
          label="Đang bán"
          description="Sản phẩm đang bán phải còn ít nhất một màu đang bán."
        >
          <template #default="{ id }">
            <Switch :id="id" v-model:checked="form.isActive" class="self-start" />
          </template>
        </FormField>
      </Col>
    </Row>
    <button type="submit" hidden />
  </form>
</template>
