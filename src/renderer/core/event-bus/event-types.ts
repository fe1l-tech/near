/**
 * 事件类型定义 — 所有模块间通信事件的类型
 */
export const EventTypes = {
  // ── AI 聊天 ──
  CONVERSATION_CREATED: 'chat:conversation-created',
  CONVERSATION_DELETED: 'chat:conversation-deleted',
  MESSAGE_SENT: 'chat:message-sent',
  MESSAGE_RECEIVED: 'chat:message-received',

  // ── 待办 ──
  TODO_CREATED: 'todo:created',
  TODO_UPDATED: 'todo:updated',
  TODO_DELETED: 'todo:deleted',
  TODO_COMPLETED: 'todo:completed',

  // ── 日历 ──
  EVENT_CREATED: 'calendar:event-created',
  EVENT_UPDATED: 'calendar:event-updated',
  EVENT_DELETED: 'calendar:event-deleted',

  // ── 备忘录 ──
  MEMO_CREATED: 'memo:created',
  MEMO_UPDATED: 'memo:updated',
  MEMO_DELETED: 'memo:deleted',

  // ── 健身 ──
  FITNESS_LOG_ADDED: 'fitness:log-added',
  BODY_STAT_UPDATED: 'fitness:body-stat-updated',

  // ── 饮食 ──
  DIET_MEAL_ADDED: 'diet:meal-added',
  DIET_WATER_ADDED: 'diet:water-added',

  // ── 主题 ──
  THEME_CHANGED: 'theme:changed',

  // ── 系统 ──
  APP_READY: 'app:ready',
  DATA_SYNCED: 'app:data-synced',
  ERROR_OCCURRED: 'app:error',
} as const
