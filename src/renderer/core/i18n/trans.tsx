/**
 * 带内嵌元素的翻译
 *
 * 有些文案中间要插一个链接或加粗片段，例如：
 *   中文：在 <a>platform.deepseek.com</a> 获取 API Key
 *   英文：Get an API key at <a>platform.deepseek.com</a>
 *
 * 「前后拼接」的做法在语序不同的语言里必然出错（中文把链接放在句首，
 * 英文放在句尾），所以这里让文案自带 `{name}` 占位符，由调用方提供对应的节点。
 *
 * 用法：
 *   <Trans k="settings.getKeyAt" link={<a href="...">platform.deepseek.com</a>} />
 * 对应文案：getKeyAt: '在 {link} 获取 API Key'
 */

import { Fragment, type ReactNode } from 'react'
import { useI18n } from './index'
import type { TranslationKey } from './types'

interface TransProps {
  k: TranslationKey
  /** 占位符名 -> 节点；字符串占位符也可用 values */
  [name: string]: ReactNode | TranslationKey
}

export function Trans({ k, ...slots }: TransProps) {
  const { t } = useI18n()
  // 先取到带占位符的原文（不给插值，保留 {name} 形式），再按占位符切分
  const template = t(k)
  const parts = template.split(/(\{\w+\})/g)

  return (
    <>
      {parts.map((part, index) => {
        const match = /^\{(\w+)\}$/.exec(part)
        if (!match) return <Fragment key={index}>{part}</Fragment>
        const name = match[1]
        const slot = slots[name]
        return <Fragment key={index}>{slot === undefined ? part : (slot as ReactNode)}</Fragment>
      })}
    </>
  )
}
