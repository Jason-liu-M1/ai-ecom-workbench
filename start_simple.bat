@echo off
chcp 65001 >nul
title AI Ecom Workbench (Simple)

cd /d "%~dp0"

echo.
echo ============================================================
echo   AI Ecom Workbench - Simple Mode
echo ============================================================
echo.

REM ===== Locate Node.js (try PATH first, then known locations) =====
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 (
  for /f "tokens=*" %%n in ('where node') do (
    set "NODE_EXE=%%n"
    goto :FOUND_NODE
  )
)

if exist "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.22.2\node.exe" (
  set "NODE_EXE=C:\Users\lenovo\.workbuddy\binaries\node\versions\22.22.2\node.exe"
  goto :FOUND_NODE
)
if exist "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.12.0\node.exe" (
  set "NODE_EXE=C:\Users\lenovo\.workbuddy\binaries\node\versions\22.12.0\node.exe"
  goto :FOUND_NODE
)
if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_EXE=C:\Program Files\nodejs\node.exe"
  goto :FOUND_NODE
)
if exist "C:\Program Files (x86)\nodejs\node.exe" (
  set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
  goto :FOUND_NODE
)

echo [ERROR] Node.js not found anywhere on this computer.
echo         Please install from https://nodejs.org (LTS version)
pause
exit /b 1

:FOUND_NODE
echo [OK] Using Node: %NODE_EXE%

REM ===== Locate npm =====
set "NPM_EXE="
if not errorlevel 0 set "NPM_EXE="
if exist "%~dp0node_modules\.bin\npm.cmd" set "NPM_EXE=%~dp0node_modules\.bin\npm.cmd"
if exist "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.22.2\npm.cmd" set "NPM_EXE=C:\Users\lenovo\.workbuddy\binaries\node\versions\22.22.2\npm.cmd"
if exist "C:\Users\lenovo\.workbuddy\binaries\node\versions\22.12.0\npm.cmd" set "NPM_EXE=C:\Users\lenovo\.workbuddy\binaries\node\versions\22.12.0\npm.cmd"
where npm >nul 2>nul
if not errorlevel 1 (
  for /f "tokens=*" %%m in ('where npm') do (
    set "NPM_EXE=%%m"
    goto :FOUND_NPM
  )
)
:FOUND_NPM
if "%NPM_EXE%"=="" set "NPM_EXE=%NODE_EXE%"

REM ===== Install dependencies if needed =====
if not exist "node_modules\express" (
  echo [INSTALL] Installing dependencies, please wait...
  call "%NPM_EXE%" install --no-audit --no-fund --registry=https://registry.npmmirror.com
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check network.
    pause
    exit /b 1
  )
  echo [OK] Dependencies installed.
)

REM ===== Check .env =====
if not exist ".env" (
  echo [SETUP] Creating .env from template...
  copy /Y .env.example .env >nul
  echo.
  echo ============================================================
  echo   IMPORTANT: .env was just created.
  echo   1) The notepad window that opens - paste your GROQ_API_KEY=gsk-xxxxx
  echo   2) Save and close notepad
  echo   3) Come back here and press any key
  echo ============================================================
  echo.
  notepad .env
  pause
)

REM ===== Kill any old process on 8787 =====
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787 " ^| findstr LISTENING') do (
  echo [CLEAN] Killing old process on port 8787 (PID %%a)...
  taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ============================================================
echo   Starting server at http://localhost:8787
echo   (Keep this window open! Close it to stop the server.)
echo ============================================================
echo.

"%NODE_EXE%" server/index.js

echo.
echo [STOPPED] Server has stopped. See errors above if any.
pause
