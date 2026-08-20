/**
 * Application 生命周期管理
 * 负责管理应用级别的状态和生命周期事件
 */

export class Application {
  private static instance: Application
  private isQuitting = false

  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application()
    }
    return Application.instance
  }

  get quitting(): boolean {
    return this.isQuitting
  }

  setQuitting(value: boolean): void {
    this.isQuitting = value
  }
}
