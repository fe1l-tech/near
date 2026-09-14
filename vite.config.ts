import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync } from 'fs'

/** package.json 的 version，用于构建时注入到前端 */
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8')) as { version: string }

/**
 * 让 sql.js 的 wasm 文件在 dev 与 build 下都可访问。
 *
 * sql.js 通过 URL 在运行时加载 wasm，Vite 无法静态分析它，
 * 因此手动搬运：dev 下用中间件直接响应，build 下复制进产物根目录。
 * 文件名固定为 sql-wasm.wasm（与 sql.js 的默认请求名一致）。
 */
function sqlJsWasm(): Plugin {
  const fileName = 'sql-wasm.wasm'
  const source = resolve('node_modules/sql.js/dist/sql-wasm.wasm')
  let outDir = 'dist'

  return {
    name: 'sqljs-wasm',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        const path = req.url.split('?')[0]
        if (!path.endsWith(fileName)) return next()
        if (!existsSync(source)) return next()
        res.setHeader('Content-Type', 'application/wasm')
        createReadStream(source).pipe(res)
      })
    },
    closeBundle() {
      mkdirSync(outDir, { recursive: true })
      copyFileSync(source, resolve(outDir, fileName))
    },
  }
}

export default defineConfig({
  plugins: [react(), sqlJsWasm()],
  root: 'src/renderer',
  base: './',
  /**
   * 构建时注入版本与构建时间。
   * 用途：应用内的「关于」页会显示它们，从而能一眼判断
   * 当前跑的桌面版是不是最新构建 —— 以前只能靠猜。
   */
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer'),
      '@core': resolve('src/renderer/core'),
      '@shell': resolve('src/renderer/shell'),
      '@theme': resolve('src/renderer/theme'),
      '@plugins': resolve('src/renderer/plugins'),
      '@ai': resolve('src/renderer/ai'),
      '@components': resolve('src/renderer/components'),
      '@hooks': resolve('src/renderer/hooks'),
      '@lib': resolve('src/renderer/lib'),
      '@shared': resolve('src/shared'),
    },
  },
  build: {
    outDir: '../../out/renderer',
    // 否则旧哈希产物会不断累积（历史上 out/renderer/assets 曾堆到 150+ 文件）
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
