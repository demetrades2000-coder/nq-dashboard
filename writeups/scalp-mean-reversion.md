# Mean-reversion scalps for a third account (2026-10-28)

**Short answer: no mean-reversion scalp makes money in both 2026 and 2021-25 after costs. None should be built as a
real-money strategy.** The best one makes about +$270 to +$360 a month in each 2026 half at $100 risk a trade. The same
idea on 5m bars loses about $320 a month over 2021-25. Its prop-eval pass rate is no better than a coin flip.

Research only. No engine, live or dashboard files were changed. Owner's question: "find a scalp that trades several times
a day on its own MFFU account and makes money".

## Money first: the three best candidates

Money is shown at a fixed **$100 risk a trade** on a Builder 25K (size = $100 / (stop $ + costs), max 20 micros, $600
soft daily loss). Eval columns use the fastest size that does not simply blow up: **$300 risk on the 25K, $600 on the
50K**, capped at half the room to the floor, with a fresh eval started on every session. 2026 is tested on 1m bars and
2021-25 on 5m bars.

| Candidate | Span | Trades/wk | Win % | PF | Net $ | $/month | Max DD $ | Costs $ (gross $) | 25K pass/fail in 2 wks | 50K pass/fail in 2 wks |
|---|---|---|---|---|---|---|---|---|---|---|
| **1. RTH-VWAP 2.5-sd fade** (`vwap25`) | H1 2026 | 16.8 | 45.8 | 1.14 | +2,212 | +363 | -1,500 | 2,674 (4,886) | 35.2 / 31.2 | 36.7 / 33.6 |
| | H2 2026 | 14.8 | 45.5 | 1.13 | +1,018 | +274 | -1,390 | 1,456 (2,474) | 32.1 / 20.5 | 34.6 / 28.2 |
| | 2021-25 (5m) | 10.4 | 39.7 | 0.84 | -16,204 | -316 | -16,464 | 12,398 (-3,934) | 9.1 / 29.2 | 8.4 / 33.1 |
| **2. Same, range days only** (`vwap25_flat`) | H1 2026 | 7.6 | 47.4 | 1.22 | +1,389 | +228 | -742 | 1,163 (2,552) | 28.1 / 11.7 | 28.9 / 7.0 |
| | H2 2026 | 6.9 | 47.2 | 1.20 | +707 | +190 | -1,060 | 710 (1,417) | 12.8 / 6.4 | 15.4 / 0.0 |
| | 2021-25 (5m) | 3.5 | 38.9 | 0.80 | -6,492 | -127 | -7,526 | 4,144 (-2,348) | 1.7 / 11.8 | 1.4 / 11.6 |
| **3. Level sweep-and-reclaim, target VWAP** (`levels_am`) | H1 2026 | 11.4 | 19.2 | 1.56 | +10,081 | +1,654 | -2,461 | 2,706 (12,787) | 32.0 / 53.1 | 25.8 / 60.9 |
| | H2 2026 | 11.0 | 14.0 | 0.62 | -4,815 | -1,296 | -5,195 | 1,525 (-3,290) | 10.3 / 56.4 | 10.3 / 61.5 |
| | 2021-25 (5m) | 8.3 | 28.3 | 0.82 | -18,270 | -356 | -22,687 | 14,955 (-3,314) | 13.8 / 70.8 | 14.3 / 72.8 |

Other eval figures (in `research/scalp/mr_final.json`): for candidate 1 on the 25K the median pass takes 5-6 sessions
when it passes. About 54-68% of evals are decided within 2 weeks. For comparison, LIT's 50K 2-week pass/fail is about 58 / 21.

**What the costs do.** The costs column is commission ($1.90 a micro round trip) plus 1 tick of slippage on each market or
stop fill. For candidate 1 in 2026 they take about **55-60% of the profit before costs**. In 2021-25 the trades lose
money even before costs.

## The rules (exact)

The rules below are common to all three. Times are ET, entries 09:30-15:30 (candidate 3: 09:30-12:00), flat at 15:55.
There is one position at a time and at most 8 trades a day. The signal is read at a 1m bar's close and the entry is a
MARKET order at the next bar's open, filled 1 tick worse. The stop fills 1 tick worse (or at the bar's open if price
gapped through it). The target is a limit and fills only if price trades 1 tick through it. When the stop and the target
are both inside one bar, the stop is assumed. Stops of 3 to 40 points only.

1. **RTH-VWAP 2.5-sd band fade.** The VWAP is anchored at 09:30, with volume-weighted standard deviation (sd) bands.
   - Long: in the last 2 bars price traded below VWAP - 2.5 sd. The bar then closes back above that band and closes up.
   - Short: the mirror image.
   - Stop: 1 tick beyond the lowest low (or highest high) of those 2 bars.
   - Target: 1.5R, rounded to the tick, never closer.
   - Time stop: exit at market after 45 bars (45 minutes).
   - No trend filter.
2. **Range days only.** Same as 1, but trades only when the session VWAP (anchored at 18:00) has moved less than 0.5
   ATR(14, 1m) over the last 30 bars.
3. **Level sweep-and-reclaim.** The levels are:
   - the prior day's RTH high and low;
   - the overnight high and low (18:00-09:30);
   - the Asia high and low (18:00-02:00);
   - the London high and low (02:00-05:00);
   - the 09:30-09:45 opening range;
   - the 09:30-10:30 initial balance.

   A level counts only once its window has closed. The rules:
   - Long: price was above the level. A bar's low breaks it by at least 1 tick and by at most 20 points. Within 2 bars a
     bar closes back above it.
   - Short: the mirror image.
   - Stop: 1 tick beyond the sweep extreme.
   - Target: VWAP at the signal, only if it is at least 0.5R away.
   - Limits: one signal per level per day; 45-minute time stop.

Per-trade list of candidate 1 for 2026: `research/scalp/mr_best_trades.json` (661 trades; fields entry_t, exit_t, dir,
entry, stop, target, exit, exit_kind, pts, risk_pts, r_net). This list is so the rule can be rebuilt or checked. It is
not a recommendation to trade it.

## What was searched

The search covered 1,186 signal settings and 87,920 configurations in total (signal × window × target × time stop ×
breakeven). Every configuration was run on 1m bars for 2026 and on 5m bars for 2021-10 to 2026-10.

- **Signal families:**
  - VWAP band fades: session or RTH anchor, 1.5-3 sd, "close back inside" or "reversal bar" confirmation, target VWAP,
    the 1-sd band or 0.75-2R, trend filters with / against / range-day.
  - Resting limit orders at the band.
  - Sweep-and-reclaim of the prior day, overnight, Asia, London, opening range and initial balance levels.
  - N-bar swing high/low sweeps ("turtle soup").
  - Round-number (50 / 100) sweeps.
  - RSI(2/3/7) extremes with a turn bar.
  - ATR stretch from EMA20/50.
  - ES-NQ divergence (NQ sweeps a 30-120 min low while ES holds; ES 5m data starts 2025-04).
- **Windows:** London 03:00-05:00 and 02:00-07:00; Asia 18:00-02:00; night 00:00-03:00; NY open 09:30-11:00; AM;
  lunch; PM; all RTH; 03:00-15:30.

**Results by family (median net R a trade).**

| Family | 1m 2026 H1 | 1m 2026 H2 | 5m 2021-24 | 5m 2025 | Settings positive in every 5m span |
|---|---|---|---|---|---|
| VWAP band fade | -0.10 | -0.11 | -0.11 | -0.09 | 26 of 20,615 (all under 4/wk, PF about 1.0) |
| Level sweep-reclaim | -0.12 | -0.27 | -0.19 | -0.18 | 51 of 19,108 (all under 1/wk) |
| Swing (turtle soup) | -0.24 | -0.24 | -0.24 | -0.27 | 0 |
| Round numbers | -0.23 | -0.27 | -0.25 | -0.26 | 0 |
| RSI extremes | -0.17 | -0.20 | -0.16 | -0.14 | 8 |
| ATR stretch | -0.18 | -0.18 | -0.15 | -0.11 | 0 |
| Limit at the band | -0.20 | -0.15 | -0.16 | -0.14 | 1 |
| ES-NQ divergence | all of 36 settings negative in both 2026 halves | | | | |

- **The overfit test.** Picking on H1 and checking on H2 fails. Of the 2,036 settings with net profit in H1 (at 5+ a week),
  only 16% were also positive in H2, which is worse than a coin flip. The 30 best H1 settings were all level
  sweep-reclaims with PF 1.5-2.1 in H1, and every one of them lost in H2 (PF 0.4-0.7).
- **Searching on 5 years first** is the more powerful test, with thousands of trades. Of 87,920 settings on 5m, exactly
  **one** made money in 2021-24 at 5+ trades a week, and it lost in 2025.
- **The overnight sessions are the worst.** Asia, night and London lose in every family: the stops are small, so the costs
  are a big share of each trade.
- **Random entries are a fair baseline.** Random entries with the same 2-bar stop and a 1.5R target come out at -0.12 to
  -0.29R a trade in 2026. A coin flip at $300 risk on the 25K "passes" 3-11% and fails 17-37% in 2 weeks. Candidate 1 is
  better than random in 2026, but its 5m twin is worse than random over 2021-25.

Why it fails: on NQ, intraday stretches tend to keep going more often than they snap back. The diversifier search found
the same thing: the noise-area momentum effect is real on NQ, so its mirror image, fading, loses. Scalps with small
stops then pay about 0.1-0.15R a trade in costs on top of that.

## A trap found and fixed (worth knowing for any limit-order backtest)

The first run showed the "limit at the RTH-VWAP 2-sd band, stop 0.5 sd" fade earning **+$15.9k in H1 and +$8.9k in H2,
with 119 of 131 settings positive in both halves**. That result was a simulator bug. A bar that traded through the limit
AND the stop was counted as "not filled" instead of "filled, then stopped". Every trade that would have lost straight
away was therefore dropped. Two signs gave it away:

- on 5m bars the rule looked better still (PF 2), which is backwards;
- when the same 5m signals were run on 1m bars, the "extra" 1m trades were almost all -1R.

After the fix the limit fade is PF 0.7-0.8 in every span. The fix is in `tools/scalp_mr_lib._sim`: a bar that reaches the
stop has traded through the limit first. Any limit-entry backtest in this repo should be checked for the same bug.

**The 5m check is a different rule.** There is no 1m data before 2026, so the 2021-25 line uses the 5m version of each
rule. On 5m, "2 bars" means 10 minutes and the bands come from 5m bars. Run over 2026, that 5m version of candidate 1 is
weaker than the 1m rule: -0.09R in H1 and +0.06R in H2. So the 1m rule has only ever been seen working on the 10 months
it was found on. The neighbouring settings make it look fragile:

- 1.0R instead of 1.5R gives -10R in H1 and -6R in H2;
- bars m = 4 instead of 2 gives about 0;
- k = 2.0 instead of 2.5 loses in both halves.

## Verdict

- **Nothing holds in both 2026 halves and in 2021-25 after costs.** Candidate 1 is positive in both 2026 halves (PF 1.13-1.14,
  about +$270 to +$360 a month at $100 risk). But it was chosen by looking at both halves, so H2 is not a clean check for
  it. It sits on a narrow peak of its settings, and its 5m version loses $16k over 2021-25. On an eval it is a coin flip:
  about 33-35% pass and 20-31% fail within 2 weeks on the 25K, against LIT's 58 / 21 on the 50K.
- **Do not build any of these for real money or for an eval.** If the owner still wants a third high-frequency line,
  candidate 1 could run as a paper-only shadow (never routed) to collect live evidence. That is a low-value option.
  This search does not support a mean-reversion scalp on NQ.
- The momentum / breakout side is being searched separately (`tools/scalp_mo*.py`).

## Files and runs

- Code:
  - `tools/scalp_mr_lib.py`: data, features, the numba fill simulator, stats, the MFFU Builder 25K/50K eval simulator,
    money.
  - `tools/scalp_mr_sig.py`: the signals.
  - `tools/scalp_mr_search.py`: the grid (`python tools/scalp_mr_search.py 1m|5m`).
  - `tools/scalp_mr_check.py`: ranking.
  - `tools/scalp_mr_final.py`: the table above, the runs and the trade list.
- Data:
  - `research/scalp/mr_final.json`: every number in the table, plus p15/f15, p20, dec10, pass_med and slow_pass.
  - `research/scalp/mr_picks.json`: family summary, top H1 picks with their H2, settings positive in both halves, top 5m
    settings.
  - `research/scalp/mr_best_trades.json`.
  - The full grids `mr_grid_1m.json` and `mr_grid_5m.json` are local only (gitignored).
- Runs (status "rejected"): `mr_scalp_vwap25`, `mr_scalp_vwap25_flat`, `mr_scalp_levels_am`. They are stored for the runs
  page with 2026 on 1m and 2021-25 on 5m, sized at a static $200 a trade on the 50K. The runs page's eval columns use
  the 50K rule.
