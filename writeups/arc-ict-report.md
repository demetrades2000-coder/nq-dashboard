# ICT / SMC concepts as confluence, sizing and entry gate (16 Oct 2026)

Inducement, PO3/AMD, NQ-ES SMT and smart-money traps, tested on real CME futures only. No CFD data was read.

## Plain-English summary

**None of the four concepts passes the adoption rule. Recommended engine change: none.** Nothing improved
out-of-sample results while keeping 2-4.5 trades a week. Most of the ICT versions that are supposed to help come out
flat or slightly negative.

| concept | as a confluence (does it mark better trades?) | as a sizing weight | as an entry gate | verdict |
|---|---|---|---|---|
| **1. Inducement (IDM)** | Classic IDM (a minor internal low just above the pool, taken on the way in): **noise** (+0.04R, CI -0.11..+0.19). A leg with *any* internal swing low ("staircase" leg) is slightly **worse** (-0.09R). The sign flips by year: + in 2022-23, - in 2024-26. | Grade-points walk-forward: +$616 to +$760 over 5 years, CI includes 0 | Requiring IDM: 1.2 trades/wk, -$7,988. Vetoing staircase legs: 2.6/wk, frequency out of band in 18 of 62 blocks | **Noise** |
| 1b. "Second sweep only" (first sweep fails, take the second) | +0.03R (engine-log version) / -0.01R (bar version): **noise** | nothing | As an entry rule: **1.3 trades/wk** (53 of 62 blocks below 2/wk), $+2,924 vs $+7,303 baseline. The bar version gives 2.9/wk and -$1,082 | **Rejected** (kills frequency, no edge) |
| **2. PO3 / AMD** | Raid beyond the 18:00 or midnight open: **noise to slightly negative**. Full PO3 sequence: -0.12R, fires 0.7/wk. Raid **against** the prior-day bias: **-0.14R in both samples, CI excludes 0** (the only consistent negative: every year 2024-26) | ±50% sizing walk-forward +$9.6k, but that is a rounding artefact (335 trades drop to 0 micros). The clean grade-points version is +$632, CI -1,343..+2,452 | All gates lose walk-forward (-$4,480), and most break the frequency band | **Hurts slightly / noise. Do not add** |
| **3. SMT NQ vs ES** | 18 months of aligned NQ+ES (Apr 2025 - Oct 2026). Swing-anchored SMT (mine): **-0.12R** taken, -0.14R shadows. The engine's existing `smt`: +0.24R taken (CI -0.08..+0.58), +0.02R shadows. **Noise** | Grade walk-forward: -$107 (mine), -$14 (engine `smt`) | Every SMT gate loses: walk-forward -$1,596; "require SMT" gives 0.8-1.1 trades/wk | **Noise. Keep `w_smt: 0`** |
| **4. Smart-money traps** | Pure wick raid (no 5m close beyond the pool): **worse** (-0.21R shadows, CI excludes 0; -0.08R taken). Failed break back inside within 3 bars: -0.11R. Turtle soup: -0.17R shadows. Trap CHoCH: noise (+0.07R) | Penalising pure wick raids (-2 grade points): +$896 OOS, CI -169..+1,923, + in 4 of 5 years. **Inside the noise** | Walk-forward -$764. The best fixed variant (trap-CHoCH -1 score) +$5,248 in-sample, CI includes 0 | **Noise. The ICT "trap" story is not supported** |

What this means:

* ICT's claim that inducement, PO3 and traps *raise* the quality of a sweep reversal is not supported by 1,038
  taken trades and 1,991 candidates over five years of NQ. Where there is any signal, it points the **other way**.
  Raids that only wick the pool, raids against the prior day's bias, and legs that staircase into the pool are a
  little worse. Each of these effects is about 0.1-0.2R. After testing 18 features three ways, effects that small
  are what chance produces.
* The walk-forward selection that would actually be used ("pick the best ICT item on past weeks") made money in
  2022-23 and lost it in 2024-26. Over five years the pooled out-of-sample lift is +$1,364 (CI -2,083..+4,954).
  On the 18-month NQ+ES window it is -$784.
* **Context the lead needs. Flat sizing, all candidates, five years:** the baseline itself is
  1,038 trades, 4.1/wk, **+0.03R, PF 1.09**, max DD -$8,850. Its frequency is outside 2.0-4.5/wk in **27 of 62**
  four-week blocks: 5-6.8/wk through 2022-2024, 1.5-1.8/wk in parts of 2025-26. The Aug-Oct 2026 window
  (31 trades, +1.20R, PF 6.8 on the clean data) is the exception, not the rule. No ICT filter fixes that.

## Data and validation

* **NQ**: `data/NQ_5m.csv` = the clean five-year CME set (TradingView NQ1!/MNQ1!, back-adjusted; see
  `research/DATA_AUDIT.md`), 2021-10-17 to 2026-10-16. Results start on 2021-11-08, after warm-up.
  `data/_cfd_archive` was never read.
* **ES** (SMT partner). At the start of this study ES 5m covered only 2026-08-06 onward. On the coordinator's
  instruction I built an 18-month ES set from the ten TradingView ES1! chunks, using a new tool,
  `tools/stitch_es_chunks.py`, which reuses the roll logic of `tools/stitch_tv_chunks.py`:
  * the chunks are unadjusted front-month data, like the NQ chunks;
  * 5 rolls were found (ESM25->ESU25 ... ESM26->ESU26); a weekday switch uses the session-open jump, a weekend switch
    uses the raw Yahoo ES=F 1h quotes at hours where the two sources sat on different contracts; the two methods
    agree within 1.25-2 pts on every roll where both exist (+53.00, +56.50, +58.50, +52.50, +63.75);
  * the series is then shifted into ESZ26 space with the existing Sep-2026 gap (+66.25).
  * **Price-space check:** on 3,295 shared Aug-2026 bars, adjusted TradingView minus clean Yahoo has median 0.00 and
    p90 0.00. The raw sources also match tick for tick.
  * Output: `data/clean/ES_{5m,15m,1h}.csv` and `ES_rolls.json` (the 15m and 1h are resampled from the 5m), plus
    `raw/ES_5m_unadjusted_tv.csv`. These were copied to `data/ES_*.csv`. The previous `data/ES_*` files were backed
    up to `data/_pre_clean_backup/*.pre_tv.*`, and the original raw Yahoo files there were left untouched.
    `ES_1m.csv` was not touched.
  * Coverage: 391 sessions (352 TradingView, 39 Yahoo), 2025-04-13 to 2026-10-15.
  * Side effect: `data/ES_1h.csv` now starts in 2025-04 instead of 2024-05. The old Yahoo 1h history was in a
    different, unadjusted price space.
* **Engine runs**: the real `Engine`, unchanged, through a subclass (`study_ict_common.ICTEngine`). The subclass
  (a) stores each candidate's sweep geometry (sweep bar, extreme bar, pool price), (b) computes the ICT features at
  plan time from closed bars only, and (c) for gates, changes `order["score"]` exactly as an engine weight would. A
  failed gate means "pass, shadow still logged, setup not consumed". Sizing is the research standard: grade x $350,
  `dd_aware` off, no daily stop.
* **Windowed runs (coordinator's request):** every five-year result was computed both ways, as one continuous run and
  as independent 10-week windows with 21 days of warm-up each. They agree: baseline 1,037 trades / $7,285 continuous
  against 1,038 / $7,303 windowed, and every feature row matches to within a few dollars. So, at flat sizing, no
  engine state carries over and distorts a long run.
  * On the "130 trades" report: with today's files a default `backtest.run` over five years gives **820 trades**, and
    the engine logs **377 "risk too small"** skips. With `dd_aware` off it gives 1,054 trades.
  * My reading: the low count comes from the drawdown-aware sizing (risk capped at 25% of the cushion above the
    trailing MLL, times the grade and regime halving). It is not signal generation.
* **Samples:** A = taken trades of the default config. C = shadow candidates of the wide run (`max_trades_day 9`,
  `stop_after_win off`), resolved at stop, target or flat, in R.
* **Validation:**
  * Week-block bootstrap (2,000 draws) for every CI; p+ = P(lift > 0).
  * Expanding-window walk-forward: 13 training weeks, then 4-week test blocks (62 folds over five years, 16 on the
    18-month SMT window).
  * Gate selection requires 2.0-4.5 trades/wk in training, and every test block's frequency is reported.
  * Year-by-year stability tables.
  * Raw output:
    * `study_ict_results_5y_windowed.txt` (main)
    * `study_ict_results_5y_continuous.txt`
    * `study_ict_results_smt_18mo.txt`
    * `study_ict_results_11wk.txt` (Aug 6 - Oct 16 2026, for comparison with the earlier reports)
* **No lookahead:** `python study_ict_lookahead.py` recomputes every candidate's features on NQ and ES bars truncated
  at the signal bar. It found 0 mismatches in 2 windows and 115 candidates.

## Exact definitions (engine/ict_features.py, parameters in `P`)

All rules are written for a long. Shorts use the mirrored price series, like `engine/model.py`. A candidate is
defined by its signal bar `i`, its sweep bar `arm_i` (first bar through the pool), the sweep extreme `ext_i` and the
first pool's price.

| feature | definition |
|---|---|
| `ict_idm` | Inducement. A 5m fractal swing low (lower than the 2 bars on each side, and confirmed by the sweep bar) formed inside the manipulation leg (leg start = highest high of the 24 bars up to `ext_i`). It sits above the pool by at most **1.0 ATR(14)** and formed at most **12 bars (1 h)** before the sweep. |
| `ict_idm_any` | Any such internal swing low in the leg above the pool, with no distance or age limit. This is a "staircase" leg, as opposed to one straight drop. |
| `ict_ss_bar` | Second sweep, from bars only. Since 00:00 ET, some bar `k` undercut the prior 24 bars (the first raid); it was followed by a close at least **1 ATR** above `L[k]` (the trap) with no lower low in between; and the current sweep extreme is below `L[k]`. `k` is at least 3 bars before the sweep. |
| `ict_ss_eng` | Second sweep, from the engine's own log. An earlier setup in the same direction was armed today, and the current extreme is below that setup's extreme. |
| `ict_manip18` / `ict_manip00` | Manipulation: the sweep extreme is beyond the 18:00 ET daily open / the 00:00 ET midnight open. |
| `ict_reclaim18` / `ict_reclaim00` | Manipulation, and the signal bar closes back on the distribution side of that open. |
| `ict_asia_accum` | Accumulation: the Asia range (20:00-24:00 ET, finished) is at most **40%** of the 20-day average daily range. |
| `ict_asia_raid` | The sweep extreme took out the Asia low. |
| `ict_po3` | Full A-M-D: `ict_asia_accum`, and `ict_reclaim00`. |
| `ict_po3_bias` | Manipulation below the midnight open **against the daily bias**: the prior trading day closed in its upper half (lower half for shorts). |
| `ict_smt` | SMT on ES 5m. Reference swing = lowest NQ low in [`ext_i`-48, `ext_i`-3] (4 h). NQ's extreme must undercut it. ES's low over bars `ext_i`-1..min(`ext_i`+1, `i`) must stay **above** ES's low over the reference bar ±1. **None (undefined)** when ES has no bars there. |
| `ict_smt1h` | The same test on ES 1h bars. Defined only when the extreme's hour has closed by the signal and no ES hour in the window gaps more than 0.6% (roll guard). It is rarely defined (9 candidates in 18 months), so ignore it. |
| `ict_wick_only` | No 5m close beyond the pool between the sweep and the signal: a pure wick liquidity grab. |
| `ict_trap_fail` | Failed break. At least one 5m close beyond the pool (breakout traders committed), then a close back inside within **3 bars**. |
| `ict_turtle` | Turtle soup. The first close back inside the pool comes within **2 bars** of the sweep bar. |
| `ict_choch_trap` | Trap CHoCH. A close below the last confirmed 5m swing low (before the leg, or inside it before the extreme), reversed by a close back above that level within **6 bars**, by the signal. |
| engine `smt` | `Engine._smt`. ES did not breach its own low of the 36 bars before the sweep while NQ swept. It returns False when partner bars are missing. |

Parameters were fixed before any result was seen and were not tuned. The definitions are lenient (several fire on
more than 50% of candidates), so "noise" here does not mean "too rare to test".

## Results (five years, windowed runs; full tables in the raw files)

### (a) Confluence: mean R with minus without (90% week-block CI)

| feature | C shadows: n with, diff | A taken: n with, diff | sign by year, A (2022 / 23 / 24 / 25 / 26) |
|---|---|---|---|
| ict_idm | 554, +0.04 (-0.10..+0.17) | 283, +0.04 (-0.11..+0.19) | + + - - - |
| ict_idm_any | 871, -0.09 (-0.20..+0.03) | 439, -0.09 (-0.23..+0.04) | - + - - - |
| ict_ss_bar | 1361, -0.06 (-0.20..+0.07) | 693, -0.01 (-0.15..+0.12) | - + + + - |
| ict_ss_eng | 641, +0.01 (-0.11..+0.13) | 325, +0.03 (-0.11..+0.18) | - + + - + |
| ict_manip18 | 1572, -0.11 (-0.27..+0.05) | 762, -0.01 (-0.15..+0.12) | - + - + + |
| ict_manip00 | 1611, -0.07 (-0.23..+0.08) | 781, -0.07 (-0.21..+0.07) | - + - - + |
| ict_reclaim18 | 290, -0.10 (-0.25..+0.05) | 164, -0.04 (-0.20..+0.13) | - + - - - |
| ict_po3 | 303, -0.01 (-0.15..+0.14) | 166, -0.12 (-0.27..+0.02) | - - + - - |
| **ict_po3_bias** | 813, **-0.14 (-0.26..-0.02)** | 410, **-0.14 (-0.27..-0.01)** | - - - - - |
| ict_asia_accum | 1866, +0.06 (-0.22..+0.33) | 978, -0.08 (-0.42..+0.23) | - - + + + |
| ict_asia_raid | 1445, -0.04 (-0.18..+0.10) | 670, -0.03 (-0.16..+0.09) | - - - + + |
| ict_trap_fail | 807, -0.11 (-0.23..+0.01) | 421, -0.09 (-0.23..+0.04) | - - - + - |
| **ict_wick_only** | 408, **-0.21 (-0.34..-0.08)** | 175, -0.08 (-0.21..+0.06) | + - - - - |
| ict_turtle | 1471, **-0.17 (-0.30..-0.03)** | 748, -0.10 (-0.26..+0.06) | - - - + + |
| ict_choch_trap | 1225, -0.05 (-0.18..+0.08) | 608, +0.07 (-0.06..+0.20) | + + - + - |

### (b) Sizing

There were two versions:

* **±50% risk** (x1.5 with the feature, x0.5 without, or the reverse; w picked walk-forward). This is confounded:
  335 trades round to 0 micros at x0.5, so it partly acts as a gate. Its "best" result, cutting raids against the
  bias (`po3_bias`), shows +$9,648 OOS, but that comes from dropped trades.
* **Grade points** (the engine's own lever). Add g ∈ {-2..+2} grade points when the feature is present, map the grade
  to A+..D size, and pick g walk-forward on the training weeks. These are the honest numbers:

| feature | walk-forward picks | OOS $ lift over ~4.75 years (CI) | by year |
|---|---|---|---|
| ict_wick_only | -2 (52 of 62 folds) | **+$896 (-169..+1,923, p+ 0.92)** | +251 / -10 / +288 / +399 / -30 |
| ict_idm_any | -2 (49 of 62) | +$760 (-1,296..+2,855) | +708 / -580 / -472 / +602 / +501 |
| ict_po3_bias | -1 (45 of 62) | +$632 (-1,343..+2,452) | +210 / +484 / -336 / +22 / +252 |
| ict_reclaim18 | -2 (41 of 62) | +$480 (-86..+1,029, p+ 0.92) | -222 / +90 / +158 / +313 / +142 |
| ict_ss_eng / ict_ss_bar | mixed | -$1,240 / -$1,542 | |
| **pick any item on past weeks (b3)** | mostly `asia_accum -2` | **+$1,364 (-2,083..+4,954)**; 18-month NQ+ES window **-$784** | +1,599 / +1,038 / -732 / -264 / -276 |

No CI excludes zero, and the realistic pooled selection is positive only in 2022-23. Even the "best" item is worth
under $200 a year. That is too small to matter and inside the noise.

### (c) Entry gates (real engine re-runs; baseline 1,038 trades, 4.1/wk, $+7,303, 27 of 62 blocks out of band)

| variant | trades/wk | net $ | blocks outside 2-4.5 | lift (CI) |
|---|---|---|---|---|
| require classic IDM | 1.2 | -684 | 55/62 | -7,988 (-23,196..+6,596) |
| veto staircase leg (`idm_any`) | 2.6 | +10,610 | 18/62 | +3,306 (-6,464..+12,935) |
| **second sweep only** (`ss_eng` required) | **1.3** | +2,924 | **53/62** | -4,378 |
| second sweep only, bar version | 2.9 | +6,222 | 15/62 | -1,082 |
| require full PO3 | 0.8 | +707 | 60/62 | -6,596 |
| veto raid-against-bias (`po3_bias`) | 2.7 | +10,938 | 13/62 | +3,634 (-5,237..+12,211) |
| require midnight-open manipulation | 3.2 | +5,136 | 17/62 | -2,167 |
| veto pure wick raid | 3.6 | +9,892 | 20/62 | +2,590 (-3,731..+8,769) |
| require turtle soup | 3.0 | +5,362 | 17/62 | -1,941 |
| require failed break | 1.8 | +4,368 | 36/62 | -2,935 |
| trap CHoCH -1 score if absent | 3.2 | +12,551 | 14/62 | +5,248 (-1,940..+12,565) |

Walk-forward selection per concept (choose on training weeks, score the next 4 weeks):

| concept | OOS lift |
|---|---|
| inducement | -$4,996 |
| PO3 | -$4,480 |
| SMT | -$4,860 |
| trap | -$764 |
| all | -$4,064 |

None is positive, and each one has test blocks below 2 trades/wk. The fixed variants with positive full-sample
lifts are in-sample picks with CIs spanning zero. Walk-forward does not recover them.

### SMT on the aligned NQ+ES window (2025-04-28 to 2026-10-16, windowed runs, 250 taken / 476 candidates)

Baseline: 3.3/wk, +0.08R, $+7,656, PF 1.41.

| | C shadows: n with, diff R | A taken: n with, diff R | grade walk-forward OOS | best gate |
|---|---|---|---|---|
| `ict_smt` (swing-anchored, ES 5m) | 95, -0.14 (-0.45..+0.17) | 48, -0.12 (-0.47..+0.22) | -$107 | veto: 2.7/wk, -$2,290 |
| engine `smt` | 141, +0.02 (-0.20..+0.24) | 74, +0.24 (-0.08..+0.58) | -$14 | `w_smt` +1 ("plus"): 3.5/wk, **-$1,631 (CI -2,960..-480)** |
| require either | | | | 0.8 / 1.1 trades/wk |

In 2025 mine was +0.07R and in 2026 it was -0.38R. The two definitions agree on only 45 candidates. Where both fire
the result is -0.20R; where the engine's fires alone it is +0.10R. The engine's version looks a little better on
taken trades, but its shadow-sample lift is +0.02R, so the taken-trade number is selection noise. **Keep `w_smt: 0`.**

**Missing partner bars.** `ict_smt` returns `None` (undefined) when ES has no bar at the reference or the extreme. The
studies then drop that candidate from the SMT statistics. The engine's `_smt` returns `False` in that case, which
silently means "no divergence". With `w_smt: 0` that is harmless. If SMT is ever weighted, it must be neutral (0)
when partner bars are missing, not negative: on pre-2025 NQ a penalty-style weight would mark every trade as "no
SMT". The code works unchanged when more ES history lands (`study_ict_run.py --from <date>`).

## Recommendation for the lead

**Engine change: none.** No weight, gate or grade item from these four concepts goes into `_plan` or `_grade`. The
param dict to change in `DEFAULTS` is `{}`. `w_smt` stays 0.

Optional, for logging only (no effect on trading):
* add the three "most consistent negatives" to the feature dict, so live and paper trades accumulate evidence:
  `ict_wick_only`, `ict_po3_bias` and `ict_idm_any`;
* re-test them once at least 6 months of live / paper data exists.

To add them, put this at the end of `Engine._plan`, after `features = {...}` and before `_grade`. It does not change
the score or the grade:

> _Code omitted on the public site._

If the owner insists on one ICT item, the least-bad candidate is a **-2 grade-point item "pure wick raid (no 5m close
beyond the pool)"** in `_grade`: `("Raid closed beyond the pool (not a pure wick)", -1 if f.get("ict_wick_only")
else 0, 2, "discovered")`. It is worth about +$190/yr out of sample, with a CI that includes zero, and it does not
change frequency (1 trade in 5 years rounds to 0 micros). I do not recommend it: it fails the "improves OOS" rule on
the strict reading.

## Files

* `engine/ict_features.py`: the pure feature functions (`Context`, `features`, `annotate`, `BINARY`, `P`).
* `study_ict_common.py`: data sources, `ICTEngine` subclass, windowed runner, bootstrap and fold helpers.
* `study_ict_run.py`: the whole study (confluence, sizing, grade, gates, walk-forward, SMT comparison).
* `study_ict_lookahead.py`: no-lookahead check.
* `tools/stitch_es_chunks.py`: ES TradingView stitch, roll adjustment, price-space check and `--swap` to `data/`.
* Raw output: `study_ict_results_{5y_windowed,5y_continuous,smt_18mo,11wk}.txt`.
