<script setup lang="ts">
import { reactive, ref, useTemplateRef, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { Input, Modal, Switch, Table, type TableColumnType } from 'ant-design-vue'
import { Button, Col, Flex, FormField, Row, Select, Typography } from '@lituta/ui'
import { fieldErrors } from '../api/httpClient'
import { categoriesApi } from '../api/resources'
import type { Category } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { useRowReorder } from '../composables/useRowReorder'
import { SLUG_PATTERN, suggestSlug } from '../utils/slug'

const feedback = useFeedback()
const filters = reactive<{ q: string; active: 'all' | 'true' | 'false' }>({ q: '', active: 'all' })
const activeOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang hiện', value: 'true' },
  { label: 'Đang ẩn', value: 'false' },
]

const table = usePagedTable(
  (page, pageSize) =>
    categoriesApi.list({
      page,
      pageSize,
      q: filters.q.trim() || undefined,
      isActive: filters.active === 'all' ? undefined : filters.active === 'true',
    }),
  100,
)
void table.reload()

// Drag and drop (or the up/down buttons); the API computes the order. Shown also on the client.
const reorder = useRowReorder({
  container: useTemplateRef<HTMLElement>('tableWrap'),
  rows: () => table.rows.value,
  move: categoriesApi.move,
  reload: () => table.reload(),
  disabled: () => table.page.value > 1,
})
watch(
  () => filters.active,
  () => void table.reload(true),
)

const columns: TableColumnType<Category>[] = [
  { title: 'Thứ tự', key: 'order', width: 120 },
  { title: 'Tên', dataIndex: 'name', key: 'name' },
  { title: 'Slug', dataIndex: 'slug', key: 'slug' },
  { title: 'Hiện', key: 'isActive', width: 90 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

// --- create / edit ---
const editing = ref<Category | null>(null)
const open = ref(false)
const saving = ref(false)
const form = reactive({ name: '', slug: '', isActive: true })
const errors = ref<Record<string, string>>({})
let slugTouched = false

function openForm(category: Category | null) {
  editing.value = category
  Object.assign(
    form,
    category
      ? {
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
        }
      : { name: '', slug: '', isActive: true },
  )
  slugTouched = Boolean(category)
  errors.value = {}
  open.value = true
}

watch(
  () => form.name,
  (name) => {
    if (!slugTouched) form.slug = suggestSlug(name)
  },
)

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên danh mục.'
  if (!SLUG_PATTERN.test(form.slug)) next.slug = 'Chỉ chữ thường không dấu, số và dấu gạch nối.'
  errors.value = next
  return Object.keys(next).length === 0
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      slug: form.slug,
      isActive: form.isActive,
    }
    if (editing.value) await categoriesApi.update(editing.value.id, body)
    else await categoriesApi.create(body)
    feedback.success(editing.value ? 'Đã lưu danh mục.' : 'Đã tạo danh mục.')
    open.value = false
    void table.reload()
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    saving.value = false
  }
}

async function toggleActive(category: Category, isActive: boolean) {
  try {
    await categoriesApi.update(category.id, { isActive })
    void table.reload()
  } catch (error) {
    feedback.error(error)
  }
}

function remove(category: Category) {
  feedback.confirmDelete(
    `Xóa danh mục “${category.name}”?`,
    'Chỉ xóa được danh mục chưa có sản phẩm. Giới hạn số món của danh mục cũng bị xóa.',
    async () => {
      try {
        await categoriesApi.remove(category.id)
        feedback.success('Đã xóa danh mục.')
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
    title="Danh mục"
    description="Danh mục ẩn sẽ ẩn mọi sản phẩm của nó khỏi trang khách."
  >
    <template #actions>
      <Button @click="openForm(null)">
        <template #icon><Plus /></template>
        Thêm danh mục
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

  <div ref="tableWrap">
    <Table
      row-key="id"
      :columns="columns"
      :data-source="table.rows.value"
      :loading="table.loading.value"
      :pagination="table.pagination.value"
      :scroll="{ x: 640 }"
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
        <template v-else-if="column.key === 'isActive'">
          <Switch
            :checked="record.isActive"
            :aria-label="`Hiện danh mục ${record.name}`"
            @change="(value) => toggleActive(record as Category, Boolean(value))"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Flex justify="end" gap="small">
            <Button size="small" variant="default" @click="openForm(record as Category)"
              >Sửa</Button
            >
            <Button size="small" variant="text" @click="remove(record as Category)">Xóa</Button>
          </Flex>
        </template>
      </template>
    </Table>
  </div>

  <Modal
    v-model:open="open"
    :title="editing ? 'Sửa danh mục' : 'Thêm danh mục'"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <FormField for="category-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="100" />
          </template>
        </FormField>
        <FormField
          for="category-slug"
          label="Slug"
          description="Dùng trong đường dẫn. Đổi slug làm đường dẫn cũ không còn dùng được."
          :error="errors.slug"
          required
        >
          <template #default="{ id }">
            <Input
              :id="id"
              v-model:value="form.slug"
              :maxlength="120"
              @input="slugTouched = true"
            />
          </template>
        </FormField>
        <FormField
          for="category-active"
          label="Hiện trên trang khách"
          description="Danh mục mới nằm cuối danh sách; kéo thả trong bảng để đổi thứ tự."
        >
          <template #default="{ id }">
            <Switch :id="id" v-model:checked="form.isActive" class="self-start" />
          </template>
        </FormField>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
