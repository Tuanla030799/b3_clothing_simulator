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

export interface CategoryOption {
  label: string
  value: string
  disabled?: boolean
}

/**
 * Select options in tree order, labelled with the full trail. With `leavesOnly` (a product's
 * category) categories that have children are listed but disabled.
 */
export function categoryOptions(
  categories: readonly Category[],
  { leavesOnly = false }: { leavesOnly?: boolean } = {},
): CategoryOption[] {
  return categories.map((category) => ({
    label:
      categoryTrail(categories, category.id) +
      (isShownToCustomers(categories, category.id) ? '' : ' (đang ẩn)'),
    value: category.id,
    ...(leavesOnly && category.childCount > 0 ? { disabled: true } : {}),
  }))
}

/** Value of the "no parent" choice in the parent select. */
export const ROOT_VALUE = 'root'

/**
 * Possible parents of a new category (`movingId` undefined) or of an existing one. A parent
 * cannot be the category or one of its descendants, must have no products, and the branch must
 * still fit in MAX_CATEGORY_DEPTH levels; the API enforces the same rules.
 */
export function parentOptions(
  categories: readonly Category[],
  movingId?: string,
): CategoryOption[] {
  const branch = movingId === undefined ? new Set<string>() : branchIds(categories, movingId)
  const height = movingId === undefined ? 1 : branchHeight(categories, movingId)
  return [
    { label: 'Không có (danh mục gốc)', value: ROOT_VALUE },
    ...categories
      .filter((category) => !branch.has(category.id))
      .map((category) => {
        const reason =
          category.depth + height > MAX_CATEGORY_DEPTH
            ? 'quá 3 cấp'
            : category.productCount > 0
              ? 'đang có sản phẩm'
              : null
        return {
          label: categoryTrail(categories, category.id) + (reason ? ` (${reason})` : ''),
          value: category.id,
          ...(reason ? { disabled: true } : {}),
        }
      }),
  ]
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
