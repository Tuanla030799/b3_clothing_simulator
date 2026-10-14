<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Input, InputNumber, Modal, Switch } from 'ant-design-vue'
import { Flex, FormField } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { productsApi } from '../../api/resources'
import type { ProductColor } from '../../api/types'
import ImageUploadField from '../../components/ImageUploadField.vue'
import { useFeedback } from '../../composables/useFeedback'

/*
 * One product color: name, swatch, display photo and the transparent design image the
 * embroidery zones are placed on. While the designer is on, the design image cannot be replaced
 * (the API answers 409): turn it off, replace, check the zones, turn it on again.
 */
const props = defineProps<{ productId: string; color: ProductColor | null }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { required: true })
const HEX = /^#[0-9a-fA-F]{6}$/
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  hexCode: '',
  displayImageFileId: null as string | null,
  designImageFileId: null as string | null,
  sortOrder: 0 as number | undefined,
  isActive: true,
})

watch(open, (isOpen) => {
  if (!isOpen) return
  const color = props.color
  Object.assign(form, {
    name: color?.name ?? '',
    hexCode: color?.hexCode ?? '',
    displayImageFileId: color?.displayImage.id ?? null,
    designImageFileId: color?.designImage.id ?? null,
    sortOrder: color?.sortOrder ?? 0,
    isActive: color?.isActive ?? true,
  })
  errors.value = {}
})

function validate() {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên màu.'
  if (form.hexCode && !HEX.test(form.hexCode)) next.hexCode = 'Dạng #RRGGBB, ví dụ #F5EBDD.'
  if (!form.displayImageFileId) next.displayImageFileId = 'Chọn ảnh hiển thị.'
  if (!form.designImageFileId) next.designImageFileId = 'Chọn ảnh thiết kế.'
  errors.value = next
  return Object.keys(next).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  const body = {
    name: form.name.trim(),
    hexCode: form.hexCode ? form.hexCode.toUpperCase() : null,
    displayImageFileId: form.displayImageFileId!,
    designImageFileId: form.designImageFileId!,
    sortOrder: form.sortOrder ?? 0,
    isActive: form.isActive,
  }
  try {
    if (props.color) await productsApi.updateColor(props.productId, props.color.id, body)
    else await productsApi.addColor(props.productId, body)
    feedback.success(props.color ? 'Đã lưu màu.' : 'Đã thêm màu.')
    open.value = false
    emit('saved')
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Modal
    v-model:open="open"
    :title="color ? `Sửa màu ${color.name}` : 'Thêm màu'"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    width="640px"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <Flex gap="middle" wrap>
          <FormField for="color-name" label="Tên màu" :error="errors.name" required class="flex-1">
            <template #default="{ id }">
              <Input :id="id" v-model:value="form.name" :maxlength="100" />
            </template>
          </FormField>
          <FormField for="color-hex" label="Mã màu" :error="errors.hexCode">
            <template #default="{ id }">
              <Flex align="center" gap="small">
                <input
                  type="color"
                  :value="HEX.test(form.hexCode) ? form.hexCode : '#ffffff'"
                  aria-label="Chọn màu"
                  class="size-8 shrink-0 cursor-pointer rounded border"
                  @input="form.hexCode = ($event.target as HTMLInputElement).value.toUpperCase()"
                />
                <Input
                  :id="id"
                  v-model:value="form.hexCode"
                  placeholder="#F5EBDD"
                  class="w-32"
                  allow-clear
                />
              </Flex>
            </template>
          </FormField>
        </Flex>
        <ImageUploadField
          id="color-display-image"
          v-model="form.displayImageFileId"
          label="Ảnh hiển thị"
          description="Ảnh sản phẩm trên trang khách (JPEG, PNG hoặc WebP, tối đa 5 MB)."
          :current="color?.displayImage"
          :error="errors.displayImageFileId"
          required
        />
        <ImageUploadField
          id="color-design-image"
          v-model="form.designImageFileId"
          label="Ảnh thiết kế (nền trong suốt)"
          :description="
            color?.designerEnabled
              ? 'Màu đang bật thiết kế: tắt thiết kế trước khi đổi ảnh này, rồi kiểm tra lại các vùng thêu.'
              : 'PNG/WebP có kênh trong suốt. Vùng thêu được đặt trên ảnh này.'
          "
          :current="color?.designImage"
          :error="errors.designImageFileId"
          transparent
          required
        />
        <Flex gap="large" wrap>
          <FormField for="color-order" label="Thứ tự">
            <template #default="{ id }">
              <InputNumber
                :id="id"
                v-model:value="form.sortOrder"
                :min="0"
                :max="1000000"
                :precision="0"
              />
            </template>
          </FormField>
          <FormField
            for="color-active"
            label="Đang bán"
            description="Sản phẩm đang bán phải còn ít nhất một màu đang bán."
          >
            <template #default="{ id }">
              <Switch :id="id" v-model:checked="form.isActive" />
            </template>
          </FormField>
        </Flex>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
