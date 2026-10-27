/*
 * Admin API shapes, mirroring the DTOs of the API repository (src/modules/<feature>/dtos). Only
 * response fields the admin uses are listed. Times are ISO strings; money is whole VND.
 */

export interface FileRef {
  id: string
  url: string
  width: number
  height: number
}

export interface UploadedFile extends FileRef {
  originalName: string
  mimeType: string
  size: number
  /** Unattached uploads expire (5 minutes) unless a record uses them. */
  expiresAt: string | null
}

/** A node of the category tree (at most 3 levels; only leaves hold products). */
export interface Category {
  id: string
  /** Null for a root. */
  parentId: string | null
  name: string
  /** Unique among siblings. */
  slug: string
  /** Slugs of the ancestors and the category joined by "/" (server-computed). */
  path: string
  /** 1 for a root, at most 3. */
  depth: number
  isActive: boolean
  sortOrder: number
  productCount: number
  childCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  name: string
  slug: string
  isActive?: boolean
  /** Create only; the parent of an existing category changes through `categoriesApi.move`. */
  parentId?: string | null
}

/** A color of the fixed palette (GET /admin/color-palette); `multi` has no swatch. */
export interface PaletteColor {
  key: string
  name: string
  hexCode: string | null
}

export interface ProductColor {
  id: string
  /** Palette key; name and hexCode are copied from the palette by the API. */
  colorKey: string
  name: string
  hexCode: string | null
  isActive: boolean
  sortOrder: number
  displayImage: FileRef
  designImage: FileRef
}

export interface ColorInput {
  colorKey: string
  displayImageFileId: string
  designImageFileId: string
  sortOrder?: number
  isActive?: boolean
}

export interface ProductSize {
  id: string
  name: string
  sortOrder: number
}

export interface ProductListItem {
  id: string
  name: string
  slug: string
  price: number
  currency: 'VND'
  isActive: boolean
  /** Home page featured products (at most 24), ordered by drag and drop. */
  isFeatured: boolean
  sortOrder: number
  category: { id: string; name: string; slug: string; path: string }
  colorCount: number
  sizeCount: number
  updatedAt: string
}

export interface Product extends ProductListItem {
  description: string | null
  /** Designer flag and set-view scale of the product, shared by all its colors. */
  designerEnabled: boolean
  displayScale: number
  colors: ProductColor[]
  sizes: ProductSize[]
}

export interface ProductInput {
  categoryId: string
  name: string
  slug: string
  description: string | null
  price: number
}

/** Colors and sizes created together with a new product, in the same transaction. */
export interface ProductCreateExtras {
  colors?: ColorInput[]
  sizes?: { name: string }[]
}

export interface EmbroideryZone {
  id: string
  /** Stable key within the color (what designs refer to); cannot change. */
  key: string
  name: string
  x: number
  y: number
  width: number
  height: number
  allowText: boolean
  allowImage: boolean
  sortOrder: number
}

export type ZoneInput = Omit<EmbroideryZone, 'id'>

/** Designer setup of a product: the zones are shared by every color's design image. */
export interface ProductDesigner {
  productId: string
  designerEnabled: boolean
  displayScale: number
  colors: {
    id: string
    name: string
    hexCode: string | null
    isActive: boolean
    designImage: FileRef
  }[]
  zones: EmbroideryZone[]
}

export interface DesignAsset {
  id: string
  name: string
  image: FileRef
  isActive: boolean
  sortOrder: number
  /** Backgrounds only. */
  isDefault?: boolean
}

export interface DesignAssetInput {
  name: string
  imageFileId: string
  isActive?: boolean
}

/** One place of a set layout: a rectangle (fractions 0-1 of the background) for one category. */
export interface DesignLayoutSlot {
  categoryId: string
  x: number
  y: number
  width: number
  height: number
}

/** Hand-arranged layout of a gift set on one background. */
export interface DesignLayout {
  id: string
  name: string
  backgroundId: string
  isActive: boolean
  sortOrder: number
  slots: DesignLayoutSlot[]
}

export interface DesignLayoutInput {
  name: string
  backgroundId: string
  isActive?: boolean
  slots: DesignLayoutSlot[]
}

export interface DesignerSettings {
  maxItems: number
  defaultBackgroundId: string | null
  categoryLimits: { categoryId: string; categoryName: string; maxItems: number }[]
  updatedAt: string
}

export interface Banner {
  id: string
  title: string
  description: string | null
  linkUrl: string | null
  desktopImage: FileRef
  mobileImage: FileRef | null
  isActive: boolean
  sortOrder: number
}

export interface BannerInput {
  title: string
  description: string | null
  desktopImageFileId: string
  mobileImageFileId: string | null
  linkUrl: string | null
  isActive?: boolean
}

export interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image: FileRef | null
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  productCount: number
}

export interface CollectionInput {
  name: string
  slug: string
  description: string | null
  imageFileId: string | null
  isActive?: boolean
  isFeatured?: boolean
}

export interface CollectionMember {
  product: {
    id: string
    name: string
    slug: string
    price: number
    isActive: boolean
    isPublic: boolean
  }
  sortOrder: number
  createdAt: string
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONTACTING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface OrderListItem {
  id: string
  orderCode: string
  status: OrderStatus
  revision: number
  customerName: string
  customerPhone: string
  itemCount: number
  productSubtotal: number
  /** null = not quoted yet; 0 = free. */
  embroideryFee: number | null
  totalAmount: number | null
  createdAt: string
  updatedAt: string
}

/** Public catalog files have `url`; private ones (customer images, preview) `contentPath`. */
export interface OrderImage {
  fileId: string
  width: number
  height: number
  url: string | null
  contentPath: string | null
}

export interface OrderTransform {
  x: number
  y: number
  height: number
  rotation: number
}

export interface OrderZone {
  key: string
  name: string
  x: number
  y: number
  width: number
  height: number
  text: {
    content: string
    fontFamily: string
    colorName: string
    colorValue: string
    transform: OrderTransform
  } | null
  image: {
    sourceKind: 'preset' | 'upload'
    presetName: string | null
    image: OrderImage
    aspectRatio: number
    transform: OrderTransform
  } | null
}

export interface OrderItem {
  clientItemId: string
  productName: string
  colorName: string
  colorHexCode: string | null
  sizeName: string | null
  quantity: number
  unitPrice: number
  displayImage: OrderImage
  designImage: OrderImage | null
  displayScale: number | null
  zones: OrderZone[]
  /** Drawn in the order's preview picture; null when the order has no design. */
  inPreview: boolean | null
}

export interface Order {
  id: string
  orderCode: string
  status: OrderStatus
  revision: number
  createdAt: string
  updatedAt: string
  customer: { name: string; phone: string; address: string; note: string | null }
  currency: 'VND'
  productSubtotal: number
  embroideryFee: number | null
  totalAmount: number | null
  items: OrderItem[]
  background: { id: string; name: string; image: OrderImage } | null
  preview: OrderImage | null
}

export interface OrderEvent {
  id: string
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'QUOTE_UPDATED'
  revision: number
  fromStatus: OrderStatus | null
  toStatus: OrderStatus | null
  fromEmbroideryFee: number | null
  toEmbroideryFee: number | null
  fromTotalAmount: number | null
  toTotalAmount: number | null
  actor: { type: 'GUEST' | 'ADMIN'; adminId: string | null; name: string | null }
  note: string | null
  createdAt: string
}
