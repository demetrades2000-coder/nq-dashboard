## Money first

The owner's stack, 12 months, $ a month **to you** net of every eval bought (failed / lost / finished accounts bought again at
once). "3 dry months" = the whole stack pays $0 three calendar months in a row somewhere in months 4-12; "$0 months" = the share
of months 4-12 with no payout from any account. 5-session blocks (as tools/uprisk.py); 21-session blocks in brackets.

| Payout rule (stack of 7, all LIT) | H1 | **H2** | 2021-25 | H2: 3 dry months | H2: $0 months | Evals bought in 12 mo (H2) |
|---|---:|---:|---:|---:|---:|---:|
| **Today** (ask at $1,500 above the buffer, the max request, as soon as MFFU allows) | $5,016 ($5,210) | **$4,772** ($4,171) | $60 ($119) | 20.3% (13.0%) | 29.8% (25.7%) | 18.4 |
| **Pre-buy the next eval at the 4th payout** | **$5,248** ($5,480) | **$5,004** ($4,359) | $60 ($119) | 19.7% (13.0%) | 29.1% (25.0%) | 20.2 |
| Pre-buy at the 3rd payout | $5,280 ($5,529) | $5,024 ($4,377) | $58 ($116) | 19.4% (13.1%) | 29.0% (25.0%) | 21.8 |
| Ask only full $2,000 requests | $4,980 ($5,176) | $4,741 ($4,145) | $52 ($107) | 19.8% (12.8%) | 29.6% (25.8%) | 18.2 |
| Ask at $1,000 above the buffer | $5,025 ($5,217) | $4,760 ($4,155) | $63 ($119) | 20.3% (13.7%) | 30.0% (25.9%) | 18.5 |
| Stack reserve: at most 4 payouts a month | $3,836 ($4,068) | $3,803 ($3,734) | $54 ($110) | 10.9% (7.5%) | 15.5% (13.2%) | 16.4 |
| Stack reserve: at most 3 a month | $3,222 ($3,384) | $3,209 ($3,246) | $49 ($103) | 8.7% (5.8%) | 11.3% (9.3%) | 14.5 |
| Stack reserve: at most 2 a month | $2,340 ($2,410) | $2,340 ($2,387) | $35 ($83) | 6.8% (4.1%) | 8.1% (6.4%) | 12.0 |
| cons_aware funded size (true or "after_payout": identical) | $4,450 ($4,631) | $4,549 ($3,838) | $64 ($110) | 23.3% (15.8%) | 32.2% (27.5%) | 17.9 |

One MFFU Builder 50K slot alone, 12 months: today $859 / $812 / $13 a month (H1 / H2 / 2021-25); **pre-buy at the 4th
payout $899 / $853 / $13 (+$40 / +$41 / $0)**; full $2,000 requests $852 / $808 / $12; $1,000 line $862 / $811 / $14.

## 1. Pre-buy the replacement eval at the 4th payout (the one that pays)

- **The mechanic:** MFFU ends a sim-funded account after 5 payouts (it moves to live, where the owner must be present and the
  bot never trades); LucidPro and FundedNext also end after 5 (lit-funded-firms.md). Today the slot buys its next eval only
  after the 5th payout, so it then pays nothing for the eval (median 9-11 sessions to a funded account, fails included) + 2 sessions of paperwork + the wait
  for the first payout (~24 sessions). Buying the next eval at the 4th payout runs it next to the funded account on the same
  signals; when the old account leaves, a passed eval is ready at once.
- **Money:** +$232 a month on the 7-account stack in both 2026 halves (+$188 / +$270 with 21-session blocks), about +$33 per
  account; +$40 a month for a single 50K. **2021-25: the same as today** ($60 / $119): accounts almost never reach a 4th payout there
  (0.05 more evals a year on the stack), so the rule almost never acts. **The cost:** about 2 more evals a year on the stack (18.4 -> 20.2 in H2), already
  inside the net numbers. Dry spells: unchanged to slightly better.
- **At the 3rd payout** is $20-50 a month more again but buys 1.6 more evals a year; the 4th is the cleaner rule (pre-buying
  earlier means an eval that waits longer).
- **Check before using it on MFFU (owner):** MFFU holds 1 sim-funded Builder 50K + 2 Builder 25K per person. The model lets a
  pre-bought eval that passes early wait (no trades) until the old account leaves, then activate. Ask MFFU support whether a
  passed Builder eval may wait while the funded one is active, and mind the 7-day inactivity rule on a waiting eval. On LucidPro
  (5 funded per household) and FundedNext (no cap found) the new account can simply start.
- **Bot work if adopted (owner):** `engine/funded_life.py` already counts payouts n/5; a push "4th payout recorded: buy the
  replacement eval now" is the only addition. Nothing is armed or bought by the bot.

## 2. The ask line (when to request)

- An MFFU account pays at most 5 requests, so a request under $2,000 "wastes" part of one. Over 12 months asking only for full
  $2,000 requests still pays **$26-36 a month less** on the stack (and $4-7 less per 50K): waiting for the full amount costs more
  time than it saves. Asking at $1,000 above the buffer is the same as $1,500 (-$16 to +$9). **Keep the owner's $1,500 line**
  (uprisk.md found the same over 6 months).

## 3. Consistency-aware size after a big winner (`funded.cons_aware`, built, OFF)

- Re-checked on the live funded sizing (60% of the room, <= $1,500, a winner <= $2,000): **-$566 / -$223 a month on the stack**
  (H1 / H2), +$4 / -$9 in 2021-25, and more dry months (H2 3-dry-months 20.3% -> 23.3%). `true` and `"after_payout"` give identical
  results (the first cycle's cap never binds, as funded-path.md explained). It shrinks the next days' winners so the 50%
  best-day rule is met sooner, but on LIT (about 1 winner a week) the smaller winners cost more than the earlier payouts bring.
  **Keep it off.** The $2,000 winner cap is already the consistency lever that pays (uprisk.md).

## 4. A stack payout reserve (ordering payouts across accounts)

- **The idea:** the accounts copy the same signals, so they become payout-ready in the same weeks and then all go quiet
  together. Cap the payouts a calendar month across the stack; a ready account over the cap waits (its cycle goes on) and asks
  in a month in which nobody else could.
- **It works for smoothness and costs too much money:** at most 2-4 payouts a month cuts the 3-dry-month odds from 20% to 7-11%
  (5-session blocks) and the $0 months from 30% to 8-16%, but pays **$440-2,800 a month less** within 12 months (4 a month:
  -$440 to -$1,180). Most of the
  difference is money still sitting in the accounts (paid later or never: an account that waits graduates later, 1.7-5.0
  graduations instead of 6.4, and is exposed to a loss for longer). For a smoother month, a cash buffer from the payouts does the
  same job for free. **Rejected.**
- **Which account asks first** does not matter on its own: each account's rules are independent, so asking as soon as each is
  ready is best; the only cross-account lever that paid is the eval timing (section 1).

## 5. All three gains of 2026-10-26 together

The three things that paid in today's studies act on different parts of an account's life: the eval (keep two_week after
session 10, eval-cost.md), the funded trades (the NA add-on, 3% of the room, <= $150 on a 50K / $75 on a 25K, never while LIT
holds, diversifier-search.md) and the timing of the next eval (pre-buy at the 4th payout, section 1). Same stack, same paths
(`tools/payout_policy.py combo`); 5-session blocks, 21-session in brackets:

| Stack of 7, 12 months | H1 | **H2** | 2021-25 | H2: 3 dry months | H2: $0 months | Evals a year (H2) |
|---|---:|---:|---:|---:|---:|---:|
| Today | $5,016 ($5,210) | **$4,772** ($4,171) | $60 ($119) | 20.3% (13.0%) | 29.8% (25.7%) | 18.4 |
| Eval kept on two_week after 10 | $5,083 ($5,316) | $4,896 ($4,362) | $98 ($152) | 22.1% (14.1%) | 30.5% (26.3%) | 19.4 |
| Pre-buy at the 4th payout | $5,248 ($5,480) | $5,004 ($4,359) | $60 ($119) | 19.7% (13.0%) | 29.1% (25.0%) | 20.2 |
| NA add-on (diversifier-search.md, stack B) | $5,423 ($5,759) | $5,080 ($4,434) | 2025 $86 ($197), 2021-24 $63 ($59) | 14.2% (10.2%) | 25.9% (21.6%) | 19.1 |
| NA add-on + pre-buy | $5,709 ($6,093) | $5,362 ($4,665) | $89 ($139) | 12.9% (10.3%) | 24.5% (21.0%) | 21.1 |
| **All three** | **$5,785** ($6,204) | **$5,481** ($4,853) | **$128** ($167) | **14.1%** (10.7%) | **25.5%** (21.8%) | 22.3 |

- **All three: +$709 / +$682 a month on the stack in H2, +$769 / +$994 in H1, +$48 to +$68 in 2021-25** (about +$100 a month
  per account in 2026), and the 3-dry-months odds fall from 20% to 14% (13% to 11% with month-long blocks). The gains add up
  roughly one to one.
- The eval change alone makes the dry-spell odds a little worse (more evals decided quickly, both ways) while it pays more; the
  NA add-on is what cuts the dry months.
- The NA-add-on row comes from `tools/div_stack.py` (same paths, same baseline), which splits 2021-25 into 2025 and 2021-24;
  every other row is the payout tool's 2021-11 to 2025-12 span.
- None of this changes a LIT trade; each is a separate owner decision (eval: `two_week_until` 999; pre-buy: a habit + a push;
  NA: a paper slot first, then a funded-only route). In a 2021-25-like year all of them together still leave the stack at about
  $100-170 a month, with $0 in 92-93% of months: they do not fix LIT's cold-year risk.

## How it was measured

- `python -X utf8 tools/payout_policy.py` (variants, `--n 1000`) and `combo` -> `research/lab/payout_policy.json`.
- `tools/payout_policy.Stack`: every account (`Slot`) is stepped session by session on the same market path (slot j bought 5j
  sessions after slot 0); eval = `tools/uprisk.Eval` (engine/sizing.lit_qty, live lit_sizing), funded = `tools/uprisk.Funded`
  (bit for bit engine/sizing + engine/funded_life MFFU rules) with the payout decision through a gate (`GFunded`). Its baseline
  reproduces `tools/div_stack.py` book A to the dollar ($5,016 / $4,772).
- The 4 x "50K-type" accounts use MFFU Builder 50K rules (the uprisk.md proxy for LucidPro / FundedNext). LucidPro's 40%
  best-day rule and $2,000 / $2,500 caps and FundedNext's $1,200 cap with no consistency rule are not modelled here
  (lit-funded-combo.md has them per firm).
- Not modelled: MFFU processing days, a refused request, the live account after 5 payouts, the 7-day inactivity rule.
  Paper only.
