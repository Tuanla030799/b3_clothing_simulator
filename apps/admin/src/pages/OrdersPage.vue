<script setup lang="ts">
import { reactive, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Search } from '@lucide/vue'
import { Input, RangePicker, Table, Tag, type TableColumnType } from 'ant-design-vue'
import type { Dayjs } from 'dayjs'
import { Col, Link, Row, Select, Typography } from '@lituta/ui'
import { ordersApi } from '../api/resources'
import { ORDER_STATUSES, type OrderListItem, type OrderStatus } from '../api/types'
import PageHeader from '../components/PageHeader.vue'
import { usePagedTable } from '../composables/usePagedTable'
import { formatDateTime, formatPrice, formatQuote } from '../utils/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../utils/orderStatus'

const filters = reactive<{
  q: string
  status: OrderStatus | 'all'
  range: [Dayjs, Dayjs] | undefined
}>({ q: '', status: 'all', range: undefined })

const statusOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  ...ORDER_STATUSES.map((status) => ({ label: ORDER_STATUS_LABELS[status], value: status })),
]

const table = usePagedTable((page, pageSize) =>
  ordersApi.list({
    page,
    pageSize,
    q: filters.q.trim() || undefined,
    status: filters.status === 'all' ? undefined : filters.status,
    // Local days with their time zone offset; the range is [from, to).
    createdFrom: filters.range?.[0].startOf('day').format(),
    createdTo: filters.range?.[1].add(1, 'day').startOf('day').format(),
  }),
)
void table.reload()
watch(
  () => [filters.status, filters.range],
  () => void table.reload(true),
)

const columns: TableColumnType<OrderListItem>[] = [
  { title: 'STT', key: 'number', width: 70 },
  { title: 'Mã đơn', key: 'orderCode', width: 150 },
  { title: 'Khách', key: 'customer' },
  { title: 'Món', dataIndex: 'itemCount', key: 'itemCount', width: 70 },
  { title: 'Tạm tính', key: 'subtotal', width: 130, align: 'right' },
  { title: 'Phí thêu', key: 'fee', width: 130, align: 'right' },
  { title: 'Trạng thái', key: 'status', width: 140 },
  { title: 'Đặt lúc', key: 'createdAt', width: 150 },
]
</script>

<template>
  <PageHeader
    title="Đơn hàng"
    description="Yêu cầu đặt hàng của khách: liên hệ, báo phí thêu, xác nhận và giao."
  />

  <Row :gutter="[12, 12]" class="mb-4">
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <form role="search" @submit.prevent="table.reload(true)">
        <Input
          v-model:value="filters.q"
          placeholder="Mã đơn, tên hoặc SĐT"
          allow-clear
          aria-label="Tìm đơn"
        >
          <template #suffix><Search class="size-4" aria-hidden="true" /></template>
        </Input>
      </form>
    </Col>
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <Select
        v-model="filters.status"
        size="small"
        :options="statusOptions"
        aria-label="Lọc trạng thái"
      />
    </Col>
    <Col :xs="24" :sm="12" :lg="8" :xl="6">
      <RangePicker
        v-model:value="filters.range"
        format="DD/MM/YYYY"
        :placeholder="['Từ ngày', 'Đến ngày']"
        aria-label="Khoảng ngày đặt"
        class="w-full"
      />
    </Col>
  </Row>

  <Typography v-if="table.error.value" role="alert" class="mb-4 text-destructive">
    {{ table.error.value }}
  </Typography>

  <Table
    row-key="id"
    :columns="columns"
    :data-source="table.rows.value"
    :loading="table.loading.value"
    :pagination="table.pagination.value"
    :scroll="{ x: 970 }"
    @change="table.onChange"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'number'">{{ table.rowNumber(index) }}</template>
      <template v-else-if="column.key === 'orderCode'">
        <Link :as="RouterLink" :to="`/don-hang/${record.id}`">{{ record.orderCode }}</Link>
      </template>
      <template v-else-if="column.key === 'customer'">
        {{ record.customerName }}
        <Typography variant="caption">{{ record.customerPhone }}</Typography>
      </template>
      <template v-else-if="column.key === 'subtotal'">{{
        formatPrice(record.productSubtotal)
      }}</template>
      <template v-else-if="column.key === 'fee'">{{ formatQuote(record.embroideryFee) }}</template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="ORDER_STATUS_COLORS[record.status as OrderStatus]">
          {{ ORDER_STATUS_LABELS[record.status as OrderStatus] }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'createdAt'">{{
        formatDateTime(record.createdAt)
      }}</template>
    </template>
  </Table>
</template>
