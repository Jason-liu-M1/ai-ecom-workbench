@echo off
chcp 65001 >nul
title Stop AI Ecom Server

cd /d "%~dp0"
echo.
echo Stopping AI Ecom Workbench server...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr LISTENING') do (
  echo   Killing PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
if exist "start_server_only.bat" del "start_server_only.bat" >nul 2>&1

echo.
echo Done.
echo.
pause
