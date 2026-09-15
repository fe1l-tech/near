/**
 * i18n 层测试
 *
 * 翻译是现在最容易被"顺手改坏"的地方：改一个键名、少一条文案，
 * 或者把语言切换的通知链断开，界面就会出现原始键名或卡在旧语言。
 * 这里把几个关键不变量钉住。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { zh } from '@core/i18n/locales/zh'
import { en } from '@core/i18n/locales/en'

/** 递归收集字典里的所有叶子键路径 */
function leafKeys(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix]
  if (typeof node !== 'object' || node === null) return []
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  )
}

describe('i18n 字典结构', () => {
  it('英文与中文的键集合完全一致（少一条即视为漏翻）', () => {
    const zhKeys = leafKeys(zh).sort()
    const enKeys = leafKeys(en).sort()

    const missingInEn = zhKeys.filter((k) => !enKeys.includes(k))
    const extraInEn = enKeys.filter((k) => !zhKeys.includes(k))

    // 断言时把差异打印出来，便于直接定位
    expect(missingInEn, `英文缺少这些键: ${missingInEn.join(', ')}`).toEqual([])
    expect(extraInEn, `英文多出这些键: ${extraInEn.join(', ')}`).toEqual([])
  })

  it('没有任何空文案（空字符串会在界面上留出空洞）', () => {
    const blanks: string[] = []
    const walk = (node: unknown, dict: string, prefix = '') => {
      if (typeof node === 'string') {
        if (node.trim() === '') blanks.push(`${dict}:${prefix}`)
        return
      }
      if (typeof node !== 'object' || node === null) return
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        walk(value, dict, prefix ? `${prefix}.${key}` : key)
      }
    }
    walk(zh, 'zh')
    walk(en, 'en')
    expect(blanks, `空文案: ${blanks.join(', ')}`).toEqual([])
  })

  it('两种语言的占位符用法一致（避免插值在某一语言里失效）', () => {
    const placeholders = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(',')
    const mismatches: string[] = []

    const walk = (zhNode: unknown, enNode: unknown, prefix = '') => {
      if (typeof zhNode === 'string' && typeof enNode === 'string') {
        if (placeholders(zhNode) !== placeholders(enNode)) {
          mismatches.push(`${prefix}: zh="${placeholders(zhNode)}" en="${placeholders(enNode)}"`)
        }
        return
      }
      if (typeof zhNode !== 'object' || zhNode === null) return
      for (const key of Object.keys(zhNode as Record<string, unknown>)) {
        walk(
          (zhNode as Record<string, unknown>)[key],
          (enNode as Record<string, unknown> | undefined)?.[key],
          prefix ? `${prefix}.${key}` : key,
        )
      }
    }
    walk(zh, en)
    expect(mismatches, `占位符不一致: ${mismatches.join(' | ')}`).toEqual([])
  })
})

describe('翻译函数行为', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('按当前语言返回对应文案', async () => {
    const i18n = await import('@core/i18n')

    i18n.setLanguage('zh')
    expect(i18n.t('nav.home')).toBe('首页')

    i18n.setLanguage('en')
    expect(i18n.t('nav.home')).toBe('Home')
  })

  it('支持 {name} 占位符插值', async () => {
    const i18n = await import('@core/i18n')

    i18n.setLanguage('zh')
    expect(i18n.t('dashboard.completionRate', { rate: 33 })).toBe('完成率 33%')

    i18n.setLanguage('en')
    expect(i18n.t('dashboard.completionRate', { rate: 33 })).toBe('33% complete')
  })

  it('未提供的占位符保持原样，不会渲染成 undefined', async () => {
    const i18n = await import('@core/i18n')
    i18n.setLanguage('en')
    const text = i18n.t('statistics.itemsCompleted')
    expect(text).not.toContain('undefined')
    expect(text).toContain('{n}')
  })

  it('切换语言会通知订阅者（切换器依赖这条链）', async () => {
    const i18n = await import('@core/i18n')
    i18n.setLanguage('zh')

    const listener = vi.fn()
    const unsubscribe = i18n.subscribeLanguage(listener)

    i18n.setLanguage('en')
    expect(listener).toHaveBeenCalledTimes(1)

    // 切到同一语言不应重复通知
    i18n.setLanguage('en')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    i18n.setLanguage('zh')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('语言选择会持久化，供下次启动恢复', async () => {
    const i18n = await import('@core/i18n')
    // 先切到与初始值不同的语言，确保真的发生变更
    // （setLanguage 对同值会提前返回，不重复写盘）
    i18n.setLanguage('zh')
    i18n.setLanguage('en')
    expect(localStorage.getItem('near-language')).toBe('en')

    i18n.setLanguage('zh')
    expect(localStorage.getItem('near-language')).toBe('zh')
  })

  it('启动时读取已保存的语言偏好', async () => {
    localStorage.setItem('near-language', 'en')
    const i18n = await import('@core/i18n')
    expect(i18n.getLanguage()).toBe('en')
    expect(i18n.t('nav.home')).toBe('Home')
  })
})
