@echo off
chcp 65001 >nul
echo 正在运行安装程序...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
