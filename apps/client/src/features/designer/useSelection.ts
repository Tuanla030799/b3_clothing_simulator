import { computed, inject, provide, shallowRef, type InjectionKey } from 'vue'
import { products as catalogProducts, selectionRules } from './data/catalog'
import {
  addItem,
  checkCanAdd,
  emptySelection,
  findProduct,
  removeItem,
  selectedCategoryIds,
  selectItem,
  type AddCheck,
  type SelectedItem,
  type SelectionCatalog,
  type SelectionState,
} from './selection'
import type { Product } from './types'

/** A selected item joined with its catalog product and its current 1-based position. */
export interface SelectedEntry {
  item: SelectedItem
  product: Product
  position: number
}

export interface UseSelectionOptions {
  catalog?: SelectionCatalog
  /** Must return a new unique id on every call. Defaults to a per-selection counter. */
  createId?: () => string
}

/**
 * Session state of the gift set. Each call owns its own state (no module singleton), so the page
 * that calls it decides the lifetime: panels and tabs can unmount without losing the selection.
 * Nothing is persisted; a reload starts with an empty set.
 */
export function useSelection(options: UseSelectionOptions = {}) {
  const catalog: SelectionCatalog = options.catalog ?? {
    products: catalogProducts,
    rules: selectionRules,
  }
  let counter = 0
  const createId = options.createId ?? (() => `item-${++counter}`)

  const state = shallowRef<SelectionState>(emptySelection)

  const entries = computed<SelectedEntry[]>(() =>
    state.value.items.flatMap((item, index) => {
      const product = findProduct(catalog, item.productId)
      return product ? [{ item, product, position: index + 1 }] : []
    }),
  )

  const activeEntry = computed(
    () =>
      entries.value.find((entry) => entry.item.instanceId === state.value.activeInstanceId) ?? null,
  )

  return {
    rules: catalog.rules,
    items: computed(() => state.value.items),
    activeInstanceId: computed(() => state.value.activeInstanceId),
    entries,
    activeEntry,
    /** Category id per selected item, repeats included — the input of SelectionSummary. */
    selectedCategoryIds: computed(() => selectedCategoryIds(state.value.items, catalog)),
    canAdd: (productId: string): AddCheck => checkCanAdd(state.value.items, productId, catalog),
    /** Re-checks the rules against the current state; returns the new instanceId on success. */
    add(productId: string): AddCheck & { instanceId?: string } {
      const result = addItem(state.value, productId, catalog, createId)
      state.value = result.state
      return { ...result.check, instanceId: result.instanceId }
    },
    select(instanceId: string) {
      state.value = selectItem(state.value, instanceId)
    },
    remove(instanceId: string) {
      state.value = removeItem(state.value, instanceId)
    },
  }
}

export type Selection = ReturnType<typeof useSelection>

const selectionKey: InjectionKey<Selection> = Symbol('designer-selection')

export function provideSelection(selection: Selection) {
  provide(selectionKey, selection)
}

export function injectSelection(): Selection {
  const selection = inject(selectionKey)
  if (!selection) throw new Error('injectSelection() requires provideSelection() in an ancestor')
  return selection
}
