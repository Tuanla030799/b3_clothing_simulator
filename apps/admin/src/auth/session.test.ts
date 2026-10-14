import { describe, expect, it, vi } from 'vitest'
import { ApiError, type HttpClient } from '../api/httpClient'
import { createAuthSession, type TokenStorage } from './session'

const pair = (n: number) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  refreshTokenExpiresAt: '2099-01-01T00:00:00Z',
})
const user = { id: 'u1', email: 'a@lituta.vn', name: 'Owner', createdAt: '2026-01-01T00:00:00Z' }

function setup(
  stored: string | null,
  post: (path: string, body: { refreshToken?: string }) => Promise<unknown>,
) {
  let value = stored
  const storage: TokenStorage = { get: () => value, set: (token) => (value = token) }
  const http = {
    post: vi.fn(async (path: string, body: unknown) =>
      post(path, body as { refreshToken?: string }),
    ),
    get: vi.fn(async () => user),
  } as unknown as HttpClient
  const session = createAuthSession({ http: () => http, storage })
  return {
    session,
    http,
    stored: () => value,
    setStored: (token: string | null) => (value = token),
  }
}

const unauthorized = () => new ApiError('http', 'Unauthorized', { status: 401 })

describe('createAuthSession', () => {
  it('logs in, keeps the refresh token and exposes the access token', async () => {
    const { session, stored } = setup(null, async () => ({ ...pair(1), user }))
    await session.login('a@lituta.vn', 'secret password')
    expect(session.status.value).toBe('authenticated')
    expect(session.user.value).toEqual(user)
    expect(session.adapter.accessToken()).toBe('access-1')
    expect(stored()).toBe('refresh-1')
  })

  it('restores a stored session with a refresh and reads the admin', async () => {
    const { session, stored } = setup('refresh-0', async () => pair(1))
    await expect(session.restore()).resolves.toBe(true)
    expect(session.status.value).toBe('authenticated')
    expect(stored()).toBe('refresh-1')
  })

  it('refreshes once for concurrent 401s (each refresh token is single use)', async () => {
    let calls = 0
    const { session } = setup('refresh-0', async () => {
      calls++
      await Promise.resolve()
      return pair(calls)
    })
    const results = await Promise.all([session.adapter.refresh(), session.adapter.refresh()])
    expect(results).toEqual([true, true])
    expect(calls).toBe(1)
  })

  it('uses the newer token another tab stored when its own was already rotated', async () => {
    const env = setup('refresh-0', async (_path, body) => {
      if (body.refreshToken === 'refresh-0') {
        env.setStored('refresh-from-other-tab')
        throw unauthorized()
      }
      return pair(2)
    })
    await expect(env.session.adapter.refresh()).resolves.toBe(true)
    expect(env.stored()).toBe('refresh-2')
  })

  it('ends the session and notifies when the refresh is rejected', async () => {
    const { session, stored } = setup(null, async (path) => {
      if (path.endsWith('login')) return { ...pair(1), user }
      throw unauthorized()
    })
    await session.login('a@lituta.vn', 'x')
    const expired = vi.fn()
    session.onExpired(expired)
    await expect(session.adapter.refresh()).resolves.toBe(false)
    expect(session.status.value).toBe('anonymous')
    expect(stored()).toBeNull()
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the refresh fails because the network is down', async () => {
    const { session, stored } = setup('refresh-0', async () => {
      throw new ApiError('network', 'offline')
    })
    await expect(session.adapter.refresh()).resolves.toBe(false)
    expect(stored()).toBe('refresh-0')
  })

  it('logs out locally even when revoking on the server fails', async () => {
    const { session, http, stored } = setup('refresh-0', async (path) => {
      if (path.endsWith('logout')) throw new ApiError('network', 'offline')
      return pair(1)
    })
    await session.restore()
    await session.logout()
    expect(session.status.value).toBe('anonymous')
    expect(stored()).toBeNull()
    expect(http.post).toHaveBeenLastCalledWith(
      'admin/auth/logout',
      { refreshToken: 'refresh-1' },
      { anonymous: true },
    )
  })
})
