"""
Performance loop: learn from our own posts, never from guesses.

From the uploads table (views and likes come from Zernio's analytics) this works out, for posts that have had at
least 24 hours to settle and whose views were really measured:

  * average views per kind (video / slideshow), per clip length bucket, per title hook word and per posting hour (ET)
  * plain-English `insights` for the dashboard (only when there are enough posts to say it)
  * `performance` (a dict) with the numbers behind them
  * preferences that feed back into what gets posted: how the day's posts are split between videos and slideshows,
    which clips go first, and which slideshow angles are paused for a while (3 posts under 100 views).
    There is always at least 20% exploration, so a kind is never starved by a few early numbers.

Minimum samples before any claim: 5 posts per group for kind / length comparisons, 3 for a hook word or an hour, 10
settled posts in total before anything is compared, 20 for the hour ranking. Below that the insight says "collecting
data". Nothing is ever extrapolated.
"""

from __future__ import annotations

import datetime as dt
import json
import random
import re
import statistics

import accountmodes as am

MIN_SETTLED = 10          # settled posts before comparing anything
MIN_GROUP = 5             # posts per kind / length group
MIN_HOOK = 3              # posts per hook word / hour
MIN_HOURS_TOTAL = 20      # settled posts before ranking hours
WEAK_VIEWS = 100          # a post under this "failed"
RETIRE_POSTS = 3          # posts under WEAK_VIEWS that pause a deck angle
RETIRE_DAYS = 14
EXPLORE = 0.2             # share of picks that ignore the ranking
SETTLE_HOURS = 24
LENGTH_BUCKETS = ((20, "under 20s"), (35, "20-35s"), (999, "35s+"))
TZ = "America/New_York"
STOP_HOOKS = {"the", "a", "an", "and", "but", "so", "to", "of", "in", "on", "it", "is", "this", "that"}


def _iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def length_bucket(seconds) -> str | None:
    if not seconds or seconds <= 0:
        return None
    for top, name in LENGTH_BUCKETS:
        if seconds < top:
            return name
    return LENGTH_BUCKETS[-1][1]


def hook_word(title: str) -> str | None:
    """The first real word of a title ('Why most traders fail' -> 'why')."""
    for w in re.findall(r"[A-Za-z']+", title or ""):
        w = w.lower().strip("'")
        if len(w) >= 3 and w not in STOP_HOOKS:
            return w
        if w in STOP_HOOKS:
            continue
    return None


def angle_of(reasons) -> str | None:
    try:
        r = json.loads(reasons) if isinstance(reasons, str) else reasons
    except ValueError:
        return None
    return str(r[0]) if isinstance(r, list) and r and isinstance(r[0], str) else None


def local_hour(t: dt.datetime) -> int:
    import pipeline as pl
    lt = pl.now_in_tz(TZ, t)
    return lt.hour if lt is not None else t.hour


def samples(ws, now: dt.datetime) -> list[dict]:
    """One dict per settled, measured, live post."""
    cols = {r[1] for r in ws.db.execute("PRAGMA table_info(uploads)")}
    sched = "u.scheduled_for" if "scheduled_for" in cols else "NULL"
    rows = ws.q(f"SELECT u.id uid, u.clip_id, COALESCE(u.account,'default') account, u.views, u.likes, u.created, "
                f"u.updated, {sched} sched, c.kind, c.title, c.start, c.end_, c.campaign, c.reasons, c.score "
                f"FROM uploads u JOIN clips c ON c.id=u.clip_id WHERE u.url IS NOT NULL AND u.state != 'failed'")
    out = []
    for r in rows:
        at = am.parse_ts(r["sched"]) or am.parse_ts(r["created"])
        if not at or at > now - dt.timedelta(hours=SETTLE_HOURS) or not am.views_known(r):
            continue
        kind = r["kind"] or "video"
        dur = (r["end_"] or 0) - (r["start"] or 0)
        out.append({"uid": r["uid"], "clip_id": r["clip_id"], "campaign": r["campaign"], "account": r["account"],
                    "kind": kind, "views": int(r["views"] or 0), "likes": int(r["likes"] or 0), "at": at,
                    "hour": local_hour(at), "length": length_bucket(dur) if kind == "video" else None,
                    "hook": hook_word(r["title"]), "angle": angle_of(r["reasons"]) if kind == "slideshow" else None})
    return out


def _group(rows: list[dict], key: str, minimum: int) -> dict:
    g: dict = {}
    for s in rows:
        k = s.get(key)
        if k is None:
            continue
        g.setdefault(k, []).append(s["views"])
    return {k: {"n": len(v), "avg": round(statistics.mean(v)), "median": round(statistics.median(v))}
            for k, v in g.items() if len(v) >= minimum}


def retired_angles(ws, now: dt.datetime) -> dict:
    """{angle: {"until", "strikes"}} that are paused right now."""
    return {a: v for a, v in (ws.setting("retired.angles", None) or {}).items()
            if (am.parse_ts(v.get("until")) or now) > now}


def _update_retirements(ws, rows: list[dict], now: dt.datetime) -> list[str]:
    """Pause a slideshow angle after RETIRE_POSTS settled posts under WEAK_VIEWS since it last came back."""
    book = ws.setting("retired.angles", None) or {}
    newly = []
    by_angle: dict[str, list[dict]] = {}
    for s in rows:
        if s["angle"]:
            by_angle.setdefault(s["angle"], []).append(s)
    for angle, posts in by_angle.items():
        entry = book.get(angle) or {}
        until = am.parse_ts(entry.get("until"))
        if until and until > now:
            continue                                  # still paused
        fresh = [p for p in posts if not until or p["at"] > until]
        if len(fresh) >= RETIRE_POSTS and all(p["views"] < WEAK_VIEWS for p in sorted(fresh, key=lambda p: p["at"])[-RETIRE_POSTS:]):
            book[angle] = {"until": _iso(now + dt.timedelta(days=RETIRE_DAYS)), "strikes": int(entry.get("strikes", 0)) + 1,
                           "since": _iso(now)}
            newly.append(angle)
    if newly:
        ws.set_setting("retired.angles", book)
    return newly


def kind_weights(by_kind: dict) -> dict | None:
    """Share of the day's posts each kind should get, from their average views (never below EXPLORE)."""
    v, s = by_kind.get("video"), by_kind.get("slideshow")
    if not v or not s or v["avg"] + s["avg"] <= 0:
        return None
    share_v = v["avg"] / (v["avg"] + s["avg"])
    share_v = min(1 - EXPLORE, max(EXPLORE, share_v))
    return {"video": round(share_v, 2), "slideshow": round(1 - share_v, 2)}


def analyze(ws, now: dt.datetime | None = None) -> dict:
    """Recompute the numbers, write `insights` and `performance`, return the performance dict."""
    now = now or dt.datetime.now(dt.timezone.utc)
    rows = samples(ws, now)
    newly = _update_retirements(ws, rows, now)
    retired = retired_angles(ws, now)
    total = len(rows)
    by_kind = _group(rows, "kind", MIN_GROUP)
    by_length = _group([s for s in rows if s["kind"] == "video"], "length", MIN_GROUP)
    by_hook = _group(rows, "hook", MIN_HOOK)
    by_hour = _group(rows, "hour", MIN_HOOK) if total >= MIN_HOURS_TOTAL else {}
    overall = round(statistics.mean(s["views"] for s in rows)) if rows else None
    ins: list[str] = []
    if total < MIN_SETTLED:
        ins.append(f"Collecting data: {total} post{'s' if total != 1 else ''} settled (24 h+ old, views measured) of the "
                   f"{MIN_SETTLED} needed before comparing videos, slideshows and hours.")
    else:
        ins.append(f"{total} settled posts average {overall:,} views.")
        v, s = by_kind.get("video"), by_kind.get("slideshow")
        if v and s:
            if v["avg"] >= s["avg"]:
                hi, lo, hn, ln = v, s, "Videos", "slideshows"
            else:
                hi, lo, hn, ln = s, v, "Slideshows", "videos"
            if hi["avg"] >= 1.4 * max(1, lo["avg"]):
                ins.append(f"{hn} average {hi['avg']:,} views, {ln} {lo['avg']:,}: more {hn.lower()} tonight.")
            else:
                ins.append(f"Videos ({v['avg']:,} views) and slideshows ({s['avg']:,}) perform about the same: keeping the mix.")
        if len(by_length) >= 2:
            best = max(by_length.items(), key=lambda kv: kv[1]["avg"])
            worst = min(by_length.items(), key=lambda kv: kv[1]["avg"])
            if best[1]["avg"] >= 1.3 * max(1, worst[1]["avg"]):
                ins.append(f"Clips of {best[0]} average {best[1]['avg']:,} views vs {worst[1]['avg']:,} for {worst[0]}: "
                           f"choosing the {best[0]} ones first.")
        if by_hook:
            top = max(by_hook.items(), key=lambda kv: kv[1]["avg"])
            if overall and top[1]["avg"] >= 1.5 * overall:
                ins.append(f"Titles starting with \"{top[0]}\" average {top[1]['avg']:,} views ({top[1]['n']} posts) vs "
                           f"{overall:,} overall.")
            weak = [(w, g) for w, g in by_hook.items() if g["n"] >= MIN_GROUP and g["avg"] < WEAK_VIEWS]
            for w, g in weak[:2]:
                ins.append(f"Titles starting with \"{w}\" stayed under {WEAK_VIEWS} views {g['n']} times: ranked lower.")
        if by_hour:
            best_h = sorted(by_hour.items(), key=lambda kv: -kv[1]["avg"])[:2]
            ins.append("Best posting hours (New York): " + " and ".join(f"{h}:00 (about {g['avg']:,} views)"
                                                                      for h, g in sorted(best_h)) + ".")
        elif total < MIN_HOURS_TOTAL:
            ins.append(f"Posting hours: using US prime time (12-14h, 18-22h New York) until {MIN_HOURS_TOTAL} posts have settled.")
    for a in newly:
        ins.append(f"Slideshow angle \"{a}\" paused for {RETIRE_DAYS} days: {RETIRE_POSTS} posts under {WEAK_VIEWS} views.")
    best_hours = [h for h, _ in sorted(by_hour.items(), key=lambda kv: -kv[1]["avg"])[:max(2, len(by_hour) * 2 // 5)]] \
        if by_hour else None
    weak_hooks = [w for w, g in by_hook.items() if g["n"] >= MIN_GROUP and g["avg"] < WEAK_VIEWS]
    length_pref = None
    if len(by_length) >= 2:
        best = max(by_length.items(), key=lambda kv: kv[1]["avg"])
        worst = min(by_length.items(), key=lambda kv: kv[1]["avg"])
        if best[1]["avg"] >= 1.3 * max(1, worst[1]["avg"]):
            length_pref = best[0]
    perf = {"settled_posts": total, "overall_avg_views": overall, "by_kind": by_kind, "by_length": by_length,
            "by_hook": dict(sorted(by_hook.items(), key=lambda kv: -kv[1]["avg"])[:10]),
            "by_hour": {str(h): g for h, g in sorted(by_hour.items())},
            "kind_weights": kind_weights(by_kind) if total >= MIN_SETTLED else None,
            "length_pref": length_pref if total >= MIN_SETTLED else None,
            "best_hours": sorted(best_hours) if best_hours else None, "weak_hooks": weak_hooks,
            "retired_angles": {a: v["until"] for a, v in retired.items()}, "exploration": EXPLORE,
            "min_samples": {"compare": MIN_SETTLED, "group": MIN_GROUP, "hook_or_hour": MIN_HOOK,
                            "hour_ranking": MIN_HOURS_TOTAL},
            "updated": _iso(now)}
    ws.set_setting("insights", ins[:12])
    ws.set_setting("performance", perf)
    return perf


# ------------------------------------------------------------------ feedback into posting

def split_caps(video_cap: int, slide_cap: int, weights: dict | None) -> tuple[int, int]:
    """Re-split a day's video + slideshow posts toward the kind that wins, keeping the total and >= 20% of each."""
    total = video_cap + slide_cap
    if not weights or video_cap <= 0 or slide_cap <= 0 or total < 2:
        return video_cap, slide_cap
    least = max(1, -(-int(EXPLORE * 100) * total // 100))      # ceil(20% of the total), at least 1
    v = min(total - least, max(least, round(total * weights.get("video", 0.5))))
    return v, total - v


def clip_penalty(row, prefs: dict | None) -> float:
    """Multiplier on a clip's ordering score from what has worked: preferred length up, weak hook words down."""
    if not prefs:
        return 1.0
    m = 1.0
    if (row["kind"] or "video") == "video" and prefs.get("length_pref") and \
            length_bucket((row["end_"] or 0) - (row["start"] or 0)) == prefs["length_pref"]:
        m *= 1.15
    if hook_word(row["title"]) in set(prefs.get("weak_hooks") or []):
        m *= 0.8
    return m


def order_rows(rows: list, prefs: dict | None, seed: str = "") -> list:
    """Best-first order for the posting queue: score x what worked, then EXPLORE of the positions swapped with a
    random later clip so nothing is starved. Deterministic for a given seed (the same run twice picks the same)."""
    ranked = sorted(rows, key=lambda r: -((r["score"] or 0) * clip_penalty(r, prefs)))
    if not prefs or len(ranked) < 3:
        return ranked
    rnd = random.Random(seed)
    for i in range(len(ranked) - 1):
        if rnd.random() < EXPLORE:
            j = rnd.randrange(i + 1, len(ranked))
            ranked[i], ranked[j] = ranked[j], ranked[i]
    return ranked


def preferences(ws) -> dict | None:
    p = ws.setting("performance", None)
    return p if p and (p.get("settled_posts") or 0) >= MIN_SETTLED else None


def angle_paused(ws, angle: str | None, now: dt.datetime | None = None) -> bool:
    if not angle:
        return False
    return angle in retired_angles(ws, now or dt.datetime.now(dt.timezone.utc))
