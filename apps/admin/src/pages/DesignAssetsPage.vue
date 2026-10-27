<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { Plus } from '@lucide/vue'
import { Input, Modal, Switch, Table, Tag } from 'ant-design-vue'
import { Button, Flex, FormField, Image, Typography } from '@lituta/ui'
import { fieldErrors } from '../api/httpClient'
import { designAssetsApi, type DesignAssetKind } from '../api/resources'
import type { DesignAsset } from '../api/types'
import ImageUploadField from '../components/ImageUploadField.vue'
import PageHeader from '../components/PageHeader.vue'
import ReorderHandle from '../components/ReorderHandle.vue'
import SortModeActions from '../components/SortModeActions.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { sortModeColumns, useSortMode } from '../composables/useSortMode'

/*
 * Backgrounds of the set view and ready-made images ("Hình có sẵn") share one page: same shape,
 * same endpoints. Both are created hidden; the default background is chosen on the settings page.
 */
const props = defineProps<{ kind: DesignAssetKind }>()
const feedback = useFeedback()
const api = computed(() => designAssetsApi(props.kind))
const isBackground = computed(() => props.kind === 'backgrounds')
const texts = computed(() =>
  isBackground.value
    ? {
        title: 'Nền xem cả bộ',
        description:
          'Ảnh nền khách chọn khi xem cả bộ. Nền mặc định chọn ở trang “Giới hạn bộ quà”; không ẩn hay xóa được nền mặc định.',
        noun: 'nền',
      }
    : {
        title: 'Hình có sẵn',
        description: 'Hình khách có thể đặt vào vùng thêu (nên dùng PNG nền trong suốt).',
        noun: 'hình',
      },
)

const table = usePagedTable((page, pageSize) => api.value.list({ page, pageSize }), 100)
watch(
  () => props.kind,
  () => void table.reload(true),
  { immediate: true },
)

// Sorting mode: rows move locally and "Lưu thứ tự" saves the whole order at once.
const sort = useSortMode({
  container: useTemplateRef<HTMLElement>('tableWrap'),
  loadAll: () => api.value.all(),
  save: (ids) => api.value.reorder(ids),
  reload: () => table.reload(),
})
// Backgrounds and ready-made images share this page: switching leaves the sorting mode.
watch(
  () => props.kind,
  () => sort.cancel(),
)

const columns = computed(() =>
  sortModeColumns<DesignAsset>(
    [
      { title: 'STT', key: 'number', width: 70 },
      { title: 'Thứ tự', key: 'order', width: 120 },
      { title: 'Ảnh', key: 'image', width: 120 },
      { title: 'Tên', key: 'name' },
      { title: 'Hiện', key: 'isActive', width: 90 },
      { title: '', key: 'actions', width: 150, align: 'right' },
    ],
    sort.active.value,
  ),
)

const open = ref(false)
const editing = ref<DesignAsset | null>(null)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  imageFileId: null as string | null,
  isActive: false,
})

function openForm(asset: DesignAsset | null) {
  editing.value = asset
  Object.assign(form, {
    name: asset?.name ?? '',
    imageFileId: asset?.image.id ?? null,
    isActive: asset?.isActive ?? false,
  })
  errors.value = {}
  open.value = true
}

async function save() {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên.'
  if (!form.imageFileId) next.imageFileId = 'Chọn ảnh.'
  errors.value = next
  if (Object.keys(next).length) return
  saving.value = true
  const body = {
    name: form.name.trim(),
    imageFileId: form.imageFileId!,
    isActive: form.isActive,
  }
  try {
    if (editing.value) await api.value.update(editing.value.id, body)
    else await api.value.create(body)
    feedback.success('Đã lưu.')
    open.value = false
    void table.reload()
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    saving.value = false
  }
}

async function toggleActive(asset: DesignAsset, isActive: boolean) {
  try {
    await api.value.update(asset.id, { isActive })
    void table.reload()
  } catch (error) {
    feedback.error(error)
  }
}

function remove(asset: DesignAsset) {
  feedback.confirmDelete(
    `Xóa ${texts.value.noun} “${asset.name}”?`,
    'Đơn hàng đã đặt vẫn giữ ảnh của mình.',
    async () => {
      try {
        await api.value.remove(asset.id)
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
  <PageHeader :title="texts.title" :description="texts.description">
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
      <Button v-if="!sort.active.value" @click="openForm(null)">
        <template #icon><Plus /></template>
        Thêm {{ texts.noun }}
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
      :scroll="{ x: 670 }"
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
            :src="record.image.url"
            :alt="record.name"
            class="h-14 w-20 rounded border bg-muted"
          />
        </template>
        <template v-else-if="column.key === 'name'">
          {{ record.name }}
          <Tag v-if="record.isDefault" color="green" class="ms-2">Mặc định</Tag>
        </template>
        <template v-else-if="column.key === 'isActive'">
          <Switch
            :checked="record.isActive"
            :disabled="sort.active.value"
            :aria-label="`Hiện ${record.name}`"
            @change="(value) => toggleActive(record as DesignAsset, Boolean(value))"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Flex justify="end" gap="small">
            <Button size="small" variant="default" @click="openForm(record as DesignAsset)"
              >Sửa</Button
            >
            <Button size="small" variant="text" @click="remove(record as DesignAsset)">Xóa</Button>
          </Flex>
        </template>
      </template>
    </Table>
  </div>

  <Modal
    v-model:open="open"
    :title="editing ? `Sửa ${texts.noun}` : `Thêm ${texts.noun}`"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <FormField for="asset-name" label="Tên" :error="errors.name" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.name" :maxlength="100" />
          </template>
        </FormField>
        <ImageUploadField
          id="asset-image"
          v-model="form.imageFileId"
          label="Ảnh"
          :current="editing?.image"
          :error="errors.imageFileId"
          required
        />
        <FormField for="asset-active" label="Hiện cho khách">
          <template #default="{ id }">
            <Switch :id="id" v-model:checked="form.isActive" class="self-start" />
          </template>
        </FormField>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
