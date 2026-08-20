import { useState, useEffect } from 'react'
import { useDietStore } from '../viewmodels/diet.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Salad, Coffee, Sun, Moon, Cookie, Droplets, Plus, Trash2, PieChart } from 'lucide-react'
import { cn } from '@lib/utils'

const MEAL_TYPES: Record<string, { label: string; icon: typeof Salad }> = {
  breakfast: { label: '早餐', icon: Coffee },
  lunch: { label: '午餐', icon: Sun },
  dinner: { label: '晚餐', icon: Moon },
  snack: { label: '零食', icon: Cookie },
}

export default function DietPage() {
  const { meals, waters, summary, loaded, loadFromDb, addMeal, removeMeal, addWater } = useDietStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'breakfast', name: '', calories: 0, protein: 0, fat: 0, carbs: 0 })

  useEffect(() => {
    if (!loaded) loadFromDb(today)
  }, [loaded, loadFromDb])

  const handleAdd = () => {
    if (!form.name) return
    addMeal({
      type: form.type, name: form.name,
      calories: form.calories, protein: form.protein,
      fat: form.fat, carbs: form.carbs,
      date: today,
    })
    setForm({ type: 'breakfast', name: '', calories: 0, protein: 0, fat: 0, carbs: 0 })
  }

  // 兼容旧数据格式
  const getMealName = (m: any) => m.food_name || m.name
  const getMealType = (m: any) => m.meal_type || m.type
  const getMealCal = (m: any) => m.calories ?? m.cal ?? 0
  const getMealProtein = (m: any) => m.protein_g ?? m.protein ?? 0
  const getMealFat = (m: any) => m.fat_g ?? m.fat ?? 0
  const getMealCarbs = (m: any) => m.carbs_g ?? m.carbs ?? 0
  const getMealTime = (m: any) => m.meal_time || m.time || ''

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">🥗 饮食计划</h1>

      {/* 今日摘要 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '热量', value: `${summary.total_calories || 0}`, unit: 'kcal', color: 'text-orange-400', target: 2000 },
          { label: '蛋白质', value: `${Number(summary.total_protein || 0).toFixed(0)}`, unit: 'g', color: 'text-red-400', target: 120 },
          { label: '脂肪', value: `${Number(summary.total_fat || 0).toFixed(0)}`, unit: 'g', color: 'text-amber-400', target: 65 },
          { label: '碳水', value: `${Number(summary.total_carbs || 0).toFixed(0)}`, unit: 'g', color: 'text-sky-400', target: 250 },
        ].map(({ label, value, unit, color, target }) => (
          <GlassCard key={label} className="text-center">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-[10px] text-muted-foreground">/ {target} {unit}</p>
            {/* 进度条 */}
            <div className="mx-auto mt-1.5 h-1 w-full max-w-[60px] rounded-full bg-muted/50 overflow-hidden">
              <div className={cn('h-full rounded-full', color.replace('text', 'bg'))}
                style={{ width: `${Math.min(100, (Number(value) / target) * 100)}%` }} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 添加饮食 */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3">➕ 记录饮食</h3>
          <div className="space-y-2">
            <div className="flex gap-1 flex-wrap">
              {Object.entries(MEAL_TYPES).map(([k, { label, icon: Icon }]) => (
                <button key={k} onClick={() => setForm({ ...form, type: k })}
                  className={cn('flex items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                    form.type === k ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>
                  <Icon className="h-3 w-3" />{label}
                </button>
              ))}
            </div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="食物名称" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <div className="grid grid-cols-4 gap-1">
              <Input type="number" value={form.calories || ''} onChange={(e) => setForm({ ...form, calories: +e.target.value })}
                placeholder="热量(kcal)" />
              <Input type="number" value={form.protein || ''} onChange={(e) => setForm({ ...form, protein: +e.target.value })}
                placeholder="蛋白质(g)" />
              <Input type="number" value={form.fat || ''} onChange={(e) => setForm({ ...form, fat: +e.target.value })}
                placeholder="脂肪(g)" />
              <Input type="number" value={form.carbs || ''} onChange={(e) => setForm({ ...form, carbs: +e.target.value })}
                placeholder="碳水(g)" />
            </div>
            <Button size="sm" className="w-full gap-1" onClick={handleAdd}><Plus className="h-3.5 w-3.5" />记录</Button>
          </div>
        </GlassCard>

        {/* 饮水 */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-400" />饮水记录</h3>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold text-sky-400">{summary.total_water || 0}</p>
            <p className="text-xs text-muted-foreground">ml / 2000ml</p>
            <div className="mx-auto mt-2 h-2 w-full rounded-full bg-muted/50 overflow-hidden">
              <div className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${Math.min(100, ((summary.total_water || 0) / 2000) * 100)}%` }} />
            </div>
          </div>
          <div className="flex gap-1">
            {[100, 200, 300, 500].map((a) => (
              <Button key={a} variant="outline" size="sm" className="flex-1" onClick={() => addWater(a)}>+{a}ml</Button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 今日饮食列表 */}
      {meals.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3">📋 今日记录</h3>
          {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
            const typeMeals = meals.filter(m => getMealType(m) === type)
            if (typeMeals.length === 0) return null
            const Icon = MEAL_TYPES[type]?.icon || Salad
            return (
              <div key={type} className="mb-3 last:mb-0">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{MEAL_TYPES[type]?.label}</p>
                <div className="space-y-1">
                  {typeMeals.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getMealName(m)}</span>
                      <span className="text-muted-foreground">{getMealCal(m)}kcal</span>
                      <span className="text-xs text-muted-foreground ml-auto">{getMealTime(m)}</span>
                      <button onClick={() => removeMeal(m.id)} className="text-muted-foreground/40 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </GlassCard>
      )}
    </div>
  )
}
