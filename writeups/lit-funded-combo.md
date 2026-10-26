## For the owner (one minute)

- **What to buy, in this order** (only firms whose rules allow the bot):
  1. **MFFU Builder 50K** ($91.80), the eval you already run.
  2. **LucidPro 50K** ($115.40 with a code, daily-loss option on).
  3. **FundedNext Rapid Daily 50K** ($169.99 with a code).
  4. Then, from the payouts: **a 2nd LucidPro**, a 3rd LucidPro, a 2nd FundedNext.
- **Expected money, 6 months from buying, net of every fee** (Monte Carlo on the 2026 trades; Jul-Oct = the check half, quote it):

  | | Jan-Jun (picked) | **Jul-Oct (quote)** | 2021-25 (reference) |
  |---|---:|---:|---:|
  | Current plan: Builder + Lucid + FundedNext ($377 up front) | $2,530/mo | **$2,530/mo** | −$101/mo |
  | ... months 4-6 (all funded by then) | $3,214/mo | **$3,182/mo** | $80/mo |
  | ... the 6 months lose money | 3.0% | **2.6%** | 89% |
  | ... all three pay $0 in months 4-6 | 5.9% | **5.1%** | 90% |
  | Same plan on the OLD live trades (lit-funded-firms.md) | $2,315 | $1,754 | −$92 |
  | **$300 budget**, buy in the order above as cash allows | $3,022 | **$3,280** | −$25 |
  | **$600 budget** | $4,135 | **$4,251** | −$38 |
  | **$1,000 budget** | $4,907 | **$5,090** | −$64 |

- **The new live LIT makes the funded plan pay ~45% more** on Jul-Oct ($2,530 vs $1,754). About $650 a month of that is the
  scale-in and the rest is the 15-minute check / BE+1.25 (the plan on t_check + be_off without scale-in: $1,877).
- **Eval speed (your rule: decided in 2 weeks, never more than 3 to pass):** Builder, Lucid and FundedNext pass 46-55% of
  evals within 10 sessions, with 0-2.3% failed (median pass 6-9.5 sessions). The MFFU Rapid / Rapid EOD evals **break the
  rule** (0-12% in 2 weeks, median pass 26-45 sessions).
- **Losing a funded account in 6 months** (Jul-Oct): Builder 0.9%, Lucid 1.5%, FundedNext 0.9%, 25K 2.9%, Rapid EOD 5.1%,
  Rapid 14.7%.
- **Same trades on every account:** the accounts' results are 81-91% correlated. More accounts mean more money and the same
  luck: about 1 path in 20 has every account paying nothing in months 4-6.
- **2021-25 (LIT PF 1.01, no 1m data, scale-in never acts there):** every account and every mix loses its fees. A small
  budget limits that loss (the $300 buyer loses ~$25 a month, ~$280 at most). This is a bet that 2026 continues.
- **Before you buy:** the bot routes to **one account today**. Two or more accounts need multi-account routing plus a
  per-account sizing state (room, floor, payouts, the funded mode). That work is **not built**. Ask Lucid and FundedNext in
  writing whether the same bot may also run on your MFFU account. Ask Lucid how many accounts per household (5 per one
  source). FundedNext's cap was not found.

## Per firm (each account alone, new live LIT)

Eval = a fresh eval on every session of the half, no reset, up to 60 sessions. Funded / 6 months = Monte Carlo, 1,500 paths
of 126 sessions in 5-session blocks. "6 months net" = buy the eval; pass → funded; fail / lost / finished → buy again; payouts
to you minus every fee. H1 = Jan-Jun 2026 (picked), H2 = Jul-Oct (check).

| account (price) | can the bot run there? | eval p10 / f10 H1 · H2 | dec10 H1 · H2 | eventual pass H1 · H2 | pass_med · slow_pass H2 | funded $/mo H1 · **H2** | funded lost 6 mo H1 · H2 | **6 months net $/mo H1 · H2** | months 4-6 H2 | old trades 6-mo H2 |
|---|---|---|---|---|---|---|---|---|---|---|
| **MFFU Builder 50K** ($91.80) | yes | 54.7 / 2.3 · 55.1 / 0.0 | 57.0 · 55.1 | 79.7 · 91.0% | 6 · 35% | $834 · **$884** | 0.3 · 0.9% | **$682 · $721** | $959 | $562 |
| **LucidPro 50K** ($115.40) | yes | 46.1 / 0.0 · 51.3 / 0.0 | 46.1 · 51.3 | 85.9 · 91.0% | 6 · 35% | $971 · **$1,079** | 0.5 · 1.5% | **$772 · $880** | $1,146 | $631 |
| **FundedNext Rapid Daily 50K** ($169.99) | yes | 46.1 / 0.0 · 51.3 / 0.0 | 46.1 · 51.3 | 85.9 · 91.0% | 6 · 35% | $820 · **$736** | 0.9 · 0.9% | **$1,076 · $929** | $1,077 | $561 |
| FundedNext Rapid Pro 50K ($169.99) | yes | same as Rapid Daily | | | | $519 · $561 | 0.4 · 1.3% | $396 · $443 | $577 | $310 |
| MFFU Builder 25K ($63) | unclear next to the 50K | 45.3 / 4.7 · 50.0 / 0.0 | 50.0 · 50.0 | 75.0 · 87.2% | 9 · 37% | $392 · $381 | 2.6 · 2.9% | $311 · $301 | $405 | $219 |
| MFFU Rapid EOD 50K ($94.20) | unclear next to the Builder; funded news ban | 0 / 0 · 0 / 0 | 0 · 0 | 47.7 · 64.1% | 38 · 100% | $4,296 · $2,264 | 3.9 · 5.1% | $2,184 · $1,265 | $1,990 | $841 (no news rule) |
| MFFU Rapid 50K ($94.20, monthly) | as Rapid EOD; intraday floor funded | 6.2 / 0 · 11.5 / 0 | 6.2 · 11.5 | 76.6 · 85.9% | 26 · 73% | $3,964 · $1,926 | 16.7 · 14.7% | $3,045 · $1,361 | $1,955 | $982 |

- The engine's own eval path (the live `two_week` sizing, `lit_adopt_all3_eval`) gives the Builder 50K 58.0 / 2.5 (H1) and
  52.2 / 0.0 (H2) within 2 weeks. The table's 54.7 / 55.1 uses the same "one winner passes" rule in the funded-firms
  executor, so all firms are scored the same way.
- Sizing picked on H1 per plan (`research/lit/funded_combo.json` → `plans[].results`):
  - **Builder 50K:** eval = live two_week → safe_eval. Funded = mode `funded` (40% of the room, max $800, a winner ≤ $1,500)
    with the payout habit (ask only once $1,500+ sits above the buffer).
  - **Lucid:** eval "one winner passes", ≤ 40% of the room, ≤ $600 risk (the cap matters more now, because the adds come
    on top). Funded = 60% of the room, max $1,200, a winner ≤ $1,500, payout habit on.
  - **FundedNext Rapid Daily:** eval as Lucid. Funded = 40% of the room, max $800, no winner cap, no habit (its $1,200 payout
    cap makes waiting worthless: the habit makes it pay $0).
  - **25K:** eval as the 50K, ≤ $600. Funded = 40% of the room, max $1,200, a winner ≤ $2,500.
  - **Rapid EOD / Rapid:** "one winner passes" with the best-day guard. Funded = 60% of the room, max $800, no cap, habit on.
- **Why FundedNext beats Lucid over 6 months but not per funded month:** FundedNext pays daily (first payout ~17 sessions
  after funding vs ~28-33), but its $1,200 cap and the end after 5 rewards make you buy a new eval every 3-4 months (fees
  $365-392 in 6 months vs $140).

## The stacks (same paths: the accounts win and lose together)

| stack | cash up front | 6 mo net $/mo H1 · **H2** | months 4-6 H2 | P(months 4-6 ≥ $2,000) H2 | 6 mo lose money H2 | all pay $0 in months 4-6 H2 | any account pays $0 in months 4-6 H2 | any funded account lost H2 | 2021-25 $/mo |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| Builder 50K alone | $92 | $682 · **$721** | $959 | 4.7% | 5.9% | 10.2% | 10.2% | 0.4% | −$26 |
| Builder + Lucid | $207 | $1,454 · **$1,601** | $2,105 | 51.0% | 3.2% | 6.9% | 11.6% | 1.5% | −$54 |
| **current: Builder + Lucid + FundedNext** | $377 | $2,530 · **$2,530** | $3,182 | 72.7% | 2.6% | 5.1% | 14.5% | 2.2% | −$101 |
| current + 1 Rapid EOD | $471 | $4,714 · **$3,795** | $5,172 | 79.0% | 2.6% | 4.7% | 24.8% | 4.5% | −$118 |
| current + 25K a week later | $440 | $2,828 · **$2,816** | $3,583 | 75.9% | 2.3% | 4.5% | 15.6% | 4.6% | −$127 |
| current + 25K the same day | $440 | $2,840 · $2,831 | $3,587 | 75.5% | 2.5% | 4.6% | 15.5% | 4.7% | −$126 |
| current + Rapid EOD + 25K a week later | $534 | $5,013 · **$4,081** | $5,573 | 80.7% | 2.3% | 4.3% | 24.8% | 6.8% | −$144 |
| current + 2nd Lucid a week later | $493 | $3,261 · **$3,373** | $4,341 | 82.6% | 2.4% | 4.5% | 14.5% | 2.6% | −$130 |
| current, Lucid + FundedNext a week after the Builder | $377 | $2,442 · $2,449 | $3,183 | 72.9% | 2.3% | 5.1% | 14.8% | 2.4% | −$101 |

- **The 25K is the weakest add-on:** +$286 a month (H2) for $63. A 2nd LucidPro adds +$843 for $115, has no MFFU
  permission question and is the better 4th account. Starting the 25K a week later makes the same money as the same day
  (correlation of its payouts with the 50K 0.81 vs 0.87), and 6-month losses drop a little (2.5 → 2.3%).
- **Rapid EOD:** +$1,265 a month (H2), the most of any add-on. But Jan-Jun / Jul-Oct differ by 2x ($2,184 vs $1,265 alone),
  1 path in 5 loses money over its 6 months (long eval), its eval breaks the 2-week rule, and MFFU has not said it can sit
  next to a Builder 50K. **Hold it until MFFU answers in writing** (questions in `lit-mffu-rapid-stack.md`).
- **Staggering a week** (Lucid + FundedNext a week after the Builder) costs ~$80 a month and does not lower the shared
  risk. The correlation is in the trades, not in the start day.

## How many evals, and when (cash budget)

A cash-limited buyer: the budget is the cash in the pocket. Accounts are bought in a fixed order whenever cash (budget −
fees paid + payouts received) covers the price. A failed eval, a lost funded account or a finished one (FundedNext after 5
rewards) frees its slot, which is bought again when the cash allows. All mixes of up to 6 accounts were scored (Builder ≤ 1,
Lucid ≤ 3, FundedNext ≤ 2, Rapid EOD ≤ 3, 25K ≤ 1), bought on the same day or a week apart: 291 mixes per budget, picked on
H1, checked on H2. 1,000 paths. 6 accounts was the cap tested; more accounts kept adding money.

**The H1 pick is the same for every budget among the confirmed firms:** Builder → Lucid → FundedNext → Lucid #2 → Lucid #3 →
FundedNext #2. The budget only decides how many you can buy on day 1. The rest are bought from payouts.

| accounts in the order above (H2 $/mo · 6 months lose money · avg cash ever out of pocket) | $300 | $600 | $1,000 |
|---|---|---|---|
| 1: Builder | $725 · 6.0% · $112 | $727 · 5.6% · $113 | $727 · 5.6% · $113 |
| 2: + Lucid | $1,556 · 6.4% · $224 | $1,614 · 3.5% · $241 | $1,615 · 3.5% · $241 |
| 3: + FundedNext | $2,026 · 6.4% · $224 | $2,495 · 3.6% · $407 | $2,547 · 2.9% · $428 |
| 4: + Lucid #2 | $2,418 · 6.4% · $224 | $3,283 · 5.9% · $510 | $3,420 · 3.6% · $551 |
| 5: + Lucid #3 | $2,810 · 6.4% · $224 | $3,735 · 5.9% · $510 | $4,249 · 3.7% · $656 |
| **6: + FundedNext #2** | **$3,280** · 6.6% · $224 | **$4,251** · 6.4% · $510 | **$5,090** · 4.3% · $808 |
| same 6, a week apart | $3,292 · 5.5% | ($4,043 · 4.0%, top-3 list) | $4,503 · 2.6% · $758 |
| 2021-25 reference, 6 accounts | −$25/mo, at most ~$280 lost | −$38/mo, ~$570 | −$64/mo, ~$940 |

- **$300:** buy the Builder and a LucidPro now ($207). Buy each next account from the first payouts (FundedNext at $170
  comes once ~$80 has been paid out). On average only $224 of the $300 is ever spent.
- **$600:** Builder + Lucid + FundedNext + Lucid #2 on day 1 ($493). The rest come from payouts.
- **$1,000:** all six on day 1 ($778) plus re-buys. Buying a week apart costs ~$590 a month but cuts the chance that the
  6 months lose money from 4.3% to 2.6%.
- **If MFFU allows Rapid EOD** (all mixes, H1 pick), the best mixes swap Lucid #2/#3 and FundedNext #2 for 3 Rapid EOD:
  - $300: 3 Rapid EOD + 25K: $6,609 H1, **$3,818 H2**, but 21% lose money in 6 months.
  - $600: Lucid + FundedNext + 3 Rapid EOD + 25K: $8,408, **$5,626 H2**, 7.3% lose.
  - $1,000: Lucid + 2 FundedNext + 3 Rapid EOD: $9,333, **$6,444 H2**, 3.8% lose.

  In the fixed ladder (Builder, Lucid, FundedNext, then 3 Rapid EOD) it gives $3,392 / $5,415 / $6,278 (H2). The
  Jan-Jun / Jul-Oct gap is large: quote H2. All of it sits at one firm, and the Rapid EOD eval takes ~2 months.

## Where scale-in meets the firms' rules

- **Max contracts:**
  - The add never pushes past the plan's cap (`scale_in_qty` max_micros). Builder 50K, Lucid (4 minis = 40 micros),
    FundedNext Rapid Pro and the 25K (20 micros) never hit their cap: the 60%-of-room budget binds first.
  - FundedNext Rapid Daily (40 micros) hits it on 3.7% of add trades (H1), MFFU Rapid (50) on 3.1%, and Rapid EOD
    (3 minis = 30 micros) on 6.3%. H2 has no hits on any plan.
  - Check each firm's micro-to-mini ratio: 30 micros is the Rapid EOD's stated cap.
- **Best-day / consistency rules at payout** (Builder 50%, Lucid 40%, FundedNext Rapid Pro 40%; the 25K is modelled with
  50%). This is where scale-in matters most:
  - The funded size already caps a winner at $1,500. An add on top would make the day too big, and the payout waits until
    the account earns that day again.
  - The H1 pick **trims the add so the day's win at the target stays inside the cap**. On these accounts only 10-17% of
    the wanted add micros survive.
  - Lucid uncapped: $785 vs $981 a month (H1). Builder uncapped: $788 vs $841 (H1). But H2 says the Builder does better
    uncapped ($944 vs $884). **Keep the cap on Lucid; the Builder is a coin-flip, keep the cap (picked).**
  - FundedNext Rapid Daily and the MFFU Rapids have no payout consistency rule: there the adds run free (61-76% of the
    wanted micros) and pay the most.
- **Eval best-day rules** (Rapid 50%, Rapid EOD 30%): trimming the add inside the rule's window helps a little (Rapid EOD
  eventual pass 47.7 vs 46.9% H1, 64.1 vs 62.8% H2). Builder / Lucid / FundedNext evals have no consistency rule. Scale-in
  raises their 2-week pass from 34-37% to 46-51% at the same sizing.
- **MFFU Rapid funded Tier-1 news ban** (flat from 2 min before to 2 min after CPI, NFP, FOMC, FOMC minutes; real
  calendar):
  - It hits 5 trades in 2026, and **4 of the 5 carry a scale-in add**: 01-09, 10-02, 10-07 and the 10-14 CPI short.
  - Jul-Oct loses 501 points of the base entries (35% of H2's points) plus the adds on those days. An add filled before
    the release is flattened with the trade; one that would fill later never happens.
  - The Rapid EOD H2 numbers above already include this.
- **Daily loss limits:** the add's risk stays inside the soft daily loss left today (Builder $1,000, Lucid $1,200,
  FundedNext $1,000, 25K $600) and inside 60% of the room, as in the live rule.

## How it was measured

- **Trades:** `engine/lit.py` run_x on `live_model.json` "lit" (t_check 15 min / 0.3 / 0.5, scale_in pb 0.25 f 1 rat_k 1
  min_rk 2 n 1, be_off 1.25), 630 trades (2026: 120, 52 with an add; 2021-25 on 5m bars, so t_check and scale_in never act
  there). Units: per-micro points of the first entry, worst / best open points, the weekly-stop multiplier, and each add's
  stop distance, distance from the entry, points and worst open points. $1.90 a micro round trip, 1 tick of slippage.
- **Check:** with the options off, the new units equal the `lit_live` cache exactly (630/630). The executor reproduces
  `lit_funded_firms.py` exactly (Builder / Lucid / FundedNext eval H1 p10/f10/p60 and funded H2 $/mo and loss:
  `python -X utf8 tools/lit_funded_combo.py check`).
- **Adds:** `engine/sizing.scale_in_qty`, the live rule: 1 × the first entry's micros, open add risk ≤ the first entry's $
  risk, ≤ 60% of the room, ≤ the soft daily loss left, total ≤ the plan's max contracts. The add's best open profit (for
  the Rapid's intraday floor) is the trade's best open price minus the add's distance.
- **Eval / funded / 6 months / stacks:** the engines and Monte Carlo paths of `tools/lit_funded_firms.py` (same seeds, so
  every plan and stack shares its paths). Rapid plans use `tools/lit_mffu_rapid_stack.py`'s "plan" eval sizing grid and
  real Tier-1 calendar. Picks on H1:
  - eval by eventual pass − fail + ½ p15 (best-day plans: p15 − f15 + ½ (p60 − f60));
  - funded by the 24-point grid of `lit_funded_firms`, then two toggles on the pick (add best-day cap, payout habit).
  - The Builder 50K keeps the live eval sizing and the documented funded mode.
- **Fees:** the owner's MFFU prices (Builder 50K $91.80, 25K $63; Rapid / Rapid EOD $94.20 assumes the 40% code on $157,
  Rapid modelled monthly). Lucid $115.40 and FundedNext $169.99 with October codes (`lit-funded-firms.md`). No activation
  fees.
- **Not modelled:** payout processing days; a firm denying a payout; going live after 5 MFFU / Lucid payouts (that account
  stops paying and a new eval is bought); taxes; multi-account routing (not built).
- **The reference without scale-in** (t_check + be_off only) is in the same JSON (`t15_be_off`): current plan $1,877 a
  month H2 (H1 $2,588).

## Files

- `tools/lit_funded_combo.py`: units, the add-aware eval / funded executor, plans, stacks, the budget buyer, `check`,
  `all`, `save`.
- `research/lit/funded_combo.json`: every number here (`all3` = new live LIT, `t15_be_off` = no scale-in reference).
- `research/runs/_cache/lit_fc_units_{all3,t15_be_off,base}.json`: the trade units.
- Runs: `lit_fc_<plan>` (back-to-back real-history funded trades per plan, numbers in the verdict) and `lit_fc_stack_current`,
  `lit_fc_stack_rapid_eod`, `lit_fc_stack_25k_week`.
