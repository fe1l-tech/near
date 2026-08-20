import type { Plugin, PluginContext } from './plugin-interface'

/**
 * 插件注册中心 — 管理所有插件的生命周期
 */
class PluginRegistry {
  private plugins = new Map<string, Plugin>()
  private activePlugins = new Set<string>()
  private context: PluginContext | null = null

  /** 设置插件上下文 */
  setContext(ctx: PluginContext): void {
    this.context = ctx
  }

  /** 注册插件 */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered, skipping.`)
      return
    }
    this.plugins.set(plugin.id, plugin)
    console.log(`[PluginRegistry] Registered: ${plugin.id} v${plugin.version}`)
  }

  /** 激活插件 */
  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      console.error(`[PluginRegistry] Plugin "${pluginId}" not found.`)
      return
    }
    if (this.activePlugins.has(pluginId)) return

    if (this.context) {
      plugin.register(this.context)
    }
    await plugin.activate()
    this.activePlugins.add(pluginId)
    console.log(`[PluginRegistry] Activated: ${pluginId}`)
  }

  /** 停用插件 */
  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return
    await plugin.deactivate()
    this.activePlugins.delete(pluginId)
  }

  /** 激活所有已注册插件 */
  async activateAll(): Promise<void> {
    const ids = Array.from(this.plugins.keys())
    await Promise.all(ids.map((id) => this.activate(id)))
  }

  /** 获取插件 */
  get(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  /** 获取所有已注册插件 */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  /** 获取所有已激活插件 */
  getActive(): Plugin[] {
    return this.getAll().filter((p) => this.activePlugins.has(p.id))
  }
}

/** 全局插件注册中心实例 */
export const pluginRegistry = new PluginRegistry()
