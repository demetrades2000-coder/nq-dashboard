## In one minute

- **Question.** Quant traders use a few well-known statistical patterns in stock-index futures. Do any of them work
  on our NQ data, alone or on top of LIT / ATLAS?
- **Answer: no.** I tested 31 versions of the published patterns, all fixed before the run. None of them makes money in a way
  we can trust in 2021-26. About as many looked good in 2021-24 as luck alone would give (2 vs about 1.6). Both
  faded in 2025-26.
- **The closest to real:**
  - **pre-FOMC drift.** NQ rose in the 24 hours before a Fed statement in 2021-24: +93 pts a micro per meeting, t 2.6. A random day does that
    only 1% of the time. In 2025-26 it did nothing (-6 pts, 14 meetings). The paper's own pattern had
    already weakened after it was published, and here it is gone.
  - **Overnight drift.** Most of NQ's rise happens outside 09:30-16:00, as the papers say. 1 micro held every night
    made +$11.8k over 5 years, against +$0.8k for the day session. But it is no better than a random window of the same
    length (placebo p 0.5) and lost in 2026 H2.
- **On LIT and ATLAS:**
  - **Volatility-targeted size** (smaller in wild markets, bigger in calm ones) **hurts the evals in every version.** LIT's
    2-week pass falls from 57.1% / 52.2% (H1 / H2) to 24-54% / 39-46%. ATLAS's 25K falls from 68.9% / 43.5% to 37-64% /
    33-41%. The reason: the eval sizing already sizes so that one winner passes. Cutting that winner's size means it no longer passes.
  - **A quant direction tilt** (for example, bigger longs before the open) does not help either.
  - **A separate quant trade on the eval account** does not help either.
- **One thing to watch (not to trade).** Since 2025 the last 30 minutes have tended to go **against** the day's move on both
  NQ (t -2.2) and ES (t -2.2). The paper says they should go **with** it. I did not plan this test. I spotted it afterwards, so it
  is a lead for a new pre-registered test, not a result.

Nothing changes in the bot. No engine, model or dashboard file was touched.

## What was tested and how

**Data.** TradingView CME NQ1! 5-minute bars (MNQ1! from 2026-08-24), 2021-11 to 2026-10-16 (`data/NQ_5m.csv`). The
series is back-adjusted additively, so point moves are exact. Percent returns use the unadjusted price (adjusted minus the
later roll gaps, `data/NQ_rolls.json`). VIX, VIX3M and VXN come from CBOE's own files. The ES cross-check uses TradingView ES1! from
2025-04 to 2026-08-21 only, because the file is Yahoo after that. No Yahoo data anywhere.

**Trades.** MNQ micros at $2 a point. Every entry and exit is at a 5-minute bar **open**. Costs are $1.90 a micro round turn plus
1 tick of slippage on each side, so 1.45 pts a micro a trade. Two money views:

- **Unlevered:** 1 micro per signal, no stop. This is the clean test of the effect. Points, t-stats and placebos use it,
  costs in.
- **$500 risk:** micros = $500 / (stop x $2), 1-40. The stop is **a volatility stop, not a structural one**:
  max(10, 1.5 x ATR20 x sqrt(hold hours / 23)) points. ATR20 is the average 18:00-17:00 range of the 20 sessions
  before. These are quant overlays, not LIT setups: there is no sweep, so there is no "beyond the sweep extreme" stop
  (CLAUDE.md's stop rule is for LIT). The stop is hit on 0-1% of calendar trades, about 5% of overnight / daily holds and
  11-18% of intraday windows. Holds of a day or more use the 1-micro minimum, because their stop is $800+ a micro, which is more than $500. Because this
  view sizes by volatility, its $ can differ from the points (2022 trades were smaller).

**Spans.**
- **In sample: 2021-24.** This is where the papers say the effect should exist.
- **Out of sample: 2025, 2026 H1 and 2026 H2.** Every year is also scored on its own (`research/quant/quant_anoms.json`).

**Placebos (1,000 draws).** Each placebo answers "how often does luck do this well?":
- **Signal rules:** the same trades with the long/short labels shuffled.
- **Calendar rules:** random dates, same clock window.
- **Every-day windows:** a random start time of the same length.
- **VIX regimes:** the regime calendar shifted in time.

"p" is the share of placebo draws that did at least as well. Below 0.05 means luck rarely does this well.

**Family-wise view.** I tested 31 variants, so about 1.6 of them should pass p < 0.05 by luck alone. The Holm correction asks
for much more. **Verdict per variant:**
- **Exists:** in-sample placebo p < 0.05 **and** out of sample positive with t >= 1.
- **Weak:** only one of the two, or in-sample p < 0.10.
- **Dead:** neither.

Each table cell shows: average net points a micro (t-stat), $ at $500 risk.

## 1. Intraday momentum (Gao, Han, Li, Zhou 2018)

The paper's idea: the first half hour (from yesterday's 16:00 close to 10:00, overnight included) predicts the last
half hour (15:30-16:00). Trade the last half hour in the direction of the first.

| variant | /wk | 2021-24 (in sample) | placebo p | 2025 | 2026 H1 | 2026 H2 | out of sample $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| im_textbook (prev close -> 10:00, last 30 min) | 4.96 | -3.3 pt (t -2.0), -$11,941 | 0.87 | -3.9 (t -1.0), -$4,369 | +4.2 (t +0.8), +$1,113 | +3.9 (t +0.5), +$1,182 | -98 | dead |
| im_60 (first hour -> last hour) | 4.96 | +1.5 (t +0.6), +$8,552 | 0.10 | +0.9 (t +0.2), +$192 | -6.7 (t -0.8), -$1,589 | +1.6 (t +0.1), -$316 | -81 | weak |
| im_rth30 (09:30-10:00 only) | 4.95 | -3.7 (t -2.2), -$18,517 | 0.91 | +1.1 (t +0.3), -$1,846 | -7.8 (t -1.4), -$3,966 | -4.0 (t -0.5), -$574 | -301 | dead |
| im_mag (big first moves only) | 2.42 | -3.1 (t -1.3), -$6,538 | 0.75 | -1.9 (t -0.3), -$1,608 | +1.3 (t +0.2), -$372 | -5.4 (t -0.6), +$114 | -88 | dead |
| im_vix (VIX above its 1-year median) | 2.01 | -1.4 (t -0.4), +$888 | 0.43 | -8.1 (t -1.3), -$4,542 | +8.6 (t +1.4), +$2,763 | +36.6 (t +1.0), +$1,192 | -28 | dead |

**Dead.** On NQ 2021-24 the textbook rule had the wrong sign: the last half hour tended to reverse the first (t -2.0).
None of the variants holds. This matches later studies that found the effect weak in recent years.

## 2. Overnight vs regular session (overnight drift)

The idea (Cliff-Cooper-Gulen 2008, Kelly-Clark 2011, Lou-Polk-Skouras 2019): index returns come overnight, while the regular
session earns about nothing.

| variant | /wk | 2021-24 | placebo p | 2025 | 2026 H1 | 2026 H2 | OOS $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| on_1600 (long 16:00 -> 09:30) | 4.8 | +2.4 (t +0.5), +$4,469 | 0.52 | +11.2 (t +0.9), +$4,988 | +17.6 (t +0.8), +$3,417 | -9.0 (t -0.3), -$1,350 | +332 | dead |
| on_1800 (long 18:00 -> 09:30) | 4.8 | +0.8 (t +0.2), +$893 | 0.57 | +8.4 (t +0.8), +$3,314 | +27.0 (t +1.3), +$5,948 | -10.6 (t -0.4), -$1,564 | +362 | weak |
| id_rth (long 09:30 -> 16:00) | 4.96 | -0.3 (t -0.1), +$4,892 | 0.53 | -0.9 (t -0.1), +$1,821 | +18.1 (t +0.8), +$4,484 | -17.8 (t -0.7), -$4,194 | +99 | dead |
| on_after_down (after a down day) | 2.22 | +7.7 (t +1.1), +$6,323 | 0.13 | +7.4 (t +0.3), +$1,407 | +30.3 (t +0.8), +$2,541 | -33.2 (t -0.8), -$2,527 | +67 | dead |
| on_mon (night into Monday) | 0.88 | -9.0 (t -0.8), -$1,608 | 0.86 | +30.9 (t +0.8), +$3,038 | +69.8 (t +1.2), +$2,126 | -26.6 (t -0.4), -$704 | +210 | weak |
| on_tue | 0.94 | +4.5 (t +0.5), +$1,383 | 0.44 | -8.7 (t -0.4), -$1,098 | -50.9 (t -0.9), -$2,265 | -1.1 (t -0.0), -$32 | -160 | dead |
| on_wed | 1.02 | +6.3 (t +0.7), +$2,036 | 0.34 | +22.1 (t +1.0), +$2,249 | +103.0 (t +2.6), +$5,152 | -30.6 (t -0.7), -$979 | +302 | weak |
| on_thu | 0.99 | +13.1 (t +1.1), +$4,130 | 0.10 | +15.2 (t +0.5), +$1,831 | +1.3 (t +0.0), +$64 | -39.1 (t -0.5), -$1,252 | +30 | weak |
| on_fri | 0.97 | -4.0 (t -0.5), -$1,473 | 0.76 | -3.9 (t -0.1), -$1,031 | -34.6 (t -0.8), -$1,661 | +53.9 (t +0.9), +$1,617 | -51 | dead |

Over all 5 years, 1 micro held every night made **+$11,835** (16:00 start) / **+$9,974** (18:00 start) after costs. Holding
every regular session made **+$807**, and buy-and-hold made +$15,746. So the papers are right about the **shape**:
NQ's rise is mostly overnight. But no variant beats a random window of the same length, none has t above 1.1 in sample,
and every night variant lost money in 2026 H2. That makes it **not a tradable edge**: about $200-350 a month at 1 micro with
-$8.5k drawdowns. The weekday cells are what chance looks like: each one flips between periods.

## 3. Calendar: turn of the month, pre-FOMC, pre-holiday

**FOMC dates used** (all 14:00 ET statements, written from memory and checked against `data/news/events.csv`: 0 missing,
0 extra):
- **2021:** 01-27, 03-17, 04-28, 06-16, 07-28, 09-22, 11-03, 12-15.
- **2022:** 01-26, 03-16, 05-04, 06-15, 07-27, 09-21, 11-02, 12-14.
- **2023:** 02-01, 03-22, 05-03, 06-14, 07-26, 09-20, 11-01, 12-13.
- **2024:** 01-31, 03-20, 05-01, 06-12, 07-31, 09-18, 11-07, 12-18.
- **2025:** 01-29, 03-19, 05-07, 06-18, 07-30, 09-17, 10-29, 12-10.
- **2026:** 01-28, 03-18, 04-29, 06-17, 07-29, 09-16 (10-28 and 12-09 are after the data).

**Holidays** are the NYSE full-day closures (list in `tools/quant_anoms.py`). None of them has a 15:55 bar in the data.

| variant | events/wk | 2021-24 | placebo p | 2025 | 2026 H1 | 2026 H2 | OOS $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| tom (16:00 day -2 -> 16:00 day +3) | 0.24 | -35.1 (t -0.5), -$2,611 | 0.79 | +65.5 (t +0.6), +$956 | +254.3 (t +0.8), +$2,891 | +508.0 (t +1.5), +$4,064 | +372 | weak |
| tom_1 (last day + first day) | 0.24 | -11.2 (t -0.2), -$828 | 0.65 | -44.4 (t -0.5), -$1,232 | +222.3 (t +1.1), +$1,418 | +121.6 (t +0.6), +$973 | +55 | dead |
| pre_fomc (14:00 day before -> 13:55) | 0.16 | **+92.7 (t +2.6), +$4,823** | **0.012** | +2.3 (t +0.1), +$37 | -6.1 (t -0.1), -$49 | -42.1 (t -0.2), -$168 | -8 | weak |
| pre_fomc_rth (09:30 -> 13:55) | 0.16 | +22.2 (t +1.6), +$1,156 | 0.22 | -27.7 (t -1.2), -$444 | -48.8 (t -1.9), -$390 | -74.0 (t -0.6), -$717 | -73 | dead |
| pre_holiday (the session before a holiday) | 0.20 | +34.2 (t +1.2), +$2,188 | 0.20 | +15.5 (t +0.3), +$340 | +164.2 (t +1.2), +$1,642 | -254.2 (t -0.9), -$1,017 | +45 | dead |

- **Pre-FOMC:** the best in-sample result of the whole study (26 meetings, 0 stops, max drawdown -$898). It did nothing on the
  14 meetings since. With 31 tests, a p of 0.012 is not enough on its own (Holm needs about 0.0016), and the out-of-sample
  check fails.
- **Turn of the month:** the opposite story. It lost in 2021-24 and made +$7.9k on 22 month-ends in 2025-26 (t 1.7). On ES
  it shows t 2.1 on 16 month-ends. That is too few events, and it failed where the papers say it should work.
- **Pre-holiday:** positive on average, but driven by a few events, and the 2026 H2 holidays lost.

## 4. Daily reversal / momentum and the 09:30 gap

- **Reversal:** go against the sign of the last 1, 2 or 5 close-to-close returns, hold 16:00 to 16:00. A negative result
  means momentum.
- **Gaps:** only gaps of 0.1 ATR or more count. The gap fill fades the gap at 09:30 with a target at yesterday's 16:00 close and is
  flat at 16:00. Gap-and-go trades with the gap.

| variant | /wk | 2021-24 | placebo p | 2025 | 2026 H1 | 2026 H2 | OOS $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| rev1 | 4.79 | +1.9 (t +0.2), +$1,803 | 0.33 | +30.8 (t +1.6), +$13,608 | +9.4 (t +0.3), +$3,195 | -89.3 (t -2.2), -$12,803 | +188 | dead |
| rev2 | 4.8 | +10.2 (t +1.3), +$12,988 | 0.06 | -3.6 (t -0.2), -$2,485 | -12.5 (t -0.4), -$3,038 | -28.9 (t -0.7), -$4,512 | -472 | weak |
| rev5 | 4.8 | -3.7 (t -0.5), -$7,546 | 0.57 | +3.0 (t +0.1), -$947 | +18.6 (t +0.6), +$3,092 | +20.7 (t +0.5), +$2,831 | +234 | dead |
| gap_fill | 3.79 | -4.5 (t -0.8), -$3,331 | 0.43 | +15.5 (t +1.2), +$5,365 | -15.5 (t -0.6), -$1,625 | -2.3 (t -0.1), +$274 | +189 | dead |
| gap_go | 3.79 | +0.6 (t +0.1), +$3,692 | 0.39 | -34.4 (t -2.1), -$9,695 | +7.1 (t +0.2), +$1,664 | +11.6 (t +0.4), +$285 | -365 | dead |
| gap_fill_small (0.1-0.3 ATR) | 1.76 | -7.6 (t -1.2), -$2,686 | 0.48 | -6.8 (t -0.5), -$1,038 | -36.4 (t -1.2), -$2,648 | +20.2 (t +0.6), +$1,433 | -106 | dead |

**Dead.** Day-to-day direction on NQ is a coin flip that changes sides year by year. The 1-day reversal made +$13.6k in
2025 and lost $12.8k in 2026 H2 alone. "Gaps fill" is not true on NQ 2021-26 in either direction.

## 5. VIX regimes and volatility-targeted size

**Long/flat regimes.** The base is long NQ from 16:00 to the next 16:00. The signal is the VIX close of the day before the
entry day, because VIX settles at 16:15, after our 16:00 entry. The term-structure rule uses VIX/VIX3M (CBOE file). Where VIX3M is
missing (after 2026-09-17) it uses VIX vs its 20-day mean.

| variant | /wk | 2021-24 | placebo p | 2025 | 2026 H1 | 2026 H2 | OOS $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| bh_cc (buy and hold, reference) | 4.8 | +3.5 (t +0.5), +$4,627 | 0.52 | +11.7 (t +0.6), +$5,270 | +36.9 (t +1.1), +$7,146 | -26.0 (t -0.6), -$4,594 | +368 | (reference) |
| vreg_level (long when VIX < 1-year median) | 2.41 | +13.8 (t +1.5), +$11,646 | 0.08 | +13.2 (t +0.6), +$3,886 | -23.9 (t -0.4), -$2,103 | -37.3 (t -0.9), -$4,722 | -138 | weak |
| vreg_ts (long in contango, VIX/VIX3M < 1) | 4.51 | -1.1 (t -0.1), -$2,023 | 1.00 | +9.8 (t +0.6), +$4,640 | +34.3 (t +1.0), +$5,771 | -21.8 (t -0.5), -$3,751 | +314 | dead |
| vreg_ts20 (VIX < its 20-day mean) | 2.70 | -3.4 (t -0.3), -$2,828 | 0.83 | -1.7 (t -0.1), +$585 | +66.9 (t +1.3), +$7,874 | -48.6 (t -1.0), -$5,135 | +156 | dead |

The calm-VIX rule cut the 2022 bear-market loss from -$11.4k to -$2.0k and looked good in 2021-24, but it lost $6.8k in 2026. The contango rule was long
on 95% of days in 2022 and lost $15.3k. **No regime switch beats buy and hold reliably.**

**Volatility-targeted size on LIT and ATLAS (sizing change only).** The multiplier is known before the session:
- **vt_rv:** clip(1-year median of 20-day realized vol / today's 20-day vol, 0.5, 1.5).
- **vt_vxn:** the same with VXN.
- **vt_rv_down:** vt_rv capped at 1 (smaller only).
- **vt_ts:** half size in VIX backwardation.

The base lines are:
- **LIT size rule** = run `lit_live`.
- **LIT eval path** = the live two_week sizing, run `lit_adopt_t15_be_off_eval` (57.1/5.9, 52.2/0.0).
- **ATLAS** = Builder 25K need size, `tools/second_account_b.py` (pass / dead in 2 weeks, dead = failed or stuck).

| rule | LIT size rule H1 / H2 / 2021-25 | LIT eval 2-wk pass/fail H1 | H2 | LIT eval path $ H1 / H2 | ATLAS 25K 2-wk pass/dead H1 | H2 | 2025 |
|---|---|---|---|---|---|---|---|
| none (live) | +$33,891 / +$9,493 / +$1,211 | 57.1 / 5.9 | 52.2 / 0.0 | +$34,234 / +$9,059 | 68.9 / 7.6 | 43.5 / 0.0 | 28.9 / 34.9 |
| vt_rv | +$33,729 / +$9,689 / -$6,665 | 37.0 / 5.0 | 39.1 / 5.8 | +$31,225 / +$9,462 | 49.6 / 4.2 | 33.3 / 0.0 | 17.3 / 31.7 |
| vt_vxn | +$31,014 / +$9,408 / -$2,906 | 23.5 / 2.5 | 39.1 / 0.0 | +$25,800 / +$9,354 | 37.0 / 2.5 | 36.2 / 1.4 | 18.5 / 24.9 |
| vt_rv_down | +$31,117 / +$9,099 / -$1,700 | 37.0 / 4.2 | 40.6 / 0.0 | +$28,753 / +$10,229 | 47.9 / 3.4 | 33.3 / 0.0 | 14.9 / 25.3 |
| vt_ts | +$33,961 / +$8,014 / +$1,967 | 53.8 / 5.9 | 46.4 / 0.0 | +$30,693 / +$4,687 | 63.9 / 7.6 | 40.6 / 0.0 | 23.3 / 34.1 |

**Rejected, all four.** On LIT's own size rule the $ barely move, and 2021-25 gets worse. On the eval they cut the
2-week pass by 3-34 points, because the two_week sizing already sets micros so that one winner covers the rest of the
target, capped by the room. A smaller trade on a high-vol day then simply fails to pass. Moreira-Muir's result is about
long-run Sharpe of a buy-and-hold portfolio. It does not carry over to a prop eval with a target and a trailing floor.

## 6. End of day: last-hour momentum vs reversal (Baltussen, Da, Lammers, Martens 2021)

The idea: the day's move (from yesterday's close to 15:30) predicts the last half hour in the same direction, because
option dealers hedge.

| variant | /wk | 2021-24 | placebo p | 2025 | 2026 H1 | 2026 H2 | OOS $/mo | verdict |
|---|---:|---|---:|---|---|---|---:|---|
| eod_textbook (prev close -> 15:30, last 30 min) | 4.96 | +0.1 (t +0.1), -$1,718 | 0.19 | **-10.0 (t -2.6), -$12,203** | -3.7 (t -0.7), -$1,649 | +0.3 (t +0.0), -$186 | -661 | dead |
| eod_hour (09:30 -> 15:00, last hour) | 4.96 | +3.7 (t +1.6), +$12,365 | **0.010** | -1.0 (t -0.2), -$1,779 | -5.0 (t -0.6), -$1,470 | -15.9 (t -1.4), -$1,718 | -234 | weak |
| eod_big (big days only) | 2.43 | +1.3 (t +0.5), +$1,134 | 0.14 | -11.0 (t -1.8), -$7,482 | -3.9 (t -0.5), -$1,187 | -14.3 (t -1.6), -$965 | -454 | dead |

- **Last-hour momentum from the open** worked in 2022-23 (+$13.2k) and has lost every year since.
- **The textbook rule** turned into a **reversal** in 2025-26: out of sample t -2.2, and ES shows the same (t -2.2 on 2025-04 to
  2026-08). That is the one pattern in this study that shows up on two markets in the recent period. It is the opposite of the
  paper, and I found it after looking, so it is only a lead: a pre-registered "fade the day's move at 15:30" test on
  2027 data would be the honest next step. LIT is flat by 15:55, and this window overlaps LIT's last minutes.

## Correlation with LIT, and the overlay tests on the eval accounts

**Correlation.** Every overlay's daily P&L is almost uncorrelated with LIT's: |r| < 0.15 in 2026, < 0.06 in 2021-25. In
principle any of them would diversify. But diversification only helps when the extra strategy makes money, and none of them does.

**Size tilts** (pre-declared, LIT / ATLAS trade direction x the overlay's bias at entry):

| tilt | LIT size rule H1 / H2 | LIT eval 2-wk pass/fail H1 | H2 | ATLAS 25K pass/dead H1 | H2 |
|---|---|---|---|---|---|
| none (live) | +$33,891 / +$9,493 | 57.1 / 5.9 | 52.2 / 0.0 | 68.9 / 7.6 | 43.5 / 0.0 |
| tilt_on: before 09:30 longs x1.25, shorts x0.75 | +$34,719 / +$8,496 | 44.5 / 2.5 | 24.6 / 0.0 | 54.6 / 6.7 | 42.0 / 4.3 |
| tilt_vix: calm VIX, longs x1.25, shorts x0.75 | +$34,164 / +$8,161 | 54.6 / 4.2 | 24.6 / 0.0 | 67.2 / 7.6 | 43.5 / 4.3 |
| tilt_fomc: pre-FOMC window, longs x1.5, shorts x0.5 | +$31,778 / +$9,493 | 54.6 / 5.9 | 52.2 / 0.0 | 68.9 / 9.2 | 43.5 / 0.0 |

**Separate quant slot** (the overlay's own trade on the same eval account, fixed $250 risk on the 50K / $125 on the 25K,
for the two in-sample leads and on_1800):

| slot | LIT eval 2-wk pass/fail H1 | H2 | LIT eval path $ H1 / H2 | ATLAS 25K pass/dead H1 | H2 |
|---|---|---|---|---|---|
| none (live) | 57.1 / 5.9 | 52.2 / 0.0 | +$34,234 / +$9,059 | 68.9 / 7.6 | 43.5 / 0.0 |
| + eod_hour | 52.9 / 17.6 | 44.9 / 8.7 | +$37,065 / +$9,082 | 59.7 / 25.2 | 42.0 / 14.4 |
| + on_1800 (1 micro overnight) | 63.9 / 23.5 | 33.3 / 33.3 | +$42,491 / +$6,107 | 46.2 / 47.9 | 23.2 / 68.1 |
| + pre_fomc | 57.1 / 5.9 | 52.2 / 0.0 | +$35,200 / +$6,381 | 65.5 / 7.6 | 44.9 / 0.0 |

**All rejected.**
- **Tilts:** anything that shrinks LIT's trade on the eval slows the pass, as above.
- **Slots:** an extra trade with no edge adds noise against a $2,000 trailing floor and raises the fails. The overnight micro
  is the worst: 1 NQ night can swing $300+ a micro.

## Verdict

| effect | on NQ 2021-26 |
|---|---|
| Intraday momentum (first 30 min -> last 30 min) | **dead**: wrong sign in sample, flat out of sample |
| Overnight drift | **the shape exists** (the night carries the rise), **not tradable**: no better than a random window, lost in 2026 H2 |
| Turn of the month | **dead in sample**, positive 2025-26 on 22 events (watch only) |
| Pre-FOMC drift | **existed 2021-24**, **gone 2025-26** |
| Pre-holiday | **dead** (few events, mixed) |
| Daily reversal / momentum | **dead** (flips year to year) |
| Gap fill / gap-and-go | **dead** |
| VIX level / term-structure regime | **dead** (no better than buy and hold) |
| End-of-day momentum | **dead** as published; a recent **reversal** on NQ and ES since 2025 is a lead only |
| Volatility-targeted size on LIT / ATLAS | **rejected**: worse eval odds in every version |

**Family-wise:** 31 variants, 2 with in-sample placebo p < 0.05 (eod_hour 0.010, pre_fomc 0.012) against about 1.6
expected from luck. 0 survive Holm, and 0 pass the out-of-sample check.

**What "learning quant" means for this bot.** The published edges are a few points a trade. On a micro they sit next to
1.45 pts of costs, and they have mostly faded since they were published. LIT's edge is in its setup, not the calendar
or the clock. The honest quant toolkit (placebos, family-wise counting, out-of-sample halves) is now in
`tools/quant_anoms.py`. It can be reused for any new idea.

## Files

- `tools/quant_anoms.py`: the whole study (`python -X utf8 tools/quant_anoms.py [save]`, about 30 s).
- `research/quant/quant_anoms.json`: every variant, span, year, placebo, correlation, the vol-target / tilt / slot results
  and the ES check.
- Runs `q_*` (`research/runs/`): one per anomaly variant (sized $500-risk trades), plus `q_vt_*_lit` / `q_tilt_*_lit`
  (LIT size rule with the multiplier).
