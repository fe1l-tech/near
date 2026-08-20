interface ElectronAPI {
  platform: string
  isElectron: boolean

  file: {
    read: (path: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    write: (path: string, content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    list: (dirPath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    stat: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  }

  shell: {
    exec: (cmd: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  }

  storage: {
    query: (sql: string, params?: unknown[]) => Promise<unknown[]>
    execute: (sql: string, params?: unknown[]) => Promise<{ changes: number }>
    getSetting: (key: string) => Promise<unknown | null>
    setSetting: (key: string, value: unknown, category?: string) => Promise<{ success: boolean }>
    getAllSettings: () => Promise<unknown[]>
    deleteSetting: (key: string) => Promise<{ success: boolean }>
  }

  system: {
    getVersion: () => Promise<{ app: string; node: string; chrome: string; electron: string }>
    getPath: (name: string) => Promise<string>
    clipboardRead: () => Promise<string>
    clipboardWrite: (text: string) => Promise<{ success: boolean }>
  }

  fitness: {
    addLog: (data: {
      exercise: string; sets: number; reps: number; weight: number; date: string
      planId?: string; notes?: string; mood?: string
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>
    getLogs: (limit?: number) => Promise<unknown[]>
    deleteLog: (id: string) => Promise<{ success: boolean }>
    addStat: (data: {
      weight: number; height?: number; bmi?: number; bodyFat?: number
      date: string; notes?: string
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>
    getStats: (limit?: number) => Promise<unknown[]>
    deleteStat: (id: string) => Promise<{ success: boolean }>
    getPlans: () => Promise<unknown[]>
    addPlan: (data: { name: string; description?: string; exercises: string }) =>
      Promise<{ success: boolean; data?: unknown; error?: string }>
    updatePlan: (id: string, data: { name?: string; description?: string; exercises?: string; isActive?: boolean }) =>
      Promise<{ success: boolean }>
    deletePlan: (id: string) => Promise<{ success: boolean }>
  }

  diet: {
    addMeal: (data: {
      type: string; name: string; calories?: number; protein?: number
      fat?: number; carbs?: number; portion?: string; notes?: string
      date: string; time?: string
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>
    getMeals: (date?: string) => Promise<unknown[]>
    deleteMeal: (id: string) => Promise<{ success: boolean }>
    addWater: (amount: number, date?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    getWater: (date?: string) => Promise<unknown[]>
    getDailySummary: (date?: string) => Promise<{
      meal_count: number; total_calories: number; total_protein: number
      total_fat: number; total_carbs: number; total_water: number
    }>
  }

  weather: {
    getCached: (location: string) => Promise<{ location: string; data: unknown; expiresAt: string } | null>
    setCache: (location: string, data: unknown, lat?: number, lon?: number) => Promise<{ success: boolean }>
  }

  quotes: {
    getRandom: () => Promise<{ quote_text: string; quote_zh: string; author: string; source?: string } | null>
    getDaily: () => Promise<{ quote_text: string; quote_zh: string; author: string; source?: string } | null>
    addQuote: (data: { text: string; zh?: string; author: string; source?: string; type?: string }) =>
      Promise<{ success: boolean; data?: unknown; error?: string }>
    getQuotes: (type?: string) => Promise<unknown[]>
  }

  conversation: {
    create: (data: { title: string; model?: string; systemPrompt?: string; claudeSessionId?: string }) =>
      Promise<{ success: boolean; data?: unknown; error?: string }>
    list: () => Promise<unknown[]>
    update: (id: string, data: { title?: string; model?: string; systemPrompt?: string; pinned?: boolean; archived?: boolean }) =>
      Promise<{ success: boolean }>
    delete: (id: string) => Promise<{ success: boolean }>
    addMessage: (data: { conversationId: string; role: string; content: string; thinking?: string }) =>
      Promise<{ success: boolean; data?: unknown; error?: string }>
    getMessages: (conversationId: string) => Promise<unknown[]>
    updateMessage: (id: string, data: { content?: string; thinking?: string }) =>
      Promise<{ success: boolean }>
  }

  calendar: {
    addEvent: (data: {
      title: string; description?: string; type?: string; date: string
      endDate?: string; startTime?: string; endTime?: string
      isAllDay?: boolean; color?: string; location?: string
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>
    getEvents: (startDate?: string, endDate?: string) => Promise<unknown[]>
    updateEvent: (id: string, data: {
      title?: string; description?: string; type?: string; date?: string
      endDate?: string; startTime?: string; endTime?: string
      isAllDay?: boolean; color?: string; location?: string
    }) => Promise<{ success: boolean }>
    deleteEvent: (id: string) => Promise<{ success: boolean }>
  }

  claude: {
    checkAvailability: () => Promise<{ success: boolean; data?: { available: boolean; version?: string; error?: string }; error?: string }>
    send: (claudeSessionId: string | null, prompt: string, options?: { cwd?: string; model?: string }) =>
      Promise<{ success: boolean; data?: { streamId: string }; error?: string }>
    stop: (streamId: string) => Promise<{ success: boolean; data?: { killed: boolean }; error?: string }>
    onStreamEvent: (callback: (event: unknown) => void) => () => void
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export type { ElectronAPI }
