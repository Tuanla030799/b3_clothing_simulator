import { describe, expect, it } from 'vitest'
import { products as catalogProducts, selectionRules } from './data/catalog'
import {
  addItem,
  checkCanAdd,
  emptySelection,
  removeItem,
  selectItem,
  type SelectionCatalog,
  type SelectionState,
} from './selection'
import type { Product } from './types'
import { useSelection } from './useSelection'

function product(id: string, categoryId: string): Product {
  return {
    id,
    name: id,
    categoryId,
    image: {},
    displayScale: 1,
    embroideryZones: [],
    provisional: true,
  }
}

const shirt = product('shirt-a', 'shirt')
const otherShirt = product('shirt-b', 'shirt')
const hat = product('hat-a', 'hat')

// Deliberately different from the real 10 / 3 so nothing can pass by hardcoding them.
const catalog: SelectionCatalog = {
  products: [shirt, otherShirt, hat],
  rules: { maxItems: 4, categoryLimits: { shirt: 2 } },
}

function sequentialIds() {
  let n = 0
  return () => `id-${++n}`
}

function addAll(productIds: string[], state: SelectionState = emptySelection) {
  const createId = sequentialIds()
  return productIds.reduce((current, id) => addItem(current, id, catalog, createId).state, state)
}

const ids = (state: SelectionState) => state.items.map((item) => item.instanceId)

describe('adding items', () => {
  it('adds a valid product as a new active instance', () => {
    const result = addItem(emptySelection, hat.id, catalog, () => 'x')
    expect(result.check.ok).toBe(true)
    expect(result.state.items).toEqual([{ instanceId: 'x', productId: hat.id }])
    expect(result.state.activeInstanceId).toBe('x')
  })

  it('creates a distinct instance for every addition of the same product', () => {
    const state = addAll([shirt.id, shirt.id])
    expect(state.items.map((item) => item.productId)).toEqual([shirt.id, shirt.id])
    expect(new Set(ids(state)).size).toBe(2)
    expect(state.activeInstanceId).toBe(ids(state)[1])
  })

  it('blocks a category at its configured limit, counting repeats and other models', () => {
    const state = addAll([shirt.id, otherShirt.id])
    expect(checkCanAdd(state.items, shirt.id, catalog)).toEqual({
      ok: false,
      reason: { code: 'category-limit', categoryId: 'shirt', limit: 2 },
    })
    expect(checkCanAdd(state.items, hat.id, catalog).ok).toBe(true)
  })

  it('blocks every product at the total limit and reports it before a category limit', () => {
    const state = addAll([shirt.id, shirt.id, hat.id, hat.id])
    expect(checkCanAdd(state.items, hat.id, catalog)).toEqual({
      ok: false,
      reason: { code: 'max-items', limit: 4 },
    })
    // The shirt limit is also reached, but the total limit is reported first.
    expect(checkCanAdd(state.items, shirt.id, catalog)).toEqual({
      ok: false,
      reason: { code: 'max-items', limit: 4 },
    })
  })

  it('never exceeds the limits with consecutive adds', () => {
    const state = addAll(Array.from({ length: 10 }, () => shirt.id))
    expect(state.items).toHaveLength(2)
    const mixed = addAll([hat.id, hat.id, hat.id, hat.id, hat.id, shirt.id])
    expect(mixed.items).toHaveLength(4)
  })

  it('leaves the state untouched when an add is rejected', () => {
    const state = addAll([shirt.id, shirt.id])
    const result = addItem(state, shirt.id, catalog, () => 'rejected')
    expect(result.state).toBe(state)
    expect(result.instanceId).toBeUndefined()
  })

  it('rejects unknown products without changing the state', () => {
    const result = addItem(emptySelection, 'missing', catalog, () => 'x')
    expect(result.check).toEqual({ ok: false, reason: { code: 'unknown-product' } })
    expect(result.state).toBe(emptySelection)
  })

  it('frees the limit again after removing an item', () => {
    const state = addAll([shirt.id, shirt.id])
    const afterRemove = removeItem(state, ids(state)[0]!)
    expect(checkCanAdd(afterRemove.items, shirt.id, catalog).ok).toBe(true)
  })
})

describe('selecting and removing items', () => {
  const three = addAll([shirt.id, hat.id, shirt.id]) // id-1, id-2, id-3; active id-3

  it('selects an existing instance and ignores unknown ids', () => {
    const selected = selectItem(three, 'id-1')
    expect(selected.activeInstanceId).toBe('id-1')
    expect(selectItem(selected, 'missing')).toBe(selected)
  })

  it('keeps the active item when removing another one, and keeps remaining ids', () => {
    const state = removeItem(selectItem(three, 'id-1'), 'id-2')
    expect(ids(state)).toEqual(['id-1', 'id-3'])
    expect(state.activeInstanceId).toBe('id-1')
  })

  it('activates the following item, then the previous one, when removing the active item', () => {
    const middle = removeItem(selectItem(three, 'id-2'), 'id-2')
    expect(middle.activeInstanceId).toBe('id-3')

    const last = removeItem(three, 'id-3')
    expect(last.activeInstanceId).toBe('id-2')
  })

  it('returns to an empty state without an active item after removing the last item', () => {
    const one = addAll([hat.id])
    expect(removeItem(one, ids(one)[0]!)).toEqual({ items: [], activeInstanceId: null })
  })

  it('ignores removal of an unknown id', () => {
    expect(removeItem(three, 'missing')).toBe(three)
  })
})

describe('useSelection', () => {
  it('keeps separate state per call and derives counts from the instances', () => {
    const first = useSelection({ catalog })
    const second = useSelection({ catalog })
    first.add(shirt.id)
    first.add(shirt.id)

    expect(first.items.value).toHaveLength(2)
    expect(second.items.value).toHaveLength(0)
    expect(first.selectedCategoryIds.value).toEqual(['shirt', 'shirt'])
    expect(first.activeEntry.value?.position).toBe(2)
    expect(first.canAdd(shirt.id).ok).toBe(false)
  })

  it('uses the configured catalog rules by default', () => {
    const selection = useSelection()
    expect(selection.rules).toBe(selectionRules)
    const limitedCategory = Object.keys(selectionRules.categoryLimits)[0]!
    const limited = catalogProducts.find((entry) => entry.categoryId === limitedCategory)!
    const limit = selectionRules.categoryLimits[limitedCategory]!

    for (let i = 0; i < limit + 2; i++) selection.add(limited.id)
    expect(selection.items.value).toHaveLength(limit)
  })
})
