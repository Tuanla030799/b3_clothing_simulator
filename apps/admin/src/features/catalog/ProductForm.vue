<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Input, InputNumber, Textarea } from 'ant-design-vue'
import { Col, FormField, Row, Select } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { productsApi } from '../../api/resources'
import type { Category, Product, ProductCreateExtras } from '../../api/types'
import { useFeedback } from '../../composables/useFeedback'
import { formatMoneyInput, parseMoneyInput } from '../../utils/money'
import { SLUG_PATTERN, suggestSlug } from '../../utils/slug'

/**
 * Product information fields (not colors, sizes or publishing). Creates a draft product when
 * `product` is null, otherwise updates it. The parent renders the submit button and calls `save`.
 */
const props = defineProps<{
  product: Product | null
  categories: readonly Category[]
  /** Creating only: colors and sizes sent in the same request (validated by the parent). */
  extras?: ProductCreateExtras
}>()
const emit = defineEmits<{ saved: [product: Product] }>()
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})

type FormState = {
  categoryId: string | undefined
  name: string
  slug: string
  price: number | undefined
  description: string
}
const form = reactive<FormState>(initialState())
let slugTouched = false

function initialState(): FormState {
  const product = props.product
  return {
    categoryId: product?.category.id,
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    price: product?.price,
    description: product?.description ?? '',
  }
}

function reset() {
  Object.assign(form, initialState())
  slugTouched = Boolean(props.product)
  errors.value = {}
}
reset()
// A saved or reloaded product replaces the draft.
watch(() => [props.product?.id, props.product?.updatedAt], reset)

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

const categoryOptions = computed(() =>
  props.categories.map((category) => ({
    label: category.isActive ? category.name : `${category.name} (đang ẩn)`,
    value: category.id,
  })),
)

function validate() {
  const next: Record<string, string> = {}
  if (!form.categoryId) next.categoryId = 'Chọn danh mục.'
  if (!form.name.trim()) next.name = 'Nhập tên sản phẩm.'
  if (!SLUG_PATTERN.test(form.slug)) next.slug = 'Chỉ chữ thường không dấu, số và dấu gạch nối.'
  if (form.price === undefined || form.price < 0) next.price = 'Nhập giá (VND).'
  errors.value = next
  return Object.keys(next).length === 0
}

async function save(): Promise<boolean> {
  if (!validate()) return false
  saving.value = true
  const body = {
    categoryId: form.categoryId!,
    name: form.name.trim(),
    slug: form.slug,
    price: form.price ?? 0,
    description: form.description.trim() || null,
  }
  try {
    const saved = props.product
      ? await productsApi.update(props.product.id, body)
      : await productsApi.create({ ...body, ...props.extras })
    feedback.success(props.product ? 'Đã lưu sản phẩm.' : 'Đã tạo sản phẩm nháp.')
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

defineExpose({ save, reset, validate, saving, dirty, errors })
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Row :gutter="[16, 16]">
      <Col :xs="24" :md="12">
        <FormField for="product-category" label="Danh mục" :error="errors.categoryId" required>
          <template #default="{ id }">
            <Select
              :id="id"
              v-model="form.categoryId"
              :options="categoryOptions"
              placeholder="Chọn danh mục"
              size="small"
            />
          </template>
        </FormField>
      </Col>
      <Col :xs="24" :md="12">
        <FormField for="product-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="200" />
          </template>
        </FormField>
      </Col>
      <Col :span="24">
        <FormField
          for="product-slug"
          label="Slug"
          description="Đường dẫn trang sản phẩm. Đổi slug làm đường dẫn cũ không còn dùng được."
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
      <Col :xs="24" :md="12">
        <FormField
          for="product-price"
          label="Giá (VND)"
          description="Một giá cho mọi màu và size."
          :error="errors.price"
          required
        >
          <template #default="{ id }">
            <InputNumber
              :id="id"
              v-model:value="form.price"
              :min="0"
              :max="1000000000"
              :precision="0"
              :step="1000"
              :formatter="formatMoneyInput"
              :parser="parseMoneyInput"
              addon-after="₫"
              style="width: 100%"
            />
          </template>
        </FormField>
      </Col>
      <Col :span="24">
        <FormField for="product-description" label="Mô tả" :error="errors.description">
          <template #default="{ id }">
            <Textarea
              :id="id"
              v-model:value="form.description"
              :rows="4"
              :maxlength="5000"
              show-count
            />
          </template>
        </FormField>
      </Col>
    </Row>
    <button type="submit" hidden />
  </form>
</template>
