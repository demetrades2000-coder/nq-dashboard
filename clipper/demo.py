#!/usr/bin/env python3
"""
Build a realistic demo workspace for the dashboard: no network, no real rendering.

  python demo.py <workspace_dir> [--days 30] [--seed 7] [--preview]

It writes 3 campaign briefs, ~45 clips over the last `--days` days with uploads on TikTok, Instagram and
YouTube (long-tail views, 2-6% likes), earnings.json with daily view snapshots, events, autopilot cycles,
jobs (one failed, one waiting to retry), a held clip and two links to submit. Each clip gets a tiny 2 s
placeholder video (ffmpeg testsrc2) so thumbnails work; without ffmpeg the clips simply have no thumbnail.
Then it builds dashboard.html. `--preview` also writes a hosted-style copy (index.html, data.json,
thumbs/...) with the "sample data" banner on into <workspace>/site/.

Output is deterministic for a given seed and day: timestamps are relative to now.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import random
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import campaign as cmp  # noqa: E402
import dashboard  # noqa: E402
import pipeline as pl  # noqa: E402

MARK = ".clipper-demo"

CAMPAIGNS = [
    {"key": "aixfunded", "name": "AiXfunded (prop firm)", "cpm": 6.0, "platforms": ["tiktok", "instagram", "youtube"],
     "automation_allowed": True, "auto": True, "verified_ago": 4, "handle": "aixfunded",
     "notes": "Demo brief: $6 per 1K views on TikTok/Instagram/YouTube, 18+, $2K budget. Rules allow AI-assisted "
              "clipping tools as long as every clip carries #ad and the AiXfunded tag.",
     "videos": ["How I passed a $100K challenge in 9 days | AiXfunded live", "Funded trader Q&A: drawdown rules explained",
                "Why 90% of challenge traders fail (live breakdown)", "Payout day: $14,820 withdrawal walkthrough",
                "Risk management masterclass with the AiXfunded desk"]},
    {"key": "tradever", "name": "Tradever (prop firm)", "cpm": 3.0, "platforms": ["tiktok"],
     "automation_allowed": True, "auto": True, "verified_ago": 2, "handle": "tradever",
     "notes": "Demo brief: Tradever Prop Firm Clipping, $3 per 1K views on TikTok only. Automated clipping allowed.",
     "videos": ["Tradever trading floor stream: NQ open", "The one setup I trade every morning",
                "Scaling plan: from $25K to $400K funded", "Psychology after a losing week"]},
    {"key": "pbblake", "name": "PB Blake (trading creator)", "cpm": 1.25, "platforms": ["tiktok", "instagram", "youtube"],
     "automation_allowed": None, "auto": False, "verified_ago": 12, "handle": "pbblake",
     "notes": "Demo brief: $1.25 per 1K views. Hub rules require a dedicated page; the Don't list hasn't been checked "
              "for an AI/automation ban yet, so this one stays manual.",
     "videos": ["I turned $500 into a funded account (full story)", "Stop trading the first 5 minutes",
                "My exact morning routine as a full time trader", "Reacting to subscriber trades"]},
]

HOOKS = [
    ("Most traders blow their account in week one", "Most traders blow their account in the first week because they size up after one green day."),
    ("The 2% rule that saved my funded account", "The two percent rule is the only reason I still have a funded account."),
    ("Why your stop loss keeps getting hunted", "Your stop loss keeps getting hunted because you put it exactly where everyone else does."),
    ("$14K payout: what it actually took", "This fourteen thousand dollar payout took eleven months of boring, repeatable trades."),
    ("Nobody talks about the drawdown rule", "Nobody talks about the trailing drawdown rule until it ends their challenge."),
    ("Stop revenge trading after a red day", "Stop revenge trading after a red day, here's what I do instead."),
    ("The morning setup I trade every day", "There's one setup I trade every single morning and it takes ten minutes."),
    ("Prop firm vs your own money", "Trading a prop firm account changed how I think about risking my own money."),
    ("I failed 6 challenges before this", "I failed six challenges in a row before I figured out this one mistake."),
    ("Scaling from $25K to $400K", "Scaling from a twenty five thousand dollar account to four hundred thousand is mostly patience."),
    ("The worst time of day to trade NQ", "The worst time of day to trade NQ is the one most beginners love."),
    ("Your strategy isn't the problem", "Your strategy isn't the problem, your position size is."),
    ("How I journal every trade", "Here's how I journal every trade in under two minutes."),
    ("One loss doesn't mean anything", "One loss means nothing, a hundred trades tell you the truth."),
    ("Why I only take two trades a day", "I only take two trades a day and my win rate went up immediately."),
    ("The psychology of a losing week", "A losing week hits your psychology harder than your account."),
    ("What funded traders do differently", "Funded traders do one thing differently and it's not the strategy."),
    ("Don't trade the news like this", "Don't trade the news by guessing the direction before the number."),
    ("The checklist before every entry", "Before every entry I run through the same five point checklist."),
    ("Risk less, make more", "Risking less per trade is how I started making more every month."),
    ("Consistency rule explained in 30 seconds", "The consistency rule explained in thirty seconds so you stop failing it."),
    ("I quit my job to trade, here's the truth", "I quit my job to trade and the first year was nothing like the videos."),
    ("Overtrading is a money leak", "Overtrading is the biggest money leak in your account and it feels productive."),
    ("The first 5 minutes are a trap", "The first five minutes after the open are a trap for impatient traders."),
    ("How to pass a challenge without rushing", "You can pass a challenge without rushing if you stop chasing the target."),
    ("Why I size down on Fridays", "I size down on Fridays because my worst trades all happened then."),
    ("The trade that changed my career", "One trade changed my career and it was a loss."),
    ("Money management beats prediction", "Money management beats prediction every single time."),
    ("Stop copying other traders' entries", "Stop copying other traders' entries without knowing their risk."),
    ("This is what a payout day looks like", "This is what a real payout day looks like, no lambo, just a spreadsheet."),
    ("Your edge needs a sample size", "Your edge means nothing without a sample size of at least a hundred trades."),
    ("Funded in 9 days: the full plan", "I got funded in nine days by doing less, not more."),
    ("When to walk away from the screen", "Knowing when to walk away from the screen is a trading skill."),
    ("The rule I break and regret every time", "There's one rule I break and I regret it every single time."),
    ("Why most strategies stop working", "Most strategies stop working because the trader changes, not the market."),
    ("A boring strategy that pays", "A boring strategy that pays is better than an exciting one that doesn't."),
]

HELD_REASONS = ["score 48 below autopilot minimum 55", "may depend on earlier context: starts with 'so'"]
REASONS = ["strong hook", "money-dense", "specific numbers", "emotional/controversial", "energy spike", "AI pick"]
SOURCES_WEIGHTS = [0.55, 0.3, 0.15]
HOUR_W = [1, 1, 1, 1, 1, 1, 2, 4, 5, 5, 4, 4, 5, 6, 6, 6, 7, 8, 9, 10, 9, 7, 4, 2]


def iso(t: dt.datetime) -> str:
    return t.replace(microsecond=0).isoformat(timespec="seconds")


def make_placeholders(out: Path, n: int) -> list[Path]:
    """Tiny 1080x1920 2 s test videos (different hues) to copy as clip files. Empty list without ffmpeg."""
    ff = shutil.which("ffmpeg")
    if not ff:
        try:
            import clipper as cl
            cl.Tools.setup(False)
            ff = cl.Tools.ffmpeg
        except BaseException:
            return []
    out.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(n):
        p = out / f"base_{i}.mp4"
        if not p.exists():
            try:
                subprocess.run([ff, "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                                "testsrc2=size=1080x1920:rate=30:duration=2", "-vf", f"hue=h={i * 360 // n}",
                                "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(p)],
                               capture_output=True, timeout=60)
            except Exception:
                continue
        if p.exists() and p.stat().st_size:
            made.append(p)
    return made


def views_for(rng: random.Random, platform: str) -> int:
    if rng.random() < 0.05:  # the occasional hit
        return int(math.exp(rng.uniform(math.log(20_000), math.log(180_000))))
    v = math.exp(rng.gauss(math.log(1500), 0.75)) * {"tiktok": 1.3, "instagram": 0.9, "youtube": 0.8}[platform]
    return int(min(max(v, 300), 9000))


def curve(final: int, age_now: float, age: float, tau: float) -> int:
    """Views `age` days after posting, on a saturating curve that reaches `final` at `age_now`."""
    if age <= 0:
        return 0
    return int(final * (1 - math.exp(-age / tau)) / (1 - math.exp(-age_now / tau)))


def build(home: Path, days: int = 30, seed: int = 7) -> pl.WS:
    home = Path(home).expanduser().resolve()
    if home.exists() and any(home.iterdir()) and not (home / MARK).exists():
        raise SystemExit(f"{home} isn't empty and isn't a demo workspace; pick a new folder")
    if (home / MARK).exists():
        shutil.rmtree(home)
    home.mkdir(parents=True, exist_ok=True)
    (home / MARK).write_text("demo workspace built by demo.py\n", encoding="utf-8")
    rng = random.Random(seed)
    now = dt.datetime.now().replace(microsecond=0)
    today = now.date()
    days = max(3, int(days))
    ws = pl.WS(str(home))

    # campaign briefs
    cdir = home / "campaigns"
    cdir.mkdir(exist_ok=True)
    camps = []
    for spec in CAMPAIGNS:
        brief = {
            "name": spec["name"], "marketplace": "whop", "cpm": spec["cpm"], "fee_pct": 10, "max_payout_per_clip": 0,
            "min_payout": 0, "platforms": spec["platforms"], "sources": [f"https://www.youtube.com/@{spec['handle']}"],
            "language": "en",
            "permission": {"program": "Content Rewards",
                           "campaign_url": f"https://whop.com/{spec['handle']}/content-rewards/demo/",
                           "verified_on": (today - dt.timedelta(days=spec["verified_ago"])).isoformat(),
                           "evidence": "Demo: campaign page lists this channel as approved footage.",
                           "allowed_sources": [f"https://www.youtube.com/@{spec['handle']}"]},
            "clip": {"min": 15, "max": 60, "count": 5, "latest": 2, "layout": "auto", "title": True, "jumpcuts": True},
            "caption": {"required_hashtags": [], "required_mentions": [], "required_text": ""},
            "on_screen": {"watermark": "", "highlight": "#FFE600"},
            "disclosure": {"caption": "#ad", "on_screen": "#ad"},
            "notes": spec["notes"], "automation_allowed": spec["automation_allowed"],
            "accounts": {p: spec["handle"] for p in spec["platforms"]},
        }
        f = cdir / f"{spec['key']}.json"
        f.write_text(json.dumps(brief, indent=2), encoding="utf-8")
        camps.append({**spec, "file": str(f.resolve()), "c": cmp.load(str(f))})

    # sources (jobs)
    src_by_camp: dict[str, list] = {}
    start = now - dt.timedelta(days=days)
    span = (now - start).total_seconds()
    for spec in camps:
        for j, title in enumerate(spec["videos"]):
            t = start + dt.timedelta(seconds=span * (j + rng.random() * 0.6) / len(spec["videos"]) * 0.92)
            vid = f"{spec['handle'][:3]}{rng.randrange(10**7, 10**8)}"
            sid = ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, title, uploader, status, attempts, "
                       "created, updated) VALUES(?,?,?,?,?,?,?,?,?,?)",
                       (spec["name"], spec["file"], f"https://www.youtube.com/watch?v={vid}", f"yt:{vid}", title,
                        spec["handle"], "done", 1, iso(t), iso(t + dt.timedelta(minutes=rng.randint(6, 25)))))
            src_by_camp.setdefault(spec["name"], []).append((sid, t, title))
    extra = [(camps[0], "failed", 4, "yt-dlp: HTTP Error 403: Forbidden (video is members-only)", None),
             (camps[1], "retry_wait", 2, "temporary: connection reset while downloading",
              iso(now + dt.timedelta(minutes=25))),
             (camps[0], "queued", 0, None, None)]
    for k, (spec, status, attempts, err, nxt) in enumerate(extra):
        vid = f"x{rng.randrange(10**7, 10**8)}"
        t = now - dt.timedelta(hours=30 - k * 12)
        ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, title, uploader, status, attempts, "
             "next_attempt_at, last_error, created, updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
             (spec["name"], spec["file"], f"https://www.youtube.com/watch?v={vid}", f"yt:{vid}",
              ["Live: trading the CPI print", "Funded trader roundtable", "Weekly market recap"][k], spec["handle"],
              status, attempts, nxt, err, iso(t), iso(t + dt.timedelta(minutes=9))))

    # clips
    bases = make_placeholders(home / ".demo_media", 8)
    n_clips = 45
    times = sorted(start + dt.timedelta(seconds=span * (0.03 + 0.96 * rng.random())) for _ in range(n_clips))
    times[-1] = now - dt.timedelta(hours=3)  # something fresh
    hooks = HOOKS[:]
    rng.shuffle(hooks)
    statuses = ["posted"] * n_clips
    statuses[-1], statuses[-2], statuses[-3] = "approved", "pending_review", "posted"
    statuses[-4] = "approved"  # approved, waiting for the next cycle's upload slot
    statuses[-5] = "pending_review"
    statuses[-7] = "rejected"
    statuses[-12] = "rejected"
    statuses[-9] = "render_failed"
    held_i = 0
    clip_rows = []
    for i, t in enumerate(times):
        spec = rng.choices(camps, SOURCES_WEIGHTS)[0]
        srcs = [s for s in src_by_camp[spec["name"]] if s[1] <= t] or src_by_camp[spec["name"]][:1]
        sid, _, stitle = srcs[-1]
        title, hook = hooks[i % len(hooks)]
        if i >= len(hooks):
            title += rng.choice([" (part 2)", " | full breakdown", " (live)"])
        dur = rng.choice([rng.uniform(12, 20), rng.uniform(20, 30), rng.uniform(30, 45), rng.uniform(30, 45),
                          rng.uniform(45, 60), rng.uniform(60, 75)])
        s0 = round(rng.uniform(30, 3200), 1)
        status = statuses[i]
        score = round(rng.uniform(56, 92), 1) if status != "pending_review" else round(rng.uniform(44, 62), 1)
        held = None
        flags = []
        if status == "pending_review":
            held = HELD_REASONS[held_i % len(HELD_REASONS)]
            held_i += 1
            if "context" in held:
                flags.append({"level": "warn", "msg": "may depend on earlier context: starts with 'so'"})
        if rng.random() < 0.2:
            flags.append({"level": "warn", "msg": "contains an earnings or results claim. Keep it attributed to the "
                                                  "speaker; don't caption it as typical or guaranteed."})
        text = hook + " " + rng.choice(["Here's exactly what I mean.", "Let me show you on the chart.",
                                        "And it took me years to learn that.", "Most people never hear this."])
        caption = f"{hook} #ad #trading #propfirm #{spec['handle']}"
        rank = rng.randint(1, 5)
        f = None
        if status != "render_failed" and bases and i >= 3:
            f = home / "clips" / cmp.slug(spec["c"]) / str(sid) / f"clip_{rank:02d}_{i}.mp4"
            f.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(bases[i % len(bases)], f)
        reasons = rng.sample(REASONS[:5], rng.randint(1, 3)) + (["AI pick"] if rng.random() < 0.15 else [])
        checks = [{"ok": True, "check": f"length {dur:.0f}s within 15-60s"}, {"ok": True, "check": "no banned claims"},
                  {"ok": True, "check": "caption disclosure '#ad'"}]
        cid = ws.x("INSERT INTO clips(source_id, campaign, rank, start, end_, title, caption, hashtags, posts, checks, flags,"
                   " words, text, score, file, status, created, held_reason, reasons, reviewed_at) "
                   "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                   (sid, spec["name"], rank, s0, round(s0 + dur, 1), title, caption,
                    json.dumps(["#trading", "#propfirm"]), "{}", json.dumps(checks), json.dumps(flags), "[]", text, score,
                    str(f) if f else None, status, iso(t), held, json.dumps(reasons),
                    iso(t + dt.timedelta(minutes=40)) if status in ("approved", "posted", "rejected") else None))
        clip_rows.append({"id": cid, "t": t, "spec": spec, "status": status, "title": title, "caption": caption,
                          "file": f})

    # uploads + earnings.json
    posts = []
    live = []
    for c in clip_rows:
        if c["status"] != "posted":
            continue
        spec = c["spec"]
        plats = spec["platforms"] if spec["key"] != "pbblake" else rng.sample(spec["platforms"], rng.randint(1, 2))
        for p in plats:
            hour = rng.choices(range(24), HOUR_W)[0]
            ut = c["t"].replace(hour=hour, minute=rng.randint(0, 59), second=rng.randint(0, 59))
            if ut < c["t"]:
                ut += dt.timedelta(days=1)
            if ut > now - dt.timedelta(minutes=20):
                ut = c["t"] + dt.timedelta(minutes=rng.randint(15, 90))
            if ut > now:
                ut = now - dt.timedelta(minutes=5)
            age_now = max((now - ut).total_seconds() / 86400, 0.01)
            final = views_for(rng, p)
            final = int(final * min(1.0, 0.25 + age_now / 3))  # brand-new posts haven't caught up yet
            likes = int(final * rng.uniform(0.02, 0.06))
            rid = str(rng.randrange(10**17, 10**18))
            url = {"tiktok": f"https://www.tiktok.com/@{spec['handle']}/video/{rid}",
                   "instagram": f"https://www.instagram.com/reel/{rid[:11]}/",
                   "youtube": f"https://youtube.com/shorts/{rid[:11]}"}[p]
            uid = ws.x("INSERT INTO uploads(clip_id, platform, account, remote_id, url, state, notes, caption, views, "
                       "likes, submitted_at, created, updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                       (c["id"], p, spec["handle"], rid, url, "live", "[]", c["caption"], final, likes,
                        iso(ut + dt.timedelta(hours=rng.randint(1, 10))), iso(ut), iso(now - dt.timedelta(minutes=30))))
            live.append((ut, uid, c))
            tau = rng.uniform(0.8, 3.0)
            hist = []
            k = 0.25
            while k < age_now - 0.05:
                hist.append([iso(ut + dt.timedelta(days=k)), curve(final, age_now, k, tau)])
                k = k + 1 if k >= 1 else 1.0
            posts.append({"url": url, "platform": p, "campaign": spec["name"], "campaign_file": spec["file"],
                          "cpm": spec["cpm"], "fee_pct": 10, "max_payout_per_clip": 0,
                          "clip": Path(c["file"]).name if c["file"] else "", "posted": iso(ut), "views": final,
                          "likes": likes, "updated": iso(now - dt.timedelta(minutes=30)), "history": hist})
    live.sort(key=lambda x: x[0])
    for ut, uid, c in live[-2:]:  # two fresh links still to submit
        ws.x("UPDATE uploads SET submitted_at=NULL WHERE id=?", (uid,))
    ws.x("UPDATE clips SET submitted_at=(SELECT MAX(submitted_at) FROM uploads u WHERE u.clip_id=clips.id), "
         "posted_at=(SELECT MIN(created) FROM uploads u WHERE u.clip_id=clips.id) WHERE status='posted' AND NOT EXISTS("
         "SELECT 1 FROM uploads u WHERE u.clip_id=clips.id AND u.submitted_at IS NULL)")
    ws.x("UPDATE clips SET posted_at=(SELECT MIN(created) FROM uploads u WHERE u.clip_id=clips.id) WHERE status='posted'")
    # the newest clip: a TikTok draft waiting in the inbox and a failed Instagram upload (the cycle marks it posted)
    newest = clip_rows[-1] if clip_rows[-1]["status"] == "approved" else None
    if newest:
        ws.x("UPDATE clips SET status='posted', posted_at=? WHERE id=?", (iso(now - dt.timedelta(hours=2)), newest["id"]))
        ws.x("INSERT INTO uploads(clip_id, platform, account, state, notes, caption, publish_id, created, updated) "
             "VALUES(?,?,?,?,?,?,?,?,?)", (newest["id"], "tiktok", newest["spec"]["handle"], "draft", "[]",
                                           newest["caption"], "pub_demo_1", iso(now - dt.timedelta(hours=2)),
                                           iso(now - dt.timedelta(hours=2))))
        ws.x("INSERT INTO uploads(clip_id, platform, account, state, notes, caption, created, updated) "
             "VALUES(?,?,?,?,?,?,?,?)", (newest["id"], "instagram", newest["spec"]["handle"], "failed",
                                         json.dumps(["Instagram: media processing timed out"]), newest["caption"],
                                         iso(now - dt.timedelta(hours=2)), iso(now - dt.timedelta(hours=2))))
    tracker_db = {"posts": posts}
    (home / "earnings.json").write_text(json.dumps(tracker_db, indent=2), encoding="utf-8")

    # events (chronological so the newest has the highest id)
    ev = []
    for spec in camps:
        for sid, t, title in src_by_camp[spec["name"]]:
            ev.append((t + dt.timedelta(minutes=2), "info", sid, None, f"job #{sid}: imported '{title[:50]}'"))
            ev.append((t + dt.timedelta(minutes=20), "ok", sid, None, f"job #{sid}: {rng.randint(3, 5)}/5 clips ready for review"))
    for ut, uid, c in live:
        ev.append((ut, "ok", None, c["id"], f"clip #{c['id']} uploaded to {ws.q('SELECT platform FROM uploads WHERE id=?', (uid,))[0]['platform']}"))
    ev.append((now - dt.timedelta(hours=18), "error", None, None, "job: yt-dlp: HTTP Error 403: Forbidden (video is members-only)"))
    ev.append((now - dt.timedelta(hours=6), "warn", None, None, "job: temporary: connection reset while downloading; retrying in 30 min"))
    ev.append((now - dt.timedelta(hours=2), "warn", None, newest["id"] if newest else None,
               "instagram upload failed: media processing timed out"))
    for t, level, sid, cid, msg in sorted(ev, key=lambda e: e[0]):
        ws.x("INSERT INTO events(ts, level, source_id, clip_id, message) VALUES(?,?,?,?,?)", (iso(t), level, sid, cid, msg))

    # autopilot cycles: every 6 h over the last 3 days, the last one ~2 h ago
    every = 6
    log = home / "logs" / "autopilot.jsonl"
    with log.open("w", encoding="utf-8") as fh:
        for k in range(11, -1, -1):
            st = now - dt.timedelta(hours=2 + every * k, minutes=rng.randint(5, 14))
            fin = st + dt.timedelta(minutes=rng.randint(6, 22))
            up = [f"#{c['id']} {p}" for ut, uid, c in live if st <= ut <= fin + dt.timedelta(hours=every)
                  for p in [ws.q('SELECT platform FROM uploads WHERE id=?', (uid,))[0]['platform']]][:3]
            rep = {"started": iso(st), "skipped_campaigns": ["PB Blake (trading creator): rules don't allow automated "
                                                             "clipping tools (or it isn't confirmed)"],
                   "approved": [u.split()[0] for u in up], "held": [], "uploaded": up, "upload_errors": [],
                   "notes": [], "finished": iso(fin)}
            if k == 0:
                rep["held"] = [f"#{c['id']} {c['title'][:60]}" for c in clip_rows if c["status"] == "pending_review"][:1]
                rep["upload_errors"] = ["instagram #%d: media processing timed out" % newest["id"]] if newest else []
                rep["notes"] = ["TikTok draft sent to your inbox: finish it in the app",
                                "views refreshed for %d posts" % len(posts)]
            fh.write(json.dumps(rep) + "\n")

    # settings + a little AI spend
    for k, v in {"autopilot.enabled": True, "autopilot.enabled_at": iso(start), "autopilot.via": "free",
                 "autopilot.platforms": ["tiktok", "instagram", "youtube"], "autopilot.max_uploads_per_day": 3,
                 "autopilot.min_score": 55, "autopilot.privacy": "public", "autopilot.every_hours": every,
                 "autopilot.campaigns": [c["file"] for c in camps if c["auto"]], "spend.monthly_cap_usd": 5.0,
                 "dashboard.goal_month_usd": 300}.items():
        ws.set_setting(k, v)
    for k in range(6):
        t = now - dt.timedelta(days=k * 3, hours=rng.randint(0, 20))
        if t.month == now.month:
            ws.x("INSERT INTO spend(ts, model, tokens_in, tokens_out, usd, purpose) VALUES(?,?,?,?,?,?)",
                 (iso(t), "claude-haiku", 9000, 600, round(rng.uniform(0.01, 0.05), 4), "rank"))
    return ws


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Build a demo clipper workspace for the dashboard.")
    ap.add_argument("workspace", help="folder to create (must be new/empty, or a previous demo)")
    ap.add_argument("--days", type=int, default=30, help="how many days of history (default 30)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--preview", action="store_true",
                    help="also write a hosted-style copy with the sample-data banner into <workspace>/site/")
    a = ap.parse_args(argv)
    ws = build(Path(a.workspace), a.days, a.seed)
    try:
        out = dashboard.write(ws)
        print(f"Demo workspace: {ws.home}\nDashboard: {out}")
        if a.preview:
            data = dashboard.build_data(ws)
            data["preview"] = True
            site = ws.home / "site"
            for rel, body in dashboard.site_files(data, ws).items():
                dest = site / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(body)
            print(f"Preview site: {site / 'index.html'}")
    finally:
        ws.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
