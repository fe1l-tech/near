/**
 * 文案类型
 *
 * `Translations` 由中文基准字典**递归推导**而来（去掉 `as const` 的字面量收窄，
 * 只保留结构），因此：
 * - 英文字典少一个键 → tsc 报错
 * - 多一个键或拼错键名 → tsc 报错
 * - 层级结构不一致 → tsc 报错
 *
 * 这是自研 i18n 在这个规模下最实在的收益：文案错误在编译期暴露，
 * 而不是运行时静默显示成键名字符串。
 */

import type { zh } from './locales/zh'

/** 把只读字面量结构转成「同结构、值为 string」的类型 */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

/** 字典类型：结构与中文一致，但允许任意字符串值 */
export type Translations = DeepStringify<typeof zh>

/** 递归取出所有叶子键的路径，如 'dashboard.greeting.morning' */
export type TranslationKey = LeafKeys<typeof zh>

type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${LeafKeys<T[K]>}`
      : never
}[keyof T & string]
