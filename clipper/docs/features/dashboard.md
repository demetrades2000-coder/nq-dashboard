# Dashboard features (v4, contract 4)

One line each: what, and where it lives. Data fields are in `docs/DASHBOARD_DATA.md`; the keys the autopilot writes are in
`docs/AUTOPILOT_CONTRACT.md`. Everything works when a key is absent ("not reported yet"). Per-device state is `localStorage` only.

## A. Command center (Today)
1. Big status light with every reason, worst first, collapsed under "N more to look at" (Today, `statusStrip`; data `status.reasons`).
2. FYI notes that never change the light: campaign switched, account warming up, setup steps for you (`status.notes`).
3. New light reasons from the brain's keys: key missing, no campaign posting, campaign blocked, bench thin, account reconnect / idle, setup incomplete (`dashboard.status_light`).
4. "What's happening" timeline: the next run with a live countdown, then each past run with what it posted, errors and notes (Today `timelineCard`; `runs.history`).
5. Next 24 hours schedule: each run time and which accounts the queue hands clips to, labelled as an estimate (Today `scheduleCard`; `schedule`).
6. Money picture: estimated pending, approved and at risk with a stage bar (Today and Earnings `moneyCard`; `money`).
7. Payout calendar: the day each batch of posts should pay (about 10 days after the link is pasted), plus "should have paid" (Money picture).
8. Today's posts per account with progress against the daily cap and the clips posted (Today and Accounts `todayPostsCard`).
9. Reel hero, countdown tiles and stat tiles kept; hero is the 3D clip reel (fx.js) with a 2D fallback.

## B. Campaign lifecycle (Money > Campaigns)
10. State chip per campaign: active, standby, paused, ended, blocked (from `campaign_state.*`; derived and marked "derived" when absent).
11. Priority rank badge and score on each campaign card.
12. Budget bar with a burn-rate projection: "~12 days of budget left at the current pace" (from budget history; says so when there is not enough).
13. Accounts serving the campaign, days of clips left (supply) and the plain-words reason for its state, on every card.
14. Switch log as a readable audit trail: "Tradever paused: budget almost gone → BILF promoted" (`lifecycle.switch_groups`).
15. Campaigns the autopilot knows but that have no brief file here get their own cards (`lifecycle.extra`).
16. The bench panel: healthy count against the minimum with a ring and the reason (`bench`).
17. "Join next" lead cards: Join button, Share, a copy-able message "I joined <name>: here are its rules" and the exact Rules-tab search words (AI, automat, tool, repurpos).

## C. Setup checklist (Today)
18. Progress ring card ("8/10 steps") at the top of Today until everything required is done, then it hides (`launch.checklist`).
19. Each step opens to the exact plain-English next step, with copy buttons for names, links and secret names (e.g. the TikTok username to create).
20. Manual steps can be ticked on this device; automatic steps show "the autopilot checks this by itself"; finished steps are folded away.

## D. Accounts (Money > Accounts)
21. Mode chip per account: warm-up (day N of 5 with dots), normal, slowed, cooling down, idle (`account_state.*`).
22. Health score 0-100, median recent views and the reason in plain words on each account card.
23. Per-account earnings estimate (net and net over 7 days) and the campaign it serves.
24. "Reconnect in Zernio" help block with three steps and the Zernio button when an account shows an error.
25. Add-account card: the steps plus the naming rule per campaign with copy-able example usernames (`account_help`).
26. Accounts that exist only in `account_state` are listed too, with zero stats.

## E. Content library (Clips)
27. Filters: status, kind (video / slideshow), platform, campaign, account, plus free-text search over title, hook, caption, account and why-chosen.
28. Sort by date, score, views, est. net, length; gallery, list and queue-order views.
29. List view with thumbnail, hook text, why it was chosen, status, platform and queue position per clip.
30. Held clips show the autopilot's reason and a plain explanation of what it means (`held_plain`).
31. Per-clip performance sparkline from the tracker's view history (list and clip sheet).
32. Slideshows show their deck angle; clip sheet adds queue position, share and "views over time".
33. Queue order view: exactly what posts next, to which account, when, and why that account.

## F. Insights (Insights tab)
34. Insight cards in plain sentences (best time, best day, best length, video vs slideshow, best account, best campaign, hook word), each with a confidence label ("only 3 posts so far: too early to trust").
35. The autopilot's own insight sentences shown beside them (`insights`).
36. A/B comparisons: video vs slideshow, short vs long, daytime vs evening, with a winner only when both sides have 3+ posts and a 15% gap.
37. Best-hours heatmap with the three strongest slots, length buckets and hook words (lazy-rendered).
38. Weekly report card: posts, views, estimated earnings against last week, best post and "what to try".

## G. Money tools (Money > Payouts, Earnings)
39. Payout log: type what Content Rewards paid (amount, date, campaign, note); saved on the device; delete with Undo.
40. Estimate vs paid per campaign and a "paid vs estimate" ratio; running total and this-month total.
41. Goal ring on paid-this-month against the existing monthly goal.
42. CSV export of posts and payouts (share sheet, download or copy).
43. "How close are we to the first payout" views-needed tracker kept on Earnings and Payouts.

## H. Runs & health (System > Runs & health)
44. Run history: duration, posted, errors, switches, queue size, notes and the clips each run posted (`runs.history`; falls back to the autopilot log).
45. Problems in plain words: each error explained with what to do and the right button (`errors_help`).
46. Memory size meter (state against the GitHub limit) and keys / connections status without ever showing secrets.
47. "Restart the autopilot" block with three steps and a one-tap GitHub Actions button; stale-run detection kept and re-judged on every view.

## I. Polish and accessibility
48. Pull to refresh, skeleton loaders (also for lazy sections), haptic taps and toasts (kept) plus a toast with Undo.
49. Swipe left / right between pages on the phone (ignored on anything that scrolls sideways).
50. Sticky "Copy next link" button on Submit with the live count; Submit stays the first and fastest page.
51. Share sheet for any link (per submitted link, leads, clips) with a copy fallback.
52. Empty states with a next step on every page (library, money, insights, runs, accounts, bench).
53. Light, dark and auto themes; eight accent colours; the 3D background is turned off in light.
54. Reduced motion respected; skip link, aria-pressed on every toggle, aria-current on the tab bar, 44 px targets, stronger contrast, focus rings.
55. Relative times ("in 2h 5m", "6 h ago"), thousands separators and K / M numbers everywhere.
56. Offline banner (and the service worker's last copy) when the phone has no connection.
57. Install help for the iPhone Home Screen (Settings, Help, tour) and an Install button where the browser offers one.
58. Keyboard shortcuts on the desktop: `/` or Ctrl+K search, `g` + `s t c i m p a r h` to jump, `r` reload, `n` copy next link.
59. Global command palette: pages, actions, clips, campaigns, accounts, leads, help and problems in one search.
60. Welcome tour, shown once (replay from Help or Settings).
61. "What's new" card on Today (dismissible) and in Help.
62. Help page: plain FAQ with search (how payouts work, why 10 days, what each light and state means, what to do when something is off).
63. Heavy sections render lazily when they come near the screen (Insights charts); the clip list is paged.
64. Printable weekly report page (Print / save as PDF; print stylesheet hides the app chrome).
65. Backup and restore of this device's local data (ticks, payout log, goal, look) from Settings.

## J. Demo and tests
66. `demo.py` fills every contract key with sample values of the same shapes: a campaign-switch story (AiXfunded paused, BILF promoted), account modes, a thin bench, 18 runs, the checklist; `--stale` (stuck autopilot), `--empty` (brand-new setup), `--preview` (hosted copy). The page says "Sample data".
67. Tests: `tests/test_dashboard_v4.py` (every new field, empty / hand-made / demo / hide_money, page file checks).
