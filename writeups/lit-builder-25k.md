## For the owner (one minute)

- **Can the 25K run on the same LIT bot? Yes, once two things are done:**
  1. Ask MFFU support in writing: *"I run my own automated strategy on my Builder 50K and my Builder 25K, same signals,
     each sized for its account. Is that allowed?"*
     - Third parties say MFFU allows copying between your own accounts.
     - MFFU's own page bans copying other traders and "coordinated trades for an unfair advantage".
  2. Wire the 25K into the bot.
     - Today the bot works out room, floor and size as if every account were a 50K ($2,000 max loss).
     - On a 25K that would size about twice too big. The settings below need per-account sizing in `engine/live.py` first.
- **Put this in the 25K account's sizing block** (pick, H1):

```json
{
  "mode": "two_week",
  "two_week": {"base": "need", "need_buf": 1.0, "room_f": 0.5, "wk": false, "dll_cap": true, "stop_at_target": true,
               "max_usd": null, "press_at": null, "press_mult": 1.0, "press_room": null, "protect_over": null, "protect_keep": 0.0,
               "acct": {"target": 1500.0, "mll": 1000.0, "lock": 100.0, "dll": 600.0, "max_micros": 20, "scale": 0.5}},
  "guard": {"target": 1500.0, "dll": 600.0, "max_micros": 20},
  "two_week_until": 10, "after_mode": "safe_eval", "safe_cap": 0.3,
  "eval_ref_stop": 25.0, "fast_ref_stop": 40.0,
  "eval_start": "<the 25K's first session, yyyy-mm-dd>",
  "plan": {"start": 25000.0, "target": 1500.0, "mll": 1000.0, "lock": 25100.0, "dll": 600.0}
}
```

  The `plan` line is for the wiring: the 25K's room and floor must come from it (engine/sizing.mffu_eval / eval_state with the
  25K plan) and lit_qty must be called with `max_micros=20`.
- **What it does:**
  - Each trade is sized so one winner covers what is still missing to +$1,500, at most 50% of the room to the floor, inside
    the $600 soft daily loss, 20 micros max.
  - After session 10 (no reset) the size drops to the normal LIT size, capped at 30% of the room.
  - Typical size on the real 2026 path: 1-5 micros (median 2, $146 at risk). Most at risk ever: about **$500 a trade**.
- **Odds (2026, LIT trades as live, $1.90 a micro):**

| | 25K pick H1 / H2 | 50K live (config C) H1 / H2 |
|---|---|---|
| Pass within 2 weeks (p10) | **53.8% / 47.8%** (MC 50.4 / 47.7) | 52.9 / 50.7 |
| Failed within 2 weeks (f10) | 1.7 / 0.0 | 9.2 / 2.9 |
| Stuck after 2 weeks (room < $100, bot stops trading) | 9.2 / 4.3 | 3.4 / 0.0 |
| Dead within 2 weeks (failed + stuck) | **10.9 / 4.3** (MC 9.1 / 8.0) | 12.6 / 2.9 |
| Pass / dead within 3 weeks (p15 / dead15) | 62.3 / 11.4 · 54.7 / 6.2 | 64.0 / 14.1 · 48.4 / 6.2 |
| Pass in the end (no reset, MC 120 sessions) | **79.3 / 77.3%** | 80.0 / 77.1 |
| Median sessions to pass (MC) · % of passes slower than 15 | 7 · 29% / 7 · 31% | 7 · 27% / 5 · 24% |
| Cost per 2-week pass (MC) | **$125 / $132** at $63 | $178 / $165 at $91.80 |
| Cost per eventual pass (MC) | **$79 / $82** | $115 / $119 |

- **Both accounts together (same trades):**
  - **Same start day:** almost one bet.
    - Both pass in 2 weeks: H1 52.5% / H2 47.1% (MC 48.9 / 47.4).
    - Only one passes: 2.5% / 4.4%.
    - Both dead: 10.2% / 0.0% (MC 6.8 / 6.4).
    - Passing is 0.92-0.95 correlated.
    - Worst combined day: −$1,511 / −$1,608 across both accounts.
  - **25K started one week later:**
    - Both pass: 32.7% / 27.0%.
    - Exactly one passes: 43.4% / 44.4%.
    - At least one passes in its own 2 weeks: **76% / 71%** (MC 68 / 72%).
    - Both dead: 1.8% / 0.0% (MC 3.1 / 2.2).
    - Worst combined day: −$1,067 / −$1,242.
  - **What the lag buys:** more often at least one funded account, and less chance that both go at once. Both passing
    within their own 2 weeks becomes less likely.
  - **Recommendation:** start the 25K one week after the 50K. The 50K started 2026-10-19, so start the 25K on Monday 2026-10-26.
- **Funded (both passed), at the H2 rate:**
  - 50K about $737 a month, 25K about $278 a month: **about $1,015 a month of payouts**.
  - Counting the eval time and the fees over the first 6 months from purchase: **about $780 a month** (H1 $911).
  - Monte Carlo of `tools/lit_funded_firms.py`; the 25K funded sizing is in `lit-funded-firms.md`.
  - The 25K adds about $220-280 a month for $63.
- **Reasons not to (honest list):**
  - The copy-trading rule on your own accounts is not confirmed by MFFU itself.
  - Same-day starts mean the accounts lose together.
  - The 25K gets "stuck" more often. When its room is under $100 the bot will not trade it. Then buy a new 25K: a stuck
    eval also breaks the 7-day inactivity rule.
  - The code wiring is not done.

## 1. The rules (searched 2026-10-19)

The MFFU help centre itself could not be opened from this sandbox. Each value comes from the search engine's reading of
MFFU's own pages, checked against third-party pages. "Confirmed" means MFFU's own article says it.

| Rule | Builder 25K | Status | How the 50K is modelled (tests/test_mffu_rules.py, research/lit/mffu_rules.json) |
|---|---|---|---|
| Price | owner pays **$63** one-time (list $105) | owner's price; list unconfirmed | $91.80 (list $153) |
| Profit target | $1,500 | confirmed [1] | $3,000 |
| Max loss | $1,000 **EOD trailing**, locks at start + $100 (floor $24,000 → $25,100) | confirmed [1][3] | $2,000, locks at $50,100 |
| Daily loss | **$600 soft** (pauses the rest of the session, account stays open) | **conflict**: current guide $600 [1]; "legacy 25K" page: none [2] | $1,000 soft |
| Max size | 2 minis / **20 micros** | confirmed [1] | 4 / 40 |
| Min days | 1 day | confirmed [1] (the plan page's "2 days" row is about payouts) | 1 (bot does a 1-micro day-2 trade anyway) |
| Eval consistency / best day | none | confirmed [1] | none |
| News | allowed (Builder) | confirmed [1] | allowed |
| Funded | starts at $0, same $1,000 EOD trailing to +$100; buffer $1,100; payouts every 48 h, $250-$1,000 a request, 80/20, 50% best-day rule at payout, 5 sim payouts then live | confirmed [1][4]; one blog mixes in the 50K's $500/$2,000 | buffer $2,100, $500-$2,000 |
| Account caps | up to **2 active sim-funded Builder 25K**; 1 Builder 50K; 5 sim-funded 25K/50K in total | 2 × 25K confirmed [1]; combined cap from third parties [5] | 1 active 50K |
| Automation | bots allowed with oversight; no HFT, no sim-fill exploits | confirmed (fair-play page) | same |
| Copying between **your own** accounts | reported as allowed [6][7][8] | **unconfirmed**: MFFU's page forbids copying that "mirrors, copies or coordinates trades for an unfair advantage" and any copying with other traders [9] | same open question |
| Hedging | no long + short on the same underlying at the same time, **also across accounts** | confirmed | same; copy trading is always the same side, so it is fine |
| Inactivity | no trade for 7 calendar days → the account can be closed | confirmed | same |
| Position limits pooled across accounts? | not stated anywhere | unconfirmed | n/a |

Sources:
1. https://help.myfundedfutures.com/en/articles/17036130-builder-plan-25k-a-comprehensive-look
2. https://help.myfundedfutures.com/en/articles/15862870-builder-plan-25k-legacy-no-dll
3. https://help.myfundedfutures.com/en/articles/8348565-max-eod-trailing
4. https://help.myfundedfutures.com/en/articles/13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts and
   https://www.eltraderfinanciado.com/en/news/myfundedfutures/mff-lanza-builder-25k-julio-2026
5. https://proptradingvibes.com/blog/myfundedfutures-position-limits
6. https://tradecovex.com/guides/best-trade-copier-mffu-2026
7. https://propvator.com/blog/my-funded-futures-automated-trading/
8. https://thortradecopier.com/blog/can-you-copy-trade-multiple-prop-firm-accounts
9. https://help.myfundedfutures.com/en/articles/8444599-fair-play-and-prohibited-trading-practices

**Compared with the code:**
- `engine/sizing.TW_25K` and `research/lit/mffu_rules.json` `limits.builder_25k` match these rules ($1,500 / $1,000 / $600 /
  20 micros; `tests/test_mffu_rules.py` checks it, 45 ok).
- Nothing changed in the rules since 2026-10-18.
- The only open points are the same as before:
  - the $600 daily loss (current) vs none (legacy). Modelled at $600, the stricter one.
  - copying between your own accounts.

## 2. The 25K eval sizing

**Method.**
- Trades: the exact live LIT signals (the `tools/lit_2wk` unit trades = run `lit_live`, 120 trades in 2026).
- Sizing: every size is `engine.sizing.lit_qty` exactly as the live loop calls it, including the day guard. The guard
  skips a trade when even 1 micro could reach the floor or the daily loss.
- Costs and limits: $1.90 a micro, 1 tick on stops, the $600 soft daily loss flattens, $1,000 EOD trailing locking at
  +$100, max 20 micros, no reset.
- Exact starts: a fresh eval on every session of the half, played to the half's end.
- Monte Carlo: 2,000 evals × 120 sessions in 5-session blocks from the half.
- "Stuck" = still open with less than $100 of room. 1 micro on a typical 46-pt stop costs about $95, so the bot sits out
  almost every trade. It is counted as dead next to "failed".
- Pick on H1 by p10 − 1.5 × dead10 + 0.5 × (MC eventual pass − not passed); check on H2.

| Config | H1 p10 / dead10 | H1 MC eventual pass | H2 p10 / dead10 | H2 MC eventual pass | cost / 2-wk pass H1 · H2 (exact) | max at risk |
|---|---|---|---|---|---|---:|
| C25 = 50K config C scaled (60% room, safe_eval 60% after 10) | 54.6 / 13.4 | 76.8 | 50.7 / 7.2 | 72.2 | $115 · $124 | $581 |
| room 40% | 47.1 / 10.1 | 79.3 | 34.8 / 0.0 | 73.8 | $134 · $181 | $568 |
| room 50% | 53.8 / 10.9 | 77.4 | 47.8 / 4.3 | 72.2 | $117 · $132 | $568 |
| room 70% | 54.6 / 16.0 | 76.2 | 50.7 / 13.0 | 71.2 | $115 · $124 | $581 |
| need × 1.25 | 57.1 / 12.6 | 74.5 | 49.3 / 15.9 | 70.5 | $110 · $128 | $594 |
| max $400 a trade | 53.8 / 13.4 | 77.9 | 49.3 / 7.2 | 70.9 | $117 · $128 | $568 |
| max $300 a trade | 37.8 / 12.6 | 78.0 | 30.4 / 10.1 | 69.4 | $167 · $207 | $568 |
| weekly stop on | 55.5 / 10.9 | 76.2 | 50.7 / 7.2 | 72.3 | $114 · $124 | $581 |
| after 10: safe_eval 40% | 54.6 / 13.4 | 77.4 | 50.7 / 7.2 | 75.7 | $115 · $124 | $581 |
| after 10: safe_eval 30% | 54.6 / 13.4 | 78.5 | 50.7 / 7.2 | 76.9 | $115 · $124 | $581 |
| two_week to the end | 54.6 / 13.4 | 77.7 | 50.7 / 7.2 | 74.0 | $115 · $124 | $581 |
| room 50% + safe 40% | 53.8 / 10.9 | 78.4 | 47.8 / 4.3 | 76.0 | $117 · $132 | $503 |
| **room 50% + safe 30% (pick)** | **53.8 / 10.9** | **79.3** | **47.8 / 4.3** | **77.3** | **$117 · $132** | **$503** |
| room 50% + max $400 + safe 40% | 53.8 / 10.9 | 79.2 | 46.4 / 5.8 | 77.2 | $117 · $136 | $503 |
| room 60% + weekly stop + safe 40% | 55.5 / 10.9 | 77.2 | 50.7 / 7.2 | 75.7 | $114 · $124 | $581 |

- **What moves the result:**
  - Less room per trade (50% instead of 60%) cuts the stuck evals.
  - A smaller size after session 10 (safe_eval 30%) adds 2-5 points of eventual passes.
  - Everything else is noise (±1-2 points).
  - Capping $ per trade at $300 halves the speed.
  - The top 4 configs score within 1.1 points of each other on H1. The pick is the simplest.
- **The 25K fails less but gets stuck more than the 50K.**
  - The $600 day guard and 20 micros keep single losses small, so it rarely touches the floor.
  - But after a couple of losses the room falls under one LIT stop ($100-180 for 1 micro), and the guard then skips trades.
  - Real 2026 back to back (no reset): 4 passes (evals started Jan 2, Jan 7, Jan 8 (passed after 60 sessions) and Apr 2), then the 5th eval
    (from Apr 20) sat at $8 of room for 130 sessions.
  - **Rule for the owner:** a 25K whose room is under $100 is finished. Buy a new one; the bot will not trade it.
- **Money on the eval account:** the no-reset 2026 path of the pick made +$6,452 over 51 trades (PF 2.85, max DD −$992;
  run `lit_25k_rec`, eval-account P&L, not cash).

## 3. Copy trading the 50K and the 25K

Both accounts trade the same signals with the same entry, stop and target. Each is sized on its own room: the 50K with
live config C, the 25K with the pick. Each account is judged on its own first 10 sessions. "Dead" = failed or stuck.

| | H1 same day | H1 25K +1 week | H2 same day | H2 25K +1 week | MC H1 same / +1 wk | MC H2 same / +1 wk |
|---|---|---|---|---|---|---|
| Both pass in 2 weeks | 52.5 | 32.7 | 47.1 | 27.0 | 48.9 / 32.8 | 47.4 / 31.2 |
| Only the 50K passes | 0.8 | 23.0 | 4.4 | 20.6 | 2.6 / 18.8 | 8.3 / 24.4 |
| Only the 25K passes | 1.7 | 20.4 | 0.0 | 23.8 | 1.4 / 16.4 | 0.3 / 16.5 |
| Neither passes in 2 weeks | 44.9 | 23.9 | 48.5 | 28.6 | 47.0 / 32.0 | 44.0 / 27.8 |
| Both dead in 2 weeks | 10.2 | 1.8 | 0.0 | 0.0 | 6.8 / 3.1 | 6.4 / 2.2 |
| Pass correlation | 0.95 | 0.13 | 0.92 | 0.11 | 0.92 / 0.30 | 0.84 / 0.19 |
| Worst combined day | −$1,511 | −$1,067 | −$1,608 | −$1,242 | −$1,511 / −$1,462 | −$1,608 / −$1,608 |
| Both pass in the end (MC 120 sessions) | | | | | 75.3 / 70.1 | 73.0 / 65.8 |
| Neither passes in the end (MC) | | | | | 15.9 / 10.6 | 18.6 / 11.1 |

- **Fees:** $91.80 + $63 = $154.80 for both, i.e. about $150 per 2-week pass across the two (MC).
- **Correlated risk:**
  - Started the same day, the two evals are almost one bet: independent accounts would both die 1% of the time, these
    die together 6-10% of the time.
  - Started a week apart, the windows overlap only partly, and the same bad week hits one account early and the other
    late or not at all.
- **Run `lit_25k_copy`:** both no-reset 2026 paths in one trade list.
  - 2026: 171 trades, PF 3.27, +$55,564 eval-account P&L (~$5,664 a month), max DD −$3,896.
  - The eval columns of that run mix two accounts and are not eval odds.
- **Funded, both passed:**

  | | H1 | H2 (quote this) |
  |---|---:|---:|
  | 50K funded payouts a month (MC 6 months) | $758 | $737 |
  | 25K funded payouts a month | $354 | $278 |
  | **Both funded** | **$1,112** | **$1,015** |
  | 6 months from purchase incl. evals, fees and losses (same paths) | $911 | $780 |
  | Lose both funded accounts in 6 months | 0.5% | 0.4% |

  - These come from `tools/lit_funded_firms.py`, run `lit_ff_mffu_builder_25k`, `research/lit/funded_firms.json`.
  - 25K funded sizing (off until funded_state is wired): risk 25% of the room, $50-$600 a trade, the target pays at most
    $1,250, weekly stop, skip when 1 micro could breach.
  - 2021-25 reference (5m entries, no 1m data): the 25K funded makes about $13 a month. LIT's money is a 2026 result.

## 4. Any reason not to trade both with one bot?

1. **MFFU's copy rule is not confirmed for your own accounts.**
   - Third-party pages (copier vendors, Propvator) say it is allowed.
   - MFFU's own fair-play page bans copying that "coordinates trades for an unfair advantage" and copying with other
     people.
   - There is no hedging problem: both accounts always trade the same side.
   - Ask support in writing before the first 25K trade, and keep the answer.
2. **One bet, twice.**
   - Started the same day, the two accounts pass and fail together (correlation 0.92-0.95).
   - A one-week lag makes "at least one passes in 2 weeks" 68-76% instead of 55% and both dead 0-3%.
3. **The 25K's stuck state.**
   - Under $100 of room the bot stops trading it.
   - The 7-day inactivity rule can then close it. Plan to buy a new one.
4. **Wiring (blocking).** The PC bot routes to one account today with one `lit_sizing`. `engine/live.py`:
   - `eval_room()` uses `mffu_eval()` with the 50K plan;
   - `eval_state()` uses `eval_state()` with TW_50K;
   - `lit_qty()` runs with `max_micros=40`.
   - So a 25K routed with today's code would see a $2,000 max loss and up to 40 micros.
   - What is needed: per-account sizing (the JSON above, the 25K `plan`), each account's own eval days and eval_start, and
     two NinjaTrader accounts in the OIF route.
   - This study did not touch `engine/live.py`, `engine/ninjatrader.py` or `engine/accounts.py`.
5. **Pooled limits.** Nothing says MFFU pools contracts across accounts. At most 40 + 20 micros are open at once, inside
   each account's own cap.

## Files

- `tools/lit_25k.py`:
  - `grid` → `research/lit/builder_25k.json`
  - `copy` → `research/lit/builder_25k_copy.json`
  - `save` → runs `lit_25k_rec`, `lit_25k_c_scaled`, `lit_25k_copy`
- Reused: `tools/lit_2wk.py` (unit trades), `engine/sizing.py` (lit_qty, TW_25K; unchanged), `tools/lit_funded_firms.py`
  (funded).
