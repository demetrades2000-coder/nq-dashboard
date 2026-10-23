"""Dashboard v2.2 agency view (docs/DASHBOARD_DATA.md): campaigns[].live / account_match / posting_accounts, the
agency summary and leads_discovered. Empty workspace, a hand-made paused campaign, the cloud state layout and the demo."""

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
from test_dashboard_accounts import Fixture  # noqa: E402
from test_dashboard_v2 import MONEY_KEYS, N, OB, ON, OS, S, check, walk  # noqa: E402

NONE = type(None)
OI = (int, NONE)
LIVE = {"state": S, "ok": OB, "reason": S, "left": ON, "budget": ON, "spent": ON, "spent_frac": ON, "cpm": ON,
        "brief_cpm": ON, "cpm_differs": bool, "status": OS, "creators": OI, "views": OI, "checked": OS}
CAMP = {"account_match": S, "accounts_spec": dict, "posting_accounts": list, "live": LIVE}
AGENCY = {"campaigns": int, "active": int, "paused": int, "unchecked": int, "budget_left": ON, "budget_total": ON,
          "accounts": list, "accounts_n": int, "paused_list": [{"name": S, "reason": S, "checked": OS}]}
LEAD = {"rank": int, "id": S, "name": S, "org": S, "url": S, "rates": dict, "platforms": list, "cpm": ON, "min": ON,
        "max": ON, "left": ON, "budget": ON, "spent_frac": ON, "creators": OI, "views": OI, "categories": list,
        "types": list, "content_rules": OI, "requirements": OI, "requires_application": OB, "score": N}


class EmptyWorkspace(unittest.TestCase):
    def test_empty_fields_present(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            d = dashboard.build_data(ws)
            ws.close()
            check(self, d["agency"], AGENCY)
            self.assertEqual((d["agency"]["campaigns"], d["agency"]["active"], d["agency"]["paused"]), (0, 0, 0))
            self.assertIsNone(d["agency"]["budget_left"])
            self.assertEqual(d["leads_discovered"], [])
            for c in d["campaigns"]:   # repo briefs: never checked here
                check(self, c, CAMP)
                self.assertEqual(c["live"], {**dashboard.EMPTY_LIVE, "brief_cpm": c["live"]["brief_cpm"]})
            json.dumps(d)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class PausedCampaign(Fixture):
    def live(self, **kw):
        info = {"ok": True, "reason": "$1,937 left", "left": 1937.49, "budget": 2000, "cpm": 5.0, "status": "funded",
                "creators": 28, "views": 101677, "checked": "2026-10-22T10:00:00Z", **kw}
        self.ws.set_setting("campaign_live.Brand X", info)

    def camp_of(self, d):
        return next(c for c in d["campaigns"] if c["name"] == "Brand X")

    def test_active(self):
        self.live()
        self.upload(self.clip(), "acct.a", 100, 5)
        d = dashboard.build_data(self.ws)
        c = self.camp_of(d)
        check(self, c, CAMP)
        l = c["live"]
        self.assertEqual((l["state"], l["ok"], l["left"], l["budget"], l["spent"]), ("active", True, 1937.49, 2000, 62.51))
        self.assertAlmostEqual(l["spent_frac"], 0.0313, places=4)
        self.assertFalse(l["cpm_differs"])
        self.assertNotIn("Z", l["checked"])   # local time
        self.assertEqual(c["posting_accounts"], ["tiktok/acct.a", "tiktok/acct.b"])
        a = d["agency"]
        self.assertEqual((a["campaigns"], a["active"], a["paused"], a["budget_left"]), (1, 1, 0, 1937.49))
        self.assertEqual(a["accounts_n"], 2)

    def test_paused(self):
        self.live(ok=False, reason="budget almost gone ($12.40 left)", left=12.4, cpm=4.0)
        self.clip("approved", score=90)
        d = dashboard.build_data(self.ws)
        l = self.camp_of(d)["live"]
        self.assertEqual((l["state"], l["ok"], l["reason"]), ("paused", False, "budget almost gone ($12.40 left)"))
        self.assertTrue(l["cpm_differs"])
        self.assertEqual(l["brief_cpm"], 5.0)
        a = d["agency"]
        self.assertEqual((a["active"], a["paused"], a["budget_left"], a["accounts"]), (0, 1, None, []))
        self.assertEqual(a["paused_list"][0]["name"], "Brand X")
        self.assertEqual(d["up_next"], [])   # a paused campaign's clips wait
        h = dashboard.hide_money(d)          # public figures stay
        self.assertEqual(self.camp_of(h)["live"]["left"], 12.4)

    def test_resumed_and_not_checked(self):
        self.assertEqual(self.camp_of(dashboard.build_data(self.ws))["live"]["state"], "unchecked")
        self.live(ok=False)
        self.live(ok=True)
        self.clip("approved", score=90)
        d = dashboard.build_data(self.ws)
        self.assertEqual(self.camp_of(d)["live"]["state"], "active")
        self.assertTrue(d["up_next"])

    def test_garbage_live_setting(self):
        self.ws.set_setting("campaign_live.Brand X", {"ok": False, "left": "n/a", "budget": None, "creators": "x"})
        l = self.camp_of(dashboard.build_data(self.ws))["live"]
        check(self, l, LIVE)
        self.assertEqual((l["state"], l["reason"], l["left"], l["creators"]), ("paused", "paused", None, None))

    def test_account_match_filters_star(self):
        f = dashboard.campaign_accounts
        c = {"accounts": {"tiktok": "*"}, "account_match": "tradever"}
        self.assertEqual(f(c, "tiktok", ["tradever.clips", "other.page", "Tradever Daily"]),
                         ["tradever.clips", "Tradever Daily"])
        self.assertEqual(f(c, "tiktok", ["other.page"]), [])   # no brand page yet: nothing posts
        self.assertEqual(f({"accounts": {"tiktok": "*"}}, "tiktok", ["x"]), ["x"])

    def test_brand_campaign_from_cloud_state(self):
        """A brief onboarded into <state>/campaigns (the cloud layout <state>/ws) shows up with its account_match."""
        state = self.tmp / "campaigns"
        state.mkdir()
        brief = {"name": "Acme (cloud)", "cpm": 3.0, "platforms": ["tiktok"], "automation_allowed": True,
                 "account_match": "acme", "accounts": {"tiktok": "*"}}
        (state / "acme.json").write_text(json.dumps(brief))
        self.ws.set_setting("autopilot.campaigns", [str(self.cfile), str(state / "acme.json")])
        cid = self.clip()
        self.upload(cid, "acme.clips", 50, 2)
        d = dashboard.build_data(self.ws)
        c = next(x for x in d["campaigns"] if x["name"] == "Acme (cloud)")
        self.assertTrue(c["auto"])
        self.assertEqual((c["account_match"], c["accounts_spec"]), ("acme", {"tiktok": ["*"]}))
        self.assertEqual(d["agency"]["campaigns"], 2)

    def test_leads_discovered(self):
        joined = "https://contentrewards.com/c/campaigns/aaaa"
        self.camp["permission"] = {"campaign_url": joined}
        self.cfile.write_text(json.dumps(self.camp))
        self.ws.set_setting("leads.discovered", [
            {"id": "b", "name": "Low", "url": "https://contentrewards.com/c/campaigns/bbbb", "score": 1.0,
             "rates": {"tiktok": {"cpm": 1, "min": 1, "max": 100}}, "left": 50, "budget": 100,
             "requires_application": True, "content_rules": 2},
            {"id": "c", "name": "High", "url": "javascript:alert(1)", "score": 9.0,
             "rates": {"instagram": {"cpm": 3}}, "categories": "Finance"},
            {"id": "a", "name": "Joined already", "url": joined + "/", "score": 50},
            "junk", {"score": 3}])
        L = dashboard.build_data(self.ws)["leads_discovered"]
        check(self, L, [LEAD])
        self.assertEqual([x["name"] for x in L], ["High", "Low"])
        self.assertEqual([x["rank"] for x in L], [1, 2])
        self.assertEqual((L[0]["url"], L[0]["cpm"], L[0]["categories"], L[0]["requires_application"]),
                         ("", 3.0, ["Finance"], None))
        self.assertEqual((L[1]["cpm"], L[1]["min"], L[1]["spent_frac"], L[1]["requires_application"]), (1.0, 1.0, 0.5, True))

    def test_leads_setting_not_a_list(self):
        self.ws.set_setting("leads.discovered", {"oops": 1})
        self.assertEqual(dashboard.build_data(self.ws)["leads_discovered"], [])


class DemoAgency(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.ws = demo.build(cls.tmp / "demo", days=30, seed=7)
        cls.d = dashboard.build_data(cls.ws)

    @classmethod
    def tearDownClass(cls):
        cls.ws.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_demo(self):
        d = self.d
        check(self, d["agency"], AGENCY)
        check(self, d["leads_discovered"], [LEAD])
        for c in d["campaigns"]:
            check(self, c, CAMP)
        by = {c["name"]: c for c in d["campaigns"]}
        t, x = by["Tradever (prop firm)"], by["AiXfunded (prop firm)"]
        self.assertEqual((t["live"]["state"], t["live"]["left"], t["live"]["creators"]), ("active", 1937.49, 28))
        self.assertEqual(t["account_match"], "tradever")
        self.assertEqual(x["live"]["state"], "paused")
        self.assertIn("budget almost gone", x["live"]["reason"])
        a = d["agency"]
        self.assertEqual((a["campaigns"], a["active"], a["paused"], a["budget_left"]), (2, 1, 1, 1937.49))
        self.assertEqual(set(a["accounts"]), {"tiktok/tradever.clips", "tiktok/tradever.daily"})
        self.assertGreaterEqual(len(d["leads_discovered"]), 6)
        scores = [l["score"] for l in d["leads_discovered"]]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertTrue(all(l["url"].startswith("https://") for l in d["leads_discovered"]))
        self.assertTrue(any(l["requires_application"] for l in d["leads_discovered"]))
        self.assertTrue(all(q["campaign"] != x["name"] for q in d["up_next"]))

    def test_hide_money_keeps_public_figures(self):
        h = dashboard.hide_money(self.d)
        for path, k, v in walk(h):
            if k in MONEY_KEYS:
                self.assertIsNone(v, path)
        self.assertEqual(h["leads_discovered"], json.loads(json.dumps(self.d["leads_discovered"])))
        self.assertEqual(h["agency"], json.loads(json.dumps(self.d["agency"])))

    def test_page(self):
        html = dashboard.render_html(self.d)
        self.assertEqual(html.count("</script>"), 1)
        page = dashboard._page()
        self.assertEqual(page.count("/*__DATA__*/null"), 1)
        for name in ("agencyCard", "agencyLine", "leadCard", "liveHTML", "budgetHTML", "Open / Join",
                     "To add one: join it", "Not checked yet", "leads_discovered"):
            self.assertIn(name, page)


if __name__ == "__main__":
    unittest.main(verbosity=2)
