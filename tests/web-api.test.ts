/**
 * Web 端 API 集成测试
 *
 * 在 Node（jsdom）里跑真实的 sql.js + fake-indexeddb，验证：
 * 1. 浏览器数据库能初始化并建表；
 * 2. 各业务域（todo/memo/calendar/fitness/diet/quotes/conversation/storage）读写正确；
 * 3. 生命周期结束后数据真的落在 IndexedDB 里，且新模块实例（模拟刷新页面）能读回。
 *
 * 为什么值得存在：Web 版是桌面版的第二套「后端」，没有这层测试时，
 * 任何一处 SQL 写错都只能靠人肉点页面才发现。
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
// 为 jsdom 补齐 IndexedDB
import 'fake-indexeddb/auto'

/** 拦截 wasm 请求，改用本地文件内容（jsdom 里没有真实的静态资源服务） */
const WASM_PATH = resolve('node_modules/sql.js/dist/sql-wasm.wasm')
const wasmBytes = readFileSync(WASM_PATH)

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    if (String(url).includes('sql-wasm.wasm')) {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength),
      }
    }
    throw new Error(`测试未预期的 fetch: ${url}`)
  })
})

/**
 * 载入一套全新的模块实例（模拟一次页面加载）。
 *
 * 两个开关分别对应两类用例：
 * - `isolate`（默认 true）：连同持久化数据一起清掉，让用例从确定性的空库开始。
 *   注意 `vi.resetModules()` 只重置模块，**不会**重置 IndexedDB，
 *   而 fake-indexeddb 在一个测试文件内是共享的，必须显式清。
 * - `isolate: false`：保留 IndexedDB，用来模拟"刷新页面"（模块重置但数据还在）。
 *
 * `autoSeedDemo` 默认关闭，需要验证示例数据的用例再显式打开。
 */
async function bootFresh(
  options: { autoSeedDemo?: boolean; isolate?: boolean } = {},
) {
  vi.resetModules()
  if (options.isolate ?? true) {
    localStorage.clear()
    await deletePersistedDatabase()
  }

  const db = await import('@core/db/browser-db')
  const api = await import('@core/ipc/web-api')
  await db.initBrowserDatabase({ autoSeedDemo: options.autoSeedDemo ?? false })
  return { db, api: api.webApiSubset }
}

/**
 * 删除 IndexedDB 里持久化的数据库快照，模拟「首次访问」。
 *
 * 库名与对象仓库名刻意从源模块读取，不在这里再写一份字面量 ——
 * 之前硬编码过一次，改名后测试就悄悄失效了（仍读得到旧库，于是"隔离"形同虚设）。
 */
async function deletePersistedDatabase(): Promise<void> {
  const { IDB_NAME, IDB_STORE } = await import('@core/db/browser-db')
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains(IDB_STORE)) idb.createObjectStore(IDB_STORE)
    }
    request.onsuccess = () => {
      const idb = request.result
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete('database')
      tx.oncomplete = () => {
        idb.close()
        resolve()
      }
      tx.onerror = () => {
        idb.close()
        reject(tx.error)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

describe('Web 端数据库与 API', () => {
  it('初始化后建立完整 schema，且标记为首次创建', async () => {
    const { db } = await bootFresh()
    const status = db.getDbStatus()
    expect(status.status).toBe('ready')
    expect(status.error).toBeNull()
    expect(status.restored).toBe(false)

    const tables = db.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    const names = tables.map((t) => t.name)
    // 迁移记录表 + 业务表
    expect(names).toContain('_migrations')
    for (const table of [
      'settings',
      'conversations',
      'messages',
      'todos',
      'calendar_events',
      'memos',
      'memo_versions',
      'fitness_plans',
      'fitness_logs',
      'body_stats',
      'diet_meals',
      'diet_water',
      'daily_quotes',
      'weather_cache',
    ]) {
      expect(names, `缺少表 ${table}`).toContain(table)
    }
  })

  it('todo：创建、读取、更新（含 completed_at 语义）', async () => {
    const { api } = await bootFresh()

    const created = await api.todo.create({ title: '写周报', priority: 'high' })
    expect(created).toBeTruthy()
    expect(created?.title).toBe('写周报')

    let all = await api.todo.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('pending')
    expect(all[0].completedAt).toBeNull()

    await api.todo.update(all[0].id, { status: 'completed' })
    all = await api.todo.getAll()
    expect(all[0].status).toBe('completed')
    expect(all[0].completedAt).toBeTruthy()

    // 取消完成后 completed_at 应被清空
    await api.todo.update(all[0].id, { status: 'pending' })
    all = await api.todo.getAll()
    expect(all[0].completedAt).toBeNull()

    await api.todo.delete(all[0].id)
    expect(await api.todo.getAll()).toHaveLength(0)
  })

  it('memo：tags 往返、版本快照、归档后不出现在列表', async () => {
    const { api } = await bootFresh()

    const memo = await api.memo.create({ title: '会议记录', content: '讨论了发布节奏', tags: '工作,发布' })
    expect(memo?.tags).toBe('工作,发布')

    await api.memo.saveVersion(memo!.id, '第一版内容', 1, '初稿')
    const versions = await api.memo.getVersions(memo!.id)
    expect(versions).toHaveLength(1)

    await api.memo.update(memo!.id, { isArchived: true })
    expect(await api.memo.getAll()).toHaveLength(0)
  })

  it('calendar：按日期区间过滤', async () => {
    const { api } = await bootFresh()

    await api.calendar.addEvent({ title: '站会', date: '2026-09-14', startTime: '10:00' })
    await api.calendar.addEvent({ title: '复盘', date: '2026-09-20', startTime: '15:00' })

    expect(await api.calendar.getEvents()).toHaveLength(2)
    const inRange = await api.calendar.getEvents('2026-09-14', '2026-09-15')
    expect(inRange).toHaveLength(1)
    expect(inRange[0].title).toBe('站会')
  })

  it('fitness：日志 / 身体数据 / 计划，且 BMI 自动计算', async () => {
    const { api } = await bootFresh()

    await api.fitness.addLog({ exercise: '深蹲', sets: 5, reps: 5, weight: 80, date: '2026-09-13' })
    await api.fitness.addStat({ weight: 70, height: 175, date: '2026-09-13' })
    const plan = await api.fitness.addPlan({ name: '推拉腿', exercises: 'bench,squat' })

    expect(await api.fitness.getLogs()).toHaveLength(1)
    const stats = await api.fitness.getStats()
    expect(stats).toHaveLength(1)
    // 70 / 1.75^2 = 22.857 → 22.9
    expect((stats[0] as { bmi: number }).bmi).toBeCloseTo(22.9, 1)

    expect(await api.fitness.getPlans()).toHaveLength(1)
    await api.fitness.updatePlan(plan.id, { isActive: true })
    const plans = await api.fitness.getPlans()
    expect((plans[0] as { is_active: number }).is_active).toBe(1)
  })

  it('diet：餐食与饮水汇总', async () => {
    const { api } = await bootFresh()

    await api.diet.addMeal({
      type: 'lunch', name: '牛肉面', calories: 620, protein: 28, fat: 18, carbs: 78, date: '2026-09-13',
    })
    await api.diet.addWater(500, '2026-09-13')
    await api.diet.addWater(300, '2026-09-13')

    const summary = await api.diet.getDailySummary('2026-09-13')
    expect(summary.meal_count).toBe(1)
    expect(summary.total_calories).toBe(620)
    expect(summary.total_protein).toBe(28)
    expect(summary.total_water).toBe(800)
  })

  it('quotes：首次访问自动播种，且每日语录当天稳定', async () => {
    const { api } = await bootFresh()

    const all = await api.quotes.getQuotes()
    expect(all.length).toBe(20)

    const daily = await api.quotes.getDaily()
    expect(daily?.quote_text).toBeTruthy()

    const again = await api.quotes.getDaily()
    expect(again?.id).toBe(daily?.id)
  })

  it('storage：设置项 JSON 往返', async () => {
    const { api } = await bootFresh()

    expect(await api.storage.getSetting('username')).toBeNull()
    await api.storage.setSetting('username', '洲', 'general')
    await api.storage.setSetting('defaultModel', 'deepseek-chat', 'ai')

    expect(await api.storage.getSetting('username')).toBe('洲')
    const all = await api.storage.getAllSettings()
    expect(all).toHaveLength(2)

    await api.storage.deleteSetting('username')
    expect(await api.storage.getSetting('username')).toBeNull()
  })

  it('conversation：消息落库并递增计数', async () => {
    const { api } = await bootFresh()

    const conv = await api.conversation.create({ title: '新对话' })
    await api.conversation.addMessage({ conversationId: conv!.id, role: 'user', content: '你好' })
    await api.conversation.addMessage({ conversationId: conv!.id, role: 'assistant', content: '你好，有什么可以帮你？' })

    const messages = await api.conversation.getMessages(conv!.id)
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')

    const list = await api.conversation.list()
    expect((list[0] as { messageCount: number }).messageCount).toBe(2)
  })

  it('持久化：写入后落盘，新实例（模拟刷新页面）能读回数据', async () => {
    const first = await bootFresh()
    await first.api.todo.create({ title: '刷新后应仍在', priority: 'urgent' })
    await first.api.storage.setSetting('username', '洲', 'general')

    // 直接落盘，不依赖防抖 timer
    await first.db.persistNow()
    expect(first.db.getDbStatus().saveCount).toBeGreaterThan(0)

    // 全新模块实例：模拟页面刷新后重新从 IndexedDB 恢复
    const second = await bootFresh({ isolate: false })
    const status = second.db.getDbStatus()
    expect(status.restored).toBe(true)

    const todos = await second.api.todo.getAll()
    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe('刷新后应仍在')
    expect(await second.api.storage.getSetting('username')).toBe('洲')
  })

  it('示例数据：首次启动写入，二次启动不重复写入', async () => {
    const first = await bootFresh({ autoSeedDemo: true })
    const status = await first.api.demo.getStatus()
    expect(status.active).toBe(true)
    expect(status.bannerDismissed).toBe(false)

    // 首页需要立刻有内容
    expect((await first.api.todo.getAll()).length).toBeGreaterThan(5)
    expect((await first.api.memo.getAll()).length).toBeGreaterThan(0)
    expect((await first.api.calendar.getEvents()).length).toBeGreaterThan(0)
    expect((await first.api.conversation.list()).length).toBeGreaterThan(0)

    // 示例对话必须真的有内容（卖点演示）
    const convs = await first.api.conversation.list()
    const messages = await first.api.conversation.getMessages(convs[0].id as string)
    expect(messages.length).toBeGreaterThanOrEqual(4)

    const todoCount = (await first.api.todo.getAll()).length

    await first.db.persistNow()

    // 刷新页面：不应再写一遍示例数据
    const second = await bootFresh({ autoSeedDemo: true, isolate: false })
    expect(second.db.getDbStatus().restored).toBe(true)
    expect(await second.api.demo.getStatus()).toMatchObject({ active: true })
    expect((await second.api.todo.getAll()).length).toBe(todoCount)
  })

  it('清空数据：业务表清空、示例标记移除，且不再被当作首次运行', async () => {
    const first = await bootFresh({ autoSeedDemo: true })
    expect((await first.api.todo.getAll()).length).toBeGreaterThan(0)

    await first.api.demo.clearAll()
    expect(await first.api.todo.getAll()).toHaveLength(0)
    expect(await first.api.memo.getAll()).toHaveLength(0)
    expect(await first.api.calendar.getEvents()).toHaveLength(0)
    expect(await first.api.conversation.list()).toHaveLength(0)
    expect(await first.api.demo.getStatus()).toMatchObject({ active: false })

    // 再次刷新：库里没有任何数据，但状态已标记为 declined，
    // 不能再自动灌入示例数据（否则用户永远清不干净）
    const second = await bootFresh({ autoSeedDemo: true, isolate: false })
    expect(second.db.getDemoState()).toBe('declined')
    expect(await second.api.todo.getAll()).toHaveLength(0)
  })

  it('老库升级：已存在数据但没有示例标记时，不灌示例数据，只补标记', async () => {
    // 模拟"上一个版本留下的库"：有真实数据，但没有 demo 标记
    const legacy = await bootFresh()
    await legacy.api.todo.create({ title: '我自己建的待办', priority: 'high' })
    await legacy.db.persistNow()

    // 新版本启动（开启自动示例）
    const upgraded = await bootFresh({ autoSeedDemo: true, isolate: false })
    expect(upgraded.db.getDemoState()).toBe('seeded')

    const todos = await upgraded.api.todo.getAll()
    // 关键：不能被示例数据淹没，也不能丢失原有数据
    expect(todos).toHaveLength(1)
    expect(todos[0].title).toBe('我自己建的待办')
    // 示例数据没有写入，所以备忘/对话仍为空
    expect(await upgraded.api.memo.getAll()).toHaveLength(0)
    expect(await upgraded.api.conversation.list()).toHaveLength(0)
  })

  it('迁移幂等：二次启动不会重复建表或重复播种语录', async () => {
    const first = await bootFresh()
    await first.api.quotes.getQuotes()
    await first.db.persistNow()

    const second = await bootFresh()
    // 已存在的迁移不会重跑，语录也不会再被播种一次
    expect(await second.api.quotes.getQuotes()).toHaveLength(20)

    const migrations = second.db.query<{ name: string }>('SELECT name FROM _migrations')
    const names = migrations.map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
