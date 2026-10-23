## What was done

The locked strategy's exact 5-year replay (768 trades, 1,278 sessions, costs and the live sizing included) was turned into one
line per trading day: that day's profit or loss and its worst open loss. Those days were then reshuffled thousands of times
into new 60-session histories, and a fresh MFFU Builder 50K eval ($3,000 target, $2,000 end-of-day trailing max loss checked
against the intraday low, locks at $50,100) was run on each one. 4,000 paths per case.

Three ways of reshuffling, from least to most realistic:

- **single days** (i.i.d.): every day drawn at random. No memory at all.
- **weekly blocks**: blocks of 5 consecutive sessions, so a bad week stays a bad week.
- **state-matched blocks**: 5-session blocks chained by the cold-streak state: the next block must start in the same state
  (quarter size or full size) the previous one ended in. This keeps the long cold streaks alive and makes it possible to
  start an eval "deep in a cold streak" or "just after one ended".

The trades keep the size they really had (the cold-streak quarter size and the late-entry half size are already in the day
P&L). Nothing uses information that was not known at the time. As a check, the same simulator run on the real, unshuffled
history reproduces the dashboard's eval numbers exactly (2 weeks 6.7% / 1.6%, 1 month 13.1% / 4.4%).

The fast-eval press (run `risk_fast_press1000`: $800 on any stop while the eval is less than $1,000 down, otherwise the live
sizing) was simulated the honest way: every trade was pre-sized twice (press / live) and the simulator picks the right one
from the simulated eval's own balance at the time.

## 1. One eval on the locked strategy (all 5 years as the pool)

| | 2 weeks pass / fail | 3 weeks | 4 weeks | 6 weeks | 60 sessions pass / fail / still open | median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|
| Real history (every session as a start, 1,278 starts) | 6.7% / 1.6% | 9.9% / 2.8% | 13.1% / 4.4% | 20.2% / 10.1% | 40.9% / 22.2% / 36.9% | 31 |
| Single days | 5.8% / 0.2% | 9.3% / 1.1% | 12.7% / 3.2% | 19.8% / 10.2% | 36.0% / 30.7% / 33.2% | 28 |
| Weekly blocks | 6.5% / 0.9% | 9.6% / 2.6% | 12.6% / 5.0% | 19.0% / 10.9% | 35.4% / 30.2% / 34.3% | 28 |
| State-matched blocks | 6.6% / 0.7% | 10.7% / 2.5% | 14.3% / 5.4% | 21.1% / 10.5% | 35.7% / 25.6% / 38.8% | 25 |

What this says in plain words:

- **Within 2 weeks almost nothing is decided**: about 7% pass, 1% fail. The owner's 2-week rule is not met by this sizing,
  and no reshuffling changes that. $3,000 is about four full winners at $800 risk.
- **Within a month** about 13% have passed and 3-5% have failed. The other 80%+ are still running.
- **Within 3 months (60 sessions)** roughly a third pass, a quarter to a third fail, and a third are still open.
- **Sessions to pass** (weekly blocks): a quarter of the passes come within 14 sessions, half within 28, three quarters within
  42, and 1 in 10 needs 52 or more. 73% of passes take longer than 3 weeks. Fails are slow too: the earliest fail is session 5,
  the median fail is session 36.
- **The reshuffled fail rate (30%) is higher than the real one (22%).** That is the cold-streak filter at work in the real
  history: after a few losses it cuts the size to a quarter, so losses rarely pile up at full size. Reshuffling single days or
  weeks breaks that feedback and lets full-size losers cluster. The state-matched version keeps part of it (26%). The honest
  range for "fails within 3 months" is 22-30%.

### Until a funded account (new eval the day after each pass or fail)

| pool | first eval passes | 2nd | 3rd | 4 or more | evals per funded account | weeks to funded: median / mean / 1 in 10 worse than | funded within 3 / 6 / 12 months | months of fees (mean) | fees at $153 a month (mean, 1 in 10 worse than) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| All 5 years | 53% | 24% | 12% | 11% | 1.91 | 15 / 21 / 46 | 42% / 70% / 92% | 5.5 | $837, $1,836 |
| All 5 years, state-matched | 49% | 25% | 13% | 13% | 2.07 | 17 / 24 / 54 | 41% / 65% / 88% | 6.2 | $941, $1,989 |
| 2026 only | 94% | 6% | 0% | 0% | 1.06 | 6 / 8 / 16 | 81% / 98% / 100% | 2.4 | $360, $612 |
| 2021-25 only | 37% | 24% | 16% | 24% | 2.63 | 22 / 30 / 64 | 28% / 56% / 83% | 7.6 | $1,169, $2,448 |

- "Evals per funded account" counts the passing one. The real back-to-back history gives 12 passed / 11 failed, i.e. 1.92,
  the same as the simulation.
- Fees assume the Builder 50K monthly subscription ($153 list; about $100 with the usual coupons, which cuts every $ figure by
  a third). Reset fees after a fail are not modelled; if there is one, add it for each failed eval (0.9 per funded account
  over 5 years, 1.6 on the 2021-25 pool).
- **2026 only is not a forecast.** It is one good year (89 trades, 206 sessions). The 2021-25 pool is the stress case:
  1 in 4 chains needs 4 or more evals, and 1 in 10 needs more than 64 weeks.

### Worst drawdown inside an eval (from the eval's high to its worst open loss)

| pool (weekly blocks) | all evals: median / 1 in 10 worse than / worst seen | evals that passed: median / worst survived | passes that came within $500 of failing |
|---|---:|---:|---:|
| All 5 years | $1,501 / $2,234 / $3,389 | $815 / $2,676 | 10% |
| 2026 only | $755 / $1,566 / $2,516 | $620 / $2,058 | 4% |
| 2021-25 only | $1,690 / $2,258 / $3,094 | $922 / $2,490 | 12% |

A drawdown above $2,000 is possible without failing because the trailing floor locks at $50,100: an eval that first ran up to
$53,000 can fall $2,900 before it is out. 1 in 10 passes was within $500 of the floor at some point before it passed.

## 2. 2026 pool vs 2021-25 pool

| | 2 weeks pass / fail | 1 month | 6 weeks | 60 sessions pass / fail / open | median sessions to pass |
|---|---:|---:|---:|---:|---:|
| 2026 real history (206 starts) | 20.4% / 0.0% | 34.0% / 0.0% | 42.2% / 0.0% | 63.1% / 0.0% / 36.9% | 18 |
| 2026 weekly blocks | 17.3% / 0.0% | 34.6% / 0.0% | 50.0% / 0.3% | 78.3% / 3.0% / 18.7% | 23 |
| 2026 state-matched | 16.7% / 0.0% | 33.4% / 0.2% | 47.2% / 0.7% | 68.7% / 2.7% / 28.6% | 21 |
| 2021-25 real history (1,072 starts) | 4.1% / 1.9% | 8.8% / 5.2% | 14.6% / 12.0% | 32.8% / 26.5% / 40.7% | 32.5 |
| 2021-25 weekly blocks | 3.5% / 1.2% | 8.1% / 7.0% | 12.4% / 14.5% | 23.9% / 37.7% / 38.4% | 29 |
| 2021-25 state-matched | 4.0% / 1.3% | 9.5% / 6.3% | 13.8% / 12.6% | 24.8% / 31.6% / 43.7% | 26 |

- In 2026 an eval practically cannot fail at this size (0-3%); the only question is how long it takes. The real history shows
  37% "still open" only because evals started in Aug-Oct 2026 run out of data before 60 sessions; the reshuffled paths fix
  that and give 69-78% passed within 3 months.
- In 2021-25 the eval is a coin flip that takes a long time: 24-33% pass, 27-38% fail, 40% still running after 3 months.
  In 2022 alone the filter was in its cold state 70% of the sessions.

## 3. Does it matter when the eval starts? Yes: the cold-streak state is the biggest single factor

The filter's state is known every day (it is on the dashboard and in every alert). Over 5 years the strategy was in a cold
streak 47% of all sessions (2022: 70%, 2023: 44%, 2024: 45%, 2025: 52%, 2026: 30%), in 25 stretches; the long ones lasted
93 sessions (Sep 2022 - Jan 2023), 82 (Nov 2023 - Mar 2024), 74 (Sep - Dec 2025), 72 (Apr - Jul 2022) and 62 (May - Aug 2026).

State-matched blocks, all-years pool, the eval starts on a session in the given state:

| state at the eval's first session | starts in history | 2 weeks pass / fail | 1 month | 6 weeks | 60 sessions pass / fail / open | median sessions to pass | weeks to funded (median) | funded within 3 months | months of fees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Full size (not cold) | 667 | 11.0% / 2.1% | 21.8% / 8.4% | 29.8% / 14.8% | 41.7% / 29.9% / 28.3% | 20 | 12.4 | 51% | 5.3 |
| Just warmed (first 3 sessions after a cold streak) | 65 | 13.1% / 1.1% | 21.8% / 8.2% | 28.8% / 15.1% | 40.5% / 30.6% / 28.9% | 19 | 13.8 | 48% | 5.8 |
| Cold streak | 607 | 0.8% / 0.1% | 4.3% / 1.6% | 9.3% / 4.5% | 23.8% / 21.5% / 54.7% | 36 | 22.2 | 27% | 7.5 |
| Deep in a cold streak (10+ sessions) | 456 | 0.8% / 0.1% | 4.4% / 1.5% | 9.3% / 4.4% | 24.1% / 21.1% / 54.8% | 36 | 22.3 | 27% | 7.5 |

The real, unshuffled history says the same: starts at full size passed 11.9% within 2 weeks and 21.8% within a month
(46.9% / 26.5% pass / fail within 60 sessions); starts in a cold streak passed 1.0% within 2 weeks and 3.6% within a month
(34.3% / 17.5% within 60). In 2021-25 alone: full size 16.4% / 10.2% pass / fail within a month vs cold 3.3% / 1.9%;
in 2026: 45.8% vs 7.2% within a month.

What it means:

- **An eval bought during a cold streak mostly buys waiting.** At quarter size it can neither reach $3,000 nor lose $2,000
  quickly: 1 in 25 passes within a month and more than half are still undecided after 3 months. On average it costs 2 more
  months of fees than an eval started at full size (7.5 vs 5.3 months) and gets funded 10 weeks later.
- **Starting at full size is where the 2-week and 1-month odds come from**: 11% within 2 weeks, 22% within a month, half of
  those chains funded within 3 months.
- **"Right after the streak ended" is not better than any other full-size start** in the simulation (the real history has it
  slightly better, 15.4% / 26.2% within 2 weeks / 1 month, but that rests on 65 overlapping starts from about 20 streak ends).
  The simple rule is enough: do not start or renew an eval while the filter shows the quarter size; wait for full size.
  This changes nothing about the trading (the bot keeps taking every setup); it only times the purchase.

## 4. The fast-eval press, simulated the same way

Press rule (run `risk_fast_press1000`, re-sized here on the evening lock): $800 at risk on any stop while the eval is less
than $1,000 down, the live sizing below that; cold quarter size and late-entry half size always.

| | 2 weeks pass / fail | 3 weeks | 1 month | 6 weeks | 60 sessions pass / fail / open | median sessions to pass | passes slower than 3 weeks |
|---|---:|---:|---:|---:|---:|---:|---:|
| Locked, all years, weekly blocks | 6.5% / 0.9% | 9.6% / 2.6% | 12.6% / 5.0% | 19.0% / 10.9% | 35.4% / 30.2% / 34.3% | 28 | 73% |
| **Press**, all years, weekly blocks | 12.0% / 3.6% | 17.4% / 9.3% | 22.3% / 15.4% | 30.2% / 27.4% | 42.0% / 49.6% / 8.3% | 19 | 59% |
| Press, all years, state-matched | 12.8% / 4.8% | 17.8% / 10.5% | 22.4% / 15.6% | 28.8% / 24.2% | 38.0% / 42.6% / 19.4% | 17 | 53% |
| Press, all years, real history | 12.6% / 5.8% | 17.2% / 12.1% | 21.7% / 16.5% | 27.3% / 25.3% | 36.9% / 42.3% / 20.7% | 17 | - |
| Press, 2026 only, weekly blocks | 25.1% / 0.2% | 37.0% / 1.1% | 46.4% / 2.9% | 60.6% / 7.6% | 78.5% / 15.7% / 5.8% | 17 | 53% |
| Press, 2021-25 only, weekly blocks | 8.6% / 4.9% | 13.1% / 11.5% | 17.1% / 18.4% | 22.8% / 32.5% | 31.9% / 56.8% / 11.3% | 19 | 59% |

| until funded (weekly blocks) | first eval passes | evals per funded account | weeks to funded: median / mean / 1 in 10 worse than | funded within 3 / 6 months | months of fees (mean) | fees at $153 (mean) | drawdown inside an eval: median / 1 in 10 worse than | passes within $500 of failing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Locked, all years | 53% | 1.91 | 15 / 21 / 46 | 42% / 70% | 5.5 | $837 | $1,501 / $2,234 | 10% |
| Press, all years | 45% | 2.19 | 10 / 14 / 30 | 61% / 85% | 3.7 | $566 | $2,004 / $2,410 | 19% |
| Locked, 2021-25 | 37% | 2.63 | 22 / 30 / 64 | 28% / 56% | 7.6 | $1,169 | $1,690 / $2,258 | 12% |
| Press, 2021-25 | 35% | 2.79 | 13 / 17 / 38 | 49% / 78% | 4.6 | $706 | $2,030 / $2,420 | 21% |
| Locked, 2026 | 94% | 1.06 | 6 / 8 / 16 | 81% / 98% | 2.4 | $360 | $755 / $1,566 | 4% |
| Press, 2026 | 81% | 1.22 | 4 / 6 / 13 | 89% / 99% | 2.0 | $299 | $1,200 / $2,129 | 16% |

- **The press decides evals, both ways.** Decided within 2 weeks: 16% instead of 7%; within a month 38% instead of 18%;
  only 8% still open after 3 months instead of 34%. But half of all evals fail within 3 months (50% vs 30%), and in
  2021-25 it is 57%.
- **It is faster and cheaper in fees, but burns more evals**: 2.19 evals per funded account instead of 1.91, for 3.7 instead
  of 5.5 months of subscription (about $270 less at list price) and a funded account in a median 10 weeks instead of 15.
  Unless a failed eval costs a reset fee of roughly $1,000 or more, the press is the cheaper road to a funded account.
- **It is rougher**: the typical eval sees a $2,000 drawdown (that is the whole allowance), and 1 in 5 passes came within
  $500 of failing.
- Money on the locked replay with the press, back-to-back evals (run `mc_press`): 2026 +$28,375 (PF 3.36, max DD -$3,415)
  vs the locked +$20,487 (PF 3.94, -$2,249); 2021-25 +$24,294 (PF 1.26, -$12,288) vs +$16,379 (PF 1.27, -$9,265).
  More money, same PF, a third more drawdown.
- The press does not help in a cold streak either: started cold, it passes 8% within a month and fails 7% (all years,
  state-matched); started at full size 34% / 23%. The quarter size still rules the cold stretches.
- Still not the owner's rule: 53-59% of the press's passes take longer than 3 weeks.

## 5. Honest limits

- **Reshuffling breaks the filter's feedback.** In the real history a losing run cuts the size after a few losses; in a
  reshuffled path full-size losers can land next to each other. Single-day and weekly reshuffles therefore overstate the
  fail risk (30% vs 22% real); the state-matched version is closer (26%). The real history itself is one path with heavily
  overlapping starts, and its late-2026 starts are cut off by the end of the data. Read the odds as ranges.
- **Sample sizes.** 2026 is 206 sessions and 89 trades, one unusually good year; "just warmed" is 65 overlapping starts; the
  2026 cold-streak starts are 62 sessions from one streak (May-Aug 2026, followed by the best stretch of the year, which is
  why the real history shows 74% of them passing while the simulation says 37%).
- **Fees** use the $153 monthly list price; coupons (about $100) cut every $ figure by a third; reset fees are not modelled.
  The soft $1,000 daily limit never binds at this size. The Builder eval has no consistency rule, so none was simulated.
- **The press numbers differ slightly from the stored run `risk_fast_press1000`** (2 weeks 12.6% / 5.8% here vs
  11.7% / 5.6% there) because that run was sized on the morning lock (breakeven at 1R every day); this study re-sizes the
  evening lock (breakeven at 3R on trending days).
- Paper results on TradingView CME NQ1! data. Past odds are not a promise.

## 6. What to do with it

1. **Expect a slow eval at the locked size**: median 28 sessions to pass, a third still open after 3 months, 1.9 evals and
   about 5.5 months of fees per funded account over 5 years (2.4 months if 2026 repeats, 7.6 if 2021-25 does).
2. **Buy or renew the eval when the filter shows full size, not during a cold streak.** This is the single biggest lever
   found: 1-month pass odds 22% vs 4%, about 2 months of fees saved per funded account, no change to the trading.
3. **The press is the choice for speed**, not for safety: median 10 weeks to funded and fewer months of fees, at the price of
   failing half of the evals and living at the edge of the $2,000 allowance. It stays OFF unless the owner wants that trade.

Data for the dashboard's 3D view: `research/lab/montecarlo.json` (300 example eval paths with mixed outcomes, the
sessions-to-pass and sessions-to-fail histograms, every case's odds, the cold-state tables and the press block).
Helper: `tools/research_mc.py` (`all`, `check`, `quick`).
