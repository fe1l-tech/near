import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

interface CalendarEventData {
  title: string
  description?: string
  type?: string
  date: string
  endDate?: string
  startTime?: string
  endTime?: string
  isAllDay?: boolean
  color?: string
  location?: string
}

export function registerCalendarIpc(): void {
  // 添加日程
  handle('calendar:add-event', (data: CalendarEventData) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO calendar_events (id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, color, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.title, data.description || null, data.type || 'event',
        data.date, data.endDate || null, data.startTime || null, data.endTime || null,
        data.isAllDay ? 1 : 0, data.color || '#e85d7a', data.location || null,
      ],
    )
    saveDatabase()
    return getEventById(db, id)
  })

  // 获取所有日程
  handle('calendar:get-events', (startDate?: string, endDate?: string) => {
    const db = getDatabase()
    let stmt
    if (startDate && endDate) {
      stmt = db.prepare(
        `SELECT * FROM calendar_events WHERE start_date >= ? AND start_date <= ?
         ORDER BY start_date ASC, start_time ASC`,
      )
      stmt.bind([startDate, endDate])
    } else {
      stmt = db.prepare(
        `SELECT * FROM calendar_events ORDER BY start_date DESC LIMIT 500`,
      )
    }
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    // 转换字段名为前端 camelCase
    return rows.map(normalizeEvent)
  })

  // 更新日程
  handle('calendar:update-event', (id: string, data: Partial<CalendarEventData>) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title) }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description) }
    if (data.type !== undefined) { updates.push('event_type = ?'); params.push(data.type) }
    if (data.date !== undefined) { updates.push('start_date = ?'); params.push(data.date) }
    if (data.endDate !== undefined) { updates.push('end_date = ?'); params.push(data.endDate) }
    if (data.startTime !== undefined) { updates.push('start_time = ?'); params.push(data.startTime) }
    if (data.endTime !== undefined) { updates.push('end_time = ?'); params.push(data.endTime) }
    if (data.isAllDay !== undefined) { updates.push('is_all_day = ?'); params.push(data.isAllDay ? 1 : 0) }
    if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color) }
    if (data.location !== undefined) { updates.push('location = ?'); params.push(data.location) }

    if (updates.length === 0) return { success: true }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    db.run(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })

  // 删除日程
  handle('calendar:delete-event', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM calendar_events WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })
}

function getEventById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM calendar_events WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = normalizeEvent(stmt.getAsObject())
  stmt.free()
  return result
}

/** 将 DB 的 snake_case 字段映射为前端 camelCase */
function normalizeEvent(row: unknown): unknown {
  const r = row as Record<string, unknown>
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.event_type,
    date: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time,
    endTime: r.end_time,
    isAllDay: r.is_all_day === 1,
    color: r.color,
    location: r.location,
    isCompleted: r.is_completed === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
