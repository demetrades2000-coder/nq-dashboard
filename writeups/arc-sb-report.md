# ICT Silver Bullet on NQ and ES: measured performance

**2026-10-16.** Rules are in `SB_RULES.md`; they were written and fixed before any scoring.

**Files:**
- model: `tools/lab_models/silver_bullet.py`
- runner: `tools/lab_sb_run.py` (`score`, `tables`, `ana`, `audit`, `xcheck`)
- raw results: `research/lab/SB_results.json`, `SB_trades_<sym>_<variant>.json`

**Data:** TradingView CME futures only, NQ1! and ES1! on 5m. ES starts 2025-04-14. Files `data/NQ_5m.csv` and
`data/ES_5m.csv` were refreshed at 17:42–17:43 ET; all final scoring ran at 17:55–17:56 ET, after that refresh. No CFD or
Yahoo data.

**Costs and sizing:** the `strategy_lab` defaults.
- MNQ $2/pt, MES $5/pt.
- $1.40 round-trip commission per micro.
- 1 tick of slippage on stop and time exits; none on the limit entry or limit target.
- Fixed $350 risk per trade, max 40 micros.

## What was run (everything)

**Scored:** 4 configurations × 2 symbols × 4 periods = 32 scorecards. Each configuration is base plus at most one
pre-declared change:
- `base`: AM + PM windows, near-edge entry, candle-1 stop, draw-on-liquidity target needing ≥10 handles of room and ≥2R.
- `am`: AM window only.
- `ce`: entry at the 50% point of the FVG.
- `rr2`: fixed 2R target.

**Also run, outside the scorecards:**
- An independent audit of every trade against the raw bars. It found no fill without a 1-tick trade-through, no fill
  outside the window, no missed stop, and no target credited on the fill bar or on a stop bar. There are at most 2
  trades/day and none left open.
- A 1m cross-check of `base` over the only 1m history available (2026-09-22 .. 10-16).
- Descriptive splits of `base`.

**Earlier mechanics checks:** while building, I ran smoke tests on Sep–Oct 2026 bars to check fills, stops and the 0-lot
bug. One used an earlier draft, before the research came back: swing stop, no 2R floor, 4-handle ES minimum. No
parameter was set from those runs; every change after them came from the research. Nothing else was tried.

**Side effects of the shared tool:** `score()` appended the 8 ytd runs to `confirm_log.csv` (one per name) and rebuilt
`LEADERBOARD.md`.

## NQ (MNQ)

| variant | period | trades/wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % (zero-edge) |
|---|---|---:|---:|---|---:|---:|---:|---|
| base | ytd | 2.28 | 26.6 | −0.093 [−0.40, +0.26] | 0.91 | −2,013 | −5,664 | 33.5 (37.1) |
| base | aug_oct | 2.18 | 25.0 | −0.216 [−0.75, +0.40] | 0.72 | −1,602 | −3,372 | 0.0 (0.0) |
| base | y2025 | 2.47 | 30.4 | −0.056 [−0.36, +0.27] | 0.93 | −1,314 | −7,459 | 10.3 (14.9) |
| base | all18m | 2.37 | 28.5 | −0.074 [−0.30, +0.17] | 0.92 | −3,326 | −10,635 | 20.9 (24.5) |
| am | ytd | 1.17 | 18.8 | −0.352 [−0.75, +0.10] | 0.62 | −4,268 | −4,268 | 0.0 (94.9*) |
| am | aug_oct | 0.91 | 20.0 | −0.506 [−1.02, +0.35] | 0.40 | −1,443 | −1,443 | n/a (n/a) |
| am | y2025 | 1.26 | 31.9 | +0.121 [−0.35, +0.64] | 1.19 | +1,805 | −5,380 | 25.6 (22.7) |
| am | all18m | 1.21 | 25.3 | −0.118 [−0.44, +0.23] | 0.88 | −2,463 | −5,806 | 11.9 (18.5) |
| ce | ytd | 2.60 | 25.2 | −0.164 [−0.45, +0.16] | 0.78 | −5,648 | −5,648 | 2.1 (46.0) |
| ce | aug_oct | 2.55 | 21.4 | −0.378 [−0.82, +0.17] | 0.55 | −3,341 | −3,943 | 0.0 (n/a) |
| ce | y2025 | 2.74 | 30.4 | −0.070 [−0.36, +0.25] | 0.89 | −2,586 | −7,148 | 3.3 (8.1) |
| ce | all18m | 2.67 | 27.8 | −0.118 [−0.33, +0.10] | 0.83 | −8,235 | −10,314 | 2.4 (16.1) |
| rr2 | ytd | 2.16 | 34.8 | −0.023 [−0.30, +0.28] | 0.99 | −225 | −3,664 | 17.5 (17.5) |
| rr2 | aug_oct | 2.00 | 36.4 | +0.003 [−0.54, +0.61] | 0.96 | −179 | −1,362 | n/a (n/a) |
| rr2 | y2025 | 2.39 | 33.7 | −0.070 [−0.34, +0.22] | 0.90 | −1,762 | −5,230 | 0.0 (0.0) |
| rr2 | all18m | 2.27 | 34.3 | −0.046 [−0.24, +0.16] | 0.95 | −1,987 | −7,493 | 6.9 (10.9) |

## ES (MES)

| variant | period | trades/wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % (zero-edge) |
|---|---|---:|---:|---|---:|---:|---:|---|
| base | ytd | 2.94 | 35.5 | +0.077 [−0.24, +0.41] | 1.10 | +2,850 | −8,521 | 31.8 (23.7) |
| base | aug_oct | 3.45 | 21.1 | −0.571 [−0.90, −0.18] | 0.33 | −7,508 | −8,198 | 0.0 (0.0) |
| base | y2025 | 2.80 | 35.6 | +0.077 [−0.25, +0.41] | 1.11 | +2,577 | −3,161 | 28.9 (25.0) |
| base | all18m | 2.87 | 35.6 | +0.077 [−0.14, +0.31] | 1.10 | +5,428 | −8,521 | 26.8 (21.9) |
| **am** | ytd | 1.43 | 37.3 | +0.244 [−0.22, +0.74] | 1.37 | +4,830 | −4,113 | 66.5 (60.3) |
| **am** | aug_oct | 1.45 | 18.8 | −0.427 [−1.06, +0.31] | 0.48 | −2,392 | −3,081 | 0.0 (n/a) |
| **am** | y2025 | 1.51 | 35.7 | +0.129 [−0.30, +0.58] | 1.18 | +2,287 | −2,250 | 31.7 (4.5) |
| **am** | all18m | 1.47 | 36.5 | +0.188 [−0.15, +0.53] | 1.27 | +7,116 | −4,113 | 43.8 (31.6) |
| ce | ytd | 2.82 | 37.9 | +0.258 [−0.11, +0.64] | 1.37 | +10,018 | −7,340 | 46.0 (34.7) |
| ce | aug_oct | 3.36 | 21.6 | −0.481 [−0.87, −0.04] | 0.43 | −6,227 | −7,340 | 0.0 (0.0) |
| ce | y2025 | 2.69 | 28.0 | −0.017 [−0.37, +0.37] | 0.98 | −637 | −4,670 | 14.2 (14.2) |
| ce | all18m | 2.76 | 33.3 | +0.130 [−0.13, +0.40] | 1.18 | +9,381 | −7,340 | 30.7 (22.6) |
| rr2 | ytd | 2.84 | 42.7 | +0.120 [−0.14, +0.39] | 1.18 | +4,417 | −4,965 | 22.2 (14.6) |
| rr2 | aug_oct | 3.45 | 31.6 | −0.280 [−0.67, +0.16] | 0.62 | −3,673 | −4,965 | 0.0 (0.0) |
| rr2 | y2025 | 2.69 | 38.0 | −0.020 [−0.29, +0.26] | 0.97 | −739 | −4,060 | 15.9 (19.8) |
| rr2 | all18m | 2.77 | 40.6 | +0.056 [−0.14, +0.25] | 1.08 | +3,678 | −4,965 | 17.4 (13.3) |

**Gate:** every row fails the lab gate. The closest is ES `ce` ytd, which fails only max DD (−$7.3k against the $2k
limit). The same variant is −$637 in 2025 and −$6.2k in Aug–Oct.

**Pass-rate columns:**
- "n/a" means the window had no completed rolling eval.
- \* The zero-edge baseline is unstable when trades are few and lopsided. NQ `am` ytd shows 94.9% with only 48 trades
  and an 18.8% win rate, so don't read anything into it.

## 2026 by month (net $, trades)

| month | NQ base | NQ am | NQ ce | NQ rr2 | ES base | ES am | ES ce | ES rr2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-01 | −3,941 (15) | −2,620 (8) | −2,862 (19) | −1,678 (14) | +1,716 (13) | +505 (7) | +2,568 (12) | +2,856 (11) |
| 2026-02 | −1,724 (6) | −680 (3) | −660 (5) | −1,724 (6) | −1,130 (8) | −903 (3) | +536 (6) | −1,328 (7) |
| 2026-03 | +661 (9) | +230 (5) | −581 (11) | −263 (9) | +3,590 (11) | +2,322 (9) | +4,174 (12) | +3,501 (11) |
| 2026-04 | +2,603 (11) | +2,620 (5) | +1,009 (13) | +1,508 (10) | −3,384 (13) | −552 (5) | −2,013 (15) | −3,328 (12) |
| 2026-05 | +1,919 (11) | −630 (7) | +969 (8) | +621 (11) | +3,862 (13) | +1,171 (3) | +5,453 (11) | +4,049 (13) |
| 2026-06 | +1,547 (10) | −950 (4) | −371 (14) | +1,172 (9) | +4,600 (12) | +4,461 (7) | +3,157 (11) | +1,924 (12) |
| 2026-07 | −1,476 (8) | −794 (6) | +189 (9) | +318 (8) | +1,105 (13) | +217 (9) | +2,370 (12) | +415 (13) |
| 2026-08 | +572 (5) | −308 (1) | −1,015 (7) | +329 (5) | −3,224 (13) | −1,462 (4) | −2,426 (14) | −44 (13) |
| 2026-09 | −1,296 (9) | −593 (4) | −1,173 (12) | −410 (8) | −2,257 (15) | −153 (7) | −1,182 (13) | −1,507 (15) |
| 2026-10 | −879 (10) | −542 (5) | −1,154 (9) | −98 (9) | −2,027 (10) | −777 (5) | −2,619 (10) | −2,122 (10) |

Every ES variant is negative in each of Aug, Sep and Oct 2026. NQ base's only good stretch is Mar–Jun 2026.

## Diagnostics (base, 2025-04-14 .. 2026-10-16; descriptive, not used to change anything)

**Window and direction:**

| | NQ | ES |
|---|---|---|
| AM window | 95 trades, −0.12R, −$2.5k | 115 trades, +0.19R, +$7.1k (the AM trades of base are identical to `am`) |
| PM window | 91 trades, −0.03R, −$0.9k | 110 trades, −0.04R, −$1.7k |
| longs | +0.05R | +0.10R |
| shorts | −0.18R | +0.06R |

**By quarter:**
- NQ is negative in every quarter except 2026Q2 (+0.56R, +$6.1k).
- ES is positive in 2025Q3, 2026Q1 and 2026Q2, and negative in 2025Q2, 2025Q4, 2026Q3 and 2026Q4.

**Setup flow:**
- About 300 (NQ) and 370 (ES) setups armed over 392 sessions; about 62% of the limit orders filled.
- About two thirds of raids were of short-term 5m swings only, not session levels.
- Splitting base's trades by raid type changes nothing. On NQ, session-level raids made −0.10R and swing-only raids
  −0.06R; on ES, +0.07R and +0.08R. So a JadeCap-style "session levels only" reading is unlikely to rescue the result.
  This is a split of base's trades, not a re-simulation.

**Sizing and costs:**
- NQ: median candle-1 stop 38 pts, median 4 MNQ, costs about 0.03R per trade.
- ES: median stop 6.75 pts, median 10 MES, costs about 0.08R per trade.
- Median planned R to the draw was about 3.2–3.3R, but only about 15–16% of trades reached it (NQ 29/186, ES 34/225).

**1m cross-check** (base rules on 1m bars vs 5m bars; 2026-09-22 .. 10-16, the only 1m history available):
- NQ: 1m 25 trades, 12% win, −0.59R, −$5.1k; 5m 13 trades, 15% win, −0.41R, −$1.6k.
- ES: 1m 29 trades, 10% win, −0.57R, −$5.8k; 5m 14 trades, 29% win, −0.20R, −$1.2k.

The sample is tiny, but there's no sign that the finer, more "as taught" 1m chart hides an edge that 5m misses.

## Verdict

1. **NQ: no edge.**
   - All four variants lose over the 18 months, by −$2.0k to −$8.2k, with PF 0.83–0.95.
   - Every 18-month eval pass rate is **below** the zero-edge baseline.
   - The least-bad is `rr2`: ytd −$225, aug_oct −$179, y2025 −$1,762. That is flat-to-negative, not tradeable.
2. **ES: a small positive average that isn't statistically distinguishable from zero.**
   - It is concentrated in the AM window and in 2025Q3 and 2026Q1–Q2.
   - All variants lost heavily in Aug–Oct 2026. For base (−0.57R) and ce (−0.48R) the 95% CI is entirely below zero.
3. **The best variant is ES `am`** (AM window only, one and done), picked on the lab's own criterion: the 18-month eval
   pass rate vs zero-edge.

   | | net | PF | trades/wk | 50K pass | zero-edge |
   |---|---:|---:|---:|---:|---:|
   | all18m | +$7.1k | 1.27 | 1.47 | 43.8% | 31.6% |
   | y2025 | +$2.3k | 1.18 | | 31.7% | 4.5% |
   | ytd | +$4.8k | 1.37 | | 66.5% | 60.3% (+6, short of the +10 gate) |
   | aug_oct | −$2.4k | 0.48 | | 0% | |

   Max DD is −$4.1k, double the $2k eval MLL. 16% of weeks have no trade. It trades MES, not MNQ.
4. **Does it beat the zero-edge eval baseline?**
   - NQ: no, in any variant.
   - ES: yes on the full 18 months, by +4 to +12 points; by +27 points in 2025 for `am`.
   - Not by the gate's +10 in ytd: `am` is +6. `ce` is +11, but that comes from Jan–Jul; it is −$6.2k in Aug–Oct.
   - Not at all in Aug–Oct (0% pass for every variant).
5. **Recommendation:** don't build the Silver Bullet into the bot tonight as its strategy. The textbook version shows no
   NQ edge. Its ES edge is small, mostly a first-half-2026 effect, and in a three-month drawdown now. If the owner still
   wants a public ICT model live, ES `am` is the only defensible pick, and it needs:
   - MES instead of MNQ;
   - acceptance that it fails the lab gate (1.47/wk, max DD $4.1k);
   - a paper period first.

   For context only, not verified by me: the shared `confirm_log.csv` shows `ORIG_engine_defaults` ytd PF 2.67,
   +$10,987, scored by another track with the engine's own cost model.

## Caveats

1. **5m vs the taught 1–3m.** The model runs on 5m because only 4 weeks of 1m data exist. The 1m cross-check over those
   weeks was worse, not better, but n is about 25.
2. **Discretion.** ICT's daily-bias and draw-on-liquidity choice is discretionary. Here it is a mechanical rule: the
   nearest untaken pool at least 10 handles away that pays at least 2R. A discretionary trader filtering by HTF bias
   could differ. The research gave no mechanical bias rule to test, and a third-party 25,000-variant study (summary only)
   reported no Silver Bullet hour edge and no benefit from a 15m bias.
3. **Selection bias in "best".** "Best" is the best of 4 configurations per symbol, chosen after seeing results, so
   discount the ES `am` numbers. No avg-R 95% CI in any period excludes zero on the positive side.
4. **Untested documented alternatives** (3-variant cap): the swing/raid-extreme stop (implemented as
   `stop: "swing"`), partials at 5 handles with breakeven, ICT's half-risk after a loss, the 03:00–04:00 London window,
   and an HTF bias filter.
5. **Costs on ES.** Tight ES stops mean large MES size, so a stop costs about $66 on 25 MES. Two full losers can
   overshoot the −$700 daily stop: the worst ES day was −$830, still inside the $1,000 MFFU soft DLL.
6. **Sources.** The research could not read ICT's own transcript. The ICT rules here come from lecture summaries and
   third-party write-ups (see `SB_RULES.md`). Published win-rate claims for the setup (55–80%) come with no data.
