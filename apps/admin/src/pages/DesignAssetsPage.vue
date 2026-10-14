<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus } from '@lucide/vue'
import { Input, InputNumber, Modal, Switch, Table, Tag, type TableColumnType } from 'ant-design-vue'
import { Button, Flex, FormField, Image, Typography } from '@lituta/ui'
import { fieldErrors } from '../api/httpClient'
import { designAssetsApi, type DesignAssetKind } from '../api/resources'
import type { DesignAsset } from '../api/types'
import ImageUploadField from '../components/ImageUploadField.vue'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'

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

const table = usePagedTable((page, pageSize) => api.value.list({ page, pageSize }))
watch(
  () => props.kind,
  () => void table.reload(true),
  { immediate: true },
)

const columns = computed<TableColumnType<DesignAsset>[]>(() => [
  { title: 'Ảnh', key: 'image', width: 120 },
  { title: 'Tên', key: 'name' },
  { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90 },
  { title: 'Hiện', key: 'isActive', width: 90 },
  { title: '', key: 'actions', width: 150, align: 'right' },
])

const open = ref(false)
const editing = ref<DesignAsset | null>(null)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  name: '',
  imageFileId: null as string | null,
  isActive: false,
  sortOrder: 0 as number | undefined,
})

function openForm(asset: DesignAsset | null) {
  editing.value = asset
  Object.assign(form, {
    name: asset?.name ?? '',
    imageFileId: asset?.image.id ?? null,
    isActive: asset?.isActive ?? false,
    sortOrder: asset?.sortOrder ?? 0,
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
    sortOrder: form.sortOrder ?? 0,
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
      <Button @click="openForm(null)">
        <template #icon><Plus /></template>
        Thêm {{ texts.noun }}
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
    :scroll="{ x: 600 }"
    @change="table.onChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'image'">
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
        <Flex gap="large" wrap>
          <FormField for="asset-order" label="Thứ tự">
            <template #default="{ id }">
              <InputNumber
                :id="id"
                v-model:value="form.sortOrder"
                :min="0"
                :max="1000000"
                :precision="0"
              />
            </template>
          </FormField>
          <FormField for="asset-active" label="Hiện cho khách">
            <template #default="{ id }">
              <Switch :id="id" v-model:checked="form.isActive" />
            </template>
          </FormField>
        </Flex>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
