"""
Autopilot tests: policy, full cycle with a fake YouTube uploader, daily cap, stale campaigns, scheduling,
and the real youtube.upload() against a simulated API (retries, quota, privacy lock, paid-promotion fallback).

  python -m unittest discover -s clipper/tests -v
"""

import datetime as dt
import io
import json
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
import youtube  # noqa: E402
from test_pipeline import make_srt, run_cli  # noqa: E402


class FakeUploader:
    def __init__(self):
        self.calls = []

    def upload(self, path, title, description, tags, privacy, paid):
        assert Path(path).exists()
        self.calls.append({"path": path, "title": title, "description": description, "privacy": privacy, "paid": paid})
        vid = f"vid{len(self.calls)}"
        return {"id": vid, "url": f"https://www.youtube.com/shorts/{vid}", "privacy": privacy, "notes": []}

    def stats(self, ids):
        return {i: {"views": 1234, "likes": 56, "privacy": "public"} for i in ids}


class AutopilotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-auto-"))
        cls.footage = cls.tmp / "footage"
        cls.footage.mkdir()
        cls.video = cls.footage / "ep.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i",
                        "testsrc2=size=1280x720:rate=30:duration=75", "-f", "lavfi", "-i", "sine=frequency=200:duration=75",
                        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", str(cls.video)], check=True)
        cls.srt = cls.footage / "ep.srt"
        make_srt(cls.srt, 75)
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c["automation_allowed"] = True
        c["name"] = "Auto Campaign"
        c["permission"].update(campaign_url="https://whop.com/example-campaign", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=[f"file:{cls.footage}"])
        c["sources"], c["platforms"] = [], ["youtube"]
        c["clip"].update(count=3, min=15, max=30)
        c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
        cls.camp = cls.tmp / "camp.json"
        cls.camp.write_text(json.dumps(c))
        cls.home = str(cls.tmp / "ws")
        rc, out = run_cli("--home", cls.home, "import", str(cls.camp), str(cls.video), "--transcript", str(cls.srt))
        assert rc == 0, out
        cls.ws = pl.WS(cls.home)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def cycle(self, uploader):
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None,
                                                            "cookies_from_browser": None})(), uploader=uploader)
        return rc, buf.getvalue()

    def test_01_off_by_default(self):
        rc, out = self.cycle(FakeUploader())
        self.assertEqual(rc, 1)
        self.assertIn("Autopilot is off", out)

    def test_02_full_cycle_with_daily_cap(self):
        run_cli("--home", self.home, "autopilot", "enable", "--max-per-day", "1")
        rc, out = run_cli("--home", self.home, "autopilot", "add", str(self.camp))
        self.assertEqual(rc, 0, out)
        up = FakeUploader()
        rc, out = self.cycle(up)
        self.assertEqual(rc, 0, out)
        clips = self.ws.q("SELECT * FROM clips")
        self.assertGreaterEqual(len(clips), 2, out)
        self.assertEqual(len(up.calls), 1, "daily cap of 1 must hold")
        call = up.calls[0]
        self.assertTrue(call["paid"], "campaign has a disclosure -> paid promotion flag")
        self.assertTrue(call["title"].startswith("#ad"))
        self.assertIn("#shorts", call["title"])
        posted = self.ws.q("SELECT * FROM clips WHERE status='posted'")
        self.assertEqual(len(posted), 1)
        self.assertEqual(posted[0]["post_url"], "https://www.youtube.com/shorts/vid1")
        report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
        self.assertIn("Submit on the campaign page", report)
        self.assertIn("https://www.youtube.com/shorts/vid1", report)
        self.assertIn("https://whop.com/example-campaign", report)
        earn = json.loads((Path(self.home) / "earnings.json").read_text())
        self.assertEqual(earn["posts"][0]["views"], 1234, "views refreshed from the uploader's stats")
        # second cycle the same day: cap reached, nothing new uploaded
        rc, out = self.cycle(up)
        self.assertEqual(len(up.calls), 1)
        self.assertIn("daily upload cap", (Path(self.home) / "AUTOPILOT_REPORT.md").read_text())
        rc, out = run_cli("--home", self.home, "submitted", "all")
        self.assertIn("1 post(s) marked submitted", out)
        self.assertNotIn("Submit on the campaign page", (self.cycle(up), (Path(self.home) / "AUTOPILOT_REPORT.md").read_text())[1])

    def test_03_policy_holds(self):
        pol = {"min_score": 55, "hold_on": pl.HOLD_DEFAULT, "hold_income_claims": False}

        def row(checks=(), flags=(), score=80):
            return {"checks": json.dumps(list(checks)), "flags": json.dumps(list(flags)), "score": score}
        self.assertIsNone(pl.hold_reason(row(), pol))
        self.assertIn("rule failing", pl.hold_reason(row(checks=[{"ok": False, "check": "x"}]), pol))
        self.assertIn("below autopilot minimum", pl.hold_reason(row(score=40), pol))
        unsure = {"level": "warn", "msg": "3 word(s) the recognizer was unsure of: a, b"}
        self.assertIsNotNone(pl.hold_reason(row(flags=[unsure]), pol))
        income = {"level": "warn", "msg": "contains an earnings or results claim. Keep it attributed"}
        self.assertIsNone(pl.hold_reason(row(flags=[income]), pol))
        self.assertIsNotNone(pl.hold_reason(row(flags=[income]), {**pol, "hold_income_claims": True}))
        self.assertIsNone(pl.hold_reason(row(flags=[{"level": "info", "msg": "start extended"}]), pol))

    def test_04_stale_campaign_skipped(self):
        stale = self.tmp / "stale.json"
        c = json.loads(self.camp.read_text())
        c["permission"]["verified_on"] = (dt.date.today() - dt.timedelta(days=60)).isoformat()
        stale.write_text(json.dumps(c))
        self.ws.set_setting("autopilot.campaigns", [str(stale)])
        self.ws.set_setting("autopilot.enabled", True)
        self.cycle(FakeUploader())
        report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
        self.assertIn("Campaigns skipped", report)
        self.assertIn("re-check the campaign is still active", report)
        self.ws.set_setting("autopilot.campaigns", [str(self.camp.resolve())])

    def test_05_schedule_line(self):
        rc, out = run_cli("--home", self.home, "schedule", "print", "--every-hours", "4")
        self.assertEqual(rc, 0)
        self.assertIn("autopilot run", out)
        if sys.platform not in ("win32", "darwin"):
            self.assertIn("*/4 * * *", out)
            self.assertIn(pl.SCHED_MARK, out)


# ---------------------------------------------------------------- simulated YouTube API

class _Resp(dict):
    def __init__(self, status):
        super().__init__(status=str(status))
        self.status = status
        self.reason = "x"


def http_error(status, body=b"{}"):
    from googleapiclient.errors import HttpError
    return HttpError(_Resp(status), body)


class FakeReq:
    def __init__(self, script):
        self.script = script

    def next_chunk(self):
        step = self.script.pop(0)
        if isinstance(step, Exception):
            raise step
        return None, step


class FakeYT:
    def __init__(self, scripts):
        self.scripts, self.inserts = scripts, []

    def videos(self):
        return self

    def insert(self, part, body, media_body):
        self.inserts.append((part, json.loads(json.dumps(body))))
        return FakeReq(self.scripts.pop(0))


class YouTubeUploadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.f = cls.tmp / "c.mp4"
        cls.f.write_bytes(b"\0" * 2048)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_retry_then_success(self):
        yt = FakeYT([[http_error(503), ConnectionError("reset"), {"id": "abc", "status": {"privacyStatus": "public"}}]])
        res = youtube.upload(yt, self.f, "t", "d", ["#money"], "public", False, sleep=lambda s: None)
        self.assertEqual(res["url"], "https://www.youtube.com/shorts/abc")
        self.assertEqual(res["notes"], [])
        part, body = yt.inserts[0]
        self.assertEqual(body["snippet"]["tags"], ["money"])
        self.assertFalse(body["status"]["selfDeclaredMadeForKids"])

    def test_private_lock_is_reported(self):
        yt = FakeYT([[{"id": "p1", "status": {"privacyStatus": "private"}}]])
        res = youtube.upload(yt, self.f, "t", "d", [], "public", False, sleep=lambda s: None)
        self.assertEqual(res["privacy"], "private")
        self.assertIn("audit", res["notes"][0])

    def test_paid_flag_fallback(self):
        err = http_error(400, b'{"error": {"message": "paidProductPlacementDetails not writable"}}')
        yt = FakeYT([[err], [{"id": "q", "status": {"privacyStatus": "public"}}]])
        res = youtube.upload(yt, self.f, "t", "d", [], "public", True, sleep=lambda s: None)
        self.assertIn("paidProductPlacementDetails", yt.inserts[0][0])
        self.assertNotIn("paidProductPlacementDetails", yt.inserts[1][0])
        self.assertFalse(res["paid_flag_set"])
        self.assertIn("paid promotion", res["notes"][0])

    def test_quota_error_message(self):
        yt = FakeYT([[http_error(403, b'{"error": {"errors": [{"reason": "quotaExceeded"}]}}')]])
        with self.assertRaises(youtube.YouTubeError) as cm:
            youtube.upload(yt, self.f, "t", "d", [], "public", False, sleep=lambda s: None)
        self.assertIn("quota", str(cm.exception).lower())

    def test_gives_up_after_retries(self):
        yt = FakeYT([[http_error(503)] * 10])
        from googleapiclient.errors import HttpError
        with self.assertRaises(HttpError):
            youtube.upload(yt, self.f, "t", "d", [], "public", False, sleep=lambda s: None)

    def test_no_token_means_clear_error(self):
        orig = youtube._keyring
        youtube._keyring = lambda: None
        try:
            self.assertFalse(youtube.has_token())
            with self.assertRaises(youtube.YouTubeError) as cm:
                youtube.service()
            self.assertIn("youtube auth", str(cm.exception))
        finally:
            youtube._keyring = orig


if __name__ == "__main__":
    unittest.main(verbosity=2)
