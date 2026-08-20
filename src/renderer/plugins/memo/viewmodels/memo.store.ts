import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ipc } from '@core/ipc/ipc-client'
import type { Memo } from '../models/memo.model'
import { createMemo } from '../models/memo.model'

interface MemoState {
  memos: Memo[]
  selectedId: string | null
  searchQuery: string
  selectedTag: string | null
  loaded: boolean

  loadFromDb: () => Promise<void>

  // Actions
  create: (title?: string) => Promise<Memo>
  update: (id: string, updates: Partial<Memo>) => Promise<void>
  delete: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>

  select: (id: string | null) => void
  setSearch: (query: string) => void
  setSelectedTag: (tag: string | null) => void

  // Getters (computed via selector)
  getAllTags: () => string[]
  getFiltered: () => Memo[]
  getSelected: () => Memo | null
}

/** 将 tags 数组转为逗号分隔字符串存入 DB，取出时还原 */
function tagsToString(tags: string[]): string { return tags.join(',') }
function stringToTags(s: string | null): string[] {
  if (!s) return []
  return s.split(',').map(t => t.trim()).filter(Boolean)
}

export const useMemoStore = create<MemoState>()(
  persist(
    (set, get) => ({
      memos: [],
      selectedId: null,
      searchQuery: '',
      selectedTag: null,
      loaded: false,

      loadFromDb: async () => {
        try {
          const result = await ipc.memo.getAll()
          const dbMemos = Array.isArray(result) ? result : (result as any)?.data || []
          if (dbMemos.length > 0) {
            // 将 DB 格式转为前端格式
            const memos = dbMemos.map((m: any) => ({
              ...m,
              tags: Array.isArray(m.tags) ? m.tags : stringToTags(m.tags),
            })) as Memo[]
            set({ memos, loaded: true })
          } else {
            set({ loaded: true })
          }
        } catch {
          set({ loaded: true })
        }
      },

      create: async (title) => {
        const memo = createMemo({ title })
        set((s) => ({ memos: [memo, ...s.memos], selectedId: memo.id }))
        // 同步到 SQLite（传入前端生成的 id，保证后续 update 能匹配到同一条记录）
        try {
          await ipc.memo.create({
            id: memo.id,
            title: memo.title,
            content: memo.content,
            excerpt: memo.excerpt,
            tags: tagsToString(memo.tags),
          })
        } catch { /* 降级 */ }
        return memo
      },

      update: async (id, updates) => {
        set((s) => ({
          memos: s.memos.map((m) =>
            m.id === id
              ? { ...m, ...updates, updatedAt: new Date().toISOString(), excerpt: (updates.content || m.content).slice(0, 200) }
              : m,
          ),
        }))
        // 同步到 SQLite
        try {
          const memo = get().memos.find(m => m.id === id)
          await ipc.memo.update(id, {
            title: updates.title,
            content: updates.content,
            tags: updates.tags ? tagsToString(updates.tags) : undefined,
            isFavorite: updates.isFavorite,
            isPinned: updates.isPinned,
            isArchived: updates.isArchived,
          })
          // 保存版本快照
          if (updates.content && memo) {
            const newVersion = (memo.version || 0) + 1
            try {
              await ipc.memo.saveVersion(id, updates.content, newVersion)
            } catch { /* 版本保存失败不阻塞 */ }
          }
        } catch { /* 降级 */ }
      },

      delete: async (id) => {
        set((s) => ({
          memos: s.memos.filter((m) => m.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        }))
        try {
          await ipc.memo.delete(id)
        } catch { /* 降级 */ }
      },

      toggleFavorite: async (id) => {
        const memo = get().memos.find(m => m.id === id)
        if (!memo) return
        const newVal = !memo.isFavorite
        set((s) => ({
          memos: s.memos.map((m) => (m.id === id ? { ...m, isFavorite: newVal } : m)),
        }))
        try { await ipc.memo.update(id, { isFavorite: newVal }) } catch { /* 降级 */ }
      },

      togglePin: async (id) => {
        const memo = get().memos.find(m => m.id === id)
        if (!memo) return
        const newVal = !memo.isPinned
        set((s) => ({
          memos: s.memos.map((m) => (m.id === id ? { ...m, isPinned: newVal } : m)),
        }))
        try { await ipc.memo.update(id, { isPinned: newVal }) } catch { /* 降级 */ }
      },

      select: (id) => set({ selectedId: id }),
      setSearch: (query) => set({ searchQuery: query }),
      setSelectedTag: (tag) => set({ selectedTag: tag }),

      getAllTags: () => {
        const tagSet = new Set<string>()
        get().memos.forEach((m) => m.tags.forEach((t) => tagSet.add(t)))
        return Array.from(tagSet).sort()
      },

      getFiltered: () => {
        const { memos, searchQuery, selectedTag } = get()
        let result = memos

        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          result = result.filter(
            (m) =>
              m.title.toLowerCase().includes(q) ||
              m.content.toLowerCase().includes(q) ||
              m.tags.some((t) => t.toLowerCase().includes(q)),
          )
        }

        if (selectedTag) {
          result = result.filter((m) => m.tags.includes(selectedTag))
        }

        // 排序：置顶优先，然后按更新时间
        return result.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
      },

      getSelected: () => {
        const { memos, selectedId } = get()
        return memos.find((m) => m.id === selectedId) || null
      },
    }),
    {
      name: 'ai-workspace-memos',
      partialize: (state) => ({ memos: state.memos }),
    },
  ),
)
