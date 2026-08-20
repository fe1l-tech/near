import { useState, useCallback, useRef } from 'react'
import { DeepSeekAdapter } from '../adapters/deepseek.adapter'
import { useUserStore } from '@core/stores'
import type { ChatMessage, StreamChunk } from '../types/message.types'

interface UseAiChatOptions {
  conversationId?: string
  onError?: (error: string) => void
}

/**
 * DeepSeek 聊天钩子
 *
 * 关键点：用 messagesRef 同步跟踪最新历史，避免 sendMessage 的
 * 闭包 messages 因 React setState 异步 batch 而 stale，导致
 * 发出去的 messages 缺少之前的对话内容（表现为 AI "上下文重置"）。
 */
export function useAiChat(options: UseAiChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [messagesState, setMessagesState] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState('')

  // 用 ref 同步跟踪最新 messages，setMessages 后立即同步写一份
  const messagesRef = useRef<ChatMessage[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const adapter = useRef(new DeepSeekAdapter()).current
  const apiKey = useUserStore((s) => s.deepseekApiKey)
  const model = useUserStore((s) => s.defaultModel)

  /**
   * 唯一的 setMessages 入口：useState 的 setter 自动同步刷新 ref，
   * 让 sendMessage 内能拿到"上一轮 commit 后的完整历史"。
   */
  const setMessages = useCallback(
    (updater: React.SetStateAction<ChatMessage[]>) => {
      setMessagesState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: ChatMessage[]) => ChatMessage[])(prev)
            : updater
        messagesRef.current = next
        return next
      })
    },
    [],
  )
  // 组件需要的 messages 是 state 值
  const messages = messagesState

  const sendMessage = useCallback(
    async (content: string) => {
      if (!apiKey) {
        options.onError?.('请先在设置中配置 DeepSeek API Key')
        return
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }
      const assistantId = assistantMsg.id

      // 关键：从 ref 同步取最新历史，避免 closure stale
      const allMessages = [...messagesRef.current, userMsg]

      // 推进本地状态
      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)
      setThinking('')

      let fullContent = ''
      let fullThinking = ''

      try {
        abortRef.current = new AbortController()

        await adapter.chatStream(
          allMessages,
          {
            apiKey,
            baseURL: 'https://api.deepseek.com',
            model,
          },
          (chunk: StreamChunk) => {
            switch (chunk.type) {
              case 'content':
                fullContent += chunk.content || ''
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m,
                  ),
                )
                break
              case 'thinking':
                fullThinking += chunk.content || ''
                setThinking(fullThinking)
                break
              case 'done':
                setIsStreaming(false)
                break
              case 'error':
                setIsStreaming(false)
                options.onError?.(chunk.error || '未知错误')
                break
            }
          },
          abortRef.current.signal,
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const msg = err instanceof Error ? err.message : '请求失败'
          options.onError?.(msg)
        }
        setIsStreaming(false)
      }
    },
    [apiKey, model, adapter, options.onError, setMessages],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setThinking('')
    messagesRef.current = []
  }, [setMessages])

  return {
    messages,
    thinking,
    isStreaming,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
  }
}
