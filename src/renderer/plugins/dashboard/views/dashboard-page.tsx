import { useEffect, useState } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { Sparkles, Clock, CloudSun, Quote, CheckSquare, Dumbbell, Salad, StickyNote, MessageCircle, ArrowRight } from 'lucide-react'
import { useTodoStore } from '@plugins/todo/viewmodels/todo.store'
import { useMemoStore } from '@plugins/memo/viewmodels/memo.store'
import { useCalendarStore } from '@plugins/calendar/viewmodels/calendar.store'
import { ipc } from '@core/ipc/ipc-client'
import { useUserStore } from '@core/stores'
import { cn } from '@lib/utils'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

interface DailyQuote {
  quote_text: string
  quote_zh?: string
  author: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dateStr = format(today, 'yyyy年 M月 d日 EEEE', { locale: zhCN })
  const [currentTime, setCurrentTime] = useState(today)
  const [dailyQuote, setDailyQuote] = useState<DailyQuote | null>(null)

  const { todos, getStats: getTodoStats } = useTodoStore()
  const { memos } = useMemoStore()
  const { events } = useCalendarStore()
  const username = useUserStore((s) => s.username) || '洲'

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  // 获取每日语录
  useEffect(() => {
    ipc.quotes.getDaily().then((result) => {
      if (result) {
        setDailyQuote(result as DailyQuote)
      }
    }).catch(() => {
      // 降级使用默认语录
      setDailyQuote({
        quote_text: 'The only way to do great work is to love what you do.',
        quote_zh: '成就伟业的唯一途径是热爱你所做的事。',
        author: 'Steve Jobs',
      })
    })
  }, [])

  const todoStats = getTodoStats()
  const pendingTodos = todos.filter(t => t.status !== 'completed').slice(0, 5)
  const todayEvents = events.filter(e => e.date === todayStr).slice(0, 5)
  const recentMemos = memos.filter(m => !m.isArchived).slice(0, 3)

  // 时段问候语
  const hour = currentTime.getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

  // 快速导航
  const quickLinks = [
    { label: 'AI 对话', icon: MessageCircle, path: '/chat', color: 'text-primary', bg: 'bg-primary/10' },
    { label: '待办', icon: CheckSquare, path: '/todo', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: '健身', icon: Dumbbell, path: '/fitness', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: '饮食', icon: Salad, path: '/diet', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: '笔记', icon: StickyNote, path: '/memo', color: 'text-sky-400', bg: 'bg-sky-400/10' },
  ]

  return (
    <div className="space-y-6">
      {/* 顶部问候 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            👋 {greeting}{username ? `，${username}` : ''}
          </h1>
          <p className="mt-1 text-muted-foreground">{dateStr}</p>
        </div>
        <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          🌸 Sakura Dream v0.1.0
        </div>
      </div>

      {/* 快速入口 */}
      <div className="grid grid-cols-5 gap-3">
        {quickLinks.map(({ label, icon: Icon, path, color, bg }) => (
          <button key={path} onClick={() => navigate(path)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border/30 bg-card/50 p-4 transition-all hover:border-primary/20 hover:bg-card hover:shadow-sm">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bg)}>
              <Icon className={cn('h-5 w-5', color)} />
            </div>
            <span className="text-xs font-medium text-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* 第一行卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">当前时间</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {format(currentTime, 'HH:mm', { locale: zhCN })}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
            <Quote className="h-6 w-6 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">每日语录</p>
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {dailyQuote ? `"${dailyQuote.quote_text}"` : '加载中...'}
            </p>
            <p className="text-xs text-muted-foreground">
              {dailyQuote ? `— ${dailyQuote.author}` : ''}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10">
            <Sparkles className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">效率概览</p>
            <p className="text-sm font-medium text-foreground">
              待办 {todoStats.completed}/{todoStats.total} · 笔记 {memos.length} 篇
            </p>
            <p className="text-xs text-muted-foreground">
              完成率 {todoStats.completionRate}%
            </p>
          </div>
        </GlassCard>
      </div>

      {/* 第二行 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 今日待办 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-foreground">今日待办</h3>
            </div>
            <button onClick={() => navigate('/todo')}
              className="flex items-center gap-1 text-xs text-primary hover:underline">
              查看全部 <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {pendingTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无待办，去添加一个吧 ✨</p>
          ) : (
            <div className="space-y-2">
              {pendingTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/30 transition-colors">
                  <div className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    todo.status === 'in_progress' ? 'border-primary/50 bg-primary/10' : 'border-muted-foreground/30',
                  )} />
                  <span className={cn('text-sm', todo.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                    {todo.title}
                  </span>
                  {todo.priority === 'urgent' && <span className="text-[10px] text-red-400 font-medium">紧急</span>}
                  {todo.dueDate && <span className="ml-auto text-[10px] text-muted-foreground">{todo.dueDate}</span>}
                </div>
              ))}
            </div>
          )}
          {todoStats.total > 0 && (
            <div className="mt-3 pt-3 border-t border-border/20">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${todoStats.completionRate}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{todoStats.completionRate}%</span>
              </div>
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          {/* 今日日历 */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">今日日程</h3>
              </div>
              <button onClick={() => navigate('/calendar')}
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                日历 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {todayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">今天没有安排</p>
            ) : (
              <div className="space-y-1.5">
                {todayEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                    <span className="text-foreground">{ev.title}</span>
                    {ev.startTime && <span className="ml-auto text-xs text-muted-foreground">{ev.startTime}</span>}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 最近笔记 */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-sky-400" />
                <h3 className="font-semibold text-sm text-foreground">最近笔记</h3>
              </div>
              <button onClick={() => navigate('/memo')}
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                全部 <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {recentMemos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">还没有笔记</p>
            ) : (
              <div className="space-y-2">
                {recentMemos.map((memo) => (
                  <div key={memo.id} className="flex items-center gap-2 text-sm">
                    <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground truncate">{memo.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {format(new Date(memo.updatedAt), 'MM/dd')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
