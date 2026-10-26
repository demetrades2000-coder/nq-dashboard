## In one minute (owner summary)

- **What we already do as well as the paid tools, or better:** the backtest uses the live loop's own code (120 of 120 trades in
  2026 are identical), Monte Carlo eval odds, a fill audit (live against the backtest, the same idea as QuantConnect's
  "reconciliation"), 9 safety guards, routing to several accounts with their own sizes, recap cards, trade intel (~60 facts per
  trade), prop-firm and business tools, remote kill from the phone, and all of it free.
- **Where the best tools are ahead of us:**
  1. **Warning before the trade:** we push when the trade fills, not when the setup arms.
  2. **Alerts that cannot be missed:** PagerDuty-style repeat-until-you-tap-"got it", and alert levels (on / silent / off,
     as in freqtrade).
  3. **Someone watching the watchers:** nothing checks the cloud monitor itself, and nothing checks that the PC and the
     cloud run the same rules.
  4. **"Is the bot still working as expected?":** a live-vs-expected band (QuantConnect reconciliation, journal "health
     scores").
- **Build first (all small):** a "setup armed" push, a one-tap "I'm at the desk" check-in (MFFU requires the trader present
  and monitoring), a stale-cloud alarm, and a PC-vs-cloud rules fingerprint.
- **Never copy:** paid bridges or copiers, routing real orders from the cloud, nightly re-optimisation, DCA / grid / trailing
  exits, AI that writes the strategy, and selling signals.

## How this was done

Web searches on 2026-10-21 of vendor docs, help centres, release notes and reviews (sources after each claim; vendor pages
are marketing and were not tested by us). Then our own code was checked for each feature (`engine/*.py`, `tools/*.py`,
`tools/web_public/`, `web_next/js/next/`, `docs/*.md`, `research/writeups/INDEX.md`). "Value" means value for **this** owner: one
LIT strategy on NQ/MNQ, an MFFU Builder 50K eval through NinjaTrader, paper only from our side, and the owner mostly on a
phone. Effort: **S** about a day or less, **M** a few days, **L** a week or more.

## 1. Feature table (40 features)

| # | Feature | Who has it (source) | What it does | We have it? | Value | Effort |
|---|---|---|---|---|---|---|
| 1 | Manual approve / auto-submit switch | TradersPost ([glossary](https://docs.traderspost.io/docs/additional-information/glossary), [paper broker](https://traderspost.io/broker/traderspost)) | With auto-submit off, signals wait as "pending" until you tap approve or reject | **no** (on purpose: LIT routes ~3 s after the 1m close) | low | M |
| 2 | Trading windows, logging the signals they ignore | TradersPost ([trading windows](https://blog.traderspost.io/article/trading-windows-control-exactly-when-your-strategies-should-be-allowed-to-execute-trades), [ignored message](https://traderspost.io/reference/strategy-message/entry-order-ignored)) | Entries outside the window are logged as "ignored"; exits can still go through | **yes** (`engine/guards.py` calendar guard, `engine/lit_brief.py` log) | med | - |
| 3 | Per-account size multiplier (copier) | PickMyTrade ([multi-account](https://blog.pickmytrade.io/unlock-multi-account-trading-copy-trades-prop-firms-2025.md)), Replikanto ([review](https://www.quantvps.com/blog/replikanto-trade-copier)) | One signal goes to many accounts, e.g. 0.5x on an eval and 2x on a funded account | **yes**, better: each account sized from its own room (`engine/multi_account.py`) | high | - |
| 4 | Daily-loss lock that flattens and locks the account | CrossTrade Account Manager ([MFFU page](https://crosstrade.io/prop-firms/my-funded-futures.html), [Pro FAQ](https://crosstrade.io/answers/faq/crosstrade-pro)), Tradesyncer ([lockouts](https://help.tradesyncer.com/en/articles/12332177-risk-management-and-account-lockouts)), Tradovate ([post-trade risk](https://partner.tradovate.com/overview/prop-firm-management/risk-management/post-trade-risk), [daily loss](https://www.tradovate.com/daily-loss-limit)) | At the limit: flatten, cancel orders, no new orders until the next session | **yes** (`guards.py` daily_loss blocks new entries; the OCO bracket stays in NinjaTrader) | high | - |
| 5 | A second loss lock outside the bot (broker side) | Tradovate auto-liquidate ([docs](https://partner.tradovate.com/overview/prop-firm-management/risk-management/post-trade-risk)), NinjaTrader brokerage risk settings ([NexusFi](https://nexusfi.com/platforms-indicators/59736-new-risk-management-settings-built-ninjatrader.html)) | The broker or firm enforces the limit even if the bot is broken | **partly** (MFFU enforces its own limits; nothing on our Sim accounts) | med | S |
| 6 | Timed lockout ("no trading until ...") | Tradesyncer ([per session / 30 min / custom](https://help.tradesyncer.com/en/articles/12332177-risk-management-and-account-lockouts)), freqtrade `/stopentry` ([telegram docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/telegram-usage.md)) | Pause new entries for a session or until a date; open trades keep their rules | **partly** (`engine/remote_ctl.py` flatten = no entry today; stop / kill) | med | S |
| 7 | Position-mismatch alarm (account vs strategy) | TradeStation add-on ([Triage Position Mismatch](https://community.tradestation.com/discussions/DATA/20101203024053Triage%20Position%20Mismatch%20for%20TradeStation.pdf)) | Alert when the broker's position does not match the strategy's | **yes** (`guards.py` reconcile + 17:00 P&L reconcile) | high | - |
| 8 | "Exit, not reverse" when a position was closed by hand | TradersPost ([getting started](https://blog.traderspost.io/article/traderspost-platform-getting-started-guide)) | Avoids an accidental short when the trader closed the position by hand | **yes** (reconcile + one trade a day) | med | - |
| 9 | Phone chat commands (/status /forceexit /stopentry /profit /daily) | freqtrade ([telegram docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/telegram-usage.md)), Jesse ([PyPI](https://pypi.org/project/jesse/3.0.2/)) | Control and query the bot from the phone with one tap | **partly** (`remote_ctl.py`: copy, open GitHub, paste, commit = 3 steps; a reply comes back as a push) | high | M |
| 10 | Notification levels (on / silent / off, per type) | freqtrade ([telegram docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/telegram-usage.md)) | Choose which notices ring, which arrive silently, which are off; per exit reason | **no** (`engine/push.py`: one level for every notice) | med | S |
| 11 | Repeat until acknowledged, then escalate | PagerDuty ([escalation](https://support.pagerduty.com/v1/docs/escalation-policies), [ack timeout](https://community.pagerduty.com/ask-a-product-question-2/how-to-re-alert-on-acknowedged-alert-after-incident-remains-unresolved-708)) | A critical alert repeats until someone taps "acknowledge", and re-fires if it is still not fixed | **no** (each critical push is sent once) | high | M |
| 12 | Dead-man's switch for scheduled jobs | healthchecks ([docs](https://healthchecks.sre.cfainstitute.org/docs/monitoring_cron_jobs/)) | Raises an alarm when an expected "I ran" ping is late (with a grace period) | **partly** (the cloud alarms when the PC is silent; nothing alarms when the cloud is silent) | high | S |
| 13 | Status page + incident history | Upptime ([docs](https://upptime.js.org/docs)) | Free GitHub Actions + Pages status site: uptime per component, incidents opened and closed automatically | **partly** (phone health, PC uptime in `tools/hub_data.py`; no incident list) | med | M |
| 14 | Pre-trade heads-up (signal with entry / stop / target before the fill) | Trade Ideas Holly ([signals](https://www.trade-ideas.com/features/trading-signals/)), Capitalise.ai smart notifications ([FAQ](https://forex.com/en/help-and-support/capitalise-ai)) | You know a trade is coming and at what prices before it fills | **no** (pushes on fill only; the brief log shows "armed" only in the app) | high | S |
| 15 | Live vs backtest reconciliation curve | QuantConnect ([reconciliation](https://www.quantconnect.com/docs/v2/our-platform/live-trading/reconciliation)) | The live equity and an out-of-sample backtest of the same days on one chart; any gap is execution drift | **partly** (`engine/fill_audit.py` computes it per trade; no chart on the phone) | high | S |
| 16 | Custom fill and slippage models | QuantConnect LEAN ([reality modelling](https://www.quantconnect.com/docs/algorithm-reference/reality-modelling)) | Fees, slippage and fills modelled per asset; market impact is not modelled | **yes** (`engine/lit_fills.py`, 1 tick + $1.90, `lit-adv-audit-smt.md`) | med | - |
| 17 | Same code in backtest and live | Nautilus Trader ([overview](https://nautilustrader.io/docs/latest/concepts/overview/)), Jesse ([live docs](https://docs.jesse.trade/docs/livetrade)) | Research-to-live parity, no rewrite | **yes** (`engine/lit_live.py`, `tests/test_lit_live.py` 120/120) | high | - |
| 18 | Automatic look-ahead bias check | freqtrade `lookahead-analysis` ([docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/lookahead-analysis.md)) | Re-runs every signal on data cut at that signal and flags any signal that changes | **partly** (the live-loop replay is causal; `leakage-check.md`; research variants in `tools/runlib.py` are not checked automatically) | med | M |
| 19 | Results by entry tag / exit reason | freqtrade `backtesting-analysis` ([docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/advanced-backtesting.md)) | A table per entry tag and exit reason | **yes** (`tools/export_backtest.py` lessons, `tools/trade_intel.py`) | med | - |
| 20 | Monte Carlo: reshuffle / drop trades | NinjaTrader Strategy Analyzer ([forum](https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/106208-montecarlo-simulation-question)), Jesse ([PyPI](https://pypi.org/project/jesse/3.0.2/)), StrategyQuant ([tests](https://strategyquant.com/doc/strategyquant/types-of-robustness-tests-in-sqx/)) | Distribution of drawdown and outcome from shuffled or missing trades | **yes** (`engine/eval_mc.py`, `tools/lit_dash_data.py`, MFFU-specific) | high | - |
| 21 | Slippage / parameter randomisation, noise test on prices | StrategyQuant ([tests](https://strategyquant.com/doc/strategyquant/types-of-robustness-tests-in-sqx/)), Build Alpha noise test ([article](https://seeitmarket.com/?p=48626)) | Re-run on 1,000 noisy price copies and randomised costs; an overfit edge collapses | **partly** (old engine `stress-tests.md`; LIT has `tools/lit_sensitivity.py` heat maps but no noise or random-slippage run) | med | M |
| 22 | Walk-forward optimizer + sensitivity tab | TradeStation WFO ([help](https://help.tradestation.com/10_00/eng/TradeStationHelp/default/walk_forward_optimizer.htm), [sensitivity](https://help.tradestation.com/10_00/eng/tswfo/topics/sensitivity_analysis.htm)), QuantConnect ([WFO](https://www.quantconnect.com/docs/v2/writing-algorithms/optimization/walk-forward-optimization)) | Pick on window k, test on k+1, repeat; stability of the chosen inputs | **partly** (LIT: one H1 pick / H2 check split; old engine: rolling 6-month windows in `engine/robust.py`) | med | M |
| 23 | Parameter heat map (plateau or peak) | TradeStation ([sensitivity](https://help.tradestation.com/10_00/eng/tswfo/topics/sensitivity_analysis.htm)) | Grid of two inputs; broad ridges good, spikes bad | **yes** (`tools/lit_sensitivity.py` -> research/lab/sensitivity.json) | med | - |
| 24 | Bar / tick replay to practise or review | Sierra Chart ([review](https://optimusfutures.com/blog/sierrachart-platform-software-review-interview/)), TradeZella replay ([guide](https://www.tradezella.com/blog/backtest-with-tradezella)), NinjaTrader Playback | Step through a past session at any speed | **yes** (`tools/export_replays.py`, phone 3D candles replay, recap cards) | med | - |
| 25 | Trade journal with mistake / setup tags | TradeZella ([review](https://www.luxalgo.com/blog/tradezella-review-journaling-and-backtesting-platform/)), Edgewonk mental tags ([review](https://daytradingtoolkit.com/reviews/edgewonk-review)) | Tags such as "revenge trade" feed the stats | **partly** (`engine/lit_learn.py` cause codes for losses; no owner-action tags) | med | S |
| 26 | Discipline meter on the equity curve | Edgewonk Tiltmeter ([psychology](https://edgewonk.com/trading-psychology)) | A daily discipline score drawn over the P&L | **partly** (discipline log in `tools/hub_data.py` discipline_view; no score, no overlay) | med | S |
| 27 | One score for the account (win rate, PF, drawdown, consistency, recovery) | TradeZella Zella Score ([review](https://daytradingz.com/tradezella-review/)) | One number from 0 to 100 for how healthy the trading is | **partly** (many numbers, no single "health" read) | med | S |
| 28 | MFE / MAE, best-exit P&L, exit efficiency trend | Tradervue ([MFE/MAE](https://help.tradervue.com/article/3440-mfe-and-mae-calculations), [trend](https://www.tradervue.com/blog/trend-reports-mfe-mae-ratio)) | How much of the move was captured; ratio tracked over time | **partly** (MFE / MAE per trade in trade intel; no capture % or trend) | med | S |
| 29 | Prop-firm cost / payout / drawdown tracker | TradeZella Prop Firm Sync ([2026 ranking](https://www.tradezella.com/blog/best-trading-journal-2026)) | Total eval and reset spend, payouts, each account's drawdown and target, why it failed | **yes** (`tools/business.py`, `engine/biz_api.py`, `engine/eval_life.py`) | high | - |
| 30 | AI that answers questions about your own trades | TradeZella Zella AI ([review](https://www.luxalgo.com/blog/tradezella-review-journaling-and-backtesting-platform/)), TraderSync Cypher ([breakdown](https://www.luxalgo.com/blog/tradersync-trade-journal-breakdown/)), TrendSpider Sidekick ([llms.txt](https://trendspider.com/llms.txt)) | Chat that reads your journal and spots patterns | **partly** (Bot Brain `tools/web_public/jarvis_brain.js`, in progress, grounded on facts) | med | M |
| 31 | Proactive AI coach (unprompted feedback) | TraderSync Cypher Coach ([comparison](https://www.tradezella.com/vs/tradersync)) | Sends behaviour feedback without being asked | **partly** (weekly review in `tools/recap.py`, lesson line in the brief) | low | S |
| 32 | Plain-English strategy builder (AI) | Composer Trade with AI ([help](https://help.composer.trade/article/254-what-is-trade-with-ai)), Capitalise.ai ([FAQ](https://forex.com/en/help-and-support/capitalise-ai)), 3Commas AI assistant ([App Store](https://apps.apple.com/app/id6446649413)) | Describe a strategy in words; it is built and backtested | **no** (not wanted: the strategy is locked) | low | L |
| 33 | Strategy bank re-selected every night | Trade Ideas Holly ([guide](https://www.trade-ideas.com/hollyguide/print.html)) | Backtests every strategy overnight and trades only the ones that qualify | **no** (not wanted; see section 3) | low | L |
| 34 | Several suggested exits at different risk levels | Trade Ideas Holly ([signals](https://www.trade-ideas.com/features/trading-signals/)) | The trader picks the exit risk | **no** (one target by rule) | low | - |
| 35 | Verified public track record from live results only | Collective2 ([profile](https://uk.trustpilot.com/review/collective2.com?page=2), [Wealth-Lab link](https://www.wealth-lab.com/a/BuildNotesB40C2)) | Statistics from live fills only, no self-posted backtests | **partly** (the paper ledger and PC trades are kept apart from the backtest in trade intel; not public) | low | S |
| 36 | Kill switch on P&L % | Hummingbot ([kill switch](https://hummingbot.org/client/global-configs/kill-switch/)) | Stops the bot when profit or loss crosses a % | **yes**, in a safer form (guards + HOLD TO KILL + remote kill) | med | - |
| 37 | Visual dashboard: configs, backtests, logs of running bots | Hummingbot 2.0 ([release notes](https://hummingbot.org/release-notes/2.0.0/)), freqtrade FreqUI | One GUI to configure, backtest and watch | **yes** (`web_next/`, phone PWA `tools/web_public/`) | med | - |
| 38 | Protections: N stop-losses -> pause; max drawdown -> pause; cooldown | freqtrade ([protections](https://github.com/freqtrade/freqtrade/blob/develop/docs/includes/protections.md)) | Automatic pause after a run of stops or a deep drawdown | **yes** (weekly stop `wk_stop` half size; `wk_loss_usd` built, off; sizes instead of pauses, per owner rule) | med | - |
| 39 | Confirm-before-order safety switch for automated strategies | TradeStation ([automation help](https://help.tradestation.com/10_00/eng/TradeStationHelp/automated_execution/about_auto_execution_strategies.htm)) | Confirmations stay on unless you switch them off and accept a disclaimer | **yes**, stricter (a real account needs armed + LIVE phrase + `NINJATRADER_LIVE=1`; never auto-resumes: `engine/watchdog.py`) | high | - |
| 40 | Mobile app with positions, P&L and alerts | NinjaTrader mobile ([page](https://ninjatrader.com/platform/mobile)), Cryptohopper ([review](https://www.benzinga.com/money/cryptohopper-review/)), 3Commas (users report late notices: [App Store](https://apps.apple.com/app/id6446649413)) | Watch the account and get notices on the go | **yes** (PWA + `engine/live_publish.py` 60 s live feed + Web Push) | high | - |
| 41 | "Trader present" rule tooling for prop firms | MFFU via third-party guides: semi-automation OK only with the trader monitoring ([TradersPost guide](https://blog.traderspost.io/article/automate-my-funded-futures-with-traderspost), [Propvator](https://propvator.com/blog/my-funded-futures-automated-trading/), [CrossTrade](https://crosstrade.io/learn/prop-firm-ai-trading/myfundedfutures)) | Nobody automates it; the trader must be there | **partly** (`engine/golive.py` "Trader present" acknowledgment once; no per-session record) | high | S |
| 42 | Same rules everywhere (version / config fingerprint) | Implied by Nautilus / Jesse parity; standard ops practice | Every running copy states the code and settings it runs, and an alarm fires on a mismatch | **partly** (code version in `engine/dash_data.py` code_version; PC vs cloud `live_model.json` not compared) | high | S |

(42 rows: the brief asked for about 40.)

## 2. Top 15 to build, ranked by value for effort

Every item keeps the hard rules: paper only from our side, never arming anything, no paid service, official data only, no secrets in
the repo. All 15 explain or warn. None changes when the bot trades or how big. The one exception is #2's optional
"presence required" switch: it is off by default and could only ever block an entry, never add one.

### 1. "Setup armed" heads-up push (S, high)
**Owner sees:** a push the moment LIT places its 30-minute limit or starts waiting for the 1m CISD: "LONG setup armed · limit
21,452 · stop 21,410 (42 pt) · target 21,618 · ~6 MNQ · valid to 03:15". The entry push replaces it later (same tag as the
trade, so one notice per trade). If the setup expires with no fill: "setup expired, no trade".
**Data:** the LIT stage the live loop already has (`engine/lit_live.py` result: stage, limit, stop, target, valid-until),
the size from `engine/sizing.lit_qty`.
**Where:** a new `armed` kind in `engine/push.py`; PC side in `engine/live.py` (the routing hook), cloud side in
`tools/cloud_monitor.py`. Each is sent once and marked "sent" in the relay. Why: it gives the owner 5-30 minutes to be
at the desk before a fill. That is the point of MFFU's "trader present" rule, and Holly and Capitalise both treat the pre-trade
signal as the main product.

### 2. "I'm at the desk" check-in + presence log (S, high)
**Owner sees:** with the 01:40 ET "all green" notice and with every "setup armed" push, one big button in the app: **I'm
here**. The Today page shows "Present since 01:52 ET". The weekly review shows "present for 9 of 9 trades". When a setup
arms and there has been no check-in, the push says "no check-in yet: MFFU needs you watching".
**Data:** check-in time stamps. They are not secret, so the app can post them to the existing ntfy relay
(`tools/web_public/push_relay.json`). The PC and the cloud read them like the push subscriptions. A spoofed check-in only
changes a log line.
**Where:** `engine/push.py` (read the relay), `engine/ops_checks.py` (presession and weekly text), `engine/live_publish.py`
(show it), phone `tools/web_public/live.js`. Optional switch (OFF): `guards.presence_required`, which blocks a new entry
without a check-in in the last N hours. Off by default because it could cut trades (owner frequency rule). Why: MFFU allows
bots only with the trader monitoring ([TradersPost guide](https://blog.traderspost.io/article/automate-my-funded-futures-with-traderspost)),
and `engine/golive.py` asks this only once.

### 3. Watch the watcher: stale-cloud alarm (S, high)
**Owner sees:** a red banner in the app when the cloud monitor's last run is older than 45 minutes during market hours.
The PC pushes "Cloud monitor has not run for 52 min" once, then "recovered". The README gets a "last cloud run" line.
**Data:** the `dashboard` branch commit time. The PC reads it with the git credentials it already uses for the heartbeat,
like the healthchecks dead-man model ([docs](https://healthchecks.sre.cfainstitute.org/docs/monitoring_cron_jobs/)).
**Where:** a check in `engine/ops_checks.py --tick` (it already checks internet and NinjaTrader drops) and in
`engine/live_publish.py` (live.json gets `cloud_age_s`). Today only the cloud watches the PC (`pc_silent`). GitHub can
delay or skip scheduled runs, and nobody would notice.

### 4. PC-vs-cloud rules fingerprint (S, high)
**Owner sees:** one line on Today: "Same rules on PC and cloud ✓ (lit 7f3a, code 4dd7399)". When they differ, a push: "PC
runs different LIT settings than the cloud: be_off 1.25 vs 1.0", with the keys that differ.
**Data:** a short hash of `live_model.json` "lit" + "lit_sizing" + "guards" and the git commit, placed in the heartbeat and
in the cloud state.
**Where:** `engine/heartbeat.py` payload, `tools/cloud_monitor.py` compare, `engine/push.py` notice. Why: the paper ledger,
the shadow and the PC are only comparable when they run the same rules. Auto-update (`engine/autoupdate.py`) can leave the
PC behind main.

### 5. Critical alerts that repeat until acknowledged + three levels (M, high)
**Owner sees:** notices in three levels. **Critical**: FEED STALE in a session with a setup possible, reconcile mismatch,
guard blocked an entry, room below $400, PC silent, cloud stale, EVAL FAILED. A critical notice repeats every 10 minutes
until the owner taps **Got it** (at most 6 times) and fires again if the problem is still there 30 minutes later (the
PagerDuty "acknowledgement timeout", [source](https://community.pagerduty.com/ask-a-product-question-2/how-to-re-alert-on-acknowedged-alert-after-incident-remains-unresolved-708)).
**Normal**: entries and outcomes. **Quiet** (no sound): recap, day summary, eval timing. Settings has a per-kind switch:
on / silent / off, as in freqtrade ([docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/telegram-usage.md)).
**Data:** an alert id and an "acked" marker posted to the ntfy relay from the app.
**Where:** `engine/push.py` (level, repeat state), `engine/watchdog.py` and `engine/guards.py` (who raises critical),
`tools/web_public/sw.js` (tap = ack; iOS may hide action buttons, so the ack button lives in the app's Activity page:
[Apple forum](https://developer.apple.com/forums/thread/726793)).

### 6. "Within expected range" health card (M, high)
**Owner sees:** a card on Today and in the weekly review: "Last 20 trades: +6.1R, expected -2R to +19R (90% band) ✓".
Next to it: "losing streak 4: happens in 31% of 20-trade stretches", "trades this week 1, normal 2-4". The colour turns
amber below the 10th percentile and red below the 5th, with a push on red. The equity curve gets a shaded band ("cone") of
the backtest's range from the eval start.
**Data:** the 2026 trades of run `lit_live` (bootstrap the band from them), the cloud paper ledger and the PC trades
(trade intel already joins all three).
**Where:** new `engine/health_band.py` (pure function: trades -> band and percentiles), built in
`tools/build_web_dashboard.py`, cards in `tools/web_public/index.html` and `web_next/js/next/today.js`. It reports only and
never sizes. This is the QuantConnect reconciliation idea ([docs](https://www.quantconnect.com/docs/v2/our-platform/live-trading/reconciliation))
turned into a plain answer to the owner's daily question: is it broken, or just a normal bad week?

### 7. Live-vs-backtest chart from the fill audit (S, med-high)
**Owner sees:** in Trades -> Execution, two lines since the eval start: "what the bot really made" and "what the backtest
made on the same days". The gap is split into slippage, missed trades (with reasons: PC off, feed stale, guard) and extra
trades.
**Data:** `engine/fill_audit.py` already computes all of it per day.
**Where:** export in `tools/fill_audit.py` -> data.json, a chart in the phone app (`tools/web_public/tradechart.js` style
SVG) and on the PC Data page.

### 8. One-tap remote commands from the phone, signed (M, high)
**Owner sees:** the Remote page buttons (Status, Flatten, Stop, KILL, Pause until tomorrow) work in **one tap** (hold to
kill), with the answer as a push within ~60 s. There is no GitHub editor and no paste. Pairing is a one-time step through
today's GitHub file.
**Data:** the phone makes a key pair in the browser (WebCrypto, non-exportable). The public key goes to the PC once through
the existing `control/command.json` route. Later commands are posted to the ntfy relay, signed. The PC verifies the
signature, the 15-minute expiry and the one-time id. No secret is in the repo or in chat; the private key never leaves the
phone.
**Where:** `engine/remote_ctl.py` (a second input channel, same command set and same refusals: `start` stays Sim / paper
only), `tools/web_public/more.js` Remote page. Add `pause` (= freqtrade `/stopentry`, Tradesyncer session lockout): no
new entries until a given day; open trades keep their rules.

### 9. Status page with incident history (M, med)
**Owner sees:** System -> Status: one row per part (PC bot, NinjaTrader 5m feed, 1m feed, 1m-open file, heartbeat, live
feed, cloud monitor, push relay), each with today's state and 30 days of uptime squares. Below it an incident list: "Tue
03:12-03:41 NinjaTrader feed stale (29 min), 0 setups missed".
**Data:** the events `engine/ops_checks.py` and `engine/watchdog.py` already detect (internet drop, NinjaTrader disconnect,
stale feed, poll overdue). Append them to `data/incidents.jsonl` and push a summary with the heartbeat.
**Where:** `engine/ops_checks.py`, `tools/hub_data.py` system_view, phone System page. The pattern is Upptime
([docs](https://upptime.js.org/docs)), with no extra Actions minutes.

### 10. Bot adherence score (S-M, med)
**Owner sees:** a weekly "hands-off" score of 100: minus points for a manual trade in the bot's account, a manual close, the
bot stopped in session, a setting changed mid-week, or a missed check-in. It is drawn over the equity curve, Edgewonk
Tiltmeter style ([psychology page](https://edgewonk.com/trading-psychology)), with the week's notes.
**Data:** the discipline log (`tools/hub_data.py` discipline_view), reconcile events (`engine/guards.py`), remote-control log,
check-ins (#2).
**Where:** `tools/hub_data.py`, the weekly review in `tools/recap.py`. For a bot trader, "discipline" means "let it run".

### 11. Exit efficiency and giveback (S, med)
**Owner sees:** in Trade intel and on each recap card, "captured 62% of the best move (MFE 3.9R, got 2.4R)". For losses: "was
+0.8R before the stop". A monthly trend line of capture %. It explains why BE / t_check / 8R behave as they do; it is not a
rule.
**Data:** MFE / MAE are already in `tools/trade_intel.py`; add capture = R / MFE and heat-before-BE.
**Where:** `tools/trade_intel.py`, `web_next/js/next/intel.js`, `tools/web_public/intel.js`. The idea is Tradervue's
([MFE/MAE](https://help.tradervue.com/article/3440-mfe-and-mae-calculations), [trend](https://www.tradervue.com/blog/trend-reports-mfe-mae-ratio)).

### 12. Robustness card for the live LIT (M, med)
**Owner sees:** one card in the Lab: "Live LIT on 2026: noise test 82% of 200 noisy copies still profitable; random slippage
0-3 ticks keeps 78% of net; dropping 15% of trades at random keeps PF > 2 in 95% of runs".
**Data:** 2026 5m + 1m bars, the live params. The noise test adds small random offsets to the bars, StrategyQuant / Build
Alpha style ([SQX](https://strategyquant.com/doc/strategyquant/types-of-robustness-tests-in-sqx/), [noise test](https://seeitmarket.com/?p=48626)).
**Where:** new `tools/lit_robust.py` using `tools/runlib.py` (`rl.replay`, `rl.save`, so every run is stored) and a write-up in
`research/writeups/`. It is honest evidence of how fragile the strategy is, and changes nothing live.

### 13. Monthly out-of-sample scoreboard (M, med)
**Owner sees:** a table with one row per month since the LIT lock: what the backtest expected (H1 rate), what the paper and PC
bots did, and what the replay of those exact days did. Under it, an anchored walk-forward of 2026: pick on months 1..k, score
month k+1, so the H1/H2 check becomes 9 small checks.
**Data:** runs `lit_live`, the ledgers, `tools/lit_sensitivity.py` grids per window.
**Where:** a new mode in `tools/runlib.py` (or `tools/lit_walkforward.py`), shown in the Lab. The pattern is the TradeStation
WFO ([help](https://help.tradestation.com/10_00/eng/TradeStationHelp/default/walk_forward_optimizer.htm)).

### 14. Automatic look-ahead check on research runs (M, med)
**Owner sees:** each stored run gets a badge in the Lab, "look-ahead check ✓ (120 signals, 0 changed)" or "✗ 3 signals
changed".
**Data:** for each entry in a run, re-run `engine/lit.py` run_x on bars cut at the decision time and compare.
**Where:** `tools/runlib.py` `save()` hook (sampled, about 30 signals, to keep it quick), the badge in `engine/lab_scope.py` /
Lab. freqtrade ships this as `lookahead-analysis` ([docs](https://github.com/freqtrade/freqtrade/blob/develop/docs/lookahead-analysis.md)).
The live loop is already causal; the risk is in new research options.

### 15. "Why no trade today?" answered from facts (S-M, med)
**Owner sees:** on a no-trade day, Today shows (and the Bot Brain answers): "No trade: London swept PDL at 03:10 but the
displacement was 0.6 ATR (needs 0.8). NY open: no LIT level within reach. Nothing armed." On a blocked day: "Setup at 09:41
blocked: FEED STALE 11 min".
**Data:** the brief log (`engine/lit_brief.py` log: armed / rejected and the rule), guard blocks, fill_audit missed trades.
**Where:** `tools/web_public/jarvis_brain.js` intent + a card in `tools/web_public/index.html`. The facts already exist; this
gives them one answer, as the journal AIs (Zella AI, Cypher) do, with no LLM needed.

## 3. Things others do that we should NOT copy

| What | Who | Why not |
|---|---|---|
| Paid bridges, copiers and journals (TradersPost, PickMyTrade ~$50/mo, CrossTrade Pro $49/mo, Tradesyncer from $49/mo, Replikanto remote credits, TradeZella, TraderSync, Edgewonk) | [TradersPost](https://traderspost.io/broker/traderspost), [PickMyTrade](https://propfirmmap.com/tools/pickmytrade), [CrossTrade](https://crosstrade.io/webhook-automation), [Tradesyncer](https://tradesyncer.com/risk-management) | **No paid services.** We already have the free equivalent for everything we need: `multi_account.py`, guards, recap, trade intel, business tools. |
| Routing real orders from the cloud ("rules even when your PC is off") | [Tradesyncer](https://tradesyncer.com/risk-management), PickMyTrade cloud | It needs broker credentials in a cloud service, which breaks the "paper only, never arm" and "no secrets" rules. MFFU also wants the trader present. Our cloud stays paper. |
| Auto-resume or "set and forget" on a real account | 3Commas / Cryptohopper style "runs 24/7" ([review](https://www.benzinga.com/money/cryptohopper-review/)) | Against MFFU (trader present) and our rule. `engine/watchdog.py` already refuses to auto-resume anything that can place real orders. Keep it. |
| Manual approve-per-trade as the default | TradersPost auto-submit off ([glossary](https://docs.traderspost.io/docs/additional-information/glossary)) | LIT routes about 3 s after the 1m CISD close, and most trades enter at 02:00-08:00 ET. Waiting for a tap would miss or worsen fills. Use the "armed" heads-up + check-in (#1, #2) instead. |
| Nightly re-selection or re-optimisation of strategies | Trade Ideas Holly ([guide](https://www.trade-ideas.com/hollyguide/print.html)), TrendSpider AI Strategy Lab ([review](https://daytradingtoolkit.com/reviews/trendspider-review)) | It is curve fitting on a thin sample. It breaks the LIT rule (pick on 2026 H1, check on H2, locked). `engine/lit_learn.py` is the bounded version (0.5-1.25x, explain-only) and is enough. |
| AI that writes the strategy from plain English | Composer ([help](https://help.composer.trade/article/254-what-is-trade-with-ai)), Capitalise.ai, 3Commas AI | The strategy is locked and owner-defined. Generated strategies invite overfitting, and their backtests often ignore costs: Capitalise's backtest ignores commissions and uses a composite feed ([page](https://forex.com/en-us/trading-tools/capitalise-ai/backtesting)), against our "futures data, money with costs" rule. |
| Composite or retail data feeds for testing | Capitalise.ai composite feed (above) | **Futures data only** (CME NQ1! / NinjaTrader MNQ); no CFD. |
| DCA "safety orders", grids, trailing stops, several exit levels | 3Commas ([G2](https://www.g2.com/products/3commas)), Cryptohopper ([review](https://www.benzinga.com/money/cryptohopper-review/)), Holly exits ([signals](https://www.trade-ideas.com/features/trading-signals/)) | Against the owner's principles: the stop at the sweep extreme, one clear target banked at 8R, size follows the stop. DCA adds to losers, and an MFFU daily loss can be hit fast. Trailing and partials were tested and rejected (`management.md`, `lit-adv-management.md`). |
| A P&L % kill switch that stops on noise | Hummingbot (its docs warn price moves alone can trip it: [kill switch](https://hummingbot.org/client/global-configs/kill-switch/)) | Our guards block on clear facts (daily loss, room, feed, clock, reconcile), and the owner rule prefers size changes over pauses. |
| Selling or publishing signals, copy-trading subscribers | Collective2 ([profile](https://uk.trustpilot.com/review/collective2.com?page=2)) | Not the goal; prop-firm rules on shared or copied signals vary ([CrossTrade on MFFU](https://crosstrade.io/learn/prop-firm-ai-trading/myfundedfutures)); and the eval account's numbers are private. |
| Cross-firm copiers that work technically but break firm rules | PickMyTrade compliance caveat ([propfirmmap](https://propfirmmap.com/tools/pickmytrade)), Tradovate Group Trade limits ([CrossTrade](https://crosstrade.io/blog/tradovate-group-trade-vs-trade-copier)) | Only route to accounts whose rules were checked (`research/props/firms.json`, `lit-funded-firms.md`). "It connects" does not mean "it is allowed". |
| Telegram / Discord bots for alerts | freqtrade, Jesse, QuantConnect ([notifications](https://www.quantconnect.com/docs/v2/our-platform/live-trading/notifications)) | Off by the owner's choice (`LE_ALERTS_CHAT=1` only), and they need bot tokens. Our Web Push + ntfy relay is free and keyless on the phone. |
| AI auto-tagging or a "coach" that changes size or skips trades | TraderSync Cypher Coach ([comparison](https://www.tradezella.com/vs/tradersync)) | Explanations only. Any trading change goes through the research run library and the owner's approval. |

## Caveats

- Most competitor claims come from vendor pages or vendor-written comparisons (TradeZella and CrossTrade both review their
  rivals). Prices and tiers conflict between sources. None of these tools was tested by us.
- The MFFU automation wording comes from third-party guides; the MFFU help centre was not found in the search. Recheck it
  with `tools/prop_watch.py` before relying on the wording.
- Whether iOS Home Screen web apps show notification action buttons is unclear ([Apple forum](https://developer.apple.com/forums/thread/726793)),
  so every "tap to acknowledge" also needs a button inside the app.
