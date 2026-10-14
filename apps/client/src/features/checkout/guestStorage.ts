import type { GuestSession } from '../../api/orders'

/*
 * Guest token and the last order, kept in sessionStorage (this tab only, gone when it closes).
 * Storage can be unavailable (private mode, blocked site data): every access is guarded and the
 * flow still works without it, only the order page cannot be reopened after a reload.
 */

const SESSION_KEY = 'lituta.guestSession'
const LAST_ORDER_KEY = 'lituta.lastOrder'
/** A session this close to expiry is not reused: uploads and the order must fit before it ends. */
const MIN_REMAINING_MS = 10 * 60 * 1000

export interface LastOrder {
  id: string
  orderCode: string
}

function read<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not stored; the in-memory flow continues.
  }
}

/** The stored session if it is still usable for `minRemainingMs` (default 10 minutes). */
export function loadGuestSession(now = Date.now(), minRemainingMs = MIN_REMAINING_MS) {
  const session = read<GuestSession>(SESSION_KEY)
  if (!session || typeof session.guestToken !== 'string') return null
  const expires = Date.parse(session.expiresAt)
  return Number.isFinite(expires) && expires - now > minRemainingMs ? session : null
}

export const saveGuestSession = (session: GuestSession | null) => write(SESSION_KEY, session)

export const loadLastOrder = () => read<LastOrder>(LAST_ORDER_KEY)
export const saveLastOrder = (order: LastOrder) => write(LAST_ORDER_KEY, order)
