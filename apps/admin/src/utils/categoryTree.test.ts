import { describe, expect, it } from 'vitest'
import type { Category } from '../api/types'
import {
  branchHeight,
  branchIds,
  categoryTrail,
  categoryTree,
  type CategoryTreeNode,
  changedGroups,
  flattenTree,
  isShownToCustomers,
  moveSibling,
  outlineNumbers,
  parentTree,
  pathTo,
  ROOT_VALUE,
  siblingOrder,
  treeErrorText,
} from './categoryTree'

/** Every node of a tree, depth first. */
const nodes = (tree: readonly CategoryTreeNode[]): CategoryTreeNode[] =>
  tree.flatMap((node) => [node, ...nodes(node.children ?? [])])

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
const categories = tree

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

  it('builds the tree with indented names, the trail for the closed select and leaf-only choice', () => {
    const tree = categoryTree(categories, { leavesOnly: true })
    expect(tree.map((node) => node.value)).toEqual(['ao', 'quan'])
    const thun = tree[0]!.children![0]!
    expect(thun).toMatchObject({
      value: 'thun',
      title: 'THUN',
      trail: 'AO › THUN',
      selectable: false,
    })
    expect(thun.children).toEqual([
      { value: 'co-tron', title: 'CO-TRON', trail: 'AO › THUN › CO-TRON' },
    ])
    // Leaves have no children array (no expand icon).
    expect(nodes(tree).find((node) => node.value === 'len')?.children).toBeUndefined()
    expect(nodes(tree).find((node) => node.value === 'quan')?.title).toBe('QUAN (đang ẩn)')
    expect(nodes(categoryTree(categories)).some((node) => node.selectable === false)).toBe(false)
  })

  it('offers only parents that keep the tree valid', () => {
    const enabled = (movingId?: string) =>
      nodes(parentTree(categories, movingId))
        .filter((node) => !node.disabled)
        .map((node) => node.value)
    // New category: not under level 3, not under a category with products.
    expect(enabled()).toEqual([ROOT_VALUE, 'ao', 'thun', 'quan'])
    expect(nodes(parentTree(categories)).find((node) => node.value === 'len')?.title).toBe(
      'LEN (đang có sản phẩm)',
    )
    // thun has 2 levels: only a root can take it; its own branch is not offered at all.
    expect(enabled('thun')).toEqual([ROOT_VALUE, 'ao', 'quan'])
    expect(nodes(parentTree(categories, 'thun')).map((node) => node.value)).not.toContain('co-tron')
    expect(enabled('ao')).toEqual([ROOT_VALUE])
  })

  it('finds the path to a value', () => {
    const tree = categoryTree(categories)
    expect(pathTo(tree, 'co-tron')).toEqual(['ao', 'thun', 'co-tron'])
    expect(pathTo(tree, 'quan')).toEqual(['quan'])
    expect(pathTo(tree, undefined)).toEqual([])
    expect(pathTo(tree, 'missing')).toEqual([])
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

  it('moves categories among siblings only and lists the groups that changed', () => {
    const initial = siblingOrder(tree)
    expect(initial.get(null)).toEqual(['ao', 'quan'])
    expect(initial.get('ao')).toEqual(['thun', 'len'])

    const moved = moveSibling(initial, 'ao', 'len', -1)
    expect(flattenTree(tree, moved).map((c) => c.id)).toEqual([
      'ao',
      'len',
      'thun',
      'co-tron',
      'quan',
    ])
    expect(changedGroups(initial, moved)).toEqual(['ao'])
    // Out of range: nothing changes.
    expect(changedGroups(initial, moveSibling(initial, 'ao', 'thun', -1))).toEqual([])
    // Moving back restores the initial order.
    expect(changedGroups(initial, moveSibling(moved, 'ao', 'len', 1))).toEqual([])
    const roots = moveSibling(moved, null, 'quan', -1)
    expect(changedGroups(initial, roots)).toEqual([null, 'ao'])
    expect(flattenTree(tree, roots).map((c) => c.id)[0]).toBe('quan')
  })

  it('translates the API reason codes', () => {
    expect(treeErrorText('CATEGORY_DEPTH_EXCEEDED')).toBe('Danh mục chỉ lồng tối đa 3 cấp.')
    expect(treeErrorText('other text')).toBe('other text')
  })
})
