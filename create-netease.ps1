$desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut("$desktop\网易云音乐.lnk")
$shortcut.TargetPath = 'explorer.exe'
$shortcut.Arguments = 'shell:AppsFolder\1F8B0F94.122165AE053F_j2p0p5q0044a6!CLOUDMUSIC'
$shortcut.Save()
Write-Host 'Done'
