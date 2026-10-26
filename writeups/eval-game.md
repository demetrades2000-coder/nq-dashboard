## What was done

Everything here is read off the **locked strategy's exact 5-year replay** (run `baseline`: 768 trades, 1,278 sessions,
live sizing with the cold-streak quarter size and the late-entry half size, commissions and slippage included). No
trade was changed. The replay was turned into one line per trading day (profit or loss, worst open loss, trades) and
the prop-firm rules were run on top of it, a fresh eval started on **every** trading day.

- Eval rules from `engine/analytics.py` (`PLANS`, `simulate_eval`): $3,000 target, $2,000 trailing max loss checked
  against the worst open loss and locking at $50,100, plus each other firm's variations (lock, best-day rule).
- Two periods, always: **2026** (206 sessions) and **2021-25** (1,072 sessions), plus all 5 years.
- Nothing looks ahead: the cold-streak state at 09:30 is the shadow ledger's, "after a winning day" means yesterday.
- Script: `python tools/research_eval.py all` (13 seconds). Every table: `research/lab/eval_game.json`.

**Read the sample sizes first.** Evals started on consecutive days see the same trades, so 1,000 "starts" are not
1,000 independent evals:

| period | sessions | starts that pass | distinct sessions those passes land on | starts that fail | distinct fail sessions | passes that contain a single day of $3,000+ | days of $1,500+ | days of $3,000+ | biggest day | cold streaks that ended |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 206 | 155 | **9** | 43 | **5** | 90% | 7 | 3 | $3,932 | 1 |
| 2021-25 | 1,072 | 459 | **22** | 481 | **54** | 48% | 12 | 2 | $3,922 | 23 |
| all | 1,278 | 691 | 31 | 524 | 59 | 57% | 19 | 5 | $3,932 | 25 |

In 2026 every eval that passes does so on one of **9 days**, and 90% of the 2026 passes contain a single day worth
$3,000 or more (a 5R winner at $800 risk is about $4,000). The whole eval game of this strategy rests on about 20 big
days in 5 years. That is why the best-day rules below matter so much, and why 2026 numbers are one good year, not a
forecast.

## 1. Which 50K plan: MFFU Builder vs the $1.5k add-on vs the others

A fresh eval on every session, followed for up to 60 sessions ("2 weeks" = 10 sessions, "1 month" = 20, "3 months"
= 60). "Passes / fails a year" and "evals bought per pass" come from back-to-back chains (a new eval the session after
each pass or fail) started from 20 different first days. Fees: subscription plans pay every month the chain runs
(MFFU $153 list, about $100 couponed; Topstep $49 + $149 activation), one-time plans pay per eval. Reset fees after a
fail are **not** included; MFFU charges one, so every fail costs more than shown.

**2026**

| plan | 2 weeks pass / fail | 1 month | 3 months | median sessions to pass | passes / fails a year | evals bought per pass | median months to funded | fees per funded account |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| MFFU Builder 50K | 20.4% / 0.0% | 34.0% / 0.0% | 63.1% / 0.0% | 18 | 5.56 / 1.35 | 1.24 | 0.7 | $313 ($205) |
| MFFU Builder 50K (add-on, $1.5K MLL) | 20.4% / 0.0% | 34.0% / 0.0% | 63.1% / 20.9% | 18 | 5.56 / 1.43 | 1.26 | 0.7 | $256 |
| Topstep 50K Combine | 0.5% / 0.0% | 11.2% / 0.0% | 33.5% / 0.0% | 29 | 3.34 / 0.79 | 1.24 | 2.2 | $314 |
| Tradeify Select 50K | 0.0% / 0.0% | 3.4% / 0.0% | 29.1% / 0.0% | 31 | 2.31 / 0.64 | 1.28 | 5.7 | $211 |
| Tradeify Growth 50K | 20.4% / 0.0% | 34.0% / 0.0% | 63.1% / 0.0% | 18 | 5.56 / 1.35 | 1.24 | 0.7 | $180 |
| Lucid Flex 50K | 0.5% / 0.0% | 8.7% / 0.0% | 32.0% / 0.0% | 28 | 3.18 / 0.64 | 1.20 | 2.8 | $175 ($120) |
| Apex 50K EOD | 20.4% / 0.0% | 34.0% / 0.0% | 63.1% / 0.0% | 18 | 5.56 / 1.35 | 1.24 | 0.7 | $373 |

**2021-25**

| plan | 2 weeks pass / fail | 1 month | 3 months | median sessions to pass | passes / fails a year | evals bought per pass | median months to funded | fees per funded account |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| MFFU Builder 50K | 4.1% / 1.9% | 8.8% / 5.2% | 32.8% / 26.5% | 32 | 1.62 / 2.46 | 2.52 | 7.0 | $1,006 ($658) |
| MFFU Builder 50K (add-on, $1.5K MLL) | 4.1% / 4.9% | 7.5% / 14.8% | 19.0% / 50.9% | 30 | 1.62 / 4.38 | 3.70 | 7.0 | $822 |
| Topstep 50K Combine | 0.7% / 1.9% | 1.8% / 5.2% | 10.0% / 26.4% | 39 | 1.05 / 1.93 | 2.85 | 9.0 | $650 |
| Tradeify Select 50K | 0.1% / 1.9% | 1.0% / 5.2% | 3.8% / 26.7% | 26 | 0.50 / 1.39 | 3.76 | 17.0 | $459 |
| Tradeify Growth 50K | 4.1% / 1.9% | 8.8% / 5.2% | 32.8% / 26.5% | 32 | 1.62 / 2.46 | 2.52 | 7.0 | $342 |
| Lucid Flex 50K | 0.7% / 1.9% | 1.7% / 5.2% | 8.3% / 26.7% | 41 | 0.77 / 1.91 | 3.46 | 14.1 | $413 ($283) |
| Apex 50K EOD | 4.1% / 1.9% | 8.8% / 5.8% | 32.8% / 26.9% | 32 | 1.62 / 2.71 | 2.67 | 7.0 | $625 |

All 5 years, Builder 50K: 6.7% / 1.6% within 2 weeks, 13.1% / 4.4% within 1 month, 40.9% / 22.2% within 3 months,
2.04 evals bought per pass, median 6.1 months to a funded account, $840 of fees ($549 couponed). That matches the
Monte Carlo write-up ($837).

What it says:

- **The $1.5k add-on is a worse eval, not a cheaper one.** Same passes (the target is the same) but the smaller
  trailing loss fails 2021-25 evals twice as often within 3 months (50.9% vs 26.5%) and even fails 20.9% of 2026
  evals within 3 months, where the Builder fails none. 3.70 evals per pass against 2.52. It only looks cheaper per
  funded account because the monthly fee is lower and resets are not counted; with 2.7 fails per funded account at a
  reset fee each, it costs more. **Rejected.**
- **Tradeify Growth and Apex have the same eval maths as the Builder** (same target, trailing loss and lock). Growth
  is the cheapest per funded account ($180 / $342) because the fee is one-time; its payout cap is $1,250 and its
  rules need to be verified. Apex prohibits automation, so it is out.
- **Topstep, Lucid and Tradeify Select have a best-day rule in the eval** (best day at most 55% / 50% / 40% of the
  profit). For this strategy that is a wall: within 1 month they pass 1-2% of 2021-25 evals (Builder 8.8%) and take
  9-17 months to a funded account. Section 2 explains why.
- The Builder's own numbers are what the dashboard shows: no setting here changes the 2-week rule (20% in 2026, 4% in
  2021-25).

## 2. The best-day consistency rule ("best day at most X% of the profit")

MFFU's Builder plan does not apply it to the eval (`PLANS`: it applies 50% at payout, see section 6). This section
asks what it would do if it did, at the 50% level and at the other firms' 40% / 55%. Each start is followed for 120
sessions so a delayed pass can still show up.

| period | best day at most | passes without the rule | pass the same day | delayed | delay: median sessions | mean | 1 in 10 worse than | turn into a fail | still open after 120 sessions | passed within 1 month | within 3 months | median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 50% | 155 | 0.6% | 67.7% | 15 | 14.2 | 15 | 0.0% | 31.6% | 34.0% -> 8.7% | 63.1% -> 32.0% | 25 -> 48 |
| 2026 | 40% | 155 | 0.0% | 67.1% | 19 | 18.7 | 20 | 0.0% | 32.9% | 34.0% -> 3.4% | 63.1% -> 29.1% | 25 -> 52 |
| 2026 | 55% | 155 | 0.6% | 69.7% | 15 | 14.2 | 15 | 0.0% | 29.7% | 34.0% -> 11.2% | 63.1% -> 33.5% | 25 -> 47 |
| 2021-25 | 50% | 459 | 1.1% | 20.0% | 6 | 8.8 | 23 | 7.4% | 71.5% | 8.8% -> 1.7% | 32.8% -> 8.3% | 40 -> 44 |
| 2021-25 | 40% | 459 | 0.0% | 13.9% | 25 | 19.3 | 29 | 7.4% | 78.6% | 8.8% -> 1.0% | 32.8% -> 3.8% | 40 -> 54 |
| 2021-25 | 55% | 459 | 3.9% | 25.5% | 6 | 8.1 | 17 | 7.4% | 63.2% | 8.8% -> 1.8% | 32.8% -> 10.0% | 40 -> 44 |

| period | best day's share of the profit at the moment of the pass: median | 1 in 10 above |
|---|---:|---:|
| 2026 | 98.7% | 110.8% |
| 2021-25 | 74.1% | 101.7% |

- **Almost every pass is one big day.** At the moment an eval passes, the best single day is typically 74% (2021-25)
  to 99% (2026) of the profit; 1 in 10 passes has a best day bigger than the whole profit (the other days lost money).
- So a 50% rule **delays nearly every pass**: 68% of 2026 passes are pushed back (median 15 sessions, 3 weeks) and 32%
  are still not passed after 120 sessions; in 2021-25, 20% are delayed, 7% turn into fails while waiting and 72% never
  pass within 120 sessions. To clear a $3,900 day the account needs $7,800 of profit, and that takes months.
- Within 1 month the pass rate collapses: 34% -> 9% (2026), 8.8% -> 1.7% (2021-25).
- **This is a property of the strategy**, not of the rule: one trade a day, 5R banked at $800 risk, a 1-in-4 win
  rate. Any firm or plan with a best-day rule should be avoided unless the sizing is flattened (which the risk research
  showed costs money).

## 3. When to start an eval

A fresh Builder 50K eval on every session, grouped by what was known at 09:30 that day. 60-session horizon as on the
dashboard (starts in the last 3 months of a period are cut off by the data end and count as "still open", which
inflates that column in 2026).

**2026**

| eval started ... | starts | 2 weeks pass / fail | 1 month | 3 months | still open after 3 months | median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|
| every session | 206 | 20.4% / 0.0% | 34.0% / 0.0% | 63.1% / 0.0% | 36.9% | 18 |
| full size at the start (not in a cold streak) | 144 | 29.2% / 0.0% | 44.4% / 0.0% | 58.3% / 0.0% | 41.7% | 10 |
| in a cold streak at the start | 62 | 0.0% / 0.0% | 9.7% / 0.0% | 74.2% / 0.0% | 25.8% | 38 |
| cold streak ended within the last 5 sessions | 10 | 10.0% / 0.0% | 50.0% / 0.0% | 100.0% / 0.0% | 0.0% | 26 |
| cold streak ended 6-20 sessions ago | 30 | 40.0% / 0.0% | 56.7% / 0.0% | 100.0% / 0.0% | 0.0% | 14 |
| full size for 20+ sessions | 104 | 27.9% / 0.0% | 40.4% / 0.0% | 42.3% / 0.0% | 57.7% | 8 |
| after a winning day | 24 | 16.7% / 0.0% | 41.7% / 0.0% | 62.5% / 0.0% | 37.5% | 14 |
| after a losing day | 66 | 19.7% / 0.0% | 33.3% / 0.0% | 59.1% / 0.0% | 40.9% | 17 |
| after a day without a trade | 116 | 21.6% / 0.0% | 32.8% / 0.0% | 65.5% / 0.0% | 34.5% | 20 |
| after a winning week (last 5 sessions > 0) | 79 | 21.5% / 0.0% | 38.0% / 0.0% | 62.0% / 0.0% | 38.0% | 13 |
| after a losing week (last 5 sessions < 0) | 124 | 20.2% / 0.0% | 31.5% / 0.0% | 62.9% / 0.0% | 37.1% | 20 |
| first session of the week (Monday) | 41 | 19.5% / 0.0% | 34.1% / 0.0% | 65.9% / 0.0% | 34.1% | 19 |
| mid-week (Tue-Fri) | 165 | 20.6% / 0.0% | 33.9% / 0.0% | 62.4% / 0.0% | 37.6% | 18 |
| first session of the month | 10 | 20.0% / 0.0% | 40.0% / 0.0% | 70.0% / 0.0% | 30.0% | 19 |

**2021-25**

| eval started ... | starts | 2 weeks pass / fail | 1 month | 3 months | still open after 3 months | passes among decided | median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|---:|
| every session | 1,072 | 4.1% / 1.9% | 8.8% / 5.2% | 32.8% / 26.5% | 40.7% | 55% | 32 |
| full size at the start (not in a cold streak) | 527 | 7.2% / 3.8% | 15.6% / 9.5% | 43.8% / 33.8% | 22.4% | 56% | 29 |
| in a cold streak at the start | 545 | 1.1% / 0.0% | 2.2% / 1.1% | 22.2% / 19.4% | 58.3% | 53% | 36 |
| **cold streak ended within the last 5 sessions** | 88 | **14.8% / 0.0%** | **26.1% / 4.5%** | **56.8% / 20.5%** | 22.7% | **74%** | 21 |
| cold streak ended 6-20 sessions ago | 160 | 6.9% / 1.9% | 23.1% / 8.8% | 45.6% / 29.4% | 25.0% | 61% | 20 |
| full size for 20+ sessions | 259 | 5.0% / 6.6% | 6.9% / 12.4% | 34.0% / 43.6% | 22.4% | 44% | 46 |
| after a winning day | 142 | 4.9% / 4.2% | 8.5% / 11.3% | 39.4% / 31.7% | 28.9% | 55% | 33 |
| after a losing day | 536 | 4.7% / 1.9% | 9.7% / 5.0% | 33.0% / 26.5% | 40.5% | 56% | 32 |
| after a day without a trade | 393 | 3.1% / 1.0% | 7.4% / 3.3% | 30.0% / 24.7% | 45.3% | 55% | 33 |
| after a winning week (last 5 sessions > 0) | 348 | 4.6% / 3.7% | 10.9% / 9.8% | 38.5% / 34.5% | 27.0% | 53% | 30 |
| after a losing week (last 5 sessions < 0) | 702 | 3.8% / 1.0% | 7.7% / 3.1% | 29.6% / 23.1% | 47.3% | 56% | 34 |
| first session of the week | 217 | 4.1% / 1.4% | 9.2% / 4.6% | 32.7% / 25.8% | 41.5% | 56% | 32 |
| a Monday | 213 | 4.2% / 1.4% | 9.4% / 4.7% | 33.3% / 25.4% | 41.3% | 57% | 32 |
| mid-week (Tue-Fri) | 855 | 4.1% / 2.0% | 8.7% / 5.4% | 32.9% / 26.7% | 40.5% | 55% | 33 |
| first session of the month | 50 | 4.0% / 2.0% | 8.0% / 8.0% | 32.0% / 30.0% | 38.0% | 52% | 30 |

- **The one thing that matters is the cold-streak filter.** Do not start an eval while the filter is at quarter
  size: in a cold streak the account trades 1 micro and gets nowhere (1-month pass 2.2% in 2021-25, 9.7% in 2026). The
  best moment is **right after the filter switches back to full size**: evals started within 5 sessions of the switch
  pass within a month 26% of the time in 2021-25 (vs 8.8% overall) and 50% in 2026 (vs 34%), fail less (4.5% vs 5.2%),
  and 74% of the decided ones are passes (vs 55%). 6-20 sessions after the switch is still good (23% / 57%).
- The sample is thin: 23 cold streaks ended in 2021-25 and 1 in 2026, so "within 5 sessions" is 88 and 10 starts
  that cluster around about 24 moments. Read it as "clearly better odds", not as a guarantee. It makes sense: the
  filter switches back after a few winners at 1 micro, which is when the strategy's good stretches begin, and the
  reverse holds too: **after 20+ sessions at full size the next cold streak is near** (2021-25: 6.9% pass / 12.4%
  fail within a month, the worst row).
- **Day of the week, month start, yesterday's or last week's result: nothing worth acting on.** Monday vs mid-week,
  month start vs not, winning vs losing day all stay within 1-2 points of the overall numbers in both periods. "After
  a winning day / week" fails a little more often in 2021-25 (11.3% / 9.8% within a month vs 5.2%): the good days
  come in clusters and the cluster is often already over.
- The bot already knows the filter state (`data/shadow_ledger.json`; the dashboard shows "0.25x SIZE"). The practical
  rule: **buy or reset the eval on the first full-size day after a cold streak**, and if an eval has to sit through a
  cold streak, expect it to tread water rather than fail (fails in a cold streak within a month: 1.1% / 0%).

## 4. Two evals at once on independent accounts (same trades)

Two Builder 50K accounts trading the same signals at the same size. The second one is started 0, 5, 10 or 20 sessions
after the first; each account runs back-to-back evals (a new one after each pass or fail). "First funded" is the first
pass on either account. Fees count both subscriptions until that moment.

| period | set-up | sessions to the first funded account: median | months | mean | 1 in 10 worse than | funded within 3 months | within 6 months | months of fees paid (mean) | fees at $153 a month | both accounts funded within 3 months of each other |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | one account at a time | 36 | 1.7 | 47 | 108 | 64.6% | 95.1% | 2.2 | $345 | - |
| 2026 | two accounts, same start day | 36 | 1.7 | 47 | 108 | 64.6% | 95.1% | 4.5 | $689 | 96.1% |
| 2026 | second account 10 sessions later | 36 | 1.7 | 47 | 108 | 64.6% | 95.1% | 4.0 | $618 | 86.4% |
| 2026 | second account 20 sessions later | 36 | 1.7 | 47 | 108 | 64.6% | 95.1% | 3.7 | $568 | 76.7% |
| 2021-25 | one account at a time | 90 | 4.3 | 109 | 246 | 34.9% | 58.5% | 5.2 | $795 | - |
| 2021-25 | two accounts, same start day | 90 | 4.3 | 109 | 246 | 34.9% | 58.5% | 10.4 | $1,591 | 89.5% |
| 2021-25 | second account 5 sessions later | 88 | 4.2 | 107 | 242 | 35.4% | 59.1% | 10.0 | $1,527 | 85.8% |
| 2021-25 | second account 10 sessions later | 88 | 4.2 | 107 | 240 | 35.2% | 59.0% | 9.7 | $1,491 | 83.6% |
| 2021-25 | second account 20 sessions later | 89 | 4.2 | 108 | 242 | 35.0% | 58.9% | 9.4 | $1,433 | 79.2% |
| all | one account at a time | 80 | 3.8 | 98 | 215 | 43.1% | 71.0% | 4.7 | $711 | - |
| all | second account 10 sessions later | 76 | 3.6 | 96 | 209 | 43.6% | 71.9% | 8.7 | $1,323 | 92.9% |

- **Same trades, same result.** Two accounts started the same day pass and fail together; that buys nothing but a
  second bill. Staggering the second start by 5-20 sessions moves the median time to the first funded account from 90
  to 88 sessions in 2021-25 and not at all in 2026, for about twice the fees ($795 -> $1,491 in 2021-25).
- **The real use of a second account is two funded accounts, not a faster one.** In 80-90% of cases both accounts
  are funded within 3 months of each other, so the second account roughly doubles the payout capacity (section 6) for
  a second fee. Whether MFFU allows the same signals on two of the owner's accounts has to be checked with them.
- A second account only speeds things up if it trades **differently**: for example the fast press on one account and
  the live sizing on the other (`risk-summary.md`). That was not part of this study.

## 5. After a fail, how long until the next pass

Every start whose eval eventually fails (followed to the end of the data, so late fails count), then back-to-back
evals from the day after the fail until the first pass.

| period | starts | of which failed | fail share | median sessions to the fail | sessions from the fail to the next pass: median | months | mean | months | 1 in 10 worse than | next pass within 3 months | evals bought after the fail (mean) | the very next eval passes | no pass before the data ends |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 206 | 43 | 20.9% | 77 | 33 | 1.6 | 31 | 1.5 | 43 | 100% | 1.00 | 100% | 0.0% |
| 2021-25 | 1,072 | 529 | 49.3% | 57 | 70 | 3.3 | 105 | 5.0 | 225 | 42.4% | 1.99 | 41.8% | 6.8% |
| all | 1,278 | 572 | 44.8% | 61 | 69 | 3.3 | 99 | 4.7 | 225 | 45.1% | 1.85 | 49.8% | 0.0% |

- **2021-25 (the honest case):** half of all starts fail if left to run (median after 57 sessions, nearly 3 months).
  From the fail, the next pass takes a **median 70 sessions (3.3 months), mean 105 (5 months)**, and 1 in 10 waits
  more than 225 sessions (almost a year). It takes 2 more evals on average; the very next eval passes 42% of the time.
  7% of fails never saw a pass before the data ended.
- **2026:** the 43 "failed" starts are one episode (evals started in spring that drifted for 77 sessions and failed
  in late summer, landing on 5 distinct sessions); every one of them passed the next eval, median 33 sessions later.
  One episode is not a statistic.
- A fail lands in or just before a cold streak: of the 55 distinct 2021-25 fail sessions, 35 are inside a cold
  streak and 15 more are within 10 sessions of one starting; only 5 are not. Together with section 3, the new eval
  should not be started the next morning by reflex; wait for the filter to be back at full size.

## 6. The payout path after funding

The funded Builder 50K as in `PLANS`: balance starts at 0, the $2,000 trailing max loss keeps applying (checked against
the worst open loss, locks at +$100), payouts need a **$2,100 buffer**, are between **$500 and $2,000**, need 2
winning days, pay the trader **80%**, and (as `PLANS` has it) the **best day must be at most 50% of the profit since
the last payout**. The funded stage is started on every session and followed for 12 months (shorter where the data
ends). Because the 50% rule is the kind of rule firms change, the table shows the path with and without it.

| period | payout rule | net per month (eval account) | months to a $2,000 payout at that pace (arithmetic) | accounts that reach a first payout | months to it (median) | within 3 / 6 months | first payout (median $) | first payout is the $2,000 maximum | $2,000 in the trader's pocket | months (median) | within 6 / 12 months | blown before any payout | months to the blow-up (median) | still waiting at the data end |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | with the 50% best-day rule | $2,088 | 2.0 | 71.8% | 3.3 | 33.5% / 51.5% | $2,000 | 100% | 61.7% | 4.4 | 41.3% / 61.7% | 20.9% | 3.7 | 7.3% |
| 2026 | without it | $2,088 | 2.0 | 75.2% | 1.3 | 64.6% / 75.2% | $2,000 | 51% | 70.4% | 2.3 | 59.2% / 70.4% | 20.9% | 3.7 | 3.9% |
| 2021-25 | with the 50% best-day rule | $321 | 12.8 | 21.1% | 7.7 | 8.8% / 9.2% | $2,000 | 92% | 4.9% | 5.4 | 3.6% / 4.9% | 57.7% | 3.1 | 21.2% |
| 2021-25 | without it | $321 | 12.8 | 44.3% | 1.7 | 34.3% / 44.2% | $1,693 | 40% | 29.7% | 3.0 | 28.8% / 29.7% | 48.5% | 2.7 | 7.2% |
| all | with the 50% best-day rule | $606 | 6.8 | 39.0% | 7.7 | 12.8% / 16.0% | $2,000 | 96% | 18.9% | 5.9 | 9.7% / 18.9% | 51.8% | 3.2 | 9.2% |
| all | without it | $606 | 6.8 | 55.3% | 1.7 | 42.9% / 55.2% | $1,764 | 41% | 42.3% | 3.0 | 38.7% / 42.3% | 44.1% | 2.9 | 0.6% |

Cash actually paid to the trader (starts with a full 6 / 12 months of data after them):

| period | payout rule | starts with 6 months of data | cash in 6 months: median | mean | nothing paid in 6 months | starts with 12 months of data | cash in 12 months: median | mean | payouts in 12 months (mean) | nothing paid in 12 months |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | with the 50% best-day rule | 81 | $0 | $0 | 100% | 0 | - | - | - | - |
| 2026 | without it | 81 | $1,479 | $1,029 | 48% | 0 | - | - | - | - |
| 2021-25 | with the 50% best-day rule | 947 | $0 | $226 | 90% | 821 | $0 | $535 | 0.34 | 73% |
| 2021-25 | without it | 947 | $0 | $1,437 | 51% | 821 | $405 | $1,637 | 1.56 | 50% |
| all | with the 50% best-day rule | 1,153 | $0 | $186 | 91% | 1,027 | $0 | $578 | 0.37 | 70% |
| all | without it | 1,153 | $703 | $1,423 | 49% | 1,027 | $0 | $1,611 | 1.47 | 51% |

How much of the wait is the 50% rule: it delays the first payout for 72% of 2026 starts (median 15 sessions, mean 47)
and 21% of 2021-25 starts (median 148 sessions), and blocks it for the whole year for another 14% of 2021-25 starts.

- **At this strategy's pace, the first $2,000 payout is 2 months away in a 2026-like year and about a year away in a
  2021-25-like stretch** (arithmetic: $2,100 buffer + $2,000 at $2,088 / $321 a month). The simulation agrees on the
  shape but is slower, because the buffer must be reached without touching the trailing loss first.
- **Without the 50% rule** a funded account pays out for the first time after a median 1.3 months (2026) / 1.7 months
  (2021-25) and has $2,000 in the trader's pocket after 2.3 / 3.0 months, in 70% / 30% of cases.
- **With the 50% rule** the first payout takes 3.3 / 7.7 months and is almost always the $2,000 maximum (100% / 92%), because by the time a
  $3,900 day is only half of the profit the account holds far more than the buffer. Over 2021-25 only 5% of funded
  accounts put $2,000 in the trader's pocket within the data, and 73% paid nothing in 12 months. Whether MFFU applies
  this rule to Builder payouts, and whether it resets after each payout, decides most of this section: **confirm it on
  the MFFU site before planning on payouts.**
- **The trailing loss does not stop at funding.** 21% (2026) / 58% (2021-25) of funded accounts hit the $2,000
  trailing loss before any payout, typically after 3 months. Funded, the strategy plays the same game as in the eval
  but without a finish line, so over a long stretch most accounts end that way unless a payout comes first. A payout
  does protect the money already taken out: that is why the first payout should be requested as soon as the rules
  allow, not saved up.
- Fees and payouts together, 2021-25 pace: about $1,006 of eval fees per funded account (section 1) against a mean
  $535 paid out in the first funded year with the 50% rule ($1,637 without it). 2026 pace: $313 of fees against a
  $2,000 payout within 3-4 months. The business case rests on 2026-like years.

## Caveats

- Everything is one history replayed, not independent trials: 2026 passes land on 9 sessions, 2021-25 on 22; 23 cold
  streaks ended in 2021-25 and 1 in 2026.
- Plan rules are `engine/analytics.PLANS` as researched in Oct 2026; prices are approximate, reset fees are not
  included, the $1,000 soft daily limit is never reached (worst day -$875) and so is not simulated. Verify every rule
  on the firm's site before buying.
- "Months" are 21 sessions; a 12-month horizon on the 2026 data is impossible (206 sessions), so 2026 payout numbers
  are 6-month numbers for starts in Jan-Apr.
- The "two accounts" section assumes identical fills on both accounts.

## Next ideas

1. Code the start-timing rule into the dashboard and the alerts: "filter back at full size since N sessions" as a
   green light for buying or resetting an eval, and a red one during a cold streak.
2. Two accounts with **different** sizing (fast press on one, live on the other), started together: time to the first
   funded account and the cost, with the press's own fail rate.
3. A payout-aware funded mode: once funded, request the first payout at the minimum $500 the day the buffer allows,
   and size down to 1 micro when the account is within $500 of the trailing loss (the eval-sizing research rejected
   this for evals because it stalls passes; funded there is no pass to stall, only a blow-up to avoid).
