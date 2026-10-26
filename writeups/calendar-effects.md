## The short answer

The bot's results do not depend on the calendar in any way we can trust. Every weekday, month, week of the month,
holiday week, options expiry, news day and roll week was checked on the exact replay of the locked strategy
(768 trades, live sizing, costs included). A few cells look good or bad in one period, but almost none of them point
the same way in 2026 and in 2021-25, and the ones that do are small and rest on a handful of trades.

**Recommendation: no calendar rule. Trade every setup at the normal size.** One thing is worth keeping an eye on
(the day after the jobs report, below), nothing is worth changing.

What the live strategy does, for reference (the yardstick every rule is judged against):

| | 2026 (Jan 2 - Oct 16) | 2021-25 |
|---|---:|---:|
| Trades, per week | 89, 2.16 | 679, 3.17 |
| Average R per trade | +0.41 | +0.01 |
| Net, per month | +$20,487, $2,088/mo | +$16,379, $321/mo |
| Profit factor | 3.94 | 1.27 |
| Max drawdown | -$2,249 | -$9,265 |
| Eval passed / failed within 1 month | 34.0% / 0.0% | 8.8% / 5.2% |

## How to read the tables

- Every trade got its calendar flags from things known before the entry: the date, the sessions around it (half days
  and closed days from the bar count of the futures data), the release dates in `data/news/events.csv`, the roll dates
  in `data/NQ_rolls.json`, and for "first trade of the week" only the trades that had already finished.
- "avg R" is per trade. The period averages are +0.41R (2026) and +0.01R (2021-25), so a cell has to be compared to
  its own period, not to zero.
- "$/trade" is after the live sizing (quarter size in cold streaks, half on late entries, less on wide stops), so a
  cell can have a good R and a poor $ when its trades were small, and the other way round.
- 2026 has 89 trades in total. Most calendar cells hold 2 to 13 of them. A single +5R winner moves such a cell by
  +0.5R or more. Treat every 2026 cell as a hint, not a result.

## What points the same way in both periods

Only these cells sit on the same side of their period's average in 2026 and in 2021-25 with at least 25 / 6 trades:

| Calendar cell | 2021-25 trades, avg R, $/trade | 2026 trades, avg R, $/trade | Reading |
|---|---:|---:|---|
| Day after NFP (jobs report) | 31, -0.42R, -$53 | 3, -0.55R, -$160 | worse in both; 3 trades in 2026 |
| Day after CPI | 32, -0.14R, -$56 | 4, -0.56R, -$104 | worse in both; 4 trades in 2026 |
| June | 53, -0.21R, -$11 | 7, -0.25R, -$30 | worse in both; small money |
| Turn of the month (last session + first 3) | 127, -0.12R, -$12 | 18, +0.27R, +$180 | below average in both, but 2026 still positive |
| July-August | 124, +0.13R, +$55 | 20, +0.74R, +$243 | better in both |
| OPEX week (week of the 3rd Friday) | 158, +0.17R, +$60 | 21, +0.23R, +$221 | better in R in 2021-25; in 2026 below the average |
| Contract roll week | 42, +0.07R, +$62 | 6, +0.50R, +$595 | better in both; 6 trades in 2026 |
| DST-change week | 29, +0.17R, +$106 | 2, +2.48R, +$764 | 2 trades in 2026 |
| Half-day session (13:00 close) | 21, -0.37R, -$3 | 1, -0.23R, -$92 | 1 trade in 2026 |

Everything else either flips sign between the periods or has too few trades to say anything. The most instructive flip:

- **Wednesday** was the best day of 2021-25 (142 trades, +0.25R, net +$11.7k; chance of a random group this good about
  1.5%) and the worst day of 2026 (13 trades, -0.52R, net -$1.3k; chance about 4%). Both "significant", opposite
  directions. The rule 2026 suggests, half size on Wednesdays, gains $363 in 2026 and loses $6.3k in 2021-25 (run
  `cal_wed_half`); the rule 2021-25 suggests, more size on Wednesdays, would have lost in 2026. That is what calendar
  effects look like in this data.
- Also opposite: Friday (+0.04R then +1.41R, but 2021-25 net -$2.1k), Thursday (-0.14R then +0.41R), May (+0.12R then
  -0.70R), Q2 (+0.10R then -0.35R), week 1 of the month (-0.17R then +0.80R), the first 2 sessions of a month (-0.16R
  then +0.82R), FOMC day (+0.21R then -1.02R), the day after FOMC (-0.20R then +1.01R), NFP day (-0.25R then +1.85R),
  PPI day (+0.36R then -0.68R), quarter-end week (-0.06R then +0.51R).
- About 70 calendar cells were looked at. At the usual 5% bar, 3 or 4 of them should look "significant" by chance in
  one period. Only Wednesday clears it in both, and it does so in opposite directions.

**The brief's specific items:**

| Item | 2021-25 | 2026 | Verdict |
|---|---|---|---|
| Day of week | Wed best (+0.25R), Thu worst (-0.14R) | Fri best (+1.41R), Wed worst (-0.52R) | no stable pattern |
| First trade of the week | 213 trades, -0.02R, +$31/trade | 40 trades, +0.10R, +$174/trade | a normal trade; halving it loses $4.7k / $3.9k |
| Trade #3+ of the week | 267, -0.01R, +$10 | 19, +1.25R, +$420 | 2026 only |
| Month | Apr best (+0.41R, +$7.4k), Jun worst (-0.21R) | Sep (+1.32R), Aug (+1.22R) best; May worst (-0.70R) | Apr and May flip; Jun weakly bad in both |
| Half of the month | 1st-15th -0.02R, 16th-end +0.04R | +0.47R vs +0.36R | nothing |
| Month start / end | first 2 sessions -0.16R, last 2 +0.02R | first 2 +0.82R, last 2 +0.20R | flips |
| Holiday-shortened weeks | 126 trades, +0.04R | 14 trades, +0.18R | about average |
| Day after a 3-day weekend | 25 trades, +0.04R, +$81/trade | 3 trades, +0.21R | about average |
| OPEX (3rd Friday) | 30 trades, +0.33R, but only +$8/trade | 2 trades | too few |
| Triple witching day / week | 10 trades +0.18R / 50 trades +0.01R | 1 / 7 trades | too few, about average |
| FOMC day / day after | 18 trades +0.21R (11% win: one big winner) / 17 trades -0.20R | 2 / 4 trades | too few, flips |
| CPI day / day after | 30 trades +0.66R (p 0.004) / 32 trades -0.14R | 2 / 4 trades | 2021-25 only; cannot be checked in 2026 |
| NFP day / day after | 26 trades +0.01R / 31 trades -0.42R (p 0.055) | 3 / 3 trades | day after weakly bad in both, see below |
| DST-change weeks | 29 trades, +0.17R, +$106/trade | 2 trades | too few |
| Contract roll weeks | 42 trades, +0.07R, +$62/trade | 6 trades, +0.50R | about average, thin |

## The size rules (the strongest cells, tested the way the bot could use them)

Each rule multiplies the live size on the flagged days (x0.5 for the weak cells, x1.25 for the strong ones), on top of
the cold-streak and late-entry rules, exactly as `runlib.size` applies them. Trades a week do not change for a size
rule. Skips are a check only: the owner wants every setup traded.

| Rule (run) | 2026 net (vs live) | 2026 PF | 2026 DD | 2021-25 net (vs live) | $/month | 2021-25 PF | 2021-25 DD | Eval 1m pass/fail 2021-25 | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Live strategy | +$20,487 | 3.94 | -$2,249 | +$16,379 | $321 | 1.27 | -$9,265 | 8.8% / 5.2% | baseline |
| Half size the day after NFP (`cal_nfp_next_half`) | +$20,743 (+$256) | 4.09 | -$2,112 | +$17,127 (+$748) | $336 | 1.29 | -$9,010 | 8.8% / 4.3% | promising |
| same, events.csv dates only (`cal_nfp_next_csv_half`) | +$20,743 (+$256) | 4.09 | -$2,112 | +$17,549 (+$1,170) | $344 | 1.29 | -$9,265 | 8.8% / 4.6% | info |
| Skip the day after NFP, check (`cal_nfp_next_skip`) | +$20,968 (+$481) | 4.23 | -$2,112 | +$18,022 (+$1,643) | $353 | 1.32 | -$8,732 | 8.7% / 2.9% | info: 2.09 / 3.02 trades a week |
| Half size in June (`cal_june_half`) | +$20,487 (0) | 3.94 | -$2,249 | +$16,000 (-$379) | $313 | 1.27 | -$9,363 | 8.7% / 5.2% | rejected |
| Skip June, check (`cal_june_skip`) | +$20,700 (+$213) | 4.13 | -$2,036 | +$16,955 (+$576) | $332 | 1.30 | -$8,871 | 8.7% / 5.2% | info: 1.99 trades a week in 2026 |
| x1.25 in July-August (`cal_summer_125`) | +$21,080 (+$593) | 3.89 | -$2,501 | +$17,271 (+$892) | $338 | 1.28 | -$9,508 | 8.6% / 7.8% | rejected |
| x1.25 in OPEX week (`cal_opex_week_125`) | +$21,618 (+$1,131) | 3.97 | -$2,528 | +$17,773 (+$1,394) | $348 | 1.28 | -$9,726 | 11.0% / 6.2% | rejected |
| Half size at the turn of the month (`cal_tom_half`) | +$18,929 (-$1,558) | 3.98 | -$2,071 | +$16,531 (+$152) | $324 | 1.29 | -$8,054 | 8.2% / 3.6% | rejected |
| Half size on half-day sessions (`cal_half_day_half`) | +$20,543 (+$56) | 3.97 | -$2,249 | +$16,373 (-$6) | $321 | 1.27 | -$9,042 | 8.7% / 3.9% | info |
| x1.25 on CPI day (`cal_cpi_125`) | +$20,477 (-$10) | 3.93 | -$2,249 | +$17,409 (+$1,030) | $341 | 1.28 | -$9,265 | 9.0% / 5.2% | info |
| x1.25 in DST-change weeks (`cal_dst_week_125`) | +$20,487 (0) | 3.94 | -$2,249 | +$17,150 (+$771) | $336 | 1.28 | -$9,527 | 9.5% / 5.2% | info |
| Half size on the first trade of the week (`cal_first_week_half`) | +$16,597 (-$3,890) | 3.99 | -$1,931 | +$11,725 (-$4,654) | $230 | 1.22 | -$9,141 | 6.5% / 3.1% | rejected |
| Half size on Wednesdays, the trap (`cal_wed_half`) | +$20,850 (+$363) | 4.54 | -$2,027 | +$10,072 (-$6,307) | $197 | 1.18 | -$9,325 | 7.8% / 3.9% | info |

Three rules are better in both periods on net and PF (day after NFP, both versions; OPEX week x1.25). Before calling
any of them a candidate, the question is whether chance alone does the same.

## The noise benchmark: what a random rule achieves

Random groups of trades of the same size as the calendar cells were sized the same way, 300 draws each, and judged
by the same rule (better than live in both periods on net and PF):

| Random group | Passes "better in both periods" | 90th percentile gain, 2021-25 | 90th percentile gain, 2026 |
|---|---:|---:|---:|
| 34 trades at x0.5 (like "day after NFP") | 15.0% of draws | +$870 | +$276 |
| 60 trades at x0.5 (like "June") | 13.3% of draws | +$1,224 | +$331 |
| 179 trades at x1.25 (like "OPEX week") | 38.3% of draws (60% on net alone) | +$1,565 | +$1,954 |

- **Day after NFP at half size** gains +$748 / +$256: right at what a lucky random pick of 34 trades gives (the 90th
  percentile), and 1 random group in 7 passes the both-periods test. With about 70 cells examined, finding one or two
  like this is expected. It stays "promising" only because the sign is the same in both periods and the idea (a
  Monday or Friday-after-payrolls that rotates instead of running) is at least plausible. It needs about 20 more such
  trades (roughly 18 months) before it means anything.
- **OPEX week at x1.25** gains +$1,394 / +$1,131: below the random 90th percentile in both periods, and 60% of random
  179-trade groups beat the live net in both periods when sized up. A strategy that makes money gets more money from
  more size on almost any group of its trades; the price is the drawdown (-$9,726 vs -$9,265) and more failed evals
  (6.2% vs 5.2% within a month). In 2026 the OPEX-week trades actually made less per trade ($221) than the others
  ($233). This is a size-up, not an OPEX effect. Rejected.
- **July-August at x1.25**: the same story with a worse 2026 PF (3.89) and 1-month eval fails of 7.8% in 2021-25.

## By year (the two rules that passed the mechanical test)

| Year | Live net (PF) | Half size the day after NFP | x1.25 in OPEX week |
|---|---:|---:|---:|
| 2021 (Nov-Dec) | +$4,025 (2.42) | +$4,227 (2.60) | +$4,312 (2.52) |
| 2022 | -$2,447 (0.82) | -$2,019 (0.85) | -$1,864 (0.87) |
| 2023 | +$7,414 (1.42) | +$6,520 (1.37) | +$7,537 (1.41) |
| 2024 | +$5,683 (1.36) | +$6,222 (1.41) | +$6,209 (1.39) |
| 2025 | +$1,705 (1.15) | +$2,177 (1.20) | +$1,579 (1.14) |
| 2026 | +$20,487 (3.94) | +$20,743 (4.09) | +$21,618 (3.97) |

Neither is better in every year (NFP loses $894 in 2023, OPEX loses $126 in 2025), and the yearly swings are a few
hundred dollars: the size of a single trade.

## What failed outright

- **Half size on the first trade of the week**: -$4.7k in 2021-25, -$3.9k in 2026. The first trade of the week is a
  normal trade (213 and 40 trades say so). Its lower R in 2026 (+0.10R vs +0.66R for later trades) is one of the
  many 2026 cells that a couple of big winners decide.
- **Half size at the turn of the month**: -$1.6k in 2026. The 2021-25 weakness (-0.12R on 127 trades) did not carry
  over; the first sessions of 2026 months were among the year's best (+0.82R on 10 trades).
- **Half size in June**: changes nothing in 2026 and loses $379 in 2021-25. June's losers were already small trades.
- **Skips** (day after NFP, June): both look a little better on paper, but they drop the bot under the owner's
  2-a-week line in 2026 (2.09 and 1.99 a week), and a post-hoc skip cannot see the second setup the engine would have
  taken later that day.

## Caveats, honestly

- **News dates.** `data/news/events.csv` has FOMC for every year but CPI and NFP only from October 2023. The CPI/NFP
  release dates for November 2021 to September 2023 were backfilled by the researcher from the standard BLS schedule
  (CPI mid-month, payrolls on the first Friday with the usual exceptions). Tables say "(+ backfilled 2021-23)" where
  they are used; the "events.csv" rows use only the file. Both versions of the NFP rule are saved. Those 08:30 releases
  fall before the killzones, so the replay's news blackout (which the engine takes from events.csv) does not change
  any entry either way.
- **2026 is 9.5 months and 89 trades.** November and December 2026 do not exist yet; most 2026 cells hold 2 to 13
  trades, and the whole year's edge rests on about 20 winners. Calendar cells of that size prove nothing on their own.
- **Many comparisons.** About 70 cells were checked. Chance alone makes a few of them look good or bad in one period;
  the random-group benchmark above is the honest comparison, not the p-values of single cells.
- **Size rules are post-hoc but exact.** P&L, commission and slippage are linear in the micros, and the cold-streak
  and late-entry sizes are applied first, as in the live loop. A x1.25 rule does nothing to a 1-micro trade (most
  cold-streak trades), which is why some x1.25 runs leave 2026 unchanged.
- **Half days.** The 45 half-day sessions (13:00 ET close: MLK, Presidents', Memorial, Juneteenth, July 3/4, Labor
  Day, Thanksgiving, Christmas Eve) have no afternoon killzone, so the 22 trades there are all morning trades; the
  replay ends them at the last bar.
- **No engine replays were needed:** every rule here acts after the entry decision, so the exact cached replay is the
  right data. The two allowed replays were not used.

## Data for the dashboard

`research/lab/calendar_effects.json`: every factor table (both periods: trades, win %, avg R, net, $/trade, chance
p), the ranked candidates with a "consistent" flag, each rule's headline numbers and years, the noise benchmark, and
how many sessions a year each flag covers (e.g. OPEX weeks 298 of 1,278 sessions, day after NFP 59, half days 45,
DST weeks 50, roll weeks 82, FOMC days 39). Script: `tools/research_cal.py` (`tables`, `rules`, `noise`, `all`).

## What to do next

1. **Record the flag, decide later.** Add "day after NFP" (and "day after CPI") to the trade reports and the shadow
   ledger so the live paper record accumulates it; revisit when there are about 20 more such trades (around 18
   months). No size change now.
2. **Test the cause, not the date.** If post-release days are weak, it is probably because the day's range is already
   spent by 09:30 or the market rotates. The engine already measures the day's range against the 20-day average at
   entry (`rg_day_er`, the 1.6x range block) and the overnight range; a rule on those, which fires on any such day
   and not only after payrolls, is the version that could hold in both periods.
3. **FOMC afternoons as a management rule, not a size rule.** FOMC days have 18 trades in 2021-25 with an 11% win rate
   but a positive average R, i.e. one big winner and many small losers before the 13:00 blackout. Worth checking
   whether a shorter time stop or an earlier bank (the +0.5R lock) on pre-FOMC entries removes the small losers
   without touching the winner; this needs an exit re-simulation on the 20 trades, not a size rule.

## Appendix: the full tables (both periods; avg R per trade, $ after the live sizing)

Period averages for comparison: 2021-25 +0.01R and +$24 per trade; 2026 +0.41R and +$230 per trade.


**Day of week**

| Day of week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Mon | 135 | 20.7% | -0.05 | +1,424 | +11 | 21 | 28.6% | +0.20 | +3,634 | +173 |
| Tue | 138 | 20.3% | -0.07 | +4,792 | +35 | 13 | 23.1% | +0.28 | +2,213 | +170 |
| Wed | 142 | 23.9% | +0.25 | +11,652 | +82 | 13 | 7.7% | -0.52 | -1,302 | -100 |
| Thu | 126 | 19.8% | -0.14 | +627 | +5 | 24 | 20.8% | +0.41 | +7,138 | +297 |
| Fri | 138 | 20.3% | +0.04 | -2,116 | -15 | 18 | 44.4% | +1.41 | +8,804 | +489 |


**Trade number in the week**

| Trade number in the week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| #1 | 213 | 20.7% | -0.02 | +6,541 | +31 | 40 | 22.5% | +0.10 | +6,979 | +174 |
| #2 | 199 | 20.6% | +0.07 | +7,168 | +36 | 30 | 20.0% | +0.29 | +5,519 | +184 |
| #3+ | 267 | 21.7% | -0.01 | +2,670 | +10 | 19 | 42.1% | +1.25 | +7,989 | +420 |


**Month**

| Month | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Jan | 45 | 22.2% | +0.15 | +927 | +21 | 10 | 40.0% | +0.38 | +2,444 | +244 |
| Feb | 56 | 23.2% | +0.03 | -1,407 | -25 | 6 | 0.0% | -0.26 | -368 | -61 |
| Mar | 52 | 19.2% | -0.08 | -697 | -13 | 9 | 33.3% | +1.07 | +4,443 | +494 |
| Apr | 49 | 28.6% | +0.41 | +7,402 | +151 | 8 | 25.0% | +0.07 | -290 | -36 |
| May | 57 | 26.3% | +0.12 | +4,179 | +73 | 12 | 0.0% | -0.70 | -1,096 | -91 |
| Jun | 53 | 17.0% | -0.21 | -576 | -11 | 7 | 14.3% | -0.25 | -213 | -30 |
| Jul | 60 | 25.0% | +0.18 | +5,037 | +84 | 7 | 0.0% | -0.16 | -120 | -17 |
| Aug | 64 | 25.0% | +0.09 | +1,815 | +28 | 13 | 38.5% | +1.22 | +4,975 | +383 |
| Sep | 56 | 12.5% | -0.11 | -1,346 | -24 | 10 | 50.0% | +1.32 | +7,294 | +729 |
| Oct | 57 | 14.0% | -0.12 | +1,493 | +26 | 7 | 42.9% | +0.89 | +3,420 | +488 |
| Nov | 66 | 21.2% | -0.18 | -874 | -13 | 0 |  |  |  |  |
| Dec | 64 | 18.8% | -0.05 | +428 | +7 | 0 |  |  |  |  |


**Week of the month**

| Week of the month | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| wk1 | 145 | 14.5% | -0.17 | -1,782 | -12 | 23 | 39.1% | +0.80 | +7,183 | +312 |
| wk2 | 164 | 26.8% | +0.14 | +9,664 | +59 | 19 | 21.1% | +0.09 | +1,459 | +77 |
| wk3 | 165 | 21.8% | +0.06 | +3,144 | +19 | 18 | 16.7% | +0.10 | +3,600 | +200 |
| wk4 | 151 | 17.9% | -0.12 | -1,560 | -10 | 21 | 28.6% | +0.77 | +8,894 | +424 |
| wk5 | 54 | 27.8% | +0.29 | +6,912 | +128 | 8 | 12.5% | -0.20 | -649 | -81 |


**Month start / end (sessions)**

| Month start / end (sessions) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| first 2 | 59 | 13.6% | -0.16 | -1,136 | -19 | 10 | 40.0% | +0.82 | +4,275 | +428 |
| middle | 560 | 21.6% | +0.03 | +17,497 | +31 | 67 | 25.4% | +0.39 | +16,012 | +239 |
| last 2 | 60 | 23.3% | +0.02 | +18 | +0 | 12 | 16.7% | +0.20 | +200 | +17 |


**Turn of month (last session + first 3)**

| Turn of month (last session + first 3) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 127 | 17.3% | -0.12 | -1,582 | -12 | 18 | 27.8% | +0.27 | +3,248 | +180 |
| no | 552 | 21.9% | +0.04 | +17,961 | +33 | 71 | 25.4% | +0.44 | +17,239 | +243 |


**Holiday-shortened week**

| Holiday-shortened week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 126 | 20.6% | +0.04 | +1,877 | +15 | 14 | 21.4% | +0.18 | +1,742 | +124 |
| no | 553 | 21.2% | +0.01 | +14,502 | +26 | 75 | 26.7% | +0.45 | +18,746 | +250 |


**Half-day session (13:00 close)**

| Half-day session (13:00 close) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 21 | 19.0% | -0.37 | -70 | -3 | 1 | 0.0% | -0.23 | -92 | -92 |
| no | 658 | 21.1% | +0.02 | +16,449 | +25 | 88 | 26.1% | +0.42 | +20,580 | +234 |


**Day after a 3-day weekend**

| Day after a 3-day weekend | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 25 | 20.0% | +0.04 | +2,027 | +81 | 3 | 33.3% | +0.21 | +272 | +91 |
| no | 654 | 21.1% | +0.01 | +14,352 | +22 | 86 | 25.6% | +0.42 | +20,215 | +235 |


**OPEX (3rd Friday)**

| OPEX (3rd Friday) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 30 | 23.3% | +0.33 | +250 | +8 | 2 | 50.0% | +0.76 | +1,174 | +587 |
| no | 649 | 21.0% | -0.00 | +16,129 | +25 | 87 | 25.3% | +0.40 | +19,313 | +222 |


**OPEX week**

| OPEX week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 158 | 23.4% | +0.17 | +9,484 | +60 | 21 | 28.6% | +0.23 | +4,634 | +221 |
| no | 521 | 20.3% | -0.04 | +6,895 | +13 | 68 | 25.0% | +0.46 | +15,853 | +233 |


**Triple witching week**

| Triple witching week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 50 | 18.0% | +0.01 | +2,534 | +51 | 7 | 14.3% | +0.28 | +3,047 | +435 |
| no | 629 | 21.3% | +0.01 | +13,845 | +22 | 82 | 26.8% | +0.42 | +17,440 | +213 |


**Quarter-end week**

| Quarter-end week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 50 | 20.0% | -0.06 | -1,588 | -32 | 5 | 40.0% | +0.51 | +410 | +82 |
| no | 629 | 21.1% | +0.02 | +17,967 | +29 | 84 | 25.0% | +0.40 | +20,078 | +239 |


**FOMC decision day**

| FOMC decision day | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 18 | 11.1% | +0.21 | +1,758 | +98 | 2 | 0.0% | -1.02 | -601 | -300 |
| no | 661 | 21.3% | +0.01 | +14,621 | +22 | 87 | 26.4% | +0.44 | +21,088 | +242 |


**Day after FOMC**

| Day after FOMC | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 17 | 11.8% | -0.20 | -1,331 | -78 | 4 | 25.0% | +1.01 | +3,558 | +890 |
| no | 662 | 21.3% | +0.02 | +17,710 | +27 | 85 | 25.9% | +0.38 | +16,929 | +199 |


**CPI day (+ backfilled 2021-23)**

| CPI day (+ backfilled 2021-23) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 30 | 40.0% | +0.66 | +6,723 | +224 | 2 | 0.0% | -0.06 | -62 | -31 |
| no | 649 | 20.2% | -0.02 | +9,656 | +15 | 87 | 26.4% | +0.42 | +20,550 | +236 |


**Day after CPI (+ backfill)**

| Day after CPI (+ backfill) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 32 | 15.6% | -0.14 | -1,808 | -56 | 4 | 25.0% | -0.56 | -418 | -104 |
| no | 647 | 21.3% | +0.02 | +18,187 | +28 | 85 | 25.9% | +0.46 | +20,905 | +246 |


**NFP day (+ backfilled 2021-23)**

| NFP day (+ backfilled 2021-23) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 26 | 19.2% | +0.01 | -903 | -35 | 3 | 66.7% | +1.85 | +1,129 | +376 |
| no | 653 | 21.1% | +0.01 | +17,283 | +26 | 86 | 24.4% | +0.36 | +19,358 | +225 |


**Day after NFP (+ backfill)**

| Day after NFP (+ backfill) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 31 | 9.7% | -0.42 | -1,643 | -53 | 3 | 0.0% | -0.55 | -480 | -160 |
| no | 648 | 21.6% | +0.03 | +18,022 | +28 | 86 | 26.7% | +0.44 | +20,968 | +244 |


**PPI day (events.csv, from Oct 2023)**

| PPI day (events.csv, from Oct 2023) | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 15 | 26.7% | +0.36 | -434 | -29 | 3 | 0.0% | -0.68 | -334 | -112 |
| no | 664 | 20.9% | +0.00 | +16,813 | +25 | 86 | 26.7% | +0.45 | +20,822 | +242 |


**DST-change week**

| DST-change week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 29 | 27.6% | +0.17 | +3,084 | +106 | 2 | 50.0% | +2.48 | +1,529 | +764 |
| no | 650 | 20.8% | +0.01 | +13,296 | +20 | 87 | 25.3% | +0.36 | +18,958 | +218 |


**Contract roll week**

| Contract roll week | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 42 | 19.0% | +0.07 | +2,588 | +62 | 6 | 16.7% | +0.50 | +3,572 | +595 |
| no | 637 | 21.2% | +0.01 | +13,791 | +22 | 83 | 26.5% | +0.40 | +16,916 | +204 |


**Dec 20 - Jan 5**

| Dec 20 - Jan 5 | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 31 | 25.8% | +0.11 | -509 | -16 | 2 | 100.0% | +0.99 | +418 | +209 |
| no | 648 | 20.8% | +0.01 | +16,888 | +26 | 87 | 24.1% | +0.40 | +20,069 | +231 |


**July-August**

| July-August | 2021-25 trades | win % | avg R | net $ | $/trade | 2026 trades | win % | avg R | net $ | $/trade |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| yes | 124 | 25.0% | +0.13 | +6,851 | +55 | 20 | 25.0% | +0.74 | +4,855 | +243 |
| no | 555 | 20.2% | -0.01 | +9,528 | +17 | 69 | 26.1% | +0.32 | +15,632 | +227 |
