import { describe, expect, it } from 'vitest'
import { appendItems, type CartItem } from './cart'

const line = (colorId: string) => ({ productId: 'p', productSlug: 'ao', colorId, sizeId: null })
const ids = () => {
  let n = 0
  return () => `c${++n}`
}

describe('appendItems', () => {
  it('adds repeats as separate items with their own ids', () => {
    const { items, result } = appendItems([], [line('a'), line('a')], 3, ids())
    expect(result).toEqual({ ok: true, count: 2 })
    expect(items.map((item) => item.id)).toEqual(['c1', 'c2'])
  })

  it('adds nothing when the items do not all fit under the limit', () => {
    const current: CartItem[] = [{ ...line('a'), id: 'x' }]
    const { items, result } = appendItems(current, [line('b'), line('c')], 2, ids())
    expect(result).toEqual({ ok: false, limit: 2 })
    expect(items).toEqual(current)
  })
})
