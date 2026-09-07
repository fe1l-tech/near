import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { ModelAdapter, ModelConfig } from './adapter.interface'
import type { ChatMessage, StreamChunk } from '../types/message.types'

/**
 * DeepSeek 在 OpenAI 协议上的扩展字段（OpenAI SDK 的 Delta 类型未包含，
 * 例如 R1 的 reasoning_content），在此单独声明避免运行时字段访问报类型错。
 */
interface DeepSeekChatDelta {
  reasoning_content?: string | null
  content?: string | null
  tool_calls?: Array<{
    id?: string
    function?: { name?: string; arguments?: string }
  }>
}

/**
 * DeepSeek API 适配器
 * 使用 OpenAI 兼容协议
 */
export class DeepSeekAdapter implements ModelAdapter {
  readonly name = 'DeepSeek'
  readonly defaultBaseURL = 'https://api.deepseek.com'

  private createClient(config: ModelConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || this.defaultBaseURL,
      dangerouslyAllowBrowser: true, // Electron renderer 中需要
    })
  }

  async chat(messages: ChatMessage[], config: ModelConfig): Promise<string> {
    const client = this.createClient(config)
    const response = await client.chat.completions.create({
      model: config.model || 'deepseek-chat',
      messages: this.formatMessages(messages),
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
    })
    return response.choices[0]?.message?.content || ''
  }

  async chatStream(
    messages: ChatMessage[],
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const client = this.createClient(config)

    const stream = await client.chat.completions.create(
      {
        model: config.model || 'deepseek-chat',
        messages: this.formatMessages(messages),
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal },
    )

    for await (const chunk of stream) {
      // 用本地扩展类型读取 delta，reasoning_content 等字段才可通过类型检查
      const delta = chunk.choices[0]?.delta as DeepSeekChatDelta | undefined

      // 处理思维链（DeepSeek R1 特有）
      if (delta?.reasoning_content) {
        onChunk({ type: 'thinking', content: delta.reasoning_content })
        continue
      }

      // 处理普通内容
      if (delta?.content) {
        onChunk({ type: 'content', content: delta.content })
        continue
      }

      // 处理工具调用（暂不实现，预留）
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.id && tc.function) {
            onChunk({
              type: 'tool_call',
              toolCall: {
                id: tc.id,
                name: tc.function.name || '',
                arguments: tc.function.arguments ? JSON.parse(tc.function.arguments) : {},
              },
            })
          }
        }
      }
    }

    onChunk({ type: 'done' })
  }

  private formatMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
    // 当前会话只发送 user/assistant 两种角色；用字面量收窄保证
    // 与 OpenAI SDK 的 ChatCompletionMessageParam 联合类型兼容
    return messages.map((msg) =>
      msg.role === 'user'
        ? { role: 'user', content: msg.content }
        : { role: 'assistant', content: msg.content },
    )
  }
}
