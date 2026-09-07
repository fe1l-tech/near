import { type ReactNode } from 'react'
import { TooltipProvider } from '@components/ui/tooltip'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // 默认使用亮色樱花主题（不添加 dark class）
  return <TooltipProvider delay={200}>{children}</TooltipProvider>
}
