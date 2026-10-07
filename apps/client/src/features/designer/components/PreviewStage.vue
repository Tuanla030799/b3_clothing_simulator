<script setup lang="ts">
import { computed } from 'vue'
import { Shirt } from '@lucide/vue'
import { EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { backgrounds, DEFAULT_BACKGROUND_ID } from '../data/catalog'
import SelectionSummary from './SelectionSummary.vue'

const background = computed(() => backgrounds.find((entry) => entry.id === DEFAULT_BACKGROUND_ID))
</script>

<template>
  <section aria-labelledby="preview-heading" class="rounded-xl border bg-card p-3 sm:p-4">
    <Flex vertical gap="middle">
      <Flex align="center" justify="space-between" wrap gap="small">
        <Typography id="preview-heading" as="h2" variant="subheading">Xem trước</Typography>
        <SelectionSummary :selected-category-ids="[]" />
      </Flex>

      <!-- Placeholder stage: the preview frame ratio is provisional until real backgrounds exist. -->
      <div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
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
      </div>

      <Typography v-if="background" variant="caption">Nền: {{ background.name }}</Typography>
    </Flex>
  </section>
</template>
