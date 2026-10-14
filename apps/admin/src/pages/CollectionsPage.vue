<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { Switch, Table, type TableColumnType } from 'ant-design-vue'
import { Button, Flex, Image, Link, Typography } from '@lituta/ui'
import { collectionsApi } from '../api/resources'
import type { Collection } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import CollectionFormModal from '../features/catalog/CollectionFormModal.vue'

const router = useRouter()
const feedback = useFeedback()
const table = usePagedTable((page, pageSize) => collectionsApi.list({ page, pageSize }))
void table.reload()

const columns: TableColumnType<Collection>[] = [
  { title: 'Ảnh', key: 'image', width: 90 },
  { title: 'Bộ sưu tập', key: 'name' },
  { title: 'Sản phẩm', dataIndex: 'productCount', key: 'productCount', width: 100 },
  { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90 },
  { title: 'Hiện', key: 'isActive', width: 90 },
  { title: 'Nổi bật', key: 'isFeatured', width: 90 },
  { title: '', key: 'actions', width: 90, align: 'right' },
]

const creating = ref(false)

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
      <Button @click="creating = true">
        <template #icon><Plus /></template>
        Thêm bộ sưu tập
      </Button>
    </template>
  </PageHeader>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="table.rows.value"
    :loading="table.loading.value"
    :pagination="table.pagination.value"
    :scroll="{ x: 720 }"
    @change="table.onChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'image'">
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
              toggle(record as Collection, column.key as 'isActive' | 'isFeatured', Boolean(value))
          "
        />
      </template>
      <template v-else-if="column.key === 'actions'">
        <Flex justify="end">
          <Button size="small" variant="text" @click="remove(record as Collection)">Xóa</Button>
        </Flex>
      </template>
    </template>
  </Table>

  <CollectionFormModal
    v-model:open="creating"
    :collection="null"
    @saved="(collection) => router.push(`/bo-suu-tap/${collection.id}`)"
  />
</template>
