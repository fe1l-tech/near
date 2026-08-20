import { useState, useMemo, useEffect } from 'react'
import { useCalendarStore, type CalendarEvent } from '../viewmodels/calendar.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import {
  ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Trash2, Calendar, Gift, Bell, Flag,
} from 'lucide-react'
import { cn } from '@lib/utils'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, getDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const TYPE_LABELS: Record<string, { label: string; icon: typeof Calendar }> = {
  event: { label: '事件', icon: Flag },
  task: { label: '任务', icon: Clock },
  birthday: { label: '生日', icon: Gift },
  reminder: { label: '提醒', icon: Bell },
}

export default function CalendarPage() {
  const {
    events, currentDate, view, loaded,
    setView, goPrev, goNext, goToToday,
    addEvent, deleteEvent, loadFromDb,
    getEventsByDate, getUpcomingEvents,
  } = useCalendarStore()

  useEffect(() => {
    if (!loaded) loadFromDb()
  }, [loaded, loadFromDb])

  const [showDialog, setShowDialog] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: currentDate, type: 'event' as CalendarEvent['type'],
    isAllDay: true, startTime: '', endTime: '', location: '',
  })
  const [dialogDate, setDialogDate] = useState(currentDate)

  const openDialog = (date?: string) => {
    const d = date || currentDate
    setDialogDate(d)
    setNewEvent({ title: '', description: '', date: d, type: 'event', isAllDay: true, startTime: '', endTime: '', location: '' })
    setShowDialog(true)
  }

  const handleAdd = () => {
    if (!newEvent.title.trim()) return
    addEvent({
      title: newEvent.title, description: newEvent.description,
      date: dialogDate, type: newEvent.type,
      isAllDay: newEvent.isAllDay,
      startTime: newEvent.startTime || undefined,
      endTime: newEvent.endTime || undefined,
      location: newEvent.location || undefined,
      color: '',
    })
    setShowDialog(false)
  }

  // 生成月视图网格
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(currentDate))
    const end = endOfMonth(new Date(currentDate))
    const gridStart = startOfWeek(start, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(end, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentDate])

  // 生成周视图
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(currentDate), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: endOfWeek(new Date(currentDate), { weekStartsOn: 1 }) })
  }, [currentDate])

  const upcoming = getUpcomingEvents(7)

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">📅 日历</h1>
          <div className="flex rounded-lg bg-muted/50 p-0.5">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn('rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {{ month: '月', week: '周', day: '日' }[v]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>今天</Button>
          <Button variant="ghost" size="icon" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-32 text-center">
            {format(new Date(currentDate), view === 'month' ? 'yyyy年 M月' : 'yyyy年 M月 d日', { locale: zhCN })}
          </span>
          <Button variant="ghost" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" className="gap-1" onClick={() => openDialog()}><Plus className="h-3.5 w-3.5" />新建</Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* 日历主区域 */}
        <div className="flex-1">
          <GlassCard padding="none">
            {/* 星期头 */}
            <div className="grid grid-cols-7 border-b border-border/30 text-center text-xs font-medium text-muted-foreground">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>

            {/* 月视图 */}
            {view === 'month' && (
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayEvents = getEventsByDate(dateStr)
                  const inMonth = isSameMonth(day, new Date(currentDate))
                  const today = isToday(day)

                  return (
                    <button
                      key={dateStr}
                      onClick={() => openDialog(dateStr)}
                      className={cn(
                        'min-h-[80px] border-b border-r border-border/10 p-1.5 text-left transition-colors hover:bg-accent/30',
                        !inMonth && 'bg-muted/20',
                        today && 'bg-primary/5',
                      )}
                    >
                      <span className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        today && 'bg-primary text-primary-foreground font-bold',
                        !inMonth && 'text-muted-foreground/40',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.map((ev) => (
                        <div key={ev.id}
                          className="mt-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: ev.color }}>
                          {ev.title}
                        </div>
                      ))}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 周视图 */}
            {view === 'week' && (
              <div className="grid grid-cols-7">
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayEvents = getEventsByDate(dateStr)
                  const today = isToday(day)
                  return (
                    <button key={dateStr} onClick={() => openDialog(dateStr)}
                      className={cn('min-h-[200px] border-b border-r border-border/10 p-2 text-left hover:bg-accent/30', today && 'bg-primary/5')}>
                      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-sm', today && 'bg-primary text-primary-foreground font-bold')}>
                        {format(day, 'd')}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">{WEEKDAYS[getDay(day) === 0 ? 6 : getDay(day) - 1]}</span>
                      {dayEvents.map((ev) => (
                        <div key={ev.id} className="mt-1 rounded px-1.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: ev.color }}>
                          <div className="flex items-center gap-1">
                            {ev.type === 'birthday' && <Gift className="h-3 w-3" />}
                            {ev.title}
                          </div>
                          {ev.startTime && <div className="mt-0.5 opacity-80">{ev.startTime} - {ev.endTime}</div>}
                        </div>
                      ))}
                    </button>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* 右侧边栏 — 即将到来的事件 */}
        <div className="w-64 shrink-0 space-y-3">
          <GlassCard>
            <h3 className="font-semibold text-sm text-foreground mb-3">📋 未来 7 天</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无事件</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ev.color }} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(ev.date), 'M月d日', { locale: zhCN })}
                        {ev.startTime && ` ${ev.startTime}`}
                      </p>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="ml-auto shrink-0 text-muted-foreground/40 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 图例 */}
          <GlassCard>
            <h3 className="font-semibold text-sm text-foreground mb-2">图例</h3>
            <div className="space-y-1.5">
              {Object.entries(TYPE_LABELS).map(([type, { label, icon: Icon }]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 新建事件对话框 */}
      {showDialog && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setShowDialog(false)} />
          <div className="fixed left-1/2 top-1/3 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">新建事件</h3>
                <button onClick={() => setShowDialog(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                <Input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="事件标题" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
                <Input value={dialogDate} onChange={(e) => setDialogDate(e.target.value)} type="date" />
                <div className="flex gap-2">
                  {Object.entries(TYPE_LABELS).map(([type, { label, icon: Icon }]) => (
                    <button key={type} onClick={() => setNewEvent({ ...newEvent, type: type as CalendarEvent['type'] })}
                      className={cn('flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors',
                        newEvent.type === type ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>
                      <Icon className="h-3 w-3" />{label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value, isAllDay: false })}
                    type="time" className="w-32" placeholder="开始" />
                  <Input value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    type="time" className="w-32" placeholder="结束" />
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="地点（可选）" className="flex-1" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>取消</Button>
                  <Button size="sm" onClick={handleAdd}>添加</Button>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  )
}
