/**
 * AI 聊天消息类型定义
 */

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  /** R1 思维链内容 */
  thinking?: string
  /** 工具调用记录 */
  toolCalls?: ToolCall[]
  /** 工具执行结果 */
  toolResults?: ToolResult[]
  /** Token 数量 */
  tokenCount?: number
  /** 是否错误 */
  isError?: boolean
  createdAt: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  name: string
  result: string
}

export interface Conversation {
  id: string
  title: string
  model: string
  systemPrompt?: string
  pinned: boolean
  archived: boolean
  tokenCount: number
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface StreamChunk {
  type: 'content' | 'thinking' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  error?: string
}
