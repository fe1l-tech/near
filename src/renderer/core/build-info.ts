/**
 * 版本与构建信息
 *
 * 这两个值由构建工具在打包时注入（见 vite.config.ts 的 define）。
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
