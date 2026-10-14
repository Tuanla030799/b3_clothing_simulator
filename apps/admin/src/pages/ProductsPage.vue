<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus, Search } from '@lucide/vue'
import { Input, Table, Tag, type TableColumnType } from 'ant-design-vue'
import { Button, Flex, Link, Select, Typography } from '@lituta/ui'
import { categoriesApi, productsApi } from '../api/resources'
import type { Category, ProductListItem } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import ProductFormModal from '../features/catalog/ProductFormModal.vue'
import { formatDateTime, formatPrice } from '../utils/format'

const router = useRouter()
const feedback = useFeedback()
const categories = shallowRef<Category[]>([])
categoriesApi
  .all()
  .then((list) => (categories.value = list))
  .catch((error) => feedback.error(error))

const filters = reactive<{ q: string; categoryId: string; active: 'all' | 'true' | 'false' }>({
  q: '',
  categoryId: 'all',
  active: 'all',
})
const categoryOptions = computed(() => [
  { label: 'Tất cả danh mục', value: 'all' },
  ...categories.value.map((category) => ({ label: category.name, value: category.id })),
])
const activeOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang bán', value: 'true' },
  { label: 'Nháp / ẩn', value: 'false' },
]

const table = usePagedTable((page, pageSize) =>
  productsApi.list({
    page,
    pageSize,
    q: filters.q.trim() || undefined,
    categoryId: filters.categoryId === 'all' ? undefined : filters.categoryId,
    isActive: filters.active === 'all' ? undefined : filters.active === 'true',
  }),
)
void table.reload()
watch(
  () => [filters.categoryId, filters.active],
  () => void table.reload(true),
)

const columns: TableColumnType<ProductListItem>[] = [
  { title: 'Sản phẩm', key: 'name' },
  { title: 'Danh mục', key: 'category' },
  { title: 'Giá', key: 'price', align: 'right' },
  { title: 'Màu / size', key: 'variants', width: 110 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: 'Cập nhật', key: 'updatedAt', width: 150 },
]

const creating = ref(false)
function created(productId: string) {
  creating.value = false
  void router.push(`/san-pham/${productId}`)
}
</script>

<template>
  <PageHeader
    title="Sản phẩm"
    description="Sản phẩm mới là bản nháp; thêm màu (ảnh hiển thị + ảnh thiết kế) rồi bật bán."
  >
    <template #actions>
      <Button @click="creating = true">
        <template #icon><Plus /></template>
        Thêm sản phẩm
      </Button>
    </template>
  </PageHeader>

  <Flex wrap gap="small" class="mb-4">
    <form role="search" class="w-full max-w-xs" @submit.prevent="table.reload(true)">
      <Input
        v-model:value="filters.q"
        placeholder="Tìm theo tên"
        allow-clear
        aria-label="Tìm theo tên"
      >
        <template #suffix><Search class="size-4" aria-hidden="true" /></template>
      </Input>
    </form>
    <Select
      v-model="filters.categoryId"
      :options="categoryOptions"
      aria-label="Lọc danh mục"
      class="w-52"
    />
    <Select
      v-model="filters.active"
      :options="activeOptions"
      aria-label="Lọc trạng thái"
      class="w-48"
    />
  </Flex>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="table.rows.value"
    :loading="table.loading.value"
    :pagination="table.pagination.value"
    :scroll="{ x: 800 }"
    @change="table.onChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'name'">
        <Link :as="RouterLink" :to="`/san-pham/${record.id}`">{{ record.name }}</Link>
        <Typography variant="caption">{{ record.slug }}</Typography>
      </template>
      <template v-else-if="column.key === 'category'">{{ record.category.name }}</template>
      <template v-else-if="column.key === 'price'">{{ formatPrice(record.price) }}</template>
      <template v-else-if="column.key === 'variants'">
        {{ record.colorCount }} / {{ record.sizeCount }}
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="record.isActive ? 'green' : 'default'">
          {{ record.isActive ? 'Đang bán' : 'Nháp / ẩn' }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'updatedAt'">{{
        formatDateTime(record.updatedAt)
      }}</template>
    </template>
  </Table>

  <ProductFormModal
    v-model:open="creating"
    :categories="categories"
    :product="null"
    @saved="(product) => created(product.id)"
  />
</template>
