<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { Input, Modal, Switch, Table } from 'ant-design-vue'
import { Button, Col, Flex, FormField, Row, Select, Typography } from '@lituta/ui'
import { errorMessage, fieldErrors } from '../api/httpClient'
import { categoriesApi } from '../api/resources'
import type { Category } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import CategoryTreeSelect from '../components/CategoryTreeSelect.vue'
import SortModeActions from '../components/SortModeActions.vue'
import { useFeedback } from '../composables/useFeedback'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import { sortModeColumns } from '../composables/useSortMode'
import {
  categoryTrail,
  changedGroups,
  flattenTree,
  isShownToCustomers,
  MAX_CATEGORY_DEPTH,
  moveSibling,
  outlineNumbers,
  parentTree,
  ROOT_VALUE,
  siblingOrder,
  type SiblingOrder,
  treeErrorText,
} from '../utils/categoryTree'
import { isListChanged } from '../utils/listOrder'
import { SLUG_PATTERN, suggestSlug } from '../utils/slug'

/*
 * The category tree (at most 3 levels, API docs/category-tree-contract.md). Every category is
 * loaded at once (the API returns them in tree order); search and status filters run here and
 * show a flat list with the full trail. "Sắp xếp" opens the sorting mode: categories move among
 * their siblings with the up/down buttons (no drag: a flat drag position is ambiguous in a tree)
 * and "Lưu thứ tự" saves each changed group of siblings (`PUT /admin/categories/order`). The
 * parent changes in the edit form.
 */
const feedback = useFeedback()
const categories = shallowRef<Category[]>([])
const loading = ref(false)
const loadError = ref('')

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

// --- sorting mode ---
const sorting = ref(false)
const savingOrder = ref(false)
const order = shallowRef<SiblingOrder>(new Map())
let initialOrder: SiblingOrder = new Map()
const orderDirty = computed(
  () => sorting.value && changedGroups(initialOrder, order.value).length > 0,
)
useLeaveGuard(() => orderDirty.value)

function startSorting() {
  Object.assign(filters, { q: '', active: 'all' })
  initialOrder = siblingOrder(categories.value)
  order.value = initialOrder
  sorting.value = true
}

/** Saves every group of siblings whose order changed (each group in one request). */
async function saveOrder() {
  const groups = changedGroups(initialOrder, order.value)
  savingOrder.value = true
  try {
    for (const parentId of groups) {
      await categoriesApi.reorder(parentId, order.value.get(parentId) ?? [])
    }
    feedback.success('Đã lưu thứ tự.')
    sorting.value = false
  } catch (error) {
    if (!isListChanged(error)) return feedback.error(error)
    feedback.warning('Danh mục vừa thay đổi nên chưa lưu hết; đã tải lại, vui lòng sắp xếp lại.')
    sorting.value = false
  } finally {
    savingOrder.value = false
  }
  await load()
}

const shown = computed(() =>
  sorting.value ? flattenTree(categories.value, order.value) : rows.value,
)

// "1", "1.1", "1.1.2": numbered on the whole tree (as sorted), so filtering keeps the numbers.
const numbers = computed(() => outlineNumbers(sorting.value ? shown.value : categories.value))

const siblingsOf = (category: Category) => order.value.get(category.parentId) ?? []

const columns = computed(() =>
  sortModeColumns<Category>(
    [
      { title: 'STT', key: 'number', width: 80 },
      { title: 'Thứ tự', key: 'order', width: 110 },
      { title: 'Tên', key: 'name' },
      { title: 'Đường dẫn', dataIndex: 'path', key: 'path' },
      { title: 'Sản phẩm', dataIndex: 'productCount', key: 'productCount', width: 100 },
      { title: 'Hiện', key: 'isActive', width: 140 },
      { title: '', key: 'actions', width: 230, align: 'right' },
    ],
    sorting.value,
  ),
)

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

const formParentTree = computed(() => parentTree(categories.value, editing.value?.id))

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
      <SortModeActions
        :active="sorting"
        :saving="savingOrder"
        :dirty="orderDirty"
        :disabled="categories.length < 2"
        @start="startSorting()"
        @save="saveOrder()"
        @cancel="sorting = false"
      />
      <Button v-if="!sorting" @click="openForm(null)">
        <template #icon><Plus /></template>
        Thêm danh mục
      </Button>
    </template>
  </PageHeader>

  <Row v-if="!sorting" :gutter="[12, 12]" class="mb-4">
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
  <Typography v-if="sorting" variant="caption" class="mb-2">
    Dùng nút lên/xuống để đổi thứ tự trong cùng danh mục cha, rồi bấm “Lưu thứ tự”.
  </Typography>
  <Typography v-else-if="filtering" variant="caption" class="mb-2">
    Đang lọc nên danh sách hiển thị phẳng.
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="shown"
    :loading="loading"
    :pagination="false"
    :scroll="{ x: 960 }"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'order'">
        <ReorderHandle
          :label="record.name"
          :drag="false"
          :first="siblingsOf(record as Category)[0] === record.id"
          :last="siblingsOf(record as Category).at(-1) === record.id"
          :disabled="savingOrder"
          @up="order = moveSibling(order, record.parentId, record.id, -1)"
          @down="order = moveSibling(order, record.parentId, record.id, 1)"
        />
      </template>
      <template v-else-if="column.key === 'number'">
        <span class="tabular-nums">{{ numbers.get(record.id) }}</span>
      </template>
      <template v-else-if="column.key === 'name'">
        <span v-if="filtering && !sorting">{{ categoryTrail(categories, record.id) }}</span>
        <span v-else :style="{ paddingLeft: `${(record.depth - 1) * 1.5}rem` }">
          <span v-if="record.depth > 1" class="text-muted-foreground" aria-hidden="true">↳ </span>
          {{ record.name }}
        </span>
      </template>
      <template v-else-if="column.key === 'isActive'">
        <Flex vertical :gap="2">
          <Switch
            :checked="record.isActive"
            :disabled="sorting"
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
            <CategoryTreeSelect :id="id" v-model="form.parent" :tree-data="formParentTree" />
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
