const fs = require('fs')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const startUser = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
const startAll = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs'

const shortcuts = [
  { name: '千问.lnk', src: path.join(startUser, '千问.lnk') },
  { name: '豆包.lnk', src: path.join(startUser, '豆包.lnk') },
  { name: 'WPS Office.lnk', src: path.join(startUser, 'WPS Office.lnk') },
  { name: 'Visual Studio Code.lnk', src: path.join(startUser, 'Visual Studio Code.lnk') },
  { name: 'CC Switch.lnk', src: path.join(startUser, 'CC Switch.lnk') },
  { name: '剪映专业版.lnk', src: path.join(startUser, '剪映专业版.lnk') },
  { name: '人人视频.lnk', src: path.join(startUser, '人人视频.lnk') },
  { name: 'WorkBuddy.lnk', src: path.join(startUser, 'WorkBuddy.lnk') },
  { name: '腾讯会议.lnk', src: path.join(startAll, '腾讯会议.lnk') },
  { name: 'IntelliJ IDEA.lnk', src: path.join(startAll, 'IntelliJ IDEA 2026.1.3.lnk') },
]

let ok = 0
let miss = 0
for (const s of shortcuts) {
  const dst = path.join(desktop, s.name)
  if (fs.existsSync(s.src)) {
    fs.copyFileSync(s.src, dst)
    console.log('OK ' + s.name)
    ok++
  } else {
    console.log('MISS ' + s.src)
    miss++
  }
}
console.log('Done: ' + ok + ' restored, ' + miss + ' not found')
