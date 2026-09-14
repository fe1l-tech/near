import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '@core/ipc/ipc-client'

export interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string // ISO date YYYY-MM-DD
  startTime?: string
  endTime?: string
  color: string
  type: 'event' | 'task' | 'birthday' | 'reminder'
  isAllDay: boolean
  location?: string
}

interface CalendarState {
  events: CalendarEvent[]
  currentDate: string // ISO date
  view: 'month' | 'week' | 'day'
  loaded: boolean

  loadFromDb: () => Promise<void>
  setView: (view: 'month' | 'week' | 'day') => void
  setCurrentDate: (date: string) => void
  goToToday: () => void
  goPrev: () => void
  goNext: () => void

  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>

  getEventsByDate: (date: string) => CalendarEvent[]
  getUpcomingEvents: (days: number) => CalendarEvent[]
}

const EVENT_COLORS: Record<string, string> = {
  event: '#e85d7a',
  task: '#f59e0b',
  birthday: '#a78bfa',
  reminder: '#60a5fa',
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      currentDate: new Date().toISOString().split('T')[0],
      view: 'month',
      loaded: false,

      loadFromDb: async () => {
        try {
          const result = await ipc.calendar.getEvents()
          const dbEvents = Array.isArray(result) ? result : (result as any)?.data || []
          // 注意：即使为空也要覆盖本地状态，否则清空数据或删完日程后，
          // 从 localStorage 恢复的旧日程会一直留在界面上。
          set({ events: dbEvents as CalendarEvent[], loaded: true })
        } catch {
          set({ loaded: true })
        }
      },

      setView: (view) => set({ view }),
      setCurrentDate: (date) => set({ currentDate: date }),
      goToToday: () => set({ currentDate: new Date().toISOString().split('T')[0] }),
      goPrev: () => {
        const { currentDate, view } = get()
        const d = new Date(currentDate)
        if (view === 'month') d.setMonth(d.getMonth() - 1)
        else if (view === 'week') d.setDate(d.getDate() - 7)
        else d.setDate(d.getDate() - 1)
        set({ currentDate: d.toISOString().split('T')[0] })
      },
      goNext: () => {
        const { currentDate, view } = get()
        const d = new Date(currentDate)
        if (view === 'month') d.setMonth(d.getMonth() + 1)
        else if (view === 'week') d.setDate(d.getDate() + 7)
        else d.setDate(d.getDate() + 1)
        set({ currentDate: d.toISOString().split('T')[0] })
      },

      addEvent: async (event) => {
        const newEvent = { ...event, id: crypto.randomUUID(), color: EVENT_COLORS[event.type] || '#e85d7a' }
        set((s) => ({ events: [...s.events, newEvent] }))
        // 同步到 SQLite
        try {
          await ipc.calendar.addEvent({
            title: newEvent.title,
            description: newEvent.description,
            type: newEvent.type,
            date: newEvent.date,
            startTime: newEvent.startTime,
            endTime: newEvent.endTime,
            isAllDay: newEvent.isAllDay,
            color: newEvent.color,
            location: newEvent.location,
          })
        } catch { /* 降级：仅 localStorage */ }
      },

      updateEvent: async (id, updates) => {
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
        try {
          await ipc.calendar.updateEvent(id, updates)
        } catch { /* 降级 */ }
      },

      deleteEvent: async (id) => {
        set((s) => ({ events: s.events.filter((e) => e.id !== id) }))
        try {
          await ipc.calendar.deleteEvent(id)
        } catch { /* 降级 */ }
      },

      getEventsByDate: (date) => get().events.filter((e) => e.date === date),
      getUpcomingEvents: (days) => {
        const now = new Date()
        const end = new Date(now.getTime() + days * 86400000)
        return get()
          .events.filter((e) => {
            const d = new Date(e.date)
            return d >= now && d <= end
          })
          .sort((a, b) => a.date.localeCompare(b.date))
      },
    }),
    { name: 'ai-workspace-calendar' },
  ),
)
