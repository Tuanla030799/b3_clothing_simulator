<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Save } from '@lucide/vue'
import { Button } from '@lituta/ui'
import { productsApi } from '../api/resources'
import type { Product } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import ProductDesigner from '../features/designer/ProductDesigner.vue'

/*
 * Embroidery zones, designer flag and display scale of a product, shared by all its colors.
 * Right after creating a product (`?tao=1`) this is its second step: saving (or skipping) goes on
 * to the product edit page.
 */
const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const creating = computed(() => route.query.tao === '1')
const editPath = computed(() => `/san-pham/${props.id}`)

// Only for the header; the designer loads its own configuration (and shows its errors).
const product = shallowRef<Product | null>(null)
watch(
  () => props.id,
  (id) => {
    productsApi
      .get(id)
      .then((value) => (product.value = value))
      .catch(() => (product.value = null))
  },
  { immediate: true },
)

const designer = ref<InstanceType<typeof ProductDesigner> | null>(null)
const { allowLeave } = useLeaveGuard(() => Boolean(designer.value?.dirty))

async function save() {
  const saved = await designer.value?.saveAll()
  if (saved && creating.value) {
    allowLeave()
    void router.replace(editPath.value)
  }
}

function skip() {
  // Leaving still asks when there are unsaved changes.
  void router.replace(editPath.value)
}
</script>

<template>
  <PageHeader
    :title="creating ? 'Bước 2: Thiết kế thêu' : 'Thiết kế thêu'"
    :description="
      product
        ? `${product.name} · vùng thêu dùng chung cho ${product.colors.length} màu`
        : undefined
    "
    :back="creating ? undefined : { to: editPath, label: product?.name ?? 'Sản phẩm' }"
  >
    <template #actions>
      <Button v-if="creating" variant="text" @click="skip">
        <template #icon><ArrowRight /></template>
        Bỏ qua
      </Button>
      <Button :loading="designer?.savingAll" @click="save">
        <template #icon><Save /></template>
        {{ creating ? 'Lưu thiết kế và tiếp tục' : 'Lưu thiết kế' }}
      </Button>
    </template>
  </PageHeader>
  <section aria-label="Cấu hình thiết kế thêu" class="rounded-xl border bg-card p-4">
    <ProductDesigner ref="designer" :product-id="id" />
  </section>
</template>
