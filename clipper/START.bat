@echo off
rem Double-click to set up / re-run setup on Windows.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python is not installed. Get it from https://www.python.org/downloads/ and tick "Add python.exe to PATH". & pause & exit /b 1)
where ffmpeg >nul 2>nul || (echo Installing ffmpeg... & winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements)
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt
python pipeline.py setup
pause
