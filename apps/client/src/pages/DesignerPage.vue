<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download } from '@lucide/vue'
import { Button, Container, Flex, Typography } from '@lituta/ui'
import DesignerSteps from '../features/designer/components/DesignerSteps.vue'
import DesignPanel from '../features/designer/components/DesignPanel.vue'
import GiftSetPanel from '../features/designer/components/GiftSetPanel.vue'
import MobilePanelTabs from '../features/designer/components/MobilePanelTabs.vue'
import PreviewStage from '../features/designer/components/PreviewStage.vue'
import ProductPanel from '../features/designer/components/ProductPanel.vue'
import { provideDesigns, useDesigns } from '../features/designer/useDesigns'
import { provideSelection, useSelection } from '../features/designer/useSelection'

// The page owns the gift-set and design state for the session; every panel reads it.
const selection = useSelection()
provideSelection(selection)
provideDesigns(useDesigns(selection))

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
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <header class="border-b bg-card">
      <Container>
        <Flex align="center" justify="space-between" gap="middle" class="h-16">
          <Typography as="h1" variant="heading" ellipsis>Thiết kế bộ quà</Typography>
          <Button disabled>
            <template #icon><Download /></template>
            Tải ảnh
          </Button>
        </Flex>
      </Container>
    </header>

    <main class="flex-1 py-4 lg:py-6">
      <Container>
        <Flex vertical gap="middle">
          <DesignerSteps :current="0" />

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
              :class="mobileVisibility('design')"
            >
              <DesignPanel />
            </div>
          </div>
        </Flex>
      </Container>
    </main>
  </div>
</template>
