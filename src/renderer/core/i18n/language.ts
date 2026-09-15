/**
 * 界面语言
 *
 * 为什么自己实现而不用 i18next 之类：这里是「两种语言 + 少量文案」的场景，
 * 引入运行时库要付出体积和一层间接，收益不大。更重要的是，把文案键做成
 * **从字典推导的类型**，写错键名会在 tsc 阶段直接报错，而不是运行时静默
 * 显示成键名 —— 这是自研方案在这个规模下真正的优势。
 *
 * 用法见 locales/ 目录与 `useI18n()`。
 */

export type Language = 'zh' | 'en'

export const LANGUAGES: ReadonlyArray<{ id: Language; label: string }> = [
  { id: 'zh', label: '简体中文' },
  { id: 'en', label: 'English' },
]

export const DEFAULT_LANGUAGE: Language = 'zh'

const STORAGE_KEY = 'near-language'

/** 浏览器语言是否更偏好英文 */
function prefersEnglish(): boolean {
  if (typeof navigator === 'undefined') return false
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
  return langs.some((l) => l?.toLowerCase().startsWith('en'))
}

/**
 * 判定初始语言：
 * 1. 用户显式选过的（localStorage）优先；
 * 2. 否则跟随浏览器语言。
 */
export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* 隐私模式下 localStorage 不可用，继续按浏览器语言判断 */
  }
  return prefersEnglish() ? 'en' : DEFAULT_LANGUAGE
}

export function persistLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    /* 忽略：不影响本次会话内的切换 */
  }
}

/** 当前语言对应的 date-fns locale 名称，供日期格式化使用 */
export function dateLocaleName(language: Language): 'zhCN' | 'enUS' {
  return language === 'zh' ? 'zhCN' : 'enUS'
}
