## The recommendation (one change, together with the sizing change)

**Keep every rule as it is, except: on a trending day (10-day efficiency above 0.45, the same test that already
halves the size), move the stop to breakeven only once the trade is +3R, instead of +1R. Adopt it together with the
sizing recommendation (`risk-summary.md`: quarter size in cold streaks, half size on late entries).**

`live_model.json` params: add `"be_at_r_trending": 3.0` (the engine option already exists; entries, stops, targets
and trades a week do not change). Pine: where the script moves the stop to breakeven at `beAtR`, use 3.0 instead
when the regime is trending (`regimeEr` is already computed for the half-size rule). Two lines.

- **With the sizing change** (table below): 2026 unchanged where it matters (same passes, no failed eval within 3
  months either way, net −$96, PF 4.12 → 3.94), 2021-25 **+$4.8k** (PF 1.19 → 1.27, evals passed within 3 months
  29.3% → 32.8%). Against today's live rules the pair passes the strict rule in both periods.
- **On today's sizing alone** it is not clean: 2021-25 +$4.7k (PF 1.09 → 1.15) and 2026 has the same money and the
  same eval odds up to 1 month, but evals started from mid-March to April 2026 fail in late May instead of late June
  (2026 evals failed within 3 months 14.1% → 20.4%). One small April trade now wins +2.98R (+$288), which keeps the
  cold-streak filter from switching to half size, so three May losers cost $283 more; that is just enough to push
  evals started from mid-March to April over the limit in late May. **If the sizing change is not adopted, keep the
  current rules.**

Status: **promising** on its own (2026 PF 3.48 → 3.39 with the same net), **adopt-candidate** with the sizing change
(run `combo_betrend3_risksizing`).

## Full table: today's rules vs today's rules + the breakeven change (exact, costs included)

| | 2026 today | 2026 new | 2021-25 today | 2021-25 new | All years today | All years new |
|---|---:|---:|---:|---:|---:|---:|
| Trades | 89 | 89 | 679 | 679 | 768 | 768 |
| Trades a week | 2.16 | 2.16 | 3.17 | 3.17 | 3.0 | 3.0 |
| Weeks with 2+ trades | 71% | 71% | 92% | 92% | 89% | 89% |
| Win rate | 24.7% | 25.8% | 20.5% | 21.1% | 21.0% | 21.6% |
| Average R per trade | +0.38 | +0.41 | 0.00 | +0.01 | +0.04 | +0.06 |
| Profit factor | 3.48 | 3.39 | 1.09 | 1.15 | 1.32 | 1.37 |
| Net | +$20,111 | +$20,114 | +$6,491 | +$11,174 | +$26,602 | +$31,288 |
| Net per month | +$2,050 | +$2,050 | +$127 | +$219 | +$437 | +$514 |
| Max drawdown | −$2,661 | −$2,658 | −$11,401 | −$11,420 | −$11,401 | −$11,420 |
| Worst day | −$554 | −$554 | −$875 | −$875 | −$875 | −$875 |
| Eval passed / failed within 2 weeks | 19.4% / 0% | 19.4% / 0% | 4.1% / 2.1% | 4.2% / 2.1% | 6.6% / 1.7% | 6.7% / 1.8% |
| Evals decided within 2 weeks | 19.4% | 19.4% | 6.2% | 6.3% | 8.3% | 8.5% |
| Eval passed / failed within 3 weeks | 28.2% / 0% | 28.2% / 0% | 6.1% / 5.7% | 6.2% / 5.7% | 9.6% / 4.8% | 9.8% / 4.8% |
| Eval passed / failed within 1 month | 33% / 0% | 33% / 0% | 8.7% / 9.4% | 8.9% / 9.4% | 12.9% / 7.9% | 13.1% / 7.9% |
| Eval passed / failed within 3 months | 63.1% / 14.1% | 63.1% / 20.4% | 20.5% / 55.9% | 23.6% / 52.5% | 30.8% / 49.1% | 33.4% / 47.3% |
| Passes that took over 3 weeks | 55.4% | 55.4% | 70.5% | 73.5% | 68.8% | 70.7% |
| Median sessions to a pass | 19 | 19 | 25 | 29 | 25.5 | 28 |
| Back-to-back evals passed / failed | 4 / 1 | 4 / 1 | 7 / 18 | 8 / 18 | 11 / 19 | 12 / 19 |

By year (net): 2021 +$1.7k → +$3.6k · 2022 −$7.0k → −$5.1k · 2023 +$8.4k → +$8.3k · 2024 +$1.7k → +$2.9k ·
2025 +$1.6k → +$1.4k · 2026 +$20.1k → +$20.1k. No year is worse by more than $0.1k.

Method: management-only change, so the trades are the same; exits re-simulated on the exact live-loop replay's
trades (the simulator reproduces all 768 baseline trades exactly) and confirmed by a full exact replay
(run `mgt_betrend300_replay`).

**Eval speed (owner's rule: decided within 2 weeks, no pass slower than 3 weeks).** Within 2 and 3 weeks nothing
gets worse: 2026 is identical, 2021-25 is equal or a hair better (passed within 2 weeks 4.2% vs 4.1%, within 3 weeks
6.2% vs 6.1%, fails unchanged). The extra 2021-25 passes come late (27 evals that failed now pass, mostly after 3
weeks), so the share of passes slower than 3 weeks rises (73.5% vs 70.5%) and the median pass takes 29 sessions
instead of 25. The 2026 side effect is beyond 1 month (late-May fails, see above) and disappears with the sizing
change. No setting tested here gets most evals decided inside 2 weeks: even in 2026 only about 1 in 5 is (19.4%);
that depends on how much each trade risks (sizing), not on trade construction. The only trade-construction changes
that pass 2026 evals faster (lock +0.5R after +1.5R: 2026 passed within 3 weeks 35.0% vs 28.2%; setups waiting 90
minutes: 34.0%) lose $6-8k in 2021-25 and pass its evals slower.

**Trades a week:** 2.16 (2026) and 3.17 (2021-25), unchanged, inside the owner's 2-4 band.

## Why it helps, and how sure we are

- Trending-day trades are reversals against a trending market (already at half size). Moving them to breakeven at
  +1R cut the few that went on to the pool. Without the early breakeven, the giveback exit (close back through
  entry after +0.5R) still protects them, so the cost is small: about −0.2R instead of −0.02R on 25 trades.
- Over 5 years it changes only 30 trades: 25 lose a little more, 5 win big (4 reach the target at +3R to +5R).
  So the gain rests on about one trade a year: plausible, not proven.
- Not a knife-edge: waiting until +1.5R adds $1.5k, +2.5R $2.7k, +3R $4.7k, never $4.5k in 2021-25; all leave 2026
  net unchanged.
- The 2026 PF dip is a side effect of the cold-streak filter, not of worse trades: one April trade becomes +2.98R
  instead of −0.02R, which keeps three May losers at full size instead of half. 2026 R per trade rises
  (+0.38 → +0.41) and, without the cold-streak filter, the change is better in both periods (2026 PF 3.07 → 3.10,
  2021-25 PF 0.98 → 1.02).

## With the sizing recommendation (the recommended pair)

The sizing research (`risk-summary.md`) recommends quarter size in cold streaks and half size on late entries. The two
changes touch different things (sizes vs the breakeven move) and add up (run `combo_betrend3_risksizing`, exact,
same trades; columns: sizing change alone vs sizing change + breakeven change):

| | 2026 sizing only | 2026 sizing + breakeven | 2021-25 sizing only | 2021-25 sizing + breakeven | All years sizing only | All years both |
|---|---:|---:|---:|---:|---:|---:|
| Trades | 89 | 89 | 679 | 679 | 768 | 768 |
| Trades a week | 2.16 | 2.16 | 3.17 | 3.17 | 3.0 | 3.0 |
| Weeks with 2+ trades | 71% | 71% | 92% | 92% | 89% | 89% |
| Win rate | 24.7% | 25.8% | 20.5% | 21.1% | 21.0% | 21.6% |
| Average R per trade | +0.38 | +0.41 | 0.00 | +0.01 | +0.04 | +0.06 |
| Profit factor | 4.12 | 3.94 | 1.19 | 1.27 | 1.48 | 1.54 |
| Net | +$20,583 | +$20,487 | +$11,546 | +$16,379 | +$32,129 | +$36,866 |
| Net per month | +$2,098 | +$2,088 | +$226 | +$321 | +$528 | +$606 |
| Max drawdown | −$2,153 | −$2,249 | −$9,183 | −$9,265 | −$9,183 | −$9,265 |
| Worst day | −$524 | −$524 | −$875 | −$875 | −$875 | −$875 |
| Eval passed / failed within 2 weeks | 20.4% / 0% | 20.4% / 0% | 4% / 1.9% | 4.1% / 1.9% | 6.7% / 1.6% | 6.7% / 1.6% |
| Evals decided within 2 weeks | 20.4% | 20.4% | 5.9% | 6% | 8.3% | 8.3% |
| Eval passed / failed within 3 weeks | 29.1% / 0% | 29.1% / 0% | 6% / 3.4% | 6.2% / 3.4% | 9.7% / 2.8% | 9.9% / 2.8% |
| Eval passed / failed within 1 month | 34% / 0% | 34% / 0% | 8.6% / 5.1% | 8.8% / 5.2% | 13% / 4.3% | 13.1% / 4.4% |
| Eval passed / failed within 3 months | 63.1% / 0% | 63.1% / 0% | 29.3% / 26.9% | 32.8% / 26.5% | 37.9% / 22.5% | 40.9% / 22.2% |
| Passes that took over 3 weeks | 53.8% | 53.8% | 79.6% | 81.2% | 74.4% | 75.9% |
| Median sessions to a pass | 18 | 18 | 31 | 32.5 | 29 | 31 |
| Back-to-back evals passed / failed | 4 / 1 | 4 / 1 | 7 / 10 | 8 / 10 | 11 / 11 | 12 / 11 |

Same pattern as on its own: 2026 money and eval odds unchanged (−$96), its PF dips through the cold-streak state,
2021-25 +$4.8k with the same eval speed. Against today's live rules the pair is better in both periods (2026 +$0.4k,
PF 3.94 vs 3.48; 2021-25 +$9.9k, PF 1.27 vs 1.09) with 2.16 / 3.17 trades a week. Not a knife-edge here either: on
top of the sizing change, breakeven on trending days at +1.5R / +2R / +2.5R / +3R / never adds +$1.6k / +$1.6k /
+$2.9k / +$4.8k / +$4.7k to 2021-25, and 2026 is identical for all of them.

## What NOT to do (tested today on the live settings)

| Idea | What happened |
|---|---|
| Wider or ATR-scaled stop buffer (3-6 pts, 0.1-0.5 x ATR) | fewer trades (from 4 pts: under 2 a week) and less 2026 profit; ATR 0.15 looked good only by skipping trades (exact replay: 1.84 a week, 2026 −$2.5k), its neighbours are worse |
| Tighter buffer (1 pt), stop beyond the gap | wicked out more; 2021-25 loses money with the gap stop |
| Widest stop 45-50 / 70-80 | 45-50 cuts good trades; 70-80 adds about-break-even trades (useful only if more trades a week are wanted) |
| Draw at least 2-3R away, or the second pool | 2021-25 profit falls to −$0.3k to +$3.0k (today +$8.8k on the same backtest) |
| Bank at 3R / 4R | 2026 profit falls by $5-8k |
| Bank at 6R / 8R | 2021-25 +$0.4k to +$1.5k, but 2026 −$5k to −$7k (8R confirmed by an exact replay: 2026 +$15.2k, 2021-25 +$8.0k) |
| Exit a few ticks in front of the pool | changes almost nothing, slightly worse |
| Breakeven earlier or later on all days, profit locks, other time stops, giveback at 0.75-1R | every one loses money in 2021-25; locks lose in every variant |
| Bias as a filter (yesterday's candle, last week's midpoint, weekly open, daily/weekly draw, SMT) | 0.1-1.9 trades a week |
| Bias as a confluence point | the replacement trades lose (2021-25 PF 0.94-0.96) |
| Skip trending markets, VIX above 20 or 25, range block 1.2x, morning or afternoon only | under 2 trades a week or less profit |
| Confluence score 0 | 3.6 trades a week in 2021-25 but less profit in both periods |
| Full size in trending markets | a little more profit but more failed evals (2021-25: 13.3% fail within a month vs 9.3%) |

## Worth more research (not for Sunday)

- **Size-down when two biases disagree** (the trade follows yesterday's candle AND is on the wrong side of last
  week's midpoint; about 1 trade in 5): 70% size raises PF in both periods (2026 3.48 → 3.62, 2021-25 1.09 → 1.12)
  and cuts drawdown, but costs 2026 $0.75k. **With the recommended breakeven change on top** (run
  `combo_betrend3_both07`):

  | | 2026 today | 2026 combo | 2021-25 today | 2021-25 combo | All years today | All years combo |
  |---|---:|---:|---:|---:|---:|---:|
  | Trades | 89 | 89 | 679 | 679 | 768 | 768 |
  | Trades a week | 2.16 | 2.16 | 3.17 | 3.17 | 3.0 | 3.0 |
  | Weeks with 2+ trades | 71% | 71% | 92% | 92% | 89% | 89% |
  | Win rate | 24.7% | 25.8% | 20.5% | 21.1% | 21.0% | 21.6% |
  | Average R per trade | +0.38 | +0.41 | 0.00 | +0.01 | +0.04 | +0.06 |
  | Profit factor | 3.48 | 3.52 | 1.09 | 1.18 | 1.32 | 1.41 |
  | Net | +$20,111 | +$19,364 | +$6,491 | +$12,667 | +$26,602 | +$32,031 |
  | Net per month | +$2,050 | +$1,974 | +$127 | +$248 | +$437 | +$526 |
  | Max drawdown | −$2,661 | −$2,377 | −$11,401 | −$10,149 | −$11,401 | −$10,149 |
  | Worst day | −$554 | −$490 | −$875 | −$875 | −$875 | −$875 |
  | Eval passed / failed within 2 weeks | 19.4% / 0% | 18.4% / 0% | 4.1% / 2.1% | 3.6% / 1.7% | 6.6% / 1.7% | 6% / 1.4% |
  | Evals decided within 2 weeks | 19.4% | 18.4% | 6.2% | 5.3% | 8.3% | 7.4% |
  | Eval passed / failed within 3 weeks | 28.2% / 0% | 27.2% / 0% | 6.1% / 5.7% | 5.1% / 4.1% | 9.6% / 4.8% | 8.7% / 3.4% |
  | Eval passed / failed within 1 month | 33% / 0% | 32% / 0% | 8.7% / 9.4% | 7.6% / 6.6% | 12.9% / 7.9% | 11.6% / 5.6% |
  | Eval passed / failed within 3 months | 63.1% / 14.1% | 62.1% / 12.6% | 20.5% / 55.9% | 26.3% / 44.6% | 30.8% / 49.1% | 33.9% / 39.4% |
  | Passes that took over 3 weeks | 55.4% | 56.2% | 70.5% | 80.5% | 68.8% | 74.4% |
  | Median sessions to a pass | 19 | 19.5 | 25 | 30 | 25.5 | 28 |
  | Back-to-back evals passed / failed | 4 / 1 | 4 / 1 | 7 / 18 | 7 / 15 | 11 / 19 | 12 / 16 |

  Better in every 2021-25 year (2021 +$1.5k, 2022 +$3.1k, 2023 +$0.5k, 2024 +$0.1k, 2025 +$1.0k), 2026 −$0.75k. It
  cuts 1-month eval fails in 2021-25 (6.6% vs 9.4%) but slows passes (passed within 2 weeks 3.6% vs 4.1%), against
  the owner's eval-speed rule. It fails the strict rule (2026 net lower), the size rule is not in the engine or the
  Pine script yet, it is a sizing rule (the sizing research's area), and both biases were found on these same
  trades. Worth a proper out-of-sample check after Sunday, not a change for Sunday.
- **Half size when VIX is above 20** (instead of skipping those days): PF up in both periods (2026 3.61, 2021-25
  1.14), 2021-25 +$2.5k with drawdown −$7.5k instead of −$11.4k, 2026 −$0.45k (runs `flt_vix20_half`, `flt_vix20_07`).
  Also a sizing rule.
- **More trades a week:** "widest stop 80" lifts 2026 to 2.7 a week (88% of weeks with 2+) for −$0.9k in 2026 and
  −$3.7k in 2021-25.

## Checks

- **Leak:** none. The trade memory and the exit learner change no trade (`leakage-check.md`).
- **Engine:** new options `stop_buf_atr`, `w_pdc`, `w_pwmid` are off by default; the baseline replay re-run from
  scratch after the edits gives the same 768 trades.
- Write-ups: `stops.md`, `targets.md`, `management.md`, `bias-filters.md`, `leakage-check.md`. Every run is in the run
  library; `python tools/research_trade.py all` reproduces them.
