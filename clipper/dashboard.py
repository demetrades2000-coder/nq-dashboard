"""
Clip Engine dashboard: one self-contained HTML page (same design system as the NQ "Liquidity Engine"
dashboard) built from the local workspace. Rebuilt after every autopilot cycle; open it with
`python pipeline.py dashboard`. Works from disk, no server; the review server also serves it at /dashboard.

The data object `build_data` returns is specified in docs/DASHBOARD_DATA.md (v2).
"""

from __future__ import annotations

import datetime as dt
import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import campaign as cmp

VERSION = 2
THUMB_LIMIT = 60
THUMB_W, THUMB_H = 270, 480
RUNNING = ("fetching", "transcribing", "selecting", "rendering", "running")
LENGTH_BUCKETS = [("8-20s", 0, 20), ("20-30s", 20, 30), ("30-45s", 30, 45), ("45-60s", 45, 60), ("60s+", 60, 1e9)]
STOPWORDS = set("""
a an the and or but if so of to in on at by for with from as is are was were be been being am i you he she it we they
me him her us them my your his its our their this that these those there here what which who whom whose when where why
how all any both each few more most other some such no nor not only own same than too very can will just don't dont
should now do does did doing have has had having would could i'm im you're youre it's thats that's what's whats get got
gonna wanna like really know think say said one two out up down about into over then because also yeah okay ok well
let's lets go going thing things way lot right even still back make made want see look much many every something
anything nothing everyone someone people guy guys kind sort mean actually literally basically just let ever never
""".split())


def _rows(ws, sql, args=()):
    return [dict(r) for r in ws.q(sql, args)]


def _parse(ts) -> dt.datetime | None:
    if not ts:
        return None
    try:
        d = dt.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except ValueError:
        return None
    if d.tzinfo is not None:  # stored local times are naive; keep comparisons naive
        d = d.astimezone().replace(tzinfo=None)
    return d


def _jl(text, default):
    try:
        v = json.loads(text) if text else default
    except Exception:
        return default
    return v if isinstance(v, type(default)) else default


def first_sentence(text: str, limit: int = 120) -> str:
    t = re.sub(r"\s+", " ", text or "").strip()
    m = re.search(r"[.?!](\s|$)", t)
    s = t[:m.end()].strip() if m else t
    return s if len(s) <= limit else s[:limit - 1].rstrip() + "…"


# ---------------------------------------------------------------- views history (earnings.json)

def _post_points(p: dict) -> tuple[dt.datetime | None, list[tuple[dt.datetime, int]]]:
    pts = []
    for h in p.get("history") or []:
        try:
            t = _parse(h[0])
            if t:
                pts.append((t, int(h[1] or 0)))
        except Exception:
            continue
    t = _parse(p.get("updated"))
    if t:
        pts.append((t, int(p.get("views") or 0)))
    pts.sort(key=lambda x: x[0])
    return _parse(p.get("posted")), pts


def _views_at(posted, pts, when: dt.datetime) -> int:
    """Views a post had at `when`: the last snapshot before it. Before the post existed: 0. Posted but no snapshot
    yet: the first snapshot (no gain is claimed before the first known count)."""
    if posted and when < posted:
        return 0
    last = None
    for t, v in pts:
        if t <= when:
            last = v
        else:
            break
    if last is not None:
        return last
    return pts[0][1] if pts else 0


def _gained(posts: list, since: dt.datetime, now: dt.datetime) -> int:
    tot = 0
    for posted, pts in posts:
        if not pts:
            continue
        tot += max(0, _views_at(posted, pts, now) - _views_at(posted, pts, since))
    return tot


# ---------------------------------------------------------------- health checks (cheap, never raise)

def _ffmpeg_path() -> str | None:
    try:
        import clipper as cl
        ff = shutil.which("ffmpeg") or cl.installed_ffmpeg()
        if not ff and cl.Tools.ffmpeg and os.path.isfile(cl.Tools.ffmpeg):
            ff = cl.Tools.ffmpeg
        return ff
    except Exception:
        return shutil.which("ffmpeg")


def schedule_installed() -> bool:
    """Best effort: is the autopilot schedule registered with the OS scheduler? False when unknown."""
    try:
        import pipeline as pl
        if os.name == "nt":
            r = subprocess.run(["schtasks", "/Query", "/TN", pl.TASK_NAME], capture_output=True, text=True,
                               timeout=5, errors="replace")
            return r.returncode == 0
        if sys.platform == "darwin":
            return (Path.home() / "Library" / "LaunchAgents" / f"{pl.LAUNCHD_LABEL}.plist").exists()
        if not shutil.which("crontab"):
            return False
        r = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5, errors="replace")
        return r.returncode == 0 and pl.SCHED_MARK in (r.stdout or "")
    except Exception:
        return False


def health(ws, enabled: bool, accounts: list) -> dict:
    try:
        free = round(shutil.disk_usage(ws.home).free / 1e9, 1)
    except Exception:
        free = None
    checks = [
        {"name": "ffmpeg", "ok": bool(_ffmpeg_path()),
         "fix": "Install ffmpeg: winget install ffmpeg / brew install ffmpeg / sudo apt install ffmpeg"},
        {"name": "autopilot", "ok": enabled, "fix": "python pipeline.py autopilot enable"},
        {"name": "posting account", "ok": any(a["connected"] for a in accounts),
         "fix": "Connect one: python pipeline.py zernio auth (free) or youtube auth"},
        {"name": "schedule", "ok": schedule_installed(), "fix": "python pipeline.py schedule install --every-hours 6"},
        {"name": "publish", "ok": bool(ws.setting("publish.repo")), "fix": "python pipeline.py publish setup"},
        {"name": "disk", "ok": free is not None and free > 5, "fix": "Free up space: python pipeline.py cleanup"},
    ]
    for c in checks:
        if c["ok"]:
            c["fix"] = ""
    return {"checks": checks, "disk_free_gb": free}


# ---------------------------------------------------------------- thumbnails

def thumb_dir(ws) -> Path:
    return ws.home / "thumbs"


IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")


def thumb_source(file) -> str | None:
    """The file a thumbnail is cut from: the clip video, or for a slideshow its first slide (the file itself when it is
    an image, else the first image in the slideshow's folder). None when nothing usable is on disk."""
    try:
        p = Path(file)
        if p.is_dir():
            slides = sorted(x for x in p.iterdir() if x.suffix.lower() in IMAGE_EXT and x.is_file())
            return str(slides[0]) if slides else None
        if p.is_file():
            return str(p)
        if p.suffix:  # slideshow saved as <name>.mp4 next to a <name>/ slides folder
            d = p.with_suffix("")
            if d.is_dir():
                return thumb_source(d)
    except OSError:
        return None
    return None


def make_thumbs(ws, limit: int = THUMB_LIMIT) -> int:
    """270x480 JPEG of a frame ~1.5 s in, for the newest `limit` clips with a rendered file. Only missing ones are made;
    failures are skipped silently. Returns how many were created."""
    try:
        rows = ws.q("SELECT id, file FROM clips WHERE file IS NOT NULL AND file != '' ORDER BY id DESC")
    except Exception:
        return 0
    todo = []
    for r in rows:
        src = thumb_source(r["file"])
        if not src:
            continue
        todo.append({"id": r["id"], "file": src})
        if len(todo) >= limit:
            break
    out_dir = thumb_dir(ws)
    todo = [r for r in todo if not (out_dir / f"{r['id']}.jpg").exists()]
    if not todo:
        return 0
    try:
        import clipper as cl
        cl.Tools.setup(False)
        ff = cl.Tools.ffmpeg
    except BaseException:  # setup raises SystemExit when ffmpeg is missing
        ff = shutil.which("ffmpeg")
    if not ff:
        return 0
    out_dir.mkdir(parents=True, exist_ok=True)
    vf = f"scale={THUMB_W}:{THUMB_H}:force_original_aspect_ratio=increase,crop={THUMB_W}:{THUMB_H}"
    made = 0
    for r in todo:
        dest = out_dir / f"{r['id']}.jpg"
        tmp = out_dir / f"{r['id']}.tmp.jpg"
        image = Path(r["file"]).suffix.lower() in IMAGE_EXT   # a slideshow's first slide: no seeking in a still
        for at in ((None,) if image else ("1.5", "0")):
            try:
                seek = ["-ss", at] if at else []
                subprocess.run([ff, "-y", "-loglevel", "error", *seek, "-i", str(r["file"]), "-frames:v", "1",
                                "-vf", vf, "-q:v", "4", str(tmp)], capture_output=True, timeout=30)
                if tmp.is_file() and tmp.stat().st_size > 0:
                    tmp.replace(dest)
                    made += 1
                    break
            except Exception:
                pass
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass
    return made


# ---------------------------------------------------------------- data

def campaign_dirs(ws) -> list[Path]:
    """Where campaign briefs live: the repo's campaigns/, the workspace's own campaigns/ and, in the cloud layout
    (<state>/ws is the workspace), the cloud state's <state>/campaigns/ where onboarded campaigns are written."""
    out = [Path(__file__).resolve().parent / "campaigns", ws.home / "campaigns"]
    if ws.home.name == "ws":   # cloud_runner layout: <state>/ws next to <state>/campaigns
        out.append(ws.home.parent / "campaigns")
    env = os.environ.get("CLIP_CLOUD_DIR")
    if env:
        out.append(Path(env) / "campaigns")
    seen, dirs = set(), []
    for d in out:
        try:
            r = d.resolve()
        except OSError:
            continue
        if r not in seen and r.is_dir():
            seen.add(r)
            dirs.append(r)
    return dirs


def _load_campaigns(ws) -> dict:
    camps_files = {}
    for r in ws.q("SELECT DISTINCT campaign, campaign_file FROM sources"):
        camps_files[r["campaign"]] = r["campaign_file"]
    for root in campaign_dirs(ws):
        for f in sorted(root.glob("*.json")):
            if not f.name.startswith("_"):
                try:
                    camps_files.setdefault(cmp.load(str(f))["name"], str(f))
                except Exception:
                    pass
    camps = {}
    for name, f in camps_files.items():
        try:
            camps[name] = cmp.load(f)
        except Exception:
            camps[name] = {"name": name, "cpm": 0, "_path": f}
    return camps


def _bucket(rows, key_fn, keys) -> list:
    out = {k: {"posts": 0, "views": 0, "net": 0.0} for k in keys}
    for u in rows:
        k = key_fn(u)
        if k in out:
            out[k]["posts"] += 1
            out[k]["views"] += int(u["views"] or 0)
            out[k]["net"] = round(out[k]["net"] + u["net"], 2)
    return [(k, v) for k, v in out.items()]


# ---------------------------------------------------------------- accounts, rules, queue (v2.1)

KINDS = ("video", "slideshow")
PLATFORM_NAMES = {"tiktok": "TikTok", "instagram": "Instagram", "youtube": "YouTube", "x": "X"}
DEFAULT_MAX_PER_DAY = 3


def _kind(v) -> str:
    v = str(v or "").strip().lower()
    return v if v in KINDS else "video"


def _num(v, default=None):
    if isinstance(v, bool):
        return default
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).strip().rstrip("%"))
    except (TypeError, ValueError):
        return default


def max_per_day(ws) -> int:
    """Posts per account per day: setting autopilot.max_per_day, else the older autopilot.max_uploads_per_day, else 3."""
    for key in ("autopilot.max_per_day", "autopilot.max_uploads_per_day"):
        v = _num(ws.setting(key, None))
        if v is not None and v >= 0:
            return int(v)
    return DEFAULT_MAX_PER_DAY


def platform_ceiling(platform: str, default: int) -> int:
    try:
        import pipeline as pl
        return int(pl.PLATFORM_DAILY_CEILING.get(platform, default))
    except Exception:
        return {"tiktok": 15}.get(platform, default)


def campaign_accounts(c: dict, platform: str, seen: list | None = None) -> list[str]:
    """Account names a campaign posts to on a platform. `accounts.<platform>` may be a name, a list of names or "*"
    (every connected account: the ones already seen posting on that platform; with `account_match`, only those whose
    name contains it, and none matching means no account). Nothing set means "default"."""
    v = (c.get("accounts") or {}).get(platform) if isinstance(c.get("accounts"), dict) else None
    items = [str(x).strip() for x in (v if isinstance(v, list) else [v] if v not in (None, "") else [])]
    out = [x for x in items if x and x != "*"]
    if "*" in items:
        match = str(c.get("account_match") or "").lower().strip()
        out += [n for n in (seen or []) if not match or match in str(n).lower().replace(" ", "")]
        if match:   # brand pages only: no account named for the brand yet means nothing posts (no "default")
            return list(dict.fromkeys(out))
    return list(dict.fromkeys(out)) or ["default"]


def _min_engagement(c: dict) -> float | None:
    v = _num(c.get("min_engagement"))
    if v is None or v <= 0:
        return None
    return v / 100 if v > 1 else v   # 2 or "2%" -> 0.02


def _logo_path(c: dict) -> Path | None:
    logo = ((c.get("on_screen") or {}).get("logo") or "").strip()
    if not logo:
        return None
    p = Path(logo).expanduser()
    if not p.is_absolute():
        p = Path(c.get("_path") or ".").parent / p
    return p


def campaign_checks(c: dict, cu: list, clips: list, now_dt: dt.datetime) -> list[dict]:
    """The campaign's own requirements as a checklist, each judged on what was posted. ok is True/False, or None when
    there is nothing to judge yet."""
    out = []
    plats = [str(p).lower() for p in c.get("platforms") or []]
    cu = [u for u in cu if u.get("state") != "failed"]   # a failed upload never went out
    recent = sorted((u for u in cu if u["_t"]), key=lambda u: u["_t"], reverse=True)[:20]
    # 1. required tags (at the end of the caption when the brief says so)
    cap = c.get("caption") or {}
    if cap.get("required_mentions") or cap.get("required_hashtags"):
        last = bool(cap.get("mentions_last"))
        bad, n = [], 0
        for u in recent:
            text = (u.get("caption") or "").strip()
            if not text:
                continue
            n += 1
            tags = cmp.mentions_for(c, u["platform"]) + cmp._tags(cap.get("required_hashtags"))
            low = text.lower()
            miss = [t for t in tags if t.lower() not in low]
            if miss or (last and cmp.mentions_for(c, u["platform"]) and
                        not re.search(r"(" + r"\s+".join(re.escape(t) for t in cmp.mentions_for(c, u["platform"])) + r")\s*$",
                                      text, re.I)):
                bad.append(u)
        want = " ".join(cmp.mentions_for(c, plats[0] if plats else "tiktok") or cmp._tags(cap.get("required_hashtags")))
        out.append({"label": f"Required tags{' at the caption end' if last else ''}",
                    "ok": None if not n else not bad,
                    "detail": (f"{want}: " if want else "") + (f"{n - len(bad)} of the last {n} captions" if n
                                                               else "no captions posted yet")})
    # 2. logo
    lp = _logo_path(c)
    if lp is not None:
        exists = lp.is_file()
        out.append({"label": "Brand logo on screen", "ok": exists,
                    "detail": f"{lp.name} {'found' if exists else 'missing: add the file next to the brief'}"})
    # 3. minimum length
    cmin = _num((c.get("clip") or {}).get("min"))
    if cmin:
        mine = [x for x in clips if x["campaign"] == c.get("name") and x["status"] in ("approved", "posted")
                and x.get("kind") != "slideshow"]
        short = min((x["dur"] for x in mine), default=None)
        out.append({"label": f"Clips at least {cmin:g} s", "ok": None if short is None else short >= cmin,
                    "detail": f"shortest approved clip {short} s" if short is not None else "no approved clips yet"})
    # 4. posts a week
    ppw = _num(c.get("posts_per_week"))
    if ppw:
        n7 = sum(1 for u in cu if u["_t"] and u["_t"] >= now_dt - dt.timedelta(days=7))
        out.append({"label": f"{ppw:g}+ posts a week", "ok": n7 >= ppw, "detail": f"{n7} in the last 7 days"})
    # 5. engagement floor
    eng = _min_engagement(c)
    if eng:
        v = sum(int(u["views"] or 0) for u in cu)
        lk = sum(int(u["likes"] or 0) for u in cu)
        out.append({"label": f"Engagement {eng * 100:g}%+", "ok": None if not v else lk / v >= eng,
                    "detail": f"{lk / v * 100:.1f}% likes / views" if v else "no views yet"})
    # 6. platforms
    if plats:
        off = sorted({u["platform"] for u in cu if u["platform"] not in plats})
        names = ", ".join(PLATFORM_NAMES.get(p, p.capitalize()) for p in plats)
        out.append({"label": f"{names} only" if len(plats) == 1 else f"Platforms: {names}", "ok": not off,
                    "detail": ("also posted on " + ", ".join(off)) if off else "every post on an allowed platform"})
    # 7. automation
    aa = cmp.automation_allowed(c)
    out.append({"label": "Automation allowed by the rules", "ok": aa is True,
                "detail": "recorded in the brief" if aa is True else "rules ban it" if aa is False
                else "not confirmed: stays manual"})
    return out


EMPTY_PAYOUT = {"min_payout": 0.0, "views_to_min": 0, "cap": 0.0, "views_to_cap": 0, "posts": 0, "posts_paying": 0,
                "posts_at_cap": 0, "best_views": 0, "total_views": 0}


def _safe(fn, default):
    """A new dashboard section never takes the whole page down: on any error it is empty."""
    try:
        return fn()
    except Exception:
        return default


def campaign_payout(c: dict, cu: list) -> dict:
    """Per-clip payout reality: views a post needs before it pays anything and before it hits the cap."""
    cpm = _num(c.get("cpm"), 0.0) or 0.0
    mn = _num(c.get("min_payout"), 0.0) or 0.0
    cap = _num(c.get("max_payout_per_clip"), 0.0) or 0.0
    gate = int(_num(c.get("min_views"), 0) or 0)
    need = max(gate, int(-(-mn * 1000 // cpm)) if cpm and mn else 0)
    to_cap = int(-(-cap * 1000 // cpm)) if cpm and cap else 0
    views = [int(u["views"] or 0) for u in cu]
    return {"min_payout": mn, "views_to_min": need, "cap": cap, "views_to_cap": to_cap,
            "posts": len(views), "posts_paying": sum(1 for v in views if v >= max(need, 1)) if cpm else 0,
            "posts_at_cap": sum(1 for v in views if to_cap and v >= to_cap),
            "best_views": max(views, default=0), "total_views": sum(views)}


# ---------------------------------------------------------------- agency: live checks + discovered leads (v2.2)

EMPTY_LIVE = {"state": "unchecked", "ok": None, "reason": "", "left": None, "budget": None, "spent": None,
              "spent_frac": None, "cpm": None, "brief_cpm": None, "cpm_differs": False, "status": None,
              "creators": None, "views": None, "checked": None}


def _int(v):
    n = _num(v)
    return int(n) if n is not None else None


def _local_iso(ts) -> str | None:
    d = _parse(ts)
    return d.isoformat(timespec="seconds") if d else None


def campaign_live(ws, c: dict) -> dict:
    """The cloud runner's last live check of the campaign page (setting campaign_live.<name>). ok False = paused
    automatically (out of budget / closed); never checked = state 'unchecked'. Rates and budgets are public."""
    raw = ws.setting(f"campaign_live.{c.get('name')}", None)
    brief = _num(c.get("cpm"))
    out = dict(EMPTY_LIVE, brief_cpm=brief)
    if not isinstance(raw, dict) or not raw:
        return out
    ok = raw.get("ok")
    ok = bool(ok) if isinstance(ok, bool) else (None if ok is None else bool(ok))
    left, budget, cpm = _num(raw.get("left")), _num(raw.get("budget")), _num(raw.get("cpm"))
    spent = round(budget - left, 2) if budget is not None and left is not None else None
    frac = round(min(1.0, max(0.0, spent / budget)), 4) if spent is not None and budget else None
    out.update({"state": "paused" if ok is False else "active" if ok else "unchecked", "ok": ok,
                "reason": str(raw.get("reason") or ("paused" if ok is False else ""))[:200],
                "left": left, "budget": budget, "spent": spent, "spent_frac": frac, "cpm": cpm,
                "cpm_differs": bool(cpm is not None and brief is not None and abs(cpm - brief) > 0.001),
                "status": str(raw["status"]) if raw.get("status") else None,
                "creators": _int(raw.get("creators")), "views": _int(raw.get("views")),
                "checked": _local_iso(raw.get("checked"))})
    return out


def _names(v) -> list[str]:
    if isinstance(v, (list, tuple)):
        return [str(x) for x in v if x not in (None, "")][:8]
    return [str(v)] if v not in (None, "") else []


def leads_discovered(ws, joined_urls: set) -> list[dict]:
    """Campaigns the cloud runner found on Content Rewards and ranked for this clipper (setting leads.discovered),
    minus any joined since. Best score first. Every field present; public rates and budgets."""
    raw = ws.setting("leads.discovered", [])
    out = []
    for r in raw if isinstance(raw, list) else []:
        row = lead_row(r)
        if not row or (row["url"] and row["url"].rstrip("/") in joined_urls):
            continue
        out.append(row)
    out.sort(key=lambda x: (-x["score"], -(x["cpm"] or 0), x["name"]))
    for i, x in enumerate(out):
        x["rank"] = i + 1
    return out


def agency_summary(campaigns: list, accounts: list) -> dict:
    """Campaigns on autopilot at once: active vs paused (live check), budget left across the active ones, accounts."""
    auto = [c for c in campaigns if c["auto"]]
    active = [c for c in auto if c["live"]["state"] != "paused"]
    paused = [c for c in auto if c["live"]["state"] == "paused"]
    names = {c["name"] for c in active}
    accs = sorted({f"{a['platform']}/{a['name']}" for a in accounts if names & set(a.get("campaigns") or [])})
    lefts = [c["live"]["left"] for c in active if c["live"]["left"] is not None]
    return {"campaigns": len(auto), "active": len(active), "paused": len(paused),
            "unchecked": sum(1 for c in active if c["live"]["state"] == "unchecked"),
            "budget_left": round(sum(lefts), 2) if lefts else None,
            "budget_total": round(sum(c["live"]["budget"] for c in active if c["live"]["budget"] is not None), 2)
            if any(c["live"]["budget"] is not None for c in active) else None,
            "accounts": accs, "accounts_n": len(accs),
            "paused_list": [{"name": c["name"], "reason": c["live"]["reason"], "checked": c["live"]["checked"]}
                            for c in paused]}


EMPTY_AGENCY = {"campaigns": 0, "active": 0, "paused": 0, "unchecked": 0, "budget_left": None, "budget_total": None,
                "accounts": [], "accounts_n": 0, "paused_list": []}


def _event_hits(events: list, platform: str, account: str, since: dt.datetime) -> list:
    pat = re.compile(r"(^|[^\w.])@?" + re.escape(account) + r"($|[^\w.])", re.I)
    out = []
    for e in events:
        t = _parse(e.get("ts"))
        if not t or t < since or (e.get("level") not in ("error", "warn")):
            continue
        msg = str(e.get("message") or "")
        if pat.search(msg) or f"{platform}/{account}".lower() in msg.lower():
            out.append(e)
    return out


def _norm_path(p) -> str:
    try:
        return os.path.normcase(str(Path(p).resolve()))
    except (OSError, TypeError, ValueError):
        return str(p)


class PathSet(set):
    """Campaign file paths compared as the same file (Windows short names like RUNNER~1, case, symlinks)."""
    def __init__(self, items=()):
        super().__init__(_norm_path(x) for x in items if x)

    def __contains__(self, p):
        return bool(p) and super().__contains__(_norm_path(p))


LIMITED_MEDIAN_VIEWS = 100      # median views of an account's last 4 posts under this = possibly limited
LIMITED_MIN_AGE_H = 24          # a post younger than this hasn't had time to collect views: it isn't judged
LIMITED_EXPLAIN = "New accounts often get little reach for the first days. Keep posting; don't delete the account."


def _median(vals: list) -> float | None:
    v = sorted(vals)
    if not v:
        return None
    m = len(v) // 2
    return float(v[m]) if len(v) % 2 else (v[m - 1] + v[m]) / 2


def account_health(mine: list, posts_7d: int, has_history: bool, views_7d: int, now_dt: dt.datetime) -> dict:
    """Is this TikTok account getting reach? `mine` = its uploads that went out (failed ones excluded).
    state: no_posts (connected, nothing posted yet) | limited (>= 4 live posts and the median views of the last 4 posts
    that are at least a day old is under 100, or views stayed flat across a week of posting) | early (posts, but too few
    old enough to judge) | ok. Never raises on missing fields."""
    live = [u for u in mine if u.get("state") == "live" or u.get("url")]
    if not mine:
        return {"state": "no_posts", "median_last4": None,
                "note": "Connected, but nothing posted yet. The next run should post here."}
    old = sorted((u for u in live if u.get("_t") and u["_t"] <= now_dt - dt.timedelta(hours=LIMITED_MIN_AGE_H)),
                 key=lambda u: u["_t"], reverse=True)
    last4 = old[:4]
    med = _median([int(u["views"] or 0) for u in last4]) if len(last4) == 4 else None
    if len(live) >= 4 and med is not None and med < LIMITED_MEDIAN_VIEWS:
        return {"state": "limited", "median_last4": int(med),
                "note": f"Possibly limited: the last 4 posts got a median of {int(med)} views. {LIMITED_EXPLAIN}"}
    if has_history and len(live) >= 4 and len(old) >= 2 and posts_7d >= 3 and views_7d <= 5:
        return {"state": "limited", "median_last4": None if med is None else int(med),
                "note": f"Possibly limited: views stayed flat across {posts_7d} posts this week. {LIMITED_EXPLAIN}"}
    if med is None:
        return {"state": "early", "median_last4": None,
                "note": "Too early to tell: fewer than 4 posts are a day old yet."}
    return {"state": "ok", "median_last4": int(med), "note": f"Reach looks normal (median {int(med):,} views on the last 4 posts)."}


def accounts_detail(ws, uploads: list, camps: dict, auto_files: set, eposts_by_url: dict, events: list,
                    now_dt: dt.datetime, cap_setting: int, every: int) -> list[dict]:
    today = now_dt.date().isoformat()
    keys: dict[tuple, dict] = {}
    for u in uploads:
        keys.setdefault((u["platform"], u["account"]), {"campaigns": set()})["campaigns"].add(u["campaign"])
    seen: dict[str, list] = {}
    for p, a in keys:
        seen.setdefault(p, []).append(a)
    for c in camps.values():
        if c.get("_path") not in auto_files:
            continue
        for p in c.get("platforms") or []:
            p = str(p).lower()
            for a in campaign_accounts(c, p, sorted(seen.get(p, []))):
                keys.setdefault((p, a), {"campaigns": set()})["campaigns"].add(c.get("name"))
    days = [(now_dt.date() - dt.timedelta(days=i)) for i in range(13, -1, -1)]
    out = []
    for (p, a), meta in keys.items():
        tried = [u for u in uploads if u["platform"] == p and u["account"] == a]
        mine = [u for u in tried if u.get("state") != "failed"]
        cap = min(cap_setting, platform_ceiling(p, cap_setting))
        views = sum(int(u["views"] or 0) for u in mine)
        likes = sum(int(u["likes"] or 0) for u in mine)
        t7 = now_dt - dt.timedelta(days=7)
        hist = [eposts_by_url[u["url"]] for u in mine if u.get("url") and u["url"] in eposts_by_url]
        if hist:
            daily = []
            for d in days:
                end = now_dt if d == now_dt.date() else dt.datetime.combine(d, dt.time(23, 59, 59))
                daily.append(_gained(hist, end - dt.timedelta(days=1), end))
            v7 = _gained(hist, t7, now_dt)
        else:   # no history: views of the posts made each day (at today's counts)
            daily = [sum(int(u["views"] or 0) for u in mine if (u["created"] or "")[:10] == d.isoformat()) for d in days]
            v7 = sum(int(u["views"] or 0) for u in mine if u["_t"] and u["_t"] >= t7)
        today_n = sum(1 for u in tried if (u["created"] or "")[:10] == today)   # the cap counts every attempt
        last = max((u["_t"] for u in mine if u["_t"]), default=None)
        fails = [u for u in tried if u.get("state") == "failed" and u["_t"] and u["_t"] >= now_dt - dt.timedelta(hours=24)]
        errs = _event_hits(events, p, a, now_dt - dt.timedelta(hours=24))
        if fails or any(e.get("level") == "error" for e in errs):
            status = "error"
            note = (fails[0].get("notes") and _jl(fails[0]["notes"], [""])[0]) or (errs[0]["message"] if errs else "")
            note = str(note or "upload failed in the last 24 h")[:160]
        elif today_n >= cap:
            status, note = "at_cap", f"{today_n} of {cap} posts today: next ones wait for tomorrow"
        elif last and last >= now_dt - dt.timedelta(hours=max(24, every * 2)):
            status, note = "posting", f"{cap - today_n} slot{'s' if cap - today_n != 1 else ''} left today"
        else:
            status, note = "idle", "no post in the last day" if mine else "nothing posted yet"
        posts_7d = sum(1 for u in mine if u["_t"] and u["_t"] >= t7)
        out.append({"platform": p, "name": a, "campaigns": sorted(x for x in meta["campaigns"] if x),
                    "today": today_n, "cap": cap, "posts": len(mine),
                    "posts_7d": sum(1 for u in mine if u["_t"] and u["_t"] >= t7),
                    "views": views, "views_7d": int(v7), "avg_views": round(views / len(mine)) if mine else 0,
                    "likes": likes, "engagement": round(likes / views, 4) if views else 0.0,
                    "last_post": last.isoformat(timespec="seconds") if last else None,
                    "net": round(float(sum(u["net"] for u in mine)), 2),
                    "net_7d": round(float(sum(u["net"] for u in mine if u["_t"] and u["_t"] >= t7)), 2),
                    "slideshows": sum(1 for u in mine if u.get("c_kind") == "slideshow"),
                    "daily_views": [int(x) for x in daily], "status": status, "status_note": note,
                    "posts_today": [{"clip_id": u["clip_id"], "title": u["title"], "created": u["created"], "url": u.get("url") or "",
                                     "kind": u.get("c_kind", "video"), "state": u.get("state")}
                                    for u in sorted(tried, key=lambda u: u["created"] or "") if (u["created"] or "")[:10] == today
                                    and u.get("state") != "failed"][:8],
                    "health": account_health(mine, posts_7d, bool(hist), int(v7), now_dt)})
    out.sort(key=lambda x: (-x["views_7d"], -x["views"], x["platform"], x["name"]))
    return out


def up_next(ws, clips: list, uploads: list, camps: dict, accounts: list, pol_platforms: list, auto_files: set,
            limit: int = 30, paused: set | None = None) -> list:
    """Approved clips not posted yet and the account each goes to next: the autopilot hands every clip to exactly one
    account per platform, the one with the most room under today's cap (ties: fewest posts overall, then name), in
    score order like pipeline.autopilot. "*" accounts resolve to the accounts already seen posting (no network here)."""
    load = {(a["platform"], a["name"]): [a["today"], a["posts"], a["cap"]] for a in accounts}
    seen: dict[str, list] = {}
    for a in accounts:
        seen.setdefault(a["platform"], []).append(a["name"])
    by_name = {c.get("name"): c for c in camps.values()}
    done = {}
    for u in uploads:
        if u.get("state") != "failed":
            done.setdefault(u["clip_id"], set()).add(u["platform"])
    out = []
    for x in sorted((x for x in clips if x["status"] == "approved"), key=lambda x: (-x["score"], x["id"])):
        c = by_name.get(x["campaign"]) or {}
        if c.get("_path") not in auto_files:   # only campaigns on autopilot post by themselves
            continue
        if x["campaign"] in (paused or set()):   # paused by the live budget check: its clips wait
            continue
        plats = [str(p).lower() for p in c.get("platforms") or pol_platforms or []]
        plats = [p for p in plats if not pol_platforms or p in pol_platforms]
        for p in plats:
            if p in done.get(x["id"], set()):
                continue
            names = campaign_accounts(c, p, sorted(seen.get(p, [])))
            if not names:   # brand campaign without a brand-named account yet
                continue
            for n in names:
                load.setdefault((p, n), [0, 0, platform_ceiling(p, DEFAULT_MAX_PER_DAY)])
            # the pipeline's rotation: the account with the most room left today, then the fewest posts overall
            pick = sorted(names, key=lambda n: (-(load[(p, n)][2] - load[(p, n)][0]), load[(p, n)][1], n))[0]
            l = load[(p, pick)]
            slot = "next run" if l[0] < l[2] else "tomorrow"
            if slot == "next run":
                l[0] += 1
                l[1] += 1
            out.append({"clip_id": x["id"], "title": x["title"], "campaign": x["campaign"], "score": x["score"],
                        "thumb": x["thumb"], "kind": x.get("kind", "video"), "dur": x["dur"], "platform": p,
                        "account": pick, "slot": slot,
                        "reason": "fewest posts today" if len(names) > 1 else "the campaign's only account"})
            if len(out) >= limit:
                return out
    return out


def format_split(uploads: list) -> list[dict]:
    out = []
    for k in KINDS:
        us = [u for u in uploads if u.get("c_kind", "video") == k]
        v = sum(int(u["views"] or 0) for u in us)
        lk = sum(int(u["likes"] or 0) for u in us)
        out.append({"kind": k, "posts": len(us), "views": v, "avg_views": round(v / len(us)) if us else 0,
                    "engagement": round(lk / v, 4) if v else 0.0})
    return out


# ---------------------------------------------------------------- submit list, content supply, status light (v2.3)

ACTIONS_URL = "https://github.com/demetrades2000-coder/nq-dashboard/actions/workflows/clipper-cloud.yml"
STALE_FACTOR = 1.5          # a run older than this many schedule intervals = the autopilot is stuck
SUPPLY_WARN_DAYS, SUPPLY_BAD_DAYS = 3.0, 1.0
PACE_DAYS = 3
SUBMIT_LIMIT = 200
SUPPLY_REFILL = ("New footage in the Drive folder gets clipped automatically, and more slideshow decks are generated "
                 "automatically. Nothing for you to do unless this stays red.")


def submit_list(uploads: list, camps: dict, limit: int = SUBMIT_LIMIT) -> list[dict]:
    """Every live upload with a link that the database does not mark submitted (submitted_at empty). Failed uploads and
    TikTok drafts have no link. Newest first; the page sorts oldest first (the next link to paste)."""
    out = []
    for u in uploads:
        if not u.get("url") or u.get("submitted_at") or u.get("state") in ("failed", "draft"):
            continue
        c = camps.get(u["campaign"]) or {}
        out.append({"clip_id": u["clip_id"], "platform": u["platform"], "url": u["url"], "title": u["title"],
                    "page": (c.get("permission") or {}).get("campaign_url", "") or "",
                    "campaign": u["campaign"] or "", "account": u["account"], "created": u["created"],
                    "views": int(u["views"] or 0), "likes": int(u["likes"] or 0), "upload_id": u.get("id")})
    return out[:limit]


def _supply_level(days, total, per_day) -> str:
    if not per_day:
        return "none"
    if days is None:
        return "none"
    return "bad" if days < SUPPLY_BAD_DAYS else "warn" if days < SUPPLY_WARN_DAYS else "good"


def supply_meter(ws, campaigns: list, uploads: list, acc_detail: list, now_dt: dt.datetime) -> dict:
    """Approved clips waiting to be posted (campaigns on autopilot that are not paused), by kind, against how fast the
    autopilot posts: distinct clips uploaded per day over the last 3 days, else the configured caps (the busiest platform's
    accounts x their daily cap). days_left is total / pace; amber under 3 days, red under 1."""
    ok_campaigns = {c["name"] for c in campaigns if c["auto"] and c["live"]["state"] != "paused"}
    ccols = {r[1] for r in ws.q("PRAGMA table_info(clips)")}
    kind_sql = "COALESCE(NULLIF(kind, ''), 'video')" if "kind" in ccols else "'video'"
    have = {k: 0 for k in KINDS}
    for r in ws.q(f"SELECT campaign, {kind_sql} AS k, COUNT(*) AS n FROM clips WHERE status='approved' GROUP BY campaign, k"):
        if r["campaign"] in ok_campaigns:
            have[_kind(r["k"])] += int(r["n"])
    t0 = now_dt - dt.timedelta(days=PACE_DAYS)
    recent = {k: set() for k in KINDS}
    for u in uploads:
        if u.get("state") != "failed" and u["_t"] and u["_t"] >= t0:
            recent[_kind(u.get("c_kind"))].add(u["clip_id"])
    hist_n = sum(len(v) for v in recent.values())
    if hist_n:
        pace_src, per_kind = "history", {k: len(recent[k]) / PACE_DAYS for k in KINDS}
        per_day = hist_n / PACE_DAYS
    else:
        caps: dict[str, int] = {}
        for a in acc_detail:
            caps[a["platform"]] = caps.get(a["platform"], 0) + int(a.get("cap") or 0)
        per_day = float(max(caps.values())) if caps else 0.0
        pace_src = "caps" if per_day else "none"
        per_kind = {k: 0.0 for k in KINDS}
    total = sum(have.values())
    days = round(total / per_day, 1) if per_day else None
    by_kind = {k: {"per_day": round(per_kind[k], 2),
                   "days_left": round(have[k] / per_kind[k], 1) if per_kind[k] else None} for k in KINDS}
    decks = ws.setting("supply.decks_available", None)
    decks = int(decks) if isinstance(decks, (int, float)) and not isinstance(decks, bool) and decks >= 0 else None
    note = ws.setting("supply.note", "")
    return {"video": have["video"], "slideshow": have["slideshow"], "total": total, "per_day": round(per_day, 2),
            "pace_source": pace_src, "days_left": days, "level": _supply_level(days, total, per_day), "by_kind": by_kind,
            "refill": SUPPLY_REFILL, "decks_available": decks, "note": note.strip()[:200] if isinstance(note, str) else ""}


EMPTY_SUPPLY = {"video": 0, "slideshow": 0, "total": 0, "per_day": 0.0, "pace_source": "none", "days_left": None,
                "level": "none", "by_kind": {k: {"per_day": 0.0, "days_left": None} for k in KINDS},
                "refill": SUPPLY_REFILL, "decks_available": None, "note": ""}


def _reason(level, code, text, page=None, action=None) -> dict:
    return {"level": level, "code": code, "text": text, "page": page, "action": action}


def _note(code, text, page=None, action=None) -> dict:
    return {"level": "info", "code": code, "text": text, "page": page, "action": action}


def status_light(now_dt: dt.datetime, enabled: bool, last: dict, every: int, accounts: list, acc_detail: list,
                 campaigns: list, supply: dict, uploads: list, pol: dict, in_hours: bool, ext: dict | None = None) -> dict:
    """Traffic light for the top of Today and Submit: green 'Everything is running', amber / red with every reason (worst
    first). The run-age reason depends on the clock: the page re-evaluates `run` live; everything else is as built.
    `ext` carries the autopilot brain's blocks (lifecycle, bench, launch, runs): each adds reasons only when the key
    exists. `notes` are FYI lines (a campaign switched, a warm-up) that never change the light."""
    ext = ext or {}
    reasons, notes = [], []
    fin = _parse(last.get("finished"))
    stale_after = round(every * STALE_FACTOR, 2)
    age_h = round((now_dt - fin).total_seconds() / 3600, 2) if fin else None
    go = {"label": "Open GitHub Actions", "url": ACTIONS_URL}
    launch, runs = ext.get("launch") or {}, ext.get("runs") or {}
    lc, bench = ext.get("lifecycle") or {}, ext.get("bench") or {}
    zk = next((i for i in launch.get("items", []) if i["id"] == "zernio_key"), None)
    last_key = (runs.get("summary") or {}).get("last_key")
    key_missing = bool((zk and not zk["done"]) or last_key is False)
    if key_missing:
        reasons.append(_reason("red", "key_missing", "The Zernio key is missing: nothing can be posted", "jobs",
                               {"label": "Add the key in GitHub", "url": SECRETS_URL}))
    if enabled and age_h is not None and age_h > stale_after:
        reasons.append(_reason("red", "stale_run", f"Autopilot hasn't run for {round(age_h)}h — restart", "jobs", go))
    elif enabled and age_h is None:
        reasons.append(_reason("amber", "never_ran", "Autopilot hasn't run yet — it starts at the next scheduled run",
                               "jobs", go))
    if not enabled:
        reasons.append(_reason("amber", "autopilot_off", "Autopilot is off — nothing posts until it is turned on", "settings"))
    t24 = now_dt - dt.timedelta(hours=24)
    posted_24h = [u for u in uploads if u.get("state") != "failed" and u["_t"] and u["_t"] >= t24]
    no_acc = not any(a["connected"] for a in accounts) and not posted_24h
    if no_acc and not key_missing:
        reasons.append(_reason("red", "no_accounts", "No posting account is connected — nothing can be posted", "accounts"))
    if enabled and not no_acc and supply["total"] > 0 and not posted_24h and in_hours:
        reasons.append(_reason("red", "no_uploads_24h", "Nothing posted in the last 24 hours, but clips are waiting",
                               "accounts", go if age_h is not None and age_h > every else None))
    paused = [c["name"] for c in campaigns if c["auto"] and c["live"]["state"] == "paused"]
    if paused:
        reasons.append(_reason("amber", "paused", f"{len(paused)} campaign{'s' if len(paused) != 1 else ''} paused "
                               f"(budget): {', '.join(paused[:3])}", "campaigns"))
    if supply["level"] in ("warn", "bad"):
        d = supply["days_left"]
        reasons.append(_reason("red" if supply["level"] == "bad" else "amber", "supply",
                               ("Content has run out" if not supply["total"] else
                                f"Content running low — about {d:g} day{'s' if d != 1 else ''} left"), "accounts"))
    limited = [a["name"] for a in acc_detail if (a.get("health") or {}).get("state") == "limited"]
    if limited:
        reasons.append(_reason("amber", "accounts_limited", f"{len(limited)} account{'s' if len(limited) != 1 else ''} "
                               f"possibly limited: {', '.join('@' + n for n in limited[:3])}", "accounts"))
    errs = [a["name"] for a in acc_detail if a["status"] == "error"]
    if errs:
        reasons.append(_reason("amber", "account_errors", f"{len(errs)} account{'s' if len(errs) != 1 else ''} with "
                               f"upload problems: {', '.join('@' + n for n in errs[:3])}", "accounts"))
    elif last.get("upload_errors"):
        n = last["upload_errors"] if isinstance(last["upload_errors"], int) else len(last["upload_errors"])
        if n:
            reasons.append(_reason("amber", "upload_errors", f"Last run had {n} upload error{'s' if n != 1 else ''}",
                                   "activity"))
    # the autopilot brain's keys: each only when it exists
    mg = [(a, a.get("manager") or {}) for a in acc_detail]
    reconnect = [a["name"] for a, m in mg if m.get("health") == "error"]
    if reconnect:
        reasons.append(_reason("amber", "account_reconnect", f"Reconnect {', '.join('@' + n for n in reconnect[:3])} in Zernio",
                               "accounts", {"label": "Open Zernio", "url": ZERNIO_URL}))
    idle = [a["name"] for a, m in mg if m.get("mode") == "idle" and m.get("campaign")]
    if idle:
        reasons.append(_reason("amber", "account_idle", f"{len(idle)} account{'s' if len(idle) != 1 else ''} idle: "
                               f"{', '.join('@' + n for n in idle[:3])}", "accounts"))
    warm = [(a["name"], m) for a, m in mg if m.get("mode") == "warmup"]
    if warm:
        n, m = warm[0]
        day = f"day {m['warmup_day']} of {m['warmup_total']}" if m.get("warmup_day") else "warming up"
        notes.append(_note("account_warmup", f"@{n} is {day} of its warm-up: very few posts a day is on purpose", "accounts"))
    if lc.get("present"):
        cs = [x for x in (lc.get("campaigns") or []) if x["known"]]
        if enabled and cs and not any(x["state"] == "active" for x in cs):
            standby = any(x["state"] == "standby" for x in cs)
            reasons.append(_reason("amber" if standby else "red", "no_campaign_active",
                                   "No campaign is posting right now" + (" — one is waiting for an account" if standby else ""),
                                   "campaigns"))
        blocked = [x["name"] for x in cs if x["state"] == "blocked"]
        if blocked:
            reasons.append(_reason("amber", "campaign_blocked", f"{len(blocked)} campaign{'s' if len(blocked) != 1 else ''} blocked "
                                   f"by the rules (needs you): {', '.join(blocked[:2])}", "campaigns"))
        ls = lc.get("last_switch")
        lt = _parse(ls["ts"]) if ls else None
        if ls and lt and lt >= now_dt - dt.timedelta(hours=24):
            notes.append(_note("campaign_switched", ls["text"], "campaigns"))
    if bench.get("present") and bench.get("need_more"):
        mn = bench.get("min")
        reasons.append(_reason("amber", "bench_thin", f"Only {bench.get('healthy', 0)} healthy campaign"
                               f"{'s' if bench.get('healthy') != 1 else ''}" + (f" (want {mn})" if mn else "") + ": join another",
                               "campaigns"))
    if launch.get("present") and not launch.get("complete"):
        if launch.get("auto_left"):
            first = next((i for i in launch["items"] if not i["done"] and not i["manual"] and not i["optional"]), None)
            reasons.append(_reason("amber", "launch_blocked", f"Setup: {launch['auto_left']} step"
                                   f"{'s' if launch['auto_left'] != 1 else ''} left ({first['label'] if first else ''})", "today"))
        elif launch.get("manual_left"):
            notes.append(_note("launch_todo", f"Setup: {launch['manual_left']} step{'s' if launch['manual_left'] != 1 else ''} "
                               "for you to tick off", "today"))
    reasons.sort(key=lambda r: 0 if r["level"] == "red" else 1)
    level = "red" if any(r["level"] == "red" for r in reasons) else "amber" if reasons else "green"
    head = "Everything is running" if not reasons else reasons[0]["text"]
    return {"level": level, "headline": head, "reasons": reasons, "notes": notes,
            "run": {"finished": fin.isoformat(timespec="seconds") if fin else None, "every_hours": every,
                    "stale_after_hours": stale_after, "age_hours": age_h, "enabled": enabled, "actions_url": ACTIONS_URL}}


EMPTY_STATUS = {"level": "green", "headline": "Everything is running", "reasons": [], "notes": [],
                "run": {"finished": None, "every_hours": 6, "stale_after_hours": 9, "age_hours": None, "enabled": False,
                        "actions_url": ACTIONS_URL}}


# ---------------------------------------------------------------- v4: the autopilot brain's keys (docs/AUTOPILOT_CONTRACT.md)
# Every key may be absent: each builder returns a complete, empty-but-valid object and the page says "not reported yet".

CONTRACT = 4
CAMP_STATES = {"active": "Posting now", "standby": "Ready, waiting its turn", "paused": "Paused",
               "ended": "Ended", "blocked": "Blocked: needs you"}
ACC_MODES = {"warmup": "Warm-up", "normal": "Normal", "slow": "Slowed down", "cooldown": "Cooling down", "idle": "Idle",
             "unknown": "Not reported yet"}
ACC_HEALTH = ("ok", "limited", "new", "error")
WARMUP_DAYS = 5
EARN_DAYS, HOLD_DAYS = 7, 3          # Content Rewards: views count for 7 days, then a 3-day hold
PAYOUT_LAG_DAYS = EARN_DAYS + HOLD_DAYS
RULES_WORDS = ["AI", "automat", "tool", "repurpos"]
STATE_LIMIT_BYTES = 1_000_000_000
SECRETS_URL = "https://github.com/demetrades2000-coder/nq-dashboard/settings/secrets/actions/new"
ZERNIO_URL = "https://zernio.com"
RUN_LIMIT, SWITCH_LIMIT, ERRORS_LIMIT, MONEY_ROWS = 100, 60, 20, 400
SWITCH_GROUP_MIN = 20                # switch-log lines within 20 minutes read as one story

CHANGELOG = [
    {"id": "command-center", "title": "Command center", "text": "Today now shows what happened, what is next, and the money picture on one screen."},
    {"id": "lifecycle", "title": "Campaign lifecycle", "text": "Each campaign shows its state, why, budget burn and the switch log; the bench shows who to join next."},
    {"id": "launch", "title": "Setup checklist", "text": "A progress ring walks you through setup with copy buttons for every name and link."},
    {"id": "library", "title": "Content library", "text": "Filter and search every clip, see why it was held in plain words and exactly what posts next."},
    {"id": "insights", "title": "Insights and weekly report", "text": "Plain-sentence insights with an honest confidence label, an A/B view and a printable weekly report."},
    {"id": "payouts", "title": "Payout log", "text": "Type what Content Rewards actually paid and compare it to the estimates; export CSV."},
    {"id": "tools", "title": "Faster to use", "text": "Command palette (press / or Ctrl+K), swipe between tabs, light theme, Help page."},
]

ERROR_HELP = [   # (pattern, title, plain words, what to do, extra action)
    (r"403|forbidden|members[- ]only|private video|sign in to confirm", "A source video is not public",
     "The video is private, members-only or age-gated, so it cannot be downloaded.",
     "Nothing to do: that video is skipped and the others keep going.", None),
    (r"401|unauthori[sz]ed|invalid (api )?key|api key|invalid token|token (expired|invalid)|expired token|no api key|missing key",
     "The Zernio key is missing or no longer works",
     "Zernio refused our key, so nothing can be posted until it is fixed.",
     "Create a new key in Zernio and save it in GitHub as the secret ZERNIO_API_KEY.", "key"),
    (r"account.*(not found|not connected|disconnected|expired)|reconnect|no (tiktok|instagram|youtube) account|not authori[sz]ed",
     "An account needs reconnecting",
     "Zernio lost the login for one of the accounts.",
     "Open Zernio, press Reconnect on that account, then run the autopilot again.", "zernio"),
    (r"timed? ?out|timeout|processing|connection (reset|aborted)|temporar|try again|5\d\d\b|bad gateway|unavailable",
     "A temporary problem",
     "The service was slow or briefly down. This usually fixes itself.",
     "Nothing to do: it is retried on the next run.", None),
    (r"429|rate.?limit|too many|quota", "A rate limit was hit",
     "We asked for too much too fast and the service asked us to slow down.",
     "Nothing to do: the autopilot waits and tries again.", None),
    (r"daily (upload )?cap|cap \(\d+\) reached", "A daily cap was reached",
     "That account already posted the most it is allowed today.",
     "Nothing to do: the rest wait for tomorrow.", None),
    (r"budget|out of money|closed|not funded|paused automatically", "A campaign ran low on budget",
     "The campaign has little or no money left, so posting moved elsewhere.",
     "Nothing to do. If you want it back, wait for the brand to refill it.", None),
    (r"disk|no space|space left", "Storage is almost full",
     "There is not enough room to store more clips.", "Open Jobs & health and clear old renders.", None),
    (r"ffmpeg", "The video tool is missing", "ffmpeg is needed to cut and render clips.",
     "Install ffmpeg, or let the cloud runner do the cutting.", None),
    (r"rules don.?t allow|automat(ed|ion).*(ban|not allowed)|not confirmed", "A campaign's rules do not allow tools",
     "The campaign bans or does not clearly allow automated clipping, so it is skipped on purpose.",
     "Nothing to do. Only you can decide to clip it by hand.", None),
]


def explain_error(text) -> dict:
    """Plain-words explanation of an error line: {title, plain, fix, action}. Unknown text gets a calm generic answer."""
    t = str(text or "")
    for pat, title, plain, fix, act in ERROR_HELP:
        if re.search(pat, t, re.I):
            action = ({"label": "Add the key in GitHub", "url": SECRETS_URL} if act == "key" else
                      {"label": "Open Zernio", "url": ZERNIO_URL} if act == "zernio" else None)
            return {"title": title, "plain": plain, "fix": fix, "action": action}
    return {"title": "Something went wrong", "plain": "The autopilot hit a problem it does not have a name for.",
            "fix": "If it keeps coming back on every run, copy the line and send it to Claude.", "action": None}


def _dict_setting(ws, key):
    try:
        v = ws.setting(key, None)
    except Exception:
        return None
    return v if isinstance(v, dict) and v else None


def _list_setting(ws, key) -> list:
    try:
        v = ws.setting(key, None)
    except Exception:
        return []
    return v if isinstance(v, list) else []


def _str(v, n=200) -> str:
    return str(v).strip()[:n] if v not in (None, "") else ""


def _days_txt(d) -> str:
    return f"{d:.0f}" if d >= 10 else f"{d:.1f}".rstrip("0").rstrip(".")


def _strs(v, n=8) -> list:
    return [str(x) for x in v if x not in (None, "")][:n] if isinstance(v, (list, tuple)) else _names(v)[:n]


def confidence(n: int) -> dict:
    """An honest label for how much a number can be trusted."""
    n = int(n or 0)
    if n < 5:
        return {"level": "low", "n": n, "label": f"only {n} post{'s' if n != 1 else ''} so far: too early to trust"}
    if n < 15:
        return {"level": "early", "n": n, "label": f"early signal ({n} posts)"}
    if n < 40:
        return {"level": "fair", "n": n, "label": f"fair sample ({n} posts)"}
    return {"level": "solid", "n": n, "label": f"solid sample ({n} posts)"}


# ---- campaign lifecycle

def burn_projection(left, hist, budget=None) -> dict:
    """How fast a campaign's budget is going, from [ts, left] history points (a list or {ts,left} dicts)."""
    pts = []
    for h in hist if isinstance(hist, list) else []:
        try:
            t, v = (_parse(h.get("ts")), _num(h.get("left"))) if isinstance(h, dict) else (_parse(h[0]), _num(h[1]))
        except Exception:
            continue
        if t and v is not None:
            pts.append((t, v))
    pts.sort(key=lambda x: x[0])
    out = {"per_day": None, "days_left": None, "source": "none", "points": len(pts),
           "note": "Not enough history yet to project the budget."}
    if len(pts) < 2:
        return out
    span = (pts[-1][0] - pts[0][0]).total_seconds() / 86400
    used = pts[0][1] - pts[-1][1]
    if span < 0.25:
        return out
    if used <= 0:
        return dict(out, source="history", note="The budget has not moved recently.")
    per = used / span
    now_left = left if left is not None else pts[-1][1]
    dl = now_left / per if per else None
    return {"per_day": round(per, 2), "days_left": round(dl, 1) if dl is not None else None, "source": "history",
            "points": len(pts),
            "note": (f"~{_days_txt(dl)} days of budget left at the current pace" if dl is not None else "")}


def campaign_lifecycle(ws, c: dict) -> dict:
    """State of one campaign row (`c` is the built campaigns[] entry) from setting campaign_state.<name>; without it the
    state is derived from what the dashboard already knows and `known` is false."""
    name = c["name"]
    raw = _dict_setting(ws, f"campaign_state.{name}") or {}
    live = c.get("live") or {}
    live_raw = _dict_setting(ws, f"campaign_live.{name}") or {}
    st = str(raw.get("state") or "").lower()
    known = st in CAMP_STATES
    if not known:
        if c.get("automation_allowed") is False:
            st, why = "blocked", "The rules ban automated tools."
        elif live.get("state") == "paused":
            st, why = "paused", live.get("reason") or "Budget low or closed."
        elif c.get("auto") and not c.get("problems"):
            st, why = "active", "On autopilot."
        else:
            st, why = "standby", "Not on autopilot yet." if not c.get("auto") else "Needs setup."
        why = "The autopilot has not reported this yet. " + why
    else:
        why = _str(raw.get("reason"))
    left = _num(raw.get("left"), live.get("left"))
    budget = _num(raw.get("budget"), live.get("budget"))
    frac = round(min(1.0, max(0.0, (budget - left) / budget)), 4) if left is not None and budget else live.get("spent_frac")
    hist = raw.get("history") if isinstance(raw.get("history"), list) else live_raw.get("history")
    return {"name": name, "known": known, "state": st, "state_label": CAMP_STATES[st], "reason": why,
            "since": _local_iso(raw.get("since")), "priority": _num(raw.get("priority")),
            "rank": _int(raw.get("rank")), "accounts": _strs(raw.get("accounts")),
            "supply_days": _num(raw.get("supply_days")), "left": left, "budget": budget,
            "cpm": _num(raw.get("cpm"), live.get("cpm")), "spent_frac": frac,
            "checked": _local_iso(raw.get("checked")) or live.get("checked"),
            "burn": burn_projection(left, hist, budget)}


def empty_lifecycle(name: str) -> dict:
    return {"name": name, "known": False, "state": "standby", "state_label": CAMP_STATES["standby"], "reason": "",
            "since": None, "priority": None, "rank": None, "accounts": [], "supply_days": None, "left": None,
            "budget": None, "cpm": None, "spent_frac": None, "checked": None,
            "burn": {"per_day": None, "days_left": None, "source": "none", "points": 0,
                     "note": "Not enough history yet to project the budget."}}


def _switch_text(r: dict) -> str:
    kind, camp, frm, to, why = r["kind"], r["campaign"], r["from"], r["to"], r["reason"].rstrip(".")
    tail = f": {why}" if why else ""
    if kind in ("paused", "resumed", "promoted", "demoted", "ended"):
        return f"{camp or 'A campaign'} {kind}{tail}"
    if kind == "account_moved":
        who = camp or "An account"
        move = (f" from {frm}" if frm else "") + (f" to {to}" if to else "")
        return f"{who} moved{move}{tail}"
    if kind == "account_idle":
        return f"{camp or 'An account'} went idle{tail}"
    return f"{camp or 'Autopilot'} {kind.replace('_', ' ') or 'changed'}{tail}"


def switch_log(ws, limit: int = SWITCH_LIMIT) -> tuple[list, list]:
    """(flat entries newest first, grouped stories newest first). Lines within 20 minutes of each other are one story:
    "Tradever paused: budget almost gone -> BILF promoted"."""
    rows = []
    for r in _list_setting(ws, "switch.log")[-200:]:
        if not isinstance(r, dict):
            continue
        row = {"ts": _local_iso(r.get("ts")), "kind": _str(r.get("kind"), 40).lower(), "campaign": _str(r.get("campaign")),
               "from": _str(r.get("from")), "to": _str(r.get("to")), "reason": _str(r.get("reason"), 240)}
        row["text"] = _switch_text(row)
        rows.append(row)
    rows.sort(key=lambda r: r["ts"] or "")
    groups = []
    for r in rows:
        t = _parse(r["ts"])
        g = groups[-1] if groups else None
        if g and t and g["_t"] and (t - g["_t"]).total_seconds() <= SWITCH_GROUP_MIN * 60:
            g["items"].append(r)
            g["_t"] = t
            g["ts"] = r["ts"]
        else:
            groups.append({"ts": r["ts"], "_t": t, "items": [r]})
    out_groups = [{"ts": g["ts"], "text": " → ".join(i["text"] for i in g["items"]),
                   "kinds": [i["kind"] for i in g["items"]], "campaigns": [i["campaign"] for i in g["items"] if i["campaign"]],
                   "count": len(g["items"])} for g in groups]
    return list(reversed(rows))[:limit], list(reversed(out_groups))[:limit]


def lifecycle_block(ws, campaigns: list, now_dt: dt.datetime) -> dict:
    names = {c["name"] for c in campaigns}
    cs = [c["lifecycle"] for c in campaigns]
    extra = []
    try:
        for r in ws.q("SELECT key, value FROM settings WHERE key LIKE 'campaign_state.%'"):
            nm = r["key"][len("campaign_state."):]
            if nm in names:
                continue
            stub = {"name": nm, "auto": False, "live": dict(EMPTY_LIVE), "problems": [], "automation_allowed": None}
            extra.append(campaign_lifecycle(ws, stub))
    except Exception:
        extra = []
    weight = {"active": 0, "standby": 1, "paused": 2, "blocked": 3, "ended": 4}
    allc = cs + extra
    allc.sort(key=lambda x: (weight.get(x["state"], 9), x["rank"] if x["rank"] is not None else 999,
                             -(x["priority"] or 0), x["name"]))
    counts = {k: sum(1 for x in allc if x["state"] == k) for k in CAMP_STATES}
    flat, groups = switch_log(ws)
    return {"present": any(x["known"] for x in allc), "campaigns": allc, "order": [x["name"] for x in allc], "counts": counts,
            "extra": extra, "switch_log": flat, "switch_groups": groups,
            "last_switch": groups[0] if groups else None}


EMPTY_LIFECYCLE = {"present": False, "campaigns": [], "order": [], "counts": {k: 0 for k in CAMP_STATES}, "extra": [], "switch_log": [],
                   "switch_groups": [], "last_switch": None}


# ---- the bench (campaigns to join next)

def lead_row(r: dict) -> dict | None:
    """One discovered campaign normalised (shared by leads_discovered and bench.join_next)."""
    if not isinstance(r, dict) or not (r.get("name") or r.get("url")):
        return None
    url = str(r.get("url") or "")
    url = url if re.match(r"https?://", url) else ""
    rates = {}
    for p, v in (r.get("rates") or {}).items() if isinstance(r.get("rates"), dict) else []:
        if isinstance(v, dict):
            rates[str(p).lower()] = {"cpm": _num(v.get("cpm")), "min": _num(v.get("min")), "max": _num(v.get("max"))}
    tk = rates.get("tiktok") or (next(iter(rates.values())) if rates else {})
    left, budget = _num(r.get("left")), _num(r.get("budget"))
    return {"id": str(r.get("id") or ""), "name": str(r.get("name") or url)[:160], "org": str(r.get("org") or ""),
            "url": url, "rates": rates, "platforms": list(rates), "cpm": tk.get("cpm"), "min": tk.get("min"),
            "max": tk.get("max"), "left": left, "budget": budget,
            "spent_frac": round(min(1.0, max(0.0, (budget - left) / budget)), 4) if left is not None and budget else None,
            "creators": _int(r.get("creators")), "views": _int(r.get("views")),
            "categories": _names(r.get("categories")), "types": _names(r.get("types")),
            "content_rules": _int(r.get("content_rules")), "requirements": _int(r.get("requirements")),
            "requires_application": r.get("requires_application") if isinstance(r.get("requires_application"), bool) else None,
            "score": _num(r.get("score"), 0.0) or 0.0}


def bench_block(ws, campaigns: list) -> dict:
    raw = _dict_setting(ws, "bench")
    healthy_now = sum(1 for c in campaigns if c["lifecycle"]["state"] in ("active", "standby") and
                      (c["lifecycle"]["budget"] is None or (c["lifecycle"]["left"] or 0) > 0))
    if not raw:
        return {"present": False, "healthy": healthy_now, "min": None, "need_more": False, "reason": "", "join_next": []}
    join = []
    for i, r in enumerate(raw.get("join_next") if isinstance(raw.get("join_next"), list) else []):
        lead = lead_row(r)
        if not lead:
            continue
        lead["rank"] = _int(r.get("rank")) or i + 1
        lead["join_message"] = f"I joined {lead['name']}: here are its rules"
        lead["rules_words"] = list(RULES_WORDS)
        join.append(lead)
        if len(join) >= 5:
            break
    mn = _int(raw.get("min"))
    healthy = _int(raw.get("healthy"))
    healthy = healthy if healthy is not None else healthy_now
    need = raw.get("need_more")
    need = bool(need) if isinstance(need, bool) else bool(mn is not None and healthy < mn)
    return {"present": True, "healthy": healthy, "min": mn, "need_more": need, "reason": _str(raw.get("reason"), 300),
            "join_next": join}


# ---- accounts (account manager)

def account_manager(ws, platform: str, name: str, acc: dict, now_dt: dt.datetime) -> dict:
    raw = _dict_setting(ws, f"account_state.{platform}/{name}") or {}
    mode = str(raw.get("mode") or "").lower()
    known = mode in ACC_MODES and mode != "unknown"
    if not known:
        mode = "unknown"
    reason = _str(raw.get("reason"), 240)
    since = _local_iso(raw.get("since"))
    health = str(raw.get("health") or "").lower()
    health = health if health in ACC_HEALTH else ""
    wd, wt = None, WARMUP_DAYS
    if mode == "warmup":
        m = re.search(r"day\s+(\d+)\s+of\s+(\d+)", reason, re.I)
        if m:
            wd, wt = int(m.group(1)), int(m.group(2))
        else:
            s = _parse(since)
            wd = min(WARMUP_DAYS, max(1, (now_dt - s).days + 1)) if s else None
    median = _int(raw.get("median_views_recent"))
    own = (acc.get("health") or {}).get("state")
    status = acc.get("status")
    score = account_score(health or {"ok": "ok", "early": "new", "no_posts": "new", "limited": "limited"}.get(own, ""),
                          median, _int(raw.get("posts_7d")) if raw.get("posts_7d") is not None else acc.get("posts_7d"),
                          status, mode)
    return {"known": known, "mode": mode, "mode_label": ACC_MODES[mode], "reason": reason, "since": since,
            "campaign": raw.get("campaign") if isinstance(raw.get("campaign"), str) and raw.get("campaign") else None,
            "posts_total": _int(raw.get("posts_total")), "posts_7d": _int(raw.get("posts_7d")),
            "median_views_recent": median, "health": health or None, "warmup_day": wd, "warmup_total": wt,
            "score": score, "score_label": "good" if score is None else "good" if score >= 70 else "fair" if score >= 45 else "poor"}


def account_score(health, median, posts_7d, status, mode):
    """A rough 0-100 guide to how an account is doing (None when there is nothing to judge)."""
    base = {"ok": 80, "new": 55, "limited": 30, "error": 10}.get(health)
    if base is None:
        return None
    if median:
        base += min(15, int(math.log10(max(median, 1)) * 5))
    if not posts_7d and mode not in ("warmup", "cooldown", "idle"):
        base -= 10
    if status == "error":
        base = min(base, 25)
    return max(0, min(100, base))


def _empty_account(platform: str, name: str, campaign=None) -> dict:
    return {"platform": platform, "name": name, "campaigns": [campaign] if campaign else [], "today": 0, "cap": 0,
            "posts": 0, "posts_7d": 0, "views": 0, "views_7d": 0, "avg_views": 0, "likes": 0, "engagement": 0.0,
            "last_post": None, "net": 0.0, "net_7d": 0.0, "slideshows": 0, "daily_views": [0] * 14, "status": "idle",
            "status_note": "nothing posted yet", "posts_today": [],
            "health": {"state": "no_posts", "median_last4": None,
                       "note": "Connected, but nothing posted yet. The next run should post here."}}


def attach_managers(ws, acc_detail: list, now_dt: dt.datetime, cap_setting: int) -> list:
    have = {(a["platform"], a["name"]) for a in acc_detail}
    try:
        for r in ws.q("SELECT key FROM settings WHERE key LIKE 'account_state.%'"):
            k = r["key"][len("account_state."):]
            if "/" not in k:
                continue
            p, n = k.split("/", 1)
            if (p, n) not in have:
                raw = _dict_setting(ws, r["key"]) or {}
                row = _empty_account(p, n, raw.get("campaign") if isinstance(raw.get("campaign"), str) else None)
                row["cap"] = min(cap_setting, platform_ceiling(p, cap_setting))
                acc_detail.append(row)
                have.add((p, n))
    except Exception:
        pass
    for a in acc_detail:
        a.setdefault("posts_today", [])
        a["manager"] = _safe(lambda a=a: account_manager(ws, a["platform"], a["name"], a, now_dt), empty_manager())
    return acc_detail


def empty_manager() -> dict:
    return {"known": False, "mode": "unknown", "mode_label": ACC_MODES["unknown"], "reason": "", "since": None,
            "campaign": None, "posts_total": None, "posts_7d": None, "median_views_recent": None, "health": None,
            "warmup_day": None, "warmup_total": WARMUP_DAYS, "score": None, "score_label": "good"}


def account_help(campaigns: list, acc_detail: list) -> dict:
    naming = []
    for c in campaigns:
        lc = c["lifecycle"]
        if lc["state"] in ("ended", "blocked"):
            continue
        m = c.get("account_match") or ""
        has = [a for a in acc_detail if c["name"] in (a.get("campaigns") or [])]
        naming.append({"campaign": c["name"], "match": m, "state": lc["state"],
                       "rule": (f"The TikTok username must contain “{m}”." if m else
                                "Any connected account works; name it in the campaign file."),
                       "examples": [f"{m}.clips", f"{m}.daily", f"{m}.trades"] if m else [],
                       "has_account": bool(has), "accounts": [a["name"] for a in has][:6]})
    return {"zernio_url": ZERNIO_URL, "naming": naming,
            "steps": ["Create the TikTok account in the TikTok app, with the brand word in the username.",
                      "In Zernio press Connect account, choose TikTok and sign in to that account.",
                      "Wait for the next autopilot run: it finds the account by itself and starts a 5-day warm-up."],
            "reconnect": ["Open Zernio and find the account with the red mark.",
                          "Press Reconnect and sign in to TikTok again.",
                          "Run the autopilot (Run workflow) or wait for the next run."]}


# ---- runs

def _runs_from_log(ws) -> list:
    log = ws.home / "logs" / "autopilot.jsonl"
    out = []
    try:
        for ln in log.read_text(encoding="utf-8").splitlines()[-RUN_LIMIT:]:
            try:
                r = json.loads(ln)
            except Exception:
                continue
            if not isinstance(r, dict):
                continue
            st, fin = _parse(r.get("started")), _parse(r.get("finished"))
            up = r.get("uploaded")
            errs = r.get("upload_errors")
            out.append({"ts": r.get("finished") or r.get("started"),
                        "duration_s": int((fin - st).total_seconds()) if st and fin else None,
                        "posted": len(up) if isinstance(up, list) else _int(up) or 0,
                        "errors": len(errs) if isinstance(errs, list) else _int(errs) or 0,
                        "queued_videos": None, "queued_slideshows": None, "switches": None,
                        "notes": [str(x) for x in (r.get("notes") or [])][:6] + [str(x) for x in (errs if isinstance(errs, list) else [])][:3],
                        "key": None})
    except OSError:
        pass
    return out


def runs_block(ws, uploads: list, now_dt: dt.datetime) -> dict:
    raw = [r for r in _list_setting(ws, "runs.history") if isinstance(r, dict)]
    source = "runs.history" if raw else "autopilot.jsonl"
    if not raw:
        raw = _runs_from_log(ws)
    if not raw:
        source = "none"
    rows = []
    for r in raw[-RUN_LIMIT:]:
        ts = _local_iso(r.get("ts"))
        if not ts:
            continue
        dur = _int(r.get("duration_s"))
        t = _parse(ts)
        w = dt.timedelta(seconds=(dur or 0) + 300)
        items = []
        for u in sorted(uploads, key=lambda u: u["_t"] or dt.datetime.min):
            if u.get("state") in ("failed", "draft") or not u["_t"] or not (t - w <= u["_t"] <= t + dt.timedelta(minutes=5)):
                continue
            items.append({"clip_id": u["clip_id"], "title": u["title"], "platform": u["platform"], "account": u["account"],
                          "kind": u.get("c_kind", "video")})
        notes = [str(x)[:200] for x in (r.get("notes") or []) if x][:6] if isinstance(r.get("notes"), list) else []
        errs = _int(r.get("errors")) or 0
        posted = _int(r.get("posted"))
        posted = posted if posted is not None else len(items)
        key = r.get("key") if isinstance(r.get("key"), bool) else None
        level = "bad" if errs or key is False else "ok" if posted else "info"
        what = (f"Posted {posted} clip{'s' if posted != 1 else ''}" if posted else "Nothing to post this time") + \
               (f", {errs} error{'s' if errs != 1 else ''}" if errs else "") + \
               (f", {_int(r.get('switches'))} campaign switch{'es' if _int(r.get('switches')) != 1 else ''}" if _int(r.get("switches")) else "")
        rows.append({"ts": ts, "duration_s": dur, "posted": posted, "errors": errs,
                     "queued_videos": _int(r.get("queued_videos")), "queued_slideshows": _int(r.get("queued_slideshows")),
                     "switches": _int(r.get("switches")), "notes": notes, "key": key, "level": level, "what": what,
                     "items": items[:6]})
    rows.sort(key=lambda r: r["ts"])
    rows = rows[-RUN_LIMIT:]
    rows.reverse()
    d1, d7 = now_dt - dt.timedelta(hours=24), now_dt - dt.timedelta(days=7)
    in1 = [r for r in rows if _parse(r["ts"]) and _parse(r["ts"]) >= d1]
    in7 = [r for r in rows if _parse(r["ts"]) and _parse(r["ts"]) >= d7]
    durs = [r["duration_s"] for r in rows if r["duration_s"]]
    summary = {"runs_24h": len(in1), "posted_24h": sum(r["posted"] for r in in1), "posted_7d": sum(r["posted"] for r in in7),
               "errors_7d": sum(r["errors"] for r in in7), "runs_7d": len(in7),
               "avg_duration_s": round(sum(durs) / len(durs)) if durs else None,
               "clean_rate": round(sum(1 for r in in7 if not r["errors"]) / len(in7), 3) if in7 else None,
               "last_ts": rows[0]["ts"] if rows else None, "last_key": rows[0]["key"] if rows else None,
               "queued_videos": rows[0]["queued_videos"] if rows else None,
               "queued_slideshows": rows[0]["queued_slideshows"] if rows else None}
    return {"present": bool(rows), "source": source, "history": rows, "summary": summary}


EMPTY_RUNS = {"present": False, "source": "none", "history": [],
              "summary": {"runs_24h": 0, "posted_24h": 0, "posted_7d": 0, "errors_7d": 0, "runs_7d": 0,
                          "avg_duration_s": None, "clean_rate": None, "last_ts": None, "last_key": None,
                          "queued_videos": None, "queued_slideshows": None}}


# ---- launch / setup checklist

def _copy_items(item_id: str, how: str, detail: str, campaigns: list, acc_detail: list) -> list:
    out = []
    text = f"{how} {detail}"
    for u in re.findall(r"https?://[^\s)\]>\"']+", text):
        out.append({"label": "Link", "value": u.rstrip(".,;")})
    for v in re.findall(r"[`“\"']([A-Za-z0-9_.@/\-]{3,60})[`”\"']", text):
        if re.search(r"[A-Z_]{4,}|@|\.|/", v) and v not in [o["value"] for o in out]:
            out.append({"label": "Name", "value": v})
    if item_id == "zernio_key" and not any(o["value"] == "ZERNIO_API_KEY" for o in out):
        out.insert(0, {"label": "Secret name", "value": "ZERNIO_API_KEY"})
    if item_id == "zernio_key" and not any("secrets" in o["value"] for o in out):
        out.append({"label": "Where to add it", "value": SECRETS_URL})
    if item_id in ("zernio_accounts", "account_matches_campaign"):
        for c in campaigns:
            m = c.get("account_match")
            if m and c["lifecycle"]["state"] not in ("ended", "blocked") and not any(c["name"] in (a.get("campaigns") or []) and a["posts"] for a in acc_detail):
                out.append({"label": f"Username for {c['name']}", "value": f"{m}.clips"})
    if item_id == "campaign_joined":
        for c in campaigns:
            if c.get("url") and c["auto"]:
                out.append({"label": f"Join {c['name']}", "value": c["url"]})
    seen, uniq = set(), []
    for o in out:
        if o["value"] not in seen:
            seen.add(o["value"])
            uniq.append(o)
    return uniq[:5]


def launch_block(ws, campaigns: list, acc_detail: list) -> dict:
    raw = _list_setting(ws, "launch.checklist")
    items = []
    for r in raw:
        if not isinstance(r, dict) or not (r.get("id") or r.get("label")):
            continue
        iid = _str(r.get("id"), 60) or re.sub(r"\W+", "_", _str(r.get("label"), 40).lower())
        optional = iid == "ntfy_topic" or r.get("optional") is True
        how, detail = _str(r.get("how"), 400), _str(r.get("detail"), 300)
        items.append({"id": iid, "label": _str(r.get("label"), 120) or iid, "done": bool(r.get("done")),
                      "manual": bool(r.get("manual")), "optional": optional, "how": how, "detail": detail,
                      "copy": _safe(lambda: _copy_items(iid, how, detail, campaigns, acc_detail), [])})
    req = [i for i in items if not i["optional"]]
    done = sum(1 for i in items if i["done"])
    return {"present": bool(items), "items": items, "done": done, "total": len(items),
            "required_done": sum(1 for i in req if i["done"]), "required_total": len(req),
            "complete": bool(items) and all(i["done"] for i in req),
            "auto_left": sum(1 for i in req if not i["done"] and not i["manual"]),
            "manual_left": sum(1 for i in req if not i["done"] and i["manual"])}


EMPTY_LAUNCH = {"present": False, "items": [], "done": 0, "total": 0, "required_done": 0, "required_total": 0,
                "complete": False, "auto_left": 0, "manual_left": 0}


# ---- money picture (estimates, never promises)

def _upload_money_row(u: dict, c: dict, now_dt: dt.datetime) -> dict:
    views = int(u["views"] or 0)
    pot_cfg = dict(c, min_payout=0, min_views=0)
    pot = round(cmp.payout(pot_cfg, views)[1], 2) if c.get("cpm") else 0.0
    net = round(float(u.get("net") or 0), 2)
    need = campaign_payout(c, [])["views_to_min"] if c else 0
    sub = _local_iso(u.get("submitted_at"))
    return {"key": u["url"], "clip_id": u["clip_id"], "title": u["title"], "campaign": u["campaign"] or "",
            "platform": u["platform"], "account": u["account"], "created": _local_iso(u["created"]),
            "submitted_at": sub, "views": views, "net": net, "potential": pot, "needs_views": need,
            "over_min": net > 0}


def money_stage(row: dict, now_dt: dt.datetime, submitted_at=None) -> str:
    """at_risk (under the minimum) | waiting (over it, link not pasted) | earning (days 0-7 after pasting) |
    hold (days 7-10) | due (10+ days: should have been paid)."""
    if not row["over_min"]:
        return "at_risk"
    s = _parse(submitted_at if submitted_at is not None else row["submitted_at"])
    if not s:
        return "waiting"
    age = (now_dt - s).total_seconds() / 86400
    return "earning" if age < EARN_DAYS else "hold" if age < PAYOUT_LAG_DAYS else "due"


def money_summary(rows: list, now_dt: dt.datetime, ticks: dict | None = None) -> dict:
    """Estimated pending / approved / at-risk and the payout calendar. `ticks` {url: iso} = links marked pasted on a
    device (the page passes them; the build uses the database's submitted_at only)."""
    ticks = ticks or {}
    buckets = {k: 0.0 for k in ("waiting", "earning", "hold", "due", "at_risk")}
    counts = {k: 0 for k in buckets}
    batches: dict[str, dict] = {}
    for r in rows:
        sub = r["submitted_at"] or ticks.get(r["key"])
        st = money_stage(r, now_dt, sub)
        if st == "at_risk":
            buckets[st] += r["potential"]
        else:
            buckets[st] += r["net"]
        counts[st] += 1
        if st in ("earning", "hold", "due"):
            day = (_parse(sub) + dt.timedelta(days=PAYOUT_LAG_DAYS)).date().isoformat()
            b = batches.setdefault(day, {"date": day, "amount": 0.0, "posts": 0, "campaigns": set(), "stage": st})
            b["amount"] = round(b["amount"] + r["net"], 2)
            b["posts"] += 1
            b["campaigns"].add(r["campaign"])
    out_b = [dict(b, campaigns=sorted(b["campaigns"])) for b in sorted(batches.values(), key=lambda b: b["date"])]
    for b in out_b:
        b["stage"] = "due" if b["date"] <= now_dt.date().isoformat() else "coming"
    r2 = {k: round(v, 2) for k, v in buckets.items()}
    return {"pending": round(r2["waiting"] + r2["earning"], 2), "approved": round(r2["hold"] + r2["due"], 2),
            "at_risk": r2["at_risk"], "buckets": r2, "counts": counts, "batches": out_b}


def money_block(uploads: list, camps: dict, now_dt: dt.datetime) -> dict:
    rows = []
    for u in uploads:
        if not u.get("url") or u.get("state") in ("failed", "draft"):
            continue
        rows.append(_upload_money_row(u, camps.get(u["campaign"]) or {}, now_dt))
        if len(rows) >= MONEY_ROWS:
            break
    s = money_summary(rows, now_dt)
    return {"rows": rows, "estimates": {"pending": s["pending"], "approved": s["approved"], "at_risk": s["at_risk"]},
            "buckets": s["buckets"], "counts": s["counts"], "batches": s["batches"],
            "rules": {"earn_days": EARN_DAYS, "hold_days": HOLD_DAYS, "lag_days": PAYOUT_LAG_DAYS,
                      "text": (f"Views count for {EARN_DAYS} days after you paste the link, then there is a {HOLD_DAYS}-day hold, "
                               f"so a post usually pays about {PAYOUT_LAG_DAYS} days after you submit it. These are estimates, "
                               "not promises: a campaign can reject a post or run out of budget.")}}


EMPTY_MONEY = {"rows": [], "estimates": {"pending": 0.0, "approved": 0.0, "at_risk": 0.0},
               "buckets": {"waiting": 0.0, "earning": 0.0, "hold": 0.0, "due": 0.0, "at_risk": 0.0},
               "counts": {"waiting": 0, "earning": 0, "hold": 0, "due": 0, "at_risk": 0}, "batches": [],
               "rules": {"earn_days": EARN_DAYS, "hold_days": HOLD_DAYS, "lag_days": PAYOUT_LAG_DAYS, "text": ""}}


# ---- insights, A/B and the weekly report

HOUR_BLOCKS = [("night", "Late night", 22, 5), ("early", "Early morning", 5, 9), ("morning", "Morning", 9, 12),
               ("afternoon", "Afternoon", 12, 17), ("evening", "Evening", 17, 22)]


def _hour_block(h: int) -> str:
    for k, _l, a, b in HOUR_BLOCKS:
        if (a <= h < b) if a < b else (h >= a or h < b):
            return k
    return "night"


def _avg(vals: list) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _fmtk(v) -> str:
    v = float(v or 0)
    return f"{v / 1e6:.1f}M" if v >= 1e6 else f"{v / 1e3:.1f}K".replace(".0K", "K") if v >= 1e4 else f"{v:,.0f}"


def _compare(title: str, a_label: str, b_label: str, a: list, b: list, why: str) -> dict:
    """A vs B on average views a post. A winner only when both sides have 3+ posts and one is 15% better."""
    av, bv = _avg(a), _avg(b)
    n = len(a) + len(b)
    winner, lift = None, None
    if len(a) >= 3 and len(b) >= 3 and min(av, bv) > 0:
        lift = round(max(av, bv) / min(av, bv) - 1, 3)
        winner = "tie" if lift < 0.15 else ("a" if av > bv else "b")
    conf = confidence(min(len(a), len(b)) * 2 if winner is None else n)
    if winner in ("a", "b"):
        w, l = (a_label, b_label) if winner == "a" else (b_label, a_label)
        sentence = f"{w} averages {_fmtk(max(av, bv))} views a post against {_fmtk(min(av, bv))} for {l}: {lift * 100:.0f}% more."
    elif winner == "tie":
        sentence = f"{a_label} and {b_label} are about the same ({_fmtk(av)} vs {_fmtk(bv)} views a post)."
    else:
        sentence = f"Not enough posts on both sides yet ({len(a)} {a_label.lower()}, {len(b)} {b_label.lower()})."
    return {"id": re.sub(r"\W+", "-", title.lower()).strip("-"), "title": title, "why": why,
            "a": {"label": a_label, "posts": len(a), "avg_views": round(av)},
            "b": {"label": b_label, "posts": len(b), "avg_views": round(bv)},
            "winner": winner, "lift": lift, "sentence": sentence, "confidence": conf}


def insights_block(ws, uploads: list, now_dt: dt.datetime, acc_detail: list, campaigns: list) -> dict:
    live = [u for u in uploads if u.get("state") != "failed" and u.get("url")]
    # let a post settle for a day before it judges anything
    seasoned = [u for u in live if u["_t"] and u["_t"] <= now_dt - dt.timedelta(hours=20)] or live
    notes = [str(x)[:240] for x in _list_setting(ws, "insights") if x][:12]
    overall = _avg([int(u["views"] or 0) for u in seasoned])
    cards = []

    def add(kind, title, sentence, n, detail=""):
        cards.append({"id": f"{kind}-{len(cards)}", "kind": kind, "title": title, "sentence": sentence, "detail": detail,
                      "n": n, "confidence": confidence(n)})
    if seasoned:
        by_block: dict[str, list] = {}
        for u in seasoned:
            if u["_t"]:
                by_block.setdefault(_hour_block(u["_t"].hour), []).append(int(u["views"] or 0))
        ranked = sorted(((_avg(v), k, len(v)) for k, v in by_block.items() if len(v) >= 2), reverse=True)
        if len(ranked) >= 2:
            av, k, n = ranked[0]
            lab, a, b = next((l, a, b) for kk, l, a, b in HOUR_BLOCKS if kk == k)
            add("time", "Best time to post", f"{lab} posts ({a:02d}:00–{b:02d}:00) average {_fmtk(av)} views, "
                f"{av / overall:.1f}x your overall {_fmtk(overall)}." if overall else f"{lab} posts do best.", n,
                "Hours use the clock of the machine that posts.")
        by_day: dict[int, list] = {}
        for u in seasoned:
            if u["_t"]:
                by_day.setdefault(u["_t"].weekday(), []).append(int(u["views"] or 0))
        dr = sorted(((_avg(v), d, len(v)) for d, v in by_day.items() if len(v) >= 2), reverse=True)
        if len(dr) >= 2:
            names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            add("weekday", "Best day", f"{names[dr[0][1]]} posts average {_fmtk(dr[0][0])} views; {names[dr[-1][1]]} is the quietest "
                f"at {_fmtk(dr[-1][0])}.", dr[0][2])
        lb = []
        for label, lo, hi in LENGTH_BUCKETS:
            vs = [int(u["views"] or 0) for u in seasoned if lo <= max(0.0, (u["c_end"] or 0) - (u["c_start"] or 0)) < hi]
            if len(vs) >= 2:
                lb.append((_avg(vs), label, len(vs)))
        lb.sort(reverse=True)
        if len(lb) >= 2:
            add("length", "Best length", f"{lb[0][1]} clips do best at {_fmtk(lb[0][0])} views a post; {lb[-1][1]} gets {_fmtk(lb[-1][0])}.", lb[0][2])
        fs = format_split(seasoned)
        if fs[0]["posts"] and fs[1]["posts"]:
            hi_, lo_ = (fs[1], fs[0]) if fs[1]["avg_views"] > fs[0]["avg_views"] else (fs[0], fs[1])
            add("format", "Video or slideshow", f"{hi_['kind'].capitalize()}s average {_fmtk(hi_['avg_views'])} views, "
                f"{lo_['kind']}s {_fmtk(lo_['avg_views'])}.", min(fs[0]["posts"], fs[1]["posts"]) * 2)
        accs: dict[str, list] = {}
        for u in seasoned:
            accs.setdefault(f"@{u['account']}", []).append(int(u["views"] or 0))
        ar = sorted(((_avg(v), k, len(v)) for k, v in accs.items() if len(v) >= 3), reverse=True)
        if len(ar) >= 2:
            add("account", "Best account", f"{ar[0][1]} averages {_fmtk(ar[0][0])} views a post; {ar[-1][1]} averages {_fmtk(ar[-1][0])}.", ar[0][2])
        cm: dict[str, list] = {}
        for u in seasoned:
            cm.setdefault(u["campaign"] or "Other", []).append(int(u["views"] or 0))
        cr = sorted(((_avg(v), k, len(v)) for k, v in cm.items() if len(v) >= 3), reverse=True)
        if len(cr) >= 2:
            add("campaign", "Best campaign", f"{cr[0][1]} gets the most views a post ({_fmtk(cr[0][0])}); {cr[-1][1]} the fewest ({_fmtk(cr[-1][0])}).", cr[0][2])
        words: dict[str, list] = {}
        for u in seasoned:
            for w in set(re.findall(r"[a-z][a-z']{2,}", first_sentence(u.get("c_text") or "").lower())):
                w = w.strip("'")
                if w not in STOPWORDS and len(w) >= 3:
                    words.setdefault(w, []).append(int(u["views"] or 0))
        wr = sorted(((_avg(v), w, len(v)) for w, v in words.items() if len(v) >= 3), reverse=True)
        if wr:
            add("hook", "Hook word", f"Hooks with “{wr[0][1]}” average {_fmtk(wr[0][0])} views a post ({wr[0][2]} posts).", wr[0][2])
    short = [int(u["views"] or 0) for u in seasoned if (u["c_end"] or 0) - (u["c_start"] or 0) < 30]
    long_ = [int(u["views"] or 0) for u in seasoned if (u["c_end"] or 0) - (u["c_start"] or 0) >= 30]
    day = [int(u["views"] or 0) for u in seasoned if u["_t"] and 6 <= u["_t"].hour < 18]
    eve = [int(u["views"] or 0) for u in seasoned if u["_t"] and not 6 <= u["_t"].hour < 18]
    vid = [int(u["views"] or 0) for u in seasoned if u.get("c_kind") != "slideshow"]
    sli = [int(u["views"] or 0) for u in seasoned if u.get("c_kind") == "slideshow"]
    ab = [_compare("Video vs slideshow", "Videos", "Slideshows", vid, sli, "Which format earns more views a post?"),
          _compare("Short vs long", "Under 30 s", "30 s or longer", short, long_, "Do shorter clips travel further?"),
          _compare("Daytime vs evening", "06:00–18:00", "18:00–06:00", day, eve, "Does posting time matter?")]
    # the weekly report: last 7 days against the 7 before
    w1, w0 = now_dt - dt.timedelta(days=7), now_dt - dt.timedelta(days=14)
    this = [u for u in live if u["_t"] and u["_t"] >= w1]
    prev = [u for u in live if u["_t"] and w0 <= u["_t"] < w1]
    best = max(this, key=lambda u: int(u["views"] or 0), default=None)
    tries = []
    for c in ab:
        if c["winner"] in ("a", "b"):
            tries.append(f"Do more of: {(c['a'] if c['winner'] == 'a' else c['b'])['label'].lower()} ({c['title'].lower()}).")
    low = [a for a in acc_detail if (a.get("health") or {}).get("state") == "limited"]
    if low:
        tries.append(f"Give @{low[0]['name']} a rest or check it in the TikTok app: it may be limited.")
    if not tries:
        tries.append("Keep posting: a few more days of posts makes the insights trustworthy.")
    weekly = {"label": f"{w1.strftime('%b')} {w1.day} – {now_dt.strftime('%b')} {now_dt.day}", "from": w1.date().isoformat(),
              "to": now_dt.date().isoformat(), "posts": len(this), "posts_prev": len(prev),
              "views": sum(int(u["views"] or 0) for u in this), "views_prev": sum(int(u["views"] or 0) for u in prev),
              "est_net": round(float(sum(u["net"] for u in this)), 2), "est_net_prev": round(float(sum(u["net"] for u in prev)), 2),
              "best": ({"clip_id": best["clip_id"], "title": best["title"], "views": int(best["views"] or 0), "url": best["url"],
                        "platform": best["platform"], "account": best["account"]} if best else None),
              "try": tries[:3], "confidence": confidence(len(this))}
    return {"notes": notes, "cards": cards, "ab": ab, "weekly": weekly, "overall_avg_views": round(overall),
            "sample": len(seasoned), "confidence": confidence(len(seasoned))}


EMPTY_INSIGHTS = {"notes": [], "cards": [], "ab": [], "overall_avg_views": 0, "sample": 0, "confidence": confidence(0),
                  "weekly": {"label": "", "from": None, "to": None, "posts": 0, "posts_prev": 0, "views": 0, "views_prev": 0,
                             "est_net": 0.0, "est_net_prev": 0.0, "best": None, "try": [], "confidence": confidence(0)}}


# ---- system: state size, keys, error explainer, schedule

def _dir_bytes(root: Path, limit_files: int = 40000) -> tuple[int, bool]:
    total, n, trunc = 0, 0, False
    stack = [root]
    while stack:
        d = stack.pop()
        try:
            with os.scandir(d) as it:
                for e in it:
                    if e.name == ".git":
                        continue
                    try:
                        if e.is_dir(follow_symlinks=False):
                            stack.append(e.path)
                        elif e.is_file(follow_symlinks=False):
                            total += e.stat(follow_symlinks=False).st_size
                            n += 1
                            if n >= limit_files:
                                return total, True
                    except OSError:
                        continue
        except OSError:
            continue
    return total, trunc


def system_block(ws, launch: dict, runs: dict, uploads: list) -> dict:
    root = ws.home.parent if ws.home.name == "ws" else ws.home
    size, trunc = _dir_bytes(root)
    try:
        db = (ws.home / "jobs.db").stat().st_size
    except OSError:
        db = None
    by = {i["id"]: i for i in launch.get("items", [])}
    last_key = runs["summary"].get("last_key")

    def key(iid, label, how):
        i = by.get(iid)
        okv = i["done"] if i else None
        if iid == "zernio_key" and last_key is not None:
            okv = bool(last_key) if okv is None else (okv and bool(last_key))
        return {"id": iid, "label": label, "ok": okv, "detail": (i or {}).get("detail", ""), "how": (i or {}).get("how") or how}
    keys = [key("zernio_key", "Zernio API key", "Save the key as the GitHub secret ZERNIO_API_KEY."),
            key("zernio_accounts", "Zernio accounts connected", "Connect the TikTok accounts in Zernio."),
            key("drive_footage", "Footage folder", "Share the Drive folder with the autopilot."),
            key("state_branch", "State is being saved", "The run saves its memory to the clipper-cloud branch."),
            key("ntfy_topic", "Phone alerts (optional)", "Optional: add an ntfy topic to get alerts on your phone.")]
    return {"state_bytes": size, "state_truncated": trunc, "db_bytes": db, "limit_bytes": STATE_LIMIT_BYTES,
            "state_frac": round(min(1.0, size / STATE_LIMIT_BYTES), 4), "keys": keys,
            "restart": {"url": ACTIONS_URL,
                        "steps": ["Open the GitHub Actions page with the button below.",
                                  "Press Run workflow (top right of the run list), keep the branch, press the green Run workflow.",
                                  "Wait about 5 minutes and pull down to refresh here. The status light turns green."]}}


def errors_block(ws, last: dict, runs: dict, jobs: list, events: list) -> list:
    out, seen = [], set()

    def add(source, text, ts=None, level="bad"):
        t = _str(text, 300)
        k = re.sub(r"\d+", "#", t.lower())[:90]
        if not t or k in seen:
            return
        seen.add(k)
        out.append(dict({"source": source, "text": t, "ts": _local_iso(ts) if ts else None, "level": level}, **explain_error(t)))
    for e in (last.get("upload_errors") or []) if isinstance(last.get("upload_errors"), list) else []:
        add("autopilot", e, last.get("finished"))
    for r in runs.get("history", [])[:6]:
        for n in r["notes"]:
            if re.search(r"error|fail|refus|denied|invalid|missing|not connected|expired|timeout|timed out", n, re.I):
                add("run", n, r["ts"])
    for e in events:
        if e.get("level") in ("error", "warn"):
            add("event", e.get("message"), e.get("ts"), "bad" if e.get("level") == "error" else "warn")
    for j in jobs:
        if j.get("last_error"):
            add("job", f"{j.get('title') or j.get('input') or 'job'}: {j['last_error']}", j.get("updated"),
                "bad" if j.get("status") in ("failed", "blocked") else "warn")
    out.sort(key=lambda r: r["ts"] or "", reverse=True)
    return out[:ERRORS_LIMIT]


def schedule_block(a_next: str | None, every: int, enabled: bool, queue: list, now_dt: dt.datetime) -> dict:
    """The next 24 hours: when each run is due and what the queue hands it (estimate)."""
    nxt = _parse(a_next)
    runs = []
    if enabled and nxt:
        t = nxt
        queue_now = [q for q in queue if q.get("slot") != "tomorrow"]
        later = [q for q in queue if q.get("slot") == "tomorrow"]
        midnight = dt.datetime.combine(now_dt.date() + dt.timedelta(days=1), dt.time())
        given_later = False
        while t <= now_dt + dt.timedelta(hours=24) and len(runs) < 12:
            items, note = [], "keeps the queue moving"
            if not runs:
                items, note = queue_now, ("due now" if t <= now_dt else "next run")
            elif not given_later and t >= midnight and later:
                items, given_later, note = later, True, "after midnight the daily caps reset"
            runs.append({"at": t.isoformat(timespec="seconds"), "in_hours": round((t - now_dt).total_seconds() / 3600, 1),
                         "note": note,
                         "items": [{"clip_id": q["clip_id"], "title": q["title"], "account": q["account"],
                                    "platform": q["platform"], "kind": q["kind"], "thumb": q.get("thumb")} for q in items][:8],
                         "expected": len(items) if items else None})
            t = t + dt.timedelta(hours=every)
    return {"runs": runs, "horizon_hours": 24, "every_hours": every, "queue_total": len(queue),
            "note": "Estimate: runs are about every %d hours and each hands the queue to the accounts with room." % every}


EMPTY_SCHEDULE = {"runs": [], "horizon_hours": 24, "every_hours": 4, "queue_total": 0, "note": ""}


def held_plain(reason) -> str:
    """The autopilot's held-back reason in plain words."""
    r = str(reason or "").lower()
    if not r:
        return ""
    if "below" in r and "minimum" in r or re.search(r"score \d+", r):
        return "Its quality score was under the bar the autopilot needs, so it waits for you instead of posting by itself."
    if "context" in r:
        return "It starts mid-thought (like 'so…'), which may confuse viewers who did not see the earlier part."
    if "claim" in r or "earnings" in r:
        return "It makes an earnings or results claim, which the campaign rules treat carefully."
    if "length" in r or "short" in r or "long" in r:
        return "Its length is outside what the campaign allows."
    if "logo" in r or "caption" in r or "tag" in r:
        return "It is missing something the campaign requires (logo or tags)."
    return "The autopilot was not sure about this clip, so it left the decision to you."


def build_data(ws) -> dict:
    import pipeline as pl  # late import: pipeline imports this module
    camps = _load_campaigns(ws)
    now_dt = dt.datetime.now()
    today = now_dt.date()

    ccols = {r[1] for r in ws.q("PRAGMA table_info(clips)")}
    kind_sql = "COALESCE(NULLIF(c.kind, ''), 'video')" if "kind" in ccols else "'video'"
    uploads = _rows(ws, "SELECT u.*, c.title, c.campaign, c.score, c.start AS c_start, c.end_ AS c_end, c.text AS c_text, "
                        f"{kind_sql} AS c_kind FROM uploads u JOIN clips c ON c.id=u.clip_id ORDER BY u.id DESC")
    for u in uploads:
        c = camps.get(u["campaign"]) or {}
        u["net"] = round(cmp.payout(c, int(u["views"] or 0))[1], 2) if c.get("cpm") else 0.0
        u["_t"] = _parse(u["created"])
        u["account"] = str(u.get("account") or "default")
        u["c_kind"] = _kind(u.get("c_kind"))
    by_clip: dict[int, list] = {}
    for u in uploads:
        by_clip.setdefault(u["clip_id"], []).append(
            {k: u[k] for k in ("platform", "url", "views", "likes", "state", "net", "account", "created", "submitted_at")})

    src_titles = {r["id"]: r["title"] for r in ws.q("SELECT id, title FROM sources")}
    tdir = thumb_dir(ws)
    clips = []
    texts = {}
    for r in ws.q("SELECT * FROM clips ORDER BY id DESC LIMIT 400"):
        ups = by_clip.get(r["id"], [])
        keys = r.keys()
        texts[r["id"]] = r["text"] or ""
        clips.append({"id": r["id"], "title": r["title"], "campaign": r["campaign"], "score": round(r["score"] or 0, 1),
                      "status": r["status"], "dur": round((r["end_"] or 0) - (r["start"] or 0)), "created": r["created"],
                      "held": r["held_reason"], "uploads": ups, "views": sum(int(u["views"] or 0) for u in ups),
                      "net": round(float(sum(u["net"] for u in ups)), 2),
                      "flags": [f["msg"] for f in _jl(r["flags"], []) if isinstance(f, dict) and f.get("level") == "warn"][:3],
                      "thumb": f"thumbs/{r['id']}.jpg" if (tdir / f"{r['id']}.jpg").is_file() else None,
                      "hook": first_sentence(r["text"] or ""),
                      "caption": r["caption"] or "",
                      "reasons": [str(x) for x in _jl(r["reasons"] if "reasons" in keys else None, [])],
                      "source_title": src_titles.get(r["source_id"]) or "",
                      "kind": _kind(r["kind"] if "kind" in keys else None),
                      "start": round(float(r["start"] or 0), 1), "end": round(float(r["end_"] or 0), 1)})

    campaigns = []
    autopilot_files = PathSet(ws.setting("autopilot.campaigns", []))
    for name, c in camps.items():
        perm = c.get("permission") or {}
        try:
            problems = pl.campaign_problems(c) if c.get("_path") else []
        except Exception:
            problems = []
        age = None
        try:
            age = (today - dt.date.fromisoformat(perm.get("verified_on", ""))).days
        except Exception:
            pass
        cu = [u for u in uploads if u["campaign"] == name]
        campaigns.append({"name": name, "cpm": float(c.get("cpm") or 0), "fee": float(c.get("fee_pct") or 0),
                          "cap": c.get("max_payout_per_clip") or 0, "min_views": c.get("min_views") or 0,
                          "platforms": c.get("platforms") or [], "url": perm.get("campaign_url", ""),
                          "verified_on": perm.get("verified_on", ""), "age": age, "problems": problems[:6],
                          "auto": c.get("_path") in autopilot_files, "posts": len(cu),
                          "views": sum(int(u["views"] or 0) for u in cu), "net": round(float(sum(u["net"] for u in cu)), 2),
                          "clips": sum(1 for x in clips if x["campaign"] == name),
                          "automation_allowed": cmp.automation_allowed(c),
                          "notes": str(c.get("notes") or "")[:300],
                          "posts_7d": sum(1 for u in cu if u["_t"] and u["_t"] >= now_dt - dt.timedelta(days=7)),
                          "posts_per_week": _num(c.get("posts_per_week"), 0) or 0,
                          "checks": _safe(lambda: campaign_checks(c, cu, clips, now_dt), []),
                          "payout": _safe(lambda: campaign_payout(c, cu), dict(EMPTY_PAYOUT)),
                          "account_match": str(c.get("account_match") or "").strip(),
                          "accounts_spec": {str(p).lower(): _names(v) for p, v in (c.get("accounts") or {}).items()}
                          if isinstance(c.get("accounts"), dict) else {},
                          "posting_accounts": [],
                          "live": _safe(lambda: campaign_live(ws, c), dict(EMPTY_LIVE))})
    campaigns.sort(key=lambda x: (not x["auto"], bool(x["problems"]), x["name"]))
    for c in campaigns:
        c["lifecycle"] = _safe(lambda c=c: campaign_lifecycle(ws, c), empty_lifecycle(c["name"]))

    leads = []
    for c in campaigns:
        if c["auto"] and not c["problems"]:
            continue
        if c["automation_allowed"] is False:
            status = "rules ban automation"
        elif c["problems"]:
            status = "needs setup"
        else:
            status = "ready: add to autopilot"
        url = c["url"] if re.match(r"https?://", c["url"] or "") else ""
        leads.append({"name": c["name"], "cpm": c["cpm"], "platforms": c["platforms"],
                      "automation_allowed": c["automation_allowed"], "status": status, "url": url,
                      "note": (c["problems"][0] if c["problems"] else c["notes"])[:300]})
    leads.sort(key=lambda x: ({"ready: add to autopilot": 0, "needs setup": 1}.get(x["status"], 2), -x["cpm"]))

    # ---- earnings over time (by post date)
    def day_of(u):
        return (u["created"] or "")[:10]
    daily = _bucket(uploads, day_of, [(today - dt.timedelta(days=i)).isoformat() for i in range(29, -1, -1)])
    mondays = [today - dt.timedelta(days=today.weekday()) - dt.timedelta(weeks=i) for i in range(11, -1, -1)]

    def week_of(u):
        return u["_t"].strftime("%G-W%V") if u["_t"] else None
    weekly = _bucket(uploads, week_of, [d.strftime("%G-W%V") for d in mondays])
    months = []
    y, m = today.year, today.month
    for _ in range(6):
        months.insert(0, f"{y:04d}-{m:02d}")
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)
    monthly = _bucket(uploads, lambda u: (u["created"] or "")[:7], months)
    by_campaign = []
    for name in dict.fromkeys(u["campaign"] for u in uploads):
        cu = [u for u in uploads if u["campaign"] == name]
        by_campaign.append({"name": name, "posts": len(cu), "views": sum(int(u["views"] or 0) for u in cu),
                            "net": round(float(sum(u["net"] for u in cu)), 2)})
    by_campaign.sort(key=lambda x: (-x["net"], -x["views"]))
    by_platform: dict[str, dict] = {}
    for u in uploads:
        p = by_platform.setdefault(u["platform"], {"posts": 0, "views": 0, "net": 0.0, "likes": 0})
        p["posts"] += 1
        p["views"] += int(u["views"] or 0)
        p["likes"] += int(u["likes"] or 0)
        p["net"] = round(p["net"] + u["net"], 2)

    # ---- views history from earnings.json snapshots
    try:
        edb = json.loads((ws.home / "earnings.json").read_text(encoding="utf-8"))
        eposts = [_post_points(p) for p in edb.get("posts") or [] if isinstance(p, dict)]
    except Exception:
        eposts = []
    eposts_by_url = {}
    try:
        for p in edb.get("posts") or []:
            if isinstance(p, dict) and p.get("url"):
                eposts_by_url[p["url"]] = _post_points(p)
    except Exception:
        pass
    for c in clips:   # library fields: accounts posted to, a views sparkline from the tracker's history, plain held reason
        c["accounts"] = sorted({u["account"] for u in c["uploads"]})
        c["held_plain"] = held_plain(c["held"]) if c["held"] else ""
        c["angle"] = c["title"] if c["kind"] == "slideshow" else ""
        c["spark"] = []
        c["queue"] = None
        best_u = max((u for u in c["uploads"] if u.get("url") and u["url"] in eposts_by_url), key=lambda u: u["views"] or 0, default=None)
        if best_u and c["id"] >= (clips[min(len(clips), THUMB_LIMIT) - 1]["id"] if clips else 0):
            c["spark"] = [int(v) for _t, v in eposts_by_url[best_u["url"]][1]][-14:]
    views_history = []
    for i in range(29, -1, -1):
        d = today - dt.timedelta(days=i)
        end = now_dt if i == 0 else dt.datetime.combine(d, dt.time(23, 59, 59))
        views_history.append({"date": d.isoformat(), "views": sum(_views_at(po, pts, end) for po, pts in eposts if pts)})

    # ---- analytics
    heat_sum = [[0] * 24 for _ in range(7)]
    heat_n = [[0] * 24 for _ in range(7)]
    for u in uploads:
        if u["_t"]:
            heat_sum[u["_t"].weekday()][u["_t"].hour] += int(u["views"] or 0)
            heat_n[u["_t"].weekday()][u["_t"].hour] += 1
    hour_heatmap = [[round(heat_sum[d][h] / heat_n[d][h]) if heat_n[d][h] else 0 for h in range(24)] for d in range(7)]
    length_buckets = []
    for label, lo, hi in LENGTH_BUCKETS:
        bu = [u for u in uploads if lo <= max(0.0, (u["c_end"] or 0) - (u["c_start"] or 0)) < hi]
        length_buckets.append({"label": label, "posts": len(bu),
                               "avg_views": round(sum(int(u["views"] or 0) for u in bu) / len(bu)) if bu else 0})
    score_vs_views = [{"id": u["clip_id"], "score": round(float(u["score"] or 0), 1), "views": int(u["views"] or 0),
                       "platform": u["platform"]} for u in uploads[:400]]
    posted_clips = [c for c in clips if c["status"] == "posted"]
    words: dict[str, list] = {}
    for c in posted_clips:
        for w in set(re.findall(r"[a-z][a-z']{2,}", c["hook"].lower())):
            w = w.strip("'")
            if len(w) >= 3 and w not in STOPWORDS:
                words.setdefault(w, []).append(c["views"])
    hook_words = sorted(({"word": w, "posts": len(v), "avg_views": round(sum(v) / len(v))} for w, v in words.items()),
                        key=lambda x: (-x["posts"], -x["avg_views"], x["word"]))[:12]
    plat_split = sorted(({"platform": k, "views": v["views"], "posts": v["posts"]} for k, v in by_platform.items()),
                        key=lambda x: -x["views"])
    cal = {(today - dt.timedelta(days=i)).isoformat(): {"posts": 0, "views": 0} for i in range(83, -1, -1)}
    post_days = set()
    for u in uploads:
        d = day_of(u)
        if d:
            post_days.add(d)
        if d in cal:
            cal[d]["posts"] += 1
            cal[d]["views"] += int(u["views"] or 0)
    funnel = {
        "imported": ws.q("SELECT COUNT(*) n FROM sources")[0]["n"],
        "clips": ws.q("SELECT COUNT(*) n FROM clips")[0]["n"],
        "approved": ws.q("SELECT COUNT(*) n FROM clips WHERE status IN ('approved','posted')")[0]["n"],
        "posted": ws.q("SELECT COUNT(*) n FROM clips WHERE status='posted'")[0]["n"],
        "submitted": ws.q("SELECT COUNT(*) n FROM clips c WHERE c.status='posted' AND (c.submitted_at IS NOT NULL OR "
                          "EXISTS(SELECT 1 FROM uploads u WHERE u.clip_id=c.id AND u.submitted_at IS NOT NULL))")[0]["n"],
    }

    # ---- autopilot log
    last = {}
    log = ws.home / "logs" / "autopilot.jsonl"
    if log.exists():
        try:
            lines = [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]
            last = json.loads(lines[-1]) if lines else {}
        except Exception:
            last = {}
    try:
        every = int(ws.setting("autopilot.every_hours", 6) or 6)
    except (TypeError, ValueError):
        every = 6
    fin = _parse(last.get("finished"))
    next_run = (fin + dt.timedelta(hours=every)).isoformat(timespec="seconds") if fin else None

    accounts = []
    for mod, label in (("zernio", "Zernio (TikTok/Instagram, free)"), ("youtube", "YouTube"), ("tiktok", "TikTok drafts"),
                       ("uploadpost", "Upload-Post")):
        try:
            accounts.append({"name": label, "connected": bool(__import__(mod).has_token())})
        except Exception:
            accounts.append({"name": label, "connected": False})

    submit_all = submit_list(uploads, camps, limit=10 ** 9)
    submit = submit_all[:SUBMIT_LIMIT]
    drafts = [{"clip_id": u["clip_id"], "caption": u["caption"] or "", "title": u["title"]}
              for u in _rows(ws, "SELECT u.*, c.title FROM uploads u JOIN clips c ON c.id=u.clip_id "
                                 "WHERE u.platform='tiktok' AND u.state='draft' AND u.url IS NULL")]
    held = [{"id": c["id"], "title": c["title"], "reason": c["held"]} for c in clips if c["status"] == "pending_review"]

    # ---- stats
    views = sum(int(u["views"] or 0) for u in uploads)
    likes = sum(int(u["likes"] or 0) for u in uploads)
    net = round(float(sum(u["net"] for u in uploads)), 2)

    def since(days):
        t0 = now_dt - dt.timedelta(days=days)
        return [u for u in uploads if u["_t"] and u["_t"] >= t0]
    queue = {k: 0 for k in ("queued", "running", "retry_wait", "failed", "blocked", "done")}
    for r in ws.q("SELECT status, COUNT(*) n FROM sources GROUP BY status"):
        k = "running" if r["status"] in RUNNING else r["status"]
        if k in queue:
            queue[k] += r["n"]
    goal = ws.setting("dashboard.goal_month_usd", None)
    goal = float(goal) if isinstance(goal, (int, float)) and not isinstance(goal, bool) and goal > 0 else None

    pol = pl.autopilot_policy(ws)
    cap_setting = max_per_day(ws)
    recent_events = _rows(ws, "SELECT ts, level, message FROM events ORDER BY id DESC LIMIT 300")
    acc_detail = _safe(lambda: accounts_detail(ws, uploads, camps, autopilot_files, eposts_by_url, recent_events, now_dt,
                                               cap_setting, every), [])
    paused = {c["name"] for c in campaigns if c["live"]["state"] == "paused"}
    queue_next = _safe(lambda: up_next(ws, clips, uploads, camps, acc_detail,
                                       [str(x).lower() for x in pol.get("platforms") or []], autopilot_files,
                                       paused=paused), [])
    acc_detail = _safe(lambda: attach_managers(ws, acc_detail, now_dt, cap_setting), acc_detail)
    for c in campaigns:
        c["posting_accounts"] = sorted({f"{a['platform']}/{a['name']}" for a in acc_detail
                                        if c["name"] in (a.get("campaigns") or [])})
        if not c["lifecycle"]["known"] and not c["lifecycle"]["accounts"]:
            c["lifecycle"]["accounts"] = list(c["posting_accounts"])
    pos = {}
    for i, q in enumerate(queue_next):
        pos.setdefault(q["clip_id"], {"pos": i + 1, "slot": q["slot"], "account": q["account"], "platform": q["platform"]})
    for c in clips:
        c["queue"] = pos.get(c["id"])
    agency = _safe(lambda: agency_summary(campaigns, acc_detail), json.loads(json.dumps(EMPTY_AGENCY)))
    joined = {str(c["url"]).rstrip("/") for c in campaigns if c.get("url")}
    discovered = _safe(lambda: leads_discovered(ws, joined), [])
    g = pl.LedgerGuard(ws)
    enabled = bool(ws.setting("autopilot.enabled", False))
    supply = _safe(lambda: supply_meter(ws, campaigns, uploads, acc_detail, now_dt), json.loads(json.dumps(EMPTY_SUPPLY)))
    try:
        in_hours = (not pol.get("post_hours")) or bool(pl.in_post_hours(pol["post_hours"], pol["post_tz"]))
    except Exception:
        in_hours = True
    jobs = _rows(ws, "SELECT id, status, attempts, title, input, last_error, updated FROM sources ORDER BY id DESC LIMIT 60")
    lifecycle = _safe(lambda: lifecycle_block(ws, campaigns, now_dt), json.loads(json.dumps(EMPTY_LIFECYCLE)))
    bench = _safe(lambda: bench_block(ws, campaigns), {"present": False, "healthy": 0, "min": None, "need_more": False,
                                                       "reason": "", "join_next": []})
    runs = _safe(lambda: runs_block(ws, uploads, now_dt), json.loads(json.dumps(EMPTY_RUNS)))
    launch = _safe(lambda: launch_block(ws, campaigns, acc_detail), json.loads(json.dumps(EMPTY_LAUNCH)))
    ext = {"lifecycle": lifecycle, "bench": bench, "runs": runs, "launch": launch}
    status = _safe(lambda: status_light(now_dt, enabled, last, every, accounts, acc_detail, campaigns, supply, uploads,
                                        pol, in_hours, ext), json.loads(json.dumps(EMPTY_STATUS)))
    money = _safe(lambda: money_block(uploads, camps, now_dt), json.loads(json.dumps(EMPTY_MONEY)))
    insights = _safe(lambda: insights_block(ws, uploads, now_dt, acc_detail, campaigns), json.loads(json.dumps(EMPTY_INSIGHTS)))
    system = _safe(lambda: system_block(ws, launch, runs, uploads), {"state_bytes": 0, "state_truncated": False, "db_bytes": None,
                                                                   "limit_bytes": STATE_LIMIT_BYTES, "state_frac": 0.0, "keys": [],
                                                                   "restart": {"url": ACTIONS_URL, "steps": []}})
    errors = _safe(lambda: errors_block(ws, last, runs, jobs, recent_events), [])
    schedule = _safe(lambda: schedule_block(next_run, every, enabled, queue_next, now_dt),
                     dict(EMPTY_SCHEDULE, every_hours=every))
    acc_help = _safe(lambda: account_help(campaigns, acc_detail), {"zernio_url": ZERNIO_URL, "naming": [], "steps": [], "reconnect": []})
    return {
        "version": VERSION,
        "generated": now_dt.isoformat(timespec="seconds"),
        "workspace": str(ws.home),
        "preview": False,
        "sample": (ws.home / ".clipper-demo").exists(),   # a demo.py workspace: the page says "sample data"
        "hide_money": False,
        "autopilot": {"enabled": enabled, "via": pol["via"],
                      "platforms": pol["platforms"], "cap": pol["max_uploads_per_day"], "min_score": pol["min_score"],
                      "privacy": pol["privacy"], "last": {k: (len(v) if isinstance(v, list) else v)
                                                          for k, v in last.items() if k != "notes"},
                      "notes": (last.get("notes") or [])[:8], "errors": (last.get("upload_errors") or [])[:8],
                      "every_hours": every, "next_run": next_run,
                      "max_per_day": cap_setting,
                      "runner": str(last.get("runner") or ws.setting("autopilot.runner", "") or "") or None},
        "accounts_detail": acc_detail,
        "up_next": queue_next,
        "accounts": accounts,
        "stats": {"clips": len(clips), "posted": sum(1 for c in clips if c["status"] == "posted"),
                  "posts": len(uploads), "views": views, "likes": likes, "net": net,
                  "to_submit": len(submit_all), "drafts": len(drafts), "held": len(held),
                  "today_posts": sum(1 for u in uploads if day_of(u) == today.isoformat()),
                  "views_24h": _gained(eposts, now_dt - dt.timedelta(hours=24), now_dt),
                  "views_7d": _gained(eposts, now_dt - dt.timedelta(days=7), now_dt),
                  "net_7d": round(float(sum(u["net"] for u in since(7))), 2),
                  "net_30d": round(float(sum(u["net"] for u in since(30))), 2),
                  "posts_7d": len(since(7)),
                  "avg_views": round(views / len(uploads)) if uploads else 0,
                  "engagement": round(likes / views, 4) if views else 0.0,
                  "effective_cpm": round(net / views * 1000, 2) if views else 0.0,
                  "best_platform": plat_split[0]["platform"] if plat_split and plat_split[0]["views"] else None},
        "todo": {"submit": submit, "drafts": drafts[:20], "held": held[:30]},
        "clips": clips,
        "campaigns": campaigns,
        "earnings": {"by_platform": by_platform,
                     "daily": [{"date": d, **v} for d, v in daily],
                     "weekly": [{"week": w, **v} for w, v in weekly],
                     "monthly": [{"month": mo, **v} for mo, v in monthly],
                     "by_campaign": by_campaign,
                     "top": sorted(({"title": u["title"], "platform": u["platform"], "url": u["url"],
                                     "views": int(u["views"] or 0), "net": u["net"]} for u in uploads if u["url"]),
                                   key=lambda x: -x["views"])[:10]},
        "analytics": {"views_history": views_history, "hour_heatmap": hour_heatmap, "length_buckets": length_buckets,
                      "score_vs_views": score_vs_views, "funnel": funnel, "hook_words": hook_words,
                      "platform_split": plat_split,
                      "format_split": format_split(uploads),
                      "calendar": [{"date": d, **v} for d, v in cal.items()],
                      "streak": streak(post_days, today)},
        "pipeline": {"queue": queue, "sources": ws.q("SELECT COUNT(*) n FROM sources")[0]["n"]},
        "health": health(ws, enabled, accounts),
        "goals": {"month_target": goal},
        "leads": leads,
        "agency": agency,
        "supply": supply,
        "status": status,
        "leads_discovered": discovered,
        "contract": CONTRACT,
        "lifecycle": lifecycle, "bench": bench, "runs": runs, "launch": launch, "money": money, "insights": insights,
        "system": system, "errors_help": errors, "schedule": schedule, "account_help": acc_help,
        "whatsnew": {"version": CONTRACT, "items": CHANGELOG},
        "jobs": jobs,
        "events": _rows(ws, "SELECT ts, level, message FROM events ORDER BY id DESC LIMIT 60"),
        "spend": {"month": round(g.month_spent(), 4), "cap": float(ws.setting("spend.monthly_cap_usd", 0) or 0)},
    }


def streak(days: set, today: dt.date) -> dict:
    """Consecutive days with at least one post. The current streak still counts when today has no post yet."""
    ds = set()
    for d in days:
        try:
            ds.add(dt.date.fromisoformat(d))
        except ValueError:
            pass
    cur, d = 0, today if today in ds else today - dt.timedelta(days=1)
    while d in ds:
        cur += 1
        d -= dt.timedelta(days=1)
    best = run = 0
    prev = None
    for d in sorted(ds):
        run = run + 1 if prev and (d - prev).days == 1 else 1
        best = max(best, run)
        prev = d
    return {"current": cur, "best": best}


def hide_money(data: dict) -> dict:
    """Public copy without dollar figures (for a published page whose owner wants earnings private).
    Campaign and lead CPMs stay: they are the public rates."""
    d = json.loads(json.dumps(data, default=str))
    d["hide_money"] = True
    for k in ("net", "net_7d", "net_30d", "effective_cpm"):
        d["stats"][k] = None
    for c in d["clips"]:
        c["net"] = None
        for u in c["uploads"]:
            u["net"] = None
    for c in d["campaigns"]:
        c["net"] = None
    for a in d.get("accounts_detail") or []:
        a["net"] = None
        a["net_7d"] = None
    e = d["earnings"]
    for v in e["by_platform"].values():
        v["net"] = None
    for key in ("daily", "weekly", "monthly", "by_campaign", "top"):
        for r in e.get(key) or []:
            r["net"] = None
    d["spend"] = {"month": None, "cap": None}
    d["goals"] = {"month_target": None}
    m = d.get("money") or {}
    for r in m.get("rows") or []:
        r["net"] = None
        r["potential"] = None
    for k in ("estimates", "buckets"):
        m[k] = {kk: None for kk in (m.get(k) or {})}
    for b in m.get("batches") or []:
        b["amount"] = None
    w = (d.get("insights") or {}).get("weekly") or {}
    w["est_net"] = None
    w["est_net_prev"] = None
    return d


ASSETS = Path(__file__).resolve().parent / "site_assets"
MANIFEST = {
    "name": "Clip Engine", "short_name": "Clips",
    "description": "Clipping autopilot: clips, posts, views and estimated earnings.",
    "id": "./", "start_url": "./#/submit", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#07080c", "theme_color": "#07080c",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
              {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    "shortcuts": [{"name": n, "url": f"./#/{n.lower()}"} for n in ("Submit", "Today", "Clips", "Insights", "Campaigns", "Payouts")],
}


# The hosted copy's own service worker, scoped to its folder. On a Pages site that also serves another app with a root
# service worker (the NQ dashboard), this one takes over clips/ so the two apps never share or overwrite each other's cache.
SERVICE_WORKER = """// Clip Engine: network first, the last copy when offline. Scope: this folder only.
const CACHE = 'clip-engine-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('clip-engine-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true })));
});
"""


FX_FILE = Path(__file__).resolve().parent.parent / "fx.js"


_ABS_PATH = re.compile(r"(?<![\w:/.\\])(?:/(?:home|tmp|Users|root|var|opt|mnt|private|runner|work)(?=[/\\])|[A-Za-z]:\\)"
                       r"[^\s\"'<>,;|]*")


def _strip_paths(o):
    """Published copy: absolute paths of the machine (runner or PC, with user names) become just the file name."""
    if isinstance(o, str):
        def base(m):
            return re.split(r"[\\/]", m.group(0).rstrip("/\\"))[-1]
        return _ABS_PATH.sub(base, o)
    if isinstance(o, list):
        return [_strip_paths(x) for x in o]
    if isinstance(o, dict):
        return {k: _strip_paths(v) for k, v in o.items()}
    return o


def site_files(data: dict, ws=None) -> dict[str, bytes]:
    """Everything a hosted copy needs (GitHub Pages): page, data.json, manifest, icons and clip thumbnails.
    Thumbnails come from `ws.home/thumbs` (or the workspace named in the data when no ws is given)."""
    home = ws.home if ws is not None else (Path(data["workspace"]) if data.get("workspace") else None)
    data = _strip_paths(data)
    data["workspace"] = ""
    files = {"index.html": render_html(data).encode("utf-8"),
             "data.json": json.dumps(data, default=str).encode("utf-8"),
             "manifest.webmanifest": json.dumps(MANIFEST, indent=2).encode("utf-8"),
             "sw.js": SERVICE_WORKER.encode("utf-8")}
    for f in ASSETS.glob("*.png"):
        files[f.name] = f.read_bytes()
    if FX_FILE.is_file():   # the 3D layer, shared with the NQ dashboard; the page uses a 2D fallback without it
        files["fx.js"] = FX_FILE.read_bytes()
    for c in data.get("clips") or []:
        rel = c.get("thumb")
        if not home or not rel or not re.fullmatch(r"thumbs/\d+\.jpg", rel):
            continue
        try:
            files[rel] = (home / rel).read_bytes()
        except OSError:
            pass
    return files


def render_html(data: dict) -> str:
    payload = json.dumps(data, default=str).replace("</", "<\\/") \
        .replace("<!--", "<\\!--").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    return _page().replace("/*__DATA__*/null", payload)


def write(ws) -> Path:
    out = ws.home / "dashboard.html"
    make_thumbs(ws)
    tmp = out.with_suffix(".tmp")
    tmp.write_text(render_html(build_data(ws)), encoding="utf-8")
    tmp.replace(out)
    for f in ASSETS.glob("*.png"):  # icons next to the local page, for the brand mark and favicon
        dest = ws.home / f.name
        if not dest.exists() or dest.stat().st_size != f.stat().st_size:
            dest.write_bytes(f.read_bytes())
    return out


PAGE_FILE = Path(__file__).resolve().parent / "dashboard_page.html"


def _page() -> str:
    return PAGE_FILE.read_text(encoding="utf-8")

