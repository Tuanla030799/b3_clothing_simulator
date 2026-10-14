import { createAuthSession, localTokenStorage } from '../auth/session'
import { apiBaseUrl, createHttpClient } from './httpClient'

/** The app's API client and admin session (one of each). */
export const session = createAuthSession({ http: () => http, storage: localTokenStorage })
export const http = createHttpClient({ baseUrl: apiBaseUrl, auth: session.adapter })
