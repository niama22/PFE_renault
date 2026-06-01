import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const KEYCLOAK_URL  = '/auth/realms/optiflow/protocol/openid-connect/token'
const CLIENT_ID     = 'optiflow-web'
const CLIENT_SECRET = 'optiflow-web-secret-change-in-prod'

// ── Auth API (Keycloak) ───────────────────────────────
export const authApi = axios.create({ baseURL: '' })

export async function login(username: string, password: string) {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username,
    password,
  })
  const { data } = await authApi.post(KEYCLOAK_URL, params)
  return data
}

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  })
  const { data } = await authApi.post(KEYCLOAK_URL, params)
  return data
}

// ── Service APIs ──────────────────────────────────────
function createServiceClient(baseURL: string) {
  const client = axios.create({ baseURL })

  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true
        try {
          const { refreshToken } = useAuthStore.getState()
          if (!refreshToken) throw new Error('No refresh token')
          const data = await refreshAccessToken(refreshToken)
          useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
        } catch {
          // Refresh token itself expired/invalid → force logout
          useAuthStore.getState().logout()
          window.location.href = '/login'
          return Promise.reject(error)
        }
        // Retry with fresh token — if it still 401s (e.g. wrong role), reject silently
        return client(original)
      }
      return Promise.reject(error)
    }
  )
  return client
}

export const adminApi       = createServiceClient('/api/admin')
export const operateurApi   = createServiceClient('/api/operateur')
export const clientApi      = createServiceClient('/api/client')
export const responsableApi = createServiceClient('/api/responsable')

export async function recordAuditEvent(eventType: string, details: string) {
  try {
    await adminApi.post('/audit/login-event', { eventType, details })
  } catch { /* non-bloquant */ }
}
