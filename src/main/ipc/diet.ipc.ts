import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

export function registerDietIpc(): void {
  // 添加餐食记录
  handle('diet:add-meal', (data: {
    type: string; name: string; calories?: number; protein?: number
    fat?: number; carbs?: number; portion?: string; notes?: string
    date: string; time?: string
  }) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    const time = data.time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    db.run(
      `INSERT INTO diet_meals (id, meal_type, food_name, portion, calories, protein_g, fat_g, carbs_g, notes, meal_date, meal_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.type, data.name, data.portion || null, data.calories || null,
       data.protein ?? null, data.fat ?? null, data.carbs ?? null,
       data.notes || null, data.date, time],
    )
    saveDatabase()
    return getMealById(db, id)
  })

  // 获取餐食记录
  handle('diet:get-meals', (date?: string) => {
    const db = getDatabase()
    let stmt
    if (date) {
      stmt = db.prepare(
        `SELECT * FROM diet_meals WHERE meal_date = ? ORDER BY meal_time DESC`,
      )
      stmt.bind([date])
    } else {
      stmt = db.prepare(
        `SELECT * FROM diet_meals ORDER BY meal_date DESC, meal_time DESC LIMIT 200`,
      )
    }
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  // 删除餐食
  handle('diet:delete-meal', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM diet_meals WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // 添加饮水
  handle('diet:add-water', (amount: number, date?: string) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    const recordDate = date || new Date().toISOString().split('T')[0]
    const now = new Date()
    const recordTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    db.run(
      `INSERT INTO diet_water (id, amount_ml, record_date, record_time)
       VALUES (?, ?, ?, ?)`,
      [id, amount, recordDate, recordTime],
    )
    saveDatabase()
    return { id, amount, date: recordDate, time: recordTime }
  })

  // 获取饮水记录
  handle('diet:get-water', (date?: string) => {
    const db = getDatabase()
    const recordDate = date || new Date().toISOString().split('T')[0]
    const stmt = db.prepare(
      `SELECT * FROM diet_water WHERE record_date = ? ORDER BY record_time DESC`,
    )
    stmt.bind([recordDate])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  })

  // 每日营养汇总
  handle('diet:get-daily-summary', (date?: string) => {
    const db = getDatabase()
    const recordDate = date || new Date().toISOString().split('T')[0]
    const stmt = db.prepare(
      `SELECT
        COUNT(*) as meal_count,
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein_g), 0) as total_protein,
        COALESCE(SUM(fat_g), 0) as total_fat,
        COALESCE(SUM(carbs_g), 0) as total_carbs
       FROM diet_meals WHERE meal_date = ?`,
    )
    stmt.bind([recordDate])
    let summary: unknown = { meal_count: 0, total_calories: 0, total_protein: 0, total_fat: 0, total_carbs: 0 }
    if (stmt.step()) summary = stmt.getAsObject()
    stmt.free()

    // 饮水汇总
    const waterStmt = db.prepare(
      `SELECT COALESCE(SUM(amount_ml), 0) as total_water FROM diet_water WHERE record_date = ?`,
    )
    waterStmt.bind([recordDate])
    let totalWater = 0
    if (waterStmt.step()) {
      totalWater = (waterStmt.getAsObject() as { total_water: number }).total_water
    }
    waterStmt.free()

    return { ...(summary as object), total_water: totalWater, date: recordDate }
  })
}

function getMealById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM diet_meals WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = stmt.getAsObject()
  stmt.free()
  return result
}
