import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// 提供测试用的 store 字段（deepseekApiKey / defaultModel）
vi.mock('@core/stores', () => ({
  useUserStore: () => ({
    deepseekApiKey: 'test-key',
    defaultModel: 'deepseek-chat',
  }),
}))

// 捕获每次 chatStream 调用，并同步模拟流式输出
interface CallRecord {
  messages: Array<{ role: string; content: string }>
  onChunk: (chunk: { type: string; content?: string }) => void
}
let chatStreamCalls: CallRecord[] = []

vi.mock('@ai/adapters/deepseek.adapter', () => ({
  DeepSeekAdapter: class {
    async chatStream(
      messages: Array<{ role: string; content: string }>,
      _config: unknown,
      onChunk: (chunk: { type: string; content?: string }) => void,
      _signal: unknown,
    ) {
      chatStreamCalls.push({ messages, onChunk })
      // 同步模拟流式：先 content 再 done
      onChunk({ type: 'content', content: 'AI回复一' })
      onChunk({ type: 'done' })
    }
  },
}))

import { useAiChat } from '@ai/hooks/use-ai-chat'

describe('useAiChat — 上下文保留回归', () => {
  beforeEach(() => {
    chatStreamCalls = []
    vi.clearAllMocks()
  })

  it('连发两条消息，第二轮发送的历史包含第一轮 AI 回复', async () => {
    const { result } = renderHook(() => useAiChat())

    // 第一轮：发给模型的消息应只有用户自己的问题
    await act(async () => {
      await result.current.sendMessage('用户问题一')
    })
    expect(chatStreamCalls).toHaveLength(1)
    expect(chatStreamCalls[0].messages.map((m) => m.content)).toEqual([
      '用户问题一',
    ])

    // 本地状态应已包含用户消息 + AI 回复
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].content).toBe('AI回复一')
    })

    // 第二轮
    await act(async () => {
      await result.current.sendMessage('用户问题二')
    })

    // 关键断言：发给模型的 history 必须包含第一轮的 AI 回复，
    // 否则 DeepSeek 拿不到上文 → 表现为"上下文被重置"
    expect(chatStreamCalls).toHaveLength(2)
    const secondContents = chatStreamCalls[1].messages.map((m) => m.content)
    expect(secondContents).toContain('用户问题一')
    expect(secondContents).toContain('AI回复一')
    expect(secondContents).toContain('用户问题二')
  })

  it('clearMessages 后历史被清空，不会携带旧对话', async () => {
    const { result } = renderHook(() => useAiChat())

    await act(async () => {
      await result.current.sendMessage('q1')
    })
    await waitFor(() => expect(result.current.messages).toHaveLength(2))

    act(() => {
      result.current.clearMessages()
    })
    expect(result.current.messages).toHaveLength(0)

    await act(async () => {
      await result.current.sendMessage('q2')
    })

    // 清空后第二轮历史不应残留 q1 / AI回复一
    const secondContents = chatStreamCalls[1].messages.map((m) => m.content)
    expect(secondContents).toEqual(['q2'])
  })
})
