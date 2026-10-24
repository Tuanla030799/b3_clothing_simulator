import { api, type ApiClient } from './http'

/*
 * Guest session, private uploads and orders (API docs/order-contract.md and
 * docs/guest-design-contract.md). Every call except creating a session needs the guest token.
 * Ordering is a contact request: no payment; the shop quotes the embroidery fee later.
 */

export interface GuestSession {
  /** Opaque bearer token; shown once by the API and never put in a URL. */
  guestToken: string
  /** ISO time; fixed (not extended by use). */
  expiresAt: string
}

export type GuestFilePurpose = 'customer_image' | 'design_preview'

export interface GuestFile {
  id: string
  purpose: GuestFilePurpose
  width: number
  height: number
  /** Unattached uploads expire 5 minutes after upload. */
  expiresAt: string | null
}

export interface OrderTransform {
  x: number
  y: number
  height: number
  rotation: number
}

export interface OrderZoneInput {
  zoneKey: string
  text?: { content: string; fontId: string; colorId: string; transform: OrderTransform }
  image?: {
    source: { kind: 'upload'; fileId: string } | { kind: 'preset'; presetId: string }
    aspectRatio: number
    transform: OrderTransform
  }
}

export interface OrderItemInput {
  clientItemId: string
  productId: string
  colorId: string
  /** Required when the product has sizes, null otherwise. */
  sizeId: string | null
  /** Empty for items without embroidery. */
  zones: OrderZoneInput[]
  /** Drawn in the preview picture (only those count against the set limits). Omitted = true. */
  inPreview?: boolean
}

export interface DesignPayload {
  previewFileId: string | null
  backgroundId: string | null
  items: OrderItemInput[]
}

export interface CustomerInput {
  name: string
  phone: string
  address: string
  note: string | null
}

export interface CreateOrderRequest {
  customer: CustomerInput
  source: { type: 'design'; design: DesignPayload }
}

export type OrderStatus =
  'PENDING' | 'CONTACTING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'

/** Public catalog images have `url`; private ones (customer images, preview) a `contentPath`. */
export interface OrderImage {
  fileId: string
  width: number
  height: number
  url: string | null
  contentPath: string | null
}

export interface OrderZone {
  key: string
  name: string
  text: { content: string; colorName: string; colorValue: string } | null
  image: { sourceKind: 'preset' | 'upload'; presetName: string | null; image: OrderImage } | null
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
  zones: OrderZone[]
  /** Drawn in the order's preview picture; null when the order has no design. */
  inPreview: boolean | null
}

export interface Order {
  id: string
  /** Reference to quote to the shop. */
  orderCode: string
  status: OrderStatus
  createdAt: string
  customer: CustomerInput
  currency: 'VND'
  productSubtotal: number
  /** null = not quoted yet (not the same as 0 = free). */
  embroideryFee: number | null
  /** null until the embroidery fee is quoted: the subtotal is not the final amount. */
  totalAmount: number | null
  items: OrderItem[]
  background: { id: string; name: string; image: OrderImage } | null
  preview: OrderImage | null
}

/** One order of a phone number in the lookup: nothing personal, the code partly hidden. */
export interface OrderLookupSummary {
  maskedCode: string
  status: OrderStatus
  createdAt: string
  itemCount: number
}

/** What the lookup shows with phone number + full order code (no address or private images). */
export interface OrderLookupDetail {
  orderCode: string
  status: OrderStatus
  createdAt: string
  currency: 'VND'
  productSubtotal: number
  embroideryFee: number | null
  totalAmount: number | null
  items: {
    productName: string
    colorName: string
    colorHexCode: string | null
    sizeName: string | null
    unitPrice: number
    displayImage: OrderImage
    embroidery: { zoneName: string; text: string | null; hasImage: boolean }[]
  }[]
  /** Oldest first, creation included. */
  history: { status: OrderStatus; at: string }[]
}

export function createOrdersApi(client: ApiClient = api) {
  return {
    createSession: (signal?: AbortSignal) =>
      client.post<GuestSession>('public/guest-sessions', { signal }),
    uploadFile(token: string, file: Blob, fileName: string, purpose: GuestFilePurpose) {
      const form = new FormData()
      form.append('purpose', purpose)
      form.append('file', file, fileName)
      return client.post<GuestFile>('public/guest-files/upload', { token, form })
    },
    /** `idempotencyKey`: one per order; reuse it only to retry the same request. */
    createOrder: (token: string, idempotencyKey: string, body: CreateOrderRequest) =>
      client.post<Order>('public/orders', {
        token,
        json: body,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    /** Only the session that placed the order may read it (404 otherwise, 401 once expired). */
    order: (token: string, id: string, signal?: AbortSignal) =>
      client.get<Order>(`public/orders/${encodeURIComponent(id)}`, { token, signal }),
    /** Orders placed with a phone number (POST keeps the number out of URLs and logs). */
    lookupOrders: (phone: string, signal?: AbortSignal) =>
      client.post<{ orders: OrderLookupSummary[] }>('public/order-lookup', {
        json: { phone },
        signal,
      }),
    /** 404 when the phone number and order code do not belong to the same order. */
    lookupOrder: (phone: string, orderCode: string, signal?: AbortSignal) =>
      client.post<OrderLookupDetail>('public/order-lookup/detail', {
        json: { phone, orderCode },
        signal,
      }),
    /** A private image of the order (`contentPath` is relative to the API root, `/api/v1/...`). */
    orderImage: (token: string, contentPath: string, signal?: AbortSignal) =>
      client.blob(contentPath.replace(/^\/?api\/v1\//, ''), { token, signal }),
  }
}

export type OrdersApi = ReturnType<typeof createOrdersApi>

export const ordersApi = createOrdersApi()
