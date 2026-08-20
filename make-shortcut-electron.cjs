const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const shortcut = path.join(desktop, '小零.lnk')
const target = 'D:\\小零\\node_modules\\electron\\dist\\electron.exe'
const args = '"D:\\小零\\out\\main\\index.js"'
const workDir = 'D:\\小零'
const icon = 'D:\\小零\\build\\icon.ico'

let ps = ''
ps += `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${shortcut}');`
ps += `$s.TargetPath='${target}';`
ps += `$s.Arguments='${args}';`
ps += `$s.WorkingDirectory='${workDir}';`
ps += `$s.Description='小零 - 个人 AI 效率工作台';`
ps += `$s.IconLocation='${icon}';`
ps += `$s.Save();Write-Host OK`

execSync(`powershell -Command "${ps}"`, { encoding: 'utf8' })
console.log('Done: ' + shortcut)
