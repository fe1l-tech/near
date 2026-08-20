import type { ChatMessage, StreamChunk } from '../types/message.types'

/**
 * 模型配置
 */
export interface ModelConfig {
  apiKey: string
  baseURL: string
  model: string
  maxTokens?: number
  temperature?: number
}

/**
 * 模型适配器接口 — 统一不同 AI 提供商的调用
 */
export interface ModelAdapter {
  readonly name: string
  readonly defaultBaseURL: string

  /**
   * 发送消息（非流式）
   */
  chat(messages: ChatMessage[], config: ModelConfig): Promise<string>

  /**
   * 发送消息（流式）
   */
  chatStream(
    messages: ChatMessage[],
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<void>
}
