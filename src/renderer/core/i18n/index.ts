/**
 * i18n —— 翻译与语言切换
 *
 * 设计取舍见 language.ts 的说明。这里只做三件事：
 * 1. 把 `'a.b.c'` 形式的键解析成当前语言的字符串；
 * 2. 支持 `{name}` 形式的占位符插值；
 * 3. 提供一个订阅式 store，让切换语言即时重渲染。
 *
 * 没有做复数/性别规则：当前两种语言下这属于过度设计，
 * 但接口留了插值，需要时可在翻译函数内部扩展。
 */

import { useSyncExternalStore } from 'react'
import { zh } from './locales/zh'
import { en } from './locales/en'
import type { TranslationKey } from './types'
import { detectLanguage, persistLanguage, type Language } from './language'

const DICTIONARIES = { zh, en }

let current: Language = detectLanguage()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getLanguage(): Language {
  return current
}

export function setLanguage(language: Language): void {
  if (language === current) return
  current = language
  persistLanguage(language)
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * 订阅语言变化（返回取消订阅函数）。
 * 供 React 之外的地方使用；组件内用 `useI18n()` 更省事。
 */
export const subscribeLanguage = subscribe

/** 按路径取字典中的值 */
function lookup(language: Language, key: string): string | undefined {
  const segments = key.split('.')
  let node: unknown = DICTIONARIES[language]
  for (const segment of segments) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return typeof node === 'string' ? node : undefined
}

export interface TranslateOptions {
  /** 占位符替换，如 t('x', { n: 3 }) 对应文案里的 {n} */
  [name: string]: string | number
}

/**
 * 翻译。
 *
 * 若当前语言缺这个键（正常不该发生，因为类型已约束），
 * 回退到中文，再回退到键名本身 —— 绝不返回空字符串导致界面出现空洞。
 */
export function translate(
  language: Language,
  key: TranslationKey,
  options?: TranslateOptions,
): string {
  const raw = lookup(language, key) ?? lookup('zh', key) ?? key
  if (!options) return raw

  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = options[name]
    return value === undefined ? match : String(value)
  })
}

/**
 * React 绑定。
 *
 * 用 `useSyncExternalStore` 订阅语言变化：切换语言会重渲染所有使用方，
 * 不需要手动传递 context，也不会因为父组件未重渲染而漏更新。
 */
export function useI18n() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage)
  return {
    language,
    /** 翻译函数；键名受类型约束 */
    t: (key: TranslationKey, options?: TranslateOptions) => translate(language, key, options),
  }
}

/** 非组件环境（如 store、工具函数）里取当前语言的翻译 */
export function t(key: TranslationKey, options?: TranslateOptions): string {
  return translate(current, key, options)
}
