# Money Clipper

A local tool for clipping money-niche streams and podcasts for **paid clipping
campaigns**, such as Whop Content Rewards. It imports only content a campaign
permits, finds promising moments, renders 9:16 clips with word-accurate
captions, and queues them for **your review**. Nothing is published, and no
money is spent, without your explicit approval.

- [PROGRAMS.md](PROGRAMS.md) covers which programs are real and active, their
  eligibility rules, payout terms, content licenses and sources, and the
  recommended starting point: **Whop Content Rewards + YouTube Shorts**.
- [campaigns/README.md](campaigns/README.md) explains how to record a campaign
  brief.

## Quick start

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

The 25 tests cover:
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
- **No automatic publishing or submission**, by design and because of the
  platform API audits described in PROGRAMS.md. Posting and submitting on
  Whop are manual.
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
| `campaigns/_template.json` | Campaign brief template |
| `tests/test_pipeline.py` | Test suite |
