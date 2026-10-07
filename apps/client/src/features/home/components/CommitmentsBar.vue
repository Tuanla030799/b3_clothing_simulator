<script setup lang="ts">
import type { Component } from 'vue'
import { Eye, Gift, Heart, PenLine } from '@lucide/vue'
import { Col, Container, Flex, Row, Typography } from '@lituta/ui'
import { commitments } from '../data/homeData'

// Icons are part of the fixed design, not of the data.
const icons: Record<string, Component> = {
  handmade: Heart,
  personal: PenLine,
  preview: Eye,
  gift: Gift,
}
</script>

<template>
  <section aria-label="Cam kết" class="border-b bg-card">
    <Container>
      <Row :gutter="[16, 16]" class="py-6">
        <Col v-for="item in commitments" :key="item.id" :xs="12" :lg="24 / commitments.length">
          <Flex vertical align="center" gap="small" class="text-center">
            <component :is="icons[item.id]" class="size-6 text-primary" aria-hidden="true" />
            <Typography variant="body" weight="medium" class="text-sm">{{ item.title }}</Typography>
          </Flex>
        </Col>
      </Row>
    </Container>
  </section>
</template>
