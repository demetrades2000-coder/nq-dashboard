## Money first

| Plan (LIT, MFFU, 6 months, net of every eval bought) | H1 Jan-Jun (pick) | **H2 Jul-Oct (check, quote this)** | 1 in 10 paths (H2) | 6 months lose money (H2) | 2021-25 (reference) |
|---|---:|---:|---:|---:|---:|
| Today: 1 x Builder 50K, today's eval + funded sizing | $740/mo | **$663/mo** | $171/mo | 9.6% | -$27/mo |
| Uprisk sizing on the 50K (step 1 + step 2 below) | $823/mo | **$798/mo** | | 7.6% | -$7/mo |
| MFFU in full: 50K + 2 x 25K, uprisk funded sizing | $1,536/mo | **$1,411/mo** | $301/mo | 5.7% | -$47/mo |
| 3 x 50K-type accounts (MFFU + 2 other firms), uprisk | $2,394/mo | **$2,304/mo** | $472/mo | 4.1% | -$40/mo |
| 5 x 50K-type accounts, uprisk | $3,955/mo | **$3,752/mo** | $883/mo | 2.4% | -$63/mo |

- "Net" = everything paid to you (MFFU's 80%) minus every eval bought ($91.80 / $63), over 6 months from buying the eval,
  including the eval itself, 2 sessions of MFFU paperwork and the wait for the first payout. A failed eval, a lost funded
  account or a finished one (5 payouts) is bought again at once.
- **What you were missing: the money is made, but it cannot come out faster.** The funded 50K makes about **$1,950 a month**
  of trading profit on the 2026 trades, but only about **$1,050 a month** is paid out ($835-889 to you). The rest piles up:
  after 6 months a typical account still holds about **$5,400** above its start. The limits are MFFU's payout rules, not the risk.
- **Uprisking the trade size alone barely helps:** $800 → $1,500 a trade adds $3 (H1) / $62 (H2) a month. The one sizing
  change that pays is a bigger **winner cap** ($1,500 → $2,000, so one winner is one full $2,000 request): +$40 / +$80 a month
  and the first payout about 2 weeks sooner. The big jump comes from **more accounts**.
- **Risk of ruin, plainly:** in 1,000 simulated 6-month funded accounts per setting, **no funded account was lost**, in either
  half or on 2021-25: the sizing shrinks with the room to the floor. The biggest single trade goes from $422 to $845 of risk
  (21% → 42% of a fresh account's $2,000 room; only reached once the account has built room). What you can really lose is **eval fees**. In a
  2021-25-like year (LIT PF ~1.0) 80-94% of 6-month windows lose money: about $7-63 a month in fees, never more.

## 1. Where the money is capped today

One funded Builder 50K with today's funded rule (40% of the room, at most $800 a trade, a winner at most $1,500), 1,000
accounts of 6 months each:

| | H1 | H2 | 2021-25 |
|---|---:|---:|---:|
| Trading profit made in the account, a month (gross) | $1,962 | $1,938 | $19 |
| Paid out, a month (gross) | $1,112 | $1,044 | $59 |
| **To you (80%), a month** | **$889** | **$835** | $47 |
| ... months 4-6 only (after the first payout) | $981 | $947 | |
| Left in the account after 6 months (above the start, incl. the $2,100 buffer) | $5,105 | $5,366 | -$239 |
| Extra money above the buffer at each payout, over the $2,000 request max | $1,426 | $1,512 | $28 |
| Sessions the money was there but the 50% best-day rule held it (of 126) | 37 | 38 | 1 |
| Payouts in 6 months | 3.4 | 3.2 | 0.2 |
| Reached 5 payouts (= $8,000 to you; the account moves to live) | 30% | 23% | 0% |
| First payout (median funded session) | 33 | 33 | 67 |
| Account lost | 0.0% | 0.0% | 0.0% |

Which limit binds, in order:
1. **The $2,000 request max + the 50% consistency rule (together).** Each payout leaves about $1,500 above the buffer that
   MFFU will not pay in that request, and the next request waits for a new cycle in which no day is more than half of the
   cycle's profit. LIT wins in lumps (an 8R target day), so a cycle needs a 2nd winner: the money waits about 38 sessions
   in 6 months.
2. **The 5-payout limit.** A sim-funded account can pay you at most 5 x $2,000 x 80% = **$8,000**, then MFFU moves it to live
   (Blue Row Capital: daily payouts, no consistency rule, but **you must be present**, and the bot never arms it; not
   modelled). Today 23-30% of accounts get there in 6 months, so for most accounts this cap is still ahead.
3. **The number of accounts.** Each account pays about the same whatever the risk, so the money grows with the count
   (section 4).
4. **Not binding:** per-trade risk (section 2), payout timing (asking at $500 / $1,000 / $2,000 above the buffer instead of the
   owner's $1,500: $855 / $881 / $871 vs **$889** H1; $794 / $815 / $824 vs **$835** H2, so keep the $1,500 line), and
   account losses (0%).

## 2. The funded risk frontier (50K and 25K)

Picked on H1, checked on H2. MC 1,000 accounts x 126 sessions (600 per row on the 50K grid: same seed, same paths).
"Winner cap" = the target may pay at most this (the 50% rule lever). Every row loses 0.0% of accounts in 6 months.

**Builder 50K**

| Max risk a trade | Room % | Winner cap | $/mo H1 | **$/mo H2** | First payout H1 / H2 (sessions) | Payouts in 6 mo H2 | 5 payouts in 6 mo H2 | Biggest trade risk H2 | 2021-25 $/mo |
|---:|---:|---|---:|---:|---|---:|---:|---:|---:|
| $400 | 40 | $1,500 | $793 | $510 | 39 / 57 | 2.1 | 4% | $274 | |
| $600 | 40 | $1,500 | $846 | $671 | 36 / 41 | 2.6 | 9% | $352 | |
| **$800 (today)** | **40** | **$1,500** | **$889** | **$835** | 33 / 33 | 3.2 | 23% | $422 | $47 |
| $800 | 70 | $1,500 | $898 | $863 | 31 / 30 | | 25% | $422 | |
| $1,000 | 50 | $1,500 | $882 | $856 | 33 / 30 | 3.3 | 26% | $563 | |
| $1,200 | 50 | $1,500 | $888 | $875 | 33 / 29 | 3.4 | 29% | $634 | |
| $1,500 | 60 | $1,500 | $892 | $897 | 32 / 29 | 3.4 | | $634 | |
| $1,500 | 60 | none | $746 | $679 | 33 / 29 | 2.6 | | $988 | |
| $1,500 | 50 | need-based | $468 | $555 | 58 / 40 | 2.1 | | $769 | |
| $1,500 | 60 | $1,000 | $761 | $699 | 48 / 48 | | 16% | $482 | $23 |
| $1,500 | 60 | $1,200 | $821 | $852 | 41 / 35 | | 27% | $493 | $39 |
| **$1,500** | **60** | **$2,000** | **$929** | **$915** | **26 / 23.5** | 3.5 | **36%** | **$845** | **$66** |
| $1,500 | 70 | $2,000 | $933 | $915 | 26 / 23 | | 37% | $845 | $71 |
| $1,500 | 60 | $2,500 | $939 | $893 | 27 / 24 | | 34% | $845 | $55 |
| $1,200 | 50 | $2,000 | $874 | $879 | 26 / 26 | | 30% | $704 | $59 |

- **The knee:** with the $1,500 winner cap the money is flat from $800 up (a $1,500 cap adds $3 / $62). The only step
  that holds in both halves is the **$2,000 winner cap with 60% of the room and at most $1,500** (+$40 / +$80 a month, first
  payout ~10 sessions sooner, 36% vs 23% reach 5 payouts in 6 months). 70% of the room or a $2,500 cap is no better on H2.
- **No winner cap is worse** (-$143 / -$156): one big day trips the 50% rule. **Need-based** (risk only what reaches the next
  full payout) is much worse: small winners, slow cycles. A **harvest** idea (1 micro once the next request is banked) pays
  $736 / $684 (rejected: the cycle's big day still needs a 2nd winner). The **consistency-aware cap** on top of the
  candidate: $837 / $873 (rejected, as in funded-path.md).
- **Real 2026 path** (one account from the half's first session): today's rule H1 5 payouts / $8,000 (first at session 22),
  H2 1 payout / $1,600 (session 67). The candidate: H1 5 payouts / $8,000 (first at **session 4**), H2 **2 payouts / $3,094**
  (sessions 51 and 75).
- **The gain is speed, not size:** months 4-6 pay about the same ($939 / $909 vs $981 / $947); the candidate pays earlier
  and reaches the $8,000 end sooner, which frees the account for the next eval.

**Builder 25K** (the same rule at half scale)

| Max risk | Room % | Winner cap | $/mo H1 | **$/mo H2** | First payout H1 / H2 | Biggest trade H2 |
|---:|---:|---|---:|---:|---|---:|
| **$400 (today)** | 40 | $750 | $329 | **$389** | 47 / 34 | $211 |
| $750 | 60 | $750 | $352 | $402 | 43 / 33 | $282 |
| $750 | 60 | none | $347 | $305 | 32 / 29 | $587 |
| $500 | 50 | need-based | $333 | $360 | 40 / 34 | $384 |
| **$750** | **60** | **$1,000** | **$445** | **$405** | 26 / 25 | $422 |
| $750 | 70 | $1,000 | $450 | $412 | 26 / 24 | $422 |

- The 25K follows the 50K: the winner cap at one full request ($1,000) is the step that holds in both halves (+$116 / +$16
  a month). 0% lost in every row.

## 3. Eval uprisk: risk more, reset more?

LIT on the Builder 50K eval. MC 1,000 starts x up to 60 sessions; "rolling" = one start per real session (the A4 check:
today's 57.1 / 50.7 matches A4 exactly). $ per pass = $91.80 / the share of evals that ever pass.

| Eval sizing | Pass in 10 / fail in 10, H1 | **H2** | Ever passed H1 / H2 | $ per pass H1 / H2 | Median sessions to pass H2 | 2021-25 pass / fail in 10 |
|---|---|---|---|---|---:|---|
| **Today** (two_week, room_f 0.55, weekly loss $1,200, safe_eval after 10) | 53.0 / 3.6 | **53.7 / 2.2** | 82.8 / 79.7 | $111 / $115 | 6 | 15.6 / 4.0 |
| room_f 0.7 | 53.4 / 5.3 | 55.8 / 5.3 | 81.7 / 78.2 | $112 / $117 | 6 | 17.5 / 10.5 |
| room_f 0.8 | 54.3 / 6.9 | 56.8 / 9.8 | 81.9 / 76.9 | $112 / $119 | 5 | 18.4 / 15.1 |
| room_f 1.0 | 55.3 / 9.0 | 57.8 / 12.6 | 80.9 / 76.5 | $114 / $120 | 5 | 18.8 / 19.9 |
| room_f 0.8, need_buf 1.5 | 50.8 / 8.5 | 53.4 / 11.9 | 78.4 / 73.9 | $117 / $124 | 6 | 17.2 / 18.4 |
| **room_f 0.8, weekly loss stop off** | 52.9 / 17.8 | **58.6 / 20.9** | 73.5 / 71.8 | $125 / $128 | 5 | 20.7 / 24.9 |
| today, buy a new eval at session 10 | 53.0 / 47.0 | 53.7 / 46.3 | 53.0 / 53.7 | $173 / $171 | 4 | 15.6 / 84.4 |
| room_f 1.0, weekly stop off, new eval at 10 | 53.4 / 46.6 | 59.6 / 40.4 | 53.4 / 59.6 | $172 / $154 | 4 | 21.3 / 78.7 |
| max 20 micros (room_f 0.8) | 54.3 / 6.9 | 56.8 / 9.8 | 81.9 / 76.9 | $112 / $119 | 5 | 17.2 / 15.0 |

- **LIT's 2-week pass rate has a ceiling (~55-60%)** whatever the size: more risk mostly turns "still open" into "failed".
  A pass costs $111-173, while a funded 50K pays thousands, so the eval sizing is a small lever either way.
- **The whole slot (eval → funded → payouts → next eval), $ to you net of evals, a month:**

| Eval __ funded sizing | H1 | **H2** | Evals bought in 6 mo H2 | Funded accounts in 6 mo H2 | First payout (session from the eval start) H2 | 2021-25 |
|---|---:|---:|---:|---:|---:|---:|
| today __ today | $740 | **$663** | 1.4 | 1.06 | 52 | -$27 |
| today __ candidate | $804 | $766 | 1.5 | 1.12 | 43 | -$14 |
| **room_f 0.8 + weekly stop off __ candidate** | **$823** | **$798** | 1.7 | 1.15 | 40 | **-$7** |
| room_f 1.0 + weekly stop off + new eval at session 10 __ candidate | $835 | $815 | 2.1 | 1.18 | 37 | -$23 |
| today + new eval at session 10 __ candidate | $815 | $793 | 2.2 | 1.15 | 40 | -$46 |

- **Answer:** yes, risking more on the cheap eval pays a little: +$19 / +$32 a month per 50K slot for room_f 0.8 with the
  weekly loss stop off. Buying a new eval at session 10 adds another +$12 / +$17, but it breaks the 2026-10-18 "no reset" rule,
  costs $46 a month in a 2021-25-like year (vs $7) and fails 4 in 10 evals by design. That is not worth it: keep "no reset".
- The price: about 1 eval in 5 fails within 2 weeks (today 1 in 28-45), and only 72-74% of evals ever pass (today 80-83%).
  Evals at $91.80 make that cheap.

## 4. More accounts (correlated: the same LIT trades)

The book was played on the same Monte Carlo paths, so the accounts win and lose together. Each account was bought a week
(5 sessions) after the one before, with today's eval and the candidate funded sizing.

| Book | H1 | **H2** | 1 in 10 (H2) | Every account pays $0 in 6 mo (H2) | Correlation of 2 accounts | 2021-25 |
|---|---:|---:|---:|---:|---:|---:|
| MFFU 50K | $804 | **$766** | $202 | 8.6% | | -$14 |
| **MFFU 50K + 2 x 25K** (MFFU's per-person limit) | $1,536 | **$1,411** | $301 | 5.7% | 0.77 | -$47 |
| 3 x 50K-type (MFFU + LucidPro + FundedNext Rapid Daily) | $2,394 | **$2,304** | $472 | 4.1% | 0.86 | -$40 |
| 5 x 50K-type | $3,955 | **$3,752** | $883 | 2.4% | 0.86 | -$63 |
| (today's sizing) MFFU 50K + 2 x 25K | $1,248 | $1,264 | $229 | 5.9% | 0.77 | -$70 |
| (today's sizing) 5 x 50K-type | $3,673 | $3,254 | $716 | 3.3% | 0.86 | -$121 |

- **Honest reading:** the money grows with the number of accounts, but the luck does not spread: about 1 path in 40
  (5 accounts) to 1 in 12 (1 account) pays nothing in 6 months, and a bad year hits every account at once. On 2021-25 the
  5-account book loses about $63 a month in eval fees.
- **The other firms are a proxy here:** the "50K-type" rows use MFFU's Builder 50K rules for every account. The firm study
  (lit-funded-firms.md / lit-funded-combo.md) found LucidPro 50K paying 0.9-1.2x and FundedNext Rapid Daily 0.8-1.3x an MFFU
  50K, each with its own sizing (Lucid: 40% best-day rule; FundedNext: $1,200 request cap, no consistency rule, ends after 5
  rewards).
- **Account limits and copy permissions (check before buying):**
  - **MFFU:** 1 sim-funded Builder 50K + up to 2 sim-funded Builder 25Ks per person; one help article says up to 5 sim-funded
    in all, so ask support before a 4th. Hedging across your own accounts is banned, and "mirroring/coordinating trades for an
    unfair advantage" is banned. Copying between your OWN accounts is not stated: **ask support in writing**. ATLAS is planned
    on one 25K; then LIT holds the 50K + one 25K (about $1,170 / $1,080 a month).
  - **LucidPro:** "automated systems and trade copiers are permitted"; 5 funded per household (one source says 10).
  - **FundedNext:** bots allowed; copying your own accounts only; no futures account cap found.
  - **Out:** Tradeify (bans the same bot at another firm), Bulenox (no copying; bots need approval), Topstep (no
    NinjaTrader), Apex / TPT / Alpha / Elite (ban full automation or NinjaTrader).
  - The bot routes extra accounts through `engine/multi_account.py` (off by default). A cross-account risk cap of $3,000 at
    once was proposed in scale-plan.md; with 5 candidate-sized funded accounts the worst simultaneous risk is about 5 x
    $845 = $4,225, so that cap matters from about 4 accounts on.

## 5. Recommendation (the best realistic $ a month, in steps)

1. **Funded sizing (biggest, safe):** after the eval passes, trade the funded 50K at 60% of the room, at most $1,500 a trade,
   with a winner cap of $2,000; the 25K at half scale. **+$40 / +$80 a month per 50K (H1 / H2), first payout ~2 weeks
   sooner, 0% accounts lost**; the biggest trade risk is $845 instead of $422. Change it in both `live_model.json` and
   `live_model_lit.json` (`lit_sizing.funded`) and in the presets `engine/multi_account.py` `PRESETS["mffu_builder_50k"]
   ["sizing"]["funded"]` / `PRESETS["mffu_builder_25k"]["sizing"]["funded"]`. It only acts on a funded account (nothing is
   funded today), so the eval and the 120/120 replay are unchanged.

   50K:
```json
   "funded": {"pct": 0.6, "pct_min_usd": 100, "pct_max_usd": 1500, "ref": 20, "wk": true, "room_f": null,
              "max_win": 2000, "slip_ticks": 2, "skip_breach": true}
```
   25K:
```json
   "funded": {"pct": 0.6, "pct_min_usd": 50, "pct_max_usd": 750, "ref": 20, "wk": true, "room_f": null,
              "max_win": 1000, "slip_ticks": 2, "skip_breach": true}
```
2. **Eval sizing (small, optional, on the NEXT eval, not the running one):** room_f 0.8 and the weekly loss stop off: +$19 /
   +$32 a month per 50K slot, about 1 in 5 evals fails within 2 weeks. It undoes two of the 2026-10-24 safe switches
   (room_f 0.55, wk_loss_usd 1200). The running eval (owner snapshot: room $1,543, session 6) stays as is.
```json
   "lit_sizing": {"two_week": {"room_f": 0.8}, "wk_loss_usd": null}
```
   (merge into `lit_sizing`: only `two_week.room_f` and `wk_loss_usd` change; keep "no reset", `two_week_until` 10,
   `after_mode` safe_eval.)
3. **Payout cadence:** keep the owner's habit: request once $1,500 sits above the buffer, the max MFFU allows. It was the best
   line tested in both halves. Each payout funds the next eval.
4. **Accounts (the real multiplier):** fill MFFU first (the 2 x 25K: **$1,410-1,540 a month** for the 3 accounts), then
   LucidPro and FundedNext 50Ks from the payouts, one a week apart, once their support confirms the bot and own-account
   copying in writing (5 accounts: **$3,750-3,950 a month**, 1 in 10 paths under $883). Running more than one routed
   account needs the multi-account routing switched on and the per-account funded state; that is owner work at the PC.
5. **After 5 payouts:** the account moves to MFFU live. That needs you present (the bot never arms live), and the live terms
   (starting balance, payout rules) are not in our rule file: ask MFFU before the 4th payout.

**Risk of ruin, plainly:** in 2026 no funded account was lost in any setting (0 of 1,000 per row, both halves, and 2021-25).
The real risk is a year like 2021-25, when LIT is break-even: then every account just burns eval fees ($7-63 a month for
the plans above), and 80-90% of 6-month windows end below zero. The candidate's biggest single trade risks $845 on the 50K
(42% of a fresh account's $2,000 room); a stop-out of that size is taken from the room the account has built, never from a
fresh one past 60% of its room.

## How it was measured

- `tools/uprisk.py` (studies decomp / frontier50 / frontier25 / wincap / asks / eval / life / lifeup / life25 / book) ->
  `research/lit/uprisk_<study>.json`; runs `uprisk_f50_*`, `uprisk_f25_*` in `research/runs/` (stored trades = the real H1
  and H2 funded paths of that sizing; the MC numbers are in the verdict).
- Trades: the 120 LIT trades of 2026 (run `lit_live`, true 1m fills, 1 tick on market entries / stop exits) from
  `research/handoff/2026-10-25/COMPLETE_TRADE_LEDGER.csv`; 2021-25 = its 511 reference rows (5m only). $1.90 a micro.
- Monte Carlo: 1,000 paths of 126 sessions (6 months) in 5-session blocks from the half, seed 23 (same as
  tools/funded_path.py; the 50K frontier grid used 600 paths).
- Funded account: `engine/sizing.funded_qty` + MFFU rules of `engine/funded_life.py` (EOD trailing $2,000 / $1,000 locking at
  +$100, the MLL at +$100 after the 1st payout, $1,000 / $600 soft daily loss, $2,100 / $1,100 buffer, $500-$2,000 /
  $250-$1,000 a request, 2 traded days a cycle, 50% best day, the first request 48 h after the first trade, 5 payouts, 80%).
  The step-by-step account in the tool is checked bit for bit against funded_state / funded_cycle / track
  (`python -X utf8 tools/uprisk.py selfcheck`), and today's rule reproduces funded-path.md ($889 / $835).
- Eval: `engine/sizing.lit_qty` on the live `lit_sizing` (A4's replay: today's rolling 2-week pass 57.1% / 50.7% reproduced).
  The weekly loss stop uses 5-session blocks as weeks. The 25K eval uses the 50K two_week settings at the 25K's
  target / floor / 20 micros (an approximation of the 25K preset).
- Slot: eval → 2 sessions → funded → lost or 5 payouts → a new eval at once; $ to you minus every eval price.
- Not modelled: the live account after 5 payouts, MFFU processing days, a refused payout, the other firms' own rules (proxy),
  news rules, scale-in (off live).
- Paper only. `live_model.json`, `live_model_lit.json` and `second_model.json` are unchanged.
