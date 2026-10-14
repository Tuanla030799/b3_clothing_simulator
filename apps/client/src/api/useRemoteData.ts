import { onScopeDispose, ref, shallowRef } from 'vue'
import { ApiError, loadErrorMessage } from './http'

/**
 * Loads data once when called and on every `reload()`. Only the latest request may commit: a
 * reload aborts the previous one, and leaving the component aborts the pending request.
 * `error` holds a customer-facing message and `notFound` tells a 404 apart (unknown or hidden
 * item); the previous data stays until new data arrives.
 */
export function useRemoteData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const notFound = ref(false)
  /** HTTP status of the last failure (0 without a response), null after a success. */
  const errorStatus = ref<number | null>(null)
  let controller: AbortController | null = null

  async function reload() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    notFound.value = false
    errorStatus.value = null
    try {
      const result = await load(current.signal)
      if (controller !== current) return
      data.value = result
    } catch (cause) {
      if (controller !== current) return
      error.value = loadErrorMessage(cause)
      notFound.value = cause instanceof ApiError && cause.status === 404
      errorStatus.value = cause instanceof ApiError ? cause.status : 0
      if (import.meta.env.DEV) console.warn('[useRemoteData] load failed', cause)
    } finally {
      if (controller === current) {
        loading.value = false
        controller = null
      }
    }
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  void reload()

  return { data, error, notFound, errorStatus, loading, reload }
}
