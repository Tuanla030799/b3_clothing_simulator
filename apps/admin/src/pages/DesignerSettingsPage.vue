<script setup lang="ts">
import { computed, reactive, ref, shallowRef } from 'vue'
import { Save } from '@lucide/vue'
import { InputNumber, Spin, Table, type TableColumnType } from 'ant-design-vue'
import { Button, EmptyState, Flex, FormField, Select, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { categoriesApi, designAssetsApi, designerApi } from '../api/resources'
import type { Category, DesignAsset, DesignerSettings } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'

/*
 * Selection limits of the design tool (keyed by category id, never by name) and the default
 * background. The settings row is created by the API seed; without it the API answers 503.
 */
const feedback = useFeedback()
const loading = ref(false)
const loadError = ref<string | null>(null)
const settings = shallowRef<DesignerSettings | null>(null)
const categories = shallowRef<Category[]>([])
const backgrounds = shallowRef<DesignAsset[]>([])
const form = reactive({ maxItems: 10 as number | undefined, defaultBackgroundId: 'none' })
const limits = ref<Record<string, number | undefined>>({})
const savingSettings = ref(false)
const savingLimit = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [current, categoryList, backgroundList] = await Promise.all([
      designerApi.settings(),
      categoriesApi.all(),
      designAssetsApi('backgrounds').all(),
    ])
    settings.value = current
    categories.value = categoryList
    backgrounds.value = backgroundList
    form.maxItems = current.maxItems
    form.defaultBackgroundId = current.defaultBackgroundId ?? 'none'
    limits.value = Object.fromEntries(
      categoryList.map((category) => [
        category.id,
        current.categoryLimits.find((limit) => limit.categoryId === category.id)?.maxItems,
      ]),
    )
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
void load()

// Only active backgrounds can be the default.
const backgroundOptions = computed(() => [
  { label: 'Không chọn (dùng nền đầu tiên)', value: 'none' },
  ...backgrounds.value
    .filter((background) => background.isActive)
    .map((background) => ({ label: background.name, value: background.id })),
])

async function saveSettings() {
  savingSettings.value = true
  try {
    settings.value = await designerApi.updateSettings({
      maxItems: form.maxItems,
      defaultBackgroundId: form.defaultBackgroundId === 'none' ? null : form.defaultBackgroundId,
    })
    feedback.success('Đã lưu cài đặt.')
  } catch (error) {
    feedback.error(error)
  } finally {
    savingSettings.value = false
  }
}

const savedLimit = (categoryId: string) =>
  settings.value?.categoryLimits.find((limit) => limit.categoryId === categoryId)?.maxItems

async function saveLimit(category: Category) {
  // A cleared number input gives null: no limit of its own.
  const value = limits.value[category.id] ?? undefined
  savingLimit.value = category.id
  try {
    if (value === undefined) await designerApi.removeCategoryLimit(category.id)
    else await designerApi.setCategoryLimit(category.id, value)
    settings.value = await designerApi.settings()
    feedback.success(value === undefined ? 'Đã bỏ giới hạn.' : 'Đã lưu giới hạn.')
  } catch (error) {
    feedback.error(error)
  } finally {
    savingLimit.value = null
  }
}

const columns: TableColumnType<Category>[] = [
  { title: 'Danh mục', key: 'name' },
  { title: 'Tối đa trong một bộ', key: 'limit', width: 220 },
  { title: '', key: 'actions', width: 120, align: 'right' },
]
</script>

<template>
  <PageHeader
    title="Giới hạn bộ quà"
    description="Số món tối đa khách chọn trong công cụ thiết kế; món trùng được tính riêng."
  />

  <Spin :spinning="loading">
    <EmptyState v-if="loadError" title="Chưa tải được cài đặt" :description="loadError">
      <template #action>
        <Button @click="load()">Thử lại</Button>
      </template>
    </EmptyState>

    <Flex v-else-if="settings" vertical gap="large">
      <section aria-labelledby="settings-heading" class="max-w-xl rounded-xl border bg-card p-4">
        <form @submit.prevent="saveSettings">
          <Flex vertical gap="middle">
            <Typography id="settings-heading" as="h2" variant="subheading">Chung</Typography>
            <FormField
              for="settings-max-items"
              label="Tổng số món tối đa"
              description="1–10, không nhỏ hơn giới hạn của danh mục nào."
            >
              <template #default="{ id }">
                <InputNumber
                  :id="id"
                  v-model:value="form.maxItems"
                  :min="1"
                  :max="10"
                  :precision="0"
                />
              </template>
            </FormField>
            <FormField
              for="settings-background"
              label="Nền mặc định khi xem cả bộ"
              description="Chỉ chọn được nền đang hiện."
            >
              <template #default="{ id }">
                <Select :id="id" v-model="form.defaultBackgroundId" :options="backgroundOptions" />
              </template>
            </FormField>
            <Button html-type="submit" :loading="savingSettings" class="self-start">
              <template #icon><Save /></template>
              Lưu
            </Button>
          </Flex>
        </form>
      </section>

      <section aria-labelledby="limits-heading" class="rounded-xl border bg-card p-4">
        <Flex vertical gap="middle">
          <Flex vertical :gap="4">
            <Typography id="limits-heading" as="h2" variant="subheading">
              Giới hạn theo danh mục
            </Typography>
            <Typography variant="caption">
              Để trống = không giới hạn riêng. Ví dụ: tối đa 3 món cho danh mục áo.
            </Typography>
          </Flex>
          <Table row-key="id" :columns="columns" :data-source="categories" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">{{ record.name }}</template>
              <template v-else-if="column.key === 'limit'">
                <InputNumber
                  v-model:value="limits[record.id]"
                  :min="1"
                  :max="settings.maxItems"
                  :precision="0"
                  placeholder="Không giới hạn"
                  :aria-label="`Giới hạn ${record.name}`"
                  class="w-40"
                />
              </template>
              <template v-else-if="column.key === 'actions'">
                <Button
                  size="small"
                  variant="default"
                  :loading="savingLimit === record.id"
                  :disabled="(limits[record.id] ?? undefined) === savedLimit(record.id)"
                  @click="saveLimit(record as Category)"
                >
                  Lưu
                </Button>
              </template>
            </template>
          </Table>
        </Flex>
      </section>
    </Flex>
  </Spin>
</template>
