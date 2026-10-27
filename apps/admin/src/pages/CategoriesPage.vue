<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { Input, Modal, Switch, Table, type TableColumnType } from 'ant-design-vue'
import { Button, Col, Flex, FormField, Row, Select, Typography } from '@lituta/ui'
import { errorMessage, fieldErrors } from '../api/httpClient'
import { categoriesApi } from '../api/resources'
import type { Category } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import { useFeedback } from '../composables/useFeedback'
import {
  categoryTrail,
  isShownToCustomers,
  outlineNumbers,
  MAX_CATEGORY_DEPTH,
  parentOptions,
  ROOT_VALUE,
  treeErrorText,
} from '../utils/categoryTree'
import { SLUG_PATTERN, suggestSlug } from '../utils/slug'

/*
 * The category tree (at most 3 levels, API docs/category-tree-contract.md). Every category is
 * loaded at once (the API returns them in tree order); search and status filters run here and
 * show a flat list with the full trail. Order changes among siblings with the up/down buttons;
 * the parent changes in the edit form.
 */
const feedback = useFeedback()
const categories = shallowRef<Category[]>([])
const loading = ref(false)
const loadError = ref('')
const moving = ref(false)

async function load() {
  loading.value = true
  try {
    categories.value = await categoriesApi.all()
    loadError.value = ''
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
void load()

const filters = reactive<{ q: string; active: 'all' | 'true' | 'false' }>({ q: '', active: 'all' })
const activeOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đang hiện', value: 'true' },
  { label: 'Đang ẩn', value: 'false' },
]
const filtering = computed(() => filters.q.trim() !== '' || filters.active !== 'all')
const rows = computed(() => {
  const q = filters.q.trim().toLocaleLowerCase('vi')
  return categories.value.filter(
    (category) =>
      (q === '' || category.name.toLocaleLowerCase('vi').includes(q)) &&
      (filters.active === 'all' || category.isActive === (filters.active === 'true')),
  )
})

// "1", "1.1", "1.1.2": numbered on the whole tree, so filtering keeps each category's number.
const numbers = computed(() => outlineNumbers(categories.value))

const siblingsOf = (category: Category) =>
  categories.value.filter((other) => other.parentId === category.parentId)

/** Moves the category one place up (-1) or down (+1) among its siblings. */
async function moveBy(category: Category, delta: number) {
  const siblings = siblingsOf(category)
  const to = siblings.findIndex((other) => other.id === category.id) + delta
  if (moving.value || to < 0 || to >= siblings.length) return
  const others = siblings.filter((other) => other.id !== category.id)
  moving.value = true
  try {
    await categoriesApi.move(category.id, to === 0 ? null : others[to - 1]!.id)
  } catch (error) {
    feedback.error(error)
  } finally {
    moving.value = false
    await load()
  }
}

const columns: TableColumnType<Category>[] = [
  { title: 'Thứ tự', key: 'order', width: 110 },
  { title: 'STT', key: 'number', width: 80 },
  { title: 'Tên', key: 'name' },
  { title: 'Đường dẫn', dataIndex: 'path', key: 'path' },
  { title: 'Sản phẩm', dataIndex: 'productCount', key: 'productCount', width: 100 },
  { title: 'Hiện', key: 'isActive', width: 140 },
  { title: '', key: 'actions', width: 230, align: 'right' },
]

/** Why a child cannot be added under the category, or null when it can. */
function childBlocked(category: Category): string | null {
  if (category.depth >= MAX_CATEGORY_DEPTH) return `Tối đa ${MAX_CATEGORY_DEPTH} cấp`
  if (category.productCount > 0) return 'Danh mục đang có sản phẩm'
  return null
}

// --- create / edit ---
const editing = ref<Category | null>(null)
const open = ref(false)
const saving = ref(false)
const form = reactive({ name: '', slug: '', isActive: true, parent: ROOT_VALUE })
const errors = ref<Record<string, string>>({})
let slugTouched = false

const formParentOptions = computed(() => parentOptions(categories.value, editing.value?.id))

function openForm(category: Category | null, parentId: string | null = null) {
  editing.value = category
  Object.assign(
    form,
    category
      ? {
          name: category.name,
          slug: category.slug,
          isActive: category.isActive,
          parent: category.parentId ?? ROOT_VALUE,
        }
      : { name: '', slug: '', isActive: true, parent: parentId ?? ROOT_VALUE },
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
  const parentId = form.parent === ROOT_VALUE ? null : form.parent
  const current = editing.value
  try {
    const body = { name: form.name.trim(), slug: form.slug, isActive: form.isActive }
    if (current === null) {
      await categoriesApi.create({ ...body, parentId })
    } else {
      await categoriesApi.update(current.id, body)
      if (parentId !== current.parentId) {
        // A moved category goes last among its new siblings.
        const siblings = categories.value.filter(
          (other) => other.parentId === parentId && other.id !== current.id,
        )
        await categoriesApi.move(current.id, siblings.at(-1)?.id ?? null, parentId)
      }
    }
    feedback.success(current ? 'Đã lưu danh mục.' : 'Đã tạo danh mục.')
    open.value = false
  } catch (error) {
    errors.value = Object.fromEntries(
      Object.entries(fieldErrors(error)).map(([field, text]) => [
        field === 'parentId' ? 'parent' : field,
        treeErrorText(text),
      ]),
    )
    feedback.error(error)
  } finally {
    saving.value = false
    void load()
  }
}

async function toggleActive(category: Category, isActive: boolean) {
  try {
    await categoriesApi.update(category.id, { isActive })
  } catch (error) {
    feedback.error(error)
  } finally {
    void load()
  }
}

function remove(category: Category) {
  feedback.confirmDelete(
    `Xóa danh mục “${category.name}”?`,
    'Chỉ xóa được danh mục không có danh mục con, sản phẩm hay mẫu sắp xếp. Giới hạn số món của ' +
      'danh mục cũng bị xóa.',
    async () => {
      try {
        await categoriesApi.remove(category.id)
        feedback.success('Đã xóa danh mục.')
      } catch (error) {
        feedback.error(error)
      } finally {
        void load()
      }
    },
  )
}
</script>

<template>
  <PageHeader
    title="Danh mục"
    description="Tối đa 3 cấp; chỉ danh mục không có danh mục con mới chứa sản phẩm. Ẩn một danh mục sẽ ẩn cả danh mục con và sản phẩm của chúng khỏi trang khách."
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
      <form role="search" @submit.prevent>
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

  <Typography v-if="loadError" role="alert" class="mb-4 text-destructive">
    {{ loadError }}
  </Typography>
  <Typography v-if="filtering" variant="caption" class="mb-2">
    Đang lọc nên danh sách hiển thị phẳng; bỏ lọc để đổi thứ tự.
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="rows"
    :loading="loading"
    :pagination="false"
    :scroll="{ x: 960 }"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'order'">
        <ReorderHandle
          :label="record.name"
          :drag="false"
          :first="siblingsOf(record as Category)[0]?.id === record.id"
          :last="siblingsOf(record as Category).at(-1)?.id === record.id"
          :disabled="moving || filtering"
          @up="moveBy(record as Category, -1)"
          @down="moveBy(record as Category, 1)"
        />
      </template>
      <template v-else-if="column.key === 'number'">
        <span class="tabular-nums">{{ numbers.get(record.id) }}</span>
      </template>
      <template v-else-if="column.key === 'name'">
        <span v-if="filtering">{{ categoryTrail(categories, record.id) }}</span>
        <span v-else :style="{ paddingLeft: `${(record.depth - 1) * 1.5}rem` }">
          <span v-if="record.depth > 1" class="text-muted-foreground" aria-hidden="true">↳ </span>
          {{ record.name }}
        </span>
      </template>
      <template v-else-if="column.key === 'isActive'">
        <Flex vertical :gap="2">
          <Switch
            :checked="record.isActive"
            :aria-label="`Hiện danh mục ${record.name}`"
            class="self-start"
            @change="(value) => toggleActive(record as Category, Boolean(value))"
          />
          <Typography
            v-if="record.isActive && !isShownToCustomers(categories, record.id)"
            variant="caption"
          >
            Ẩn theo danh mục cha
          </Typography>
        </Flex>
      </template>
      <template v-else-if="column.key === 'actions'">
        <Flex justify="end" gap="small">
          <Button
            size="small"
            variant="default"
            :disabled="childBlocked(record as Category) !== null"
            :title="childBlocked(record as Category) ?? undefined"
            @click="openForm(null, record.id)"
            >Thêm con</Button
          >
          <Button size="small" variant="default" @click="openForm(record as Category)">Sửa</Button>
          <Button size="small" variant="text" @click="remove(record as Category)">Xóa</Button>
        </Flex>
      </template>
    </template>
  </Table>

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
          description="Không trùng với danh mục cùng cha. Đường dẫn = slug của các danh mục cha nối với slug này; đổi slug làm đường dẫn cũ (cả của danh mục con) không còn dùng được."
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
          for="category-parent"
          label="Danh mục cha"
          description="Chuyển sang cha khác sẽ mang theo cả các danh mục con và nằm cuối danh sách của cha mới."
          :error="errors.parent"
        >
          <template #default="{ id }">
            <Select :id="id" v-model="form.parent" size="small" :options="formParentOptions" />
          </template>
        </FormField>
        <FormField
          for="category-active"
          label="Hiện trên trang khách"
          description="Danh mục mới nằm cuối danh sách cùng cha; dùng nút lên/xuống trong bảng để đổi thứ tự."
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
