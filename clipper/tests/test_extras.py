"""Tests for campaign-file features (TODO gate, relative sources, folders), accounts, logos, notifications, doctor."""

import argparse
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
import campaign as cmp  # noqa: E402
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402
from test_pipeline import make_srt, run_cli  # noqa: E402


class FakeUp:
    def __init__(self):
        self.calls = []

    def upload(self, path, title, description, tags, privacy, paid):
        self.calls.append(description)
        n = len(self.calls)
        return {"id": f"v{n}", "url": f"https://www.youtube.com/shorts/v{n}", "privacy": privacy, "notes": []}

    def stats(self, ids):
        return {i: {"views": 1000, "likes": 5} for i in ids}  # 0.5% engagement


class CampaignFolderLogoAccounts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cl.Tools.setup(False)
        cls.tmp = Path(tempfile.mkdtemp(prefix="clipper-extra-"))
        camp_dir = cls.tmp / "campaigns"
        (camp_dir / "footage" / "brand").mkdir(parents=True)
        (camp_dir / "logos").mkdir()
        v = camp_dir / "footage" / "brand" / "ep.mp4"
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i",
                        "testsrc2=size=1280x720:rate=30:duration=45", "-f", "lavfi", "-i", "sine=frequency=200:duration=45",
                        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", "-shortest", str(v)], check=True)
        make_srt(cls.tmp / "ep.srt", 45)
        subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=400x100",
                        "-frames:v", "1", str(camp_dir / "logos" / "brand.png")], check=True)
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c["automation_allowed"] = True
        c.update(name="Brand", platforms=["youtube", "tiktok"], sources=["footage/brand"], min_engagement=0.02,
                 accounts={"youtube": "brandchannel"})
        c["permission"].update(campaign_url="https://contentrewards.com/x", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=["file:footage/brand"])
        c["clip"].update(count=1, min=10, max=25, layout="fit")
        c["on_screen"].update(logo="logos/brand.png", logo_position="top")
        c["disclosure"] = {"caption": "#ad", "on_screen": "#ad"}
        cls.camp = camp_dir / "brand.json"
        cls.camp.write_text(json.dumps(c))
        cls.home = str(cls.tmp / "ws")
        cls.ws = pl.WS(cls.home)
        # campaign-relative folder source, with a transcript passed via a separate import of the same file
        rc, out = run_cli("--home", cls.home, "import", str(cls.camp), str(v), "--transcript", str(cls.tmp / "ep.srt"))
        assert rc == 0, out

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_01_folder_source_and_relative_permission(self):
        c = cmp.load(str(self.camp))
        ok, _ = cmp.source_allowed(c, str(self.camp.parent / "footage" / "brand" / "ep.mp4"))
        self.assertTrue(ok)
        self.assertFalse(cmp.source_allowed(c, str(self.tmp / "ep.srt"))[0])
        # importing from the campaign (no explicit sources) scans the folder; the file is already queued -> no dup job
        rc, out = run_cli("--home", self.home, "import", str(self.camp))
        self.assertEqual(rc, 0, out)
        self.assertEqual(len(self.ws.q("SELECT id FROM sources")), 1)

    def test_02_logo_rendered_and_checked_accounts_used(self):
        run_cli("--home", self.home, "autopilot", "enable", "--platforms", "youtube")
        run_cli("--home", self.home, "autopilot", "add", str(self.camp))
        up = FakeUp()
        buf = io.StringIO()
        with redirect_stdout(buf):
            pl.autopilot_cycle(self.ws, argparse.Namespace(preset="ultrafast", limit=None, cookies_from_browser=None),
                               uploaders={"youtube": up})
        clip = self.ws.q("SELECT * FROM clips")[0]
        checks = json.loads(clip["checks"])
        self.assertIn({"ok": True, "check": "brand logo on screen for the whole clip"}, checks, buf.getvalue())
        frame = self.tmp / "f.png"
        subprocess.run([cl.Tools.ffmpeg, "-v", "error", "-y", "-ss", "2", "-i", clip["file"], "-frames:v", "1",
                        "-vf", "crop=200:60:440:60", str(frame)], check=True)
        # sample the logo area: it must be red (the test logo), not black bars
        px = subprocess.run([cl.Tools.ffmpeg, "-v", "error", "-i", str(frame), "-vf", "scale=1:1", "-f", "rawvideo",
                             "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        self.assertGreater(px[0], 150)
        self.assertLess(px[1], 80)
        u = self.ws.q("SELECT * FROM uploads")[0]
        self.assertEqual(u["account"], "brandchannel")
        report = (Path(self.home) / "AUTOPILOT_REPORT.md").read_text()
        self.assertIn("under the campaign's 2% minimum", report)

    def test_03_todo_gate(self):
        c = cmp.load(str(self.camp))
        c["caption"]["required_mentions"] = ["TODO: handle"]
        probs = cmp.permission_problems(c)
        self.assertTrue(any("caption.required_mentions[0]" in p for p in probs))

    def test_04_missing_logo_blocks(self):
        c = json.loads(self.camp.read_text())
        c["on_screen"]["logo"] = "logos/missing.png"
        f = self.camp.parent / "nologo.json"
        f.write_text(json.dumps(c))
        with self.assertRaises(pl.Blocked) as cm:
            pl.load_campaign_checked(str(f))
        self.assertIn("logo file not found", str(cm.exception))

    def test_05_notify(self):
        sent = []
        self.ws.set_setting("notify.ntfy_topic", None)
        self.assertFalse(pl.notify(self.ws, "t", "b", http=lambda req, timeout: sent.append(req)))
        self.ws.set_setting("notify.ntfy_topic", "money-clipper-test")
        self.assertTrue(pl.notify(self.ws, "Clips ready", "body", http=lambda req, timeout: sent.append(req)))
        self.assertEqual(sent[0].full_url, "https://ntfy.sh/money-clipper-test")

        def boom(req, timeout):
            raise OSError("offline")
        self.assertFalse(pl.notify(self.ws, "t", "b", http=boom))  # never raises
        self.ws.set_setting("notify.ntfy_topic", None)

    def test_06_doctor_and_setup_without_ready_campaigns(self):
        rc, out = run_cli("--home", self.home, "doctor")
        self.assertIn("Campaigns:", out)
        self.assertIn("Accounts:", out)
        orig = pl.doctor_checks
        pl.doctor_checks = lambda ws, fix=False: [("Python 3.10+", True, ""), ("ffmpeg", True, "")]
        try:
            import builtins
            real_input = builtins.input
            builtins.input = lambda *a: "n"
            rc, out = run_cli("--home", self.home, "setup")
        finally:
            pl.doctor_checks = orig
            builtins.input = real_input
        self.assertIn("Step 2/5", out)
        # the repo's Tradever brief is filled in and verified; the other leads still have TODOs; Alpha bans tools
        # READY when its (gitignored) footage is on this machine, else TODO asking only for the footage
        self.assertRegex(out, r"(READY tradever\.json|TODO  tradever\.json:\n\s+- put the campaign's footage)")
        self.assertIn("TODO  aixfunded.json", out)
        self.assertIn("SKIP  alpha-futures.json", out)


class CampaignSetTests(unittest.TestCase):
    def test_campaign_set_fills_todos(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            f = tmp / "c.json"
            shutil.copy(HERE / "campaigns" / "higgsfield-20vc.json", f)
            home = str(tmp / "ws")
            rc, out = run_cli("--home", home, "campaign-set", str(f), "--verified-today",
                              "--evidence", "Clip the 20VC episode", "--mention", "higgsfield_ai",
                              "--allow-source", "youtube.com/@20VC", "--source", "https://www.youtube.com/watch?v=abc")
            c = json.loads(f.read_text())
            self.assertEqual(c["permission"]["verified_on"], dt.date.today().isoformat())
            self.assertEqual(c["caption"]["required_mentions"], ["@higgsfield_ai"])
            self.assertIn("youtube.com/@20VC", c["permission"]["allowed_sources"])
            self.assertEqual(rc, 0, out)
            self.assertIn("OK: permission recorded", out)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_setup_yes_needs_no_input(self):
        import builtins
        real_input = builtins.input
        builtins.input = lambda *a: (_ for _ in ()).throw(AssertionError("setup --yes must not prompt"))
        orig = pl.doctor_checks
        pl.doctor_checks = lambda ws, fix=False: [("Python 3.10+", True, "")]
        tmp = Path(tempfile.mkdtemp())
        try:
            rc, out = run_cli("--home", str(tmp / "ws"), "setup", "--yes")
            self.assertIn("Step 2/5", out)
        finally:
            builtins.input = real_input
            pl.doctor_checks = orig
            pl.ASSUME_DEFAULTS = False
            shutil.rmtree(tmp, ignore_errors=True)


class GuidedFillTests(unittest.TestCase):
    def test_guided_fill_makes_alpha_futures_ready(self):
        import builtins
        tmp = Path(tempfile.mkdtemp())
        try:
            d = tmp / "campaigns"
            (d / "footage" / "alpha-futures").mkdir(parents=True)
            (d / "logos").mkdir()
            f = d / "alpha-futures.json"
            shutil.copy(HERE / "campaigns" / "alpha-futures.json", f)
            self.assertTrue(pl.campaign_problems(cmp.load(str(f))))
            # the user drops files in with their own names
            subprocess.run([cl.Tools.ffmpeg, "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=300x80",
                            "-frames:v", "1", str(d / "logos" / "AF_logo_official.png")], check=True)
            (d / "footage" / "alpha-futures" / "episode1.mp4").write_bytes(b"\0" * 10)
            raw = json.loads(f.read_text(encoding="utf-8"))
            raw["automation_allowed"] = None  # pretend the rules don't mention tools, so setup asks
            f.write_text(json.dumps(raw), encoding="utf-8")
            answers = iter(["Clip any official Alpha Futures video", "y", "y", "", ""])
            real = builtins.input
            builtins.input = lambda *a: next(answers)
            try:
                with redirect_stdout(io.StringIO()):
                    pl.guided_fill(f)
            finally:
                builtins.input = real
            c = cmp.load(str(f))
            self.assertEqual(pl.campaign_problems(c), [])
            self.assertEqual(c["caption"]["required_mentions"]["tiktok"], ["@alphafutures"])
            self.assertIs(c["automation_allowed"], True)
            self.assertEqual(c["permission"]["verified_on"], dt.date.today().isoformat())
            self.assertTrue((d / "logos" / "alpha-futures.png").exists())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class AutomationGuardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.home = str(self.tmp / "ws")
        c = json.loads((HERE / "campaigns" / "_template.json").read_text())
        c["permission"].update(campaign_url="https://x.example/c", verified_on=dt.date.today().isoformat(),
                               evidence="test", allowed_sources=["file:footage"])
        c["sources"] = []
        self.f = self.tmp / "c.json"
        self.f.write_text(json.dumps(c))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_autopilot_refuses_until_confirmed(self):
        rc, out = run_cli("--home", self.home, "autopilot", "add", str(self.f))
        self.assertEqual(rc, 1)
        self.assertIn("hasn't been confirmed to allow", out)
        run_cli("--home", self.home, "campaign-set", str(self.f), "--automation-allowed", "no")
        rc, out = run_cli("--home", self.home, "autopilot", "add", str(self.f))
        self.assertIn("bans automated", out)
        run_cli("--home", self.home, "campaign-set", str(self.f), "--automation-allowed", "yes")
        rc, out = run_cli("--home", self.home, "autopilot", "add", str(self.f))
        self.assertEqual(rc, 0, out)

    def test_cycle_skips_campaign_that_bans_tools(self):
        run_cli("--home", self.home, "campaign-set", str(self.f), "--automation-allowed", "yes")
        run_cli("--home", self.home, "autopilot", "add", str(self.f))
        run_cli("--home", self.home, "campaign-set", str(self.f), "--automation-allowed", "no")  # rules changed later
        run_cli("--home", self.home, "autopilot", "enable")
        ws = pl.WS(self.home)
        with redirect_stdout(io.StringIO()):
            pl.autopilot_cycle(ws, argparse.Namespace(preset="ultrafast", limit=None, cookies_from_browser=None),
                               uploaders={})
        self.assertIn("don't allow automated clipping tools", (Path(self.home) / "AUTOPILOT_REPORT.md").read_text())
        ws.close()

    def test_per_platform_mentions(self):
        run_cli("--home", self.home, "campaign-set", str(self.f), "--mention-for", "tiktok", "@brand",
                "--mention-for", "instagram", "brand_ig")
        c = cmp.load(str(self.f))
        c["platforms"] = ["tiktok", "instagram", "youtube"]
        posts = cmp.platform_posts(c, "Title", "cap", [])
        self.assertIn("@brand", posts["tiktok"]["caption"])
        self.assertNotIn("@brand_ig", posts["tiktok"]["caption"])
        self.assertIn("@brand_ig", posts["instagram"]["caption"])
        checks = cmp.compliance(c, 20, "fine", posts, True)
        self.assertIn((True, "tiktok caption tags @brand"), checks)
        self.assertIn((True, "instagram caption tags @brand_ig"), checks)
        self.assertFalse(any("youtube caption tags" in t for _, t in checks))

    def test_shipped_alpha_futures_is_marked_not_allowed(self):
        c = cmp.load(str(HERE / "campaigns" / "alpha-futures.json"))
        self.assertIs(cmp.automation_allowed(c), False)
        self.assertTrue(any("ban automated" in p for p in pl.campaign_problems(c)))


class NewCampaignWizardTests(unittest.TestCase):
    def test_wizard_then_guided_fill_gives_ready_campaign(self):
        import builtins
        tmp = Path(tempfile.mkdtemp())
        try:
            root = tmp / "campaigns"
            root.mkdir()
            shutil.copy(HERE / "campaigns" / "_template.json", root / "_template.json")
            (root / "footage" / "test-brand").mkdir(parents=True)
            (root / "footage" / "test-brand" / "ep.mp4").write_bytes(b"\0" * 10)
            answers = iter(["Test Brand", "https://contentrewards.com/c/campaigns/abc", "1.5", "250", "tiktok,youtube",
                            "1", "@testbrand", "n", "testbrand",          # wizard
                            "Clip any video in the content folder", "y", "y"])  # guided fill: evidence, tools ok, live
            real = builtins.input
            builtins.input = lambda *a: next(answers)
            try:
                with redirect_stdout(io.StringIO()):
                    f = pl.new_campaign_wizard(root)
                    pl.guided_fill(f)
            finally:
                builtins.input = real
            c = cmp.load(str(f))
            self.assertEqual(pl.campaign_problems(c), [])
            self.assertEqual((c["cpm"], c["max_payout_per_clip"], c["platforms"]), (1.5, 250.0, ["tiktok", "youtube"]))
            self.assertEqual(c["accounts"], {"tiktok": "testbrand", "youtube": "testbrand"})
            self.assertTrue(cmp.source_allowed(c, str(root / "footage" / "test-brand" / "ep.mp4"))[0])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    unittest.main(verbosity=2)
