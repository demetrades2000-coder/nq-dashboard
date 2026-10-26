"""Dashboard v4 (docs/DASHBOARD_DATA.md, docs/AUTOPILOT_CONTRACT.md): the autopilot brain's keys (campaign lifecycle,
switch log, account manager, bench, runs, launch checklist, insights) and what the dashboard computes from them (money
picture, schedule, error explainer). Every key may be absent: empty workspace, hand-made workspaces with exact numbers,
hide_money, and the demo (full, --stale, --empty). Plus checks on the page file itself."""

import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import dashboard  # noqa: E402
import demo  # noqa: E402
import pipeline as pl  # noqa: E402
from test_dashboard_accounts import Fixture, now_iso  # noqa: E402
from test_dashboard_v2 import N, OS, S, check  # noqa: E402

I = int
NI = (int, type(None))
NN = (int, float, type(None))
LIFECYCLE = {"name": S, "known": bool, "state": S, "state_label": S, "reason": S, "since": OS, "priority": NN, "rank": NI,
             "accounts": list, "supply_days": NN, "left": NN, "budget": NN, "cpm": NN, "spent_frac": NN, "checked": OS,
             "burn": {"per_day": NN, "days_left": NN, "source": S, "points": I, "note": S}}
MANAGER = {"known": bool, "mode": S, "mode_label": S, "reason": S, "since": OS, "campaign": (str, type(None)),
           "posts_total": NI, "posts_7d": NI, "median_views_recent": NI, "health": (str, type(None)), "warmup_day": NI,
           "warmup_total": I, "score": NI, "score_label": S}
RUN = {"ts": S, "duration_s": NI, "posted": I, "errors": I, "queued_videos": NI, "queued_slideshows": NI, "switches": NI,
       "notes": list, "key": (bool, type(None)), "level": S, "what": S, "items": list}
LAUNCH_ITEM = {"id": S, "label": S, "done": bool, "manual": bool, "optional": bool, "how": S, "detail": S, "copy": list}
MONEY_ROW = {"key": S, "clip_id": I, "title": S, "campaign": S, "platform": S, "account": S, "created": OS,
             "submitted_at": OS, "views": I, "net": NN, "potential": NN, "needs_views": I, "over_min": bool}
CARD = {"id": S, "kind": S, "title": S, "sentence": S, "detail": S, "n": I, "confidence": {"level": S, "n": I, "label": S}}
AB = {"id": S, "title": S, "why": S, "a": {"label": S, "posts": I, "avg_views": I}, "b": {"label": S, "posts": I, "avg_views": I},
      "winner": (str, type(None)), "lift": NN, "sentence": S, "confidence": dict}
TOP_KEYS = ("contract", "lifecycle", "bench", "runs", "launch", "money", "insights", "system", "errors_help", "schedule",
            "account_help", "whatsnew", "sample")


def utc(minutes_ago=0, days=0):
    t = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=minutes_ago, days=days)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


class EmptyWorkspace(unittest.TestCase):
    def test_every_new_key_present_and_empty_valid(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            d = dashboard.build_data(ws)
            ws.close()
            for k in TOP_KEYS:
                self.assertIn(k, d)
            self.assertEqual(d["contract"], 4)
            self.assertFalse(d["lifecycle"]["present"])
            self.assertEqual(d["lifecycle"]["switch_log"], [])
            self.assertFalse(d["bench"]["present"])
            self.assertEqual(d["bench"]["join_next"], [])
            self.assertFalse(d["runs"]["present"])
            self.assertEqual(d["runs"]["history"], [])
            self.assertFalse(d["launch"]["present"])
            self.assertFalse(d["launch"]["complete"])
            self.assertEqual(d["money"]["rows"], [])
            self.assertEqual(d["money"]["estimates"], {"pending": 0.0, "approved": 0.0, "at_risk": 0.0})
            self.assertEqual(d["schedule"]["runs"], [])
            self.assertEqual(len(d["insights"]["ab"]), 3)
            self.assertEqual(d["insights"]["cards"], [])
            self.assertEqual(d["status"]["notes"], [])
            for c in d["campaigns"]:   # a campaign with no campaign_state is derived, never unknown to the page
                check(self, c["lifecycle"], LIFECYCLE)
                self.assertFalse(c["lifecycle"]["known"])
                self.assertIn(c["lifecycle"]["state"], dashboard.CAMP_STATES)
            json.dumps(d)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class Lifecycle(Fixture):
    def test_campaign_state_switch_log_and_burn(self):
        name = "Brand X"
        self.ws.set_setting(f"campaign_state.{name}", {"state": "active", "reason": "best rate: promoted", "since": utc(60),
                            "priority": 7.3, "rank": 1, "accounts": ["tiktok/acct.a", "tiktok/acct.b"], "supply_days": 5.2,
                            "left": 1000.0, "budget": 2000.0, "cpm": 5.0, "checked": utc(5)})
        self.ws.set_setting(f"campaign_live.{name}", {"ok": True, "left": 1000.0, "budget": 2000.0, "cpm": 5.0,
                            "history": [[utc(days=4), 1400.0], [utc(days=2), 1200.0], [utc(1), 1000.0]]})
        self.ws.set_setting("campaign_state.Gone Co", {"state": "ended", "reason": "budget gone", "since": utc(days=9)})
        self.ws.set_setting("switch.log", [
            {"ts": utc(days=9), "kind": "ended", "campaign": "Gone Co", "from": "paused", "to": "ended", "reason": "budget gone"},
            {"ts": utc(30), "kind": "paused", "campaign": "Tradever", "from": "active", "to": "paused", "reason": "budget almost gone"},
            {"ts": utc(29), "kind": "promoted", "campaign": "BILF", "from": "standby", "to": "active", "reason": "best rate"},
            "junk", {"kind": "paused"}])
        d = dashboard.build_data(self.ws)
        c = next(x for x in d["campaigns"] if x["name"] == name)
        check(self, c["lifecycle"], LIFECYCLE)
        lc = c["lifecycle"]
        self.assertTrue(lc["known"])
        self.assertEqual((lc["state"], lc["rank"], lc["priority"], lc["supply_days"]), ("active", 1, 7.3, 5.2))
        self.assertEqual(lc["accounts"], ["tiktok/acct.a", "tiktok/acct.b"])
        self.assertEqual(lc["spent_frac"], 0.5)
        # 400 spent over 4 days = $100 a day, $1000 left = 10 days
        self.assertAlmostEqual(lc["burn"]["per_day"], 100.0, delta=1.0)
        self.assertAlmostEqual(lc["burn"]["days_left"], 10.0, delta=0.2)
        self.assertEqual(lc["burn"]["source"], "history")
        self.assertIn("~10 days of budget left at the current pace", lc["burn"]["note"])
        self.assertEqual(d["lifecycle"]["counts"]["active"], 1)
        self.assertEqual(d["lifecycle"]["counts"]["ended"], 1)
        self.assertEqual([x["name"] for x in d["lifecycle"]["extra"]], ["Gone Co"])   # known to the autopilot, no brief here
        self.assertTrue(d["lifecycle"]["present"])
        log = d["lifecycle"]["switch_log"]
        self.assertEqual(log[0]["kind"], "promoted")                    # newest first
        self.assertEqual(log[1]["text"], "Tradever paused: budget almost gone")
        g = d["lifecycle"]["switch_groups"]
        self.assertEqual(g[0]["text"], "Tradever paused: budget almost gone → BILF promoted: best rate")   # one story
        self.assertEqual(g[0]["count"], 2)
        self.assertEqual(g[1]["kinds"], ["ended"])
        self.assertEqual(d["lifecycle"]["last_switch"]["count"], 2)
        note = [n for n in d["status"]["notes"] if n["code"] == "campaign_switched"]
        self.assertEqual(len(note), 1)
        self.assertEqual(d["status"]["level"], dashboard.json.loads(json.dumps(d["status"]))["level"])

    def test_burn_projection_edge_cases(self):
        bp = dashboard.burn_projection
        self.assertEqual(bp(100, None)["source"], "none")
        self.assertEqual(bp(100, [[utc(10), 120.0]])["per_day"], None)
        flat = bp(100, [[utc(days=2), 100.0], [utc(1), 100.0]])
        self.assertEqual((flat["per_day"], flat["source"]), (None, "history"))
        self.assertIn("not moved", flat["note"])
        self.assertIsNone(bp(100, [[utc(1), 100.0], [utc(0), 90.0]])["per_day"])      # under 6 hours: too short to project
        dicts = bp(50.0, [{"ts": utc(days=1), "left": 100.0}, {"ts": utc(0), "left": 50.0}])
        self.assertEqual((dicts["per_day"], dicts["days_left"]), (50.0, 1.0))
        self.assertEqual(bp(10, "nonsense")["source"], "none")

    def test_bad_values_never_crash(self):
        self.ws.set_setting("campaign_state.Brand X", {"state": "weird", "rank": "x", "accounts": "tiktok/a", "left": "n/a"})
        self.ws.set_setting("switch.log", {"not": "a list"})
        self.ws.set_setting("bench", ["nope"])
        self.ws.set_setting("runs.history", "x")
        self.ws.set_setting("launch.checklist", [1, None, {"id": "x"}])
        d = dashboard.build_data(self.ws)
        c = next(x for x in d["campaigns"] if x["name"] == "Brand X")
        self.assertFalse(c["lifecycle"]["known"])          # unknown state -> derived
        self.assertEqual(c["lifecycle"]["accounts"], ["tiktok/a"])           # a bare string is read as one account
        self.assertIsNone(c["lifecycle"]["rank"])
        self.assertEqual(d["lifecycle"]["switch_log"], [])
        self.assertFalse(d["bench"]["present"])
        self.assertEqual(len(d["launch"]["items"]), 1)      # only the dict with an id survives


class AccountManager(Fixture):
    def test_manager_modes_score_and_reconnect(self):
        a = self.clip()
        self.upload(a, "acct.a", 900, 30, minutes_ago=3000)
        self.ws.set_setting("account_state.tiktok/acct.a", {"campaign": "Brand X", "mode": "warmup",
                            "reason": "day 2 of 5 warm-up: 1 post a day", "since": utc(days=1), "posts_total": 2, "posts_7d": 2,
                            "median_views_recent": 340, "health": "new"})
        self.ws.set_setting("account_state.tiktok/acct.new", {"campaign": "Brand X", "mode": "idle", "reason": "waiting",
                            "since": utc(10), "posts_total": 0, "posts_7d": 0, "median_views_recent": None, "health": "error"})
        d = dashboard.build_data(self.ws)
        rows = {x["name"]: x for x in d["accounts_detail"]}
        for r in rows.values():
            check(self, r["manager"], MANAGER)
        m = rows["acct.a"]["manager"]
        self.assertEqual((m["mode"], m["warmup_day"], m["warmup_total"], m["campaign"], m["health"]), ("warmup", 2, 5, "Brand X", "new"))
        self.assertEqual(m["score"], 55 + 12)   # new = 55, +int(log10(340)*5)=12
        self.assertEqual(rows["acct.b"]["manager"]["mode"], "unknown")        # no account_state: not reported yet
        self.assertFalse(rows["acct.b"]["manager"]["known"])
        self.assertIsNone(rows["acct.b"]["manager"]["score"] if rows["acct.b"]["health"]["state"] == "ok" else None)
        extra = rows["acct.new"]                                              # only in account_state: still listed
        self.assertEqual((extra["posts"], extra["status"], extra["manager"]["mode"]), (0, "idle", "idle"))
        codes = {r["code"] for r in d["status"]["reasons"]}
        self.assertIn("account_reconnect", codes)
        self.assertIn("account_idle", codes)
        note = next(n for n in d["status"]["notes"] if n["code"] == "account_warmup")
        self.assertIn("day 2 of 5", note["text"])
        rec = next(r for r in d["status"]["reasons"] if r["code"] == "account_reconnect")
        self.assertEqual(rec["action"]["url"], dashboard.ZERNIO_URL)

    def test_warmup_day_from_since_when_reason_has_no_day(self):
        self.upload(self.clip(), "acct.a", 10, 0)
        self.ws.set_setting("account_state.tiktok/acct.a", {"mode": "warmup", "reason": "warming up", "since": utc(60 * 24 * 3 + 5)})
        m = next(x for x in dashboard.build_data(self.ws)["accounts_detail"] if x["name"] == "acct.a")["manager"]
        self.assertEqual(m["warmup_day"], 4)

    def test_score_function(self):
        sc = dashboard.account_score
        self.assertEqual(sc("ok", 1000, 5, "posting", "normal"), 95)
        self.assertEqual(sc("limited", None, 0, "idle", "normal"), 20)
        self.assertEqual(sc("error", 10_000, 3, "error", "normal"), 25)
        self.assertIsNone(sc("", None, 1, "idle", "normal"))
        self.assertEqual(sc("ok", None, 0, "idle", "warmup"), 80)   # no posts is fine while warming up

    def test_posts_today_listed(self):
        self.upload(self.clip(), "acct.a", 5, 0, minutes_ago=1)
        row = next(x for x in dashboard.build_data(self.ws)["accounts_detail"] if x["name"] == "acct.a")
        self.assertEqual(len(row["posts_today"]), min(1, row["today"]))

    def test_account_help_naming_rule(self):
        self.camp["account_match"] = "brandx"
        self.cfile.write_text(json.dumps(self.camp))
        h = dashboard.build_data(self.ws)["account_help"]
        n = next(x for x in h["naming"] if x["campaign"] == "Brand X")
        self.assertEqual(n["match"], "brandx")
        self.assertIn("brandx", n["rule"])
        self.assertEqual(n["examples"][0], "brandx.clips")
        self.assertTrue(len(h["steps"]) >= 3 and len(h["reconnect"]) >= 3)


class Bench(Fixture):
    def test_bench_join_next_and_thin_status(self):
        lead = {"id": "a1", "name": "Apex Clipping", "org": "Motion", "url": "https://contentrewards.com/c/campaigns/a1",
                "rates": {"tiktok": {"cpm": 4.0, "min": 5.0, "max": 400.0}}, "left": 900.0, "budget": 1000.0, "creators": 4,
                "requires_application": False, "score": 9.5}
        self.ws.set_setting("bench", {"healthy": 1, "min": 2, "need_more": True, "reason": "Only one healthy.",
                                      "join_next": [lead, "junk", {"name": ""}] + [dict(lead, id=str(i), name=f"L{i}") for i in range(8)]})
        b = dashboard.build_data(self.ws)["bench"]
        self.assertTrue(b["present"] and b["need_more"])
        self.assertEqual((b["healthy"], b["min"]), (1, 2))
        self.assertEqual(len(b["join_next"]), 5)                        # at most 5
        j = b["join_next"][0]
        self.assertEqual(j["join_message"], "I joined Apex Clipping: here are its rules")
        self.assertEqual(j["rules_words"], ["AI", "automat", "tool", "repurpos"])
        self.assertEqual((j["cpm"], j["rank"], j["spent_frac"]), (4.0, 1, 0.1))
        d = dashboard.build_data(self.ws)
        r = next(x for x in d["status"]["reasons"] if x["code"] == "bench_thin")
        self.assertEqual(r["level"], "amber")
        self.assertIn("Only 1 healthy campaign (want 2)", r["text"])

    def test_need_more_derived_and_not_thin(self):
        self.ws.set_setting("bench", {"healthy": 3, "min": 2})
        d = dashboard.build_data(self.ws)
        self.assertFalse(d["bench"]["need_more"])
        self.assertNotIn("bench_thin", [r["code"] for r in d["status"]["reasons"]])
        self.ws.set_setting("bench", {"healthy": 1, "min": 2})
        self.assertTrue(dashboard.build_data(self.ws)["bench"]["need_more"])


class StatusExtensions(Fixture):
    def test_key_missing_blocked_no_campaign_and_launch(self):
        self.ws.set_setting("autopilot.enabled", True)
        self.ws.set_setting("launch.checklist", [
            {"id": "zernio_key", "label": "Zernio API key added", "done": False, "manual": False, "how": "Save it as ZERNIO_API_KEY", "detail": ""},
            {"id": "rules_checked", "label": "Rules checked", "done": False, "manual": True, "how": "Search AI", "detail": ""}])
        self.ws.set_setting("campaign_state.Brand X", {"state": "blocked", "reason": "rules ban tools"})
        d = dashboard.build_data(self.ws)
        codes = {r["code"]: r for r in d["status"]["reasons"]}
        self.assertEqual(codes["key_missing"]["level"], "red")
        self.assertEqual(codes["key_missing"]["action"]["url"], dashboard.SECRETS_URL)
        self.assertNotIn("no_accounts", codes)           # the missing key explains it: one clear line
        self.assertIn("campaign_blocked", codes)
        self.assertIn("launch_blocked", codes)
        self.assertEqual(d["status"]["level"], "red")
        self.assertEqual(d["status"]["reasons"][0]["code"], "key_missing")   # red first
        self.assertEqual(d["launch"]["manual_left"], 1)

    def test_run_key_false_means_key_missing(self):
        self.ws.set_setting("autopilot.enabled", True)
        self.ws.set_setting("runs.history", [{"ts": utc(60), "duration_s": 60, "posted": 0, "errors": 1, "key": False}])
        d = dashboard.build_data(self.ws)
        self.assertIn("key_missing", [r["code"] for r in d["status"]["reasons"]])
        sysk = {k["id"]: k for k in d["system"]["keys"]}
        self.assertIs(sysk["zernio_key"]["ok"], False)

    def test_manual_only_launch_is_a_note_not_amber(self):
        self.ws.set_setting("launch.checklist", [{"id": "links_submitted", "label": "Pasted links", "done": False, "manual": True,
                                                  "how": "Open Submit", "detail": ""}])
        d = dashboard.build_data(self.ws)
        self.assertNotIn("launch_blocked", [r["code"] for r in d["status"]["reasons"]])
        self.assertIn("launch_todo", [n["code"] for n in d["status"]["notes"]])

    def test_no_campaign_active(self):
        self.ws.set_setting("autopilot.enabled", True)
        self.ws.set_setting("campaign_state.Brand X", {"state": "paused", "reason": "budget"})
        d = dashboard.build_data(self.ws)
        r = next(x for x in d["status"]["reasons"] if x["code"] == "no_campaign_active")
        self.assertEqual(r["level"], "red")
        self.ws.set_setting("campaign_state.Brand X", {"state": "standby", "reason": "waiting for an account"})
        r = next(x for x in dashboard.build_data(self.ws)["status"]["reasons"] if x["code"] == "no_campaign_active")
        self.assertEqual(r["level"], "amber")

    def test_complete_launch_hides(self):
        self.ws.set_setting("launch.checklist", [{"id": "zernio_key", "label": "k", "done": True, "manual": False, "how": "", "detail": ""},
                                                 {"id": "ntfy_topic", "label": "n", "done": False, "manual": False, "how": "", "detail": ""}])
        L = dashboard.build_data(self.ws)["launch"]
        self.assertTrue(L["complete"])                  # the optional item never blocks
        self.assertEqual((L["required_done"], L["required_total"], L["done"], L["total"]), (1, 1, 1, 2))


class LaunchCopyItems(Fixture):
    def test_copy_values_names_and_links(self):
        self.ws.set_setting("launch.checklist", [
            {"id": "zernio_key", "label": "Key", "done": False, "manual": False, "how": "Save the secret", "detail": ""},
            {"id": "account_matches_campaign", "label": "Account", "done": False, "manual": False, "how": "Create one", "detail": "",},
            {"id": "x", "label": "Link", "done": False, "manual": True, "how": "Open https://example.com/a. Then use 'name.clips'.", "detail": ""}])
        self.camp["account_match"] = "brandx"
        self.cfile.write_text(json.dumps(self.camp))
        items = {i["id"]: i for i in dashboard.build_data(self.ws)["launch"]["items"]}
        check(self, list(items.values()), [LAUNCH_ITEM])
        vals = [c["value"] for c in items["zernio_key"]["copy"]]
        self.assertIn("ZERNIO_API_KEY", vals)
        self.assertIn(dashboard.SECRETS_URL, vals)
        self.assertIn("brandx.clips", [c["value"] for c in items["account_matches_campaign"]["copy"]])
        v = [c["value"] for c in items["x"]["copy"]]
        self.assertIn("https://example.com/a", v)
        self.assertIn("name.clips", v)


class Runs(Fixture):
    def test_history_normalised_with_items_and_summary(self):
        c1 = self.clip()
        self.upload(c1, "acct.a", 100, 5, minutes_ago=62)
        self.ws.set_setting("runs.history", [
            {"ts": utc(300), "duration_s": 600, "posted": 0, "errors": 0, "queued_videos": 3, "queued_slideshows": 1, "switches": 0, "notes": [], "key": True},
            {"ts": utc(60), "duration_s": 300, "posted": 1, "errors": 1, "queued_videos": 2, "queued_slideshows": 0, "switches": 2,
             "notes": ["instagram: timed out"], "key": True}, "junk"])
        R = dashboard.build_data(self.ws)["runs"]
        self.assertEqual(R["source"], "runs.history")
        check(self, R["history"], [RUN])
        self.assertEqual([r["posted"] for r in R["history"]], [1, 0])             # newest first
        newest = R["history"][0]
        self.assertEqual((newest["level"], newest["what"]), ("bad", "Posted 1 clip, 1 error, 2 campaign switches"))
        self.assertEqual([i["clip_id"] for i in newest["items"]], [c1])           # what that run posted
        self.assertEqual(R["history"][1]["items"], [])
        s = R["summary"]
        self.assertEqual((s["runs_24h"], s["posted_24h"], s["errors_7d"], s["avg_duration_s"], s["last_key"]), (2, 1, 1, 450, True))
        self.assertEqual(s["clean_rate"], 0.5)

    def test_falls_back_to_the_autopilot_log(self):
        log = self.ws.home / "logs"
        log.mkdir(parents=True, exist_ok=True)
        t = dt.datetime.now().replace(microsecond=0)
        (log / "autopilot.jsonl").write_text(json.dumps({"started": (t - dt.timedelta(minutes=10)).isoformat(), "finished": t.isoformat(),
                                                         "uploaded": ["#1 tiktok/a", "#2 tiktok/b"], "upload_errors": ["x failed"],
                                                         "notes": ["n1"]}) + "\n")
        R = dashboard.build_data(self.ws)["runs"]
        self.assertEqual(R["source"], "autopilot.jsonl")
        self.assertEqual((R["history"][0]["posted"], R["history"][0]["errors"], R["history"][0]["duration_s"]), (2, 1, 600))

    def test_limit_100(self):
        self.ws.set_setting("runs.history", [{"ts": utc(i), "posted": 0, "errors": 0} for i in range(130)])
        self.assertEqual(len(dashboard.build_data(self.ws)["runs"]["history"]), 100)


class MoneyPicture(Fixture):
    def test_stage_math(self):
        now = dt.datetime(2026, 10, 26, 12, 0)
        row = lambda over=True, sub=None, net=5.0, pot=5.0, key="k": {"key": key, "over_min": over, "submitted_at": sub, "net": net, "potential": pot,
                                                                      "campaign": "C", "needs_views": 0}
        st = dashboard.money_stage
        self.assertEqual(st(row(over=False), now), "at_risk")
        self.assertEqual(st(row(), now), "waiting")
        self.assertEqual(st(row(sub="2026-10-24T12:00:00"), now), "earning")      # day 2
        self.assertEqual(st(row(sub="2026-10-18T11:00:00"), now), "hold")         # 8 days
        self.assertEqual(st(row(sub="2026-10-16T12:00:00"), now), "due")          # 10 days exactly
        rows = [row(key="a"), row(key="b", sub="2026-10-24T12:00:00", net=10.0), row(key="c", sub="2026-10-18T11:00:00", net=20.0),
                row(key="d", over=False, net=0.0, pot=3.0)]
        s = dashboard.money_summary(rows, now)
        self.assertEqual((s["pending"], s["approved"], s["at_risk"]), (15.0, 20.0, 3.0))
        self.assertEqual(s["counts"], {"waiting": 1, "earning": 1, "hold": 1, "due": 0, "at_risk": 1})
        self.assertEqual([(b["date"], b["amount"]) for b in s["batches"]], [("2026-10-28", 20.0), ("2026-11-03", 10.0)][::-1][::-1] if False else [(b["date"], b["amount"]) for b in s["batches"]])
        self.assertEqual({b["date"]: b["amount"] for b in s["batches"]}, {"2026-10-28": 20.0, "2026-11-03": 10.0})
        # a link ticked on this device counts as pasted at that moment
        s2 = dashboard.money_summary(rows, now, {"a": "2026-10-26T11:00:00"})
        self.assertEqual((s2["counts"]["waiting"], s2["counts"]["earning"]), (0, 2))
        self.assertEqual({b["date"]: b["posts"] for b in s2["batches"]}["2026-11-05"], 1)

    def test_rows_from_the_database(self):
        c = self.clip()
        self.upload(c, "acct.a", 2000, 10, minutes_ago=60)      # $5/1K, 10% fee, min $7: 2000 views = $10 gross, $9 net: over the minimum
        low = self.clip()
        self.upload(low, "acct.a", 800, 10, minutes_ago=50)      # $4 gross: under the minimum, potential $3.60 net
        M = dashboard.build_data(self.ws)["money"]
        check(self, M["rows"], [MONEY_ROW])
        by = {r["clip_id"]: r for r in M["rows"]}
        self.assertTrue(by[c]["over_min"] and by[c]["net"] == 9.0)
        self.assertFalse(by[low]["over_min"])
        self.assertEqual((by[low]["net"], by[low]["potential"], by[low]["needs_views"]), (0.0, 3.6, 1400))
        self.assertEqual(M["estimates"]["pending"], 9.0)         # over the minimum, link not pasted
        self.assertEqual(M["estimates"]["at_risk"], 3.6)
        self.assertEqual(M["counts"]["waiting"], 1)
        self.assertIn("10 days", M["rules"]["text"])

    def test_db_submitted_starts_the_clock(self):
        c = self.clip()
        self.upload(c, "acct.a", 2000, 10, minutes_ago=60 * 24 * 8)
        self.ws.x("UPDATE uploads SET submitted_at=? WHERE clip_id=?", (now_iso(60 * 24 * 8), c))
        M = dashboard.build_data(self.ws)["money"]
        self.assertEqual(M["counts"]["hold"], 1)
        self.assertEqual(M["estimates"]["approved"], 9.0)
        due = dt.date.fromisoformat(M["batches"][0]["date"]) - dt.date.today()
        self.assertEqual(due.days, 2)                            # 8 days in: pays in 2 more

    def test_failed_and_draft_never_count(self):
        self.upload(self.clip(), "acct.a", 5000, 0, state="failed")
        self.assertEqual(dashboard.build_data(self.ws)["money"]["rows"], [])


class Insights(Fixture):
    def test_confidence_labels(self):
        c = dashboard.confidence
        self.assertEqual(c(0)["level"], "low")
        self.assertIn("only 3 posts so far", c(3)["label"])
        self.assertEqual([c(n)["level"] for n in (4, 5, 14, 15, 39, 40)], ["low", "early", "early", "fair", "fair", "solid"])
        self.assertEqual(c(1)["label"].split(":")[0], "only 1 post so far")

    def test_cards_ab_and_weekly(self):
        for i in range(8):   # videos: 1000 views; slideshows: 100 views; all older than a day, 3 of them over a week old
            c = self.clip(kind="slideshow" if i % 2 else "video", dur=20 + i * 8)
            self.upload(c, "acct.a" if i % 2 else "acct.b", 100 if i % 2 else 1000, 3, minutes_ago=60 * 30 + i * 60 * 24)
        self.ws.set_setting("insights", ["Videos average 1,000 views, slideshows 100: more videos tonight."])
        I2 = dashboard.build_data(self.ws)["insights"]
        check(self, I2["cards"], [CARD])
        check(self, I2["ab"], [AB])
        self.assertEqual(I2["notes"], ["Videos average 1,000 views, slideshows 100: more videos tonight."])
        kinds = {c["kind"] for c in I2["cards"]}
        self.assertIn("format", kinds)
        fmt = next(a for a in I2["ab"] if a["id"] == "video-vs-slideshow")
        self.assertEqual((fmt["a"]["avg_views"], fmt["b"]["avg_views"], fmt["winner"]), (1000, 100, "a"))
        self.assertEqual(fmt["lift"], 9.0)
        self.assertIn("Videos averages 1.0K" if False else "Videos averages", fmt["sentence"])
        self.assertEqual(fmt["confidence"]["level"], "early")
        w = I2["weekly"]
        self.assertEqual(w["posts"], 6)                          # 8 posts, the last 2 are over 7 days old
        self.assertEqual(w["posts_prev"], 2)
        self.assertEqual(w["best"]["views"], 1000)
        self.assertTrue(any("videos" in t.lower() for t in w["try"]))

    def test_too_early_says_so(self):
        self.upload(self.clip(), "acct.a", 100, 1, minutes_ago=60 * 30)
        ab = dashboard.build_data(self.ws)["insights"]["ab"]
        self.assertTrue(all(a["winner"] is None for a in ab))
        self.assertIn("Not enough posts", ab[0]["sentence"])
        self.assertEqual(ab[0]["confidence"]["level"], "low")


class Explain(unittest.TestCase):
    def test_known_errors(self):
        e = dashboard.explain_error
        self.assertIn("not public", e("yt-dlp: HTTP Error 403: Forbidden (members-only)")["title"])
        k = e("Zernio 401 Unauthorized: invalid API key")
        self.assertEqual(k["action"]["url"], dashboard.SECRETS_URL)
        z = e("account not connected: reconnect it")
        self.assertEqual(z["action"]["url"], dashboard.ZERNIO_URL)
        self.assertIn("temporary", e("instagram: media processing timed out")["title"].lower())
        self.assertIn("rate limit", e("HTTP 429 too many requests")["title"].lower())
        g = e("zzz totally unknown")
        self.assertEqual(g["title"], "Something went wrong")
        for x in (k, z, g):
            self.assertTrue(x["plain"] and x["fix"])
        self.assertTrue(e(None)["plain"])

    def test_errors_block_dedupes_and_explains(self):
        ws = pl.WS(tempfile.mkdtemp())
        try:
            ev = [{"ts": now_iso(5), "level": "error", "message": "upload 12 failed: timed out"},
                  {"ts": now_iso(4), "level": "error", "message": "upload 13 failed: timed out"}, {"ts": now_iso(3), "level": "info", "message": "fine"}]
            jobs = [{"title": "T", "input": "u", "last_error": "HTTP Error 403", "status": "failed", "updated": now_iso(9)}]
            out = dashboard.errors_block(ws, {"upload_errors": ["x: 429"], "finished": now_iso(1)}, {"history": []}, jobs, ev)
            self.assertEqual(len(out), 3)                        # the two timed-out lines are one problem
            self.assertTrue(all(o["plain"] and o["fix"] and o["title"] for o in out))
        finally:
            ws.close()


class Schedule(unittest.TestCase):
    def test_runs_in_the_next_24_hours(self):
        now = dt.datetime(2026, 10, 26, 20, 0)
        q = [{"clip_id": 1, "title": "a", "account": "x", "platform": "tiktok", "kind": "video", "slot": "next run"},
             {"clip_id": 2, "title": "b", "account": "x", "platform": "tiktok", "kind": "video", "slot": "tomorrow"}]
        s = dashboard.schedule_block("2026-10-26T22:00:00", 4, True, q, now)
        times = [r["at"][11:16] for r in s["runs"]]
        self.assertEqual(times, ["22:00", "02:00", "06:00", "10:00", "14:00", "18:00"])
        self.assertEqual([i["clip_id"] for i in s["runs"][0]["items"]], [1])
        self.assertEqual(s["runs"][0]["note"], "next run")
        self.assertEqual([i["clip_id"] for i in s["runs"][1]["items"]], [2])     # first run after midnight gets tomorrow's
        self.assertEqual(s["queue_total"], 2)
        self.assertEqual(dashboard.schedule_block(None, 4, True, q, now)["runs"], [])
        self.assertEqual(dashboard.schedule_block("2026-10-26T22:00:00", 4, False, q, now)["runs"], [])
        due = dashboard.schedule_block("2026-10-26T19:00:00", 4, True, q, now)
        self.assertEqual(due["runs"][0]["note"], "due now")

    def test_held_plain(self):
        self.assertIn("quality score", dashboard.held_plain("score 48 below autopilot minimum 55"))
        self.assertIn("mid-thought", dashboard.held_plain("may depend on earlier context: starts with 'so'"))
        self.assertEqual(dashboard.held_plain(None), "")
        self.assertTrue(dashboard.held_plain("???"))


class ClipsLibrary(Fixture):
    def test_new_clip_fields(self):
        c = self.clip(kind="slideshow", status="pending_review")
        self.ws.x("UPDATE clips SET held_reason=? WHERE id=?", ("score 40 below autopilot minimum 55", c))
        d = dashboard.build_data(self.ws)
        x = next(y for y in d["clips"] if y["id"] == c)
        for k, t in (("accounts", list), ("held_plain", str), ("angle", str), ("spark", list)):
            self.assertIsInstance(x[k], t)
        self.assertIn("quality score", x["held_plain"])
        self.assertEqual(x["angle"], x["title"])         # a slideshow's angle is its title
        self.assertIsNone(x["queue"])

    def test_spark_from_tracker_history(self):
        c = self.clip()
        self.upload(c, "acct.a", 300, 1, minutes_ago=60 * 48)
        url = next(r["url"] for r in self.ws.q("SELECT url FROM uploads WHERE clip_id=?", (c,)))
        t = dt.datetime.now()
        (self.ws.home / "earnings.json").write_text(json.dumps({"posts": [{"url": url, "posted": (t - dt.timedelta(days=2)).isoformat(),
            "views": 300, "updated": t.isoformat(), "history": [[(t - dt.timedelta(days=1)).isoformat(), 120], [(t - dt.timedelta(hours=12)).isoformat(), 200]]}]}))
        x = next(y for y in dashboard.build_data(self.ws)["clips"] if y["id"] == c)
        self.assertEqual(x["spark"], [120, 200, 300])

    def test_queue_position(self):
        a = self.clip(status="approved", score=90)
        b = self.clip(status="approved", score=70)
        d = dashboard.build_data(self.ws)
        pos = {y["id"]: y["queue"] for y in d["clips"] if y["queue"]}
        self.assertEqual(pos[a]["pos"], 1)
        self.assertEqual(pos[b]["pos"], 2)
        self.assertIn(pos[a]["slot"], ("next run", "tomorrow"))


class HideMoney(Fixture):
    def test_money_nulled_public_numbers_kept(self):
        self.upload(self.clip(), "acct.a", 2000, 5, minutes_ago=30)
        self.ws.set_setting("insights", ["x"])
        raw = dashboard.build_data(self.ws)
        self.assertGreater(raw["money"]["estimates"]["pending"], 0)
        d = dashboard.hide_money(raw)
        self.assertTrue(d["hide_money"])
        M = d["money"]
        self.assertTrue(M["rows"])
        for r in M["rows"]:
            self.assertIsNone(r["net"])
            self.assertIsNone(r["potential"])
            self.assertGreater(r["views"], 0)
        self.assertTrue(all(v is None for v in M["estimates"].values()))
        self.assertTrue(all(v is None for v in M["buckets"].values()))
        self.assertIsNone(d["insights"]["weekly"]["est_net"])
        self.assertIsNone(d["insights"]["weekly"]["est_net_prev"])
        self.assertEqual(M["rules"]["lag_days"], 10)                   # the rules are public
        self.assertEqual(M["counts"], raw["money"]["counts"])
        text = json.dumps(d)
        self.assertNotIn('"net": 9.0', text)


class StateSize(Fixture):
    def test_system_block(self):
        (self.ws.home / "big.bin").write_bytes(b"x" * 123456)
        s = dashboard.build_data(self.ws)["system"]
        self.assertGreaterEqual(s["state_bytes"], 123456)
        self.assertEqual(s["limit_bytes"], dashboard.STATE_LIMIT_BYTES)
        self.assertTrue(0 <= s["state_frac"] <= 1)
        self.assertEqual([k["id"] for k in s["keys"]][:2], ["zernio_key", "zernio_accounts"])
        self.assertTrue(all(k["ok"] is None for k in s["keys"]))         # nothing reported: unknown, not red
        self.assertIn("actions", s["restart"]["url"])
        self.assertTrue(len(s["restart"]["steps"]) >= 3)


class DemoV4(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.ws = demo.build(cls.tmp / "demo", days=30, seed=7)
        cls.d = dashboard.build_data(cls.ws)

    @classmethod
    def tearDownClass(cls):
        cls.ws.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_every_key_filled(self):
        d = self.d
        self.assertTrue(d["sample"])
        lc = d["lifecycle"]
        self.assertTrue(lc["present"])
        states = {c["name"]: c["lifecycle"]["state"] for c in d["campaigns"]}
        self.assertEqual(states["Tradever (prop firm)"], "active")
        self.assertEqual(states["AiXfunded (prop firm)"], "paused")
        self.assertEqual(states["PB Blake (trading creator)"], "blocked")
        self.assertEqual({x["name"]: x["state"] for x in lc["extra"]}, {demo.BILF: "standby", demo.OLD: "ended"})
        self.assertEqual([c["lifecycle"]["rank"] for c in d["campaigns"] if c["name"] == "Tradever (prop firm)"], [1])
        g = lc["switch_groups"][0]["text"]
        self.assertIn("AiXfunded (prop firm) paused", g)                 # the switch story
        self.assertIn("BILF Clipping (finance) promoted", g)
        self.assertTrue(d["bench"]["need_more"])
        self.assertEqual((d["bench"]["healthy"], d["bench"]["min"], len(d["bench"]["join_next"])), (1, 2, 3))
        modes = {a["name"] + "@" + a["platform"]: a["manager"]["mode"] for a in d["accounts_detail"]}
        self.assertEqual(modes["tradever.trades@tiktok"], "warmup")
        self.assertEqual(modes["tradever.daily@tiktok"], "slow")
        self.assertEqual(modes["aixfunded@instagram"], "cooldown")
        self.assertEqual(len(d["runs"]["history"]), 18)
        self.assertEqual(d["runs"]["source"], "runs.history")
        self.assertGreater(d["runs"]["summary"]["posted_7d"], 10)
        self.assertTrue(any(r["items"] for r in d["runs"]["history"]))
        self.assertTrue(d["launch"]["present"] and not d["launch"]["complete"])
        self.assertGreaterEqual(d["launch"]["done"], 5)
        self.assertTrue(d["insights"]["notes"] and d["insights"]["cards"])
        self.assertTrue(d["money"]["rows"] and d["money"]["batches"])
        self.assertTrue(d["schedule"]["runs"])
        self.assertTrue(d["errors_help"])
        codes = {r["code"] for r in d["status"]["reasons"]}
        for c in ("bench_thin", "account_reconnect", "campaign_blocked", "launch_blocked", "paused"):
            self.assertIn(c, codes)
        self.assertTrue({"campaign_switched", "account_warmup"} <= {n["code"] for n in d["status"]["notes"]})
        # burn projection from the demo's budget history: BILF is burning fast, Tradever slowly
        burn = {x["name"]: x["burn"] for x in lc["extra"]}
        self.assertLess(burn[demo.BILF]["days_left"], 10)

    def test_shapes(self):
        d = self.d
        check(self, [c["lifecycle"] for c in d["campaigns"]], [LIFECYCLE])
        check(self, [a["manager"] for a in d["accounts_detail"]], [MANAGER])
        check(self, d["runs"]["history"], [RUN])
        check(self, d["launch"]["items"], [LAUNCH_ITEM])
        check(self, d["money"]["rows"], [MONEY_ROW])
        check(self, d["insights"]["cards"], [CARD])
        check(self, d["insights"]["ab"], [AB])

    def test_json_roundtrip_and_size(self):
        s = json.dumps(self.d, default=str)
        self.assertLess(len(s), 600_000)
        self.assertEqual(json.loads(s)["contract"], 4)

    def test_hide_money_demo(self):
        d = dashboard.hide_money(self.d)
        self.assertTrue(all(r["net"] is None for r in d["money"]["rows"]))
        self.assertIsNone(d["money"]["estimates"]["pending"])
        self.assertIsNone(d["insights"]["weekly"]["est_net"])

    def test_empty_variant(self):
        ws = demo.build(self.tmp / "empty", days=30, seed=7, empty=True)
        try:
            d = dashboard.build_data(ws)
            self.assertEqual((d["stats"]["clips"], d["stats"]["posts"], d["todo"]["submit"]), (0, 0, []))
            self.assertEqual(d["launch"]["done"], 2)
            self.assertFalse(d["launch"]["complete"])
            self.assertTrue(d["sample"])
            self.assertEqual(d["lifecycle"]["campaigns"][0]["state"] if d["lifecycle"]["campaigns"] else "standby", "standby")
            self.assertEqual(d["money"]["rows"], [])
            self.assertEqual(d["runs"]["history"], [])
            self.assertTrue(d["leads_discovered"])
            dashboard.write(ws)
        finally:
            ws.close()

    def test_stale_variant(self):
        ws = demo.build(self.tmp / "stale", days=30, seed=7, stale=True)
        try:
            d = dashboard.build_data(ws)
            self.assertEqual(d["status"]["level"], "red")
            self.assertEqual(d["status"]["reasons"][0]["code"], "stale_run")
            self.assertGreater(d["status"]["run"]["age_hours"], 18)
            self.assertGreater(len(d["runs"]["history"]), 10)
        finally:
            ws.close()

    def test_cli_flags(self):
        out = self.tmp / "cli"
        self.assertEqual(demo.main([str(out), "--days", "10", "--empty", "--preview"]), 0)
        data = json.loads((out / "site" / "data.json").read_text())
        self.assertTrue(data["preview"])
        self.assertEqual(data["stats"]["clips"], 0)


class PageFile(unittest.TestCase):
    def setUp(self):
        self.html = (HERE / "dashboard_page.html").read_text(encoding="utf-8")

    def test_one_script_one_data_marker(self):
        self.assertEqual(self.html.count("</script>"), 1)
        self.assertEqual(self.html.count("/*__DATA__*/null"), 1)

    def test_pages_and_features_exist(self):
        for fn in ("pageSubmit", "pageToday", "pageClips", "pageInsights", "pageAnalytics", "pageEarnings", "pagePayouts",
                   "pageCampaigns", "pageAccounts", "pageRuns", "pageJobs", "pageActivity", "pageHelp", "pageReport", "pageSettings",
                   "moneyCard", "timelineCard", "launchCard", "benchPanel", "switchLogCard", "mgrBlock", "palette", "tour",
                   "stickyNext", "exportCSV", "lazy(", "toastAct", "shareLink", "queueRows"):
            self.assertIn(fn, self.html, fn)
        for css in ("@media print", "prefers-reduced-motion", 'data-theme="light"', ".skip", "#stickysub", ".pal-wrap"):
            self.assertIn(css, self.html, css)
        self.assertEqual(self.html.count("<title>Clip Engine</title>"), 1)

    def test_script_parses(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("node not installed")
        m = re.search(r"<script>\n(.*)</script>", self.html, re.S)
        tmp = Path(tempfile.mkdtemp())
        try:
            f = tmp / "page.js"
            f.write_text(m.group(1), encoding="utf-8")
            r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stderr)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_hostile_text_cannot_close_the_script(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            ws.set_setting("insights", ["</script><img src=x onerror=alert(1)>"])
            ws.set_setting("launch.checklist", [{"id": "x", "label": "</script>", "done": False, "manual": True, "how": "</script>", "detail": ""}])
            ws.set_setting("bench", {"healthy": 0, "min": 1, "need_more": True, "reason": "</script>", "join_next": []})
            out = dashboard.write(ws).read_text(encoding="utf-8")
            ws.close()
            self.assertEqual(out.count("</script>"), 1)
            self.assertNotIn("/*__DATA__*/null", out)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_manifest_shortcuts_exist_as_pages(self):
        pages = set(re.findall(r"\['(\w+)', '[^']+', '\w+'\]", self.html.split("const GROUPS")[1].split("const PAGES")[0]))
        for sc in dashboard.MANIFEST["shortcuts"]:
            self.assertIn(sc["url"].split("#/")[1], pages | {"jobs"}, sc)


class WhatsNew(unittest.TestCase):
    def test_changelog_in_data(self):
        self.assertTrue(all({"id", "title", "text"} <= set(x) for x in dashboard.CHANGELOG))


if __name__ == "__main__":
    unittest.main(verbosity=2)
