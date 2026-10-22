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
    return _page().replace("/*__DATA__*/null", payload)


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


PAGE_FILE = Path(__file__).resolve().parent / "dashboard_page.html"


def _page() -> str:
    return PAGE_FILE.read_text(encoding="utf-8")

