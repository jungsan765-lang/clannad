@echo off
setlocal
chcp 65001 >nul 2>nul
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 24 or newer is required.
  goto fail
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Install Node.js 24 or newer.
  goto fail
)

echo [1/2] Installing test dependencies...
call npm.cmd ci
if errorlevel 1 goto fail

echo [2/2] Connecting bench-do30.clannad.shop and measuring the route...
node.exe tools\domain-probe.mjs
if errorlevel 1 goto fail

echo.
echo Finished. Upload domain-probe-result.json back to ChatGPT.
goto done

:fail
echo.
echo Test stopped. Send a screenshot of this window.
echo Do not send passwords or tokens.

:done
pause
endlocal
