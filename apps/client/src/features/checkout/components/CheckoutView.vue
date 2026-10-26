<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CloudOff, Send } from '@lucide/vue'
import {
  Button,
  Col,
  EmptyState,
  Flex,
  FormField,
  Image,
  Row,
  Select,
  Typography,
} from '@lituta/ui'
import { ApiError } from '../../../api/http'
import { publicCatalog, type PublicProduct } from '../../../api/publicCatalog'
import { useRemoteData } from '../../../api/useRemoteData'
import { useCart } from '../../cart/cart'
import { formatPrice } from '../../catalog/formatPrice'
import { useCategoryName } from '../../designer/catalog'
import PictureNotice from '../../designer/components/PictureNotice.vue'
import { injectComposition } from '../../designer/useComposition'
import { injectDesigns } from '../../designer/useDesigns'
import { injectExport } from '../../designer/useExport'
import { injectSelection } from '../../designer/useSelection'
import {
  CUSTOMER_LIMITS,
  customerErrorsFromApi,
  validateCustomer,
  type CustomerErrors,
  type CustomerForm,
} from '../customer'
import { saveLastOrder } from '../guestStorage'
import { CheckoutError, type createOrderSubmitter, type SubmitStep } from '../submitOrder'

/*
 * "Đặt hàng" inside the design tool: choose sizes, enter contact details and send the set with
 * its design as a contact request (no payment). The set stays in the designer state, so going
 * back keeps everything. Sizes and prices come from the product pages of the API.
 */
const props = defineProps<{ submitter: ReturnType<typeof createOrderSubmitter> }>()
const emit = defineEmits<{ back: []; ordered: [] }>()

const router = useRouter()
const selection = injectSelection()
const designs = injectDesigns()
const composition = injectComposition()
const exporter = injectExport()
const categoryName = useCategoryName()

// Details (sizes, price) of every product in the set, read once when checkout opens.
const slugs = [...new Set(selection.entries.value.map((entry) => entry.product.productSlug))]
const details = useRemoteData(async (signal) => {
  const products = await Promise.all(slugs.map((slug) => publicCatalog.product(slug, signal)))
  return new Map<string, PublicProduct>(products.map((product) => [product.slug, product]))
})

const sizes = reactive<Record<string, string | undefined>>({})
const sizeErrors = reactive<Record<string, string | undefined>>({})

// Sizes chosen on the product pages are kept in the cart: start from them (when the product still
// offers them) and keep the cart in step with changes made here. Collection items are not in the
// cart, so for them both are no-ops.
const cart = useCart()
watch(
  details.data,
  (loaded) => {
    if (!loaded) return
    for (const entry of selection.entries.value) {
      const id = entry.item.instanceId
      const sizeId = cart.items.value.find((item) => item.id === id)?.sizeId
      const offered = loaded
        .get(entry.product.productSlug)
        ?.sizes.some((size) => size.id === sizeId)
      if (sizeId && offered && !sizes[id]) sizes[id] = sizeId
    }
  },
  { immediate: true },
)
function chooseSize(instanceId: string, sizeId: unknown) {
  sizeErrors[instanceId] = undefined
  cart.setSize(instanceId, typeof sizeId === 'string' ? sizeId : null)
}

const rows = computed(() =>
  selection.entries.value.map((entry) => {
    const detail = details.data.value?.get(entry.product.productSlug)
    const designed = Object.values(designs.designs.value[entry.item.instanceId] ?? {}).some(
      (zone) => zone.image || zone.text?.content.trim(),
    )
    return {
      ...entry,
      detail,
      designed,
      sizeOptions: (detail?.sizes ?? []).map((size) => ({ label: size.name, value: size.id })),
    }
  }),
)
const subtotal = computed(() => rows.value.reduce((sum, row) => sum + (row.detail?.price ?? 0), 0))

const form = reactive<CustomerForm>({ name: '', phone: '', address: '', note: '' })
const errors = ref<CustomerErrors>({})
const formError = ref<string | null>(null)
const step = ref<SubmitStep | null>(null)
const submitting = computed(() => step.value !== null)

// Resources of the set view are loaded for the preview picture sent with the order.
composition.showSet()
const readiness = computed(() => composition.exportReadiness.value)
const blockedReason = computed(() => {
  if (!details.data.value) return 'Đang tải thông tin sản phẩm…'
  const code = readiness.value.ok ? null : readiness.value.code
  if (code === 'pending-edit') return 'Đang áp dụng thay đổi thiết kế…'
  if (code === 'invalid-edit') return 'Có nội dung chữ chưa hợp lệ. Hãy quay lại sửa trước khi đặt.'
  if (code === 'loading') return 'Đang chuẩn bị ảnh xem trước của bộ…'
  return null
})

const stepLabels: Record<SubmitStep, string> = {
  session: 'Đang kết nối…',
  upload: 'Đang tải ảnh của bạn lên…',
  preview: 'Đang tạo ảnh xem trước…',
  order: 'Đang gửi đơn…',
}

watch(
  () => ({ ...form }),
  () => (formError.value = null),
)

function validateSizes(): boolean {
  let ok = true
  for (const row of rows.value) {
    const missing = row.sizeOptions.length > 0 && !sizes[row.item.instanceId]
    sizeErrors[row.item.instanceId] = missing ? 'Vui lòng chọn kích thước.' : undefined
    if (missing) ok = false
  }
  return ok
}

function failureMessage(error: unknown): string {
  if (error instanceof CheckoutError) return 'Không tìm thấy ảnh bạn đã tải lên. Hãy chọn lại ảnh.'
  if (!(error instanceof ApiError)) return 'Không gửi được đơn. Vui lòng thử lại.'
  if (error.kind === 'network') {
    return 'Không kết nối được máy chủ. Hãy bấm gửi lại: đơn sẽ không bị tạo trùng.'
  }
  if (error.kind === 'config') return 'Ứng dụng chưa được cấu hình địa chỉ máy chủ.'
  if (error.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi gửi lại.'
  if (error.status === 413) return 'Ảnh quá lớn. Hãy dùng ảnh nhỏ hơn 5 MB.'
  if (error.status === 400 || error.status === 404 || error.status === 422) {
    return 'Một số món hoặc thiết kế trong bộ không còn hợp lệ (sản phẩm, kích thước hoặc hình đã thay đổi). Hãy kiểm tra lại bộ quà.'
  }
  if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  return 'Không gửi được đơn. Vui lòng thử lại.'
}

async function submit() {
  if (submitting.value || blockedReason.value) return
  const checked = validateCustomer(form)
  errors.value = checked.errors
  const sizesOk = validateSizes()
  if (!checked.value || !sizesOk) {
    formError.value = 'Vui lòng kiểm tra lại các thông tin được đánh dấu.'
    return
  }

  // The set cannot change while the order is sent (same lock as the image download).
  const release = selection.lock.acquire()
  if (!release) return
  step.value = 'session'
  formError.value = null
  try {
    const order = await props.submitter.submit({
      customer: checked.value,
      items: rows.value.map((row) => ({
        instanceId: row.item.instanceId,
        product: row.product,
        sizeId: row.sizeOptions.length > 0 ? (sizes[row.item.instanceId] ?? null) : null,
        inPreview: selection.inPicture.value.has(row.item.instanceId),
      })),
      designs: designs.designs.value,
      backgroundId: composition.background.value?.id ?? null,
      uploadBlob: designs.uploadBlob,
      renderPreview: () => exporter.renderPreview(),
      onStep: (next) => (step.value = next),
    })
    saveLastOrder({ id: order.id, orderCode: order.orderCode })
    emit('ordered')
    void router.push(`/don-hang/${order.id}`)
  } catch (error) {
    if (error instanceof ApiError && error.errors.length > 0) {
      const mapped = customerErrorsFromApi(error.errors)
      errors.value = mapped.fields
      formError.value =
        mapped.other > 0
          ? failureMessage(error)
          : 'Vui lòng kiểm tra lại các thông tin được đánh dấu.'
    } else {
      formError.value = failureMessage(error)
    }
    if (import.meta.env.DEV) console.warn('[checkout] order failed', error)
  } finally {
    step.value = null
    release()
  }
}
</script>

<template>
  <section aria-labelledby="checkout-heading">
    <Flex vertical gap="large">
      <Flex align="center" justify="space-between" wrap gap="small">
        <Typography id="checkout-heading" as="h2" variant="heading">Đặt hàng</Typography>
        <Button variant="default" :disabled="submitting" @click="emit('back')">
          <template #icon><ArrowLeft /></template>
          Quay lại thiết kế
        </Button>
      </Flex>

      <EmptyState
        v-if="details.error.value && !details.loading.value"
        title="Chưa tải được thông tin sản phẩm"
        :description="details.error.value"
      >
        <template #icon><CloudOff /></template>
        <template #action>
          <Button @click="details.reload()">Thử lại</Button>
        </template>
      </EmptyState>

      <form v-else novalidate @submit.prevent="submit">
        <Row :gutter="[24, 24]">
          <Col :xs="24" :lg="14">
            <Flex vertical gap="large">
              <section
                aria-labelledby="checkout-items-heading"
                class="rounded-xl border bg-card p-4"
              >
                <Flex vertical gap="middle">
                  <Typography id="checkout-items-heading" as="h3" variant="subheading">
                    Bộ quà ({{ rows.length }} món)
                  </Typography>
                  <Flex as="ul" vertical gap="middle">
                    <li
                      v-for="row in rows"
                      :key="row.item.instanceId"
                      class="border-t pt-3 first:border-t-0 first:pt-0"
                    >
                      <Flex align="start" gap="middle" wrap>
                        <Image
                          :src="row.product.image.src"
                          alt=""
                          class="aspect-4/3 w-20 shrink-0 rounded-md bg-muted"
                        />
                        <Flex vertical :gap="4" class="min-w-0 flex-1">
                          <Typography variant="body" weight="medium">
                            Món {{ row.position }} · {{ row.product.name }}
                          </Typography>
                          <Typography variant="caption">
                            {{ categoryName(row.product.categoryId) }} ·
                            {{ row.designed ? 'Có thêu' : 'Không thêu' }}
                          </Typography>
                          <Typography v-if="row.detail" variant="body" weight="semibold">
                            {{ formatPrice(row.detail.price) }}
                          </Typography>
                        </Flex>
                        <FormField
                          v-if="row.sizeOptions.length"
                          :for="`size-${row.item.instanceId}`"
                          label="Kích thước"
                          :error="sizeErrors[row.item.instanceId]"
                          required
                          class="w-full sm:w-44"
                        >
                          <template #default="{ id, describedBy, invalid }">
                            <Select
                              :id="id"
                              v-model="sizes[row.item.instanceId]"
                              :options="row.sizeOptions"
                              placeholder="Chọn kích thước"
                              :disabled="submitting"
                              :aria-describedby="describedBy"
                              :aria-invalid="invalid || undefined"
                              @update:model-value="chooseSize(row.item.instanceId, $event)"
                            />
                          </template>
                        </FormField>
                      </Flex>
                    </li>
                  </Flex>
                </Flex>
              </section>

              <section
                aria-labelledby="checkout-contact-heading"
                class="rounded-xl border bg-card p-4"
              >
                <Flex vertical gap="middle">
                  <Typography id="checkout-contact-heading" as="h3" variant="subheading">
                    Thông tin liên hệ
                  </Typography>
                  <FormField for="customer-name" label="Họ tên" :error="errors.name" required>
                    <template #default="{ id, describedBy, invalid, required }">
                      <input
                        :id="id"
                        v-model="form.name"
                        autocomplete="name"
                        :maxlength="CUSTOMER_LIMITS.name"
                        :required="required"
                        :disabled="submitting"
                        :aria-describedby="describedBy"
                        :aria-invalid="invalid || undefined"
                        class="w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                      />
                    </template>
                  </FormField>
                  <FormField
                    for="customer-phone"
                    label="Số điện thoại"
                    description="Cửa hàng gọi số này để báo giá và xác nhận đơn."
                    :error="errors.phone"
                    required
                  >
                    <template #default="{ id, describedBy, invalid, required }">
                      <input
                        :id="id"
                        v-model="form.phone"
                        type="tel"
                        autocomplete="tel"
                        inputmode="tel"
                        maxlength="20"
                        :required="required"
                        :disabled="submitting"
                        :aria-describedby="describedBy"
                        :aria-invalid="invalid || undefined"
                        placeholder="0912 345 678"
                        class="w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                      />
                    </template>
                  </FormField>
                  <FormField
                    for="customer-address"
                    label="Địa chỉ nhận hàng"
                    :error="errors.address"
                    required
                  >
                    <template #default="{ id, describedBy, invalid, required }">
                      <textarea
                        :id="id"
                        v-model="form.address"
                        rows="2"
                        autocomplete="street-address"
                        :maxlength="CUSTOMER_LIMITS.address"
                        :required="required"
                        :disabled="submitting"
                        :aria-describedby="describedBy"
                        :aria-invalid="invalid || undefined"
                        class="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                      />
                    </template>
                  </FormField>
                  <FormField
                    for="customer-note"
                    label="Ghi chú"
                    description="Không bắt buộc, ví dụ thời gian tiện nghe máy."
                    :error="errors.note"
                  >
                    <template #default="{ id, describedBy, invalid }">
                      <textarea
                        :id="id"
                        v-model="form.note"
                        rows="3"
                        :maxlength="CUSTOMER_LIMITS.note"
                        :disabled="submitting"
                        :aria-describedby="describedBy"
                        :aria-invalid="invalid || undefined"
                        class="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
                      />
                    </template>
                  </FormField>
                </Flex>
              </section>
            </Flex>
          </Col>

          <Col :xs="24" :lg="10">
            <section
              aria-labelledby="checkout-summary-heading"
              class="rounded-xl border bg-card p-4 lg:sticky lg:top-4"
            >
              <Flex vertical gap="middle">
                <Typography id="checkout-summary-heading" as="h3" variant="subheading">
                  Tóm tắt
                </Typography>
                <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                  <dt>Tạm tính ({{ rows.length }} món)</dt>
                  <dd class="text-right font-semibold tabular-nums">
                    {{ details.data.value ? formatPrice(subtotal) : '…' }}
                  </dd>
                  <dt>Phí thêu</dt>
                  <dd class="text-right">Báo giá sau</dd>
                </dl>
                <PictureNotice />
                <Typography variant="caption">
                  Đây là yêu cầu đặt hàng, chưa cần thanh toán. Cửa hàng sẽ gọi để báo phí thêu, xác
                  nhận thiết kế và tổng tiền cuối cùng.
                </Typography>

                <Typography
                  v-if="formError"
                  variant="body"
                  weight="semibold"
                  class="text-destructive"
                  role="alert"
                >
                  {{ formError }}
                </Typography>
                <Typography v-else-if="blockedReason || step" variant="caption" role="status">
                  {{ step ? stepLabels[step] : blockedReason }}
                </Typography>

                <Button
                  html-type="submit"
                  size="large"
                  block
                  :loading="submitting"
                  :disabled="!!blockedReason"
                >
                  <template #icon><Send /></template>
                  {{ submitting ? 'Đang gửi…' : 'Gửi yêu cầu đặt hàng' }}
                </Button>
              </Flex>
            </section>
          </Col>
        </Row>
      </form>
    </Flex>
  </section>
</template>
