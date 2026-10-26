"""
Resilience tests: the cloud autopilot must degrade gracefully (a clear message, other work continues) when the world is
broken, hostile, huge or odd. Same fake world as test_e2e_cloud (tests/fakeworld.py): fake Content Rewards, Zernio, ntfy,
a bare git repo as origin, fresh VM for every run.

  python -X utf8 -m unittest tests.test_resilience -v     (from clipper/, about 4-5 minutes)

A test marked @expectedFailure documents a REAL failure that is also listed in docs/features/qa.md ("Bugs for the lead").
When the lead fixes it, the test shows as an "unexpected success": remove the decorator.
"""

from __future__ import annotations

import datetime as dt
import errno
import json
import os
import sqlite3
import sys
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fakeworld as fw  # noqa: E402
import cloud_runner as cr  # noqa: E402
import pipeline as pl  # noqa: E402


def last_cycle(c: fw.Cloud) -> dict:
    lines = (c.home / "ws" / "logs" / "autopilot.jsonl").read_text(encoding="utf-8").strip().splitlines()
    return json.loads(lines[-1])


def posts_count(c):
    return len(c.world.posts)


class Base(unittest.TestCase):
    slideshows = False

    def setUp(self):
        self.c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=self.slideshows)

    def tearDown(self):
        self.c.close()


# ----------------------------------------------------------------------------------------------- broken state

class BrokenState(Base):
    def test_corrupted_settings_values_do_not_stop_the_run(self):
        """BUG 7 (qa.md): pipeline.WS.setting() does json.loads() on the stored text with no guard, and cloud_runner calls it
        for campaign_live.*, supply.*, leads.* ... So ONE unreadable settings value (a half-written row, a manual edit) raises
        out of refresh_live() and ends every run, every 4 hours, until someone repairs the database by hand. Fix: catch
        ValueError in WS.setting() and return the default."""
        c = self.c
        c.run(footage=[c.seeder(videos=1)])              # a normal run first, so state exists
        before = posts_count(c)
        bad = c.edit_db("INSERT OR REPLACE INTO settings(key, value) VALUES('campaign_live.Acme Clipping', '{not json')")
        bad2 = c.edit_db("INSERT OR REPLACE INTO settings(key, value) VALUES('supply.days_left', '')")
        bad3 = c.edit_db("INSERT OR REPLACE INTO settings(key, value) VALUES('leads.discovered', 'null null')")
        rc, out = c.run(advance={"hours": 8}, footage=[bad, bad2, bad3, c.seeder(videos=2, tag="n")], catch=True)
        self.assertNotEqual(rc, 99, "one corrupted setting stopped the whole run:\n" + out[-900:])
        self.assertGreater(posts_count(c), before)

    def test_corrupted_autopilot_policy_setting_is_repaired_each_run(self):
        c = self.c
        c.run(footage=[c.seeder(videos=1)])
        bad = c.edit_db("INSERT OR REPLACE INTO settings(key, value) VALUES('autopilot.max_uploads_per_day', '\"two\"')")
        rc, out = c.run(advance={"hours": 8}, footage=[bad, c.seeder(videos=2, tag="n")], catch=True)
        self.assertNotEqual(rc, 99, out[-900:])     # configure() rewrites the key before the cycle reads it

    def test_truncated_sqlite_database_fails_loudly_and_does_not_overwrite_good_state(self):
        c = self.c
        c.run(footage=[c.seeder(videos=2)])
        good_commit = fw._git("rev-parse", "clipper-cloud", cwd=c.origin).strip()
        db = c.checkout_branch(c.tmp / "damage")
        raw = (db / "ws" / "jobs.db").read_bytes()
        (db / "ws" / "jobs.db").write_bytes(raw[: len(raw) // 3])        # truncated in the middle of a page
        fw._git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "damage", cwd=db)
        fw._git("push", "-qf", "origin", "HEAD:clipper-cloud", cwd=db)
        rc, out = c.run(advance={"hours": 8}, catch=True)
        self.assertNotEqual(rc, 0, "a corrupted database must not look like a healthy run")
        self.assertRegex(out, r"(?i)database|malformed|jobs\.db|sqlite")
        self.assertEqual(c.world.posts[2:], [], "nothing may be posted from a state that cannot be read")

    def test_empty_database_file_starts_fresh_without_crashing(self):
        c = self.c
        c.run(footage=[c.seeder(videos=1)])
        db = c.checkout_branch(c.tmp / "damage")
        (db / "ws" / "jobs.db").write_bytes(b"")
        fw._git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "damage", cwd=db)
        fw._git("push", "-qf", "origin", "HEAD:clipper-cloud", cwd=db)
        rc, out = c.run(advance={"hours": 8}, catch=True)
        self.assertEqual(rc, 0, out[-800:])

    def test_corrupted_cloud_state_file_json(self):
        """Regression: a damaged cloud_state.json (it holds the 'already notified' and Drive 'seen' bookkeeping) once stopped every run."""
        c = self.c
        c.run(footage=[c.seeder(videos=1)])
        db = c.checkout_branch(c.tmp / "damage")
        (db / "cloud_state.json").write_text("{broken", encoding="utf-8")
        fw._git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qam", "damage", cwd=db)
        fw._git("push", "-qf", "origin", "HEAD:clipper-cloud", cwd=db)
        rc, out = c.run(advance={"hours": 8}, catch=True)
        self.assertNotEqual(rc, 99, "a damaged cloud_state.json (notified/digest/drive_seen bookkeeping) killed the run:\n" + out[-600:])

    def test_missing_transcripts_do_not_break_supply_or_slideshows(self):
        c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=True)
        try:
            c.run(footage=[lambda: c.make_footage("ep1", 60)])

            def wipe():
                for p in (c.home / "ws" / "sources").rglob("transcript.json"):
                    p.unlink()
            rc, out = c.run(advance={"hours": 8}, footage=[wipe], catch=True)
            self.assertEqual(rc, 0, out[-800:])
        finally:
            c.close()

    def test_empty_footage_folder_and_no_clips_at_all(self):
        c = self.c
        rc, out = c.run()
        self.assertEqual(rc, 0, out[-800:])
        self.assertEqual(posts_count(c), 0)
        data = json.loads(c.branch_file("site/data.json"))
        self.assertEqual(data["stats"]["posts"], 0)
        self.assertEqual(c.branch_commits(), 1)

    def test_footage_file_that_is_not_a_video(self):
        c = self.c

        def junk():
            d = c.home / "footage" / "acme-clipping"
            d.mkdir(parents=True, exist_ok=True)
            (d / "broken.mp4").write_bytes(b"this is not a video" * 500)
            (d / "zero.mp4").write_bytes(b"")
        rc, out = c.run(footage=[junk, c.seeder(videos=1)], catch=True)
        self.assertEqual(rc, 0, out[-800:])
        self.assertEqual(posts_count(c), 1, "the good seeded clip should still post")

    def test_no_state_branch_yet_and_origin_unreachable_for_push(self):
        c = self.c
        real = cr.save_state

        def failing(msg):
            raise RuntimeError("could not push the state branch")
        cr.save_state = failing
        try:
            rc, out = c.run(footage=[c.seeder(videos=1)], catch=True)
        finally:
            cr.save_state = real
        self.assertEqual(rc, 99)
        self.assertIn("could not push the state branch", out)


# ----------------------------------------------------------------------------------------------- bad inputs (briefs)

class BadBriefs(Base):
    def _break(self, edit):
        """Add a second, broken campaign next to the good one; return (rc, out)."""
        c = self.c
        f = c.add_campaign("Broken Brand", fw.CID2, match="broken")
        data = json.loads(f.read_text())
        edit(data)
        f.write_text(json.dumps(data))
        c.world.accounts.append({"_id": "tt7", "platform": "tiktok", "username": "broken.clips"})
        return c.run(footage=[c.seeder(videos=2, campaign=0)], catch=True)

    def check_good_campaign_still_posts(self, what):
        rc, out = self._rc, self._out
        self.assertNotEqual(rc, 99, f"{what}: ONE bad brief stopped every campaign:\n{out[-700:]}")
        self.assertGreater(posts_count(self.c), 0, what)

    def run_case(self, what, edit):
        self._rc, self._out = self._break(edit)
        self.check_good_campaign_still_posts(what)

    def test_cpm_is_text(self):
        """cpm as text in ONE brief must not stop the other campaigns (steps are isolated now)."""
        self.run_case("cpm text", lambda d: d.update(cpm="five dollars"))

    def test_platforms_is_a_string(self):
        self.run_case("platforms string", lambda d: d.update(platforms="tiktok"))

    def test_sources_is_null(self):
        """BUG 8 (qa.md): cloud_runner.link_footage() is the one loop over the briefs that still has no per-campaign guard:
        `for src in c.get("sources", [])` raises when a brief has "sources": null, and the whole run stops."""
        self.run_case("sources null", lambda d: d.update(sources=None))

    def test_name_missing(self):
        self.run_case("name missing", lambda d: d.pop("name"))

    def test_permission_block_missing(self):
        self.run_case("permission missing", lambda d: d.pop("permission"))

    def test_clip_block_missing(self):
        self.run_case("clip missing", lambda d: d.pop("clip"))

    def test_accounts_list_of_numbers(self):
        self.run_case("accounts numbers", lambda d: d.update(accounts={"tiktok": [1, 2, None]}))

    def test_min_greater_than_max(self):
        self.run_case("min > max", lambda d: d["clip"].update(min=90, max=10))

    def test_automation_allowed_must_be_the_json_value_true(self):
        """A truthy string is not permission: clips of such a campaign must not be posted either."""
        c = self.c
        f = c.add_campaign("String Yes", fw.CID2, match="stringyes")
        d = json.loads(f.read_text())
        d["automation_allowed"] = "yes"
        f.write_text(json.dumps(d))
        c.world.accounts.append({"_id": "tt7", "platform": "tiktok", "username": "stringyes.clips"})
        c.run(footage=[c.seeder(videos=1, campaign=1)], catch=True)
        self.assertEqual([p for p in c.world.posts if p["account"] == "stringyes.clips"], [],
                         "only the JSON value true may switch a campaign on, never a truthy string")

    def test_a_brief_switched_to_no_automation_stops_its_already_queued_clips(self):
        """Regression: the posting step used to post every approved clip whose brief file still existed. If the rules change
        (automation_allowed false, or the lifecycle marks the campaign blocked) clips already approved must stop."""
        c = self.c
        c.clock.set(2026, 10, 26, 3, 0)                      # 23:00 New York: outside the window, so clips just queue
        c.run(footage=[c.seeder(videos=2)])
        self.assertEqual(c.world.posts, [])
        d = json.loads(c.campaign_files[0].read_text())
        d["automation_allowed"] = False
        c.campaign_files[0].write_text(json.dumps(d))
        c.run(advance={"hours": 10}, catch=True)             # 09:00 New York
        self.assertEqual(c.world.posts, [], "a campaign that no longer allows automation still posted")

    def test_brief_file_that_is_not_json(self):
        c = self.c
        (c.camp_dir / "garbage.json").write_text("<html>oops", encoding="utf-8")
        c.campaign_files.append(c.camp_dir / "garbage.json")
        rc, out = c.run(footage=[c.seeder(videos=1)], catch=True)
        self.assertNotEqual(rc, 99, out[-700:])

    def test_unicode_rtl_and_emoji_everywhere(self):
        c = self.c
        name = "Тест ‮עברית \U0001f4b8 Clipping ​́"
        f = c.add_campaign(name, fw.CID2, match="emoji")
        c.world.accounts.append({"_id": "tt6", "platform": "tiktok", "username": "emoji\U0001f525clips"})
        c.topic = fw.SENTINEL_TOPIC
        c.world.cr_pages[fw.CID2] = fw.cr_page(name=name, org="\U0001f4b8", budget=200000, spent=199999)   # paused: alert
        rc, out = c.run(footage=[c.seeder(videos=2, campaign=1, prefix="\U0001f525‮ rtl title สวัส")],
                        catch=True)
        self.assertEqual(rc, 0, out[-900:])
        data = json.loads(c.branch_file("site/data.json").decode("utf-8"))
        self.assertTrue(any(name == x["name"] for x in data["campaigns"]))
        self.assertEqual(c.world.unexpected, [])
        # the alert title is ASCII only (HTTP header) but still sent
        for m in c.world.ntfy:
            m["headers"]["title"].encode("ascii")

    def test_extremely_long_titles_and_captions(self):
        c = self.c
        c.run(footage=[c.seeder(videos=2)])
        ws = c.ws()
        ws.x("UPDATE clips SET title=?, caption=?, text=?", ("T" * 20000, "C" * 300000, "word " * 40000))
        ws.x("UPDATE clips SET status='approved'")
        ws.x("DELETE FROM uploads")
        ws.close()
        rc, out = c.run(advance={"hours": 8}, catch=True)
        self.assertEqual(rc, 0, out[-700:])
        size = len(c.branch_file("site/data.json"))
        self.assertLess(size, 8_000_000, f"data.json is {size / 1e6:.1f} MB: very long captions are copied into the public dashboard data")

    def test_hostile_campaign_name_with_slashes_and_dots(self):
        c = self.c
        f = c.add_campaign("../../evil/..\\x", fw.CID2, match="evilx")
        self.assertTrue(f.resolve().is_relative_to(c.camp_dir.resolve()))
        rc, out = c.run(footage=[c.seeder(videos=1)], catch=True)
        self.assertNotEqual(rc, 99, out[-700:])
        outside = [p for p in c.tmp.rglob("evil*") if c.camp_dir not in p.parents and p.name.startswith("evil")]
        self.assertEqual(outside, [])


# ----------------------------------------------------------------------------------------------- bad outside world

class BadWorld(Base):
    def test_drive_folder_listing_fails(self):
        c = self.c
        data = json.loads(c.campaign_files[0].read_text())
        data["footage_drive_folder"] = "folderXYZ"
        c.campaign_files[0].write_text(json.dumps(data))

        class Boom:
            @staticmethod
            def download_folder(**kw):
                raise OSError("Cannot retrieve the public link of the file. Permission denied")

            @staticmethod
            def download(**kw):
                raise OSError("x")
        sys.modules["gdown"] = Boom
        try:
            rc, out = c.run(drive=True, footage=[c.seeder(videos=1)], catch=True)
        finally:
            sys.modules.pop("gdown", None)
        self.assertEqual(rc, 0, out[-800:])
        self.assertIn("Drive folder not listed", out)
        self.assertEqual(posts_count(c), 1)

    def test_drive_download_of_one_file_fails_the_others_continue(self):
        """BUG 3 (qa.md): cloud_runner.sync_drive() adds a file id to `drive_seen` even when its download raised
        (quota, timeout, a Google hiccup). The file is then never fetched again: a transient error silently loses footage.
        Only a file that was downloaded and converted (or is permanently unusable, e.g. too large) should be remembered."""
        c = self.c
        data = json.loads(c.campaign_files[0].read_text())
        data["footage_drive_folder"] = "folderXYZ"
        c.campaign_files[0].write_text(json.dumps(data))
        done = []

        class F:
            def __init__(self, i, p):
                self.id, self.path = i, p

        class G:
            @staticmethod
            def download_folder(**kw):
                return [F("a", "bad.mp4"), F("b", "good.mp4")]

            @staticmethod
            def download(id=None, output=None, quiet=True):
                if id == "a":
                    raise OSError("quota exceeded")
                import subprocess
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=10:duration=3",
                                "-pix_fmt", "yuv420p", output], check=True)
                done.append(id)
        sys.modules["gdown"] = G
        try:
            rc, out = c.run(drive=True, catch=True)
        finally:
            sys.modules.pop("gdown", None)
        self.assertEqual(rc, 0, out[-800:])
        self.assertEqual(done, ["b"])
        self.assertIn("skip bad.mp4", out)
        state = json.loads((c.home / "cloud_state.json").read_text())
        self.assertEqual(state["drive_seen"], ["b"], "the failed file must be retried next run, the good one remembered")

    def test_content_rewards_returns_a_changed_html_page(self):
        c = self.c
        c.world.cr_pages[fw.CID] = "<html><body><h1>We changed our site</h1></body></html>"
        c.world.cr_discover = "<html>no ids here</html>"
        rc, out = c.run(argv=[], footage=[c.seeder(videos=1)], catch=True)
        self.assertEqual(rc, 0, out[-800:])
        self.assertIn("live check failed", out)
        self.assertEqual(posts_count(c), 1, "an unreadable page must not pause a campaign")

    def test_content_rewards_discover_500(self):
        c = self.c
        c.world.cr_discover = 500
        rc, out = c.run(argv=[], footage=[c.seeder(videos=1)], catch=True)
        self.assertEqual(rc, 0, out[-800:])
        self.assertEqual(posts_count(c), 1)

    def test_discover_ranks_new_campaigns_and_stores_leads(self):
        c = self.c
        rc, out = c.run(argv=[], footage=[c.seeder(videos=1)], catch=True)
        self.assertEqual(rc, 0, out[-800:])
        leads = json.loads((c.branch_file("leads.json")))
        self.assertTrue(any("Other Finance" in x["name"] for x in leads), leads)

    def test_zernio_401_in_the_middle_of_a_batch(self):
        c = self.c
        c.world.accounts = [{"_id": f"tt{i}", "platform": "tiktok", "username": f"acme.a{i}"} for i in range(3)]
        c.world.post_fail = [0, 401, 401, 401, 401, 401, 401, 401]       # first post fine, then the key is revoked
        rc, out = c.run(footage=[c.seeder(videos=4)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        self.assertEqual(posts_count(c), 1)
        errs = last_cycle(c)["upload_errors"]
        self.assertTrue(errs)
        ws = c.ws()
        try:
            posted = ws.q("SELECT COUNT(*) n FROM uploads")[0]["n"]
            waiting = ws.q("SELECT COUNT(*) n FROM clips WHERE status='approved' AND id NOT IN (SELECT clip_id FROM uploads)")[0]["n"]
        finally:
            ws.close()
        self.assertEqual(posted, 1)
        self.assertEqual(waiting, 3, "the unposted clips must stay queued for the next run")
        c.world.post_fail = []
        c.run(advance={"hours": 8})
        self.assertEqual(posts_count(c), 4, "after the key is fixed every queued clip goes out once")

    def test_zernio_429_rate_limit_stops_that_account_not_everything(self):
        c = self.c
        c.world.accounts = [{"_id": "tt1", "platform": "tiktok", "username": "acme.one"},
                            {"_id": "tt2", "platform": "tiktok", "username": "acme.two"}]
        c.world.post_fail = [429] * 4 + [0] * 20            # the first account's tries hit the limit (4 retries), then fine
        rc, out = c.run(footage=[c.seeder(videos=4)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        self.assertGreaterEqual(posts_count(c), 1, "the other account should keep posting")
        self.assertIn("limit", " ".join(last_cycle(c)["upload_errors"]).lower())

    def test_zernio_returns_html_instead_of_json(self):
        c = self.c
        route = c.world.route

        def html(method, url, host, rec):
            if host == "zernio.com":
                return 200, b"<html>Wi-Fi login required</html>"
            return route(method, url, host, rec)
        c.world.route = html
        rc, out = c.run(footage=[c.seeder(videos=2)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        self.assertEqual(posts_count(c), 0)

    def test_zernio_network_drops_mid_upload(self):
        c = self.c
        n = {"put": 0}
        route = c.world.route

        def flaky(method, url, host, rec):
            if host == "storage.fakezernio.test":
                n["put"] += 1
                if n["put"] <= 5:
                    raise ConnectionResetError("connection reset by peer")
            return route(method, url, host, rec)
        c.world.route = flaky
        rc, out = c.run(footage=[c.seeder(videos=2)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        self.assertGreaterEqual(posts_count(c), 1)
        self.assertEqual(len({p["caption"] for p in c.world.posts}), posts_count(c))

    def test_analytics_down_posts_still_tracked_without_views(self):
        c = self.c
        c.world.analytics_status = 500
        rc, out = c.run(footage=[c.seeder(videos=2)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        data = json.loads(c.branch_file("site/data.json"))
        self.assertEqual(data["stats"]["posts"], posts_count(c))

    def test_zernio_publishes_but_returns_no_link_then_link_found_next_run(self):
        c = self.c
        c.world.drop_url = True
        c.run(footage=[c.seeder(videos=1)])
        ws = c.ws()
        try:
            self.assertEqual(ws.q("SELECT state, url FROM uploads")[0]["state"], "processing")
        finally:
            ws.close()
        c.world.drop_url = False
        c.run(advance={"hours": 8})
        ws = c.ws()
        try:
            row = ws.q("SELECT state, url FROM uploads")[0]
        finally:
            ws.close()
        self.assertEqual(row["state"], "live")
        self.assertTrue(row["url"].startswith("https://www.tiktok.com/"))
        self.assertEqual(posts_count(c), 1)

    def test_disk_full_while_linking_footage(self):
        """BUG 8 (qa.md): link_footage() lets an OSError (disk full, permission) from the hard-link / copy escape, which
        ends the run before already-queued clips are posted. Fix: wrap each file in try/except OSError and log it."""
        c = self.c

        def full(*a, **k):
            raise OSError(errno.ENOSPC, "No space left on device")
        with mock.patch.object(cr.os, "link", full), mock.patch.object(cr.shutil, "copy2", full):
            def drop():
                c.make_footage("ep1", 20)
            rc, out = c.run(footage=[drop], catch=True)
        self.assertNotEqual(rc, 99, "a full disk while linking footage crashed the whole run (no message, no posting of queued clips):\n"
                            + out[-500:])

    def test_disk_full_when_saving_state_is_reported_clearly(self):
        c = self.c
        real = cr.sh

        def sh(cmd, *a, **k):
            if cmd[:2] == ["git", "commit"]:
                raise RuntimeError("git commit failed: error: No space left on device")
            return real(cmd, *a, **k)
        cr.sh = sh
        try:
            rc, out = c.run(footage=[c.seeder(videos=1)], catch=True)
        finally:
            cr.sh = real
        self.assertEqual(rc, 99)
        self.assertIn("No space left", out)


# ----------------------------------------------------------------------------------------------- time

class TimeEdges(unittest.TestCase):
    def window(self, y, mo, d, h, mi=0):
        return pl.in_post_hours([8, 23], "America/New_York", dt.datetime(y, mo, d, h, mi, tzinfo=dt.timezone.utc))

    def test_spring_forward_march_2026(self):
        # DST starts Sun 8 Mar 2026 at 07:00 UTC (02:00 EST -> 03:00 EDT)
        self.assertFalse(self.window(2026, 3, 7, 12, 59))       # 07:59 EST  closed
        self.assertTrue(self.window(2026, 3, 7, 13, 0))         # 08:00 EST  open
        self.assertFalse(self.window(2026, 3, 8, 11, 59))       # 07:59 EDT  closed (the clock already jumped)
        self.assertTrue(self.window(2026, 3, 8, 12, 0))         # 08:00 EDT  open
        self.assertTrue(self.window(2026, 3, 9, 2, 59))         # 22:59 EDT  open
        self.assertFalse(self.window(2026, 3, 9, 3, 0))         # 23:00 EDT  closed

    def test_fall_back_november_2026(self):
        # DST ends Sun 1 Nov 2026 at 06:00 UTC (02:00 EDT -> 01:00 EST)
        self.assertFalse(self.window(2026, 11, 1, 11, 59))      # 06:59 EST closed
        self.assertTrue(self.window(2026, 11, 1, 13, 0))        # 08:00 EST open
        self.assertFalse(self.window(2026, 10, 31, 11, 59))     # 07:59 EDT closed
        self.assertTrue(self.window(2026, 10, 31, 12, 0))       # 08:00 EDT open
        self.assertTrue(self.window(2026, 11, 2, 3, 59))        # 22:59 EST open (Mon 2 Nov)
        self.assertFalse(self.window(2026, 11, 2, 4, 0))        # 23:00 EST closed

    def test_fallback_without_tz_database_matches_zoneinfo_for_years(self):
        """Windows without tzdata use a hand-written US Eastern rule: it must agree with the real database every hour."""
        from zoneinfo import ZoneInfo
        real = ZoneInfo("America/New_York")
        bad = []
        t = dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)
        with mock.patch.dict(sys.modules, {"zoneinfo": None}):
            while t.year < 2031:
                got = pl.now_in_tz("America/New_York", t)
                want = t.astimezone(real)
                if got is None or (got.hour != want.hour or got.day != want.day):
                    bad.append(t.isoformat())
                    if len(bad) > 5:
                        break
                t += dt.timedelta(hours=1)
        self.assertEqual(bad, [])

    def test_windows_that_cross_midnight(self):
        self.assertTrue(pl.in_post_hours([20, 2], "America/New_York", dt.datetime(2026, 7, 1, 1, 0, tzinfo=dt.timezone.utc)))   # 21:00 EDT
        self.assertFalse(pl.in_post_hours([20, 2], "America/New_York", dt.datetime(2026, 7, 1, 8, 0, tzinfo=dt.timezone.utc)))  # 04:00 EDT

    def test_unknown_timezone_name_does_not_block_posting_forever(self):
        self.assertTrue(pl.in_post_hours([8, 23], "Mars/Olympus", dt.datetime(2026, 7, 1, 8, 0, tzinfo=dt.timezone.utc)))

    def test_leap_day_run(self):
        c = fw.Cloud(start=(2028, 2, 29, 13, 0), slideshows=False)
        try:
            rc, out = c.run(footage=[c.seeder(videos=3)], catch=True)
            self.assertEqual(rc, 0, out[-700:])
            self.assertGreater(posts_count(c), 0)
            c.run(advance={"hours": 24})                         # 1 March 2028 (new day: caps reset)
            data = json.loads(c.branch_file("site/data.json"))
            self.assertEqual(data["stats"]["posts"], posts_count(c))
            days = [d["date"] for d in data["earnings"]["daily"]]
            self.assertIn("2028-02-29", days)
        finally:
            c.close()

    def test_year_end_run(self):
        c = fw.Cloud(start=(2026, 12, 31, 23, 30), slideshows=False)
        try:
            rc, out = c.run(footage=[c.seeder(videos=3)], catch=True)       # 18:30 New York on New Year's Eve
            self.assertEqual(rc, 0, out[-700:])
            c.run(advance={"hours": 8})                          # 1 Jan 2027
            self.assertEqual(c.branch_commits(), 1)
        finally:
            c.close()

    def test_clock_skew_backwards_two_days_does_not_crash_and_does_not_double_post(self):
        c = self.c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=6)])
            first = posts_count(c)
            c.clock.set(2026, 10, 24, 13, 0)                    # the runner's clock is two days behind
            rc, out = c.run(catch=True)
            self.assertEqual(rc, 0, out[-700:])
            self.assertLessEqual(posts_count(c), first, "min-gap and daily caps must hold when the clock runs backwards")
        finally:
            c.close()

    def test_clock_skew_forward_a_year(self):
        c = self.c = fw.Cloud(start=(2026, 10, 26, 13, 0), slideshows=False)
        try:
            c.run(footage=[c.seeder(videos=2)])
            c.clock.set(2027, 10, 26, 13, 0)
            rc, out = c.run(catch=True)
            self.assertEqual(rc, 0, out[-700:])
        finally:
            c.close()

    def test_daily_cap_day_follows_new_york_not_utc(self):
        """The daily cap counts days with the runner's date (UTC), and the window 08:00-22:59 New York crosses UTC midnight
        (20:00 New York). Slot planning keeps a page inside the cap in practice; this checks it on the SCHEDULED times."""
        c = self.c = fw.Cloud(start=(2026, 10, 27, 12, 0), slideshows=False)          # 08:00 EDT Tuesday
        try:
            c.world.accounts = [{"_id": "tt1", "platform": "tiktok", "username": "acme.one"}]
            c.run(footage=[c.seeder(videos=4)])                       # 08:00 NY  post 1
            c.run(advance={"hours": 7})                               # 15:00 NY  post 2 (cap reached for the UTC day)
            c.run(advance={"hours": 7})                               # 22:00 NY  = 02:00 UTC Wednesday: a new UTC day
            ny_day = [p for p in c.world.posts
                      if ((p["scheduled_utc"] or p["at"]) - dt.timedelta(hours=4)).date() == dt.date(2026, 10, 27)]
            self.assertLessEqual(len(ny_day), 2, f"{len(ny_day)} posts for one account on one New York day (cap is 2)")
        finally:
            c.close()


# ----------------------------------------------------------------------------------------------- scale

class Scale(Base):
    def test_zero_accounts_connected_everything_still_builds(self):
        c = self.c
        c.world.accounts = []
        rc, out = c.run(footage=[c.seeder(videos=3)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        data = json.loads(c.branch_file("site/data.json"))
        self.assertEqual(data["stats"]["posts"], 0)

    def test_one_hundred_accounts(self):
        c = self.c
        c.world.accounts = [{"_id": f"t{i}", "platform": "tiktok", "username": f"acme.clips{i:03d}"} for i in range(100)]
        t0 = time.time()
        rc, out = c.run(footage=[c.seeder(videos=130, slides=0)], catch=True)
        self.assertEqual(rc, 0, out[-700:])
        took = time.time() - t0
        self.assertLess(took, 240, f"100 accounts took {took:.0f}s")
        self.assertEqual(posts_count(c), 100, "one video per account per run")
        self.assertEqual(len({p["account"] for p in c.world.posts}), 100)
        data = json.loads(c.branch_file("site/data.json"))
        self.assertEqual(len(data["accounts_detail"]), 100)
        self.assertLess(len(c.branch_file("site/data.json")), 12_000_000)
        # the second run an hour later: min gap holds for every account
        c.run(advance={"hours": 1})
        self.assertEqual(posts_count(c), 100)

    def test_many_campaigns(self):
        c = self.c
        for i in range(12):
            c.add_campaign(f"Brand {i}", fw.CID2, match=f"b{i:02d}x")
            c.world.accounts.append({"_id": f"b{i}", "platform": "tiktok", "username": f"b{i:02d}x.clips"})
        seeds = [c.seeder(videos=1, campaign=k, tag=f"s{k}") for k in range(len(c.campaign_files))]
        rc, out = c.run(footage=seeds, catch=True)
        self.assertEqual(rc, 0, out[-700:])
        self.assertGreaterEqual(posts_count(c), 13)             # 12 brands + the original Acme page

    def test_a_brand_word_that_is_part_of_another_brand_does_not_steal_its_page(self):
        """BUG 11 (qa.md, low): the brand-name rule is a substring test (`match in name.lower().replace(' ', '')`), so a campaign
        whose word is contained in another brand's word ('trade' / 'tradever', 'alpha' / 'alphafutures', 'brand1' / 'brand10')
        also claims the other brand's pages, and the other campaign can be left with none. Fix: give each page to the campaign
        with the LONGEST matching word (or match on word boundaries) and warn at onboarding when two words overlap."""
        c = self.c
        c.add_campaign("Trade Inc", fw.CID2, match="trade")
        c.add_campaign("Tradever Prop", "3ee88e3e-f9dd-4ee8-8fd5-8a215dd60b2b", match="tradever")
        c.world.accounts = [{"_id": "t1", "platform": "tiktok", "username": "trade.clips"},
                            {"_id": "t2", "platform": "tiktok", "username": "tradever.clips"}]
        c.world.cr_pages["3ee88e3e-f9dd-4ee8-8fd5-8a215dd60b2b"] = fw.cr_page(name="Tradever Prop", budget=300000, spent=100)
        c.run(footage=[c.seeder(videos=1, campaign=1, tag="t", prefix="TRADEINC"),
                       c.seeder(videos=1, campaign=2, tag="v", prefix="TRADEVER")], catch=True)
        by = {p["caption"].split()[1]: p["account"] for p in c.world.posts}
        self.assertEqual(by.get("TRADEINC"), "trade.clips")
        self.assertEqual(by.get("TRADEVER"), "tradever.clips")


if __name__ == "__main__":
    unittest.main()
