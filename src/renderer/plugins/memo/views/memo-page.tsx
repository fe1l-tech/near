import { useState, useEffect } from 'react'
import { useMemoStore } from '../viewmodels/memo.store'
import { GlassCard } from '@components/glass/glass-card'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { ScrollArea } from '@components/ui/scroll-area'
import {
  Plus,
  Search,
  Star,
  Pin,
  Trash2,
  Tag,
  Clock,
  X,
  StickyNote,
  ChevronRight,
  Save,
} from 'lucide-react'
import { cn } from '@lib/utils'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { useI18n } from '@core/i18n'

export default function MemoPage() {
  const { t, language } = useI18n()
  const dateLocale = language === 'zh' ? zhCN : enUS
  const {
    memos,
    selectedId,
    searchQuery,
    selectedTag,
    loaded,
    loadFromDb,
    create,
    update,
    delete: deleteMemo,
    toggleFavorite,
    togglePin,
    select,
    setSearch,
    setSelectedTag,
    getAllTags,
    getFiltered,
    getSelected,
  } = useMemoStore()

  useEffect(() => {
    if (!loaded) loadFromDb()
  }, [loaded, loadFromDb])

  const filtered = getFiltered()
  const allTags = getAllTags()
  const selected = getSelected()

  // 草稿状态：编辑时改写草稿，保存时才同步到 store
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)

  // 切换选中笔记时加载草稿
  useEffect(() => {
    if (selected) {
      setDraftTitle(selected.title)
      setDraftContent(selected.content)
      setDraftTags([...selected.tags])
      setDirty(false)
    }
  }, [selected?.id])

  // 新建
  const handleCreate = () => {
    create(t('memo.placeholderTitle'))
  }

  // 保存草稿到 store
  const handleSave = () => {
    if (!selectedId || !selected) return
    update(selectedId, {
      title: draftTitle,
      content: draftContent,
      tags: draftTags,
      version: selected.version + 1,
    })
    setDirty(false)
  }

  // 标记草稿已变化
  const markDirty = () => {
    if (!dirty) setDirty(true)
  }

  // 如果没有选中，展示列表
  if (!selectedId || !selected) {
    return (
      <div className="flex h-full gap-4">
        {/* 左侧列表 */}
        <div className="w-72 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('memo.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <Button size="icon" variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 标签过滤 */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                    selectedTag === tag
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/20',
                  )}
                >
                  {tag}
                  {selectedTag === tag && <X className="ml-1 inline h-3 w-3" />}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-1 pr-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <StickyNote className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  {searchQuery ? t('memo.noMatch') : t('memo.emptyCreate')}
                </div>
              ) : (
                filtered.map((memo) => (
                  <button
                    key={memo.id}
                    onClick={() => select(memo.id)}
                    className="w-full rounded-xl p-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {memo.isPinned && <Pin className="h-3 w-3 text-primary" />}
                          <span className="text-sm font-medium truncate">{memo.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {memo.excerpt || memo.content || t('memo.emptyContent')}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                          <Clock className="h-3 w-3" />
                          {format(new Date(memo.updatedAt), 'MM/dd HH:mm', { locale: dateLocale })}
                          {memo.tags.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <Tag className="h-3 w-3" />
                              {memo.tags.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧空状态 */}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-6xl">📒</div>
            <p className="text-muted-foreground">{t('memo.selectHint')}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              {t('memo.newMemo')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 编辑器视图
  return (
    <div className="flex h-full gap-4">
      {/* 左侧列表（折叠版） */}
      <div className="w-72 shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => select(null)} className="gap-1 text-muted-foreground">
            {t('memo.back')}
          </Button>
          <Button size="icon" variant="outline" className="ml-auto" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-1 pr-2">
            {filtered.map((memo) => (
              <button
                key={memo.id}
                onClick={() => select(memo.id)}
                className={cn(
                  'w-full rounded-xl p-2.5 text-left text-sm transition-colors',
                  memo.id === selectedId ? 'bg-primary/10' : 'hover:bg-accent/50',
                )}
              >
                <div className="flex items-center gap-1 truncate">
                  {memo.isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  <span className="truncate">{memo.title}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 编辑器 */}
      <GlassCard className="flex flex-1 flex-col" padding="none">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 border-b border-border/30 px-4 py-2">
          <input
            value={draftTitle}
            onChange={(e) => { setDraftTitle(e.target.value); markDirty() }}
            className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/50"
            placeholder={t('memo.titlePlaceholder')}
          />

          <div className="flex items-center gap-1">
            {/* 保存按钮 */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!dirty}
              className="gap-1"
            >
              <Save className="h-3.5 w-3.5" />
              {t('common.save')}
            </Button>

            <button
              onClick={() => toggleFavorite(selected.id)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                selected.isFavorite ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground',
              )}
              title={t('memo.favorites')}
            >
              <Star className={cn('h-4 w-4', selected.isFavorite && 'fill-current')} />
            </button>
            <button
              onClick={() => togglePin(selected.id)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                selected.isPinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              title={t('memo.pinned')}
            >
              <Pin className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(t('memo.deleteConfirm'))) deleteMemo(selected.id)
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 标签输入 */}
        <div className="flex items-center gap-2 border-b border-border/20 px-4 py-1.5">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-1">
            {draftTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {tag}
                <button
                  onClick={() => { setDraftTags((prev) => prev.filter((t) => t !== tag)); markDirty() }}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              placeholder={t('memo.addTag')}
              className="w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const newTag = e.currentTarget.value.trim()
                  setDraftTags((prev) => {
                    if (prev.includes(newTag)) return prev
                    return [...prev, newTag]
                  })
                  markDirty()
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>
          <span className={cn(
            'ml-auto text-[10px]',
            dirty ? 'text-amber-400 font-medium' : 'text-muted-foreground/60',
          )}>
            {t('memo.charCount', { count: draftContent.length, version: selected.version })}
            {dirty && ` · ${t('memo.unsaved')}`}
          </span>
        </div>

        {/* 内容编辑区 */}
        <textarea
          value={draftContent}
          onChange={(e) => { setDraftContent(e.target.value); markDirty() }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault()
              handleSave()
            }
          }}
          placeholder={t('memo.editorPlaceholder')}
          className="flex-1 resize-none bg-transparent px-6 py-4 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40"
        />
      </GlassCard>
    </div>
  )
}
