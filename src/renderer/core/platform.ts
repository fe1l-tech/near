/**
 * 运行时平台能力
 *
 * 应用同时有两种运行形态：
 * - Electron 桌面版：具备子进程（Claude Code CLI）、文件系统、原生窗口等能力
 * - Web 版（用于在线试用）：只有浏览器环境，能力受限
 *
 * 这里集中判断，避免各处散落 `if (isElectron)`，也便于在 UI 上隐藏不可用入口。
 */

/** 是否运行在 Electron 中（preload 注入的 api 会带 isElectron 标记） */
export const isElectron: boolean =
  typeof window !== 'undefined' &&
  typeof (window as { api?: { isElectron?: boolean } }).api?.isElectron === 'boolean' &&
  ((window as { api?: { isElectron?: boolean } }).api?.isElectron as boolean)

/** 是否运行在纯浏览器中 */
export const isWeb = !isElectron

/**
 * 功能能力开关。
 * 新增受限功能时在这里登记，UI 只读这里的标记。
 */
export const capabilities = {
  /** Claude Code CLI 需要本地子进程，浏览器无法提供 */
  claudeCli: isElectron,
  /** 直接读写本地文件系统 */
  fileSystem: isElectron,
  /** 执行 shell 命令 */
  shellExec: isElectron,
  /** 系统信息 / 剪贴板（浏览器有受限替代，这里按原生能力计） */
  nativeSystem: isElectron,
  /** 天气：两端都可用（浏览器直接请求 Open-Meteo） */
  weather: true,
  /** AI 对话：两端都可用（BYOK 直连 OpenAI 兼容接口） */
  aiChat: true,
} as const

export type CapabilityKey = keyof typeof capabilities
