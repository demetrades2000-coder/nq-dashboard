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


def make_thumbs(ws, limit: int = THUMB_LIMIT) -> int:
    """270x480 JPEG of a frame ~1.5 s in, for the newest `limit` clips with a rendered file. Only missing ones are made;
    failures are skipped silently. Returns how many were created."""
    try:
        rows = ws.q("SELECT id, file FROM clips WHERE file IS NOT NULL AND file != '' ORDER BY id DESC")
    except Exception:
        return 0
    todo = []
    for r in rows:
        try:
            if not Path(r["file"]).is_file():
                continue
        except OSError:
            continue
        todo.append(r)
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
        for at in ("1.5", "0"):
            try:
                subprocess.run([ff, "-y", "-loglevel", "error", "-ss", at, "-i", str(r["file"]), "-frames:v", "1",
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

def _load_campaigns(ws) -> dict:
    camps_files = {}
    for r in ws.q("SELECT DISTINCT campaign, campaign_file FROM sources"):
        camps_files[r["campaign"]] = r["campaign_file"]
    root = Path(__file__).resolve().parent / "campaigns"
    for f in root.glob("*.json"):
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


def build_data(ws) -> dict:
    import pipeline as pl  # late import: pipeline imports this module
    camps = _load_campaigns(ws)
    now_dt = dt.datetime.now()
    today = now_dt.date()

    uploads = _rows(ws, "SELECT u.*, c.title, c.campaign, c.score, c.start AS c_start, c.end_ AS c_end, c.text AS c_text "
                        "FROM uploads u JOIN clips c ON c.id=u.clip_id ORDER BY u.id DESC")
    for u in uploads:
        c = camps.get(u["campaign"]) or {}
        u["net"] = round(cmp.payout(c, int(u["views"] or 0))[1], 2) if c.get("cpm") else 0.0
        u["_t"] = _parse(u["created"])
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
                          "notes": str(c.get("notes") or "")[:300]})
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
                      "every_hours": every, "next_run": next_run},
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
                      "calendar": [{"date": d, **v} for d, v in cal.items()],
                      "streak": streak(post_days, today)},
        "pipeline": {"queue": queue, "sources": ws.q("SELECT COUNT(*) n FROM sources")[0]["n"]},
        "health": health(ws, enabled, accounts),
        "goals": {"month_target": goal},
        "leads": leads,
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


def site_files(data: dict, ws=None) -> dict[str, bytes]:
    """Everything a hosted copy needs (GitHub Pages): page, data.json, manifest, icons and clip thumbnails.
    Thumbnails come from `ws.home/thumbs` (or the workspace named in the data when no ws is given)."""
    files = {"index.html": render_html(data).encode("utf-8"),
             "data.json": json.dumps(data, default=str).encode("utf-8"),
             "manifest.webmanifest": json.dumps(MANIFEST, indent=2).encode("utf-8")}
    for f in ASSETS.glob("*.png"):
        files[f.name] = f.read_bytes()
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

