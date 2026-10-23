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
CAMPAIGNS = [HERE / "campaigns" / "tradever.json"]
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
    for i in range(4):
        r = sh(["git", "push", "-q", "origin", f"HEAD:{STATE_BRANCH}"], cwd=HOME, check=False)
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


def configure(ws, per_account: int) -> None:
    ws.set_setting("autopilot.enabled", True)
    ws.set_setting("autopilot.via", "free")
    ws.set_setting("autopilot.platforms", ["tiktok"])
    ws.set_setting("autopilot.max_uploads_per_day", per_account)
    ws.set_setting("autopilot.privacy", "public")
    ws.set_setting("autopilot.campaigns", [str(c) for c in CAMPAIGNS])
    ws.set_setting("autopilot.every_hours", 4)
    # TikTok's per-post consent (content preview + music terms) for automated posting: the owner asked for
    # fully automatic TikTok posting on 2026-10-22 ("I want this all auto"); Zernio sends the flags per post.
    ws.set_setting("zernio.tiktok_consent", True)


def prune_posted(ws) -> int:
    """Delete rendered files of clips already live on every platform, to keep the state branch small."""
    n = 0
    for r in ws.q("SELECT c.id, c.ready_file FROM clips c WHERE c.ready_file IS NOT NULL AND "
                  "EXISTS(SELECT 1 FROM uploads u WHERE u.clip_id=c.id AND u.state IN ('live','processing'))"):
        p = Path(r["ready_file"])
        if p.exists():
            p.unlink()
            n += 1
    return n


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--per-account", type=int, default=int(os.environ.get("CLIP_PER_ACCOUNT", "3")),
                    help="posts per TikTok account per day (TikTok's own ceiling is 15)")
    ap.add_argument("--no-push", action="store_true", help="don't save the state branch (testing)")
    ap.add_argument("--no-drive", action="store_true")
    a = ap.parse_args(argv)

    load_state()
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
    import zernio
    key = bool(zernio.api_key())
    if not key:
        log("ZERNIO_API_KEY is not set in this cloud environment: clipping and queueing only, no posting")
    rc = pl.autopilot_cycle(ws, argparse.Namespace(limit=None, preset="veryfast", cookies_from_browser=None))
    pruned = prune_posted(ws)
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
