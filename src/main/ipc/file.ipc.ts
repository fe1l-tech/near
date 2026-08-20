import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { handle } from './index'

export function registerFileIpc(): void {
  handle('file:read', async (filePath: string) => {
    const content = await readFile(filePath, 'utf-8')
    return { path: filePath, content }
  })

  handle('file:write', async (filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8')
    return { path: filePath, success: true }
  })

  handle('file:list', async (dirPath: string) => {
    const files = await readdir(dirPath)
    const stats = await Promise.all(
      files.map(async (name) => {
        const fullPath = `${dirPath}/${name}`
        const s = await stat(fullPath)
        return { name, path: fullPath, isDirectory: s.isDirectory(), size: s.size, mtime: s.mtimeMs }
      }),
    )
    return stats
  })

  handle('file:stat', async (filePath: string) => {
    const s = await stat(filePath)
    return {
      path: filePath,
      isDirectory: s.isDirectory(),
      size: s.size,
      mtime: s.mtimeMs,
      ctime: s.ctimeMs,
    }
  })
}
