"""Dashboard v2.3 (docs/DASHBOARD_DATA.md): submit list, content supply, status light (stale run), account health,
payout tracker fields, manifest start page. Hand-made workspaces (exact numbers) plus the demo (and its --stale variant)."""

import datetime as dt
import json
import shutil
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
SUPPLY = {"video": I, "slideshow": I, "total": I, "per_day": N, "pace_source": S, "days_left": (int, float, type(None)),
          "level": S, "by_kind": dict, "refill": S, "decks_available": (int, type(None)), "note": S}
STATUS = {"level": S, "headline": S, "reasons": list,
          "run": {"finished": OS, "every_hours": I, "stale_after_hours": N, "age_hours": (int, float, type(None)),
                  "enabled": bool, "actions_url": S}}
SUBMIT = {"clip_id": I, "platform": S, "url": S, "title": S, "page": S, "campaign": S, "account": S, "created": OS,
          "views": I, "likes": I, "upload_id": I}
HEALTH = {"state": S, "median_last4": (int, type(None)), "note": S}


class EmptyWorkspace(unittest.TestCase):
    def test_new_fields_present_and_safe(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            d = dashboard.build_data(ws)
            ws.close()
            check(self, d["supply"], SUPPLY)
            check(self, d["status"], STATUS)
            self.assertEqual((d["supply"]["total"], d["supply"]["level"], d["supply"]["days_left"]), (0, "none", None))
            self.assertEqual(d["todo"]["submit"], [])
            self.assertEqual(d["stats"]["to_submit"], 0)
            self.assertIn(d["status"]["level"], ("amber", "red"))   # autopilot off, nothing connected
            self.assertEqual(json.loads(json.dumps(d))["status"]["run"]["actions_url"], dashboard.ACTIONS_URL)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_manifest_opens_submit(self):
        self.assertEqual(dashboard.MANIFEST["start_url"], "./#/submit")
        self.assertEqual(dashboard.MANIFEST["shortcuts"][0]["url"], "./#/submit")


class SubmitList(Fixture):
    def test_submitted_at_failed_and_drafts_excluded(self):
        a, b, c, e = (self.clip() for _ in range(4))
        self.upload(a, "acct.a", 100, 5, minutes_ago=50)
        self.upload(b, "acct.b", 200, 5, minutes_ago=40)
        self.upload(c, "acct.a", 300, 5, minutes_ago=30)
        self.upload(e, "acct.a", 0, 0, minutes_ago=20, state="failed")
        self.ws.x("UPDATE uploads SET submitted_at=? WHERE clip_id=?", (now_iso(), c))   # the DB says it is submitted
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, state, created, updated) VALUES(?,?,?,?,?,?)",
                  (self.clip(), "tiktok", "acct.a", "draft", now_iso(), now_iso()))               # a draft has no link
        d = dashboard.build_data(self.ws)
        sub = d["todo"]["submit"]
        check(self, sub, [SUBMIT])
        self.assertEqual({x["clip_id"] for x in sub}, {a, b})
        self.assertEqual(d["stats"]["to_submit"], 2)
        x = next(x for x in sub if x["clip_id"] == b)
        self.assertEqual((x["campaign"], x["account"], x["views"]), ("Brand X", "acct.b", 200))

    def test_count_is_total_even_past_the_list_limit(self):
        for i in range(dashboard.SUBMIT_LIMIT + 5):
            self.upload(self.clip(), "acct.a", 1, 0, minutes_ago=10)
        d = dashboard.build_data(self.ws)
        self.assertEqual(len(d["todo"]["submit"]), dashboard.SUBMIT_LIMIT)
        self.assertEqual(d["stats"]["to_submit"], dashboard.SUBMIT_LIMIT + 5)


class SupplyMath(Fixture):
    def test_history_pace(self):
        for _ in range(6):
            self.clip(status="approved")
        self.clip(status="approved", kind="slideshow")
        for _ in range(6):   # 6 distinct clips posted in the last 3 days = 2 a day
            self.upload(self.clip(), "acct.a", 500, 10, minutes_ago=60 * 30)
        self.upload(self.clip(), "acct.a", 500, 10, minutes_ago=60 * 24 * 5)   # too old to count
        s = dashboard.build_data(self.ws)["supply"]
        check(self, s, SUPPLY)
        self.assertEqual((s["video"], s["slideshow"], s["total"]), (6, 1, 7))
        self.assertEqual((s["per_day"], s["pace_source"], s["days_left"], s["level"]), (2.0, "history", 3.5, "good"))

    def test_levels(self):
        self.assertEqual(dashboard._supply_level(0.9, 1, 2), "bad")
        self.assertEqual(dashboard._supply_level(2.9, 5, 2), "warn")
        self.assertEqual(dashboard._supply_level(3.0, 6, 2), "good")
        self.assertEqual(dashboard._supply_level(None, 0, 0), "none")

    def test_amber_and_red_from_data(self):
        for _ in range(2):
            self.clip(status="approved")
        for _ in range(3):
            self.upload(self.clip(), "acct.a", 500, 10, minutes_ago=60)   # 3 clips in 3 days = 1 a day -> 2 days left
        d = dashboard.build_data(self.ws)
        self.assertEqual((d["supply"]["days_left"], d["supply"]["level"]), (2.0, "warn"))
        self.assertIn("supply", [r["code"] for r in d["status"]["reasons"]])
        self.ws.x("UPDATE clips SET status='rejected' WHERE status='approved'")
        d = dashboard.build_data(self.ws)
        self.assertEqual((d["supply"]["total"], d["supply"]["level"]), (0, "bad"))
        r = next(r for r in d["status"]["reasons"] if r["code"] == "supply")
        self.assertEqual(r["level"], "red")

    def test_caps_when_no_history(self):
        self.ws.set_setting("autopilot.max_per_day", 3)
        for _ in range(6):
            self.clip(status="approved")
        self.upload(self.clip(), "acct.a", 1, 0, minutes_ago=60 * 24 * 6)   # gives both accounts a row, but no recent post
        self.upload(self.clip(), "acct.b", 1, 0, minutes_ago=60 * 24 * 6)
        s = dashboard.build_data(self.ws)["supply"]
        self.assertEqual((s["pace_source"], s["per_day"], s["days_left"]), ("caps", 6.0, 1.0))   # 2 accounts x 3

    def test_runner_settings_and_paused_campaign(self):
        self.clip(status="approved")
        self.upload(self.clip(), "acct.a", 1, 0, minutes_ago=60)
        self.ws.set_setting("supply.decks_available", 7)
        self.ws.set_setting("supply.note", "12 transcripts queued")
        s = dashboard.build_data(self.ws)["supply"]
        self.assertEqual((s["decks_available"], s["note"], s["total"]), (7, "12 transcripts queued", 1))
        self.ws.set_setting("campaign_live.Brand X", {"ok": False, "reason": "budget almost gone", "left": 1, "budget": 100})
        s = dashboard.build_data(self.ws)["supply"]
        self.assertEqual(s["total"], 0)   # a paused campaign's clips wait: they are not supply
        self.ws.set_setting("supply.decks_available", "many")
        self.assertIsNone(dashboard.build_data(self.ws)["supply"]["decks_available"])


class AccountHealth(Fixture):
    def health(self, name="acct.a"):
        d = dashboard.build_data(self.ws)
        a = next(x for x in d["accounts_detail"] if x["name"] == name)
        check(self, a["health"], HEALTH)
        return a["health"]

    def posts(self, views, account="acct.a", hours=30):
        for i, v in enumerate(views):
            self.upload(self.clip(), account, v, 0, minutes_ago=60 * hours + 60 * i)

    def test_limited_low_median(self):
        self.posts([40, 90, 20, 60])
        h = self.health()
        self.assertEqual((h["state"], h["median_last4"]), ("limited", 50))
        self.assertIn("Keep posting", h["note"])
        d = dashboard.build_data(self.ws)
        self.assertIn("accounts_limited", [r["code"] for r in d["status"]["reasons"]])

    def test_median_not_mean(self):
        self.posts([5000, 20, 30, 40])   # median 35 even though the mean is high
        self.assertEqual(self.health()["state"], "limited")
        self.assertEqual(self.health()["median_last4"], 35)

    def test_ok_when_median_100_or_more(self):
        self.posts([100, 100, 100, 5])   # median 100: not under 100
        self.assertEqual(self.health()["state"], "ok")

    def test_only_last_four_count(self):
        self.posts([30, 40, 50, 60], hours=30)
        self.posts([5000, 6000], hours=100)   # older: outside the last 4
        self.assertEqual(self.health()["state"], "limited")

    def test_early_with_fewer_than_four(self):
        self.posts([1, 2, 3])
        self.assertEqual(self.health()["state"], "early")

    def test_fresh_posts_are_not_judged(self):
        self.posts([1, 2, 3, 4], hours=0)   # all under a day old
        self.assertEqual(self.health()["state"], "early")

    def test_no_posts_yet(self):
        self.upload(self.clip(), "acct.b", 0, 0, state="failed")   # connected (seen) but nothing went out
        self.assertEqual(self.health("acct.b")["state"], "no_posts")

    def test_flat_views_while_posting(self):
        self.posts([1, 1, 1], hours=30)     # three old enough, a median can't be judged yet (needs 4 old posts)
        self.posts([1, 1], hours=2)
        hist = [{"url": f"https://www.tiktok.com/@acct.a/video/{r['clip_id']}", "platform": "tiktok", "posted": r["created"],
                 "views": 1, "updated": now_iso(), "history": [[now_iso(60 * 20), 1]]}
                for r in self.ws.q("SELECT clip_id, created FROM uploads")]
        (self.ws.home / "earnings.json").write_text(json.dumps({"posts": hist}))
        h = self.health()
        self.assertEqual(h["state"], "limited")
        self.assertIn("flat", h["note"])

    def test_no_history_no_flat_verdict(self):
        self.posts([1, 1, 1], hours=30)
        self.posts([1, 1], hours=2)
        self.assertEqual(self.health()["state"], "early")


class StaleRun(Fixture):
    def log(self, hours_ago, **extra):
        (self.ws.home / "logs").mkdir(exist_ok=True)
        fin = dt.datetime.now() - dt.timedelta(hours=hours_ago)
        rep = {"started": (fin - dt.timedelta(minutes=9)).isoformat(), "finished": fin.isoformat(), "uploaded": [],
               "upload_errors": [], **extra}
        (self.ws.home / "logs" / "autopilot.jsonl").write_text(json.dumps(rep) + "\n")

    def setUp(self):
        super().setUp()
        self.ws.set_setting("autopilot.enabled", True)
        self.ws.set_setting("autopilot.every_hours", 4)
        self.upload(self.clip(), "acct.a", 900, 10, minutes_ago=60)   # posted recently: not the "no uploads" case
        import zernio
        orig = zernio.has_token
        zernio.has_token = lambda *a, **k: True   # a posting account is connected
        self.addCleanup(setattr, zernio, "has_token", orig)

    def codes(self):
        d = dashboard.build_data(self.ws)
        return d, [r["code"] for r in d["status"]["reasons"]]

    def test_fresh_run_is_not_stale(self):
        self.log(5.9)   # 1.5 x 4 h = 6 h
        d, codes = self.codes()
        self.assertNotIn("stale_run", codes)
        self.assertEqual(d["status"]["run"]["stale_after_hours"], 6.0)

    def test_stale_run_is_red_with_restart_link(self):
        self.log(7)
        d, codes = self.codes()
        self.assertEqual(codes[0], "stale_run")
        st = d["status"]
        self.assertEqual(st["level"], "red")
        self.assertEqual(st["headline"], "Autopilot hasn't run for 7h — restart")
        self.assertEqual(st["reasons"][0]["action"]["url"], dashboard.ACTIONS_URL)
        self.assertTrue(dashboard.ACTIONS_URL.endswith("/actions/workflows/clipper-cloud.yml"))

    def test_disabled_autopilot_is_not_called_stale(self):
        self.ws.set_setting("autopilot.enabled", False)
        self.log(30)
        _, codes = self.codes()
        self.assertNotIn("stale_run", codes)
        self.assertIn("autopilot_off", codes)

    def test_never_ran(self):
        _, codes = self.codes()
        self.assertIn("never_ran", codes)

    def test_no_uploads_24h_while_clips_wait(self):
        self.ws.x("DELETE FROM uploads")
        self.upload(self.clip(), "acct.a", 5, 0, minutes_ago=60 * 40)   # last post 40 h ago
        self.clip(status="approved")
        self.log(1)
        d, codes = self.codes()
        self.assertIn("no_uploads_24h", codes)
        self.assertEqual(d["status"]["level"], "red")
        self.ws.set_setting("autopilot.post_hours", [8, 8])   # outside posting hours (a one-hour window that never matches now)
        now_h = dt.datetime.now(dt.timezone.utc).hour
        if pl.in_post_hours([8, 8], "UTC") is False:
            self.assertNotIn("no_uploads_24h", self.codes()[1])

    def test_no_stale_no_accounts_when_all_is_well(self):
        self.log(1)
        for _ in range(8):
            self.clip(status="approved")
        _, codes = self.codes()
        self.assertEqual([c for c in codes if c in ("stale_run", "no_accounts", "no_uploads_24h")], [])

    def test_no_account_connected_is_red(self):
        import zernio
        zernio.has_token = lambda *a, **k: False
        self.ws.x("DELETE FROM uploads")
        self.log(1)
        d, codes = self.codes()
        self.assertIn("no_accounts", codes)
        self.assertEqual(d["status"]["level"], "red")


class PayoutTracker(Fixture):
    def test_best_and_total(self):
        for v in (1000, 4000, 2500):
            self.upload(self.clip(), "acct.a", v, 0, minutes_ago=60)
        c = next(x for x in dashboard.build_data(self.ws)["campaigns"] if x["name"] == "Brand X")
        self.assertEqual((c["payout"]["best_views"], c["payout"]["total_views"], c["payout"]["views_to_min"]), (4000, 7500, 1400))
        self.assertEqual(c["payout"]["posts_paying"], 2)


class DemoV3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.ws = demo.build(cls.tmp / "demo", days=30, seed=7)
        cls.d = dashboard.build_data(cls.ws)
        cls.ws2 = demo.build(cls.tmp / "stale", days=30, seed=7, stale=True)
        cls.d2 = dashboard.build_data(cls.ws2)

    @classmethod
    def tearDownClass(cls):
        cls.ws.close()
        cls.ws2.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_submit_two_campaigns(self):
        d = self.d
        check(self, d["supply"], SUPPLY)
        check(self, d["status"], STATUS)
        check(self, d["todo"]["submit"], [SUBMIT])
        self.assertEqual(d["stats"]["to_submit"], 6)
        self.assertEqual({x["campaign"] for x in d["todo"]["submit"]}, {"Tradever (prop firm)", "AiXfunded (prop firm)"})
        self.assertTrue(all(x["page"].startswith("https://") for x in d["todo"]["submit"]))

    def test_limited_account_and_supply(self):
        d = self.d
        lim = [a["name"] for a in d["accounts_detail"] if a["health"]["state"] == "limited"]
        self.assertEqual(lim, ["tradever.daily"])
        self.assertEqual(sum(1 for a in d["accounts_detail"] if a["health"]["state"] == "ok") > 0, True)
        s = d["supply"]
        self.assertEqual(s["level"], "warn")
        self.assertAlmostEqual(s["days_left"], 2.0, delta=0.6)
        codes = [r["code"] for r in d["status"]["reasons"]]
        self.assertIn("accounts_limited", codes)
        self.assertIn("supply", codes)
        self.assertNotIn("stale_run", codes)
        self.assertEqual(d["status"]["level"], "amber")

    def test_stale_variant(self):
        st = self.d2["status"]
        self.assertEqual(st["level"], "red")
        self.assertTrue(st["headline"].startswith("Autopilot hasn't run for "))
        self.assertTrue(st["headline"].endswith("h — restart"))

    def test_page_has_new_parts(self):
        html = dashboard.render_html(self.d)
        self.assertEqual(html.count("</script>"), 1)
        page = dashboard._page()
        self.assertEqual(page.count("/*__DATA__*/null"), 1)
        for name in ("pageSubmit", "statusStrip", "supplyCard", "healthBlock", "trackerCard", "setAppBadge",
                     "Copy next link", "Copy all", "Open campaign page", "All caught up", "#/submit"):
            self.assertIn(name, page)

    def test_hide_money_keeps_new_fields(self):
        h = dashboard.hide_money(self.d)
        self.assertEqual(h["supply"], json.loads(json.dumps(self.d["supply"])))
        self.assertEqual(len(h["todo"]["submit"]), 6)


if __name__ == "__main__":
    unittest.main(verbosity=2)
