import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProposedTournee, ConfirmedTourneeDto } from '@/types'

interface PlanningState {
  proposed: ProposedTournee[]
  confirmed: ConfirmedTourneeDto[] | null
  setProposed: (t: ProposedTournee[]) => void
  setConfirmed: (t: ConfirmedTourneeDto[]) => void
  reset: () => void
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    set => ({
      proposed:  [],
      confirmed: null,
      setProposed:  proposed  => set({ proposed, confirmed: null }),
      setConfirmed: confirmed => set({ confirmed }),
      reset: () => set({ proposed: [], confirmed: null }),
    }),
    { name: 'optiflow-planning' }
  )
)
