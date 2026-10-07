<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { Shirt } from '@lucide/vue'
import { EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { backgrounds, categoryName, DEFAULT_BACKGROUND_ID } from '../data/catalog'
import { injectDesigns } from '../useDesigns'
import { injectSelection } from '../useSelection'
import SelectionSummary from './SelectionSummary.vue'

// The canvas editor (Konva) is loaded only once an item is shown.
const DesignCanvas = defineAsyncComponent(() => import('./DesignCanvas.vue'))

const selection = injectSelection()
const designs = injectDesigns()
const active = computed(() => selection.activeEntry.value)
const canEdit = computed(() => {
  const product = active.value?.product
  return Boolean(product?.image.src) && designs.productImageState(product!)?.status !== 'error'
})

const background = computed(() => backgrounds.find((entry) => entry.id === DEFAULT_BACKGROUND_ID))
</script>

<template>
  <section aria-labelledby="preview-heading" class="rounded-xl border bg-card p-3 sm:p-4">
    <Flex vertical gap="middle">
      <Flex align="center" justify="space-between" wrap gap="small">
        <Typography id="preview-heading" as="h2" variant="subheading">Xem trước</Typography>
        <SelectionSummary :selected-category-ids="selection.selectedCategoryIds.value" />
      </Flex>

      <!--
        Not a composition: this shows the single active item with its design (or the empty
        background). Arranging the whole set comes later. The 4:3 frame is provisional.
      -->
      <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
        <template v-if="active">
          <!-- Interactive editor for the active item; plain image fallback when it cannot load. -->
          <DesignCanvas v-if="canEdit" />
          <Image
            v-else
            :key="active.item.instanceId"
            :src="active.product.image.src"
            :alt="active.product.name"
            fit="contain"
            loading="eager"
            class="absolute inset-0 size-full bg-card"
          >
            <template #fallback>
              <span class="flex flex-col items-center gap-2 p-4 text-center">
                <Shirt class="size-8" aria-hidden="true" />
                <span class="text-sm font-medium text-foreground">{{ active.product.name }}</span>
              </span>
            </template>
          </Image>
        </template>
        <template v-else>
          <Image :src="background?.image.src" alt="" fit="cover" class="absolute inset-0 size-full">
            <template #fallback>
              <span class="size-full bg-linear-to-br from-secondary via-background to-muted" />
            </template>
          </Image>
          <div class="absolute inset-0 flex items-center justify-center p-4">
            <div class="rounded-xl bg-card/85 shadow-sm">
              <EmptyState
                title="Bộ quà đang trống"
                description="Chọn sản phẩm để bắt đầu thiết kế bộ quà của bạn."
              >
                <template #icon><Shirt /></template>
              </EmptyState>
            </div>
          </div>
        </template>
      </div>

      <Typography v-if="active" variant="caption" data-testid="preview-caption">
        Đang xem món {{ active.position }}: {{ active.product.name }} ·
        {{ categoryName(active.product.categoryId) }}
      </Typography>
      <Typography v-else-if="background" variant="caption">Nền: {{ background.name }}</Typography>
    </Flex>
  </section>
</template>
