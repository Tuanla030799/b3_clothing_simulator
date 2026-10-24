<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, PackageSearch, Search } from '@lucide/vue'
import {
  Button,
  Container,
  EmptyState,
  Flex,
  FormField,
  Image,
  Modal,
  Typography,
} from '@lituta/ui'
import { ApiError } from '../api/http'
import { ordersApi, type OrderLookupDetail, type OrderLookupSummary } from '../api/orders'
import { formatPrice } from '../features/catalog/formatPrice'
import { normalizePhone } from '../features/checkout/customer'
import { loadLastOrder } from '../features/checkout/guestStorage'
import { formatOrderDate, orderStatusLabels } from '../features/checkout/orderStatus'

/*
 * Order lookup without an account. The phone number lists the orders with nothing personal
 * (masked code, date, status, item count). Opening one needs its full order code too: the modal
 * asks for it, then shows the items, amounts and status history. The API limits lookups per IP
 * address and per phone number.
 */
const router = useRouter()

const phoneInput = ref('')
const phoneError = ref<string | null>(null)
const searchedPhone = ref<string | null>(null)
const searching = ref(false)
const searchError = ref<string | null>(null)
const orders = ref<OrderLookupSummary[] | null>(null)

const failureText = (error: unknown) =>
  error instanceof ApiError && error.status === 429
    ? 'Bạn tra cứu quá nhiều lần. Vui lòng thử lại sau ít phút.'
    : 'Chưa tra cứu được. Vui lòng kiểm tra kết nối và thử lại.'

async function search() {
  const phone = normalizePhone(phoneInput.value)
  phoneError.value = phone ? null : 'Số điện thoại chưa đúng.'
  if (!phone) return
  searching.value = true
  searchError.value = null
  try {
    orders.value = (await ordersApi.lookupOrders(phone)).orders
    searchedPhone.value = phone
  } catch (error) {
    searchError.value = failureText(error)
  } finally {
    searching.value = false
  }
}

// --- details: the full code of the chosen order opens it ---
const modalOpen = ref(false)
const chosen = ref<OrderLookupSummary | null>(null)
const codeInput = ref('')
const codeError = ref<string | null>(null)
const opening = ref(false)
const detail = ref<OrderLookupDetail | null>(null)

const maskOf = (code: string) => `LT-${code.slice(3, 5)}••••${code.slice(-2)}`

function openOrder(order: OrderLookupSummary) {
  chosen.value = order
  detail.value = null
  codeError.value = null
  // The order just placed in this tab is opened without typing its code.
  const last = loadLastOrder()?.orderCode
  codeInput.value = last && maskOf(last) === order.maskedCode ? last : ''
  modalOpen.value = true
  if (codeInput.value) void openDetail()
}

async function openDetail() {
  const code = codeInput.value.trim().toUpperCase()
  if (!/^LT-[A-Z0-9]{8}$/.test(code)) {
    codeError.value = 'Mã đơn có dạng LT-XXXXXXXX.'
    return
  }
  if (chosen.value && maskOf(code) !== chosen.value.maskedCode) {
    codeError.value = `Mã này không phải của đơn ${chosen.value.maskedCode}.`
    return
  }
  opening.value = true
  codeError.value = null
  try {
    detail.value = await ordersApi.lookupOrder(searchedPhone.value!, code)
  } catch (error) {
    codeError.value =
      error instanceof ApiError && error.status === 404
        ? 'Mã đơn không đúng với số điện thoại này.'
        : failureText(error)
  } finally {
    opening.value = false
  }
}

const modalTitle = computed(() =>
  detail.value ? `Đơn ${detail.value.orderCode}` : `Đơn ${chosen.value?.maskedCode ?? ''}`,
)
const historyNewestFirst = computed(() => [...(detail.value?.history ?? [])].reverse())
</script>

<template>
  <Container class="py-10 lg:py-12">
    <Flex vertical gap="large" class="mx-auto max-w-3xl">
      <Flex vertical gap="small">
        <Typography as="h1" variant="title">Tra cứu đơn hàng</Typography>
        <Typography>
          Nhập số điện thoại đã dùng khi đặt hàng để xem các đơn của bạn. Để xem chi tiết một đơn,
          bạn cần mã đơn (dạng LT-XXXXXXXX) có trong trang xác nhận đặt hàng.
        </Typography>
      </Flex>

      <form
        novalidate
        class="rounded-xl border bg-card p-4"
        aria-label="Tra cứu theo số điện thoại"
        @submit.prevent="search"
      >
        <Flex wrap align="end" gap="middle">
          <FormField
            for="lookup-phone"
            label="Số điện thoại"
            :error="phoneError ?? undefined"
            class="min-w-0 flex-1 basis-60"
            required
          >
            <template #default="{ id, describedBy, invalid }">
              <input
                :id="id"
                v-model="phoneInput"
                type="tel"
                autocomplete="tel"
                inputmode="tel"
                maxlength="20"
                placeholder="0912 345 678"
                :aria-describedby="describedBy"
                :aria-invalid="invalid || undefined"
                class="w-full rounded-md border border-input bg-card px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
              />
            </template>
          </FormField>
          <Button html-type="submit" :loading="searching">
            <template #icon><Search /></template>
            Tra cứu
          </Button>
        </Flex>
      </form>

      <Typography v-if="searchError" role="alert" class="text-destructive">
        {{ searchError }}
      </Typography>

      <section v-if="orders" aria-labelledby="lookup-results-heading" aria-live="polite">
        <Typography id="lookup-results-heading" as="h2" variant="subheading" class="mb-3">
          {{ orders.length ? `${orders.length} đơn hàng` : 'Kết quả' }}
        </Typography>
        <EmptyState
          v-if="orders.length === 0"
          title="Không có đơn hàng nào"
          description="Chưa có đơn nào đặt bằng số điện thoại này. Hãy kiểm tra lại số."
        >
          <template #icon><PackageSearch /></template>
          <template #action>
            <Button variant="default" @click="router.push('/bo-suu-tap')">Mua sắm</Button>
          </template>
        </EmptyState>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="order in orders"
            :key="order.maskedCode + order.createdAt"
            class="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
          >
            <Flex vertical :gap="4" class="min-w-0 flex-1">
              <Typography weight="semibold" class="tabular-nums">{{ order.maskedCode }}</Typography>
              <Typography variant="caption">
                {{ formatOrderDate(order.createdAt) }} · {{ order.itemCount }} món
              </Typography>
            </Flex>
            <span class="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
              {{ orderStatusLabels[order.status] }}
            </span>
            <Button variant="default" size="small" @click="openOrder(order)">
              Xem chi tiết
              <span class="sr-only">đơn {{ order.maskedCode }}</span>
            </Button>
          </li>
        </ul>
      </section>
    </Flex>

    <Modal
      v-model:open="modalOpen"
      :title="modalTitle"
      :description="detail ? undefined : 'Nhập mã đơn đầy đủ để xem chi tiết.'"
      :size="detail ? 'large' : 'small'"
    >
      <form v-if="!detail" novalidate @submit.prevent="openDetail">
        <Flex vertical gap="middle">
          <FormField
            for="lookup-code"
            label="Mã đơn"
            :description="`Mã của đơn ${chosen?.maskedCode ?? ''}, dạng LT-XXXXXXXX.`"
            :error="codeError ?? undefined"
            required
          >
            <template #default="{ id, describedBy, invalid }">
              <input
                :id="id"
                v-model="codeInput"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                maxlength="11"
                placeholder="LT-XXXXXXXX"
                :aria-describedby="describedBy"
                :aria-invalid="invalid || undefined"
                class="w-full rounded-md border border-input bg-card px-3 py-2 text-base uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
              />
            </template>
          </FormField>
          <Button html-type="submit" :loading="opening" class="self-end">Xem đơn</Button>
        </Flex>
      </form>

      <Flex v-else vertical gap="large">
        <Flex wrap align="center" gap="small">
          <span class="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            {{ orderStatusLabels[detail.status] }}
          </span>
          <Typography as="span" variant="caption">
            Đặt lúc {{ formatOrderDate(detail.createdAt) }}
          </Typography>
        </Flex>

        <section aria-labelledby="lookup-items-heading">
          <Typography id="lookup-items-heading" as="h3" variant="body" weight="semibold">
            Các món ({{ detail.items.length }})
          </Typography>
          <ul class="mt-2 flex flex-col gap-2">
            <li
              v-for="(item, index) in detail.items"
              :key="index"
              class="flex gap-3 rounded-lg border p-2"
            >
              <Image
                :src="item.displayImage.url ?? undefined"
                alt=""
                :width="item.displayImage.width"
                :height="item.displayImage.height"
                class="size-14 shrink-0 rounded-md bg-muted"
              />
              <Flex vertical :gap="2" class="min-w-0 flex-1">
                <Typography weight="medium">{{ item.productName }}</Typography>
                <Typography variant="caption">
                  Màu {{ item.colorName
                  }}<template v-if="item.sizeName"> · Size {{ item.sizeName }}</template>
                </Typography>
                <Typography v-if="!item.embroidery.length" variant="caption">Không thêu</Typography>
                <Typography v-for="zone in item.embroidery" :key="zone.zoneName" variant="caption">
                  Thêu ở {{ zone.zoneName }}:
                  <template v-if="zone.text">“{{ zone.text }}”</template>
                  <template v-if="zone.text && zone.hasImage"> và </template>
                  <template v-if="zone.hasImage">một hình</template>
                </Typography>
              </Flex>
              <Typography as="span" class="tabular-nums">{{
                formatPrice(item.unitPrice)
              }}</Typography>
            </li>
          </ul>
        </section>

        <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt>Tiền sản phẩm</dt>
          <dd class="text-right tabular-nums">{{ formatPrice(detail.productSubtotal) }}</dd>
          <dt>Phí thêu</dt>
          <dd class="text-right tabular-nums">
            {{ detail.embroideryFee === null ? 'Báo giá sau' : formatPrice(detail.embroideryFee) }}
          </dd>
          <dt class="font-semibold">Tổng cộng</dt>
          <dd class="text-right font-semibold tabular-nums">
            {{ detail.totalAmount === null ? 'Chờ báo phí thêu' : formatPrice(detail.totalAmount) }}
          </dd>
        </dl>

        <section aria-labelledby="lookup-history-heading">
          <Typography id="lookup-history-heading" as="h3" variant="body" weight="semibold">
            Lịch sử trạng thái
          </Typography>
          <ol class="mt-2 flex flex-col gap-3 border-s-2 border-border ps-4">
            <li v-for="(entry, index) in historyNewestFirst" :key="entry.at + entry.status">
              <Flex align="center" :gap="8">
                <CircleCheck
                  class="size-4 shrink-0"
                  :class="index === 0 ? 'text-primary' : 'text-muted-foreground'"
                  aria-hidden="true"
                />
                <Typography as="span" :weight="index === 0 ? 'semibold' : undefined">
                  {{ orderStatusLabels[entry.status] }}
                </Typography>
              </Flex>
              <Typography variant="caption" class="ps-6">{{
                formatOrderDate(entry.at)
              }}</Typography>
            </li>
          </ol>
        </section>
      </Flex>

      <template #footer>
        <Button variant="default" @click="modalOpen = false">Đóng</Button>
      </template>
    </Modal>
  </Container>
</template>
