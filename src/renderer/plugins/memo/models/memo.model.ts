export interface Memo {
  id: string
  title: string
  content: string
  excerpt: string
  tags: string[]
  isFavorite: boolean
  isPinned: boolean
  isArchived: boolean
  wordCount: number
  version: number
  createdAt: string
  updatedAt: string
}

export interface MemoVersion {
  id: string
  memoId: string
  content: string
  version: number
  changeNote: string
  createdAt: string
}

export function createMemo(partial?: Partial<Memo>): Memo {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: partial?.title || '未命名笔记',
    content: partial?.content || '',
    excerpt: '',
    tags: partial?.tags || [],
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    wordCount: 0,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}
