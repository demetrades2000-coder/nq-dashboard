"""CI helper (Windows real-speech job): the run must have produced captioned clips from real Whisper speech."""
import json
import os
import sqlite3
import sys

ws = os.path.join(os.environ["RUNNER_TEMP"], "ws")
t = json.load(open(os.path.join(ws, "sources", "1", "transcript.json"), encoding="utf-8"))
print("transcript source:", t["source"], "|", len(t["words"]), "words:", " ".join(w["w"] for w in t["words"][:40]))
rows = sqlite3.connect(os.path.join(ws, "jobs.db")).execute("SELECT status, title, text FROM clips").fetchall()
for r in rows:
    print(r[0], "|", r[1], "|", (r[2] or "")[:120])
ok = t["source"] == "faster-whisper" and len(t["words"]) > 100 and any(
    r[0] == "pending_review" and ("rich" in (r[2] or "").lower() or "money" in (r[2] or "").lower()) for r in rows)
sys.exit(0 if ok else 1)
