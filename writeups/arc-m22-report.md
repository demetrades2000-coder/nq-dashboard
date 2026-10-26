# ICT 2022 Mentorship model on NQ and ES: measured results (track M22)

**Verdict: no edge. No variant clears the lab gate on either symbol, and none beats the zero-edge 50K eval baseline by a meaningful margin.**
- The best variant is `rr2` (the model with a fixed 2R target). On NQ it breaks even: +$279 over 18 months, 103 trades, PF 1.02, avg +0.026R (95% CI −0.21 to +0.26). Its 50K pass rate is 21.0% against 20.7% for the zero-edge baseline.
- On ES, `rr2` loses: −$4,998, PF 0.73.
- The canonical version (daily bias filter, opposite-liquidity target) loses on both symbols in every period except a few single months.
- I would not build it into the live bot as a money-making strategy tonight.

**Setup**
- Data: TradingView CME futures, NQ1! and ES1! 5m (`data/NQ_5m.csv`, `data/ES_5m.csv`). The files were rewritten 2026-10-16 17:42–17:43 ET (the 100%-TradingView update) and run through 2026-10-16 16:55 ET. The scoring run was at 17:50 ET, after the update. No CFD or Yahoo data was used. ES history starts 2025-04-14.
- Costs and sizing are the lab standard from `tools/strategy_lab.py`:
  - MNQ $2/pt, MES $5/pt, $1.40 round trip per micro
  - 1 tick of slippage on stop and time exits; none on limit entries or limit targets
  - $350 fixed risk, max 40 micros
- Files:
  - Rules: `research/lab/M22_RULES.md`
  - Code: `tools/lab_models/ict2022.py`
  - Runner: `tools/lab_m22_run.py`
  - Mechanics check: `tools/lab_m22_funnel.py`
  - Trades: `research/lab/M22_trades/*.json`
  - Raw tables: `research/lab/M22_tables.md` and `research/lab/M22_diag.md`
  - Scorecards: `research/lab/M22_<SYM>_<variant>__<period>.json`

## The model as tested (full rules in M22_RULES.md)
1. **Bias.** Based on yesterday's daily candle versus the one before it:
   - closed beyond that candle's high (or low): trade in that direction
   - ran its high (or low) and closed back inside: trade the other way
   - anything else: no trade that day
2. **Killzones.** 08:30–11:00 and 13:30–15:55 ET. The raid, the MSS and the fill must all happen inside one killzone.
3. **Raid.** Price trades 1 tick through an untaken pool: PDH/PDL, Asia H/L, London H/L, or a 15m short-term swing from the session.
4. **MSS.** A 5m candle closes beyond the last 5m short-term swing before the raid extreme. The leg must leave an FVG; without one there is no trade.
5. **Entry.** A limit order at the near edge of the first FVG of the leg.
6. **Stop.** 1 tick beyond the raid extreme.
7. **Target.** The nearest opposite pool that existed at the raid; if there is none, the −2 SD projection. One target, no partials.
8. **Risk.** $350 per trade, max 2 trades a day, done after a winner or 2 losers, −$700 daily stop, flat 15:55 ET.

**Variants.** These three were declared before scoring. They are the only ones run, and each was run once.

| variant | change |
|---|---|
| `canon` | rules as above |
| `nobias` | rule 1 off (both directions every day) |
| `rr2` | rule 7 replaced by a fixed 2R target |

The AM-killzone-only figures further down are a subset of `canon`. That subset is identical to an AM-only run, because PM trades never change AM decisions.

## Results per symbol and period
How to read the 50K columns:
- "50K pass %" is the MFFU Builder 50K rolling pass rate: an eval is started on every session, and the rate counts only evals that reached pass or fail inside the period.
- "zero-edge %" is the same eval run on the same trade days with the mean trade-day P&L removed.
- "n/a" means no eval reached pass or fail inside the period, which is common at about 1.3 trades a week with $350 risk.
- "b2b" counts back-to-back evals passed / failed.

### NQ (MNQ)
| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % | zero-edge % | b2b |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---|
| canon | ytd | 54 | 1.31 | 42.6 | −0.088 [−0.373, +0.195] | 0.77 | −1,914 | −3,611 | 0.0 | 0.0 | 0/2 |
| canon | aug_oct | 15 | 1.36 | 20.0 | −0.564 [−0.998, −0.042] | 0.33 | −2,234 | −2,358 | 0.0 | n/a | 0/1 |
| canon | y2025 | 43 | 1.16 | 44.2 | −0.123 [−0.436, +0.219] | 0.78 | −1,662 | −3,456 | 0.0 | 0.0 | 0/2 |
| canon | all18m | 97 | 1.24 | 43.3 | −0.104 [−0.314, +0.109] | 0.77 | −3,576 | −3,611 | 2.8 | 22.4 | 0/4 |
| nobias | ytd | 105 | 2.55 | 44.8 | −0.038 [−0.246, +0.180] | 0.87 | −2,022 | −4,508 | 0.0 | 0.0 | 0/3 |
| nobias | aug_oct | 28 | 2.55 | 42.9 | −0.030 [−0.459, +0.459] | 0.95 | −205 | −1,675 | n/a | n/a | 0/0 |
| nobias | y2025 | 98 | 2.63 | 37.8 | −0.245 [−0.451, −0.023] | 0.59 | −7,198 | −7,701 | 0.0 | 1.4 | 0/5 |
| nobias | all18m | 203 | 2.59 | 41.4 | −0.137 [−0.282, +0.014] | 0.72 | −9,220 | −10,359 | 0.0 | 6.0 | 0/9 |
| **rr2** | ytd | 58 | 1.41 | 41.4 | −0.001 [−0.299, +0.320] | 0.94 | −535 | −2,484 | 0.0 | 0.0 | 0/2 |
| **rr2** | aug_oct | 14 | 1.27 | 28.6 | −0.269 [−0.848, +0.394] | 0.64 | −987 | −1,251 | n/a | n/a | 0/0 |
| **rr2** | y2025 | 45 | 1.21 | 42.2 | +0.061 [−0.284, +0.428] | 1.11 | +814 | −3,110 | 8.1 | 2.2 | 0/1 |
| **rr2** | all18m | 103 | 1.31 | 41.7 | +0.026 [−0.207, +0.260] | 1.02 | +279 | −3,110 | 21.0 | 20.7 | 1/2 |

### ES (MES)
| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | 50K pass % | zero-edge % | b2b |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---|
| canon | ytd | 49 | 1.19 | 46.9 | −0.028 [−0.329, +0.286] | 0.90 | −788 | −4,138 | 2.3 | 10.1 | 1/2 |
| canon | aug_oct | 12 | 1.09 | 41.7 | −0.220 [−0.732, +0.353] | 0.63 | −815 | −1,461 | n/a | n/a | 0/0 |
| canon | y2025 | 44 | 1.18 | 34.1 | −0.322 [−0.614, −0.007] | 0.52 | −4,589 | −4,589 | 0.0 | 0.0 | 0/2 |
| canon | all18m | 93 | 1.19 | 40.9 | −0.167 [−0.383, +0.060] | 0.69 | −5,377 | −5,377 | 6.6 | 32.5 | 0/4 |
| nobias | ytd | 103 | 2.50 | 45.6 | −0.049 [−0.273, +0.167] | 0.90 | −1,711 | −6,188 | 5.3 | 11.5 | 1/3 |
| nobias | aug_oct | 20 | 1.82 | 40.0 | −0.308 [−0.713, +0.125] | 0.49 | −1,963 | −2,731 | 0.0 | n/a | 0/1 |
| nobias | y2025 | 88 | 2.37 | 38.6 | −0.193 [−0.415, +0.041] | 0.68 | −5,697 | −6,407 | 0.0 | 0.0 | 0/6 |
| nobias | all18m | 191 | 2.44 | 42.4 | −0.115 [−0.273, +0.045] | 0.79 | −7,407 | −7,672 | 13.8 | 18.7 | 1/9 |
| **rr2** | ytd | 52 | 1.26 | 40.4 | −0.069 [−0.362, +0.253] | 0.84 | −1,479 | −3,726 | 0.0 | 0.0 | 0/3 |
| **rr2** | aug_oct | 12 | 1.09 | 33.3 | −0.354 [−0.829, +0.199] | 0.45 | −1,318 | −1,991 | 0.0 | n/a | 0/1 |
| **rr2** | y2025 | 45 | 1.21 | 33.3 | −0.239 [−0.554, +0.111] | 0.62 | −3,519 | −3,827 | 0.0 | 0.0 | 0/2 |
| **rr2** | all18m | 97 | 1.24 | 37.1 | −0.148 [−0.364, +0.091] | 0.73 | −4,998 | −4,998 | 0.0 | 23.3 | 0/5 |

**Gate** (net > 0, PF ≥ 1.3, 2–5 trades a week, max DD under $2k, eval pass ≥ zero-edge + 10 points): **all 24 scorecards fail.**

"Best" was decided on all18m net, the longest sample. `rr2` comes first on both symbols:
- NQ: rr2 +$279, canon −$3,576, nobias −$9,220
- ES: rr2 −$4,998, canon −$5,377, nobias −$7,407

On ytd alone, ES `canon` (−$788) loses less than ES `rr2` (−$1,479).

### AM-killzone-only subset of canon
| symbol | period | trades | /wk | win % | avg R | PF | net $ | max DD $ | 50K pass % | zero-edge % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| NQ | ytd | 38 | 0.92 | 44.7 | −0.092 | 0.79 | −1,196 | −2,124 | 0.0 | n/a |
| NQ | aug_oct | 9 | 0.82 | 22.2 | −0.574 | 0.33 | −1,212 | −1,212 | n/a | n/a |
| NQ | y2025 | 30 | 0.81 | 33.3 | −0.357 | 0.45 | −3,535 | −4,578 | 0.0 | 0.0 |
| NQ | all18m | 68 | 0.87 | 39.7 | −0.209 | 0.61 | −4,730 | −4,730 | 0.0 | 43.5 |
| ES | ytd | 31 | 0.75 | 51.6 | +0.100 | 1.13 | +671 | −2,650 | 4.2 | 3.9 |
| ES | aug_oct | 6 | 0.55 | 33.3 | −0.285 | 0.60 | −558 | −1,205 | n/a | n/a |
| ES | y2025 | 27 | 0.73 | 29.6 | −0.377 | 0.48 | −3,275 | −3,275 | 0.0 | n/a |
| ES | all18m | 58 | 0.74 | 41.4 | −0.122 | 0.77 | −2,603 | −3,275 | 7.5 | 19.0 |

## 2026 by month: net $ (trades)
| name | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct (to 16th) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| NQ canon | +476 (8) | −838 (6) | +1,246 (6) | −149 (2) | +693 (8) | −720 (6) | −390 (3) | −617 (9) | −878 (3) | −739 (3) |
| NQ nobias | +1,707 (12) | −1,571 (10) | +643 (13) | −1,316 (7) | −86 (15) | −1,132 (11) | −62 (9) | +757 (13) | −282 (8) | −680 (7) |
| NQ rr2 | +923 (9) | −1,129 (7) | +404 (6) | +363 (3) | +1,240 (8) | −935 (8) | −414 (3) | −85 (8) | −163 (3) | −739 (3) |
| ES canon | +1,260 (5) | +1,866 (8) | −662 (5) | −340 (4) | +212 (3) | −625 (6) | −1,684 (6) | +52 (4) | −299 (5) | −568 (3) |
| ES nobias | +2,403 (11) | +2,045 (13) | −199 (13) | −1,513 (9) | +119 (7) | −1,542 (17) | −1,061 (13) | −729 (9) | +35 (6) | −1,268 (5) |
| ES rr2 | +547 (4) | +1,699 (8) | −920 (8) | −705 (5) | +574 (4) | −60 (6) | −1,296 (5) | +191 (4) | −942 (5) | −568 (3) |

**By quarter: net $ (trades)**

| name | 25Q2 | 25Q3 | 25Q4 | 26Q1 | 26Q2 | 26Q3 | 26Q4 |
|---|---:|---:|---:|---:|---:|---:|---:|
| NQ canon | −915 (12) | −1,198 (21) | +450 (10) | +884 (20) | −175 (16) | −1,884 (15) | −739 (3) |
| NQ nobias | +102 (27) | −3,843 (39) | −3,458 (32) | +779 (35) | −2,534 (33) | +413 (30) | −680 (7) |
| NQ rr2 | +362 (11) | −1,038 (21) | +1,490 (13) | +198 (22) | +668 (19) | −662 (14) | −739 (3) |
| ES canon | −1,388 (13) | −1,632 (19) | −1,569 (12) | +2,463 (18) | −753 (13) | −1,930 (15) | −568 (3) |
| ES nobias | −1,234 (27) | −3,637 (34) | −825 (27) | +4,249 (37) | −2,936 (33) | −1,755 (28) | −1,268 (5) |
| ES rr2 | −1,247 (14) | −676 (19) | −1,596 (12) | +1,327 (20) | −191 (15) | −2,047 (14) | −568 (3) |

Every variant lost money in Jul–Oct 2026. That window includes aug_oct, where the existing Liquidity Engine was strong.

## How the setups behave (all18m, from M22_tables.md and M22_diag.md)
- **Setup funnel, NQ canon.** 1,040 raids led to 290 MSS. Of those, 78 had no FVG and 193 armed an order. Only half the armed orders filled (97): 52 ran to the target without filling and 43 expired at the killzone end. ES is similar: 974 raids, 279 MSS, 204 armed, 93 filled.
- **Exit mix, NQ canon.** 49 stops (−1.03R each), 29 targets (+1.01R average), 19 flat at 15:55 (+0.58R average). Planned R has a median of 1.55, but about half the trades hit the full stop.
- **Stops are wide on 5m.** The median is 61 NQ points or 11 ES points. With whole micros, about $285 is actually risked per NQ trade and $315 per ES trade, not $350.
- **Frequency.** `canon` and `rr2` take 1.2–1.4 trades a week, and 25–35% of weeks have no trade at all. That breaks the owner's "1–4 every week" rule. `nobias` meets it (about 2.5 a week; 85% of weeks have 1–4 trades) but loses the most.
- **Session split, noted only and not acted on.**
  - NQ's PM killzone was positive in all three variants (canon PM: n=29, +0.14R; rr2 PM: n=31, +0.32R) while NQ AM was negative.
  - ES PM was negative for canon and rr2. The split does not repeat across symbols, so it is most likely noise.
  - It would also be a fourth, post-hoc variant, which the protocol does not allow.
- **Target types.** The few −2 SD fallback targets did well (NQ canon: 11 trades, +0.56R; ES canon: 7 trades, +0.93R). The samples are far too small to read anything into.

## Caveats
1. **Discretion had to be coded.** ICT's version involves judgment: which pools are "obvious", how "energetic" a displacement is, and the higher-timeframe bias. This test uses the most common published version that can be coded without discretion (see the disagreement table in M22_RULES.md). A skilled discretionary trader filtering setups could do differently; that cannot be measured here.
2. **5m only.** ICT refines entries on 1–4m charts so the stop is small; his ES funded-account template is a 4-pt stop and a 5.25-pt target. Only about a month of 1m history exists, so everything runs on 5m with stops beyond the raid extreme. This is the single largest gap from his own execution.
3. **Not coded:**
   - prior-week H/L and equal highs/lows as pools
   - weekly-candle bias
   - news-day selection
   - partials and breakeven (the Ep. 41 style)
4. **Small samples.** There are about 95–105 trades per variant in 18 months, and every 95% CI on avg R spans roughly ±0.2–0.3R. The test can rule out a large edge (more than about +0.25R) but cannot pin a small one.
5. **Thin eval statistic.** At about 1.3 trades a week, few rolling 50K evals reach pass or fail inside a single period, so ytd and aug_oct often show 0.0 vs 0.0 or n/a. The all18m column is the meaningful comparison.
6. **Fills are conservative:**
   - a limit fills only on a 1-tick trade-through
   - on the fill bar only the stop is checked
   - if stop and target are both possible in one bar, the stop wins
   - a target needs a 1-tick trade-through
7. **One spec fix during mechanics checking** (target pools must exist at the raid). It is disclosed in M22_RULES.md; it did not improve the smoke window.

**Every run made:**
- smoke tests on NQ and ES, Sep 1–Oct 16 2026: twice, before and after the spec fix
- one funnel-count run on Jan–Jun 2026, with no P&L shown
- one scoring run at 17:50 ET: 3 variants × 2 symbols × 4 periods. Its 6 ytd scorings were logged to `confirm_log.csv`.
- one descriptive diagnostics pass over the same trades

## Recommendation for tonight
- Do not put the ICT 2022 model into the live bot as an edge source. Measured honestly on 18 months of real NQ and ES futures, it is at best break-even (NQ `rr2`) and otherwise negative, and it fails the frequency rule in its canonical form.
- If the owner still wants the publicly taught model in the bot, the least-bad configuration is `run(bars5, {"sym": "NQ", "target": "rr", "rr": 2.0})`, run paper-only. Expect roughly zero expectancy, about 1.3 trades a week, and a $3.1k worst drawdown over 18 months. That drawdown is larger than the $2k eval MLL.
