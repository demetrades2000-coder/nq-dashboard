# Clip Engine dashboard: data contract (v2)

`dashboard.build_data(ws)` returns this object. The page (`dashboard_page.html`) reads it, either
embedded at build time (`/*__DATA__*/null`) or fetched from `data.json` when hosted. Every field
must be present: use empty lists, 0 or null, never omit. Money fields are numbers in USD. They
become `null` everywhere when `hide_money` is true. Dates are ISO strings in local time.

Existing v1 fields stay unchanged. Fields marked **NEW** are added in v2; **v2.1** marks the multi-account,
campaign-rules, queue and slideshow additions (same `version: 2`, every new field always present).

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
    "status_note": "1 slot left today"
  }],
  "up_next": [{                       // v2.1 approved clips of autopilot campaigns not posted yet (score order, max 30), one row per
                                      //      platform still to post, with the account the rotation picks (most room today,
                                      //      then fewest posts, then name; "*" = the accounts seen posting, no network)
    "clip_id": 51, "title": "...", "campaign": "...", "score": 79.2, "thumb": "thumbs/51.jpg", "kind": "slideshow",
    "dur": 18, "platform": "tiktok", "account": "tradever.daily", "slot": "next run",   // or "tomorrow" (every account at cap)
    "reason": "fewest posts today"
  }],
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
    "submit": [{"clip_id": 1, "platform": "tiktok", "url": "...", "title": "...", "page": "campaign url"}],
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
    "payout": {"min_payout": 7.0, "views_to_min": 1400,   // v2.1 views a post needs before it pays (min_payout / cpm * 1000,
               "cap": 500.0, "views_to_cap": 100000,      //      or min_views if higher); views where max_payout_per_clip stops it
               "posts": 13, "posts_paying": 8, "posts_at_cap": 0}   // public campaign rates: kept when hide_money
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
Payout reality card; Analytics has Video vs slideshow. New sections are computed defensively: an error in one
leaves it empty instead of breaking the page.
