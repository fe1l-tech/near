const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const target = 'D:\\小零\\start.bat'
const workDir = 'D:\\小零'
const shortcut = path.join(desktop, '小零.lnk')

const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${shortcut}');$s.TargetPath='${target}';$s.WorkingDirectory='${workDir}';$s.Description='小零 - 个人 AI 效率工作台';$s.Save();Write-Host OK`
execSync('powershell -Command "' + ps + '"', { encoding: 'utf8' })
console.log('Done: ' + shortcut)
