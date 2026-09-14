import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import './theme/styles/globals.css'

/**
 * Web 模式启动：先初始化浏览器数据库（sql.js + IndexedDB），再挂载 UI。
 * Electron 模式下 window.api 由 preload 注入，数据库在主进程初始化，这里跳过。
 *
 * 注意：这里必须用相对路径引入 db 模块。
 * Vite 对 `./core/db/x` 与 `@core/db/x` 会解析成两个模块实例，
 * 若与 web-api.ts 内的解析方式不一致，就会出现「一处初始化、另一处读不到」的假错误。
 */
async function boot() {
  if (!('api' in window)) {
    try {
      const { initBrowserDatabase, getDbStatus } = await import('./core/db/browser-db')
      const db = await initBrowserDatabase()
      const tableCount = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table'")[0]
        ?.values?.[0]?.[0]
      Reflect.set(window, '__xiaolingWebDb', () => ({ ...getDbStatus(), tableCount }))
      console.log('[Web] 数据库就绪', getDbStatus(), '表数量:', tableCount)
    } catch (error) {
      console.error('[Web] 数据库初始化失败，将以只读降级模式启动:', error)
    }
  }

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
