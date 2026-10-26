"""
Campaign lifecycle and automatic switching.

Every run, for every onboarded campaign brief, this module decides:

  state     active | standby | paused | ended | blocked   (see docs/AUTOPILOT_CONTRACT.md)
  priority  live TikTok CPM x min(budget left, cap)/cap x supply factor x performance factor x competition factor
            (x a runway factor when the budget is being eaten fast)
  accounts  a connected TikTok account serves exactly ONE campaign at a time

and writes `campaign_state.<name>`, `account_state.<platform>/<account>`, `switch.log` and `bench`.

Rules
  * blocked   the brief does not say the campaign's rules allow automated tools (never posts, needs a human).
  * paused    budget low / closed / status not funded. Comes back by itself when the page says it is funded again.
  * ended     closed for more than 7 days, or the campaign page is gone (404 on two checks). Archived: it leaves the
              active set but its state and the log entries stay.
  * brand pages: a campaign with `account_match: "tradever"` only ever posts to accounts with that word in the name,
              and those accounts are never given to another campaign (they idle, and the owner is told).
  * generic campaigns (`account_match: ""` or "*"): may use ANY idle account, including one freed when its own
              campaign paused or ended.  Each takes one page (related-accounts fraud checks).
  * when an active campaign pauses / ends, the best standby campaign is promoted in that same run and the freed
              generic account moves to it. A campaign that already holds a page keeps it unless a challenger is
              worth more than DEMOTE_RATIO times as much (no flip-flopping).

All times are passed in (`now`), nothing here touches the network; the account list comes from Zernio via the caller.
"""

from __future__ import annotations

import datetime as dt
import json
import re
import statistics
from pathlib import Path

import accountmodes as am

BUDGET_CAP = 2000.0            # a campaign with this much left (or more) counts as "full"
ENDED_AFTER_DAYS = 7           # closed this long = ended for good
GONE_CHECKS = 2                # the page must be missing on this many checks in a row
DEMOTE_RATIO = 2.0             # a challenger must be worth this many times more than the holder to take its page
BENCH_MIN = 2                  # healthy campaigns we want ready at all times
LOG_MAX = 200
HIST_MAX = 12
SETTLE_HOURS = 24
STATES = ("active", "standby", "paused", "ended", "blocked")


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------ briefs and what they say about accounts

def load_brief(path) -> dict | None:
    try:
        c = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(c, dict) or not c.get("name"):
        return None
    c["_file"] = str(path)
    return c


def brand_word(c: dict) -> str:
    """The word a page's name must contain for this campaign ('' = the campaign needs no dedicated page)."""
    m = str(c.get("account_match") or "").strip().lower().replace(" ", "")
    return "" if m == "*" else m


def pinned_accounts(c: dict, platform: str = "tiktok") -> list[str]:
    """Account names the brief itself lists (accounts.tiktok = ["a", "b"] / "a"); '*' and 'default' mean 'any'."""
    v = (c.get("accounts") or {}).get(platform)
    items = v if isinstance(v, list) else ([v] if v else [])
    return [str(x).strip() for x in items if str(x).strip() and str(x).strip() not in ("*", "default")]


def is_generic(c: dict) -> bool:
    return not brand_word(c) and not pinned_accounts(c)


def account_matches(c: dict, name: str) -> bool:
    """Is this page named for the campaign (brand word in the name) or listed in the brief?"""
    n = am.norm(name)
    pins = pinned_accounts(c)
    if pins:
        return n in {am.norm(p) for p in pins}
    w = brand_word(c)
    return bool(w) and w in n


def tiktok_rate(c: dict, live: dict | None) -> float:
    r = (live or {}).get("cpm")
    try:
        return float(r) if r else float(c.get("cpm") or 0)
    except (TypeError, ValueError):
        return 0.0


def min_views_needed(c: dict) -> float:
    """Views a post needs to reach the campaign's minimum payout."""
    if c.get("min_views"):
        return float(c["min_views"])
    cpm, mn = float(c.get("cpm") or 0), float(c.get("min_payout") or 0)
    return mn / cpm * 1000 if cpm and mn else 1000.0


# ------------------------------------------------------------------ own numbers

def _ts(s) -> dt.datetime | None:
    return am.parse_ts(s)


def own_perf(ws, name: str, now: dt.datetime) -> dict:
    """Average views of our own settled posts (>= 24 h old, views really measured) for one campaign."""
    rows = ws.q("SELECT u.views, u.created, u.updated FROM uploads u JOIN clips c ON c.id=u.clip_id "
                "WHERE c.campaign=? AND u.url IS NOT NULL AND u.state != 'failed'", (name,))
    good = [int(r["views"] or 0) for r in rows
            if (_ts(r["created"]) or now) <= now - dt.timedelta(hours=SETTLE_HOURS) and am.views_known(r)]
    return {"posts": len(good), "avg": round(statistics.mean(good)) if good else None}


def own_pending_usd(ws, c: dict) -> float:
    """What our posts are worth so far at the campaign's rate (money that will be drawn from its budget)."""
    import campaign as cmp
    total = 0.0
    for r in ws.q("SELECT u.views FROM uploads u JOIN clips k ON k.id=u.clip_id WHERE k.campaign=? AND u.url IS NOT NULL",
                  (c["name"],)):
        total += cmp.payout(c, int(r["views"] or 0))[0]
    return total


def posts_last_week(ws, name: str, now: dt.datetime) -> int:
    since = (now - dt.timedelta(days=7)).replace(tzinfo=None).isoformat(timespec="seconds")
    return ws.q("SELECT COUNT(*) n FROM uploads u JOIN clips c ON c.id=u.clip_id WHERE c.campaign=? AND u.created >= ? "
                "AND u.state != 'failed'", (name, since))[0]["n"]


def supply_for(ws, c: dict, n_accounts: int) -> float:
    """Days of ready content for this campaign at its posting pace."""
    name = c["name"]
    ready = ws.q("SELECT COUNT(*) n FROM clips WHERE campaign=? AND status='approved' AND "
                 "id NOT IN (SELECT clip_id FROM uploads WHERE state != 'failed')", (name,))[0]["n"]
    decks = ((ws.setting("supply.by_campaign", None) or {}).get(name) or {}).get("decks", 0)
    vids = int(ws.setting("autopilot.max_uploads_per_day", 2))
    slides = int(ws.setting("autopilot.max_slides_per_day", 2)) if c.get("slideshows") else 0
    per_day = max(1, n_accounts) * max(1, vids + slides)
    return round((ready + (decks if c.get("slideshows") else 0)) / per_day, 1)


def runway(ws, name: str, left, now: dt.datetime) -> float | None:
    """Days until the budget is gone at the speed it has been going down (None when unknown / not going down)."""
    if left is None:
        return None
    key = f"campaign_hist.{name}"
    hist = ws.setting(key, None) or []
    if not hist or (now - (_ts(hist[-1][0]) or now)).total_seconds() >= 3 * 3600:
        hist = (hist + [[iso(now), left]])[-HIST_MAX:]
        ws.set_setting(key, hist)
    first = next(((t, v) for t, v in hist if v is not None), None)
    if not first or len(hist) < 2:
        return None
    t0, v0 = _ts(first[0]), first[1]
    days = ((now - t0).total_seconds() / 86400) if t0 else 0
    if days < 0.5 or v0 is None or v0 <= left:
        return None
    burn = (v0 - left) / days
    return round(left / burn, 1) if burn > 0 else None


# ------------------------------------------------------------------ states and priority

def priority(c: dict, live: dict, perf: dict, supply_days: float, runway_days: float | None) -> tuple[float, dict]:
    """live CPM x budget headroom x supply x own performance x competition (x runway). Higher = better."""
    cpm = tiktok_rate(c, live)
    left = live.get("left")
    left_f = min(max(left, 0.0), BUDGET_CAP) / BUDGET_CAP if left is not None else 0.5
    supply_f = 0.4 + 0.6 * min(1.0, supply_days / 5.0)
    need = min_views_needed(c)
    # judged only once there are enough settled posts; fewer than 5 is "no opinion", never a made-up number
    perf_f = max(0.4, min(1.5, perf["avg"] / need)) if perf.get("posts", 0) >= 5 and perf.get("avg") is not None else 1.0
    creators = live.get("creators")
    comp_f = 0.6 + 0.4 / (1 + creators / 300.0) if isinstance(creators, (int, float)) else 0.8
    run_f = 1.0 if runway_days is None or runway_days >= 3 else 0.5 + runway_days / 6.0
    parts = {"cpm": round(cpm, 2), "budget": round(left_f, 3), "supply": round(supply_f, 3),
             "performance": round(perf_f, 3), "competition": round(comp_f, 3), "runway": round(run_f, 3)}
    return round(cpm * left_f * supply_f * perf_f * comp_f * run_f, 3), parts


def assess(c: dict, live: dict, prev: dict, now: dt.datetime) -> dict:
    """The state a campaign is in before accounts are considered: blocked / ended / paused, or healthy (None)."""
    if c.get("automation_allowed") is not True:
        if c.get("automation_allowed") is False:
            return {"state": "blocked", "reason": "rules ban automated tools: never posts here"}
        return {"state": "blocked", "reason": "rules do not clearly allow automated tools: needs a human to confirm "
                                              "(send the rules text to Claude)"}
    if c.get("hold") is True:
        return {"state": "paused", "reason": "paused by you (hold: true in the brief)"}
    if (live.get("gone_count") or 0) >= GONE_CHECKS:
        return {"state": "ended", "reason": "the campaign page is gone (404): the campaign was removed"}
    if live.get("ok", True) is False:
        since = _ts(prev.get("closed_since")) or now
        days = (now - since).total_seconds() / 86400
        if days > ENDED_AFTER_DAYS:
            return {"state": "ended", "reason": f"closed for {int(days)} days ({live.get('reason') or 'no budget'})",
                    "closed_since": iso(since)}
        return {"state": "paused", "reason": live.get("reason") or "paused", "closed_since": iso(since)}
    return {"state": None}


def _page_name(prefer: str, word: str) -> str:
    return f"{word}.clips" if word else "a TikTok page"


def allocate(healthy: list[dict], accounts: list[dict], prev_owner: dict[str, str | None], brand_bound: dict[str, str],
             max_active: int = 0, prev_active: set[str] | None = None) -> dict:
    """Decide who is active and which account serves whom.

    healthy: [{"c": brief, "prio": float}] ; accounts: normalized Zernio accounts ;
    prev_owner: {account: campaign it served last run} ; brand_bound: {account: brand campaign name that owns the page}.
    Returns {"active": {campaign: [accounts]}, "standby": {campaign: why}, "owner": {account: campaign or None}}."""
    prev_active = prev_active or set()
    by_name = {a["name"]: a for a in accounts}
    # hysteresis: a campaign that is active now keeps its place unless a challenger is worth DEMOTE_RATIO times more
    order = sorted(healthy, key=lambda h: -(h["prio"] * (DEMOTE_RATIO if h["c"]["name"] in prev_active
                                                          and is_generic(h["c"]) else 1.0)))
    free_generic = [a for a in accounts if a["usable"] and a["name"] not in brand_bound]
    cap_generic = len(free_generic)
    active, standby, used_generic = {}, {}, 0
    for h in order:
        c = h["c"]
        n = c["name"]
        if max_active and len(active) >= max_active:
            standby[n] = f"waiting for its turn (rank {order.index(h) + 1}; at most {max_active} campaigns run at once)"
            continue
        if not is_generic(c):
            mine = [a["name"] for a in accounts if account_matches(c, a["name"]) and brand_bound.get(a["name"]) == n]
            if mine:
                active[n] = mine
            else:
                w = brand_word(c) or (pinned_accounts(c) or ["the page"])[0]
                standby[n] = (f"no tiktok account connected with '{w}' in its name: create a TikTok page named "
                              f"{_page_name(n, w)} and connect it in Zernio")
            continue
        if used_generic < cap_generic:
            used_generic += 1
            active[n] = []          # accounts chosen below, once we know which generic campaigns are active
        else:
            standby[n] = ("waiting for a free TikTok page: connect another account in Zernio" if cap_generic == 0 else
                          f"waiting for a free TikTok page (rank {order.index(h) + 1}; "
                          f"{cap_generic} generic page{'s' if cap_generic != 1 else ''} in use)")
    # generic accounts: keep the page a campaign already has, then hand out the rest
    gen_active = [h["c"]["name"] for h in order if h["c"]["name"] in active and is_generic(h["c"])]
    owner: dict[str, str | None] = {a["name"]: brand_bound.get(a["name"]) for a in accounts}
    free = {a["name"] for a in free_generic}
    for n in gen_active:
        keep = next((a for a in sorted(free) if prev_owner.get(a) == n), None)
        if keep:
            active[n] = [keep]
            free.discard(keep)
    for n in gen_active:
        if not active[n] and free:
            # prefer a page Zernio has known for a while (past warm-up), then the name order
            pick = sorted(free, key=lambda a: (0 if by_name[a].get("connected_at") else 1, a))[0]
            active[n] = [pick]
            free.discard(pick)
    for n, accts in active.items():
        for a in accts:
            owner[a] = n
    for a in free:
        owner[a] = None
    return {"active": active, "standby": standby, "owner": owner}


# ------------------------------------------------------------------ the run

def _live(ws, name: str) -> dict:
    return ws.setting(f"campaign_live.{name}", None) or {}


def run(ws, briefs: list[dict], accounts: list[dict] | None, now: dt.datetime | None = None, max_active: int | None = None,
        warmup_on: bool = True, platform: str = "tiktok") -> dict:
    """Evaluate every campaign and account, switch what must switch, write the contract keys.

    accounts None = Zernio could not be asked this run: the previous allocation is kept (never a reason to stop)."""
    now = now or utcnow()
    if max_active is None:
        max_active = int(ws.setting("lifecycle.max_active", 0) or 0)
    prev = {c["name"]: ws.setting(f"campaign_state.{c['name']}", None) or {} for c in briefs}
    base, healthy = {}, []
    for c in briefs:
        n = c["name"]
        live = _live(ws, n)
        b = assess(c, live, prev[n], now)
        base[n] = b
        if b["state"] is None:
            perf = own_perf(ws, n, now)
            prev_accts = len(prev[n].get("accounts") or []) or 1
            sup = supply_for(ws, c, prev_accts)
            run_days = runway(ws, n, live.get("left"), now)
            prio, parts = priority(c, live, perf, sup, run_days)
            base[n].update(prio=prio, parts=parts, supply=sup, perf=perf, runway=run_days)
            healthy.append({"c": c, "prio": prio})
    healthy.sort(key=lambda h: -h["prio"])
    rank = {h["c"]["name"]: i for i, h in enumerate(healthy, 1)}

    # brand-bound pages: every brief with a brand word / pinned list (also the ones that ended) owns its pages
    brand_bound: dict[str, str] = {}
    extra = [{"name": k, "account_match": v.get("account_match", "")} for k, v in
             (ws.setting("campaigns.archived", None) or {}).items()]
    ranked_names = [h["c"]["name"] for h in healthy] + [c["name"] for c in briefs if c["name"] not in rank]
    for a in accounts or []:
        cands = []
        for n in ranked_names + [e["name"] for e in extra if e["name"] not in ranked_names]:
            c = next((x for x in briefs if x["name"] == n), None) or next((e for e in extra if e["name"] == n), None)
            if c and not is_generic(c) and account_matches(c, a["name"]):
                cands.append((n, c))
        if cands:   # a listed page wins; else the LONGEST brand word ('tradever' beats 'trade'); ties keep the rank order
            best = max(cands, key=lambda t: (bool(pinned_accounts(t[1])), len(brand_word(t[1]))))
            brand_bound[a["name"]] = best[0]

    prev_owner = {k.split("/", 1)[1]: v.get("campaign") for k, v in
                  ((f"{platform}/{a['name']}", ws.setting(f"account_state.{platform}/{a['name']}", None) or {})
                   for a in accounts or []) if v}
    prev_active = {n for n, p in prev.items() if p.get("state") == "active"}

    if accounts is None:     # unknown: keep what we had; a campaign never seen before is assumed to be active
        alloc = {"active": {}, "standby": {}, "owner": {}}
        for h in healthy:
            n = h["c"]["name"]
            if prev[n].get("state") == "standby":
                alloc["standby"][n] = prev[n].get("reason") or "waiting"
            else:
                alloc["active"][n] = [a.split("/", 1)[-1] for a in prev[n].get("accounts") or []]
    else:
        alloc = allocate(healthy, accounts, prev_owner, brand_bound, max_active, prev_active)

    events, states = [], {}
    cmap = {c["name"]: c for c in briefs}
    for c in briefs:
        n = c["name"]
        live = _live(ws, n)
        b, p = base[n], prev[n]
        if b["state"] is not None:
            state, reason = b["state"], b["reason"]
        elif n in alloc["active"]:
            state = "active"
            accts = alloc["active"][n]
            where = ", ".join(accts) if accts else "its page"
            reason = f"posting on {where}" + (f" (${b['parts']['cpm']:g}/1K, ${live['left']:,.0f} left)"
                                               if live.get("left") is not None else "")
        else:
            state = "standby"
            reason = alloc["standby"].get(n, "waiting for its turn")
        since = p.get("since") if p.get("state") == state and p.get("since") else iso(now)
        st = {"state": state, "reason": reason, "since": since, "priority": b.get("prio", 0.0),
              "rank": rank.get(n), "accounts": [f"{platform}/{a}" for a in alloc["active"].get(n, [])] if state == "active" else [],
              "supply_days": b.get("supply", p.get("supply_days")), "left": live.get("left"), "budget": live.get("budget"),
              "cpm": tiktok_rate(c, live) or None, "checked": iso(now)}
        if b.get("runway") is not None:
            st["runway_days"] = b["runway"]
        if b.get("closed_since"):
            st["closed_since"] = b["closed_since"]
        if b.get("parts"):
            st["priority_parts"] = b["parts"]
        if b.get("perf", {}).get("posts"):
            st["own_avg_views"] = b["perf"]["avg"]
            st["own_posts_judged"] = b["perf"]["posts"]
        if state in ("active", "standby", "paused"):
            st["est_earned"] = round(own_pending_usd(ws, c), 2)      # what our posts are worth at the campaign's rate
        if c.get("posts_per_week") and state == "active":
            have = posts_last_week(ws, n, now)
            st["posts_7d"], st["posts_per_week"] = have, int(c["posts_per_week"])
            since_active = _ts(st["since"]) or now
            if have < int(c["posts_per_week"]) and (now - since_active).days >= 7:
                st["behind_pace"] = True       # the campaign asks for N posts a week and we are under it
        states[n] = st
        ps = p.get("state")
        if ps != state:
            ev = _transition(n, ps, state, reason)
            if ev:
                events.append(ev)

    # promotions that fill a freed seat read better with the reason "best rate"
    for ev in events:
        if ev["kind"] == "promoted" and ev["from"] == "standby":
            c = states[ev["campaign"]]
            ev["reason"] = (f"best rate among the standby campaigns (${c['cpm']:g}/1K): promoted" if c.get("cpm")
                            else "best standby campaign: promoted")

    # accounts: modes (warm-up / slow / cooldown / idle) and the account part of the switch log
    modes, mode_events, acct_events = {}, [], []
    if accounts is not None:
        owner = alloc["owner"]
        active_accounts = {a for lst in alloc["active"].values() for a in lst}
        before = {a["name"]: ws.setting(f"account_state.{platform}/{a['name']}", None) or {} for a in accounts}
        modes, mode_events = am.compute(ws, accounts, owner, active_accounts, now, platform, warmup_on)
        for a in accounts:
            name = a["name"]
            key = f"{platform}/{name}"
            was, new_owner = before[name], owner.get(name)
            if name in active_accounts:
                if was and was.get("campaign") != new_owner:
                    acct_events.append({"kind": "account_moved", "campaign": new_owner, "from": was.get("campaign"),
                                        "to": new_owner,
                                        "reason": f"{key} moved from {was['campaign']} to {new_owner}" if was.get("campaign")
                                        else f"{key} was free and now serves {new_owner}"})
            elif (not was and new_owner) or (was and was.get("active", True) and (was.get("campaign") or new_owner)):
                brand = new_owner or was.get("campaign")
                why = (f"{brand} is {states[brand]['state']}: {states[brand]['reason']}" if brand in states
                       else "no campaign needs a page right now")
                acct_events.append({"kind": "account_idle", "campaign": brand, "from": was.get("campaign") if was else brand,
                                    "to": None, "reason": f"{key} has nothing to post: {why}"})
    events += acct_events
    if accounts is not None:     # pages that are no longer connected in Zernio stay on record, marked as gone
        names = {a["name"] for a in accounts}
        for r in ws.q("SELECT key, value FROM settings WHERE key LIKE ?", (f"account_state.{platform}/%",)):
            nm = r["key"].split("/", 1)[1]
            if nm not in names:
                try:
                    v = json.loads(r["value"])
                except ValueError:
                    continue
                if v.get("connected", True) or v.get("mode") != "idle":
                    v.update(connected=False, mode="idle", active=False, health="error", campaign=None,
                             reason="no longer connected in Zernio", limits={"blocked": True}, checked=iso(now))
                    ws.set_setting(r["key"], v)

    archived = []
    arch = ws.setting("campaigns.archived", None) or {}
    for n, st in states.items():
        if st["state"] == "ended" and n not in arch:
            c = cmap[n]
            arch[n] = {"ts": iso(now), "reason": st["reason"], "account_match": c.get("account_match", ""),
                       "file": c.get("_file"), "campaign_url": (c.get("permission") or {}).get("campaign_url")}
            archived.append(n)
    if archived:
        ws.set_setting("campaigns.archived", arch)

    for n, st in states.items():
        ws.set_setting(f"campaign_state.{n}", st)
    order = {"paused": 0, "ended": 0, "demoted": 1, "promoted": 2, "resumed": 2, "account_moved": 3, "account_idle": 4}
    events.sort(key=lambda e: order.get(e["kind"], 5))
    if events:
        log = (ws.setting("switch.log", None) or []) + [
            {"ts": iso(now), "kind": e["kind"], "campaign": e["campaign"], "from": e["from"], "to": e["to"],
             "reason": e["reason"]} for e in events]
        ws.set_setting("switch.log", log[-LOG_MAX:])
    bench = compute_bench(ws, states, briefs, now)
    first_run = not any(prev.values())
    new_blocked = [] if first_run else [n for n, st in states.items() if st["state"] == "blocked" and not prev[n]]
    need_page = [n for n, st in states.items() if st["state"] == "standby" and prev[n].get("state") != "standby"
                 and st["reason"].startswith("no tiktok account connected")]
    return {"states": states, "events": events, "accounts": modes, "mode_events": mode_events, "alloc": alloc,
            "archived": archived, "bench": bench,
            "alerts": build_alerts(events, states, mode_events, first_run=first_run) + [
                {"key": f"blocked:{n}", "title": f"{n} needs a decision", "priority": "default", "tags": "raising_hand",
                 "critical": False, "msg": f"{states[n]['reason'].capitalize()}. It will not post until then."}
                for n in new_blocked] + [
                {"key": f"needpage:{n}", "title": f"{n} needs a TikTok page", "priority": "high", "tags": "point_right",
                 "critical": False, "msg": states[n]["reason"][0].upper() + states[n]["reason"][1:] + "."}
                for n in need_page]}


def _transition(name: str, old: str | None, new: str, reason: str) -> dict | None:
    """The switch-log entry for a campaign changing state (None when it is not a switch worth logging)."""
    if old is None:
        return {"kind": "promoted", "campaign": name, "from": None, "to": "active", "reason": f"new campaign: {reason}"} \
            if new == "active" else None
    if new == "paused":
        return {"kind": "paused", "campaign": name, "from": old, "to": "paused", "reason": reason}
    if new == "ended":
        return {"kind": "ended", "campaign": name, "from": old, "to": "ended", "reason": reason}
    if new == "blocked":
        return {"kind": "paused", "campaign": name, "from": old, "to": "blocked", "reason": reason}
    if new == "active":
        if old in ("paused", "blocked", "ended"):
            return {"kind": "resumed", "campaign": name, "from": old, "to": "active", "reason": reason}
        return {"kind": "promoted", "campaign": name, "from": old, "to": "active", "reason": reason}
    if new == "standby":
        if old == "active":
            return {"kind": "demoted", "campaign": name, "from": "active", "to": "standby", "reason": reason}
        if old in ("paused", "blocked", "ended"):
            return {"kind": "resumed", "campaign": name, "from": old, "to": "standby", "reason": reason}
    return None


# ------------------------------------------------------------------ bench (spare campaigns)

NEXT_STEP = "Join it, open its Rules tab, then send the rules text and links to Claude."


def _norm_url(u) -> str:
    return re.sub(r"^https?://(www\.)?", "", str(u or "").lower()).rstrip("/")


def compute_bench(ws, states: dict, briefs: list[dict], now: dt.datetime) -> dict:
    """Keep at least BENCH_MIN healthy campaigns (active or standby) so a pause never leaves nothing to post."""
    import contentrewards as crw
    healthy = sum(1 for s in states.values() if s["state"] in ("active", "standby"))
    joined = {_norm_url((c.get("permission") or {}).get("campaign_url")) for c in briefs}
    joined |= {_norm_url(v.get("campaign_url")) for v in (ws.setting("campaigns.archived", None) or {}).values()}
    ban = crw.load_ban_list()
    good = []
    for lead in ws.setting("leads.discovered", None) or []:
        if _norm_url(lead.get("url")) in joined:
            continue
        if crw.lead_ok(lead, ban)[0]:
            good.append(lead)
    good.sort(key=lambda lead: -(lead.get("score") or 0))
    need = healthy < BENCH_MIN
    if not need:
        reason = f"{healthy} healthy campaigns ready (want {BENCH_MIN}+)"
    elif healthy == 0:
        reason = "no healthy campaign: nothing can post. Join one now."
    else:
        reason = f"only {healthy} healthy campaign (want {BENCH_MIN}): join another so one is always ready"
    bench = {"healthy": healthy, "min": BENCH_MIN, "need_more": need, "reason": reason, "join_next": good[:5],
             "next_step": NEXT_STEP, "checked": iso(now)}
    ws.set_setting("bench", bench)
    return bench


def bench_alert(bench: dict) -> dict | None:
    """The once-a-day 'join another campaign' note: only when we have real leads to name."""
    if not bench.get("need_more") or not bench.get("join_next"):
        return None
    top = bench["join_next"][:3]
    names = "; ".join(f"{lead['name'][:48]} (${((lead.get('rates') or {}).get('tiktok') or {}).get('cpm', 0):g}/1K, "
                      f"${lead.get('left') or 0:,.0f} left)" for lead in top)
    return {"key": "bench", "title": "Join another campaign", "priority": "high", "tags": "mag", "critical": False,
            "msg": f"{bench['reason'].capitalize()}. Best leads: {names}. {NEXT_STEP} First one: {top[0].get('url', '')}"}


# ------------------------------------------------------------------ alert texts for switches

def _money(st: dict) -> str:
    bits = []
    if st.get("cpm"):
        bits.append(f"${st['cpm']:g}/1K")
    if st.get("left") is not None:
        bits.append(f"${st['left']:,.0f} left")
    return f" ({', '.join(bits)})" if bits else ""


def build_alerts(events: list[dict], states: dict, mode_events=(), first_run: bool = False) -> list[dict]:
    """Phone alerts for this run's switches. One per switch: the dedupe key is the kind and campaign, and the
    runner sends each key at most once a day."""
    out = []
    started = [e for e in events if e["kind"] in ("promoted", "resumed") and e["to"] == "active"]
    moved = [e for e in events if e["kind"] == "account_moved"]
    for e in events:
        k, n = e["kind"], e["campaign"]
        if k in ("paused", "ended"):
            word = "blocked" if e["to"] == "blocked" else k
            took = [x for x in started if x["campaign"] != n]
            if took:
                nm = " and ".join(f"{x['campaign']}{_money(states.get(x['campaign'], {}))}" for x in took[:2])
                tail = f" Switched to {nm}."
                pages = [m for m in moved if m["campaign"] in {x['campaign'] for x in took}]
                if pages:
                    tail += " " + " ".join(m["reason"] + "." for m in pages[:2])
            else:
                tail = " No other campaign is ready to take over: join one from the dashboard Leads."
            out.append({"key": f"switch:{word}:{n}", "title": f"{n} {word}", "priority": "high", "tags": "warning",
                        "critical": False, "msg": f"{e['reason'].rstrip('.').capitalize()}.{tail}"})
        elif k == "resumed":
            out.append({"key": f"switch:resumed:{n}", "title": f"{n} is back", "priority": "default", "tags": "tada",
                        "critical": False, "msg": f"{n} is funded again and posting resumes{_money(states.get(n, {}))}."})
        elif k == "promoted" and not any(x["kind"] in ("paused", "ended") for x in events):
            if first_run and e["from"] is None:
                continue      # the system's very first look at a campaign that was already running: not news
            pages = ", ".join(a.split("/", 1)[-1] for a in states.get(n, {}).get("accounts") or []) or "its page"
            why = "new campaign" if e["from"] is None else "best standby campaign"
            out.append({"key": f"switch:promoted:{n}", "title": f"Now posting for {n}", "priority": "default",
                        "tags": "rocket", "critical": False,
                        "msg": f"{why.capitalize()}: posting on {pages}{_money(states.get(n, {}))}."})
        elif k == "demoted":
            out.append({"key": f"switch:demoted:{n}", "title": f"{n} moved to standby", "priority": "default",
                        "tags": "arrows_counterclockwise", "critical": False,
                        "msg": f"A better campaign took its page. {e['reason']}"})
        elif k == "account_idle" and e.get("campaign"):
            page = e["reason"].split(" has nothing")[0]
            out.append({"key": f"idle:{page}", "title": f"{page.split('/', 1)[-1]} has nothing to post",
                        "priority": "high", "tags": "zzz", "critical": False,
                        "msg": e["reason"].split(": ", 1)[-1].rstrip(".") + ". This page stays with its brand, so it "
                               "waits. Join a campaign that accepts any page, or reuse it yourself."})
    for m in mode_events:
        if m["kind"] == "cooldown":
            out.append({"key": f"cooldown:{m['account']}", "title": f"{m['account']} disconnected", "priority": "urgent",
                        "tags": "rotating_light", "critical": True, "msg": m["reason"]})
        elif m["kind"] == "slow":
            out.append({"key": f"slow:{m['account']}", "title": f"{m['account']} looks limited", "priority": "high",
                        "tags": "snail", "critical": False,
                        "msg": m["reason"] + ". Posting less on it until its views recover."})
    return out


# ------------------------------------------------------------------ what the posting code asks

def campaign_block(ws, name: str, for_import: bool = False) -> str | None:
    """Why a campaign may not post (or, for_import, may not even be clipped) right now, else None.
    No state record (the lifecycle has not run) means: no opinion."""
    st = ws.setting(f"campaign_state.{name}", None)
    if not st:
        return None
    s = st.get("state")
    if s in ("paused", "ended", "blocked"):
        return st.get("reason") or s
    if s == "standby":
        return None if for_import else (st.get("reason") or "standby")
    return None


def accounts_for(ws, name: str, platform: str = "tiktok") -> list[str] | None:
    """The account names allocated to an ACTIVE campaign, or None when no allocation exists yet."""
    st = ws.setting(f"campaign_state.{name}", None)
    if not st or "accounts" not in st:
        return None
    pre = f"{platform}/"
    return [a[len(pre):] for a in st["accounts"] if a.startswith(pre)]
