## In one minute

- **The question:** keep every signal exactly as it is, but let a model look at what is known when the order goes in
  (volatility, VIX, time, distance to levels, sweep / stop / target geometry, the strategy's own recent results, ES) and say
  "this one is more likely to win than usual" -> trade it bigger, "less likely" -> smaller. Never skip, never add trades.
- **Verdict: no.** Nothing passes the strict bar on any strategy. Do not wire it.
- **What the models learn is real but useless for sizing:** a trade with a far target wins less often. That is already priced
  in: far-target trades win less but win more when they win. The models predict "win yes/no" a bit, but **expected R
  (what pays) not at all**.
- **Money:** on LIT the best-looking tilt makes +$1.2k more in 2026 H2 and -$2.0k less in H1; on the MFFU eval path every
  tilt passes fewer evals within 2 weeks. On ATLAS's 25K the tilts trade fewer dead evals for fewer passes.
- **The negative control worked:** the stop-hunt candidates (an audit already called them weak / not real) show no skill at
  all, so the pipeline is not inventing edges.
- **Samples are too small for H2:** with 40 LIT trades in 2026 H2, a model needs an AUC above 0.83 to beat 95% of shuffled
  models. That needs roughly 150-200 more LIT trades on 1m bars (about a year at 2.9 a week).

## What was done

| Signal set | Trades | Out-of-sample trades (walk-forward) | First test month | 2026 H2 test (model frozen on data before July) | Features |
|---|---|---|---|---|---|
| LIT (run `lit_live`) | 630 | 506 | 2022-12 | 40 (trained on 590) | 102 |
| ATLAS members EMA + MACD + S/R (pooled, member is a feature) | 1,395 | 1,253 | 2022-05 | 57 (trained on 1,337) | 44 |
| Stop-hunt Asia resweep (control) | 558 | 437 | 2022-10 | 40 | 46 |
| Stop-hunt trend inducement (control) | 467 | 344 | 2022-11 | 24 | 49 |

- **Features, all known at the fill:** 5m ATR and its 20-day percentile, realized volatility (1h / 4h / 1 day and their
  ratio), return over 1h / 4h / 1 day and distance to EMA 50 / 200 / 600 (signed by the trade's side), distance to the 18:00
  open, the day's range so far vs the daily ATR, position in that range, distance to the prior day's high / low, daily ATR
  and its 1-year percentile, prior day / 5 days with the trade, VIX / VXN level, 1- and 5-day change, percentile, VXN-VIX,
  VIX9D/VIX3M, ES prior day with the trade and ES minus NQ (ES intraday only from 2025-04), minute of day, weekday, stop in
  points / ATR / daily ATR, R:R to the target, the strategy's own last 5 / 10 / 20 finished trades (mean R, win share,
  streak, days since the last exit). LIT adds the ~60 entry facts of `research/lab/trade_intel.json` (sweep depth,
  displacement, inducements, level type and age, fill kind ...); stop-hunt adds pool score, flags, session.
- **No look-ahead:** every market feature reads only bars closed by the fill. Check: for 25 random trades per set the
  features were rebuilt from data cut at the fill (every later bar deleted, all arrays recomputed from scratch): 100/100
  identical (`research/quant/meta/cut_check.json`). The trade_intel facts have their own cut-data test
  (`tests/test_trade_intel.py`).
- **Walk-forward:** every calendar month is predicted by models trained only on trades that **exited at least 2 days before
  the month starts** (purge + embargo), expanding window, first test month once 120 trades are in training. Plus one model
  frozen on everything before 2026-07-01 that predicts all of 2026 H2.
- **Models (small on purpose):** L2 logistic (strong penalty), gradient boosting (depth 3, 80 trees), random forest (depth
  3, 150 trees), the trees Platt-calibrated; each on all features and on a 12-feature core set chosen before looking (stop in
  ATR, R:R, ATR percentile, VIX, VIX 5-day change, vol ratio, distance to the 18:00 open, 4h return, EMA 200, time of day,
  last-10 mean R). Expected R: ridge + boosting. 10 models in all. No feature selection on outcomes.
- **Baseline:** the training set's win rate (Brier skill vs that), and a trivial model on the R:R (+ the member for ATLAS)
  only.
- **Permutation test:** the trades' results are shuffled (the recent-performance features recomputed from the shuffled
  results), the whole walk-forward re-run, 100 times per set. The statistic is the **best of the 10 models**, so the test
  pays for having tried 10.
- **Sizing:** multiplier m = 0.5 + the trade's percentile among the training predictions ("rank", average ~1) or p / base
  rate ("edge"), clipped 0.5-1.5; smaller size never below 1 micro. Compared with flat (x1) and with **random sizing** (the
  same multipliers shuffled over the span's trades, 200 draws; 20-40 on the eval paths). $ views: the strategy's own size
  rule (LIT $800/20-pt rule as run lit_live; ATLAS / stop-hunt $500 risk) and the eval paths - LIT 2026 two_week path
  (`tools/lit_big_ideas.run_eval_x`, a size-up capped by 60% of the room and the soft daily loss), ATLAS Builder 25K need
  path (`tools/second_account_b.py`, capped by 50% room, $600 soft loss, 20 micros). Costs in everywhere.

## Can the models tell a winner? (out of sample)

Win = R >= +0.5. AUC 0.50 = a coin, 1.00 = perfect. "p (10 models)" = share of shuffled runs whose best model did as well.

| Set | Win rate | Best walk-forward AUC (model) | p (10 models) | R:R-only AUC | Best 2026 H2 AUC, frozen model | p (10 models) | H2 null 95% line | Expected R: rank correlation OOS / H2 |
|---|---|---|---|---|---|---|---|---|
| LIT | 14% (2021-25), 23% H1, 33% H2 | 0.595 (logistic, core) | 0.01 | 0.579 | 0.618 (logistic, core) | 0.75 | 0.835 | +0.03 / -0.17 |
| ATLAS | 19% (2021-25), 36% H1, 32% H2 | 0.669 (logistic, all) | 0.01 | 0.680 (R:R + member) | 0.667 (logistic, all) | 0.19 | 0.707 | +0.04 / +0.08 |
| Stop-hunt Asia | 32-40% | 0.524 | 0.61 | 0.465 | 0.545 | 0.92 | 0.722 | +0.02 / -0.11 |
| Stop-hunt trend | 30-42% | 0.527 | 0.54 | 0.463 | 0.614 | 0.70 | - | ~0 / negative |

- **Over the whole walk-forward the LIT and ATLAS models beat 99% of shuffled models.** Taken alone, the ATLAS logistic also
  beats 98% of them on H2. But the trivial R:R model does as well (LIT 0.58 vs 0.60; ATLAS 0.68 vs 0.67), so what is learnt is
  "a far target is hit less often". That is a property of the target, not an edge.
- **Brier skill** (how much better the probabilities are than the base rate): LIT +0.02 at best (the all-feature logistic is
  worse than the base rate, -0.07), ATLAS +0.05 to +0.08. Small.
- **Expected R is not predictable.** Ridge / boosting on R correlate ~0 with the real R out of sample and are negative on LIT
  H2 (-0.17). Trained on 2026 H1 only (80 trades, the LIT rule's own pick half), H2 AUCs are 0.36-0.58 and the R predictions
  correlate -0.08 to -0.37 with what happened (`research/quant/meta/lit_2026only.json`).
- **Importance is only half stable.** The top-10 features of half-yearly refits overlap 56% (LIT) / 64% (ATLAS). Features
  whose sign never flips: LIT - recent win share (-, i.e. after a good run the next trade wins slightly less), R:R (-), the
  high/low-of-week window (+), a NY-box sweep (-), the vol ratio (+); ATLAS - member S/R (+), R:R (-), ES vs NQ prior day
  (+). None of these were new: trade_intel and the LIT studies listed and rejected them as rules.
- **Regime note (LIT):** 2021-25 fills on 5m bars only (win rate 14%), 2026 on 1m bars (23-33%). The H2 model is trained
  mostly on the 5m regime; the `fill_1m` feature tells it which, but 120 1m trades are too few to learn the 1m regime alone.

## What it does to the money

### LIT, size rule of run lit_live (2021-25 walk-forward, 2026 H1 walk-forward, 2026 H2 frozen model)

| Sizing | 2021-25 net | 2026 H1 net | 2026 H2 net | 2026 H2 beats random sizing |
|---|---|---|---|---|
| Flat (today) | +$1,211 | +$33,891 | +$9,493 | - |
| Logistic all, rank | +$5,081 | +$24,941 | +$8,494 | 45% |
| Logistic core, rank (best AUC) | +$4,174 | +$24,545 | +$9,992 | 79% |
| Boosting all, rank (best H2 $) | +$5,538 | +$31,910 | +$10,688 | 87% |
| Ridge on R, rank | +$4,303 | +$35,489 | +$9,469 | 27% |

- 2021-25 looks better for nearly every tilt, but random tilts with the same multipliers make +$1.3k to +$3.1k there too.
  Smaller-than-1 sizes are rounded down while x1.5 hits the 40-micro cap, so the average size falls to ~0.9 and a
  break-even span loses less. No tilt beats 95% of random tilts in 2021-25 (best 84%).
- 2026 H1 (the half LIT was picked on): every classifier tilt loses $2k-$10k. The H1 winners were the far-target trades the
  model sizes down.

### LIT eval path (live two_week sizing, MFFU 50K, 2026)

| Sizing | H1 net | H1 2-week pass / fail | H2 net | H2 2-week pass / fail |
|---|---|---|---|---|
| Flat (today) | +$34,234 | 57.1 / 5.9 | +$9,059 | 52.2 / 0.0 |
| Logistic all, rank | +$24,660 | 32.8 / 0.0 | +$8,422 | 46.4 / 4.3 |
| Logistic core, rank | +$20,811 | 23.5 / 0.0 | +$5,478 | 49.3 / 4.3 |
| Boosting all, rank | +$22,433 | 38.7 / 0.0 | +$8,201 | 50.7 / 0.0 |
| Forest all, rank | +$25,630 | 40.3 / 0.0 | +$9,146 | 33.3 / 0.0 |
| Ridge on R, rank | +$31,535 | 40.3 / 3.4 | +$9,927 | 50.7 / 4.3 |

The two_week size is "one winner passes": it already sits at the 60%-room and soft-daily-loss caps, so a x1.5 is mostly cut
back, and a x0.5 on the trade that would have passed the eval turns a 2-week pass into a 3-4-week one. **Every tilt passes
fewer evals within 2 weeks in H1, and none passes more in H2.**

### ATLAS members on the Builder 25K path (need sizing, no-hedge)

| Sizing | H1 net, 2-wk pass / dead | H2 net, 2-wk pass / dead | 2025 net, 2-wk pass / dead | 2021-24 net, 2-wk pass / dead |
|---|---|---|---|---|
| Flat (today, = run acctb_25k_need) | +$19,722, 68.9 / 7.6 | +$5,391, 43.5 / 0.0 | +$1,020, 28.9 / 34.9 | +$8,990, 23.9 / 38.9 |
| Logistic all, rank | +$17,937, 63.0 / 5.0 | +$5,619, 43.5 / 0.0 | +$4,574, 20.5 / 23.7 | +$7,815, 17.6 / 27.2 |
| Boosting all, rank | +$17,578, 62.2 / 4.2 | +$6,935, 43.5 / 0.0 | +$1,253, 17.3 / 25.7 | +$5,427, 18.3 / 30.6 |
| Ridge on R, rank | +$19,462, 63.9 / 5.0 | +$5,628, 43.5 / 0.0 | +$4,532, 18.5 / 20.9 | +$3,304, 16.5 / 26.1 |

"Dead" = failed or stuck. The tilts cut dead evals by ~10 points in 2021-25, but they also cut 2-week passes by 5-8 points:
that is what a smaller average size does, and random tilts do the same (they beat random in 20-95% of draws, no pattern). At
the $500 rule, 2021-25 nets $32k-$44k vs flat $41.8k; H2 looks better (+$16.4k vs +$13.6k) only because the frozen model's
H2 predictions sit above its training ones (average size x1.17); random tilts at that size make +$15.4k.

### Stop-hunt candidates (negative control, $500 a trade)

Asia resweep: flat 2021-25 +$33.7k / H2 +$2.9k; tilts +$28.7k to +$37.2k / +$1.2k to +$2.6k. Trend inducement: flat +$39.7k /
+$4.9k; tilts +$32.1k to +$40.7k / +$2.9k to +$5.6k. No skill, no money. The pipeline does not find edges where the audit
says there are none.

## The strict bar

Pass = (a) out-of-sample skill above the shuffled models in 95%+ of permutations, best-of-10 (walk-forward AND 2026 H2), AND
(b) more $ and 2-week eval odds at least as good as flat in 2026 H2 AND the 2021-25 walk-forward, eval path included.

| Set | (a) walk-forward | (a) 2026 H2 | (b) any sizing | Pass |
|---|---|---|---|---|
| LIT | yes (p 0.01) - but it is the R:R | no (p 0.75) | none | no |
| ATLAS | yes (p 0.01) - but it is the R:R + member | no (p 0.19) | none | no |
| Stop-hunt Asia | no (p 0.61) | no (p 0.92) | none | no |
| Stop-hunt trend | no (p 0.54) | no (p 0.70) | none | no |

**Nothing is wired. No engine, model or sizing file was touched.**

## What the sample can and cannot support

- 40 LIT trades in 2026 H2 (13 wins): one AUC has a standard error of about 0.09. A model would need ~0.83 to beat 95% of
  shuffled 10-model families. No honest model of trade outcomes gets near that; this test can only catch a huge edge.
- 506 walk-forward LIT trades are enough to detect AUC ~0.57, and we did, but 80% of them are the 5m-only 2021-25 regime,
  which LIT itself does not trade like (2021-25 PF 1.01).
- To test a real 0.60 AUC on 1m-regime LIT with 95% confidence needs ~150-200 test trades: about a year more of 2.9 trades a
  week. Rerun then (`python -X utf8 tools/meta_label.py all`, ~3.5 h on 4 cores; resumable).
- Better win probability alone is not enough: the sizing must predict **R**, and R was unpredictable in every set.

## Files

- `tools/meta_label.py` (build / run / save / summary). Feature cache and permutation cache: `research/runs/_cache/meta_*.pkl`
  (gitignored).
- `research/quant/meta/{lit,atlas,sh_asia,sh_trend}.json`: every metric per span, per-model permutation p, importance per
  refit, every sizing x span vs flat and random, the out-of-sample predictions; `summary.json`; `cut_check.json`;
  `lit_2026only.json`.
- Runs `ml_lit_lr_rank`, `ml_atlas_lr_rank`, `ml_sh_asia_lr_rank`, `ml_sh_trend_lr_rank` (logistic rank tilt at the
  strategy's own size rule; status rejected).
