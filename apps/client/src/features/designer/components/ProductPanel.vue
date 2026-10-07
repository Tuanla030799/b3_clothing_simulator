<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { Button, Flex, Image, Typography } from '@lituta/ui'
import { addBlockMessage } from '../addBlockMessage'
import { categories, categoryName, products } from '../data/catalog'
import type { CategoryId, Product } from '../types'
import { injectSelection } from '../useSelection'

const selection = injectSelection()

// Filtering is view state only; it never touches the selection.
const activeCategoryId = ref<CategoryId | null>(null)

const filters = computed(() => [
  { id: null, name: 'Tất cả' },
  ...categories.map((category) => ({ id: category.id as CategoryId | null, name: category.name })),
])

// Products stay listed when a limit is reached; only their add button is blocked.
const rows = computed(() =>
  products
    .filter(
      (product) => activeCategoryId.value === null || product.categoryId === activeCategoryId.value,
    )
    .map((product) => {
      const check = selection.canAdd(product.id)
      return { product, blockedReason: check.ok ? null : addBlockMessage(check.reason) }
    }),
)

const announcement = ref('')

function add(product: Product) {
  const result = selection.add(product.id)
  const position = selection.entries.value.find(
    (entry) => entry.item.instanceId === result.instanceId,
  )?.position
  announcement.value = result.ok
    ? `Đã thêm ${product.name} vào bộ, món ${position}`
    : addBlockMessage(result.reason)
}
</script>

<template>
  <section aria-labelledby="product-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Flex align="center" justify="space-between" gap="small">
        <Typography id="product-panel-heading" as="h2" variant="subheading">Chọn đồ</Typography>
        <Typography as="span" variant="caption">
          Tối đa {{ selection.rules.maxItems }} món
        </Typography>
      </Flex>

      <Flex wrap gap="small" role="group" aria-label="Lọc theo loại">
        <Button
          v-for="filter in filters"
          :key="filter.id ?? 'all'"
          size="small"
          :variant="activeCategoryId === filter.id ? 'primary' : 'default'"
          :aria-pressed="activeCategoryId === filter.id"
          @click="activeCategoryId = filter.id"
        >
          {{ filter.name }}
        </Button>
      </Flex>

      <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1" aria-label="Sản phẩm">
        <li
          v-for="{ product, blockedReason } in rows"
          :key="product.id"
          class="rounded-lg border p-3"
        >
          <Flex align="center" gap="small">
            <Image
              :src="product.image.src"
              :alt="product.name"
              :width="product.image.width"
              :height="product.image.height"
              class="aspect-4/3 w-16 shrink-0 rounded-md bg-muted"
            />
            <div class="min-w-0 flex-1">
              <Typography variant="body" weight="medium">{{ product.name }}</Typography>
              <Typography variant="caption">{{ categoryName(product.categoryId) }}</Typography>
              <Typography
                v-if="blockedReason"
                :id="`add-blocked-${product.id}`"
                variant="caption"
                weight="semibold"
              >
                {{ blockedReason }}
              </Typography>
            </div>
            <Button
              size="small"
              variant="default"
              :disabled="blockedReason !== null"
              :aria-label="`Thêm ${product.name} vào bộ`"
              :aria-describedby="blockedReason ? `add-blocked-${product.id}` : undefined"
              @click="add(product)"
            >
              <template #icon><Plus /></template>
            </Button>
          </Flex>
        </li>
      </ul>

      <p class="sr-only" role="status">{{ announcement }}</p>
    </Flex>
  </section>
</template>
