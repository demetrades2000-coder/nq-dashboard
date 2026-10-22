## The answer to "risking too much or not enough?"

Both, in different places.

- **It risks too much on two kinds of trade that lost money in both periods:**
  - trades taken during a cold streak
  - late entries, where the 15-minute trend had already turned the trade's way
- **On every other trade the risk is about right with today's rules.**
  - More risk (a higher $ amount, or less scaling on wide stops) makes more money in 2026, but the drawdown and the eval fail rate grow faster than the profit.
  - Less risk makes less money and, at $400, drops below 2 setups a week.
  - Once the two fixes below are in, more risk on wide stops starts to pay in 2021-25 too (bigger drawdowns, more eval fails). That is the optional fast mode further down.

Over 2021-25 the strategy has no edge in R: 285R won, 287R lost. All of the 5-year profit comes from sizing, and most of it from the cold-streak filter.

- With the filter off, 2021-25 is -$2,542.
- With today's half size it is +$6,491.
- With the change below it is +$11,546.

## The recommendation (one change to sizing)

The engine still picks the micros from the stop, exactly as today. The live loop then multiplies them by one number, in the place where it applies the cold-streak half size now:

| situation at entry | multiplier | today |
|---|---:|---:|
| normal | x1 | x1 |
| cold streak (last 15 finished signals add up to 0R or less) | **x0.25** | x0.5 |
| late entry (the 15-minute trend already points the trade's way: the -1 item of the confluence score) | **x0.5** | x1 |
| both at once | **x0.125** | x0.5 |

- The result is rounded down, with a floor of 1 micro.
- Every setup is still taken and alerted, so it keeps 2+ setups a week.
- Nothing else changes: entries, stops, targets, the 1-trade-a-day limit, the $800 risk up to a 20-pt stop, and the trending-regime half size.
- **For the Pine script**, it is one line on top of the cold-streak half size that is being ported now:
  - micros = max(1, floor(micros × cold × late))
  - cold = 0.25 in a cold streak
  - late = 0.5 when the script's "15m already aligned" flag is on (`m15al`, already computed for the score)

## Full table: live vs recommended (same trades, costs included, exact live-loop replay)

| | 2026 live | 2026 recommended | 2026 cold x0.25 only | 2021-25 live | 2021-25 recommended | 2021-25 cold x0.25 only |
|---|---:|---:|---:|---:|---:|---:|
| Trades | 89 | 89 | 89 | 679 | 679 | 679 |
| Setups per week | 2.16 | 2.16 | 2.16 | 3.17 | 3.17 | 3.17 |
| Weeks with 2+ setups | 71% | 71% | 71% | 92% | 92% | 92% |
| Win rate | 24.7% | 24.7% | 24.7% | 20.5% | 20.5% | 20.5% |
| Profit factor | 3.48 | **4.12** | 3.55 | 1.09 | **1.19** | 1.16 |
| Net | +$20,111 | **+$20,583** | +$19,543 | +$6,491 | **+$11,546** | +$10,230 |
| Max drawdown | -$2,661 | **-$2,153** | -$2,333 | -$11,401 | **-$9,183** | -$9,158 |
| Worst day | -$554 | -$524 | -$554 | -$875 | -$875 | -$875 |
| Median $ at risk | $239 | $212 | $234 | $213 | $118 | $125 |
| Eval pass / fail within 2 weeks | 19.4% / 0.0% | 20.4% / 0.0% | 19.4% / 0.0% | 4.1% / 2.1% | 4.0% / 1.9% | 4.0% / 2.1% |
| Evals decided within 2 weeks | 19.4% | 20.4% | 19.4% | 6.2% | 5.9% | 6.1% |
| Eval pass / fail within 3 weeks | 28.2% / 0.0% | 29.1% / 0.0% | 28.2% / 0.0% | 6.1% / 5.7% | 6.0% / 3.4% | 6.0% / 4.5% |
| Eval pass / fail within 1 month | 33.0% / 0.0% | 34.0% / 0.0% | 33.0% / 0.0% | 8.7% / 9.4% | 8.6% / **5.1%** | 8.4% / 7.4% |
| Eval pass / fail within 3 months | 63.1% / 14.1% | 63.1% / **0.0%** | 63.1% / 0.0% | 20.5% / 55.9% | **29.3% / 26.9%** | 26.1% / 34.0% |
| Passes slower than 3 weeks | 55.4% | 53.8% | 55.4% | 70.5% | 79.6% | 77.1% |
| Median sessions to pass | 19 | 18 | 19 | 25 | 31 | 31 |
| Back-to-back evals passed / failed | 4 / 1 | 4 / 1 | 4 / 1 | 7 / 18 | **7 / 10** | 7 / 12 |
| Back-to-back from 20 start days: passes / fails per year | 5.5 / 1.4 | 5.6 / 0.9 | 5.5 / 1.3 | 1.5 / 4.3 | 1.5 / **2.5** | 1.5 / 2.9 |
| Evals bought per pass | 1.25 | 1.16 | 1.23 | 3.89 | **2.63** | 2.91 |

- **MFFU Builder 50K** rules: $3,000 target, $2,000 end-of-day trailing max loss that locks at $50,100, soft $1,000 daily limit.
- **Eval columns** are the dashboard's (`tools/runlib.py`): a fresh eval started on every trading day and followed for up to 60 sessions.
- **Back-to-back:** a new eval starts the day after each pass or fail. "20 start days" averages that chain over 20 different first days.
- **"Evals bought per pass":** (passes + fails) / passes in those chains.
- **One thing gets slower in 2021-25:** the evals that pass need a little longer (median 31 sessions instead of 25), because cold stretches now trade 1 micro. They fail far less instead. For the owner's 2-week rule, see "Faster evals" below.

**By year (net, PF):**

| year | trades | live | recommended | cold x0.25 only |
|---|---:|---:|---:|---:|
| 2021 (Nov-Dec) | 26 | +$1,718 (1.52) | +$2,140 (1.75) | +$1,718 (1.52) |
| 2022 | 153 | -$6,951 (0.60) | -$4,377 (0.68) | -$5,196 (0.64) |
| 2023 | 193 | +$8,433 (1.40) | +$7,452 (1.42) | +$8,024 (1.44) |
| 2024 | 166 | +$1,737 (1.09) | +$4,555 (1.29) | +$3,717 (1.23) |
| 2025 | 141 | +$1,554 (1.11) | +$1,776 (1.16) | +$1,967 (1.17) |
| 2026 | 89 | +$20,111 (3.48) | +$20,583 (4.12) | +$19,543 (3.55) |

The recommended sizing is better in 5 of 6 years. 2023 is the exception: -$981 net, with a slightly higher PF.

## Why it works

**Cold-streak trades lose money in both periods.** The bot already trades them at half size, so the smaller size only cuts a leak.

| period | cold-streak trades | their avg R | other trades | their avg R |
|---|---:|---:|---:|---:|
| 2021-25 | 351 | -0.11R | 328 | +0.11R |
| 2026 | 28 | -0.10R | 61 | +0.59R |

- **A quarter beats a half at every setting tested** in 2021-25: lookback 10, 12, 15, 20 and 25 signals, and thresholds -2R, 0R and +2R.
- It is not a lucky setting: the smaller the size in a cold streak, the better the 5-year result. Sitting out entirely (skip mode) is best of all, but you rejected it because it paused trading for 14 weeks.

**Late entries lose too.** The engine already scores them -1, but it still takes them when the other items make up for it.

| period | late entries | avg R | other entries | avg R |
|---|---:|---:|---:|---:|
| 2021-25 | 91 | -0.06R | 588 | +0.01R |
| 2026 | 11 | -0.61R | 78 | +0.52R |

**How strong the late-entry evidence is:**
- **2021-25:** the difference is small and on its own would not prove anything.
- **2026:** it is clear, but it rests on 11 trades.
- **Noise check:** halving a random 13% of trades instead (same count, 400 tries) beats the late rule's gain about 1 time in 7 in 2021-25 and 1 time in 200 in 2026. It never beat it in both.
- **The mechanism makes sense.** When the 15m structure has already turned, part of the move is gone and the draw is closer.
- **Caveat:** this factor was flagged by the existing lessons table, which looks at both periods. 2026 is therefore not a perfectly untouched check for this half.
- **If only one part can be ported by Sunday, port the cold-streak quarter size.** It carries most of the 5-year gain: +$3.7k of +$5.1k, and 1-month eval fails 9.4% → 7.4%. It costs $568 in 2026.

## What you will notice

- **Many more 1-micro trades.**
  - 2021-25: 333 of 679 trades are at 1 micro (live: 205).
  - 2026: 34 of 89 (live: 24).
- **Cold streaks can last a long time.** The longest:
  - 18 weeks: Sep 2022 - Jan 2023
  - 16 weeks: Nov 2023 - Mar 2024
  - 15 weeks: Sep - Dec 2025
  - 13 weeks: May - Aug 2026
- **During a cold streak most trades are 1 micro**, about $100 at risk. The bot still trades and alerts every setup. Full size comes back automatically as soon as the shadow record adds back up above 0R (unchanged).
- **A strong winner during a cold streak makes less.**
  - Example: the +5R winner on 2026-08-07 would make $740 instead of $1,481 (3 micros instead of 6).
  - That is the price for losing much less in the bad stretches.

## Faster evals: the owner's 2-week rule (optional fast mode)

**The new rule:** an eval should be passed or failed within 2 weeks (10 sessions) and never take more than 3 weeks to pass, with 2-4 trades a week.
- The live sizing decides only 19% of evals within 2 weeks in 2026, and 6% in 2021-25.
- The recommended package changes that very little: 20% and 6%.

**Why it is slow:**
- There are only 2-3 setups a week.
- Most stops are 40-60 points, so a trade risks only $130-400.
- The $3,000 target is about four full $800 winners, but most winners are on wide stops and much smaller.

**What was tested.** Each idea was put on top of the recommended package, and the cold x0.25 and late x0.5 always stay:
- more $ per trade: $1,200 or $1,600
- pressing a fresh eval: $1,200 while the eval is up
- sizing from the cushion: 0.6 × the cushion above the trailing max loss
- banking the pass: from +$2,000, risk at most half of what is still needed
- **dropping the wide-stop scaling while the eval is healthy**

The table follows the owner's columns. "Decided in 2w" is passed + failed within 10 sessions.

| run | status | 2026 decided in 2w (pass/fail %) | 3w pass/fail % | passes slower than 3w | median sessions to pass | evals per pass | net | PF | 2021-25 decided in 2w (pass/fail %) | 3w pass/fail % | passes slower than 3w | median sessions to pass | passes / fails a year | evals per pass | net | PF | max DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline (live) | | 19% (19/0) | 28/0 | 55% | 19 | 1.25 | +$20,111 | 3.48 | 6% (4/2) | 6/6 | 70% | 25 | 1.5 / 4.3 | 3.89 | +$6,491 | 1.09 | -$11,401 |
| risk_pkg_q25_late_live (recommended) | | 20% (20/0) | 29/0 | 54% | 18 | 1.16 | +$20,583 | 4.12 | 6% (4/2) | 6/3 | 80% | 31 | 1.5 / 2.5 | 2.63 | +$11,546 | 1.19 | -$9,183 |
| **risk_fast_press1000** | **adopt-candidate** | **27% (26/1)** | 34/3 | **24%** | **9** | 1.25 | +$27,555 | 3.35 | **15% (9/6)** | 12/13 | **57%** | **18** | **3.3 / 5.6** | 2.68 | +$18,871 | 1.21 | -$12,305 |
| risk_fast_press1000_ref40 | adopt-candidate | 27% (27/0) | 34/2 | 24% | 9 | 1.32 | +$26,267 | 3.47 | 13% (7/6) | 9/13 | 66% | 21 | 2.5 / 5.1 | 3.02 | +$17,599 | 1.20 | -$12,446 |
| risk_fast_press0_bank | adopt-candidate | 23% (22/0) | 32/1 | 50% | 15 | 1.15 | +$21,400 | 3.35 | 11% (8/4) | 12/8 | 60% | 18 | 2.4 / 3.8 | 2.58 | +$13,454 | 1.19 | -$10,564 |
| risk_fast_press500_bank | promising | 25% (24/1) | 32/3 | 34% | 10.5 | 1.37 | +$26,528 | 3.56 | 14% (9/5) | 13/10 | 54% | 17 | 2.4 / 4.3 | 2.80 | +$19,359 | 1.24 | -$10,631 |
| risk_fast_cush1000 (press while the cushion is $1,000+) | rejected | 26% (26/0) | 34/0 | 49% | 15 | 1.15 | +$28,291 | 3.47 | 14% (9/6) | 12/10 | 56% | 18 | 2.4 / 4.6 | 2.92 | +$14,649 | 1.17 | -$12,483 |
| risk_fast_flat800 (no eval state) | promising | 28% (26/2) | 33/4 | 24% | 9 | 1.27 | +$28,565 | 3.33 | 17% (9/8) | 12/15 | 59% | 19 | 3.3 / 6.3 | 2.92 | +$22,647 | 1.23 | -$13,927 |
| risk_fast_usd1200 | rejected | 23% (23/0) | 33/0 | 48% | 15 | 1.18 | +$30,620 | 4.20 | 13% (6/7) | 8/14 | 55% | 17 | 2.1 / 5.6 | 3.72 | +$11,642 | 1.13 | -$13,200 |
| risk_fast_usd1600 | rejected | 31% (30/2) | 38/4 | 13% | 7 | 1.32 | +$38,003 | 4.01 | 19% (7/12) | 10/21 | 48% | 15 | 2.5 / 7.2 | 3.86 | -$32 | 1.00 | -$16,292 |
| risk_fast_fresh1200 | rejected | 22% (22/0) | 33/0 | 48% | 15 | 1.13 | +$25,196 | 3.90 | 8% (5/3) | 8/7 | 66% | 21 | 1.8 / 4.3 | 3.41 | +$9,333 | 1.12 | -$11,949 |
| risk_fast_cush06_bank | rejected | 22% (22/0) | 30/0 | 51% | 16 | 1.11 | +$22,992 | 3.98 | 5% (5/0) | 7/0 | 75% | 27 | 1.3 / 2.0 | 2.54 | +$7,621 | 1.14 | -$7,340 |

**Fast-mode status rule:**
- **adopt-candidate** needs all of these in both periods, compared with the recommended package:
  - decided within 2 weeks: at least 2 points more often
  - pass within 3 weeks: not fewer
  - slow passes: fewer
  - 2-week fails: up by at most 5 points
  - evals bought per pass: at most 15% more
  - plus 2021-25 net and PF not worse than the package
- **Net and drawdown** of the eval-state runs come from back-to-back evals. That is eval-account money, which MFFU does not pay out.

**The best fast mode is `risk_fast_press1000`:**
- While the eval balance is above $49,000 (less than $1,000 down), risk $800 on every setup, whatever the stop.
- At or below $49,000, go back to the normal sizing ($800 × 20 / stop on wide stops).
- The trending half, the cold x0.25 and the late x0.5 always apply. Floor 1 micro, max 40 micros.
- It needs only the account balance, so it fits the Pine script: `strategy.equity` against the starting balance.

**What it does:**
- **Evals decided within 2 weeks:** 2026 27% (20% today), 2021-25 15% (6%).
- **Passes slower than 3 weeks:** 2026 24% (54%), 2021-25 57% (80%).
- **Median pass:** 2026 9 sessions (18), 2021-25 18 (31).
- **Passes a year roughly double:** 2021-25 3.3 vs 1.5.
- **Evals bought per pass stay about the same:** 2.68 vs 2.63 in 2021-25, 1.25 vs 1.16 in 2026. Each funded account costs the same number of evals; it just arrives about twice as fast.
- **5-year money is better:** 2021-25 +$18.9k vs +$11.5k, PF 1.21 vs 1.19.

**The honest price:**
- **It fails more than twice as many evals a year:** 2021-25 5.6 vs 2.5.
- **2-week fails rise:** 2026 1% vs 0%, 2021-25 6% vs 2%.
- **3-week fails:** 2021-25 13% vs 3%.
- **Drawdowns grow:** 2021-25 max DD -$12.3k vs -$9.2k.
- **2026 PF drops** from 4.12 to 3.35, though 2026 net rises to +$27.6k.
- **"Most evals decided within 2 weeks" is not reachable by sizing with this strategy.** Even $1,600 a trade decides only 31% (2026) and 19% (2021-25) of evals in 2 weeks. It fails 12% of 2021-25 evals within 2 weeks and makes nothing over 5 years.

**What did not work:**
- **More $ on tight stops** ($1,200 or $1,600, or $1,200 while the eval is up): tight stops are already near the 40-micro cap, and in 2021-25 the extra risk mostly buys fails (3.4-3.9 evals per pass).
- **Sizing from the cushion:** almost no 2021-25 fails, but fewer passes and slower.
- **Banking the pass:** small effect either way. The bot rarely risks more than what is left to the target.
- **"Stop pressing after a fail":** the chosen rule already stops pressing as soon as the eval is $1,000 down.

**Verdict:**
- **If the 2-week rule matters more than fewer fails, use `risk_fast_press1000` on top of the recommended package.** It is an adopt-candidate by the owner's criteria.
- **If fewer fails and smaller drawdowns matter more, keep the package with fixed sizing.**
- **Either way, the cold-streak quarter size and the late-entry half size stay.**

## What NOT to do (all tested, same trades, numbers in the runs)

| idea | 2026 net / PF | 2021-25 net / PF | 1-month eval fails 2021-25 | verdict |
|---|---:|---:|---:|---|
| live (reference) | +$20.1k / 3.48 | +$6.5k / 1.09 | 9.4% | |
| risk $1,000 instead of $800 | +$25.2k / 3.47 | +$6.9k / 1.07 | 20.5% | twice the fails, no 5-year gain |
| risk $600 | +$15.0k / 3.51 | +$1.5k / 1.03 | 1.5% | much less profit, 2.09 setups a week |
| risk $400 | +$9.2k / 3.30 | +$1.3k / 1.03 | 0.0% | 1.99 setups a week in 2026 (the engine skips setups under 1 micro) |
| $800 on every stop (no wide-stop scaling) | +$26.5k / 2.62 | +$16.6k / 1.13 | 36.8% | max DD -$16.8k, evals fail 4x as often |
| full risk up to a 30-pt stop | +$23.5k / 3.01 | +$8.7k / 1.09 | 20.3% | twice the fails |
| $800 on every trade (no de-risking at all) | +$26.4k / 2.11 | +$0.6k / 1.00 | 67.6% | nothing over 5 years, max DD -$26.6k |
| cold-streak filter off | +$20.9k / 3.07 | -$2.5k / 0.98 | 27.0% | the filter is what makes 2021-25 positive |
| skip mode (sit out cold streaks) | +$19.6k / 4.08 | +$15.0k / 1.32 | 7.1% | best 5-year numbers, but 1.5 setups a week and months without a trade: you rejected it |
| trending regime at full size (drop the live half) | +$21.4k / 3.28 | +$7.8k / 1.09 | 13.5% | PF lower in 2026, more eval fails: keep the half |
| half size while the account is $1.5k below its high | +$14.4k / 3.53 | -$0.4k / 0.99 | 2.8% | cuts size right before the recoveries |
| half size after 3 losers in a row | +$18.1k / 3.63 | +$3.0k / 1.05 | 3.5% | less money in both |
| 1.5x right after a winner | +$20.8k / 3.05 | +$4.0k / 1.05 | 15.1% | worse in both |
| eval: size down once the cushion is under $1,000 | +$19.2k / 3.55 | +$2.9k / 1.05 | 2.1% | far fewer fails, but fewer passes a year (1.25 vs 1.5) and the result depends on the exact $ threshold |
| eval: press after the floor locks / bank the pass | about the same | about the same | 9-10% | changes almost nothing (the bot rarely risks more than what is left to the target) |

**Close calls, left out on purpose (no extra rules before Sunday):**
- **1.5x when the last 15 signals add up to +8R or more:**
  - beats the live rules in both periods: 2026 +$24.3k, 2021-25 +$9.0k
  - its extra profit comes from pressing size in hot streaks
  - more risk: 2026 max DD -$3.1k, 3-month eval fails 21% vs 14%
  - Run `risk_hot8_150`; combined with the quarter size, `risk_pkg_q25_hot8`.
- **Half size when VIX closed at 20 or higher:**
  - helped 2021-25: PF 1.14, max DD -$6.8k
  - changed nothing useful in 2026, which had only 12 such trades
  - Run `risk_sit_vix20_half`.
- **Half size after -2R in a week:**
  - helped 2021-25: +$7.9k
  - never triggered in 2026, so it has no out-of-sample evidence
  - Run `risk_week_brake2r`.

## How it was tested

- **Data and replay:** the exact live-loop replay on TradingView CME NQ1! 5-minute data, with commissions and slippage. This is the same 768 trades as the dashboard baseline.
- **Sizing:** redone from the engine's own rule. The engine's sizing stop was rebuilt for every trade, and all 768 give back the engine's micros exactly.
  - The post-hoc method matches engine replays with other settings ($1,000 risk, 30-pt reference stop, no wide-stop scaling) to within $650 of 5-year net. The risk-level and wide-stop runs use the engine replays themselves.
  - The recommended sizing was cross-checked against the dashboard's own sizing code (`runlib.size`) and is identical trade by trade.
- **No look-ahead:** a rule only sees the trade's setup and trades that had already finished.
- **Rules tried:**
  - 78 runs in this family, saved in the run library (family "risk", ids risk_* and loss_*)
  - plus a 45-point cold-streak grid
  - plus 15 one-factor situational rules (picked on 2021-25, then checked on 2026)
  - plus a random-rule noise check
- **Reproduce:** `python tools/research_risk.py all` reruns everything; `python tools/research_risk.py recommend` prints this page's tables.
