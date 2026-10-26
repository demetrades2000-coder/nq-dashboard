# BIAS REPORT: does trading with the daily bias help on our NQ data? (Fri 2026-10-16)

The owner asked: "Definitely look into daily BIAS, we usually want our bias to align with our trade."

| | |
|---|---|
| **Rules** (pre-registered before any result) | `research/lab/BIAS_RULES.md`. The file was saved at 19:30 ET, before the first result (about 19:35), and has not been edited since. Its header's "~19:50" and "~19:45 ET" are wrong clock guesses. Every analysis not listed there is labeled POST HOC below. |
| **Code** | `engine/daily_bias.py`: the methods and the stable API. `tools/lab_bias_run.py`: `raw`, `align`, `tables`, `lookahead`, `posthoc`, `all` |
| **Outputs** | `research/lab/BIAS_raw.json`, `BIAS_align.json`, `BIAS_lookahead.json`, `BIAS_posthoc.json`, full tables in `BIAS_tables.md` |
| **Data** | TradingView NQ1! 5m only (`data/NQ_5m.csv`, back-adjusted, 2021-10-18 to 2026-10-16). No CFD. The 1m data is used only through the ATM 1m/3m trade files. |
| **Reproduce** | `python -X utf8 tools/lab_bias_run.py all`. It takes about 20 s. `lookahead` takes about 2 min. |

## 0. Bottom line (plain English)

1. **No daily-bias method predicts where NQ goes in the NY session.** Eleven methods were tested on 1,193 sessions (2022-01 to 2026-10), with the bias read at 09:30:
   - The share of days that closed in the bias direction ranged from 49.6% to 51.9%.
   - No mean move was significant: every permutation p was 0.11 or higher.
   - Which side's liquidity NY takes is no better than a level the same distance on the other side.
   - The best method on that test was the owner's session AMD (completed London manipulation): 56% against 50%, p 0.07. That does not survive correction.

2. **The famous TTrades "80%" is distance, not direction.**
   - After a close above the prior high, the next CME day takes yesterday's high 79.4% of the time.
   - It also takes a level the *same distance below* the 18:00 open 78.2% of the time.
   - The median target sits only 0.13 ADR from the open, so almost anything that close gets touched.
   - After a close below the prior low, the *opposite* side was hit more often: 74.9% against 66.3% for yesterday's low.
   - This is post hoc (§2.2), but it is a simple, decisive check. The TTrades bias does not tell us where price is drawn.

3. **On real trades, aligning with the classic daily bias does not help, and TTrades alignment hurt the engine.**
   - TTrades candle closure (A), its carry variant (A2), the ICT HTF draw (B), HTF structure (C), the A+B+C composite (E) and the owner's session AMD (F) all give pooled aligned-minus-counter differences between −0.24R and +0.16R. All are noise.
   - On the engine's live pick (max 1/day):
     - TTrades-**aligned** trades: −0.01R, PF 1.07, 85 trades.
     - **Counter**-bias trades: **+0.37R**, PF 2.91, 90 trades.
   - "TTrades-aligned only" would have cut the engine's 2026 net from **+$11,630 to +$224**.

4. **The only "bias" that separated winners from losers is intraday: method D.**
   - The rule: after price sweeps a named pool beyond the midnight or 09:30 open, wait for a 5m close back through that open, then trade in the reclaim direction.
   - Aligned minus counter: **+0.56R pooled** over the 6 independent models, positive on **all 6**, z 2.59, nominal p 0.011.
   - **It does not survive the multiple-testing correction.**
     - Over 11 methods, the pooled family-wise 95% line is |z| ≥ 2.76.
     - Benjamini-Hochberg would need p ≤ 0.009.
   - It also kills frequency: "aligned only" keeps 0.07–0.87 trades/week per model.
   - On the engine the effect comes from Jul–Oct 2026 (11 aligned trades). In 2025 and H1 2026 it did not separate.

5. **What survives multiple testing: nothing.** That holds for all 115 method × model tests, under both the per-test Benjamini-Hochberg and the family-wise permutation threshold.

6. **Recommendation.**
   - Keep bias as **context and a soft grade**, never a veto. This is the same conclusion as TRADER_HEURISTICS B1/B6 and CONFLUENCE_RESULTS.
   - If the brain wants one bias input, use **D (`open_amd`)**: +1 grade aligned, −1 counter, logged on every trade.
   - Do **not** filter on TTrades / HTF draw / structure.
   - For the owner: trading with your daily bias is a habit our data does not reward. The one exception is the post-manipulation reclaim of the open, and even that is unproven.

## 1. What was tested

The methods are pre-registered in BIAS_RULES.md. They are all causal: only bars closed at t are used, and HTF bars are used only once closed.

| id | method | in one line | coverage at 09:30 |
|---|---|---|---:|
| A | `ttrades` | Yesterday vs the day before: close beyond the high/low = continuation; swept and closed back inside = reversal; inside = neutral | 83% |
| A2 | `ttrades_carry` | As A; inside days carry the previous bias | 93% |
| B | `htf_draw` | Best untaken HTF pool by weight minus distance: PWH/PWL 2, daily swing 1.5, PDH/PDL 1, 4H swing 0.5, +1 for equal highs/lows. Neutral if the two sides score within 0.5. | 68% |
| C | `structure` | Majority of daily BOS trend, 4H BOS trend, and the 4-week premium/discount | 100% |
| D | `open_amd` | Sweep of a pool (PDL/PDH, Asia, London, overnight) beyond the midnight or 09:30 open, then a 5m close back through the open | 48% |
| E | `composite` | A, B, C: at least 2 agree and none opposes | 46% |
| F1 / F2 / F0 | `samd_cont` / `samd_rev` / `samd_rev_only` | Owner's session AMD at 09:25 (§3). F1 reads "London still manipulating" as NY continues; F2 as NY reverses; F0 uses only completed manipulations. | 78 / 78 / 30% |
| E2 | `composite2` | A, B, C, D, F0: at least 2 agree and none opposes | 32% |
| ref | `h1_trend` | 1H BOS trend: the CONFLUENCE benchmark, not a daily bias | 100% |

**No-lookahead check** (`lookahead`):
- 200 decision times (150 random trade entries and 50 random 09:30s) were recomputed on a frame cut at t.
- **0 mismatches** over all 11 methods.
- Passing only the last 90 trading days gives identical directions, so the live layer can pass 90 days of 5m bars.

## 2. Raw predictive test (no strategy)

The bias is read at 09:30 ET. Outcome = the NY RTH session, 09:30 open to 15:55 close, 2022-01-03 to 2026-10-16 (1,193 days). Definitions:

- **move** = the RTH move in the bias direction, in ADR20.
- **acc** = the share of days closing with the bias.
- **hit** = RTH takes the method's draw, which is untaken at 09:30.
- **mirror** = a level the same distance on the other side.
- **null** = 2,000 permutations of the bias labels across biased days. This keeps the long/short mix, so NQ's up-drift is inside the null.
- p is one-sided.

| method | n days | move ADR [95% CI] | p | acc % (null) | p | hit % | mirror % | p |
|---|---:|---|---:|---|---:|---:|---:|---:|
| A ttrades | 991 | +0.003 [−0.034, +0.039] | 0.46 | 50.4 (50.2) | 0.46 | 36.6 | 37.5 | 0.70 |
| A2 ttrades_carry | 1114 | −0.001 [−0.034, +0.032] | 0.51 | 49.6 (50.0) | 0.63 | 35.7 | 36.9 | 0.70 |
| B htf_draw | 808 | −0.008 [−0.049, +0.032] | 0.65 | 50.7 (50.4) | 0.43 | 30.3 | 29.1 | 0.25 |
| C structure | 1193 | −0.002 [−0.033, +0.032] | 0.53 | 50.8 (50.0) | 0.30 | 35.9 | 36.6 | 0.65 |
| D open_amd | 572 | +0.031 [−0.021, +0.081] | 0.11 | 50.5 (49.9) | 0.40 | 75.1 | 76.2 | 0.66 |
| E composite | 547 | −0.020 [−0.067, +0.025] | 0.83 | 50.3 (50.3) | 0.52 | 40.0 | 42.5 | 0.81 |
| F1 samd_cont | 927 | +0.013 [−0.024, +0.052] | 0.24 | 51.5 (50.2) | 0.23 | 48.1 | 47.8 | 0.40 |
| F2 samd_rev | 927 | +0.002 [−0.035, +0.038] | 0.45 | 50.1 (49.7) | 0.44 | 52.1 | 48.5 | 0.10 |
| F0 samd_rev_only | 360 | +0.020 [−0.045, +0.079] | 0.26 | 51.9 (49.8) | 0.23 | 56.1 | 50.4 | 0.07 |
| E2 composite2 | 387 | +0.004 [−0.048, +0.055] | 0.45 | 50.4 (50.1) | 0.47 | 42.0 | 44.4 | 0.76 |
| ref h1_trend | 1193 | +0.011 [−0.023, +0.044] | 0.28 | 50.8 (50.1) | 0.34 | | | |

### 2.1 By calendar year and dev/confirm

Full grid: `BIAS_tables.md` §1b.

- No method is positive in every year.
- E2 is the only method with a cell at p ≤ 0.01: 2026 +0.127 ADR (acc 64%), and its overlapping dev half +0.142.
  - It is negative in 2022, 2023 and 2025.
  - At p ≤ 0.01 over 77 cells (11 methods × 7 splits), about one such cell is expected by chance.
- A in 2026 dev (+0.076, acc 57.8%) reverses to −0.005 in confirm.

### 2.2 POST HOC: the TTrades hit rate is distance

Sanity check first: my implementation reproduces TRADER_HEURISTICS Appendix A exactly.
- CONT_UP: the CME day takes Y.H 80.3% (n 361), against a 55.4% base.
- CONT_DN: takes Y.L 68.5%, against a 47.7% base.

Then the same day, measured against a level the same distance from the 18:00 open on the other side:

| state | n | takes target % | takes mirror % | median distance from 18:00 open | RTH, target still untaken at 09:30: target % / mirror % (n) | move with the bias 18:00→09:30 / 09:30→15:55 (ADR) |
|---|---:|---:|---:|---:|---|---|
| CONT_UP | 361 | 79.4 | 78.2 | 0.13 ADR | 47.5 / 41.1 (141) | −0.000 / +0.022 |
| CONT_DN | 273 | 66.3 | **74.9** | 0.21 ADR | 23.9 / **34.5** (113) | −0.046 / −0.044 |
| REV_UP | 172 | 60.6 | 62.4 | 0.26 ADR | 32.3 / 37.5 (96) | −0.009 / −0.022 |
| REV_DN | 185 | 58.8 | 58.2 | 0.30 ADR | 33.6 / 31.8 (110) | −0.022 / +0.056 |

- None of the states carries directional information.
- After a bearish close-through (CONT_DN), the day moves *against* the bias: −0.111 ADR over the CME day, CI [−0.20, −0.02]. In this mostly bull sample, down closes mean-reverted.

## 3. The owner's session AMD (method F)

The coordinator's questions. Primary definition: Asia = 20:00–00:00, London = 02:00–05:00, state read at 09:25. Full tables, including the extended 02:00–09:25 window and the "back past the London open" variant: `BIAS_tables.md` §2.

| state at 09:25 | n (share) | NY closes up % | mean NY move in ATR14d [95% CI] | NY max excursion up / down (ATR) | NY takes, by 16:00 (when untaken at 09:30) |
|---|---|---:|---|---|---|
| all days | 1193 | 52.8 | +0.004 [−0.03, +0.04] | 0.40 / 0.43 | Asia H 47.6%, London H 54.0%, PDH 27.8%; Asia L 49.5%, London L 56.3%, PDL 23.8% |
| REV_UP (London took the Asia low, back above it) | 173 (14.5%) | 53.8 | +0.025 [−0.06, +0.11] | 0.41 / 0.43 | Asia H 68.3%, London H 88.0%, PDH 39.2%. Opposite side: London L 54.5%, PDL 22.7% |
| REV_DN | 187 (15.7%) | 49.7 | −0.013 [−0.10, +0.07] | 0.38 / 0.43 | Asia L 75.0%, London L 92.0%, PDL 31.7%. Opposite side: London H 53.9%, PDH 21.6% |
| INPROC_UP (London took the Asia high, still above it) | 324 (27.2%) | 54.0 | +0.007 [−0.05, +0.07] | 0.37 / 0.45 | London H 67.3%, PDH 40.8%; Asia L 44.3%, PDL 16.5% |
| INPROC_DN | 243 (20.4%) | 52.7 | −0.012 [−0.08, +0.06] | 0.41 / 0.42 | Asia H 40.5%, London H 49.4%, PDH 13.8%; London L 58.5%, PDL 30.6% |
| BOTH | 196 (16.4%) | 53.6 | +0.038 [−0.04, +0.12] | 0.42 / 0.44 | |
| NONE (London inside Asia) | 70 (5.9%) | 51.4 | −0.058 [−0.20, +0.08] | 0.38 / 0.44 | Asia H 52.9%, Asia L 44.4% |

How the hit rates break down:
- The REV hit rates are conditional on the level being untaken at 09:30. The London H is untaken on only 15% of REV_UP days, and the Asia H on 36%.
- By 12:00, the shares are: Asia H 58.7%, London H 88.0%, PDH 29.2% (REV_UP); Asia L 68.8%, London L 80.0%, PDL 24.5% (REV_DN).
- These rates are partly distance-driven: on REV days price sits back inside the Asia range.
- The distance-matched version is the F0 row of §2: 56.1% against a 50.4% mirror, p 0.07. The lift is positive in 4 of 5 years (2022 +8, 2023 +4, 2024 +3, 2025 +11, 2026 0) but negative in the 2026 confirm window (45.5% against 54.5%).

**By year (primary definition).** Columns:
- **all days**: NY closes up %.
- **REV accuracy**: the share of REV days on which NY closes in the predicted direction (n).
- **REV move**: the mean move in the predicted direction, in ATR.
- **INPROC_UP / INPROC_DN**: NY closes up % (n).

| year | all days | REV accuracy % (n) | REV move ATR | INPROC_UP | INPROC_DN |
|---|---:|---:|---:|---:|---:|
| 2022 | 48.4 | 60.3 (78) | +0.050 | 55.4 (65) | 38.2 (55) |
| 2023 | 59.7 | 49.3 (69) | −0.007 | 60.7 (61) | 54.4 (57) |
| 2024 | 51.8 | 47.3 (74) | +0.031 | 58.7 (63) | 50.0 (44) |
| 2025 | 54.7 | 52.4 (82) | +0.000 | 48.6 (72) | 64.6 (48) |
| 2026 | 48.7 | 49.1 (57) | +0.015 | 47.6 (63) | 59.0 (39) |

**2026 by month (primary definition).** Same columns.

| month | all days | REV accuracy % (n) | REV move ATR | INPROC_UP | INPROC_DN |
|---|---:|---:|---:|---:|---:|
| 2026-01 | 40.0 | 40.0 (5) | +0.032 | 25.0 (8) | 33.3 (3) |
| 2026-02 | 57.9 | 33.3 (6) | −0.009 | 20.0 (5) | 100.0 (2) |
| 2026-03 | 40.9 | 62.5 (8) | +0.048 | 50.0 (4) | 66.7 (6) |
| 2026-04 | 76.2 | 37.5 (8) | +0.044 | 71.4 (7) | 100.0 (2) |
| 2026-05 | 65.0 | 80.0 (5) | +0.125 | 75.0 (8) | 33.3 (3) |
| 2026-06 | 42.9 | 33.3 (3) | −0.024 | 50.0 (10) | 50.0 (4) |
| 2026-07 | 36.4 | 62.5 (8) | +0.119 | 66.7 (3) | 50.0 (6) |
| 2026-08 | 38.1 | 50.0 (4) | −0.086 | 44.4 (9) | 50.0 (4) |
| 2026-09 | 52.4 | 33.3 (9) | −0.128 | 42.9 (7) | 100.0 (3) |
| 2026-10 | 33.3 | 100.0 (1) | +0.050 | 0.0 (2) | 50.0 (6) |

The two variants (the extended 02:00–09:25 window, and "back past the London open") are in `BIAS_tables.md` §2.
- The extended-window REV_UP (n 75) has the largest single number: NY up 56.0%, +0.099 ATR [−0.006, +0.208].
- It is not consistent by year: 67 / 78 / 38 / 61 / 40%.
- It is a variant, one of 3 × 6 states.

**Answers:**
- **Direction.** A completed London manipulation does not predict NY's close direction. Accuracy was 51.9% over 360 REV days, against 50% (p 0.23). By year it was 60 / 49 / 47 / 52 / 49%; 2026 by month is in the tables.
- **"In process" readings.**
  - The data supports **neither** reading of "NY follows through".
  - On INPROC_DN days NY closed up 52.7% of the time, the same as every day (52.8%).
  - On raw direction F1 (continue) scores 51.5% (p 0.23) and F2 (reverse) 50.1% (p 0.44).
  - On trades F1 scores −0.24R pooled and F2 +0.16R pooled. Neither is significant, and they lean opposite ways.
- **NONE days.** Only 14 had both Asia sides untaken at 09:30. On those, NY took only the high 36%, only the low 29%, both 21%, neither 14%. That is too few to call.
- **The one hint.** A completed London manipulation slightly raises the chance that NY runs to the opposite Asia extreme or London extreme (56% vs 50% distance-matched). It is not significant and was not there in Jul–Oct 2026. Use it as a target hint at most.

## 4. Alignment test on every model's trades

Setup:
- Bias at each trade's `entry_t`. For the engine that is the fill bar, so the last bar used closed at the fill bar's open.
- aligned = trade direction equals the bias; counter = opposite; neutral = bias 0.
- Trades from 2025-04-14 to 2026-10-16; the ATM 1m/3m files cover 2026 only.
- diff = avg R aligned − avg R counter.
- z and p come from 2,000 permutations of the bias labels **within each trade direction**, which controls for long-vs-short performance and NQ's drift.
- Full per-method, per-model, per-period tables: `BIAS_tables.md` §3.

### 4.1 Method ranking (pooled over the 6 independent beds: ENG1, SB, MECH, M22, CONT, ATM1m)

| rank | method | pooled diff R | z | p | beds > 0 | aligned share of trades | raw NY test |
|---:|---|---:|---:|---:|---|---:|---|
| 1 | **D open_amd** | **+0.560** | **+2.59** | 0.011 | **6/6** | 25% | move p 0.11, no hit lift |
| 2 | F2 samd_rev | +0.162 | +0.85 | 0.41 | 4/6 | 35% | null |
| 3 | ref h1_trend | +0.152 | +1.28 | 0.20 | 4/6 | 50% | null |
| 4 | F0 samd_rev_only | +0.007 | +0.03 | 0.98 | 3/6 | 14% | hit 56 vs 50 (p 0.07) |
| 5 | E2 composite2 | −0.053 | −0.26 | 0.79 | 4/6 | 9% | null |
| 6 | A2 ttrades_carry | −0.078 | −0.61 | 0.56 | 3/6 | 45% | null |
| 7 | A ttrades | −0.102 | −0.72 | 0.49 | 3/6 | 40% | null |
| 8 | C structure | −0.202 | −1.36 | 0.18 | 1/6 | 48% | null |
| 9 | B htf_draw | −0.205 | −1.17 | 0.26 | 1/6 | 33% | null |
| 10 | E composite | −0.235 | −1.09 | 0.28 | 2/6 | 18% | null |
| 11 | F1 samd_cont | −0.240 | −1.07 | 0.28 | 4/6 | 42% | null |

**Multiple testing:**
- There are 115 method × bed tests. The family-wise 95% line is |z| ≥ 3.45; under the null, the median of the largest |z| is 2.65.
- The largest real |z| is 2.48 (F0 on MECH).
- **No test passes Benjamini-Hochberg at q 0.10 or the family-wise line.**
- Pooled over the 11 methods, the family-wise line is |z| ≥ 2.76. D's 2.59 is below it.

### 4.2 Per model: aligned vs counter (full span)

Each cell: n, win %, avg R [bootstrap 95% CI], PF. Beds:
- ENG1 = engine live pick (max 1/day), `conf_testbed_orig1day.json`.
- ENG2 = engine max 2/day.
- SB = Silver Bullet base.
- MECH = Mechanical IFVG base.
- M22 = ICT 2022 *nobias*. The canon version already filters on a TTrades-like bias, so all its trades are A-aligned.
- CONT = Continuation FVG.
- ATM1m / ATM1m_best = the owner's ATM on 1m/3m, 2026 only.

**D `open_amd` (the best method):**

| model | aligned | counter | diff (z, p) | diff by period: y2025 / dev / confirm |
|---|---|---|---|---|
| ENG1 | 49, 26.5%, +0.41 [−0.07, +0.94], PF 2.91 | 74, 16.2%, −0.02 [−0.28, +0.30], PF 1.32 | +0.43 (+1.6, 0.12) | +0.05 / −0.52 / +2.57 |
| ENG2 | 59, 25.4%, +0.32 [−0.09, +0.76], PF 2.51 | 88, 17.0%, +0.04 [−0.20, +0.33], PF 1.42 | +0.28 (+1.2, 0.22) | +0.03 / −0.57 / +2.07 |
| SB | 69, 33.3%, +0.17 [−0.24, +0.60], PF 1.37 | 53, 26.4%, −0.14 [−0.55, +0.32], PF 0.81 | +0.32 (+1.0, 0.33) | +0.22 / +0.36 / +0.53 |
| MECH | 10, 60.0%, +0.32 [−0.30, +0.91], PF 2.16 | 80, 33.8%, −0.02 [−0.28, +0.26], PF 1.00 | +0.34 (+0.7, 0.49) | +0.17 / +0.28 / +1.46 |
| M22 | 71, 49.3%, +0.00 [−0.23, +0.26], PF 1.03 | 46, 41.3%, −0.26 [−0.51, +0.01], PF 0.50 | +0.26 (+1.3, 0.20) | +0.17 / +0.39 / +0.33 |
| CONT | 33, 9.1%, +0.58 [−1.18, +3.24], PF 1.51 | 62, 1.6%, −0.98 [−1.24, −0.49], PF 0.20 | +1.56 (+1.6, 0.10) | +3.89 / −0.61 / +0.02 |
| ATM1m | 16, 43.8%, +0.22 [−0.47, +0.96], PF 1.19 | 21, 23.8%, −0.23 [−0.79, +0.39], PF 0.81 | +0.45 (+0.9, 0.36) | — / +0.54 / +0.42 |
| ATM1m_best | 16, 43.8%, +0.22 [−0.47, +0.96], PF 1.19 | 17, 23.5%, −0.11 [−0.77, +0.68], PF 0.96 | +0.33 (+0.6, 0.55) | — / +0.38 / +0.34 |

D is positive in 15 of the 17 bed-period cells of the 6 independent beds. The two exceptions are both dev:
- ENG1 dev: −0.52.
- CONT dev: −0.61.

Every confidence interval includes 0.

**A `ttrades` (the owner's habit):**

| model | aligned | counter | diff (z, p) | diff by period: y2025 / dev / confirm |
|---|---|---|---|---|
| ENG1 | 85, 18.8%, −0.01 [−0.24, +0.25], PF 1.07 | 90, 27.8%, **+0.37 [+0.01, +0.72]**, PF 2.91 | −0.38 (−1.7, 0.08) | −0.11 / +0.04 / −1.35 |
| ENG2 | 101, 20.8%, −0.02 [−0.24, +0.22], PF 1.03 | 109, 26.6%, +0.36 [+0.06, +0.69], PF 2.89 | −0.39 (−1.9, 0.06) | −0.13 / −0.03 / −1.49 |
| SB | 82, 29.3%, −0.01 [−0.36, +0.38], PF 1.00 | 71, 28.2%, −0.15 [−0.50, +0.22], PF 0.81 | +0.15 (+0.5, 0.66) | +0.37 / +0.32 / −0.88 |
| MECH | 56, 35.7%, −0.14 [−0.41, +0.15], PF 0.77 | 70, 31.4%, −0.09 [−0.39, +0.23], PF 0.88 | −0.05 (−0.4, 0.69) | +0.27 / −0.29 / −0.61 |
| M22 | 84, 41.7%, −0.14 [−0.36, +0.09], PF 0.72 | 91, 40.7%, −0.14 [−0.37, +0.09], PF 0.74 | +0.00 (−0.0, 0.98) | +0.04 / +0.37 / −0.90 |
| CONT | 67, 6.0%, −0.55 [−1.15, +0.30], PF 0.61 | 69, 4.3%, +0.06 [−1.19, +1.79], PF 1.09 | −0.61 (−0.8, 0.43) | −1.71 / +1.65 / −1.98 |
| ATM1m | 23, 39.1%, +0.21 [−0.44, +0.98], PF 1.39 | 21, 33.3%, −0.06 [−0.66, +0.63], PF 0.88 | +0.27 (+0.6, 0.55) | — / +0.46 / +0.03 |
| ATM1m_best | 21, 38.1%, +0.18 [−0.48, +1.00], PF 1.32 | 16, 37.5%, +0.24 [−0.52, +1.05], PF 1.30 | −0.05 (−0.1, 0.91) | — / −0.03 / −0.05 |

In Jul–Oct 2026, TTrades-aligned trades did worse than counter trades on **every** bed except ATM1m, where the gap was +0.03R, essentially zero. All beds trade the same market days, so this is one regime, not 7 confirmations.

Diffs for the other methods (B, C, E, F1, F2, F0, E2, h1), with z per bed: `BIAS_tables.md` §3a. Notable lines, none significant after correction:
- B `htf_draw` is backwards on ATM: aligned −0.45R against counter +0.57R, z −1.9.
- h1_trend helps MECH: +0.49R, z 2.3. This echoes CONFLUENCE's mech_ifvg 2025 result.
- Averaged over the 6 independent beds, the aligned share runs from 9% (E2) to 50% (h1_trend).

### 4.3 Frequency and 2026 impact of enforcing alignment

2026 YTD (2026-01-02..10-16). Each cell: trades/week, net $, PF.
- **aligned only** = trade only with the bias.
- **skip counter** = also take the neutral-bias trades.

| model | all trades | D aligned only | D skip counter | A (TTrades) aligned only | A skip counter |
|---|---|---|---|---|---|
| ENG1 | 2.26/wk, +11,630, PF 2.41 | 0.58/wk, +5,929, PF 3.57 | 1.55/wk, +10,900, PF 2.94 | 0.73/wk, +224, PF 1.07 | 1.07/wk, +1,648, PF 1.37 |
| ENG2 | 2.57/wk, +11,254, PF 2.22 | 0.68/wk, +5,802, PF 3.38 | 1.77/wk, +9,928, PF 2.60 | 0.85/wk, −340, PF 0.91 | 1.21/wk, +1,003, PF 1.19 |
| SB | 2.28/wk, −2,013, PF 0.91 | 0.80/wk, +2,264, PF 1.34 | 1.55/wk, +294, PF 1.02 | 1.09/wk, −1,227, PF 0.89 | 1.48/wk, −1,940, PF 0.87 |
| MECH | 1.94/wk, −1,991, PF 0.83 | 0.07/wk, +558, PF 3.51 | 0.85/wk, −1,968, PF 0.63 | 0.61/wk, −2,537, PF 0.36 | 0.92/wk, −1,977, PF 0.59 |
| M22 | 2.55/wk, −2,022, PF 0.87 | 0.87/wk, +960, PF 1.26 | 1.99/wk, −214, PF 0.98 | 1.21/wk, −1,500, PF 0.80 | 1.48/wk, −1,454, PF 0.84 |
| CONT | 2.21/wk, −9,625, PF 0.69 | 0.44/wk, −6,456, PF 0.00 | 1.41/wk, −2,573, PF 0.87 | 0.75/wk, +170, PF 1.02 | 1.19/wk, −6,221, PF 0.63 |
| ATM1m | 1.38/wk, +431, PF 1.04 | 0.39/wk, +568, PF 1.19 | 0.87/wk, +1,200, PF 1.18 | 0.56/wk, +1,615, PF 1.39 | 0.87/wk, +962, PF 1.15 |
| ATM1m_best | 1.17/wk, +1,647, PF 1.19 | 0.39/wk, +568, PF 1.19 | 0.75/wk, +1,779, PF 1.33 | 0.51/wk, +1,250, PF 1.32 | 0.78/wk, +765, PF 1.13 |

- **Frequency.**
  - "Aligned only" leaves 0.07–1.21 trades/week.
  - Only TTrades-aligned on SB (1.09/wk) and M22 (1.21/wk) stays above the owner's 1/week floor, and both lose money.
  - Every D-aligned-only version is below 1/week.
  - "Skip counter D" keeps 0.75–1.99/wk.
- **The engine.** D-skip-counter keeps 94% of the 2026 net at PF 2.94 (1.55/wk). In the 2025 holdout, though, the same rule would have cut the engine from +$1,361 to +$90 (73 of 118 trades kept). D did not separate the engine's 2025 trades: aligned +0.05R, counter −0.00R.
- **Other models.** D-aligned-only turns SB and M22 from losing to small winners in 2026. That rests on 0.8–0.9 trades/week and CIs that include zero.

### 4.4 2026 monthly net $ for the best combination (D `open_amd`)

Each cell: all trades / aligned only / skip counter. The method was picked after seeing results.

| month | ENG1 | SB | M22 | ATM1m | MECH | CONT |
|---|---|---|---|---|---|---|
| 2026-01 | +894 / −4 / +1,108 | −3,941 / −598 / −2,047 | +1,707 / +1,040 / +1,538 | +446 / 0 / +246 | −1,160 / 0 / −584 | −3,393 / 0 / −2,801 |
| 2026-02 | −436 / −286 / −376 | −1,724 / −778 / −1,025 | −1,571 / −316 / −1,311 | +996 / +909 / +1,272 | +527 / 0 / −510 | +1,325 / −336 / −712 |
| 2026-03 | +2,684 / 0 / −200 | +661 / +1,692 / +1,611 | +643 / −71 / +1,038 | +417 / −652 / −1,263 | −545 / 0 / −549 | −4,325 / −723 / −2,501 |
| 2026-04 | −832 / −60 / −353 | +2,603 / +1,607 / +1,336 | −1,316 / +333 / −276 | +2,507 / +1,438 / +2,806 | −388 / 0 / −226 | −2,360 / −1,121 / −2,124 |
| 2026-05 | −790 / −264 / −400 | +1,919 / +1,145 / +1,145 | −86 / −718 / −199 | −570 / −352 / +225 | −423 / +374 / −159 | +3,598 / −735 / +3,933 |
| 2026-06 | −928 / −514 / −882 | +1,547 / −624 / +801 | −1,132 / +316 / −1,400 | −1,396 / −341 / −935 | −130 / −222 / −473 | −4,809 / −1,420 / −2,598 |
| 2026-07 | −340 / −159 / −231 | −1,476 / −620 / −1,576 | −62 / −303 / −659 | −259 / −538 / −259 | −66 / 0 / +476 | −4,223 / −353 / −2,794 |
| 2026-08 | +5,288 / +4,288 / +5,704 | +572 / +1,215 / +880 | +757 / +729 / +1,121 | +288 / +697 / +1,146 | +709 / +406 / +284 | −3,035 / −747 / −1,859 |
| 2026-09 | +4,125 / +2,434 / +4,336 | −1,296 / −421 / −918 | −282 / −105 / +352 | −1,072 / −265 / −1,110 | −1,164 / 0 / −268 | +7,971 / −1,022 / +9,255 |
| 2026-10 | +1,964 / +495 / +2,194 | −879 / −353 / +88 | −680 / +55 / −419 | −926 / −327 / −926 | +651 / 0 / +44 | −372 / 0 / −372 |
| **losing months (of 10)** | 5 / 6 / 6 | 5 / 6 / 4 | 7 / 5 / 6 | 5 / 6 / 5 | 7 / 1 / 7 (aligned-only trades in only 3 months) | 7 / 8 / 8 |

TTrades (A) monthly, all beds: `BIAS_tables.md` §3e.

### 4.5 ATM (the owner's model, 1m/3m, 2026): does bias alignment separate winners from losers?

**The question reduces to aligned vs counter.**
- ATM always fades a sweep of the 07:00–09:25 range. This was checked on all 57 + 48 trades: trade direction = −(swept side) in 100% of cases.
- So "the sweep went **against** the bias (manipulation into the opposite side, then a reversal toward the draw)" is exactly the **aligned** split.
- "The sweep went **with** the bias" is the **counter** split.

**Results, base file (57 trades):**

| method | aligned: n, avg R, net | counter: n, avg R, net | Jul–Oct aligned: n, avg R, net | Jul–Oct counter |
|---|---|---|---|---|
| A ttrades | 23, +0.21, +1,615 | 21, −0.06, −531 | 10, −0.04, −381 | 7, −0.07, −550 |
| A2 ttrades_carry | 26, +0.07, +873 | 25, −0.00, −202 | 13, −0.27, −1,123 | 8, −0.19, −846 |
| B htf_draw | 15, −0.45, −2,533 | 22, **+0.57**, +3,945 | 9, −0.06, −670 | 7, +0.05, −12 |
| C structure | 30, −0.09, −822 | 27, +0.15, +1,253 | 10, −0.41, −1,482 | 11, −0.08, −487 |
| D open_amd | 16, +0.22, +568 | 21, −0.23, −769 | 7, −0.03, −434 | 7, −0.45, −819 |
| E composite | 10, −0.68, −1,997 | 14, −0.17, −536 | 4, −0.87, −1,070 | 4, −0.76, −913 |
| F1 samd_cont | 16, −0.08, −735 | 28, −0.10, −415 | 7, −0.04, −359 | 9, −0.64, −1,793 |
| F2 samd_rev | 17, −0.35, −1,812 | 27, +0.07, +663 | 8, −0.17, −558 | 8, −0.58, −1,594 |
| F0 samd_rev_only | 4, −0.02, −88 | 15, +0.21, +1,309 | 3, +0.32, +264 | 4, −0.86, −971 |
| ref h1_trend | 20, −0.02, −394 | 37, +0.04, +825 | 5, +0.42, +422 | 16, −0.44, −2,391 |

**Answers for ATM:**
- **No method separates ATM winners from losers beyond noise.** The largest effect is B with |z| 1.9 (p 0.06, one of 115 tests).
- **Jul–Oct:** every aligned subset still loses except two tiny ones: F0 (3 trades, +$264) and the 1H trend (5 trades, +$422). Bias alignment does not rescue ATM's Jul–Oct.
- **Sweep against vs with the bias:**
  - With TTrades and D, sweeps *against* the bias did a little better: +0.27R and +0.45R. TTrades: dev +0.46, Jul–Oct +0.03. D: dev +0.54, Jul–Oct +0.42. In Jul–Oct both splits still lost money.
  - With the HTF draw it is the other way round: sweeps *toward* the HTF draw side (counter, then fading away from the draw) did better, +0.57R against −0.45R.
  - Both directions are within noise on 37–44 labelled trades.
- **The `best` ATM file (48 trades)** gives the same picture: TTrades −0.05R, D +0.33R, B −1.08R.

### 4.6 POST HOC: what D is made of

Run with `posthoc`; output in `BIAS_posthoc.json`. D-aligned trades usually sit on the reclaimed side of the open. Two pieces:

- **"Entry on the bias side of the open" alone** (the 09:30 open after it prints, else midnight): pooled diff **+0.26R**.
  - Per bed: ENG1 +0.09, SB +0.22, MECH −0.03, M22 +0.14, CONT +1.06, ATM1m +0.11.
  - This matches CONFLUENCE's `below_rth_open` (−0.25R).
- **D within those trades, i.e. the sweep part:**
  - SB +0.29, M22 +0.26, ATM +0.33 (n 11).
  - The engine **−0.27**.
  - MECH and CONT rest on tiny n.

The sweep-and-reclaim adds something for the sweep models (SB, M22, ATM) and nothing for the engine. This is consistent with CONFLUENCE's `judas_rth` (+0.25R, 4 of 4 families) and `judas_mo` (+0.15R).

## 5. Caveats

- **Regime.** 2022–2026 NQ is mostly a bull market, and 2026's Jul–Oct is one regime. All beds trade the same days, so "every bed agrees in Jul–Oct" is weaker than it looks.
- **Power.** With 50–200 trades per bed, the standard error of one bed's aligned-minus-counter difference is about 0.2–0.5R (about 1R on CONT, which has very skewed R). Even a real +0.3R effect would rarely reach significance on one bed. That is why the pooled test matters, and why the pooled test is still inconclusive.
- **Overlapping beds.** ENG1 ⊂ ENG2, ATM best ⊂ ATM base, and SB, MECH, M22 and ATM all trade the same sweeps. The pooled statistics use 6 beds as if they were independent, so they are optimistic.
- **D is the best of 11 methods** and was named best after the results. Its nominal p 0.011 is exactly the kind of number 11 tries produce. It needs a fresh out-of-sample period, for example the next 3 months logged live, before it becomes a rule.
- **D is intraday, not a pre-market daily bias.** It is neutral until the sweep-and-reclaim happens: 52% of days are still neutral at 09:30. If the brain uses it as a hard filter on resting limit orders, the state at order placement can differ from the state at the fill.
- **What wasn't tested:**
  - The TTrades tolerance refinement (`tol = max(0.05·ADR20, 4 pts)`) and joshuuu's body rule.
  - Weekly TTrades bias and the weekly profiles (B4).
  - Bias computed on ES or with SMT.
  - These were not pre-registered.
- **Model files are as of 19:22 ET.** ATM 1m files are dated 19:22, and the other beds were built earlier today by other agents. Re-run `python -X utf8 tools/lab_bias_run.py align tables` if any trade file changes; it takes 5 s.
- The raw test measures NY RTH from 09:30. Overnight-only trading was not studied.

## 6. Using `engine/daily_bias.py` (trader layer / brain)

> _Code omitted on the public site._

- Pass at least about 90 trading days of 5m bars. That gives identical results to the full history in the lookahead check.
- `t` = decision time in unix seconds. Only bars with `time + 300 <= t` are used.
- The first call builds a context: about 0.3 s for 90 days, 0.2 s for 5 years after loading. Later calls on the same frame take about 0.1 ms per method.

**Suggested use, consistent with the evidence:**

| use | recommendation |
|---|---|
| Veto or filter | **Do not** use any method as a veto. |
| Grade, D (`open_amd`) | Optional soft grade: +1 aligned / −1 counter. Log it on every trade so it can be re-tested live. |
| Grade, other methods | Do not grade on A/A2/B/C/E/F, except display. TTrades alignment was negative for the engine. |
| Narrative | Show `draw` / `draw_label` as context ("TTrades CONT_UP → Y.H"). The draw's hit rate is the distance effect (§2.2), not a forecast. |
