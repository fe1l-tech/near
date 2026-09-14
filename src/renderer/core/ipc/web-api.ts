/**
 * Web 端 `window.api` 实现 —— 浏览器里替代 Electron preload 暴露的接口
 *
 * 契约与 `src/preload/index.ts` 保持一致，renderer 侧代码无需改动。
 * 已覆盖：storage / todo / memo / calendar / conversation / fitness / diet / quotes / weather。
 * 平台能力（claude CLI / file / shell / system）在浏览器中无对应实现，
 * 一律留给 fallback mock，并由 `core/platform.ts` 在 UI 层隐藏入口。
 *
 * 注意：这里的 SQL 与 `src/main/ipc/*.ts` 是同源的业务逻辑，保持逐字对应便于比对行为；
 * fitness / diet / quotes / weather 与主进程一致，直接返回 snake_case 原始行，不做字段映射。
 */

import { execute, getDatabase, persistNow, query, queryOne } from '../db/browser-db'
import { seedDefaultQuotes } from '@shared/db/seed-quotes'

const uuid = () => crypto.randomUUID()

/* ------------------------------------------------------------------ *
 * 行 → 前端对象 的字段映射（与 main/ipc 里的 normalize* 对齐）
 * ------------------------------------------------------------------ */

function normalizeTodo(row: Record<string, unknown>) {
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

function normalizeMemo(row: Record<string, unknown>) {
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

function normalizeEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.event_type,
    date: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    isAllDay: row.is_all_day === 1,
    color: row.color,
    location: row.location,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeConversation(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    systemPrompt: row.system_prompt,
    pinned: row.pinned === 1,
    archived: row.archived === 1,
    tokenCount: row.token_count,
    messageCount: row.message_count,
    claudeSessionId: row.claude_session_id,
    claudeModel: row.claude_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    thinking: row.thinking,
    toolCalls: row.tool_calls,
    toolResults: row.tool_results,
    tokenCount: row.token_count,
    isError: row.is_error === 1,
    createdAt: row.created_at,
  }
}

/** 动态构造 UPDATE 语句（与 main/ipc 的写法一致） */
function buildUpdate(
  table: string,
  id: string,
  mapping: Array<[value: unknown, column: string, transform?: (v: unknown) => unknown]>,
): void {
  const sets: string[] = []
  const params: unknown[] = []
  for (const [value, column, transform] of mapping) {
    if (value === undefined) continue
    sets.push(`${column} = ?`)
    params.push(transform ? transform(value) : value)
  }
  if (sets.length === 0) return
  sets.push("updated_at = datetime('now')")
  params.push(id)
  execute(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, params)
}

const boolToInt = (v: unknown) => (v ? 1 : 0)

/* ------------------------------------------------------------------ *
 * storage
 * ------------------------------------------------------------------ */

const storage = {
  async query(sql: string, params?: unknown[]) {
    return query(sql, params)
  },
  async execute(sql: string, params?: unknown[]) {
    return execute(sql, params)
  },
  async getSetting(key: string) {
    const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch {
      return row.value
    }
  },
  async setSetting(key: string, value: unknown, category?: string) {
    const jsonValue = JSON.stringify(value)
    const cat = category || 'general'
    execute(
      `INSERT INTO settings (key, value, category) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, updated_at = datetime('now')`,
      [key, jsonValue, cat, jsonValue, cat],
    )
    return { success: true }
  },
  async getAllSettings() {
    return query('SELECT key, value, category FROM settings ORDER BY category')
  },
  async deleteSetting(key: string) {
    execute('DELETE FROM settings WHERE key = ?', [key])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * todo
 * ------------------------------------------------------------------ */

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

const todo = {
  async create(data: TodoData) {
    const id = uuid()
    execute(
      `INSERT INTO todos (id, title, description, status, priority, due_date, due_time,
        pomodoro_total, pomodoro_done, estimated_minutes, tags, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.description || null,
        data.status || 'pending',
        data.priority || 'medium',
        data.dueDate || null,
        data.dueTime || null,
        data.pomodoroTotal || 0,
        data.pomodoroDone || 0,
        data.estimatedMinutes || null,
        data.tags || null,
        data.isFavorite ? 1 : 0,
      ],
    )
    const row = queryOne('SELECT * FROM todos WHERE id = ?', [id])
    return row ? normalizeTodo(row) : null
  },

  async getAll() {
    return query('SELECT * FROM todos ORDER BY sort_order ASC, created_at DESC').map(normalizeTodo)
  },

  async update(id: string, data: Partial<TodoData>) {
    const sets: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title) }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
    if (data.status !== undefined) {
      sets.push('status = ?')
      params.push(data.status)
      sets.push(data.status === 'completed' ? "completed_at = datetime('now')" : 'completed_at = NULL')
    }
    if (data.priority !== undefined) { sets.push('priority = ?'); params.push(data.priority) }
    if (data.dueDate !== undefined) { sets.push('due_date = ?'); params.push(data.dueDate) }
    if (data.dueTime !== undefined) { sets.push('due_time = ?'); params.push(data.dueTime) }
    if (data.pomodoroTotal !== undefined) { sets.push('pomodoro_total = ?'); params.push(data.pomodoroTotal) }
    if (data.pomodoroDone !== undefined) { sets.push('pomodoro_done = ?'); params.push(data.pomodoroDone) }
    if (data.estimatedMinutes !== undefined) { sets.push('estimated_minutes = ?'); params.push(data.estimatedMinutes) }
    if (data.tags !== undefined) { sets.push('tags = ?'); params.push(data.tags) }
    if (data.isFavorite !== undefined) { sets.push('is_favorite = ?'); params.push(boolToInt(data.isFavorite)) }
    if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(data.sortOrder) }

    if (sets.length === 0) return { success: true }
    sets.push("updated_at = datetime('now')")
    params.push(id)
    execute(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`, params)
    return { success: true }
  },

  async delete(id: string) {
    execute('DELETE FROM todos WHERE id = ?', [id])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * memo
 * ------------------------------------------------------------------ */

interface MemoData {
  id?: string
  title?: string
  content?: string
  excerpt?: string
  tags?: string
  isFavorite?: boolean
  isPinned?: boolean
  isArchived?: boolean
  wordCount?: number
}

const memo = {
  async create(data: MemoData) {
    const id = data.id || uuid()
    const content = data.content || ''
    execute(
      `INSERT INTO memos (id, title, content, excerpt, tags, is_favorite, is_pinned, is_archived, word_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title || '未命名',
        content,
        data.excerpt || content.slice(0, 100),
        data.tags || null,
        boolToInt(data.isFavorite),
        boolToInt(data.isPinned),
        boolToInt(data.isArchived),
        data.wordCount || 0,
      ],
    )
    const row = queryOne('SELECT * FROM memos WHERE id = ?', [id])
    return row ? normalizeMemo(row) : null
  },

  async getAll() {
    return query(
      'SELECT * FROM memos WHERE is_archived = 0 ORDER BY is_pinned DESC, updated_at DESC',
    ).map(normalizeMemo)
  },

  async update(id: string, data: MemoData) {
    const sets: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title) }
    if (data.content !== undefined) {
      sets.push('content = ?'); params.push(data.content)
      sets.push('excerpt = ?'); params.push(data.content.slice(0, 100))
      sets.push('word_count = ?'); params.push(data.content.length)
    }
    if (data.tags !== undefined) { sets.push('tags = ?'); params.push(data.tags) }
    if (data.isFavorite !== undefined) { sets.push('is_favorite = ?'); params.push(boolToInt(data.isFavorite)) }
    if (data.isPinned !== undefined) { sets.push('is_pinned = ?'); params.push(boolToInt(data.isPinned)) }
    if (data.isArchived !== undefined) { sets.push('is_archived = ?'); params.push(boolToInt(data.isArchived)) }

    if (sets.length === 0) return { success: true }
    sets.push("updated_at = datetime('now')")
    params.push(id)
    execute(`UPDATE memos SET ${sets.join(', ')} WHERE id = ?`, params)
    return { success: true }
  },

  async saveVersion(memoId: string, content: string, version: number, changeNote?: string) {
    const id = uuid()
    execute(
      `INSERT INTO memo_versions (id, memo_id, content, version, change_note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, memoId, content, version, changeNote || null],
    )
    return { id }
  },

  async getVersions(memoId: string) {
    return query('SELECT * FROM memo_versions WHERE memo_id = ? ORDER BY version DESC', [memoId])
  },

  async delete(id: string) {
    execute('DELETE FROM memos WHERE id = ?', [id])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * calendar
 * ------------------------------------------------------------------ */

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

const calendar = {
  async addEvent(data: CalendarEventData) {
    const id = uuid()
    execute(
      `INSERT INTO calendar_events (id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, color, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.description || null,
        data.type || 'event',
        data.date,
        data.endDate || null,
        data.startTime || null,
        data.endTime || null,
        boolToInt(data.isAllDay),
        data.color || '#e85d7a',
        data.location || null,
      ],
    )
    const row = queryOne('SELECT * FROM calendar_events WHERE id = ?', [id])
    return row ? normalizeEvent(row) : null
  },

  async getEvents(startDate?: string, endDate?: string) {
    const rows =
      startDate && endDate
        ? query(
            `SELECT * FROM calendar_events WHERE start_date >= ? AND start_date <= ?
             ORDER BY start_date ASC, start_time ASC`,
            [startDate, endDate],
          )
        : query('SELECT * FROM calendar_events ORDER BY start_date DESC LIMIT 500')
    return rows.map(normalizeEvent)
  },

  async updateEvent(id: string, data: Partial<CalendarEventData>) {
    const sets: string[] = []
    const params: unknown[] = []
    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title) }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
    if (data.type !== undefined) { sets.push('event_type = ?'); params.push(data.type) }
    if (data.date !== undefined) { sets.push('start_date = ?'); params.push(data.date) }
    if (data.endDate !== undefined) { sets.push('end_date = ?'); params.push(data.endDate) }
    if (data.startTime !== undefined) { sets.push('start_time = ?'); params.push(data.startTime) }
    if (data.endTime !== undefined) { sets.push('end_time = ?'); params.push(data.endTime) }
    if (data.isAllDay !== undefined) { sets.push('is_all_day = ?'); params.push(boolToInt(data.isAllDay)) }
    if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color) }
    if (data.location !== undefined) { sets.push('location = ?'); params.push(data.location) }

    if (sets.length === 0) return { success: true }
    sets.push("updated_at = datetime('now')")
    params.push(id)
    execute(`UPDATE calendar_events SET ${sets.join(', ')} WHERE id = ?`, params)
    return { success: true }
  },

  async deleteEvent(id: string) {
    execute('DELETE FROM calendar_events WHERE id = ?', [id])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * conversation
 * ------------------------------------------------------------------ */

interface ConversationData {
  title: string
  model?: string
  systemPrompt?: string
  claudeSessionId?: string
}

interface MessageData {
  conversationId: string
  role: string
  content: string
  thinking?: string
  toolCalls?: string
  toolResults?: string
  tokenCount?: number
  isError?: boolean
}

const conversation = {
  async create(data: ConversationData) {
    const id = uuid()
    execute(
      `INSERT INTO conversations (id, title, model, system_prompt, claude_session_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.title, data.model || 'deepseek-chat', data.systemPrompt || null, data.claudeSessionId || null],
    )
    const row = queryOne('SELECT * FROM conversations WHERE id = ?', [id])
    return row ? normalizeConversation(row) : null
  },

  async list() {
    return query('SELECT * FROM conversations WHERE archived = 0 ORDER BY updated_at DESC').map(
      normalizeConversation,
    )
  },

  async update(
    id: string,
    data: Partial<ConversationData & { pinned?: boolean; archived?: boolean }>,
  ) {
    buildUpdate('conversations', id, [
      [data.title, 'title'],
      [data.model, 'model'],
      [data.systemPrompt, 'system_prompt'],
      [data.claudeSessionId, 'claude_session_id'],
      [data.pinned, 'pinned', boolToInt],
      [data.archived, 'archived', boolToInt],
    ])
    return { success: true }
  },

  async delete(id: string) {
    execute('DELETE FROM conversations WHERE id = ?', [id])
    return { success: true }
  },

  async addMessage(data: MessageData) {
    const id = uuid()
    execute(
      `INSERT INTO messages (id, conversation_id, role, content, thinking, tool_calls, tool_results, token_count, is_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.conversationId,
        data.role,
        data.content,
        data.thinking || null,
        data.toolCalls || null,
        data.toolResults || null,
        data.tokenCount || null,
        boolToInt(data.isError),
      ],
    )
    execute(
      "UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?",
      [data.conversationId],
    )
    const row = queryOne('SELECT * FROM messages WHERE id = ?', [id])
    return row ? normalizeMessage(row) : null
  },

  async getMessages(conversationId: string) {
    return query('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [
      conversationId,
    ]).map(normalizeMessage)
  },

  async updateMessage(id: string, data: { content?: string; thinking?: string }) {
    buildUpdate('messages', id, [
      [data.content, 'content'],
      [data.thinking, 'thinking'],
    ])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * fitness
 * 与主进程一致：直接返回 snake_case 原始行（前端 store 自行兼容两种字段名）
 * ------------------------------------------------------------------ */

const fitness = {
  async addLog(data: {
    exercise: string
    sets: number
    reps: number
    weight: number
    date: string
    planId?: string
    notes?: string
    mood?: string
  }) {
    const id = uuid()
    execute(
      `INSERT INTO fitness_logs (id, plan_id, exercise_name, sets_completed, reps_per_set, weight_per_set, notes, mood, log_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.planId || null,
        data.exercise,
        data.sets,
        String(data.reps),
        String(data.weight),
        data.notes || null,
        data.mood || null,
        data.date,
      ],
    )
    return queryOne('SELECT * FROM fitness_logs WHERE id = ?', [id])
  },

  async getLogs(limit?: number) {
    return query('SELECT * FROM fitness_logs ORDER BY log_date DESC, created_at DESC LIMIT ?', [
      limit || 100,
    ])
  },

  async deleteLog(id: string) {
    execute('DELETE FROM fitness_logs WHERE id = ?', [id])
    return { success: true }
  },

  async addStat(data: {
    weight: number
    height?: number
    bmi?: number
    bodyFat?: number
    date: string
    notes?: string
  }) {
    const id = uuid()
    const bmi =
      data.bmi || (data.height ? +(data.weight / (data.height / 100) ** 2).toFixed(1) : null)
    execute(
      `INSERT INTO body_stats (id, weight_kg, height_cm, bmi, body_fat_pct, notes, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.weight, data.height || null, bmi, data.bodyFat || null, data.notes || null, data.date],
    )
    return queryOne('SELECT * FROM body_stats WHERE id = ?', [id])
  },

  async getStats(limit?: number) {
    return query('SELECT * FROM body_stats ORDER BY record_date DESC LIMIT ?', [limit || 100])
  },

  async deleteStat(id: string) {
    execute('DELETE FROM body_stats WHERE id = ?', [id])
    return { success: true }
  },

  async getPlans() {
    return query('SELECT * FROM fitness_plans ORDER BY is_active DESC, created_at DESC')
  },

  async addPlan(data: { name: string; description?: string; exercises: string }) {
    const id = uuid()
    execute('INSERT INTO fitness_plans (id, name, description, exercises) VALUES (?, ?, ?, ?)', [
      id,
      data.name,
      data.description || null,
      data.exercises,
    ])
    return { id, ...data, is_active: 0 }
  },

  async updatePlan(
    id: string,
    data: { name?: string; description?: string; exercises?: string; isActive?: boolean },
  ) {
    const sets: string[] = []
    const params: unknown[] = []
    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name) }
    if (data.description !== undefined) { sets.push('description = ?'); params.push(data.description) }
    if (data.exercises !== undefined) { sets.push('exercises = ?'); params.push(data.exercises) }
    if (data.isActive !== undefined) { sets.push('is_active = ?'); params.push(boolToInt(data.isActive)) }

    if (sets.length === 0) return { success: true }
    sets.push("updated_at = datetime('now')")
    params.push(id)
    execute(`UPDATE fitness_plans SET ${sets.join(', ')} WHERE id = ?`, params)
    return { success: true }
  },

  async deletePlan(id: string) {
    execute('DELETE FROM fitness_plans WHERE id = ?', [id])
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * diet
 * ------------------------------------------------------------------ */

const diet = {
  async addMeal(data: {
    type: string
    name: string
    calories?: number
    protein?: number
    fat?: number
    carbs?: number
    portion?: string
    notes?: string
    date: string
    time?: string
  }) {
    const id = uuid()
    const time =
      data.time ||
      new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    execute(
      `INSERT INTO diet_meals (id, meal_type, food_name, portion, calories, protein_g, fat_g, carbs_g, notes, meal_date, meal_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.type,
        data.name,
        data.portion || null,
        data.calories || null,
        data.protein ?? null,
        data.fat ?? null,
        data.carbs ?? null,
        data.notes || null,
        data.date,
        time,
      ],
    )
    return queryOne('SELECT * FROM diet_meals WHERE id = ?', [id])
  },

  async getMeals(date?: string) {
    return date
      ? query('SELECT * FROM diet_meals WHERE meal_date = ? ORDER BY meal_time DESC', [date])
      : query('SELECT * FROM diet_meals ORDER BY meal_date DESC, meal_time DESC LIMIT 200')
  },

  async deleteMeal(id: string) {
    execute('DELETE FROM diet_meals WHERE id = ?', [id])
    return { success: true }
  },

  async addWater(amount: number, date?: string) {
    const id = uuid()
    const recordDate = date || new Date().toISOString().split('T')[0]
    const now = new Date()
    const recordTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    execute('INSERT INTO diet_water (id, amount_ml, record_date, record_time) VALUES (?, ?, ?, ?)', [
      id,
      amount,
      recordDate,
      recordTime,
    ])
    return { id, amount, date: recordDate, time: recordTime }
  },

  async getWater(date?: string) {
    const recordDate = date || new Date().toISOString().split('T')[0]
    return query('SELECT * FROM diet_water WHERE record_date = ? ORDER BY record_time DESC', [
      recordDate,
    ])
  },

  async getDailySummary(date?: string) {
    const recordDate = date || new Date().toISOString().split('T')[0]
    const summary =
      queryOne<Record<string, number>>(
        `SELECT
          COUNT(*) as meal_count,
          COALESCE(SUM(calories), 0) as total_calories,
          COALESCE(SUM(protein_g), 0) as total_protein,
          COALESCE(SUM(fat_g), 0) as total_fat,
          COALESCE(SUM(carbs_g), 0) as total_carbs
         FROM diet_meals WHERE meal_date = ?`,
        [recordDate],
      ) || {}

    const water = queryOne<{ total_water: number }>(
      'SELECT COALESCE(SUM(amount_ml), 0) as total_water FROM diet_water WHERE record_date = ?',
      [recordDate],
    )

    return { ...summary, total_water: water?.total_water ?? 0, date: recordDate }
  },
}

/* ------------------------------------------------------------------ *
 * quotes
 * ------------------------------------------------------------------ */

/** 首次调用时把语录表填满（与主进程 registerQuoteIpc 的播种行为一致） */
let quotesSeeded = false
function ensureQuotesSeeded(): void {
  if (quotesSeeded) return
  quotesSeeded = true
  const row = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM daily_quotes')
  if (row && row.cnt > 0) return
  const count = seedDefaultQuotes(
    (sql, params) => getDatabase().run(sql, params),
    () => uuid(),
  )
  // 播种是批量写入，直接落盘而不是等防抖
  void persistNow()
  console.log(`[Quotes] 已写入 ${count} 条默认语录`)
}

const quotes = {
  async getRandom() {
    ensureQuotesSeeded()
    return queryOne('SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1')
  },

  async getDaily() {
    ensureQuotesSeeded()
    const today = new Date().toISOString().split('T')[0]

    let result = queryOne<Record<string, unknown>>(
      'SELECT * FROM daily_quotes WHERE used_date = ? LIMIT 1',
      [today],
    )
    if (result) return result

    result = queryOne<Record<string, unknown>>(
      'SELECT * FROM daily_quotes WHERE is_used = 0 ORDER BY RANDOM() LIMIT 1',
    )

    // 全部用过了，重置后随机再选一条
    if (!result) {
      execute('UPDATE daily_quotes SET is_used = 0, used_date = NULL')
      result = queryOne<Record<string, unknown>>(
        'SELECT * FROM daily_quotes ORDER BY RANDOM() LIMIT 1',
      )
    }

    if (result) {
      execute('UPDATE daily_quotes SET is_used = 1, used_date = ? WHERE id = ?', [
        today,
        result.id as string,
      ])
    }
    return result
  },

  async addQuote(data: { text: string; zh?: string; author: string; source?: string; type?: string }) {
    ensureQuotesSeeded()
    const id = uuid()
    execute(
      `INSERT INTO daily_quotes (id, quote_text, quote_zh, author, source, quote_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.text, data.zh || null, data.author, data.source || null, data.type || 'motivation'],
    )
    return { id, ...data }
  },

  async getQuotes(type?: string) {
    ensureQuotesSeeded()
    return type
      ? query('SELECT * FROM daily_quotes WHERE quote_type = ? ORDER BY created_at DESC', [type])
      : query('SELECT * FROM daily_quotes ORDER BY created_at DESC')
  },
}

/* ------------------------------------------------------------------ *
 * weather
 * 浏览器端天气由页面直接请求 Open-Meteo（CORS 友好、免 Key），
 * 这里只负责与主进程一致的 30 分钟缓存。
 * ------------------------------------------------------------------ */

const weather = {
  async getCached(location: string) {
    const row = queryOne<{
      location: string
      latitude: number
      longitude: number
      data: string
      expires_at: string
    }>(
      `SELECT * FROM weather_cache WHERE location = ? AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
      [location],
    )
    if (!row) return null
    return {
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      data: JSON.parse(row.data),
      expiresAt: row.expires_at,
    }
  },

  async setCache(location: string, data: unknown, lat?: number, lon?: number) {
    const id = uuid()
    execute(
      `INSERT INTO weather_cache (id, location, latitude, longitude, data, expires_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '+30 minutes'))`,
      [id, location, lat || null, lon || null, JSON.stringify(data)],
    )
    execute("DELETE FROM weather_cache WHERE expires_at < datetime('now')")
    return { success: true }
  },
}

/* ------------------------------------------------------------------ *
 * demo：示例数据状态与清空（仅 Web 版）
 * ------------------------------------------------------------------ */

const demo = {
  /** 当前是否处于带示例数据的状态 */
  async getStatus() {
    const { isDemoActive, isDemoBannerDismissed } = await import('../db/browser-db')
    return { active: isDemoActive(), bannerDismissed: isDemoBannerDismissed() }
  },

  /** 关闭首页提示横幅 */
  async dismissBanner() {
    const { dismissDemoBanner } = await import('../db/browser-db')
    dismissDemoBanner()
    return { success: true }
  },

  /** 清空全部业务数据，回到空工作台 */
  async clearAll() {
    const { clearAllDataAndPersist } = await import('../db/browser-db')
    await clearAllDataAndPersist()
    return { success: true }
  },
}

/** Web 端已实现的 API 子集 */
export const webApiSubset = {
  storage,
  todo,
  memo,
  calendar,
  conversation,
  fitness,
  diet,
  quotes,
  weather,
  demo,
}
