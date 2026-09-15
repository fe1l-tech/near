import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CheckSquare,
  Dumbbell,
  Salad,
  StickyNote,
  CloudSun,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Languages,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/tooltip'
import { useI18n, setLanguage } from '@core/i18n'
import { LANGUAGES } from '@core/i18n/language'
import type { TranslationKey } from '@core/i18n/types'

interface NavItem {
  path: string
  labelKey: TranslationKey
  icon: typeof LayoutDashboard
  shortcut?: string
}

const mainNavItems: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: LayoutDashboard, shortcut: 'H' },
  { path: '/chat', labelKey: 'nav.chat', icon: MessageSquare, shortcut: 'L' },
  { path: '/calendar', labelKey: 'nav.calendar', icon: Calendar, shortcut: 'C' },
  { path: '/todo', labelKey: 'nav.todo', icon: CheckSquare, shortcut: 'T' },
  { path: '/fitness', labelKey: 'nav.fitness', icon: Dumbbell },
  { path: '/diet', labelKey: 'nav.diet', icon: Salad },
  { path: '/memo', labelKey: 'nav.memo', icon: StickyNote, shortcut: 'M' },
  { path: '/weather', labelKey: 'nav.weather', icon: CloudSun },
  { path: '/statistics', labelKey: 'nav.statistics', icon: BarChart3 },
]

const bottomNavItems: NavItem[] = [{ path: '/settings', labelKey: 'nav.settings', icon: Settings }]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { t, language } = useI18n()

  /** 侧栏底部的一键切换：在支持的语言之间轮换 */
  const cycleLanguage = () => {
    const index = LANGUAGES.findIndex((l) => l.id === language)
    const next = LANGUAGES[(index + 1) % LANGUAGES.length]
    setLanguage(next.id)
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.4, 1] }}
      className="relative flex h-full flex-col border-r border-border/30 bg-sidebar/60 backdrop-blur-2xl"
    >
      {/* Logo 区域 */}
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-lg">
          🌸
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground"
            >
              near
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-3 pb-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size={collapsed ? 'icon' : 'default'}
                className={cn(
                  'w-full gap-2 border-border/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
                  collapsed && 'h-9 w-9 mx-auto',
                )}
              />
            }
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t('nav.newConversation')}</span>}
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{t('nav.newConversation')}</TooltipContent>}
        </Tooltip>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {mainNavItems.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            label={t(item.labelKey)}
            collapsed={collapsed}
            isActive={location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))}
          />
        ))}
      </nav>

      {/* 底部导航 */}
      <div className="border-t border-border/20 px-2 py-2">
        {bottomNavItems.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            label={t(item.labelKey)}
            collapsed={collapsed}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}
      </div>

      {/* 语言切换 */}
      <div className="border-t border-border/20 px-2 py-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={cycleLanguage}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              />
            }
          >
            <Languages className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">{t('common.language')}</span>
                <span className="text-xs text-muted-foreground/70">
                  {language === 'zh' ? '中' : 'EN'}
                </span>
              </>
            )}
          </TooltipTrigger>
          <TooltipContent side="right">{t('common.languageHint')}</TooltipContent>
        </Tooltip>
      </div>

      {/* 折叠按钮 */}
      <div className="border-t border-border/20 px-2 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  )
}

function SidebarItem({
  item,
  label,
  collapsed,
  isActive,
}: {
  item: NavItem
  label: string
  collapsed: boolean
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <NavLink
            to={item.path}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
              'hover:bg-accent/50',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          />
        }
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {!collapsed && (
          <span className="flex-1 truncate">{label}</span>
        )}
        {!collapsed && item.shortcut && (
          <kbd className="ml-auto hidden rounded-md border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground/60 lg:inline">
            ^ {item.shortcut}
          </kbd>
        )}
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}
