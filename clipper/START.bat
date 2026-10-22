@echo off
rem Double-click to set up / re-run setup on Windows.
setlocal
cd /d "%~dp0"
set PYTHONUTF8=1

rem Find a real Python 3.10+ ("python" can be the Microsoft Store placeholder, which does nothing).
set "PY="
py -3 -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=python"
if not defined PY goto nopython
echo Using Python:
%PY% -c "import sys; print('  ' + sys.executable + '  (' + sys.version.split()[0] + ')')"

rem ffmpeg: install with winget if missing. winget only updates PATH for new windows, so add its folder here too.
where ffmpeg >nul 2>nul && goto haveffmpeg
where winget >nul 2>nul || goto nowinget
echo Installing ffmpeg...
winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
set "PATH=%PATH%;%LOCALAPPDATA%\Microsoft\WinGet\Links;%ProgramFiles%\WinGet\Links"
goto haveffmpeg
:nowinget
echo winget isn't available, so ffmpeg can't be installed automatically. Setup will try a built-in copy;
echo if it reports ffmpeg problems, install ffmpeg from https://www.gyan.dev/ffmpeg/builds/ and run START again.
:haveffmpeg

echo Installing Python packages (first time takes a few minutes)...
%PY% -m pip install -q --disable-pip-version-check --upgrade pip >nul 2>nul
%PY% -m pip install -q --disable-pip-version-check -r requirements.txt && goto packagesok
%PY% -m pip install -q --disable-pip-version-check --user -r requirements.txt && goto packagesok
echo.
echo Some packages failed to install together; installing them one by one...
for /f "usebackq eol=# delims=" %%p in ("requirements.txt") do %PY% -m pip install -q --disable-pip-version-check "%%p" || %PY% -m pip install -q --disable-pip-version-check --user "%%p" || echo   FAILED: "%%p"
echo If a package failed above, a very new Python may not be supported yet: install Python 3.12 or 3.13 from
echo https://www.python.org/downloads/ and run START again. Setup below lists what is still missing.
:packagesok

%PY% pipeline.py setup
echo.
pause
exit /b 0

:nopython
echo Python 3.10 or newer is not installed (or only the Microsoft Store placeholder is).
echo Get it from https://www.python.org/downloads/ and tick "Add python.exe to PATH" in the installer,
echo then double-click START again.
pause
exit /b 1
