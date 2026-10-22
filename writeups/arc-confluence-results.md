# Confluence results (CONFLUENCE track, real CME NQ1! / ES1! 5m only)

Generated 2026-10-16 18:31 by `python -X utf8 tools/lab_confluences.py all`. Features: `tools/lab_confluences.py` (`features(bars5, entry_t, d, es5)`, causal). Catalog and sources: `research/lab/CONFLUENCE_CATALOG.md`. Machine-readable: `research/lab/confluence_results.json`.

## 0. Bottom line (first full pass, 16 Oct 2026)

**Scope.** 92 causal confluence booleans (46 popular concepts; see `CONFLUENCE_CATALOG.md`) were tested on 14 trade
beds, all real NQ futures:
- the leading candidate (engine `max_trades_day: 1`): 2026 YTD (93 trades) and a 2025-04-14..12-31 holdout (118);
- the engine at max 2/day: 2026 (106) and 2025 (183);
- the five lab models with their default params on NQ, in 2026 and in 2025-04-14..12-31:
  - silver_bullet: 94 and 92 trades;
  - ict2022: 54 and 43;
  - mech_ifvg: 80 and 77;
  - continuation: 20 and 11;
  - session_po3: 16 and 41.

**1. Nothing survives a multiple-testing check.**
- *Per bed:* the number of HELPS\*/HURTS\* labels is about what random features produce (17 HELPS\* against about 30
  expected by chance; 39 HURTS\* against about 28).
- *Pooled over 8 roughly independent bed families:* the strongest confluence reaches |z| = 2.66. Under shuffled
  outcomes the largest |z| among 92 confluences is 2.70 at the median, and the 95% family-wise line is |z| >= 3.77.
- *On the leading candidate:* the best filter or pair at >= 2/wk is matched by random-feature searches 28-48% of the
  time.

**2. Top 5 that helped**, ranked by pooled z: the with-minus-without avg R, averaged over the 8 families. None is
significant after correction.

| # | confluence | pooled diff | z | families with that sign | detail |
|---|---|---:|---:|---|---|
| 1 | `trend_1h_with` (1H break-of-structure trend in the trade's direction) | +0.30R | 2.66 (nominal p ~ 0.01) | 5 of 8 | HELPS\* on silver_bullet 2026 (+0.69R) and mech_ifvg 2025 (+1.09R). On the leading candidate: +0.17R but flips sign (dev -0.56, confirm +1.03), and it keeps only 0.97/wk. |
| 2 | `trend_5m_with` (last 5m BOS in the trade's direction) | +0.21R | 1.51 | 4 of 6 | HELPS\* on both 2025 engine beds (+0.54R, +0.42R). -0.14R on the 2026 candidate. |
| 3 | `nq_rs_with` (NQ stronger than ES since the open: long the stronger index) | +0.17R | 1.40 | 6 of 8 | +0.40R on the 2026 candidate (dev -0.09, confirm +1.53). |
| 4 | `gap_big` (RTH gap >= 0.25 ADR) | +0.12R | 1.12 | 4 of 8 | HELPS\* on silver_bullet 2025 (+0.84R). |
| 5 | `trend_day_with` (>= 0.4 ADR above the 18:00 open and in the top quarter of the day) | +0.20R | 1.06 | 3 of 5 | +0.41R on the 2026 candidate, on 12 trades. |

The common thread is that with-trend entries do a little better. Every one of these also cuts frequency well below
2/wk on every bed.

Per-bed strict HELPS (passing the 2/wk rule) occurred only on 2025 engine beds:
- `adr_room` on the max-1/day 2025 bed: +0.38R, CI [+0.03, +0.73], keeps 2.69/wk.
- `asia_small` (+0.57R) and `ifvg_5m` (+0.56R) on the max-2/day 2025 bed.

Each one is negative on at least one other bed: `adr_room` -0.51R on silver_bullet 2026, `asia_small` -1.06R on
ict2022 2026, `ifvg_5m` -0.86R on silver_bullet 2026.

**3. Clear HURTS: none after correction.**

The most consistent negatives are all nominally p < 0.05 pooled and negative in 6 of 8 families:
- `liq_void_draw`: -0.30R, z -2.39. An unfilled bearish void sits above a long entry, so the long comes right after a
  crash candle.
- `below_rth_open`: -0.25R, z -2.27. This tests ICT's "buy below the open" without the daily-bias condition, and it
  comes out backwards.
- `below_tso`: -0.26R, z -2.25. Below the Quarterly-Theory true session open.

Per-bed strict HURTS, where vetoing still leaves 2/wk:
- `news_day` / `cpi_nfp_day` on both 2025 engine beds: -0.57R and -0.75R / -0.66R. Thin in 2026.
- `in_ob_5m` (entry inside a 5m order block) on both 2025 engine beds: -0.41R and -0.49R.
- `fvg_1h_leg` and `dow_wed` on the 2026 max-2/day engine bed.

**4. The leading candidate (section 1).** No confluence skips the Apr-Jul losers at 2 trades/week. The arithmetic
forbids it: at most 10 of 93 trades can go. The best feasible pair is `not fomc_day & not atr_expanding`:
- 2026: +1,420, 50K pass 63.5% (zero-edge 22.3%) against 48.1% (27.0%);
- 2025 holdout: +515;
- but it is within luck (p = 28%).

Recommendation: keep the engine as is. Optionally add "no entries on FOMC days" as a risk rule, not as an edge.

## 1. Leading candidate first: Liquidity Engine, `max_trades_day: 1` (priority from the lead)

Test bed: `engine_trades({"grade_sizing": false, "conviction_step": 0, "max_trades_day": 1}, 2026-01-02, 2026-10-16)` live-loop replay, cached in `research/lab/conf_testbed_orig1day.json` (93 trades), plus the same params on 2025-04-14..2025-12-31 as a holdout (118 trades). Filters are applied to the finished trade list: a skipped trade is simply gone (the 'gate-emulated' column instead replays the filter as an entry gate on the max-2/day list, so a vetoed first setup can be replaced by that day's second one). Day P&L and intraday lows are rebuilt from the engine's own day list, and pass rates come from `strategy_lab.stats` (rolling MFFU 50K; zero-edge baseline in brackets). No confirm-log entries were written (`score()` was not called).

### Verdict (plain English)

1. **No confluence skips the Apr-Jul losers at 2 trades a week.** The candidate trades 2.26/wk, so the 2.0/wk floor
   lets a filter drop at most 10 of 93 trades, while Apr-Jul holds 35 trades with 32 losers. Even a perfect hindsight
   filter could only lift Apr-Jul from -2,889 to about -550. The real filters move it by 0 to +880.
2. **The best feasible combination is `not fomc_day & not atr_expanding`.** It skips FOMC days, and it skips entries
   where the last 30 minutes ran at 1.3x or more their 10-day same-time true range. The effects:
   - 2026: 83 trades (2.01/wk), +1,420.
   - Jan-Jun: +592 becomes +2,521. Apr-Jul: -2,889 becomes -2,010. Aug-Oct keeps 95%.
   - 50K pass: 63.5% (zero-edge 22.3%) against 48.1% (zero-edge 27.0%).
   - 2025 holdout: +1,361 becomes +1,876 (PF 1.14 to 1.22).
   - Losing months stay at 5. April and May are untouched. The gain comes from 4 January losers (-1,057) and
     3 June losers (-869). It also drops one +519 August winner.
3. **That gain is the size luck gives.** Columns of shuffled random features, searched the same way, find a pair at
   least this good 28% of the time, and a single filter at least as good as the best real one 48% of the time. Effects
   this small cannot be told apart from noise: about +$1k from skipping 10 trades.
4. **Mechanical reasons, for what they are worth:**
   - Skipping FOMC days is a standard risk rule rather than an edge. It removes 2 trades in 2026 and 5 in 2025, both
     years improve, and the cost is tiny.
   - Skipping volatility expansion has a plausible story: sweeps into expanding range tend to continue rather than
     reverse. It holds in 2025 (+358).
   - `not fvg_1h_leg` (veto a fresh displacement FVG) has no sound story, since it is the opposite of the ICT claim.
     Treat it as noise.
5. **If the floor were relaxed to about 1.6-1.9/wk,** three filters each do the following: `asia_small` (Asia range <=
   40% ADR), `adr_room` (at least half an ADR left in the trade's direction) and `not open_in_value` (skip days that
   open inside prior value).
   - They trim Apr-Jul by +1.0k to +1.3k.
   - They also trim the 2025 Sep-Dec losing stretch (+284 to +880) and raise the 2025 total.
   - But they give up 14-22% of Aug-Oct.

   They break the owner's frequency rule, and they were found by searching these same 10 months.
6. **Recommendation:** no confluence gate for Monday. If one rule is wanted, add "no new entries on FOMC days" as a
   risk rule and log `atr_expanding` for paper evidence. The Apr-Jul drawdown looks like regime, not a missing
   confluence. None of the 92 confluences separates those months' losers from the Aug-Oct winners.

### The arithmetic first

- Base 2026: 93 trades, 2.26/wk, PF 2.41, net +11,630, 5 losing months, 50K pass 48.1% (zero-edge 27.0%).
- Apr-Jul: 35 trades, net -2,889, PF 0.08, win 8.6%. Aug-Oct: 32 trades, net +11,377, PF 5.90.
- **2.0 trades/week over 2026 means keeping at least 83 of 93 trades: a filter may drop at most 10.** Apr-Jul alone has 35 trades (32 losers). Even a perfect hindsight filter that drops the 10 worst Apr-Jul trades leaves Apr-Jul at -550; dropping the 10 worst trades of the whole year adds at most +3,478. So no confluence can 'skip the Apr-Jul losers' at 2/wk; the most any filter can do is trim the worst of them.
- 2025 holdout base: 118 trades, 3.17/wk, PF 1.14, net +1,361, 50K pass 11.8% (zero-edge 0.8%).

### Single confluences that keep >= 2.0/wk and >= 90% of the Aug-Oct net

12 of 184 single filters (each confluence as 'require it' and as 'veto it') pass the frequency floor and keep the Aug-Oct winners. Sorted by the 2026 net change.

| keep only trades where | kept /wk | Jan-Jun net (PF) | Jul-Oct net (PF) | Apr-Jul net | Aug-Oct net | losing months | 50K pass % (zero-edge) | 2025 holdout net (PF), /wk | gate-emulated 2026 net (n) |
|---|---:|---|---|---:|---:|---:|---|---|---|
| **all trades (base)** | 2.26 | +592 (1.11) | +11,038 (5.15) | -2,889 | +11,377 | 5 | 48.1 (27.0) | +1,361 (1.14), 3.17/wk | +11,471 (92) |
| `not fvg_1h_leg` | 2.01 | +1,185 (1.25) | +11,362 (5.86) | -2,387 | +11,701 | 5 | 56.1 (22.7) | +1,814 (1.27), 2.37/wk | +12,044 (83) |
| `not fomc_day` | 2.21 | +1,310 (1.27) | +11,038 (5.15) | -2,535 | +11,377 | 5 | 55.6 (25.9) | +1,518 (1.16), 3.04/wk | +12,189 (90) |
| `not atr_expanding` | 2.06 | +1,803 (1.41) | +10,529 (4.97) | -2,364 | +10,858 | 5 | 54.0 (27.0) | +1,719 (1.20), 2.82/wk | +12,065 (84) |
| `not trend_15m_with` | 2.04 | +1,374 (1.30) | +10,900 (5.74) | -2,727 | +11,239 | 5 | 52.9 (25.9) | +472 (1.06), 2.63/wk | +11,861 (85) |
| `not orb_with` | 2.14 | +1,160 (1.23) | +11,038 (5.15) | -2,600 | +11,377 | 5 | 52.4 (25.9) | +1,242 (1.14), 2.98/wk | +11,929 (87) |
| `not in_fvg_5m` | 2.23 | +788 (1.15) | +11,038 (5.15) | -2,694 | +11,377 | 5 | 49.2 (27.0) | +1,532 (1.16), 3.09/wk | +11,666 (91) |
| `not in_mitig_5m` | 2.18 | +608 (1.11) | +11,212 (5.51) | -2,874 | +11,551 | 5 | 48.1 (25.9) | +1,628 (1.17), 3.15/wk | +11,657 (89) |
| `not pwl_swept` | 2.23 | +634 (1.11) | +11,038 (5.15) | -2,889 | +11,377 | 5 | 48.1 (27.0) | +1,382 (1.14), 3.09/wk | +11,513 (91) |
| `not in_nwog` | 2.06 | +52 (1.01) | +11,068 (5.20) | -2,548 | +11,377 | 5 | 44.4 (28.6) | +1,052 (1.12), 3.01/wk | +11,080 (84) |
| `not judas_rth` | 2.11 | -370 (0.92) | +11,344 (5.81) | -2,400 | +11,683 | 6 | 47.1 (27.0) | -784 (0.92), 2.98/wk | +10,767 (87) |
| `not round_big` | 2.01 | -727 (0.86) | +10,569 (5.27) | -2,710 | +10,878 | 5 | 45.0 (31.4) | +1,878 (1.21), 2.96/wk | +9,322 (84) |
| `not near_eq_pdr` | 2.06 | -1,831 (0.65) | +11,428 (6.03) | -2,570 | +11,767 | 6 | 47.1 (29.0) | +362 (1.04), 2.93/wk | +9,520 (85) |

### Near misses: better Jan-Jun, Aug-Oct kept, but under 2.0/wk (1.5-2.0/wk)

Shown because a looser floor or a second setup type could restore frequency; they fail the brief as is.

| keep only trades where | kept /wk | Jan-Jun net (PF) | Jul-Oct net (PF) | Apr-Jul net | Aug-Oct net | losing months | 50K pass % (zero-edge) | 2025 holdout net (PF), /wk | gate-emulated 2026 net (n) |
|---|---:|---|---|---:|---:|---:|---|---|---|
| `not dow_wed` | 1.92 | +2,400 (1.64) | +10,607 (6.27) | -2,068 | +10,843 | 5 | 86.6 (25.7) | +236 (1.03), 2.50/wk | - |
| `below_tso` | 1.55 | +878 (1.24) | +10,608 (8.81) | -1,992 | +10,916 | 5 | 51.9 (16.4) | -65 (0.99), 2.02/wk | - |

### What it would take: the best Apr-Jul improvers at any frequency >= 1.5/wk (Aug-Oct kept >= 75%)

2025 Sep-Dec was the holdout's own losing stretch (base net -2,912), so the last two columns ask whether the same filter also trimmed that one.

| keep only trades where | kept /wk | Apr-Jul change | Aug-Oct kept | Jan-Mar net (base +3,142) | 2025 Sep-Dec change | 2025 total change |
|---|---:|---:|---:|---:|---:|---:|
| `not choch_5m` | 1.72 | +1,525 | 83% | +2,124 | +919 | -1,327 |
| `not mss_disp` | 1.63 | +1,501 | 87% | +2,824 | +1,092 | -698 |
| `not trend_5m_with` | 1.70 | +1,347 | 84% | +2,048 | +168 | -3,998 |
| `asia_small` | 1.87 | +1,287 | 85% | +2,888 | +284 | +1,415 |
| `not judas_mo` | 1.80 | +1,282 | 82% | +3,934 | +328 | -693 |
| `not daily_bias_with` | 1.53 | +1,179 | 99% | +1,853 | +2,465 | +116 |
| `adr_room` | 1.63 | +1,078 | 78% | +3,484 | +878 | +966 |
| `not in_prior_value` | 1.72 | +1,025 | 89% | -498 | +1,138 | -1,543 |
| `not open_in_value` | 1.70 | +983 | 86% | +1,119 | +880 | +556 |
| `below_tso` | 1.55 | +897 | 96% | +2,563 | +1,026 | -1,426 |
| `not round_q` | 1.60 | +821 | 81% | +2,129 | +806 | -987 |
| `not dow_wed` | 1.92 | +821 | 95% | +4,232 | -250 | -1,126 |

### Pairs (two filters ANDed), feasible at >= 2.0/wk and >= 90% of Aug-Oct

25 feasible pairs. Top by 2026 net change, then the best ones that also do not lower the 2025 net.

| keep only trades where | kept /wk | Jan-Jun net (PF) | Jul-Oct net (PF) | Apr-Jul net | Aug-Oct net | losing months | 50K pass % (zero-edge) | 2025 holdout net (PF), /wk | gate-emulated 2026 net (n) |
|---|---:|---|---|---:|---:|---:|---|---|---|
| `not fomc_day & not atr_expanding` | 2.01 | +2,521 (1.69) | +10,529 (4.97) | -2,010 | +10,858 | 5 | 63.5 (22.3) | +1,876 (1.22), 2.69/wk | +12,783 (82) |
| `not orb_with & not fomc_day` | 2.09 | +1,878 (1.44) | +11,038 (5.15) | -2,246 | +11,377 | 5 | 61.4 (22.7) | +1,399 (1.16), 2.85/wk | +12,647 (85) |
| `not in_fvg_5m & not fomc_day` | 2.18 | +1,506 (1.32) | +11,038 (5.15) | -2,340 | +11,377 | 5 | 56.1 (25.9) | +1,689 (1.18), 2.96/wk | +12,384 (89) |
| `not in_mitig_5m & not fomc_day` | 2.14 | +1,326 (1.27) | +11,212 (5.51) | -2,520 | +11,551 | 5 | 55.6 (25.9) | +1,784 (1.19), 3.01/wk | +12,375 (87) |
| `not in_fvg_5m & not trend_15m_with` | 2.01 | +1,568 (1.36) | +10,900 (5.74) | -2,532 | +11,239 | 5 | 54.0 (22.7) | +476 (1.06), 2.61/wk | +12,056 (84) |
| `not in_fvg_5m & not orb_with` | 2.11 | +1,355 (1.28) | +11,038 (5.15) | -2,406 | +11,377 | 5 | 52.9 (25.9) | +1,414 (1.16), 2.90/wk | +12,124 (86) |
| `not pwl_swept & not fomc_day` | 2.18 | +1,352 (1.28) | +11,038 (5.15) | -2,535 | +11,377 | 5 | 55.6 (25.9) | +1,538 (1.16), 2.96/wk | +12,231 (89) |
| `not in_mitig_5m & not orb_with` | 2.09 | +1,164 (1.23) | +11,212 (5.51) | -2,596 | +11,551 | 5 | 52.4 (25.9) | +1,510 (1.17), 2.96/wk | +12,108 (85) |
| `not pwl_swept & not atr_expanding` | 2.04 | +1,845 (1.43) | +10,529 (4.97) | -2,364 | +10,858 | 5 | 54.0 (27.0) | +1,740 (1.20), 2.74/wk | +12,107 (83) |
| `not trend_15m_with & not pwl_swept` | 2.01 | +1,416 (1.31) | +10,900 (5.74) | -2,727 | +11,239 | 5 | 52.9 (25.9) | +493 (1.06), 2.55/wk | +11,903 (84) |

Pairs that also do not lower the 2025 holdout net:

| keep only trades where | kept /wk | Jan-Jun net (PF) | Jul-Oct net (PF) | Apr-Jul net | Aug-Oct net | losing months | 50K pass % (zero-edge) | 2025 holdout net (PF), /wk | gate-emulated 2026 net (n) |
|---|---:|---|---|---:|---:|---:|---|---|---|
| `not fomc_day & not atr_expanding` | 2.01 | +2,521 (1.69) | +10,529 (4.97) | -2,010 | +10,858 | 5 | 63.5 (22.3) | +1,876 (1.22), 2.69/wk | +12,783 (82) |
| `not orb_with & not fomc_day` | 2.09 | +1,878 (1.44) | +11,038 (5.15) | -2,246 | +11,377 | 5 | 61.4 (22.7) | +1,399 (1.16), 2.85/wk | +12,647 (85) |
| `not in_fvg_5m & not fomc_day` | 2.18 | +1,506 (1.32) | +11,038 (5.15) | -2,340 | +11,377 | 5 | 56.1 (25.9) | +1,689 (1.18), 2.96/wk | +12,384 (89) |
| `not in_mitig_5m & not fomc_day` | 2.14 | +1,326 (1.27) | +11,212 (5.51) | -2,520 | +11,551 | 5 | 55.6 (25.9) | +1,784 (1.19), 3.01/wk | +12,375 (87) |
| `not in_fvg_5m & not orb_with` | 2.11 | +1,355 (1.28) | +11,038 (5.15) | -2,406 | +11,377 | 5 | 52.9 (25.9) | +1,414 (1.16), 2.90/wk | +12,124 (86) |
| `not pwl_swept & not fomc_day` | 2.18 | +1,352 (1.28) | +11,038 (5.15) | -2,535 | +11,377 | 5 | 55.6 (25.9) | +1,538 (1.16), 2.96/wk | +12,231 (89) |
| `not in_mitig_5m & not orb_with` | 2.09 | +1,164 (1.23) | +11,212 (5.51) | -2,596 | +11,551 | 5 | 52.4 (25.9) | +1,510 (1.17), 2.96/wk | +12,108 (85) |
| `not pwl_swept & not atr_expanding` | 2.04 | +1,845 (1.43) | +10,529 (4.97) | -2,364 | +10,858 | 5 | 54.0 (27.0) | +1,740 (1.20), 2.74/wk | +12,107 (83) |

### Is the best filter better than luck? (placebo search)

Every confluence column was randomly permuted across the 93 trades (200 times; same frequencies, no information) and the same search was rerun under the same constraints.

| search | best real 2026 net change | best random: median | 90th pct | 95th pct | share of random searches that beat the real best |
|---|---:|---:|---:|---:|---:|
| single filter | +916 | +890 | +1,535 | +1,683 | 48% |
| pair of filters | +1,420 | +1,186 | +1,778 | +1,905 | 28% |

**No-lookahead check** (`python -X utf8 tools/lab_confluences.py lookahead 120`). Every confluence was recomputed on bars cut off at the entry, with the same start, for 120 random trades from the engine and model beds. There were 4 mismatches. 0 of them have no explanation; the rest are entries at exactly 09:30, where the full-data run can read the 09:30 bar's open, which prints at entry_t. Session windows (IB, OR, Asia, London, CBDR) count as finished only once the clock passes their end, so `features()` is safe to call live on a frame that ends at the last closed bar.

## 2. Every test bed: with vs without each confluence

Each confluence splits a bed's trades into 'with' (feature True) and 'without' (False or not yet defined). Halves: dev 2026-01-02..06-30 / confirm 07-01..10-16 for the 2026 beds; 2025-04-14..08-31 / 09-01..12-31 for the max-1/day 2025 holdout and the 2025 model beds; 2025 H1 / H2 for the max-2/day 2025 bed. 'diff' = avg R with minus avg R without; CI = two-sample bootstrap 95% (2,000 draws). Model beds = `run(bars('NQ','5m',start,end,warmup_days=30), {'sym': 'NQ'}, es5)` with each module's default params (cached in `research/lab/conf_testbed_models.json`, keyed by module mtime).

Labels (fixed before looking at results):

- **HELPS**: diff > 0 in both halves, the kept ('with') set trades >= 2.0/week over the bed, and the full-period 95% CI excludes 0 *or* both halves are clearly positive (diff >= +0.15R and bootstrap P(diff > 0) >= 0.9 in each).
- **HURTS**: the mirror (diff < 0 in both halves, same significance test), and vetoing it still leaves >= 2.0/week.
- **NOISE**: everything else. **THIN**: fewer than 8 trades on either side (or 3 in a half).
- **HELPS\* / HURTS\***: the same sign and significance test *without* the 2/week condition (most beds trade only 1.2-2.6/week, so almost no filter can keep 2/week; the starred label shows the edge alone).

### Beds and how many labels luck alone would give

Placebo: 300 random features per bed (each trade True with probability 0.1-0.9, no information) put through the same labels. 'Expected by chance' = placebo rate x the number of confluences tested on that bed.

| bed | trades | /wk | avg R (dev / confirm) | tested | HELPS / HURTS | HELPS\* / HURTS\* | expected by chance (HELPS\* / HURTS\*) |
|---|---:|---:|---|---:|---|---|---|
| Engine max 1/day, 2026 (primary) | 93 | 2.26 | -0.02 / +0.92 | 73 | 0 / 0 | 1 / 3 | 4.5 / 1.7 |
| Engine max 1/day, 2025-04-14..12-31 (holdout) | 118 | 3.17 | +0.20 / -0.34 | 74 | 1 / 5 | 2 / 5 | 2.1 / 2.6 |
| Engine (grade off, conviction 0, max 2/day), 2026 | 106 | 2.57 | -0.05 / +0.87 | 75 | 0 / 2 | 1 / 3 | 2.5 / 3.6 |
| Engine (grade off, conviction 0, max 2/day), 2025 | 183 | 3.55 | +0.23 / -0.13 | 80 | 2 / 5 | 4 / 5 | 4.3 / 4.3 |
| lab model silver_bullet (NQ, defaults), 2026 | 94 | 2.28 | +0.03 / -0.32 | 77 | 0 / 0 | 2 / 1 | 2.9 / 1.6 |
| lab model ict2022 (NQ, defaults), 2026 | 54 | 1.31 | +0.14 / -0.54 | 65 | 0 / 0 | 0 / 4 | 3.6 / 1.8 |
| lab model mech_ifvg (NQ, defaults), 2026 | 80 | 1.94 | -0.17 / -0.08 | 53 | 0 / 0 | 1 / 5 | 2.8 / 2.6 |
| lab model continuation (NQ, defaults), 2026 | 20 | 0.49 | +0.01 / +0.24 | 13 | 0 / 0 | 0 / 0 | 0.3 / 0.9 |
| lab model session_po3 (NQ, defaults), 2026 [extra] | 16 | 0.39 | -0.21 / -0.01 | 0 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| lab model silver_bullet (NQ, defaults), 2025-04-14..12-31 | 92 | 2.47 | -0.11 / -0.01 | 80 | 0 / 0 | 1 / 2 | 2.2 / 1.2 |
| lab model ict2022 (NQ, defaults), 2025-04-14..12-31 | 43 | 1.16 | -0.29 / +0.11 | 60 | 0 / 0 | 1 / 7 | 2.0 / 3.5 |
| lab model mech_ifvg (NQ, defaults), 2025-04-14..12-31 | 77 | 2.07 | -0.21 / -0.04 | 66 | 0 / 0 | 2 / 4 | 1.9 / 1.9 |
| lab model continuation (NQ, defaults), 2025-04-14..12-31 | 11 | 0.3 | -0.21 / +0.29 | 0 | 0 / 0 | 0 / 0 | 0.0 / 0.0 |
| lab model session_po3 (NQ, defaults), 2025-04-14..12-31 [extra] | 41 | 1.1 | +0.26 / +0.09 | 35 | 0 / 0 | 2 / 0 | 0.8 / 2.1 |

### Pooled over the 8 roughly independent bed families (multiple-testing aware)

Families: orig1day_2026, orig1day_2025, silver_bullet_2026, ict2022_2026, mech_ifvg_2026, silver_bullet_2025, ict2022_2025, mech_ifvg_2025 (the max-2/day engine beds are left out because they contain the max-1/day trades). Pooled diff = equal-weight mean of the per-family with-minus-without avg R; z = pooled diff / its standard error. Family-wise threshold: shuffle the trade outcomes inside every family 400 times, keep the largest |z| over all 92 confluences each time; its 95th percentile is **|z| >= 3.77** (median 2.7). Only a confluence above that line is better than the best of 92 random tries.

| confluence | group | pooled diff (R) | z | families with that sign | nominal p < 0.05 | survives family-wise |
|---|---|---:|---:|---|---|---|
| `trend_1h_with` | Structure | +0.295 | +2.66 | 5 of 8 | yes | no |
| `trend_5m_with` | Structure | +0.208 | +1.51 | 4 of 6 | no | no |
| `nq_rs_with` | Intermarket | +0.171 | +1.40 | 6 of 8 | no | no |
| `judas_rth` | ICT time | +0.248 | +1.12 | 4 of 4 | no | no |
| `judas_mo` | ICT time | +0.149 | +1.12 | 4 of 8 | no | no |
| `gap_big` | Classic | +0.122 | +1.12 | 4 of 8 | no | no |
| `trend_day_with` | Classic | +0.199 | +1.06 | 3 of 5 | no | no |
| `vol_imb_5m` | PD array | +0.116 | +1.01 | 5 of 8 | no | no |
| `kz_ny_pm` | ICT time | +0.132 | +0.98 | 4 of 6 | no | no |
| `in_sb_hour` | ICT time | +0.116 | +0.93 | 3 of 6 | no | no |
| `dow_fri` | Classic | +0.126 | +0.85 | 5 of 7 | no | no |
| `gap_against` | Classic | +0.090 | +0.79 | 5 of 8 | no | no |
| `liq_void_draw` | PD array | -0.296 | -2.39 | 6 of 8 | yes | no |
| `below_rth_open` | ICT time | -0.253 | -2.27 | 6 of 8 | yes | no |
| `below_tso` | ICT time | -0.262 | -2.25 | 6 of 8 | yes | no |
| `dow_wed` | Classic | -0.214 | -1.68 | 5 of 8 | no | no |
| `in_macro` | ICT time | -0.210 | -1.67 | 4 of 7 | no | no |
| `below_0830` | ICT time | -0.188 | -1.65 | 6 of 8 | no | no |
| `open_in_value` | AMT | -0.181 | -1.64 | 6 of 8 | no | no |
| `es_confirms` | Intermarket | -0.199 | -1.63 | 6 of 8 | no | no |
| `fvg_1h_leg` | PD array | -0.174 | -1.60 | 5 of 8 | no | no |
| `kz_ny_am` | ICT time | -0.208 | -1.57 | 4 of 6 | no | no |
| `trend_day_against` | Classic | -0.179 | -1.33 | 4 of 6 | no | no |
| `inducement` | Structure | -0.148 | -1.28 | 4 of 8 | no | no |

### Cross-bed summary (all confluences)

Per bed: the full-period diff in R; a trailing `*` marks HELPS\*/HURTS\* on that bed, `!` marks a strict HELPS/HURTS, `.` = THIN. Sorted by (beds positive - beds negative), then mean diff. Beds overlap (the max-1/day trades are mostly the first trades of the max-2/day beds, and the four ICT models trade similar sweeps), so they are not independent votes.

| confluence | group | E1d26 | E1d25 | E26 | E25 | SB26 | M22-26 | MECH26 | CONT26 | PO3-26 | SB25 | M22-25 | MECH25 | CONT25 | PO3-25 | + / - beds | mean diff |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| `in_prior_value` | AMT | +0.17 | +0.17 | +0.26 | +0.11 | +0.43 | +0.17 | +0.19 | . | . | -0.11 | -0.46 | +0.09 | . | +0.75 | 9 / 2 | +0.16 |
| `po3_daily` | Ranges | +0.23 | +0.02 | +0.10 | +0.02 | +0.04 | -0.15 | +0.22 | . | . | +0.27 | -0.64 | +0.49* | . | +0.13 | 9 / 2 | +0.07 |
| `at_hvn` | AMT | +0.23 | +0.21 | +0.18 | +0.03 | +0.18 | . | -0.56* | . | . | +0.33 | -0.58* | +0.08 | . | +0.56 | 8 / 2 | +0.07 |
| `gap_against` | Classic | +0.54 | +0.27 | +0.48 | +0.14 | +0.01 | -0.31 | -0.12 | . | . | +0.41 | +0.03 | -0.11 | . | +0.20 | 8 / 3 | +0.14 |
| `ndog_draw` | ICT time | +0.32 | +0.31 | +0.28 | +0.22 | -0.51 | -0.29 | +0.27 | . | . | +0.39 | -0.22 | +0.11 | . | +0.26 | 8 / 3 | +0.10 |
| `below_globex_open` | ICT time | +0.24 | +0.09 | +0.22 | +0.09 | -0.44 | -0.22 | +0.14 | . | . | +0.36 | -0.16 | +0.11 | . | +0.05 | 8 / 3 | +0.04 |
| `judas_rth` | ICT time | . | . | . | +1.09* | . | +0.31 | . | . | . | +0.27 | . | +0.34 | . | . | 4 / 0 | +0.50 |
| `asia_small` | Ranges | +0.41 | . | +0.38 | +0.57! | -0.26 | -1.06* | +0.37 | . | . | +0.32 | . | +0.41 | . | . | 6 / 2 | +0.14 |
| `nr4_prev` | Classic | +0.49 | +0.07 | +0.45 | +0.00 | +0.12 | -0.25 | -0.34 | . | . | +0.40 | -0.19 | +0.30 | . | . | 7 / 3 | +0.11 |
| `mss_disp` | Structure | -0.47 | +0.00 | -0.35 | +0.03 | +0.07 | +0.38 | -0.07 | . | . | +0.19 | +0.29 | +0.07 | . | . | 7 / 3 | +0.01 |
| `in_macro` | ICT time | -0.45 | +0.15 | -0.40 | +0.36 | . | +0.15 | -0.39 | . | . | +0.02 | . | +0.11 | . | +0.49 | 6 / 3 | +0.00 |
| `in_nwog` | ICT time | . | . | . | +0.44 | +0.61 | . | . | . | . | . | . | . | . | . | 2 / 0 | +0.53 |
| `trend_5m_with` | Structure | -0.14 | +0.54* | -0.18 | +0.42* | +0.27 | +0.43 | . | . | . | -0.09 | +0.22 | . | . | . | 5 / 3 | +0.18 |
| `nwog_draw` | ICT time | -0.02 | +0.45 | +0.14 | +0.28 | -0.01 | -0.05 | +0.23 | -0.31 | . | +0.07 | -0.18 | +0.00 | . | +1.20* | 7 / 5 | +0.15 |
| `vol_imb_5m` | PD array | -0.07 | +0.51 | -0.03 | +0.39 | +0.31 | +0.02 | -0.24 | . | . | +0.50 | +0.32 | -0.41 | . | . | 6 / 4 | +0.13 |
| `kz_ny_pm` | ICT time | -0.26 | +0.10 | -0.35 | +0.26 | +0.53 | +0.01 | . | . | . | -0.36 | +0.77* | . | . | . | 5 / 3 | +0.09 |
| `qt_micro_23` | ICT time | +0.33 | +0.01 | +0.30 | +0.01 | +0.22 | -0.12 | -0.62* | +0.14 | . | -0.13 | -0.01 | +0.21 | . | -0.36 | 7 / 5 | -0.00 |
| `round_big` | Classic | +0.14 | -0.25 | +0.04 | +0.06 | . | +0.16 | . | . | . | -0.24 | . | . | . | . | 4 / 2 | -0.02 |
| `trend_1h_with` | Structure | +0.17 | -0.08 | +0.10 | -0.03 | +0.69* | +0.38 | -0.01 | . | . | -0.10 | +0.23 | +1.09* | . | -0.02 | 6 / 5 | +0.22 |
| `trend_day_with` | Classic | +0.41 | . | +0.31 | -0.11 | +0.47 | . | . | . | . | -0.15 | . | . | . | . | 3 / 2 | +0.18 |
| `open_out_value_with` | AMT | -0.17 | +0.02 | -0.02 | +0.19 | -0.45 | +0.24 | +0.44 | . | . | +0.60 | +0.43 | -0.41 | . | -0.26 | 6 / 5 | +0.06 |
| `orb_with` | AMT | . | . | . | +0.25 | +0.36 | . | . | . | . | -0.45 | . | . | . | . | 2 / 1 | +0.06 |
| `ib_break_with` | AMT | +0.50 | -0.00 | +0.17 | +0.26 | +0.43 | . | . | -0.40 | . | -0.64* | . | . | . | . | 4 / 3 | +0.05 |
| `nq_rs_with` | Intermarket | +0.40 | -0.27 | +0.20 | -0.24 | +0.38 | +0.07 | . | -0.47 | . | +0.26 | -0.04 | +0.15 | . | -0.02 | 6 / 5 | +0.04 |
| `round_q` | Classic | -0.24 | +0.09 | -0.15 | +0.25 | -0.13 | -0.01 | +0.08 | . | . | +0.38 | . | +0.04 | . | . | 5 / 4 | +0.04 |
| `vwap_rth_with` | AMT | -0.13 | +0.10 | -0.14 | +0.14 | +0.45 | +0.23 | -0.32 | . | . | -0.16 | +0.06 | -0.12 | . | +0.14 | 6 / 5 | +0.02 |
| `vwap_eth_with` | AMT | -0.47 | -0.06 | -0.48 | +0.04 | +0.31 | +0.40 | . | . | . | -0.32 | +0.39 | +0.31 | . | . | 5 / 4 | +0.01 |
| `gap_with` | Classic | +0.06 | -0.25 | +0.16 | -0.07 | +0.14 | +0.40 | +0.32 | . | . | -0.14 | +0.02 | -0.16 | . | -0.38 | 6 / 5 | +0.01 |
| `trend_15m_with` | Structure | -0.63 | +0.19 | -0.72 | +0.21 | +0.57 | +0.18 | . | . | . | -0.03 | +0.28 | -0.03 | . | . | 5 / 4 | +0.00 |
| `dow_thu` | Classic | -0.10 | +0.16 | +0.01 | +0.20 | +0.53 | -0.49 | +0.11 | . | . | -0.28 | +0.19 | -0.04 | . | -0.31 | 6 / 5 | -0.00 |
| `in_mitig_5m` | PD array | . | . | . | . | +0.98* | . | . | . | . | -0.35 | . | . | . | . | 1 / 1 | +0.32 |
| `in_bpr_5m` | PD array | . | . | . | . | -0.13 | -0.00 | . | . | . | +0.44 | +0.34 | . | . | . | 2 / 2 | +0.16 |
| `ote_5m` | ICT P/D | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `in_fvg_5m` | PD array | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `in_rejection_blk` | PD array | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `kz_london` | ICT time | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `vwap_2sd_fade` | AMT | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `pwl_swept` | Classic | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `fomc_day` | Classic | . | . | . | . | . | . | . | . | . | . | . | . | . | . | 0 / 0 | - |
| `choch_5m` | Structure | -0.21 | +0.14 | -0.11 | +0.15 | -0.10 | +0.40 | -0.15 | . | . | +0.02 | -0.72* | +0.05 | . | . | 5 / 5 | -0.05 |
| `below_mo` | ICT time | +0.52 | +0.06 | +0.43 | +0.07 | -0.51 | -0.68* | -0.11 | . | . | +0.32 | -0.33 | -0.35 | . | . | 5 / 5 | -0.06 |
| `ifvg_5m` | PD array | -0.67 | +0.39 | -0.56 | +0.56! | -0.86* | +0.01 | -0.10 | . | . | +0.47 | . | +0.31 | . | -0.53 | 5 / 5 | -0.10 |
| `in_breaker_5m` | PD array | . | . | . | . | . | -0.53 | . | . | . | . | +0.22 | . | . | . | 1 / 1 | -0.15 |
| `gap_big` | Classic | +0.30 | -0.27 | +0.37 | -0.12 | -0.02 | -0.02 | +0.20 | . | . | +0.84* | +0.33 | -0.38 | . | -0.13 | 5 / 6 | +0.10 |
| `adr_room` | Classic | +0.40 | +0.38! | +0.44 | -0.01 | -0.51 | . | . | -0.25 | . | -0.16 | . | . | . | . | 3 / 4 | +0.04 |
| `in_sb_hour` | ICT time | -0.01 | -0.12 | -0.17 | -0.29 | . | +0.06 | +0.57* | . | . | . | +0.48 | -0.28 | . | +0.05 | 4 / 5 | +0.03 |
| `pd_disc_pdr` | ICT P/D | +0.27 | -0.11 | +0.22 | -0.04 | -0.09 | -0.60* | -0.22 | . | . | +0.29 | +0.09 | -0.07 | . | +0.54 | 5 / 6 | +0.03 |
| `erl_swept` | Structure | -0.01 | +0.28 | +0.07 | +0.23 | -0.28 | -0.39 | . | . | . | +0.32 | -0.06 | -0.09 | . | . | 4 / 5 | +0.01 |
| `wk_profile_early` | Ranges | +0.15 | -0.06 | +0.12 | +0.05 | -0.16 | . | -0.07 | . | . | -0.40 | . | -0.28 | . | +0.65 | 4 / 5 | -0.00 |
| `in_pw_range` | Classic | -0.09 | +0.13 | -0.23 | +0.23 | -0.16 | +0.21 | -0.41 | . | . | +0.44 | -0.40 | -0.10 | . | +0.24 | 5 / 6 | -0.01 |
| `es_trend_with` | Intermarket | -0.49 | -0.12 | -0.35 | -0.15 | +0.13 | +0.30 | +0.34 | . | . | -0.56 | +0.25 | -0.39 | . | +0.41 | 5 / 6 | -0.06 |
| `trend_day_against` | Classic | +0.38 | -0.51! | +0.30 | -0.28 | -0.48 | . | -0.15 | . | . | -0.44 | . | +0.12 | . | +0.29 | 4 / 5 | -0.09 |
| `erl_to_irl` | Structure | . | . | . | . | -0.28 | -0.33 | . | . | . | +0.32 | . | . | . | . | 1 / 2 | -0.10 |
| `pd_disc_h1` | ICT P/D | +0.13 | +0.10 | +0.18 | -0.02 | -0.55 | -0.58 | . | . | . | +0.42 | -0.44 | -0.15 | . | . | 4 / 5 | -0.10 |
| `pd_disc_week` | ICT P/D | -0.76* | -0.21 | -0.51 | -0.31 | +0.28 | -0.21 | +0.40 | +0.06 | . | -0.32 | +0.38 | +0.01 | . | . | 5 / 6 | -0.11 |
| `es_vwap_with` | Intermarket | -0.55 | +0.20 | -0.55 | +0.12 | +0.17 | +0.21 | -0.10 | . | . | -0.61 | -0.18 | . | . | . | 4 / 5 | -0.14 |
| `inducement` | Structure | +0.21 | +0.07 | +0.04 | -0.04 | -0.38 | -0.14 | -0.20 | . | . | +0.03 | -0.90* | +0.14 | . | -0.44 | 5 / 6 | -0.15 |
| `cbdr_ext` | Ranges | +0.04 | -0.54! | +0.04 | -0.38 | -0.22 | +0.10 | -0.03 | . | . | +0.04 | . | -0.37 | . | . | 4 / 5 | -0.15 |
| `near_eq_pdr` | ICT P/D | . | . | +0.99 | +0.37 | -0.22 | . | . | . | . | -0.35 | -0.05 | -0.06 | . | . | 2 / 4 | +0.11 |
| `below_week_open` | ICT time | -0.05 | +0.25 | +0.12 | +0.11 | -0.25 | -0.11 | +0.26 | -0.53 | . | -0.02 | -0.02 | -0.02 | . | +1.28* | 5 / 7 | +0.09 |
| `pd_disc_day` | ICT P/D | +0.48 | +0.00 | +0.52 | -0.10 | -0.27 | -0.28 | . | -0.30 | . | +0.48 | -0.39 | -0.06 | . | . | 4 / 6 | +0.01 |
| `smt_es` | Intermarket | -0.43 | -0.12 | -0.32 | . | -0.66 | . | +0.33 | . | . | -0.20 | +0.24 | +0.14 | . | . | 3 / 5 | -0.13 |
| `atr_expanding` | Classic | . | -0.27 | . | -0.04 | -0.51 | . | . | . | . | +0.11 | -0.48 | +0.35 | . | . | 2 / 4 | -0.14 |
| `asia_ext` | Ranges | -0.17 | +0.07 | -0.29 | +0.32 | -0.65 | -0.51 | . | . | . | -0.22 | . | +0.29 | . | . | 3 / 5 | -0.14 |
| `below_rth_open` | ICT time | +0.24 | -0.38 | +0.30 | -0.33 | -0.59 | -0.49 | . | +0.02 | . | +0.10 | -0.45 | -0.35 | . | . | 4 / 6 | -0.19 |
| `dow_wed` | Classic | -0.89* | +0.23 | -0.88! | +0.23 | -0.17 | +0.11 | -0.12 | . | . | +0.22 | -0.72* | -0.36 | . | . | 4 / 6 | -0.24 |
| `cpi_nfp_day` | Classic | . | -0.75! | . | -0.66! | . | . | . | . | . | . | . | . | . | . | 0 / 2 | -0.70 |
| `dow_fri` | Classic | +1.42* | -0.20 | +1.17* | -0.12 | -0.31 | -0.12 | -0.07 | . | . | -0.30 | . | +0.47 | . | . | 3 / 6 | +0.21 |
| `ib_narrow` | AMT | -0.16 | +0.23 | -0.16 | -0.00 | . | . | . | . | . | -0.12 | . | . | . | . | 1 / 4 | -0.04 |
| `judas_mo` | ICT time | -0.59 | -0.02 | -0.36 | +0.13 | +0.58 | . | . | . | . | -0.13 | -0.01 | . | . | . | 2 / 5 | -0.06 |
| `poc_side_with` | AMT | -0.11 | -0.08 | -0.02 | -0.12 | +0.14 | +0.20 | +0.09 | . | . | -0.48 | +0.38 | -0.50* | . | -0.50 | 4 / 7 | -0.09 |
| `first_hour_rth` | ICT time | -0.35 | +0.10 | -0.28 | +0.04 | +0.14 | -0.31 | -0.56* | . | . | +0.83 | -0.32 | -0.32 | . | -0.52 | 4 / 7 | -0.14 |
| `below_0830` | ICT time | -0.05 | +0.02 | +0.06 | -0.08 | -0.50 | -0.49 | . | . | . | +0.27 | -0.50 | -0.09 | . | . | 3 / 6 | -0.15 |
| `qt_ny_q3` | ICT time | -0.35 | +0.10 | -0.28 | +0.04 | +0.14 | -0.29 | -0.56* | . | . | +0.83 | -0.58 | -0.32 | . | -0.52 | 4 / 7 | -0.16 |
| `pdl_swept` | Classic | . | . | . | -0.27! | . | . | -0.15 | . | . | . | . | -0.16 | . | . | 0 / 3 | -0.20 |
| `fvg_1h_leg` | PD array | . | -0.14 | -0.68! | -0.30 | +0.31 | +0.03 | -0.94* | . | . | -0.31 | +0.34 | -0.07 | . | . | 3 / 6 | -0.20 |
| `rejection_wick` | PD array | -0.08 | -0.35 | -0.18 | -0.31 | -0.20 | +0.46 | +0.20 | +0.17 | . | +0.45 | -0.25 | -0.51* | . | -0.58 | 4 / 8 | -0.10 |
| `below_tso` | ICT time | +0.47 | -0.06 | +0.40 | -0.17 | -0.14 | -0.58* | . | -0.09 | . | +0.35 | -0.79* | -0.72* | . | . | 3 / 7 | -0.13 |
| `es_confirms` | Intermarket | +0.13 | -0.10 | +0.12 | -0.07 | -0.62 | +0.07 | -0.47 | . | . | -0.26 | -0.19 | -0.16 | . | . | 3 / 7 | -0.15 |
| `cisd` | Structure | -0.75* | +0.24 | -0.73* | +0.24 | -0.28 | . | -0.00 | . | . | -0.17 | . | -0.06 | . | . | 2 / 6 | -0.19 |
| `kz_ny_am` | ICT time | -0.40 | +0.11 | -0.21 | -0.10 | -0.53 | -0.01 | . | . | . | +0.36 | -0.77* | . | . | . | 2 / 6 | -0.20 |
| `in_ob_5m` | PD array | -0.10 | -0.41! | -0.17 | -0.49! | -0.10 | +0.23 | . | . | . | +0.26 | -0.79* | . | . | . | 2 / 6 | -0.20 |
| `liq_void_draw` | PD array | -0.50 | -0.25 | -0.47 | -0.12 | -0.36 | -0.09 | . | +0.09 | . | +0.27 | +0.09 | -0.78* | . | . | 3 / 7 | -0.21 |
| `news_day` | Classic | +0.32 | -0.57! | -0.00 | -0.57! | -0.73 | . | . | . | . | -0.20 | . | . | . | . | 1 / 5 | -0.29 |
| `in_or` | AMT | -0.10 | -0.05 | -0.30 | -0.22 | -0.20 | +0.11 | -0.17 | . | . | +0.59 | +0.34 | -0.16 | . | -0.33 | 3 / 8 | -0.04 |
| `dow_tue` | Classic | -0.25 | -0.37 | -0.12 | -0.15 | +0.24 | . | +0.20 | . | . | -0.51 | -0.06 | -0.08 | . | . | 2 / 7 | -0.12 |
| `vwap_1sd_inside` | AMT | -0.61 | -0.15 | -0.54 | -0.29 | -0.07 | +0.23 | -0.10 | . | . | +0.51 | -0.15 | +0.04 | . | -0.26 | 3 / 8 | -0.13 |
| `daily_bias_with` | Structure | -0.51 | -0.05 | -0.58 | -0.02 | -0.03 | . | -0.43 | . | . | +0.29 | . | +0.37 | . | -0.35 | 2 / 7 | -0.14 |
| `adr_exhausted` | Classic | -0.46 | -0.12 | -0.40 | +0.34 | +0.34 | -0.22 | -0.39 | -0.40 | . | +0.09 | -0.27 | -0.15 | . | . | 3 / 8 | -0.15 |
| `dow_mon` | Classic | -0.30 | +0.15 | -0.30 | -0.14 | -0.46 | -0.13 | -0.17 | . | . | +0.70 | . | -0.10 | . | -0.38 | 2 / 8 | -0.11 |
| `at_lvn` | AMT | +0.03 | -0.34 | -0.04 | -0.05 | -0.03 | -0.32 | -0.15 | . | . | -0.17 | +0.31 | -0.02 | . | -0.77 | 2 / 9 | -0.14 |
| `open_in_value` | AMT | -0.08 | -0.16 | -0.13 | -0.33! | +0.17 | -0.09 | -0.24 | . | . | -0.90* | -0.27 | +0.13 | . | -0.30 | 2 / 9 | -0.20 |

### Per-bed detail: the 8 best and 8 worst confluences by full-period diff (non-THIN)

#### Engine max 1/day, 2026 (primary) (93 trades, 2.26/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `dow_fri` | HELPS* | 19% | 11/7 | 50.0 / 20.0 | +1.52 / +0.10 | 8.02 / 1.55 | +1.44 | +1.48 | +1.42 [+0.35, +2.56] | 0.44 |
| `gap_against` | NOISE | 37% | 19/15 | 32.4 / 22.0 | +0.72 / +0.18 | 3.71 / 1.82 | +0.45 | +0.59 | +0.54 [-0.18, +1.30] | 0.83 |
| `below_mo` | NOISE | 57% | 30/23 | 28.3 / 22.5 | +0.60 / +0.08 | 4.03 / 1.33 | +0.69 | +0.20 | +0.52 [-0.19, +1.19] | 1.29 |
| `ib_break_with` | NOISE | 12% | 6/5 | 36.4 / 24.4 | +0.81 / +0.32 | 7.85 / 2.10 | -0.09 | +1.13 | +0.50 [-0.58, +1.96] | 0.27 |
| `nr4_prev` | NOISE | 22% | 9/11 | 30.0 / 24.7 | +0.77 / +0.27 | 4.53 / 1.95 | +0.36 | +0.33 | +0.49 [-0.41, +1.49] | 0.49 |
| `pd_disc_day` | NOISE | 59% | 31/24 | 27.3 / 23.7 | +0.57 / +0.09 | 3.81 / 1.38 | +0.72 | +0.04 | +0.48 [-0.21, +1.17] | 1.33 |
| `below_tso` | NOISE | 69% | 34/30 | 26.6 / 24.1 | +0.52 / +0.06 | 3.28 / 1.04 | -0.03 | +0.98 | +0.47 [-0.20, +1.15] | 1.55 |
| `asia_small` | NOISE | 83% | 45/32 | 27.3 / 18.8 | +0.45 / +0.03 | 2.80 / 1.31 | +0.56 | +0.27 | +0.41 [-0.56, +1.24] | 1.87 |
| `es_vwap_with` | NOISE | 33% | 20/11 | 22.6 / 27.4 | +0.01 / +0.56 | 1.06 / 3.66 | -0.75 | -0.01 | -0.55 [-1.18, +0.13] | 0.75 |
| `judas_mo` | NOISE | 20% | 11/8 | 15.8 / 28.4 | -0.10 / +0.50 | 0.99 / 3.15 | -0.88 | -0.20 | -0.59 [-1.35, +0.29] | 0.46 |
| `vwap_1sd_inside` | NOISE | 52% | 26/22 | 18.8 / 33.3 | +0.08 / +0.69 | 1.45 / 4.13 | -0.36 | -1.16 | -0.61 [-1.33, +0.06] | 1.17 |
| `trend_15m_with` | NOISE | 10% | 6/3 | 22.2 / 26.2 | -0.19 / +0.44 | 0.52 / 2.78 | -0.39 | -0.83 | -0.63 [-1.36, +0.26] | 0.22 |
| `ifvg_5m` | NOISE | 77% | 41/31 | 25.0 / 28.6 | +0.23 / +0.89 | 1.89 / 5.00 | -0.28 | -1.39 | -0.67 [-1.64, +0.27] | 1.75 |
| `cisd` | HURTS* | 36% | 20/13 | 18.2 / 30.0 | -0.11 / +0.64 | 0.92 / 3.77 | -0.46 | -1.08 | -0.75 [-1.41, -0.09] | 0.8 |
| `pd_disc_week` | HURTS* | 57% | 32/21 | 18.9 / 35.0 | +0.05 / +0.81 | 1.34 / 4.06 | -0.57 | -0.90 | -0.76 [-1.50, -0.01] | 1.29 |
| `dow_wed` | HURTS* | 15% | 9/5 | 14.3 / 27.8 | -0.38 / +0.51 | 0.45 / 3.27 | -0.90 | -0.70 | -0.89 [-1.56, -0.09] | 0.34 |

#### Engine max 1/day, 2025-04-14..12-31 (holdout) (118 trades, 3.17/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `trend_5m_with` | HELPS* | 28% | 16/17 | 27.3 / 16.5 | +0.34 / -0.20 | 3.46 / 0.67 | +0.91 | +0.27 | +0.54 [+0.02, +1.06] | 0.89 |
| `vol_imb_5m` | NOISE | 23% | 19/8 | 33.3 / 15.4 | +0.35 / -0.16 | 2.74 / 0.80 | +0.49 | +0.27 | +0.51 [-0.07, +1.17] | 0.73 |
| `nwog_draw` | NOISE | 47% | 40/15 | 25.5 / 14.3 | +0.19 / -0.26 | 1.98 / 0.55 | +0.54 | -0.03 | +0.45 [+0.03, +0.88] | 1.48 |
| `ifvg_5m` | NOISE | 78% | 54/38 | 22.8 / 7.7 | +0.04 / -0.35 | 1.43 / 0.28 | +0.26 | +0.35 | +0.39 [-0.01, +0.75] | 2.47 |
| `adr_room` | HELPS | 85% | 58/42 | 21.0 / 11.1 | +0.01 / -0.37 | 1.28 / 0.30 | +0.49 | +0.14 | +0.38 [+0.03, +0.73] | 2.69 |
| `ndog_draw` | NOISE | 49% | 38/20 | 24.1 / 15.0 | +0.11 / -0.20 | 1.63 / 0.66 | +0.71 | -0.43 | +0.31 [-0.09, +0.72] | 1.56 |
| `erl_swept` | NOISE | 44% | 34/18 | 21.2 / 18.2 | +0.11 / -0.17 | 1.66 / 0.78 | +0.27 | +0.07 | +0.28 [-0.14, +0.72] | 1.4 |
| `gap_against` | NOISE | 26% | 21/10 | 29.0 / 16.1 | +0.15 / -0.12 | 1.88 / 0.84 | +0.45 | -0.29 | +0.27 [-0.21, +0.81] | 0.83 |
| `rejection_wick` | NOISE | 29% | 17/17 | 8.8 / 23.8 | -0.30 / +0.06 | 0.51 / 1.43 | -0.26 | -0.38 | -0.35 [-0.76, +0.06] | 0.91 |
| `dow_tue` | NOISE | 19% | 12/10 | 13.6 / 20.8 | -0.34 / +0.02 | 0.31 / 1.46 | -0.81 | +0.18 | -0.37 [-0.77, +0.06] | 0.59 |
| `below_rth_open` | NOISE | 61% | 41/31 | 13.9 / 28.3 | -0.19 / +0.18 | 0.73 / 2.25 | -0.31 | -0.52 | -0.38 [-0.81, +0.04] | 1.94 |
| `in_ob_5m` | HURTS | 12% | 7/7 | 7.1 / 21.2 | -0.41 / +0.00 | 0.01 / 1.29 | -0.51 | -0.25 | -0.41 [-0.74, -0.12] | 0.38 |
| `trend_day_against` | HURTS | 12% | 10/4 | 14.3 / 20.2 | -0.50 / +0.01 | 0.18 / 1.36 | -0.65 | -0.54 | -0.51 [-0.90, -0.14] | 0.38 |
| `cbdr_ext` | HURTS | 13% | 10/5 | 6.7 / 21.4 | -0.52 / +0.02 | 0.05 / 1.33 | -0.73 | -0.39 | -0.54 [-0.86, -0.20] | 0.4 |
| `news_day` | HURTS | 11% | 7/6 | 0.0 / 21.9 | -0.55 / +0.02 | 0.00 / 1.31 | -1.00 | -0.04 | -0.57 [-0.90, -0.26] | 0.35 |
| `cpi_nfp_day` | HURTS | 7% | 5/3 | 0.0 / 20.9 | -0.74 / +0.00 | 0.00 / 1.29 | -1.18 | -0.15 | -0.75 [-1.08, -0.39] | 0.22 |

#### Engine (grade off, conviction 0, max 2/day), 2026 (106 trades, 2.57/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `dow_fri` | HELPS* | 19% | 12/8 | 45.0 / 19.8 | +1.28 / +0.11 | 5.55 / 1.57 | +1.24 | +1.11 | +1.17 [+0.21, +2.23] | 0.49 |
| `near_eq_pdr` | NOISE | 8% | 5/3 | 37.5 / 23.5 | +1.25 / +0.26 | 6.28 / 1.94 | +1.68 | -0.02 | +0.99 [-0.57, +2.66] | 0.19 |
| `pd_disc_day` | NOISE | 60% | 37/27 | 26.6 / 21.4 | +0.54 / +0.02 | 3.71 / 1.17 | +0.72 | +0.20 | +0.52 [-0.11, +1.12] | 1.55 |
| `gap_against` | NOISE | 35% | 22/15 | 32.4 / 20.3 | +0.64 / +0.16 | 3.42 / 1.71 | +0.39 | +0.63 | +0.48 [-0.17, +1.20] | 0.9 |
| `nr4_prev` | NOISE | 21% | 9/13 | 27.3 / 23.8 | +0.68 / +0.24 | 4.16 / 1.83 | +0.39 | +0.13 | +0.45 [-0.38, +1.37] | 0.53 |
| `adr_room` | NOISE | 74% | 43/35 | 24.4 / 25.0 | +0.45 / +0.01 | 2.67 / 1.23 | +0.48 | +0.04 | +0.44 [-0.20, +1.04] | 1.89 |
| `below_mo` | NOISE | 57% | 35/26 | 26.2 / 22.2 | +0.52 / +0.08 | 3.54 / 1.36 | +0.74 | -0.07 | +0.43 [-0.21, +1.06] | 1.48 |
| `below_tso` | NOISE | 70% | 40/34 | 24.3 / 25.0 | +0.45 / +0.05 | 2.89 / 0.98 | -0.11 | +0.96 | +0.40 [-0.22, +0.98] | 1.8 |
| `vwap_1sd_inside` | NOISE | 53% | 29/27 | 17.9 / 32.0 | +0.08 / +0.61 | 1.31 / 4.33 | -0.36 | -1.16 | -0.54 [-1.16, +0.09] | 1.36 |
| `es_vwap_with` | NOISE | 32% | 21/13 | 20.6 / 26.4 | -0.04 / +0.51 | 0.98 / 3.29 | -0.70 | -0.22 | -0.55 [-1.15, +0.04] | 0.83 |
| `ifvg_5m` | NOISE | 78% | 47/36 | 24.1 / 26.1 | +0.21 / +0.77 | 1.81 / 4.07 | -0.20 | -1.41 | -0.56 [-1.47, +0.25] | 2.01 |
| `daily_bias_with` | NOISE | 33% | 22/13 | 17.1 / 28.2 | -0.06 / +0.52 | 0.91 / 3.19 | +0.05 | -1.41 | -0.58 [-1.15, +0.04] | 0.85 |
| `fvg_1h_leg` | HURTS | 13% | 11/3 | 7.1 / 27.2 | -0.26 / +0.42 | 0.14 / 2.61 | -0.14 | -1.58 | -0.68 [-1.19, -0.15] | 0.34 |
| `trend_15m_with` | NOISE | 10% | 8/3 | 18.2 / 25.3 | -0.31 / +0.41 | 0.47 / 2.56 | -0.50 | -0.77 | -0.72 [-1.38, +0.09] | 0.27 |
| `cisd` | HURTS* | 35% | 23/14 | 16.2 / 29.0 | -0.14 / +0.58 | 0.84 / 3.32 | -0.43 | -1.05 | -0.73 [-1.33, -0.15] | 0.9 |
| `dow_wed` | HURTS | 14% | 10/5 | 13.3 / 26.4 | -0.42 / +0.46 | 0.41 / 3.00 | -0.89 | -0.62 | -0.88 [-1.52, -0.11] | 0.36 |

#### Engine (grade off, conviction 0, max 2/day), 2025 (183 trades, 3.55/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `judas_rth` | HELPS* | 4% | 4/4 | 62.5 / 20.6 | +1.06 / -0.03 | 121.24 / 1.15 | +1.16 | +0.98 | +1.09 [+0.28, +1.94] | 0.16 |
| `asia_small` | HELPS | 94% | 73/100 | 23.1 / 10.0 | +0.05 / -0.52 | 1.41 / 0.26 | +0.25 | +0.77 | +0.57 [+0.12, +0.98] | 3.35 |
| `ifvg_5m` | HELPS | 78% | 63/79 | 26.8 / 7.3 | +0.14 / -0.41 | 1.71 / 0.18 | +0.61 | +0.48 | +0.56 [+0.27, +0.84] | 2.75 |
| `in_nwog` | NOISE | 7% | 7/5 | 41.7 / 21.1 | +0.43 / -0.01 | 2.90 / 1.20 | +0.79 | -0.15 | +0.44 [-0.25, +1.16] | 0.23 |
| `trend_5m_with` | HELPS* | 25% | 20/25 | 31.1 / 19.6 | +0.33 / -0.08 | 3.78 / 0.89 | +0.68 | +0.20 | +0.42 [+0.02, +0.83] | 0.87 |
| `vol_imb_5m` | NOISE | 21% | 21/17 | 31.6 / 20.0 | +0.33 / -0.06 | 1.95 / 1.15 | +0.22 | +0.47 | +0.39 [-0.09, +0.98] | 0.74 |
| `near_eq_pdr` | NOISE | 7% | 8/5 | 46.2 / 20.6 | +0.36 / -0.01 | 2.00 / 1.24 | +0.13 | +0.55 | +0.37 [-0.31, +1.13] | 0.25 |
| `in_macro` | NOISE | 28% | 20/31 | 27.5 / 20.5 | +0.28 / -0.08 | 2.34 / 0.99 | +0.80 | +0.10 | +0.36 [-0.07, +0.81] | 0.99 |
| `rejection_wick` | NOISE | 39% | 29/43 | 13.9 / 27.9 | -0.17 / +0.14 | 0.84 / 1.63 | -0.32 | -0.29 | -0.31 [-0.65, +0.01] | 1.4 |
| `pd_disc_week` | NOISE | 51% | 41/52 | 18.3 / 26.7 | -0.13 / +0.18 | 0.96 / 1.75 | -0.33 | -0.33 | -0.31 [-0.64, +0.02] | 1.8 |
| `open_in_value` | HURTS | 32% | 21/38 | 16.9 / 25.0 | -0.20 / +0.12 | 0.58 / 1.68 | -0.72 | -0.03 | -0.33 [-0.65, -0.01] | 1.14 |
| `below_rth_open` | NOISE | 63% | 48/68 | 19.0 / 28.4 | -0.10 / +0.23 | 0.89 / 2.54 | -0.34 | -0.31 | -0.33 [-0.69, +0.02] | 2.25 |
| `cbdr_ext` | NOISE | 15% | 11/16 | 14.8 / 23.7 | -0.30 / +0.07 | 0.39 / 1.49 | -0.06 | -0.59 | -0.38 [-0.75, +0.01] | 0.52 |
| `in_ob_5m` | HURTS | 9% | 4/12 | 6.2 / 24.0 | -0.43 / +0.06 | 0.00 / 1.41 | -0.60 | -0.37 | -0.49 [-0.76, -0.23] | 0.31 |
| `news_day` | HURTS | 10% | 6/13 | 5.3 / 24.4 | -0.50 / +0.08 | 0.02 / 1.45 | -0.57 | -0.52 | -0.57 [-0.84, -0.30] | 0.37 |
| `cpi_nfp_day` | HURTS | 7% | 4/8 | 8.3 / 23.4 | -0.60 / +0.06 | 0.02 / 1.42 | -0.62 | -0.63 | -0.66 [-0.97, -0.33] | 0.23 |

#### lab model silver_bullet (NQ, defaults), 2026 (94 trades, 2.28/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `in_mitig_5m` | HELPS* | 18% | 12/5 | 47.1 / 22.1 | +0.71 / -0.27 | 2.43 / 0.68 | +0.62 | +1.76 | +0.98 [+0.02, +2.03] | 0.41 |
| `trend_1h_with` | HELPS* | 47% | 29/15 | 36.4 / 18.0 | +0.27 / -0.41 | 1.49 / 0.52 | +0.79 | +0.49 | +0.69 [+0.03, +1.37] | 1.07 |
| `in_nwog` | NOISE | 11% | 7/3 | 40.0 / 25.0 | +0.46 / -0.16 | 1.68 / 0.83 | +0.70 | +0.36 | +0.61 [-0.55, +1.88] | 0.24 |
| `judas_mo` | NOISE | 46% | 30/13 | 34.9 / 19.6 | +0.22 / -0.36 | 1.50 / 0.55 | +0.38 | +0.91 | +0.58 [-0.08, +1.28] | 1.04 |
| `trend_15m_with` | NOISE | 53% | 32/18 | 34.0 / 18.2 | +0.17 / -0.40 | 1.31 / 0.55 | +0.88 | +0.02 | +0.57 [-0.06, +1.19] | 1.21 |
| `kz_ny_pm` | NOISE | 49% | 30/16 | 34.8 / 18.8 | +0.18 / -0.35 | 1.22 / 0.62 | +0.62 | +0.37 | +0.53 [-0.14, +1.19] | 1.12 |
| `dow_thu` | NOISE | 22% | 13/8 | 38.1 / 23.3 | +0.32 / -0.21 | 1.66 / 0.75 | +0.67 | +0.33 | +0.53 [-0.31, +1.44] | 0.51 |
| `trend_day_with` | NOISE | 20% | 14/5 | 36.8 / 24.0 | +0.28 / -0.19 | 1.58 / 0.78 | +0.93 | -0.83 | +0.47 [-0.39, +1.39] | 0.46 |
| `kz_ny_am` | NOISE | 51% | 32/16 | 18.8 / 34.8 | -0.35 / +0.18 | 0.62 / 1.22 | -0.62 | -0.37 | -0.53 [-1.21, +0.13] | 1.17 |
| `pd_disc_h1` | NOISE | 49% | 30/16 | 17.4 / 35.4 | -0.37 / +0.17 | 0.57 / 1.34 | -0.80 | -0.04 | -0.55 [-1.18, +0.13] | 1.12 |
| `below_rth_open` | NOISE | 52% | 33/16 | 18.4 / 35.6 | -0.37 / +0.21 | 0.56 / 1.42 | -0.80 | -0.21 | -0.59 [-1.26, +0.08] | 1.19 |
| `es_confirms` | NOISE | 16% | 10/5 | 13.3 / 29.1 | -0.61 / +0.01 | 0.31 / 1.04 | -0.92 | -0.01 | -0.62 [-1.23, +0.09] | 0.36 |
| `asia_ext` | NOISE | 17% | 12/4 | 12.5 / 29.5 | -0.63 / +0.02 | 0.33 / 1.06 | -1.00 | +0.16 | -0.65 [-1.28, +0.07] | 0.39 |
| `smt_es` | NOISE | 10% | 3/6 | 11.1 / 28.2 | -0.69 / -0.03 | 0.27 / 0.99 | -1.11 | -0.25 | -0.66 [-1.29, +0.12] | 0.22 |
| `news_day` | NOISE | 13% | 9/3 | 8.3 / 29.3 | -0.73 / +0.00 | 0.24 / 1.02 | -1.22 | +0.50 | -0.73 [-1.30, -0.00] | 0.29 |
| `ifvg_5m` | HURTS* | 67% | 41/22 | 19.0 / 41.9 | -0.38 / +0.48 | 0.56 / 1.85 | -0.49 | -1.56 | -0.86 [-1.61, -0.12] | 1.53 |

#### lab model ict2022 (NQ, defaults), 2026 (54 trades, 1.31/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `rejection_wick` | NOISE | 28% | 9/6 | 53.3 / 38.5 | +0.25 / -0.22 | 1.42 / 0.58 | +0.64 | +0.35 | +0.46 [-0.19, +1.12] | 0.36 |
| `trend_5m_with` | NOISE | 78% | 29/13 | 45.2 / 33.3 | +0.01 / -0.43 | 0.94 / 0.33 | +0.17 | +0.67 | +0.43 [-0.22, +1.01] | 1.02 |
| `vwap_eth_with` | NOISE | 37% | 14/6 | 55.0 / 35.3 | +0.17 / -0.24 | 1.31 / 0.59 | +0.41 | +0.28 | +0.40 [-0.17, +0.94] | 0.49 |
| `gap_with` | NOISE | 33% | 10/8 | 55.6 / 36.1 | +0.18 / -0.22 | 1.45 / 0.55 | +0.60 | +0.42 | +0.40 [-0.19, +1.00] | 0.44 |
| `choch_5m` | NOISE | 61% | 24/9 | 48.5 / 33.3 | +0.07 / -0.33 | 1.01 / 0.43 | +0.43 | +0.07 | +0.40 [-0.17, +0.95] | 0.8 |
| `mss_disp` | NOISE | 72% | 30/9 | 46.2 / 33.3 | +0.02 / -0.36 | 0.95 / 0.44 | +0.21 | +0.08 | +0.38 [-0.23, +0.92] | 0.95 |
| `trend_1h_with` | NOISE | 44% | 17/7 | 50.0 / 36.7 | +0.12 / -0.26 | 1.16 / 0.51 | +0.59 | -0.21 | +0.38 [-0.19, +0.97] | 0.58 |
| `judas_rth` | NOISE | 22% | 7/5 | 58.3 / 38.1 | +0.15 / -0.16 | 1.42 / 0.67 | +0.34 | +0.45 | +0.31 [-0.33, +0.88] | 0.29 |
| `below_0830` | NOISE | 52% | 18/10 | 32.1 / 53.8 | -0.33 / +0.17 | 0.44 / 1.42 | -0.34 | -0.71 | -0.49 [-1.01, +0.03] | 0.68 |
| `asia_ext` | NOISE | 17% | 6/3 | 11.1 / 48.9 | -0.51 / -0.00 | 0.29 / 0.90 | -1.02 | +0.52 | -0.51 [-1.08, +0.22] | 0.22 |
| `in_breaker_5m` | NOISE | 24% | 7/6 | 23.1 / 48.8 | -0.49 / +0.04 | 0.35 / 1.00 | -0.96 | +0.34 | -0.53 [-1.09, +0.12] | 0.32 |
| `pd_disc_h1` | NOISE | 65% | 22/13 | 34.3 / 57.9 | -0.29 / +0.29 | 0.52 / 1.64 | -0.41 | -0.75 | -0.58 [-1.13, +0.02] | 0.85 |
| `below_tso` | HURTS* | 59% | 21/11 | 31.2 / 59.1 | -0.33 / +0.26 | 0.49 / 1.70 | -0.42 | -0.86 | -0.58 [-1.10, -0.05] | 0.78 |
| `pd_disc_pdr` | HURTS* | 35% | 13/6 | 26.3 / 51.4 | -0.48 / +0.12 | 0.33 / 1.13 | -0.90 | -0.03 | -0.60 [-1.13, -0.08] | 0.46 |
| `below_mo` | HURTS* | 57% | 19/12 | 29.0 / 60.9 | -0.38 / +0.30 | 0.41 / 1.83 | -0.57 | -0.70 | -0.68 [-1.18, -0.15] | 0.75 |
| `asia_small` | HURTS* | 78% | 28/14 | 31.0 / 83.3 | -0.33 / +0.74 | 0.45 / 5.15 | -0.99 | -1.22 | -1.06 [-1.65, -0.46] | 1.02 |

#### lab model mech_ifvg (NQ, defaults), 2026 (80 trades, 1.94/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `in_sb_hour` | HELPS* | 79% | 40/23 | 33.3 / 17.6 | -0.02 / -0.59 | 1.06 / 0.28 | +0.38 | +1.09 | +0.57 [+0.04, +1.04] | 1.53 |
| `open_out_value_with` | NOISE | 35% | 15/13 | 35.7 / 26.9 | +0.15 / -0.29 | 1.51 / 0.59 | +0.44 | +0.43 | +0.44 [-0.14, +1.05] | 0.68 |
| `pd_disc_week` | NOISE | 59% | 33/14 | 31.9 / 27.3 | +0.03 / -0.37 | 1.15 / 0.41 | -0.01 | +1.19 | +0.40 [-0.07, +0.91] | 1.14 |
| `asia_small` | NOISE | 80% | 41/23 | 35.9 / 6.2 | -0.06 / -0.43 | 0.97 / 0.34 | +0.70 | -0.55 | +0.37 [-0.28, +0.89] | 1.55 |
| `es_trend_with` | NOISE | 31% | 18/7 | 40.0 / 25.5 | +0.10 / -0.24 | 1.35 / 0.66 | +0.16 | +0.80 | +0.34 [-0.27, +0.96] | 0.61 |
| `smt_es` | NOISE | 25% | 11/9 | 40.0 / 26.7 | +0.11 / -0.22 | 1.36 / 0.69 | +0.28 | +0.39 | +0.33 [-0.29, +1.02] | 0.49 |
| `gap_with` | NOISE | 42% | 20/14 | 35.3 / 26.1 | +0.05 / -0.27 | 1.21 / 0.62 | +0.30 | +0.33 | +0.32 [-0.19, +0.87] | 0.83 |
| `ndog_draw` | NOISE | 61% | 32/17 | 32.7 / 25.8 | -0.03 / -0.30 | 1.07 / 0.51 | +0.25 | +0.29 | +0.27 [-0.25, +0.79] | 1.19 |
| `in_pw_range` | NOISE | 57% | 33/13 | 26.1 / 35.3 | -0.31 / +0.10 | 0.56 / 1.28 | -0.02 | -1.11 | -0.41 [-0.94, +0.16] | 1.12 |
| `daily_bias_with` | NOISE | 31% | 15/10 | 24.0 / 32.7 | -0.43 / -0.00 | 0.36 / 1.07 | -0.36 | -0.57 | -0.43 [-0.92, +0.06] | 0.61 |
| `es_confirms` | NOISE | 70% | 41/15 | 23.2 / 45.8 | -0.28 / +0.19 | 0.62 / 1.57 | -0.40 | -0.57 | -0.47 [-1.06, +0.10] | 1.36 |
| `first_hour_rth` | HURTS* | 56% | 30/15 | 22.2 / 40.0 | -0.38 / +0.18 | 0.47 / 1.54 | -0.52 | -0.63 | -0.56 [-1.11, -0.03] | 1.09 |
| `qt_ny_q3` | HURTS* | 56% | 30/15 | 22.2 / 40.0 | -0.38 / +0.18 | 0.47 / 1.54 | -0.52 | -0.63 | -0.56 [-1.11, -0.03] | 1.09 |
| `at_hvn` | HURTS* | 26% | 14/7 | 19.0 / 33.9 | -0.55 / +0.01 | 0.26 / 1.08 | -0.36 | -0.95 | -0.56 [-1.01, -0.07] | 0.51 |
| `qt_micro_23` | HURTS* | 40% | 22/10 | 18.8 / 37.5 | -0.51 / +0.11 | 0.26 / 1.35 | -0.27 | -1.35 | -0.62 [-1.08, -0.17] | 0.78 |
| `fvg_1h_leg` | HURTS* | 10% | 5/3 | 0.0 / 33.3 | -0.98 / -0.04 | 0.00 / 0.99 | -0.94 | -0.96 | -0.94 [-1.21, -0.65] | 0.19 |

#### lab model continuation (NQ, defaults), 2026 (20 trades, 0.49/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `rejection_wick` | NOISE | 55% | 6/5 | 54.5 / 33.3 | +0.18 / +0.01 | 1.36 / 1.07 | +1.27 | -1.65 | +0.17 [-0.87, +1.17] | 0.27 |
| `qt_micro_23` | NOISE | 55% | 8/3 | 45.5 / 44.4 | +0.17 / +0.03 | 1.44 / 1.07 | +1.11 | -1.03 | +0.14 [-1.03, +1.08] | 0.27 |
| `liq_void_draw` | NOISE | 45% | 6/3 | 44.4 / 45.5 | +0.15 / +0.06 | 1.26 / 1.16 | +0.13 | +0.11 | +0.09 [-0.95, +1.15] | 0.22 |
| `pd_disc_week` | NOISE | 55% | 7/4 | 45.5 / 44.4 | +0.13 / +0.07 | 1.19 / 1.29 | +0.18 | -0.08 | +0.06 [-0.91, +1.10] | 0.27 |
| `below_rth_open` | NOISE | 50% | 5/5 | 30.0 / 60.0 | +0.11 / +0.09 | 1.18 / 1.30 | +0.43 | -0.74 | +0.02 [-0.94, +1.16] | 0.24 |
| `below_tso` | NOISE | 50% | 7/3 | 50.0 / 40.0 | +0.06 / +0.15 | 1.02 / 1.57 | +0.43 | -0.79 | -0.09 [-1.12, +0.86] | 0.24 |
| `adr_room` | NOISE | 55% | 8/3 | 45.5 / 44.4 | -0.01 / +0.24 | 0.94 / 1.76 | -0.42 | +0.10 | -0.25 [-1.26, +0.78] | 0.27 |
| `pd_disc_day` | NOISE | 45% | 6/3 | 33.3 / 54.5 | -0.06 / +0.24 | 0.85 / 1.92 | -0.52 | +0.10 | -0.30 [-1.28, +0.82] | 0.22 |
| `nwog_draw` | NOISE | 45% | 6/3 | 44.4 / 45.5 | -0.07 / +0.24 | 0.89 / 1.77 | -0.53 | +0.11 | -0.31 [-1.30, +0.74] | 0.22 |
| `ib_break_with` | NOISE | 55% | 8/3 | 45.5 / 44.4 | -0.07 / +0.32 | 0.75 / 1.66 | -0.27 | -0.49 | -0.40 [-1.52, +0.68] | 0.27 |
| `adr_exhausted` | NOISE | 40% | 5/3 | 25.0 / 58.3 | -0.13 / +0.26 | 0.76 / 1.66 | +0.03 | -1.03 | -0.40 [-1.43, +0.62] | 0.19 |
| `nq_rs_with` | NOISE | 60% | 9/3 | 50.0 / 37.5 | -0.09 / +0.39 | 0.75 / 2.05 | -1.04 | +0.26 | -0.47 [-1.62, +0.59] | 0.29 |
| `below_week_open` | NOISE | 50% | 7/3 | 40.0 / 50.0 | -0.16 / +0.37 | 0.79 / 2.24 | -0.90 | +0.11 | -0.53 [-1.44, +0.50] | 0.24 |

#### lab model session_po3 (NQ, defaults), 2026 [extra] (16 trades, 0.39/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|

#### lab model silver_bullet (NQ, defaults), 2025-04-14..12-31 (92 trades, 2.47/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `gap_big` | HELPS* | 46% | 17/25 | 42.9 / 20.0 | +0.40 / -0.44 | 1.85 / 0.47 | +0.96 | +0.74 | +0.84 [+0.22, +1.48] | 1.13 |
| `first_hour_rth` | NOISE | 16% | 10/5 | 46.7 / 27.3 | +0.64 / -0.19 | 2.57 / 0.74 | +0.86 | +0.89 | +0.83 [-0.10, +1.85] | 0.4 |
| `qt_ny_q3` | NOISE | 16% | 10/5 | 46.7 / 27.3 | +0.64 / -0.19 | 2.57 / 0.74 | +0.86 | +0.89 | +0.83 [-0.10, +1.85] | 0.4 |
| `dow_mon` | NOISE | 24% | 11/11 | 40.9 / 27.1 | +0.48 / -0.22 | 1.89 / 0.69 | +0.29 | +1.11 | +0.70 [-0.09, +1.60] | 0.59 |
| `open_out_value_with` | NOISE | 18% | 13/4 | 47.1 / 26.7 | +0.43 / -0.17 | 1.79 / 0.79 | +0.37 | +1.46 | +0.60 [-0.27, +1.52] | 0.46 |
| `in_or` | NOISE | 39% | 14/22 | 38.9 / 25.0 | +0.30 / -0.29 | 1.61 / 0.60 | +1.00 | +0.24 | +0.59 [-0.11, +1.28] | 0.97 |
| `vwap_1sd_inside` | NOISE | 40% | 16/21 | 37.8 / 25.5 | +0.25 / -0.26 | 1.49 / 0.62 | +0.50 | +0.52 | +0.51 [-0.16, +1.22] | 0.99 |
| `vol_imb_5m` | NOISE | 53% | 27/22 | 34.7 / 25.6 | +0.18 / -0.32 | 1.33 / 0.56 | +0.43 | +0.60 | +0.50 [-0.08, +1.12] | 1.32 |
| `trend_day_against` | NOISE | 15% | 4/10 | 21.4 / 32.1 | -0.43 / +0.01 | 0.37 / 1.04 | -0.22 | -0.60 | -0.44 [-1.04, +0.20] | 0.38 |
| `orb_with` | NOISE | 45% | 24/17 | 24.4 / 35.3 | -0.31 / +0.15 | 0.58 / 1.28 | -0.96 | +0.10 | -0.45 [-1.10, +0.18] | 1.1 |
| `poc_side_with` | NOISE | 50% | 26/20 | 21.7 / 39.1 | -0.29 / +0.18 | 0.63 / 1.33 | -1.13 | +0.19 | -0.48 [-1.10, +0.17] | 1.24 |
| `dow_tue` | NOISE | 18% | 7/10 | 17.6 / 33.3 | -0.47 / +0.04 | 0.49 / 1.07 | -0.08 | -0.85 | -0.51 [-1.17, +0.26] | 0.46 |
| `es_trend_with` | NOISE | 55% | 28/23 | 23.5 / 39.0 | -0.31 / +0.26 | 0.58 / 1.49 | -1.14 | -0.01 | -0.56 [-1.25, +0.08] | 1.37 |
| `es_vwap_with` | NOISE | 67% | 30/32 | 25.8 / 40.0 | -0.25 / +0.35 | 0.65 / 1.70 | -1.05 | -0.15 | -0.61 [-1.36, +0.10] | 1.67 |
| `ib_break_with` | HURTS* | 40% | 20/17 | 18.9 / 38.2 | -0.44 / +0.20 | 0.45 / 1.36 | -0.65 | -0.62 | -0.64 [-1.24, +0.00] | 0.99 |
| `open_in_value` | HURTS* | 34% | 15/16 | 12.9 / 39.3 | -0.66 / +0.25 | 0.24 / 1.47 | -1.04 | -0.78 | -0.90 [-1.46, -0.33] | 0.83 |

#### lab model ict2022 (NQ, defaults), 2025-04-14..12-31 (43 trades, 1.16/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `kz_ny_pm` | HELPS* | 30% | 8/5 | 69.2 / 33.3 | +0.42 / -0.36 | 2.72 / 0.45 | +0.76 | +0.85 | +0.77 [+0.11, +1.44] | 0.35 |
| `in_sb_hour` | NOISE | 35% | 7/8 | 53.3 / 39.3 | +0.19 / -0.29 | 1.61 / 0.51 | +0.78 | +0.02 | +0.48 [-0.17, +1.24] | 0.4 |
| `open_out_value_with` | NOISE | 33% | 10/4 | 50.0 / 41.4 | +0.17 / -0.27 | 1.29 / 0.57 | +0.16 | +1.25 | +0.43 [-0.31, +1.19] | 0.38 |
| `vwap_eth_with` | NOISE | 46% | 9/11 | 55.0 / 34.8 | +0.09 / -0.30 | 1.25 / 0.54 | +0.37 | +0.23 | +0.39 [-0.23, +1.00] | 0.54 |
| `pd_disc_week` | NOISE | 30% | 8/5 | 61.5 / 36.7 | +0.14 / -0.24 | 1.29 / 0.64 | +0.72 | -0.07 | +0.38 [-0.29, +1.05] | 0.35 |
| `poc_side_with` | NOISE | 58% | 13/12 | 52.0 / 33.3 | +0.03 / -0.34 | 1.04 / 0.53 | +0.26 | +0.42 | +0.38 [-0.30, +1.03] | 0.67 |
| `in_bpr_5m` | NOISE | 28% | 7/5 | 58.3 / 38.7 | +0.13 / -0.22 | 1.20 / 0.65 | +0.70 | -0.15 | +0.34 [-0.38, +1.10] | 0.32 |
| `in_or` | NOISE | 28% | 8/4 | 50.0 / 41.9 | +0.12 / -0.22 | 1.31 / 0.62 | +1.06 | -0.77 | +0.34 [-0.43, +1.14] | 0.32 |
| `at_hvn` | HURTS* | 35% | 7/8 | 26.7 / 53.6 | -0.50 / +0.08 | 0.32 / 1.17 | -0.63 | -0.73 | -0.58 [-1.17, +0.09] | 0.4 |
| `po3_daily` | NOISE | 70% | 18/12 | 36.7 / 61.5 | -0.32 / +0.32 | 0.52 / 1.76 | -0.35 | -0.94 | -0.64 [-1.36, +0.14] | 0.81 |
| `choch_5m` | HURTS* | 44% | 10/9 | 31.6 / 54.2 | -0.53 / +0.20 | 0.25 / 1.47 | -0.38 | -1.29 | -0.72 [-1.29, -0.11] | 0.51 |
| `dow_wed` | HURTS* | 26% | 7/4 | 18.2 / 53.1 | -0.66 / +0.06 | 0.22 / 1.10 | -1.02 | -0.17 | -0.72 [-1.28, -0.06] | 0.3 |
| `kz_ny_am` | HURTS* | 70% | 17/13 | 33.3 / 69.2 | -0.36 / +0.42 | 0.45 / 2.72 | -0.76 | -0.85 | -0.77 [-1.44, -0.12] | 0.81 |
| `below_tso` | HURTS* | 65% | 20/8 | 32.1 / 66.7 | -0.40 / +0.39 | 0.43 / 2.29 | -0.48 | -0.95 | -0.79 [-1.48, -0.10] | 0.75 |
| `in_ob_5m` | HURTS* | 23% | 5/5 | 10.0 / 54.5 | -0.73 / +0.06 | 0.24 / 1.13 | -0.93 | -0.75 | -0.79 [-1.35, -0.05] | 0.27 |
| `inducement` | HURTS* | 70% | 19/11 | 33.3 / 69.2 | -0.40 / +0.51 | 0.41 / 2.68 | -0.97 | -0.73 | -0.90 [-1.61, -0.18] | 0.81 |

#### lab model mech_ifvg (NQ, defaults), 2025-04-14..12-31 (77 trades, 2.07/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `trend_1h_with` | HELPS* | 23% | 8/10 | 66.7 / 20.3 | +0.71 / -0.38 | 7.79 / 0.42 | +1.04 | +1.11 | +1.09 [+0.62, +1.57] | 0.48 |
| `po3_daily` | HELPS* | 77% | 27/32 | 37.3 / 11.1 | -0.01 / -0.50 | 0.97 / 0.14 | +0.48 | +0.47 | +0.49 [+0.07, +0.92] | 1.59 |
| `dow_fri` | NOISE | 25% | 10/9 | 42.1 / 27.6 | +0.23 / -0.24 | 1.52 / 0.55 | +0.14 | +0.83 | +0.47 [-0.16, +1.12] | 0.51 |
| `asia_small` | NOISE | 90% | 33/36 | 31.9 / 25.0 | -0.08 / -0.49 | 0.81 / 0.38 | +0.93 | -0.47 | +0.41 [-0.30, +1.03] | 1.85 |
| `daily_bias_with` | NOISE | 40% | 15/16 | 45.2 / 21.7 | +0.10 / -0.28 | 1.16 / 0.50 | +0.34 | +0.40 | +0.37 [-0.14, +0.86] | 0.83 |
| `atr_expanding` | NOISE | 23% | 5/13 | 38.9 / 28.8 | +0.14 / -0.21 | 1.16 / 0.66 | -0.47 | +0.71 | +0.35 [-0.23, +0.88] | 0.48 |
| `judas_rth` | NOISE | 18% | 10/4 | 50.0 / 27.0 | +0.15 / -0.19 | 1.49 / 0.64 | +0.46 | +0.28 | +0.34 [-0.23, +0.87] | 0.38 |
| `ifvg_5m` | NOISE | 43% | 17/16 | 39.4 / 25.0 | +0.05 / -0.26 | 1.07 / 0.59 | +0.56 | +0.07 | +0.31 [-0.17, +0.76] | 0.89 |
| `gap_big` | NOISE | 38% | 10/19 | 24.1 / 35.4 | -0.36 / +0.02 | 0.46 / 1.00 | -0.54 | -0.37 | -0.38 [-0.85, +0.06] | 0.78 |
| `es_trend_with` | NOISE | 25% | 11/8 | 21.1 / 34.5 | -0.42 / -0.03 | 0.33 / 0.91 | -0.34 | -0.41 | -0.39 [-0.84, +0.09] | 0.51 |
| `open_out_value_with` | NOISE | 26% | 10/10 | 15.0 / 36.8 | -0.43 / -0.02 | 0.31 / 0.92 | -0.10 | -0.71 | -0.41 [-0.87, +0.04] | 0.54 |
| `vol_imb_5m` | NOISE | 20% | 11/4 | 13.3 / 35.5 | -0.46 / -0.04 | 0.25 / 0.90 | -0.61 | +0.11 | -0.41 [-0.86, +0.07] | 0.4 |
| `poc_side_with` | HURTS* | 25% | 11/8 | 15.8 / 36.2 | -0.50 / -0.00 | 0.24 / 0.96 | -0.47 | -0.51 | -0.50 [-0.93, -0.04] | 0.51 |
| `rejection_wick` | HURTS* | 40% | 12/19 | 19.4 / 39.1 | -0.43 / +0.08 | 0.34 / 1.15 | -0.34 | -0.74 | -0.51 [-0.95, -0.05] | 0.83 |
| `below_tso` | HURTS* | 78% | 29/31 | 23.3 / 58.8 | -0.28 / +0.44 | 0.55 / 2.23 | -0.89 | -0.57 | -0.72 [-1.28, -0.18] | 1.61 |
| `liq_void_draw` | HURTS* | 86% | 30/36 | 25.8 / 63.6 | -0.24 / +0.54 | 0.58 / 6.52 | -0.71 | -1.17 | -0.78 [-1.27, -0.29] | 1.77 |

#### lab model continuation (NQ, defaults), 2025-04-14..12-31 (11 trades, 0.3/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|

#### lab model session_po3 (NQ, defaults), 2025-04-14..12-31 [extra] (41 trades, 1.1/wk)

| confluence | label | freq | n with (dev/conf) | win % w / wo | avg R w / wo | PF w / wo | diff dev | diff conf | diff full [95% CI] | kept /wk |
|---|---|---:|---|---|---|---|---:|---:|---|---:|
| `below_week_open` | HELPS* | 80% | 24/9 | 54.5 / 12.5 | +0.46 / -0.81 | 2.01 / 0.10 | +1.14 | +1.50 | +1.28 [+0.64, +1.87] | 0.89 |
| `nwog_draw` | HELPS* | 71% | 21/8 | 58.6 / 16.7 | +0.56 / -0.64 | 2.39 / 0.23 | +0.97 | +1.68 | +1.20 [+0.43, +1.92] | 0.78 |
| `in_prior_value` | NOISE | 32% | 9/4 | 69.2 / 35.7 | +0.73 / -0.03 | 3.38 / 0.96 | +1.08 | -0.00 | +0.75 [-0.15, +1.59] | 0.35 |
| `wk_profile_early` | NOISE | 34% | 11/3 | 57.1 / 40.7 | +0.64 / -0.01 | 2.58 / 0.95 | +0.47 | +1.16 | +0.65 [-0.33, +1.53] | 0.38 |
| `at_hvn` | NOISE | 29% | 8/4 | 58.3 / 41.4 | +0.61 / +0.05 | 2.34 / 1.10 | +0.57 | +0.57 | +0.56 [-0.40, +1.49] | 0.32 |
| `pd_disc_pdr` | NOISE | 66% | 19/8 | 51.9 / 35.7 | +0.40 / -0.14 | 1.81 / 0.77 | +0.53 | +0.56 | +0.54 [-0.32, +1.37] | 0.73 |
| `in_macro` | NOISE | 34% | 10/4 | 57.1 / 40.7 | +0.53 / +0.05 | 2.22 / 1.06 | +0.68 | -0.00 | +0.49 [-0.42, +1.35] | 0.38 |
| `es_trend_with` | NOISE | 29% | 9/3 | 58.3 / 41.4 | +0.50 / +0.09 | 2.00 / 1.18 | +0.60 | -0.16 | +0.41 [-0.49, +1.30] | 0.32 |
| `gap_with` | NOISE | 37% | 11/4 | 33.3 / 53.8 | -0.03 / +0.35 | 0.90 / 1.78 | +0.12 | -1.69 | -0.38 [-1.25, +0.55] | 0.4 |
| `inducement` | NOISE | 63% | 20/6 | 38.5 / 60.0 | +0.05 / +0.49 | 1.10 / 2.06 | -0.60 | -0.25 | -0.44 [-1.29, +0.42] | 0.7 |
| `poc_side_with` | NOISE | 39% | 11/5 | 31.2 / 56.0 | -0.09 / +0.41 | 0.80 / 1.97 | -0.32 | -0.89 | -0.50 [-1.35, +0.40] | 0.43 |
| `first_hour_rth` | NOISE | 61% | 17/8 | 40.0 / 56.2 | +0.01 / +0.53 | 0.98 / 2.21 | -0.49 | -0.57 | -0.52 [-1.35, +0.31] | 0.67 |
| `qt_ny_q3` | NOISE | 61% | 17/8 | 40.0 / 56.2 | +0.01 / +0.53 | 0.98 / 2.21 | -0.49 | -0.57 | -0.52 [-1.35, +0.31] | 0.67 |
| `ifvg_5m` | NOISE | 37% | 10/5 | 33.3 / 53.8 | -0.12 / +0.41 | 0.74 / 1.94 | -0.35 | -0.90 | -0.53 [-1.37, +0.37] | 0.4 |
| `rejection_wick` | NOISE | 34% | 9/5 | 28.6 / 55.6 | -0.17 / +0.41 | 0.74 / 1.89 | +0.06 | -1.93 | -0.58 [-1.42, +0.36] | 0.38 |
| `at_lvn` | NOISE | 29% | 9/3 | 25.0 / 55.2 | -0.33 / +0.44 | 0.61 / 1.88 | -0.52 | -1.50 | -0.77 [-1.62, +0.12] | 0.32 |
