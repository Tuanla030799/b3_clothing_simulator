<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Pencil, Plus, Trash2 } from '@lucide/vue'
import { Input, InputNumber, Spin, Switch, Table, Tag, type TableColumnType } from 'ant-design-vue'
import { Button, EmptyState, Flex, Image, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { categoriesApi, productsApi } from '../api/resources'
import type { Category, Product, ProductColor, ProductSize } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import ColorFormModal from '../features/catalog/ColorFormModal.vue'
import ProductFormModal from '../features/catalog/ProductFormModal.vue'
import ColorDesignerDrawer from '../features/designer/ColorDesignerDrawer.vue'
import { formatPrice } from '../utils/format'

const props = defineProps<{ id: string }>()
const router = useRouter()
const feedback = useFeedback()

const product = shallowRef<Product | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const categories = shallowRef<Category[]>([])

async function load() {
  loading.value = true
  loadError.value = null
  try {
    product.value = await productsApi.get(props.id)
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })
categoriesApi
  .all()
  .then((list) => (categories.value = list))
  .catch((error) => feedback.error(error))

const activeColors = computed(
  () => product.value?.colors.filter((color) => color.isActive).length ?? 0,
)
const categoryActive = computed(
  () => categories.value.find((category) => category.id === product.value?.category.id)?.isActive,
)

// --- publishing ---
const publishing = ref(false)
async function setActive(isActive: boolean) {
  if (!product.value) return
  publishing.value = true
  try {
    product.value = await productsApi.update(product.value.id, { isActive })
    feedback.success(isActive ? 'Sản phẩm đang bán.' : 'Đã ẩn sản phẩm.')
  } catch (error) {
    feedback.error(error)
  } finally {
    publishing.value = false
  }
}

function removeProduct() {
  if (!product.value) return
  const current = product.value
  feedback.confirmDelete(
    `Xóa sản phẩm “${current.name}”?`,
    'Xóa cả màu, size, vùng thêu và khỏi mọi bộ sưu tập. Đơn hàng đã đặt không bị ảnh hưởng.',
    async () => {
      try {
        await productsApi.remove(current.id)
        feedback.success('Đã xóa sản phẩm.')
        void router.push('/san-pham')
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

// --- information ---
const editingInfo = ref(false)

// --- colors ---
const colorModalOpen = ref(false)
const editingColor = ref<ProductColor | null>(null)
const designerColor = ref<ProductColor | null>(null)

function openColor(color: ProductColor | null) {
  editingColor.value = color
  colorModalOpen.value = true
}

function removeColor(color: ProductColor) {
  const productId = props.id
  feedback.confirmDelete(
    `Xóa màu “${color.name}”?`,
    'Xóa cả vùng thêu của màu. Không xóa được màu đang bán cuối cùng của sản phẩm đang bán.',
    async () => {
      try {
        await productsApi.removeColor(productId, color.id)
        feedback.success('Đã xóa màu.')
        void load()
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

const colorColumns: TableColumnType<ProductColor>[] = [
  { title: 'Ảnh', key: 'images', width: 150 },
  { title: 'Màu', key: 'name' },
  { title: 'Đang bán', key: 'isActive', width: 100 },
  { title: 'Thiết kế', key: 'designer', width: 150 },
  { title: '', key: 'actions', width: 260, align: 'right' },
]

// --- sizes ---
const newSize = ref('')
const addingSize = ref(false)
const sizeDrafts = ref<Record<string, { name: string; sortOrder: number | undefined }>>({})
watch(product, (value) => {
  sizeDrafts.value = Object.fromEntries(
    (value?.sizes ?? []).map((size) => [size.id, { name: size.name, sortOrder: size.sortOrder }]),
  )
})

async function addSize() {
  const name = newSize.value.trim()
  if (!name) return
  addingSize.value = true
  try {
    await productsApi.addSize(props.id, { name, sortOrder: product.value?.sizes.length ?? 0 })
    newSize.value = ''
    void load()
  } catch (error) {
    feedback.error(error)
  } finally {
    addingSize.value = false
  }
}

async function saveSize(size: ProductSize) {
  const draft = sizeDrafts.value[size.id]
  if (!draft || !draft.name.trim()) return
  try {
    await productsApi.updateSize(props.id, size.id, {
      name: draft.name.trim(),
      sortOrder: draft.sortOrder ?? 0,
    })
    feedback.success('Đã lưu size.')
    void load()
  } catch (error) {
    feedback.error(error)
  }
}

function removeSize(size: ProductSize) {
  const productId = props.id
  feedback.confirmDelete(
    `Xóa size “${size.name}”?`,
    'Khách sẽ không chọn được size này nữa.',
    async () => {
      try {
        await productsApi.removeSize(productId, size.id)
        void load()
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}
</script>

<template>
  <Spin :spinning="loading && !product">
    <PageHeader
      :title="product?.name ?? 'Sản phẩm'"
      :description="
        product
          ? `${product.category.name} · ${formatPrice(product.price)} · /${product.slug}`
          : undefined
      "
      :back="{ to: '/san-pham', label: 'Danh sách sản phẩm' }"
    >
      <template v-if="product" #actions>
        <Flex align="center" gap="small">
          <Switch
            :checked="product.isActive"
            :loading="publishing"
            aria-label="Đang bán"
            @change="(value) => setActive(Boolean(value))"
          />
          <Typography as="span" variant="body">{{
            product.isActive ? 'Đang bán' : 'Nháp / ẩn'
          }}</Typography>
        </Flex>
        <Button variant="default" @click="editingInfo = true">
          <template #icon><Pencil /></template>
          Sửa thông tin
        </Button>
        <Button variant="text" @click="removeProduct">
          <template #icon><Trash2 /></template>
          Xóa
        </Button>
      </template>
    </PageHeader>

    <EmptyState v-if="loadError" title="Chưa tải được sản phẩm" :description="loadError">
      <template #action>
        <Button @click="load()">Thử lại</Button>
      </template>
    </EmptyState>

    <Flex v-else-if="product" vertical gap="large">
      <Typography
        v-if="!product.isActive && (activeColors === 0 || categoryActive === false)"
        variant="caption"
        role="note"
      >
        Để bật bán cần: danh mục đang hiện
        <template v-if="categoryActive === false">
          (danh mục “{{ product.category.name }}” đang ẩn)</template
        >
        và ít nhất một màu đang bán<template v-if="activeColors === 0"> (chưa có)</template>.
      </Typography>

      <section aria-labelledby="colors-heading" class="rounded-xl border bg-card p-4">
        <Flex vertical gap="middle">
          <Flex align="center" justify="space-between" gap="small">
            <Typography id="colors-heading" as="h2" variant="subheading">
              Màu ({{ product.colors.length }})
            </Typography>
            <Button size="small" @click="openColor(null)">
              <template #icon><Plus /></template>
              Thêm màu
            </Button>
          </Flex>
          <Table
            row-key="id"
            :columns="colorColumns"
            :data-source="product.colors"
            :pagination="false"
            :scroll="{ x: 760 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'images'">
                <Flex gap="small">
                  <Image
                    :src="record.displayImage.url"
                    alt="Ảnh hiển thị"
                    class="size-14 rounded border bg-muted"
                  />
                  <Image
                    :src="record.designImage.url"
                    alt="Ảnh thiết kế"
                    class="size-14 rounded border bg-muted"
                  />
                </Flex>
              </template>
              <template v-else-if="column.key === 'name'">
                <Flex align="center" gap="small">
                  <span
                    v-if="record.hexCode"
                    class="size-4 shrink-0 rounded-full border"
                    :style="{ backgroundColor: record.hexCode }"
                    aria-hidden="true"
                  />
                  <span>{{ record.name }}</span>
                </Flex>
                <Typography variant="caption">{{ record.hexCode ?? 'Không có mã màu' }}</Typography>
              </template>
              <template v-else-if="column.key === 'isActive'">
                <Tag :color="record.isActive ? 'green' : 'default'">{{
                  record.isActive ? 'Có' : 'Không'
                }}</Tag>
              </template>
              <template v-else-if="column.key === 'designer'">
                <Tag :color="record.designerEnabled ? 'green' : 'default'">
                  {{ record.designerEnabled ? 'Đang bật' : 'Tắt' }}
                </Tag>
                <Typography variant="caption">Tỉ lệ {{ record.displayScale }}</Typography>
              </template>
              <template v-else-if="column.key === 'actions'">
                <Flex justify="end" gap="small" wrap>
                  <Button size="small" @click="designerColor = record as ProductColor"
                    >Vùng thêu</Button
                  >
                  <Button size="small" variant="default" @click="openColor(record as ProductColor)"
                    >Sửa</Button
                  >
                  <Button size="small" variant="text" @click="removeColor(record as ProductColor)"
                    >Xóa</Button
                  >
                </Flex>
              </template>
            </template>
          </Table>
        </Flex>
      </section>

      <section aria-labelledby="sizes-heading" class="rounded-xl border bg-card p-4">
        <Flex vertical gap="middle">
          <Flex vertical :gap="4">
            <Typography id="sizes-heading" as="h2" variant="subheading">
              Size ({{ product.sizes.length }})
            </Typography>
            <Typography variant="caption">
              Dùng chung cho mọi màu. Không có size nào nghĩa là khách không cần chọn size.
            </Typography>
          </Flex>
          <Flex as="ul" vertical gap="small">
            <li v-for="size in product.sizes" :key="size.id">
              <Flex v-if="sizeDrafts[size.id]" align="center" gap="small" wrap>
                <Input
                  v-model:value="sizeDrafts[size.id]!.name"
                  :maxlength="50"
                  :aria-label="`Tên size ${size.name}`"
                  class="w-40"
                />
                <InputNumber
                  v-model:value="sizeDrafts[size.id]!.sortOrder"
                  :min="0"
                  :max="1000000"
                  :precision="0"
                  :aria-label="`Thứ tự size ${size.name}`"
                  class="w-24"
                />
                <Button size="small" variant="default" @click="saveSize(size)">Lưu</Button>
                <Button size="small" variant="text" @click="removeSize(size)">Xóa</Button>
              </Flex>
            </li>
          </Flex>
          <form class="max-w-sm" @submit.prevent="addSize">
            <Flex gap="small">
              <Input
                v-model:value="newSize"
                placeholder="Ví dụ: 0-3 tháng"
                :maxlength="50"
                aria-label="Size mới"
              />
              <Button
                html-type="submit"
                size="middle"
                :loading="addingSize"
                :disabled="!newSize.trim()"
              >
                Thêm size
              </Button>
            </Flex>
          </form>
        </Flex>
      </section>
    </Flex>

    <ProductFormModal
      v-model:open="editingInfo"
      :product="product"
      :categories="categories"
      @saved="(saved) => (product = { ...product!, ...saved })"
    />
    <ColorFormModal
      v-model:open="colorModalOpen"
      :product-id="id"
      :color="editingColor"
      @saved="load"
    />
    <ColorDesignerDrawer
      :product-id="id"
      :color="designerColor"
      @close="designerColor = null"
      @changed="load"
    />
  </Spin>
</template>
