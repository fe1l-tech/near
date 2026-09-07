import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload 脚本 — 安全地暴露主进程 API 给渲染进程
 * 使用 contextBridge 确保上下文隔离
 */
const api = {
  platform: process.platform,
  isElectron: true,

  // 文件操作
  file: {
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
    list: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
    stat: (filePath: string) => ipcRenderer.invoke('file:stat', filePath),
  },

  // Shell 操作
  shell: {
    exec: (cmd: string) => ipcRenderer.invoke('shell:exec', cmd),
  },

  // 数据库操作
  storage: {
    query: (sql: string, params?: unknown[]) => ipcRenderer.invoke('storage:query', sql, params),
    execute: (sql: string, params?: unknown[]) => ipcRenderer.invoke('storage:execute', sql, params),
    getSetting: (key: string) => ipcRenderer.invoke('storage:get-setting', key),
    setSetting: (key: string, value: unknown, category?: string) => ipcRenderer.invoke('storage:set-setting', key, value, category),
    getAllSettings: () => ipcRenderer.invoke('storage:get-all-settings'),
    deleteSetting: (key: string) => ipcRenderer.invoke('storage:delete-setting', key),
  },

  // 系统信息
  system: {
    getVersion: () => ipcRenderer.invoke('system:get-version'),
    getPath: (name: string) => ipcRenderer.invoke('system:get-path', name),
    clipboardRead: () => ipcRenderer.invoke('system:clipboard-read'),
    clipboardWrite: (text: string) => ipcRenderer.invoke('system:clipboard-write', text),
  },

  // 健身模块
  fitness: {
    addLog: (data: { exercise: string; sets: number; reps: number; weight: number; date: string; planId?: string; notes?: string; mood?: string }) =>
      ipcRenderer.invoke('fitness:add-log', data),
    getLogs: (limit?: number) => ipcRenderer.invoke('fitness:get-logs', limit),
    deleteLog: (id: string) => ipcRenderer.invoke('fitness:delete-log', id),
    addStat: (data: { weight: number; height?: number; bmi?: number; bodyFat?: number; date: string; notes?: string }) =>
      ipcRenderer.invoke('fitness:add-stat', data),
    getStats: (limit?: number) => ipcRenderer.invoke('fitness:get-stats', limit),
    deleteStat: (id: string) => ipcRenderer.invoke('fitness:delete-stat', id),
    getPlans: () => ipcRenderer.invoke('fitness:get-plans'),
    addPlan: (data: { name: string; description?: string; exercises: string }) =>
      ipcRenderer.invoke('fitness:add-plan', data),
    updatePlan: (id: string, data: { name?: string; description?: string; exercises?: string; isActive?: boolean }) =>
      ipcRenderer.invoke('fitness:update-plan', id, data),
    deletePlan: (id: string) => ipcRenderer.invoke('fitness:delete-plan', id),
  },

  // 饮食模块
  diet: {
    addMeal: (data: { type: string; name: string; calories?: number; protein?: number; fat?: number; carbs?: number; portion?: string; notes?: string; date: string; time?: string }) =>
      ipcRenderer.invoke('diet:add-meal', data),
    getMeals: (date?: string) => ipcRenderer.invoke('diet:get-meals', date),
    deleteMeal: (id: string) => ipcRenderer.invoke('diet:delete-meal', id),
    addWater: (amount: number, date?: string) => ipcRenderer.invoke('diet:add-water', amount, date),
    getWater: (date?: string) => ipcRenderer.invoke('diet:get-water', date),
    getDailySummary: (date?: string) => ipcRenderer.invoke('diet:get-daily-summary', date),
  },

  // 天气模块
  weather: {
    getCached: (location: string) => ipcRenderer.invoke('weather:get-cached', location),
    setCache: (location: string, data: unknown, lat?: number, lon?: number) =>
      ipcRenderer.invoke('weather:set-cache', location, data, lat, lon),
  },

  // 语录模块
  quotes: {
    getRandom: () => ipcRenderer.invoke('quotes:get-random'),
    getDaily: () => ipcRenderer.invoke('quotes:get-daily'),
    addQuote: (data: { text: string; zh?: string; author: string; source?: string; type?: string }) =>
      ipcRenderer.invoke('quotes:add-quote', data),
    getQuotes: (type?: string) => ipcRenderer.invoke('quotes:get-quotes', type),
  },

  // 对话模块
  conversation: {
    create: (data: { title: string; model?: string; systemPrompt?: string; claudeSessionId?: string }) =>
      ipcRenderer.invoke('conversation:create', data),
    list: () => ipcRenderer.invoke('conversation:list'),
    update: (id: string, data: { title?: string; model?: string; systemPrompt?: string; pinned?: boolean; archived?: boolean; claudeSessionId?: string }) =>
      ipcRenderer.invoke('conversation:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('conversation:delete', id),
    addMessage: (data: { conversationId: string; role: string; content: string; thinking?: string }) =>
      ipcRenderer.invoke('conversation:add-message', data),
    getMessages: (conversationId: string) =>
      ipcRenderer.invoke('conversation:get-messages', conversationId),
    updateMessage: (id: string, data: { content?: string; thinking?: string }) =>
      ipcRenderer.invoke('conversation:update-message', id, data),
  },

  // 待办模块
  todo: {
    create: (data: {
      title: string; description?: string; priority?: string
      dueDate?: string; dueTime?: string; tags?: string
      pomodoroTotal?: number; estimatedMinutes?: number
    }) => ipcRenderer.invoke('todo:create', data),
    getAll: () => ipcRenderer.invoke('todo:get-all'),
    update: (id: string, data: {
      title?: string; description?: string; status?: string; priority?: string
      dueDate?: string; dueTime?: string; pomodoroTotal?: number; pomodoroDone?: number
      estimatedMinutes?: number; tags?: string; isFavorite?: boolean; sortOrder?: number
    }) => ipcRenderer.invoke('todo:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('todo:delete', id),
  },

  // 备忘录模块
  memo: {
    create: (data: { id?: string; title?: string; content?: string; excerpt?: string; tags?: string; isFavorite?: boolean; isPinned?: boolean }) =>
      ipcRenderer.invoke('memo:create', data),
    getAll: () => ipcRenderer.invoke('memo:get-all'),
    update: (id: string, data: { title?: string; content?: string; excerpt?: string; tags?: string; isFavorite?: boolean; isPinned?: boolean; isArchived?: boolean }) =>
      ipcRenderer.invoke('memo:update', id, data),
    saveVersion: (memoId: string, content: string, version: number, changeNote?: string) =>
      ipcRenderer.invoke('memo:save-version', memoId, content, version, changeNote),
    getVersions: (memoId: string) =>
      ipcRenderer.invoke('memo:get-versions', memoId),
    delete: (id: string) => ipcRenderer.invoke('memo:delete', id),
  },

  // 日历模块
  calendar: {
    addEvent: (data: { title: string; description?: string; type?: string; date: string; endDate?: string; startTime?: string; endTime?: string; isAllDay?: boolean; color?: string; location?: string }) =>
      ipcRenderer.invoke('calendar:add-event', data),
    getEvents: (startDate?: string, endDate?: string) =>
      ipcRenderer.invoke('calendar:get-events', startDate, endDate),
    updateEvent: (id: string, data: {
      title?: string; description?: string; type?: string; date?: string
      endDate?: string; startTime?: string; endTime?: string
      isAllDay?: boolean; color?: string; location?: string
    }) => ipcRenderer.invoke('calendar:update-event', id, data),
    deleteEvent: (id: string) => ipcRenderer.invoke('calendar:delete-event', id),
  },

  // Claude Code 模块
  claude: {
    checkAvailability: () => ipcRenderer.invoke('claude:check-availability'),
    send: (claudeSessionId: string | null, prompt: string, options?: { cwd?: string; model?: string }) =>
      ipcRenderer.invoke('claude:send', claudeSessionId, prompt, options),
    stop: (streamId: string) => ipcRenderer.invoke('claude:stop', streamId),
    onStreamEvent: (callback: (event: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('claude:stream-event', handler)
      return () => { ipcRenderer.removeListener('claude:stream-event', handler) }
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
