import { v4 as uuid } from './uuid'
import type { Conversation, ChatMessage } from '../types/message.types'

/**
 * 对话管理器 — 内存中的对话管理
 * 后续接入 SQLite 进行持久化
 */
class ConversationManager {
  private conversations = new Map<string, Conversation>()
  private messages = new Map<string, ChatMessage[]>()

  /** 创建新对话 */
  create(title?: string, model = 'deepseek-chat'): Conversation {
    const id = uuid()
    const now = new Date().toISOString()
    const conv: Conversation = {
      id,
      title: title || '新对话',
      model,
      pinned: false,
      archived: false,
      tokenCount: 0,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    this.conversations.set(id, conv)
    this.messages.set(id, [])
    return conv
  }

  /** 获取对话 */
  get(id: string): Conversation | undefined {
    return this.conversations.get(id)
  }

  /** 获取所有对话（按更新时间倒序） */
  getAll(): Conversation[] {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  /** 更新对话 */
  update(id: string, updates: Partial<Conversation>): void {
    const conv = this.conversations.get(id)
    if (conv) {
      Object.assign(conv, { ...updates, updatedAt: new Date().toISOString() })
    }
  }

  /** 删除对话 */
  delete(id: string): void {
    this.conversations.delete(id)
    this.messages.delete(id)
  }

  /** 获取对话消息 */
  getMessages(conversationId: string): ChatMessage[] {
    return this.messages.get(conversationId) || []
  }

  /** 添加消息 */
  addMessage(conversationId: string, message: ChatMessage): void {
    const msgs = this.messages.get(conversationId) || []
    msgs.push(message)
    this.messages.set(conversationId, msgs)
    this.update(conversationId, { messageCount: msgs.length, updatedAt: new Date().toISOString() })
  }

  /** 更新最后一条消息（流式追加内容） */
  updateLastMessage(conversationId: string, content: string, thinking?: string): void {
    const msgs = this.messages.get(conversationId)
    if (msgs && msgs.length > 0) {
      const last = msgs[msgs.length - 1]
      last.content = content
      if (thinking !== undefined) last.thinking = thinking
    }
  }
}

export const conversationManager = new ConversationManager()

// 简易 UUID 生成
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
