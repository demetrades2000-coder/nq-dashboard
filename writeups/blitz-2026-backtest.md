## Money first

**BLITZ made money in every month of 2026 but April (flat), but most of the eval / funded money came from one good funded
account.** On its own 25K, the real calendar from Jan 2 would have cost $126 in evals and paid about $2,078 by Oct 16. Started
on Jul 1 instead, it would have paid nothing yet. Over 5 years (2021-25) the same rule about breaks even.

## The trades (fixed $150 risk a trade, costs in)

| Period | Trades | / week | Weeks with 2+ | Win % | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 (Jan 2 - Oct 16) | 323 | 7.8 | 86% | 56.7 | 1.67 | +$8,351 | **+$851** | -$1,152 |
| 2026 Jan-Jun | 217 | 8.5 | 89% | 56.7 | 1.70 | +$5,873 | +$963 | -$1,152 |
| 2026 Jul-Oct 16 | 106 | 6.8 | 75% | 56.6 | 1.62 | +$2,478 | +$667 | -$815 |
| 2021-25 (5m) | 1,841 | 8.6 | 80% | 50.1 | 1.05 | +$3,765 | +$73 | -$5,512 |

2026 by month (net at $150 a trade): Jan +$574 (9 trades), Feb +$1,199 (45), Mar +$489 (36), Apr $0 (30), May +$283 (53),
Jun +$3,327 (44), Jul +$176 (29), Aug +$398 (20), Sep +$607 (36), Oct to the 16th +$1,297 (21). June alone is 40% of the year.

## The 25K eval (MFFU Builder 25K: $63, +$1,500 target, $1,000 EOD trailing floor locked at start + $100, $600 soft daily loss)

Live eval size (engine/account_c SIZE_EVAL "speed"): 40% of the room to the floor, at most $600 a trade, the full room from
session 5. "Stuck" = room under 2 x the median stop-out: the bot stops and says "buy a new one". A new eval on every session:

| Period | Pass in 2 weeks | Fail in 2 weeks | Decided in 2 weeks | Pass in a month | Fail in a month | Median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|
| 2026 | 34.5% | 34.0% | 68.5% | 45.5% | 51.9% | 6 |
| 2026 Jan-Jun | 36.1% | 37.8% | 73.9% | 48.6% | 49.5% | 6 |
| 2026 Jul-Oct | 36.2% | 34.8% | 71.0% | 27.1% | 72.9% | 5 |
| 2021-25 | 20.4% | 50.2% | 70.6% | 25.3% | 70.8% | 6 |

(The month columns use only starts with 20 sessions of data left, so they can read lower than the 2-week ones.)

## The real calendar: one 25K slot from the first session

Buy the eval -> BLITZ trades it -> pass -> 2 sessions of MFFU paperwork -> funded 25K at 10% of the room (at most $150 a trade,
no new trade after +$400 on the day) -> payouts (balance - $1,100 buffer, $250-$1,000, 80% to the owner, 2 traded days a cycle,
50% best-day rule) -> lost / stuck / 5 payouts -> buy the next eval at once. A fail or stuck eval buys the next one at once.

From 2026-01-02:

| # | Account | Start | End | Sessions | Trades | Profit | Paid to you | Result |
|---:|---|---|---|---:|---:|---:|---:|---|
| 1 | Eval #1 | Jan 2 | Feb 2 | 22 | 10 | +$1,711 | | Passed |
| 2 | Funded #1 | Feb 5 | Mar 23 | 33 | | -$290 | $0 | Stuck near the floor |
| 3 | Eval #2 | Mar 24 | Mar 30 | 5 | 9 | +$1,896 | | Passed |
| 4 | Funded #2 | Apr 2 | Oct 16 | 142 | | +$4,520 | $2,078 (3 payouts) | Still open, +$1,923 in it |

Totals: 2 evals ($126), 2 passed, 0 failed, 3 payouts, **$2,078 paid to you, net +$1,952 (~$199 a month)**.

| Started on | Evals bought | Passed | Failed / stuck | Payouts | Paid to you | Net after fees | $ / month |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2026-01-02 | 2 | 2 | 0 | 3 | $2,078 | +$1,952 | +$199 |
| 2026-01-02, to Jun 30 | 2 | 2 | 0 | 2 | $1,278 | +$1,152 | +$189 |
| 2026-07-01 | 3 | 1 | 2 | 0 | $0 | -$189 | -$51 |
| 2021-11-01 (to 2025) | 24 | 6 | 18 | 3 | $1,835 | +$323 | +$6 |

One calendar is one draw of luck. The 6-month Monte Carlo slot (1,000 paths in 5-session blocks, tools/blitz25k_size.life)
is the fairer expectation: **$270 a month in 2026 H1, $37 in H2, -$40 in 2021-25** (chance a 6-month slot loses money 9% / 52%
/ 88%; 2.6 / 3.2 / 5.1 evals bought per 6 months).

## What it means

- The trades themselves are strong in 2026 in both halves (PF 1.62-1.70, every month but April positive) and weak before
  (2021-25 PF 1.05): BLITZ is a bet that the 2026 market keeps going.
- The money on the 25K comes from staying funded long enough to get paid: funded #1 drifted under its floor without a payout,
  funded #2 paid three times. The funded 25K's $1,000 trailing room is only about 8 losses at one micro.
- The eval at the live size is decided fast (69% within 2 weeks, median 6 sessions to pass), about as many fail as pass.
- Nothing here changes the rule or a switch. The later-break eval size (blitz_25k_pick_v2.json, OFF) is still the one sizing
  change waiting for the owner's OK.

## Method

`python -X utf8 tools/blitz_2026_backtest.py` -> research/scalp/blitz_2026_backtest.json + run `blitz_2026_backtest`.
Trades = tools/blitz25k_lib.trades(today's rule, "lit+atlas") (= engine/blitz.py v2, checked equal in blitz-25k.md), fills:
market at the next open + 1 tick, stop - 1 tick or the gapped open, same-bar tie = loss, $1.90 a micro. Eval / funded = the
research simulators the live sizes were picked with (tools/blitz25k_size.Eval, tools/scalp_na_lib.Funded). Data: TradingView
CME NQ1! 1m (2026) and 5m (2021-25).
