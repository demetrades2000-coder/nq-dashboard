## In one minute (owner summary)

- **Your ask:** more LIT entries and confluences: MSNR, IDM and different inducements, build-ups, 15-minute order blocks lined
  up with other things, the smart money trap, and stacked setups. You want 3+ LIT trades a week. Today: 2.9 a week, 1 a day.
- **What I tested:** 362 variants in six families. All of them run through the real LIT bot: same entry, same stop beyond the
  sweep, same VIX target, same breakeven, weekly stop and Monday rule.
  - Picked on Jan-Jun 2026 (H1), checked on Jul-Oct 2026 (H2).
  - Scored in money ($1.90 a micro) and on the MFFU 50K 2-week eval with today's two_week sizing.
- **New entry types: none of them works next to today's LIT.**
  - **MSNR (Malaysian SnR)** levels from the line chart: A/V levels, QM (quasimodo), SnR flips, fresh only, on 15m / 1h / 4h.
    - 15m support/resistance setups make good money **on their own**: H1 PF 4.19 +$23.7k, H2 PF 2.65 +$8.6k, about 2.1
      trades a week.
    - But they mostly fire on the same days and the same moves as today's LIT trades.
    - Added as a 2nd trade a day: 3.5 trades a week, but H1 money drops $1.6k and the H2 2-week fails go 2.9% → 10.1%.
    - QM levels hardly ever give a LIT trade (0-1 a half on 1h, PF under 1.4 on 15m). 4h levels give 0.1-0.5 trades a week.
    - Using MSNR levels as extra LIT liquidity is worse in every version tried.
  - **Inducement into an order block (SMC IDM → 15m/1h OB):** only 13 trades in all of 2026, and they lose in Jan-Jun.
  - **Stacked confluence as a second setup type**, using setups today's filters reject (shallow sweep, small displacement or
    no inducement) that have 2+ of: 15m/1h OB, SMT with ES, a fresh MSNR level, 2+ inducements, a build-up, a major level,
    the 4h storyline.
    - As a 2nd trade a day: +$3.3k in H1 but only +$0.6k in H2, and the H2 2-week fails double (2.9% → 5.8%). Rejected.
    - Only from 08:00 ET: the one variant that passes the strict test, but it adds **1 trade per half**, so it is a fluke.
  - **Why nothing adds trades:** the extra setups land on days that already traded, or they are weaker. Even with hindsight
    (extra trades only on days today's LIT sits out), the money doesn't really grow. Earlier studies found the same.
- **Confluence as SIZE: one rule is worth switching on (adopt-candidate, research only today).**
  - Trades whose sweep took **2 or more inducements first** (swing lows/highs within 2 ATR of the swept level, at most 48 bars
    old) are clearly better than trades with only one:

    | | trades with 2+ | avg R | trades with 1 | avg R |
    |---|---|---|---|---|
    | H1 Jan-Jun | 59 | 0.99 | 21 | 0.24 |
    | H2 Jul-Oct | 23 | 1.16 | 17 | 0.01 |
    | 2021-25 | 314 | 0.08 | 196 | −0.03 |

  - Rule: **1.5x size on 2+ inducements, 0.75x on the rest**, never more than $990 at risk on a size-up (under MFFU's $1,000
    soft daily loss).
    - H1: +$40,163 vs +$32,544 (+$7.6k), PF 4.34 vs 4.36.
    - H2: **+$12,747 vs +$8,880 (+$3.9k, $3,432 vs $2,391 a month)**, PF 3.05 vs 2.43.
    - 2-week eval: pass 53.8% / 53.6% (vs 52.9 / 50.7), fail 6.7% / 0.0% (vs 9.2 / 2.9).
    - 2021-25: +$4.2k vs −$0.7k.
  - **Honest part:**
    - Drawdown is about 30% bigger (H1 −$3.0k vs −$2.3k, H2 −$2.0k vs −$1.5k).
    - In the 1,000-path Monte Carlo the H1 2-week pass dips a little (46.2% vs 48.1%), while fails fall (3.6% vs 5.9%).
      H2 MC: pass 57.7% vs 56.8%, fail 2.5% vs 6.9%.
    - In H1, most of the gain is just bigger size: sizing every trade 1.25x already gives +$5.8k. In H2 the selection does
      most of the work (the 1.25x control gives only +$0.7k).
    - Neighbours hold: from 1.0 ATR / 48 bars up to 3.0 ATR / 72 bars, trades with 2+ inducements always earn more R, in every
      period.
  - Trades a week don't change: it is sizing, not a new setup.
- **What it needs to go live:**
  - Engine option `"idm_size": {"atr": 2.0, "bars": 48, "n": 2, "up": 1.5, "down": 0.75, "cap_usd": 990}` in
    `live_model.json` "lit". It is off by default; the 120 live trades are unchanged.
  - Check: with the option on, `engine/lit.py` gives the same 630 trades (2021-26) and the same micros as this study, 630 of
    630. At the engine's $1.40 commission, 2026 is +$53,270 vs +$41,734 (H1 +$40,434, H2 +$12,835). The biggest risk on one
    trade is $935.
  - Done 2026-10-19: `engine/sizing.py` now applies the multiplier in two_week / eval / funded too. **On that real eval
    path it does not hold** (next section): keep it off for the eval.
  - No route change: same orders, just a different number of micros.
- **3+ trades a week:** I found no LIT-based entry that gets there without costing money or eval safety in one of the halves.
  The honest answer stays: about 2.9 a week (3.1 in H1, 2.6 in H2), with 85% / 81% of weeks at 2+.

## Method

- **Base:** `tools/lit_more.py` harness. The live LIT on `live_model.json` "lit", run through `engine/lit.py` run_x.
  - Check: 120 / 120 trades identical to run `lit_live` (+$41,734).
  - The eval matches `lit_eventual` (H1 52.9 / 9.2, H2 50.7 / 2.9).
  - Run with `python -X utf8 tools/lit_new_entries.py check`.
- **New detectors:** `engine/lit_entries.py`, pure functions that use closed bars only.
  - **MSNR levels.** The close line of 15m / 1h / 4h candles, resampled from the 5m file.
    - A-level = a close-line peak (k = 2 candles each side, prominence ≥ 0.5 ATR of that timeframe). V-level = a valley.
    - QM = V1, A1, a lower low V2, then a close above A1 (mirror for shorts).
    - Flip = the first close through a confirmed A/V level.
    - A level is known at the close of the last 5m bar of the candle that confirms it.
    - Fresh = no 5m wick has reached it since.
  - **Storyline:** the 4h close-line trend, set by the last break of an A or V level.
  - **LevelMarket:** a copy of the LIT market whose levels are MSNR levels or IDM swings, instead of (or next to) the LIT
    levels.
    - `engine.lit.candidates` then finds "sweep + displacement + 5m CISD" setups exactly like LIT, and `run_x` trades them.
    - With no extra levels it gives exactly the LIT candidates (check).
  - **IDM → OB.** Fresh 15m / 1h order blocks from `engine/lit_ob.py`.
    - IDM = a 5m swing that forms in front of the block (within 1-2 ATR) while the block is untouched.
    - The setup = a sweep of the IDM whose extreme reaches the block, then a 5m CISD.
- **Look-ahead test:** the MSNR levels are rebuilt on data cut at 12 random bars, on each timeframe. Every level known before the
  cut is identical, and the storyline before the cut is identical.
  - Order-block hits reuse `tools/lit_ob.poi_hits` (no look-ahead).
  - SMT reuses `tools/lit_adv_audit.smt_flags` (same timestamps, closed bars only).
- **Combining a new source with today's LIT:**
  - "1 a day": the first fill of either source wins. A live bot can do exactly this.
  - "2 a day": one trade at a time, at most one per source.
  - "Only from 08:00 / 09:30 / 10:00 ET": the new source trades later in the day only.
  - "Hindsight bound": new trades only on days today's LIT has none. A live bot can't know that in advance.
- **Money:** LIT rule ($800 up to a 20-pt stop, 800 × 20 / stop, max 40 micros, weekly stop), $1.90 a micro round trip.
- **Eval:** MFFU 50K exact rules, live `lit_sizing` (two_week for 10 sessions, then safe_eval). A fresh eval starts on every
  session (p10 / f10), plus a 1,000-path Monte Carlo.
  - A grade cut (< 1x) is applied after the eval sizing. A size-up does nothing in two_week: "one winner passes" already sizes
    to the target.
- **2021-25:** 5m execution, reference only.

## Results (2026; n · trades/wk · % weeks 2+ | PF | net $ ($/mo) | max DD | 2-week eval pass / fail %)

| Variant | H1 n · /wk · wk2+ | H1 PF | H1 net ($/mo) | H1 DD | H1 2-wk | H2 n · /wk · wk2+ | H2 PF | H2 net ($/mo) | H2 DD | H2 2-wk | 2021-25 PF, net | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **LIT live (base)** | 80 · 3.12 · 85% | 4.36 | +32,544 (5,339) | −2,332 | 52.9 / 9.2 | 40 · 2.56 · 81% | 2.43 | +8,880 (2,391) | −1,489 | 50.7 / 2.9 | 0.99, −651 | live |
| **2+ inducements (2 ATR, 48 bars) x1.5, rest x0.75, cap $990** | 80 · 3.12 · 85% | 4.34 | **+40,163** (6,589) | −3,024 | 53.8 / 6.7 | 40 · 2.56 · 81% | 3.05 | **+12,747** (3,432) | −2,025 | 53.6 / 0.0 | 1.04, +4,182 | **adopt-candidate** (eval part needs sizing.py) |
| same, rest x1.0 (size-up only) | 80 · 3.12 | 4.27 | +41,406 | −3,138 | 52.9 / 9.2 | 40 · 2.56 | 2.78 | +12,736 | −2,025 | 50.7 / 2.9 | 1.01, +1,348 | promising (money only) |
| neighbour 2 ATR, 72 bars | 80 | 4.33 | +40,139 | −3,024 | 53.8 / 6.7 | 40 | 2.92 | +12,480 | −2,025 | 53.6 / 0.0 | 1.03, +3,532 | holds |
| neighbour 3 ATR, 72 bars | 80 | 4.26 | +39,950 | −3,024 | 52.9 / 6.7 | 40 | 2.82 | +12,230 | −2,025 | 53.6 / 0.0 | 1.03, +3,950 | holds |
| neighbour 1.5 ATR, 48 bars | 80 | 4.87 | +41,474 | −2,751 | 51.3 / 3.4 | 40 | 2.95 | +11,723 | −1,813 | 50.7 / 0.0 | 1.02, +2,340 | H1 pass −1.6 |
| control: every trade x1.25, cap $990 | 80 | 4.47 | +38,361 | −2,687 | 52.9 / 9.2 | 40 | 2.37 | +9,612 | −1,672 | 50.7 / 2.9 | 0.99, −1,096 | leverage only |
| Stacked 2+ of 8, live-rejected setups, no idm gate, only from 08:00, 1 a day | 81 · 3.16 · 85% | 4.52 | +33,668 | −2,332 | 55.5 / 9.2 | 41 · 2.63 · 88% | 2.48 | +9,137 | −1,456 | 52.2 / 2.9 | 0.97, −2,959 | passes, but +1 trade a half: fluke |
| Stacked 2+ of 8, live-rejected setups, no idm gate, 2 a day | 97 · 3.79 · 89% | 3.90 | +35,796 | −3,549 | 54.6 / 10.9 | 49 · 3.14 · 88% | 2.21 | +9,433 | −1,460 | 50.7 / 5.8 | 0.92, −9,716 | H2 fails x2: rejected |
| Stacked 3+ of 8, live-rejected (depth 0.25, disp 0.5), 1 a day | 85 · 3.32 | 4.38 | +35,235 | −2,697 | 54.6 / 6.7 | 45 · 2.88 | 1.94 | +6,996 | −2,075 | 42.0 / 7.2 | 0.87, −15,951 | H2 worse |
| 2nd trade: live-filter setup with 2+ confluences after the day's trade | 92 · 3.59 | 3.40 | +28,577 | −2,963 | 45.4 / 10.1 | 45 · 2.88 | 2.82 | +12,726 | −1,456 | 50.7 / 7.2 | 0.93, −8,574 | H1 worse |
| MSNR 15m A+V standalone (alone) | 54 · 2.11 · 63% | 4.19 | +23,714 (3,891) | −3,178 | 39.5 / 1.7 | 33 · 2.12 · 75% | 2.65 | +8,637 (2,325) | −2,229 | 31.9 / 2.9 | 1.01, +1,203 | good alone, overlaps LIT |
| MSNR 15m A+V + live, 1 a day | 86 · 3.36 | 3.59 | +30,295 | −2,334 | 47.1 / 7.6 | 49 · 3.14 | 2.05 | +8,638 | −2,513 | 43.5 / 15.9 | 1.05, +5,589 | rejected |
| MSNR 15m A+V + live, 2 a day | 90 · 3.52 · 85% | 3.64 | +30,901 | −2,334 | 48.7 / 7.6 | 56 · 3.59 · 94% | 2.62 | +13,668 | −2,001 | 47.8 / 10.1 | 1.02, +3,292 | H1 −$1.6k, H2 fails x3: rejected |
| MSNR 1h A+V standalone (alone) | 33 · 1.29 | 2.03 | +4,708 | −1,260 | 28.6 / 0.0 | 13 · 0.83 | 2.36 | +3,209 | −1,494 | 30.4 / 0.0 | 0.80, −9,103 | thin |
| MSNR 1h A+V + live, 2 a day | 93 · 3.63 | 3.91 | +33,655 | −1,873 | 52.1 / 5.0 | 48 · 3.08 | 1.89 | +7,258 | −1,684 | 46.4 / 8.7 | 0.91, −10,448 | H2 worse |
| MSNR 1h A+V+QM+flip + live, 2 a day | 94 · 3.67 | 3.43 | +29,475 | −1,953 | 44.5 / 5.0 | 51 · 3.27 | 1.80 | +6,956 | −1,684 | 47.8 / 11.6 | 0.92, −10,445 | rejected |
| MSNR 1h QM standalone (alone) | 1 | - | −176 | | | 1 | - | −5 | | | 0.16, −5,904 | ~0 trades |
| MSNR 15m QM + live, 2 a day | 89 · 3.48 | 3.61 | +28,557 | −2,625 | 52.9 / 10.1 | 46 · 2.95 | 2.17 | +8,345 | −1,669 | 50.7 / 7.2 | 0.94, −6,345 | rejected |
| MSNR 4h all kinds standalone (alone) | 13 · 0.51 | 1.46 | +1,407 | −2,826 | 3.4 / 0.0 | 6 · 0.38 | 5.32 | +2,860 | −662 | 5.8 / 0.0 | 1.13, +2,544 | too few |
| LIT + MSNR 15m levels as liquidity | 63 · 2.46 | 4.39 | +25,022 | −1,859 | 42.0 / 5.0 | 41 · 2.63 | 2.01 | +7,741 | −2,690 | 36.2 / 7.2 | 0.97, −2,899 | worse |
| LIT + MSNR 1h levels as liquidity | 79 · 3.09 | 3.87 | +27,883 | −2,104 | 50.4 / 8.4 | 39 · 2.50 | 2.01 | +7,344 | −1,590 | 47.8 / 7.2 | 0.92, −9,108 | worse |
| IDM → 15m/1h OB (alone) | 8 · 0.31 | 0.00 | −2,155 | −2,155 | 0 / 0 | 5 · 0.32 | 2.03 | +817 | −553 | 15.9 / 0.0 | 1.02, +307 | rejected |
| IDM → 15m/1h OB + live, 1 a day | 81 · 3.16 | 4.32 | +32,457 | −2,457 | 52.9 / 7.6 | 43 · 2.76 | 2.28 | +8,617 | −1,692 | 43.5 / 2.9 | 0.94, −6,506 | rejected |
| Grade size: 3+ of 8 confluences x1.5 | 80 | 4.62 | +38,174 | −2,718 | 52.9 / 9.2 | 40 | 2.45 | +9,989 | −1,954 | 50.7 / 2.9 | 1.01, +1,325 | grade ≥ 3 trades earn LESS R in both halves: leverage only |
| Grade size: ≤ 1 confluence x0.5 | 80 | 4.01 | +25,518 | −2,150 | 46.2 / 6.7 | 40 | 2.40 | +7,240 | −1,880 | 40.6 / 0.0 | 0.96, −3,151 | rejected |
| MSNR 15m, only on days LIT has no trade (hindsight) | 86 · 3.36 | 3.81 | +30,973 | −2,334 | 48.7 / 9.2 | 49 · 3.14 | 2.31 | +9,738 | −1,967 | 49.3 / 15.9 | 1.06, +6,589 | even hindsight loses in H1 |

All 362 variants (every timeframe, sweep depth 0 / 0.25 / 0.5, with and without the inducement gate, 1 vs 2 a day, time splits,
every single-tag size rule) are in `research/lit/new_entries.json`.

## What the confluence tags say about today's 120 trades

Average R per trade with / without each tag (1 micro, costs in). Trade counts are in brackets.

| Tag | H1 with | H1 without | H2 with | H2 without | 2021-25 with | 2021-25 without |
|---|---|---|---|---|---|---|
| 15m OB at the sweep extreme | −0.00 (1) | 0.80 | 3.44 (1) | 0.60 | −0.28 (31) | 0.06 |
| 1h OB at the extreme | - (0) | 0.79 | - (0) | 0.67 | −0.47 (13) | 0.05 |
| SMT (NQ took the level, ES held) | −0.51 (4) | 0.86 | 0.25 (6) | 0.75 | 0.51 (7) | 0.03 |
| fresh 1h/4h MSNR level at the extreme | 0.44 (12) | 0.85 | −0.68 (3) | 0.78 | 0.05 (70) | 0.04 |
| 2+ inducements (live gate: 1 ATR, 36 bars) | 0.86 (37) | 0.73 | 1.00 (10) | 0.57 | 0.14 (180) | −0.01 |
| **2+ inducements (2 ATR, 48 bars)** | **0.99 (59)** | **0.24** | **1.16 (23)** | **0.01** | **0.08 (314)** | **−0.03** |
| build-up swept | 0.56 (61) | 1.52 | 0.27 (29) | 1.75 | 0.09 (417) | −0.17 |
| PDH/PWH/PMH/gap swept | 0.20 (7) | 0.85 | 1.60 (6) | 0.51 | −0.22 (66) | 0.08 |
| 4h storyline aligned | 0.82 (36) | 0.77 | 0.17 (19) | 1.13 | 0.12 (224) | −0.02 |
| 3+ of the 8 | 0.66 (21) | 0.84 | 0.19 (10) | 0.84 | 0.13 (143) | 0.01 |

- Order blocks and SMT almost never line up with a live LIT trade (0-6 a half). That is why the "15m OB aligned" and SMT ideas
  can't move the numbers, as the order-block study found before.
- Build-ups are swept on 3 of every 4 setups, so they don't tell setups apart. In 2026 the trades **without** a build-up are
  the better ones.
- More confluences do **not** mean a better trade: 3+ of 8 earns less R than the rest in both halves.
- The inducement count is the one tag that is better in all three periods, at every definition tried.

## On the eval path (2026-10-19)

The numbers above size the eval with only the 0.75x cut, after the fact. Now `engine/sizing.py` applies the multiplier
itself, so this is what the bot would really do on the MFFU 50K: two_week for 10 sessions, then safe_eval, no reset, $1.90 a
micro, true 1m bars. The 1.5x size-up and the 0.75x cut both come before the eval caps (60% of the room, the $1,000 soft daily
loss, 40 micros, $990 a trade), so a size-up can never pass them. `tools/lit_idm_eval.py`, runs `lit_idm_eval_*`.
Check: options off gives exactly run `lit_live` on this path (and t_check + scale_in + be_off gives exactly `lit_adopt_all3_eval`).

Back-to-back eval path per half, costs in (H1 = Jan-Jun pick, H2 = Jul-Oct check; trades a week 3.12 / 2.56, unchanged):

| Variant | H1 PF | H1 net ($/mo) | H1 DD | H1 2-wk pass / fail (MC) | H2 PF | H2 net ($/mo) | H2 DD | H2 2-wk pass / fail (MC) | max $ risk H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|
| **lit_live (today)** | 3.66 | +36,723 (6,025) | −3,612 | 52.9 / 9.2 (50.5 / 7.0) | 2.13 | +9,674 (2,605) | −2,493 | 50.7 / 2.9 (54.0 / 6.8) | 969 / 989 |
| idm_size | 3.19 | +36,263 (5,949) | −3,632 | 54.6 / 10.1 (49.0 / 8.4) | 2.99 | +13,911 (3,745) | −2,008 | 49.3 / 0.0 (50.0 / 5.5) | 987 / 989 |
| idm_size, eval takes only the 0.75x cut | 3.09 | +29,378 (4,820) | −3,356 | 53.8 / 5.9 (48.5 / 5.8) | 2.49 | +10,398 (2,799) | −3,080 | 52.2 / 0.0 (53.5 / 4.0) | 987 / 899 |
| **t_check + scale_in + be_off** | **4.85** | **+53,116 (8,714)** | −3,059 | **58.0 / 2.5** (51.9 / 3.2) | 2.85 | +17,262 (4,647) | −3,076 | **52.2 / 0.0** (58.1 / 3.2) | 969 / 995 |
| idm_size + all three | 3.45 | +40,205 (6,596) | −3,844 | 56.3 / 5.9 (46.0 / 4.2) | 3.46 | +18,692 (5,032) | −3,033 | 49.3 / 0.0 (52.5 / 2.5) | 969 / 995 |
| idm_size (cut only) + all three | 3.40 | +33,858 (5,555) | −3,446 | 56.3 / 2.5 (49.9 / 3.0) | 3.44 | +18,650 (5,021) | −3,075 | 52.2 / 0.0 (57.0 / 2.0) | 987 / 995 |
| t_check + be_off (no scale-in) | 4.02 | +34,234 (5,617) | −3,314 | 57.1 / 5.9 (52.8 / 2.6) | 2.20 | +9,059 (2,439) | −3,073 | 52.2 / 0.0 (55.1 / 3.5) | 969 / 951 |
| idm_size + t_check + be_off | 4.03 | +37,293 (6,118) | −3,397 | 63.9 / 7.6 (53.3 / 3.6) | 2.52 | +10,644 (2,866) | −3,026 | 49.3 / 0.0 (51.0 / 3.3) | 983 / 899 |

What it means, in plain words:

- **On the eval the rule does not hold in both halves.** Alone: H2 makes +$4.2k more, but H1 makes $0.5k less, the H1 2-week
  fails go up (9.2% → 10.1%) and the H2 2-week passes go down (50.7% → 49.3%). The Monte Carlo agrees (H1 pass 50.5 → 49.0%).
- **Why:** two_week sizing already sizes each trade so one winner passes. A 1.5x size-up then only risks more (median risk
  H1 $482 → $574) without passing faster, and the 0.75x cut makes some winners too small to pass, so the next trade has to try again.
- **With the three adopt-candidates it hurts:** H1 +$40.2k instead of +$53.1k, 2-week fails 2.5% → 5.9%, H2 passes 52.2% → 49.3%.
  The cut-only version keeps the fails, but H1 loses $19k.
- **Max $ risk per trade stays under $1,000 in every variant** ($899-$995, full stop + 1 tick + $1.90). The caps work.
- **For the owner's eval, the best combination is t_check + scale_in + be_off without idm_size** (H1 +$53.1k, 2-week
  58.0 / 2.5; H2 +$17.3k, 52.2 / 0.0). That still needs the switch-on work listed in CLAUDE.md (t_check route timing,
  NinjaTrader add-order route for scale_in).
- **Where idm_size can still help:** the LIT size rule (normal) and a funded account, where it adds money in both halves
  (sections above). It is off by default. Turning it on in live_model.json "lit" would also change the eval sizing now, so
  keep it off while the eval runs (or set `lit_sizing.idm: "off"` to keep it out of the eval sizing).

Code: `engine/lit.py` writes `idm_m` / `idm_cap` / `idm_n` / `wk_m` on each trade (only when the option is on).
`engine/lit_live.py` carries them on the trades, the open position and the enter-now entry. `engine/live.py` (primary) and
`engine/multi_account.py` (extra accounts) hand that dict to `engine/sizing.lit_qty` unchanged. In `engine/sizing.py`, two_week,
eval, fast_eval and funded apply `idm_m` to their own base and re-check `idm_cap`, then the caps. normal and safe_eval route the
model's micros, which already carry it. `lit_sizing.idm` can be "both" (default), "cut" or "off". No `idm_m` gives the old
sizing exactly. Scale-in adds are sized from the routed micros (`scale_in_qty(q, q, ...)`), so they follow the multiplier
with no change. Tests: `python -X utf8 -m tests.test_lit_idm_sizing` (18 checks; `--quick` 13) and the new idm block in
`python -m engine.sizing`.

## Files

- `engine/lit_entries.py`: MSNR levels (A/V, QM, flips), storyline, LevelMarket, IDM-in-front-of-OB levels. Pure functions,
  with a selftest: `python -X utf8 -m engine.lit_entries`.
- `engine/lit.py`: the new option `idm_size` (default None; `tests.test_lit_live` unchanged).
- `engine/sizing.py`: applies `idm_m` in two_week / eval / fast_eval / funded (2026-10-19); `tools/lit_idm_eval.py` scores the eval
  path -> `research/lit/idm_eval.json`, runs `lit_idm_eval_*`.
- `tools/lit_new_entries.py`: commands `check` (base == lit_live + look-ahead test), `msnr`, `msnrlit`, `idmob`, `stack`,
  `grade`, `idm2`, `split`, `save` (reruns the families and stores the runs `lit_ent_*`).
- `research/lit/new_entries.json`: every variant.
