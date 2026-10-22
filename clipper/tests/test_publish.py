"""Publishing the dashboard to GitHub Pages: changed-files-only uploads, sha handling, errors, hidden money."""

import base64
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import dashboard  # noqa: E402
import pipeline as pl  # noqa: E402
import publish  # noqa: E402


class FakeGitHub:
    def __init__(self):
        self.files, self.calls, self.conflict_once = {}, [], set()

    def __call__(self, method, url, body, headers):
        self.calls.append((method, url))
        assert headers["Authorization"] == "Bearer ghp_test"
        path = url.split("/contents/", 1)[-1].split("?")[0] if "/contents/" in url else None
        if method == "GET" and url.endswith("/repos/me/site"):
            return 200, {"permissions": {"push": True}, "has_pages": True}
        if method == "GET" and path is not None and path not in self.files:   # a folder: list its direct files
            kids = [(k.rsplit("/", 1)[-1], v) for k, v in self.files.items() if (k.rsplit("/", 1)[0] if "/" in k else "") == path]
            if not kids:
                return 404, {"message": "Not Found"}
            return 200, [{"type": "file", "name": n, "sha": publish.blob_sha(v)} for n, v in kids]
        if method == "GET" and path in self.files:
            return 200, {"sha": publish.blob_sha(self.files[path])}
        if method == "PUT":
            if path in self.conflict_once:
                self.conflict_once.discard(path)
                return 409, {"message": "sha mismatch"}
            if path in self.files and body.get("sha") != publish.blob_sha(self.files[path]):
                return 422, {"message": "sha wasn't supplied"}
            self.files[path] = base64.b64decode(body["content"])
            return 201, {}
        return 404, {}


class PublishTests(unittest.TestCase):
    def setUp(self):
        os.environ["CLIPPER_GITHUB_TOKEN"] = "ghp_test"
        self.tmp = Path(tempfile.mkdtemp())
        self.ws = pl.WS(str(self.tmp / "ws"))
        self.ws.set_setting("publish.repo", "me/site")

    def tearDown(self):
        os.environ.pop("CLIPPER_GITHUB_TOKEN", None)
        self.ws.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_upload_then_only_changes(self):
        gh = FakeGitHub()
        res = pl.publish_dashboard(self.ws, http=gh)
        self.assertIn("index.html", res["uploaded"])
        self.assertIn("data.json", res["uploaded"])
        self.assertIn("manifest.webmanifest", res["uploaded"])
        self.assertIn("icon-512.png", res["uploaded"])
        puts = [u for m, u in gh.calls if m == "PUT"]
        self.assertTrue(puts[0].endswith("/contents/data.json"))   # data before the page, at the repo root
        self.assertTrue(puts[-1].endswith("/contents/index.html"))
        gh.calls.clear()
        res = pl.publish_dashboard(self.ws, http=gh)          # same data: nothing to upload
        self.assertEqual(res["uploaded"], [])
        self.ws.event("new activity")                          # data changed: only the page and data.json go up
        res = pl.publish_dashboard(self.ws, http=gh)
        self.assertEqual(set(res["uploaded"]), {"data.json", "index.html"})
        self.assertIn("icon-512.png", res["unchanged"])

    def test_conflict_is_retried(self):
        gh = FakeGitHub()
        pl.publish_dashboard(self.ws, http=gh)
        gh.conflict_once.add("data.json")
        self.ws.event("changed")
        res = pl.publish_dashboard(self.ws, http=gh)
        self.assertIn("data.json", res["uploaded"])

    def test_bad_token_message(self):
        def gh(method, url, body, headers):
            return 401, {"message": "Bad credentials"}
        with self.assertRaises(publish.PublishError) as cm:
            publish.check_access("me/site", http=gh)
        self.assertIn("rejected the token", str(cm.exception))
        with self.assertRaises(publish.PublishError) as cm:
            publish.publish({"a.txt": b"x"}, "me/site", http=lambda m, u, b, h: (403, {"message": "Resource not accessible"}) if m == "PUT" else (404, {}))
        self.assertIn("Contents: Read and write", str(cm.exception))

    def test_hide_money(self):
        d = dashboard.hide_money(dashboard.build_data(self.ws))
        self.assertTrue(d["hide_money"])
        self.assertIsNone(d["stats"]["net"])
        files = dashboard.site_files(d)
        self.assertNotIn('"net": 0', files["data.json"].decode())
        man = json.loads(files["manifest.webmanifest"])
        self.assertEqual(man["start_url"], "./#/today")

    def test_publish_url(self):
        self.assertEqual(pl.publish_url(self.ws), "https://me.github.io/site/")
        self.ws.set_setting("publish.folder", "clips")
        self.assertEqual(pl.publish_url(self.ws), "https://me.github.io/site/clips/")
        self.ws.set_setting("publish.repo", "Me/me.github.io")
        self.assertEqual(pl.publish_url(self.ws), "https://me.github.io/clips/")

    def test_subfolder_and_thumbs_skip_unchanged(self):
        self.ws.set_setting("publish.folder", "clips")
        gh = FakeGitHub()
        files = {"index.html": b"<p>1</p>", "data.json": b"{}", "thumbs/1.jpg": b"jpg"}
        publish.publish(files, "me/site", folder="clips", http=gh)
        self.assertEqual(set(gh.files), {"clips/index.html", "clips/data.json", "clips/thumbs/1.jpg"})
        res = publish.publish(files, "me/site", folder="clips", http=gh)
        self.assertEqual(res["uploaded"], [])                  # thumbnails in thumbs/ are recognised too

    def test_refuses_force_pushed_nq_repo(self):
        a = type("A", (), dict(action="setup", repo="demetrades2000-coder/nq-dashboard", branch=None, folder=None,
                              hide_money=False, forget_token=False))()
        self.assertEqual(pl.cmd_publish(self.ws, a), 1)
        self.assertNotEqual(self.ws.setting("publish.repo"), "demetrades2000-coder/nq-dashboard")


class SiteSetupTests(unittest.TestCase):
    """The clipper makes its own site: repo (public, with a README) + GitHub Pages from main, root."""
    def setUp(self):
        os.environ["CLIPPER_GITHUB_TOKEN"] = "ghp_test"

    def tearDown(self):
        os.environ.pop("CLIPPER_GITHUB_TOKEN", None)

    def fake(self, repo_exists=False, pages_on=False, login="me", pages_fail=False):
        st = {"repo": repo_exists, "pages": pages_on, "calls": []}

        def gh(method, url, body, headers):
            st["calls"].append((method, url.split("api.github.com")[-1], body))
            u = url.split("api.github.com")[-1].split("?")[0]
            if u == "/user":
                return 200, {"login": login}
            if method == "POST" and u == "/user/repos":
                st["repo"] = True
                return 201, {"full_name": f"{login}/{body['name']}"}
            if u == "/repos/me/clip-engine":
                return (200, {"permissions": {"push": True}, "has_pages": st["pages"]}) if st["repo"] else (404, {})
            if u.endswith("/contents/README.md"):
                return (200, {"sha": "x"}) if st["repo"] else (404, {})
            if u.endswith("/pages"):
                if method == "POST":
                    if pages_fail:
                        return 403, {"message": "Resource not accessible"}
                    st["pages"] = True
                    return 201, {"html_url": "https://me.github.io/clip-engine/"}
                return (200, {"html_url": "https://me.github.io/clip-engine/"}) if st["pages"] else (404, {})
            return 404, {}
        return gh, st

    def test_creates_repo_and_pages(self):
        gh, st = self.fake()
        url = publish.ensure_site("me/clip-engine", http=gh, sleep=lambda s: None)
        self.assertEqual(url, "https://me.github.io/clip-engine/")
        posts = [(u, b) for m, u, b in st["calls"] if m == "POST"]
        self.assertEqual(posts[0], ("/user/repos", {"name": "clip-engine", "private": False, "auto_init": True,
                                                    "description": "Clip Engine dashboard (built by the clipper)"}))
        self.assertEqual(posts[1], ("/repos/me/clip-engine/pages", {"source": {"branch": "main", "path": "/"}}))

    def test_existing_site_is_left_alone(self):
        gh, st = self.fake(repo_exists=True, pages_on=True)
        publish.ensure_site("me/clip-engine", http=gh, sleep=lambda s: None)
        self.assertFalse([c for c in st["calls"] if c[0] == "POST"])

    def test_wrong_owner_and_pages_errors_explain(self):
        gh, _ = self.fake(login="someoneelse")
        with self.assertRaises(publish.PublishError) as cm:
            publish.ensure_site("me/clip-engine", http=gh, sleep=lambda s: None)
        self.assertIn("belongs to someoneelse", str(cm.exception))
        gh, _ = self.fake(repo_exists=True, pages_fail=True)
        with self.assertRaises(publish.PublishError) as cm:
            publish.ensure_site("me/clip-engine", http=gh, sleep=lambda s: None)
        self.assertIn("settings/pages", str(cm.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
