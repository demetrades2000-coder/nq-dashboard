"""Zernio (free automatic TikTok/Instagram posting) against a simulated API, plus an autopilot cycle via --via free."""

import argparse
import datetime as dt
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402
import tracker  # noqa: E402
import zernio  # noqa: E402
from test_pipeline import make_srt, run_cli  # noqa: E402

ACCOUNTS = {"accounts": [{"_id": "tt1", "platform": "tiktok", "username": "alphafutures.clips"},
                         {"_id": "ig1", "platform": "instagram", "username": "alphafutures.ig"}]}


class FakeZernio:
    def __init__(self, post_status="published", url=True, fail_posts=0):
        self.calls, self.post_status, self.url, self.fail_posts, self.n = [], post_status, url, fail_posts, 0

    def __call__(self, method, url, data, headers, timeout=900):
        body = json.loads(data) if data and headers.get("Content-Type") == "application/json" else None
        self.calls.append({"method": method, "url": url, "body": body, "headers": headers,
                           "size": len(data) if data else 0})
        if url.endswith("/accounts"):
            return 200, json.dumps(ACCOUNTS).encode()
        if url.endswith("/media/presign"):
            return 200, json.dumps({"uploadUrl": "https://storage.example/put?sig=1",
                                    "publicUrl": "https://cdn.example/clip.mp4", "expiresIn": 3600}).encode()
        if url.startswith("https://storage.example"):
            return 200, b""
        if url.endswith("/posts"):
            if self.fail_posts:
                self.fail_posts -= 1
                return 503, b"{}"
            self.n += 1
            plat = body["platforms"][0]["platform"]
            pe = {"platform": plat, "status": self.post_status}
            if self.url and self.post_status == "published":
                pe["platformPostUrl"] = f"https://www.{plat}.com/p/{self.n}"
            if self.post_status == "failed":
                pe["errorMessage"] = "video too short"
            return 201, json.dumps({"post": {"_id": f"post{self.n}", "platforms": [pe]}}).encode()
        if "/posts/" in url:
            pid = url.rsplit("/", 1)[1]
            return 200, json.dumps({"post": {"_id": pid, "platforms": [
                {"platform": "instagram", "status": "published", "platformPostUrl": "https://www.instagram.com/reel/late/"}]}}).encode()
        return 404, b"{}"


class ZernioUnit(unittest.TestCase):
    def setUp(self):
        os.environ["ZERNIO_API_KEY"] = "zk"
        self.tmp = Path(tempfile.mkdtemp())
        self.f = self.tmp / "c.mp4"
        self.f.write_bytes(b"\1" * 4096)

    def tearDown(self):
        os.environ.pop("ZERNIO_API_KEY", None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_tiktok_public_post_flow(self):
        api = FakeZernio()
        res = zernio.upload(self.f, "tiktok", "alphafutures", "#ad caption", True, "public", True, http=api,
                            sleep=lambda s: None)
        put = next(c for c in api.calls if c["method"] == "PUT")
        self.assertEqual(put["size"], 4096)
        self.assertNotIn("Authorization", put["headers"])  # presigned storage gets no auth header
        post = next(c for c in api.calls if c["url"].endswith("/posts"))
        b = post["body"]
        self.assertEqual(post["headers"]["Authorization"], "Bearer zk")
        self.assertTrue(b["publishNow"])
        self.assertEqual(b["platforms"][0], {"platform": "tiktok", "accountId": "tt1",
                                             "platformSpecificData": {"tiktokSettings": b["tiktokSettings"]}})
        self.assertEqual(b["mediaItems"], [{"type": "video", "url": "https://cdn.example/clip.mp4"}])
        t = b["tiktokSettings"]
        self.assertEqual(t["privacy_level"], "PUBLIC_TO_EVERYONE")
        self.assertTrue(t["express_consent_given"] and t["content_preview_confirmed"])
        self.assertEqual(t["commercialContentType"], "brand_content")   # paid campaign post = paid partnership
        self.assertEqual(b["content"], "#ad caption")
        self.assertEqual((res["state"], res["url"]), ("live", "https://www.tiktok.com/p/1"))

    def test_consent_required_for_tiktok(self):
        with self.assertRaises(zernio.ZernioError) as cm:
            zernio.upload(self.f, "tiktok", "a", "c", consent=False, http=FakeZernio())
        self.assertIn("consent", str(cm.exception))

    def test_instagram_no_tiktok_settings_and_late_link(self):
        api = FakeZernio(post_status="publishing", url=False)
        res = zernio.upload(self.f, "instagram", "default", "cap", http=api, sleep=lambda s: None)
        body = next(c for c in api.calls if c["url"].endswith("/posts"))["body"]
        self.assertNotIn("tiktokSettings", body)
        self.assertEqual(body["platforms"][0]["accountId"], "ig1")
        self.assertEqual(res["state"], "processing")
        self.assertEqual(zernio.post_url(res["publish_id"], "instagram", http=api)["url"],
                         "https://www.instagram.com/reel/late/")

    def test_failed_platform_and_retry(self):
        with self.assertRaises(zernio.ZernioError) as cm:
            zernio.upload(self.f, "tiktok", "a", "c", consent=True, http=FakeZernio(post_status="failed"),
                          sleep=lambda s: None)
        self.assertIn("video too short", str(cm.exception))
        api = FakeZernio(fail_posts=2)
        self.assertEqual(zernio.upload(self.f, "tiktok", "a", "c", consent=True, http=api, sleep=lambda s: None)["state"],
                         "live")

    def test_account_matching(self):
        accts = ACCOUNTS["accounts"] + [{"_id": "tt2", "platform": "tiktok", "username": "personal"}]
        self.assertEqual(zernio.pick_account(accts, "tiktok", "alphafutures")["_id"], "tt1")
        self.assertEqual(zernio.pick_account(accts, "tiktok", "personal")["_id"], "tt2")
        with self.assertRaises(zernio.ZernioError):
            zernio.pick_account(accts, "tiktok", "nobody")
        with self.assertRaises(zernio.ZernioError) as cm:
            zernio.pick_account(accts, "youtube", "x")
        self.assertIn("no youtube account", str(cm.exception))

    def test_bad_key_message(self):
        def api(method, url, data, headers, timeout=900):
            return 401, b'{"error": "invalid key"}'
        with self.assertRaises(zernio.ZernioError) as cm:
            zernio.list_accounts(http=api)
        self.assertIn("API key", str(cm.exception))


class AutopilotFreeRoute(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-free-"))
        d = cls.tmp / "campaigns"
        (d / "footage" / "b").mkdir(parents=True)
        v = d / "footage" / "b" / "ep.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=45",
                        "-f", "lavfi", "-i", "sine=frequency=200:duration=45", "-c:v", "libx264", "-preset", "ultrafast",
                        "-c:a", "aac", "-shortest", str(v)], check=True)
        make_srt(cls.tmp / "ep.srt", 45)
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c["automation_allowed"] = True
        c.update(name="Free", platforms=["tiktok", "instagram"], sources=[], accounts={"tiktok": "alphafutures",
                                                                                      "instagram": "alphafutures"})
        c["permission"].update(campaign_url="https://contentrewards.com/f", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=["file:footage/b"])
        c["clip"].update(count=1, min=10, max=25)
        c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
        cls.camp = d / "f.json"
        cls.camp.write_text(json.dumps(c))
        cls.home = str(cls.tmp / "ws")
        rc, out = run_cli("--home", cls.home, "import", str(cls.camp), str(v), "--transcript", str(cls.tmp / "ep.srt"))
        assert rc == 0, out
        cls.ws = pl.WS(cls.home)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_free_cycle_posts_without_taps(self):
        os.environ["ZERNIO_API_KEY"] = "zk"
        api = FakeZernio()
        orig_http, orig_stats = zernio._http, tracker.fetch_stats
        zernio._http = api
        tracker.fetch_stats = lambda url: (1800, 60)
        try:
            rc, out = run_cli("--home", self.home, "autopilot", "enable", "--via", "free", "--platforms", "tiktok,instagram")
            self.assertEqual(rc, 0, out)
            run_cli("--home", self.home, "autopilot", "add", str(self.camp))
            # without consent, TikTok must not post; Instagram still does
            self.ws.set_setting("zernio.tiktok_consent", False)
            buf = io.StringIO()
            with redirect_stdout(buf):
                pl.autopilot_cycle(self.ws, argparse.Namespace(preset="ultrafast", limit=None, cookies_from_browser=None))
            rows = {r["platform"]: r for r in self.ws.q("SELECT * FROM uploads")}
            self.assertEqual(set(rows), {"instagram"}, buf.getvalue())
            self.assertIn("consent", (Path(self.home) / "AUTOPILOT_REPORT.md").read_text())
            # with consent, the next cycle posts to TikTok too
            self.ws.set_setting("zernio.tiktok_consent", True)
            with redirect_stdout(io.StringIO()):
                pl.autopilot_cycle(self.ws, argparse.Namespace(preset="ultrafast", limit=None, cookies_from_browser=None))
            rows = {r["platform"]: r for r in self.ws.q("SELECT * FROM uploads")}
            self.assertEqual(set(rows), {"instagram", "tiktok"})
            self.assertTrue(rows["tiktok"]["url"].startswith("https://www.tiktok.com/"))
            self.assertEqual(rows["tiktok"]["views"], 1800)
            self.assertEqual(rows["tiktok"]["account"], "alphafutures")
            report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
            self.assertNotIn("Finish in the TikTok app", report)
        finally:
            zernio._http, tracker.fetch_stats = orig_http, orig_stats
            os.environ.pop("ZERNIO_API_KEY", None)


if __name__ == "__main__":
    unittest.main(verbosity=2)
