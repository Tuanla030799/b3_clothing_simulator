import type { OrderStatus } from '../api/types'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ liên hệ',
  CONTACTING: 'Đang liên hệ',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
}

/** Tag colors (Ant Design preset names). */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'gold',
  CONTACTING: 'blue',
  CONFIRMED: 'cyan',
  SHIPPING: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'default',
}

/**
 * Allowed changes, the same table as the API (admin-orders/order-transitions.ts); the API checks
 * again. Delivered and cancelled orders are final.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONTACTING', 'CANCELLED'],
  CONTACTING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

export interface QuoteRule {
  allowed: boolean
  /** A note is required when changing the fee after confirmation. */
  noteRequired: boolean
}

/** Quote rules of the API: final orders cannot change; after confirmation a note is required. */
export function quoteRule(status: OrderStatus): QuoteRule {
  if (status === 'DELIVERED' || status === 'CANCELLED')
    return { allowed: false, noteRequired: false }
  return { allowed: true, noteRequired: status === 'CONFIRMED' || status === 'SHIPPING' }
}

/** Why a status change cannot be sent yet, or null. */
export function statusChangeProblem(
  target: OrderStatus,
  embroideryFee: number | null,
  note: string,
): string | null {
  if (target === 'CONFIRMED' && embroideryFee === null) {
    return 'Cần báo phí thêu (0 nếu miễn phí) trước khi xác nhận.'
  }
  if (target === 'CANCELLED' && !note.trim()) return 'Cần ghi lý do hủy.'
  return null
}
