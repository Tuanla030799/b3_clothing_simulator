<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Link, Row, Typography } from '@lituta/ui'
import { publicCatalog } from '../../../api/publicCatalog'
import { useRemoteData } from '../../../api/useRemoteData'
import CollectionCard from '../../catalog/components/CollectionCard.vue'
import SectionHeading from './SectionHeading.vue'

// Featured collections chosen by the admin (active ones only). Hidden when there are none.
const collections = useRemoteData((signal) =>
  publicCatalog.allCollections({ featured: true }, signal),
)
</script>

<template>
  <section
    v-if="collections.loading.value || collections.error.value || collections.data.value?.length"
    aria-labelledby="collections-heading"
    class="bg-secondary/40 py-12 lg:py-16"
  >
    <Container>
      <Flex vertical gap="large">
        <SectionHeading
          heading-id="collections-heading"
          label="Bộ sưu tập"
          title="Bộ sưu tập theo mùa"
        />

        <EmptyState
          v-if="collections.error.value && !collections.loading.value"
          title="Chưa tải được bộ sưu tập"
          :description="collections.error.value"
        >
          <template #action>
            <Button @click="collections.reload()">Thử lại</Button>
          </template>
        </EmptyState>

        <template v-else-if="collections.data.value">
          <Row as="ul" :gutter="[16, 16]" justify="center" aria-label="Bộ sưu tập theo mùa">
            <Col
              v-for="collection in collections.data.value"
              :key="collection.id"
              as="li"
              :xs="12"
              :md="collections.data.value.length <= 4 ? 6 : 8"
              :lg="collections.data.value.length <= 4 ? 6 : 4"
            >
              <CollectionCard :collection="collection" />
            </Col>
          </Row>
          <Link :as="RouterLink" to="/bo-suu-tap" class="self-center">
            <Flex as="span" align="center" :gap="4">
              Xem tất cả bộ sưu tập
              <ArrowRight class="size-4" aria-hidden="true" />
            </Flex>
          </Link>
        </template>

        <Typography v-else variant="caption" role="status" class="text-center">
          Đang tải bộ sưu tập…
        </Typography>
      </Flex>
    </Container>
  </section>
</template>
