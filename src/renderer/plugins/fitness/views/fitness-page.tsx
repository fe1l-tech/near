import { useState, useEffect } from 'react'
import { useFitnessStore } from '../viewmodels/fitness.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Dumbbell, Plus, Trash2, TrendingUp, Target, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts'

const EXERCISES = ['卧推', '深蹲', '硬拉', '引体向上', '俯卧撑', '跑步', '划船', '肩推']

export default function FitnessPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">💪 健身计划</h1>
        <div className="flex rounded-lg bg-muted/50 p-0.5">
          {[{ k: 'log', l: '训练记录' }, { k: 'body', l: '身体数据' }, { k: 'plan', l: '训练计划' }].map(({ k, l }) => (
            <button key={k} onClick={() => setActiveTab(k as typeof activeTab)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${activeTab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 训练记录 */}
      {activeTab === 'log' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Dumbbell className="h-4 w-4 text-orange-400" />记录训练</h3>
              <div className="space-y-2">
                <select value={form.exercise} onChange={(e) => setForm({ ...form, exercise: e.target.value })}
                  className="w-full rounded-lg border border-border/40 bg-input/50 px-3 py-2 text-sm">
                  {EXERCISES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-muted-foreground">组数</label><Input type="number" value={form.sets} onChange={(e) => setForm({ ...form, sets: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">次数</label><Input type="number" value={form.reps} onChange={(e) => setForm({ ...form, reps: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">重量(kg)</label><Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: +e.target.value })} /></div>
                </div>
                <Button size="sm" className="w-full gap-1" onClick={handleAddLog}>
                  <Plus className="h-3.5 w-3.5" />记录
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />今日统计</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">训练次数</p>
                  <p className="text-2xl font-bold text-foreground">{logs.filter(l => (l.log_date || l.date) === new Date().toISOString().split('T')[0]).length}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">总容量</p>
                  <p className="text-2xl font-bold text-orange-400">{logs.filter(l => (l.log_date || l.date) === new Date().toISOString().split('T')[0]).reduce((s, l) => s + (l.sets_completed || l.sets || 0) * Number(l.reps_per_set || l.reps || 0) * Number(l.weight_per_set || l.weight || 0), 0)}kg</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {logs.length > 0 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-orange-400" />训练量趋势</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d4dc" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Bar dataKey="volume" fill="#f97316" radius={[4, 4, 0, 0]} name="训练容量" />
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
              <h3 className="font-semibold text-sm mb-3">📊 记录身体数据</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-muted-foreground">体重(kg)</label><Input type="number" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: +e.target.value })} /></div>
                  <div><label className="text-[10px] text-muted-foreground">身高(cm)</label><Input type="number" value={weightForm.height} onChange={(e) => setWeightForm({ ...weightForm, height: +e.target.value })} /></div>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <span className="text-xs text-muted-foreground">BMI</span>
                  <p className="text-2xl font-bold text-primary">{bmi}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '偏胖' : '肥胖'}
                  </p>
                </div>
                <Button size="sm" className="w-full gap-1" onClick={handleAddStat}>
                  记录身体数据
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />健康指标</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/10">
                  <span className="text-muted-foreground">理想体重</span>
                  <span className="font-medium">{(weightForm.height - 100) * 0.9} kg</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/10">
                  <span className="text-muted-foreground">基础代谢</span>
                  <span className="font-medium">{Math.round(weightForm.weight * 22)} kcal/天</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">记录次数</span>
                  <span className="font-medium">{stats.length} 次</span>
                </div>
              </div>
            </GlassCard>
          </div>

          {weightChart.length > 1 && (
            <GlassCard>
              <h3 className="font-semibold text-sm mb-3">📉 体重变化趋势</h3>
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
            <h3 className="font-semibold text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />我的计划</h3>
            <Button size="sm" variant="outline" className="gap-1"
              onClick={() => addPlan({ name: '新计划', exercises: '[]' })}>
              <Plus className="h-3.5 w-3.5" />新建
            </Button>
          </div>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">还没有训练计划，点击新建创建一个</p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl bg-muted/20 px-4 py-3 space-y-2">
                  {editingPlanId === plan.id ? (
                    <div className="space-y-2">
                      <Input value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} placeholder="计划名称" />
                      <Input value={editPlanDesc} onChange={(e) => setEditPlanDesc(e.target.value)} placeholder="描述(选填)" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditPlan}>保存</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingPlanId(null)}>取消</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{plan.name}</p>
                        {plan.description && <p className="text-xs text-muted-foreground truncate">{plan.description}</p>}
                      </div>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${plan.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {plan.is_active ? '进行中' : '停用'}
                      </span>
                    </div>
                  )}
                  {editingPlanId !== plan.id && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePlanActive(plan)} className="rounded-lg px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">
                        {plan.is_active ? '停用' : '开始'}
                      </button>
                      <button onClick={() => startEditPlan(plan)} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary" title="编辑">
                        ✏️
                      </button>
                      <button onClick={() => deletePlan(plan.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400" title="删除">
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
          <h3 className="text-sm font-semibold text-foreground mb-2">📋 最近训练</h3>
          {logs.slice(0, 8).map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-2 text-sm">
              <span className="font-medium">{l.exercise_name || l.exercise}</span>
              <span className="text-muted-foreground">{l.sets_completed || l.sets}组 × {l.reps_per_set || l.reps}次</span>
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
