import { describe, expect, it } from 'vitest'
import {
  addItem,
  checkCanAdd,
  emptySelection,
  pictureIds,
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
    productId: 'model',
    productSlug: 'model',
  }
}

const shirt = product('shirt-a', 'shirt')
const otherShirt = product('shirt-b', 'shirt')
const hat = product('hat-a', 'hat')

// Deliberately different from the real 10 / 3 / 50 so nothing can pass by hardcoding them.
const catalog: SelectionCatalog = {
  products: [shirt, otherShirt, hat],
  rules: { maxItems: 4, categoryLimits: { shirt: 2 }, maxOrderItems: 6 },
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

  it('only blocks adding at the order limit, not at the picture limits', () => {
    const state = addAll([shirt.id, otherShirt.id, shirt.id, hat.id, hat.id])
    expect(state.items).toHaveLength(5)
    expect(checkCanAdd(state.items, shirt.id, catalog).ok).toBe(true)
    const full = addAll(Array.from({ length: 9 }, () => shirt.id))
    expect(full.items).toHaveLength(6)
    expect(checkCanAdd(full.items, hat.id, catalog)).toEqual({
      ok: false,
      reason: { code: 'max-items', limit: 6 },
    })
  })

  it('draws the first items that fit the picture limits, counting repeats', () => {
    // Shirts are limited to 2 in the picture; a later hat still fits.
    const state = addAll([shirt.id, otherShirt.id, shirt.id, hat.id, hat.id, hat.id])
    expect([...pictureIds(state.items, catalog)]).toEqual(['id-1', 'id-2', 'id-4', 'id-5'])
  })

  it('applies a parent category limit to its whole branch, next to the child limits', () => {
    // apparel > shirt, apparel > hat; at most 3 apparel items and 2 shirts in the picture.
    const tree: SelectionCatalog = {
      ...catalog,
      rules: { ...catalog.rules, maxItems: 10, categoryLimits: { apparel: 3, shirt: 2 } },
      categories: [
        { id: 'apparel', parentId: null },
        { id: 'shirt', parentId: 'apparel' },
        { id: 'hat', parentId: 'apparel' },
      ],
    }
    const createId = sequentialIds()
    const state = [shirt.id, shirt.id, shirt.id, hat.id, hat.id].reduce(
      (current, id) => addItem(current, id, tree, createId).state,
      emptySelection,
    )
    // The third shirt is over the shirt limit, the second hat over the apparel limit.
    expect([...pictureIds(state.items, tree)]).toEqual(['id-1', 'id-2', 'id-4'])
    // Without the tree, every category is a root and only the shirt limit applies.
    expect([...pictureIds(state.items, { ...tree, categories: undefined })]).toEqual([
      'id-1',
      'id-2',
      'id-4',
      'id-5',
    ])
  })

  it('leaves the state untouched when an add is rejected', () => {
    const state = addAll(Array.from({ length: 6 }, () => shirt.id))
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
    first.add(shirt.id)
    // The third shirt is in the order but not in the picture (shirts: 2).
    expect(first.canAdd(shirt.id).ok).toBe(true)
    expect(first.pictureEntries.value.map((entry) => entry.position)).toEqual([1, 2])
  })
})
