"""
The launch checklist (preflight.py) and the Zernio calls the brain relies on, against a simulated API:
scheduling a post (scheduledFor + timezone), the idempotency key, duplicate-post protection, rate-limit headers,
Retry-After, account health, deleting / retrying a post.

  cd clipper && python -X utf8 -m unittest tests.test_preflight
"""

from __future__ import annotations

import datetime as dt
import json
import os
import shutil
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import accountmodes as am  # noqa: E402
import pipeline as pl  # noqa: E402
import preflight  # noqa: E402
import zernio  # noqa: E402
from test_zernio import FakeZernio  # noqa: E402

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 10, 26, 13, 0, tzinfo=UTC)


class ZernioSchedulingTests(unittest.TestCase):
    def setUp(self):
        os.environ["ZERNIO_API_KEY"] = "zk-test-key"
        self.tmp = Path(tempfile.mkdtemp())
        self.f = self.tmp / "c.mp4"
        self.f.write_bytes(b"\1" * 2048)
        zernio.RATE.clear()

    def tearDown(self):
        os.environ.pop("ZERNIO_API_KEY", None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def posts(self, api):
        return [c for c in api.calls if c["method"] == "POST" and c["url"].endswith("/posts")]

    def test_scheduled_post_sends_time_and_timezone_not_publish_now(self):
        api = FakeZernio(post_status="pending", url=False)
        seen = []
        res = zernio.upload(self.f, "tiktok", "alphafutures", "#ad hi", True, "public", True, http=api, sleep=lambda s: None,
                            schedule={"scheduledFor": "2026-10-26T18:41:00", "timezone": "America/New_York"},
                            idempotency_key="key-1", on_created=seen.append)
        body = self.posts(api)[0]["body"]
        self.assertNotIn("publishNow", body)
        self.assertEqual((body["scheduledFor"], body["timezone"]), ("2026-10-26T18:41:00", "America/New_York"))
        self.assertEqual(self.posts(api)[0]["headers"]["Idempotency-Key"], "key-1")
        self.assertEqual(body["tiktokSettings"]["commercialContentType"], "brand_content")       # still a paid partnership
        self.assertEqual(seen, ["post1"])                                                       # id handed over at once
        self.assertEqual((res["state"], res["url"], res["publish_id"]), ("processing", None, "post1"))
        self.assertEqual(res["scheduled_for"], "2026-10-26T18:41:00")
        self.assertIn("scheduled on Zernio for 2026-10-26T18:41:00", res["notes"][0])

    def test_now_is_still_the_default(self):
        api = FakeZernio()
        res = zernio.upload(self.f, "tiktok", "alphafutures", "hi", True, "public", True, http=api, sleep=lambda s: None)
        body = self.posts(api)[0]["body"]
        self.assertTrue(body["publishNow"])
        self.assertNotIn("scheduledFor", body)
        self.assertNotIn("Idempotency-Key", self.posts(api)[0]["headers"])
        self.assertEqual(res["state"], "live")

    def test_photo_carousel_can_be_scheduled_too(self):
        api = FakeZernio(post_status="pending", url=False)
        img = self.tmp / "slide_01.jpg"
        img.write_bytes(b"x")
        zernio.upload_photos([img], "tiktok", "alphafutures", "Title", "cap", True, "public", True, http=api,
                             sleep=lambda s: None, schedule={"scheduledFor": "2026-10-26T20:05:00", "timezone": "America/New_York"},
                             idempotency_key="k2")
        body = self.posts(api)[0]["body"]
        self.assertEqual(body["scheduledFor"], "2026-10-26T20:05:00")
        self.assertNotIn("publishNow", body)

    def test_a_duplicate_409_is_success_not_an_error(self):
        class Dup(FakeZernio):
            def __call__(self, method, url, data, headers, timeout=900):
                if url.endswith("/posts") and method == "POST":
                    self.calls.append({"method": method, "url": url, "body": None, "headers": headers})
                    return 409, json.dumps({"error": "This exact content is already scheduled", "details": {
                        "accountId": "tt1", "platform": "tiktok", "existingPostId": "post-old"}}).encode()
                return super().__call__(method, url, data, headers, timeout)
        got = []
        res = zernio.upload(self.f, "tiktok", "alphafutures", "hi", True, "public", True, http=Dup(), sleep=lambda s: None,
                            on_created=got.append)
        self.assertEqual((res["publish_id"], res["state"]), ("post-old", "processing"))
        self.assertEqual(got, ["post-old"])

    def test_idempotency_conflict_waits_and_asks_again(self):
        calls = {"n": 0}
        waits = []

        def http(method, url, data, headers):
            calls["n"] += 1
            if calls["n"] == 1:
                zernio._note_headers({"Retry-After": "3"})
                return 409, json.dumps({"code": "idempotency_conflict"}).encode()
            return 200, json.dumps({"post": {"_id": "p1"}}).encode()
        st, out = zernio._call("POST", "https://x/posts", {"a": 1}, {}, http, waits.append)
        self.assertEqual((st, out["post"]["_id"]), (200, "p1"))
        self.assertEqual(waits, [3])

    def test_rate_limit_headers_are_remembered_and_retry_after_is_respected(self):
        zernio._note_headers({"X-RateLimit-Limit": "60", "X-RateLimit-Remaining": "42", "X-RateLimit-Reset": "1798761660"})
        self.assertEqual((zernio.RATE["limit"], zernio.RATE["remaining"]), (60, 42))
        zernio._note_headers(None)                                      # a response without headers is fine
        waits, n = [], {"n": 0}

        def http(method, url, data, headers):
            n["n"] += 1
            if n["n"] == 1:
                zernio._note_headers({"Retry-After": "45"})
                return 429, b"{}"
            return 200, b"{}"
        zernio._call("GET", "https://x", None, {}, http, waits.append)
        self.assertEqual(waits, [45])                                   # more than the default 6 s: Zernio asked for 45
        waits.clear()
        n["n"] = 0
        zernio._note_headers({"Retry-After": "9999"})

        def http2(method, url, data, headers):
            n["n"] += 1
            if n["n"] == 1:
                zernio._note_headers({"Retry-After": "9999"})
                return 429, b"{}"
            return 200, b"{}"
        zernio._call("GET", "https://x", None, {}, http2, waits.append)
        self.assertEqual(waits, [120])                                  # capped

    def test_account_health_and_post_helpers(self):
        class Api(FakeZernio):
            def __call__(self, method, url, data, headers, timeout=900):
                self.calls.append({"method": method, "url": url, "body": None, "headers": headers})
                if url.endswith("/accounts/health"):
                    return 200, json.dumps({"summary": {}, "accounts": [
                        {"accountId": "tt1", "platform": "tiktok", "username": "a.clips", "status": "error", "canPost": False,
                         "needsReconnect": True, "issues": ["Token expired"]},
                        {"accountId": "tt2", "platform": "tiktok", "username": "b.clips", "status": "healthy", "canPost": True}]}).encode()
                if method == "DELETE":
                    return 200, b"{}"
                if url.endswith("/retry"):
                    return 200, b"{}"
                return 404, b"{}"
        api = Api()
        h = zernio.accounts_health(api, lambda s: None)
        self.assertEqual(h["tt1"]["needsReconnect"], True)
        self.assertEqual(h["a.clips"]["issues"], ["Token expired"])
        norm = am.normalize_accounts([{"_id": "tt1", "platform": "tiktok", "username": "a.clips"},
                                      {"_id": "tt2", "platform": "tiktok", "username": "b.clips"},
                                      {"_id": "ig", "platform": "instagram", "username": "c"}], h)
        self.assertEqual([(a["name"], a["usable"]) for a in norm], [("a.clips", False), ("b.clips", True)])
        self.assertEqual(norm[0]["issues"], ["Token expired"])
        self.assertTrue(zernio.delete_post("p1", api, lambda s: None))
        self.assertTrue(zernio.retry_post("p1", api, lambda s: None))
        self.assertTrue(any(c["method"] == "DELETE" and c["url"].endswith("/posts/p1") for c in api.calls))

    def test_accounts_without_health_fields_are_assumed_fine(self):
        norm = am.normalize_accounts([{"_id": "tt1", "platform": "tiktok", "username": "a"}], {"tt1": {}})
        self.assertTrue(norm[0]["usable"])
        self.assertIsNone(am.normalize_accounts(None))
        self.assertEqual(am.normalize_accounts([]), [])


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.ws = pl.WS(str(self.tmp / "ws"))

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def brief(self, name="Tradever", match="tradever", **kw):
        c = {"name": name, "automation_allowed": True, "account_match": match, "footage_drive_folder": "FOLDER1",
             "permission": {"campaign_url": "https://contentrewards.com/c/campaigns/abc"}}
        c.update(kw)
        return c

    def ctx(self, **kw):
        d = {"repo": "me/clips", "key_present": True, "zernio_valid": True,
             "accounts": am.normalize_accounts([{"_id": "t1", "platform": "tiktok", "username": "tradever.clips"}]),
             "briefs": [self.brief()], "states": {"Tradever": {"state": "active", "accounts": ["tiktok/tradever.clips"]}},
             "page_check": lambda c: (True, ""), "drive_check": lambda f: (True, ""), "branch_mb": 120.0,
             "ntfy_topic": True, "ntfy_tested": True, "rate": {"limit": 60, "remaining": 55}, "now": NOW,
             "chain": {"last_run": "2026-10-26T09:00:00Z", "stalled_hours": None}}
        d.update(kw)
        return d

    def items(self, **kw):
        return {i["id"]: i for i in preflight.run(self.ws, self.ctx(**kw))}

    def test_everything_set_up(self):
        it = self.items()
        self.assertTrue(all(it[k]["done"] for k in ("zernio_key", "zernio_accounts", "account_matches_campaign", "campaign_joined",
                                                     "rules_checked", "campaign_pages", "drive_footage", "ntfy_topic",
                                                     "state_branch", "rate_limit", "chain")))
        self.assertFalse(it["first_post"]["done"])                       # nothing posted yet
        self.assertFalse(it["dashboard_homescreen"]["done"])             # only the owner can say so
        self.assertTrue(it["dashboard_homescreen"]["manual"])
        self.assertEqual(self.ws.setting("launch.checklist")[0]["id"], "zernio_key")
        for i in it.values():
            self.assertTrue(i["how"])                                    # always a plain-English next step

    def test_missing_key_says_exactly_where_to_get_and_put_it(self):
        it = self.items(key_present=False, zernio_valid=None, accounts=None, accounts_error="ZERNIO_API_KEY is not set")
        self.assertFalse(it["zernio_key"]["done"])
        self.assertEqual(it["zernio_key"]["how"], "Open zernio.com -> API keys -> Create key; add it at "
                                                  "github.com/me/clips/settings/secrets/actions/new as ZERNIO_API_KEY")
        self.assertFalse(it["zernio_accounts"]["done"])

    def test_rejected_key_and_unreachable_zernio_are_told_apart(self):
        rej = self.items(zernio_valid=False, accounts=None, accounts_error="Zernio rejected the API key; run ...")
        self.assertIn("replace the ZERNIO_API_KEY secret", rej["zernio_key"]["how"])
        self.assertIn("rejected", rej["zernio_key"]["detail"])
        down = self.items(zernio_valid=None, accounts=None)
        self.assertIn("could not be reached", down["zernio_key"]["detail"])
        self.assertNotIn("Create key", down["zernio_key"]["how"])

    def test_a_campaign_without_a_page_names_the_exact_username_to_create(self):
        it = self.items(accounts=[], states={"Tradever": {"state": "standby", "accounts": []}})
        self.assertFalse(it["zernio_accounts"]["done"])
        self.assertFalse(it["account_matches_campaign"]["done"])
        self.assertIn("create a TikTok page with 'tradever' in its name (for example tradever.clips) and connect it in Zernio",
                      it["account_matches_campaign"]["how"])
        gen = self.items(briefs=[self.brief("Gen Co", "")], states={"Gen Co": {"state": "standby", "accounts": []}})
        self.assertIn("connect one more TikTok account in Zernio", gen["account_matches_campaign"]["how"])

    def test_disconnected_account_and_unclear_rules(self):
        bad = am.normalize_accounts([{"_id": "t1", "platform": "tiktok", "username": "tradever.clips"}],
                                    {"t1": {"needsReconnect": True}})
        it = self.items(accounts=bad)
        self.assertIn("Reconnect on: tradever.clips", it["zernio_accounts"]["how"])
        it = self.items(briefs=[self.brief(automation_allowed=None)])
        self.assertFalse(it["rules_checked"]["done"])
        self.assertIn("open its Rules tab and send the rules text to Claude", it["rules_checked"]["how"])

    def test_pages_drive_branch_rate_and_chain_problems(self):
        it = self.items(page_check=lambda c: (False, "HTTP Error 500"), drive_check=lambda f: (False, "not shared"),
                        branch_mb=900.0, rate={"limit": 60, "remaining": 3}, chain={"stalled_hours": 31.0, "last_run": "x"})
        self.assertIn("Tradever: HTTP Error 500", it["campaign_pages"]["detail"])
        self.assertIn("Anyone with the link", it["drive_footage"]["how"])
        self.assertFalse(it["state_branch"]["done"])
        self.assertIn("900 MB", it["state_branch"]["detail"])
        self.assertFalse(it["rate_limit"]["done"])
        self.assertFalse(it["chain"]["done"])
        self.assertIn("Enable workflow", it["chain"]["how"])

    def test_first_post_and_stale_links(self):
        self.ws.x("INSERT INTO sources(id, campaign, campaign_file, input, canonical, status, created, updated) "
                  "VALUES(1,'T','x','x','f:x','done',?,?)", (pl.now(), pl.now()))
        self.ws.x("INSERT INTO clips(id, source_id, campaign, title, status, created) VALUES(1,1,'T','t','posted',?)", (pl.now(),))
        old = (NOW - dt.timedelta(hours=60)).replace(tzinfo=None).isoformat(timespec="seconds")
        self.ws.x("INSERT INTO uploads(clip_id, platform, account, url, state, created) VALUES(1,'tiktok','a','https://t/1','live',?)", (old,))
        it = self.items()
        self.assertTrue(it["first_post"]["done"])
        self.assertFalse(it["links_submitted"]["done"])
        self.assertIn("Copy next link", it["links_submitted"]["how"])
        self.ws.x("UPDATE uploads SET submitted_at=?", (pl.now(),))
        self.assertTrue(self.items()["links_submitted"]["done"])

    def test_manual_ticks_written_by_the_dashboard_count(self):
        self.ws.set_setting("launch.manual", {"dashboard_homescreen": True})
        self.assertTrue(self.items()["dashboard_homescreen"]["done"])

    def test_ntfy_is_optional(self):
        it = self.items(ntfy_topic=False)
        self.assertFalse(it["ntfy_topic"]["done"])
        self.assertTrue(it["ntfy_topic"]["optional"])
        self.assertIn("NTFY_TOPIC", it["ntfy_topic"]["how"])

    def test_the_report_is_readable_and_never_contains_secrets(self):
        os.environ["ZERNIO_API_KEY"] = "SECRET-KEY-123"
        os.environ["NTFY_TOPIC"] = "SECRET-TOPIC-456"
        try:
            items = preflight.run(self.ws, self.ctx(accounts=[]))
            text = preflight.render(items)
            blob = text + json.dumps(items)
            self.assertNotIn("SECRET-KEY-123", blob)
            self.assertNotIn("SECRET-TOPIC-456", blob)
            self.assertIn("[x] Zernio API key added", text)
            self.assertIn("[ ] TikTok accounts connected in Zernio", text)
            self.assertIn("-> ", text)
            self.assertIn("thing(s) left:", text)
            self.assertIn("(you)", text)
        finally:
            os.environ.pop("ZERNIO_API_KEY")
            os.environ.pop("NTFY_TOPIC")

    def test_branch_size_is_measured_from_the_folder_when_not_given(self):
        (self.tmp / "big.bin").write_bytes(b"\0" * 2_000_000)
        items = preflight.run(self.ws, self.ctx(branch_mb=None, home=self.tmp))
        st = next(i for i in items if i["id"] == "state_branch")
        self.assertTrue(st["done"])
        self.assertRegex(st["detail"], r"^\d[\d,]* MB")


if __name__ == "__main__":
    unittest.main(verbosity=2)
