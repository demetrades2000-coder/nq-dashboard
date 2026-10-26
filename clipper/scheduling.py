"""
Smart scheduling: instead of posting every account at the same minute of a run, pick a time later today.

  * the minute is jittered (never a fixed :33), stable for the same account and day so a re-run picks the same slot
  * two accounts never post in the same minute (and stay a few minutes apart)
  * hours: the best hours in our own data once 20+ posts have settled, else US prime time (12-14h and 18-22h New York)
  * an account's posts keep the campaign's min gap and are spread through the day (>= 90 min between any two)
  * everything stays inside the posting window (post_hours, e.g. 08:00-22:59 New York)

The slot goes to Zernio as scheduledFor (local wall-clock time) + timezone, so the post goes out at that time even
though the run that planned it ended long before. Pure functions: no network, the clock is passed in.
"""

from __future__ import annotations

import datetime as dt
import random

PRIME_HOURS = (12, 13, 18, 19, 20, 21)
LEAD_MIN = 20            # Zernio needs the time to be in the future: plan at least this far ahead
SEP_MIN = 3              # minutes between two accounts' posts
ANY_GAP_MIN = 90         # minutes between two posts of one account (any kind)


def _zone(tz: str):
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(tz)
    except Exception:  # noqa: BLE001
        return None


def to_local(t_utc: dt.datetime, tz: str) -> dt.datetime:
    z = _zone(tz)
    if z:
        return t_utc.astimezone(z)
    import pipeline as pl
    loc = pl.now_in_tz(tz, t_utc)
    return loc if loc is not None else t_utc


def to_utc(local_naive: dt.datetime, tz: str, ref_utc: dt.datetime) -> dt.datetime:
    z = _zone(tz)
    if z:
        return local_naive.replace(tzinfo=z).astimezone(dt.timezone.utc)
    off = to_local(ref_utc, tz).replace(tzinfo=None) - ref_utc.replace(tzinfo=None)   # fixed offset (no tz database)
    return (local_naive - off).replace(tzinfo=dt.timezone.utc)


def preferred_hours(window, best_hours=None) -> list[int]:
    """Hours (local) inside the window, best first: own best hours if known, else prime time."""
    a, b = int(window[0]), int(window[1])
    inside = [h for h in range(24) if (a <= h < b if a <= b else (h >= a or h < b))]
    pref = [h for h in (best_hours or ()) if h in inside] or [h for h in PRIME_HOURS if h in inside]
    return pref or inside


def plan_slot(now_utc: dt.datetime, tz: str, window, account: str, kind: str, taken: list[dt.datetime],
              last_same_kind: dt.datetime | None = None, last_any: dt.datetime | None = None, min_gap_h: float = 0.0,
              best_hours=None, seed: str = "") -> dict | None:
    """Pick today's next posting time for one account's next post of `kind`.
    Returns {"utc": aware datetime, "scheduledFor": "YYYY-MM-DDTHH:MM:00", "timezone": tz} or None (no slot left today)."""
    now_local = to_local(now_utc, tz)
    earliest = now_utc + dt.timedelta(minutes=LEAD_MIN)
    if last_same_kind and min_gap_h:
        earliest = max(earliest, last_same_kind + dt.timedelta(hours=min_gap_h))
    if last_any:
        earliest = max(earliest, last_any + dt.timedelta(minutes=ANY_GAP_MIN))
    a, b = int(window[0]), int(window[1])
    day = now_local.date()
    pref = preferred_hours(window, best_hours)
    inside = [h for h in range(a, b)] if a <= b else list(range(a, 24)) + list(range(0, b))
    end_local = dt.datetime(day.year, day.month, day.day) + dt.timedelta(hours=b if a <= b else 24 + b)
    end_utc = to_utc(end_local, tz, now_utc)
    rnd_day = f"{seed}|{account}|{kind}|{day.isoformat()}"

    def candidate(h: int) -> dt.datetime | None:
        rnd = random.Random(f"{rnd_day}|{h}")
        local = dt.datetime(day.year, day.month, day.day) + dt.timedelta(hours=h if h >= a or a <= b else h + 24,
                                                                         minutes=rnd.randint(2, 57))
        t = to_utc(local, tz, now_utc)
        if t < earliest:       # this hour is already (partly) gone: try the rest of it, then give up on it
            t = earliest + dt.timedelta(minutes=rnd.randint(0, 8))
            if to_local(t, tz).hour != h:
                return None
        for _ in range(40):    # never two accounts in the same minute
            if all(abs((t - o).total_seconds()) >= SEP_MIN * 60 for o in taken):
                break
            t += dt.timedelta(minutes=SEP_MIN + 1)
        else:
            return None
        return t if t < end_utc - dt.timedelta(minutes=1) else None

    for hours in (pref, [h for h in inside if h not in pref]):
        found = [c for c in (candidate(h) for h in hours) if c is not None]
        if found:
            t = min(found)
            local = to_local(t, tz).replace(tzinfo=None, second=0, microsecond=0)
            return {"utc": t, "scheduledFor": local.strftime("%Y-%m-%dT%H:%M:00"), "timezone": tz}
    return None
