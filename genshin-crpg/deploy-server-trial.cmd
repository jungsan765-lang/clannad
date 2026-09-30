@echo off
setlocal
chcp 65001 >nul 2>nul
cd /d "%~dp0"
set CRPG_PRODUCTION_TRIAL=1

where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  goto fail
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm was not found.
  goto fail
)

echo [1/2] Installing server dependencies...
call npm.cmd ci
if errorlevel 1 goto fail

echo [2/2] Starting guarded production DO trial...
echo This keeps the existing production D1 and applies only the additive ownership/checkpoint migration plus Worker deployment.
node.exe tools\promote-server.mjs --trial
if errorlevel 1 goto fail

echo.
echo Deployment finished.
echo Log out and log back in once before testing so the client receives the routed v2 session token.
goto done

:fail
echo.
echo Production trial stopped before completion. Send this screen to ChatGPT. Do not repeat blindly.

:done
pause
endlocal
