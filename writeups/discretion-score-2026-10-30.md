## Money first

**No change for either bot. A "discretion score" that judges each trade before entry does not make money it can keep.**

- **What was tested.** The owner asked for "good discretion like a skilled human trader": before each trade, judge its
  quality from what is known at entry, then trade the good ones bigger and the bad ones smaller or not at all.
  - One score per bot, built from 6 facts a trader would look at.
  - Fit on 2026 H1 trades only, then frozen.
  - Used as a size rule on 2026 H2 and 2021-25, which the fit never saw.
  - Two size rules: the worst third of scores x0.5, the middle x1, the best third x1.5 ("thirds"); or skip the worst third.
- **BLITZ: at chance.** The score looks a little better in 2026 H2, but random scores (fit on shuffled results) do as well
  14-41% of the time. In 2021-25 it is worse than today in every form.
- **ATLAS: at chance.** Every form passes fewer evals in 2 weeks in both 2026 halves.
  - In H2 the ridge score makes less per unit of risk than today (+0.603 vs +0.620).
  - The checklist makes more in H2 (+0.698), but random scores do as well 33% of the time, and in 2025 its eval paths lose
    more (-$276 vs -$148 a month).
- **Why.** The facts that look good in one period look bad in another. BLITZ's 5-year history likes the opposite sign on 5
  of the 6 facts, compared with 2026 H1. A score built from them is noise with a story.
- **Two thin leads for paper only, not switches:**
  - A BLITZ trader's checklist (no fitting at all) is a little better per unit of risk in every span. But random sizes
    reach it 10-12% of the time, it passes fewer 2-week evals in H2, and it was written after the fact table was seen.
  - An ATLAS score fit on 2021-24 (875 trades) is better per unit of risk in 2026 H1, H2 and 2025. But 100 shuffled fits
    reach it 6% / 19% / 43% of the time, and it fails the 2-week eval test: dead evals in H1 rise from 0.8% to 4.2%, and
    the H2 pass rate drops from 43.5% to 39.1%.

**BLITZ** (account C on its own 25K, today's rule; costs in, $1.90 a micro + 1 tick; "$500 view" = each trade risks $500 x
its size; 25K eval = 40% of the room, the full room from session 5, <= $600, x the size; slot = the whole 25K account over 6
months net of every $63 eval, 300 simulated lives; p = share of 200 shuffled-outcome fits that do at least as well per unit of
risk):

| BLITZ | trades / wk | 2+ a week | PF | net | $ / month | max DD | R per $ risked | 25K 2-week pass / fail | 25K slot $ / month | shuffled p |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **2026 H1, today** | 8.5 | 89% | 1.61 | +$17,849 | $2,928 | -$3,968 | +0.165 | 36.1 / 37.8 | $277 | |
| H1, score thirds (ridge) | 8.5 | 89% | 1.69 | +$19,601 | $3,216 | -$2,898 | +0.180 | 37.0 / 26.1 | $273 | 0.21 (in-sample) |
| H1, score thirds (checklist) | 8.5 | 89% | 1.68 | +$22,820 | $3,744 | -$3,860 | +0.178 | 32.8 / 36.1 | $261 | 0.40 (in-sample) |
| H1, skip worst third (ridge) | 5.7 | 85% | 1.80 | +$14,596 | $2,395 | -$2,228 | +0.201 | 31.9 / 23.5 | $241 | 0.16 (in-sample) |
| **2026 H2, today** | 6.8 | 75% | 1.82 | +$10,589 | $2,851 | -$2,968 | +0.200 | 36.2 / 34.8 | $30 | |
| H2, score thirds (ridge) | 6.8 | 75% | 2.09 | +$12,934 | $3,482 | -$2,196 | +0.246 | 30.4 / 27.5 | $52 | 0.14 |
| H2, score thirds (checklist) | 6.8 | 75% | 2.03 | +$15,670 | $4,219 | -$4,076 | +0.234 | 33.3 / 29.0 | $73 | 0.20 |
| H2, skip worst third (ridge) | 4.4 | 50% | 1.98 | +$7,724 | $2,080 | -$1,846 | +0.224 | 24.6 / 21.7 | $7 | 0.41 |
| **2021-25, today** | 8.6 | 80% | 1.04 | +$11,919 | $232 | -$21,923 | +0.013 | 20.4 / 50.2 | -$41 | |
| 2021-25, score thirds (ridge) | 8.6 | 80% | 1.03 | +$9,012 | $176 | -$24,381 | +0.009 | 23.8 / 47.4 | -$37 | 0.79 |
| 2021-25, score thirds (checklist) | 8.6 | 80% | 1.01 | +$3,945 | $77 | -$31,008 | +0.004 | 23.8 / 52.6 | -$40 | 1.00 |
| 2021-25, skip worst third (ridge) | 6.2 | 78% | 1.01 | +$1,533 | $30 | -$24,105 | +0.002 | 18.2 / 39.4 | -$46 | 0.87 |

The checklist's own skip rule is no better: R per $ risked +0.180 / +0.245 / +0.006, shuffled p 0.40 / 0.20 / 0.84 (run
`dsx_blitz_check_skip`). The 25K slot $ also sits inside its shuffled controls: ridge thirds p 0.22 / 0.29 / 0.31.

**ATLAS** (account B on its Builder 25K, the account-B need size x the score's size; eval paths = back-to-back 25K evals started
every 5th session, $ less the $63 fees, a month; "dead" = failed or stuck; p = share of 40 shuffled-outcome fits that do at
least as well per unit of risk):

| ATLAS | trades / wk (eval path) | PF ($500) | net ($500) | $ / month ($500) | max DD ($500) | R per $ risked | 25K 2-week pass / dead | eval paths $ / month | shuffled p |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **2026 H1, today** | 2.1 | 3.01 | +$49,481 | $8,112 | -$3,000 | +0.884 | 65.5 / 0.8 | $1,394 | |
| H1, score thirds (ridge) | 2.0 | 3.57 | +$61,281 | $10,046 | -$2,500 | +1.089 | 62.2 / 0.0 | $1,747 | 0.05 (in-sample) |
| H1, score thirds (checklist) | 3.4 | 3.46 | +$58,624 | $9,611 | -$2,500 | +1.020 | 63.0 / 0.8 | $1,652 | 0.05 (in-sample) |
| H1, skip worst third (ridge) | 2.4 | 3.72 | +$42,426 | $6,955 | -$2,549 | +1.131 | 55.5 / 0.0 | $1,612 | 0.15 (in-sample) |
| **2026 H2, today** | 1.6 | 2.73 | +$15,803 | $4,260 | -$2,347 | +0.620 | 43.5 / 0.0 | $547 | |
| H2, score thirds (ridge) | 1.8 | 2.57 | +$14,611 | $3,938 | -$2,296 | +0.603 | 39.1 / 0.0 | $455 | 0.55 |
| H2, score thirds (checklist) | 1.5 | 2.86 | +$16,219 | $4,372 | -$1,963 | +0.698 | 39.1 / 0.0 | $760 | 0.33 |
| H2, skip worst third (ridge) | 1.9 | 2.07 | +$7,432 | $2,003 | -$1,954 | +0.450 | 27.5 / 0.0 | $130 | 0.78 |
| **2025, today** | 2.6 | 1.15 | +$10,533 | $857 | -$9,942 | +0.084 | 30.1 / 23.3 | -$148 | |
| 2025, score thirds (ridge) | 3.0 | 1.22 | +$14,075 | $1,145 | -$9,956 | +0.127 | 19.3 / 24.5 | $38 | 0.35 |
| 2025, score thirds (checklist) | 2.3 | 1.18 | +$12,412 | $1,010 | -$10,522 | +0.105 | 20.5 / 21.7 | -$276 | 0.58 |
| **2021-24, today** | 3.1 | 1.08 | +$19,753 | $510 | -$23,036 | +0.045 | 22.9 / 27.1 | -$36 | |
| 2021-24, score thirds (ridge) | 3.4 | 1.05 | +$10,485 | $271 | -$23,826 | +0.028 | 13.8 / 21.5 | -$54 | 0.80 |
| 2021-24, score thirds (checklist) | 3.4 | 1.06 | +$12,734 | $329 | -$21,379 | +0.035 | 15.7 / 23.4 | -$6 | 0.53 |

The ATLAS candidates a week stay 4.4 / 3.3 / 4.8 / 5.4 (2+ a week in 94-99% of weeks) with the thirds rules; the skip rules
take about 2/3 of them in 2026 (2.9 / 2.1 a week) and half in 2021-25 (2.5-2.6 a week). None of the 4 ATLAS rules passes
the v2 test (2-week pass up, dead not up, eval-path $ up in both 2026 halves, 2021-25 not worse). Of the 160 shuffled fits,
1 passes it.

## What the score looks at (plain language)

Each bot gets 6 facts, all known when the signal bar closes. Nothing about the trade's own result is used (no MFE, MAE or exit).

**BLITZ** (the 1m band-break scalp, checks at 11:00 ... 15:30):

| Fact | What it means |
|---|---|
| break strength (`exc`) | how far the close is beyond the 09:30 open, in noise-band sigmas: a strong break or a drift over the band |
| range so far (`rng_sofar`) | the day's range from 09:30 to the signal vs its 14-day average: is it a trend day already |
| VIX (`vix`) | the prior close, from CBOE's own file |
| signal count (`nth`) | how many band signals the day has had so far (capped at 4): the "later break" idea |
| room to liquidity (`liq_room`) | distance to the nearest untaken pool ahead (the session's high / low so far incl. the evening, the prior day's RTH high / low, the prior week's high / low), in 5m ATR, capped at 6 |
| 15m structure (`st15_with`) | engine/structure.py on closed 15m bars built from the CME 5m bars: the last break of structure was with the trade (+1), against (-1), none yet (0) |

**ATLAS** (account B: EMA London pullback, MACD sweep, S/R New York reclaim):

| Fact | What it means |
|---|---|
| stop size (`stop_atr`) | the stop distance / the 5m ATR at the last closed 5m bar before the entry |
| VIX (`vix`) | the prior close |
| daily ATR percentile (`atrp`) | where the prior day's ATR(14) sits in its last year (tools/atlas_v2.atr_pct) |
| room to liquidity (`liq_room`) | as BLITZ, from the last closed price before the entry |
| 15m structure (`st15_with`) | as BLITZ, at the entry time |
| the day so far (`day_prev`) | the day's earlier ATLAS trade that had already closed: won (+1), lost (-1), none (0) |

**Two ways to combine them (both fit on 2026 H1 only):**

- **Ridge score.** A heavily shrunk linear regression of each trade's R on the 6 facts. R is clipped to -1.5..+3, so
  one big winner cannot decide it. Each fact is standardised on H1.
- **Checklist.** One point per fact on its "good side" of the H1 median. The good side is the side that did better in H1.
  The score runs 0-6.

The frozen BLITZ ridge weights, per standard deviation of each fact, in R:

| Fact | Weight |
|---|---:|
| break strength | +0.031 |
| signal count | +0.012 |
| range so far | -0.012 |
| room to liquidity | -0.018 |
| 15m structure | -0.005 |
| VIX | -0.002 |

So a harder, later break scores up. A day already wide, more room to the next pool, and the 15m structure with the trade
score slightly down. The weights are tiny. Even in H1, where the score was fit, the thirds' average R is not in order:
+0.090 / +0.218 / +0.185. In H2 it is +0.155 / +0.010 / +0.432; in 2021-25 +0.041 / -0.009 / +0.014.

The frozen ATLAS ridge weights:

| Fact | Weight |
|---|---:|
| stop size | -0.114 |
| the day so far | -0.077 |
| daily ATR percentile | +0.075 |
| 15m structure | -0.067 |
| room to liquidity | +0.049 |
| VIX | -0.004 |

So a tight stop, a moving market and more room score up. A trade after a loss today, or against the 15m structure, scores
up too, which fits a reversal system. In H1 the thirds are in order (+0.38 / +0.64 / +1.61 R). That does not hold
afterwards: H2 +0.93 / +0.14 / +0.92, 2025 +0.04 / -0.03 / +0.28, 2021-24 +0.04 / +0.16 / -0.12.

## How it was tested (the strict method)

1. **Pre-registered before any fit**, in the docstring of `tools/dsx_discretion.py`: the 6 facts per bot, the two models,
   the two size rules and the controls.
2. **Fit on 2026 H1 only:** 217 BLITZ trades and 112 ATLAS candidates. The score cut-offs (thirds) are also set on H1.
3. **Frozen, then applied** to 2026 H2 (106 / 51 trades) and 2021-25 (1,841 / 1,125), which the fit never saw. BLITZ
   2021-25 runs on 5m bars (the same rule), 2026 on 1m.
4. **Shuffled controls.** The same fit on H1 with the trades' results shuffled (200 seeds BLITZ, 40 ATLAS), applied the same
   way. "p" is the share of shuffled fits that do at least as well. The real score has to beat almost all of them out of
   sample.
5. **Judged in money with costs in:** $500 a trade x the size, and the 25K eval path (BLITZ: `tools/blitz25k_size`
   eval + slot; ATLAS: `tools/atlas_v2.score`, the account-B rules, back-to-back eval paths).
6. **Data notes.** A missing fact counts as the H1 average (no effect on the score). ATLAS's daily ATR percentile needs a
   year of history, so 20% of the candidates (mostly 2021-22) have none. Everything else covers 99-100% of the trades.

## Extra checks (disclosed, not the verdict)

**Other model forms (BLITZ, thirds, 100 shuffled fits each).** None is better in all three spans:

| Fit | R per $ risked, H1 / H2 / 2021-25 (today +0.165 / +0.200 / +0.013) | shuffled p | 25K slot $ / month (today $277 / $30 / -$41) |
|---|---|---|---|
| ridge, light shrinkage | +0.184 / +0.223 / +0.003 | 0.15 / 0.28 / 0.92 | $266 / $66 / -$41 |
| ridge, very strong shrinkage | +0.185 / +0.264 / +0.012 | 0.19 / 0.03 / 0.57 | $282 / $57 / -$36 |
| logistic (winner or not) | +0.163 / +0.229 / +0.008 | 0.57 / 0.27 / 0.80 | $269 / $79 / -$37 |

The one cell under 0.05 (very strong shrinkage, H2 p 0.03) is what chance gives among the 14 out-of-sample BLITZ cells
(8 pre-registered, 6 here). The same score is worse than today in 2021-25.

**The reverse test: fit on the 5-year history, test on 2026 (both halves untouched).**

- **BLITZ** (1,841 trades): the weights flip sign on 5 of 6 facts against the H1 fit (break strength -0.004, range so far
  +0.004, VIX +0.015, room to liquidity +0.004, 15m structure +0.007; only the signal count keeps its sign). Applied to
  2026 it is worse in H1 (+0.145 vs +0.165, shuffled p 0.89) and a little better in H2 (+0.215 vs +0.200, p 0.32). The checklist version: +0.161 / +0.210. No stable quality signal.
- **ATLAS** (875 trades, 2021-24): the ridge score is almost only two facts. It rates trades against the 15m structure
  higher (-0.022) and higher VIX higher (+0.013). Applied to 2025, H1 and H2:

| ATLAS ridge fit on 2021-24 | R per $ risked (today) | shuffled p (R / eval $) | 2-week pass / dead (today) | eval paths $ / month (today) |
|---|---|---:|---|---|
| 2026 H1 | +1.038 (+0.884) | 0.06 / 0.00 | 66.4 / 4.2 (65.5 / 0.8) | $1,917 ($1,394) |
| 2026 H2 | +0.723 (+0.620) | 0.19 / 0.51 | 39.1 / 0.0 (43.5 / 0.0) | $529 ($547) |
| 2025 | +0.091 (+0.084) | 0.43 / 0.52 | 21.3 / 18.5 (30.1 / 23.3) | -$117 (-$148) |

  The p values come from 100 shuffled fits on 2021-24 (seed 11; a first 20-seed pass gave 0.00 / 0.15 / 0.25).
  - It fails the 2-week test. Dead evals in H1 rise to 4.2%, the H2 pass rate drops, and H2 eval-path $ is a little lower.
  - Only H1 clears its shuffles (eval-path $ p 0.00, R p 0.06). H2 and 2025 are at chance.
  - The checklist version is worse: H2 +0.539 vs +0.620, dead 8.4% / 8.7%.
  - **A weak paper lead at most:** "fade the 15m structure when VIX is up" for ATLAS's reversal members. It needs a new
    out-of-sample period before anyone trusts it.

**A trader's prior checklist (no fit at all).** This tests whether a written-down checklist does better than a fitted score.

- **BLITZ:** a point for each box. A strong break. The day already moving. Not the first signal. Room to the next pool.
  With the 15m structure. 0-1 points x0.5, 2-3 x1, 4-5 x1.5.
  - R per $ risked: +0.195 / +0.222 / +0.019 vs +0.165 / +0.200 / +0.013.
  - It is better in 6 of 7 years; 2023 is worse by -0.009.
  - It is the best of the 32 sign choices of the same boxes in 2021-25, 2nd in H1, 6th in H2.
  - The 25K slot (1,000 lives): $287 / $50 / -$38 vs $270 / $37 / -$40.
  - 2-week pass / fail: H1 42.9 / 36.1 vs 36.1 / 37.8, H2 33.3 / 34.8 vs 36.2 / 34.8 (fewer passes), 2021-25 23.6 / 48.3
    vs 20.4 / 50.2.
  - **But:** shuffling the same sizes over the trades does as well 3% / 10% / 12% of the time. It risks 16-25% more on
    average. The best group is 4 points, not 5 (5 points: +0.137 / +0.116 R).
  - **It is not blind.** It was written after the first run printed each fact's split in all spans, and two of its boxes
    (later break, range so far) are facts earlier research on the same data already flagged (atlas-blitz-edge-2026-10-30.md).
  - Run `dsx_blitz_prior`, status info: a thin lead, not adopted.
- **ATLAS:** tight stop, moving market, room to the next pool, with the 15m structure, not after a loss.
  - It ranks 14th / 9th / 13th / 23rd of 32 sign choices.
  - 2-week pass 63.0 / 40.6 vs 65.5 / 43.5.
  - It fails the v2 test. At chance: run `dsx_atlas_prior`.

## Verdict

- **BLITZ: at chance. No change.**
  - The pre-registered score is better in 2026 H2 by luck-sized margins (p 0.14-0.41).
  - It is worse than today in 2021-25 in every form (p 0.79-1.00).
  - Its 5-year twin points the other way.
  - The single "discretion" fact that held before is the later-break eval size (`blitz_25k_pick_v2.json`, still the owner's
    call). The combined score adds nothing on top of it.
- **ATLAS: at chance. No change.**
  - In-sample H1 looks good, as fits always do.
  - Out of sample no form beats its shuffled fits (H2 p 0.33-0.78, 2021-24 p 0.53-0.80), and the 2-week pass rate drops in
    both halves.
- **Why it fails.** The 2026 spans hold 51-217 trades. Splitting that into thirds leaves 17-73 trades a group.
  The facts' edges are small and change sign between years. That is what the earlier single-fact studies found: 430 BLITZ
  size tilts at chance, ATLAS setup-geometry sizes 0 of 48. Combining noisy facts does not make a signal.

## What a winner would need

For the record, a discretion score could be adopted only if:

- Fit on H1, it beats at least 95% of its shuffled-label fits in H2 AND in 2021-25 (p <= 0.05).
- It is better per unit of risk and in $ in all three spans.
- On the 25K: 2-week pass not down and fail / dead not up in both 2026 halves. ATLAS also needs the v2 test, 2025 and
  2021-24 not worse.
- It keeps 2+ trades a week.

The config it would need (nothing like it exists today; it would also need a size hook in `engine/blitz.py` or
`engine/account_b.qty`, not built):

```json
"discretion": {"features": ["exc", "rng_sofar", "vix", "nth", "liq_room", "st15_with"],
               "h1_mean": {...}, "h1_sd": {...}, "weights_per_sd": {...},
               "cuts": [-0.0143, 0.0128], "mult": [0.5, 1.0, 1.5]}
```

The frozen values are in `research/scalp/dsx_blitz.json` and `research/second/dsx_atlas.json` (`rows.<model>.fit`).

## Files

- **Code:** `tools/dsx_discretion.py`.
  - Commands `blitz`, `atlas` (the pre-registered test) and `extra_blitz`, `extra_atlas` (model forms, reverse fit).
  - Command `prior` (the trader's checklist); `save` stores the runs.
- **Results:**
  - `research/scalp/dsx_blitz.json`, `research/scalp/dsx_blitz_extra.json`, `research/scalp/dsx_prior.json`,
    `research/scalp/dsx_prior_blitz_check.json` (permutation p, per year, eval / slot at 1,000 lives).
  - `research/second/dsx_atlas.json`, `research/second/dsx_atlas_extra.json`, `research/second/dsx_atlas_extra_ridge100.json`.
- **Runs:** `research/runs/dsx_*.json`. BLITZ runs are stored at $500 x the size a trade; ATLAS runs store the eval-path trades
  of the 4 spans.

Paper research only. Nothing in `engine/`, `second_model.json` or `live_model*.json` was changed.
