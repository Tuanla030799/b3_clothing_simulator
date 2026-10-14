import { ApiError } from '../../api/http'
import type {
  CreateOrderRequest,
  CustomerInput,
  GuestSession,
  Order,
  OrdersApi,
} from '../../api/orders'
import type { DesignState } from '../designer/design'
import { buildOrderItems, uploadsOf, type CheckoutItem } from './orderPayload'

/*
 * Places an order with a design (API order-contract.md, `source.type = "design"`):
 * guest session → upload the customer images and a preview → POST /public/orders.
 *
 * Retries are safe: files already uploaded in this session are reused and the same request is
 * sent with the same Idempotency-Key, so a retry after a lost response returns the order that was
 * already created instead of a second one. A changed request gets a new key.
 *
 * Recovery (once each): an expired or unknown session (401) starts a new session and uploads
 * again; uploads that expired before the order (422 "has expired") are uploaded again.
 */

export type SubmitStep = 'session' | 'upload' | 'preview' | 'order'

export class CheckoutError extends Error {
  constructor(readonly code: 'missing-upload') {
    super(code)
    this.name = 'CheckoutError'
  }
}

export interface SubmitInput {
  customer: CustomerInput
  items: readonly CheckoutItem[]
  designs: DesignState
  backgroundId: string | null
  /** The file the customer picked for an upload id (kept by the designer). */
  uploadBlob: (uploadId: string) => Blob | undefined
  /** Reference picture of the set; null (or a rejection) sends the order without a preview. */
  renderPreview: () => Promise<Blob | null>
  onStep?: (step: SubmitStep) => void
}

export interface SubmitterDeps {
  api: Pick<OrdersApi, 'createSession' | 'uploadFile' | 'createOrder'>
  loadSession: () => GuestSession | null
  saveSession: (session: GuestSession | null) => void
  newKey: () => string
}

const isApiError = (error: unknown, status: number): error is ApiError =>
  error instanceof ApiError && error.status === status

export function createOrderSubmitter(deps: SubmitterDeps) {
  let session: GuestSession | null = null
  // uploadId → server file id, valid for the current session only.
  const uploaded = new Map<string, string>()
  let preview: { fingerprint: string; fileId: string | null } | null = null
  let lastBody: string | null = null
  let key = ''

  function forgetFiles() {
    uploaded.clear()
    preview = null
  }

  function forgetSession() {
    session = null
    deps.saveSession(null)
    forgetFiles()
  }

  async function attempt(input: SubmitInput): Promise<Order> {
    if (!session) {
      input.onStep?.('session')
      session = deps.loadSession()
      if (!session) {
        session = await deps.api.createSession()
        deps.saveSession(session)
      }
    }
    const token = session.guestToken

    input.onStep?.('upload')
    for (const [uploadId, fileName] of uploadsOf(input.items, input.designs)) {
      if (uploaded.has(uploadId)) continue
      const blob = input.uploadBlob(uploadId)
      if (!blob) throw new CheckoutError('missing-upload')
      const file = await deps.api.uploadFile(token, blob, fileName, 'customer_image')
      uploaded.set(uploadId, file.id)
    }

    // The preview is made again only when the design changed since the last one.
    const fingerprint = JSON.stringify({
      backgroundId: input.backgroundId,
      items: buildOrderItems(input.items, input.designs, (id) => `upload:${id}`),
    })
    if (preview?.fingerprint !== fingerprint) {
      input.onStep?.('preview')
      const blob = await input.renderPreview().catch(() => null)
      const fileId = blob
        ? (await deps.api.uploadFile(token, blob, 'xem-truoc.jpg', 'design_preview')).id
        : null
      preview = { fingerprint, fileId }
    }

    const body: CreateOrderRequest = {
      customer: input.customer,
      source: {
        type: 'design',
        design: {
          previewFileId: preview.fileId,
          backgroundId: input.backgroundId,
          items: buildOrderItems(input.items, input.designs, (id) => uploaded.get(id)!),
        },
      },
    }
    const serialized = JSON.stringify(body)
    if (serialized !== lastBody) {
      key = deps.newKey()
      lastBody = serialized
    }
    input.onStep?.('order')
    return deps.api.createOrder(token, key, body)
  }

  return {
    async submit(input: SubmitInput): Promise<Order> {
      let renewedSession = false
      let reuploaded = false
      for (;;) {
        try {
          return await attempt(input)
        } catch (error) {
          if (isApiError(error, 401) && !renewedSession) {
            renewedSession = true
            forgetSession()
            continue
          }
          if (isApiError(error, 422) && /expired/i.test(error.message) && !reuploaded) {
            reuploaded = true
            forgetFiles()
            continue
          }
          throw error
        }
      }
    },
  }
}
