@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 이상이 필요합니다.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 goto end
node tools\stage-server.mjs
:end
pause
