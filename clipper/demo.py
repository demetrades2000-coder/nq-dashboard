#!/usr/bin/env python3
"""
Build a realistic demo workspace for the dashboard: no network, no real rendering.

  python demo.py <workspace_dir> [--days 30] [--seed 7] [--preview]

It writes 3 campaign briefs, ~50 clips over the last `--days` days with uploads on TikTok, Instagram and
YouTube (long-tail views, 2-6% likes), earnings.json with daily view snapshots, events, autopilot cycles,
jobs (one failed, one waiting to retry), a held clip and two links to submit. The Tradever brief is TikTok only
with its rules (tags at the caption end, logo, 5 posts a week, 2% engagement, $7 minimum payout) and posts to two
rotating TikTok accounts (tradever.clips at today's cap, tradever.daily with room), with photo slideshows among its
posts and three approved clips waiting for a slot. Each clip gets a tiny 2 s
placeholder video (an ffmpeg gradient) so thumbnails work; without ffmpeg the clips simply have no thumbnail.
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
PALETTE = ["0x6d7cff", "0x3ee0c8", "0xb18cff", "0xf2a25b", "0xff5f8a", "0x2fb3e3"]  # placeholder video tints

CAMPAIGNS = [
    {"key": "aixfunded", "name": "AiXfunded (prop firm)", "cpm": 6.0, "platforms": ["tiktok", "instagram", "youtube"],
     "automation_allowed": True, "auto": True, "verified_ago": 4, "handle": "aixfunded",
     "notes": "Demo brief: $6 per 1K views on TikTok/Instagram/YouTube, 18+, $2K budget. Rules allow AI-assisted "
              "clipping tools as long as every clip carries #ad and the AiXfunded tag.",
     "videos": ["How I passed a $100K challenge in 9 days | AiXfunded live", "Funded trader Q&A: drawdown rules explained",
                "Why 90% of challenge traders fail (live breakdown)", "Payout day: $14,820 withdrawal walkthrough",
                "Risk management masterclass with the AiXfunded desk"]},
    {"key": "tradever", "name": "Tradever (prop firm)", "cpm": 5.0, "platforms": ["tiktok"],
     "automation_allowed": True, "auto": True, "verified_ago": 2, "handle": "tradever",
     "accounts": ["tradever.clips", "tradever.daily"], "slideshows": 0.35,
     "brief": {"min_payout": 7, "max_payout_per_clip": 500, "posts_per_week": 5, "min_engagement": 0.02,
               "caption": {"required_hashtags": [], "required_mentions": ["@tradeverfunding", "@laythbanks"],
                           "mentions_last": True, "required_text": ""},
               "on_screen": {"watermark": "", "highlight": "#FFE600", "logo": "logos/tradever.png",
                             "logo_position": "top", "logo_width": 1000},
               "clip_min": 7},
     "notes": "Demo brief: Tradever Prop Firm Clipping, $5 per 1K views on TikTok only, min payout $7 a clip (~1,400 "
              "views), max $500 a clip. Two TikTok pages with Tradever in the name, one clip per page (never the same "
              "clip twice), logo visible throughout, captions end with @tradeverfunding @laythbanks, 5+ posts a week, "
              "2%+ engagement. Automated clipping allowed; photo slideshows are a priority format.",
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
    """Tiny 1080x1920 2 s placeholder videos (gradients in different tints) to copy as clip files. Empty list without ffmpeg."""
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
            # dark-to-accent gradient in the dashboard palette; old ffmpeg builds without `gradients` get testsrc2
            c1 = PALETTE[i % len(PALETTE)]
            for src, vf in ((f"gradients=s=1080x1920:d=2:r=30:nb_colors=2:c0=0x07080c:c1={c1}:x0=540:y0=0:x1=540:y1=1920"
                             f":speed=0.0001:seed={i}", "vignette=PI/5"),
                            ("testsrc2=size=1080x1920:rate=30:duration=2", f"hue=h={i * 360 // n}")):
                try:
                    subprocess.run([ff, "-y", "-loglevel", "error", "-f", "lavfi", "-i", src, "-vf", vf,
                                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(p)],
                                   capture_output=True, timeout=60)
                except Exception:
                    pass
                if p.exists() and p.stat().st_size:
                    break
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


def make_slides(out: Path, bases: list[Path], n: int = 6) -> list[Path]:
    """A handful of 1080x1920 JPEG 'slides' (frames of the placeholder videos in other tints) for demo slideshows."""
    ff = shutil.which("ffmpeg")
    if not ff or not bases:
        return []
    out.mkdir(parents=True, exist_ok=True)
    made = []
    for i in range(n):
        p = out / f"slide_{i}.jpg"
        if not p.exists():
            try:
                subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(bases[i % len(bases)]), "-frames:v", "1",
                                "-vf", f"hue=h={i * 47}:s=1.4", "-q:v", "5", "-update", "1", str(p)], capture_output=True, timeout=60)
            except Exception:
                pass
        if p.exists() and p.stat().st_size:
            made.append(p)
    return made


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
    midnight = dt.datetime.combine(today, dt.time())
    days = max(3, int(days))
    ws = pl.WS(str(home))
    if "kind" not in {r[1] for r in ws.q("PRAGMA table_info(clips)")}:  # 'video' or 'slideshow' (TikTok photo carousel)
        ws.x("ALTER TABLE clips ADD COLUMN kind TEXT DEFAULT 'video'")

    # campaign briefs (Tradever: TikTok only, two accounts, the brief's rules, its logo file)
    cdir = home / "campaigns"
    cdir.mkdir(exist_ok=True)
    camps = []
    for spec in CAMPAIGNS:
        extra = spec.get("brief") or {}
        brief = {
            "name": spec["name"], "marketplace": "whop", "cpm": spec["cpm"], "fee_pct": 10,
            "max_payout_per_clip": extra.get("max_payout_per_clip", 0), "min_payout": extra.get("min_payout", 0),
            "platforms": spec["platforms"], "sources": [f"https://www.youtube.com/@{spec['handle']}"],
            "language": "en",
            "permission": {"program": "Content Rewards",
                           "campaign_url": f"https://whop.com/{spec['handle']}/content-rewards/demo/",
                           "verified_on": (today - dt.timedelta(days=spec["verified_ago"])).isoformat(),
                           "evidence": "Demo: campaign page lists this channel as approved footage.",
                           "allowed_sources": [f"https://www.youtube.com/@{spec['handle']}"]},
            "clip": {"min": extra.get("clip_min", 15), "max": 60, "count": 5, "latest": 2, "layout": "auto", "title": True,
                     "jumpcuts": True},
            "caption": extra.get("caption") or {"required_hashtags": [], "required_mentions": [], "required_text": ""},
            "on_screen": extra.get("on_screen") or {"watermark": "", "highlight": "#FFE600"},
            "disclosure": {"caption": "#ad", "on_screen": "#ad"},
            "notes": spec["notes"], "automation_allowed": spec["automation_allowed"],
            "accounts": {p: (spec.get("accounts") or spec["handle"]) for p in spec["platforms"]},
        }
        for k in ("posts_per_week", "min_engagement"):
            if k in extra:
                brief[k] = extra[k]
        logo = (brief["on_screen"] or {}).get("logo")
        if logo:
            (cdir / logo).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(Path(__file__).resolve().parent / "site_assets" / "icon-192.png", cdir / logo)
        f = cdir / f"{spec['key']}.json"
        f.write_text(json.dumps(brief, indent=2), encoding="utf-8")
        camps.append({**spec, "file": str(f.resolve()), "c": cmp.load(str(f))})
    trad = next(c for c in camps if c["key"] == "tradever")

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
    extra_jobs = [(camps[0], "failed", 4, "yt-dlp: HTTP Error 403: Forbidden (video is members-only)", None),
                  (camps[1], "retry_wait", 2, "temporary: connection reset while downloading",
                   iso(now + dt.timedelta(minutes=25))),
                  (camps[0], "queued", 0, None, None)]
    for k, (spec, status, attempts, err, nxt) in enumerate(extra_jobs):
        vid = f"x{rng.randrange(10**7, 10**8)}"
        t = now - dt.timedelta(hours=30 - k * 12)
        ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, title, uploader, status, attempts, "
             "next_attempt_at, last_error, created, updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
             (spec["name"], spec["file"], f"https://www.youtube.com/watch?v={vid}", f"yt:{vid}",
              ["Live: trading the CPI print", "Funded trader roundtable", "Weekly market recap"][k], spec["handle"],
              status, attempts, nxt, err, iso(t), iso(t + dt.timedelta(minutes=9))))

    bases = make_placeholders(home / ".demo_media", 8)
    slides = make_slides(home / ".demo_media" / "slides", bases)
    hooks = HOOKS[:]
    rng.shuffle(hooks)
    clip_rows = []

    def add_clip(t, spec, status, kind="video", held=None, flags=None, n_files=True):
        i = len(clip_rows)
        srcs = [s for s in src_by_camp[spec["name"]] if s[1] <= t] or src_by_camp[spec["name"]][:1]
        sid, _, _ = srcs[-1]
        title, hook = hooks[i % len(hooks)]
        if i >= len(hooks):
            title += [" (part 2)", " | full breakdown", " (live)", " (recap)"][(i // len(hooks) + i) % 4]
        cmin = float(spec["c"]["clip"].get("min") or 0)
        if kind == "slideshow":
            dur = float(rng.choice([5, 6, 7]) * 3)   # 5-7 slides, ~3 s each
        else:
            dur = max(cmin, rng.choice([rng.uniform(12, 20), rng.uniform(20, 30), rng.uniform(30, 45), rng.uniform(30, 45),
                                        rng.uniform(45, 60), rng.uniform(60, 75)]))
        s0 = round(rng.uniform(30, 3200), 1)
        score = round(rng.uniform(56, 92), 1) if status != "pending_review" else round(rng.uniform(44, 62), 1)
        flags = list(flags or [])
        if rng.random() < 0.2:
            flags.append({"level": "warn", "msg": "contains an earnings or results claim. Keep it attributed to the "
                                                  "speaker; don't caption it as typical or guaranteed."})
        text = hook + " " + rng.choice(["Here's exactly what I mean.", "Let me show you on the chart.",
                                        "And it took me years to learn that.", "Most people never hear this."])
        mentions = cmp.mentions_for(spec["c"], spec["platforms"][0])
        caption = f"{hook} #ad #trading #propfirm" + (" " + " ".join(mentions) if mentions else f" #{spec['handle']}")
        rank = rng.randint(1, 5)
        f = None
        if status != "render_failed" and bases and i >= 3 and n_files:
            folder = home / "clips" / cmp.slug(spec["c"]) / str(sid)
            folder.mkdir(parents=True, exist_ok=True)
            if kind == "slideshow" and slides:
                f = folder / f"slideshow_{rank:02d}_{i}"
                f.mkdir(exist_ok=True)
                for k in range(int(dur // 3)):
                    shutil.copyfile(slides[(i + k) % len(slides)], f / f"{k + 1:02d}.jpg")
            else:
                f = folder / f"clip_{rank:02d}_{i}.mp4"
                shutil.copyfile(bases[i % len(bases)], f)
        reasons = rng.sample(REASONS[:5], rng.randint(1, 3)) + (["AI pick"] if rng.random() < 0.15 else [])
        checks = [{"ok": True, "check": f"length {dur:.0f}s within {cmin:.0f}-60s"}, {"ok": True, "check": "no banned claims"},
                  {"ok": True, "check": "caption disclosure '#ad'"}]
        cid = ws.x("INSERT INTO clips(source_id, campaign, rank, start, end_, title, caption, hashtags, posts, checks, flags,"
                   " words, text, score, file, status, created, held_reason, reasons, reviewed_at, kind) "
                   "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                   (sid, spec["name"], rank, s0, round(s0 + dur, 1), title, caption,
                    json.dumps(["#trading", "#propfirm"]), "{}", json.dumps(checks), json.dumps(flags), "[]", text, score,
                    str(f) if f else None, status, iso(t), held, json.dumps(reasons),
                    iso(t + dt.timedelta(minutes=40)) if status in ("approved", "posted", "rejected") else None, kind))
        row = {"id": cid, "t": t, "spec": spec, "status": status, "title": title, "caption": caption, "file": f,
               "kind": kind}
        clip_rows.append(row)
        return row

    # clips
    n_clips = 45
    times = sorted(start + dt.timedelta(seconds=span * (0.03 + 0.96 * rng.random())) for _ in range(n_clips))
    times[-1] = now - dt.timedelta(hours=3)  # something fresh
    statuses = ["posted"] * n_clips
    statuses[-1], statuses[-2], statuses[-3] = "approved", "pending_review", "posted"
    statuses[-4] = "approved"  # approved, waiting for the next cycle's upload slot
    statuses[-5] = "pending_review"
    statuses[-7] = "rejected"
    statuses[-12] = "rejected"
    statuses[-9] = "render_failed"
    held_i = 0
    for i, t in enumerate(times):
        spec = rng.choices(camps, SOURCES_WEIGHTS)[0]
        status = statuses[i]
        held, flags = None, []
        if status == "pending_review":
            held = HELD_REASONS[held_i % len(HELD_REASONS)]
            held_i += 1
            if "context" in held:
                flags.append({"level": "warn", "msg": "may depend on earlier context: starts with 'so'"})
        kind = "slideshow" if status in ("posted", "approved") and rng.random() < spec.get("slideshows", 0) else "video"
        add_clip(t, spec, status, kind, held, flags)

    # uploads + earnings.json. A campaign with several accounts on a platform rotates: each clip goes to exactly one,
    # the one with the most room under the day's cap, then the fewest posts (the autopilot's rule).
    cap = 3
    day_n: dict[tuple, int] = {}
    tot_n: dict[tuple, int] = {}
    posts, live = [], []

    def pick_account(spec, p, ut):
        names = spec.get("accounts") or [spec["handle"]]
        a = sorted(names, key=lambda n: (-(cap - day_n.get((p, n, ut.date()), 0)), tot_n.get((p, n), 0), n))[0]
        day_n[(p, a, ut.date())] = day_n.get((p, a, ut.date()), 0) + 1
        tot_n[(p, a)] = tot_n.get((p, a), 0) + 1
        return a

    def add_upload(c, p, ut, account=None):
        spec = c["spec"]
        acct = account or pick_account(spec, p, ut)
        if account:
            day_n[(p, acct, ut.date())] = day_n.get((p, acct, ut.date()), 0) + 1
            tot_n[(p, acct)] = tot_n.get((p, acct), 0) + 1
        age_now = max((now - ut).total_seconds() / 86400, 0.01)
        final = views_for(rng, p) * (1.15 if c["kind"] == "slideshow" else 1.0)
        final = int(final * min(1.0, 0.25 + age_now / 3))  # brand-new posts haven't caught up yet
        likes = int(final * rng.uniform(0.02, 0.06))
        rid = str(rng.randrange(10**17, 10**18))
        url = {"tiktok": f"https://www.tiktok.com/@{acct}/{'photo' if c['kind'] == 'slideshow' else 'video'}/{rid}",
               "instagram": f"https://www.instagram.com/reel/{rid[:11]}/",
               "youtube": f"https://youtube.com/shorts/{rid[:11]}"}[p]
        uid = ws.x("INSERT INTO uploads(clip_id, platform, account, remote_id, url, state, notes, caption, views, "
                   "likes, submitted_at, created, updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                   (c["id"], p, acct, rid, url, "live", "[]", c["caption"], final, likes,
                    iso(ut + dt.timedelta(hours=rng.randint(1, 10))), iso(ut), iso(now - dt.timedelta(minutes=30))))
        live.append((ut, uid, c, p, acct))
        tau = rng.uniform(0.8, 3.0)
        hist = []
        k = 0.25
        while k < age_now - 0.05:
            hist.append([iso(ut + dt.timedelta(days=k)), curve(final, age_now, k, tau)])
            k = k + 1 if k >= 1 else 1.0
        posts.append({"url": url, "platform": p, "campaign": spec["name"], "campaign_file": spec["file"],
                      "cpm": spec["cpm"], "fee_pct": 10, "max_payout_per_clip": spec["c"].get("max_payout_per_clip", 0),
                      "clip": Path(c["file"]).name if c["file"] else "", "posted": iso(ut), "views": final,
                      "likes": likes, "updated": iso(now - dt.timedelta(minutes=30)), "history": hist})

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
            add_upload(c, p, ut)

    # Tradever today: one page at its daily cap, the other with room left; three approved clips wait for a slot
    def today_at(k):   # earlier today, never in the future and never yesterday (also just after midnight)
        t = now - dt.timedelta(minutes=25 + 50 * k)
        return t if t >= midnight else midnight + (now - midnight) * max(0.05, 0.9 - 0.15 * k)
    k = 0
    for acct, want in (("tradever.clips", cap), ("tradever.daily", 1)):
        while day_n.get(("tiktok", acct, today), 0) < want:
            t = today_at(k)
            c = add_clip(t - dt.timedelta(minutes=30), trad, "posted", "slideshow" if k % 2 else "video")
            add_upload(c, "tiktok", t, account=acct)
            k += 1
    for j, kind in enumerate(("video", "slideshow", "video")):
        add_clip(now - dt.timedelta(minutes=40 + 25 * j), trad, "approved", kind)

    live.sort(key=lambda x: x[0])
    for ut, uid, c, p, acct in live[-2:]:  # two fresh links still to submit
        ws.x("UPDATE uploads SET submitted_at=NULL WHERE id=?", (uid,))
    ws.x("UPDATE clips SET submitted_at=(SELECT MAX(submitted_at) FROM uploads u WHERE u.clip_id=clips.id), "
         "posted_at=(SELECT MIN(created) FROM uploads u WHERE u.clip_id=clips.id) WHERE status='posted' AND NOT EXISTS("
         "SELECT 1 FROM uploads u WHERE u.clip_id=clips.id AND u.submitted_at IS NULL)")
    ws.x("UPDATE clips SET posted_at=(SELECT MIN(created) FROM uploads u WHERE u.clip_id=clips.id) WHERE status='posted'")
    # the newest regular clip: a TikTok draft waiting in the inbox and, when its campaign posts there, a failed Instagram
    # upload (the cycle marks it posted)
    newest = next((c for c in reversed(clip_rows[:n_clips]) if c["status"] == "approved"), None)
    newest = newest if newest is clip_rows[n_clips - 1] else None
    if newest:
        nacct = (newest["spec"].get("accounts") or [newest["spec"]["handle"]])[-1]
        ws.x("UPDATE clips SET status='posted', posted_at=? WHERE id=?", (iso(now - dt.timedelta(hours=2)), newest["id"]))
        ws.x("INSERT INTO uploads(clip_id, platform, account, state, notes, caption, publish_id, created, updated) "
             "VALUES(?,?,?,?,?,?,?,?,?)", (newest["id"], "tiktok", nacct, "draft", "[]",
                                           newest["caption"], "pub_demo_1", iso(now - dt.timedelta(hours=2)),
                                           iso(now - dt.timedelta(hours=2))))
        if "instagram" in newest["spec"]["platforms"]:
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
    for ut, uid, c, p, acct in live:
        what = "slideshow" if c["kind"] == "slideshow" else "clip"
        ev.append((ut, "ok", None, c["id"], f"{what} #{c['id']} uploaded to {p} ({acct})"))
    ev.append((now - dt.timedelta(hours=18), "error", None, None, "job: yt-dlp: HTTP Error 403: Forbidden (video is members-only)"))
    ev.append((now - dt.timedelta(hours=6), "warn", None, None, "job: temporary: connection reset while downloading; retrying in 30 min"))
    if newest and "instagram" in newest["spec"]["platforms"]:
        ev.append((now - dt.timedelta(hours=2), "warn", None, newest["id"],
                   "instagram upload failed: media processing timed out"))
    ev.append((now - dt.timedelta(minutes=90), "info", None, None,
               f"tiktok/tradever.clips: daily upload cap ({cap}) reached; next clips go to tradever.daily"))
    for t, level, sid, cid, msg in sorted(ev, key=lambda e: e[0]):
        ws.x("INSERT INTO events(ts, level, source_id, clip_id, message) VALUES(?,?,?,?,?)", (iso(t), level, sid, cid, msg))

    # autopilot cycles: every 6 h over the last 3 days, the last one ~2 h ago, run by the cloud autopilot
    every = 6
    log = home / "logs" / "autopilot.jsonl"
    with log.open("w", encoding="utf-8") as fh:
        for k in range(11, -1, -1):
            st = now - dt.timedelta(hours=2 + every * k, minutes=rng.randint(5, 14))
            fin = st + dt.timedelta(minutes=rng.randint(6, 22))
            up = [f"#{c['id']} {p}/{acct}" for ut, uid, c, p, acct in live
                  if st <= ut <= fin + dt.timedelta(hours=every)][:3]
            rep = {"started": iso(st), "runner": "cloud",
                   "skipped_campaigns": ["PB Blake (trading creator): rules don't allow automated "
                                         "clipping tools (or it isn't confirmed)"],
                   "approved": [u.split()[0] for u in up], "held": [], "uploaded": up, "upload_errors": [],
                   "notes": [], "finished": iso(fin)}
            if k == 0:
                rep["held"] = [f"#{c['id']} {c['title'][:60]}" for c in clip_rows if c["status"] == "pending_review"][:1]
                rep["upload_errors"] = (["instagram #%d: media processing timed out" % newest["id"]]
                                        if newest and "instagram" in newest["spec"]["platforms"] else [])
                rep["notes"] = ["TikTok draft sent to your inbox: finish it in the app",
                                f"tiktok/tradever.clips: daily upload cap ({cap}) reached; 3 clip(s) wait",
                                "views refreshed for %d posts" % len(posts)]
            fh.write(json.dumps(rep) + "\n")

    # settings + a little AI spend
    for k, v in {"autopilot.enabled": True, "autopilot.enabled_at": iso(start), "autopilot.via": "free",
                 "autopilot.platforms": ["tiktok", "instagram", "youtube"], "autopilot.max_uploads_per_day": cap,
                 "autopilot.max_per_day": cap, "autopilot.min_score": 55, "autopilot.privacy": "public",
                 "autopilot.every_hours": every, "autopilot.runner": "cloud",
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
