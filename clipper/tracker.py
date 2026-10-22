#!/usr/bin/env python3
"""
Earnings tracker for clipping campaigns: logs where each clip was posted,
refreshes view counts, and estimates payouts per campaign so you know which
campaigns to focus on.

  python tracker.py add https://www.tiktok.com/@me/video/123 --campaign campaigns/acme.json --clip clip_01.mp4
  python tracker.py refresh                 # pull live views/likes with yt-dlp
  python tracker.py set <url> --views 48000 # manual update when a site blocks scraping
  python tracker.py report                  # earnings by campaign, platform and clip
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402

DB_DEFAULT = Path("clips") / "earnings.json"


def platform_of(url: str) -> str:
    u = url.lower()
    for key, name in (("tiktok", "tiktok"), ("instagram", "instagram"), ("youtu", "youtube"),
                      ("x.com", "x"), ("twitter", "x"), ("facebook", "facebook")):
        if key in u:
            return name
    return "other"


def load_db(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            backup = path.with_suffix(".corrupt.json")
            path.replace(backup)  # rename fails on Windows when an older backup exists
            print(f"!! earnings file was unreadable; moved to {backup}")
    return {"posts": []}


def save_db(path: Path, db: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(db, indent=2), encoding="utf-8")
    tmp.replace(path)


def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


class _Silent:
    def debug(self, msg): pass
    def info(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass


def fetch_stats(url: str) -> tuple[int | None, int | None]:
    try:
        import yt_dlp
    except Exception:
        return None, None
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True,
                               "extractor_retries": 3, "logger": _Silent()}) as ydl:
            info = ydl.extract_info(url, download=False)
        return info.get("view_count"), info.get("like_count")
    except Exception:
        return None, None


def campaign_for(post: dict) -> dict:
    try:
        return cmp.load(post["campaign_file"])
    except Exception:
        return {"name": post.get("campaign", "?"), "cpm": post.get("cpm", 0), "fee_pct": post.get("fee_pct", 0),
                "max_payout_per_clip": post.get("max_payout_per_clip", 0), "min_payout": 0}


def cmd_add(a, db):
    if any(p["url"] == a.url for p in db["posts"]):
        print("already tracked:", a.url)
        return
    c = cmp.load(a.campaign) if a.campaign else {"name": a.name or "untracked", "cpm": a.cpm or 0, "fee_pct": 0,
                                                  "max_payout_per_clip": 0, "_path": ""}
    post = {"url": a.url, "platform": platform_of(a.url), "campaign": c["name"],
            "campaign_file": c.get("_path", ""), "cpm": c.get("cpm", 0), "fee_pct": c.get("fee_pct", 0),
            "max_payout_per_clip": c.get("max_payout_per_clip", 0), "clip": a.clip or "",
            "posted": now(), "views": a.views or 0, "likes": 0, "updated": now(), "history": []}
    if not a.views:
        v, l = fetch_stats(a.url)
        post["views"], post["likes"] = v or 0, l or 0
    db["posts"].append(post)
    print(f"tracking {post['platform']} post for '{c['name']}' ({post['views']:,} views)")


def cmd_set(a, db):
    for p in db["posts"]:
        if p["url"] == a.url:
            p["history"].append([p["updated"], p["views"]])
            p["views"], p["updated"] = a.views, now()
            print(f"{a.url}: {a.views:,} views")
            return
    print("not tracked yet; use: tracker.py add", a.url)


def cmd_refresh(a, db):
    ok = 0
    for p in db["posts"]:
        v, l = fetch_stats(p["url"])
        if v is None:
            print(f"!! could not read views for {p['url']} (keep it current with: tracker.py set URL --views N)")
            continue
        if v != p["views"]:
            p["history"].append([p["updated"], p["views"]])
        p["views"], p["likes"], p["updated"] = int(v), int(l or p.get("likes", 0)), now()
        ok += 1
    print(f"refreshed {ok}/{len(db['posts'])} posts")


def cmd_report(a, db, db_path: Path):
    posts = db["posts"]
    if not posts:
        print("no posts tracked yet. After posting a clip: tracker.py add <post-url> --campaign <file>")
        return
    by_c: dict[str, dict] = {}
    rows = []
    for p in posts:
        c = campaign_for(p)
        gross, net = cmp.payout(c, int(p.get("views") or 0))
        rows.append((net, p))
        s = by_c.setdefault(p["campaign"], {"posts": 0, "views": 0, "gross": 0.0, "net": 0.0, "plat": {}, "cpm": c.get("cpm", 0)})
        s["posts"] += 1
        s["views"] += int(p.get("views") or 0)
        s["gross"] += gross
        s["net"] += net
        s["plat"][p["platform"]] = s["plat"].get(p["platform"], 0) + int(p.get("views") or 0)

    lines = ["# Clipping earnings", "", f"Updated {now()}", "",
             "| Campaign | CPM | Posts | Views | Est. gross | Est. net | Net per post | Best platform |",
             "|---|---|---|---|---|---|---|---|"]
    tot_v = tot_n = 0.0
    for name, s in sorted(by_c.items(), key=lambda kv: kv[1]["net"] / kv[1]["posts"], reverse=True):
        best = max(s["plat"], key=s["plat"].get) if s["plat"] else "-"
        lines.append(f"| {name} | ${s['cpm']:.2f} | {s['posts']} | {s['views']:,} | ${s['gross']:,.2f} | "
                     f"${s['net']:,.2f} | ${s['net'] / s['posts']:,.2f} | {best} |")
        tot_v += s["views"]
        tot_n += s["net"]
    lines += ["", f"**Total: {int(tot_v):,} views, ~${tot_n:,.2f} net** (estimate; marketplaces only pay "
                  "for views they verify, after their review/hold window)", "", "## Top clips", ""]
    for net, p in sorted(rows, key=lambda r: r[0], reverse=True)[:10]:
        lines.append(f"- ${net:,.2f}: {p['views']:,} views, {p['platform']}, {p['campaign']}, {p['url']}")
    lines += ["", "Put more clips into campaigns with the highest net per post, on the platform that pulls views "
              "for that campaign. Drop campaigns that stay under ~$1 per post after a week."]
    text = "\n".join(lines)
    print(text)
    (db_path.parent / "EARNINGS.md").write_text(text + "\n", encoding="utf-8")


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Track clip posts and estimate campaign payouts.")
    p.add_argument("--db", default=str(DB_DEFAULT), help="earnings file")
    sub = p.add_subparsers(dest="cmd")
    s = sub.add_parser("add", help="track a posted clip")
    s.add_argument("url")
    s.add_argument("--campaign", help="campaign JSON the clip was made for")
    s.add_argument("--clip", help="clip file name")
    s.add_argument("--views", type=int)
    s.add_argument("--cpm", type=float, help="rate per 1,000 views when no campaign file")
    s.add_argument("--name", help="campaign name when no campaign file")
    s = sub.add_parser("set", help="manually set a post's views")
    s.add_argument("url")
    s.add_argument("--views", type=int, required=True)
    sub.add_parser("refresh", help="update views for all posts")
    sub.add_parser("report", help="earnings summary")
    a = p.parse_args(argv)
    if not a.cmd:
        p.print_help()
        return 2
    db_path = Path(a.db).expanduser().resolve()
    db = load_db(db_path)
    if a.cmd == "add":
        cmd_add(a, db)
    elif a.cmd == "set":
        cmd_set(a, db)
    elif a.cmd == "refresh":
        cmd_refresh(a, db)
    elif a.cmd == "report":
        cmd_report(a, db, db_path)
    if a.cmd != "report":
        save_db(db_path, db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
