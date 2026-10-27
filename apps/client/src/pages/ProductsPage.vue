<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import { Search } from '@lucide/vue'
import { Button, Container, Flex, FormField, Typography } from '@lituta/ui'
import { type PublicCategory, publicCatalog } from '../api/publicCatalog'
import { usePagedList } from '../api/usePagedList'
import { useRemoteData } from '../api/useRemoteData'
import { categoryRoute, childrenOf, lineage } from '../features/catalog/categoryTree'
import ProductList from '../features/catalog/components/ProductList.vue'

const PAGE_SIZE = 24

const route = useRoute()
const router = useRouter()

// Filters live in the URL (/danh-muc/<category path>?q=<text>) so a filtered list can be shared.
const single = (value: LocationQuery[string] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined
const categoryPath = computed(() => {
  const param = route.params.path
  const parts = Array.isArray(param) ? param : param ? [param] : []
  return parts.length > 0 ? parts.join('/') : undefined
})
const searchText = computed(() => single(route.query.q))

const categories = useRemoteData((signal) => publicCatalog.categories(signal))
const allCategories = computed(() => categories.data.value ?? [])

const list = usePagedList((page, signal) =>
  publicCatalog.products(
    { page, pageSize: PAGE_SIZE, categoryPath: categoryPath.value, q: searchText.value },
    signal,
  ),
)
watch([categoryPath, searchText], () => void list.reset(), { immediate: true })

const draft = ref(searchText.value ?? '')
watch(searchText, (value) => (draft.value = value ?? ''))

function applyFilters(next: { categoryPath?: string; q?: string }) {
  const query = next.q ? { q: next.q } : {}
  void router.replace(
    next.categoryPath
      ? { ...categoryRoute(next.categoryPath), query }
      : { name: 'products', query },
  )
}

const selected = computed(() =>
  allCategories.value.find((category) => category.path === categoryPath.value),
)
const chain = computed(() =>
  selected.value ? lineage(allCategories.value, selected.value.id) : [],
)

/*
 * One row of filter buttons per level: the roots, then the children of the selected root, then
 * those of the selected second-level category. "Tất cả" on a row selects the row's parent.
 */
const levels = computed(() => {
  const rows: { key: string; all: { label: string; path?: string }; options: PublicCategory[] }[] =
    []
  for (let level = 0; level < 3; level += 1) {
    const parent = level === 0 ? undefined : chain.value[level - 1]
    if (level > 0 && !parent) break
    const options = childrenOf(allCategories.value, parent?.id ?? null)
    if (level > 0 && options.length === 0) break
    rows.push({
      key: parent?.id ?? 'root',
      all: parent ? { label: `Tất cả ${parent.name}`, path: parent.path } : { label: 'Tất cả' },
      options,
    })
  }
  return rows
})

const emptyTitle = computed(() =>
  searchText.value || categoryPath.value ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm',
)
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Typography as="h1" variant="title">{{ selected?.name ?? 'Sản phẩm' }}</Typography>

      <Flex vertical gap="middle">
        <form
          role="search"
          class="max-w-md"
          @submit.prevent="applyFilters({ categoryPath, q: draft.trim() })"
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
        <Flex
          v-for="(row, index) in levels"
          :key="row.key"
          wrap
          gap="small"
          role="group"
          :aria-label="index === 0 ? 'Lọc theo danh mục' : `Danh mục con của ${row.all.label}`"
        >
          <Button
            size="small"
            :variant="categoryPath === row.all.path ? 'primary' : 'default'"
            :aria-pressed="categoryPath === row.all.path"
            @click="applyFilters({ categoryPath: row.all.path, q: searchText })"
          >
            {{ row.all.label }}
          </Button>
          <Button
            v-for="category in row.options"
            :key="category.id"
            size="small"
            :variant="chain[index]?.id === category.id ? 'primary' : 'default'"
            :aria-pressed="chain[index]?.id === category.id"
            @click="applyFilters({ categoryPath: category.path, q: searchText })"
          >
            {{ category.name }}
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
          searchText || categoryPath ? 'Thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác.' : undefined
        "
        @more="list.loadMore()"
      />
    </Flex>
  </Container>
</template>
