import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/http'
import type { CreateOrderRequest, GuestSession, Order } from '../../api/orders'
import type { DesignState } from '../designer/design'
import type { Product } from '../designer/types'
import { CheckoutError, createOrderSubmitter, type SubmitInput } from './submitOrder'

const product: Product = {
  id: 'color-1',
  productId: 'product-1',
  productSlug: 'bodysuit',
  name: 'Bodysuit',
  categoryId: 'cat',
  image: {},
  displayScale: 1,
  embroideryZones: [
    {
      id: 'chest',
      name: 'Ngực',
      x: 0.2,
      y: 0.2,
      width: 0.3,
      height: 0.2,
      allowedContent: ['image'],
    },
  ],
}
const transform = { x: 0.5, y: 0.5, height: 0.5, rotation: 0 }
const designs = (uploadId = 'upload-1'): DesignState => ({
  'item-1': {
    chest: {
      image: {
        source: { kind: 'upload', uploadId, fileName: 'logo.png' },
        aspectRatio: 1,
        transform,
      },
    },
  },
})

function setup(options: { stored?: GuestSession | null } = {}) {
  let sessions = 0
  let files = 0
  let keys = 0
  let stored: GuestSession | null = options.stored ?? null
  const orders: { token: string; key: string; body: CreateOrderRequest }[] = []
  const api = {
    createSession: vi.fn(async () => ({
      guestToken: `token-${++sessions}`,
      expiresAt: '2099-01-01T00:00:00Z',
    })),
    uploadFile: vi.fn(async (_token: string, _blob: Blob, _name: string, purpose: string) => ({
      id: `${purpose}-${++files}`,
      purpose: purpose as 'customer_image',
      width: 1,
      height: 1,
      expiresAt: null,
    })),
    createOrder: vi.fn(async (token: string, key: string, body: CreateOrderRequest) => {
      orders.push({ token, key, body })
      return { id: 'order-1', orderCode: 'LT-1' } as Order
    }),
  }
  const submitter = createOrderSubmitter({
    api,
    loadSession: () => stored,
    saveSession: (session) => (stored = session),
    newKey: () => `key-${++keys}`,
  })
  const input = (overrides: Partial<SubmitInput> = {}): SubmitInput => ({
    customer: { name: 'A', phone: '0912345678', address: 'B', note: null },
    items: [{ instanceId: 'item-1', product, sizeId: null, inPreview: true }],
    designs: designs(),
    backgroundId: 'bg-1',
    uploadBlob: () => new Blob(['x']),
    renderPreview: async () => new Blob(['preview']),
    ...overrides,
  })
  return { api, submitter, input, orders, stored: () => stored }
}

describe('createOrderSubmitter', () => {
  it('creates a session, uploads the image and the preview, then sends the design order', async () => {
    const { api, submitter, input, orders, stored } = setup()
    await expect(submitter.submit(input())).resolves.toMatchObject({ orderCode: 'LT-1' })

    expect(api.createSession).toHaveBeenCalledTimes(1)
    expect(stored()?.guestToken).toBe('token-1')
    expect(orders).toHaveLength(1)
    expect(orders[0]!.token).toBe('token-1')
    expect(orders[0]!.body.source.design).toMatchObject({
      previewFileId: 'design_preview-2',
      backgroundId: 'bg-1',
      items: [{ zones: [{ image: { source: { kind: 'upload', fileId: 'customer_image-1' } } }] }],
    })
  })

  it('reuses a stored session', async () => {
    const { api, submitter, input, orders } = setup({
      stored: { guestToken: 'kept', expiresAt: '2099-01-01T00:00:00Z' },
    })
    await submitter.submit(input())
    expect(api.createSession).not.toHaveBeenCalled()
    expect(orders[0]!.token).toBe('kept')
  })

  it('retries the same request with the same key and files after a lost response', async () => {
    const { api, submitter, input } = setup()
    api.createOrder.mockRejectedValueOnce(new ApiError('network', 'offline'))
    await expect(submitter.submit(input())).rejects.toMatchObject({ kind: 'network' })
    await submitter.submit(input())

    // The server may have created the order the first time: the retry must be a replay.
    expect(api.createOrder).toHaveBeenCalledTimes(2)
    expect(api.uploadFile).toHaveBeenCalledTimes(2)
    expect(api.createOrder.mock.calls[1]![1]).toBe(api.createOrder.mock.calls[0]![1])
    expect(api.createOrder.mock.calls[1]![2]).toEqual(api.createOrder.mock.calls[0]![2])
  })

  it('uses a new key when the request changed', async () => {
    const { api, submitter, input } = setup()
    api.createOrder.mockRejectedValueOnce(new ApiError('http', 'Validation', { status: 400 }))
    await expect(submitter.submit(input())).rejects.toBeInstanceOf(ApiError)
    await submitter.submit(
      input({ customer: { name: 'A', phone: '0987654321', address: 'B', note: null } }),
    )
    expect(api.createOrder.mock.calls[1]![1]).not.toBe(api.createOrder.mock.calls[0]![1])
    // The design did not change, so the preview is not made or uploaded again.
    expect(api.uploadFile).toHaveBeenCalledTimes(2)
  })

  it('starts a new session and uploads again when the session is rejected', async () => {
    const { api, submitter, input, orders, stored } = setup({
      stored: { guestToken: 'expired', expiresAt: '2099-01-01T00:00:00Z' },
    })
    api.uploadFile.mockRejectedValueOnce(new ApiError('http', 'Unauthorized', { status: 401 }))
    await submitter.submit(input())

    expect(api.createSession).toHaveBeenCalledTimes(1)
    expect(stored()?.guestToken).toBe('token-1')
    expect(orders).toHaveLength(1)
    expect(orders[0]!.token).toBe('token-1')
  })

  it('does not loop when a new session is rejected too', async () => {
    const { api, submitter, input } = setup()
    api.createOrder.mockRejectedValue(new ApiError('http', 'Unauthorized', { status: 401 }))
    await expect(submitter.submit(input())).rejects.toMatchObject({ status: 401 })
    expect(api.createSession).toHaveBeenCalledTimes(2)
    expect(api.createOrder).toHaveBeenCalledTimes(2)
  })

  it('uploads again when the uploaded files expired before the order', async () => {
    const { api, submitter, input, orders } = setup()
    api.createOrder.mockRejectedValueOnce(
      new ApiError('http', 'File x has expired; upload it again', { status: 422 }),
    )
    await submitter.submit(input())
    expect(api.uploadFile).toHaveBeenCalledTimes(4)
    expect(orders.at(-1)!.body.source.design.items[0]!.zones[0]!.image!.source).toEqual({
      kind: 'upload',
      fileId: 'customer_image-3',
    })
  })

  it('sends the order without a preview when the picture cannot be made', async () => {
    const { submitter, input, orders } = setup()
    await submitter.submit(input({ renderPreview: () => Promise.reject(new Error('tainted')) }))
    expect(orders[0]!.body.source.design.previewFileId).toBeNull()
  })

  it('refuses when an uploaded image is no longer available', async () => {
    const { api, submitter, input } = setup()
    await expect(submitter.submit(input({ uploadBlob: () => undefined }))).rejects.toBeInstanceOf(
      CheckoutError,
    )
    expect(api.createOrder).not.toHaveBeenCalled()
  })
})
