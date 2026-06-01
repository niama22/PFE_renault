import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, Role } from '@/types'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  logout: () => void
  hasRole: (role: Role) => boolean
  primaryRole: () => Role | null
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // JWT uses base64url — must replace url-safe chars before atob()
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens(token, refreshToken) {
        const payload = decodeJwt(token)
        if (!payload) return
        const roles: Role[] = (payload.roles ?? []) as Role[]
        const user: AuthUser = {
          keycloakId: payload.sub,
          username: payload.preferred_username,
          email: payload.email ?? '',
          firstName: payload.given_name,
          lastName: payload.family_name,
          roles,
        }
        set({ token, refreshToken, user, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: () => set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),

      hasRole: (role) => get().user?.roles.includes(role) ?? false,

      primaryRole: () => {
        const roles = get().user?.roles ?? []
        const order: Role[] = ['admin', 'operateur', 'responsable', 'client', 'chauffeur']
        return order.find(r => roles.includes(r)) ?? null
      },
    }),
    {
      name: 'optiflow-auth-v2',
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
