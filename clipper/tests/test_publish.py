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
        if method == "GET" and path == "clips":
            if not self.files:
                return 404, {"message": "Not Found"}
            return 200, [{"type": "file", "name": k.split("/", 1)[1], "sha": publish.blob_sha(v)} for k, v in self.files.items()]
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
        self.assertTrue(puts[0].endswith("clips/data.json"))   # data before the page
        self.assertTrue(puts[-1].endswith("clips/index.html"))
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
        gh.conflict_once.add("clips/data.json")
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
        self.assertEqual(pl.publish_url(self.ws), "https://me.github.io/site/clips/")


if __name__ == "__main__":
    unittest.main(verbosity=2)
