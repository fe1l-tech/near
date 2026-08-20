import { app } from 'electron'
import { join } from 'path'

export function getUserDataPath(...segments: string[]): string {
  return join(app.getPath('userData'), ...segments)
}

export function getDbPath(): string {
  return getUserDataPath('ai-workspace.db')
}

export function getLogPath(): string {
  return getUserDataPath('logs')
}

export function getAppPath(): string {
  return app.getAppPath()
}
