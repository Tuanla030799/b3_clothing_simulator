import type { OrderItemInput, OrderZoneInput } from '../../api/orders'
import type { DesignState } from '../designer/design'
import type { Product } from '../designer/types'

/** One selected item at checkout: its catalog product (an API color) and the chosen size. */
export interface CheckoutItem {
  instanceId: string
  product: Product
  /** Required by the API when the product has sizes; null when it has none. */
  sizeId: string | null
}

/**
 * Order items of `source.design` (API guest-design-contract.md §4.2) from the designer state:
 * instanceId → clientItemId, zones in catalog order with only the layers that exist, uploaded
 * images by server file id (`fileIdOf`), presets by preset id. Items without design get `zones: []`.
 */
export function buildOrderItems(
  items: readonly CheckoutItem[],
  designs: DesignState,
  fileIdOf: (uploadId: string) => string,
): OrderItemInput[] {
  return items.map(({ instanceId, product, sizeId }) => {
    const byZone = designs[instanceId] ?? {}
    const zones: OrderZoneInput[] = []
    for (const zone of product.embroideryZones) {
      const design = byZone[zone.id]
      const text = design?.text && design.text.content.trim() ? design.text : undefined
      const image = design?.image
      if (!text && !image) continue
      const entry: OrderZoneInput = { zoneKey: zone.id }
      if (text) {
        const { x, y, height, rotation } = text.transform
        entry.text = {
          content: text.content,
          fontId: text.fontId,
          colorId: text.colorId,
          transform: { x, y, height, rotation },
        }
      }
      if (image) {
        const { x, y, height, rotation } = image.transform
        entry.image = {
          source:
            image.source.kind === 'upload'
              ? { kind: 'upload', fileId: fileIdOf(image.source.uploadId) }
              : { kind: 'preset', presetId: image.source.presetId },
          aspectRatio: image.aspectRatio,
          transform: { x, y, height, rotation },
        }
      }
      zones.push(entry)
    }
    return {
      clientItemId: instanceId,
      productId: product.productId,
      colorId: product.id,
      sizeId,
      zones,
    }
  })
}

/** Customer uploads used by the given items (each once), with their original file names. */
export function uploadsOf(items: readonly CheckoutItem[], designs: DesignState) {
  const uploads = new Map<string, string>()
  for (const { instanceId, product } of items) {
    for (const zone of product.embroideryZones) {
      const source = designs[instanceId]?.[zone.id]?.image?.source
      if (source?.kind === 'upload') uploads.set(source.uploadId, source.fileName)
    }
  }
  return uploads
}
