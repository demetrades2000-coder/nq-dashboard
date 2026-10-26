## In one minute

- **The owner's order (2026-10-18):** "higher win rates / smarter trades ... think like a person, not how a bot would trade."
  This study covers **trade selection**: which LIT setups an experienced trader would take, and how much they would put on.
- **What was done:**
  1. Every LIT setup the live filters accept was collected, not only the first one each day. Each was simulated as if it
     were the only trade.
  2. Each setup got 50 facts known at the moment of the decision: level, sweep, trap, time, room, the day so far, ES, VIX,
     news, and recent LIT results.
  3. Person-like rules were tested on the real one-trade-a-day path at the eval size:
     - an **A/B/C grade**;
     - **"wait for a better setup"** (skip a C);
     - **"size by grade"**.
  4. A small walk-forward model was tested the same way.
- **Judged on 2026 only**, as for every LIT change: picked on **Jan-Jun (H1)** and checked on **Jul-Oct (H2)**. 2021-25 is a
  reference line.
- **What we found:**
  - **The model can't tell good setups from bad ones** out of sample (test AUC 0.23-0.52, where 0.5 is a coin flip).
  - **The data-mined grade is a mirage.** It gains $10k on H1, the half it was picked on, and nothing on H2.
  - **Skipping setups ("wait for a better one") doesn't work for LIT.** On the days a C setup was skipped, a later setup came
    on only 2 of 11 days, and both were scratches. Skipping only cuts trades: H2 drops to 2.24 a week and 69% of weeks with 2+.
  - **Win rate is fixed by LIT's design** (breakeven at 1R, far targets). Only the "A only" sniper version raises it (42% in
    2026), and that trades 0.6 times a week.
  - **Two small size tilts help both halves** (eval size, costs in):

| Rule | H1 net (base +33,305) | H2 net (base +10,465) | H1 / H2 max DD (base −2,513 / −2,157) | 2-wk eval pass/fail H1 / H2 (base 37.5/3.1, 29.5/0.0) | Shuffle test p H1 / H2 |
|---|---:|---:|---:|---|---|
| **Fresh trap: 1.25x if the trap is ≤ 6 bars old, else 0.75x** | **+39,712** | **+11,353** | −2,206 / −2,003 | 43.0/2.3, 29.5/0.0 | 0.00 / 0.10 |
| **Trader's grade: A 1.5x / B 1x / C 0.5x** | +34,702 | **+12,070** | −2,513 / −2,093 | 37.5/3.1, **34.6/0.0** | 0.30 / 0.005 |

- **The honest verdict:** both tilts are better in both halves, but each passes the "is it selection, not luck?" test in
  only one half, and both are worse in 2021-25. **Adopt-candidate: the fresh-trap tilt, as an optional switch, low
  confidence.** Log the trader's grade on every paper trade and decide after about 40 more trades.

## How this was done

- **Code:**
  - `tools/lit_select.py` builds the candidates and the features and runs the path.
  - `tools/lit_select_rules.py` holds the grades, the rules and the model.
  - Both wrap `engine/lit.py` and `tools/lit_tightstop.py` and change neither.
- **Data:** CME NQ1! 5m + true 1m bars for 2026 entries, ES 5m (from 2025-04), VIX daily, the news calendar. Official CME data only.
- **The candidate set** is every setup that passes LIT live's own filters:
  - sweep ≥ 0.5 ATR;
  - inducement ≤ 1 ATR and ≤ 36 bars;
  - displacement ≥ 0.8 ATR;
  - 5m CISD, entries 02:00-15:30;
  - the Monday rule;
  - stop 8-80 pts;
  - a VIX-band target ≥ 1.5R.

  Each setup was run through the live executor alone: limit at the CISD level for 30 min, then the 1m CISD; stop 1 tick
  beyond the sweep extreme; VIX band banked at 8R; breakeven at 1R; flat 15:55.

  | | Setups | Days with one | Days with 2+ | Would fill alone | The bot takes |
  |---|---:|---:|---:|---:|---:|
  | 2026 H1 | 222 | 108 | 66 | 121 | 80 |
  | 2026 H2 | 108 | 59 | 31 | 55 | 40 |
  | 2021-25 | 2,333 | | | 669 | 510 |
- **Exact replay check:** taking the candidates one at a time, first come first served, one a day, gives LIT live's trades
  exactly: 630 of 630, 2026 +$43,838 at the eval size. That equals run `lit_tight_eval_800_25_room60` (`tools/lit_select.py check`).
- **No look-ahead.** The 5m and ES data were cut at a setup's entry bar, leaving only that bar's open (as in
  `tests/test_lit_lookahead.py`). The market was rebuilt and every feature recomputed. 14 random 2026 setups were checked;
  0 differed (`python tools/lit_select.py lookahead 14`). "Recent LIT results" only count trades that closed before the trigger
  bar's close.
- **Size (the base):** the eval mode in `live_model.json`:
  - $800 up to a 25-pt stop, then 800 × 25 ÷ stop;
  - the weekly stop;
  - never more than 60% of the room to the trailing max-loss floor.

  A grade multiplier is applied with one rounding. A sized-up trade never risks more than **$900**. Without that cap a 1.5x
  trade on a 22-pt stop risks $1,190, and MFFU's $1,000 daily loss limit flattens it before a winner can come back.
- **Money:**
  - **Net $ and max DD** come from playing MFFU 50K evals back to back, as in the eval-sizing study.
  - **Eval odds** come from a fresh eval started on every session.
  - **"Funded $"** is the same trades at $800/25 without the room cap. It is a money line that doesn't depend on when an eval
    happened to pass.

  Costs: $1.40 a micro, plus 1 tick of slippage on market entries and stops.

## What a good LIT setup looks like in numbers

Each setup taken alone, unit size. "Win" means it made more than 0.5R. "Avg R" is the average result per setup. The cut
points come from H1.

| Feature (known at the trigger) | Side | H1 setups | H1 win % | H1 avg R | H2 setups | H2 win % | H2 avg R | Holds in both? |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Inducement (trap) age** | ≤ 6 bars (30 min) | 57 | 28.1 | **+1.14** | 27 | 33.3 | **+0.72** | yes |
| | older | 64 | 10.9 | +0.01 | 28 | 25.0 | +0.32 | |
| Sweep depth | 1.6-2.7 ATR (middle) | 40 | 30 | +0.97 | 17 | 47 | +1.07 | yes, but 2021-25 prefers shallow |
| | shallower / deeper | 40 / 41 | 15 / 12 | +0.37 / +0.30 | 21 / 17 | 29 / 12 | +0.35 / +0.18 | |
| Planned stop | < 31.5 pts | 40 | 20 | +0.86 | 21 | 29 | +0.74 | yes (small) |
| | > 45.5 pts | 41 | 17 | +0.28 | 18 | 28 | +0.40 | |
| Entry time | before 04:05 ET | 40 | 18 | +0.69 | 15 | 40 | +1.29 | yes |
| | after 07:10 ET | 43 | 23 | +0.53 | 21 | 29 | +0.03 | |
| Levels already taken today | ≤ 30 | 40 | 22 | +1.01 | 17 | 29 | +0.71 | yes |
| | ≥ 36 | 45 | 18 | +0.24 | 23 | 26 | +0.34 | |
| High-impact news day | yes | 18 | 11 | +0.36 | 11 | 18 | −0.04 | yes (small n) |
| A stop-out already this week | yes | 56 | 18 | +0.30 | 25 | 16 | −0.02 | yes (the weekly stop already uses it) |
| The day's opposite extreme was made in London | yes | 15 | 7 | −0.16 | 11 | 27 | +0.26 | yes (small n) |
| Room to the first opposing level | < 1.05R | 40 | 20 | +0.41 | 16 | 19 | +0.18 | weak in H1, clear in H2 |
| Displacement body | > 1.25 ATR | 41 | 22 | +0.50 | 14 | 14 | −0.39 | mostly H2 |
| ES swept its own low too | yes | 95 | 19 | +0.54 | 31 | 35 | +0.82 | H2 only |
| VIX level, premium/discount vs 18:00 open, Asia position, direction | | | | | | | | **no difference** |

Note on this table: most of these features were already tested one at a time in `lit-losses.md` and `lit-report-*.md`. The
question here is whether **combining** them into a grade, or a model, picks better trades.

## The trader's grade (A / B / C)

Written from LIT practice, not fitted. Each item scores 1 point:
1. **Fresh trap:** the inducement swing was made at most 6 bars (30 min) before the sweep.
2. **Quality liquidity:** the sweep took 2+ levels, or a daily/weekly/monthly level or an opening gap.
3. **Room to run:** the first opposing level is at least 1.5R away, or there is none before the VIX band.
4. **Clean clock:** London morning (02:00-08:00 ET) and no high-impact release in the next 60 minutes.

**A** = 4 points, **B** = 2-3, **C** = 0-1.

| Grade | H1 setups (filled) | H1 win % | H1 avg R | H2 setups (filled) | H2 win % | H2 avg R | 2021-25 avg R |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 21 (16) | 25.0 | **+1.21** | 17 (9) | 66.7 | **+2.83** | −0.05 |
| B | 164 (91) | 17.6 | +0.47 | 78 (40) | 22.5 | +0.11 | −0.02 |
| C | 37 (14) | 21.4 | +0.25 | 13 (6) | 16.7 | −0.25 | +0.09 |

- **The order holds in both halves of 2026** (A > B > C), but it rests on 16 and 9 filled A setups.
- **Each item on its own is less tidy.** Only the fresh trap helps in both halves. In H1, "room to run" and "clean clock" point
  the wrong way. Setups with 3 points did worse than those with 2 in both halves.
- **In 2021-25 the order reverses** (C best). Those years have 5m bars only, and LIT has no edge there at all.
- **Honesty note:** the grade was written after looking at a one-feature table of both halves. So H2 is not a perfectly clean
  check for it. The walk-forward model below is the clean test.

**The data-mined grade**, for comparison:
- **How it was built:** the 4 strongest H1 splits, one per family:
  - sweep depth 1.6-2.7 ATR;
  - inducement < 0.39 ATR above the level;
  - CISD leg ≥ 5 bars;
  - Asia range 0.39-0.52 VIX moves.
- **H1:** A setups won 39% (+1.59R).
- **H2:** A setups won 20% (−0.02R). Picking on the data you test on finds noise.

## Rules on the real path (eval size, costs in)

Base: LIT live with the eval size, 120 trades in 2026. Size rules keep the same trades, so trades a week, win % and weeks
with 2+ trades stay the same.

| Rule | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2 wk p/f | 3 wk p/f | 1 mo p/f | Pass rate | Median | Funded $ |
|---|---|---:|---:|---:|---:|---:|---:|---|---|---|---:|---:|---:|
| **Base (LIT live, eval size)** | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | −2,513 | 37.5/3.1 | 53.1/4.7 | 60.2/6.2 | 92.3 | 10.5 | +37,046 |
| | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | −2,157 | 29.5/0.0 | 38.5/0.0 | 47.4/0.0 | 95.7 | 17.5 | +11,659 |
| | 2021-25 | 2.38 | 17.5 | 0.98 | −1,430 | −28 | −17,694 | 8.8/8.1 | 12.6/13.5 | 15.8/20.8 | 30.7 | 16.5 | +4,252 |
| **Fresh trap ≤ 6 bars 1.25x, else 0.75x** (`lit_sel_trap6_size`) | H1 | 3.12 | 22.5 | 5.09 | **+39,712** | 6,515 | **−2,206** | **43.0/2.3** | 58.6/3.9 | 67.2/5.5 | 92.7 | 10 | +41,476 |
| | H2 | 2.56 | 35.0 | 2.63 | **+11,353** | 3,057 | **−2,003** | 29.5/0.0 | 38.5/0.0 | 47.4/0.0 | 97.2 | 19.5 | +12,361 |
| | 2021-25 | 2.38 | 17.5 | 0.96 | −3,168 | −62 | −15,862 | 7.6/6.7 | 11.6/12.1 | 14.6/20.3 | 29.5 | 16 | +1,414 |
| Fresh trap ≤ 8 bars 1.25x, else 0.75x (`lit_sel_trap8_size`) | H1 | 3.12 | 22.5 | 4.47 | +36,712 | 6,023 | −2,426 | 42.2/3.1 | 57.8/7.8 | 64.8/8.6 | 88.2 | 10 | +42,591 |
| | H2 | 2.56 | 35.0 | 2.47 | +10,824 | 2,914 | −2,184 | 28.2/0.0 | 34.6/0.0 | 47.4/0.0 | 97.1 | 19 | +11,899 |
| **Trader's grade A 1.5x / B 1x / C 0.5x** (`lit_sel_grade_size`) | H1 | 3.12 | 22.5 | 4.11 | +34,702 | 5,693 | −2,513 | 37.5/3.1 | 53.9/4.7 | 64.1/6.2 | 91.5 | 11 | +37,803 |
| | H2 | 2.56 | 35.0 | 2.81 | **+12,070** | 3,250 | −2,093 | **34.6/0.0** | **47.4/0.0** | **55.1/0.0** | 96.0 | **15** | **+15,673** |
| | 2021-25 | 2.38 | 17.5 | 0.93 | −6,335 | −124 | −19,065 | 8.6/7.9 | 12.0/12.7 | 13.6/20.5 | 27.3 | 14 | −2,341 |
| Trader's grade: skip C, wait for a later setup (`lit_sel_grade_skipc`) | H1 | 2.97 | 22.4 | 4.44 | +35,598 | 5,840 | −2,513 | 37.5/3.1 | 54.7/4.7 | 64.1/6.2 | 92.5 | 11 | +37,038 |
| | H2 | **2.24** | 37.1 | 2.69 | +10,623 | 2,860 | −1,984 | 29.5/0.0 | 38.5/0.0 | 47.4/0.0 | 97.3 | 20 | +12,454 |
| | 2021-25 | 2.07 | 16.0 | 0.75 | −19,360 | −379 | −27,363 | 7.1/5.9 | 10.4/10.7 | 12.8/18.2 | 24.3 | 13 | −5,889 |
| Trader's grade: A only (the sniper) | H1 | **0.59** | 26.7 | 5.31 | +12,377 | 2,031 | −1,600 | 10.9/0.0 | 14.8/0.0 | 18.8/0.0 | 100 | 12 | |
| | H2 | **0.58** | 66.7 | 13.68 | +14,884 | 4,007 | −681 | 33.3/0.0 | 44.9/0.0 | 67.9/0.0 | 100 | 17 | |
| Data-mined grade A 1.5x / B 1x / C 0.5x (`lit_sel_data_grade`) | H1 | 3.12 | 22.5 | 4.45 | +38,385 | 6,297 | −2,513 | 44.5/3.1 | 61.7/4.7 | 65.6/6.2 | 91.8 | 9 | +43,471 |
| | H2 | 2.56 | 35.0 | 2.08 | **+6,793** | 1,829 | −1,862 | 29.5/0.0 | 39.7/0.0 | 50.0/0.0 | 100 | 17 | +11,775 |
| Model: top quarter 1.25x, bottom quarter 0.5x (`lit_sel_model_size`) | H1 | 3.12 | 22.5 | 3.99 | +33,343 | 5,470 | −2,513 | 37.5/3.1 | 52.3/4.7 | 60.2/6.2 | 92.3 | 10.5 | +36,956 |
| | H2 | 2.56 | 35.0 | 2.14 | **+7,396** | 1,991 | −2,181 | **15.4/0.0** | 25.6/0.0 | 41.0/0.0 | 95.7 | 21 | +8,537 |

The model rule's H1 line only changes in May-Jun (fold 1). Jan-Apr is its training data, so it is traded at base size there.

**Other rules tried** (all in `research/lit/select_results.json`):
- **2 trades a day, the second only if it grades A:** +1 trade in each half; H1 −$4, H2 −$372.
- **Every other grade-size mix** (A 1.25-1.5, C 0.5-1):
  - The trader's grade gains $0.6k-2.8k in H1 and $0k-4.1k in H2.
  - The data grade gains in H1 and loses up to $4.4k in H2.
- **Every single-feature size tilt** of the top 15 H1 splits (`research/lit/select_single.json`):
  - At a neutral average size (1.25x / 0.75x), only the **fresh-trap** tilts at 5-8 bars helped both halves.
  - Plain "1.5x on X, else 1x" rules gain in both halves for almost any X. That is extra size, not selection (see the shuffle
    test below).

**Picking the trap age on H1:**
- Among the neutral 1.25x / 0.75x versions, H1 net on the eval path picks 6 bars: +$6.4k, against +$0.7k at 5 bars and
  +$3.4-3.7k at 8-12.
- H1 "funded $" picks 8 bars: +$5.5k vs +$4.4k.
- In H2, 5, 6 and 8 bars all gain a little (+$0.36k to +$0.89k on the eval path); 10 and 12 bars lose.
- The 8-bar version raises 1-month eval fails in H1 (8.6% vs 6.2%) and is slower in H2. So the 6-bar version is the candidate.

## The model (walk-forward)

- **What it is:** a logistic regression in numpy (no sklearn on the box) on 36 numeric and 14 yes/no features.
  - The L2 strength was picked by leave-one-month-out log loss inside the training data.
  - A boosted-stumps model (60 one-split trees) was the second learner.
  - A third version added 2021-25 to the training data.
- **Folds:**
  - train Jan-Apr, test May-Jun (82 training setups, 18 winners);
  - train Jan-Jun, test Jul-Oct (121 training setups, 23 winners).
- **Skill out of sample** (AUC = the chance a random winner scores above a random loser; 0.5 = a coin flip):

| Model | Fold 1 (test May-Jun) | Fold 2 (test Jul-Oct) |
|---|---:|---:|
| Logistic | 0.23 | 0.47 |
| Logistic, less shrinkage (in-sample AUC 0.83-0.99) | 0.19-0.24 | 0.43-0.46 |
| Boosted stumps | 0.33 | 0.38 |
| Logistic + 2021-25 in training | 0.29 | 0.52 |

- **Calibration, fold 2 logistic** (Jul-Oct, 55 filled setups in 4 bins of predicted win rate):

| Predicted win % | 16.7 | 18.1 | 19.2 | 21.0 |
|---|---:|---:|---:|---:|
| Real win % | 21.4 | 38.5 | 42.9 | **14.3** |

  - The cross-validation chose the strongest shrinkage, so every setup gets almost the same probability. The model is
    saying "I can't tell them apart".
  - Fold 1 is worse: predicted 21% to 26%, real 30%, 11%, 10% and 0%. The order is reversed.
- **Importances in plain words** (the fold-2 fit with less shrinkage; it does not hold out of sample):
  - Liked: a fresh, close trap; a long CISD leg; the first day of the week; a later entry hour.
  - Disliked: the day's opposite extreme made in London; many levels already taken today; ES leading the move; a hot run of
    recent LIT results.

  The boosted stumps split most on the inducement distance and age, the sweep depth, the time and last week's trend.
- **How sure can we be?** Not at all, at this sample size:
  - **The numbers:** 121 training setups with 23 winners, and test sets of 39-55 setups with 6-16 winners.
  - **What it would take:** to show a 10-point win-rate difference (20% vs 30%) reliably takes about 150 trades on each side.
    That is roughly 5 years of LIT at today's pace.
  - **What it means:** LIT's few big winners (5-8R) carry all the money. One or two trades decide any comparison.
  - **What happens in practice:** a model fitted on Jan-Apr inverted on May-Jun. Even the best inputs (trap age and distance)
    flip from fold to fold.

## Is it selection or just more size? (the shuffle test)

- **The problem:** LIT makes money on average, so any rule that sizes up some trades also adds dollars.
- **The test:** keep the same trades and the same set of multipliers, but shuffle which trade gets which multiplier, 400
  times per half. The p-value is the share of shuffles that did as well as the rule. Small means the rule puts its size on
  better trades than chance would.

| Rule | p H1 | p H2 | Avg R per unit of size H1 / H2 (base 0.79 / 0.67) |
|---|---:|---:|---|
| Fresh trap ≤ 6 bars 1.25x / 0.75x | **0.00** | 0.10 | 1.00 / 0.70 |
| Fresh trap ≤ 8 bars | **0.00** | 0.30 | 0.94 / 0.64 |
| Trader's grade A 1.5 / B 1 / C 0.5 | 0.30 | **0.005** | 0.90 / 0.90 |
| Data-mined grade | **0.00** (picked there) | 0.41 | 1.00 / 0.71 |
| Model | 0.70 | 0.69 | 0.76 / 0.58 |

None of the rules passes in both halves.

## Recommendation

1. **Don't add a model or a skip rule.**
   - The model has no out-of-sample skill.
   - Skipping C setups costs trades (H2 2.24 a week, 69% of weeks with 2+) and gains nothing in funded $ in H1.
   - In 2021-25 skipping costs $18k.
2. **Adopt-candidate (optional switch, low confidence): the fresh-trap size tilt.**
   - **The rule:** at the eval size, 1.25x when the qualifying inducement swing was made at most 6 five-minute bars before the
     sweep, else 0.75x. One rounding with the weekly stop, minimum 1 micro, still under the 60% room cap.
   - **What it does:**
     - H1 +$6.4k, H2 +$0.9k;
     - max DD lower in both halves;
     - 2-week eval pass H1 43.0% vs 37.5%; H2 unchanged at 29.5%;
     - pass rate 92.7 / 97.2% (base 92.3 / 95.7%).
   - **The cost:** the H2 median pass is 19.5 sessions vs 17.5. 2021-25 (5m) is $1.7k worse on the eval path and $2.8k worse
     in funded $.
   - **Why only a candidate:** it agrees with what `lit-losses.md` found (a shorter inducement age is better at every age, in
     both halves). But the H2 gain is small, and the shuffle test only passes in H1.
3. **Track, don't trade: the trader's A/B/C grade.**
   - Print it on every paper trade and decide after about 40 more trades.
   - If A trades keep winning about twice as often as B, turn on A 1.5x / C 0.5x with the $900 risk cap.
4. **Whatever is sized up must stay under the $1,000 daily loss limit.** Without the $900 cap, the 1.5x grade versions lost
   money in H1. MFFU's soft limit flattened 1.5x trades on tight stops before they could win.

## Honest caveats

- **2026 is one year:** 330 setups and 120 trades. The A grade rests on 16 + 9 filled setups.
- **H2 is not perfectly clean for the trader's grade** (see the honesty note). It is clean for the fresh-trap tilt's
  threshold, which was picked on H1 net.
- **The eval-path $ are noisy.** When a sized-up trade makes an eval pass a day earlier, the next eval starts at a different
  point. "Funded $" and the shuffle test are the steadier yardsticks.
- **2021-25 (5m entries only) shows no selection edge for any rule.** LIT has no edge there to select from.
- **Paper only.** Nothing touches `live_model.json`, `engine/lit_live.py`, `STRATEGY.md` or the dashboards.

## Files and how to rerun

- `python tools/lit_select.py build`: the candidates, outcomes and features (cached in `research/runs/_cache/litsel_*.pkl`,
  about 2 min).
- `python tools/lit_select.py check`: the replay equals LIT live.
- `python tools/lit_select.py lookahead 14`: the truncation test.
- `python tools/lit_select.py explore`: the one-feature tables → `research/lit/select_explore.json`.
- `python tools/lit_select.py rank`: the H1 split ranking.
- `python tools/lit_select.py rules`: the grades and the rule grid → `research/lit/select_results.json`.
- `python tools/lit_select.py anatomy`: the grade items and the grade's neighbours → `research/lit/select_anatomy.json`.
- `python tools/lit_select.py single`: the one-feature size tilts → `research/lit/select_single.json`.
- `python tools/lit_select.py model`: the walk-forward models, calibration and model rules → `research/lit/select_model.json`.
- `python tools/lit_select.py finalists 1`: the finalists, the shuffle test, and the runs `lit_sel_*` (family other, tags lit,
  lit_select) → `research/lit/select_final.json`.
- 1 CPU process. Nothing was committed by this study.
