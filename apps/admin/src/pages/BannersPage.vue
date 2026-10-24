<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Plus } from '@lucide/vue'
import {
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Textarea,
  type TableColumnType,
} from 'ant-design-vue'
import { Button, Flex, FormField, Image, Typography } from '@lituta/ui'
import { fieldErrors } from '../api/httpClient'
import { bannersApi } from '../api/resources'
import type { Banner } from '../api/types'
import ImageUploadField from '../components/ImageUploadField.vue'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePagedTable } from '../composables/usePagedTable'
import { linkUrlProblem } from '../utils/linkUrl'

const feedback = useFeedback()
const table = usePagedTable((page, pageSize) => bannersApi.list({ page, pageSize }))
void table.reload()

const columns: TableColumnType<Banner>[] = [
  { title: 'Ảnh', key: 'image', width: 150 },
  { title: 'Tiêu đề', key: 'title' },
  { title: 'Liên kết', key: 'linkUrl' },
  { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90 },
  { title: 'Hiện', key: 'isActive', width: 90 },
  { title: '', key: 'actions', width: 150, align: 'right' },
]

const open = ref(false)
const editing = ref<Banner | null>(null)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const form = reactive({
  title: '',
  description: '',
  linkUrl: '',
  desktopImageFileId: null as string | null,
  mobileImageFileId: null as string | null,
  isActive: false,
  sortOrder: 0 as number | undefined,
})

function openForm(banner: Banner | null) {
  editing.value = banner
  Object.assign(form, {
    title: banner?.title ?? '',
    description: banner?.description ?? '',
    linkUrl: banner?.linkUrl ?? '',
    desktopImageFileId: banner?.desktopImage.id ?? null,
    mobileImageFileId: banner?.mobileImage?.id ?? null,
    isActive: banner?.isActive ?? false,
    sortOrder: banner?.sortOrder ?? 0,
  })
  errors.value = {}
  open.value = true
}

async function save() {
  const next: Record<string, string> = {}
  if (!form.title.trim()) next.title = 'Nhập tiêu đề.'
  const linkProblem = linkUrlProblem(form.linkUrl)
  if (linkProblem) next.linkUrl = linkProblem
  if (!form.desktopImageFileId) next.desktopImageFileId = 'Chọn ảnh cho máy tính.'
  errors.value = next
  if (Object.keys(next).length) return
  saving.value = true
  const body = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    linkUrl: form.linkUrl.trim() || null,
    desktopImageFileId: form.desktopImageFileId!,
    mobileImageFileId: form.mobileImageFileId,
    isActive: form.isActive,
    sortOrder: form.sortOrder ?? 0,
  }
  try {
    if (editing.value) await bannersApi.update(editing.value.id, body)
    else await bannersApi.create(body)
    feedback.success('Đã lưu banner.')
    open.value = false
    void table.reload()
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    saving.value = false
  }
}

async function toggleActive(banner: Banner, isActive: boolean) {
  try {
    await bannersApi.update(banner.id, { isActive })
    void table.reload()
  } catch (error) {
    feedback.error(error)
  }
}

function remove(banner: Banner) {
  feedback.confirmDelete(
    `Xóa banner “${banner.title}”?`,
    'Banner sẽ biến mất khỏi trang chủ.',
    async () => {
      try {
        await bannersApi.remove(banner.id)
        feedback.success('Đã xóa banner.')
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
    title="Banner trang chủ"
    description="Banner mới mặc định ẩn. Liên kết nội bộ dùng đường dẫn của trang khách, ví dụ /bo-suu-tap/giang-sinh."
  >
    <template #actions>
      <Button @click="openForm(null)">
        <template #icon><Plus /></template>
        Thêm banner
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
    :scroll="{ x: 760 }"
    @change="table.onChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'image'">
        <Image
          :src="record.desktopImage.url"
          alt=""
          class="h-14 w-28 rounded border bg-muted"
          fit="cover"
        />
      </template>
      <template v-else-if="column.key === 'title'">
        {{ record.title }}
        <Typography v-if="record.description" variant="caption" ellipsis>{{
          record.description
        }}</Typography>
      </template>
      <template v-else-if="column.key === 'linkUrl'">
        <Typography variant="caption">{{ record.linkUrl ?? 'Không có' }}</Typography>
      </template>
      <template v-else-if="column.key === 'isActive'">
        <Switch
          :checked="record.isActive"
          :aria-label="`Hiện banner ${record.title}`"
          @change="(value) => toggleActive(record as Banner, Boolean(value))"
        />
      </template>
      <template v-else-if="column.key === 'actions'">
        <Flex justify="end" gap="small">
          <Button size="small" variant="default" @click="openForm(record as Banner)">Sửa</Button>
          <Button size="small" variant="text" @click="remove(record as Banner)">Xóa</Button>
        </Flex>
      </template>
    </template>
  </Table>

  <Modal
    v-model:open="open"
    :title="editing ? 'Sửa banner' : 'Thêm banner'"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="saving"
    width="640px"
    @ok="save"
  >
    <form novalidate @submit.prevent="save">
      <Flex vertical gap="middle">
        <FormField for="banner-title" label="Tiêu đề" :error="errors.title" required>
          <template #default="{ id }">
            <Input :id="id" v-model:value="form.title" :maxlength="200" />
          </template>
        </FormField>
        <FormField for="banner-description" label="Mô tả" :error="errors.description">
          <template #default="{ id }">
            <Textarea :id="id" v-model:value="form.description" :rows="2" :maxlength="1000" />
          </template>
        </FormField>
        <FormField
          for="banner-link"
          label="Liên kết"
          description="Để trống nếu banner không bấm được. Đường dẫn trong trang (/...) hoặc https://..."
          :error="errors.linkUrl"
        >
          <template #default="{ id }">
            <Input
              :id="id"
              v-model:value="form.linkUrl"
              :maxlength="2048"
              placeholder="/bo-suu-tap/giang-sinh"
            />
          </template>
        </FormField>
        <ImageUploadField
          id="banner-desktop"
          v-model="form.desktopImageFileId"
          label="Ảnh cho máy tính"
          description="Hiển thị từ 640 px trở lên; khung tỉ lệ khoảng 16:7."
          :current="editing?.desktopImage"
          :error="errors.desktopImageFileId"
          required
        />
        <ImageUploadField
          id="banner-mobile"
          v-model="form.mobileImageFileId"
          label="Ảnh cho điện thoại"
          description="Không bắt buộc; khung tỉ lệ khoảng 4:5. Để trống thì dùng ảnh máy tính."
          :current="editing?.mobileImage"
          :error="errors.mobileImageFileId"
          clearable
        />
        <Flex gap="large" wrap>
          <FormField for="banner-order" label="Thứ tự">
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
          <FormField for="banner-active" label="Hiện trên trang chủ">
            <template #default="{ id }">
              <Switch :id="id" v-model:checked="form.isActive" class="self-start" />
            </template>
          </FormField>
        </Flex>
        <button type="submit" hidden />
      </Flex>
    </form>
  </Modal>
</template>
