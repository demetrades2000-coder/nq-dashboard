#!/usr/bin/env python3
"""Turn the NQ dashboard's data.json into Planner bot events (the bots/<bot> document format).

The NQ bots already publish everything the calendar needs to data.json: high-impact USD news with the
windows when the bot pauses entries, FOMC days, early closes, clock changes and each eval's sessions left.
This reads that file and prints one bot document: {"bot", "updated", "source", "events": [...]}.

    python dashboard_events.py data.json > nq.json

Times are US Eastern, the same as the dashboard. Standard library only.
"""
import json
import sys
from datetime import date, datetime, timedelta, timezone


def _hm_add(hm, minutes):
    h, m = map(int, hm.split(":"))
    t = min(h * 60 + m + minutes, 23 * 60 + 59)
    return f"{t // 60:02d}:{t % 60:02d}"


def _trading_days_after(start, n, holidays):
    """The date n weekday sessions after start (start counts as session 0)."""
    d = start
    while n > 0:
        d += timedelta(days=1)
        if d.weekday() < 5 and d.isoformat() not in holidays:
            n -= 1
    return d


def build(data):
    events, seen = [], set()
    news = data.get("news") or {}
    goals = data.get("goals") or {}
    cal = goals.get("calendar") or {}
    holidays = {d["date"] for d in news.get("days") or [] if d.get("holiday")}

    # High-impact releases. Same date + time = one event; the bot's pause window is the event's span.
    groups = {}
    for e in news.get("events") or []:
        if e.get("impact") != "high" or not e.get("date") or not e.get("time_et"):
            continue
        groups.setdefault((e["date"], e["time_et"]), []).append(e)
    for (day, hm), es in sorted(groups.items()):
        titles = list(dict.fromkeys(e["title"] for e in es))
        pause = next((e for e in es if e.get("blackout_hits_killzone") and e.get("blackout_start") and e.get("blackout_end")), None)
        fc = [f"{e['title']}: forecast {e['forecast']}, previous {e['previous']}" for e in es if e.get("forecast")]
        if pause:
            start, end = pause["blackout_start"], pause["blackout_end"]
            note = f"Bot pauses new entries {start}-{end} ET (blackout inside a killzone)."
            title = " + ".join(titles) + " · bot paused"
        else:
            start, end = hm, _hm_add(hm, 30)
            note = f"Release at {hm} ET. Outside the killzones: the bot does not pause."
            title = " + ".join(titles)
        events.append({"id": f"news-{day}-{hm.replace(':', '')}", "title": title, "type": "trading", "date": day,
                       "start": start, "end": end, "notes": "\n".join([note] + fc), "project": "nq"})
        seen.add((day, hm))

    # Further-out releases the goals calendar lists (e.g. next week's jobs report).
    extra = {}
    for e in cal.get("news") or []:
        if e.get("day") and e.get("time") and (e["day"], e["time"]) not in seen:
            extra.setdefault((e["day"], e["time"]), []).append(e.get("event", "USD release"))
    for (day, hm), titles in sorted(extra.items()):
        titles = list(dict.fromkeys(titles))
        events.append({"id": f"news-{day}-{hm.replace(':', '')}", "title": " + ".join(titles[:2]), "type": "trading", "date": day,
                       "start": hm, "end": _hm_add(hm, 30), "notes": f"High-impact USD release at {hm} ET.", "project": "nq"})

    for e in cal.get("early_close") or []:
        if e.get("day"):
            events.append({"id": f"early-{e['day']}", "title": f"Early close · futures halt {e.get('halt', '')} ET".replace("  ", " "),
                           "type": "trading", "date": e["day"], "project": "nq"})
    for e in cal.get("clocks") or []:
        if e.get("day"):
            events.append({"id": f"clocks-{e['day']}-{e.get('who', '')}".replace(" ", "").replace("/", ""),
                           "title": f"{e.get('who', '')} clocks {e.get('what', 'change').replace('clocks ', '')}".strip(),
                           "type": "personal", "date": e["day"], "notes": e.get("note", "")})

    # Evals: the last session of the 2-week goal, counted forward in weekday sessions.
    today_s = goals.get("today") or (data.get("built") or "")[:10]
    try:
        today = date.fromisoformat(str(today_s)[:10])
    except ValueError:
        today = None
    for a in goals.get("accounts") or []:
        if a.get("stage") != "eval" or a.get("status") != "open" or today is None:
            continue
        left = a.get("sessions_left")
        if not isinstance(left, int) or left < 1:
            continue
        last = _trading_days_after(today, left - 1, holidays)
        who = {"LIT": "Zlarior"}.get(a.get("strategy"), a.get("strategy") or "Bot")
        events.append({"id": f"eval-{a.get('id', who)}", "title": f"{who} · {a.get('name', 'eval')}: last session of the 2-week goal",
                       "type": "deadline", "date": last.isoformat(), "notes": (a.get("sentence") or "") + " (Estimated from sessions left.)",
                       "project": "nq"})

    events.sort(key=lambda e: (e["date"], e.get("start", "")))
    return {"bot": "NQ bots", "source": "nq-dashboard data.json", "built": data.get("built"),
            "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "events": events}


if __name__ == "__main__":
    with open(sys.argv[1] if len(sys.argv) > 1 else "data.json", encoding="utf-8") as f:
        print(json.dumps(build(json.load(f)), indent=1, ensure_ascii=False))
