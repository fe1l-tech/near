import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '@core/ipc/ipc-client'

export interface FitnessLog {
  id: string
  exercise_name?: string
  exercise?: string
  sets_completed?: number
  sets?: number
  reps_per_set?: string
  reps?: number
  weight_per_set?: string
  weight?: number
  duration_minutes?: number
  notes?: string | null
  mood?: string | null
  log_date?: string
  date?: string
  plan_id?: string | null
  created_at?: string
}

export interface BodyStat {
  id: string
  weight_kg?: number
  weight?: number
  height_cm?: number
  bmi?: number
  body_fat_pct?: number
  bodyFat?: number
  muscle_mass_kg?: number
  waist_cm?: number
  notes?: string | null
  record_date?: string
  date?: string
  created_at?: string
}

interface FitnessPlan {
  id: string
  name: string
  description?: string
  exercises: string
  is_active: number
}

interface FitnessState {
  logs: FitnessLog[]
  stats: BodyStat[]
  plans: FitnessPlan[]
  loaded: boolean

  loadFromDb: () => Promise<void>
  addLog: (log: { exercise: string; sets: number; reps: number; weight: number; date: string; planId?: string; notes?: string; mood?: string }) => Promise<void>
  removeLog: (id: string) => Promise<void>
  addStat: (stat: { weight: number; height?: number; bmi?: number; bodyFat?: number; date: string; notes?: string }) => Promise<void>
  removeStat: (id: string) => Promise<void>
  addPlan: (plan: { name: string; description?: string; exercises: string }) => Promise<void>
  updatePlan: (id: string, data: { name?: string; description?: string; exercises?: string; isActive?: boolean }) => Promise<void>
  deletePlan: (id: string) => Promise<void>
}

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      logs: [],
      stats: [],
      plans: [],
      loaded: false,

      loadFromDb: async () => {
        try {
          const [logsResult, statsResult, plansResult] = await Promise.all([
            ipc.fitness.getLogs(200),
            ipc.fitness.getStats(200),
            ipc.fitness.getPlans(),
          ])
          const logs = Array.isArray(logsResult) ? logsResult : (logsResult as any)?.data || []
          const stats = Array.isArray(statsResult) ? statsResult : (statsResult as any)?.data || []
          const plans = Array.isArray(plansResult) ? plansResult : (plansResult as any)?.data || []
          set({ logs, stats, plans, loaded: true })
        } catch {
          set({ loaded: true })
        }
      },

      addLog: async (log) => {
        const result = await ipc.fitness.addLog(log)
        const data = (result as any)?.data || result
        if (data) {
          set((s) => ({ logs: [data as FitnessLog, ...s.logs] }))
        }
      },

      removeLog: async (id) => {
        await ipc.fitness.deleteLog(id)
        set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }))
      },

      addStat: async (stat) => {
        const result = await ipc.fitness.addStat(stat)
        const data = (result as any)?.data || result
        if (data) {
          set((s) => ({ stats: [data as BodyStat, ...s.stats] }))
        }
      },

      removeStat: async (id) => {
        await ipc.fitness.deleteStat(id)
        set((s) => ({ stats: s.stats.filter((st) => st.id !== id) }))
      },

      addPlan: async (plan) => {
        const result = await ipc.fitness.addPlan(plan)
        const data = (result as any)?.data || result
        if (data) {
          set((s) => ({ plans: [...s.plans, data as FitnessPlan] }))
        }
      },

      updatePlan: async (id, data) => {
        await ipc.fitness.updatePlan(id, data)
        set((s) => ({
          plans: s.plans.map((p) => (p.id === id ? { ...p, ...data, is_active: data.isActive ? 1 : 0 } : p)),
        }))
      },

      deletePlan: async (id) => {
        await ipc.fitness.deletePlan(id)
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) }))
      },
    }),
    { name: 'ai-workspace-fitness' },
  ),
)
