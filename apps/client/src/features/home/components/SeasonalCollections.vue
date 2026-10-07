<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import { Flower2, Gift, Leaf, Moon, Snowflake, Sun } from '@lucide/vue'
import { Col, Container, Flex, Image, Link, Row } from '@lituta/ui'
import { homeImage } from '../data/assets'
import { seasonalCollections } from '../data/homeData'
import SectionHeading from './SectionHeading.vue'

// Placeholder icons for collections without an image yet (design detail, not data).
const icons: Record<string, Component> = {
  'giang-sinh': Snowflake,
  tet: Flower2,
  'trung-thu': Moon,
  'mua-he': Sun,
  'mua-thu': Leaf,
  'mua-dong': Gift,
}
</script>

<template>
  <section aria-labelledby="collections-heading" class="bg-secondary/40 py-12 lg:py-16">
    <Container>
      <Flex vertical gap="large">
        <SectionHeading
          heading-id="collections-heading"
          label="Bộ sưu tập"
          title="Bộ sưu tập theo mùa"
        />

        <Row as="ul" :gutter="[16, 16]" aria-label="Bộ sưu tập theo mùa">
          <Col
            v-for="collection in seasonalCollections"
            :key="collection.id"
            as="li"
            :xs="12"
            :md="8"
            :lg="4"
          >
            <Link :as="RouterLink" :to="collection.to" variant="plain" class="group block">
              <div class="relative aspect-3/4 overflow-hidden rounded-xl bg-muted">
                <Image
                  :src="homeImage(collection.image)"
                  alt=""
                  fit="cover"
                  class="absolute inset-0 size-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
                >
                  <template #fallback>
                    <Flex
                      align="center"
                      justify="center"
                      class="size-full bg-linear-to-br from-secondary via-background to-muted"
                    >
                      <component
                        :is="icons[collection.id] ?? Gift"
                        class="size-10 text-primary/70"
                        aria-hidden="true"
                      />
                    </Flex>
                  </template>
                </Image>
                <!-- Light label strip keeps the name readable over any image. -->
                <p
                  class="absolute inset-x-0 bottom-0 bg-card/90 px-3 py-2 text-center text-sm font-semibold backdrop-blur-sm"
                >
                  {{ collection.name }}
                </p>
              </div>
            </Link>
          </Col>
        </Row>
      </Flex>
    </Container>
  </section>
</template>
