import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClientProfile {
  firstName?: string
  lastName?: string
  phone?: string
  company?: string
  address?: {
    street: string
    city: string
    postalCode: string
    country: string
  }
}

interface ProfileState {
  profile: ClientProfile | null
  saveProfile: (p: ClientProfile) => void
  clearProfile: () => void
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      saveProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
    }),
    { name: 'optiflow-profile' }
  )
)
