# ATM report: the owner's ATM model on NQ futures (5m), 2026-10-16

| | |
|---|---|
| **Rules** | `research/lab/ATM_RULES.md` (the owner's words, plain rules, the exact mechanical definitions, the confluences, the tiers and the variant list) |
| **Model** | `tools/lab_models/atm.py` (`run`, `run_raw`, `build_all`, `state`; timeframe is a parameter) |
| **Runner** | `tools/lab_atm_run.py` (`smoke` = dev-only mechanics check, unscored; `all` = the one scored batch; `diag` = the no-skip diagnostic; `report` = these tables) |
| **Output** | `research/lab/ATM_results.json`, `research/lab/ATM_diag.json`, `research/lab/ATM_trades_<variant>_<flat\|tier>.json`, scorecards `research/lab/ATM_<variant>_<scheme>__<period>.json` |
| **Data** | TradingView CME NQ1! 5m, with ES1! 5m for SMT, 2025-04-14..2026-10-16. No CFD, no Yahoo. |

## Verdict, 1m/3m version (added 19:30 ET; section 9)

**On the owner's own timeframe ladder (TradingView 1m, with the 5m → 3m → 1m "highest IFVG" rule), the model trades about
8× more often than on 5m. It still has no edge.**

- **Data.** 2026 only (206 sessions; there is no 1m data for 2025). The 1m file matches the TradingView 5m file bar for
  bar.
- **Base, flat $350, 2026 YTD:**
  - 57 trades, 1.38 a week, 33% wins
  - avg R +0.02 [−0.35, +0.45], PF 1.04, net **+$431**
  - max DD **−$3,968**, twice the $2k MLL
  - 50K pass 22.8%, against a zero-edge baseline of 22.8%
- **Base by period:**
  - dev **+$2,400** (PF 1.36, max DD −$1,999)
  - confirm **−$1,969** (PF 0.51)
  - aug_oct **−$1,710**
  - April alone made +$2,507, and 5 of the 10 months lost.
- **All 6 pre-registered variants make money on dev and lose on confirm.** The best on dev is `m1_nbars6` (V within 6
  bars of the trigger frame):
  - dev **+$2,927** (PF 1.52)
  - confirm **−$1,280** (PF 0.61)
  - ytd **+$1,647** (PF 1.19, 1.17 a week, max DD −$3,336)
  - aug_oct **−$1,020**
- **Only `m1_rr1` (skip below 1R) reaches the owner's 2–5 a week** (2.31 a week). It loses: ytd −$1,532, confirm
  −$3,615.
- **The tiers fail the pre-registered rank test.** On dev the C tier beats A, and ρ = +0.19 with p = 0.15. Tiered
  sizing pushes max DD to −$3.3k–$5.9k, a fail in every period. A does beat B in most periods, which is a hint for a
  future pre-registered test, not a rule.

## Verdict, 5m version (first pass)

**On 5m bars, the owner's rules taken literally almost never line up. They do not show an edge, and they trade far too
rarely for the eval.**

1. **Frequency is the problem.** The base takes 11 trades in 18 months: 0.17 a week in 2026 and 0.11 in 2025, against
   the owner's 2–5. No documented variant gets above 0.55 a week. No 50K eval could even finish on so few trades, so
   every pass rate is n/a.
2. **The numbers are noise.** Base, flat $350:

   | period | trades | net | 95% CI on avg R |
   |---|---:|---:|---|
   | ytd | 7 | **+$215** | −0.71 to +1.02 |
   | dev | 5 | **+$264** | |
   | confirm | 2 | **−$49** | |
   | aug_oct | 2 | **−$49** | |
   | y2025 | 4 | **+$69** | |

   The best variant on dev is `rr1` (skip only below 1R). It makes +$589 on dev and then loses everywhere else: confirm
   −$956, ytd −$367, aug_oct −$726, y2025 −$136.
3. **Why so few: the 5m geometry fights the 1.5R rule.**
   - Price sweeps one side of the 07:00–09:25 range on 97% of days, and the strong-V + IFVG signal fires 116 times
     (about 1.5 a week).
   - But 105 of those 116 are skipped because the opposite side is under 1.5R away.
   - On 5m, "the last swing before the sweep" is usually near the far side of the range. The median sweep leg is
     116 pts, 1.07× the median ATM range of 124 pts.
   - So "close back past 50% of the leg" puts the entry mid-range, with the stop at the extreme. The median stop is
     102 pts and the median R:R to the target is 0.74. Only 13% of signals offer 1.5R or more.
4. **The signal itself has no edge on 5m either.** This is a diagnostic, not a candidate: take every signal with no R:R
   skip. That gives 91 trades (1.1–1.4 a week).
   - avg R: −0.05 (ytd), −0.04 (y2025)
   - PF: 0.82 / 0.96
   - net: −$919 / −$205
   - 50K pass in 2025: 97.8% against a zero-edge baseline of 98.1%
5. **Tiered sizing does not beat flat, and the confluence score does not rank trades.** Spearman ρ between score and R,
   with the one-sided p:

   | period | ρ | p |
   |---|---:|---:|
   | dev | −0.27 | 0.92 |
   | confirm | +0.04 | 0.44 |
   | ytd | −0.19 | 0.90 |
   | y2025 | +0.07 | 0.33 |

   - The "1 full NQ" branch never triggers on 5m: it needs a stop ≤ 35 pts, and only 1% of signals have one. So tier A
     is $700 of micros, double risk on trades that are no better.
   - On the 91-trade diagnostic set, tiered sizing returns ytd −$1,285 with a −$2,157 max DD, against flat −$919 with
     −$1,781. That breaks the $2k MLL, so it is **a fail**.
   - In y2025 tiered shows +$1,030 against flat −$205, but with a −$2,477 max DD: **also a fail**.
6. **1m/3m data would very likely change the trade count, but not obviously the edge.** On 1–3m charts the last swing
   before the sweep sits much closer to the extreme. The 50% retrace and the IFVG come earlier, R shrinks, and many more
   setups would clear 1.5R. Whether they make money cannot be told from 5m: the 5m signal is flat, and this project
   found 1m execution worse than 5m for the engine. See section 6.

**Recommendation:**
- Do not put the 5m ATM model on the bot for money, and do not use the tiered sizing on it.
- If the owner wants a fair test of the model as he trades it, the lead should harvest a TradingView NQ1!/ES1! 1m export
  for Jan–Oct 2026 and rerun `atm.py` with `tf=1` (and a 3m frame built from it). The code is ready for that.

## 1. What was tested

- **The rules.** `research/lab/ATM_RULES.md` gives the owner's rules literally. Mechanical definitions were fixed before
  any scored run.
- **The variants.** Exactly 10 configurations: the base plus 9 one-change variants, which are exactly what the brief
  asked to test:
  - V window: N = 4 / 8 bars
  - retrace: 61.8%
  - target: (b) first clear pool; (c) half at the pool plus a runner with BE
  - skip threshold: 1R / 2R
  - 2 trades a day
  - entries until 11:00
- **Scoring.** Each configuration was scored with flat $350 sizing and the owner's A/B/C tiers, on dev, confirm, ytd,
  aug_oct and y2025.
- **The diagnostic.** It removes the owner's skip rule, so it is reported only to judge the entry signal and the score.
  It was never a candidate and was never selected.

**What was logged.** All 22 lines × 5 periods were scored once, in one batch each, through `strategy_lab.score`, and
logged in `confirm_log.csv`. This is more confirm runs than PROTOCOL.md's 3 per track, as the lead's brief required.
Nothing was tuned after a confirm number was seen: the only pre-batch runs were two unscored dev mechanics checks (the
funnel and the failure reasons). The best variant is picked by dev net only.

**Checks done.**
- One trade (2026-03-12 long) was traced bar by bar against the raw 5m data: sweep, leg origin, 50% level,
  displacement, the inverted FVG, the stop, and 1.52R to the target. It matches the code.
- Causality:
  - HTF bars are used only after their clock period closes.
  - Swings are used only after they are confirmed.
  - ES is read only up to the signal bar.
  - Exits start on the bar after entry, with the stop first on a tie.

**Costs:**
- MNQ $2/pt; 1 NQ = 10 MNQ
- $1.40 round trip per micro
- 1 tick of slippage on the market entry and on stop, BE and time exits
- The target limit sits 1 tick inside the ATM level and fills only when price reaches the level. That is stricter than
  a fill on touch.

## 2. Headline: base and best variant (dev-selected), both sizing schemes

| line | sizing | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % (zero-edge) |
|---|---|---|---:|---:|---:|---|---:|---:|---:|---|
| base | flat | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.71, +1.02] | 1.25 | +215 | -511 | n/a |
| base | flat | dev | 5 | 0.20 | 40.0 | +0.213 [-0.87, +1.30] | 1.44 | +264 | -304 | n/a |
| base | flat | confirm | 2 | 0.13 | 50.0 | -0.048 | 0.82 | -49 | -272 | n/a |
| base | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 | 0.82 | -49 | -272 | n/a |
| base | flat | y2025 | 4 | 0.11 | 50.0 | -0.130 | 1.17 | +69 | -418 | n/a |
| base | tier | ytd | 7 | 0.17 | 42.9 | +0.139 | 0.64 | -429 | -652 | n/a |
| base | tier | dev | 5 | 0.20 | 40.0 | +0.213 | 0.58 | -380 | -609 | n/a |
| base | tier | confirm | 2 | 0.13 | 50.0 | -0.048 | 0.82 | -49 | -272 | n/a |
| base | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 | 0.82 | -49 | -272 | n/a |
| base | tier | y2025 | 4 | 0.11 | 50.0 | -0.130 | 2.32 | +551 | -418 | n/a |
| **rr1** (best dev) | flat | ytd | 15 | 0.36 | 40.0 | -0.071 [-0.61, +0.50] | 0.82 | -367 | -1,185 | n/a |
| rr1 | flat | dev | 8 | 0.31 | 50.0 | +0.335 [-0.50, +1.16] | 1.71 | +589 | -304 | n/a |
| rr1 | flat | confirm | 7 | 0.45 | 28.6 | -0.535 [-0.98, +0.05] | 0.22 | -956 | -956 | n/a |
| rr1 | flat | aug_oct | 6 | 0.55 | 33.3 | -0.496 [-1.02, +0.15] | 0.27 | -726 | -768 | n/a |
| rr1 | flat | y2025 | 13 | 0.35 | 46.2 | -0.096 [-0.64, +0.49] | 0.93 | -136 | -996 | n/a |
| rr1 | tier | ytd | 15 | 0.36 | 40.0 | -0.071 | 0.89 | -320 | -1,601 | n/a |
| rr1 | tier | dev | 8 | 0.31 | 50.0 | +0.335 | 1.37 | +594 | -687 | n/a |
| rr1 | tier | confirm | 7 | 0.45 | 28.6 | -0.535 | 0.25 | -914 | -914 | n/a |
| rr1 | tier | aug_oct | 6 | 0.55 | 33.3 | -0.496 | 0.31 | -685 | -768 | n/a |
| rr1 | tier | y2025 | 13 | 0.35 | 46.2 | -0.096 | 1.04 | +106 | -996 | n/a |

- "n/a" = no rolling 50K eval reached +$3,000 or −$2,000 inside the window. With 0.1–0.5 trades a week, it never can.
- Every line fails the lab gate on frequency (2–5/wk).
- No line's 95% CI on avg R excludes 0.

## 3. Funnel (where the setups go), 2025-04-14..2026-10-16

| variant | days | days swept | armed | V expired: no close back inside | no IFVG | no displacement | no retrace | fell back | signals | skipped < min R | skipped size | trades |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | 395 | 384 | 371 | 127 | 48 | 11 | 9 | 14 | 116 | 105 | 0 | 11 |
| n4 | 395 | 384 | 371 | 192 | 60 | 23 | 15 | 11 | 105 | 96 | 0 | 9 |
| n8 | 395 | 384 | 371 | 80 | 39 | 7 | 5 | 11 | 123 | 110 | 0 | 13 |
| x618 | 395 | 384 | 371 | 127 | 42 | 11 | 32 | 11 | 100 | 93 | 0 | 7 |
| tgt_first | 395 | 384 | 371 | 127 | 48 | 11 | 9 | 14 | 116 | 105 | 0 | 11 |
| tgt_half | 395 | 384 | 371 | 127 | 48 | 11 | 9 | 14 | 116 | 105 | 0 | 11 |
| rr1 | 395 | 384 | 371 | 125 | 48 | 11 | 9 | 14 | 114 | 83 | 3 | 28 |
| rr2 | 395 | 384 | 371 | 130 | 48 | 11 | 9 | 14 | 117 | 115 | 0 | 2 |
| two_a_day | 395 | 384 | 374 | 130 | 48 | 11 | 9 | 14 | 117 | 105 | 0 | 12 |
| win1100 | 395 | 381 | 368 | 79 | 42 | 10 | 6 | 12 | 109 | 100 | 0 | 9 |
| diag_noskip | 395 | 384 | 371 | 122 | 47 | 11 | 8 | 14 | 111 | 0 | 20 | 91 |

How to read it:

- "Armed" counts each sweep.
- "V expired" counts are by the first failed check at the last bar of the V window. A sweep can re-arm on a new extreme,
  so the columns do not add up to "armed".
- "Signals" = V + IFVG done.

What it shows:

- **The sweep is not the bottleneck.** 97% of days take one side of the range by 11:30.
- **The V removes about two-thirds of sweeps.** Most simply keep going: 127 never close back inside within 6 bars.
- **The 1.5R skip removes 90% of what is left.**
- **The target variants (b) and (c) are identical to the base on every 2026 trade.** Only 1 of the 11 base trades had a
  clear pool (Asia/London/PD/prior-RTH level or EQH) ≥ 1R from entry, a clean path, and below the opposite side. That
  one trade is in 2025.

**R:R at the signal.** For all 5m signals (diagnostic set, n=91):
- median ATM range 124 pts
- median sweep leg 116.5 pts (1.07× the range)
- median stop 102 pts (0.82× the range)
- median R:R to the opposite side 0.74
- signals with R:R ≥ 1.5: 13%
- signals with a stop ≤ 35 pts (where tier A could buy 1 NQ): 1%

Avg R by R:R bucket (diagnostic, flat):

| period | <1.0 | 1.0–1.5 | 1.5–2.0 | ≥2.0 |
|---|---|---|---|---|
| dev | 21 / -0.10 | 3 / +0.54 | 5 / +0.21 | 0 |
| confirm | 10 / +0.09 | 5 / -0.73 | 1 / -1.02 | 1 / +0.92 |
| ytd | 31 / -0.04 | 8 / -0.25 | 6 / +0.01 | 1 / +0.92 |
| y2025 | 32 / -0.01 | 8 / +0.04 | 4 / -0.39 | 1 / +0.01 |

The skip rule does not separate good trades from bad ones either. The samples are tiny.

## 4. 2026 by month (trades / net $)

| line | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct (to 16th) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base flat | 0 | 0 | 3 / -7 | 2 / +271 | 0 | 0 | 0 | 1 / -272 | 0 | 1 / +223 |
| base tier | 0 | 0 | 3 / -311 | 2 / -69 | 0 | 0 | 0 | 1 / -272 | 0 | 1 / +223 |
| rr1 flat | 0 | 0 | 4 / +280 | 3 / +537 | 0 | 1 / -229 | 1 / -229 | 2 / -230 | 2 / -457 | 2 / -39 |
| rr1 tier | 0 | 0 | 4 / +551 | 3 / +729 | 0 | 1 / -687 | 1 / -229 | 2 / -189 | 2 / -457 | 2 / -39 |
| diag_noskip flat | 4 / -748 | 4 / +84 | 8 / +607 | 5 / +471 | 6 / +111 | 2 / -479 | 2 / -160 | 5 / +128 | 5 / -386 | 5 / -548 |
| diag_noskip tier | 4 / -1,370 | 4 / +414 | 8 / +759 | 5 / +302 | 6 / +432 | 2 / -1,187 | 2 / -22 | 5 / +586 | 5 / -12 | 5 / -1,186 |

The base has 6 empty months out of 10.

## 5. Sizing: does the confidence score rank trades? (No.)

The score was defined before any result was seen (ATM_RULES.md, sections D and E):
- 1 point for each of the 8 confluences the owner listed
- A ≥ 5, B 3–4, C ≤ 2

| line | period | A: n / avg R / win % | B | C | net flat | net tier | Spearman ρ(score, R), one-sided p |
|---|---|---|---|---|---:|---:|---|
| base | dev | 1 / -1.02 / 0 | 3 / +0.10 / 33 | 1 / +1.77 / 100 | +264 | -380 | - |
| base | confirm | 0 | 1 / -1.02 / 0 | 1 / +0.92 / 100 | -49 | -49 | - |
| base | ytd | 1 / -1.02 / 0 | 4 / -0.17 / 25 | 2 / +1.34 / 100 | +215 | -429 | - |
| base | aug_oct | 0 | 1 / -1.02 / 0 | 1 / +0.92 / 100 | -49 | -49 | - |
| base | y2025 | 1 / +1.49 / 100 | 2 / -0.50 / 50 | 1 / -1.01 / 0 | +69 | +551 | - |
| rr1 | dev | 4 / +0.15 / 50 | 3 / +0.10 / 33 | 1 / +1.77 / 100 | +589 | +594 | - |
| rr1 | confirm | 1 / +0.16 / 100 | 4 / -0.95 / 0 | 2 / -0.04 / 50 | -956 | -914 | - |
| rr1 | ytd | 5 / +0.15 / 60 | 7 / -0.50 / 14 | 3 / +0.56 / 67 | -367 | -320 | - |
| rr1 | y2025 | 4 / +0.09 / 50 | 7 / +0.06 / 57 | 2 / -1.01 / 0 | -136 | +106 | - |
| diag_noskip | dev | 14 / -0.12 / 50 | 13 / -0.02 / 54 | 2 / +1.21 / 100 | +47 | -651 | -0.27, p 0.92 |
| diag_noskip | confirm | 8 / +0.09 / 75 | 7 / -0.49 / 29 | 2 / -0.04 / 50 | -966 | -634 | +0.04, p 0.44 |
| diag_noskip | ytd | 22 / -0.04 / 59 | 20 / -0.19 / 45 | 4 / +0.58 / 75 | -919 | -1,285 | -0.19, p 0.90 |
| diag_noskip | aug_oct | 7 / +0.06 / 71 | 6 / -0.45 / 33 | 2 / -0.04 / 50 | -806 | -611 | 0.00, p 0.51 |
| diag_noskip | y2025 | 22 / +0.12 / 73 | 18 / -0.15 / 50 | 5 / -0.30 / 40 | -205 | +1,030 | +0.07, p 0.33 |

**Drawdown and eval, by sizing scheme:**

| line | period | flat: max DD, pass % (zero-edge) | tier: max DD, pass % (zero-edge) |
|---|---|---|---|
| base | ytd | -511, n/a | -652, n/a |
| base | y2025 | -418, n/a | -418, n/a |
| diag_noskip | ytd | -1,781, n/a | **-2,157 (breaks the $2k MLL: fail)**, 0.0 (0.0) |
| diag_noskip | y2025 | -2,002 (breaks the $2k MLL: fail), 97.8 (98.1) | **-2,477 (fail)**, 55.7 (52.3) |

- The base worst day is −$304 flat and −$609 tiered. One trade a day can never reach the $1,000 DLL.

**Verdict on sizing:**

- **Ordering.** The tiers do not order the trades. A beats B in some periods, C beats A in others, and the sign of ρ
  flips between halves. This is the same finding as the project's earlier A..D grade.
- **Tier A in practice.** "1 NQ when confident" cannot happen on 5m, because the stops are too wide. Tier A turns into
  "double the risk", and that adds drawdown without adding expectancy.
- **Use flat.** Flat $350, or smaller, is the honest choice until a score is shown to rank trades on fresh data.

**Single confluences** on the diagnostic set (avg R with / without; n with), descriptive only:

| confluence | dev | confirm | y2025 |
|---|---|---|---|
| `trend_1h_with` | -0.06 / +0.08 (n 13) | -0.18 / -0.16 (n 3) | +0.07 / -0.14 (n 21) |
| `smt` | +0.27 / -0.12 (n 10) | +0.24 / -0.22 (n 2) | +0.34 / -0.13 (n 9) |
| `nq_rs_with` | -0.27 / +0.49 (n 18) | -0.21 / +0.03 (n 14) | -0.06 / -0.02 (n 19) |
| `open_loc_with` | -0.18 / +0.64 (n 22) | -0.17 / - (n 17) | -0.03 / -0.07 (n 33) |
| `ifvg_big` | -0.19 / +0.24 (n 15) | -0.07 / -0.23 (n 7) | -0.01 / -0.07 (n 24) |
| `v_fast` | -0.02 / +0.26 (n 25) | -0.14 / -0.29 (n 14) | +0.08 / -0.45 (n 35) |
| `lrlr` | -0.02 / +0.05 (n 14) | -0.03 / -0.31 (n 9) | -0.14 / +0.11 (n 27) |
| `tgt_pool` | -0.01 / +0.06 (n 18) | -0.36 / -0.08 (n 5) | -0.08 / +0.07 (n 31) |

- **SMT** is the only confluence on the right side in all three windows, by about +0.4–0.5R. But it has n = 10, 2
  and 9. MECH_REPORT found the same pattern (NQ+SMT the only positive line) and judged it noise. 21 trades over
  18 months cannot carry a filter or a size tier.
- **NQ relative strength and open location** point the wrong way in dev.

## 6. Would 1m/3m data matter? Probably yes for frequency; unknown for edge

**Update 19:30 ET: answered in section 9.** The TradingView 1m file arrived and was tested.
- Frequency: yes. The base goes from 0.17 to 1.38 trades a week.
- Edge: no. YTD avg R is +0.02, and confirm loses on every variant.

The text below is the reasoning from before the data existed. Its prediction (more trades, edge unknown) held.

**What we had at the time.**
- TradingView NQ1!/ES1! **5m** history only.
- `data/NQ_1m.csv` is a **Yahoo NQ=F** pull of about 4 weeks (`tools/data_audit.py build-1m`), so under the owner's
  data rule it was **not used**.
- A real 1m/3m test needs a TradingView 1m export of NQ1! and ES1!, ideally Jan–Oct 2026 (at least the dev half). The
  lead can harvest one with the existing Bar Replay / export tools if these 5m results are judged worth following up.

**Why the timeframe matters for this model in particular.**

- **The leg.** The owner reads the sweep leg on 1–3m. On 5m:
  - the last fractal swing before the extreme is usually the range's far side (median leg 1.07× the range)
  - so a 50% retrace means entering mid-range
  - with the stop at the extreme, the median R:R is only 0.74

  On 1–3m, the last swing before the sweep is usually a local lower high near the extreme. The 50% level and the first
  IFVG then come earlier and lower, so R shrinks and the opposite side is more R away. Many of the 105 signals the 1.5R
  rule skipped on 5m would plausibly qualify. This is reasoning from the 5m geometry, not a measurement.
- **The setup count.** 371 setups were armed in 18 months (about 4.7 a week). Even a fraction of them clearing the skip
  would put the model inside the owner's 2–5 a week.
- **Tier A.** With tighter stops, tier A could actually buy 1 NQ, since the stop would be ≤ 35 pts.
- **Edge is a separate question that 5m cannot answer.**
  - The 5m signal measured to the opposite side is flat: −0.05R ytd, −0.04R in 2025.
  - Earlier work in this project found 1m execution worse than 5m for the Liquidity Engine.
  - So expect more trades, but do not assume better trades.

**How to run it when the data exists.** `run_raw(bars('NQ','1m',...), {'tf': 1, 'v_bars': 6}, bars('ES','1m',...))`.
- `v_bars` counts bars. Use 30 on 1m to keep the 5m base's 30 minutes, or 6 to keep the owner's "6 bars" literally.
  Decide which before running.
- A 3m frame needs a `data/NQ_3m.csv` resampled from the 1m export.
- The owner's "take the highest timeframe that shows an IFVG" then needs a thin wrapper. Per sweep, it takes the 5m
  signal if the 5m V+IFVG fires, else 3m, else 1m. That wrapper is not built yet: the module runs one frame per call.

## 7. Every trade of the base (18 months, flat sizing; tier size in the MNQ column)

| day | side | entry | stop | stop pts | target (ATM side) | R:R | exit | exit kind | R | score / tier | MNQ flat / tier | confluences present |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|---|---|
| 2025-04-29 | short | 20995.00 | 21086.91 | 91.9 | 20845.50 | 1.63 | 21086.91 | stop | -1.01 | 2 / C | 1 / 1 | trend_1h_with, tgt_pool |
| 2025-05-22 | short | 22688.00 | 22802.44 | 114.4 | 22507.50 | 1.58 | 22802.44 | stop | -1.01 | 4 / B | 1 / 1 | open_loc_with, ifvg_big, lrlr, tgt_pool |
| 2025-08-14 | short | 25202.75 | 25257.83 | 55.1 | 25040.50 | 2.95 | 25200.75 | time | +0.01 | 3 / B | 3 / 3 | trend_1h_with, v_fast, tgt_pool |
| 2025-08-27 | long | 24786.75 | 24732.71 | 54.0 | 24868.25 | 1.51 | 24868.00 | target | +1.49 | 5 / A | 3 / 6 | smt, open_loc_with, ifvg_big, v_fast, tgt_pool |
| 2026-03-12 | long | 25579.75 | 25504.86 | 74.9 | 25693.75 | 1.52 | 25504.86 | stop | -1.02 | 5 / A | 2 / 4 | trend_1h_with, nq_rs_with, open_loc_with, v_fast, tgt_pool |
| 2026-03-19 | long | 24982.75 | 24872.37 | 110.4 | 25164.00 | 1.64 | 25163.75 | target | +1.63 | 3 / B | 1 / 1 | open_loc_with, v_fast, tgt_pool |
| 2026-03-24 | long | 24785.75 | 24679.32 | 106.4 | 24974.75 | 1.78 | 24755.50 | time | -0.29 | 4 / B | 1 / 1 | open_loc_with, ifvg_big, v_fast, tgt_pool |
| 2026-04-10 | short | 25898.50 | 25946.62 | 48.1 | 25812.25 | 1.79 | 25812.50 | target | +1.77 | 2 / C | 3 / 1 | smt, v_fast |
| 2026-04-13 | short | 25732.50 | 25791.06 | 58.6 | 25624.00 | 1.85 | 25791.06 | stop | -1.02 | 3 / B | 2 / 2 | nq_rs_with, open_loc_with, v_fast |
| 2026-08-17 | long | 30520.00 | 30453.20 | 66.8 | 30620.75 | 1.51 | 30453.20 | stop | -1.02 | 4 / B | 2 / 2 | nq_rs_with, open_loc_with, v_fast, tgt_pool |
| 2026-10-02 | short | 31166.00 | 31287.17 | 121.2 | 30913.25 | 2.09 | 31053.25 | time | +0.92 | 2 / C | 1 / 1 | open_loc_with, ifvg_big |

- Prices are back-adjusted to the current front month, as in `data/NQ_5m.csv`.
- Exits, 2026: 3 stops, 2 targets, 2 time exits at 15:55. In 2025: 2 stops, 1 target, 1 time exit.
- 5 of the 11 trades are 1-micro trades, with stops of 92–121 pts. That is why the average dollar risk in 2026 is
  $252, not $350.
- The owner can check these 11 days on his own 1–3m charts. If his discretionary entries on them look very different
  (earlier, tighter), that is the 1m/3m effect in section 6.

## 8. Caveats

1. **5m is not the owner's execution timeframe.** Read every number here as "the 5m approximation of the ATM model",
   not the model itself.
2. **Choices that are ours** (ATM_RULES.md):
   - the 09:25 candle is included in the range
   - the leg origin is a k=2 fractal
   - one draw per day (a side dies once its target is taken)
   - the V and the IFVG must both complete within N bars of the extreme
   - the confluence thresholds and the tier cut-offs

   The k=2 leg origin drives the R:R problem. A looser origin (k=1) would shorten legs and add trades. It was not run,
   to stay inside the 10-variant budget, and it would be a dev-tuned choice now that the funnel has been seen.
3. **Samples are tiny.** 11 base trades in 18 months, and 91 in the diagnostic. Every CI on avg R includes 0.
4. **ES was not run.** It was optional, and NQ already answers the question.

## 9. The 1m/3m version: the owner's timeframe ladder (scored 2026-10-16 19:25 ET)

**Rules:** `ATM_RULES.md` section G, written before any 1m result was seen. Code: `atm.run_raw_mtf` (or `atm.run` with
`tf=1`) and `tools/lab_atm_run.py all1m` / `report1m`. Results: `research/lab/ATM_results_1m.json`, with trades in
`research/lab/ATM_trades_m1_<variant>_<flat|tier>.json`.

**Gallery and trader layer (2026 trades, flat $350):**
- `research/lab/ATM_trades_1m_base.json` (57 trades)
- `research/lab/ATM_trades_1m_best.json` (`m1_nbars6`, 48 trades)

Each trade carries `trigger_tf`, the tier and score, and these fields under `info`:
- the ATM high and low
- sweep time; extreme time and price
- leg origin time and price
- the IFVG zone (`ifvg_lo` / `ifvg_hi`), its c1/c3 bar times and the inversion bar time

Bar times (`info.*_t`) are bar opens. `entry_t` / `exit_t` are bar closes.

**Data:**
- TradingView NQ1! 1m, `data/clean/NQ_1m_tv.csv` (= `data/NQ_1m.csv`; see `research/lab/DATA_1M.md`): 209 sessions,
  2025-12-29..2026-10-16.
- It was re-checked here: resampled to 5m it is identical to the TradingView 5m file on 57,303 of 57,303 bars.
- Coverage is complete for every 2026 period: dev 128/128 sessions, confirm 78/78, ytd 206/206, aug_oct 55/55. The
  scorecards are the normal logged `strategy_lab.score` ones.
- **There is no 1m data for 2025, so the 1m version has no y2025 line.**
- ES is the TradingView ES1! 5m file (there is no TradingView ES 1m), read only from closed bars.

**What changed from 5m.**
- **The ladder.** At every 1m close after the sweep, the latest closed 5m bar is checked first, then 3m, then 1m. The
  first frame with a complete V + IFVG triggers the entry.
- **On the trigger frame**, the leg, the V and the IFVG are all measured on that frame:
  - the V must complete within 30 minutes of the extreme (6 bars on 5m)
  - the stop stays beyond the sweep extreme, the owner's rule
- **Trigger frames.** In practice the 1m frame usually completes first. Of the 57 base trades in 2026, 46 triggered on
  1m, 10 on 3m and 1 on 5m.
- **Stops.** The median stop is 68 pts, against 75 pts for the 5m base trades and 102 pts for all 5m signals.
- **Entries.** They come 0–30 minutes after the extreme. About two-thirds of the signals still fail the 1.5R skip.

### 9.1 Headline (flat $350; tiered in 9.4)

| line | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | worst day $ | 50K pass % (zero-edge), completed evals |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---|
| m1_base | dev | 36 | 1.41 | 33.3 | +0.173 [-0.36, +0.75] | 1.36 | +2,400 | -1,999 | -354 | 100 (21.3), 42 |
| m1_base | confirm | 21 | 1.35 | 33.3 | -0.237 [-0.69, +0.27] | 0.51 | -1,969 | -2,489 | -358 | 0 (n/a), 56 |
| m1_base | ytd | 57 | 1.38 | 33.3 | +0.022 [-0.35, +0.45] | 1.04 | +431 | -3,968 | -358 | 22.8 (22.8), 184 |
| m1_base | aug_oct | 18 | 1.64 | 33.3 | -0.249 [-0.72, +0.29] | 0.50 | -1,710 | -2,489 | -358 | 0 (n/a), 33 |
| **m1_nbars6** (best on dev) | dev | 30 | 1.17 | 36.7 | +0.286 [-0.33, +0.97] | 1.52 | +2,927 | -2,056 | -354 | 60.8 (22.3), 74 |
| m1_nbars6 | confirm | 18 | 1.15 | 33.3 | -0.127 [-0.66, +0.41] | 0.61 | -1,280 | -1,764 | -358 | n/a, 0 |
| m1_nbars6 | ytd | 48 | 1.17 | 35.4 | +0.131 [-0.31, +0.60] | 1.19 | +1,647 | -3,336 | -358 | 38.8 (25.6), 116 |
| m1_nbars6 | aug_oct | 15 | 1.36 | 33.3 | -0.119 [-0.68, +0.48] | 0.63 | -1,020 | -1,764 | -358 | n/a, 0 |

How to read the eval columns:

- "100% of 42" on dev means: every rolling eval that started in Jan–Mar and finished inside dev passed. Evals started
  later did not finish by June 30, so they are not counted.
- Over the whole year the pass rate equals the zero-edge baseline (22.8% vs 22.8%). The year's +$431 does not beat
  luck.
- No line passes the lab gate:
  - every confirm line is net negative
  - no YTD line keeps max DD under $2,000
  - only `m1_rr1` makes 2–5 trades a week

### 9.2 All six pre-registered variants (flat $350)

| variant | dev net (PF) | confirm net (PF) | ytd: trades, /wk, win %, avg R, PF, net, max DD | aug_oct net (PF) |
|---|---|---|---|---|
| m1_base | +2,400 (1.36) | -1,969 (0.51) | 57, 1.38, 33.3, +0.022, 1.04, +431, -3,968 | -1,710 (0.50) |
| m1_rr1 (skip < 1R) | +2,083 (1.21) | -3,615 (0.46) | 95, 2.31, 36.8, -0.048, 0.91, -1,532, -4,426 | -3,022 (0.42) |
| m1_nbars6 (V within 6 trigger-frame bars) | +2,927 (1.52) | -1,280 (0.61) | 48, 1.17, 35.4, +0.131, 1.19, +1,647, -3,336 | -1,020 (0.63) |
| m1_tf5321 (ladder adds 2m) | +2,207 (1.32) | -1,212 (0.70) | 60, 1.46, 35.0, +0.055, 1.09, +995, -3,216 | -936 (0.73) |
| m1_tgt_half (half at the first clear pool, BE) | +1,636 (1.24) | -1,290 (0.65) | 57, 1.38, 36.8, +0.017, 1.03, +346, -3,289 | -1,031 (0.68) |
| m1_two_a_day | +2,667 (1.38) | -2,199 (0.54) | 63, 1.53, 33.3, +0.011, 1.04, +469, -3,930 | -1,692 (0.58) |

- The pattern is the same for all six: profitable Jan–Apr, losing May–Oct. No exit or frequency change fixes confirm.
- `m1_rr1` is the only line inside the owner's 2–5 a week. It is the worst on confirm.

### 9.3 Funnel, trigger frames and months

| variant | days ok | days swept | setups armed | signals 5m / 3m / 2m / 1m | skipped < min R | skipped size | trades 5m / 3m / 2m / 1m |
|---|---:|---:|---:|---|---:|---:|---|
| m1_base | 207 | 200 | 200 | 11 / 43 / 0 / 112 | 107 | 1 | 1 / 10 / 0 / 47 |
| m1_rr1 | 207 | 200 | 200 | 10 / 40 / 0 / 105 | 58 | 1 | 2 / 21 / 0 / 73 |
| m1_nbars6 | 207 | 200 | 200 | 16 / 46 / 0 / 87 | 100 | 1 | 1 / 12 / 0 / 35 |
| m1_tf5321 | 207 | 200 | 200 | 10 / 33 / 30 / 95 | 107 | 0 | 1 / 8 / 11 / 41 |
| m1_tgt_half | 207 | 200 | 200 | 11 / 43 / 0 / 112 | 107 | 1 | 1 / 10 / 0 / 47 |
| m1_two_a_day | 207 | 200 | 231 | 12 / 46 / 0 / 120 | 112 | 2 | 1 / 12 / 0 / 51 |

The funnel counts include the first sessions, 2025-12-30/31. The trade tables are 2026 only, which is why there are 57
base trades in 2026 against 58 in the funnel.

**By trigger frame** (m1_base, flat; n / avg R):

| period | 1m | 3m | 5m |
|---|---|---|---|
| dev | 28 / +0.14 | 7 / +0.47 | 1 / -1.02 |
| confirm | 18 / -0.25 | 3 / -0.17 | 0 |
| ytd | 46 / -0.01 | 10 / +0.28 | 1 / -1.02 |

- The 3m-triggered trades did better over the year, but on 10 trades, and they lost on confirm. This was not
  pre-registered, so it is an observation, not a filter.

**2026 by month, flat (trades / net $):**

| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct (to 16th) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| m1_base | 5 / +446 | 5 / +996 | 9 / +417 | 7 / +2,507 | 5 / -570 | 5 / -1,396 | 3 / -259 | 7 / +288 | 8 / -1,072 | 3 / -926 |
| m1_rr1 | 7 / -183 | 8 / +648 | 15 / -154 | 10 / +1,513 | 11 / +852 | 8 / -593 | 9 / -594 | 11 / -488 | 10 / -1,569 | 6 / -964 |
| m1_nbars6 | 5 / +446 | 5 / +996 | 7 / +680 | 6 / +2,861 | 2 / -660 | 5 / -1,396 | 3 / -259 | 7 / +252 | 6 / -680 | 2 / -592 |
| m1_tf5321 | 5 / +440 | 6 / +814 | 9 / +417 | 7 / +2,503 | 5 / -570 | 5 / -1,398 | 3 / -276 | 9 / +1,061 | 8 / -1,072 | 3 / -926 |
| m1_tgt_half | 5 / -33 | 5 / +936 | 9 / +353 | 7 / +2,346 | 5 / -570 | 5 / -1,396 | 3 / -259 | 7 / +967 | 8 / -1,072 | 3 / -926 |
| m1_two_a_day | 5 / +446 | 5 / +996 | 9 / +417 | 7 / +2,507 | 5 / -570 | 7 / -1,129 | 4 / -506 | 8 / +10 | 9 / -1,392 | 4 / -311 |

- April alone (+$2,507) is more than the base's whole-year net (+$431). Without April, 2026 is −$2,076.
- Exits for the base in 2026: 34 stops, 15 targets, 8 time exits at 15:55.

### 9.4 Sizing: flat vs tiers (the pre-registered rank test fails)

The G7 rule recommends tiers only if, on dev, avg R is ordered A > B > C **and** ρ(score, R) > 0 with one-sided
p < 0.10, and confirm does not reverse it.

| variant | period | A: n / avg R / win % | B | C | net flat | net tier | ρ, p |
|---|---|---|---|---|---:|---:|---|
| m1_base | dev | 17 / +0.28 / 41 | 15 / -0.19 / 20 | 4 / +1.08 / 50 | +2,400 | +2,726 | +0.19, 0.15 |
| m1_base | confirm | 12 / +0.03 / 42 | 6 / -0.37 / 33 | 3 / -1.01 / 0 | -1,969 | -1,335 | +0.01, 0.49 |
| m1_base | ytd | 29 / +0.17 / 41 | 21 / -0.24 / 24 | 7 / +0.18 / 29 | +431 | +1,391 | +0.12, 0.20 |
| m1_nbars6 | dev | 15 / +0.27 / 40 | 12 / -0.06 / 25 | 3 / +1.79 / 67 | +2,927 | +3,224 | +0.13, 0.25 |
| m1_nbars6 | confirm | 10 / +0.20 / 50 | 5 / -0.26 / 20 | 3 / -1.01 / 0 | -1,280 | -66 | -0.01, 0.51 |
| m1_nbars6 | ytd | 25 / +0.24 / 44 | 17 / -0.12 / 24 | 6 / +0.39 / 33 | +1,647 | +3,158 | +0.05, 0.38 |
| m1_tf5321 | dev | 19 / +0.31 / 42 | 14 / -0.32 / 14 | 4 / +1.08 / 50 | +2,207 | +2,912 | +0.22, 0.10 |
| m1_tf5321 | confirm | 13 / +0.15 / 46 | 8 / -0.29 / 38 | 2 / -1.02 / 0 | -1,212 | -91 | +0.07, 0.36 |
| m1_rr1 | dev | 28 / +0.25 / 50 | 26 / -0.12 / 31 | 5 / +0.66 / 40 | +2,083 | +3,358 | +0.16, 0.11 |
| m1_rr1 | confirm | 16 / -0.08 / 38 | 15 / -0.35 / 33 | 5 / -1.01 / 0 | -3,615 | -3,566 | -0.03, 0.58 |

The full tier table for all 6 variants is in `ATM_results_1m.json`.

**Max DD, flat → tiered (ytd):**

| variant | flat | tiered |
|---|---:|---:|
| m1_base | −3,968 | −4,990 |
| m1_rr1 | −4,426 | −5,917 |
| m1_nbars6 | −3,336 | −4,237 |
| m1_tf5321 | −3,216 | −4,315 |
| m1_tgt_half | −3,289 | −4,311 |
| m1_two_a_day | −3,930 | −5,260 |

On dev alone, tiered max DD is −$3.3k to −$3.7k for every variant. On confirm it is −$2.5k to −$4.8k.

**Verdict:** use **flat.**
- **The criterion fails.** On dev, the C tier (3–5 trades) beats A in every variant, and only `m1_tf5321` reaches
  p < 0.10.
- **Tiered sizing breaks the $2,000 MLL in every period of every variant.** The higher net it sometimes shows comes with
  that drawdown, so it counts as a fail.
- **A 1-NQ trade is now possible but rare.** Stops ≤ 35 pts happen on 1m, but still on few trades.
- **There is one consistent hint.** On 1m, the A tier (5 or more of the 8 confluences) beats the B tier in every period
  of the base. A two-level rule (A at $350, everything else smaller) would have to be pre-registered and tested on data
  not yet seen (2025 TradingView 1m, or forward paper) before it means anything.

**Single confluences** (m1_base, flat, avg R with / without; n with), descriptive only:

| confluence | dev | confirm |
|---|---|---|
| `trend_1h_with` | -0.16 / +0.41 (15) | +0.42 / -0.44 (5) |
| `smt` | +1.49 / -0.14 (7) | -0.22 / -0.24 (5) |
| `nq_rs_with` | -0.02 / +0.42 (20) | -0.39 / -0.12 (9) |
| `open_loc_with` | -0.05 / +0.95 (28) | -0.16 / -0.68 (18) |
| `ifvg_big` | +0.02 / +0.37 (20) | -0.00 / -0.62 (13) |
| `v_fast` | +0.29 / -0.78 (32) | -0.13 / -0.69 (17) |
| `lrlr` | +0.84 / -0.12 (11) | +0.00 / -0.39 (8) |
| `tgt_pool` | +0.20 / +0.12 (23) | -0.45 / +0.29 (15) |

- Only `v_fast` (a fast reclaim) and `lrlr` (a clean path to the target) are on the right side in both halves.
- Their "without" groups are tiny (4 trades without `v_fast` in dev), and 8 features were looked at. This is not
  evidence. If anything is carried forward, it should be pre-registered as one rule and tested on unseen data.

### 9.5 What the 1m result means for the owner

1. **The 5m test was too strict, as suspected.** On the 1m ladder the setup appears about 1.4 times a week, and 2.3
   times with a 1R skip. That matches how often a discretionary trader would see it.
2. **The trades it takes do not make money over 2026.** About one in three wins, roughly at the 2R-ish payoff, so it
   breaks even. All of the year's profit came in Feb–Apr, and all 6 variants lose from July on.
3. **The drawdown is too deep for the 50K eval.** Every variant's 2026 max DD is $3.2k–$4.4k with flat $350, against a
   $2,000 trailing limit. The owner's tiered sizing makes it deeper ($4.2k–$5.9k).
4. **Recommendation:**
   - Do not automate the ATM model for money, and do not use the tiers.
   - If the owner wants to keep it, run `m1_base` on paper beside his own discretionary entries for a few weeks.
   - The 57 trades in `ATM_trades_1m_base.json` (and the 11 5m trades in section 7) show where the mechanical version
     enters. Where his entries differ is the discretion that the rules do not capture.
   - A real holdout would need TradingView 1m for 2025.

### 9.6 Appendix: 1m variants, every covered period, both sizing schemes

| variant | sizing | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | worst day $ | 50K pass % (zero-edge) |
|---|---|---|---:|---:|---:|---|---:|---:|---:|---:|---|
| m1_base | flat | dev | 36 | 1.41 | 33.3 | +0.173 [-0.355, 0.751] | 1.36 | +2,400 | -1,999 | -354 | 100.0 (21.3) |
| m1_base | flat | confirm | 21 | 1.35 | 33.3 | -0.237 [-0.685, 0.265] | 0.51 | -1,969 | -2,489 | -358 | 0.0 (None) |
| m1_base | flat | ytd | 57 | 1.38 | 33.3 | +0.022 [-0.352, 0.45] | 1.04 | +431 | -3,968 | -358 | 22.8 (22.8) |
| m1_base | flat | aug_oct | 18 | 1.64 | 33.3 | -0.249 [-0.715, 0.293] | 0.5 | -1,710 | -2,489 | -358 | 0.0 (None) |
| m1_rr1 | flat | dev | 59 | 2.3 | 40.7 | +0.122 [-0.239, 0.524] | 1.21 | +2,083 | -2,415 | -354 | 64.0 (1.9) |
| m1_rr1 | flat | confirm | 36 | 2.31 | 30.6 | -0.326 [-0.646, 0.025] | 0.46 | -3,615 | -3,718 | -358 | 0.0 (None) |
| m1_rr1 | flat | ytd | 95 | 2.31 | 36.8 | -0.048 [-0.309, 0.23] | 0.91 | -1,532 | -4,426 | -358 | 17.4 (23.1) |
| m1_rr1 | flat | aug_oct | 27 | 2.45 | 29.6 | -0.370 [-0.727, 0.033] | 0.42 | -3,022 | -3,718 | -358 | 0.0 (None) |
| m1_nbars6 | flat | dev | 30 | 1.17 | 36.7 | +0.286 [-0.332, 0.972] | 1.52 | +2,927 | -2,056 | -354 | 60.8 (22.3) |
| m1_nbars6 | flat | confirm | 18 | 1.15 | 33.3 | -0.127 [-0.661, 0.413] | 0.61 | -1,280 | -1,764 | -358 | n/a |
| m1_nbars6 | flat | ytd | 48 | 1.17 | 35.4 | +0.131 [-0.309, 0.6] | 1.19 | +1,647 | -3,336 | -358 | 38.8 (25.6) |
| m1_nbars6 | flat | aug_oct | 15 | 1.36 | 33.3 | -0.119 [-0.676, 0.477] | 0.63 | -1,020 | -1,764 | -358 | n/a |
| m1_tf5321 | flat | dev | 37 | 1.45 | 32.4 | +0.153 [-0.359, 0.724] | 1.32 | +2,207 | -2,004 | -357 | 73.7 (22.3) |
| m1_tf5321 | flat | confirm | 23 | 1.47 | 39.1 | -0.104 [-0.552, 0.371] | 0.7 | -1,212 | -2,489 | -358 | 0.0 (None) |
| m1_tf5321 | flat | ytd | 60 | 1.46 | 35.0 | +0.055 [-0.304, 0.45] | 1.09 | +995 | -3,216 | -358 | 22.8 (22.8) |
| m1_tf5321 | flat | aug_oct | 20 | 1.82 | 40.0 | -0.095 [-0.593, 0.419] | 0.73 | -936 | -2,489 | -358 | 0.0 (0.0) |
| m1_tgt_half | flat | dev | 36 | 1.41 | 36.1 | +0.111 [-0.378, 0.669] | 1.24 | +1,636 | -1,999 | -354 | 100.0 (17.5) |
| m1_tgt_half | flat | confirm | 21 | 1.35 | 38.1 | -0.144 [-0.623, 0.373] | 0.65 | -1,290 | -2,489 | -358 | 0.0 (None) |
| m1_tgt_half | flat | ytd | 57 | 1.38 | 36.8 | +0.017 [-0.351, 0.427] | 1.03 | +346 | -3,289 | -358 | 22.8 (22.8) |
| m1_tgt_half | flat | aug_oct | 18 | 1.64 | 38.9 | -0.141 [-0.649, 0.421] | 0.68 | -1,031 | -2,489 | -358 | 0.0 (None) |
| m1_two_a_day | flat | dev | 38 | 1.48 | 34.2 | +0.178 [-0.353, 0.727] | 1.38 | +2,667 | -1,731 | -518 | 100.0 (21.3) |
| m1_two_a_day | flat | confirm | 25 | 1.6 | 32.0 | -0.242 [-0.673, 0.219] | 0.54 | -2,199 | -2,478 | -610 | 0.0 (None) |
| m1_two_a_day | flat | ytd | 63 | 1.53 | 33.3 | +0.011 [-0.35, 0.397] | 1.04 | +469 | -3,930 | -610 | 24.1 (23.9) |
| m1_two_a_day | flat | aug_oct | 21 | 1.91 | 33.3 | -0.217 [-0.685, 0.303] | 0.58 | -1,692 | -2,389 | -610 | 0.0 (None) |
| m1_base | tier | dev | 36 | 1.41 | 33.3 | +0.173 [-0.355, 0.751] | 1.28 | +2,726 | -3,655 | -704 | 48.3 (36.2) |
| m1_base | tier | confirm | 21 | 1.35 | 33.3 | -0.237 [-0.685, 0.265] | 0.77 | -1,335 | -3,763 | -666 | 15.5 (41.4) |
| m1_base | tier | ytd | 57 | 1.38 | 33.3 | +0.022 [-0.352, 0.45] | 1.09 | +1,391 | -4,990 | -704 | 34.9 (27.2) |
| m1_base | tier | aug_oct | 18 | 1.64 | 33.3 | -0.249 [-0.715, 0.293] | 0.86 | -694 | -3,763 | -666 | 11.4 (11.4) |
| m1_rr1 | tier | dev | 59 | 2.3 | 40.7 | +0.122 [-0.239, 0.524] | 1.24 | +3,358 | -3,286 | -704 | 49.1 (23.3) |
| m1_rr1 | tier | confirm | 36 | 2.31 | 30.6 | -0.326 [-0.646, 0.025] | 0.63 | -3,566 | -4,785 | -666 | 0.0 (28.0) |
| m1_rr1 | tier | ytd | 95 | 2.31 | 36.8 | -0.048 [-0.309, 0.23] | 0.99 | -208 | -5,917 | -704 | 29.8 (29.8) |
| m1_rr1 | tier | aug_oct | 27 | 2.45 | 29.6 | -0.370 [-0.727, 0.033] | 0.64 | -2,695 | -4,785 | -666 | 0.0 (0.0) |
| m1_nbars6 | tier | dev | 30 | 1.17 | 36.7 | +0.286 [-0.332, 0.972] | 1.37 | +3,224 | -3,597 | -704 | 49.1 (36.2) |
| m1_nbars6 | tier | confirm | 18 | 1.15 | 33.3 | -0.127 [-0.661, 0.413] | 0.99 | -66 | -2,467 | -666 | 16.1 (16.1) |
| m1_nbars6 | tier | ytd | 48 | 1.17 | 35.4 | +0.131 [-0.309, 0.6] | 1.24 | +3,158 | -4,237 | -704 | 35.9 (28.0) |
| m1_nbars6 | tier | aug_oct | 15 | 1.36 | 33.3 | -0.119 [-0.676, 0.477] | 1.15 | +574 | -2,467 | -666 | 12.1 (0.0) |
| m1_tf5321 | tier | dev | 37 | 1.45 | 32.4 | +0.153 [-0.359, 0.724] | 1.29 | +2,912 | -3,658 | -704 | 48.3 (35.3) |
| m1_tf5321 | tier | confirm | 23 | 1.47 | 39.1 | -0.104 [-0.552, 0.371] | 0.98 | -91 | -3,763 | -666 | 48.3 (48.3) |
| m1_tf5321 | tier | ytd | 60 | 1.46 | 35.0 | +0.055 [-0.304, 0.45] | 1.17 | +2,820 | -4,315 | -704 | 49.5 (42.4) |
| m1_tf5321 | tier | aug_oct | 20 | 1.82 | 40.0 | -0.095 [-0.593, 0.419] | 1.11 | +565 | -3,763 | -666 | 14.3 (12.5) |
| m1_tgt_half | tier | dev | 36 | 1.41 | 36.1 | +0.098 [-0.386, 0.648] | 1.11 | +1,047 | -3,655 | -704 | 45.7 (38.8) |
| m1_tgt_half | tier | confirm | 21 | 1.35 | 38.1 | -0.144 [-0.623, 0.373] | 0.88 | -656 | -3,763 | -666 | 41.4 (46.6) |
| m1_tgt_half | tier | ytd | 57 | 1.38 | 36.8 | +0.009 [-0.357, 0.413] | 1.03 | +391 | -4,311 | -704 | 45.7 (44.5) |
| m1_tgt_half | tier | aug_oct | 18 | 1.64 | 38.9 | -0.141 [-0.649, 0.421] | 1.0 | -15 | -3,763 | -666 | 11.4 (11.4) |
| m1_two_a_day | tier | dev | 38 | 1.48 | 34.2 | +0.178 [-0.353, 0.727] | 1.3 | +2,993 | -3,388 | -935 | 48.3 (35.3) |
| m1_two_a_day | tier | confirm | 25 | 1.6 | 32.0 | -0.242 [-0.673, 0.219] | 0.72 | -1,872 | -3,776 | -958 | 0.0 (15.5) |
| m1_two_a_day | tier | ytd | 63 | 1.53 | 33.3 | +0.011 [-0.35, 0.397] | 1.07 | +1,121 | -5,260 | -958 | 30.1 (28.0) |
| m1_two_a_day | tier | aug_oct | 21 | 1.91 | 33.3 | -0.217 [-0.685, 0.303] | 0.82 | -985 | -3,776 | -958 | 0.0 (11.4) |

**Checks done for the 1m version:**
- The data checks above.
- The ladder restricted to 5m, run on the 1m file, reproduces the 5m engine's entry exactly. This was done on the
  post-roll sessions before the data was stitched.
- One 1m trade (2026-09-18 long) was traced bar by bar: sweep at 10:02, extreme 29,711.75, a 35.75-pt 1m leg, 1m IFVG
  29,726–29,734.5 inverted at 10:09, entry 29,754.25 at the 10:10 close, stopped by the 10:16 re-sweep.
- Development runs were unscored and limited to raw chunks of post-roll sessions (Sep 15–Oct 16).
- The scored batch ran once on the stitched file, with the variants fixed in `ATM_RULES.md` section G.

## Appendix: every variant, every period, both sizing schemes (5m version)

| variant | sizing | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | worst day $ | 50K pass % (zero-edge) |
|---|---|---|---:|---:|---:|---|---:|---:|---:|---:|---|
| base | flat | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 1.44 | +264 | -304 | -304 | n/a |
| base | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| base | flat | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 1.25 | +215 | -511 | -304 | n/a |
| base | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| base | flat | y2025 | 4 | 0.11 | 50.0 | -0.130 - | 1.17 | +69 | -418 | -231 | n/a |
| n4 | flat | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 1.44 | +264 | -304 | -304 | n/a |
| n4 | flat | confirm | 1 | 0.06 | 0.0 | -1.018 - | 0.0 | -272 | -272 | -272 | n/a |
| n4 | flat | ytd | 6 | 0.15 | 33.3 | +0.008 [-0.898, 0.937] | 0.99 | -8 | -511 | -304 | n/a |
| n4 | flat | aug_oct | 1 | 0.09 | 0.0 | -1.018 - | 0.0 | -272 | -272 | -272 | n/a |
| n4 | flat | y2025 | 3 | 0.08 | 66.7 | +0.163 - | 2.61 | +300 | -186 | -186 | n/a |
| n8 | flat | dev | 6 | 0.23 | 33.3 | +0.010 [-0.897, 0.959] | 1.02 | +17 | -552 | -304 | n/a |
| n8 | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| n8 | flat | ytd | 8 | 0.19 | 37.5 | -0.005 [-0.772, 0.825] | 0.97 | -32 | -552 | -304 | n/a |
| n8 | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| n8 | flat | y2025 | 5 | 0.13 | 40.0 | -0.307 [-1.013, 0.692] | 0.65 | -267 | -753 | -336 | n/a |
| x618 | flat | dev | 2 | 0.08 | 0.0 | -1.018 - | 0.0 | -543 | -543 | -304 | n/a |
| x618 | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| x618 | flat | ytd | 4 | 0.1 | 25.0 | -0.533 - | 0.27 | -592 | -815 | -304 | n/a |
| x618 | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| x618 | flat | y2025 | 3 | 0.08 | 33.3 | +0.101 - | 2.08 | +250 | -232 | -186 | n/a |
| tgt_first | flat | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 1.44 | +264 | -304 | -304 | n/a |
| tgt_first | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_first | flat | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 1.25 | +215 | -511 | -304 | n/a |
| tgt_first | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_first | flat | y2025 | 4 | 0.11 | 50.0 | +0.123 - | 1.97 | +404 | -418 | -231 | n/a |
| tgt_half | flat | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 1.44 | +264 | -304 | -304 | n/a |
| tgt_half | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_half | flat | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 1.25 | +215 | -511 | -304 | n/a |
| tgt_half | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_half | flat | y2025 | 4 | 0.11 | 50.0 | +0.035 - | 1.69 | +288 | -418 | -231 | n/a |
| rr1 | flat | dev | 8 | 0.31 | 50.0 | +0.335 [-0.504, 1.16] | 1.71 | +589 | -304 | -304 | n/a |
| rr1 | flat | confirm | 7 | 0.45 | 28.6 | -0.535 [-0.981, 0.053] | 0.22 | -956 | -956 | -272 | n/a |
| rr1 | flat | ytd | 15 | 0.36 | 40.0 | -0.071 [-0.612, 0.498] | 0.82 | -367 | -1,185 | -304 | n/a |
| rr1 | flat | aug_oct | 6 | 0.55 | 33.3 | -0.496 [-1.016, 0.15] | 0.27 | -726 | -768 | -272 | n/a |
| rr1 | flat | y2025 | 13 | 0.35 | 46.2 | -0.096 [-0.641, 0.491] | 0.93 | -136 | -996 | -337 | n/a |
| rr2 | flat | dev | 0 | 0.0 | 0.0 | +0.000 - | - | +0 | 0 | 0 | n/a |
| rr2 | flat | confirm | 1 | 0.06 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | flat | ytd | 1 | 0.02 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | flat | aug_oct | 1 | 0.09 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | flat | y2025 | 1 | 0.03 | 100.0 | +0.015 - | 99.0 | +5 | 0 | 0 | n/a |
| two_a_day | flat | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 1.44 | +264 | -304 | -304 | n/a |
| two_a_day | flat | confirm | 3 | 0.19 | 33.3 | -0.373 - | 0.37 | -376 | -599 | -599 | n/a |
| two_a_day | flat | ytd | 8 | 0.19 | 37.5 | -0.007 [-0.775, 0.827] | 0.91 | -111 | -838 | -599 | n/a |
| two_a_day | flat | aug_oct | 3 | 0.27 | 33.3 | -0.373 - | 0.37 | -376 | -599 | -599 | n/a |
| two_a_day | flat | y2025 | 4 | 0.11 | 50.0 | -0.130 - | 1.17 | +69 | -418 | -231 | n/a |
| win1100 | flat | dev | 4 | 0.16 | 25.0 | -0.175 - | 0.59 | -246 | -304 | -304 | n/a |
| win1100 | flat | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| win1100 | flat | ytd | 6 | 0.15 | 33.3 | -0.133 [-0.898, 0.751] | 0.66 | -295 | -574 | -304 | n/a |
| win1100 | flat | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| win1100 | flat | y2025 | 3 | 0.08 | 66.7 | +0.164 - | 2.1 | +255 | -231 | -231 | n/a |
| base | tier | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 0.58 | -380 | -609 | -609 | n/a |
| base | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| base | tier | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 0.64 | -429 | -652 | -609 | n/a |
| base | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| base | tier | y2025 | 4 | 0.11 | 50.0 | -0.130 - | 2.32 | +551 | -418 | -231 | n/a |
| n4 | tier | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 0.58 | -380 | -609 | -609 | n/a |
| n4 | tier | confirm | 1 | 0.06 | 0.0 | -1.018 - | 0.0 | -272 | -272 | -272 | n/a |
| n4 | tier | ytd | 6 | 0.15 | 33.3 | +0.008 [-0.898, 0.937] | 0.45 | -652 | -652 | -609 | n/a |
| n4 | tier | aug_oct | 1 | 0.09 | 0.0 | -1.018 - | 0.0 | -272 | -272 | -272 | n/a |
| n4 | tier | y2025 | 3 | 0.08 | 66.7 | +0.163 - | 5.2 | +782 | -186 | -186 | n/a |
| n8 | tier | dev | 6 | 0.23 | 33.3 | +0.010 [-0.897, 0.959] | 0.46 | -628 | -856 | -609 | n/a |
| n8 | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| n8 | tier | ytd | 8 | 0.19 | 37.5 | -0.005 [-0.772, 0.825] | 0.53 | -677 | -900 | -609 | n/a |
| n8 | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| n8 | tier | y2025 | 5 | 0.13 | 40.0 | -0.307 [-1.013, 0.692] | 1.29 | +215 | -753 | -336 | n/a |
| x618 | tier | dev | 2 | 0.08 | 0.0 | -1.018 - | 0.0 | -848 | -848 | -609 | n/a |
| x618 | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| x618 | tier | ytd | 4 | 0.1 | 25.0 | -0.533 - | 0.2 | -897 | -1,120 | -609 | n/a |
| x618 | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| x618 | tier | y2025 | 3 | 0.08 | 33.3 | +0.101 - | 4.15 | +732 | -232 | -186 | n/a |
| tgt_first | tier | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 0.58 | -380 | -609 | -609 | n/a |
| tgt_first | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_first | tier | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 0.64 | -429 | -652 | -609 | n/a |
| tgt_first | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_first | tier | y2025 | 4 | 0.11 | 50.0 | +0.123 - | 3.12 | +885 | -418 | -231 | n/a |
| tgt_half | tier | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 0.58 | -380 | -609 | -609 | n/a |
| tgt_half | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_half | tier | ytd | 7 | 0.17 | 42.9 | +0.139 [-0.708, 1.016] | 0.64 | -429 | -652 | -609 | n/a |
| tgt_half | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| tgt_half | tier | y2025 | 4 | 0.11 | 50.0 | +0.035 - | 2.84 | +770 | -418 | -231 | n/a |
| rr1 | tier | dev | 8 | 0.31 | 50.0 | +0.335 [-0.504, 1.16] | 1.37 | +594 | -687 | -687 | n/a |
| rr1 | tier | confirm | 7 | 0.45 | 28.6 | -0.535 [-0.981, 0.053] | 0.25 | -914 | -914 | -272 | n/a |
| rr1 | tier | ytd | 15 | 0.36 | 40.0 | -0.071 [-0.612, 0.498] | 0.89 | -320 | -1,601 | -687 | n/a |
| rr1 | tier | aug_oct | 6 | 0.55 | 33.3 | -0.496 [-1.016, 0.15] | 0.31 | -685 | -768 | -272 | n/a |
| rr1 | tier | y2025 | 13 | 0.35 | 46.2 | -0.096 [-0.641, 0.491] | 1.04 | +106 | -996 | -660 | n/a |
| rr2 | tier | dev | 0 | 0.0 | 0.0 | +0.000 - | - | +0 | 0 | 0 | n/a |
| rr2 | tier | confirm | 1 | 0.06 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | tier | ytd | 1 | 0.02 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | tier | aug_oct | 1 | 0.09 | 100.0 | +0.921 - | 99.0 | +223 | 0 | 0 | n/a |
| rr2 | tier | y2025 | 1 | 0.03 | 100.0 | +0.015 - | 99.0 | +5 | 0 | 0 | n/a |
| two_a_day | tier | dev | 5 | 0.2 | 40.0 | +0.213 [-0.873, 1.3] | 0.58 | -380 | -609 | -609 | n/a |
| two_a_day | tier | confirm | 3 | 0.19 | 33.3 | -0.373 - | 0.37 | -376 | -599 | -599 | n/a |
| two_a_day | tier | ytd | 8 | 0.19 | 37.5 | -0.007 [-0.775, 0.827] | 0.5 | -756 | -979 | -609 | n/a |
| two_a_day | tier | aug_oct | 3 | 0.27 | 33.3 | -0.373 - | 0.37 | -376 | -599 | -599 | n/a |
| two_a_day | tier | y2025 | 4 | 0.11 | 50.0 | -0.130 - | 2.32 | +551 | -418 | -231 | n/a |
| win1100 | tier | dev | 4 | 0.16 | 25.0 | -0.175 - | 0.4 | -551 | -609 | -609 | n/a |
| win1100 | tier | confirm | 2 | 0.13 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| win1100 | tier | ytd | 6 | 0.15 | 33.3 | -0.133 [-0.898, 0.751] | 0.49 | -599 | -823 | -609 | n/a |
| win1100 | tier | aug_oct | 2 | 0.18 | 50.0 | -0.048 - | 0.82 | -49 | -272 | -272 | n/a |
| win1100 | tier | y2025 | 3 | 0.08 | 66.7 | +0.164 - | 4.19 | +737 | -231 | -231 | n/a |
| diag_noskip | flat | dev | 29 | 1.13 | 55.2 | +0.017 [-0.322, 0.355] | 1.02 | +47 | -815 | -350 | n/a |
| diag_noskip | flat | confirm | 17 | 1.09 | 52.9 | -0.165 [-0.543, 0.212] | 0.54 | -966 | -1,252 | -335 | n/a |
| diag_noskip | flat | ytd | 46 | 1.12 | 54.3 | -0.050 [-0.307, 0.207] | 0.82 | -919 | -1,781 | -350 | n/a |
| diag_noskip | flat | aug_oct | 15 | 1.36 | 53.3 | -0.158 [-0.566, 0.267] | 0.57 | -806 | -1,252 | -335 | n/a |
| diag_noskip | flat | y2025 | 45 | 1.21 | 60.0 | -0.038 [-0.286, 0.211] | 0.96 | -205 | -2,002 | -349 | 97.8 (98.1) |
| diag_noskip | tier | dev | 29 | 1.13 | 55.2 | +0.017 [-0.322, 0.355] | 0.88 | -651 | -1,523 | -687 | n/a |
| diag_noskip | tier | confirm | 17 | 1.09 | 52.9 | -0.165 [-0.543, 0.212] | 0.77 | -634 | -1,891 | -669 | n/a |
| diag_noskip | tier | ytd | 46 | 1.12 | 54.3 | -0.050 [-0.307, 0.207] | 0.84 | -1,285 | -2,157 | -687 | 0.0 (0.0) |
| diag_noskip | tier | aug_oct | 15 | 1.36 | 53.3 | -0.158 [-0.566, 0.267] | 0.76 | -611 | -1,891 | -669 | n/a |
| diag_noskip | tier | y2025 | 45 | 1.21 | 60.0 | -0.038 [-0.286, 0.211] | 1.15 | +1,030 | -2,477 | -692 | 55.7 (52.3) |
