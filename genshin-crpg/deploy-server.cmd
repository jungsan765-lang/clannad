@echo off
chcp 65001 >nul
cd /d "%~dp0"
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js 24를 먼저 설치해 주세요.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 goto done
node tools/promote-server.mjs
:done
pause
