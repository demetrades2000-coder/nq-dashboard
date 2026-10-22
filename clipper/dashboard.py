"""
Clip Engine dashboard: one self-contained HTML page (same design system as the NQ "Liquidity Engine"
dashboard) built from the local workspace. Rebuilt after every autopilot cycle; open it with
`python pipeline.py dashboard`. Works from disk, no server; the review server also serves it at /dashboard.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import campaign as cmp
import tracker


def _rows(ws, sql, args=()):
    return [dict(r) for r in ws.q(sql, args)]


def build_data(ws) -> dict:
    import pipeline as pl  # late import: pipeline imports this module
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

    uploads = _rows(ws, "SELECT u.*, c.title, c.campaign FROM uploads u JOIN clips c ON c.id=u.clip_id ORDER BY u.id DESC")
    for u in uploads:
        c = camps.get(u["campaign"]) or {}
        u["net"] = round(cmp.payout(c, int(u["views"] or 0))[1], 2) if c.get("cpm") else 0.0
    by_clip: dict[int, list] = {}
    for u in uploads:
        by_clip.setdefault(u["clip_id"], []).append(
            {k: u[k] for k in ("platform", "url", "views", "likes", "state", "net", "account", "created", "submitted_at")})

    clips = []
    for r in ws.q("SELECT * FROM clips ORDER BY id DESC LIMIT 400"):
        ups = by_clip.get(r["id"], [])
        clips.append({"id": r["id"], "title": r["title"], "campaign": r["campaign"], "score": round(r["score"] or 0, 1),
                      "status": r["status"], "dur": round((r["end_"] or 0) - (r["start"] or 0)), "created": r["created"],
                      "held": r["held_reason"], "uploads": ups, "views": sum(int(u["views"] or 0) for u in ups),
                      "net": round(sum(u["net"] for u in ups), 2),
                      "flags": [f["msg"] for f in json.loads(r["flags"] or "[]") if f.get("level") == "warn"][:3]})

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
            age = (dt.date.today() - dt.date.fromisoformat(perm.get("verified_on", ""))).days
        except Exception:
            pass
        cu = [u for u in uploads if u["campaign"] == name]
        campaigns.append({"name": name, "cpm": float(c.get("cpm") or 0), "fee": float(c.get("fee_pct") or 0),
                          "cap": c.get("max_payout_per_clip") or 0, "min_views": c.get("min_views") or 0,
                          "platforms": c.get("platforms") or [], "url": perm.get("campaign_url", ""),
                          "verified_on": perm.get("verified_on", ""), "age": age, "problems": problems[:6],
                          "auto": c.get("_path") in autopilot_files, "posts": len(cu),
                          "views": sum(int(u["views"] or 0) for u in cu), "net": round(sum(u["net"] for u in cu), 2),
                          "clips": sum(1 for x in clips if x["campaign"] == name)})
    campaigns.sort(key=lambda x: (not x["auto"], bool(x["problems"]), x["name"]))

    # daily: posts and views by post date (last 21 days)
    today = dt.date.today()
    daily = {(today - dt.timedelta(days=i)).isoformat(): {"posts": 0, "views": 0, "net": 0.0} for i in range(20, -1, -1)}
    for u in uploads:
        d = (u["created"] or "")[:10]
        if d in daily:
            daily[d]["posts"] += 1
            daily[d]["views"] += int(u["views"] or 0)
            daily[d]["net"] += u["net"]
    by_platform: dict[str, dict] = {}
    for u in uploads:
        p = by_platform.setdefault(u["platform"], {"posts": 0, "views": 0, "net": 0.0, "likes": 0})
        p["posts"] += 1
        p["views"] += int(u["views"] or 0)
        p["likes"] += int(u["likes"] or 0)
        p["net"] = round(p["net"] + u["net"], 2)

    last = {}
    log = ws.home / "logs" / "autopilot.jsonl"
    if log.exists():
        try:
            lines = [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]
            last = json.loads(lines[-1]) if lines else {}
        except Exception:
            last = {}

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

    pol = pl.autopilot_policy(ws)
    g = pl.LedgerGuard(ws)
    return {
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "workspace": str(ws.home),
        "autopilot": {"enabled": bool(ws.setting("autopilot.enabled", False)), "via": pol["via"],
                      "platforms": pol["platforms"], "cap": pol["max_uploads_per_day"], "min_score": pol["min_score"],
                      "privacy": pol["privacy"], "last": {k: (len(v) if isinstance(v, list) else v)
                                                          for k, v in last.items() if k != "notes"},
                      "notes": (last.get("notes") or [])[:8], "errors": (last.get("upload_errors") or [])[:8]},
        "accounts": accounts,
        "stats": {"clips": len(clips), "posted": sum(1 for c in clips if c["status"] == "posted"),
                  "posts": len(uploads), "views": sum(int(u["views"] or 0) for u in uploads),
                  "likes": sum(int(u["likes"] or 0) for u in uploads), "net": round(sum(u["net"] for u in uploads), 2),
                  "to_submit": len(submit), "drafts": len(drafts), "held": len(held),
                  "today_posts": daily[today.isoformat()]["posts"]},
        "todo": {"submit": submit[:50], "drafts": drafts[:20], "held": held[:30]},
        "clips": clips,
        "campaigns": campaigns,
        "earnings": {"by_platform": by_platform, "daily": [{"date": d, **v} for d, v in daily.items()],
                     "top": sorted(({"title": u["title"], "platform": u["platform"], "url": u["url"],
                                     "views": int(u["views"] or 0), "net": u["net"]} for u in uploads if u["url"]),
                                   key=lambda x: -x["views"])[:10]},
        "jobs": _rows(ws, "SELECT id, status, attempts, title, input, last_error, updated FROM sources ORDER BY id DESC LIMIT 60"),
        "events": _rows(ws, "SELECT ts, level, message FROM events ORDER BY id DESC LIMIT 60"),
        "spend": {"month": round(g.month_spent(), 4), "cap": float(ws.setting("spend.monthly_cap_usd", 0) or 0)},
    }


def hide_money(data: dict) -> dict:
    """Public copy without dollar figures (for a published page whose owner wants earnings private)."""
    d = json.loads(json.dumps(data, default=str))
    d["hide_money"] = True
    d["stats"]["net"] = None
    for c in d["clips"]:
        c["net"] = None
        for u in c["uploads"]:
            u["net"] = None
    for c in d["campaigns"]:
        c["net"] = None
    for v in d["earnings"]["by_platform"].values():
        v["net"] = None
    for r in d["earnings"]["daily"]:
        r["net"] = None
    for t in d["earnings"]["top"]:
        t["net"] = None
    d["spend"] = {"month": None, "cap": None}
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


def site_files(data: dict) -> dict[str, bytes]:
    """Everything a hosted copy needs (GitHub Pages): page, data.json, manifest, icons."""
    files = {"index.html": render_html(data).encode("utf-8"),
             "data.json": json.dumps(data, default=str).encode("utf-8"),
             "manifest.webmanifest": json.dumps(MANIFEST, indent=2).encode("utf-8")}
    for f in ASSETS.glob("*.png"):
        files[f.name] = f.read_bytes()
    return files


def render_html(data: dict) -> str:
    payload = json.dumps(data, default=str).replace("</", "<\\/")
    return PAGE.replace("/*__DATA__*/null", payload)


def write(ws) -> Path:
    out = ws.home / "dashboard.html"
    tmp = out.with_suffix(".tmp")
    tmp.write_text(render_html(build_data(ws)), encoding="utf-8")
    tmp.replace(out)
    for f in ASSETS.glob("*.png"):  # icons next to the local page, for the brand mark and favicon
        dest = ws.home / f.name
        if not dest.exists() or dest.stat().st_size != f.stat().st_size:
            dest.write_bytes(f.read_bytes())
    return out


PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#07080c">
<meta name="color-scheme" content="dark">
<title>Clip Engine</title>
<meta name="description" content="Clipping autopilot: clips, posts, views and estimated earnings.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Clips">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* ===== Clip Engine · same design system as the NQ Liquidity Engine dashboard ===== */
:root {
  color-scheme: dark;
  --page: #07080c; --surface: #10131a; --surface-2: #161a23; --surface-3: #1e2330;
  --ink: #eef1f8; --ink-2: #a9b1c3; --muted: #6f788b;
  --line: rgba(160, 170, 220, .10); --hover: rgba(238, 241, 248, .06);
  --accent: #6d7cff; --accent-2: #3ee0c8; --good: #2ee59d; --good-ink: #4ff0ae; --bad: #ff5a7a; --warn: #f7b955; --gold: #f2c35b;
  --tt: #ff3d7f; --ig: #c77dff; --yt: #ff5a5a;
  --r: 18px; --gutter: 16px; --side: 248px;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; --mono: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
  --ease: cubic-bezier(.2, .8, .2, 1);
}
:root[data-accent="teal"] { --accent: #2fd3c0; --accent-2: #6d7cff; }
:root[data-accent="gold"] { --accent: #e9b44c; --accent-2: #ff8f5a; }
:root[data-accent="rose"] { --accent: #ff6b9a; --accent-2: #b18cff; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--page); color: var(--ink); font: 14px/1.45 var(--sans); font-feature-settings: "tnum", "cv11"; -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent; min-height: 100vh; min-height: 100dvh;
  background-image: radial-gradient(1100px 620px at 0% -10%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%),
    radial-gradient(900px 560px at 100% 0%, color-mix(in srgb, var(--accent-2) 8%, transparent), transparent 62%),
    radial-gradient(1200px 700px at 50% 120%, rgba(177, 140, 255, .07), transparent 60%);
  background-attachment: fixed; }
button, input { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--accent); }
:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 80%, transparent); outline-offset: 2px; }
* { scrollbar-width: thin; scrollbar-color: rgba(238,241,248,.16) transparent; }
.ico { flex: none; display: inline-block; vertical-align: -4px; }
.up { color: var(--good-ink); } .dn { color: var(--bad); } .wn { color: var(--warn); } .mut { color: var(--muted); } .mono { font-family: var(--mono); }
.small { font-size: 12px; }
.app { display: grid; grid-template-columns: var(--side) minmax(0, 1fr); min-height: 100vh; min-height: 100dvh; }
.side { position: sticky; top: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column; gap: 6px; padding: 18px 12px 14px; overflow: auto;
  background: linear-gradient(180deg, rgba(16,19,26,.72), rgba(16,19,26,.55)); border-right: 1px solid var(--line); backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3); }
.brand { display: flex; align-items: center; gap: 11px; padding: 2px 8px 14px; }
.mark { width: 38px; height: 38px; flex: none; display: grid; place-items: center; border-radius: 12px; color: #fff;
  background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 55%, var(--surface-2)), color-mix(in srgb, var(--accent-2) 30%, var(--surface-2)));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 6px 22px color-mix(in srgb, var(--accent) 28%, transparent); }
.brand b { display: block; font-weight: 700; font-size: 14.5px; letter-spacing: -.01em; } .brand span { font-size: 11px; color: var(--muted); }
.nav { display: flex; flex-direction: column; gap: 2px; }
.nav a { position: relative; display: flex; align-items: center; gap: 12px; height: 42px; padding: 0 12px; border-radius: 12px; color: var(--ink-2); font-weight: 550; text-decoration: none; transition: background .18s, color .18s; }
.nav a:hover { background: var(--hover); color: var(--ink); }
.nav a.on { color: var(--ink); background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 6%, transparent)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent); }
.nav a.on::before { content: ""; position: absolute; left: -12px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: linear-gradient(180deg, var(--accent-2), var(--accent)); box-shadow: 0 0 14px var(--accent); }
.nav a.on .ico { color: var(--accent); }
.nav a i { margin-left: auto; font-style: normal; font: 600 11px var(--mono); padding: 2px 7px; border-radius: 99px; background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); }
.nav .sec { font: 650 10.5px var(--sans); text-transform: uppercase; letter-spacing: .12em; color: var(--muted); padding: 18px 12px 6px; }
.side-foot { margin-top: auto; padding: 12px 14px; border-radius: 14px; background: rgba(22,26,35,.7); border: 1px solid var(--line); }
.side-foot .k { font: 600 10.5px var(--sans); text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.side-foot .v { font-weight: 650; margin-top: 2px; }
.main { min-width: 0; display: flex; flex-direction: column; }
.top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 12px; padding: 12px 24px; min-height: 64px;
  background: color-mix(in srgb, var(--page) 60%, transparent); backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3); border-bottom: 1px solid transparent; }
.scrolled .top { border-bottom-color: var(--line); }
.ttl { min-width: 0; flex: 1; }
.crumb { font: 600 11px var(--sans); color: var(--muted); letter-spacing: .08em; text-transform: uppercase; }
.ttl h1 { margin: 0; font-size: 21px; font-weight: 700; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--line); background: rgba(22,26,35,.7); font: 600 12px var(--mono); color: var(--ink-2); white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); box-shadow: 0 0 0 0 rgba(46,229,157,.6); animation: pulse 1.8s infinite; }
.dot.off { background: var(--muted); animation: none; } .dot.warn { background: var(--warn); animation: none; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(46,229,157,.55); } 70% { box-shadow: 0 0 0 9px rgba(46,229,157,0); } 100% { box-shadow: 0 0 0 0 rgba(46,229,157,0); } }
.iconbtn { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--line); background: rgba(22,26,35,.7); color: var(--ink-2); transition: all .18s; }
.iconbtn:hover { color: var(--ink); border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
.page { padding: 20px 24px 60px; max-width: 1400px; width: 100%; animation: in .32s var(--ease); }
@keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tabs { display: none; }
.card { position: relative; border-radius: var(--r); padding: 18px 20px; margin-bottom: 16px; min-width: 0;
  background: linear-gradient(180deg, rgba(16,19,26,.78), rgba(16,19,26,.62)); border: 1px solid var(--line);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 20px 50px rgba(0,0,0,.28); backdrop-filter: blur(18px) saturate(1.25); -webkit-backdrop-filter: blur(18px) saturate(1.25); }
.card-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.card-h h3 { margin: 0; font-size: 13.5px; font-weight: 650; }
.grid { display: grid; gap: 16px; margin-bottom: 16px; } .g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid > .card { margin-bottom: 0; }
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin: 4px 0 20px; }
.hero > div:first-child { flex: 1 1 360px; min-width: 0; }
.hero h2 { margin: 6px 0; font-size: 28px; line-height: 1.15; font-weight: 750; letter-spacing: -.025em;
  background: linear-gradient(90deg, var(--ink), color-mix(in srgb, var(--ink) 70%, var(--accent))); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.hero p { margin: 0; color: var(--ink-2); font-size: 13.5px; max-width: 760px; }
.eyebrow { font: 650 11px var(--sans); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--line);
  background: linear-gradient(160deg, rgba(22,26,35,.82), rgba(16,19,26,.6)); box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
.stat::after { content: ""; position: absolute; inset: 0 0 auto; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent); }
.stat > span { font: 600 11px var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.stat b { font-size: 26px; font-weight: 750; letter-spacing: -.02em; } .stat em { font-style: normal; font-size: 12px; color: var(--ink-2); }
.kv.one { display: grid; grid-template-columns: 1fr; }
.kv.one > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line); }
.kv.one > div:last-child { border-bottom: 0; } .kv.one span { font-size: 12.5px; color: var(--muted); } .kv.one b { font-size: 13px; text-align: right; font-weight: 650; }
.chip { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 99px; font-size: 11.5px; font-weight: 550; color: var(--ink-2); white-space: nowrap;
  background: rgba(30,35,48,.7); border: 1px solid var(--line); text-decoration: none; }
.chip.warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 40%, transparent); background: color-mix(in srgb, var(--warn) 10%, transparent); }
.chip.good { color: var(--good-ink); border-color: color-mix(in srgb, var(--good) 40%, transparent); background: color-mix(in srgb, var(--good) 10%, transparent); }
.chip.bad { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 40%, transparent); background: color-mix(in srgb, var(--bad) 10%, transparent); }
.chip.tiktok { color: var(--tt); border-color: color-mix(in srgb, var(--tt) 40%, transparent); }
.chip.instagram { color: var(--ig); border-color: color-mix(in srgb, var(--ig) 40%, transparent); }
.chip.youtube { color: var(--yt); border-color: color-mix(in srgb, var(--yt) 40%, transparent); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.badge { flex: none; font-weight: 700; font-size: 12px; padding: 6px 11px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface-2); white-space: nowrap; }
.badge.good { color: var(--good-ink); border-color: color-mix(in srgb, var(--good) 40%, transparent); background: color-mix(in srgb, var(--good) 10%, transparent); }
.badge.bad { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 40%, transparent); background: color-mix(in srgb, var(--bad) 10%, transparent); }
.badge.warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 40%, transparent); background: color-mix(in srgb, var(--warn) 10%, transparent); }
.empty { color: var(--muted); padding: 22px 6px; text-align: center; font-size: 13px; }
.note { font-size: 12.5px; color: var(--ink-2); margin-top: 10px; line-height: 1.55; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 34px; padding: 0 13px; border-radius: 12px; font-weight: 600; font-size: 12.5px; white-space: nowrap;
  background: linear-gradient(180deg, #232837, var(--surface-2)); border: 1px solid rgba(238,241,248,.1); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.3); color: var(--ink); text-decoration: none; }
.btn:hover { border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.btn.pri { background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 70%, #fff 0%), color-mix(in srgb, var(--accent) 55%, #000)); border-color: color-mix(in srgb, var(--accent) 60%, transparent); }
.tw { overflow-x: auto; margin: 0 -6px; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: left; font: 600 11px var(--sans); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); padding: 9px 10px; border-bottom: 1px solid var(--line); background: rgba(16,19,26,.95); position: sticky; top: 0; white-space: nowrap; }
td { padding: 9px 10px; border-bottom: 1px solid rgba(238,241,248,.05); white-space: nowrap; }
td.wrap { white-space: normal; min-width: 220px; }
tr:hover td { background: color-mix(in srgb, var(--accent) 6%, transparent); }
.num { text-align: right; font-family: var(--mono); }
.list { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 14px; border: 1px solid var(--line); background: rgba(22,26,35,.55); min-width: 0; }
.row .grow { flex: 1; min-width: 0; } .row .t { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .row .s { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cap { white-space: pre-wrap; font: 12px/1.5 var(--mono); color: var(--ink-2); background: rgba(7,8,12,.5); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; margin-top: 8px; }
.bars { display: flex; align-items: flex-end; gap: 6px; height: 170px; padding-top: 10px; }
.bars .b { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.bars .b i { display: block; width: 100%; border-radius: 6px 6px 3px 3px; background: linear-gradient(180deg, var(--accent-2), color-mix(in srgb, var(--accent) 70%, transparent)); min-height: 2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 25%, transparent); }
.bars .b span { font: 500 9.5px var(--mono); color: var(--muted); }
.meter { height: 8px; border-radius: 99px; background: rgba(238,241,248,.06); overflow: hidden; } .meter i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
.prob { font-size: 12px; color: var(--warn); margin: 3px 0; }
.toast { position: fixed; left: 50%; bottom: 24px; z-index: 1200; transform: translate(-50%, 30px); opacity: 0; transition: all .25s var(--ease); padding: 11px 16px; border-radius: 14px;
  background: rgba(30,35,48,.96); border: 1px solid var(--line); box-shadow: 0 18px 50px rgba(0,0,0,.5); font-weight: 600; font-size: 13px; pointer-events: none; }
.toast.on { opacity: 1; transform: translate(-50%, 0); }
.mark { overflow: hidden; padding: 0; } .mark img { width: 100%; height: 100%; display: block; border-radius: 12px; }
#splash { position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center; background: radial-gradient(80% 60% at 50% 45%, #0f1a4d, #050713 60%, #020104); transition: opacity .55s var(--ease), transform .55s var(--ease); }
#splash.out { opacity: 0; transform: scale(1.08); pointer-events: none; }
#splash canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.sp-in { position: relative; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
.sp-in img { width: 132px; height: 132px; border-radius: 22%; box-shadow: 0 0 80px rgba(109,124,255,.55), 0 0 0 1px rgba(255,255,255,.08); animation: sp-pop 1.1s var(--ease) both; }
.sp-t { font: 800 20px var(--sans); letter-spacing: .32em; margin-right: -.32em; background: linear-gradient(90deg, #fff, #c9d0ff, #7fe9ff); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: sp-fade .9s .35s var(--ease) both; }
.sp-s { font: 500 12px var(--sans); color: #9aa3c9; letter-spacing: .06em; animation: sp-fade .9s .5s var(--ease) both; }
.sp-bar { width: 160px; height: 3px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; margin-top: 6px; animation: sp-fade .6s .6s both; }
.sp-bar i { display: block; width: 40%; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); animation: sp-load 1.1s ease-in-out infinite; }
@keyframes sp-pop { from { opacity: 0; transform: scale(.6) rotate(-8deg); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes sp-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes sp-load { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
.iconbtn.spin .ico { animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.seg { display: inline-flex; gap: 3px; padding: 3px; border-radius: 12px; background: rgba(7,8,12,.55); border: 1px solid var(--line); box-shadow: inset 0 1px 2px rgba(0,0,0,.35); }
.seg button { border: 0; background: transparent; color: var(--ink-2); height: 32px; padding: 0 12px; border-radius: 9px; font-weight: 600; font-size: 12.5px; }
.seg button.on { color: var(--ink); background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 26%, var(--surface-2)), color-mix(in srgb, var(--accent) 12%, var(--surface-2))); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }
.swatch { width: 14px; height: 14px; border-radius: 50%; display: inline-block; vertical-align: -2px; margin-right: 6px; }
@media (max-width: 760px) {
  .app { display: block; } .side { display: none; }
  .top { padding: calc(10px + env(safe-area-inset-top)) var(--gutter) 10px; min-height: 0; }
  .ttl h1 { font-size: 19px; } .status .lbl { display: none; }
  .page { padding: 14px var(--gutter) calc(100px + env(safe-area-inset-bottom)); }
  .card, .stat { backdrop-filter: none; -webkit-backdrop-filter: none; }
  .card { padding: 14px 15px; border-radius: 16px; }
  .g2, .g3 { grid-template-columns: 1fr; } .grid { gap: 12px; margin-bottom: 12px; }
  .hero h2 { font-size: 23px; } .hero { margin-bottom: 14px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } .stat { padding: 12px 13px; } .stat b { font-size: 21px; }
  .toast { bottom: calc(96px + env(safe-area-inset-bottom)); }
  .row { gap: 8px; padding: 10px; } .row .btn { min-height: 36px; padding: 0 10px; } .row .bl { display: none; }
  .tabs { display: flex; position: fixed; z-index: 70; left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); height: 64px; padding: 6px; gap: 4px; border-radius: 22px;
    background: rgba(16,19,26,.84); border: 1px solid rgba(238,241,248,.1); box-shadow: 0 18px 50px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); }
  .tabs a { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; border-radius: 16px; min-width: 0; color: var(--muted); font-size: 10.5px; font-weight: 600; text-decoration: none; transition: all .18s; }
  .tabs a .ico { width: 21px; height: 21px; }
  .tabs a.on { color: var(--ink); background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 24%, transparent), color-mix(in srgb, var(--accent) 8%, transparent)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent); }
  .tabs a.on .ico { color: var(--accent); }
}
@media (min-width: 761px) and (max-width: 1100px) {
  :root { --side: 76px; }
  .brand > div:last-child, .nav a span, .nav a i, .nav .sec, .side-foot { display: none; }
  .nav a { justify-content: center; padding: 0; } .brand { justify-content: center; padding-left: 0; padding-right: 0; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>
</head>
<body>
<div id="splash" aria-hidden="true"><canvas id="spCv"></canvas><div class="sp-in"><img src="icon-512.png" alt="" onerror="this.style.display='none'">
  <div class="sp-t">CLIP ENGINE</div><div class="sp-s">clipping campaigns · autopilot · free posting</div><div class="sp-bar"><i></i></div></div></div>
<div class="app">
  <aside class="side">
    <div class="brand"><div class="mark" id="mark"><img src="icon-192.png" alt="" width="38" height="38" onerror="this.parentNode.innerHTML=window.LOGO_SVG||''"></div><div><b>Clip Engine</b><span id="sideSub">clipping campaigns · autopilot</span></div></div>
    <nav class="nav" id="nav" aria-label="Sections"></nav>
    <div class="side-foot"><div class="k">Autopilot</div><div class="v" id="sideRun">—</div><div class="small mut" id="sideWhen"></div></div>
  </aside>
  <div class="main">
    <header class="top">
      <div class="ttl"><div class="crumb" id="crumb">Clip Engine</div><h1 id="title">Today</h1></div>
      <span class="status" id="status"><span class="dot off"></span><span class="lbl">loading</span></span>
      <button class="iconbtn" id="refresh" type="button" title="Reload" aria-label="Reload"></button>
    </header>
    <main class="page" id="page"></main>
  </div>
  <nav class="tabs" id="tabs" aria-label="Main"></nav>
</div>
<div class="toast" id="toast"></div>
<script>
'use strict';
let D = /*__DATA__*/null;
const store = { get(k, d) { try { const v = localStorage.getItem('ce.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
                set(k, v) { try { localStorage.setItem('ce.' + k, JSON.stringify(v)); } catch (e) { } } };
document.documentElement.dataset.accent = store.get('accent', 'indigo');
const P = {
  today: '<path d="M3 12h3l3-8 4 16 3-8h5"/>',
  clips: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
  camp: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4"/><path d="M12 13.5V17M8.5 20.5h7l-1-3.5h-5z"/>',
  money: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  jobs: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/><path d="M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20.5V16h-4.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>', alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  logo: '<rect x="4" y="3" width="11" height="15" rx="2.5"/><path d="M9 8v5l4-2.5z"/><path d="M18 7l2.5-1.5M18 11h3M18 15l2.5 1.5"/>'
};
const icon = (k, s = 18) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || ''}</svg>`;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = n => (n == null ? '—' : Number(n).toLocaleString('en-US'));
const kfmt = n => { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(n); };
const usd = n => n == null ? (D && D.hide_money ? 'hidden' : '—') : '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ago = iso => { if (!iso) return '—'; const s = (Date.now() - new Date(iso).getTime()) / 1000; if (s < 90) return 'just now'; if (s < 5400) return Math.round(s / 60) + ' min ago'; if (s < 129600) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; };
const pchip = p => `<span class="chip ${esc(p)}">${esc(p)}</span>`;
const STATUS = { posted: 'good', approved: 'good', pending_review: 'warn', rejected: 'bad', render_failed: 'bad', done: 'good', failed: 'bad', blocked: 'bad', retry_wait: 'warn', queued: '', fetching: 'warn', transcribing: 'warn', selecting: 'warn', rendering: 'warn' };
const sbadge = s => `<span class="chip ${STATUS[s] || ''}">${esc(String(s || '').replace('_', ' '))}</span>`;
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 1600); }
function copy(text) {
  const done = () => toast('Copied');
  if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, () => fallback()); } else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Select and copy manually'); } ta.remove(); }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-copy]'); if (b) copy(b.getAttribute('data-copy')); });

const ROUTES = [
  { id: 'today', label: 'Today', ic: 'today', badge: () => (D.stats.to_submit + D.stats.drafts + D.stats.held) || '' },
  { id: 'clips', label: 'Clips', ic: 'clips' },
  { id: 'campaigns', label: 'Campaigns', ic: 'camp' },
  { id: 'earnings', label: 'Earnings', ic: 'money' },
  { id: 'jobs', label: 'Jobs', ic: 'jobs' },
  { id: 'settings', label: 'Settings', ic: 'gear', side: true }
];
P.gear = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';

function stat(label, value, sub, cls = '') { return `<div class="stat"><span>${esc(label)}</span><b class="${cls}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`; }

function pageToday() {
  const s = D.stats, a = D.autopilot, last = a.last || {};
  const on = a.enabled;
  let h = `<section class="hero"><div><div class="eyebrow">${on ? 'Autopilot on' : 'Autopilot off'} · ${esc(a.via)} posting</div>
    <h2>${s.to_submit ? `${s.to_submit} link${s.to_submit > 1 ? 's' : ''} ready to submit` : s.posts ? `${num(s.views)} views on ${s.posts} posts` : 'Waiting for the first clips'}</h2>
    <p>Posts to ${a.platforms.map(esc).join(', ') || '—'} · up to ${a.cap}/day per account · min score ${a.min_score}. Last cycle ${esc(ago(last.finished))}.</p></div>
    <div class="chips">${D.accounts.map(x => `<span class="chip ${x.connected ? 'good' : ''}">${x.connected ? icon('check', 13) : ''}${esc(x.name)}</span>`).join('')}</div></section>`;
  h += `<div class="stats">
    ${stat('Est. net earned', usd(s.net), 'from public views', 'up')}
    ${stat('Views', kfmt(s.views), num(s.likes) + ' likes')}
    ${stat('Posts', num(s.posts), s.today_posts + ' today')}
    ${stat('Clips made', num(s.clips), s.posted + ' posted')}
    ${stat('To submit', num(s.to_submit), 'paste on campaign page', s.to_submit ? 'wn' : '')}
    ${stat('Held', num(s.held), 'need a look', s.held ? 'wn' : '')}</div>`;
  const sub = D.todo.submit;
  h += `<div class="card"><div class="card-h"><h3>Submit these on the campaign page</h3>${sub.length ? `<button class="btn" data-copy="${esc(sub.map(x => x.url).join('\n'))}">${icon('copy', 15)}Copy all links</button>` : ''}</div>
    ${sub.length ? `<div class="list">${sub.map(x => `<div class="row">${pchip(x.platform)}<div class="grow"><div class="t">#${x.clip_id} ${esc(x.title)}</div><div class="s mono">${esc(x.url)}</div></div>
      <button class="btn" data-copy="${esc(x.url)}" title="Copy link">${icon('copy', 15)}</button>${x.page ? `<a class="btn" href="${esc(x.page)}" target="_blank" rel="noopener">${icon('ext', 15)}<span class="bl">Campaign</span></a>` : ''}</div>`).join('')}</div>
      <div class="note">After pasting them, run <span class="mono">python pipeline.py submitted all</span>.</div>` : '<div class="empty">Nothing waiting. New links show up here after each cycle.</div>'}</div>`;
  if (D.todo.drafts.length) {
    h += `<div class="card"><div class="card-h"><h3>Finish in the TikTok app</h3><span class="badge warn">${D.todo.drafts.length} drafts</span></div><div class="list">
      ${D.todo.drafts.map(d => `<div class="row" style="flex-direction:column;align-items:stretch"><div style="display:flex;gap:10px;align-items:center"><div class="grow t">#${d.clip_id} ${esc(d.title)}</div><button class="btn" data-copy="${esc(d.caption)}">${icon('copy', 15)}Copy caption</button></div><div class="cap">${esc(d.caption)}</div></div>`).join('')}</div></div>`;
  }
  h += `<div class="grid g2"><div class="card"><div class="card-h"><h3>Views by post day</h3><span class="mut small">last 3 weeks</span></div>${bars(D.earnings.daily, 'views')}</div>
    <div class="card"><div class="card-h"><h3>Last cycle</h3><span class="mut small">${esc(ago(last.finished))}</span></div>
    <div class="kv one"><div><span>Uploaded</span><b>${num(last.uploaded || 0)}</b></div><div><span>Auto-approved</span><b>${num(last.approved || 0)}</b></div>
    <div><span>Held for you</span><b>${num(last.held || 0)}</b></div><div><span>Upload errors</span><b class="${last.upload_errors ? 'dn' : ''}">${num(last.upload_errors || 0)}</b></div>
    <div><span>AI spend this month</span><b>${usd(D.spend.month)} / ${usd(D.spend.cap)}</b></div></div>
    ${(a.errors || []).concat(a.notes || []).slice(0, 6).map(n => `<div class="prob">${icon('alert', 13)} ${esc(n)}</div>`).join('')}</div></div>`;
  if (D.todo.held.length) {
    h += `<div class="card"><div class="card-h"><h3>Held for review</h3><span class="mut small">open with: python pipeline.py review</span></div><div class="list">
      ${D.todo.held.map(x => `<div class="row"><div class="grow"><div class="t">#${x.id} ${esc(x.title)}</div><div class="s">${esc(x.reason || 'waiting for review')}</div></div></div>`).join('')}</div></div>`;
  }
  return h;
}

function bars(rows, key) {
  const max = Math.max(1, ...rows.map(r => r[key] || 0));
  if (!rows.some(r => r[key])) return '<div class="empty">No views yet.</div>';
  return `<div class="bars">${rows.map(r => `<div class="b" title="${esc(r.date)}: ${num(r[key])} ${key} · ${r.posts} posts"><i style="height:${(100 * (r[key] || 0) / max).toFixed(1)}%"></i><span>${esc(r.date.slice(8))}</span></div>`).join('')}</div>`;
}

let clipFilter = 'all';
function pageClips() {
  const f = clipFilter, all = D.clips;
  const counts = s => all.filter(c => s === 'all' || c.status === s).length;
  const rows = all.filter(c => f === 'all' || c.status === f);
  let h = `<section class="hero"><div><div class="eyebrow">Clips</div><h2>${num(all.length)} clips made</h2><p>Every clip the engine cut, where it was posted and how it's doing.</p></div>
    <div class="chips">${['all', 'posted', 'approved', 'pending_review', 'rejected'].map(s => `<button class="chip ${s === f ? 'good' : ''}" data-filter="${s}">${esc(s.replace('_', ' '))} · ${counts(s)}</button>`).join('')}</div></section>`;
  h += `<div class="card"><div class="tw"><table><thead><tr><th>#</th><th>Title</th><th>Campaign</th><th>Status</th><th>Posted on</th><th class="num">Views</th><th class="num">Est. net</th><th class="num">Score</th><th class="num">Length</th></tr></thead><tbody>
    ${rows.map(c => `<tr><td class="mono mut">${c.id}</td><td class="wrap">${esc(c.title)}${c.flags.length ? `<div class="prob">${esc(c.flags[0])}</div>` : ''}</td><td>${esc(c.campaign)}</td><td>${sbadge(c.status)}</td>
      <td><div class="chips">${c.uploads.map(u => u.url ? `<a class="chip ${esc(u.platform)}" href="${esc(u.url)}" target="_blank" rel="noopener">${esc(u.platform)} ${icon('ext', 11)}</a>` : `<span class="chip ${esc(u.platform)}">${esc(u.platform)} · ${esc(u.state)}</span>`).join('') || '<span class="mut">—</span>'}</div></td>
      <td class="num">${kfmt(c.views)}</td><td class="num up">${usd(c.net)}</td><td class="num">${c.score}</td><td class="num">${c.dur}s</td></tr>`).join('') || `<tr><td colspan="9" class="empty">No clips here yet.</td></tr>`}
    </tbody></table></div></div>`;
  return h;
}

function pageCampaigns() {
  let h = `<section class="hero"><div><div class="eyebrow">Campaigns</div><h2>${D.campaigns.filter(c => c.auto).length} on autopilot</h2><p>Rates, rules status and results per campaign. A campaign only runs once its permission check is current and nothing is left to fill in.</p></div></section>`;
  h += `<div class="grid g2">${D.campaigns.map(c => {
    const ready = !c.problems.length, stale = c.age != null && c.age > 30;
    return `<div class="card"><div class="card-h"><h3>${esc(c.name)}</h3><span class="badge ${ready && !stale ? (c.auto ? 'good' : '') : 'warn'}">${!ready ? 'needs setup' : stale ? 're-verify' : c.auto ? 'on autopilot' : 'ready'}</span></div>
      <div class="chips" style="margin-bottom:12px">${c.platforms.map(pchip).join('')}</div>
      <div class="kv one"><div><span>Rate</span><b>${usd(c.cpm)} / 1K views</b></div><div><span>Max per clip</span><b>${c.cap ? usd(c.cap) : '—'}</b></div>
      <div><span>Fee</span><b>${c.fee}%</b></div>${c.min_views ? `<div><span>Min views</span><b>${num(c.min_views)}</b></div>` : ''}
      <div><span>Checked</span><b>${c.verified_on ? esc(c.verified_on) + (c.age != null ? ` · ${c.age}d ago` : '') : '—'}</b></div>
      <div><span>Clips / posts</span><b>${num(c.clips)} / ${num(c.posts)}</b></div><div><span>Views</span><b>${kfmt(c.views)}</b></div><div><span>Est. net</span><b class="up">${usd(c.net)}</b></div></div>
      ${c.problems.map(p => `<div class="prob">${icon('alert', 13)} ${esc(p)}</div>`).join('')}
      ${c.url && !c.url.includes('TODO') ? `<div style="margin-top:12px"><a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">${icon('ext', 15)}Open campaign</a></div>` : ''}</div>`; }).join('') || '<div class="empty">No campaigns yet.</div>'}</div>`;
  return h;
}

function pageEarnings() {
  const s = D.stats, bp = D.earnings.by_platform, plats = Object.keys(bp);
  let h = `<section class="hero"><div><div class="eyebrow">Earnings · estimate</div><h2>${usd(s.net)} net</h2><p>From public view counts × each campaign's rate, after fees, caps and minimums. Campaigns pay on the views they verify, after their review and hold window, so their numbers are the ones that count.</p></div></section>`;
  h += `<div class="stats">${plats.map(p => stat(p, usd(bp[p].net), `${kfmt(bp[p].views)} views · ${bp[p].posts} posts`)).join('') || stat('No posts yet', '$0.00', '')}</div>`;
  h += `<div class="grid g2"><div class="card"><div class="card-h"><h3>Est. net by post day</h3></div>${bars(D.earnings.daily.map(r => ({ ...r, net: Math.round(r.net * 100) / 100 })), 'net')}</div>
    <div class="card"><div class="card-h"><h3>Top posts</h3></div>${D.earnings.top.length ? `<div class="list">${D.earnings.top.map(t => `<div class="row">${pchip(t.platform)}<div class="grow"><div class="t">${esc(t.title)}</div><div class="s">${kfmt(t.views)} views</div></div><b class="up mono">${usd(t.net)}</b><a class="btn" href="${esc(t.url)}" target="_blank" rel="noopener">${icon('ext', 15)}</a></div>`).join('')}</div>` : '<div class="empty">No posts yet.</div>'}</div></div>`;
  h += `<div class="card"><div class="card-h"><h3>By campaign</h3></div><div class="tw"><table><thead><tr><th>Campaign</th><th class="num">Rate</th><th class="num">Posts</th><th class="num">Views</th><th class="num">Est. net</th><th class="num">Per post</th></tr></thead><tbody>
    ${D.campaigns.filter(c => c.posts).map(c => `<tr><td>${esc(c.name)}</td><td class="num">${usd(c.cpm)}</td><td class="num">${c.posts}</td><td class="num">${kfmt(c.views)}</td><td class="num up">${usd(c.net)}</td><td class="num">${usd(c.net / c.posts)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No posts yet.</td></tr>'}
    </tbody></table></div></div>`;
  return h;
}

function pageJobs() {
  let h = `<section class="hero"><div><div class="eyebrow">Jobs</div><h2>${D.jobs.length} source videos</h2><p>Each imported video and what the pipeline did with it. Temporary errors retry on their own.</p></div></section>`;
  h += `<div class="card"><div class="tw"><table><thead><tr><th>Job</th><th>Video</th><th>Status</th><th class="num">Tries</th><th>Updated</th><th>Note</th></tr></thead><tbody>
    ${D.jobs.map(j => `<tr><td class="mono mut">${j.id}</td><td class="wrap">${esc(j.title || j.input)}</td><td>${sbadge(j.status)}</td><td class="num">${j.attempts}</td><td class="mut">${esc(ago(j.updated))}</td><td class="wrap ${j.last_error ? 'wn' : 'mut'}">${esc(j.last_error || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No jobs yet.</td></tr>'}
    </tbody></table></div></div>`;
  h += `<div class="card"><div class="card-h"><h3>Activity</h3></div><div class="list">${D.events.slice(0, 40).map(e => `<div class="row"><span class="chip ${e.level === 'error' ? 'bad' : e.level === 'warn' ? 'warn' : e.level === 'ok' ? 'good' : ''}">${esc(e.level)}</span><div class="grow"><div class="s" style="white-space:normal;color:var(--ink-2)">${esc(e.message)}</div></div><span class="mut small mono">${esc(ago(e.ts))}</span></div>`).join('') || '<div class="empty">No activity yet.</div>'}</div></div>`;
  return h;
}

function pageSettings() {
  const hosted = /^https?:/.test(location.protocol);
  const acc = store.get('accent', 'indigo'), auto = store.get('auto', true);
  const sw = { indigo: '#6d7cff', teal: '#2fd3c0', gold: '#e9b44c', rose: '#ff6b9a' };
  return `<section class="hero"><div><div class="eyebrow">Settings</div><h2>Make it yours</h2><p>Saved on this device only.</p></div></section>
    <div class="grid g2"><div class="card"><div class="card-h"><h3>Accent</h3></div><div class="seg">${Object.keys(sw).map(k => `<button data-accent="${k}" class="${k === acc ? 'on' : ''}"><span class="swatch" style="background:${sw[k]}"></span>${k}</button>`).join('')}</div>
      <div class="card-h" style="margin-top:18px"><h3>Auto-refresh</h3></div><div class="seg"><button data-auto="1" class="${auto ? 'on' : ''}">every minute</button><button data-auto="0" class="${auto ? '' : 'on'}">off</button></div>
      <div class="note">${hosted ? 'This page reads data.json, which your PC uploads after every autopilot cycle.' : 'This is the copy on your PC; it rebuilds after every autopilot cycle.'}</div></div>
    <div class="card"><div class="card-h"><h3>About this data</h3></div><div class="kv one">
      <div><span>Built</span><b>${esc(ago(D.generated))}</b></div><div><span>Source</span><b>${hosted ? 'published copy' : 'this PC'}</b></div>
      <div><span>Dollar figures</span><b>${D.hide_money ? 'hidden on this copy' : 'shown'}</b></div><div><span>Posting</span><b>${esc(D.autopilot.via)}</b></div></div>
      <div class="note">Earnings are estimates from public view counts. Campaigns pay on the views they verify.</div></div></div>`;
}
const PAGES = { today: pageToday, clips: pageClips, campaigns: pageCampaigns, earnings: pageEarnings, jobs: pageJobs, settings: pageSettings };
function route() {
  const id = (location.hash.replace(/^#\/?/, '') || 'today'); const r = ROUTES.find(x => x.id === id) || ROUTES[0];
  document.getElementById('title').textContent = r.label;
  const link = x => `#/${x.id}`;
  const nav = ROUTES.filter(x => !x.side).map(x => { const b = x.badge ? x.badge() : ''; return `<a href="${link(x)}" class="${x.id === r.id ? 'on' : ''}">${icon(x.ic, 20)}<span>${x.label}</span>${b ? `<i>${b}</i>` : ''}</a>`; }).join('');
  const more = ROUTES.filter(x => x.side).map(x => `<a href="${link(x)}" class="${x.id === r.id ? 'on' : ''}">${icon(x.ic, 20)}<span>${x.label}</span></a>`).join('');
  document.getElementById('nav').innerHTML = `<div class="sec">Engine</div>` + nav + `<div class="sec">App</div>` + more;
  document.getElementById('tabs').innerHTML = ROUTES.filter(x => !x.side || x.id === r.id).slice(0, 5).map(x => `<a href="${link(x)}" class="${x.id === r.id ? 'on' : ''}">${icon(x.ic, 21)}<span>${x.label}</span></a>`).join('');
  const page = document.getElementById('page'); page.innerHTML = (D.preview ? `<div class="card" style="padding:12px 16px"><span class="chip warn">Preview</span> <span class="mut small">Sample data so you can see the layout. Your real numbers appear once your PC runs the autopilot and publishes.</span></div>` : '') + PAGES[r.id](); page.style.animation = 'none'; void page.offsetWidth; page.style.animation = '';
  window.scrollTo(0, 0);
}
function status() {
  const a = D.autopilot, st = document.getElementById('status');
  const err = (a.last && a.last.upload_errors) || 0;
  st.innerHTML = `<span class="dot ${!a.enabled ? 'off' : err ? 'warn' : ''}"></span><span class="lbl">${a.enabled ? (err ? 'check errors' : 'autopilot on') : 'autopilot off'} · ${esc(ago(D.generated))}</span>`;
  document.getElementById('sideRun').textContent = a.enabled ? `On · ${a.via}` : 'Off';
  document.getElementById('sideWhen').textContent = 'Updated ' + ago(D.generated);
}
async function load(manual) {
  if (!/^https?:/.test(location.protocol)) { if (manual) { location.reload(); } return; }  // local file: rebuilt by the PC
  const b = document.getElementById('refresh'); b.classList.add('spin');
  try {
    const r = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const nd = await r.json(), changed = !D || nd.generated !== D.generated;
    D = nd; status();
    if (changed) route();
    if (manual) toast(changed ? 'Updated' : 'Already up to date');
  } catch (e) { if (manual) toast('Offline: showing the last data'); }
  finally { b.classList.remove('spin'); splashDone(); }
}
const SPLASH_T0 = performance.now();
let splashGone = false;
(function splash() {
  const el = document.getElementById('splash');
  let seen = false; try { seen = sessionStorage.getItem('ce.splash') === '1'; sessionStorage.setItem('ce.splash', '1'); } catch (e) { }
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.remove(); splashGone = true; return; }
  const cv = document.getElementById('spCv'), g = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.scale(dpr, dpr);
  const cx = W / 2, cy = H / 2 - 40, cols = ['#6d7cff', '#3ee0c8', '#ff3d7f', '#b18cff', '#ffffff'];
  const Pp = Array.from({ length: Math.min(260, Math.round(W * H / 2600)) }, (_, i) => { const a = Math.random() * Math.PI * 2, r = Math.max(W, H) * (0.55 + Math.random() * 0.5);
    return { a, r, s: 0.8 + Math.random() * 2, c: cols[i % cols.length], d: Math.random() * 0.5 }; });
  const t0 = performance.now();
  (function frame(now) {
    if (splashGone) return;
    const t = (now - t0) / 1000; g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (const p of Pp) {
      const k = Math.min(1, Math.max(0, (t - p.d) / 1.15)), e = 1 - Math.pow(1 - k, 3), rr = p.r * (1 - e) + 74 + Math.sin(t * 2 + p.a * 5) * 6, aa = p.a + e * 2.4 + t * 0.35;
      const x = cx + Math.cos(aa) * rr, y = cy + Math.sin(aa) * rr * (0.55 + 0.45 * (1 - e));
      g.globalAlpha = 0.35 + 0.65 * e; g.fillStyle = p.c; g.beginPath(); g.arc(x, y, p.s * (1 + e * 0.6), 0, 6.283); g.fill();
      g.globalAlpha = 0.18 * e; g.beginPath(); g.arc(x, y, p.s * 4, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1; requestAnimationFrame(frame);
  })(t0);
})();
function splashDone() {
  if (splashGone) return; splashGone = true;
  const el = document.getElementById('splash'); if (!el) return;
  const wait = Math.max(0, 1400 - (performance.now() - SPLASH_T0));
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 650); }, wait);
}
setTimeout(splashDone, 6000);
function boot() {
  window.LOGO_SVG = icon('logo', 22);
  document.getElementById('refresh').innerHTML = icon('refresh', 18);
  document.getElementById('refresh').onclick = () => load(true);
  status();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (b) { clipFilter = b.getAttribute('data-filter'); route(); }
    const ac = e.target.closest('[data-accent]'); if (ac) { store.set('accent', ac.dataset.accent); document.documentElement.dataset.accent = ac.dataset.accent; route(); }
    const au = e.target.closest('[data-auto]'); if (au) { store.set('auto', au.dataset.auto === '1'); route(); }
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  route();
  load(false);
  setInterval(() => { if (!document.hidden && store.get('auto', true)) load(false); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && store.get('auto', true)) load(false); });
  if (!/^https?:/.test(location.protocol)) setTimeout(splashDone, 900);
}
boot();
</script>
</body>
</html>
"""
