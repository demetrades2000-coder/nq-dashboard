"""
Several TikTok accounts per campaign: each clip goes to exactly one account (rotating, per-account daily caps,
videos and photo carousels counted separately), photo carousels through Zernio, spelling fixes, headlines.

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
import campaign as cmp  # noqa: E402
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402
import zernio  # noqa: E402
from test_zernio import FakeZernio  # noqa: E402


class FakeTikTok:
    def __init__(self):
        self.calls = []

    def upload(self, path, title, description, tags, privacy, paid):
        assert Path(path).exists()
        self.calls.append({"path": str(path), "dir": Path(path).is_dir(), "description": description})
        n = len(self.calls)
        return {"id": f"t{n}", "url": f"https://www.tiktok.com/@x/video/{n}", "privacy": privacy, "notes": []}


class RotationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-multi-"))
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c.update(name="Multi", automation_allowed=True, platforms=["tiktok"], accounts={"tiktok": ["acct.a", "acct.b"]},
                 disclosure={"caption": "#ad", "on_screen": "#ad"}, sources=[])
        c["permission"].update(campaign_url="https://example.com/c", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=["file:footage"])
        self.camp = self.tmp / "camp.json"
        self.camp.write_text(json.dumps(c))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.ws.set_setting("autopilot.enabled", True)
        self.ws.set_setting("autopilot.platforms", ["tiktok"])
        self.ws.set_setting("autopilot.campaigns", [])
        self.ws.set_setting("autopilot.max_uploads_per_day", 2)
        self.ws.set_setting("autopilot.max_slides_per_day", 1)
        self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                  "VALUES(1, 'Multi', ?, 'x', 'file:x', 'done', ?, ?)", (str(self.camp), pl.now(), pl.now()))
        for i in range(5):
            f = self.tmp / f"clip{i}.mp4"
            f.write_bytes(b"x")
            self._clip(f"video {i}", f, "video", 90 - i)
        for i in range(3):
            d = self.tmp / f"deck{i}"
            d.mkdir()
            (d / "slide_01.jpg").write_bytes(b"x")
            self._clip(f"deck {i}", d, "slideshow", 80 - i)

    def _clip(self, title, path, kind, score):
        self.ws.x("INSERT INTO clips(source_id, campaign, title, caption, hashtags, posts, checks, flags, score, file, "
                  "status, ready_file, created, kind) VALUES(1,'Multi',?,?,'[]',?,'[]','[]',?,?,'approved',?,?,?)",
                  (title, title, json.dumps({"tiktok": {"caption": f"#ad {title} @tag"}}), score, str(path), str(path),
                   pl.now(), kind))

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def cycle(self, fake):
        with redirect_stdout(io.StringIO()):
            return pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None,
                                                              "cookies_from_browser": None})(),
                                      uploaders={"tiktok": fake})

    def test_each_clip_goes_to_one_account_rotating_with_caps(self):
        fake = FakeTikTok()
        self.assertEqual(self.cycle(fake), 0)
        ups = self.ws.q("SELECT u.clip_id, u.account, c.kind FROM uploads u JOIN clips c ON c.id=u.clip_id")
        per_clip = {}
        for u in ups:
            per_clip.setdefault(u["clip_id"], []).append(u["account"])
        self.assertTrue(all(len(v) == 1 for v in per_clip.values()), "a clip was posted to two accounts")
        vids = [u["account"] for u in ups if u["kind"] == "video"]
        slides = [u["account"] for u in ups if u["kind"] == "slideshow"]
        self.assertEqual(sorted(vids), ["acct.a", "acct.a", "acct.b", "acct.b"])   # 2 a day each, 1 video waits
        self.assertEqual(sorted(slides), ["acct.a", "acct.b"])                       # 1 carousel a day each
        self.assertTrue(any(c["dir"] for c in fake.calls))                           # decks upload as folders
        fake2 = FakeTikTok()
        self.cycle(fake2)                                                            # same day: caps hold
        self.assertEqual(fake2.calls, [])

    def test_per_run_limit_and_quiet_hours(self):
        self.ws.set_setting("autopilot.per_account_per_run", 1)
        fake = FakeTikTok()
        self.cycle(fake)
        self.assertEqual(len(fake.calls), 4)          # 1 video + 1 slideshow per account this run
        self.ws.set_setting("autopilot.post_hours", [0, 0])   # empty window: nothing posts
        fake2 = FakeTikTok()
        self.cycle(fake2)
        self.assertEqual(fake2.calls, [])

    def test_star_means_every_connected_account(self):
        c = {"accounts": {"tiktok": "*"}}
        pl._ZERNIO_NAMES.clear()
        os.environ["ZERNIO_API_KEY"] = "zk"
        try:
            orig = zernio.list_accounts
            zernio.list_accounts = lambda *a, **k: [{"platform": "tiktok", "username": "one"},
                                                    {"platform": "instagram", "username": "ig"},
                                                    {"platform": "tiktok", "username": "two"}]
            self.assertEqual(pl.campaign_accounts(c, "tiktok", "free"), ["one", "two"])
        finally:
            zernio.list_accounts = orig
            os.environ.pop("ZERNIO_API_KEY", None)
            pl._ZERNIO_NAMES.clear()
        self.assertEqual(pl.campaign_accounts({"accounts": {"tiktok": ["x", "y"]}}, "tiktok"), ["x", "y"])
        self.assertEqual(pl.campaign_accounts({}, "tiktok"), ["default"])
        self.assertEqual(pl.campaign_account({"accounts": {"tiktok": "*"}}, "tiktok"), "default")


class PostHoursTests(unittest.TestCase):
    def test_window(self):
        utc = dt.timezone.utc
        noon_ny = dt.datetime(2026, 10, 23, 16, 0, tzinfo=utc)      # 12:00 in New York (EDT)
        one_am_ny = dt.datetime(2026, 10, 23, 5, 0, tzinfo=utc)     # 01:00 in New York
        self.assertTrue(pl.in_post_hours([8, 23], "America/New_York", noon_ny))
        self.assertFalse(pl.in_post_hours([8, 23], "America/New_York", one_am_ny))
        self.assertTrue(pl.in_post_hours([20, 2], "America/New_York", one_am_ny))   # window over midnight


class CarouselTests(unittest.TestCase):
    def setUp(self):
        os.environ["ZERNIO_API_KEY"] = "zk"
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-car-"))

    def tearDown(self):
        os.environ.pop("ZERNIO_API_KEY", None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_photo_carousel_request(self):
        imgs = []
        for i in range(5):
            p = self.tmp / f"slide_0{i}.jpg"
            p.write_bytes(b"jpg")
            imgs.append(p)
        api = FakeZernio()
        res = zernio.upload_photos(imgs, "tiktok", "default", "A title " * 20, "#ad caption @a @b", paid=True,
                                   consent=True, http=api, sleep=lambda s: None)
        presigns = [c for c in api.calls if c["url"].endswith("/media/presign")]
        self.assertEqual(len(presigns), 5)
        self.assertEqual(presigns[0]["body"]["contentType"], "image/jpeg")
        post = next(c for c in api.calls if c["url"].endswith("/posts"))["body"]
        self.assertEqual([m["type"] for m in post["mediaItems"]], ["image"] * 5)
        t = post["tiktokSettings"]
        self.assertEqual((t["media_type"], t["description"], t["commercialContentType"]),
                         ("photo", "#ad caption @a @b", "brand_content"))
        self.assertNotIn("allow_duet", t)
        self.assertLessEqual(len(post["content"]), 90)
        self.assertEqual(res["state"], "live")
        with self.assertRaises(zernio.ZernioError):
            zernio.upload_photos(imgs, "tiktok", "default", "t", "c", consent=False, http=api)


class StatsTests(unittest.TestCase):
    def test_views_come_from_zernio_analytics(self):
        os.environ["ZERNIO_API_KEY"] = "zk"
        zernio._STATS.clear()
        calls = []

        def http(method, url, data, headers, timeout=900):
            calls.append(url)
            page = 2 if "page=2" in url else 1
            posts = ([{"platformPostUrl": "https://www.tiktok.com/@a/video/1?x=1",
                       "analytics": {"views": 1500, "likes": 90}}] if page == 1 else
                     [{"platformPostUrl": "https://www.tiktok.com/@a/video/2", "analytics": {"views": 7, "likes": 0}}])
            return 200, json.dumps({"posts": posts, "pagination": {"page": page, "pages": 2}}).encode()
        try:
            self.assertEqual(zernio.post_stats("https://www.tiktok.com/@a/video/1", "tiktok", http=http),
                             {"views": 1500, "likes": 90, "comments": None, "shares": None})
            self.assertEqual(zernio.post_stats("https://www.tiktok.com/@A/video/2/", "tiktok", http=http)["views"], 7)
            self.assertIsNone(zernio.post_stats("https://www.tiktok.com/@a/video/3", "tiktok", http=http))
            self.assertEqual(len(calls), 2)       # two pages, fetched once and cached
        finally:
            zernio._STATS.clear()
            os.environ.pop("ZERNIO_API_KEY", None)


class TextTests(unittest.TestCase):
    def test_spelling_fixes_join_words_and_keep_punctuation(self):
        W = cl.Word
        ws = [W("at", 0, 1, .9), W("Trade", 1, 2, .4), W("Ever.", 2, 3, .5), W("Lace", 3, 4, .3), W("said", 4, 5)]
        out = cmp.fix_spelling(ws, {"Trade Ever": "Tradever", "Lace": "Layth"})
        self.assertEqual([w.w for w in out], ["at", "Tradever.", "Layth", "said"])
        self.assertEqual((out[1].s, out[1].e, out[1].p), (1, 3, 1.0))
        self.assertEqual(cmp.spelling_prompt({"spelling": {"a": "Tradever", "b": "Tradever", "c": "Layth"}}),
                         "Tradever, Layth")

    def test_headlines_never_end_on_a_dangling_word(self):
        self.assertEqual(cl._headline("So if you're trading with 1 to 500 leverage or"),
                         "If you're trading with 1 to 500 leverage")
        self.assertEqual(cl._headline("And I ended up taking that 500K and then I put it into the market, and I "
                                      "lost it all in two weeks."), "I ended up taking that 500K and then I put it into the market")
        self.assertTrue(cl._headline("I literally only trade for 90 minutes a day every single day.")
                        .endswith("every single day."))

    def test_tags_can_end_the_caption(self):
        c = {"caption": {"required_mentions": ["@tradeverfunding", "@laythbanks"], "mentions_last": True},
             "platforms": ["tiktok"], "disclosure": {"caption": "#ad"}}
        cap = cmp.platform_posts(c, "t", "text", ["#futures"])["tiktok"]["caption"]
        self.assertTrue(cap.endswith("@tradeverfunding @laythbanks"))
        self.assertTrue(cap.startswith("#ad"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
