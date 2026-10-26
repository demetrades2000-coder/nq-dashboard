"""
Account modes: how hard each connected TikTok account may be used right now.

  warmup    a new account: day 1-2 one post a day, day 3-4 two a day, day 5+ the normal caps
  normal    the campaign's usual caps
  slow      a limited account (>= 4 live posts older than 24 h whose median views are under 100): half the cadence,
            twice the gap between posts, only the best clips and slideshows
  cooldown  Zernio says the account is disconnected / its login expired, or a post just failed for that reason:
            nothing is posted to it until it is reconnected
  idle      no active campaign uses this account right now

Everything here is a pure function of the workspace (uploads table, settings) plus Zernio's account list, so it is
testable without a network. The result is written as `account_state.<platform>/<account>` (see
docs/AUTOPILOT_CONTRACT.md) and read back by pipeline.autopilot_cycle through `allowance()`.
"""

from __future__ import annotations

import datetime as dt
import re
import statistics

WARMUP_PLAN = ((2, 1), (4, 2))        # (last day of the stage, posts a day)
WARMUP_LAST_DAY = 4                    # day 5 onwards: normal
LIMITED_MIN_POSTS = 4
LIMITED_MEDIAN_VIEWS = 100
AUTH_COOLDOWN_H = 12
SETTLE_HOURS = 24                      # views of a post younger than this are not judged
AUTH_WORDS = ("reconnect", "disconnected", "token expired", "tokens expired", "expired token", "unauthor", "revoked",
              "invalid token", "re-authenticate", "login expired", "access token")


def account_key(platform: str, name: str) -> str:
    return f"{platform}/{name}"


def zernio_name(a: dict) -> str:
    """The name the posting code and the allocation use for a Zernio account (same rule as pipeline.campaign_accounts)."""
    return str(a.get("username") or a.get("displayName") or a.get("_id") or a.get("id"))


def norm(name: str) -> str:
    return re.sub(r"\s+", "", str(name or "").lower().lstrip("@"))


def parse_ts(s) -> dt.datetime | None:
    """A timestamp from the database (naive local = UTC on the cloud runner) or an ISO string, as aware UTC."""
    if not s:
        return None
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def objectid_time(oid) -> dt.datetime | None:
    """Zernio ids are Mongo ObjectIds: their first 4 bytes are the creation time, i.e. when the account was connected."""
    if isinstance(oid, str) and re.fullmatch(r"[0-9a-f]{24}", oid):
        t = int(oid[:8], 16)
        if 1_400_000_000 < t < 4_000_000_000:
            return dt.datetime.fromtimestamp(t, dt.timezone.utc)
    return None


def normalize_accounts(accounts: list[dict] | None, health: dict | None = None, platform: str = "tiktok") -> list[dict] | None:
    """Zernio's account list (+ optional /accounts/health) as [{name, id, platform, usable, issues, connected_at}].
    None in = None out: 'we could not ask Zernio' is different from 'there are no accounts'."""
    if accounts is None:
        return None
    health = health or {}
    out = []
    for a in accounts:
        if str(a.get("platform", "")).lower() != platform:
            continue
        name, aid = zernio_name(a), a.get("_id") or a.get("id")
        h = health.get(str(aid)) or health.get(name) or {}
        issues = []
        if a.get("isActive") is False:
            issues.append("Zernio shows the account as disconnected")
        if h.get("needsReconnect") is True or h.get("canPost") is False or h.get("tokenValid") is False \
                or str(h.get("status", "")).lower() == "error":
            issues += [str(i) for i in (h.get("issues") or [])] or ["Zernio says the login expired"]
        out.append({"name": name, "id": str(aid) if aid else None, "platform": platform, "usable": not issues,
                    "issues": list(dict.fromkeys(issues)), "connected_at": objectid_time(aid)})
    return out


def views_known(row) -> bool:
    """A post's view count is only real once a stats refresh touched it (updated later than created)."""
    c, u = parse_ts(row["created"]), parse_ts(row["updated"])
    return bool(c and u and (u - c).total_seconds() > 120)


def account_stats(ws, platform: str, name: str, now: dt.datetime) -> dict:
    rows = ws.q("SELECT created, updated, url, views, state FROM uploads WHERE platform=? AND COALESCE(account,'default')=? "
                "AND state != 'failed' ORDER BY created", (platform, name))
    first = parse_ts(rows[0]["created"]) if rows else None
    week = now - dt.timedelta(days=7)
    old = [r for r in rows if r["url"] and (parse_ts(r["created"]) or now) <= now - dt.timedelta(hours=SETTLE_HOURS)
           and views_known(r)]
    recent = [int(r["views"] or 0) for r in old[-10:]]
    return {"posts_total": len(rows), "posts_7d": sum(1 for r in rows if (parse_ts(r["created"]) or now) >= week),
            "first_post": first, "n_old": len(old),
            "median_views": int(statistics.median(recent)) if recent else None,
            "last_post": parse_ts(rows[-1]["created"]) if rows else None}


def warmup_cap(day: int) -> int | None:
    """Posts a day allowed on warm-up day `day` (1-based); None once the account is past warm-up."""
    for last, cap in WARMUP_PLAN:
        if day <= last:
            return cap
    return None


def decide(stats: dict, info: dict | None, has_active_campaign: bool, now: dt.datetime, first_seen: dt.datetime | None,
           auth_error: dict | None = None, warmup_on: bool = True) -> dict:
    """{mode, health, reason, limits} for one account."""
    info = info or {"usable": True, "issues": [], "connected_at": None}
    start = min([t for t in (first_seen, stats.get("first_post"), info.get("connected_at")) if t] or [now])
    day = (now.date() - start.date()).days + 1
    err_ts = parse_ts((auth_error or {}).get("ts"))
    # a failed post is held against the account for 12 hours (then one more try shows whether it was reconnected),
    # and only until a later post to it succeeded
    err_active = bool(err_ts and now - err_ts < dt.timedelta(hours=AUTH_COOLDOWN_H)
                      and (not stats.get("last_post") or stats["last_post"] < err_ts))
    if not info.get("usable", True) or err_active:
        why = "; ".join(info.get("issues") or []) or (auth_error or {}).get("msg", "a post failed because the login expired")
        return {"mode": "cooldown", "health": "error", "limits": {"blocked": True},
                "reason": f"{why}. Reconnect it: open zernio.com > Accounts, press Reconnect on this account and log in "
                          f"to TikTok again. Posting resumes by itself."}
    if not has_active_campaign:
        return {"mode": "idle", "health": "ok", "limits": {"blocked": True}, "reason": "no active campaign uses this account"}
    cap = warmup_cap(day) if warmup_on else None
    if cap is not None:
        return {"mode": "warmup", "health": "new", "limits": {"max_per_day": cap},
                "reason": f"day {day} of {WARMUP_LAST_DAY + 1} warm-up: {cap} post{'s' if cap > 1 else ''} a day"}
    if stats.get("n_old", 0) >= LIMITED_MIN_POSTS and (stats.get("median_views") or 0) < LIMITED_MEDIAN_VIEWS:
        return {"mode": "slow", "health": "limited",
                "limits": {"cap_factor": 0.5, "gap_factor": 2.0, "best_only": True},
                "reason": f"limited: median {stats['median_views']} views on its last {min(stats['n_old'], 10)} posts "
                          f"(under {LIMITED_MEDIAN_VIEWS}); half the posts, best clips only"}
    return {"mode": "normal", "health": "ok", "limits": {}, "reason": "normal caps"}


def compute(ws, accounts: list[dict] | None, owner: dict[str, str | None], active: set[str], now: dt.datetime,
            platform: str = "tiktok", warmup_on: bool = True) -> tuple[dict, list[dict]]:
    """Write `account_state.<platform>/<account>` for every known account.

    owner: {account name: campaign it belongs to (its brand, or the generic campaign using it) or None};
    active: names of the accounts whose campaign is ACTIVE right now (the others are idle).
    Returns ({key: state}, [events: {"kind": "cooldown"/"slow", "account", "reason"}] for modes entered this run)."""
    out, events = {}, []
    for a in accounts or []:
        name = a["name"]
        key = account_key(platform, name)
        prev = ws.setting(f"account_state.{key}", None) or {}
        first_seen = parse_ts(prev.get("first_seen")) or now
        err = ws.setting(f"account.err.{key}", None)
        stats = account_stats(ws, platform, name, now)
        d = decide(stats, a, name in active, now, first_seen, err, warmup_on)
        state = {"campaign": owner.get(name),
                 "mode": d["mode"], "reason": d["reason"],
                 "since": prev.get("since") if prev.get("mode") == d["mode"] and prev.get("since") else _iso(now),
                 "posts_total": stats["posts_total"], "posts_7d": stats["posts_7d"],
                 "median_views_recent": stats["median_views"], "health": d["health"],
                 "first_seen": prev.get("first_seen") or _iso(now), "limits": d["limits"],
                 "connected": bool(a.get("usable", True)), "active": name in active, "checked": _iso(now)}
        if d["mode"] == "warmup":
            begin = min([t for t in (first_seen, stats.get("first_post"), a.get("connected_at")) if t])
            state["warmup_day"] = (now.date() - begin.date()).days + 1
        out[key] = state
        ws.set_setting(f"account_state.{key}", state)
        if prev.get("mode") != d["mode"] and d["mode"] in ("cooldown", "slow"):
            events.append({"kind": d["mode"], "account": name, "reason": d["reason"]})
    return out, events


def allowance(ws, platform: str, account: str) -> dict:
    """What the posting loop may do with an account: {mode, blocked, max_per_day, cap_factor, gap_factor, best_only, reason}.
    No record (lifecycle has not run) means 'normal': the loop behaves as it always did."""
    st = ws.setting(f"account_state.{account_key(platform, account)}", None)
    if not st:
        return {"mode": "normal", "blocked": False, "max_per_day": None, "cap_factor": 1.0, "gap_factor": 1.0,
                "best_only": False, "reason": ""}
    lim = st.get("limits") or {}
    return {"mode": st.get("mode", "normal"), "blocked": bool(lim.get("blocked")), "max_per_day": lim.get("max_per_day"),
            "cap_factor": float(lim.get("cap_factor", 1.0)), "gap_factor": float(lim.get("gap_factor", 1.0)),
            "best_only": bool(lim.get("best_only")), "reason": st.get("reason", "")}


def is_auth_error(msg: str) -> bool:
    low = (msg or "").lower()
    return any(w in low for w in AUTH_WORDS)


def note_error(ws, platform: str, account: str, msg: str, now_iso: str) -> None:
    """Remember that a post to this account failed because its login is gone (cleared by the next good post)."""
    ws.set_setting(f"account.err.{account_key(platform, account)}", {"ts": now_iso, "msg": str(msg)[:200]})


def clear_error(ws, platform: str, account: str) -> None:
    key = f"account.err.{account_key(platform, account)}"
    if ws.setting(key, None):
        ws.x("DELETE FROM settings WHERE key=?", (key,))


def _iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
