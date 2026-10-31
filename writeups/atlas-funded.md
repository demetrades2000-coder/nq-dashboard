## Money first

ATLAS on a funded MFFU Builder 25K, 6 months, the live funded rule. "To you" = MFFU's 80% share.

| Funded ATLAS 25K | 2026 H1 Jan-Jun (pick) | **2026 H2 Jul-Oct (check, quote this)** | 2025 (reference) | 2021-24 (reference) |
|---|---:|---:|---:|---:|
| **$ a month to you** | $582 | **$517** | $64 | $39 |
| ... the worst 1 in 10 accounts | $400 | $242 | $0 | $0 |
| Paid to you in 6 months | $3,494 | $3,100 | $382 | $235 |
| Payouts a month | 0.73 | **0.65** | 0.08 | 0.05 |
| Payouts in 6 months | 4.4 | 3.9 | 0.5 | 0.3 |
| First payout (median funded sessions) | 18 | **24** (about 5 weeks) | 21 | 17 |
| Got a payout within 3 months | 92% | 90% | 27% | 19% |
| All 5 sim payouts in 6 months ($4,000 to you, then MFFU moves it to live) | 77% | 51% | 1% | 1% |
| **Accounts lost** (the floor hit) | 0.0% | **0.0%** | 0.0% | 0.0% |
| Accounts stuck (under $100 of room: the bot stops) | 8.2% | **8.5%** | 89% | 96% |
| Trading profit made in the account, a month | $1,575 | $1,416 | $82 | $5 |
| Trades a week | 4.0 | 3.1 | 4.4 | 4.9 |
| Biggest single trade (full stop-out) | $485 | $527 | $558 | $563 |

- **Per eval bought** (the chance it ever passes x 6 months of funded pay, less the eval): $3,178 (Jan-Jun) / **$3,057
  (Jul-Oct)** at this account's $43 price ($3,158 / $3,037 at your usual $63). In 2025 $82, in 2021-24 $27.
- **The real 2026 path** (one funded account from the half's first session, a new one when it ends): Jan-Jun 2 accounts,
  6 payouts, **$4,800 to you ($788 a month)**, the first account got all 5 payouts; Jul-Oct (78 sessions only) 1 account,
  3 payouts, **$2,400 ($646 a month)**. Net of the evals they need: $764 / $632 a month.
- **In a weak year it barely pays.** 2025: 7 funded accounts one after the other, 6 stuck, 2 payouts, $1,600 to you, but
  the 21 evals needed to get those 7 accounts cost about $1,350: **+$20 a month net**. 2021-24: 24 accounts, 23 stuck,
  $5,936 paid, about $5,060 of evals: **+$23 a month net**. Nothing is lost beyond eval fees; there is just almost no
  money in it, because ATLAS's own edge is about zero there (eval path PF 0.82 in 2025, 1.05 in 2021-24).
- **Why "stuck" and not "lost":** the funded size is a share of the room to the floor, so a losing streak makes the trades
  smaller and the account almost never hits the floor. It shrinks until 1 micro no longer fits a stop (room under $100);
  then the bot stops trading it (as a funded Zlarior account already does) and pushes "buy a new eval".
- **The money piles up:** a 2026 account makes about $1,400-1,600 a month of trading profit, but only about $650 a month
  comes out (MFFU's $1,000 request cap, the 50% best-day rule, 2 traded days a cycle); after 6 months about $4,600-5,100 is
  still in the account. The 50% rule holds a payout back on 43-48 of the 126 sessions. That is MFFU's limit, not risk.

## The eval before it (ATLAS's 25K, same rules, tools/atlas.py)

| ATLAS 25K eval | H1 | **H2** | 2025 | 2021-24 |
|---|---:|---:|---:|---:|
| Pass / fail within 10 sessions (`p10` / `f10`) | 65.5 / 0.0 | **43.5 / 0.0** | 30.1 / 0.0 | 22.9 / 0.0 |
| Decided within 10 (`dec10`, incl. stuck) | 66.3 | 43.5 | 53.4 | 50.0 |
| Pass / fail within 15 (`p15` / `f15`) | 73.7 / 0.0 | 54.7 / 0.0 | 32.4 / 0.0 | 25.5 / 0.0 |
| Passes slower than 15 sessions (`slow_pass`) | 4.3% | 13.3% | 2.4% | 3.3% |
| Median sessions to pass (`pass_med`) | 5 | 6 | 4 | 4 |
| Ever passes (60 sessions) | 92% | 100% | 33% | 30% |

So in a 2026-like market the path is: the 25K eval passes in about 5-6 sessions (2-week pass 44-66%, almost never a fail),
then the funded account pays about $520-580 a month to you. A pass inside 3 weeks (15 sessions) is 55-74%.

## The funded rule: today's preset vs the older research rule

| Funded rule on ATLAS's 25K | $/mo H1 · **H2** | Lost / stuck H1 · H2 | First payout H1 · H2 | 5 payouts in 6 mo H1 · H2 | 2025 · 2021-24 $/mo |
|---|---|---|---|---|---|
| **Live preset** (owner 2026-10-25, uprisk.md): 60% of the room, <= $750, a winner <= $1,000 | $582 · **$517** | 0 / 8.2% · 0 / 8.5% | 18 · 24 | 77% · 51% | $64 · $39 |
| Older research rule (lit-funded-sizing.md): 40% of the room, <= $400, a winner <= $750 | $594 · $394 | 0 / 2.7% · 0 / 11.6% | 27 · 38 | 75% · 25% | $58 · $44 |

- The live preset pays **+$123 a month on the check half** (H2), about the same on H1 (-$12, within noise), and the first
  payout comes 9-14 sessions sooner. It trades bigger, so a bad start gets stuck a little more often on H1 (8.2% vs 2.7%)
  and less often on H2 (8.5% vs 11.6%). It holds; it is what the bot routes. Nothing was tuned here.
- The earlier ATLAS estimate in funded-path.md ($622 / $318 a month, 13.6% lost on H2) used the stand-alone $500 book
  without the account-B rules and the older rule. These numbers replace it.

## What was built (all paper / Sim by default, never armed)

1. **The switch, owner-run only.** A pass still stops the eval and pushes "ATLAS ... EVAL PASSED": it now says to run the
   funded switch. MFFU gives the funded account a NEW Name; then either the Start page (Accounts > ATLAS's 25K >
   **Passed → funded**, the Name and the first funded day) or
   `python -X utf8 -m engine.account_b --to-funded --account "<funded Name>" --start <day> [--balance 25000]`.
   It writes `"stage": "funded"`, `funded_start`, `funded_balance`, `payouts` and the passed eval's Name into the local
   `data/account_b.json` (second_model.json stays `account_b: null`), puts the funded Name on the NinjaTrader allowlist,
   keeps the eval's state file as `live_state_acctb.eval_<Name>.json`, and is **disarmed**: a real funded account trades
   only after you arm it at the start (you type the phrase). Arming and the launch prep keep the funded stage.
2. **Funded sizing and limits on ATLAS's account** (the 25K funded preset, the same rule as a funded Zlarior account):
   risk 60% of the room to the floor, at most $750 a trade (x20/stop past a 20-pt stop), a winner pays at most $1,000 (one
   max payout request), the $600 soft daily loss, 20 micros, no trade when 1 micro's full stop-out could reach the floor.
   The EOD trailing $1,000 floor locks at start + $100 and sits there after the first payout. Lost (room 0), stuck (room
   under $100) or graduated (5 sim payouts) = no new trade. Max 2 trades a day, one position, never opposite to LIT: as
   in the eval.
3. **The payout tracker for ATLAS** (engine/funded_life.py, read-only): balance, floor, room, the $1,100 buffer (it stays
   in the account) and the payout line ($26,850 = buffer + your $750 habit), the cycle's profit, the best day vs the 50%
   consistency rule (it limits payouts, not trading), traded days (2 a cycle), the first request date (48 h after the first
   funded trade), the max request ($250-$1,000) and the 80% to you, payouts n of 5. Pushes, each once: "PAYOUT READY:
   request $X" (with the line to record it: `python -X utf8 -m engine.account_b --payout <day>=<$>`), "consistency: best
   day is N%...", "FUNDED ACCOUNT LOST", "funded account stuck", "5 sim payouts done". **The bot never requests a payout.**
   `python -X utf8 -m engine.account_b --funded-status` prints it.
4. **Where you see it:** the ATLAS page (phone + PC) shows the funded card (balance, payout line, room, buffer, best day
   vs 50%, payouts, the next request date / amount), the Home card says FUNDED, the live board's ATLAS card shows $ to
   the payout line, payouts n of 5 and a Payout row, the Goals page and the scaling plan say funded, and the PC heartbeat
   carries it (second.route.account_b: stage, funded).
5. `research/lit/mffu_rules.json` builder_25k checked against your screenshots (eval: target $1,500, $1K EOD drawdown,
   $600 DLL, 2 contracts / 20 micros, no consistency, 7-day inactivity; funded: $1K EOD, $600 DLL, 20 micros, 50%
   consistency, no scaling, 2 days to payout, $250-$1,000 requests, 80%, $1.1K buffer): every value matches; the DLL is
   now confirmed and your screenshot values are stored.

## How it was measured

- `tools/atlas_funded.py` -> `research/second/atlas_funded.json`, runs `atlas_funded_live` and `atlas_funded_old` in
  `research/runs/` (the stored trades are the real back-to-back funded paths of every span).
- Trades: ATLAS as it trades account B (`tools/atlas.account_units`: EMA + MACD + S/R pooled, 5m-open entries, LIT's
  opposite open trade / entry / armed setup blocks an ATLAS entry, LIT entering the other way closes ATLAS), CME NQ1! /
  MNQ, 2021-11 to 2026-10-16, $1.90 a micro, slippage in the stored exits.
- One funded account: `tools/second_mix.play_day` (one position, 2 trades a day, the $600 soft daily loss, the floor
  checked against each trade's worst open loss) with every trade sized by `engine/account_b.qty` on the funded spec, the
  very code the bot routes (checked equal on 652 sizings). At each session's end `engine/funded_life.track` decides: when
  it says "ready" (every MFFU rule met and $750 above the buffer) the max request is taken.
- Monte Carlo: 1,000 funded accounts x 126 sessions per period, in 5-session blocks (seed 23). Real path: back-to-back
  accounts through the period (eval time not counted; eval fees = accounts / the eventual pass rate x $63).
- Tests: `python -X utf8 -m tests.test_account_b_funded` (switch, sizing, tracker, pushes, Start page, views, one LiveBot
  day on a fake Sim103 next to LIT). ATLAS's eval is unchanged until the switch (tests.test_second_account_b,
  tests.test_account_b_local).

## Why only ~$520-590 a month, and can sizing get more out? (2026-10-26, owner question)
Commission is in: every ATLAS trade pays $1.90 a micro round trip plus slippage (tools/second_mix.py ECOMM = sizing.TW_COMM
= 1.90). The funded 25K *makes* about $1,430-1,610 a month trading; the owner *receives* ~$520-590 because MFFU's payout
rules let only part of it out: at most $1,000 per request x 80% split, a $1,100 buffer first, the 50% consistency rule
(holds payouts ~45-48 of 126 days) and 5 payouts per funded account (then MFFU moves it on; this study stops counting there).

Sweep (MC 300 paths per half, the live funded rule with one setting changed; tools/atlas_funded.py helpers):

| Funded setting | H1 $/mo to owner | H1 made/mo | H2 $/mo to owner | H2 made/mo | H2 stuck |
|---|---|---|---|---|---|
| live (60% room, <= $750 risk, winner <= $1,000) | $593 | $1,610 | **$520** | $1,430 | 7.3% |
| winner <= $400 | $329 | $619 | $384 | $657 | 10.7% |
| winner <= $500 | $520 | $894 | $373 | $638 | 16.3% |
| winner <= $600 | $577 | $1,064 | $368 | $659 | 20.3% |
| winner <= $750 | $613 | $1,273 | $400 | $855 | 18.3% |
| risk <= $500 | $570 | $1,515 | $518 | $1,211 | 5.3% |
| risk <= $1,000 | $600 | $1,627 | $521 | $1,469 | 6.3% |

Verdict: the live rule is already at the top; smaller winner caps pass the consistency rule sooner but make far less, a
bigger risk cap adds ~$1-7 a month. The ceiling is MFFU's payout rules, not the bot's size. More money = more funded
accounts (each 25K eval $43-63), not bigger trades.
