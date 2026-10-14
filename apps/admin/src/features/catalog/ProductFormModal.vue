<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Input, InputNumber, Modal, Textarea } from 'ant-design-vue'
import { Flex, FormField, Select } from '@lituta/ui'
import { fieldErrors } from '../../api/httpClient'
import { productsApi } from '../../api/resources'
import type { Category, Product } from '../../api/types'
import { useFeedback } from '../../composables/useFeedback'
import { SLUG_PATTERN, suggestSlug } from '../../utils/slug'

/** Creates a draft product or edits its information (not colors, sizes or publishing). */
const props = defineProps<{ product: Product | null; categories: readonly Category[] }>()
const emit = defineEmits<{ saved: [product: Product] }>()
const open = defineModel<boolean>('open', { required: true })
const feedback = useFeedback()
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  categoryId: undefined as string | undefined,
  name: '',
  slug: '',
  price: 0 as number | undefined,
  description: '',
  sortOrder: 0 as number | undefined,
})
let slugTouched = false

watch(open, (isOpen) => {
  if (!isOpen) return
  const product = props.product
  Object.assign(form, {
    categoryId: product?.category.id,
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    price: product?.price ?? 0,
    description: product?.description ?? '',
    sortOrder: product?.sortOrder ?? 0,
  })
  slugTouched = Boolean(product)
  errors.value = {}
})
watch(
  () => form.name,
  (name) => {
    if (!slugTouched) form.slug = suggestSlug(name)
  },
)

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

async function save() {
  if (!validate()) return
  saving.value = true
  const body = {
    categoryId: form.categoryId!,
    name: form.name.trim(),
    slug: form.slug,
    price: form.price ?? 0,
    description: form.description.trim() || null,
    sortOrder: form.sortOrder ?? 0,
  }
  try {
    const saved = props.product
      ? await productsApi.update(props.product.id, body)
      : await productsApi.create(body)
    feedback.success(props.product ? 'Đã lưu sản phẩm.' : 'Đã tạo sản phẩm nháp.')
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
    :title="product ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm'"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <FormField for="product-category" label="Danh mục" :error="errors.categoryId" required>
          <template #default="{ id }">
            <Select
              :id="id"
              v-model="form.categoryId"
              :options="categoryOptions"
              placeholder="Chọn danh mục"
            />
          </template>
        </FormField>
        <FormField for="product-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="200" />
          </template>
        </FormField>
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
        <Flex gap="large" wrap>
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
                class="w-48"
              />
            </template>
          </FormField>
          <FormField for="product-order" label="Thứ tự" :error="errors.sortOrder">
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
        </Flex>
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
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
