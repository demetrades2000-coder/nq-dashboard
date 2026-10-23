# Five-year NQ verdict (2021-10-18 to 2026-10-16, real CME NQ1!, default params)

Written 2026-10-16. Data: clean back-adjusted `data/NQ_5m.csv` (1,293 sessions). No CFD data was used.
Reproduce everything with `tools/five_year.py` (`runs`, `skips`, `live`, `grid full`, `grid combo`); raw outputs are in
`research/five_year/`.

## Verdict in plain English

1. **The 130-trade result was an engine bug, not the strategy.** The backtest carried a single simulated $50K eval
   account through all five years. In 2022 that account drifted down to within about $56 of its locked $50,100
   max-loss level. Drawdown-aware sizing (`risk = min($350, 25% of the cushion)`) then could not afford even one micro,
   so every signal after that was skipped with "Risk $14 too small". There were 0 trades from 2024-03 onward. The fix
   starts a fresh eval when the simulated account is blown or starved. After the fix the same run trades 3.2 to 4.1 per
   week (see section 1).
2. **With that fixed, there is no edge you can show over five years.** Replaying the live loop exactly (20-day window
   and a fresh account on every poll, same as `engine/live.py`) gives 987 trades at 3.9 a week, a 20.7% win rate,
   **avg +0.024R (95% CI -0.06 to +0.10)**, PF 1.06 and +$4.1k. The max drawdown is -$9.2k. Back-to-back MFFU evals:
   4 passed and 11 failed.
3. **The whole profit is Aug to Oct 2026. Defaults were tuned on that window.** Aug 6 to Oct 16 2026: 31 trades at
   +1.20R each (+$11.4k). Everything before Aug 2026: 953 trades at **-0.014R (CI -0.09 to +0.06), PF 0.89, -$7.3k**.
   The best 31-trade stretch at any point in the previous 4.8 years averaged +0.54R. Aug to Oct 2026 is less than half
   that again and sits in the top 0.1% of all 31-trade windows. That pattern means the tuning fit one regime. It does
   not show a durable edge.
4. **Regimes.** It worked in calm, rotating markets: 2023-Q2, 2024-Q4, 2025-Q2 and 2026-Q3. VIX 15 to 18 averaged
   +0.15R; 20-day efficiency below 0.15 averaged +0.10R. It failed in the 2022 bear market (high VIX, every quarter
   negative, -$5.8k), in 2023-Q4, 2025-Q4 and 2026-Q2 (-0.53R, 2 wins in 31 trades). None of these regime buckets is
   statistically clean: every CI includes 0. Even so, VIX > 18 and strongly trending months were negative in every cut.
5. **Frequency is fine and slightly high, not low.** Live-equivalent replay runs 3.7 a week in 2022, 5.0 in 2023, 4.3 in
   2024, 3.4 in 2025 and 2.5 in 2026. The owner's 2 to 4 per week band is exceeded in 2023 and 2024, and no year is
   below 2.
6. **Launch implication.** The bot does not carry a proven edge into Monday. Paper or eval only, at the eval's normal
   risk, and expect about breakeven with long losing streaks: a 79% loss rate per trade, and losing quarters are
   common. Aug to Oct 2026 should not be treated as the expectation.
7. **Parameter search (section 3).** No change is statistically significant. The engine's own confluence search, run on
   year folds (train 2021 to 2024, test 2025 to 2026), adopted nothing. One conservative candidate improves both
   halves and keeps every year in 2.2 to 4.0 trades a week: `grade_sizing: false` plus `max_trades_day: 1`. It is
   offered as a candidate with weak evidence, not a fix.

## 1. Diagnosis: long run vs independent windows

Trades per quarter, default parameters (`research/five_year/summary_runs.json`).

- **old full run:** pre-fix behaviour, `account_reset_cushion=0`.
- **fixed full run:** fresh eval when blown or starved.
- **flat:** `dd_aware` off.
- **8-week windows:** independent runs with a 5-week warm-up.
- **live replay:** per-session 20-day window, exactly as `engine/live.py` runs.

| quarter | old full run | fixed full run | flat sizing | 8-week windows | live replay |
|---|---:|---:|---:|---:|---:|
| 2021Q4 | 53 | 53 | 53 | 25 (warm-up) | 38 |
| 2022Q1 | 40 | 40 | 43 | 16 | 38 |
| 2022Q2 | 18 | 18 | 46 | 31 | 45 |
| 2022Q3 | **2** | 38 | 56 | 41 | 52 |
| 2022Q4 | 4 | 38 | 60 | 38 | 57 |
| 2023Q1 | 6 | 50 | 68 | 30 | 63 |
| 2023Q2..Q4 | 2 / 2 / 1 | 63 / 69 / 51 | 64 / 73 / 71 | 64 / 68 / 45 | 64 / 71 / 62 |
| 2024Q1..Q4 | 2 / **0 / 0 / 0** | 72 / 48 / 14 / 38 | 72 / 59 / 50 / 47 | 67 / 47 / 27 / 45 | 71 / 56 / 47 / 47 |
| 2025Q1..Q4 | **0 / 0 / 0 / 0** | 32 / 29 / 49 / 29 | 37 / 35 / 61 / 52 | 35 / 34 / 54 / 22 | 37 / 34 / 59 / 43 |
| 2026Q1..Q4 | **0 / 0 / 0 / 0** | 31 / 24 / 27 / 7 | 31 / 34 / 35 / 7 | 28 / 25 / 34 / 7 | 30 / 31 / 35 / 7 |
| **total (per week)** | 130 (0.50) | 820 (3.17) | 1,054 (4.08) | 783 (3.09) | 987 (3.86) |
| avg R | -0.001 | +0.021 | +0.034 | +0.055 | +0.024 |
| net $ | +156 | +4,722 | +9,516 | +10,394 | +4,106 |

The old run's account path tells the story. Balance was $52,819 in Nov 2021, which locked the MLL at $50,100. It fell to
$50,240 by Jul 2022 and $50,156 by Feb 2024, and stayed there for 2.7 years. The skip census (`skips.json`, old run)
shows the result: 354 skips in 2023, 296 in 2024 and 227 in 2025 with the reason "Risk $# too small for a #pt stop".
The fixed run has 82, 91 and 70; those are normal cushion throttling after recent losses.

**Bug 1, fixed: account starvation across a long backtest** (`engine/model.py`).
- New default parameter `account_reset_cushion: 250.0`, at line 82.
- At each end of day (lines 554-564): if the simulated cushion above the MLL is under $250, the engine logs a `risk`
  event, records it in `account_resets`, and resets the account to `start_balance` with a fresh MLL.
- It never fires when `live=True`, so the live bot's behaviour is unchanged.
- `result()` and `backtest.run()` now return `account_resets`: 8 resets over 5 years with default sizing.
- **Aug 6 to Oct 16 2026, before vs after:** 31 vs 31 trades, +$11,495.50 vs +$11,495.50. Every trade is identical
  (entry time, direction, qty, P&L, exit reason), and there were 0 resets.

**Bug 2, fixed: a crash when partner (ES) bars do not cover the window** (`engine/backtest.py:32-35`). Any
`days_from`/`days_to` window before 2026-08-06 raised `ValueError: no bars in date range` from the ES slice, so every
windowed multi-year study crashed. Partner is now `None` for such windows. SMT then reads as 0. Default trades do not
depend on the partner (`w_smt=0`, and SMT is not in the grade), so missing ES history changes nothing for NQ results.
The full-run ES slice just starts late.

**Bug 3, fixed: the confluence-search cache broke while a data file was being written**
(`engine/confluence_search.py:114-127, 163-189`). The ES harvest appends to `ES_5m.csv` mid-cycle. That changed the
file-stamp hash between scheduling a job and reading its result (`KeyError`). Stamps are now frozen per cycle, and
hashes are computed once per batch.

**Test harness, fixed** (`tests/test_live_dryrun.py:130-148`). The QA reference "plain Engine over the full files"
became a 5-year `live=True` run. It hit the same starvation: 0 reference trades against 1 real replay entry on 10-13.
The reference is now the 60-day run it was designed as (`REF_DAYS = 60`).

Checked and **not** a cause:
- **Exit learner** (`exit_learn`): over 5 years no extra exit signal ever qualified, so trades are identical with it
  off.
- **`memory_seed`:** identical with it off.
- **Pools, prev-days and weekly state:** only the last 20 days are used.
- **Percent-of-price logic:** there is none in the decision path, so the back-adjustment shift (+3,669 pts in 2021) is
  harmless; all thresholds are in points or ATR/ADR ratios.
- **Fixed point constants** (`max_stop 60`, `min_fvg 3`, `min_stop 10`) are the biggest skip reason in every year,
  250 to 290 per year including 2026. They behave the same across eras: ADR was 201 pts in 2023 and 381 in 2026, but
  scaling `max_stop` to 80 or 100 made both train and test worse.
- **News calendar:** the archive has no 08:30/10:00 releases before 2023 and few 10:00 releases before 2026. The
  08:30 blackout ends at 09:00 so it is irrelevant to the killzones, but 10:00 ISM/JOLTS days were not blocked in old
  years. The effect is small.
- **ES harvest during the study:** ES grew from 0.6 MB to 5 MB while runs were going. NQ trades do not depend on it
  (above).

## 2. Five-year verdict: default params, live-equivalent walk-forward

This is a live-loop replay. For each session D, the engine sees only the last 20 calendar days of 5m bars (plus the full
1h history), as `engine/live.py` does with `window_days=20`, with a fresh 50K simulated balance. Only day-D trades
count. This is the honest "what the paper bot would have done" series. MFFU evals use `analytics.simulate_eval` on
day P&L with intraday lows ($3k target, $2k EOD trailing MLL locking at +$100, $1k DLL check), run two ways:
- **back-to-back:** start a new eval the day after each pass or fail.
- **rolling-start:** `analytics.rolling_evals`, one eval started on every day.

The CIs are 95% bootstrap intervals on avg R (4,000 resamples).

| year | sessions | trades | /week | win % | avg R | 95% CI avg R | PF | net $ | max DD $ | evals back-to-back (pass/fail) | rolling-start pass % |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---|---:|
| 2021 (Q4) | 39 | 38 | 4.87 | 26.3 | -0.016 | [-0.38, +0.37] | 0.68 | -1,058 | -1,746 | 0/0 (+1 open) | - |
| 2022 | 258 | 192 | 3.72 | 15.6 | -0.091 | [-0.27, +0.11] | 0.64 | -5,798 | -6,806 | 0/4 (+1 open) | 0.0 |
| 2023 | 258 | 260 | 5.04 | 20.8 | +0.022 | [-0.12, +0.17] | 0.96 | -716 | -3,362 | 0/2 (+1 open) | 14.4 |
| 2024 | 259 | 221 | 4.27 | 23.5 | +0.061 | [-0.10, +0.23] | 1.18 | +2,390 | -3,192 | 1/1 (+1 open) | 28.3 |
| 2025 | 258 | 173 | 3.35 | 21.4 | -0.001 | [-0.17, +0.18] | 1.01 | +154 | -4,222 | 1/2 (+1 open) | 23.1 |
| 2026 (to 10-16) | 206 | 103 | 2.50 | 20.4 | +0.225 | [-0.09, +0.56] | 2.30 | +9,134 | -2,870 | 2/2 (+1 open) | 45.5 |
| **all** | 1278 | 987 | 3.86 | 20.7 | +0.024 | [-0.06, +0.10] | 1.06 | +4,106 | -9,233 | 4/11 (+1 open) | 28.4 |
| all before 2026-08 | - | 953 | - | - | -0.014 | [-0.09, +0.06] | 0.89 | -7,250 | - | - | - |
| Aug 6 to Oct 16 2026 | 50 | 31 | 2.98 | - | +1.202 | [+0.43, +2.01] | 6.77 | +11,410 | - | - | - |

Per quarter:

| quarter | trades | /week | win % | avg R | 95% CI | PF | net $ | max DD $ |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| 2021Q4 | 38 | 4.87 | 26.3 | -0.016 | [-0.38, +0.37] | 0.68 | -1,058 | -1,746 |
| 2022Q1 | 38 | 2.97 | 21.1 | +0.206 | [-0.33, +0.80] | 0.92 | -296 | -2,136 |
| 2022Q2 | 45 | 3.52 | 13.3 | -0.222 | [-0.51, +0.14] | 0.56 | -1,526 | -2,298 |
| 2022Q3 | 52 | 3.94 | 17.3 | -0.146 | [-0.46, +0.21] | 0.54 | -2,222 | -2,454 |
| 2022Q4 | 57 | 4.45 | 12.3 | -0.136 | [-0.42, +0.19] | 0.58 | -1,754 | -3,028 |
| 2023Q1 | 63 | 4.92 | 14.3 | -0.176 | [-0.34, +0.01] | 0.77 | -899 | -2,414 |
| 2023Q2 | 64 | 4.92 | 23.4 | +0.166 | [-0.16, +0.51] | 1.41 | +1,822 | -901 |
| 2023Q3 | 71 | 5.46 | 22.5 | +0.127 | [-0.16, +0.46] | 0.99 | -65 | -1,570 |
| 2023Q4 | 62 | 4.84 | 22.6 | -0.047 | [-0.31, +0.26] | 0.54 | -1,574 | -2,342 |
| 2024Q1 | 71 | 5.63 | 28.2 | +0.065 | [-0.17, +0.32] | 1.24 | +1,187 | -1,188 |
| 2024Q2 | 56 | 4.31 | 17.9 | -0.009 | [-0.28, +0.30] | 0.99 | -36 | -2,084 |
| 2024Q3 | 47 | 3.56 | 17.0 | +0.061 | [-0.32, +0.50] | 1.07 | +174 | -1,230 |
| 2024Q4 | 47 | 3.62 | 29.8 | +0.138 | [-0.20, +0.52] | 1.37 | +1,066 | -1,188 |
| 2025Q1 | 37 | 2.94 | 27.0 | +0.029 | [-0.31, +0.42] | 1.12 | +294 | -1,852 |
| 2025Q2 | 34 | 2.66 | 35.3 | +0.383 | [-0.10, +0.88] | 2.27 | +2,454 | -868 |
| 2025Q3 | 59 | 4.47 | 18.6 | -0.013 | [-0.29, +0.30] | 0.87 | -596 | -2,410 |
| 2025Q4 | 43 | 3.31 | 9.3 | -0.315 | [-0.51, -0.10] | 0.24 | -1,998 | -1,998 |
| 2026Q1 | 30 | 2.38 | 16.7 | +0.137 | [-0.41, +0.77] | 1.14 | +346 | -1,322 |
| 2026Q2 | 31 | 2.38 | 6.5 | -0.530 | [-0.69, -0.37] | 0.01 | -2,186 | -2,186 |
| 2026Q3 | 35 | 2.65 | 28.6 | +0.741 | [+0.10, +1.45] | 5.59 | +8,965 | -462 |
| 2026Q4 (to 10-16) | 7 | 2.92 | 57.1 | +1.369 | [-0.04, +2.83] | 5.38 | +2,010 | -276 |

Only 2026Q3 has a CI above 0. Two quarters (2025Q4 and 2026Q2) have CIs entirely below 0.

### Where it works and where it fails (live replay trades, `regime_live.json`)

| cut | bucket: n, avg R (95% CI), net $ |
|---|---|
| prior VIX close | <15: 281, +0.04 [-0.09, +0.18], +$466 · **15-18: 290, +0.15 [-0.01, +0.32], +$11.7k** · 18-22: 212, -0.10 [-0.25, +0.07], -$4.0k · 22-28: 141, -0.06, -$3.8k · >28: 63, -0.04, -$0.2k |
| 20-day efficiency (trendiness) | **<0.15 rotational: 375, +0.10 [-0.04, +0.25], +$5.9k** · 0.15-0.30: 307, 0.00 · 0.30-0.45: 196, -0.01 · >0.45 trending: 103, -0.10 [-0.31, +0.12], -$3.2k |
| 20-day ADR (RTH pts) | <200: 232, +0.11, +$5.8k · 200-275: 419, 0.00, -$6.3k · 275-350: 165, 0.00 · 350-450: 129, -0.06 · >450: 36, +0.19 |
| 20-day return | flat (±1.5%): 241, +0.14 [-0.04, +0.33], +$6.9k · strongly up (>+5%): 175, -0.08 · strongly down (<-5%): 103, -0.08 |
| side by year | longs were negative in 2022-23 and positive in 2024-26; shorts were negative in 2021-22 and 2024-25, slightly positive in 2023, +0.33R in 2026 |
| trigger | CISD: 292, +0.11R, +$8.4k · IFVG: 695, -0.01R, -$4.2k |
| grade | A+: 35, +0.49R · A: 121, -0.14R · B: 193, -0.06R · C: 188, +0.03R · D: 450, +0.07R. The grade does not rank trades, so grade sizing adds noise. |

Monthly correlations of avg R with market descriptors are all weak: ADR +0.09, VIX -0.06, efficiency -0.15, monthly
return -0.13. No single regime switch explains the losing periods well enough to filter on. That is consistent with the
earlier finding that news and VIX filters did not explain the losing regimes.

## 3. Parameter and confluence search on five years

### 3a. Engine confluence search (`engine/confluence_search.py`, year folds)

Changes:
- Folds are now one per calendar year (`FOLD_MODE="year"`): F1 2021-10..2022-12, F2 2023, F3 2024 (decide), F4 2025,
  F5 2026 (confirm, `CONFIRM_FROM="2025-01-01"`).
- `engine/discovery.py` `SLICES` is now one slice per year (2022..2026) plus ES.

Result:
- **Nothing passed the adoption rule.** 76 tests and 30 backtests: 6 active, 10 probation, 65 retired.
- Under the search's flat sizing, the baseline already runs **5.3 trades a week in 2023**, above the 4.5 cap. Every
  variant that does not cut trades fails on that fold.
- The registry (`data/confluence_registry.json`) and `research/CONFLUENCE_LOG.md` were updated. The pre-run copy is
  `research/five_year/confluence_registry.pre5y.json`.
- Discovery (`data/discovery.json`, pre-run copy in `research/five_year/`) found 1 STABLE feature, "trigger closes
  weak", at 3% frequency, which is too rare to use, plus 8 LEANING and 90 NOISE out of 99.
- Candidate-level avg R by year: 2022 -0.02, 2023 +0.04, 2024 +0.06, 2025 -0.05, 2026 +0.08. The raw setup has about
  zero expectancy every year.

### 3b. Single-parameter and combination grid (`research/five_year/grid_full.json`, `grid_combo.json`)

Full 5-year run with default sizing and the reset fix. Train is 2021-10..2024-12. Test is 2025-01..2026-10. "Clean
test" is 2025-01..2026-07, which excludes Aug to Oct 2026, the window the defaults were tuned on. Baseline: train
-6.1R / -$465, test +22.9R / +$5.2k, clean test -11.4R / -$2.8k.

Variants that improved train and clean test while keeping 2.0 to 4.5 a week in every year:

| variant | train R / $ | clean test R / $ | test R / $ | trades a week by year (21..26) |
|---|---|---|---|---|
| baseline | -6.1 / -465 | -11.4 / -2,802 | +22.9 / +5,187 | 4.9 2.6 4.5 3.3 2.7 2.2 |
| **grade_sizing off + max_trades_day 1** | **+17.7 / +3,687** | **-2.2 / +2,602** | +29.9 / +12,274 | 3.8 2.9 3.7 3.4 3.0 2.3 |
| trend_model + grade off + max 1/day | -3.1 / -5,051 | +16.7 / +6,498 | +50.0 / +16,456 | 3.8 3.4 4.2 3.7 3.5 2.9 |

Some variants failed on frequency or because train got worse:
- `arm_minor: false`: train +12.4, clean +8.2, but 1.4 to 1.6 a week in 2022 and 2026.
- `ifvg_pick: outer`: 1.5 a week in 2022 and 2026.
- `w_lrl: 0`: 1.2 a week in 2026.
- `trend_model` alone: train +2.2, clean +26.4, but 4.7 to 5.3 a week in 2021, 2023 and 2025.
- `trend + arm_minor off + regime skip`: clean +41.5, but train -13.7R. It is a 2025-26 regime fit.

Rejected on both halves: wider or narrower `max_stop`, fixed or DOL targets, `min_rr 2`, BE changes, 15m IFVG,
trailing, a 15-min time stop, and AM-only.

Live-loop replay of the leading candidates (`summary_live_*.json`):

| params | 5y trades a week | avg R (95% CI) | net $ | train 21-24 R / $ | clean test R / $ | Aug-Oct 2026 | evals b2b pass/fail | rolling pass % | years' trades a week |
|---|---|---|---|---|---|---|---|---|---|
| defaults | 3.86 | +0.024 [-0.06, +0.10] | +4,106 | +0.9 / -5,182 | -14.0 / -2,068 | 31 tr, +$11,410 | 4/11 | 28.4 | 4.9 3.7 5.0 4.3 3.4 2.5 |
| `{"grade_sizing": false, "conviction_step": 0, "max_trades_day": 1}` | 3.14 | +0.057 [-0.04, +0.15] | +11,862 | +12.8 / -1,922 | +0.6 / +4,113 | 28 tr, +$9,774 | 7/12 | 34.8 | 3.9 3.0 4.0 3.3 2.9 2.2 |
| above + `"trend_model": true` | 3.58 | +0.054 [-0.04, +0.14] | +12,814 | +1.4 / -4,896 | +14.9 / +7,750 | 33 tr, +$10,061 | 9/15 | 30.8 | 3.9 3.6 4.2 3.8 3.4 2.8 |

### Proposed (not applied; the lead decides)

**Candidate A: `{"grade_sizing": false, "conviction_step": 0, "max_trades_day": 1}`.**

Evidence for:
- Better on train (+$3.3k / +11.9R) and on clean out-of-sample (+$6.2k / +14.6R). Better in 4 of 6 years.
- Every year sits in 2.2 to 4.0 trades a week, inside the owner's band. Defaults are at 5.0 in 2023.
- The eval pass rate goes up (34.8% vs 28.4% rolling; 7 vs 4 passes back-to-back).
- Aug to Oct 2026 drops from 31 to 28 trades and from $11.4k to $9.8k.
- The rationale is plain: the A+..D grade does not rank trades over 5 years (A and B lose, D wins), so sizing by it
  adds variance. The second trade of a day is net negative.

Evidence against:
- The 5-year avg R CI still includes 0, so this makes a weak setup less bad; it does not create an edge.
- 2026 runs at 2.2 a week, the edge of the band.

**Candidate B: A plus `trend_model: true`.**
- Adds +$3.6k on clean test, but is worse on train than A. The gain is 2025-26 only, so it is regime-specific.
- Not recommended until it holds in 2022-24.

**Recommendation for Monday: keep the live defaults.** Neither candidate clears a significance bar, and changing
parameters 2 days before launch on weak evidence is not justified. If the owner wants one change, Candidate A is the
only one that improves both halves without breaking the frequency rule.

## 4. Notes for the lead

- **No server restart is needed for correctness.**
  - The live bot runs with `live=True` and a 20-day window, so the reset never fires there, and the partner and cache
    changes are research-only.
  - The running server (port 8766) still has the old modules loaded. That is behaviourally identical for live
    trading.
  - Restart only if you want `/api/backtest` on the dashboard to give sane multi-year results; long dashboard
    backtests are starved until then.
- `engine/live.py` reads the full 17 MB `NQ_5m.csv` on every poll and trims to 20 days after. The QA harness measured
  a mean `poll_once` of 698 ms (max 3 s). That is OK, but trimming in `_read_hist` would be cheaper.
- **QA harness after the fix** (`python -X utf8 -m tests.test_live_dryrun --quick`): 41 of 44 assertions pass.
  - The replay matches the reference exactly: 10-13 09:35 L, 1 MNQ, TARGET 09:40.
  - On the clean data the 3-session window holds only 1 trade. The 10-15 13:55 short in the README came from the old
    Yahoo bars. Two assertions need at least 2 trades in that window ("late entry not chased" and "kill switch blocks
    later trades"), so they fail on fixture data, not on engine behaviour.
  - The third failure, "harness did not write data/live_state.json", is caused by the running paper server touching
    that file during the test.
  - Fix: move the replay window to sessions with 2 or more trades.
- ES 5-year harvest: features using SMT (`w_smt`, 0 by default) can be studied once it finishes. Nothing in the
  default NQ path depends on it.
