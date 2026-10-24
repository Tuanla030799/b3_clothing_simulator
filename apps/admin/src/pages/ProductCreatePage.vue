<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Input, Tag } from 'ant-design-vue'
import { Plus } from '@lucide/vue'
import { Button, Flex, Typography } from '@lituta/ui'
import { categoriesApi, productsApi } from '../api/resources'
import type { Category, PaletteColor, Product, ProductCreateExtras } from '../api/types'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import NewColorsField, { type NewColorRow } from '../features/catalog/NewColorsField.vue'
import ProductForm from '../features/catalog/ProductForm.vue'

/*
 * One page, one request: product information, its colors (palette color + two images) and sizes
 * are created together by the API, so a rejected part creates nothing.
 */
const router = useRouter()
const feedback = useFeedback()
const categories = shallowRef<Category[]>([])
const palette = shallowRef<PaletteColor[]>([])
categoriesApi
  .all()
  .then((list) => (categories.value = list))
  .catch((error) => feedback.error(error))
productsApi
  .palette()
  .then((list) => (palette.value = list))
  .catch((error) => feedback.error(error))

const form = ref<InstanceType<typeof ProductForm> | null>(null)
const colors = ref<NewColorRow[]>([])
const sizes = ref<string[]>([])
const newSize = ref('')
const localErrors = ref<Record<string, string>>({})

const { allowLeave } = useLeaveGuard(
  () => Boolean(form.value?.dirty) || colors.value.length > 0 || sizes.value.length > 0,
)

function addSize() {
  const name = newSize.value.trim().replace(/\s+/g, ' ')
  if (!name) return
  if (sizes.value.some((size) => size.toLowerCase() === name.toLowerCase())) {
    localErrors.value = { ...localErrors.value, size: `Size “${name}” đã có.` }
    return
  }
  sizes.value = [...sizes.value, name]
  newSize.value = ''
  localErrors.value = { ...localErrors.value, size: '' }
}

const extras = computed<ProductCreateExtras>(() => ({
  colors: colors.value.map((row) => ({
    colorKey: row.colorKey ?? '',
    displayImageFileId: row.displayImageFileId ?? '',
    designImageFileId: row.designImageFileId ?? '',
  })),
  sizes: sizes.value.map((name) => ({ name })),
}))

// API errors on colors come back as `colors.<index>.<field>`.
const colorErrors = computed(() => {
  const merged: Record<string, string> = {}
  for (const [field, message] of Object.entries(form.value?.errors ?? {})) {
    if (field.startsWith('colors.')) merged[field.slice('colors.'.length)] = message
  }
  for (const [field, message] of Object.entries(localErrors.value)) {
    if (field.startsWith('color.') && message) merged[field.slice('color.'.length)] = message
  }
  return merged
})

function validateExtras() {
  const next: Record<string, string> = {}
  colors.value.forEach((row, index) => {
    if (!row.colorKey) next[`color.${index}.colorKey`] = 'Chọn màu.'
    if (!row.displayImageFileId) next[`color.${index}.displayImageFileId`] = 'Chọn ảnh hiển thị.'
    if (!row.designImageFileId) next[`color.${index}.designImageFileId`] = 'Chọn ảnh thiết kế.'
  })
  localErrors.value = next
  return Object.keys(next).length === 0
}

async function submit() {
  // Both parts show their errors at once; nothing is sent until both are valid.
  const infoOk = form.value?.validate() ?? false
  const extrasOk = validateExtras()
  if (infoOk && extrasOk) await form.value?.save()
}

function created(product: Product) {
  allowLeave()
  // Step 2: embroidery zones; saving them goes on to the edit page.
  void router.push(`/san-pham/${product.id}/thiet-ke?tao=1`)
}
</script>

<template>
  <PageHeader
    title="Bước 1: Thêm sản phẩm"
    description="Bước 1: thông tin, màu và size (tạo một lần, sản phẩm là bản nháp). Bước 2: đặt vùng thêu."
    :back="{ to: '/san-pham', label: 'Danh sách sản phẩm' }"
  />
  <Flex vertical gap="large" class="max-w-4xl">
    <section aria-labelledby="new-info-heading" class="rounded-xl border bg-card p-4">
      <Flex vertical gap="middle">
        <Typography id="new-info-heading" as="h2" variant="subheading">Thông tin</Typography>
        <ProductForm
          ref="form"
          :product="null"
          :categories="categories"
          :extras="extras"
          @saved="created"
        />
      </Flex>
    </section>

    <section aria-labelledby="new-colors-heading" class="rounded-xl border bg-card p-4">
      <Flex vertical gap="middle">
        <Flex vertical :gap="4">
          <Typography id="new-colors-heading" as="h2" variant="subheading">
            Màu ({{ colors.length }})
          </Typography>
          <Typography variant="caption">
            Mỗi màu một ảnh hiển thị và một ảnh thiết kế nền trong suốt; ảnh thiết kế các màu cùng
            khung vì vùng thêu dùng chung.
          </Typography>
        </Flex>
        <NewColorsField v-model="colors" :palette="palette" :errors="colorErrors" />
      </Flex>
    </section>

    <section aria-labelledby="new-sizes-heading" class="rounded-xl border bg-card p-4">
      <Flex vertical gap="middle">
        <Flex vertical :gap="4">
          <Typography id="new-sizes-heading" as="h2" variant="subheading">
            Size ({{ sizes.length }})
          </Typography>
          <Typography variant="caption">
            Dùng chung cho mọi màu. Để trống nếu khách không cần chọn size.
          </Typography>
        </Flex>
        <Flex v-if="sizes.length" as="ul" wrap gap="small" aria-label="Size đã thêm">
          <li v-for="size in sizes" :key="size">
            <Tag closable @close="sizes = sizes.filter((entry) => entry !== size)">{{ size }}</Tag>
          </li>
        </Flex>
        <form class="max-w-sm" @submit.prevent="addSize">
          <Flex gap="small">
            <Input
              v-model:value="newSize"
              placeholder="Ví dụ: 0-3 tháng"
              :maxlength="50"
              aria-label="Size mới"
              :status="localErrors.size ? 'error' : undefined"
            />
            <Button html-type="submit" size="small" variant="default" :disabled="!newSize.trim()">
              <template #icon><Plus /></template>
              Thêm
            </Button>
          </Flex>
        </form>
        <Typography v-if="localErrors.size" variant="caption" role="alert" class="text-destructive">
          {{ localErrors.size }}
        </Typography>
      </Flex>
    </section>

    <FormFooter
      submit-label="Tạo và đến bước thiết kế"
      cancel-to="/san-pham"
      :saving="form?.saving"
      @submit="submit"
    />
  </Flex>
</template>
