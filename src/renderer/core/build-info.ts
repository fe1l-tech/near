/**
 * 版本与构建信息
 *
 * 这些值由构建工具在打包时注入（见 vite.config.ts 的 define）。
 * 这里统一包一层，好处有两个：
 * 1. 组件不必直接引用 `__APP_VERSION__` 这类全局常量；
 * 2. 在测试等没有经过构建的环境里有兜底，不会因为未定义而崩。
 */

/** 应用版本 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'

/** 构建时间（YYYY-MM-DD HH:mm） */
export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'

/**
 * 应用部署的基础路径，始终以 `/` 开头和结尾。
 *
 * 为什么不直接读 `window.location.pathname`：应用用的是 hash 路由，
 * 路径名在整个会话里是常量，看着像是可用的来源，但开发服务器与
 * 正式部署的取值并不一致，改动起来容易顾此失彼。
 *
 * 为什么需要它：`base: './'` 让打包出的资源用相对路径引用，但
 * sql.js 的 wasm 是在**运行时**按 URL 加载的，Vite 无法改写，
 * 所以必须显式给出部署前缀。部署到 GitHub Pages 的仓库子路径
 * （如 `/near/`）时如果算错，wasm 会 404，并抛出难以定位的
 * "expected magic word" 错误（实际拿到的是 index.html）。
 */
export const APP_BASE: string = typeof __APP_BASE__ !== 'undefined' ? __APP_BASE__ : '/'

/** 把构建产物中的文件名解析为完整 URL */
export function assetUrl(file: string): string {
  const base = APP_BASE.endsWith('/') ? APP_BASE : `${APP_BASE}/`
  return `${base}${file}`
}
