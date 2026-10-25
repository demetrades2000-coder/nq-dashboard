"""
Agency mode: several campaigns run at once, each on its own brand-named TikTok accounts; a campaign that runs out
of budget or closes pauses by itself while the rest keep posting; new campaigns are onboarded from their links;
new leads are found and ranked.

  python -m unittest discover -s clipper/tests -v
"""

import datetime as dt
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import contentrewards as crw  # noqa: E402
import onboard  # noqa: E402
import pipeline as pl  # noqa: E402
import zernio  # noqa: E402
from test_multi_account import FakeTikTok  # noqa: E402

BRIEF = (Path(__file__).resolve().parent / "fixtures" / "tradever_brief.txt").read_text(encoding="utf-8")


def page(name="Acme Prop Firm Clipping | $2k Budget", org="Motion Clipping", budget=200000, spent=6251, status="funded",
         rules=(0, 0), cats=("Finance",), types=("Clipping",), app=False, accepting=True):
    cat = ",".join('{\\"id\\":\\"x\\",\\"name\\":\\"%s\\"}' % c for c in cats)
    typ = ",".join('{\\"id\\":\\"y\\",\\"name\\":\\"%s\\"}' % t for t in types)
    data = ('{\\"statusReason\\":\\"%s\\",\\"configuration\\":{\\"content\\":{\\"contentCategories\\":[%s],'
            '\\"contentTypes\\":[%s]},\\"budget\\":%d,\\"payoutModel\\":[{\\"maxPayout\\":50000,\\"minPayout\\":700,'
            '\\"platform\\":\\"tiktok\\",\\"rate\\":500}]},\\"briefCounts\\":{\\"contentRules\\":%d,'
            '\\"creatorRequirements\\":%d},\\"metrics\\":{\\"budgetSpentCents\\":%d,\\"creatorCount\\":28,'
            '\\"totalViews\\":101677},\\"name\\":\\"%s\\",\\"organization\\":{\\"logoUrl\\":\\"u\\",\\"name\\":\\"%s\\"},'
            '\\"requiresApplication\\":%s}') % (status, cat, typ, budget, rules[0], rules[1], spent, name, org,
                                              "true" if app else "false")
    return f"<html><body>{'Accepting clips' if accepting else 'Campaign ended'}<script>{data}</script></body></html>"


class ContentRewardsTests(unittest.TestCase):
    def test_parse_and_health(self):
        c = crw.parse_campaign(page(), "1cc66d1c-d7bb-4cd6-addb-68093cb50908")
        self.assertEqual((c["name"], c["org"], c["left"], c["status"]), ("Acme Prop Firm Clipping | $2k Budget",
                                                                         "Motion Clipping", 1937.49, "funded"))
        self.assertEqual(c["rates"]["tiktok"], {"cpm": 5.0, "min": 7.0, "max": 500.0})
        self.assertEqual((c["content_rules"], c["requirements"], c["requires_application"]), (0, 0, False))
        self.assertTrue(crw.health(c)[0])
        low = crw.parse_campaign(page(spent=199000), "1cc66d1c-d7bb-4cd6-addb-68093cb50908")
        self.assertEqual(crw.health(low), (False, "budget almost gone ($10.00 left)"))
        ended = crw.parse_campaign(page(accepting=False), "1cc66d1c-d7bb-4cd6-addb-68093cb50908")
        self.assertFalse(crw.health(ended)[0])
        paused = crw.parse_campaign(page(status="paused"), "1cc66d1c-d7bb-4cd6-addb-68093cb50908")
        self.assertIn("paused", crw.health(paused)[1])

    def test_rank_skips_adult_gambling_and_non_english(self):
        cid = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
        good = crw.parse_campaign(page(), cid)
        adult = crw.parse_campaign(page(name="Post Clips for Sinparty", org="Clipr Agency"), cid)
        gamble = crw.parse_campaign(page(name="Flip.gg Clipping", org="ClipLaunch"), cid)
        french = crw.parse_campaign(page(name="Call of Duty MW4 (en Français)", org="French Clipping"), cid)
        ugc = crw.parse_campaign(page(name="Some App", types=("UGC (With Face)",)), cid)
        ranked = crw.rank([adult, gamble, french, ugc, good])
        self.assertEqual(ranked[0]["name"], good["name"])
        self.assertNotIn(adult["name"], [c["name"] for c in ranked])
        self.assertNotIn(french["name"], [c["name"] for c in ranked])
        self.assertLess(crw.score(ugc), crw.score(good))


class OnboardTests(unittest.TestCase):
    def test_brief_rules(self):
        r = onboard.parse_brief(BRIEF)
        self.assertEqual(r["mentions"], ["@tradeverfunding", "@laythbanks"])   # not the example accounts in links
        self.assertTrue(r["mentions_last"])
        self.assertEqual((r["min_seconds"], r["page_word"], r["posts_per_week"], r["min_engagement"]),
                         (7, "Tradever", 5, 0.02))

    def test_automation_verdict(self):
        self.assertTrue(onboard.automation_verdict(BRIEF)[0])               # "No bots, fake engagement" is fine
        ban = "Read before posting.\nNo AI-generated content or automated clipping tools. Edit by hand."
        ok, why = onboard.automation_verdict(ban)
        self.assertFalse(ok)
        self.assertIn("AI-generated", why)
        self.assertFalse(onboard.automation_verdict("Clips made with Opus Clip will not be accepted.")[0])
        self.assertIsNone(onboard.automation_verdict("")[0])

    def test_build_campaign_from_links(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            cid = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
            fetch = lambda url: crw.parse_campaign(page(name="Tradever Prop Firm SlideshowClipping| $2k Budget"), cid)
            get = lambda url: BRIEF.encode()

            def download(fid, dest):
                dest.mkdir(parents=True, exist_ok=True)
                (dest / "logo.png").write_bytes(b"png")
                return dest / "logo.png"
            p = onboard.build(f"https://contentrewards.com/c/campaigns/{cid}",
                              ["https://docs.google.com/document/d/abc/edit", "https://drive.google.com/drive/folders/F1",
                               "https://drive.google.com/file/d/L1/view"], campaigns_dir=tmp, get=get, fetch=fetch,
                              download=download, today="2026-10-23")
            c = json.loads(p.read_text())
            self.assertEqual(p.name, "tradever.json")
            self.assertEqual((c["cpm"], c["min_payout"], c["max_payout_per_clip"]), (5.0, 7.0, 500.0))
            self.assertTrue(c["automation_allowed"])
            self.assertEqual(c["platforms"], ["tiktok"])
            self.assertEqual((c["account_match"], c["accounts"]), ("tradever", {"tiktok": "*"}))
            self.assertEqual(c["caption"]["required_mentions"], ["@tradeverfunding", "@laythbanks"])
            self.assertTrue(c["caption"]["mentions_last"])
            self.assertEqual(c["footage_drive_folder"], "F1")
            self.assertEqual(c["on_screen"]["logo"], "logos/tradever/logo.png")
            self.assertEqual(c["clip"]["min"], 8)
            self.assertIn("nigga", c["banned_phrases"])
            import campaign as cmp
            self.assertEqual(cmp.permission_problems(cmp.load(p)) if hasattr(cmp, "permission_problems") else [], [])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class AgencyCycleTests(unittest.TestCase):
    """Two campaigns, each on its own brand-named accounts; one runs dry and pauses, the other keeps posting."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-agency-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        for k, v in {"autopilot.enabled": True, "autopilot.platforms": ["tiktok"], "autopilot.campaigns": [],
                     "autopilot.via": "free", "autopilot.max_uploads_per_day": 3}.items():
            self.ws.set_setting(k, v)
        self.camps = {}
        for i, brand in enumerate(["acme", "zeta"], 1):
            c = json.loads((HERE / "campaigns" / "_template.json").read_text())
            c.update(name=brand.title(), automation_allowed=True, platforms=["tiktok"], accounts={"tiktok": "*"},
                     account_match=brand, sources=[], disclosure={"caption": "#ad"})
            c["permission"].update(campaign_url=f"https://example.com/{brand}", verified_on=dt.date.today().isoformat(),
                                   evidence="t", allowed_sources=["file:x"])
            f = self.tmp / f"{brand}.json"
            f.write_text(json.dumps(c))
            self.camps[brand] = f
            self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                      "VALUES(?,?,?,?,?,'done',?,?)", (i, brand.title(), str(f), brand, f"file:{brand}", pl.now(), pl.now()))
            for j in range(2):
                v = self.tmp / f"{brand}{j}.mp4"
                v.write_bytes(b"x")
                self.ws.x("INSERT INTO clips(source_id, campaign, title, caption, hashtags, posts, checks, flags, score, "
                          "file, status, ready_file, created, kind) VALUES(?,?,?,?,'[]','{}','[]','[]',80,?,'approved',?,?,"
                          "'video')", (i, brand.title(), f"{brand} {j}", f"{brand} {j}", str(v), str(v), pl.now()))
        pl._ZERNIO_NAMES.clear()
        pl._ZERNIO_NAMES["tiktok"] = ["acme.clips", "acme.daily", "zeta.clips", "personal"]

    def tearDown(self):
        pl._ZERNIO_NAMES.clear()
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def cycle(self):
        fake = FakeTikTok()
        with redirect_stdout(io.StringIO()):
            pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None,
                                                       "cookies_from_browser": None})(), uploaders={"tiktok": fake})
        return fake

    def test_brand_accounts_and_auto_pause(self):
        self.ws.set_setting("campaign_live.Acme", {"ok": False, "reason": "budget almost gone ($3.10 left)"})
        self.cycle()
        ups = self.ws.q("SELECT c.campaign, u.account FROM uploads u JOIN clips c ON c.id=u.clip_id")
        self.assertEqual(sorted((u["campaign"], u["account"]) for u in ups), [("Zeta", "zeta.clips"), ("Zeta", "zeta.clips")])
        self.assertEqual(pl.campaign_paused(self.ws, "Acme"), "budget almost gone ($3.10 left)")
        self.ws.set_setting("campaign_live.Acme", {"ok": True, "reason": "$900 left"})   # refilled: resumes
        self.cycle()
        acme = self.ws.q("SELECT u.account FROM uploads u JOIN clips c ON c.id=u.clip_id WHERE c.campaign='Acme'")
        self.assertEqual(sorted(u["account"] for u in acme), ["acme.clips", "acme.daily"])   # its own pages only

    def test_no_brand_account_waits_with_a_note(self):
        pl._ZERNIO_NAMES["tiktok"] = ["acme.clips"]
        self.cycle()
        zeta = self.ws.q("SELECT 1 FROM uploads u JOIN clips c ON c.id=u.clip_id WHERE c.campaign='Zeta'")
        self.assertEqual(zeta, [])
        report = (self.ws.home / "AUTOPILOT_REPORT.md").read_text()
        self.assertIn("no tiktok account connected with 'zeta' in its name", report)


class OwnerAlertTests(unittest.TestCase):
    def setUp(self):
        import cloud_runner
        self.cr = cloud_runner
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-alerts-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.sent = []
        self.http = lambda topic, msg, headers: self.sent.append((topic, headers["Title"], msg)) or True
        os.environ["NTFY_TOPIC"] = "secret-topic"
        self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                  "VALUES(1,'C','x','x','f:x','done',?,?)", (pl.now(), pl.now()))
        self.ws.x("INSERT INTO clips(id, source_id, campaign, title, status, created, kind) VALUES(1,1,'C','t','posted',?,'video')",
                  (pl.now(),))
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, created) VALUES(1,'tiktok','a','https://t/1','live',?)",
                  (pl.now(),))

    def tearDown(self):
        os.environ.pop("NTFY_TOPIC", None)
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def at(self, hour):   # a UTC instant that is `hour`:30 in New York in October (EDT, UTC-4)
        return dt.datetime(2026, 10, 24, (hour + 4) % 24, 30, tzinfo=dt.timezone.utc)

    def test_nightly_digest_once_and_only_when_there_are_new_links(self):
        state = {}
        self.assertEqual(self.cr.owner_alerts(self.ws, state, {}, True, self.http, self.at(12)), [])   # noon: too early
        self.assertEqual(self.cr.owner_alerts(self.ws, state, {}, True, self.http, self.at(21)), ["digest"])
        self.assertEqual(self.sent[0][1], "1 new links to submit")
        self.assertEqual(self.cr.owner_alerts(self.ws, state, {}, True, self.http, self.at(22)), [])   # not twice a day
        self.assertEqual(len(self.sent), 1)

    def test_alerts_for_paused_campaign_low_supply_and_missing_key(self):
        self.ws.set_setting("campaign_live.Acme", {"ok": False, "reason": "budget almost gone ($3 left)"})
        state = {}
        sent = self.cr.owner_alerts(self.ws, state, {"days_left": 1.2}, False, self.http, self.at(12))
        self.assertIn("paused:Acme", sent)
        self.assertIn("Content running low", sent)
        self.assertEqual(self.cr.owner_alerts(self.ws, state, {"days_left": 1.2}, False, self.http, self.at(13)), [])
        self.ws.set_setting("campaign_live.Acme", {"ok": True})      # refilled: the pause note is forgotten
        self.cr.owner_alerts(self.ws, state, {"days_left": 9}, True, self.http, self.at(14))
        self.assertNotIn("paused:Acme", state["notified"])

    def test_no_topic_means_silence(self):
        os.environ.pop("NTFY_TOPIC")
        self.assertEqual(self.cr.owner_alerts(self.ws, {}, {"days_left": 0}, False, self.http, self.at(21)), [])
        self.assertEqual(self.sent, [])

    def test_supply_days(self):
        self.ws.x("INSERT INTO clips(source_id, campaign, title, status, created, kind) VALUES(1,'C','a','approved',?,'video')", (pl.now(),))
        out = self.cr.compute_supply(self.ws)
        self.assertEqual((out["videos"], out["slideshows"]), (1, 0))
        self.assertGreater(out["days_left"], 0)


class StateBranchTests(unittest.TestCase):
    def test_state_branch_stays_one_commit(self):
        import subprocess
        import cloud_runner
        tmp = Path(tempfile.mkdtemp(prefix="clipper-state-"))
        try:
            bare = tmp / "origin.git"
            subprocess.run(["git", "init", "-q", "--bare", str(bare)], check=True)
            work = tmp / "work"
            subprocess.run(["git", "init", "-q", "-b", cloud_runner.STATE_BRANCH, str(work)], check=True)
            subprocess.run(["git", "-C", str(work), "remote", "add", "origin", str(bare)], check=True)
            old = cloud_runner.HOME
            cloud_runner.HOME = work
            try:
                for i in range(3):
                    (work / f"f{i}.txt").write_text(str(i))
                    cloud_runner.save_state(f"cycle {i}")
            finally:
                cloud_runner.HOME = old
            n = subprocess.run(["git", "-C", str(bare), "rev-list", "--count", cloud_runner.STATE_BRANCH],
                               capture_output=True, text=True).stdout.strip()
            self.assertEqual(n, "1")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class CloudRunnerTests(unittest.TestCase):
    def test_active_campaigns_are_the_cleared_ones(self):
        import cloud_runner
        names = [p.name for p in cloud_runner.active_campaigns()]
        self.assertIn("tradever.json", names)
        self.assertNotIn("alpha-futures.json", names)      # bans tools
        self.assertNotIn("aixfunded.json", names)          # not confirmed
        self.assertNotIn("_template.json", names)


if __name__ == "__main__":
    unittest.main(verbosity=2)
