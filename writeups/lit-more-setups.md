## In one minute

- **The owner's ask (2026-10-19):** "There's definitely more LIT-based setups a week, look harder." Today's LIT takes about 2.9
  trades a week in 2026.
- **What was tested: 95 variants in 5 new families.** None of them repeats the rejected studies (all hours / Asia, 2 a day,
  re-arm after a target, order blocks, continuation, entry precision).
  1. **ES as a second market** (MES on the same account).
  2. **Bigger candles:** LIT setups found on 15m, 30m and 1h candles, added to the 5m ones.
  3. **Missed fills:** re-tap after a failed 1m CISD, re-arm an expired limit, a longer limit or 1m window.
  4. **Looser filters:** sweep depth, displacement, inducement, stop range.
  5. **LIT-native extras:** a 2nd trade a day only after a sweep of PDH/PDL, PWH/PWL, PMH/PML or NWOG/NDOG.
- **The answer: nothing passes.** To pass, a variant must make more $ **and** pass more 2-week evals in **both** halves.
  - **There are more setups, but the good ones are already taken.** In 2026, 467 setups pass every filter. The other 347 are:
    - 130 with a stop wider than 80 pts. At $800 x 20 / stop, a stop over ~89 pts gets 0 micros.
    - 79 whose limit is never tapped within 30 minutes.
    - 34 stopped out after the tap. 18 with no 1m CISD. 7 with no 1.5R target. 6 where the target or the stop traded first.
    - Of the 193 that would fill, only 127 days are different. The other ~66 are second setups on days that already traded,
      and 2 trades a day was tested before and lost in Jan-Jun.
  - **ES (MES) loses money in Jan-Jun:** PF 0.75, -$4,476, against +$32,544 for NQ.
    - It makes +$12,186 in Jul-Oct, but traded next to NQ it fails 16.8% / 29.0% of evals within 2 weeks (NQ alone: 9.2% / 2.9%).
    - The worst day is -$1,290 at the LIT size, over MFFU's $1,000 soft daily loss.
  - **15m setups come closest.** Adding them (1 trade a day across 5m + 15m):
    - lifts the 2-week pass rate in both halves: Jan-Jun 52.9% -> 63.0%, Jul-Oct 50.7% -> 52.2%;
    - Monte Carlo: Jan-Jun 48.1% -> 55.0%, Jul-Oct 56.8% -> 57.6%;
    - **but** costs $322 in Jan-Jun (+$329 in Jul-Oct), and the Jul-Oct 2-week fails go from 2.9% to 7.2%;
    - it adds only 4 trades in Jan-Jun and 2 in Jul-Oct (+0.16 a week).
    - Every one of the 16 neighbours does the same: pass rate up, Jan-Jun $ down $322-$1,802. **Not adopted.** Worth a paper
      shadow at most.
  - **1h candles never give a LIT trade inside the rules:** median stop 160 pts, and 0 trades in 2026. 30m gives 2 trades.
- **Today's LIT stays as it is.** Nothing changes in `live_model.json` or in the engine.

## Ranked shortlist (best first: how many of the 4 gates pass, then the smaller $ change)

Gates: more $ in H1, more $ in H2, higher 2-week pass in H1, higher 2-week pass in H2. "2-wk" = pass / fail % of fresh MFFU
Builder 50K evals within 10 sessions, under the live eval sizing. Money is at the LIT size ($800 / 20 pts), $1.90 a micro.

| # | Variant | Gates | H1 trades/wk · PF · net $ ($/mo) · DD | H1 2-wk | H2 trades/wk · PF · net $ ($/mo) · DD | H2 2-wk | Why not |
|---|---|:---:|---|---:|---|---:|---|
| - | **Live LIT (base)** | - | 3.12 · 4.36 · +32,544 (5,339) · -2,332 | 52.9 / 9.2 | 2.56 · 2.43 · +8,880 (2,391) · -1,489 | 50.7 / 2.9 | - |
| 1 | Inducement age 24 bars (a tightening) | 3/4 | 2.97 · 4.47 · +32,778 (5,378) · -2,332 | 52.9 / 9.2 | 2.50 · 3.41 · +13,698 (3,688) · -1,241 | 65.2 / 0.0 | H1 pass rate equal; **fewer** trades (the opposite of the ask); found before in lit-final, not adopted |
| 2 | 5m + 15m LIT add-on (depth 0.4, disp 0.7, idm 12, stop 100), 1 a day | 3/4 | 3.28 · 4.19 · +32,222 (5,286) · -2,334 | 63.0 / 9.2 | 2.69 · 2.48 · +9,209 (2,479) · -1,519 | 52.2 / 7.2 | H1 -$322; H2 fails up 2.9 -> 7.2; only +6 trades |
| 3 | 5m + 15m LIT add-on, live filters, 1 a day | 3/4 | 3.20 · 4.14 · +31,632 (5,190) · -2,332 | 58.8 / 9.2 | 2.63 · 2.48 · +9,197 (2,476) · -1,519 | 52.2 / 7.2 | H1 -$912 |
| 4 | Sweep depth 0.6 ATR (a tightening) | 2/4 | 3.09 · 4.63 · +33,104 (5,431) · -2,076 | 52.9 / 6.7 | 2.50 · 2.44 · +8,896 (2,395) · -1,489 | 50.7 / 0.0 | pass rate equal in both; fewer trades |
| 5 | 5m + 30m LIT, no inducement gate, 1 a day | 2/4 | 3.20 · 4.37 · +33,122 (5,434) · -2,332 | 59.7 / 9.2 | 2.56 · 2.43 · +8,880 (2,391) · -1,489 | 50.7 / 4.3 | H2 unchanged (0 extra trades); +2 trades in H1 |
| 6 | Limit 60 min instead of 30 | 0/4 | 3.20 · 4.14 · +31,675 · -2,332 | 51.3 / 9.2 | 2.63 · 2.41 · +8,722 · -1,506 | 50.7 / 2.9 | worse in both |
| 7 | 2nd trade a day only for PDH/PDL/PWH/PWL/PMH/PML sweeps | 0/4 | 3.24 · 3.95 · +31,541 · -2,944 | 52.9 / 9.2 | 2.69 · 2.31 · +8,534 · -1,489 | 50.7 / 2.9 | the extra trades lose |
| 8 | NQ + ES, 1 a day (first fill wins) | 0/4 | 3.67 · 2.35 · +24,250 (3,979) · -2,958 | 49.6 / 7.6 | 3.72 · 1.84 · +10,148 (2,732) · -4,462 | 43.5 / 2.9 | ES takes NQ's best days |
| 9 | Displacement 0.7 ATR | 1/4 | 3.44 · 3.98 · +31,655 · -2,784 | 55.5 / 14.3 | 2.88 · 2.04 · +7,521 · -2,006 | 49.3 / 13.0 | fails x1.5-4.5 |
| 10 | Re-tap after a failed 1m CISD window (+30 min) | 0/4 | 3.20 · 4.31 · +32,439 · -2,332 | 52.9 / 9.2 | 2.76 · 1.76 · +5,413 · -2,123 | 47.8 / 13.0 | the re-taps lose |
| 11 | Stop 8-100 pts, at least 1 micro | 0/4 | 3.52 · 3.38 · +27,149 · -3,478 | 45.4 / 13.4 | 3.21 · 2.13 · +8,265 · -1,836 | 49.3 / 17.4 | the wide stops lose, and the eval sizing presses them |
| 12 | NQ + ES, 1 per market a day | 1/4 | 5.66 · 2.01 · +24,373 (3,999) · -4,516 | 42.9 / 16.8 | 5.32 · 2.29 · +18,945 (5,101) · -3,538 | 43.5 / 29.0 | H1 -$8.2k; evals fail 3-10x more; worst day -$1,290 |
| 13 | No inducement gate | 0/4 | 3.48 · 3.15 · +27,909 · -3,540 | 42.9 / 11.8 | 3.14 · 1.57 · +5,165 · -1,772 | 46.4 / 11.6 | worse in both |

## Why there are not more good setups (2026, live filters, each setup run on its own)

| What happened to the setup | Setups |
|---|---:|
| Filled (would be a trade if it were the day's only setup) | 193 (on 127 different days; 120 taken) |
| Stop wider than 80 pts (129 of 130; 55 at 80-100 pts, 24 at 100-120, 25 at 120-150, 25 over 150) | 130 |
| Limit never tapped within 30 min | 79 |
| Tapped, then the sweep extreme broke before a 1m CISD | 34 |
| Tapped, no 1m CISD within 20 bars | 18 |
| No VIX-band target 1.5R away | 7 |
| Target traded before the tap / stop broke before the tap | 3 / 3 |

- **The 1-a-day rule takes the best one.** The first fill of the day is usually the London setup, LIT's best trade. The 66
  extra fills come after it, on the same day. "2 a day" made -$4.8k in Jan-Jun (run `lit_more_2day`, as in lit-all-hours).
- **Wide-stop setups are real, but they are not good trades.** Giving them 1 micro made both halves worse. Under the
  two-week sizing ("one winner passes") they are pressed to many micros: 2-week fails 13-17%.
- **Missed limits do not come back well.** A limit that was not tapped in 30 minutes, filled later, is a weaker trade. The
  same goes for a second tap after a failed 1m CISD (Jul-Oct -$3.5k, fails 13%).

## How it was tested

- **Data:** CME futures from TradingView only.
  - NQ1!: 5m (2021-11 to 2026-10-16) and 1m for 2026.
  - ES1!: 5m from 2025-04-13 only. Its 1m file starts 2026-09-16, and only about 75% of its 5-minute windows rebuild the 5m
    bar, so no ES day passes the 1m coverage rule. **ES therefore runs on 5m execution** (1m CISD window = 4 five-minute
    bars). For a fair comparison, NQ on 5m execution makes +$6,430 / +$1,469 (run `lit_more_nq_5m_exec`). ES on 5m makes
    -$4,476 / +$12,186: worse than NQ in Jan-Jun, better in Jul-Oct.
  - No Yahoo, no CFD.
- **Same LIT:** `engine/lit.py` run_x with `live_model.json` "lit": every setup filter, the 30-min limit at the 5m CISD, the 1m
  CISD entry, the stop 1 tick beyond the sweep extreme, the VIX-band target (>= 1.5R, banked at 8R), BE at 1R, flat 15:55,
  the Monday rule and the weekly stop. `python tools/lit_more.py check` reproduces run `lit_live`: 120 / 120 trades in 2026,
  +$41,734 at $1.40.
- **ES as MES:**
  - The same engine on ES 5m. The stop range is 8-80 NQ pts x 0.28 (the ES/NQ price ratio) = 2.2-22.4 ES pts. Sweep depth and
    displacement are in ATR, so they need no scaling. The VIX band is the S&P's own implied move.
  - MES pays $5 per ES point per micro. ES trades are turned into MNQ-equivalent points (x2.5), so the same $ sizing and
    eval rules apply. MES commission is assumed to be $1.90 too.
  - **NQ and ES are only loosely linked:**
    - In 2026, 76 days had both. They were on the same side on 48 days, and both trades were open at once on 39 days.
    - The daily P&L correlation is 0.19. On those days both lost 49 times and both won 8 times.
    - At the LIT size, two open trades risk up to $1,578 together.
  - In the eval, while one trade is open its full stop loss comes off the room and the day's P&L that size the next trade.
    The fail check adds up the worst point of every open trade (conservative).
- **15m / 30m / 1h setups:**
  - Candles are resampled from the NQ 5m file. The detector windows are scaled to the same clock time (15m: leg and sweep window
    8 bars, look-back 12; 30m: 4 / 6; 1h: 2 / 3).
  - The entry stays the LIT one: the 30-min limit at the bigger candle's CISD level, then the 1m CISD.
  - 30m and 1h need a research copy of the detector, because the engine skips days with fewer than 50 bars (a 1h day has 23).
  - **Stops after the live filters, 2026:** 15m median 91 pts (138 of 325 within 80), 30m 124 pts (43 of 164), 1h 160 pts
    (6 of 56).
  - "1 a day" = the first fill of either timeframe takes the day (exact). "1 per tf" = one per timeframe a day, never two
    trades at once.
- **Missed fills:** a research-only wrapper around `simulate_x` (this process only). When a setup misses, the limit is
  re-armed from the next 5m bar at the same level, stop and target. It dies like the live one (extreme broken, target first,
  flat 15:55).
- **Money:**
  - The LIT size: $800 up to a 20-pt stop, then 800 x 20 / stop, max 40 micros, half size after 2 stop-outs in a week (counted
    across both markets).
  - $1.90 per micro round trip, plus 1 tick of slippage on market entries and on stop / BE / EOD exits.
  - This is why the base is +$32,544 / +$8,880 (at $1.40 it was +$32,773 / +$8,962).
- **Eval:** the live eval sizing, `lit_sizing` two_week (config C) for 10 sessions, then safe_eval.
  - It is `engine/sizing.lit_qty` with the exact MFFU Builder 50K rules, as in `tools/lit_eventual.py`. Base: 52.9 / 9.2 and
    50.7 / 2.9, matching lit_eventual.
  - A fresh eval is started on every session of the half that has 10 sessions after it. There is also a 1,000-path Monte Carlo
    in 5-session blocks.
- **Judge:** pick on H1 (Jan 2 - Jun 30 2026), check on H2 (Jul 1 - Oct 16). A variant must improve both halves in $ **and**
  in the 2-week pass rate, at 2-4 trades a week. 2021-25 is a reference only (5m execution, and no ES before 2025-04).
- Tool: `tools/lit_more.py` (`check`, `all`, or one family: `es`, `htf`, `htf_grid`, `mtf`, `miss`, `loose`, `native`).
  Results: `research/lit/more_setups.json`. Runs: `lit_more_*`. One process, about 1.5 minutes.

## What could still be worth doing

- **15m add-on as a paper shadow:** it raises the 2-week pass rate in both halves, but it costs a little money in Jan-Jun and
  adds only about 1 trade a month. Re-check it after Dec 2026 with more data. It is not in the engine.
- **ES with true 1m bars:** ES ran on 5m only, and NQ on 5m is also much weaker than NQ on 1m (+$6.4k vs +$32.5k in Jan-Jun).
  A fair ES test needs a 2026 ES 1m export (TradingView `ES1!` 1m) from the owner's PC. Even then, the combined account breaks
  the $1,000 soft daily loss on some days. One trade a day across both markets is the only safe way to run it.

## All variants (costs in; "2-wk" = pass / fail % within 10 sessions, live eval sizing; Δ vs the live LIT)

| Variant | H1 trades · /wk | win % | PF | net $ | $/mo | max DD | 2-wk pass / fail | H2 trades · /wk | win % | PF | net $ | $/mo | max DD | 2-wk pass / fail | Δ$ H1 / H2 | Δ pass H1 / H2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base (live LIT) | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| ES LIT (stops 2.2-22.4) alone | 65 · 2.54 | 18.5 | 0.75 | -4,476 | -734 | -8,778 | 26.1 / 7.6 | 43 · 2.76 | 20.9 | 2.17 | +12,186 | +3,281 | -2,963 | 36.2 / 14.5 | -37,020 / +3,306 | -26.8 / -14.5 |
| ES LIT (stops 1.8-28, wider) alone | 68 · 2.66 | 17.6 | 0.74 | -4,709 | -773 | -9,011 | 25.2 / 7.6 | 44 · 2.82 | 22.7 | 2.17 | +12,191 | +3,282 | -2,958 | 36.2 / 14.5 | -37,253 / +3,311 | -27.7 / -14.5 |
| ES LIT 5m exec only alone | 65 · 2.54 | 18.5 | 0.75 | -4,476 | -734 | -8,778 | 26.1 / 7.6 | 43 · 2.76 | 20.9 | 2.17 | +12,186 | +3,281 | -2,963 | 36.2 / 14.5 | -37,020 / +3,306 | -26.8 / -14.5 |
| NQ + ES, 1 per instrument a day | 145 · 5.66 | 20.7 | 2.01 | +24,373 | +3,999 | -4,516 | 42.9 / 16.8 | 83 · 5.32 | 27.7 | 2.29 | +18,945 | +5,101 | -3,538 | 43.5 / 29.0 | -8,171 / +10,065 | -10.0 / -7.2 |
| NQ + ES, 1 a day (first fill) | 94 · 3.67 | 22.3 | 2.35 | +24,250 | +3,979 | -2,958 | 49.6 / 7.6 | 58 · 3.72 | 22.4 | 1.84 | +10,148 | +2,732 | -4,462 | 43.5 / 2.9 | -8,294 / +1,268 | -3.3 / -7.2 |
| NQ + ES 5m-exec, 1 per instrument a day | 145 · 5.66 | 20.7 | 2.01 | +24,373 | +3,999 | -4,516 | 42.9 / 16.8 | 83 · 5.32 | 27.7 | 2.29 | +18,945 | +5,101 | -3,538 | 43.5 / 29.0 | -8,171 / +10,065 | -10.0 / -7.2 |
| NQ LIT 5m exec only (fair ES comparison) | 54 · 2.11 | 16.7 | 1.84 | +6,430 | +1,055 | -3,135 | 25.2 / 0.0 | 23 · 1.47 | 30.4 | 1.38 | +1,469 | +396 | -1,313 | 34.8 / 0.0 | -26,114 / -7,411 | -27.7 / -15.9 |
| 15m LIT (live filters, idm 12 bars) alone | 12 · 0.47 | 16.7 | 3.24 | +3,436 | +564 | -824 | 16.8 / 0.0 | 4 · 0.26 | 25.0 | 0.53 | -312 | -84 | -669 | 0.0 / 0.0 | -29,108 / -9,192 | -36.1 / -50.7 |
| 5m + 15m LIT (live filters, idm 12 bars), 1 a day | 82 · 3.2 | 20.7 | 4.14 | +31,632 | +5,190 | -2,332 | 58.8 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -912 / +317 | +5.9 / +1.5 |
| 5m + 15m LIT (live filters, idm 12 bars), 1 per tf a day | 86 · 3.36 | 20.9 | 4.09 | +31,987 | +5,248 | -2,332 | 58.8 / 9.2 | 42 · 2.69 | 35.7 | 2.43 | +9,078 | +2,444 | -1,519 | 52.2 / 11.6 | -557 / +198 | +5.9 / +1.5 |
| 15m LIT relaxed (depth 0.4, disp 0.7, idm 24, stop 100) alone | 21 · 0.82 | 28.6 | 4.47 | +8,728 | +1,432 | -885 | 33.6 / 0.0 | 7 · 0.45 | 28.6 | 0.67 | -276 | -74 | -669 | 0.0 / 0.0 | -23,816 / -9,156 | -19.3 / -50.7 |
| 5m + 15m LIT relaxed (depth 0.4, disp 0.7, idm 24, stop 100), 1 a day | 86 · 3.36 | 20.9 | 3.98 | +31,333 | +5,141 | -2,334 | 63.0 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -1,211 / +329 | +10.1 / +1.5 |
| 5m + 15m LIT relaxed (depth 0.4, disp 0.7, idm 24, stop 100), 1 per tf a day | 91 · 3.55 | 22.0 | 3.95 | +31,795 | +5,216 | -2,226 | 63.0 / 7.6 | 45 · 2.88 | 33.3 | 2.4 | +8,995 | +2,422 | -1,688 | 50.7 / 11.6 | -749 / +115 | +10.1 / +0.0 |
| 15m LIT, limit 60 min alone | 15 · 0.59 | 20.0 | 2.7 | +3,268 | +536 | -946 | 16.8 / 0.0 | 5 · 0.32 | 40.0 | 2.25 | +835 | +225 | -494 | 14.5 / 0.0 | -29,276 / -8,045 | -36.1 / -36.2 |
| 5m + 15m LIT, limit 60 min, 1 a day | 83 · 3.24 | 21.7 | 4.06 | +31,619 | +5,188 | -2,332 | 58.0 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -925 / +317 | +5.1 / +1.5 |
| 5m + 15m LIT, limit 60 min, 1 per tf a day | 89 · 3.48 | 21.3 | 3.96 | +31,819 | +5,220 | -2,332 | 58.0 / 10.1 | 42 · 2.69 | 35.7 | 2.43 | +9,078 | +2,444 | -1,519 | 52.2 / 11.6 | -725 / +198 | +5.1 / +1.5 |
| miss: re-tap after a failed 1m CISD window (time left) | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 42 · 2.69 | 31.0 | 1.74 | +5,314 | +1,431 | -1,950 | 47.8 / 7.2 | +0 / -3,566 | +0.0 / -2.9 |
| miss: re-tap after a failed 1m CISD window (+30 min) | 82 · 3.2 | 22.0 | 4.31 | +32,439 | +5,322 | -2,332 | 52.9 / 9.2 | 43 · 2.76 | 30.2 | 1.76 | +5,413 | +1,457 | -2,123 | 47.8 / 13.0 | -105 / -3,467 | +0.0 / -2.9 |
| miss: re-tap after a failed 1m CISD window (+60 min) | 82 · 3.2 | 22.0 | 4.31 | +32,439 | +5,322 | -2,332 | 52.9 / 9.2 | 43 · 2.76 | 30.2 | 1.76 | +5,413 | +1,457 | -2,123 | 47.8 / 13.0 | -105 / -3,467 | +0.0 / -2.9 |
| miss: re-arm untapped expired limit +60 min | 83 · 3.24 | 21.7 | 4.09 | +31,561 | +5,178 | -2,332 | 51.3 / 9.2 | 43 · 2.76 | 32.6 | 2.17 | +8,034 | +2,163 | -1,812 | 50.7 / 5.8 | -983 / -846 | -1.6 / +0.0 |
| miss: re-arm untapped expired limit +120 min | 83 · 3.24 | 21.7 | 3.89 | +31,027 | +5,090 | -2,332 | 51.3 / 9.2 | 43 · 2.76 | 32.6 | 2.17 | +8,034 | +2,163 | -1,812 | 50.7 / 5.8 | -1,517 / -846 | -1.6 / +0.0 |
| miss: re-arm both (+60 min) | 84 · 3.28 | 21.4 | 4.24 | +31,912 | +5,236 | -2,332 | 51.3 / 9.2 | 46 · 2.95 | 28.3 | 1.58 | +4,567 | +1,230 | -2,446 | 47.8 / 13.0 | -632 / -4,313 | -1.6 / -2.9 |
| miss: re-arm both (+120 min) | 86 · 3.36 | 20.9 | 4.01 | +31,344 | +5,142 | -2,332 | 51.3 / 9.2 | 46 · 2.95 | 28.3 | 1.58 | +4,567 | +1,230 | -2,446 | 47.8 / 13.0 | -1,200 / -4,313 | -1.6 / -2.9 |
| miss: 1m CISD window 30 bars | 82 · 3.2 | 22.0 | 4.34 | +32,501 | +5,332 | -2,332 | 52.9 / 9.2 | 42 · 2.69 | 33.3 | 2.25 | +7,545 | +2,031 | -1,729 | 49.3 / 2.9 | -43 / -1,335 | +0.0 / -1.4 |
| miss: 1m CISD window 40 bars | 82 · 3.2 | 22.0 | 4.31 | +32,439 | +5,322 | -2,332 | 52.9 / 9.2 | 43 · 2.76 | 30.2 | 1.83 | +5,639 | +1,518 | -1,729 | 47.8 / 7.2 | -105 / -3,241 | +0.0 / -2.9 |
| miss: limit 60 min | 82 · 3.2 | 22.0 | 4.14 | +31,675 | +5,197 | -2,332 | 51.3 / 9.2 | 41 · 2.63 | 34.1 | 2.41 | +8,722 | +2,348 | -1,506 | 50.7 / 2.9 | -869 / -158 | -1.6 / +0.0 |
| miss: limit 90 min | 83 · 3.24 | 21.7 | 4.09 | +31,561 | +5,178 | -2,332 | 51.3 / 9.2 | 42 · 2.69 | 33.3 | 2.29 | +8,416 | +2,266 | -1,812 | 50.7 / 2.9 | -983 / -464 | -1.6 / +0.0 |
| miss: limit 120 min | 83 · 3.24 | 21.7 | 3.89 | +31,027 | +5,090 | -2,332 | 51.3 / 9.2 | 42 · 2.69 | 33.3 | 2.29 | +8,416 | +2,266 | -1,812 | 50.7 / 2.9 | -1,517 / -464 | -1.6 / +0.0 |
| miss: limit 60 min + CISD window 30 | 83 · 3.24 | 21.7 | 4.32 | +32,089 | +5,265 | -2,332 | 51.3 / 9.2 | 43 · 2.76 | 32.6 | 2.22 | +7,387 | +1,989 | -1,746 | 49.3 / 2.9 | -455 / -1,493 | -1.6 / -1.4 |
| loose: depth 0.3 | 81 · 3.16 | 22.2 | 4.36 | +32,542 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 32.5 | 2.26 | +8,146 | +2,193 | -1,741 | 42.0 / 2.9 | -2 / -734 | +0.0 / -8.7 |
| loose: depth 0.4 | 81 · 3.16 | 22.2 | 4.36 | +32,542 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -2 / +0 | +0.0 / +0.0 |
| loose: depth 0.6 | 79 · 3.09 | 22.8 | 4.63 | +33,104 | +5,431 | -2,076 | 52.9 / 6.7 | 39 · 2.5 | 35.9 | 2.44 | +8,896 | +2,395 | -1,489 | 50.7 / 0.0 | +560 / +16 | +0.0 / +0.0 |
| loose: disp 0.6 | 94 · 3.67 | 19.1 | 3.99 | +33,895 | +5,561 | -3,120 | 57.1 / 9.2 | 46 · 2.95 | 26.1 | 1.21 | +1,774 | +478 | -2,536 | 47.8 / 15.9 | +1,351 / -7,106 | +4.2 / -2.9 |
| loose: disp 0.7 | 88 · 3.44 | 20.5 | 3.98 | +31,655 | +5,193 | -2,784 | 55.5 / 14.3 | 45 · 2.88 | 31.1 | 2.04 | +7,521 | +2,025 | -2,006 | 49.3 / 13.0 | -889 / -1,359 | +2.6 / -1.4 |
| loose: disp 0.9 | 73 · 2.85 | 21.9 | 4.13 | +27,404 | +4,496 | -2,316 | 40.3 / 4.2 | 35 · 2.24 | 34.3 | 1.94 | +5,280 | +1,422 | -1,606 | 42.0 / 0.0 | -5,140 / -3,600 | -12.6 / -8.7 |
| loose: idm age 24 | 76 · 2.97 | 23.7 | 4.47 | +32,778 | +5,378 | -2,332 | 52.9 / 9.2 | 39 · 2.5 | 38.5 | 3.41 | +13,698 | +3,688 | -1,241 | 65.2 / 0.0 | +234 / +4,818 | +0.0 / +14.5 |
| loose: idm age 48 | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| loose: idm age 72 | 80 · 3.12 | 22.5 | 4.38 | +32,585 | +5,346 | -2,332 | 52.9 / 9.2 | 42 · 2.69 | 33.3 | 2.2 | +8,224 | +2,214 | -2,009 | 50.7 / 5.8 | +41 / -656 | +0.0 / +0.0 |
| loose: idm dist 0.75 | 75 · 2.93 | 22.7 | 4.29 | +31,627 | +5,189 | -2,077 | 48.7 / 7.6 | 35 · 2.24 | 28.6 | 1.23 | +1,504 | +405 | -3,211 | 18.8 / 5.8 | -917 / -7,376 | -4.2 / -31.9 |
| loose: idm dist 1.5 | 82 · 3.2 | 22.0 | 3.84 | +29,239 | +4,797 | -3,756 | 47.9 / 11.8 | 45 · 2.88 | 33.3 | 2.13 | +8,517 | +2,293 | -2,029 | 50.7 / 14.5 | -3,305 / -363 | -5.0 / +0.0 |
| loose: idm dist 2.0 | 84 · 3.28 | 20.2 | 3.36 | +26,379 | +4,328 | -3,759 | 45.4 / 13.4 | 46 · 2.95 | 32.6 | 1.92 | +7,699 | +2,073 | -2,029 | 50.7 / 14.5 | -6,165 / -1,181 | -7.5 / +0.0 |
| loose: no inducement gate | 89 · 3.48 | 21.3 | 3.15 | +27,909 | +4,579 | -3,540 | 42.9 / 11.8 | 49 · 3.14 | 30.6 | 1.57 | +5,165 | +1,390 | -1,772 | 46.4 / 11.6 | -4,635 / -3,715 | -10.0 / -4.3 |
| loose: stop 6-80 | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| loose: stop 8-100 | 82 · 3.2 | 22.0 | 4.22 | +31,874 | +5,229 | -2,360 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -670 / +0 | +0.0 / +0.0 |
| loose: stop 6-100 | 82 · 3.2 | 22.0 | 4.22 | +31,874 | +5,229 | -2,360 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -670 / +0 | +0.0 / +0.0 |
| loose: stop 8-120 | 82 · 3.2 | 22.0 | 4.22 | +31,874 | +5,229 | -2,360 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -670 / +0 | +0.0 / +0.0 |
| loose: stop 4-120 | 82 · 3.2 | 22.0 | 4.22 | +31,874 | +5,229 | -2,360 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -670 / +0 | +0.0 / +0.0 |
| loose: stop 10-80 | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| loose: stop 8-60 | 67 · 2.62 | 23.9 | 4.37 | +31,046 | +5,094 | -2,076 | 47.1 / 3.4 | 34 · 2.18 | 35.3 | 2.25 | +7,948 | +2,140 | -1,456 | 55.1 / 2.9 | -1,498 / -932 | -5.8 / +4.4 |
| loose: depth 0.4 + disp 0.7 | 89 · 3.48 | 20.2 | 3.98 | +31,653 | +5,193 | -2,784 | 55.5 / 14.3 | 45 · 2.88 | 31.1 | 2.04 | +7,521 | +2,025 | -2,006 | 49.3 / 13.0 | -891 / -1,359 | +2.6 / -1.4 |
| loose: depth 0.4 + disp 0.7 + stop 6-100 | 90 · 3.52 | 20.0 | 3.87 | +31,003 | +5,086 | -2,792 | 55.5 / 13.4 | 45 · 2.88 | 31.1 | 2.04 | +7,521 | +2,025 | -2,006 | 49.3 / 13.0 | -1,541 / -1,359 | +2.6 / -1.4 |
| loose: depth 0.3 + disp 0.6 + idm 48 + stop 6-100 | 96 · 3.75 | 18.8 | 4.04 | +34,035 | +5,584 | -3,137 | 57.1 / 9.2 | 47 · 3.01 | 23.4 | 1.14 | +1,146 | +309 | -2,807 | 39.1 / 15.9 | +1,491 / -7,734 | +4.2 / -11.6 |
| loose: stop 8-100, min 1 micro | 90 · 3.52 | 21.1 | 3.38 | +27,149 | +4,454 | -3,478 | 45.4 / 13.4 | 50 · 3.21 | 30.0 | 2.13 | +8,265 | +2,225 | -1,836 | 49.3 / 17.4 | -5,395 / -615 | -7.5 / -1.4 |
| loose: stop 8-120, min 1 micro | 92 · 3.59 | 21.7 | 3.34 | +27,343 | +4,486 | -3,478 | 45.4 / 13.4 | 51 · 3.27 | 29.4 | 2.1 | +8,156 | +2,196 | -1,836 | 46.4 / 18.8 | -5,201 / -724 | -7.5 / -4.3 |
| loose: stop 6-120, min 1 micro | 92 · 3.59 | 21.7 | 3.34 | +27,343 | +4,486 | -3,478 | 45.4 / 13.4 | 51 · 3.27 | 29.4 | 2.1 | +8,156 | +2,196 | -1,836 | 46.4 / 18.8 | -5,201 / -724 | -7.5 / -4.3 |
| loose: stop 8-150, min 1 micro | 93 · 3.63 | 21.5 | 3.26 | +26,758 | +4,390 | -3,478 | 45.4 / 14.3 | 54 · 3.46 | 27.8 | 2.02 | +7,849 | +2,113 | -1,839 | 46.4 / 18.8 | -5,786 / -1,031 | -7.5 / -4.3 |
| native: 2nd trade only for pd sweeps | 81 · 3.16 | 22.2 | 4.0 | +31,677 | +5,197 | -2,944 | 52.9 / 9.2 | 42 · 2.69 | 33.3 | 2.31 | +8,534 | +2,298 | -1,489 | 50.7 / 2.9 | -867 / -346 | +0.0 / +0.0 |
| native: 2nd trade only for pd sweeps (not after a stop) | 81 · 3.16 | 22.2 | 4.0 | +31,677 | +5,197 | -2,944 | 52.9 / 9.2 | 41 · 2.63 | 34.1 | 2.43 | +8,863 | +2,386 | -1,489 | 50.7 / 2.9 | -867 / -17 | +0.0 / +0.0 |
| native: 2nd trade only for pdwm sweeps | 83 · 3.24 | 21.7 | 3.95 | +31,541 | +5,175 | -2,944 | 52.9 / 9.2 | 42 · 2.69 | 33.3 | 2.31 | +8,534 | +2,298 | -1,489 | 50.7 / 2.9 | -1,003 / -346 | +0.0 / +0.0 |
| native: 2nd trade only for pdwm sweeps (not after a stop) | 81 · 3.16 | 22.2 | 4.0 | +31,677 | +5,197 | -2,944 | 52.9 / 9.2 | 41 · 2.63 | 34.1 | 2.43 | +8,863 | +2,386 | -1,489 | 50.7 / 2.9 | -867 / -17 | +0.0 / +0.0 |
| native: 2nd trade only for pwm sweeps | 83 · 3.24 | 21.7 | 3.95 | +31,541 | +5,175 | -2,944 | 52.9 / 9.2 | 41 · 2.63 | 34.1 | 2.31 | +8,551 | +2,302 | -1,489 | 50.7 / 2.9 | -1,003 / -329 | +0.0 / +0.0 |
| native: 2nd trade only for pwm sweeps (not after a stop) | 81 · 3.16 | 22.2 | 4.0 | +31,677 | +5,197 | -2,944 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -867 / +0 | +0.0 / +0.0 |
| native: 2nd trade only for gap sweeps | 83 · 3.24 | 21.7 | 4.3 | +32,408 | +5,317 | -2,334 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -136 / +0 | +0.0 / +0.0 |
| native: 2nd trade only for gap sweeps (not after a stop) | 81 · 3.16 | 22.2 | 4.36 | +32,542 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -2 / +0 | +0.0 / +0.0 |
| native: 2nd trade only for pdwm+gap sweeps | 85 · 3.32 | 21.2 | 3.95 | +31,536 | +5,174 | -2,944 | 52.9 / 9.2 | 42 · 2.69 | 33.3 | 2.31 | +8,534 | +2,298 | -1,489 | 50.7 / 2.9 | -1,008 / -346 | +0.0 / +0.0 |
| native: 2nd trade only for pdwm+gap sweeps (not after a stop) | 82 · 3.2 | 22.0 | 4.0 | +31,675 | +5,197 | -2,944 | 52.9 / 9.2 | 41 · 2.63 | 34.1 | 2.43 | +8,863 | +2,386 | -1,489 | 50.7 / 2.9 | -869 / -17 | +0.0 / +0.0 |
| native: only pdwm sweeps (diagnostic) | 8 · 0.31 | 0.0 | 0.0 | -2,012 | -330 | -2,012 | 0.0 / 0.0 | 7 · 0.45 | 28.6 | 2.91 | +2,398 | +646 | -1,255 | 29.0 / 0.0 | -34,556 / -6,482 | -52.9 / -21.7 |
| native: only gap sweeps (diagnostic) | 3 · 0.12 | 0.0 | 0.0 | -765 | -126 | -765 | 0.0 / 0.0 | 3 · 0.19 | 66.7 | 19.99 | +1,230 | +331 | -65 | 14.5 / 0.0 | -33,309 / -7,650 | -52.9 / -36.2 |
| native: 2 a day, any setup (reference) | 99 · 3.87 | 19.2 | 3.23 | +27,754 | +4,553 | -2,806 | 45.4 / 10.1 | 49 · 3.14 | 32.7 | 2.55 | +11,667 | +3,141 | -1,899 | 49.3 / 14.5 | -4,790 / +2,787 | -7.5 / -1.4 |
| 30m LIT live filters alone | 2 · 0.08 | 50.0 | 1.71 | +164 | +27 | -230 | 0.0 / 0.0 | 0 · 0.0 | 0.0 | None | +0 | +0 | 0 | 0.0 / 0.0 | -32,380 / -8,880 | -52.9 / -50.7 |
| 5m + 30m LIT live filters, 1 a day | 80 · 3.12 | 22.5 | 4.26 | +32,317 | +5,302 | -2,332 | 51.3 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -227 / +0 | -1.6 / +0.0 |
| 30m LIT no inducement gate alone | 7 · 0.27 | 42.9 | 2.94 | +1,812 | +297 | -630 | 8.4 / 0.0 | 2 · 0.13 | 50.0 | 0.41 | -281 | -76 | -472 | 0.0 / 0.0 | -30,732 / -9,161 | -44.5 / -50.7 |
| 5m + 30m LIT no inducement gate, 1 a day | 82 · 3.2 | 24.4 | 4.37 | +33,122 | +5,434 | -2,332 | 59.7 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 4.3 | +578 / +0 | +6.8 / +0.0 |
| 30m LIT relaxed depth 0.4 disp 0.7 stop 100 alone | 4 · 0.16 | 25.0 | 0.99 | -4 | -1 | -230 | 0.0 / 0.0 | 1 · 0.06 | 100.0 | None | +191 | +51 | 0 | 0.0 / 0.0 | -32,548 / -8,689 | -52.9 / -50.7 |
| 5m + 30m LIT relaxed depth 0.4 disp 0.7 stop 100, 1 a day | 81 · 3.16 | 22.2 | 4.26 | +32,312 | +5,301 | -2,332 | 51.3 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | -232 / +0 | -1.6 / +0.0 |
| 5m + 1h LIT live filters, 1 a day | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| 5m + 1h LIT no inducement gate, 1 a day | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| 5m + 1h LIT relaxed depth 0.4 disp 0.7 stop 100, 1 a day | 80 · 3.12 | 22.5 | 4.36 | +32,544 | +5,339 | -2,332 | 52.9 / 9.2 | 40 · 2.56 | 35.0 | 2.43 | +8,880 | +2,391 | -1,489 | 50.7 / 2.9 | +0 / +0 | +0.0 / +0.0 |
| htf grid: 15m add d0.4 disp0.7 idm12 stop80, 1 a day | 82 · 3.2 | 20.7 | 4.14 | +31,632 | +5,190 | -2,332 | 58.8 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -912 / +329 | +5.9 / +1.5 |
| htf grid: 15m add d0.4 disp0.7 idm12 stop100, 1 a day | 84 · 3.28 | 21.4 | 4.19 | +32,222 | +5,286 | -2,334 | 63.0 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -322 / +329 | +10.1 / +1.5 |
| htf grid: 15m add d0.4 disp0.7 idm24 stop80, 1 a day | 84 · 3.28 | 20.2 | 3.93 | +30,742 | +5,044 | -2,332 | 58.8 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -1,802 / +329 | +5.9 / +1.5 |
| htf grid: 15m add d0.4 disp0.7 idm24 stop100, 1 a day | 86 · 3.36 | 20.9 | 3.98 | +31,333 | +5,141 | -2,334 | 63.0 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -1,211 / +329 | +10.1 / +1.5 |
| htf grid: 15m add d0.4 disp0.8 idm12 stop80, 1 a day | 82 · 3.2 | 20.7 | 4.14 | +31,632 | +5,190 | -2,332 | 58.8 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -912 / +317 | +5.9 / +1.5 |
| htf grid: 15m add d0.4 disp0.8 idm12 stop100, 1 a day | 84 · 3.28 | 21.4 | 4.19 | +32,222 | +5,286 | -2,334 | 63.0 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -322 / +317 | +10.1 / +1.5 |
| htf grid: 15m add d0.4 disp0.8 idm24 stop80, 1 a day | 83 · 3.24 | 20.5 | 4.02 | +30,990 | +5,084 | -2,332 | 58.8 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -1,554 / +317 | +5.9 / +1.5 |
| htf grid: 15m add d0.4 disp0.8 idm24 stop100, 1 a day | 85 · 3.32 | 21.2 | 4.08 | +31,581 | +5,181 | -2,334 | 63.0 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -963 / +317 | +10.1 / +1.5 |
| htf grid: 15m add d0.5 disp0.7 idm12 stop80, 1 a day | 82 · 3.2 | 20.7 | 4.14 | +31,632 | +5,190 | -2,332 | 58.8 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -912 / +329 | +5.9 / +1.5 |
| htf grid: 15m add d0.5 disp0.7 idm12 stop100, 1 a day | 84 · 3.28 | 21.4 | 4.19 | +32,222 | +5,286 | -2,334 | 63.0 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -322 / +329 | +10.1 / +1.5 |
| htf grid: 15m add d0.5 disp0.7 idm24 stop80, 1 a day | 84 · 3.28 | 20.2 | 3.93 | +30,742 | +5,044 | -2,332 | 58.8 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -1,802 / +329 | +5.9 / +1.5 |
| htf grid: 15m add d0.5 disp0.7 idm24 stop100, 1 a day | 86 · 3.36 | 20.9 | 3.98 | +31,333 | +5,141 | -2,334 | 63.0 / 9.2 | 42 · 2.69 | 35.7 | 2.48 | +9,209 | +2,479 | -1,519 | 52.2 / 7.2 | -1,211 / +329 | +10.1 / +1.5 |
| htf grid: 15m add d0.5 disp0.8 idm12 stop80, 1 a day | 82 · 3.2 | 20.7 | 4.14 | +31,632 | +5,190 | -2,332 | 58.8 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -912 / +317 | +5.9 / +1.5 |
| htf grid: 15m add d0.5 disp0.8 idm12 stop100, 1 a day | 84 · 3.28 | 21.4 | 4.19 | +32,222 | +5,286 | -2,334 | 63.0 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -322 / +317 | +10.1 / +1.5 |
| htf grid: 15m add d0.5 disp0.8 idm24 stop80, 1 a day | 83 · 3.24 | 20.5 | 4.02 | +30,990 | +5,084 | -2,332 | 58.8 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -1,554 / +317 | +5.9 / +1.5 |
| htf grid: 15m add d0.5 disp0.8 idm24 stop100, 1 a day | 85 · 3.32 | 21.2 | 4.08 | +31,581 | +5,181 | -2,334 | 63.0 / 9.2 | 41 · 2.63 | 36.6 | 2.48 | +9,197 | +2,476 | -1,519 | 52.2 / 7.2 | -963 / +317 | +10.1 / +1.5 |
