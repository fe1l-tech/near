$desktop = [Environment]::GetFolderPath('Desktop')
$startAll = 'C:\ProgramData\Microsoft\Windows\Start Menu\Programs'
$startUser = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"

$apps = @(
    @{Name='千问'; Path="$startUser\千问.lnk"},
    @{Name='豆包'; Path="$startUser\豆包.lnk"},
    @{Name='WPS Office'; Path="$startUser\WPS Office.lnk"},
    @{Name='IntelliJ IDEA'; Path="$startAll\IntelliJ IDEA 2026.1.3.lnk"},
    @{Name='Visual Studio Code'; Path="$startUser\Visual Studio Code.lnk"},
    @{Name='腾讯会议'; Path="$startAll\腾讯会议.lnk"},
    @{Name='CC Switch'; Path="$startUser\CC Switch.lnk"},
    @{Name='剪映专业版'; Path="$startUser\剪映专业版.lnk"},
    @{Name='人人视频'; Path="$startUser\人人视频.lnk"},
    @{Name='WorkBuddy'; Path="$startUser\WorkBuddy.lnk"}
)

$count = 0
foreach ($app in $apps) {
    $dst = Join-Path $desktop ($app.Name + '.lnk')
    if (Test-Path $app.Path) {
        Copy-Item $app.Path $dst -Force
        Write-Host "OK $($app.Name)"
        $count++
    } else {
        Write-Host "MISS $($app.Name) -> $($app.Path)"
    }
}
Write-Host "Done: $count restored"
