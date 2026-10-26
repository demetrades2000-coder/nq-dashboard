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
import urllib.error
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

    def test_pages_without_logo_or_with_quoted_names_still_parse(self):
        cid = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
        html = page(name='Dovy \\\\"fx\\\\" Clipping', org="Acme").replace('\\"logoUrl\\":\\"u\\",', "")
        c = crw.parse_campaign(html, cid)
        self.assertIsNotNone(c)
        self.assertEqual(c["org"], "Acme")
        self.assertIn("fx", c["name"])
        self.assertEqual(c["rates"]["tiktok"]["cpm"], 5.0)

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

    def test_posting_errors_are_reported_once_a_day(self):
        (self.ws.home / "logs").mkdir(exist_ok=True)
        (self.ws.home / "logs" / "autopilot.jsonl").write_text(json.dumps({"upload_errors": ["tiktok/a #3: account not connected"]}) + "\n")
        sent = self.cr.owner_alerts(self.ws, {}, {"days_left": 9}, True, self.http, self.at(12))
        self.assertEqual(sent, ["Posting error"])
        self.assertIn("account not connected", self.sent[0][2])

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


U = ["%08x-0000-4000-8000-%012x" % (i, i) for i in range(1, 12)]


class CatalogueTests(unittest.TestCase):
    def listing(self, pages):
        """A fake `get`: url suffix -> list of ids (or an Exception)."""
        def get(url):
            key = url.split("/c/", 1)[1]
            if key.startswith("campaigns/"):
                return page(name=f"Camp {key[10:18]}")
            v = pages.get(key)
            if isinstance(v, Exception):
                raise v
            if v is None:
                raise urllib.error.HTTPError(url, 404, "nf", {}, None)
            return " ".join(f'<a href="/c/campaigns/{i}">x</a>' for i in v)
        return get

    def test_paginated_listings_are_followed_until_a_page_adds_nothing_new(self):
        get = self.listing({"discover": U[0:2], "discover/clipping?page=1": U[2:4], "discover/clipping?page=2": U[4:5],
                            "discover/clipping?page=3": U[4:5], "discover/clipping?page=4": U[9:10],
                            "discover/ugc?page=1": U[5:6]})
        self.assertEqual(crw.catalogue_ids(get), sorted(U[0:6]))        # page 4 is never read: page 3 had nothing new

    def test_one_broken_listing_does_not_lose_the_others(self):
        get = self.listing({"discover": RuntimeError("boom"), "discover/clipping?page=1": U[0:2],
                            "discover/ugc?page=1": U[2:3], "discover/ugc?page=2": RuntimeError("500")})
        self.assertEqual(crw.catalogue_ids(get), sorted(U[0:3]))

    def test_discover_parses_every_campaign_and_skips_known_useless_ones(self):
        get = self.listing({"discover": U[0:3]})
        got = crw.discover(get, workers=2)
        self.assertEqual(sorted(c["id"] for c in got), sorted(U[0:3]))
        got = crw.discover(get, workers=2, skip_ids=[U[0]])
        self.assertEqual(sorted(c["id"] for c in got), sorted(U[1:3]))
        self.assertEqual(len(crw.discover(get, workers=2, pages=False)), 3)


class LeadFilterTests(unittest.TestCase):
    def lead(self, **kw):
        c = crw.parse_campaign(page(**{k: v for k, v in kw.items() if k in ("name", "org", "budget", "spent", "types", "app",
                                                                           "accepting", "status", "cats")}), U[0])
        return c

    def test_filters(self):
        ok = lambda **kw: crw.lead_ok(self.lead(**kw))                                   # noqa: E731
        self.assertEqual(ok(), (True, ""))
        self.assertIn("application", ok(app=True)[1])
        self.assertIn("clipping", ok(types=("UGC (With Face)",))[1])
        self.assertIn("skip-list", ok(org="Reach")[1])
        self.assertIn("skip-list", ok(name="TJR Futures Clips")[1])
        self.assertIn("skip-list", ok(org="Alpha Futures")[1])
        self.assertIn("skip-list", ok(name="Alpha Capital Group clipping")[1])
        self.assertIn("skip-list", ok(org="Clipping.net")[1])
        self.assertIn("adult or gambling", ok(name="Stake Casino")[1])
        self.assertIn("English", ok(name="Campagne en Français")[1])
        self.assertIn("English", ok(name="\u0411\u0438\u0442\u043a\u043e\u0438\u043d \u043a\u043b\u0438\u043f\u044b")[1])
        self.assertIn("budget", ok(spent=199990)[1])
        self.assertIn("budget", ok(accepting=False)[1])
        c = self.lead()
        c["rates"] = {"youtube": {"cpm": 3}}
        self.assertIn("pay on tiktok", crw.lead_ok(c)[1])
        self.assertEqual(crw.lead_ok(self.lead(org="Reach"), ban=[])[0], True)            # an empty skip-list skips nobody


class RefreshLiveTests(unittest.TestCase):
    def setUp(self):
        import cloud_runner
        self.cr = cloud_runner
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-live-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.files = []
        for i, n in enumerate(("One", "Two")):
            c = {"name": n, "automation_allowed": True, "cpm": 5, "min_payout": 7,
                 "permission": {"campaign_url": f"https://contentrewards.com/c/campaigns/{U[i]}"}}
            f = self.tmp / f"{n}.json"
            f.write_text(json.dumps(c))
            self.files.append(f)
        self.pages = {U[0]: crw.parse_campaign(page(), U[0]), U[1]: crw.parse_campaign(page(budget=300000, spent=1000), U[1])}

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def fetch(self, url):
        v = self.pages[crw.campaign_id(url)]
        if isinstance(v, Exception):
            raise v
        return v

    def gone(self, url="u"):
        return urllib.error.HTTPError(url, 404, "nf", {}, None)

    def test_pause_resume_and_the_rate_note(self):
        self.pages[U[0]] = crw.parse_campaign(page(spent=199990), U[0])
        notes = self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertTrue(any("One paused automatically" in n for n in notes))
        live = self.ws.setting("campaign_live.One")
        self.assertFalse(live["ok"])
        self.assertTrue(live["reachable"])
        self.pages[U[0]] = crw.parse_campaign(page(), U[0])
        notes = self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertTrue(any("One resumed" in n for n in notes))

    def test_a_failed_check_keeps_the_last_status_and_counts_failures(self):
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.pages[U[0]] = urllib.error.HTTPError("u", 500, "boom", {}, None)
        notes = self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertTrue(any("live check failed" in n for n in notes))
        live = self.ws.setting("campaign_live.One")
        self.assertTrue(live["ok"])                                   # last known status kept
        self.assertEqual((live["reachable"], live["fail_count"], live["gone_count"]), (False, 1, 0))

    def test_only_a_real_404_counts_as_gone_and_never_when_every_page_fails_together(self):
        self.pages[U[0]] = self.gone()
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertEqual(self.ws.setting("campaign_live.One")["gone_count"], 1)
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertEqual(self.ws.setting("campaign_live.One")["gone_count"], 2)
        self.pages[U[0]] = crw.parse_campaign(page(), U[0])
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertEqual(self.ws.setting("campaign_live.One")["gone_count"], 0)           # it came back
        self.pages[U[0]] = ValueError("page didn't contain campaign data")              # a changed page layout: not "gone"
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertEqual(self.ws.setting("campaign_live.One")["gone_count"], 0)
        self.pages[U[0]] = self.gone()
        self.pages[U[1]] = self.gone()                                                   # both at once: the site, not them
        self.cr.refresh_live(self.ws, {}, self.fetch, self.files)
        self.assertEqual(self.ws.setting("campaign_live.One")["gone_count"], 0)
        self.assertEqual(self.ws.setting("campaign_live.Two")["gone_count"], 0)

    def test_banned_campaigns_are_not_fetched(self):
        c = json.loads(self.files[1].read_text())
        c["automation_allowed"] = False
        self.files[1].write_text(json.dumps(c))
        seen = []
        self.cr.refresh_live(self.ws, {}, lambda u: seen.append(u) or self.pages[crw.campaign_id(u)], self.files)
        self.assertEqual(len(seen), 1)


class DiscoverLeadsTests(unittest.TestCase):
    def setUp(self):
        import cloud_runner
        self.cr = cloud_runner
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-leads-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.old_home = cloud_runner.HOME
        cloud_runner.HOME = self.tmp / "home"
        (cloud_runner.HOME).mkdir()

    def tearDown(self):
        self.cr.HOME = self.old_home
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_good_leads_only_at_most_every_12_hours(self):
        found = [crw.parse_campaign(page(name=f"Finance Clips {i}", org=f"Org{i}"), U[i]) for i in range(3)]
        found.append(crw.parse_campaign(page(name="Reach Clipping", org="Reach"), U[5]))
        found.append(crw.parse_campaign(page(name="Needs app", org="Z", app=True), U[6]))
        state = {}
        n = self.cr.discover_leads(self.ws, state, discover=lambda: found)
        self.assertEqual(n, 3)
        names = [l["name"] for l in self.ws.setting("leads.discovered")]
        self.assertNotIn("Reach Clipping", names)
        self.assertNotIn("Needs app", names)
        self.assertEqual(self.cr.discover_leads(self.ws, state, discover=lambda: 1 / 0), 0)      # within 12 h: not asked again
        self.assertEqual(set(state["lead_bad"]), {U[5], U[6]})                                    # remembered as useless
        state["last_discover"] -= 13 * 3600
        self.assertEqual(self.cr.discover_leads(self.ws, state, discover=lambda: found[:1]), 1)


class OnboardAccountMatchTests(unittest.TestCase):
    def build(self, brief_text):
        tmp = Path(tempfile.mkdtemp())
        try:
            cid = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
            fetch = lambda url: crw.parse_campaign(page(name="Acme Prop Firm Clipping| $2k Budget"), cid)
            p = onboard.build(f"https://contentrewards.com/c/campaigns/{cid}", [], campaigns_dir=tmp, fetch=fetch,
                              today="2026-10-23", brief_text=brief_text)
            return json.loads(p.read_text())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_page_word_is_the_account_match(self):
        self.assertEqual(self.build(BRIEF)["account_match"], "tradever")

    def test_no_page_requirement_means_any_free_page_may_post(self):
        c = self.build("Clip the podcast with a strong hook. Use #ad. Videos must be 9:16. No bots or fake engagement.")
        self.assertEqual(c["account_match"], "")

    def test_a_dedicated_page_requirement_without_a_name_word_uses_the_brand_word(self):
        c = self.build("You must post from a dedicated clipping account. Use #ad. No bots or fake engagement.")
        self.assertEqual(c["account_match"], "acme")

    def test_without_any_brief_the_cautious_choice_is_a_brand_page(self):
        self.assertEqual(self.build("")["account_match"], "acme")


if __name__ == "__main__":
    unittest.main(verbosity=2)
