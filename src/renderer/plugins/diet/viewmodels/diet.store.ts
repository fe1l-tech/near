import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '@core/ipc/ipc-client'

export interface Meal {
  id: string
  meal_type?: string
  type?: string
  food_name?: string
  name?: string
  portion?: string
  calories?: number
  cal?: number
  protein_g?: number
  protein?: number
  fat_g?: number
  fat?: number
  carbs_g?: number
  carbs?: number
  notes?: string
  meal_date?: string
  date?: string
  meal_time?: string
  time?: string
}

export interface DailySummary {
  meal_count: number
  total_calories: number
  total_protein: number
  total_fat: number
  total_carbs: number
  total_water: number
  date: string
}

interface DietState {
  meals: Meal[]
  waters: { id: string; amount: number; date: string; time?: string }[]
  summary: DailySummary
  loaded: boolean

  loadFromDb: (date?: string) => Promise<void>
  addMeal: (meal: {
    type: string; name: string; calories?: number; protein?: number
    fat?: number; carbs?: number; portion?: string; notes?: string
    date: string; time?: string
  }) => Promise<void>
  removeMeal: (id: string) => Promise<void>
  addWater: (amount: number, date?: string) => Promise<void>
}

export const useDietStore = create<DietState>()(
  persist(
    (set, get) => ({
      meals: [],
      waters: [],
      summary: { meal_count: 0, total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0, total_water: 0, date: new Date().toISOString().split('T')[0] },
      loaded: false,

      loadFromDb: async (date?: string) => {
        try {
          const today = date || new Date().toISOString().split('T')[0]
          const [mealsResult, watersResult, summaryResult] = await Promise.all([
            ipc.diet.getMeals(today),
            ipc.diet.getWater(today),
            ipc.diet.getDailySummary(today),
          ])
          const meals = Array.isArray(mealsResult) ? mealsResult : (mealsResult as any)?.data || []
          const waters = Array.isArray(watersResult) ? watersResult : (watersResult as any)?.data || []
          const summary = (summaryResult as any)?.data || summaryResult || get().summary
          set({ meals, waters, summary, loaded: true })
        } catch {
          set({ loaded: true })
        }
      },

      addMeal: async (meal) => {
        const result = await ipc.diet.addMeal(meal)
        const data = (result as any)?.data || result
        if (data) {
          set((s) => ({ meals: [data as Meal, ...s.meals] }))
          // 重新加载摘要
          const today = meal.date
          const summaryResult = await ipc.diet.getDailySummary(today)
          const summary = (summaryResult as any)?.data || summaryResult
          if (summary) set({ summary })
        }
      },

      removeMeal: async (id) => {
        await ipc.diet.deleteMeal(id)
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }))
        // 重新加载摘要
        const today = new Date().toISOString().split('T')[0]
        const summaryResult = await ipc.diet.getDailySummary(today)
        const summary = (summaryResult as any)?.data || summaryResult
        if (summary) set({ summary })
      },

      addWater: async (amount, date?: string) => {
        const result = await ipc.diet.addWater(amount, date)
        const data = (result as any)?.data || result
        if (data) {
          set((s) => ({ waters: [{ id: data.id || crypto.randomUUID(), amount, date: data.date || date || new Date().toISOString().split('T')[0], time: data.time }, ...s.waters] }))
        }
        // 重新加载摘要
        const today = date || new Date().toISOString().split('T')[0]
        const summaryResult = await ipc.diet.getDailySummary(today)
        const summary = (summaryResult as any)?.data || summaryResult
        if (summary) set({ summary })
      },
    }),
    { name: 'ai-workspace-diet' },
  ),
)
