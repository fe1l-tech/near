import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

export function registerFitnessIpc(): void {
  // 添加训练记录
  handle('fitness:add-log', (data: {
    exercise: string; sets: number; reps: number; weight: number; date: string
    planId?: string; notes?: string; mood?: string
  }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO fitness_logs (id, plan_id, exercise_name, sets_completed, reps_per_set, weight_per_set, notes, mood, log_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.planId || null, data.exercise, data.sets, String(data.reps), String(data.weight), data.notes || null, data.mood || null, data.date],
    )
    saveDatabase()
    return getLogById(db, id)
  })

  // 获取训练记录
  handle('fitness:get-logs', (limit?: number) => {
    const db = getDatabase()
    const lim = limit || 100
    const stmt = db.prepare(
      `SELECT * FROM fitness_logs ORDER BY log_date DESC, created_at DESC LIMIT ?`,
    )
    stmt.bind([lim])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  // 删除训练记录
  handle('fitness:delete-log', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM fitness_logs WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // 添加身体数据
  handle('fitness:add-stat', (data: {
    weight: number; height?: number; bmi?: number; bodyFat?: number
    date: string; notes?: string
  }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    const bmi = data.bmi || (data.height ? +(data.weight / ((data.height / 100) ** 2)).toFixed(1) : null)
    db.run(
      `INSERT INTO body_stats (id, weight_kg, height_cm, bmi, body_fat_pct, notes, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.weight, data.height || null, bmi, data.bodyFat || null, data.notes || null, data.date],
    )
    saveDatabase()
    return getStatById(db, id)
  })

  // 获取身体数据
  handle('fitness:get-stats', (limit?: number) => {
    const db = getDatabase()
    const lim = limit || 100
    const stmt = db.prepare(
      `SELECT * FROM body_stats ORDER BY record_date DESC LIMIT ?`,
    )
    stmt.bind([lim])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  // 删除身体数据
  handle('fitness:delete-stat', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM body_stats WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // 健身计划
  handle('fitness:get-plans', () => {
    const db = getDatabase()
    const stmt = db.prepare('SELECT * FROM fitness_plans ORDER BY is_active DESC, created_at DESC')
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  handle('fitness:add-plan', (data: { name: string; description?: string; exercises: string }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO fitness_plans (id, name, description, exercises) VALUES (?, ?, ?, ?)`,
      [id, data.name, data.description || null, data.exercises],
    )
    saveDatabase()
    return { id, ...data, is_active: 0 }
  })

  handle('fitness:update-plan', (id: string, data: { name?: string; description?: string; exercises?: string; isActive?: boolean }) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []
    if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description) }
    if (data.exercises !== undefined) { updates.push('exercises = ?'); params.push(data.exercises) }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0) }
    if (updates.length === 0) return { success: true }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    db.run(`UPDATE fitness_plans SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })

  handle('fitness:delete-plan', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM fitness_plans WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })
}

function getLogById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM fitness_logs WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = stmt.getAsObject()
  stmt.free()
  return result
}

function getStatById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM body_stats WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = stmt.getAsObject()
  stmt.free()
  return result
}
