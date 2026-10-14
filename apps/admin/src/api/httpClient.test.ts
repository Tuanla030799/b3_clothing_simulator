import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createHttpClient,
  errorMessage,
  fieldErrors,
  type AuthAdapter,
} from './httpClient'

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ code: 'API-000', message: 'Success', data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
const fail = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function setup(responses: Response[], auth?: Partial<AuthAdapter>) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => responses.shift() ?? ok(null))
  let token = 'access-1'
  const adapter: AuthAdapter = {
    accessToken: () => token,
    refresh: vi.fn(async () => {
      token = 'access-2'
      return true
    }),
    ...auth,
  }
  const client = createHttpClient({ baseUrl: 'http://api.test/api/v1/', fetch, auth: adapter })
  return { client, fetch, adapter }
}

const headersOf = (fetch: ReturnType<typeof setup>['fetch'], call = 0) =>
  fetch.mock.calls[call]![1]!.headers as Record<string, string>

describe('createHttpClient methods', () => {
  it('sends JSON with the bearer token for post, put, patch and delete', async () => {
    const { client, fetch } = setup([ok({ a: 1 }), ok(null), ok(null), ok(null)])
    await expect(client.post('admin/categories', { name: 'Áo' })).resolves.toEqual({ a: 1 })
    await client.put('admin/designer/category-limits/c1', { maxItems: 3 })
    await client.patch('admin/categories/c1', { isActive: false })
    await client.delete('admin/categories/c1')

    expect(fetch.mock.calls.map(([url, init]) => [url, init!.method])).toEqual([
      ['http://api.test/api/v1/admin/categories', 'POST'],
      ['http://api.test/api/v1/admin/designer/category-limits/c1', 'PUT'],
      ['http://api.test/api/v1/admin/categories/c1', 'PATCH'],
      ['http://api.test/api/v1/admin/categories/c1', 'DELETE'],
    ])
    expect(headersOf(fetch)).toMatchObject({
      Authorization: 'Bearer access-1',
      'Content-Type': 'application/json',
    })
    expect(fetch.mock.calls[0]![1]!.body).toBe('{"name":"Áo"}')
    expect(fetch.mock.calls[3]![1]!.body).toBeUndefined()
  })

  it('leaves out empty query values but keeps false and 0', async () => {
    const { client, fetch } = setup([ok({ entries: [] })])
    await client.get('admin/products', {
      query: { q: '', categoryId: undefined, isActive: false, page: 0, status: null },
    })
    expect(fetch.mock.calls[0]![0]).toBe(
      'http://api.test/api/v1/admin/products?isActive=false&page=0',
    )
  })

  it('uploads one file part as multipart without setting the content type itself', async () => {
    const { client, fetch } = setup([ok({ id: 'file-1' }, 201)])
    const file = new File(['png'], 'ao.png', { type: 'image/png' })
    await expect(client.upload('admin/files/upload', file)).resolves.toEqual({ id: 'file-1' })
    const body = fetch.mock.calls[0]![1]!.body as FormData
    expect((body.get('file') as File).name).toBe('ao.png')
    expect([...body.keys()]).toEqual(['file'])
    expect(headersOf(fetch)).not.toHaveProperty('Content-Type')
  })

  it('anonymous calls carry no token and never refresh', async () => {
    const { client, fetch, adapter } = setup([fail(401, { code: 'API-401', message: 'Invalid' })])
    await expect(client.post('admin/auth/login', {}, { anonymous: true })).rejects.toMatchObject({
      status: 401,
    })
    expect(headersOf(fetch)).not.toHaveProperty('Authorization')
    expect(adapter.refresh).not.toHaveBeenCalled()
  })
})

describe('createHttpClient on 401', () => {
  it('refreshes once and repeats the request with the new token', async () => {
    const { client, fetch, adapter } = setup([fail(401), ok({ id: 'p1' })])
    await expect(client.get('admin/products/p1')).resolves.toEqual({ id: 'p1' })
    expect(adapter.refresh).toHaveBeenCalledTimes(1)
    expect(headersOf(fetch, 1).Authorization).toBe('Bearer access-2')
  })

  it('repeats an upload with the same form after a refresh', async () => {
    const { client, fetch } = setup([fail(401), ok({ id: 'file-1' })])
    await client.upload('admin/files/upload', new File(['x'], 'a.png'))
    expect(fetch.mock.calls[1]![1]!.body).toBe(fetch.mock.calls[0]![1]!.body)
  })

  it('reports the 401 when the session cannot be refreshed, and does not loop', async () => {
    const { client, fetch } = setup([fail(401), fail(401)], { refresh: async () => false })
    await expect(client.get('admin/orders')).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)

    const twice = setup([fail(401), fail(401)])
    await expect(twice.client.get('admin/orders')).rejects.toMatchObject({ status: 401 })
    expect(twice.fetch).toHaveBeenCalledTimes(2)
    expect(twice.adapter.refresh).toHaveBeenCalledTimes(1)
  })
})

describe('errors', () => {
  it('keeps the code, request id and field errors of an error envelope', async () => {
    const { client } = setup([
      fail(400, {
        code: 'API-001',
        message: 'Validation failed',
        errors: [
          { field: 'slug', message: 'slug must be a valid slug' },
          { field: 'slug', message: 'second' },
        ],
        requestId: 'req-1',
      }),
    ])
    const error = await client.post('admin/categories', {}).catch((cause: unknown) => cause)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ code: 'API-001', requestId: 'req-1', status: 400 })
    expect(fieldErrors(error)).toEqual({ slug: 'slug must be a valid slug' })
  })

  it('gives Vietnamese messages and keeps the API reason for rule rejections', () => {
    expect(errorMessage(new ApiError('network', ''))).toMatch(/Không kết nối/)
    expect(errorMessage(new ApiError('http', 'Cannot delete the last zone', { status: 409 }))).toBe(
      'Xung đột dữ liệu (Cannot delete the last zone).',
    )
    expect(errorMessage(new Error('x'))).toMatch(/không mong muốn/)
  })
})
