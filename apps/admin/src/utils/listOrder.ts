import { ApiError } from '../api/httpClient'

/*
 * Sorting mode of the admin lists (API docs/list-order-contract.md): rows are reordered locally
 * and the whole order is saved at once with `PUT .../order { ids }`.
 */

/** A copy of `rows` with the row at `from` moved to `to` (out-of-range moves change nothing). */
export function moveRow<T>(rows: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) {
    return [...rows]
  }
  const next = [...rows]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved as T)
  return next
}

/** Whether two id lists are in the same order. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/** The API refused the save because the list changed since it was loaded (409 LIST_CHANGED). */
export function isListChanged(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    error.errors.some((entry) => entry.message === 'LIST_CHANGED')
  )
}
