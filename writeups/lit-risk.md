# LIT stops, targets and trade management

**Question.** lit_A's entry stays fixed: the same candidates and filter, so the same setups, retest limit and 12-bar wait.
Which stop, target and management rules make LIT pay in 2026?

**Method.**
- Code: `tools/lit_risk.py`. It wraps `engine/lit.py` without editing it.
- Its executor (`rk_run` / `rk_simulate`) is a superset of `lit.run` / `lit.simulate`. With default options it reproduces lit_A
  trade for trade: 1,000 of 1,000 identical (`python tools/lit_risk.py check`).
- Data: CME NQ1! 5m. In 2026 the `exec 1m` variants walk the fill, stop, target and breakeven on true 1m bars
  (`data/NQ_1m.csv`) on every day with full 1m coverage. 2021-25 has no 1m data, so it uses 5m.
- Size: $800 up to a 20-pt stop, then 800×20/stop, MNQ, max 40 micros. Costs: $1.40 per micro round trip and 1 tick of slippage
  on stop, EOD and time exits. No cold-streak filter.
- **Overfitting guard:** each choice was made on **2026 H1 (Jan 2 - Jun 30)** and checked on **2026 H2 (Jul 1 - Oct 16)**.
  2021-25 is a reference line only.
- Search: 121 runs in 4 rounds plus a robustness round.
  - Round 1: 53 single changes from lit_A.
  - Round 2: 24 changes on top of the round-1 H1 winner.
  - Round 3: 16 changes on top of the round-2 winner.
  - Round 4: 14 combinations.
  - Robustness: 14 neighbours of the two picks. Nothing was chosen in that round.
  - That is about twice the ~60 budget, so treat the exact settings with extra suspicion. The neighbour table below is the reason
    to trust the shape.
- All numbers: `research/lab/lit_risk_results.json`.
- "xTop" = net $ without the single best trade (an outlier check).
- "Pass rate" = passed / (passed + failed) of MFFU Builder 50K evals started on every session (60-session horizon).

## The best two (exact parameters)

Both keep lit_A's entry unchanged:
- Window 02:00-15:30, every liquidity class.
- Displacement ≥ 1 ATR, sweep ≥ 0.5 ATR deep.
- Limit at the broken swing, waiting 12 bars.
- Breakeven at 1R, flat by 15:55, 1 trade a day.

The changes:

| Setting | lit_A | **Pick 1 `lit_risk_vix_nobank`** | **Pick 2 `lit_risk_vix_bank8`** |
|---|---|---|---|
| Target | nearest PDH/PDL, PWH/PWL, PMH/PML ≥ 1.5R; no trade without one | **VIX band edge: 18:00 open ± 1 × (prev VIX close / 100 / √252 × 18:00 open)**, in the trade's direction, ≥ 1.5R from the fill (`classes ("vix",)`, `vix_k 1.0`) | same |
| No band target ≥ 1.5R | skip (take a later setup that day) | **fixed 4R** (`fallback_rr 4.0`) | same |
| Bank | 5R | **none** (`max_rr None`) | **8R** (`max_rr 8.0`) |
| Stop | 2 pts beyond the 5m sweep extreme | **1 tick** beyond the 5m sweep extreme (`stop_buf 0.25`, anchor `ext`) | same |
| Stop range | 8-80 pts | **8-100 pts** (`max_stop 100`); size still follows the stop | same |
| Execution | 5m | **1m in 2026** (`exec "1m"`), 5m in 2021-25 | same |

`python -c "from tools import lit_risk as L; X=L.Ctx(); T=L.rk_run(X, {**L.C4, 'max_rr': None})"` gives Pick 1.

| | Trades/wk | % wks 2+ | Win % | PF | Net $ | $/month | Max DD | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate | Median sessions to pass | xTop |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lit_A, 2026 H1 | 2.93 | – | 16.0 | 0.70 | −4,420 | – | −6,883 | 0.0 / 6.2 | – | 0.0% | – | – |
| lit_A, 2026 H2 | 3.08 | – | 31.2 | 2.63 | +9,679 | – | −3,729 | 26.9 / 12.8 | – | 69.1% | – | – |
| lit_A, 2026 | 2.99 | 83% | 22.0 | 1.26 | +5,258 | 536 | −6,883 | 10.2 / 8.7 | 21.4 / 32.5 | 38.3% | – | – |
| **Pick 1, 2026 H1 (pick)** | 3.52 | 93% | 20.0 | 2.55 | +23,824 | 3,909 | −3,156 | 20.3 / 6.2 | 50.0 / 12.5 | 76.5% | 15 | +9,017 |
| **Pick 1, 2026 H2 (check)** | 3.27 | 94% | 31.4 | 3.14 | +12,600 | 3,392 | −3,032 | 32.1 / 7.7 | 61.5 / 23.1 | 73.6% | 11 | +9,272 |
| **Pick 1, 2026 full** | **3.42** | 93% | 24.1 | **2.71** | **+36,423** | **3,713** | **−3,156** | 24.8 / 6.8 | 54.9 / 16.5 | 76.5% | 14 | +21,617 |
| Pick 1, 2021-25 (ref) | 4.36 | 100% | 13.7 | 1.28 | +65,997 | 1,293 | −24,009 | 20.1 / 43.0 | 26.5 / 66.7 | 29.0% | 6 | +50,182 |
| **Pick 2, 2026 H1 (pick)** | 3.52 | 93% | 20.0 | 1.78 | +12,018 | 1,972 | −3,156 | 18.0 / 6.2 | 43.8 / 12.5 | 74.3% | 15 | +5,716 |
| **Pick 2, 2026 H2 (check)** | 3.27 | 94% | 31.4 | 2.94 | +11,440 | 3,080 | −3,032 | 25.6 / 7.7 | 60.3 / 23.1 | 72.2% | 12 | +9,272 |
| **Pick 2, 2026 full** | **3.42** | 93% | 24.1 | **2.10** | **+23,458** | **2,391** | **−3,156** | 20.9 / 6.8 | 50.5 / 16.5 | 76.0% | 15 | +17,156 |
| Pick 2, 2021-25 (ref) | 4.36 | 100% | 14.3 | 1.24 | +56,087 | 1,099 | −24,529 | 24.6 / 41.2 | 34.0 / 60.4 | 36.7% | 6 | +49,645 |

The "1 mo" columns of the lit_A rows come from the earlier lit-strategy write-up (whole-2026 spans).

**Months, 2026 (Pick 1):**

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| −3.2k | +5.3k | +1.8k | +13.6k | +0.2k | +6.2k | +5.3k | −2.1k | +3.6k | +5.9k |

Pick 2 is the same, except April is +5.1k and June +2.9k. Two losing months out of ten.

**Years, 2021-25 (reference):**
- Pick 1: 2021 −$1.3k, 2022 +$26.7k, 2023 +$8.3k, 2024 +$31.6k, 2025 +$0.7k.
- Pick 2: 2025 −$8.7k.

**Other checks:**
- +2 ticks of slippage: Pick 1 2026 PF 2.66 +$35.9k; Pick 2 2026 PF 2.06 +$22.9k. Both halves stay profitable.
- Longs and shorts both make money in 2026: Pick 1 longs +$24.0k, shorts +$12.5k.
- Exits in 2026: 64 stops, 42 breakevens, 26 targets, 9 end-of-day.

**Honest caveat on Pick 1.** No bank means the target is the band edge, however far away it is.
- One trade carries much of H1: 14 April 2026, a long with a 16.5-pt stop and 24 micros, +18.7R / +$14.8k.
- Without that trade, H1 is +$9.0k and 2026 is +$21.6k. That is still above Pick 2 and the 5R bank.
- Before trading it on the eval, check how MFFU's consistency rule treats one large winning day.
- Pick 2 caps that trade at 8R. It is the safer quote.

## Which changes clearly helped (each helped H1 and H2, or H1 without hurting H2)

1. **Target the VIX one-day band edge instead of PDH/PWH/PMH.** This is the big one: H1 goes from −$4.4k to +$6.0k, and H2 stays
   +$9.0k.
   - Adding the band to the PD/PW/PM targets (nearest of them) gets H1 to +$3.5k.
   - Using the band alone does best: 2026 PF 1.75, +$15.1k, pass rate 75%.
   - The band reads as "where the day's expected range ends", a natural draw on liquidity.
   - k = 0.75 / 1.25 / 1.5 moves and the 00:00 anchor are all profitable in both halves. k = 1.0 is in the middle of a smooth ridge.
2. **A larger bank, or none.** Bank 5R → 6 → 8 → 10 → 12 → none: 2026 H1 +$8.2k → 10.4k → 12.0k → 14.5k → 16.9k → 23.8k. H2 stays
   flat ($11.4-12.6k). The farther the bank, the more H1 rests on one or two trades (see xTop).
   - With lit_A's PD targets the bank did not matter (no bank: 2026 PF 1.22). It matters only with a far target.
3. **Stops up to 100 pts** (lit_A: 80). H1 goes from −$4.4k to −$2.6k, and H2 rises a little. The 2026 median stop is ~53 pts.
   Size follows the stop ($800×20/stop), so wide-stop trades are small and still worth taking.
4. **A 4R fallback when no target clears 1.5R** (lit_A skips that setup and may take a worse one later the same day). It helps
   H1 alone (+$2.3k vs −$4.4k with PD targets) and adds +$2.7k in H2 on top of the band target.
5. **Exits walked on 1m bars in 2026** (exact stop-versus-target order inside a 5m bar). Small, but better in both halves. It is
   the honest way to score 2026.
6. **A 1-tick stop buffer** (lit_A: 2 pts). Small, better in both halves. 3-4 pts and ATR buffers are worse.

## What did not help (2026 H1 or H2 worse)

- **Breakeven:** none, 0.75R, 1.5R, 2R, 3R, a close-based trigger, or a +0.1R lock. 1R stays; no BE was the worst for 2021-25
  evals.
- **Partials:** 50% at 1R, 50% at 2R and 33% at 2R all cut both halves.
- **Trailing** behind new 5m protected swings: after BE it loses money (PF 0.92); after 2R it is flat.
- **Time stops:**
  - 6 bars under 0R, and 12 bars under +0.5R: H1 better, H2 worse.
  - They do cut 2021-25 eval failures a lot (2-week fail 35% → 15-21%), so they are an option for eval risk, not for money.
- **Stop anchors:**
  - A 15m swing low (wider) is slightly better in 2026 alone. Inside the combination it lost H1 money. Not adopted.
  - The closer 5m higher-low stop (`hl5`) breaks the CLAUDE.md stop rule, so it was tested only as a research line. It was worse
    (H1 −$6.2k, 2021-25 PF 1.02). Rejected.
- **Other targets and stop limits:**
  - Session-box, build-up (0.15 or 0.08 ATR), previous 1H and previous 4H extremes as extra targets: worse or flat.
  - Fixed 3R: flat. Bank 3-4R: worse.
  - Max stop 40-60: too few trades (0.9-2.2 a week).
  - Min stop 6-12: no effect.

## Neighbours of the picks (robustness; nothing chosen here)

Every neighbour below is profitable in both halves of 2026 and in 2021-25:

| Neighbour | 2026 H1 net / PF | 2026 H2 net / PF | 2026 net / PF / DD | 2021-25 PF / net |
|---|---|---|---|---|
| Pick 1 k 0.9 | +21,167 / 2.38 | +10,743 / 2.82 | +31,911 / 2.50 / −3,156 | 1.25 / +56,939 |
| Pick 1 k 1.1 | +25,154 / 2.64 | +13,645 / 3.32 | +38,799 / 2.83 / −3,618 | 1.29 / +67,041 |
| Pick 1 max stop 80 | +22,763 / 2.53 | +12,199 / 3.05 | +34,963 / 2.68 / −3,156 | 1.28 / +65,668 |
| Pick 1 5m execution | +22,908 / 2.45 | +11,647 / 2.98 | +34,555 / 2.59 / −3,814 | 1.28 / +65,997 |
| Pick 1 buffer 2 pts | +20,513 / 2.42 | +11,671 / 2.99 | +32,184 / 2.58 / −2,967 | 1.25 / +55,601 |
| Pick 2 k 0.9 | +11,252 / 1.73 | +9,786 / 2.66 | +21,038 / 1.99 / −3,156 | 1.25 / +58,859 |
| Pick 2 k 1.1 | +10,917 / 1.71 | +12,284 / 3.08 | +23,200 / 2.09 / −3,618 | 1.25 / +58,604 |
| Pick 2 max stop 80 | +10,958 / 1.74 | +11,040 / 2.85 | +21,998 / 2.05 / −3,156 | 1.24 / +55,759 |
| Pick 2 5m execution | +11,103 / 1.70 | +10,487 / 2.78 | +21,590 / 1.99 / −3,814 | 1.24 / +56,087 |
| Bank 10R | +14,454 / 1.94 | +11,983 / 3.03 | +26,437 / 2.24 / −3,156 | 1.26 / +59,319 |
| Bank 12R | +16,890 / 2.10 | +12,526 / 3.13 | +29,416 / 2.38 / −3,156 | 1.30 / +69,788 |

**For the combine step:**
- The exit rules live in `rk_run(X, v)`. The option keys are listed in its docstring.
- Target classes `"vix"`, `"bu<tol>"`, `"h1"`, `"h4"` come from `extra_targets()`.
- `stop_level()` holds the stop anchors.
- `XB` and `Ctx.B1()` give the 1m execution.
- To merge with another agent's entry, feed its candidates (same dict keys as `lit.candidates`) into `Ctx.FA`.

## Every variant tried

Columns:
- 2026 H1 and H2: trades · trades/wk · PF · net $.
- 2026: trades · trades/wk · PF · net $ · max DD · eval pass rate.
- 2021-25 (reference): PF · net $ · max DD.

| Variant | Change vs lit_A | 2026 H1 (pick) | 2026 H2 (check) | 2026 | 2021-25 ref |
|---|---|---|---|---|---|
| lit_A | lit_A | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.63 · +9,679 | 123 · 2.99 · 1.26 · +5,258 · -6,883 · 38.3% | 1.15 · +31,469 · -20,948 |
| buf0.25 | stop_buf: 0.25 | 75 · 2.93 · 0.73 · -4,223 | 48 · 3.08 · 2.76 · +10,473 | 123 · 2.99 · 1.29 · +6,250 · -6,775 · 44.1% | 1.14 · +30,866 · -25,015 |
| buf1.0 | stop_buf: 1.0 | 75 · 2.93 · 0.66 · -5,272 | 48 · 3.08 · 2.6 · +9,449 | 123 · 2.99 · 1.19 · +4,177 · -7,606 · 37.8% | 1.15 · +31,894 · -25,173 |
| buf3.0 | stop_buf: 3.0 | 74 · 2.89 · 0.67 · -4,710 | 48 · 3.08 · 2.67 · +9,258 | 122 · 2.96 · 1.23 · +4,548 · -6,817 · 38.3% | 1.11 · +23,873 · -19,302 |
| buf4.0 | stop_buf: 4.0 | 71 · 2.77 · 0.62 · -5,220 | 47 · 3.01 · 2.42 · +7,427 | 118 · 2.86 · 1.12 · +2,208 · -7,228 · 33.7% | 1.1 · +21,286 · -20,270 |
| bufatr0.1 | buf_atr: 0.1 | 73 · 2.85 · 0.61 · -5,826 | 48 · 3.08 · 2.52 · +9,034 | 121 · 2.94 · 1.15 · +3,208 · -7,856 · 38.3% | 1.13 · +28,872 · -25,073 |
| bufatr0.25 | buf_atr: 0.25 | 70 · 2.73 · 0.61 · -5,377 | 46 · 2.95 · 2.88 · +9,033 | 116 · 2.82 · 1.2 · +3,656 · -7,280 · 34.7% | 1.11 · +22,841 · -21,840 |
| minstop6 | min_stop: 6.0 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.63 · +9,679 | 123 · 2.99 · 1.26 · +5,258 · -6,883 · 38.3% | 1.15 · +31,469 · -20,948 |
| minstop10 | min_stop: 10.0 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.63 · +9,679 | 123 · 2.99 · 1.26 · +5,258 · -6,883 · 38.3% | 1.12 · +26,133 · -20,948 |
| minstop12 | min_stop: 12.0 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.63 · +9,679 | 123 · 2.99 · 1.26 · +5,258 · -6,883 · 38.3% | 1.1 · +21,683 · -23,140 |
| maxstop40 | max_stop: 40.0 | 27 · 1.05 · 1.11 · +939 | 10 · 0.64 · 2.54 · +3,248 | 37 · 0.9 · 1.4 · +4,187 · -4,749 · 50.4% | 1.18 · +34,483 · -21,709 |
| maxstop50 | max_stop: 50.0 | 44 · 1.72 · 0.63 · -4,645 | 19 · 1.22 · 3.4 · +7,284 | 63 · 1.53 · 1.17 · +2,639 · -6,984 · 41.8% | 1.18 · +37,047 · -21,480 |
| maxstop60 | max_stop: 60.0 | 58 · 2.27 · 0.7 · -4,113 | 31 · 1.99 · 2.94 · +8,585 | 89 · 2.16 · 1.25 · +4,471 · -7,746 · 38.1% | 1.14 · +29,063 · -22,370 |
| maxstop100 | max_stop: 100.0 | 83 · 3.24 · 0.82 · -2,609 | 51 · 3.27 · 2.72 · +10,039 | 134 · 3.25 · 1.36 · +7,430 · -5,853 · 44.0% | 1.16 · +33,476 · -20,605 |
| anchor_sw15 | anchor: sw15 | 72 · 2.81 · 0.73 · -3,626 | 44 · 2.82 · 2.98 · +10,244 | 116 · 2.82 · 1.36 · +6,618 · -6,728 · 49.5% | 1.14 · +27,383 · -16,073 |
| anchor_hl5_RESEARCH | anchor: hl5 | 85 · 3.32 · 0.65 · -6,189 | 49 · 3.14 · 2.74 · +11,096 | 134 · 3.25 · 1.2 · +4,907 · -9,598 · 48.1% | 1.02 · +4,877 · -27,181 |
| tgt+sess | classes: [pd, pw, pm, asia, london, ny] | 79 · 3.09 · 0.66 · -5,005 | 48 · 3.08 · 2.6 · +9,446 | 127 · 3.08 · 1.22 · +4,441 · -5,605 · 42.0% | 1.1 · +21,583 · -23,128 |
| tgt+buildup | classes: [pd, pw, pm, buildup] | 76 · 2.97 · 0.82 · -2,652 | 48 · 3.08 · 2.29 · +7,637 | 124 · 3.01 · 1.24 · +4,984 · -4,691 · 42.0% | 1.1 · +22,331 · -24,603 |
| tgt+bu08 | classes: [pd, pw, pm, bu08] | 75 · 2.93 · 0.76 · -3,442 | 48 · 3.08 · 2.36 · +8,074 | 123 · 2.99 · 1.23 · +4,632 · -5,480 · 39.8% | 1.11 · +24,304 · -24,842 |
| tgt+h4 | classes: [pd, pw, pm, h4] | 76 · 2.97 · 0.66 · -4,975 | 48 · 3.08 · 2.38 · +8,197 | 124 · 3.01 · 1.16 · +3,222 · -6,667 · 38.9% | 1.07 · +14,802 · -24,163 |
| tgt+h1 | classes: [pd, pw, pm, h1] | 76 · 2.97 · 0.68 · -4,646 | 48 · 3.08 · 2.43 · +8,474 | 124 · 3.01 · 1.19 · +3,827 · -7,108 · 36.3% | 1.11 · +23,612 · -20,952 |
| tgt+vix1 | classes: [pd, pw, pm, vix], vix_k: 1.0 | 80 · 3.12 · 1.24 · +3,515 | 48 · 3.08 · 2.63 · +9,658 | 128 · 3.11 · 1.65 · +13,173 · -3,729 · 61.9% | 1.07 · +15,905 · -21,158 |
| vixcap1 | vix_cap: 1.0 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.63 · +9,658 | 123 · 2.99 · 1.25 · +5,237 · -6,883 · 38.3% | 1.12 · +26,402 · -21,469 |
| vixcap1.5 | vix_cap: 1.5 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.59 · +9,413 | 123 · 2.99 · 1.24 · +4,993 · -6,883 · 40.4% | 1.15 · +31,809 · -20,948 |
| fixed3R | fixed_rr: 3.0 | 80 · 3.12 · 0.99 · -210 | 48 · 3.08 · 1.96 · +5,681 | 128 · 3.11 · 1.27 · +5,471 · -3,640 · 48.1% | 1.03 · +7,746 · -22,724 |
| fixed4R | fixed_rr: 4.0 | 80 · 3.12 · 1.15 · +2,174 | 48 · 3.08 · 2.41 · +8,370 | 128 · 3.11 · 1.52 · +10,544 · -3,729 · 58.1% | 1.07 · +14,715 · -19,805 |
| fallback3R | fallback_rr: 3.0 | 80 · 3.12 · 1.05 · +758 | 48 · 3.08 · 2.63 · +9,679 | 128 · 3.11 · 1.51 · +10,436 · -3,729 · 46.6% | 1.11 · +24,252 · -21,856 |
| fallback4R | fallback_rr: 4.0 | 80 · 3.12 · 1.16 · +2,320 | 48 · 3.08 · 2.63 · +9,679 | 128 · 3.11 · 1.59 · +11,998 · -3,729 · 61.9% | 1.09 · +19,985 · -20,800 |
| minrr1.0 | min_rr: 1.0 | 75 · 2.93 · 0.7 · -4,420 | 48 · 3.08 · 2.57 · +9,290 | 123 · 2.99 · 1.24 · +4,869 · -6,883 · 38.3% | 1.13 · +27,164 · -21,489 |
| minrr2.0 | min_rr: 2.0 | 74 · 2.89 · 0.64 · -5,255 | 48 · 3.08 · 2.63 · +9,679 | 122 · 2.96 · 1.21 · +4,424 · -7,294 · 37.8% | 1.19 · +39,529 · -19,892 |
| minrr2.5 | min_rr: 2.5 | 74 · 2.89 · 0.71 · -4,215 | 48 · 3.08 · 2.63 · +9,679 | 122 · 2.96 · 1.27 · +5,464 · -7,119 · 44.4% | 1.23 · +48,839 · -19,539 |
| bank3 | max_rr: 3.0 | 75 · 2.93 · 0.63 · -5,367 | 48 · 3.08 · 1.94 · +5,574 | 123 · 2.99 · 1.01 · +207 · -6,384 · 30.5% | 1.04 · +8,817 · -19,279 |
| bank4 | max_rr: 4.0 | 75 · 2.93 · 0.62 · -5,583 | 48 · 3.08 · 2.27 · +7,525 | 123 · 2.99 · 1.09 · +1,942 · -7,249 · 35.2% | 1.08 · +16,713 · -17,668 |
| bank6 | max_rr: 6.0 | 75 · 2.93 · 0.73 · -4,030 | 48 · 3.08 · 2.39 · +8,274 | 123 · 2.99 · 1.21 · +4,245 · -7,526 · 36.7% | 1.21 · +44,996 · -18,336 |
| bank8 | max_rr: 8.0 | 75 · 2.93 · 0.74 · -3,880 | 48 · 3.08 · 2.27 · +7,549 | 123 · 2.99 · 1.18 · +3,669 · -7,526 · 22.7% | 1.27 · +57,089 · -17,213 |
| nobank | max_rr: null | 75 · 2.93 · 0.73 · -3,941 | 48 · 3.08 · 2.44 · +8,566 | 123 · 2.99 · 1.22 · +4,625 · -7,526 · 22.7% | 1.28 · +61,009 · -22,464 |
| be_none | be_r: null | 75 · 2.93 · 0.74 · -5,002 | 48 · 3.08 · 1.96 · +8,011 | 123 · 2.99 · 1.11 · +3,009 · -9,620 · 44.4% | 1.09 · +27,802 · -26,099 |
| be0.75 | be_r: 0.75 | 75 · 2.93 · 0.57 · -5,748 | 48 · 3.08 · 2.55 · +7,752 | 123 · 2.99 · 1.11 · +2,004 · -7,506 · 40.8% | 1.24 · +44,986 · -16,611 |
| be1.5 | be_r: 1.5 | 75 · 2.93 · 0.73 · -4,221 | 48 · 3.08 · 2.14 · +8,687 | 123 · 2.99 · 1.19 · +4,466 · -7,011 · 37.0% | 1.14 · +34,516 · -20,078 |
| be2.0 | be_r: 2.0 | 75 · 2.93 · 0.69 · -5,542 | 48 · 3.08 · 2.08 · +8,460 | 123 · 2.99 · 1.11 · +2,918 · -8,905 · 36.0% | 1.11 · +29,979 · -20,002 |
| be3.0 | be_r: 3.0 | 75 · 2.93 · 0.76 · -4,310 | 48 · 3.08 · 2.02 · +8,226 | 123 · 2.99 · 1.15 · +3,916 · -9,172 · 44.4% | 1.09 · +26,885 · -24,015 |
| be_close1 | be_r: null, be_close: 1.0 | 75 · 2.93 · 0.71 · -4,424 | 48 · 3.08 · 2.17 · +8,415 | 123 · 2.99 · 1.18 · +3,991 · -6,886 · 37.0% | 1.12 · +26,692 · -21,293 |
| be1_lock0.1 | be_lock: 0.1 | 75 · 2.93 · 0.71 · -4,184 | 48 · 3.08 · 2.49 · +8,743 | 123 · 2.99 · 1.22 · +4,559 · -6,481 · 36.6% | 1.16 · +33,847 · -19,762 |
| part50@1R | partial: [0.5, 1.0, true] | 75 · 2.93 · 0.72 · -4,138 | 48 · 3.08 · 1.96 · +5,624 | 123 · 2.99 · 1.07 · +1,487 · -5,287 · 34.8% | 1.05 · +9,448 · -14,098 |
| part50@2R | partial: [0.5, 2.0, true] | 75 · 2.93 · 0.7 · -4,350 | 48 · 3.08 · 2.14 · +6,715 | 123 · 2.99 · 1.12 · +2,364 · -5,982 · 39.0% | 1.07 · +15,894 · -17,565 |
| part33@2R | partial: [0.33, 2.0, true] | 75 · 2.93 · 0.69 · -4,597 | 48 · 3.08 · 2.34 · +7,933 | 123 · 2.99 · 1.16 · +3,336 · -6,169 · 42.1% | 1.11 · +22,390 · -18,679 |
| trail_be | trail: [be, 2.0] | 75 · 2.93 · 0.52 · -7,016 | 48 · 3.08 · 1.91 · +5,379 | 123 · 2.99 · 0.92 · -1,637 · -7,727 · 27.3% | 0.99 · -1,385 · -17,825 |
| trail_2R | trail: [2.0, 2.0] | 75 · 2.93 · 0.61 · -5,704 | 48 · 3.08 · 2.07 · +6,321 | 123 · 2.99 · 1.03 · +617 · -6,479 · 38.7% | 1.06 · +13,567 · -16,849 |
| time6 | time_bars: 6, time_min_r: 0.0 | 75 · 2.93 · 0.68 · -2,460 | 48 · 3.08 · 2.22 · +5,488 | 123 · 2.99 · 1.25 · +3,028 · -4,272 · 40.1% | 1.29 · +39,178 · -15,818 |
| time12_0.5 | time_bars: 12, time_min_r: 0.5 | 75 · 2.93 · 0.78 · -2,498 | 48 · 3.08 · 2.73 · +7,841 | 123 · 2.99 · 1.34 · +5,343 · -4,945 · 41.7% | 1.24 · +36,254 · -13,216 |
| flat_am1130 | flat_am: 690 | 75 · 2.93 · 0.7 · -4,372 | 48 · 3.08 · 2.63 · +9,679 | 123 · 2.99 · 1.26 · +5,307 · -6,834 · 38.3% | 1.15 · +31,423 · -21,168 |
| flat_lon1130 | flat_lon: 690 | 75 · 2.93 · 0.72 · -4,108 | 48 · 3.08 · 2.57 · +9,322 | 123 · 2.99 · 1.25 · +5,214 · -6,570 · 38.3% | 1.15 · +31,158 · -19,587 |
| exec1m | exec: 1m | 74 · 2.89 · 0.71 · -4,122 | 48 · 3.08 · 2.81 · +10,729 | 122 · 2.96 · 1.32 · +6,607 · -6,744 · 41.1% | 1.15 · +31,469 · -20,948 |
| vix0.75 | classes: [pd, pw, pm, vix], vix_k: 0.75 | 80 · 3.12 · 1.3 · +4,301 | 48 · 3.08 · 2.4 · +8,315 | 128 · 3.11 · 1.62 · +12,615 · -3,729 · 61.2% | 1.08 · +17,821 · -18,853 |
| vix1.25 | classes: [pd, pw, pm, vix], vix_k: 1.25 | 80 · 3.12 · 1.18 · +2,586 | 48 · 3.08 · 2.6 · +9,497 | 128 · 3.11 · 1.6 · +12,082 · -3,729 · 55.7% | 1.09 · +20,470 · -18,976 |
| vix1.5 | classes: [pd, pw, pm, vix], vix_k: 1.5 | 80 · 3.12 · 1.18 · +2,586 | 48 · 3.08 · 2.59 · +9,413 | 128 · 3.11 · 1.59 · +11,999 · -3,529 · 57.7% | 1.09 · +21,159 · -19,998 |
| vix1_anchor00 | classes: [pd, pw, pm, vix], vix_k: 1.0, vix_anchor: 00 | 80 · 3.12 · 1.2 · +2,843 | 48 · 3.08 · 2.51 · +8,918 | 128 · 3.11 · 1.58 · +11,761 · -3,729 · 55.7% | 1.09 · +21,215 · -18,974 |
| vix_only | classes: [vix], vix_k: 1.0 | 78 · 3.05 · 1.42 · +6,029 | 45 · 2.88 · 2.53 · +9,049 | 123 · 2.99 · 1.75 · +15,078 · -3,725 · 74.6% | 1.12 · +26,762 · -24,004 |
| vix1+fb4R | classes: [pd, pw, pm, vix], vix_k: 1.0, fallback_rr: 4.0 | 80 · 3.12 · 1.24 · +3,515 | 48 · 3.08 · 2.63 · +9,658 | 128 · 3.11 · 1.65 · +13,173 · -3,729 · 61.9% | 1.07 · +15,890 · -21,158 |
| fb4R+maxstop100 | fallback_rr: 4.0, max_stop: 100.0 | 89 · 3.48 · 1.27 · +3,957 | 51 · 3.27 · 2.72 · +10,039 | 140 · 3.4 · 1.68 · +13,996 · -3,729 · 72.5% | 1.1 · +21,975 · -20,456 |
| vix1+maxstop100 | classes: [pd, pw, pm, vix], vix_k: 1.0, max_stop: 100.0 | 89 · 3.48 · 1.35 · +5,153 | 51 · 3.27 · 2.71 · +10,018 | 140 · 3.4 · 1.74 · +15,170 · -3,729 · 72.5% | 1.08 · +17,810 · -20,815 |
| vix1+maxstop60 | classes: [pd, pw, pm, vix], vix_k: 1.0, max_stop: 60.0 | 62 · 2.42 · 1.21 · +2,949 | 31 · 1.99 · 3.05 · +9,068 | 93 · 2.26 · 1.66 · +12,017 · -3,339 · 60.2% | 1.06 · +13,527 · -23,210 |
| vix1+buf0.25 | classes: [pd, pw, pm, vix], vix_k: 1.0, stop_buf: 0.25 | 80 · 3.12 · 1.25 · +3,776 | 48 · 3.08 · 2.76 · +10,468 | 128 · 3.11 · 1.67 · +14,245 · -3,814 · 80.6% | 1.06 · +14,474 · -25,435 |
| vix1+sw15 | classes: [pd, pw, pm, vix], vix_k: 1.0, anchor: sw15 | 77 · 3.01 · 1.29 · +3,792 | 44 · 2.82 · 2.97 · +10,191 | 121 · 2.94 · 1.77 · +13,983 · -3,058 · 77.1% | 1.08 · +15,865 · -18,803 |
| vix1+exec1m | classes: [pd, pw, pm, vix], vix_k: 1.0, exec: 1m | 79 · 3.09 · 1.31 · +4,367 | 48 · 3.08 · 2.8 · +10,677 | 127 · 3.08 · 1.75 · +15,043 · -2,915 · 64.9% | 1.07 · +15,905 · -21,158 |
| vix1+time12_0.5 | classes: [pd, pw, pm, vix], vix_k: 1.0, time_bars: 12, time_min_r: 0.5 | 80 · 3.12 · 1.36 · +3,955 | 48 · 3.08 · 2.72 · +7,820 | 128 · 3.11 · 1.75 · +11,775 · -3,411 · 72.6% | 1.15 · +24,571 · -14,886 |
| vix1+time6 | classes: [pd, pw, pm, vix], vix_k: 1.0, time_bars: 6, time_min_r: 0.0 | 80 · 3.12 · 1.48 · +3,715 | 48 · 3.08 · 2.26 · +5,678 | 128 · 3.11 · 1.77 · +9,393 · -3,154 · 83.0% | 1.21 · +29,445 · -14,452 |
| vix1+bank4 | classes: [pd, pw, pm, vix], vix_k: 1.0, max_rr: 4.0 | 80 · 3.12 · 1.08 · +1,096 | 48 · 3.08 · 2.27 · +7,513 | 128 · 3.11 · 1.42 · +8,609 · -3,729 · 56.5% | 1.01 · +1,514 · -19,684 |
| vix1+bank6 | classes: [pd, pw, pm, vix], vix_k: 1.0, max_rr: 6.0 | 80 · 3.12 · 1.34 · +4,952 | 48 · 3.08 · 2.33 · +7,894 | 128 · 3.11 · 1.63 · +12,846 · -3,729 · 56.6% | 1.13 · +29,820 · -20,207 |
| vix1+minrr1 | classes: [pd, pw, pm, vix], vix_k: 1.0, min_rr: 1.0 | 80 · 3.12 · 1.24 · +3,515 | 48 · 3.08 · 2.61 · +9,562 | 128 · 3.11 · 1.64 · +13,077 · -3,729 · 61.9% | 1.07 · +15,687 · -21,528 |
| vix1+minrr2 | classes: [pd, pw, pm, vix], vix_k: 1.0, min_rr: 2.0 | 80 · 3.12 · 1.24 · +3,467 | 48 · 3.08 · 2.63 · +9,658 | 128 · 3.11 · 1.65 · +13,124 · -3,729 · 60.7% | 1.11 · +23,683 · -22,784 |
| vix1+be1.5 | classes: [pd, pw, pm, vix], vix_k: 1.0, be_r: 1.5 | 80 · 3.12 · 1.23 · +3,560 | 48 · 3.08 · 2.14 · +8,666 | 128 · 3.11 · 1.53 · +12,226 · -3,729 · 54.3% | 1.06 · +15,484 · -19,169 |
| vix1+be_none | classes: [pd, pw, pm, vix], vix_k: 1.0, be_r: null | 80 · 3.12 · 1.18 · +3,333 | 48 · 3.08 · 1.96 · +7,990 | 128 · 3.11 · 1.42 · +11,323 · -4,405 · 56.5% | 1.03 · +9,404 · -26,918 |
| vix1+be_lock0.1 | classes: [pd, pw, pm, vix], vix_k: 1.0, be_lock: 0.1 | 80 · 3.12 · 1.27 · +3,792 | 48 · 3.08 · 2.49 · +8,722 | 128 · 3.11 · 1.62 · +12,514 · -3,857 · 62.4% | 1.08 · +18,637 · -19,867 |
| vix1+part33@2R | classes: [pd, pw, pm, vix], vix_k: 1.0, partial: [0.33, 2.0, true] | 80 · 3.12 · 1.13 · +1,821 | 48 · 3.08 · 2.31 · +7,750 | 128 · 3.11 · 1.47 · +9,571 · -3,279 · 60.0% | 1.04 · +8,934 · -19,304 |
| vix1++buildup | classes: [pd, pw, pm, vix, buildup], vix_k: 1.0 | 80 · 3.12 · 1.37 · +5,287 | 48 · 3.08 · 2.29 · +7,616 | 128 · 3.11 · 1.64 · +12,903 · -3,729 · 59.2% | 1.03 · +7,435 · -26,713 |
| vix1++sess | classes: [pd, pw, pm, vix, asia, london, ny], vix_k: 1.0 | 80 · 3.12 · 0.84 · -2,257 | 48 · 3.08 · 2.51 · +8,925 | 128 · 3.11 · 1.33 · +6,667 · -3,623 · 42.6% | 1.06 · +12,454 · -21,400 |
| vo_k0.75 | classes: [vix], vix_k: 0.75 | 76 · 2.97 · 1.56 · +7,666 | 40 · 2.56 · 2.02 · +5,436 | 116 · 2.82 · 1.69 · +13,101 · -3,369 · 76.8% | 1.06 · +13,323 · -26,567 |
| vo_k1.25 | classes: [vix], vix_k: 1.25 | 78 · 3.05 · 1.36 · +5,100 | 46 · 2.95 · 2.57 · +9,311 | 124 · 3.01 · 1.72 · +14,410 · -3,725 · 68.5% | 1.13 · +29,492 · -23,275 |
| vo+maxstop100 | classes: [vix], vix_k: 1.0, max_stop: 100.0 | 87 · 3.4 · 1.47 · +6,827 | 48 · 3.08 · 2.5 · +9,159 | 135 · 3.28 · 1.77 · +15,986 · -3,725 · 79.9% | 1.12 · +27,933 · -24,086 |
| vo+exec1m | classes: [vix], vix_k: 1.0, exec: 1m | 77 · 3.01 · 1.48 · +6,799 | 45 · 2.88 · 2.53 · +9,049 | 122 · 2.96 · 1.79 · +15,848 · -3,725 · 74.6% | 1.12 · +26,762 · -24,004 |
| vo+buf0.25 | classes: [vix], vix_k: 1.0, stop_buf: 0.25 | 78 · 3.05 · 1.41 · +6,201 | 45 · 2.88 · 2.61 · +9,562 | 123 · 2.99 · 1.75 · +15,763 · -3,810 · 80.4% | 1.13 · +28,856 · -25,524 |
| vo+sw15 | classes: [vix], vix_k: 1.0, anchor: sw15 | 75 · 2.93 · 1.36 · +4,593 | 41 · 2.63 · 2.81 · +9,390 | 116 · 2.82 · 1.77 · +13,983 · -3,055 · 81.6% | 1.12 · +25,045 · -21,595 |
| vo+time12_0.5 | classes: [vix], vix_k: 1.0, time_bars: 12, time_min_r: 0.5 | 78 · 3.05 · 1.43 · +4,728 | 45 · 2.88 · 2.48 · +6,684 | 123 · 2.99 · 1.74 · +11,411 · -3,408 · 72.8% | 1.17 · +27,916 · -18,001 |
| vo+bank4 | classes: [vix], vix_k: 1.0, max_rr: 4.0 | 78 · 3.05 · 1.16 · +2,296 | 45 · 2.88 · 2.15 · +6,819 | 123 · 2.99 · 1.45 · +9,115 · -3,725 · 59.6% | 1.04 · +9,437 · -20,958 |
| vo+bank6 | classes: [vix], vix_k: 1.0, max_rr: 6.0 | 78 · 3.05 · 1.62 · +8,780 | 45 · 2.88 · 2.21 · +7,183 | 123 · 2.99 · 1.79 · +15,963 · -3,725 · 66.8% | 1.15 · +33,720 · -24,591 |
| vo+nobank | classes: [vix], vix_k: 1.0, max_rr: null | 78 · 3.05 · 2.35 · +19,208 | 45 · 2.88 · 2.49 · +8,823 | 123 · 2.99 · 2.39 · +28,030 · -3,725 · 69.3% | 1.24 · +54,482 · -25,253 |
| vo+minrr2 | classes: [vix], vix_k: 1.0, min_rr: 2.0 | 78 · 3.05 · 1.42 · +6,029 | 44 · 2.82 · 2.63 · +9,280 | 122 · 2.96 · 1.77 · +15,309 · -3,725 · 74.6% | 1.11 · +24,833 · -24,527 |
| vo+minrr1 | classes: [vix], vix_k: 1.0, min_rr: 1.0 | 78 · 3.05 · 1.42 · +6,029 | 46 · 2.95 · 2.53 · +9,047 | 124 · 3.01 · 1.75 · +15,076 · -3,725 · 74.6% | 1.12 · +26,509 · -24,094 |
| vo+fb4R | classes: [vix], vix_k: 1.0, fallback_rr: 4.0 | 80 · 3.12 · 1.41 · +5,847 | 48 · 3.08 · 2.78 · +10,556 | 128 · 3.11 · 1.81 · +16,403 · -3,729 · 73.4% | 1.12 · +26,734 · -24,094 |
| vo+be1.5 | classes: [vix], vix_k: 1.0, be_r: 1.5 | 78 · 3.05 · 1.42 · +6,305 | 45 · 2.88 · 2.0 · +7,489 | 123 · 2.99 · 1.61 · +13,794 · -3,725 · 69.8% | 1.11 · +27,764 · -21,301 |
| vo+be_lock0.1 | classes: [vix], vix_k: 1.0, be_lock: 0.1 | 78 · 3.05 · 1.48 · +6,683 | 45 · 2.88 · 2.28 · +7,491 | 123 · 2.99 · 1.71 · +14,174 · -3,876 · 74.0% | 1.13 · +29,249 · -23,202 |
| vo+anchor00 | classes: [vix], vix_k: 1.0, vix_anchor: 00 | 79 · 3.09 · 1.38 · +5,354 | 46 · 2.95 · 2.64 · +9,716 | 125 · 3.03 · 1.75 · +15,070 · -3,725 · 68.0% | 1.13 · +29,086 · -22,706 |
| C1 vo+ms100+1m | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m | 86 · 3.36 · 1.53 · +7,596 | 48 · 3.08 · 2.51 · +9,203 | 134 · 3.25 · 1.82 · +16,799 · -3,725 · 79.9% | 1.12 · +27,933 · -24,086 |
| C2 C1+buf0.25 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25 | 88 · 3.44 · 1.54 · +8,255 | 48 · 3.08 · 2.59 · +9,720 | 136 · 3.3 · 1.84 · +17,975 · -3,810 · 80.9% | 1.13 · +29,048 · -25,255 |
| C3 C1+fb4R | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, fallback_rr: 4.0 | 88 · 3.44 · 1.52 · +7,495 | 51 · 3.27 · 3.03 · +11,897 | 139 · 3.37 · 1.95 · +19,392 · -2,915 · 81.9% | 1.12 · +27,881 · -24,176 |
| C4 C1+buf0.25+fb4R | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0 | 90 · 3.52 · 1.53 · +8,155 | 51 · 3.27 · 3.14 · +12,597 | 141 · 3.42 · 1.98 · +20,752 · -3,032 · 81.9% | 1.13 · +29,518 · -24,922 |
| C5 C1+sw15 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, anchor: sw15 | 83 · 3.24 · 1.5 · +6,499 | 46 · 2.95 · 2.82 · +9,735 | 129 · 3.13 · 1.89 · +16,234 · -3,277 · 81.4% | 1.12 · +24,571 · -21,517 |
| C6 C1+time12_0.5 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, time_bars: 12, time_min_r: 0.5 | 86 · 3.36 · 1.44 · +4,999 | 48 · 3.08 · 2.52 · +6,973 | 134 · 3.25 · 1.75 · +11,972 · -3,411 · 73.8% | 1.18 · +28,567 · -17,850 |
| C1+bank6 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, max_rr: 6.0 | 86 · 3.36 · 1.72 · +10,347 | 48 · 3.08 · 2.2 · +7,336 | 134 · 3.25 · 1.86 · +17,683 · -3,725 · 69.3% | 1.16 · +34,891 · -24,310 |
| C4+bank6 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 6.0 | 90 · 3.52 · 1.68 · +10,411 | 51 · 3.27 · 2.84 · +10,854 | 141 · 3.42 · 2.0 · +21,264 · -3,032 · 71.5% | 1.16 · +36,072 · -23,943 |
| C1+bank8 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, max_rr: 8.0 | 86 · 3.36 · 1.78 · +11,149 | 48 · 3.08 · 2.29 · +7,901 | 134 · 3.25 · 1.93 · +19,050 · -3,725 · 71.9% | 1.24 · +54,260 · -25,464 |
| C4+bank8 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 90 · 3.52 · 1.78 · +12,018 | 51 · 3.27 · 2.94 · +11,440 | 141 · 3.42 · 2.1 · +23,458 · -3,156 · 76.0% | 1.24 · +56,087 · -24,529 |
| C1+nobank | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, max_rr: null | 86 · 3.36 · 2.43 · +20,614 | 48 · 3.08 · 2.47 · +8,977 | 134 · 3.25 · 2.44 · +29,590 · -3,725 · 72.4% | 1.25 · +55,653 · -24,910 |
| C4+nobank | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 90 · 3.52 · 2.55 · +23,824 | 51 · 3.27 · 3.14 · +12,600 | 141 · 3.42 · 2.71 · +36,423 · -3,156 · 76.5% | 1.28 · +65,997 · -24,009 |
| C1+k1.25 | classes: [vix], vix_k: 1.25, max_stop: 100.0, exec: 1m | 86 · 3.36 · 1.43 · +6,247 | 49 · 3.14 · 2.56 · +9,504 | 135 · 3.28 · 1.77 · +15,750 · -3,725 · 73.9% | 1.14 · +30,870 · -23,358 |
| C4+k1.25 | classes: [vix], vix_k: 1.25, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0 | 90 · 3.52 · 1.45 · +6,961 | 51 · 3.27 · 3.18 · +12,785 | 141 · 3.42 · 1.93 · +19,746 · -3,618 · 75.9% | 1.15 · +33,609 · -23,899 |
| R nobank k0.9 | classes: [vix], vix_k: 0.9, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 90 · 3.52 · 2.38 · +21,167 | 51 · 3.27 · 2.82 · +10,743 | 141 · 3.42 · 2.5 · +31,911 · -3,156 · 71.9% | 1.25 · +56,939 · -24,020 |
| R nobank k1.1 | classes: [vix], vix_k: 1.1, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 90 · 3.52 · 2.64 · +25,154 | 51 · 3.27 · 3.32 · +13,645 | 141 · 3.42 · 2.83 · +38,799 · -3,618 · 71.4% | 1.29 · +67,041 · -23,730 |
| R nobank maxstop80 | classes: [vix], vix_k: 1.0, max_stop: 80.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 79 · 3.09 · 2.53 · +22,763 | 48 · 3.08 · 3.05 · +12,199 | 127 · 3.08 · 2.68 · +34,963 · -3,156 · 72.0% | 1.28 · +65,668 · -23,856 |
| R nobank maxstop120 | classes: [vix], vix_k: 1.0, max_stop: 120.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 90 · 3.52 · 2.55 · +23,824 | 51 · 3.27 · 3.14 · +12,600 | 141 · 3.42 · 2.71 · +36,423 · -3,156 · 76.5% | 1.28 · +65,997 · -24,009 |
| R nobank exec5m | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 5m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: null | 91 · 3.55 · 2.45 · +22,908 | 51 · 3.27 · 2.98 · +11,647 | 142 · 3.45 · 2.59 · +34,555 · -3,814 · 75.5% | 1.28 · +65,997 · -24,009 |
| R nobank buf2 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 2.0, fallback_rr: 4.0, max_rr: null | 88 · 3.44 · 2.42 · +20,513 | 51 · 3.27 · 2.99 · +11,671 | 139 · 3.37 · 2.58 · +32,184 · -2,967 · 74.4% | 1.25 · +55,601 · -25,164 |
| R bank8 k0.9 | classes: [vix], vix_k: 0.9, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 90 · 3.52 · 1.73 · +11,252 | 51 · 3.27 · 2.66 · +9,786 | 141 · 3.42 · 1.99 · +21,038 · -3,156 · 71.4% | 1.25 · +58,859 · -24,020 |
| R bank8 k1.1 | classes: [vix], vix_k: 1.1, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 90 · 3.52 · 1.71 · +10,917 | 51 · 3.27 · 3.08 · +12,284 | 141 · 3.42 · 2.09 · +23,200 · -3,618 · 70.4% | 1.25 · +58,604 · -24,250 |
| R bank8 maxstop80 | classes: [vix], vix_k: 1.0, max_stop: 80.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 79 · 3.09 · 1.74 · +10,958 | 48 · 3.08 · 2.85 · +11,040 | 127 · 3.08 · 2.05 · +21,998 · -3,156 · 71.5% | 1.24 · +55,759 · -24,376 |
| R bank8 maxstop120 | classes: [vix], vix_k: 1.0, max_stop: 120.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 90 · 3.52 · 1.78 · +12,018 | 51 · 3.27 · 2.94 · +11,440 | 141 · 3.42 · 2.1 · +23,458 · -3,156 · 76.0% | 1.24 · +56,087 · -24,529 |
| R bank8 exec5m | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 5m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 8.0 | 91 · 3.55 · 1.7 · +11,103 | 51 · 3.27 · 2.78 · +10,487 | 142 · 3.45 · 1.99 · +21,590 · -3,814 · 75.0% | 1.24 · +56,087 · -24,529 |
| R bank8 buf2 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 2.0, fallback_rr: 4.0, max_rr: 8.0 | 88 · 3.44 · 1.76 · +11,049 | 51 · 3.27 · 2.81 · +10,595 | 139 · 3.37 · 2.06 · +21,644 · -2,967 · 73.9% | 1.24 · +54,208 · -25,718 |
| R bank10 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 10.0 | 90 · 3.52 · 1.94 · +14,454 | 51 · 3.27 · 3.03 · +11,983 | 141 · 3.42 · 2.24 · +26,437 · -3,156 · 76.5% | 1.26 · +59,319 · -24,009 |
| R bank12 | classes: [vix], vix_k: 1.0, max_stop: 100.0, exec: 1m, stop_buf: 0.25, fallback_rr: 4.0, max_rr: 12.0 | 90 · 3.52 · 2.1 · +16,890 | 51 · 3.27 · 3.13 · +12,526 | 141 · 3.42 · 2.38 · +29,416 · -3,156 · 76.5% | 1.3 · +69,788 · -24,009 |
