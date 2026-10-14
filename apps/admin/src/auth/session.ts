import { computed, reactive } from 'vue'
import { ApiError, type AuthAdapter, type HttpClient } from '../api/httpClient'

/*
 * Admin login session (API README "Authentication and session lifecycle").
 *
 * - The access token (JWT, minutes) lives in memory only.
 * - The refresh token (rotated on every refresh) is kept in localStorage so a reload or a new tab
 *   stays signed in. Each refresh token may be used once: refreshes are single-flight, and when a
 *   refresh is rejected because another tab already rotated the token, the newer stored token is
 *   tried once before signing out.
 * - A refresh that fails because the network is down does not sign out.
 */

export interface AdminUser {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  /** Access token lifetime in seconds. */
  expiresIn: number
  refreshTokenExpiresAt: string
}

export interface LoginResponse extends TokenPair {
  user: AdminUser
}

export interface TokenStorage {
  get(): string | null
  set(token: string | null): void
}

export const REFRESH_TOKEN_KEY = 'lituta.admin.refreshToken'

export const localTokenStorage: TokenStorage = {
  get() {
    try {
      return window.localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token)
      else window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // Storage blocked: the session lasts until the page is closed.
    }
  },
}

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

export function createAuthSession(deps: { http: () => HttpClient; storage: TokenStorage }) {
  const state = reactive<{ status: SessionStatus; user: AdminUser | null }>({
    status: 'unknown',
    user: null,
  })
  let accessToken: string | null = null
  let refreshing: Promise<boolean> | null = null
  const expiredListeners = new Set<() => void>()

  function apply(pair: TokenPair) {
    accessToken = pair.accessToken
    deps.storage.set(pair.refreshToken)
  }

  function clear() {
    accessToken = null
    deps.storage.set(null)
    state.user = null
    state.status = 'anonymous'
  }

  /** The session ended without the user asking (refresh rejected). */
  function expire() {
    const wasSignedIn = state.status === 'authenticated'
    clear()
    if (wasSignedIn) for (const listener of expiredListeners) listener()
  }

  const post = (path: string, body: unknown) =>
    deps.http().post<TokenPair>(path, body, { anonymous: true })

  async function runRefresh(): Promise<boolean> {
    const used = deps.storage.get()
    if (!used) {
      expire()
      return false
    }
    try {
      apply(await post('admin/auth/refresh', { refreshToken: used }))
      return true
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) return false
      // Another tab may have rotated the token meanwhile: try its newer token once.
      const stored = deps.storage.get()
      if (stored && stored !== used) {
        try {
          apply(await post('admin/auth/refresh', { refreshToken: stored }))
          return true
        } catch (retryError) {
          if (!(retryError instanceof ApiError) || retryError.status !== 401) return false
        }
      }
      expire()
      return false
    }
  }

  function refresh(): Promise<boolean> {
    refreshing ??= runRefresh().finally(() => (refreshing = null))
    return refreshing
  }

  const adapter: AuthAdapter = { accessToken: () => accessToken, refresh }

  return {
    adapter,
    user: computed(() => state.user),
    status: computed(() => state.status),

    async login(email: string, password: string) {
      const response = await deps
        .http()
        .post<LoginResponse>('admin/auth/login', { email, password }, { anonymous: true })
      apply(response)
      state.user = response.user
      state.status = 'authenticated'
      return response.user
    },

    /** On start: resumes a stored session (refresh, then reads the admin). */
    async restore(): Promise<boolean> {
      if (!deps.storage.get()) {
        state.status = 'anonymous'
        return false
      }
      if (!(await refresh())) {
        if (state.status === 'unknown') state.status = 'anonymous'
        return false
      }
      try {
        state.user = await deps.http().get<AdminUser>('admin/auth/me')
        state.status = 'authenticated'
        return true
      } catch {
        if (state.status !== 'anonymous') state.status = 'anonymous'
        return false
      }
    },

    /** Signs out here and revokes the session on the server (best effort, always succeeds). */
    async logout() {
      const token = deps.storage.get()
      clear()
      if (token) await post('admin/auth/logout', { refreshToken: token }).catch(() => undefined)
    },

    /** Called when the session ends on its own (e.g. to go to the login page). */
    onExpired(listener: () => void) {
      expiredListeners.add(listener)
      return () => expiredListeners.delete(listener)
    },
  }
}

export type AuthSession = ReturnType<typeof createAuthSession>
