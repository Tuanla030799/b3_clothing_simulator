import type { CustomerInput } from '../../api/orders'

/*
 * Customer details of an order, checked with the same rules as the API (order-contract.md §1) so
 * most mistakes are shown before sending. The API checks again and stays the authority.
 */

export interface CustomerForm {
  name: string
  phone: string
  address: string
  note: string
}

export type CustomerField = keyof CustomerForm
export type CustomerErrors = Partial<Record<CustomerField, string>>

export const CUSTOMER_LIMITS = { name: 100, address: 500, note: 1000 }

// Control characters other than line breaks/tabs (allowed in the note only).
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
// eslint-disable-next-line no-control-regex
const CONTROL_OR_BREAK = /[\u0000-\u001f\u007f]/

const singleLine = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ')

/**
 * National form of a Vietnamese phone number, or null when it is not one: separators removed,
 * +84/84 → 0, then a mobile (0[35789] + 8 digits) or landline (02 + 9 digits) number.
 */
export function normalizePhone(value: string): string | null {
  let digits = value.trim().replace(/[\s.\-()]/g, '')
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`
  else if (digits.startsWith('84') && digits.length > 10) digits = `0${digits.slice(2)}`
  return /^0[35789]\d{8}$/.test(digits) || /^02\d{9}$/.test(digits) ? digits : null
}

export function validateCustomer(form: CustomerForm): {
  errors: CustomerErrors
  value: CustomerInput | null
} {
  const errors: CustomerErrors = {}
  const name = singleLine(form.name)
  const address = singleLine(form.address)
  const note = form.note.normalize('NFC').trim()
  const phone = normalizePhone(form.phone)

  if (!name) errors.name = 'Vui lòng nhập họ tên.'
  else if (name.length > CUSTOMER_LIMITS.name)
    errors.name = `Họ tên tối đa ${CUSTOMER_LIMITS.name} ký tự.`
  else if (CONTROL_OR_BREAK.test(name)) errors.name = 'Họ tên có ký tự không hợp lệ.'

  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.'
  else if (!phone) errors.phone = 'Số điện thoại không hợp lệ (ví dụ 0912 345 678).'

  if (!address) errors.address = 'Vui lòng nhập địa chỉ nhận hàng.'
  else if (address.length > CUSTOMER_LIMITS.address)
    errors.address = `Địa chỉ tối đa ${CUSTOMER_LIMITS.address} ký tự.`
  else if (CONTROL_OR_BREAK.test(address)) errors.address = 'Địa chỉ có ký tự không hợp lệ.'

  if (note.length > CUSTOMER_LIMITS.note)
    errors.note = `Ghi chú tối đa ${CUSTOMER_LIMITS.note} ký tự.`
  else if (CONTROL.test(note)) errors.note = 'Ghi chú có ký tự không hợp lệ.'

  if (Object.keys(errors).length > 0 || !phone) return { errors, value: null }
  return { errors, value: { name, phone, address, note: note || null } }
}

const API_FIELD_MESSAGES: Record<CustomerField, string> = {
  name: 'Họ tên không hợp lệ.',
  phone: 'Số điện thoại không hợp lệ (ví dụ 0912 345 678).',
  address: 'Địa chỉ không hợp lệ.',
  note: 'Ghi chú không hợp lệ.',
}

/**
 * Field errors of a rejected order mapped to the form (`customer.phone` → phone). API messages
 * are English, so each field gets its Vietnamese message; `other` counts the remaining errors.
 */
export function customerErrorsFromApi(errors: readonly { field: string }[]) {
  const fields: CustomerErrors = {}
  let other = 0
  for (const error of errors) {
    const field = error.field.startsWith('customer.') ? error.field.slice('customer.'.length) : ''
    if (field in API_FIELD_MESSAGES)
      fields[field as CustomerField] = API_FIELD_MESSAGES[field as CustomerField]
    else other++
  }
  return { fields, other }
}
