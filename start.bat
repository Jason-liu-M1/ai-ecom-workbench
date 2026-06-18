@echo off
REM Double-click this to start the AI Ecom Workbench
chcp 65001 >nul
title AI Ecom Workbench
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "start.ps1"
