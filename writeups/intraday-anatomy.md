## The short answer

I cut the 768 trades of the locked strategy (exact live-loop replay, live sizing with the quarter-size cold streak and the
half-size late entry, commissions and slippage in) every way the clock and the setup allow, in 2026 (89 trades) and in
2021-25 (679 trades) separately.

- **Timing does not hold up.** Every hour and every weekday that looks great in one period is flat or bad in the other.
  11:00 made +$11k in 2026 on 8 trades and +$0.8k on 77 trades in 2021-25. Friday is the best day of 2026 and the only
  losing day of 2021-25. Wednesday is the opposite. The 3D heat map (`research/lab/intraday_heat.json`) shows this: the
  two periods do not look alike.
- **The two things that do hold up in both periods are about the setup, not the time:** the **trigger** (CISD beats IFVG) and
  the **stop width** (30-40 pt stops lose; under 30 pts wins). A third, **trades aiming at equal highs/lows**, lost in both
  periods but is a coin flip year by year.
- **The management rules look right.** 35-43% of trades reach +1R; of those, a third go on to the target and a third
  come back to breakeven. The 5R bank is hit by 18% of capped trades in 2026 and 5% in 2021-25; the trades that reach
  +3R on the way to a 5R cap finish at +4.9R (2026) and +2.7R (2021-25) on average, so letting them run is right.
  Winners rarely go far against you first: their median worst point is 0.2-0.3R, and only 9-12% of winners were ever
  0.7R under water, which is why tighter stops failed in the stops study.

Baseline for every table: 2026 +$20,487 ($2,088/mo), PF 3.94, max DD -$2,249; 2021-25 +$16,379 ($321/mo), PF 1.27,
max DD -$9,265.

## 1. The clock

**AM vs PM killzone.** Both make money in both periods. AM is where most trades are (55% in 2026, 77% in 2021-25).
Per trade they are the same within noise: in 2026 AM is better (+0.53R vs +0.26R), in 2021-25 PM is (+0.07R vs -0.01R).

| | 2026 n | avg R | PF | net | 2021-25 n | avg R | PF | net |
|---|---|---|---|---|---|---|---|---|
| AM (09:30-11:30) | 49 | 0.53 | 3.99 | +$13,965 | 523 | -0.006 | 1.26 | +$12,719 |
| PM (13:30-15:30) | 40 | 0.26 | 3.83 | +$6,522 | 156 | 0.072 | 1.29 | +$3,660 |

**Entry hour (ET).** Only the opening half hour is positive in both periods (2026 PF 3.1, 2021-25 PF 1.45 and the biggest
money maker, +$10.6k on 245 trades). 10:00 is the weakest hour in both (2026 PF 0.13 on 12 trades, 2021-25 PF 1.07). Every
other hour flips sign between the periods.

| hour | 2026 n | avg R | PF | net | 2021-25 n | avg R | PF | net |
|---|---|---|---|---|---|---|---|---|
| 09:30-09:59 | 29 | 0.41 | 3.14 | +$4,899 | 245 | 0.083 | 1.45 | +$10,564 |
| 10:00-10:59 | 12 | -0.34 | 0.13 | -$1,888 | 201 | -0.066 | 1.07 | +$1,365 |
| 11:00-11:30 | 8 | 2.26 | 55.5 | +$10,954 | 77 | -0.133 | 1.14 | +$790 |
| 13:30-13:59 | 12 | -0.31 | 0.01 | -$1,025 | 47 | 0.181 | 1.05 | +$198 |
| 14:00-14:59 | 16 | 0.93 | 19.8 | +$7,359 | 74 | -0.011 | 0.76 | -$1,610 |
| 15:00-15:30 | 12 | -0.06 | 1.21 | +$188 | 35 | 0.098 | 3.76 | +$5,072 |

**Weekday x hour (n / avg R / net $).** 2026 first, 2021-25 second. No cell agrees across the two tables except
"Thursday 11:00" (+$3.8k and +$3.1k, on 2 and 15 trades) and "Friday 10:00" (negative in both, on 1 and 40 trades).
Nothing to build on.

| 2026 | 9:00 | 10:00 | 11:00 | 13:00 | 14:00 | 15:00 |
|---|---|---|---|---|---|---|
| Mon | 7 / -0.17 / -597 | 4 / -0.46 / -677 | 1 / 4.98 / +3,764 | 2 / -0.30 / -111 | 4 / 0.42 / +509 | 3 / 0.41 / +747 |
| Tue | 3 / 0.01 / +216 | 1 / -0.01 / -3 | 3 / 1.29 / +2,395 | 3 / -0.54 / -463 | 2 / -0.15 / -78 | 1 / 1.71 / +146 |
| Wed | 5 / -0.09 / +488 | 2 / -1.03 / -973 | 1 / -0.11 / -60 | 1 / -1.02 / -354 | 2 / -0.69 / -143 | 2 / -0.84 / -262 |
| Thu | 8 / 0.34 / +96 | 4 / 0.22 / -129 | 2 / 2.17 / +3,814 | 3 / -0.09 / -62 | 3 / 1.35 / +3,815 | 4 / -0.48 / -396 |
| Fri | 6 / 1.81 / +4,696 | 1 / -1.02 / -106 | 1 / 4.96 / +1,041 | 3 / -0.07 / -34 | 5 / 2.17 / +3,257 | 2 / -0.04 / -48 |

| 2021-25 | 9:00 | 10:00 | 11:00 | 13:00 | 14:00 | 15:00 |
|---|---|---|---|---|---|---|
| Mon | 49 / -0.10 / -1,656 | 34 / 0.18 / +2,856 | 18 / -0.22 / -649 | 7 / 0.26 / +793 | 17 / -0.19 / -32 | 10 / -0.30 / +113 |
| Tue | 52 / 0.14 / +7,081 | 44 / -0.19 / +24 | 14 / -0.26 / -423 | 9 / -0.33 / -626 | 15 / -0.17 / -1,355 | 4 / 0.21 / +91 |
| Wed | 50 / 0.26 / +6,119 | 45 / 0.20 / +4,499 | 18 / 0.08 / -353 | 6 / 0.52 / +36 | 16 / 0.42 / +1,096 | 7 / 0.31 / +254 |
| Thu | 47 / 0.03 / -20 | 38 / -0.54 / -3,951 | 15 / 0.04 / +3,097 | 10 / -0.19 / -1,576 | 11 / 0.22 / +533 | 5 / 0.11 / +2,545 |
| Fri | 47 / 0.07 / -959 | 40 / 0.01 / -2,062 | 12 / -0.40 / -882 | 15 / 0.56 / +1,572 | 15 / -0.28 / -1,853 | 9 / 0.32 / +2,069 |

**Weekday alone:** 2026 Wed -$1.3k (PF 0.45) and Fri +$8.8k (PF 13.5); 2021-25 Wed +$11.7k (PF 2.31) and Fri -$2.1k
(PF 0.83). The calendar study (`calendar-effects.md`) reached the same conclusion with more factors: trade every day.

## 2. The trigger: CISD beats IFVG

This is the strongest thing in the data and it is known at entry.

| trigger | 2026 n | avg R | win | PF | net | 2021-25 n | avg R | win | PF | net |
|---|---|---|---|---|---|---|---|---|---|---|
| IFVG | 59 | 0.15 | 22% | 2.41 | +$5,282 | 495 | 0.003 | 22% | 1.11 | +$4,306 |
| CISD | 30 | 0.93 | 33% | 5.73 | +$15,205 | 184 | 0.035 | 18% | 1.53 | +$12,073 |

CISD (the leg into the sweep had no fair value gap, so the trigger is a close back through the open of the run) made
three quarters of the 2026 money on a third of the trades, and three quarters of the 2021-25 money on 27% of the trades.
Per trade CISD beat IFVG in 4 of 6 years (2021, 2022, 2023, 2026; not 2024, 2025). A random group of 30 trades did as
well as the 2026 CISD group only 1.6% of the time; for 2021-25 (184 trades) 7%. Real, but not huge in the old years.

**Trigger timeframe:** every one of the 768 trades triggered on the 5-minute chart (`trigger_tf` is always `5m`). There
is nothing to compare; the 1-minute trigger was tested as a separate model (ATM 1m) and rejected earlier.

## 3. What was swept

Whether the sweep took a major pool or only a 15-minute swing made no consistent difference (major: 2026 PF 4.07,
2021-25 PF 1.18; minor only: PF 2.82 and 1.38). Among the majors, overnight highs/lows were the money maker of 2026
(+$8.3k on 22 trades) but flat in 2021-25 (+$1.1k on 224). Sweeps of the prior-week high/low lost in both periods (-$54
on 2, -$914 on 17), too thin to act on. 1H swing sweeps were good in 2021-25 (PF 3.47, +$5.5k on 34) and neutral in 2026
(3 trades).

| pool swept | 2026 n | avg R | PF | net | 2021-25 n | avg R | PF | net |
|---|---|---|---|---|---|---|---|---|
| overnight H/L | 22 | 0.84 | 5.33 | +$8,278 | 224 | -0.035 | 1.04 | +$1,096 |
| prior day H/L | 9 | 0.36 | 3.45 | +$856 | 84 | 0.118 | 1.19 | +$934 |
| London H/L | 4 | -0.38 | 0 | -$295 | 44 | 0.126 | 1.03 | +$163 |
| 1H swing | 3 | 0.03 | 2.03 | +$378 | 34 | 0.222 | 3.47 | +$5,480 |
| equal highs/lows | 4 | 1.22 | 25.4 | +$4,377 | 33 | -0.053 | 1.77 | +$2,109 |
| prior week H/L | 2 | -0.04 | 0.1 | -$54 | 17 | -0.495 | 0 | -$914 |
| 15m swing only | 44 | 0.26 | 2.82 | +$6,948 | 238 | 0.002 | 1.38 | +$7,170 |

## 4. Stop width

The sizing already follows the stop ($800 up to 20 pts, then less). Even so, the 30-40 pt bucket loses money in both
periods and in 4 of 6 years, while stops under 30 pts carry most of the profit.

| stop | 2026 n | avg R | win | PF | net | 2021-25 n | avg R | win | PF | net |
|---|---|---|---|---|---|---|---|---|---|---|
| under 20 pts | 5 | 2.88 | 60% | 60 | +$9,634 | 68 | 0.082 | 19% | 1.71 | +$8,423 |
| 20-30 | 14 | 1.11 | 43% | 6.36 | +$9,160 | 94 | 0.014 | 20% | 1.23 | +$3,324 |
| 30-40 | 16 | -0.04 | 25% | 0.63 | -$640 | 160 | -0.056 | 19% | 0.94 | -$834 |
| 40-50 | 27 | 0.12 | 22% | 1.19 | +$350 | 171 | 0.008 | 19% | 1.18 | +$1,994 |
| 50-60 | 27 | 0.14 | 15% | 2.32 | +$1,984 | 186 | 0.047 | 26% | 1.35 | +$3,471 |

A random group of 16 trades lost as much as the 2026 30-40 group 7% of the time; for 2021-25 (160 trades) 17%. So the
evidence is moderate, and the money in it is small.

## 5. Which pool is aimed at

| target | 2026 n | avg R | PF | net | hit % | 2021-25 n | avg R | PF | net | hit % |
|---|---|---|---|---|---|---|---|---|---|---|
| 5R cap (draw farther) | 39 | 0.75 | 7.59 | +$16,907 | 18% | 205 | 0.007 | 1.30 | +$6,610 | 5% |
| 1H swing | 17 | 0.95 | 6.07 | +$3,136 | 35% | 89 | 0.213 | 2.25 | +$6,245 | 15% |
| overnight H/L | 13 | -0.75 | 0 | -$1,712 | 0% | 129 | 0.107 | 1.65 | +$7,166 | 19% |
| equal highs/lows | 10 | -0.36 | 0.42 | -$852 | 0% | 120 | -0.054 | 0.94 | -$711 | 13% |
| London H/L | 6 | 0.75 | 11.1 | +$2,911 | 33% | 46 | -0.234 | 0.58 | -$2,301 | 13% |
| prior day H/L | 1 | 1.85 | - | +$406 | 100% | 61 | -0.207 | 0.47 | -$1,902 | 7% |
| prior week H/L | 1 | -0.10 | 0 | -$12 | 0% | 19 | -0.303 | 0.52 | -$645 | 5% |
| Asia H/L | 2 | -1.03 | 0 | -$298 | 0% | 10 | 0.949 | 47 | +$1,917 | 50% |

Two things agree across periods: trades aiming at a **1H swing** are good (PF 6.1 and 2.3) and trades aiming at **equal
highs/lows** lose (PF 0.42 and 0.94, the target reached 0% and 13% of the time). Equal highs/lows are the pools everybody
sees, and price often stops just short of them. Year by year the equal-highs slice lost in 2022, 2024, 2025 and 2026
and won in 2021 and 2023, so it is a lean, not a law.

**Planned reward.** Trades whose target was under 2R away made nothing in either period (PF 0.93 and 1.01); 2-3R and
3-5R were fine; the 5R-capped trades made 83% of the 2026 money. Halving the under-2R trades changes nothing in 2026 and
costs $854 in 2021-25 (most of them are already 1-micro trades, and a 1-micro trade cannot be halved), so no.

## 6. Confluence score

Score 1 (the minimum) carries the strategy: +$16.2k of $20.5k in 2026 (PF 4.32) and +$6.7k in 2021-25 (PF 1.17). Scores
2 and 3 are better per trade in 2021-25 (PF 1.52, 1.40) and worse or equal in 2026 (PF 1.66, 3.69). No consistent
ordering; the score is a gate, not a grade, which matches the earlier grade-sizing rejection.

## 7. Time in trade (known only afterwards)

| held | 2026 n | avg R | win | net | 2021-25 n | avg R | win | net |
|---|---|---|---|---|---|---|---|---|
| 15 min or less | 41 | -0.27 | 12% | -$480 | 265 | -0.59 | 4% | -$35,603 |
| 20-30 min | 23 | 0.28 | 22% | +$6,010 | 234 | -0.22 | 18% | -$5,493 |
| 35-60 min | 12 | 0.51 | 33% | +$1,940 | 90 | 0.93 | 34% | +$23,363 |
| 1-2 hours | 11 | 2.82 | 73% | +$10,600 | 50 | 1.33 | 58% | +$16,408 |
| over 2 hours | 2 | 2.01 | 50% | +$2,416 | 40 | 1.62 | 78% | +$17,704 |

Almost every trade that is over inside 15 minutes is a full stop-out (the median stop-out lasts 10 minutes and its best
point was +0.21R). Everything that survives 35 minutes is a winner more often than not. This cannot be used at entry, but
it says the 30-minute time stop is cutting the right trades: the trades it closes (99 in 2021-25, 9 in 2026) averaged
-0.3R and had only reached +0.26R.

## 8. Best point and worst point (MFE / MAE)

| | 2026 | 2021-25 |
|---|---|---|
| trades reaching +0.5R / +1R / +2R / +3R / +5R | 64% / 43% / 25% / 16% / 7% | 57% / 35% / 17% / 10% / 2% |
| median best point, winners / losers | 3.29R / 0.54R | 2.46R / 0.48R |
| real losers (worse than -0.1R) | 41 | 399 |
| ... that were +0.5R first | 14 (34%) | 136 (34%) |
| ... that were +1R first | 0 | 26 (6.5%), 21 of them on trending days (breakeven waits for +3R there) |
| trades that reached +1R | 38 | 237 |
| ... then hit the target / went back to breakeven / giveback exit | 16 / 14 / 2 | 81 / 85 / 28 |
| breakeven exits: median best point, share that saw +2R | 1.77R, 36% | 1.63R, 29% |
| 5R-capped trades: hit the 5R | 7 of 39 (18%) | 11 of 205 (5%) |
| 5R-capped trades that reached +3R: hit 5R / final R | 7 of 8, +4.88R | 11 of 34, +2.69R |
| winners: median worst point / share 0.5R+ under water / 0.7R+ | 0.21R / 22% / 9% | 0.31R / 27% / 12% |
| full stop-outs: share of trades, median best point | 28%, 0.21R | 31%, 0.21R |

What this says:

- **The 1R breakeven is doing its job.** No 2026 trade that reached +1R turned into a real loss; in 2021-25 only 26 did,
  21 of them on trending days where the rule now waits for +3R (the management study showed that wait pays overall). The
  price of the rule is the 14 / 85 breakeven exits that had typically been +1.6-1.8R, a third of them +2R, and came back.
  Partial profits at +1.5-2R were tested earlier and rejected; this table shows why it is close: those trades hold about as
  much paper profit as the ones that run.
- **The 5R bank is right.** Trades that get to +3R on the way to a far draw mostly keep going (7 of 8 reached 5R in 2026,
  11 of 34 in 2021-25, and the rest still finished at +2.7R on average). Banking earlier (3-4R) was already shown to cost
  2026 $5-8k. Not banking at all was worse too; 5R stays.
- **Losers die fast and small.** A third of real losers were +0.5R first, then the giveback or the stop took them. The
  giveback exits (19 / 158) cost -0.2R to -0.25R each after being +0.7R; that is the price of not letting a +0.5R trade
  become a -1R one. The full stop-outs are 28-31% of trades and most never got going (best point +0.21R).
- **Stops are not too wide.** Winners rarely spend time under water: only 9-12% of them were ever 0.7R against. Pulling
  the stop in to half would have killed about one winner in ten to buy nothing; the stops study found the same.

## 9. The four strongest slices as size rules

Rules multiply the live size (cold streak x0.25, late entry x0.5), rounded down once, never below 1 micro. All are known
at entry. Baseline: 2026 +$20,487 PF 3.94 DD -$2,249, 1-month eval 34.0% pass / 0.0% fail; 2021-25 +$16,379 PF 1.27 DD
-$9,265, 8.8% / 5.2%.

| run | rule | 2026 net ($/mo) | PF | DD | 1-mo eval | 2021-25 net ($/mo) | PF | DD | 1-mo eval | years better | status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| intra_cisd_125 | CISD x1.25 | +$23,469 ($2,392) | 4.18 | -$2,516 | 35.9 / 0.0 | +$17,710 ($347) | 1.27 | -$9,766 | 10.6 / 7.4 | 5 of 6 | promising |
| intra_ifvg_half | IFVG x0.5 | +$17,174 ($1,751) | 4.12 | -$1,826 | 29.6 / 0.0 | +$13,162 ($258) | 1.29 | -$6,675 | 7.4 / 1.5 | - | rejected |
| intra_stop3040_half | 30-40 pt stop x0.5 | +$20,900 ($2,131) | 4.44 | -$2,106 | 34.0 / 0.0 | +$16,494 ($323) | 1.30 | -$8,105 | 8.4 / 4.0 | 4 of 6 | **adopt-candidate** |
| intra_tgt_eq_half | equal-H/L target x0.5 | +$20,879 ($2,128) | 4.36 | -$1,914 | 34.0 / 0.0 | +$16,288 ($319) | 1.29 | -$7,446 | 8.5 / 3.3 | 3 of 6 | promising |
| intra_open_125 | 09:30 entries x1.25 | +$21,028 ($2,144) | 3.96 | -$2,328 | 38.3 / 0.0 | +$18,348 ($359) | 1.29 | -$9,972 | 9.3 / 7.4 | 4 of 6 | promising |
| intra_h10_half | 10:00 hour x0.5 | +$21,565 ($2,198) | 4.66 | -$1,972 | 34.0 / 0.0 | +$14,883 ($292) | 1.28 | -$7,643 | 8.9 / 2.6 | 3 of 6 | rejected |
| intra_rr2_half | target under 2R x0.5 | +$20,487 ($2,088) | 4.03 | -$2,249 | 34.0 / 0.0 | +$15,525 ($304) | 1.27 | -$7,886 | 7.9 / 3.6 | - | rejected |
| intra_combo_defensive | stop 30-40 x0.5 + equal-H/L x0.5 | +$21,251 ($2,166) | 4.79 | -$1,908 | 34.0 / 0.0 | +$16,465 ($323) | 1.33 | -$6,676 | 8.4 / 1.3 | 4 of 6 | promising |
| intra_combo_all | the two halves + CISD x1.25 | +$24,234 ($2,470) | 5.02 | -$2,088 | 35.9 / 0.0 | +$17,787 ($348) | 1.34 | -$7,187 | 9.6 / 2.1 | 4 of 6 | **adopt-candidate** |

Reading the table:

- **More size on CISD (or on the open) makes more money in both periods, but it is leverage, not an edge:** drawdown grows in
  both periods and 1-month eval fails in 2021-25 go from 5.2% to 7.4%. The risk study rejected exactly this pattern, so on
  its own it is "promising", not adopt. Halving IFVG instead costs $3k-$3.3k in each period: the weaker trigger still pays.
- **Half size on 30-40 pt stops** is the only single rule that is better on net and PF, has a smaller drawdown and fewer
  eval fails in both periods. The money is small (+$413 in 2026, +$115 over five years), the real gain is the drawdown
  (-$9.3k to -$8.1k) and the 1-month fail rate (5.2% to 4.0%). It helped in 2023-2026 and cost $590 and $192 in 2021-22.
- **Half size on equal-highs/lows targets** is flat on money (-$91 in 2021-25) and good on drawdown (-$7.4k) and fails (3.3%).
  Year by year it is a coin flip (3 of 6). Not on its own.
- **The package** (both halves + CISD x1.25) is the best line in the table: 2026 +$3,747 and PF 5.02 with a smaller drawdown,
  2021-25 +$1,408 and PF 1.34 with the drawdown cut from -$9.3k to -$7.2k and 1-month fails from 5.2% to 2.1%; evals passed
  within 2 weeks 20.4% → 22.3% (2026) and 4.1% → 4.7% (2021-25). Trades a week are unchanged (2.16 / 3.17) because only the
  size moves. It helped in 2022, 2023, 2024 and 2026 and cost $714 in 2021 and $314 in 2025.

## Verdict

Adopt-candidates: `intra_stop3040_half` (small, clean, defensive) and `intra_combo_all` (the package). Both pass the
owner's rule (better net and PF in 2026 and 2021-25, 2-4 trades a week kept, no more eval fails). But be honest about
what they are: three slices picked from this same data because they looked good in it, then stacked. The CISD edge is
the most believable (5 of 6 years, random groups rarely match it), the 30-40 pt stop next (4 of 6 years), the equal-highs
target the weakest (3 of 6). The 2021-25 money gain of the package is $1.4k over five years, about $23 a month; the
drawdown and eval-fail improvements are the real argument. If only one is taken, take the stop rule; if the critic agrees,
the package. Neither changes a single entry or exit, so Pine and the engine need only a size multiplier.

What failed: every timing rule (the only two that looked good in both periods, 09:30 x1.25 and 10:00 x0.5, are leverage or
flip in 2021-25), halving the under-2R targets, halving IFVG triggers, and every weekday/hour cell.

## Caveats

- In-sample slicing: the slices were chosen on the same trades they were scored on. The random-group checks (how often a
  random group of the same size does as well) are 1.6-7% for CISD, 7-17% for the 30-40 pt stop and 7-21% for the equal-highs
  target; the last two are "moderate", not proof.
- 2026 cells are small (5-30 trades); the hour and weekday tables in 2026 are dominated by a handful of 4-5R winners.
- 1-micro trades (cold streak, wide stops) cannot be halved, so half-size rules bite only on full-size trades; that is why
  `intra_rr2_half` lost money in 2021-25 although its slice was flat.
- `trigger_tf` is `5m` for every trade, so the "by trigger timeframe" question has no data in this strategy.
- Time in trade and MFE/MAE are known only after the fact and were used only to judge the management rules, never in a
  size rule.

## Data for the dashboard

`research/lab/intraday_heat.json`: 35 weekday x hour cells (n, avg R, net $, win %) for all years, 2026 and 2021-25,
built from the same sized trades, for a 3D heat view. Helper: `tools/research_intra.py`.

## Next ideas

1. Press on CISD only: the fast-eval press (`sizing.press`) sizes every trade as if the wide-stop reference were 60 pts
   while the eval is above -$1,000. Pressing only CISD triggers (and never 30-40 pt stops) could buy the eval speed with less
   of the fail rate the plain press showed.
2. Out-of-sample check of the package on 2026 only after fitting on 2021-25 (and the reverse) with a critic, plus a
   bootstrap of the year-by-year gains; if the 2026 gain survives a 2021-25-only fit, lock it.
3. Why do equal-highs targets miss? Measure how far short of the pool price turns (in ticks) for the misses; if it is a
   consistent few points, an "exit 4-8 ticks in front of equal highs/lows only" target variant is a two-line engine option
   (the general front-exit was neutral, but it was tested on all pool types at once).
