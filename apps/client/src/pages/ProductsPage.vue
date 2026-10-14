<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { Search } from '@lucide/vue'
import { Button, Container, Flex, FormField, Typography } from '@lituta/ui'
import { publicCatalog } from '../api/publicCatalog'
import { usePagedList } from '../api/usePagedList'
import { useRemoteData } from '../api/useRemoteData'
import ProductList from '../features/catalog/components/ProductList.vue'

const PAGE_SIZE = 24

const route = useRoute()
const router = useRouter()

// Filters live in the URL (?danh-muc=<category slug>&q=<text>) so a filtered list can be shared.
const single = (value: LocationQuery[string] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined
const categorySlug = computed(() => single(route.query['danh-muc']))
const searchText = computed(() => single(route.query.q))

const categories = useRemoteData((signal) => publicCatalog.categories(signal))

const list = usePagedList((page, signal) =>
  publicCatalog.products(
    { page, pageSize: PAGE_SIZE, categorySlug: categorySlug.value, q: searchText.value },
    signal,
  ),
)
watch([categorySlug, searchText], () => void list.reset(), { immediate: true })

const draft = ref(searchText.value ?? '')
watch(searchText, (value) => (draft.value = value ?? ''))

function applyFilters(next: { categorySlug?: string; q?: string }) {
  void router.replace({
    query: {
      ...(next.categorySlug ? { 'danh-muc': next.categorySlug } : {}),
      ...(next.q ? { q: next.q } : {}),
    },
  })
}

const filters = computed(() => [
  { slug: undefined as string | undefined, name: 'Tất cả' },
  ...(categories.data.value ?? []).map(({ slug, name }) => ({ slug, name })),
])

const emptyTitle = computed(() =>
  searchText.value || categorySlug.value ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm',
)
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Typography as="h1" variant="title">Sản phẩm</Typography>

      <Flex vertical gap="middle">
        <form
          role="search"
          class="max-w-md"
          @submit.prevent="applyFilters({ categorySlug, q: draft.trim() })"
        >
          <FormField for="product-search" label="Tìm sản phẩm">
            <template #default="{ id, describedBy }">
              <Flex gap="small">
                <input
                  :id="id"
                  v-model="draft"
                  type="search"
                  maxlength="200"
                  :aria-describedby="describedBy"
                  class="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  placeholder="Ví dụ: bodysuit"
                />
                <Button html-type="submit" aria-label="Tìm">
                  <template #icon><Search /></template>
                </Button>
              </Flex>
            </template>
          </FormField>
        </form>

        <!-- Without categories (still loading or failed) only "Tất cả" is offered. -->
        <Flex wrap gap="small" role="group" aria-label="Lọc theo danh mục">
          <Button
            v-for="filter in filters"
            :key="filter.slug ?? 'all'"
            size="small"
            :variant="categorySlug === filter.slug ? 'primary' : 'default'"
            :aria-pressed="categorySlug === filter.slug"
            @click="applyFilters({ categorySlug: filter.slug, q: searchText })"
          >
            {{ filter.name }}
          </Button>
        </Flex>
      </Flex>

      <ProductList
        label="Danh sách sản phẩm"
        :entries="list.entries.value"
        :total="list.total.value"
        :loaded="list.loaded.value"
        :loading="list.loading.value"
        :has-more="list.hasMore.value"
        :error="list.error.value"
        :empty-title="emptyTitle"
        :empty-description="
          searchText || categorySlug ? 'Thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác.' : undefined
        "
        @more="list.loadMore()"
      />
    </Flex>
  </Container>
</template>
