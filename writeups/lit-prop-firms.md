> **Owner's real MFFU prices (with the MFFU discount code, 2026-10-18):** Builder 25K **$63**, Builder 50K **$91.80** (list $105 / $153). Cost per funded account at those prices: 25K about **$97** (63 / 0.65), 50K about **$116** (91.80 / 0.79). The other firms' prices below are list prices from search summaries; most firms run discount codes too, so check the real price before comparing. Pass and fail odds do not depend on the price.

## In one minute

- **Question (owner, 2026-10-18):** "If I start a 25K Builder or a Rapid account on Monday, what are the stats? On simulated
  evals I want all account balances and by prop firm."
- **What was run:** the exact live LIT trades of 2026 (120 trades, the same ones as run `lit_live`, costs in) on 60 plans
  from 10 firms, every size that is sold. Size on each plan = the live eval sizing scaled to the plan's max loss (details
  below). Each plan was scored three ways: a fresh eval started on every 2026 session (real history), only the Monday starts,
  and 4,000 Monte Carlo evals. Every number is shown for 2026, for Jan-Jun (H1) and for Jul-Oct (H2, the honest rate).
- **The one rule that matters for LIT is a "best day" (consistency) rule in the eval.** LIT makes most of its money on a few
  big days (one 8R winner is often the whole target). A rule like "your best day may be at most 50% of your profit" means
  that after one big day you must keep trading until the rest catches up. Result:

  | eval has a best-day rule? | plans | pass within 2 weeks (2026) | pass within 1 month | median sessions to pass |
  |---|---|---:|---:|---:|
  | no | MFFU Builder, Lucid Pro, Tradeify Growth, FundedNext Rapid Pro / Daily, Bulenox, Apex, Alpha Zero | 24-48% | 43-68% | 8-16 |
  | yes, 50-55% | MFFU Rapid, MFFU Pro, Topstep, Take Profit Trader, LucidFlex, Alpha Standard / Advanced | 1-7% | 6-18% | 27-36 |
  | yes, 30-40% | MFFU Rapid EOD (30%), Tradeify Select, FundedNext Legacy (40%) | 0% | 0-1% | 43-56 |

- **Monday start, MFFU 25K Builder** (41 Monday starts in 2026): pass within 2 weeks **34%**, within 1 month 56%, in the
  end 63%; fail within 2 weeks 2%, within 1 month **17%**, in the end **37%**; median 10 sessions to pass. Jul-Oct Mondays
  only: pass 2 weeks 27%, fail 1 month 13%. About $166 of fees per funded account.
- **Monday start, MFFU 50K Builder** (for comparison): pass 37% / 56% / 78%, fail 2% / **5%** / 15%; Jul-Oct Mondays 33%
  pass in 2 weeks, 0% fail. $48 more to buy, but it fails 3 times less often within a month, so the cost per funded account is
  almost the same ($196 vs $166).
- **Why the 25K fails more:** LIT's stops are wide (median 46 pts, up to 88). On a 25K the scaled risk is $400 up to a 25-pt
  stop, so a 60-88 pt stop gets 1 micro, and 1 micro on a 75-pt stop is $150, 15% of the $1,000 max loss. The size cannot go
  below 1 micro, so near the floor the 25K risks too much. On the 50K the same micro is 7.5% of the room.
- **Monday start, MFFU Rapid** (every size): pass within 2 weeks **5%**, within 1 month 10-15%, in the end 51-54%; median
  29-34 sessions. The Rapid's 50% best-day rule in the eval is the reason. **Rapid EOD** (30% rule, 4 days): 0% within a
  month, 7% in the end. **Builder beats Rapid for LIT at every size.**
- **Top 3 for LIT:** (1) **MFFU Builder 50K**: keep it (34.5% pass in 2 weeks, H2 29.5%, 4% fail in a month, $116 per funded (at your $91.80 price; $195 at list)
  account, bots allowed with oversight, everything is already built for it). (2) **Lucid Pro 50K**: the same eval maths,
  $178 per funded account, automation explicitly allowed. (3) **FundedNext Rapid Daily** (25K now, 50K once its price is
  confirmed): the same eval maths, no consistency rule even at payout, daily payouts, $124 per funded 25K. Details below.
- **Avoid for LIT:** every plan with an eval best-day rule (table above), Apex (bans automated trading and the eval expires
  after 30 days: 41-53% of evals end unpassed), Alpha Futures (semi-automated only, no NinjaTrader for new accounts).

## What was done

- **Trades:** `tools/lit_tightstop.unit()` (the live LIT signals at 1 micro, stop 1 tick beyond the sweep extreme) gives every
  trade's points, worst open loss and best open profit. It matches run `lit_live` trade for trade (630/630; 2026: 120 trades,
  +$41,734). So every plan can be sized exactly, path by path.
- **Size on each plan ("scaled", the main rule):** the live eval sizing scaled by the plan's max loss. Risk per trade =
  $800 x (plan max loss / $2,000) up to a 25-pt stop, then risk x 25 / stop; micros rounded down, at least 1; the weekly
  stop's half size; then never more than 60% of the room between the balance and the max-loss floor (at least 1 micro);
  capped by the plan's max contracts. On the 50K that is exactly today's eval mode. Check: the MFFU 50K Builder gives 2-week
  passes H1 37.5% / H2 29.5%, fails 3.1% / 0.0%, median 10.5 / 17.5 sessions, the numbers in `STRATEGY.md`.
  Typical size (median): 25K 2 micros ($166), 50K 4 ($338), 100K 6 ($546), 150K 10 ($840).
- **The plain LIT size** ($800 up to a 20-pt stop, 3 micros, $274, no room cap) is shown too (section 5).
- **Eval rules modelled per plan:** profit target; max loss trailing end-of-day (the floor moves with closing highs but a trade's
  worst open loss is checked against it) or intraday (the floor also moves with the trade's best open profit); the lock (most
  plans stop trailing at start + $100, Topstep / Take Profit Trader / Alpha at the start balance); soft daily loss limit (the
  position is closed at the limit and the day ends; no plan here has a hard one); best-day rule (best day <= share x profit to
  pass; a bigger day just needs more profit); minimum trading days; Apex's 30-day expiry (21 sessions; counted as a fail).
- **Three samples:** (a) **real history**: a fresh eval on every 2026 session, run forward up to 60 sessions on that span's
  sessions only; also for H1 and H2 alone; (b) **Monday starts**: the real-history starts that fall on a Monday (41 in 2026:
  26 in H1, 15 in H2); (c) **Monte Carlo**: 4,000 evals of 60 sessions drawn in blocks of 5 consecutive sessions (as
  `tools/lit_dash_data.py`), from 2026, from H1 and from H2; plus a Monday version (first block starts on a Monday).
  2021-25 (5m entries only, no 1m data) is a reference line.
- **"2 weeks" = 10 sessions, "1 month" = 20, "ever" = 60.** "Median sessions" = median sessions of the passes.
- **Cost per funded account** = average fee per eval attempt / pass-within-60 rate + activation fee. List prices, no coupons
  (MFFU and others often sell at 40-50% off), monthly plans pay every 21 sessions, an eval still open after 60 sessions counts
  as not passed. Reset discounts are ignored.
- **Funded stage (rough):** 1,000 paths of 252 sessions under each plan's funded rules (trailing type, buffer, payout min /
  max, cycle, winning days, consistency, split, payout count). Same scaled size with the room cap. Firms document this part
  the least, so treat it as a ranking, not a forecast.
- Script: `python tools/lit_prop_firms.py all` (about 1 minute on 2 processes; `check` reproduces the live 50K numbers).
  Every number: `research/lit/prop_firms.json` (per plan: rules, sources, unconfirmed fields, and results for both sizes,
  every sample and span).

## 1. All plans

Real history: a fresh eval on every 2026 session (206 starts), scaled size. "Consistency" = eval / payout best-day rule.
"Bot" = automated trading allowed for this kind of bot (yes / no / ? = unclear, see section 8). "*" = the plan page lists only
25K and 50K for sale. Apex "fail ever" includes the 30-day expiry.

| firm | plan | size | price | target | max loss | daily loss | consistency eval / payout | bot | pass 2 wk / 1 mo / ever | fail 2 wk / 1 mo / ever | median sessions | cost per funded | H2 only: pass 2 wk / fail 1 mo |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MyFundedFutures | Builder | 25K | $105 | $1,500 | $1,000 EOD | $600 soft | - / 50% | yes | 35 / 54 / 65% | 2 / 15 / 33% | 10 | $163 | 23% / 10% |
| MyFundedFutures | Builder | 50K | $153 | $3,000 | $2,000 EOD | $1,000 soft | - / 50% | yes | 34 / 55 / 79% | 2 / 4 / 14% | 12 | $195 | 30% / 0% |
| MyFundedFutures | Builder* | 100K | ? | $6,000 | $3,000 EOD | $1,750 soft | - / 50% | yes | 27 / 48 / 70% | 2 / 3 / 23% | 14 | ? | 22% / 0% |
| MyFundedFutures | Builder* | 150K | ? | $9,000 | $4,500 EOD | $2,500 soft | - / 50% | yes | 27 / 48 / 69% | 2 / 2 / 22% | 14 | ? | 22% / 0% |
| MyFundedFutures | Pro | 50K | $265 | $3,000 | $2,000 EOD | - | 50% / - | yes | 3 / 13 / 56% | 2 / 4 / 14% | 34 | $475 | 3% / 0% |
| MyFundedFutures | Pro | 100K | ? | $6,000 | $3,000 EOD | - | 50% / - | yes | 3 / 12 / 55% | 2 / 3 / 23% | 33 | ? | 1% / 0% |
| MyFundedFutures | Pro | 150K | ? | $9,000 | $4,500 EOD | - | 50% / - | yes | 3 / 13 / 54% | 2 / 2 / 22% | 34 | ? | 1% / 0% |
| MyFundedFutures | Rapid | 25K | $145 | $1,500 | $1,000 EOD (funded intraday) | - | 50% / - | yes | 3 / 9 / 53% | 2 / 15 / 33% | 35 | $274 | 1% / 10% |
| MyFundedFutures | Rapid | 50K | $209 | $3,000 | $2,000 EOD (funded intraday) | - | 50% / - | yes | 3 / 13 / 56% | 2 / 4 / 14% | 34 | $375 | 3% / 0% |
| MyFundedFutures | Rapid | 100K | $356 | $6,000 | $3,000 EOD (funded intraday) | - | 50% / - | yes | 3 / 12 / 55% | 2 / 3 / 23% | 33 | $644 | 1% / 0% |
| MyFundedFutures | Rapid | 150K | $463 | $9,000 | $4,500 EOD (funded intraday) | - | 50% / - | yes | 3 / 13 / 54% | 2 / 2 / 22% | 34 | $859 | 1% / 0% |
| MyFundedFutures | Rapid EOD | 25K | $145 | $1,500 | $1,000 EOD | - | 30% / - | yes | 0 / 0 / 7% | 2 / 15 / 33% | 55.5 | $2,132 | 0% / 10% |
| MyFundedFutures | Rapid EOD | 50K | $209 | $3,000 | $2,000 EOD | - | 30% / - | yes | 0 / 0 / 7% | 2 / 4 / 14% | 56 | $3,074 | 0% / 0% |
| Alpha Futures | Advanced | 50K | ? | $4,000 | $1,750 EOD | - | 50% / - | no | 2 / 6 / 55% | 2 / 4 / 14% | 36 | ? | 3% / 0% |
| Alpha Futures | Standard | 50K | ? | $3,000 | $2,000 EOD | - | 50% / 40% | no | 3 / 13 / 56% | 2 / 4 / 14% | 30 | ? | 3% / 0% |
| Alpha Futures | Standard | 100K | $239/mo | $6,000 | $3,000 EOD | - | 50% / 40% | no | 3 / 12 / 58% | 2 / 3 / 20% | 34 | $877 | 1% / 0% |
| Alpha Futures | Standard | 150K | $349/mo | $9,000 | $4,500 EOD | - | 50% / 40% | no | 3 / 13 / 55% | 2 / 2 / 20% | 34 | $1,392 | 1% / 0% |
| Alpha Futures | Zero | 50K | $139/mo | $3,000 | $2,000 EOD | $1,000 soft | - / 40% | no | 34 / 56 / 79% | 2 / 4 / 14% | 12 | $270 | 30% / 0% |
| Apex Trader Funding | 4.0 EOD | 25K | $177 +$99 | $1,500 | $1,000 EOD | $500 soft | - / 50% | no | 35 / 54 / 55% | 2 / 15 / 43% | 8 | $419 | 23% / 10% |
| Apex Trader Funding | 4.0 EOD | 50K | $197 +$99 | $3,000 | $2,000 EOD | $1,000 soft | - / 50% | no | 34 / 55 / 57% | 2 / 4 / 41% | 9 | $443 | 30% / 0% |
| Apex Trader Funding | 4.0 EOD | 100K | $297 +$99 | $6,000 | $3,000 EOD | $1,500 soft | - / 50% | no | 27 / 48 / 48% | 2 / 3 / 50% | 9.5 | $711 | 22% / 0% |
| Apex Trader Funding | 4.0 EOD | 150K | $397 +$99 | $9,000 | $4,000 EOD | $2,000 soft | - / 50% | no | 24 / 43 / 44% | 2 / 3 / 53% | 10 | $997 | 19% / 0% |
| Bulenox | Qualification Option 1 (intraday trailing) | 50K | $175/mo | $3,000 | $2,500 intraday | - | - / 40% | ? | 35 / 52 / 60% | 10 / 20 / 39% | 8 | $380 | 30% / 19% |
| Bulenox | Qualification Option 2 (EOD) | 25K | $145/mo | $1,500 | $1,500 EOD | $500 soft | - / 40% | ? | 48 / 68 / 84% | 2 / 8 / 14% | 8 | $222 | 38% / 0% |
| Bulenox | Qualification Option 2 (EOD) | 50K | $175/mo | $3,000 | $2,500 EOD | $1,100 soft | - / 40% | ? | 39 / 57 / 75% | 2 / 4 / 23% | 10 | $345 | 30% / 0% |
| Bulenox | Qualification Option 2 (EOD) | 100K | $215/mo | $6,000 | $3,000 EOD | $2,200 soft | - / 40% | ? | 27 / 48 / 70% | 2 / 3 / 23% | 14 | $495 | 22% / 0% |
| Bulenox | Qualification Option 2 (EOD) | 150K | $325/mo | $9,000 | $4,500 EOD | $3,300 soft | - / 40% | ? | 27 / 48 / 69% | 2 / 2 / 22% | 14 | $764 | 22% / 0% |
| FundedNext Futures | Legacy | 25K | $80 | $1,250 | $1,000 EOD | - | 40% / - | yes | 0 / 0 / 31% | 2 / 15 / 33% | 47 | $261 | 0% / 10% |
| FundedNext Futures | Legacy | 50K | $200 | $3,000 | $2,000 EOD | - | 40% / - | yes | 0 / 1 / 34% | 2 / 4 / 14% | 46 | $597 | 0% / 0% |
| FundedNext Futures | Legacy | 100K | $240 | $6,000 | $3,000 EOD | - | 40% / - | yes | 0 / 1 / 37% | 2 / 3 / 23% | 43.5 | $650 | 0% / 0% |
| FundedNext Futures | Rapid Daily | 25K | $80 | $1,500 | $1,000 EOD | $500 soft | - / - | yes | 35 / 54 / 65% | 2 / 15 / 33% | 10 | $124 | 23% / 10% |
| FundedNext Futures | Rapid Daily | 50K | ? | $3,000 | $2,000 EOD | $1,000 soft | - / - | yes | 34 / 55 / 79% | 2 / 4 / 14% | 12 | ? | 30% / 0% |
| FundedNext Futures | Rapid Daily | 100K | ? | $5,000 | $2,500 EOD | $1,250 soft | - / - | yes | 26 / 45 / 72% | 2 / 4 / 15% | 16 | ? | 23% / 0% |
| FundedNext Futures | Rapid Pro | 25K | $80 | $1,500 | $1,000 EOD | - | - / 40% | yes | 35 / 54 / 65% | 2 / 15 / 33% | 10 | $124 | 23% / 10% |
| FundedNext Futures | Rapid Pro | 50K | ? | $3,000 | $2,000 EOD | - | - / 40% | yes | 34 / 55 / 79% | 2 / 4 / 14% | 12 | ? | 30% / 0% |
| FundedNext Futures | Rapid Pro | 100K | ? | $5,000 | $2,500 EOD | - | - / 40% | yes | 26 / 45 / 68% | 2 / 4 / 23% | 14 | ? | 23% / 0% |
| Lucid Trading | LucidFlex | 25K | $79 | $1,250 | $1,000 EOD | - | 50% / - | yes | 3 / 9 / 53% | 2 / 15 / 33% | 35 | $149 | 1% / 10% |
| Lucid Trading | LucidFlex | 50K | $136 | $3,000 | $2,000 EOD | - | 50% / - | yes | 3 / 13 / 56% | 2 / 4 / 14% | 34 | $244 | 3% / 0% |
| Lucid Trading | LucidFlex | 100K | $258 | $6,000 | $3,000 EOD | - | 50% / - | yes | 3 / 12 / 55% | 2 / 3 / 23% | 33 | $467 | 1% / 0% |
| Lucid Trading | LucidFlex | 150K | $372 | $9,000 | $4,500 EOD | - | 50% / - | yes | 3 / 13 / 54% | 2 / 2 / 22% | 34 | $690 | 1% / 0% |
| Lucid Trading | LucidPro | 25K | $100 | $1,250 | $1,000 EOD | - | - / 40% | yes | 37 / 56 / 66% | 2 / 15 / 33% | 9 | $153 | 28% / 10% |
| Lucid Trading | LucidPro | 50K | $140 | $3,000 | $2,000 EOD | $1,200 soft | - / 40% | yes | 34 / 55 / 79% | 2 / 4 / 14% | 12 | $178 | 30% / 0% |
| Lucid Trading | LucidPro | 100K | $225 | $6,000 | $3,000 EOD | $1,800 soft | - / 40% | yes | 27 / 48 / 70% | 2 / 3 / 23% | 14 | $320 | 22% / 0% |
| Lucid Trading | LucidPro | 150K | $420 | $9,000 | $4,500 EOD | $2,700 soft | - / 40% | yes | 27 / 48 / 69% | 2 / 2 / 22% | 14 | $605 | 22% / 0% |
| Take Profit Trader | Test | 25K | $150/mo +$130 | $1,500 | $1,500 EOD (funded intraday) | - | 50% / - | ? | 3 / 14 / 57% | 2 / 4 / 15% | 33 | $684 | 1% / 0% |
| Take Profit Trader | Test | 50K | $170/mo +$130 | $3,000 | $2,000 EOD (funded intraday) | - | 50% / - | ? | 3 / 13 / 56% | 2 / 4 / 14% | 30 | $804 | 3% / 0% |
| Take Profit Trader | Test | 75K | $245/mo +$130 | $4,500 | $2,500 EOD (funded intraday) | - | 50% / - | ? | 2 / 12 / 53% | 2 / 4 / 23% | 34 | $1,152 | 1% / 0% |
| Take Profit Trader | Test | 100K | $330/mo +$130 | $6,000 | $3,000 EOD (funded intraday) | - | 50% / - | ? | 3 / 12 / 58% | 2 / 3 / 20% | 34 | $1,341 | 1% / 0% |
| Take Profit Trader | Test | 150K | $360/mo +$130 | $9,000 | $4,500 EOD (funded intraday) | - | 50% / - | ? | 3 / 13 / 55% | 2 / 2 / 20% | 34 | $1,566 | 1% / 0% |
| Topstep | Combine (Standard path) | 50K | $49/mo +$149 | $3,000 | $2,000 EOD | - | 55% / - | yes | 7 / 17 / 58% | 2 / 4 / 14% | 27 | $326 | 10% / 0% |
| Topstep | Combine (Standard path) | 100K | $99/mo +$149 | $6,000 | $3,000 EOD | - | 55% / - | yes | 5 / 18 / 66% | 2 / 3 / 20% | 29 | $446 | 6% / 0% |
| Topstep | Combine (Standard path) | 150K | $149/mo +$149 | $9,000 | $4,500 EOD | - | 55% / - | yes | 5 / 18 / 63% | 2 / 2 / 20% | 31 | $634 | 6% / 0% |
| Tradeify | Growth | 25K | $99 | $1,500 | $1,000 EOD | $600 soft | - / 35% | yes | 35 / 54 / 65% | 2 / 15 / 33% | 10 | $153 | 23% / 10% |
| Tradeify | Growth | 50K | $145 | $3,000 | $2,000 EOD | $1,250 soft | - / 35% | yes | 34 / 55 / 79% | 2 / 4 / 14% | 12 | $184 | 30% / 0% |
| Tradeify | Growth | 100K | $255 | $6,000 | $3,500 EOD | $2,500 soft | - / 35% | yes | 34 / 55 / 71% | 2 / 2 / 22% | 11 | $360 | 28% / 0% |
| Tradeify | Growth | 150K | $369 | $9,000 | $5,000 EOD | $3,750 soft | - / 35% | yes | 29 / 52 / 73% | 2 / 3 / 15% | 13 | $503 | 23% / 0% |
| Tradeify | Select | 25K | $109 | $1,500 | $1,000 EOD | - | 40% / - | yes | 0 / 0 / 36% | 2 / 15 / 33% | 47 | $304 | 0% / 10% |
| Tradeify | Select | 50K | $165 | $3,000 | $2,000 EOD | - | 40% / - | yes | 0 / 1 / 34% | 2 / 4 / 14% | 46 | $493 | 0% / 0% |
| Tradeify | Select | 100K | $265 | $6,000 | $3,000 EOD | - | 40% / - | yes | 0 / 1 / 37% | 2 / 3 / 23% | 43.5 | $718 | 0% / 0% |
| Tradeify | Select | 150K | $369 | $9,000 | $4,500 EOD | - | 40% / - | yes | 0 / 1 / 38% | 2 / 2 / 22% | 47 | $974 | 0% / 0% |
## 2. Sorted by cost per funded account (cheapest 15)

| # | plan | cost per funded 2026 | H2 only | Monte Carlo | pass 2 wk | fail 1 mo | bot |
|---|---|---|---|---|---|---|---|
| 1 | FundedNext Futures Rapid Pro 25K | $124 | $118 | $106 | 35.0% | 14.6% | yes |
| 2 | FundedNext Futures Rapid Daily 25K | $124 | $118 | $106 | 35.0% | 14.6% | yes |
| 3 | Lucid Trading LucidFlex 25K | $149 | $137 | $130 | 2.9% | 14.6% | yes |
| 4 | Tradeify Growth 25K | $153 | $146 | $132 | 35.0% | 14.6% | yes |
| 5 | Lucid Trading LucidPro 25K | $153 | $147 | $131 | 37.4% | 14.6% | yes |
| 6 | MyFundedFutures Builder 25K | $163 | $155 | $140 | 35.0% | 14.6% | yes |
| 7 | Lucid Trading LucidPro 50K | $178 | $165 | $184 | 34.5% | 3.9% | yes |
| 8 | Tradeify Growth 50K | $184 | $171 | $190 | 34.5% | 3.9% | yes |
| 9 | MyFundedFutures Builder 50K | $195 | $181 | $201 | 34.5% | 3.9% | yes |
| 10 | Bulenox Qualification Option 2 (EOD) 25K | $222 | $242 | $237 | 47.6% | 8.3% | ? |
| 11 | Lucid Trading LucidFlex 50K | $244 | $236 | $221 | 3.4% | 3.9% | yes |
| 12 | FundedNext Futures Legacy 25K | $261 | $346 | $165 | 0.0% | 14.6% | yes |
| 13 | Alpha Futures Zero 50K | $270 | $280 | $259 | 34.5% | 3.9% | no |
| 14 | MyFundedFutures Rapid 25K | $274 | $251 | $238 | 2.9% | 14.6% | yes |
| 15 | Tradeify Select 25K | $304 | $472 | $221 | 0.0% | 14.6% | yes |

The 25K accounts are the cheapest per funded account only because they cost less to buy: they fail 15% of evals within a
month (50K: 4%). LucidFlex 25K is cheap per funded account but slow (3% pass in 2 weeks). FundedNext's 50K / 100K Rapid
prices were not found, so they are missing here; at a price near the others they would sit next to Lucid Pro 50K.

## 3. Sorted by pass within 2 weeks (fastest 15)

| # | plan | pass 2 wk 2026 | H1 | H2 | Monte Carlo 2026 / H2 | fail 2 wk / 1 mo | median sessions | cost per funded | bot |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Bulenox Qualification Option 2 (EOD) 25K | 47.6% | 53.1% | 38.5% | 43.9% / 40.1% | 2.4% / 8.3% | 8 | $222 | ? |
| 2 | Bulenox Qualification Option 2 (EOD) 50K | 39.3% | 45.3% | 29.5% | 40.2% / 35.5% | 1.9% / 3.9% | 10 | $345 | ? |
| 3 | Lucid Trading LucidPro 25K | 37.4% | 43.0% | 28.2% | 36.4% / 29.5% | 2.4% / 14.6% | 9 | $153 | yes |
| 4 | Bulenox Qualification Option 1 (intraday trailing) 50K | 35.4% | 39.1% | 29.5% | 35.4% / 34.7% | 9.7% / 19.9% | 8 | $380 | ? |
| 5 | MyFundedFutures Builder 25K | 35.0% | 42.2% | 23.1% | 33.5% / 26.1% | 2.4% / 14.6% | 10 | $163 | yes |
| 6 | Apex Trader Funding 4.0 EOD 25K | 35.0% | 42.2% | 23.1% | 33.5% / 26.1% | 2.4% / 14.6% | 8 | $419 | no |
| 7 | Tradeify Growth 25K | 35.0% | 42.2% | 23.1% | 33.6% / 26.1% | 2.4% / 14.6% | 10 | $153 | yes |
| 8 | FundedNext Futures Rapid Pro 25K | 35.0% | 42.2% | 23.1% | 33.5% / 26.1% | 2.4% / 14.6% | 10 | $124 | yes |
| 9 | FundedNext Futures Rapid Daily 25K | 35.0% | 42.2% | 23.1% | 33.5% / 26.1% | 2.4% / 14.6% | 10 | $124 | yes |
| 10 | MyFundedFutures Builder 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 12 | $195 | yes |
| 11 | Apex Trader Funding 4.0 EOD 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 9 | $443 | no |
| 12 | Tradeify Growth 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 12 | $184 | yes |
| 13 | Lucid Trading LucidPro 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 12 | $178 | yes |
| 14 | Alpha Futures Zero 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 12 | $270 | no |
| 15 | FundedNext Futures Rapid Pro 50K | 34.5% | 37.5% | 29.5% | 33.5% / 28.8% | 1.9% / 3.9% | 12 | ? | yes |

Bulenox is fastest because its 25K comes with a $1,500 max loss (scaled risk $600 instead of $400) and its 50K with $2,500.
Its bot policy is unclear (commercial / shared bots banned since September 2026) and it charges monthly, so it is not a pick
until that is confirmed in writing. Plans with the same target, max loss and no best-day rule have the same numbers: for LIT
the eval maths of the MFFU Builder 50K, Lucid Pro 50K, Tradeify Growth 50K, FundedNext Rapid 50K and Apex 50K is identical,
so the choice comes down to price, payout rules and the bot policy.

## 4. A Monday start: MFFU 25K Builder and MFFU Rapid at every size

Monday Oct 19 is a Monday after a Friday close, the same as every other Monday start below. LIT's Monday rule (once Monday
takes Friday's high only shorts, Friday's low only longs) is in the trades already.

| plan | price | Monday starts 2026: pass 2 wk / 1 mo / ever | fail 2 wk / 1 mo / ever | median sessions | Jan-Jun Mondays (26): pass 2 wk / fail 1 mo | Jul-Oct Mondays (15): pass 2 wk / 1 mo / ever, fail 1 mo / ever | Monte Carlo Monday start: pass 2 wk / 1 mo / ever, fail 2 wk / 1 mo | cost per funded (Monday starts) |
|---|---|---|---|---|---|---|---|---|
| MFFU Builder 25K | $105 | 34 / 56 / 63% | 2 / 17 / 37% | 10 | 38 / 15% | 27 / 53 / 73%, 13 / 27% | 34 / 55 / 76%, 3 / 13% | $166 |
| MFFU Builder 50K | $153 | 37 / 56 / 78% | 2 / 5 / 15% | 12 | 38 / 8% | 33 / 53 / 93%, 0 / 0% | 34 / 55 / 76%, 2 / 10% | $196 |
| MFFU Rapid 25K | $145 | 5 / 10 / 51% | 2 / 17 / 37% | 34 | 8 / 15% | 0 / 13 / 60%, 13 / 27% | 6 / 20 / 62%, 3 / 13% | $283 |
| MFFU Rapid 50K | $209 | 5 / 15 / 54% | 2 / 5 / 15% | 29 | 8 / 8% | 0 / 27 / 60%, 0 / 0% | 5 / 20 / 62%, 2 / 10% | $389 |
| MFFU Rapid 100K | $356 | 5 / 15 / 51% | 2 / 5 / 24% | 30 | 8 / 8% | 0 / 27 / 53%, 0 / 27% | 6 / 20 / 63%, 1 / 8% | $695 |
| MFFU Rapid 150K | $463 | 5 / 15 / 51% | 2 / 5 / 24% | 33 | 8 / 8% | 0 / 27 / 53%, 0 / 27% | 6 / 21 / 62%, 2 / 8% | $904 |
| MFFU Rapid EOD 25K | $145 | 0 / 0 / 7% | 2 / 17 / 37% | 56 | 0 / 15% | 0 / 0 / 0%, 13 / 27% | 0 / 2 / 28%, 3 / 13% | $1,986 |
| MFFU Rapid EOD 50K | $209 | 0 / 0 / 7% | 2 / 5 / 15% | 56 | 0 / 8% | 0 / 0 / 0%, 0 / 0% | 0 / 1 / 27%, 2 / 10% | $2,863 |

What a Monday start on the **25K Builder** looks like, in plain words:

- Target $1,500, max loss $1,000 trailing on closing highs (stops trailing at $25,100), soft daily stop at -$600, 2 minis /
  20 micros max, no best-day rule in the eval, 1 trading day minimum. Price $105 one-time (often about $63 with a coupon).
- LIT trades it with about 2 micros ($166 at risk, never more than $400). In 2026 the 32 winners at that size banked a
  median $731 (half of them between $406 and $1,272, the best $2,998), so the eval is usually passed by 1-2 big winners.
- In 2026, a Monday start passed within 2 weeks about 1 time in 3, within a month a bit more than half the time, and in the
  end about 2 times in 3. 1 in 6 failed within a month, 1 in 3 in the end. In the Jul-Oct half (the honest rate, LIT's rules
  were picked on Jan-Jun): 27% pass in 2 weeks, 13% fail within a month.
- The owner's eval-speed rule (decided within 2 weeks, never longer than 3 weeks to pass) is not met by any plan: even the
  best leave about 6 in 10 evals undecided after 2 weeks.

And the **Rapid** (any size): the target and max loss are the same as the Builder of that size, but the eval needs the best
day to be at most 50% of the profit and at least 2 trading days. LIT's first big winner is usually more than half of the
profit, so the eval has to earn that day again before it can pass: a median of 29-34 sessions (6-7 weeks) instead of 10-12.
Once funded the Rapid is attractive (90% split, daily payouts, no consistency rule), but its funded max loss trails
**intraday** (open profit raises the floor), which hurts a strategy that moves the stop to breakeven at 1R and holds for 8R.
The Rapid EOD (30% rule, 4 days) is worse still: 7% pass within 60 sessions.

## 5. The plain LIT size on each plan

The plain LIT rule ($800 up to a 20-pt stop: 3 micros, $274 at risk on any account size) is too big for a 25K and too small
for a 100K-150K.

| plan | scaled size: micros / $ risk (median) | plain LIT: micros / $ risk | % trades at the plan cap (LIT) | LIT pass 2wk / 1mo / ever 2026 | LIT fail 2wk / 1mo / ever | LIT H2 pass 2wk / fail 1mo | LIT MC pass 2wk / fail 1mo | LIT cost per funded |
|---|---|---|---|---|---|---|---|---|
| MyFundedFutures Builder 25K | 2 / $166 | 3 / $274 | 5.8% | 50.5/64.6/65.0 | 24.3/33.0/33.5 | 46.2 / 33.3 | 44.1 / 41.1 | $162 |
| MyFundedFutures Builder 50K | 4 / $338 | 3 / $274 | 0.0% | 26.7/55.3/83.0 | 1.9/3.9/3.9 | 23.1 / 0.0 | 29.2 / 11.1 | $184 |
| MyFundedFutures Rapid 25K | 2 / $166 | 3 / $274 | 0.8% | 1.9/12.6/47.6 | 19.9/33.5/37.9 | 1.3 / 33.3 | 3.0 / 40.6 | $305 |
| MyFundedFutures Rapid 50K | 4 / $338 | 3 / $274 | 0.0% | 0.5/10.7/65.0 | 1.9/3.9/3.9 | 1.3 / 0.0 | 2.4 / 11.1 | $322 |
| MyFundedFutures Rapid 100K | 6 / $546 | 3 / $274 | 0.0% | 0.5/5.8/66.5 | 0.0/0.0/0.0 | 1.3 / 0.0 | 1.8 / 1.6 | $535 |
| MyFundedFutures Rapid 150K | 10 / $840 | 3 / $274 | 0.0% | 0.0/0.0/44.7 | 0.0/0.0/0.0 | 0.0 / 0.0 | 1.6 / 0.0 | $1,036 |
| MyFundedFutures Rapid EOD 25K | 2 / $166 | 3 / $274 | 5.8% | 0.0/0.0/7.3 | 19.9/33.0/34.5 | 0.0 / 32.1 | 0.0 / 40.3 | $1,986 |
| MyFundedFutures Rapid EOD 50K | 4 / $338 | 3 / $274 | 0.8% | 0.0/0.0/2.4 | 1.9/3.9/3.9 | 0.0 / 0.0 | 0.0 / 11.1 | $8,708 |
| Lucid Trading LucidPro 25K | 2 / $166 | 3 / $274 | 5.8% | 53.9/68.0/68.4 | 19.9/29.1/30.1 | 51.3 / 28.2 | 47.8 / 38.0 | $146 |
| Lucid Trading LucidPro 50K | 4 / $338 | 3 / $274 | 0.0% | 26.7/55.3/83.0 | 1.9/3.9/3.9 | 23.1 / 0.0 | 29.2 / 11.1 | $169 |
| Tradeify Growth 25K | 2 / $166 | 3 / $273 | 13.3% | 51.0/65.0/65.5 | 19.9/31.6/33.0 | 46.2 / 33.3 | 45.7 / 36.5 | $151 |
| Tradeify Growth 50K | 4 / $338 | 3 / $274 | 0.0% | 26.7/55.3/83.0 | 1.9/3.9/3.9 | 23.1 / 0.0 | 29.2 / 11.1 | $175 |
| FundedNext Futures Rapid Daily 25K | 2 / $166 | 3 / $274 | 5.8% | 50.5/64.6/65.5 | 23.3/33.0/33.0 | 46.2 / 33.3 | 43.7 / 41.2 | $122 |
| FundedNext Futures Rapid Daily 50K | 4 / $338 | 3 / $274 | 0.0% | 26.7/55.3/83.0 | 1.9/3.9/3.9 | 23.1 / 0.0 | 29.2 / 11.1 | ? |
| Bulenox Qualification Option 2 (EOD) 25K | 3 / $252 | 3 / $274 | 0.8% | 50.5/67.5/72.3 | 6.3/25.2/26.2 | 46.2 / 16.7 | 45.6 / 25.2 | $211 |
| Bulenox Qualification Option 2 (EOD) 50K | 5 / $446 | 3 / $274 | 0.0% | 26.7/55.8/86.9 | 0.0/0.0/0.0 | 23.1 / 0.0 | 29.2 / 4.0 | $325 |
| Topstep Combine (Standard path) 50K | 4 / $338 | 3 / $274 | 0.0% | 2.4/17.5/73.8 | 1.9/3.9/3.9 | 2.6 / 0.0 | 5.1 / 11.0 | $287 |
| Apex Trader Funding 4.0 EOD 50K | 4 / $338 | 3 / $274 | 0.0% | 26.7/55.3/56.8 | 1.9/3.9/41.7 | 23.1 / 0.0 | 29.2 / 11.1 | $446 |
| Take Profit Trader Test 50K | 4 / $338 | 3 / $274 | 0.0% | 0.5/10.7/65.0 | 1.9/3.9/3.9 | 1.3 / 0.0 | 2.4 / 11.0 | $723 |
| Tradeify Select 50K | 4 / $338 | 3 / $274 | 0.0% | 0.0/2.4/36.4 | 1.9/3.9/3.9 | 0.0 / 0.0 | 0.5 / 11.1 | $453 |
| Lucid Trading LucidFlex 50K | 4 / $338 | 3 / $274 | 0.0% | 0.5/10.7/65.0 | 1.9/3.9/3.9 | 1.3 / 0.0 | 2.4 / 11.1 | $209 |

- On a **25K** the plain LIT size passes faster (50% in 2 weeks) but fails 24% within 2 weeks and a third in the end.
- On a **50K** it is today's normal mode: passes slower than the eval mode (27% vs 34.5% in 2 weeks), fails the same.
- On a **100K / 150K** it is far too small: 12% / 1.5% pass within 2 weeks, and the 150K passes 45% within 60 sessions.
  If a big account is ever bought, the size has to scale with it (the "scaled" rule above).

## 6. The two halves, the Monte Carlo and the 2021-25 reference

The rules were picked on Jan-Jun (H1); Jul-Oct (H2) is the check. Format: pass 2 wk / 1 mo / ever, fail 2 wk / 1 mo / ever.

| plan | H1 pass 2wk/1mo/ever | H1 fail 2wk/1mo/ever | H1 med | H2 pass 2wk/1mo/ever | H2 fail 2wk/1mo/ever | H2 med | MC 2026 pass 2wk/1mo/ever | MC fail 2wk/1mo | MC H1 pass 2wk/ever | MC H2 pass 2wk/ever, fail 1mo | 2021-25 ref pass 2wk/ever, fail 1mo/ever |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MyFundedFutures Builder 25K | 42.2/58.6/62.5 | 3.9/14.1/18.8 | 8 | 23.1/46.2/67.9 | 0.0/10.3/28.2 | 16 | 33.5/55.1/75.2 | 3.0/12.3 | 39.2/78.3 | 26.1/71.7, 11.8 | 7.6/22.0, 22.3/61.6 |
| MyFundedFutures Builder 50K | 37.5/60.2/75.0 | 3.1/6.2/6.2 | 10.5 | 29.5/47.4/84.6 | 0.0/0.0/3.8 | 17.5 | 33.5/54.7/76.2 | 1.8/8.8 | 37.0/78.7 | 28.8/76.8, 7.5 | 7.9/27.7, 17.5/59.0 |
| MyFundedFutures Rapid 25K | 3.9/4.7/50.0 | 3.9/14.1/18.8 | 41.5 | 1.3/15.4/57.7 | 0.0/10.3/28.2 | 29 | 3.9/18.6/60.8 | 3.0/12.4 | 5.3/66.0 | 4.0/60.7, 11.8 | 0.6/5.9, 23.7/65.8 |
| MyFundedFutures Rapid 50K | 3.9/3.9/54.7 | 3.1/6.2/6.2 | 40.5 | 2.6/26.9/57.7 | 0.0/0.0/3.8 | 21 | 3.7/17.9/61.5 | 1.8/8.8 | 5.0/65.0 | 4.7/67.3, 7.5 | 0.6/7.5, 21.0/64.7 |
| MyFundedFutures Rapid 100K | 3.9/3.9/55.5 | 2.3/5.5/6.2 | 36 | 1.3/25.6/53.8 | 0.0/0.0/28.2 | 22.5 | 3.5/18.6/62.4 | 1.2/7.2 | 5.0/66.5 | 4.0/65.2, 6.9 | 0.6/7.2, 20.3/66.0 |
| MyFundedFutures Rapid 150K | 3.9/3.9/53.9 | 2.3/3.9/4.7 | 37 | 1.3/26.9/53.8 | 0.0/0.0/28.2 | 20.5 | 3.7/18.6/61.3 | 1.2/6.5 | 4.9/65.7 | 4.6/64.8, 7.2 | 0.7/7.6, 20.8/65.3 |
| MyFundedFutures Rapid EOD 25K | 0.0/0.0/10.9 | 3.9/14.1/18.8 | 55.5 | 0.0/0.0/0.0 | 0.0/10.3/28.2 | - | 0.0/1.0/26.6 | 3.0/12.4 | 0.1/35.7 | 0.0/27.9, 11.8 | 0.0/0.9, 23.7/66.1 |
| MyFundedFutures Rapid EOD 50K | 0.0/0.0/10.9 | 3.1/6.2/6.2 | 56 | 0.0/0.0/0.0 | 0.0/0.0/3.8 | - | 0.0/1.1/26.4 | 1.8/8.8 | 0.1/34.2 | 0.0/35.5, 7.5 | 0.0/1.1, 21.0/65.2 |
| Lucid Trading LucidPro 25K | 43.0/61.7/64.1 | 3.9/14.1/18.8 | 8 | 28.2/47.4/67.9 | 0.0/10.3/28.2 | 15 | 36.4/58.7/76.2 | 3.0/12.2 | 42.6/79.2 | 29.5/74.1, 11.7 | 12.2/30.5, 23.3/57.6 |
| Lucid Trading LucidPro 50K | 37.5/60.2/75.0 | 3.1/6.2/6.2 | 10.5 | 29.5/47.4/84.6 | 0.0/0.0/3.8 | 17.5 | 33.5/54.7/76.2 | 1.8/8.8 | 37.0/78.7 | 28.8/76.8, 7.5 | 8.1/25.2, 18.5/59.4 |
| Tradeify Growth 25K | 42.2/58.6/62.5 | 3.9/14.1/18.8 | 8 | 23.1/46.2/67.9 | 0.0/10.3/28.2 | 16 | 33.6/55.2/75.2 | 3.0/12.3 | 39.4/78.4 | 26.1/71.7, 11.7 | 7.6/22.1, 21.3/61.4 |
| Tradeify Growth 50K | 37.5/60.2/75.0 | 3.1/6.2/6.2 | 10.5 | 29.5/47.4/84.6 | 0.0/0.0/3.8 | 17.5 | 33.5/54.7/76.2 | 1.8/8.8 | 37.0/78.7 | 28.8/76.8, 7.5 | 8.1/24.9, 18.8/59.6 |
| FundedNext Futures Rapid Daily 25K | 42.2/58.6/62.5 | 3.9/14.1/18.8 | 8 | 23.1/46.2/67.9 | 0.0/10.3/28.2 | 16 | 33.5/55.1/75.2 | 3.0/12.3 | 39.2/78.3 | 26.1/71.7, 11.8 | 8.1/23.5, 22.6/63.0 |
| FundedNext Futures Rapid Daily 50K | 37.5/60.2/75.0 | 3.1/6.2/6.2 | 10.5 | 29.5/47.4/84.6 | 0.0/0.0/3.8 | 17.5 | 33.5/54.7/76.2 | 1.8/8.8 | 37.0/78.7 | 28.8/76.8, 7.5 | 7.9/27.7, 17.5/59.0 |
| Bulenox Qualification Option 2 (EOD) 25K | 53.1/71.1/78.9 | 3.9/7.0/7.0 | 7 | 38.5/61.5/92.3 | 0.0/0.0/2.6 | 14.5 | 43.9/63.4/79.4 | 2.0/9.2 | 48.9/80.5 | 40.1/79.8, 8.8 | 14.8/36.8, 17.4/53.2 |
| Bulenox Qualification Option 2 (EOD) 50K | 45.3/64.8/78.9 | 3.1/6.2/6.2 | 9 | 29.5/43.6/67.9 | 0.0/0.0/28.2 | 12 | 40.2/59.9/77.0 | 1.8/8.2 | 44.5/79.8 | 35.5/75.5, 8.1 | 14.4/32.8, 15.2/56.3 |
| Topstep Combine (Standard path) 50K | 4.7/10.9/55.5 | 3.1/6.2/6.2 | 35 | 10.3/26.9/60.3 | 0.0/0.0/3.8 | 22 | 6.2/23.3/66.1 | 1.8/8.7 | 7.3/68.2 | 8.6/70.8, 7.4 | 1.4/9.8, 21.0/64.6 |
| Apex Trader Funding 4.0 EOD 50K | 37.5/60.2/61.7 | 3.1/6.2/23.4 | 9 | 29.5/47.4/50.0 | 0.0/0.0/46.2 | 9 | 33.5/54.7/55.9 | 1.8/8.8 | 37.0/62.0 | 28.8/52.8, 7.5 | 7.9/15.7, 17.5/82.4 |
| Take Profit Trader Test 50K | 3.9/3.9/54.7 | 3.1/6.2/6.2 | 40.5 | 2.6/26.9/57.7 | 0.0/0.0/3.8 | 21 | 3.7/17.9/61.6 | 1.8/8.7 | 5.0/65.1 | 4.7/67.5, 7.4 | 0.6/7.5, 21.0/64.6 |
| Tradeify Select 50K | 0.0/0.0/34.4 | 3.1/6.2/6.2 | 48.5 | 0.0/2.6/32.1 | 0.0/0.0/3.8 | 35 | 0.7/7.0/48.5 | 1.8/8.8 | 1.2/54.2 | 0.4/56.5, 7.5 | 0.0/2.2, 21.0/64.9 |
| Lucid Trading LucidFlex 50K | 3.9/3.9/54.7 | 3.1/6.2/6.2 | 40.5 | 2.6/26.9/57.7 | 0.0/0.0/3.8 | 21 | 3.7/17.9/61.5 | 1.8/8.8 | 5.0/65.0 | 4.7/67.3, 7.5 | 0.6/7.5, 21.0/64.7 |

- The Monte Carlo agrees with the real history within a few points on every plan, so the ranking does not hang on one
  lucky sequence. It shows fewer fails ever on the 25K than the real history (24% vs 33%) because the real 2026 history
  had two bad stretches (late May, mid-August) that many consecutive starts ran into.
- **H2 is slower:** about 23-30% pass within 2 weeks on the best plans instead of 37-43% in H1. Quote the H2 rate.
- **2021-25 (reference only, 5m entries, no 1m data):** every plan fails more than it passes (Builder 50K: 8% pass in
  2 weeks, 28% ever, 59% fail ever). LIT's edge is a 2026 result.
- Read the sample size: 206 starts in 2026, but consecutive starts share most of their trades, so the real number of
  independent evals is much smaller (see `eval-game.md`).

## 7. After the pass: first payout and the first year (rough)

1,000 funded paths of 252 sessions (a year) drawn from 2026 (and from H2 alone), scaled size with the room cap, each plan's
payout rules as far as they are published. "Blown within the year" counts accounts lost after payouts were taken; plans that
let you withdraw everything above the buffer every day keep the account at the edge, so most of them are lost within a year
after paying out more. Compare the money, not the blow-up rate.

| plan | split | payout rule (model) | first payout (median sessions) | payout before blow-up | blown before any payout | expected 1st-year payout to you (2026 / H2) | median | blown within the year |
|---|---|---|---|---|---|---|---|---|
| MyFundedFutures Builder 25K | 80% | buffer $1,100, best day <= 50%, max $1,000, 5 payouts max | 32 | 73.6% | 26.4% | $2,527 / $2,337 | $3,200 | 29.1% |
| MyFundedFutures Builder 50K | 80% | buffer $2,100, best day <= 50%, max $2,000, 5 payouts max | 33 | 75.1% | 24.9% | $5,113 / $5,334 | $6,400 | 26.9% |
| MyFundedFutures Rapid 25K | 90% | buffer $1,100 | 11 | 63.5% | 36.5% | $5,344 / $4,090 | $2,297 | 97.1% |
| MyFundedFutures Rapid 50K | 90% | buffer $2,100 | 11 | 67.7% | 32.3% | $11,716 / $9,863 | $5,414 | 96.3% |
| MyFundedFutures Rapid 100K | 90% | buffer $3,100 | 9 | 69.6% | 30.4% | $17,517 / $13,214 | $8,504 | 96.3% |
| MyFundedFutures Rapid 150K | 90% | buffer $4,600 | 8 | 69.2% | 30.8% | $25,619 / $18,935 | $12,323 | 96.1% |
| MyFundedFutures Rapid EOD 25K | 90% | buffer $1,100 | 12 | 75.8% | 24.2% | $6,480 / $5,062 | $4,001 | 96.4% |
| MyFundedFutures Rapid EOD 50K | 90% | buffer $2,100 | 11 | 77.7% | 22.3% | $13,763 / $11,576 | $8,477 | 95.6% |
| Lucid Trading LucidPro 25K | 90% | buffer $1,100, best day <= 40%, max $1,000 | 48 | 72.9% | 27.1% | $2,427 / $2,290 | $2,700 | 28.0% |
| Lucid Trading LucidPro 50K | 90% | buffer $2,100, best day <= 40%, max $2,000 | 49 | 74.6% | 25.4% | $4,880 / $5,598 | $5,400 | 25.9% |
| Tradeify Growth 25K | 90% | buffer $1,100, best day <= 35%, 5 winning days, max $1,000 | 57 | 72.4% | 27.4% | $2,064 / $1,929 | $2,700 | 27.8% |
| Tradeify Growth 50K | 90% | buffer $2,100, best day <= 35%, 5 winning days, max $1,250 | 61 | 74.4% | 25.5% | $2,552 / $2,951 | $3,375 | 25.6% |
| FundedNext Futures Rapid Daily 25K | 90% | buffer $1,100, max $800 | 11 | 76.3% | 23.7% | $9,916 / $5,246 | $5,040 | 59.4% |
| FundedNext Futures Rapid Daily 50K | 90% | buffer $2,100, max $1,500 | 10 | 78.3% | 21.7% | $21,061 / $13,898 | $22,112 | 49.8% |
| Bulenox Qualification Option 2 (EOD) 25K | 100% | buffer $1,600, best day <= 40%, max $1,000 | 53 | 72.3% | 27.7% | $2,360 / $2,972 | $3,000 | 28.6% |
| Bulenox Qualification Option 2 (EOD) 50K | 100% | buffer $2,600, best day <= 40%, max $1,500 | 49 | 72.6% | 27.2% | $3,842 / $4,089 | $4,500 | 27.9% |
| Topstep Combine (Standard path) 50K | 90% | 5 winning days, max $5,000, <= 50% of balance | 28 | 77.1% | 22.9% | $20,773 / $20,063 | $26,763 | 33.2% |
| Apex Trader Funding 4.0 EOD 50K | 100% | buffer $2,100, best day <= 50%, 5 winning days, max $1,500, 6 payouts max | 36 | 74.8% | 25.2% | $5,080 / $5,604 | $6,000 | 26.2% |
| Take Profit Trader Test 50K | 80% | buffer $2,000 | 8 | 70.7% | 29.3% | $10,087 / $8,318 | $4,790 | 96.7% |
| Tradeify Select 50K | 90% | 5 winning days, max $2,000, <= 50% of balance | 28 | 76.7% | 23.3% | $9,202 / $10,628 | $11,970 | 29.3% |
| Lucid Trading LucidFlex 50K | 90% | 5 winning days, max $2,000, <= 50% of balance | 28 | 76.4% | 23.6% | $9,202 / $10,637 | $12,030 | 29.3% |

- **A payout best-day rule slows the first payout** the same way an eval rule slows the pass: MFFU Builder (50%) about 33
  sessions to the first payout, Lucid Pro (40%) 49, Tradeify Growth (35%) 61, against 7-11 on plans without one (MFFU Rapid,
  FundedNext Rapid Daily, Take Profit Trader PRO).
- **FundedNext Rapid Daily** pairs a no-consistency eval with a no-consistency funded account and daily payouts; it models
  the most money per account of the plans whose eval LIT can pass quickly. Its per-payout caps and its daily loss limit type
  are the least confirmed numbers here.
- **Topstep's** funded model pays well (50% of the balance up to $5,000 per payout, 5 winning days), but its 55% eval rule
  makes the pass slow (7% in 2 weeks, median 27 sessions).
- These funded numbers rest on 2026 alone (LIT's best year in the data) and on payout rules that are partly assumed (listed
  per plan in the JSON). Use them to rank, not to budget.

## 8. The top 3 for LIT and why

1. **MFFU Builder 50K: keep it.** No best-day rule in the eval, EOD trailing max loss, soft daily stop. 2026 real history:
   34.5% pass within 2 weeks (H1 37.5% / H2 29.5%), 55% within a month, 79% in the end; 1.9% fail within 2 weeks, 3.9%
   within a month (H2 0%); median 12 sessions; **$195 per funded account** at list price. Monday starts: 37% / 56% / 78%,
   fail 5% within a month. MFFU allows automation with active oversight, and the bot, the NinjaTrader route, the cloud
   monitor and the eval tracker are already built for exactly these rules. Weak spot: the 50% payout rule (first payout
   about 7 weeks after funding, $2,000 max per payout, 5 payouts then live).
2. **Lucid Pro 50K.** The same eval maths as the Builder 50K (same target, max loss, lock, no best-day rule; daily stop
   $1,200 soft), list price $140, **$178 per funded account**, and Lucid explicitly allows automated systems. Payout rule
   40% best day (slower first payout, about 49 sessions). A good second account if the owner wants one firm's rule change
   not to stop everything. Its 25K (target $1,250 instead of $1,500) passes a little faster (37% in 2 weeks) but fails like
   every 25K.
3. **FundedNext Rapid Daily** (25K: $80, **$124 per funded account**; 50K once its price is confirmed). Same eval maths as the
   Builder, no best-day rule in the eval or at payout, daily payouts. The 25K carries the 25K problem (15% fail within a
   month), and the daily loss limit type and payout caps are not confirmed; the 50K is the one to buy when its price is known.

Close behind: **Tradeify Growth 50K** ($184 per funded account, but a 35% payout rule and a bot activation video), **Bulenox
EOD 25K/50K** (fastest evals thanks to a bigger max loss, but the bot policy and fees need confirming in writing).

**Not for LIT:** MFFU Rapid / Rapid EOD / Pro, Topstep, Take Profit Trader, LucidFlex, Tradeify Select, FundedNext Legacy and
Alpha Standard / Advanced (eval best-day rules: 0-7% pass in 2 weeks); Apex (automation banned; the 30-day expiry ends
41-53% of evals unpassed); Alpha Futures (semi-automated only, NinjaTrader not offered for new accounts since July 2026).

**25K or 50K?** The 50K. It costs $48 more but fails a third as often within a month (4% vs 15%), so the cost per funded
account is about the same ($195 vs $163), the funded account pays twice as much per payout, and the owner keeps trading
instead of buying resets. A 25K only makes sense with a rule that stops trading when even 1 micro is too much (next section).

## 9. An idea for the 25K, not adopted: skip a trade when 1 micro is more than 60% of the room

Today the room cap never goes below 1 micro. A research switch that skips the trade instead:

| plan | rule | trades / week | 2026 pass 2 wk / 1 mo / ever | fail 2 wk / 1 mo / ever | 2021-25 reference: pass ever / fail ever / still open |
|---|---|---:|---|---|---|
| MFFU Builder 25K | today (min 1 micro) | 2.70 | 35 / 54 / 65% | 2 / 15 / 33% | 22 / 62 / 16% |
| MFFU Builder 25K | skip | 2.67 | 35 / 56 / 81% | 0 / 0 / 0% | 22 / 27 / 52% |
| MFFU Builder 50K | today | 2.70 | 34.5 / 55 / 79% | 2 / 4 / 14% | 28 / 59 / 13% |
| MFFU Builder 50K | skip | 2.68 | 34.5 / 55 / 74% | 0 / 0 / 0% | 28 / 19 / 53% |

It turns fails into evals that sit just above the floor and stop trading: in 2021-25 it creates no extra passes, half the
evals are still open after 60 sessions, and an account parked at the floor is a reset in all but name. It would also break
the 2-4 trades a week rule exactly when an eval is in trouble. Recorded as an idea; not adopted.

## 10. The rules, where they came from, and what is not confirmed

Searched on **2026-10-18** (WebSearch, extended mode). The pages themselves could not be opened from this machine (the
fetch tool and curl were blocked by the network policy), so **every figure comes from the search engine's reading of the
pages below, not from opening them**. Where sources disagreed, the newest official (help-center) figure was used and the
conflict is listed in `research/lit/prop_firms.json` under each plan's `unconfirmed`. **Check the checkout page before
buying.**

| firm | plan rules used | not confirmed / conflicting |
|---|---|---|
| MyFundedFutures Builder | 25K $105 / 50K $153 one-time (since 2026-08-25, $0 activation), target 6%, max loss $1,000 / $2,000 / $3,000 / $4,500 EOD (locks +$100), soft daily stop $600 / $1,000 / $1,750 / $2,500, 2 / 4 / 6 minis, no eval consistency, 1 day; funded: buffer max loss + $100, payout $250-$1,000 (25K) / $500-$2,000 (50K), 50% best day, 2 days per cycle, 80/20, 5 sim payouts then live | 25K daily stop $600 (new) vs none (legacy 25K); 100K / 150K prices not found and the plan page lists only 25K / 50K; 150K contracts |
| MyFundedFutures Rapid | $145 / $209 / $356 / $463, target 6%, max loss $1,000-$4,500 EOD in the eval, intraday trailing funded (locks +$100), no DLL, 50% eval consistency, 2 days, 3 / 5 / 8 / 10 minis; funded 90/10, daily payouts, $500 min, no consistency | prices ($109-$347 list per PropScope; one source says monthly); eval consistency (one source: none) |
| MyFundedFutures Rapid EOD (Aug / Sep 2026) | 25K $145 / 50K $209 one-time, EOD throughout, 30% eval consistency, 4 days, 2 / 3 minis, buffer $1,100 / $2,100, daily payouts, 90/10 | 50K price $157 vs $209 |
| MyFundedFutures Pro | 50K from $265, 50% eval consistency, EOD, payouts every 14 days, $1,000 min, 80/20 | 100K / 150K prices, contracts |
| Topstep | $49 / $99 / $149 a month + $149 activation (or $95/mo with no activation at 50K), target $3k / $6k / $9k, max loss $2k / $3k / $4.5k EOD with real-time breach, 5 / 10 / 15 minis, 55% best-day target in the Combine, 2 days; XFA: 5 winning days of $150+, up to 50% of balance | 150K price ($149 vs $199); XFA payout cap |
| Apex 4.0 EOD | $177 / $197 / $297 / $397 one-time, 30-day expiry, no resets, max loss $1k / $2k / $3k / $4k, EOD DLL $500-$2,000, 4 / 6 / 8 / 12 minis, no eval consistency; PA 50% consistency, 6 payouts; **automation banned** | prices (intraday $118-$265), activation $79-$159, DLL soft or hard |
| Tradeify | Growth $99 / $145 / $255 / $369, max loss $1k / $2k / $3.5k / $5k EOD, soft DLL $600-$3,750, 1 / 4 / 8 / 12 minis, no eval consistency, funded 35%; Select $109 / $165 / $265 / $369, max loss $1k / $2k / $3k / $4.5k, no DLL, 40% eval consistency, 3 days | funded payout caps, the lock |
| Lucid Trading | LucidPro $100 / $140 / $225 / $420, target $1,250 / $3k / $6k / $9k, EOD +$100 lock, no eval consistency, DLL none (25K) / $1,200 / $1,800 / $2,700, funded 40%; LucidFlex $79 / $136 / $258 / $372, 50% eval consistency, no DLL, funded none (5 winning days), 2 / 4 / 6 / 10 minis | prices vary by source and promo; DLL optional or fixed |
| Take Profit Trader | Test $150 / $170 / $245 / $330 / $360 a month + $130 activation, max loss $1.5k / $2k / $2.5k / $3k / $4.5k EOD, no DLL, 50% eval consistency, 3 days (new Tests), 3-15 minis; PRO intraday trailing, 80%, daily payouts | lock level; min days (3 vs 5); bot policy not found |
| Alpha Futures | Standard 100K $239/mo, 150K $349/mo, 50% eval consistency, EOD stopping at the start balance; Zero 50K $139/mo, no eval consistency, $1,000 daily guard; Advanced 50K target $4,000 / max loss $1,750 | 50K Standard / Advanced prices; contracts; semi-automated only; NinjaTrader gone for new accounts |
| FundedNext Futures | Rapid Pro / Daily 25K / 50K / 100K: target $1.5k / $3k / $5k, max loss $1k / $2k / $2.5k EOD, no eval consistency, Daily adds DLL $500 / $1,000 / $1,250, Pro 40% funded consistency, Daily none; Legacy $80 / $200 / $240, 40% eval consistency; 25K Rapid $80 | Rapid 50K / 100K prices; DLL type; payout caps; Legacy funded split |
| Bulenox | Qualification $145 / $175 / $215 / $325 (monthly assumed), Option 2 EOD with DLL $500 / $1,100 / $2,200 / $3,300, Option 1 intraday trailing no DLL, max loss $1.5k / $2.5k / $3k / $4.5k, no eval consistency, funded 40%, 100% of the first $10k | max loss figures conflict (50K $2,500?); contracts; one-time vs monthly; bot policy |

Not covered: Earn2Trade, Elite Trader Funding, Phidias, TradeDay and smaller firms (no search done); MFFU Flex / Core (legacy,
not sold new).

Sources (search results read 2026-10-18; pages not opened):
- MyFundedFutures: <https://help.myfundedfutures.com/en/articles/17036130-builder-plan-25k-a-comprehensive-look>, <https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide>, <https://help.myfundedfutures.com/en/articles/17005296-builder-plan-100k-comprehensive-guide>, <https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified>, <https://myfundedfutures.com/plans/builder>, <https://myfundedfutures.com/plans/rapid>, <https://help.myfundedfutures.com/en/articles/16727601-rapid-eod-25k-a-comprehensive-look>, <https://phidiaspropfirm.com/education/myfundedfutures-builder-plan>, <https://phidiaspropfirm.com/education/myfundedfutures-rapid-plan>, <https://propscope.net/en/plans/myfundedfutures-rapid/>, <https://proptradingvibes.com/blog/myfundedfutures-rapid-eod>, <https://traderpayout.com/prop-firm-news/myfundedfutures-rapid-eod-launch-explained>, <https://www.eltraderfinanciado.com/en/news/myfundedfutures/my-funded-futures-launches-builder-25k-july-2026>, <https://phidiaspropfirm.com/education/myfundedfutures-pro-plan>, <https://pipback.com/blog/my-funded-futures-review>
- Topstep: <https://help.topstep.com/en/articles/14289835-topstep-pricing-and-payment-questions>, <https://proptradingvibes.com/blog/topstep-trading-combine-rules>, <https://tradecovex.com/guides/topstep-combine-rules-2026>, <https://www.fundedfuturesfamily.com/topstep-activation-fee/>
- Apex Trader Funding: <https://proptradingvibes.com/blog/apex-evaluation-account-rules>, <https://phidiaspropfirm.com/education/apex-trader-funding-4-0-explained>, <https://pickmytrade.trade/prop-firm-faq/apex-trader-funding-faq/>, <https://www.eltraderfinanciado.com/en/review/apex-trader-funding>, <https://prop-memo.com/en/articles/futures-prop-firms-automation-2026-09>
- Tradeify: <https://help.tradeify.co/en/articles/10495915-growth-evaluation-accounts>, <https://www.quantvps.com/prop-firms/tradeify>, <https://tradetanto.com/learn/tradeify-rules-explained-what-every-trader-should-know>, <https://propdatalab.com/firms/tradeify/>, <https://phidiaspropfirm.com/education/tradeify-growth-vs-select-vs-lightning>
- Lucid Trading: <https://propfirms.net/blogs/lucid-trading-review>, <https://tradetanto.com/learn/lucid-trading-rules-explained-every-plan-rule-and-limit>, <https://phidiaspropfirm.com/education/lucidflex-review>, <https://proea.app/en/blog/lucid-trading-rules>, <https://spicyfutures.com/lucid-trading-rules/>
- Take Profit Trader: <https://propfirmmap.com/firms/takeprofittrader>, <https://pipback.com/blog/take-profit-trader-2026-review-payout-rules-explained>, <https://tradecovex.com/guides/take-profit-trader-rules-2026>, <https://damnpropfirms.com/futures-prop-firms/take-profit-trader/>
- Alpha Futures: <https://alpha-futures.com/how-it-works>, <https://alpha-futures.com/>, <https://www.luxalgo.com/prop-firms/alpha-futures/>, <https://propfirms.net/blogs/alpha-futures-review>, <https://tradetanto.com/learn/alpha-futures-rules-every-plan-rule-and-limit>, <https://blog.traderspost.io/article/alpha-ticks-review>
- FundedNext Futures: <https://fundednext.com/futures/legacy>, <https://fundednext.com/blog/futures-rapid-pro-rapid-daily-explained>, <https://helpfutures.fundednext.com/en/articles/15878201-is-there-any-consistency-rule-in-the-fundednext-futures-rapid-daily-challenge-and-fundednext-account>, <https://damnpropfirms.com/futures-prop-firms/fundednext/>, <https://www.eltraderfinanciado.com/en/news/fundednext/fundednext-futures-account-restructure>
- Bulenox: <https://funded.now/propfirm/bulenox>, <https://tradecovex.com/guides/bulenox-rules-2026>, <https://propscope.net/en/plans/bulenox-qualification/>, <https://www.quantvps.com/blog/bulenox-payout-rules>
- automation (all firms): <https://prop-memo.com/en/articles/futures-prop-firms-automation-2026-09>, <https://damnpropfirms.com/best-prop-firms-for-algo-trading/>

## 11. What this does not say

- **2026 only.** LIT is judged on 2026 (owner, 2026-10-18); 2021-25 has no 1m data and every plan fails more evals than it
  passes there. A plan ranking holds for any year, the pass rates do not.
- **Paper only.** Nothing here buys an account or routes an order. MFFU requires the owner to be present for live trading.
- **Rules move.** Five of these firms changed their plans between July and September 2026. Re-run
  `python tools/lit_prop_firms.py all` after editing a plan in `plans()` when a rule changes.
- **News:** LIT enters 02:00-15:30 ET, including 08:30 data releases. MFFU Builder, Topstep, Tradeify and Lucid allow news
  trading; MFFU Pro (funded), Take Profit Trader and Alpha may restrict it: check before automating there.

## Files

- `tools/lit_prop_firms.py`: the plans (rules, sources, unconfirmed fields), the eval / funded engines, `check`, `all`.
- `research/lit/prop_firms.json`: every plan with its rules and results (scaled and plain LIT size; real history, Monday
  starts, Monte Carlo, Monday Monte Carlo, funded; 2026, H1, H2, 2021-25; the skip idea for the MFFU 25K / 50K plans).
- Unit trades cache: `research/runs/_cache/lit_prop_unit.json` (gitignored; `python tools/lit_prop_firms.py unit` rebuilds it).
