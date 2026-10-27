## In one minute

- **Can the bot trade a second account?** Yes. It is built and **off**. One line turns it on
  (`python -m engine.second --account-b "<Name>" --plan builder25k --start <day>`). Account B trades
  **EMA + MACD + S/R** on its own account with its own eval. LIT stays alone on its Builder 50K, unchanged.
- **25K or 50K?** Buy the **Builder 25K ($63)**:
  - MFFU allows only **one funded Builder 50K per person**. LIT's eval takes that place once it passes. Up to **two
    funded Builder 25Ks** are allowed.
  - The 25K never failed outright within 2 weeks in 2026: 0.0% fails in both halves (some evals got stuck, see below).
  - The most it risks on one trade is $477 (the 50K: $940).
  - The 50K makes about **twice the money**: +$3,347 per eval bought vs +$1,549 (2026 H1 starts). Move to a 50K only if
    MFFU support says in writing that two funded Builder 50Ks are allowed.
- **Account B on a Builder 25K (2026):**
  - 2-week pass / fail: **68.9 / 0.0** (H1, pick) and **43.5 / 0.0** (H2, check).
  - 1 month: 81.7 / 0.0 and 61.0 / 0.0. Median 5-6 sessions to pass.
  - Eval-path money: +$19,722 (H1, $3,236 a month) and +$5,391 (H2, $1,451 a month).
  - Funded: about $1,840 paid to you in 3 months.
  - 2.8-4.0 trades a week.
- **The catch:** it is a 2026 bet. In 2025 and 2021-24 about **35-39% of account B evals are dead within 2 weeks**. Most
  are stuck: the room falls under $100, 1 micro no longer fits a stop and the bot stops. $ per eval bought there is
  about **$0-60**.
- **Next:** run account B on a **Sim account** next to LIT for 2-4 weeks. Buy the 25K once that paper looks like the
  backtest.

## MFFU's account rules (research/lit/mffu_rules.json, searched 2026-10-18)

- **Evaluations:** MFFU publishes no limit on open evaluations (none found).
- **Funded (sim-funded) accounts:**
  - Builder 50K: **1 active per person** (Builder 50K help guide; the 100K / 150K guides say the same for their sizes).
  - Builder 25K: **up to 2 active per person** (Builder 25K guide).
  - Another MFFU page says up to 5 sim-funded accounts in all (25K / 50K only).
- **A 25K and a 50K together:** nothing found forbids it. Each cap counts its own plan, so a funded 50K (LIT) plus a
  funded 25K (account B) fits both. It is not confirmed in writing, so ask support before the first payout.
- **Hedging:** long and short on the same market at the same time is banned, also across your own accounts. That is why
  account B never trades against LIT (below).
- **Copy trading between your own accounts:** not stated. Account B trades **different strategies**, not copies of LIT,
  but MFFU's fair-play page bans "coordinated trades for an unfair advantage", so ask support:
  *"I run two different automated strategies, one on my Builder 50K and one on my Builder 25K, never in opposite
  directions. Is that allowed?"*

## What was tested

- **Strategies:** EMA London pullback, MACD sweep divergence and S/R NY reclaim, every trade from 2021-11 to 2026-10
  (`research/second/*_best.json`; the live loop gives these exact trades on every 2026 session, `tests/test_second.py`).
- **Account B rules (exactly what the bot does):**
  - one position at a time, at most 2 trades a day;
  - the plan's soft daily loss counts every trade of the day;
  - **no hedging:** no B entry while LIT holds the other side, and a B trade is closed at market when LIT enters the
    other side (the second-mix.md rule);
  - "stuck": once the room to the floor is under $100, the bot stops trading the account (buy a new one).
- **Plans** (MFFU rules):

| | Builder 25K | Builder 50K |
|---|---|---|
| Owner's price | **$63** | **$91.80** |
| Target | $1,500 | $3,000 |
| Max loss (EOD trailing, locks at start + $100) | $1,000 | $2,000 |
| Soft daily loss | $600 | $1,000 |
| Max micros | 20 | 40 |
| Funded payouts | $250-$1,000 at 80%, buffer $1,100 | $500-$2,000 at 80%, buffer $2,100 |
| Funded accounts per person | up to 2 | 1 |

- **Sizes** (`engine/account_b.qty`, the same function the bot routes with):
  - **need** (default) = LIT's two_week "one winner passes" on that plan: micros so the trade's target covers what is
    left to the target.
    - It is capped at 60% (50K) or 50% (25K) of the room and by the soft daily loss, for 10 sessions.
    - After session 10 it uses safe_eval: 60% (50K) or 30% (25K) of the room, with no reset.
    - The 25K settings come from `lit-builder-25k.md` (picked on LIT's 2026 H1).
  - **safe** = $300 (50K) or $150 (25K) risk, capped at 60% of the room and the soft daily loss.
- **Scoring:** a fresh eval starts on every session.
  - 2-week and 1-month pass / fail / stuck %, median sessions to pass, eventual pass within 60 sessions.
  - Eval-path $: back-to-back evals, a new one after each pass, fail or stuck.
  - Funded payouts for 3 and 6 months, at the safe size on the plan's funded rules.
  - $ per eval bought = eventual pass x funded $ (3 months) - the price.
  - Pick on 2026 H1, check on H2. 2025 and 2021-24 are the reference.
- **Check first:** this executor on the 50K with the old rules gives exactly second-mix.md's account B: 72.3 / 4.2 (H1),
  53.6 / 0.0 (H2). The "stuck" rule moves 1.7 points of its H1 fails to stuck.

## 25K vs 50K (need size, the bot's default)

| | **Builder 25K** H1 / H2 | Builder 50K H1 / H2 | LIT alone on its 50K (reference) |
|---|---|---|---|
| Pass / fail within 2 weeks | **68.9 / 0.0 · 43.5 / 0.0** | 72.3 / 2.5 · 53.6 / 0.0 | 57.1 / 5.9 · 52.2 / 0.0 |
| Stuck within 2 weeks | 7.6 · 0.0 | 5.0 · 0.0 | |
| Pass / fail within 1 month | 81.7 / 0.0 · 61.0 / 0.0 | 83.5 / 4.6 · 55.9 / 5.1 | 74.3 / 11.9 · 50.8 / 0.0 |
| Median sessions to pass | 5 · 6 | 5 · 5 | 5 · 4 |
| Pass within 60 sessions | 87.5% · 100% | 91.4% · 100% | |
| Trades a week | 4.0 · 2.8 | 4.1 · 3.1 | 3.1 · 2.6 |
| Eval-path $ (PF) | **+$19,722 (2.97) · +$5,391 (2.36)** | +$44,368 (3.35) · +$7,642 (1.95) | +$34,234 · +$9,059 |
| $ a month on the path | $3,236 · $1,451 | $7,279 · $2,057 | |
| Max drawdown on the path | -$975 · -$1,642 | -$2,220 · -$3,804 | |
| $ at risk a trade, median / max | $182 / $477 · $212 / $494 | $358 / $940 · $301 / $900 | |
| Cost per 2-week pass | $91 · $145 | $127 · $171 | |
| Funded, paid to you in 3 months (H1 starts) | **$1,842** (none lost) | $3,762 (none lost) | |
| Funded, 6 months (H1 starts) | $3,704 | $7,349 | |
| **$ per eval bought** (H1 starts, 3 months) | **+$1,549** | +$3,347 | |
| 2025: 2-week pass / dead (fail + stuck) | 28.9 / 34.9 | 29.7 / 34.1 | |
| 2021-24: 2-week pass / dead | 23.9 / 38.9 | 25.3 / 36.0 | |
| 2025 / 2021-24 $ per eval bought | +$1 / +$11 | +$29 / +$57 | |
| 2025 / 2021-24 eval-path $ | +$1,020 / +$8,990 | -$2,904 / +$13 (was -$4,066 / +$2,364 before the 2026-10-22 daily-loss fix, atlas.md) | |

H2 funded $ comes from only 16 starts (early July) and is not quoted.

In H1, the 25K's money comes from EMA +$7.3k, MACD +$7.1k and S/R +$5.3k. In H2 it comes from EMA +$3.7k, MACD +$0.6k and
S/R +$1.1k.

**The safe size** ($150 / $300 risk) never fails and never gets stuck within 2 weeks in 2026, but it is slow:
- 2-week passes are 28.6% / 8.7% (25K) and 32.8% / 8.7% (50K);
- the median pass takes 12 sessions.

That breaks the 2-week goal, so it stays an option (`"sizing": "safe"`), not the default.

## Why the 25K

1. **It can be funded next to LIT's 50K.** MFFU's own pages say 1 funded Builder 50K per person but 2 funded Builder 25Ks.
   A second 50K would have nowhere to go once LIT passes.
2. **It never failed outright in 2026.** 0.0% fails within 2 weeks and 1 month in both halves, against 2.5-5.1% on the
   50K. The 25K's "need" size uses 50% of the room, not 60%, and a guard skips a trade whose full stop-out would reach the
   floor or the $600 soft daily loss. The cost is 7.6% stuck evals in H1.
3. **Smaller bets.** At most $477 at risk a trade (median $182), half the 50K.
4. **Cheaper.** $63 instead of $91.80. A 2-week pass costs $91 / $145 instead of $127 / $171.
5. **What it gives up:** about half the money (+$1,549 vs +$3,347 per eval bought, funded $1,842 vs $3,762 in 3 months),
   and H2 2-week passes of 43.5% instead of 53.6%. H2 is below the 2-week goal, but 61% pass within a month.

## How it trades (engine/account_b.py, off by default)

- **Switch:** `second_model.json` `"account_b": null` (off). The owner's line
  `python -m engine.second --account-b "<NinjaTrader account Name>" --plan builder25k --start <first session>`
  writes that one line, prints the change and is **refused when `engine.ninjatrader --selftest` fails**.
  `--account-b off` puts it back. The PC bot picks the change up on its next poll; an open account B trade is managed
  to its exit first.
- **Own account:**
  - account B has its own NinjaTrader order files (tag `acctb_`) and its own NinjaTrader state;
  - its own ledger and state file (`data/live_state_acctb.json`);
  - its own guards: CME calendar, order sanity on the plan's max micros, clock, the owner's pause, and news when on;
  - its own eval: balance, trailing floor, room, sessions from the start day, the plan's soft daily loss lock-out, the
    pass lock ("EVAL PASSED" push, no new trade), fail and stuck.
- **Own size:** `engine/account_b.qty`, need (default) or safe on the plan, as above.
- **Trades:** the strategies' own trades (the research code on closed bars).
  - Entries go at market at the 5m open after the signal, about 2 s after the open on the fake NinjaTrader.
  - The bot routes the breakeven moves, the 15-minute cuts, the 15:55 flat and every model exit.
  - At most 2 entries a day and one position at a time on account B.
- **Never opposite to LIT:**
  - A B entry is blocked while LIT's account holds, enters or has an **armed setup** in the other direction (a limit
    working, or waiting for its 1m CISD), or while an extra account holds the other side.
  - When LIT enters the other way while B is open, **B is closed at market first** (reason HEDGE), then LIT's order goes
    out.
  - The same direction as LIT is allowed: two accounts, two positions.
  - The armed-setup block is stricter than the research (which only checked LIT's open trades). It can block a few
    extra B trades; watch it on Sim.
- **Not on LIT's account:** a strategy on account B is never also routed on LIT's account. The bot drops it there, and
  `--route <key> on` is refused for it.
- **Real money:** a real (non-Sim) account B trades only after the owner arms it himself: `"armed": true` in
  account_b, the LIVE phrase at start and `NINJATRADER_LIVE=1`, the same steps as LIT. The bot never does this.
- **A crash in account B never touches LIT.** It runs after LIT's routing and state save, and every error is logged.
- **Restart:** B's open position, plan and eval come back from its state file.
- **Where you see it:** heartbeat / live.json `second.route.account_b`, the phone (System > Second strategies, Bot Brain >
  second brain) and the PC (Data > Second strategies, Bot Brain) show an **"Account B <name>"** card. The card has its
  plan, eval tracker (balance, pass target, room to the floor, session, status), open trade and orders. Pushes are titled
  "LONG · Account B <name>"; the pass, fail and stuck pushes have their own titles.

## Tests

`python -X utf8 -m tests.test_second_account_b` (results in `research/second/account_b_check.json`):

- off = today: `tests.test_lit_live --days --bot` gives 120/120, and LiveBot 2/2/2/2;
- a day with B off creates no B order file and no Sim102 position;
- on, with a fake Sim account B (Sim102) next to LIT (Sim101), on 2026 days of both plans:
  - every B trade is checked against the research trade and the plan's size;
  - LIT's trades are unchanged;
  - both accounts can hold the same direction at once, never opposite at any poll;
  - HEDGE closes go out before LIT's order;
- unit checks: sizing per plan, the pass / fail / stuck / daily-loss locks, the no-opposite rule and the switch;
- a crash injected in account B (LIT's orders and delays identical);
- a restart mid-trade.

## Files

- Research: `tools/second_account_b.py`, which wraps `tools/second_mix.py`'s executor with each plan's rules. Its
  numbers are in `research/second/account_b.json`; runs `acctb_*`.
- Code:
  - `engine/account_b.py`;
  - hooks in `engine/live.py` (`_sync_account_b`, `_account_b_tick`, the HEDGE close before LIT's entry, kill and
    flatten, `second_route_info`);
  - the switch in `engine/second.py` (`--account-b`);
  - the card in `secondcore.js` v3.
- Limits:
  - worst open points come from 5m bars before 2026 (1m in 2026);
  - the research assumes every LIT signal is taken on LIT's account;
  - funded sizing is the safe size for both plans;
  - the 25K "need" settings were picked on LIT (lit-builder-25k.md), not re-tuned for these strategies.
