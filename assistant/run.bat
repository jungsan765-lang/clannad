@echo off
cd /d "%~dp0"
where pyw >nul 2>nul && (start "" pyw -3.12 launcher.py) || (start "" pythonw launcher.py)
