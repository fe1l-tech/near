const fs = require('fs')
const path = require('path')
const os = require('os')

const desktop = path.join(os.homedir(), 'Desktop')
const startUser = process.env.APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs'
const startAll = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs'

const targets = ['千问', 'Visual Studio Code', 'CC Switch', '剪映专业版', '剪映', '人人视频', 'IntelliJ IDEA']

function findRecursive(dir, name) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        const found = findRecursive(full, name)
        if (found) return found
      } else if (item.name.toLowerCase().includes(name.toLowerCase())) {
        return full
      }
    }
  } catch (e) {}
  return null
}

for (const target of targets) {
  let found = findRecursive(startUser, target) || findRecursive(startAll, target)
  if (found) {
    const dst = path.join(desktop, target + '.lnk')
    fs.copyFileSync(found, dst)
    console.log('OK ' + target + ' -> ' + found)
  } else {
    console.log('MISS ' + target)
  }
}
console.log('Done')
