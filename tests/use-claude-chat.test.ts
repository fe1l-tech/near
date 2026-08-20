import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// vi.mock 会被 hoist 到文件顶部，工厂内不能引用外部变量，
// 所以用 vi.hoisted 把它们一起提升到 hoist 阶段
const { sendMock, setStreamHandler, getStreamHandler } = vi.hoisted(() => {
  const sendMock = vi.fn()
  let streamHandler: ((event: unknown) => void) | null = null
  return {
    sendMock,
    setStreamHandler: (h: (event: unknown) => void) => {
      streamHandler = h
    },
    getStreamHandler: () => streamHandler,
  }
})

vi.mock('@core/ipc/ipc-client', () => ({
  ipc: {
    claude: {
      checkAvailability: vi.fn(() =>
        Promise.resolve({ success: true, data: { available: true } }),
      ),
      send: sendMock,
      onStreamEvent: (cb: (event: unknown) => void) => {
        setStreamHandler(cb)
        return () => {}
      },
      stop: vi.fn(),
    },
  },
}))

import { useClaudeChat } from '@ai/hooks/use-claude-chat'

describe('useClaudeChat — 会话续接回归', () => {
  beforeEach(() => {
    sendMock.mockReset()
    // 每次 send 返回带递增 streamId 的结果
    let n = 0
    sendMock.mockImplementation(() => {
      n += 1
      return Promise.resolve({ success: true, data: { streamId: `stream-${n}` } })
    })
  })

  it('done 事件带回 sessionId 后，下一轮 send 携带该 sessionId（--resume）', async () => {
    const { result } = renderHook(() => useClaudeChat())

    // flush effects：注册 onStreamEvent（捕获 streamHandler）+ checkAvailability 设 claudeAvailable=true
    await act(async () => {})
    expect(getStreamHandler()).not.toBeNull()

    // 第一轮发送：首轮无 session
    await act(async () => {
      await result.current.sendMessage('你好')
    })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toBeNull()
    expect(sendMock.mock.calls[0][1]).toBe('你好')

    // 模拟主进程通过 done 事件回传 sessionId（streamId 需匹配第一轮）
    act(() => {
      getStreamHandler()!({
        type: 'done',
        claudeSessionId: 'sess-abc',
        streamId: 'stream-1',
      })
    })

    // 第二轮发送：应续接同一 session
    await act(async () => {
      await result.current.sendMessage('再见')
    })
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(sendMock.mock.calls[1][0]).toBe('sess-abc')
    expect(sendMock.mock.calls[1][1]).toBe('再见')
  })
})
