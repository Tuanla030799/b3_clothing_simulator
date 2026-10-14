<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Link, Row, Typography } from '@lituta/ui'
import { publicCatalog } from '../../../api/publicCatalog'
import { useRemoteData } from '../../../api/useRemoteData'
import ProductCard from '../../catalog/components/ProductCard.vue'
import SectionHeading from './SectionHeading.vue'

/*
 * The API has no "featured" flag for products, so this shows the first public products in the
 * order the admin set (sortOrder). The cover image is the display photo of the first color.
 */
const FEATURED_COUNT = 6

const { data, error, loading, reload } = useRemoteData((signal) =>
  publicCatalog.products({ page: 1, pageSize: FEATURED_COUNT }, signal),
)
</script>

<template>
  <section
    v-if="loading || error || data?.entries.length"
    aria-labelledby="featured-heading"
    class="py-12 lg:py-16"
  >
    <Container>
      <Flex vertical gap="large">
        <SectionHeading heading-id="featured-heading" label="Sản phẩm" title="Sản phẩm nổi bật" />

        <EmptyState v-if="error && !loading" title="Chưa tải được sản phẩm" :description="error">
          <template #action>
            <Button @click="reload()">Thử lại</Button>
          </template>
        </EmptyState>

        <template v-else-if="data">
          <Row as="ul" :gutter="[16, 24]" aria-label="Sản phẩm nổi bật">
            <Col v-for="product in data.entries" :key="product.id" as="li" :xs="12" :md="8">
              <ProductCard :product="product" />
            </Col>
          </Row>
          <Link :as="RouterLink" to="/san-pham" class="self-center">
            <Flex as="span" align="center" :gap="4">
              Xem tất cả sản phẩm
              <ArrowRight class="size-4" aria-hidden="true" />
            </Flex>
          </Link>
        </template>

        <Typography v-else variant="caption" role="status">Đang tải sản phẩm…</Typography>
      </Flex>
    </Container>
  </section>
</template>
