<script setup lang="ts">
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { Download } from '@lucide/vue'
import { InputNumber, Modal, Spin, Tag, Textarea, Timeline, TimelineItem } from 'ant-design-vue'
import { Button, Col, EmptyState, Flex, FormField, Image, Link, Row, Typography } from '@lituta/ui'
import { ApiError, errorMessage } from '../api/httpClient'
import { ordersApi } from '../api/resources'
import type { Order, OrderEvent, OrderStatus } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { useFeedback } from '../composables/useFeedback'
import { usePrivateImages } from '../composables/usePrivateImages'
import { formatDateTime, formatPrice, formatQuote } from '../utils/format'
import { formatMoneyInput, parseMoneyInput } from '../utils/money'
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
  quoteRule,
  statusChangeProblem,
} from '../utils/orderStatus'

/*
 * One order from its snapshot. Quote and status changes send `expectedRevision`; when someone
 * else changed the order meanwhile the API answers 409 and the page reloads the current state.
 */
const props = defineProps<{ id: string }>()
const feedback = useFeedback()
const images = usePrivateImages()

const order = shallowRef<Order | null>(null)
const history = shallowRef<OrderEvent[]>([])
const loadError = ref<string | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [current, events] = await Promise.all([
      ordersApi.get(props.id),
      ordersApi.history(props.id, { pageSize: 100 }),
    ])
    order.value = current
    history.value = events.entries
    quote.fee = current.embroideryFee ?? undefined
    quote.note = ''
  } catch (error) {
    loadError.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

/** A 409 means the order changed elsewhere: show the latest state. */
async function handleWriteError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    feedback.error(error)
    await load()
  } else feedback.error(error)
}

// --- quote ---
const quote = reactive({ fee: undefined as number | undefined, note: '' })
const quoting = ref(false)
const rule = computed(() => (order.value ? quoteRule(order.value.status) : null))
const quoteProblem = computed(() => {
  if (quote.fee === undefined || quote.fee === null) return 'Nhập phí thêu (0 nếu miễn phí).'
  if (rule.value?.noteRequired && !quote.note.trim())
    return 'Đơn đã xác nhận: cần ghi lý do đổi phí.'
  return null
})

async function saveQuote() {
  const current = order.value
  if (!current || quoteProblem.value || quote.fee === undefined) return
  quoting.value = true
  try {
    order.value = await ordersApi.quote(current.id, {
      expectedRevision: current.revision,
      embroideryFee: quote.fee,
      note: quote.note.trim() || null,
    })
    feedback.success('Đã báo phí thêu.')
    await load()
  } catch (error) {
    await handleWriteError(error)
  } finally {
    quoting.value = false
  }
}

// --- status ---
const statusTarget = ref<OrderStatus | null>(null)
const statusNote = ref('')
const changingStatus = ref(false)
const transitions = computed(() => (order.value ? ORDER_TRANSITIONS[order.value.status] : []))
const statusProblem = computed(() =>
  statusTarget.value && order.value
    ? statusChangeProblem(statusTarget.value, order.value.embroideryFee, statusNote.value)
    : null,
)

function askStatus(target: OrderStatus) {
  statusTarget.value = target
  statusNote.value = ''
}

async function changeStatus() {
  const current = order.value
  const target = statusTarget.value
  if (!current || !target || statusProblem.value) return
  changingStatus.value = true
  try {
    order.value = await ordersApi.changeStatus(current.id, {
      expectedRevision: current.revision,
      status: target,
      note: statusNote.value.trim() || null,
    })
    feedback.success(`Đã chuyển sang “${ORDER_STATUS_LABELS[target]}”.`)
    statusTarget.value = null
    await load()
  } catch (error) {
    await handleWriteError(error)
  } finally {
    changingStatus.value = false
  }
}

function eventText(event: OrderEvent): string {
  if (event.eventType === 'CREATED') return 'Khách đặt đơn'
  if (event.eventType === 'STATUS_CHANGED') {
    return `${event.fromStatus ? ORDER_STATUS_LABELS[event.fromStatus] : '—'} → ${
      event.toStatus ? ORDER_STATUS_LABELS[event.toStatus] : '—'
    }`
  }
  return `Phí thêu: ${formatQuote(event.fromEmbroideryFee)} → ${formatQuote(event.toEmbroideryFee)}`
}
</script>

<template>
  <PageHeader
    :title="order ? `Đơn ${order.orderCode}` : 'Đơn hàng'"
    :description="
      order
        ? `Đặt lúc ${formatDateTime(order.createdAt)} · cập nhật ${formatDateTime(order.updatedAt)}`
        : undefined
    "
    :back="{ to: '/don-hang', label: 'Danh sách đơn hàng' }"
  >
    <template v-if="order" #actions>
      <Tag :color="ORDER_STATUS_COLORS[order.status]">{{ ORDER_STATUS_LABELS[order.status] }}</Tag>
    </template>
  </PageHeader>

  <EmptyState v-if="loadError" title="Chưa tải được đơn hàng" :description="loadError">
    <template #action>
      <Button @click="load()">Thử lại</Button>
    </template>
  </EmptyState>

  <Spin v-else :spinning="loading">
    <Row v-if="order" :gutter="[24, 24]">
      <Col :xs="24" :xl="15">
        <Flex vertical gap="large">
          <section aria-labelledby="items-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="items-heading" as="h2" variant="subheading">
                Các món ({{ order.items.length }})
              </Typography>
              <Flex as="ol" vertical gap="middle">
                <li
                  v-for="(item, index) in order.items"
                  :key="item.clientItemId"
                  class="border-t pt-3 first:border-t-0 first:pt-0"
                >
                  <Flex align="start" gap="middle" wrap>
                    <Image
                      :src="images.urlOf(item.displayImage)"
                      alt=""
                      class="size-20 shrink-0 rounded border bg-muted"
                    />
                    <Flex vertical :gap="4" class="min-w-0 flex-1">
                      <Typography variant="body" weight="semibold">
                        {{ index + 1 }}. {{ item.productName }}
                      </Typography>
                      <Flex align="center" gap="small">
                        <span
                          v-if="item.colorHexCode"
                          class="size-3 rounded-full border"
                          :style="{ backgroundColor: item.colorHexCode }"
                          aria-hidden="true"
                        />
                        <Typography as="span" variant="caption">
                          Màu {{ item.colorName }}
                          <template v-if="item.sizeName"> · Size {{ item.sizeName }}</template>
                          · {{ formatPrice(item.unitPrice) }}
                        </Typography>
                      </Flex>
                      <Typography v-if="!item.zones.length" variant="caption"
                        >Không thêu</Typography
                      >
                      <Flex
                        v-for="zone in item.zones"
                        :key="zone.key"
                        vertical
                        :gap="4"
                        class="rounded-md bg-muted p-2"
                      >
                        <Typography variant="caption" weight="semibold"
                          >Vùng: {{ zone.name }}</Typography
                        >
                        <Flex v-if="zone.text" align="center" gap="small">
                          <span
                            class="size-3 shrink-0 rounded-full border"
                            :style="{ backgroundColor: zone.text.colorValue }"
                            aria-hidden="true"
                          />
                          <Typography as="span" variant="body" class="whitespace-pre-line">
                            “{{ zone.text.content }}”
                          </Typography>
                          <Typography as="span" variant="caption">
                            ({{ zone.text.colorName }}, {{ zone.text.fontFamily }})
                          </Typography>
                        </Flex>
                        <Flex v-if="zone.image" align="center" gap="small">
                          <Image
                            :src="images.urlOf(zone.image.image)"
                            :alt="
                              zone.image.sourceKind === 'upload'
                                ? 'Ảnh khách tải lên'
                                : (zone.image.presetName ?? 'Hình có sẵn')
                            "
                            class="size-16 shrink-0 rounded border bg-card"
                          />
                          <Typography as="span" variant="caption">
                            {{
                              zone.image.sourceKind === 'upload'
                                ? 'Ảnh khách tải lên'
                                : `Hình có sẵn: ${zone.image.presetName ?? ''}`
                            }}
                          </Typography>
                          <Link
                            v-if="images.urlOf(zone.image.image)"
                            :href="images.urlOf(zone.image.image)"
                            :download="`${order.orderCode}-${item.clientItemId}-${zone.key}`"
                          >
                            <Flex as="span" align="center" :gap="4">
                              <Download class="size-4" aria-hidden="true" />
                              Tải ảnh gốc
                            </Flex>
                          </Link>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Flex>
                </li>
              </Flex>
            </Flex>
          </section>

          <section
            v-if="order.preview || order.background"
            aria-labelledby="preview-heading"
            class="rounded-xl border bg-card p-4"
          >
            <Flex vertical gap="small">
              <Typography id="preview-heading" as="h2" variant="subheading"
                >Ảnh xem trước</Typography
              >
              <Typography variant="caption">
                Ảnh khách tạo trên trình duyệt để tham khảo; nội dung thêu chính xác nằm ở danh sách
                món.
                <template v-if="order.background"> Nền: {{ order.background.name }}.</template>
              </Typography>
              <Image
                v-if="order.preview"
                :src="images.urlOf(order.preview)"
                alt="Ảnh xem trước bộ quà"
                :width="order.preview.width"
                :height="order.preview.height"
                class="w-full rounded border bg-muted"
              />
            </Flex>
          </section>
        </Flex>
      </Col>

      <Col :xs="24" :xl="9">
        <Flex vertical gap="large">
          <section aria-labelledby="customer-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical :gap="4">
              <Typography id="customer-heading" as="h2" variant="subheading">Khách hàng</Typography>
              <Typography weight="semibold">{{ order.customer.name }}</Typography>
              <Link :href="`tel:${order.customer.phone}`">{{ order.customer.phone }}</Link>
              <Typography class="whitespace-pre-line">{{ order.customer.address }}</Typography>
              <Typography v-if="order.customer.note" variant="caption" class="whitespace-pre-line">
                Ghi chú: {{ order.customer.note }}
              </Typography>
            </Flex>
          </section>

          <section aria-labelledby="amount-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="amount-heading" as="h2" variant="subheading">Tiền</Typography>
              <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
                <dt>Tạm tính</dt>
                <dd class="text-right tabular-nums">{{ formatPrice(order.productSubtotal) }}</dd>
                <dt>Phí thêu</dt>
                <dd class="text-right tabular-nums">{{ formatQuote(order.embroideryFee) }}</dd>
                <dt class="font-semibold">Tổng</dt>
                <dd class="text-right font-semibold tabular-nums">
                  {{ formatQuote(order.totalAmount, 'Chờ báo phí') }}
                </dd>
              </dl>
              <form v-if="rule?.allowed" novalidate @submit.prevent="saveQuote">
                <Flex vertical gap="small">
                  <FormField for="quote-fee" label="Phí thêu (VND)" description="0 = miễn phí.">
                    <template #default="{ id: fieldId }">
                      <InputNumber
                        :id="fieldId"
                        v-model:value="quote.fee"
                        :min="0"
                        :max="100000000000"
                        :precision="0"
                        :step="10000"
                        :formatter="formatMoneyInput"
                        :parser="parseMoneyInput"
                        addon-after="₫"
                        style="width: 14rem"
                      />
                    </template>
                  </FormField>
                  <FormField
                    for="quote-note"
                    label="Ghi chú"
                    :required="rule.noteRequired"
                    :description="
                      rule.noteRequired
                        ? 'Bắt buộc khi đổi phí sau khi xác nhận.'
                        : 'Không bắt buộc.'
                    "
                  >
                    <template #default="{ id: fieldId }">
                      <Textarea
                        :id="fieldId"
                        v-model:value="quote.note"
                        :rows="2"
                        :maxlength="1000"
                      />
                    </template>
                  </FormField>
                  <Button
                    html-type="submit"
                    :loading="quoting"
                    :disabled="!!quoteProblem"
                    class="self-start"
                  >
                    Lưu báo giá
                  </Button>
                  <Typography v-if="quoteProblem" variant="caption">{{ quoteProblem }}</Typography>
                </Flex>
              </form>
              <Typography v-else variant="caption">Đơn đã kết thúc, không đổi phí được.</Typography>
            </Flex>
          </section>

          <section aria-labelledby="status-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="small">
              <Typography id="status-heading" as="h2" variant="subheading">Trạng thái</Typography>
              <Flex v-if="transitions.length" wrap gap="small">
                <Button
                  v-for="target in transitions"
                  :key="target"
                  :variant="target === 'CANCELLED' ? 'text' : 'primary'"
                  @click="askStatus(target)"
                >
                  {{
                    target === 'CANCELLED'
                      ? 'Hủy đơn'
                      : `Chuyển sang “${ORDER_STATUS_LABELS[target]}”`
                  }}
                </Button>
              </Flex>
              <Typography v-else variant="caption">Đơn đã kết thúc.</Typography>
            </Flex>
          </section>

          <section aria-labelledby="history-heading" class="rounded-xl border bg-card p-4">
            <Flex vertical gap="middle">
              <Typography id="history-heading" as="h2" variant="subheading">Lịch sử</Typography>
              <Timeline>
                <TimelineItem v-for="event in history" :key="event.id">
                  <Typography variant="body">{{ eventText(event) }}</Typography>
                  <Typography variant="caption">
                    {{ formatDateTime(event.createdAt) }} ·
                    {{
                      event.actor.type === 'GUEST' ? 'Khách' : (event.actor.name ?? 'Quản trị viên')
                    }}
                  </Typography>
                  <Typography v-if="event.note" variant="caption" class="whitespace-pre-line">
                    {{ event.note }}
                  </Typography>
                </TimelineItem>
              </Timeline>
            </Flex>
          </section>
        </Flex>
      </Col>
    </Row>
  </Spin>

  <Modal
    :open="statusTarget !== null"
    :title="statusTarget ? `Chuyển sang “${ORDER_STATUS_LABELS[statusTarget]}”` : ''"
    :ok-text="statusTarget === 'CANCELLED' ? 'Hủy đơn' : 'Xác nhận'"
    :ok-button-props="{ danger: statusTarget === 'CANCELLED', disabled: !!statusProblem }"
    cancel-text="Đóng"
    :confirm-loading="changingStatus"
    @ok="changeStatus"
    @cancel="statusTarget = null"
  >
    <Flex vertical gap="small">
      <FormField
        for="status-note"
        :label="statusTarget === 'CANCELLED' ? 'Lý do hủy' : 'Ghi chú'"
        :required="statusTarget === 'CANCELLED'"
      >
        <template #default="{ id: fieldId }">
          <Textarea :id="fieldId" v-model:value="statusNote" :rows="3" :maxlength="1000" />
        </template>
      </FormField>
      <Typography v-if="statusProblem" variant="caption" role="alert">{{
        statusProblem
      }}</Typography>
    </Flex>
  </Modal>
</template>
