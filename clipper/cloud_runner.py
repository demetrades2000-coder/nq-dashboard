"""
Cloud autopilot: one full cycle in a fresh cloud session, so clips post while the PC is off.

A scheduled cloud session runs `python clipper/cloud_runner.py` every few hours. Each run:
  1. restores the clipper's state (job database, earnings history, rendered-but-unposted clips) from the
     `clipper-cloud` branch of this repo,
  2. pulls any new campaign footage from the campaign's shared Google Drive folder ("footage_drive_folder"),
  3. runs one autopilot cycle: import, transcribe, clip, auto-approve by policy, post to TikTok through Zernio
     (each clip to exactly one of the campaign's TikTok accounts), refresh views,
  4. builds the dashboard into <state>/site and saves the state back to the branch.

Needs ZERNIO_API_KEY in the cloud environment (environment settings, never in the repo). Without it the run still
clips and queues, and says posting is waiting for the key.

The "brain" (docs/features/autopilot.md): every run also refreshes every campaign's live page, decides which campaigns
are active / standby / paused / ended / blocked and which TikTok page serves which campaign (lifecycle.py), keeps a bench
of spare campaigns, checks the launch checklist (preflight.py), learns from its own results (performance.py), plans each
post at a time later today (scheduling.py), and tells the owner only what needs them (alerts.py). One failing step never
stops the others, the state is saved even when a step crashes, and a lock in the state branch keeps two runs apart.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
STATE_BRANCH = os.environ.get("CLIP_CLOUD_BRANCH", "clipper-cloud")
HOME = Path(os.environ.get("CLIP_CLOUD_DIR", str(REPO.parent / "clip-cloud")))   # next to the repo checkout
WSDIR = HOME / "ws"
DISCOVER_EVERY_H = 12


GITIGNORE = """# raw downloads and intermediate files stay out of the state branch
ws/sources/*/source.*
ws/sources/*/*.wav
ws/clips/
ws/logs/
footage/
*.lock
"""
MAX_SOURCE_BYTES = 2_500_000_000   # raw 4K masters are skipped (process those on a PC or pre-convert them)
ARCHIVE_FILE = "archived_campaigns.json"
DASHBOARD = "https://raw.githack.com/{repo}/clipper-cloud/site/index.html"


def _archived() -> dict:
    """Briefs of campaigns that ended for good (kept in the state branch; history stays, the active set shrinks)."""
    try:
        return json.loads((HOME / ARCHIVE_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def active_campaigns() -> list[Path]:
    """Every campaign brief that is cleared for the cloud autopilot: rules allow automated tools and not opted out,
    and not archived (ended). New campaigns join by adding their brief (onboard.py); none is hard-coded."""
    out = []
    gone = _archived()
    for f in sorted((HERE / "campaigns").glob("*.json")) + sorted((HOME / "campaigns").glob("*.json")):
        if f.name.startswith("_") or f.name in gone:
            continue
        try:
            c = json.loads(f.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if c.get("automation_allowed") is True and c.get("cloud", True) is not False:
            out.append(f)
    return out


def all_briefs() -> list[Path]:
    """Every onboarded brief the lifecycle should look at: the cleared ones plus the blocked / unconfirmed ones that
    sit in the same folders (so the dashboard can show why they do not post). Archived (ended) ones are left out."""
    act = active_campaigns()
    dirs = []
    for f in act:
        if f.parent not in dirs:
            dirs.append(f.parent)
    if not act:
        dirs += [HERE / "campaigns"]
    if HOME / "campaigns" not in dirs:
        dirs.append(HOME / "campaigns")
    gone = _archived()
    out = []
    for d in dirs:
        for f in sorted(d.glob("*.json")) if d.exists() else []:
            if f.name.startswith("_") or f.name in gone:
                continue
            try:
                c = json.loads(f.read_text(encoding="utf-8"))
            except ValueError:
                continue
            if isinstance(c, dict) and c.get("name") and c.get("cloud", True) is not False:
                out.append(f)
    return out


CAMPAIGNS = active_campaigns()


def log(msg: str) -> None:
    print(f"[cloud {time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sh(cmd: list[str], cwd: Path | None = None, check: bool = True, quiet: bool = False) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True)
    if not quiet and (r.returncode or r.stdout.strip()):
        out = (r.stdout + r.stderr).strip()
        if out:
            log(f"$ {' '.join(cmd[:4])}...: {out[-400:]}")
    if check and r.returncode:
        raise RuntimeError(f"{' '.join(cmd)} failed: {r.stderr.strip()[-300:]}")
    return r


def remote_url() -> str:
    return sh(["git", "remote", "get-url", "origin"], cwd=REPO, quiet=True).stdout.strip()


def load_state() -> None:
    """Check out the state branch into HOME (or start it)."""
    if (HOME / ".git").exists():
        sh(["git", "fetch", "-q", "origin", STATE_BRANCH], cwd=HOME, check=False)
        sh(["git", "reset", "-q", "--hard", f"origin/{STATE_BRANCH}"], cwd=HOME, check=False)
        return
    HOME.mkdir(parents=True, exist_ok=True)
    url = remote_url()
    r = sh(["git", "clone", "-q", "--branch", STATE_BRANCH, "--single-branch", url, str(HOME)], check=False, quiet=True)
    if r.returncode:
        log(f"no '{STATE_BRANCH}' branch yet: starting fresh state")
        sh(["git", "init", "-q", "-b", STATE_BRANCH], cwd=HOME)
        sh(["git", "remote", "add", "origin", url], cwd=HOME)
    (HOME / ".gitignore").write_text(GITIGNORE, encoding="utf-8")


def save_state(message: str) -> None:
    sh(["git", "config", "user.name", "clip-engine-cloud"], cwd=HOME)
    sh(["git", "config", "user.email", "clip-engine-cloud@users.noreply.github.com"], cwd=HOME)
    sh(["git", "add", "-A"], cwd=HOME)
    if not sh(["git", "status", "--porcelain"], cwd=HOME, quiet=True).stdout.strip():
        log("state unchanged")
        return
    sh(["git", "commit", "-q", "-m", message], cwd=HOME)
    # keep the branch to one commit: posted clips are deleted every run, and history would keep them forever
    root = sh(["git", "rev-list", "--max-parents=0", "HEAD"], cwd=HOME, quiet=True).stdout.split()
    if root and sh(["git", "rev-parse", "HEAD"], cwd=HOME, quiet=True).stdout.strip() != root[-1]:
        sh(["git", "reset", "-q", "--soft", root[-1]], cwd=HOME)
        sh(["git", "commit", "-q", "--amend", "-m", message], cwd=HOME)
    for i in range(4):
        r = sh(["git", "push", "-q", "--force", "origin", f"HEAD:{STATE_BRANCH}"], cwd=HOME, check=False)
        if not r.returncode:
            log(f"state saved to branch {STATE_BRANCH}")
            return
        time.sleep(2 ** (i + 1))
    raise RuntimeError("could not push the state branch")


def remap_paths(ws) -> None:
    """Paths in the database are absolute; a new session may have the repo or state elsewhere."""
    for table, cols in (("sources", ("campaign_file", "input", "workdir", "video")),
                        ("clips", ("file", "ready_file"))):
        for col in cols:
            for r in ws.q(f"SELECT id, {col} v FROM {table} WHERE {col} IS NOT NULL"):
                v = r["v"]
                for marker, base in (("/clipper/campaigns/", HERE / "campaigns"), ("/clip-cloud/", HOME)):
                    if marker in v:
                        new = str(base / v.split(marker, 1)[1])
                        if new != v:
                            ws.x(f"UPDATE {table} SET {col}=? WHERE id=?", (new, r["id"]))
                        break


def _hide_money(ws) -> bool:
    """Public cloud page without dollar figures. CLIP_HIDE_MONEY (repository variable) wins, then the setting
    publish.hide_money; default ON, because the page and its branch are public."""
    env = os.environ.get("CLIP_HIDE_MONEY", "").strip().lower()
    if env:
        return env not in ("0", "false", "no", "off")
    try:
        v = ws.setting("publish.hide_money", None)
    except Exception:  # noqa: BLE001
        v = None
    return True if v is None else bool(v)


def link_footage() -> None:
    """The campaign brief reads footage/<name>; point it at the state's footage so imports find it."""
    for cf in CAMPAIGNS:
        try:
            _link_campaign_footage(cf)
        except Exception as e:  # noqa: BLE001  one broken brief must not end the run
            log(f"link_footage skipped {cf.name}: {type(e).__name__}: {e}")


def _link_campaign_footage(cf) -> None:
    c = json.loads(cf.read_text(encoding="utf-8"))
    base = cf.parent.resolve()
    for src in (c.get("sources") or []):
        if not isinstance(src, str) or not src.strip():
            continue
        local = (cf.parent / src).resolve()
        if local != base and base not in local.parents:   # a brief must not make folders outside the campaigns directory
            log(f"link_footage: {src!r} in {cf.name} points outside the campaign folder; skipped")
            continue
        cloud = HOME / "footage" / Path(src).name
        cloud.mkdir(parents=True, exist_ok=True)
        local.mkdir(parents=True, exist_ok=True)
        for f in cloud.glob("*.mp4"):
            tgt = local / f.name
            if not tgt.exists():
                try:   # a hard link: the file really sits in the campaign's allowed folder (no symlink escape)
                    os.link(f, tgt)
                except OSError:
                    try:
                        shutil.copy2(f, tgt)
                    except OSError as e:   # disk full: leave this file, keep going
                        log(f"link_footage: could not copy {f.name}: {e}")


def ntfy(topic: str, title: str, message: str, click: str = "", priority: str = "default", tags: str = "",
         http=None) -> bool:
    """One phone notification through ntfy.sh (free; subscribe to the topic in the ntfy app). Never raises."""
    import urllib.request
    headers = {"Title": title.encode("ascii", "ignore").decode(), "Priority": priority, "Tags": tags}
    if click:
        headers["Click"] = click
    try:
        if http:
            return bool(http(topic, message, headers))
        req = urllib.request.Request(f"https://ntfy.sh/{topic}", data=message.encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200
    except Exception as e:  # noqa: BLE001
        log(f"notification failed: {e}")
        return False


def prune_posted(ws) -> int:
    """Delete rendered files of clips already live on every platform, to keep the state branch small. A post that
    Zernio has accepted (even one scheduled for later) has its media stored there, so the local file can go."""
    n = 0
    for r in ws.q("SELECT c.id, c.ready_file FROM clips c WHERE c.ready_file IS NOT NULL AND "
                  "EXISTS(SELECT 1 FROM uploads u WHERE u.clip_id=c.id AND u.state IN ('live','processing'))"):
        p = Path(r["ready_file"])
        try:
            if p.is_dir():   # a slideshow deck: its slide images
                shutil.rmtree(p)
                n += 1
            elif p.exists():
                p.unlink()
                n += 1
        except OSError:
            pass
    return n


# ------------------------------------------------------------------ the runner lock (two runs must not post at once)

def acquire_lock(run_id: str, now_utc) -> str:
    """'ok' (we hold the lock), 'held' (another live run holds it) or 'skipped' (git unavailable: carry on unlocked).
    The lock is a tiny file pushed WITHOUT force: if another runner pushed first, git refuses and we back off."""
    import runstate
    other = runstate.lock_held_by_other(HOME, run_id, now_utc)
    if other:
        log(f"another run holds the lock (started {other.get('ts')}); not starting a second one")
        return "held"
    try:
        runstate.write_lock(HOME, run_id, now_utc)
        sh(["git", "config", "user.name", "clip-engine-cloud"], cwd=HOME)
        sh(["git", "config", "user.email", "clip-engine-cloud@users.noreply.github.com"], cwd=HOME)
        sh(["git", "add", runstate.LOCK_FILE], cwd=HOME, quiet=True)
        sh(["git", "commit", "-q", "-m", f"lock {run_id}"], cwd=HOME, quiet=True)
        r = sh(["git", "push", "-q", "origin", f"HEAD:{STATE_BRANCH}"], cwd=HOME, check=False, quiet=True)
        if r.returncode:
            err = (r.stderr or "").lower()
            if "non-fast-forward" in err or "rejected" in err or "fetch first" in err:
                log("someone else pushed the state branch first: another run is active")
                runstate.clear_lock(HOME)
                sh(["git", "reset", "-q", "--hard", f"origin/{STATE_BRANCH}"], cwd=HOME, check=False, quiet=True)
                return "held"
            import re
            log("lock not pushed (" + re.sub(r"://[^/@\s]+@", "://***@", err.strip()[-120:]) + "); carrying on without it")
            return "skipped"
        return "ok"
    except Exception as e:  # noqa: BLE001
        log(f"lock not taken: {e}")
        return "skipped"


def branch_size_mb() -> float | None:
    """Size of what the state branch holds (tracked + not-ignored files)."""
    try:
        names = sh(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=HOME, quiet=True).stdout
        total = 0
        for n in names.split("\0"):
            if n:
                try:
                    total += (HOME / n).stat().st_size
                except OSError:
                    pass
        return total / 1e6
    except Exception:  # noqa: BLE001
        return None


# ------------------------------------------------------------------ footage

def _download_convert(gdown, fid: str, name: str, dest: Path) -> Path | None:
    """One Drive file -> a 1080p mp4 in dest (the raw download is deleted). None when it can't be used."""
    out = dest / "raw" / name
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        gdown.download(id=fid, output=str(out), quiet=True)
    except Exception as e:  # noqa: BLE001
        log(f"skip {name}: {e}")
        return None
    if not out.exists() or out.stat().st_size > MAX_SOURCE_BYTES:
        log(f"skip {name}: too large for a cloud run")
        out.unlink(missing_ok=True)
        return None
    final = dest / (Path(name).stem + ".mp4")
    r = sh(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx264",
            "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "160k", str(final)], check=False)
    out.unlink(missing_ok=True)
    return final if r.returncode == 0 else None


def _gdown():
    try:
        import gdown
    except ImportError:
        sh([sys.executable, "-m", "pip", "install", "-q", "gdown"], check=False)
        import gdown
    return gdown


def sync_drive(campaign_file: Path, state: dict, ws=None) -> list[str]:
    """Download new files from the campaign's shared Drive folder into its footage folder."""
    c = json.loads(campaign_file.read_text(encoding="utf-8"))
    folder = c.get("footage_drive_folder")
    if not folder:
        return []
    gdown = _gdown()
    dest = HOME / "footage" / Path(c.get("sources", ["footage/x"])[0]).name
    dest.mkdir(parents=True, exist_ok=True)
    seen = set(state.setdefault("drive_seen", []))
    status = state.setdefault("drive_status", {})
    try:
        files = gdown.download_folder(id=folder, skip_download=True, quiet=True) or []
    except Exception as e:  # noqa: BLE001
        log(f"Drive folder not listed: {e}")
        status[c["name"]] = {"ok": False, "why": str(e)[:100], "ts": _utc_str()}
        return []
    status[c["name"]] = {"ok": True, "files": len(files), "ts": _utc_str()}
    new = []
    for f in files:
        fid = getattr(f, "id", None)
        name = Path(getattr(f, "path", "") or getattr(f, "local_path", "") or str(fid)).name
        if not fid or fid in seen:
            continue
        final = _download_convert(gdown, fid, name, dest)
        if not final:
            log(f"Drive file {name} not fetched; will retry next run")
            continue
        seen.add(fid)
        if final:
            new.append(final.name)
            if ws is not None:
                import footage
                footage.drive_note(ws, c["name"], fid, final.name, _clock())
    state["drive_seen"] = sorted(seen)
    if new:
        log(f"new footage: {', '.join(new)}")
    return new


def drive_fetcher(ws, briefs: list[dict]):
    """For a restock: put a source's media back from Drive (by the file id the ledger remembered, else by name)."""
    import footage
    cache: dict = {}

    def fetch(row) -> bool:
        c = next((b for b in briefs if b["name"] == row["campaign"]), None)
        if not c or not c.get("footage_drive_folder"):
            return False
        name = Path(row["input"] or "").name
        fid = footage.drive_id_for(ws, c["name"], name)
        gdown = _gdown()
        if not fid:
            files = cache.get(c["name"])
            if files is None:
                try:
                    files = cache[c["name"]] = gdown.download_folder(id=c["footage_drive_folder"], skip_download=True,
                                                                     quiet=True) or []
                except Exception:  # noqa: BLE001
                    return False
            for f in files:
                if Path(getattr(f, "path", "") or "").stem == Path(name).stem:
                    fid = getattr(f, "id", None)
        if not fid:
            return False
        dest = Path(row["input"]).parent
        dest.mkdir(parents=True, exist_ok=True)
        return _download_convert(gdown, fid, name, dest) is not None
    return fetch


# ------------------------------------------------------------------ live pages

def _clock():
    """The current UTC time (through pipeline's datetime so tests can move the clock)."""
    import pipeline as pl
    return pl.dt.datetime.now(pl.dt.timezone.utc)


def _utc_str(t=None) -> str:
    return (t or _clock()).strftime("%Y-%m-%dT%H:%M:%SZ")


def _is_gone(e: Exception) -> bool:
    """Only an HTTP 404 / 410 means the campaign page was removed. Anything else (500, timeouts, a changed page
    layout) is 'could not check' and keeps the last known status."""
    return isinstance(e, urllib.error.HTTPError) and e.code in (404, 410)


def refresh_live(ws, state: dict, fetch=None, briefs: list[Path] | None = None) -> list[str]:
    """Check every onboarded campaign's live page: budget left, status, rate. A campaign that runs out of budget or
    closes is paused automatically (its posts stop; the others keep going); it resumes if it gets refilled. A page
    that answers 404 on two checks in a row means the campaign was removed (the lifecycle then ends it)."""
    import contentrewards as crw
    fetch = fetch or crw.fetch_campaign
    notes = []
    todo = []
    for f in (all_briefs() if briefs is None else briefs):
        c = json.loads(f.read_text(encoding="utf-8"))
        url = (c.get("permission") or {}).get("campaign_url") or ""
        if "contentrewards.com" not in url or c.get("automation_allowed") is False:
            continue
        todo.append((c, url))
    results = []
    for c, url in todo:
        try:
            results.append((c, url, fetch(url), None))
        except Exception as e:  # noqa: BLE001  (a failed check never pauses a campaign)
            results.append((c, url, None, e))
    gone_all = len(results) >= 2 and all(e is not None and _is_gone(e) for _c, _u, _l, e in results)
    for c, url, live, err in results:
        name = c["name"]
        before = ws.setting(f"campaign_live.{name}", None) or {}
        if err is not None:
            info = dict(before)
            info.update(reachable=False, error=str(err)[:160], fail_count=int(before.get("fail_count") or 0) + 1,
                        checked=_utc_str())
            if _is_gone(err) and not gone_all:    # every campaign 404ing at once is the site's problem, not theirs
                info["gone_count"] = int(before.get("gone_count") or 0) + 1
                notes.append(f"{name}: page answered {err.code} ({info['gone_count']} check(s) in a row)")
            else:
                notes.append(f"{name}: live check failed ({err}); keeping its last status")
            ws.set_setting(f"campaign_live.{name}", info)
            continue
        ok, why = crw.health(live, min_left=max(25.0, 3 * float(c.get("min_payout") or 0)))
        rate = ((live.get("rates") or {}).get("tiktok") or {}).get("cpm")
        info = {"ok": ok, "reason": why, "left": live.get("left"), "budget": live.get("budget"), "cpm": rate,
                "status": live.get("status"), "creators": live.get("creators"), "views": live.get("views"),
                "reachable": True, "fail_count": 0, "gone_count": 0, "checked": _utc_str()}
        ws.set_setting(f"campaign_live.{name}", info)
        if before.get("ok", True) and not ok:
            msg = f"{name} paused automatically: {why}. Posting moved to the other campaigns."
            ws.event(msg, "warn")
            notes.append(msg)
        elif not before.get("ok", True) and ok:
            ws.event(f"{name} resumed: {why}", "ok")
            notes.append(f"{name} resumed ({why})")
        if rate and c.get("cpm") and abs(rate - float(c["cpm"])) > 0.001:
            notes.append(f"{name}: live rate is ${rate}/1K (brief says ${c['cpm']}); earnings use the live rate")
    return notes


def discover_leads(ws, state: dict, discover=None) -> int:
    """Twice a day: scan the whole Content Rewards catalogue (Discover plus the paginated clipping and UGC listings)
    for campaigns worth joining next, ranked for this clipper and filtered (English, pays on TikTok, clipping, no
    application, not adult / gambling, not on the skip-list of organisations that ban automated tools)."""
    last = state.get("last_discover", 0)
    if time.time() - last < DISCOVER_EVERY_H * 3600:
        return 0
    import contentrewards as crw
    bad = {k: v for k, v in (state.get("lead_bad") or {}).items() if time.time() - v < 3 * 86400}
    try:
        found = crw.discover(skip_ids=list(bad)) if discover is None else discover()
    except Exception as e:  # noqa: BLE001
        log(f"discover failed: {e}")
        return 0
    ban = crw.load_ban_list()
    ranked = crw.rank(found)
    joined = {(json.loads(f.read_text(encoding="utf-8")).get("permission") or {}).get("campaign_url", "")
              for f in all_briefs()}
    good = [c for c in ranked if c["url"] not in joined and crw.lead_ok(c, ban)[0]]
    keep_ids = {c["id"] for c in good}
    for c in found:   # remember the useless ones so the next scan does not fetch them again for a few days
        if c.get("id") and c["id"] not in keep_ids and c["url"] not in joined:
            bad[c["id"]] = time.time()
    state["lead_bad"] = bad
    leads = [{k: c.get(k) for k in ("id", "name", "org", "url", "rates", "left", "budget", "creators", "views",
                                     "categories", "types", "content_rules", "requirements", "requires_application",
                                     "score")} for c in good][:25]
    ws.set_setting("leads.discovered", leads)
    (HOME / "leads.json").write_text(json.dumps(leads, indent=2), encoding="utf-8")
    state["last_discover"] = time.time()
    return len(leads)


# ------------------------------------------------------------------ settings, supply, alerts

def configure(ws, per_account: int, campaigns: list | None = None, schedule: bool = True) -> None:
    ws.set_setting("autopilot.enabled", True)
    ws.set_setting("autopilot.via", "free")
    ws.set_setting("autopilot.platforms", ["tiktok"])
    ws.set_setting("autopilot.max_uploads_per_day", per_account)
    ws.set_setting("autopilot.max_slides_per_day", 2)
    ws.set_setting("autopilot.privacy", "public")
    ws.set_setting("autopilot.campaigns", [str(c) for c in (CAMPAIGNS if campaigns is None else campaigns)])
    ws.set_setting("autopilot.every_hours", 4)
    ws.set_setting("autopilot.post_hours", [8, 23])            # 08:00-22:59 New York: US/UK audience awake
    ws.set_setting("autopilot.post_tz", "America/New_York")
    ws.set_setting("autopilot.per_account_per_run", 1)
    ws.set_setting("autopilot.min_gap_hours", 7)               # an account's posts of one kind at least 7 h apart
    ws.set_setting("autopilot.runner", "cloud")
    # post at a planned (jittered, best-hour) time later today through Zernio's scheduledFor, not the minute a run ends
    refused = ws.setting("schedule.refused", None) or {}
    try:   # Zernio refused a scheduled post in the last week: post at once until that has aged out
        recent = bool(refused.get("ts")) and (time.time() - time.mktime(time.strptime(refused["ts"], "%Y-%m-%dT%H:%M:%S"))) < 7 * 86400
    except ValueError:
        recent = False
    ws.set_setting("autopilot.schedule", bool(schedule) and not recent)
    # TikTok's per-post consent (content preview + music terms) for automated posting: the owner asked for
    # fully automatic TikTok posting on 2026-10-22 ("I want this all auto"); Zernio sends the flags per post.
    ws.set_setting("zernio.tiktok_consent", True)


def compute_supply(ws) -> dict:
    """How much ready-to-post content is left and for how many days at the current posting pace."""
    import pipeline as pl
    n = {k: ws.q("SELECT COUNT(*) n FROM clips WHERE status='approved' AND COALESCE(kind,'video')=?", (k,))[0]["n"]
         for k in ("video", "slideshow")}
    decks, by = 0, {}
    briefs = [json.loads(f.read_text(encoding="utf-8")) for f in CAMPAIGNS]
    try:
        import slideshow
        for c in briefs:
            if not c.get("slideshows"):
                continue
            made = {r["text"] for r in ws.q("SELECT text FROM clips WHERE campaign=? AND kind='slideshow'", (c["name"],))}
            d = len([d for d in slideshow.decks_from_transcript(pl.campaign_transcript(ws, c["name"]), c)
                     if d["id"] not in made])
            by[c["name"]] = {"decks": d}
            decks += d
    except Exception:  # noqa: BLE001  (supply info never breaks a run)
        pass
    accounts = 0
    for c in briefs:
        alloc = None
        try:
            import lifecycle
            alloc = lifecycle.accounts_for(ws, c["name"])
        except Exception:  # noqa: BLE001
            pass
        accounts += len(alloc) if alloc is not None else len([a for a in pl.campaign_accounts(c, "tiktok", "free") if a != "default"])
    for c in briefs:
        row = by.setdefault(c["name"], {"decks": 0})
        for k in ("video", "slideshow"):
            row[k + "s"] = ws.q("SELECT COUNT(*) n FROM clips WHERE campaign=? AND status='approved' AND "
                                "COALESCE(kind,'video')=?", (c["name"], k))[0]["n"]
    ws.set_setting("supply.by_campaign", by)
    per_day = max(1, accounts) * (int(ws.setting("autopilot.max_uploads_per_day", 2)) +
                                  int(ws.setting("autopilot.max_slides_per_day", 2)))
    total = n["video"] + n["slideshow"] + decks
    out = {"videos": n["video"], "slideshows": n["slideshow"], "decks_available": decks, "per_day": per_day,
           "days_left": round(total / per_day, 1)}
    ws.set_setting("supply.decks_available", decks)
    ws.set_setting("supply.days_left", out["days_left"])
    ws.set_setting("supply.note", f"{n['video']} clips + {n['slideshow']} slideshows ready, {decks} more slideshow "
                                  f"decks to make: about {out['days_left']} days at {per_day} posts a day. Drop new "
                                  f"footage in the campaign's Drive folder to add more.")
    return out


def owner_alerts(ws, state: dict, supply: dict, key: bool, http=None, now_utc=None, extra=None) -> list[str]:
    """Phone notifications (needs the NTFY_TOPIC secret). See alerts.py: a queue with quiet hours (23:00-08:00 New
    York, critical alerts excepted), one alert per key per day, the 8 PM digest, the Sunday summary, switch and bench
    alerts (`extra`, from the lifecycle), and the older one-off alerts built here (campaign paused, content running
    low, posting errors, key missing)."""
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if not topic:
        return []
    import alerts
    import pipeline as pl
    repo = os.environ.get("GITHUB_REPOSITORY", "demetrades2000-coder/nq-dashboard")
    click = f"https://raw.githack.com/{repo}/clipper-cloud/site/index.html#/submit"
    seen = state.setdefault("notified", {})
    legacy = []
    for r in ws.q("SELECT key, value FROM settings WHERE key LIKE 'campaign_live.%'"):
        try:
            v = json.loads(r["value"])
        except ValueError:
            continue
        name = r["key"].split(".", 1)[1]
        if ws.setting(f"campaign_state.{name}", None):
            seen.pop(f"paused:{name}", None)      # the lifecycle sends the (better) switch alert for this one
            continue
        if v.get("ok", True):
            seen.pop(f"paused:{name}", None)
        elif f"paused:{name}" not in seen:
            legacy.append({"key": f"paused:{name}", "label": f"paused:{name}", "title": f"{name} paused",
                           "msg": f"{v.get('reason')}. Posting moves to the other campaigns. Pick the next one in the "
                                  "dashboard's Leads.", "priority": "high", "tags": "warning"})
    try:   # errors from this cycle's posting attempts (Zernio / TikTok said no)
        lines = (ws.home / "logs" / "autopilot.jsonl").read_text(encoding="utf-8").strip().splitlines()
        errs = (json.loads(lines[-1]).get("upload_errors") or []) if lines else []
    except (OSError, ValueError):
        errs = []
    if errs:
        legacy.append({"key": "uploaderr", "title": "Posting error", "priority": "high", "tags": "warning",
                       "msg": f"{len(errs)} post(s) failed. First: {str(errs[0])[:180]}. They retry on the next run."})
    if supply and supply.get("days_left", 99) < 2:
        legacy.append({"key": "supply", "title": "Content running low", "priority": "high", "tags": "warning",
                       "msg": f"About {supply['days_left']} days of posts left. Add footage to the campaign's Drive folder."})
    if not key and ws.q("SELECT COUNT(*) n FROM clips WHERE status='approved'")[0]["n"]:
        legacy.append({"key": "nokey", "title": "Posting is off", "priority": "urgent", "tags": "warning", "critical": True,
                       "msg": "Add the ZERNIO_API_KEY secret on GitHub and connect TikTok in Zernio."})
    link = DASHBOARD.format(repo=repo)

    def send(title, msg, priority, tags):
        return ntfy(topic, title, msg, click=click, priority=priority, tags=tags, http=http)
    return alerts.run(ws, state, supply, key, send, now_utc or _clock(), link, pl, extra=extra, legacy=legacy)


# ------------------------------------------------------------------ one run

def read_last_cycle(ws) -> dict:
    try:
        lines = (ws.home / "logs" / "autopilot.jsonl").read_text(encoding="utf-8").strip().splitlines()
        return json.loads(lines[-1]) if lines else {}
    except (OSError, ValueError):
        return {}


def fetch_accounts(http=None) -> dict:
    """Ask Zernio which TikTok accounts exist and whether they can post. accounts=None means 'could not ask'."""
    import accountmodes as am
    import zernio
    out = {"key": bool(zernio.api_key()), "accounts": None, "error": None, "valid": None, "raw": None}
    if not out["key"]:
        out["error"] = "ZERNIO_API_KEY is not set"
        return out
    try:
        raw = zernio.list_accounts(http)
    except zernio.ZernioError as e:
        out["error"] = str(e)
        out["valid"] = False if "rejected the API key" in str(e) else None
        return out
    out["valid"], out["raw"] = True, raw
    try:
        health = zernio.accounts_health(http)
    except Exception:  # noqa: BLE001  (health is a bonus: the account list alone is enough)
        health = {}
    out["accounts"] = am.normalize_accounts(raw, health)
    return out


def preflight_context(ws, state: dict, acct: dict, briefs: list[dict], states: dict, live_pages: bool = False,
                      drive: bool = True) -> dict:
    """Everything preflight.run needs. live_pages=True fetches each campaign page now (--preflight); in a normal run
    the result of this run's refresh_live is reused (no extra requests)."""
    import contentrewards as crw
    import zernio

    def page_check(c):
        if live_pages:
            try:
                crw.fetch_campaign((c.get("permission") or {}).get("campaign_url"))
                return True, ""
            except Exception as e:  # noqa: BLE001
                return False, str(e)[:100]
        live = ws.setting(f"campaign_live.{c['name']}", None) or {}
        return live.get("reachable", True), live.get("error", "")

    def drive_check(fid):
        try:
            gdown = _gdown()
            files = gdown.download_folder(id=fid, skip_download=True, quiet=True)
            return (True, "") if files else (False, "the folder is empty or not shared with 'anyone with the link'")
        except Exception as e:  # noqa: BLE001
            return False, str(e)[:100]

    return {"repo": os.environ.get("GITHUB_REPOSITORY", "demetrades2000-coder/nq-dashboard"),
            "key_present": acct["key"], "zernio_valid": acct["valid"], "accounts": acct["accounts"],
            "accounts_error": acct["error"], "briefs": briefs, "states": states, "page_check": page_check,
            "drive_check": drive_check if drive else None, "branch_mb": branch_size_mb(), "home": None,
            "ntfy_topic": bool(os.environ.get("NTFY_TOPIC", "").strip()), "ntfy_tested": bool(state.get("ntfy_tested")),
            "drive_status": state.get("drive_status") or {},
            "rate": dict(zernio.RATE), "chain": ws.setting("chain", None), "now": _clock()}


def _install_signal_handlers() -> None:
    """A cancelled / timed-out Actions job gets SIGTERM: turn it into an exception so the state is still saved."""
    def handler(signum, _frame):
        raise SystemExit(128 + signum)
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            signal.signal(sig, handler)
        except (ValueError, OSError):   # not the main thread (tests)
            pass


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--per-account", type=int, default=int(os.environ.get("CLIP_PER_ACCOUNT", "2")),
                    help="posts per TikTok account per day (TikTok's own ceiling is 15)")
    ap.add_argument("--no-push", action="store_true", help="don't save the state branch (testing)")
    ap.add_argument("--no-drive", action="store_true")
    ap.add_argument("--no-discover", action="store_true")
    ap.add_argument("--no-pull", action="store_true", help="use the local state as is (re-render jobs)")
    ap.add_argument("--no-schedule", action="store_true", help="post at the minute the run reaches a clip, not at a planned time")
    ap.add_argument("--preflight", action="store_true", help="check everything the autopilot needs and print what is missing")
    ap.add_argument("--onboard", nargs="+", metavar="LINK",
                    help="add a campaign you joined: its Content Rewards link, then its brief / Drive links")
    a = ap.parse_args(argv)
    started = time.time()
    os.environ["CLIPPER_HOME"] = str(WSDIR)
    sys.path.insert(0, str(HERE))
    import pipeline as pl
    pl._ZERNIO_NAMES.clear()
    run_id = uuid.uuid4().hex[:12]
    t0 = _clock()
    t0_local = pl.now()
    errors: list[str] = []
    notes: list[str] = []

    if not a.no_pull:
        load_state()
    locked = "skipped" if (a.no_pull or a.no_push) else acquire_lock(run_id, t0)
    if locked == "held":
        print(json.dumps({"skipped": "another run holds the lock"}))
        return 0
    _install_signal_handlers()
    rc = 0
    ws = None
    state: dict = {}
    state_file = HOME / "cloud_state.json"
    site = HOME / "site"
    try:
        if a.onboard:
            global CAMPAIGNS
            import onboard
            (HOME / "campaigns" / "logos").mkdir(parents=True, exist_ok=True)
            cr_links = [x for x in a.onboard if "contentrewards.com" in x or "whop.com" in x]
            if not cr_links:
                raise SystemExit("--onboard needs the campaign's contentrewards.com link first")
            path = onboard.build(cr_links[0], [x for x in a.onboard if x not in cr_links], campaigns_dir=HOME / "campaigns",
                                 download=onboard.gdown_download)
            c = json.loads(path.read_text(encoding="utf-8"))
            gone = _archived()
            if gone.pop(path.name, None) is not None:       # re-onboarding a campaign that had ended brings it back
                (HOME / ARCHIVE_FILE).write_text(json.dumps(gone, indent=2), encoding="utf-8")
            log(f"onboarded {c['name']}: ${c['cpm']}/1K, automation_allowed={c['automation_allowed']}, "
                f"{('posts from TikTok accounts with ' + repr(c['account_match']) + ' in the name') if c.get('account_match') else 'posts from any free TikTok page'}")
            CAMPAIGNS = active_campaigns()
        ws = pl.WS(str(WSDIR))
        remap_paths(ws)
        if state_file.exists():
            try:
                state = json.loads(state_file.read_text(encoding="utf-8"))
            except ValueError:
                state = {}

        def step(name, fn, *args, **kw):
            """One failing step is recorded and the next one still runs."""
            try:
                return fn(*args, **kw)
            except Exception as e:  # noqa: BLE001
                import traceback
                msg = f"{name} failed: {type(e).__name__}: {str(e)[:160]}"
                errors.append(msg)
                log(msg)
                if os.environ.get("CLIPPER_DEBUG"):
                    traceback.print_exc()
                try:
                    ws.event(msg, "error")
                except Exception:  # noqa: BLE001
                    pass
                return None

        if a.preflight:
            return _preflight_main(a, ws, state, step, locked)
        if not a.no_drive:
            for cf in CAMPAIGNS:
                step(f"Drive sync ({cf.stem})", sync_drive, cf, state, ws)
        step("linking footage", link_footage)

        # --- the brain: live pages -> lifecycle (states, accounts, switches) -> settings for the cycle
        acct = step("asking Zernio for accounts", fetch_accounts) or {"key": False, "accounts": None, "error": "n/a", "valid": None}
        for n in step("refreshing campaign pages", refresh_live, ws, state) or []:
            log(n)
        import lifecycle
        briefs = [b for b in (lifecycle.load_brief(f) for f in all_briefs()) if b]
        warmup = bool(ws.setting("autopilot.warmup", True)) and os.environ.get("CLIP_WARMUP", "1") != "0"
        res = step("campaign lifecycle", lifecycle.run, ws, briefs, acct["accounts"], t0, None, warmup) or {"states": {}, "events": [], "alerts": [],
                                                                         "bench": {}, "archived": []}
        for e in res["events"]:
            log(f"switch: {e['kind']} {e['campaign']}: {e['reason']}")
        if res.get("archived"):
            gone = _archived()
            for n in res["archived"]:
                b = next((x for x in briefs if x["name"] == n), None)
                if b:
                    gone[Path(b["_file"]).name] = {"name": n, "ts": _utc_str(t0)}
            (HOME / ARCHIVE_FILE).write_text(json.dumps(gone, indent=2), encoding="utf-8")
            CAMPAIGNS = [f for f in CAMPAIGNS if f.name not in gone]
        by_name = {b["name"]: b for b in briefs}
        run_files = [by_name[n]["_file"] for n, s in res["states"].items() if s["state"] in ("active", "standby")] \
            if res["states"] else None
        configure(ws, a.per_account, run_files, schedule=not a.no_schedule)
        if not a.no_discover:
            n = step("campaign leads", discover_leads, ws, state)
            if n:
                log(f"{n} campaign leads ranked (dashboard: Campaigns > Leads)")
                res["bench"] = step("bench", lifecycle.compute_bench, ws, res["states"], briefs, t0) or res["bench"]
        import performance
        step("performance (before posting)", performance.analyze, ws, t0)
        # restock: campaigns with less than 3 days of content get older sources cut again and more slideshow decks
        low = {n: s for n, s in res["states"].items() if s["state"] in ("active", "standby")
               and (s.get("supply_days") if s.get("supply_days") is not None else 99) < 3}
        ws.set_setting("autopilot.deck_pool", 120 if low else 40)
        if low:
            import footage
            for n in low:
                r = step(f"restock ({n})", footage.restock, ws, by_name[n], t0, low[n]["supply_days"],
                         drive_fetcher(ws, briefs) if not a.no_drive else None)
                if r and r["queued"]:
                    notes.append(f"restock: {len(r['queued'])} older source(s) of {n} queued for more clips")
                    log(notes[-1])
            link_footage()

        key = bool(acct["key"])
        if not key:
            log("ZERNIO_API_KEY is not set in this cloud environment: clipping and queueing only, no posting")
        cycle = step("autopilot cycle", pl.autopilot_cycle, ws, argparse.Namespace(limit=None, preset="veryfast",
                                                                                      cookies_from_browser=None))
        rc = cycle if isinstance(cycle, int) else 0
        posted = ws.q("SELECT COUNT(*) n FROM uploads WHERE created >= ? AND state != 'failed'", (t0_local,))[0]["n"]
        if posted and not a.no_push and locked != "held":
            # checkpoint: the posts are made and cannot be undone, so make the state branch say so right away
            step("state checkpoint", lambda: (state_file.write_text(json.dumps(state, indent=2), encoding="utf-8"),
                                              ws.db.commit(), save_state(f"checkpoint {run_id}")))
        pruned = step("pruning posted media", prune_posted, ws) or 0
        import runstate
        step("trimming state", runstate.trim_state, ws, HOME, t0)
        step("performance", performance.analyze, ws, t0)
        supply = step("supply", compute_supply, ws) or {}
        chain = step("run heartbeat", runstate.chain_update, ws, t0) or {}

        # --- launch checklist, test ping, alerts
        import preflight
        rep = read_last_cycle(ws)
        pctx = preflight_context(ws, state, acct, briefs, res["states"], live_pages=False, drive=False)
        pctx["drive_check"] = None
        step("launch checklist", preflight.run, ws, pctx)
        topic = os.environ.get("NTFY_TOPIC", "").strip()
        if topic and not state.get("ntfy_tested"):
            lt = pl.now_in_tz("America/New_York", t0)
            if lt is None or 8 <= lt.hour < 23:
                if ntfy(topic, "Clip Engine is connected", "Phone alerts work. You will only hear from me when something "
                        "needs you.", priority="low", tags="white_check_mark"):
                    state["ntfy_tested"] = True
        extra = list(res.get("alerts") or [])
        ba = lifecycle.bench_alert(res.get("bench") or {})
        if ba:
            extra.append(ba)
        if chain.get("stalled_hours"):
            extra.append({"key": "chain", "title": "The 4-hourly runs had stalled",
                          "msg": f"No run happened for {chain['stalled_hours']} hours (GitHub may have paused the "
                                 "schedule). Back on track now.", "priority": "high", "tags": "warning", "critical": False})
        try:
            sent = owner_alerts(ws, state, supply, key, now_utc=t0, extra=extra)
            if sent:
                log(f"notified: {', '.join(sent)}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"notifications failed: {e}")
            log(f"notifications skipped: {e}")

        # --- run history (before the dashboard is built, so it shows this run)
        cyc = rep if (rep or {}).get("started", "") >= t0_local else {}   # a stale line from an earlier run is not ours
        n_err = len(errors) + len(cyc.get("upload_errors") or []) + len(cyc.get("step_errors") or [])
        lines = list(errors) + [f"switch: {e['kind']} {e['campaign']}" for e in res["events"]] + notes \
            + list(cyc.get("upload_errors") or [])[:3] + list(cyc.get("step_errors") or []) + list(cyc.get("notes") or [])[:3]
        if not key:
            lines.append("ZERNIO_API_KEY missing: clipping only, no posting")
        runstate.record_run(ws, {"ts": _utc_str(t0), "duration_s": round(time.time() - started, 1), "posted": posted,
                                 "errors": n_err, "queued_videos": supply.get("videos", 0),
                                 "queued_slideshows": supply.get("slideshows", 0), "switches": len(
                                     [e for e in res["events"] if e["kind"] not in ("account_idle",)]),
                                 "notes": runstate.note_lines(lines), "key": key})
        import dashboard
        try:
            data = dashboard.build_data(ws)
            if _hide_money(ws):
                data = dashboard.hide_money(data)
            for name, blob in dashboard.site_files(data, ws).items():
                (site / name).parent.mkdir(parents=True, exist_ok=True)
                (site / name).write_bytes(blob)
        except Exception as e:  # noqa: BLE001
            log(f"dashboard not built: {e}")
        rep_md = WSDIR / "AUTOPILOT_REPORT.md"
        state.update(last_run=_utc_str(t0), zernio_key=key, exit=rc, pruned=pruned, run_id=run_id)
        summary = {
            "posted_today": None, "report": rep_md.read_text(encoding="utf-8")[-3000:] if rep_md.exists() else "",
            "site": str(site), "zernio_key": key,
        }
        print(json.dumps(summary, indent=2))
    finally:
        # whatever happened above (a crash, SIGTERM, a cancelled job): keep the state, free the lock, push the branch
        try:
            state.setdefault("last_run", _utc_str(t0))
            state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
        except OSError:
            pass
        if ws is not None:
            try:
                ws.close()
            except Exception:  # noqa: BLE001
                pass
        if locked == "ok":
            import runstate as _rs
            _rs.clear_lock(HOME)
        if not a.no_push:
            save_state(f"cloud cycle {state.get('last_run', '')}")
    return rc


def _preflight_main(a, ws, state: dict, step, locked: str) -> int:
    """`cloud_runner.py --preflight`: live checks, written to launch.checklist and printed."""
    import lifecycle
    import preflight
    acct = fetch_accounts()
    briefs = [b for b in (lifecycle.load_brief(f) for f in all_briefs()) if b]
    states = {b["name"]: ws.setting(f"campaign_state.{b['name']}", None) or {} for b in briefs}
    ctx = preflight_context(ws, state, acct, briefs, states, live_pages=True, drive=not a.no_drive)
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if topic and not state.get("ntfy_tested"):
        if ntfy(topic, "Clip Engine is connected", "Phone alerts work.", priority="low", tags="white_check_mark"):
            state["ntfy_tested"] = True
            ctx["ntfy_tested"] = True
    items = preflight.run(ws, ctx)
    print(preflight.render(items))
    (HOME / "cloud_state.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    return 0 if all(i["done"] for i in items if not i.get("optional") and not i["manual"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
