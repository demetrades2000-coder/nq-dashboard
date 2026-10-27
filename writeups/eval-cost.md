## Money first

One account slot for 6 months (eval -> 2 sessions of MFFU paperwork -> funded -> payouts -> lost or 5 payouts -> buy again),
$ a month **to you** net of every eval bought. Exact replay (`tools/uprisk.py` life on the live funded sizing: 60% of the room,
<= $1,500 a trade, a winner <= $2,000; 25K at half scale). LIT trades: the 120 live 2026 trades of run `lit_live`, 2021-25 =
its 511 5m-only reference rows.

| Eval sizing (LIT) | 50K at $91.80: H1 | **H2** | 2021-25 | 25K at $63: H1 | **H2** | 2021-25 | 25K at $43: H2 |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Today** (two_week, room 80%, no weekly stop, safe_eval after session 10, no reset) | $823 | **$798** | -$7 | $375 | **$331** | -$15 | $336 |
| **Keep two_week after session 10** (`two_week_until` 999) | **$837** | **$818** | **+$7** | **$383** | **$352** | **-$9** | **$357** |
| ... with room 90% | $840 | $822 | +$7 | $389 | $355 | -$8 | $361 |
| ... with room 70% | $831 | $807 | +$4 | $377 | $344 | -$11 | $349 |
| Room 70% (safe_eval after 10) | $818 | $789 | -$7 | $369 | $322 | -$15 | $327 |
| Buy a new eval at session 10 (room 80%) | $828 | $813 | -$27 | $382 | $351 | -$29 | $358 |
| Buy a new eval at session 15 | $825 | $806 | -$23 | $380 | $344 | -$24 | $350 |
| Room 40% (cheapest per funded account in 2026) | $792 | $747 | -$15 | $365 | $308 | -$18 | $312 |

- **Keep the two_week sizing after session 10: +$14 / +$20 / +$14 a month per 50K slot, +$8 / +$21 / +$6 per 25K slot.** It is
  better in all three spans on both plans, so it passes the "2026 AND 2021-25" rule. Across the owner's 7 accounts (1 x 50K +
  2 x 25K + 4 x 50K-type) that is about **+$110-130 a month** in 2026 and keeps the 2021-25 fee drain smaller.
- The money is small because an eval is cheap next to a funded account. **Speed is what pays:** a funded 50K pays about
  $915 a month (H2), about $40 for every session it is funded earlier. A whole extra eval costs $43-$170.

## Cost of one funded account (every failed eval bought again at once)

MC 1,000 paths x 252 sessions, 5-session blocks (seed 23, as `tools/uprisk.py`). "In 20" = a funded account within 20 sessions
of the first purchase (failed evals and re-buys included). "Evals" = evals bought per funded account. LucidPro and FundedNext
evals are run on the MFFU 50K eval engine with their own soft daily loss ($1,200 / $1,000): same $3,000 target, same $2,000
EOD trailing floor (research/lit/funded_firms.json), so treat their rows as a close proxy.

| Plan at price | Eval sizing | 2026 H2: in 20 | evals | **$ per funded** | 2021-25: in 20 | evals | **$ per funded** |
|---|---|---:|---:|---:|---:|---:|---:|
| MFFU Builder 50K $91.80 | room 40% | 60% | 1.23 | $112 | 17% | 3.92 | $360 |
| | today (room 80%) | 78% | 1.40 | $128 | 34% | 3.25 | $298 |
| | **two_week after 10** | **85%** | 1.43 | $131 | **40%** | **2.77** | **$254** |
| | new eval at session 10 | 86% | 1.75 | $161 | 39% | 5.02 | $461 |
| MFFU Builder 25K $63 | today | 74% | 1.36 | $86 | 33% | 3.33 | $210 |
| | **two_week after 10** | **82%** | 1.39 | $88 | **38%** | **2.89** | **$182** |
| MFFU Builder 25K $43 | today | 74% | 1.36 | $59 | 33% | 3.33 | $143 |
| | **two_week after 10** | **82%** | 1.39 | $60 | **38%** | **2.89** | **$124** |
| LucidPro 50K $115.40 | today | 78% | 1.40 | $161 | 34% | 3.25 | $375 |
| | **two_week after 10** | **85%** | 1.43 | $165 | **40%** | **2.77** | **$320** |
| LucidPro 50K $134 | today | 78% | 1.40 | $187 | 34% | 3.25 | $435 |
| | **two_week after 10** | 85% | 1.43 | $191 | 40% | 2.77 | $371 |
| FundedNext Rapid Daily 50K $159 | today | 78% | 1.40 | $222 | 34% | 3.25 | $517 |
| | **two_week after 10** | **85%** | 1.43 | $227 | **40%** | **2.77** | **$440** |
| FundedNext 50K $169.99 | today | 78% | 1.40 | $237 | 34% | 3.25 | $552 |
| | **two_week after 10** | 85% | 1.43 | $243 | 40% | 2.77 | $471 |

- **The ranking does not change with the price** from $43 to $170: time dominates the fee everywhere. Valued at the plan's
  funded $ a month per funded session over 6 months (MFFU $915, LucidPro $938, FundedNext $629 a month H2), the two_week-after-10
  rule is the best sizing, or within $10 of the best, on every plan in H1, H2 and 2021-25 (e.g. FundedNext at $159: $3,167 vs $3,076 per slot in
  H2, -$261 vs -$356 in 2021-25).
- **The cheapest per funded account in 2026 is the slowest:** room 40% needs only 1.21-1.23 evals per funded account, but
  only 60% are funded within 20 sessions (H2), it pays $51 a month less per 50K slot, and in 2021-25 it needs 3.9 evals.
- **Price per funded account by firm (2026 H2, two_week after 10):** MFFU 25K at $43 **$60**, 25K at $63 $88, MFFU 50K $131,
  LucidPro 50K $165-191, FundedNext 50K $227-243. In a 2021-25-like year: $124 / $182 / $254 / $320-371 / $440-471.
  FundedNext is the dearest funded account and, at $629 a month, the lowest payer of the three firms (lit-funded-combo.md).
- **Prices checked 2026-10-26:** the owner's prices are used. Lucid's 40% ETFPROMO code ended 2026-10-23 ([El Trader
  Financiado](https://www.eltraderfinanciado.com/en/news/lucid-trading/lucid-trading-on-demand-payouts-40-dll-october-2026));
  other Lucid codes (PFD, VIBES, DGT) are affiliate claims ([PropTradingVibes](https://proptradingvibes.com/blog/lucid-trading-discount),
  [flux.ai](https://www.flux.ai/lucid-trading-discount-code-2026)). FundedNext: up to 50% off Rapid for new traders on its own
  help page ([FundedNext help](https://helpfutures.fundednext.com/fr/articles/16295692-offre-de-reduction-jusqu-a-50-sur-fundednext-futures-rapid-daily-rapid-pro));
  an aggregator lists the 50K at $170 and a daily-loss version at $130 ([El Trader Financiado](https://www.eltraderfinanciado.com/de/rabatte/fundednext),
  unconfirmed). Verify at checkout (prop-codes-2026-10.md).

## The owner's eval-speed scores for the change

MC 1,000 starts x 60 sessions (`tools/eval_cost.py owner`); "real order" = an eval started on every session of the half,
played on that half's real sessions (starts that can see 20 sessions).

| Builder 50K | p10 / f10 | p15 / f15 | p20 / f20 | ever passed / failed | median sessions to pass | slow passes (> 15) | real order: pass / fail in 20 |
|---|---|---|---|---|---:|---:|---|
| Today, H1 | 52.9 / 17.8 | 60.8 / 21.1 | 65.3 / 22.6 | 73.5 / 25.9 | 6 | 17.3% | 72.5 / 18.3 |
| **two_week after 10, H1** | 52.9 / 17.8 | 62.7 / 24.0 | 67.0 / 26.3 | 72.2 / 27.7 | 6 | **13.2%** | 73.4 / 21.1 |
| Today, **H2** | 58.6 / 20.9 | 61.9 / 22.9 | 63.8 / 23.8 | 71.8 / 27.2 | 5 | 13.8% | 50.8 / 32.2 |
| **two_week after 10, H2** | 58.6 / 20.9 | 64.6 / 25.2 | 67.5 / 27.3 | 70.8 / 29.2 | 4 | **8.8%** | **55.9** / 39.0 |
| Today, 2021-25 | 20.7 / 24.9 | 23.1 / 32.1 | 24.6 / 39.1 | 31.5 / 65.2 | 8 | 26.7% | |
| **two_week after 10, 2021-25** | 20.7 / 24.9 | 25.4 / 40.4 | 28.7 / 49.5 | **35.8** / 63.8 | 9 | 29.1% | |
| room 70% + two_week after 10, H2 | 57.9 / **16.5** | 64.5 / 21.7 | 68.4 / 23.4 | 73.2 / 26.8 | 5 | 11.9% | 55.9 / **23.7** |

| Builder 25K | p10 / f10 | p20 / f20 | ever passed / failed | slow passes | real order: pass / fail in 20 |
|---|---|---|---|---:|---|
| Today, H2 | 57.8 / 17.3 | 62.1 / 20.3 | 72.2 / 24.8 | 16.2% | 49.2 / 16.9 |
| **two_week after 10, H2** | 57.8 / 17.3 | 67.2 / 25.0 | 71.6 / 28.3 | **10.5%** | 57.6 / 23.7 |
| room 70% + two_week after 10, H2 | 57.6 / **9.3** | 67.9 / 17.7 | 74.8 / 24.9 | 14.2% | **66.1 / 0.0** |

- **Nothing changes inside the first 2 weeks** (the switch acts from session 11), so p10 / f10 are the same.
- **It serves the owner's "never more than 3 weeks to pass"**: slow passes fall by a third (H2 13.8% -> 8.8% on the 50K,
  16.2% -> 10.5% on the 25K), and the evals that are still open after 2 weeks are decided sooner.
- **The price:** those open evals are decided both ways, so fails within 20 sessions rise 3-5 points, and in 2026 about 1 eval
  in 100 more never passes (73.5 -> 72.2%). At $43-$170 an eval and ~$40 a funded session, the speed is worth more (the money
  table above). In 2021-25 more evals pass in the end (31.5 -> 35.8%).
- **Two neighbours for the owner's taste:** room 90% + two_week after 10 makes $3-6 a month more but fails a little more in 2
  weeks (50K f10 18.5 / 22.8). Room 70% + two_week after 10 costs $6-11 a month per slot but cuts the 2-week fails to
  13.9 / 16.5 (50K) and 8.3 / 9.3 (25K), and on the 25K's real H2 order it passed 66% in 20 sessions with 0% failed.

## Why the other levers lose

- **Resets** (buy a new eval at session 10 / 15 / 20 when not passed; MFFU's one-time plans have no reset price, so a reset =
  a new eval): as fast as keeping two_week, but 1.6-1.9 evals per funded account in 2026 and 4-5 in 2021-25 ($461 per funded
  50K). Money vs keeping two_week: -$1 to -$14 a month in 2026, -$25 to -$34 in 2021-25. Keep the owner's "no reset" rule.
- **Smaller eval risk** (room 40-60%, or the 2026-10-24 safe set room 55% + $1,200 weekly stop): fewer evals per funded
  account in 2026 (1.18-1.31), but slower and $9-51 a month less per 50K slot; worse in 2021-25.
- **Room 100% with safe_eval after 10:** as fast in 2 weeks as 90%, no better in money than keeping two_week at 80%.

## What to switch (owner decides; not done)

On the next eval, not the running one: `lit_sizing.two_week_until` from 10 to 999 in both `live_model.json` and
`live_model_lit.json` (the `after_mode` safe_eval then never acts; everything else stays). The sizing pins
(`tests/sizing_pins.py` OWNER / `live_checks`) and the docs would need the same edit. ATLAS (account B) has its own eval sizing
and was not tested here.

## How it was measured

- `python -X utf8 tools/eval_cost.py grid` (chain + 6-month value proxy + exact MFFU life per plan x price x sizing),
  `owner` (eval-speed scores), `lifetw` (exact MFFU life for the two_week_until variants) -> `research/lab/eval_cost.json`
  (keys rows / life / owner / life_tw).
- Eval = `engine/sizing.lit_qty` on live_model.json `lit_sizing` through `tools/uprisk.Eval` (A4-checked); the 25K uses the
  50K two_week settings at the 25K's target / floor / 20 micros (uprisk.md's approximation). LucidPro / FundedNext: MFFU 50K eval
  engine with their soft daily loss; their funded phase is valued at research/second/money_goal_rates.json $ a month per funded
  session in the proxy only.
- Not modelled: MFFU's 7-day inactivity rule, firm-specific eval rules beyond target / floor / soft daily loss, discount codes
  beyond the owner's prices. Paper only: no live file changed.
