# Autopilot brain

What the cloud autopilot (`python clipper/cloud_runner.py`, every ~4 h) does by itself, so the owner only pastes links on
campaign pages and does the one-time joins and sign-ups. Data written for the dashboard is in
`docs/AUTOPILOT_CONTRACT.md`; the keys this work adds are listed at the end.

Format of the list: **what** - `where` - `test`. Tests are in `clipper/tests/`: `test_lifecycle.py` (L),
`test_preflight.py` (P), `test_performance.py` (F), `test_agency.py` (A). Whole-run tests (`WholeRunTests`) use the fake
world in `fakeworld.py` (fake Content Rewards + Zernio + ntfy + a bare git repo as the state branch).

## 1. Campaign lifecycle and automatic switching (the main ask)

1. **Five states per campaign** (active / standby / paused / ended / blocked), recomputed every run from the live page.
   - `lifecycle.assess`, `lifecycle.run` - `L LifecycleTests`
2. **Priority score** = live TikTok CPM x min(budget left, $2,000)/$2,000 x supply factor x own-performance factor x
   competition factor (x a runway factor when the budget is falling fast). The performance factor needs 5 settled own posts
   (average views vs the views the campaign's minimum payout needs), otherwise it is neutral - nothing is invented.
   - `lifecycle.priority` - `L PriorityTests`
3. **Automatic switching in the same run**: when the active campaign pauses or ends, the best standby is promoted at once and
   a freed generic page moves to it. Everything lands in `switch.log` (paused / resumed / promoted / demoted / ended /
   account_moved / account_idle).
   - `lifecycle.allocate`, `lifecycle.run` - `L test_dry_campaign_promotes_the_best_standby...`, `L WholeRunTests.test_dry_campaign_switches...`
4. **One campaign per TikTok page.** Brand pages (`account_match: "tradever"`, or pages listed in the brief) only ever serve
   their brand and are never lent out; campaigns with `account_match: ""` / `"*"` take any free page, one page each (the
   related-accounts fraud check).
   - `lifecycle.allocate`, `lifecycle.brand_word/is_generic/account_matches` - `L test_brand_page_stays_with_its_brand...`
5. **No flip-flopping**: a campaign that holds a page keeps it unless a challenger is worth 2x as much (then `demoted`).
   - `DEMOTE_RATIO` - `L test_no_flip_flop...`
6. **Optional cap on how many campaigns run at once** (setting `lifecycle.max_active`, default unlimited: every free page works).
   With 1, the second-best waits as standby and is promoted the moment the first stops.
   - `lifecycle.allocate` - `L test_max_active_one...`
7. **Phone alert per switch, once a day per switch** ("Tradever paused ... Switched to Acme ($4/1K, $1,500 left). Page
   hub.one moved from ..."). The first-ever look at a campaign that was already running is not an alert.
   - `lifecycle.build_alerts`, `alerts.run` - `L test_switch_alert_is_sent_once_a_day...`
8. **Brand page idle alert**: when a brand page has nothing to post because its campaign stopped, the owner is told once
   ("tradever.clips has nothing to post ... stays with its brand").
   - `lifecycle.build_alerts` (account_idle) - `L test_brand_page_stays_with_its_brand...`
9. **Refill resumes by itself** (`resumed`), alert "X is back".
   - `L test_refilled_campaign_resumes_by_itself`
10. **Ended for good + archived**: closed for more than 7 days, or the page answers 404 on two checks in a row. The state and log
    stay; the brief is listed in `archived_campaigns.json` (state branch) and leaves the active set. Re-onboarding the same
    campaign brings it back.
    - `lifecycle.assess`, `cloud_runner.all_briefs/_archived`, `main` - `L test_closed_for_a_week...`, `L test_campaign_page_404_twice...`
11. **404 safety**: only an HTTP 404/410 counts as "gone" (a 500, a timeout or a changed page layout keeps the last status),
    and if every campaign 404s at once it is treated as the site's problem.
    - `cloud_runner.refresh_live` - `A RefreshLiveTests`, `L test_every_campaign_404_at_once...`
12. **Blocked** when the brief does not say tools are allowed (banned, or not confirmed); never posts. A newly added blocked
    campaign asks the owner for a decision once.
    - `lifecycle.assess`, `lifecycle.run` - `L test_blocked_when_rules...`, `L test_a_newly_added_blocked_campaign...`
13. **New campaigns start at once**: `--onboard` builds the brief, and the same run's lifecycle makes it active/standby
    (blocked with the reason when the rules are unclear). `account_match` is now `""` when the rules need no dedicated page.
    - `cloud_runner.main`, `onboard.build/parse_brief` - `L WholeRunTests.test_a_campaign_added...`, `A OnboardAccountMatchTests`
14. **Runway forecast**: budget history per campaign -> days until it is gone at the current speed; a campaign that will be dry
    within 3 days loses priority before it actually stops.
    - `lifecycle.runway` - `L test_runway_is_estimated...`
15. **Pace and earnings estimate**: `est_earned` (own posts valued at the campaign's rate) and a weekly-minimum check
    (`posts_per_week` in the brief) that shows up in the 8 PM digest when we are under it.
    - `lifecycle.run`, `alerts.digest` - `L test_pace_estimate...`

## 2. Bench and leads

16. **Bench**: healthy = active + standby with budget; `need_more` below 2; `join_next` = best 5 filtered leads.
    - `lifecycle.compute_bench` - `L BenchTests`
17. **Once-a-day "join another campaign" alert** with the best 3 leads and the exact next step ("join it, open its Rules tab,
    send the rules text and links to Claude"); only sent when there is at least one real lead to name.
    - `lifecycle.bench_alert` - `L test_need_more_lists_only_good_leads...`
18. **Lead filter**: English, pays on TikTok, clipping/slideshow type, no application, not adult/gambling, budget left, our own
    scoring, and the skip-list `clipper/data/ban_list.json` (Reach, TJR, Alpha Futures, Alpha Capital, Clipping.net; whole-word
    match, edit the file to add more).
    - `contentrewards.lead_ok/banned_org/load_ban_list` - `A LeadFilterTests`, `L test_ban_list_file...`
19. **Whole-catalogue scan** with pagination (`/c/discover`, `/c/discover/clipping?page=N`, `/c/discover/ugc?page=N`), at most
    every 12 h, remembering useless campaign ids for 3 days so they are not fetched again.
    - `contentrewards.catalogue_ids/discover`, `cloud_runner.discover_leads` - `A CatalogueTests`, `A DiscoverLeadsTests`

## 3. Preflight

20. **`launch.checklist`** rewritten every run: Zernio key present and valid, TikTok accounts (and which are disconnected), a
    page for every campaign (names the exact username to create), campaign joined / rules checked (manual), campaign pages
    reachable, Drive footage, first post, links submitted (manual), ntfy topic (optional), dashboard on the home screen
    (manual), state branch size (warns above 800 MB), Zernio rate-limit headroom, scheduled runs on time. Every item has a
    plain-English `how`. Manual ticks can be written by the dashboard as `launch.manual.<id>: true`.
    - `preflight.run` - `P PreflightTests`, `L WholeRunTests.test_key_missing_shows_in_the_launch_checklist`
21. **`python clipper/cloud_runner.py --preflight`** prints the report with live checks (fetches the pages, lists Drive
    folders, asks Zernio) and never prints a secret.
    - `cloud_runner._preflight_main`, `preflight.render` - `P test_the_report_is_readable...`, `L WholeRunTests.test_preflight_cli...`
22. **One ntfy test ping**, the first time a topic is configured (daytime only).
    - `cloud_runner.main` - `L WholeRunTests.test_preflight_cli...` (exactly one ping)
23. **Zernio rate-limit headers are remembered** (`zernio.RATE`) and `Retry-After` is respected (capped at 120 s).
    - `zernio._note_headers/_call` - `P test_rate_limit_headers...`

## 4. Account modes

24. **Warm-up**: a page first seen today posts 1/day on days 1-2, 2/day on days 3-4, normal caps from day 5. The page's age
    comes from its first post, or from Zernio's account id (Mongo ObjectId timestamp = when it was connected), whichever is
    earlier. Switch off with setting `autopilot.warmup = false`.
    - `accountmodes.decide/warmup_cap` - `L AccountModeTests.test_warmup_ladder...`
25. **Limited accounts** (>= 4 live posts older than 24 h with median views under 100) go to `slow`: half the cap, twice the gap,
    only the better-scoring clips (slideshows always allowed); alert. Only counts posts whose views were really measured, so
    broken analytics can never mark every account "limited".
    - `accountmodes.decide`, `pipeline._upload_step` - `L test_limited_account...`, `L test_slow_account_gets_half...`
26. **Disconnected accounts** (Zernio `isActive: false` / `/accounts/health` says reconnect, or a post failed with a login
    error) go to `cooldown` with reconnect steps; critical alert (ignores quiet hours); retried 12 h after a login error.
    - `accountmodes.normalize_accounts/note_error`, `zernio.accounts_health` - `L AccountModeTests`, `L ZernioHealthTests`
27. **A clip is never posted for a campaign that is not active, or to a page that is not allocated to it**: allocation decides
    the pages, the campaign state gates the queue, and the last-look gate checks both again.
    - `pipeline.campaign_accounts/campaign_paused/_upload_step`, `gate.recheck` - `L PostingLoopTests`
28. **Pages removed from Zernio** stay on record as "no longer connected".
    - `lifecycle.run` - `L test_an_account_removed_from_zernio...`

## 5. Smart scheduling

29. **Posts are planned for a time later today** (Zernio `scheduledFor` + `timezone`, `publishNow` off) instead of the minute
    the run reaches them. Default on in the cloud; `--no-schedule` (or setting `autopilot.schedule = false`) posts at once.
    - `scheduling.plan_slot`, `zernio._create_post`, `pipeline._upload_step` - `L WholeRunTests.test_scheduled_posts_use_planned_times...`, `P ZernioSchedulingTests`
30. **Jittered minutes, no shared minute, best hours, gaps**: minute 2-57 chosen per account/day (stable on a re-run), at least
    3 minutes between any two accounts, hours = own best hours once 20+ posts have settled else 12-14h and 18-22h New York,
    the campaign's min gap kept, 90 minutes between any two posts of one page, never outside the posting window.
    - `scheduling` - `L SchedulingTests`
31. **No double posting after a crash**: every post carries an `Idempotency-Key` (same clip + page + content = same key, so
    Zernio returns the original post for 24 h), the post id is written to the `uploads` table the instant Zernio answers, a
    409 "already exists" is treated as success, and the state is checkpointed right after posting.
    - `pipeline._idem_key/_provisional`, `zernio._create_post`, `cloud_runner.main` - `P test_a_duplicate_409...`, `L test_crash_after_posting...`
32. **Scheduled posts of a campaign that stops are taken back** (Zernio delete-post) and the clip returns to the queue; a
    scheduled clip keeps its file until it has published.
    - `pipeline.cancel_scheduled`, `cloud_runner.prune_posted` - `L test_scheduled_posts_of_a_campaign_that_paused...`

## 6. Performance loop

33. **Insights and numbers from our own posts only**: averages per kind, clip length, title hook word and New York hour for
    posts that are 24 h+ old with measured views; plain-English `insights` (max 12) and the `performance` dict. Minimum
    samples: 10 settled posts to compare anything, 5 per kind/length group, 3 per hook word/hour, 20 before ranking hours.
    - `performance.analyze` - `F AnalysisTests`
34. **Feedback into posting**: the day's video/slideshow split moves toward the winner (never below 20% for either), clips are
    ordered by score x what worked (preferred length up, weak hook words down), and 20% of the positions are swapped for
    exploration (deterministic per day).
    - `performance.split_caps/order_rows/clip_penalty` - `F FeedbackTests`, `L test_the_performance_split...`
35. **Retire low performers**: a slideshow angle with 3 posts under 100 views is paused for 14 days (no new decks made, queued
    decks wait), then tried again; strikes are counted.
    - `performance._update_retirements`, `pipeline.make_slideshows/_upload_step` - `F test_three_weak_posts_pause...`, `F test_a_paused_angle_is_not_posted...`

## 7. Run history and self-healing

36. **`runs.history`** (max 100) with posted / errors / queued / switches / notes / key per run, and the **`chain`** heartbeat
    (`stale_after`, earlier stalls) so the dashboard can say the 4-hourly chain stopped; a stall also sends one alert.
    - `runstate.record_run/chain_update` - `L RunStateTests`, `L WholeRunTests.test_run_history...`, `test_chain_stall...`
37. **One failing step never stops the others**: every step of the run and of the cycle (importing, clipping, approving,
    slideshows, posting) is isolated and recorded; the state is saved and pushed in a `finally` (also on SIGTERM/SIGINT).
    - `cloud_runner.main`, `pipeline.autopilot_cycle` - `L test_one_failing_step...`, `L test_a_killed_run_still_saves...`
38. **Runner lock**: a small file pushed (no force) to the state branch before work starts; a second live run backs off, a lock
    older than 100 minutes is ignored.
    - `cloud_runner.acquire_lock`, `runstate` - `L test_a_second_runner_backs_off...`, `L test_lock_blocks...`
39. **Failed posts**: a post that fails on the platform is retried once through Zernio (its media is already there), then held
    for a human; a clip the platform rejects twice is held ("Posting failed twice ..."); login errors never count against the clip.
    - `pipeline.refresh_platform_stats/_upload_step` - `L test_platform_rejecting_a_clip_twice...`
40. **Same clip never twice**: unique (clip, platform) row, re-checked right before the call, and a near-identical transcript
    of an already posted clip is held (the briefs forbid the same clip twice). A rendered file that is gone is dropped.
    - `pipeline._upload_step`, `gate.duplicate_of` - `L test_never_the_same_clip_twice...`, `L GateTests`
41. **State trimming**: events older than 14 days are summarised per day and deleted, files of rejected clips and orphan
    files removed, big non-transcript files in source folders removed, database vacuumed; transcripts are always kept.
    - `runstate.trim_state` - `L test_trim_deletes...`
42. **Backoff**: Zernio calls retry 429/5xx with exponential backoff and `Retry-After`; `runstate.with_retries` for other calls.
    - `zernio._call` - `P test_rate_limit_headers...`, `L test_with_retries...`

## 8. Footage

43. **YouTube channel / playlist sources are polled** for new videos only (newest N, ledger in `sources.ledger`), each checked
    against the campaign's `allowed_sources`; single links and local folders are untouched.
    - `footage.poll_youtube/explicit_sources`, `pipeline._import_step` - `L FootageTests`
44. **Restock mode** when a campaign has less than 3 days of content: older sources are queued again for more moments (only
    moments that do not overlap clips already made), those clips may score 10 points under the usual approval minimum (floor
    40), the slideshow deck pool grows from 40 to 120, media is re-fetched only for the sources being re-clipped (Drive file
    ids are remembered in the ledger), transcripts are reused.
    - `footage.restock`, `cloud_runner.drive_fetcher/main`, `pipeline._approve_step` - `L test_restock_requeues...`, `L test_restocked_clips...`

## 9. Compliance re-check

45. **Last look before posting** on the exact text that goes out: required hashtags/@tags present and at the very end when the
    brief says so, `#ad`, banned phrases (caption, title, speech), logo and length evidence, no duplicate speech. A failing
    clip is held with the reason `Recheck before posting: ...` (status `pending_review`, shown as held in the dashboard) and
    released automatically when it passes. Missing evidence never blocks.
    - `gate.recheck`, `pipeline._gate_for/_approve_step` - `L GateTests`, `L test_gate_holds_a_clip...`

## 10. Owner alerts

46. **Queue with quiet hours**: 23:00-08:00 New York only critical alerts go out (key missing, a page disconnected); the rest
    wait and go at 08:00; failed sends stay queued up to 30 h; one alert per key per day.
    - `alerts.run` - `L AlertQueueTests`
47. **8 PM digest** ("Posted today: 3. Links to submit: 5. Clips left for 4.2 days. Bench ok. Idle: ... " + dashboard link;
    title keeps "N new links to submit") and a **Sunday-evening weekly summary** (posts, views, estimated earnings, best finding).
    - `alerts.digest/weekly` - `L test_digest_at_8pm...`, `L test_weekly_summary...`
48. **Existing alerts kept**: campaign paused (for campaigns without a lifecycle record), content running low, posting errors,
    "Posting is off" when the key is missing (now critical).
    - `cloud_runner.owner_alerts` - `A OwnerAlertTests`

## Switches and commands

* `python clipper/cloud_runner.py --preflight` - the launch checklist, live. `--no-schedule` - post at once instead of at a
  planned time. `--no-discover`, `--no-drive`, `--no-push`, `--no-pull` as before.
* Settings (in the workspace, changeable from a brief or the database): `lifecycle.max_active` (0 = every free page works),
  `autopilot.warmup` (false skips warm-up; env `CLIP_WARMUP=0` does the same for one run), `autopilot.schedule`,
  `schedule.refused` (set by the runner when Zernio refuses a scheduled post: the next 7 days post at once).
* Brief fields: `account_match` (`"tradever"` = brand page, `""` or `"*"` = any free page), `accounts.tiktok` (an explicit
  list pins pages to the campaign), `hold: true` (pause it by hand), `posts_per_week` (pace check), `footage_drive_folder`,
  YouTube channel / playlist URLs in `sources`.
* `clipper/data/ban_list.json` - organisations never suggested as leads.

## What could NOT be verified without real credentials

Everything that talks to Zernio, Content Rewards, Google Drive, YouTube or ntfy is tested against fakes only. Specifically:

* **Zernio scheduling**: that a TikTok video / photo post accepts `scheduledFor` + `timezone` ten minutes ahead with
  `tiktokSettings`, what the scheduled post looks like in `GET /v1/posts/{id}` (we treat "no link yet" as `processing` and pick
  the link up later), and that `DELETE /v1/posts/{id}` / `POST /v1/posts/{id}/retry` behave as documented.
* **Idempotency-Key** and the 409 duplicate answer are implemented from the docs (https://docs.zernio.com) only.
* **`/v1/accounts/health` field names** (`canPost`, `needsReconnect`, `status`, `issues`) are from the docs; accounts missing
  those fields are assumed fine. The "account age from the id" trick assumes Zernio ids are Mongo ObjectIds (the docs'
  examples are).
* **Content Rewards**: the paginated listings (`/c/discover/clipping?page=N`, `/ugc?page=N`) are scraped by looking for campaign
  ids in the HTML; if the site renders them client-side they simply add nothing. A 404 is how a removed campaign is detected.
* **Drive / YouTube**: restocking from Drive needs the folder listing and download to work from GitHub's network; YouTube
  channel listing may need cookies from a datacenter IP (it then reports an error and the default import still runs).
* **The runner lock** relies on `git push` (no force) being refused when the branch moved; verified against a local bare repo.
* **Warm-up thresholds, "limited" = median under 100 views on 4+ posts, 2x demotion ratio, 7-day end rule** are judgement
  calls, not measured against real TikTok behaviour. They are constants at the top of `accountmodes.py` / `lifecycle.py`.
* **First live runs**: the existing end-to-end tests that expect a fresh page to post 2 clips on day one now see warm-up (1 per
  page per day) and planned times; see the report.

## Keys written (beyond docs/AUTOPILOT_CONTRACT.md)

Contract keys written exactly as specified: `campaign_state.<name>`, `account_state.<platform>/<account>`, `bench`,
`switch.log`, `runs.history`, `launch.checklist`, `insights`, `performance`.

Extra, all optional for readers:

* `campaign_state.*`: `closed_since`, `runway_days`, `priority_parts`, `own_avg_views`, `own_posts_judged`, `est_earned`,
  `posts_7d`, `posts_per_week`, `behind_pace`.
* `account_state.*`: `first_seen`, `limits` ({blocked / max_per_day / cap_factor / gap_factor / best_only}), `connected`,
  `active`, `checked`, `warmup_day`.
* `bench`: `next_step`, `checked`.  `launch.checklist` items may carry `optional: true`.
* `chain` ({last_run, every_hours, stale_after, gaps, stalled_hours}), `campaigns.archived`, `retired.angles`,
  `sources.ledger`, `events.archive`, `supply.by_campaign`, `launch.manual` (read), `lifecycle.max_active`,
  `autopilot.warmup`, `autopilot.schedule`, `autopilot.deck_pool`, `account.err.<platform>/<account>`.
* Database: `uploads.scheduled_for` (UTC; a post with `state = processing`, no `url` and a future `scheduled_for` is waiting
  on Zernio), `clips.requeues`. A clip held by the gate or after two failures is `status = pending_review` with `held_reason`.
* State branch: `archived_campaigns.json`, `runner_lock.json` (only while a run is active).
