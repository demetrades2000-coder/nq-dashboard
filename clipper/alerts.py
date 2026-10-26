"""
Owner alerts (phone notifications through ntfy): what is sent, when, and how it is kept from being noisy.

  * every alert goes into a small queue kept in the cloud state; the queue is flushed at the end of the run
  * quiet hours 23:00-08:00 New York: only critical alerts go out then, the rest wait in the queue until 08:00
  * one alert per key per day (switches are keyed by kind + campaign), a failed send stays queued for the next run
  * the 8 PM digest (counts: posted today, links to submit, days of clips left, bench, idle pages), a weekly summary
    on Sunday evening, switch alerts, bench alerts, "your key is missing", accounts that need reconnecting

The sender is injected (cloud_runner.ntfy), so tests never touch the network. Texts are one plain line each.
"""

from __future__ import annotations

import datetime as dt
import json

QUIET_FROM, QUIET_TO = 23, 8          # New York hours: quiet from 23:00 until 08:00
QUEUE_MAX_AGE_H = 30
DIGEST_HOUR = 20
WEEKLY_HOUR = 18


def is_quiet(local_hour: int) -> bool:
    return local_hour >= QUIET_FROM or local_hour < QUIET_TO


def _utc_midnight_et(now_utc: dt.datetime) -> dt.datetime:
    import scheduling
    loc = scheduling.to_local(now_utc, "America/New_York")
    start = dt.datetime(loc.year, loc.month, loc.day)
    return scheduling.to_utc(start, "America/New_York", now_utc)


def posted_since(ws, since_utc: dt.datetime) -> int:
    return ws.q("SELECT COUNT(*) n FROM uploads WHERE created >= ? AND state != 'failed'",
                (since_utc.replace(tzinfo=None).isoformat(timespec="seconds"),))[0]["n"]


def idle_pages(ws) -> list[str]:
    out = []
    for r in ws.q("SELECT key, value FROM settings WHERE key LIKE 'account_state.%'"):
        try:
            v = json.loads(r["value"])
        except ValueError:
            continue
        if v.get("mode") in ("idle", "cooldown"):
            out.append(r["key"].split("/", 1)[-1] + (" (disconnected)" if v.get("mode") == "cooldown" else ""))
    return sorted(out)


def digest(ws, state: dict, supply: dict, now_utc: dt.datetime, link: str, pl) -> tuple[str, str, int]:
    """(title, message, n_links). Counts only; the dashboard has the rest."""
    n = ws.q("SELECT COUNT(*) n FROM uploads WHERE url IS NOT NULL AND created > ?", (state.get("digest_ts", ""),))[0]["n"]
    posted = posted_since(ws, _utc_midnight_et(now_utc))
    bits = [f"Posted today: {posted}."]
    bits.append(f"Links to submit: {n}." if n else "No new links to submit.")
    if supply and supply.get("days_left") is not None:
        bits.append(f"Clips left for {supply['days_left']} days.")
    bench = ws.setting("bench", None)
    if bench:
        bits.append("Bench ok." if not bench.get("need_more") else f"Bench low ({bench.get('healthy', 0)} healthy): join another campaign.")
    idle = idle_pages(ws)
    if idle:
        bits.append("Idle: " + ", ".join(idle[:3]) + ".")
    for r in ws.q("SELECT key, value FROM settings WHERE key LIKE 'campaign_state.%'"):
        try:
            v = json.loads(r["value"])
        except ValueError:
            continue
        if v.get("state") == "standby" and str(v.get("reason", "")).startswith("no tiktok account connected"):
            bits.append(f"{r['key'].split('.', 1)[1]} needs a TikTok page: " + v["reason"].split(": ", 1)[-1] + ".")
        if v.get("behind_pace"):
            bits.append(f"{r['key'].split('.', 1)[1]} is under its {v['posts_per_week']} posts a week ({v['posts_7d']} so far).")
    if n:
        bits.append("Open the dashboard, tap Copy next link, paste it on the campaign page (2 minutes).")
    title = f"{n} new links to submit" if n else "Daily summary"
    return title, " ".join(bits) + f" {link}", n


def weekly(ws, now_utc: dt.datetime, link: str) -> tuple[str, str]:
    import campaign as cmp
    since = (now_utc - dt.timedelta(days=7)).replace(tzinfo=None).isoformat(timespec="seconds")
    rows = ws.q("SELECT u.views, c.campaign, c.kind, s.campaign_file FROM uploads u JOIN clips c ON c.id=u.clip_id "
                "JOIN sources s ON s.id=c.source_id WHERE u.created >= ? AND u.state != 'failed'", (since,))
    views = sum(int(r["views"] or 0) for r in rows)
    est, cache = 0.0, {}
    for r in rows:
        try:
            camp = cache.setdefault(r["campaign_file"], cmp.load(r["campaign_file"]))
            est += cmp.payout(camp, int(r["views"] or 0))[1]
        except Exception:  # noqa: BLE001  (a missing brief just leaves that post out of the estimate)
            continue
    unsub = ws.q("SELECT COUNT(*) n FROM uploads WHERE url IS NOT NULL AND submitted_at IS NULL")[0]["n"]
    insights = ws.setting("insights", None) or []
    best = next((i for i in insights if "average" in i or "Best posting" in i), "")
    msg = (f"This week: {len(rows)} posts, {views:,} views, about ${est:,.0f} earned (estimate from view counts). "
           f"{unsub} link{'s' if unsub != 1 else ''} still to submit. {best} {link}").replace("  ", " ")
    return "Weekly summary", msg.strip()


def run(ws, state: dict, supply: dict, key: bool, send, now_utc: dt.datetime, link: str, pl,
        extra: list[dict] | None = None, legacy: list[dict] | None = None) -> list[str]:
    """Queue this run's alerts, then send what may go out now. Returns the labels of what was sent.

    send(title, msg, priority, tags) -> bool;  extra: alerts from the lifecycle ({"key","title","msg","priority",
    "tags","critical"});  legacy: the older per-run alerts built by cloud_runner (same shape plus "label")."""
    t = pl.now_in_tz("America/New_York", now_utc)
    day = t.strftime("%Y-%m-%d") if t else now_utc.strftime("%Y-%m-%d")
    hour = t.hour if t else now_utc.hour
    seen = state.setdefault("notified", {})
    queue = state.setdefault("alert_queue", [])

    def enqueue(k, title, msg, priority="default", tags="", critical=False, label=None, day_tag=None):
        day_tag = day_tag or day
        if seen.get(k) == day_tag or any(q["k"] == k and q["day"] == day_tag for q in queue):
            return
        queue.append({"k": k, "day": day_tag, "title": title, "msg": msg, "priority": priority, "tags": tags,
                      "critical": critical, "label": label or title, "ts": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")})

    for a in (legacy or []):
        enqueue(a["key"], a["title"], a["msg"], a.get("priority", "default"), a.get("tags", ""), a.get("critical", False),
                a.get("label"))
    for a in (extra or []):
        enqueue(a["key"], a["title"], a["msg"], a.get("priority", "default"), a.get("tags", ""), a.get("critical", False))
    if hour >= DIGEST_HOUR and seen.get("digest") != day:
        title, msg, n = digest(ws, state, supply, now_utc, link, pl)
        if not any(q["k"] == "digest" and q["day"] == day for q in queue):
            enqueue("digest", title, msg, "default", "memo", False, "digest")
            state["digest_ts"] = pl.now()
    if t and t.weekday() == 6 and hour >= WEEKLY_HOUR:
        tag = t.strftime("%G-W%V")
        if seen.get("weekly") != tag:
            title, msg = weekly(ws, now_utc, link)
            enqueue("weekly", title, msg, "default", "bar_chart", False, "weekly", day_tag=tag)

    sent = []
    keep = []
    for q in queue:
        age_h = (now_utc - (dt.datetime.fromisoformat(q["ts"].replace("Z", "+00:00")))).total_seconds() / 3600
        if seen.get(q["k"]) == q["day"] or age_h > QUEUE_MAX_AGE_H:
            continue
        if is_quiet(hour) and not q["critical"]:
            keep.append(q)
            continue
        if send(q["title"], q["msg"], q["priority"], q["tags"]):
            seen[q["k"]] = q["day"]
            sent.append(q["label"])
        else:
            keep.append(q)
    state["alert_queue"] = keep[-60:]
    return sent
