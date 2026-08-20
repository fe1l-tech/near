import { exec } from 'child_process'
import { handle } from './index'

export function registerShellIpc(): void {
  handle('shell:exec', (command: string, cwd?: string) => {
    return new Promise((resolve) => {
      exec(command, { cwd: cwd || process.cwd(), maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: error?.code || 0,
          error: error?.message || null,
        })
      })
    })
  })
}
