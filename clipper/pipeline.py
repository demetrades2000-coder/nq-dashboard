#!/usr/bin/env python3
"""
Clipping pipeline for paid clipping campaigns: import permitted sources, find moments,
render vertical clips with captions, and queue them for human review. Nothing is
published and no money is spent without an explicit approval step.

  python pipeline.py campaign-check campaigns/acme.json
  python pipeline.py import campaigns/acme.json              # sources from the campaign brief
  python pipeline.py run                                     # process queued jobs
  python pipeline.py status
  python pipeline.py review                                  # local review page: approve / reject / fix captions
  python pipeline.py posted 12 https://youtube.com/shorts/...  # after YOU post an approved clip
  python pipeline.py budget --monthly 5                      # approve up to $5/month of Claude ranking
  python pipeline.py secrets set anthropic                   # store the API key in the OS keychain

State lives in a workspace folder (default ./clipper-workspace, or $CLIPPER_HOME).
"""

from __future__ import annotations

import argparse
import datetime as dt
import getpass
import hashlib
import html
import json
import os
import re
import secrets as pysecrets
import shutil
import sqlite3
import sys
import threading
import time
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402
import clipper as cl  # noqa: E402
import tracker  # noqa: E402

KEYRING_SERVICE = "money-clipper"
MAX_ATTEMPTS = 4
BACKOFF_MIN = [0, 5, 30, 120]  # minutes before attempt n+1 after a temporary failure
LOW_CONF = 0.6

# ---------------------------------------------------------------- workspace & db

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY, campaign TEXT, campaign_file TEXT, input TEXT, canonical TEXT,
  transcript TEXT, title TEXT, uploader TEXT, status TEXT, attempts INTEGER DEFAULT 0,
  next_attempt_at TEXT, last_error TEXT, workdir TEXT, video TEXT, meta TEXT, args TEXT,
  created TEXT, updated TEXT);
CREATE INDEX IF NOT EXISTS src_canon ON sources(campaign, canonical);
CREATE TABLE IF NOT EXISTS clips (
  id INTEGER PRIMARY KEY, source_id INTEGER, campaign TEXT, rank INTEGER, start REAL, end_ REAL,
  title TEXT, caption TEXT, hashtags TEXT, posts TEXT, checks TEXT, flags TEXT, words TEXT,
  context_before TEXT, context_after TEXT, text TEXT, score REAL, file TEXT, status TEXT,
  review_note TEXT, reviewed_at TEXT, ready_file TEXT, post_url TEXT, posted_at TEXT, created TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS clip_post ON clips(post_url) WHERE post_url IS NOT NULL;
CREATE TABLE IF NOT EXISTS spend (id INTEGER PRIMARY KEY, ts TEXT, model TEXT, tokens_in INTEGER,
  tokens_out INTEGER, usd REAL, purpose TEXT, source_id INTEGER);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, ts TEXT, level TEXT, source_id INTEGER,
  clip_id INTEGER, message TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
"""


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


class WS:
    def __init__(self, home: str | None):
        self.home = Path(home or os.environ.get("CLIPPER_HOME") or "clipper-workspace").expanduser().resolve()
        for d in ("sources", "clips", "ready", "logs"):
            (self.home / d).mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.home / "jobs.db", timeout=30, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)
        self.lock = threading.Lock()

    def close(self) -> None:
        self.db.close()

    def q(self, sql: str, args=()) -> list[sqlite3.Row]:
        with self.lock:
            return self.db.execute(sql, args).fetchall()

    def x(self, sql: str, args=()) -> int:
        with self.lock:
            cur = self.db.execute(sql, args)
            self.db.commit()
            return cur.lastrowid

    def setting(self, key: str, default=None):
        r = self.q("SELECT value FROM settings WHERE key=?", (key,))
        return json.loads(r[0]["value"]) if r else default

    def set_setting(self, key: str, value) -> None:
        self.x("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, json.dumps(value)))

    def event(self, msg: str, level: str = "info", source_id=None, clip_id=None) -> None:
        msg = cl.redact(msg)
        self.x("INSERT INTO events(ts, level, source_id, clip_id, message) VALUES(?,?,?,?,?)",
               (now(), level, source_id, clip_id, msg))
        cl.log(msg, {"info": "info", "warn": "warn", "error": "err", "ok": "ok"}.get(level, "info"))

    def set_source(self, sid: int, **kw) -> None:
        kw["updated"] = now()
        cols = ", ".join(f"{k}=?" for k in kw)
        self.x(f"UPDATE sources SET {cols} WHERE id=?", (*kw.values(), sid))


# ---------------------------------------------------------------- credentials

def keyring_mod():
    try:
        import keyring  # noqa: F401
        return keyring
    except Exception:
        return None


def load_credentials() -> str:
    """Puts the Anthropic key in this process's environment only. Returns where it came from."""
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return "environment"
    kr = keyring_mod()
    if kr:
        try:
            v = kr.get_password(KEYRING_SERVICE, "anthropic")
            if v:
                os.environ["ANTHROPIC_API_KEY"] = v
                return "OS keychain"
        except Exception:
            pass
    return "none"


def cmd_secrets(ws: WS, a) -> int:
    kr = keyring_mod()
    if a.action == "status":
        print(f"Anthropic API key: {load_credentials()}")
        print("Cookies: pass --cookies-from-browser at run time; cookies are never copied into the workspace.")
        return 0
    if not kr:
        print("The 'keyring' package isn't available, so there's no OS keychain to store secrets in.\n"
              "Install it (pip install keyring) or export ANTHROPIC_API_KEY in your shell session. "
              "Secrets are never written to plain files by this tool.")
        return 1
    if a.action == "set":
        val = getpass.getpass("Paste the Anthropic API key (input hidden): ").strip()
        if not val:
            print("nothing entered; unchanged")
            return 1
        kr.set_password(KEYRING_SERVICE, "anthropic", val)
        print("stored in the OS keychain")
    elif a.action == "delete":
        try:
            kr.delete_password(KEYRING_SERVICE, "anthropic")
            print("deleted")
        except Exception:
            print("nothing stored")
    return 0


# ---------------------------------------------------------------- spending

class LedgerGuard:
    """Claude spend is allowed only inside a budget the user approved with `pipeline.py budget`."""

    def __init__(self, ws: WS, source_id: int | None = None):
        self.ws, self.source_id = ws, source_id

    def month_spent(self) -> float:
        start = dt.date.today().replace(day=1).isoformat()
        r = self.ws.q("SELECT COALESCE(SUM(usd),0) AS s FROM spend WHERE ts >= ?", (start,))
        return float(r[0]["s"])

    def allow(self, worst_usd: float) -> tuple[bool, str]:
        cap = float(self.ws.setting("spend.monthly_cap_usd", 0) or 0)
        per_call = float(self.ws.setting("spend.per_call_cap_usd", 0.25) or 0)
        if cap <= 0:
            return False, "AI ranking off: no monthly budget approved (run: pipeline.py budget --monthly 5)"
        if worst_usd > per_call:
            return False, f"AI call could cost up to ${worst_usd:.3f}, above the per-call cap ${per_call:.2f}"
        spent = self.month_spent()
        if spent + worst_usd > cap:
            return False, f"monthly AI budget reached (${spent:.2f} of ${cap:.2f} used)"
        return True, ""

    def record(self, model: str, usd: float, tokens_in: int, tokens_out: int, purpose: str) -> None:
        self.ws.x("INSERT INTO spend(ts, model, tokens_in, tokens_out, usd, purpose, source_id) VALUES(?,?,?,?,?,?,?)",
                  (now(), model, tokens_in, tokens_out, usd, purpose, self.source_id))


def cmd_budget(ws: WS, a) -> int:
    if a.off:
        ws.set_setting("spend.monthly_cap_usd", 0)
        print("AI spending turned off.")
    if a.monthly is not None:
        if a.monthly < 0 or a.monthly > 500:
            print("monthly cap must be between 0 and 500 USD")
            return 1
        ws.set_setting("spend.monthly_cap_usd", a.monthly)
        ws.set_setting("spend.approved_at", now())
        print(f"Approved up to ${a.monthly:.2f}/month of Claude API spend for clip ranking.")
    if a.per_call is not None:
        ws.set_setting("spend.per_call_cap_usd", max(0.0, a.per_call))
    g = LedgerGuard(ws)
    print(f"Monthly cap: ${float(ws.setting('spend.monthly_cap_usd', 0) or 0):.2f}  "
          f"per call: ${float(ws.setting('spend.per_call_cap_usd', 0.25)):.2f}  "
          f"spent this month: ${g.month_spent():.4f}")
    print("Claude ranking is the only thing that costs money. Transcription runs locally (free), "
          "and nothing is ever bought or boosted.")
    return 0


# ---------------------------------------------------------------- errors & retries

class Blocked(Exception):
    """Permission/policy stop: never retried automatically."""


def classify(e: BaseException) -> tuple[str, str]:
    """(kind, human message) where kind is 'temporary', 'permanent' or 'blocked'."""
    if isinstance(e, Blocked):
        return "blocked", str(e)
    m = cl.redact(str(e))
    low = m.lower()
    rules = [
        (("private video",), "permanent", "The video is private. Use only videos the campaign makes available."),
        (("members-only", "join this channel"), "permanent",
         "Members-only video: skip it unless the campaign gives you the file."),
        (("video unavailable", "has been removed", "404"), "permanent", "The video is unavailable or was removed."),
        (("sign in to confirm", "not a bot", "login required", "age-restricted", "confirm your age"), "permanent",
         "The site asked for a login or bot check. Re-run with --cookies-from-browser chrome, or download "
         "the file yourself and import the file path."),
        (("geo", "not available in your country"), "permanent", "Geo-blocked in your region."),
        (("no space left",), "permanent", "Disk is full. Run `pipeline.py cleanup` or free space."),
        (("could not read the video", "invalid data found", "moov atom"), "permanent",
         "The video file is corrupt or not a video. Re-download it."),
        (("ffmpeg not found",), "permanent", "ffmpeg is missing. Install it (winget/brew/apt install ffmpeg)."),
        (("429", "too many requests", "rate limit"), "temporary", "Rate-limited by the site; will retry later."),
        (("timed out", "timeout", "connection", "temporarily", "getaddrinfo", "name or service", "network",
          "http error 5", "503", "502", "500", "proxy", "reset by peer", "eof occurred"), "temporary",
         "Network problem; will retry automatically."),
    ]
    for keys, kind, msg in rules:
        if any(k in low for k in keys):
            return kind, f"{msg} (detail: {m.splitlines()[0][:200] if m else type(e).__name__})"
    return "permanent", f"{type(e).__name__}: {m.splitlines()[0][:300] if m else ''} (run with CLIPPER_DEBUG=1 for details)"


# ---------------------------------------------------------------- dedup helpers

def file_fingerprint(p: Path) -> str:
    h = hashlib.sha256()
    size = p.stat().st_size
    h.update(str(size).encode())
    with p.open("rb") as f:
        h.update(f.read(8 << 20))
        if size > 16 << 20:
            f.seek(-(8 << 20), os.SEEK_END)
            h.update(f.read())
    return "file:" + h.hexdigest()[:32]


def shingles(text: str, n: int = 5) -> set:
    toks = [cl.norm(t) for t in text.split()]
    toks = [t for t in toks if t]
    return {" ".join(toks[i:i + n]) for i in range(max(0, len(toks) - n + 1))}


def jaccard(a: set, b: set) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


# ---------------------------------------------------------------- import

def load_campaign_checked(path: str) -> dict:
    c = cmp.load(path)
    probs = cmp.permission_problems(c)
    if probs:
        raise Blocked("Campaign can't be used yet:\n  - " + "\n  - ".join(probs))
    return c


def cmd_campaign_check(ws: WS, a) -> int:
    try:
        c = cmp.load(a.campaign)
    except Exception as e:
        print(f"Can't read {a.campaign}: {e}")
        return 1
    probs = cmp.permission_problems(c)
    perm = c.get("permission") or {}
    print(f"Campaign: {c['name']}\n  program: {perm.get('program')}\n  page: {perm.get('campaign_url')}\n"
          f"  verified on: {perm.get('verified_on')}\n  allowed sources: {perm.get('allowed_sources')}\n"
          f"  pays: ${float(c.get('cpm') or 0):.2f}/1k views, fee {c.get('fee_pct', 0)}%, "
          f"cap ${c.get('max_payout_per_clip') or 'none'}")
    if not (c.get("disclosure") or {}):
        print("  ! no disclosure configured: add the campaign's required disclosure wording")
    if probs:
        print("NOT READY:\n  - " + "\n  - ".join(probs))
        return 1
    print("OK: permission recorded and current.")
    return 0


def probe_remote(url: str, args) -> dict:
    yt_dlp = cl.try_import("yt_dlp", "yt-dlp", True)
    opts = {"quiet": True, "no_warnings": True, "skip_download": True, "noplaylist": True,
            "logger": tracker._Silent()}
    if getattr(args, "cookies_from_browser", None):
        opts["cookiesfrombrowser"] = (args.cookies_from_browser,)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return {k: info.get(k) for k in ("id", "extractor_key", "title", "uploader", "uploader_id", "channel_url",
                                     "uploader_url", "webpage_url", "duration", "availability")}


def cmd_import(ws: WS, a) -> int:
    try:
        c = load_campaign_checked(a.campaign)
    except Blocked as e:
        print(e)
        return 1
    sources = list(a.sources) or list(c.get("sources") or [])
    if not sources:
        print("No sources given and the campaign lists none.")
        return 1
    if a.transcript and len(sources) != 1:
        print("--transcript can only be used with a single source")
        return 1
    ns = argparse.Namespace(no_install=False, cookies_from_browser=a.cookies_from_browser)
    sources = cl.expand_sources(sources, max(1, a.latest or c["clip"].get("latest", 3)), ns)
    added = 0
    for src in sources:
        status, canon, meta, err = "queued", None, {}, None
        p = Path(src).expanduser()
        if p.exists():
            src = str(p.resolve())
            canon = file_fingerprint(p)
            ok, why = cmp.source_allowed(c, src)
            if not ok:
                status, err = "blocked", f"Local file {why}. Add a 'file:<folder>' entry only for files the campaign gave you."
        elif re.match(r"https?://", src):
            ok, why = cmp.source_allowed(c, src)
            try:
                meta = probe_remote(src, a)
                canon = f"{meta.get('extractor_key')}:{meta.get('id')}"
                ok, why = cmp.source_allowed(c, src, meta)
                if meta.get("availability") in ("private", "subscriber_only", "premium_only", "needs_auth"):
                    status, err = "failed", f"Video availability is '{meta['availability']}'; it can't be clipped."
            except Exception as e:  # noqa: BLE001
                kind, msg = classify(e)
                if kind == "permanent":
                    status, err = "failed", msg
                else:  # offline right now: keep it queued, the permission check repeats after download
                    err = f"Couldn't check the video yet ({msg}); will check again at run time."
            if not ok and status == "queued" and meta:
                status, err = "blocked", f"Source channel {why}"
            elif not ok and status == "queued" and not meta and not err:
                status, err = "blocked", f"Source {why}"
        else:
            status, err = "failed", "Not a URL and no such file."
        canon = canon or "url:" + cmp._norm_url(src)
        dup = status == "queued" and ws.q("SELECT id, status FROM sources WHERE campaign=? AND canonical=? AND status NOT IN ('failed','blocked')",
                   (c["name"], canon))
        if dup and not a.force:
            print(f"duplicate: {src} is already job #{dup[0]['id']} ({dup[0]['status']}); use --force to re-import")
            continue
        sid = ws.x("""INSERT INTO sources(campaign, campaign_file, input, canonical, transcript, title, uploader, status,
                      last_error, meta, created, updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                   (c["name"], c["_path"], src, canon, str(Path(a.transcript).resolve()) if a.transcript else None,
                    meta.get("title") or Path(src).stem, meta.get("uploader") or "", status, err,
                    json.dumps(meta), now(), now()))
        ws.event(f"job #{sid} {status}: {src}" + (f" ({err})" if err else ""),
                 "warn" if status != "queued" else "info", source_id=sid)
        added += status == "queued"
    print(f"{added} job(s) queued. Next: python pipeline.py run")
    return 0


# ---------------------------------------------------------------- processing

DANGLING = {"that", "this", "it", "he", "she", "they", "so", "and", "but", "because", "which", "those", "these",
            "then", "also", "or", "plus", "him", "her", "them", "there"}
_NUM = r"(\$\s?\d[\d,.]*\s?(k|m|b|million|thousand|billion)?|\d[\d,.]*\s?(k|m)?\s?(dollars|bucks|grand)" \
       r"|\b(hundred|thousand|million|billion)s?\s+(dollars|bucks|a\s+(month|year|week|day)))"
_PERIOD = r"(a|per|every|each|in\s+\w+)\s+(months?|years?|weeks?|days?)"
INCOME_RE = re.compile(
    _NUM + r"|\b(made|make|makes|making|earn|earned|earns|earning|profit|profits|revenue|income|cash\s?flow)\b.{0,50}"
    r"\b(months?|years?|weeks?|days?|million|thousand|figures|grand)\b|\b(six|seven|eight)[\s-]figures?\b|" + _PERIOD
    + r"\s+in\s+(revenue|profit|income|sales)", re.I)


def clip_args(c: dict, ws: WS, a) -> argparse.Namespace:
    parser = cl.build_parser()
    parser.set_defaults(**cmp.cli_defaults(c))
    args = parser.parse_args([])
    args.preset = getattr(a, "preset", None) or args.preset
    args.model = getattr(a, "model", None) or args.model
    args.cookies_from_browser = getattr(a, "cookies_from_browser", None)
    args.keep_source = True
    args.camp = c
    args.min, args.max = max(3.0, args.min), max(args.min + 2, args.max)
    return args


def extend_for_context(clip: cl.Clip, sents: list, args, punctuated: bool) -> list[str]:
    notes = []
    first = cl.norm(clip.words[0].w) if clip.words else ""
    starts_low = punctuated and clip.words and clip.words[0].w[:1].islower()
    if first in DANGLING or starts_low:
        prev = [s for s in sents if s.e <= clip.s + 0.01 and clip.s - s.s <= 15]
        if prev and clip.e - prev[-1].s <= args.max + 10:
            clip.s, clip.words = prev[-1].s, prev[-1].words + clip.words
            notes.append("start extended by one sentence so the setup is included")
        else:
            notes.append(f"starts with '{clip.words[0].w}': may depend on earlier context")
    if punctuated and clip.words and not re.search(r"[.!?]$", clip.words[-1].w):
        nxt = [s for s in sents if s.s >= clip.e - 0.01 and s.e - clip.e <= 12]
        if nxt and nxt[0].e - clip.s <= args.max + 10:
            clip.e, clip.words = nxt[0].e, clip.words + nxt[0].words
            notes.append("end extended to finish the sentence")
        else:
            notes.append("ends mid-sentence")
    return notes


def process_source(ws: WS, row: sqlite3.Row, a) -> None:
    sid = row["id"]
    c = load_campaign_checked(row["campaign_file"])
    args = clip_args(c, ws, a)
    work = ws.home / "sources" / str(sid)
    work.mkdir(parents=True, exist_ok=True)

    ws.set_source(sid, status="fetching")
    video, meta = cl.fetch(row["input"], work, args)
    if not Path(row["input"]).exists():  # remote: confirm the channel after download too
        ok, why = cmp.source_allowed(c, row["input"], meta)
        if not ok:
            for f in work.glob("source.*"):
                f.unlink(missing_ok=True)
            raise Blocked(f"Downloaded video's channel {why}")
    canon = row["canonical"]
    if meta.get("id") and meta.get("extractor"):
        canon = f"{meta['extractor'].split(':')[0].title()}:{meta['id']}" if canon.startswith("url:") else canon
    ws.set_source(sid, video=str(video), workdir=str(work), meta=json.dumps(meta), canonical=canon,
                  title=meta.get("title") or row["title"], uploader=meta.get("uploader") or row["uploader"])

    info = cl.probe(video)
    if info.duration <= 0:
        raise RuntimeError("could not read the video (corrupt or unsupported file)")
    if info.duration < args.min:
        args.min = max(3.0, info.duration * 0.5)
        args.max = max(args.min + 1, min(args.max, info.duration))

    ws.set_source(sid, status="transcribing")
    args.transcript = row["transcript"]
    audio = cl.extract_audio(video, work) if info.has_audio else None
    words, tsrc = cl.transcribe(video, audio, work, args)
    curve = cl.energy_curve(audio)

    ws.set_source(sid, status="selecting")
    if words:
        cands = cl.candidates_from_words(words, args)
        for k in cands:
            cl.score_clip(k, curve, args)
        cands = [k for k in cands if not cmp.banned_hit(c, k.text)] or []
    else:
        cands = cl.candidates_from_energy(curve, info.duration, args)

    # Duplicate moments: overlap with this source's earlier clips, or near-identical speech in this campaign
    existing = ws.q("SELECT source_id, start, end_, text FROM clips WHERE campaign=? AND status != 'render_failed'",
                    (c["name"],))
    ex_sh = [(r["source_id"], r["start"], r["end_"], shingles(r["text"] or "")) for r in existing]
    fresh, dropped = [], 0
    for k in cands:
        ksh = shingles(k.text) if k.words else set()
        dup = False
        for src_id, s0, e0, sh in ex_sh:
            if src_id == sid and min(k.e, e0) - max(k.s, s0) > 0.5 * (k.e - k.s):
                dup = True
            elif ksh and jaccard(ksh, sh) > 0.5:
                dup = True
            if dup:
                break
        if dup:
            dropped += 1
        else:
            fresh.append(k)
    if dropped:
        ws.event(f"job #{sid}: skipped {dropped} candidate windows that duplicate clips already made", "info", sid)
    if not fresh:
        ws.event(f"job #{sid}: no new moments left after duplicate filtering", "warn", sid)
        ws.set_source(sid, status="done")
        return

    fresh = cl.ai_rerank(fresh, meta, args, guard=LedgerGuard(ws, sid))
    chosen, chosen_sh = [], []
    for k in sorted(fresh, key=lambda k: k.score, reverse=True):  # like cl.pick, plus same-run speech dedup
        if len(chosen) >= args.clips:
            break
        if any(not (k.e + 3 <= o.s or k.s >= o.e + 3) for o in chosen):
            continue
        ksh = shingles(k.text) if k.words else set()
        if ksh and any(jaccard(ksh, sh) > 0.5 for sh in chosen_sh):
            continue
        chosen.append(k)
        chosen_sh.append(ksh)
    sents = cl.sentences(words) if words else []
    punctuated = bool(words) and sum(bool(re.search(r"[.?!]$", w.w)) for w in words) / len(words) > 0.02

    ws.set_source(sid, status="rendering")
    outdir = ws.home / "clips" / cmp.slug(c) / str(sid)
    outdir.mkdir(parents=True, exist_ok=True)
    font = cl.pick_font(args.font)
    made = 0
    for i, k in enumerate(chosen, 1):
        notes = extend_for_context(k, sents, args, punctuated) if k.words else []
        cl.make_copy(k, meta, c)
        if k.title and INCOME_RE.search(k.title):
            k.title = f"“{k.title}”"  # quoted: it's the speaker's claim, not ours
        k.posts = cmp.platform_posts(c, k.title, k.caption, k.hashtags)  # type: ignore[attr-defined]
        before = " ".join(s.text for s in sents if s.e <= k.s)[-400:]
        after = " ".join(s.text for s in sents if s.s >= k.e)[:400]
        try:
            path = cl.render(video, info, k, i, outdir, font, args)
        except Exception as e:  # noqa: BLE001
            path = None
            ws.event(f"job #{sid} clip {i}: render crashed: {cl.redact(str(e))}", "error", sid)
        flags = [{"level": "info", "msg": n} for n in notes if "extended" in n]
        flags += [{"level": "warn", "msg": n} for n in notes if "extended" not in n]
        low = [w.w for w in k.words if getattr(w, "p", 1.0) < LOW_CONF]
        if low:
            flags.append({"level": "warn", "msg": f"{len(low)} word(s) the recognizer was unsure of: "
                                                  f"{', '.join(low[:8])}. Check names and numbers."})
        if tsrc in ("auto subtitles", "none"):
            flags.append({"level": "warn", "msg": f"transcript from {tsrc}: proofread the captions"})
        if INCOME_RE.search(k.text):
            flags.append({"level": "warn", "msg": "contains an earnings or results claim. Keep it attributed to "
                                                  "the speaker; don't caption it as typical or guaranteed."})
        out_dur = getattr(k, "out_duration", k.e - k.s)
        checks = cmp.compliance(c, out_dur, k.text, k.posts, getattr(k, "tagged", False)) if path else []
        ws.x("""INSERT INTO clips(source_id, campaign, rank, start, end_, title, caption, hashtags, posts, checks, flags,
                words, context_before, context_after, text, score, file, status, created)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
             (sid, c["name"], i, k.s, k.e, k.title, k.caption, json.dumps(k.hashtags), json.dumps(k.posts),
              json.dumps([{"ok": ok, "check": t} for ok, t in checks]), json.dumps(flags),
              json.dumps([w.__dict__ for w in k.words]), before, after, k.text, k.score,
              str(path) if path else None, "pending_review" if path else "render_failed", now()))
        made += bool(path)
    ws.event(f"job #{sid}: {made}/{len(chosen)} clips ready for review", "ok" if made else "warn", sid)
    ws.set_source(sid, status="done" if made else "failed",
                  last_error=None if made else "no clip could be rendered (see events)")


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":  # os.kill(pid, 0) would terminate the process on Windows
        import subprocess
        out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True).stdout
        return str(pid) in out
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


class RunLock:
    def __init__(self, ws: WS):
        self.path = ws.home / ".run.lock"

    def __enter__(self):
        if self.path.exists():
            try:
                pid = int(self.path.read_text().strip() or 0)
            except ValueError:
                pid = 0
            if pid_alive(pid) and pid != os.getpid():
                raise SystemExit(f"Another run is in progress (pid {pid}). If that's wrong, delete {self.path}")
        self.path.write_text(str(os.getpid()))
        return self

    def __exit__(self, *exc):
        self.path.unlink(missing_ok=True)


def cmd_run(ws: WS, a) -> int:
    cl.Tools.setup(True)
    cred = load_credentials()
    guard = LedgerGuard(ws)
    cap = float(ws.setting("spend.monthly_cap_usd", 0) or 0)
    print(f"AI ranking: {'ON' if cap > 0 and cred != 'none' else 'OFF'} "
          f"(budget ${cap:.2f}/month, spent ${guard.month_spent():.4f}; credentials: {cred})")
    with RunLock(ws):
        done = 0
        while a.limit is None or done < a.limit:
            rows = ws.q("""SELECT * FROM sources WHERE status='queued'
                           OR (status='retry_wait' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
                           ORDER BY id LIMIT 1""", (now(),))
            if not rows:
                break
            row = rows[0]
            sid, attempt = row["id"], row["attempts"] + 1
            ws.set_source(sid, attempts=attempt, last_error=None)
            ws.event(f"job #{sid} attempt {attempt}/{MAX_ATTEMPTS}: {row['input']}", "info", sid)
            try:
                process_source(ws, ws.q("SELECT * FROM sources WHERE id=?", (sid,))[0], a)
            except KeyboardInterrupt:
                ws.set_source(sid, status="queued", last_error="interrupted")
                raise
            except SystemExit:
                raise
            except BaseException as e:  # noqa: BLE001
                kind, msg = classify(e)
                if os.environ.get("CLIPPER_DEBUG"):
                    traceback.print_exc()
                if kind == "temporary" and attempt < MAX_ATTEMPTS:
                    wait = BACKOFF_MIN[min(attempt, len(BACKOFF_MIN) - 1)]
                    nxt = (dt.datetime.now() + dt.timedelta(minutes=wait)).isoformat(timespec="seconds")
                    ws.set_source(sid, status="retry_wait", next_attempt_at=nxt, last_error=msg)
                    ws.event(f"job #{sid}: {msg} Next try after {nxt}.", "warn", sid)
                else:
                    status = "blocked" if kind == "blocked" else "failed"
                    if kind == "temporary":
                        msg += f" Gave up after {attempt} attempts; `pipeline.py retry {sid}` to try again."
                    ws.set_source(sid, status=status, last_error=msg)
                    ws.event(f"job #{sid} {status}: {msg}", "error", sid)
            done += 1
    waiting = ws.q("SELECT COUNT(*) n FROM sources WHERE status='retry_wait'")[0]["n"]
    pending = ws.q("SELECT COUNT(*) n FROM clips WHERE status='pending_review'")[0]["n"]
    print(f"Processed {done} job(s). {pending} clip(s) waiting for review"
          + (f"; {waiting} job(s) will retry later (run again)" if waiting else "") + ".")
    if pending:
        print("Next: python pipeline.py review")
    return 0


def cmd_retry(ws: WS, a) -> int:
    rows = ws.q("SELECT * FROM sources WHERE id=?", (a.id,))
    if not rows:
        print(f"no job #{a.id}")
        return 1
    if rows[0]["status"] not in ("failed", "retry_wait", "blocked"):
        print(f"job #{a.id} is {rows[0]['status']}; only failed/blocked/waiting jobs can be retried")
        return 1
    ws.set_source(a.id, status="queued", attempts=0, next_attempt_at=None, last_error=None)
    print(f"job #{a.id} re-queued")
    return 0


def cmd_status(ws: WS, a) -> int:
    rows = ws.q("SELECT * FROM sources ORDER BY id DESC LIMIT ?", (a.n,))
    print(f"Workspace: {ws.home}")
    print(f"{'job':>4}  {'status':<13} {'try':>3}  source")
    for r in reversed(rows):
        print(f"{r['id']:>4}  {r['status']:<13} {r['attempts']:>3}  {(r['title'] or r['input'])[:70]}")
        if r["last_error"]:
            print(f"{'':>24}! {r['last_error'][:220]}")
    counts = ws.q("SELECT status, COUNT(*) n FROM clips GROUP BY status")
    print("Clips: " + (", ".join(f"{r['status']}={r['n']}" for r in counts) or "none"))
    print(f"AI spend this month: ${LedgerGuard(ws).month_spent():.4f} of "
          f"${float(ws.setting('spend.monthly_cap_usd', 0) or 0):.2f} approved")
    return 0


# ---------------------------------------------------------------- review actions

def approve_clip(ws: WS, clip_id: int, note: str = "", override: bool = False) -> tuple[bool, str]:
    r = ws.q("SELECT * FROM clips WHERE id=?", (clip_id,))
    if not r:
        return False, f"no clip #{clip_id}"
    r = r[0]
    if r["status"] not in ("pending_review", "needs_fix"):
        return False, f"clip #{clip_id} is {r['status']}"
    failing = [ch["check"] for ch in json.loads(r["checks"] or "[]") if not ch["ok"]]
    if failing and not override:
        return False, "campaign rules not met: " + "; ".join(failing) + " (fix, or approve with override + note)"
    if failing and not note.strip():
        return False, "an override needs a note explaining why"
    src = Path(r["file"])
    if not src.exists():
        return False, f"clip file missing: {src}"
    dest_dir = ws.home / "ready" / cmp.slug({"name": r["campaign"]})
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{clip_id:04d}_{cl.slugify(r['title'], 40)}.mp4"
    shutil.copy2(src, dest)
    for plat, post in json.loads(r["posts"] or "{}").items():
        body = f"{post['title']}\n\n{post['description']}" if "title" in post else post["caption"]
        dest.with_suffix(f".{plat}.txt").write_text(body + "\n", encoding="utf-8")
    ws.x("UPDATE clips SET status='approved', review_note=?, reviewed_at=?, ready_file=? WHERE id=?",
         (note, now(), str(dest), clip_id))
    ws.event(f"clip #{clip_id} approved -> {dest}", "ok", clip_id=clip_id)
    return True, str(dest)


def reject_clip(ws: WS, clip_id: int, reason: str) -> tuple[bool, str]:
    r = ws.q("SELECT status FROM clips WHERE id=?", (clip_id,))
    if not r:
        return False, f"no clip #{clip_id}"
    if r[0]["status"] in ("posted",):
        return False, "already posted"
    ws.x("UPDATE clips SET status='rejected', review_note=?, reviewed_at=? WHERE id=?", (reason, now(), clip_id))
    ws.event(f"clip #{clip_id} rejected: {reason}", "info", clip_id=clip_id)
    return True, "rejected"


def fix_clip(ws: WS, clip_id: int, corrections: list[str], a=None) -> tuple[bool, str]:
    """Apply 'wrong => right' caption corrections and re-render from the kept source video."""
    r = ws.q("SELECT * FROM clips WHERE id=?", (clip_id,))
    if not r:
        return False, f"no clip #{clip_id}"
    r = r[0]
    if r["status"] not in ("pending_review", "needs_fix", "rejected"):
        return False, f"clip #{clip_id} is {r['status']}; only unpublished clips can be fixed"
    src = ws.q("SELECT * FROM sources WHERE id=?", (r["source_id"],))[0]
    if not src["video"] or not Path(src["video"]).exists():
        return False, "the source video was cleaned up; re-import the source to fix this clip"
    words = [cl.Word(**w) for w in json.loads(r["words"] or "[]")]
    pairs = []
    for line in corrections:
        if "=>" in line:
            wrong, right = (x.strip() for x in line.split("=>", 1))
            if wrong:
                pairs.append((wrong, right))
    if not pairs:
        return False, "no corrections given (format: wrong => right)"
    changed = 0
    for wrong, right in pairs:
        wt = [cl.norm(t) for t in wrong.split()]
        i = 0
        while i <= len(words) - len(wt):
            if [cl.norm(w.w) for w in words[i:i + len(wt)]] == wt:
                trail = re.search(r"[.,!?;:]+$", words[i + len(wt) - 1].w)
                merged = cl.Word(right + (trail.group(0) if trail else ""), words[i].s, words[i + len(wt) - 1].e, 1.0)
                words[i:i + len(wt)] = [merged]
                changed += 1
            i += 1
    if not changed:
        return False, "none of the 'wrong' text was found in this clip's captions"
    c = cmp.load(src["campaign_file"])
    args = clip_args(c, ws, a or argparse.Namespace())
    k = cl.Clip(r["start"], r["end_"], words, r["score"], [], r["title"], r["caption"], json.loads(r["hashtags"]))
    video = Path(src["video"])
    path = cl.render(video, cl.probe(video), k, r["rank"], Path(r["file"]).parent, cl.pick_font(args.font), args)
    if not path:
        return False, "re-render failed (see log)"
    text = " ".join(w.w for w in words)
    flags = [f for f in json.loads(r["flags"] or "[]") if "unsure" not in f["msg"]]
    flags.append({"level": "info", "msg": f"captions corrected by reviewer ({changed} change(s))"})
    ws.x("UPDATE clips SET words=?, text=?, flags=?, file=?, status='pending_review' WHERE id=?",
         (json.dumps([w.__dict__ for w in words]), text, json.dumps(flags), str(path), clip_id))
    ws.event(f"clip #{clip_id}: {changed} caption correction(s) applied and re-rendered", "ok", clip_id=clip_id)
    return True, f"{changed} correction(s) applied"


def cmd_approve(ws, a):
    ok, msg = approve_clip(ws, a.id, a.note or "", a.override)
    print(msg)
    return 0 if ok else 1


def cmd_reject(ws, a):
    ok, msg = reject_clip(ws, a.id, a.reason)
    print(msg)
    return 0 if ok else 1


def cmd_fix(ws, a):
    cl.Tools.setup(True)
    ok, msg = fix_clip(ws, a.id, a.replace, a)
    print(msg)
    return 0 if ok else 1


def cmd_posted(ws: WS, a) -> int:
    r = ws.q("SELECT * FROM clips WHERE id=?", (a.id,))
    if not r:
        print(f"no clip #{a.id}")
        return 1
    r = r[0]
    if r["status"] != "approved":
        print(f"clip #{a.id} is {r['status']}: only approved clips can be marked posted")
        return 1
    if not re.match(r"https?://", a.url):
        print("give the full public URL of your post")
        return 1
    if ws.q("SELECT id FROM clips WHERE post_url=?", (a.url,)):
        print("that post URL is already recorded for another clip")
        return 1
    ws.x("UPDATE clips SET status='posted', post_url=?, posted_at=? WHERE id=?", (a.url, now(), a.id))
    src = ws.q("SELECT campaign_file FROM sources WHERE id=?", (r["source_id"],))[0]
    db_path = ws.home / "earnings.json"
    db = tracker.load_db(db_path)
    tracker.cmd_add(argparse.Namespace(url=a.url, campaign=src["campaign_file"], clip=Path(r["ready_file"] or "").name,
                                       views=a.views, cpm=None, name=None), db)
    tracker.save_db(db_path, db)
    print("Recorded. Now submit this post URL on the campaign page so it can be reviewed and tracked.")
    return 0


def cmd_clips(ws: WS, a) -> int:
    sql, args = "SELECT * FROM clips", ()
    if a.status:
        sql, args = sql + " WHERE status=?", (a.status,)
    for r in ws.q(sql + " ORDER BY id", args):
        bad = sum(not ch["ok"] for ch in json.loads(r["checks"] or "[]"))
        warn = sum(f["level"] == "warn" for f in json.loads(r["flags"] or "[]"))
        print(f"#{r['id']:<4} {r['status']:<15} {r['end_'] - r['start']:5.0f}s  score {r['score']:5.1f}  "
              f"rules {'OK ' if not bad else f'{bad} FAIL'}  flags {warn}  {r['title'][:60]}")
    return 0


def cmd_cleanup(ws: WS, a) -> int:
    freed = 0
    for s in ws.q("SELECT * FROM sources WHERE status IN ('done','failed','blocked')"):
        if ws.q("SELECT id FROM clips WHERE source_id=? AND status IN ('pending_review','needs_fix')", (s["id"],)):
            continue
        for f in (ws.home / "sources" / str(s["id"])).glob("source.*"):
            freed += f.stat().st_size
            f.unlink()
    print(f"freed {freed / 1e6:.0f} MB of downloaded source video (clips and transcripts kept)")
    return 0


# ---------------------------------------------------------------- review web page (localhost only)

CSS = """
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mute:#5c6370;--line:#e3e6ea;--ok:#13804b;--bad:#b42318;
--warn:#a15c00;--acc:#2456d6}
@media (prefers-color-scheme:dark){:root{--bg:#121417;--card:#1b1e23;--ink:#e8eaed;--mute:#9aa1ab;--line:#2b2f36;
--ok:#4cc38a;--bad:#ff6b5e;--warn:#f0b04a;--acc:#7ea2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}
header{padding:16px;border-bottom:1px solid var(--line);display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header a{color:var(--acc);text-decoration:none}main{max-width:1100px;margin:0 auto;padding:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px;
display:grid;grid-template-columns:280px 1fr;gap:16px}@media(max-width:720px){.card{grid-template-columns:1fr}}
video{width:100%;border-radius:8px;background:#000;aspect-ratio:9/16}h2{margin:0 0 4px;font-size:18px}
.meta{color:var(--mute);font-size:13px}.ok{color:var(--ok)}.bad{color:var(--bad)}.warn{color:var(--warn)}
.ctx{color:var(--mute);font-style:italic}mark{background:#ffd54a;color:#000;border-radius:3px;padding:0 2px}
textarea{width:100%;min-height:70px;font:13px ui-monospace,monospace;background:var(--bg);color:var(--ink);
border:1px solid var(--line);border-radius:6px;padding:6px}
button{font:inherit;padding:6px 14px;border-radius:6px;border:1px solid var(--line);background:var(--card);
color:var(--ink);cursor:pointer}button.primary{background:var(--ok);color:#fff;border-color:var(--ok)}
button.danger{color:var(--bad)}form{margin:8px 0}details{margin:6px 0}ul{margin:4px 0;padding-left:18px}
.flash{padding:10px 16px;background:var(--card);border:1px solid var(--line);border-radius:8px;margin-bottom:16px}
"""


def render_page(ws: WS, token: str, status: str, flash: str) -> str:
    e = html.escape
    rows = ws.q("SELECT * FROM clips WHERE status=? ORDER BY score DESC, id", (status,))
    tabs = " · ".join(
        f"<a href='/?status={s}'>{'<b>' if s == status else ''}{s} "
        f"({ws.q('SELECT COUNT(*) n FROM clips WHERE status=?', (s,))[0]['n']}){'</b>' if s == status else ''}</a>"
        for s in ("pending_review", "approved", "posted", "rejected", "render_failed"))
    out = [f"<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content='width=device-width,"
           f"initial-scale=1'><title>Clip Review</title><style>{CSS}</style></head><body><header><b>Clip review</b>"
           f"{tabs}</header><main>"]
    if flash:
        out.append(f"<div class=flash>{e(flash)}</div>")
    if not rows:
        out.append("<p class=meta>Nothing here.</p>")
    for r in rows:
        words = json.loads(r["words"] or "[]")
        tx = " ".join(f"<mark title='confidence {w.get('p', 1):.2f}'>{e(w['w'])}</mark>"
                      if w.get("p", 1) < LOW_CONF else e(w["w"]) for w in words) or "<i>(no transcript)</i>"
        checks = "".join(f"<li class={'ok' if ch['ok'] else 'bad'}>{'✓' if ch['ok'] else '✗'} {e(ch['check'])}</li>"
                         for ch in json.loads(r["checks"] or "[]"))
        flags = "".join(f"<li class={'warn' if f['level'] == 'warn' else 'meta'}>{e(f['msg'])}</li>"
                        for f in json.loads(r["flags"] or "[]"))
        posts = "".join(
            f"<details><summary>{e(p)} caption</summary><textarea readonly>"
            f"{e(v['title'] + chr(10) + chr(10) + v['description'] if 'title' in v else v['caption'])}</textarea></details>"
            for p, v in json.loads(r["posts"] or "{}").items())
        src = ws.q("SELECT title, uploader, input FROM sources WHERE id=?", (r["source_id"],))[0]
        failing = any(not ch["ok"] for ch in json.loads(r["checks"] or "[]"))
        actions = ""
        if r["status"] in ("pending_review", "needs_fix"):
            actions = (
                f"<form method=post action=/approve><input type=hidden name=token value={token}>"
                f"<input type=hidden name=id value={r['id']}>"
                + (f"<label class=bad><input type=checkbox name=override value=1> approve anyway (rules failing)</label> "
                   f"<input name=note placeholder='why (required for override)'> " if failing else "")
                + "<button class=primary>Approve</button></form>"
                f"<form method=post action=/reject><input type=hidden name=token value={token}>"
                f"<input type=hidden name=id value={r['id']}><input name=reason placeholder='reason' required> "
                f"<button class=danger>Reject</button></form>"
                f"<details><summary>Fix captions</summary><form method=post action=/fix>"
                f"<input type=hidden name=token value={token}><input type=hidden name=id value={r['id']}>"
                f"<textarea name=corrections placeholder='one per line:  wrong => right'></textarea>"
                f"<button>Apply & re-render</button></form></details>")
        elif r["status"] == "approved":
            actions = (f"<p>Ready file: <code>{e(r['ready_file'] or '')}</code><br>Post it yourself, then run "
                       f"<code>python pipeline.py posted {r['id']} &lt;post-url&gt;</code></p>")
        elif r["post_url"]:
            actions = f"<p>Posted: <a href='{e(r['post_url'])}'>{e(r['post_url'])}</a></p>"
        video = f"<video controls preload=metadata src='/media/{r['id']}'></video>" if r["file"] else "<p>no file</p>"
        out.append(
            f"<section class=card><div>{video}</div><div><h2>#{r['id']} {e(r['title'])}</h2>"
            f"<div class=meta>{e(src['uploader'] or '')} — {e(src['title'] or src['input'])} · "
            f"{cl.hms(r['start'])}–{cl.hms(r['end_'])} · score {r['score']:.0f} · {e(r['campaign'])}</div>"
            f"<p><span class=ctx>…{e(r['context_before'] or '')[-220:]}</span> <b>[clip]</b> {tx} <b>[/clip]</b> "
            f"<span class=ctx>{e(r['context_after'] or '')[:220]}…</span></p>"
            f"<b>Campaign rules</b><ul>{checks or '<li class=meta>no campaign checks</li>'}</ul>"
            f"<b>Review notes</b><ul>{flags or '<li class=meta>none</li>'}</ul>{posts}"
            f"{('<p class=meta>Note: ' + e(r['review_note']) + '</p>') if r['review_note'] else ''}{actions}</div></section>")
    out.append("<p class=meta>Nothing is published from here. Approving copies the clip and its captions to the "
               "ready folder; you post and submit it yourself.</p></main></body></html>")
    return "".join(out)


def make_handler(ws: WS, token: str, port_ref: dict, a):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _host_ok(self) -> bool:
            host = self.headers.get("Host", "")
            return host in (f"127.0.0.1:{port_ref['port']}", f"localhost:{port_ref['port']}")

        def _send(self, code: int, body: bytes, ctype="text/html; charset=utf-8", extra=None):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; media-src 'self'")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def do_GET(self):
            if not self._host_ok():
                return self._send(403, b"forbidden")
            u = urllib.parse.urlparse(self.path)
            qs = urllib.parse.parse_qs(u.query)
            if u.path == "/":
                page = render_page(ws, token, qs.get("status", ["pending_review"])[0], qs.get("msg", [""])[0])
                return self._send(200, page.encode())
            m = re.fullmatch(r"/media/(\d+)", u.path)
            if m:
                r = ws.q("SELECT file FROM clips WHERE id=?", (int(m.group(1)),))
                if not r or not r[0]["file"]:
                    return self._send(404, b"not found")
                p = Path(r[0]["file"]).resolve()
                if ws.home not in p.parents or not p.exists():
                    return self._send(404, b"not found")
                data = p.read_bytes()
                rng = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
                if rng:
                    a0 = int(rng.group(1) or 0)
                    b0 = int(rng.group(2)) if rng.group(2) else len(data) - 1
                    b0 = min(b0, len(data) - 1)
                    if a0 > b0:
                        return self._send(416, b"", extra={"Content-Range": f"bytes */{len(data)}"})
                    return self._send(206, data[a0:b0 + 1], "video/mp4",
                                      {"Content-Range": f"bytes {a0}-{b0}/{len(data)}", "Accept-Ranges": "bytes"})
                return self._send(200, data, "video/mp4", {"Accept-Ranges": "bytes"})
            return self._send(404, b"not found")

        def do_POST(self):
            if not self._host_ok():
                return self._send(403, b"forbidden")
            n = min(int(self.headers.get("Content-Length") or 0), 100_000)
            form = {k: v[0] for k, v in urllib.parse.parse_qs(self.rfile.read(n).decode()).items()}
            if not pysecrets.compare_digest(form.get("token", ""), token):
                return self._send(403, b"bad or missing form token; reload the page")
            try:
                cid = int(form.get("id", "0"))
            except ValueError:
                return self._send(400, b"bad id")
            if self.path == "/approve":
                ok, msg = approve_clip(ws, cid, form.get("note", ""), form.get("override") == "1")
            elif self.path == "/reject":
                ok, msg = reject_clip(ws, cid, form.get("reason", "") or "no reason given")
            elif self.path == "/fix":
                ok, msg = fix_clip(ws, cid, form.get("corrections", "").splitlines(), a)
            else:
                return self._send(404, b"not found")
            loc = "/?" + urllib.parse.urlencode({"msg": f"#{cid}: {msg}"})
            return self._send(303, b"", extra={"Location": loc})

    return H


def serve_review(ws: WS, a, port: int = 8765, block: bool = True):
    token = pysecrets.token_urlsafe(24)
    port_ref = {"port": port}
    srv = ThreadingHTTPServer(("127.0.0.1", port), make_handler(ws, token, port_ref, a))
    port_ref["port"] = srv.server_address[1]
    if not block:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv, token, port_ref["port"]
    print(f"Review page: http://127.0.0.1:{port_ref['port']}/  (local only; Ctrl+C to stop)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    return None


def cmd_review(ws: WS, a) -> int:
    cl.Tools.setup(True)
    serve_review(ws, a, a.port)
    return 0


def cmd_earnings(ws: WS, a) -> int:
    return tracker.main(["--db", str(ws.home / "earnings.json"), *(a.rest or ["report"])])


# ---------------------------------------------------------------- cli

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Permission-gated clipping pipeline with a human review queue.")
    p.add_argument("--home", help="workspace folder (default ./clipper-workspace or $CLIPPER_HOME)")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("campaign-check", help="validate a campaign brief's permission record")
    s.add_argument("campaign")
    s = sub.add_parser("import", help="queue permitted sources for a campaign")
    s.add_argument("campaign")
    s.add_argument("sources", nargs="*")
    s.add_argument("--transcript", help="transcript (.srt/.vtt/.json) for a single source")
    s.add_argument("--latest", type=int, help="newest N videos when a source is a channel")
    s.add_argument("--cookies-from-browser")
    s.add_argument("--force", action="store_true", help="re-import a duplicate source")
    s = sub.add_parser("run", help="process queued jobs")
    s.add_argument("--limit", type=int)
    s.add_argument("--preset", help="x264 preset (ultrafast..slow)")
    s.add_argument("--model", help="whisper model (tiny/base/small/medium/large-v3)")
    s.add_argument("--cookies-from-browser")
    s = sub.add_parser("status", help="job status")
    s.add_argument("-n", type=int, default=30)
    s = sub.add_parser("clips", help="list clips")
    s.add_argument("--status")
    s = sub.add_parser("review", help="open the local review page")
    s.add_argument("--port", type=int, default=8765)
    s = sub.add_parser("approve")
    s.add_argument("id", type=int)
    s.add_argument("--note")
    s.add_argument("--override", action="store_true", help="approve although a campaign rule fails (needs --note)")
    s = sub.add_parser("reject")
    s.add_argument("id", type=int)
    s.add_argument("--reason", required=True)
    s = sub.add_parser("fix", help="correct caption words and re-render")
    s.add_argument("id", type=int)
    s.add_argument("--replace", action="append", required=True, help='"wrong => right" (repeatable)')
    s.add_argument("--preset")
    s = sub.add_parser("posted", help="record the URL after you posted an approved clip")
    s.add_argument("id", type=int)
    s.add_argument("url")
    s.add_argument("--views", type=int)
    s = sub.add_parser("retry")
    s.add_argument("id", type=int)
    s = sub.add_parser("budget", help="approve or show Claude API spending limits")
    s.add_argument("--monthly", type=float)
    s.add_argument("--per-call", type=float)
    s.add_argument("--off", action="store_true")
    s = sub.add_parser("secrets")
    s.add_argument("action", choices=["set", "status", "delete"])
    sub.add_parser("cleanup", help="delete downloaded source videos no longer needed")
    s = sub.add_parser("earnings", help="tracker commands on this workspace (default: report)")
    s.add_argument("rest", nargs=argparse.REMAINDER)
    return p


COMMANDS = {"campaign-check": cmd_campaign_check, "import": cmd_import, "run": cmd_run, "status": cmd_status,
            "clips": cmd_clips, "review": cmd_review, "approve": cmd_approve, "reject": cmd_reject, "fix": cmd_fix,
            "posted": cmd_posted, "retry": cmd_retry, "budget": cmd_budget, "secrets": cmd_secrets,
            "cleanup": cmd_cleanup, "earnings": cmd_earnings}


def main(argv=None) -> int:
    a = build_parser().parse_args(argv)
    ws = WS(a.home)
    try:
        return COMMANDS[a.cmd](ws, a)
    except SystemExit:
        raise
    except KeyboardInterrupt:
        print("interrupted")
        return 130
    except Exception as e:  # noqa: BLE001
        kind, msg = classify(e)
        print(f"error: {msg}")
        if os.environ.get("CLIPPER_DEBUG"):
            traceback.print_exc()
        return 1
    finally:
        ws.close()


if __name__ == "__main__":
    sys.exit(main())
