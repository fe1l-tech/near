import { useState, useEffect } from 'react'
import { useFitnessStore } from '../viewmodels/fitness.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Dumbbell, Plus, Trash2, TrendingUp, Target, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useI18n } from '@core/i18n'
import type { TranslationKey } from '@core/i18n/types'

/** 内置动作与对应文案键；存库时用中文名以免历史数据对不上 */
const EXERCISES: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: '卧推', labelKey: 'fitness.exercises.bench' },
  { value: '深蹲', labelKey: 'fitness.exercises.squat' },
  { value: '硬拉', labelKey: 'fitness.exercises.deadlift' },
  { value: '引体向上', labelKey: 'fitness.exercises.pullup' },
  { value: '俯卧撑', labelKey: 'fitness.exercises.pushup' },
  { value: '跑步', labelKey: 'fitness.exercises.run' },
  { value: '划船', labelKey: 'fitness.exercises.row' },
  { value: '肩推', labelKey: 'fitness.exercises.press' },
]

/** 动作的中文名 -> 文案键，用于把历史记录里的动作名翻译出来 */
const EXERCISE_LABEL: Record<string, TranslationKey> = Object.fromEntries(
  EXERCISES.map((e) => [e.value, e.labelKey]),
)

export default function FitnessPage() {
  const { t } = useI18n()
  const { logs, stats, plans, loaded, loadFromDb, addLog, removeLog, addStat, addPlan, updatePlan, deletePlan } = useFitnessStore()
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanDesc, setEditPlanDesc] = useState('')

  const startEditPlan = (plan: typeof plans[number]) => {
    setEditingPlanId(plan.id)
    setEditPlanName(plan.name)
    setEditPlanDesc(plan.description || '')
  }
  const saveEditPlan = async () => {
    if (!editingPlanId) return
    await updatePlan(editingPlanId, { name: editPlanName, description: editPlanDesc })
    setEditingPlanId(null)
  }
  const togglePlanActive = (plan: typeof plans[number]) => {
    updatePlan(plan.id, { isActive: !plan.is_active })
  }
  const [form, setForm] = useState({ exercise: '卧推', sets: 3, reps: 10, weight: 20 })
  const [weightForm, setWeightForm] = useState({ weight: 70, height: 175 })
  const [activeTab, setActiveTab] = useState<'log' | 'body' | 'plan'>('log')

  useEffect(() => {
    if (!loaded) loadFromDb()
  }, [loaded, loadFromDb])

  /** 历史数据里可能存着不在内置列表里的动作名，回退显示原文 */
  const exerciseLabel = (name: string | undefined): string => {
    if (!name) return ''
    const key = EXERCISE_LABEL[name]
    return key ? t(key) : name
  }

  const chartData = logs.slice(0, 12).reverse().map((l) => ({
    name: (l.log_date || l.date || '').slice(5),
    weight: Number(l.weight_per_set || l.weight || 0),
    volume: (l.sets_completed || l.sets || 0) * (Number(l.reps_per_set || l.reps || 0)) * Number(l.weight_per_set || l.weight || 0),
  }))

  const weightChart = stats.slice(0, 14).reverse().map((s) => ({
    name: (s.record_date || s.date || '').slice(5),
    kg: s.weight_kg || s.weight || 0,
  }))

  const bmi = weightForm.height > 0 ? +(weightForm.weight / ((weightForm.height / 100) ** 2)).toFixed(1) : 0
  const bmiKey: TranslationKey =
    bmi < 18.5 ? 'fitness.bmiUnderweight' : bmi < 24 ? 'fitness.bmiNormal' : bmi < 28 ? 'fitness.bmiOverweight' : 'fitness.bmiObese'

  const handleAddLog = () => {
    addLog({ ...form, date: new Date().toISOString().split('T')[0] })
  }

  const handleAddStat = () => {
    addStat({
      weight: weightForm.weight,
      height: weightForm.height,
      bmi,
      date: new Date().toISOString().split('T')[0],
    })
  }

  const tabs: Array<{ k: 'log' | 'body' | 'plan'; label: string }> = [
    { k: 'log', label: t('fitness.tabs.logs') },
    { k: 'body', label: t('fitness.tabs.stats') },
    { k: 'plan', label: t('fitness.tabs.plans') },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">💪 {t('fitness.title')}</h1>
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {tabs.map(({ k, label }) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeTab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 训练记录 */}
      {activeTab === 'log' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Dumbbell className="h-4 w-4 text-orange-400" />{t('fitness.logTraining')}</h3>
              <div className="space-y-2">
                <select value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })}
                  className="w-full rounded-lg border border-border/40 bg-input/50 px-3 py-2 text-sm">
                  {EXERCISES.map((e) => <option key={e.value} value={e.value}>{t(e.labelKey)}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-muted-foreground">{t('fitness.sets')}</label><Input type="number" value={form.sets} onChange={(e) => setForm({ ...form, sets: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">{t('fitness.reps')}</label><Input type="number" value={form.reps} onChange={(e) => setForm({ ...form, reps: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">{t('fitness.weight')}</label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })} /></div>
                </div>
                <Button size="sm" className="w-full gap-1" onClick={handleAddLog}>
                  <Plus className="h-3.5 w-3.5" />{t('fitness.record')}
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{t('fitness.todayStats')}</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t('fitness.sessionCount')}</p>
                  <p className="text-2xl font-bold text-foreground">{logs.filter(l => (l.log_date || l.date) === new Date().toISOString().split('T')[0]).length}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{t('fitness.totalVolume')}</p>
                  <p className="text-2xl font-bold text-orange-400">{logs.filter(l => (l.log_date || l.date) === new Date().toISOString().split('T')[0]).reduce((s, l) => s + (l.sets_completed || l.sets || 0) * Number(l.reps_per_set || l.reps || 0) * Number(l.weight_per_set || l.weight || 0), 0)}kg</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {logs.length > 0 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-400" />{t('fitness.volumeTrend')}</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} name={t('fitness.volume')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* 身体数据 */}
      {activeTab === 'body' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3">📊 {t('fitness.recordStat')}</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground">{t('fitness.weightLabel')}</label><Input type="number" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">{t('fitness.heightLabel')}</label><Input type="number" value={weightForm.height} onChange={(e) => setWeightForm({ ...weightForm, height: +e.target.value })} /></div>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <span className="text-xs text-muted-foreground">{t('fitness.bmi')}</span>
                  <p className="text-2xl font-bold text-primary">{bmi}</p>
                  <p className="text-[10px] text-muted-foreground">{t(bmiKey)}</p>
                </div>
                <Button size="sm" className="w-full gap-1" onClick={handleAddStat}>
                  {t('fitness.recordStat')}
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{t('fitness.healthMetrics')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/10">
                  <span className="text-muted-foreground">{t('fitness.idealWeight')}</span>
                  <span className="font-medium">{((weightForm.height - 100) * 0.9).toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/10">
                  <span className="text-muted-foreground">{t('fitness.bmr')}</span>
                  <span className="font-medium">{Math.round(weightForm.weight * 22)} kcal</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">{t('fitness.recordCount')}</span>
                  <span className="font-medium">{t('fitness.times', { n: stats.length })}</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {weightChart.length > 1 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3">{t('fitness.weightTrendTitle')}</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Line type="monotone" dataKey="kg" stroke="#e85d7a" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      {/* 训练计划 */}
      {activeTab === 'plan' && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{t('fitness.myPlans')}</h3>
            <Button size="sm" variant="outline" className="gap-1"
              onClick={() => addPlan({ name: t('fitness.newPlan'), exercises: '[]' })}>
              <Plus className="h-3.5 w-3.5" />{t('fitness.newPlan')}
            </Button>
          </div>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('fitness.emptyPlans')}</p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl bg-muted/20 px-4 py-3 space-y-2">
                  {editingPlanId === plan.id ? (
                    <div className="space-y-2">
                      <Input value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} placeholder={t('fitness.planName')} />
                      <Input value={editPlanDesc} onChange={(e) => setEditPlanDesc(e.target.value)} placeholder={t('fitness.planDesc')} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditPlan}>{t('common.save')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingPlanId(null)}>{t('common.cancel')}</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{plan.name}</p>
                        {plan.description && <p className="text-xs text-muted-foreground truncate">{plan.description}</p>}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {plan.is_active ? t('fitness.active') : t('fitness.inactive')}
                      </span>
                    </div>
                  )}
                  {editingPlanId !== plan.id && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePlanActive(plan)} className="rounded-lg px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">
                        {plan.is_active ? t('fitness.inactive') : t('fitness.start')}
                      </button>
                      <button onClick={() => startEditPlan(plan)} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary" title={t('common.edit')}>
                        ✏️
                      </button>
                      <button onClick={() => deletePlan(plan.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400" title={t('common.delete')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* 最近记录 */}
      {logs.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('fitness.recentWorkouts')}</h3>
          {logs.slice(0, 8).map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-2 text-sm">
              <span className="font-medium">{exerciseLabel(l.exercise_name || l.exercise)}</span>
              <span className="text-muted-foreground">
                {l.sets_completed || l.sets} {t('fitness.setsUnit')} × {l.reps_per_set || l.reps} {t('fitness.repsUnit')}
              </span>
              <span className="font-semibold text-orange-500">{l.weight_per_set || l.weight}kg</span>
              <span className="ml-auto text-xs text-muted-foreground">{l.log_date || l.date}</span>
              <button onClick={() => removeLog(l.id)} className="text-muted-foreground/40 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
