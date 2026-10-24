<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import { Switch, Table, type TableColumnType } from 'ant-design-vue'
import { Button, Flex, Link, Typography } from '@lituta/ui'
import { categoriesApi, designAssetsApi, designLayoutsApi } from '../api/resources'
import type { Category, DesignAsset, DesignLayout } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { useRowReorder } from '../composables/useRowReorder'

/*
 * Hand-arranged layouts of the gift set. When a customer picks a background and the set has exactly
 * the categories (and counts) of a layout, the items go where the layout says instead of the
 * automatic arrangement. Layouts are created hidden.
 */
const feedback = useFeedback()
const router = useRouter()
const categories = shallowRef<Category[]>([])
const backgrounds = shallowRef<DesignAsset[]>([])
Promise.all([categoriesApi.all(), designAssetsApi('backgrounds').all()])
  .then(([categoryList, backgroundList]) => {
    categories.value = categoryList
    backgrounds.value = backgroundList
  })
  .catch((error: unknown) => feedback.error(error))

const table = usePagedTable((page, pageSize) => designLayoutsApi.list({ page, pageSize }), 100)
void table.reload()

const reorder = useRowReorder({
  container: useTemplateRef<HTMLElement>('tableWrap'),
  rows: () => table.rows.value,
  move: (id, afterId) => designLayoutsApi.move(id, afterId),
  reload: () => table.reload(),
  disabled: () => table.page.value > 1,
})

const columns: TableColumnType<DesignLayout>[] = [
  { title: 'Thứ tự', key: 'order', width: 120 },
  { title: 'Tên', key: 'name' },
  { title: 'Nền', key: 'background', width: 200 },
  { title: 'Gồm', key: 'summary' },
  { title: 'Hiện', key: 'isActive', width: 90 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

const categoryName = computed(
  () => (id: string) => categories.value.find((category) => category.id === id)?.name ?? '—',
)
const backgroundName = computed(
  () => (id: string) => backgrounds.value.find((background) => background.id === id)?.name ?? '—',
)

/** "2 × Áo, 1 × Yếm": how many items of each category the layout holds. */
function summary(layout: DesignLayout): string {
  const counts = new Map<string, number>()
  for (const slot of layout.slots)
    counts.set(slot.categoryId, (counts.get(slot.categoryId) ?? 0) + 1)
  return [...counts].map(([id, n]) => `${n} × ${categoryName.value(id)}`).join(', ')
}

async function toggleActive(layout: DesignLayout, isActive: boolean) {
  try {
    await designLayoutsApi.update(layout.id, { isActive })
  } catch (error) {
    feedback.error(error)
  }
  void table.reload()
}

function remove(layout: DesignLayout) {
  feedback.confirmDelete(
    `Xóa mẫu “${layout.name}”?`,
    'Bộ quà sẽ dùng cách sắp xếp tự động.',
    async () => {
      try {
        await designLayoutsApi.remove(layout.id)
        feedback.success('Đã xóa.')
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
    title="Mẫu sắp xếp"
    description="Sắp xếp sẵn vị trí và cỡ từng món trên nền cho một bộ quà cụ thể (ví dụ 2 áo, 2 yếm, 1 mũ). Bộ nào không có mẫu khớp sẽ được xếp tự động."
  >
    <template #actions>
      <Button @click="router.push('/thiet-ke/mau-sap-xep/tao-moi')">
        <template #icon><Plus /></template>
        Thêm mẫu
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
      :data-source="table.rows.value"
      :loading="table.loading.value"
      :pagination="table.pagination.value"
      :scroll="{ x: 800 }"
      @change="table.onChange"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'order'">
          <ReorderHandle
            :label="record.name"
            :first="index === 0"
            :last="index === table.rows.value.length - 1"
            :disabled="reorder.moving.value || table.page.value > 1"
            @up="reorder.moveBy(index, -1)"
            @down="reorder.moveBy(index, 1)"
          />
        </template>
        <template v-else-if="column.key === 'background'">
          {{ backgroundName(record.backgroundId) }}
        </template>
        <template v-else-if="column.key === 'summary'">{{
          summary(record as DesignLayout)
        }}</template>
        <template v-else-if="column.key === 'isActive'">
          <Switch
            :checked="record.isActive"
            :aria-label="`Hiện ${record.name}`"
            @change="(value) => toggleActive(record as DesignLayout, Boolean(value))"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Flex justify="end" gap="small">
            <Link :as="RouterLink" :to="`/thiet-ke/mau-sap-xep/${record.id}`">Sửa</Link>
            <Button size="small" variant="text" @click="remove(record as DesignLayout)">Xóa</Button>
          </Flex>
        </template>
      </template>
    </Table>
  </div>
</template>
