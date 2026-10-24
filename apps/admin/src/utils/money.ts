/*
 * Vietnamese money (VND, whole dong). Amounts are integers everywhere; these helpers only change
 * how they are shown and typed.
 */

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

/** Display: 199000 → "199.000 ₫" (Vietnamese grouping). */
export const formatVnd = (amount: number) => vnd.format(amount)

/**
 * Money input display (Ant InputNumber `formatter`): digits grouped by three with commas while
 * typing, e.g. "1500000" → "1,500,000". Anything but digits is dropped.
 */
export function formatMoneyInput(value: string | number | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Money input value (Ant InputNumber `parser`): "1,500,000 ₫" → "1500000". */
export function parseMoneyInput(text: string | undefined): string {
  return (text ?? '').replace(/\D/g, '')
}
