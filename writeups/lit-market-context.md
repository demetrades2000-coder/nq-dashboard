## In one minute (owner summary)

- **Question:** does the wider market help LIT, without changing how often it trades or what the rules are? Context was only
  allowed to change the **size** (bigger or smaller), the **target** (wider, nearer, a different bank) or the **breakeven**
  (earlier, later, none). It could never skip a trade. Every variant has the same 120 trades in 2026 (3.12 a week in Jan-Jun,
  2.56 in Jul-Oct).
- **Answer: no. Nothing to switch on.** I tried 2,520 variants on today's live LIT and on the adopt-candidate combo
  (t_check + scale_in + be_off). **None** made more money in both halves without more 2-week eval fails, a broken
  neighbour, or resting on 1-3 trades.
- **What was tested:**
  - dealer gamma and dark-pool buying (GEX / DIX: sign, 1-year percentile, 1-day change)
  - vanna proxies (yesterday's VIX change and SPX change; there is no free vanna history)
  - the VIX term structure (VIX9D/VIX, VIX/VIX3M, backwardation) and vol-of-vol (VVIX, VVIX/VIX, SKEW)
  - the 0DTE-implied move (VIX1D/VIX)
  - the options calendar: OPEX day, OPEX week, the week after OPEX, quad witching, VIX expiry, month-end, turn of month
- **The textbook gamma idea loses money on LIT.** "Negative or low gamma means moves run, so widen the target; positive gamma
  means price pins, so take a nearer target" costs **-$16.9k in Jan-Jun and -$5.3k in Jul-Oct** on the eval path, and it
  loses in every version I tried. LIT's VIX-band target already scales with volatility, so this adds nothing.
- **Closest miss:** breakeven at 0.75R instead of 1R on days when gamma is in the lower two-thirds of its year (eval net
  +$1,040 / +$2,599, 2-week fails 9.2→9.2% / 2.9→0.0%). It holds for neighbouring thresholds, but it changes only **2 trades
  in each half**, a handful. Not adoptable.
- **Today's numbers stay** (eval path, costs in):
  - **LIT live:** H1 +$36,723 ($6,025/mo), PF 3.66, DD -$3,612, 2-week pass/fail 52.9/9.2%; H2 +$9,674 ($2,605/mo), PF 2.13,
    DD -$2,493, 2-week 50.7/2.9%.
  - **Combo all3:** H1 +$53,116 ($8,714/mo), PF 4.85, 2-week 58.0/2.5%; H2 +$17,262 ($4,647/mo), PF 2.85,
    2-week 52.2/0.0%.
- **Side note, not context:** removing the 8R bank on the combo adds +$12.8k in H1 and +$135 in H2. Only 3 trades in all of
  2026 reached 8R (0 in H2), so this is the same "the bank barely matters" finding as `lit-big-ideas.md`. It is not a
  context effect and not a candidate.
- Nothing in `live_model.json` changed. The new engine option `ctx_day` (research only) is off by default.
  `tests.test_lit_live` still gives 120/120 identical trades.

## The references (2026, costs in, same 120 trades in every variant)

| | H1 net ($/mo) | H1 PF | H1 DD | H1 2-wk pass/fail (MC) | H2 net ($/mo) | H2 PF | H2 DD | H2 2-wk pass/fail (MC) |
|---|---|---|---|---|---|---|---|---|
| LIT live, eval path | +$36,723 ($6,025) | 3.66 | -$3,612 | 52.9 / 9.2 (50.5 / 7.0) | +$9,674 ($2,605) | 2.13 | -$2,493 | 50.7 / 2.9 (54.0 / 6.8) |
| LIT live, LIT size rule | +$32,773 | 4.44 | -$2,315 | | +$8,962 | 2.46 | -$1,466 | |
| all3 combo, eval path | +$53,116 ($8,714) | 4.85 | -$3,059 | 58.0 / 2.5 (51.9 / 3.2) | +$17,262 ($4,647) | 2.85 | -$3,076 | 52.2 / 0.0 (58.1 / 3.2) |
| all3 combo, LIT size rule | +$44,507 | 4.94 | -$2,510 | | +$15,192 | 3.48 | -$1,451 | |

Trades per week 3.12 (H1) / 2.56 (H2) everywhere. 2021-25 (reference only, LIT size rule): LIT live PF 1.01, +$1,275.

## Ranked: the best variant of each family (eval path, change vs the reference)

The "score" is the smaller of the two halves' net-$ gains. Fails are 2-week fails (exact, fresh eval on every session).
"Changed" counts the trades whose result changed (for target / breakeven variants).

| # | Ref | Variant | Δ net H1 / H2 | Δ 2-wk pass H1 / H2 | Δ 2-wk fail H1 / H2 | Δ LIT-rule net H1 / H2 | Flagged / changed trades | Why it fails |
|---|---|---|---|---|---|---|---|---|
| 1 | base | VVIX ≥ median → no breakeven | +$3,142 / +$3,920 | -1.6 / 0 | **+3.4** / 0 | -$485 / -$159 | 40/2 flagged, 11/1 changed | more fails, H2 is 1 trade, neighbours break |
| 2 | base | 0DTE move (VIX1D/VIX) ≤ q0.67 → no breakeven | +$2,374 / +$3,920 | +2.6 / 0 | **+1.7** / 0 | -$1,054 / -$159 | 20/1 changed | more fails, H2 is 1 trade |
| 3 | base | gamma 1-day change with the trade ≥ q0.67 → 1.5x size | +$2,298 / +$1,438 | +4.2 / 0 | -0.8 / **+4.3** | +$10,535 / +$1,423 | 27/15 | H2 fails up, neighbours break |
| 4 | all3 | DIX percentile ≥ q0.8 → 0.75x, else 1.25x | +$1,110 / +$2,247 | -0.9 / +2.9 | **+0.9** / 0 | +$999 / **-$4,613** | 80/40 | fails up, LIT rule loses in H2 |
| 5 | base | gamma percentile ≤ q0.67 → breakeven at 0.75R | +$1,040 / +$2,599 | 0 / +2.9 | 0 / -2.9 | +$292 / +$281 | 53/17 flagged, **2/2 changed** | a handful of trades (closest miss) |
| 6 | all3 | week after OPEX → breakeven at 1.5R | +$3,950 / +$336 | +3.3 / +1.4 | **+2.5** / 0 | -$94 / -$189 | 19/8 | more fails, top trade carries 84% |
| 7 | base | turn of month → target + 1 VIX move | +$590 / +$1,962 | -1.6 / 0 | 0 / -2.9 | -$333 / +$1,672 | 2/3 changed | a handful, one trade carries 100% of H1 |
| 8 | all3 | turn of month → 1.5x size | +$669 / +$552 | -1.7 / 0 | 0 / 0 | +$1,774 / +$1,956 | 13/7 | 2-week pass down in H1 |
| 9 | base | SPX fell > 0.53% yesterday (below q0.2) → 1.5x size | +$6,116 / +$386 | 0 / 0 | 0 / 0 | +$3,631 / +$965 | 16/6 | MC fails up, neighbours break, 2021-25 -$3.5k |
| 10 | base | month-end → 0.5x size | +$2,228 / +$213 | +4.2 / 0 | -0.8 / 0 | +$520 / +$211 | 8/2 | 10 trades in 2026 |
| - | all3 | every day: no 8R bank (not context) | +$12,811 / +$135 | 0 / +1.4 | 0 / 0 | +$16,176 / 0 | 3/0 changed | 3 trades all year, already known |

Counts: size tilts, 1,076 (538 per reference): 12 make more money in both halves, 0 pass the strict test. Target /
breakeven, 1,444 (722 per reference): 73 make more money in both halves, 10 (base) and 4 (all3) pass the strict money /
fail test before the trade-count and concentration checks, and 0 survive them. With ~2,500 tries and 2 halves, ~4-5% "up
in both" is what chance gives.

### By family (both references, best case)

- **Dealer gamma / DIX:** 360 size tilts, 4 up in both halves, 0 strict; 322 target / BE variants, 15 up in both halves, 0
  strict. Sizing up or down by gamma sign, percentile or change has no stable side. Half size on high gamma loses
  -$8.2k / -$4.3k and 21 points of 2-week pass.
- **Vanna proxies (VIX change, SPX change, -ΔVIX x |ΔSPX|):** 300 tilts, 1 up in both halves; 264 target / BE, 11 up in
  both; 0 strict. "Vol falling yesterday = dealer vanna buying, so lean long" does not split LIT's winners from losers. These
  are proxies, not real vanna.
- **Term structure / vol-of-vol (VIX9D/VIX, VIX/VIX3M, VVIX, VVIX/VIX, SKEW):** 300 tilts, 0 up in both; 550 target / BE,
  28 up in both; 0 strict. Backwardation (VIX > VIX3M) came before only 4 of the 120 LIT trades in 2026 (0 in H2). Half size in the
  top-fifth term structure costs -$7.3k in H1.
- **0DTE move (VIX1D/VIX):** 60 tilts, 1 up in both; 132 target / BE, 11 up in both; 0 strict.
- **Options calendar:** 56 tilts, 6 up in both; 154 target / BE, 6 up in both; 0 strict. Each flag covers 5-23 trades in
  2026. Half size in OPEX week costs -$15.8k in H1.

## Method

- **Trades:** `engine/lit.py` run_x on `live_model.json` "lit" (= run `lit_live`, 120 trades in 2026). For the combo, add
  `t_check` {"at": 15, "x": 0.3, "mfe": 0.5} + `scale_in` {"pb": 0.25, "f": 1.0, "rat_k": 1.0, "min_rk": 2.0, "n": 1} +
  `be_off` 1.25 (`research/lit/adopt_combo.json`). The script asserts the base engine units equal the research executor and
  every target / breakeven variant has the identical trade list (day, entry time).
- **Eval path (main view):** `engine/sizing.lit_qty`, two_week for 10 sessions then safe_eval, no reset, $1.90 a micro, true
  1m fills, stop before target in a bar, and scale-in adds inside the live caps. Scored by `tools/lit_adv_manage.py` +
  `tools/lit_big_ideas.run_eval_x`, the same scorer as `lit_adopt_combo.py` / `lit_idm_eval.py`. The base numbers equal
  `research/lit/adopt_combo.json`.
  - **Score:** a fresh MFFU 50K eval on every session (2-week = 10 sessions), a 2,000-path Monte Carlo, and the
    back-to-back path for $, PF and DD.
  - **A size tilt** is a multiplier on the routed micros. A cut is int(q x m), minimum 1. An up-size is capped by 60% of the
    room, the $1,000 soft daily loss and 40 micros.
- **LIT size rule (second view):** engine trades scaled by `engine/lit.scale_trade`.
- **Target / breakeven variants:** new engine option `ctx_day` = {day: {tgt_add, tgt_m, max_rr, be_r}}.
  - It acts only **after the fill**. The setup, limit, pre-fill cancel and the 1.5R check stay on the live VIX band, so no
    trade is added or skipped.
  - The target never moves under 1.5R.
  - Modes: target + 0.5 / + 1 VIX one-day move, target x 0.75 / x 0.6, bank at 5R / 12R / none, BE at 0.75R / 1.5R / 2R /
    none.
  - Note: under two_week sizing a farther target means fewer micros ("the target covers what is left"), so a target change
    also changes the size.
- **Thresholds:** quantiles 0.2 / 0.33 / 0.5 / 0.67 / 0.8 of the feature over the **H1** trades, frozen for H2.
  - Size shapes: hi x0.5, lo x0.5, hi x1.5, lo x1.5, hi 0.75 / lo 1.25, hi 1.25 / lo 0.75.
  - Calendar flags: x0.5 / 0.75 / 1.25 / 1.5.
  - "@dir" features are multiplied by the trade's direction ("yesterday moved the trade's way").
- **Strict adopt test (all must hold, both halves):**
  - eval net $ up
  - 2-week pass not down
  - 2-week fail not up, exact and Monte Carlo
  - LIT-rule net not down
  - ≥ 10 flagged trades in H1 and ≥ 5 in H2
  - every adjacent-quantile neighbour also up in net in both halves
  - target / BE: ≥ 5 / 3 trades changed, no single trade > 50% of the R gain, and better than the same change on every day
  - size: better than a flat multiplier of the same average size (plain leverage)

## Data, and what could not be tested

- **No look-ahead.** Every reading is the last close **before** the trading day. Most LIT entries are 02:00-08:00 ET, so
  "yesterday's close" is what was known.
- `data/GEX_1d.csv`: SqueezeMetrics GEX, DIX and SPX close (2011 - 2026-10-16).
- `data/VIX_1d.csv`: CBOE VIX.
- **New `data/CBOE_vol_1d.csv`:** CBOE VIX9D, VIX3M, VIX1D, VVIX and SKEW closes, 2015 - 2026-09-17.
  - cdn.cboe.com is blocked from the cloud session (proxy 403 / DNS). So these are CBOE's own `*_History.csv` files copied
    from a public GitHub mirror (jonaslffr-ship-it/trading-library).
  - Check: the mirror's VXN matches `data/VXN_1d.csv` exactly on all 1,234 overlapping days.
  - 12 of the 40 H2 trades come after 2026-09-17 and get no tilt from these series.
  - On the PC, refresh with `engine/news.py`'s CBOE URL pattern (`https://cdn.cboe.com/api/global/us_indices/daily_prices/{name}_History.csv`).
- **Vanna / VEX:** no free daily history found. FlashAlpha's historical API is paid, the NinjaTrader GEX/VEX indicator is live
  only, and SqueezeMetrics publishes GEX / DIX, not vanna. Proxies used: yesterday's VIX change, SPX change, and
  -ΔVIX% x (1 + |ΔSPX%|). They are proxies, not dealer vanna.
- **CBOE put/call (equity / index):** the free daily file stops 2019-10-04, so it cannot cover 2026. Not tested.
- **NYSE TICK, DXY, 10-year yield:** no futures-grade file in `data/`, and the official-data rule applies. Not tested.
  NQ/ES SMT was already tested (`lit-more-setups.md`, `cross-market-context.md`).
- 2021-25 is shown as a reference only (LIT-rule net change, column `d_lit_ref` in `research/lit/context.json`). No 1m bars
  there, so t_check and scale_in do not act.

## Reproduce

    python -X utf8 tools/lit_context.py          # screen everything (~35 min, 1 core) -> research/lit/context.json
    python -X utf8 tools/lit_context.py store    # rl.save the lit_ctx_* runs from context.json

Paper only. No switch to turn on. `ctx_day` stays None (off) in `live_model.json`.
