"""Dashboard data contract v2 (docs/DASHBOARD_DATA.md): every key with the right type, hidden money, thumbnails,
analytics math. Runs against an empty workspace and the demo workspace (demo.py)."""

import datetime as dt
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import dashboard  # noqa: E402
import demo  # noqa: E402
import pipeline as pl  # noqa: E402

N = (int, float)
ON = (int, float, type(None))
S = str
OS = (str, type(None))
B = bool
OB = (bool, type(None))
NONE = type(None)

UPLOAD = {"platform": S, "url": OS, "views": int, "likes": int, "state": OS, "net": N, "account": OS, "created": OS,
          "submitted_at": OS}
SPEC = {
    "version": int, "generated": S, "workspace": S, "preview": B, "hide_money": B,
    "autopilot": {"enabled": B, "via": S, "platforms": list, "cap": int, "min_score": N, "privacy": S, "last": dict,
                  "notes": list, "errors": list, "every_hours": int, "next_run": OS},
    "accounts": [{"name": S, "connected": B}],
    "stats": {"clips": int, "posted": int, "posts": int, "views": int, "likes": int, "net": N, "to_submit": int,
              "drafts": int, "held": int, "today_posts": int, "views_24h": int, "views_7d": int, "net_7d": N,
              "net_30d": N, "posts_7d": int, "avg_views": int, "engagement": N, "effective_cpm": N,
              "best_platform": OS},
    "todo": {"submit": [{"clip_id": int, "platform": S, "url": S, "title": S, "page": S}],
             "drafts": [{"clip_id": int, "caption": S, "title": S}],
             "held": [{"id": int, "title": S, "reason": OS}]},
    "clips": [{"id": int, "title": S, "campaign": S, "score": N, "status": S, "dur": int, "created": OS, "held": OS,
               "views": int, "net": N, "flags": list, "uploads": [UPLOAD], "thumb": OS, "hook": S, "caption": S,
               "reasons": list, "source_title": S, "start": N, "end": N}],
    "campaigns": [{"name": S, "cpm": N, "fee": N, "cap": N, "min_views": N, "platforms": list, "url": S,
                   "verified_on": S, "age": (int, NONE), "problems": list, "auto": B, "posts": int, "views": int,
                   "net": N, "clips": int, "automation_allowed": OB, "notes": S}],
    "earnings": {"by_platform": dict,
                 "daily": [{"date": S, "posts": int, "views": int, "net": N}],
                 "weekly": [{"week": S, "posts": int, "views": int, "net": N}],
                 "monthly": [{"month": S, "posts": int, "views": int, "net": N}],
                 "by_campaign": [{"name": S, "posts": int, "views": int, "net": N}],
                 "top": [{"title": S, "platform": S, "url": S, "views": int, "net": N}]},
    "analytics": {"views_history": [{"date": S, "views": int}], "hour_heatmap": list,
                  "length_buckets": [{"label": S, "posts": int, "avg_views": int}],
                  "score_vs_views": [{"id": int, "score": N, "views": int, "platform": S}],
                  "funnel": {"imported": int, "clips": int, "approved": int, "posted": int, "submitted": int},
                  "hook_words": [{"word": S, "posts": int, "avg_views": int}],
                  "platform_split": [{"platform": S, "views": int, "posts": int}],
                  "calendar": [{"date": S, "posts": int, "views": int}],
                  "streak": {"current": int, "best": int}},
    "pipeline": {"queue": {"queued": int, "running": int, "retry_wait": int, "failed": int, "blocked": int, "done": int},
                 "sources": int},
    "health": {"checks": [{"name": S, "ok": B, "fix": S}], "disk_free_gb": ON},
    "goals": {"month_target": ON},
    "leads": [{"name": S, "cpm": N, "platforms": list, "automation_allowed": OB, "status": S, "url": S, "note": S}],
    "jobs": [{"id": int, "status": OS, "attempts": (int, NONE), "title": OS, "input": OS, "last_error": OS,
              "updated": OS}],
    "events": [{"ts": OS, "level": OS, "message": OS}],
    "spend": {"month": N, "cap": N},
}
MONEY_KEYS = {"net", "net_7d", "net_30d", "effective_cpm", "month_target"}


def check(tc, value, spec, path="data"):
    if isinstance(spec, dict):
        tc.assertIsInstance(value, dict, path)
        for k, sub in spec.items():
            tc.assertIn(k, value, f"{path}.{k} missing")
            check(tc, value[k], sub, f"{path}.{k}")
    elif isinstance(spec, list):
        tc.assertIsInstance(value, list, path)
        for i, item in enumerate(value):
            check(tc, item, spec[0], f"{path}[{i}]")
    else:
        if spec in (int, N, ON) or (isinstance(spec, tuple) and int in spec):
            tc.assertNotIsInstance(value, bool, path)
        tc.assertIsInstance(value, spec, f"{path} = {value!r}")


def walk(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield f"{path}.{k}", k, v
            yield from walk(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f"{path}[{i}]")


class ContractEmptyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.ws = pl.WS(str(self.tmp / "ws"))

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_every_key_on_empty_workspace(self):
        d = dashboard.build_data(self.ws)
        check(self, d, SPEC)
        self.assertEqual(d["version"], 2)
        self.assertFalse(d["preview"])
        self.assertEqual(len(d["earnings"]["daily"]), 30)
        self.assertEqual(len(d["earnings"]["weekly"]), 12)
        self.assertEqual(len(d["earnings"]["monthly"]), 6)
        self.assertEqual(len(d["analytics"]["views_history"]), 30)
        self.assertEqual(len(d["analytics"]["calendar"]), 84)
        self.assertEqual([b["label"] for b in d["analytics"]["length_buckets"]],
                         ["8-20s", "20-30s", "30-45s", "45-60s", "60s+"])
        self.assertEqual(d["stats"]["views_24h"], 0)
        self.assertIsNone(d["stats"]["best_platform"])
        self.assertIsNone(d["autopilot"]["next_run"])
        self.assertIsNone(d["goals"]["month_target"])
        self.assertEqual(d["analytics"]["streak"], {"current": 0, "best": 0})
        names = [c["name"] for c in d["health"]["checks"]]
        self.assertEqual(names, ["ffmpeg", "autopilot", "posting account", "schedule", "publish", "disk"])
        json.dumps(d)  # serializable as is
        check(self, dashboard.hide_money(d), {**SPEC, "stats": dict, "clips": list, "campaigns": list,
                                              "earnings": dict, "spend": dict, "goals": dict})

    def test_view_deltas_from_history(self):
        now = dt.datetime.now().replace(microsecond=0)

        def t(h):
            return (now - dt.timedelta(hours=h)).isoformat()
        posts = [{"url": "https://www.tiktok.com/@a/video/1", "posted": t(72), "views": 500, "updated": t(1),
                  "history": [[t(48), 100], [t(12), 300]]},
                 {"url": "https://www.tiktok.com/@a/video/2", "posted": t(24 * 20), "views": 900, "updated": t(1),
                  "history": []}]  # no history: no gain is claimed
        (self.ws.home / "earnings.json").write_text(json.dumps({"posts": posts}))
        d = dashboard.build_data(self.ws)
        self.assertEqual(d["stats"]["views_24h"], 400)  # 500 now - 100 a day ago
        self.assertEqual(d["stats"]["views_7d"], 500)   # posted 3 days ago: all of it
        vh = d["analytics"]["views_history"]
        self.assertEqual(vh[-1]["views"], 1400)
        self.assertEqual(vh[0]["views"], 0)  # before either post existed
        self.assertEqual(vh[-5]["views"], 900)  # only the older post, at its first known count
        self.assertEqual([v["views"] for v in vh], sorted(v["views"] for v in vh))

    def test_settings_and_next_run(self):
        self.ws.set_setting("autopilot.every_hours", 4)
        self.ws.set_setting("dashboard.goal_month_usd", 250)
        (self.ws.home / "logs" / "autopilot.jsonl").write_text(
            json.dumps({"started": "2026-10-22T01:00:00", "finished": "2026-10-22T01:10:00", "uploaded": []}) + "\n")
        d = dashboard.build_data(self.ws)
        self.assertEqual(d["autopilot"]["every_hours"], 4)
        self.assertEqual(d["autopilot"]["next_run"], "2026-10-22T05:10:00")
        self.assertEqual(d["goals"]["month_target"], 250.0)
        self.assertIsNone(dashboard.hide_money(d)["goals"]["month_target"])

    def test_streak(self):
        today = dt.date(2026, 10, 22)

        def days(*ago):
            return {(today - dt.timedelta(days=a)).isoformat() for a in ago}
        self.assertEqual(dashboard.streak(days(0, 1, 2, 5, 6, 7, 8), today), {"current": 3, "best": 4})
        self.assertEqual(dashboard.streak(days(1, 2), today), {"current": 2, "best": 2})  # today not posted yet
        self.assertEqual(dashboard.streak(days(3, 4), today), {"current": 0, "best": 2})
        self.assertEqual(dashboard.streak(set(), today), {"current": 0, "best": 0})

    def test_first_sentence(self):
        self.assertEqual(dashboard.first_sentence("Stop now. Then go."), "Stop now.")
        self.assertLessEqual(len(dashboard.first_sentence("word " * 100)), 120)


class ContractDemoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.ws = demo.build(cls.tmp / "demo", days=30, seed=7)
        cls.has_ffmpeg = bool(shutil.which("ffmpeg"))
        dashboard.write(cls.ws)
        cls.d = dashboard.build_data(cls.ws)

    @classmethod
    def tearDownClass(cls):
        cls.ws.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_every_key_on_demo(self):
        d = self.d
        check(self, d, SPEC)
        for k in ("clips", "posts", "views", "likes", "to_submit", "drafts", "held", "views_7d", "posts_7d"):
            self.assertGreater(d["stats"][k], 0, k)
        self.assertEqual(d["stats"]["to_submit"], 6)
        self.assertEqual(d["stats"]["drafts"], 1)
        self.assertGreaterEqual(d["stats"]["held"], 1)
        self.assertGreaterEqual(d["stats"]["views_7d"], d["stats"]["views_24h"])
        self.assertLessEqual(len(d["analytics"]["hook_words"]), 12)
        self.assertTrue(d["analytics"]["hook_words"])
        self.assertIn(d["stats"]["best_platform"], ("tiktok", "instagram", "youtube"))
        self.assertAlmostEqual(d["stats"]["avg_views"], d["stats"]["views"] / d["stats"]["posts"], delta=1)
        self.assertTrue(0 < d["stats"]["engagement"] < 0.1)
        self.assertEqual(d["autopilot"]["every_hours"], 4)
        self.assertIsNotNone(d["autopilot"]["next_run"])
        self.assertTrue(d["autopilot"]["enabled"])
        self.assertEqual(d["autopilot"]["via"], "free")
        q = d["pipeline"]["queue"]
        self.assertEqual((q["failed"], q["retry_wait"]), (1, 1))
        self.assertEqual(d["pipeline"]["sources"], sum(q.values()))
        self.assertTrue(any(c["reasons"] for c in d["clips"]))
        self.assertTrue(all(c["source_title"] for c in d["clips"]))
        demo_names = {"AiXfunded (prop firm)", "Tradever (prop firm)", "PB Blake (trading creator)"}
        self.assertTrue(demo_names <= {c["name"] for c in d["campaigns"]})
        self.assertIn("PB Blake (trading creator)", {x["name"] for x in d["leads"]})
        self.assertNotIn("AiXfunded (prop firm)", {x["name"] for x in d["leads"]})
        self.assertEqual({x["name"] for x in d["earnings"]["by_campaign"]}, demo_names)
        net = sum(x["net"] for x in d["earnings"]["by_campaign"])
        self.assertAlmostEqual(net, d["stats"]["net"], places=1)
        self.assertAlmostEqual(sum(w["posts"] for w in d["earnings"]["daily"]), d["stats"]["posts"], delta=d["stats"]["posts"])

    def test_analytics_math(self):
        a = self.d["analytics"]
        self.assertEqual(len(a["hour_heatmap"]), 7)
        self.assertTrue(all(len(r) == 24 and all(isinstance(v, int) for v in r) for r in a["hour_heatmap"]))
        self.assertGreater(sum(map(sum, a["hour_heatmap"])), 0)
        f = a["funnel"]
        self.assertGreaterEqual(f["clips"], f["approved"])
        self.assertGreaterEqual(f["approved"], f["posted"])
        self.assertGreaterEqual(f["posted"], f["submitted"])
        self.assertGreater(f["submitted"], 0)
        self.assertEqual(sum(b["posts"] for b in a["length_buckets"]), self.d["stats"]["posts"])
        self.assertEqual(sum(p["posts"] for p in a["platform_split"]), self.d["stats"]["posts"])
        self.assertEqual(sum(p["views"] for p in a["platform_split"]), self.d["stats"]["views"])
        self.assertEqual(len(a["score_vs_views"]), self.d["stats"]["posts"])
        self.assertGreaterEqual(a["streak"]["best"], a["streak"]["current"])
        self.assertGreater(a["streak"]["best"], 1)
        vh = [v["views"] for v in a["views_history"]]
        self.assertEqual(vh, sorted(vh))  # cumulative views never go down
        earn = json.loads((self.ws.home / "earnings.json").read_text())
        self.assertEqual(vh[-1], sum(p["views"] for p in earn["posts"]))
        self.assertEqual(sum(c["posts"] for c in a["calendar"]), self.d["stats"]["posts"])
        hw = a["hook_words"]
        self.assertEqual(hw, sorted(hw, key=lambda x: (-x["posts"], -x["avg_views"], x["word"])))

    def test_hide_money_nulls_all_money(self):
        h = dashboard.hide_money(self.d)
        self.assertTrue(h["hide_money"])
        for path, k, v in walk(h):
            if k in MONEY_KEYS:
                self.assertIsNone(v, path)
        self.assertEqual(h["spend"], {"month": None, "cap": None})
        self.assertTrue(all(x["cpm"] for x in h["leads"]))  # public rates stay
        self.assertTrue(all(c["cpm"] is not None for c in h["campaigns"]))
        self.assertEqual(h["analytics"], json.loads(json.dumps(self.d["analytics"])))
        self.assertFalse(self.d["hide_money"])  # the original isn't modified
        body = dashboard.site_files(h, self.ws)["data.json"].decode()
        self.assertNotIn('"net": 0', body)

    def test_thumbnails(self):
        if not self.has_ffmpeg:
            self.skipTest("ffmpeg not installed")
        thumbs = [c for c in self.d["clips"] if c["thumb"]]
        self.assertGreater(len(thumbs), 30)
        self.assertLessEqual(len(thumbs), dashboard.THUMB_LIMIT)
        self.assertTrue(any(c["thumb"] is None for c in self.d["clips"]))  # render_failed / no file
        for c in thumbs:
            self.assertEqual(c["thumb"], f"thumbs/{c['id']}.jpg")
        jpg = (self.ws.home / thumbs[0]["thumb"]).read_bytes()
        self.assertEqual(jpg[:2], b"\xff\xd8")
        files = dashboard.site_files(self.d, self.ws)
        for c in thumbs:
            self.assertIn(c["thumb"], files)
        self.assertEqual(files[thumbs[0]["thumb"]], jpg)
        legacy = dashboard.site_files(self.d)  # old signature: thumbs found through data["workspace"]
        self.assertIn(thumbs[0]["thumb"], legacy)
        self.assertIn("index.html", legacy)
        self.assertEqual(dashboard.make_thumbs(self.ws), 0)  # only missing ones are made

    def test_thumb_limit_and_missing_files(self):
        if not self.has_ffmpeg:
            self.skipTest("ffmpeg not installed")
        tmp = Path(tempfile.mkdtemp())
        try:
            ws = pl.WS(str(tmp / "ws"))
            src = next(self.ws.home.glob("clips/**/*.mp4"))
            for i in range(3):
                f = tmp / f"v{i}.mp4"
                shutil.copyfile(src, f)
                ws.x("INSERT INTO clips(title, status, file, created) VALUES(?,?,?,?)", (f"c{i}", "pending_review",
                                                                                     str(f), pl.now()))
            ws.x("INSERT INTO clips(title, status, file, created) VALUES(?,?,?,?)", ("gone", "pending_review",
                                                                                 str(tmp / "missing.mp4"), pl.now()))
            self.assertEqual(dashboard.make_thumbs(ws, limit=2), 2)
            d = dashboard.build_data(ws)
            self.assertEqual([c["thumb"] for c in d["clips"]], [None, "thumbs/3.jpg", "thumbs/2.jpg", None])
            ws.close()
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_preview_site(self):
        out = self.tmp / "p"
        import io
        from contextlib import redirect_stdout
        with redirect_stdout(io.StringIO()):
            demo.main([str(out), "--days", "10", "--preview"])
        data = json.loads((out / "site" / "data.json").read_text())
        self.assertTrue(data["preview"])
        self.assertTrue((out / "site" / "index.html").exists())
        self.assertTrue((out / "dashboard.html").exists())
        local = (out / "dashboard.html").read_text()
        self.assertNotIn('"preview": true', local)
        if self.has_ffmpeg:
            self.assertTrue(any((out / "site" / "thumbs").glob("*.jpg")))

    def test_demo_is_deterministic_and_refuses_real_workspace(self):
        a = demo.build(self.tmp / "d1", days=12, seed=3)
        b = demo.build(self.tmp / "d2", days=12, seed=3)
        try:
            qa = [tuple(r) for r in a.q("SELECT title, score, status FROM clips ORDER BY id")]
            qb = [tuple(r) for r in b.q("SELECT title, score, status FROM clips ORDER BY id")]
            self.assertEqual(qa, qb)
            ua = [tuple(r) for r in a.q("SELECT clip_id, platform, account FROM uploads ORDER BY id")]
            ub = [tuple(r) for r in b.q("SELECT clip_id, platform, account FROM uploads ORDER BY id")]
            self.assertEqual(ua, ub)
        finally:
            a.close()
            b.close()
        real = self.tmp / "real"
        real.mkdir()
        (real / "jobs.db").write_text("")
        with self.assertRaises(SystemExit):
            demo.build(real)


if __name__ == "__main__":
    unittest.main(verbosity=2)
