import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '@core/ipc/ipc-client'

export interface TodoItem {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  dueTime?: string
  pomodoroTotal: number
  pomodoroDone: number
  estimatedMinutes?: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }

function tagsToString(tags: string[]): string { return tags.join(',') }
function stringToTags(s: string | null): string[] {
  if (!s) return []
  return s.split(',').map(t => t.trim()).filter(Boolean)
}

interface TodoState {
  todos: TodoItem[]
  filter: 'all' | 'active' | 'completed'
  searchQuery: string
  loaded: boolean

  loadFromDb: () => Promise<void>
  add: (title: string, options?: { priority?: TodoItem['priority']; dueDate?: string; dueTime?: string }) => void
  update: (id: string, updates: Partial<TodoItem>) => void
  remove: (id: string) => void
  toggle: (id: string) => void

  setFilter: (f: 'all' | 'active' | 'completed') => void
  setSearch: (q: string) => void

  getFiltered: () => TodoItem[]
  getStats: () => { total: number; completed: number; active: number; completionRate: number }
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      filter: 'all',
      searchQuery: '',
      loaded: false,

      loadFromDb: async () => {
        try {
          const result = await ipc.todo.getAll()
          const dbTodos = Array.isArray(result) ? result : (result as any)?.data || []
          if (dbTodos.length > 0) {
            const todos = dbTodos.map((t: any) => ({
              ...t,
              tags: Array.isArray(t.tags) ? t.tags : stringToTags(t.tags),
              status: t.status || 'pending',
              priority: t.priority || 'medium',
              pomodoroTotal: t.pomodoroTotal || 0,
              pomodoroDone: t.pomodoroDone || 0,
            })) as TodoItem[]
            set({ todos, loaded: true })
          } else {
            set({ loaded: true })
          }
        } catch {
          set({ loaded: true })
        }
      },

      add: (title, options) => {
        const priority = options?.priority || 'medium'
        const now = new Date().toISOString()
        const newTodo: TodoItem = {
          id: crypto.randomUUID(), title, description: '',
          status: 'pending', priority,
          dueDate: options?.dueDate, dueTime: options?.dueTime,
          pomodoroTotal: 0, pomodoroDone: 0,
          tags: [], createdAt: now, updatedAt: now,
        }
        set((s) => ({ todos: [...s.todos, newTodo] }))
        // 同步到 SQLite
        try {
          ipc.todo.create({ title, priority, dueDate: options?.dueDate, dueTime: options?.dueTime })
        } catch { /* 降级 */ }
      },

      update: (id, updates) => {
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
        }))
        // 同步到 SQLite
        try {
          const ipcData: any = { ...updates }
          if (updates.tags) ipcData.tags = tagsToString(updates.tags)
          ipc.todo.update(id, ipcData)
        } catch { /* 降级 */ }
      },

      remove: (id) => {
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }))
        try { ipc.todo.delete(id) } catch { /* 降级 */ }
      },

      toggle: (id) => {
        const todo = get().todos.find(t => t.id === id)
        if (!todo) return
        const newStatus = todo.status === 'completed' ? 'pending' as const : 'completed' as const
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t),
        }))
        try { ipc.todo.update(id, { status: newStatus }) } catch { /* 降级 */ }
      },

      setFilter: (filter) => set({ filter }),
      setSearch: (q) => set({ searchQuery: q }),

      getFiltered: () => {
        const { todos, filter, searchQuery } = get()
        let result = todos

        if (filter === 'active') result = result.filter((t) => t.status !== 'completed')
        else if (filter === 'completed') result = result.filter((t) => t.status === 'completed')

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          result = result.filter((t) => t.title.toLowerCase().includes(q))
        }

        return result.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'completed' ? 1 : -1
          return (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2)
        })
      },

      getStats: () => {
        const { todos } = get()
        const total = todos.length
        const completed = todos.filter((t) => t.status === 'completed').length
        return { total, completed, active: total - completed, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
      },
    }),
    { name: 'ai-workspace-todos' },
  ),
)
