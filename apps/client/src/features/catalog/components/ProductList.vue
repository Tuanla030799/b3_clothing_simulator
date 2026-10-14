<script setup lang="ts">
import { CloudOff, PackageOpen } from '@lucide/vue'
import { Button, Col, EmptyState, Flex, Row, Typography } from '@lituta/ui'
import type { PublicProductListItem } from '../../../api/publicCatalog'
import ProductCard from './ProductCard.vue'

/*
 * Product grid with its states: first load, error with retry, empty, and "Xem thêm" for the
 * next page. Loading pages is the caller's job (usePagedList); this only shows the result.
 */
defineProps<{
  label: string
  entries: readonly PublicProductListItem[]
  total: number
  loaded: boolean
  loading: boolean
  hasMore: boolean
  error: string | null
  emptyTitle: string
  emptyDescription?: string
}>()
const emit = defineEmits<{ more: [] }>()
</script>

<template>
  <Flex vertical gap="large">
    <EmptyState v-if="!loaded && error" title="Chưa tải được sản phẩm" :description="error">
      <template #icon><CloudOff /></template>
      <template #action>
        <Button variant="primary" @click="emit('more')">Thử lại</Button>
      </template>
    </EmptyState>

    <Typography v-else-if="!loaded" variant="caption" role="status">
      Đang tải sản phẩm…
    </Typography>

    <EmptyState
      v-else-if="entries.length === 0"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template #icon><PackageOpen /></template>
    </EmptyState>

    <template v-else>
      <Row as="ul" :gutter="[16, 24]" :aria-label="label">
        <Col v-for="product in entries" :key="product.id" as="li" :xs="12" :md="8" :lg="6">
          <ProductCard :product="product" />
        </Col>
      </Row>

      <Flex vertical align="center" gap="small">
        <Typography variant="caption" role="status">
          Đang hiển thị {{ entries.length }} / {{ total }} sản phẩm
        </Typography>
        <Typography v-if="error" variant="caption" weight="semibold">{{ error }}</Typography>
        <Button v-if="hasMore || error" :loading="loading" @click="emit('more')">
          {{ error ? 'Thử lại' : 'Xem thêm' }}
        </Button>
      </Flex>
    </template>
  </Flex>
</template>
