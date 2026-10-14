import { describe, expect, it } from 'vitest'
import { customerErrorsFromApi, normalizePhone, validateCustomer } from './customer'

describe('normalizePhone', () => {
  it('accepts mobile and landline numbers written with separators or +84', () => {
    expect(normalizePhone('0912 345 678')).toBe('0912345678')
    expect(normalizePhone('+84 912.345.678')).toBe('0912345678')
    expect(normalizePhone('84912345678')).toBe('0912345678')
    expect(normalizePhone('(028) 3822-1234')).toBe('02838221234')
  })

  it('rejects numbers that are not Vietnamese mobile or landline numbers', () => {
    for (const value of ['', '091234567', '09123456789', '0112345678', '0212345678', 'abc']) {
      expect(normalizePhone(value), value).toBeNull()
    }
  })
})

describe('validateCustomer', () => {
  const valid = {
    name: '  Nguyễn   Văn A ',
    phone: '0912 345 678',
    address: ' 12 Lê Lợi,\n Q1 ',
    note: '',
  }

  it('returns the normalised values the API expects (blank note = null)', () => {
    expect(validateCustomer(valid)).toEqual({
      errors: {},
      value: { name: 'Nguyễn Văn A', phone: '0912345678', address: '12 Lê Lợi, Q1', note: null },
    })
  })

  it('keeps line breaks in the note', () => {
    expect(validateCustomer({ ...valid, note: 'Gọi sau 18h\nCảm ơn' }).value?.note).toBe(
      'Gọi sau 18h\nCảm ơn',
    )
  })

  it('reports every invalid field at once and returns no value', () => {
    const result = validateCustomer({
      name: ' ',
      phone: '123',
      address: '',
      note: 'x'.repeat(1001),
    })
    expect(result.value).toBeNull()
    expect(Object.keys(result.errors).sort()).toEqual(['address', 'name', 'note', 'phone'])
  })

  it('applies the API length limits', () => {
    expect(validateCustomer({ ...valid, name: 'a'.repeat(101) }).errors.name).toBeDefined()
    expect(validateCustomer({ ...valid, name: 'a'.repeat(100) }).errors.name).toBeUndefined()
    expect(validateCustomer({ ...valid, address: 'a'.repeat(501) }).errors.address).toBeDefined()
  })
})

describe('customerErrorsFromApi', () => {
  it('maps customer fields to the form and counts the others', () => {
    expect(
      customerErrorsFromApi([
        { field: 'customer.phone' },
        { field: 'source.design.items.0.sizeId' },
        { field: 'customer.unknown' },
      ]),
    ).toEqual({ fields: { phone: expect.any(String) }, other: 2 })
  })
})
