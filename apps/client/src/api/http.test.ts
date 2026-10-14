import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient, loadErrorMessage } from './http'

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const ok = (data: unknown) => json(200, { code: 'API-000', message: 'Success', data })

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (cause: unknown) => cause,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('createApiClient', () => {
  it('builds the URL from the base, path and defined query values, and returns data', async () => {
    const fetch = vi.fn(async () => ok({ id: 1 }))
    const client = createApiClient({ baseUrl: 'http://api.test/api/v1/', fetch })

    await expect(
      client.get('/public/products', { query: { q: 'áo', page: 2, categorySlug: undefined } }),
    ).resolves.toEqual({ id: 1 })
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/public/products?q=%C3%A1o&page=2',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('turns an error envelope into an ApiError with code, request id and field errors', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        json(400, {
          code: 'API-001',
          message: 'Validation failed',
          data: null,
          errors: [{ field: 'pageSize', message: 'too big' }, { field: 1 }],
          requestId: 'req-1',
        }),
    })

    const error = await failure(client.get('x'))
    expect(error).toMatchObject({
      kind: 'http',
      status: 400,
      code: 'API-001',
      requestId: 'req-1',
      message: 'Validation failed',
    })
    expect(error.errors).toEqual([{ field: 'pageSize', message: 'too big' }])
  })

  it('falls back to the X-Request-Id header when an error body is not JSON', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        new Response('Bad gateway', { status: 502, headers: { 'X-Request-Id': 'h-1' } }),
    })

    const error = await failure(client.get('x'))
    expect(error).toMatchObject({ kind: 'http', status: 502, code: null, requestId: 'h-1' })
  })

  it('reports a 2xx answer without the success envelope as an invalid response', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => json(200, [1]),
    })
    expect(await failure(client.get('x'))).toMatchObject({ kind: 'invalid-response' })
  })

  it('reports unreachable servers as network errors but lets aborts through', async () => {
    const client = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    expect(await failure(client.get('x'))).toMatchObject({ kind: 'network', status: 0 })

    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('Aborted', 'AbortError')
    const aborting = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => {
        throw abortError
      },
    })
    await expect(aborting.get('x', { signal: controller.signal })).rejects.toBe(abortError)
  })

  it('fails with a configuration error when no base URL is set, without a request', async () => {
    const fetch = vi.fn()
    const client = createApiClient({ baseUrl: ' ', fetch })
    expect(await failure(client.get('x'))).toMatchObject({ kind: 'config' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads every page of a paged list in order', async () => {
    const pages: Record<string, unknown> = {
      '1': {
        entries: ['a', 'b'],
        paging: { currentPage: 1, pageSize: 100, total: 3, lastPage: 2 },
      },
      '2': { entries: ['c'], paging: { currentPage: 2, pageSize: 100, total: 3, lastPage: 2 } },
    }
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const query = new URL(String(url)).searchParams
      expect(query.get('pageSize')).toBe('100')
      expect(query.get('q')).toBe('mu')
      return ok(pages[query.get('page')!])
    })
    const client = createApiClient({ baseUrl: 'http://api.test', fetch })

    await expect(client.getAll('list', { query: { q: 'mu' } })).resolves.toEqual(['a', 'b', 'c'])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('stops after the first page of an empty list', async () => {
    const fetch = vi.fn(async () =>
      ok({ entries: [], paging: { currentPage: 1, pageSize: 100, total: 0, lastPage: 0 } }),
    )
    const client = createApiClient({ baseUrl: 'http://api.test', fetch })
    await expect(client.getAll('list')).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('createApiClient requests with a body', () => {
  it('posts JSON with the bearer token and extra headers', async () => {
    const fetch = vi.fn(async () => ok({ id: 'order-1' }))
    const client = createApiClient({ baseUrl: 'http://api.test/api/v1', fetch })

    await client.post('public/orders', {
      token: 'secret',
      json: { a: 1 },
      headers: { 'Idempotency-Key': 'key-1' },
    })
    expect(fetch).toHaveBeenCalledWith('http://api.test/api/v1/public/orders', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer secret',
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-1',
      },
      body: '{"a":1}',
      signal: undefined,
    })
  })

  it('sends multipart forms without setting the content type itself', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => ok({}))
    const client = createApiClient({ baseUrl: 'http://api.test', fetch })
    const form = new FormData()
    await client.post('upload', { form })
    const init = fetch.mock.calls[0]![1]!
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('reads binary responses with the token and reports their errors like JSON calls', async () => {
    const fetch = vi.fn(async () => new Response(new Blob(['png']), { status: 200 }))
    const client = createApiClient({ baseUrl: 'http://api.test', fetch })
    const blob = await client.blob('file', { token: 't' })
    expect(await blob.text()).toBe('png')
    expect(fetch).toHaveBeenCalledWith('http://api.test/file', {
      method: 'GET',
      headers: { Authorization: 'Bearer t' },
      signal: undefined,
    })

    const failing = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => json(404, { code: 'API-404', message: 'Not found', data: null }),
    })
    expect(await failure(failing.blob('file'))).toMatchObject({ status: 404, code: 'API-404' })
  })
})

describe('loadErrorMessage', () => {
  it('explains configuration, network and server failures differently', () => {
    const messages = [
      loadErrorMessage(new ApiError('config', '')),
      loadErrorMessage(new ApiError('network', '')),
      loadErrorMessage(new ApiError('http', '', { status: 503 })),
      loadErrorMessage(new ApiError('http', '', { status: 404 })),
      loadErrorMessage(new Error('boom')),
    ]
    expect(new Set(messages.slice(0, 4)).size).toBe(4)
    expect(messages[4]).toBe(messages[3])
  })
})
