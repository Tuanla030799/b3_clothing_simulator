import type { OrderStatus } from '../../api/orders'

/** Customer-facing order status names (order page and order lookup). */
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Chờ cửa hàng liên hệ',
  CONTACTING: 'Đang liên hệ',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
}

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

/** An API timestamp in Vietnamese date and time, e.g. "24 thg 10, 2026 17:30". */
export function formatOrderDate(iso: string): string {
  return dateTime.format(new Date(iso))
}
