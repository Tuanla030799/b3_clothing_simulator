<script setup lang="ts">
import { computed } from 'vue'
import { Flex } from '@lituta/ui'
import { lineageIds } from '../../catalog/categoryTree'
import { injectCatalog } from '../catalog'
import { injectSelection } from '../useSelection'

const catalog = injectCatalog()
const selection = injectSelection()

/*
 * Items in the order (limit maxOrderItems) and items in the set picture with its limits. Limits
 * come from configuration and are matched by category id, never by display name.
 */
const counters = computed(() => {
  const drawn = selection.pictureEntries.value.map((entry) => entry.product.categoryId)
  // A limit on a parent category counts the items of its whole branch.
  const inBranch = (itemCategoryId: string, categoryId: string) =>
    lineageIds(catalog.categories, itemCategoryId).includes(categoryId)
  return [
    {
      key: 'total',
      label: 'Tổng',
      count: selection.entries.value.length,
      max: catalog.rules.maxOrderItems,
    },
    { key: 'picture', label: 'Trong ảnh', count: drawn.length, max: catalog.rules.maxItems },
    // Limited categories that have items in the order.
    ...Object.entries(catalog.rules.categoryLimits)
      .filter(([categoryId]) =>
        selection.entries.value.some((entry) => inBranch(entry.product.categoryId, categoryId)),
      )
      .map(([categoryId, max]) => ({
        key: categoryId,
        label: `${catalog.categories.find((category) => category.id === categoryId)?.name ?? categoryId} trong ảnh`,
        count: drawn.filter((id) => inBranch(id, categoryId)).length,
        max: max ?? 0,
      })),
  ]
})
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
