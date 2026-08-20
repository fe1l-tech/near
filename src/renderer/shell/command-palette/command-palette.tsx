import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CheckSquare,
  Dumbbell,
  Salad,
  StickyNote,
  CloudSun,
  BarChart3,
  Settings,
  Search,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@lib/utils'

interface Command {
  id: string
  label: string
  icon: LucideIcon
  category: 'navigation' | 'action' | 'settings'
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const commands: Command[] = [
    { id: 'home', label: '前往首页', icon: LayoutDashboard, category: 'navigation', shortcut: '^ H', action: () => navigate('/') },
    { id: 'chat', label: 'AI 聊天', icon: MessageSquare, category: 'navigation', shortcut: '^ L', action: () => navigate('/chat') },
    { id: 'calendar', label: '日历', icon: Calendar, category: 'navigation', shortcut: '^ C', action: () => navigate('/calendar') },
    { id: 'todo', label: '今日计划', icon: CheckSquare, category: 'navigation', shortcut: '^ T', action: () => navigate('/todo') },
    { id: 'fitness', label: '健身计划', icon: Dumbbell, category: 'navigation', action: () => navigate('/fitness') },
    { id: 'diet', label: '饮食计划', icon: Salad, category: 'navigation', action: () => navigate('/diet') },
    { id: 'memo', label: '备忘录', icon: StickyNote, category: 'navigation', shortcut: '^ M', action: () => navigate('/memo') },
    { id: 'weather', label: '天气', icon: CloudSun, category: 'navigation', action: () => navigate('/weather') },
    { id: 'statistics', label: '数据统计', icon: BarChart3, category: 'navigation', action: () => navigate('/statistics') },
    { id: 'settings', label: '打开设置', icon: Settings, category: 'settings', action: () => navigate('/settings') },
    { id: 'new-chat', label: '新建对话', icon: Plus, category: 'action', shortcut: '^ N', action: () => navigate('/chat') },
  ]

  // Ctrl+K 快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 过滤命令
  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  // 按分类分组
  const grouped = filtered.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = []
      acc[cmd.category].push(cmd)
      return acc
    },
    {} as Record<string, Command[]>,
  )

  if (!open) return null

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* 面板 */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-2xl backdrop-blur-2xl">
        {/* 搜索框 */}
        <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索命令..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* 命令列表 */}
        <div className="max-h-72 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category === 'navigation' ? '导航' : category === 'action' ? '操作' : '设置'}
              </div>
              {cmds.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action()
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent/50"
                >
                  <cmd.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="rounded-md border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
