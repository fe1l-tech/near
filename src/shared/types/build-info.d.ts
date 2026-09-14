/**
 * 构建时注入的全局常量（见 vite.config.ts 的 define）
 *
 * 声明在这里让 TypeScript 认识它们，同时集中说明来源。
 */

/** 应用版本，来自 package.json 的 version */
declare const __APP_VERSION__: string

/** 构建时间（本地时间，YYYY-MM-DD HH:mm），构建时写入 */
declare const __BUILD_TIME__: string
