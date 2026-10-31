## The question

The MFFU Builder 50K eval has three rules:
- pass at **+$3,000**
- fail if the balance touches the **trailing max loss**: $2,000 below the best end-of-day balance, checked during the day against the worst open loss, and locking at $50,100
- a soft **$1,000 daily limit**

Can the bot size each trade from where the eval stands, instead of the same way every time? The inputs are:
- the cushion above the trailing max loss
- the profit so far
- what is still needed to reach the target

The goal is to pass more evals and fail fewer.

## How it was tested

- **Simulator:** a new eval simulator that copies the dashboard's MFFU rules exactly, including the soft daily limit.
  - With fixed sizing it gives the same pass/fail numbers as the dashboard for every period.
  - Each trade is sized from **that eval's own balance and floor at entry**, separately for every start day.
- **Same trades as the live strategy:** the exact live-loop replay, costs included, the cold-streak half size kept.
- **Each eval rule is applied** to the $ risk before it is turned into micros. Two limits:
  - a setup the engine takes always gets at least 1 micro
  - no setup is ever skipped
- **Measured:**
  - pass / fail within 2 weeks, 1 month and 3 months, for an eval started on every trading day and followed for up to 60 sessions (the dashboard's definition, `tools/runlib.py`)
  - back-to-back evals, a new one after each pass or fail, started from 20 different first days and averaged: passes and fails per year
  - **evals bought per pass**: what each funded account costs in eval fees

## Results

| run | rule | 2026 2w pass/fail % | 1m | 3m | passes / fails a year | 2021-25 2w pass/fail % | 1m | 3m | still open after 3m | median sessions to pass | passes / fails a year | evals bought per pass |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| baseline | Live sizing | 19/0 | 33/0 | 63/14 | 5.5/1.4 | 4.1/2.1 | 8.7/9.4 | 20/56 | 24% | 25 | 1.5/4.3 | 3.89 |
| risk_eval_cap50 | Never risk more than half the cushion | 19/0 | 33/0 | 62/0 | 5.4/1.4 | 4.0/0.0 | 7.5/0.8 | 22/23 | 55% | 32 | 1.25/2.2 | 2.75 |
| risk_eval_cap100 | Never risk more than the whole cushion | 19/0 | 33/0 | 63/12 | 5.5/1.4 | 4.1/1.7 | 8.9/5.8 | 26/41 | 33% | 30 | 1.0/3.1 | 4.09 |
| risk_eval_prop1000 | Size down once the cushion is under $1,000 | 19/0 | 33/0 | 63/5 | 5.5/1.4 | 4.1/0.1 | 8.1/2.1 | 26/31 | 43% | 32 | 1.25/2.4 | 2.89 |
| risk_eval_prop1500 | Size down once the cushion is under $1,500 | 19/0 | 33/0 | 62/0 | 4.9/0.9 | 3.9/0.0 | 7.0/0.3 | 21/18 | 60% | 30 | 0.7/2.1 | 3.88 |
| risk_eval_prop1000_qty | Same as prop1000, applied to the routed micros | 19/0 | 33/0 | 63/0 | 5.4/1.3 | 4.1/0.1 | 7.7/1.4 | 25/29 | 46% | 31.5 | 1.25/2.4 | 2.89 |
| risk_eval_bank | Bank the pass: from +$2,000, risk at most half of what is still needed | 17/0 | 30/0 | 60/14 | 5.5/1.4 | 4.0/2.1 | 8.1/9.1 | 20/56 | 24% | 26 | 1.5/4.1 | 3.73 |
| risk_eval_presslock | x1.5 once the floor has locked at $50,100 | 19/0 | 33/0 | 63/14 | 5.5/1.4 | 4.1/2.1 | 8.9/10.4 | 21/57 | 22% | 24 | 1.5/4.5 | 3.98 |
| risk_eval_pressup | x1.25 while the eval is in profit | 22/0 | 36/0 | 63/16 | 7.2/1.4 | 4.7/3.1 | 9.2/12.9 | 19/60 | 21% | 21 | 1.8/5.0 | 3.76 |
| risk_eval_defend | x0.67 while the eval is below $50,000 | 12/0 | 26/0 | 59/2 | 5.5/0.9 | 3.2/0.3 | 6.8/3.5 | 22/29 | 48% | 33 | 0.7/2.5 | 4.42 |
| risk_eval_prop1000_usd1000 | Risk $1,000 + size down under a $1,000 cushion | 23/0 | 38/0 | 63/12 | 7.2/1.4 | 4.9/2.7 | 9.1/8.2 | 26/42 | 32% | 28 | 0.8/3.3 | 5.08 |
| risk_eval_prop1000_usd1200 | Risk $1,200 + size down under a $1,000 cushion | 27/0 | 45/0 | 62/18 | 6.9/1.4 | 5.4/5.1 | 10.2/16.0 | 18/60 | 22% | 18 | 1.55/5.4 | 4.48 |
| risk_usd600 | Risk $600 (engine replay) | 9/0 | 25/0 | 53/0 | 5.3/0.0 | 1.8/0.6 | 4.1/1.5 | 17/33 | 50% | 35 | 0.7/2.3 | 4.07 |
| risk_usd1000 | Risk $1,000 (engine replay) | 23/0 | 38/0 | 63/23 | 7.3/1.4 | 5.0/6.4 | 8.5/20.5 | 17/70 | 13% | 20.5 | 2.2/6.5 | 3.92 |
| **risk_pkg_q25_late_live** | **Recommended: cold streak x0.25, late entry x0.5** | 20/0 | 34/0 | 63/0 | 5.6/0.9 | 4.0/1.9 | 8.6/5.1 | 29/27 | 44% | 31 | 1.5/2.5 | **2.63** |

2026 has only 198 sessions, so its 3-month and per-year numbers rest on few evals. Read 2021-25 first.

## What it means

**Protecting the cushion works against fails.** Examples are "never risk more than half the cushion" and "size down once the cushion is under $1,000".
- In 2021-25 the 1-month fail rate falls from 9.4% to 0.3-2%, and 3-month fails from 56% to 18-31%.
- 2026 3-month fails fall from 14% to 0-5%.
- The 2-week and 1-month pass rates barely move.

**It does not create passes.** The evals that would have failed do not pass instead: they get stuck.
- The account trades 1 micro just above the floor for months.
- 43-60% of evals are still open after 3 months, against 24% today.
- The median sessions to pass go from 25 to 30-32.
- Back-to-back, it passes fewer evals a year (1.25 or less vs 1.5).

**The result depends on the exact threshold.** With the quarter cold size, the evals bought per pass for each cushion threshold are:

| threshold | evals bought per pass |
|---|---:|
| $500 | 3.45 |
| $750 | 3.37 |
| $1,000 | 2.47 |
| $1,250 | 2.87 |
| $1,500 | 3.22 |

Only one setting is better than no cushion rule (2.91), so it is not reliable.

**Bank the pass and press after the lock change almost nothing.** The bot's typical risk ($213-239) is already small next to what is still needed when the eval is close. Few evals reach the lock without passing.

**More risk makes evals faster, not cheaper.**
- At $1,000 the bot passes 38% of evals within a month in 2026, against 33%.
- In 2021-25 it fails 20.5% within a month, against 9.4%.
- Per pass it costs the same number of evals: 3.92 vs 3.89.
- Less risk ($600) is slower, drops 2026 to 2.09 setups a week, and costs more evals per pass (4.07). At $400 it is 1.99 a week.

**The edge decides the eval, not the eval rule.** The recommended change (risk-summary.md) improves the evals more than any eval-state rule:
- 2.63 evals per pass in 2021-25, against 3.89
- same passes a year
- 1-month fails 5.1%, against 9.4%
- 3-month fails 0% in 2026

It does this by cutting the trades that lose (cold streaks, late entries), not by watching the account.

## Verdict

- **Rejected for now.** No eval-state rule beats fixed sizing in both periods once passes, fails and time are all counted.
- **Speed instead of safety:** for the owner's new rule (an eval decided within 2 weeks), the useful lever is the opposite one: drop the wide-stop scaling while the eval is healthy. See "Faster evals" in risk-summary.md (run `risk_fast_press1000`).
- **Not ruled out later.** If MFFU evals have no time limit and no monthly fee, "size down once the cushion is under $1,000" is worth a second look. It turns many fails into slow evals that are still alive. It only needs the account balance and the best end-of-day balance, so it would fit the Pine script.
