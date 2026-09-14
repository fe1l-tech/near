/**
 * IPC 客户端 — 封装对 Electron API 的调用
 *
 * 在浏览器开发模式下，window.api 不存在，使用 mock 替代。
 * 在 Electron 中，preload 脚本会注入 window.api。
 */

import { webApiSubset } from './web-api'

// 检查是否在 Electron 环境中
const isElectron = typeof window !== 'undefined' && 'api' in window

function getApi() {
  if (isElectron) {
    return window.api
  }
  // Web 模式：mock 打底（未实现的域），已实现的域用真实 sql.js 实现覆盖
  return { ...createMockApi(), ...webApiSubset }
}

function createMockApi() {
  const warn = (method: string) => console.warn(`[IPC Mock] ${method} — 仅在 Electron 中可用`)
  return {
    platform: 'browser',
    isElectron: false,

    file: {
      read: async (path: string) => { warn(`read(${path})`); return { success: false, error: 'Not in Electron' } },
      write: async (path: string, content: string) => { warn(`write(${path})`); return { success: false } },
      list: async (path: string) => { warn(`list(${path})`); return { success: false } },
      stat: async (path: string) => { warn(`stat(${path})`); return { success: false } },
    },
    shell: {
      exec: async (cmd: string) => { warn(`exec(${cmd})`); return { success: false, error: 'Not in Electron' } },
    },
    storage: {
      query: async () => [],
      execute: async () => ({ changes: 0 }),
      getSetting: async () => null,
      setSetting: async () => ({ success: true }),
      getAllSettings: async () => [],
      deleteSetting: async () => ({ success: true }),
    },
    system: {
      getVersion: async () => ({ app: '0.1.0-dev', node: '24', chrome: '130', electron: '33' }),
      getPath: async () => '/mock/path',
      clipboardRead: async () => '',
      clipboardWrite: async () => ({ success: true }),
    },
    fitness: {
      addLog: async () => ({ id: crypto.randomUUID() }),
      getLogs: async () => [],
      deleteLog: async () => ({ success: true }),
      addStat: async () => ({ id: crypto.randomUUID() }),
      getStats: async () => [],
      deleteStat: async () => ({ success: true }),
      getPlans: async () => [],
      addPlan: async () => ({ id: crypto.randomUUID() }),
      updatePlan: async () => ({ success: true }),
      deletePlan: async () => ({ success: true }),
    },
    diet: {
      addMeal: async () => ({ id: crypto.randomUUID() }),
      getMeals: async () => [],
      deleteMeal: async () => ({ success: true }),
      addWater: async () => ({ id: crypto.randomUUID() }),
      getWater: async () => [],
      getDailySummary: async () => ({ meal_count: 0, total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0, total_water: 0 }),
    },
    weather: {
      getCached: async () => null,
      setCache: async () => ({ success: true }),
    },
    quotes: {
      getRandom: async () => ({ quote_text: 'Stay hungry, stay foolish.', quote_zh: '求知若饥，虚心若愚。', author: 'Steve Jobs' }),
      getDaily: async () => ({ quote_text: 'Stay hungry, stay foolish.', quote_zh: '求知若饥，虚心若愚。', author: 'Steve Jobs' }),
      addQuote: async () => ({ id: crypto.randomUUID() }),
      getQuotes: async () => [],
    },
    conversation: {
      create: async (data: any) => ({ id: crypto.randomUUID(), title: data?.title || '', createdAt: new Date().toISOString() }),
      list: async () => [],
      update: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      addMessage: async () => ({ id: crypto.randomUUID() }),
      getMessages: async () => [],
      updateMessage: async () => ({ success: true }),
    },
    todo: {
      create: async (data: any) => ({ id: crypto.randomUUID(), title: data?.title || '', status: 'pending', createdAt: new Date().toISOString() }),
      getAll: async () => [],
      update: async () => ({ success: true }),
      delete: async () => ({ success: true }),
    },
    memo: {
      create: async (data: any) => ({ id: data?.id || crypto.randomUUID(), title: data?.title || '未命名', content: data?.content || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      getAll: async () => [],
      update: async () => ({ success: true }),
      saveVersion: async () => ({ id: crypto.randomUUID() }),
      getVersions: async () => [],
      delete: async () => ({ success: true }),
    },
    calendar: {
      addEvent: async () => ({ id: crypto.randomUUID() }),
      getEvents: async () => [],
      updateEvent: async () => ({ success: true }),
      deleteEvent: async () => ({ success: true }),
    },
    claude: {
      checkAvailability: async () => {
        warn('checkAvailability()')
        return { success: true, data: { available: false, error: '仅在 Electron 中可用' } }
      },
      send: async () => {
        warn('send()')
        return { success: false, error: '仅在 Electron 中可用' }
      },
      stop: async () => {
        warn('stop()')
        return { success: false, error: '仅在 Electron 中可用' }
      },
      onStreamEvent: (_callback: (event: unknown) => void) => {
        warn('onStreamEvent()')
        return () => {}
      },
    },
  }
}

export const ipc = new Proxy({} as ReturnType<typeof getApi>, {
  get(_target, prop, receiver) {
    const api = getApi() as Record<string | symbol, unknown>
    const value = Reflect.get(api, prop, receiver)
    return typeof value === 'function' ? value.bind(api) : value
  },
})

/**
 * 在 Web 模式下把同一份实现暴露到 window.api。
 * 好处有两个：
 * 1. 与 Electron 保持一致 —— 应用代码只认 window.api，无需区分运行环境；
 * 2. 便于在浏览器控制台/自动化里直接验证数据库读写。
 *
 * 注意：`ipc` 是 Proxy，每次访问都重新解析实际实现，
 * 所以这里晚于模块求值挂载也不会导致页面拿到 mock 的过期引用。
 */
if (!isElectron && typeof window !== 'undefined') {
  Reflect.set(window, 'api', ipc)
}
