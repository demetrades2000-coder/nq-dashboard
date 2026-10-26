# Clip Engine dashboard: data contract (v2)

`dashboard.build_data(ws)` returns this object. The page (`dashboard_page.html`) reads it, either
embedded at build time (`/*__DATA__*/null`) or fetched from `data.json` when hosted. Every field
must be present: use empty lists, 0 or null, never omit. Money fields are numbers in USD. They
become `null` everywhere when `hide_money` is true. Dates are ISO strings in local time.

Existing v1 fields stay unchanged. Fields marked **NEW** are added in v2; **v2.1** marks the multi-account,
campaign-rules, queue and slideshow additions; **v2.2** marks the agency additions (live campaign checks, brand
accounts, agency summary, discovered leads); **v2.3** marks the daily-chore additions (submit list, status light, content
supply, account health, payout tracker). Same `version: 2`, every new field always present.

```jsonc
{
  "version": 2,                       // NEW
  "generated": "2026-10-22T05:00:00",
  "workspace": "C:\\Users\\me\\clipper-workspace",
  "preview": false,                   // sample data banner
  "hide_money": false,

  "autopilot": {
    "enabled": true, "via": "free", "platforms": ["tiktok"], "cap": 3, "min_score": 55, "privacy": "public",
    "last": {"started": "...", "finished": "...", "approved": 2, "uploaded": 2, "held": 0, "upload_errors": 0, "skipped_campaigns": 0},
    "notes": ["..."], "errors": ["..."],
    "every_hours": 6,                 // NEW  schedule interval (setting autopilot.every_hours, default 6)
    "next_run": "2026-10-22T06:17:00", // NEW  estimate = last.finished + every_hours, or null
    "max_per_day": 3,                 // v2.1 posts per account per day: setting autopilot.max_per_day, else
                                      //      autopilot.max_uploads_per_day, else 3 (platform ceilings still apply: TikTok 15)
    "runner": "cloud"                 // v2.1 where the autopilot runs: last cycle's "runner", else setting autopilot.runner, or null
  },
  "accounts_detail": [{               // v2.1 one per (platform, account): accounts seen in uploads + accounts named by
                                      //      autopilot campaigns (accounts.<platform>: name | [names] | "*"); sorted by views_7d
    "platform": "tiktok", "name": "tradever.clips", "campaigns": ["Tradever (prop firm)"],
    "today": 2, "cap": 3,             // uploads today (every attempt, like the autopilot counts them) vs min(max_per_day, ceiling)
    "posts": 30, "posts_7d": 9,       // posts that went out (failed uploads excluded)
    "views": 41200, "views_7d": 9800, // views_7d: gained in 7 days from earnings.json history (else views of posts made in 7 d)
    "avg_views": 1373, "likes": 1600, "engagement": 0.0388,
    "last_post": "2026-10-22T09:12:00", "net": 120.5, "net_7d": 30.1,   // money: null when hide_money
    "slideshows": 4, "daily_views": [0, 120, "... 14 values, oldest first"],
    "status": "posting",              // posting | at_cap | idle | error (failed upload / error event naming it in 24 h)
    "status_note": "1 slot left today",
    "health": {"state": "ok",         // v2.3 no_posts (connected, nothing went out) | limited | early (fewer than 4 posts a day
                                      //      old: too soon to judge) | ok. limited = >= 4 live posts and the median views of
                                      //      the last 4 posts that are >= 24 h old is < 100, OR (with view history) >= 3 posts
                                      //      this week, >= 4 live and <= 5 views gained in 7 days ("flat while posting")
               "median_last4": 1692, "note": "plain-language explanation, incl. \"New accounts often get little reach ...\""}
  }],
  "up_next": [{                       // v2.1 approved clips of autopilot campaigns not posted yet (score order, max 30), one row per
                                      //      platform still to post, with the account the rotation picks (most room today,
                                      //      then fewest posts, then name; "*" = the accounts seen posting, no network)
    "clip_id": 51, "title": "...", "campaign": "...", "score": 79.2, "thumb": "thumbs/51.jpg", "kind": "slideshow",
    "dur": 18, "platform": "tiktok", "account": "tradever.daily", "slot": "next run",   // or "tomorrow" (every account at cap)
    "reason": "fewest posts today"
  }],                                 // v2.2 clips of a paused campaign (live.state paused) are left out: they wait
  "accounts": [{"name": "Zernio (TikTok/Instagram, free)", "connected": true}],

  "stats": {
    "clips": 0, "posted": 0, "posts": 0, "views": 0, "likes": 0, "net": 0.0,
    "to_submit": 0, "drafts": 0, "held": 0, "today_posts": 0,
    "views_24h": 0, "views_7d": 0,    // NEW  views gained (from view history deltas), 0 if no history
    "net_7d": 0.0, "net_30d": 0.0,    // NEW  est. net from posts made in the window
    "posts_7d": 0,                    // NEW
    "avg_views": 0,                   // NEW  views / posts
    "engagement": 0.0,                // NEW  likes / views (0..1)
    "effective_cpm": 0.0,             // NEW  net per 1000 views
    "best_platform": "tiktok"         // NEW  or null
  },

  "todo": {
    "submit": [{"clip_id": 1, "platform": "tiktok", "url": "...", "title": "...", "page": "campaign url",
                "campaign": "Tradever (prop firm)", "account": "tradever.clips", "created": "2026-10-22T09:12:00",
                "views": 329, "likes": 15, "upload_id": 90}],   // v2.3 every upload with a link and no submitted_at that did
                                      //      not fail and is not a draft (up to 200, newest first; stats.to_submit counts all)
    "drafts": [{"clip_id": 1, "caption": "...", "title": "..."}],
    "held":   [{"id": 1, "title": "...", "reason": "..."}]
  },

  "clips": [{
    "id": 1, "title": "...", "campaign": "...", "score": 72.5, "status": "posted", "dur": 31,
    "created": "...", "held": null, "views": 0, "net": 0.0, "flags": ["..."],
    "uploads": [{"platform": "tiktok", "url": "...", "views": 0, "likes": 0, "state": "live", "net": 0.0,
                 "account": "default", "created": "...", "submitted_at": null}],
    "thumb": "thumbs/1.jpg",          // NEW  relative path to a 270x480 JPEG, or null
    "hook": "first sentence ...",     // NEW  first sentence of the clip (<= 120 chars)
    "caption": "...",                 // NEW
    "reasons": ["strong hook"],       // NEW  scoring reasons
    "source_title": "...",            // NEW
    "start": 12.0, "end": 43.0,       // NEW  seconds in the source video
    "kind": "video"                   // v2.1 'video' or 'slideshow' (clips.kind; 'video' when the column is missing).
                                      //      A slideshow's thumb is its first slide (file = slide image or slides folder)
  }],

  "campaigns": [{
    "name": "...", "cpm": 2.0, "fee": 10.0, "cap": 500, "min_views": 0, "platforms": ["tiktok"],
    "url": "...", "verified_on": "2026-10-22", "age": 0, "problems": ["..."], "auto": true,
    "posts": 0, "views": 0, "net": 0.0, "clips": 0,
    "automation_allowed": true,       // NEW  true / false / null (unconfirmed)
    "notes": "...",                   // NEW  first 300 chars of the brief's notes
    "posts_7d": 6, "posts_per_week": 5,   // v2.1 posts_per_week: optional brief field (0 = none)
    "checks": [{"label": "Required tags at the caption end", "ok": true,      // v2.1 the brief's rules judged on what
                "detail": "@tradeverfunding @laythbanks: 13 of the last 13 captions"}],  // was posted. ok: true / false /
                                      //      null (nothing to judge yet). From caption.required_mentions/required_hashtags
                                      //      (+ mentions_last), on_screen.logo (file exists), clip.min, posts_per_week,
                                      //      min_engagement (0.02 or 2 = 2%), platforms, automation_allowed
    "payout": {"min_payout": 7.0, "views_to_min": 1400,   // v2.3 adds best_views (best single post) and total_views (all posts)   // v2.1 views a post needs before it pays (min_payout / cpm * 1000,
               "cap": 500.0, "views_to_cap": 100000,      //      or min_views if higher); views where max_payout_per_clip stops it
               "posts": 13, "posts_paying": 8, "posts_at_cap": 0},  // public campaign rates: kept when hide_money
    "account_match": "tradever",      // v2.2 brief field: posts only from accounts whose name contains it ("" = none).
                                      //      With accounts.<platform> "*" the dashboard lists only the seen accounts
                                      //      matching it (none matching = nothing posts, no "default" account)
    "accounts_spec": {"tiktok": ["*"]},   // v2.2 the brief's accounts.<platform> as lists ({} when unset)
    "posting_accounts": ["tiktok/tradever.clips", "tiktok/tradever.daily"],  // v2.2 accounts_detail rows of this campaign
    "live": {                         // v2.2 the cloud runner's live check of the campaign page (setting
                                      //      campaign_live.<name>); public figures, kept when hide_money
      "state": "active",              //      active | paused (ok false: out of budget / closed, posting stops, resumes
                                      //      by itself when refilled) | unchecked (no check yet: every other field null)
      "ok": true, "reason": "$1,937 left",
      "left": 1937.49, "budget": 2000.0, "spent": 62.51, "spent_frac": 0.0313,   // spent = budget - left
      "cpm": 5.0, "brief_cpm": 5.0, "cpm_differs": false,   // live TikTok rate vs the brief's cpm
      "status": "funded", "creators": 28, "views": 101677,
      "checked": "2026-10-22T23:28:25"   // local time (stored as UTC "Z")
    }
  }],

  "earnings": {
    "by_platform": {"tiktok": {"posts": 0, "views": 0, "net": 0.0, "likes": 0}},
    "daily":   [{"date": "2026-10-01", "posts": 0, "views": 0, "net": 0.0}],   // last 21 days (v1); NEW: 30 days
    "weekly":  [{"week": "2026-W42", "posts": 0, "views": 0, "net": 0.0}],     // NEW  last 12 ISO weeks
    "monthly": [{"month": "2026-10", "posts": 0, "views": 0, "net": 0.0}],     // NEW  last 6 months
    "by_campaign": [{"name": "...", "posts": 0, "views": 0, "net": 0.0}],       // NEW
    "top": [{"title": "...", "platform": "tiktok", "url": "...", "views": 0, "net": 0.0}]
  },

  "analytics": {                       // NEW (whole block)
    "views_history": [{"date": "2026-10-01", "views": 0}],     // total views across all posts at end of each day (last 30 days), from earnings.json history + current
    "hour_heatmap": [[0, 0, "... 24 values"], "... 7 rows"],   // 7x24 avg views per post, by posting weekday (Mon=0) x hour (0-23)
    "length_buckets": [{"label": "8-20s", "posts": 0, "avg_views": 0}],  // 8-20, 20-30, 30-45, 45-60, 60+
    "score_vs_views": [{"id": 1, "score": 70.0, "views": 1200, "platform": "tiktok"}],
    "funnel": {"imported": 0, "clips": 0, "approved": 0, "posted": 0, "submitted": 0},
    "hook_words": [{"word": "money", "posts": 3, "avg_views": 1500}],    // top 12 words in hooks of posted clips (stopwords removed)
    "platform_split": [{"platform": "tiktok", "views": 0, "posts": 0}],
    "format_split": [{"kind": "video", "posts": 0, "views": 0, "avg_views": 0, "engagement": 0.0},   // v2.1 always both
                     {"kind": "slideshow", "posts": 0, "views": 0, "avg_views": 0, "engagement": 0.0}],
    "calendar": [{"date": "2026-08-01", "posts": 0, "views": 0}],        // last 84 days
    "streak": {"current": 0, "best": 0}                                   // consecutive days with >= 1 post
  },

  "pipeline": {                        // NEW
    "queue": {"queued": 0, "running": 0, "retry_wait": 0, "failed": 0, "blocked": 0, "done": 0},
    "sources": 0
  },

  "health": {                          // NEW  cheap checks only (no network, no model loads)
    "checks": [{"name": "ffmpeg", "ok": true, "fix": ""}],   // ffmpeg found, autopilot on, a posting account connected, schedule installed (best effort), publish set up, disk > 5 GB
    "disk_free_gb": 120.5
  },

  "goals": {"month_target": null},     // NEW  setting dashboard.goal_month_usd (number) or null

  "leads": [{"name": "...", "cpm": 6.0, "platforms": ["tiktok"], "automation_allowed": null,
             "status": "needs setup", "url": "...", "note": "..."}],   // NEW  campaign files that aren't ready

  "agency": {                         // v2.2 campaigns on autopilot (auto) running at once
    "campaigns": 2, "active": 1, "paused": 1,   // active = auto and live.state != paused (unchecked counts as active)
    "unchecked": 0,                   // active ones never checked yet
    "budget_left": 1937.49, "budget_total": 2000.0,   // sums over active campaigns with a live check, else null
    "accounts": ["tiktok/tradever.clips"], "accounts_n": 1,   // accounts_detail rows serving an active campaign
    "paused_list": [{"name": "...", "reason": "budget almost gone ($12.40 left)", "checked": "..."}]
  },

  "supply": {                         // v2.3 content supply meter
    "video": 2, "slideshow": 2, "total": 4,   // approved, unposted clips of autopilot campaigns that are not paused
    "per_day": 2.0, "pace_source": "history", // distinct clips uploaded per day over the last 3 days; "caps" = busiest
                                      //      platform's accounts x daily cap when there is no history; "none" = unknown
    "days_left": 2.0,                 // total / per_day, null when the pace is unknown
    "level": "warn",                  // good | warn (< 3 days) | bad (< 1 day, or out) | none (no pace / nothing configured)
    "by_kind": {"video": {"per_day": 1.0, "days_left": 2.0}, "slideshow": {"per_day": 1.0, "days_left": 2.0}},
    "refill": "what refills it (new Drive footage, more generated slideshow decks)",
    "decks_available": 7, "note": "..."   // settings supply.decks_available (int) / supply.note (str) written by the runner; null / ""
  },
  "status": {                         // v2.3 traffic light for the top of Today and Submit
    "level": "amber", "headline": "...",   // green "Everything is running" | amber | red; headline = the worst reason
    "reasons": [{"level": "red", "code": "stale_run", "text": "Autopilot hasn't run for 22h — restart",
                 "page": "jobs", "action": {"label": "Open GitHub Actions", "url": "https://github.com/.../clipper-cloud.yml"}}],
                                      //      codes: stale_run (red, last run > 1.5 x autopilot.every_hours old), never_ran,
                                      //      autopilot_off, no_accounts (red, nothing connected and no post in 24 h),
                                      //      no_uploads_24h (red, clips waiting, none posted in 24 h, inside post hours),
                                      //      paused, supply, accounts_limited, account_errors, upload_errors. Red first.
    "run": {"finished": "...", "every_hours": 4, "stale_after_hours": 6.0, "age_hours": 1.9, "enabled": true,
            "actions_url": "https://github.com/demetrades2000-coder/nq-dashboard/actions/workflows/clipper-cloud.yml"}
  },                                  //      the page re-judges stale_run from `run.finished` and the clock on every view
  "leads_discovered": [{              // v2.2 setting leads.discovered (cloud runner, Content Rewards, ranked and filtered:
                                      //      no adult/gambling/non-English), minus campaigns already joined (same url);
                                      //      best score first. Public rates and budgets: kept when hide_money
    "rank": 1, "id": "...", "name": "...", "org": "...", "url": "https://contentrewards.com/c/campaigns/...",  // url "" if not http(s)
    "rates": {"tiktok": {"cpm": 4.0, "min": 5.0, "max": 400.0}}, "platforms": ["tiktok"],
    "cpm": 4.0, "min": 5.0, "max": 400.0,   // TikTok rate (else the first platform's), or null
    "left": 4620.0, "budget": 5000.0, "spent_frac": 0.076,
    "creators": 41, "views": 312400,  // creators = competition
    "categories": ["Finance"], "types": ["Clipping", "Slideshows"],
    "content_rules": 2, "requirements": 1, "requires_application": false,   // null when unknown
    "score": 9.84
  }],

  "jobs":   [{"id": 1, "status": "done", "attempts": 1, "title": "...", "input": "...", "last_error": null, "updated": "..."}],
  "events": [{"ts": "...", "level": "ok", "message": "..."}],
  "spend":  {"month": 0.0, "cap": 0.0}
}
```

Thumbnails: `thumbs/<clip id>.jpg` sits next to `dashboard.html` in the workspace, and next to
`index.html` in the published site. Only the newest 60 clips get one.

Pages (v2.1): **Money → Accounts** (`#/accounts`): one card per account (today vs cap, 7-day posts and views, totals,
engagement, last post, est. net, daily-views sparkline, status chip), a leaderboard and the Up next queue with the
posting schedule line. Up next is also on Today. Campaign cards carry the rules checklist; Earnings has the
Payout reality card; Analytics has Video vs slideshow.

Agency (v2.2): **Campaigns** opens with the Agency card (active, paused, budget left, accounts in use, paused reasons);
each campaign card shows its live chip (Active / Paused — reason / Not checked yet), budget bar, live rate when it
differs from the brief, creators competing, last check and its brand accounts. Below the cards, **Leads** lists
`leads_discovered` as ranked cards with an Open / Join button; campaign files that aren't ready (`leads`) follow.
**Today** has an Agency line and a Paused alert per paused campaign. Campaign briefs load from the repo `campaigns/`,
the workspace's `campaigns/` and the cloud state's `<state>/campaigns/` (the parent of a workspace folder named `ws`, or `CLIP_CLOUD_DIR`).

Daily chore (v2.3): **Submit** (`#/submit`, first tab and the default page, manifest `start_url` `./#/submit`) has one card per
campaign with links in `todo.submit`: Copy next link (copies the oldest link not ticked and ticks it), Copy all (one per line, no
ticks), Open campaign page (`campaigns[].url`, else the link's `page`), per-link circles to toggle and Undo last. Ticks are kept
in this browser only (`localStorage` `ce.submitted` = {link: time}); a link the database marks submitted never arrives. The
number of unticked links is the Submit tab badge, the title prefix "(N)" and `navigator.setAppBadge`. **Today** starts with the
status strip (`status`) and shows the content supply meter (`supply`), which Accounts shows too; Accounts cards flag
`health`; **Earnings** has "How close are we to the first payout" from `campaigns[].payout` (`best_views`, `total_views`,
`views_to_min`): a post only counts once it passes the minimum on its own. `python demo.py <dir> --stale` builds a stuck autopilot.

New sections are computed defensively: an error in one leaves it empty instead of breaking the page.


## v4: the autopilot brain's keys and what the dashboard computes from them

Source of the keys: `docs/AUTOPILOT_CONTRACT.md` (workspace settings written by the cloud runner). **Every key may be absent**:
each block below is then complete but empty (`present: false`, `known: false`, `null` numbers), and the page says "not reported yet".
`contract` is 4; `sample` is true for a `demo.py` workspace (the page shows "Sample data"). `hide_money` nulls every dollar field named below.

```jsonc
{
  "campaigns": [{ ...,
    "lifecycle": {                      // setting campaign_state.<name>; derived from the live check when absent (known: false)
      "name": "...", "known": true, "state": "active",   // active | standby | paused | ended | blocked
      "state_label": "Posting now", "reason": "plain words (why it is in that state)", "since": "ISO local" | null,
      "priority": 7.3 | null, "rank": 1 | null, "accounts": ["tiktok/tradever.clips"], "supply_days": 5.2 | null,
      "left": 1937.49 | null, "budget": 2000.0 | null, "cpm": 5.0 | null, "spent_frac": 0.03 | null, "checked": "ISO" | null,
      "burn": {"per_day": 100.0 | null, "days_left": 10.0 | null, "source": "history" | "none", "points": 4,
               "note": "~10 days of budget left at the current pace"}   // from `history` ([[ts, left], ...] or {ts, left}) in
                                        // campaign_state.<name> or campaign_live.<name>; null until 2 points 6+ hours apart
    }}],
  "lifecycle": {"present": true, "campaigns": [all lifecycle rows, best state first, then rank],
                "order": ["names"], "counts": {"active": 1, "standby": 1, "paused": 1, "ended": 0, "blocked": 1},
                "extra": [lifecycle rows of campaigns the autopilot knows that have no brief file here],
                "switch_log": [{"ts", "kind", "campaign", "from", "to", "reason", "text"}],   // setting switch.log, newest FIRST, max 60
                "switch_groups": [{"ts", "text": "Tradever paused: budget almost gone → BILF promoted: best rate", "kinds": [], "campaigns": [], "count": 2}],
                "last_switch": {...} | null},      // lines within 20 minutes of each other are one story
  "bench": {"present": true, "healthy": 1, "min": 2, "need_more": true, "reason": "...",
            "join_next": [{...a leads_discovered row..., "rank", "join_message": "I joined <name>: here are its rules",
                           "rules_words": ["AI", "automat", "tool", "repurpos"]}]},   // at most 5
  "accounts_detail": [{ ...,                // + one row per account_state.<platform>/<account> not seen posting (zero stats)
    "posts_today": [{"clip_id", "title", "created", "url", "kind", "state"}],
    "manager": {"known": true, "mode": "warmup", "mode_label": "Warm-up", "reason": "day 2 of 5 warm-up: 1 post a day",
                "since", "campaign": "..." | null, "posts_total", "posts_7d", "median_views_recent", "health": "ok|limited|new|error" | null,
                "warmup_day": 2 | null, "warmup_total": 5, "score": 0-100 | null, "score_label": "good|fair|poor"}}],
                // mode: warmup | normal | slow | cooldown | idle | unknown (not reported). score: a rough guide from health, median views, posts
  "account_help": {"zernio_url", "steps": [...], "reconnect": [...], "naming": [{"campaign", "match", "state", "rule", "examples", "has_account", "accounts"}]},
  "runs": {"present": true, "source": "runs.history" | "autopilot.jsonl" | "none",
           "history": [{"ts", "duration_s", "posted", "errors", "queued_videos", "queued_slideshows", "switches", "notes", "key",
                        "level": "ok|bad|info", "what": "Posted 2 clips, 1 error", "items": [{"clip_id", "title", "platform", "account", "kind"}]}],   // newest first, max 100
           "summary": {"runs_24h", "posted_24h", "posted_7d", "errors_7d", "runs_7d", "avg_duration_s", "clean_rate", "last_ts", "last_key", ...}},
  "launch": {"present": true, "items": [{"id", "label", "done", "manual", "optional", "how", "detail", "copy": [{"label", "value"}]}],
             "done", "total", "required_done", "required_total", "complete", "auto_left", "manual_left"},   // optional = ntfy_topic
  "money": {"rows": [{"key": url, "clip_id", "title", "campaign", "platform", "account", "created", "submitted_at", "views",
                      "net", "potential", "needs_views", "over_min"}],        // money: null when hide_money; max 400
            "estimates": {"pending", "approved", "at_risk"}, "buckets": {"waiting", "earning", "hold", "due", "at_risk"},
            "counts": {...}, "batches": [{"date", "amount", "posts", "campaigns", "stage": "due|coming"}],
            "rules": {"earn_days": 7, "hold_days": 3, "lag_days": 10, "text": "..."}},
  "insights": {"notes": ["the autopilot's own sentences"], "cards": [{"id", "kind", "title", "sentence", "detail", "n", "confidence"}],
               "ab": [{"id", "title", "why", "a": {label, posts, avg_views}, "b": {...}, "winner": "a|b|tie|null", "lift", "sentence", "confidence"}],
               "weekly": {"label", "from", "to", "posts", "posts_prev", "views", "views_prev", "est_net", "est_net_prev", "best", "try": [], "confidence"},
               "overall_avg_views", "sample", "confidence"},
  "system": {"state_bytes", "state_truncated", "db_bytes", "limit_bytes", "state_frac", "keys": [{"id", "label", "ok": true|false|null, "detail", "how"}],
             "restart": {"url", "steps": []}},
  "errors_help": [{"source", "text", "ts", "level", "title", "plain", "fix", "action": {"label", "url"} | null}],   // max 20, deduplicated
  "schedule": {"runs": [{"at", "in_hours", "note", "expected", "items": [{"clip_id", "title", "account", "platform", "kind", "thumb"}]}],
               "horizon_hours": 24, "every_hours", "queue_total", "note"},
  "status": { ..., "notes": [{"level": "info", "code", "text", "page", "action"}] },   // FYI lines: never change the light
  "clips": [{ ..., "accounts": [], "held_plain": "", "angle": "", "spark": [views readings], "queue": {"pos", "slot", "account", "platform"} | null}],
  "whatsnew": {"version": 4, "items": [{"id", "title", "text"}]}
}
```

**Money picture** (estimates, never promises). A post pays about **10 days after its link is pasted**: views count 7 days, then a 3-day hold.
Stages: `at_risk` (net 0: under its campaign's minimum payout; `potential` is what it would earn), `waiting` (over the minimum, link not
pasted), `earning` (0-7 days), `hold` (7-10 days), `due` (10+ days: should have paid). `pending = waiting + earning`, `approved = hold + due`.
The build only knows the database's `submitted_at`; the page also counts links ticked on the device (`localStorage` `ce.submitted`) as pasted at
tick time, using the same rule (`dashboard.money_stage` / `moneyPic()` in the page).

**New status reason codes**: `key_missing` (red; also hides `no_accounts`), `no_campaign_active` (red, amber when one waits on an account),
`campaign_blocked`, `bench_thin`, `account_reconnect`, `account_idle`, `launch_blocked` (amber: a required automatic step is undone). Notes:
`campaign_switched` (switch in the last 24 h), `account_warmup`, `launch_todo` (only manual steps left).

**Local-only state (per device, `localStorage`, key prefix `ce.`)**: `submitted` (pasted-link ticks), `launchTicks` (manual checklist steps),
`payouts` (the payout log `[{id, date, amount, campaign, note}]`), `theme` (dark | light | auto), `accent`, `goal`, `hideMoney`, `tour`, `newsSeen`,
view and filter choices. Settings → Backup copies them as one text to move to another phone.

**Pages (v4)**: Submit (sticky "Copy next link", share per link), Today (command center: status light with reasons and notes, setup checklist,
reel hero, money picture, timeline of runs, today's posts per account, next 24 hours), Clips (content library: filters, search, sort, gallery /
list / queue order), Insights (weekly report, insight cards with confidence, A/B, best hours) and Charts, Money (Earnings with the money
picture, Payouts log with CSV, Campaigns with lifecycle + bench + switch log, Accounts with the manager), System (Runs & health, Jobs, Activity,
Help FAQ, printable Report, Settings). `/` or Ctrl+K opens the global search; `g` then `s t c i m p a r h` jumps between pages.
