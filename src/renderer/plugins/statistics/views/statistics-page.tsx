import { useEffect, useState, useMemo } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { useTodoStore } from '@plugins/todo/viewmodels/todo.store'
import { useMemoStore } from '@plugins/memo/viewmodels/memo.store'
import { useCalendarStore } from '@plugins/calendar/viewmodels/calendar.store'
import { useFitnessStore } from '@plugins/fitness/viewmodels/fitness.store'
import { useDietStore } from '@plugins/diet/viewmodels/diet.store'
import { cn } from '@lib/utils'
import { useI18n } from '@core/i18n'
import { BarChart3, TrendingUp, CheckSquare, Dumbbell, Salad, StickyNote, Calendar, Activity, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Tooltip, AreaChart, Area,
} from 'recharts'

const COLORS = ['#e85d7a', '#f59e0b', '#60a5fa', '#a78bfa', '#34d399', '#f97316']

export default function StatisticsPage() {
  const { t } = useI18n()
  const { todos, loaded: todosLoaded, loadFromDb: loadTodos } = useTodoStore()
  const { memos, loaded: memosLoaded, loadFromDb: loadMemos } = useMemoStore()
  const { events, loaded: eventsLoaded, loadFromDb: loadEvents } = useCalendarStore()
  const { logs: fitnessLogs, stats: bodyStats, loaded: fitnessLoaded, loadFromDb: loadFitness } = useFitnessStore()
  const { meals, summary: dietSummary, loaded: dietLoaded, loadFromDb: loadDiet } = useDietStore()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week')

  // 统计页聚合五个模块的数据，所以必须自己把这五个 store 都读一遍 ——
  // 不能依赖"用户先访问过那些页面"。否则直接打开本页时，
  // 待办/笔记/日程三项会是空的，看起来像数据丢了。
  useEffect(() => {
    if (!todosLoaded) loadTodos()
    if (!memosLoaded) loadMemos()
    if (!eventsLoaded) loadEvents()
    if (!fitnessLoaded) loadFitness()
    if (!dietLoaded) loadDiet()
  }, [
    todosLoaded, memosLoaded, eventsLoaded, fitnessLoaded, dietLoaded,
    loadTodos, loadMemos, loadEvents, loadFitness, loadDiet,
  ])

  /** 当前周期对应的天数 */
  const periodDaysCount = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : 365

  // 根据周期计算起始日期
  const periodStart = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getTime() - periodDaysCount * 86400000)
    return start.toISOString().split('T')[0]
  }, [periodDaysCount])

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
    const low = todos.filter(t => t.priority === 'low').length
    const medium = total - urgent - high - low
    return { total, completed, inProgress, pending, urgent, high, low, medium, rate: total > 0 ? Math.round((completed / total) * 100) : 0 }
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
      const name = l.exercise_name || l.exercise || '—'
      exerciseCounts[name] = (exerciseCounts[name] || 0) + 1
    })
    const topExercises = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return { total, thisPeriod, totalVolume, topExercises }
  }, [fitnessLogs, periodFitnessLogs])

  // 饮食统计（最近7天）
  const dietStats = useMemo(() => {
    const totalCal = Number(dietSummary.total_calories || 0)
    const totalProtein = Number(dietSummary.total_protein || 0)
    const totalFat = Number(dietSummary.total_fat || 0)
    const totalCarbs = Number(dietSummary.total_carbs || 0)
    const totalWater = Number(dietSummary.total_water || 0)
    return { totalCal, totalProtein, totalFat, totalCarbs, totalWater }
  }, [dietSummary])

  // Todo 优先级分布
  const priorityData = [
    { name: t('todo.priority.urgent'), value: todoStats.urgent, color: '#e85d7a' },
    { name: t('todo.priority.high'), value: todoStats.high, color: '#f59e0b' },
    { name: t('todo.priority.medium'), value: todoStats.medium, color: '#60a5fa' },
    { name: t('todo.priority.low'), value: todoStats.low, color: '#a78bfa' },
  ].filter(d => d.value > 0)

  // 日历类型分布
  const eventTypeData = [
    { name: t('calendar.types.event'), value: calendarStats.events, color: '#e85d7a' },
    { name: t('calendar.types.task'), value: calendarStats.tasks, color: '#f59e0b' },
    { name: t('calendar.types.birthday'), value: calendarStats.birthdays, color: '#a78bfa' },
    { name: t('calendar.types.reminder'), value: calendarStats.reminders, color: '#60a5fa' },
  ].filter(d => d.value > 0)

  // 营养分布
  const nutritionData = [
    { name: t('diet.protein'), value: dietStats.totalProtein, color: '#ef4444' },
    { name: t('diet.fat'), value: dietStats.totalFat, color: '#f59e0b' },
    { name: t('diet.carbs'), value: dietStats.totalCarbs, color: '#3b82f6' },
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
  const chartPoints = useMemo(() => {
    const days = periodDaysCount
    // 对于年和月，用周/三日聚合避免图表太密
    if (selectedPeriod === 'year' || selectedPeriod === 'month') {
      const step = selectedPeriod === 'year' ? 7 : 3
      const points: { label: string; start: string; end: string }[] = []
      for (let i = days - 1; i >= 0; i -= step) {
        const end = new Date()
        end.setDate(end.getDate() - Math.max(0, i - (step - 1)))
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
  }, [selectedPeriod, periodDaysCount])

  // 活动图的系列名会同时作为图例/提示里的文字，因此也走翻译
  const seriesFitness = t('statistics.fitness')
  const seriesDiet = t('statistics.diet')
  const seriesEfficiency = t('statistics.efficiencyIndex')

  const activityData = chartPoints.map(({ label, start, end }) => {
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
    return { name: label, [seriesFitness]: dayLogs, [seriesDiet]: dayMeals, [seriesEfficiency]: dayTodos }
  })

  const hasActivity = activityData.some(
    (d) => (d[seriesFitness] as number) > 0 || (d[seriesDiet] as number) > 0 || (d[seriesEfficiency] as number) > 0,
  )

  const overviewCards = [
    { label: t('statistics.todos'), value: todoStats.total, sub: t('statistics.completedCount', { n: todoStats.completed }), icon: CheckSquare, color: 'text-amber-400' },
    { label: t('statistics.memos'), value: memoStats.total, sub: t('statistics.wordCount', { n: memoStats.totalWords }), icon: StickyNote, color: 'text-sky-400' },
    {
      label: t('statistics.fitness'),
      value: fitnessStats.total,
      sub: `${t(selectedPeriod === 'week' ? 'statistics.thisWeekLabel' : selectedPeriod === 'month' ? 'statistics.thisMonthLabel' : 'statistics.thisYearLabel')} ${fitnessStats.thisPeriod}`,
      icon: Dumbbell,
      color: 'text-orange-400',
    },
    { label: t('statistics.diet'), value: meals.length, sub: t('statistics.kcalCount', { n: dietStats.totalCal }), icon: Salad, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">📊 {t('statistics.title')}</h1>
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {([
            { k: 'week', l: t('statistics.week') },
            { k: 'month', l: t('statistics.month') },
            { k: 'year', l: t('statistics.year') },
          ] as const).map(({ k, l }) => (
            <button key={k} onClick={() => setSelectedPeriod(k)}
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
            <h3 className="font-semibold text-sm">{t('statistics.healthIndex')}</h3>
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
          <p className="text-xs text-muted-foreground mt-1">{t('statistics.healthIndexSub')}</p>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-sm">{t('statistics.efficiencyIndex')}</h3>
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
          <p className="text-xs text-muted-foreground mt-1">{t('statistics.efficiencyIndexSub')}</p>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 text-center flex items-center justify-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />{t('statistics.overview')}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            {overviewCards.map(({ label, value, sub, icon: Icon, color }) => (
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
            <CheckSquare className="h-4 w-4 text-amber-400" />{t('statistics.taskStatus')}
          </h3>
          {todoStats.total > 0 ? (
            <div className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: t('statistics.status.completed'), value: todoStats.completed },
                      { name: t('statistics.status.inProgress'), value: todoStats.inProgress },
                      { name: t('statistics.status.pending'), value: todoStats.pending },
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
                  <span className="text-muted-foreground">{t('statistics.completionRate')}</span>
                  <span className="font-bold text-emerald-400">{todoStats.rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${todoStats.rate}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('statistics.status.completed')}</span>
                  <span className="font-medium">{t('statistics.itemsCompleted', { n: todoStats.completed })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('statistics.status.inProgress')}</span>
                  <span className="font-medium">{t('statistics.itemsInProgress', { n: todoStats.inProgress })}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t('statistics.noData')}</p>
          )}
        </GlassCard>

        {/* 日历事件分布 */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />{t('statistics.eventTypes')}
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
            <p className="text-sm text-muted-foreground text-center py-8">{t('statistics.noData')}</p>
          )}
        </GlassCard>
      </div>

      {/* 活动趋势 */}
      <GlassCard>
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t('statistics.recentActivity', { days: periodDaysCount })}
        </h3>
        {hasActivity ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey={seriesFitness} stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
                <Area type="monotone" dataKey={seriesDiet} stackId="1" stroke="#34d399" fill="#34d399" fillOpacity={0.3} />
                <Area type="monotone" dataKey={seriesEfficiency} stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{t('statistics.noActivity')}</p>
        )}
      </GlassCard>

      {/* 健身趋势 */}
      {fitnessTrend.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <GlassCard>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange-400" />{t('statistics.workoutVolume')}
            </h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitnessTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} name={t('statistics.volumeSeries')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {weightTrend.length > 1 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />{t('statistics.weightTrend')}
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
            <Salad className="h-4 w-4 text-emerald-400" />{t('statistics.nutritionToday')}
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
                  <span className="text-muted-foreground">{t('diet.calories')}</span>
                  <span className="font-medium">{t('statistics.calorieTarget', { current: dietStats.totalCal, target: 2000 })}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, (dietStats.totalCal / 2000) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t('diet.protein')}</span>
                  <span className="font-medium">{t('statistics.proteinTarget', { current: Math.round(dietStats.totalProtein), target: 120 })}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, (dietStats.totalProtein / 120) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t('diet.water')}</span>
                  <span className="font-medium">{t('statistics.waterTarget', { current: dietStats.totalWater, target: 2000 })}</span>
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
