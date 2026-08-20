import { useState } from 'react'
import { cn } from '@lib/utils'
import { Plus, MessageSquare, Trash2, Search, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface ConversationItem {
  id: string
  title: string
  model?: string
  pinned?: boolean
  messageCount?: number
  updatedAt?: string
}

interface ConversationListProps {
  conversations: ConversationItem[]
  currentId: string | null
  loading?: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay) return format(date, 'HH:mm')
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, 'M月d日', { locale: zhCN })
  }
  return format(date, 'yyyy/M/d', { locale: zhCN })
}

export function ConversationList({
  conversations,
  currentId,
  loading = false,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  const [keyword, setKeyword] = useState('')

  const filtered = keyword.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(keyword.trim().toLowerCase()))
    : conversations

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/30 bg-sidebar/40 backdrop-blur-xl">
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium text-muted-foreground">对话历史</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          新建
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-input/40 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索对话..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/60">
              {keyword.trim() ? '没有匹配的对话' : '暂无对话记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((conv) => {
              const active = conv.id === currentId
              return (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <MessageSquare className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground/50')} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{conv.title || '未命名对话'}</div>
                    {conv.updatedAt && (
                      <div className="text-[10px] text-muted-foreground/50">{formatTime(conv.updatedAt)}</div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(conv.id)
                    }}
                    className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    title="删除对话"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
