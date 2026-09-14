import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createRequire } from 'module'
import { runMigrations } from '../../shared/db/migrations'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sqlModule: any = require('sql.js')
const initSqlJs = (sqlModule.default || sqlModule) as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlJsDatabase = any

let db: SqlJsDatabase | null = null
const DB_FILENAME = 'ai-workspace.db'

export async function initDatabase(): Promise<SqlJsDatabase> {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, DB_FILENAME)

  // 确保目录存在
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  // 初始化 sql.js（加载 WASM）
  const SQL = await initSqlJs()

  // 如果已有数据库文件，加载它；否则创建新数据库
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON')

  // 执行迁移（共享定义，见 src/shared/db）
  const applied = runMigrations(db, () => saveDatabase())
  if (applied.length > 0) {
    console.log(`[Database] Applied migrations: ${applied.join(', ')}`)
  }

  // 保存到磁盘
  saveDatabase()

  console.log(`[Database] Initialized at ${dbPath}`)
  return db
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function saveDatabase(): void {
  if (!db) return
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, DB_FILENAME)
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}
