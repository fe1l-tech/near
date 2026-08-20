import { useEffect, useState, useMemo } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { useTodoStore } from '@plugins/todo/viewmodels/todo.store'
import { useMemoStore } from '@plugins/memo/viewmodels/memo.store'
import { useCalendarStore } from '@plugins/calendar/viewmodels/calendar.store'
import { useFitnessStore } from '@plugins/fitness/viewmodels/fitness.store'
import { useDietStore } from '@plugins/diet/viewmodels/diet.store'
import { cn } from '@lib/utils'
import { BarChart3, TrendingUp, CheckSquare, Dumbbell, Salad, StickyNote, Calendar, Activity, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Tooltip, AreaChart, Area,
} from 'recharts'

const COLORS = ['#e85d7a', '#f59e0b', '#60a5fa', '#a78bfa', '#34d399', '#f97316']

export default function StatisticsPage() {
  const { todos } = useTodoStore()
  const { memos } = useMemoStore()
  const { events } = useCalendarStore()
  const { logs: fitnessLogs, stats: bodyStats, loaded: fitnessLoaded, loadFromDb: loadFitness } = useFitnessStore()
  const { meals, summary: dietSummary, loaded: dietLoaded, loadFromDb: loadDiet } = useDietStore()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week')

  useEffect(() => {
    if (!fitnessLoaded) loadFitness()
    if (!dietLoaded) loadDiet()
  }, [fitnessLoaded, dietLoaded, loadFitness, loadDiet])

  // 根据周期计算起始日期
  const periodStart = useMemo(() => {
    const now = new Date()
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365
    const start = new Date(now.getTime() - days * 86400000)
    return start.toISOString().split('T')[0]
  }, [selectedPeriod])

  // 周期筛选后的健身记录
  const periodFitnessLogs = useMemo(() =>
    fitnessLogs.filter(l => (l.log_date || l.date || '') >= periodStart),
  [fitnessLogs, periodStart])

  // 周期筛选后的饮食记录
  const periodMeals = useMemo(() =>
    meals.filter(m => (m.meal_date || m.date || '') >= periodStart),
  [meals, periodStart])

  // Todo 统计
  const todoStats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter(t => t.status === 'completed').length
    const inProgress = todos.filter(t => t.status === 'in_progress').length
    const pending = todos.filter(t => t.status === 'pending').length
    const urgent = todos.filter(t => t.priority === 'urgent').length
    const high = todos.filter(t => t.priority === 'high').length
    return { total, completed, inProgress, pending, urgent, high, rate: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [todos])

  // Memo 统计
  const memoStats = useMemo(() => {
    const total = memos.length
    const favorites = memos.filter(m => m.isFavorite).length
    const pinned = memos.filter(m => m.isPinned).length
    const totalWords = memos.reduce((s, m) => s + (m.wordCount || m.content?.length || 0), 0)
    return { total, favorites, pinned, totalWords }
  }, [memos])

  // 日历统计
  const calendarStats = useMemo(() => {
    const total = events.length
    const events_ = events.filter(e => e.type === 'event').length
    const tasks = events.filter(e => e.type === 'task').length
    const birthdays = events.filter(e => e.type === 'birthday').length
    const reminders = events.filter(e => e.type === 'reminder').length
    return { total, events: events_, tasks, birthdays, reminders }
  }, [events])

  // 健身统计（周期内）
  const fitnessStats = useMemo(() => {
    const total = fitnessLogs.length
    const thisPeriod = periodFitnessLogs.length
    const totalVolume = periodFitnessLogs.reduce((s, l) =>
      s + (l.sets_completed || l.sets || 0) * Number(l.reps_per_set || l.reps || 0) * Number(l.weight_per_set || l.weight || 0), 0)
    const exerciseCounts: Record<string, number> = {}
    periodFitnessLogs.forEach(l => {
      const name = l.exercise_name || l.exercise || '其他'
      exerciseCounts[name] = (exerciseCounts[name] || 0) + 1
    })
    const topExercises = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return { total, thisPeriod, totalVolume, topExercises }
  }, [fitnessLogs, periodFitnessLogs])

  // 饮食统计（最近7天）
  const dietStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const totalCal = Number(dietSummary.total_calories || 0)
    const totalProtein = Number(dietSummary.total_protein || 0)
    const totalFat = Number(dietSummary.total_fat || 0)
    const totalCarbs = Number(dietSummary.total_carbs || 0)
    const totalWater = Number(dietSummary.total_water || 0)
    return { totalCal, totalProtein, totalFat, totalCarbs, totalWater }
  }, [dietSummary])

  // Todo 优先级分布
  const priorityData = [
    { name: '紧急', value: todoStats.urgent, color: '#e85d7a' },
    { name: '高', value: todoStats.high, color: '#f59e0b' },
    { name: '中', value: todoStats.total - todoStats.urgent - todoStats.high - todos.filter(t => t.priority === 'low').length, color: '#60a5fa' },
    { name: '低', value: todos.filter(t => t.priority === 'low').length, color: '#a78bfa' },
  ].filter(d => d.value > 0)

  // 日历类型分布
  const eventTypeData = [
    { name: '事件', value: calendarStats.events, color: '#e85d7a' },
    { name: '任务', value: calendarStats.tasks, color: '#f59e0b' },
    { name: '生日', value: calendarStats.birthdays, color: '#a78bfa' },
    { name: '提醒', value: calendarStats.reminders, color: '#60a5fa' },
  ].filter(d => d.value > 0)

  // 营养分布
  const nutritionData = [
    { name: '蛋白质', value: dietStats.totalProtein, color: '#ef4444' },
    { name: '脂肪', value: dietStats.totalFat, color: '#f59e0b' },
    { name: '碳水', value: dietStats.totalCarbs, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  // 健身训练趋势（周期内记录）
  const fitnessTrend = periodFitnessLogs.slice(0, 14).reverse().map(l => ({
    name: (l.log_date || l.date || '').slice(5),
    volume: (l.sets_completed || l.sets || 0) * Number(l.reps_per_set || l.reps || 0) * Number(l.weight_per_set || l.weight || 0),
  }))

  // 体重趋势
  const weightTrend = bodyStats.slice(0, 14).reverse().map(s => ({
    name: (s.record_date || s.date || '').slice(5),
    kg: Number(s.weight_kg || s.weight || 0),
  }))

  // 综合得分（周期内）
  const healthScore = useMemo(() => {
    let score = 0
    if (fitnessStats.thisPeriod >= 2) score += 25
    else if (fitnessStats.thisPeriod >= 1) score += 15
    if (dietStats.totalWater >= 1500) score += 20
    else if (dietStats.totalWater >= 800) score += 10
    if (dietStats.totalCal >= 1200 && dietStats.totalCal <= 2500) score += 20
    if (todoStats.rate >= 50) score += 20
    if (memoStats.total > 0) score += 15
    return Math.min(score, 100)
  }, [fitnessStats, dietStats, todoStats, memoStats])

  const efficiencyScore = useMemo(() => {
    let score = 0
    if (todoStats.rate >= 80) score += 35
    else if (todoStats.rate >= 40) score += 20
    if (todoStats.completed >= 5) score += 30
    else if (todoStats.completed >= 2) score += 15
    if (memoStats.totalWords > 1000) score += 20
    else if (memoStats.totalWords > 0) score += 10
    if (calendarStats.total > 0) score += 15
    return Math.min(score, 100)
  }, [todoStats, memoStats, calendarStats])

  // 根据周期生成日期序列
  const periodDays = useMemo(() => {
    const days = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365
    // 对于年和月，用周聚合避免图表太密
    if (selectedPeriod === 'year') {
      // 按周聚合
      const weeks: { label: string; start: string; end: string }[] = []
      for (let i = days - 1; i >= 0; i -= 7) {
        const end = new Date()
        end.setDate(end.getDate() - Math.max(0, i - 6))
        const start = new Date()
        start.setDate(start.getDate() - i)
        weeks.push({
          label: `${start.getMonth() + 1}/${start.getDate()}`,
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        })
      }
      return weeks
    } else if (selectedPeriod === 'month') {
      // 每3天一个点
      const points: { label: string; start: string; end: string }[] = []
      for (let i = days - 1; i >= 0; i -= 3) {
        const end = new Date()
        end.setDate(end.getDate() - Math.max(0, i - 2))
        const start = new Date()
        start.setDate(start.getDate() - i)
        points.push({
          label: `${start.getMonth() + 1}/${start.getDate()}`,
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        })
      }
      return points
    }
    // 周：每天显示
    return Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const dateStr = d.toISOString().split('T')[0]
      return { label: dateStr.slice(5), start: dateStr, end: dateStr }
    })
  }, [selectedPeriod])

  const activityData = periodDays.map(({ label, start, end }) => {
    const dayLogs = periodFitnessLogs.filter(l => {
      const d = l.log_date || l.date || ''
      return d >= start && d <= end
    }).length
    const dayMeals = periodMeals.filter(m => {
      const d = m.meal_date || m.date || ''
      return d >= start && d <= end
    }).length
    const dayTodos = todos.filter(t => {
      const created = t.createdAt?.split('T')[0] || ''
      const completed = t.status === 'completed' ? t.updatedAt?.split('T')[0] || '' : ''
      return (created >= start && created <= end) || (completed >= start && completed <= end)
    }).length
    return { name: label, 健身: dayLogs, 饮食: dayMeals, 效率: dayTodos }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">📊 数据统计</h1>
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {[{ k: 'week', l: '周' }, { k: 'month', l: '月' }, { k: 'year', l: '年' }].map(({ k, l }) => (
            <button key={k} onClick={() => setSelectedPeriod(k as typeof selectedPeriod)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${selectedPeriod === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 综合评分 */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-sm">健康指数</h3>
          </div>
          <div className="relative mx-auto w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#34d399" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - healthScore / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{healthScore}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">健身 + 饮食 + 健康</p>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-sm">效率指数</h3>
          </div>
          <div className="relative mx-auto w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f59e0b" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - efficiencyScore / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{efficiencyScore}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">待办 + 笔记 + 日程</p>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 text-center flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />数据概览
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: '待办', value: todoStats.total, sub: `完成 ${todoStats.completed}`, icon: CheckSquare, color: 'text-amber-400' },
              { label: '笔记', value: memoStats.total, sub: `${memoStats.totalWords} 字`, icon: StickyNote, color: 'text-sky-400' },
              { label: '健身', value: fitnessStats.total, sub: `${selectedPeriod === 'week' ? '本周' : selectedPeriod === 'month' ? '本月' : '本年'} ${fitnessStats.thisPeriod}`, icon: Dumbbell, color: 'text-orange-400' },
              { label: '饮食', value: meals.length, sub: `${dietStats.totalCal}kcal`, icon: Salad, color: 'text-emerald-400' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="rounded-xl bg-muted/30 p-2.5">
                <Icon className={cn('h-4 w-4 mx-auto mb-1', color)} />
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 任务与效率 */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-amber-400" />任务状态分布
          </h3>
          {todoStats.total > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: '已完成', value: todoStats.completed },
                      { name: '进行中', value: todoStats.inProgress },
                      { name: '待开始', value: todoStats.pending },
                    ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={35} outerRadius={65}
                      dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                      {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">完成率</span>
                  <span className="font-bold text-emerald-400">{todoStats.rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${todoStats.rate}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">已完成</span>
                  <span className="font-medium">{todoStats.completed} 项</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">进行中</span>
                  <span className="font-medium">{todoStats.inProgress} 项</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          )}
        </GlassCard>

        {/* 日历事件分布 */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />日程类型分布
          </h3>
          {eventTypeData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={35} outerRadius={65}
                      dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                      {eventTypeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {eventTypeData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          )}
        </GlassCard>
      </div>

      {/* 活动热力图 */}
      <GlassCard>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />{selectedPeriod === 'week' ? '最近 7 天' : selectedPeriod === 'month' ? '最近 30 天' : '最近 1 年'}活动
        </h3>
        {activityData.some(d => d.健身 > 0 || d.饮食 > 0 || d.效率 > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="健身" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                <Area type="monotone" dataKey="饮食" stackId="1" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
                <Area type="monotone" dataKey="效率" stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">过去 7 天暂无活动记录</p>
        )}
      </GlassCard>

      {/* 健身趋势 */}
      {fitnessTrend.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <GlassCard>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-400" />训练容量趋势
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitnessTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} name="训练容量(kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {weightTrend.length > 1 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />体重变化
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Line type="monotone" dataKey="kg" stroke="#e85d7a" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* 营养分布 */}
      {nutritionData.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Salad className="h-4 w-4 text-emerald-400" />今日营养分布
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={nutritionData} cx="50%" cy="50%" innerRadius={40} outerRadius={75}
                    dataKey="value" label={({ name, value }) => `${name} ${Math.round(value)}g`}>
                    {nutritionData.map((_, i) => <Cell key={i} fill={COLORS[i + 1]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">热量</span>
                  <span className="font-medium">{dietStats.totalCal} / 2000 kcal</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, (dietStats.totalCal / 2000) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">蛋白质</span>
                  <span className="font-medium">{Math.round(dietStats.totalProtein)} / 120 g</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, (dietStats.totalProtein / 120) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">饮水</span>
                  <span className="font-medium">{dietStats.totalWater} / 2000 ml</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, (dietStats.totalWater / 2000) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
