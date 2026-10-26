"""
Footage: where new material comes from, what has been seen, and what to do when the queue runs low.

  * YouTube channel / playlist sources a campaign names are polled with yt-dlp: only videos never seen before
    (the source ledger, kept in the workspace settings) and only newest N; every video must be inside the campaign's
    allowed_sources (campaign.source_allowed). Single-video links and local folders are untouched.
  * Drive folders are synced by cloud_runner.sync_drive; it records every file it saw in the same ledger.
  * Restock: when a campaign has less than RESTOCK_DAYS of content, older sources are queued again so the clipper
    can cut MORE moments from them, with a lower approval threshold for those clips, but only moments that do not
    overlap a clip already made (process_source already drops overlapping moments). Cached transcripts are reused,
    the media is fetched again only for the sources being re-clipped, and removed after (nothing big is kept).
  * Slideshow decks: the restock also asks slideshow.mine_decks for a larger pool of decks.

No network here except through the `lister` / `fetch` callables the caller passes (the real ones use yt-dlp / gdown).
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import campaign as cmp

LEDGER_KEY = "sources.ledger"
RESTOCK_DAYS = 3.0           # less than this many days of content = restock
RESTOCK_MIN_DROP = 10        # restocked clips may score this many points under the usual approval minimum
RESTOCK_FLOOR = 40.0
RESTOCK_COOLDOWN_DAYS = 7    # a source is not re-clipped more often than this
RESTOCK_MAX_SOURCES = 2      # per campaign per run
DECK_POOL = 120              # decks mined when restocking (normal runs: 40)
NEWEST = 3
LEDGER_KEEP = 500            # videos remembered per campaign


def ledger(ws) -> dict:
    led = ws.setting(LEDGER_KEY, None) or {}
    for k in ("youtube", "drive", "restock"):
        led.setdefault(k, {})
    return led


def save_ledger(ws, led: dict) -> None:
    ws.set_setting(LEDGER_KEY, led)


def is_list_source(src: str) -> bool:
    """A channel / playlist page (several videos), not one video. Same test the clipper uses to expand sources."""
    return bool(re.match(r"https?://", src)) and bool(
        re.search(r"/(@[^/]+|c/|channel/|user/|videos|streams|playlist|clips)", src)) and not re.search(
        r"watch\?v=|/videos/\d+|youtu\.be/|/shorts/", src)


def video_id(url: str, entry: dict | None = None) -> str:
    if entry and entry.get("id"):
        return str(entry["id"])
    m = re.search(r"(?:v=|youtu\.be/|/shorts/|/videos/)([\w-]{6,})", url or "")
    return m.group(1) if m else re.sub(r"\W+", "", url or "")[-40:]


def default_lister(url: str, n: int) -> list[dict]:
    """Newest `n` videos of a channel / playlist, listed flat (no downloads)."""
    import clipper as cl
    yt_dlp = cl.try_import("yt_dlp", "yt-dlp", True)
    opts = {"quiet": True, "no_warnings": True, "extract_flat": "in_playlist", "playlistend": n}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    entries = [e for e in (info.get("entries") or []) if e]
    if entries and entries[0].get("_type") == "playlist" and not entries[0].get("duration"):   # a channel root lists tabs
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(entries[0]["url"], download=False)
        entries = [e for e in (info.get("entries") or []) if e]
    return [{"id": e.get("id"), "url": e.get("url") or e.get("webpage_url"), "title": e.get("title")} for e in entries[:n]]


def poll_youtube(ws, c: dict, now: dt.datetime, newest: int = NEWEST, lister=None) -> dict:
    """New videos of the campaign's channel / playlist sources: {"urls": [...], "blocked": [...], "errors": [...]}."""
    lister = lister or default_lister
    led = ledger(ws)
    seen = led["youtube"].setdefault(c["name"], {})
    out = {"urls": [], "blocked": [], "errors": []}
    for src in c.get("sources") or []:
        if not is_list_source(src):
            continue
        ok, why = cmp.source_allowed(c, src)
        if not ok:
            out["blocked"].append(f"{src}: {why}")
            continue
        try:
            entries = lister(src, newest)
        except Exception as e:  # noqa: BLE001  (a listing that fails today is tried again next run)
            out["errors"].append(f"{src}: {str(e).splitlines()[0][:120] if str(e) else type(e).__name__}")
            continue
        for e in entries[:newest]:
            url = e.get("url") or ""
            if url and not url.startswith("http"):
                url = f"https://www.youtube.com/watch?v={url}"
            vid = video_id(url, e)
            if not url or vid in seen:
                continue
            ok, why = cmp.source_allowed(c, url, {"channel_url": src})
            seen[vid] = {"first_seen": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "title": e.get("title") or "",
                         "allowed": ok}
            if not ok:
                out["blocked"].append(f"{url}: {why}")
                continue
            out["urls"].append(url)
    if len(seen) > LEDGER_KEEP:   # the ledger only has to remember what the channel's newest listing can still show
        for k in sorted(seen, key=lambda k: seen[k].get("first_seen", ""))[:len(seen) - LEDGER_KEEP]:
            del seen[k]
    save_ledger(ws, led)
    for msg in out["errors"]:
        ws.event(f"{c['name']}: could not list {msg}", "warn")
    for msg in out["blocked"]:
        ws.event(f"{c['name']}: not clipped, {msg}", "warn")
    if out["urls"]:
        ws.event(f"{c['name']}: {len(out['urls'])} new video(s) on its channel", "info")
    return out


def explicit_sources(ws, c: dict, now: dt.datetime, lister=None) -> list[str] | None:
    """What cmd_import should be given for a campaign with channel / playlist sources: its local folders and
    single links as they are, plus only the NEW videos of each channel. None = no channel sources (use the default)."""
    srcs = c.get("sources") or []
    if not any(is_list_source(s) for s in srcs):
        return None
    base = Path(c.get("_path", ".")).parent
    keep = []
    for s in srcs:
        if is_list_source(s):
            continue
        keep.append(s if re.match(r"https?://", s) or Path(s).expanduser().is_absolute() else str(base / s))
    return keep + poll_youtube(ws, c, now, int((c.get("clip") or {}).get("latest") or NEWEST), lister)["urls"]


# ------------------------------------------------------------------ restock

def restock_flag(ws, source_id) -> dict | None:
    return ledger(ws)["restock"].get(str(source_id))


def lowered_min_score(ws, row, base: float) -> float:
    """The approval minimum for a clip: lower when it came from a restock pass over an older source."""
    return max(RESTOCK_FLOOR, base - RESTOCK_MIN_DROP) if restock_flag(ws, row["source_id"]) else base


def restock_candidates(ws, c: dict, now: dt.datetime, limit: int = RESTOCK_MAX_SOURCES) -> list:
    """Finished sources of this campaign that can be cut again (not re-clipped in the last week), most clips first.
    Sources whose clips were mostly rejected are skipped: more of the same would be rejected too."""
    led = ledger(ws)["restock"]
    rows = ws.q("SELECT s.*, (SELECT COUNT(*) FROM clips k WHERE k.source_id=s.id AND k.status != 'render_failed') nclips, "
                "(SELECT COUNT(*) FROM clips k WHERE k.source_id=s.id AND k.status='rejected') nrej "
                "FROM sources s WHERE s.campaign=? AND s.status='done' ORDER BY s.id", (c["name"],))
    out = []
    for r in rows:
        last = led.get(str(r["id"]))
        if last:
            try:
                when = dt.datetime.fromisoformat(last["ts"].replace("Z", "+00:00"))
            except ValueError:
                when = None
            if when and (now - when).days < RESTOCK_COOLDOWN_DAYS:
                continue
        if r["nclips"] and r["nrej"] / r["nclips"] > 0.5:
            continue
        out.append(r)
    out.sort(key=lambda r: -(r["nclips"] or 0))
    return out[:limit]


def restock(ws, c: dict, now: dt.datetime, supply_days: float, fetch=None, limit: int = RESTOCK_MAX_SOURCES) -> dict:
    """Queue older sources for another pass when supply is short. `fetch(row)` puts the media back where
    the source's input path says (cloud: Drive / yt-dlp) and returns True when it did; local files that still exist
    need no fetch. Returns {"queued": [source ids], "skipped": [reasons]}."""
    out = {"queued": [], "skipped": []}
    if supply_days >= RESTOCK_DAYS:
        return out
    led = ledger(ws)
    for r in restock_candidates(ws, c, now, limit):
        inp = r["input"] or ""
        needs_media = not re.match(r"https?://", inp) and not Path(inp).exists()
        if needs_media and not (fetch and fetch(r)):
            out["skipped"].append(f"source #{r['id']} {Path(inp).name}: media not available to re-clip")
            continue
        ws.set_source(r["id"], status="queued", attempts=0, next_attempt_at=None, last_error=None)
        led["restock"][str(r["id"])] = {"ts": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "supply_days": supply_days}
        out["queued"].append(r["id"])
        ws.event(f"restock: source #{r['id']} queued again for more moments ({supply_days} days of content left)", "info", r["id"])
    save_ledger(ws, led)
    return out


def drive_note(ws, campaign: str, fid: str, name: str, now: dt.datetime) -> None:
    """Remember a Drive file the cloud runner downloaded (so a restock can fetch it again by id)."""
    led = ledger(ws)
    led["drive"].setdefault(campaign, {})[fid] = {"name": name, "ts": now.strftime("%Y-%m-%dT%H:%M:%SZ")}
    save_ledger(ws, led)


def drive_id_for(ws, campaign: str, filename: str) -> str | None:
    stem = Path(filename).stem
    for fid, v in (ledger(ws)["drive"].get(campaign) or {}).items():
        if Path(v.get("name", "")).stem == stem:
            return fid
    return None
