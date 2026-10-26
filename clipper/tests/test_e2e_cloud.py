"""
End-to-end "fake world" tests of the cloud autopilot.

cloud_runner.main() runs over several simulated runs and days against:
  * fake Content Rewards pages (budget, status),
  * a fake Zernio (accounts, presign, storage PUT, posts, analytics),
  * a fake ntfy.sh,
  * a local bare git repo standing in for GitHub (the `clipper-cloud` state branch),
with a fresh "VM" (empty home, empty process caches) for every run, exactly like a new GitHub Actions job.
Only the clock, the internet and the speech recogniser are faked; ffmpeg, clipping, captions, slideshows, the
posting rules, link tracking, the dashboard and the git state branch are the real code.

  python -X utf8 -m unittest tests.test_e2e_cloud -v          (from clipper/, about 3-4 minutes)
  python -X utf8 -m unittest tests.test_e2e_cloud.RulesCheap  (about 30 seconds, no video work)

Scenarios that need the autopilot "brain" (campaign lifecycle: standby / promote / account moves, limited accounts)
are written but skipped with @unittest.skip("needs lifecycle"): un-skip them after the brain is merged and fix the
expectations to match its exact wording (the AUTOPILOT_CONTRACT.md keys are used).
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fakeworld as fw  # noqa: E402
import pipeline as pl  # noqa: E402
import cloud_runner as cr  # noqa: E402
import slideshow  # noqa: E402


def q(cloud: fw.Cloud, sql: str, args=()):
    ws = cloud.ws()
    try:
        return [dict(r) for r in ws.q(sql, args)]
    finally:
        ws.close()


def setting(cloud: fw.Cloud, key: str):
    ws = cloud.ws()
    try:
        return ws.setting(key, None)
    finally:
        ws.close()


class FullChain(unittest.TestCase):
    """Five runs over a simulated Monday-Tuesday with real clipping (2 + 1 episodes) and slideshows."""

    @classmethod
    def setUpClass(cls):
        cls._orig_decks = slideshow.decks_from_transcript
        slideshow.decks_from_transcript = lambda *a, **k: cls._orig_decks(*a, **k)[:3]   # keep the test quick
        # Monday 26 Oct 2026 13:00 UTC = 09:00 New York (EDT)
        cls.c = c = fw.Cloud(start=(2026, 10, 26, 13, 0), topic=fw.SENTINEL_TOPIC)
        cls.runs = []

        def run(label, **kw):
            rc, out = c.run(catch=True, **kw)
            posts = len(c.world.posts)
            cls.runs.append({"label": label, "rc": rc, "out": out, "posts": posts, "clock": c.clock.utc})
            return rc, out
        cls.run_ = staticmethod(run)
        run("R1 Mon 09:00 NY, two episodes", footage=[lambda: c.make_footage("ep1", 80), lambda: c.make_footage("ep2", 78)])
        run("R2 Mon 13:00 NY (4 h later: min gap)", advance={"hours": 4})
        run("R3 Mon 17:00 NY (8 h after R1)", advance={"hours": 4})
        run("R4 Mon 23:30 NY (outside the window, new episode waits)", advance={"hours": 6, "minutes": 30},
            footage=[lambda: c.make_footage("ep3", 76)])
        run("R5 Tue 08:00 NY (window opens)", advance={"hours": 8, "minutes": 30})

    @classmethod
    def tearDownClass(cls):
        slideshow.decks_from_transcript = cls._orig_decks
        cls.c.close()

    # ------------------------------------------------------------------ posting rules over the five runs
    def test_all_runs_succeeded(self):
        for r in self.runs:
            self.assertEqual(r["rc"], 0, f"{r['label']} failed:\n{r['out'][-1500:]}")

    def test_run1_posts_one_video_and_one_slideshow_per_account_rotating(self):
        r1 = [p for p in self.c.world.posts if p["at"] == self.runs[0]["clock"]]
        self.assertEqual(len(r1), 4, [(p["account"], p["kind"]) for p in r1])
        by = {(p["account"], p["kind"]) for p in r1}
        self.assertEqual(by, {("acme.clips1", "video"), ("acme.clips2", "video"),
                              ("acme.clips1", "photo"), ("acme.clips2", "photo")})

    def test_run2_inside_min_gap_posts_nothing(self):
        self.assertEqual(self.runs[1]["posts"], self.runs[0]["posts"])

    def test_run3_after_the_gap_posts_the_rest_and_respects_caps(self):
        self.assertGreater(self.runs[2]["posts"], self.runs[1]["posts"])
        per = {}
        for p in self.c.world.posts:
            if p["at"].date() == self.runs[0]["clock"].date():
                per[(p["account"], p["kind"])] = per.get((p["account"], p["kind"]), 0) + 1
        self.assertTrue(per and all(n <= 2 for n in per.values()), per)   # 2 videos + 2 slideshows a day per account

    def test_run4_outside_posting_window_posts_nothing_but_still_clips(self):
        self.assertEqual(self.runs[3]["posts"], self.runs[2]["posts"])
        self.assertIn("outside posting hours", self.runs[3]["out"] + json.dumps(self.report(3)))
        waiting = q(self.c, "SELECT COUNT(*) n FROM clips WHERE status='approved' AND "
                            "id NOT IN (SELECT clip_id FROM uploads)")[0]["n"]
        self.assertGreater(waiting, 0, "the third episode should have produced clips waiting for the window")

    def test_run5_window_opens_and_the_waiting_clips_go_out(self):
        self.assertGreater(self.runs[4]["posts"], self.runs[3]["posts"])
        latest = [p for p in self.c.world.posts if p["at"] == self.runs[4]["clock"]]
        self.assertTrue(latest)

    def report(self, i):
        return [self.runs[i]["out"][-3000:]]

    def test_every_clip_is_posted_at_most_once_and_to_exactly_one_account(self):
        rows = q(self.c, "SELECT clip_id, COUNT(*) n FROM uploads GROUP BY clip_id")
        self.assertTrue(rows and all(r["n"] == 1 for r in rows), rows)
        zern = [p["caption"] + "|" + (p["body"]["mediaItems"][0]["url"]) for p in self.c.world.posts]
        self.assertEqual(len(zern), len(set(zern)), "Zernio received the same post twice")
        self.assertEqual(len(self.c.world.posts), len(q(self.c, "SELECT 1 FROM uploads")))

    def test_posts_carry_disclosure_consent_and_the_brand_mention(self):
        for p in self.c.world.posts:
            tts = p["body"]["tiktokSettings"]
            self.assertTrue(tts["content_preview_confirmed"] and tts["express_consent_given"])
            self.assertEqual(tts["commercialContentType"], "brand_content")     # paid partnership
            if p["kind"] == "video":
                self.assertIn("#ad", p["caption"])
                self.assertIn("@acme", p["caption"])

    def test_presigned_storage_never_receives_the_api_key(self):
        puts = self.c.world.to(host="storage.fakezernio.test", method="PUT")
        self.assertTrue(puts)
        for r in puts:
            self.assertNotIn("authorization", r["headers"])

    def test_posts_are_scheduled_inside_the_window_one_minute_apart_at_least(self):
        from zoneinfo import ZoneInfo
        posts = self.c.world.posts
        self.assertTrue(posts)
        seen = set()
        for p in posts:
            body = p["body"]
            self.assertEqual(body["timezone"], "America/New_York")
            self.assertNotIn("publishNow", body)
            local = p["scheduled_utc"].astimezone(ZoneInfo("America/New_York"))
            self.assertTrue(8 <= local.hour < 23, f"{p['account']} scheduled at {local}")
            self.assertGreaterEqual(p["scheduled_utc"], p["at"], "a slot must lie in the future")
            minute = p["scheduled_utc"].replace(second=0, microsecond=0)
            self.assertNotIn(minute, seen, "two posts in the same minute")
            seen.add(minute)

    def test_links_views_and_earnings_tracking(self):
        ws = self.c.ws()
        try:
            ups = [dict(r) for r in ws.q("SELECT url, views, state, publish_id, scheduled_for FROM uploads")]
        finally:
            ws.close()
        by_id = {p["id"]: p for p in self.c.world.posts}
        now = self.c.clock.utc
        for u in ups:
            p = by_id[u["publish_id"]]
            if p["scheduled_utc"] <= now:
                self.assertEqual(u["state"], "live", f"{p['id']} was published at {p['scheduled_utc']} but is {u['state']}")
                self.assertEqual(u["url"], p["url"])
            else:
                self.assertEqual(u["state"], "processing", "a post still waiting for its slot has no link yet")
        live = [u for u in ups if u["state"] == "live"]
        self.assertTrue(live)
        self.assertTrue(any(u["views"] for u in live), "views from the analytics call should be stored")
        db = json.loads((self.c.home / "ws" / "earnings.json").read_text(encoding="utf-8"))
        self.assertEqual({p["url"] for p in db["posts"]}, {u["url"] for u in live})
        data = json.loads(self.c.branch_file("site/data.json"))
        self.assertEqual(data["stats"]["posts"], len(ups))
        self.assertGreater(data["stats"]["views"], 0)

    # ------------------------------------------------------------------ the state branch
    def test_state_branch_is_squashed_to_one_commit_and_holds_no_media(self):
        self.assertEqual(self.c.branch_commits(), 1)
        files = self.c.branch_files()
        self.assertFalse([f for f in files if f.endswith((".wav", ".mkv"))], files)
        self.assertFalse([f for f in files if f.startswith(("footage/", "ws/clips/", "ws/logs/", "ws/sources/")
                                                          ) and f.endswith((".mp4", ".wav", ".log", ".jsonl"))], files)
        for need in ("ws/jobs.db", "cloud_state.json", "site/index.html", "site/data.json", "ws/AUTOPILOT_REPORT.md"):
            self.assertIn(need, files)
        posted_mp4 = [f for f in files if f.startswith("ws/ready/") and f.endswith(".mp4")]
        waiting = q(self.c, "SELECT COUNT(*) n FROM clips WHERE kind='video' AND status='approved' AND "
                            "id NOT IN (SELECT clip_id FROM uploads)")[0]["n"]
        self.assertLessEqual(len(posted_mp4), waiting, "posted clips must be pruned from the branch")

    def test_fresh_vm_restores_everything_from_the_branch(self):
        # the last run started from an empty disk and still knew the earlier posts: nothing was posted twice
        self.assertEqual(len(q(self.c, "SELECT 1 FROM uploads")), len(self.c.world.posts))
        self.assertGreaterEqual(len(q(self.c, "SELECT 1 FROM sources WHERE status='done'")), 3)

    # ------------------------------------------------------------------ the dashboard and alerts
    def test_dashboard_is_rebuilt_every_run_with_assets(self):
        files = self.c.branch_files()
        for f in ("site/manifest.webmanifest", "site/sw.js", "site/icon-192.png"):
            self.assertIn(f, files)
        html = self.c.branch_file("site/index.html").decode("utf-8")
        self.assertIn("Clip Engine", html)
        data = json.loads(self.c.branch_file("site/data.json"))
        self.assertEqual(data["autopilot"]["runner"], "cloud")
        self.assertTrue(data["campaigns"])

    def test_ntfy_digest_once_and_topic_only_goes_to_ntfy(self):
        sent = [m for m in self.c.world.ntfy if "links to submit" in m["headers"].get("title", "")]
        self.assertEqual(len(sent), 1, [m["headers"].get("title") for m in self.c.world.ntfy])
        self.assertEqual(self.c.world.ntfy[0]["topic"], fw.SENTINEL_TOPIC)
        self.assertNotIn(fw.SENTINEL_TOPIC, self.c.world.all_text().replace(f"https://ntfy.sh/{fw.SENTINEL_TOPIC}", ""))

    def test_only_expected_hosts_were_contacted(self):
        self.assertEqual(self.c.world.unexpected, [])
        hosts = {r["host"] for r in self.c.world.requests}
        self.assertTrue(hosts <= fw.ALLOWED_HOSTS, hosts)

    def test_runs_are_idempotent_when_nothing_changed(self):
        before = len(self.c.world.posts)
        rc, _ = self.c.run(advance={"minutes": 5})
        self.assertEqual(rc, 0)
        self.assertEqual(len(self.c.world.posts), before)
        self.assertEqual(self.c.branch_commits(), 1)


class RulesCheap(unittest.TestCase):
    """Posting rules with seeded clips (no video work): quick and focused."""

    def setUp(self):
        self.c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)

    def tearDown(self):
        self.c.close()

    def test_paused_campaign_posts_nothing_then_resumes_when_refilled(self):
        c = self.c
        c.world.cr_pages[fw.CID] = fw.cr_page(budget=200000, spent=199900)       # $1 left: below the floor
        rc, out = c.run(footage=[c.seeder(videos=3)])
        self.assertEqual(rc, 0)
        self.assertEqual(len(c.world.posts), 0, "a campaign out of budget must not post")
        live = setting(c, "campaign_live.Acme Clipping")
        self.assertFalse(live["ok"])
        self.assertIn("budget", live["reason"])
        c.world.cr_pages[fw.CID] = fw.cr_page(budget=200000, spent=5000)         # topped up
        rc, out = c.run(advance={"hours": 4})
        self.assertGreater(len(c.world.posts), 0, "it should resume by itself")
        self.assertTrue(setting(c, "campaign_live.Acme Clipping")["ok"])

    def test_content_rewards_500_keeps_last_status_and_keeps_posting(self):
        c = self.c
        c.world.cr_pages[fw.CID] = 500
        rc, out = c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(rc, 0)
        self.assertIn("live check failed", out)
        self.assertGreater(len(c.world.posts), 0)

    def test_zernio_key_missing_clips_but_does_not_post_and_alerts(self):
        c = self.c
        c.key = None
        c.topic = fw.SENTINEL_TOPIC
        rc, out = c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(rc, 0)
        self.assertIn("ZERNIO_API_KEY is not set", out)
        self.assertEqual(c.world.posts, [])
        self.assertEqual(len(q(c, "SELECT 1 FROM clips WHERE status='approved'")), 2)      # still queued
        self.assertTrue([m for m in c.world.ntfy if m["headers"].get("title") == "Posting is off"])

    def test_zernio_key_rejected_401_is_reported_not_crashing(self):
        c = self.c
        c.world.accounts_status = 401
        rc, out = c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(rc, 0)
        self.assertEqual(c.world.posts, [])
        self.assertTrue(any("rejected the API key" in e or "no tiktok account" in e.lower() or "wait" in e.lower()
                            for e in json.loads(self._last_cycle(c))["upload_errors"] + json.loads(self._last_cycle(c))["notes"]),
                        self._last_cycle(c))

    def _last_cycle(self, c):
        lines = (c.home / "ws" / "logs" / "autopilot.jsonl").read_text(encoding="utf-8").strip().splitlines()
        return lines[-1]

    def test_zernio_5xx_on_post_retries_inside_the_call_then_succeeds(self):
        c = self.c
        c.world.post_fail = [503, 502]
        orig_sleep = fw.zernio.time.sleep
        fw.zernio.time.sleep = lambda s: None
        try:
            rc, out = c.run(footage=[c.seeder(videos=1)])
        finally:
            fw.zernio.time.sleep = orig_sleep
        self.assertEqual(rc, 0)
        self.assertEqual(len(c.world.posts), 1)

    def test_zernio_down_all_run_errors_recorded_and_next_run_posts_once(self):
        c = self.c
        c.world.post_fail = [500] * 40
        orig_sleep = fw.zernio.time.sleep
        fw.zernio.time.sleep = lambda s: None
        try:
            rc, out = c.run(footage=[c.seeder(videos=2)])
        finally:
            fw.zernio.time.sleep = orig_sleep
        self.assertEqual(rc, 0)
        self.assertEqual(c.world.posts, [])
        self.assertTrue(json.loads(self._last_cycle(c))["upload_errors"])
        self.assertTrue([m for m in c.world.ntfy if False] == [])
        c.world.post_fail = []
        rc, out = c.run(advance={"hours": 4})
        self.assertEqual(len(c.world.posts), 2)
        self.assertEqual(len({p["caption"] for p in c.world.posts}), 2)

    def test_no_accounts_matching_the_brand_posts_nothing_and_says_why(self):
        c = self.c
        c.world.accounts = [{"_id": "x1", "platform": "tiktok", "username": "somebody.else"}]
        rc, out = c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(rc, 0)
        self.assertEqual(c.world.posts, [])
        self.assertIn("no tiktok account connected", self._last_cycle(c).lower())

    def test_zero_accounts_connected(self):
        c = self.c
        c.world.accounts = []
        rc, out = c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(rc, 0)
        self.assertEqual(c.world.posts, [])

    def test_account_added_later_is_picked_up_by_the_star_rule(self):
        c = self.c
        c.world.accounts = [{"_id": "tt1", "platform": "tiktok", "username": "acme.clips1"}]
        c.run(footage=[c.seeder(videos=6)])
        self.assertEqual({p["account"] for p in c.world.posts}, {"acme.clips1"})
        c.world.accounts.append({"_id": "tt3", "platform": "tiktok", "username": "acme.third"})
        c.run(advance={"hours": 8})
        self.assertIn("acme.third", {p["account"] for p in c.world.posts})

    def test_two_campaigns_post_to_their_own_brand_accounts_only(self):
        c = self.c
        c.add_campaign("Other Finance Clipping", fw.CID2, slideshows=False, match="other")
        c.world.accounts.append({"_id": "tt9", "platform": "tiktok", "username": "other.finance"})
        c.run(footage=[c.seeder(videos=3, campaign=0, tag="a"), c.seeder(videos=3, campaign=1, tag="b")])
        for p in c.world.posts:
            brand = "acme" if "Acme" in p["caption"] or "sa" in p["caption"] else None
            if "Seeded video a" in p["caption"]:
                self.assertTrue(p["account"].startswith("acme."), p)
            if "Seeded video b" in p["caption"]:
                self.assertEqual(p["account"], "other.finance")

    def test_ntfy_failure_never_breaks_the_run(self):
        c = self.c
        c.topic = fw.SENTINEL_TOPIC
        c.world.ntfy_ok = False
        rc, out = c.run(footage=[c.seeder(videos=1)])
        self.assertEqual(rc, 0)
        self.assertGreater(len(c.world.posts), 0)

    def test_dst_boundary_new_york_window(self):
        # Sunday 1 Nov 2026 the clocks fall back: 12:30 UTC is 07:30 EST (closed), 13:30 UTC is 08:30 EST (open).
        c = fw.Cloud(start=(2026, 11, 1, 12, 30), slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=1)])
            self.assertEqual(c.world.posts, [], "07:30 New York is before the window")
            c.run(advance={"hours": 1})
            self.assertEqual(len(c.world.posts), 1, "08:30 New York is inside the window")
        finally:
            c.close()

    # ------------------------------------------------------------------ crash safety
    def test_runner_lost_right_after_posting_does_not_repost_the_clip(self):
        """The worst case: Zernio accepted the post, then the runner died before ANY state was pushed (SIGKILL, host lost:
        no finally block, no checkpoint). The next run restores the older state and sees the clip as not posted. It sends the
        same Idempotency-Key, so Zernio hands back the original post and nothing is published twice."""
        c = self.c
        c.clock.set(2026, 10, 26, 3, 0)                       # 23:00 New York: outside the window, clips just queue
        c.run(footage=[c.seeder(videos=1)])                   # run A: state saved with one clip waiting
        self.assertEqual(c.world.posts, [])
        real = cr.save_state
        cr.save_state = lambda msg: None                      # run B posts, but its state never reaches the branch
        try:
            rc, out = c.run(advance={"hours": 10})            # 09:00 New York
        finally:
            cr.save_state = real
        self.assertEqual(len(c.world.posts), 1)
        c.run(advance={"hours": 8})                           # run C restores run A's state
        self.assertEqual(len(c.world.posts), 1, "the clip was posted twice after the crash")
        self.assertGreaterEqual(c.world.idem_hits, 1, "Zernio should have been asked again with the same idempotency key")

    def test_a_crash_inside_the_run_still_saves_the_state(self):
        """cloud_runner's finally block pushes the state when a step raises, so the posted clip is remembered."""
        c = self.c
        c.run(footage=[c.seeder(videos=1)])
        n = len(c.world.posts)
        self.assertGreaterEqual(n, 1)
        ws = c.checkout_branch(c.tmp / "after")
        db = sqlite3.connect(ws / "ws" / "jobs.db")
        try:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM uploads").fetchone()[0], n)
        finally:
            db.close()


class WarmupAndScheduling(unittest.TestCase):
    """The brain's account modes and planned post times, seen from outside."""

    def test_new_pages_warm_up_one_post_a_day_and_the_state_says_so(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False, warmup=True)
        try:
            c.run(footage=[c.seeder(videos=6)])
            per = {}
            for p in c.world.posts:
                per[p["account"]] = per.get(p["account"], 0) + 1
            self.assertEqual(per, {"acme.clips1": 1, "acme.clips2": 1}, "day 1 of the warm-up is one post a day in total")
            st = setting(c, "account_state.tiktok/acme.clips1")
            self.assertEqual(st["mode"], "warmup")
            c.run(advance={"hours": 9})                       # same day, later: the day's one post is used up
            self.assertEqual(len(c.world.posts), 2)
            c.run(advance={"days": 1, "hours": -9})           # day 2: one more each
            self.assertEqual(len(c.world.posts), 4)
        finally:
            c.close()

    def test_warmup_can_be_switched_off_by_a_setting(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False, warmup=False)
        try:
            c.run(footage=[c.seeder(videos=1, slides=1)])
            self.assertEqual(len(c.world.posts), 4)           # video + slideshow for each of two pages
        finally:
            c.close()

    def test_slots_are_stable_for_the_same_day_and_never_the_same_minute(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=2, slides=2)])
            minutes = [p["scheduled_utc"].replace(second=0) for p in c.world.posts]
            self.assertEqual(len(minutes), len(set(minutes)))
            self.assertTrue(all(p["scheduled_utc"] > p["at"] for p in c.world.posts))
        finally:
            c.close()

    def test_a_scheduled_post_gets_its_link_after_it_is_due(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=1)])
            ws = c.ws()
            before = [dict(r) for r in ws.q("SELECT state, url FROM uploads")]
            ws.close()
            self.assertTrue(all(r["state"] == "processing" and not r["url"] for r in before), before)
            c.run(advance={"hours": 12})                      # every slot of that day has passed
            ws = c.ws()
            after = [dict(r) for r in ws.q("SELECT state, url FROM uploads")]
            ws.close()
            self.assertTrue(all(r["state"] == "live" and r["url"] for r in after), after)
        finally:
            c.close()

    def test_zernio_refusing_schedules_falls_back_to_posting_at_once(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)
        route = c.world.route

        def refuse(method, url, host, rec):
            if host == "zernio.com" and url.endswith("/posts") and method == "POST" and b"scheduledFor" in (rec["body"] or b""):
                return c.world.j(400, {"error": "scheduling is not available on this plan"})
            return route(method, url, host, rec)
        c.world.route = refuse
        try:
            c.run(footage=[c.seeder(videos=1)])
            self.assertEqual(len(c.world.posts), 2, "one video per page, posted at once")
            self.assertTrue(all("scheduledFor" not in p["body"] for p in c.world.posts))
        finally:
            c.close()


class LifecycleScenarios(unittest.TestCase):
    """Written for the autopilot brain (AUTOPILOT_CONTRACT.md). Un-skip after the lifecycle branch is merged."""

    @unittest.skip("needs lifecycle")
    def test_campaign_runs_dry_standby_promoted_accounts_moved(self):
        c = fw.Cloud(slideshows=False)
        try:
            c.add_campaign("Standby Finance", fw.CID2, slideshows=False, match="standby")
            c.world.accounts += [{"_id": "tt9", "platform": "tiktok", "username": "standby.clips"}]
            c.run(footage=[c.seeder(videos=3, campaign=0, tag="a"), c.seeder(videos=3, campaign=1, tag="b")])
            c.world.cr_pages[fw.CID] = fw.cr_page(budget=200000, spent=199990)          # the first one runs dry
            c.run(advance={"hours": 4})
            st = setting(c, "campaign_state.Acme Clipping")
            self.assertEqual(st["state"], "paused")
            st2 = setting(c, "campaign_state.Standby Finance")
            self.assertEqual(st2["state"], "active")
            log = setting(c, "switch.log")
            kinds = [e["kind"] for e in log]
            self.assertIn("paused", kinds)
            self.assertIn("promoted", kinds)
            self.assertIn("account_moved", kinds)
            moved = setting(c, "account_state.tiktok/acme.clips1")
            self.assertNotEqual(moved["campaign"], "Acme Clipping")
        finally:
            c.close()

    @unittest.skip("needs lifecycle")
    def test_key_missing_shows_in_the_launch_checklist(self):
        c = fw.Cloud(slideshows=False)
        c.key = None
        try:
            c.run(footage=[c.seeder(videos=1)])
            items = {i["id"]: i for i in setting(c, "launch.checklist")}
            self.assertFalse(items["zernio_key"]["done"])
            self.assertIn("ZERNIO_API_KEY", items["zernio_key"]["how"])
        finally:
            c.close()

    @unittest.skip("needs lifecycle")
    def test_limited_account_is_rested_and_others_keep_posting(self):
        c = fw.Cloud(slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=6)])
            # Zernio starts answering "limit reached" for one account only
            c.run(advance={"hours": 8})
            acct = setting(c, "account_state.tiktok/acme.clips1")
            self.assertIn(acct["health"], ("limited", "error"))
            self.assertIn(acct["mode"], ("cooldown", "idle", "slow"))
            posts_other = [p for p in c.world.posts if p["account"] == "acme.clips2"]
            self.assertTrue(posts_other)
        finally:
            c.close()

    @unittest.skip("needs lifecycle")
    def test_zernio_500s_for_a_whole_run_are_logged_in_run_history(self):
        c = fw.Cloud(slideshows=False)
        try:
            c.world.post_fail = [500] * 50
            c.run(footage=[c.seeder(videos=2)])
            hist = setting(c, "runs.history")
            self.assertGreaterEqual(hist[-1]["errors"], 1)
            self.assertEqual(hist[-1]["posted"], 0)
        finally:
            c.close()

    @unittest.skip("needs lifecycle")
    def test_duplicate_post_protection_after_a_crash_mid_run(self):
        """With the brain merged: a clip whose Zernio post was accepted right before a crash must not be posted again
        (a 'posting' marker is written before the call and reconciled against Zernio's post list next run)."""
        c = fw.Cloud(slideshows=False)
        try:
            real = cr.prune_posted
            cr.prune_posted = lambda ws: (_ for _ in ()).throw(RuntimeError("runner lost"))
            try:
                c.run(footage=[c.seeder(videos=1)], catch=True)
            finally:
                cr.prune_posted = real
            c.run(advance={"hours": 8})
            self.assertEqual(len(c.world.posts), 1)
        finally:
            c.close()


if __name__ == "__main__":
    unittest.main()
