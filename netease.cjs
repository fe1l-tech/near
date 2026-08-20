const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const appId = '1F8B0F94.122165AE053F_j2p0p5q0044a6!CLOUDMUSIC'
const shortcutPath = path.join(desktop, 'netease.lnk')

const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${shortcutPath}');$s.TargetPath='explorer.exe';$s.Arguments='shell:AppsFolder\\\\${appId}';$s.Save()`
try {
  execSync('powershell -Command "' + ps + '"', { encoding: 'utf8' })
  // Rename to Chinese name using Node.js (better Unicode support)
  const finalPath = path.join(desktop, '网易云音乐.lnk') // 网易云音乐
  if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath)
  fs.renameSync(shortcutPath, finalPath)
  console.log('OK: ' + finalPath)
} catch (e) {
  console.log('Error:', e.message)
}
