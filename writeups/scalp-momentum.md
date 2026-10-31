## Money first

**Best candidate: the noise-area momentum scalp ("NA scalp").** Every number has costs in. "$150 a trade" = the 25K's
risk per trade (micros = $150 / stop cost, at least 1). 2026 runs on 1m bars; 2021-25 is the same rule on 5m bars (no 1m
history before 2026).

| Span | Trades | /week | Weeks with 5+ | Win % | Avg R | PF | Net ($150 a trade) | **$ / month** | Max DD | Costs / gross |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 H1 (Jan-Jun, picked here) | 304 | 11.9 | 89% | 52.6 | +0.098 | 1.37 | +$4,870 | **+$799** | -$1,459 | 17% |
| **2026 H2 (Jul-Oct 16, untouched)** | 177 | 11.4 | 94% | 50.8 | +0.066 | **1.22** | **+$1,729** | **+$466** | -$1,251 | 25% |
| 2021-25 (5m, second check) | 2,681 | 12.5 | 92% | 48.6 | +0.007 | 1.02 | +$2,831 | +$55 | -$6,322 | 81% |
| of which 2025 | 636 | 12.3 | 85% | 48.9 | -0.003 | 1.00 | -$101 | -$8 | -$3,651 | ~100% |

**On the MFFU accounts** (a fresh eval started on every session; size = the share of the room to the trailing floor shown,
capped, never more than the soft daily loss allows; a wide stop still gets 1 micro while it fits half the room; "stuck" =
the room no longer fits two stop-outs, counted as dead):

| NA scalp | 2-week pass / fail (p10/f10) | decided in 2 wks | 3-week pass / fail | median sessions to pass | passes slower than 3 wks | eval passes / month (back to back) | funded $ / month to the owner |
|---|---:|---:|---:|---:|---:|---:|---:|
| Builder 25K, H1 (30% of room, max $600) | 21.0 / 4.2 | 25% | 30.7 / 21.1 | 9 | 12.5% | 0.66 | ~$100 |
| Builder 25K, **H2** | 21.7 / 18.8 | 41% | 23.4 / 42.2 | 6 | 3.8% | 0.81 | ~$0 (stuck) |
| Builder 25K, 2021-25 | 15.2 / 12.2 | 27% | 19.5 / 26.9 | 7 | 13.4% | 0.35 | ~$30 |
| Builder 50K, H1 (30% of room, max $1,200) | 23.5 / 1.7 | 25% | 36.0 / 4.4 | 9 | 16.3% | 0.33 | ~$175 |
| Builder 50K, **H2** | 27.5 / 0.0 | 28% | 37.5 / 9.4 | 7 | 5.0% | 0.81 | ~$30 |
| Builder 50K, 2021-25 | 16.7 / 3.8 | 21% | 20.5 / 12.3 | 6 | 13.8% | 0.29 | ~$95 |

In plain words: the edge is real but thin (about +0.07 to +0.10R a trade in 2026, nothing in 2021-25). With NQ near
26,000 the stop is about 60 points = $122 a micro, so the 25K can only carry 1-3 micros. Most evals neither pass nor fail
inside 2 weeks (the owner's 2-week rule is missed: only 25-41% are decided), and a funded account drifts into its trailing
floor before it earns payouts. **It is not yet a money-maker on a prop account.**

## The three candidates (exact rules)

All: CME NQ / MNQ, ET times, one position at a time, entries at the next bar's open after the signal bar closes (+1 tick),
stop orders fill 1 tick worse, targets are limits, flat at 15:55, max 6 trades a day, stop for the day at -3R.

**1. NA scalp (noise-area momentum, 1m)** - the pick (`tools/scalp_mo_pick.py` "na_scalp").
- Noise band: for every minute of the day, sigma = the average of |close / 09:30 open - 1| at that minute over the last 14
  sessions. Upper = today's 09:30 open x (1 + sigma), lower = open x (1 - sigma).
- Checked only at the bar closes at :00 and :30 (10:30 ... 15:00). Close above the upper band = buy; below the lower = sell.
  If flat, re-entries are allowed at the next check.
- Stop: 1.5 x the 14-bar ATR of 5-minute bars (about 60 pts in 2026). No fixed target: after +1R the stop trails 1.5R
  behind the best price. Out at market after 30 minutes (or 15:55).
- Size (eval): 30% of the room to the trailing floor, max $600 on the 25K / $1,200 on the 50K.
- How 2026's 481 trades ended: 72% at the 30-minute clock, 22% at the stop (first stop or trail), 7% at 15:55. In practice
  it is "ride the band break for 30 minutes, with a wide safety stop".

**2. 5m displacement continuation** ("disp_5m"): a 5-minute candle with a body > 1.75 x the previous ATR(14), closing in its
outer quarter, 09:30-15:30 -> market in its direction at the next open; stop 1 tick beyond the candle; target 2R; out after
60 minutes. 2026 H1 PF 1.27 (+$4,266, 6.9/wk), H2 PF 1.21 (+$1,644, 5.8/wk), 2021-25 PF 0.99 (-$1,094). Stop ~95 pts in 2026
(1 micro on the 25K). 25K eval: H1 2-week 42.9 pass / 41.2 fail, H2 10.1 / 46.4 - a coin flip that got worse. Random
directions: H1 p 0.025, H2 p 0.33 (no proof in H2).

**3. Trend-day add-on scalps** ("trendday_1m"): the 09:30-10:30 range is >= 1.2 x its 20-day average and the 10:30 close sits
in the outer 35% of that range -> trade only that side until 15:30: a 1m close beyond the prior 24 minutes' high/low, stop
beyond the last 6 minutes, trail 0.5R after +0.5R, out after 60 minutes. Win rate 70%, H1 PF 1.66 (+$2,751), H2 PF 1.24
(+$543) but only 3.8 trades a week in H2 (below the 5/week target) and 2021-25 PF 0.83 (-$7,504). 25K eval H2 4.3 / 7.2.

**All three on one account** ("combo", one position, 6 a day, -3R day stop): 17-18 trades a week, H1 PF 1.32 (+$8,487),
H2 PF 1.14 (+$2,096), 2021-25 PF 0.98 (-$4,813). 25K 2-week pass / fail H1 46.2 / 30.3, H2 30.4 / 39.1; 50K 54.6 / 11.8 and
29.0 / 26.1. More trades, but the two weaker members dilute the NA edge and the H2 eval is worse than NA alone.

## What was searched (no strategy idea skipped)

10,166 settings (rule x daily limit), each run on 1m (2026) and 5m (2021-26); round-1 grids with two daily limits (3 trades / -2R, 6 trades / -3R). "Top 20" =
the 20 best settings on 2026 H1 (t-stat of avg R, >= 5 trades a week); then how many of them stay positive.

| Family | bars | settings | >= 5/wk in H1 | top-20 positive in H2 | top-20 positive 2021-25 | positive H1 + H2 | positive in all three |
|---|---|---:|---:|---:|---:|---:|---:|
| Opening-range breakout, stop order (London 03:00 / NY 09:30; 5/15/30 min; opp / mid / ATR stop; 1-2R, BE, trail) | 1m | 720 | 340 | 0 | 2 | 0 | 0 |
|  | 5m | 720 | 340 | 6 | 10 | 6 | 0 |
| Opening-range breakout, close confirmation | 1m | 720 | 360 | 0 | 4 | 6 | 0 |
|  | 5m | 720 | 360 | 0 | 6 | 26 | 4 |
| Displacement candle -> 50% / FVG limit / market (round 1 + 2) | 1m | 2,858 | 2,246 | 0-6 | 2-5 | 2 | 0 |
|  | 5m | 2,858 | 1,514 | 14-19 | 0-3 | 504 | 44 |
| 1m/5m CISD continuation with the 15m / 1h trend | 1m | 360 | 280 | 0 | 11 | 4 | 0 |
| EMA 9/21/50 pullback in the 15m / 1h trend | 1m | 360 | 360 | 10 | 0 | 17 | 0 |
|  | 5m | 360 | 354 | 4 | 0 | 61 | 0 |
| N-bar breakout (6-24 min) in the 1h / 15m / VWAP trend | 1m | 540 | 480 | 0 | 0 | 4 | 0 |
|  | 5m | 540 | 480 | 12 | 0 | 64 | 0 |
| 08:30 / 10:00 news bar continuation | both | 360 | 0 (max ~2/wk) | - | - | - | - |
| Trend-day detection + add-on scalps (round 1 + 2) | 1m | 888 | 671 | 15-18 | 1-2 | 197 | 4 |
|  | 5m | 888 | 501 | 10-12 | 0 | 119 | 0 |
| ES leads NQ (ES new RTH high/low first; ES 5m from 2025-04) | 5m | 120 | 62 | 7 | 0 | 26 | 0 |
| **Noise-area momentum scalp (round 1 + 2)** | 1m | 3,240 | 2,309 | 6-11 | **16-20** | 462 | **407** |
|  | 5m | 3,240 | 2,405 | 4-13 | **18-20** | 540 | **471** |

What this says:
- **Breakouts and pullbacks with the trend do not hold after costs.** On 1m, 2026 H2 punished every breakout family (only
  2-7% of ORB / N-bar settings are positive in H2). Matches the earlier ORB / continuation rejections (`allday.md`,
  `atlas-chatgpt-breakouts.md`, `hq-continuation.md`).
- **Tight stops lose.** NA with a 1 x 5m-ATR stop (~40 pts) is positive in only 22% of H1 settings and 38% of 2021-25
  ones (1.5 x: 50% / 81%, 2 x: 68% / 90%), as the rejected list says for fixed 10-15 pt stops.
- **2026-only edges:** the 5m displacement and the trend-day add-ons work in both 2026 halves, not in 2021-25.
- **The noise-area family is the one that holds:** positive in all three periods in 400+ settings on each timeframe, and the
  pick's neighbourhood (every 30 min, band 1.0-1.25, stop 1.5-2 ATR, 10:30-15:30, 80 settings) is 100% positive in H1, 99%
  in H2 and 82% in 2021-25 (median H2 PF 1.23). The same Zarattini 2024 idea held as a slower trade in
  `diversifier-search.md`; as a 30-minute scalp it trades 4x as often.

## Honesty checks
- **Random directions** (same signal bars, coin-flip side, stop at the same distance, 40-60 seeds): NA real avg R +0.098 vs
  -0.011 (H1, p 0.025), +0.066 vs -0.003 (H2, p 0.15), +0.007 vs -0.035 (2021-25, p < 0.025). The direction carries the edge;
  H2 alone is not proof (4 months).
- **Look-ahead:** signals and fills rebuilt on data cut at 13:00 on 6 random 2026 days = the full-data trades (0 differ).
  Higher-timeframe values only use completed bars.
- **Slippage stress:** one more tick on every market-side fill: avg R H1 0.098 -> 0.090, H2 0.066 -> 0.057, 2021-25 0.007 ->
  -0.006 (2021-25 turns slightly negative).
- **Fills:** a 1m bar that touches both stop and target is a loss; a stop or limit entry bar only books its target if it
  closes beyond it; limits need a 1-tick trade-through. 1m data starts 2025-12-28, so NA (14-day band) trades from
  2026-01-20 (H1 frequency slightly understated).
- **Picking:** each pick is the best 2026 H1 setting (t-stat) with at least 5 trades a week; H2 and 2021-25 were never used
  to choose. Eval sizes were picked on H1 too.

## Verdict
- **Holds in both 2026 halves after costs:** the NA scalp (PF 1.37 / 1.22, 11-12 trades a week, direction beats random,
  broad plateau). The 5m displacement (1.27 / 1.21) and trend-day add-ons (1.66 / 1.24, but 3.8 a week in H2) also hold in
  2026 only.
- **Holds in 2021-25:** only NA, and only at break-even (PF 1.02, +$55 a month at $150 a trade, negative with one more tick).
- **As a third MFFU account:** not good enough yet. 25K: 21% pass in 2 weeks, 4-19% fail, most evals undecided; funded pays
  about $0-100 a month. 50K: 24-28% pass, 0-2% fail in 2 weeks, funded ~$30-175 a month. The problem is the stop: NQ needs
  ~60-point stops for this edge, which a $1,000 trailing loss cannot carry at a size that matters.
- **Next, if wanted:** paper-trade the NA scalp (cheap to build: one band, a 30-minute clock, a trail) next to LIT to collect
  real fills; test it on the 50K or a firm with a larger loss limit; it is close to uncorrelated with LIT's reversal entries.
  Nothing was built or switched; `live_model*.json`, `second_model.json` and the engine are untouched.

Files: `tools/scalp_mo_lib.py` (bars, executor, eval / funded simulators), `tools/scalp_mo.py` (families, grids),
`tools/scalp_mo_ana.py` (grid summaries), `tools/scalp_mo_pick.py` (picks, placebo, look-ahead, runs);
`research/scalp/mo_grid_*.json`, `mo_picks.json`, `mo_best_trades.json` (every NA scalp 2026 trade).
