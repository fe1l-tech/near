import { ipcMain } from 'electron'
import { registerFileIpc } from './file.ipc'
import { registerShellIpc } from './shell.ipc'
import { registerStorageIpc } from './storage.ipc'
import { registerSystemIpc } from './system.ipc'
import { registerFitnessIpc } from './fitness.ipc'
import { registerDietIpc } from './diet.ipc'
import { registerWeatherIpc } from './weather.ipc'
import { registerQuoteIpc } from './quote.ipc'
import { registerClaudeIpc } from './claude.ipc'
import { registerCalendarIpc } from './calendar.ipc'
import { registerMemoIpc } from './memo.ipc'
import { registerTodoIpc } from './todo.ipc'
import { registerConversationIpc } from './conversation.ipc'

export function registerIpcHandlers(): void {
  registerFileIpc()
  registerShellIpc()
  registerStorageIpc()
  registerSystemIpc()
  registerFitnessIpc()
  registerDietIpc()
  registerWeatherIpc()
  registerQuoteIpc()
  registerClaudeIpc()
  registerCalendarIpc()
  registerMemoIpc()
  registerTodoIpc()
  registerConversationIpc()

  console.log('[IPC] All handlers registered')
}

// 安全调用包装器
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handle(channel: string, handler: (...args: any[]) => any): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { success: true, data: await handler(...args) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[IPC] Error in ${channel}:`, message)
      return { success: false, error: message }
    }
  })
}
