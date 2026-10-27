/*
 * Category tree helpers (API docs/category-tree-contract.md). The public API lists the visible
 * categories flat, in tree order, each with its `parentId`; trees are at most 3 levels deep and
 * only categories without children hold products. `path` ("ao/ao-thun") is the URL key.
 */

export interface CategoryNode {
  id: string
  parentId: string | null
}

const MAX_DEPTH = 3

/** The category id followed by its ancestors' ids (leaf first). Unknown ids count as roots. */
export function lineageIds(categories: readonly CategoryNode[], id: string): string[] {
  const parents = new Map(categories.map((category) => [category.id, category.parentId]))
  const chain = [id]
  for (let parent = parents.get(id); parent && chain.length < MAX_DEPTH;) {
    chain.push(parent)
    parent = parents.get(parent)
  }
  return chain
}

/** 1 for a root (or an unknown category), at most 3. */
export function depthOf(categories: readonly CategoryNode[], id: string): number {
  return lineageIds(categories, id).length
}

/** The category and its ancestors, root first (unknown ids are left out). */
export function lineage<T extends CategoryNode>(categories: readonly T[], id: string): T[] {
  const byId = new Map(categories.map((category) => [category.id, category]))
  return lineageIds(categories, id)
    .reverse()
    .flatMap((ancestor) => byId.get(ancestor) ?? [])
}

/** Direct children of `parentId` (null = the roots), in the API order. */
export function childrenOf<T extends CategoryNode>(
  categories: readonly T[],
  parentId: string | null,
): T[] {
  return categories.filter((category) => category.parentId === parentId)
}

/** Route location of a category's product list (`/danh-muc/ao/ao-thun`). */
export function categoryRoute(path: string) {
  return { name: 'category', params: { path: path.split('/') } } as const
}
