import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '@/lib/types'

interface AuthState {
  user: Member | null
  isAuthenticated: boolean
  setAuth: (user: Member) => void
  logout: () => void
}

// Tokens are no longer handled here at all — they live only in the
// httpOnly cookies the backend sets, invisible to this (or any) JS. This
// store just tracks who's logged in for UI purposes; it is NOT the source
// of truth for whether a request is authenticated, the cookie is.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => {
        set({ user, isAuthenticated: true })
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },
    }),
    { name: 'mutan-admin-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
)
