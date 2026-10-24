<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download, ShoppingBag } from '@lucide/vue'
import { Button, Container, Flex, Typography } from '@lituta/ui'
import { ordersApi } from '../../../api/orders'
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
 */
const props = defineProps<{
  catalog: DesignerCatalog
  /** Color to add to the new set and open in the editor (from a product page). */
  initialColorId?: string
}>()

provideCatalog(props.catalog)
// The workspace owns the gift-set, design and composition state for the session.
const selection = useSelection({ catalog: props.catalog })
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
const activePanel = ref<PanelId>('products')
// "Thiết kế với màu này" on a product page: that color starts the set. A color that is no longer
// in the catalog is ignored.
if (props.initialColorId && selection.add(props.initialColorId).ok) activePanel.value = 'design'

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
const checkoutOpen = ref(false)
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
          <Typography as="h1" variant="heading" ellipsis>Thiết kế bộ quà</Typography>
          <Flex v-if="!checkoutOpen" align="center" gap="small">
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

          <CheckoutView v-if="checkoutOpen" :submitter="submitter" @back="checkoutOpen = false" />

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
              <ProductPanel />
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
