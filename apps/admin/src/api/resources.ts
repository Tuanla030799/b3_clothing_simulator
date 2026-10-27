import { http } from './client'
import type { Paged } from './httpClient'
import type {
  Banner,
  BannerInput,
  Category,
  CategoryInput,
  Collection,
  CollectionInput,
  CollectionMember,
  ProductDesigner,
  ColorInput,
  PaletteColor,
  DesignAsset,
  DesignAssetInput,
  DesignLayout,
  DesignLayoutInput,
  DesignerSettings,
  EmbroideryZone,
  Order,
  OrderEvent,
  OrderListItem,
  OrderStatus,
  Product,
  ProductColor,
  ProductCreateExtras,
  ProductInput,
  ProductListItem,
  ProductSize,
  UploadedFile,
  ZoneInput,
} from './types'

/*
 * Admin endpoints grouped by resource (API README "Endpoints"). PATCH bodies only carry the
 * fields to change; `null` clears a field only where the API allows it.
 */

export type PageQuery = { page?: number; pageSize?: number }
const id = (value: string) => encodeURIComponent(value)

export const filesApi = {
  /** Admin image upload (JPEG/PNG/WebP); attach the returned id to a record within 5 minutes. */
  upload: (file: File) => http.upload<UploadedFile>('admin/files/upload', file),
}

export const categoriesApi = {
  list: (query: PageQuery & { q?: string; isActive?: boolean; parentId?: string } = {}) =>
    http.get<Paged<Category>>('admin/categories', { query }),
  /** Every category, flat in tree order (parents before their children). */
  all: () => http.getAll<Category>('admin/categories'),
  /**
   * Saves the order of one group of siblings at once: every child of `parentId` (null = roots),
   * first = top (409 LIST_CHANGED if the group changed).
   */
  reorder: (parentId: string | null, ids: string[]) =>
    http.put('admin/categories/order', { parentId, ids }),
  /**
   * Moves the category (and its branch) under `parentId` (null = root), right after the sibling
   * `afterId` (null = first). The admin uses it to change the parent.
   */
  move: (categoryId: string, afterId: string | null, parentId?: string | null) =>
    http.patch(`admin/categories/${id(categoryId)}/position`, {
      afterId,
      ...(parentId === undefined ? {} : { parentId }),
    }),
  create: (body: CategoryInput) => http.post<Category>('admin/categories', body),
  update: (categoryId: string, body: Partial<Omit<CategoryInput, 'parentId'>>) =>
    http.patch<Category>(`admin/categories/${id(categoryId)}`, body),
  remove: (categoryId: string) => http.delete(`admin/categories/${id(categoryId)}`),
}

export const productsApi = {
  list: (
    query: PageQuery & {
      q?: string
      categoryId?: string
      isActive?: boolean
      isFeatured?: boolean
    } = {},
  ) => http.get<Paged<ProductListItem>>('admin/products', { query }),
  get: (productId: string) => http.get<Product>(`admin/products/${id(productId)}`),
  /** Every featured product, in their order. */
  allFeatured: () =>
    http.getAll<ProductListItem>('admin/products', { query: { isFeatured: true } }),
  /** Saves the featured order at once: every featured id, first = top (409 LIST_CHANGED). */
  reorderFeatured: (ids: string[]) => http.put('admin/products/featured/order', { ids }),
  create: (body: ProductInput & ProductCreateExtras) => http.post<Product>('admin/products', body),
  update: (
    productId: string,
    body: Partial<ProductInput> & { isActive?: boolean; isFeatured?: boolean },
  ) => http.patch<Product>(`admin/products/${id(productId)}`, body),
  remove: (productId: string) => http.delete(`admin/products/${id(productId)}`),

  palette: () => http.get<PaletteColor[]>('admin/color-palette'),
  addColor: (productId: string, body: ColorInput) =>
    http.post<ProductColor>(`admin/products/${id(productId)}/colors`, body),
  updateColor: (productId: string, colorId: string, body: Partial<ColorInput>) =>
    http.patch<ProductColor>(`admin/products/${id(productId)}/colors/${id(colorId)}`, body),
  removeColor: (productId: string, colorId: string) =>
    http.delete(`admin/products/${id(productId)}/colors/${id(colorId)}`),

  addSize: (productId: string, body: { name: string; sortOrder?: number }) =>
    http.post<ProductSize>(`admin/products/${id(productId)}/sizes`, body),
  updateSize: (productId: string, sizeId: string, body: { name?: string; sortOrder?: number }) =>
    http.patch<ProductSize>(`admin/products/${id(productId)}/sizes/${id(sizeId)}`, body),
  removeSize: (productId: string, sizeId: string) =>
    http.delete(`admin/products/${id(productId)}/sizes/${id(sizeId)}`),
}

const productPath = (productId: string) => `admin/products/${id(productId)}`

export const designerApi = {
  productDesigner: (productId: string) =>
    http.get<ProductDesigner>(`${productPath(productId)}/designer`),
  updateProductDesigner: (
    productId: string,
    body: { designerEnabled?: boolean; displayScale?: number },
  ) => http.patch<ProductDesigner>(`${productPath(productId)}/designer`, body),
  addZone: (productId: string, body: ZoneInput) =>
    http.post<EmbroideryZone>(`${productPath(productId)}/embroidery-zones`, body),
  updateZone: (productId: string, zoneId: string, body: Partial<Omit<ZoneInput, 'key'>>) =>
    http.patch<EmbroideryZone>(`${productPath(productId)}/embroidery-zones/${id(zoneId)}`, body),
  removeZone: (productId: string, zoneId: string) =>
    http.delete(`${productPath(productId)}/embroidery-zones/${id(zoneId)}`),

  settings: () => http.get<DesignerSettings>('admin/designer/settings'),
  updateSettings: (body: { maxItems?: number; defaultBackgroundId?: string | null }) =>
    http.patch<DesignerSettings>('admin/designer/settings', body),
  setCategoryLimit: (categoryId: string, maxItems: number) =>
    http.put(`admin/designer/category-limits/${id(categoryId)}`, { maxItems }),
  removeCategoryLimit: (categoryId: string) =>
    http.delete(`admin/designer/category-limits/${id(categoryId)}`),
}

/** Backgrounds and ready-made images share one shape and one set of endpoints. */
export type DesignAssetKind = 'backgrounds' | 'design-presets'

export const designAssetsApi = (kind: DesignAssetKind) => ({
  list: (query: PageQuery & { q?: string; isActive?: boolean } = {}) =>
    http.get<Paged<DesignAsset>>(`admin/${kind}`, { query }),
  all: () => http.getAll<DesignAsset>(`admin/${kind}`),
  /** Saves the whole order at once: every id, first = top (409 LIST_CHANGED if it changed). */
  reorder: (ids: string[]) => http.put(`admin/${kind}/order`, { ids }),
  create: (body: DesignAssetInput) => http.post<DesignAsset>(`admin/${kind}`, body),
  update: (assetId: string, body: Partial<DesignAssetInput>) =>
    http.patch<DesignAsset>(`admin/${kind}/${id(assetId)}`, body),
  remove: (assetId: string) => http.delete(`admin/${kind}/${id(assetId)}`),
})

export const designLayoutsApi = {
  list: (query: PageQuery & { backgroundId?: string; isActive?: boolean } = {}) =>
    http.get<Paged<DesignLayout>>('admin/design-layouts', { query }),
  get: (layoutId: string) => http.get<DesignLayout>(`admin/design-layouts/${id(layoutId)}`),
  all: () => http.getAll<DesignLayout>('admin/design-layouts'),
  /** Saves the whole order at once: every id, first = top (409 LIST_CHANGED if it changed). */
  reorder: (ids: string[]) => http.put('admin/design-layouts/order', { ids }),
  create: (body: DesignLayoutInput) => http.post<DesignLayout>('admin/design-layouts', body),
  update: (layoutId: string, body: Partial<DesignLayoutInput>) =>
    http.patch<DesignLayout>(`admin/design-layouts/${id(layoutId)}`, body),
  remove: (layoutId: string) => http.delete(`admin/design-layouts/${id(layoutId)}`),
}

export const bannersApi = {
  list: (query: PageQuery & { q?: string; isActive?: boolean } = {}) =>
    http.get<Paged<Banner>>('admin/banners', { query }),
  create: (body: BannerInput) => http.post<Banner>('admin/banners', body),
  update: (bannerId: string, body: Partial<BannerInput>) =>
    http.patch<Banner>(`admin/banners/${id(bannerId)}`, body),
  remove: (bannerId: string) => http.delete(`admin/banners/${id(bannerId)}`),
  all: () => http.getAll<Banner>('admin/banners'),
  /** Saves the whole order at once: every id, first = top (409 LIST_CHANGED if it changed). */
  reorder: (ids: string[]) => http.put('admin/banners/order', { ids }),
}

export const collectionsApi = {
  list: (query: PageQuery & { q?: string; isActive?: boolean; isFeatured?: boolean } = {}) =>
    http.get<Paged<Collection>>('admin/collections', { query }),
  get: (collectionId: string) => http.get<Collection>(`admin/collections/${id(collectionId)}`),
  create: (body: CollectionInput) => http.post<Collection>('admin/collections', body),
  update: (collectionId: string, body: Partial<CollectionInput>) =>
    http.patch<Collection>(`admin/collections/${id(collectionId)}`, body),
  remove: (collectionId: string) => http.delete(`admin/collections/${id(collectionId)}`),
  all: () => http.getAll<Collection>('admin/collections'),
  /** Saves the whole order at once: every id, first = top (409 LIST_CHANGED if it changed). */
  reorder: (ids: string[]) => http.put('admin/collections/order', { ids }),

  members: (collectionId: string, query: PageQuery = {}) =>
    http.get<Paged<CollectionMember>>(`admin/collections/${id(collectionId)}/products`, {
      query,
    }),
  /** The new member goes last. */
  addMember: (collectionId: string, productId: string) =>
    http.post<CollectionMember>(`admin/collections/${id(collectionId)}/products`, { productId }),
  allMembers: (collectionId: string) =>
    http.getAll<CollectionMember>(`admin/collections/${id(collectionId)}/products`),
  /** Saves the whole member order at once (product ids, first = top). */
  reorderMembers: (collectionId: string, productIds: string[]) =>
    http.put(`admin/collections/${id(collectionId)}/products/order`, { ids: productIds }),
  removeMember: (collectionId: string, productId: string) =>
    http.delete(`admin/collections/${id(collectionId)}/products/${id(productId)}`),
}

// A type alias (not an interface) so it fits the client's query record.
export type OrderListQuery = PageQuery & {
  q?: string
  status?: OrderStatus
  /** ISO 8601 with a time zone; range is [createdFrom, createdTo). */
  createdFrom?: string
  createdTo?: string
}

export const ordersApi = {
  list: (query: OrderListQuery = {}) => http.get<Paged<OrderListItem>>('admin/orders', { query }),
  get: (orderId: string) => http.get<Order>(`admin/orders/${id(orderId)}`),
  history: (orderId: string, query: PageQuery = {}) =>
    http.get<Paged<OrderEvent>>(`admin/orders/${id(orderId)}/history`, { query }),
  quote: (
    orderId: string,
    body: { expectedRevision: number; embroideryFee: number; note?: string | null },
  ) => http.patch<Order>(`admin/orders/${id(orderId)}/quote`, body),
  changeStatus: (
    orderId: string,
    body: { expectedRevision: number; status: OrderStatus; note?: string | null },
  ) => http.patch<Order>(`admin/orders/${id(orderId)}/status`, body),
  /** Private image of an order; `contentPath` is relative to the API root (`/api/v1/...`). */
  image: (contentPath: string) => http.blob(contentPath.replace(/^\/?api\/v1\//, '')),
}
