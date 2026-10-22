"""Windows/macOS portability: chunked keychain values, the Task Scheduler wrapper, text encodings, stdout safety.

  python -m unittest discover -s clipper/tests -v
"""

import argparse
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import clipper as cl  # noqa: E402
import pipeline as pl  # noqa: E402
import secretstore  # noqa: E402
import tiktok  # noqa: E402
import youtube  # noqa: E402
import zernio  # noqa: E402


class LimitedKeyring:
    """Behaves like Windows Credential Manager through keyring: secrets over 1280 characters are refused."""
    LIMIT = 1280

    def __init__(self):
        self.store = {}

    def get_password(self, service, key):
        return self.store.get((service, key))

    def set_password(self, service, key, value):
        if len(value) > self.LIMIT:
            raise OSError("(1783, 'CredWrite', 'The stub received bad data.')")
        self.store[(service, key)] = value

    def delete_password(self, service, key):
        if (service, key) not in self.store:
            raise KeyError(key)
        del self.store[(service, key)]


class SecretStoreTests(unittest.TestCase):
    def setUp(self):
        self.kr = LimitedKeyring()

    def test_short_value_stored_as_is(self):
        secretstore.save(self.kr, "svc", "k", "short")
        self.assertEqual(self.kr.store, {("svc", "k"): "short"})
        self.assertEqual(secretstore.get(self.kr, "svc", "k"), "short")

    def test_long_value_round_trips_in_parts(self):
        val = json.dumps({"token": "ya29." + "x" * 2100, "refresh_token": "1//" + "y" * 400, "note": "“é” 🎬"})
        secretstore.save(self.kr, "svc", "k", val)
        self.assertGreater(len(self.kr.store), 2)
        self.assertTrue(all(len(v) <= LimitedKeyring.LIMIT for v in self.kr.store.values()))
        self.assertEqual(secretstore.get(self.kr, "svc", "k"), val)

    def test_shrink_and_grow_leave_no_stale_parts(self):
        secretstore.save(self.kr, "svc", "k", "a" * 3500)  # 4 parts
        secretstore.save(self.kr, "svc", "k", "b" * 1500)  # 2 parts
        self.assertEqual(len(self.kr.store), 3)
        self.assertEqual(secretstore.get(self.kr, "svc", "k"), "b" * 1500)
        secretstore.save(self.kr, "svc", "k", "tiny")
        self.assertEqual(self.kr.store, {("svc", "k"): "tiny"})

    def test_delete_removes_parts_and_missing_part_reads_as_none(self):
        secretstore.save(self.kr, "svc", "k", "c" * 2500)
        del self.kr.store[("svc", "k#part1")]
        self.assertIsNone(secretstore.get(self.kr, "svc", "k"))
        secretstore.delete(self.kr, "svc", "k")
        self.assertEqual(self.kr.store, {})
        with self.assertRaises(Exception):
            secretstore.delete(self.kr, "svc", "k")

    def test_old_unchunked_entries_still_read(self):
        self.kr.store[("money-clipper", "youtube-token")] = '{"token": "t"}'
        self.assertEqual(secretstore.get(self.kr, "money-clipper", "youtube-token"), '{"token": "t"}')

    def test_uploader_modules_use_it(self):
        kr = self.kr
        big = {"access_token": "act." + "z" * 1500, "expires_at": 9e12, "mode": "inbox", "scope": "video.upload"}
        with mock.patch.object(tiktok, "_keyring", lambda: kr), mock.patch.object(youtube, "_keyring", lambda: kr), \
                mock.patch.object(zernio, "_keyring", lambda: kr), mock.patch.dict(os.environ, {"ZERNIO_API_KEY": ""}):
            tiktok._save(big, "acct")
            self.assertEqual(tiktok._load("acct"), big)
            self.assertTrue(tiktok.has_token("acct"))
            tiktok.revoke("acct")
            self.assertFalse(tiktok.has_token("acct"))
            secretstore.save(kr, youtube.KEYRING_SERVICE, youtube._key("x"), "{" + " " * 3000 + "}")
            self.assertTrue(youtube.has_token("x"))
            youtube.revoke("x")
            self.assertFalse(youtube.has_token("x"))
            zernio.save_key("sk_test_123 ")
            self.assertEqual(zernio.api_key(), "sk_test_123")
            zernio.delete_key()
            self.assertEqual(kr.store, {})


class ScheduleTests(unittest.TestCase):
    def setUp(self):
        self.home = tempfile.mkdtemp(prefix="clip sched é ")
        self.ws = pl.WS(self.home)

    def tearDown(self):
        self.ws.close()
        shutil.rmtree(self.home, ignore_errors=True)

    def test_windows_wrapper(self):
        p = pl.windows_wrapper(self.ws)
        raw = p.read_bytes()
        self.assertIn(b"\r\n", raw)
        text = raw.decode("utf-8")
        self.assertTrue(text.startswith("@echo off\r\nchcp 65001"))
        self.assertIn("set PYTHONUTF8=1", text)
        last = text.strip().splitlines()[-1]
        for part in pl.schedule_command(self.ws):
            self.assertIn(f'"{part}"', last)  # every argument quoted: folders with spaces are fine
        self.assertIn(f'>> "{self.ws.home / "logs" / "autopilot.log"}" 2>&1', last)

    def test_windows_wrapper_escapes_percent(self):
        with mock.patch.object(pl, "schedule_command", lambda ws: ["C:\\py%TEMP%\\python.exe", "x"]):
            text = pl.windows_wrapper(self.ws).read_text(encoding="utf-8")
        self.assertIn('"C:\\py%%TEMP%%\\python.exe"', text)

    def test_windows_task_xml(self):
        import datetime as dt
        wrapper = self.ws.home / "run-autopilot.cmd"
        xml = pl.windows_task_xml(wrapper, 6, dt.datetime(2026, 10, 23, 1, 17))
        root = ET.fromstring(xml.replace('encoding="UTF-16"', ""))
        ns = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}
        self.assertEqual(root.find(".//t:Interval", ns).text, "PT6H")
        self.assertEqual(root.find(".//t:StartBoundary", ns).text, "2026-10-23T01:17:00")
        self.assertEqual(root.find(".//t:DisallowStartIfOnBatteries", ns).text, "false")
        self.assertEqual(root.find(".//t:Command", ns).text, "cmd.exe")
        self.assertEqual(root.find(".//t:Arguments", ns).text, f'/c start "" /min "{wrapper}"')

    def test_windows_install_falls_back_to_plain_task(self):
        calls = []

        class R:
            def __init__(self, rc):
                self.returncode, self.stdout, self.stderr = rc, "SUCCESS" if not rc else "", "" if not rc else "bad xml"

        def fake_run(cmd, **kw):
            calls.append(cmd)
            return R(1 if "/XML" in cmd else 0)
        with mock.patch("subprocess.run", fake_run), mock.patch("sys.stdout", io.StringIO()):
            rc = pl._schedule_windows(self.ws, argparse.Namespace(action="install"), 6)
        self.assertEqual(rc, 0)
        self.assertIn("/XML", calls[0])
        tr = calls[1][calls[1].index("/TR") + 1]
        self.assertEqual(tr, f'"{self.ws.home / "run-autopilot.cmd"}"')
        self.assertLess(len(tr), 261)
        self.assertEqual(calls[1][-4:], ["/SC", "HOURLY", "/MO", "6"])
        self.assertEqual(Path(self.ws.home / "autopilot-task.xml").read_bytes()[:2], b"\xff\xfe")  # UTF-16 BOM


class TextSafetyTests(unittest.TestCase):
    def test_robust_stdio_replaces_unencodable(self):
        raw = io.BytesIO()
        stream = io.TextIOWrapper(raw, encoding="cp1252")
        with mock.patch("sys.stdout", stream), mock.patch("sys.stderr", io.StringIO()):
            cl.robust_stdio()
            print("caption “quoted” 🎬 → done")
            stream.flush()
        self.assertIn(b"done", raw.getvalue())

    def test_report_files_are_utf8(self):
        out = Path(tempfile.mkdtemp())
        try:
            c = cl.Clip(0, 10, [cl.Word("hi", 0, 1)], 50, [], "Title “x”", "Caption 🎬 →", ["#tag"])
            cl.write_report(out, {"title": "Ünïcode 🎬"}, [c], [None], "file")
            self.assertIn("🎬", (out / "CLIPS.md").read_bytes().decode("utf-8"))
            self.assertIn("Ünïcode", json.loads((out / "clips.json").read_bytes().decode("utf-8"))["source"]["title"])
        finally:
            shutil.rmtree(out, ignore_errors=True)

    def test_clean_path(self):
        self.assertEqual(pl.clean_path("  '/tmp/a b/client.json' "), "/tmp/a b/client.json")
        if os.name == "nt":
            self.assertEqual(pl.clean_path('  "C:\\Users\\me\\client.json" '), "C:\\Users\\me\\client.json")
        else:
            self.assertEqual(pl.clean_path("/tmp/My\\ Folder/client\\ secret.json "), "/tmp/My Folder/client secret.json")

    def test_pid_alive(self):
        self.assertTrue(pl.pid_alive(os.getpid()))
        self.assertFalse(pl.pid_alive(0))


if __name__ == "__main__":
    unittest.main()
