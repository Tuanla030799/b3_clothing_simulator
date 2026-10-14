/*
 * Minimal HTTP client for the Lituta API (`/api/v1`).
 *
 * Every success response is an envelope `{ code: "API-000", message, data }`; the client returns
 * `data` only. Failures become one ApiError type so screens can show a message and offer a retry
 * without knowing how the request failed. The request id of an API failure is kept for support.
 */

export type ApiErrorKind =
  /** No API base URL is configured for this build. */
  | 'config'
  /** The server could not be reached (offline, DNS, CORS, server down). */
  | 'network'
  /** The server answered with an error status. */
  | 'http'
  /** The server answered 2xx but not with the expected envelope. */
  | 'invalid-response'

export interface ApiFieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** HTTP status, 0 when no response was received. */
  readonly status: number
  /** API result code such as `API-404`, when the server sent one. */
  readonly code: string | null
  readonly requestId: string | null
  readonly errors: readonly ApiFieldError[]

  constructor(
    kind: ApiErrorKind,
    message: string,
    details: {
      status?: number
      code?: string | null
      requestId?: string | null
      errors?: readonly ApiFieldError[]
    } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = details.status ?? 0
    this.code = details.code ?? null
    this.requestId = details.requestId ?? null
    this.errors = details.errors ?? []
  }
}

export type QueryValue = string | number | boolean | undefined

export interface RequestOptions {
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  /** Bearer token sent in the Authorization header (never in the URL). */
  token?: string
  headers?: Record<string, string>
}

export interface SendOptions extends RequestOptions {
  /** JSON body; mutually exclusive with `form`. */
  json?: unknown
  /** Multipart body (uploads); the browser sets the boundary header. */
  form?: FormData
}

/** One page of a paged list (`GET` lists with `page` / `pageSize`). */
export interface Paged<T> {
  entries: T[]
  paging: { currentPage: number; pageSize: number; total: number; lastPage: number }
}

export interface ApiClientOptions {
  /** Absolute API root including the version, e.g. `http://localhost:3000/api/v1`. */
  baseUrl: string | undefined
  fetch?: typeof fetch
}

/** Largest page size the API accepts. */
export const MAX_PAGE_SIZE = 100
/** Guard against an endless loop if the server keeps reporting more pages. */
const MAX_PAGES = 50

const SUCCESS_CODE = 'API-000'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function errorFromResponse(response: Response, body: unknown): ApiError {
  const envelope = isRecord(body) ? body : {}
  const errors = Array.isArray(envelope.errors)
    ? envelope.errors.filter(
        (entry): entry is ApiFieldError =>
          isRecord(entry) && typeof entry.field === 'string' && typeof entry.message === 'string',
      )
    : []
  return new ApiError(
    'http',
    typeof envelope.message === 'string' ? envelope.message : `HTTP ${response.status}`,
    {
      status: response.status,
      code: typeof envelope.code === 'string' ? envelope.code : null,
      requestId:
        typeof envelope.requestId === 'string'
          ? envelope.requestId
          : response.headers.get('X-Request-Id'),
      errors,
    },
  )
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl?.trim().replace(/\/+$/, '') || undefined
  const fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  function urlOf(path: string, query: RequestOptions['query']): string {
    if (!baseUrl) throw new ApiError('config', 'API base URL is not configured')
    const url = new URL(`${baseUrl}/${path.replace(/^\/+/, '')}`)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
    return url.toString()
  }

  async function send<T>(method: string, path: string, request: SendOptions = {}): Promise<T> {
    const url = urlOf(path, request.query)
    const headers: Record<string, string> = { Accept: 'application/json', ...request.headers }
    if (request.token) headers.Authorization = `Bearer ${request.token}`
    let body: BodyInit | undefined
    if (request.form) body = request.form
    else if (request.json !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(request.json)
    }
    let response: Response
    try {
      response = await fetchImpl(url, { method, headers, body, signal: request.signal })
    } catch (error) {
      // An abort is the caller's decision, not a failure to report.
      if (request.signal?.aborted) throw error
      throw new ApiError('network', 'The API could not be reached')
    }

    const result = await readJson(response)
    if (!response.ok) throw errorFromResponse(response, result)
    if (!isRecord(result) || result.code !== SUCCESS_CODE || !('data' in result)) {
      throw new ApiError('invalid-response', 'Unexpected API response', {
        status: response.status,
        requestId: response.headers.get('X-Request-Id'),
      })
    }
    return result.data as T
  }

  /** Reads a binary response (private images) with the same error handling. */
  async function blob(path: string, request: RequestOptions = {}): Promise<Blob> {
    const url = urlOf(path, request.query)
    const headers: Record<string, string> = { ...request.headers }
    if (request.token) headers.Authorization = `Bearer ${request.token}`
    let response: Response
    try {
      response = await fetchImpl(url, { method: 'GET', headers, signal: request.signal })
    } catch (error) {
      if (request.signal?.aborted) throw error
      throw new ApiError('network', 'The API could not be reached')
    }
    if (!response.ok) throw errorFromResponse(response, await readJson(response))
    return response.blob()
  }

  const get = <T>(path: string, request: RequestOptions = {}) => send<T>('GET', path, request)

  /** Reads every page of a paged list, in server order. */
  async function getAll<T>(path: string, request: RequestOptions = {}): Promise<T[]> {
    const entries: T[] = []
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await get<Paged<T>>(path, {
        ...request,
        query: { ...request.query, page, pageSize: MAX_PAGE_SIZE },
      })
      entries.push(...result.entries)
      if (page >= result.paging.lastPage) return entries
    }
    throw new ApiError('invalid-response', 'Too many pages')
  }

  return {
    get,
    post: <T>(path: string, request: SendOptions = {}) => send<T>('POST', path, request),
    getAll,
    blob,
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

/*
 * The base URL comes from VITE_API_BASE_URL at build time. Development falls back to the local
 * API; a production build without it reports a configuration error instead of guessing a host.
 */
export const api = createApiClient({
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : undefined),
})

/** Customer-facing Vietnamese message for a failed load. */
export function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'config') return 'Ứng dụng chưa được cấu hình địa chỉ máy chủ.'
    if (error.kind === 'network') return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
    if (error.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  }
  return 'Không tải được dữ liệu. Vui lòng thử lại.'
}
