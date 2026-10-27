#!/usr/bin/env python3
"""Build the claude.ai-hosted Planner page from index.html.

    python build_hosted.py index.html out.html

The claude.ai Artifact tool wraps a page in its own document skeleton, so this drops ours, drops the
home-screen files (manifest, icons) that page doesn't serve, and sets PLANNER_HOSTED so the app keeps its
data in the page's database (synced across every device signed into the Claude account).
"""
import re
import sys

src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
for t in ['<!doctype html>\n', '<html lang="en">\n', '<head>\n', '</head>\n', '<body>\n', '</body>\n', '</html>\n']:
    assert t in s, t
    s = s.replace(t, '', 1)
s = re.sub(r'<meta charset="utf-8">\n<meta name="viewport"[^\n]*\n', '', s)
s = re.sub(r'<link rel="(icon|apple-touch-icon|manifest)"[^\n]*\n', '', s)
s = re.sub(r'<meta name="(apple-[^"]*|robots)"[^\n]*\n', '', s)
assert s.count('<script>\n(() => {\n') == 1
s = s.replace('<script>\n(() => {\n', '<script>window.PLANNER_HOSTED = true;</script>\n<script>\n(() => {\n', 1)
open(out, "w", encoding="utf-8").write(s.rstrip() + "\n")
print(f"{out}: {len(s)} bytes")
