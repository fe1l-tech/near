/**
 * Claude Code 进程管理器
 * 使用 child_process.spawn 启动 claude CLI，解析 stream-json 输出
 */
import { spawn, type ChildProcess, execSync } from 'child_process'
import { createInterface } from 'readline'
import { existsSync } from 'fs'
import { BrowserWindow } from 'electron'
import { homedir } from 'os'
import { join } from 'path'

// ── 类型定义 ──────────────────────────────────────────

export interface SpawnOptions {
  prompt: string
  claudeSessionId?: string      // Claude 原生 session ID（用于 --resume）
  model?: string                 // 模型选择
  cwd?: string                   // 工作目录
}

export interface ActiveStream {
  streamId: string
  process: ChildProcess
  startTime: number
  fullText: string
  currentToolId: string | null
  currentToolName: string | null
  currentToolInput: string
}

export interface ClaudeStreamEvent {
  streamId: string
  type: 'text_delta' | 'thinking' | 'tool_use_start' | 'tool_use_input'
    | 'tool_use_end' | 'tool_result' | 'session' | 'error' | 'done'
  text?: string
  thinkingDelta?: string
  toolId?: string
  toolName?: string
  toolInputJson?: string
  toolResultContent?: string
  isToolError?: boolean
  claudeSessionId?: string
  usage?: { input_tokens: number; output_tokens: number }
  error?: string
  errorCode?: 'CLAUDE_NOT_FOUND' | 'PROCESS_EXITED' | 'PARSE_ERROR' | 'TIMEOUT' | 'UNKNOWN'
}

// ── 常量 ──────────────────────────────────────────────

const CLAUDE_TIMEOUT_MS = 5 * 60 * 1000

/** 在 Windows 上查找 PowerShell 路径（优先 pwsh.exe，其次 powershell.exe） */
function findPowerShell(): string | null {
  // PowerShell 7+ (Core)
  const pwshPaths = [
    join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
    join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', 'pwsh.exe'),
  ]
  for (const p of pwshPaths) {
    if (existsSync(p)) return p
  }
  // Windows PowerShell 5.1
  const winPs = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  if (existsSync(winPs)) return winPs
  return null
}

/** 查找 claude 命令的完整路径（Windows 兼容） */
function getClaudePath(): string | null {
  try {
    // Windows: 优先使用 .cmd 文件（cmd.exe 可执行）
    const cmdPath = join(homedir(), 'AppData', 'Roaming', 'npm', 'claude.cmd')
    const result = execSync(`"${cmdPath}" --version`, { encoding: 'utf8', timeout: 5000 })
    if (result.includes('Claude Code')) {
      console.log(`[ClaudeManager] Found claude.cmd at: ${cmdPath}`)
      return cmdPath
    }
  } catch {
    // 回退：尝试直接 exe 路径
  }

  // 直接使用 claude.exe
  const exePath = join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')
  try {
    const result = execSync(`"${exePath}" --version`, { encoding: 'utf8', timeout: 5000 })
    if (result.includes('Claude Code')) {
      console.log(`[ClaudeManager] Found claude.exe at: ${exePath}`)
      return exePath
    }
  } catch {
    // exe 也不可用
  }

  // 最后回退：PATH 中的 claude
  try {
    const result = execSync('where claude.cmd', { encoding: 'utf8', timeout: 5000 })
    const line = result.trim().split('\n')[0]?.trim()
    if (line) {
      console.log(`[ClaudeManager] Found via where: ${line}`)
      return line
    }
  } catch {
    // 不使用
  }

  console.warn('[ClaudeManager] claude command not found!')
  return null
}

// ── 单例 ──────────────────────────────────────────────

class ClaudeManager {
  private streams = new Map<string, ActiveStream>()
  private mainWindow: BrowserWindow | null = null
  private claudePath: string | null = null

  constructor() {
    this.claudePath = getClaudePath()
    if (this.claudePath) {
      console.log(`[ClaudeManager] Initialized with: ${this.claudePath}`)
    } else {
      console.warn('[ClaudeManager] claude command not found!')
    }
  }

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  getMainWindow(): BrowserWindow | null {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) return this.mainWindow
    const wins = BrowserWindow.getAllWindows()
    this.mainWindow = wins[0] || null
    return this.mainWindow
  }

  /** 向渲染进程推送事件 */
  private emit(event: ClaudeStreamEvent): void {
    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('claude:stream-event', event)
    }
  }

  /** 检测 claude CLI 是否可用 */
  async checkAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
    const claudeCmd = process.platform === 'win32'
      ? join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')
      : (this.claudePath || 'claude')
    console.log(`[ClaudeManager] Checking availability: ${claudeCmd}`)

    return new Promise((resolve) => {
      try {
        const proc = spawn(claudeCmd, ['--version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 10000,
        })

        let output = ''
        proc.stdout.on('data', (chunk: Buffer) => { output += chunk.toString() })
        proc.stderr.on('data', (chunk: Buffer) => { output += chunk.toString() })

        proc.on('close', (code) => {
          console.log(`[ClaudeManager] checkAvailability exit code: ${code}, output: ${output.trim().slice(0, 100)}`)
          if (code === 0) {
            const version = output.trim().replace(/[\r\n]+/g, ' ').slice(0, 100)
            resolve({ available: true, version })
          } else {
            resolve({ available: false, error: `退出码 ${code}: ${output.slice(0, 200)}` })
          }
        })

        proc.on('error', (err) => {
          console.error(`[ClaudeManager] checkAvailability error:`, err.message)
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            resolve({ available: false, error: 'claude 未安装' })
          } else {
            resolve({ available: false, error: err.message })
          }
        })
      } catch (err) {
        console.error(`[ClaudeManager] checkAvailability exception:`, err)
        resolve({ available: false, error: (err as Error).message })
      }
    })
  }

  /** 启动新的 Claude 会话 */
  spawn(
    options: SpawnOptions,
    streamCallback?: (event: ClaudeStreamEvent) => void,
  ): Promise<{ streamId: string }> {
    return new Promise((resolve, reject) => {
      const streamId = crypto.randomUUID()
      // 直接使用 claude.exe 避免 .cmd/shell 兼容问题
      const claudeCmd = process.platform === 'win32'
        ? join(homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')
        : (this.claudePath || 'claude')
      const args = this.buildArgs(options)

      console.log(`[ClaudeManager] Spawning: ${claudeCmd} ${args.join(' ')}`)

      let proc: ChildProcess
      try {
        // Windows 上强制使用 PowerShell（而非 Git Bash）
        const env = { ...process.env }
        if (process.platform === 'win32') {
          const psPath = findPowerShell()
          if (psPath) {
            // 设置 shell 为 PowerShell
            env.SHELL = psPath
            env.ComSpec = psPath

            // 清除 Git Bash / MSYS2 环境变量，防止 Claude CLI 检测到 bash
            // 这些变量会让 Claude 认为自己在 Unix-like 环境
            delete env.MSYSTEM
            delete env.MSYSTEM_PREFIX
            delete env.MINGW_PREFIX
            delete env.MINGW_CHOST
            delete env.BASH
            delete env.SHLVL
            delete env.__GLIBC__
            // 清除终端类型，避免 Claude 认为自己在 Unix 终端
            env.TERM = 'dumb'

            // 从 PATH 中移除 Git 安装目录（含 bash.exe、sh.exe）
            if (env.PATH) {
              env.PATH = env.PATH
                .split(';')
                .filter((p) => {
                  const lower = p.toLowerCase()
                  // 过滤掉 Git 和 MSYS2 的 bin 目录
                  return !(lower.includes('\\git\\') || lower.includes('\\git-for-windows\\') || lower.includes('\\msys2\\') || lower.includes('\\msys64\\'))
                })
                .join(';')
            }

            console.log(`[ClaudeManager] Using shell: ${psPath}`)
          } else {
            // 回退：至少确保用 cmd.exe
            env.ComSpec = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'cmd.exe')
            delete env.MSYSTEM
            delete env.BASH
            env.TERM = 'dumb'
            // 仍然清理 Git Bash 路径
            if (env.PATH) {
              env.PATH = env.PATH
                .split(';')
                .filter((p) => {
                  const lower = p.toLowerCase()
                  return !(lower.includes('\\git\\') || lower.includes('\\msys2\\') || lower.includes('\\msys64\\'))
                })
                .join(';')
            }
          }
        }

        proc = spawn(claudeCmd, args, {
          cwd: options.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          env,
        })
      } catch (err) {
        reject(err)
        return
      }

      const active: ActiveStream = {
        streamId,
        process: proc,
        startTime: Date.now(),
        fullText: '',
        currentToolId: null,
        currentToolName: null,
        currentToolInput: '',
      }
      this.streams.set(streamId, active)

      // 超时计时器
      let timeoutTimer: NodeJS.Timeout | null = setTimeout(() => {
        this.emitTo(streamId, { streamId, type: 'error', error: '请求超时，Claude 超过 5 分钟未响应', errorCode: 'TIMEOUT' })
        this.kill(streamId)
      }, CLAUDE_TIMEOUT_MS)

      const resetTimer = () => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer)
          timeoutTimer = setTimeout(() => {
            this.emitTo(streamId, { streamId, type: 'error', error: '请求超时', errorCode: 'TIMEOUT' })
            this.kill(streamId)
          }, CLAUDE_TIMEOUT_MS)
        }
      }

      // 逐行处理 stdout JSON
      const rl = createInterface({ input: proc.stdout!, crlfDelay: Infinity })
      let hasSentDone = false

      rl.on('line', (line: string) => {
        resetTimer()
        try {
          const raw = JSON.parse(line)
          const parsed = this.parseLine(raw, active)
          if (parsed) {
            if (parsed.type === 'done') hasSentDone = true
            streamCallback?.(parsed)
            this.emitTo(streamId, parsed)
          }
        } catch {
          if (line.trim().length > 0) {
            console.warn(`[ClaudeManager] Skipped: ${line.slice(0, 300)}`)
          }
        }
      })

      // stderr 收集
      let stderrBuffer = ''
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString()
      })

      // 进程退出
      proc.on('close', (code) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        this.streams.delete(streamId)

        if (!hasSentDone) {
          if (code === 0 || code === null) {
            this.emitTo(streamId, { streamId, type: 'done' })
            streamCallback?.({ streamId, type: 'done' })
          } else {
            const errorMsg = stderrBuffer.slice(0, 500).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') || `Claude 进程异常退出 (code ${code})`
            console.error(`[ClaudeManager] Process exited with code ${code}: ${errorMsg}`)
            this.emitTo(streamId, { streamId, type: 'error', error: errorMsg, errorCode: 'PROCESS_EXITED' })
            streamCallback?.({ streamId, type: 'error', error: errorMsg, errorCode: 'PROCESS_EXITED' })
          }
        }
      })

      proc.on('error', (err) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        this.streams.delete(streamId)
        const errorMsg = (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'claude 未安装。请运行: npm install -g @anthropic-ai/claude-code'
          : err.message
        console.error(`[ClaudeManager] Spawn error:`, errorMsg)
        this.emitTo(streamId, { streamId, type: 'error', error: errorMsg, errorCode: 'CLAUDE_NOT_FOUND' })
        streamCallback?.({ streamId, type: 'error', error: errorMsg, errorCode: 'CLAUDE_NOT_FOUND' })
      })

      resolve({ streamId })
    })
  }

  /** 终止流 */
  kill(streamId: string): boolean {
    const active = this.streams.get(streamId)
    if (!active) return false
    console.log(`[ClaudeManager] Killing stream ${streamId}`)
    active.process.kill('SIGTERM')
    this.streams.delete(streamId)
    return true
  }

  /** 清理所有活跃流 */
  killAll(): void {
    for (const [streamId, active] of this.streams) {
      try { active.process.kill('SIGTERM') } catch { /* ignore */ }
    }
    this.streams.clear()
  }

  // ── 私有方法 ───────────────────────────────────────

  /** 构建 claude 命令行参数 */
  private buildArgs(options: SpawnOptions): string[] {
    const args: string[] = ['-p', options.prompt]

    if (options.claudeSessionId) {
      args.push('--resume', options.claudeSessionId)
    }
    if (options.model) {
      args.push('--model', options.model)
    }

    args.push('--output-format', 'stream-json')
    args.push('--verbose')
    args.push('--include-partial-messages')

    return args
  }

  /** 解析单行 stream-json 为 ClaudeStreamEvent */
  private parseLine(raw: Record<string, unknown>, stream: ActiveStream): ClaudeStreamEvent | null {
    const eventType = raw.type as string | undefined

    // ── system / stream_event ── 忽略（内部事件，不推送前端）
    if (eventType === 'system' || eventType === 'stream_event') return null

    // ── assistant 消息 ──
    if (eventType === 'assistant') {
      const message = raw.message as Record<string, unknown> | undefined
      if (!message) return null

      const content = message.content as Array<Record<string, unknown>> | undefined
      if (!content || !Array.isArray(content)) return null

      const events: ClaudeStreamEvent[] = []

      for (const block of content) {
        if (block.type === 'text' && block.text) {
          const newText = block.text as string
          const deltaText = newText.slice(stream.fullText.length)
          stream.fullText = newText
          if (deltaText.length > 0) {
            events.push({ streamId: stream.streamId, type: 'text_delta', text: deltaText })
          }
        } else if (block.type === 'thinking' && block.thinking) {
          events.push({ streamId: stream.streamId, type: 'thinking', thinkingDelta: block.thinking as string })
        } else if (block.type === 'tool_use') {
          stream.currentToolId = block.id as string
          stream.currentToolName = block.name as string
          events.push({
            streamId: stream.streamId,
            type: 'tool_use_start',
            toolId: block.id as string,
            toolName: block.name as string,
          })
        }
      }

      // 返回第一个事件（主进程 IPC 逐事件推送）
      if (events.length > 0) {
        // 保存剩余事件稍后发送
        for (let i = 1; i < events.length; i++) {
          this.emitTo(stream.streamId, events[i])
        }
        return events[0]
      }
      return null
    }

    // ── result ── 最终结果
    if (eventType === 'result') {
      const resultText = raw.result as string | undefined
      const sessionId = raw.session_id as string | undefined
      const usage = raw.usage as Record<string, unknown> | undefined

      // 如果 result 中有新文本，发送 text_delta
      if (resultText) {
        const deltaText = resultText.slice(stream.fullText.length)
        stream.fullText = resultText
        if (deltaText.length > 0) {
          this.emitTo(stream.streamId, { streamId: stream.streamId, type: 'text_delta', text: deltaText })
        }
      }

      return {
        streamId: stream.streamId,
        type: 'done',
        claudeSessionId: sessionId,
        usage: usage ? {
          input_tokens: (usage.input_tokens as number) || 0,
          output_tokens: (usage.output_tokens as number) || 0,
        } : undefined,
      }
    }

    // ── error ──
    if (eventType === 'error') {
      return {
        streamId: stream.streamId,
        type: 'error',
        error: (raw.error as string) || 'Claude 内部错误',
        errorCode: 'UNKNOWN',
      }
    }

    // ── ping ── 忽略
    if (eventType && eventType !== 'ping') {
      console.log(`[ClaudeManager] Unhandled event type: ${eventType}`)
    }

    return null
  }

  /** 向特定流发送事件 */
  private emitTo(streamId: string, event: ClaudeStreamEvent): void {
    const win = this.getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('claude:stream-event', event)
    }
  }
}

export const claudeManager = new ClaudeManager()
