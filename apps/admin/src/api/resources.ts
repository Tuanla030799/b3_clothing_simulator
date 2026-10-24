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
  list: (query: PageQuery & { q?: string; isActive?: boolean } = {}) =>
    http.get<Paged<Category>>('admin/categories', { query }),
  all: () => http.getAll<Category>('admin/categories'),
  /** Drag and drop: puts the row right after `afterId` (null = first); the API computes the order. */
  move: (categoryId: string, afterId: string | null) =>
    http.patch(`admin/categories/${id(categoryId)}/position`, { afterId }),
  create: (body: CategoryInput) => http.post<Category>('admin/categories', body),
  update: (categoryId: string, body: Partial<CategoryInput>) =>
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
  /** Featured products only (the other lists are newest first). */
  moveFeatured: (productId: string, afterId: string | null) =>
    http.patch(`admin/products/${id(productId)}/position`, { afterId }),
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
  /** Drag and drop: puts the row right after `afterId` (null = first); the API computes the order. */
  move: (assetId: string, afterId: string | null) =>
    http.patch(`admin/${kind}/${id(assetId)}/position`, { afterId }),
  create: (body: DesignAssetInput) => http.post<DesignAsset>(`admin/${kind}`, body),
  update: (assetId: string, body: Partial<DesignAssetInput>) =>
    http.patch<DesignAsset>(`admin/${kind}/${id(assetId)}`, body),
  remove: (assetId: string) => http.delete(`admin/${kind}/${id(assetId)}`),
})

export const bannersApi = {
  list: (query: PageQuery & { q?: string; isActive?: boolean } = {}) =>
    http.get<Paged<Banner>>('admin/banners', { query }),
  create: (body: BannerInput) => http.post<Banner>('admin/banners', body),
  update: (bannerId: string, body: Partial<BannerInput>) =>
    http.patch<Banner>(`admin/banners/${id(bannerId)}`, body),
  remove: (bannerId: string) => http.delete(`admin/banners/${id(bannerId)}`),
  /** Drag and drop: puts the row right after `afterId` (null = first); the API computes the order. */
  move: (bannerId: string, afterId: string | null) =>
    http.patch(`admin/banners/${id(bannerId)}/position`, { afterId }),
}

export const collectionsApi = {
  list: (query: PageQuery & { q?: string; isActive?: boolean; isFeatured?: boolean } = {}) =>
    http.get<Paged<Collection>>('admin/collections', { query }),
  get: (collectionId: string) => http.get<Collection>(`admin/collections/${id(collectionId)}`),
  create: (body: CollectionInput) => http.post<Collection>('admin/collections', body),
  update: (collectionId: string, body: Partial<CollectionInput>) =>
    http.patch<Collection>(`admin/collections/${id(collectionId)}`, body),
  remove: (collectionId: string) => http.delete(`admin/collections/${id(collectionId)}`),
  /** Drag and drop: puts the row right after `afterId` (null = first); the API computes the order. */
  move: (collectionId: string, afterId: string | null) =>
    http.patch(`admin/collections/${id(collectionId)}/position`, { afterId }),

  members: (collectionId: string, query: PageQuery = {}) =>
    http.get<Paged<CollectionMember>>(`admin/collections/${id(collectionId)}/products`, {
      query,
    }),
  /** The new member goes last. */
  addMember: (collectionId: string, productId: string) =>
    http.post<CollectionMember>(`admin/collections/${id(collectionId)}/products`, { productId }),
  /** Drag and drop inside the collection (`afterId` is another member's product id). */
  moveMember: (collectionId: string, productId: string, afterId: string | null) =>
    http.patch(`admin/collections/${id(collectionId)}/products/${id(productId)}/position`, {
      afterId,
    }),
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
