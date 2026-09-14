import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'

/**
 * 固定 userData 目录，避免 dev / 打包版因 app name 不同而各存一份数据。
 *
 * 用固定目录名（而不是跟随 app name）是有意为之：这样开发时和安装后
 * 看到的是同一份数据。
 *
 * 目录沿革（迁移链，按从旧到新排列）：
 *   1. `ai-workspace` —— 早期用 package.json 的 name 作为目录
 *   2. `小零`         —— 改名前的产品名
 *   3. `near`         —— 当前
 *
 * 每改一次名，就要把旧目录追加到 LEGACY_APP_DATA_DIRS 里，
 * 否则用了一段时间的用户升级后会"数据凭空消失"。
 */
const APP_DATA_DIR = 'near'
const LEGACY_APP_DATA_DIRS = ['小零', 'ai-workspace'] as const
const DB_FILENAME = 'ai-workspace.db'

const appDataRoot = app.getPath('appData')
const targetUserData = join(appDataRoot, APP_DATA_DIR)

/** 从历史目录迁移数据库（仅当目标为空、且来源有库时） */
function migrateLegacyData(): void {
  const targetDb = join(targetUserData, DB_FILENAME)

  // 历史目录 + 当前默认目录（同一进程内可能已解析出的路径）
  const sources = [
    ...LEGACY_APP_DATA_DIRS.map((dir) => join(appDataRoot, dir)),
    app.getPath('userData'),
  ]

  for (const source of sources) {
    if (source === targetUserData) continue
    if (!existsSync(source)) continue

    const sourceDb = join(source, DB_FILENAME)
    if (!existsSync(sourceDb)) continue

    // 目标已有数据则不覆盖，否则会把新数据盖掉
    if (existsSync(targetDb)) return

    mkdirSync(targetUserData, { recursive: true })
    copyFileSync(sourceDb, targetDb)
    console.log(`[Database] 已从 ${source} 迁移数据到 ${targetUserData}`)
    return
  }
}

app.setPath('userData', targetUserData)
migrateLegacyData()

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  // 初始化数据库
  await initDatabase()

  // 注册所有 IPC 处理器
  registerIpcHandlers()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#fef5f7',
    title: 'near',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  mainWindow = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
