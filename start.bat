@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 🌸 小零 启动中...

:: 启动后台服务器
start "小零服务" /MIN cmd /c "npx serve out\renderer -l 20173 --no-clipboard 2>nul"

:: 等待服务器就绪
ping -n 3 127.0.0.1 >nul

:: 用 Edge 独立应用模式打开（无地址栏，像真正的桌面软件）
start msedge --app=http://localhost:20173 --new-window

exit
