@echo off
cd /d "%~dp0"
start "" http://localhost:8765/
py -m http.server 8765 --directory dist --bind 127.0.0.1
pause
