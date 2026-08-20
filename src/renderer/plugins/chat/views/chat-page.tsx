import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAiChat } from '@ai/hooks/use-ai-chat'
import { useClaudeChat } from '@ai/hooks/use-claude-chat'
import { useUserStore } from '@core/stores'
import { ipc } from '@core/ipc/ipc-client'
import { Button } from '@components/ui/button'
import { Send, Square, Key, Trash2, Bot, User, Brain, Copy, Check, Terminal, Loader2 } from 'lucide-react'
import { cn } from '@lib/utils'
import { ConversationList, type ConversationItem } from '../components/conversation-list'

const CONV_ID_KEY = 'ai-workspace-current-conversation'

function newConversationTitle(): string {
  const now = new Date()
  return `对话 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [useClaude, setUseClaude] = useState(false)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const apiKey = useUserStore((s) => s.deepseekApiKey)
  const conversationIdRef = useRef<string | null>(null)
  const savedMsgIdsRef = useRef<Set<string>>(new Set())

  // Claude Code hook
  const claude = useClaudeChat({ onError: setError })

  // DeepSeek fallback hook (仅 Claude 不可用时使用)
  const deepseek = useAiChat({ conversationId: sessionId, onError: setError })

  // 根据 Claude 可用性选择后端
  useEffect(() => {
    if (claude.claudeAvailable === true) {
      setUseClaude(true)
    } else if (claude.claudeAvailable === false && apiKey) {
      setUseClaude(false)
    }
  }, [claude.claudeAvailable, apiKey])

  // 统一接口
  const { messages, thinking, isStreaming, sendMessage, stopGeneration, clearMessages } =
    useClaude ? claude : deepseek

  // 将对话消息加载到当前 hook
  const loadMessagesIntoHook = useCallback(
    (msgs: any[]) => {
      savedMsgIdsRef.current.clear()
      const loaded = msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        thinking: m.thinking,
        createdAt: m.createdAt,
      }))
      loaded.forEach((m: any) => savedMsgIdsRef.current.add(m.id))
      if (useClaude) {
        claude.setMessages(loaded)
      } else {
        deepseek.setMessages(loaded)
      }
    },
    [useClaude, claude, deepseek],
  )

  // 加载对话列表
  const loadConversations = useCallback(async () => {
    try {
      setListLoading(true)
      const list: any = await ipc.conversation.list()
      if (Array.isArray(list)) {
        setConversations(
          list.map((c: any) => ({
            id: c.id,
            title: c.title,
            model: c.model,
            pinned: c.pinned,
            messageCount: c.messageCount,
            updatedAt: c.updatedAt,
          })),
        )
      }
    } catch {
      // 浏览器模式降级
    } finally {
      setListLoading(false)
    }
  }, [])

  // 创建新对话（返回 convId）
  const createConversation = useCallback(async (): Promise<string | null> => {
    const result: any = await ipc.conversation.create({ title: newConversationTitle() })
    const convId = result?.data?.id || result?.id
    if (convId) {
      conversationIdRef.current = convId
      setCurrentConvId(convId)
      localStorage.setItem(CONV_ID_KEY, convId)
    }
    return convId || null
  }, [])

  // 初始化对话：从 localStorage 恢复或创建新对话
  useEffect(() => {
    const initConversation = async () => {
      await loadConversations()
      try {
        const savedId = localStorage.getItem(CONV_ID_KEY)
        if (savedId) {
          const msgs = await ipc.conversation.getMessages(savedId)
          if (Array.isArray(msgs) && msgs.length > 0) {
            conversationIdRef.current = savedId
            setCurrentConvId(savedId)
            loadMessagesIntoHook(msgs)
            return
          }
        }
        await createConversation()
      } catch {
        // 浏览器模式降级：不使用持久化
      }
    }
    // 等 Claude 检测完成后再初始化
    if (claude.claudeAvailable !== null) {
      initConversation()
    }
  }, [claude.claudeAvailable, loadConversations, loadMessagesIntoHook, createConversation])

  // 切换对话
  const handleSelectConversation = useCallback(
    async (id: string) => {
      if (id === currentConvId) return
      if (isStreaming) stopGeneration()
      try {
        const msgs = await ipc.conversation.getMessages(id)
        if (Array.isArray(msgs)) {
          conversationIdRef.current = id
          setCurrentConvId(id)
          localStorage.setItem(CONV_ID_KEY, id)
          loadMessagesIntoHook(msgs)
        }
      } catch {
        // 降级
      }
    },
    [currentConvId, isStreaming, stopGeneration, loadMessagesIntoHook],
  )

  // 新建对话
  const handleNewConversation = useCallback(async () => {
    if (isStreaming) stopGeneration()
    clearMessages()
    savedMsgIdsRef.current.clear()
    const convId = await createConversation()
    if (convId) await loadConversations()
  }, [isStreaming, stopGeneration, clearMessages, createConversation, loadConversations])

  // 删除对话
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await ipc.conversation.delete(id)
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (id === currentConvId) {
          await handleNewConversation()
        }
      } catch {
        // 降级
      }
    },
    [currentConvId, handleNewConversation],
  )

  // 消息变更时持久化到 SQLite
  useEffect(() => {
    const persistMessages = async () => {
      if (!conversationIdRef.current) return
      for (const msg of messages) {
        if (savedMsgIdsRef.current.has(msg.id)) continue
        savedMsgIdsRef.current.add(msg.id)
        try {
          await ipc.conversation.addMessage({
            conversationId: conversationIdRef.current,
            role: msg.role,
            content: msg.content,
            thinking: (msg as any).thinking,
          })
          // 第一条用户消息作为对话标题
          if (msg.role === 'user') {
            const title = msg.content.slice(0, 50)
            try {
              await ipc.conversation.update(conversationIdRef.current, { title })
              // 刷新侧边栏标题
              await loadConversations()
            } catch { /* ignore */ }
          }
        } catch { /* 降级 */ }
      }
    }
    persistMessages()
  }, [messages, loadConversations])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, thinking])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    setError('')
    sendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Claude 检测中
  if (claude.claudeAvailable === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在检测 Claude Code...</p>
      </div>
    )
  }

  // 未配置 API Key 且 Claude 不可用
  if (!useClaude && !apiKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Key className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">配置 API Key</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          请先在设置页面配置你的 DeepSeek API Key 或安装 Claude Code CLI。
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={() => window.location.hash = '#/settings'}>
            ⚙ 设置 API Key
          </Button>
          <Button variant="default" className="gap-2" onClick={() => claude.claudeAvailable !== null && setUseClaude(false)}>
            <Terminal className="h-4 w-4" /> 安装 Claude Code
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* 对话历史侧边栏 */}
      <ConversationList
        conversations={conversations}
        currentId={currentConvId}
        loading={listLoading}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
      />

      {/* 聊天区 */}
      <div className="flex h-full flex-1 flex-col">
      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            {useClaude ? (
              <Terminal className="h-12 w-12 opacity-30" />
            ) : (
              <Bot className="h-12 w-12 opacity-30" />
            )}
            <p className="text-sm">{useClaude ? '与 Claude Code 开始对话' : '开始一段新对话吧'}</p>
            <div className="flex gap-2 mt-2">
              {['写一段 React 代码', '解释 TypeScript 泛型', '帮我写一首诗'].map((hint) => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint); inputRef.current?.focus() }}
                  className="rounded-full border border-border/40 px-3 py-1.5 text-xs transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 py-6">
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {/* 头像 */}
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  msg.role === 'user' ? 'bg-primary/10 order-2' : 'bg-muted order-1',
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4 text-primary" /> : <Bot className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* 消息内容 */}
                <div className={cn('max-w-[75%]', msg.role === 'user' ? 'order-1' : 'order-2')}>
                  {msg.role === 'user' ? (
                    <div className="rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 text-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* 思维链 */}
                      {msg.thinking && (
                        <details className="group" open>
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            <Brain className="mr-1 inline h-3 w-3" />
                            思考过程
                          </summary>
                          <div className="mt-2 rounded-xl border border-border/30 bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                            {msg.thinking}
                          </div>
                        </details>
                      )}
                      {/* 正文 */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content || (isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse rounded-sm" />)}
                      </div>
                      {/* 操作按钮 */}
                      {msg.content && !isStreaming && (
                        <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                          >
                            {copiedId === msg.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 实时思维链 */}
            {thinking && isStreaming && (
              <div className="mx-auto max-w-3xl">
                <details open className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground">💭 正在思考...</summary>
                  <div className="mt-2 rounded-xl border border-primary/10 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed animate-pulse">
                    {thinking}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-auto max-w-3xl w-full px-6 pb-2">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-400">
            {error}
            <button className="ml-2 underline" onClick={() => setError('')}>关闭</button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t border-border/30 bg-sidebar/50 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-border/40 bg-input/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/60"
            />
            {isStreaming ? (
              <Button variant="destructive" size="icon" onClick={stopGeneration} className="h-10 w-10 shrink-0">
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleNewConversation}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              清空对话
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
