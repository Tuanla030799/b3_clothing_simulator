<script setup lang="ts">
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardCheck, LayoutGrid, Palette, PenLine } from '@lucide/vue'
import { Button, Col, Container, Flex, Image, Row, Typography } from '@lituta/ui'
import { homeImage } from '../data/assets'
import { processSteps } from '../data/homeData'
import SectionHeading from './SectionHeading.vue'

const router = useRouter()

// Placeholder icons for steps without an image yet (design detail, not data).
const icons: Record<string, Component> = {
  choose: LayoutGrid,
  options: Palette,
  design: PenLine,
  order: ClipboardCheck,
}
</script>

<template>
  <section aria-labelledby="process-heading" class="py-12 lg:py-16">
    <Container>
      <Flex vertical align="center" gap="large">
        <SectionHeading
          heading-id="process-heading"
          label="Quy trình"
          title="Từ ý tưởng đến món quà"
        />

        <Row as="ol" :gutter="[16, 24]" class="w-full" aria-label="Các bước">
          <Col
            v-for="(step, index) in processSteps"
            :key="step.id"
            as="li"
            :xs="24"
            :sm="12"
            :lg="6"
          >
            <Flex vertical gap="small">
              <div class="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
                <Image
                  :src="homeImage(step.image)"
                  alt=""
                  fit="cover"
                  class="absolute inset-0 size-full"
                >
                  <template #fallback>
                    <Flex
                      align="center"
                      justify="center"
                      class="size-full bg-linear-to-br from-secondary via-background to-muted"
                    >
                      <component
                        :is="icons[step.id] ?? LayoutGrid"
                        class="size-10 text-primary/70"
                        aria-hidden="true"
                      />
                    </Flex>
                  </template>
                </Image>
                <Flex
                  as="span"
                  align="center"
                  justify="center"
                  class="absolute start-3 top-3 size-8 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                  aria-hidden="true"
                >
                  {{ index + 1 }}
                </Flex>
              </div>
              <Typography as="h3" variant="subheading">
                <span class="sr-only">Bước {{ index + 1 }}: </span>{{ step.title }}
              </Typography>
              <Typography variant="body" class="text-sm text-muted-foreground">
                {{ step.description }}
              </Typography>
            </Flex>
          </Col>
        </Row>

        <Button size="large" @click="router.push('/thiet-ke')">Bắt đầu thiết kế</Button>
      </Flex>
    </Container>
  </section>
</template>
