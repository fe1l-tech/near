import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

export function registerWeatherIpc(): void {
  // 获取缓存的天气数据
  handle('weather:get-cached', (location: string) => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM weather_cache WHERE location = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1`,
    )
    stmt.bind([location])
    let result: unknown = null
    if (stmt.step()) {
      const row = stmt.getAsObject() as { data: string; location: string; latitude: number; longitude: number; expires_at: string }
      result = {
        location: row.location,
        latitude: row.latitude,
        longitude: row.longitude,
        data: JSON.parse(row.data),
        expiresAt: row.expires_at,
      }
    }
    stmt.free()
    return result
  })

  // 缓存天气数据
  handle('weather:set-cache', (location: string, data: unknown, lat?: number, lon?: number) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    // 缓存 30 分钟
    db.run(
      `INSERT INTO weather_cache (id, location, latitude, longitude, data, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+30 minutes'))`,
      [id, location, lat || null, lon || null, JSON.stringify(data)],
    )
    // 清理过期缓存
    db.run("DELETE FROM weather_cache WHERE expires_at < datetime('now')")
    saveDatabase()
    return { success: true }
  })
}
