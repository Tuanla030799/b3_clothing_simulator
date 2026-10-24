<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Spin } from 'ant-design-vue'
import { Button, EmptyState, Flex, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { productsApi } from '../api/resources'
import type { PaletteColor, Product, ProductColor } from '../api/types'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import ColorForm from '../features/catalog/ColorForm.vue'

/** Adds a product color (no `colorId`) or edits one: palette color, images, order, on sale. */
const props = defineProps<{ id: string; colorId?: string }>()
const router = useRouter()

const product = shallowRef<Product | null>(null)
const palette = shallowRef<PaletteColor[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    // One after the other keeps the error handling simple; both are small reads.
    product.value = await productsApi.get(props.id)
    palette.value = await productsApi.palette()
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
watch(() => [props.id, props.colorId], load, { immediate: true })

const color = computed<ProductColor | null>(
  () => product.value?.colors.find((entry) => entry.id === props.colorId) ?? null,
)
const usedKeys = computed(
  () =>
    new Set(
      (product.value?.colors ?? [])
        .filter((entry) => entry.id !== props.colorId)
        .map((entry) => entry.colorKey),
    ),
)
const missing = computed(() => Boolean(product.value && props.colorId && !color.value))
const productPath = computed(() => `/san-pham/${props.id}`)

const form = ref<InstanceType<typeof ColorForm> | null>(null)
const { allowLeave } = useLeaveGuard(() => Boolean(form.value?.dirty))

function saved() {
  allowLeave()
  void router.push(productPath.value)
}
</script>

<template>
  <PageHeader
    :title="colorId ? (color ? `Màu ${color.name}` : 'Màu sản phẩm') : 'Thêm màu'"
    :description="product ? `${product.name} · ${product.category.name}` : undefined"
    :back="{ to: productPath, label: product?.name ?? 'Sản phẩm' }"
  />

  <EmptyState v-if="loadError" title="Chưa tải được sản phẩm" :description="loadError">
    <template #action>
      <Button @click="load()">Thử lại</Button>
    </template>
  </EmptyState>

  <EmptyState
    v-else-if="missing"
    title="Không tìm thấy màu"
    description="Màu này không còn thuộc sản phẩm (có thể đã bị xóa)."
  >
    <template #action>
      <Button @click="router.push(productPath)">Về sản phẩm</Button>
    </template>
  </EmptyState>

  <Spin v-else :spinning="loading && !product">
    <section
      v-if="product"
      aria-labelledby="color-info-heading"
      class="max-w-4xl rounded-xl border bg-card p-4"
    >
      <Flex vertical gap="middle">
        <Typography id="color-info-heading" as="h2" variant="subheading">Thông tin màu</Typography>
        <ColorForm
          ref="form"
          :product-id="id"
          :color="color"
          :palette="palette"
          :used-keys="usedKeys"
          :designer-enabled="product.designerEnabled"
          @saved="saved"
        />
        <FormFooter
          :submit-label="colorId ? 'Lưu màu' : 'Thêm màu'"
          :cancel-to="colorId ? undefined : productPath"
          :saving="form?.saving"
          :dirty="form?.dirty"
          @submit="form?.save()"
          @reset="form?.reset()"
        />
      </Flex>
    </section>
  </Spin>
</template>
