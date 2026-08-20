@echo off
set "d=%USERPROFILE%\Desktop"
set "u=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
set "a=%ProgramData%\Microsoft\Windows\Start Menu\Programs"

copy /Y "%u%\千问.lnk" "%d%\千问.lnk"
copy /Y "%u%\豆包.lnk" "%d%\豆包.lnk"
copy /Y "%u%\WPS Office.lnk" "%d%\WPS Office.lnk"
copy /Y "%u%\Visual Studio Code.lnk" "%d%\Visual Studio Code.lnk"
copy /Y "%u%\CC Switch.lnk" "%d%\CC Switch.lnk"
copy /Y "%u%\剪映专业版.lnk" "%d%\剪映专业版.lnk"
copy /Y "%u%\人人视频.lnk" "%d%\人人视频.lnk"
copy /Y "%u%\WorkBuddy.lnk" "%d%\WorkBuddy.lnk"
copy /Y "%a%\腾讯会议.lnk" "%d%\腾讯会议.lnk"
copy /Y "%a%\IntelliJ IDEA 2026.1.3.lnk" "%d%\IntelliJ IDEA.lnk"

echo Done!
pause
