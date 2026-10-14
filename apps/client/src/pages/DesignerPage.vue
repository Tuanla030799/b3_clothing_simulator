<script setup lang="ts">
import { computed } from 'vue'
import { CloudOff, LoaderCircle } from '@lucide/vue'
import { Button, Container, EmptyState, Flex, Typography } from '@lituta/ui'
import { useRemoteData } from '../api/useRemoteData'
import { loadDesignerCatalog } from '../features/designer/catalog'
import DesignerWorkspace from '../features/designer/components/DesignerWorkspace.vue'
import type { Background, DesignerCatalog } from '../features/designer/types'

// Backgrounds can be replaced for development harnesses; production uses the loaded catalog.
const props = defineProps<{
  backgrounds?: Background[]
  defaultBackgroundId?: string
  /** `?mau=<color id>` from a product page (see the route). */
  initialColorId?: string
}>()

const { data, error, loading, reload } = useRemoteData(loadDesignerCatalog)

const catalog = computed<DesignerCatalog | null>(() =>
  data.value && props.backgrounds
    ? {
        ...data.value,
        backgrounds: props.backgrounds,
        defaultBackgroundId: props.defaultBackgroundId ?? null,
      }
    : data.value,
)
</script>

<template>
  <!-- The workspace is created once the catalog has loaded; a failed load offers a retry. -->
  <DesignerWorkspace v-if="catalog" :catalog="catalog" :initial-color-id="initialColorId" />

  <Container v-else class="py-10">
    <Flex vertical gap="large">
      <Typography as="h1" variant="heading">Thiết kế bộ quà</Typography>
      <div class="rounded-xl border bg-card" aria-live="polite">
        <EmptyState
          v-if="error && !loading"
          title="Chưa tải được danh mục sản phẩm"
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
