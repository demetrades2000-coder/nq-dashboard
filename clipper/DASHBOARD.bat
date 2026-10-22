@echo off
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1
set "PY="
py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY set "PY=python"
%PY% pipeline.py dashboard
if errorlevel 1 pause
