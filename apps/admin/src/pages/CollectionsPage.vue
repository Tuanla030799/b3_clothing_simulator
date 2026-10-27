<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { Switch, Table } from 'ant-design-vue'
import { Button, Flex, Image, Link, Typography } from '@lituta/ui'
import { collectionsApi } from '../api/resources'
import type { Collection } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import SortModeActions from '../components/SortModeActions.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { sortModeColumns, useSortMode } from '../composables/useSortMode'

const router = useRouter()
const feedback = useFeedback()
const table = usePagedTable((page, pageSize) => collectionsApi.list({ page, pageSize }), 100)
void table.reload()

// Sorting mode: rows move locally and "Lưu thứ tự" saves the whole order at once.
const sort = useSortMode({
  container: useTemplateRef<HTMLElement>('tableWrap'),
  loadAll: collectionsApi.all,
  save: collectionsApi.reorder,
  reload: () => table.reload(),
})

const columns = computed(() =>
  sortModeColumns<Collection>(
    [
      { title: 'STT', key: 'number', width: 70 },
      { title: 'Thứ tự', key: 'order', width: 120 },
      { title: 'Ảnh', key: 'image', width: 90 },
      { title: 'Bộ sưu tập', key: 'name' },
      { title: 'Sản phẩm', dataIndex: 'productCount', key: 'productCount', width: 100 },
      { title: 'Hiện', key: 'isActive', width: 90 },
      { title: 'Nổi bật', key: 'isFeatured', width: 90 },
      { title: '', key: 'actions', width: 140, align: 'right', fixed: 'right' },
    ],
    sort.active.value,
  ),
)

async function toggle(collection: Collection, field: 'isActive' | 'isFeatured', value: boolean) {
  try {
    await collectionsApi.update(collection.id, { [field]: value })
    void table.reload()
  } catch (error) {
    feedback.error(error)
  }
}

function remove(collection: Collection) {
  feedback.confirmDelete(
    `Xóa bộ sưu tập “${collection.name}”?`,
    'Chỉ xóa bộ sưu tập và danh sách thành viên; sản phẩm không bị ảnh hưởng.',
    async () => {
      try {
        await collectionsApi.remove(collection.id)
        feedback.success('Đã xóa bộ sưu tập.')
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
    title="Bộ sưu tập"
    description="Nhóm sản phẩm theo mùa hoặc chủ đề. Bộ sưu tập nổi bật (và đang hiện) xuất hiện trên trang chủ."
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
      <Button v-if="!sort.active.value" @click="router.push('/bo-suu-tap/moi')">
        <template #icon><Plus /></template>
        Thêm bộ sưu tập
      </Button>
    </template>
  </PageHeader>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <div ref="tableWrap">
    <Table
      row-key="id"
      :columns="columns"
      :data-source="sort.active.value ? sort.rows.value : table.rows.value"
      :loading="table.loading.value || sort.loading.value"
      :pagination="sort.active.value ? false : table.pagination.value"
      :scroll="{ x: 790 }"
      @change="table.onChange"
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
        <template v-else-if="column.key === 'image'">
          <Image
            :src="record.image?.url"
            alt=""
            class="h-16 w-12 rounded border bg-muted"
            fit="cover"
          />
        </template>
        <template v-else-if="column.key === 'name'">
          <Link :as="RouterLink" :to="`/bo-suu-tap/${record.id}`">{{ record.name }}</Link>
          <Typography variant="caption">/{{ record.slug }}</Typography>
        </template>
        <template v-else-if="column.key === 'isActive' || column.key === 'isFeatured'">
          <Switch
            :checked="record[column.key]"
            :aria-label="`${column.key === 'isActive' ? 'Hiện' : 'Nổi bật'} ${record.name}`"
            @change="
              (value) =>
                toggle(
                  record as Collection,
                  column.key as 'isActive' | 'isFeatured',
                  Boolean(value),
                )
            "
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Flex justify="end" gap="small">
            <Button
              size="small"
              variant="default"
              :aria-label="`Sửa ${record.name}`"
              @click="router.push(`/bo-suu-tap/${record.id}`)"
            >
              Sửa
            </Button>
            <Button size="small" variant="text" @click="remove(record as Collection)">Xóa</Button>
          </Flex>
        </template>
      </template>
    </Table>
  </div>
</template>
