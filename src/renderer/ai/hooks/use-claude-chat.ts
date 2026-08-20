/**
 * Claude Code 聊天钩子
 * 通过 IPC 与主进程 Claude 管理器通信，替代 useAiChat
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { ipc } from '@core/ipc/ipc-client'
import type { ChatMessage } from '../types/message.types'

interface UseClaudeChatOptions {
  onError?: (error: string) => void
}

interface StreamEvent {
  streamId: string
  type: string
  text?: string
  thinkingDelta?: string
  toolId?: string
  toolName?: string
  toolInputJson?: string
  toolResultContent?: string
  isToolError?: boolean
  claudeSessionId?: string
  usage?: { input_tokens: number; output_tokens: number }
  error?: string
  errorCode?: string
}

export function useClaudeChat(options: UseClaudeChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [thinking, setThinking] = useState('')
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null)
  const streamIdRef = useRef<string | null>(null)
  const fullTextRef = useRef('')
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const claudeSessionIdRef = useRef<string | null>(null)

  // 启动时检测 Claude 是否可用
  useEffect(() => {
    ipc.claude.checkAvailability().then((result) => {
      if (result.success && result.data) {
        setClaudeAvailable(result.data.available)
      } else {
        setClaudeAvailable(false)
      }
    })
  }, [])

  // 注册流事件监听
  useEffect(() => {
    unsubscribeRef.current = ipc.claude.onStreamEvent(handleStreamEvent)
    return () => {
      unsubscribeRef.current?.()
    }
  }, [])

  const handleStreamEvent = useCallback((raw: unknown) => {
    const event = raw as StreamEvent
    if (event.streamId !== streamIdRef.current) return

    switch (event.type) {
      case 'text_delta': {
        fullTextRef.current += event.text || ''
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: fullTextRef.current }
          }
          return updated
        })
        break
      }

      case 'thinking': {
        setThinking((prev) => prev + (event.thinkingDelta || ''))
        break
      }

      case 'session': {
        if (event.claudeSessionId) {
          claudeSessionIdRef.current = event.claudeSessionId
        }
        break
      }

      case 'done': {
        // Claude CLI 在 result 事件里把 session_id 带回来，必须存到 ref
        // 否则下次 send 时没有 --resume 参数，会开新会话导致上下文丢失
        if (event.claudeSessionId) {
          claudeSessionIdRef.current = event.claudeSessionId
        }
        setIsStreaming(false)
        streamIdRef.current = null
        // 将思考内容附加到最后一条消息
        setThinking((prev) => {
          if (prev) {
            setMessages((msgs) => {
              const updated = [...msgs]
              const last = updated[updated.length - 1]
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, thinking: prev }
              }
              return updated
            })
          }
          return ''
        })
        break
      }

      case 'error': {
        setIsStreaming(false)
        streamIdRef.current = null
        options.onError?.(event.error || 'Claude 请求失败')
        break
      }
    }
  }, [options.onError])

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming || !claudeAvailable) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setThinking('')
    fullTextRef.current = ''

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const result = await ipc.claude.send(
        claudeSessionIdRef.current,
        content,
      )
      if (result.success && (result as any).data) {
        streamIdRef.current = (result as any).data.streamId
      } else {
        setIsStreaming(false)
        options.onError?.((result as any).error || '启动 Claude 失败')
      }
    } catch (err) {
      setIsStreaming(false)
      options.onError?.((err as Error).message || '启动 Claude 失败')
    }
  }, [isStreaming, claudeAvailable, options.onError])

  const stopGeneration = useCallback(async () => {
    if (streamIdRef.current) {
      await ipc.claude.stop(streamIdRef.current)
      setIsStreaming(false)
      streamIdRef.current = null
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setThinking('')
    fullTextRef.current = ''
  }, [])

  return {
    messages,
    thinking,
    isStreaming,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
    claudeAvailable,
    claudeSessionId: claudeSessionIdRef.current,
  }
}
