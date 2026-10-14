import { inject, provide, type InjectionKey } from 'vue'
import { ApiError } from '../../api/http'
import {
  publicCatalog,
  type FileRef,
  type PublicCatalogApi,
  type PublicDesignerColor,
  type PublicDesignerProduct,
} from '../../api/publicCatalog'
import type { AssetImage, CategoryId, DesignerCatalog, Product } from './types'

/*
 * Designer catalog from the public API.
 *
 * Mapping (see the API's docs/designer-contract.md): a designer Product is one API product color.
 * Its image is the color's transparent `designImage`, which the zones are normalized to. Colors
 * with the designer turned off are listed with no zones (sold without personalization). Limits
 * are keyed by the API category id.
 */

function assetImage(file: FileRef): AssetImage {
  return { src: file.url, width: file.width, height: file.height }
}

function toProduct(product: PublicDesignerProduct, color: PublicDesignerColor): Product {
  return {
    id: color.id,
    productId: product.id,
    productSlug: product.slug,
    name: `${product.name} – ${color.name}`,
    categoryId: product.category.id,
    image: assetImage(color.designImage),
    displayScale: color.displayScale,
    embroideryZones: color.designerEnabled
      ? color.zones.map((zone) => ({ ...zone, allowedContent: [...zone.allowedContent] }))
      : [],
  }
}

/**
 * Loads config, categories, every public product and the designer data of each product.
 * The API has no single "all designer products" endpoint, so this makes one request per product.
 */
export async function loadDesignerCatalog(
  signal?: AbortSignal,
  source: PublicCatalogApi = publicCatalog,
): Promise<DesignerCatalog> {
  const [config, categories, listed] = await Promise.all([
    source.designerConfig(signal),
    source.categories(signal),
    source.allProducts({}, signal),
  ])

  const details = await Promise.all(
    listed.map((product) =>
      source.productDesigner(product.slug, signal).catch((error: unknown) => {
        // Hidden between the list and the detail request: leave it out instead of failing.
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }),
    ),
  )

  return {
    categories: categories.map(({ id, name, slug }) => ({ id, name, slug })),
    products: details.flatMap((product) =>
      product ? product.colors.map((color) => toProduct(product, color)) : [],
    ),
    rules: {
      maxItems: config.selection.maxItems,
      categoryLimits: Object.fromEntries(
        config.selection.categoryLimits.map((limit) => [limit.categoryId, limit.maxItems]),
      ),
    },
    backgrounds: config.backgrounds.map(({ id, name, image }) => ({
      id,
      name,
      image: assetImage(image),
    })),
    defaultBackgroundId: config.defaultBackgroundId,
    presets: config.presets.map(({ id, name, image }) => ({ id, name, image: assetImage(image) })),
  }
}

export function categoryName(catalog: DesignerCatalog, id: CategoryId): string {
  return catalog.categories.find((category) => category.id === id)?.name ?? ''
}

const catalogKey: InjectionKey<DesignerCatalog> = Symbol('designer-catalog')

export function provideCatalog(catalog: DesignerCatalog) {
  provide(catalogKey, catalog)
}

export function injectCatalog(): DesignerCatalog {
  const catalog = inject(catalogKey)
  if (!catalog) throw new Error('injectCatalog() requires provideCatalog() in an ancestor')
  return catalog
}

/** `categoryName` bound to the provided catalog, for components. */
export function useCategoryName(): (id: CategoryId) => string {
  const catalog = injectCatalog()
  return (id) => categoryName(catalog, id)
}
