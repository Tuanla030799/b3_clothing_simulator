<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import { Col, Container, Flex, Image, Link, Row, Typography } from '@lituta/ui'
import { categoryName, products } from '../../designer/data/catalog'
import { featuredProductIds } from '../data/homeData'
import SectionHeading from './SectionHeading.vue'

// Products come from the catalog (no copies); unknown ids are skipped.
const featured = computed(() =>
  featuredProductIds.flatMap((id) => {
    const product = products.find((entry) => entry.id === id)
    return product ? [product] : []
  }),
)
</script>

<template>
  <section aria-labelledby="featured-heading" class="py-12 lg:py-16">
    <Container>
      <Flex vertical gap="large">
        <SectionHeading heading-id="featured-heading" label="Sản phẩm" title="Sản phẩm nổi bật" />

        <Row as="ul" :gutter="[16, 24]" aria-label="Sản phẩm nổi bật">
          <Col v-for="product in featured" :key="product.id" as="li" :xs="12" :md="8">
            <Link :as="RouterLink" to="/thiet-ke" variant="plain" class="group block">
              <Image
                :src="product.image.src"
                alt=""
                :width="product.image.width"
                :height="product.image.height"
                class="aspect-4/3 w-full rounded-xl bg-secondary/50 transition-colors group-hover:bg-secondary"
              />
              <Flex vertical :gap="4" class="mt-3">
                <Typography variant="body" weight="medium">{{ product.name }}</Typography>
                <Typography variant="caption">{{ categoryName(product.categoryId) }}</Typography>
                <Flex as="span" align="center" :gap="4" class="text-sm font-medium text-primary">
                  Thiết kế
                  <ArrowRight class="size-4" aria-hidden="true" />
                </Flex>
              </Flex>
            </Link>
          </Col>
        </Row>
      </Flex>
    </Container>
  </section>
</template>
