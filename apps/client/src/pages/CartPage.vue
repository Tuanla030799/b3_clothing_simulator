<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { CloudOff, PenLine, ShoppingBag, Trash2 } from '@lucide/vue'
import { Button, Col, Container, EmptyState, Flex, Image, Link, Row, Typography } from '@lituta/ui'
import { ApiError } from '../api/http'
import { publicCatalog, type PublicProduct } from '../api/publicCatalog'
import { useRemoteData } from '../api/useRemoteData'
import { useCart } from '../features/cart/cart'
import { formatPrice } from '../features/catalog/formatPrice'

/*
 * The cart: items kept in this browser (ids only); names, images and prices come from the API.
 * From here the customer designs the items (the design tool works on the cart) or orders them
 * without design (the same checkout, opened directly).
 */
const router = useRouter()
const cart = useCart()

// Details of every product in the cart, loaded once per visit (a hidden product reads as null).
const slugs = [...new Set(cart.items.value.map((item) => item.productSlug))]
const details = useRemoteData(async (signal) => {
  const entries = await Promise.all(
    slugs.map((slug) =>
      publicCatalog.product(slug, signal).then(
        (product) => [slug, product] as const,
        (error: unknown) => {
          if (error instanceof ApiError && error.status === 404) return [slug, null] as const
          throw error
        },
      ),
    ),
  )
  return new Map<string, PublicProduct | null>(entries)
})

const rows = computed(() =>
  cart.items.value.map((item) => {
    const product = details.data.value?.get(item.productSlug) ?? null
    const color = product?.colors.find((entry) => entry.id === item.colorId) ?? null
    const size = product?.sizes.find((entry) => entry.id === item.sizeId) ?? null
    return { item, product, color, size, available: Boolean(product && color) }
  }),
)
const unavailable = computed(() => rows.value.filter((row) => details.data.value && !row.available))
// Display only: the order total is calculated by the API.
const subtotal = computed(() =>
  rows.value.reduce((sum, row) => sum + (row.available ? row.product!.price : 0), 0),
)
const canContinue = computed(
  () => Boolean(details.data.value) && unavailable.value.length === 0 && cart.count.value > 0,
)
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large">
      <Typography as="h1" variant="title">Giỏ hàng</Typography>

      <EmptyState
        v-if="cart.count.value === 0"
        title="Giỏ hàng đang trống"
        description="Chọn sản phẩm hoặc một bộ sưu tập để bắt đầu."
      >
        <template #icon><ShoppingBag /></template>
        <template #action>
          <Flex wrap justify="center" gap="middle" align="center">
            <Button @click="router.push('/bo-suu-tap')">Chọn bộ sưu tập</Button>
            <Link :as="RouterLink" to="/san-pham">Xem sản phẩm</Link>
          </Flex>
        </template>
      </EmptyState>

      <EmptyState
        v-else-if="details.error.value && !details.loading.value"
        title="Chưa tải được giỏ hàng"
        :description="details.error.value"
      >
        <template #icon><CloudOff /></template>
        <template #action>
          <Button @click="details.reload()">Thử lại</Button>
        </template>
      </EmptyState>

      <Row v-else :gutter="[24, 24]">
        <Col :xs="24" :lg="15">
          <section aria-labelledby="cart-items-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="cart-items-heading" as="h2" variant="subheading">
                {{ cart.count.value }} món
              </Typography>
              <ul class="flex flex-col gap-3">
                <li
                  v-for="row in rows"
                  :key="row.item.id"
                  class="flex items-center gap-3 rounded-lg border p-2"
                >
                  <Image
                    :src="row.color?.displayImage.url"
                    alt=""
                    :width="row.color?.displayImage.width"
                    :height="row.color?.displayImage.height"
                    class="size-16 shrink-0 rounded-md bg-muted"
                  />
                  <div class="min-w-0 flex-1">
                    <template v-if="row.available">
                      <Link
                        :as="RouterLink"
                        :to="`/san-pham/${row.product!.slug}`"
                        variant="plain"
                        class="font-medium"
                      >
                        {{ row.product!.name }}
                      </Link>
                      <Typography variant="caption">
                        Màu {{ row.color!.name }}
                        <template v-if="row.size"> · Size {{ row.size.name }}</template>
                      </Typography>
                    </template>
                    <Typography v-else-if="details.data.value" variant="body" weight="medium">
                      Sản phẩm đã ngừng bán
                    </Typography>
                    <Typography v-else variant="caption">Đang tải…</Typography>
                  </div>
                  <Typography v-if="row.available" as="span" class="tabular-nums">
                    {{ formatPrice(row.product!.price) }}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    :aria-label="`Xóa ${row.product?.name ?? 'món này'} khỏi giỏ`"
                    @click="cart.remove(row.item.id)"
                  >
                    <template #icon><Trash2 /></template>
                  </Button>
                </li>
              </ul>
              <Typography v-if="unavailable.length" role="alert" class="text-destructive">
                Xóa các món đã ngừng bán để tiếp tục.
              </Typography>
            </Flex>
          </section>
        </Col>

        <Col :xs="24" :lg="9">
          <section
            aria-labelledby="cart-summary-heading"
            class="rounded-xl border bg-card p-4 lg:sticky lg:top-4"
          >
            <Flex vertical gap="middle">
              <Typography id="cart-summary-heading" as="h2" variant="subheading">
                Tóm tắt
              </Typography>
              <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                <dt>Tạm tính ({{ cart.count.value }} món)</dt>
                <dd class="text-right font-semibold tabular-nums">
                  {{ details.data.value ? formatPrice(subtotal) : '…' }}
                </dd>
                <dt>Phí thêu</dt>
                <dd class="text-right">Báo giá sau</dd>
              </dl>
              <Button size="large" :disabled="!canContinue" @click="router.push('/thiet-ke')">
                <template #icon><PenLine /></template>
                Thiết kế
              </Button>
              <Button
                size="large"
                variant="default"
                :disabled="!canContinue"
                @click="router.push({ path: '/thiet-ke', query: { buoc: 'dat-hang' } })"
              >
                Đặt hàng không thiết kế
              </Button>
              <Typography variant="caption">
                Thiết kế là tùy chọn. Cửa hàng sẽ gọi để báo phí thêu và xác nhận đơn.
              </Typography>
            </Flex>
          </section>
        </Col>
      </Row>
    </Flex>
  </Container>
</template>
