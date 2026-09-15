import { useState, useEffect } from 'react'
import { useDietStore } from '../viewmodels/diet.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Salad, Coffee, Sun, Moon, Cookie, Droplets, Plus, Trash2 } from 'lucide-react'
import { cn } from '@lib/utils'
import { useI18n } from '@core/i18n'
import type { TranslationKey } from '@core/i18n/types'

/** 餐次图标与文案键（图标与语言无关，单独放） */
const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
} as const

const MEAL_KEYS: Record<string, TranslationKey> = {
  breakfast: 'diet.meals.breakfast',
  lunch: 'diet.meals.lunch',
  dinner: 'diet.meals.dinner',
  snack: 'diet.meals.snack',
}

export default function DietPage() {
  const { t } = useI18n()
  const { meals, waters, summary, loaded, loadFromDb, addMeal, removeMeal, addWater } = useDietStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'breakfast', name: '', calories: 0, protein: 0, fat: 0, carbs: 0 })

  useEffect(() => {
    if (!loaded) loadFromDb(today)
  }, [loaded, loadFromDb])

  // 自动估算热量：蛋白×4 + 脂肪×9 + 碳水×4
  const computedCalories = Math.round(form.protein * 4 + form.fat * 9 + form.carbs * 4)

  const handleAdd = () => {
    if (!form.name) return
    addMeal({
      type: form.type, name: form.name,
      calories: computedCalories, protein: form.protein,
      fat: form.fat, carbs: form.carbs,
      date: today,
    })
    setForm({ type: 'breakfast', name: '', calories: 0, protein: 0, fat: 0, carbs: 0 })
  }

  // 兼容旧数据格式
  const getMealName = (m: any) => m.food_name || m.name
  const getMealType = (m: any) => m.meal_type || m.type
  const getMealCal = (m: any) => m.calories ?? m.cal ?? 0
  const getMealTime = (m: any) => m.meal_time || m.time || ''

  const macroCards = [
    { label: t('diet.calories'), value: `${summary.total_calories || 0}`, unit: 'kcal', color: 'text-orange-400', target: 2000 },
    { label: t('diet.protein'), value: `${Number(summary.total_protein || 0).toFixed(0)}`, unit: 'g', color: 'text-red-400', target: 120 },
    { label: t('diet.fat'), value: `${Number(summary.total_fat || 0).toFixed(0)}`, unit: 'g', color: 'text-amber-400', target: 65 },
    { label: t('diet.carbs'), value: `${Number(summary.total_carbs || 0).toFixed(0)}`, unit: 'g', color: 'text-sky-400', target: 250 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">🥗 {t('diet.title')}</h1>

      {/* 今日摘要 */}
      <div className="grid grid-cols-4 gap-3">
        {macroCards.map(({ label, value, unit, color, target }) => (
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
          <h3 className="font-semibold text-sm mb-3">➕ {t('diet.recordMeal')}</h3>
          <div className="space-y-2">
            <div className="flex gap-1 flex-wrap">
              {Object.entries(MEAL_ICONS).map(([k, Icon]) => (
                <button key={k} onClick={() => setForm({ ...form, type: k })}
                  className={cn('flex items-center gap-1 rounded-lg border px-2 py-1 text-xs',
                    form.type === k ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>
                  <Icon className="h-3 w-3" />{t(MEAL_KEYS[k])}
                </button>
              ))}
            </div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('diet.foodName')} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <div className="grid grid-cols-3 gap-1">
              <Input type="number" value={form.protein || ''} onChange={(e) => setForm({ ...form, protein: +e.target.value })}
                placeholder={t('diet.proteinG')} />
              <Input type="number" value={form.fat || ''} onChange={(e) => setForm({ ...form, fat: +e.target.value })}
                placeholder={t('diet.fatG')} />
              <Input type="number" value={form.carbs || ''} onChange={(e) => setForm({ ...form, carbs: +e.target.value })}
                placeholder={t('diet.carbsG')} />
            </div>
            <div className="text-xs text-muted-foreground">
              {t('diet.autoCalories', { kcal: computedCalories })}
            </div>
            <Button size="sm" className="w-full gap-1" onClick={handleAdd}><Plus className="h-3.5 w-3.5" />{t('diet.record')}</Button>
          </div>
        </GlassCard>

        {/* 饮水 */}
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Droplets className="h-4 w-4 text-sky-400" />{t('diet.water')}</h3>
          <div className="text-center mb-3">
            <p className="text-3xl font-bold text-sky-400">{summary.total_water || 0}</p>
            <p className="text-xs text-muted-foreground">{t('diet.waterTargetUnit', { target: 2000 })}</p>
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
          <h3 className="font-semibold text-sm mb-3">{t('diet.todayLog')}</h3>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
            const typeMeals = meals.filter(m => getMealType(m) === type)
            if (typeMeals.length === 0) return null
            const Icon = MEAL_ICONS[type]
            return (
              <div key={type} className="mb-3 last:mb-0">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">{t(MEAL_KEYS[type])}</p>
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
