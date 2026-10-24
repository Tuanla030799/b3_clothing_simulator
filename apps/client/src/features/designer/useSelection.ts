import { computed, inject, provide, shallowRef, type InjectionKey } from 'vue'
import { createEditLock, type EditLock } from './editLock'
import {
  addItem,
  checkCanAdd,
  emptySelection,
  findProduct,
  pictureIds,
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
  /** Products and limits the selection is checked against (the loaded designer catalog). */
  catalog: SelectionCatalog
  /** Must return a new unique id on every call. Defaults to a per-selection counter. */
  createId?: () => string
  /** Shared edit lock; a new one is created when omitted. Exposed as `selection.lock`. */
  lock?: EditLock
  /**
   * Items to start with (e.g. the cart), in order. Items whose product is not in the catalog are
   * left out; the first remaining item is active.
   */
  initialItems?: readonly SelectedItem[]
}

/**
 * Session state of the gift set. Each call owns its own state (no module singleton), so the page
 * that calls it decides the lifetime: panels and tabs can unmount without losing the selection.
 * The selection itself persists nothing; the design tool keeps the cart in step with it.
 */
export function useSelection(options: UseSelectionOptions) {
  const { catalog } = options
  let counter = 0
  const createId = options.createId ?? (() => `item-${++counter}`)

  const lock = options.lock ?? createEditLock()
  const initial = (options.initialItems ?? []).filter((item) =>
    findProduct(catalog, item.productId),
  )
  const state = shallowRef<SelectionState>(
    initial.length ? { items: initial, activeInstanceId: initial[0]!.instanceId } : emptySelection,
  )

  const entries = computed<SelectedEntry[]>(() =>
    state.value.items.flatMap((item, index) => {
      const product = findProduct(catalog, item.productId)
      return product ? [{ item, product, position: index + 1 }] : []
    }),
  )

  /** Instance ids drawn in the set picture (see pictureIds); the others are designed only. */
  const inPicture = computed(() => pictureIds(state.value.items, catalog))
  const pictureEntries = computed(() =>
    entries.value.filter((entry) => inPicture.value.has(entry.item.instanceId)),
  )

  const activeEntry = computed(
    () =>
      entries.value.find((entry) => entry.item.instanceId === state.value.activeInstanceId) ?? null,
  )

  return {
    rules: catalog.rules,
    /** Held while an image is exported; add/select/remove (and design edits) are refused. */
    lock,
    items: computed(() => state.value.items),
    activeInstanceId: computed(() => state.value.activeInstanceId),
    entries,
    inPicture,
    pictureEntries,
    activeEntry,
    /** Category id per selected item, repeats included — the input of SelectionSummary. */
    selectedCategoryIds: computed(() => selectedCategoryIds(state.value.items, catalog)),
    canAdd: (productId: string): AddCheck =>
      lock.locked.value
        ? { ok: false, reason: { code: 'locked' } }
        : checkCanAdd(state.value.items, productId, catalog),
    /** Re-checks the rules against the current state; returns the new instanceId on success. */
    add(productId: string): AddCheck & { instanceId?: string } {
      if (lock.locked.value) return { ok: false, reason: { code: 'locked' } }
      const result = addItem(state.value, productId, catalog, createId)
      state.value = result.state
      return { ...result.check, instanceId: result.instanceId }
    },
    select(instanceId: string) {
      if (lock.locked.value) return
      state.value = selectItem(state.value, instanceId)
    },
    remove(instanceId: string) {
      if (lock.locked.value) return
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
