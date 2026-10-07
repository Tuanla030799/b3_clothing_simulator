<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { Shirt } from '@lucide/vue'
import { Button, EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { backgrounds, categoryName, DEFAULT_BACKGROUND_ID } from '../data/catalog'
import { injectComposition } from '../useComposition'
import { injectDesigns } from '../useDesigns'
import { injectExport } from '../useExport'
import { injectSelection } from '../useSelection'
import ExportStatus from './ExportStatus.vue'
import SelectionSummary from './SelectionSummary.vue'

// Konva views are loaded only when they are shown; exactly one canvas is mounted at a time.
const DesignCanvas = defineAsyncComponent(() => import('./DesignCanvas.vue'))
const CompositionCanvas = defineAsyncComponent(() => import('./CompositionCanvas.vue'))

const selection = injectSelection()
const designs = injectDesigns()
const composition = injectComposition()
const exporter = injectExport()
const active = computed(() => selection.activeEntry.value)
const isSet = computed(() => composition.mode.value === 'set')
const isEmpty = computed(() => selection.entries.value.length === 0)
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

      <Flex wrap gap="small" role="group" aria-label="Chế độ xem">
        <Button
          size="small"
          :variant="isSet ? 'default' : 'primary'"
          :disabled="exporter.exporting.value"
          :aria-pressed="!isSet"
          @click="composition.mode.value = 'item'"
        >
          Từng món
        </Button>
        <Button
          size="small"
          :variant="isSet ? 'primary' : 'default'"
          :disabled="exporter.exporting.value"
          :aria-pressed="isSet"
          @click="composition.showSet()"
        >
          Cả bộ
        </Button>
      </Flex>

      <ExportStatus />

      <!-- Whole set on the background: frame follows the composition aspect ratio. -->
      <div
        v-if="isSet && !isEmpty"
        class="w-full overflow-hidden rounded-lg bg-muted"
        :style="{
          aspectRatio: `${composition.size.value.width} / ${composition.size.value.height}`,
        }"
      >
        <CompositionCanvas />
      </div>

      <!-- Single item editor (4:3 frame, provisional). -->
      <div v-else class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
        <template v-if="active && !isSet">
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
              <Flex as="span" vertical align="center" gap="small" class="p-4 text-center">
                <Shirt class="size-8" aria-hidden="true" />
                <span class="text-sm font-medium text-foreground">{{ active.product.name }}</span>
              </Flex>
            </template>
          </Image>
        </template>
        <template v-else>
          <Image :src="background?.image.src" alt="" fit="cover" class="absolute inset-0 size-full">
            <template #fallback>
              <span class="size-full bg-linear-to-br from-secondary via-background to-muted" />
            </template>
          </Image>
          <Flex align="center" justify="center" class="absolute inset-0 p-4">
            <div class="rounded-xl bg-card/85 shadow-sm">
              <EmptyState
                title="Bộ quà đang trống"
                description="Chọn sản phẩm để bắt đầu thiết kế bộ quà của bạn."
              >
                <template #icon><Shirt /></template>
              </EmptyState>
            </div>
          </Flex>
        </template>
      </div>

      <Typography v-if="isSet && !isEmpty" variant="caption" data-testid="preview-caption">
        Cả bộ {{ selection.entries.value.length }} món · Nền:
        {{ composition.backgroundEntry.value?.name ?? 'nền trơn' }}
      </Typography>
      <Typography v-else-if="active" variant="caption" data-testid="preview-caption">
        Đang xem món {{ active.position }}: {{ active.product.name }} ·
        {{ categoryName(active.product.categoryId) }}
      </Typography>
      <Typography v-else-if="background" variant="caption">Nền: {{ background.name }}</Typography>
    </Flex>
  </section>
</template>
