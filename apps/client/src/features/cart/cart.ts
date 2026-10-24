import { computed, shallowRef } from 'vue'
import { publicCatalog } from '../../api/publicCatalog'

/*
 * The cart: product colors the customer picked, kept in this browser (localStorage) so it survives
 * reloads and is shared by the tabs of the site. It stores ids only; names, images and prices are
 * always read from the API. Each entry is one physical item (repeats are separate entries) and its
 * id is the designer's instance id, so the design tool works on the cart items directly.
 *
 * Storage can be unavailable (private mode, blocked site data): every access is guarded and the
 * cart then lives in memory for this page only.
 */

export interface CartItem {
  /** Unique per item; the designer's instanceId. */
  id: string
  productId: string
  productSlug: string
  /** The API color id (the designer's product id). */
  colorId: string
}

const STORAGE_KEY = 'lituta.cart'

function isCartItem(value: unknown): value is CartItem {
  const item = value as Partial<CartItem> | null
  return (
    typeof item?.id === 'string' &&
    typeof item.productId === 'string' &&
    typeof item.productSlug === 'string' &&
    typeof item.colorId === 'string'
  )
}

function read(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : []
  } catch {
    return []
  }
}

function write(items: readonly CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Not stored; the in-memory cart still works on this page.
  }
}

const items = shallowRef<CartItem[]>(read())

// Another tab changed the cart.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) items.value = read()
  })
}

function set(next: CartItem[]) {
  items.value = next
  write(next)
}

export const newCartItemId = () => `cart-${crypto.randomUUID()}`

// The order limit comes from the designer config (never hardcoded); loaded once when needed.
let limitRequest: Promise<number> | null = null
export function cartLimit(): Promise<number> {
  limitRequest ??= publicCatalog.designerConfig().then(
    (config) => config.selection.maxOrderItems,
    (error: unknown) => {
      limitRequest = null
      throw error
    },
  )
  return limitRequest
}

export type AddResult = { ok: true; count: number } | { ok: false; limit: number }

/** Appends items when they fit under `limit` (all or none). */
export function appendItems(
  current: readonly CartItem[],
  added: readonly Omit<CartItem, 'id'>[],
  limit: number,
  newId: () => string = newCartItemId,
): { items: CartItem[]; result: AddResult } {
  if (current.length + added.length > limit) {
    return { items: [...current], result: { ok: false, limit } }
  }
  const next = [...current, ...added.map((item) => ({ ...item, id: newId() }))]
  return { items: next, result: { ok: true, count: next.length } }
}

export function useCart() {
  return {
    items: computed(() => items.value),
    count: computed(() => items.value.length),
    /** Adds the items if the cart stays within the order limit of the API. */
    async add(added: readonly Omit<CartItem, 'id'>[]): Promise<AddResult> {
      const limit = await cartLimit()
      const { items: next, result } = appendItems(items.value, added, limit)
      if (result.ok) set(next)
      return result
    },
    remove(id: string) {
      set(items.value.filter((item) => item.id !== id))
    },
    /** Replaces the whole cart (the design tool keeps it in step with the set being designed). */
    replace(next: readonly CartItem[]) {
      const same =
        next.length === items.value.length &&
        next.every((item, index) => {
          const current = items.value[index]
          return current?.id === item.id && current.colorId === item.colorId
        })
      if (!same) set([...next])
    },
  }
}

export type Cart = ReturnType<typeof useCart>
