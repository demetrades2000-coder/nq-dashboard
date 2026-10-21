"""Upload-Post (fully automatic posting) against a simulated API, plus an end-to-end autopilot cycle."""

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
import uploadpost as up  # noqa: E402
from test_pipeline import make_srt, run_cli  # noqa: E402


def fields_of(data: bytes) -> dict:
    out = {}
    for part in data.split(b"--")[1:]:
        if b'name="' not in part:
            continue
        name = part.split(b'name="', 1)[1].split(b'"', 1)[0].decode()
        if b"filename=" in part:
            out[name] = "<file>"
            continue
        out.setdefault(name, part.split(b"\r\n\r\n", 1)[1].rsplit(b"\r\n", 1)[0].decode())
    return out


class FakeAPI:
    def __init__(self, responses):
        self.responses, self.calls = list(responses), []

    def __call__(self, method, url, data, headers, timeout=900):
        self.calls.append({"method": method, "url": url, "fields": fields_of(data) if data else {}, "headers": headers})
        status, body = self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        return status, json.dumps(body).encode()


class UploadPostUnit(unittest.TestCase):
    def setUp(self):
        os.environ["UPLOAD_POST_API_KEY"] = "test-key"
        self.tmp = Path(tempfile.mkdtemp())
        self.f = self.tmp / "c.mp4"
        self.f.write_bytes(b"\0" * 1000)

    def tearDown(self):
        os.environ.pop("UPLOAD_POST_API_KEY", None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_tiktok_direct_public_with_disclosure(self):
        api = FakeAPI([(200, {"success": True, "results": {"tiktok": {"success": True, "url": "https://www.tiktok.com/@a/video/1"}}})])
        res = up.upload(self.f, "tiktok", "alphafutures", "t", "#ad caption", True, "public", http=api, sleep=lambda s: None)
        f = api.calls[0]["fields"]
        self.assertEqual(api.calls[0]["headers"]["Authorization"], "Apikey test-key")
        self.assertEqual(f["user"], "alphafutures")
        self.assertEqual(f["platform[]"], "tiktok")
        self.assertEqual(f["post_mode"], "DIRECT_POST")
        self.assertEqual(f["privacy_level"], "PUBLIC_TO_EVERYONE")
        self.assertEqual(f["brand_content_toggle"], "true")
        self.assertEqual(f["title"], "#ad caption")
        self.assertEqual(f["video"], "<file>")
        self.assertEqual((res["state"], res["url"]), ("live", "https://www.tiktok.com/@a/video/1"))

    def test_youtube_and_instagram_fields(self):
        api = FakeAPI([(200, {"success": True, "results": {"youtube": {"success": True, "url": "https://youtu.be/x"}}})])
        up.upload(self.f, "youtube", "p", "T" * 150, "desc", False, "public", http=api, sleep=lambda s: None)
        f = api.calls[0]["fields"]
        self.assertEqual(len(f["title"]), 100)
        self.assertEqual(f["description"], "desc")
        api = FakeAPI([(200, {"success": True, "results": {"instagram": {"success": True}}})])
        res = up.upload(self.f, "instagram", "p", "t", "cap", False, "public", http=api, sleep=lambda s: None)
        self.assertEqual(api.calls[0]["fields"]["media_type"], "REELS")
        self.assertEqual(res["state"], "processing")
        self.assertIn("link not returned yet", res["notes"][0])

    def test_retry_and_errors(self):
        api = FakeAPI([(503, {}), (429, {}), (200, {"success": True, "results": {"tiktok": {"url": "u"}}})])
        self.assertEqual(up.upload(self.f, "tiktok", "p", "t", "c", http=api, sleep=lambda s: None)["url"], "u")
        self.assertEqual(len(api.calls), 3)
        with self.assertRaises(up.UploadPostError) as cm:
            up.upload(self.f, "tiktok", "p", "t", "c", http=FakeAPI([(401, {"message": "bad key"})]), sleep=lambda s: None)
        self.assertIn("API key", str(cm.exception))
        with self.assertRaises(up.UploadPostError) as cm:
            up.upload(self.f, "tiktok", "p", "t", "c", http=FakeAPI([(403, {"message": "Plan limit reached"})]),
                      sleep=lambda s: None)
        self.assertIn("plan", str(cm.exception).lower())
        with self.assertRaises(up.UploadPostError):
            up.upload(self.f, "tiktok", "p", "t", "c",
                      http=FakeAPI([(200, {"success": True, "results": {"tiktok": {"success": False, "error": "spam"}}})]),
                      sleep=lambda s: None)

    def test_brand_flag_fallback_and_private_detection(self):
        api = FakeAPI([(400, {"message": "unknown field brand_content_toggle"}),
                       (200, {"success": True, "results": {"tiktok": {"url": "u", "privacy_level": "SELF_ONLY"}}})])
        res = up.upload(self.f, "tiktok", "p", "t", "#ad c", True, "public", http=api, sleep=lambda s: None)
        self.assertNotIn("brand_content_toggle", api.calls[1]["fields"])
        self.assertEqual(res["state"], "private")
        self.assertTrue(any("Paid partnership" in n for n in res["notes"]))

    def test_no_key(self):
        os.environ.pop("UPLOAD_POST_API_KEY")
        orig = up._keyring
        up._keyring = lambda: None
        try:
            with self.assertRaises(up.UploadPostError) as cm:
                up.upload(self.f, "tiktok", "p", "t", "c", http=FakeAPI([(200, {})]))
            self.assertIn("uploadpost auth", str(cm.exception))
        finally:
            up._keyring = orig


class AutopilotViaUploadPost(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-up-"))
        d = cls.tmp / "campaigns"
        (d / "footage" / "b").mkdir(parents=True)
        v = d / "footage" / "b" / "ep.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=45",
                        "-f", "lavfi", "-i", "sine=frequency=200:duration=45", "-c:v", "libx264", "-preset", "ultrafast",
                        "-c:a", "aac", "-shortest", str(v)], check=True)
        make_srt(cls.tmp / "ep.srt", 45)
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c.update(name="B", platforms=["tiktok", "instagram"], sources=[], accounts={"tiktok": "brandprofile",
                                                                                   "instagram": "brandprofile"})
        c["permission"].update(campaign_url="https://contentrewards.com/b", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=["file:footage/b"])
        c["clip"].update(count=1, min=10, max=25)
        c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
        cls.camp = d / "b.json"
        cls.camp.write_text(json.dumps(c))
        cls.home = str(cls.tmp / "ws")
        rc, out = run_cli("--home", cls.home, "import", str(cls.camp), str(v), "--transcript", str(cls.tmp / "ep.srt"))
        assert rc == 0, out
        cls.ws = pl.WS(cls.home)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_native_mode_refuses_instagram(self):
        rc, out = run_cli("--home", self.home, "autopilot", "enable", "--platforms", "tiktok,instagram", "--via", "native")
        self.assertEqual(rc, 1)
        self.assertIn("needs Upload-Post", out)

    def test_full_cycle_posts_everywhere_without_taps(self):
        os.environ["UPLOAD_POST_API_KEY"] = "k"
        api = FakeAPI([(200, {"success": True, "request_id": "r1",
                              "results": {"tiktok": {"success": True, "url": "https://www.tiktok.com/@b/video/9"}}}),
                       (200, {"success": True, "request_id": "r2", "results": {"instagram": {"success": True}}}),
                       (200, {"success": True, "results": {"instagram": {"url": "https://www.instagram.com/reel/abc/"}}})])
        orig_http, orig_stats = up._http, tracker.fetch_stats
        up._http = api
        tracker.fetch_stats = lambda url: (2500, 80)
        try:
            run_cli("--home", self.home, "autopilot", "enable", "--platforms", "tiktok,instagram", "--via", "uploadpost")
            run_cli("--home", self.home, "autopilot", "add", str(self.camp))
            buf = io.StringIO()
            with redirect_stdout(buf):
                pl.autopilot_cycle(self.ws, argparse.Namespace(preset="ultrafast", limit=None, cookies_from_browser=None))
            rows = {r["platform"]: r for r in self.ws.q("SELECT * FROM uploads")}
            self.assertEqual(set(rows), {"tiktok", "instagram"}, buf.getvalue())
            self.assertEqual(rows["tiktok"]["url"], "https://www.tiktok.com/@b/video/9")
            self.assertEqual(rows["tiktok"]["account"], "brandprofile")
            self.assertEqual(rows["tiktok"]["views"], 2500)
            posts = [c for c in api.calls if c["method"] == "POST"]
            self.assertTrue(all(c["fields"]["user"] == "brandprofile" for c in posts))
            self.assertTrue(posts[0]["fields"]["title"].startswith("#ad"))
            # instagram link came back from the status lookup in the same cycle
            self.assertEqual(rows["instagram"]["url"], "https://www.instagram.com/reel/abc/")
            report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
            self.assertNotIn("Finish in the TikTok app", report)  # nothing for the user to tap
            self.assertIn("[tiktok] https://www.tiktok.com/@b/video/9", report)
            rc, out = run_cli("--home", self.home, "link", str(rows["tiktok"]["clip_id"]), "tiktok", "https://www.tiktok.com/@b/video/10")
            self.assertEqual(rc, 0, out)
        finally:
            up._http, tracker.fetch_stats = orig_http, orig_stats
            os.environ.pop("UPLOAD_POST_API_KEY", None)


if __name__ == "__main__":
    unittest.main(verbosity=2)
