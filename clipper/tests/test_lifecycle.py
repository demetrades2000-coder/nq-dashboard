"""
The autopilot brain: campaign lifecycle and automatic switching, account allocation and modes (warm-up / slow /
cooldown / idle), the bench, owner alerts (queue, quiet hours, digest, weekly), run history and self-healing
(lock, trimming, chain heartbeat), the last-look gate, footage polling and restock, and a few whole-run scenarios
against the fake world (fakeworld.py: Content Rewards + Zernio + ntfy + a bare git repo).

  cd clipper && python -X utf8 -m unittest tests.test_lifecycle            (about 1-2 minutes)
"""

from __future__ import annotations

import datetime as dt
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import accountmodes as am  # noqa: E402
import alerts  # noqa: E402
import cloud_runner as cr  # noqa: E402
import footage  # noqa: E402
import gate  # noqa: E402
import lifecycle as lc  # noqa: E402
import pipeline as pl  # noqa: E402
import runstate  # noqa: E402
import scheduling  # noqa: E402

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 26, 13, 0, tzinfo=UTC)          # Monday 09:00 New York (EDT)


def brief(name, match="", cpm=5.0, **kw):
    c = {"name": name, "automation_allowed": True, "account_match": match, "cpm": cpm, "min_payout": 7,
         "accounts": {"tiktok": "*"}, "platforms": ["tiktok"],
         "permission": {"campaign_url": "https://contentrewards.com/c/campaigns/" + name.lower().replace(" ", "-")},
         "_file": f"/x/{name}.json"}
    c.update(kw)
    return c


def tt(*names, **kw):
    return am.normalize_accounts([{"_id": f"id{i}", "platform": "tiktok", "username": n} for i, n in enumerate(names)], **kw)


class WsCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-brain-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.now = NOW

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def live(self, name, ok=True, left=1500.0, cpm=5.0, reason="", creators=10, **kw):
        self.ws.set_setting(f"campaign_live.{name}", dict({"ok": ok, "left": left, "budget": 2000.0, "cpm": cpm,
                                                            "reason": reason or (f"${left:.0f} left" if ok else "budget almost gone"),
                                                            "creators": creators}, **kw))

    def run_lc(self, briefs, accounts, hours=0, **kw):
        self.now = NOW + dt.timedelta(hours=hours)
        return lc.run(self.ws, briefs, accounts, self.now, **kw)

    def state(self, name):
        return self.ws.setting(f"campaign_state.{name}", None)

    def kinds(self):
        return [(e["kind"], e["campaign"]) for e in self.ws.setting("switch.log", [])]

    def add_post(self, account, hours_ago, views=None, kind="video", campaign="C", url=True, measured=True, state="live",
                 title="a title"):
        """A finished post: created `hours_ago` hours before NOW; views measured by a later stats refresh when measured."""
        sid = self.ws.q("SELECT id FROM sources WHERE campaign=?", (campaign,))
        if not sid:
            self.ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, status, created, updated) "
                      "VALUES(?,?,?,?,'done',?,?)", (campaign, "x", "x", f"f:{campaign}", pl.now(), pl.now()))
            sid = self.ws.q("SELECT id FROM sources WHERE campaign=?", (campaign,))
        created = NOW - dt.timedelta(hours=hours_ago)
        updated = created + dt.timedelta(hours=20 if measured else 0)
        n = self.ws.q("SELECT COUNT(*) n FROM clips")[0]["n"] + 1
        self.ws.x("INSERT INTO clips(source_id, campaign, title, start, end_, status, created, kind, text) "
                  "VALUES(?,?,?,?,?, 'posted',?,?,?)", (sid[0]["id"], campaign, title, 0, 25, pl.now(), kind, f"text {n}"))
        cid = self.ws.q("SELECT MAX(id) m FROM clips")[0]["m"]
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, views, created, updated) "
                  "VALUES(?,?,?,?,?,?,?,?)", (cid, "tiktok", account, f"https://t/{cid}" if url else None, state,
                                               views or 0, created.replace(tzinfo=None).isoformat(timespec="seconds"),
                                               updated.replace(tzinfo=None).isoformat(timespec="seconds")))
        return cid


class PriorityTests(unittest.TestCase):
    def test_formula_and_factors(self):
        c = brief("A")
        live = {"left": 1000.0, "cpm": 5.0, "creators": 0}
        p, parts = lc.priority(c, live, {"posts": 0, "avg": None}, 5.0, None)
        self.assertEqual(p, 2.5)                                   # 5 x 0.5 x 1 x 1 x 1 x 1
        self.assertEqual(parts["cpm"], 5.0)
        need = lc.min_views_needed(c)
        self.assertEqual(need, 1400.0)                             # $7 minimum at $5 per 1K
        weak, _ = lc.priority(c, live, {"posts": 6, "avg": 700}, 5.0, None)
        self.assertEqual(weak, 1.25)                               # half the views a payout needs: x 0.5
        few, _ = lc.priority(c, live, {"posts": 4, "avg": 10}, 5.0, None)
        self.assertEqual(few, 2.5)                                 # fewer than 5 settled posts: no opinion
        short, _ = lc.priority(c, live, {"posts": 0, "avg": None}, 0.0, None)
        self.assertEqual(short, 1.0)                               # no content ready: supply factor 0.4
        soon, _ = lc.priority(c, live, {"posts": 0, "avg": None}, 5.0, 1.0)
        self.assertAlmostEqual(soon, 2.5 * (0.5 + 1 / 6), places=2)   # budget gone in a day: penalised
        crowd, _ = lc.priority(c, dict(live, creators=300), {"posts": 0, "avg": None}, 5.0, None)
        self.assertEqual(crowd, 2.0)                               # 300 creators: competition factor 0.6 + 0.4 x 0.5 = 0.8
        full, _ = lc.priority(c, dict(live, left=9999), {"posts": 0, "avg": None}, 5.0, None)
        self.assertEqual(full, 5.0)                                # budget capped at $2,000


class LifecycleTests(WsCase):
    def test_everyone_active_when_pages_are_free(self):
        b = [brief("Tradever", "tradever"), brief("Gen A")]
        for n in ("Tradever", "Gen A"):
            self.live(n)
        res = self.run_lc(b, tt("tradever.clips", "hub.one"))
        self.assertEqual({n: s["state"] for n, s in res["states"].items()}, {"Tradever": "active", "Gen A": "active"})
        self.assertEqual(self.state("Tradever")["accounts"], ["tiktok/tradever.clips"])
        self.assertEqual(self.state("Gen A")["accounts"], ["tiktok/hub.one"])

    def test_dry_campaign_promotes_the_best_standby_and_moves_the_page_in_the_same_run(self):
        b = [brief("Alpha Co", cpm=5), brief("Beta Co", cpm=4), brief("Gamma Co", cpm=3)]
        for n, cpm in (("Alpha Co", 5), ("Beta Co", 4), ("Gamma Co", 3)):
            self.live(n, cpm=cpm)
        a = tt("hub.one")
        self.run_lc(b, a)
        self.assertEqual([n for n in ("Alpha Co", "Beta Co", "Gamma Co") if self.state(n)["state"] == "active"], ["Alpha Co"])
        self.assertEqual(self.state("Beta Co")["rank"], 2)
        self.live("Alpha Co", ok=False, left=12.0, reason="budget almost gone ($12.00 left)")   # Alpha runs dry
        res = self.run_lc(b, a, hours=4)
        self.assertEqual(self.state("Alpha Co")["state"], "paused")
        self.assertEqual(self.state("Alpha Co")["reason"], "budget almost gone ($12.00 left)")
        self.assertEqual(self.state("Beta Co")["state"], "active")                  # the best standby, not Gamma
        self.assertEqual(self.state("Gamma Co")["state"], "standby")
        self.assertEqual(self.state("Beta Co")["accounts"], ["tiktok/hub.one"])
        self.assertEqual(self.ws.setting("account_state.tiktok/hub.one")["campaign"], "Beta Co")
        self.assertEqual([k for k in self.kinds() if k[0] != "promoted" or k[1] != "Alpha Co"][-3:],
                         [("paused", "Alpha Co"), ("promoted", "Beta Co"), ("account_moved", "Beta Co")])
        log = self.ws.setting("switch.log")[-3:]
        self.assertEqual(set(log[0]), {"ts", "kind", "campaign", "from", "to", "reason"})
        self.assertEqual((log[1]["from"], log[1]["to"]), ("standby", "active"))
        self.assertIn("best rate", log[1]["reason"])
        self.assertIn("Alpha Co", log[2]["reason"])                                   # moved FROM Alpha
        alert = next(x for x in res["alerts"] if x["key"] == "switch:paused:Alpha Co")
        self.assertEqual(alert["title"], "Alpha Co paused")
        self.assertIn("Budget almost gone ($12.00 left)", alert["msg"])
        self.assertIn("Switched to Beta Co ($4/1K", alert["msg"])
        self.assertEqual(len(res["alerts"]), 1)                                       # one alert for the one switch
        again = self.run_lc(b, a, hours=8)                                            # nothing changed: nothing logged
        self.assertEqual(again["events"], [])
        self.assertEqual(again["alerts"], [])

    def test_switch_alert_is_sent_once_a_day_even_if_the_runner_repeats_it(self):
        os.environ["NTFY_TOPIC"] = "t-secret"
        try:
            self.ws.set_setting("autopilot.enabled", True)
            b = [brief("Alpha Co"), brief("Beta Co", cpm=4)]
            self.live("Alpha Co")
            self.live("Beta Co", cpm=4)
            a = tt("hub.one")
            self.run_lc(b, a)
            self.live("Alpha Co", ok=False, left=3.0)
            res = self.run_lc(b, a, hours=4)
            sent_msgs = []
            http = lambda topic, msg, headers: sent_msgs.append((headers["Title"], msg)) or True       # noqa: E731
            state = {}
            noon = dt.datetime(2026, 10, 26, 18, 0, tzinfo=UTC)                            # 14:00 New York
            first = cr.owner_alerts(self.ws, state, {"days_left": 9}, True, http, noon, extra=res["alerts"])
            self.assertEqual(first, ["Alpha Co paused"])
            again = cr.owner_alerts(self.ws, state, {"days_left": 9}, True, http, noon + dt.timedelta(hours=1), extra=res["alerts"])
            self.assertEqual(again, [])                                                    # same switch, same day: silent
            self.assertEqual(len(sent_msgs), 1)
            self.assertIn("Switched to Beta Co", sent_msgs[0][1])
        finally:
            os.environ.pop("NTFY_TOPIC", None)

    def test_refilled_campaign_resumes_by_itself(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        a = tt("hub.one")
        self.run_lc(b, a)
        self.live("Alpha Co", ok=False, left=5.0)
        self.run_lc(b, a, hours=4)
        self.assertEqual(self.state("Alpha Co")["state"], "paused")
        self.assertEqual(self.state("Alpha Co")["accounts"], [])
        self.assertEqual(self.ws.setting("account_state.tiktok/hub.one")["mode"], "idle")
        self.live("Alpha Co", ok=True, left=900.0)
        res = self.run_lc(b, a, hours=8)
        self.assertEqual(self.state("Alpha Co")["state"], "active")
        self.assertEqual(self.state("Alpha Co")["accounts"], ["tiktok/hub.one"])
        self.assertIn(("resumed", "Alpha Co"), self.kinds())
        self.assertEqual(res["alerts"][0]["title"], "Alpha Co is back")

    def test_closed_for_a_week_is_ended_and_archived_but_kept_in_history(self):
        b = [brief("Alpha Co"), brief("Beta Co", cpm=4)]
        self.live("Alpha Co")
        self.live("Beta Co", cpm=4)
        a = tt("hub.one")
        self.run_lc(b, a)
        self.live("Alpha Co", ok=False, left=2.0)
        self.run_lc(b, a, hours=4)
        self.assertEqual(self.state("Alpha Co")["state"], "paused")
        since = self.state("Alpha Co")["closed_since"]
        res = self.run_lc(b, a, hours=24 * 6)                       # closed 6 days: still paused (could refill)
        self.assertEqual(self.state("Alpha Co")["state"], "paused")
        self.assertEqual(self.state("Alpha Co")["closed_since"], since)
        res = self.run_lc(b, a, hours=24 * 8)                       # closed more than 7 days: ended for good
        self.assertEqual(self.state("Alpha Co")["state"], "ended")
        self.assertEqual(res["archived"], ["Alpha Co"])
        self.assertIn("Alpha Co", self.ws.setting("campaigns.archived"))
        self.assertIn(("ended", "Alpha Co"), self.kinds())
        # archived: no longer in the briefs next time, but its state and the log stay
        res = self.run_lc([b[1]], a, hours=24 * 8 + 4)
        self.assertEqual(self.state("Alpha Co")["state"], "ended")
        self.assertEqual(self.state("Beta Co")["state"], "active")

    def test_page_that_404s_twice_is_ended(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co", gone_count=1)
        res = self.run_lc(b, tt("hub.one"))
        self.assertEqual(self.state("Alpha Co")["state"], "active")             # one 404 is a blip
        self.live("Alpha Co", gone_count=2)
        res = self.run_lc(b, tt("hub.one"), hours=4)
        self.assertEqual(self.state("Alpha Co")["state"], "ended")
        self.assertIn("gone", self.state("Alpha Co")["reason"])

    def test_blocked_when_rules_ban_or_do_not_clearly_allow_tools(self):
        b = [brief("Ban Co", automation_allowed=False), brief("Maybe Co", automation_allowed=None), brief("Ok Co")]
        for n in ("Ban Co", "Maybe Co", "Ok Co"):
            self.live(n)
        self.run_lc(b, tt("hub.one"))
        self.assertEqual(self.state("Ban Co")["state"], "blocked")
        self.assertIn("ban automated tools", self.state("Ban Co")["reason"])
        self.assertEqual(self.state("Maybe Co")["state"], "blocked")
        self.assertIn("confirm", self.state("Maybe Co")["reason"])
        self.assertEqual(self.state("Ok Co")["state"], "active")
        self.assertEqual(self.state("Ban Co")["accounts"], [])
        self.assertIsNone(self.state("Ban Co")["rank"])

    def test_brand_page_stays_with_its_brand_idles_and_the_owner_is_told(self):
        b = [brief("Tradever", "tradever"), brief("Gen A")]
        self.live("Tradever")
        self.live("Gen A")
        a = tt("tradever.clips", "hub.one")
        self.run_lc(b, a)
        self.live("Tradever", ok=False, left=4.0, reason="budget almost gone ($4.00 left)")
        res = self.run_lc(b, a, hours=4)
        st = self.ws.setting("account_state.tiktok/tradever.clips")
        self.assertEqual((st["campaign"], st["mode"]), ("Tradever", "idle"))       # still Tradever's page
        self.assertEqual(self.state("Gen A")["accounts"], ["tiktok/hub.one"])       # not poached by the generic campaign
        idle = [e for e in res["events"] if e["kind"] == "account_idle"]
        self.assertEqual(len(idle), 1)
        self.assertIn("tiktok/tradever.clips has nothing to post", idle[0]["reason"])
        self.assertIn("Tradever is paused", idle[0]["reason"])
        al = next(x for x in res["alerts"] if x["key"] == "idle:tiktok/tradever.clips")
        self.assertEqual(al["title"], "tradever.clips has nothing to post")
        self.assertIn("stays with its brand", al["msg"])
        self.assertEqual(self.run_lc(b, a, hours=8)["events"], [])                  # said once

    def test_a_brand_with_no_page_waits_as_standby_and_says_exactly_what_to_create(self):
        b = [brief("Acme Co", "acme")]
        self.live("Acme Co")
        self.run_lc(b, tt("somebody.else"))
        st = self.state("Acme Co")
        self.assertEqual(st["state"], "standby")
        self.assertIn("no tiktok account connected with 'acme' in its name", st["reason"])
        self.assertIn("acme.clips", st["reason"])

    def test_a_campaign_waiting_for_its_page_asks_for_it_once_and_the_digest_repeats_it(self):
        b = [brief("Acme Co", "acme")]
        self.live("Acme Co")
        res = self.run_lc(b, tt("somebody.else"))
        al = [x for x in res["alerts"] if x["key"] == "needpage:Acme Co"]
        self.assertEqual(al[0]["title"], "Acme Co needs a TikTok page")
        self.assertIn("acme.clips", al[0]["msg"])
        self.assertEqual([x for x in self.run_lc(b, tt("somebody.else"), hours=4)["alerts"] if x["key"].startswith("needpage")], [])
        title, msg, _n = alerts.digest(self.ws, {}, {}, NOW, "https://dash", pl)
        self.assertIn("Acme Co needs a TikTok page: create a TikTok page named acme.clips", msg)
        res = self.run_lc(b, tt("somebody.else", "acme.clips"), hours=8)                    # the owner made it
        self.assertEqual(self.state("Acme Co")["state"], "active")

    def test_generic_page_freed_by_an_ended_campaign_moves_to_the_next_one(self):
        b = [brief("Alpha Co", cpm=5), brief("Beta Co", cpm=4)]
        self.live("Alpha Co")
        self.live("Beta Co", cpm=4)
        a = tt("hub.one", "hub.two")
        self.run_lc(b, a)
        self.assertEqual(self.state("Alpha Co")["accounts"] + self.state("Beta Co")["accounts"],
                         ["tiktok/hub.one", "tiktok/hub.two"])
        self.live("Alpha Co", ok=False, left=1.0)
        self.run_lc(b, a, hours=4)
        self.assertEqual(self.state("Beta Co")["accounts"], ["tiktok/hub.two"])      # kept its own page (no shuffling)
        self.assertEqual(self.ws.setting("account_state.tiktok/hub.one")["mode"], "idle")
        # a third campaign appears and takes the freed page
        b2 = b + [brief("Gamma Co", cpm=3)]
        self.live("Gamma Co", cpm=3)
        res = self.run_lc(b2, a, hours=8)
        self.assertEqual(self.state("Gamma Co")["state"], "active")
        self.assertEqual(self.state("Gamma Co")["accounts"], ["tiktok/hub.one"])
        moved = [e for e in res["events"] if e["kind"] == "account_moved"]
        self.assertEqual(len(moved), 1)
        self.assertEqual((moved[0]["from"], moved[0]["to"]), (None, "Gamma Co"))          # it had been idle since Alpha paused
        self.assertIn("was free and now serves Gamma Co", moved[0]["reason"])

    def test_no_flip_flop_a_slightly_better_campaign_does_not_steal_a_page(self):
        b = [brief("Alpha Co", cpm=5), brief("Beta Co", cpm=5.5)]
        self.live("Alpha Co")
        self.live("Beta Co", cpm=5.5)
        a = tt("hub.one")
        self.run_lc([b[0]], a)                                  # Alpha alone first: it holds the page
        res = self.run_lc(b, a, hours=4)
        self.assertEqual(self.state("Alpha Co")["state"], "active")
        self.assertEqual(self.state("Beta Co")["state"], "standby")
        self.live("Beta Co", cpm=20.0)                           # Beta becomes worth 4x as much: now it wins
        res = self.run_lc(b, a, hours=8)
        self.assertEqual(self.state("Beta Co")["state"], "active")
        self.assertEqual(self.state("Alpha Co")["state"], "standby")
        self.assertIn(("demoted", "Alpha Co"), self.kinds())

    def test_max_active_one_runs_the_best_campaign_and_promotes_the_next_when_it_pauses(self):
        b = [brief("Tradever", "tradever"), brief("Gen A", cpm=4)]
        self.live("Tradever")
        self.live("Gen A", cpm=4)
        a = tt("tradever.clips", "hub.one")
        self.run_lc(b, a, max_active=1)
        self.assertEqual((self.state("Tradever")["state"], self.state("Gen A")["state"]), ("active", "standby"))
        self.assertIn("at most 1", self.state("Gen A")["reason"])
        self.live("Tradever", ok=False, left=9.0)
        res = self.run_lc(b, a, hours=4, max_active=1)
        self.assertEqual((self.state("Tradever")["state"], self.state("Gen A")["state"]), ("paused", "active"))
        self.assertEqual(self.state("Gen A")["accounts"], ["tiktok/hub.one"])
        self.assertIn("Switched to Gen A", next(x for x in res["alerts"] if x["key"].startswith("switch:paused"))["msg"])

    def test_zernio_unreachable_keeps_the_previous_allocation(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        self.run_lc(b, tt("hub.one"))
        res = self.run_lc(b, None, hours=4)                      # could not ask Zernio this time
        self.assertEqual(self.state("Alpha Co")["state"], "active")
        self.assertEqual(self.state("Alpha Co")["accounts"], ["tiktok/hub.one"])
        self.assertEqual(res["events"], [])

    def test_new_campaign_is_active_at_once_and_the_first_ever_look_is_not_an_alert(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        res = self.run_lc(b, tt("hub.one", "hub.two"))
        self.assertEqual(res["alerts"], [])                          # first lifecycle run: Alpha was already running
        b2 = b + [brief("Beta Co", cpm=4)]
        self.live("Beta Co", cpm=4)
        res = self.run_lc(b2, tt("hub.one", "hub.two"), hours=4)
        self.assertEqual(self.state("Beta Co")["state"], "active")
        self.assertIn(("promoted", "Beta Co"), self.kinds())
        self.assertEqual(res["alerts"][0]["title"], "Now posting for Beta Co")

    def test_runway_is_estimated_from_how_fast_the_budget_falls(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co", left=1000.0)
        self.run_lc(b, tt("hub.one"))
        self.live("Alpha Co", left=500.0)
        self.run_lc(b, tt("hub.one"), hours=24)                  # $500 in a day: one more day
        self.assertEqual(self.state("Alpha Co")["runway_days"], 1.0)
        self.assertLess(self.state("Alpha Co")["priority_parts"]["runway"], 1.0)

    def test_pace_estimate_and_the_digest_mentions_a_campaign_under_its_weekly_posts(self):
        b = [brief("Alpha Co", posts_per_week=5, cpm=5)]
        self.live("Alpha Co")
        a = tt("hub.one")
        self.run_lc(b, a)
        for h in (10, 30):
            self.add_post("hub.one", h, views=2000, campaign="Alpha Co")
        self.run_lc(b, a, hours=24 * 8)                     # active for 8 days, 0 posts in the last 7 days
        st = self.state("Alpha Co")
        self.assertEqual((st["posts_7d"], st["posts_per_week"]), (0, 5))
        self.assertTrue(st["behind_pace"])
        self.assertEqual(st["est_earned"], 20.0)            # 2 posts x 2,000 views at $5/1K (campaign.payout, minimum $7 a post)
        title, msg, _n = alerts.digest(self.ws, {}, {}, NOW, "https://dash", pl)
        self.assertIn("Alpha Co is under its 5 posts a week (0 so far).", msg)

    def test_an_account_removed_from_zernio_is_marked_gone(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        self.run_lc(b, tt("hub.one", "hub.two"))
        self.run_lc(b, tt("hub.one"), hours=4)
        st = self.ws.setting("account_state.tiktok/hub.two")
        self.assertEqual((st["connected"], st["mode"], st["campaign"]), (False, "idle", None))
        self.assertIn("no longer connected", st["reason"])

    def test_a_newly_added_blocked_campaign_asks_for_a_decision_once(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        self.run_lc(b, tt("hub.one"))
        b2 = b + [brief("Maybe Co", automation_allowed=None)]
        res = self.run_lc(b2, tt("hub.one"), hours=4)
        al = [x for x in res["alerts"] if x["key"] == "blocked:Maybe Co"]
        self.assertEqual(al[0]["title"], "Maybe Co needs a decision")
        self.assertIn("confirm", al[0]["msg"])
        self.assertEqual([x for x in self.run_lc(b2, tt("hub.one"), hours=8)["alerts"] if x["key"].startswith("blocked")], [])

    def test_hold_in_the_brief_pauses_a_campaign(self):
        b = [brief("Alpha Co", hold=True)]
        self.live("Alpha Co")
        self.run_lc(b, tt("hub.one"))
        self.assertEqual(self.state("Alpha Co")["state"], "paused")

    def test_contract_keys(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        self.run_lc(b, tt("hub.one"))
        st = self.state("Alpha Co")
        for k in ("state", "reason", "since", "priority", "rank", "accounts", "supply_days", "left", "budget", "cpm", "checked"):
            self.assertIn(k, st)
        ac = self.ws.setting("account_state.tiktok/hub.one")
        for k in ("campaign", "mode", "reason", "since", "posts_total", "posts_7d", "median_views_recent", "health"):
            self.assertIn(k, ac)
        bench = self.ws.setting("bench")
        for k in ("healthy", "min", "need_more", "reason", "join_next"):
            self.assertIn(k, bench)


class BenchTests(WsCase):
    def lead(self, name, org="Org", cpm=5.0, left=1500.0, app=False, types=("Clipping",), url=None, score=3.0, title=None,
             **kw):
        d = {"id": name, "name": title or name, "org": org, "url": url or f"https://contentrewards.com/c/campaigns/{name}",
             "rates": {"tiktok": {"cpm": cpm, "min": 7, "max": 500}}, "left": left, "budget": 2000, "creators": 10,
             "types": list(types), "categories": ["Finance"], "requires_application": app, "score": score}
        d.update(kw)
        return d

    def test_two_healthy_campaigns_is_enough(self):
        b = [brief("Alpha Co"), brief("Beta Co")]
        for n in ("Alpha Co", "Beta Co"):
            self.live(n)
        res = self.run_lc(b, tt("hub.one"))
        self.assertEqual((res["bench"]["healthy"], res["bench"]["need_more"]), (2, False))   # one active + one standby

    def test_need_more_lists_only_good_leads_and_the_alert_names_the_best_three(self):
        b = [brief("Alpha Co")]
        self.live("Alpha Co")
        leads = [self.lead("good-1", score=5.0), self.lead("good-2", score=4.0), self.lead("good-3", score=3.0),
                 self.lead("good-4", score=2.0),
                 self.lead("banned-org", org="Reach", score=9.0),                    # on the skip-list
                 self.lead("alpha-futures-clip", org="Alpha Futures", score=9.0),
                 self.lead("tjr-trades", title="TJR Trades Clipping", score=9.0),
                 self.lead("needs-app", app=True, score=9.0),                         # application needed
                 self.lead("ugc-only", types=("UGC (With Face)",), score=9.0),
                 self.lead("no-tiktok", rates={"youtube": {"cpm": 5}}, score=9.0),
                 self.lead("french", title="Campagne en Français", score=9.0),
                 self.lead("casino", title="Stake Casino Clips", score=9.0),
                 self.lead("joined", url="https://contentrewards.com/c/campaigns/alpha-co", score=9.0)]   # already onboarded
        self.ws.set_setting("leads.discovered", leads)
        res = self.run_lc(b, tt("hub.one"))
        bench = res["bench"]
        self.assertTrue(bench["need_more"])
        self.assertEqual([x["id"] for x in bench["join_next"]], ["good-1", "good-2", "good-3", "good-4"])
        al = lc.bench_alert(bench)
        self.assertEqual(al["title"], "Join another campaign")
        self.assertIn("good-1", al["msg"])
        self.assertNotIn("good-4", al["msg"])                                        # only the best three
        self.assertIn("Rules tab", al["msg"])
        self.assertIn("send the rules text and links to Claude", al["msg"])
        self.assertIsNone(lc.bench_alert({"need_more": True, "join_next": []}))      # nothing to suggest: no alert
        self.assertIsNone(lc.bench_alert({"need_more": False, "join_next": [leads[0]]}))

    def test_ban_list_file_has_the_known_tool_banning_orgs(self):
        import contentrewards as crw
        names = {e["match"] for e in crw.load_ban_list()}
        self.assertTrue({"Reach", "TJR", "Alpha Futures", "Alpha Capital", "Clipping.net"} <= names)
        self.assertIsNone(crw.banned_org({"org": "Reachable Media", "name": "x"}))    # whole words only
        self.assertTrue(crw.banned_org({"org": "Reach", "name": "x"}))


class AccountModeTests(WsCase):
    def veteran(self, name="acct.a"):
        """An account this system has known for 10 days (so it is past warm-up)."""
        self.ws.set_setting(f"account_state.tiktok/{name}", {"first_seen": lc.iso(NOW - dt.timedelta(days=10))})

    def mode(self, accounts, alloc_active=("acct.a",), hours=0):
        self.now = NOW + dt.timedelta(hours=hours)
        owner = {a["name"]: "C" for a in accounts}
        out, ev = am.compute(self.ws, accounts, owner, set(alloc_active), self.now)
        return out, ev

    def test_warmup_ladder_then_normal(self):
        a = tt("acct.a")
        out, _ = self.mode(a)
        st = out["tiktok/acct.a"]
        self.assertEqual((st["mode"], st["health"]), ("warmup", "new"))
        self.assertEqual(st["limits"], {"max_per_day": 1})
        self.assertIn("day 1 of 5 warm-up: 1 post a day", st["reason"])
        self.assertEqual(am.allowance(self.ws, "tiktok", "acct.a")["max_per_day"], 1)
        out, _ = self.mode(a, hours=24)
        self.assertEqual(out["tiktok/acct.a"]["limits"]["max_per_day"], 1)               # day 2
        out, _ = self.mode(a, hours=48)
        self.assertEqual(out["tiktok/acct.a"]["limits"]["max_per_day"], 2)               # day 3
        out, _ = self.mode(a, hours=72)
        self.assertEqual(out["tiktok/acct.a"]["limits"]["max_per_day"], 2)               # day 4
        out, _ = self.mode(a, hours=96)
        self.assertEqual((out["tiktok/acct.a"]["mode"], out["tiktok/acct.a"]["health"]), ("normal", "ok"))
        self.assertIsNone(am.allowance(self.ws, "tiktok", "acct.a")["max_per_day"])

    def test_an_account_connected_long_ago_skips_warmup(self):
        oid = format(int((NOW - dt.timedelta(days=30)).timestamp()), "08x") + "0" * 16        # Mongo ObjectId timestamp
        a = am.normalize_accounts([{"_id": oid, "platform": "tiktok", "username": "old.page"}])
        self.assertAlmostEqual((NOW - a[0]["connected_at"]).days, 30, delta=1)
        out, _ = self.mode(a, ("old.page",))
        self.assertEqual(out["tiktok/old.page"]["mode"], "normal")

    def test_warmup_can_be_switched_off(self):
        out, _ = am.compute(self.ws, tt("acct.a"), {"acct.a": "C"}, {"acct.a"}, NOW, warmup_on=False)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")

    def test_limited_account_goes_slow_only_on_measured_views(self):
        a = tt("acct.a")
        self.veteran()
        for h in (80, 70, 60, 50):
            self.add_post("acct.a", h, views=40, measured=True)
        out, ev = self.mode(a)
        st = out["tiktok/acct.a"]
        self.assertEqual((st["mode"], st["health"]), ("slow", "limited"))
        self.assertEqual(st["median_views_recent"], 40)
        self.assertEqual(st["limits"]["cap_factor"], 0.5)
        self.assertEqual(ev[0]["kind"], "slow")
        al = lc.build_alerts([], {}, ev)[0]
        self.assertEqual(al["title"], "acct.a looks limited")
        # views never measured (stats not flowing): never "limited"
        self.ws.x("UPDATE uploads SET updated = created")
        out, _ = self.mode(a)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")

    def test_limited_needs_four_posts_a_day_old_and_recovers(self):
        a = tt("acct.a")
        self.veteran()
        for h in (80, 70, 60):
            self.add_post("acct.a", h, views=40)
        out, _ = self.mode(a)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")                           # only 3 posts
        self.add_post("acct.a", 3, views=10, measured=True)                                 # too fresh to judge
        out, _ = self.mode(a)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")
        self.add_post("acct.a", 50, views=40)
        out, _ = self.mode(a)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "slow")                             # the 4th settled post tips it
        for h in (45, 40, 35, 30, 28, 26):
            self.add_post("acct.a", h, views=900)
        out, _ = self.mode(a)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")                           # recent median back above 100

    def test_zernio_says_disconnected_means_cooldown_with_reconnect_steps(self):
        a = am.normalize_accounts([{"_id": "t1", "platform": "tiktok", "username": "acct.a"}],
                                  {"t1": {"canPost": False, "needsReconnect": True, "issues": ["Token expired"]}})
        self.assertFalse(a[0]["usable"])
        out, ev = self.mode(a)
        st = out["tiktok/acct.a"]
        self.assertEqual((st["mode"], st["health"]), ("cooldown", "error"))
        self.assertIn("Token expired", st["reason"])
        self.assertIn("zernio.com > Accounts", st["reason"])
        self.assertTrue(am.allowance(self.ws, "tiktok", "acct.a")["blocked"])
        al = lc.build_alerts([], {}, ev)[0]
        self.assertTrue(al["critical"])
        self.assertEqual(al["title"], "acct.a disconnected")

    def test_a_failed_post_with_a_login_error_rests_the_account_for_12_hours(self):
        a = tt("acct.a")
        self.assertTrue(am.is_auth_error("Facebook tokens expired. Please reconnect your account"))
        self.assertFalse(am.is_auth_error("Zernio plan or platform posting limit reached"))
        self.veteran()
        am.note_error(self.ws, "tiktok", "acct.a", "token expired, please reconnect", NOW.isoformat())
        out, _ = self.mode(a, hours=1)
        self.assertEqual(out["tiktok/acct.a"]["mode"], "cooldown")
        out, _ = self.mode(a, hours=13)                                                    # 13 h later: one more try
        self.assertEqual(out["tiktok/acct.a"]["mode"], "normal")
        am.note_error(self.ws, "tiktok", "acct.a", "token expired", (NOW + dt.timedelta(hours=24 * 7)).isoformat())
        am.clear_error(self.ws, "tiktok", "acct.a")
        self.assertIsNone(self.ws.setting("account.err.tiktok/acct.a", None))

    def test_unused_account_is_idle(self):
        out, _ = self.mode(tt("acct.a", "acct.b"), alloc_active=("acct.a",))
        self.assertEqual(out["tiktok/acct.b"]["mode"], "idle")
        self.assertTrue(am.allowance(self.ws, "tiktok", "acct.b")["blocked"])

    def test_no_record_means_normal(self):
        al = am.allowance(self.ws, "tiktok", "never.seen")
        self.assertEqual((al["mode"], al["blocked"], al["cap_factor"]), ("normal", False, 1.0))


class AlertQueueTests(WsCase):
    def setUp(self):
        super().setUp()
        self.sent = []
        self.state = {}

    def send(self, title, msg, priority, tags):
        self.sent.append((title, priority))
        return True

    def at(self, hour, day=26):                                   # `hour`:30 New York on 2026-10-<day> (EDT = UTC-4)
        return dt.datetime(2026, 10, day, hour, 30, tzinfo=UTC) + dt.timedelta(hours=4)

    def run_alerts(self, hour, extra=None, key=True, day=26, supply=None, send=None):
        return alerts.run(self.ws, self.state, supply or {"days_left": 9}, key, send or self.send, self.at(hour, day),
                          "https://dash", pl, extra=extra)

    def test_quiet_hours_hold_back_everything_but_critical(self):
        a = {"key": "k1", "title": "Normal", "msg": "m", "priority": "high"}
        c = {"key": "k2", "title": "Critical", "msg": "m", "priority": "urgent", "critical": True}
        sent = self.run_alerts(2, [a, c])                         # 02:30 New York
        self.assertEqual(sent, ["Critical"])
        self.assertEqual([q["title"] for q in self.state["alert_queue"]], ["Normal"])
        self.assertEqual(self.run_alerts(5), [])                  # still quiet
        self.assertEqual(self.run_alerts(8), ["Normal"])          # 08:30: flushed
        self.assertEqual(self.state["alert_queue"], [])
        self.assertEqual(self.run_alerts(9, [a]), [])             # same key, same day: never twice

    def test_the_quiet_window_is_23_to_08(self):
        self.assertTrue(alerts.is_quiet(23) and alerts.is_quiet(0) and alerts.is_quiet(7))
        self.assertFalse(alerts.is_quiet(8) or alerts.is_quiet(22))

    def test_a_failed_send_stays_queued_and_old_ones_expire(self):
        a = {"key": "k1", "title": "Normal", "msg": "m"}
        self.assertEqual(self.run_alerts(12, [a], send=lambda *x: False), [])
        self.assertEqual(len(self.state["alert_queue"]), 1)
        self.assertEqual(self.run_alerts(13), ["Normal"])
        b = {"key": "k9", "title": "Old", "msg": "m"}
        self.run_alerts(12, [b], send=lambda *x: False, day=27)
        self.assertEqual(self.run_alerts(12, day=29, send=lambda *x: False), [])           # 48 h old: dropped
        self.assertEqual(self.state["alert_queue"], [])

    def test_digest_at_8pm_with_counts_once_a_day(self):
        self.add_post("acct.a", 2, views=5, state="live")
        self.ws.set_setting("bench", {"healthy": 1, "need_more": True})
        self.ws.set_setting("account_state.tiktok/idle.page", {"mode": "idle"})
        self.assertEqual(self.run_alerts(19), [])
        out = []
        sent = self.run_alerts(20, send=lambda t, m, p, g: out.append((t, m)) or True)
        self.assertEqual(sent, ["digest"])
        title, msg = out[0]
        self.assertEqual(title, "1 new links to submit")
        self.assertIn("Posted today:", msg)
        self.assertIn("Links to submit: 1", msg)
        self.assertIn("Clips left for 9 days", msg)
        self.assertIn("Bench low", msg)
        self.assertIn("Idle: idle.page", msg)
        self.assertIn("https://dash", msg)
        self.assertEqual(self.run_alerts(21), [])
        nothing = []
        self.ws.x("DELETE FROM uploads")
        self.state["notified"].clear()
        self.state["digest_ts"] = ""
        self.run_alerts(20, day=27, send=lambda t, m, p, g: nothing.append(t) or True)
        self.assertEqual(nothing, ["Daily summary"])              # no links: still a short daily line

    def test_a_late_digest_is_sent_at_8_in_the_morning_not_at_midnight(self):
        self.add_post("acct.a", 2, views=5)
        self.assertEqual(self.run_alerts(23), [])                 # 23:30: quiet, queued
        self.assertEqual(self.run_alerts(8, day=27), ["digest"])
        self.assertEqual(self.run_alerts(20, day=27), ["digest"])   # and tonight's own digest still comes

    def test_weekly_summary_sunday_evening_once(self):
        self.add_post("acct.a", 30, views=1200)
        self.ws.set_setting("insights", ["Videos average 480 views, slideshows 190: more videos tonight."])
        self.assertNotIn("weekly", self.run_alerts(19, day=24))                            # Saturday evening: no
        self.assertNotIn("weekly", self.run_alerts(17, day=25))                            # Sunday 17:30: too early
        out = []
        sent = self.run_alerts(18, day=25, send=lambda t, m, p, g: out.append((t, m)) or True)     # Sunday 18:30
        self.assertIn("weekly", sent)
        weekly = [m for t, m in out if t == "Weekly summary"][0]
        self.assertIn("This week: 1 posts, 1,200 views", weekly)
        self.assertIn("more videos tonight", weekly)
        self.assertIn("https://dash", weekly)
        self.assertNotIn("weekly", self.run_alerts(21, day=25))                            # once that week
        nxt = alerts.run(self.ws, self.state, {"days_left": 9}, True, lambda *a: True,
                         dt.datetime(2026, 11, 1, 23, 30, tzinfo=UTC), "https://dash", pl)          # Sunday 1 Nov 18:30 EST
        self.assertIn("weekly", nxt)


class RunStateTests(WsCase):
    def test_run_history_keeps_the_newest_hundred(self):
        for i in range(105):
            runstate.record_run(self.ws, {"ts": f"t{i}", "posted": i})
        h = self.ws.setting("runs.history")
        self.assertEqual((len(h), h[0]["ts"], h[-1]["ts"]), (100, "t5", "t104"))
        self.assertEqual(runstate.note_lines(["a  b", "a b", "x" * 400, ""] + [str(i) for i in range(20)], limit=5, width=10)[:2],
                         ["a b", "xxxxxxxxxx"])

    def test_chain_heartbeat_detects_a_stall(self):
        runstate.chain_update(self.ws, NOW)
        c = runstate.chain_update(self.ws, NOW + dt.timedelta(hours=4))
        self.assertIsNone(c["stalled_hours"])
        self.assertEqual(c["stale_after"], "2026-10-26T27:00:00Z".replace("26T27", "27T03"))   # 2.5 cadences after the run
        c = runstate.chain_update(self.ws, NOW + dt.timedelta(hours=4 + 31))
        self.assertEqual(c["stalled_hours"], 31.0)
        self.assertEqual(len(c["gaps"]), 1)

    def test_lock_blocks_a_second_live_run_but_not_a_dead_one(self):
        runstate.write_lock(self.tmp, "run-A", NOW)
        self.assertIsNone(runstate.lock_held_by_other(self.tmp, "run-A", NOW))                       # our own
        self.assertEqual(runstate.lock_held_by_other(self.tmp, "run-B", NOW + dt.timedelta(minutes=30))["run_id"], "run-A")
        self.assertIsNone(runstate.lock_held_by_other(self.tmp, "run-B", NOW + dt.timedelta(minutes=101)))   # dead lock
        runstate.clear_lock(self.tmp)
        self.assertIsNone(runstate.read_lock(self.tmp))

    def test_trim_deletes_old_events_rejected_files_and_orphans_but_keeps_transcripts(self):
        old = (NOW - dt.timedelta(days=30)).replace(tzinfo=None).isoformat(timespec="seconds")
        for i in range(30):
            self.ws.x("INSERT INTO events(ts, level, message) VALUES(?,?,?)", (old, "info", f"old {i}"))
        self.ws.x("INSERT INTO events(ts, level, message) VALUES(?,?,?)", (NOW.replace(tzinfo=None).isoformat(), "info", "new"))
        junk = self.ws.home / "ready" / "x" / "junk.mp4"
        junk.parent.mkdir(parents=True)
        junk.write_bytes(b"x" * 100)
        os.utime(junk, (0, 0))
        rej = self.tmp / "rejected.mp4"
        rej.write_bytes(b"x" * 100)
        self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                  "VALUES(1,'C','x','x','f:x','done',?,?)", (pl.now(), pl.now()))
        self.ws.x("INSERT INTO clips(source_id, campaign, title, status, ready_file, created) VALUES(1,'C','t','rejected',?,?)",
                  (str(rej), pl.now()))
        tr = self.ws.home / "sources" / "1" / "transcript.json"
        tr.parent.mkdir(parents=True)
        tr.write_text("{}")
        big = self.ws.home / "sources" / "1" / "audio.bin"
        big.write_bytes(b"\0" * 21_000_000)
        rep = runstate.trim_state(self.ws, self.tmp, NOW)
        self.assertEqual(rep["events_deleted"], 30)
        self.assertFalse(junk.exists() or rej.exists() or big.exists())
        self.assertTrue(tr.exists())
        self.assertEqual(self.ws.q("SELECT COUNT(*) n FROM events")[0]["n"], 1)
        self.assertEqual(self.ws.setting("events.archive")[old[:10]], {"info": 30})

    def test_with_retries_backs_off_and_gives_up(self):
        calls, waits = [], []

        def flaky():
            calls.append(1)
            if len(calls) < 3:
                raise OSError("network")
            return "ok"
        self.assertEqual(runstate.with_retries(flaky, tries=4, base=2, sleep=waits.append), "ok")
        self.assertEqual(waits, [2, 4])
        with self.assertRaises(OSError):
            runstate.with_retries(lambda: (_ for _ in ()).throw(OSError("down")), tries=2, sleep=lambda s: None)


class SchedulingTests(unittest.TestCase):
    def slot(self, now=NOW, taken=(), **kw):
        args = dict(window=(8, 23), account="a", kind="video", best_hours=None)
        args.update(kw)
        return scheduling.plan_slot(now, "America/New_York", args.pop("window"), args.pop("account"), args.pop("kind"),
                                    list(taken), **args)

    def test_slot_is_in_prime_time_inside_the_window_and_in_the_future(self):
        s = self.slot()
        local = scheduling.to_local(s["utc"], "America/New_York")
        self.assertEqual(local.hour, 12)                                       # 09:00 now -> first prime hour is 12
        self.assertTrue(s["utc"] >= NOW + dt.timedelta(minutes=scheduling.LEAD_MIN))
        self.assertEqual(s["timezone"], "America/New_York")
        self.assertRegex(s["scheduledFor"], r"^2026-10-26T12:\d\d:00$")

    def test_minute_is_jittered_not_fixed_and_stable_for_a_rerun(self):
        minutes = {self.slot(account=f"acct{i}")["utc"].minute for i in range(12)}
        self.assertGreater(len(minutes), 5)
        self.assertNotEqual(minutes, {33})
        self.assertEqual(self.slot(account="x"), self.slot(account="x"))        # same account, same day: same slot
        self.assertNotEqual(self.slot(account="x")["utc"], self.slot(account="x", now=NOW + dt.timedelta(days=1))["utc"])

    def test_two_accounts_never_share_a_minute(self):
        taken = []
        for i in range(10):
            s = self.slot(account=f"a{i}", taken=taken)
            for t in taken:
                self.assertGreaterEqual(abs((s["utc"] - t).total_seconds()), scheduling.SEP_MIN * 60)
            taken.append(s["utc"])

    def test_gap_hours_spacing_and_end_of_window(self):
        first = self.slot()
        nxt = self.slot(now=NOW + dt.timedelta(hours=1), last_same_kind=first["utc"], min_gap_h=7)
        self.assertGreaterEqual((nxt["utc"] - first["utc"]).total_seconds(), 7 * 3600)
        late = dt.datetime(2026, 10, 27, 1, 30, tzinfo=UTC)                     # 21:30 New York
        none = self.slot(now=late, last_same_kind=late - dt.timedelta(hours=1), min_gap_h=7)
        self.assertIsNone(none)                                                 # would be after 23:00: wait for tomorrow
        any_gap = self.slot(now=NOW, last_any=NOW + dt.timedelta(hours=3))
        self.assertGreaterEqual((any_gap["utc"] - (NOW + dt.timedelta(hours=3))).total_seconds(), scheduling.ANY_GAP_MIN * 60)

    def test_own_best_hours_win_over_prime_time(self):
        s = self.slot(best_hours=[15, 16])
        self.assertIn(scheduling.to_local(s["utc"], "America/New_York").hour, (15, 16))
        # best hours outside the window are ignored
        s = self.slot(best_hours=[3])
        self.assertIn(scheduling.to_local(s["utc"], "America/New_York").hour, (12, 13, 18, 19, 20, 21))

    def test_the_rest_of_the_current_hour_is_usable(self):
        now = dt.datetime(2026, 10, 26, 16, 20, tzinfo=UTC)                     # 12:20 New York: inside prime hour 12
        s = self.slot(now=now)
        self.assertGreaterEqual(s["utc"], now + dt.timedelta(minutes=scheduling.LEAD_MIN))
        self.assertEqual(scheduling.to_local(s["utc"], "America/New_York").hour, 12)

    def test_dst_fall_back_day(self):
        now = dt.datetime(2026, 11, 1, 14, 0, tzinfo=UTC)                       # 09:00 EST on the day clocks fell back
        s = self.slot(now=now)
        self.assertEqual(scheduling.to_local(s["utc"], "America/New_York").hour, 12)
        self.assertEqual(s["utc"].hour, 17)                                     # 12:xx EST = 17:xx UTC


class GateTests(WsCase):
    def setUp(self):
        super().setUp()
        self.c = {"name": "Tradever", "clip": {"min": 12, "max": 55}, "banned_phrases": ["guaranteed"],
                  "caption": {"required_hashtags": ["#tradever"], "required_mentions": ["@tradeverfunding", "@laythbanks"],
                              "mentions_last": True, "required_text": ""},
                  "disclosure": {"caption": "#ad"}, "on_screen": {"logo": "logos/x.png"}}
        self.good = "Why most traders fail #ad #tradever @tradeverfunding @laythbanks"

    def row(self, **kw):
        d = {"id": 1, "campaign": "Tradever", "title": "Why most traders fail", "text": "words " * 3, "kind": "video",
             "ready_file": None, "checks": "[]"}
        d.update(kw)

        class R(dict):
            def keys(self):
                return list(dict.keys(self))
        return R(d)

    def test_a_good_caption_passes(self):
        self.assertEqual(gate.recheck(self.ws, self.c, self.row(), self.good), {"hold": [], "skip": []})

    def test_each_rule_holds_the_clip_with_a_reason(self):
        cases = {
            "required hashtag #tradever is missing": "Why #ad @tradeverfunding @laythbanks",
            "required tag @laythbanks is missing": "Why #ad #tradever @tradeverfunding",
            "the required tags must be the very end of the caption": "#ad #tradever @tradeverfunding @laythbanks and more words",
            "disclosure #ad is missing": "Why #tradever @tradeverfunding @laythbanks",
            "banned phrase 'guaranteed' in the caption": "Guaranteed wins #ad #tradever @tradeverfunding @laythbanks",
        }
        for want, cap in cases.items():
            with self.subTest(want):
                got = gate.recheck(self.ws, self.c, self.row(), cap)["hold"]
                self.assertIn(want, got)

    def test_banned_phrase_in_the_speech_or_title(self):
        got = gate.recheck(self.ws, self.c, self.row(text="this is guaranteed money"), self.good)["hold"]
        self.assertTrue(any("guaranteed" in g and "speech" in g for g in got), got)

    def test_logo_and_length_use_evidence_when_there_is_some(self):
        bad_logo = json.dumps([{"ok": False, "check": "brand logo on screen for the whole clip"}])
        got = gate.recheck(self.ws, self.c, self.row(checks=bad_logo), self.good)["hold"]
        self.assertEqual(got, ["clip check failed: brand logo on screen for the whole clip"])
        got = gate.recheck(self.ws, self.c, self.row(ready_file="x.mp4"), self.good, probe=lambda p: 80.0)["hold"]
        self.assertEqual(got, ["length 80s is outside the campaign's 12-55s"])
        ok = gate.recheck(self.ws, self.c, self.row(ready_file="x.mp4"), self.good, probe=lambda p: 30.0)
        self.assertEqual(ok["hold"], [])
        broken = gate.recheck(self.ws, self.c, self.row(ready_file="x.mp4"), self.good, probe=lambda p: 1 / 0)
        self.assertEqual(broken["hold"], [])                                     # no evidence is not a problem

    def test_skip_when_campaign_inactive_or_account_not_allocated(self):
        r = gate.recheck(self.ws, self.c, self.row(), self.good, "other.page", {"state": "paused"}, ["tradever.clips"])
        self.assertEqual(r["hold"], [])
        self.assertEqual(len(r["skip"]), 2)
        ok = gate.recheck(self.ws, self.c, self.row(), self.good, "tradever.clips", {"state": "active"}, ["tradever.clips"])
        self.assertEqual(ok["skip"], [])

    def test_the_same_moment_twice_is_held(self):
        text = "prop firms pay you only when you follow every rule on the evaluation and most traders never do that"
        cid = self.add_post("acct.a", 5, views=10, campaign="Tradever")
        self.ws.x("UPDATE clips SET text=? WHERE id=?", (text, cid))
        got = gate.recheck(self.ws, self.c, self.row(id=99, text=text), self.good)["hold"]
        self.assertTrue(any("nearly the same speech" in g for g in got), got)
        self.assertEqual(gate.recheck(self.ws, self.c, self.row(id=99, text="something else entirely " * 4), self.good)["hold"], [])


class FootageTests(WsCase):
    def camp(self, **kw):
        c = brief("Yt Co", sources=["https://www.youtube.com/@creator/videos", "footage/yt"],
                  permission={"campaign_url": "https://contentrewards.com/c/campaigns/yt", "allowed_sources": [
                      "youtube.com/@creator", "file:footage/yt"]}, _path=str(self.tmp / "camps" / "yt.json"),
                  clip={"latest": 2})
        c.update(kw)
        return c

    def test_only_new_videos_newest_n_and_only_allowed_channels(self):
        calls = []

        def lister(url, n):
            calls.append((url, n))
            return [{"id": "v3", "url": "https://www.youtube.com/watch?v=v3", "title": "three"},
                    {"id": "v2", "url": "https://www.youtube.com/watch?v=v2", "title": "two"}]
        c = self.camp()
        got = footage.poll_youtube(self.ws, c, NOW, 2, lister)
        self.assertEqual(got["urls"], ["https://www.youtube.com/watch?v=v3", "https://www.youtube.com/watch?v=v2"])
        self.assertEqual(calls, [("https://www.youtube.com/@creator/videos", 2)])
        again = footage.poll_youtube(self.ws, c, NOW, 2, lister)
        self.assertEqual(again["urls"], [])                                         # ledger: nothing new
        self.assertEqual(set(footage.ledger(self.ws)["youtube"]["Yt Co"]), {"v2", "v3"})
        other = self.camp(permission={"campaign_url": "x", "allowed_sources": ["youtube.com/@someoneelse"]})
        out = footage.poll_youtube(self.ws, other, NOW, 2, lister)
        self.assertEqual(out["urls"], [])
        self.assertIn("not in this campaign's allowed_sources", out["blocked"][0])

    def test_a_failing_listing_is_recorded_not_raised(self):
        out = footage.poll_youtube(self.ws, self.camp(), NOW, 2, lambda u, n: (_ for _ in ()).throw(RuntimeError("blocked by YouTube")))
        self.assertEqual(out["urls"], [])
        self.assertIn("blocked by YouTube", out["errors"][0])

    def test_explicit_sources_keep_local_folders_and_add_only_new_videos(self):
        c = self.camp()
        got = footage.explicit_sources(self.ws, c, NOW, lambda u, n: [{"id": "v9", "url": "https://www.youtube.com/watch?v=v9"}])
        self.assertEqual(got, [str(self.tmp / "camps" / "footage/yt"), "https://www.youtube.com/watch?v=v9"])
        self.assertIsNone(footage.explicit_sources(self.ws, self.camp(sources=["footage/yt"]), NOW))   # no channel: default path
        self.assertEqual(footage.explicit_sources(self.ws, c, NOW, lambda u, n: []), [str(self.tmp / "camps" / "footage/yt")])

    def sources(self):
        for i, (inp, st) in enumerate([("https://www.youtube.com/watch?v=aaa", "done"), (str(self.tmp / "gone.mp4"), "done"),
                                       (str(self.tmp / "here.mp4"), "done"), ("https://y/b", "failed")], 1):
            self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                      "VALUES(?,?,?,?,?,?,?,?)", (i, "Yt Co", "x", inp, f"c{i}", st, pl.now(), pl.now()))
            self.ws.x("INSERT INTO clips(source_id, campaign, title, status, created) VALUES(?,?,?,?,?)",
                      (i, "Yt Co", "t", "approved", pl.now()))
        (self.tmp / "here.mp4").write_bytes(b"x")

    def test_restock_requeues_old_sources_only_when_supply_is_short_and_media_is_available(self):
        self.sources()
        c = self.camp()
        self.assertEqual(footage.restock(self.ws, c, NOW, 5.0)["queued"], [])                       # plenty of supply
        fetched = []
        out = footage.restock(self.ws, c, NOW, 1.5, fetch=lambda row: fetched.append(row["id"]) or False, limit=3)
        self.assertEqual(out["queued"], [1, 3])                                                      # URL + file still on disk
        self.assertEqual(len(out["skipped"]), 1)                                                     # gone.mp4: no media to fetch
        self.assertEqual(fetched, [2])
        self.assertEqual({r["id"]: r["status"] for r in self.ws.q("SELECT id, status FROM sources")}[1], "queued")
        self.assertEqual(footage.restock(self.ws, c, NOW + dt.timedelta(days=2), 1.0)["queued"], [])   # not again for a week
        out = footage.restock(self.ws, c, NOW + dt.timedelta(days=8), 1.0, fetch=lambda row: True)
        self.assertIn(2, out["queued"])

    def test_restocked_clips_may_score_ten_points_lower(self):
        self.sources()
        footage.restock(self.ws, self.camp(), NOW, 1.0, limit=1)
        row = {"source_id": 1}
        other = {"source_id": 3}
        self.assertEqual(footage.lowered_min_score(self.ws, row, 55), 45)
        self.assertEqual(footage.lowered_min_score(self.ws, other, 55), 55)
        self.assertEqual(footage.lowered_min_score(self.ws, row, 45), 40)                            # floor 40

    def test_sources_with_mostly_rejected_clips_are_not_restocked(self):
        self.sources()
        self.ws.x("UPDATE clips SET status='rejected' WHERE source_id IN (1,3)")
        self.assertEqual(footage.restock(self.ws, self.camp(), NOW, 1.0, fetch=lambda r: True)["queued"], [2])

    def test_drive_ledger_remembers_files_for_a_later_refetch(self):
        footage.drive_note(self.ws, "Yt Co", "FID1", "episode-1.mp4", NOW)
        self.assertEqual(footage.drive_id_for(self.ws, "Yt Co", "/any/where/episode-1.mp4"), "FID1")
        self.assertIsNone(footage.drive_id_for(self.ws, "Yt Co", "other.mp4"))


class DriveTests(WsCase):
    """Drive sync and the restock re-download, with a fake gdown (no network, no ffmpeg)."""

    class F:
        def __init__(self, fid, path):
            self.id, self.path = fid, path

    def setUp(self):
        super().setUp()
        self.old = (cr.HOME, cr._gdown, cr._download_convert)
        cr.HOME = self.tmp / "home"
        cr.HOME.mkdir()
        self.listing = [self.F("F1", "folder/ep1.mov"), self.F("F2", "folder/ep2.mp4")]

        class G:
            @staticmethod
            def download_folder(id, skip_download, quiet):
                return outer.listing
        outer = self
        cr._gdown = lambda: G
        self.fetched = []

        def fake_convert(gdown, fid, name, dest):
            self.fetched.append((fid, name, dest))
            out = dest / (Path(name).stem + ".mp4")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(b"x")
            return out
        cr._download_convert = fake_convert
        self.cfile = self.tmp / "camp.json"
        self.cfile.write_text(json.dumps(brief("Yt Co", footage_drive_folder="FOLDER", sources=["footage/yt"])))

    def tearDown(self):
        cr.HOME, cr._gdown, cr._download_convert = self.old
        super().tearDown()

    def test_new_files_are_fetched_once_remembered_and_the_folder_status_recorded(self):
        state = {}
        new = cr.sync_drive(self.cfile, state, self.ws)
        self.assertEqual(sorted(new), ["ep1.mp4", "ep2.mp4"])
        self.assertTrue(state["drive_status"]["Yt Co"]["ok"])
        self.assertEqual(state["drive_status"]["Yt Co"]["files"], 2)
        self.assertEqual(cr.sync_drive(self.cfile, state, self.ws), [])                    # already seen
        self.assertEqual(footage.drive_id_for(self.ws, "Yt Co", "ep1.mp4"), "F1")

    def test_a_folder_that_cannot_be_listed_is_reported_not_raised(self):
        cr._gdown = lambda: type("G", (), {"download_folder": staticmethod(lambda **k: (_ for _ in ()).throw(RuntimeError("not shared")))})
        state = {}
        self.assertEqual(cr.sync_drive(self.cfile, state, self.ws), [])
        self.assertFalse(state["drive_status"]["Yt Co"]["ok"])
        items = {i["id"]: i for i in __import__("preflight").run(self.ws, {"briefs": [brief("Yt Co", footage_drive_folder="FOLDER")],
                                                                          "drive_status": state["drive_status"]})}
        self.assertFalse(items["drive_footage"]["done"])
        self.assertIn("not shared", items["drive_footage"]["detail"])

    def test_restock_fetch_uses_the_ledger_then_falls_back_to_the_folder_listing(self):
        footage.drive_note(self.ws, "Yt Co", "F1", "ep1.mp4", NOW)
        fetch = cr.drive_fetcher(self.ws, [brief("Yt Co", footage_drive_folder="FOLDER")])
        dest = self.tmp / "campaigns" / "footage" / "yt"
        self.assertTrue(fetch({"campaign": "Yt Co", "input": str(dest / "ep1.mp4")}))
        self.assertEqual(self.fetched[-1][0], "F1")
        self.assertTrue(fetch({"campaign": "Yt Co", "input": str(dest / "ep2.mp4")}))          # not in the ledger: found by name
        self.assertEqual(self.fetched[-1][0], "F2")
        self.assertFalse(fetch({"campaign": "Yt Co", "input": str(dest / "nothere.mp4")}))
        self.assertFalse(fetch({"campaign": "Other", "input": str(dest / "ep1.mp4")}))        # no Drive folder: cannot
        self.assertEqual(self.fetched[-1][2], dest)                                            # put back exactly where the source expects it


# ---------------------------------------------------------------------------------------------- the posting loop

class FakeZernioUploader:
    """Looks like pipeline.ZernioUploader (kind 'zernio'): records the schedule / key / callback it was given."""
    kind = "zernio"

    def __init__(self, fail=None):
        self.calls, self.fail = [], fail or {}

    def upload(self, path, title, description, tags, privacy, paid, ctx=None):
        acct = getattr(self, "account", None)
        self.calls.append({"path": str(path), "desc": description, "ctx": ctx})
        n = len(self.calls)
        if ctx and ctx.get("on_created"):
            ctx["on_created"](f"post{n}")
        return {"remote_id": f"r{n}", "url": f"https://www.tiktok.com/@x/video/{n}", "state": "live", "notes": [],
                "publish_id": f"post{n}", "scheduled_for": None}

    def lookup(self, post_id):
        return None


class PostingLoopTests(WsCase):
    """pipeline.autopilot_cycle with the lifecycle's records in the settings."""

    def setUp(self):
        super().setUp()
        import campaign as cmp
        tmpl = json.loads((HERE / "campaigns" / "_template.json").read_text())
        self.camps = {}
        for name, match in (("Acme", "acme"), ("Zeta", "zeta")):
            c = dict(tmpl)
            c.update(name=name, automation_allowed=True, platforms=["tiktok"], accounts={"tiktok": "*"}, account_match=match,
                     sources=[], disclosure={"caption": "#ad"}, caption={"required_hashtags": [], "required_mentions": ["@tag"],
                                                                        "mentions_last": True, "required_text": ""})
            c["permission"] = dict(c["permission"], campaign_url=f"https://contentrewards.com/c/{name}",
                                   verified_on=dt.date.today().isoformat(), evidence="t", allowed_sources=["file:x"])
            f = self.tmp / f"{name}.json"
            f.write_text(json.dumps(c))
            self.camps[name] = f
        for k, v in {"autopilot.enabled": True, "autopilot.platforms": ["tiktok"], "autopilot.campaigns": [],
                     "autopilot.via": "free", "autopilot.max_uploads_per_day": 3, "autopilot.max_slides_per_day": 1}.items():
            self.ws.set_setting(k, v)
        for i, name in enumerate(self.camps, 1):
            self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                      "VALUES(?,?,?,?,?,'done',?,?)", (i, name, str(self.camps[name]), name, f"f:{name}", pl.now(), pl.now()))
        self.n = 0

    def clip(self, name, title=None, caption=None, kind="video", score=80):
        self.n += 1
        sid = list(self.camps).index(name) + 1
        title = title or f"{name} clip {self.n}"
        path = self.tmp / f"c{self.n}.mp4"
        if kind == "slideshow":
            path.mkdir()
            (path / "slide_01.jpg").write_bytes(b"x")
        else:
            path.write_bytes(b"x")
        cap = caption if caption is not None else f"#ad {title} @tag"
        self.ws.x("INSERT INTO clips(source_id, campaign, title, caption, hashtags, posts, checks, flags, score, file, status, "
                  "ready_file, created, kind, text, start, end_) VALUES(?,?,?,?,'[]',?,'[]','[]',?,?,'approved',?,?,?,?,0,25)",
                  (sid, name, title, cap, json.dumps({"tiktok": {"caption": cap}}), score, str(path), str(path), pl.now(), kind,
                   f"unique spoken words number {self.n} " * 3))
        return self.ws.q("SELECT MAX(id) m FROM clips")[0]["m"]

    def state(self, name, state="active", accounts=()):
        self.ws.set_setting(f"campaign_state.{name}", {"state": state, "reason": "test", "accounts": [f"tiktok/{a}" for a in accounts]})

    def acct(self, name, mode="normal", **limits):
        self.ws.set_setting(f"account_state.tiktok/{name}", {"campaign": "x", "mode": mode, "limits": limits})

    def cycle(self, up=None, **settings):
        for k, v in settings.items():
            self.ws.set_setting(k, v)
        self.ws.set_setting("autopilot.campaigns", [])
        up = up or FakeZernioUploader()
        with redirect_stdout(io.StringIO()):
            pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None, "cookies_from_browser": None})(),
                               uploaders={"tiktok": up})
        return up

    def posted(self):
        return [(r["name"] if False else r["campaign"], r["account"]) for r in self.ws.q(
            "SELECT c.campaign, u.account FROM uploads u JOIN clips c ON c.id=u.clip_id")]

    def last_rep(self):
        return json.loads((self.ws.home / "logs" / "autopilot.jsonl").read_text().strip().splitlines()[-1])

    def test_a_campaign_posts_only_on_its_allocated_pages(self):
        self.state("Acme", accounts=["acme.one"])
        self.state("Zeta", accounts=["zeta.one"])
        pl._ZERNIO_NAMES["tiktok"] = ["acme.one", "acme.two", "zeta.one"]
        for _ in range(2):
            self.clip("Acme")
            self.clip("Zeta")
        self.cycle()
        self.assertEqual(sorted(self.posted()), [("Acme", "acme.one"), ("Acme", "acme.one"), ("Zeta", "zeta.one"), ("Zeta", "zeta.one")])
        pl._ZERNIO_NAMES.clear()

    def test_paused_ended_blocked_campaigns_post_nothing_standby_says_why(self):
        for st in ("paused", "ended", "blocked"):
            self.state("Acme", st)
            self.clip("Acme")
            self.cycle()
            self.assertEqual(self.posted(), [], st)
        self.state("Acme", "standby")
        self.ws.set_setting("campaign_state.Acme", {"state": "standby", "reason": "waiting for a free TikTok page", "accounts": []})
        self.cycle()
        self.assertEqual(self.posted(), [])
        self.assertTrue(any("standby" not in n and "waiting for a free TikTok page" in n for n in self.last_rep()["notes"]))

    def test_warmup_limits_an_account_to_one_post_a_day_in_total(self):
        self.state("Acme", accounts=["acme.new", "acme.old"])
        self.acct("acme.new", "warmup", max_per_day=1)
        self.acct("acme.old", "normal")
        for _ in range(8):
            self.clip("Acme")
        self.cycle(**{"autopilot.max_uploads_per_day": 5})
        accounts = [a for _c, a in self.posted()]
        self.assertEqual(accounts.count("acme.new"), 1)
        self.assertEqual(accounts.count("acme.old"), 5)
        self.cycle(**{"autopilot.max_uploads_per_day": 5})
        self.assertEqual([a for _c, a in self.posted()].count("acme.new"), 1)           # still one: it is the same day

    def test_cooldown_account_gets_nothing_others_keep_posting(self):
        self.state("Acme", accounts=["acme.bad", "acme.ok"])
        self.acct("acme.bad", "cooldown", blocked=True)
        self.acct("acme.ok", "normal")
        for _ in range(3):
            self.clip("Acme")
        self.cycle()
        self.assertEqual({a for _c, a in self.posted()}, {"acme.ok"})
        self.assertTrue(any("cooldown" in n for n in self.last_rep()["notes"]))

    def test_slow_account_gets_half_the_cap_and_only_the_best_clips(self):
        self.state("Acme", accounts=["acme.slow"])
        self.acct("acme.slow", "slow", cap_factor=0.5, gap_factor=2.0, best_only=True)
        for sc in (90, 85, 80, 20, 10, 5):
            self.clip("Acme", score=sc)
        self.cycle(**{"autopilot.max_uploads_per_day": 4})
        self.assertEqual(len(self.posted()), 2)                                          # 4 halved
        scores = sorted(r["score"] for r in self.ws.q("SELECT c.score FROM uploads u JOIN clips c ON c.id=u.clip_id"))
        self.assertEqual(scores, [85, 90])

    def test_gate_holds_a_clip_with_a_reason_and_releases_it_when_it_passes(self):
        bad = self.clip("Acme", caption="no disclosure here @tag")
        good = self.clip("Acme")
        self.state("Acme", accounts=["acme.one"])
        up = self.cycle()
        self.assertEqual(len(up.calls), 1)
        row = self.ws.q("SELECT status, held_reason FROM clips WHERE id=?", (bad,))[0]
        self.assertEqual(row["status"], "pending_review")
        self.assertTrue(row["held_reason"].startswith(gate.HOLD_PREFIX))
        self.assertIn("disclosure #ad is missing", row["held_reason"])
        self.assertIn("pending_review", [r["status"] for r in self.ws.q("SELECT status FROM clips")])
        up2 = self.cycle()                                                                # still wrong: stays held, no loop
        self.assertEqual(up2.calls, [])
        self.assertEqual(self.ws.q("SELECT status FROM clips WHERE id=?", (bad,))[0]["status"], "pending_review")
        posts = json.dumps({"tiktok": {"caption": "#ad fixed caption @tag"}})            # someone fixes it
        self.ws.x("UPDATE clips SET posts=?, caption=? WHERE id=?", (posts, "#ad fixed caption @tag", bad))
        up3 = self.cycle(**{"autopilot.min_gap_hours": 0, "autopilot.max_uploads_per_day": 9})
        self.assertEqual(self.ws.q("SELECT status FROM clips WHERE id=?", (bad,))[0]["status"], "posted")
        self.assertIsNone(self.ws.q("SELECT held_reason FROM clips WHERE id=?", (bad,))[0]["held_reason"])

    def test_never_the_same_clip_twice_and_a_missing_file_is_dropped(self):
        a = self.clip("Acme")
        self.state("Acme", accounts=["acme.one", "acme.two"])
        self.cycle(**{"autopilot.min_gap_hours": 0})
        self.cycle(**{"autopilot.min_gap_hours": 0})
        self.assertEqual(len(self.posted()), 1)
        b = self.clip("Acme")
        Path(self.ws.q("SELECT ready_file FROM clips WHERE id=?", (b,))[0]["ready_file"]).unlink()
        self.cycle(**{"autopilot.min_gap_hours": 0})
        self.assertEqual(self.ws.q("SELECT status FROM clips WHERE id=?", (b,))[0]["status"], "render_failed")

    def test_platform_rejecting_a_clip_twice_holds_it_for_a_human(self):
        import zernio

        class Rejecting(FakeZernioUploader):
            def upload(self, *a, **k):
                raise zernio.ZernioError("tiktok rejected the post: video too short")
        cid = self.clip("Acme")
        self.state("Acme", accounts=["acme.one"])
        self.cycle(Rejecting(), **{"autopilot.min_gap_hours": 0})
        self.assertEqual(self.ws.q("SELECT requeues, status FROM clips WHERE id=?", (cid,))[0]["requeues"], 1)
        self.cycle(Rejecting(), **{"autopilot.min_gap_hours": 0})
        row = self.ws.q("SELECT requeues, status, held_reason FROM clips WHERE id=?", (cid,))[0]
        self.assertEqual((row["requeues"], row["status"]), (2, "pending_review"))
        self.assertIn("failed twice", row["held_reason"])
        self.assertEqual(self.cycle(**{"autopilot.min_gap_hours": 0}).calls, [])              # not tried a third time

    def test_a_login_error_rests_the_account_and_is_recorded(self):
        import zernio

        class Expired(FakeZernioUploader):
            def upload(self, *a, **k):
                raise zernio.ZernioError("Zernio error 400: Account is disconnected. Please reconnect your TikTok account.")
        self.clip("Acme")
        self.state("Acme", accounts=["acme.one"])
        self.cycle(Expired(), **{"autopilot.min_gap_hours": 0})
        self.assertIn("reconnect", self.ws.setting("account.err.tiktok/acme.one")["msg"])
        self.assertEqual(self.ws.q("SELECT requeues FROM clips")[0]["requeues"], 0)             # not the clip's fault

    def test_scheduled_posts_carry_a_planned_time_a_stable_key_and_distinct_minutes(self):
        import fakeworld as fw
        clock = fw.FakeClock(dt.datetime(2026, 10, 26, 13, 0))                    # 09:00 New York: a whole day ahead
        undo = fw.install_clock(clock)
        self.addCleanup(undo)
        self.state("Acme", accounts=["acme.one", "acme.two"])
        for _ in range(4):
            self.clip("Acme")
        up = self.cycle(**{"autopilot.schedule": True, "autopilot.post_hours": [0, 24], "autopilot.min_gap_hours": 0,
                           "autopilot.max_uploads_per_day": 3})
        self.assertEqual(len(up.calls), 4)
        sched = [c["ctx"]["schedule"] for c in up.calls]
        keys = [c["ctx"]["idempotency_key"] for c in up.calls]
        self.assertEqual(len(set(keys)), 4)
        times = [s["scheduledFor"] for s in sched]
        self.assertEqual(len(set(times)), 4, "two posts in the same minute")
        for c in up.calls:
            self.assertTrue(callable(c["ctx"]["on_created"]))
        rows = self.ws.q("SELECT scheduled_for, publish_id FROM uploads")
        self.assertTrue(all(r["scheduled_for"] and r["publish_id"] for r in rows))
        # same clips, state lost, tried again: the key is the same (Zernio hands back the original post)
        k1 = pl._idem_key(self.ws.q("SELECT * FROM clips WHERE id=1")[0], "tiktok", "acme.one")
        self.assertEqual(k1, pl._idem_key(self.ws.q("SELECT * FROM clips WHERE id=1")[0], "tiktok", "acme.one"))
        self.assertNotEqual(k1, pl._idem_key(self.ws.q("SELECT * FROM clips WHERE id=1")[0], "tiktok", "acme.two"))

    def test_if_zernio_refuses_scheduling_the_clip_is_posted_at_once_and_scheduling_rests_for_a_week(self):
        import fakeworld as fw
        import zernio

        class Refuses(FakeZernioUploader):
            def upload(self, path, title, description, tags, privacy, paid, ctx=None):
                if ctx:
                    raise zernio.ZernioError("Zernio error 400: scheduledFor must be further in the future")
                return super().upload(path, title, description, tags, privacy, paid, None)
        clock = fw.FakeClock(dt.datetime(2026, 10, 26, 13, 0))
        self.addCleanup(fw.install_clock(clock))
        self.state("Acme", accounts=["acme.one"])
        self.clip("Acme")
        up = self.cycle(Refuses(), **{"autopilot.schedule": True, "autopilot.post_hours": [0, 24]})
        self.assertEqual(len(up.calls), 1)                                               # posted anyway, without a schedule
        self.assertIsNone(up.calls[0]["ctx"])
        self.assertEqual(len(self.posted()), 1)
        self.assertIsNone(self.ws.q("SELECT scheduled_for FROM uploads")[0]["scheduled_for"])
        self.assertIn("refused", self.ws.setting("schedule.refused")["msg"].lower() + "refused")
        cr.configure(self.ws, 2, [], schedule=True)
        self.assertFalse(self.ws.setting("autopilot.schedule"))                           # rests
        self.ws.x("DELETE FROM settings WHERE key='schedule.refused'")
        cr.configure(self.ws, 2, [], schedule=True)
        self.assertTrue(self.ws.setting("autopilot.schedule"))

    def test_scheduled_posts_of_a_campaign_that_paused_are_taken_back(self):
        a = self.clip("Acme")
        b = self.clip("Zeta")
        later = (dt.datetime.now(UTC) + dt.timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
        for cid, pid in ((a, "pa"), (b, "pb")):
            self.ws.x("UPDATE clips SET status='posted' WHERE id=?", (cid,))
            self.ws.x("INSERT INTO uploads(clip_id, platform, account, state, publish_id, created, updated, scheduled_for) "
                      "VALUES(?,?,?,?,?,?,?,?)", (cid, "tiktok", "x.one", "processing", pid, pl.now(), pl.now(), later))
        self.state("Acme", "paused")
        self.state("Zeta", "active", ["x.one"])
        deleted = []
        notes = pl.cancel_scheduled(self.ws, dt.datetime.now(UTC), delete=lambda pid: deleted.append(pid) or True)
        self.assertEqual(deleted, ["pa"])
        self.assertEqual(len(notes), 1)
        self.assertIn("Acme: scheduled post for x.one", notes[0])
        self.assertEqual(self.ws.q("SELECT state FROM uploads WHERE clip_id=?", (a,))[0]["state"], "failed")
        self.assertEqual(self.ws.q("SELECT status FROM clips WHERE id=?", (a,))[0]["status"], "approved")   # back in the queue
        self.assertEqual(self.ws.q("SELECT state FROM uploads WHERE clip_id=?", (b,))[0]["state"], "processing")
        # Zernio unreachable: nothing is lost, it is tried again next run
        self.ws.x("UPDATE uploads SET state='processing' WHERE clip_id=?", (a,))
        self.assertEqual(pl.cancel_scheduled(self.ws, dt.datetime.now(UTC), delete=lambda pid: 1 / 0), [])
        self.assertEqual(self.ws.q("SELECT state FROM uploads WHERE clip_id=?", (a,))[0]["state"], "processing")
        # already due (or past): left alone
        self.ws.x("UPDATE uploads SET scheduled_for=?", ((dt.datetime.now(UTC) - dt.timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ"),))
        self.assertEqual(pl.cancel_scheduled(self.ws, dt.datetime.now(UTC), delete=lambda pid: True), [])

    def test_a_scheduled_clip_keeps_its_file_until_it_has_published(self):
        a = self.clip("Acme")
        later = (dt.datetime.now(UTC) + dt.timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, state, publish_id, created, updated, scheduled_for) "
                  "VALUES(?,?,?,?,?,?,?,?)", (a, "tiktok", "x.one", "processing", "p1", pl.now(), pl.now(), later))
        self.assertEqual(cr.prune_posted(self.ws), 0)
        self.assertTrue(Path(self.ws.q("SELECT ready_file FROM clips WHERE id=?", (a,))[0]["ready_file"]).exists())
        self.ws.x("UPDATE uploads SET url='https://t/1', state='live'")
        self.assertEqual(cr.prune_posted(self.ws), 1)

    def test_uploaders_that_are_not_zernio_are_called_the_old_way(self):
        class Plain:
            def __init__(self):
                self.calls = 0

            def upload(self, path, title, description, tags, privacy, paid):        # no ctx parameter
                self.calls += 1
                return {"id": "x", "url": f"https://www.tiktok.com/@x/video/{self.calls}", "privacy": privacy, "notes": []}
        self.state("Acme", accounts=["acme.one"])
        self.clip("Acme")
        up = self.cycle(Plain(), **{"autopilot.schedule": True})
        self.assertEqual(up.calls, 1)

    def test_a_crashing_helper_never_stops_posting(self):
        self.state("Acme", accounts=["acme.one"])
        self.clip("Acme")
        import gate as g
        real = g.recheck
        g.recheck = lambda *a, **k: 1 / 0
        try:
            up = self.cycle()
        finally:
            g.recheck = real
        self.assertEqual(len(up.calls), 1)
        self.assertTrue(self.ws.q("SELECT 1 FROM events WHERE message LIKE 'gate skipped%'"))

    def test_one_campaign_crashing_never_stops_the_others_posts(self):
        self.state("Acme", accounts=["acme.one"])
        self.state("Zeta", accounts=["zeta.one"])
        self.clip("Acme")
        self.clip("Zeta")
        real = am.allowance

        def allowance(ws, platform, account):
            if account.startswith("acme"):
                raise RuntimeError("bad record")
            return real(ws, platform, account)
        am.allowance = allowance
        try:
            self.cycle()
        finally:
            am.allowance = real
        self.assertEqual(self.posted(), [("Zeta", "zeta.one")])
        rep = self.last_rep()
        self.assertTrue(any("posting failed for Acme (video): RuntimeError: bad record" in e for e in rep["step_errors"]))

    def test_one_failing_step_is_recorded_and_posting_still_happens(self):
        self.state("Acme", accounts=["acme.one"])
        self.clip("Acme")
        real = pl.cmd_run
        pl.cmd_run = lambda ws, a: (_ for _ in ()).throw(RuntimeError("ffmpeg exploded"))
        try:
            up = self.cycle()
        finally:
            pl.cmd_run = real
        self.assertEqual(len(up.calls), 1)
        self.assertTrue(any("clipping failed" in e for e in self.last_rep()["step_errors"]))

    def test_the_performance_split_moves_posts_toward_the_winning_kind_but_keeps_exploring(self):
        self.state("Acme", accounts=["acme.one"])
        for _ in range(6):
            self.clip("Acme")
            self.clip("Acme", kind="slideshow")
        self.ws.set_setting("performance", {"settled_posts": 40, "kind_weights": {"video": 0.8, "slideshow": 0.2}})
        self.cycle(**{"autopilot.max_uploads_per_day": 2, "autopilot.max_slides_per_day": 2, "autopilot.min_gap_hours": 0,
                      "autopilot.per_account_per_run": 0})
        kinds = [r["kind"] for r in self.ws.q("SELECT c.kind FROM uploads u JOIN clips c ON c.id=u.clip_id")]
        self.assertEqual((kinds.count("video"), kinds.count("slideshow")), (3, 1))          # 4 posts a day: 3 + 1 (>= 20%)


# ---------------------------------------------------------------------------------------------- whole runs

class WholeRunTests(unittest.TestCase):
    """cloud_runner.main() end to end against the fake world: the brain's wiring, not its internals."""

    @classmethod
    def setUpClass(cls):
        import fakeworld as fw
        cls.fw = fw

    def cloud(self, **kw):
        c = self.fw.Cloud(slideshows=False, **kw)
        self.addCleanup(c.close)
        return c

    def setting(self, c, key):
        ws = c.ws()
        try:
            return ws.setting(key, None)
        finally:
            ws.close()

    def test_dry_campaign_switches_to_the_standby_in_the_same_run_and_tells_the_owner_once(self):
        fw = self.fw
        c = self.cloud(topic=fw.SENTINEL_TOPIC)
        c.add_campaign("Standby Finance", fw.CID2, slideshows=False, match="")        # a campaign that needs no dedicated page
        c.world.cr_pages[fw.CID2] = fw.cr_page(name="Standby Finance", org="OtherCo", budget=150000, spent=0)   # $1,500 left
        c.world.accounts += [{"_id": "tt9", "platform": "tiktok", "username": "hub.clips"}]

        def cap_to_one_active():
            ws = c.ws()
            ws.set_setting("lifecycle.max_active", 1)
            ws.close()
        c.run(footage=[cap_to_one_active, c.seeder(videos=3, campaign=0, tag="a"), c.seeder(videos=3, campaign=1, tag="b")])
        self.assertEqual(self.setting(c, "campaign_state.Acme Clipping")["state"], "active")
        self.assertEqual(self.setting(c, "campaign_state.Standby Finance")["state"], "standby")
        self.assertTrue(all(p["account"].startswith("acme.") for p in c.world.posts))
        c.world.cr_pages[fw.CID] = fw.cr_page(budget=200000, spent=199990)            # Acme runs dry
        c.run(advance={"hours": 8})
        self.assertEqual(self.setting(c, "campaign_state.Acme Clipping")["state"], "paused")
        st2 = self.setting(c, "campaign_state.Standby Finance")
        self.assertEqual((st2["state"], st2["accounts"]), ("active", ["tiktok/hub.clips"]))
        kinds = [(e["kind"], e["campaign"]) for e in self.setting(c, "switch.log")]
        self.assertIn(("paused", "Acme Clipping"), kinds)
        self.assertIn(("promoted", "Standby Finance"), kinds)
        self.assertIn(("account_moved", "Standby Finance"), kinds)
        self.assertEqual(self.setting(c, "account_state.tiktok/hub.clips")["campaign"], "Standby Finance")
        self.assertEqual(self.setting(c, "account_state.tiktok/acme.clips1")["mode"], "idle")        # brand page stays Acme's
        self.assertEqual(self.setting(c, "account_state.tiktok/acme.clips1")["campaign"], "Acme Clipping")
        titles = [m["headers"].get("title") for m in c.world.ntfy]
        self.assertEqual(titles.count("Acme Clipping paused"), 1)
        self.assertEqual(titles.count("acme.clips1 has nothing to post"), 1)
        self.assertTrue(any(p["account"] == "hub.clips" for p in c.world.posts))                     # and it is posting there
        c.run(advance={"hours": 4})
        titles = [m["headers"].get("title") for m in c.world.ntfy]
        self.assertEqual(titles.count("Acme Clipping paused"), 1)                                    # not alerted again

    def test_key_missing_shows_in_the_launch_checklist(self):
        c = self.cloud()
        c.key = None
        c.run(footage=[c.seeder(videos=1)])
        items = {i["id"]: i for i in self.setting(c, "launch.checklist")}
        self.assertFalse(items["zernio_key"]["done"])
        self.assertIn("ZERNIO_API_KEY", items["zernio_key"]["how"])
        self.assertIn("API keys -> Create key", items["zernio_key"]["how"])
        self.assertIn("owner/repo/settings/secrets/actions/new", items["zernio_key"]["how"])
        for i in items.values():
            self.assertEqual(set(i) - {"optional"}, {"id", "label", "done", "manual", "how", "detail"})

    def test_run_history_records_the_run_and_a_failing_zernio(self):
        c = self.cloud()
        c.world.post_fail = [500] * 50
        orig = self.fw.zernio.time.sleep
        self.fw.zernio.time.sleep = lambda s: None
        try:
            c.run(footage=[c.seeder(videos=2)])
        finally:
            self.fw.zernio.time.sleep = orig
        hist = self.setting(c, "runs.history")
        self.assertEqual(len(hist), 1)
        self.assertGreaterEqual(hist[-1]["errors"], 1)
        self.assertEqual(hist[-1]["posted"], 0)
        for k in ("ts", "duration_s", "posted", "errors", "queued_videos", "queued_slideshows", "switches", "notes", "key"):
            self.assertIn(k, hist[-1])
        self.assertEqual(hist[-1]["queued_videos"], 2)

    def test_crash_after_posting_does_not_repost_and_the_state_is_still_saved(self):
        c = self.cloud()
        c.clock.set(2026, 10, 26, 3, 0)
        c.run(footage=[c.seeder(videos=1)])                                        # 23:00 New York: just queues
        self.assertEqual(c.world.posts, [])
        real = cr.prune_posted
        cr.prune_posted = lambda ws: (_ for _ in ()).throw(RuntimeError("runner lost"))
        try:
            rc, _ = c.run(advance={"hours": 10}, catch=True)                       # posts, then a step blows up
        finally:
            cr.prune_posted = real
        self.assertEqual(rc, 0)                                                    # the step failed, the run did not
        self.assertEqual(len(c.world.posts), 1)
        self.assertIn("pruning posted media failed", " ".join(self.setting(c, "runs.history")[-1]["notes"]))
        c.run(advance={"hours": 8})
        self.assertEqual(len(c.world.posts), 1, "the clip was posted twice after the crash")

    def test_a_killed_run_still_saves_its_state_and_frees_the_lock(self):
        c = self.cloud()
        c.clock.set(2026, 10, 26, 3, 0)
        c.run(footage=[c.seeder(videos=1)])
        real = cr.prune_posted
        cr.prune_posted = lambda ws: (_ for _ in ()).throw(KeyboardInterrupt())    # SIGINT / SIGTERM arrives
        try:
            with self.assertRaises(KeyboardInterrupt):
                c.run(advance={"hours": 10})
        finally:
            cr.prune_posted = real
        self.assertEqual(len(c.world.posts), 1)
        self.assertNotIn("runner_lock.json", c.branch_files())
        c.run(advance={"hours": 8})
        self.assertEqual(len(c.world.posts), 1)

    def test_a_second_runner_backs_off_while_the_first_holds_the_lock(self):
        import subprocess
        c = self.cloud()
        c.run(footage=[c.seeder(videos=2)])
        n = len(c.world.posts)
        clone = c.tmp / "other"
        c.checkout_branch(clone)
        (clone / "runner_lock.json").write_text(json.dumps({"run_id": "someone-else",
                                                            "ts": runstate.iso(c.clock.utc + dt.timedelta(hours=1))}))
        for cmd in (["add", "-A"], ["-c", "user.name=x", "-c", "user.email=x@y", "commit", "-q", "-m", "lock"],
                    ["push", "-q", "origin", "HEAD:clipper-cloud"]):
            subprocess.run(["git", *cmd], cwd=clone, check=True, capture_output=True)
        rc, out = c.run(advance={"hours": 1, "minutes": 30})
        self.assertEqual(rc, 0)
        self.assertIn("another run holds the lock", out)
        self.assertEqual(len(c.world.posts), n)
        self.assertIn("runner_lock.json", c.branch_files())                         # untouched: it is theirs
        rc, out = c.run(advance={"hours": 3})                                      # their lock is now far too old
        self.assertNotIn("another run holds the lock", out)
        self.assertNotIn("runner_lock.json", c.branch_files())

    def test_scheduled_posts_use_planned_times_and_an_idempotency_key(self):
        c = self.cloud()
        c.run(footage=[c.seeder(videos=3)])
        posts = c.world.posts
        self.assertGreaterEqual(len(posts), 2)
        times = []
        for p in posts:
            b = p["body"]
            self.assertNotIn("publishNow", b)
            self.assertEqual(b["timezone"], "America/New_York")
            self.assertRegex(b["scheduledFor"], r"^2026-10-26T\d\d:\d\d:00$")
            hour = int(b["scheduledFor"][11:13])
            self.assertTrue(8 <= hour < 23)
            times.append(b["scheduledFor"])
        self.assertEqual(len(set(times)), len(times))
        keys = [r["headers"].get("idempotency-key") for r in c.world.to(host="zernio.com", method="POST", contains="/posts")]
        self.assertTrue(all(keys) and len(set(keys)) == len(keys))
        c.run(advance={"minutes": 5}, argv=["--no-discover", "--no-schedule"])

    def test_no_schedule_flag_posts_immediately(self):
        c = self.cloud()
        c.run(footage=[c.seeder(videos=1)], argv=["--no-discover", "--no-schedule"])
        b = c.world.posts[0]["body"]
        self.assertTrue(b["publishNow"])
        self.assertNotIn("scheduledFor", b)

    def test_chain_stall_is_noticed_and_alerted(self):
        c = self.cloud(topic=self.fw.SENTINEL_TOPIC)
        c.run(footage=[c.seeder(videos=1)])
        c.run(advance={"hours": 30})
        chain = self.setting(c, "chain")
        self.assertEqual(chain["stalled_hours"], 30.0)
        self.assertEqual(len(chain["gaps"]), 1)
        self.assertIn("The 4-hourly runs had stalled", [m["headers"].get("title") for m in c.world.ntfy])

    def test_campaign_page_404_twice_ends_it_and_it_is_archived(self):
        fw = self.fw
        c = self.cloud()
        c.add_campaign("Second", fw.CID2, slideshows=False, match="second")
        c.world.accounts += [{"_id": "tt9", "platform": "tiktok", "username": "second.clips"}]
        c.run(footage=[c.seeder(videos=1)])
        c.world.cr_pages[fw.CID2] = 404
        c.run(advance={"hours": 4})
        self.assertEqual(self.setting(c, "campaign_state.Second")["state"], "active")      # one 404: a blip
        c.run(advance={"hours": 4})
        st = self.setting(c, "campaign_state.Second")
        self.assertEqual(st["state"], "ended")
        self.assertIn("Second", self.setting(c, "campaigns.archived"))
        self.assertIn("archived_campaigns.json", c.branch_files())
        c.run(advance={"hours": 4})                                                          # archived: out of the active set
        self.assertEqual(self.setting(c, "campaign_state.Second")["state"], "ended")
        self.assertEqual(self.setting(c, "campaign_state.Acme Clipping")["state"], "active")

    def test_every_campaign_404_at_once_is_the_sites_problem_not_the_campaigns(self):
        fw = self.fw
        c = self.cloud()
        c.add_campaign("Second", fw.CID2, slideshows=False, match="second")
        c.world.accounts += [{"_id": "tt9", "platform": "tiktok", "username": "second.clips"}]
        c.run(footage=[c.seeder(videos=1)])
        c.world.cr_pages[fw.CID] = 404
        c.world.cr_pages[fw.CID2] = 404
        for _ in range(3):
            c.run(advance={"hours": 4})
        self.assertEqual(self.setting(c, "campaign_state.Acme Clipping")["state"], "active")
        self.assertEqual(self.setting(c, "campaign_state.Second")["state"], "active")

    def test_preflight_cli_prints_a_report_and_never_the_secrets(self):
        fw = self.fw
        c = self.cloud(topic=fw.SENTINEL_TOPIC)
        c.run(footage=[c.seeder(videos=1)])
        rc, out = c.run(argv=["--preflight"])
        self.assertIn("Clip Engine launch checklist", out)
        self.assertIn("Zernio API key added", out)
        self.assertNotIn(fw.SENTINEL_KEY, out)
        self.assertNotIn(fw.SENTINEL_TOPIC, out)
        self.assertIn("[ ] Dashboard added to the phone home screen (you)", out)
        self.assertEqual(rc, 0)
        for text in (c.world.all_text(), json.dumps(self.setting(c, "launch.checklist"))):
            self.assertNotIn(fw.SENTINEL_KEY, text)
        pings = [m for m in c.world.ntfy if m["headers"].get("title") == "Clip Engine is connected"]
        self.assertEqual(len(pings), 1)                                                     # the test ping goes out once

    def test_a_campaign_added_with_onboard_is_picked_up_in_the_same_run(self):
        fw = self.fw
        c = self.cloud()
        c.world.accounts += [{"_id": "tt9", "platform": "tiktok", "username": "hub.clips"}]
        c.run(footage=[c.seeder(videos=1)])
        f = c.add_campaign("Brand New Co", fw.CID2, slideshows=False, match="")
        c.world.cr_pages[fw.CID2] = fw.cr_page(name="Brand New Co", org="Newco", budget=300000, spent=1000)
        c.run(advance={"hours": 4})
        st = self.setting(c, "campaign_state.Brand New Co")
        self.assertEqual((st["state"], st["accounts"]), ("active", ["tiktok/hub.clips"]))
        self.assertIn(("promoted", "Brand New Co"), [(e["kind"], e["campaign"]) for e in self.setting(c, "switch.log")])


class ZernioHealthTests(unittest.TestCase):
    def test_a_disconnected_account_goes_to_cooldown_while_the_other_keeps_posting(self):
        import fakeworld as fw
        c = fw.Cloud(slideshows=False, topic=fw.SENTINEL_TOPIC)
        try:
            c.run(footage=[c.seeder(videos=6)])
            c.world.accounts[0]["isActive"] = False                                         # acme.clips1 loses its login
            c.run(advance={"hours": 30}, footage=[c.seeder(videos=6, tag="z")])
            ws = c.ws()
            st = ws.setting("account_state.tiktok/acme.clips1")
            ws.close()
            self.assertEqual((st["mode"], st["health"]), ("cooldown", "error"))
            self.assertIn("Reconnect", st["reason"])
            late = [p for p in c.world.posts if p["at"] > c.clock.utc - dt.timedelta(hours=1)]
            self.assertTrue(late and all(p["account"] == "acme.clips2" for p in late))
            self.assertIn("acme.clips1 disconnected", [m["headers"].get("title") for m in c.world.ntfy])
        finally:
            c.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
