@echo off
setlocal
cd /d "%~dp0"
title Genshin CRPG Local Dev
echo.
echo [CRPG] Local development environment
echo [CRPG] Production Worker / D1 / Pages will not be deployed.
echo.
node tools\local_dev.mjs
if errorlevel 1 (
  echo.
  echo [CRPG] Local environment failed to start.
  pause
)
