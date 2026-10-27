<script setup lang="ts">
import { computed, reactive, ref, shallowReactive, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Scan, Trash2 } from '@lucide/vue'
import { Input, Spin, Switch } from 'ant-design-vue'
import { Button, Col, EmptyState, Flex, FormField, Row, Select, Typography } from '@lituta/ui'
import { errorMessage, fieldErrors } from '../api/httpClient'
import { categoriesApi, designAssetsApi, designLayoutsApi, productsApi } from '../api/resources'
import type { Category, DesignAsset, DesignLayout } from '../api/types'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import LayoutCanvas, { type SlotPreview } from '../features/designer/LayoutCanvas.vue'
import { measureVisible, snapSlot, visibleAspect } from '../features/designer/layoutPreview'
import { round4 } from '../features/designer/zoneGeometry'
import CategoryTreeSelect from '../components/CategoryTreeSelect.vue'
import { categoryTree } from '../utils/categoryTree'

/*
 * Create or edit a set layout: pick a background, then add one rectangle per item and drag it to
 * where that item should go and how big it should be. Every rectangle is tied to a category; at
 * show time the customer's items of that category fill the rectangles in order, each fitted
 * inside without distortion. Rectangles are fractions (0–1) of the background image.
 *
 * Each rectangle shows a real product of its category (by default the first one with the designer
 * on; "Xem với" switches it), placed exactly as the client will place it, so the admin sees true
 * sizes and spacing and can check that every style of a category fits its rectangle. The preview
 * choice is not saved: customers' own products fill the rectangles.
 */
const props = defineProps<{ id?: string }>()
const router = useRouter()
const feedback = useFeedback()
const listPath = '/thiet-ke/mau-sap-xep'
const MAX_SLOTS = 10

interface SlotDraft {
  categoryId: string
  /** Product shown in the rectangle (preview only, not saved); default: see defaultProduct. */
  previewProductId?: string
  x: number
  y: number
  width: number
  height: number
}

const loading = ref(false)
const loadError = ref<string | null>(null)
const categories = shallowRef<Category[]>([])
const backgrounds = shallowRef<DesignAsset[]>([])
const saved = shallowRef<DesignLayout | null>(null)
const form = reactive({ name: '', backgroundId: '', isActive: false })
const slots = ref<SlotDraft[]>([])
const selected = ref(0)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const dirty = ref(false)

const { allowLeave } = useLeaveGuard(() => dirty.value)

function fill(layout: DesignLayout | null) {
  saved.value = layout
  form.name = layout?.name ?? ''
  form.backgroundId = layout?.backgroundId ?? backgrounds.value[0]?.id ?? ''
  form.isActive = layout?.isActive ?? false
  slots.value = layout?.slots.map((slot) => ({ ...slot })) ?? []
  selected.value = 0
  errors.value = {}
  dirty.value = false
}

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [categoryList, backgroundList, layout] = await Promise.all([
      categoriesApi.all(),
      designAssetsApi('backgrounds').all(),
      props.id ? designLayoutsApi.get(props.id) : Promise.resolve(null),
    ])
    categories.value = categoryList
    backgrounds.value = backgroundList
    fill(layout)
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

const background = computed(() => backgrounds.value.find((entry) => entry.id === form.backgroundId))
const backgroundOptions = computed(() =>
  backgrounds.value.map((entry) => ({
    label: entry.isActive ? entry.name : `${entry.name} (đang ẩn)`,
    value: entry.id,
  })),
)
// Any level: a rectangle of a parent category takes items of its whole branch.
const categoryTreeData = computed(() => categoryTree(categories.value))
const categoryName = (id: string) =>
  categories.value.find((category) => category.id === id)?.name ?? 'Chưa chọn danh mục'

/** "Áo 1", "Áo 2", "Yếm 1": the position among slots of the same category (fill order). */
function label(index: number): string {
  const slot = slots.value[index]
  if (!slot) return ''
  const sameBefore = slots.value
    .slice(0, index)
    .filter((entry) => entry.categoryId === slot.categoryId).length
  return `${categoryName(slot.categoryId)} ${sameBefore + 1}`
}

// --- preview products (shown in the rectangles; never saved with the layout) ---
// Colors of a product share one framing, so one preview per product is enough.
const productPreviews = shallowReactive(new Map<string, SlotPreview | null>())
const productRequests = new Map<
  string,
  Promise<{ preview: SlotPreview | null; designer: boolean }>
>()
/** Products of each category, offered in the "Xem với" select. */
const candidates = shallowReactive(new Map<string, { label: string; value: string }[]>())
/** Product shown by default for a category: the first with the designer on, else the first. */
const defaultProduct = shallowReactive(new Map<string, string | null>())
const requestedCategories = new Set<string>()

function loadProductPreview(productId: string) {
  let request = productRequests.get(productId)
  if (!request) {
    request = (async () => {
      try {
        const product = await productsApi.get(productId)
        const color = product.colors.find((entry) => entry.isActive) ?? product.colors[0]
        const preview = color
          ? {
              name: product.name,
              image: color.designImage,
              visible: await measureVisible(color.designImage.url),
            }
          : null
        productPreviews.set(productId, preview)
        return { preview, designer: product.designerEnabled }
      } catch {
        // Preview only: the rectangle stays an empty frame.
        productPreviews.set(productId, null)
        return { preview: null, designer: false }
      }
    })()
    productRequests.set(productId, request)
  }
  return request
}

async function loadCategory(categoryId: string) {
  if (requestedCategories.has(categoryId)) return
  requestedCategories.add(categoryId)
  try {
    const page = await productsApi.list({ categoryId, pageSize: 50 })
    candidates.set(
      categoryId,
      page.entries
        .filter((item) => item.colorCount > 0)
        .map((item) => ({ label: item.name, value: item.id })),
    )
    let fallback: string | null = null
    for (const option of candidates.get(categoryId) ?? []) {
      const { preview, designer } = await loadProductPreview(option.value)
      if (!preview) continue
      fallback ??= option.value
      if (designer) {
        fallback = option.value
        break
      }
    }
    defaultProduct.set(categoryId, fallback)
  } catch {
    defaultProduct.set(categoryId, null)
  }
}

watch(
  () => slots.value.map((slot) => slot.categoryId),
  (ids) => ids.filter(Boolean).forEach((id) => void loadCategory(id)),
  { immediate: true },
)

const previewProductOf = (slot: SlotDraft) =>
  slot.previewProductId ?? defaultProduct.get(slot.categoryId) ?? null

const previews = computed(() =>
  slots.value.map((slot) => {
    const productId = previewProductOf(slot)
    return productId ? (productPreviews.get(productId) ?? null) : null
  }),
)

function setPreviewProduct(slot: SlotDraft, productId: string) {
  slot.previewProductId = productId
  void loadProductPreview(productId)
}

function setCategory(slot: SlotDraft) {
  // The preview choice belongs to the old category.
  slot.previewProductId = undefined
  markDirty()
}
const bgSize = computed(() =>
  background.value
    ? { width: background.value.image.width, height: background.value.image.height }
    : null,
)

/** Shrinks every rectangle to the product it shows, keeping its centre. */
function snapAll() {
  if (!bgSize.value) return
  slots.value.forEach((slot, index) => {
    const preview = previews.value[index]
    if (preview)
      Object.assign(
        slot,
        snapSlot(slot, visibleAspect(preview.image, preview.visible), bgSize.value!),
      )
  })
  markDirty()
}

function markDirty() {
  dirty.value = true
}

function addSlot() {
  if (slots.value.length >= MAX_SLOTS) return
  const n = slots.value.length
  slots.value.push({
    categoryId: slots.value[selected.value]?.categoryId ?? categories.value[0]?.id ?? '',
    x: round4(0.05 + (n % 5) * 0.18),
    y: round4(0.3 + Math.floor(n / 5) * 0.3),
    width: 0.16,
    height: 0.25,
  })
  selected.value = slots.value.length - 1
  markDirty()
}

function removeSlot(index: number) {
  slots.value.splice(index, 1)
  selected.value = Math.max(0, Math.min(selected.value, slots.value.length - 1))
  markDirty()
}

function validate(): Record<string, string> {
  const next: Record<string, string> = {}
  if (!form.name.trim()) next.name = 'Nhập tên mẫu.'
  if (!form.backgroundId) next.backgroundId = 'Chọn nền.'
  if (slots.value.length === 0) next.slots = 'Thêm ít nhất một vị trí.'
  else if (slots.value.some((slot) => !slot.categoryId))
    next.slots = 'Chọn danh mục cho mọi vị trí.'
  return next
}

async function save() {
  errors.value = validate()
  if (Object.keys(errors.value).length) return
  saving.value = true
  const body = {
    name: form.name.trim(),
    backgroundId: form.backgroundId,
    isActive: form.isActive,
    slots: slots.value.map((slot) => ({
      categoryId: slot.categoryId,
      x: round4(slot.x),
      y: round4(slot.y),
      width: round4(slot.width),
      height: round4(slot.height),
    })),
  }
  try {
    if (props.id) fill(await designLayoutsApi.update(props.id, body))
    else await designLayoutsApi.create(body)
    feedback.success('Đã lưu mẫu.')
    allowLeave()
    void router.push(listPath)
  } catch (error) {
    errors.value = fieldErrors(error)
    feedback.error(error)
  } finally {
    saving.value = false
  }
}

function reset() {
  fill(saved.value)
}
</script>

<template>
  <PageHeader
    :title="id ? 'Sửa mẫu sắp xếp' : 'Thêm mẫu sắp xếp'"
    description="Kéo từng khung đến chỗ muốn đặt món, kéo góc dưới phải để đổi cỡ. Món được đặt vừa trong khung, không bị méo."
    :back="{ to: listPath, label: 'Mẫu sắp xếp' }"
  />

  <Spin :spinning="loading">
    <EmptyState v-if="loadError" title="Chưa tải được mẫu" :description="loadError">
      <template #action>
        <Button @click="load()">Thử lại</Button>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!loading && backgrounds.length === 0"
      title="Chưa có nền"
      description="Thêm ít nhất một nền xem cả bộ trước khi tạo mẫu sắp xếp."
    />

    <Row v-else :gutter="[24, 24]">
      <Col :xs="24" :lg="14">
        <LayoutCanvas
          v-model:selected="selected"
          :image="background?.image ?? null"
          :slots="slots"
          :label-of="label"
          :previews="previews"
          @change="markDirty"
        />
      </Col>

      <Col :xs="24" :lg="10">
        <form novalidate @submit.prevent="save">
          <Flex vertical gap="large">
            <section aria-labelledby="layout-info-heading" class="rounded-lg border p-4">
              <Flex vertical gap="middle">
                <Typography id="layout-info-heading" as="h2" variant="subheading">
                  Thông tin
                </Typography>
                <FormField for="layout-name" label="Tên mẫu" :error="errors.name" required>
                  <template #default="{ id: fieldId }">
                    <Input
                      :id="fieldId"
                      v-model:value="form.name"
                      :maxlength="100"
                      placeholder="2 áo, 2 yếm, 1 mũ"
                      @change="markDirty"
                    />
                  </template>
                </FormField>
                <FormField
                  for="layout-background"
                  label="Nền"
                  :error="errors.backgroundId"
                  description="Đổi nền giữ nguyên vị trí các khung."
                  required
                >
                  <template #default="{ id: fieldId }">
                    <Select
                      :id="fieldId"
                      v-model="form.backgroundId"
                      :options="backgroundOptions"
                      @update:model-value="markDirty"
                    />
                  </template>
                </FormField>
                <FormField
                  for="layout-active"
                  label="Hiện cho khách"
                  description="Mỗi nền chỉ có một mẫu hiện cho cùng một bộ danh mục."
                >
                  <template #default="{ id: fieldId }">
                    <Switch
                      :id="fieldId"
                      v-model:checked="form.isActive"
                      class="self-start"
                      @change="markDirty"
                    />
                  </template>
                </FormField>
              </Flex>
            </section>

            <section aria-labelledby="layout-slots-heading" class="rounded-lg border p-4">
              <Flex vertical gap="middle">
                <Flex align="center" justify="space-between" gap="small">
                  <Typography id="layout-slots-heading" as="h2" variant="subheading">
                    Vị trí ({{ slots.length }}/{{ MAX_SLOTS }})
                  </Typography>
                  <Flex gap="small" wrap>
                    <Button
                      size="small"
                      variant="default"
                      :disabled="!previews.some(Boolean)"
                      @click="snapAll"
                    >
                      <template #icon><Scan /></template>
                      Khớp khung theo sản phẩm
                    </Button>
                    <Button size="small" :disabled="slots.length >= MAX_SLOTS" @click="addSlot">
                      <template #icon><Plus /></template>
                      Thêm vị trí
                    </Button>
                  </Flex>
                </Flex>
                <Typography variant="caption">
                  Mỗi khung hiện một sản phẩm thật của danh mục, đặt đúng như khách sẽ thấy. Kéo góc
                  để đổi cỡ (giữ tỉ lệ sản phẩm); “Khớp khung” thu khung sát sản phẩm để dễ xếp gần
                  nhau.
                </Typography>
                <Typography v-if="errors.slots" role="alert" class="text-destructive">
                  {{ errors.slots }}
                </Typography>
                <Typography v-if="slots.length === 0" variant="caption">
                  Mỗi món trong bộ quà cần một vị trí. Các món cùng danh mục lấp vào khung theo thứ
                  tự bên dưới.
                </Typography>
                <ul class="flex flex-col gap-2">
                  <li
                    v-for="(slot, index) in slots"
                    :key="index"
                    class="rounded-md border p-2"
                    :class="index === selected ? 'border-primary bg-primary/5' : ''"
                  >
                    <Flex align="center" gap="small">
                      <Button
                        variant="text"
                        size="small"
                        :aria-pressed="index === selected"
                        @click="selected = index"
                      >
                        {{ index + 1 }}
                      </Button>
                      <CategoryTreeSelect
                        v-model="slot.categoryId"
                        :tree-data="categoryTreeData"
                        :aria-label="`Danh mục của vị trí ${index + 1}`"
                        @update:model-value="setCategory(slot)"
                      />
                      <Button
                        variant="text"
                        size="small"
                        :aria-label="`Xóa vị trí ${index + 1}`"
                        @click="removeSlot(index)"
                      >
                        <template #icon><Trash2 /></template>
                      </Button>
                    </Flex>
                    <Flex
                      v-if="(candidates.get(slot.categoryId)?.length ?? 0) > 0"
                      align="center"
                      gap="small"
                      class="mt-2 ps-10"
                    >
                      <Typography as="span" variant="caption" class="shrink-0">Xem với</Typography>
                      <Select
                        :model-value="previewProductOf(slot) ?? undefined"
                        :options="candidates.get(slot.categoryId)!"
                        :aria-label="`Sản phẩm xem trước ở vị trí ${index + 1}`"
                        size="small"
                        @update:model-value="(value) => setPreviewProduct(slot, String(value))"
                      />
                    </Flex>
                  </li>
                </ul>
              </Flex>
            </section>

            <FormFooter
              submit-label="Lưu mẫu"
              :saving="saving"
              :dirty="dirty"
              :cancel-to="id ? undefined : listPath"
              @submit="save"
              @reset="reset"
            />
          </Flex>
        </form>
      </Col>
    </Row>
  </Spin>
</template>
