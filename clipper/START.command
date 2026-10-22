#!/bin/bash
# Double-click to set up / re-run setup on macOS (Linux: run ./START.command in a terminal).
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"  # Homebrew isn't on PATH in a double-clicked window
PY=""
for c in python3 python3.13 python3.12 python3.11 python3.10; do
  # /usr/bin/python3 can be a stub that only offers to install Apple's developer tools: test that it really runs
  if command -v "$c" >/dev/null && "$c" -c "import sys; sys.exit(sys.version_info < (3, 10))" >/dev/null 2>&1; then
    PY="$(command -v "$c")"; break
  fi
done
if [ -z "$PY" ]; then
  echo "Python 3.10+ is missing: install it from https://www.python.org/downloads/ then double-click START again."
  read -r -p "Press Enter to close"; exit 1
fi
echo "Using Python: $PY ($("$PY" -c 'import sys; print(sys.version.split()[0])'))"
if ! command -v ffmpeg >/dev/null; then
  if command -v brew >/dev/null; then brew install ffmpeg; else echo "Install ffmpeg (https://brew.sh then: brew install ffmpeg)"; read -r; exit 1; fi
fi
# Homebrew's Python refuses plain pip installs (externally managed), hence the last fallback.
"$PY" -m pip install -q -r requirements.txt || "$PY" -m pip install -q --user -r requirements.txt \
  || "$PY" -m pip install -q --user --break-system-packages -r requirements.txt
"$PY" pipeline.py setup
read -r -p "Press Enter to close"
