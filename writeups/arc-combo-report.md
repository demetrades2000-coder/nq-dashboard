# Confluence combinations: nested walk-forward on real CME futures (16 Oct 2026)

Scripts: `study_combo_night.py` (grid, walk-forward, placebo, bootstrap, neighbourhood, MFFU evals) and
`study_combo_night_diff.py` (which trades a candidate adds or removes). Raw output: `study_combo_night_results.txt`.
Re-run when more CME history is imported:
`python -X utf8 study_combo_night.py --sym NQ --check ES --from 2026-08-06 --to <last day> --workers 4`.
Nothing in `engine/` was changed.

**Data (owner's rule: no CFD data):** NQ futures 5m, 2026-08-06 to 2026-10-16 (52 sessions, 11 calendar weeks,
TradingView exchange bars from 24 Aug). ES futures, same dates, used only as a cross-instrument check and never for
selection. Research sizing is the same as every earlier study: grade sizing at $350, `dd_aware` off, no daily stop.
`memory_seed` is off so paper or live trades in memory cannot leak into the test (it made no difference: same 29 trades).
The MFFU table uses the live risk settings.

## Summary

1. **Keep the defaults.** No way of choosing a combination beats them out of sample by a margin that clears noise.
   The best selection rule adds +0.14R per week over the defaults on the test weeks (90% CI -0.31 to +0.58), and it
   falls below 2 trades a week in 2 of its 3 test folds. The rule that maximises expectancy on the training weeks
   loses to the defaults (-0.57R per week, CI -1.03 to -0.17) and takes 0 trades in its first test fold.
2. **The defaults are an ordinary member of the family, not a lucky peak.** All 390 configs inside the 2.0-4.5
   trades/week band made money on NQ. On the out-of-sample weeks the defaults land at the 42nd percentile of those
   configs. Every one of the 864 configs **lost money on ES** over the same weeks. The NQ and ES rankings are
   unrelated (correlation -0.11). The combination knobs do not create the edge: the edge is the NQ market in Aug-Oct
   2026, and on ES the same machinery loses about 0.35R a trade whatever the gate settings.
3. **The only candidate that comes up repeatedly is `w_htf: 0`** (drop the 1H-trend term from the entry score).
   Three of the four rules picked it in 2 of the 3 folds. Over the full sample it raises the win rate from 45% to 53%
   and average R from +1.07 to +1.17, with ES slightly less bad. But it adds 7 trades and drops 6, and the whole gain
   comes from swapping one 5R runner (28 Aug) for another (17 Aug). In fold 2 it did worse than the defaults out of
   sample. Its per-knob marginal across all configs is flat (+1.02R vs +1.00R on NQ, -0.34R vs -0.35R on ES). It is
   a knife-edge, not an effect.
4. **Win rate against expectancy:** no config in the frequency band reaches a 55% win rate over the full sample. The
   45-55% bucket tops out at 52% wins and +1.56R per trade, but only at exactly 2.0 trades/week (min_score 2), which
   is on the floor. Out of sample the high-win-rate rule gave 43% wins and +1.02R per trade. The defaults gave 40% and
   +0.67R. The bootstrap 90% interval on out-of-sample win rate is roughly 20-65% for every rule. With 12-20 test
   trades, a 45% win rate and a 55% win rate cannot be told apart.
5. **MFFU 50K:** with live risk settings every finalist passes from day 1 or day 2 to day 8, with 0 failed rolling
   evals and a median of 14-16 days in the Monte Carlo. The worst day (-$285) and worst intraday dip (-$676) are the
   same trade in all of them. On NQ none of them is clearly faster or safer than the defaults. On ES all of them lose
   $3.4k-$4.6k at research sizing, which is beyond the $2,000 MLL. The real eval risk is the regime, not the
   combination.

## Search space (9 existing knobs, 864 distinct configs after removing duplicates)

| knob | values (first = default) |
|---|---|
| min_score | 1, 0, 2 |
| w_htf | 1, 0 |
| w_m15 | -1, 0 |
| w_vwap | 0, 1 |
| grade_skip | "", "D" |
| entry_windows | both killzones; AM only; AM + 13:30-15:00 |
| max_trades_day | 2, 1 |
| stop_after_win | True, False (only matters with 2 trades/day) |
| min_rr | 1.5, 2.0 |

`w_lrl: 1` and `w_pd: 1` stay at their defaults, so the score gate still has three live terms plus the 15m term.
`w_dol`, `w_keylevel`, `w_midnight`, `w_first`, `w_major` and `w_vol` were left out on purpose. With 29 base trades,
every extra knob adds selection noise faster than it adds information. Confluence Agent 1 owns the single-confluence
question.

## Walk-forward design

Calendar-week blocks with an expanding training window. Selection uses only the training weeks, and a config must
make 2.0-4.5 trades/week there with at least 6 trades. Each rule's choice is then run untouched on the next 2 weeks
(the last fold takes 3).

| fold | train | test |
|---|---|---|
| 1 | 03 Aug - 28 Aug (4 wk) | 31 Aug - 11 Sep |
| 2 | 03 Aug - 11 Sep (6 wk) | 14 Sep - 25 Sep |
| 3 | 03 Aug - 25 Sep (8 wk) | 28 Sep - 16 Oct (3 wk) |

Rules: **expectancy** (highest train avg R) · **t-stat** (mean/sd x sqrt n) · **win-rate** (highest win rate with
positive avg R) · **worst-block** (best worst 2-week block of total R, the owner's "worst period" idea) · **defaults**
(no selection) · **oracle** (best config on the test block in hindsight, an upper bound that cannot be reached in
practice).

### Out-of-sample results only (pooled test weeks, 7 weeks / 35 sessions)

Cells: trades · trades/wk · win rate · avg R · net $ · PF · max DD.

| rule | OOS NQ | 90% CI avg R | 90% CI win rate | P(avg R <= 0) | OOS ES (same configs) | weekly R vs defaults (90% CI) | folds under 2/wk |
|---|---|---|---|---|---|---|---|
| **defaults** | 20 · 2.9/wk · 40% · +0.67R · +$3,560 · PF 3.7 · DD -288 | +0.01..+1.34 | 20-60% | 0.04 | 31 · 4.4/wk · 16% · -0.40R · -$2,646 | - | 0 |
| expectancy | 12 · 1.7/wk · 33% · +0.78R · +$2,464 · PF 3.4 · DD -558 | -0.24..+1.84 | 8-58% | 0.11 | 22 · 3.1/wk · 14% · -0.49R · -$2,676 | -0.57 (-1.03..-0.17) | 1 (0 trades) |
| t-stat | 19 · 2.7/wk · 42% · +0.74R · +$3,614 · PF 3.8 · DD -318 | +0.09..+1.46 | 26-63% | 0.03 | 35 · 5.0/wk · 17% · -0.45R · -$3,486 | +0.11 (-0.07..+0.41) | 0 |
| win-rate | 14 · 2.0/wk · 43% · +1.02R · +$3,514 · PF 4.4 · DD -318 | +0.18..+1.93 | 21-64% | 0.02 | 22 · 3.1/wk · 18% · -0.47R · -$2,216 | +0.14 (-0.31..+0.58) | 2 |
| worst-block | 20 · 2.9/wk · 45% · +0.69R · +$3,523 · PF 3.6 · DD -372 | +0.04..+1.38 | 25-65% | 0.03 | 37 · 5.3/wk · 14% · -0.48R · -$3,874 | +0.06 (-0.18..+0.35) | 0 |
| oracle (hindsight) | 18 · 2.6/wk · 56% · +1.18R · +$5,770 · PF 10.4 | +0.50..+1.92 | 39-72% | 0.00 | 26 · 3.7/wk · 15% · -0.39R | +1.14 (-0.03..+2.33) | 0 |

### Gap between training and test (average R per trade)

| rule | mean train avg R across folds | pooled test avg R |
|---|---|---|
| expectancy | +1.76 | +0.78 |
| t-stat | +1.43 | +0.74 |
| win-rate | +1.37 | +1.02 |
| worst-block | +1.23 | +0.69 |
| defaults (no selection) | +1.41 | +0.67 |

The defaults decay just as much (+1.41R in training, +0.67R in test) without any selection at all. That decay is
the market (August was the bot's best stretch), not overfitting. Selection adds nothing beyond it.

### What each rule picked, fold by fold

| fold | expectancy | t-stat | win-rate | worst-block |
|---|---|---|---|---|
| 1 | min_score 2, w_htf 0, AM+13:30-15:00, 1/day: **0 OOS trades** | defaults | w_vwap 1, skip D, AM+13:30-15:00, 1/day (1.0/wk) | min_score 0, w_htf 0 (-0.01R) |
| 2 | min_score 2, w_htf 0, w_vwap 1, AM+13:30-15:00 (+0.36R) | w_htf 0 (+0.60R vs defaults +0.74R) | w_htf 0 | w_htf 0 |
| 3 | min_score 2, w_vwap 1, AM+13:30-15:00 (+1.19R) | w_htf 0 (+1.60R vs defaults +1.07R) | w_htf 0, 1/day (1.7/wk) | w_htf 0 |

## Placebo and bootstrap (full sample, engine.robust.placebo, 300 random-entry runs)

Placebo trades enter at random bars in the same session windows with the same risk, target R, break-even and time
stop.

| config | sym | real avg R | placebo mean | placebo p95 | p-value | 90% CI real avg R | direction flipped |
|---|---|---|---|---|---|---|---|
| defaults | NQ | +1.07 | -0.07 | +0.33 | 0.000 | +0.41..+1.76 | -0.32 |
| defaults | ES | -0.37 | -0.05 | +0.20 | 0.99 | -0.55..-0.18 | +0.01 |
| w_htf 0 | NQ | +1.17 | -0.06 | +0.40 | 0.000 | +0.58..+1.79 | -0.43 |
| w_htf 0 | ES | -0.33 | -0.08 | +0.16 | 0.96 | -0.51..-0.16 | +0.10 |
| w_htf 0, stop_after_win off | NQ | +1.11 | -0.08 | +0.26 | 0.000 | +0.55..+1.70 | -0.41 |
| min_score 2, w_htf 0, stop_after_win off | NQ | +1.56 | -0.12 | +0.37 | 0.000 | +0.73..+2.44 | -0.53 |

On NQ the entry logic beats random entries clearly. Taking the opposite direction loses 0.3-0.5R a trade, so the
direction call carries the edge. On ES the logic does **worse than random** (p 0.93-0.99) for every config. The two
instruments disagree about the same strategy over the same 10 weeks, which is the strongest warning in this report.

## Win rate against expectancy (full sample, in-sample, descriptive)

| config | NQ trades/wk | NQ win rate | NQ avg R | NQ net | NQ DD | ES win rate / avg R |
|---|---|---|---|---|---|---|
| **defaults** | 2.8 | 45% | +1.07R | +$10,718 | -$372 | 19% / -0.37R |
| w_htf 0 (highest win rate at normal frequency) | 2.9 | 53% | +1.17R | +$11,187 | -$318 | 20% / -0.33R |
| w_htf 0, stop_after_win off | 3.3 | 50% | +1.11R | +$12,537 | -$318 | 19% / -0.32R |
| min_score 2, w_htf 0, stop_after_win off (highest avg R in band) | 2.0 (floor) | 52% | +1.56R | +$10,976 | -$528 | 18% / -0.35R |
| min_score 0 (most trades) | 3.2 | 42% | +0.91R | +$10,629 | -$437 | 19% / -0.35R |

There is no real trade-off to pick from. In this data, tighter gates raise win rate and expectancy together until
frequency drops through the 2/week floor. No config sits at "55% wins, +0.4R". The low-win-rate, high-R corner is
simply the defaults plus noise. The ES column is the honest picture of a market the bot does not suit: about 18%
wins whatever the gates.

Per-knob marginals (mean avg R over all in-band configs that use that value, NQ / ES) are flat for every knob except
`grade_skip: "D"` (+1.12 vs +0.94 on NQ, -0.32 vs -0.36 on ES), and that pushes the default config down to
1.8 trades/week. `min_score 2` is +1.15 vs +1.03 on NQ but worse on ES (-0.38).

## Neighbourhood check

**Defaults:** every one-step move stays profitable on NQ (+0.91 to +1.43R full sample, +0.58 to +1.18R on the OOS
weeks), with no cliff. The moves that raise R (min_score 2, skip D, AM only) all drop below 2 trades/week. The flat
neighbourhood is a sign the defaults are robust.

**w_htf 0:** neighbours range from +0.83R (min_score 0) to +1.62R (min_score 2, 1.7/wk). Also flat. Its edge over
the defaults is one swapped runner (`study_combo_night_diff.py`):

| | trades only in defaults | trades only with w_htf 0 |
|---|---|---|
| NQ | 6 trades, +2.31R in total: the 28 Aug +5.01R target and five trades worth -2.70R | 7 trades, +6.49R in total, of which +4.88R is the 17 Aug target |
| ES | 13 trades, -5.04R | 17 trades; the net change for ES is only +0.55R (-17.45R to -16.90R) |

Per week (NQ sum R, defaults vs w_htf 0): it is better in 5 weeks (one of them by only +0.02R), worse in 2
(24 Aug -6.0R, 21 Sep -0.25R) and equal in 4.

## MFFU Builder 50K (live risk: grade sizing, $350, dd_aware, $600 daily stop; NQ)

| config | net | worst day | worst intraday | eval from day 1 | rolling evals pass / fail / open (avg days) | rolling, OOS days only | Monte Carlo 60 days: pass / fail / median days |
|---|---|---|---|---|---|---|---|
| **defaults** | +$10,718 | -$285 | -$676 | PASS day 2 | 31 / 0 / 21 (14.0) | 14 / 0 / 21 (19.9) | 99.2% / 0.1% / 16 |
| w_htf 0 | +$11,187 | -$285 | -$676 | PASS day 2 | 36 / 0 / 16 (17.2) | 19 / 0 / 16 (20.3) | 99.7% / 0.0% / 15 |
| w_htf 0, stop_after_win off | +$12,537 | -$285 | -$676 | PASS day 8 | 44 / 0 / 8 (15.1) | 27 / 0 / 8 (15.6) | 100% / 0.0% / 14 |
| min_score 2, w_htf 0, stop_after_win off | +$10,976 | -$285 | -$676 | PASS day 2 | 44 / 0 / 8 (13.5) | 27 / 0 / 8 (16.0) | 98.9% / 0.0% / 15 |

"Open" means the evaluation had not finished when the data ended. Configs that finish more evals within the window
look faster, but the median days to pass are 14-16 for all four, a difference of about 1-2 days. That is well inside
the noise of 52 sessions. On NQ none is meaningfully faster or safer. Given the ES result, the safety lever for the
eval is the pre-committed kill rule ($300 for the first 10 trades; stop if down $1,000 from peak or win rate under
25% over 15 trades), not a gate combination.

## Recommendation

**Keep the defaults. Exact param dict to change in `DEFAULTS`: `{}`.**

Reasons:
* Out of sample, no selection rule beats the defaults with a confidence interval that excludes zero. The rules that
  look best either fall below the 2-trades/week floor (win-rate, expectancy) or gain about 0.1R a week (t-stat,
  worst-block).
* The defaults sit in a flat, all-profitable neighbourhood on NQ, so they are not a fragile peak.
* The one recurring candidate, `w_htf: 0`, gains through a single swapped 5R runner and has a flat marginal across
  the grid. Adopting it would be fitting to one trade.
* ES loses money under every one of the 864 combinations. The thing to watch is the regime (does live NQ keep
  behaving like Aug-Oct 2026?), not the gate settings.

Optional, for shadow logging only (no change to live trading): run `{"w_htf": 0}` as a paper shadow next to the live
bot. Re-run `study_combo_night.py` once 8 or more new weeks of CME history exist. Adopt it only if the t-stat or
worst-block rule still picks it and the out-of-sample weekly R difference over the defaults has a 90% CI above zero.
