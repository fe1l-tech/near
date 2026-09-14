/**
 * 共享数据库 schema 与迁移定义
 *
 * 由主进程（Electron / Node + sql.js）与 Web 端（浏览器 + sql.js WASM）共用，
 * 保证两端 schema 不漂移。
 *
 * 注意：这里只描述「结构」，不含任何文件系统或 Electron 依赖。
 */

export interface Migration {
  name: string
  /** 迁移语句，按顺序执行；任意语句失败都会被记录但不中断（用于容错式 ALTER） */
  statements: string[]
  /** true 表示语句失败可忽略（例如 ALTER TABLE ADD COLUMN 列已存在） */
  tolerateFailure?: boolean
}

export const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

export const INITIAL_SCHEMA = `
-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'deepseek-chat',
  system_prompt TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  token_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON conversations(pinned);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  thinking TEXT,
  tool_calls TEXT,
  tool_results TEXT,
  token_count INTEGER,
  is_error INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Todos
CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  due_time TEXT,
  pomodoro_total INTEGER DEFAULT 0,
  pomodoro_done INTEGER DEFAULT 0,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event',
  start_date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_rule TEXT,
  color TEXT,
  location TEXT,
  reminder_minutes INTEGER,
  is_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);

-- Memos
CREATE TABLE IF NOT EXISTS memos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT,
  tags TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_memos_updated ON memos(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memos_favorite ON memos(is_favorite);
CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos(is_pinned);

-- Memo Versions
CREATE TABLE IF NOT EXISTS memo_versions (
  id TEXT PRIMARY KEY,
  memo_id TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memo_versions ON memo_versions(memo_id, version DESC);

-- Fitness Plans
CREATE TABLE IF NOT EXISTS fitness_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exercises TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fitness Logs
CREATE TABLE IF NOT EXISTS fitness_logs (
  id TEXT PRIMARY KEY,
  plan_id TEXT,
  exercise_name TEXT NOT NULL,
  sets_completed INTEGER NOT NULL,
  reps_per_set TEXT NOT NULL,
  weight_per_set TEXT NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  mood TEXT,
  log_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fitness_logs_date ON fitness_logs(log_date DESC);

-- Body Stats
CREATE TABLE IF NOT EXISTS body_stats (
  id TEXT PRIMARY KEY,
  weight_kg REAL NOT NULL,
  height_cm REAL,
  bmi REAL,
  body_fat_pct REAL,
  muscle_mass_kg REAL,
  waist_cm REAL,
  notes TEXT,
  record_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_body_stats_date ON body_stats(record_date DESC);

-- Diet Meals
CREATE TABLE IF NOT EXISTS diet_meals (
  id TEXT PRIMARY KEY,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  portion TEXT,
  calories INTEGER,
  protein_g REAL,
  fat_g REAL,
  carbs_g REAL,
  notes TEXT,
  meal_date TEXT NOT NULL,
  meal_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diet_meals_date ON diet_meals(meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_diet_meals_type ON diet_meals(meal_type);

-- Diet Water
CREATE TABLE IF NOT EXISTS diet_water (
  id TEXT PRIMARY KEY,
  amount_ml INTEGER NOT NULL,
  record_date TEXT NOT NULL,
  record_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_diet_water_date ON diet_water(record_date DESC);

-- Daily Quotes
CREATE TABLE IF NOT EXISTS daily_quotes (
  id TEXT PRIMARY KEY,
  quote_text TEXT NOT NULL,
  quote_zh TEXT,
  author TEXT NOT NULL,
  source TEXT,
  quote_type TEXT NOT NULL DEFAULT 'motivation',
  is_used INTEGER NOT NULL DEFAULT 0,
  used_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quotes_used ON daily_quotes(used_date DESC);

-- Weather Cache
CREATE TABLE IF NOT EXISTS weather_cache (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  data TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weather_location ON weather_cache(location);
`

export const MIGRATIONS: Migration[] = [
  {
    name: '0000_initial_schema',
    statements: [INITIAL_SCHEMA],
  },
  {
    name: '0001_add_claude_session',
    tolerateFailure: true,
    statements: [
      'ALTER TABLE conversations ADD COLUMN claude_session_id TEXT',
      'ALTER TABLE conversations ADD COLUMN claude_model TEXT',
    ],
  },
]
