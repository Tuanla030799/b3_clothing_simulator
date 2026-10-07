<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@lucide/vue'
import { Button, Flex, Image, Typography } from '@lituta/ui'
import { categories, products } from '../data/catalog'
import type { CategoryId } from '../types'

const activeCategoryId = ref<CategoryId | null>(null)

const visibleProducts = computed(() =>
  activeCategoryId.value === null
    ? products
    : products.filter((product) => product.categoryId === activeCategoryId.value),
)

const categoryName = (id: CategoryId) =>
  categories.find((category) => category.id === id)?.name ?? ''

const filters = computed(() => [
  { id: null, name: 'Tất cả' },
  ...categories.map((category) => ({ id: category.id as CategoryId | null, name: category.name })),
])
</script>

<template>
  <section aria-labelledby="product-panel-heading" class="rounded-xl border bg-card p-4">
    <Flex vertical gap="middle">
      <Typography id="product-panel-heading" as="h2" variant="subheading">Chọn đồ</Typography>

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
        <li v-for="product in visibleProducts" :key="product.id" class="rounded-lg border p-3">
          <Flex align="center" gap="small">
            <Image
              :src="product.image.src"
              :alt="product.name"
              :width="product.image.width"
              :height="product.image.height"
              class="size-14 shrink-0 rounded-md bg-muted"
            />
            <div class="min-w-0 flex-1">
              <Typography variant="body" weight="medium">{{ product.name }}</Typography>
              <Typography variant="caption">{{ categoryName(product.categoryId) }}</Typography>
            </div>
            <Button
              size="small"
              variant="default"
              disabled
              :aria-label="`Thêm ${product.name} vào bộ`"
            >
              <template #icon><Plus /></template>
            </Button>
          </Flex>
        </li>
      </ul>
    </Flex>
  </section>
</template>
