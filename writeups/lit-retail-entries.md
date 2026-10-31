## In one minute (owner summary)

- **Your ask:** retail tools traders make money with (EMAs, supply and demand, support and resistance, MACD) as new LIT
  entries, so LIT finds **3+ trades a week**. Today: 2.9 a week (Jan-Jun 3.1, Jul-Oct 2.6), 1 trade a day.
- **What I built and tested: 47 new setups in 5 families, 188 scored runs.** Every one ends in the real LIT trade: same 1m
  entry, stop 1 tick beyond the low/high it protects, VIX-band target, breakeven, 15-minute check, weekly stop, Monday rule.
  1. **S/R and supply/demand as extra LIT sweep levels** (2+ touch swing clusters on 15m/1h, round 100 / 50 numbers, fresh
     15m/1h zones), so the normal sweep -> inducement -> displacement -> CISD chain fires on more levels.
  2. **Supply/demand retest:** price comes back into a fresh 15m/1h zone, 5m CISD in the zone's direction.
  3. **S/R break and retest:** a 5m close through S/R, a pull back that holds, CISD with the break.
  4. **EMA pullback in trend:** 1h and 15m EMA 21 above EMA 50 (or below for shorts), pullback to the EMA, CISD back.
  5. **MACD divergence** at a LIT sweep that LIT's filters reject (too shallow, too small a push, no inducement).
- **Each was run 3 ways next to LIT:** (a) first fill wins, 1 trade a day; (a*) only on days LIT has no trade (your "second
  slot"; a live bot cannot know that in advance, so this one is an upper bound); (b) a 2nd trade a day, one of each kind.
- **Answer: none of them is good enough to switch on.**
  - **The pick on Jan-Jun fails on Jul-Oct.** EMA pullback (15m EMA 21) as a 2nd trade: Jan-Jun **+$13.0k** more than LIT
    (4.5 trades a week, 2-week eval pass 57% -> 71%), but Jul-Oct **-$3.7k**, its own Jul-Oct trades win 25% (16 trades, 4 tiny
    winners, -$4.2k on its own), and the 1-month eval fail rate goes 0% -> 24%. 2021-25 reference: -$13.8k (live -$0.7k).
    Classic retail trend-following: it worked in the Jan-Jun trend and broke in the Jul-Oct chop.
  - **Only 10 of 141 combined tests make more money in both halves**; by pure chance I would expect about 12. None of the 10
    also gets Jul-Oct to 3 trades a week without more eval fails.
  - **S/R, round numbers and S/D zones as extra LIT levels add almost nothing**: 0-6 trades a half. LIT's own levels
    (session boxes, PDH/PDL, build-ups) already sit on the same prices, so the "new" sweeps are mostly LIT's own trades.
  - **Break-and-retest** adds 18 trades a half but loses money in Jan-Jun on its own (PF 0.72) and loses $3.7k in H1 next to LIT.
  - **MACD as a stand-in for every filter** adds 24-35 trades but its Jul-Oct trades lose (PF 0.50 on their own) and the
    2-week fail rate in Jul-Oct goes 0% -> 10-20%.
- **The closest call (not adopted):** 15m supply/demand retest + MACD 15m divergence instead of the inducement, as a 2nd
  trade a day. It is the only one that gets to **3+ a week in both halves** (3.75 / 3.27) with more money in H1:
  - Jan-Jun +$38,350 (live +$33,656, **+$4,694**), Jul-Oct +$9,375 (live +$9,410, **-$35**).
  - 2-week eval: Jan-Jun 57.1% pass / 3.4% fail (live 57.1 / 5.9), Jul-Oct 50.7 / **2.9** (live 52.2 / 0.0).
    1-month fails Jul-Oct 0% -> 6.9%. 2021-25 reference -$4,964 (live -$715).
  - Fails the rule (Jul-Oct money not up, eval fails up). Its two parts on their own are the only retail setups that made
    money in both halves (tiny samples: 5-18 trades a half). Worth a forward paper look later, not money now.
- **What I built:** `engine/lit_retail.py` (all five families) and two engine switches, both **off** by default:
  `"retail"` (which family) and `"src_cap"` (1 LIT + 1 retail trade a day). The PC bot and the cloud run them through the
  same live loop; with the closest call switched on, the live-loop replay gives **147/147 trades identical** to the backtest;
  off, LIT is unchanged (120/120). Nothing changed in `live_model.json`.
- **Bottom line on 3 a week:** retail tools do not find good extra trades for LIT. The extra trades they find are either the
  same moves LIT already takes, or weaker trades that pay in one half and give it back in the other.

## What is new compared to earlier studies

- Earlier "more trades" studies (`lit-more-setups.md`: ES, 15m/30m/1h LIT, missed fills, looser filters; `lit-all-hours.md`:
  Asia, 2 a day, re-arm; `lit-new-entries.md`: MSNR S/R levels, inducement into order blocks, stacked confluence;
  `lit-adv-continuation.md`; `lit-order-blocks.md`: HTF order-block entries; `lit-batch3a.md`: round numbers and equal
  highs/lows as size tilts; `lit-batch3b.md`) never tried **classic retail indicators** (EMA stack + pullback, MACD
  divergence), **swing-cluster S/R as LIT sweep levels**, **supply/demand zones** (base + leg-out candle, fresh until
  touched) as levels or as a retest entry, or **break-and-retest** of S/R. Round numbers were only a size tilt before; here
  they are extra sweep levels. MSNR (line-chart S/R) was tested before; the swing clusters here are on the candle highs/lows.
- The other agent tests the same tools as **confluence / size on today's trades**; this study only adds **new trades**.

## How it was tested

- **Data:** CME NQ1! 5m (2021-11 -> 2026-10-16) and true 1m for 2026 (`data/NQ_*.csv`). Official CME data only (TradingView / NinjaTrader), no CFD.
- **No look-ahead:** 15m/1h candles are built from the 5m bars and count only once their last 5m bar has closed; swings only
  2 candles after the swing; zones only after the leg-out candle closed; EMAs/MACD from closed bars. `tools/lit_retail.py
  check` rebuilds every family on data **cut at the entry bar** (the entry bar forming, like the PC bot's early mode) for
  25 sampled 2026 setups each: **0 of 191 differ**. `tests/test_lit_retail.py` repeats it on a smaller sample.
- **The trade** is today's live LIT executor (`engine/lit.run_x`, `live_model.json` "lit"): 30-min limit at the 5m CISD
  level, 1m CISD within 20 bars, stop 1 tick beyond the structural extreme (the zone retest "zone" variant: beyond the farther
  of the retest low and the zone's far edge), VIX-band target >= 1.5R banked at 8R, BE at 1R (+1.25 pts), 15-minute check,
  flat 15:55, entries 02:00-15:30, Monday rule, weekly stop. 1 tick slippage on market entries and stops is inside the engine.
- **Money:** LIT size rule ($800 up to a 20-pt stop, 800x20/stop, max 40 micros, weekly stop), **$1.90 a micro** round trip
  (MFFU). That is why live LIT shows H1 +$33,656 / H2 +$9,410 here (the CLAUDE.md numbers use $1.40).
- **Eval:** MFFU Builder 50K exact rules under the live eval sizing (two_week for 10 sessions, then safe_eval), a fresh eval
  started on every session: pass / fail within 10 sessions (2 weeks) and 21 sessions (1 month).
- **Judge:** pick on H1 (Jan 2-Jun 30 2026), check on H2 (Jul 1-Oct 16). Adopt only if LIT + new raises net $ in H1 AND H2,
  does not raise the 2-week fail rate meaningfully and gets to >= 3 trades a week. 2021-25 (5m execution) is a reference.

## Results: the families

| Family | New trades a half (best way) | On its own | Next to LIT | Verdict |
|---|---|---|---|---|
| 1. S/R, round numbers, S/D edges as LIT levels | 0-6 | -$400 to +$2.8k, 0-6 trades | -$2.1k to +$0.3k H1, -$0.4k to +$0.5k H2 | no: almost no new trades |
| 2. Supply/demand retest | 2-12 | 15m: H1 +$0.5k to +$3.4k, H2 -$0.3k to +$0.2k | 2nd trade: H1 -$0.1k to +$2.9k, H2 -$0.4k to +$0.2k | lead (thin), H2 fails up |
| 3. Break and retest | 1-18 | H1 -$1.0k, H2 +$1.0k | H1 +$0 to -$3.7k, H2 -$1.0k to +$0.5k | no |
| 4. EMA pullback in trend | 4-44 | H1 +$12.6k, H2 -$4.4k | H1 -$6.0k to +$13.0k, H2 -$6.3k to +$0.8k (the one H2 gain loses $5.9k in H1) | no: one half only |
| 5. MACD divergence instead of a failed filter | 1-35 | any filter: H1 +$3.8k, H2 -$3.1k; inducement only (15m): H1 +$2.3k, H2 +$1.0k | 15m inducement, 2nd trade: H1 +$2.3k, H2 +$0.1k | lead (thin) |

## Top 5 (by the smaller of the two halves' gain over live LIT)

| # | Variant | Trades/wk H1 / H2 | Net $ H1 / H2 (vs live) | 2-wk pass/fail H1 · H2 | 1-mo pass/fail H1 · H2 | Passes the rule? |
|---|---|---|---|---|---|---|
| - | **Live LIT** | 3.12 / 2.56 | +33,656 / +9,410 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | - |
| 1 | MACD 5m+15m in place of the inducement, first fill | 3.28 / 2.95 | +34,531 / +9,899 (+875 / +489) | 55.5/5.9 · 55.1/4.3 | 75.9/12.0 · 53.4/22.4 | no: <3/wk H2, fails up |
| 2 | 15m S/D zone edges as levels, 2nd trade | 3.16 / 2.63 | +33,657 / +9,860 (+1 / +450) | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | no: 1 trade a half, <3/wk |
| 3 | 15m S/D retest (body 1.75, stop at the retest low), 2nd trade | 3.32 / 2.82 | +36,580 / +9,614 (+2,924 / +204) | 57.1/5.9 · 50.7/2.9 | 76.9/12.0 · 48.3/3.4 | no: <3/wk H2, fails up; neighbours (body 1.5 / 2.0) lose in H2 |
| 4 | 1h S/D retest (stop beyond the zone), first fill | 3.16 / 2.69 | +33,657 / +9,556 (+1 / +146) | 57.1/5.9 · 53.6/0.0 | 75.9/12.0 · 53.4/0.0 | no: 1-2 trades a half, <3/wk |
| 5 | 15m S/D retest (body 2.0) + MACD 15m for the inducement, 2nd trade | 3.59 / 2.88 | +36,991 / +9,508 (+3,335 / +98) | 55.5/3.4 · 53.6/2.9 | 76.9/11.1 · 53.4/3.4 | no: <3/wk H2, H2 fails up |
| ~ | Closest to 3/wk: 15m S/D retest + MACD 15m for the inducement, 2nd trade | 3.75 / 3.27 | +38,350 / +9,375 (+4,694 / **-35**) | 57.1/3.4 · 50.7/2.9 | 78.7/11.1 · 51.7/6.9 | no: H2 money flat, fails up |
| ~ | Pick on H1: EMA pullback 15m EMA 21, 2nd trade | 4.53 / 3.33 | +46,641 / +5,664 (+12,985 / **-3,746**) | 71.4/3.4 · 46.4/4.3 | 82.4/7.4 · 46.6/24.1 | no: loses in H2 |

## Honest count vs chance

- 47 setups x 3 ways = **141 combined tests** (+ 47 "on its own" runs). 62 of 141 add money in Jan-Jun, 27 in Jul-Oct.
- If the two halves were unrelated, about 141 x 62/141 x 27/141 = **11.9** would add money in both by luck. Observed: **10**.
  So the retail tools show **no real edge** next to LIT. The gains in both halves are $1-$2.3k in H1 and $28-$489 in H2.
- 0 of 141 pass the full rule (money up in both halves, 3+ a week, no rise in 2-week fails).
- On their own, 10 of 47 setups made money in both halves; 9 of the 10 are the MACD-15m-for-inducement and 15m S/D retest
  families and their neighbours (5-18 trades a half each: too few to trust, but the one pattern worth a forward look).
- The second grid (10 neighbours / combinations of the two closest calls) was chosen after seeing the first grid, so its
  numbers are optimistic; it is counted in the 141.

## Why it does not work

- **The good extra setups are already LIT's.** A 15m/1h S/R cluster, a round number or a zone edge near a sweep is usually
  on the same price as a session box, PDH/PDL or a build-up. Adding them as levels found 18-629 more setups in 5 years but
  only 0-6 new trades a half in 2026 (the rest are on LIT days, fail the 0.5-ATR depth / inducement / displacement filters,
  or never fill the 30-min limit).
- **The new trades are weaker in the half they were not picked on.** EMA pullbacks win in the Jan-Jun trend and lose almost
  every Jul-Oct trade; break-and-retest is the reverse; MACD-for-any-filter adds many trades with a Jul-Oct PF of 0.5.
- **First fill wins hurts LIT.** A retail setup often fills earlier in the day than LIT's London/NY setup and takes the day's
  slot: SD 15m (first fill) costs $5.8k in H1 and $3.4k in H2 for that reason. The 2nd-trade way avoids that but adds risk
  on LIT days, so eval fails go up.

## What was built (off by default)

- `engine/lit_retail.py`: all five families (pure functions of closed bars), `apply(M, C, P)` adds the family's setups to
  the LIT candidates; each setup has `src` = lvl / sd / brt / ema / macd and goes through the unchanged LIT executor.
- `engine/lit.py` DEFAULTS: `"retail": None` (a family config or a list) and `"src_cap": None` (max trades a day per source;
  with `"max_per_day": 2` and `"src_cap": 1` = one LIT + one retail trade a day). Both None = today's LIT exactly.
- `engine/lit_live.py` calls `lit_retail.apply` after `lit.candidates` when "retail" is set, so the PC bot and the cloud
  would run it identically; `tools/lit_final.py run` does the same for the backtest.
- **Checks:** `python -X utf8 -m tests.test_lit_retail` (off = 120/120 lit_live trades; 15m candles never known early;
  cut-at-entry rebuild finds the same setups): PASS. Live loop with the closest call on:
  `python -X utf8 -m tests.test_lit_live --days --nobot --retail=<json>` -> **147/147 trades identical** (entries, exits, $).
- **The switch (not recommended):** in `live_model.json` "lit": `"retail": [{"kind": "sd", "sd_tf": ["15m"], "stop": "ext"},
  {"kind": "macd", "macd_tf": "15m", "macd_sub": ["idm"]}], "max_per_day": 2, "src_cap": 1`. Not set; the owner approves
  switches, and this one fails the rule.

## Files

- `tools/lit_retail.py` (`check`, `all`, `grid2`, `save`), `engine/lit_retail.py`, `tests/test_lit_retail.py`.
- Every row: `research/lit/retail_entries.json`. Stored runs (`lit_retail_e_*`): live LIT, every variant's 2nd-trade way,
  and all four ways of the H1 pick and the three closest calls.

## Every test

Ways: alone = the new setup on its own (1 a day); first = LIT + new, 1 a day, first fill wins; slot = new only on days LIT has no trade (upper bound, not a live rule); second = up to 2 a day, 1 LIT + 1 new. Net $ at the LIT size rule, $1.90 a micro; eval = MFFU 50K under the live two_week sizing. Variants starting with N are the second grid (neighbours / combinations).

| Variant | Way | New trades H1 / H2 | Trades/wk H1 / H2 | Weeks 2+ / 3+ % H1 · H2 | Win % H1 / H2 | PF H1 / H2 | Net $ H1 / H2 | vs live $ H1 / H2 | $/mo H1 / H2 | Max DD H1 / H2 | 2-wk pass/fail H1 · H2 | 1-mo pass/fail H1 · H2 | 2021-25 net $ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| base (live LIT) | live | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | - / - | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| L sr15 | alone | 3 / 3 | 0.12 / 0.19 | 0.0/0.0 · 0.0/0.0 | 66.7 / 33.3 | 0.02 / 0.0 | -47 / -397 | - / - | -8 / -107 | -47 / -397 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -936 |
| L sr15 | first | 3 / 3 | 3.24 / 2.76 | 85.2/77.8 · 87.5/50.0 | 59.0 / 46.5 | 4.89 / 2.49 | +33,610 / +9,013 | -46 / -397 | +5,514 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -940 |
| L sr15 | slot | 3 / 3 | 3.24 / 2.76 | 85.2/77.8 · 87.5/50.0 | 59.0 / 46.5 | 4.89 / 2.49 | +33,610 / +9,013 | -46 / -397 | +5,514 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -669 |
| L sr15 | second | 3 / 3 | 3.24 / 2.76 | 85.2/77.8 · 87.5/50.0 | 59.0 / 46.5 | 4.89 / 2.49 | +33,610 / +9,013 | -46 / -397 | +5,514 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -2,052 |
| L sr1h | alone | 1 / 0 | 0.04 / 0.0 | 0.0/0.0 · 0.0/0.0 | 0.0 / 0.0 | 0.0 / - | -226 / +0 | - / - | -37 / +0 | -226 / 0 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -55 |
| L sr1h | first | 1 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 5.07 / 2.66 | +33,916 / +9,410 | +260 / +0 | +5,564 / +2,533 | -2,213 / -1,419 | 57.1/4.2 · 52.2/0.0 | 75.9/10.2 · 51.7/0.0 | -715 |
| L sr1h | slot | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | +0 / +0 | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| L sr1h | second | 1 / 0 | 3.16 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.0 / 47.5 | 4.79 / 2.66 | +33,430 / +9,410 | -226 / +0 | +5,485 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -739 |
| L sr15+1h | alone | 4 / 3 | 0.16 / 0.19 | 0.0/0.0 · 0.0/0.0 | 50.0 / 33.3 | 0.0 / 0.0 | -273 / -397 | - / - | -45 / -107 | -274 / -397 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -936 |
| L sr15+1h | first | 4 / 3 | 3.24 / 2.76 | 85.2/77.8 · 87.5/50.0 | 59.0 / 46.5 | 5.04 / 2.49 | +33,869 / +9,013 | +213 / -397 | +5,557 / +2,427 | -2,212 / -1,580 | 57.1/4.2 · 47.8/0.0 | 75.9/10.2 · 44.8/6.9 | -940 |
| L sr15+1h | slot | 3 / 3 | 3.24 / 2.76 | 85.2/77.8 · 87.5/50.0 | 59.0 / 46.5 | 4.89 / 2.49 | +33,610 / +9,013 | -46 / -397 | +5,514 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -669 |
| L sr15+1h | second | 4 / 3 | 3.28 / 2.76 | 85.2/77.8 · 87.5/50.0 | 58.3 / 46.5 | 4.77 / 2.49 | +33,384 / +9,013 | -272 / -397 | +5,477 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -2,052 |
| L sr15 3 touches | alone | 1 / 3 | 0.04 / 0.19 | 0.0/0.0 · 0.0/0.0 | 100.0 / 33.3 | - / 0.0 | +0 / -397 | - / - | +0 / -107 | 0 / -397 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +708 |
| L sr15 3 touches | first | 1 / 3 | 3.16 / 2.76 | 85.2/70.4 · 87.5/50.0 | 59.3 / 46.5 | 4.92 / 2.49 | +33,657 / +9,013 | +1 / -397 | +5,522 / +2,427 | -2,213 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | +275 |
| L sr15 3 touches | slot | 1 / 3 | 3.16 / 2.76 | 85.2/70.4 · 87.5/50.0 | 59.3 / 46.5 | 4.92 / 2.49 | +33,657 / +9,013 | +1 / -397 | +5,522 / +2,427 | -2,213 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | +275 |
| L sr15 3 touches | second | 1 / 3 | 3.16 / 2.76 | 85.2/70.4 · 87.5/50.0 | 59.3 / 46.5 | 4.92 / 2.49 | +33,657 / +9,013 | +1 / -397 | +5,522 / +2,427 | -2,213 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | +23 |
| L sr15 tol 0.15 | alone | 3 / 2 | 0.12 / 0.13 | 0.0/0.0 · 0.0/0.0 | 66.7 / 50.0 | 0.02 / 0.0 | -47 / -160 | - / - | -8 / -43 | -47 / -160 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -1,277 |
| L sr15 tol 0.15 | first | 3 / 2 | 3.24 / 2.69 | 85.2/77.8 · 87.5/43.8 | 59.0 / 47.6 | 4.89 / 2.59 | +33,610 / +9,250 | -46 / -160 | +5,514 / +2,490 | -2,212 / -1,580 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/6.9 | -967 |
| L sr15 tol 0.15 | slot | 3 / 2 | 3.24 / 2.69 | 85.2/77.8 · 87.5/43.8 | 59.0 / 47.6 | 4.89 / 2.59 | +33,610 / +9,250 | -46 / -160 | +5,514 / +2,490 | -2,212 / -1,580 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/6.9 | -696 |
| L sr15 tol 0.15 | second | 3 / 2 | 3.24 / 2.69 | 85.2/77.8 · 87.5/43.8 | 59.0 / 47.6 | 4.89 / 2.59 | +33,610 / +9,250 | -46 / -160 | +5,514 / +2,490 | -2,212 / -1,580 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/6.9 | -1,963 |
| L round 100 | alone | 1 / 1 | 0.04 / 0.06 | 0.0/0.0 · 0.0/0.0 | 100.0 / 0.0 | - / 0.0 | +2,770 / -69 | - / - | +455 / -19 | 0 / -69 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -179 |
| L round 100 | first | 1 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.7 / 2.66 | +31,784 / +9,410 | -1,872 / +0 | +5,215 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -585 |
| L round 100 | slot | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | +0 / +0 | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -585 |
| L round 100 | second | 1 / 1 | 3.12 / 2.63 | 85.2/70.4 · 81.2/50.0 | 58.8 / 46.3 | 4.7 / 2.63 | +31,784 / +9,341 | -1,872 / -69 | +5,215 / +2,515 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -896 |
| L round 50 | alone | 3 / 1 | 0.12 / 0.06 | 0.0/0.0 · 0.0/0.0 | 66.7 / 0.0 | 12.25 / 0.0 | +2,545 / -69 | - / - | +417 / -19 | -226 / -69 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -1,682 |
| L round 50 | first | 3 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.85 / 2.66 | +32,044 / +9,410 | -1,612 / +0 | +5,257 / +2,533 | -2,212 / -1,419 | 57.1/4.2 · 52.2/0.0 | 75.9/10.2 · 51.7/0.0 | -2,545 |
| L round 50 | slot | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -1,731 |
| L round 50 | second | 3 / 1 | 3.2 / 2.63 | 85.2/74.1 · 81.2/50.0 | 58.5 / 46.3 | 4.58 / 2.63 | +31,558 / +9,341 | -2,098 / -69 | +5,177 / +2,515 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -2,163 |
| L sd15 edges | alone | 1 / 1 | 0.04 / 0.06 | 0.0/0.0 · 0.0/0.0 | 100.0 / 100.0 | - / - | +0 / +450 | - / - | +0 / +121 | 0 / 0 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +937 |
| L sd15 edges | first | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -50 |
| L sd15 edges | slot | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -2,043 |
| L sd15 edges | second | 1 / 1 | 3.16 / 2.63 | 85.2/74.1 · 81.2/43.8 | 59.3 / 48.8 | 4.92 / 2.74 | +33,657 / +9,860 | +1 / +450 | +5,522 / +2,655 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +221 |
| L sd1h edges | alone | 1 / 1 | 0.04 / 0.06 | 0.0/0.0 · 0.0/0.0 | 100.0 / 100.0 | - / - | +0 / +0 | - / - | +0 / +0 | 0 / 0 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +1,922 |
| L sd1h edges | first | 1 / 1 | 3.16 / 2.63 | 85.2/74.1 · 81.2/50.0 | 59.3 / 48.8 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,534 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +935 |
| L sd1h edges | slot | 1 / 1 | 3.16 / 2.63 | 85.2/74.1 · 81.2/50.0 | 59.3 / 48.8 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,534 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| L sd1h edges | second | 1 / 1 | 3.16 / 2.63 | 85.2/74.1 · 81.2/50.0 | 59.3 / 48.8 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,534 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +1,207 |
| L sd15 distal | alone | 1 / 0 | 0.04 / 0.0 | 0.0/0.0 · 0.0/0.0 | 100.0 / 0.0 | - / - | +0 / +0 | - / - | +0 / +0 | 0 / 0 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +1,433 |
| L sd15 distal | first | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +963 |
| L sd15 distal | slot | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -1,031 |
| L sd15 distal | second | 1 / 0 | 3.16 / 2.56 | 85.2/74.1 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +717 |
| L all (sr15+1h, rn100, sd15+1h) | alone | 5 / 6 | 0.2 / 0.38 | 0.0/0.0 · 0.0/0.0 | 60.0 / 50.0 | 10.13 / 0.97 | +2,498 / -15 | - / - | +410 / -4 | -274 / -397 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -262 |
| L all (sr15+1h, rn100, sd15+1h) | first | 5 / 4 | 3.24 / 2.82 | 85.2/77.8 · 87.5/56.2 | 59.0 / 47.7 | 4.82 / 2.49 | +31,997 / +9,013 | -1,659 / -397 | +5,249 / +2,427 | -2,212 / -1,580 | 57.1/4.2 · 47.8/0.0 | 75.9/10.2 · 44.8/6.9 | -945 |
| L all (sr15+1h, rn100, sd15+1h) | slot | 3 / 4 | 3.24 / 2.82 | 85.2/77.8 · 87.5/56.2 | 59.0 / 47.7 | 4.89 / 2.49 | +33,610 / +9,013 | -46 / -397 | +5,514 / +2,427 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -2,324 |
| L all (sr15+1h, rn100, sd15+1h) | second | 5 / 6 | 3.28 / 2.95 | 85.2/77.8 · 87.5/62.5 | 58.3 / 47.8 | 4.56 / 2.53 | +31,511 / +9,395 | -2,145 / -15 | +5,170 / +2,529 | -2,212 / -1,580 | 57.1/5.9 · 47.8/0.0 | 75.9/12.0 · 44.8/6.9 | -2,096 |
| SD 15m stop zone | alone | 13 / 10 | 0.51 / 0.64 | 7.4/0.0 · 12.5/0.0 | 76.9 / 40.0 | 1.35 / 0.88 | +481 / -106 | - / - | +79 / -28 | -769 / -400 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -3,972 |
| SD 15m stop zone | first | 6 / 6 | 3.32 / 2.88 | 85.2/74.1 · 87.5/62.5 | 58.8 / 44.4 | 3.84 / 1.94 | +27,831 / +5,982 | -5,825 / -3,428 | +4,566 / +1,611 | -2,212 / -1,373 | 48.7/5.9 · 52.2/2.9 | 67.6/12.0 · 48.3/3.4 | -6,182 |
| SD 15m stop zone | slot | 5 / 5 | 3.32 / 2.88 | 85.2/74.1 · 87.5/62.5 | 58.8 / 46.7 | 4.32 / 2.6 | +32,473 / +9,545 | -1,183 / +135 | +5,328 / +2,570 | -2,212 / -1,373 | 51.3/5.9 · 53.6/2.9 | 70.4/12.0 · 50.0/3.4 | -5,330 |
| SD 15m stop zone | second | 11 / 8 | 3.55 / 3.08 | 85.2/77.8 · 87.5/75.0 | 61.5 / 45.8 | 4.48 / 2.46 | +34,113 / +9,406 | +457 / -4 | +5,597 / +2,532 | -2,212 / -1,373 | 55.5/5.9 · 52.2/2.9 | 74.1/12.0 · 50.0/6.9 | -6,228 |
| SD 15m stop ext | alone | 12 / 10 | 0.47 / 0.64 | 3.7/0.0 · 12.5/0.0 | 83.3 / 40.0 | 3.25 / 0.78 | +2,356 / -206 | - / - | +386 / -55 | -568 / -400 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | +595 |
| SD 15m stop ext | first | 5 / 6 | 3.28 / 2.88 | 85.2/74.1 · 87.5/62.5 | 59.5 / 44.4 | 4.11 / 1.92 | +28,467 / +5,846 | -5,189 / -3,564 | +4,670 / +1,574 | -2,212 / -1,338 | 52.1/5.9 · 50.7/2.9 | 73.1/12.0 · 46.6/3.4 | -5,201 |
| SD 15m stop ext | slot | 4 / 5 | 3.28 / 2.88 | 85.2/74.1 · 87.5/62.5 | 59.5 / 46.7 | 4.62 / 2.59 | +33,108 / +9,409 | -548 / -1 | +5,432 / +2,533 | -2,212 / -1,338 | 54.6/5.9 · 52.2/2.9 | 75.9/12.0 · 48.3/3.4 | -1,937 |
| SD 15m stop ext | second | 10 / 8 | 3.52 / 3.08 | 85.2/77.8 · 87.5/75.0 | 62.2 / 45.8 | 4.93 / 2.44 | +36,035 / +9,305 | +2,379 / -105 | +5,912 / +2,505 | -2,212 / -1,360 | 57.1/5.9 · 50.7/2.9 | 75.9/12.0 · 48.3/6.9 | -3,671 |
| SD 1h stop zone | alone | 2 / 2 | 0.08 / 0.13 | 0.0/0.0 · 0.0/0.0 | 50.0 / 50.0 | 0.0 / 0.91 | -277 / -30 | - / - | -45 / -8 | -277 / -354 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -3,025 |
| SD 1h stop zone | first | 1 / 2 | 3.16 / 2.69 | 88.9/70.4 · 81.2/50.0 | 59.3 / 47.6 | 4.92 / 2.64 | +33,657 / +9,556 | +1 / +146 | +5,522 / +2,573 | -2,212 / -1,419 | 57.1/5.9 · 53.6/0.0 | 75.9/12.0 · 53.4/0.0 | -3,377 |
| SD 1h stop zone | slot | 1 / 2 | 3.16 / 2.69 | 88.9/70.4 · 81.2/50.0 | 59.3 / 47.6 | 4.92 / 2.64 | +33,657 / +9,556 | +1 / +146 | +5,522 / +2,573 | -2,212 / -1,419 | 57.1/5.9 · 53.6/0.0 | 75.9/12.0 · 53.4/0.0 | -3,282 |
| SD 1h stop zone | second | 2 / 2 | 3.2 / 2.69 | 88.9/70.4 · 81.2/50.0 | 58.5 / 47.6 | 4.87 / 2.64 | +33,565 / +9,556 | -91 / +146 | +5,507 / +2,573 | -2,212 / -1,419 | 57.1/6.7 · 53.6/0.0 | 75.9/13.0 · 53.4/0.0 | -3,559 |
| SD 1h stop ext | alone | 3 / 3 | 0.12 / 0.19 | 0.0/0.0 · 0.0/0.0 | 66.7 / 33.3 | 0.01 / 0.0 | -344 / -698 | - / - | -56 / -188 | -346 / -699 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -910 |
| SD 1h stop ext | first | 2 / 3 | 3.16 / 2.69 | 88.9/70.4 · 81.2/50.0 | 59.3 / 45.2 | 4.8 / 2.47 | +33,452 / +8,977 | -204 / -433 | +5,488 / +2,417 | -2,417 / -1,419 | 57.1/4.2 · 52.2/0.0 | 75.9/12.0 · 50.0/3.4 | -1,652 |
| SD 1h stop ext | slot | 1 / 2 | 3.16 / 2.69 | 88.9/70.4 · 81.2/50.0 | 59.3 / 47.6 | 4.92 / 2.57 | +33,657 / +9,211 | +1 / -199 | +5,522 / +2,480 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -1,556 |
| SD 1h stop ext | second | 3 / 3 | 3.24 / 2.76 | 88.9/70.4 · 81.2/50.0 | 59.0 / 46.5 | 4.73 / 2.47 | +33,312 / +8,977 | -344 / -433 | +5,465 / +2,417 | -2,558 / -1,419 | 57.1/7.6 · 52.2/1.4 | 75.9/12.0 · 50.0/5.2 | -1,445 |
| SD 15m+1h stop zone | alone | 14 / 11 | 0.55 / 0.71 | 3.7/0.0 · 18.8/0.0 | 78.6 / 36.4 | 1.84 / 0.76 | +839 / -298 | - / - | +138 / -80 | -568 / -753 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -6,610 |
| SD 15m+1h stop zone | first | 6 / 7 | 3.32 / 2.95 | 88.9/74.1 · 87.5/62.5 | 60.0 / 43.5 | 4.11 / 1.91 | +28,467 / +5,967 | -5,189 / -3,443 | +4,670 / +1,606 | -2,212 / -1,373 | 52.1/5.9 · 52.2/2.9 | 73.1/12.0 · 48.3/3.4 | -8,190 |
| SD 15m+1h stop zone | slot | 5 / 6 | 3.32 / 2.95 | 88.9/74.1 · 87.5/62.5 | 60.0 / 45.7 | 4.62 / 2.56 | +33,108 / +9,530 | -548 / +120 | +5,432 / +2,566 | -2,212 / -1,373 | 54.6/5.9 · 53.6/2.9 | 75.9/12.0 · 51.7/3.4 | -7,338 |
| SD 15m+1h stop zone | second | 12 / 9 | 3.59 / 3.14 | 88.9/77.8 · 87.5/75.0 | 62.0 / 44.9 | 4.75 / 2.42 | +34,656 / +9,391 | +1,000 / -19 | +5,686 / +2,528 | -2,212 / -1,373 | 57.1/6.7 · 52.2/2.9 | 75.9/13.0 · 51.7/6.9 | -8,771 |
| SD 15m body 2.0 | alone | 5 / 2 | 0.2 / 0.13 | 3.7/0.0 · 6.2/0.0 | 80.0 / 50.0 | 2.86 / 1.21 | +1,183 / +28 | - / - | +194 / +7 | -635 / -134 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -613 |
| SD 15m body 2.0 | first | 2 / 2 | 3.2 / 2.69 | 85.2/74.1 · 81.2/50.0 | 58.5 / 47.6 | 4.58 / 2.63 | +33,022 / +9,438 | -634 / +28 | +5,418 / +2,541 | -2,212 / -1,419 | 53.8/5.9 · 53.6/2.9 | 70.4/12.0 · 53.4/3.4 | -4,246 |
| SD 15m body 2.0 | slot | 2 / 2 | 3.2 / 2.69 | 85.2/74.1 · 81.2/50.0 | 58.5 / 47.6 | 4.58 / 2.63 | +33,022 / +9,438 | -634 / +28 | +5,418 / +2,541 | -2,212 / -1,419 | 53.8/5.9 · 53.6/2.9 | 70.4/12.0 · 53.4/3.4 | -4,121 |
| SD 15m body 2.0 | second | 5 / 2 | 3.32 / 2.69 | 85.2/74.1 · 81.2/50.0 | 60.0 / 47.6 | 4.76 / 2.63 | +34,657 / +9,438 | +1,001 / +28 | +5,686 / +2,541 | -2,212 / -1,419 | 55.5/5.9 · 53.6/2.9 | 74.1/12.0 · 53.4/3.4 | -4,191 |
| SD 15m+1h disp 0.8 | alone | 6 / 5 | 0.23 / 0.32 | 0.0/0.0 · 6.2/0.0 | 66.7 / 60.0 | 0.03 / 1.22 | -705 / +165 | - / - | -116 / +44 | -706 / -753 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +1,495 |
| SD 15m+1h disp 0.8 | first | 4 / 4 | 3.28 / 2.76 | 88.9/74.1 · 87.5/50.0 | 59.5 / 46.5 | 4.62 / 2.0 | +33,108 / +6,250 | -548 / -3,160 | +5,432 / +1,683 | -2,212 / -1,270 | 54.6/5.9 · 53.6/0.0 | 75.9/12.0 · 51.7/0.0 | -2,232 |
| SD 15m+1h disp 0.8 | slot | 4 / 3 | 3.28 / 2.76 | 88.9/74.1 · 87.5/50.0 | 59.5 / 48.8 | 4.62 / 2.68 | +33,108 / +9,813 | -548 / +403 | +5,432 / +2,642 | -2,212 / -1,270 | 54.6/5.9 · 55.1/0.0 | 75.9/12.0 · 55.2/0.0 | -1,505 |
| SD 15m+1h disp 0.8 | second | 5 / 5 | 3.32 / 2.88 | 88.9/74.1 · 87.5/56.2 | 60.0 / 48.9 | 4.62 / 2.56 | +33,109 / +9,752 | -547 / +342 | +5,432 / +2,625 | -2,212 / -1,270 | 54.6/5.9 · 53.6/0.0 | 75.9/12.0 · 55.2/0.0 | -1,910 |
| BRT sr15+1h | alone | 18 / 17 | 0.7 / 1.09 | 18.5/0.0 · 31.2/0.0 | 44.4 / 47.1 | 0.72 / 1.57 | -981 / +1,046 | - / - | -161 / +282 | -2,347 / -1,167 | 5.9/0.0 · 20.3/0.0 | 6.5/0.0 · 24.1/13.8 | -7,478 |
| BRT sr15+1h | first | 9 / 9 | 3.4 / 2.88 | 88.9/81.5 · 81.2/56.2 | 57.5 / 44.4 | 3.91 / 2.4 | +30,608 / +8,393 | -3,048 / -1,017 | +5,022 / +2,260 | -3,415 / -1,554 | 52.1/5.9 · 42.0/4.3 | 71.3/13.9 · 36.2/5.2 | -1,665 |
| BRT sr15+1h | slot | 7 / 5 | 3.4 / 2.88 | 88.9/81.5 · 81.2/56.2 | 57.5 / 44.4 | 4.14 / 2.49 | +32,047 / +9,080 | -1,609 / -330 | +5,258 / +2,445 | -2,786 / -1,441 | 54.6/5.9 · 50.7/4.3 | 75.0/13.0 · 53.4/5.2 | +2,081 |
| BRT sr15+1h | second | 18 / 14 | 3.79 / 3.4 | 88.9/81.5 · 87.5/62.5 | 56.7 / 47.2 | 3.63 / 2.35 | +29,935 / +9,003 | -3,721 / -407 | +4,911 / +2,424 | -3,307 / -1,441 | 58.0/5.9 · 47.8/4.3 | 73.1/13.0 · 46.6/6.9 | -4,500 |
| BRT sr1h | alone | 1 / 3 | 0.04 / 0.19 | 0.0/0.0 · 0.0/0.0 | 100.0 / 33.3 | - / 3.65 | +1 / +1,053 | - / - | +0 / +284 | 0 / -244 | 0.0/0.0 · 14.5/0.0 | 0.0/0.0 · 17.2/0.0 | -1,690 |
| BRT sr1h | first | 1 / 1 | 3.16 / 2.56 | 88.9/70.4 · 81.2/43.8 | 59.3 / 45.0 | 4.92 / 2.5 | +33,657 / +8,857 | +1 / -553 | +5,522 / +2,385 | -2,212 / -1,419 | 57.1/5.9 · 50.7/0.0 | 75.9/12.0 · 48.3/0.0 | -146 |
| BRT sr1h | slot | 1 / 0 | 3.16 / 2.56 | 88.9/70.4 · 81.2/43.8 | 59.3 / 47.5 | 4.92 / 2.66 | +33,657 / +9,410 | +1 / +0 | +5,522 / +2,533 | -2,212 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -1,964 |
| BRT sr1h | second | 1 / 3 | 3.16 / 2.76 | 88.9/70.4 · 87.5/43.8 | 59.3 / 46.5 | 4.92 / 2.57 | +33,657 / +9,497 | +1 / +87 | +5,522 / +2,557 | -2,212 / -1,294 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -2,205 |
| BRT sr15+1h+PDH/L | alone | 18 / 17 | 0.7 / 1.09 | 18.5/0.0 · 31.2/0.0 | 44.4 / 47.1 | 0.72 / 1.57 | -981 / +1,046 | - / - | -161 / +282 | -2,347 / -1,167 | 5.9/0.0 · 20.3/0.0 | 6.5/0.0 · 24.1/13.8 | -7,478 |
| BRT sr15+1h+PDH/L | first | 9 / 9 | 3.4 / 2.88 | 88.9/81.5 · 81.2/56.2 | 57.5 / 44.4 | 3.91 / 2.4 | +30,608 / +8,393 | -3,048 / -1,017 | +5,022 / +2,260 | -3,415 / -1,554 | 52.1/5.9 · 42.0/4.3 | 71.3/13.9 · 36.2/5.2 | -1,665 |
| BRT sr15+1h+PDH/L | slot | 7 / 5 | 3.4 / 2.88 | 88.9/81.5 · 81.2/56.2 | 57.5 / 44.4 | 4.14 / 2.49 | +32,047 / +9,080 | -1,609 / -330 | +5,258 / +2,445 | -2,786 / -1,441 | 54.6/5.9 · 50.7/4.3 | 75.0/13.0 · 53.4/5.2 | +2,081 |
| BRT sr15+1h+PDH/L | second | 18 / 14 | 3.79 / 3.4 | 88.9/81.5 · 87.5/62.5 | 56.7 / 47.2 | 3.63 / 2.35 | +29,935 / +9,003 | -3,721 / -407 | +4,911 / +2,424 | -3,307 / -1,441 | 58.0/5.9 · 47.8/4.3 | 73.1/13.0 · 46.6/6.9 | -4,500 |
| BRT sr15+1h tol 0.5 | alone | 18 / 18 | 0.7 / 1.15 | 18.5/0.0 · 37.5/0.0 | 44.4 / 50.0 | 0.72 / 1.88 | -981 / +1,614 | - / - | -161 / +435 | -2,347 / -790 | 5.9/0.0 · 20.3/0.0 | 6.5/0.0 · 24.1/8.6 | -13,974 |
| BRT sr15+1h tol 0.5 | first | 9 / 10 | 3.4 / 2.95 | 88.9/81.5 · 81.2/56.2 | 57.5 / 45.7 | 3.91 / 2.49 | +30,608 / +8,960 | -3,048 / -450 | +5,022 / +2,412 | -3,415 / -1,554 | 52.1/5.9 · 42.0/4.3 | 71.3/13.9 · 36.2/5.2 | -6,912 |
| BRT sr15+1h tol 0.5 | slot | 7 / 6 | 3.4 / 2.95 | 88.9/81.5 · 81.2/56.2 | 57.5 / 45.7 | 4.14 / 2.58 | +32,047 / +9,647 | -1,609 / +237 | +5,258 / +2,597 | -2,786 / -1,441 | 54.6/5.9 · 50.7/4.3 | 75.0/13.0 · 53.4/5.2 | -1,370 |
| BRT sr15+1h tol 0.5 | second | 18 / 15 | 3.79 / 3.46 | 88.9/81.5 · 87.5/62.5 | 56.7 / 48.1 | 3.63 / 2.44 | +29,935 / +9,571 | -3,721 / +161 | +4,911 / +2,577 | -3,307 / -1,441 | 58.0/5.9 · 47.8/4.3 | 73.1/13.0 · 50.0/6.9 | -11,838 |
| BRT sr15+1h disp 0.8 | alone | 10 / 10 | 0.39 / 0.64 | 3.7/0.0 · 6.2/0.0 | 60.0 / 30.0 | 0.42 / 1.59 | -873 / +720 | - / - | -143 / +194 | -1,196 / -652 | 0.0/0.0 · 14.5/0.0 | 0.0/0.0 · 17.2/0.0 | +3,232 |
| BRT sr15+1h disp 0.8 | first | 6 / 7 | 3.28 / 2.82 | 88.9/77.8 · 81.2/50.0 | 59.5 / 43.2 | 4.33 / 2.43 | +31,651 / +8,688 | -2,005 / -722 | +5,193 / +2,339 | -2,840 / -1,554 | 52.1/5.9 · 43.5/4.3 | 72.2/13.0 · 41.4/5.2 | +3,691 |
| BRT sr15+1h disp 0.8 | slot | 4 / 4 | 3.28 / 2.82 | 88.9/77.8 · 81.2/50.0 | 59.5 / 47.7 | 4.61 / 2.63 | +33,090 / +9,640 | -566 / +230 | +5,429 / +2,595 | -2,212 / -1,441 | 54.6/5.9 · 52.2/4.3 | 75.9/12.0 · 55.2/5.2 | +2,713 |
| BRT sr15+1h disp 0.8 | second | 10 / 9 | 3.48 / 3.08 | 88.9/77.8 · 87.5/56.2 | 59.6 / 45.8 | 4.55 / 2.6 | +33,454 / +9,879 | -202 / +469 | +5,489 / +2,660 | -2,840 / -1,441 | 56.3/5.9 · 52.2/4.3 | 75.0/12.0 · 55.2/5.2 | +2,769 |
| BRT PDH/L only | alone | 0 / 0 | 0.0 / 0.0 | 0.0/0.0 · 0.0/0.0 | 0.0 / 0.0 | - / - | +0 / +0 | - / - | +0 / +0 | 0 / 0 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | +0 |
| BRT PDH/L only | first | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | +0 / +0 | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| BRT PDH/L only | slot | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | +0 / +0 | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| BRT PDH/L only | second | 0 / 0 | 3.12 / 2.56 | 85.2/70.4 · 81.2/43.8 | 58.8 / 47.5 | 4.92 / 2.66 | +33,656 / +9,410 | +0 / +0 | +5,522 / +2,533 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -715 |
| EMA pb 5m21 | alone | 44 / 17 | 1.72 / 1.09 | 48.1/25.9 · 37.5/0.0 | 61.4 / 23.5 | 2.61 / 0.0 | +12,566 / -4,370 | - / - | +2,062 / -1,177 | -2,301 / -4,370 | 36.1/0.0 · 0.0/0.0 | 43.5/0.0 · 0.0/6.9 | -24,918 |
| EMA pb 5m21 | first | 31 / 10 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 43.5 | 3.46 / 1.38 | +30,796 / +3,131 | -2,860 / -6,279 | +5,053 / +843 | -3,844 / -2,429 | 54.6/2.5 · 49.3/0.0 | 67.6/5.6 · 44.8/10.3 | -11,152 |
| EMA pb 5m21 | slot | 13 / 6 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 45.7 | 4.38 / 2.08 | +38,224 / +7,505 | +4,568 / -1,905 | +6,271 / +2,021 | -2,962 / -2,057 | 62.2/4.2 · 50.7/4.3 | 76.9/11.1 · 48.3/19.0 | +2,383 |
| EMA pb 5m21 | second | 43 / 14 | 4.61 / 3.4 | 92.6/88.9 · 100.0/56.2 | 61.0 / 43.4 | 4.12 / 1.61 | +44,389 / +5,460 | +10,733 / -3,950 | +7,283 / +1,470 | -2,359 / -2,650 | 67.2/3.4 · 46.4/4.3 | 81.5/9.3 · 46.6/24.1 | -12,698 |
| EMA pb 5m50 | alone | 44 / 17 | 1.72 / 1.09 | 48.1/25.9 · 37.5/0.0 | 61.4 / 23.5 | 2.61 / 0.0 | +12,566 / -4,370 | - / - | +2,062 / -1,177 | -2,301 / -4,370 | 36.1/0.0 · 0.0/0.0 | 43.5/0.0 · 0.0/6.9 | -21,887 |
| EMA pb 5m50 | first | 31 / 10 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 43.5 | 3.46 / 1.38 | +30,796 / +3,131 | -2,860 / -6,279 | +5,053 / +843 | -3,844 / -2,429 | 54.6/2.5 · 49.3/0.0 | 67.6/5.6 · 44.8/10.3 | -9,358 |
| EMA pb 5m50 | slot | 13 / 6 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 45.7 | 4.38 / 2.08 | +38,224 / +7,505 | +4,568 / -1,905 | +6,271 / +2,021 | -2,962 / -2,057 | 62.2/4.2 · 50.7/4.3 | 76.9/11.1 · 48.3/19.0 | +1,451 |
| EMA pb 5m50 | second | 43 / 14 | 4.61 / 3.4 | 92.6/88.9 · 100.0/56.2 | 61.0 / 43.4 | 4.12 / 1.61 | +44,389 / +5,460 | +10,733 / -3,950 | +7,283 / +1,470 | -2,359 / -2,650 | 67.2/3.4 · 46.4/4.3 | 81.5/9.3 · 46.6/24.1 | -11,210 |
| EMA pb 15m21 | alone | 41 / 16 | 1.6 / 1.03 | 44.4/25.9 · 37.5/0.0 | 61.0 / 25.0 | 2.66 / 0.0 | +12,702 / -4,167 | - / - | +2,084 / -1,122 | -2,301 / -4,167 | 36.1/0.0 · 0.0/0.0 | 43.5/0.0 · 0.0/6.9 | -24,764 |
| EMA pb 15m21 | first | 28 / 9 | 3.55 / 2.88 | 92.6/77.8 · 93.8/43.8 | 58.2 / 44.4 | 3.67 / 1.42 | +33,048 / +3,334 | -608 / -6,076 | +5,422 / +898 | -2,488 / -2,429 | 58.0/2.5 · 49.3/0.0 | 68.5/3.7 · 48.3/10.3 | -11,660 |
| EMA pb 15m21 | slot | 11 / 5 | 3.55 / 2.88 | 92.6/77.8 · 93.8/43.8 | 58.2 / 46.7 | 4.43 / 2.14 | +38,361 / +7,708 | +4,705 / -1,702 | +6,294 / +2,075 | -2,962 / -2,057 | 64.7/4.2 · 50.7/4.3 | 76.9/11.1 · 51.7/15.5 | -412 |
| EMA pb 15m21 | second | 40 / 13 | 4.53 / 3.33 | 92.6/85.2 · 93.8/56.2 | 61.2 / 44.2 | 4.31 / 1.64 | +46,641 / +5,664 | +12,985 / -3,746 | +7,652 / +1,525 | -2,224 / -2,650 | 71.4/3.4 · 46.4/4.3 | 82.4/7.4 · 46.6/24.1 | -13,803 |
| EMA pb 5m21 strong | alone | 43 / 15 | 1.68 / 0.96 | 44.4/25.9 · 25.0/0.0 | 60.5 / 26.7 | 2.61 / 0.0 | +12,565 / -3,208 | - / - | +2,061 / -864 | -2,301 / -3,208 | 36.1/0.0 · 0.0/0.0 | 43.5/0.0 · 0.0/0.0 | -32,389 |
| EMA pb 5m21 strong | first | 30 / 9 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 43.5 | 3.53 / 1.45 | +31,728 / +3,503 | -1,928 / -5,907 | +5,205 / +943 | -3,844 / -2,115 | 54.6/2.5 · 49.3/4.3 | 67.6/5.6 · 44.8/15.5 | -18,277 |
| EMA pb 5m21 strong | slot | 13 / 6 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 45.7 | 4.38 / 2.08 | +38,224 / +7,505 | +4,568 / -1,905 | +6,271 / +2,021 | -2,962 / -2,057 | 62.2/4.2 · 50.7/4.3 | 76.9/11.1 · 48.3/19.0 | -3,056 |
| EMA pb 5m21 strong | second | 42 / 12 | 4.57 / 3.27 | 92.6/88.9 · 100.0/56.2 | 60.7 / 45.1 | 4.12 / 1.79 | +44,388 / +6,401 | +10,732 / -3,009 | +7,282 / +1,723 | -2,359 / -2,379 | 67.2/3.4 · 49.3/4.3 | 81.5/9.3 · 46.6/22.4 | -20,393 |
| EMA pb 5m50 strong | alone | 43 / 15 | 1.68 / 0.96 | 44.4/25.9 · 25.0/0.0 | 60.5 / 26.7 | 2.61 / 0.0 | +12,565 / -3,208 | - / - | +2,061 / -864 | -2,301 / -3,208 | 36.1/0.0 · 0.0/0.0 | 43.5/0.0 · 0.0/0.0 | -29,359 |
| EMA pb 5m50 strong | first | 30 / 9 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 43.5 | 3.53 / 1.45 | +31,728 / +3,503 | -1,928 / -5,907 | +5,205 / +943 | -3,844 / -2,115 | 54.6/2.5 · 49.3/4.3 | 67.6/5.6 · 44.8/15.5 | -16,483 |
| EMA pb 5m50 strong | slot | 13 / 6 | 3.63 / 2.95 | 92.6/85.2 · 100.0/43.8 | 58.1 / 45.7 | 4.38 / 2.08 | +38,224 / +7,505 | +4,568 / -1,905 | +6,271 / +2,021 | -2,962 / -2,057 | 62.2/4.2 · 50.7/4.3 | 76.9/11.1 · 48.3/19.0 | -3,988 |
| EMA pb 5m50 strong | second | 42 / 12 | 4.57 / 3.27 | 92.6/88.9 · 100.0/56.2 | 60.7 / 45.1 | 4.12 / 1.79 | +44,388 / +6,401 | +10,732 / -3,009 | +7,282 / +1,723 | -2,359 / -2,379 | 67.2/3.4 · 49.3/4.3 | 81.5/9.3 · 46.6/22.4 | -18,905 |
| EMA pb 5m21 disp 0.8 | alone | 23 / 4 | 0.9 / 0.26 | 22.2/3.7 · 0.0/0.0 | 52.2 / 75.0 | 0.69 / 6.26 | -1,452 / +620 | - / - | -238 / +167 | -3,083 / -118 | 9.2/0.0 · 0.0/0.0 | 10.2/0.0 · 0.0/0.0 | -21,699 |
| EMA pb 5m21 disp 0.8 | first | 17 / 3 | 3.36 / 2.69 | 88.9/77.8 · 81.2/43.8 | 57.0 / 50.0 | 3.43 / 2.83 | +27,710 / +10,219 | -5,946 / +809 | +4,546 / +2,751 | -4,096 / -1,419 | 44.5/7.6 · 52.2/0.0 | 60.2/23.1 · 53.4/0.0 | -15,147 |
| EMA pb 5m21 disp 0.8 | slot | 6 / 2 | 3.36 / 2.69 | 88.9/77.8 · 81.2/43.8 | 57.0 / 50.0 | 4.19 / 2.79 | +32,166 / +10,147 | -1,490 / +737 | +5,277 / +2,732 | -2,388 / -1,419 | 49.6/5.9 · 52.2/0.0 | 71.3/12.0 · 53.4/0.0 | -7,400 |
| EMA pb 5m21 disp 0.8 | second | 22 / 4 | 3.87 / 2.76 | 88.9/81.5 · 81.2/43.8 | 58.6 / 51.2 | 3.6 / 2.83 | +31,474 / +10,219 | -2,182 / +809 | +5,164 / +2,751 | -3,084 / -1,419 | 47.1/10.9 · 52.2/0.0 | 63.9/20.4 · 53.4/0.0 | -18,446 |
| MACD 5m for any filter | alone | 34 / 26 | 1.33 / 1.67 | 33.3/11.1 · 43.8/31.2 | 41.2 / 34.6 | 1.55 / 0.5 | +3,803 / -3,097 | - / - | +624 / -834 | -5,438 / -3,097 | 16.8/0.0 · 14.5/10.1 | 19.4/0.0 · 17.2/10.3 | -5,892 |
| MACD 5m for any filter | first | 17 / 22 | 3.52 / 3.65 | 88.9/74.1 · 100.0/81.2 | 56.7 / 40.4 | 4.21 / 1.68 | +35,441 / +6,629 | +1,785 / -2,781 | +5,815 / +1,785 | -1,858 / -2,876 | 60.5/4.2 · 50.7/10.1 | 79.6/5.6 · 46.6/32.8 | -11,722 |
| MACD 5m for any filter | slot | 10 / 17 | 3.52 / 3.65 | 88.9/74.1 · 100.0/81.2 | 55.6 / 43.9 | 3.69 / 1.93 | +30,621 / +8,069 | -3,035 / -1,341 | +5,024 / +2,172 | -2,582 / -2,681 | 55.5/5.9 · 52.2/7.2 | 75.0/13.0 · 50.0/29.3 | -2,124 |
| MACD 5m for any filter | second | 35 / 24 | 4.38 / 4.1 | 88.9/81.5 · 100.0/81.2 | 53.6 / 40.6 | 3.33 / 1.69 | +33,090 / +6,993 | -566 / -2,417 | +5,429 / +1,883 | -2,356 / -3,004 | 61.3/4.2 · 46.4/20.3 | 74.1/6.5 · 41.4/43.1 | -9,414 |
| MACD 5m for inducement | alone | 8 / 8 | 0.31 / 0.51 | 0.0/0.0 · 12.5/0.0 | 37.5 / 12.5 | 0.11 / 0.72 | -2,012 / -832 | - / - | -330 / -224 | -2,250 / -2,433 | 0.0/0.0 · 14.5/0.0 | 0.0/0.0 · 17.2/0.0 | -3,648 |
| MACD 5m for inducement | first | 5 / 7 | 3.24 / 2.88 | 85.2/74.1 · 93.8/43.8 | 59.0 / 42.2 | 4.62 / 2.42 | +33,290 / +10,079 | -366 / +669 | +5,462 / +2,714 | -2,213 / -1,939 | 55.5/5.9 · 55.1/4.3 | 75.0/12.0 · 53.4/22.4 | -3,143 |
| MACD 5m for inducement | slot | 3 / 5 | 3.24 / 2.88 | 85.2/74.1 · 93.8/43.8 | 59.0 / 44.4 | 4.72 / 2.62 | +33,485 / +10,642 | -171 / +1,232 | +5,494 / +2,865 | -2,213 / -1,939 | 55.5/5.9 · 55.1/4.3 | 75.9/12.0 · 55.2/19.0 | -2,275 |
| MACD 5m for inducement | second | 8 / 8 | 3.4 / 3.08 | 85.2/74.1 · 93.8/43.8 | 57.5 / 41.7 | 4.28 / 2.09 | +32,550 / +8,659 | -1,106 / -751 | +5,340 / +2,331 | -2,911 / -2,074 | 55.5/5.9 · 55.1/7.2 | 74.1/12.0 · 53.4/22.4 | -4,895 |
| MACD 5m for depth | alone | 1 / 1 | 0.04 / 0.06 | 0.0/0.0 · 0.0/0.0 | 100.0 / 0.0 | - / 0.0 | +216 / -140 | - / - | +35 / -38 | 0 / -140 | 0.0/0.0 · 0.0/0.0 | 0.0/0.0 · 0.0/0.0 | -229 |
| MACD 5m for depth | first | 0 / 1 | 3.12 / 2.63 | 85.2/70.4 · 81.2/50.0 | 58.8 / 46.3 | 4.92 / 2.6 | +33,656 / +9,270 | +0 / -140 | +5,522 / +2,496 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 50.0/3.4 | -1,560 |
| MACD 5m for depth | slot | 0 / 1 | 3.12 / 2.63 | 85.2/70.4 · 81.2/50.0 | 58.8 / 46.3 | 4.92 / 2.6 | +33,656 / +9,270 | +0 / -140 | +5,522 / +2,496 | -2,213 / -1,419 | 57.1/5.9 · 52.2/0.0 | 75.9/12.0 · 50.0/3.4 | +108 |
| MACD 5m for depth | second | 1 / 1 | 3.16 / 2.63 | 85.2/70.4 · 81.2/50.0 | 59.3 / 46.3 | 4.94 / 2.6 | +33,872 / +9,270 | +216 / -140 | +5,557 / +2,496 | -2,213 / -1,419 | 57.1/3.4 · 52.2/0.0 | 75.9/9.3 · 50.0/3.4 | -2,694 |
| MACD 5m for displacement | alone | 18 / 13 | 0.7 / 0.83 | 14.8/0.0 · 18.8/0.0 | 38.9 / 38.5 | 3.44 / 0.09 | +7,203 / -3,870 | - / - | +1,182 / -1,042 | -2,253 / -3,870 | 16.8/0.0 · 0.0/0.0 | 29.6/0.0 · 0.0/1.7 | -15,548 |
| MACD 5m for displacement | first | 6 / 10 | 3.28 / 3.01 | 85.2/70.4 · 93.8/56.2 | 58.3 / 44.7 | 5.17 / 1.66 | +37,667 / +5,648 | +4,011 / -3,762 | +6,180 / +1,521 | -1,858 / -2,357 | 62.2/4.2 · 46.4/4.3 | 81.5/4.6 · 44.8/12.1 | -22,415 |
| MACD 5m for displacement | slot | 4 / 7 | 3.28 / 3.01 | 85.2/70.4 · 93.8/56.2 | 57.1 / 46.8 | 4.35 / 1.82 | +32,187 / +6,525 | -1,469 / -2,885 | +5,281 / +1,757 | -2,232 / -2,308 | 57.1/6.7 · 47.8/4.3 | 75.9/12.0 · 46.6/8.6 | -16,639 |
| MACD 5m for displacement | second | 18 / 11 | 3.79 / 3.27 | 85.2/81.5 · 93.8/56.2 | 55.7 / 43.1 | 4.47 / 1.63 | +37,823 / +5,596 | +4,167 / -3,814 | +6,205 / +1,507 | -2,189 / -2,485 | 68.1/4.2 · 43.5/10.1 | 78.7/4.6 · 43.1/32.8 | -18,435 |
| MACD 15m for any filter | alone | 17 / 9 | 0.66 / 0.58 | 7.4/0.0 · 6.2/0.0 | 35.3 / 22.2 | 1.53 / 0.54 | +1,808 / -1,283 | - / - | +297 / -346 | -1,406 / -1,811 | 20.2/0.0 · 14.5/0.0 | 22.2/0.0 · 17.2/0.0 | -5,346 |
| MACD 15m for any filter | first | 6 / 7 | 3.28 / 2.95 | 88.9/74.1 · 93.8/56.2 | 57.1 / 41.3 | 4.31 / 1.96 | +33,276 / +7,407 | -380 / -2,003 | +5,459 / +1,994 | -2,213 / -2,673 | 55.5/5.9 · 50.7/10.1 | 76.9/12.0 · 46.6/27.6 | -11,244 |
| MACD 15m for any filter | slot | 4 / 6 | 3.28 / 2.95 | 88.9/74.1 · 93.8/56.2 | 57.1 / 43.5 | 4.13 / 2.02 | +31,687 / +7,641 | -1,969 / -1,769 | +5,199 / +2,057 | -2,213 / -2,673 | 55.5/5.9 · 50.7/10.1 | 75.9/12.0 · 48.3/27.6 | -1,668 |
| MACD 15m for any filter | second | 17 / 9 | 3.75 / 3.14 | 88.9/81.5 · 93.8/56.2 | 55.2 / 42.9 | 3.96 / 1.9 | +34,481 / +7,412 | +825 / -1,998 | +5,657 / +1,995 | -2,715 / -2,190 | 59.7/3.4 · 47.8/4.3 | 77.8/11.1 · 44.8/6.9 | -9,842 |
| MACD 15m for inducement | alone | 7 / 3 | 0.27 / 0.19 | 0.0/0.0 · 0.0/0.0 | 42.9 / 33.3 | 3.58 / 3.51 | +2,334 / +1,036 | - / - | +383 / +279 | -768 / -234 | 8.4/0.0 · 14.5/0.0 | 9.3/0.0 · 17.2/0.0 | +1,675 |
| MACD 15m for inducement | first | 4 / 2 | 3.24 / 2.63 | 88.9/74.1 · 81.2/50.0 | 57.8 / 43.9 | 4.71 / 2.48 | +34,506 / +8,996 | +850 / -414 | +5,661 / +2,422 | -2,213 / -1,419 | 55.5/5.9 · 52.2/0.0 | 76.9/12.0 · 51.7/0.0 | -2,168 |
| MACD 15m for inducement | slot | 3 / 1 | 3.24 / 2.63 | 88.9/74.1 · 81.2/50.0 | 57.8 / 46.3 | 4.55 / 2.58 | +32,970 / +9,230 | -686 / -180 | +5,409 / +2,485 | -2,213 / -1,419 | 55.5/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | +21 |
| MACD 15m for inducement | second | 7 / 3 | 3.4 / 2.76 | 88.9/74.1 · 81.2/50.0 | 57.5 / 46.5 | 4.79 / 2.56 | +35,990 / +9,480 | +2,334 / +70 | +5,905 / +2,552 | -2,332 / -1,239 | 57.1/3.4 · 52.2/0.0 | 78.7/11.1 · 51.7/0.0 | -1,234 |
| MACD 5m any, depth>=0.25 disp>=0.5 | alone | 28 / 19 | 1.09 / 1.22 | 33.3/3.7 · 37.5/18.8 | 35.7 / 36.8 | 1.23 / 0.54 | +1,249 / -2,314 | - / - | +205 / -623 | -4,748 / -3,020 | 8.4/0.0 · 14.5/8.7 | 19.4/0.0 · 17.2/24.1 | -6,972 |
| MACD 5m any, depth>=0.25 disp>=0.5 | first | 13 / 16 | 3.44 / 3.33 | 88.9/74.1 · 93.8/62.5 | 58.0 / 42.3 | 4.7 / 1.88 | +36,947 / +7,675 | +3,291 / -1,735 | +6,062 / +2,066 | -1,858 / -2,553 | 60.5/4.2 · 50.7/7.2 | 79.6/5.6 · 48.3/25.9 | -6,602 |
| MACD 5m any, depth>=0.25 disp>=0.5 | slot | 8 / 12 | 3.44 / 3.33 | 88.9/74.1 · 93.8/62.5 | 56.8 / 46.2 | 4.06 / 2.11 | +31,661 / +8,815 | -1,995 / -595 | +5,194 / +2,373 | -2,582 / -2,181 | 55.5/5.9 · 52.2/4.3 | 75.0/13.0 · 50.0/22.4 | -1,886 |
| MACD 5m any, depth>=0.25 disp>=0.5 | second | 29 / 17 | 4.14 / 3.65 | 88.9/77.8 · 93.8/62.5 | 52.8 / 42.1 | 3.75 / 1.79 | +35,579 / +7,425 | +1,923 / -1,985 | +5,837 / +1,999 | -2,357 / -2,491 | 61.3/4.2 · 47.8/17.4 | 76.9/5.6 · 41.4/37.9 | -8,947 |
| N SD 15m stop ext body 1.75 | alone | 5 / 4 | 0.2 / 0.26 | 0.0/0.0 · 6.2/0.0 | 100.0 / 50.0 | - / 1.83 | +3,379 / +204 | - / - | +554 / +55 | 0 / -246 | 8.4/0.0 · 0.0/0.0 | 19.4/0.0 · 0.0/0.0 | +110 |
| N SD 15m stop ext body 1.75 | first | 1 / 3 | 3.16 / 2.76 | 85.2/74.1 · 81.2/56.2 | 59.3 / 46.5 | 4.92 / 2.55 | +33,657 / +9,164 | +1 / -246 | +5,522 / +2,467 | -2,212 / -1,419 | 57.1/5.9 · 50.7/2.9 | 75.9/12.0 · 48.3/3.4 | -4,452 |
| N SD 15m stop ext body 1.75 | slot | 1 / 3 | 3.16 / 2.76 | 85.2/74.1 · 81.2/56.2 | 59.3 / 46.5 | 4.92 / 2.55 | +33,657 / +9,164 | +1 / -246 | +5,522 / +2,467 | -2,212 / -1,419 | 57.1/5.9 · 50.7/2.9 | 75.9/12.0 · 48.3/3.4 | -2,208 |
| N SD 15m stop ext body 1.75 | second | 5 / 4 | 3.32 / 2.82 | 85.2/74.1 · 81.2/56.2 | 61.2 / 47.7 | 5.26 / 2.63 | +36,580 / +9,614 | +2,924 / +204 | +6,001 / +2,588 | -2,212 / -1,419 | 57.1/5.9 · 50.7/2.9 | 76.9/12.0 · 48.3/3.4 | -4,306 |
| N SD 15m stop ext body 2.0 | alone | 4 / 2 | 0.16 / 0.13 | 0.0/0.0 · 6.2/0.0 | 100.0 / 50.0 | - / 0.0 | +3,379 / -99 | - / - | +554 / -27 | 0 / -100 | 8.4/0.0 · 0.0/0.0 | 19.4/0.0 · 0.0/0.0 | +2,753 |
| N SD 15m stop ext body 2.0 | first | 1 / 2 | 3.16 / 2.69 | 85.2/74.1 · 81.2/50.0 | 59.3 / 47.6 | 4.92 / 2.62 | +33,657 / +9,311 | +1 / -99 | +5,522 / +2,507 | -2,212 / -1,419 | 57.1/5.9 · 52.2/2.9 | 75.9/12.0 · 51.7/3.4 | -1,302 |
| N SD 15m stop ext body 2.0 | slot | 1 / 2 | 3.16 / 2.69 | 85.2/74.1 · 81.2/50.0 | 59.3 / 47.6 | 4.92 / 2.62 | +33,657 / +9,311 | +1 / -99 | +5,522 / +2,507 | -2,212 / -1,419 | 57.1/5.9 · 52.2/2.9 | 75.9/12.0 · 51.7/3.4 | -1,179 |
| N SD 15m stop ext body 2.0 | second | 4 / 2 | 3.28 / 2.69 | 85.2/74.1 · 81.2/50.0 | 60.7 / 47.6 | 5.26 / 2.62 | +36,580 / +9,311 | +2,924 / -99 | +6,001 / +2,507 | -2,212 / -1,419 | 57.1/5.9 · 52.2/2.9 | 76.9/12.0 · 51.7/3.4 | -667 |
| N SD 15m stop ext through 0.25 | alone | 9 / 10 | 0.35 / 0.64 | 0.0/0.0 · 12.5/0.0 | 77.8 / 40.0 | 3.23 / 0.78 | +2,333 / -206 | - / - | +383 / -55 | -568 / -400 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | +2,485 |
| N SD 15m stop ext through 0.25 | first | 3 / 6 | 3.24 / 2.88 | 85.2/74.1 · 87.5/62.5 | 59.0 / 44.4 | 4.61 / 1.92 | +33,090 / +5,846 | -566 / -3,564 | +5,429 / +1,574 | -2,212 / -1,338 | 54.6/5.9 · 50.7/2.9 | 75.9/12.0 · 46.6/3.4 | -3,192 |
| N SD 15m stop ext through 0.25 | slot | 3 / 5 | 3.24 / 2.88 | 85.2/74.1 · 87.5/62.5 | 59.0 / 46.7 | 4.61 / 2.59 | +33,090 / +9,409 | -566 / -1 | +5,429 / +2,533 | -2,212 / -1,338 | 54.6/5.9 · 52.2/2.9 | 75.9/12.0 · 48.3/3.4 | +72 |
| N SD 15m stop ext through 0.25 | second | 7 / 8 | 3.4 / 3.08 | 85.2/74.1 · 87.5/75.0 | 60.9 / 45.8 | 4.93 / 2.44 | +36,013 / +9,305 | +2,357 / -105 | +5,908 / +2,505 | -2,212 / -1,360 | 57.1/5.9 · 50.7/2.9 | 75.9/12.0 · 48.3/6.9 | -1,608 |
| N SD 15m stop ext age 1 day | alone | 11 / 9 | 0.43 / 0.58 | 3.7/0.0 · 12.5/0.0 | 81.8 / 33.3 | 3.25 / 0.77 | +2,355 / -206 | - / - | +386 / -56 | -568 / -400 | 8.4/0.0 · 0.0/0.0 | 9.3/0.0 · 0.0/0.0 | -971 |
| N SD 15m stop ext age 1 day | first | 4 / 6 | 3.24 / 2.88 | 85.2/70.4 · 87.5/62.5 | 59.0 / 44.4 | 4.11 / 1.92 | +28,466 / +5,846 | -5,190 / -3,564 | +4,670 / +1,574 | -2,213 / -1,338 | 52.1/5.9 · 50.7/2.9 | 73.1/12.0 · 46.6/3.4 | -5,823 |
| N SD 15m stop ext age 1 day | slot | 3 / 5 | 3.24 / 2.88 | 85.2/70.4 · 87.5/62.5 | 59.0 / 46.7 | 4.62 / 2.59 | +33,108 / +9,409 | -548 / -1 | +5,432 / +2,533 | -2,213 / -1,338 | 54.6/5.9 · 52.2/2.9 | 75.9/12.0 · 48.3/3.4 | -2,559 |
| N SD 15m stop ext age 1 day | second | 9 / 8 | 3.48 / 3.08 | 85.2/74.1 · 87.5/75.0 | 61.8 / 45.8 | 4.93 / 2.44 | +36,035 / +9,305 | +2,379 / -105 | +5,912 / +2,505 | -2,213 / -1,360 | 57.1/5.9 · 50.7/2.9 | 75.9/12.0 · 48.3/6.9 | -5,186 |
| N MACD 15m inducement look 72 | alone | 6 / 4 | 0.23 / 0.26 | 0.0/0.0 · 0.0/0.0 | 33.3 / 25.0 | 1.88 / 1.88 | +797 / +677 | - / - | +131 / +182 | -887 / -539 | 0.0/0.0 · 14.5/0.0 | 0.0/0.0 · 17.2/0.0 | +664 |
| N MACD 15m inducement look 72 | first | 3 / 3 | 3.24 / 2.69 | 88.9/74.1 · 87.5/50.0 | 57.8 / 42.9 | 4.55 / 2.34 | +32,970 / +8,637 | -686 / -773 | +5,409 / +2,325 | -2,213 / -1,779 | 55.5/5.9 · 52.2/2.9 | 75.9/12.0 · 51.7/17.2 | -843 |
| N MACD 15m inducement look 72 | slot | 3 / 2 | 3.24 / 2.69 | 88.9/74.1 · 87.5/50.0 | 57.8 / 45.2 | 4.55 / 2.43 | +32,970 / +8,871 | -686 / -539 | +5,409 / +2,388 | -2,213 / -1,779 | 55.5/5.9 · 52.2/2.9 | 75.9/12.0 · 51.7/17.2 | +748 |
| N MACD 15m inducement look 72 | second | 6 / 4 | 3.36 / 2.82 | 88.9/74.1 · 87.5/50.0 | 57.0 / 45.5 | 4.63 / 2.42 | +34,454 / +9,120 | +798 / -290 | +5,653 / +2,455 | -2,332 / -1,501 | 57.1/3.4 · 52.2/0.0 | 77.8/11.1 · 51.7/0.0 | -772 |
| N MACD 15m inducement look 36 | alone | 5 / 4 | 0.2 / 0.26 | 0.0/0.0 · 0.0/0.0 | 60.0 / 25.0 | 4.6 / 1.64 | +2,535 / +565 | - / - | +416 / +152 | -705 / -706 | 8.4/0.0 · 14.5/0.0 | 9.3/0.0 · 17.2/0.0 | -3,935 |
| N MACD 15m inducement look 36 | first | 4 / 3 | 3.24 / 2.69 | 88.9/74.1 · 81.2/50.0 | 57.8 / 42.9 | 4.71 / 2.4 | +34,506 / +8,794 | +850 / -616 | +5,661 / +2,368 | -2,213 / -1,441 | 55.5/5.9 · 50.7/4.3 | 76.9/12.0 · 50.0/5.2 | -6,075 |
| N MACD 15m inducement look 36 | slot | 3 / 2 | 3.24 / 2.69 | 88.9/74.1 · 81.2/50.0 | 57.8 / 45.2 | 4.55 / 2.49 | +32,970 / +9,028 | -686 / -382 | +5,409 / +2,431 | -2,213 / -1,441 | 55.5/5.9 · 50.7/4.3 | 75.9/12.0 · 51.7/5.2 | -3,069 |
| N MACD 15m inducement look 36 | second | 5 / 4 | 3.32 / 2.82 | 88.9/74.1 · 81.2/50.0 | 58.8 / 45.5 | 4.89 / 2.48 | +36,191 / +9,278 | +2,535 / -132 | +5,938 / +2,498 | -2,213 / -1,441 | 57.1/3.4 · 50.7/4.3 | 79.6/9.3 · 50.0/5.2 | -6,031 |
| N MACD 15m inducement or depth | alone | 9 / 3 | 0.35 / 0.19 | 3.7/0.0 · 0.0/0.0 | 44.4 / 33.3 | 2.84 / 3.51 | +2,241 / +1,036 | - / - | +368 / +279 | -1,077 / -234 | 14.3/0.0 · 14.5/0.0 | 15.7/0.0 · 17.2/0.0 | -102 |
| N MACD 15m inducement or depth | first | 5 / 2 | 3.24 / 2.63 | 88.9/74.1 · 81.2/50.0 | 57.8 / 43.9 | 4.74 / 2.48 | +34,559 / +8,996 | +903 / -414 | +5,670 / +2,422 | -2,213 / -1,419 | 55.5/5.9 · 52.2/0.0 | 76.9/12.0 · 51.7/0.0 | -2,096 |
| N MACD 15m inducement or depth | slot | 3 / 1 | 3.24 / 2.63 | 88.9/74.1 · 81.2/50.0 | 57.8 / 46.3 | 4.55 / 2.58 | +32,970 / +9,230 | -686 / -180 | +5,409 / +2,485 | -2,213 / -1,419 | 55.5/5.9 · 52.2/0.0 | 75.9/12.0 · 51.7/0.0 | -460 |
| N MACD 15m inducement or depth | second | 9 / 3 | 3.44 / 2.76 | 88.9/74.1 · 81.2/50.0 | 58.0 / 46.5 | 4.84 / 2.56 | +36,259 / +9,480 | +2,603 / +70 | +5,949 / +2,552 | -2,332 / -1,239 | 57.1/3.4 · 52.2/0.0 | 78.7/11.1 · 51.7/0.0 | -2,888 |
| N MACD 5m+15m inducement | alone | 13 / 10 | 0.51 / 0.64 | 0.0/0.0 · 12.5/0.0 | 38.5 / 20.0 | 1.26 / 1.14 | +713 / +438 | - / - | +117 / +118 | -1,728 / -2,433 | 8.4/0.0 · 23.2/0.0 | 15.7/0.0 · 36.2/0.0 | -221 |
| N MACD 5m+15m inducement | first | 7 / 8 | 3.28 / 2.95 | 88.9/74.1 · 93.8/50.0 | 58.3 / 41.3 | 4.64 / 2.36 | +34,531 / +9,899 | +875 / +489 | +5,665 / +2,665 | -2,213 / -1,939 | 55.5/5.9 · 55.1/4.3 | 75.9/12.0 · 53.4/22.4 | -2,147 |
| N MACD 5m+15m inducement | slot | 4 / 6 | 3.28 / 2.95 | 88.9/74.1 · 93.8/50.0 | 58.3 / 43.5 | 4.57 / 2.55 | +33,190 / +10,462 | -466 / +1,052 | +5,445 / +2,817 | -2,213 / -1,939 | 55.5/5.9 · 55.1/4.3 | 75.9/12.0 · 55.2/19.0 | +435 |
| N MACD 5m+15m inducement | second | 13 / 10 | 3.59 / 3.21 | 88.9/74.1 · 93.8/50.0 | 56.5 / 42.0 | 4.38 / 2.11 | +35,274 / +8,962 | +1,618 / -448 | +5,787 / +2,413 | -3,031 / -2,074 | 57.1/3.4 · 58.0/7.2 | 77.8/11.1 · 53.4/8.6 | -2,193 |
| N combo SD 15m ext + MACD 15m inducement | alone | 18 / 13 | 0.7 / 0.83 | 14.8/0.0 · 18.8/0.0 | 66.7 / 38.5 | 3.39 / 1.63 | +4,671 / +831 | - / - | +766 / +224 | -1,244 / -633 | 16.8/0.0 · 14.5/0.0 | 25.0/0.0 · 17.2/0.0 | +1,665 |
| N combo SD 15m ext + MACD 15m inducement | first | 8 / 8 | 3.36 / 2.95 | 88.9/77.8 · 87.5/68.8 | 58.1 / 41.3 | 3.97 / 1.81 | +29,298 / +5,433 | -4,358 / -3,977 | +4,807 / +1,463 | -2,212 / -1,338 | 51.3/5.9 · 50.7/2.9 | 73.1/12.0 · 44.8/3.4 | -6,657 |
| N combo SD 15m ext + MACD 15m inducement | slot | 6 / 6 | 3.36 / 2.95 | 88.9/77.8 · 87.5/68.8 | 58.1 / 45.7 | 4.29 / 2.51 | +32,403 / +9,230 | -1,253 / -180 | +5,316 / +2,485 | -2,212 / -1,338 | 52.9/5.9 · 52.2/2.9 | 75.9/12.0 · 48.3/3.4 | -1,201 |
| N combo SD 15m ext + MACD 15m inducement | second | 16 / 11 | 3.75 / 3.27 | 88.9/77.8 · 87.5/81.2 | 60.4 / 45.1 | 4.81 / 2.36 | +38,350 / +9,375 | +4,694 / -35 | +6,292 / +2,524 | -2,332 / -1,360 | 57.1/3.4 · 50.7/2.9 | 78.7/11.1 · 51.7/6.9 | -4,964 |
| N combo SD 15m body 2.0 + MACD 15m inducement | alone | 12 / 5 | 0.47 / 0.32 | 3.7/0.0 · 6.2/0.0 | 58.3 / 40.0 | 3.28 / 2.94 | +3,517 / +1,064 | - / - | +577 / +286 | -773 / -368 | 16.8/0.0 · 14.5/0.0 | 25.0/0.0 · 17.2/0.0 | +1,060 |
| N combo SD 15m body 2.0 + MACD 15m inducement | first | 6 / 4 | 3.32 / 2.76 | 88.9/77.8 · 81.2/56.2 | 57.6 / 44.2 | 4.41 / 2.45 | +33,872 / +9,024 | +216 / -386 | +5,557 / +2,430 | -2,212 / -1,419 | 52.1/5.9 · 53.6/2.9 | 71.3/12.0 · 53.4/3.4 | -5,700 |
| N combo SD 15m body 2.0 + MACD 15m inducement | slot | 5 / 3 | 3.32 / 2.76 | 88.9/77.8 · 81.2/56.2 | 57.6 / 46.5 | 4.26 / 2.55 | +32,336 / +9,258 | -1,320 / -152 | +5,305 / +2,493 | -2,212 / -1,419 | 52.1/5.9 · 53.6/2.9 | 70.4/12.0 · 53.4/3.4 | -3,385 |
| N combo SD 15m body 2.0 + MACD 15m inducement | second | 12 / 5 | 3.59 / 2.88 | 88.9/77.8 · 81.2/56.2 | 58.7 / 46.7 | 4.65 / 2.53 | +36,991 / +9,508 | +3,335 / +98 | +6,069 / +2,560 | -2,332 / -1,373 | 55.5/3.4 · 53.6/2.9 | 76.9/11.1 · 53.4/3.4 | -4,710 |
