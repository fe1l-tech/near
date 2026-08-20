import { useState, useEffect, useRef } from 'react'
import { useTodoStore } from '../viewmodels/todo.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Progress } from '@components/ui/progress'
import { cn } from '@lib/utils'
import { Plus, Search, Trash2, Timer, Check, Play, Pause, RotateCcw, Clock } from 'lucide-react'

const PRIORITY_COLORS = { urgent: '#e85d7a', high: '#f59e0b', medium: '#60a5fa', low: '#a78bfa' }
const PRIORITY_LABELS = { urgent: '紧急', high: '高', medium: '中', low: '低' }

export default function TodoPage() {
  const { todos, filter, searchQuery, loaded, loadFromDb, add, update, remove, toggle, setFilter, setSearch, getFiltered, getStats } = useTodoStore()
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [activeTimer, setActiveTimer] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!loaded) loadFromDb()
  }, [loaded, loadFromDb])

  const filtered = getFiltered()
  const stats = getStats()

  // 番茄钟
  useEffect(() => {
    if (timerRunning && activeTimer) {
      intervalRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning, activeTimer])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const startTimer = (id: string) => {
    setActiveTimer(id)
    setTimerSeconds(0)
    setTimerRunning(true)
  }

  const pauseTimer = () => setTimerRunning(false)
  const resetTimer = () => { setTimerRunning(false); setTimerSeconds(0); setActiveTimer(null) }

  const handleAdd = () => {
    if (!newTitle.trim()) return
    add(newTitle.trim(), { dueDate: newDueDate || undefined })
    setNewTitle('')
    setNewDueDate('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">✅ 今日计划</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>完成率 {stats.completionRate}%</span>
          <Progress value={stats.completionRate} className="w-24" />
          <span className="text-xs">{stats.completed}/{stats.total}</span>
        </div>
      </div>

      {/* 输入栏 */}
      <div className="flex gap-2">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="添加新任务..." className="flex-1" />
        <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
          className="w-40 shrink-0" title="截止日期" />
        <Button onClick={handleAdd} className="gap-1 shrink-0"><Plus className="h-4 w-4" />添加</Button>
      </div>

      {/* 过滤 + 搜索 */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {[{ k: 'all', l: '全部' }, { k: 'active', l: '进行中' }, { k: 'completed', l: '已完成' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k as 'all')}
              className={cn('rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filter === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearch(e.target.value)} placeholder="搜索任务..." className="pl-8 text-sm" />
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <GlassCard><p className="text-center text-sm text-muted-foreground py-8">没有任务，添加一个吧 ✨</p></GlassCard>
        ) : (
          filtered.map((todo) => (
            <GlassCard key={todo.id} padding="sm" className={cn(todo.status === 'completed' && 'opacity-60')}>
              <div className="flex items-center gap-3">
                {/* 完成按钮 */}
                <button onClick={() => toggle(todo.id)}
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    todo.status === 'completed' ? 'border-emerald-400 bg-emerald-400 text-white' : 'border-muted-foreground/30 hover:border-primary/50')}>
                  {todo.status === 'completed' && <Check className="h-3 w-3" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm', todo.status === 'completed' && 'line-through text-muted-foreground')}>
                      {todo.title}
                    </span>
                    {/* 优先级 */}
                    <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: PRIORITY_COLORS[todo.priority] + '20', color: PRIORITY_COLORS[todo.priority] }}>
                      {PRIORITY_LABELS[todo.priority]}
                    </span>
                  </div>
                  {todo.dueDate && (
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />{todo.dueDate} {todo.dueTime}
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-1">
                  {/* 番茄钟 */}
                  {activeTimer === todo.id ? (
                    <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1">
                      <span className="text-xs font-mono font-bold text-primary">{formatTime(timerSeconds)}</span>
                      {timerRunning ? (
                        <button onClick={pauseTimer} className="text-primary"><Pause className="h-3.5 w-3.5" /></button>
                      ) : (
                        <button onClick={() => setTimerRunning(true)} className="text-primary"><Play className="h-3.5 w-3.5" /></button>
                      )}
                      <button onClick={resetTimer} className="text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startTimer(todo.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors" title="番茄钟">
                      <Timer className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => remove(todo.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-400 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  )
}
