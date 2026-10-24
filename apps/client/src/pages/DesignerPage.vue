<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { CloudOff, LoaderCircle, ShoppingBag } from '@lucide/vue'
import { Button, Container, EmptyState, Flex, Link, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { useRemoteData } from '../api/useRemoteData'
import { useCart } from '../features/cart/cart'
import { loadDesignerCatalog, type DesignerScope } from '../features/designer/catalog'
import DesignerWorkspace from '../features/designer/components/DesignerWorkspace.vue'
import type { Background, DesignerCatalog } from '../features/designer/types'

/*
 * The design tool works on the cart (default) or on one collection (`?bo-suu-tap=<slug>`): only the
 * products of that scope are loaded, never the whole catalog.
 */
const props = defineProps<{
  // Backgrounds can be replaced for development harnesses; production uses the loaded catalog.
  backgrounds?: Background[]
  defaultBackgroundId?: string
  /** Design the products of this collection instead of the cart. */
  collectionSlug?: string
  /** Open the checkout right away (the cart's "Đặt hàng"). */
  checkout?: boolean
}>()

const cart = useCart()
// The cart is read once per load: the workspace then keeps it in step with the set.
const scope = (): DesignerScope =>
  props.collectionSlug
    ? { kind: 'collection', slug: props.collectionSlug }
    : { kind: 'products', slugs: cart.items.value.map((item) => item.productSlug) }
const cartEmpty = computed(() => !props.collectionSlug && cart.count.value === 0)

const { data, error, loading, reload } = useRemoteData(async (signal) => {
  const current = scope()
  const [catalog, collection] = await Promise.all([
    loadDesignerCatalog(current, signal),
    current.kind === 'collection' ? publicCatalog.collection(current.slug, signal) : null,
  ])
  return { catalog, collectionName: collection?.name ?? null }
})
watch(
  () => props.collectionSlug,
  () => void reload(),
)

const catalog = computed<DesignerCatalog | null>(() =>
  data.value && props.backgrounds
    ? {
        ...data.value.catalog,
        backgrounds: props.backgrounds,
        defaultBackgroundId: props.defaultBackgroundId ?? null,
      }
    : (data.value?.catalog ?? null),
)
</script>

<template>
  <!-- The workspace is created once the catalog has loaded; a failed load offers a retry. -->
  <DesignerWorkspace
    v-if="catalog && !cartEmpty"
    :key="collectionSlug ?? 'cart'"
    :catalog="catalog"
    :collection-name="data?.collectionName ?? undefined"
    :checkout="checkout"
  />

  <Container v-else class="py-10">
    <Flex vertical gap="large">
      <Typography as="h1" variant="heading">Thiết kế bộ quà</Typography>
      <div class="rounded-xl border bg-card" aria-live="polite">
        <EmptyState
          v-if="cartEmpty"
          title="Giỏ hàng đang trống"
          description="Thêm sản phẩm vào giỏ rồi thiết kế, hoặc chọn một bộ sưu tập để thiết kế cả bộ."
        >
          <template #icon><ShoppingBag /></template>
          <template #action>
            <Flex wrap justify="center" gap="middle" align="center">
              <Link :as="RouterLink" to="/bo-suu-tap">Chọn bộ sưu tập</Link>
              <Link :as="RouterLink" to="/san-pham">Xem sản phẩm</Link>
            </Flex>
          </template>
        </EmptyState>
        <EmptyState
          v-else-if="error && !loading"
          title="Chưa tải được sản phẩm"
          :description="error"
        >
          <template #icon><CloudOff /></template>
          <template #action>
            <Button variant="primary" @click="reload()">Thử lại</Button>
          </template>
        </EmptyState>
        <EmptyState v-else title="Đang tải sản phẩm…">
          <template #icon
            ><LoaderCircle class="animate-spin motion-reduce:animate-none"
          /></template>
        </EmptyState>
      </div>
    </Flex>
  </Container>
</template>
