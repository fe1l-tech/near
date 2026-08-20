import type { ComponentType } from 'react'

/**
 * 插件权限
 */
export type PluginPermission =
  | 'ai:chat'
  | 'ai:tools'
  | 'storage:read'
  | 'storage:write'
  | 'file:read'
  | 'file:write'
  | 'network'
  | 'notification'
  | 'clipboard'

/**
 * 插件上下文 — 插件可以访问的能力
 */
export interface PluginContext {
  /** 事件总线 */
  events: {
    on: (event: string, handler: (data: unknown) => void) => () => void
    emit: (event: string, data: unknown) => void
  }
  /** 导航 */
  navigation: {
    navigate: (path: string) => void
  }
}

/**
 * 导航项配置
 */
export interface PluginNavItem {
  path: string
  label: string
  icon: string
  shortcut?: string
}

/**
 * 插件接口 — 所有插件必须实现
 */
export interface Plugin {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 版本号 */
  version: string
  /** 图标 */
  icon: string
  /** 所需权限 */
  permissions: PluginPermission[]

  /** 注册插件（在应用启动时调用） */
  register(ctx: PluginContext): void

  /** 激活插件 */
  activate(): Promise<void>

  /** 停用插件 */
  deactivate(): Promise<void>

  /** 获取路由配置 */
  getRoutes?(): { path: string; component: ComponentType }[]

  /** 获取导航项 */
  getNavItems?(): PluginNavItem[]

  /** 获取 Dashboard 小组件 */
  getDashboardWidgets?(): { id: string; component: ComponentType; colSpan?: number }[]
}
