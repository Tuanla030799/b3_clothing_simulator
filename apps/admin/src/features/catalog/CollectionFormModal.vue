<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Input, InputNumber, Modal, Switch, Textarea } from 'ant-design-vue'
import { Flex, FormField } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { collectionsApi } from '../../api/resources'
import type { Collection } from '../../api/types'
import ImageUploadField from '../../components/ImageUploadField.vue'
import { useFeedback } from '../../composables/useFeedback'
import { SLUG_PATTERN, suggestSlug } from '../../utils/slug'

const props = defineProps<{ collection: Collection | null }>()
const emit = defineEmits<{ saved: [collection: Collection] }>()
const open = defineModel<boolean>('open', { required: true })
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  slug: '',
  description: '',
  imageFileId: null as string | null,
  isActive: false,
  isFeatured: false,
  sortOrder: 0 as number | undefined,
})
let slugTouched = false

watch(open, (isOpen) => {
  if (!isOpen) return
  const collection = props.collection
  Object.assign(form, {
    name: collection?.name ?? '',
    slug: collection?.slug ?? '',
    description: collection?.description ?? '',
    imageFileId: collection?.image?.id ?? null,
    isActive: collection?.isActive ?? false,
    isFeatured: collection?.isFeatured ?? false,
    sortOrder: collection?.sortOrder ?? 0,
  })
  slugTouched = Boolean(collection)
  errors.value = {}
})
watch(
  () => form.name,
  (name) => {
    if (!slugTouched) form.slug = suggestSlug(name)
  },
)

async function save() {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên bộ sưu tập.'
  if (!SLUG_PATTERN.test(form.slug)) next.slug = 'Chỉ chữ thường không dấu, số và dấu gạch nối.'
  errors.value = next
  if (Object.keys(next).length) return
  saving.value = true
  const body = {
    name: form.name.trim(),
    slug: form.slug,
    description: form.description.trim() || null,
    imageFileId: form.imageFileId,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
    sortOrder: form.sortOrder ?? 0,
  }
  try {
    const saved = props.collection
      ? await collectionsApi.update(props.collection.id, body)
      : await collectionsApi.create(body)
    feedback.success('Đã lưu bộ sưu tập.')
    open.value = false
    emit('saved', saved)
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
    :title="collection ? 'Sửa bộ sưu tập' : 'Thêm bộ sưu tập'"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    width="640px"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <FormField for="collection-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="200" />
          </template>
        </FormField>
        <FormField
          for="collection-slug"
          label="Slug"
          description="Đường dẫn /bo-suu-tap/<slug> trên trang khách."
          :error="errors.slug"
          required
        >
          <template #default="{ id }">
            <Input
              :id="id"
              v-model:value="form.slug"
              :maxlength="120"
              @input="slugTouched = true"
            />
          </template>
        </FormField>
        <FormField for="collection-description" label="Mô tả" :error="errors.description">
          <template #default="{ id }">
            <Textarea :id="id" v-model:value="form.description" :rows="3" :maxlength="2000" />
          </template>
        </FormField>
        <ImageUploadField
          id="collection-image"
          v-model="form.imageFileId"
          label="Ảnh"
          description="Không bắt buộc; thẻ bộ sưu tập dùng khung dọc 3:4."
          :current="collection?.image"
          :error="errors.imageFileId"
          clearable
        />
        <Flex gap="large" wrap>
          <FormField for="collection-order" label="Thứ tự">
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
          <FormField for="collection-active" label="Hiện cho khách">
            <template #default="{ id }">
              <Switch :id="id" v-model:checked="form.isActive" />
            </template>
          </FormField>
          <FormField for="collection-featured" label="Nổi bật trên trang chủ">
            <template #default="{ id }">
              <Switch :id="id" v-model:checked="form.isFeatured" />
            </template>
          </FormField>
        </Flex>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
