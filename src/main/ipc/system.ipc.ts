import { app, clipboard } from 'electron'
import { handle } from './index'

export function registerSystemIpc(): void {
  handle('system:get-version', () => {
    return {
      app: app.getVersion(),
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
    }
  })

  handle('system:get-path', (name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0])
  })

  handle('system:clipboard-read', () => {
    return clipboard.readText()
  })

  handle('system:clipboard-write', (text: string) => {
    clipboard.writeText(text)
    return { success: true }
  })
}
