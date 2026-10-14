import { onScopeDispose, reactive } from 'vue'
import { ordersApi } from '../api/resources'
import type { OrderImage } from '../api/types'

/**
 * Display URLs for order images. Public catalog files have a `url`; private ones (customer
 * images, preview) are read with the admin token and shown as object URLs, revoked on unmount.
 */
export function usePrivateImages() {
  const urls = reactive<Record<string, string | undefined>>({})
  const pending = new Set<string>()
  let disposed = false

  function urlOf(image: OrderImage | null | undefined): string | undefined {
    if (!image) return undefined
    if (image.url) return image.url
    const path = image.contentPath
    if (!path) return undefined
    if (!(path in urls) && !pending.has(path)) {
      pending.add(path)
      ordersApi
        .image(path)
        .then((blob) => {
          if (disposed) return
          urls[path] = URL.createObjectURL(blob)
        })
        .catch(() => {
          if (!disposed) urls[path] = undefined
        })
        .finally(() => pending.delete(path))
    }
    return urls[path]
  }

  onScopeDispose(() => {
    disposed = true
    for (const url of Object.values(urls)) if (url) URL.revokeObjectURL(url)
  })

  return { urlOf }
}
