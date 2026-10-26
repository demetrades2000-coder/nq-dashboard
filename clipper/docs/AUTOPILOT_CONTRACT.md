# Autopilot data contract (written by the cloud runner, read by the dashboard)

All values live in the workspace `settings` table (`ws.setting(key, default)` / `ws.set_setting(key, value)`, JSON values).
Every key may be absent: readers must treat absent as "unknown", never crash.

## Campaign lifecycle: `campaign_state.<campaign name>`
```json
{"state": "active|standby|paused|ended|blocked",
 "reason": "plain words, e.g. 'budget almost gone ($12 left)' / 'rules ban automated tools' / 'best rate: promoted'",
 "since": "ISO UTC", "priority": 7.3, "rank": 1,
 "accounts": ["tiktok/tradever.clips"], "supply_days": 5.2,
 "left": 1910.72, "budget": 2000.0, "cpm": 5.0, "checked": "ISO UTC"}
```
* active  = posting now. standby = onboarded and cleared, waiting for an account or its turn. paused = budget low / closed /
  status not funded (resumes by itself when refilled). ended = closed for good (budget gone > 7 days or campaign removed).
  blocked = rules ban or do not clearly allow automation (never posts; needs a human).

## Switch log: `switch.log` (list, newest last, max 200)
`{"ts","kind":"paused|resumed|promoted|demoted|ended|account_moved|account_idle","campaign","from","to","reason"}`

## Accounts: `account_state.<platform>/<account>`
```json
{"campaign": "Tradever Prop Firm (Motion Clipping)|null",
 "mode": "warmup|normal|slow|cooldown|idle",
 "reason": "e.g. 'day 2 of 5 warm-up: 1 post a day'", "since": "ISO UTC",
 "posts_total": 12, "posts_7d": 9, "median_views_recent": 340, "health": "ok|limited|new|error"}
```

## Bench: `bench`
`{"healthy": 2, "min": 2, "need_more": false, "reason": "...", "join_next": [<lead dicts from leads.discovered>, up to 5]}`
(healthy = campaigns in active or standby with budget; need_more tells the owner to join another campaign.)

## Run history: `runs.history` (list, newest last, max 100)
`{"ts","duration_s","posted":2,"errors":0,"queued_videos":20,"queued_slideshows":14,"switches":0,"notes":["..."],"key":true}`

## Launch / setup checklist: `launch.checklist` (list, rewritten every run by preflight)
`{"id":"zernio_key","label":"Zernio API key added","done":true,"manual":false,"how":"exact next step in plain words","detail":"what was found"}`
Ids: zernio_key, zernio_accounts, account_matches_campaign, campaign_joined (manual), rules_checked (manual per campaign),
first_post, links_submitted (manual), ntfy_topic (optional), dashboard_homescreen (manual), drive_footage, state_branch.

## Insights: `insights` (list of short plain-English strings, max 12)
e.g. "Videos average 480 views, slideshows 190: more videos tonight." Written from our own posts only; never invent numbers.

## Supply (already exists): `supply.days_left`, `supply.decks_available`, `supply.note`
## Campaign live check (already exists): `campaign_live.<name>`, discovered leads: `leads.discovered`
