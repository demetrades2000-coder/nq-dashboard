"""Dashboard v2.1: multiple accounts per campaign, campaign rules checklist, up-next queue, video vs slideshow, payout
reality (docs/DASHBOARD_DATA.md). Runs on hand-made workspaces (exact numbers) and on the demo workspace."""

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
from test_dashboard_v2 import N, OS, S, check  # noqa: E402

ACCOUNT = {"platform": S, "name": S, "campaigns": list, "today": int, "cap": int, "posts": int, "posts_7d": int,
           "views": int, "views_7d": int, "avg_views": int, "likes": int, "engagement": N, "last_post": OS, "net": N,
           "net_7d": N, "slideshows": int, "daily_views": list, "status": S, "status_note": S}
NEXT = {"clip_id": int, "title": S, "campaign": S, "score": N, "thumb": OS, "kind": S, "dur": int, "platform": S,
        "account": S, "slot": S, "reason": S}
CHECK = {"label": S, "ok": (bool, type(None)), "detail": S}
PAYOUT = {"min_payout": N, "views_to_min": int, "cap": N, "views_to_cap": int, "posts": int, "posts_paying": int,
          "posts_at_cap": int}
FORMAT = {"kind": S, "posts": int, "views": int, "avg_views": int, "engagement": N}


def now_iso(minutes_ago=0):
    """A timestamp `minutes_ago` back; a recent one never slips into yesterday (tests run just after midnight too)."""
    now = dt.datetime.now().replace(microsecond=0)
    t = now - dt.timedelta(minutes=minutes_ago)
    if minutes_ago < 600 and t.date() < now.date():
        t = dt.datetime.combine(now.date(), dt.time())
    return t.isoformat()


class Fixture(unittest.TestCase):
    """A TikTok-only campaign with two rotating accounts, rules, a logo and a slideshow."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.ws = pl.WS(str(self.tmp / "ws"))
        (self.tmp / "logos").mkdir()
        (self.tmp / "logos" / "brand.png").write_bytes(b"\x89PNG\r\n")
        self.camp = {"name": "Brand X", "cpm": 5.0, "fee_pct": 10, "min_payout": 7, "max_payout_per_clip": 500,
                     "platforms": ["tiktok"], "posts_per_week": 3, "min_engagement": 2,
                     "automation_allowed": True,
                     "clip": {"min": 7, "max": 60},
                     "caption": {"required_mentions": ["@brandx", "@ceo"], "mentions_last": True},
                     "on_screen": {"logo": "logos/brand.png"},
                     "accounts": {"tiktok": ["acct.a", "acct.b"]}}
        self.cfile = self.tmp / "brandx.json"
        self.cfile.write_text(json.dumps(self.camp))
        self.ws.set_setting("autopilot.campaigns", [str(self.cfile)])
        self.ws.set_setting("autopilot.platforms", ["tiktok"])
        self.sid = self.ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, status, attempts, created, "
                             "updated) VALUES(?,?,?,?,?,?,?,?)", ("Brand X", str(self.cfile), "x", "file:x", "done", 1,
                                                                  pl.now(), pl.now()))

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def clip(self, status="posted", score=80.0, dur=20, caption="Hook #ad @brandx @ceo", kind=None):
        cols = "source_id, campaign, rank, start, end_, title, caption, hashtags, posts, checks, flags, words, text, " \
               "score, file, status, created"
        vals = [self.sid, "Brand X", 1, 0, dur, f"clip {score}", caption, "[]", "{}", "[]", "[]", "[]", "Hook.", score,
                None, status, pl.now()]
        if kind:
            if "kind" not in {r[1] for r in self.ws.q("PRAGMA table_info(clips)")}:
                self.ws.x("ALTER TABLE clips ADD COLUMN kind TEXT DEFAULT 'video'")
            cols += ", kind"
            vals.append(kind)
        return self.ws.x(f"INSERT INTO clips({cols}) VALUES({','.join('?' * len(vals))})", vals)

    def upload(self, cid, account, views, likes, minutes_ago=30, state="live", caption="Hook #ad @brandx @ceo"):
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, views, likes, caption, created, updated) "
                  "VALUES(?,?,?,?,?,?,?,?,?,?)", (cid, "tiktok", account, f"https://www.tiktok.com/@{account}/video/{cid}",
                                                  state, views, likes, caption, now_iso(minutes_ago), now_iso()))


class AccountsTests(Fixture):
    def test_accounts_detail_exact(self):
        self.ws.set_setting("autopilot.max_per_day", 2)
        a1, a2, a3 = self.clip(), self.clip(), self.clip()
        self.upload(a1, "acct.a", 2000, 100, minutes_ago=10)
        self.upload(a2, "acct.a", 1000, 10, minutes_ago=20)
        self.upload(a3, "acct.b", 500, 25, minutes_ago=60 * 24 * 3)
        d = dashboard.build_data(self.ws)
        check(self, d["accounts_detail"], [ACCOUNT])
        by = {a["name"]: a for a in d["accounts_detail"]}
        self.assertEqual(set(by), {"acct.a", "acct.b"})
        a = by["acct.a"]
        self.assertEqual((a["today"], a["cap"], a["posts"], a["views"], a["likes"]), (2, 2, 2, 3000, 110))
        self.assertEqual(a["status"], "at_cap")
        self.assertEqual(a["avg_views"], 1500)
        self.assertAlmostEqual(a["engagement"], 110 / 3000, places=4)
        self.assertAlmostEqual(a["net"], 2000 * 5 / 1000 * .9, places=2)  # the 1,000-view post is under the $7 minimum
        self.assertEqual(len(a["daily_views"]), 14)
        self.assertEqual(a["campaigns"], ["Brand X"])
        self.assertEqual(by["acct.b"]["today"], 0)
        self.assertEqual(d["autopilot"]["max_per_day"], 2)
        self.assertEqual(d["accounts_detail"][0]["name"], "acct.a")  # most views in 7 days first
        h = dashboard.hide_money(d)
        self.assertTrue(all(x["net"] is None and x["net_7d"] is None for x in h["accounts_detail"]))

    def test_cap_setting_fallback_and_tiktok_ceiling(self):
        self.ws.set_setting("autopilot.max_uploads_per_day", 40)
        self.assertEqual(dashboard.max_per_day(self.ws), 40)
        self.upload(self.clip(), "acct.a", 10, 1)
        d = dashboard.build_data(self.ws)
        self.assertTrue(all(a["cap"] == 15 for a in d["accounts_detail"]))  # TikTok's own daily limit
        empty = pl.WS(str(self.tmp / "ws2"))
        try:
            self.assertEqual(dashboard.max_per_day(empty), 3)
        finally:
            empty.close()

    def test_error_status_from_failed_upload(self):
        self.upload(self.clip(), "acct.b", 0, 0, state="failed")
        d = dashboard.build_data(self.ws)
        b = next(a for a in d["accounts_detail"] if a["name"] == "acct.b")
        self.assertEqual(b["status"], "error")
        self.assertEqual(b["posts"], 0)  # a failed upload never went out
        self.assertEqual(b["today"], 1)  # but it counts against the cap, like the autopilot counts it

    def test_campaign_accounts_forms(self):
        f = dashboard.campaign_accounts
        self.assertEqual(f({"accounts": {"tiktok": "one"}}, "tiktok"), ["one"])
        self.assertEqual(f({"accounts": {"tiktok": ["a", "b", "a"]}}, "tiktok"), ["a", "b"])
        self.assertEqual(f({"accounts": {"tiktok": "*"}}, "tiktok", ["x", "y"]), ["x", "y"])
        self.assertEqual(f({"accounts": {"tiktok": "*"}}, "tiktok", []), ["default"])
        self.assertEqual(f({}, "tiktok"), ["default"])

    def test_up_next_rotation(self):
        self.ws.set_setting("autopilot.max_per_day", 2)
        self.upload(self.clip(), "acct.a", 100, 5, minutes_ago=5)
        self.upload(self.clip(), "acct.a", 100, 5, minutes_ago=6)   # acct.a is at its cap of 2
        self.upload(self.clip(), "acct.b", 100, 5, minutes_ago=7)   # acct.b has 1 slot left
        q1 = self.clip("approved", score=90)
        q2 = self.clip("approved", score=70, kind="slideshow")
        self.clip("pending_review", score=99)                       # held: not in the queue
        d = dashboard.build_data(self.ws)
        check(self, d["up_next"], [NEXT])
        rows = [(r["clip_id"], r["account"], r["slot"]) for r in d["up_next"]]
        self.assertEqual(rows, [(q1, "acct.b", "next run"), (q2, "acct.a", "tomorrow")])
        self.assertEqual(d["up_next"][1]["kind"], "slideshow")

    def test_up_next_skips_campaigns_not_on_autopilot(self):
        self.ws.set_setting("autopilot.campaigns", [])
        self.clip("approved")
        self.assertEqual(dashboard.build_data(self.ws)["up_next"], [])


class RulesAndPayoutTests(Fixture):
    def test_checks_all_met(self):
        for i in range(3):
            self.upload(self.clip(), "acct.a" if i % 2 else "acct.b", 3000, 120)
        c = next(x for x in dashboard.build_data(self.ws)["campaigns"] if x["name"] == "Brand X")
        check(self, c["checks"], [CHECK])
        by = {x["label"]: x for x in c["checks"]}
        self.assertTrue(by["Required tags at the caption end"]["ok"])
        self.assertTrue(by["Brand logo on screen"]["ok"])
        self.assertTrue(by["Clips at least 7 s"]["ok"])
        self.assertTrue(by["3+ posts a week"]["ok"])
        self.assertTrue(by["Engagement 2%+"]["ok"])
        self.assertTrue(by["TikTok only"]["ok"])
        self.assertTrue(by["Automation allowed by the rules"]["ok"])
        self.assertEqual(c["posts_per_week"], 3)
        self.assertEqual(c["posts_7d"], 3)

    def test_checks_failing(self):
        (self.tmp / "logos" / "brand.png").unlink()
        self.upload(self.clip(dur=5), "acct.a", 1000, 5, caption="@brandx @ceo hook first")  # tags not at the end
        c = next(x for x in dashboard.build_data(self.ws)["campaigns"] if x["name"] == "Brand X")
        by = {x["label"]: x for x in c["checks"]}
        self.assertFalse(by["Required tags at the caption end"]["ok"])
        self.assertFalse(by["Brand logo on screen"]["ok"])
        self.assertFalse(by["Clips at least 7 s"]["ok"])
        self.assertFalse(by["3+ posts a week"]["ok"])
        self.assertFalse(by["Engagement 2%+"]["ok"])

    def test_checks_nothing_to_judge(self):
        c = next(x for x in dashboard.build_data(self.ws)["campaigns"] if x["name"] == "Brand X")
        by = {x["label"]: x for x in c["checks"]}
        self.assertIsNone(by["Required tags at the caption end"]["ok"])
        self.assertIsNone(by["Engagement 2%+"]["ok"])

    def test_payout(self):
        for v in (500, 1400, 2000, 150_000):
            self.upload(self.clip(), "acct.a", v, 0)
        c = next(x for x in dashboard.build_data(self.ws)["campaigns"] if x["name"] == "Brand X")
        check(self, c["payout"], PAYOUT)
        p = c["payout"]
        self.assertEqual((p["min_payout"], p["views_to_min"], p["cap"], p["views_to_cap"]), (7.0, 1400, 500.0, 100000))
        self.assertEqual((p["posts"], p["posts_paying"], p["posts_at_cap"]), (4, 3, 1))
        h = dashboard.hide_money(dashboard.build_data(self.ws))
        self.assertEqual(next(x for x in h["campaigns"] if x["name"] == "Brand X")["payout"]["min_payout"], 7.0)

    def test_format_split_and_kind_column(self):
        self.upload(self.clip(), "acct.a", 1000, 10)
        d = dashboard.build_data(self.ws)  # no kind column yet: everything is a video
        self.assertEqual([f["kind"] for f in d["analytics"]["format_split"]], ["video", "slideshow"])
        self.assertEqual(d["analytics"]["format_split"][1]["posts"], 0)
        self.assertTrue(all(c["kind"] == "video" for c in d["clips"]))
        self.upload(self.clip(kind="slideshow"), "acct.b", 3000, 90)
        d = dashboard.build_data(self.ws)
        fs = {f["kind"]: f for f in d["analytics"]["format_split"]}
        check(self, d["analytics"]["format_split"], [FORMAT])
        self.assertEqual((fs["video"]["avg_views"], fs["slideshow"]["avg_views"]), (1000, 3000))
        self.assertAlmostEqual(fs["slideshow"]["engagement"], 0.03)

    def test_slideshow_thumb_from_first_slide(self):
        if not shutil.which("ffmpeg"):
            self.skipTest("ffmpeg not installed")
        import subprocess
        slides = self.tmp / "show"
        slides.mkdir()
        for n in ("02.jpg", "01.jpg"):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=red:s=108x192",
                            "-frames:v", "1", "-update", "1", str(slides / n)], capture_output=True, timeout=60)
        self.assertEqual(dashboard.thumb_source(str(slides)), str(slides / "01.jpg"))
        cid = self.clip("approved", kind="slideshow")
        self.ws.x("UPDATE clips SET file=? WHERE id=?", (str(slides), cid))
        self.assertEqual(dashboard.make_thumbs(self.ws), 1)
        d = dashboard.build_data(self.ws)
        self.assertEqual(next(c for c in d["clips"] if c["id"] == cid)["thumb"], f"thumbs/{cid}.jpg")


class EmptyAndDemoTests(unittest.TestCase):
    def test_empty_workspace(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            d = dashboard.build_data(ws)
            ws.close()
            self.assertEqual(d["accounts_detail"], [])
            self.assertEqual(d["up_next"], [])
            self.assertEqual([f["posts"] for f in d["analytics"]["format_split"]], [0, 0])
            for c in d["campaigns"]:
                check(self, c["checks"], [CHECK])
                check(self, c["payout"], PAYOUT)
            self.assertIn("runner", d["autopilot"])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_demo(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = demo.build(tmp / "demo", days=30, seed=7)
            dashboard.make_thumbs(ws)
            d = dashboard.build_data(ws)
            ws.close()
            trad = {a["name"]: a for a in d["accounts_detail"] if "Tradever (prop firm)" in a["campaigns"]}
            self.assertEqual(set(trad), {"tradever.clips", "tradever.daily", "tradever.trades"})
            self.assertTrue(all(a["platform"] == "tiktok" for a in trad.values()))
            self.assertEqual(trad["tradever.clips"]["status"], "at_cap")
            self.assertLess(trad["tradever.daily"]["today"], trad["tradever.daily"]["cap"])
            self.assertTrue(any(a["slideshows"] for a in trad.values()))
            c = next(x for x in d["campaigns"] if x["name"] == "Tradever (prop firm)")
            self.assertEqual(c["platforms"], ["tiktok"])
            self.assertGreaterEqual(len(c["checks"]), 6)
            self.assertTrue(all(x["ok"] for x in c["checks"]), c["checks"])
            self.assertEqual(c["payout"]["views_to_min"], 1400)
            self.assertTrue(d["up_next"])
            self.assertTrue({"next run", "tomorrow"} <= {q["slot"] for q in d["up_next"]})
            self.assertTrue(all(q["account"] == "tradever.daily" for q in d["up_next"] if q["campaign"] == c["name"]))
            fs = {f["kind"]: f for f in d["analytics"]["format_split"]}
            self.assertGreater(fs["slideshow"]["posts"], 0)
            self.assertEqual(fs["video"]["posts"] + fs["slideshow"]["posts"], d["stats"]["posts"])
            if shutil.which("ffmpeg"):
                self.assertTrue(any(x["thumb"] for x in d["clips"] if x["kind"] == "slideshow"))
            self.assertEqual(d["autopilot"]["runner"], "cloud")
            html = dashboard.render_html(d)
            self.assertEqual(html.count("</script>"), 1)
            for name in ("pageAccounts", "upNextCard", "rulesHTML", "payoutCard", "formatHTML", "'accounts'"):
                self.assertIn(name, html)
            # one clip, one account: no clip is posted twice on the same platform
            pairs = [(u["platform"], x["id"]) for x in d["clips"] for u in x["uploads"] if u["state"] != "failed"]
            self.assertEqual(len(pairs), len(set(pairs)))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
