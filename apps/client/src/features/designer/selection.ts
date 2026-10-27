import { type CategoryNode, lineageIds } from '../catalog/categoryTree'
import type { CategoryId, Product, SelectionRules } from './types'

/*
 * Gift-set selection rules as pure functions. They never mutate their input and read every limit
 * from the given SelectionRules, so the UI state (useSelection) and tests share one source of truth.
 *
 * Two limits: an order holds at most `maxOrderItems` items (adding is blocked beyond it), and the
 * set picture shows at most `maxItems` items within the per-category limits. Items outside the
 * picture are still designed and ordered; `pictureIds` decides which items are drawn. A category
 * limit covers the category's whole branch (an item counts for its category and every ancestor).
 */

/** One selected item. Several items may share a productId; instanceId is unique per addition. */
export interface SelectedItem {
  readonly instanceId: string
  readonly productId: string
}

export interface SelectionState {
  /** Selected items in the order they were added. */
  readonly items: readonly SelectedItem[]
  /** The item currently being worked on; null when the set is empty. */
  readonly activeInstanceId: string | null
}

export interface SelectionCatalog {
  readonly products: readonly Product[]
  readonly rules: SelectionRules
  /** The visible category tree; without it every category counts as a root. */
  readonly categories?: readonly CategoryNode[]
}

export type AddBlockReason =
  | { readonly code: 'unknown-product' }
  /** The order already holds `limit` items (maxOrderItems). */
  | { readonly code: 'max-items'; readonly limit: number }
  /** The set cannot change right now (an image is being created). */
  | { readonly code: 'locked' }

export type AddCheck =
  | { readonly ok: true; readonly product: Product }
  | { readonly ok: false; readonly reason: AddBlockReason }

export const emptySelection: SelectionState = { items: [], activeInstanceId: null }

export function findProduct(catalog: SelectionCatalog, productId: string): Product | undefined {
  return catalog.products.find((product) => product.id === productId)
}

/** Category id of every selected item, repeats included (one entry per item). */
export function selectedCategoryIds(
  items: readonly SelectedItem[],
  catalog: SelectionCatalog,
): CategoryId[] {
  return items.flatMap((item) => {
    const product = findProduct(catalog, item.productId)
    return product ? [product.categoryId] : []
  })
}

/** Whether one more instance of the product may be added to the order. */
export function checkCanAdd(
  items: readonly SelectedItem[],
  productId: string,
  catalog: SelectionCatalog,
): AddCheck {
  const product = findProduct(catalog, productId)
  if (!product) return { ok: false, reason: { code: 'unknown-product' } }
  const { maxOrderItems } = catalog.rules
  if (items.length >= maxOrderItems) {
    return { ok: false, reason: { code: 'max-items', limit: maxOrderItems } }
  }
  return { ok: true, product }
}

/**
 * The items drawn in the set picture: in the order they were added, each item is taken while the
 * picture has room (`maxItems`) and its category and every ancestor are under their limits. Later items that do not fit
 * are skipped, so a hat added after three shirts can still be drawn when shirts are limited.
 */
export function pictureIds(items: readonly SelectedItem[], catalog: SelectionCatalog): Set<string> {
  const { maxItems, categoryLimits } = catalog.rules
  const chosen = new Set<string>()
  const perCategory = new Map<CategoryId, number>()
  for (const item of items) {
    if (chosen.size >= maxItems) break
    const product = findProduct(catalog, item.productId)
    if (!product) continue
    const branch = lineageIds(catalog.categories ?? [], product.categoryId)
    const full = branch.some((id) => {
      const limit = categoryLimits[id]
      return limit !== undefined && (perCategory.get(id) ?? 0) >= limit
    })
    if (full) continue
    for (const id of branch) perCategory.set(id, (perCategory.get(id) ?? 0) + 1)
    chosen.add(item.instanceId)
  }
  return chosen
}

/** Appends a new instance and makes it active. A rejected add returns the same state object. */
export function addItem(
  state: SelectionState,
  productId: string,
  catalog: SelectionCatalog,
  createId: () => string,
): { state: SelectionState; check: AddCheck; instanceId?: string } {
  const check = checkCanAdd(state.items, productId, catalog)
  if (!check.ok) return { state, check }

  const instanceId = createId()
  return {
    state: { items: [...state.items, { instanceId, productId }], activeInstanceId: instanceId },
    check,
    instanceId,
  }
}

/** Activates an existing instance; unknown ids leave the state unchanged. */
export function selectItem(state: SelectionState, instanceId: string): SelectionState {
  if (state.activeInstanceId === instanceId) return state
  if (!state.items.some((item) => item.instanceId === instanceId)) return state
  return { ...state, activeInstanceId: instanceId }
}

/**
 * Removes an instance. Removing the active item activates the item that followed it, otherwise
 * the one before it, otherwise nothing. Unknown ids leave the state unchanged.
 */
export function removeItem(state: SelectionState, instanceId: string): SelectionState {
  const index = state.items.findIndex((item) => item.instanceId === instanceId)
  if (index === -1) return state

  const items = state.items.filter((_, i) => i !== index)
  if (state.activeInstanceId !== instanceId)
    return { items, activeInstanceId: state.activeInstanceId }

  const neighbour = items[index] ?? items[index - 1]
  return { items, activeInstanceId: neighbour?.instanceId ?? null }
}
