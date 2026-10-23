"""
Clip Engine dashboard: one self-contained HTML page (same design system as the NQ "Liquidity Engine"
dashboard) built from the local workspace. Rebuilt after every autopilot cycle; open it with
`python pipeline.py dashboard`. Works from disk, no server; the review server also serves it at /dashboard.

The data object `build_data` returns is specified in docs/DASHBOARD_DATA.md (v2).
"""

from __future__ import annotations

import datetime as dt
import json
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
                "posts_at_cap": 0}


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
            "posts_at_cap": sum(1 for v in views if to_cap and v >= to_cap)}


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
        if not isinstance(r, dict) or not (r.get("name") or r.get("url")):
            continue
        url = str(r.get("url") or "")
        url = url if re.match(r"https?://", url) else ""
        if url and url.rstrip("/") in joined_urls:
            continue
        rates = {}
        for p, v in (r.get("rates") or {}).items() if isinstance(r.get("rates"), dict) else []:
            if isinstance(v, dict):
                rates[str(p).lower()] = {"cpm": _num(v.get("cpm")), "min": _num(v.get("min")), "max": _num(v.get("max"))}
        tk = rates.get("tiktok") or (next(iter(rates.values())) if rates else {})
        left, budget = _num(r.get("left")), _num(r.get("budget"))
        out.append({"id": str(r.get("id") or ""), "name": str(r.get("name") or url)[:160],
                    "org": str(r.get("org") or ""), "url": url, "rates": rates,
                    "platforms": list(rates), "cpm": tk.get("cpm"), "min": tk.get("min"), "max": tk.get("max"),
                    "left": left, "budget": budget,
                    "spent_frac": round(min(1.0, max(0.0, (budget - left) / budget)), 4)
                    if left is not None and budget else None,
                    "creators": _int(r.get("creators")), "views": _int(r.get("views")),
                    "categories": _names(r.get("categories")), "types": _names(r.get("types")),
                    "content_rules": _int(r.get("content_rules")), "requirements": _int(r.get("requirements")),
                    "requires_application": r.get("requires_application") if isinstance(r.get("requires_application"),
                                                                                      bool) else None,
                    "score": _num(r.get("score"), 0.0) or 0.0})
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
        out.append({"platform": p, "name": a, "campaigns": sorted(x for x in meta["campaigns"] if x),
                    "today": today_n, "cap": cap, "posts": len(mine),
                    "posts_7d": sum(1 for u in mine if u["_t"] and u["_t"] >= t7),
                    "views": views, "views_7d": int(v7), "avg_views": round(views / len(mine)) if mine else 0,
                    "likes": likes, "engagement": round(likes / views, 4) if views else 0.0,
                    "last_post": last.isoformat(timespec="seconds") if last else None,
                    "net": round(float(sum(u["net"] for u in mine)), 2),
                    "net_7d": round(float(sum(u["net"] for u in mine if u["_t"] and u["_t"] >= t7)), 2),
                    "slideshows": sum(1 for u in mine if u.get("c_kind") == "slideshow"),
                    "daily_views": [int(x) for x in daily], "status": status, "status_note": note})
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
    autopilot_files = set(ws.setting("autopilot.campaigns", []))
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

    submit = [{"clip_id": u["clip_id"], "platform": u["platform"], "url": u["url"], "title": u["title"],
               "page": ((camps.get(u["campaign"]) or {}).get("permission") or {}).get("campaign_url", "")}
              for u in uploads if u["url"] and not u["submitted_at"]]
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
    for c in campaigns:
        c["posting_accounts"] = sorted({f"{a['platform']}/{a['name']}" for a in acc_detail
                                        if c["name"] in (a.get("campaigns") or [])})
    agency = _safe(lambda: agency_summary(campaigns, acc_detail), json.loads(json.dumps(EMPTY_AGENCY)))
    joined = {str(c["url"]).rstrip("/") for c in campaigns if c.get("url")}
    discovered = _safe(lambda: leads_discovered(ws, joined), [])
    g = pl.LedgerGuard(ws)
    enabled = bool(ws.setting("autopilot.enabled", False))
    return {
        "version": VERSION,
        "generated": now_dt.isoformat(timespec="seconds"),
        "workspace": str(ws.home),
        "preview": False,
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
                  "to_submit": len(submit), "drafts": len(drafts), "held": len(held),
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
        "todo": {"submit": submit[:50], "drafts": drafts[:20], "held": held[:30]},
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
        "leads_discovered": discovered,
        "jobs": _rows(ws, "SELECT id, status, attempts, title, input, last_error, updated FROM sources ORDER BY id DESC LIMIT 60"),
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
    return d


ASSETS = Path(__file__).resolve().parent / "site_assets"
MANIFEST = {
    "name": "Clip Engine", "short_name": "Clips",
    "description": "Clipping autopilot: clips, posts, views and estimated earnings.",
    "id": "./", "start_url": "./#/today", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#07080c", "theme_color": "#07080c",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
              {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
    "shortcuts": [{"name": n, "url": f"./#/{n.lower()}"} for n in ("Today", "Clips", "Campaigns", "Earnings", "Jobs")],
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


def site_files(data: dict, ws=None) -> dict[str, bytes]:
    """Everything a hosted copy needs (GitHub Pages): page, data.json, manifest, icons and clip thumbnails.
    Thumbnails come from `ws.home/thumbs` (or the workspace named in the data when no ws is given)."""
    files = {"index.html": render_html(data).encode("utf-8"),
             "data.json": json.dumps(data, default=str).encode("utf-8"),
             "manifest.webmanifest": json.dumps(MANIFEST, indent=2).encode("utf-8"),
             "sw.js": SERVICE_WORKER.encode("utf-8")}
    for f in ASSETS.glob("*.png"):
        files[f.name] = f.read_bytes()
    if FX_FILE.is_file():   # the 3D layer, shared with the NQ dashboard; the page uses a 2D fallback without it
        files["fx.js"] = FX_FILE.read_bytes()
    home = ws.home if ws is not None else (Path(data["workspace"]) if data.get("workspace") else None)
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
    payload = json.dumps(data, default=str).replace("</", "<\\/")
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

