<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { CircleCheck, CircleX, List, PenTool, Plus, Trash2 } from '@lucide/vue'
import { Input, InputNumber, Spin, Switch, Table, Tag, type TableColumnType } from 'ant-design-vue'
import { Button, Col, EmptyState, Flex, Image, Link, Row, Typography } from '@lituta/ui'
import { errorMessage } from '../api/httpClient'
import { categoriesApi, productsApi } from '../api/resources'
import type { Category, Product, ProductColor, ProductSize } from '../api/types'
import FormFooter from '../components/FormFooter.vue'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { useLeaveGuard } from '../composables/useLeaveGuard'
import ColorSwatch from '../features/catalog/ColorSwatch.vue'
import ProductForm from '../features/catalog/ProductForm.vue'
import { isShownToCustomers } from '../utils/categoryTree'
import { formatDateTime, formatPrice } from '../utils/format'

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
// The category and every ancestor must be active (undefined while the categories load).
const categoryActive = computed(() =>
  product.value === null || categories.value.length === 0
    ? undefined
    : isShownToCustomers(categories.value, product.value.category.id),
)
// What the API checks before a product can be activated.
const publishChecks = computed(() => [
  {
    label:
      categoryActive.value === false
        ? `Danh mục “${product.value?.category.name}” (hoặc danh mục cha) đang ẩn`
        : 'Danh mục đang hiện',
    ok: categoryActive.value !== false,
  },
  {
    label: activeColors.value === 0 ? 'Chưa có màu đang bán' : `${activeColors.value} màu đang bán`,
    ok: activeColors.value > 0,
  },
])
const canPublish = computed(() => publishChecks.value.every((check) => check.ok))

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
        allowLeave()
        void router.push('/san-pham')
      } catch (error) {
        feedback.error(error)
      }
    },
  )
}

// --- information ---
const infoForm = ref<InstanceType<typeof ProductForm> | null>(null)
const { allowLeave } = useLeaveGuard(() => Boolean(infoForm.value?.dirty))
function infoSaved(saved: Product) {
  product.value = { ...product.value!, ...saved }
  allowLeave()
  void router.push('/san-pham')
}

// --- colors ---
const colorPath = (color: ProductColor | null) =>
  `/san-pham/${props.id}/mau/${color ? color.id : 'moi'}`

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
  { title: '', key: 'actions', width: 140, align: 'right', fixed: 'right' },
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
      <template #actions>
        <Button variant="default" @click="router.push('/san-pham')">
          <template #icon><List /></template>
          Về danh sách sản phẩm
        </Button>
      </template>
    </PageHeader>

    <EmptyState v-if="loadError" title="Chưa tải được sản phẩm" :description="loadError">
      <template #action>
        <Button @click="load()">Thử lại</Button>
      </template>
    </EmptyState>

    <Row v-else-if="product" :gutter="[24, 24]">
      <Col :xs="24" :lg="16">
        <Flex vertical gap="large">
          <section aria-labelledby="info-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="info-heading" as="h2" variant="subheading">Thông tin</Typography>
              <ProductForm
                ref="infoForm"
                :product="product"
                :categories="categories"
                @saved="infoSaved"
              />
              <FormFooter
                submit-label="Lưu thông tin"
                :saving="infoForm?.saving"
                :dirty="infoForm?.dirty"
                @submit="infoForm?.save()"
                @reset="infoForm?.reset()"
              />
            </Flex>
          </section>
          <section aria-labelledby="colors-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Flex align="center" justify="space-between" gap="small">
                <Typography id="colors-heading" as="h2" variant="subheading">
                  Màu ({{ product.colors.length }})
                </Typography>
                <Button size="small" @click="router.push(colorPath(null))">
                  <template #icon><Plus /></template>
                  Thêm màu
                </Button>
              </Flex>
              <Table
                row-key="id"
                :columns="colorColumns"
                :data-source="product.colors"
                :pagination="false"
                :scroll="{ x: 520 }"
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
                      <ColorSwatch :hex-code="record.hexCode" />
                      <Link :as="RouterLink" :to="colorPath(record as ProductColor)">{{
                        record.name
                      }}</Link>
                    </Flex>
                  </template>
                  <template v-else-if="column.key === 'isActive'">
                    <Tag :color="record.isActive ? 'green' : 'default'">{{
                      record.isActive ? 'Có' : 'Không'
                    }}</Tag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <Flex justify="end" gap="small">
                      <Button
                        size="small"
                        variant="default"
                        :aria-label="`Sửa màu ${record.name}`"
                        @click="router.push(colorPath(record as ProductColor))"
                        >Sửa</Button
                      >
                      <Button
                        size="small"
                        variant="text"
                        @click="removeColor(record as ProductColor)"
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
                    size="small"
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
      </Col>

      <Col :xs="24" :lg="8">
        <Flex vertical gap="large" class="lg:sticky lg:top-4">
          <section aria-labelledby="publish-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="publish-heading" as="h2" variant="subheading">Bán hàng</Typography>
              <Flex align="center" gap="small">
                <Switch
                  id="product-active"
                  :checked="product.isActive"
                  :loading="publishing"
                  :disabled="!product.isActive && !canPublish"
                  @change="(value) => setActive(Boolean(value))"
                />
                <label for="product-active">
                  <Typography as="span">{{
                    product.isActive ? 'Đang bán' : 'Nháp / ẩn'
                  }}</Typography>
                </label>
              </Flex>
              <Flex as="ul" vertical gap="small" aria-label="Điều kiện bật bán">
                <li v-for="check in publishChecks" :key="check.label">
                  <Flex align="center" gap="small">
                    <CircleCheck
                      v-if="check.ok"
                      class="size-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <CircleX v-else class="size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <Typography as="span" variant="caption">
                      <span class="sr-only">{{ check.ok ? 'Đạt:' : 'Chưa đạt:' }}</span>
                      {{ check.label }}
                    </Typography>
                  </Flex>
                </li>
              </Flex>
              <Typography variant="caption">
                {{ product.sizes.length ? `${product.sizes.length} size` : 'Không cần chọn size' }}
                · Cập nhật {{ formatDateTime(product.updatedAt) }}
              </Typography>
            </Flex>
          </section>

          <section aria-labelledby="design-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="design-heading" as="h2" variant="subheading"
                >Thiết kế thêu</Typography
              >
              <Flex wrap gap="small">
                <Tag :color="product.designerEnabled ? 'green' : 'default'">
                  {{ product.designerEnabled ? 'Khách đang thiết kế được' : 'Đang tắt' }}
                </Tag>
                <Tag>Tỉ lệ {{ product.displayScale }}</Tag>
              </Flex>
              <Typography variant="caption">
                Vùng thêu đặt một lần cho sản phẩm và dùng chung cho mọi màu; ảnh thiết kế các màu
                cần cùng khung.
              </Typography>
              <Button
                variant="default"
                class="self-start"
                :disabled="product.colors.length === 0"
                @click="router.push(`/san-pham/${id}/thiet-ke`)"
              >
                <template #icon><PenTool /></template>
                Cấu hình vùng thêu
              </Button>
              <Typography v-if="product.colors.length === 0" variant="caption">
                Thêm màu (có ảnh thiết kế) trước.
              </Typography>
            </Flex>
          </section>

          <section aria-labelledby="danger-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="danger-heading" as="h2" variant="subheading">Xóa sản phẩm</Typography>
              <Typography variant="caption">
                Xóa cả màu, size, vùng thêu và khỏi mọi bộ sưu tập. Đơn hàng đã đặt không bị ảnh
                hưởng.
              </Typography>
              <Button variant="destructive" class="self-start" @click="removeProduct">
                <template #icon><Trash2 /></template>
                Xóa sản phẩm
              </Button>
            </Flex>
          </section>
        </Flex>
      </Col>
    </Row>
  </Spin>
</template>
