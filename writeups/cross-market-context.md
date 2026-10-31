## The short answer

The strategy's trades were tagged with everything a trader could know about the wider market at the moment of entry: how
NQ was doing against ES, whether ES confirmed the sweep (SMT), where the VIX was and how it had moved, the VXN/VIX
ratio, the dealer-gamma (GEX) reading from the day before, the 5/10/15/20-day trend readings, and the shape of the entry
day so far (gap, opening range, range used up, direction of the day). Every tag was then checked on the locked strategy's
exact live-loop replay (768 trades, costs included, live sizing: quarter size in cold streaks, half size on late
entries, breakeven at +3R on trending days) in 2026 and in 2021-25 separately.

- **Nothing in the wider market is a strong, repeatable filter.** Most tags look useful in one period and useless or
  backwards in the other. 25 of the 32 size rules tested were rejected on the owner's rule (better money AND better
  profit factor in both periods).
- **One small rule passes:** half size when both the 10-day and the 20-day trend readings say "trending". It is a
  month-long trend; the sweep-and-reverse setup fights it and loses in every year it occurs. The gain is small
  (+$378 in 2026, +$677 in 2021-25, about $200 a year), the 2026 sample is 12 trades, and a random group of the same
  size does as well 4% of the time. It is a candidate, not a sure thing.
- **The real lead is the trend lookback itself.** The live rule halves the size when the 10-day efficiency is above
  0.45. Those days are not actually bad (they made money in both periods). The days that lose are the ones where the
  **20-day** efficiency is high. Swapping the test (size only, approximate) gives 2026 +$22.6k instead of +$20.5k and
  2021-25 +$21.9k instead of +$16.4k, with the same or better drawdown, but more evals fail within a month in 2021-25
  (8.6% instead of 5.2%). An exact test needs two things that do not exist yet: an engine option for the lookback, and a
  live data window of 30+ days (today's live loop sees 20 calendar days, about 14 sessions, not enough to compute a 20-day
  reading).
- ES data only starts in April 2025, so everything about ES (relative strength, SMT) is **information only**: 203 trades,
  of which 89 are in 2026.

## The lock these numbers are compared with

| | 2026 | 2021-25 |
|---|---:|---:|
| Trades, per week | 89, 2.16 | 679, 3.17 |
| Profit factor | 3.94 | 1.27 |
| Net, per month | +$20,487, $2,088 | +$16,379, $321 |
| Max drawdown | -$2,249 | -$9,265 |
| Eval passed / failed within 2 weeks | 20.4% / 0.0% | 4.1% / 1.9% |
| Eval passed / failed within 1 month | 34.0% / 0.0% | 8.8% / 5.2% |
| Back-to-back evals passed / failed | 4 / 1 | 8 / 10 |

Every size rule below keeps every trade (2.16 and 3.17 trades a week stay the same); only the number of micros changes.

## 1. Trend lookback: 10 days (live) vs 20 days

"Efficiency" is how straight the market travelled over the last N sessions: the net move divided by the sum of the daily
moves. 1.0 is a straight line, near 0 is a range. The live rule calls a day "trending" when the 10-day reading is above
0.45 and then trades half size and moves to breakeven only at +3R.

| 10-day reading (live test) | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| up to 0.25 (rotational) | 42, +0.65R, +$16,590, 6.41 | 292, 0.00R, +$4,970, 1.16 |
| 0.25-0.45 | 29, +0.20R, +$2,798, 2.15 | 204, +0.03R, +$5,944, 1.31 |
| above 0.45 (trending, half size) | 18, +0.19R, +$1,099, 1.75 | 183, +0.01R, +$5,465, 1.53 |

| 20-day reading | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| up to 0.25 | 56, +0.39R, +$12,433, 3.64 | 415, +0.07R, +$13,043, 1.31 |
| 0.25-0.45 | 18, +1.19R, +$9,434, 13.7 | 194, -0.10R, +$1,561, 1.11 |
| above 0.45 | 15, -0.47R, -$1,380, 0.10 | 66, -0.13R, -$281, 0.93 |

The 10-day "trending" bucket is **positive in both periods** (it is the best bucket of 2021-25 by profit factor), so
halving it costs money. The 20-day "trending" bucket is **negative in both periods**. Crossing the two:

| 10-day vs 20-day | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| both rotational | 61, +0.55R, +$16,347, 4.55 | 409, +0.03R, +$7,462, 1.17 |
| 10-day rotational, 20-day trending (> 0.35) | 10, -0.06R, +$3,040, 4.41 | 86, -0.04R, +$3,672, 1.58 |
| 10-day trending, 20-day rotational | 6, +0.96R, +$1,766, 4.69 | 105, +0.09R, +$4,650, 1.81 |
| **both trending** | **12, -0.19R, -$667, 0.33** | **75, -0.17R, -$1,461, 0.67** |

The live rule halves the "10-day trending, 20-day rotational" days, which are good days in both periods (a one-to-two-week
push inside a range). The losers are the days where the push has lasted a month.

### Size rules on the trend readings

| rule | 2026 net ($/mo), PF, max DD, 1-month evals | 2021-25 net ($/mo), PF, max DD, 1-month evals | status |
|---|---|---|---|
| lock | +$20,487 ($2,088), 3.94, -$2,249, 34.0 / 0.0 | +$16,379 ($321), 1.27, -$9,265, 8.8 / 5.2 | |
| **half size when both readings trend** (`xm_both_trend_half`) | +$20,865 ($2,127), 4.16, -$1,871, 34.0 / 0.0 | +$17,056 ($334), 1.29, -$9,181, 9.0 / 5.2 | **adopt-candidate** |
| quarter size when both readings trend (`xm_both_trend_quarter`) | +$20,987, 4.24, -$1,748, 34.0 / 0.0 | +$17,214, 1.29, -$9,179, 9.0 / 5.2 | promising |
| half size when the 20-day reading > 0.45, on top of the live rule (`xm_er20_45_half`) | +$21,040, 4.28, -$1,696, 34.0 / 0.0 | +$16,266, 1.27, -$8,963, 8.3 / 5.2 | promising (2021-25 -$113) |
| half size when the 20-day reading > 0.35, on top (`xm_er20_trend_half`) | +$19,200, 4.05 | +$14,455, 1.25 | rejected |
| **swap**: no half on the 10-day test, half when the 20-day reading > 0.45 (`xm_er20_swap_45`) | +$22,582 ($2,302), 4.09, -$2,454, 34.0 / 0.0 | +$21,941 ($430), 1.32, -$9,011, 10.6 / 8.6 | promising |
| swap with a 0.35 cut on 20 days (`xm_er20_only`) | +$20,589, 3.88, -$2,429, 27.7 / 0.0 | +$20,705, 1.32, -$8,411, 9.3 / 5.2 | promising |
| control: just remove the 10-day half (not saved) | +$21,586, 3.56, -$3,449, fails 4.9% | +$21,844, 1.31, -$9,067, 10.9 / 8.1 | |

How to read the swap: most of its 2021-25 gain comes from **not** halving the 10-day trending days (the control row:
+$21.8k on its own), which repeats what an earlier study found (`flt_regime_off`: trending days at full size help
2021-25 and hurt 2026). The 20-day half is what then **repairs 2026**: profit factor 3.56 back to 4.09, drawdown -$3.4k
back to -$2.5k, no failed evals. Together they pass the money test in both periods. The costs: more days trade full size,
so more 2021-25 evals fail within a month (5.2% to 8.6%), and the back-to-back chain goes 8/10 to 9/11.

Why it is only "promising": this is a size-only approximation. The engine's own half size was undone by doubling (rounding
differs on small positions), and the breakeven-at-+3R exit still follows the 10-day test. A proper test needs an engine
option for the regime lookback (20 days, cut 0.45) with the exit following the same test, run as an exact replay. It also
needs the live loop (PC bot and the cloud monitor) to load 30+ calendar days of bars instead of 20; today a 20-day reading
cannot be computed live at all.

**Robustness of the both-trend rule.** Every combination of cut points tried (10-day 0.40 / 0.45 / 0.50 times 20-day
0.30 / 0.35 / 0.40 / 0.45) is better than the lock in 2026 (+$380 to +$550) and equal or better in 2021-25 (+$0 to
+$680). By year: 2023 +$73, 2024 +$315, 2025 +$288, 2026 +$378; 2021 and 2022 unchanged (those trades were already at
1 micro because of the cold-streak quarter size). **Chance benchmark:** halving a random group of 12 trades in 2026 and
75 in 2021-25 beats the lock in both periods 4.3% of the time, and the rule's 2026 gain is above the 90th percentile of
those random groups, the 2021-25 gain around the 80th. With about 30 rules tested in this study, one such result is
roughly what chance would hand out, so treat it as a sensible, cheap, small improvement rather than a proven edge.

## 2. VIX: level and 1-day change

| VIX prior close | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| below 15 | 11, +0.97R, +$3,135, 5.05 | 187, -0.06R, +$3,276, 1.20 |
| 15-20 | 65, +0.33R, +$16,804, 4.34 | 270, +0.11R, +$13,722, 1.57 |
| 20-25 | 7, -0.20R, -$624, 0.00 | 131, -0.05R, -$1,698, 0.87 |
| 25 and up | 6, +0.96R, +$1,172, 3.14 | 91, -0.05R, +$1,079, 1.15 |

| VIX 1-day change | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| down more than 5% | 21, +0.22R, +$3,676, 5.41 | 130, -0.01R, +$4,163, 1.30 |
| within 5% | 54, +0.47R, +$13,021, 3.93 | 434, +0.06R, +$14,049, 1.41 |
| up more than 5% | 14, +0.47R, +$3,790, 3.24 | 115, -0.13R, -$1,833, 0.86 |

VIX 20-25 is the only level that lost money in both periods, but in 2026 that is 7 trades and VIX 25+ was fine, so there
is no clean cut. A VIX jump into the trade day hurt in 2021-25 (PF 0.86) and did not in 2026 (PF 3.24).

| rule | 2026 net, PF, max DD | 2021-25 net, PF, max DD, 1-month evals | status |
|---|---|---|---|
| half size when VIX is 20+ (`xm_vix20_half`) | +$20,095, 4.17, -$2,170 | +$15,986, 1.30, -$6,876, 8.6 / 3.0 | rejected |
| half size after a VIX jump > 5% (`xm_vixup5_half`) | +$18,485, 4.05 | +$16,976, 1.31, -$8,549 | rejected |
| 125% size after a VIX jump > 5% (`xm_vixup5_x125`) | +$21,067, 3.91 | +$16,278, 1.26, -$9,482 | rejected |

The VIX-20 half size was "promising" in the bias study on the old settings (it added $2.5k to 2021-25). On the locked
settings it no longer adds money in either period (-$400 and -$400). What it still does is cut the 2021-25 drawdown from
-$9.3k to -$6.9k and the 1-month eval fails from 5.2% to 3.0%, at a cost of $400 over five years. That is a drawdown
trade-off for the owner to decide, not a money improvement.

## 3. VXN / VIX ratio (Nasdaq fear relative to S&P fear)

| VXN / VIX, prior closes | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| below 1.15 | 8, +0.71R, +$1,165, 3.10 | 74, +0.09R, +$996, 1.13 |
| 1.15-1.25 | 9, +0.62R, +$3,327, 5.57 | 252, +0.03R, +$9,229, 1.41 |
| 1.25-1.35 | 24, +0.08R, +$5,008, 2.99 | 294, -0.08R, -$1,361, 0.95 |
| 1.35 and up | 48, +0.48R, +$10,987, 4.46 | 59, +0.30R, +$7,515, 2.37 |

The 1.25-1.35 band is the weak one in both periods and 1.35+ is strong in both, but the ratio is a regime marker, not a
trade filter: 2026 sits above 1.35 more than half the time (48 of 89 trades), 2021-25 almost never (59 of 679). Half
size in the middle band (`xm_vxn_mid_half`) gives the smallest drawdowns of the whole study (-$1,989 and -$5,802, 1-month
fails 2.5%) but costs $2.7k in 2026 and $0.7k in 2021-25: rejected. Half size above 1.35 (`xm_vxnvix_hi_half`) is plainly
wrong (2026 +$14.2k, 2021-25 +$12.4k); below 1.15 (`xm_vxnvix_lo_half`) changes little and loses a bit in both.

## 4. Dealer gamma (GEX) and DIX

`data/GEX_1d.csv` covers 2011-05-02 to 2026-10-16 (SPX gamma exposure and DIX), so every trade has a reading from the day
before. Negative gamma is rare on the trade days: 4 trades in 2026, 83 in 2021-25.

| gamma sign, prior day | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| negative | 4, +1.69R, +$1,707 | 83, -0.04R, +$2,361, 1.46 |
| positive | 85, +0.35R, +$18,780, 3.70 | 596, +0.02R, +$14,019, 1.25 |

| gamma 1-year percentile | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| 0-25 (low) | 21, +0.36R, +$4,544, 3.83 | 121, +0.04R, +$1,629, 1.15 |
| 25-50 | 31, +0.26R, +$9,084, 4.79 | 143, -0.06R, -$1,163, 0.92 |
| 50-75 | 15, +0.26R, +$1,599, 2.04 | 169, +0.10R, +$11,503, 1.73 |
| 75-100 (high) | 22, +0.78R, +$5,260, 4.70 | 246, -0.02R, +$4,410, 1.22 |

No pattern repeats: the best percentile band of 2021-25 (50-75) is the worst of 2026. DIX is the same story (its best
2021-25 band, 0.40-0.43 with +0.66R, is negative in 2026). Rules: half size on negative gamma (`xm_gexneg_half`) loses in
both periods; half size on low gamma (`xm_gexlow_half`) loses in both; leaning in on negative gamma (`xm_gexneg_x125`)
changes 2026 by $0 and 2021-25 by +$0.7k, which is no evidence. **Gamma says nothing useful about these trades.**

## 5. NQ vs ES relative strength at entry (information only, 2025-04 onward)

ES 5-minute data exists from 2025-04-13 (TradingView ES1!, all of it), so 203 trades carry an ES
reading: 89 in 2026 and 114 in April-December 2025. "NQ leads" means NQ had moved more than ES in the trade's direction,
in percent, before the trigger.

| NQ vs ES since the 18:00 ET open | 2026: n, avg R, net, PF | 2025 Apr-Dec: n, avg R, net, PF |
|---|---|---|
| NQ lags (more than 0.3% behind) | 21, +0.34R, +$4,573, 3.16 | 11, +0.17R, +$865, 2.28 |
| about even | 54, +0.36R, +$10,816, 3.88 | 96, -0.07R, +$531, 1.07 |
| NQ leads (more than 0.3% ahead) | 14, +0.70R, +$5,098, 5.61 | 7, +0.20R, +$816, 6.31 |

| NQ vs ES over the last hour | 2026: n, avg R, net, PF | 2025 Apr-Dec: n, avg R, net, PF |
|---|---|---|
| NQ lags (> 0.1% behind) | 19, +0.29R, +$3,428, 3.06 | 26, -0.19R, -$687, 0.63 |
| about even | 62, +0.50R, +$15,757, 4.58 | 76, +0.11R, +$4,042, 1.72 |
| NQ leads (> 0.1% ahead) | 8, -0.03R, +$1,302, 2.43 | 12, -0.57R, -$1,144, 0 wins |

| NQ vs ES on the reclaim leg (sweep extreme to trigger) | 2026 | 2025 Apr-Dec |
|---|---|---|
| NQ reclaims more than 0.1% harder than ES | 14, -0.10R, +$615, 1.41 | 9, -0.12R, -$591, 0.35 |
| about the same | 75, +0.50R, +$19,872, 4.62 | 104, -0.02R, +$2,804, 1.36 |

Over the whole session "NQ leads" looks mildly good, but over the last hour and on the reclaim leg it is the opposite:
when NQ has **already** outrun ES into the trade, the trade does worse in both sub-periods (0 wins out of 12 in 2025, 14
trades at -0.10R in 2026). The reading is "the move is spent when NQ has already done the work". The samples are tiny
(8-14 trades a bucket), so this is a note for when more ES history exists, not a rule. Information rules saved:
`xm_nolead_half` (2026 +$18,330, PF 4.10), `xm_reclaim_more_x125` (2026 +$20,832, PF 3.96); both leave 2021-25 untouched
apart from 2025.

## 6. SMT divergence at the sweep (information only, 2025-04 onward)

The engine already tags a trade "SMT divergence" when ES did not take out its own 3-hour extreme while NQ swept (53
trades). Two research replicas were added: the same with a 3-hour window and one with a full-session window.

| definition | 2026: SMT vs both swept (n, avg R, PF) | 2025 Apr-Dec: SMT vs both swept |
|---|---|---|
| engine tag (3-hour reference) | 29, +0.51R, 4.90 vs 60, +0.36R, 3.52 | 24, +0.09R, 2.79 vs 90, -0.06R, 0.98 |
| replica, 3-hour window | 37, +0.41R, 3.94 vs 52, +0.41R, 3.94 | 39, -0.01R, 1.83 vs 75, -0.04R, 0.99 |
| replica, full-session window | 50, +0.21R, 2.97 vs 39, +0.66R, 5.04 | 56, -0.05R, 1.44 vs 58, -0.01R, 1.09 |

The engine's own tag points the right way in both sub-periods (SMT trades better: +$8.2k on 29 trades in 2026, +$2.3k on
24 trades in 2025), but a slightly different definition makes the effect vanish or flip, which is what noise looks like.
Leaning in 25% on the engine tag (`xm_smt_only_x125`) gives 2026 +$22,006 (PF 4.05, drawdown -$2,426) and 2021-25 +$52.
The earlier `bias_smt_only` run (SMT trades only) already showed it is far too few trades to trade alone (0.7 a week).
Keep the tag, revisit when ES history covers a losing year.

## 7. The shape of the entry day, known at entry

| opening gap vs ADR20 | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| small (< 0.15 ADR) | 29, +0.12R, +$1,798, 1.78 | 255, -0.06R, +$3,078, 1.12 |
| 0.15-0.35 | 21, +0.49R, +$4,303, 3.47 | 231, +0.09R, +$6,930, 1.34 |
| big (> 0.35 ADR) | 39, +0.58R, +$14,387, 5.90 | 192, +0.01R, +$6,372, 1.40 |

| entry-day class at entry | 2026: n, avg R, net, PF | 2021-25: n, avg R, net, PF |
|---|---|---|
| range day (range so far < 0.8 ADR) | 44, +0.65R, +$12,778, 4.89 | 476, +0.01R, +$15,774, 1.36 |
| wide chop (range >= 0.8 ADR, day efficiency < 0.35) | 36, +0.24R, +$7,190, 3.70 | 148, -0.10R, -$3,790, 0.71 |
| trend day (range >= 0.8 ADR, day efficiency >= 0.35) | 9, -0.07R, +$519, 1.51 | 55, +0.32R, +$4,394, 2.28 |

The gap is the most consistent day-shape factor: small-gap days are the weakest bucket in both periods and big-gap days
the strongest. But the small-gap bucket still made money in 2026, so halving it costs $1.1k there (`xm_smallgap_half`:
2026 +$19,357, PF 4.25, drawdown -$1,842; 2021-25 +$13,551, PF 1.27, drawdown -$6,690): a drawdown trade-off again, not
a money improvement. Leaning in on big gaps (`xm_biggap_x125`) makes 2026 +$23.6k but 2021-25 -$48 and is no better
than simply sizing everything up (see the control below). "Wide chop" days lose in 2021-25 but made +$7.2k in 2026, so
half size there (`xm_widechop_half`) costs $3.6k in 2026. Trend days, the opening range (narrow or wide), range already
used up, and the direction of the day so far all point different ways in the two periods; every rule on them was rejected
(`xm_trendday_half`, `xm_wideor_half`, `xm_rangedone_half`, `xm_rangedone_x125`, `xm_against_day_half`,
`xm_against_day_07`, `xm_withday_tilt`).

## Two lessons from this study that matter more than the factors

**A look-ahead bug can look like the best edge ever found.** The first version of "trade with or against the day's
direction" produced a t-statistic of 5 and +$19.7k against -$3.3k in 2021-25. It used the direction up to the entry bar's
close, which includes the trade's own first 5 minutes. Computed from closed bars only, the effect reverses (with-the-day
trades: +0.06R in 2026, against: +0.58R). Every factor in this study uses only bars closed before the entry and only the
previous day's VIX/VXN/GEX.

**"Better in both periods" is too easy for lean-in rules.** Sizing up any group of trades that made money makes more
money in both periods by construction. `xm_withday_x125` passes the mechanical test (+$21.7k / +$17.4k) although the
with-the-day trades are *worse* than average in both periods. The control run `xm_all_x125` (every trade at 125%) gives
2026 +$24,282 (PF 4.13, drawdown -$2,767) and 2021-25 +$18,350 (PF 1.27, drawdown -$10,452, 1-month fails 10.8%). A
lean-in only deserves a look if it beats that on profit factor and drawdown; none in this study did. The with-the-day
runs (`xm_withday_x125`, `xm_withday_x150`, `xm_withday18_x125`) are stored as rejected for that reason.

## What to do

1. **Optional, small:** add "half size when the 10-day efficiency is above 0.45 and the 20-day efficiency is above 0.35"
   to the shared size multiplier (cold x late x this). +$378 in 2026, +$677 in 2021-25, drawdown -$2,249 to -$1,871 in
   2026, no eval numbers get worse. It needs the live loop to see 21+ sessions of bars (today: 20 calendar days).
2. **Worth a proper engine test:** a regime option for the trend lookback (20 days, cut 0.45, the half size and the
   +3R breakeven both following it). The size-only approximation says 2026 +$2.1k and 2021-25 +$5.6k with equal or better
   drawdowns, at the price of more 1-month eval fails in 2021-25 (5.2% to 8.6%). The exact replay decides.
3. Leave VIX, VXN/VIX, GEX, DIX, the gap, the opening range and the day's direction alone. They do not pay on the locked
   settings. The VIX-20 half size and the small-gap half size cut drawdown for a few hundred dollars over five years; only
   if the owner wants less drawdown more than more money.
4. Revisit ES relative strength and SMT when ES history includes a losing year; the signs ("NQ already ahead = the move
   is spent", "ES did not confirm = better") are consistent but rest on 8-30 trades.

Method: `tools/research_xm.py` (tables, rules, noise); all tables in `research/lab/cross_market_context.json`; every
rule stored with its trades in `research/runs/xm_*.json`. No engine replays were needed: every factor is context known at
entry and every rule is a size multiplier applied exactly after the fact.
