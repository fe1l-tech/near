const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

// Search for NetEase in Start Menu apps (UWP + regular)
const cmd = `powershell -Command "Get-StartApps | Where-Object { $_.Name -like '*网易*' -or $_.Name -like '*net*' } | ForEach-Object { Write-Host $_.Name '||' $_.AppID }"`
try {
  const out = execSync(cmd, { encoding: 'utf8' })
  console.log('Found apps:')
  console.log(out)

  // Also search for the exe directly
  const { execSync: exec } = require('child_process')
  const where = exec('where /R "C:\\Program Files" cloudmusic* 2>nul & where /R "C:\\Program Files (x86)" cloudmusic* 2>nul & where /R "%LOCALAPPDATA%" cloudmusic* 2>nul', { encoding: 'utf8' })
  console.log('Files found:')
  console.log(where)
} catch (e) {
  console.log('Error:', e.message)
}
