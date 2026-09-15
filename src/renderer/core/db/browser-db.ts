/**
 * Web 端数据库层 —— 浏览器里跑 sql.js，持久化到 IndexedDB
 *
 * 与 Electron 主进程的 `src/main/database/index.ts` 语义对齐：
 * - 同一份 schema / 迁移（src/shared/db）
 * - 同样是「每次改动整库导出写盘」，但浏览器里做了防抖 + 页面隐藏时强制落盘，
 *   避免每次按键都序列化整库。
 *
 * 差异：Web 端没有文件系统，落盘目标是 IndexedDB 的单个 Blob 记录。
 */

import initSqlJs from 'sql.js'
import { runMigrations } from '@shared/db/migrations'
import { assetUrl } from '../build-info'

export interface SqlDatabase {
  run(sql: string, params?: unknown[]): unknown
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
  export(): Uint8Array
  getRowsModified(): number
  prepare(sql: string, params?: unknown[]): SqlStatement
  close(): void
}

export interface SqlStatement {
  bind(params?: unknown[]): boolean
  step(): boolean
  getAsObject(): Record<string, unknown>
  free(): boolean
}

type SqlJsStatic = {
  Database: new (data?: Uint8Array | null) => SqlDatabase
}

/**
 * IndexedDB 的库名 / 仓库名 / 记录键。
 * 导出是为了让测试能复用同一份定义，避免两边各写一份字面量后改名不同步。
 */
export const IDB_NAME = 'near-web'
export const IDB_STORE = 'kv'
export const IDB_KEY = 'database'/** 写盘防抖窗口：合并短时间内的连续写入 */
const SAVE_DEBOUNCE_MS = 400

export type DbStatus = 'idle' | 'loading' | 'ready' | 'error'

interface DbState {
  status: DbStatus
  error: string | null
  /** 本次启动是否加载到了已有数据 */
  restored: boolean
  /** 累计落盘次数，验证用 */
  saveCount: number
}

const state: DbState = { status: 'idle', error: null, restored: false, saveCount: 0 }

let db: SqlDatabase | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let savePromise: Promise<void> | null = null

/* ------------------------------------------------------------------ *
 * 首次运行：示例数据
 * ------------------------------------------------------------------ */

/**
 * 本次启动是否写入（或已存在）示例数据。
 * 用于首页提示横幅：只对「第一次打开 demo 的人」显示一次。
 */
const DEMO_FLAG_KEY = 'demo_data_state'
const DEMO_BANNER_DISMISSED_KEY = 'near-demo-banner-dismissed'

/**
 * 示例数据状态机。缺省（key 不存在）表示"从未处理过"。
 * - seeded：已写入示例数据，横幅可显示
 * - declined：用户清空过（或明确不要示例数据），不得再自动写入
 *
 * 用两态标记而不是"有/无标记"，是为了让"清空后刷新又自动灌回来"这类问题
 * 在结构上不可能发生。
 */
type DemoState = 'seeded' | 'declined'
let demoState: DemoState | null = null

export function isDemoActive(): boolean {
  return demoState === 'seeded'
}

export function getDemoState(): DemoState | null {
  return demoState
}

/** 用户手动关闭提示横幅后不再显示 */
export function dismissDemoBanner(): void {
  try {
    localStorage.setItem(DEMO_BANNER_DISMISSED_KEY, '1')
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略 */
  }
}

export function isDemoBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DEMO_BANNER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 清空全部业务数据，回到一个空工作台。
 * 标记为 declined 并落盘，确保下次启动不会被重新灌入示例数据。
 */
export async function clearAllDataAndPersist(): Promise<void> {
  const database = getDatabase()
  const { clearAllData } = await import('./demo-seed')
  clearAllData(database as never)
  database.run(`DELETE FROM settings WHERE key = '${DEMO_FLAG_KEY}'`)
  database.run(
    `INSERT INTO settings (key, value, category) VALUES ('${DEMO_FLAG_KEY}', '"declined"', 'demo')`,
  )
  demoState = 'declined'
  await persistNow()
}

export function getDbStatus(): Readonly<DbState> {
  return state
}

/* ------------------------------------------------------------------ *
 * IndexedDB 读写
 * ------------------------------------------------------------------ */

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const idb = request.result
      if (!idb.objectStoreNames.contains(IDB_STORE)) idb.createObjectStore(IDB_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

async function idbGet(key: string): Promise<unknown> {
  const idb = await openIdb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const request = tx.objectStore(IDB_STORE).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    idb.close()
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const idb = await openIdb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    idb.close()
  }
}

/* ------------------------------------------------------------------ *
 * 落盘
 * ------------------------------------------------------------------ */

/** 立即落盘（串行化，避免并发写互相覆盖） */
export function persistNow(): Promise<void> {
  if (saveTimer !== null) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (!db) return Promise.resolve()

  const snapshot = db.export()
  savePromise = (savePromise ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      // 复制一份独立 buffer，避免 sql.js 内部复用底层内存
      await idbSet(IDB_KEY, new Uint8Array(snapshot))
      state.saveCount += 1
    })
  return savePromise
}

/** 防抖落盘 */
export function scheduleSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persistNow()
  }, SAVE_DEBOUNCE_MS)
}

/* ------------------------------------------------------------------ *
 * 初始化
 * ------------------------------------------------------------------ */

/**
 * 加载 sql.js 的 wasm 二进制。
 *
 * 不使用 `locateFile`：sql.js(emscripten) 内部会用原生 fetch + instantiateStreaming，
 * 一旦 URL 解析出偏差（子路径部署 / 构建产物路径），它只会抛出
 * 「expected magic word ... found 3c 21 64 6f」（即拿到了 index.html），
 * 很难定位。这里改为自己 fetch，既可控又能在失败时给出明确状态码。
 *
 * 路径取自构建时注入的部署前缀（assetUrl），**不要**改用
 * `window.location.pathname`：开发服务器与正式部署的取值不同，
 * 并且会把仓库子路径重复拼进 URL（`/near/near/sql-wasm.wasm`）。
 *
 * 文件由 `vite.config.ts` 的 sqlJsWasm 插件放到产物根目录。
 */
async function loadWasmBinary(file: string): Promise<ArrayBuffer> {
  const url = assetUrl(file)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`加载 ${file} 失败：HTTP ${response.status}（请求地址 ${url}）`)
  }

  const bytes = await response.arrayBuffer()
  const magic = new Uint8Array(bytes, 0, 4)
  const isWasm = magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d
  if (!isWasm) {
    throw new Error(
      `${file} 返回的不是 wasm 文件（请求地址 ${url}，前 4 字节 ${Array.from(magic).join(',')}）。` +
        '通常是该路径被 SPA 回退成了 index.html。',
    )
  }

  return bytes
}

export interface InitOptions {
  /**
   * 是否在「全新且无数据」的库上自动写入示例数据。
   * 默认 true（网页 demo 需要第一眼就有内容）。
   * 测试里设为 false，以获得一个确定性的空库。
   */
  autoSeedDemo?: boolean
}

let initPromise: Promise<SqlDatabase> | null = null

export function initBrowserDatabase(options: InitOptions = {}): Promise<SqlDatabase> {
  if (initPromise) return initPromise
  const { autoSeedDemo = true } = options

  initPromise = (async () => {
    state.status = 'loading'
    try {
      const wasmBinary = await loadWasmBinary('sql-wasm.wasm')
      const SQL = (await initSqlJs({ wasmBinary })) as SqlJsStatic

      const existing = (await idbGet(IDB_KEY)) as Uint8Array | ArrayBuffer | undefined
      let restored = false
      let database: SqlDatabase

      if (existing) {
        const bytes = existing instanceof Uint8Array ? existing : new Uint8Array(existing)
        database = new SQL.Database(bytes)
        restored = true
      } else {
        database = new SQL.Database()
      }

      // sql.js 的 wasm 构建不支持 WAL（单文件内存库），外键约束可用
      try {
        database.run('PRAGMA foreign_keys = ON')
      } catch {
        /* 忽略：不支持时不阻塞启动 */
      }

      runMigrations(database as never, () => {
        // 迁移产生的结构变化需要落盘，但初始化末尾统一写一次即可
      })

      db = database
      state.status = 'ready'
      state.restored = restored

      // 首次创建（或迁移后）落盘
      await persistNow()

      // 首次运行：写入示例数据。
      // 只处理「从未标记过」的库；标记为 declined 的库永不自动写入，
      // 避免用户清空后被重新灌入。同时要求库里确实没有任何数据。
      try {
        const flag = database.exec(
          `SELECT value FROM settings WHERE key = '${DEMO_FLAG_KEY}'`,
        )
        const raw = flag.length > 0 && flag[0].values.length > 0 ? String(flag[0].values[0][0]) : null
        const stored = raw ? (JSON.parse(raw) as unknown) : null
        const storedState: DemoState | null =
          stored === 'seeded' || stored === 'declined' ? stored : null

        if (storedState) {
          demoState = storedState
        } else {
          const { hasUserData, seedDemoData } = await import('./demo-seed')
          // 特意先判 hasUserData：没有标记但库里已有内容 → 老版本升级上来的库，
          // 补一个标记并视为"已有数据"，绝不能当成空库去灌示例。
          if (hasUserData(database as never)) {
            database.run(
              `INSERT INTO settings (key, value, category) VALUES ('${DEMO_FLAG_KEY}', '"seeded"', 'demo')`,
            )
            demoState = 'seeded'
            await persistNow()
          } else if (autoSeedDemo) {
            const count = seedDemoData(database as never)
            database.run(
              `INSERT INTO settings (key, value, category) VALUES ('${DEMO_FLAG_KEY}', '"seeded"', 'demo')`,
            )
            demoState = 'seeded'
            await persistNow()
            console.log(`[Demo] 已写入 ${count} 条示例数据`)
          }
        }
      } catch (error) {
        // 示例数据失败不应阻塞应用启动
        console.warn('[Demo] 写入示例数据失败:', error)
      }

      // 页面隐藏/卸载时强制落盘，避免防抖窗口内丢数据
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') void persistNow()
        })
        window.addEventListener('pagehide', () => void persistNow())
      }

      return database
    } catch (error) {
      state.status = 'error'
      state.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  })()

  return initPromise
}

export function getDatabase(): SqlDatabase {
  if (!db) throw new Error('Web 数据库尚未初始化，请先 await initBrowserDatabase()')
  return db
}

/** 数据库是否已就绪 */
export function isDbReady(): boolean {
  return state.status === 'ready'
}

/* ------------------------------------------------------------------ *
 * 查询辅助
 * ------------------------------------------------------------------ */

/** 只读查询：返回行对象数组 */
export function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  const database = getDatabase()
  const stmt = database.prepare(sql)
  try {
    if (params && params.length > 0) stmt.bind(params)
    const rows: T[] = []
    while (stmt.step()) rows.push(stmt.getAsObject() as T)
    return rows
  } finally {
    stmt.free()
  }
}

/** 查询单行 */
export function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null {
  const rows = query<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/** 写入：执行后自动安排落盘 */
export function execute(sql: string, params?: unknown[]): { changes: number } {
  const database = getDatabase()
  if (params && params.length > 0) {
    database.run(sql, params)
  } else {
    database.run(sql)
  }
  scheduleSave()
  return { changes: database.getRowsModified() }
}
