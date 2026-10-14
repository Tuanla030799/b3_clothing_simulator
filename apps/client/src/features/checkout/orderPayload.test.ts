import { describe, expect, it } from 'vitest'
import type { DesignState } from '../designer/design'
import type { Product } from '../designer/types'
import { buildOrderItems, uploadsOf } from './orderPayload'

const zone = (id: string) => ({
  id,
  name: id,
  x: 0.2,
  y: 0.2,
  width: 0.3,
  height: 0.2,
  allowedContent: ['text' as const, 'image' as const],
})
const product: Product = {
  id: 'color-1',
  productId: 'product-1',
  productSlug: 'bodysuit',
  name: 'Bodysuit – Trắng',
  categoryId: 'cat',
  image: {},
  displayScale: 1,
  embroideryZones: [zone('chest'), zone('back')],
}
const transform = { x: 0.5, y: 0.5, height: 0.6, rotation: 10 }

const designs: DesignState = {
  'item-1': {
    // Stored in a different order than the catalog: zones follow the catalog.
    back: {
      image: {
        source: { kind: 'upload', uploadId: 'upload-1', fileName: 'logo.png' },
        aspectRatio: 1.5,
        transform,
      },
    },
    chest: {
      text: { content: 'Bảo Ngọc', fontId: 'dancing-script-600', colorId: 'navy', transform },
      image: { source: { kind: 'preset', presetId: 'preset-1' }, aspectRatio: 1, transform },
    },
    removed: { text: { content: 'x', fontId: 'dancing-script-600', colorId: 'navy', transform } },
  },
}

describe('buildOrderItems', () => {
  it('maps instances, zones and image sources to the API design items', () => {
    const items = buildOrderItems(
      [
        { instanceId: 'item-1', product, sizeId: 'size-1' },
        { instanceId: 'item-2', product, sizeId: null },
      ],
      designs,
      (uploadId) => `file-of-${uploadId}`,
    )
    expect(items).toEqual([
      {
        clientItemId: 'item-1',
        productId: 'product-1',
        colorId: 'color-1',
        sizeId: 'size-1',
        zones: [
          {
            zoneKey: 'chest',
            text: { content: 'Bảo Ngọc', fontId: 'dancing-script-600', colorId: 'navy', transform },
            image: { source: { kind: 'preset', presetId: 'preset-1' }, aspectRatio: 1, transform },
          },
          {
            zoneKey: 'back',
            image: {
              source: { kind: 'upload', fileId: 'file-of-upload-1' },
              aspectRatio: 1.5,
              transform,
            },
          },
        ],
      },
      // A repeated product is its own line; without design it has no zones.
      {
        clientItemId: 'item-2',
        productId: 'product-1',
        colorId: 'color-1',
        sizeId: null,
        zones: [],
      },
    ])
  })

  it('lists each customer upload of the given items once', () => {
    const items = [
      { instanceId: 'item-1', product, sizeId: null },
      { instanceId: 'item-2', product, sizeId: null },
    ]
    expect([...uploadsOf(items, designs)]).toEqual([['upload-1', 'logo.png']])
  })
})
