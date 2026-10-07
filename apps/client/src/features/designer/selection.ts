import type { CategoryId, Product, SelectionRules } from './types'

/*
 * Gift-set selection rules as pure functions. They never mutate their input and read every limit
 * from the given SelectionRules, so the UI state (useSelection) and tests share one source of truth.
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
}

export type AddBlockReason =
  | { readonly code: 'unknown-product' }
  | { readonly code: 'max-items'; readonly limit: number }
  | { readonly code: 'category-limit'; readonly categoryId: CategoryId; readonly limit: number }

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

/**
 * Whether one more instance of the product may be added. The total limit is reported before a
 * category limit when both are reached.
 */
export function checkCanAdd(
  items: readonly SelectedItem[],
  productId: string,
  catalog: SelectionCatalog,
): AddCheck {
  const product = findProduct(catalog, productId)
  if (!product) return { ok: false, reason: { code: 'unknown-product' } }

  const { maxItems, categoryLimits } = catalog.rules
  if (items.length >= maxItems) {
    return { ok: false, reason: { code: 'max-items', limit: maxItems } }
  }

  const categoryLimit = categoryLimits[product.categoryId]
  if (categoryLimit !== undefined) {
    const inCategory = selectedCategoryIds(items, catalog).filter(
      (id) => id === product.categoryId,
    ).length
    if (inCategory >= categoryLimit) {
      return {
        ok: false,
        reason: { code: 'category-limit', categoryId: product.categoryId, limit: categoryLimit },
      }
    }
  }

  return { ok: true, product }
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
