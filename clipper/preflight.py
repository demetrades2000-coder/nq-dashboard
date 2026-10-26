"""
Launch checklist: live checks of everything the autopilot needs, written to `launch.checklist` every run and printed
by `python clipper/cloud_runner.py --preflight`.

Each item is {"id","label","done","manual","how","detail"} (docs/AUTOPILOT_CONTRACT.md). `how` is the exact next step in
plain words; `detail` is what was found. Secrets are never printed or stored: only whether they are present.
Everything that touches the network is injected (Zernio accounts, page fetches, Drive probe, ntfy), so the tests run
offline.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

STATE_WARN_MB = 800
RATE_WARN = 10
DONE_HOW = "Nothing to do."
ORDER = ["zernio_key", "zernio_accounts", "account_matches_campaign", "campaign_joined", "rules_checked", "campaign_pages",
         "drive_footage", "first_post", "links_submitted", "ntfy_topic", "dashboard_homescreen", "state_branch",
         "rate_limit", "chain"]


def item(id_: str, label: str, done: bool, how: str, detail: str = "", manual: bool = False, optional: bool = False) -> dict:
    d = {"id": id_, "label": label, "done": bool(done), "manual": manual, "how": DONE_HOW if done else how,
         "detail": detail}
    if optional:
        d["optional"] = True
    return d


def tree_mb(p: Path) -> float:
    total = 0
    for root, _d, files in os.walk(p):
        for f in files:
            try:
                total += (Path(root) / f).stat().st_size
            except OSError:
                pass
    return total / 1e6


def run(ws, ctx: dict) -> list[dict]:
    """ctx keys (all optional, missing = 'not checked'):
        repo            "owner/name" for the secrets link
        key_present     bool                       zernio_valid  True / False / None (could not ask)
        accounts        normalized TikTok accounts or None;   accounts_error  str
        briefs          campaign briefs;  states  {name: campaign_state}
        page_check      callable(brief) -> (ok, detail)
        drive_check     callable(folder_id) -> (ok, detail)
        home            Path of the state checkout (size);  ntfy_topic bool;  ntfy_tested bool
        rate            zernio.RATE dict;  chain  chain dict;  now  aware UTC datetime
    """
    now = ctx.get("now") or dt.datetime.now(dt.timezone.utc)
    repo = ctx.get("repo") or "<owner>/<repo>"
    secrets = f"github.com/{repo}/settings/secrets/actions/new"
    manual = ws.setting("launch.manual", None) or {}
    briefs, states = ctx.get("briefs") or [], ctx.get("states") or {}
    items: list[dict] = []

    # 1. Zernio key
    present, valid = ctx.get("key_present"), ctx.get("zernio_valid")
    if not present:
        detail = "no ZERNIO_API_KEY in this environment"
    elif valid is False:
        detail = ctx.get("accounts_error") or "Zernio rejected the key"
    elif valid is None:
        detail = "key is set but Zernio could not be reached to check it"
    else:
        detail = "key accepted by Zernio"
    items.append(item("zernio_key", "Zernio API key added", bool(present and valid), (
        f"Open zernio.com -> API keys -> Create key; add it at {secrets} as ZERNIO_API_KEY" if not present else
        f"Zernio rejected the key: create a new one (zernio.com -> API keys -> Create key) and replace the "
        f"ZERNIO_API_KEY secret at {secrets}" if valid is False else
        "Zernio could not be reached; this fixes itself on the next run. If it keeps failing, check zernio.com status"),
        detail))

    # 2. accounts
    accts = ctx.get("accounts")
    if accts is None:
        items.append(item("zernio_accounts", "TikTok accounts connected in Zernio", False,
                          "Fix the Zernio key first (above), then connect TikTok pages: zernio.com -> Connect account -> TikTok",
                          ctx.get("accounts_error") or "could not read the account list"))
    else:
        bad = [a["name"] for a in accts if not a.get("usable", True)]
        items.append(item("zernio_accounts", "TikTok accounts connected in Zernio", bool(accts) and not bad,
                          ("Open zernio.com -> Accounts -> Connect account -> TikTok and log in as the page you want to post from"
                           if not accts else
                           f"Open zernio.com -> Accounts, press Reconnect on: {', '.join(bad)}"),
                          (f"{len(accts)} connected: " + ", ".join(a["name"] for a in accts)) if accts else "none connected"))

    # 3. every live campaign has a page
    lines, missing, ok_all = [], [], True
    for c in briefs:
        st = states.get(c["name"]) or {}
        if st.get("state") in ("blocked", "ended", "paused"):
            continue
        mine = [a.split("/", 1)[-1] for a in st.get("accounts") or []]
        if st.get("state") == "active" and mine:
            lines.append(f"{c['name']}: {', '.join(mine)}")
        else:
            ok_all = False
            w = (c.get("account_match") or "").strip().lower()
            if w and w != "*":
                missing.append(f"{c['name']}: create a TikTok page with '{w}' in its name (for example {w}.clips) and connect it in Zernio")
            else:
                missing.append(f"{c['name']}: connect one more TikTok account in Zernio (any page works)")
    items.append(item("account_matches_campaign", "Every campaign has a TikTok page to post from", ok_all and (bool(lines) or not briefs),
                      "; ".join(missing) or "Connect a TikTok page in Zernio",
                      "; ".join(lines + missing) or "no campaign yet"))

    # 4/5. campaigns joined and rules checked (manual by nature)
    cleared = [c for c in briefs if c.get("automation_allowed") is True]
    items.append(item("campaign_joined", "Campaigns joined on Content Rewards", bool(manual.get("campaign_joined") or cleared),
                      "Join a campaign on contentrewards.com, then send its link to Claude (python clipper/cloud_runner.py --onboard <link>)",
                      ", ".join(c["name"] for c in cleared) or "no campaign onboarded", manual=True))
    unclear = [c for c in briefs if c.get("automation_allowed") is None]
    items.append(item("rules_checked", "Rules of each campaign checked (automated tools allowed)", not unclear,
                      "; ".join(f"{c['name']}: open its Rules tab and send the rules text to Claude" for c in unclear),
                      "; ".join(f"{c['name']}: {'allowed' if c.get('automation_allowed') else 'banned' if c.get('automation_allowed') is False else 'not confirmed'}"
                                for c in briefs) or "no campaign yet", manual=True))

    # 6. pages reachable
    check = ctx.get("page_check")
    if check:
        down = []
        for c in briefs:
            if "contentrewards.com" not in ((c.get("permission") or {}).get("campaign_url") or ""):
                continue
            ok, why = check(c)
            if not ok:
                down.append(f"{c['name']}: {why}")
        items.append(item("campaign_pages", "Campaign pages reachable", not down,
                          "Content Rewards could not be read; nothing to do unless it lasts a day (the last known status is kept)",
                          "; ".join(down) or "all pages answered"))

    # 7. footage
    drive_check = ctx.get("drive_check")
    drives = [(c["name"], c["footage_drive_folder"]) for c in briefs if c.get("footage_drive_folder")]
    if drives and drive_check:
        bad = []
        for name, fid in drives:
            ok, why = drive_check(fid)
            if not ok:
                bad.append(f"{name}: {why}")
        items.append(item("drive_footage", "Footage folders reachable", not bad,
                          "Open the Drive folder, Share -> General access -> Anyone with the link (Viewer), then check again",
                          "; ".join(bad) or f"{len(drives)} folder(s) listed"))
    elif drives:
        stat = ctx.get("drive_status") or {}
        bad = [f"{n}: {stat[n].get('why') or 'not listed'}" for n, _f in drives if n in stat and not stat[n].get("ok")]
        unknown = [n for n, _f in drives if n not in stat]
        items.append(item("drive_footage", "Footage folders reachable", not bad and not unknown,
                          "Open the Drive folder, Share -> General access -> Anyone with the link (Viewer); the next run checks again",
                          "; ".join(bad) or (f"not checked yet: {', '.join(unknown)}" if unknown else
                                             f"{len(drives)} folder(s) listed on the last run")))
    elif briefs:
        items.append(item("drive_footage", "Footage folders reachable", True, "", "no Drive folder named; local / YouTube footage only"))

    # 8. first post
    n_posts = ws.q("SELECT COUNT(*) n FROM uploads WHERE state IN ('live','processing')")[0]["n"]
    items.append(item("first_post", "First successful post", n_posts > 0,
                      "Wait for the next run (every 4 hours, 08:00-23:00 New York) or start it now: GitHub -> Actions -> clipper-cloud -> Run workflow",
                      f"{n_posts} post(s) so far"))

    # 9. links submitted (manual)
    stale = ws.q("SELECT COUNT(*) n FROM uploads WHERE url IS NOT NULL AND submitted_at IS NULL AND created < ?",
                 ((now - dt.timedelta(hours=48)).replace(tzinfo=None).isoformat(timespec="seconds"),))[0]["n"]
    items.append(item("links_submitted", "Links pasted on the campaign pages", stale == 0,
                      "Open the dashboard -> Submit, tap Copy next link, paste it on the campaign page (about 2 minutes)",
                      f"{stale} link(s) older than 2 days still to submit" if stale else "no old links waiting", manual=True))

    # 10. ntfy
    has_topic = bool(ctx.get("ntfy_topic"))
    items.append(item("ntfy_topic", "Phone alerts (ntfy) set up", has_topic,
                      f"Install the ntfy app, subscribe to a private topic name only you know, and add that name at {secrets} as NTFY_TOPIC",
                      ("topic set; test notification " + ("sent" if ctx.get("ntfy_tested") else "not sent yet")) if has_topic else
                      "no NTFY_TOPIC secret (optional)", optional=True))

    # 11. dashboard on the home screen (manual)
    items.append(item("dashboard_homescreen", "Dashboard added to the phone home screen", bool(manual.get("dashboard_homescreen")),
                      "Open the dashboard link on your phone, tap Share -> Add to Home Screen", "", manual=True))

    # 12. state branch size
    mb = ctx.get("branch_mb")
    if mb is None and ctx.get("home"):
        mb = tree_mb(Path(ctx["home"]))
    if mb is not None:
        items.append(item("state_branch", "State branch size", mb <= STATE_WARN_MB,
                          f"The state is over {STATE_WARN_MB} MB (GitHub's limit is about 1 GB): reduce footage kept in the repo (the runner trims posted media itself)",
                          f"{mb:,.0f} MB (warn above {STATE_WARN_MB} MB)"))

    # 13. rate limit headroom
    rate = ctx.get("rate") or {}
    if rate.get("remaining") is not None:
        items.append(item("rate_limit", "Zernio rate-limit headroom", rate["remaining"] >= RATE_WARN,
                          "Zernio's free plan allows 60 requests a minute; the next run waits and retries by itself",
                          f"{rate['remaining']} of {rate.get('limit') or '?'} requests left in the current minute"))

    # 14. the chain of scheduled runs
    ch = ctx.get("chain")
    if ch:
        items.append(item("chain", "Scheduled runs on time", not ch.get("stalled_hours"),
                          "GitHub paused the schedule (it does that after 60 days without commits): open GitHub -> Actions -> clipper-cloud -> Enable workflow, then Run workflow",
                          (f"last gap {ch['stalled_hours']} h between runs" if ch.get("stalled_hours") else
                           f"last run {ch.get('last_run', '?')}")))
    items.sort(key=lambda i: ORDER.index(i["id"]) if i["id"] in ORDER else 99)
    ws.set_setting("launch.checklist", items)
    return items


def render(items: list[dict]) -> str:
    """The readable report for the terminal / the Actions log."""
    todo = [i for i in items if not i["done"] and not i.get("optional")]
    out = ["Clip Engine launch checklist", "=" * 28]
    for i in items:
        mark = "[x]" if i["done"] else ("[ ]" if not i.get("optional") else "[-]")
        who = " (you)" if i["manual"] and not i["done"] else ""
        out.append(f"{mark} {i['label']}{who}")
        if i["detail"]:
            out.append(f"      {i['detail']}")
        if not i["done"]:
            out.append(f"      -> {i['how']}")
    out.append("")
    out.append("Everything is set." if not todo else f"{len(todo)} thing(s) left: " + "; ".join(i["label"] for i in todo))
    return "\n".join(out)
