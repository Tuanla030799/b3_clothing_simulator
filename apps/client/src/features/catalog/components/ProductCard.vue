<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Flex, Image, Link, Typography } from '@lituta/ui'
import type { PublicProductListItem } from '../../../api/publicCatalog'
import { formatPrice } from '../formatPrice'

defineProps<{ product: PublicProductListItem }>()
</script>

<template>
  <!-- One link per card: image, name, category and price open the product page. -->
  <Link :as="RouterLink" :to="`/san-pham/${product.slug}`" variant="plain" class="group block">
    <Image
      :src="product.coverImage.url"
      alt=""
      :width="product.coverImage.width"
      :height="product.coverImage.height"
      class="aspect-4/3 w-full rounded-xl bg-secondary/50 transition-colors group-hover:bg-secondary motion-reduce:transition-none"
    />
    <Flex vertical :gap="4" class="mt-3">
      <Typography variant="body" weight="medium">{{ product.name }}</Typography>
      <Typography variant="caption">{{ product.category.name }}</Typography>
      <Typography variant="body" weight="semibold" class="text-primary">
        {{ formatPrice(product.price) }}
      </Typography>
    </Flex>
  </Link>
</template>
