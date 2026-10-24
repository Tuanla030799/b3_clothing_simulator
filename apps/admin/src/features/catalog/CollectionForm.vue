<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Input, InputNumber, Switch, Textarea } from 'ant-design-vue'
import { Col, FormField, Row } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { collectionsApi } from '../../api/resources'
import type { Collection } from '../../api/types'
import ImageUploadField from '../../components/ImageUploadField.vue'
import { useFeedback } from '../../composables/useFeedback'
import { SLUG_PATTERN, suggestSlug } from '../../utils/slug'

/**
 * Collection information (not its products). Creates a collection when `collection` is null,
 * otherwise updates it. The parent renders the submit button and calls `save`.
 */
const props = defineProps<{ collection: Collection | null }>()
const emit = defineEmits<{ saved: [collection: Collection] }>()
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})

type FormState = {
  name: string
  slug: string
  description: string
  imageFileId: string | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number | undefined
}
const form = reactive<FormState>(initialState())
let slugTouched = false

function initialState(): FormState {
  const collection = props.collection
  return {
    name: collection?.name ?? '',
    slug: collection?.slug ?? '',
    description: collection?.description ?? '',
    imageFileId: collection?.image?.id ?? null,
    isActive: collection?.isActive ?? false,
    isFeatured: collection?.isFeatured ?? false,
    sortOrder: collection?.sortOrder ?? 0,
  }
}

function reset() {
  Object.assign(form, initialState())
  slugTouched = Boolean(props.collection)
  errors.value = {}
}
reset()
// A saved or reloaded collection replaces the draft.
watch(() => props.collection, reset)

watch(
  () => form.name,
  (name) => {
    if (!slugTouched) form.slug = suggestSlug(name)
  },
)

const dirty = computed(() => {
  const initial = initialState()
  return (Object.keys(initial) as (keyof FormState)[]).some((key) => form[key] !== initial[key])
})

async function save(): Promise<boolean> {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên bộ sưu tập.'
  if (!SLUG_PATTERN.test(form.slug)) next.slug = 'Chỉ chữ thường không dấu, số và dấu gạch nối.'
  errors.value = next
  if (Object.keys(next).length) return false
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
    feedback.success(props.collection ? 'Đã lưu bộ sưu tập.' : 'Đã tạo bộ sưu tập.')
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
      <Col :xs="24" :md="12">
        <FormField for="collection-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="200" />
          </template>
        </FormField>
      </Col>
      <Col :xs="24" :md="12">
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
      </Col>
      <Col :span="24">
        <FormField for="collection-description" label="Mô tả" :error="errors.description">
          <template #default="{ id }">
            <Textarea
              :id="id"
              v-model:value="form.description"
              :rows="3"
              :maxlength="2000"
              show-count
            />
          </template>
        </FormField>
      </Col>
      <Col :xs="24" :md="12">
        <ImageUploadField
          id="collection-image"
          v-model="form.imageFileId"
          label="Ảnh"
          description="Không bắt buộc; thẻ bộ sưu tập dùng khung dọc 3:4."
          :current="collection?.image"
          :error="errors.imageFileId"
          clearable
        />
      </Col>
      <Col :xs="24" :md="12">
        <Row :gutter="[16, 16]">
          <Col :span="24">
            <FormField for="collection-order" label="Thứ tự" description="Số nhỏ hiển thị trước.">
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
          <Col :xs="24" :sm="12">
            <FormField for="collection-active" label="Hiện cho khách">
              <template #default="{ id }">
                <Switch :id="id" v-model:checked="form.isActive" class="self-start" />
              </template>
            </FormField>
          </Col>
          <Col :xs="24" :sm="12">
            <FormField
              for="collection-featured"
              label="Nổi bật trên trang chủ"
              description="Chỉ hiện khi bộ sưu tập đang hiện."
            >
              <template #default="{ id }">
                <Switch :id="id" v-model:checked="form.isFeatured" class="self-start" />
              </template>
            </FormField>
          </Col>
        </Row>
      </Col>
    </Row>
    <button type="submit" hidden />
  </form>
</template>
