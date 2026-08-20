import { getDatabase, saveDatabase } from '../database'
import { handle } from './index'

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

export function registerConversationIpc(): void {
  // ── 对话管理 ──

  // 创建新对话
  handle('conversation:create', (data: ConversationData) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO conversations (id, title, model, system_prompt, claude_session_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.title, data.model || 'deepseek-chat', data.systemPrompt || null, data.claudeSessionId || null],
    )
    saveDatabase()
    return getConvById(db, id)
  })

  // 获取所有对话列表
  handle('conversation:list', () => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM conversations WHERE archived = 0 ORDER BY updated_at DESC`,
    )
    const rows: unknown[] = []
    while (stmt.step()) rows.push(normalizeConversation(stmt.getAsObject()))
    stmt.free()
    return rows
  })

  // 更新对话
  handle('conversation:update', (id: string, data: Partial<ConversationData & { pinned?: boolean; archived?: boolean }>) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []

    if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title) }
    if (data.model !== undefined) { updates.push('model = ?'); params.push(data.model) }
    if (data.systemPrompt !== undefined) { updates.push('system_prompt = ?'); params.push(data.systemPrompt) }
    if (data.claudeSessionId !== undefined) { updates.push('claude_session_id = ?'); params.push(data.claudeSessionId) }
    if ((data as any).pinned !== undefined) { updates.push('pinned = ?'); params.push((data as any).pinned ? 1 : 0) }
    if ((data as any).archived !== undefined) { updates.push('archived = ?'); params.push((data as any).archived ? 1 : 0) }

    if (updates.length === 0) return { success: true }
    updates.push("updated_at = datetime('now')")
    params.push(id)
    db.run(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })

  // 删除对话
  handle('conversation:delete', (id: string) => {
    const db = getDatabase()
    db.run('DELETE FROM conversations WHERE id = ?', [id])
    saveDatabase()
    return { success: true }
  })

  // ── 消息管理 ──

  // 添加消息
  handle('conversation:add-message', (data: MessageData) => {
    const db = getDatabase()
    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO messages (id, conversation_id, role, content, thinking, tool_calls, tool_results, token_count, is_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.conversationId, data.role, data.content,
        data.thinking || null, data.toolCalls || null, data.toolResults || null,
        data.tokenCount || null, data.isError ? 1 : 0,
      ],
    )
    // 更新对话的消息计数
    db.run("UPDATE conversations SET message_count = message_count + 1, updated_at = datetime('now') WHERE id = ?", [data.conversationId])
    saveDatabase()
    return getMessageById(db, id)
  })

  // 获取对话的所有消息
  handle('conversation:get-messages', (conversationId: string) => {
    const db = getDatabase()
    const stmt = db.prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    )
    stmt.bind([conversationId])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(normalizeMessage(stmt.getAsObject()))
    stmt.free()
    return rows
  })

  // 更新消息（用于流式更新内容）
  handle('conversation:update-message', (id: string, data: { content?: string; thinking?: string; tokenCount?: number; isError?: boolean }) => {
    const db = getDatabase()
    const updates: string[] = []
    const params: unknown[] = []

    if (data.content !== undefined) { updates.push('content = ?'); params.push(data.content) }
    if (data.thinking !== undefined) { updates.push('thinking = ?'); params.push(data.thinking) }
    if (data.tokenCount !== undefined) { updates.push('token_count = ?'); params.push(data.tokenCount) }
    if (data.isError !== undefined) { updates.push('is_error = ?'); params.push(data.isError ? 1 : 0) }

    if (updates.length === 0) return { success: true }
    params.push(id)
    db.run(`UPDATE messages SET ${updates.join(', ')} WHERE id = ?`, params)
    saveDatabase()
    return { success: true }
  })
}

function getConvById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = normalizeConversation(stmt.getAsObject())
  stmt.free()
  return result
}

function getMessageById(db: ReturnType<typeof getDatabase>, id: string): unknown {
  const stmt = db.prepare('SELECT * FROM messages WHERE id = ?')
  stmt.bind([id])
  let result: unknown = null
  if (stmt.step()) result = normalizeMessage(stmt.getAsObject())
  stmt.free()
  return result
}

function normalizeConversation(row: Record<string, unknown>): unknown {
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

function normalizeMessage(row: Record<string, unknown>): unknown {
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
