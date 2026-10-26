## The short answer

You asked for a higher win rate and more trades. I tested 50 versions of the bot. Every one is an exact replay of the live
loop on real CME NQ futures data (TradingView NQ1!, 5-minute bars, nearly 23 hours a day), with today's sizing,
commissions and slippage included. Each version is judged on 2026 and on 2021-25 separately.

- **More trades: no.** The same setup traded in London, Asia, pre-open, lunch or late afternoon loses money in 2021-25
  every time. The losses run from -$2.6k to -$14.4k on its own. Adding any window to today's hours, or allowing a second
  trade a day, makes 2021-25 worse and fails more evals. This holds even at a quarter of the size.
- **Higher win rate: possible, but it costs money.** Taking half the position off early lifts the win rate from 1 in 4 to
  1 in 3 (up to 44%), but cuts profit by $5-9k in 2026 and $9-16k in 2021-25. Filters that raise the win rate
  (depth limit, trading with the 1H/4H flow) take 2026 below 2 trades a week.
- **One small change helps both periods:** after a very deep sweep (price ran 3.5+ ATR past the pool, about 1 trade in 5),
  trade at **half size**. No trade is skipped. Those trades win only 8% (2026) and 18% (2021-25) of the time.

## Today's strategy (the yardstick)

| | 2026 | 2021-25 |
|---|---:|---:|
| Trades a week | 2.16 | 3.17 |
| Win rate | 25.8% | 21.1% |
| Profit factor | 3.94 | 1.27 |
| Net | +$20,487 | +$16,379 |
| Net per month | +$2,088 | +$321 |
| Max drawdown | -$2,249 | -$9,265 |
| Eval passed / failed within 1 month | 34.0% / 0.0% | 8.8% / 5.2% |
| Eval pass rate (passed out of decided, 1 month) | 100% | 63% |

"Eval pass rate" = of the evals that were decided within a month, how many passed. One eval is started on every
session of the period.

## A. More trades: new trading windows

The engine already sees the overnight bars (the data has 18:00-17:00 ET bars). New engine options, all off by default,
let it trade there: `session_clock` (an evening window counts as part of the next trading day), `arm_windows` (when sweeps
may start a setup), `max_trades_window` (1 trade per window), `stop_after_loss`, and `eth_slip_ticks` (extra slippage
outside 09:30-16:00). The pools are the ones that exist at that hour: Asia high/low (20:00-24:00), London high/low,
the overnight high/low, the prior day high/low, 1H and 15-minute swings. Flat time stays 15:55.

### Each window on its own (same rules, 1 trade a day)

| Window | 2026 trades/wk | win | PF | net ($/mo) | 1-mo pass/fail | 2021-25 trades/wk | win | PF | net ($/mo) | 1-mo pass/fail (rate) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Today: 09:30-11:30 + 13:30-15:30** | 2.16 | 25.8% | 3.94 | +$20,487 ($2,088) | 34.0 / 0.0 | 3.17 | 21.1% | 1.27 | +$16,379 ($321) | 8.8 / 5.2 (63%) |
| London 02:00-05:00 | 3.01 | 16.9% | 0.54 | -$4,819 (-$491) | 0.0 / 5.8 | 3.27 | 17.7% | 0.83 | -$13,868 (-$272) | 8.7 / 18.3 (32%) |
| Pre-open 08:00-09:30 | 1.09 | 11.1% | 0.63 | -$2,031 (-$207) | 0.0 / 0.0 | 1.41 | 17.8% | 0.68 | -$9,507 (-$186) | 0.0 / 4.3 (0%) |
| Lunch 11:30-13:30 | 1.31 | 22.2% | 1.24 | +$771 ($79) | 0.0 / 0.0 | 2.01 | 20.0% | 0.74 | -$8,663 (-$170) | 0.0 / 3.7 (0%) |
| Late PM 15:30-15:45 | 0.15 | 50.0% | 0.81 | -$54 (-$6) | 0.0 / 0.0 | 0.30 | 35.4% | 0.49 | -$2,596 (-$51) | - |
| Asia 19:00-22:00 | 2.65 | 15.6% | 1.44 | +$4,384 ($447) | 4.4 / 1.5 | 2.52 | 16.9% | 0.71 | -$14,418 (-$282) | 5.7 / 7.6 (43%) |

London and Asia give plenty of setups (about 3 a week), but they win only 1 in 6. Overnight moves are smaller and
choppier, so a sweep and reclaim there is more often noise than a real stop run. Late PM has almost no setups before
the 15:55 flat time.

**Thin overnight book (+1 tick extra slippage outside RTH):** London 2021-25 goes from -$13.9k to -$19.8k, pre-open from
-$9.5k to -$9.9k, Asia from -$14.4k to -$13.5k. Asia barely changes because most of its exits are target limits or
happen after 09:30. Realistic overnight costs make bad windows worse.

### Added to today's hours

Three ways to add a window: (1) still 1 trade a day, first setup wins; (2) up to 2 a day, 1 per window, a second only
if the first did not win (engine default); (3) up to 2 a day, 1 per window, whatever the first did. The daily loss stop
($600) still ends the day after a full loser.

| Added window, rule | 2026 trades/wk | win | PF | net | 1-mo pass/fail | 2021-25 trades/wk | win | PF | net | max DD | 1-mo pass/fail (rate) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Today** | 2.16 | 25.8% | 3.94 | +$20,487 | 34.0 / 0.0 | 3.17 | 21.1% | 1.27 | +$16,379 | -$9,265 | 8.8 / 5.2 (63%) |
| London, 1/day | 3.83 | 18.4% | 0.55 | -$7,249 | 0.0 / 26.7 | 4.31 | 18.3% | 1.01 | +$816 | -$8,496 | 10.4 / 11.6 (47%) |
| London, 1/window | 5.02 | 20.8% | 1.29 | +$6,668 | 24.3 / 19.4 | 6.03 | 18.8% | 1.05 | +$6,450 | -$17,464 | 17.7 / 21.0 (46%) |
| London, 1/window, any | 5.19 | 20.6% | 1.11 | +$2,700 | 12.1 / 27.7 | 6.42 | 18.9% | 1.08 | +$11,044 | -$17,552 | 16.4 / 20.5 (44%) |
| Pre-open, 1/day | 2.79 | 20.9% | 2.55 | +$16,225 | 26.7 / 1.5 | 3.58 | 18.5% | 0.77 | -$17,252 | -$22,375 | 5.7 / 15.5 (27%) |
| Pre-open, 1/window, any | 3.40 | 20.0% | 2.37 | +$17,931 | 33.5 / 2.4 | 4.87 | 19.7% | 0.86 | -$14,164 | -$19,600 | 6.4 / 19.4 (25%) |
| Lunch, 1/day | 2.65 | 26.6% | 3.42 | +$23,394 | 44.2 / 0.0 | 3.74 | 20.8% | 1.04 | +$2,984 | -$7,059 | 7.3 / 9.2 (44%) |
| Lunch, 1/window, any | 3.50 | 24.3% | 2.74 | +$21,110 | 32.5 / 5.8 | 5.19 | 20.8% | 0.97 | -$3,285 | -$11,050 | 6.3 / 15.2 (29%) |
| Late PM, 1/day | 2.21 | 25.3% | 3.46 | +$19,197 | 30.1 / 0.0 | 3.26 | 21.1% | 1.21 | +$13,531 | -$10,160 | 8.8 / 6.8 (56%) |
| Asia, 1/day | 3.76 | 18.7% | 1.74 | +$12,027 | 15.5 / 18.9 | 4.00 | 18.8% | 0.84 | -$13,093 | -$16,393 | 6.6 / 16.7 (28%) |
| Asia, 1/window, any | 5.00 | 19.4% | 2.21 | +$22,157 | 31.6 / 11.2 | 5.79 | 19.9% | 0.96 | -$4,159 | -$15,346 | 10.1 / 20.6 (33%) |

All 15 combinations (the middle rule for each window is in the run library) make less money than today in 2021-25.
Five beat today in 2026 (lunch in all three versions, Asia with 1 per window), so they look good on this year alone. The
best of them, **lunch with 1 trade a day** (+$2.9k, evals passed within a
month 44% instead of 34%), costs **-$13.4k in 2021-25** and doubles the failed evals there. It is the same story as the
wider windows tested earlier (`tim_ext`).

Split by window inside the "any" runs, the new windows themselves are the losers. In 2021-25: London -$2.1k on 702 trades
(win 16%), Asia -$16.1k on 540 (12%), pre-open -$13.8k on 273 (15%), lunch -$10.8k on 340 (18%). Meanwhile the NY trades
keep making money.

### A second trade inside today's hours

| Rule | 2026 trades/wk | win | PF | net | 1-mo pass/fail | 2021-25 trades/wk | win | PF | net | max DD | 1-mo pass/fail (rate) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Today (1 a day)** | 2.16 | 25.8% | 3.94 | +$20,487 | 34.0 / 0.0 | 3.17 | 21.1% | 1.27 | +$16,379 | -$9,265 | 8.8 / 5.2 (63%) |
| 2 a day, 2nd after a non-win | 2.55 | 23.8% | 3.24 | +$19,082 | 30.1 / 0.0 | 4.03 | 21.0% | 1.06 | +$4,896 | -$13,066 | 8.8 / 16.3 (35%) |
| 2 a day, 2nd only after a win | 2.40 | 25.3% | 3.59 | +$20,048 | 31.1 / 0.0 | 3.61 | 20.8% | 1.11 | +$7,972 | -$11,183 | 7.9 / 7.3 (52%) |
| 1 AM + 1 PM | 2.43 | 24.0% | 3.52 | +$19,178 | 30.1 / 0.0 | 3.93 | 21.5% | 1.07 | +$5,856 | -$10,683 | 9.0 / 16.3 (36%) |
| 2 a day, 2nd at quarter size | 2.55 | 23.8% | 3.68 | +$19,815 | 30.1 / 0.0 | 4.03 | 21.0% | 1.05 | +$3,506 | -$11,808 | 5.6 / 7.4 (43%) |
| 2nd after a win, half size | 2.40 | 25.3% | 3.75 | +$20,085 | 31.1 / 0.0 | 3.61 | 20.8% | 1.12 | +$8,205 | -$10,082 | 6.2 / 5.7 (52%) |

The first good setup of the day is the best one. Later setups on the same day are weaker, and even a small size does not
save them. One reason: every extra losing trade also counts in the cold-streak filter (the last 15 trades), so it pushes
the good NY trades down to quarter size. London at a quarter size is the clearest case: London itself loses little, but
2026 falls from +$20.5k to +$8.8k because the NY trades get cut.

**Verdict A:** keep today's two windows and 1 trade a day. More trades a week does not come from more hours with this
model.

## B. Higher win rate

The bot wins about 1 trade in 4 and makes its money on a few big winners (+2.2R average win against -0.5R average loss).
Every rule that wins more often does it by cutting those big winners or by trading less.

| Idea | 2026 trades/wk | win | PF | net | 1-mo pass/fail | 2021-25 trades/wk | win | PF | net | max DD | 1-mo pass/fail (rate) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Today** | 2.16 | 25.8% | 3.94 | +$20,487 | 34.0 / 0.0 | 3.17 | 21.1% | 1.27 | +$16,379 | -$9,265 | 8.8 / 5.2 (63%) |
| Half off at the first pool on the way (new: pool-based) | 2.16 | 33.7% | 3.18 | +$15,141 | 28.2 / 0.0 | 3.17 | 31.1% | 1.08 | +$4,463 | -$6,626 | 6.9 / 3.5 (66%) |
| ... same, stop not moved after the partial | 2.16 | 33.7% | 3.18 | +$15,141 | 28.2 / 0.0 | 3.17 | 31.1% | 1.12 | +$7,193 | -$6,556 | 6.9 / 3.5 (66%) |
| Half off at 1R (the old idea) | 2.16 | 43.8% | 2.72 | +$11,812 | 16.5 / 0.0 | 3.17 | 36.2% | 1.00 | +$267 | -$8,553 | 3.9 / 4.8 (45%) |
| Limit entry at the middle of the gap | 1.63 | 9.0% | 0.55 | -$3,007 | 0.0 / 0.0 | 2.65 | 18.1% | 1.31 | +$27,543 | -$15,583 | 16.5 / 20.1 (45%) |
| Limit entry at the gap edge, 1 hour | 1.80 | 10.8% | 2.69 | +$10,612 | 18.9 / 0.0 | 2.91 | 17.8% | 1.28 | +$22,185 | -$9,935 | 13.8 / 14.6 (49%) |
| Gaps of 6+ points only | 2.14 | 20.5% | 2.48 | +$9,663 | 16.0 / 0.0 | 3.09 | 19.6% | 1.00 | +$79 | -$11,090 | 5.7 / 7.4 (44%) |
| Gaps of 10+ points only | 2.21 | 16.5% | 1.14 | +$1,236 | 9.7 / 0.0 | 3.13 | 17.9% | 0.88 | -$8,283 | -$14,205 | 7.1 / 12.6 (36%) |
| Skip sweeps deeper than 3.5 ATR | 1.89 | 28.2% | 4.18 | +$19,400 | 33.0 / 0.0 | 2.64 | 22.1% | 1.34 | +$19,409 | -$8,280 | 10.5 / 7.2 (59%) |
| Skip sweeps deeper than 2.7 ATR | 1.67 | 26.1% | 3.95 | +$16,897 | 28.6 / 0.0 | 2.36 | 21.9% | 1.15 | +$7,315 | -$5,723 | 6.4 / 4.9 (57%) |
| Sweep depth 0.5-3 ATR only | 1.26 | 26.9% | 3.81 | +$12,887 | 25.7 / 0.0 | 2.08 | 22.0% | 1.19 | +$8,882 | -$5,854 | 6.7 / 2.9 (70%) |
| Only with the 4H order flow | 0.97 | 17.5% | 2.54 | +$3,846 | 9.7 / 0.0 | 1.67 | 23.2% | 1.12 | +$4,146 | -$5,235 | 3.6 / 0.7 (84%) |
| Only with the 1H order flow | 1.04 | 20.9% | 3.43 | +$7,283 | 17.0 / 0.0 | 1.56 | 21.3% | 1.34 | +$9,002 | -$6,496 | 6.1 / 0.0 (100%) |
| Only with the 1H structure | 1.17 | 25.0% | 3.94 | +$7,312 | 11.2 / 0.0 | 1.81 | 21.1% | 1.14 | +$4,742 | -$6,121 | 3.9 / 0.7 (85%) |
| **Half size after a sweep 3.5+ ATR deep** | 2.16 | 25.8% | **4.11** | **+$20,780** | 34.0 / 0.0 | 3.17 | 21.1% | **1.32** | **+$17,850** | **-$7,544** | 9.0 / **3.5** (72%) |

What each line means:

- **Partials** (take half off early). The new angle, banking half at the first liquidity pool between entry and target,
  lifts the win rate by 8-10 points but leaves less on the big runners. 2026 -$5.3k, 2021-25 -$9.2k to -$11.9k. The 1R
  partial wins 44% of the time and makes nothing in 2021-25. A higher win rate here means smaller winners, not more
  money.
- **Breakeven earlier or later:** already tested in full (`management.md`). Breakeven at +0.75R, +1.25R, +1.5R, +2R and
  never all lose money in 2021-25. Breakeven exits count as small losers after costs, so an earlier breakeven does not
  raise the win rate either. Not redone.
- **Limit entry on the pullback into the gap** (better price, fewer fills). The win rate falls instead of rising (9-11% in
  2026). The trades that never pull back are the big winners, and the limit misses them. 2021-25 makes more, but 2026
  drops under 2 trades a week and loses up to $23k. Same verdict as the earlier test (`exec_retest`).
- **Bigger gaps only.** The opposite of what was hoped: small gaps (under 6 points) are the best triggers. Requiring
  bigger ones costs $10-19k in 2026.
- **Displacement size:** the screen of the 768 trades shows no pattern that holds in both periods. Strong-body triggers win
  a bit more often but make less money in 2026. Not worth an engine filter.
- **Sweep depth** is the one feature with the same shape in both periods. Medium sweeps (1-2.7 ATR past the pool) win
  37% (2026) / 23% (2021-25). Very deep ones (3.5+ ATR) win 8% / 18% and lose money (2026 -$450 on 13 trades, 2021-25
  -$4,100 on 155). Skipping them gives the best win rate of all (28.2% / 22.1%) and +$3.0k in 2021-25, but 2026 falls to
  1.89 trades a week and -$1.1k. So use size instead of skipping (last line).
- **1H/4H direction filters** halve the trades (about 1 a week) and earn far less. Rejected before as score points
  (`bias-filters.md`) and confirmed here as filters.
- **SMT with ES:** ES 5-minute data only starts in April 2025, so it cannot be judged on 2021-25. It did not separate
  trades in `cross-market-context.md`. Not redone.

### The one candidate: half size after a very deep sweep

Rule: when the sweep ran 3.5 x ATR(15) or more past the first pool it took (`depth_atr` in the plan, known at entry),
trade at half size. Every trade is still taken, so trades a week do not change.

| | 2026 today | 2026 new | 2021-25 today | 2021-25 new | 5 years today | 5 years new |
|---|---:|---:|---:|---:|---:|---:|
| Trades a week | 2.16 | 2.16 | 3.17 | 3.17 | 3.0 | 3.0 |
| Win rate | 25.8% | 25.8% | 21.1% | 21.1% | 21.6% | 21.6% |
| Profit factor | 3.94 | 4.11 | 1.27 | 1.32 | 1.54 | 1.62 |
| Net | +$20,487 | +$20,780 | +$16,379 | +$17,850 | +$36,866 | +$38,630 |
| Net per month | +$2,088 | +$2,118 | +$321 | +$350 | +$606 | +$635 |
| Max drawdown | -$2,249 | -$2,043 | -$9,265 | -$7,544 | -$9,265 | -$7,544 |
| Eval passed / failed within 2 weeks | 20.4 / 0.0 | 20.4 / 0.0 | 4.1 / 1.9 | 4.0 / 1.6 | 6.7 / 1.6 | 6.7 / 1.3 |
| Eval passed / failed within 3 weeks | 29.1 / 0.0 | 29.1 / 0.0 | 6.2 / 3.4 | 6.5 / 2.5 | 9.9 / 2.8 | 10.2 / 2.1 |
| Eval passed / failed within 1 month | 34.0 / 0.0 | 34.0 / 0.0 | 8.8 / 5.2 | 9.0 / 3.5 | 13.1 / 4.4 | 13.3 / 2.9 |
| Eval pass rate (1 month) | 100% | 100% | 63% | 72% | 75% | 82% |
| Back-to-back evals passed / failed | 4 / 1 | 4 / 1 | 8 / 10 | 8 / 11 | 12 / 11 | 12 / 12 |

By year (net): 2021 +$4.0k to +$3.7k, 2022 -$2.4k to -$1.3k, 2023 +$7.4k to +$8.1k, 2024 +$5.7k to +$6.2k,
2025 +$1.7k to +$1.2k, 2026 +$20.5k to +$20.8k. Better in 4 of 6 years.

Not a knife-edge: the threshold at 3.0 / 3.5 / 4.0 ATR gives the same 2026 (+$291 to +$293) and 2021-25 +$0.4k / +$1.5k /
+$2.2k. At 2.7 it starts to cut good trades (2026 -$1.1k). Quarter size instead of half is a bit better again
(2026 +$417, 2021-25 +$2.2k) with the same eval odds.

Honest caveats: the gain is small (about $30 a month). The threshold was found on these same trades. One more
back-to-back eval fails over 5 years (12/12 vs 12/11) because a few failing runs end on different days. It mostly cuts
drawdown and failed evals in 2021-25. It does not change the win rate, and it does not make evals decide faster.
It is a sizing rule, so it touches the same code as the loss-cutting work. It belongs in that package, and the two should
be checked together.

## What to adopt, and what it does to the pass rate

1. **Do not add trading windows or a second trade a day.** All 31 session variants make less money in 2021-25 than
   today. Most fail more evals (1-month eval fails rise from 5.2% to 6.8-21%), and overnight slippage makes them worse.
   Trades a week stay at 2.16 (2026) and 3.17 (2021-25), inside the 2-4 band.
2. **Do not chase win rate.** Partials, limit entries, bigger-gap rules and HTF filters either lower profit by $5-23k or
   drop 2026 under 2 trades a week. The strategy is meant to win 1 in 4 with big winners. Its eval pass rate comes from
   those winners, not from the win rate.
3. **Adopt-candidate: half size after a sweep 3.5+ ATR deep** (run `wr_deep35_half`). It passes the owner's rule (better
   net and PF in 2026 and in 2021-25, 2-4 trades a week). Eval pass rate within 1 month: 2026 stays 100% (34.0% passed,
   none failed); 2021-25 goes from 63% to 72% (passed 8.8% to 9.0%, failed 5.2% to 3.5%). The 2-week numbers do not move
   (2026 20.4% passed, 2021-25 4.0% vs 4.1%). Check it together with the loss-cutting package before Sunday, because both
   change the size.

## Method and checks

- Exact live-loop replay (`tools/runlib.replay`, 20-day window per session as the live bot) on top of `live_model.json`,
  then live sizing (quarter size in cold streaks, half on late entries), costs included. Size rules re-size the same
  trades exactly (`rl.size`).
- New engine options are all off by default: `session_clock`, `arm_windows`, `max_trades_window`, `stop_after_loss`,
  `eth_slip_ticks`, `feat_min` / `feat_max`. A fresh baseline replay after the edits gives the same 768 trades, with the
  same entry, exit and $ on every one.
- Script: `python tools/research_winrate_sessions.py run|table|save`. All runs are stored in `research/runs/` (families
  `sessions` and `winrate`).
