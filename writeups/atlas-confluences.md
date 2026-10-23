## In one minute

- **The question (owner, 2026-10-22 night):** "Find a way to progress this strategy, whether it's adding a confluence or risking
  something else, make it better. I expect good results."
- **ATLAS** = account B on an MFFU **Builder 25K**. It trades three strategies:
  - EMA = London EMA pullback;
  - MACD = MACD divergence at a sweep;
  - S/R = S/R NY reclaim.
- **Scored exactly as the bot would trade it:**
  - need size (`engine/account_b.qty`), one position, max 2 a day, the $600 soft daily loss, "stuck" under $100 of room;
  - never opposite LIT: no entry while LIT holds the other side or has a setup **armed** the other way, and closed when LIT
    enters the other way.

  The armed block is new in the scoring. It moves today's numbers a little (H1 2-week pass 68.9 to 72.3).
- **ATLAS today under these rules:**

  | | 2-week pass / fail / stuck | 1 month pass / fail | Eval-path $ | $/month | PF | Trades/wk |
  |---|---|---|---|---|---|---|
  | 2026 H1 (pick) | 72.3 / 0.0 / 5.0 | 82.6 / 0.0 | +$19,737 | $3,238 | 2.98 | 3.95 |
  | 2026 H2 (check) | 43.5 / 0.0 / 0.0 | 61.0 / 0.0 | +$5,448 | $1,467 | 2.35 | 2.95 |
  | 2025 (reference) | 30.5 / 0.0 / 32.9 | 36.0 / 0.0 | +$2,232 | $182 | 1.10 | 4.24 |
  | 2021-24 (reference) | 23.2 / 0.0 / 36.9 | 26.9 / 0.0 | +$9,919 | $256 | 1.13 | 4.61 |

- **What was tried (1,481 variants, all counted):**
  - **confluences:** 34 facts, each as a skip filter and as a size tilt;
  - **risk:** member weights, trades a day, the 25K sizing knobs;
  - **exits, stops and entries:** each member re-run by its own research code (targets, breakeven, the 15-minute check,
    wider stops, limit entries);
  - **a 1m confirmation entry** like LIT's;
  - **combinations** of the survivors.
- **Result: nothing beats chance.**
  - 20 of 1,228 confluence rules pass the test. With the facts **shuffled** across the trades, 24.4 pass on average (6 to 50,
    20 rounds).
  - The facts also do not sort winners from losers. "WITH trades beat AGAINST trades in both halves" holds for 12 facts, and
    13.6 with shuffled facts.
  - 0 of 153 risk changes pass.
  - The 1m confirmation and limit entries lose trades and money.
- **Verdict: nothing adopted, nothing built.** `second_model.json` and the engine are unchanged. Two leads go to the ATLAS job
  for **paper logging only** (next section).

## Top 5 survivors (ranked on H1, then checked on H2)

The "chance" column is a random-pick placebo: the same rule on the same number of randomly picked trades of the same strategy,
200 draws. "p H2" is the share of random picks that gain at least as much in H2. "Random passes" is the share that pass the
whole test.

| # | Change | H1 2-wk pass/fail/stuck, path $ (PF), /wk | H2 2-wk, path $ (PF), /wk | 2025 $ | 2021-24 $ | Chance: p H2 / random passes |
|---|---|---|---|---|---|---|
| | **ATLAS today** | 72.3 / 0.0 / 5.0, +$19,737 (2.98), 3.95 | 43.5 / 0.0 / 0.0, +$5,448 (2.35), 2.95 | +$2,232 | +$9,919 | |
| 1 | EMA: no trade on **Thursdays** | 78.2 / 0.0 / 4.2, +$24,286 (3.98), 3.44 | 43.5 / 0.0 / 0.0, +$6,534 (3.28), 2.56 | +$4,468 | +$6,327 | 0.10 / 9% |
| 2 | EMA: no trade on a **big-range day** (range so far > 0.455 x the 14-day average range) | 79.8 / 0.0 / 4.2, +$22,186 (3.76), 3.32 | 44.9 / 0.0 / 1.4, +$6,005 (2.82), 2.31 | +$4,308 | +$3,409 | 0.16 / 3.5% |
| 3 | EMA: **x0.5 on Thursdays** | 74.8 / 0.0 / 4.2, +$22,122 (3.43), 3.95 | 43.5 / 0.0 / 0.0, +$6,463 (2.80), 2.88 | -$723 | +$4,539 | 0.03 / 10.5% |
| 4 | EMA: no trade once **LIT already closed a winner** that day | 73.9 / 0.0 / 0.8, +$19,309 (3.02), 3.83 | 43.5 / 0.0 / 0.0, +$5,448 (2.34), 2.88 | +$4,738 | +$9,190 | 0.79 / 21% |
| 5 | EMA exit: **+ LIT's 15-minute check** (tchk 3 bars, 0.3R, 0.5R MFE) | 73.9 / 0.0 / 1.7, +$19,664 (3.08), 3.98 | 43.5 / 0.0 / 0.0, +$5,843 (2.31), 3.01 | +$3,694 | +$3,438 | an exit: no placebo |

Next in line: S/R with LIT's Monday rule (H1 73.9 / 0.0 / 3.4, H2 unchanged) and MACD x0.5 after a gap against the trade (H1
+$21,892, H2 +$5,675). Everything is in `research/second/atlas_candidates.json`.

What the numbers say:
- **Thursday (1 and 3)** is the classic data-mined weekday. It is not better than random in H2 (p 0.03-0.10 among 17
  survivors is what chance gives the best of them), and it costs 2021-24 money.
- **The big-range-day skip (2)** is the best-shaped lead:
  - it has a reason (an EMA pullback after a big expansion morning tends to fail);
  - skip, x0.5 and the tilt all pass, so it is a plateau, not a spike;
  - random skips pass the whole test only 3.5% of the time.

  But its H2 gain is small (+$557, one more 2-week pass and one more stuck eval out of 69 starts). It drops H2 to 2.31 trades
  a week, and 2021-24 falls from +$9.9k to +$3.4k.
- **The 15-minute check on EMA (5)** is LIT's own rule, so it is not a new search. It cuts H1 stuck evals from 5.0% to 1.7%
  and adds +$395 in H2, but costs about $6.5k in 2021-24.
- **Combined**, big-range skip + 15-minute check gives H1 71.4 / 0.0 / 1.7, +$18,667 and H2 44.9 / 0.0 / 1.4, +$6,079. That
  is no better than either alone (run `atlas_c_combo_dayrng_t15`).
- **$ per eval bought** (H1 starts, 3 months funded): today $1,549. Thursday skip $1,792, big-range skip $1,688, 15-minute
  check $1,629. In H2 every one of them is $1,286-1,287, the same as today.

**Which to adopt: none.** If the ATLAS job wants something to log on paper next to the live rules, take #2 (EMA big-range-day
skip) and #5 (EMA 15-minute check). Switch neither on until the 20-trade paper scorecard
(`second-prelaunch.md`) has run, then revisit with more H2 data.

## Every family tested

| Family | What | Variants | Pass the test | Chance level | Best H2 |
|---|---|---:|---:|---|---|
| Confluence filters / tilts | 34 facts x both directions x skip / x0.5 / x1.25 / x1.5 / tilt x 4 scopes (ATLAS, EMA, MACD, S/R); 132 more touch no trade | 1,228 | 20 | shuffled facts: 24.4 (6-50) | +$1,086 (EMA Thursday skip) |
| Selection test | does a fact sort winners from losers (WITH vs AGAINST, both halves) | 136 | 12 with / 6 against | 13.6 / 14.3 | - |
| Member size weights | EMA / MACD / S/R x 0.5, 0.75, 1, 1.25, 1.5 | 124 | 0 | | |
| Drop a member | any 1 or 2 of the 3 | 6 | 0 | | all worse: 2-week pass 41-57% |
| Trades a day | max 1; max 3; 2nd entry only after a win; only after a loss | 4 | 0 | | after a win: H2 52.2% but H1 62.2% |
| 25K sizing knobs | room share 0.35-0.7, safe share 0.2-0.5, two_week horizon 5-20, $ cap 250-450, need buffer 0.75-1.5 | 19 | 0 | | room 0.6: H2 +$8,493 but stuck evals up (H1 10.1%, 2021-24 50%) |
| EMA re-runs | targets 2R / 3R / 4R, VIX band 0.75 / 1.25, bank 3R / 5R, min 2R, BE off / 0.5R / 1.5R / at entry, 15-minute check, ride 15m, stop +2 / +5 pts, limit entry | 19 | 1 (15-minute check) | | 15-minute check +$395 |
| MACD re-runs | 2R / 3R / next level, BE, 15-minute check off, stop +2 / +5, limit entry | 9 | 0 | | no 15-minute check: H2 56.5% / +$7,270 but H1 -$5,588 |
| S/R re-runs | 3R, level / VIX band banked at 3R / 5R, BE, 15-minute check off, stop +2 / +5, limit entry | 10 | 0 | | stop +5: H2 53.6% but H1 63.0% |
| 1m confirmation (2026) | wait up to 20 1m bars for a 1m CISD, enter at the next 1m open (LIT's rule) | 4 | 0 | | cuts 2026 trades from 175 to 60: 1.37 a week |
| Combinations | 2-3 of the top survivors | 58 | 56 (built from H1 survivors: not evidence) | | +$1,412 (EMA Thursday skip + skip after a LIT winner + big-range tilt) |

The partial-at-1R EMA variant gives the same trades as today here: the unit conversion uses the final exit price, so a partial
is not measurable this way. It is not counted.

## The facts (all from closed bars)

- **LIT's own context:**
  - LIT traded or armed a setup earlier today, same side or the other side;
  - LIT already closed a winner or a loser today;
  - the day already took yesterday's high or low;
  - LIT's Monday rule (Friday's high / low);
  - entry vs the 18:00 open;
  - room left to the VIX-band target.
- **Structure:**
  - 15m and 1h break-of-structure direction;
  - premium / discount of the day's range;
  - 1h EMA 21 side, 15m EMA 21 / 50 trend;
  - prior day's direction;
  - the 18:00 gap.
- **Session:** the London / NY overlap; minutes since the session open; day of week; high-impact news day and news already out.
- **ES (from 2025-04, the ES file's start):** SMT divergence over the last hour vs the 3 hours before; ES vs NQ strength.
- **Volatility:**
  - VWAP side and distance;
  - signal-bar range and volume;
  - ATR regime;
  - the day's range so far vs the 14-day average;
  - VIX level and 5-day change, VXN level;
  - stop width in ATR (size by stop width).
- **Continuous facts:** WITH = the top third and AGAINST = the bottom third, with cut points from 2026 H1 only.
- **No look-ahead:** the facts of 30 random trades were recomputed on data files cut at each entry. All 30 are identical.

## How it was scored (tools/atlas_conf.py)

- **Executor:** `tools/second_account_b.py` (the same one that gave second-account-b.md), on the Builder 25K plan, plus:
  - LIT's armed setups from the live LIT replay (the ATLAS job's method, `research/runs/_cache/atlas_lit_armed.pkl`);
  - its walker matches the engine's fill / no fill on 1,892 of 1,959 setups; the 67 that differ are the ATLAS job's to
    check.
- **Size tilts** go through the bot's own sizer: the two_week press multiplier, before the 25K caps of 50% of the room, the
  $600 soft daily loss and 20 micros. After session 10, the safe share of the room caps them.
  - So a tilt can never risk more than the bot allows.
  - That is also why up-sizing does little: the "one winner passes" size usually sits at a cap already.
- **The test:**
  - H1 eval points (2-week pass - 2 x fail - stuck) + $/1000 up by more than 1;
  - H2 eval points and $ not lower;
  - 2-week fails not up in either half;
  - 2+ trades a week in both halves.
- **Chance:**
  - the whole confluence family re-run 20 times on shuffled facts;
  - a random-pick placebo (200 draws) for each survivor;
  - the WITH-vs-AGAINST selection count against 20 shuffles.
- **Member re-runs** use each strategy's own research code. The default settings reproduce `research/second/*_best.json`
  exactly (EMA 636, MACD 387, S/R 372 trades).
- **The 1m test** is a generic 1m simulator with each member's stop, target, breakeven and 15-minute rule. At the research
  entry it reproduces the research: H1 identical, H2 44.9 / +$5,906 vs 43.5 / +$5,448.

## Why nothing works

- **ATLAS is already tuned on 2026 H1**, member by member.
- **The account-B size is "one winner passes"**: one target hit decides most evals. So a filter changes the result only
  when it removes the one loser before the winner, and that is close to a coin flip.
- **H2 has 69 eval starts**, so one more pass moves the rate by 1.4 points. Most survivors leave H2 at exactly 43.5%.
- **The 25K caps already sit at the limit**, so "risking more" either changes nothing or creates stuck evals (room 0.6 / 0.7:
  H1 stuck 10-15%, 2021-24 dead 50-55%).

Paper research only. No engine file, `second_model.json`, `live_model*.json` or UI file was changed.
