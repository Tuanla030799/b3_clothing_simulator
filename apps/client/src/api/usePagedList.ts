import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { ApiError, loadErrorMessage, type Paged } from './http'

/**
 * A paged list shown with a "load more" button. `reset()` starts again from page 1 (call it when
 * filters change); only the latest request may commit, and leaving the component aborts it.
 * A failed page keeps the entries already shown, so `loadMore()` can simply be retried.
 */
export function usePagedList<T>(
  loadPage: (page: number, signal: AbortSignal) => Promise<Paged<T>>,
) {
  const entries = shallowRef<T[]>([])
  const total = ref(0)
  const page = ref(0)
  const lastPage = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)
  let controller: AbortController | null = null

  async function fetchPage(next: number) {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const result = await loadPage(next, current.signal)
      if (controller !== current) return
      entries.value = next === 1 ? result.entries : [...entries.value, ...result.entries]
      total.value = result.paging.total
      page.value = next
      lastPage.value = result.paging.lastPage
    } catch (cause) {
      if (controller !== current) return
      error.value = loadErrorMessage(cause)
      notFound.value = cause instanceof ApiError && cause.status === 404
      if (import.meta.env.DEV) console.warn('[usePagedList] load failed', cause)
    } finally {
      if (controller === current) {
        loading.value = false
        controller = null
      }
    }
  }

  function reset() {
    entries.value = []
    total.value = 0
    page.value = 0
    lastPage.value = 0
    return fetchPage(1)
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    entries,
    total,
    loading,
    error,
    notFound,
    /** True once the first page has arrived. */
    loaded: computed(() => page.value > 0),
    hasMore: computed(() => page.value > 0 && page.value < lastPage.value),
    reset,
    /** Loads the next page, or retries the first one after a failure. */
    loadMore: () => fetchPage(page.value + 1),
  }
}
