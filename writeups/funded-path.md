## Money first

| Funded account (MFFU Builder Sim Funded) | $ a month to you, Jul-Oct (check) | Jan-Jun (picked) | Paid in 6 months, Jul-Oct · Jan-Jun | Account lost in 6 months | First payout (median funded sessions) | Got a payout within 3 months |
|---|---|---|---|---|---|---|
| **Zlarior (LIT) on the Builder 50K** | **$835** | $889 | $5,009 · $5,336 | 0.0% · 0.0% | 33 · 33 | 79% · 83% |
| ATLAS on a Builder 25K | $318 | $622 | $1,911 · $3,735 | 13.6% · 1.8% | 40 · 22 | 65% · 97% |
| Zlarior on a 2nd Builder 25K | $389 | $329 | $2,334 · $1,976 | 0.0% · 0.0% | 34 · 47 | 75% · 66% |
| **All three** | **~$1,540** | ~$1,840 | ~$9,250 · ~$11,050 | | | |

- "To you" = MFFU's 80% share. Monte Carlo: 1,000 funded accounts of 6 months each (126 sessions), drawn in 5-session blocks
  from the half; real CME NQ1! / MNQ trades of 2026 (Zlarior: the 120 trades of run `lit_live`; ATLAS: the 175 trades of the
  $500 book), $1.90 a micro round trip, 1 tick of slippage on market entries and stop exits.
- The worst 10% of Zlarior 50K accounts still paid $1,551 (Jul-Oct) / $2,829 (Jan-Jun) in 6 months. Max risk on one trade:
  $422-440 (50K), $323-335 (ATLAS 25K), $189-211 (Zlarior 25K).
- **Real 2026 path (one account from the half's first session):** Zlarior 50K Jan-Jun: 5 payouts, $8,000 to you, first at
  session 22 (graduated to live). Jul-Oct (78 sessions only): 1 payout, $1,600, at session 67: the slow case. ATLAS 25K
  Jan-Jun 5 payouts / $3,930; Jul-Oct 1 / $800.
- **Days to the first payout:** a median 33 funded sessions (Zlarior 50K), i.e. about 7 weeks after the funded start; with
  the eval's own median of 5-7 sessions to pass and a few days of MFFU paperwork, the first money lands about **2 months
  after the eval starts**.
- **Consistency blocks:** on a typical 6-month Zlarior 50K account, the money is above the payout line but the 50% best-day
  rule holds it for 37 (Jan-Jun) / 38 (Jul-Oct) sessions in total (94% / 89% of accounts hit it at least once). It is not a
  breach: the account just trades more days. The tracker says how many ("consistency: best day is 81% of the cycle, trade 3
  more days").
- **2021-25 (reference only):** Zlarior's 2021-25 line is PF ~1.0 on 5m entries; lit-funded-sizing.md showed no sizing makes it
  pay there (the recommended funded rule shrinks with the room instead of dying: 2 of 3 back-to-back accounts lost in 5 years).
  These numbers are 2026 numbers.

## What was built (all read-only or OFF)

1. **`engine/funded_life.py`, the sim funded tracker** (one per funded account: Zlarior 50K, a 25K): balance, floor (EOD
   trailing $2,000 / $1,000, locking at start + $100; after the first payout the max loss sits at start + $100), the buffer
   ($2,100 / $1,100) and the payout line (owner's habit: $1,500 / $750 above the buffer = $53,600 / $26,850), the cycle
   profit since the last payout, the best day vs the 50% rule, traded days in the cycle (2 needed), the first-payout date
   (48 h after the first funded trade, next weekday), the max request ($500-$2,000 / $250-$1,000), payouts n of 5, the $ to
   you at 80%, and why MFFU would refuse a request today. Pushes (each once): **"PAYOUT READY: request $X"** (with the one
   line to record it), **"consistency: best day is N% of the cycle, trade M more days"**, "FUNDED ACCOUNT LOST", "5 sim
   payouts done: MFFU moves you to live". **It never requests a payout**: the owner asks MFFU, then records it.
2. **The funded switch, finished:** `python -X utf8 -m engine.eval_life --to-funded --account "<funded Name>" --start <day>`
   (50K, id `mffu50k_funded`) and `--plan builder25k` (id `mffu25k_funded`) add the funded account to `data/accounts.json`
   in mode `funded`, **disarmed**. Until the owner runs it, a passed eval only stops trading and pushes "EVAL PASSED" (the
   safe default, unchanged). The bot (`LiveBot._funded_life_tick`) runs the tracker on every funded extra account each poll.
3. **Funded sizing (unchanged research rule, lit-funded-sizing.md):** 40% of the room to the floor, at most $800 ($400 on a
   25K), size follows the stop past 20 pts, a winner pays at most $1,500 ($750) for the 50% rule, the weekly stop, and no
   trade when even 1 micro's stop-out could reach the floor or the soft daily loss ($1,000 / $600).
4. **Consistency-aware cap, built, OFF** (`lit_sizing.funded.cons_aware`: `true` | `"after_payout"`): today's day may pay at
   most max(50% of the cycle target, the cycle's profit so far), where the cycle target is buffer + $2,000 - the balance the
   cycle started at. It sizes down to that, never below 1 micro (never a skip).
5. **Dashboard (read-only):** phone Money > "Funded & payouts" card (per account: buffer bar to the payout line, cycle
   profit, the 50% gauge, payout-ready date, payouts n/5; before funding: the default, the command and this table); Goals'
   payout line now comes from the tracker; PC Goals page "Funded & payouts" cards (`/api/next/goals` `payout.trackers`).

## Consistency-aware size: tested, not adopted

| Zlarior 50K funded | $ a month Jan-Jun · Jul-Oct | Days held by the 50% rule | Payouts in 6 months | Real Jul-Oct path |
|---|---|---|---|---|
| **Research rule (kept)** | **$889 · $835** | 37 · 38 | 3.41 · 3.20 | 1 payout, $1,600 |
| + consistency-aware cap | $813 · $824 | 13 · 4 | 3.15 · 3.24 | 2 payouts, $3,200 |
| + cap only after the 1st payout | $813 · $824 | 13 · 4 | 3.15 · 3.24 | 2 payouts, $3,200 |

- It does what it says (the money waits far less on the 50% rule), but the smaller winners pay less overall: -$76 a month on
  Jan-Jun (the half it is picked on), -$11 on Jul-Oct. ATLAS 25K: -$5 / +$20; Zlarior 25K: -$13 / -$16. Not better in both
  halves, so it stays OFF. The $1,500 / $750 winner cap of the research rule is already the consistency lever that pays.
- Why the "after the 1st payout" variant is identical on the 50K: in the first cycle the target is $4,100, half of it is
  $2,050, above the $1,500 winner cap, so the cap never binds there.

## The scaling plan (payout -> next eval)

- **MFFU limits per person (help center, conflicting wording, `research/lit/mffu_rules.json`):** 1 active sim-funded Builder
  50K, up to 2 active sim-funded 25Ks; one general article says up to 5 sim funded (25K/50K). The plan uses **1 x 50K + 2 x 25K**.
  Check with MFFU support before a 4th account. Copying the same Zlarior trades onto two of your own accounts: MFFU forbids
  "multi-account mirroring for an unfair advantage"; for your own accounts it is not stated: ask support first.
- **Steps:**
  1. Now: the Builder 50K eval (Zlarior). It passes -> the bot stops it and pushes "EVAL PASSED".
  2. Funded 50K: run the one `--to-funded` command on its first funded day. First payout after ~7 weeks: **$1,600 to you**.
  3. That first payout buys the 25K evals at your price (**$63** each; the 50K was **$91.80**): ATLAS on one (account B, built,
     OFF), Zlarior on the other (`--to-funded --plan builder25k` once it passes). $126 out of $1,600.
  4. A lost or failed account: buy it again from the payouts (eventual eval pass ~77-80% for the 50K, so ~$118 per funded 50K;
     ATLAS 25K 2-week pass 69% / 44%).
  5. 5 sim payouts on the 50K (~$8,000 to you; 23-30% of accounts get there within 6 months) -> MFFU moves it to live (you must
     be present; the bot never arms it). Then the 50K slot is free for the next 50K eval at $91.80.
- With all three funded: about **$1,540 a month (Jul-Oct rate)**; more accounts need other firms (`lit-funded-firms.md`,
  Money > Scaling plan).

## How it was measured

- `tools/funded_path.py` -> `research/lit/funded_path.json`, runs `funded_path_*` in `research/runs/` (the stored trades are
  the real H1 and H2 funded paths). Each session: size every trade with `engine/sizing.funded_qty` on the account's state
  (`funded_state` + `funded_cycle`), MFFU's soft daily loss flattens the day, the floor is checked against the worst open
  loss (mae); at the session's end `engine/funded_life.track` decides: when it says "ready" (every MFFU rule met and the
  owner's $1,500 / $750 line) the max request is withdrawn. 5 payouts end the path (graduated to live).
- Differences to lit-funded-sizing.md (same rule, $769 / $739 a month there): that study asked for a payout as soon as $500
  was above the buffer and used the lit_2wk unit cache; this one asks at the owner's $1,500 line and reads the 2026 trade
  ledger. Asking at $1,500 pays more a month (lit-money-batch2.md) and here loses no accounts.
- Tests: `python -X utf8 -m tests.test_funded_life` (tracker, pushes, the switch, funded math vs this write-up and
  lit-funded-sizing.md, cons_aware off = the research rule bit for bit, the bot tick). Eval sizing is untouched
  (tests.test_lit_live, test_sizing_caps, test_eval_lifecycle).
- Paper only. Nothing is armed, no payout is requested by the code, `live_model.json` is unchanged.
