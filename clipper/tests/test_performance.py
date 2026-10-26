"""
The performance loop: what the numbers say about our own posts (and nothing more), and how that feeds back into what
gets posted. Pure workspace tests: no network.

  cd clipper && python -X utf8 -m unittest tests.test_performance
"""

from __future__ import annotations

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
import performance as perf  # noqa: E402
import pipeline as pl  # noqa: E402

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 26, 13, 0, tzinfo=UTC)


class PerfCase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="clipper-perf-"))
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                  "VALUES(1,'C','x','x','f:x','done',?,?)", (pl.now(), pl.now()))
        self.n = 0

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def post(self, views, kind="video", seconds=25, title="Why most traders fail", hours_ago=48, angle=None, measured=True,
             sched_hour_et=None, account="acct.a"):
        """A live post `hours_ago` hours old; views were measured by a stats refresh when `measured`."""
        self.n += 1
        created = NOW - dt.timedelta(hours=hours_ago)
        updated = created + (dt.timedelta(hours=20) if measured else dt.timedelta(0))
        sched = None
        if sched_hour_et is not None:
            sched = (created.replace(hour=(sched_hour_et + 4) % 24, minute=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.ws.x("INSERT INTO clips(source_id, campaign, title, start, end_, status, created, kind, reasons, text) "
                  "VALUES(1,'C',?,0,?,'posted',?,?,?,?)", (title, seconds, pl.now(), kind, json.dumps([angle]) if angle else "[]",
                                                          f"words {self.n}"))
        cid = self.ws.q("SELECT MAX(id) m FROM clips")[0]["m"]
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, views, created, updated, scheduled_for) "
                  "VALUES(?,?,?,?,?,?,?,?,?)", (cid, "tiktok", account, f"https://t/{cid}", "live", views,
                                                created.replace(tzinfo=None).isoformat(timespec="seconds"),
                                                updated.replace(tzinfo=None).isoformat(timespec="seconds"), sched))
        return cid

    def analyze(self, hours=0):
        return perf.analyze(self.ws, NOW + dt.timedelta(hours=hours))

    def insights(self):
        return self.ws.setting("insights")


class AnalysisTests(PerfCase):
    def test_no_data_says_so_and_claims_nothing(self):
        p = self.analyze()
        self.assertEqual(p["settled_posts"], 0)
        self.assertIsNone(p["kind_weights"])
        self.assertIsNone(p["length_pref"])
        self.assertEqual(len(self.insights()), 1)
        self.assertIn("Collecting data: 0 posts settled", self.insights()[0])
        self.assertIsNone(perf.preferences(self.ws))

    def test_only_settled_and_measured_posts_count(self):
        self.post(500, hours_ago=48)
        self.post(500, hours_ago=10, measured=True)            # too fresh: views still moving
        self.post(500, hours_ago=48, measured=False)           # views never measured: could be a zero from a failed refresh
        p = self.analyze()
        self.assertEqual(p["settled_posts"], 1)

    def test_a_post_scheduled_for_later_is_not_settled_until_it_has_been_up_a_day(self):
        self.post(500, hours_ago=48, sched_hour_et=10)          # scheduled 10:15 ET two days ago: settled
        cid = self.post(500, hours_ago=30)
        self.ws.x("UPDATE uploads SET scheduled_for=? WHERE clip_id=?", ((NOW + dt.timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M:%SZ"), cid))
        self.assertEqual(self.analyze()["settled_posts"], 1)

    def test_kind_comparison_needs_five_each_then_names_the_winner(self):
        for _ in range(12):
            self.post(480, kind="video")
        for _ in range(4):
            self.post(190, kind="slideshow")
        p = self.analyze()
        self.assertEqual(set(p["by_kind"]), {"video"})                       # 4 slideshows: not enough to say anything
        self.assertFalse(any("slideshows" in i and "average" in i for i in self.insights()))
        self.assertIsNone(p["kind_weights"])
        self.post(190, kind="slideshow")
        p = self.analyze()
        self.assertIn("Videos average 480 views, slideshows 190: more videos tonight.", self.insights())
        self.assertEqual(p["kind_weights"], {"video": 0.72, "slideshow": 0.28})
        self.assertEqual(perf.preferences(self.ws), p)

    def test_similar_kinds_keep_the_mix(self):
        for _ in range(6):
            self.post(300, kind="video")
            self.post(280, kind="slideshow")
        self.analyze()
        self.assertTrue(any("perform about the same" in i for i in self.insights()))

    def test_exploration_floor_a_loser_still_gets_a_fifth(self):
        for _ in range(6):
            self.post(2000, kind="video")
            self.post(3, kind="slideshow")
        self.assertEqual(self.analyze()["kind_weights"], {"video": 0.8, "slideshow": 0.2})

    def test_length_hook_and_hour_findings_each_have_their_own_minimum(self):
        for _ in range(6):
            self.post(900, seconds=15, title="Why this works", sched_hour_et=19)
        for _ in range(6):
            self.post(300, seconds=45, title="Another day", sched_hour_et=10)
        for _ in range(9):
            self.post(450, seconds=28, title="Random thing here", sched_hour_et=14)
        p = self.analyze()
        self.assertEqual(p["settled_posts"], 21)
        self.assertEqual(p["length_pref"], "under 20s")
        self.assertTrue(any("Clips of under 20s average 900 views vs 300 for 35s+" in i for i in self.insights()))
        self.assertEqual(set(p["by_length"]), {"under 20s", "35s+", "20-35s"})
        self.assertIn("why", p["by_hook"])
        self.assertTrue(any('Titles starting with "why" average 900 views' in i for i in self.insights()))
        self.assertEqual(set(p["by_hour"]), {"19", "10", "14"})
        self.assertEqual(p["best_hours"], [14, 19])                                  # top two of three hours
        self.assertTrue(any(i.startswith("Best posting hours (New York): 14:00") or "19:00" in i for i in self.insights()))

    def test_hours_are_not_ranked_before_twenty_posts(self):
        for _ in range(12):
            self.post(900, sched_hour_et=19)
        p = self.analyze()
        self.assertEqual(p["by_hour"], {})
        self.assertIsNone(p["best_hours"])
        self.assertTrue(any("US prime time" in i for i in self.insights()))

    def test_weak_hook_words_are_ranked_lower(self):
        for _ in range(6):
            self.post(40, title="Secret trick everyone uses")
        for _ in range(6):
            self.post(900, title="Why it works")
        p = self.analyze()
        self.assertEqual(p["weak_hooks"], ["secret"])
        self.assertTrue(any('"secret" stayed under 100 views 6 times' in i for i in self.insights()))
        row = lambda t: {"kind": "video", "title": t, "start": 0, "end_": 25, "score": 80}        # noqa: E731
        self.assertEqual(perf.clip_penalty(row("Secret sauce"), p), 0.8)
        self.assertEqual(perf.clip_penalty(row("Why not"), p), 1.0)

    def test_insights_are_capped_and_plain(self):
        for _ in range(12):
            self.post(480)
        self.analyze()
        self.assertLessEqual(len(self.insights()), 12)
        self.assertTrue(all(isinstance(i, str) and i for i in self.insights()))

    def test_hook_word_skips_filler_words(self):
        self.assertEqual(perf.hook_word("The truth about prop firms"), "truth")
        self.assertEqual(perf.hook_word("“Why” most fail"), "why")
        self.assertIsNone(perf.hook_word("a to of"))
        self.assertEqual(perf.length_bucket(19.9), "under 20s")
        self.assertEqual(perf.length_bucket(20), "20-35s")
        self.assertEqual(perf.length_bucket(90), "35s+")
        self.assertIsNone(perf.length_bucket(0))


class FeedbackTests(PerfCase):
    def test_split_caps_keeps_the_total_and_at_least_a_fifth_of_each_kind(self):
        w = {"video": 0.8, "slideshow": 0.2}
        self.assertEqual(perf.split_caps(2, 2, w), (3, 1))
        self.assertEqual(perf.split_caps(2, 2, {"video": 0.2, "slideshow": 0.8}), (1, 3))
        self.assertEqual(perf.split_caps(2, 2, {"video": 0.5, "slideshow": 0.5}), (2, 2))
        self.assertEqual(perf.split_caps(5, 5, w), (8, 2))
        self.assertEqual(sum(perf.split_caps(3, 2, w)), 5)
        self.assertEqual(perf.split_caps(2, 0, w), (2, 0))                            # no slideshows for this campaign
        self.assertEqual(perf.split_caps(1, 1, w), (1, 1))                            # nothing to split
        self.assertEqual(perf.split_caps(2, 2, None), (2, 2))

    def test_order_is_by_score_without_data_and_deterministic_with_it(self):
        rows = [{"score": s, "kind": "video", "title": "t", "start": 0, "end_": 25, "id": i} for i, s in enumerate((50, 90, 70, 60))]
        self.assertEqual([r["id"] for r in perf.order_rows(rows, None, "s")], [1, 2, 3, 0])
        prefs = {"length_pref": None, "weak_hooks": []}
        a = [r["id"] for r in perf.order_rows(rows, prefs, "seed-1")]
        self.assertEqual(a, [r["id"] for r in perf.order_rows(rows, prefs, "seed-1")])
        self.assertEqual(sorted(a), [0, 1, 2, 3])

    def test_exploration_changes_about_a_fifth_of_the_picks_over_many_days(self):
        rows = [{"score": 100 - i, "kind": "video", "title": "t", "start": 0, "end_": 25, "id": i} for i in range(10)]
        prefs = {"length_pref": None, "weak_hooks": []}
        first_pick_changed = sum(perf.order_rows(rows, prefs, f"day{d}")[0]["id"] != 0 for d in range(400))
        self.assertTrue(40 < first_pick_changed < 120, first_pick_changed)           # about 20% of 400 (never 0, never all)

    def test_preferred_length_goes_first_and_weak_hooks_last(self):
        rows = [{"score": 80, "kind": "video", "title": "Why long", "start": 0, "end_": 50, "id": 0},
                {"score": 75, "kind": "video", "title": "Why short", "start": 0, "end_": 15, "id": 1},
                {"score": 78, "kind": "video", "title": "Secret one", "start": 0, "end_": 15, "id": 2}]
        prefs = {"length_pref": "under 20s", "weak_hooks": ["secret"]}
        order = [r["id"] for r in sorted(rows, key=lambda r: -(r["score"] * perf.clip_penalty(r, prefs)))]
        self.assertEqual(order, [1, 0, 2])                                           # 75x1.15 > 80 > 78x1.15x0.8

    def test_three_weak_posts_pause_a_slideshow_angle_for_two_weeks_then_it_may_try_again(self):
        for _ in range(3):
            self.post(40, kind="slideshow", angle="myth_buster")
        for _ in range(3):
            self.post(900, kind="slideshow", angle="ceo_quote")
        p = self.analyze()
        self.assertIn("myth_buster", p["retired_angles"])
        self.assertNotIn("ceo_quote", p["retired_angles"])
        self.assertTrue(any('"myth_buster" paused for 14 days' in i for i in self.insights()))
        self.assertTrue(perf.angle_paused(self.ws, "myth_buster", NOW))
        self.assertFalse(perf.angle_paused(self.ws, "ceo_quote", NOW))
        self.assertFalse(perf.angle_paused(self.ws, None, NOW))
        later = NOW + dt.timedelta(days=15)
        self.assertFalse(perf.angle_paused(self.ws, "myth_buster", later))           # the pause ran out
        perf.analyze(self.ws, later)
        self.assertNotIn("myth_buster", self.ws.setting("performance")["retired_angles"])   # not re-paused by the same old posts
        for _ in range(3):
            self.post(10, kind="slideshow", angle="myth_buster", hours_ago=-24 * 15)   # three new weak ones after the pause
        perf.analyze(self.ws, later + dt.timedelta(days=3))
        self.assertTrue(perf.angle_paused(self.ws, "myth_buster", later + dt.timedelta(days=3)))
        self.assertEqual(self.ws.setting("retired.angles")["myth_buster"]["strikes"], 2)

    def test_two_weak_posts_are_not_enough_and_one_good_one_saves_the_angle(self):
        self.post(40, kind="slideshow", angle="advice")
        self.post(40, kind="slideshow", angle="advice")
        self.assertEqual(self.analyze()["retired_angles"], {})
        self.post(900, kind="slideshow", angle="advice")
        self.post(30, kind="slideshow", angle="advice")
        self.post(30, kind="slideshow", angle="advice")
        self.assertEqual(self.analyze()["retired_angles"], {})                        # the last three are not all weak

    def test_a_paused_angle_is_not_posted_and_not_made(self):
        import io
        from contextlib import redirect_stdout
        self.post(10, kind="slideshow", angle="advice")
        self.post(10, kind="slideshow", angle="advice")
        self.post(10, kind="slideshow", angle="advice")
        perf.analyze(self.ws, dt.datetime.now(UTC) + dt.timedelta(hours=60))    # real clock inside make_slideshows
        tmpl = json.loads((HERE / "campaigns" / "_template.json").read_text())
        tmpl.update(name="C", automation_allowed=True, platforms=["tiktok"], accounts={"tiktok": "*"}, account_match="",
                    sources=[], disclosure={"caption": "#ad"})
        tmpl["permission"] = dict(tmpl["permission"], campaign_url="https://x", verified_on=dt.date.today().isoformat(),
                                  evidence="t", allowed_sources=["file:x"])
        f = self.tmp / "c.json"
        f.write_text(json.dumps(tmpl))
        self.ws.x("UPDATE sources SET campaign_file=? WHERE id=1", (str(f),))
        for k, v in {"autopilot.enabled": True, "autopilot.platforms": ["tiktok"], "autopilot.campaigns": [], "autopilot.via": "free"}.items():
            self.ws.set_setting(k, v)
        path = self.tmp / "deck"
        path.mkdir()
        (path / "slide_01.jpg").write_bytes(b"x")
        self.ws.x("INSERT INTO clips(source_id, campaign, title, caption, hashtags, posts, checks, flags, score, file, status, "
                  "ready_file, created, kind, reasons) VALUES(1,'C','deck','#ad cap','[]',?,'[]','[]',80,?,'approved',?,?,"
                  "'slideshow',?)", (json.dumps({"tiktok": {"caption": "#ad cap"}}), str(path), str(path), pl.now(),
                                     json.dumps(["advice"])))

        class Fake:
            calls = 0

            def upload(self, *a, **k):
                Fake.calls += 1
                return {"id": "1", "url": "https://www.tiktok.com/@x/video/1", "privacy": "public", "notes": []}
        self.ws.set_setting("campaign_state.C", {"state": "active", "accounts": ["tiktok/acct.a"]})
        with redirect_stdout(io.StringIO()):
            pl.autopilot_cycle(self.ws, type("A", (), {"preset": "ultrafast", "limit": None, "cookies_from_browser": None})(),
                               uploaders={"tiktok": Fake()})
        self.assertEqual(Fake.calls, 0)
        last = json.loads((self.ws.home / "logs" / "autopilot.jsonl").read_text().strip().splitlines()[-1])
        self.assertTrue(any("paused for two weeks" in n for n in last["notes"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
