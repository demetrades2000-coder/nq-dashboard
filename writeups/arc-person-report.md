# PERSON track: discretionary draws, structural stops and person-style management

Built 2026-10-16, 18:25–20:10 ET. Owned files: `engine/model.py` (new params only) and `engine/liquidity_map.py` (new).
Rules follow `research/lab/DOL_PLAYBOOK.md`, `research/lab/DRAW_LEARNER.md` and `research/lab/TRADER_HEURISTICS.md`.
Data: real CME NQ1! 5m bars only (`data/NQ_5m.csv`, `data/NQ_1h.csv`); no CFD.

## 1. Verdict

**No person-style variant beats today's live pick on 2026 profit.**

| | live pick (base) | **16_heuristics** (best on the owner's 2026 criteria) | 14_far_pm (most robust person-style) | 15_mgmt_on_base (most profit person-style) |
|---|---:|---:|---:|---:|
| 2026 ytd trades (per week) | 93 (2.26) | 91 (2.21) | 94 (2.28) | 95 (2.31) |
| 2026 ytd PF | 2.41 | 1.78 | 1.63 | 1.90 |
| 2026 ytd net | **+$11,630** | +$6,300 | +$5,667 | +$7,671 |
| 2026 max drawdown | −$3,147 | **−$2,640** | −$3,216 | −$2,904 |
| 50K pass rate (zero-edge baseline) | 48.1% (27.0) | **70.6% (29.1)** | 53.5% (12.8) | 44.1% (28.6) |
| losing months, Jan–Oct 2026 | 5 | **4** | **4** | 5 |
| dev Jan–Jun (untuned half) | +$592 | **+$1,613** | +$1,540 | +$210 |
| confirm Jul–Oct | **+$11,038** | +$4,686 | +$4,127 | +$7,460 |
| 2025 (Apr–Dec) | +$1,361 | −$527 | +$1,289 | **+$1,540** |

- **16_heuristics** wins on four of the owner's five 2026 criteria:
  - fewer losing months
  - 2–5 trades a week
  - lower max drawdown, though still above the $2k limit
  - a much higher 50K pass rate

  It earns about **half of base's 2026 profit**, because it gives up most of Aug–Oct. Its edge over 14_far_pm is **fragile**:
  - The common trades are almost identical (−1.5R).
  - All of the gain comes from 15 trades that differ (+4.6R).
  - The plain continuous backtest reverses the sign.
  - 2025 drops from +$1,289 to −$527.
- **14_far_pm** is the robust person-style candidate. It is positive in dev, confirm and 2025, beats base in the untuned dev half, and has 4 losing months and a 53.5% pass rate.
- **The full DOL playbook stack loses money in 2026** (8_full −$2,724; without its skip rules −$328). Step by step, only the partial + breakeven step clearly helps. The playbook target, its time exits and its skip rules each hurt (section 5).
- **The retest entry** (chart-gallery idea) fills 73–87% of orders, but the fills are adverse: dev win rate 6.5%, −$3,892; 2026 ytd +$2,891 at 1.84/wk. It is clearly better in 2025 (+$4,441 vs +$1,361), another regime split.
- **The protected-swing stop** and the retest + protected + person combination lose (2026 ytd −$286, 2025 −$1,186).
- **Nothing clears the $2k max-DD gate** on 2026 ytd except variants that fall under 2 trades a week. Base doesn't clear it either.

**Recommendation.** Keep the live pick for the eval. If the owner wants the bot to trade like a person, paper-trade **16_heuristics** (or the more robust **14_far_pm**) next to it. Adopt it only if it holds up on new data. Its advantage is smoother equity and a higher pass rate, not more money, and that advantage comes from the Jan–Jul 2026 regime.

Best params (16_heuristics), on top of nothing else:
```json
{"grade_sizing": false, "conviction_step": 0, "max_trades_day": 1,
 "target_mode": "draw", "draw_pick": "farthest_reach", "draw_fallback": "skip", "draw_pm": "nearest",
 "manage_mode": "person", "person_trail": false,
 "draw_pdx": true, "draw_one_side": true, "no_fade_drive": true, "balance_first": true}
```
Robust alternative (14_far_pm): the same without the last four keys.

## 2. What was built (every piece is off by default)

### 2.1 `engine/liquidity_map.py`: a causal liquidity map

**Draws.**
- **ERL (resting pools)** are the engine's pools:
  - PWH/PWL, PDH/PDL
  - Asia / London / overnight H/L
  - 1H swings, 15m swings and EQ pools

  The map adds its own pools:
  - prior RTH H/L, usable from 16:00
  - 4H and daily 3-bar swings, usable at the close of the confirming bar; swings confirmed during the warm-up are checked against 1H bars for "already taken"
  - fresh 5m swings (k=2, today or yesterday)
  - fresh 15m swings (k=1, last 5 days)

  Prior-day H/L and session H/L older than the current CME day are dropped (D7). The same price from several lenses is one pool.
- **IRL** = live fair value gaps on 5m / 15m / 1H / 4H / 1D, on the trade's side:
  - bearish gaps above price for a long
  - bullish gaps below price for a short

  Only the 10 nearest 4H/1D gaps count.

**Gap lifecycle (D6).**
- A gap exists from the close of candle 3.
- Minimum size: on 5m, max(1 tick, 0.1 × Wilder ATR14); on 15m+, 1 tick.
- It stops being a draw when **a wick touches its CE**. This is checked on every closed 5m bar for every timeframe, the same rule the draw learner uses.
- Selectable alternatives: `ce_close`, `touch`, `full`.
- Expiry: 5m at the end of the next CME day, 15m after 5 days, 1H after 10 days, 4H/1D never.

**Tiers (DOL-3).**

| tier | contents |
|---|---|
| A | PW, PD, RTH, ON, Asia, London, 4H/D swings, EQ |
| B | 1H swings, live 1H/4H/1D gaps |
| C | 5m/15m swings, live 5m/15m gaps |

**Per-draw features** (also what `engine/draw_learner.predict()` receives):
- `kind`, `source`, `tier`
- `dist_atr` (distance / Wilder ATR14 of 5m), `dist_r`
- `obstacles`: DOL-6 n_res. These are fresh 5m/15m swing points plus live opposing 15m+ gap zones strictly between entry and the draw. Overlapping zones, and items within max(2 ticks, 0.1 ATR) of each other, count once.
- `age_h`, `eq`
- `htf_dir`: 1H structure trend × direction
- `session`: AM/PM
- `within_reach`: dist ≤ max(0.5·ADR10, ADR10 − today's range)

### 2.2 Target: `target_mode "draw"` (`draw_*` params)

**Pick rules:**
- `draw_pick "tier"` (playbook DOL-4): the nearest Tier-A draw ≥ `draw_min_rr` (2R) within reach, else the nearest Tier-B.
- `"significance"` (the brief's rule): the most significant clean ERL, W > D > session > 1H swing with EQ +1, among draws with ≤ `draw_max_obst` obstacles.
- `"farthest_reach"` (draw-learner variant a): the farthest Tier A/B ERL ≥ 2R that is still within reach. If none qualifies, the nearest within-reach draw ≥ 1.5R.

**Learned rank.** `draw_rank "learned"` picks the max EV = p·R − (1−p) using `engine/draw_learner.predict`. It falls back to the rule when the module or model is missing, or when predict() returns None.

**Overrides:**
- `draw_pm "nearest"`: PM entries take the nearest within-reach draw ≥ 1.5R (draw-learner variant c).
- `draw_fallback` when nothing qualifies: `2r` | `skip` | `major` (today's rule).
- The exit sits 2 ticks before the pool. There is no R cap.

**Trader heuristics:**
- `draw_pdx` (B1): if yesterday closed beyond the day-before's high (low), target yesterday's high (low). It is void once the opposite extreme trades first.
- `draw_one_side` (B3): on an inside 09:30 open, once one prior-RTH extreme is taken in RTH, never target the other one or anything beyond it.
- `balance_first`: if the RTH open is inside the prior value area, take the nearest within-reach draw.
- `no_fade_drive` (T1): pass on trades against an opening drive. By 10:00 the open has not been revisited from bar 3 on, the adverse move is ≤ 0.05·ADR20, and the move is ≥ 0.20·ADR20.

**DOL-6 skip rules:**
- `draw_hrlr "tp1"`: with 3 or more obstacles, everything exits at TP1; skip if TP1 is under 2R.
- `draw_block_r`: pass if a live opposing 1H/4H gap starts within 1R.

### 2.3 Stops: `stop_model`

- **`struct_atr`** (STOP-1..3): stop = sweep extreme − max(2 ticks, `stop_atr_buf` 0.1 × Wilder ATR14).
  - It is never widened to a minimum (no forced 10-point floor) and never tightened.
  - Pass if the stop is inside the noise (< `min_stop_atr` 0.5 × ATR) or there is no draw ≥ min_rr.
  - `stop_cap "size"`: the only "too wide" veto is the playbook's (risk $ buys < 1 micro); `"spec"` also passes above 60 NQ points.
  - `stop_origin` optionally uses the displacement-origin higher low.
- **`protected_swing`**: the invalidation is the lowest low from the candle before the in-favour run that ended at the trigger, through the trigger bar. It is never beyond the sweep wick.
- Size is unchanged: risk $ / (stop × point value).

### 2.4 Management: `manage_mode "person"` (MGMT-1..4) and entries

**Management sequence:**
1. **TP1** is the first internal draw in [`irl_min_r` 1R, T). Candidates are live gaps and Tier B/C pools; within 0.25R of the nearest one, prefer an HTF gap, then EQ, then a swing, then a 5m gap. The partial is ceil(n × `irl_partial_pct` 0.5), always keeping 1 runner.
2. **Breakeven** moves to entry + 2 ticks at the first of TP1 or +1R (`person_be_r`).
3. **Trail** (`person_trail`): after BE, each 5m BOS lifts the stop to the new protected low − buffer.
4. The runner exits at T.

**Other exits:**
- `exit_rules "giveback,cisd_disp"` adds the opposing-CISD-with-displacement exit (MGMT-5).
- `time_stop_min` (MGMT-7 stall).
- `noon_exit`: at 12:00, exit an AM trade whose stop is still below entry.

**Retest entry.** `entry_mode "retest"` rests a limit at the trigger zone (the IFVG near edge or CE; the CISD level) for `retest_bars` bars:
- It fills only on a 1-tick trade-through; a gap through the limit fills at the open.
- It is cancelled on expiry, at flat time, or if price reaches the target first.
- On the fill bar only the post-fill range is managed (a stop can hit, a target cannot).

### 2.5 API for every model (requested for `tools/trader_layer.py`; documented at the top of the module)

**`draws_at(bars5_df, t_entry, d, entry, stop, es5_df=None, **opts) -> list[dict]`**
- Input: the strategy_lab frame. Only bars closed at or before `t_entry` are used.
- Output: every draw with all the features above, `within_reach`, and `role` ("final" / "partial" / None). The two role draws also carry `target` (the exit price).
- Defaults: the `farthest_reach` pick plus PM nearest (14_far_pm's target logic).
- It is standalone: pools are rebuilt from the 5m frame, and `eq` is always False.
- Check (`tools/lab_person_api_test.py`) on 12 engine trades:
  - final target price identical in 11 of 12
  - TP1 mostly identical
  - 0.18 s per call

**`new_position(...)` and `manage_step(position, bar_index, context) -> {"fills", "closed", "stop"}`**
- Person management for one closed bar, the same rules as `manage_mode "person"`.
- On the test trade it reproduces the engine's exit (TARGET 29747.00 × 12).

## 3. Regression proof

**Default backtest.** `python -c "from engine.backtest import run; r=run('NQ','5m',{'days_from':'2026-08-06','days_to':'2026-10-16'},light=True); print(r['stats']['trades'], r['stats']['net'])"` with `LE_NO_AUTOSTART=1`:
- before any edit: **`31 13347.5`**
- after the final edit: **`31 13347.5`**
- checked 8 times during the build, after every engine change

**Live-pick replay.** The live pick's 2026 ytd replay reproduces the brief's reference exactly:
- 93 trades, PF 2.41, +$11,630, max DD −$3,147, pass 48.1% vs 27.0%
- every month identical, Jan +894 … Oct +1,964

**Live-loop harness.** `python -X utf8 -m tests.test_live_dryrun --quick`:
- **40/44 before my first edit** and **40/44 after the final edit**
- the same 4 failures with identical detail strings:
  - replay entries/exits match the plain backtest
  - restart: exit routed exactly once
  - kill switch: blocks later routes
  - hygiene: harness did not write `data/live_state.json`

The brief expected 41/44. The hygiene check already failed before I touched anything: the running :8766 server writes `data/live_state.json`. It is an environment issue, not code.

## 4. Method

**Replay and scoring:**
- `tools/strategy_lab.py` live-loop replay (`engine_trades`, `--procs 2`), driven by `tools/lab_person_run.py`. strategy_lab itself was untouched.
- Every session is an independent 20-day replay. So **one replay over ytd** scored with `strategy_lab.score()` as dev, confirm, aug_oct and ytd is exactly what separate runs would give; y2025 is a second replay.
- Scorecards: `research/lab/P_<variant>__<period>.json`. Trades: `research/lab/P_<variant>_trades_<period>.json`. Confirm/ytd runs are logged in `confirm_log.csv`; LEADERBOARD.md was refreshed.

**Variants.** Base = the live pick; every variant = base + the listed params.
- **23 variants, all reported.** They were pre-registered in `tools/lab_person_run.py` in four waves as new instructions arrived:
  1. the playbook ladder, stops and combinations
  2. the draw-learner variants (a/b/c) plus person management on today's target
  3. the trader heuristics
  4. the chart-gallery retest / protected-stop ideas
- Two design calls were made after looking at plain-backtest diagnostics on the **dev** window:
  - The playbook's "n < 1" stop veto replaced the 60-pt cap. 7b_stop_cap60 isolates it.
  - 8b_noskip was added because the skip rules cut frequency in the Aug–Oct smoke run.
- No other parameter values were tried.

**Map revision (v2).** After the draw-learner hand-off I aligned the map with its definitions:
- wick-to-CE checked on every 5m bar for all timeframes
- swing lookbacks
- stale prior-day pools dropped
- all pools ERL
- 10 nearest 4H/1D gaps

I then re-ran all 14 map variants. The v1 scorecards are archived in `research/lab/person_v1/`. Differences were ≤ $170 on ytd, with the same picture.

## 5. Results (2026 dev / confirm / ytd, and 2025)

| variant | dev net (PF) | confirm net (PF) | ytd trades (/wk) | ytd PF | ytd net | ytd max DD | 50K pass % (zero-edge) | losing months 2026 | y2025 net (PF) |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| base | +592 (1.11) | +11,038 (5.15) | 93 (2.26) | 2.41 | +11,630 | -3,147 | 48.1 (27.0) | 5 | +1,361 (1.14) |
| 1_target | -3,294 (0.5) | +5,192 (2.92) | 94 (2.28) | 1.21 | +1,899 | -3,966 | 37.3 (32.4) | 6 | +1,195 (1.13) |
| 2_partial_be | -1,714 (0.73) | +5,086 (2.89) | 94 (2.28) | 1.37 | +3,372 | -3,124 | 40.3 (30.0) | 6 | +752 (1.08) |
| 3_trail | -1,653 (0.74) | +4,737 (2.76) | 94 (2.28) | 1.34 | +3,084 | -3,064 | 39.7 (27.9) | 6 | +915 (1.1) |
| 4_cisd | -1,545 (0.76) | +4,790 (2.79) | 94 (2.28) | 1.36 | +3,245 | -3,000 | 40.3 (27.9) | 6 | +1,084 (1.12) |
| 5_time | -2,263 (0.67) | +4,323 (2.51) | 95 (2.31) | 1.21 | +2,060 | -3,441 | 33.3 (27.9) | 6 | +1,826 (1.19) |
| 6_skip | -1,362 (0.73) | +2,974 (3.48) | 62 (1.5) | 1.26 | +1,612 | -1,983 | 24.6 (0.0) | 6 | -2,456 (0.69) |
| 7_stop | -1,577 (0.71) | +4,926 (2.25) | 128 (3.11) | 1.36 | +3,349 | -3,260 | 64.6 (41.0) | 4 | -1,134 (0.89) |
| 7b_stop_cap60 | -279 (0.92) | +5,238 (3.6) | 63 (1.53) | 1.9 | +4,959 | -2,557 | 54.1 (32.4) | 5 | +203 (1.02) |
| 8_full | -3,674 (0.46) | +949 (1.28) | 107 (2.6) | 0.73 | -2,724 | -4,377 | 0.0 (0.0) | 6 | -1,540 (0.82) |
| 8b_noskip | -2,767 (0.65) | +2,439 (1.64) | 139 (3.37) | 0.97 | -328 | -3,740 | 0.0 (0.0) | 5 | -94 (0.99) |
| 9_sig | -1,470 (0.78) | +1,961 (1.46) | 124 (3.01) | 1.04 | +492 | -3,210 | 0.0 (0.0) | 5 | -1,350 (0.87) |
| 10_learned (in-sample) | -3,053 (0.52) | +5,412 (3.15) | 93 (2.26) | 1.27 | +2,359 | -3,726 | 34.1 (32.0) | 6 | +358 (1.04) |
| 12_far | +434 (1.08) | +4,937 (2.94) | 82 (1.99) | 1.65 | +5,371 | -3,196 | 36.5 (26.5) | 6 | +1,408 (1.18) |
| 13_far_partial | +371 (1.06) | +4,380 (2.69) | 83 (2.01) | 1.57 | +4,751 | -3,014 | 31.8 (25.6) | 6 | +1,216 (1.15) |
| 14_far_pm | +1,540 (1.27) | +4,127 (2.27) | 94 (2.28) | 1.63 | +5,667 | -3,216 | 53.5 (12.8) | 4 | +1,289 (1.16) |
| 15_mgmt_on_base | +210 (1.04) | +7,460 (3.84) | 95 (2.31) | 1.9 | +7,671 | -2,904 | 44.1 (28.6) | 5 | +1,540 (1.15) |
| **16_heuristics** | +1,613 (1.3) | +4,686 (2.7) | 91 (2.21) | 1.78 | +6,300 | -2,640 | 70.6 (29.1) | 4 | -527 (0.94) |
| 17_retest6 | -3,892 (0.4) | +6,782 (3.94) | 76 (1.84) | 1.33 | +2,891 | -3,911 | 47.1 (45.0) | 6 | +4,441 (1.42) |
| 17b_retest12 | -3,894 (0.4) | +6,764 (3.91) | 79 (1.92) | 1.32 | +2,871 | -3,913 | 47.1 (45.5) | 6 | +4,384 (1.42) |
| 18_protected | -1,092 (0.77) | +3,759 (2.06) | 82 (1.99) | 1.32 | +2,667 | -3,483 | 35.1 (27.7) | 5 | -2,414 (0.73) |
| 19_combo6 | -1,819 (0.68) | +1,533 (1.54) | 64 (1.55) | 0.97 | -286 | -2,164 | 0.0 (0.0) | 5 | -1,186 (0.89) |
| 19b_combo12 | -1,857 (0.67) | +1,503 (1.53) | 66 (1.6) | 0.96 | -354 | -2,202 | 0.0 (0.0) | 5 | -1,258 (0.89) |

**Variant definitions** (base + …):

| variant | added on top of the previous / base |
|---|---|
| 1_target | `target_mode draw` (playbook tier pick) |
| 2_partial_be | 1 + `manage_mode person`, `person_trail false` |
| 3_trail | 2 + `person_trail true` |
| 4_cisd | 3 + `exit_rules "giveback,cisd_disp"` |
| 5_time | 4 + `time_stop_min 60`, `noon_exit true` |
| 6_skip | 5 + `draw_hrlr tp1`, `draw_block_r 1.0` |
| 7_stop | base + `stop_model struct_atr` |
| 7b_stop_cap60 | 7 + `stop_cap spec` |
| 8_full | 6 + struct_atr |
| 8b_noskip | 5 + struct_atr |
| 9_sig | 8 + `draw_pick significance` |
| 10_learned | 1 + `draw_rank learned` (**in-sample**: `data/draw_learner.json` is trained on 2021-11..2026-10-13) |
| 12_far | 1 + `draw_pick farthest_reach`, `draw_fallback skip` |
| 13_far_partial | 12 + person (no trail) |
| 14_far_pm | 13 + `draw_pm nearest` |
| 15_mgmt_on_base | base + person (no trail), today's target |
| 16_heuristics | 14 + `draw_pdx`, `draw_one_side`, `no_fade_drive`, `balance_first` |
| 17 / 17b | base + `entry_mode retest`, `retest_bars` 6 / 12 |
| 18_protected | base + `stop_model protected_swing`, `stop_cap spec` |
| 19 / 19b | 17 / 17b + protected_swing + person (no trail) |

**Retest fill rate** (plain backtest; `tools/lab_person_fillrate.py`):

| variant | period | orders | filled | expired | ran to target first | stopped on the fill bar | winners among fills |
|---|---|---:|---:|---:|---:|---:|---:|
| 17_retest6 | dev | 52 | 42 (81%) | 6 | 4 | 12 | 3 |
| 17_retest6 | confirm | 41 | 30 (73%) | 7 | 4 | 3 | 5 |
| 17_retest6 | 2025 | 134 | 113 (84%) | 17 | 4 | 16 | 21 |
| 17b_retest12 | dev | 55 | 45 (82%) | 6 | 4 | 11 | 2 |
| 17b_retest12 | confirm | 41 | 31 (76%) | 6 | 4 | 3 | 5 |
| 17b_retest12 | 2025 | 132 | 115 (87%) | 11 | 6 | 17 | 19 |

## 6. 2026 monthly (live-loop replay)

**Net $**

| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | losing |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base (live pick) | +894 | -436 | +2,684 | -832 | -790 | -928 | -340 | +5,288 | +4,125 | +1,964 | 5 |
| **16_heuristics** | -685 | +157 | +3,306 | +467 | -820 | -812 | -232 | +2,295 | +2,355 | +269 | 4 |
| 14_far_pm | +502 | -356 | +3,054 | +290 | -820 | -1,132 | -336 | +1,794 | +2,355 | +314 | 4 |
| 15_mgmt_on_base | +128 | -76 | +2,434 | -418 | -1,014 | -844 | -336 | +3,384 | +3,002 | +1,410 | 5 |

**Sum of R per month** (trades per week in the last column):

| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | total R | /wk |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | +3.1 | -1.6 | +9.6 | -3.1 | -5.5 | -3.5 | -1.2 | +15.8 | +15.1 | +6.2 | +35.0 | 2.26 |
| 16_heuristics | -1.9 | +0.2 | +11.9 | +0.5 | -7.3 | -3.3 | -0.8 | +6.5 | +7.8 | +0.8 | +14.4 | 2.21 |
| 14_far_pm | +1.5 | -1.3 | +9.5 | +0.2 | -7.3 | -4.4 | -1.2 | +5.3 | +7.8 | +1.2 | +11.2 | 2.28 |
| 15_mgmt_on_base | +1.1 | -0.5 | +9.1 | -1.7 | -7.5 | -2.7 | -1.2 | +10.4 | +10.8 | +4.4 | +22.2 | 2.31 |

All 23 variants' monthly $ and R tables: `python tools/lab_person_table.py` (and `compact`).

## 7. Why (mechanisms)

**Target choice is where the money is.**
- On the 86 common trades of base vs 1_target, every loser is identical.
- The playbook target loses 23.8R of winners:
  - 5 trades that hit base's target ended at breakeven instead (+18.9R → −0.1R), because the nearest Tier-A ≥ 2R was farther than base's nearest major pool ≥ 1.5R.
  - 7 common target hits paid less (+23.5R → +18.6R).
- Base's 2026 profit is Aug–Oct winners going to far targets: median planned 4.0R, about a third of them at the 5R cap. The draw learner found the same thing out of sample. Nearer targets lose less in Jan–Jul and give back more in Aug–Oct.
- 14_far_pm and 16_heuristics are, in practice, nearer-target rules: median planned 2.2R. In 52 of 86 trades the target is a fresh 5m/15m swing or a 5m FVG.

**Partial + breakeven at a real internal draw is the one playbook step that helps.**
- On the draw target it is worth +$1.5k ytd and +$1.6k in dev, and the win rate goes from 20% to 31%.
- On today's target (15 vs base) it turns 18 breakeven exits into small wins (−0.3R → +4.6R). But it halves the 16 target hits (+58.1R → +44.2R), net −10.8R.
- TP1 fills on about 20–48% of planned trades.

**Trail, CISD exit, time exits and skip rules:**
- The 5m BOS trail is about −$290 ytd.
- The opposing-CISD exit is about +$160.
- The playbook time exits (60-min stall + noon) are −$1.2k in 2026 but +$0.7k in 2025.
- The DOL-6 skip rules cut frequency to 1.5 a week (gate fail).

**Playbook stop.**
- Dropping base's 60-pt cap admits 89 wide-stop trades (60 to over 100 pts, 1–2 micros) worth about −5R.
- Under max 1 trade a day they crowd out 42 base trades worth +27.6R. That is why 7_stop trades 3.1 a week, has a high pass rate and makes little money.
- With the cap (7b), frequency falls to 1.5 a week.
- Base's profit sits in 10–40 pt stops.

**Retest entries.** The limit gets filled mostly on the trades that keep going. Fills that win are only 3 of 42 in dev and 5 of 30 in confirm. The winners that never come back are missed.

**Heuristics (16 vs 14).**
- About 30 opening-drive passes over 2026 in the plain backtest.
- In the replay, 9 trades are dropped (−0.7R) and 6 different ones taken (+3.9R).
- Too few trades to call it an edge.

## 8. Caveats (read before adopting anything)

- **The tuning window.** Aug–Oct 2026 is the window the engine's defaults were tuned on. Confirm overlaps it, and base's ytd lead is that window. Dev (Jan–Jun) is the cleaner test; there, 16_heuristics and 14_far_pm beat base by about $1k, but every CI on avg R includes 0.
- **Selection bias.** The "best" is the best of 23 variants on the same data, so its numbers are optimistic. No hidden search was run, but choosing among 23 still inflates the winner.
- **Pass rate.** The 50K pass rate uses heavily overlapping rolling windows, so a 70.6% vs 48.1% gap is not a statistically clean difference. Read it together with the zero-edge baseline.
- **Draw learner.** 10_learned uses a model trained through 2026-10-13, so it is in-sample on 2026 and is reported for completeness only. The learner's own walk-forward test found its max-EV targets no better than the current rule (−0.04R/trade in 2026, CI includes 0).
- **Definition gaps vs the playbook and learner:**
  - The engine's own 1H/15m pools are k=2 fractals with a fixed 6-pt EQ tolerance and no D8 pullback test.
  - NWOG/NDOG and volume imbalances are not mapped.
  - DOL-2 rotation, DOL-8 HTF bias and the overlap6 delivery check are not implemented.
  - Sizing has no +2-tick slippage term.
  - `draws_at` (standalone) has no EQ detector.
- **Conservative fill rules:**
  - The stop wins same-bar ties.
  - A retest fill bar cannot hit a target.
  - Limit targets need a 1-tick trade-through.

  Real fills may be slightly better or worse.
- **Five-year verdict still stands.** These changes reshape exits and entries on signals that had no proven edge before Aug 2026. None of this makes the engine robust across regimes.

## 9. Files

**Engine and API:**
- `engine/liquidity_map.py` (new): LiquidityBook, draws, pickers, and the `draws_at` / `new_position` / `manage_step` API.
- `engine/model.py`: new params (all default-off); `_build_lmap`, `_draws`, `_pick_draw`, `_struct_stop`, `_open_drive`, `_protected_swing`, `_cisd_against`; the retest limit fill; person management.

**Tools:**
- `tools/lab_person_run.py`: variant registry and replay driver.
- `tools/lab_person_table.py`: tables.
- `tools/lab_person_cmp.py`: per-trade comparison.
- `tools/lab_person_diag.py`, `tools/lab_person_smoke.py`, `tools/lab_person_fillrate.py`: diagnostics, plain backtest.
- `tools/lab_person_api_test.py`: `draws_at` / `manage_step` vs the engine.

**Results:** `research/lab/P_*__<period>.json` (scorecards), `research/lab/P_*_trades_<period>.json`, `research/lab/person_v1/` (pre-alignment scorecards).
