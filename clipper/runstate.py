"""
Run bookkeeping and self-healing for the cloud runner.

  * run history  (`runs.history`, newest last, max 100) and the chain heartbeat (`chain`): the dashboard compares
    `chain.stale_after` with the clock, because a run that never happens cannot report itself
  * the runner lock: a small JSON file in the state branch, pushed (no force) before the work starts, so two Actions
    runs cannot both post; a lock older than LOCK_TTL_MIN is considered dead
  * state trimming: old events and logs are summarised and deleted, files of rejected clips and orphan files are
    removed, the database is vacuumed; transcripts are always kept
  * with_retries(): retry a flaky call with exponential backoff (network, git push)
"""

from __future__ import annotations

import datetime as dt
import json
import os
import shutil
import time
from pathlib import Path

HISTORY_MAX = 100
LOCK_FILE = "runner_lock.json"      # not *.lock: the state branch ignores those
LOCK_TTL_MIN = 100
EVENT_KEEP_DAYS = 14
EVENT_KEEP_MAX = 1500
GAPS_MAX = 10


def iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse(s):
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


# ------------------------------------------------------------------ run history and the chain heartbeat

def record_run(ws, entry: dict) -> list[dict]:
    hist = (ws.setting("runs.history", None) or []) + [entry]
    hist = hist[-HISTORY_MAX:]
    ws.set_setting("runs.history", hist)
    return hist


def note_lines(lines: list[str], limit: int = 8, width: int = 160) -> list[str]:
    out = []
    for x in lines:
        x = " ".join(str(x).split())
        if x and x not in out:
            out.append(x[:width])
    return out[:limit]


def chain_update(ws, now: dt.datetime, every_h: float = 4.0) -> dict:
    """Heartbeat of the 4-hourly chain. `stale_after` = when the dashboard should call the chain stalled (2.5 cadences
    after this run). `gaps` lists earlier stalls (a gap of more than 2 cadences + 1 h between two runs)."""
    prev = ws.setting("chain", None) or {}
    last = parse(prev.get("last_run"))
    gaps = list(prev.get("gaps") or [])
    stalled = None
    if last:
        gap_h = (now - last).total_seconds() / 3600
        if gap_h > 2 * every_h + 1:
            stalled = round(gap_h, 1)
            gaps.append({"from": iso(last), "to": iso(now), "hours": stalled})
    chain = {"last_run": iso(now), "every_hours": every_h,
             "stale_after": iso(now + dt.timedelta(hours=2.5 * every_h)), "gaps": gaps[-GAPS_MAX:],
             "stalled_hours": stalled}
    ws.set_setting("chain", chain)
    return chain


# ------------------------------------------------------------------ lock

def read_lock(home: Path) -> dict | None:
    try:
        return json.loads((Path(home) / LOCK_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def lock_held_by_other(home: Path, run_id: str, now: dt.datetime, ttl_min: int = LOCK_TTL_MIN) -> dict | None:
    """The other runner's lock if it is still alive (younger than the TTL and not ours), else None."""
    lk = read_lock(home)
    if not lk or lk.get("run_id") == run_id:
        return None
    t = parse(lk.get("ts"))
    return lk if t and (now - t).total_seconds() < ttl_min * 60 else None


def write_lock(home: Path, run_id: str, now: dt.datetime) -> None:
    (Path(home) / LOCK_FILE).write_text(json.dumps({"run_id": run_id, "ts": iso(now)}), encoding="utf-8")


def clear_lock(home: Path) -> None:
    try:
        (Path(home) / LOCK_FILE).unlink()
    except OSError:
        pass


# ------------------------------------------------------------------ trimming

def _tree_bytes(p: Path) -> int:
    total = 0
    for root, _dirs, files in os.walk(p):
        for f in files:
            try:
                total += (Path(root) / f).stat().st_size
            except OSError:
                pass
    return total


def _rm(p: Path) -> int:
    try:
        if p.is_dir():
            n = _tree_bytes(p)
            shutil.rmtree(p, ignore_errors=True)
            return n
        n = p.stat().st_size
        p.unlink()
        return n
    except OSError:
        return 0


def trim_state(ws, home: Path | None = None, now: dt.datetime | None = None) -> dict:
    """Keep the state branch small: returns what was removed. Never touches transcripts or unposted clips."""
    now = now or dt.datetime.now(dt.timezone.utc)
    freed, report = 0, {"events_deleted": 0, "files_deleted": 0}
    # 1. events: summarise by day, keep the newest EVENT_KEEP_MAX and anything younger than EVENT_KEEP_DAYS
    cutoff = (now - dt.timedelta(days=EVENT_KEEP_DAYS)).replace(tzinfo=None).isoformat(timespec="seconds")
    old = ws.q("SELECT substr(ts,1,10) day, level, COUNT(*) n FROM events WHERE ts < ? GROUP BY day, level", (cutoff,))
    if old:
        arch = ws.setting("events.archive", None) or {}
        for r in old:
            d = arch.setdefault(r["day"], {})
            d[r["level"]] = d.get(r["level"], 0) + r["n"]
        ws.set_setting("events.archive", dict(sorted(arch.items())[-120:]))
        report["events_deleted"] += ws.q("SELECT COUNT(*) n FROM events WHERE ts < ?", (cutoff,))[0]["n"]
        ws.x("DELETE FROM events WHERE ts < ?", (cutoff,))
    extra = ws.q("SELECT COUNT(*) n FROM events")[0]["n"] - EVENT_KEEP_MAX
    if extra > 0:
        ws.x("DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY id LIMIT ?)", (extra,))
        report["events_deleted"] += extra
    # 2. files of clips that will never be posted
    for r in ws.q("SELECT id, file, ready_file FROM clips WHERE status IN ('rejected','render_failed')"):
        for col in ("file", "ready_file"):
            v = r[col]
            if v and Path(v).exists():
                freed += _rm(Path(v))
                report["files_deleted"] += 1
    # 3. ready/ files nothing points at any more (older than 3 days)
    ready = ws.home / "ready"
    if ready.exists():
        live = {str(Path(r["v"]).resolve()) for r in ws.q(
            "SELECT ready_file v FROM clips WHERE ready_file IS NOT NULL AND status IN ('approved','pending_review')")}
        for f in ready.rglob("*"):
            if f.is_file() and f.suffix.lower() in (".mp4", ".jpg", ".png") and time.time() - f.stat().st_mtime > 3 * 86400:
                if not any(str(f.resolve()).startswith(v) for v in live):
                    freed += _rm(f)
                    report["files_deleted"] += 1
    # 4. big non-transcript files left in source folders (audio, temp downloads); transcripts and metadata stay
    src = ws.home / "sources"
    if src.exists():
        for f in src.rglob("*"):
            if f.is_file() and f.stat().st_size > 20_000_000 and f.suffix.lower() not in (".json", ".srt", ".vtt", ".txt"):
                freed += _rm(f)
                report["files_deleted"] += 1
    if report["events_deleted"] > 500:
        try:
            ws.db.execute("VACUUM")
        except Exception:  # noqa: BLE001
            pass
    report["freed_mb"] = round(freed / 1e6, 1)
    if home:
        report["state_mb"] = round(_tree_bytes(Path(home)) / 1e6, 1)
    return report


# ------------------------------------------------------------------ retries

def with_retries(fn, tries: int = 3, base: float = 2.0, sleep=time.sleep, retry_on=(OSError, TimeoutError, ConnectionError)):
    """Call fn(); on a transient error wait base, 2*base, ... and try again. The last error is raised."""
    last = None
    for i in range(tries):
        try:
            return fn()
        except retry_on as e:
            last = e
            if i < tries - 1:
                sleep(base * (2 ** i))
    raise last
