import { useState, useEffect } from 'react'
import { GlassCard } from '@components/glass/glass-card'
import { Quote, RefreshCw, Star, BookOpen, Code, Heart, Plus, X } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ipc } from '@core/ipc/ipc-client'
import { cn } from '@lib/utils'

interface QuoteData {
  id?: string
  quote_text: string
  quote_zh?: string
  author: string
  source?: string
  quote_type?: string
}

const TYPE_ICONS: Record<string, typeof Quote> = {
  motivation: Star,
  wisdom: BookOpen,
  tech: Code,
  inspiration: Heart,
}

export default function QuotePage() {
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [allQuotes, setAllQuotes] = useState<QuoteData[]>([])
  const [activeType, setActiveType] = useState<string | null>(null)
  const [form, setForm] = useState({ text: '', zh: '', author: '', source: '', type: 'motivation' })

  const fetchDaily = async () => {
    setLoading(true)
    try {
      const result = await ipc.quotes.getDaily()
      if (result) {
        setQuote(result as QuoteData)
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  const fetchAll = async () => {
    try {
      const result = await ipc.quotes.getQuotes(activeType || undefined)
      const quotes = Array.isArray(result) ? result : (result as any)?.data || []
      setAllQuotes(quotes as QuoteData[])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchDaily()
  }, [])

  useEffect(() => {
    fetchAll()
  }, [activeType])

  const refresh = async () => {
    try {
      const result = await ipc.quotes.getRandom()
      if (result) setQuote(result as QuoteData)
    } catch { /* ignore */ }
  }

  const handleAdd = async () => {
    if (!form.text || !form.author) return
    try {
      await ipc.quotes.addQuote(form)
      setForm({ text: '', zh: '', author: '', source: '', type: 'motivation' })
      setShowAdd(false)
      fetchAll()
    } catch { /* ignore */ }
  }

  const types = [
    { key: null, label: '全部' },
    { key: 'motivation', label: '励志' },
    { key: 'wisdom', label: '智慧' },
    { key: 'tech', label: '技术' },
    { key: 'inspiration', label: '灵感' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">💬 每日语录</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAdd ? '取消' : '添加'}
        </Button>
      </div>

      {/* 添加语录 */}
      {showAdd && (
        <GlassCard>
          <h3 className="font-semibold text-sm mb-3">✍ 添加新语录</h3>
          <div className="space-y-2">
            <Input value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="英文原文" />
            <Input value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })}
              placeholder="中文翻译（可选）" />
            <div className="flex gap-2">
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="作者" className="flex-1" />
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="出处（可选）" className="flex-1" />
            </div>
            <div className="flex gap-2">
              {types.filter(t => t.key).map(({ key, label }) => (
                <button key={key} onClick={() => setForm({ ...form, type: key! })}
                  className={cn('rounded-full border px-3 py-1 text-xs transition-colors',
                    form.type === key ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground')}>
                  {label}
                </button>
              ))}
            </div>
            <Button size="sm" className="w-full gap-1" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />添加
            </Button>
          </div>
        </GlassCard>
      )}

      {/* 今日语录展示 */}
      <div className="flex flex-col items-center">
        <GlassCard glow className="max-w-lg w-full text-center">
          <Quote className="mx-auto h-8 w-8 text-primary/60 mb-4" />
          {loading ? (
            <div className="py-4 text-muted-foreground animate-pulse">加载中...</div>
          ) : quote ? (
            <>
              <blockquote className="text-xl font-serif italic text-foreground leading-relaxed">
                "{quote.quote_text}"
              </blockquote>
              {quote.quote_zh && (
                <p className="mt-4 text-sm text-primary font-medium">{quote.quote_zh}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">— {quote.author}</p>
              {quote.source && (
                <p className="text-xs text-muted-foreground mt-0.5">{quote.source}</p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2">
                {quote.quote_type && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] text-primary">
                    {{ motivation: '🌟 励志', wisdom: '📖 智慧', tech: '💻 技术', inspiration: '💡 灵感' }[quote.quote_type] || quote.quote_type}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">暂无语录数据</p>
          )}
          <Button variant="outline" size="sm" className="mt-6 gap-1" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />换一句
          </Button>
        </GlassCard>
      </div>

      {/* 语录库 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">📚 语录库</h3>
          <div className="flex gap-1">
            {types.map(({ key, label }) => (
              <button key={label} onClick={() => setActiveType(key)}
                className={cn('rounded-full px-2.5 py-0.5 text-xs transition-colors',
                  activeType === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {allQuotes.slice(0, 20).map((q, i) => {
            const Icon = TYPE_ICONS[q.quote_type || ''] || Quote
            return (
              <GlassCard key={q.id || i} padding="sm">
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">"{q.quote_text}"</p>
                    {q.quote_zh && <p className="text-xs text-primary mt-1">{q.quote_zh}</p>}
                    <p className="text-xs text-muted-foreground mt-1">— {q.author}</p>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        {allQuotes.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">暂无收藏的语录</p>
        )}
      </div>
    </div>
  )
}
