import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'
import { seedDefaultQuotes } from '../../shared/db/seed-quotes'

export function registerQuoteIpc(): void {
  // 初始化默认语录（仅当表为空时）；种子数据与 Web 端共用同一份定义
  const db = getDatabase()
  const countStmt = db.prepare('SELECT COUNT(*) as cnt FROM daily_quotes')
  countStmt.step()
  const count = (countStmt.getAsObject() as { cnt: number }).cnt
  countStmt.free()

  if (count === 0) {
    const seeded = seedDefaultQuotes(
      (sql, params) => db.run(sql, params),
      () => crypto.randomUUID(),
    )
    saveDatabase()
    console.log(`[Quotes] Seeded ${seeded} default quotes`)
  }

  // 随机获取一条语录
  handle('quotes:get-random', () => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1`,
    )
    let result: unknown = null
    if (stmt.step()) result = stmt.getAsObject()
    stmt.free()
    return result
  })

  // 获取每日语录（优先未使用的）
  handle('quotes:get-daily', () => {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    // 先检查今天是否已有指定语录
    const todayStmt = db.prepare(
      `SELECT * FROM daily_quotes WHERE used_date = ? LIMIT 1`,
    )
    todayStmt.bind([today])
    let result: unknown = null
    if (todayStmt.step()) result = todayStmt.getAsObject()
    todayStmt.free()

    if (result) return result

    // 随机选择一条未使用的
    const stmt = db.prepare(
      `SELECT * FROM daily_quotes WHERE is_used = 0 ORDER BY RANDOM() LIMIT 1`,
    )
    if (stmt.step()) result = stmt.getAsObject()
    stmt.free()

    // 全部用过了，重置并随机选一条
    if (!result) {
      db.run("UPDATE daily_quotes SET is_used = 0, used_date = NULL")
      const resetStmt = db.prepare(
        `SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1`,
      )
      if (resetStmt.step()) result = resetStmt.getAsObject()
      resetStmt.free()
    }

    // 标记已使用
    if (result) {
      const r = result as { id: string }
      db.run("UPDATE daily_quotes SET is_used = 1, used_date = ? WHERE id = ?", [today, r.id])
      saveDatabase()
    }

    return result
  })

  // 添加语录
  handle('quotes:add-quote', (data: { text: string; zh?: string; author: string; source?: string; type?: string }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO daily_quotes (id, quote_text, quote_zh, author, source, quote_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.text, data.zh || null, data.author, data.source || null, data.type || 'motivation'],
    )
    saveDatabase()
    return { id, ...data }
  })

  // 获取所有语录
  handle('quotes:get-quotes', (type?: string) => {
    const db = getDatabase()
    let stmt
    if (type) {
      stmt = db.prepare('SELECT * FROM daily_quotes WHERE quote_type = ? ORDER BY created_at DESC')
      stmt.bind([type])
    } else {
      stmt = db.prepare('SELECT * FROM daily_quotes ORDER BY created_at DESC')
    }
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })
}
