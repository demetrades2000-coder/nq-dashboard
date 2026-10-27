## What was tested

1. **New bias ideas**, measured on the exact replay's trades (only information known before the entry):
   - **Yesterday's candle:** did yesterday (18:00-17:00 ET) close up or down? A trade "fades" it when it is a long
     after a down day or a short after an up day.
   - **Prior-week side:** is a long above / a short below last week's midpoint ((high + low) / 2)?
   - **This week's open:** longs below it, shorts above it.
   - **Daily/weekly draw on liquidity:** does the trade point to the nearest untaken prior-day / prior-week high or
     low?
   - **SMT divergence NQ vs ES** at the sweep. ES 5-minute data only starts in April 2025, so this is information only.
2. **Three ways to use a bias:** skip the trades against it (filter), add or remove a confluence point (changes
   which setup is first each day; new engine options `w_pdc` and `w_pwmid`, off by default), or keep every trade and
   only **trade smaller** when it is against the trade (every setup is still traded, so trades a week stay the same).
3. **Existing filters on today's settings:** trending-market rule, big-range-day block, VIX limits, news rules, minor
   pools, the confluence threshold and weights, longs / shorts only.
4. **Timing:** morning only, afternoon only, wider windows, setup expiry, when sweeps start counting.

Methods: size rules and filters on the exact replay's trades are exact (a skipped trade gets no replacement later
that day, so filters there are information only). Score points, engine filters and timing change which trades are
taken: one-pass 5-year backtest, compared with the same backtest of today's rules.

Tested before: 6 daily-bias methods (`engine/daily_bias.py`, "use as context, never as a veto"), 92 confluences,
grade sizing, regime skip / off, range 1.2 / off, AM only, wider AM, arm expiry 30 / 90, minor pools off, min score
0 / 2 and the weights, all on the old settings.

## 1. The two biases that hold in both periods

Average R per trade on the exact replay (all 768 live-strategy trades):

| Bias | 2026: with / against | 2021-25: with / against | Years where "with" is better |
|---|---|---|---|
| Fade yesterday's candle | +0.37R (49) / +0.27R (39) | +0.07R (346) / −0.08R (333) | 6 of 6 (2022 by a hair) |
| Prior-week side | +0.93R (34) / +0.03R (55) | +0.02R (270) / −0.02R (409) | 4 of 6 |
| Both against the trade | - | - | about 1 trade in 5 (15-26% by year) |

This week's open did not separate trades (2026 +0.47R vs +0.33R the "wrong" way round, 2021-25 −0.02R vs +0.01R).
Neither did the **daily/weekly draw on liquidity** (trading toward the nearest untaken prior-day or prior-week high
or low): better in 2026 (+0.49R vs +0.26R) but not in 2021-25 (−0.02R vs 0.00R).

## 2. Using them: filter, score point or size

| Setting | 2026 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | 2021-25 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | back-to-back pass/fail | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Today (exact replay)** | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | baseline |
| Filter: only fade-yesterday trades | 50 | 1.21 | 4.29 | +$13.4k | −$2.0k | 10.2/0 · 16.5/0 | 346 | 1.61 | 1.18 | +$7.2k | −$8.1k | 2.9/0.3 · 4.5/1.6 | 5/8 | info |
| Filter: only prior-week-side trades | 34 | 0.83 | 6.79 | +$15.1k | −$0.7k | 14.6/0 · 21.8/0 | 270 | 1.26 | 1.27 | +$7.7k | −$3.0k | 1.6/0.1 · 2.4/0.6 | 3/6 | info |
| Filter: only longs below / shorts above the weekly open | 61 | 1.48 | 3.35 | +$12.9k | −$3.6k | 17/0 · 22.3/0 | 408 | 1.9 | 1.09 | +$3.9k | −$7.8k | 3.1/1.1 · 4.9/3.5 | 4/8 | info |
| Filter: only SMT trades (ES from 2025-04) | 29 | 0.7 | 4.14 | +$7.8k | −$1.4k | 6.8/0 · 9.2/0 | 24 | 0.11 | 1.53 | +$1.3k | −$2.0k | 0/0 · 0/0 | 1/1 | info |
| Filter: only trades toward the nearest daily/weekly pool | 44 | 1.07 | 4.37 | +$14.1k | −$2.7k | 12.1/0 · 17/0 | 346 | 1.61 | 1.19 | +$6.9k | −$8.1k | 2.6/0.9 · 3.6/1.9 | 5/8 | info |
| Score point: fade yesterday (one-pass) | 80 | 1.94 | 2.78 | +$12.9k | −$2.8k | 11.2/0 · 17.5/0 | 595 | 2.74 | 0.96 | −$2.6k | −$10.4k | 1.9/1.5 · 3.1/3.8 | 7/17 | rejected |
| Score point: prior-week side (one-pass) | 56 | 1.36 | 2.93 | +$12.0k | −$2.1k | 9.7/0 · 14.6/0 | 526 | 2.42 | 0.94 | −$3.5k | −$9.9k | 2.9/0.6 · 4/1.7 | 4/12 | rejected |
| Half size if it follows yesterday | 89 | 2.16 | 3.61 | +$16.3k | −$2.2k | 12.6/0 · 19.9/0 | 679 | 3.17 | 1.12 | +$6.7k | −$9.4k | 2.8/0.9 · 4.6/1.9 | 6/10 | rejected |
| Half size if against the prior-week side | 89 | 2.16 | 3.99 | +$16.9k | −$1.6k | 14.6/0 · 21.8/0 | 679 | 3.17 | 1.14 | +$7.3k | −$6.9k | 2.2/0.4 · 3.5/1.1 | 6/9 | rejected |
| Half size if either is against | 89 | 2.16 | 4.08 | +$14.5k | −$1.6k | 9.7/0 · 14.6/0 | 679 | 3.17 | 1.11 | +$4.7k | −$6.7k | 1.9/0 · 3.2/0.5 | 5/8 | rejected |
| Half size if both are against | 89 | 2.16 | 3.6 | +$18.6k | −$2.2k | 17.5/0 · 27.2/0 | 679 | 3.17 | 1.14 | +$9.3k | −$9.4k | 3.1/1.6 · 4.9/2.7 | 7/13 | rejected |
| **70% size if both are against** | 89 | 2.16 | 3.62 | +$19.4k | −$2.3k | 18.4/0 · 27.2/0 | 679 | 3.17 | 1.12 | +$8.6k | −$10.0k | 3.6/1.6 · 5.1/3 | 7/14 | promising |
| One-third size if both are against | 89 | 2.16 | 3.67 | +$18.1k | −$2.0k | 15/0 · 24.8/0 | 679 | 3.17 | 1.15 | +$9.8k | −$8.9k | 3/1.6 · 4.5/2.8 | 7/11 | rejected |
| 70% size if it follows yesterday | 89 | 2.16 | 3.7 | +$18.0k | −$2.3k | 14.1/0 · 20.9/0 | 679 | 3.17 | 1.11 | +$7.0k | −$9.8k | 3.4/1.5 · 4.7/2.6 | 7/11 | rejected |
| 70% size if against the prior-week side | 89 | 2.16 | 4.0 | +$18.4k | −$1.8k | 15/0 · 24.3/0 | 679 | 3.17 | 1.12 | +$7.0k | −$8.4k | 3.1/0.7 · 4.1/1.2 | 7/10 | rejected |
| Half size if pointing away from the nearest daily/weekly pool | 89 | 2.16 | 3.72 | +$16.9k | −$2.3k | 14.6/0 · 19.9/0 | 679 | 3.17 | 1.12 | +$6.7k | −$9.1k | 3.6/1.1 · 5.1/2.8 | 5/10 | rejected |
| Half size when VIX is above 20 | 89 | 2.16 | 3.61 | +$19.7k | −$2.4k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.14 | +$9.0k | −$7.5k | 4.1/1.8 · 6.1/3.5 | 6/13 | promising |
| 70% size when VIX is above 20 | 89 | 2.16 | 3.59 | +$20.0k | −$2.5k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.13 | +$8.4k | −$8.8k | 4.1/1.8 · 6.1/3.6 | 6/14 | promising |

What it means:

- **As filters they are strong but leave 1-1.6 trades a week**, below the owner's 2-4 a week.
- **As score points they backfire:** the setups that take the freed-up slot later in the day are worse (2021-25 PF
  0.94-0.96). The edge is in sizing the trade the bot already found, not in looking for a different one.
- **As a size-down they improve PF and drawdown in both periods**, but in 2026 even the "against" trades made
  money, so trading them smaller always costs some 2026 profit. The mildest useful version, 70% size when both
  biases disagree (about 1 trade in 5), costs 2026 $0.75k (−4%) and adds $2.1k to 2021-25 with a smaller drawdown
  and fewer failed evals (2021-25 failed within 3 weeks 3.0% vs 5.7%, back-to-back 7/14 vs 7/18), but passes come
  slower (2021-25 passed within 2 weeks 3.6% vs 4.1%), against the owner's eval-speed rule. By year: 2021 +$0.2k,
  2022 +$1.2k, 2023 +$0.6k, 2024 −$1.0k, 2025 +$1.1k. It fails the strict rule (2026 net is lower), so it is not
  recommended for Sunday; it is a sizing rule, so it belongs with the sizing research.
- **Honest caveat:** both biases were found by looking at these same trades; the "both against" combination was
  picked from four. Treat them as leads, not proven edges.

## 3. Existing filters and timing on today's settings (one-pass backtest)

| Setting | 2026 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | 2021-25 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | back-to-back pass/fail | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Today (one-pass yardstick)** | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.11 | +$8.8k | −$11.6k | 4.7/2 · 6.6/5.6 | 7/18 | yardstick |
| Bank at 3R when the 1D/4H/1H gaps point against | 89 | 2.16 | 3.02 | +$16.9k | −$2.6k | 13.6/0 · 20.9/0 | 691 | 3.18 | 1.1 | +$8.0k | −$11.0k | 3.6/2.4 · 5.9/6 | 8/16 | rejected |
| Skip trending markets (today half size) | 71 | 1.72 | 3.36 | +$18.2k | −$3.1k | 17.5/0 · 27.7/0 | 505 | 2.32 | 1.14 | +$8.7k | −$11.4k | 4.3/1.5 · 6.5/2.8 | 7/17 | rejected |
| Full size in trending markets | 89 | 2.16 | 3.26 | +$21.2k | −$2.8k | 19.9/0 · 27.2/0 | 691 | 3.18 | 1.11 | +$9.9k | −$10.8k | 6.1/2.9 · 8.7/7 | 11/22 | rejected |
| No big-range-day block | 97 | 2.35 | 3.12 | +$19.8k | −$3.1k | 18.9/0 · 28.2/0 | 707 | 3.25 | 1.08 | +$6.7k | −$11.9k | 4.7/2 · 6.6/5.6 | 8/18 | rejected |
| Range block at 1.2x | 82 | 1.99 | 3.29 | +$18.0k | −$2.5k | 19.4/0 · 28.6/0 | 649 | 2.99 | 1.07 | +$5.5k | −$10.0k | 4.7/2 · 6.9/4.5 | 8/17 | rejected |
| Range block at 2x | 95 | 2.31 | 3.23 | +$20.2k | −$3.0k | 18.9/0 · 28.2/0 | 704 | 3.24 | 1.09 | +$6.9k | −$11.9k | 4.7/2 · 6.6/5.6 | 8/18 | rejected |
| Skip VIX above 20 | 77 | 1.87 | 3.59 | +$19.0k | −$2.6k | 19.4/0 · 28.2/0 | 475 | 2.18 | 1.26 | +$13.2k | −$6.0k | 4.6/1.7 · 6.5/3.5 | 7/11 | rejected |
| Skip VIX above 25 | 83 | 2.01 | 3.44 | +$18.7k | −$2.9k | 19.4/0 · 28.2/0 | 604 | 2.78 | 1.14 | +$9.5k | −$10.0k | 4.7/2.3 · 6.6/5.7 | 7/16 | rejected |
| Skip VIX above 30 | 88 | 2.14 | 3.39 | +$19.6k | −$2.9k | 19.4/0 · 28.2/0 | 659 | 3.03 | 1.1 | +$7.8k | −$12.0k | 4.7/2 · 6.6/5.6 | 8/18 | rejected |
| Skip VIX below 13 | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 646 | 2.97 | 1.12 | +$8.5k | −$11.6k | 4.7/1.9 · 6.6/5.4 | 7/14 | rejected |
| Ignore the 1H trend | 95 | 2.31 | 2.88 | +$15.1k | −$2.5k | 12.6/0 · 21.4/0 | 760 | 3.5 | 1.01 | +$1.1k | −$14.1k | 4.1/2 · 6.1/5.5 | 8/20 | rejected |
| 1H trend counts double | 48 | 1.17 | 2.65 | +$6.8k | −$2.1k | 6.3/0 · 8.7/0 | 405 | 1.86 | 1.08 | +$3.6k | −$6.0k | 1.6/0 · 2.4/0 | 3/8 | rejected |
| Ignore discount/premium | 47 | 1.14 | 3.22 | +$7.5k | −$2.0k | 6.3/0 · 8.7/0 | 364 | 1.67 | 1.02 | +$0.8k | −$7.8k | 1.5/0 · 2.4/0 | 2/10 | rejected |
| No penalty for a late 15m entry | 91 | 2.21 | 2.75 | +$15.4k | −$2.8k | 14.6/0 · 20.9/0 | 715 | 3.29 | 1.15 | +$11.8k | −$11.5k | 4.9/2 · 6.3/5.2 | 8/17 | rejected |
| Point for trading toward the nearest major pool | 97 | 2.35 | 3.01 | +$18.5k | −$2.7k | 19.4/0 · 27.2/0 | 758 | 3.49 | 1.13 | +$10.9k | −$14.1k | 4.6/2.5 · 6.6/5.2 | 10/18 | rejected |
| Penalty for trading toward it | 60 | 1.46 | 2.94 | +$10.4k | −$2.5k | 9.7/0 · 14.6/0 | 524 | 2.41 | 1.06 | +$3.3k | −$7.3k | 4/1.9 · 6.5/4.2 | 6/15 | rejected |
| Confluence score 0 is enough | 103 | 2.5 | 2.74 | +$17.6k | −$2.8k | 18/0 · 24.3/0 | 789 | 3.63 | 1.08 | +$6.8k | −$13.4k | 4.1/2.2 · 5.9/4.7 | 9/20 | rejected |
| Confluence score 2 needed | 36 | 0.87 | 2.21 | +$3.0k | −$1.6k | 0/0 · 0/0 | 319 | 1.47 | 1.03 | +$1.2k | −$6.7k | 1.5/0 · 2.1/0 | 4/7 | rejected |
| Only major pools arm a setup | 52 | 1.26 | 3.87 | +$11.0k | −$1.9k | 12.6/0 · 18/0 | 510 | 2.35 | 1.14 | +$8.3k | −$11.2k | 3.4/0.6 · 5.3/1.2 | 8/16 | rejected |
| No news blackout | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 693 | 3.19 | 1.11 | +$8.7k | −$11.6k | 4.7/2 · 6.6/5.6 | 7/18 | rejected |
| Wider news blackout (30 before, 60 after) | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 688 | 3.16 | 1.1 | +$7.8k | −$11.6k | 4.7/2.1 · 6.5/6.3 | 7/18 | rejected |
| Trade FOMC afternoons | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.11 | +$8.8k | −$11.6k | 4.7/2 · 6.6/5.6 | 7/18 | no effect |
| Skip CPI, jobs-report and FOMC days | 82 | 1.99 | 3.88 | +$19.0k | −$2.5k | 19.4/0 · 28.2/0 | 645 | 2.97 | 1.0 | +$0.3k | −$13.7k | 3.8/2 · 5.7/5.3 | 6/19 | rejected |
| Longs only | 41 | 1.0 | 2.59 | +$5.5k | −$1.2k | 4.9/0 · 7.3/0 | 372 | 1.71 | 1.07 | +$2.8k | −$11.1k | 2.8/0.3 · 4/1 | 4/9 | info |
| Shorts only | 55 | 1.33 | 3.26 | +$10.9k | −$2.7k | 14.1/0 · 21.4/0 | 479 | 2.2 | 0.94 | −$3.2k | −$10.6k | 1.8/1.3 · 3.6/2.4 | 5/15 | info |
| Morning killzone only | 49 | 1.19 | 2.65 | +$10.1k | −$2.5k | 5.3/0 · 8.7/0 | 528 | 2.43 | 0.95 | −$3.0k | −$10.5k | 2.8/0.9 · 3.7/2.8 | 4/14 | rejected |
| Afternoon killzone only | 51 | 1.24 | 3.51 | +$6.8k | −$1.4k | 4.9/0 · 7.3/0 | 348 | 1.6 | 0.97 | −$1.4k | −$10.0k | 0.2/0.3 · 0.6/0.7 | 3/12 | rejected |
| Wider windows (09:30-12:00, 13:00-15:30) | 100 | 2.43 | 2.94 | +$19.1k | −$2.4k | 19.4/0 · 28.2/0 | 753 | 3.46 | 1.0 | −$0.2k | −$12.3k | 2.6/2.5 · 4.9/5.9 | 7/21 | rejected |
| Morning window from 10:00 | 71 | 1.72 | 3.9 | +$14.7k | −$2.5k | 14.1/0 · 20.9/0 | 598 | 2.75 | 0.85 | −$9.9k | −$15.2k | 2.3/2.8 · 3.2/5.5 | 4/17 | rejected |
| Setup expires after 30 min (today 60) | 84 | 2.04 | 3.36 | +$18.3k | −$2.5k | 19.4/0 · 27.7/0 | 622 | 2.86 | 1.0 | −$0.0k | −$9.5k | 3.1/1.8 · 4.4/3.9 | 5/18 | rejected |
| Setup expires after 45 min | 87 | 2.11 | 3.07 | +$16.4k | −$2.7k | 14.6/0 · 20.9/0 | 661 | 3.04 | 1.05 | +$3.3k | −$9.5k | 3.7/2 · 5.4/4.5 | 5/17 | rejected |
| Setup expires after 90 min | 92 | 2.23 | 3.09 | +$20.1k | −$2.6k | 23.8/0 · 34/0 | 715 | 3.29 | 1.03 | +$2.5k | −$13.0k | 3.8/2.1 · 5.3/5.5 | 7/18 | rejected |
| Sweeps count from 07:00 (today 08:00) | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 692 | 3.18 | 1.12 | +$9.1k | −$11.3k | 4.7/2 · 6.6/5.6 | 7/18 | rejected |
| Sweeps count from 09:00 | 87 | 2.11 | 3.0 | +$14.9k | −$2.7k | 13.6/0 · 20.9/0 | 679 | 3.12 | 1.05 | +$3.4k | −$11.7k | 4.3/2 · 6.3/4.9 | 7/19 | rejected |
| Sweeps count from 09:30 | 83 | 2.01 | 3.33 | +$16.8k | −$2.3k | 18.4/0 · 27.7/0 | 659 | 3.03 | 1.02 | +$1.5k | −$11.4k | 4.3/2.6 · 5.8/5.2 | 7/19 | rejected |

What it means:

- **The trending-market rule is right as half size.** Skipping trending markets drops 2026 to 1.7 trades a week;
  full size makes a little more money but with more failed evals (2021-25: 13.3% of evals fail within a month vs 9.3%).
- **The 1.6x range block is right**: off or 2x adds trades that lose; 1.2x drops below 2 a week.
- **VIX above 25** helps 2021-25 (mostly 2022) but costs 2026 $1.2k and puts it at 2.0 a week: not worth it.
- **Both killzones are needed**: either one alone loses money over 2021-25 and halves the trades; starting the
  morning at 10:00 or widening the windows loses money too. A 60-minute setup expiry and sweeps from 08:00 are
  right (07:00 changes almost nothing: +$0.3k in 2021-25, 2026 identical).
- **The confluence score is tuned**: dropping the 1H trend or the discount/premium point, or asking for 2 points,
  either collapses the trade count or loses money; dropping the late-entry penalty helps 2021-25 (+$3.0k) but costs
  2026 $4.5k.
- **News rules barely matter** (no blackout, a wider one or trading FOMC afternoons change almost nothing); skipping
  CPI / NFP / FOMC days entirely loses $8.5k in 2021-25.
- **VIX above 20** is the strongest 2021-25 filter found (+$4.4k, PF 1.26, drawdown −$6.0k) because it removes most
  of 2022, but it drops 2026 to 1.9 trades a week. As a **size-down** instead (exact, every trade kept): half size when
  VIX > 20 gives 2026 PF 3.61 / +$19.7k (−$0.45k) and 2021-25 PF 1.14 / +$9.0k (+$2.5k, drawdown −$7.5k); 70% size
  gives 2026 +$20.0k (−$0.1k) and 2021-25 +$8.4k (runs `flt_vix20_half`, `flt_vix20_07`, both "promising"). Like the
  bias size-down it is a sizing rule: hand it to the sizing research.

## Verdict

- No bias, filter or timing change is recommended for Sunday.
- The two new biases (yesterday's candle, prior-week side) are real enough to keep researching as a **size**
  rule: "70% size when both disagree" is the best balance found (PF up in both periods, 2026 −$0.75k).
- Never use them as filters or score points: frequency falls under 2 a week and the replacement trades lose.
