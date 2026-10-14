<script setup lang="ts">
import { watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowLeft, CloudOff, SearchX } from '@lucide/vue'
import { Button, Container, EmptyState, Flex, Link, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { usePagedList } from '../api/usePagedList'
import { useRemoteData } from '../api/useRemoteData'
import ProductList from '../features/catalog/components/ProductList.vue'

const props = defineProps<{ slug: string }>()

const PAGE_SIZE = 24
const router = useRouter()

const collection = useRemoteData((signal) => publicCatalog.collection(props.slug, signal))
const products = usePagedList((page, signal) =>
  publicCatalog.collectionProducts(props.slug, { page, pageSize: PAGE_SIZE }, signal),
)
void products.reset()

// The same page component is reused when only the slug changes.
watch(
  () => props.slug,
  () => {
    void collection.reload()
    void products.reset()
  },
)
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Link :as="RouterLink" to="/bo-suu-tap" class="self-start">
        <Flex as="span" align="center" :gap="4">
          <ArrowLeft class="size-4" aria-hidden="true" />
          Tất cả bộ sưu tập
        </Flex>
      </Link>

      <EmptyState
        v-if="collection.notFound.value"
        title="Không tìm thấy bộ sưu tập"
        description="Bộ sưu tập không tồn tại hoặc đã kết thúc."
      >
        <template #icon><SearchX /></template>
        <template #action>
          <Button @click="router.push('/bo-suu-tap')">Xem bộ sưu tập khác</Button>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="collection.error.value && !collection.loading.value"
        title="Chưa tải được bộ sưu tập"
        :description="collection.error.value"
      >
        <template #icon><CloudOff /></template>
        <template #action>
          <Button @click="collection.reload()">Thử lại</Button>
        </template>
      </EmptyState>

      <Typography
        v-else-if="!collection.data.value || collection.data.value.slug !== slug"
        variant="caption"
        role="status"
      >
        Đang tải bộ sưu tập…
      </Typography>

      <template v-else>
        <Flex vertical gap="small" class="max-w-2xl">
          <Typography as="h1" variant="title">{{ collection.data.value.name }}</Typography>
          <Typography v-if="collection.data.value.description" class="whitespace-pre-line">
            {{ collection.data.value.description }}
          </Typography>
        </Flex>

        <ProductList
          :label="`Sản phẩm trong ${collection.data.value.name}`"
          :entries="products.entries.value"
          :total="products.total.value"
          :loaded="products.loaded.value"
          :loading="products.loading.value"
          :has-more="products.hasMore.value"
          :error="products.error.value"
          empty-title="Bộ sưu tập chưa có sản phẩm"
          @more="products.loadMore()"
        />
      </template>
    </Flex>
  </Container>
</template>
