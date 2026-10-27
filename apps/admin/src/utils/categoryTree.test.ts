import { describe, expect, it } from 'vitest'
import type { Category } from '../api/types'
import {
  branchHeight,
  branchIds,
  categoryOptions,
  categoryTrail,
  isShownToCustomers,
  outlineNumbers,
  parentOptions,
  ROOT_VALUE,
  treeErrorText,
} from './categoryTree'

function category(
  id: string,
  parentId: string | null,
  depth: number,
  extra: Partial<Category> = {},
): Category {
  return {
    id,
    parentId,
    name: id.toUpperCase(),
    slug: id,
    path: id,
    depth,
    isActive: true,
    sortOrder: 0,
    productCount: 0,
    childCount: 0,
    createdAt: '',
    updatedAt: '',
    ...extra,
  }
}

// Tree order, as the API returns it: ao > thun > co-tron, ao > len (has products), quan.
const tree = [
  category('ao', null, 1, { childCount: 2 }),
  category('thun', 'ao', 2, { childCount: 1 }),
  category('co-tron', 'thun', 3),
  category('len', 'ao', 2, { productCount: 4 }),
  category('quan', null, 1, { isActive: false }),
]

describe('category tree helpers', () => {
  it('builds the trail from the root', () => {
    expect(categoryTrail(tree, 'co-tron')).toBe('AO › THUN › CO-TRON')
    expect(categoryTrail(tree, 'missing')).toBe('')
  })

  it('shows a category only when it and every ancestor are active', () => {
    expect(isShownToCustomers(tree, 'co-tron')).toBe(true)
    const hiddenRoot = tree.map((c) => (c.id === 'ao' ? { ...c, isActive: false } : c))
    expect(isShownToCustomers(hiddenRoot, 'co-tron')).toBe(false)
  })

  it('finds a branch and its height', () => {
    expect([...branchIds(tree, 'ao')].sort()).toEqual(['ao', 'co-tron', 'len', 'thun'])
    expect(branchHeight(tree, 'ao')).toBe(3)
    expect(branchHeight(tree, 'thun')).toBe(2)
    expect(branchHeight(tree, 'quan')).toBe(1)
  })

  it('disables categories with children for a product and marks hidden ones', () => {
    const options = categoryOptions(tree, { leavesOnly: true })
    expect(options.filter((o) => o.disabled).map((o) => o.value)).toEqual(['ao', 'thun'])
    expect(options.find((o) => o.value === 'quan')?.label).toBe('QUAN (đang ẩn)')
    expect(categoryOptions(tree).some((o) => o.disabled)).toBe(false)
  })

  it('offers only parents that keep the tree valid', () => {
    const enabled = (movingId?: string) =>
      parentOptions(tree, movingId)
        .filter((o) => !o.disabled)
        .map((o) => o.value)
    // New category: not under level 3, not under a category with products.
    expect(enabled()).toEqual([ROOT_VALUE, 'ao', 'thun', 'quan'])
    // thun has 2 levels: only a root can take it; its own branch is not offered at all.
    expect(enabled('thun')).toEqual([ROOT_VALUE, 'ao', 'quan'])
    expect(parentOptions(tree, 'thun').map((o) => o.value)).not.toContain('co-tron')
    expect(enabled('ao')).toEqual([ROOT_VALUE])
  })

  it('numbers the tree like an outline', () => {
    expect(Object.fromEntries(outlineNumbers(tree))).toEqual({
      ao: '1',
      thun: '1.1',
      'co-tron': '1.1.1',
      len: '1.2',
      quan: '2',
    })
    // A child whose parent is not in the list is numbered as a root.
    expect(Object.fromEntries(outlineNumbers([tree[1]!, tree[4]!]))).toEqual({
      thun: '1',
      quan: '2',
    })
  })

  it('translates the API reason codes', () => {
    expect(treeErrorText('CATEGORY_DEPTH_EXCEEDED')).toBe('Danh mục chỉ lồng tối đa 3 cấp.')
    expect(treeErrorText('other text')).toBe('other text')
  })
})
