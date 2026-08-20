$Desktop = [Environment]::GetFolderPath('Desktop')
$Target = 'D:\小零\dist\win-unpacked\小零.exe'
$WorkDir = 'D:\小零\dist\win-unpacked'
$Shortcut = Join-Path $Desktop '小零.lnk'

$WshShell = New-Object -ComObject WScript.Shell
$Link = $WshShell.CreateShortcut($Shortcut)
$Link.TargetPath = $Target
$Link.WorkingDirectory = $WorkDir
$Link.Description = '小零 - 个人 AI 效率工作台'
$Link.Save()

Write-Host "OK: $Shortcut"
