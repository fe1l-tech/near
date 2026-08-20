/**
 * 字体系统
 */
export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Microsoft YaHei"',
    '"PingFang SC"',
    'sans-serif',
  ].join(', '),
  mono: [
    '"JetBrains Mono"',
    '"Cascadia Code"',
    '"Fira Code"',
    '"Consolas"',
    'monospace',
  ].join(', '),
  display: [
    '"SF Pro Display"',
    '"Inter"',
    '-apple-system',
    'sans-serif',
  ].join(', '),
} as const

export const fontSize = {
  xs: { size: '11px', lineHeight: '16px', weight: '400' },
  sm: { size: '13px', lineHeight: '20px', weight: '400' },
  base: { size: '14px', lineHeight: '22px', weight: '400' },
  md: { size: '15px', lineHeight: '24px', weight: '500' },
  lg: { size: '17px', lineHeight: '26px', weight: '600' },
  xl: { size: '20px', lineHeight: '28px', weight: '600' },
  '2xl': { size: '24px', lineHeight: '32px', weight: '700' },
  '3xl': { size: '32px', lineHeight: '40px', weight: '700' },
  '4xl': { size: '40px', lineHeight: '48px', weight: '800' },
} as const

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const
