# Runbook (for the lead engineer)

How the cloud autopilot is built, how to run it, break it, fix it and roll it back. Owner-facing text is in `OWNER_GUIDE.md` and
`FAQ.md`; the data contract the dashboard reads is `docs/AUTOPILOT_CONTRACT.md` and `docs/DASHBOARD_DATA.md`; open defects are in
`docs/features/qa.md`.

## 1. Picture

```
                       GitHub Actions (public repo, free minutes)
   +--------------------------------------------------------------------------------+
   | clipper-cloud.yml  (workflow_dispatch chain, concurrency group "clipper-cloud")  |
   |   sleep wait_minutes  ->  checkout branch tip  ->  python 3.12 + ffmpeg + pip    |
   |   -> python clipper/cloud_runner.py  ->  (ntfy on failure) -> step summary       |
   |   -> `gh workflow run clipper-cloud.yml -f wait_minutes=230`  (starts the next)  |
   +--------------------------------------------------------------------------------+
                |  env: ZERNIO_API_KEY, NTFY_TOPIC (repo secrets), GH_TOKEN (auto)
                v
        cloud_runner.main()  ---------------------------------------------------------+
          1 load_state     git clone/fetch branch clipper-cloud  -> <HOME>=../clip-cloud |
          2 lock           tiny lock file pushed WITHOUT force (two runs never overlap)  |
          3 sync_drive     gdown: new files from the campaign Drive folder -> mp4 1080p  |
          4 link_footage   hard-link <HOME>/footage/<name>/*.mp4 into the brief's folder |
          5 refresh_live   contentrewards.com campaign page: budget, status, rate        |
          6 lifecycle      active / standby / paused / ended / blocked; page <-> campaign|
          7 discover       contentrewards.com/c/discover: ranked leads (every 12 h)      |
          8 restock        older sources re-clipped / more slideshow decks when low      |
          9 autopilot_cycle (pipeline.py): import -> transcribe -> clip -> approve ->    |
                           upload through Zernio -> refresh views -> report              |
         10 checkpoint     state pushed right after posts exist (they cannot be undone)  |
         11 prune/trim     delete posted media, trim old events, vacuum                  |
         12 alerts         ntfy.sh/<topic>: digest, switches, problems (quiet 23-08 NY)  |
         13 dashboard      dashboard.build_data -> site/index.html, data.json, icons     |
         14 save_state     squash to ONE commit, force-push clipper-cloud                |
        +---------------------------------------------------------------------------+---+
              |                  |                    |                |              |
              v                  v                    v                v              v
      contentrewards.com     zernio.com        drive.google.com     ntfy.sh     branch clipper-cloud
      (public pages only)  (accounts, presign,   (gdown, public     (phone      (PUBLIC; the robot's
                            storage PUT, posts,   folder)            notes)      memory + the site)
                            analytics)                                              |
                                   |                                                v
                                   v                                  raw.githack.com/<repo>/clipper-cloud/
                              TikTok pages                              site/index.html   (static dashboard,
                                                                         phone Home Screen app)
   The owner closes the loop by hand: copy link on the Submit tab -> paste on the Content Rewards campaign page.
```

## 2. Moving parts

| Part | File | Job |
|---|---|---|
| Run chain | `.github/workflows/clipper-cloud.yml` | One job per run, then dispatches the next. **Do not edit while live**: any edit to this file triggers a push run and restarts the chain. |
| Runner | `clipper/cloud_runner.py` | The sequence above. Env: `CLIP_CLOUD_DIR` (state checkout, default `../clip-cloud`), `CLIP_CLOUD_BRANCH`, `CLIP_PER_ACCOUNT`, `CLIPPER_DEBUG`. Flags: `--no-push --no-drive --no-discover --no-pull --no-schedule --preflight --onboard`. |
| Autopilot cycle | `clipper/pipeline.py` `autopilot_cycle` | Import, clip, auto-approve, upload (caps, window, min gap, rotation), refresh stats, report. |
| Clip engine | `clipper/clipper.py`, `hooks.py`, `scoring.py`, `captions.py`, `covers.py`, `hygiene.py`, `gate.py` | Transcribe, select, render 9:16, captions, last-look checks. |
| Slideshows | `clipper/slideshow.py` | Photo carousels from the transcript. |
| Posting | `clipper/zernio.py` | Presign, PUT, create post, analytics, account health. The only code that sees the API key. |
| Campaign data | `clipper/contentrewards.py`, `onboard.py`, `campaign.py`, `campaigns/*.json` | Public page parser, brief builder, permission checks, payout maths. |
| Brain | `clipper/lifecycle.py`, `accountmodes.py`, `scheduling.py`, `performance.py`, `footage.py`, `preflight.py`, `runstate.py`, `alerts.py` | State machine, page modes, planned post times, learning, restock, launch checklist, lock/heartbeat/trim, alert queue. |
| Dashboard | `clipper/dashboard.py`, `dashboard_page.html`, `site_assets/` | `build_data` -> JSON; `site_files` -> what is published. |
| Tests | `clipper/tests/` | See section 9. |
| CI | `clipper-linux.yml` (Ubuntu, this suite), `clipper-windows.yml` (launcher, scheduler, keychain) | Neither runs on the `clipper-cloud` branch. |

## 3. Settings (the workspace `settings` table, JSON values)

Written every run by `cloud_runner.configure()` (so a bad value is repaired next run):

| Key | Value | Meaning |
|---|---|---|
| `autopilot.enabled` | true | The cycle runs. |
| `autopilot.via` | "free" | Post through Zernio. |
| `autopilot.platforms` | ["tiktok"] | Cloud posts to TikTok only. |
| `autopilot.max_uploads_per_day` | 2 (`--per-account`, env `CLIP_PER_ACCOUNT`) | Videos per page per day. |
| `autopilot.max_slides_per_day` | 2 | Slideshows per page per day (counted separately). |
| `autopilot.per_account_per_run` | 1 | At most one video and one slideshow per page per run. |
| `autopilot.min_gap_hours` | 7 | Minimum time between one page's posts of one kind. |
| `autopilot.post_hours` / `post_tz` | [8, 23] / America/New_York | Window 08:00-22:59 NY; DST handled by zoneinfo (hand-written fallback if tzdata is missing). |
| `autopilot.privacy` | "public" | |
| `autopilot.campaigns` | list of brief paths | The campaigns this run imports for (lifecycle: active + standby). |
| `autopilot.every_hours` | 4 | Used by the dashboard to judge staleness. |
| `autopilot.schedule` | true | Post at a planned time (Zernio `scheduledFor`), see `scheduling.py`. |
| `autopilot.runner` | "cloud" | |
| `zernio.tiktok_consent` | true | TikTok content-preview and consent flags sent per post. |

Written elsewhere: `campaign_live.<name>`, `campaign_state.<name>`, `account_state.<platform>/<account>`, `switch.log`, `bench`,
`runs.history`, `chain`, `launch.checklist`, `insights`, `performance`, `supply.*`, `leads.discovered`. Shapes: `docs/AUTOPILOT_CONTRACT.md`.
Optional human settings: `publish.hide_money` (not wired in the cloud, see qa.md), `spend.monthly_cap_usd` (AI off at 0).

## 4. State layout

Branch `clipper-cloud` (always ONE commit; force-pushed):

```
.gitignore              raw downloads, ws/clips/, ws/logs/, footage/ are never committed (cloud_runner.GITIGNORE)
cloud_state.json        run bookkeeping: last_run, run_id, zernio_key (bool), exit, pruned, drive_seen, last_discover,
                        notified{key:day}, digest_ts, ntfy_tested, alert queue
runner.lock             present only while a run is working (TTL 100 min, runstate.LOCK_TTL_MIN)
archived_campaigns.json briefs of ended campaigns (re-onboarding brings one back)
leads.json              ranked campaigns to join next
campaigns/              briefs and logos added by --onboard (footage/ inside is ignored)
ws/jobs.db              SQLite: sources, clips, uploads, events, settings, spend
ws/earnings.json        tracked posts with views (tracker.py)
ws/AUTOPILOT_REPORT.md  last cycle in plain words
ws/ready/<campaign>/    rendered clips and slide folders NOT yet posted (posted ones are pruned)
ws/sources/*/transcript.json  kept (re-clipping and slideshow decks need them)
site/                   index.html, data.json, manifest, sw.js, icons, thumbs/N.jpg  (what the dashboard serves)
```

Everything in it is public. `tests/test_security.py` proves no secret value, ntfy topic or token is in it.

## 5. The workflow chain

- `on: push` (only that file's path) and `workflow_dispatch` (`wait_minutes`). Schedules are not used: GitHub runs `schedule:`
  only from the default branch, and `main` belongs to another project. So each run starts the next with `gh workflow run ... -f wait_minutes=230`.
- `concurrency: clipper-cloud, cancel-in-progress: false` queues instead of cancelling. The last step skips starting a new run if another one
  is queued, in progress or waiting (one chain only).
- `timeout-minutes: 340`: wait (230) + a cycle must stay below GitHub's 6 h job limit. A cycle that takes more than about 100 minutes will overrun.
- Failure of the cycle does not break the chain: the step has `continue-on-error`, and the last two steps run `if: always()`.
- **Restart**: Actions, clipper-cloud, Run workflow, branch `claude/determined-shannon-94kfrp`, wait_minutes 0. Or push any change to the workflow file.
- **Stop**: Actions, clipper-cloud, Disable workflow (a run already waiting still finishes; cancel it too).
- If two chains exist (two queued runs both wake up), the lock in section 4 stops the second from posting; cancel one by hand.

## 6. Debug a failed run from the Actions log

1. Actions, `clipper-cloud`, the red run, expand **Autopilot cycle**. Everything the runner prints is there.
2. Prefixes: `[cloud HH:MM:SS]` = cloud_runner; `[  12.3s] OK/!!/..` = pipeline and clipper; `$ git ...` = a failed git command (last 400 chars).
3. A failing step is isolated and logged as `<step name> failed: <ExceptionType>: <message>` (and recorded as an `error` event and in
   `runs.history`). The other steps still run, the state is still saved. A traceback appears with `CLIPPER_DEBUG=1` (add it to the job `env`
   in a throw-away copy of the workflow, never in the live one while the chain runs; or reproduce locally, below).
4. Dashboard: Jobs & health (checks, failed sources), Activity (events), the red/amber reasons. `ws/AUTOPILOT_REPORT.md` has the last cycle
   (also at the bottom of the run's step summary).
5. Common causes:
   - `could not push the state branch`: permissions (`contents: write`) or a competing push; check the lock and whether two chains run.
   - `Zernio rejected the API key` / `ZERNIO_API_KEY is not set`: rotate the secret (section 7).
   - `no tiktok account connected with 'x' in its name`: the brand-name rule (account_match), reconnect or rename in Zernio.
   - `live check failed`: contentrewards.com page changed or was down; a failed check never pauses a campaign. If `contentrewards.parse_campaign`
     needs fixing, the saved page text in the log helps.
   - `Drive folder not listed`: the folder is not shared "anyone with the link", or Google blocked the runner (quota).
6. Reproduce offline: `python -X utf8 -m unittest tests.test_e2e_cloud.RulesCheap` shows how to build a fake world. For a real data check run
   `CLIP_CLOUD_DIR=/tmp/cc python clipper/cloud_runner.py --no-push --no-drive --no-discover` with the secret in your environment (never in a file).
   `--preflight` prints the launch checklist without cycling.

## 7. Rotating secrets

- **ZERNIO_API_KEY**: create a new key in Zernio; replace the repository secret (Settings, Secrets and variables, Actions); revoke the old key in
  Zernio; the next run uses it (or Run workflow). Check with `--preflight` or the launch checklist item `zernio_key`.
- **NTFY_TOPIC**: the topic is the only secret protecting your notifications. Make a new random string (16+ characters), update the secret, subscribe
  to it in the ntfy app, drop the old subscription. Anyone who knew the old topic could read old and future notes until then.
- **GH_TOKEN**: it is the automatic per-run `github.token`; nothing to rotate. Its permissions are `contents: write`, `actions: write` only.
- **If a secret was ever committed or printed**: treat it as leaked: revoke first, then clean. The state branch is squashed on every run, but old
  commits can stay reachable by SHA on GitHub for a while, so revoke, never rely on the squash.
- Never store a key in `jobs.db`, `cloud_state.json` or the site. `tests/test_security.py::SecretsNeverLeak` greps the whole branch for sentinel values.

## 8. Roll back the state branch

The branch is one force-pushed commit, so there is **no history to roll back to**. Make a backup before any risky change:

```
git fetch origin clipper-cloud
git push origin FETCH_HEAD:refs/heads/clipper-backup-$(date +%F)
```

To roll back: disable the workflow and cancel waiting runs; `git push --force origin clipper-backup-<date>:clipper-cloud`; run
`python clipper/cloud_runner.py --preflight` locally or Run workflow with wait 0. **Warning**: the database is the record of what was posted.
After a rollback, clips posted since the backup look "not posted" and would be posted again. Before re-enabling, compare Zernio's post list with
`uploads` (or delete those clips). Also see qa.md bug 1 (a crash after posting).

To start from nothing: delete the branch on GitHub. The next run creates it fresh. Past posts are forgotten, so the same duplicate warning applies.

## 9. Tests

From `clipper/`: `python -X utf8 -m unittest discover -s tests -v`. Fast checks while editing: `tests.test_docs`, `tests.test_security.StaticAudit`,
`tests.test_e2e_cloud.RulesCheap` (about 30 s). `tests/fakeworld.py` is the shared fake internet (Content Rewards, Zernio, ntfy, a bare git origin,
a controllable clock). The browser XSS test needs Chromium and node (`PW_MODULE`, `PW_CHROMIUM`); it skips itself if they are missing and runs in the
`browser` job of `clipper-linux.yml`. A test marked `expectedFailure` documents a real defect from qa.md; when you fix the bug it shows up as an
"unexpected success": remove the decorator.

## 10. Known limits (honest list)

- Views come from Zernio analytics (plan-dependent) with a TikTok page scrape fallback that datacenter IPs often cannot do. No views means $0 estimates.
- Earnings are estimates (public views x live rate x fee). Whop pays on verified views after about 10 days; hold and rules are hidden until a campaign is joined.
- One run chain on GitHub: it can be delayed or paused by GitHub; the dashboard turns red after about 2.5 cadences.
- The state branch is public and a single commit; no history, no private fields. The dashboard is a public page (earnings visible; see qa.md bug 2).
- Held clips are not reviewed in the cloud. Footage over about 2.5 GB is skipped. Cloud posting is TikTok only.
- Everything relies on the public structure of contentrewards.com pages; a redesign makes the live check fail (it then keeps the last status).
