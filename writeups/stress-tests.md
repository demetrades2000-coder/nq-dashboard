## What was tested and how

Everything here starts from the exact live-loop replay of the locked strategy (768 trades, Nov 2021 - Oct 16 2026, the
live sizing: quarter size in cold streaks, half size on late entries). Nothing was re-optimised: these are "what if the
world is worse than the backtest" questions. No new engine replay was needed; the engine has no "enter one bar late"
option, so that test is an approximation (see part 6).

Baseline, for reference (costs included: 1 tick of slippage on the entry and on every exit except a target, $1.50 per
micro round trip, 10 micros booked as one mini at $4.50):

| | 2026 | 2021-25 | All 5 years |
|---|---:|---:|---:|
| Trades, per week | 89, 2.16 | 679, 3.17 | 768, 3.0 |
| Profit factor | 3.94 | 1.27 | 1.54 |
| Net, per month | +$20,487, +$2,088 | +$16,379, +$321 | +$36,866, +$606 |
| Max drawdown | -$2,249 | -$9,265 | -$9,265 |
| Eval passed / failed within 2 weeks | 20.4% / 0% | 4.1% / 1.9% | 6.7% / 1.6% |
| Eval passed / failed within 1 month | 34.0% / 0% | 8.8% / 5.2% | 13.1% / 4.4% |
| Back-to-back evals passed / failed | 4 / 1 | 8 / 10 | 12 / 11 |

Over the 5 years the strategy already pays $3,297 in commission and $2,680 in slippage: gross $39,912, net $36,866.

## 1. Costs: slippage 2 and 3 ticks, commission doubled

**The formula**, checked on all 768 trades (0 mismatches against the engine's books):

profit = (exit price - entry price) x direction x micros x $2 - commission

commission = whole minis x $4.50 + odd micros x $1.50 (10 micros = 1 mini). The engine's entry is the next bar's open
plus 1 tick of slippage; every exit except a target (a resting limit order) is the bar's close or the stop price minus
1 tick. Each extra tick of slippage therefore costs $0.50 per micro per leg: 2 ticks = $1.00 more per micro on a
stopped or time-stopped trade, $0.50 on a target; 3 ticks = double that. "Commission doubled" adds the booked commission
once more. The R of every trade was recomputed with the stressed costs, so the cold-streak filter (which adds up R) saw
the stressed record too; then the live sizing was applied as usual.

| | 2026 net (PF) | 2026 $/month | 2021-25 net (PF) | 2021-25 $/month | 2021-25 max DD | 2021-25 eval 1 month pass / fail | 2021-25 back-to-back |
|---|---:|---:|---:|---:|---:|---:|---:|
| Baseline | +$20,487 (3.94) | +$2,088 | +$16,379 (1.27) | +$321 | -$9,265 | 8.8% / 5.2% | 8 / 10 |
| Slippage 2 ticks | +$20,165 (3.81) | +$2,056 | +$14,029 (1.22) | +$275 | -$9,792 | 8.6% / 6.4% | 8 / 12 |
| Slippage 3 ticks | +$19,640 (3.65) | +$2,002 | +$8,938 (1.14) | +$175 | -$10,302 | 6.7% / 6.7% | 7 / 11 |
| Commission doubled | +$20,081 (3.78) | +$2,047 | +$13,167 (1.21) | +$258 | -$9,808 | 8.6% / 6.4% | 8 / 12 |
| 2 ticks + commission doubled | +$16,650 (3.24) | +$1,697 | +$8,656 (1.13) | +$170 | -$10,308 | 6.4% / 7.6% | 6 / 13 |
| 3 ticks + commission doubled | +$16,335 (3.13) | +$1,665 | +$6,897 (1.11) | +$135 | -$9,872 | 6.2% / 6.7% | 6 / 13 |

Trades a week do not change (every setup is still taken). 2026 eval odds: unchanged for the single stresses; with
both stresses together the 1-month pass rate falls from 34% to 23% (no fails either way).

What it says:

- **One more tick of slippage, or double the commission, is survivable**: 2021-25 keeps 80-86% of its profit and PF
  stays above 1.2. Each extra tick costs $2,358 over 2021-25 and $322 in 2026 (2026 trades fewer micros a trade).
  The 2021-25 profit would reach zero at about 7 extra ticks (1.75 points) of slippage per leg.
- **Three ticks plus doubled commission is where it gets thin**: 2021-25 drops to +$6.9k (PF 1.11, $135 a month) and
  more back-to-back evals fail than pass (6 / 13). 2026 still makes +$16.3k.
- **About half of the damage is not the costs themselves but the cold-streak filter reacting to them.** The direct
  extra cost of 2 ticks + doubled commission at the live sizes is $5,977 over 5 years; the realised loss is $11,560,
  because 20 trades changed cold-streak state. In 2026 the direct cost is only $746 but the realised loss is $3,837:
  the 15-trade sum dipped to 0R or below just before the 2 March 2026 trade, which then ran at 4 micros instead of
  18 (+$831 instead of +$3,764). The filter is a knife-edge around 0R: 3 trades flip with 2 ticks, 18 with 3 ticks,
  8 with doubled commission, 26 with both. Live, the filter reads the real ledger, so real costs will move its state
  the same way.

Status: information. Check the real route's costs against this: $1.50 per micro round trip and market fills at the
open are what the backtest assumes.

## 2. Price feed: TradingView trades MNQ1!, the engine trades NQ1!

Two facts from the parity files (`research/pine_parity/`): on identical bars the Pine script and the engine are the
same strategy (5 years, 780 of 780 trades identical in entry, exit, size and dollars). The only difference live is the
data: TradingView's chart is MNQ1! prints, the engine's history is NQ1! prints.

**How different are the bars?** Over the 8-week overlap of the MNQ export and the NQ file (Aug 23 - Oct 16 2026,
3,006 regular-hours bars, roll shift removed):

| | mean difference (ticks) | differ by 1+ tick | 2+ ticks | 4+ ticks (1 point) |
|---|---:|---:|---:|---:|
| Open | 0.96 | 64% | 22% | 2% |
| High | 1.56 | 68% | 29% | 9% |
| Low | 1.56 | 70% | 31% | 9% |
| Close | 1.17 | 71% | 31% | 3% |

So 7 bars in 10 close a tick or more apart and the wicks (where sweeps and stops live) are a point or more apart on
nearly 1 bar in 10. Every tick-sensitive rule (a body close through a gap, the stop 2 points beyond the extreme, the
3-point gap minimum, the 15-minute structure flip) will fire on one feed and not the other now and then.

**What it did to the trades** (same script, 8 weeks, 24 trade rows): 20 entries matched, 2 trades only on
TradingView, 2 only in Python (17% of rows); of the 20 matched, 5 (25%) had a different size by 1-3 micros, none had
a different exit type. TradingView's net was $13,733.50 against Python's $15,736.50 (Python re-priced with
TradingView's commission): **$2,003 apart (13%) after 8 weeks**, of which $1,826 came from the four unmatched trades
(one trade alone, 12 October, was a -$736 stop on MNQ and a +$734.50 time exit on NQ), $143 from the size
differences and $34 from price differences on same-size trades. The average absolute difference per trade row was
$94.

**Expected drift per year** (about 150 trades a year at the 5-year rate, 110 at the 2026 rate; one 8-week window, so
these are rough):

| | $ |
|---|---:|
| Gross "churn" (sum of per-trade differences, either way) | about $14,000 a year |
| Typical gap between the two ledgers after a year, if the differences are random (they should be) | about $5,000 either way |
| Worst case if every difference went the same way | about $13,000 |

There is no reason to expect either feed to be systematically better: the 5-year parity shows no bias, and the 8-week
gap was mostly one coin-flip trade. What it means: the TradingView record and the Python record will disagree by a
few thousand dollars a year and on roughly 1 trade in 6. That is noise, not a bug, and it is a reason to judge the
live result against the backtest with that tolerance in mind.

## 3. The worst plausible start of an eval

An MFFU Builder 50K eval ($3,000 target, $2,000 end-of-day trailing max loss checked against the intraday low) was
started on the worst day of each year, at the start of the longest and of the costliest losing streak, and at the
start of the worst 10-session stretch, and run until it passed or failed (not stopped at 60 sessions).

| Year (net) | Start | What happened at the start | Eval result |
|---|---|---|---|
| 2021 (+$4.0k, 2 months of data) | worst day Dec 23 | -$702 | fail, after 130 sessions |
| | worst 10 sessions Dec 16-30 | -$1,049 | fail, after 129 sessions |
| | longest losing streak Nov 26 - Dec 9 | 6 trades, -$604 | **pass in 38 sessions** |
| | costliest streak Dec 16-20 | 3 trades, -$908 | fail, after 129 sessions |
| 2022 (-$2.4k) | worst day Jul 26 | -$838 | fail in 51 |
| | worst 10 sessions Jul 22 - Aug 4 | -$1,785 | fail in 23 |
| | longest streak Aug 31 - Oct 4 | 17 trades, -$807 | fail in 108 |
| | costliest streak Jul 22 - Aug 12 | 8 trades, -$1,976 | fail in 23 |
| 2023 (+$7.4k) | worst day Oct 20 | -$830 | fail in 45 |
| | worst 10 sessions Oct 16-27 | -$1,833 | fail in 16 |
| | longest streak Nov 14 - Dec 1 | 10 trades, -$505 | fail in 65 |
| | costliest streak Feb 15-24 | 7 trades, -$2,021 | **fail in 8 sessions** |
| 2024 (+$5.7k) | worst day May 3 | -$875 | fail in 10 |
| | worst 10 sessions Nov 18-29 | -$2,956 | **fail in 6 sessions** |
| | longest streak Jan 3 - Feb 5 | 17 trades, -$1,303 | **pass in 66 sessions** |
| | costliest streak Nov 15-25 | 7 trades, -$2,188 | fail in 7 |
| 2025 (+$1.7k) | worst day Jan 31 | -$632 | fail, after 118 sessions |
| | worst 10 sessions Sep 1-12 | -$1,524 | fail in 20 |
| | longest = costliest streak Sep 1 - Nov 17 | 33 trades, -$3,127 | fail in 20 |
| 2026 (+$20.5k) | worst day Mar 16 | -$525 | fail, after 76 sessions |
| | worst 10 sessions Aug 10-21 | -$1,171 | **pass in 14 sessions** (the Aug-Sep run followed) |
| | longest = costliest streak Apr 20 - May 29 | 16 trades, -$1,667 | fail, after 61 sessions |

21 of these 24 worst-case starts fail, 3 pass. Plain reading:

- **The eval killer is 7-8 full-size losers in a row right after a good run.** The two fastest fails (Nov 2024 in 6-7
  sessions, Feb 2023 in 8) were streaks of 7 losers worth $280-310 each. The cold-streak filter only cuts the size
  once the last 15 signals add up to 0R or less, so the first 7-8 losers after a profitable stretch are all at full
  size, and $2,000 is only about 7 of them. This happened twice in 5 years.
- **Long streaks are not the danger.** The 33-trade streak of Sep-Nov 2025 lost $3,127, about $95 a trade, because
  the filter had the size at a quarter for most of it; the 17-trade streak of Jan 2024 was followed by a pass.
- **A whole bad year fails from almost any start**: 95% of 2022's 258 start days end in a fail (the year lost $2.4k).
  Other years: 2023 37%, 2024 25%, 2025 45%, 2026 21% (4% still open), 2021 15%. Over all 1,278 start days, run to
  the end of the data, 55% pass and 45% fail.
- Fails inside the first 10 sessions are rare: 6.6% of 2024's start days, 1.2% of 2023's, none in the other years.
- If a year's 10 worst days ever came back to back, the loss would be $2.6k (2021) to $6.6k (2023): every year
  would fail. They never did; the worst real 10-session stretch is -$2,956 (Nov 2024), the next -$1,833 and -$1,785.

These are, by construction, the worst of 1,278 possible start days. Nobody can pick the start date knowing this; the
table shows the floor, not the expectation. The expectation is in `monte-carlo-evals.md`.

## 4. Size rounding: the 1-micro trades

The size rule is risk divided by (stop points x $2), rounded down, times the cold-streak and late-entry multipliers,
rounded down once more, never below 1 micro.

- **363 of the 768 trades (47%) were 1 micro.** 299 of them in a cold streak (quarter size), 69 late entries, 342 with
  a stop wider than 30 points. In 2026, 32 of 89 trades; in 2021-25, 331 of 679.
- As a group they lose: **-$2,260 over 5 years (about $450 a year)**, 65 wins (17.9%), profit factor 0.84, -25.7R.
  2026: -$282 on 32 trades; 2021-25: -$1,978 on 331.
- **Rounding costs about $440 a year.** With fractional micros (not possible, but it shows the cost) the same trades
  would have made $2,179 more over 5 years: +$1,449 in 2026, +$730 in 2021-25. The average trade is 3.85 micros
  against 4.03 unrounded.
- Inside the 1-micro group two things pull in opposite directions: 207 trades were **rounded up** to the floor of 1
  micro (the rules wanted 0.63 micros on average, mostly cold x late or cold x wide stop); the floor cost $641 (they
  lost $1,407 instead of $766). 156 trades were rounded **down** from 1.0-1.99 micros to 1; that saved $402, because
  those trades lost on average.
- **Skipping the 1-micro trades** (run `stress_skip_1micro`): 2026 +$20,769 (PF 4.60), 2021-25 +$18,358 (PF 1.38,
  max DD -$7,977), but only 1.38 and 1.62 trades a week with 2+ trades in 43-46% of weeks. **Rejected** by the
  frequency rule, and for a better reason: the 1-micro trades are the cold-streak mechanism itself, the paper record
  that brings the size back once the last 15 signals turn positive. $450 a year is what staying in the game through
  cold streaks costs. The owner already rejected the skip mode for the same reason.

## 5. Contract cap: at most 20 or 10 micros a trade

The live cap is 40 micros (4 minis, the 50K plan). The same trades with the cap at 20 or 10, after the live sizing
(runs `stress_max20`, `stress_max10`; the $3k / $2k eval limits were left as they are, so this is "the 50K plan with
fewer contracts allowed", not a smaller plan):

| | 2026 net (PF) | 2026 $/month | 2026 eval 2w / 1m pass | 2021-25 net (PF) | 2021-25 $/month | 2021-25 max DD | 2021-25 eval 2w pass/fail | 1m pass/fail | b2b |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 40 micros (live) | +$20,487 (3.94) | +$2,088 | 20.4% / 34.0% | +$16,379 (1.27) | +$321 | -$9,265 | 4.1% / 1.9% | 8.8% / 5.2% | 8 / 10 |
| 20 micros | +$18,075 (3.60) | +$1,843 | 18.4% / 33.5% | +$12,347 (1.21) | +$242 | -$8,588 | 2.4% / 0.7% | 5.9% / 2.6% | 8 / 10 |
| 10 micros | +$12,666 (2.82) | +$1,291 | 7.8% / 17.5% | +$9,681 (1.18) | +$190 | -$7,441 | 0.7% / 0.3% | 3.3% / 1.5% | 6 / 8 |

- A 20-micro cap touches only 22 trades (3%) but costs $6,444 over 5 years (17% of the profit): $2,412 in 2026 on 3
  trades, $4,032 in 2021-25 on 19. The money is concentrated in the tight-stop trades (a stop of 20 points or less
  gets 20-40 micros). Eval fails fall too (2021-25 1-month fails 5.2% to 2.6%) and back-to-back results are the same.
- A 10-micro cap touches 56 trades (7%) and costs $14,519 (39%). Evals barely move inside 2 weeks (1.0% decided in
  2021-25) and the median pass takes 38 sessions. Trades a week are unchanged in both cases.
- For a plan with smaller contract limits the dollar risk would also have to come down; the risk study found $400 a
  trade already drops under 2 setups a week on wide stops, so a smaller plan would need its own look, not this table.

## 6. Entry one bar late (approximate)

The engine fills at the open of the bar after the trigger. There is no option to delay that by a bar, so this was done
by re-pricing the same trades on the real 5-minute bars: fill at the open of the bar after the engine's fill bar (plus
1 tick), the stop and target unchanged, micros from the new stop distance with the same cold/late multiplier, and
**the exit price and time kept as they were**. That last part makes it rough: 175 of the kept trades had in fact
already exited at or before the new fill time.

- 88 trades (11%) would not have been taken at all: 41 because the late fill was already through the stop, 1 past the
  target, 46 because the wider stop no longer allowed even 1 micro at the rules' risk. Those 88 lost $6,632 live
  (they were mostly the fast losers).
- For the 680 kept trades the late fill was a coin flip on price: better in 51%, worse in 48%, median 2.5 ticks
  better, but the spread is huge (1 in 10 fills 85 ticks, about 21 points, worse; 1 in 10 that much better).
- Result (run `stress_late1bar_approx`): 2026 +$16,614 (PF 3.07, 70 trades, 1.7 a week); 2021-25 +$6,244 (PF 1.09,
  $122 a month, max DD -$14,424, back-to-back evals 5 passed / 16 failed). Against the live rules that is -$3.9k in
  2026 and -$10.1k in 2021-25: about half of 2021-25's profit.

Take it as a direction, not a number: the first 5 minutes after the trigger carry a large part of the edge, so any
real order route that gets in a bar late is trading a different, much weaker strategy. An exact answer needs an
engine option for a delayed fill (a 3-minute replay).

## Bottom line for Monday

1. Costs: fine at 2 ticks or double commission; 3 ticks plus double commission takes 58% of 2021-25 and most of its
   eval odds. Half of any cost hit arrives through the cold-streak filter flipping state, which is a knife-edge at 0R.
2. TradingView and the Python bot will disagree on about 1 trade in 6 and end a year a few thousand dollars apart
   (about $5k either way), with no bias. Do not "fix" that; judge the live record with that tolerance.
3. The way to lose an eval fast is 7-8 full-size losers right after a good run (6-8 sessions, happened in Feb 2023
   and Nov 2024). The filter cannot stop that: it needs 15 signals to turn.
4. 47% of trades are 1 micro, they lose about $450 a year, and that is the price of the cold-streak mechanism.
   Rounding down costs another $440 a year; nothing to do about either.
5. The 40-micro cap matters: 3% of trades make 17% of the money.

None of this changes the lock. No adopt candidates.
