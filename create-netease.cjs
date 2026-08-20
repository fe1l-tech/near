const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const appId = '1F8B0F94.122165AE053F_j2p0p5q0044a6!CLOUDMUSIC'

const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut('${desktop}\\网易云音乐.lnk')
$shortcut.TargetPath = 'explorer.exe'
$shortcut.Arguments = 'shell:AppsFolder\\${appId}'
$shortcut.IconLocation = 'C:\\Windows\\System32\\imageres.dll,-1080'
$shortcut.Save()
Write-Host 'Done'
`

try {
  const result = execSync('powershell -Command "' + psScript.replace(/"/g, '\\"') + '"', { encoding: 'utf8', shell: 'cmd.exe' })
  console.log('Result:', result)
  console.log('Shortcut created at:', path.join(desktop, '网易云音乐.lnk'))
} catch (e) {
  console.log('Error:', e.message)
}
