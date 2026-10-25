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
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
STATE_BRANCH = os.environ.get("CLIP_CLOUD_BRANCH", "clipper-cloud")
HOME = Path(os.environ.get("CLIP_CLOUD_DIR", str(REPO.parent / "clip-cloud")))   # next to the repo checkout
WSDIR = HOME / "ws"
DISCOVER_EVERY_H = 12


def active_campaigns() -> list[Path]:
    """Every campaign brief that is cleared for the cloud autopilot: rules allow automated tools and not opted out.
    New campaigns join by adding their brief (onboard.py); none is hard-coded."""
    out = []
    for f in sorted((HERE / "campaigns").glob("*.json")) + sorted((HOME / "campaigns").glob("*.json")):
        if f.name.startswith("_"):
            continue
        try:
            c = json.loads(f.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if c.get("automation_allowed") is True and c.get("cloud", True) is not False:
            out.append(f)
    return out


CAMPAIGNS = active_campaigns()
MAX_SOURCE_BYTES = 2_500_000_000   # raw 4K masters are skipped (process those on a PC or pre-convert them)

GITIGNORE = """# raw downloads and intermediate files stay out of the state branch
ws/sources/*/source.*
ws/sources/*/*.wav
ws/clips/
ws/logs/
footage/
*.lock
"""


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


def sync_drive(campaign_file: Path, state: dict) -> list[str]:
    """Download new files from the campaign's shared Drive folder into its footage folder."""
    c = json.loads(campaign_file.read_text(encoding="utf-8"))
    folder = c.get("footage_drive_folder")
    if not folder:
        return []
    try:
        import gdown  # noqa: F401
    except ImportError:
        sh([sys.executable, "-m", "pip", "install", "-q", "gdown"], check=False)
    import gdown
    dest = HOME / "footage" / Path(c.get("sources", ["footage/x"])[0]).name
    dest.mkdir(parents=True, exist_ok=True)
    seen = set(state.setdefault("drive_seen", []))
    try:
        files = gdown.download_folder(id=folder, skip_download=True, quiet=True) or []
    except Exception as e:  # noqa: BLE001
        log(f"Drive folder not listed: {e}")
        return []
    new = []
    for f in files:
        fid = getattr(f, "id", None)
        name = Path(getattr(f, "path", "") or getattr(f, "local_path", "") or str(fid)).name
        if not fid or fid in seen:
            continue
        out = dest / "raw" / name
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            gdown.download(id=fid, output=str(out), quiet=True)
        except Exception as e:  # noqa: BLE001
            log(f"skip {name}: {e}")
            continue
        seen.add(fid)
        if not out.exists() or out.stat().st_size > MAX_SOURCE_BYTES:
            log(f"skip {name}: too large for a cloud run")
            out.unlink(missing_ok=True)
            continue
        final = dest / (Path(name).stem + ".mp4")
        r = sh(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-vf", "scale='min(1080,iw)':-2", "-c:v", "libx264",
                "-preset", "veryfast", "-crf", "21", "-c:a", "aac", "-b:a", "160k", str(final)], check=False)
        out.unlink(missing_ok=True)
        if r.returncode == 0:
            new.append(final.name)
    state["drive_seen"] = sorted(seen)
    if new:
        log(f"new footage: {', '.join(new)}")
    return new


def link_footage() -> None:
    """The campaign brief reads footage/<name>; point it at the state's footage so imports find it."""
    for cf in CAMPAIGNS:
        c = json.loads(cf.read_text(encoding="utf-8"))
        for src in c.get("sources", []):
            local = cf.parent / src
            cloud = HOME / "footage" / Path(src).name
            cloud.mkdir(parents=True, exist_ok=True)
            local.mkdir(parents=True, exist_ok=True)
            for f in cloud.glob("*.mp4"):
                tgt = local / f.name
                if not tgt.exists():
                    try:   # a hard link: the file really sits in the campaign's allowed folder (no symlink escape)
                        os.link(f, tgt)
                    except OSError:
                        shutil.copy2(f, tgt)


def refresh_live(ws, state: dict) -> list[str]:
    """Check every active campaign's live page: budget left, status, rate. A campaign that runs out of budget or
    closes is paused automatically (its posts stop; the others keep going); it resumes if it gets refilled."""
    import contentrewards as crw
    notes = []
    for f in CAMPAIGNS:
        c = json.loads(f.read_text(encoding="utf-8"))
        url = (c.get("permission") or {}).get("campaign_url") or ""
        if "contentrewards.com" not in url:
            continue
        before = ws.setting(f"campaign_live.{c['name']}", None) or {}
        try:
            live = crw.fetch_campaign(url)
        except Exception as e:  # noqa: BLE001  (a failed check never pauses a campaign)
            notes.append(f"{c['name']}: live check failed ({e}); keeping its last status")
            continue
        ok, why = crw.health(live, min_left=max(25.0, 3 * float(c.get("min_payout") or 0)))
        rate = ((live.get("rates") or {}).get("tiktok") or {}).get("cpm")
        info = {"ok": ok, "reason": why, "left": live.get("left"), "budget": live.get("budget"), "cpm": rate,
                "status": live.get("status"), "creators": live.get("creators"), "views": live.get("views"),
                "checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        ws.set_setting(f"campaign_live.{c['name']}", info)
        if before.get("ok", True) and not ok:
            msg = f"{c['name']} paused automatically: {why}. Posting moved to the other campaigns."
            ws.event(msg, "warn")
            notes.append(msg)
        elif not before.get("ok", True) and ok:
            ws.event(f"{c['name']} resumed: {why}", "ok")
            notes.append(f"{c['name']} resumed ({why})")
        if rate and c.get("cpm") and abs(rate - float(c["cpm"])) > 0.001:
            notes.append(f"{c['name']}: live rate is ${rate}/1K (brief says ${c['cpm']}); earnings use the live rate")
    return notes


def discover_leads(ws, state: dict) -> int:
    """Twice a day: scan Content Rewards for campaigns worth joining next, ranked for this clipper."""
    last = state.get("last_discover", 0)
    if time.time() - last < DISCOVER_EVERY_H * 3600:
        return 0
    import contentrewards as crw
    try:
        found = crw.rank(crw.discover())
    except Exception as e:  # noqa: BLE001
        log(f"discover failed: {e}")
        return 0
    joined = {(json.loads(f.read_text(encoding="utf-8")).get("permission") or {}).get("campaign_url", "")
              for d in (HERE / "campaigns", HOME / "campaigns") for f in d.glob("*.json") if not f.name.startswith("_")}
    leads = [{k: c.get(k) for k in ("id", "name", "org", "url", "rates", "left", "budget", "creators", "views",
                                     "categories", "types", "content_rules", "requirements", "requires_application",
                                     "score")} for c in found if c["url"] not in joined][:25]
    ws.set_setting("leads.discovered", leads)
    (HOME / "leads.json").write_text(json.dumps(leads, indent=2), encoding="utf-8")
    state["last_discover"] = time.time()
    return len(leads)


def configure(ws, per_account: int) -> None:
    ws.set_setting("autopilot.enabled", True)
    ws.set_setting("autopilot.via", "free")
    ws.set_setting("autopilot.platforms", ["tiktok"])
    ws.set_setting("autopilot.max_uploads_per_day", per_account)
    ws.set_setting("autopilot.max_slides_per_day", 2)
    ws.set_setting("autopilot.privacy", "public")
    ws.set_setting("autopilot.campaigns", [str(c) for c in CAMPAIGNS])
    ws.set_setting("autopilot.every_hours", 4)
    ws.set_setting("autopilot.post_hours", [8, 23])            # 08:00-22:59 New York: US/UK audience awake
    ws.set_setting("autopilot.post_tz", "America/New_York")
    ws.set_setting("autopilot.per_account_per_run", 1)         # one video (and one slideshow) per account per run
    ws.set_setting("autopilot.runner", "cloud")
    # TikTok's per-post consent (content preview + music terms) for automated posting: the owner asked for
    # fully automatic TikTok posting on 2026-10-22 ("I want this all auto"); Zernio sends the flags per post.
    ws.set_setting("zernio.tiktok_consent", True)


def compute_supply(ws) -> dict:
    """How much ready-to-post content is left and for how many days at the current posting pace."""
    import pipeline as pl
    n = {k: ws.q("SELECT COUNT(*) n FROM clips WHERE status='approved' AND COALESCE(kind,'video')=?", (k,))[0]["n"]
         for k in ("video", "slideshow")}
    decks = 0
    try:
        import slideshow
        for f in CAMPAIGNS:
            c = json.loads(f.read_text(encoding="utf-8"))
            if not c.get("slideshows"):
                continue
            made = {r["text"] for r in ws.q("SELECT text FROM clips WHERE campaign=? AND kind='slideshow'", (c["name"],))}
            decks += len([d for d in slideshow.decks_from_transcript(pl.campaign_transcript(ws, c["name"]), c)
                          if d["id"] not in made])
    except Exception:  # noqa: BLE001  (supply info never breaks a run)
        pass
    accounts = 0
    for f in CAMPAIGNS:
        c = json.loads(f.read_text(encoding="utf-8"))
        accounts += len([a for a in pl.campaign_accounts(c, "tiktok", "free") if a != "default"])
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


def owner_alerts(ws, state: dict, supply: dict, key: bool, http=None, now_utc=None) -> list[str]:
    """Phone notifications (needs the NTFY_TOPIC secret): a nightly 'N links to submit' note at 8 PM New York, and
    one-off alerts when something needs the owner (campaign paused, content running low, posting key missing)."""
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if not topic:
        return []
    import pipeline as pl
    repo = os.environ.get("GITHUB_REPOSITORY", "demetrades2000-coder/nq-dashboard")
    click = f"https://raw.githack.com/{repo}/clipper-cloud/site/index.html#/submit"
    t = pl.now_in_tz("America/New_York", now_utc)
    day = t.strftime("%Y-%m-%d") if t else time.strftime("%Y-%m-%d")
    sent, seen = [], state.setdefault("notified", {})

    def once(k, title, msg, **kw):
        if seen.get(k) != day:
            if ntfy(topic, title, msg, click=click, http=http, **kw):
                seen[k] = day
                sent.append(title)
    n = ws.q("SELECT COUNT(*) n FROM uploads WHERE url IS NOT NULL AND created > ?", (state.get("digest_ts", ""),))[0]["n"]
    if t and t.hour >= 20 and seen.get("digest") != day and n:
        if ntfy(topic, f"{n} new links to submit", "Open the dashboard, tap Copy next link, paste it on the campaign "
                "page. 2 minutes.", click=click, tags="memo", http=http):
            seen["digest"] = day
            state["digest_ts"] = pl.now()
            sent.append("digest")
    for r in ws.q("SELECT key, value FROM settings WHERE key LIKE 'campaign_live.%'"):
        try:
            v = json.loads(r["value"])
        except ValueError:
            continue
        name = r["key"].split(".", 1)[1]
        if v.get("ok", True):
            seen.pop(f"paused:{name}", None)
        elif f"paused:{name}" not in seen:
            if ntfy(topic, f"{name} paused", f"{v.get('reason')}. Posting moves to the other campaigns. Pick the next "
                    "one in the dashboard's Leads.", click=click, priority="high", tags="warning", http=http):
                seen[f"paused:{name}"] = day
                sent.append(f"paused:{name}")
    try:   # errors from this cycle's posting attempts (Zernio / TikTok said no)
        lines = (ws.home / "logs" / "autopilot.jsonl").read_text(encoding="utf-8").strip().splitlines()
        errs = (json.loads(lines[-1]).get("upload_errors") or []) if lines else []
    except (OSError, ValueError):
        errs = []
    if errs:
        once("uploaderr", "Posting error", f"{len(errs)} post(s) failed. First: {str(errs[0])[:180]}. They retry on "
             "the next run.", priority="high", tags="warning")
    if supply and supply.get("days_left", 99) < 2:
        once("supply", "Content running low", f"About {supply['days_left']} days of posts left. Add footage to the "
             "campaign's Drive folder.", priority="high", tags="warning")
    if not key and ws.q("SELECT COUNT(*) n FROM clips WHERE status='approved'")[0]["n"]:
        once("nokey", "Posting is off", "Add the ZERNIO_API_KEY secret on GitHub and connect TikTok in Zernio.",
             priority="high", tags="warning")
    return sent


def prune_posted(ws) -> int:
    """Delete rendered files of clips already live on every platform, to keep the state branch small."""
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


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--per-account", type=int, default=int(os.environ.get("CLIP_PER_ACCOUNT", "2")),
                    help="posts per TikTok account per day (TikTok's own ceiling is 15)")
    ap.add_argument("--no-push", action="store_true", help="don't save the state branch (testing)")
    ap.add_argument("--no-drive", action="store_true")
    ap.add_argument("--no-discover", action="store_true")
    ap.add_argument("--no-pull", action="store_true", help="use the local state as is (re-render jobs)")
    ap.add_argument("--onboard", nargs="+", metavar="LINK",
                    help="add a campaign you joined: its Content Rewards link, then its brief / Drive links")
    a = ap.parse_args(argv)

    if not a.no_pull:
        load_state()
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
        log(f"onboarded {c['name']}: ${c['cpm']}/1K, automation_allowed={c['automation_allowed']}, posts from TikTok "
            f"accounts with '{c['account_match']}' in the name")
        CAMPAIGNS = active_campaigns()
    os.environ["CLIPPER_HOME"] = str(WSDIR)
    sys.path.insert(0, str(HERE))
    import pipeline as pl
    ws = pl.WS(str(WSDIR))
    remap_paths(ws)
    state_file = HOME / "cloud_state.json"
    state = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {}
    if not a.no_drive:
        for cf in CAMPAIGNS:
            sync_drive(cf, state)
    link_footage()
    configure(ws, a.per_account)
    for n in refresh_live(ws, state):
        log(n)
    if not a.no_discover:
        n = discover_leads(ws, state)
        if n:
            log(f"{n} campaign leads ranked (dashboard: Campaigns > Leads)")
    import zernio
    key = bool(zernio.api_key())
    if not key:
        log("ZERNIO_API_KEY is not set in this cloud environment: clipping and queueing only, no posting")
    rc = pl.autopilot_cycle(ws, argparse.Namespace(limit=None, preset="veryfast", cookies_from_browser=None))
    pruned = prune_posted(ws)
    supply = compute_supply(ws)
    try:
        sent = owner_alerts(ws, state, supply, key)
        if sent:
            log(f"notified: {', '.join(sent)}")
    except Exception as e:  # noqa: BLE001
        log(f"notifications skipped: {e}")
    import dashboard
    site = HOME / "site"
    try:
        data = dashboard.build_data(ws)
        for name, blob in dashboard.site_files(data, ws).items():
            (site / name).parent.mkdir(parents=True, exist_ok=True)
            (site / name).write_bytes(blob)
    except Exception as e:  # noqa: BLE001
        log(f"dashboard not built: {e}")
    rep_md = WSDIR / "AUTOPILOT_REPORT.md"
    state.update(last_run=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), zernio_key=key, exit=rc, pruned=pruned)
    state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
    ws.close()
    summary = {
        "posted_today": None, "report": rep_md.read_text(encoding="utf-8")[-3000:] if rep_md.exists() else "",
        "site": str(site), "zernio_key": key,
    }
    print(json.dumps(summary, indent=2))
    if not a.no_push:
        save_state(f"cloud cycle {state['last_run']}")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
