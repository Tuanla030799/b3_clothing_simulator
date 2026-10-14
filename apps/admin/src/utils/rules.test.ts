import { describe, expect, it } from 'vitest'
import { linkUrlProblem } from './linkUrl'
import { ORDER_TRANSITIONS, quoteRule, statusChangeProblem } from './orderStatus'
import { SLUG_PATTERN, suggestSlug } from './slug'

describe('suggestSlug', () => {
  it('turns Vietnamese names into valid slugs', () => {
    for (const [name, slug] of [
      ['Áo thun Đỏ', 'ao-thun-do'],
      ['  Bộ quà  Giáng sinh 2026!', 'bo-qua-giang-sinh-2026'],
      ['Khăn – choàng', 'khan-choang'],
    ]) {
      expect(suggestSlug(name!)).toBe(slug)
      expect(SLUG_PATTERN.test(suggestSlug(name!))).toBe(true)
    }
  })
})

describe('linkUrlProblem', () => {
  it('accepts empty, internal paths and https URLs', () => {
    for (const link of ['', '/bo-suu-tap/giang-sinh', 'https://lituta.vn/x?y=1']) {
      expect(linkUrlProblem(link), link).toBeNull()
    }
  })

  it('rejects other schemes, protocol-relative paths, credentials and whitespace', () => {
    for (const link of [
      'http://lituta.vn',
      'javascript:alert(1)',
      '//evil.com',
      'https://user:pw@lituta.vn',
      'https://intranet',
      '/a b',
      '/a\\b',
    ]) {
      expect(linkUrlProblem(link), link).not.toBeNull()
    }
  })
})

describe('order status rules', () => {
  it('only allows forward steps and cancelling before shipping', () => {
    expect(ORDER_TRANSITIONS.SHIPPING).toEqual(['DELIVERED'])
    expect(ORDER_TRANSITIONS.DELIVERED).toEqual([])
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([])
  })

  it('needs a quote before confirming and a reason before cancelling', () => {
    expect(statusChangeProblem('CONFIRMED', null, '')).not.toBeNull()
    expect(statusChangeProblem('CONFIRMED', 0, '')).toBeNull()
    expect(statusChangeProblem('CANCELLED', null, '  ')).not.toBeNull()
    expect(statusChangeProblem('CANCELLED', null, 'Khách hủy')).toBeNull()
  })

  it('locks the quote of finished orders and asks for a note after confirmation', () => {
    expect(quoteRule('DELIVERED').allowed).toBe(false)
    expect(quoteRule('PENDING')).toEqual({ allowed: true, noteRequired: false })
    expect(quoteRule('SHIPPING')).toEqual({ allowed: true, noteRequired: true })
  })
})
