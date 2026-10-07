<script setup lang="ts">
import { ref } from 'vue'
import { Download } from '@lucide/vue'
import { Button, Col, Container, Flex, Row, Typography } from '@lituta/ui'
import DesignerSteps from '../features/designer/components/DesignerSteps.vue'
import DesignPanel from '../features/designer/components/DesignPanel.vue'
import LayoutPanel from '../features/designer/components/LayoutPanel.vue'
import MobilePanelTabs from '../features/designer/components/MobilePanelTabs.vue'
import PreviewStage from '../features/designer/components/PreviewStage.vue'
import ProductPanel from '../features/designer/components/ProductPanel.vue'

type PanelId = 'products' | 'design' | 'layout'

const panelTabs: { id: PanelId; label: string; controls: string }[] = [
  { id: 'products', label: 'Sản phẩm', controls: 'designer-panel-products' },
  { id: 'design', label: 'Thiết kế', controls: 'designer-panel-design' },
  { id: 'layout', label: 'Bố cục', controls: 'designer-panel-layout' },
]

// Mobile shows one panel at a time below the preview; from lg every panel has its own column.
const activePanel = ref<PanelId>('products')
const mobileSpan = (id: PanelId) => (activePanel.value === id ? 24 : 0)
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

          <Row :gutter="[24, 16]">
            <Col :xs="24" :lg="12" class="lg:order-2">
              <div class="lg:sticky lg:top-6">
                <PreviewStage />
              </div>
            </Col>

            <Col :xs="24" :lg="0">
              <MobilePanelTabs v-model="activePanel" :tabs="panelTabs" />
            </Col>

            <Col
              id="designer-panel-products"
              :xs="mobileSpan('products')"
              :lg="6"
              class="lg:order-1"
            >
              <ProductPanel />
            </Col>

            <Col id="designer-panel-design" :xs="mobileSpan('design')" :lg="6" class="lg:order-3">
              <DesignPanel />
            </Col>

            <!-- On large screens the arrangement lives in the central preview. -->
            <Col id="designer-panel-layout" :xs="mobileSpan('layout')" :lg="0">
              <LayoutPanel @browse="activePanel = 'products'" />
            </Col>
          </Row>
        </Flex>
      </Container>
    </main>
  </div>
</template>
