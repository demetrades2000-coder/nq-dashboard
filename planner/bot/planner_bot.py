#!/usr/bin/env python3
"""Put events on the Planner calendar from any bot.

Each bot owns one file, bots/<bot>.json, in the private planner-data repo. The phone and computer apps
read every file in bots/ when they sync (about once a minute) and show those events in their type's color.
Bots never write planner.json (your own events), so a bot can't erase or change anything of yours.

Setup (once per machine / workflow):
    PLANNER_TOKEN  fine-grained GitHub token with Contents: Read and write on planner-data
    PLANNER_REPO   owner/name of the data repo (default: demetrades2000-coder/planner-data)

Python:
    from planner_bot import Planner
    cal = Planner("Zlarior")
    cal.add("NY open", "2026-10-27", type="trading", start="09:30", end="11:30")
    cal.add("Payout window", "2026-11-03", end_date="2026-11-05", type="deadline", id="payout-nov")
    cal.remove("payout-nov")
    cal.set_events([...])      # replace every event of this bot in one commit
    cal.prune(keep_days=30)    # drop one-off events that ended more than 30 days ago

Command line:
    python planner_bot.py --bot Zlarior add "NY open" 2026-10-27 --type trading --start 09:30 --end 11:30
    python planner_bot.py --bot Zlarior list
    python planner_bot.py --bot Zlarior remove <id>
    python planner_bot.py --bot Zlarior clear

Types (colors): trading, bots, meetings, business, content, deadline, learning, personal, or the name of any
type you added in the app. Anything else shows as Bot ops. Times are wall-clock times as you see them in the app.
Writes happen only when something changed, so calling add() on every loop is safe (no commit spam).
Standard library only.
"""
import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date as _date, datetime, timedelta, timezone

API = os.environ.get("PLANNER_API", "https://api.github.com")
DEFAULT_REPO = "demetrades2000-coder/planner-data"
REPEATS = ("none", "daily", "weekdays", "weekly", "biweekly", "monthly", "yearly")
_YMD = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_HM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class PlannerError(Exception):
    pass


def _slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-") or "bot"


def _ymd(v, field):
    if isinstance(v, (datetime, _date)):
        return v.strftime("%Y-%m-%d")
    v = str(v)
    if not _YMD.match(v):
        raise PlannerError(f"{field} must be YYYY-MM-DD, got {v!r}")
    datetime.strptime(v, "%Y-%m-%d")
    return v


def _hm(v, field):
    if hasattr(v, "strftime"):
        return v.strftime("%H:%M")
    v = str(v)
    if len(v) == 4 and v[1] == ":":
        v = "0" + v
    if not _HM.match(v):
        raise PlannerError(f"{field} must be HH:MM (24h), got {v!r}")
    return v


def make_event(title, date, type="bots", start=None, end=None, end_date=None, notes="",
               repeat="none", until=None, skip=None, id=None):
    """Validate one event and return it in the bot-file format."""
    if not str(title).strip():
        raise PlannerError("title is required")
    ev = {"id": str(id) if id else "", "title": str(title).strip()[:200], "type": str(type or "bots").strip().lower(),
          "date": _ymd(date, "date")}
    ev["id"] = ev["id"] or f"{ev['date']}-{_slug(ev['title'])}"
    if start:
        ev["start"] = _hm(start, "start")
        if end:
            ev["end"] = _hm(end, "end")
            if ev["end"] <= ev["start"]:
                raise PlannerError("end must be after start")
    elif end:
        raise PlannerError("end needs a start")
    if end_date:
        if start:
            raise PlannerError("end_date is for all-day events (leave start empty)")
        ev["end_date"] = _ymd(end_date, "end_date")
        if ev["end_date"] < ev["date"]:
            raise PlannerError("end_date is before date")
    if repeat and repeat != "none":
        if repeat not in REPEATS:
            raise PlannerError(f"repeat must be one of {', '.join(REPEATS)}")
        ev["repeat"] = repeat
        if until:
            ev["until"] = _ymd(until, "until")
        if skip:
            ev["skip"] = sorted({_ymd(x, "skip") for x in skip})
    if notes:
        ev["notes"] = str(notes)[:2000]
    return ev


def _explain(status, repo):
    return {
        401: "PLANNER_TOKEN was rejected (expired or revoked).",
        403: f"PLANNER_TOKEN cannot write to {repo}: give it Contents: Read and write.",
        404: f"{repo} not found for this token: add the repo to the token.",
    }.get(status, f"GitHub error {status}")


class Planner:
    def __init__(self, bot, token=None, repo=None, timeout=15):
        self.bot = str(bot).strip()
        if not self.bot:
            raise PlannerError("bot name is required")
        self.token = token or os.environ.get("PLANNER_TOKEN")
        if not self.token:
            raise PlannerError("Set PLANNER_TOKEN (a GitHub token with Contents: Read and write on planner-data).")
        self.repo = repo or os.environ.get("PLANNER_REPO") or DEFAULT_REPO
        self.path = f"bots/{_slug(self.bot)}.json"
        self.timeout = timeout

    def _call(self, method, body=None):
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/vnd.github+json",
                   "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "planner-bot"}
        if data:
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(f"{API}/repos/{self.repo}/contents/{self.path}", data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                return r.status, json.loads(r.read() or b"null")
        except urllib.error.HTTPError as e:
            return e.code, None

    def _load(self):
        status, j = self._call("GET")
        if status == 404:
            return {"bot": self.bot, "events": []}, None
        if status != 200:
            raise PlannerError(_explain(status, self.repo))
        doc = json.loads(base64.b64decode(j["content"]).decode("utf-8"))
        if not isinstance(doc, dict) or not isinstance(doc.get("events"), list):
            doc = {"bot": self.bot, "events": []}
        return doc, j["sha"]

    def _update(self, fn, message):
        for attempt in range(5):
            doc, sha = self._load()
            before = json.dumps(doc["events"], sort_keys=True)
            events = fn([dict(e) for e in doc["events"]])
            if sha and json.dumps(events, sort_keys=True) == before and doc.get("bot") == self.bot:
                return False
            new = {"bot": self.bot, "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "events": events}
            body = {"message": f"{self.bot}: {message}",
                    "content": base64.b64encode((json.dumps(new, indent=1, ensure_ascii=False) + "\n").encode("utf-8")).decode()}
            if sha:
                body["sha"] = sha
            status, _ = self._call("PUT", body)
            if status in (200, 201):
                return True
            if status in (409, 422):  # someone wrote in between: reload and retry
                time.sleep(0.5 * (attempt + 1))
                continue
            raise PlannerError(_explain(status, self.repo))
        raise PlannerError("gave up after 5 write conflicts")

    def events(self):
        """This bot's events as stored."""
        return self._load()[0]["events"]

    def add(self, title, date, **kw):
        """Add or update one event (same id = update). Returns True when the calendar changed."""
        ev = make_event(title, date, **kw)

        def fn(evs):
            for i, e in enumerate(evs):
                if e.get("id") == ev["id"]:
                    evs[i] = ev
                    return evs
            return evs + [ev]
        return self._update(fn, f"add {ev['title']} ({ev['date']})")

    def remove(self, id):
        return self._update(lambda evs: [e for e in evs if e.get("id") != str(id)], f"remove {id}")

    def set_events(self, events):
        """Replace all of this bot's events. Each item is a dict of make_event() arguments."""
        evs = [make_event(**e) for e in events]
        ids = [e["id"] for e in evs]
        if len(ids) != len(set(ids)):
            raise PlannerError("duplicate event ids")
        evs.sort(key=lambda e: (e["date"], e.get("start", "")))
        return self._update(lambda _: evs, f"set {len(evs)} events")

    def clear(self):
        return self._update(lambda _: [], "clear")

    def prune(self, keep_days=30):
        """Drop one-off events that ended more than keep_days ago."""
        cut = (_date.today() - timedelta(days=keep_days)).strftime("%Y-%m-%d")
        keep = lambda e: e.get("repeat") or max(e.get("date", ""), e.get("end_date", "")) >= cut
        return self._update(lambda evs: [e for e in evs if keep(e)], f"prune before {cut}")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Put bot events on the Planner calendar.")
    ap.add_argument("--bot", required=True, help="bot name shown in the app, e.g. Zlarior")
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("add", help="add or update an event")
    a.add_argument("title")
    a.add_argument("date", help="YYYY-MM-DD")
    a.add_argument("--type", default="bots")
    a.add_argument("--start", help="HH:MM (24h); omit for all-day")
    a.add_argument("--end", help="HH:MM (24h)")
    a.add_argument("--end-date", help="last day of a multi-day all-day event")
    a.add_argument("--repeat", default="none", choices=REPEATS)
    a.add_argument("--until", help="last day a repeat can happen")
    a.add_argument("--notes", default="")
    a.add_argument("--id", help="stable id, so re-running updates instead of duplicating")
    r = sub.add_parser("remove", help="remove an event by id")
    r.add_argument("id")
    sub.add_parser("list", help="print this bot's events")
    sub.add_parser("clear", help="remove all of this bot's events")
    p = sub.add_parser("prune", help="drop old one-off events")
    p.add_argument("--keep-days", type=int, default=30)
    args = ap.parse_args(argv)
    try:
        cal = Planner(args.bot)
        if args.cmd == "add":
            changed = cal.add(args.title, args.date, type=args.type, start=args.start, end=args.end, end_date=args.end_date,
                              repeat=args.repeat, until=args.until, notes=args.notes, id=args.id)
        elif args.cmd == "remove":
            changed = cal.remove(args.id)
        elif args.cmd == "clear":
            changed = cal.clear()
        elif args.cmd == "prune":
            changed = cal.prune(args.keep_days)
        else:
            print(json.dumps(cal.events(), indent=1, ensure_ascii=False))
            return 0
        print("updated" if changed else "no change")
        return 0
    except PlannerError as e:
        print(f"planner: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
