import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

interface TodoData {
  title: string
  description?: string
  status?: string
  priority?: string
  dueDate?: string
  dueTime?: string
  pomodoroTotal?: number
  pomodoroDone?: number
  estimatedMinutes?: number
  tags?: string
  isFavorite?: boolean
  sortOrder?: number
}

export function registerTodoIpc(): void {
  // 创建待办
  handle('todo:create', (data: TodoData) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO todos (id, title, description, status, priority, due_date, due_time,
        pomodoro_total, pomodoro_done, estimated_minutes, tags, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title, data.description || null,
        data.status || 'pending', data.priority || 'medium',
        data.dueDate || null, data.dueTime || null,
        data.pomodoroTotal || 0, data.pomodoroDone || 0,
        data.estimatedMinutes || null,
        data.tags || null, data.isFavorite ? 1 : 0,
      ],
    )
    saveDatabase()
    return getTodoById(db, id)
  })

  // 获取所有待办
  handle('todo:get-all', () => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM todos ORDER BY sort_order ASC, created_at DESC`,
    )
    const rows: unknown[] = []
    while (stmt.step()) rows.push(normalizeTodo(stmt.getAsObject()))
    stmt.free()
    return rows
  })

  // 更新待办
  handle('todo:update', (id: string, data: Partial<TodoData>) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title) }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description) }
    if (data.status !== undefined) {
      updates.push('status = ?'); params.push(data.status)
      if (data.status === 'completed') {
        updates.push("completed_at = datetime('now')")
      } else {
        updates.push('completed_at = NULL')
      }
    }
    if (data.priority !== undefined) { updates.push('priority = ?'); params.push(data.priority) }
    if (data.dueDate !== undefined) { updates.push('due_date = ?'); params.push(data.dueDate) }
    if (data.dueTime !== undefined) { updates.push('due_time = ?'); params.push(data.dueTime) }
    if (data.pomodoroTotal !== undefined) { updates.push('pomodoro_total = ?'); params.push(data.pomodoroTotal) }
    if (data.pomodoroDone !== undefined) { updates.push('pomodoro_done = ?'); params.push(data.pomodoroDone) }
    if (data.estimatedMinutes !== undefined) { updates.push('estimated_minutes = ?'); params.push(data.estimatedMinutes) }
    if (data.tags !== undefined) { updates.push('tags = ?'); params.push(data.tags) }
    if (data.isFavorite !== undefined) { updates.push('is_favorite = ?'); params.push(data.isFavorite ? 1 : 0) }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(data.sortOrder) }

    if (updates.length === 0) return { success: true }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    db.run(`UPDATE todos SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })

  // 删除待办
  handle('todo:delete', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM todos WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })
}

function getTodoById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM todos WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = normalizeTodo(stmt.getAsObject())
  stmt.free()
  return result
}

function normalizeTodo(row: Record<string, unknown>): unknown {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    dueTime: row.due_time,
    pomodoroTotal: row.pomodoro_total,
    pomodoroDone: row.pomodoro_done,
    estimatedMinutes: row.estimated_minutes,
    actualMinutes: row.actual_minutes,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    isFavorite: row.is_favorite === 1,
    tags: row.tags,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
