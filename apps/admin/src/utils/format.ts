const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

/** Whole VND, e.g. 199000 → "199.000 ₫". */
export const formatPrice = (amount: number) => vnd.format(amount)

/** null means "not quoted yet" (not the same as 0 = free). */
export const formatQuote = (amount: number | null, unquoted = 'Chưa báo giá') =>
  amount === null ? unquoted : vnd.format(amount)

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
