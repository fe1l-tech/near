import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

interface MemoData {
  title?: string
  content?: string
  excerpt?: string
  tags?: string
  isFavorite?: boolean
  isPinned?: boolean
  isArchived?: boolean
  wordCount?: number
}

export function registerMemoIpc(): void {
  // 创建备忘录
  handle('memo:create', (data: MemoData) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    const content = data.content || ''
    db.run(
      `INSERT INTO memos (id, title, content, excerpt, tags, is_favorite, is_pinned, is_archived, word_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title || '未命名', content,
        data.excerpt || content.slice(0, 100),
        data.tags || null,
        data.isFavorite ? 1 : 0, data.isPinned ? 1 : 0, data.isArchived ? 1 : 0,
        data.wordCount || 0,
      ],
    )
    saveDatabase()
    return getMemoById(db, id)
  })

  // 获取所有备忘录
  handle('memo:get-all', () => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM memos WHERE is_archived = 0 ORDER BY is_pinned DESC, updated_at DESC`,
    )
    const rows: unknown[] = []
    while (stmt.step()) rows.push(normalizeMemo(stmt.getAsObject()))
    stmt.free()
    return rows
  })

  // 更新备忘录
  handle('memo:update', (id: string, data: MemoData) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title) }
    if (data.content !== undefined) {
      updates.push('content = ?'); params.push(data.content)
      updates.push('excerpt = ?'); params.push(data.content.slice(0, 100))
      updates.push('word_count = ?'); params.push(data.content.length)
    }
    if (data.tags !== undefined) { updates.push('tags = ?'); params.push(data.tags) }
    if (data.isFavorite !== undefined) { updates.push('is_favorite = ?'); params.push(data.isFavorite ? 1 : 0) }
    if (data.isPinned !== undefined) { updates.push('is_pinned = ?'); params.push(data.isPinned ? 1 : 0) }
    if (data.isArchived !== undefined) { updates.push('is_archived = ?'); params.push(data.isArchived ? 1 : 0) }

    if (updates.length === 0) return { success: true }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    db.run(`UPDATE memos SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })

  // 保存版本快照
  handle('memo:save-version', (memoId: string, content: string, version: number, changeNote?: string) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO memo_versions (id, memo_id, content, version, change_note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, memoId, content, version, changeNote || null],
    )
    saveDatabase()
    return { id }
  })

  // 获取版本历史
  handle('memo:get-versions', (memoId: string) => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM memo_versions WHERE memo_id = ? ORDER BY version DESC`,
    )
    stmt.bind([memoId])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  // 删除备忘录
  handle('memo:delete', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM memos WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })
}

function getMemoById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM memos WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = normalizeMemo(stmt.getAsObject())
  stmt.free()
  return result
}

function normalizeMemo(row: Record<string, unknown>): unknown {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    tags: row.tags,
    isFavorite: row.is_favorite === 1,
    isPinned: row.is_pinned === 1,
    isArchived: row.is_archived === 1,
    wordCount: row.word_count,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
