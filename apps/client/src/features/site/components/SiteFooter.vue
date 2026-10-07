<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Col, Container, Flex, Link, Row, Typography } from '@lituta/ui'
import { brandName, footer } from '../data/siteData'
</script>

<template>
  <footer class="bg-primary text-primary-foreground">
    <Container class="py-10">
      <Row :gutter="[24, 32]">
        <Col :xs="24" :md="9">
          <p class="text-lg font-semibold">{{ brandName }}</p>
          <Typography variant="body" class="mt-2 max-w-sm text-sm text-primary-foreground/85">
            {{ footer.description }}
          </Typography>
          <Flex
            v-if="footer.socials.length"
            as="ul"
            wrap
            gap="middle"
            class="mt-4"
            aria-label="Mạng xã hội"
          >
            <li v-for="social in footer.socials" :key="social.id">
              <Link variant="inverse" :href="social.href" external>{{ social.label }}</Link>
            </li>
          </Flex>
        </Col>

        <Col v-for="column in footer.columns" :key="column.id" :xs="12" :md="5">
          <nav :aria-labelledby="`footer-${column.id}`">
            <p :id="`footer-${column.id}`" class="text-sm font-semibold">{{ column.title }}</p>
            <Flex as="ul" vertical gap="small" class="mt-3">
              <li v-for="link in column.links" :key="link.id">
                <Link variant="inverse" :as="RouterLink" :to="link.to">{{ link.label }}</Link>
              </li>
            </Flex>
          </nav>
        </Col>
      </Row>
    </Container>
  </footer>
</template>
