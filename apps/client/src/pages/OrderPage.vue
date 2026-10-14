<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, CloudOff, Clock } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Image, Row, Typography } from '@lituta/ui'
import { ApiError } from '../api/http'
import { ordersApi, type OrderImage, type OrderStatus } from '../api/orders'
import { useRemoteData } from '../api/useRemoteData'
import { formatPrice } from '../features/catalog/formatPrice'
import { loadGuestSession, loadLastOrder } from '../features/checkout/guestStorage'

/*
 * An order as the customer sees it. Only the guest session that placed it can read it (the token
 * lives in this tab's sessionStorage for 24 hours). Without it the page still confirms an order
 * placed from this tab by its code, without details.
 */
const props = defineProps<{ id: string }>()
const router = useRouter()

const token = loadGuestSession(Date.now(), 0)?.guestToken ?? null
const lastOrder = loadLastOrder()
const knownCode = computed(() => (lastOrder?.id === props.id ? lastOrder.orderCode : null))

const order = useRemoteData((signal) =>
  token
    ? ordersApi.order(token, props.id, signal)
    : Promise.reject(new ApiError('http', 'No guest session', { status: 401 })),
)
// 401: no or expired session; 404: another session's order (or none). Both look the same.
const unreadable = computed(
  () =>
    !order.loading.value && (order.errorStatus.value === 401 || order.errorStatus.value === 404),
)

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ cửa hàng liên hệ',
  CONTACTING: 'Đang liên hệ',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
}
const createdAt = computed(() =>
  order.data.value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(order.data.value.createdAt),
      )
    : '',
)

// The preview is private: it is read with the guest token and shown through an object URL.
const previewUrl = ref<string | undefined>()
function setPreviewUrl(url: string | undefined) {
  if (previewUrl.value?.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = url
}
async function loadImage(image: OrderImage | null) {
  if (!image) return setPreviewUrl(undefined)
  if (image.url) return setPreviewUrl(image.url)
  if (!image.contentPath || !token) return setPreviewUrl(undefined)
  try {
    const blob = await ordersApi.orderImage(token, image.contentPath)
    setPreviewUrl(URL.createObjectURL(blob))
  } catch {
    setPreviewUrl(undefined)
  }
}
watch(
  () => order.data.value?.preview ?? null,
  (preview) => void loadImage(preview),
)
onBeforeUnmount(() => setPreviewUrl(undefined))

const zonesText = (zones: { name: string; text: { content: string } | null; image: unknown }[]) =>
  zones
    .map((zone) =>
      [zone.name, zone.text ? `“${zone.text.content}”` : null, zone.image ? 'có hình' : null]
        .filter(Boolean)
        .join(': '),
    )
    .join(' · ')
</script>

<template>
  <Container size="lg" class="py-10 lg:py-12">
    <EmptyState
      v-if="unreadable && knownCode"
      :title="`Đã gửi đơn ${knownCode}`"
      description="Phiên xem đơn đã hết hạn nên không hiển thị được chi tiết. Cửa hàng sẽ liên hệ qua số điện thoại bạn đã để lại; hãy đọc mã đơn này khi trao đổi."
    >
      <template #icon><CircleCheck /></template>
      <template #action>
        <Button @click="router.push('/')">Về trang chủ</Button>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="unreadable"
      title="Không xem được đơn hàng này"
      description="Chỉ xem được đơn trên trình duyệt và trong phiên đã đặt (24 giờ). Nếu bạn đã đặt, cửa hàng sẽ liên hệ qua số điện thoại đã để lại."
    >
      <template #icon><Clock /></template>
      <template #action>
        <Button @click="router.push('/')">Về trang chủ</Button>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="order.error.value && !order.loading.value"
      title="Chưa tải được đơn hàng"
      :description="order.error.value"
    >
      <template #icon><CloudOff /></template>
      <template #action>
        <Button @click="order.reload()">Thử lại</Button>
      </template>
    </EmptyState>

    <Typography v-else-if="!order.data.value" variant="caption" role="status">
      Đang tải đơn hàng…
    </Typography>

    <Flex v-else vertical gap="large">
      <Flex vertical gap="small">
        <Flex align="center" gap="small" class="text-primary">
          <CircleCheck class="size-6" aria-hidden="true" />
          <Typography as="h1" variant="title">Đã gửi yêu cầu đặt hàng</Typography>
        </Flex>
        <Typography>
          Mã đơn <strong>{{ order.data.value.orderCode }}</strong> · {{ createdAt }} ·
          {{ statusLabels[order.data.value.status] ?? order.data.value.status }}
        </Typography>
        <Typography variant="caption">
          Cửa hàng sẽ gọi số {{ order.data.value.customer.phone }} để báo phí thêu và xác nhận đơn.
          Chưa cần thanh toán. Trang này xem được trong phiên hiện tại (24 giờ).
        </Typography>
      </Flex>

      <Row :gutter="[24, 24]">
        <Col :xs="24" :lg="14">
          <section aria-labelledby="order-items-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="order-items-heading" as="h2" variant="subheading">
                Các món ({{ order.data.value.items.length }})
              </Typography>
              <Flex as="ul" vertical gap="middle">
                <li
                  v-for="item in order.data.value.items"
                  :key="item.clientItemId"
                  class="border-t pt-3 first:border-t-0 first:pt-0"
                >
                  <Flex align="start" gap="middle">
                    <Image
                      :src="item.displayImage.url ?? undefined"
                      alt=""
                      class="aspect-square w-16 shrink-0 rounded-md bg-muted"
                    />
                    <Flex vertical :gap="4" class="min-w-0 flex-1">
                      <Typography variant="body" weight="medium">{{ item.productName }}</Typography>
                      <Typography variant="caption">
                        Màu {{ item.colorName }}
                        <template v-if="item.sizeName"> · Size {{ item.sizeName }}</template>
                      </Typography>
                      <Typography v-if="item.zones.length" variant="caption">
                        Thêu: {{ zonesText(item.zones) }}
                      </Typography>
                    </Flex>
                    <Typography variant="body" weight="semibold" class="tabular-nums">
                      {{ formatPrice(item.unitPrice) }}
                    </Typography>
                  </Flex>
                </li>
              </Flex>
            </Flex>
          </section>
        </Col>

        <Col :xs="24" :lg="10">
          <Flex vertical gap="large">
            <section aria-labelledby="order-total-heading" class="rounded-xl border bg-card p-4">
              <Flex vertical gap="middle">
                <Typography id="order-total-heading" as="h2" variant="subheading">
                  Thanh toán
                </Typography>
                <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                  <dt>Tạm tính</dt>
                  <dd class="text-right tabular-nums">
                    {{ formatPrice(order.data.value.productSubtotal) }}
                  </dd>
                  <dt>Phí thêu</dt>
                  <dd class="text-right tabular-nums">
                    {{
                      order.data.value.embroideryFee === null
                        ? 'Chờ báo giá'
                        : formatPrice(order.data.value.embroideryFee)
                    }}
                  </dd>
                  <dt class="font-semibold">Tổng cộng</dt>
                  <dd class="text-right font-semibold tabular-nums">
                    {{
                      order.data.value.totalAmount === null
                        ? 'Sau khi báo phí thêu'
                        : formatPrice(order.data.value.totalAmount)
                    }}
                  </dd>
                </dl>
              </Flex>
            </section>

            <section aria-labelledby="order-contact-heading" class="rounded-xl border bg-card p-4">
              <Flex vertical :gap="4">
                <Typography id="order-contact-heading" as="h2" variant="subheading">
                  Người nhận
                </Typography>
                <Typography>{{ order.data.value.customer.name }}</Typography>
                <Typography>{{ order.data.value.customer.phone }}</Typography>
                <Typography class="whitespace-pre-line">
                  {{ order.data.value.customer.address }}
                </Typography>
                <Typography v-if="order.data.value.customer.note" variant="caption">
                  Ghi chú: {{ order.data.value.customer.note }}
                </Typography>
              </Flex>
            </section>

            <section
              v-if="order.data.value.preview"
              aria-labelledby="order-preview-heading"
              class="rounded-xl border bg-card p-4"
            >
              <Flex vertical gap="small">
                <Typography id="order-preview-heading" as="h2" variant="subheading">
                  Ảnh xem trước
                </Typography>
                <Image
                  :src="previewUrl"
                  alt="Ảnh xem trước bộ quà đã đặt"
                  :width="order.data.value.preview.width"
                  :height="order.data.value.preview.height"
                  class="w-full rounded-md bg-muted"
                />
              </Flex>
            </section>
          </Flex>
        </Col>
      </Row>

      <Flex wrap gap="small">
        <Button variant="default" @click="router.push('/')">Về trang chủ</Button>
        <Button @click="router.push('/thiet-ke')">Thiết kế bộ mới</Button>
      </Flex>
    </Flex>
  </Container>
</template>
