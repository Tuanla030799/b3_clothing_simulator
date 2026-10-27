import type { Category } from '../api/types'

/*
 * Category tree helpers (API docs/category-tree-contract.md): at most MAX_CATEGORY_DEPTH levels,
 * only categories without children hold products, a category is shown to customers only when it
 * and every ancestor are active. `categoriesApi.all()` returns the flat list in tree order, so
 * these helpers keep that order.
 */
export const MAX_CATEGORY_DEPTH = 3

type Node = Pick<Category, 'id' | 'parentId' | 'name' | 'isActive'>

function byId<T extends Node>(categories: readonly T[]): Map<string, T> {
  return new Map(categories.map((category) => [category.id, category]))
}

/** The category and its ancestors, root first. */
export function lineage<T extends Node>(categories: readonly T[], id: string): T[] {
  const index = byId(categories)
  const chain: T[] = []
  for (let node = index.get(id); node && chain.length <= MAX_CATEGORY_DEPTH;) {
    chain.unshift(node)
    node = node.parentId === null ? undefined : index.get(node.parentId)
  }
  return chain
}

/** "Áo › Áo thun": the names from the root, the way categories are shown in selects. */
export function categoryTrail(categories: readonly Node[], id: string): string {
  return lineage(categories, id)
    .map((node) => node.name)
    .join(' › ')
}

/** Shown to customers: the category and every ancestor are active. */
export function isShownToCustomers(categories: readonly Node[], id: string): boolean {
  const chain = lineage(categories, id)
  return chain.length > 0 && chain.every((node) => node.isActive)
}

/** The category and all its descendants. */
export function branchIds(categories: readonly Node[], id: string): Set<string> {
  const ids = new Set([id])
  // Tree order puts children after their parent, but walk until stable to not rely on it.
  for (let size = 0; size !== ids.size;) {
    size = ids.size
    for (const category of categories) {
      if (category.parentId !== null && ids.has(category.parentId)) ids.add(category.id)
    }
  }
  return ids
}

/** Levels of the branch rooted at `id` (1 for a category without children). */
export function branchHeight(categories: readonly Category[], id: string): number {
  const branch = branchIds(categories, id)
  const own = categories.find((category) => category.id === id)?.depth ?? 1
  return Math.max(
    1,
    ...categories
      .filter((category) => branch.has(category.id))
      .map((category) => category.depth - own + 1),
  )
}

/** A node of a category TreeSelect (CategoryTreeSelect). */
export interface CategoryTreeNode {
  value: string
  /** Name shown in the tree (children are indented under their parent). */
  title: string
  /** Full trail ("Áo › Áo thun") shown in the closed select. */
  trail: string
  /** Shown greyed out and not selectable. */
  disabled?: boolean
  /** Not selectable but still expandable (a category with children for a product). */
  selectable?: boolean
  children?: CategoryTreeNode[]
}

interface NodeLook {
  /** Leave the category (and its branch) out. */
  skip?: boolean
  disabled?: boolean
  selectable?: boolean
  /** Shown after the name, e.g. "(đang ẩn)". */
  note?: string | null
}

function buildTree(
  categories: readonly Category[],
  look: (category: Category) => NodeLook,
): CategoryTreeNode[] {
  const build = (parentId: string | null): CategoryTreeNode[] =>
    categories
      .filter((category) => category.parentId === parentId)
      .flatMap((category) => {
        const { skip, disabled, selectable, note } = look(category)
        if (skip) return []
        const suffix = note ? ` (${note})` : ''
        const children = build(category.id)
        return [
          {
            value: category.id,
            title: category.name + suffix,
            trail: categoryTrail(categories, category.id) + suffix,
            ...(disabled ? { disabled: true } : {}),
            ...(selectable === false ? { selectable: false } : {}),
            ...(children.length > 0 ? { children } : {}),
          },
        ]
      })
  return build(null)
}

/**
 * The category tree for a select, in the API order. With `leavesOnly` (a product's category)
 * categories that have children can be expanded but not chosen. Hidden ones are marked.
 */
export function categoryTree(
  categories: readonly Category[],
  { leavesOnly = false }: { leavesOnly?: boolean } = {},
): CategoryTreeNode[] {
  return buildTree(categories, (category) => ({
    ...(leavesOnly && category.childCount > 0 ? { selectable: false } : {}),
    note: isShownToCustomers(categories, category.id) ? null : 'đang ẩn',
  }))
}

/** Value of the "no parent" choice in the parent select. */
export const ROOT_VALUE = 'root'

/**
 * Possible parents of a new category (`movingId` undefined) or of an existing one, as a tree
 * after a "no parent" choice. The category and its descendants are left out; a parent must have
 * no products and the branch must still fit in MAX_CATEGORY_DEPTH levels (others are disabled
 * with the reason). The API enforces the same rules.
 */
export function parentTree(categories: readonly Category[], movingId?: string): CategoryTreeNode[] {
  const branch = movingId === undefined ? new Set<string>() : branchIds(categories, movingId)
  const height = movingId === undefined ? 1 : branchHeight(categories, movingId)
  const root = 'Không có (danh mục gốc)'
  return [
    { value: ROOT_VALUE, title: root, trail: root },
    ...buildTree(categories, (category) => {
      if (branch.has(category.id)) return { skip: true }
      const reason =
        category.depth + height > MAX_CATEGORY_DEPTH
          ? 'quá 3 cấp'
          : category.productCount > 0
            ? 'đang có sản phẩm'
            : null
      return { disabled: reason !== null, note: reason }
    }),
  ]
}

/** The value and the values of its ancestors in `tree` (root first), or [] when absent. */
export function pathTo(tree: readonly CategoryTreeNode[], value: string | undefined): string[] {
  if (value === undefined) return []
  for (const node of tree) {
    if (node.value === value) return [node.value]
    const below = pathTo(node.children ?? [], value)
    if (below.length > 0) return [node.value, ...below]
  }
  return []
}

/**
 * Outline numbers in tree order: "1", "1.1", "1.1.2"… Each number is the position among siblings
 * (in the order given), prefixed by the parent's number. Computed on the full list so a filtered
 * view keeps the same numbers.
 */
export function outlineNumbers(categories: readonly Node[]): Map<string, string> {
  const numbers = new Map<string, string>()
  const counters = new Map<string | null, number>()
  // Tree order lists a parent before its children, so the parent's number is always known.
  for (const category of categories) {
    const parent = category.parentId === null ? undefined : numbers.get(category.parentId)
    const key = parent === undefined ? null : category.parentId
    const position = (counters.get(key) ?? 0) + 1
    counters.set(key, position)
    numbers.set(category.id, parent === undefined ? String(position) : `${parent}.${position}`)
  }
  return numbers
}

/** Children ids of every parent (null = the roots), in the order of the list. */
export type SiblingOrder = Map<string | null, string[]>

export function siblingOrder(categories: readonly Node[]): SiblingOrder {
  const order: SiblingOrder = new Map()
  for (const category of categories) {
    order.set(category.parentId, [...(order.get(category.parentId) ?? []), category.id])
  }
  return order
}

/** The categories in tree order following `order` (parents before their children). */
export function flattenTree<T extends Node>(categories: readonly T[], order: SiblingOrder): T[] {
  const index = byId(categories)
  const result: T[] = []
  const visit = (parentId: string | null) => {
    for (const id of order.get(parentId) ?? []) {
      const category = index.get(id)
      if (!category) continue
      result.push(category)
      visit(id)
    }
  }
  visit(null)
  return result
}

/** A copy of `order` with the category moved one place up (-1) or down (+1) among its siblings. */
export function moveSibling(
  order: SiblingOrder,
  parentId: string | null,
  id: string,
  delta: number,
): SiblingOrder {
  const siblings = order.get(parentId) ?? []
  const from = siblings.indexOf(id)
  const to = from + delta
  const next = new Map(order)
  if (from === -1 || to < 0 || to >= siblings.length) return next
  const moved = [...siblings]
  moved.splice(from, 1)
  moved.splice(to, 0, id)
  next.set(parentId, moved)
  return next
}

/** Parents whose children are in a different order in `next` than in `initial`. */
export function changedGroups(initial: SiblingOrder, next: SiblingOrder): (string | null)[] {
  return [...next]
    .filter(([parentId, ids]) => {
      const before = initial.get(parentId) ?? []
      return ids.some((id, i) => before[i] !== id)
    })
    .map(([parentId]) => parentId)
}

/** Vietnamese text for the reason codes the API puts in a 409 (`errors[0].message`). */
const TREE_ERRORS: Record<string, string> = {
  CATEGORY_DEPTH_EXCEEDED: 'Danh mục chỉ lồng tối đa 3 cấp.',
  CATEGORY_HAS_PRODUCTS:
    'Danh mục cha đang có sản phẩm; chỉ danh mục chưa có sản phẩm mới có danh mục con.',
  CATEGORY_CYCLE: 'Không chuyển được danh mục vào chính nó hoặc danh mục con của nó.',
  CATEGORY_NOT_LEAF: 'Chỉ chọn được danh mục không có danh mục con.',
}

export function treeErrorText(message: string): string {
  return TREE_ERRORS[message] ?? message
}
