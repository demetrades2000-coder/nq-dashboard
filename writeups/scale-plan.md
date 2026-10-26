## In one minute

- **Today (step 0):** LIT on the MFFU Builder 50K eval ($91.80, running) + ATLAS on an MFFU Builder 25K ($63, planned
  2026-10-26).
- **The ladder** (two accounts per step, bought a week apart; every LIT account copies the same LIT signal):

| accounts | step: add | when (all must hold) | $/month 2026-like (Jul-Oct) | H1 2026 | **2025-like** | 2021-24 | re-buy fees /mo | max at risk at once (typical / worst) | evals $ to get there | months to get there (2026-like) | reached in 24 months: 2026 / 2025-like |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **2** | LIT MFFU 50K + ATLAS MFFU 25K | today | **$1,155** | $1,533 | +$87 | +$27 | $21 | $303 / $1,609 | $155 | now | 100 / 100% |
| **4** | + LucidPro 50K (LIT) + FundedNext Rapid Daily 50K (LIT) | the first payout | **$2,850** | $3,744 | +$119 | +$3 | $64 | $694 / $2,068 | $440 | 2.1 (1.5-3.0) | 100 / 81% |
| **6** | + 2nd LucidPro (LIT) + LucidPro for ATLAS | 3 funded at once + $2,000 paid out | **$4,603** | $5,965 | +$224 | +$38 | $85 | $1,156 / $3,184 | $671 | 3.6 (2.8-4.9) | 100 / 50% |
| **8** | + 2nd FundedNext (LIT) + FundedNext for ATLAS | 4 funded + $5,000 paid out | **$6,116** | $8,964 | +$393 | +$121 | $170 | $1,601 / $3,930 | $1,011 | 5.1 (3.9-6.3) | 100 / 26% |
| **10** | + 3rd LucidPro (LIT) + 2nd FundedNext for ATLAS | 6 funded + $10,000 paid out | **$7,909** | $11,831 | +$562 | +$221 | $234 | $2,063 / $4,689 | $1,412 | 6.5 (5.1-7.9) | 100 / 13% |

  - Every step also needs: **cash** (the $300 eval budget + payouts − every fee so far) ≥ the two evals' prices, and **no
    funded account lost in the last 10 sessions**.
  - "$/month" = once you hold that step (months 7-12 of holding it): payouts to you minus re-buy fees.
  - "Monthly fees": every plan here is a **one-time** eval ($0 subscription, $0 activation; NinjaTrader and data free). The
    only running cost is re-buying evals that fail (the column).
  - "Evals $ to get there" = median of every eval bought (re-buys included) until that step's two accounts are paid.
  - Risk "typical" = every account's median trade at the same time; "worst" = the earlier accounts funded at their 1-in-20
    trade plus the two newest evals at their biggest trade.
- **Bad months (2026-like):** at 2 accounts 32% of months pay $0 or less (payouts are lumpy); at 10 accounts 6.5%, and 1
  month in 10 pays under $1,017. In a 2025-like year 70-87% of months pay nothing and 1 month in 10 costs $126 (2 accounts)
  to $1,089 (10 accounts) in re-buys.
- **The good news for a bad year:** the payout triggers stop the ladder by themselves. On 2025 trades only 50% of paths ever
  get to 6 accounts and 13% to 10 in 24 months; the whole ladder ends **about break-even after 24 months** (median +$102, 1
  in 10 −$1,659; on 2021-24 trades median −$960, 1 in 10 −$2,584). You lose eval fees, never more.
- **Next step:** buy the Builder 25K for ATLAS (planned 2026-10-26). Then wait for the first payout, and buy the LucidPro 50K
  and (a week later) the FundedNext Rapid Daily 50K.

## Why these accounts (firm rules, research/props/firms.json)

| firm | what the bot may do | used in the plan |
|---|---|---|
| MFFU | 1 funded Builder 50K + up to 2 funded Builder 25Ks per person (5 sim-funded in all); hedging across your own accounts banned; copying between your own accounts **not stated** (fair-play page bans "coordinated trades") | LIT on the 50K, ATLAS on one 25K, nothing copied at MFFU |
| Lucid (LucidPro 50K) | "automated systems and trade copiers are permitted"; 5 funded per household (one source says 10) | 3 LIT copies + 1 ATLAS = 4 |
| FundedNext (Rapid Daily 50K) | bots allowed; "copying your own accounts only"; no futures account cap found (5 live) | 2 LIT copies + 2 ATLAS = 4 |
| out | Tradeify (the same bot at another firm is against its policy), Bulenox (no copying, bots need approval), Topstep (no NinjaTrader), Apex / TPT / Alpha / Elite (ban full automation or NinjaTrader), MFFU Rapid / Rapid EOD (eval best-day rules break the 2-week rule; MFFU has not said they may sit next to a Builder) | |

- **Max contracts per account:** MFFU 25K 20 micros, every 50K here 40 (engine/multi_account.py presets).
- **Never opposite positions across your own accounts:** ATLAS never enters against LIT and is closed when LIT enters the
  other side (engine/account_b.py; the same guard must cover ATLAS copies).
- **A cross-account cap:** at most **$3,000 at risk at the same time** over all accounts (above it, every account in that
  signal is cut by the same factor, min 1 micro), and no new entry anywhere once the day's combined loss reaches $3,000.
  The typical sum never reaches it (≤ $2,063 at 10 accounts); the worst case does from 6 accounts on ($3,184-4,689). The
  cap's effect on the $ was **not modelled** (it only bites on the rare days the newest evals and the funded accounts all
  take their biggest trades together).
- **Prices:** MFFU = the owner's real prices ($91.80 / $63, his own code, confirmed by his purchases). Lucid $115.40 with
  DGT (affiliate page, 2026-10-19, unconfirmed; list $129.50-$192); FundedNext $169.99 with a code (study price,
  unconfirmed; FundedNext's own help center shows up to 50% off a first Rapid purchase). No other code is assumed. At list
  prices the step costs are $258 / $492 / $384 / $600 / $492 instead of $155 / $285 / $231 / $340 / $285.

## The bot setup per step (what has to exist before you buy)

| step | how the bot trades it | built? |
|---|---|---|
| 0 | LIT on the PC bot's own account; ATLAS = account B (`python -m engine.second --account-b "<Name>" --plan builder25k --start <day>`) | yes, account B OFF until you switch it on |
| 1 | LIT copies on Lucid + FundedNext: engine/multi_account.py extra accounts (`python -m engine.multi_account --add --id lucid50k --preset lucid_pro_50k ...`), each sized from its own eval / funded state | yes, OFF by default; Sim check first |
| 2-4 | ATLAS on a 2nd / 3rd / 4th account: account B copies with the no-hedge guard | **not built** (account B is one account today) - open work before step 2 |
| all | the $3,000 cross-account cap and the combined daily stop | **not built** (each account has its own daily loss today) |

## How it was measured

- **LIT accounts:** tools/lit_funded_combo.py's executors on the live LIT trades (t_check + BE + costs, scale-in OFF,
  variant t15_be_off), each plan's eval and funded sizing as picked there (research/lit/funded_combo.json). Check: this
  tool gives the stored 6-month numbers exactly (Builder 50K H2 $608/mo, Lucid $663, FundedNext $606).
- **ATLAS accounts:** tools/second_account_b.py (EMA + MACD + S/R, no-hedge against LIT, "need" eval size =
  engine/account_b.qty, safe funded size $150 on the 25K / $300 on a 50K). Check: Builder 25K H1 2-week pass 68.9% = stored.
  ATLAS on Lucid / FundedNext uses the Builder 50K eval numbers (same $3,000 / $2,000 / $1,000; Lucid's $1,200 daily loss
  not used) with that firm's payout rules (Lucid 90%, ≤ $2,000, 40% best day; FundedNext 90%, ≤ $1,200, no consistency,
  5 rewards): **an approximation, not a study of those rules.**
- **Paths:** bootstrap paths in 5-session blocks from each span (2026 H1, 2026 H2, 2025, 2021-24), the same path for every
  account: 1,000 paths of 12 months for the steady $ (all accounts of a step held from the start, a week apart; months
  7-12), 600 paths of 24 months for the ladder (start at step 0, each step bought the session after its trigger).
  A failed / stuck eval or a lost / finished funded account is re-bought the next session.
- **Risk:** every trade's $ at risk recorded per account type and phase on 200 H2 paths: LIT 50K eval median $309 / max
  $981, funded $180 / $408; ATLAS 25K eval $178 / $628, funded $123 / $147; ATLAS 50K eval $312-318 / $1,130-1,255, funded
  $258 / $300.

## Be honest about it

- **2026 is one good year.** LIT's 2021-25 PF is 1.01; ATLAS loses a third of its evals within 2 weeks in 2025 and 2021-24.
  The 2026 columns are a bet that 2026 continues; the 2025 / 2021-24 columns are what a bad year looks like.
- **Thin samples:** H2 2026 is 75 sessions (~40 LIT trades, ~48 ATLAS trades); the Monte Carlo re-uses those weeks. The
  H1 column (picked half) is higher than H2 at every step.
- **Same signals:** the LIT accounts are 81-91% correlated. More accounts = more money and the same bad months.
- **Not modelled:** the move to a live account after 5 sim payouts (MFFU, Lucid) - the path buys a new eval instead
  (conservative); MFFU's answer on copying; the $3,000 cap's cost; ATLAS's own Lucid / FundedNext rules.
- **Found on the way:** after session 10 the ATLAS eval size (safe_eval, 60% of the room) can risk more than the soft
  daily loss on one trade (25K up to $628 vs $600; 50K up to $1,255 vs $1,000). Worth a guard in engine/account_b.qty
  before account B goes live.

## Where it lives

- Research: `tools/scale_plan.py` -> `research/second/scale.json` (`python -X utf8 tools/scale_plan.py`, ~6 min;
  `check`, `table`).
- Live status (read-only): `engine/scale_plan.py` - "you are at step N; next step: <action> when <trigger>; progress X%"
  from research/props/business.json (accounts with `strategy` LIT / ATLAS, stages, payouts / expenses logs) + the PC bot
  (LIT eval via engine/eval_life, extra accounts, account B) or the PC heartbeat in the cloud.
- Pages: phone Money > Scaling plan (`tools/web_public/scale.js` + `scalecore.js`, data.json `scale`), PC Data > Scaling
  plan (`web_next/js/next/scale.js`, `/api/next/scale`). Tests: `python -X utf8 -m tests.test_scale_plan [--quick]`.
