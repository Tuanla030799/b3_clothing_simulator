<script setup lang="ts">
import { CloudOff, Gift } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Row, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { useRemoteData } from '../api/useRemoteData'
import CollectionCard from '../features/catalog/components/CollectionCard.vue'

// Collections are few; all active ones are read at once (every page of the list).
const collections = useRemoteData((signal) => publicCatalog.allCollections({}, signal))
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Typography as="h1" variant="title">Bộ sưu tập</Typography>

      <EmptyState
        v-if="collections.error.value && !collections.loading.value"
        title="Chưa tải được bộ sưu tập"
        :description="collections.error.value"
      >
        <template #icon><CloudOff /></template>
        <template #action>
          <Button @click="collections.reload()">Thử lại</Button>
        </template>
      </EmptyState>

      <Typography v-else-if="!collections.data.value" variant="caption" role="status">
        Đang tải bộ sưu tập…
      </Typography>

      <EmptyState
        v-else-if="collections.data.value.length === 0"
        title="Chưa có bộ sưu tập"
        description="Các bộ sưu tập theo mùa sẽ sớm được cập nhật."
      >
        <template #icon><Gift /></template>
      </EmptyState>

      <Row v-else as="ul" :gutter="[16, 16]" aria-label="Danh sách bộ sưu tập">
        <Col
          v-for="collection in collections.data.value"
          :key="collection.id"
          as="li"
          :xs="12"
          :md="8"
          :lg="6"
        >
          <CollectionCard :collection="collection" />
        </Col>
      </Row>
    </Flex>
  </Container>
</template>
