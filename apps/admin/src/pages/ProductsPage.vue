<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus, Search } from '@lucide/vue'
import { Input, Switch, Table, type TableColumnType } from 'ant-design-vue'
import { Button, Col, Flex, Link, Row, Select, Typography } from '@lituta/ui'
import { categoriesApi, productsApi } from '../api/resources'
import type { Category, ProductListItem } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
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
  { title: 'Đang bán', key: 'status', width: 100 },
  { title: 'Cập nhật', key: 'updatedAt', width: 150 },
  { title: '', key: 'actions', width: 140, align: 'right', fixed: 'right' },
]

// --- publishing / delete ---
const toggling = ref<string | null>(null)
async function setActive(item: ProductListItem, isActive: boolean) {
  toggling.value = item.id
  try {
    await productsApi.update(item.id, { isActive })
    feedback.success(isActive ? 'Sản phẩm đang bán.' : 'Đã ẩn sản phẩm.')
    void table.reload()
  } catch (error) {
    // 409 when the category is hidden or no color is on sale.
    feedback.error(error)
  } finally {
    toggling.value = null
  }
}

function remove(item: ProductListItem) {
  feedback.confirmDelete(
    `Xóa sản phẩm “${item.name}”?`,
    'Xóa cả màu, size, vùng thêu và khỏi mọi bộ sưu tập. Đơn hàng đã đặt không bị ảnh hưởng.',
    async () => {
      try {
        await productsApi.remove(item.id)
        feedback.success('Đã xóa sản phẩm.')
        void table.reload()
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}
</script>

<template>
  <PageHeader
    title="Sản phẩm"
    description="Sản phẩm mới là bản nháp; thêm màu (ảnh hiển thị + ảnh thiết kế) rồi bật bán."
  >
    <template #actions>
      <Button @click="router.push('/san-pham/moi')">
        <template #icon><Plus /></template>
        Thêm sản phẩm
      </Button>
    </template>
  </PageHeader>

  <Row :gutter="[12, 12]" class="mb-4">
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <form role="search" @submit.prevent="table.reload(true)">
        <Input
          v-model:value="filters.q"
          placeholder="Tìm theo tên"
          allow-clear
          aria-label="Tìm theo tên"
        >
          <template #suffix><Search class="size-4" aria-hidden="true" /></template>
        </Input>
      </form>
    </Col>
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <Select
        v-model="filters.categoryId"
        size="small"
        :options="categoryOptions"
        aria-label="Lọc danh mục"
      />
    </Col>
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <Select
        v-model="filters.active"
        size="small"
        :options="activeOptions"
        aria-label="Lọc trạng thái"
      />
    </Col>
  </Row>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="table.rows.value"
    :loading="table.loading.value"
    :pagination="table.pagination.value"
    :scroll="{ x: 1040 }"
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
        <Switch
          :checked="record.isActive"
          :loading="toggling === record.id"
          :aria-label="`Bán ${record.name}`"
          @change="(value) => setActive(record as ProductListItem, Boolean(value))"
        />
      </template>
      <template v-else-if="column.key === 'updatedAt'">{{
        formatDateTime(record.updatedAt)
      }}</template>
      <template v-else-if="column.key === 'actions'">
        <Flex justify="end" gap="small">
          <Button
            size="small"
            variant="default"
            :aria-label="`Sửa ${record.name}`"
            @click="router.push(`/san-pham/${record.id}`)"
          >
            Sửa
          </Button>
          <Button size="small" variant="text" @click="remove(record as ProductListItem)">
            Xóa
          </Button>
        </Flex>
      </template>
    </template>
  </Table>
</template>
