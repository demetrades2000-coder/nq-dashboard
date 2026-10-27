# Risk manager for the MFFU Builder 50K eval

2026-10-16, for the Sunday launch.

- **Live code:** `engine/risk_policy.py`. It provides `size()`, `EvalAccount`, `account_dead()` and `POLICIES`; `POLICIES["RECOMMENDED"]` is the default.
- **Lab:** `tools/lab_risk_run.py`. Re-run everything with `python tools/lab_risk_run.py`, then `--chain`, then `--summary`.
- **Numbers:**
  - `RISK_results.json`: raw results
  - `RISK_report_tables.md`: the tables quoted here
  - `RISK_tables.md`: every policy on every sequence
  - `RISK_summary.md`: cross-sequence summary

## Bottom line

1. **Sizing cannot create an edge, and outside Jul-Oct 2026 the leading candidate has none.** The leading candidate is `conf_testbed_orig1day`, the current live pick.

   | period | trades | avg R per trade |
   |---|---:|---:|
   | 2026 | 93 | +0.38 |
   | Jan-Jun 2026 (part of 2026) | 54 | -0.02 |
   | Jul-Oct 2026 (part of 2026) | 39 | +0.92 |
   | Apr-Dec 2025 | 118 | -0.05 |
   | 2021-2025 (five-year replay, same settings) | 710 | +0.02 |

   - Every other model (SB, MECH, M22, CONT, ATM) is flat or negative in 2026.
   - Wherever there is no edge, every policy's pass rate sits at or below its own zero-edge baseline. The policy only changes how fast you pass or fail.
2. **If the 2026 edge holds, sizing moves the result by a few points; the edge moves it by about 35.** Flat $350 passes 59.5% of 60-day evals. The same trades with the edge removed pass 25.1%. Every sensible policy lands within a few points of flat $350.
3. **"1 NQ when the setup looks better, micros when not confident" does not work with any grade we have.**
   - The engine's A+/A trades made +1.39R in 2026, then -0.15R in 2025 and +0.01R over 2021-25.
   - The trader brain's grades rank backwards on the 2026 trades. A-graded trades made -0.13R (v1) and -0.16R (v2), while the setups it said to skip made +0.66R (v1) and +0.31R (v2).
   - The ATM tiers fail their own rank test.
   - Sizing by the brain's grades cuts the 2026 pass rate from 59% to 32-36%.
   - Sizing by the engine grade cuts the 2025 pass rate from 12% to 2%.
   - Tiers stay off until a grade passes an out-of-sample rank test. The code is ready (`tiers=True`: A = up to 1 NQ, C = $175).
4. **Recommended: flat $350 a setup, never more than 35% of the cushion, hard guards, day rules (`RECOMMENDED` = `P2f_k35`).** On the 2026 trades, compared with flat $350:

   | | recommended | flat $350 |
   |---|---|---|
   | 60-day pass / fail | 57.3% / 9.3% | 59.5% / 15.8% |
   | Eventual pass, 250 days | 80.9% | 77.4% |
   | Real 2026 drawdown | -$3,348 | -$4,442 |
   | Evals bought per funded account | 1.25 | 1.29 |
   | Median trading days to funded | 48 | 46 |

   - It is a safety net, not a booster: about the same speed, roughly 40% fewer 60-day fails.
   - On the no-edge beds it is no worse per year: 3.02 evals bought a year against 3.03.
5. **Rejected:**
   - **Anti-martingale cuts (P3)** need fewer evals per pass when the edge is real (1.15 against 1.29), but take about 17 more trading days to fund. With no edge they need more evals per funded account (4.03 against 3.59 over 2021-25).
   - **The eval sprint (P4)**, both the "protect" and "finish" versions, changes nothing.
   - **Stacking cuts (P5 with tiers, cushion 0.25 and a 50% cut)** shrinks positions below one micro, so the bot stops trading: 1.6 trades a week instead of 2.3.
   - **Flat $500** funds fastest when the edge is real (median 32 days) but nearly doubles the 60-day fail rate (29.5%). That is a choice of how aggressive to be, not a better policy.

## The recommended policy: the exact live rules

For every setup the bot finds, whatever model it comes from:

1. **Budget.** The budget is $350 at the stop. The setup's grade does not change it: an ungraded or unknown grade counts as B, and B is $350.
2. **Cushion cap.** The budget is never more than 35% of the cushion, where cushion = balance - trailing MLL.
   - On a fresh account the cushion is $2,000, so the cap is $700 and does not bite.
   - It starts to bite once the account is about $1,000 below its end-of-day high. Examples: $945 cushion -> $331; $645 cushion -> $226.
3. **Contracts.** Micros = floor(budget / (stop points x $2)), at most 40.
   - If that is 0, skip the setup and log "stop too wide".
   - 10 micros are routed as 1 NQ, which is cheaper.
4. **Hard guard.** Before sending, compute the worst case = micros x ((stop + 1 point) x $2 + $1.40).
   - It must leave at least $25 above the trailing MLL, and at least $25 above today's -$1,000 limit.
   - If not, cut micros. If even 1 micro does not fit, skip.
5. **Day rules.**
   - At most 2 trades a day.
   - Stop for the day after a winner.
   - Stop after 2 losers, or once the day is at -$700 or worse.
   - If MFFU's -$1,000 daily limit flattens you, the day is over.
6. **Target.** Stop trading the eval once the end-of-day balance is at or above $53,000.
7. **Dead account.** If the cushion falls below what 1 micro of a normal setup needs, the eval cannot be finished. That is $251 with a 44-point stop: 1 micro risks $88, and $88 / 0.35 = $251.
   - `account_dead()` reports this.
   - Stop and reset the eval; do not keep trading it.
8. **Logging.** Log every decision's `reason` string. Example:

   > flat $350 budget; cushion $645 x 0.35 caps it at $226; 44.00-pt stop = $88/micro -> 2 micros (2 MNQ), $176 at the stop, worst case $183 vs $645 above the MLL and $1,000 left today.

`size()` does not apply the MFFU limits themselves (the trailing MLL at -$2,000 that locks at $50,100, and the -$1,000 daily limit). `EvalAccount` tracks them, and they are what the guard protects.

## Results: leading candidate, 2026 trades (93 trades, 2.26 a week)

The 60-day columns come from 5,000 bootstrap runs. "Zero edge" means every trade's R minus the mean R. "Real order" means evals run back to back over the actual 2026 days.

| policy | 60-day P(pass) | P(fail) | median days | zero-edge P(pass) | half-edge P(pass) | 250-day P(pass) / P(fail) | real 2026 order: passes/fails (days to pass) | max DD |
|---|---|---|---|---|---|---|---|---|
| P0 flat $350 (current) | **59.5** | 15.8 | 30 | 25.1 | 40.4 | 77.4 / 22.6 | 4/2 (51,43,15,13) | -$4,442 |
| P0g flat $350 + guards | 59.3 | 15.1 | 30 | 24.3 | 39.7 | 77.3 / 22.6 | 4/2 (51,45,15,13) | -$4,342 |
| flat $250 + guards | 41.8 | 3.9 | 39 | 13.4 | 25.6 | - | 2/1 (55,20) | -$3,003 |
| flat $500 + guards | 63.7 | 29.5 | 21 | 26.2 | 42.6 | 67.1 / 32.9 | 5/3 (42,31,15,16,4) | -$6,050 |
| P1 tiers A $700 / B $350 / C $175 (engine grade) | 53.8 | 5.2 | 32 | 26.9* | 39.4 | 87.8 / 12.1 | 3/1 (60,1,20) | -$3,322 |
| P1b A $700 (max 1 NQ), B/C $350 | 62.4 | 17.7 | 28 | 25.9* | 42.2 | 75.8 / 24.1 | 4/2 (51,31,15,18) | -$4,419 |
| P2 tiers + cushion k=0.25 | 44.3 | 1.1 | 36 | 17.3 | 29.2 | - | 2/1 (55,20) | -$2,524 |
| **P2f flat $350 + cushion k=0.35 = RECOMMENDED** | **57.3** | **9.3** | 30 | 21.6 | 37.2 | **80.9 / 19.1** | 3/1 (51,81,13) | -$3,348 |
| P3 cut 30% until a winning day | 46.5 | 4.7 | 36 | 16.6 | 30.0 | 87.3 / 12.3 | 2/1 (55,20) | -$2,898 |
| P3 cut 50% until a new high | 28.3 | 0.3 | 38 | 9.4 | 16.7 | - | 1/1 (27) | -$1,976 |
| P4a protect ($175 inside $1k of target) | 54.9 | 14.3 | 32 | 22.3 | 37.6 | - | 2/0 (171,20) | -$2,488 |
| P4b finish in 1 winner | 59.6 | 15.7 | 30 | 23.7 | 39.7 | 76.5 / 23.4 | 4/2 (51,45,15,13) | -$4,342 |
| P4b finish in 2 winners | 57.4 | 14.6 | 31 | 24.2 | 39.3 | - | 4/2 (51,45,15,13) | -$4,342 |
| P5 flat + cushion 0.35 + finish-1 | 57.5 | 9.6 | 30 | 21.3 | 37.3 | 80.3 / 19.6 | 3/1 (51,81,13) | -$3,348 |
| P5 flat + cushion 0.35 + cut 30% | 46.2 | 4.0 | 35 | 16.1 | 29.3 | 87.1 / 12.4 | 2/1 (55,20) | -$2,716 |
| P5 tiers + cushion 0.25 + cut 50% + finish-2 | 34.5 | 0.0 | 38 | 17.3 | 25.0 | - | 1/0 (171) | -$1,324 |
| REC: the engine's own recorded sizes (cross-check) | 60.0 | 8.9 | 32 | 27.7* | 43.1 | 85.1 / 14.8 | 4/1 (51,54,15,13) | -$3,025 |

\* These zero-edge figures still contain the grade's (or REC's regime half-size's) 2026 ranking. R is de-meaned across all trades, not within each tier, so they are not a clean null. Use the 2025 and 2021-25 rows below instead.

**A trader who buys a new eval after every fail, for one trading year (250 days):**

| policy | 2026 trades: P(funded) / median days / evals per funded | 2021-25 trades (no edge): P(funded) / median days / evals per funded / evals bought a year |
|---|---|---|
| P0 flat $350 | 99.5% / 46 / 1.29 | 84.3% / 88 / 3.59 / 3.03 |
| flat $500 + guards | 99.8% / 32 / 1.49 | 95.1% / 57 / 3.70 / 3.52 |
| P1 tiers (engine grade) | 98.8% / 54 / 1.14 | 60.0% / 128 / 4.11 / - |
| P1b A $700, B/C $350 | 99.5% / 42 / 1.32 | 86.4% / 85 / 3.73 / - |
| **RECOMMENDED (P2f k=0.35)** | **98.5% / 48 / 1.25** | 73.2% / 95 / 4.13 / **3.02** |
| P3 cut 30% until a win | 98.3% / 63 / 1.15 | 65.2% / 117 / 4.03 / 2.63 |
| P4b finish in 1 | 99.5% / 45 / 1.32 | 82.4% / 88 / 3.85 / - |

On the 2025 bed (-0.05R) everything is worse:

| policy | P(funded) | evals per funded |
|---|---:|---:|
| flat $350 | 59.5% | 6.74 |
| recommended | 49.6% | 7.90 |
| P3 | 37.5% | 8.69 |
| engine-grade tiers | 17.8% | 21.7 |

Without an edge, a "funded" account is a lottery ticket that the funded-stage rules will take back. What matters there is how many evals a year you burn, and that is the same for flat $350 and the recommended policy.

## Results: no edge (same settings, 2025 and 2021-25)

| policy | 2025: 60-day pass / fail [zero-edge pass] | 2025: 250-day | 2021-25: 60-day pass / fail [zero-edge pass] | 2021-25: 250-day | 2021-25 real order (pass/fail) |
|---|---|---|---|---|---|
| P0 flat $350 | 12.1 / 64.9 [16.1] | 18.1 / 81.9 | 21.8 / 58.2 [19.7] | 31.4 / 68.7 | 8/19 |
| flat $500 + guards | 16.8 / 79.9 [21.7] | 18.4 / 81.5 | 26.8 / 71.0 [24.1] | 28.2 / 71.8 | 15/34 |
| P1 tiers (engine grade) | 2.3 / 49.5 [3.6] | 7.3 / 92.3 | 11.3 / 33.0 [10.2] | 29.6 / 69.4 | 4/9 |
| P1b A $700, B/C $350 | 11.5 / 72.0 [15.2] | 16.0 / 84.0 | 23.5 / 62.0 [20.9] | 29.1 / 70.9 | 7/18 |
| **RECOMMENDED** | 10.7 / 59.5 [14.4] | 15.4 / 84.5 | 19.6 / 51.1 [17.6] | 27.8 / 72.2 | 7/16 |
| P3 cut 30% until a win | 6.3 / 42.8 [10.6] | 16.2 / 83.2 | 14.1 / 37.7 [12.3] | 29.9 / 69.5 | 5/12 |
| P4b finish in 1 | 12.3 / 66.2 [16.6] | 17.8 / 82.2 | 22.1 / 59.3 [20.0] | 29.4 / 70.5 | 9/17 |

Over 2021-25, every policy is within about 3 points of its zero-edge baseline; in 2025 every one is below it. That is what "sizing can't create an edge" looks like.

In the real 2021-25 order, flat $350 would have finished 27 evals and passed 8. The recommended policy would have finished 23 and passed 7.

## The owner's question: bigger on the good setups, micros on the rest?

Average R by tier (trade count in brackets), and 60-day pass / fail when sized by that grade:

| signal | period | A tier | B tier | C tier | brain says SKIP | flat $350 + guards | tiers + guards | A $700 / B,C $350 |
|---|---|---|---|---|---|---|---|---|
| engine grade (A+/A, B, C/D) | 2026 | +1.39 (15) | -0.02 (15) | +0.23 (63) | - | 59.3 / 15.1 | 53.6 / 4.0 | 62.4 / 17.7 |
| engine grade | 2025 | -0.15 (18) | -0.18 (12) | -0.01 (88) | - | 11.9 / 65.6 | 2.3 / 46.1 | 11.5 / 72.0 |
| engine grade | 2021-25 | +0.01 (76) | +0.01 (100) | +0.03 (534) | - | 21.6 / 58.8 | 11.3 / 31.9 | 23.5 / 62.0 |
| regime (trending = C) | 2026 | - | +0.42 (76) | +0.18 (17) | - | 59.3 / 15.1 | 57.2 / 12.6 | - |
| regime | 2025 | - | +0.05 (86) | -0.29 (32) | - | 11.9 / 65.6 | 12.9 / 48.0 | - |
| regime | 2021-25 | - | +0.02 (529) | +0.02 (181) | - | 21.6 / 58.8 | 18.2 / 48.9 | - |
| trader brain v1 | 2026 | -0.13 (15) | +0.43 (26) | +0.44 (39) | +0.66 (13) | 59.3 / 15.1 | 32.3 / 25.8 | 46.6 / 29.2 |
| trader brain v1 | 2025 | +0.24 (26) | -0.24 (37) | -0.10 (43) | +0.12 (12) | 11.9 / 65.6 | 22.1 / 57.3 | 20.9 / 67.2 |
| trader brain v2 | 2026 | -0.16 (22) | +0.76 (32) | +0.56 (8) | +0.31 (31) | 59.3 / 15.1 | 35.6 / 29.6 | 39.0 / 29.9 |
| trader brain v2 | 2025 | -0.14 (28) | -0.15 (31) | -0.02 (10) | +0.07 (49) | 11.9 / 65.6 | 1.6 / 63.3 | 2.8 / 68.0 |

- **Engine grade.** It looks like a gift in 2026 and is noise everywhere else.
- **Regime half-size** (trending regime = C, the engine's own `regime_mode`). It holds in 2025-26 but not over 2021-25.
- **Trader brain.** Its grades are unstable between years. v2 also skips a third of the trades, which hurts trade frequency.
- **ATM tiers.** The ATM report finds that its tiers fail the pre-registered rank test.

**What has to happen before tiers go on.** Size by a grade only after it beats the others out of sample:
- A > B > C on two separate periods,
- at least 30 trades per tier,
- tested on trades the grade was not built on.

Until then, "trade 1 NQ when it looks good" adds risk, not edge.

## Other models (2026)

None has a real edge, and sizing does not change that. Every 95% interval on avg R includes zero or sits below it. Full table: `RISK_report_tables.md`, section E.

**Ordinary sizing.** With flat $350 or the recommended policy, the negative models land below their zero-edge baseline:

| model | avg R | flat $350 pass / fail | zero-edge pass |
|---|---:|---|---:|
| SB_NQ_base | -0.09 | 15.7% / 72.9% | 21.3% |
| MECH_NQ_rr2 | -0.24 | 1.1% / 59.5% | 7.5% |
| M22_NQ_nobias | -0.04 | 4.4% / 50.8% | 6.0% |

The ATM 1m variants (+0.01R to +0.13R) land 1-5 points above their baseline.

**The "best" policies.** Where something beats flat $350, it is flat $500 or tier sizing, and those simply add variance. For example, ATM_1m_best with A $700 / B,C $350 passes 30.3%, but fails 50.9%, and its zero-edge baseline is 22.8%.

**Too few trades.** Several of these models trade under 1.5 times a week, so many of their 60-day evals never finish:
- ATM_1m_base, ATM_1m_best, ATM_diag_noskip, MECH_NQ_smt
- M22_NQ_canon, M22_NQ_rr2
- CONT_NQ_IFVG_AMPM
- SB_NQ_am

## How it was tested

**Trade sequences.** Each file's own trades, with its own entries, exits and costs:
- `conf_testbed_orig1day.json`: the current live pick, 2026 and Apr-Dec 2025.
- `research/five_year/run_live_nograde_max1.json`: the same engine settings, 2021-11..2025-12.
- SB / MECH / M22 / CONT / ATM NQ rule modules, 2026. Identical ATM lists stored under two names are counted once in the tables. ES modules are left out because the bot trades NQ; `--es` runs them on MES.
- `NARRATIVE_trades.json`: the trader-brain v1/v2 grades, joined to the engine trades by entry time and direction.

**Re-sizing.** Costs are per micro: $1.40 commission plus a tick of slippage per fill, or the engine's equivalent.
- P&L per micro = file P&L / file qty does not depend on size, so new P&L = new micros x that.
- The intraday dip = the file's MAE, capped at the stop.
- Sizing stop: the engine's `risk_pts`; for the lab modules, |entry - stop| + 1 tick, as `strategy_lab.size` does.

**Eval rules (`EvalAccount`):**
- Start $50,000.
- MLL = highest end-of-day balance - $2,000, locked at $50,100. It is checked intraday against the worst open P&L.
- The daily limit flattens the position at -$1,000 and ends the day.
- Pass when an end-of-day balance is at or above $53,000.
- The same day rules apply to every policy.

**Dead accounts count as fails.** Without this rule, guarded and cushion-scaled policies would never "fail"; they would freeze unable to afford one micro, and look safer than they are.

**Real order.** The actual day order, with evals back to back.

**Bootstrap.**
- 5,000 runs x 60 trading days.
- Whole days are resampled with replacement, no-trade days included, keeping each day's trade order.
- All policies see the same random days.
- Zero edge = R - mean R. Half edge = R - 0.5 x mean R.
- A shortlist also gets 2,000 runs x 250 days, and the one-year "re-buy" chain: 2,000 traders x 250 days.

**REC.** The engine's own recorded quantities: $350, a 25% cushion cap and half size when trending, applied on its own account path. It is a cross-check only, because those sizes are tied to the original timeline:
- It reproduces the leaderboard's real-order 4 passes / 1 fail for the live pick.
- Its rolling pass rate is 50.8%, against the leaderboard's 48.1%. The difference is that the dip here is capped at the stop.

## Caveats

1. **The bootstrap assumes the trade mix it was given continues.** For 2026 that means the Jul-Oct edge spread over every day. Read the 2026 numbers as "if the regime holds" and the 2021-25 numbers as "if it doesn't". The half-edge column sits in between: 37-40% for the sensible policies.
2. **Resampling whole days breaks losing and winning streaks.** Real drawdowns cluster: 2026 lost through June, then won. The real-order columns show the actual path. The first 2026 eval took 51 trading days to pass under flat $350 and under the recommended policy.
3. **The tier policies' zero-edge baselines are not clean nulls.** They still contain the grade's in-sample ranking (see the * note). Judge tiers on 2025 and 2021-25.
4. **The 60-day horizon is arbitrary.** If the MFFU Builder eval has no time limit, the 250-day and one-year columns are closer to your real odds. Check this on MFFU's site.
5. **Commissions for 1 NQ are not modeled.** 10 MNQ are costed as 10 micros; routing them as 1 NQ would save about $10 a round trip. It only matters for tier A, which stays off.
6. **Overlapping positions are not modeled.** Day rules process a day's trades in entry order and assume each one closed before the next. No sequence had overlapping trades.
7. **Re-check MFFU's rules before launch.** The daily limit is treated as soft (flatten at -$1,000, the account lives), and the MLL as end-of-day trailing that locks at $50,100.
8. **The funded stage was not tested.** It has its own rules, and the same sizing question applies again there.
9. **The ATM trade lists are the ones written by 19:22 ET.** If the ATM agent writes new lists, run `python tools/lab_risk_run.py --only ATM` and then `--summary`. The rest of the results are kept.

## For the trader layer (`tools/trader_layer.py`)

`size(setup_grade, stop_pts, account_state, day_state, cfg=None, plan_r=None, point_value=None)`

- **Purity.** It is a pure function. Its docstring lists every key, and every key except `balance` and `mll` has a default.
- **Default policy.** `cfg=None` uses `RECOMMENDED`.
- **Grades.** Ungraded or unknown grades are B. With tiers off, the grade is ignored.
- **Contracts.** `point_value=5.0` sizes MES for ES models. `contracts` gives the same size as minis + micros.
- **Return codes:** `ok`, `done`, `day_rule`, `skip_grade`, `bad_stop`, `too_wide`, `guard`.
- **Account state.** `EvalAccount` keeps the account and day state: call `record_trade(pnl, worst_open)` after each closed trade, and `end_of_day()` after the close.
- **Dead account.** `account_dead(state, typical_stop)` says when to reset. Pass the model's median stop.
