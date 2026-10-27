<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Table, Tag } from 'ant-design-vue'
import { Button, EmptyState, Link, Typography } from '@lituta/ui'
import { productsApi } from '../api/resources'
import type { ProductListItem } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import SortModeActions from '../components/SortModeActions.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { sortModeColumns, useSortMode } from '../composables/useSortMode'
import { formatPrice } from '../utils/format'

/*
 * Featured products (home page), at most 24, in the order customers see them. Only this list is
 * ordered by hand; the general product list is newest first. Products are featured from the
 * product list.
 */
const MAX_FEATURED = 24
const router = useRouter()
const feedback = useFeedback()
const table = usePagedTable(
  (page, pageSize) => productsApi.list({ page, pageSize, isFeatured: true }),
  100,
)
void table.reload()

// Sorting mode: rows move locally and "Lưu thứ tự" saves the whole order at once.
const sort = useSortMode({
  container: useTemplateRef<HTMLElement>('tableWrap'),
  loadAll: productsApi.allFeatured,
  save: productsApi.reorderFeatured,
  reload: () => table.reload(),
})

const columns = computed(() =>
  sortModeColumns<ProductListItem>(
    [
      { title: 'STT', key: 'number', width: 70 },
      { title: 'Thứ tự', key: 'order', width: 120 },
      { title: 'Sản phẩm', key: 'name' },
      { title: 'Danh mục', key: 'category', width: 160 },
      { title: 'Giá', key: 'price', width: 130, align: 'right' },
      { title: 'Trang khách', key: 'public', width: 130 },
      { title: '', key: 'actions', width: 130, align: 'right' },
    ],
    sort.active.value,
  ),
)

async function unfeature(product: ProductListItem) {
  try {
    await productsApi.update(product.id, { isFeatured: false })
    feedback.success(`Đã bỏ “${product.name}” khỏi nổi bật.`)
    void table.reload()
  } catch (error) {
    feedback.error(error)
  }
}
</script>

<template>
  <PageHeader
    title="Sản phẩm nổi bật"
    :description="`Hiện ở mục “Sản phẩm nổi bật” trang chủ theo thứ tự dưới đây (trang chủ lấy 6 sản phẩm đầu). Đang có ${table.rows.value.length}/${MAX_FEATURED}.`"
    :back="{ to: '/san-pham', label: 'Danh sách sản phẩm' }"
  >
    <template #actions>
      <SortModeActions
        :active="sort.active.value"
        :loading="sort.loading.value"
        :saving="sort.saving.value"
        :dirty="sort.dirty.value"
        :disabled="table.rows.value.length === 0"
        @start="sort.start()"
        @save="sort.save()"
        @cancel="sort.cancel()"
      />
    </template>
  </PageHeader>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <EmptyState
    v-if="!table.loading.value && !table.error.value && table.rows.value.length === 0"
    title="Chưa có sản phẩm nổi bật"
    description="Bật “Nổi bật” cho sản phẩm trong danh sách sản phẩm."
  >
    <template #action>
      <Button @click="router.push('/san-pham')">Đến danh sách sản phẩm</Button>
    </template>
  </EmptyState>

  <div v-else ref="tableWrap">
    <Table
      row-key="id"
      :columns="columns"
      :data-source="sort.active.value ? sort.rows.value : table.rows.value"
      :loading="table.loading.value || sort.loading.value"
      :pagination="false"
      :scroll="{ x: 830 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'number'">{{
          sort.active.value ? index + 1 : table.rowNumber(index)
        }}</template>
        <template v-else-if="column.key === 'order'">
          <ReorderHandle
            :label="record.name"
            :first="index === 0"
            :last="index === sort.rows.value.length - 1"
            :disabled="sort.saving.value"
            @up="sort.moveBy(index, -1)"
            @down="sort.moveBy(index, 1)"
          />
        </template>
        <template v-else-if="column.key === 'name'">
          <Link :as="RouterLink" :to="`/san-pham/${record.id}`">{{ record.name }}</Link>
        </template>
        <template v-else-if="column.key === 'category'">{{ record.category.name }}</template>
        <template v-else-if="column.key === 'price'">{{ formatPrice(record.price) }}</template>
        <template v-else-if="column.key === 'public'">
          <Tag :color="record.isActive ? 'green' : 'default'">
            {{ record.isActive ? 'Đang bán' : 'Nháp / ẩn' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button size="small" variant="text" @click="unfeature(record as ProductListItem)">
            Bỏ nổi bật
          </Button>
        </template>
      </template>
    </Table>
  </div>
</template>
