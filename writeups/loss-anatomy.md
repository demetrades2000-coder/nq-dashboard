## The short version

- **In 2021-25 the strategy has no edge in R.** It won 285R and lost 287R. In 2026 it won 65R and lost 32R.
- **The money is made by a few big winners.** 3-5R wins are 5-9% of trades but make most of the profit.
- **The money is lost in long grinds, not single blows:**
  - the worst day in five years is -$875
  - no single trade lost much more than $1,000
  - the worst drawdown, -$11,401, took 17 months and 227 trades, of which only 36 won
- **Most losses never worked:** 58% of the dollars lost came from trades that never got to +0.3R. 80% came from full stop-outs.
- **Trades taken during a cold streak lost in both periods.** The cold streak is when the last 15 finished signals add up to 0R or less.
  - 2021-25: -0.11R a trade
  - 2026: -0.10R a trade
  - The live half-size rule is what keeps 2021-25 positive. Without it, 2021-25 is -$2,542.

So the answer to "risking too much?" is: not per trade, but **it keeps risking in the stretches where the strategy is out of step with the market**.

## Where the money goes

| period | trades | wins | scratches (about 0R) | losses | gross profit | gross loss | loss / profit | net | R won / R lost | avg R a trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2021-25 | 679 | 136 | 134 | 409 | $82,040 | $75,549 | 92% | +$6,491 | 285R / 287R | -0.003R |
| 2026 | 89 | 21 | 19 | 49 | $28,231 | $8,120 | 29% | +$20,111 | 65R / 32R | +0.376R |

**Each trade's result in R:**

| result | 2021-25 trades | 2021-25 $ | 2026 trades | 2026 $ |
|---|---:|---:|---:|---:|
| full loss (-1R) | 213 (31%) | -$59,943 | 25 (28%) | -$6,776 |
| -0.95 to -0.5R | 47 (7%) | -$6,728 | 2 (2%) | -$419 |
| small loss (-0.5 to 0R) | 150 (22%) | -$8,192 | 22 (25%) | -$844 |
| scratch (break-even) | 133 (20%) | -$650 | 19 (21%) | -$75 |
| small win (under 1R) | 32 (5%) | +$2,106 | 2 (2%) | +$202 |
| 1-2R | 40 (6%) | +$17,267 | 6 (7%) | +$2,620 |
| 2-3R | 31 (5%) | +$18,755 | 2 (2%) | +$1,886 |
| 3-5R | 32 (5%) | +$43,413 | 8 (9%) | +$14,131 |
| 5R and more | 1 (0%) | +$462 | 3 (3%) | +$9,386 |

The difference between the two periods is in the right tail.
- **3R+ wins:** 2026 has 12% of trades (11 of 89), 2021-25 has 5% (33 of 679).
- **Full losses:** about the same rate in both periods.

## What kind of losses (a trade can be in several rows)

| loss type | 2021-25 losses | $ lost (share) | avg loss | 2026 losses | $ lost (share) | avg loss |
|---|---:|---:|---:|---:|---:|---:|
| Full stop-out | 213 (52%) | $59,943 (80%) | $281 | 25 (51%) | $6,776 (84%) | $271 |
| stopped within 10 minutes | 122 (30%) | $38,840 (52%) | $318 | 17 (35%) | $4,384 (55%) | $258 |
| Never worked (best point under +0.3R) | 197 (48%) | $43,662 (58%) | $222 | 19 (39%) | $4,413 (55%) | $232 |
| Was +0.5R or better, then lost | 142 (35%) | $16,600 (22%) | $117 | 20 (41%) | $1,222 (15%) | $61 |
| Was +1R or better, then lost | 8 (2%) | $1,568 (2%) | $196 | 1 (2%) | $46 (1%) | $46 |
| Time stop (30 min without +0.5R) | 74 (18%) | $6,042 (8%) | $82 | 6 (12%) | $492 (6%) | $82 |
| Giveback exit | 121 (30%) | $8,783 (12%) | $73 | 18 (37%) | $771 (10%) | $43 |
| Wide stop (45 pts or more) | 168 (41%) | $16,490 (22%) | $98 | 24 (49%) | $2,248 (28%) | $94 |
| Tight stop (20 pts or less, full $800) | 41 (10%) | $17,554 (23%) | $428 | 2 (4%) | $280 (3%) | $140 |
| Against the 1H trend | 226 (55%) | $41,335 (55%) | $183 | 24 (49%) | $3,763 (47%) | $157 |
| Late entry (15m already turned) | 53 (13%) | $9,445 (13%) | $178 | 8 (16%) | $2,330 (29%) | $291 |
| Trending regime (already half size) | 113 (28%) | $12,143 (16%) | $107 | 11 (22%) | $1,300 (16%) | $118 |
| Cold streak (half size) | 217 (53%) | $27,803 (37%) | $128 | 21 (43%) | $1,739 (22%) | $83 |

What stands out:
- **The stop is hit fast.** Half of the money lost is on trades stopped within 10 minutes of entry. The sweep extreme did not hold.
- **Wide-stop losses are cheap**, $94-98 on average, because size follows the stop. **Tight-stop losses are the expensive ones**, $428 on average in 2021-25. But tight-stop trades are also the best trades (see "Risk vs outcome" below).
- **Profit given back is mostly a scratch, not a loss.** The breakeven move at +1R turns them into about 0R.
  - 121 trades in 2021-25 (18% of all) were +1R or better at some point and ended at about 0R. Together they had 208R of open profit and ended at -7.6R.
  - In 2026: 18 trades, 32R open, ended at -0.3R.
  - That is trade management, covered in the management write-up, not sizing.

## Streaks and drawdowns

**Costliest runs without a win:**

| period | dates | trades | R | $ | at half size |
|---|---|---:|---:|---:|---:|
| 2021-25 | 2025-09-01 to 2025-11-17 | 33 | -18.7R | -$4,413 | 26 of 33 |
| 2021-25 | 2024-01-03 to 2024-02-05 | 17 | -11.0R | -$2,362 | 17 of 17 |
| 2021-25 | 2022-07-22 to 2022-08-12 | 8 | -6.0R | -$2,234 | 5 of 8 |
| 2021-25 | 2024-11-15 to 2024-11-25 | 7 | -5.2R | -$2,188 | 0 of 7 |
| 2026 | 2026-04-02 to 2026-05-29 | 20 | -10.8R | -$1,850 | 10 of 20 |
| 2026 | 2026-08-10 to 2026-08-19 | 4 | -3.6R | -$1,170 | 0 of 4 |

The average run without a win is 4-5 trades. 2021-25 had 12 runs of 10 or more, and the longest was 33.

**Worst drawdowns and what caused them:**

| period | depth | peak to trough | recovered | trades | wins | R | full stop-outs ($) | half-size trades | median stop |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| 2021-25 | -$11,401 | 2021-12-15 to 2023-05-02 | 2023-07-31 | 227 | 36 | -26.2R | 82 (-$22,450) | 148 | 42 pts |
| 2021-25 | -$6,286 | 2023-09-12 to 2024-02-15 | 2024-04-22 | 81 | 12 | -24.6R | 31 (-$7,655) | 65 | 42 pts |
| 2021-25 | -$5,124 | 2024-04-29 to 2024-07-15 | 2024-10-29 | 37 | 4 | -16.4R | 15 (-$4,710) | 26 | 38 pts |
| 2021-25 | -$5,078 | 2025-08-22 to 2025-12-22 | not yet | 51 | 3 | -20.8R | 16 (-$4,094) | 39 | 44 pts |
| 2026 | -$2,661 | 2026-03-13 to 2026-08-04 | 2026-08-27 | 41 | 2 | -13.2R | 13 (-$2,334) | 26 | 47 pts |

Every big drawdown is a long stretch with very few wins, mostly traded at half size, with ordinary 40-pt stops. None of them comes from a few oversized losses.

**Losing months and quarters:**
- **2021-25:** 30 of 50 months lost. The worst were 2024-11 (-$2,949), 2025-09 (-$2,885) and 2024-05 (-$2,832). 8 of 17 quarters lost; the worst was 2022 Q3 (-$3,805).
- **2026:** 5 of 10 months lost. The worst was 2026-05 (-$1,155). Only Q2 lost (-$2,064).

## Risk vs outcome: "risked too much" or "didn't risk enough"?

| $ at risk | 2021-25 trades | win % | avg win | avg loss | avg R | net | 2026 trades | win % | avg win | avg loss | avg R | net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| $600+ (tight stop, full size) | 43 | 26% | $2,110 | -$413 | +0.31R | +$9,994 | 5 | 80% | $3,088 | -$46 | +3.31R | +$12,307 |
| $300-600 | 164 | 20% | $850 | -$235 | -0.01R | -$2,804 | 31 | 23% | $1,415 | -$219 | +0.28R | +$4,644 |
| $150-300 | 246 | 21% | $430 | -$110 | -0.01R | +$452 | 27 | 33% | $628 | -$89 | +0.58R | +$4,041 |
| under $150 | 226 | 19% | $202 | -$55 | -0.06R | -$1,150 | 26 | 8% | $162 | -$50 | -0.29R | -$881 |

- **The full-size trades are the best trades in both periods.** These are the $600+ trades, with a tight stop and not in a cold streak.
- **The smallest trades are the worst in both.** These are the under-$150 trades, usually with a wide stop and in a cold streak or a trending regime.
- So the de-risking rules point at the right trades. They are not "risking too little" on good trades.

**What each de-risking rule did** (the same trades without that rule; post-hoc):

| rule | 2021-25: cost on winners | saved on losers | net effect | 2026: cost on winners | saved on losers | net effect |
|---|---:|---:|---:|---:|---:|---:|
| Cold-streak half size | -$20,968 | +$30,001 | **+$9,033** | -$2,753 | +$1,958 | -$794 |
| Trending-regime half size | -$13,312 | +$12,011 | -$1,301 | -$2,472 | +$1,228 | -$1,244 |
| Less risk on stops wider than 20 pts | -$66,358 | +$56,857 | -$9,500 | -$14,662 | +$8,250 | -$6,412 |
| All three (vs $800 on every trade) | -$136,708 | +$142,558 | +$5,849 | -$21,825 | +$15,549 | -$6,275 |

**Did it risk too little on wide stops?** In dollars, yes: $800 on every stop would have made more in both periods (engine replay, run `risk_refoff`).
- 2026: +$26.5k
- 2021-25: +$16.6k

But the cost is large:
- the 5-year max drawdown grows from -$11.4k to -$16.8k
- the 2026 PF drops from 3.48 to 2.62
- 1-month eval fails in 2021-25 go from 9.4% to 37%

The R edge per trade in 2021-25 is about the same for every stop size:
- under 20 pts: -0.04R
- 20-30 pts: -0.03R
- 30-45 pts: -0.04R
- 45-60 pts: +0.04R

So more dollars on wide stops is just more risk, not more edge. That is a choice of aggression, not a fix.

**Biggest winners that were sized small** (the price of de-risking):

| day | R | stop | risked | made | at $800 | why small |
|---|---:|---:|---:|---:|---:|---|
| 2024-09-11 | +5.0R | 46 pts | $92 | +$462 | +$3,696 | cold half, wide stop |
| 2022-01-21 | +5.0R | 54 pts | $108 | +$538 | +$3,770 | trending, wide stop |
| 2024-07-22 | +5.0R | 16 pts | $198 | +$986 | +$3,945 | cold half, trending |
| 2026-08-07 | +5.0R | 25 pts | $297 | +$1,481 | +$3,946 | cold half, wide stop |
| 2026-03-13 | +5.0R | 51 pts | $308 | +$1,542 | +$3,598 | wide stop |

**Counterfactual runs** (no de-risking at all):

| run | 2026 | 2021-25 |
|---|---|---|
| `loss_all_full`: $800 on every trade | +$26.4k, PF 2.11 | +$0.6k, PF 1.00; max DD -$26.6k; 68% of 1-month evals fail |
| `loss_no_cold`: cold filter off | +$20.9k | -$2.5k; max DD -$17.3k |

## Which conditions lose in both periods?

Most setup conditions flip between the two periods. Two exceptions lost money in both periods and have a reason to:

| factor | 2021-25 trades | avg R | 2026 trades | avg R |
|---|---:|---:|---:|---:|
| late entry (15m trend already pointing the trade's way) | 91 | -0.06R (others +0.01R) | 11 | -0.61R (others +0.52R) |
| traded in a cold streak | 351 | -0.11R (others +0.11R) | 28 | -0.10R (others +0.59R) |

These two are the basis of the recommendation in risk-summary.md: quarter size in cold streaks, half size on late entries.

Some others flip between the periods:
- AM vs PM
- with vs against the 1H trend
- major vs minor pool
- the weekday

Others are too thin to trust:
- no inducement: 107 trades in 2021-25 and 13 in 2026, and halving the inducement trades cut 2026 profit by a third
- VIX 20+

The full factor table is printed by `python tools/research_risk.py anatomy`.
