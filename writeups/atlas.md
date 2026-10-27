## In one minute

- **What ATLAS is:** account B. Three paper strategies on their **own MFFU Builder 25K** ($63), next to LIT alone on its
  Builder 50K: the London EMA pullback, the MACD sweep divergence and the S/R NY reclaim. Never opposite to LIT.
- **Scored the way the bot really trades it.** The research had one gap: the bot also refuses an ATLAS entry while LIT has a
  setup **armed** the other way (limit working, or waiting for its 1m CISD). That is now in the backtest
  (`tools/atlas_lit_armed.py`: every LIT setup's armed window from the live LIT replay). It blocks 4 EMA trades in 2026 and
  changes little (H1 2-week pass 68.9 -> 72.3, H2 unchanged).
- **ATLAS today on a Builder 25K (2026):**
  - 2-week pass / fail: **72.3 / 0.0** (H1, pick; 5.0% stuck) and **43.5 / 0.0** (H2, check).
  - 1 month: 82.6 / 0.0 and 61.0 / 0.0. Median 5-6 sessions to pass.
  - Eval-path money: **+$19,737 (H1, $3,238 a month)** and **+$5,448 (H2, $1,467 a month)**. 3-4 trades a week.
  - Funded: about **$1,840 paid to you in 3 months** (H1 starts), **+$1,549 per eval bought**.
- **358 tweaks tested, nothing adopted.** Only 5 different ones beat today in both halves; chance alone gives about 3. None is a
  plateau (details below).
- **The late-entry weak spot stays a timing rule, not a new entry.** A limit at the signal price loses about a third of
  the money and is no better when late. Keep the bot's rule: market order about 2 s after the open, skip if more than 45 s
  late.
- **Verdict: keep ATLAS exactly as it is.** Nothing in the code or `second_model.json` changed; account B stays off
  (`"account_b": null`). Run it on Sim / paper first and buy the 25K when the scorecard says "ready".

## The final ATLAS rules (unchanged)

**EMA - London EMA trend pullback**
1. Entries 03:00-09:30 ET, never on a Monday.
2. Trend: the 15-minute and the 1-hour EMA 21 are both above their EMA 50 (below for a short).
3. A pullback reaches the 5-minute EMA 50 and takes out a recent swing low (stop hunt). Then a 5-minute candle closes back
   above the start of the pullback (CISD).
4. Market entry at the next 5-minute open. Stop 1 tick beyond the pullback's low. Target = LIT's VIX band (at least
   1.5R, banked at 8R).
5. At +1R the stop moves to entry + 1.25 points. Flat at 15:55. One EMA trade a day.

**MACD - divergence at a liquidity sweep**
1. Two windows: London 02:00-05:00 ET and the New York open 09:30-11:00.
2. A LIT level is swept by at least 0.5 ATR and a 5-minute candle closes back (CISD) while the MACD line diverges.
3. Market entry at the next 5-minute open. Stop beyond the sweep extreme. Target = the VIX band (at least 1.5R, banked at
   8R).
4. 15-minute check: out if the trade is 0.3R against after 15 minutes and never got 0.5R. Flat at 15:55. One a day.

**S/R - NY sweep-and-reclaim of the day's levels**
1. Entries 09:30-12:00 ET.
2. Levels: yesterday's RTH high/low, overnight high/low, Asia and London boxes, last week's high/low, opening range.
3. An inducement swing is taken first. Then the level is swept and, within 4 bars, a strong 5-minute candle (body at
   least 0.3 ATR) closes back over it.
4. Market entry at the next open. Stop beyond the sweep extreme (max 80 points). Target 2R. The same 15-minute check.
   Flat at 15:55. One a day.

**The account (engine/account_b.py)**
- One position at a time, at most 2 trades a day. Two signals at the same open: EMA, then MACD, then S/R.
- Never opposite to LIT. No entry while LIT holds, enters or has an armed setup the other way. If LIT enters the other way
  while ATLAS is in a trade, ATLAS closes first (HEDGE).
- Size ("need"):
  - micros so one winner's target covers what is left to the $1,500 target;
  - capped at 50% of the room to the trailing floor and by the $600 soft daily loss, max 20 micros;
  - a trade whose full stop-out would break the floor or the $600 is skipped;
  - after session 10: 30% of the room.
- Orders go out about 2 s after the 5-minute open. A probe more than 45 s late is skipped.
- The account stops at a pass ($1,500), a fail, or when stuck (under $100 of room). Then you buy a new $63 eval.

## How it was tested

- **Executor:** `tools/second_account_b.py` (reproduces the published 25K numbers 68.9 / 0.0 and 43.5 / 0.0 exactly), plus
  LIT's armed-setup block.
- **Scoring:**
  - a fresh eval starts on every session: 2-week / 1-month pass, fail and stuck %, median sessions to pass;
  - eval-path $ = back-to-back evals, a new one after each pass, fail or stuck;
  - funded = the 25K sim-funded account at $150 a trade, 3 and 6 months.
- **Picking:** on 2026 H1. H2 (Jul-Oct 16) was only looked at afterwards. 2025 and 2021-24 are the reference.
- **"Better" (owner's test):** in a half, the 2-week pass is up or equal, dead evals (fail + stuck) are not up, and the $
  is up. Adopted only if better in H1 **and** H2 and a plateau (its neighbours also good).
- **Member trades:** a changed member is re-run by its own research code (`tools/atlas_members.py`). The default
  settings reproduce `research/second/*_best.json` exactly (EMA 636, MACD 387, S/R 372 trades).
- **Count:** 358 tweaks in 3 rounds (`research/second/atlas_grid.json`, `atlas_grid_round2.json`, `atlas_grid_round3.json`) plus 13 stress runs
  (`atlas_grid_late.json`).

## Results by family

2-week pass / dead (fail + stuck) % and eval-path $, today vs the best H1 tweak of each family.

| Family (tweaks) | Better in H1 | Better in both | By chance | Best H1 tweak: H1 / H2 |
|---|---|---|---|---|
| **Today** | | | | **72.3 / 5.0, +$19,737 · 43.5 / 0.0, +$5,448** |
| Members, incl. the Asia slot (14) | 0 | 0 | 0 | + Asia: 70.6 / 9.2, +$19,378 · 58.0 / 0.0, +$7,624 |
| Size weights per member (26) | 0 | 0 | 0 | MACD 0.75: 65.5 / 5.0, +$17,187 · 43.5 / 0.0, +$5,554 |
| Priority on the same bar (5) | 0 | 0 | 0 | all equal to today in H1 |
| 25K sizing: room 40-60%, safe after 8-20 sessions, 20-50% (99) | 6 | 1 | 1.3 | room 0.5 / until 15 / 0.4: 72.3 / 5.0, +$19,781 · 43.5 / 0.0, +$6,129 |
| Sizing 2: need buffer, daily cap $300-500, $ cap, safe, hybrid (26) | 0 | 0 | 0 | need x1.25: 68.9 / 5.0, +$23,074 |
| Entry windows (13) | 1 | 1 | 0.2 | **S/R until 11:00: 73.9 / 2.5, +$21,045 · 53.6 / 0.0, +$5,785** |
| Weekdays (14) | 1 | 1 | 0.4 | EMA no Thursday: 78.2 / 4.2, +$24,286 · 43.5 / 0.0, +$6,534 |
| VIX filters per member (15) / VIX size (6) | 2 / 0 | 0 / 0 | 0.1 | MACD VIX < 25: 72.3 / 5.0, +$20,664 · equal |
| Exits per member (29) | 0 | 0 | 0 | EMA 15-min check: 73.9 / 1.7, +$19,664 · 43.5 / 0.0, +$5,843 |
| Limit entry at the signal close (11) | 0 | 0 | 0 | EMA limit 10 min: 72.3 / 4.2, +$17,617 · 43.5 / 0.0, +$5,348 |
| Round 2: S/R window plateau (42) + stacks on it (12) | | 1 + 4 | 0.6 + 5.0 | all stacks include S/R until 11:00 |
| Round 3, risk side: member up-weights x1.25-2 (9 + 24), room 40-60% x need buffer (8), banked R (4) | 3 | 2 | 1.1 | EMA x1.25: 72.3 / 4.2, +$22,201 · 43.5 / 0.0, +$5,533 |

**Why none is adopted:**
- **S/R entries only until 11:00.** It is better in all four periods (H1 73.9 / 2.5 +$21.0k, H2 53.6 / 0.0 +$5.8k, 2025
  30.9 / 28.9 +$5.1k, 2021-24 23.6 / 33.0 +$14.7k). But in H1 it is a 5-minute spike:
  - it wins H1 only by skipping three S/R trades that entered exactly at 11:00 and stopped out (Mar 26, Apr 28, May 14);
  - ending at 11:05, 11:15 or 11:30 gives today's H1 exactly; ending at 10:50-10:55 lowers the H1 pass to 70.6.
  - The H2 gain comes from 3 trades after 11:15, which an H1 pick could not know.
  - Watch it: if the paper trades keep losing after 11:00, revisit with more data.
- **EMA no Thursday:** a calendar rule (the earlier studies found none worth having), one of 14 weekday tries, and it
  makes less in 2025 / 2021-24.
- **Sizing room 0.5 / until 15 / 0.4:** only +$44 in H1. It changes sizes after session 10 only, so the 2-week odds can't
  move. That is noise.
- **Adding the LIT Asia slot** raises H2 (58.0%) but H1 dead evals go from 5.0 to 9.2%, and 2021-24 loses money. It is
  also not routable on account B (cloud paper shadow only).
- **Size weights down** (e.g. MACD or S/R at half size) always cost H1 passes. "One winner passes" needs the full size.
- **Size weights up** (round 3, asked for "push the risk side"):
  - EMA x1.25 (alone, or with S/R x1.25) is better in H1 and H2, but by only +$85 / +$324 in H2;
  - its neighbour x1.5 lifts H1 dead evals from 5.0 to 16.8%: a spike, not a plateau;
  - in 2025 / 2021-24 dead evals rise by 4-5 points and 2021-24 makes -$6.6k less.
  - Bigger room shares (55-60%) and banked R (EMA 4R / 6R, S/R VIX band 2R / 4R) lose H1 passes or add fails.
- **Exits:** every member's exit is already its research plateau. Nothing beats it at the account level in H1.

## The confluence job's candidates (atlas-confluences.md)

A parallel job tested 1,481 confluences, risk changes and member re-runs on the same executor. Its base is identical to
this one (72.3 / 0.0 / 5.0, +$19,737 · 43.5 / 0.0 / 0.0, +$5,448), and its pass count was chance level. Its two hand-off
candidates were checked with this write-up's rule:

| Candidate | H1 2-week pass / fail / stuck, $ | H2 | 2025 | 2021-24 $ | This rule |
|---|---|---|---|---|---|
| Today | 72.3 / 0.0 / 5.0, +$19,737 | 43.5 / 0.0 / 0.0, +$5,448 | 30.5 / 0.0 / 32.9, +$2,232 | +$9,919 | |
| EMA skipped on big-range days (range so far > 0.455 x the 14-day range) | 79.8 / 0.0 / 4.2, +$22,186 | 44.9 / 0.0 / **1.4**, +$6,005 | 29.7 / 0.0 / 29.7, +$4,308 | +$3,409 | no: H2 dead evals up (0.0 -> 1.4) |
| EMA 15-minute check | 73.9 / 0.0 / 1.7, **+$19,664** | 43.5 / 0.0 / 0.0, +$5,843 | 30.1 / 0.0 / 31.3, +$3,694 | +$3,438 | no: H1 $ down ($73) |
| Both together | **71.4** / 0.0 / 1.7, +$18,667 | 44.9 / 0.0 / 1.4, +$6,079 | 29.3 / 0.0 / 29.3, +$3,352 | +$3,492 | no: H1 pass down |
| EMA no Thursday (its #1) | 78.2 / 0.0 / 4.2, +$24,286 | 43.5 / 0.0 / 0.0, +$6,534 | 28.1 / 0.0 / 30.5, +$4,468 | +$6,327 | passes, rejected: calendar rule, references worse |

- None is adopted.
- All of them cost 2021-24 money ($3.4k-6.3k against $9.9k).
- The big-range skip and the 15-minute check are worth logging on paper, as the confluence job suggests. They are not
  trading rules.

**Armed-setup windows checked against the live loop** (`tests/test_atlas_armed.py`):
- 97 sampled 2026 setups were polled through `engine/lit_live.run` (PC early mode, as `tests/test_lit_live.py`): in the
  middle of the window, in its last minute, and 65 s after its end.
- Checked: armed (or entering / in the trade) inside the window, and no longer armed after it.
- The sample includes all 7 of the "confirmed but no trade" setups of 2026 on 1m bars. These are the cases where the
  walker and simulate_x differ (67 of 1,959 in 2021-26): the 1m CISD confirmed, then the backtest dropped the trade
  because the target was under 1.5R from the real fill. The live loop drops them at that same CISD close, so the window
  is right.
- Result: 288 of 291 checks agree. The 3 misses are 1-minute edges: two on a 3-minute window that filled, one on an
  expiry a minute early.

## The late-entry weak spot (second-prelaunch.md)

Every member's entry one 5-minute bar late, at market vs a limit at the signal's close price:

| | H1 2-week pass / dead, $ | H2 | 2025 | 2021-24 $ |
|---|---|---|---|---|
| Today (on time, market) | 72.3 / 5.0, +$19,737 | 43.5 / 0.0, +$5,448 | 30.5 / 32.9, +$2,232 | +$9,919 |
| 1 bar late, market | 49.6 / 5.9, +$4,673 | 33.3 / 10.1, +$133 | 20.1 / 34.1, +$3,687 | -$908 |
| Limit at the close for 10 min, on time | 68.9 / 6.7, +$16,045 | 43.5 / 0.0, +$3,359 | 28.9 / 25.3, +$5,254 | +$2,872 |
| Limit at the close for 10 min, 1 bar late | 52.1 / 6.7, +$5,660 | 18.8 / 5.8, +$2,271 | 28.1 / 18.1, +$1,983 | -$6,713 |

- A limit costs about a third of the 2026 money even when on time, because the best trades never come back to the price.
- When late it is no better than the market order.
- MACD is the robust member: 1 bar late it still makes 50.7% / 0.0 in H2.
- **Keep the bot's timing rule.** It routes about 2 s after the open and skips a probe more than 45 s late, so a lag
  becomes a missed trade (fine: 20% missed keeps about 80% of the money), never a late one. Keep the PC and NinjaTrader
  on time from 01:55 ET.

## Builder 25K: odds and payouts (today's ATLAS)

| | 2026 H1 (pick) | 2026 H2 (check) | 2025 | 2021-24 |
|---|---|---|---|---|
| 2-week pass / fail / stuck | **72.3 / 0.0 / 5.0** | **43.5 / 0.0 / 0.0** | 30.5 / 0.0 / 32.9 | 23.2 / 0.0 / 36.9 |
| 1-month pass / fail | 82.6 / 0.0 | 61.0 / 0.0 | 36.0 / 0.0 | 26.9 / 0.0 |
| Median sessions to pass | 5 | 6 | 4 | 4 |
| Pass within 60 sessions | 87.5% | 100% | 38.4% | 29.9% |
| Eval-path $ ($ a month) | +$19,737 ($3,238) | +$5,448 ($1,467) | +$2,232 ($182) | +$9,919 ($256) |
| PF / win % / trades a week | 2.98 / 52.5% / 3.95 | 2.35 / 56.5% / 2.95 | 1.10 / 38.4% / 4.24 | 1.13 / 36.9% / 4.61 |
| Max drawdown on the path | -$1,403 | -$1,691 | -$4,796 | -$9,510 |
| Funded, paid to you in 3 months | **$1,842** (none lost) | $1,349 (16 starts only) | $190 (74% lost) | $246 (74% lost) |
| Funded, 6 months | $3,734 | - | $485 | $302 |
| $ per $63 eval bought | **+$1,549** | +$1,286 | +$10 | +$11 |

**What a pass then a funded 25K looks like** (MFFU rules, `research/lit/mffu_rules.json`):
- EOD trailing $1,000, locked at start + $100; $600 soft daily loss; 20 micros.
- Payouts $250-$1,000 at 80%, buffer $1,100, 50% consistency, 2 traded days a cycle.
- At $150 a trade a funded 25K paid about **$1,840 in 3 months / $3,700 in 6** from the 2026 H1 starts and was never
  lost.
- $100 a trade pays $678. $200-300 pays no more ($1,760-1,870) and starts losing accounts (3-9%). So $150 stays the
  funded size.
- In a 2025-like year 74% of funded accounts are lost within 3 months: the scorecard is the brake.

## Commands

- `python -X utf8 tools/atlas.py base`: today's ATLAS, published scorer vs the real rules (~2 s).
- `python -X utf8 tools/atlas.py grid`, `round2`, `late`: the families. About 6 + 2 + 2 min on 4 cores; the member sets
  are cached in `research/runs/_cache/atlas_sets/`.
- `python -X utf8 tools/atlas.py save`: runs `atlas_*` and `research/second/atlas.json` (rules + numbers for the
  dashboards).
- `python -X utf8 tools/atlas_members.py check`: the members' default sets equal the stored research trades.
- `python -X utf8 tools/atlas_lit_armed.py`: LIT's armed windows (1,959 setups walked, 630 filled = LIT's trades).
- `python -X utf8 -m tests.test_atlas_armed --n 60`: those windows vs the live LIT loop (~1 min).
- Needs `research/runs/_cache/second_mix_units.pkl` (`python -X utf8 tools/second_mix.py units`, ~15 s).
- Paper research only. Unchanged: ATLAS's rules, `second_model.json` (`"account_b": null`) and `live_model*.json`. Code
  edits: the daily-loss fix below, and a new research window name `"ny11"` in `tools/second_sr.py` (no default uses it).

## Fix found on the way: the soft daily loss on every trade (engine/account_b.py)

- **The bug** (found by the scaling-plan job): after session 10 (safe_eval sizing) account B's size had no daily-loss
  check, and the 50K preset had no day guard at all. One stop-out could then cost more than the plan's soft daily loss
  allows (25K up to $628 vs $600, 50K up to $1,255 vs $1,000).
- **The fix:** `engine/account_b.dll_guard`, on every account B trade (need and safe, every session, both plans):
  - one trade's full stop-out (stop + 2 ticks of slippage + $1.90 a micro, as the research models it) never exceeds what
    is left of today's soft daily loss ($600 / $1,000 + today's closed P&L);
  - when not even 1 micro fits, no trade.
- **Test:** `tests/test_second_account_b.py` sweeps 25K / 50K x need / safe x sessions 1-25 x room x day P&L x stop
  (0 breaches), plus the 50K session-11 case (40 micros before, 34 now).
- **Effect:**
  - Builder 25K: no change in any number. Its day guard already covered this in every case the backtest meets.
  - Builder 50K (`research/second/account_b.json`): H1 / H2 unchanged; 2025 path -$4,066 -> -$2,904; 2021-24 +$2,364
    -> +$13.
  - The ATLAS harness uses the same guard (`tools/atlas.py q_variant`). All grids were re-run with it; the numbers are
    the same as above.
