const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  currencyDisplay: 'code',
})

/** Whole VND as shown to customers, e.g. 199000 → "199.000 VND". Prices come from the API. */
export function formatPrice(amount: number): string {
  return vnd.format(amount)
}
