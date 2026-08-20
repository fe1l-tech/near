/**
 * 🌸 Sakura Dark Theme — 色彩系统
 *
 * 设计理念：暗夜樱花 — 深暖色背景 + 克制粉色点缀
 * 不是少女粉，而是成熟、优雅、克制的日式美学
 */

export const sakura = {
  50: '#fef5f7',
  100: '#fce8ec',
  200: '#f9d0d9',
  300: '#f4a9b9',
  400: '#ee7d94',
  500: '#e85d7a', // ★ 主强调色
  600: '#c42b4d',
  700: '#9d1f3a',
  800: '#7a1528',
  900: '#570d1a',
  950: '#3a060d',
} as const

export const warm = {
  50: '#faf5f6',
  100: '#f0e4e7',
  200: '#d4c4c8',
  300: '#b8a4a9',
  400: '#8c7a7f',
  500: '#6b585d',
  600: '#544448',
  700: '#3e3034',
  800: '#2d2224',
  900: '#22181a',
  925: '#1a1214',
  950: '#0f0a0b',
} as const

/** 功能色 — 与樱花粉协调 */
export const functional = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#60a5fa',
} as const

/** 模块专属色 */
export const module = {
  diet: '#10b981',     // 翡翠绿
  fitness: '#f97316',  // 珊瑚橙
  calendar: '#a78bfa', // 淡紫
  todo: '#f59e0b',     // 暖琥珀
  memo: '#7dd3fc',     // 天蓝
  weather: '#22d3ee',  // 青蓝
  chat: '#e85d7a',     // 樱花粉（归属核心）
  quote: '#fb7185',    // 玫瑰金
} as const

/** 毛玻璃颜色 */
export const glass = {
  bg: 'rgba(26, 18, 20, 0.70)',
  bgHover: 'rgba(34, 24, 26, 0.75)',
  bgActive: 'rgba(42, 30, 32, 0.80)',
  border: 'rgba(232, 93, 122, 0.06)',
  borderHover: 'rgba(232, 93, 122, 0.10)',
  blur: '20px',
  saturate: '1.5',
} as const
