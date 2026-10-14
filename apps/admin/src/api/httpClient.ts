/*
 * HTTP client of the admin app for the Lituta API (`/api/v1`).
 *
 * - Success responses are envelopes `{ code: "API-000", message, data }`; every method returns
 *   `data` only. Failures become one ApiError (kind, status, code, requestId, field errors).
 * - Authenticated calls send `Authorization: Bearer <access token>`. On a 401 the client asks the
 *   auth adapter to refresh once (single flight lives in the adapter) and repeats the request a
 *   single time; a second 401 is reported as is.
 * - `upload` sends multipart with one file part (`file` by default) plus optional text fields.
 */

export type ApiErrorKind = 'config' | 'network' | 'http' | 'invalid-response'

export interface ApiFieldError {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** HTTP status, 0 when no response was received. */
  readonly status: number
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

export type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  /** `undefined`, `null` and `''` values are left out. */
  query?: Record<string, QueryValue>
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Send without the access token (login, refresh, logout). */
  anonymous?: boolean
}

export interface UploadOptions extends RequestOptions {
  /** Multipart name of the file part; the API expects `file`. */
  fieldName?: string
  fileName?: string
  /** Extra text parts (the admin upload accepts none; guest uploads take `purpose`). */
  fields?: Record<string, string>
}

/** One page of a paged list. */
export interface Paged<T> {
  entries: T[]
  paging: { currentPage: number; pageSize: number; total: number; lastPage: number }
}

/** How the client gets and renews the access token (implemented by the auth session). */
export interface AuthAdapter {
  accessToken(): string | null
  /** Renews the tokens; resolves false when the session is over (the user must log in). */
  refresh(): Promise<boolean>
}

export interface HttpClientOptions {
  /** Absolute API root including the version, e.g. `http://localhost:3000/api/v1`. */
  baseUrl: string | undefined
  fetch?: typeof fetch
  auth?: AuthAdapter
}

export const MAX_PAGE_SIZE = 100
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

type Body = { kind: 'none' } | { kind: 'json'; value: unknown } | { kind: 'form'; value: FormData }

export function createHttpClient(options: HttpClientOptions) {
  const baseUrl = options.baseUrl?.trim().replace(/\/+$/, '') || undefined
  const fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))

  function urlOf(path: string, query: RequestOptions['query']): string {
    if (!baseUrl) throw new ApiError('config', 'API base URL is not configured')
    const url = new URL(`${baseUrl}/${path.replace(/^\/+/, '')}`)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
    return url.toString()
  }

  async function send(
    method: string,
    path: string,
    body: Body,
    request: RequestOptions,
  ): Promise<Response> {
    const url = urlOf(path, request.query)
    const attempt = async () => {
      const headers: Record<string, string> = { Accept: 'application/json', ...request.headers }
      const token = request.anonymous ? null : options.auth?.accessToken()
      if (token) headers.Authorization = `Bearer ${token}`
      let payload: BodyInit | undefined
      if (body.kind === 'json') {
        headers['Content-Type'] = 'application/json'
        payload = JSON.stringify(body.value)
      } else if (body.kind === 'form') payload = body.value
      try {
        return await fetchImpl(url, { method, headers, body: payload, signal: request.signal })
      } catch (error) {
        if (request.signal?.aborted) throw error
        throw new ApiError('network', 'The API could not be reached')
      }
    }

    let response = await attempt()
    if (response.status === 401 && !request.anonymous && options.auth) {
      // A FormData body can be sent again; JSON is re-serialised.
      if (await options.auth.refresh()) response = await attempt()
    }
    if (!response.ok) throw errorFromResponse(response, await readJson(response))
    return response
  }

  async function json<T>(method: string, path: string, body: Body, request: RequestOptions) {
    const response = await send(method, path, body, request)
    const result = await readJson(response)
    if (!isRecord(result) || result.code !== SUCCESS_CODE || !('data' in result)) {
      throw new ApiError('invalid-response', 'Unexpected API response', {
        status: response.status,
        requestId: response.headers.get('X-Request-Id'),
      })
    }
    return result.data as T
  }

  const none: Body = { kind: 'none' }
  const withBody = (value: unknown): Body => (value === undefined ? none : { kind: 'json', value })

  const client = {
    get: <T>(path: string, request: RequestOptions = {}) => json<T>('GET', path, none, request),
    post: <T>(path: string, body?: unknown, request: RequestOptions = {}) =>
      json<T>('POST', path, withBody(body), request),
    put: <T>(path: string, body?: unknown, request: RequestOptions = {}) =>
      json<T>('PUT', path, withBody(body), request),
    patch: <T>(path: string, body?: unknown, request: RequestOptions = {}) =>
      json<T>('PATCH', path, withBody(body), request),
    delete: <T = unknown>(path: string, request: RequestOptions = {}) =>
      json<T>('DELETE', path, none, request),

    /** Multipart upload of one file. */
    upload<T>(path: string, file: Blob, request: UploadOptions = {}) {
      const form = new FormData()
      for (const [name, value] of Object.entries(request.fields ?? {})) form.append(name, value)
      const fileName = request.fileName ?? (file instanceof File ? file.name : 'upload')
      form.append(request.fieldName ?? 'file', file, fileName)
      return json<T>('POST', path, { kind: 'form', value: form }, request)
    },

    /** Binary response (private images) with the same auth and error handling. */
    async blob(path: string, request: RequestOptions = {}): Promise<Blob> {
      const response = await send('GET', path, none, {
        ...request,
        headers: { ...request.headers, Accept: '*/*' },
      })
      return response.blob()
    },

    /** Every page of a paged list, in server order. */
    async getAll<T>(path: string, request: RequestOptions = {}): Promise<T[]> {
      const entries: T[] = []
      for (let page = 1; page <= MAX_PAGES; page++) {
        const result = await client.get<Paged<T>>(path, {
          ...request,
          query: { ...request.query, page, pageSize: MAX_PAGE_SIZE },
        })
        entries.push(...result.entries)
        if (page >= result.paging.lastPage) return entries
      }
      throw new ApiError('invalid-response', 'Too many pages')
    },
  }
  return client
}

export type HttpClient = ReturnType<typeof createHttpClient>

/*
 * The base URL comes from VITE_API_BASE_URL at build time. Development falls back to the local
 * API; a production build without it reports a configuration error instead of guessing a host.
 */
export const apiBaseUrl: string | undefined =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : undefined)

/** Field errors of a failed request keyed by field path (`name`, `zones.0.x`, …). */
export function fieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (error instanceof ApiError) {
    for (const entry of error.errors) result[entry.field] ??= entry.message
  }
  return result
}

/**
 * Vietnamese message for an admin. Business rule rejections (409/422) keep the API's own reason,
 * which names the rule (for example the last active color of an active product).
 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Có lỗi không mong muốn. Vui lòng thử lại.'
  if (error.kind === 'config') return 'Chưa cấu hình địa chỉ API (VITE_API_BASE_URL).'
  if (error.kind === 'network') return 'Không kết nối được API. Kiểm tra mạng hoặc máy chủ.'
  if (error.kind === 'invalid-response') return 'API trả về dữ liệu không đúng định dạng.'
  const detail = error.message ? ` (${error.message})` : ''
  switch (error.status) {
    case 400:
      return `Dữ liệu chưa hợp lệ${detail}.`
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 403:
      return 'Tài khoản không có quyền hoặc đã bị khóa.'
    case 404:
      return 'Không tìm thấy dữ liệu (có thể đã bị xóa).'
    case 409:
      return `Xung đột dữ liệu${detail}.`
    case 413:
      return 'File quá lớn.'
    case 415:
      return 'Định dạng file không được hỗ trợ (chỉ JPEG, PNG, WebP).'
    case 422:
      return `Không thực hiện được${detail}.`
    case 429:
      return 'Thao tác quá nhanh. Vui lòng đợi một chút rồi thử lại.'
    case 503:
      return `Dịch vụ chưa sẵn sàng${detail}.`
    default:
      return error.status >= 500
        ? `Máy chủ gặp lỗi${error.requestId ? ` (mã ${error.requestId})` : ''}.`
        : `Yêu cầu thất bại${detail}.`
  }
}
