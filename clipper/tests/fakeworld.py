"""
A fake outside world for end-to-end tests of the cloud autopilot (not a test itself; used by test_e2e_cloud,
test_security and test_resilience).

  * FakeClock       - a controllable clock; `install_clock()` swaps it into pipeline / dashboard / cloud_runner
  * FakeWorld       - ONE replacement for urllib.request.urlopen that answers as Content Rewards, Zernio (accounts,
                      presign, storage PUT, posts, analytics) and ntfy.sh, records every request, and refuses (and
                      records) any host that is not on the allow-list (the SSRF check)
  * Cloud           - a temp HOME, a local bare git repo as `origin`, campaign briefs, footage and a run() that calls
                      cloud_runner.main() the way a fresh GitHub Actions VM would (new process caches each time)

Nothing here touches the network, the real repo, or the real clock.
"""

from __future__ import annotations

import contextlib
import datetime as _real_dt
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import types
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import clipper as cl  # noqa: E402
import cloud_runner as cr  # noqa: E402
import dashboard  # noqa: E402
import pipeline as pl  # noqa: E402
import zernio  # noqa: E402
from test_agency import page as cr_page  # noqa: E402  (a realistic Content Rewards campaign page)

ALLOWED_HOSTS = {"contentrewards.com", "www.contentrewards.com", "zernio.com", "www.zernio.com", "ntfy.sh",
                 "storage.fakezernio.test", "docs.google.com", "drive.google.com", "www.tiktok.com", "www.youtube.com"}
CID = "1cc66d1c-d7bb-4cd6-addb-68093cb50908"
CID2 = "2dd77d2d-e8cc-4dd7-bec4-79104cc59a19"

# secrets used by tests; they must never show up in any output
SENTINEL_KEY = "zk_live_SENTINEL_9f3a77c1d2e84b5a"
SENTINEL_TOPIC = "clip-topic-SENTINEL-6b1e90aa44"
SENTINEL_TOKEN = "ghs_SENTINEL_TOKEN_0123456789abcdef"


# ----------------------------------------------------------------------------- clock

class FakeClock:
    """UTC 'now'. The GitHub runner's local time is UTC, so naive local time == UTC here."""

    def __init__(self, start: _real_dt.datetime):
        self.utc = start.replace(tzinfo=_real_dt.timezone.utc)

    def set(self, y, mo, d, h=0, mi=0):
        self.utc = _real_dt.datetime(y, mo, d, h, mi, tzinfo=_real_dt.timezone.utc)

    def advance(self, **kw):
        self.utc += _real_dt.timedelta(**kw)


def install_clock(clock: FakeClock):
    """Replace `datetime` inside pipeline, dashboard and cloud_runner. Returns an undo function."""
    real = _real_dt

    class FDate(real.date):
        @classmethod
        def today(cls):
            u = clock.utc
            return cls(u.year, u.month, u.day)

    class FDateTime(real.datetime):
        @classmethod
        def now(cls, tz=None):
            u = clock.utc
            if tz is None:
                u = u.replace(tzinfo=None)
            else:
                u = u.astimezone(tz)
            return cls(u.year, u.month, u.day, u.hour, u.minute, u.second, u.microsecond, u.tzinfo)

        @classmethod
        def utcnow(cls):
            return cls.now()

    shim = types.SimpleNamespace(**{k: getattr(real, k) for k in dir(real) if not k.startswith("__")})
    shim.datetime, shim.date = FDateTime, FDate
    old = {m: m.dt for m in (pl, dashboard) if hasattr(m, "dt")}
    for m in old:
        m.dt = shim

    def undo():
        for m, v in old.items():
            m.dt = v
    return undo


@contextlib.contextmanager
def no_sleep():
    """Zernio retries wait 2-16 s per failure; tests must not. Replaces every `sleep=time.sleep` default in zernio.py."""
    import time
    saved = []
    for name in dir(zernio):
        fn = getattr(zernio, name)
        if callable(fn) and getattr(fn, "__defaults__", None) and time.sleep in fn.__defaults__:
            saved.append((fn, fn.__defaults__))
            fn.__defaults__ = tuple((lambda s: None) if d is time.sleep else d for d in fn.__defaults__)
    orig_cr = cr.time.sleep
    cr.time.sleep = lambda s: None            # cloud_runner's git push back-off
    try:
        yield
    finally:
        cr.time.sleep = orig_cr
        for fn, d in saved:
            fn.__defaults__ = d


# ----------------------------------------------------------------------------- the fake internet

class _Resp:
    def __init__(self, status: int, body: bytes):
        self.status, self._b = status, body

    def read(self, *a):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeWorld:
    """Content Rewards + Zernio + ntfy behind one fake urlopen."""

    def __init__(self, clock: FakeClock | None = None):
        self.clock = clock
        self.requests: list[dict] = []        # every request: method, url, headers, body
        self.unexpected: list[str] = []       # urls on hosts outside ALLOWED_HOSTS
        self.cr_pages: dict[str, object] = {CID: cr_page()}     # id -> html str | int (HTTP status)
        self.cr_discover: object = f'<a href="/c/campaigns/{CID}">x</a><a href="/c/campaigns/{CID2}">y</a>'
        self.cr_pages[CID2] = cr_page(name="Other Finance Clipping", org="OtherCo", budget=300000, spent=1000)
        self.accounts = [{"_id": "tt1", "platform": "tiktok", "username": "acme.clips1"},
                         {"_id": "tt2", "platform": "tiktok", "username": "acme.clips2"},
                         {"_id": "ig1", "platform": "instagram", "username": "acme.ig"}]
        self.accounts_status = 200            # status of GET /accounts (e.g. 401 = key expired)
        self.posts: list[dict] = []           # accepted posts: {id, account, url, body, caption, n}
        self.views: dict[str, int] = {}       # post url -> views (analytics); default grows with each call
        self.post_fail: list[int] = []        # queue of statuses to answer POST /posts with, before success
        self.put_fail: list[int] = []
        self.presign_fail: list[int] = []
        self.analytics_status = 200
        self.ntfy: list[dict] = []
        self.ntfy_ok = True
        self.drop_url = False                 # Zernio publishes but does not return the TikTok link yet
        self.n = 0
        self.idem_hits = 0
        self.idem: dict[str, dict] = {}       # Idempotency-Key -> the post Zernio created for it

    # -- plumbing
    def __call__(self, req, data=None, timeout=None, **kw):
        if isinstance(req, str):
            url, method, headers, body = req, "GET", {}, data
        else:
            url, method, headers, body = req.full_url, req.get_method(), dict(req.header_items()), req.data
        m = re.match(r"https?://([^/:]+)", url)
        host = m.group(1).lower() if m else ""
        rec = {"method": method, "url": url, "host": host, "headers": {k.lower(): v for k, v in headers.items()},
               "body": body, "ts": self.clock.utc if self.clock else None}
        self.requests.append(rec)
        if host not in ALLOWED_HOSTS:
            self.unexpected.append(url)
            raise urllib.error.URLError(f"host not allowed in tests: {host}")
        status, out = self.route(method, url, host, rec)
        if status >= 400:
            raise urllib.error.HTTPError(url, status, "fake", {}, io.BytesIO(out))
        return _Resp(status, out)

    def j(self, status, obj):
        return status, json.dumps(obj).encode()

    def route(self, method, url, host, rec):
        body = rec["body"]
        self._auth_seen = rec["headers"].get("authorization", "")
        if host.endswith("contentrewards.com"):
            if url.endswith("/discover"):
                return self.page(self.cr_discover)
            m = re.search(r"/campaigns/([0-9a-f-]{36})", url)
            return self.page(self.cr_pages.get(m.group(1), 404) if m else 404)
        if host == "ntfy.sh":
            self.ntfy.append({"topic": url.rsplit("/", 1)[-1], "headers": {k.lower(): v for k, v in rec["headers"].items()},
                              "body": (body or b"").decode("utf-8", "replace")})
            return (200, b"{}") if self.ntfy_ok else (500, b"oops")
        if host == "storage.fakezernio.test":
            if self.put_fail:
                return self.put_fail.pop(0), b"{}"
            return 200, b""
        if host in ("www.tiktok.com", "www.youtube.com", "docs.google.com", "drive.google.com"):
            return 404, b"not found"
        # ---- zernio
        path = url.split("/api/v1", 1)[-1]
        auth = rec["headers"].get("authorization", "")
        if not auth.startswith("Bearer ") or len(auth) < 12:
            return self.j(401, {"error": "missing key"})
        if path.startswith("/accounts"):
            if self.accounts_status != 200:
                return self.j(self.accounts_status, {"error": "invalid key" if self.accounts_status == 401 else "boom"})
            return self.j(200, {"accounts": self.accounts})
        if path.startswith("/media/presign"):
            if self.presign_fail:
                return self.j(self.presign_fail.pop(0), {"error": "presign down"})
            self.n += 1
            return self.j(200, {"uploadUrl": f"https://storage.fakezernio.test/put/{self.n}",
                                "publicUrl": f"https://cdn.fakezernio.test/m/{self.n}", "expiresIn": 3600})
        if path == "/posts" and method == "POST":
            if self.post_fail:
                st = self.post_fail.pop(0)       # 0 in the script means "this one succeeds"
                if st:
                    return self.j(st, {"error": "rate limit reached" if st == 429 else "server error"})
            req = json.loads(body)
            key = rec["headers"].get("idempotency-key")
            if key and key in self.idem:         # Zernio hands back the ORIGINAL post for a repeated key
                p = self.idem[key]
                self.idem_hits += 1
                return self.j(200, {"post": {"_id": p["id"], "platforms": [self._entry(p)]}})
            ent = req["platforms"][0]
            acct = next((a for a in self.accounts if a["_id"] == ent["accountId"]), None)
            if acct is None:
                return self.j(400, {"error": "unknown account"})
            self.n += 1
            pid = f"post{len(self.posts) + 1}"
            url_ = f"https://www.tiktok.com/@{acct['username']}/video/{7000 + len(self.posts)}"
            sched = None
            if req.get("scheduledFor"):
                from zoneinfo import ZoneInfo
                local = _real_dt.datetime.fromisoformat(req["scheduledFor"])
                sched = local.replace(tzinfo=ZoneInfo(req.get("timezone") or "UTC")).astimezone(_real_dt.timezone.utc)
            p = {"id": pid, "account": acct["username"], "url": url_, "body": req, "caption": req.get("content", ""),
                 "kind": "photo" if req["mediaItems"][0]["type"] == "image" else "video",
                 "at": self.clock.utc if self.clock else None, "scheduled_utc": sched, "idem": key,
                 "pid_num": 7000 + len(self.posts)}
            self.posts.append(p)
            if key:
                self.idem[key] = p
            return self.j(201, {"post": {"_id": pid, "scheduledFor": req.get("scheduledFor"),
                                         "platforms": [self._entry(p)]}})
        if path.startswith("/posts/"):
            pid = path.rsplit("/", 1)[-1]
            p = next((x for x in self.posts if x["id"] == pid), None)
            if not p:
                return self.j(404, {})
            return self.j(200, {"post": {"_id": pid, "platforms": [self._entry(p)]}})
        if path.startswith("/analytics"):
            if self.analytics_status != 200:
                return self.j(self.analytics_status, {"error": "analytics down"})
            posts = []
            for p in self.posts:
                if not self.published(p):
                    continue
                v = self.views.get(p["url"])
                if v is None:
                    v = 120 * (1 + len(self.requests) % 7)
                posts.append({"platformPostUrl": p["url"], "analytics": {"views": v, "likes": v // 20,
                                                                          "comments": 1, "shares": 0}})
            return self.j(200, {"posts": posts, "pagination": {"pages": 1}})
        return self.j(404, {"error": f"no route {method} {path}"})

    def published(self, p) -> bool:
        """A scheduled post is published once the (fake) clock passes its time."""
        return p["scheduled_utc"] is None or (self.clock is None or self.clock.utc >= p["scheduled_utc"])

    def _entry(self, p) -> dict:
        pe = {"platform": "tiktok", "status": "published" if self.published(p) else "scheduled"}
        if self.published(p):
            pe["platformPostId"] = str(p["pid_num"])
            if not self.drop_url:
                pe["platformPostUrl"] = p["url"]
        return pe

    def page(self, v):
        if isinstance(v, int):
            return v, b"error page"
        return 200, v.encode("utf-8")

    # -- helpers for assertions
    def to(self, host=None, method=None, contains=None):
        return [r for r in self.requests if (host is None or r["host"] == host) and (method is None or r["method"] == method)
                and (contains is None or contains in r["url"])]

    def all_text(self) -> str:
        """Everything that left the machine (urls, headers EXCEPT the Authorization to zernio, bodies)."""
        out = []
        for r in self.requests:
            hdr = {k: v for k, v in r["headers"].items() if not (k == "authorization" and r["host"].endswith("zernio.com"))}
            out.append(r["url"] + json.dumps(hdr) + (r["body"].decode("utf-8", "replace") if isinstance(r["body"], bytes) else ""))
        return "\n".join(out)


# ----------------------------------------------------------------------------- fake speech

_SUBJ = ["prop firm traders", "most beginners", "funded accounts", "a disciplined trader", "the evaluation phase",
         "risk management", "your trading journal", "a losing streak", "position sizing", "the daily drawdown rule",
         "patient traders", "the first payout", "a simple strategy", "your edge", "consistent traders"]
_VERB = ["fail because they ignore", "only succeed when they respect", "never talk about", "quietly build around",
         "always protect", "get paid for mastering", "lose money by breaking", "grow faster by tracking"]
_OBJ = ["the stop loss", "the weekly plan", "their emotions", "the payout rules", "a written checklist", "the news calendar",
        "the profit target", "one clean setup", "the risk per trade", "their biggest mistakes"]


def write_episode_srt(path: Path, n: int, seconds: float = 78.0, lines: list | None = None) -> None:
    """A fake transcript of ~`seconds` of speech. `lines` (cycled) replaces the generated sentences, e.g. with hostile text."""
    import random
    rnd = random.Random(1000 + n)
    out, t, i = [], 1.0, 1
    while True:
        line = (lines[(i - 1) % len(lines)] if lines else
                f"{rnd.choice(_SUBJ).capitalize()} {rnd.choice(_VERB)} {rnd.choice(_OBJ)} and that is lesson {n * 50 + i} today.")
        d = len(line.split()) / 3.0
        if t + d > seconds - 1:
            break
        a, b = t, t + d
        out.append(f"{i}\n{cl.hms(a)},{int(a % 1 * 1000):03d} --> {cl.hms(b)},{int(b % 1 * 1000):03d}\n{line}\n")
        i += 1
        t = b + (1.2 if i % 3 == 0 else 0.3)
    Path(path).write_text("\n".join(out), encoding="utf-8")


# ----------------------------------------------------------------------------- the cloud (HOME + origin)

def _git(*a, cwd=None):
    return subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, check=True).stdout


class Cloud:
    """A temp 'GitHub Actions' world: bare origin repo, campaign briefs, footage, one fake internet."""

    def __init__(self, start=(2026, 10, 26, 13, 0), campaigns: int = 1, slideshows: bool = True, topic: str = "",
                 key: str = SENTINEL_KEY, accounts_match="acme", warmup: bool = False):
        self.tmp = Path(tempfile.mkdtemp(prefix="clip-e2e-"))
        self.clock = FakeClock(_real_dt.datetime(*start))
        self.world = FakeWorld(self.clock)
        self.origin = self.tmp / "origin.git"
        _git("init", "-q", "--bare", str(self.origin))
        self.home = self.tmp / "vm" / "clip-cloud"       # recreated for each run (a fresh VM)
        self.camp_dir = self.tmp / "repo" / "campaigns"
        self.camp_dir.mkdir(parents=True)
        (self.camp_dir / "logos").mkdir()
        self.footage_dir = self.camp_dir / "footage" / "acme"
        self.key, self.topic, self.warmup = key, topic, warmup
        self.campaign_files: list[Path] = []
        self.env_backup = {k: os.environ.get(k) for k in ("ZERNIO_API_KEY", "NTFY_TOPIC", "CLIPPER_HOME", "GITHUB_REPOSITORY",
                                                          "CLIP_CLOUD_DIR", "GH_TOKEN")}
        self.add_campaign("Acme Clipping", CID, slideshows=slideshows, match=accounts_match)
        if campaigns > 1:
            self.add_campaign("Other Finance Clipping", CID2, slideshows=False, match="other")
        self._patches: list = []
        self.undo_clock = install_clock(self.clock)
        self.stdout = io.StringIO()
        self.transcript_lines = None
        self.transcripts = 0     # how many episodes the fake speech recogniser has "heard"
        # a 80 s test episode in the cloud's footage folder (what the Drive sync would have put there)
        self.state_footage = None

    # -- setup
    def add_campaign(self, name, cid, slideshows=False, match="acme", platforms=("tiktok",), extra=None) -> Path:
        c = json.loads((HERE / "campaigns" / "_template.json").read_text(encoding="utf-8"))
        slug = re.sub(r"\W+", "-", name.lower())
        c.update(name=name, automation_allowed=True, platforms=list(platforms), cpm=5.0, account_match=match,
                 accounts={"tiktok": "*"}, sources=[f"footage/{slug}"], slideshows=slideshows,
                 disclosure={"caption": "#ad", "on_screen": "#ad"}, cloud=True, min_payout=7)
        c["permission"].update(program="Content Rewards", campaign_url=f"https://contentrewards.com/c/campaigns/{cid}",
                               verified_on=self.clock.utc.date().isoformat(), evidence="e2e fake",
                               allowed_sources=[f"file:footage/{slug}"])
        c["clip"].update(count=4, min=15, max=30, latest=2)
        c["caption"] = {"required_hashtags": [], "required_mentions": ["@acme"], "mentions_last": True,
                        "required_text": "", "hashtags": ["#trading"]}
        c["on_screen"] = {"watermark": "", "highlight": "#FFE600", "logo": f"logos/{slug}.png", "logo_position": "top",
                          "logo_width": 600}
        if extra:
            c.update(extra)
        from PIL import Image
        Image.new("RGBA", (600, 200), (255, 0, 0, 255)).save(self.camp_dir / "logos" / f"{slug}.png")
        f = self.camp_dir / f"{slug}.json"
        f.write_text(json.dumps(c, indent=2), encoding="utf-8")
        self.campaign_files.append(f)
        (self.camp_dir / "footage" / slug).mkdir(parents=True, exist_ok=True)
        return f

    def make_footage(self, name="ep1", seconds=80, slug="acme-clipping"):
        """A synthetic episode in the cloud state's footage folder (as the Drive sync would leave it)."""
        d = self.home / "footage" / slug
        d.mkdir(parents=True, exist_ok=True)
        out = d / f"{name}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=size=640x360:rate=15:duration={seconds}",
                        "-f", "lavfi", "-i", f"sine=frequency=220:duration={seconds}", "-c:v", "libx264", "-preset",
                        "ultrafast", "-c:a", "aac", "-shortest", str(out)], check=True)
        return out

    # -- one cloud run
    def edit_db(self, sql: str, args=()):
        """A callback for run(footage=[...]): change the restored database before the cycle starts."""
        def go():
            ws = pl.WS(str(self.home / "ws"))
            ws.x(sql, args)
            ws.close()
        return go

    def run(self, advance: dict | None = None, argv=None, fresh_vm: bool = True, footage: list | None = None,
            catch=False, drive=False) -> tuple[int, str]:
        """Run cloud_runner.main() like a new Actions job: fresh checkout dir (state comes from the origin branch)."""
        if advance:
            self.clock.advance(**advance)
        if fresh_vm and self.home.exists():
            shutil.rmtree(self.home, ignore_errors=True)
        env = os.environ
        if self.key is not None:
            env["ZERNIO_API_KEY"] = self.key
        else:
            env.pop("ZERNIO_API_KEY", None)
        if self.topic:
            env["NTFY_TOPIC"] = self.topic
        else:
            env.pop("NTFY_TOPIC", None)
        env["GITHUB_REPOSITORY"] = "owner/repo"
        env["GH_TOKEN"] = SENTINEL_TOKEN
        zernio._STATS.clear()
        pl._ZERNIO_NAMES.clear()
        orig = (cr.HOME, cr.WSDIR, cr.CAMPAIGNS, cr.remote_url, cr.HERE, urllib.request.urlopen, cl.whisper_faster)
        cr.HOME, cr.WSDIR = self.home, self.home / "ws"
        cr.HERE = self.camp_dir.parent                       # the REAL active_campaigns() reads <HERE>/campaigns/*.json
        cr.CAMPAIGNS = cr.active_campaigns()
        cr.remote_url = lambda: str(self.origin)
        urllib.request.urlopen = self.world
        cl.whisper_faster = self._fake_whisper
        buf = io.StringIO()
        sleepless = no_sleep()
        sleepless.__enter__()
        try:
            # the branch may not exist yet; load_state starts it. Footage dropped after the clone is what Drive would add.
            args = ([] if drive else ["--no-drive"]) + (argv if argv is not None else ["--no-discover"])
            real_load = cr.load_state

            def load_and_drop():
                real_load()
                ws = pl.WS(str(self.home / "ws"))
                ws.set_setting("autopilot.warmup", bool(self.warmup))     # new pages start slowly unless a test says otherwise
                ws.close()
                for f in footage or []:
                    f()
            cr.load_state = load_and_drop
            with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
                try:
                    rc = cr.main(args)
                except SystemExit as e:
                    rc = e.code if isinstance(e.code, int) else 1
                except Exception:
                    if not catch:
                        raise
                    import traceback
                    traceback.print_exc()
                    rc = 99
        finally:
            sleepless.__exit__(None, None, None)
            cr.load_state = real_load
            (cr.HOME, cr.WSDIR, cr.CAMPAIGNS, cr.remote_url, cr.HERE, urllib.request.urlopen,
             cl.whisper_faster) = orig
        self.stdout.write(buf.getvalue())
        return rc, buf.getvalue()

    def seeder(self, videos=4, slides=0, campaign=0, tag="s", score=80, prefix="Seeded"):
        """A callback for run(footage=[...]): approved, ready-to-post clips written straight into the restored state
        (cheap: no ffmpeg). Use it where a test is about posting rules, not about clipping."""
        def go():
            ws = pl.WS(str(self.home / "ws"))
            cf = self.campaign_files[campaign]
            c = json.loads(cf.read_text(encoding="utf-8"))
            name = c["name"]
            sid = ws.x("INSERT INTO sources(campaign, campaign_file, input, canonical, status, created, updated) "
                       "VALUES(?,?,?,?,'done',?,?)", (name, str(cf), f"x-{tag}", f"seed:{tag}:{name}", pl.now(), pl.now()))
            rdy = ws.home / "ready" / re.sub(r"\W+", "-", name.lower())
            rdy.mkdir(parents=True, exist_ok=True)
            for kind, n in (("video", videos), ("slideshow", slides)):
                for i in range(n):
                    title = f"{prefix} {kind} {tag}{i}"
                    if kind == "video":
                        path = rdy / f"{tag}{i}.mp4"
                        path.write_bytes(b"x" * 2048)
                    else:
                        path = rdy / "slides" / f"{tag}{i}"
                        path.mkdir(parents=True, exist_ok=True)
                        (path / "slide_01.jpg").write_bytes(b"x" * 512)
                    ws.x("INSERT INTO clips(source_id, campaign, title, caption, hashtags, posts, checks, flags, score, file, "
                         "status, ready_file, created, kind, text) VALUES(?,?,?,?,'[]',?,'[]','[]',?,?,'approved',?,?,?,?)",
                         (sid, name, title, f"{title} #ad @acme", json.dumps({"tiktok": {"caption": f"#ad {title} @acme"}}),
                          score - i, str(path), str(path), pl.now(), kind, f"{title} text {tag}{i}"))
            ws.close()
        return go

    def _fake_whisper(self, audio, args):
        """Every episode gets its own transcript, so the engine's duplicate-content check does not drop later episodes."""
        n = self.transcripts
        self.transcripts += 1
        srt = self.tmp / f"talk{n}.srt"
        write_episode_srt(srt, n, lines=self.transcript_lines)
        return cl.load_transcript_file(srt)

    def ws(self) -> "pl.WS":
        return pl.WS(str(self.home / "ws"))

    def branch_files(self, branch="clipper-cloud") -> list[str]:
        return _git("ls-tree", "-r", "--name-only", branch, cwd=self.origin).split()

    def branch_commits(self, branch="clipper-cloud") -> int:
        return int(_git("rev-list", "--count", branch, cwd=self.origin).strip())

    def branch_file(self, path, branch="clipper-cloud") -> bytes:
        return subprocess.run(["git", "show", f"{branch}:{path}"], cwd=self.origin, capture_output=True, check=True).stdout

    def checkout_branch(self, dest: Path, branch="clipper-cloud") -> Path:
        _git("clone", "-q", "--branch", branch, str(self.origin), str(dest))
        return dest

    def close(self):
        self.undo_clock()
        for k, v in self.env_backup.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        shutil.rmtree(self.tmp, ignore_errors=True)
