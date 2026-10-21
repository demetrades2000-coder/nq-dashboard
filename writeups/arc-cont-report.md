# CONT report: ICT / smart-money continuation model on NQ and ES (Fri 2026-10-16)

## Bottom line
**None of the 3 published variants is good enough to build into the bot.**

| variant | what happened |
|---|---|
| `FVG` (classic resting limit at the FVG midpoint) | About 2 trades a week, but it **loses on both NQ and ES**, even before costs. |
| `IFVG` (confirmation entry) | Trades only **0.1 times a week**: about 5 trades a year. |
| `IFVG_AMPM` (best of the three) | Trades 0.3–0.5 times a week. Average R is roughly zero (NQ 5-year **+0.15R, 95% CI [-0.13, +0.45]**). It does not beat the zero-edge 50K eval baseline by the required 10 points, and it breaks the owner's 1–4 trades a week rule. |

At most, `IFVG_AMPM` could be **paper-traded** as a low-frequency add-on.

## Data and protocol
**Data**
- **TradingView CME futures only:** NQ1! (Oct 2021 – 2026-10-16 16:55 ET) and ES1! (Apr 2025 – 2026-10-16 16:55 ET). No CFD, no Yahoo.
- The files were refreshed at about 18:05 ET. Every scored number below comes from a fresh process run after that refresh (last bar checked: 2026-10-16 16:55 ET).

**Pre-registration and scoring**
- The rules and the 3 variants were written in `research/lab/CONT_RULES.md` before any test. They were run exactly once each. No parameter search: the 3 variants below are everything that was run.
- Scorecard: `tools/strategy_lab.score`. Costs: MNQ $2/pt, MES $5/pt, $1.40 per micro round trip, 1 tick of slippage on market entries and on stop and time exits. Risk is $350 fixed, at most 40 micros.

**Checks**
- 1H bars built from 5m match TradingView's 1H bars (368 of 368).
- Truncating the data right after each entry reproduces every entry, so there is no lookahead.

## Rules in brief (long side; shorts mirror)
1. **HTF trend.** The direction of the last **1H** close through the latest confirmed ICT 3-candle swing (BOS). A 1H bar counts only after it closes.
2. **Impulse leg.** From the BOS origin to the extreme since; EQ is its 50% level. Longs only from **discount**.
3. **Killzone.** Entries 09:30–11:00 ET; `IFVG_AMPM` adds 13:30–15:00.
4. **Pullback.** It must reach EQ and tap a **discount FVG** of the leg (5m FVG at least 3 pts NQ / 0.75 pt ES).
5. **Entry.**
   - `FVG`: resting limit at the FVG midpoint (CE); stop 2 ticks beyond the FVG's far edge.
   - `IFVG`: market on the first 5m close through a bearish FVG left by the pullback (inversion); stop 2 ticks beyond the pullback swing.
6. **Target.** The leg's **old high** (external liquidity). Skip the trade if it pays less than **2R**.
7. **Risk.** $350 per trade, at most 2 trades a day, stop for the day after a winner or 2 losers, -$700 daily stop, flat at 15:55 ET.

## Results: NQ (MNQ)
| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % (zero-edge) |
|---|---|---:|---:|---:|---|---:|---:|---:|---|
| FVG | ytd | 91 | 2.21 | 3.3 | -0.432 [-1.18, +0.53] | 0.69 | -9,625 | -20,718 | 23.0 (35.6) |
| FVG | aug_oct | 20 | 1.82 | 5.0 | +0.534 [-1.21, +3.97] | 1.68 | +4,563 | -6,082 | 35.0 (22.5) |
| FVG | y2025 | 78 | 2.10 | 6.4 | -0.289 [-1.10, +0.82] | 0.80 | -5,060 | -18,330 | 6.8 (16.5) |
| FVG | all18m | 169 | 2.16 | 4.7 | -0.366 [-0.95, +0.40] | 0.74 | -14,685 | -27,710 | 14.9 (26.0) |
| IFVG | ytd | 6 | 0.15 | 33.3 | +0.197 [-1.02, +1.52] | 1.25 | +286 | -662 | n/a* |
| IFVG | aug_oct | 3 | 0.27 | 33.3 | +0.311 (n<5) | 1.32 | +206 | -327 | n/a* |
| IFVG | y2025 | 3 | 0.08 | 66.7 | +1.187 (n<5) | 4.68 | +889 | -242 | n/a* |
| IFVG | all18m | 9 | 0.11 | 44.4 | +0.527 [-0.65, +1.67] | 1.84 | +1,175 | -662 | n/a* |
| **IFVG_AMPM** | ytd | 20 | 0.49 | 45.0 | +0.104 [-0.38, +0.63] | 1.22 | +507 | -1,200 | n/a* |
| **IFVG_AMPM** | aug_oct | 6 | 0.55 | 33.3 | +0.339 [-0.70, +1.51] | 1.77 | +527 | -359 | n/a* |
| **IFVG_AMPM** | y2025 | 11 | 0.30 | 27.3 | -0.028 [-0.74, +0.82] | 0.92 | -139 | -1,238 | n/a* |
| **IFVG_AMPM** | all18m | 31 | 0.40 | 38.7 | +0.057 [-0.34, +0.49] | 1.09 | +368 | -1,238 | n/a* |

## Results: ES (MES)
| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % (zero-edge) |
|---|---|---:|---:|---:|---|---:|---:|---:|---|
| FVG | ytd | 80 | 1.94 | 8.8 | -0.152 [-1.01, +0.93] | 0.94 | -1,728 | -14,451 | 19.5 (20.1) |
| FVG | aug_oct | 15 | 1.36 | 13.3 | -0.378 [-1.28, +1.06] | 0.47 | -2,789 | -2,789 | 0.0 (n/a) |
| FVG | y2025 | 66 | 1.77 | 4.5 | -0.840 [-1.38, +0.07] | 0.32 | -15,656 | -15,656 | 10.3 (29.9) |
| FVG | all18m | 146 | 1.86 | 6.8 | -0.463 [-1.03, +0.28] | 0.66 | -17,384 | -19,969 | 14.6 (21.7) |
| IFVG | ytd | 4 | 0.10 | 75.0 | +1.395 (n<5) | 6.28 | +1,786 | -338 | n/a* |
| IFVG | aug_oct | 1 | 0.09 | 100 | +1.487 (n<5) | – | +456 | 0 | n/a* |
| IFVG | y2025 | 1 | 0.03 | 0.0 | -1.044 (n<5) | 0.00 | -278 | -278 | n/a* |
| IFVG | all18m | 5 | 0.06 | 60.0 | +0.908 [-0.55, +2.37] | 3.45 | +1,508 | -338 | n/a* |
| **IFVG_AMPM** | ytd | 17 | 0.41 | 41.2 | +0.050 [-0.49, +0.64] | 1.13 | +331 | -1,009 | n/a* |
| **IFVG_AMPM** | aug_oct | 2 | 0.18 | 50.0 | +0.210 (n<5) | 1.48 | +148 | -307 | n/a* |
| **IFVG_AMPM** | y2025 | 6 | 0.16 | 33.3 | -0.409 [-1.06, +0.36] | 0.45 | -694 | -996 | n/a* |
| **IFVG_AMPM** | all18m | 23 | 0.29 | 39.1 | -0.070 [-0.53, +0.43] | 0.90 | -363 | -1,312 | n/a* |

\* No rolling 50K eval finished inside the window. At 0.1–0.5 trades a week with $350 risk, the account reaches neither +$3,000 nor -$2,000, so the pass rate is undefined. The gate also fails on trades a week (needs 2–5).

**Extra out-of-sample check, NQ only, same rules (2021-11 .. 2026-10):**

| variant | span | trades | /wk | avg R [95% CI] | PF | net $ | max DD $ | 50K pass (zero-edge) | sessions to pass |
|---|---|---:|---:|---|---:|---:|---:|---|---|
| FVG | 2021-11..2025-04 | 358 | 2.0 | **-0.49 [-0.86, -0.05]** | 0.58 | -49,608 | -68,951 | 11.0% (17.8%) | – |
| IFVG | 5 years | 25 | 0.10 | +0.35 [-0.26, +0.99] | 1.50 | +2,005 | -890 | none finished | – |
| IFVG_AMPM | 5 years | 85 | 0.33 | +0.15 [-0.13, +0.45] | 1.25 | +3,100 | -2,977 | 11.4% (6.5%) | 211 (avg) |

## 2026 monthly net $ (trades)
| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| NQ FVG | -3,393 (10) | +1,325 (9) | -4,325 (12) | -2,360 (7) | +3,598 (8) | -4,809 (13) | -4,223 (12) | -3,035 (8) | +7,971 (11) | -372 (1) |
| NQ IFVG | 0 (0) | 0 (0) | -182 (1) | +598 (1) | -336 (1) | 0 (0) | 0 (0) | -327 (1) | +532 (2) | 0 (0) |
| NQ IFVG_AMPM | +384 (2) | 0 (0) | -182 (1) | +652 (5) | -238 (2) | -557 (2) | -79 (2) | +36 (2) | +532 (2) | -42 (2) |
| ES FVG | +705 (9) | +7,457 (7) | -3,367 (9) | -3,768 (10) | +2,226 (5) | -3,665 (10) | +1,473 (15) | -2,344 (6) | -2 (8) | -443 (1) |
| ES IFVG | +849 (1) | 0 (0) | 0 (0) | +482 (2) | 0 (0) | 0 (0) | 0 (0) | 0 (0) | +456 (1) | 0 (0) |
| ES IFVG_AMPM | -124 (5) | 0 (0) | +226 (2) | +782 (4) | 0 (0) | -300 (1) | -401 (3) | -307 (1) | +456 (1) | 0 (0) |

## Why each variant fails
**FVG: tight stops, no edge, heavy costs.**
- A stop 2 ticks past the far edge of a 5m FVG is tiny. The median stop is 5.25 pts on NQ and 1.75 pts on ES, well inside one 5m bar's noise.
- So trades are either stopped almost at once or reach a 15–70R old high: 161 stops and 8 targets on NQ.
- It is negative **before** costs: all18m gross avg R is -0.17 (NQ) and -0.14 (ES).
- The tiny stops push size to the 40-micro cap (average 28–33 micros), so costs add $52 (NQ) and $84 (ES) per trade, about 0.2–0.3R.
- On NQ 2021–25 it is significantly negative (CI excludes 0).
- Its one good stretch (NQ Aug–Oct, +$4.6k) is one or two 20R+ winners out of 20 trades.

**IFVG: the published constraints make it rare.**
- In 2026 (NQ, AM+PM), 144 of 205 killzone days had a pullback in discount that tapped a discount FVG, and 77 had an inversion signal.
- On 64 of those 77 days, the old high was less than 2R away. Rules 7 and 8 cause this: the stop sits under the pullback swing (median about 70 pts NQ / 12.5 pts ES, on legs with a median of 391 / 90 pts), and the first inversion usually comes well after the low.
- ES is the same: 69 of 77 inversion days fail the 2R test.
- The trades that remain are about breakeven to slightly positive, but too few to tell from zero.

## Caveats
- **Interpretation choices** (all fixed before testing; see CONT_RULES.md): ICT 3-candle swings on 1H, 1H (not 4H) bias, 09:30 (not 08:30) start, discount plus FVG tap, a 3.0 / 0.75 pt FVG floor, a 2-tick stop buffer.
- **Not tested** (each would be a new pre-registered test, not a tweak): 4H bias, OTE depth, CISD/MSS confirmation, breakers and the Unicorn model, a leg-origin stop for limit entries, the London killzone.
- **Human discretion is not modeled.** Discretionary ICT traders filter by narrative (news, SMT, daily bias, which FVG looks "clean"). This tests the mechanical core of the model as published.
- **IFVG samples are small** (5–31 trades in 18 months); the confidence intervals are wide.
- **Roll days.** NQ1!/ES1! continuous contracts are not back-adjusted, so a roll day can create a fake gap or BOS (4 rolls a year).
- **ES data starts 2025-04-13**, so the first days of ES y2025 have little 1H structure history.
- **Confirm log.** The ytd scorecards were appended to `confirm_log.csv` (6 rows), as `score()` does for ytd runs.

## Files
- `tools/lab_models/continuation.py`: the model (`NAME`, `PARAMS`, `VARIANTS`, `run`, `state`). Default = `IFVG_AMPM`.
- `tools/lab_cont_run.py`: scores every variant. `tools/lab_cont_ana.py`: the tables and diagnostics. `tools/lab_cont_check.py`: 1H parity, causality, funnel, trade walkthrough.
- `research/lab/CONT_RULES.md`: the rules and sources. `research/lab/CONT_<SYM>_<VARIANT>__<period>.json`: the scorecards. `research/lab/CONT_trades/`: every trade. `research/lab/CONT_summary.json`.
