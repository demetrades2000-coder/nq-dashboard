#!/bin/bash
# Double-click to set up / re-run setup on macOS (Linux: run ./START.command in a terminal).
cd "$(dirname "$0")" || exit 1
command -v python3 >/dev/null || { echo "Python 3 is missing: install it from https://www.python.org/downloads/"; read -r; exit 1; }
if ! command -v ffmpeg >/dev/null; then
  if command -v brew >/dev/null; then brew install ffmpeg; else echo "Install ffmpeg (https://brew.sh then: brew install ffmpeg)"; read -r; exit 1; fi
fi
python3 -m pip install -q -r requirements.txt || python3 -m pip install -q --user -r requirements.txt
python3 pipeline.py setup
read -r -p "Press Enter to close"
