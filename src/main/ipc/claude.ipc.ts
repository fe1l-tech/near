/**
 * Claude Code IPC 处理
 * 通道: claude:send, claude:stop, claude:get-sessions, claude:delete-session, claude:check-availability
 */
import { handle } from './index'
import { claudeManager } from '../services/claude-manager'
import { BrowserWindow, app } from 'electron'

export function registerClaudeIpc(): void {
  // 初始化主窗口引用
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    claudeManager.setMainWindow(mainWindow)
  }

  // 退出前清理所有活跃的 claude 子进程。
  // 不做这件事就会在应用关闭后残留 claude.exe —— 它们还占着会话与内存，
  // 而用户以为已经退出了。放在这里而不是主进程入口，是因为清理的对象
  // 由本模块负责创建，谁创建谁负责回收。
  app.on('before-quit', () => {
    claudeManager.killAll()
  })

  // ── claude:check-availability ──
  handle('claude:check-availability', async () => {
    const result = await claudeManager.checkAvailability()
    return result
  })

  // ── claude:send ──
  handle('claude:send', async (
    claudeSessionId: string | null,
    prompt: string,
    options?: { cwd?: string; model?: string },
  ) => {
    try {
      const result = await claudeManager.spawn({
        prompt,
        claudeSessionId: claudeSessionId || undefined,
        model: options?.model,
        cwd: options?.cwd,
      })
      return { streamId: result.streamId }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  // ── claude:stop ──
  handle('claude:stop', (streamId: string) => {
    const killed = claudeManager.kill(streamId)
    return { killed }
  })
}
