/**
 * Claude Code IPC 处理
 * 通道: claude:send, claude:stop, claude:get-sessions, claude:delete-session, claude:check-availability
 */
import { handle } from './index'
import { claudeManager } from '../services/claude-manager'
import { BrowserWindow } from 'electron'

export function registerClaudeIpc(): void {
  // 初始化主窗口引用
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    claudeManager.setMainWindow(mainWindow)
  }

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
