import { api, type ApiClient, type Paged } from './http'

/*
 * Public catalog, home and designer endpoints (no authentication). Shapes mirror the API DTOs
 * (public-catalog.dto.ts, public-home.dto.ts, public-designer.dto.ts in the API repository); only
 * fields the client uses are listed. Image URLs are absolute and served with CORS for allowed
 * origins.
 */

export interface FileRef {
  id: string
  url: string
  width: number
  height: number
}

/** A visible category; the tree is at most 3 levels and only leaves hold products. */
export interface PublicCategory {
  id: string
  /** Null for a root. */
  parentId: string | null
  name: string
  /** Unique among siblings. */
  slug: string
  /** Slugs of the ancestors and the category joined by "/" ("ao/ao-thun"): the URL key. */
  path: string
}

export interface PublicColorSummary {
  id: string
  name: string
  hexCode: string | null
  displayImage: FileRef
}

export interface PublicProductListItem {
  id: string
  name: string
  slug: string
  /** Whole VND, the same for every color and size. */
  price: number
  currency: 'VND'
  category: PublicCategory
  coverImage: FileRef
  colors: PublicColorSummary[]
}

export interface PublicColor extends PublicColorSummary {
  /** Transparent cut-out used by the designer. */
  designImage: FileRef
}

export interface PublicProduct {
  id: string
  name: string
  slug: string
  /** Plain text. */
  description: string | null
  price: number
  currency: 'VND'
  category: PublicCategory
  /** Active colors in display order. */
  colors: PublicColor[]
  /** Shared by every color; empty means no size is chosen. */
  sizes: { id: string; name: string }[]
}

export interface PublicBanner {
  id: string
  title: string
  /** Plain text. */
  description: string | null
  /** Internal path ("/...") or an https URL; null when the banner does not navigate. */
  linkUrl: string | null
  desktopImage: FileRef
  /** The desktop image when no mobile image is configured. */
  mobileImage: FileRef
}

export interface PublicCollection {
  id: string
  name: string
  slug: string
  /** Plain text. */
  description: string | null
  image: FileRef | null
  isFeatured: boolean
}

export interface PublicZone {
  /** Stable zone key within the color; what designs refer to. */
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  allowedContent: ('text' | 'image')[]
}

export interface PublicDesignerColor {
  id: string
  name: string
  hexCode: string | null
  /** False: sold without design, `zones` is empty. */
  designerEnabled: boolean
  displayScale: number
  /** Transparent cut-out the zones are normalized to. */
  designImage: FileRef
  zones: PublicZone[]
}

export interface PublicDesignerProduct {
  id: string
  name: string
  slug: string
  category: PublicCategory
  /** Active colors only. */
  colors: PublicDesignerColor[]
}

export interface PublicDesignerConfig {
  selection: {
    /** Most items drawn in the set picture. */
    maxItems: number
    /** Most items in one order (the cart). */
    maxOrderItems: number
    categoryLimits: { categoryId: string; maxItems: number }[]
  }
  text: {
    font: { id: string; family: string; weight: number; lineHeight: number }
    colors: { id: string; name: string; value: string }[]
    defaultColorId: string
    maxLength: number
  }
  backgrounds: { id: string; name: string; image: FileRef }[]
  defaultBackgroundId: string | null
  presets: { id: string; name: string; image: FileRef }[]
  /** Active hand-arranged layouts; slots are fractions (0-1) of the layout's background. */
  layouts: {
    id: string
    name: string
    backgroundId: string
    slots: { categoryId: string; x: number; y: number; width: number; height: number }[]
  }[]
}

// Type aliases (not interfaces) so they are assignable to the client's query record.
export type ProductListQuery = {
  q?: string
  /** Products of this category and of its descendants ("ao/ao-thun"). */
  categoryPath?: string
  /** Featured products only, in the order the admin set (home page). */
  featured?: boolean
}

export type PageQuery = { page?: number; pageSize?: number }

export function createPublicCatalog(client: ApiClient = api) {
  return {
    /** Visible categories, flat in tree order (parents before their children). */
    categories: (signal?: AbortSignal) =>
      client.get<PublicCategory[]>('public/categories', { signal }),
    /** One page of public products. */
    products: (query: ProductListQuery & PageQuery, signal?: AbortSignal) =>
      client.get<Paged<PublicProductListItem>>('public/products', { query, signal }),
    allProducts: (query: ProductListQuery = {}, signal?: AbortSignal) =>
      client.getAll<PublicProductListItem>('public/products', { query, signal }),
    /** 404 (`ApiError` status 404) when the product is unknown or hidden. */
    product: (slug: string, signal?: AbortSignal) =>
      client.get<PublicProduct>(`public/products/${encodeURIComponent(slug)}`, { signal }),
    productDesigner: (slug: string, signal?: AbortSignal) =>
      client.get<PublicDesignerProduct>(`public/products/${encodeURIComponent(slug)}/designer`, {
        signal,
      }),
    designerConfig: (signal?: AbortSignal) =>
      client.get<PublicDesignerConfig>('public/designer/config', { signal }),
    /** Active banners in display order (not paged). */
    banners: (signal?: AbortSignal) => client.get<PublicBanner[]>('public/banners', { signal }),
    /** Every active collection; `featured: true` narrows to the featured ones. */
    allCollections: (query: { featured?: boolean } = {}, signal?: AbortSignal) =>
      client.getAll<PublicCollection>('public/collections', { query, signal }),
    /** 404 when the collection is unknown or inactive. */
    collection: (slug: string, signal?: AbortSignal) =>
      client.get<PublicCollection>(`public/collections/${encodeURIComponent(slug)}`, { signal }),
    /** Every product of an active collection (all pages). */
    allCollectionProducts: (slug: string, signal?: AbortSignal) =>
      client.getAll<PublicProductListItem>(
        `public/collections/${encodeURIComponent(slug)}/products`,
        { signal },
      ),
    collectionProducts: (slug: string, query: PageQuery, signal?: AbortSignal) =>
      client.get<Paged<PublicProductListItem>>(
        `public/collections/${encodeURIComponent(slug)}/products`,
        { query, signal },
      ),
  }
}

export type PublicCatalogApi = ReturnType<typeof createPublicCatalog>

export const publicCatalog = createPublicCatalog()
