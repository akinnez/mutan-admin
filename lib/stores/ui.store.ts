import { create } from 'zustand'

interface UIState {
  isMobileNavOpen: boolean
  toggleMobileNav: () => void
  closeMobileNav: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ isMobileNavOpen: !s.isMobileNavOpen })),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
}))
