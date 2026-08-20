@echo off
cd /d D:\小零
start /MIN node server.js
ping -n 3 127.0.0.1 >nul
start msedge --app=http://localhost:20173
