## In one minute

- **Nothing the bot trades changed.** LIT replay 120/120 trades identical, the LiveBot check unchanged; every new block is
  OFF until the owner switches it on.
- **New alerts (on; each can be set to on / silent / off in the phone app):**
  1. **Anomaly:** a bad tick, a price spike or a price jump on the NinjaTrader 1m bars, or an entry sent 30+ s after its
     signal (normally ~3 s).
  2. **Feed frozen in a trade (critical):** LIT or account B holds a position and the 1m bars stopped for 3+ min. The push
     repeats every 10 min until you tap "Got it".
  3. **Drift:** live results below the backtest's expected range, for LIT and for account B separately. Below p5 = "investigate",
     below p10 = "watch" (once a week). Also slow routes or extra slippage in the fill audit.
  4. **Both accounts loss:** LIT + account B together at -$1,500 today or -$3,000 this week.
  5. **Rules changed:** the rules the PC bot trades changed. The push says what changed and which commit (who / why).
- **New lines in pushes you already get:** the 01:40 ET pre-session push now lists today's Tier-1 news, account B's room
  and any block that is on. The Sunday weekly push adds a self-review: drift per strategy, anomalies, rule changes.
- **Two blocks, both OFF** (they could cut trades; the owner's rule is 2-4 trades a week):
  - `anomaly_pause`: no new entry for 15 min after a spike or bad tick, and while the feed is frozen in a trade.
  - `combined_loss`: no new entry on either account once both together are at -$1,500 today or -$3,000 this week.
- **Restore:** `python -X utf8 -m engine.ops_checks --restore latest` shows what the newest backup would put back. Add
  `--yes` to apply it. It is refused while the bot runs or a trade is open, and the files it replaces are zipped first.
- **Where to see it:** phone System > **AI watch**. PC Modules > System > **AI watch** card (with the rule log and the switches).

## The audit (checked in the code, not only in the docs)

| # | What a serious bot has | Before today | Now |
|---|---|---|---|
| 1 | Drift detection: live vs backtest, per strategy, auto-alert | **partly.** LIT: fill audit nightly "differs" push (`engine/fill_audit.py`) and the expected-range band (`engine/health_band.py`, reports only, no push). Account B: none | **built**: drift push per strategy (LIT band, account B bootstrap, execution medians) |
| 2 | Anomaly: price spike / bad tick | **no.** Malformed bars are dropped silently (`clean_bars`), nothing pushes | **built** (alert on, pause OFF) |
| 3 | Anomaly: feed freezes mid-trade | **partly.** FEED STALE blocks *new* entries in an entry window; nothing says "your open trade has no data" | **built**: critical push, repeats until "Got it" |
| 4 | Anomaly: broker position differs from the bot | **yes** (guards reconcile + critical "Position mismatch", reconcile flatten) | unchanged |
| 5 | Auto-pause on anomalies | **no** | **built, OFF** (`anomaly_pause`) |
| 6 | Pre-session readiness push ~01:45 ET | **yes, mostly** (`engine/ops_checks` 01:40: server, bot, account, NinjaTrader, both feeds, internet, clock, disk, heartbeat). Missing: account B, today's news, which blocks are on | **built**: those three added (account B is a FIX row when its account has a problem) |
| 7 | End-of-day journal per strategy, chart + why / lesson | **LIT yes** (recap cards per trade with chart, why it entered, plan, lessons, `tools/recap.py`; day summary push). **Account B: no recap card** | open (see Next) |
| 8 | Weekly self-review live vs backtest, rule drift | **partly** (weekly push: trades, $, pace, PC health; recap weekly review) | **built**: self-review line (drift verdicts, anomalies, rule changes) |
| 9 | News / economic-calendar risk mode | **yes** (guard `news` OFF, LIT and account B; brief + timeline show news) | readiness push lists today's Tier-1 releases |
| 10 | Rule-change log: who / when / why | **no** (only commit titles of main on the dashboard) | **built**: `engine/rulelog.py` (git, key-level diffs) + runtime change push |
| 11 | Daily / weekly loss caps across both accounts | **no.** LIT: $1,000 soft daily loss; B: its own plan's daily lock; nothing adds them up | **built**: push on, block OFF (`combined_loss`) |
| 12 | Kill switch from the phone for both accounts | **yes.** HOLD TO KILL = FLATTENEVERYTHING + account B's own kill (`LiveBot.kill_switch` -> `acct_b.kill`) | unchanged |
| 13 | Data-quality monitor for the TradingView / NinjaTrader merge (Dec roll) | **yes** (`pcbars.merge_basis` back-adjusts and logs every shift; gap notes; Hub System data quality) | unchanged (the roll itself is still untested on a real install) |
| 14 | Latency monitor signal -> order -> fill | **partly** (fill audit median latency, reports only) | **built**: per-entry slow-route push + execution drift |
| 15 | Backup / restore of the bot state | **backup yes** (nightly zip, 14 days). **Restore: no**, and account B's state, the guards state and the pause file were not in the backup | **built**: restore (dry run, refusals, pre-restore copy) + those files backed up |
| 16 | Clock sync check | **yes** (guard 7, blocks entries at > 5 s) | unchanged |
| 17 | PC-vs-cloud same rules | **yes** (rules fingerprint, alerts_plus) | unchanged |
| 18 | Remote pause / stop entries | **yes** (phone remote "pause", entry pause file) | unchanged |

## What was built (files)

- `engine/ai_watch.py` - the watch. `tick(bot, now)` runs once per poll after routing (`LiveBot._alerts_tick`, the real bot
  only), never raises, writes `data/ai_watch.json` (gitignored). Pure checks: `bar_anomaly`, `freeze_check`,
  `latency_check`, `combined`, `boot_pct`, `drift_lit`, `drift_b`, `drift_exec`. Guard hooks `anomaly_problem` and
  `combined_problem` are called from `guards._owner_blocks`, which LIT and account B both use, only when switched on.
  - Spike = a 1m range above max(8 x the median of the last 60 bars, 60 pts). Jump = an open more than max(8 x median, 40 pts)
    from the previous close. Bad tick = high below low, high below the open / close, or a price of 0. A CPI minute can trip
    the spike alert (a real move looks like a spike); that is why the pause is OFF.
  - Drift for account B: its closed trades in R (P&L / (stop points x micros x $2 + $1.90 a micro)) against 3,000
    bootstrap draws of the same number of trades from its research run (`research/runs/acctb_<plan>_<sizing>.json`, 2026).
    It needs 5 trades before it judges. If the ATLAS tuning stores a new account B run under that id, drift uses it
    automatically.
- `engine/rulelog.py` - `python -X utf8 -m engine.rulelog build` writes `research/lab/rule_log.json` (26 commits so far:
  who, when, the commit title as the "why", each changed key). Runtime changes go to `logs/rule_changes.jsonl`.
- `engine/ai_api.py` - `GET /api/next/ai` (read-only) for the PC card.
- Wiring: `engine/alerts_plus.py` (5 new kinds; `freeze` critical through `pc_conditions`), `engine/heartbeat.py` +
  `engine/live_publish.py` + `tools/cloud_monitor.py` (an `ai` block next to `second`, trimmed first if live.json gets big),
  `engine/ops_checks.py` (account B row, readiness line, weekly line, restore, more backup files), `engine/guards.py`
  (two OFF keys), phone `tools/web_public/ai.js` + `alerts.js` (levels), PC `web_next/js/next/hubpages.js` (System card).
- Tests: `python -X utf8 -m tests.test_ai_features` (80 checks, fake bots, temp dirs, no network).

## Switches (exact)

| Switch | Default | Turn on |
|---|---|---|
| Anomaly pause | OFF | `live_model.json` (and `live_model_lit.json`) `"guards": {"anomaly_pause": true}`; minutes `"anomaly_pause_min": 15` |
| Both-accounts loss cap | OFF | `"guards": {"combined_loss": true, "combined_day_usd": 1500, "combined_week_usd": 3000}` |
| The 5 new alerts | on | phone Settings > Alert levels: `anomaly`, `freeze`, `drift`, `loss_cap`, `rules_change` (on / silent / off) |

Restart the bot after editing a model file (the guards config is read at each entry check; the rule-change push confirms
the PC picked it up).

## Safety checks run

`tests.test_lit_live --days --bot` (120/120 day-end replay identical; LiveBot check unchanged), `engine.ninjatrader
--selftest` 69/69, `tests.test_guards` 69/69, `tests.test_ops` 103/103, `tests.test_alerts_plus` 92/92, `tests.test_push`
41/41, `tests.test_pcdash_api` 130/130, `tests.test_no_yahoo` 23/23, `tests.test_live_publish` 44/44.

## Next (not built tonight)

- **Account B recap cards:** the LIT recap card (chart + why / plan / lessons) for each ATLAS trade. It needs the second
  strategies' setup drawing in `tools/recap.py`, which the ATLAS jobs own tonight.
- **Fill latency** (order -> fill), next to signal -> route. The fill time is in NinjaTrader's outgoing files, which the fill
  audit already archives.
- **Tune the spike threshold on real NinjaTrader 1m data** once a few weeks are archived (`data/nt_bars/`). Then decide
  whether `anomaly_pause` is worth switching on.
