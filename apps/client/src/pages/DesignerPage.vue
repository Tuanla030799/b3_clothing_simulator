<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Download } from '@lucide/vue'
import { Button, Container, Flex, Typography } from '@lituta/ui'
import CompositionPanel from '../features/designer/components/CompositionPanel.vue'
import DesignerSteps from '../features/designer/components/DesignerSteps.vue'
import DesignPanel from '../features/designer/components/DesignPanel.vue'
import GiftSetPanel from '../features/designer/components/GiftSetPanel.vue'
import MobilePanelTabs from '../features/designer/components/MobilePanelTabs.vue'
import PreviewStage from '../features/designer/components/PreviewStage.vue'
import ProductPanel from '../features/designer/components/ProductPanel.vue'
import type { Background } from '../features/designer/types'
import { provideComposition, useComposition } from '../features/designer/useComposition'
import { provideDesigns, useDesigns } from '../features/designer/useDesigns'
import { provideExport, useExport } from '../features/designer/useExport'
import { provideSelection, useSelection } from '../features/designer/useSelection'

// Backgrounds can be replaced for development harnesses; production uses the catalog.
const props = defineProps<{ backgrounds?: Background[]; defaultBackgroundId?: string }>()

// The page owns the gift-set, design and composition state for the session.
const selection = useSelection()
provideSelection(selection)
const designs = useDesigns(selection)
provideDesigns(designs)
const composition = useComposition(selection, designs, {
  backgrounds: props.backgrounds,
  defaultBackgroundId: props.defaultBackgroundId,
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
const currentStep = computed(() => (isSet.value ? 2 : selection.activeEntry.value ? 1 : 0))

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
          <Button
            :disabled="!exporter.canExport.value && !exporter.exporting.value"
            :loading="exporter.exporting.value"
            aria-describedby="export-status"
            @click="exporter.run()"
          >
            <template #icon><Download /></template>
            {{ exporter.exporting.value ? 'Đang tạo ảnh…' : 'Tải ảnh' }}
          </Button>
        </Flex>
      </Container>
    </div>

    <div class="py-4 lg:py-6">
      <Container>
        <Flex vertical gap="middle">
          <DesignerSteps :current="currentStep" />

          <div
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
