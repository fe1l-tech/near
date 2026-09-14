/**
 * 共享迁移执行器
 *
 * 主进程与 Web 端共用同一套迁移逻辑，避免两端行为漂移。
 * 只依赖 sql.js 的 Database 接口（run / exec），不涉及文件系统。
 */

import { MIGRATIONS, MIGRATIONS_TABLE_SQL, type Migration } from './schema'

/** sql.js Database 的最小结构（避免两端各自引类型） */
export interface MinimalDatabase {
  run(sql: string, params?: unknown[]): unknown
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>
}

/** 迁移名是我们自己的常量，仅做防御性转义 */
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * 查询已执行的迁移名。
 */
export function getExecutedMigrations(database: MinimalDatabase): Set<string> {
  database.run(MIGRATIONS_TABLE_SQL)
  const executed = new Set<string>()
  const results = database.exec('SELECT name FROM _migrations')
  if (results.length > 0) {
    for (const row of results[0].values) {
      executed.add(row[0] as string)
    }
  }
  return executed
}

/**
 * 执行未应用的迁移。
 * @param database sql.js 数据库实例
 * @param onApplied 每个迁移成功后的回调（用于落盘）
 * @returns 本次实际执行的迁移名列表
 */
export function runMigrations(
  database: MinimalDatabase,
  onApplied?: (migration: Migration) => void,
): string[] {
  const executed = getExecutedMigrations(database)
  const applied: string[] = []

  for (const migration of MIGRATIONS) {
    if (executed.has(migration.name)) continue

    for (const statement of migration.statements) {
      try {
        database.run(statement)
      } catch (error) {
        if (!migration.tolerateFailure) throw error
        // 容错迁移（如 ALTER TABLE ADD COLUMN 列已存在）忽略单条失败
      }
    }

    database.run(`INSERT INTO _migrations (name) VALUES (${quote(migration.name)})`)
    applied.push(migration.name)
    onApplied?.(migration)
  }

  return applied
}
