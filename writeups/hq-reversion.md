## In one minute

- **The ask (owner, 2026-10-23):** 2+ trades a week, high-quality setups, a high win rate (55-60% real winners, not
  breakeven scratches) with an average winner of 1R or more, and money out of sample.
- **The idea tested:** fade a move that is already exhausted, aim for a close target (VWAP, a midpoint, 1-1.5R), put the stop
  1 tick beyond the exhaustion extreme. Close targets should be hit often.
- **Answer: no strategy here meets the ask.** Nothing to switch on.
  - Fading a stretched day (range already >= 1.2-1.5x normal, the day's high or low taken, then a rejection) **loses money**:
    -0.14 to -0.26 R a trade in H1, H2 and 2021-24; only 2025 is slightly positive. Stretched days tend to keep going.
  - The **exhaustion filter** (only trade when the day's range is already >= 1x normal) makes the box and ORB setups worse in
    H1 and 2021-24 (-0.07 to -0.22 R a trade), better only in 2025.
  - **Why "high probability" does not come for free:** the stop beyond the exhaustion extreme is wide (median 20-33 pts), so
    VWAP or the middle is 2-4R away (on a stretched day the median sits at the 4R cap) and is reached only 11-32% of the time. With a 1R target the true win rate rises to 45-60%,
    and 1R : 1R after $1.90 a micro + slippage needs about 53% just to break even.
- **Best lead (paper-watch, not good enough):** the **failed 30-minute opening-range breakout** (a 5m close beyond the
  09:30-10:00 range, a close back inside within 3 bars, signal 10:00-11:30, fade it to 1R). Picked on 2026 H1 **and**
  independently by the pre-2025 re-pick. True win 60.6% / 60.0% / 46.2% / 56.2% in H1 / H2 / 2025 / 2021-24; +$3,000 /
  +$1,786 / **-$4,131** / +$10,162 at $500 risk. Only 1.3 trades a week, H2 is -$483 without its 5 best trades, and on a
  Builder 25K alone it passes **0%** of evals in 2 weeks (1R winners are too small to reach the target quickly).
- **The only setup that passes the win gate in every period** (found by looking at all periods, so it proves little): the
  London range swept on both sides on a day already >= 1x its normal range, faded to 1R. 66-74% true winners and positive in
  every year 2021-2026, but **0.25 trades a week** (about one a month).
- **Correlation with LIT is ~0** (daily P&L r = -0.04 to +0.04 for the lead), so it would not hurt LIT's equity, but it does
  not smooth it either: next to LIT on the 50K it removes some H1 fails and adds 2025 / 2021-24 fails.

## What is new compared with earlier work

- `allday.md` already tested mean reversion to VWAP (stretch >= k ATR, any window) and the opening-range reclaim (target the
  other side) and found both at chance level. `retail-standalone.md` and `stophunt.md` found sweeps worth ~0 R on average.
- **New here: the exhaustion condition and close targets.**
  1. **Stretched day:** the trading day's range so far vs the prior 14 days' mean daily range (0.8 / 1.0 / 1.2 / 1.5x), then a
     sweep of the day's own high/low (set 30+ minutes earlier), then a reclaim / CISD / displacement close.
  2. **Both sides of a box swept** (overnight 18:00-09:30, London 02:00-05:00, Asia 20:00-00:00): only the second sweep is
     traded, to the box middle. The one-sided reclaim is kept as the control.
  3. **Stretched into a higher-timeframe pool:** an untaken PDH/PDL, PWH/PWL or PMH/PML swept while price is >= 1.5-4 ATR
     from the 18:00 VWAP, then a rejection.
  4. **Failed opening-range breakouts at 10:00-11:30** with a close-based breakout and a close target (range middle, 1R).
  5. **Close targets in two modes:** "the level, skip if nearer than 1R" and "the level but at least 1R"; plus 1R and 1.5R.
  6. **The exhaustion overlay on every family** and a pair test of what it does (same setup with vs without it).
  7. **A runner check** on the lead (half at 1R, half to the other side of the range, breakeven at 1R).

## How it was tested

- **Data:** TradingView CME NQ1! 5m (2021-11 to 2026-10-16) for signals; the trade walks on true 1m bars in 2026 and on 5m
  before. Official CME data only, no CFD, no Yahoo.
- **No look-ahead:** every feature uses bars up to the signal bar (VWAP includes it, the 14-day mean range uses prior days
  only, boxes are used only after they close, HTF levels are known at the day start). A signal is known at a 5m close; market
  entry at the next 5m open + 1 tick. **40 random trades of the picks were re-derived on data cut at the signal close
  (arrays truncated, ATR / VWAP / day high-low recomputed): 40/40 identical** (one end-of-data guard was fixed on the way; it
  changed no event).
- **Stops:** 1 tick beyond the extreme from the sweep to the signal bar (the exhaustion extreme), 6-80 pts, else no trade.
- **Exits:** target = a limit that fills on a trade-through; stop and target in one bar = stop; stop and time exits - 1 tick;
  breakeven (when on) = entry + 1.25 pts once +0.75R; time exit 2 h after entry or 15:55 ET. One trade a day per setup.
- **Money:** $500 risk a trade (floor(500 / (stop x $2)) micros, max 50), $1.90 a micro round trip. Eval views use each
  plan's own sizing: a Builder 25K alone (`tools/second_account_b.py`, need sizing, never opposite to LIT) and next to LIT on
  LIT's 50K (`tools/second_mix.py`, LIT first: a LIT signal flattens the extra trade, one slot a day kept for LIT; extras at
  half of LIT's need size or $300 safe).
- **Win rate, honestly:** "true win" = trades that made +0.5R or more; "BE" = breakeven scratches (counted apart).
- **Pick and check:** pick on 2026 H1 (Jan 2 - Jun 30) only: 20+ trades, true win >= 55%, average winner >= 1R, PF >= 1.3,
  money up, best plateau score (half its own H1 $ + half the median H1 $ of its one-step neighbours). Then H2 (Jul 1 - Oct 16),
  2025 and 2021-24 untouched. A **pre-2025 re-pick** runs the same rule on 2021-24 (150+ trades, PF >= 1.15) and checks 2025,
  H1 and H2. **Placebo:** 300 random-entry twins per pick (same window, days, side mix, stop sizes, target R and exits).
  **Chance:** 200 random-entry strategies built on random variants' stops / targets / exits.

## How many versions, and what chance says

| | count |
|---|---:|
| variants (stretched day 9,216 / both-sides box 6,912 / HTF pool 7,680 / failed ORB 2,304) | 26,112 |
| with 20+ trades in H1 | 4,164 |
| pass the H1 gate (true win >= 55%, avg winner >= 1R, PF >= 1.3) | 64 |
| ... of those positive in H2 | 4 (6%) |
| ... positive in H2, 2025 and 2021-24 | **0** |
| positive in all four periods (20+ H1 trades) | 9 |
| pass the win gate in all four periods (any size) | 6 (one setup, 0.25 trades a week) |
| random-entry strategies positive in all four periods | 2 of 200 (1%) |
| random-entry strategies passing the win gate in all four | 0 of 200 |

- Share of variants (10+ trades) that made money: H1 25%, H2 28%, 2025 47%, 2021-24 21%. Average expectancy -0.13 / -0.14 /
  +0.03 / -0.11 R a trade. The grid as a whole loses.
- Does H1 predict H2? Rank correlation of expectancy H1 -> H2 **0.08**, H1 -> 2025 **-0.21**, 2021-24 -> 2025 0.35,
  2021-24 -> H2 -0.03. Picking on H1 says almost nothing about later periods.

**By family** (average R a trade after costs / share of variants positive / median true win %):

| family | H1 | H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| stretched day -> VWAP / middle | -0.14 / 26% / 21% | -0.26 / 15% / 19% | +0.06 / 51% / 29% | -0.18 / 12% / 21% |
| box swept (one or both sides) -> middle | -0.10 / 30% / 32% | -0.13 / 25% / 30% | -0.05 / 29% / 33% | -0.13 / 14% / 33% |
| stretched into a HTF pool | -0.20 / 14% / 21% | -0.21 / 32% / 25% | +0.13 / 69% / 36% | -0.06 / 30% / 31% |
| failed ORB 10:00-11:30 | -0.07 / 37% / 36% | +0.08 / 59% / 39% | -0.08 / 18% / 33% | -0.04 / 33% / 36% |

**The exhaustion overlay** (the same setup with vs without "day range >= x times normal"; change in R a trade, share of
pairs that got better):

| family, filter | H1 | H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| box swept, >= 1.0x | -0.22 (21%) | +0.04 (58%) | +0.07 (57%) | -0.07 (33%) |
| failed ORB, >= 1.0x | -0.15 (25%) | - | +0.64 (100%) | +0.11 (65%) |
| stretched day, 1.2x vs 0.8x | -0.02 (41%) | - | +0.03 (55%) | -0.09 (24%) |
| stretched day, 1.5x vs 0.8x | - | - | +0.26 (88%) | -0.15 (22%) |

Plainly: requiring an "exhausted" day does not make the fade more reliable. It helps in 2025 and hurts in 2026 H1 and
2021-24. A day that is already big is more often a trend day than a day about to snap back.

## The candidates

All at $500 risk a trade, costs in. "True win" = +0.5R or more; "drop 5" = net without the 5 best trades of that period;
"+1 tick" = net with one more tick of slippage on the entry and every non-limit exit.

### 1. Failed 30-minute ORB fade to 1R (best lead; run `hq_rev_h1_of`)

Rules: the 09:30-10:00 range; a 5m close beyond it; within 3 bars a 5m close back inside; signal 10:00-11:30; trade the
other way at the next 5m open + 1 tick; stop 1 tick beyond the breakout extreme; target 1R; no breakeven; flat 15:55.
Picked on H1 (2 eligible variants) and also chosen by the pre-2025 re-pick (4 eligible).

| period | trades | /wk | weeks 2+ | true win | BE | avg winner | R a trade | $ a trade | PF | net | $/month | max DD | drop 5 | +1 tick |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 H1 (pick) | 33 | 1.29 | 37% | 60.6% | 0% | 1.0R | +0.19 | +$91 | 1.50 | +$3,000 | +$492 | -$1,469 | +$642 | +$2,865 |
| **2026 H2 (untouched)** | 20 | 1.28 | 25% | **60.0%** | 0% | 1.0R | +0.21 | +$89 | 1.52 | **+$1,786** | +$481 | -$1,047 | -$483 | +$1,691 |
| 2025 | 91 | 1.76 | 55% | 46.2% | 0% | 1.0R | -0.10 | -$45 | 0.82 | **-$4,131** | -$336 | -$6,245 | -$6,525 | -$4,724 |
| 2021-24 | 258 | 1.58 | 51% | 56.2% | 0% | 1.0R | +0.09 | +$39 | 1.18 | +$10,162 | +$262 | -$5,147 | +$7,738 | +$8,471 |

- By year: 2021 -$96, 2022 +$2,726, 2023 +$9,494, 2024 -$1,961, 2025 -$4,131, 2026 +$4,786.
- 2026 by month: Jan -944, Feb +1,382, Mar +1,842, Apr -1,028, May +1,781, Jun -33, Jul -217, Aug +731, Sep +1,393, Oct -120.
- Placebo (share of random twins that made at least as much): H2 0.10, 2025 0.49, 2021-24 0.003. Neighbours positive: H2 6/9,
  2025 1/9, 2021-24 6/9. The 15-minute range, a wick breakout or a 1.5R target all fail at least two periods: a lone point.
- Daily P&L correlation with LIT: H1 +0.04, H2 +0.03, 2025 -0.02, 2021-24 +0.03.
- **Evals** (pass % / fail-or-stuck % within 2 weeks; 1 month in brackets):

| period | Builder 25K alone | next to LIT on the 50K (half need size) | LIT alone on the 50K |
|---|---|---|---|
| H1 | 0.0 / 0.0 (1.8 / 7.3) | 54.6 / 2.5 (76.1 / 5.5) | 57.1 / 5.9 (74.3 / 11.9) |
| H2 | 0.0 / 0.0 (18.6 / 0.0) | 53.6 / 0.0 (52.5 / 3.4) | 52.2 / 0.0 (50.8 / 0.0) |
| 2025 | 0.0 / 5.6 (0.0 / 17.2) | 14.9 / 6.4 (17.2 / 19.7) | 14.1 / 1.2 (20.9 / 6.3) |
| 2021-24 | 3.6 / 3.5 (7.2 / 7.4) | 16.0 / 10.8 (19.6 / 29.6) | 14.7 / 6.8 (18.6 / 25.3) |

  Next to LIT the back-to-back eval path makes +$36.2k / +$17.9k in H1 / H2 (LIT alone +$34.2k / +$9.1k) but -$5.1k / -$9.3k
  in 2025 / 2021-24 (LIT alone -$7.2k / -$17.8k with LIT on 5m bars there). It cuts H1 2-week fails (5.9 -> 2.5%) and adds
  fails in 2025 (1.2 -> 6.4%) and 2021-24 (6.8 -> 10.8%).
- **Verdict: weak lead, not adopted.** It fails 2025, it is 1.3 a week (not 2+), and its H2 rests on a few trades.

**Runner check** (run `hq_rev_h1_of_runner`; half at 1R, half to the other side of the range, breakeven at 1R): H1 +$3,873,
H2 +$3,187 (PF 1.92), 2025 -$3,085, 2021-24 +$1,658; true win falls to 36-46% with 27-36% scratches; drop 5 is negative in
every period. More money in 2026, less in 2021-24, same 2025 problem.

### 2. London range swept on both sides on an exhausted day, to 1R (peeked; run `hq_rev_peeked_bx`)

Rules: the 02:00-05:00 range; after 05:00 its high and its low have both been traded through; the second sweep closes back
inside within 3 bars; the day's range is already >= 1x the 14-day mean; to 1R; flat 15:55.

| period | trades | /wk | true win | PF | net | $/month | max DD | drop 5 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 | 7 | 0.27 | 71.4% | 2.22 | +$1,231 | +$202 | -$1,010 | -$1,010 |
| H2 | 6 | 0.38 | 66.7% | 1.68 | +$701 | +$189 | -$1,037 | -$534 |
| 2025 | 13 | 0.25 | 69.2% | 2.12 | +$2,169 | +$177 | -$510 | -$161 |
| 2021-24 | 35 | 0.21 | 74.3% | 2.51 | +$6,924 | +$179 | -$1,093 | +$4,564 |

- Positive every year (2021 +$1.3k, 2022 +$0.4k, 2023 +$3.6k, 2024 +$1.6k, 2025 +$2.2k, 2026 +$1.9k). The exhaustion idea
  at its purest.
- But it was found by looking at all four periods, it trades about **once a month**, it is the only one of 26,112 variants
  that passes the win gate everywhere (6 copies with different exits), and its one-step neighbours are not consistent.
  Evals: 0% 2-week passes on a 25K alone; next to LIT on the 50K H1 56.3/5.9, H2 43.5/0.0 (LIT alone 52.2/0.0 - fewer
  passes). Correlation with LIT -0.03 to +0.03. Too rare to be the strategy the owner asked for.

### 3. Stretched into a higher-timeframe pool, to 1R (H1 pick; run `hq_rev_h1_vx`)

Rules: an untaken prior-day, -week or -month high/low swept while the extreme is >= 3 ATR from the 18:00 VWAP, a close back
through it within 3 bars, 08:00-15:30, to 1R.

| period | trades | /wk | true win | PF | net | $/month | max DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| H1 (pick) | 29 | 1.13 | 65.5% | 1.62 | +$3,228 | +$530 | -$1,667 |
| **H2** | 11 | 0.71 | **27.3%** | 0.36 | **-$2,505** | -$674 | -$2,989 |
| 2025 | 73 | 1.41 | 56.2% | 1.24 | +$3,570 | +$291 | -$2,149 |
| 2021-24 | 227 | 1.39 | 51.5% | 0.94 | -$3,438 | -$89 | -$10,053 |

- Fails H2 and 2021-24; placebo beats random only in 2025 (p 0.01) and 2021-24 (p 0.05), where random entries lose heavily.
  Not tradable.

### Also checked, all rejected

- **Both-sides box, H1 pick** (`hq_rev_h1_bx`: London box, both sides, CISD, 1.5R): H1 +$4,152 (56% true win) -> H2 -$492
  (39%), 2025 -$5,887, 2021-24 -$10,359.
- **Pre-2025 re-pick of the box family** (`hq_rev_long_bx`): 2021-24 +$11,271 (56.5%) -> 2025 -$1,337, H1 -$283, H2 -$2,121.
- **Book of the three H1 picks** (`hq_rev_book_h1`, one position, max 2 a day): the only way to reach the frequency ask -
  3.3 / 3.1 / 4.2 / 4.1 trades a week and 81-95% of weeks with 2+ trades - but H1 +$10,376 (61% true win) then H2 -$680
  (46%), 2025 -$5,280, 2021-24 -$4,403. On a 25K alone: 2-week pass/dead 26.9/0.0, 15.9/11.6, 12.4/21.3, 14.5/24.8.
- **Book of the pre-2025 picks** (`hq_rev_book_long`): 2.0-2.8 a week; 2021-24 +$20,906 (56% true win) but 2025 -$5,374 and
  H2 -$724.

## What it means for the owner

- **High win rate, 2+ a week and real profit do not come together in this family.** A close target raises the hit rate but
  shrinks the winner to about 1R, and then 55% is barely enough to pay the costs. The setups that win 60%+ in one period fall
  to 45-50% in the next.
- **The exhaustion condition does not add an edge.** Stretched days keep stretching more often than they snap back.
- **LIT stays as it is.** The failed-ORB fade could be paper-watched next to LIT (it is uncorrelated and did not hurt LIT's
  H2 eval path), but it fails the 2025 check and the 2+ a week ask, so nothing is built and nothing is switched on.

## Files

- `tools/hq_revert.py` (events, grid, pick, evals, audit, save). Paper only; edits no engine file, no `live_model*.json`,
  no `second_model.json`.
- `research/hq/`: `picks.json` (picks, counts, chance, exhaustion pairs, placebo), `evals.json` (eval views, correlation,
  LIT + candidate equity), `audit.json` (40/40), `grid_compact.json` (every variant: n, true win, avg winner, PF, net per
  period), one file per candidate with its rules, numbers and every trade in the common format.
- Runs `hq_rev_*` in the run library (trades at $500 risk, costs in).
