import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/http'
import type {
  PublicCatalogApi,
  PublicDesignerConfig,
  PublicDesignerProduct,
  PublicProductListItem,
} from '../../api/publicCatalog'
import { categoryName, loadDesignerCatalog, type DesignerScope } from './catalog'
import { pictureIds } from './selection'

const file = (name: string, width = 1448, height = 1086) => ({
  id: `file-${name}`,
  url: `http://api.test/uploads/${name}.png`,
  width,
  height,
})

const shirts = { id: 'cat-shirt', parentId: null, name: 'Áo', slug: 'ao', path: 'ao' }
const hats = { id: 'cat-hat', parentId: null, name: 'Mũ', slug: 'mu', path: 'mu' }

const config: PublicDesignerConfig = {
  selection: {
    maxItems: 10,
    maxOrderItems: 50,
    categoryLimits: [{ categoryId: shirts.id, maxItems: 3 }],
  },
  text: {
    font: { id: 'dancing-script-600', family: 'Dancing Script', weight: 600, lineHeight: 1.3 },
    colors: [{ id: 'dark-brown', name: 'Nâu đậm', value: '#4a3426' }],
    defaultColorId: 'dark-brown',
    maxLength: 120,
  },
  backgrounds: [{ id: 'bg-1', name: 'Nền gỗ', image: file('bg', 1024, 559) }],
  defaultBackgroundId: 'bg-1',
  presets: [{ id: 'preset-1', name: 'Gấu', image: file('bear', 512, 512) }],
  layouts: [
    {
      id: 'layout-1',
      name: 'Một áo',
      backgroundId: 'bg-1',
      slots: [{ categoryId: shirts.id, x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
    },
  ],
}

const designer: Record<string, PublicDesignerProduct> = {
  bodysuit: {
    id: 'prod-suit',
    name: 'Bodysuit',
    slug: 'bodysuit',
    category: shirts,
    colors: [
      {
        id: 'color-white',
        name: 'Trắng',
        hexCode: '#ffffff',
        designerEnabled: true,
        displayScale: 1.1,
        designImage: file('suit-white'),
        zones: [
          {
            id: 'chest',
            name: 'Ngực áo',
            x: 0.4,
            y: 0.2,
            width: 0.2,
            height: 0.1,
            allowedContent: ['text', 'image'],
          },
        ],
      },
      {
        id: 'color-pink',
        name: 'Hồng',
        hexCode: null,
        // Not configured for the designer: sold without personalization.
        designerEnabled: false,
        displayScale: 1,
        designImage: file('suit-pink'),
        zones: [],
      },
    ],
  },
  'mu-sss': {
    id: 'prod-hat',
    name: 'Mũ',
    slug: 'mu-sss',
    category: hats,
    colors: [
      {
        id: 'color-hat',
        name: 'Kem',
        hexCode: null,
        designerEnabled: true,
        displayScale: 0.5,
        designImage: file('hat'),
        zones: [],
      },
    ],
  },
}

const listItem = (slug: string) => ({ slug }) as PublicProductListItem

const notUsed = async (): Promise<never> => {
  throw new Error('not used by the designer')
}

function source(overrides: Partial<PublicCatalogApi> = {}): PublicCatalogApi {
  return {
    categories: async () => [shirts, hats],
    products: notUsed,
    product: notUsed,
    banners: notUsed,
    allCollections: notUsed,
    collection: notUsed,
    collectionProducts: notUsed,
    allProducts: notUsed,
    allCollectionProducts: async () => [listItem('bodysuit'), listItem('mu-sss')],
    productDesigner: async (slug) => designer[slug]!,
    designerConfig: async () => config,
    ...overrides,
  }
}

// The cart lists a product once per item; the catalog loads each product once.
const cart: DesignerScope = { kind: 'products', slugs: ['bodysuit', 'mu-sss', 'bodysuit'] }

describe('loadDesignerCatalog', () => {
  it('loads only the products of a collection when designing that collection', async () => {
    const requested: string[] = []
    const catalog = await loadDesignerCatalog(
      { kind: 'collection', slug: 'mua-he' },
      undefined,
      source({
        allCollectionProducts: async (slug) => {
          requested.push(slug)
          return [listItem('mu-sss')]
        },
      }),
    )
    expect(requested).toEqual(['mua-he'])
    expect(catalog.products.map((product) => product.productSlug)).toEqual(['mu-sss'])
  })

  it('turns every product color into one designer product with its design image and zones', async () => {
    const catalog = await loadDesignerCatalog(cart, undefined, source())

    expect(catalog.products.map((product) => product.id)).toEqual([
      'color-white',
      'color-pink',
      'color-hat',
    ])
    expect(catalog.products[0]).toEqual({
      id: 'color-white',
      productId: 'prod-suit',
      productSlug: 'bodysuit',
      name: 'Bodysuit – Trắng',
      categoryId: 'cat-shirt',
      image: {
        src: 'http://api.test/uploads/suit-white.png',
        width: 1448,
        height: 1086,
      },
      displayScale: 1.1,
      embroideryZones: [designer.bodysuit!.colors[0]!.zones[0]],
    })
    // Colors without designer configuration stay selectable but have nothing to personalize.
    expect(catalog.products[1]!.embroideryZones).toEqual([])
  })

  it('keys picture limits by API category id, so the limit applies to that category only', async () => {
    const catalog = await loadDesignerCatalog(cart, undefined, source())
    expect(catalog.rules).toEqual({
      maxItems: 10,
      maxOrderItems: 50,
      categoryLimits: { 'cat-shirt': 3 },
    })

    const selectionCatalog = { products: catalog.products, rules: catalog.rules }
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ instanceId: id, productId: 'color-pink' }))
    items.push({ instanceId: 'e', productId: 'color-hat' })
    expect([...pictureIds(items, selectionCatalog)]).toEqual(['a', 'b', 'c', 'e'])
  })

  it('maps backgrounds, the default background, presets and category names', async () => {
    const catalog = await loadDesignerCatalog(cart, undefined, source())
    expect(catalog.backgrounds).toEqual([
      {
        id: 'bg-1',
        name: 'Nền gỗ',
        image: { src: 'http://api.test/uploads/bg.png', width: 1024, height: 559 },
      },
    ])
    expect(catalog.defaultBackgroundId).toBe('bg-1')
    expect(catalog.presets.map((preset) => preset.image.src)).toEqual([
      'http://api.test/uploads/bear.png',
    ])
    expect(catalog.layouts).toEqual([
      {
        id: 'layout-1',
        name: 'Một áo',
        backgroundId: 'bg-1',
        slots: [{ categoryId: 'cat-shirt', x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
      },
    ])
    expect(categoryName(catalog, 'cat-hat')).toBe('Mũ')
    expect(categoryName(catalog, 'unknown')).toBe('')
  })

  it('skips a product hidden between the list and its designer request', async () => {
    const catalog = await loadDesignerCatalog(
      cart,
      undefined,
      source({
        productDesigner: async (slug) => {
          if (slug === 'mu-sss') throw new ApiError('http', 'Not found', { status: 404 })
          return designer[slug]!
        },
      }),
    )
    expect(catalog.products.map((product) => product.productId)).toEqual(['prod-suit', 'prod-suit'])
  })

  it('fails as a whole on other errors instead of showing a partial catalog', async () => {
    const outage = new ApiError('http', 'Unavailable', { status: 503 })
    await expect(
      loadDesignerCatalog(
        cart,
        undefined,
        source({
          productDesigner: async () => {
            throw outage
          },
        }),
      ),
    ).rejects.toBe(outage)
  })
})
