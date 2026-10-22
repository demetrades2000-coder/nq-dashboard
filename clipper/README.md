# Money Clipper

A local tool for clipping money-niche streams and podcasts for **paid clipping
campaigns**, such as Whop Content Rewards. It imports only content a campaign
permits, finds promising moments, renders 9:16 clips with word-accurate
captions and, on **autopilot**, approves and uploads them to YouTube Shorts on
a schedule.

Autopilot is opt-in. Until you enable it, clips wait for your review. Claude
API spending stays off until you approve a monthly budget.

- [PROGRAMS.md](PROGRAMS.md) covers which programs are real and active, their
  eligibility rules, payout terms, content licenses and sources, and the
  recommended starting point: **Whop Content Rewards + YouTube Shorts**.
- [campaigns/README.md](campaigns/README.md) explains how to record a campaign
  brief.

## Autopilot (hands-off)

One-time setup, about 15 minutes:

```bash
pip install -r requirements.txt                          # plus ffmpeg (winget / brew / apt install ffmpeg)
cp campaigns/_template.json campaigns/acme.json          # fill it in from the campaign you joined
python pipeline.py youtube auth --client-secret client_secret.json   # one browser consent (see youtube.py header)
python pipeline.py tiktok auth --client-key YOUR_KEY     # one TikTok login (see tiktok.py header); optional
python pipeline.py autopilot add campaigns/acme.json
python pipeline.py autopilot enable --platforms youtube,tiktok --max-per-day 3   # cap is per platform
python pipeline.py budget --monthly 5                    # optional: Claude ranking, capped
python pipeline.py schedule install --every-hours 6      # Task Scheduler on Windows, launchd on macOS, cron on Linux
```

Every cycle (every 6 hours by default) does the following:
1. Re-checks each campaign's permission and skips any that are stale.
2. Imports the newest permitted videos.
3. Clips, captions and renders them.
4. **Auto-approves** clips that pass every campaign rule and every review
   check. Anything with a warning is held for you.
5. **Uploads** approved clips to every platform the campaign pays on (a
   campaign listing only Instagram and YouTube never gets TikTok uploads),
   under a daily cap per platform:
   - **YouTube Shorts:** published directly. The disclosure leads the title
     and description, and the paid-promotion flag is set.
   - **TikTok:** sent as a draft to your TikTok inbox. TikTok lets
     unaudited apps post only privately, so you finish the post in the app:
     tap the notification, paste the caption from the report, turn on
     "Paid partnership" if needed, and tap Post. The next cycle finds the
     live post by its caption and records its link and views. If TikTok
     ever audits your app, `tiktok auth --mode direct` posts straight to
     your profile.
6. Refreshes view counts from the YouTube and TikTok APIs.
7. Writes `AUTOPILOT_REPORT.md`. It lists the TikTok drafts to finish, with
   their captions, and the live links to submit on each campaign.

Clips are **held for you** when:
- a campaign rule fails
- the score is below the autopilot minimum
- the recognizer was unsure of words
- the clip may depend on earlier context or ends mid-sentence
- the transcript came from auto-captions
- (optionally) the clip contains an earnings claim

**Free, fully automatic posting:** `autopilot enable --via free` posts publicly
to TikTok and Instagram through Zernio's free plan (2 connected accounts,
API included), and to YouTube Shorts through Google's free YouTube API. See
`zernio.py`. TikTok posts need your one-time consent (`zernio auth`).

**Paid alternative:** `autopilot enable --via uploadpost` posts
publicly to TikTok, Instagram Reels and YouTube Shorts through Upload-Post
(upload-post.com), a hosted posting API with its own platform approvals.
Without it, TikTok gets inbox drafts you post from the app (see below). See
`uploadpost.py` for setup. It needs an Upload-Post plan that includes TikTok.

**The step that stays manual: submitting on Whop.** Whop publishes no API for
Content Rewards submissions, and its only submission API (bounties, beta)
rejects account API keys. A bot driving the submit form would run into Whop's
bot screening and could cost you the account.

The report lists each new Short next to its campaign page. Paste the links,
then run `python pipeline.py submitted all`. It takes about 10 seconds per
clip. Everything else runs on its own.

`autopilot disable` turns it off immediately. `youtube disconnect` removes
the upload token.

## Manual mode

```bash
pip install -r requirements.txt            # plus ffmpeg: winget / brew / apt install ffmpeg

# 1. Record the campaign you joined (copy the template, fill it from the campaign page)
cp campaigns/_template.json campaigns/acme.json
python pipeline.py campaign-check campaigns/acme.json

# 2. Import permitted sources and process them
python pipeline.py import campaigns/acme.json           # uses the campaign's "sources" (newest videos)
python pipeline.py run
python pipeline.py status

# 3. Review: approve, reject or fix captions on a local page
python pipeline.py review                                # http://127.0.0.1:8765

# 4. You post the approved file (ready/<campaign>/) and submit the URL on Whop, then:
python pipeline.py posted 12 https://youtube.com/shorts/abc123
python pipeline.py earnings refresh && python pipeline.py earnings report
```

## What happens at each step

| Step | What the tool does | What you do |
|---|---|---|
| Campaign brief | Refuses a brief without a `permission` block (program, campaign URL, evidence, allowed sources, `verified_on`), or one more than 30 days old. | Join a campaign, copy its rules into the brief. |
| Import | Expands channel URLs to the newest videos and checks each against `allowed_sources`, before download and again by the video's channel after download. Skips duplicate sources (same video ID or file fingerprint). | — |
| Transcribe | Uses the campaign's own transcript if you give one, then uploaded subtitles, then local Whisper with word timestamps and per-word confidence, then auto-captions. It runs locally and costs nothing. | — |
| Select | Scores sentence-bounded windows (hook, topic density, specifics, payoff, audio energy, pace, length). Drops windows with banned claims and moments that duplicate earlier clips (same source with overlapping time, or more than 50% shared 5-word phrases with any clip in the campaign). Extends a clip by a sentence when it starts on a dangling "that/so/he…" or ends mid-sentence. Optional Claude ranking, only within your approved budget. | — |
| Render | Builds a vertical clip: face crop or blurred-background layout, pauses cut, word-by-word captions, on-screen disclosure and creator tag if the campaign asks, audio at -14 LUFS. Retries with simpler settings if a render fails. | — |
| Review queue | Shows each clip with the surrounding transcript, words the recognizer was unsure of highlighted, campaign rule checks, flags for earnings claims and missing context, and a caption for each platform. | Watch it. Approve, reject, or fix caption words, which re-renders the clip. |
| Approve | Refuses if a campaign rule fails, unless you override with a written note. Copies the MP4 and caption files to `ready/`. | — |
| Post and submit | Nothing. Publishing is manual on purpose. | Upload to YouTube Shorts, submit the URL on the campaign page, run `posted`. |
| Track | Records the post, refreshes public view counts, estimates payout from the campaign's CPM, fee and cap. | Check Whop's own dashboard for the numbers that count. |

## Safety rails

- **Permission gate:** sources outside `allowed_sources` are marked
  `blocked`, with the reason. Local files are allowed only from a
  `file:<folder>` the campaign gave you.
- **Duplicates:** checked at three levels: the source (video ID or file
  fingerprint), the moment within a source (time overlap), and the speech
  across the whole campaign (catches re-uploads). Each post URL can be
  recorded only once.
- **Job status and retries:** each job moves through `queued → fetching →
  transcribing → selecting → rendering → done`, or ends as `failed`,
  `blocked` or `retry_wait`. Network errors and rate limits retry
  automatically up to 4 attempts (waits of 5, 30 and 120 minutes; run
  `pipeline.py run` again to pick them up). Permanent problems (private,
  members-only, login or bot check, corrupt file, full disk) fail at once
  with a plain-language fix. `pipeline.py retry <id>` re-queues a job. Only
  one `run` can happen at a time.
- **Spending:** Claude ranking is the only thing that can cost money, and it
  is **off** until you run `pipeline.py budget --monthly 5`.
  - Every call is priced worst-case before it's sent (known model prices
    only), checked against a per-call cap ($0.25 default) and the monthly
    cap, then logged with its actual token cost.
  - At the default `claude-opus-5-5` model, low effort and 12-18
    candidates, one call costs at most about $0.12.
  - `budget --off` turns it off again.
  - Server-side refusal fallback is deliberately not enabled, because it
    could bill at a different model's rate and break the cap. A refused call
    falls back to the free heuristic ranking.
- **Credentials:**
  - The Anthropic key comes from the environment or the OS keychain
    (`pipeline.py secrets set anthropic`). It is never written to the
    workspace, the database or the logs, and messages are redacted.
  - The YouTube OAuth token is kept only in the OS keychain.
- **Autopilot limits:**
  - Opt-in, with a daily upload cap (default 3, maximum 50).
  - It only uploads clips with zero failing rules and no hold-worthy
    warnings, and only to campaigns whose `platforms` include YouTube.
  - A cycle never overlaps another (run lock).
  - Quota or upload-limit errors stop uploads until the next cycle.
  - After each upload it reads back the privacy YouTube actually applied and
    reports a forced-private lock.
  - For sites that need login, use `--cookies-from-browser`. Cookies are read
    in place and never copied.
  - The review page listens on 127.0.0.1 only. It checks the Host header and
    needs a per-session form token for every action.
- **Honest copy:**
  - On-screen titles quote the speaker when they contain an earnings claim.
  - Clips with income or results claims are flagged so you don't caption
    them as typical.
  - Payout figures are labelled as illustrations.

## Tests

```bash
python -m unittest discover -s tests -v     # ~2 min; offline; synthetic video + transcript
python clipper.py --selftest                # renderer check across all layouts (~5 min)
```

The 101 tests cover:
- **Zernio (free route) against a simulated API:** presign, PUT without
  auth, and publishNow with public TikTok settings, consent flags and the
  paid-partnership flag; TikTok refused without consent; Instagram link
  picked up later; platform failure; retry; account matching; bad key; a
  full free cycle that posts to Instagram and TikTok with no taps.
- **Upload-Post against a simulated API:** the exact fields sent (direct
  public post, paid-partnership flag, Reels, YouTube limits), retries on
  429/503, bad key, plan limit, platform rejection, private-post detection,
  and a full cycle that posts to TikTok and Instagram with no taps, picks up
  links and views, and routes to the campaign's profile.
- **Campaign-file features:** TODO gate, missing logo blocks a campaign,
  campaign-relative footage folders, a logo actually rendered (pixel-checked)
  and rule-checked, per-campaign account routing, the engagement-floor
  warning, notifications that never crash a cycle, doctor, and setup when
  nothing is ready.
- **TikTok against a simulated API:** chunk rules and Content-Range
  headers, inbox and direct flows, private-only for unaudited apps,
  explained error codes, token refresh with rotated tokens, PKCE, matching
  finished drafts to live posts.
- **Multi-platform cycles:** never uploads to a platform the campaign
  doesn't pay on, picks up the link after a draft is posted, no
  re-uploads.
- **Shipped campaign briefs:** refused until verified; view minimum and
  payout cap math; the no-AI campaign switches Claude off.
- **Autopilot:** off by default; a full cycle with a simulated uploader
  (auto-approve, daily cap, paid-promotion flag, report, view refresh,
  `submitted all`); the hold policy; stale campaigns skipped; the schedule
  line.
- **The YouTube upload code against a simulated API:** retry on 503 and
  connection resets, private-lock detection, paid-flag fallback, quota
  error, giving up after retries, missing token.
- **The main workflow:** import, run, 1080x1920 clips in the review queue,
  captions that match the transcript, banned claims never selected,
  disclosure in every caption, and income claims flagged.
- **The permission gate:** no permission block, stale permission, source
  outside the allowed list, URL and channel matching.
- **Duplicates:** the same file imported twice, and a re-encoded re-upload
  that must produce no repeated speech.
- **Review:** approval required before posting, failing rules blocking
  approval, caption fix and re-render, and the review page's token, host and
  range handling.
- **Failure handling:** a corrupt file failing with a clear message, retry,
  error classification, temporary failures scheduling a retry, and the
  concurrent-run lock.
- **Spending and secrets:** no spending without a budget, budget caps, cost
  math, unknown models refused, secrets redacted, and no secrets in the
  workspace.

## Limitations and unfinished work

- **Not tested against live sites here.** The build environment blocks
  YouTube, TikTok, Instagram and the Whisper model download. Downloading,
  live view refresh and Whisper transcription have not run end to end.
  Synthetic video and transcripts exercised everything else. Your first real
  run is the real test: start with one video and `--limit 1`.
- **Face-tracked crop isn't verified on real faces.** The test video has no
  faces, so it always used the blurred-background layout.
- **Not tested against live YouTube.** The YouTube upload uses the official
  Data API and is tested only against a simulated API; this environment
  can't reach Google.
  - Google's docs conflict on whether uploads from unverified projects are
    locked private. The code reads back the real privacy and tells you.
  - With the OAuth app in "Testing" status, Google expires the token after 7
    days. Set the app to "In production" (you'll see an "unverified app"
    screen; that's fine for your own channel).
- **Submitting on Whop is manual**, because there's no API for it (see
  Autopilot above).
- **TikTok needs one tap per clip.** Its API posts only privately until
  TikTok audits your app, so clips arrive as inbox drafts you post from the
  app (about 20 seconds each). TikTok also limits pending drafts (about 5 a
  day).
  - The TikTok code follows TikTok's API docs but is tested only against a
    simulated API.
  - TikTok's docs disagree on the PKCE encoding. If login fails, try
    `tiktok auth --pkce b64`.
- **Instagram isn't automated yet.** Higgsfield/20VC pays on Instagram and
  YouTube only. For now its clips go to YouTube automatically; Instagram is
  a manual upload from the ready folder.
- **The scheduler needs a logged-in machine that's switched on.** On headless
  Linux servers, the OS keychain may not be reachable from cron; use macOS or
  Windows, or a desktop session.
- **Auto-approval relies on automated checks.** A confident transcription
  mistake, or a clip that's off-brand for the creator, can get through. Read
  `AUTOPILOT_REPORT.md` and spot-check uploads; `autopilot disable` stops it
  immediately.
- **Program facts were checked on 2026-10-21 from search excerpts** of the
  official pages; direct fetches were blocked. Re-check the live terms and
  each campaign's rules before you start.
- **Rights in the source are on you.** Clipping permission covers the
  creator's content. Third-party music or clips inside a stream may still
  trigger Content ID, and you warrant clearance under Whop's terms. The tool
  doesn't detect music.
- **Captions can be wrong.** Whisper can mishear names and numbers. Words it
  was unsure of are highlighted for review, but a confident mistake won't be
  flagged, so watch every clip before approving.
- **Scoring is a heuristic.** It finds well-formed, on-topic moments; it
  can't predict views.
- **No FTC advice.** The disclosure fields and checks help you apply the
  campaign's wording; they don't decide what the law requires.
- **One machine, one user.** SQLite workspace, local review page, no
  accounts or remote access.
- **Earnings estimates use public view counts**, which differ from the views
  a program verifies and pays for.

## Files

| File | Purpose |
|---|---|
| `pipeline.py` | Job queue, permission gate, duplicates, retries, review page, approvals, spending, secrets |
| `clipper.py` | Engine: download, transcribe, score, render (also usable on its own; AI off unless `--ai-max-usd` is set) |
| `campaign.py` | Campaign briefs: permission checks, caption builder, rule checks, payout math |
| `tracker.py` | Post and earnings tracker |
| `youtube.py` | YouTube Data API: OAuth (keychain), resumable upload with retries, view stats |
| `START_HERE.md`, `START.bat`, `START.command` | The simple steps, plus double-click launchers that install everything and run the guided setup |
| `campaigns/alpha-futures.json` | The TikTok pick: $2 per 1K views, logo overlay, dedicated account, engagement floor |
| `dashboard.py`, `DASHBOARD.bat`, `DASHBOARD.command` | Clip Engine dashboard, in the NQ dashboard's design system. Rebuilt every cycle; `python pipeline.py dashboard` opens it. |
| `zernio.py` | Free automatic public posting to TikTok and Instagram through Zernio's free plan (presigned upload, publishNow, link lookup) |
| `uploadpost.py` | Fully automatic public posting to TikTok, Instagram and YouTube through Upload-Post's API (key in the keychain) |
| `tiktok.py` | TikTok Content Posting API: desktop OAuth with PKCE (keychain), chunked inbox/direct upload, status polling, video list for links and views |
| `campaigns/higgsfield-20vc.json`, `moonpay-ivan-soto.json`, `pbinvesting.json` | Pre-filled briefs for the campaigns you found. Each has TODOs and won't run until you verify it. |
| `campaigns/_template.json` | Campaign brief template |
| `tests/test_pipeline.py` | Test suite |
