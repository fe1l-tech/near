/**
 * 轻量级事件总线 — 用于模块间解耦通信
 *
 * 使用示例：
 *   eventBus.emit('todo:created', { id: '1', title: 'New' })
 *   eventBus.on('todo:created', (data) => { ... })
 */

type EventHandler<T = unknown> = (data: T) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler)

    // 返回取消订阅函数
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler)
    }
  }

  emit<T = unknown>(event: string, data: T): void {
    this.handlers.get(event)?.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error)
      }
    })
  }

  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.handlers.get(event)?.delete(handler)
    } else {
      this.handlers.delete(event)
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}

/** 全局事件总线实例 */
export const eventBus = new EventBus()
