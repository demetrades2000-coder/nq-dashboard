## How to read the tables

- **Data and costs:** every row is the same 768 live-strategy trades (exact live-loop replay, commissions and slippage included).
- **What changes:** only how many micros each trade gets.
- **Columns:**
  - "2w" and "1m" are MFFU Builder 50K evals started on every trading day, passed / failed within 2 weeks and 1 month
  - "3m" is the same within 3 months
  - "b2b" is back-to-back evals passed / failed
- **How sizing was redone:** from the engine's own rule, with exact micros, and checked against the engine itself.
  - **Risk-level and wide-stop rows:** engine replays where marked.
  - **Everything else:** post-hoc sizing of the baseline trades.

**Status rule:**
- **adopt-candidate:** better than the live sizing in both 2026 and 2021-25 (net and PF, or clearly better evals with equal or better net), with 2+ setups a week.
- **promising:** helps one period clearly and does not hurt the other.
- **rejected:** anything else.

## 1. How much to risk per trade

| run | rule | 2026 setups/wk | PF | net | max DD | 2w pass/fail | 1m pass/fail | 2021-25 PF | net | max DD | 1m pass/fail | 3m pass/fail | evals per pass | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| risk_usd400 | $400 (engine) | 1.99 | 3.3 | +$9,168 | -$1,514 | 2/0 | 11/0 | 1.03 | +$1,270 | -$5,709 | 2/0 | 8/9 | 3.95 | rejected |
| risk_usd600 | $600 (engine) | 2.09 | 3.51 | +$15,040 | -$1,924 | 9/0 | 25/0 | 1.03 | +$1,516 | -$9,366 | 4/2 | 17/33 | 4.07 | rejected |
| risk_usd700 | $700 | 2.16 | 3.28 | +$16,529 | -$2,462 | 12/0 | 25/0 | 1.08 | +$4,994 | -$10,387 | 7/4 | 26/41 | 3.31 | rejected |
| baseline | **$800 (live)** | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.09 | +$6,491 | -$11,401 | 9/9 | 20/56 | 3.89 |  |
| risk_usd900 | $900 | 2.16 | 3.45 | +$22,617 | -$3,063 | 20/0 | 34/0 | 1.08 | +$6,573 | -$12,828 | 8/14 | 16/62 | 3.87 | rejected |
| risk_usd1000 | $1,000 (engine) | 2.16 | 3.47 | +$25,229 | -$3,322 | 23/0 | 38/0 | 1.07 | +$6,880 | -$14,497 | 8/20 | 17/70 | 3.92 | rejected |
| risk_usd1200 | $1,200 (engine) | 2.16 | 3.42 | +$29,742 | -$3,947 | 27/0 | 45/2 | 1.05 | +$5,670 | -$16,285 | 11/31 | 19/72 | 3.34 | rejected |

**The risk level does not fix 2021-25.**
- Net there stays between +$1.3k and +$6.9k at every level.
- The drawdown grows in step with the risk.

**The eval trade-off:**
- More risk passes 2026 evals faster: 45% within a month at $1,200, against 33% today.
- It fails 2021-25 evals much more often: 31% within a month, against 9%.
- Evals bought per pass stay in the same range at every level: 3.3-4.1 (eval-sizing.md).

**Less risk** loses setups: the engine skips a setup that would get less than 1 micro, so 2026 has 2.09 setups a week at $600 and 1.99 at $400.

**Verdict:** $800 is a sensible middle. There is no eval sweet spot that is better in both periods.

## 2. How much less a wide stop should risk

Today: full $800 up to a 20-pt stop, then $800 × 20 / stop (a 40-pt stop risks $400).

| run | rule | 2026 setups/wk | PF | net | max DD | 2w pass/fail | 1m pass/fail | 2021-25 PF | net | max DD | 1m pass/fail | 3m pass/fail | evals per pass | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| risk_ref15 | full risk up to 15 pts (engine) | 2.09 | 3.89 | +$17,418 | -$1,949 | 12/0 | 25/0 | 1.04 | +$2,346 | -$10,346 | 6/4 | 19/39 | 3.64 | rejected |
| baseline | **20 pts (live)** | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.09 | +$6,491 | -$11,401 | 9/9 | 20/56 | 3.89 |  |
| risk_ref25 | 25 pts (engine) | 2.16 | 3.23 | +$22,312 | -$3,232 | 22/0 | 38/0 | 1.08 | +$7,531 | -$13,485 | 9/17 | 18/65 | 3.86 | rejected |
| risk_ref30 | 30 pts (engine) | 2.16 | 3.01 | +$23,492 | -$3,625 | 26/0 | 41/0 | 1.09 | +$8,695 | -$14,861 | 11/20 | 19/70 | 3.59 | rejected |
| risk_ref40 | 40 pts (engine) | 2.16 | 2.69 | +$24,641 | -$4,336 | 31/0 | 41/6 | 1.11 | +$13,150 | -$16,900 | 14/32 | 21/71 | 3.46 | rejected |
| risk_refoff | $800 on every stop (engine) | 2.16 | 2.62 | +$26,522 | -$4,857 | 31/1 | 40/6 | 1.13 | +$16,636 | -$16,770 | 16/37 | 23/70 | 3.27 | rejected |
| risk_shape05 | gentler: $800 x square root of (20/stop) | 2.16 | 2.94 | +$22,134 | -$3,524 | 21/0 | 31/0 | 1.1 | +$9,959 | -$13,515 | 10/19 | 20/65 | 3.83 | rejected |
| risk_shape15 | steeper: $800 x (20/stop)^1.5 | 2.06 | 4.02 | +$18,002 | -$2,128 | 16/0 | 30/0 | 1.02 | +$1,018 | -$11,444 | 8/6 | 22/46 | 3.43 | rejected |
| risk_floor400 | never under $400 on a wide stop | 2.16 | 3.42 | +$21,168 | -$2,628 | 20/0 | 33/0 | 1.09 | +$7,609 | -$11,876 | 8/12 | 16/61 | 4.14 | rejected |

- **In 2021-25 a wide stop is not a worse trade.** Average R is about 0 for every stop size, so more dollars on wide stops is more profit and proportionally more drawdown.
- **In 2026 wide stops were the weaker trades:**
  - 20-30 pts: +1.11R
  - 30-45 pts: -0.15R
  - So less scaling lowers the 2026 PF.
- **No version is better in both periods.**
  - $800 on every stop has the most money, but 37% of 1-month evals fail in 2021-25, against 9%.
  - The steeper version skips setups (2.06 a week in 2026) and makes almost nothing over 2021-25.
- **Verdict:** keep the 20-pt reference.

## 3. Cold-streak filter: lookback, threshold, size, and a hot-streak boost

Today: if the last 15 finished signals add up to 0R or less, trade half size.

| run | rule | 2026 setups/wk | PF | net | max DD | 2w pass/fail | 1m pass/fail | 2021-25 PF | net | max DD | 1m pass/fail | 3m pass/fail | evals per pass | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | live: 15 signals, 0R, half | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.09 | +$6,491 | -$11,401 | 9/9 | 20/56 | 3.89 |  |
| risk_cold_lb10 | last 10 signals | 2.16 | 3.46 | +$19,959 | -$2,660 | 19/0 | 30/0 | 0.99 | -$474 | -$13,890 | 5/9 | 14/57 | 3.77 | rejected |
| risk_cold_lb12 | last 12 signals | 2.16 | 3.77 | +$22,015 | -$2,485 | 24/0 | 40/0 | 1.0 | +$239 | -$14,077 | 6/7 | 15/56 | 4.26 | rejected |
| risk_cold_lb20 | last 20 signals | 2.16 | 3.36 | +$19,829 | -$2,944 | 19/0 | 33/0 | 1.06 | +$4,857 | -$11,677 | 9/7 | 24/55 | 3.83 | rejected |
| risk_cold_lb25 | last 25 signals | 2.16 | 3.09 | +$18,934 | -$3,610 | 19/0 | 33/4 | 1.07 | +$5,715 | -$9,825 | 9/10 | 24/52 | 3.66 | rejected |
| risk_cold_thrm2 | cold only below -2R | 2.16 | 3.57 | +$21,556 | -$2,944 | 24/0 | 40/0 | 1.02 | +$1,662 | -$14,114 | 8/14 | 18/62 | 4.84 | rejected |
| risk_cold_thrp2 | cold unless above +2R | 2.16 | 3.22 | +$18,026 | -$2,661 | 15/0 | 23/0 | 0.98 | -$1,452 | -$11,568 | 5/4 | 18/44 | 3.72 | rejected |
| risk_cold_q25 | **quarter size** | 2.16 | 3.55 | +$19,543 | -$2,333 | 19/0 | 33/0 | 1.16 | +$10,230 | -$9,158 | 8/7 | 26/34 | 2.91 | promising |
| risk_cold_q75 | three-quarter size | 2.16 | 3.36 | +$20,542 | -$3,264 | 24/0 | 36/0 | 1.03 | +$2,687 | -$13,723 | 9/18 | 20/60 | 4.54 | rejected |
| risk_cold_skip | skip (reference, rejected by you) | 1.48 | 4.08 | +$19,646 | -$2,230 | 19/0 | 33/0 | 1.32 | +$14,994 | -$7,551 | 8/7 | 23/27 | 2.66 | rejected |
| risk_hot5_125 | x1.25 when last 15 >= +5R | 2.16 | 3.55 | +$22,470 | -$2,814 | 20/0 | 33/0 | 1.09 | +$6,844 | -$11,664 | 9/11 | 20/56 | 3.43 | rejected |
| risk_hot5_150 | x1.5 when last 15 >= +5R | 2.16 | 3.54 | +$25,506 | -$3,073 | 20/0 | 33/0 | 1.07 | +$5,510 | -$12,318 | 9/14 | 20/60 | 3.67 | rejected |
| risk_hot8_150 | x1.5 when last 15 >= +8R | 2.16 | 3.58 | +$24,301 | -$3,069 | 20/0 | 33/0 | 1.12 | +$9,006 | -$11,401 | 9/9 | 21/56 | 3.35 | adopt-candidate |

**Lookback and threshold:** today's 15 signals and 0R are the best of the grid in 2021-25. 15 signals was originally picked on 2021-24 data, so this is no surprise.
- Every other lookback or threshold makes 2021-25 worse.
- 2026 moves by less than $2k either way.

**Cold size is the robust finding.** In the full 45-point grid (5 lookbacks × 3 thresholds × 3 sizes, printed by `python tools/research_risk.py cold`), a quarter beats a half in 2021-25 at every lookback and threshold.
- Gain: +$0.7k to +$3.7k.
- 2026 net moves by -$1.6k to +$0.4k.
- The trades in a cold streak lose money in both periods (-0.11R and -0.10R a trade), so the smaller their size the better.
- Sitting out entirely (skip mode, run `risk_cold_skip`: 2021-25 +$15.0k, PF 1.32) is best of all, but it drops to 1.5 setups a week and pauses trading for months, which you rejected.

**Hot-streak boost (x1.5 when the last 15 signals add up to +8R or more):**
- It beats the live sizing in both periods, and the gain holds for thresholds +6R to +10R.
- It is not recommended now:
  - the gain comes from simply risking 1.5x on a fifth of the trades
  - 2026 max DD gets worse (-$3.1k)
  - 3-month eval fails rise in 2026 (21% vs 14%)
  - at +5R it no longer helps 2021-25
- Combined with the quarter cold size (run `risk_pkg_q25_hot8`): 2026 +$23.7k, 2021-25 +$12.7k. A candidate for later, with more live data.

## 4. Drawdown-aware sizing (smaller below the equity high, full at a new high)

| run | rule | 2026 setups/wk | PF | net | max DD | 2w pass/fail | 1m pass/fail | 2021-25 PF | net | max DD | 1m pass/fail | 3m pass/fail | evals per pass | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | live | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.09 | +$6,491 | -$11,401 | 9/9 | 20/56 | 3.89 |  |
| risk_dd_half1500 | half size while $1,500+ below the high | 2.16 | 3.53 | +$14,352 | -$1,875 | 13/0 | 20/0 | 0.99 | -$375 | -$6,649 | 2/3 | 11/18 | 3.72 | rejected |
| risk_dd_half3000 | half size while $3,000+ below the high | 2.16 | 3.12 | +$14,300 | -$2,502 | 13/0 | 19/0 | 1.0 | -$171 | -$7,006 | 3/5 | 12/31 | 4.37 | rejected |
| risk_dd_linear | x0.75 at -$1k, x0.5 at -$2k, floor x0.25 | 2.16 | 3.31 | +$9,393 | -$1,412 | 4/0 | 13/0 | 0.98 | -$664 | -$5,120 | 0/0 | 0/4 | 5.48 | rejected |

- All three are rejected.
- The account's own drawdown is a late signal: it cuts size at the bottom and misses the winners that recover it.
- The shadow-record cold-streak filter does the same job better, because it reacts to the signals, not to the $ curve.

## 5. Weekly loss brake and loss-streak cuts (never skipping a setup)

| run | rule | 2026 setups/wk | PF | net | max DD | 2w pass/fail | 1m pass/fail | 2021-25 PF | net | max DD | 1m pass/fail | 3m pass/fail | evals per pass | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | live | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.09 | +$6,491 | -$11,401 | 9/9 | 20/56 | 3.89 |  |
| risk_week_brake2r | half size after -2R in the week | 2.16 | 3.48 | +$20,111 | -$2,661 | 19/0 | 33/0 | 1.11 | +$7,893 | -$10,902 | 9/8 | 24/48 | 3.14 | promising |
| risk_week_brake1r | half size after -1R in the week | 2.16 | 3.47 | +$18,800 | -$2,358 | 19/0 | 33/0 | 1.11 | +$7,124 | -$11,249 | 9/4 | 26/42 | 3.22 | rejected |
| risk_streak3_half | half size after 3 losers in a row | 2.16 | 3.63 | +$18,124 | -$1,882 | 15/0 | 23/0 | 1.05 | +$2,982 | -$11,590 | 7/4 | 22/33 | 3.04 | rejected |
| risk_streak5_half | half size after 5 losers in a row | 2.16 | 3.67 | +$18,951 | -$1,887 | 15/0 | 23/0 | 1.07 | +$4,362 | -$10,321 | 8/6 | 20/40 | 3.53 | rejected |
| risk_win_x15 | 1.5x right after a winner | 2.16 | 3.05 | +$20,805 | -$2,932 | 19/0 | 32/0 | 1.05 | +$4,001 | -$13,507 | 9/15 | 21/59 | 3.77 | rejected |

- **The -2R weekly brake helps 2021-25** (+$1.4k, fewer eval fails), but it never triggered in 2026, so there is no out-of-sample evidence. Promising, not adopted.
- **Cutting after a run of losers** cuts size just before the rare big winner.
- **Pressing after a winner** adds risk at random.

## 6. Setup-context sizing (lean in or size down on one condition)

These were picked on 2021-25 only, then checked on 2026 untouched. Each rule is one factor with a stated market reason. 15 rules were tried, including one control rule with no reason at all (Thursdays). The table and the noise check are printed by `python tools/research_risk.py situational`.

| run | rule (reason) | picked on 2021-25? | 2021-25 net / PF | 2026 net / PF | random rules that beat it (2021-25 / 2026) | status |
|---|---|---|---:|---:|---:|---|
| baseline | live sizing | | +$6,491 / 1.09 | +$20,111 / 3.48 | | |
| risk_sit_late_half | half size on late entries (part of the move is gone) | yes | +$8,583 / 1.12 | +$21,198 / 4.02 | 17% / 0% | **adopt-candidate** |
| risk_sit_vix20_half | half size when VIX closed at 20+ (sweeps run further) | yes | +$9,152 / 1.14 | +$19,574 / 3.57 | 7% / 6% | promising |
| risk_sit_news_x15 | 1.5x on high-impact news days (bigger moves) | yes | +$7,893 / 1.10 | +$20,760 / 3.45 | 5% / 45% | promising (2026 gain is noise-sized) |
| risk_sit_pm_x15 | 1.5x in the afternoon killzone (calmer) | yes | +$9,628 / 1.12 | +$23,107 / 3.41 | 14% / 28% | rejected (2026 PF and evals worse) |
| risk_sit_induce_half | half size when inducement was taken first | yes | +$7,038 / 1.16 | +$12,624 / 3.67 | 1% / 11% | rejected (2026 -$7.5k) |
| risk_sit_thu_half | half size on Thursdays (control, no reason) | yes | +$7,157 / 1.10 | +$16,511 / 3.23 | 16% / 81% | rejected |
| risk_sit_with1h_x15 | 1.5x with the 1H trend | no | +$8,497 / 1.09 | +$23,491 / 3.22 | | rejected (2021-25 evals fail twice as often) |
| risk_sit_against1h_half | half size against the 1H trend | no | +$5,892 / 1.10 | +$12,958 / 2.98 | | rejected |
| risk_sit_am_half | half size in the morning killzone | no | +$3,438 / 1.07 | +$12,620 / 3.21 | | rejected |
| risk_sit_cisd_half | half size on CISD triggers | no | +$3,896 / 1.07 | +$12,248 / 2.98 | | rejected |
| risk_sit_minor_half | half size when only a 15m swing was swept | no | +$2,541 / 1.04 | +$16,304 / 3.77 | | rejected |
| risk_sit_poorloc_half | half size on poor location | no | +$3,503 / 1.05 | +$18,072 / 3.48 | | rejected |
| risk_sit_firsthour_half | half size in the first hour | no | +$4,732 / 1.09 | +$18,221 / 4.13 | | rejected |
| risk_sit_near_half | half size when the draw is under 2R | no | +$5,667 / 1.08 | +$20,113 / 3.54 | | rejected |
| risk_sit_trend_quarter | quarter size in a trending regime (live: half) | no | +$3,387 / 1.05 | +$19,314 / 3.52 | | rejected |

"Picked" means 2021-25 net and PF went up, without worse 1-month evals.

"Random rules that beat it": the same share of setups was flagged at random 200 times and sized the same way. The column shows how often that beat the rule's gain in each period. The lower it is, the less likely the gain is luck.

**Late entries:** random flags never beat it in both periods. Even the control rule (Thursdays) gets picked on 2021-25, which shows how easily noise passes a one-period test.

**Only one rule passes the strict test cleanly: half size on late entries** (the 15-minute trend already points the trade's way).
- 2026: +$21.2k, PF 4.02
- 2021-25: +$8.6k, PF 1.12
- 1-month eval fails: 6.3% vs 9.4%

**Some rules look good but are not trusted:**
- Thursday half size, which has no reason at all, also improves 2021-25. Noise can do that.
- VIX 20+ half size held up as well as late entries in the noise check, but 2026 had only 12 such trades and lost $537 with it. Promising, worth a second look later.
- Grade/confidence sizing was rejected before and was not retried.
- "Half size when inducement was taken first" improves 2021-25 (PF 1.16) but cuts 2026 profit by a third, because 76 of 89 trades in 2026 had it.

## The bottom line

- **Changing the overall risk** (a different $ amount, or different wide-stop scaling) only trades money for drawdown and eval fails.
- **The improvements that hold in both periods size down specific trades that lose in both:**
  - quarter size in cold streaks
  - half size on late entries
- They are combined in the recommendation (risk-summary.md, run `risk_pkg_q25_late_live`):
  - 2026: +$20.6k, PF 4.12, max DD -$2.2k
  - 2021-25: +$11.5k, PF 1.19, max DD -$9.2k
  - 1-month eval fails in 2021-25: 5.1%, against 9.4%
  - every setup is still traded
