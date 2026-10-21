"""
TikTok integration tests against a simulated Content Posting API, plus multi-platform autopilot cycles.

  python -m unittest discover -s clipper/tests -v
"""

import datetime as dt
import io
import json
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402
import tiktok  # noqa: E402
from test_pipeline import make_srt, run_cli  # noqa: E402

MB = tiktok.MB


class FakeTikTokAPI:
    """Records requests and answers like the documented API."""

    def __init__(self, statuses=("PROCESSING_UPLOAD", "SEND_TO_USER_INBOX"), init_error=None, privacy_options=None):
        self.calls, self.statuses, self.init_error = [], list(statuses), init_error
        self.privacy_options = privacy_options or ["SELF_ONLY"]

    def __call__(self, method, url, body=None, headers=None, sleep=None, tries=4):
        self.calls.append((method, url, body, dict(headers or {})))
        ok = {"error": {"code": "ok", "message": ""}}
        if url.endswith("/oauth/token/"):
            return 200, {"access_token": "new-access", "refresh_token": "rotated-refresh", "expires_in": 86400,
                         "refresh_expires_in": 31536000, "open_id": "u1", "scope": "video.upload,video.list"}
        if "/creator_info/query/" in url:
            return 200, {**ok, "data": {"privacy_level_options": self.privacy_options}}
        if url.endswith("/video/init/"):
            if self.init_error:
                return 403, {"error": {"code": self.init_error, "message": "x"}}
            return 200, {**ok, "data": {"publish_id": "pub1", "upload_url": "https://upload.example/x"}}
        if method == "PUT":
            return 201, b""
        if "/status/fetch/" in url:
            st = self.statuses.pop(0) if len(self.statuses) > 1 else self.statuses[0]
            data = {"status": st}
            if st == "PUBLISH_COMPLETE":
                data["publicaly_available_post_id"] = [7123]
            return 200, {**ok, "data": data}
        if "/video/list/" in url:
            return 200, {**ok, "data": {"videos": []}}
        return 404, {"error": {"code": "not_found"}}


class TikTokUnitTests(unittest.TestCase):
    def setUp(self):
        self.store = {"tok": {"access_token": "acc", "refresh_token": "ref", "expires_at": time.time() + 3600,
                              "refresh_expires_at": time.time() + 10 ** 6, "client_key": "ck", "client_secret": "cs",
                              "mode": "inbox"}}
        self._load, self._save = tiktok._load, tiktok._save
        tiktok._load = lambda: self.store.get("tok")
        tiktok._save = lambda t: self.store.__setitem__("tok", dict(t))
        self.tmp = Path(tempfile.mkdtemp())

    def tearDown(self):
        tiktok._load, tiktok._save = self._load, self._save
        shutil.rmtree(self.tmp, ignore_errors=True)

    def clip(self, size):
        f = self.tmp / f"c{size}.mp4"
        with f.open("wb") as fh:
            fh.truncate(size)
        return f

    def test_chunk_plan(self):
        self.assertEqual(tiktok.chunk_plan(3 * MB), (3 * MB, 1))
        self.assertEqual(tiktok.chunk_plan(40 * MB), (40 * MB, 1))
        size = 105 * MB + 123
        chunk, n = tiktok.chunk_plan(size)
        self.assertEqual((chunk, n), (10 * MB, 10))
        last = size - (n - 1) * chunk
        self.assertTrue(5 * MB <= chunk <= 64 * MB and last <= 128 * MB)

    def test_inbox_upload_flow(self):
        api = FakeTikTokAPI()
        res = tiktok.upload(self.clip(2 * MB), "caption #ad", "inbox", True, http=api, sleep=lambda s: None)
        self.assertEqual(res["status"], "SEND_TO_USER_INBOX")
        self.assertIn("inbox", res["notes"][0])
        self.assertIn("Paid partnership", res["notes"][0])
        init = next(c for c in api.calls if c[1].endswith("/inbox/video/init/"))
        self.assertEqual(init[2]["source_info"], {"source": "FILE_UPLOAD", "video_size": 2 * MB,
                                                  "chunk_size": 2 * MB, "total_chunk_count": 1})
        self.assertEqual(init[3]["Authorization"], "Bearer acc")
        put = next(c for c in api.calls if c[0] == "PUT")
        self.assertEqual(put[3]["Content-Range"], f"bytes 0-{2 * MB - 1}/{2 * MB}")

    def test_multi_chunk_ranges(self):
        api = FakeTikTokAPI()
        size = 70 * MB + 5
        tiktok.upload(self.clip(size), "c", "inbox", False, http=api, sleep=lambda s: None)
        ranges = [c[3]["Content-Range"] for c in api.calls if c[0] == "PUT"]
        self.assertEqual(len(ranges), 7)
        self.assertEqual(ranges[0], f"bytes 0-{10 * MB - 1}/{size}")
        self.assertEqual(ranges[-1], f"bytes {60 * MB}-{size - 1}/{size}")

    def test_direct_mode_unaudited_goes_private(self):
        api = FakeTikTokAPI(statuses=("PUBLISH_COMPLETE",))
        res = tiktok.upload(self.clip(MB), "c", "direct", True, http=api, sleep=lambda s: None)
        body = next(c for c in api.calls if c[1].endswith("/post/publish/video/init/"))[2]
        self.assertEqual(body["post_info"]["privacy_level"], "SELF_ONLY")
        self.assertTrue(body["post_info"]["brand_content_toggle"])
        self.assertFalse(body["post_info"]["is_aigc"])
        self.assertIn("allowed only", res["notes"][0])
        self.assertEqual(res["remote_id"], "7123")

    def test_error_codes_explained(self):
        api = FakeTikTokAPI(init_error="spam_risk_too_many_pending_share")
        with self.assertRaises(tiktok.TikTokError) as cm:
            tiktok.upload(self.clip(MB), "c", "inbox", False, http=api, sleep=lambda s: None)
        self.assertIn("Too many drafts", str(cm.exception))

    def test_processing_failure(self):
        api = FakeTikTokAPI(statuses=("FAILED",))
        with self.assertRaises(tiktok.TikTokError):
            tiktok.upload(self.clip(MB), "c", "inbox", False, http=api, sleep=lambda s: None)

    def test_token_refresh_keeps_rotated_token(self):
        self.store["tok"]["expires_at"] = time.time() - 10
        api = FakeTikTokAPI()
        token, tok = tiktok.access_token(api)
        self.assertEqual(token, "new-access")
        self.assertEqual(self.store["tok"]["refresh_token"], "rotated-refresh")
        form = api.calls[0][2]
        self.assertIn("grant_type=refresh_token", form)

    def test_expired_refresh_requires_login(self):
        self.store["tok"].update(expires_at=time.time() - 10, refresh_expires_at=time.time() - 5)
        with self.assertRaises(tiktok.TikTokError) as cm:
            tiktok.access_token(FakeTikTokAPI())
        self.assertIn("tiktok auth", str(cm.exception))

    def test_not_connected(self):
        self.store.clear()
        with self.assertRaises(tiktok.TikTokError) as cm:
            tiktok.upload(self.clip(MB), "c", http=FakeTikTokAPI())
        self.assertIn("isn't connected", str(cm.exception))

    def test_pkce(self):
        v, c = tiktok.pkce_pair("hex")
        self.assertEqual(len(c), 64)
        v2, c2 = tiktok.pkce_pair("b64")
        self.assertNotIn("=", c2)
        self.assertGreaterEqual(len(v), 43)

    def test_match_posts(self):
        pending = [{"key": 1, "caption": "#ad Most people will never get rich because they trade time"},
                   {"key": 2, "caption": "short"}]
        vids = [{"id": "9", "video_description": "#ad most people will never get rich because they trade time "
                                                 "for money #money", "share_url": "https://tiktok.com/@me/video/9"}]
        m = tiktok.match_posts(pending, vids)
        self.assertEqual(list(m), [1])


class FakeYT:
    def __init__(self):
        self.calls = []

    def upload(self, path, title, description, tags, privacy, paid):
        self.calls.append(title)
        vid = f"yt{len(self.calls)}"
        return {"id": vid, "url": f"https://www.youtube.com/shorts/{vid}", "privacy": privacy, "notes": []}

    def stats(self, ids):
        return {i: {"views": 500, "likes": 5} for i in ids}


class FakeTT:
    def __init__(self):
        self.calls, self.live = [], []

    def upload(self, path, title, description, tags, privacy, paid):
        self.calls.append(description)
        return {"remote_id": None, "url": None, "state": "draft", "notes": ["draft sent to your TikTok inbox"],
                "publish_id": f"p{len(self.calls)}"}

    def recent(self):
        return self.live


class MultiPlatformAutopilot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-tt-"))
        cls.footage = cls.tmp / "footage"
        cls.footage.mkdir()
        v = cls.footage / "ep.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i",
                        "testsrc2=size=1280x720:rate=30:duration=60", "-f", "lavfi", "-i", "sine=frequency=200:duration=60",
                        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", str(v)], check=True)
        make_srt(cls.footage / "ep.srt", 60)
        cls.home = str(cls.tmp / "ws")
        cls.camps = {}
        for name, plats in (("Both", ["tiktok", "instagram", "youtube"]), ("IG and YT only", ["instagram", "youtube"])):
            c = json.loads((HERE / "campaigns" / "_template.json").read_text())
            c["name"], c["platforms"] = name, plats
            c["permission"].update(campaign_url=f"https://contentrewards.com/{name}", verified_on=dt.date.today().isoformat(),
                                   evidence="test", allowed_sources=[f"file:{cls.footage}"])
            c["sources"] = []
            c["clip"].update(count=1, min=15, max=30)
            c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
            f = cls.tmp / f"{name}.json"
            f.write_text(json.dumps(c))
            cls.camps[name] = f
            # a re-encode per campaign so each campaign has its own source (duplicate checks are per campaign)
            src = cls.footage / f"{name.replace(' ', '_')}.mp4"
            shutil.copy(v, src)
            rc, out = run_cli("--home", cls.home, "import", str(f), str(src), "--transcript", str(cls.footage / "ep.srt"))
            assert rc == 0, out
        cls.ws = pl.WS(cls.home)
        run_cli("--home", cls.home, "autopilot", "enable", "--platforms", "youtube,tiktok", "--max-per-day", "5")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def cycle(self, ups):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None,
                                                            "cookies_from_browser": None})(), uploaders=ups)
        return rc, buf.getvalue()

    def test_platform_routing_drafts_and_pickup(self):
        yt, tt = FakeYT(), FakeTT()
        rc, out = self.cycle({"youtube": yt, "tiktok": tt})
        self.assertEqual(rc, 0, out)
        ups = self.ws.q("SELECT u.platform, c.campaign FROM uploads u JOIN clips c ON c.id=u.clip_id")
        got = sorted((u["campaign"], u["platform"]) for u in ups)
        self.assertIn(("Both", "tiktok"), got)
        self.assertIn(("Both", "youtube"), got)
        self.assertIn(("IG and YT only", "youtube"), got)
        self.assertNotIn(("IG and YT only", "tiktok"), got, "never upload where the campaign doesn't pay")
        self.assertTrue(tt.calls[0].startswith("#ad"))
        report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
        self.assertIn("Finish in the TikTok app", report)
        self.assertIn(tt.calls[0][:40], report)
        # user posts the draft in the app; the next cycle finds it by caption and records the link
        tt.live = [{"id": "7001", "video_description": tt.calls[0] + " ", "share_url": "https://www.tiktok.com/@me/video/7001",
                    "view_count": 4321, "like_count": 9}]
        self.cycle({"youtube": yt, "tiktok": tt})
        row = self.ws.q("SELECT * FROM uploads WHERE platform='tiktok'")[0]
        self.assertEqual(row["url"], "https://www.tiktok.com/@me/video/7001")
        self.assertEqual(row["views"], 4321)
        self.assertEqual(len(tt.calls), 1, "no re-upload of an already uploaded clip")
        report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
        self.assertNotIn("Finish in the TikTok app", report)
        self.assertIn("[tiktok] https://www.tiktok.com/@me/video/7001", report)
        earn = json.loads((Path(self.home) / "earnings.json").read_text())
        self.assertIn("https://www.tiktok.com/@me/video/7001", [p["url"] for p in earn["posts"]])
        rc, out = run_cli("--home", self.home, "submitted", "all")
        self.assertIn("post(s) marked submitted", out)

    def test_unknown_platform_rejected(self):
        rc, out = run_cli("--home", self.home, "autopilot", "enable", "--platforms", "youtube,myspace")
        self.assertEqual(rc, 1)
        self.assertIn("unsupported", out)


class CampaignBriefTests(unittest.TestCase):
    def test_shipped_briefs_refuse_until_verified(self):
        import campaign as cmp
        for f in ("higgsfield-20vc.json", "moonpay-ivan-soto.json", "pbinvesting.json"):
            c = cmp.load(str(HERE / "campaigns" / f))
            probs = cmp.permission_problems(c)
            self.assertTrue(probs, f)
        hf = cmp.load(str(HERE / "campaigns" / "higgsfield-20vc.json"))
        self.assertNotIn("tiktok", hf["platforms"])

    def test_min_views_and_cap(self):
        import campaign as cmp
        c = {"cpm": 1.25, "fee_pct": 10, "min_views": 10000, "max_payout_per_clip": 0, "min_payout": 0}
        self.assertEqual(cmp.payout(c, 9999), (0.0, 0.0))
        self.assertAlmostEqual(cmp.payout(c, 20000)[1], 22.5)
        c2 = {"cpm": 1.0, "fee_pct": 10, "max_payout_per_clip": 350, "min_payout": 1}
        self.assertAlmostEqual(cmp.payout(c2, 1_000_000)[0], 350.0)
        self.assertEqual(cmp.payout(c2, 500)[0], 0.0)  # below $1 minimum payout

    def test_no_ai_campaign_disables_claude(self):
        import campaign as cmp
        c = cmp.load(str(HERE / "campaigns" / "pbinvesting.json"))
        args = pl.clip_args(c, None, type("A", (), {})())
        self.assertTrue(args.no_ai)


if __name__ == "__main__":
    unittest.main(verbosity=2)
