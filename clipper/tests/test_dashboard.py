"""Dashboard: data built from the workspace, HTML is self-contained and safe against hostile text."""

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import dashboard  # noqa: E402
import pipeline as pl  # noqa: E402


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.ws = pl.WS(str(self.tmp / "ws"))
        camp = json.loads((HERE / "campaigns" / "alpha-futures.json").read_text())
        f = self.tmp / "c.json"
        f.write_text(json.dumps(camp))
        sid = self.ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, status, attempts, created, updated) "
                        "VALUES(?,?,?,?,?,?,?,?)", (camp["name"], str(f), "x.mp4", "file:x", "done", 1, pl.now(), pl.now()))
        evil = 'Evil </script><img src=x onerror=alert(1)> "quote"'
        cid = self.ws.x("INSERT INTO clips(source_id, campaign, rank, start, end_, title, caption, hashtags, posts, checks, flags,"
                        " words, text, score, file, status, created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        (sid, camp["name"], 1, 0, 30, evil, "c", "[]", "{}", "[]", "[]", "[]", "t", 80, "f.mp4", "posted", pl.now()))
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, views, likes, created, updated) VALUES(?,?,?,?,?,?,?,?,?)",
                  (cid, "tiktok", "alphafutures", "https://www.tiktok.com/@a/video/1", "live", 20000, 600, pl.now(), pl.now()))

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_data_and_html(self):
        d = dashboard.build_data(self.ws)
        self.assertEqual(d["stats"]["views"], 20000)
        self.assertEqual(d["stats"]["to_submit"], 1)
        self.assertAlmostEqual(d["stats"]["net"], 36.0)  # 20k views * $2/1K - 10% fee
        af = next(c for c in d["campaigns"] if c["name"].startswith("Alpha Futures"))
        self.assertTrue(af["problems"])  # repo brief still has TODOs
        out = dashboard.write(self.ws)
        html = out.read_text()
        self.assertEqual(html.count("</script>"), 1)  # hostile title can't close the script early
        self.assertIn("<\\/script>", html)
        self.assertNotIn("/*__DATA__*/null", html)
        for r in ("pageToday", "pageClips", "pageCampaigns", "pageEarnings", "pageJobs"):
            self.assertIn(r, html)

    def test_cli_no_open(self):
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = pl.main(["--home", str(self.tmp / "ws"), "dashboard", "--no-open"])
        self.assertEqual(rc, 0)
        self.assertTrue((self.tmp / "ws" / "dashboard.html").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
