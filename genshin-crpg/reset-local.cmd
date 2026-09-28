@echo off
setlocal
cd /d "%~dp0"
echo.
echo [CRPG] This deletes ONLY the local test Worker/D1 state.
echo [CRPG] Production Cloudflare D1 and deployed saves are not touched.
echo.
choice /C YN /N /M "Reset local test accounts/saves? [Y/N] "
if errorlevel 2 exit /b 0
if exist ".local\wrangler" rmdir /s /q ".local\wrangler"
echo.
echo [CRPG] Local test database reset complete.
echo [CRPG] Run dev-local.cmd to recreate an empty local D1.
pause
