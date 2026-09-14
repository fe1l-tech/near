/**
 * 首次运行的示例数据
 *
 * 用途：网页版 demo 的第一眼。访客打开链接时如果看到的是空工作台，
 * 无法理解这个应用是干什么的；有内容才能立刻看懂「AI + 待办 + 笔记 + 日程」这条主线。
 *
 * 设计原则：
 * 1. 内容要真的能看懂，不能是 "item 1 / item 2" 这种占位符；
 * 2. 必须体现"AI 真正改动了本地数据"这个卖点 —— 所以对话里那条助手回复
 *    对应的是列表里真实存在的待办，而不是一句空话；
 * 3. 日期用相对今天的偏移，任何时候打开都不会显得过期；
 * 4. 完全可清除：设置项里可一键清空，避免污染真实使用。
 */

import type { SqlDatabase } from './browser-db'

const uuid = () => crypto.randomUUID()

/** ISO 日期（YYYY-MM-DD），偏移若干天 */
function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** datetime('now') 风格的本地时间戳（sql.js 里 datetime('now') 是 UTC，这里给本地时间更符合直觉） */
function localDateTime(days: number, hours = 9, minutes = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, minutes, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/** 判断库里是否已经有用户数据（任意一张业务表非空即视为「有人在用」） */
export function hasUserData(db: SqlDatabase): boolean {
  const tables = ['todos', 'memos', 'calendar_events', 'conversations', 'fitness_logs', 'diet_meals']
  for (const table of tables) {
    const result = db.exec(`SELECT COUNT(*) FROM ${table}`)
    if (result.length > 0 && Number(result[0].values[0][0]) > 0) return true
  }
  return false
}

/**
 * 写入示例数据。
 * @returns 写入的记录条数合计（用于 UI 提示）
 */
export function seedDemoData(db: SqlDatabase): number {
  let count = 0
  const inserted = () => {
    count += 1
  }

  /* ── 待办：展示完成率，同时留几条待处理 ── */
  const todos: Array<{
    title: string
    priority: string
    status: string
    due: number | null
    dueTime?: string
    tags?: string
    done?: boolean
  }> = [
    { title: '提交本周周报', priority: 'urgent', status: 'pending', due: 0, dueTime: '15:00', tags: '工作' },
    { title: '整理产品定位讨论的结论', priority: 'high', status: 'pending', due: 0, tags: '工作,产品' },
    { title: '把工作台改成可在浏览器试用的版本', priority: 'high', status: 'in_progress', due: 1, tags: '开发' },
    { title: '补充 README 与截图', priority: 'medium', status: 'pending', due: 2, tags: '开发,文档' },
    { title: '周三 20:00 力量训练', priority: 'medium', status: 'pending', due: 1, tags: '健身' },
    { title: '读一遍 SQLite WAL 机制', priority: 'low', status: 'pending', due: 4, tags: '学习' },
    { title: '清理本地数据库的过期缓存', priority: 'low', status: 'completed', due: -1, done: true },
    { title: '给项目加上 LICENSE', priority: 'medium', status: 'completed', due: -2, done: true },
    { title: '梳理 11 个模块的取舍', priority: 'high', status: 'completed', due: -3, done: true },
  ]

  for (const t of todos) {
    db.run(
      `INSERT INTO todos (id, title, description, status, priority, due_date, due_time,
        pomodoro_total, pomodoro_done, estimated_minutes, tags, is_favorite, sort_order, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        t.title,
        null,
        t.status,
        t.priority,
        t.due === null ? null : dateOffset(t.due),
        t.dueTime || null,
        0,
        0,
        null,
        t.tags || null,
        t.priority === 'urgent' ? 1 : 0,
        0,
        t.done ? localDateTime(t.due ?? 0, 20, 30) : null,
      ],
    )
    inserted()
  }

  /* ── 笔记：一条讲定位（呼应对话主线），一条日常记录 ── */
  const memos = [
    {
      title: 'near · 产品定位结论',
      excerpt: '本地优先、AI 能真正读写你的待办笔记日程',
      content: `# 定位结论

## 三个叠加的卖点
1. **数据自持**：纯本地 SQLite，无云账号、无强制同步，数据不出本机
2. **BYOK**：兼容任意 OpenAI 协议后端，开源即可跑，不依赖我方服务器
3. **Agent 能作用于工具**：AI 不只是陪聊，它真的能建待办、补笔记、加日程

## 关键取舍
- 通用「AI 工作台」没有护城河 —— 单轮对话能力拼不过通用 agent
- 真正稀缺的不是"更聪明"，而是**数据的连续性** + **隐私边界**
- 所以主打不是"最强的 AI"，而是"你的数据 + 一个可靠的本地执行者"

## 待验证
- 能在 30 秒内看懂并跑起来吗？（可 demo 化程度）
- 首屏有内容 vs 空白，第一印象差距有多大`,
      tags: '产品,定位',
      pinned: 1,
    },
    {
      title: '技术笔记 · sql.js 在浏览器里跑',
      excerpt: '同一份 WASM 复用，IndexedDB 落盘',
      content: `## 结论：可行，且成本很低

因为原本就用 sql.js，同一份 schema 和 WASM 可以直接在浏览器复用来。

### 两个坑
1. **模块双实例**：同一文件被 \`@core/x\` 和 \`../x\` 两种路径引用时，
   Vite 会解析成两个独立模块 —— 一处初始化，另一处读不到。
   统一解析路径即可。
2. **wasm 加载**：用 \`locateFile\` 时 emscripten 内部走原生 fetch，
   URL 解析出偏差只会抛 "expected magic word"（其实拿到了 index.html），
   不报请求地址。改成自己 fetch 再传 \`wasmBinary\`，报错立刻可定位。

### 落盘策略
- \`db.export()\` 是整库序列化，不能每次按键都写
- 用 400ms 防抖 + \`visibilitychange\`/\`pagehide\` 强制刷盘`,
      tags: '开发,踩坑',
      pinned: 0,
    },
  ]

  for (const m of memos) {
    const id = uuid()
    db.run(
      `INSERT INTO memos (id, title, content, excerpt, tags, is_favorite, is_pinned, is_archived, word_count, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?)`,
      [
        id,
        m.title,
        m.content,
        m.excerpt,
        m.tags,
        m.pinned ? 1 : 0,
        m.pinned,
        m.content.length,
        localDateTime(-2, 21, 0),
        localDateTime(-1, 22, 15),
      ],
    )
    inserted()
  }

  /* ── 日程：覆盖今天（首页会显示）与未来几天（日历能看到） ── */
  const events: Array<{ title: string; type: string; day: number; start?: string; end?: string; color: string; allDay?: boolean }> = [
    { title: '提交周报', type: 'task', day: 0, start: '15:00', color: '#f59e0b' },
    { title: '产品定位评审', type: 'event', day: 0, start: '10:00', end: '11:00', color: '#e85d7a' },
    { title: '力量训练', type: 'event', day: 1, start: '20:00', end: '21:00', color: '#e85d7a' },
    { title: '整理开源元数据', type: 'task', day: 2, color: '#f59e0b' },
    { title: '每周复盘', type: 'reminder', day: 5, start: '19:00', color: '#60a5fa' },
  ]

  for (const e of events) {
    db.run(
      `INSERT INTO calendar_events (id, title, description, event_type, start_date, end_date,
        start_time, end_time, is_all_day, color, location, is_completed)
       VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, NULL, 0)`,
      [
        uuid(),
        e.title,
        e.type,
        dateOffset(e.day),
        e.start || null,
        e.end || null,
        e.allDay ? 1 : 0,
        e.color,
      ],
    )
    inserted()
  }

  /* ── 健身：几条训练记录 + 身体数据，让统计页有东西可画 ── */
  const logs: Array<{ exercise: string; sets: number; reps: number; weight: number; day: number; mood?: string }> = [
    { exercise: '卧推', sets: 4, reps: 8, weight: 60, day: 0, mood: 'good' },
    { exercise: '深蹲', sets: 5, reps: 5, weight: 80, day: 0 },
    { exercise: '硬拉', sets: 3, reps: 5, weight: 100, day: -2 },
    { exercise: '引体向上', sets: 4, reps: 8, weight: 0, day: -4 },
  ]

  for (const l of logs) {
    db.run(
      `INSERT INTO fitness_logs (id, plan_id, exercise_name, sets_completed, reps_per_set, weight_per_set, notes, mood, log_date, created_at)
       VALUES (?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [uuid(), l.exercise, l.sets, String(l.reps), String(l.weight), l.mood || null, dateOffset(l.day), localDateTime(l.day, 20, 0)],
    )
    inserted()
  }

  for (const s of [
    { weight: 70.5, day: 0 },
    { weight: 71.2, day: -7 },
    { weight: 72.0, day: -14 },
  ]) {
    const bmi = +(s.weight / (1.75 * 1.75)).toFixed(1)
    db.run(
      `INSERT INTO body_stats (id, weight_kg, height_cm, bmi, body_fat_pct, notes, record_date, created_at)
       VALUES (?, ?, 175, ?, NULL, NULL, ?, ?)`,
      [uuid(), s.weight, bmi, dateOffset(s.day), localDateTime(s.day, 8, 0)],
    )
    inserted()
  }

  /* ── 饮食：今天的餐食与饮水，避免汇总面板全 0 ── */
  const meals: Array<{ type: string; name: string; cal: number; p: number; f: number; c: number; day: number; time: string }> = [
    { type: 'breakfast', name: '豆浆 + 全麦面包', cal: 380, p: 15, f: 9, c: 58, day: 0, time: '08:10' },
    { type: 'lunch', name: '牛肉面', cal: 620, p: 28, f: 18, c: 78, day: 0, time: '12:30' },
    { type: 'snack', name: '香蕉', cal: 105, p: 1, f: 0, c: 27, day: 0, time: '16:00' },
    { type: 'dinner', name: '鸡胸肉沙拉', cal: 420, p: 42, f: 14, c: 30, day: -1, time: '19:00' },
  ]

  for (const m of meals) {
    db.run(
      `INSERT INTO diet_meals (id, meal_type, food_name, portion, calories, protein_g, fat_g, carbs_g, notes, meal_date, meal_time, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      [uuid(), m.type, m.name, m.cal, m.p, m.f, m.c, dateOffset(m.day), m.time, localDateTime(m.day, 12, 0)],
    )
    inserted()
  }

  for (const w of [
    { amount: 300, day: 0, time: '08:20' },
    { amount: 500, day: 0, time: '11:00' },
    { amount: 400, day: 0, time: '15:30' },
  ]) {
    db.run(
      'INSERT INTO diet_water (id, amount_ml, record_date, record_time, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuid(), w.amount, dateOffset(w.day), w.time, localDateTime(w.day, 12, 0)],
    )
    inserted()
  }

  /* ── 对话：这一段是产品卖点的现场演示 —— AI 真的改动了本地数据 ── */
  const convId = uuid()
  db.run(
    `INSERT INTO conversations (id, title, model, system_prompt, pinned, archived, token_count, message_count, created_at, updated_at)
     VALUES (?, ?, 'deepseek-chat', NULL, 0, 0, 0, 4, ?, ?)`,
    [convId, '帮我安排今天的工作', localDateTime(0, 9, 30), localDateTime(0, 9, 36)],
  )
  inserted()

  const messages: Array<{ role: string; content: string; minutes: number }> = [
    {
      role: 'user',
      content: '我下午三点前要交周报，明晚八点去健身。帮我把这两件事排进今天的计划里。',
      minutes: 30,
    },
    {
      role: 'assistant',
      content: `已经帮你加好了：

1. **提交本周周报** — 待办，今天 15:00 截止，优先级「紧急」
2. **力量训练** — 日程，明天 20:00–21:00

另外我注意到你还有一条「整理产品定位讨论的结论」是上周留下来的，要不要顺手排到今天下午？`,
      minutes: 31,
    },
    {
      role: 'user',
      content: '好，排上。顺便记一下：定位结论是「本地优先 + AI 能真正读写工具」。',
      minutes: 35,
    },
    {
      role: 'assistant',
      content: `已经处理完：

- 待办 **整理产品定位讨论的结论** 已创建，优先级「高」，今天截止
- 笔记 **near · 产品定位结论** 已保存，内容按你说的写成三条要点

所有改动都写进了你本机的数据库，没有经过任何服务器。`,
      minutes: 36,
    },
  ]

  for (const m of messages) {
    db.run(
      `INSERT INTO messages (id, conversation_id, role, content, thinking, tool_calls, tool_results, token_count, is_error, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?)`,
      [uuid(), convId, m.role, m.content, localDateTime(0, 9, m.minutes)],
    )
    inserted()
  }

  return count
}

/**
 * 清空示例数据（不影响用户自己创建的内容？）
 *
 * 说明：种子数据无法可靠区分"哪些是示例"，因此这里做成**清空全部业务数据**，
 * 语义是「我想从一个干净的工作台开始」。UI 上必须把这一点写清楚。
 */
export function clearAllData(db: SqlDatabase): void {
  const tables = [
    'messages',
    'conversations',
    'todos',
    'calendar_events',
    'memos',
    'memo_versions',
    'fitness_logs',
    'body_stats',
    'fitness_plans',
    'diet_meals',
    'diet_water',
    'weather_cache',
  ]
  for (const table of tables) {
    db.run(`DELETE FROM ${table}`)
  }
}
