@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (py -3.12 -m pip install -r requirements.txt) || (python -m pip install -r requirements.txt)
echo.
echo 설치가 끝났어요.
echo API 키를 아직 안 넣었으면:  setx ANTHROPIC_API_KEY "키"   (새 명령 프롬프트 창부터 적용)
echo 그다음 run.bat 을 더블클릭하면 다니카가 나와요.
pause
