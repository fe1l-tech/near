import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

export function registerStorageIpc(): void {
  // 通用查询（只读）
  handle('storage:query', (sql: string, params?: unknown[]) => {
    const db = getDatabase()
    const stmt = db.prepare(sql)
    if (params && params.length > 0) {
      stmt.bind(params as unknown[])
    }
    const rows: unknown[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  })

  // 通用执行（写入）
  handle('storage:execute', (sql: string, params?: unknown[]) => {
    const db = getDatabase()
    if (params && params.length > 0) {
      db.run(sql, params as unknown[])
    } else {
      db.run(sql)
    }
    saveDatabase()
    return { changes: db.getRowsModified() }
  })

  // 设置相关
  handle('storage:get-setting', (key: string) => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
    stmt.bind([key])
    let result: string | null = null
    if (stmt.step()) {
      const row = stmt.getAsObject() as { value: string }
      result = row.value
    }
    stmt.free()
    return result ? JSON.parse(result) : null
  })

  handle('storage:set-setting', (key: string, value: unknown, category?: string) => {
    const db = getDatabase()
    const jsonValue = JSON.stringify(value)
    const cat = category || 'general'
    db.run(
      `INSERT INTO settings (key, value, category) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, updated_at = datetime('now')`,
      [key, jsonValue, cat, jsonValue, cat],
    )
    saveDatabase()
    return { success: true }
  })

  handle('storage:get-all-settings', () => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT key, value, category FROM settings ORDER BY category')
    const rows: unknown[] = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  })

  handle('storage:delete-setting', (key: string) => {
    const db = getDatabase()
    db.run('DELETE FROM settings WHERE key = ?', [key])
    saveDatabase()
    return { success: true }
  })
}
