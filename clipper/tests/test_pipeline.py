"""
End-to-end and failure-path tests for the clipping pipeline. Uses synthetic video (ffmpeg testsrc) and a
synthetic transcript, so it runs offline. About 3-4 minutes, mostly video rendering.

  python -m unittest discover -s clipper/tests -v
"""

import datetime as dt
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import urllib.request
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import campaign as cmp  # noqa: E402
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402

LINES = [
    "Most people will never get rich because they trade time for money.",
    "Here's the truth about building a business that lasts.",
    "I went from zero to forty thousand dollars a month in revenue in eight months.",
    "The biggest mistake broke people make is buying liabilities.",
    "Nobody tells you that sales is the highest income skill.",
    "This strategy has guaranteed returns every single month.",
    "Real estate gave me passive cashflow, but it took ten years.",
    "Why do rich people keep buying assets in a recession?",
    "Because cash loses value to inflation every year.",
    "Let me tell you the secret to scaling an agency.",
    "You need one offer, one avatar, and one channel.",
    "Discipline beats motivation when nobody is watching.",
]


def run_cli(*argv) -> tuple[int, str]:
    buf = io.StringIO()
    with redirect_stdout(buf):
        try:
            rc = pl.main(list(argv))
        except SystemExit as e:
            rc = e.code if isinstance(e.code, int) else 1
            print(e)
    return rc, buf.getvalue()


def make_srt(path: Path, seconds: float) -> None:
    out, t, n = [], 1.0, 1
    while True:
        ln = LINES[(n - 1) % len(LINES)]
        d = len(ln.split()) / 3.0
        if t + d > seconds - 1:
            break
        a, b = t, t + d
        out.append(f"{n}\n{cl.hms(a)},{int(a % 1 * 1000):03d} --> {cl.hms(b)},{int(b % 1 * 1000):03d}\n{ln}\n")
        n += 1
        t = b + (1.2 if n % 3 == 0 else 0.3)
    path.write_text("\n".join(out))


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-test-"))
        cls.footage = cls.tmp / "footage"
        cls.footage.mkdir()
        cls.video = cls.footage / "ep1.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=75",
                        "-f", "lavfi", "-i", "sine=frequency=200:duration=75", "-c:v", "libx264", "-preset", "ultrafast",
                        "-c:a", "aac", "-shortest", str(cls.video)], check=True)
        cls.srt = cls.footage / "ep1.srt"
        make_srt(cls.srt, 75)
        # Same speech, different bytes: a re-encode simulates a re-upload of the same episode.
        cls.reupload = cls.footage / "ep1_reupload.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-i", str(cls.video), "-c:v", "libx264", "-crf", "30",
                        "-preset", "ultrafast", "-c:a", "copy", str(cls.reupload)], check=True)
        cls.camp = cls.tmp / "camp.json"
        cls.write_campaign(cls.camp)
        cls.home = str(cls.tmp / "ws")
        rc, out = run_cli("--home", cls.home, "import", str(cls.camp), str(cls.video), "--transcript", str(cls.srt))
        assert rc == 0, out
        rc, cls.run_out = run_cli("--home", cls.home, "run", "--preset", "ultrafast")
        assert rc == 0, cls.run_out
        cls.ws = pl.WS(cls.home)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    @classmethod
    def write_campaign(cls, path: Path, **over):
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c["name"] = "Test Campaign"
        c["permission"].update(campaign_url="https://example.com/c", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=[f"file:{cls.footage}"])
        c["sources"] = []
        c["clip"].update(count=2, min=15, max=35)
        c["caption"]["required_hashtags"] = ["#test"]
        c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
        for k, v in over.items():
            c[k] = v
        path.write_text(json.dumps(c))
        return c

    # ---- main workflow

    def test_01_clips_rendered_and_queued_for_review(self):
        rows = self.ws.q("SELECT * FROM clips WHERE source_id=1")
        self.assertGreaterEqual(len(rows), 1, self.run_out)
        for r in rows:
            self.assertEqual(r["status"], "pending_review")
            info = cl.probe(Path(r["file"]))
            self.assertEqual((info.width, info.height), (1080, 1920))
            self.assertGreater(info.duration, 10)
            self.assertTrue(all(ch["ok"] for ch in json.loads(r["checks"])), r["checks"])

    def test_02_captions_match_transcript_words(self):
        r = self.ws.q("SELECT words, text FROM clips WHERE source_id=1 LIMIT 1")[0]
        words = [w["w"] for w in json.loads(r["words"])]
        srt_text = " ".join(LINES)
        for w in words:
            self.assertIn(w.strip(".,?!"), srt_text)

    def test_03_banned_claim_never_selected(self):
        for r in self.ws.q("SELECT text FROM clips"):
            self.assertNotIn("guaranteed returns", r["text"].lower())

    def test_04_income_claim_flagged(self):
        flagged = [r for r in self.ws.q("SELECT text, flags FROM clips") if "dollars a month" in r["text"]]
        for r in flagged:
            self.assertIn("earnings or results claim", r["flags"])

    def test_05_disclosure_in_every_caption(self):
        for r in self.ws.q("SELECT posts FROM clips"):
            for post in json.loads(r["posts"]).values():
                body = post.get("caption") or post.get("title")
                self.assertTrue(body.startswith("#ad"), body)

    # ---- permission gate

    def test_10_campaign_without_permission_refused(self):
        p = self.tmp / "noperm.json"
        c = json.loads(self.camp.read_text())
        c.pop("permission")
        p.write_text(json.dumps(c))
        rc, out = run_cli("--home", self.home, "import", str(p), str(self.video))
        self.assertEqual(rc, 1)
        self.assertIn("no 'permission' block", out)

    def test_11_stale_permission_refused(self):
        p = self.tmp / "stale.json"
        c = json.loads(self.camp.read_text())
        c["permission"]["verified_on"] = (dt.date.today() - dt.timedelta(days=45)).isoformat()
        p.write_text(json.dumps(c))
        rc, out = run_cli("--home", self.home, "import", str(p), str(self.video))
        self.assertEqual(rc, 1)
        self.assertIn("re-check the campaign is still active", out)

    def test_12_source_outside_allowed_list_blocked(self):
        other = self.tmp / "other.mp4"
        shutil.copy(self.video, other)
        rc, out = run_cli("--home", self.home, "import", str(self.camp), str(other))
        r = self.ws.q("SELECT status, last_error FROM sources WHERE input=?", (str(other.resolve()),))[0]
        self.assertEqual(r["status"], "blocked")
        self.assertIn("allowed_sources", r["last_error"])

    def test_13_url_permission_matching(self):
        c = {"permission": {"allowed_sources": ["youtube.com/@moneyguy"]}}
        self.assertTrue(cmp.source_allowed(c, "https://www.youtube.com/@moneyguy/videos")[0])
        self.assertFalse(cmp.source_allowed(c, "https://www.youtube.com/@someoneelse")[0])
        meta = {"channel_url": "https://www.youtube.com/channel/UC123", "uploader_id": "@moneyguy"}
        self.assertTrue(cmp.source_allowed(c, "https://youtu.be/abc", meta)[0])
        self.assertFalse(cmp.source_allowed(c, "https://youtu.be/abc", {"uploader_id": "@other"})[0])

    # ---- duplicates

    def test_20_same_file_is_duplicate(self):
        rc, out = run_cli("--home", self.home, "import", str(self.camp), str(self.video))
        self.assertIn("duplicate", out)

    def test_21_reupload_yields_no_duplicate_clips(self):
        before = len(self.ws.q("SELECT id FROM clips"))
        rc, out = run_cli("--home", self.home, "import", str(self.camp), str(self.reupload), "--transcript", str(self.srt))
        self.assertEqual(rc, 0, out)
        rc, out = run_cli("--home", self.home, "run", "--preset", "ultrafast")
        st = self.ws.q("SELECT status, last_error FROM sources WHERE input=?", (str(self.reupload.resolve()),))[0]
        self.assertEqual(st["status"], "done", st["last_error"])
        ev = " ".join(r["message"] for r in self.ws.q("SELECT message FROM events"))
        self.assertTrue("duplicate clips already made" in ev or "no new moments" in ev, ev[-500:])
        new = self.ws.q("SELECT text FROM clips WHERE id > ?", (before,))
        old = [pl.shingles(r["text"]) for r in self.ws.q("SELECT text FROM clips WHERE id <= ?", (before,))]
        for r in new:  # anything new must be different speech, not a repeat
            self.assertTrue(all(pl.jaccard(pl.shingles(r["text"]), o) <= 0.5 for o in old))

    # ---- review, approval, posting

    def test_30_approval_required_before_posting(self):
        cid = self.ws.q("SELECT id FROM clips WHERE status='pending_review' ORDER BY id LIMIT 1")[0]["id"]
        rc, out = run_cli("--home", self.home, "posted", str(cid), "https://youtube.com/shorts/x1")
        self.assertEqual(rc, 1)
        self.assertIn("only approved clips", out)
        rc, out = run_cli("--home", self.home, "approve", str(cid))
        self.assertEqual(rc, 0, out)
        ready = Path(self.ws.q("SELECT ready_file FROM clips WHERE id=?", (cid,))[0]["ready_file"])
        self.assertTrue(ready.exists())
        self.assertTrue(ready.with_suffix(".youtube.txt").exists())
        rc, out = run_cli("--home", self.home, "posted", str(cid), "https://youtube.com/shorts/x1", "--views", "1000")
        self.assertEqual(rc, 0, out)
        rc, out = run_cli("--home", self.home, "posted", str(cid), "https://youtube.com/shorts/x1")
        self.assertEqual(rc, 1)  # no longer 'approved'
        earnings = json.loads((Path(self.home) / "earnings.json").read_text())
        self.assertEqual(earnings["posts"][0]["url"], "https://youtube.com/shorts/x1")

    def test_31_failing_rule_blocks_approval_without_override(self):
        cid = self.ws.q("SELECT id FROM clips WHERE status='pending_review' ORDER BY id DESC LIMIT 1")
        if not cid:
            self.skipTest("no pending clip left")
        cid = cid[0]["id"]
        checks = [{"ok": False, "check": "caption includes #needed"}]
        self.ws.x("UPDATE clips SET checks=? WHERE id=?", (json.dumps(checks), cid))
        ok, msg = pl.approve_clip(self.ws, cid)
        self.assertFalse(ok)
        self.assertIn("campaign rules not met", msg)
        ok, msg = pl.approve_clip(self.ws, cid, "", override=True)
        self.assertFalse(ok)  # override needs a note
        ok, _ = pl.reject_clip(self.ws, cid, "test")
        self.assertTrue(ok)

    def test_32_caption_fix_rerenders(self):
        rows = self.ws.q("SELECT id, words, file FROM clips WHERE status IN ('pending_review','rejected') LIMIT 1")
        if not rows:
            self.skipTest("no fixable clip")
        r = rows[0]
        first = json.loads(r["words"])[0]["w"].strip(".,?!")
        mtime = Path(r["file"]).stat().st_mtime
        ok, msg = pl.fix_clip(self.ws, r["id"], [f"{first} => FIXEDWORD"],
                              type("A", (), {"preset": "ultrafast", "model": None, "cookies_from_browser": None})())
        self.assertTrue(ok, msg)
        r2 = self.ws.q("SELECT words, file FROM clips WHERE id=?", (r["id"],))[0]
        self.assertTrue(json.loads(r2["words"])[0]["w"].startswith("FIXEDWORD"))
        self.assertGreater(Path(r2["file"]).stat().st_mtime, mtime)
        ok, msg = pl.fix_clip(self.ws, r["id"], ["zzzz => y"])
        self.assertFalse(ok)

    def test_33_review_page_security_and_actions(self):
        srv, token, port = pl.serve_review(self.ws, None, 0, block=False)
        try:
            base = f"http://127.0.0.1:{port}"
            html_ = urllib.request.urlopen(base + "/?status=approved").read().decode()
            self.assertIn("Clip review", html_)
            cid = self.ws.q("SELECT id FROM clips WHERE file IS NOT NULL LIMIT 1")[0]["id"]
            req = urllib.request.Request(f"{base}/media/{cid}", headers={"Range": "bytes=0-99"})
            resp = urllib.request.urlopen(req)
            self.assertEqual(resp.status, 206)
            self.assertEqual(len(resp.read()), 100)
            # POST without the page token is refused
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(urllib.request.Request(base + "/approve", data=f"id={cid}".encode()))
            self.assertEqual(cm.exception.code, 403)
            # wrong Host header (DNS-rebinding style) is refused
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(urllib.request.Request(base + "/", headers={"Host": "evil.example:80"}))
            self.assertEqual(cm.exception.code, 403)
            # media for ids that don't exist
            with self.assertRaises(urllib.error.HTTPError):
                urllib.request.urlopen(base + "/media/99999")
        finally:
            srv.shutdown()

    # ---- failures, retries, locking

    def test_40_corrupt_file_fails_with_clear_message(self):
        bad = self.footage / "corrupt.mp4"
        bad.write_bytes(b"not a video" * 100)
        rc, out = run_cli("--home", self.home, "import", str(self.camp), str(bad))
        rc, out = run_cli("--home", self.home, "run")
        r = self.ws.q("SELECT id, status, last_error FROM sources WHERE input=?", (str(bad.resolve()),))[0]
        self.assertEqual(r["status"], "failed")
        self.assertIn("corrupt", r["last_error"])
        rc, out = run_cli("--home", self.home, "retry", str(r["id"]))
        self.assertEqual(self.ws.q("SELECT status FROM sources WHERE id=?", (r["id"],))[0]["status"], "queued")
        self.ws.set_source(r["id"], status="failed")

    def test_41_error_classification(self):
        cases = {
            "ERROR: [youtube] x: Private video. Sign in": "permanent",
            "HTTP Error 429: Too Many Requests": "temporary",
            "Unable to download webpage: <urlopen error timed out>": "temporary",
            "Sign in to confirm you're not a bot": "permanent",
            "[Errno 28] No space left on device": "permanent",
        }
        for msg, kind in cases.items():
            self.assertEqual(pl.classify(RuntimeError(msg))[0], kind, msg)
        self.assertEqual(pl.classify(pl.Blocked("x"))[0], "blocked")

    def test_42_temporary_failure_schedules_retry(self):
        sid = self.ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, status, attempts, created, updated)"
                        " VALUES(?,?,?,?,?,?,?,?)", ("Test Campaign", str(self.camp), "https://example.com/v",
                                                     "url:test-retry", "queued", 0, pl.now(), pl.now()))
        orig = pl.process_source
        pl.process_source = lambda ws, row, a: (_ for _ in ()).throw(RuntimeError("Connection reset by peer"))
        try:
            run_cli("--home", self.home, "run", "--limit", "1")
        finally:
            pl.process_source = orig
        r = self.ws.q("SELECT status, next_attempt_at, last_error FROM sources WHERE id=?", (sid,))[0]
        self.assertEqual(r["status"], "retry_wait")
        self.assertIn("Network problem", r["last_error"])
        self.assertIsNotNone(r["next_attempt_at"])
        self.ws.set_source(sid, status="failed")

    def test_43_concurrent_run_refused(self):
        lock = Path(self.home) / ".run.lock"
        sleeper = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
        try:
            lock.write_text(str(sleeper.pid))
            rc, out = run_cli("--home", self.home, "run")
            self.assertNotEqual(rc, 0)
            self.assertIn("Another run is in progress", out)
        finally:
            sleeper.kill()
            sleeper.wait()
            lock.unlink(missing_ok=True)
        lock.write_text("999999")  # dead pid: stale lock is ignored
        rc, out = run_cli("--home", self.home, "run")
        self.assertEqual(rc, 0, out)

    # ---- spending & secrets

    def test_50_no_spend_without_budget(self):
        g = pl.LedgerGuard(self.ws)
        self.ws.set_setting("spend.monthly_cap_usd", 0)
        ok, why = g.allow(0.01)
        self.assertFalse(ok)
        self.assertIn("no monthly budget approved", why)

    def test_51_budget_caps(self):
        g = pl.LedgerGuard(self.ws)
        run_cli("--home", self.home, "budget", "--monthly", "1", "--per-call", "0.20")
        self.assertTrue(g.allow(0.10)[0])
        self.assertFalse(g.allow(0.30)[0])  # above per-call cap
        g.record("claude-opus-5-5", 0.95, 1000, 1000, "test")
        ok, why = g.allow(0.10)
        self.assertFalse(ok)
        self.assertIn("monthly AI budget reached", why)
        run_cli("--home", self.home, "budget", "--off")
        self.assertFalse(g.allow(0.01)[0])

    def test_52_ai_rerank_never_calls_api_without_budget(self):
        args = cl.build_parser().parse_args([])
        cands = [cl.Clip(0, 20, [cl.Word("hello", 0, 1)], 50)]
        called = []

        class FakeGuard:
            def allow(self, worst):
                called.append(worst)
                return False, "no budget"
        out = cl.ai_rerank(cands, {}, args, guard=FakeGuard())
        self.assertIs(out, cands)
        self.assertEqual(len(called), 1)
        self.assertLess(called[0], 0.25)  # worst case for one call at default model and limits

    def test_53_cost_math_and_unknown_model(self):
        self.assertAlmostEqual(cl.call_cost("claude-opus-5-5", 1_000_000, 0), 4.0)
        self.assertAlmostEqual(cl.call_cost("claude-opus-5-5", 0, 1_000_000), 20.0)
        args = cl.build_parser().parse_args(["--ai-model", "some-unknown-model", "--ai-max-usd", "5"])
        cands = [cl.Clip(0, 20, [cl.Word("hi", 0, 1)], 50)]
        self.assertIs(cl.ai_rerank(cands, {}, args), cands)

    def test_54_secrets_redacted(self):
        s = "failed with key sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ and api_key=hunter2"
        r = cl.redact(s)
        self.assertNotIn("KLMNOP", r)
        self.assertNotIn("hunter2", r)
        self.ws.event(s)
        last = self.ws.q("SELECT message FROM events ORDER BY id DESC LIMIT 1")[0]["message"]
        self.assertNotIn("hunter2", last)

    def test_55_no_secrets_in_workspace(self):
        os.environ["ANTHROPIC_API_KEY"] = "sk-ant-test-SECRETVALUE123456"
        try:
            run_cli("--home", self.home, "status")
            for f in Path(self.home).rglob("*"):
                if f.is_file() and f.suffix in (".db", ".json", ".txt", ".log"):
                    self.assertNotIn(b"SECRETVALUE123456", f.read_bytes(), f)
        finally:
            os.environ.pop("ANTHROPIC_API_KEY")


if __name__ == "__main__":
    unittest.main(verbosity=2)
