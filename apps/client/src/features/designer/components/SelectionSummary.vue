<script setup lang="ts">
import { computed } from 'vue'
import { Flex } from '@lituta/ui'
import { injectCatalog } from '../catalog'
import type { CategoryId } from '../types'

const props = defineProps<{
  /** Category id of every selected item (repeats included). Empty until selection exists. */
  selectedCategoryIds: readonly CategoryId[]
}>()

const catalog = injectCatalog()

// Limits come from configuration and are matched by category id, never by display name.
const counters = computed(() => [
  {
    key: 'total',
    label: 'Tổng',
    count: props.selectedCategoryIds.length,
    max: catalog.rules.maxItems,
  },
  ...Object.entries(catalog.rules.categoryLimits).map(([categoryId, max]) => ({
    key: categoryId,
    label: catalog.categories.find((category) => category.id === categoryId)?.name ?? categoryId,
    count: props.selectedCategoryIds.filter((id) => id === categoryId).length,
    max: max ?? 0,
  })),
])
</script>

<template>
  <Flex as="ul" wrap gap="small" aria-label="Số lượng đã chọn">
    <li
      v-for="counter in counters"
      :key="counter.key"
      class="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
    >
      {{ counter.label }}
      <span class="font-semibold tabular-nums">{{ counter.count }}/{{ counter.max }}</span>
    </li>
  </Flex>
</template>
