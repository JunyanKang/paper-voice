@echo off
chcp 65001 >nul
"%~dp0engine\python\python.exe" -E -s -B -X utf8 "%~dp0install_engine.py"
echo.
pause
