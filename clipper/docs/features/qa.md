# QA, security, CI and docs report

Owner: the QA / security / CI / docs workstream. Snapshot: 2026-10-26, after the autopilot brain (lifecycle, scheduling, alerts, run lock) was
merged into `cloud_runner.py` and `pipeline.py`. Everything here was checked against the code as it stood then; line numbers will drift.
Nothing outside the files this workstream owns was edited. Bugs found in other files are in "Bugs for the lead" below.

How to run it all (from `clipper/`):

```
python -X utf8 -m unittest tests.test_docs                       # 3 s
python -X utf8 -m unittest tests.test_security.StaticAudit        # 5 s
python -X utf8 -m unittest tests.test_e2e_cloud.RulesCheap        # 40 s
python -X utf8 -m unittest tests.test_e2e_cloud tests.test_resilience tests.test_security   # 10-15 min on a shared CPU
python -X utf8 -m unittest discover -s tests                      # everything (what clipper-linux.yml runs)
```

## Deliverables

1. `tests/fakeworld.py`: a fake outside world shared by the end-to-end, security and resilience tests: one replacement for
   `urllib.request.urlopen` that answers as Content Rewards (campaign pages, discover), Zernio (accounts, presign, storage PUT, posts with
   `Idempotency-Key` and `scheduledFor`, post lookup, analytics) and ntfy.sh; refuses and records any host outside an allow-list; a
   controllable clock (swapped into `pipeline` and `dashboard`); a bare git repo as `origin` with a fresh "VM" for every run; a fake speech
   recogniser with a distinct transcript per episode; seeders for approved clips (no video work) and hooks to damage the restored state.
2. `tests/test_e2e_cloud.py`: drives `cloud_runner.main()` for real over simulated days. `FullChain` (5 runs, 3 real episodes cut by ffmpeg, 3
   slideshow decks), `RulesCheap` (paused/refilled campaign, key missing/rejected, Zernio 5xx and 429, no matching page, page added later, two
   campaigns, DST, runner lost after posting), `WarmupAndScheduling`, `LifecycleScenarios` (runs dry, standby promoted, account moved, limited
   page, key missing, Zernio down, run lock).
3. `tests/test_security.py`: secrets never leak (sentinel key, ntfy topic and token searched in the whole state branch, the VM disk, the database
   and stdout), static audit (no shell/eval/pickle, subprocess gets lists, URL host allow-list, secret-scanning regexes, workflow review),
   paths and files (hostile file names, Drive sync, traversal, zip), prompt injection, dashboard leaks, XSS in a real browser.
4. `tests/fixtures/xss_probe.mjs`: the headless-Chromium probe (Playwright) used by 3: walks every page, opens clip sheets, reports what ran.
5. `tests/test_resilience.py`: corrupted settings / cloud state / sqlite, missing transcripts, bad briefs (one broken brief next to a good one),
   Drive failures, Content Rewards 500 and HTML changes, Zernio 401/429/5xx/HTML/dropped connection mid-batch, disk full, clock skew, DST (March
   and November, plus a hand-written fallback checked against `zoneinfo` hour by hour for 6 years), leap day, year end, huge captions, unicode,
   zero accounts, 100 accounts, 12 campaigns.
6. `tests/test_docs.py`: every path, `python` command and flag, setting key and environment variable in START_HERE / OWNER_GUIDE / FAQ / RUNBOOK
   exists in the code; links and images are well formed; quoted numbers match `configure()` and the workflow; no secrets in any doc; structure
   (FAQ has 30+ numbered questions with answers, owner-guide sections, runbook parts, this report).
7. `.github/workflows/clipper-linux.yml`: tests on Ubuntu (Python 3.12, apt ffmpeg, pip cache, 45-minute timeout, cancel-in-progress), a second
   job that installs Playwright and runs the browser XSS test. Separate from the autopilot chain: ignores pushes to `clipper-cloud`, does not
   trigger on `clipper-cloud.yml`, read-only permissions, no secrets.
8. `OWNER_GUIDE.md`: plain English, phone first: what it does, the daily chore, dashboard colours, payouts and the 10-day delay, add a campaign,
   add / rename a TikTok page and the brand-name rule, what to do when X, what not to do.
9. `RUNBOOK.md`: ASCII architecture, every moving part, settings keys, state layout, workflow chain and restart, debugging a failed run, rotating
   secrets, rolling back the state branch, known limits.
10. `FAQ.md`: 42 questions; the money answers say "estimate", hidden rules, bot score, related accounts and the 10-day hold.
11. `START_HERE.md`: rewritten so every claim is true of the code (cloud first, PC optional, daily chore via the Submit tab, honest money note).
12. `README.md`, `PROGRAMS.md`, `LEADS.md`: header notes that point to the current docs and flag what is stale (Alpha Futures ban, payout timing,
    estimates).
13. Security audit of the code (this file, "Security audit").
14. GitHub Actions hardening review of `clipper-cloud.yml` (read only), findings W1 to W5 below, enforced by a test so they cannot grow unseen.
15. Supply-chain review (requirements, runtime installs, actions, model downloads), below.
16. Secret-scanning regexes (13 patterns) over `clipper/` and `.github/`, run by `test_security.StaticAudit` and over the docs by `test_docs`.
17. Proof that hostile text does not execute in the dashboard: 23 distinct data fields (campaign name, notes, mentions, clip titles and captions,
    events, job errors, lead names, Zernio account names ...) rendered in Chromium on every page, hosted and local; none ran.
18. Prompt-injection audit: hostile transcript and brief text is shown to change nothing (no AI call, no new host, settings intact).
19. Subprocess / ffmpeg / path / zip audit with hostile file names (`'`, `;`, `$()`, backticks, `&&`, `|`, leading `-`, RTL, `:`/`,`/`[]`, emoji).
20. Code-quality pass: pyflakes, compileall, long functions, broad excepts, secret-printing paths (section below).
21. Bug list for the lead with file, scenario and fix, priority ordered (section below).
22. Top 5 risks for the first live week (end of this file).

## Test results (this snapshot)

| File | Tests | Result |
|---|---|---|
| `tests/test_docs.py` | 27 | all pass |
| `tests/test_security.py` | 44 | pass; 8 `expectedFailure` = real bugs 1, 2, 4, 5, 6, 8, 9, 10 (browser tests skip without Chromium) |
| `tests/test_e2e_cloud.py` | 41 | all pass (the lifecycle scenarios run because `lifecycle.py` exists) |
| `tests/test_resilience.py` | 50 | pass; 5 `expectedFailure` = real bugs 3, 7, 8 (two tests), 11 |

An `expectedFailure` test describes a bug that is still open. When a bug is fixed the test reports an "unexpected success": delete the
decorator. A fixed bug turned into a normal regression test already: duplicate posts after a crash (idempotency key + checkpoint), one broken
brief stopping every campaign (steps are isolated), a damaged `cloud_state.json`, clips of a campaign whose rules stopped allowing tools.

## Bugs for the lead (priority order)

Severity: H = fix before relying on it, M = fix this week, L = when convenient. Each has a test (named) that fails today.

- **Bug 1 (M, security) Upload error text is stored and published without redaction.**
  File: `zernio.py:148` `_explain()` copies the API's error text (first 200 chars); `pipeline.py:1946` `rep["upload_errors"].append(...)` stores it;
  it reaches `ws/AUTOPILOT_REPORT.md`, `ws/logs/autopilot.jsonl` (not in the branch), `site/data.json` (`autopilot.errors`) and the public Actions
  step summary (`tail -c 3000 AUTOPILOT_REPORT.md`), all public. `cl.redact()` is applied only in `WS.event()` and only knows `api_key=...`,
  `token:...` and `sk-ant-...`: not `Bearer ...` and not the actual key value.
  Scenario: an API or proxy that echoes the Authorization header in an error (`"bad request from Bearer zk_live_..."`). The key lands in the
  public branch. Test: `test_security.EchoedSecrets`.
  Fix: one `redact_known(text)` that replaces the exact values of `ZERNIO_API_KEY`, `NTFY_TOPIC`, `GH_TOKEN` (and any `Bearer \S+`), called in
  `zernio._explain`, `classify()`, `WS.event` and when writing the report / `runs.history` notes.
- **Bug 2 (M, privacy) The cloud dashboard publishes estimated earnings; there is no way to hide them.**
  File: `cloud_runner.py:889` builds `dashboard.site_files(data, ws)` from `build_data()` and never calls `dashboard.hide_money()`
  (`dashboard.py:2236`); the setting `publish.hide_money` is only honoured by `pipeline.publish_dashboard` (PC). The page and the public
  `clipper-cloud` branch therefore show $ per post, campaign, day and the month total to anyone with the link.
  Test: `test_security.DashboardLeaks.test_cloud_runner_honours_publish_hide_money`.
  Fix: in `main()` read `os.environ.get("CLIP_HIDE_MONEY")` (a repository variable) or `ws.setting("publish.hide_money")` and pass the data
  through `hide_money()` before `site_files`; document it in OWNER_GUIDE ("Do not treat the dashboard link as private" would then be softer).
- **Bug 3 (M) A failed Drive download is remembered as seen, so the file is never fetched again.**
  File: `cloud_runner.py:346` `seen.add(fid)` runs even when `_download_convert()` returned `None` (quota, timeout, a Google hiccup).
  Scenario: one transient error on a new footage file and that video is lost for good; the supply meter just runs down. Test:
  `test_resilience.BadWorld.test_drive_download_of_one_file_fails_the_others_continue`.
  Fix: add to `seen` only when the file was converted, or when it is permanently unusable (too large); log "will retry" otherwise.
- **Bug 4 (M-L, security) `javascript:` and `data:` URLs are rendered as links.**
  File: `dashboard_page.html`, every `href="${esc(...)}"` (15 places: upload urls, `s.page`, `g.page`, lead `l.url`, campaign `url`, top actions,
  leaderboard). `esc()` stops HTML injection but not a dangerous scheme; tapping "Open" runs `javascript:...`. Sources of those URLs: Zernio
  (always http(s) because `_find_url` insists), contentrewards ids, hand-written briefs (`permission.campaign_url`), and the database. Needs a
  hostile brief or API to exploit, but the page is the owner's money dashboard. Test: `test_security.XssInBrowser.test_javascript_and_data_urls...`.
  Fix: a helper `const safeUrl = (u) => /^https?:\/\//i.test(String(u||'')) ? u : ''` used for every href, and drop non-http(s) urls in
  `dashboard.build_data`.
- **Bug 5 (M, permission gate) Allowed-source matching is a plain prefix test.**
  File: `campaign.py:251` `_norm_url(x).startswith(na)`. The allowed channel `youtube.com/@creator` admits `youtube.com/@creatorfake`. Permission
  to clip is the project's core safety rule. Test: `test_security.PathsAndFiles.test_allowed_source_url_matches_whole_path_segments_only`.
  Fix: require the match to end at end-of-string or at `/`, `?`, `&`, `#`.
- **Bug 6 (L, privacy) Public `data.json` and `index.html` carry the runner's absolute paths.**
  File: `dashboard.py:2152` `"workspace": str(ws.home)` and the `jobs` rows (`input`, `last_error`: absolute footage paths and exception text).
  On the cloud that is `/home/runner/work/...`; on a PC publish it would be `C:\Users\<owner>\...`. Test:
  `test_security.DashboardLeaks.test_no_absolute_paths_or_usernames_in_the_public_data`.
  Fix: drop `workspace` from the published copy (site_files needs it only to find thumbs: pass `ws`), show `Path(input).name` and a
  path-stripped error.
- **Bug 7 (M-L) One unreadable settings value stops every run.**
  File: `pipeline.py:113` `WS.setting()` does `json.loads(row)` unguarded; `cloud_runner.refresh_live`, `compute_supply` and others call it for
  `campaign_live.*`, `supply.*`, `leads.*`. A half-written or hand-edited row raises out of the step; the next run, and every run after, hits it
  again until someone repairs `jobs.db` by hand. Test: `test_resilience.BrokenState.test_corrupted_settings_values_do_not_stop_the_run`.
  Fix: `try: return json.loads(...) except ValueError: return default`.
- **Bug 8 (L) `link_footage()` has no per-campaign guard and trusts the brief's folder.**
  File: `cloud_runner.py:184-199`. (a) `"sources": null` raises `TypeError` and ends the run (`test_resilience...test_sources_is_null`);
  (b) `OSError` from the hard link or the fallback copy (disk full) ends the run before queued clips are posted
  (`...test_disk_full_while_linking_footage`); (c) `cf.parent / src` with `../..` creates and fills a folder outside the campaigns directory
  (`test_security...test_link_footage_does_not_create_folders_outside_the_campaign_dir`). Briefs written by `onboard.py` are always
  `footage/<slug>`, so (c) needs a hand-edited brief.
  Fix: wrap each campaign in `try/except Exception`, each file in `try/except OSError`, and reject a resolved path that is not inside
  `cf.parent`.
- **Bug 9 (L) `<!--` inside any data string blanks the local `dashboard.html`.**
  File: `dashboard.py:2331` `render_html()` escapes only `</`. The text `<!--<script>` (a note, a caption, a transcript line) puts the HTML parser
  into its "double escaped" script state, the page's own `</script>` is swallowed and the page renders empty. Test:
  `test_security.XssInBrowser.test_html_comment_open_in_data_does_not_break_the_local_page`.
  Fix: also replace `<!--` with `<\!--` and U+2028/U+2029 in the embedded JSON.
- **Bug 10 (L, security) The video is PUT to whatever `uploadUrl` the presign answer names.**
  File: `zernio.py:284` and `:319`. A spoofed or compromised API response could make the job upload footage to any host (including
  `http://169.254.169.254/...`). The API key is not sent there (tested). Test: `test_security.PathsAndFiles.test_zernio_upload_url_must_be...`.
  Fix: require `https` and a host under `zernio.com` plus the storage domain Zernio documents.
- **Bug 11 (L-M) The brand-name rule is a substring test, so one brand word can steal another brand's pages.**
  File: `pipeline.campaign_accounts` (and the same rule in `lifecycle`): `match in name.lower().replace(" ", "")`. `trade` matches
  `tradever.clips`; `brand1` matches `brand10.clips` (seen live in the 12-campaign test: "Brand 1" took `brand10` and `brand11`, leaving
  those two campaigns with no page). Real pairs are easy to hit (`alpha` / `alphafutures`, `trade` / `tradever`).
  Test: `test_resilience.Scale.test_a_brand_word_that_is_part_of_another_brand_does_not_steal_its_page`.
  Fix: give a page to the campaign with the LONGEST matching word, or match on word boundaries, and warn at onboarding when two brand words
  overlap.

Smaller notes (no failing test): `contentrewards._get` and `onboard._get` follow redirects to any host and `onboard` fetches whatever link the
owner hands it (owner-supplied, read-only, fine); `onboard.docx_text` reads a docx fully into memory (a zip bomb could use RAM; the download is
capped at 25 MB but not the expanded size); `vocab.py:73` has an annotation naming `Word` that is not imported (harmless with
`from __future__ import annotations`, pyflakes reports it); `dashboard.py` `_safe(...)` hides a failing section as an empty one with no log line.

## Security audit

Scope: secrets, public surfaces, injection, files, network, CI, supply chain. Method: read the code paths, then encode each finding as a test.

**Secrets (clean, with one gap).** `ZERNIO_API_KEY` is read from the environment only (`zernio.api_key`) and sent only in the `Authorization`
header to `https://zernio.com/api/v1/...`; the presigned storage PUT carries no auth header. A full fake cycle with sentinel values for the
key, the ntfy topic and the GitHub token, then a byte search of the whole state branch (including the SQLite file), the VM disk and stdout, finds
none. The topic is only in the `https://ntfy.sh/<topic>` URL; notification click links do not contain it. Gap: Bug 1 (error text).
Public by design: the Actions run logs and step summary of this public repository (they print the report, captions, page names and links; never
keys, because GitHub also masks secret values).

**Public surfaces.** The `clipper-cloud` branch and the githack page are public. They contain clip titles, captions, links, page names, rankings and
estimated earnings (Bug 2) and runner paths (Bug 6). No tokens, topic or media.

**HTML / script injection.** Hostile strings in 23 fields rendered in Chromium on all ten pages, hosted (`data.json`) and local (embedded):
nothing executed; the payloads are shown as text. Open: dangerous URL schemes (Bug 4) and `<!--` in embedded data (Bug 9). Fields that the
current page does not yet display (lifecycle reasons, switch log, account state, bench) are poisoned in the test too; as the dashboard starts to
show them, `test_the_hostile_text_really_reached_the_screen_escaped` lists how many were visible, and any that run fail the build.

**Prompt injection.** No brief, transcript or page text is ever executed, imported by name or passed to a shell (static scan plus a run with
hostile transcript lines and a hostile campaign name: no new host contacted, settings unchanged, AI spend stays 0). The only model call in the
code, `clipper.ai_rerank`, is off without a budget and an API key (cloud has neither); if it is switched on, a hostile transcript could steer the
title / caption it returns (clipped to 80 / 300 characters and still run through the rule checks and `gate.py`).

**Subprocess, ffmpeg, files.** Every `subprocess` call gets an argument list (AST-checked); no `shell=True`, `os.system`, `eval`, `exec`,
`pickle`. Nine hostile file names (`'`, `;`, `$(...)`, backticks, `&&`, `|`, leading `-`, RTL override, filter metacharacters, emoji) go through
link, probe, clip, render and thumbnails; nothing is created outside the workspace. Drive names are reduced to `Path(...).name` and written under
the campaign folder. `onboard.docx_text` reads `word/document.xml` in memory (no `extractall`; a zip-slip archive writes nothing). Slugs
cannot contain `.`, `/`, `\`. Open: Bug 5 (prefix match), Bug 8 (`sources` path), logo paths are joined unchecked (`../../etc/passwd` passes
the exists-check; the file is only decoded as an image and overlaid, never echoed; low).

**Network.** Hosts contacted by the code (frozen in `test_every_url_host_in_the_code_is_known`): zernio.com, contentrewards.com, docs.google.com /
drive.google.com (via gdown), ntfy.sh, youtube.com, youtu.be, twitch.tv, kick.com, tiktok.com (public pages), api.github.com / github.com
(publish, PC), open.tiktokapis.com, api.upload-post.com, googleapis.com. The dashboard page loads Google Fonts (a third-party request from the
viewer's browser: it tells Google the viewer opened the page; self-host the fonts if that matters). In the end-to-end run no other host was
contacted. Open: Bug 10.

### GitHub Actions hardening: `clipper-cloud.yml` (read only; do not edit while the chain is live)

Good: `permissions` is explicit (`contents: write`, `actions: write`, nothing else), no `pull_request` / `pull_request_target` trigger (a fork
can never get the key), secrets are never echoed, one chain via `concurrency`, `timeout-minutes` set, the next run starts under `if: always()`.

- **W1 (L-M) Expressions interpolated into shell scripts.** `m="${{ inputs.wait_minutes }}"` (line 39) and `--ref "${{ github.ref_name }}"`
  (line 88) are expanded into the script text before bash runs it. Anyone who can dispatch the workflow (write access) or create a branch named
  with shell metacharacters can run commands in a job that holds the key and a write token. Fix when the chain can be restarted: pass them
  through `env:` (`WAIT: ${{ inputs.wait_minutes }}`, then `"$WAIT"`), and validate `case "$WAIT" in ''|*[!0-9]*) exit 1;; esac`.
- **W2** none: `pull_request_target` is not used (kept so the numbering matches the test).
- **W3 (M) Actions are pinned by tag, not commit SHA** (`actions/checkout@v4`, `actions/setup-python@v5`). A moved tag would run attacker code with the
  key and the write token. Pin to full SHAs and let Dependabot update them.
- **W4 (M) The secrets are job-level `env`.** `ZERNIO_API_KEY`, `NTFY_TOPIC` and `GH_TOKEN` are visible to every step, including
  `apt-get install` and `pip install -r requirements.txt gdown` (a source distribution runs `setup.py` there). Move them to the `env:` of the
  "Autopilot cycle" step (and the ntfy step) only.
- **W5 (M) `actions/checkout` persists the write token** in `.git/config` for later steps and `git config --global url...insteadOf` writes it to
  `~/.gitconfig` too, readable by every process in the job (pip packages, yt-dlp, gdown). With `contents: write` that token can push to any
  branch, including `main` (the NQ project's). Use `persist-credentials: false`, protect `main` with a branch rule, and scope the token to the
  one step that pushes (the runner already pushes by itself).
- Info: the wait step sleeps on a runner for up to 230 minutes (free on a public repo). Run logs of a public repo are public.

## Supply chain

`requirements.txt` (cloud installs it, plus `gdown`): ten of twelve dependencies are pinned to the versions the tests ran with (tzdata and imageio-ffmpeg still float).

| Package | Pin | Note |
|---|---|---|
| yt-dlp | `>=2026.1.1` | fast-moving; runs arbitrary extractors on URLs from briefs |
| faster-whisper | `>=1.1` | downloads model weights from Hugging Face at run time, unpinned revision |
| opencv-python-headless | `>=4.8,<5` | |
| numpy, Pillow, tzdata, imageio-ffmpeg, certifi | none | |
| anthropic, keyring, google-api-python-client, google-auth-oauthlib | none | not needed by the cloud autopilot: pure attack surface there |
| gdown | none (workflow and a runtime `pip install` in `cloud_runner._gdown`) | scrapes Google Drive |

Risk: a malicious or broken release of any of these runs inside a job that holds the Zernio key and a write token (W4, W5). Also
`clipper.pip_install` installs packages at run time (opencv upgrade, yt-dlp) with `--user` and `--break-system-packages` fallbacks, and the apt
`ffmpeg` comes from the Ubuntu repository (signed). Suggestions: a `requirements-cloud.txt` with only what the cloud needs, exact versions with
hashes (`pip-compile --generate-hashes`, `pip install --require-hashes`), a scheduled Dependabot PR, no run-time `pip install` in the cloud
(`--no-install`), and pre-downloading the Whisper model into the pip cache key.

## Code quality (suggestions only; none of these files were edited)

- `python -m compileall` passes on every file. `pyflakes`: unused imports `audiofx.py:10 math`, `broll.py:19 shutil`, `clipper.py:28 math`,
  `clipper.py:631 BAD_START`, `clipper.py:711 DANGLE_END`, `pipeline.py:34 time`, `scoring.py:23-24 INCOME_CLAIM, TOPICS`, `youtube.py:46-51` (six; these
  are availability probes inside `try`, fine); unused variables `broll.py:82 cw`, `onboard.py:107 err`, `slideshow.py:445 tail_punct`;
  f-strings without placeholders `pipeline.py:997`, `pipeline.py:2877`; `vocab.py:73 undefined name 'Word'` (annotation only).
- No developer `TODO` / `FIXME` markers; the `TODO` strings in `campaign.py` / `pipeline.py` are the deliberate "fill this in" gate of the brief template.
- Functions over 150 lines: `dashboard.build_data` (354, split by section: stats, accounts, campaigns, earnings, analytics), `demo.build` (348, test
  data), `cloud_runner.main` (221, the `step()` wrapper is good; extract "brain", "post", "alerts", "publish" into functions that take a context),
  `pipeline._upload_step` (190, extract per-account room calculation and the post attempt), `lifecycle.run` (179), `preflight.run` (167).
- Broad `except Exception`: 18 in `cloud_runner.py` (8 silent), 50 in `pipeline.py` (14 silent), 25 in `dashboard.py` (16 silent), 21 in `clipper.py`
  (10 silent). Most are deliberate ("a failed check never stops posting"). The ones that hide the most: `dashboard._safe()` (an empty section with no
  log line), `cloud_runner.compute_supply` (`except Exception: pass` around the deck count), `pipeline.refresh_platform_stats` (`except Exception:
  got = None` hides lookup failures), `pipeline.py:2103` (`public_stats` failure). Suggest `log.warning` with the exception type in each, and one
  counter per run ("N soft failures") shown in Jobs & health.
- Paths that could print a secret: `cloud_runner.sh()` logs 400 characters of any command's stderr (git output could contain a URL with the
  token if a future change puts it in the URL; today it uses `insteadOf` and GitHub masks it); `log(f"notification failed: {e}")` and
  `ws.event(f"dashboard not updated: {e}")` print raw exception text; `zernio._explain` copies server text (Bug 1). A single `redact_known()`
  used by `log()` and `WS.event()` would close all of them.
- Naming / dead code: `pipeline.py:1823` `gap_ok` is assigned and never used; `cloud_runner.py:572` `day` unused; `cloud_runner.py:831` `trim`
  unused; `uploadpost`, `tiktok`, `youtube` modules are unused by the cloud route (kept for the PC).
- Time handling: `pipeline.now()` and `uploads_today()` use naive local time (UTC on the runner, local on a PC), so a database moved between a PC and the
  cloud mixes zones; `dt.datetime.now()` appears in 40+ places. Suggest one `utcnow()` helper (the new `_clock()` in `cloud_runner` is the start).

## Top 5 risks for the first live week

1. **Views and earnings may show nothing.** Views come from Zernio analytics (plan dependent; we could not confirm the free plan includes it) with a
   TikTok page scrape as the fallback, which GitHub's datacenter IPs usually cannot do. If both fail every post shows 0 views and $0, the
   "estimate" is meaningless and the engagement checks never fire. Check on day 1 that a post's views move; if not, ask Zernio about analytics.
2. **A rule or platform ban.** Tradever requires, among other things, no same clip twice or across accounts, 2%+ engagement, a Tier 1 audience,
   likes visible, the logo throughout. Two pages run by one person can be treated as related accounts; TikTok may restrict API-posted content;
   Content Rewards runs a bot score we cannot see. The robot posts without a human looking at a clip (held clips are never reviewed in the cloud).
   Watch the first 5 days of warm-up posts by hand.
3. **The run chain dies silently.** Each run starts the next; a run that GitHub cancels, loses or skips (runner lost, a manual cancel, a workflow
   edit mid-wait) ends the chain and nothing reports it, because "a run that never happens cannot report itself". The only detector is the
   dashboard turning red when someone opens it. Consider an independent watchdog (a free uptime service pinging `data.json` freshness, or a phone
   shortcut that opens the page each morning).
4. **Public exposure.** The dashboard, the state branch and the Actions logs are public and show account names, captions, links and estimated
   earnings (Bug 2, Bug 6). Anything printed once cannot be taken back. Decide on `hide_money` before the first payout, and rotate any secret that
   ever appears in a log.
5. **One campaign, no safety net, no human check.** Only Tradever is allowed and active. If its budget runs dry, it ends,
   or its rules change, income is zero until the owner joins and onboards another campaign (the bench is empty). A posted clip with a wrong word or an
   income claim cannot be pulled back by the robot. Join and onboard a second campaign early and spot-check the first 10 posts.
