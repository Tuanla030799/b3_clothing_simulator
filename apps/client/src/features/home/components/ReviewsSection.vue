<script setup lang="ts">
import { Star } from '@lucide/vue'
import { Col, Container, Flex, Row, Typography } from '@lituta/ui'
import { reviews } from '../data/homeData'
import SectionHeading from './SectionHeading.vue'

const STARS = [1, 2, 3, 4, 5]
</script>

<template>
  <section aria-labelledby="reviews-heading" class="bg-secondary/40 py-12 lg:py-16">
    <Container>
      <Flex vertical align="center" gap="large">
        <Flex vertical align="center" gap="small">
          <SectionHeading
            heading-id="reviews-heading"
            label="Khách hàng nói gì"
            title="Được yêu thích"
          />
          <Typography v-if="reviews.some((review) => review.isSample)" variant="caption">
            Các đánh giá dưới đây là dữ liệu mẫu.
          </Typography>
        </Flex>

        <Row as="ul" :gutter="[16, 16]" class="w-full" aria-label="Đánh giá của khách hàng">
          <Col v-for="review in reviews" :key="review.id" as="li" :xs="24" :md="8">
            <Flex vertical gap="small" class="h-full rounded-xl border bg-card p-5 shadow-sm">
              <Flex align="center" justify="space-between" gap="small" wrap>
                <Flex
                  as="span"
                  role="img"
                  :aria-label="`${review.rating} trên 5 sao`"
                  :gap="2"
                  class="text-primary"
                >
                  <Star
                    v-for="n in STARS"
                    :key="n"
                    class="size-4"
                    :class="n <= review.rating ? 'fill-current' : 'text-border'"
                    aria-hidden="true"
                  />
                </Flex>
                <span
                  v-if="review.isSample"
                  class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  Dữ liệu mẫu
                </span>
              </Flex>
              <Typography variant="body" class="text-sm">{{ review.text }}</Typography>
              <div class="mt-auto">
                <Typography variant="body" weight="semibold" class="text-sm">
                  {{ review.author }}
                </Typography>
                <Typography v-if="review.product" variant="caption">{{
                  review.product
                }}</Typography>
              </div>
            </Flex>
          </Col>
        </Row>
      </Flex>
    </Container>
  </section>
</template>
