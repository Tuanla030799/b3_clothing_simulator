<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Download, ShoppingBag, ShoppingCart } from '@lucide/vue'
import { Button, Container, Flex, Link, Typography } from '@lituta/ui'
import { ordersApi } from '../../../api/orders'
import { newCartItemId, useCart } from '../../cart/cart'
import CheckoutView from '../../checkout/components/CheckoutView.vue'
import { loadGuestSession, saveGuestSession } from '../../checkout/guestStorage'
import { createOrderSubmitter } from '../../checkout/submitOrder'
import { provideCatalog } from '../catalog'
import type { DesignerCatalog } from '../types'
import { provideComposition, useComposition } from '../useComposition'
import { provideDesigns, useDesigns } from '../useDesigns'
import { provideExport, useExport } from '../useExport'
import { provideSelection, useSelection } from '../useSelection'
import CompositionPanel from './CompositionPanel.vue'
import DesignerSteps from './DesignerSteps.vue'
import DesignPanel from './DesignPanel.vue'
import GiftSetPanel from './GiftSetPanel.vue'
import MobilePanelTabs from './MobilePanelTabs.vue'
import PreviewStage from './PreviewStage.vue'
import ProductPanel from './ProductPanel.vue'

/*
 * The design tool for one loaded catalog. The catalog is read once at setup: DesignerPage mounts
 * this component only after loading and remounts it (new session state) if it loads again.
 *
 * Cart mode (default): the set starts with the cart items (same ids) and every add/remove is
 * written back to the cart. Collection mode (`collectionName`): the set is separate from the cart;
 * it can be ordered here or added to the cart.
 */
const props = defineProps<{
  catalog: DesignerCatalog
  /** Designing one collection (its name); undefined designs the cart. */
  collectionName?: string
  /** Open the checkout right away. */
  checkout?: boolean
}>()

const cart = useCart()
const cartMode = props.collectionName === undefined

provideCatalog(props.catalog)
// The workspace owns the gift-set, design and composition state for the session.
const selection = useSelection({
  catalog: props.catalog,
  ...(cartMode
    ? {
        createId: newCartItemId,
        initialItems: cart.items.value.map((item) => ({
          instanceId: item.id,
          productId: item.colorId,
        })),
      }
    : {}),
})
if (cartMode) {
  // The set is the cart: keep it in step (cart items whose product is gone are dropped).
  watch(
    () => selection.entries.value,
    (entries) => {
      // The chosen sizes stay with their items (the set itself does not know sizes).
      const sizes = new Map(cart.items.value.map((item) => [item.id, item.sizeId]))
      cart.replace(
        entries.map(({ item, product }) => ({
          id: item.instanceId,
          productId: product.productId,
          productSlug: product.productSlug,
          colorId: product.id,
          sizeId: sizes.get(item.instanceId) ?? null,
        })),
      )
    },
    { immediate: true },
  )
}

// Collection mode: put the set in the cart (designs stay in this page only).
const cartNotice = ref('')
async function addSetToCart() {
  cartNotice.value = ''
  try {
    const result = await cart.add(
      selection.entries.value.map(({ product }) => ({
        productId: product.productId,
        productSlug: product.productSlug,
        colorId: product.id,
        sizeId: null,
      })),
    )
    cartNotice.value = result.ok
      ? `Đã thêm ${selection.entries.value.length} món vào giỏ (thiết kế chỉ giữ trên trang này).`
      : `Giỏ hàng tối đa ${result.limit} món.`
  } catch {
    cartNotice.value = 'Chưa thêm được vào giỏ. Vui lòng thử lại.'
  }
}
provideSelection(selection)
const designs = useDesigns(selection, { presets: props.catalog.presets })
provideDesigns(designs)
const composition = useComposition(selection, designs, {
  backgrounds: props.catalog.backgrounds,
  defaultBackgroundId: props.catalog.defaultBackgroundId,
  categories: props.catalog.categories,
  layouts: props.catalog.layouts,
})
provideComposition(composition)
const exporter = useExport(selection, designs, composition)
provideExport(exporter)
const isSet = computed(() => composition.mode.value === 'set')

type PanelId = 'products' | 'design' | 'layout'

const panelTabs = computed(() => [
  { id: 'products', label: 'Sản phẩm', controls: 'designer-panel-products' },
  { id: 'design', label: 'Thiết kế', controls: 'designer-panel-design' },
  {
    id: 'layout',
    label: `Bố cục (${selection.items.value.length})`,
    controls: 'designer-panel-layout',
  },
])

/*
 * Mobile: preview, tabs, then the active panel (inactive panels are hidden but stay mounted).
 * lg+: products | preview over the gift set | personalization. Row/Col cannot place one column
 * under another while side columns span both rows, so this area layout uses CSS grid.
 */
const activePanel = ref<PanelId>(selection.entries.value.length ? 'design' : 'products')

const mobileVisibility = (id: PanelId) => (activePanel.value === id ? '' : 'max-lg:hidden')

// Mobile tabs choose the view: "Bố cục" shows the whole set, "Thiết kế" the item editor.
// Adding items never switches tabs.
watch(activePanel, (panel) => {
  if (panel === 'layout') composition.showSet()
  else if (panel === 'design') composition.mode.value = 'item'
})
// The right column holds the item editor or, in set view, the set panel. On mobile the set panel
// is shown under the gift set in the "Bố cục" tab.
const sideVisibility = computed(() =>
  activePanel.value === 'design' || (activePanel.value === 'layout' && isSet.value)
    ? ''
    : 'max-lg:hidden',
)
/*
 * "Đặt hàng" replaces the design area with the checkout; the set and designs stay in this state,
 * so going back keeps everything. The submitter lives here so a retry after reopening the
 * checkout reuses the uploads and the idempotency key of the previous attempt.
 */
const checkoutOpen = ref(Boolean(props.checkout) && selection.entries.value.length > 0)
const submitter = createOrderSubmitter({
  api: ordersApi,
  loadSession: () => loadGuestSession(),
  saveSession: saveGuestSession,
  newKey: () => crypto.randomUUID(),
})
const canOrder = computed(() => selection.entries.value.length > 0 && !selection.lock.locked.value)

const currentStep = computed(() =>
  checkoutOpen.value ? 3 : isSet.value ? 2 : selection.activeEntry.value ? 1 : 0,
)

// The ordered cart items leave the cart (a collection set never entered it).
function onOrdered() {
  if (!cartMode) return
  const ordered = new Set(selection.entries.value.map((entry) => entry.item.instanceId))
  cart.replace(cart.items.value.filter((item) => !ordered.has(item.id)))
}

function editItem(instanceId: string) {
  composition.editItem(instanceId)
  activePanel.value = 'design'
}
</script>

<template>
  <!-- Rendered inside the site layout, which provides the page landmarks (header/main/footer). -->
  <Flex vertical>
    <div class="border-b bg-card">
      <Container>
        <Flex align="center" justify="space-between" gap="middle" class="h-16">
          <Typography as="h1" variant="heading" ellipsis>
            {{ collectionName ? `Thiết kế ${collectionName}` : 'Thiết kế giỏ hàng' }}
          </Typography>
          <Flex v-if="!checkoutOpen" align="center" gap="small">
            <Link v-if="cartMode" :as="RouterLink" to="/gio-hang" class="max-sm:hidden">
              Về giỏ hàng
            </Link>
            <Button v-else variant="default" :disabled="!canOrder" @click="addSetToCart()">
              <template #icon><ShoppingCart /></template>
              Thêm vào giỏ
            </Button>
            <Button
              variant="default"
              :disabled="!exporter.canExport.value && !exporter.exporting.value"
              :loading="exporter.exporting.value"
              aria-describedby="export-status"
              @click="exporter.run()"
            >
              <template #icon><Download /></template>
              {{ exporter.exporting.value ? 'Đang tạo ảnh…' : 'Tải ảnh' }}
            </Button>
            <Button :disabled="!canOrder" @click="checkoutOpen = true">
              <template #icon><ShoppingBag /></template>
              Đặt hàng
            </Button>
          </Flex>
        </Flex>
      </Container>
    </div>

    <div class="py-4 lg:py-6">
      <Container>
        <Flex vertical gap="middle">
          <DesignerSteps :current="currentStep" />
          <Typography v-if="cartNotice" role="status" variant="caption">{{
            cartNotice
          }}</Typography>

          <CheckoutView
            v-if="checkoutOpen"
            :submitter="submitter"
            @back="checkoutOpen = false"
            @ordered="onOrdered"
          />

          <div
            v-else
            class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-6"
          >
            <div class="lg:col-start-2 lg:row-start-1">
              <PreviewStage />
            </div>

            <div class="lg:hidden">
              <MobilePanelTabs v-model="activePanel" :tabs="panelTabs" />
            </div>

            <div
              id="designer-panel-products"
              class="lg:col-start-1 lg:row-span-2 lg:row-start-1"
              :class="mobileVisibility('products')"
            >
              <ProductPanel :cart-mode="cartMode" />
            </div>

            <div
              id="designer-panel-layout"
              class="lg:col-start-2 lg:row-start-2"
              :class="mobileVisibility('layout')"
            >
              <GiftSetPanel @browse="activePanel = 'products'" />
            </div>

            <div
              id="designer-panel-design"
              class="lg:col-start-3 lg:row-span-2 lg:row-start-1"
              :class="sideVisibility"
            >
              <CompositionPanel v-if="isSet" @edit="editItem" @browse="activePanel = 'products'" />
              <DesignPanel v-else />
            </div>
          </div>
        </Flex>
      </Container>
    </div>
  </Flex>
</template>
