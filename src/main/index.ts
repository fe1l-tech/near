import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc'

// 固定 userData 目录为 %APPDATA%/小零，避免 dev/打包版目录漂移
// （dev 模式下 app name 为 ai-workspace，打包版为小零，数据会存到不同目录）
const APP_DATA_DIR = '小零'
const legacyUserData = app.getPath('userData')
const fixedUserData = join(app.getPath('appData'), APP_DATA_DIR)
app.setPath('userData', fixedUserData)

// 从旧目录迁移数据（若旧目录有数据库且新目录为空）
function migrateLegacyData(): void {
  if (legacyUserData === fixedUserData) return
  if (!existsSync(legacyUserData)) return
  const legacyDb = join(legacyUserData, 'ai-workspace.db')
  const fixedDb = join(fixedUserData, 'ai-workspace.db')
  if (!existsSync(legacyDb)) return
  if (existsSync(fixedDb)) return
  mkdirSync(fixedUserData, { recursive: true })
  copyFileSync(legacyDb, fixedDb)
  console.log(`[Database] Migrated from ${legacyUserData} to ${fixedUserData}`)
}

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
    title: '小零',
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
