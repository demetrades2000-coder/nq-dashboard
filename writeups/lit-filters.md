## In one minute

- **Question:** which filters and confluences make the LIT strategy (`lit_A`) better on 2026?
- **How it was judged (overfitting guard):** every setting was chosen on **2026 H1** (Jan 2 to Jun 30) and checked on **2026 H2**
  (Jul 1 to Oct 16). 2021-25 is shown as a reference line only, never as a gate. Same size rule and costs as `lit_A`: $800 risk
  up to a 20-pt stop, then 800×20/stop, MNQ $2/pt, max 40 micros, $1.40/micro round trip, 1 tick slippage.
- **The problem:** `lit_A` loses in H1 2026 (PF 0.70, −$4,420) and wins big in H2 (PF 2.63, +$9,679). Most filters only move H2.
- **What clearly helped (better PF in both halves, every neighbouring setting also better):**
  1. **NWOG discount side** (ICT/LIT premium-discount on the New Week Opening Gap): longs only below the midpoint of this week's
     gap (Friday 17:00 close to Sunday 18:00 open), shorts only above it. H1 PF 0.70 → 1.24, H2 2.63 → 2.96.
  2. **High/low-of-week window as size** (owner rule: size, not skip): full size Tuesday 03:00 to Wednesday 11:30 ET, half size
     outside. H1 PF 0.70 → 0.85, H2 2.63 → 3.14, and it halves the 2021-25 drawdown (−$20.9k → −$11.2k).
  3. Together (**`lit_filters_na_how`**): 2026 PF **2.13**, **+$9,938** ($1,013/month), max DD **−$3,371**, positive in both halves
     (H1 PF 1.52 +$3,441, H2 PF 4.00 +$6,498).
- **What did not hold:** displacement size, body share, FVG left by the displacement, sweep depth, PVSRA vectors (as filter, size
  or obstacle), the VIX move (sweep distance, room to target, VIX level), SMT with ES (divergence or confirmation), NDOG, news days
  and news guard, volatility regime (previous-day range, 5-day vs 60-day range, VIX level). Each moved H1 or H2, never both,
  or cut trades below 2 a week.
- **Caveats:** 2.0 trades a week is the owner's floor (H2 1.99/wk, 62% of weeks with 2+). The NWOG filter has **no edge in 2021-25**
  (PF 1.01 alone, 1.06 with the window): it is a 2026 effect so far. The sample is small (52 + 31 trades). Weekday rules (Tuesday /
  Thursday half size) also held in both halves but are calendar rules with 7-14 trades per bucket, so they are listed, not proposed.

## The best two (exact parameters)

Both are `lit_A` (every LIT setup 02:00-15:30 ET, displacement body ≥ 1 ATR, sweep ≥ 0.5 ATR through the level, limit entry on the
retest of the broken swing, valid 12 bars, stop 2 pts beyond the protected low/high, 8-80 pts, target = nearest PDH/PDL, PWH/PWL,
PMH/PML ≥ 1.5R away banked at 5R, breakeven at 1R, flat 15:55, 1 trade a day) plus:

**1. `lit_filters_na_how`**: `{"nwog_side": -1, "how_size": 0.5}`
- Skip a setup whose entry is on the premium side of this week's NWOG midpoint (long above it, short below). Weeks without a gap
  trade normally. A skipped setup frees the day for a later setup.
- Micros × 0.5 (rounded down, at least 1) when the sweep extreme is outside Tue 03:00 → Wed 11:30 ET.

**2. `lit_filters_na_how_d09`**: `{"nwog_side": -1, "how_size": 0.5, "disp": 0.9}`: the same with displacement ≥ 0.9 ATR, for more
trades (2.23/wk, both halves above 2/wk) and the best 2021-25 reference of the NWOG family.

| Run | Span | Trades | /wk | % wks 2+ | Win % | PF | Net $ | $/mo | Max DD | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate | Median sessions to pass |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lit_A | 2026 H1 | 75 | 2.93 | – | – | 0.70 | −4,420 | – | – | – | – | – | – |
| lit_A | 2026 H2 | 48 | 3.08 | – | – | 2.63 | +9,679 | – | – | – | – | – | – |
| lit_A | 2026 | 123 | 2.99 | 83% | 22.0% | 1.26 | +5,258 | 536 | −6,883 | 10.2 / 8.7 | 21.4 / 32.5 | 43.0% (MC) | – |
| lit_A | 2021-25 ref | 877 | 4.09 | 98% | 17.4% | 1.15 | +31,469 | 616 | −20,948 | 19.0 / 35.1 | 27.6 / 57.5 | 36.0% (MC) | – |
| **na_how** | 2026 H1 | 52 | 2.03 | 59% | 19.2% | 1.52 | +3,441 | 564 | −3,371 | 7.8 / 0.0 | 10.9 / 0.0 | 43.2% | 24 |
| **na_how** | 2026 H2 | 31 | 1.99 | 69% | 35.5% | 4.00 | +6,498 | 1,749 | −551 | 6.4 / 0.0 | 26.9 / 0.0 | 100% | 23 |
| **na_how** | **2026** | 83 | 2.01 | 62% | 25.3% | **2.13** | **+9,938** | **1,013** | **−3,371** | 7.3 / 0.0 | 17.0 / 0.0 | 73.9% | 29 |
| na_how | 2021-25 ref | 700 | 3.26 | 89% | 16.4% | 1.06 | +6,239 | 122 | −10,785 | 7.5 / 11.8 | 16.0 / 34.2 | 31.8% | 19 |
| **na_how_d09** | 2026 H1 | 57 | 2.23 | 63% | 17.5% | 1.39 | +2,830 | 464 | −3,920 | 7.8 / 0.0 | 10.9 / 3.1 | 36.4% | 24 |
| **na_how_d09** | 2026 H2 | 35 | 2.24 | 75% | 31.4% | 3.24 | +5,987 | 1,612 | −695 | 6.4 / 0.0 | 26.9 / 0.0 | 100% | 20 |
| **na_how_d09** | **2026** | 92 | 2.23 | 67% | 22.8% | **1.89** | **+8,817** | **899** | **−3,920** | 7.3 / 0.0 | 17.0 / 1.9 | 65.6% | 28 |
| na_how_d09 | 2021-25 ref | 749 | 3.49 | 92% | 16.8% | 1.13 | +14,621 | 286 | −7,804 | 8.3 / 11.4 | 17.4 / 34.6 | 33.6% | 18 |

Pass rate = passed / (passed + failed) of MFFU Builder 50K evals started on every session (up to 60 sessions; the H1/H2 rows only
see their own half, so they are optimistic at the end of each half). lit_A's pass rate is the earlier Monte Carlo figure.

**Checks on `lit_filters_na_how`:**
- +2 ticks of extra slippage: 2026 PF 2.08, +$9,734 (H1 1.49, H2 3.92).
- Months 2026: Jan −1,681 · Feb +3,907 · Mar +2,867 · Apr −1,414 · May −1,379 · Jun +1,140 · Jul +485 · Aug +2,630 · Sep +1,710 · Oct +1,673.
  Three losing months, none worse than −$1.7k.
- Longs 25 trades PF 1.45 +$1,444; shorts 58 trades PF 2.51 +$8,495 (2026 leaned short-side; the NWOG rule mostly removes premium longs).
- Neighbours (all positive in both halves): window size 0.25 → 2026 PF 2.37 +$10.1k; 0.75 → PF 2.02 +$10.4k; no window → PF 1.72
  +$9.5k; displacement 1.1 → PF 2.22 +$9.3k (1.77/wk); depth 0.4 → PF 2.09; depth 0.6 → PF 2.27; NDOG discount too → PF 2.27 +$8.5k
  but 1.48/wk.
- Eval speed: it still decides few evals within 2 weeks (7.3% pass, 0% fail in 2026). It earns about $1k a month, so a $3k target
  takes about a month: median 29 sessions to pass.

## Which changes clearly helped, and which did not

| Change | H1 PF (lit_A 0.70) | H2 PF (lit_A 2.63) | Verdict |
|---|---:|---:|---|
| NWOG discount side (filter) | 1.24 | 2.96 | **helps in both halves**; no edge in 2021-25 (1.01) |
| NWOG premium side at 0.25 / 0.5 size | 0.84 / 0.79 | 2.76 / 2.74 | helps in both (size version, keeps 2.99/wk) |
| Half size outside the HOW window | 0.85 | 3.14 | **helps in both**, halves the 2021-25 DD |
| Displacement body ≥ 60% of the bar | 0.71 | 2.76 | tiny, both; kept out (no money effect) |
| Tue + Thu half size | 0.85 | 3.05 | both, but a calendar rule on 7-14 trades per bucket: not proposed |
| Skip 5-day/60-day range < 0.8 | 0.72 | 7.22 | almost all H2; 1.86/wk |
| Displacement 0.8 / 1.2 / 1.5 ATR | 0.61 / 0.59 / 0.63 | 2.37 / 2.89 / 2.24 | no (1.0 stays) |
| FVG left by the displacement | 0.78 | 2.29 | H1 only |
| Sweep depth bands | 0.30-0.91 | 2.47-3.08 | no |
| PVSRA climax / any vector / on the sweep bar | 0.66-0.83 | 2.26-3.00 | H1 or H2 only, cuts trades |
| Unrecovered vector zone between entry and target (skip / half) | 0.20-0.66 | 2.47-3.07 | no |
| VIX move: sweep within k moves of 18:00 / 00:00 open | 0.44-0.71 | 2.24-2.87 | no |
| VIX room to target, VIX-level size, VIX ≤ 25 | 0.66-0.91 | 2.12-2.63 | no |
| SMT with ES: divergence required / size boost / non-SMT half | 0.0-1.62 | 1.60-2.60 | no (and 0.4-1.2 trades/wk as a filter) |
| ES confirmation (ES also swept its own level) | 0.58-0.72 | 2.97-3.82 | H2 only |
| NDOG discount side | 0.62 | 2.68 | no |
| News day skip / half / guard 5-60 min | 0.69-0.72 | 2.28-2.63 | no (the guard never triggers: LIT entries are not near releases) |
| Previous-day range > 1.8-2.5 × 5-day avg: half or skip | 0.71-0.72 | 2.63 | no effect |

## Every variant tried (lit_A + 86 variants in `research/lit/filters_results.json`)

H1 = 2026-01-02..06-30, H2 = 2026-07-01..10-16, net in $, 2021-25 = reference only. "Kind": filter = the setup is skipped (a later
setup that day can trade), size = the micros change, the trades stay the same.

| Variant | Group | Kind | H1 n | H1 PF | H1 net | H2 n | H2 PF | H2 net | 2026 tpw | 2026 PF | 2026 net | 2026 DD | 2021-25 PF | 2021-25 net |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lit_A | base | - | 75 | 0.7 | -4420 | 48 | 2.63 | 9679 | 2.99 | 1.26 | 5258 | -6883 | 1.15 | 31469 |
| disp0.8 | displacement | filter | 88 | 0.61 | -6821 | 57 | 2.37 | 9787 | 3.52 | 1.12 | 2966 | -8890 | 1.12 | 28165 |
| disp1.2 | displacement | filter | 61 | 0.59 | -4724 | 32 | 2.89 | 7157 | 2.26 | 1.16 | 2434 | -7710 | 1.12 | 22350 |
| disp1.5 | displacement | filter | 38 | 0.63 | -2588 | 17 | 2.24 | 2748 | 1.33 | 1.02 | 159 | -4967 | 1.22 | 26638 |
| br0.6 | displacement | filter | 73 | 0.71 | -4267 | 47 | 2.76 | 9954 | 2.91 | 1.28 | 5687 | -6733 | 1.14 | 28962 |
| br0.7 | displacement | filter | 70 | 0.76 | -3070 | 43 | 2.08 | 5956 | 2.74 | 1.16 | 2886 | -7161 | 1.11 | 20059 |
| fvg0 | displacement | filter | 58 | 0.78 | -2174 | 43 | 2.29 | 6481 | 2.45 | 1.29 | 4308 | -4898 | 1.06 | 9758 |
| fvg0.25 | displacement | filter | 45 | 1.11 | 742 | 35 | 1.36 | 1634 | 1.94 | 1.21 | 2376 | -4521 | 1.0 | -144 |
| fvg_size | displacement | size | 75 | 0.85 | -1509 | 48 | 2.24 | 6135 | 2.99 | 1.31 | 4626 | -4517 | 1.08 | 12994 |
| disp1.5_size | displacement | size | 75 | 0.71 | -4477 | 48 | 2.8 | 10674 | 2.99 | 1.29 | 6198 | -7479 | 1.15 | 34258 |
| depth0.25_99 | depth | filter | 77 | 0.73 | -4052 | 50 | 2.55 | 9603 | 3.08 | 1.26 | 5551 | -6091 | 1.08 | 16800 |
| depth0.75_99 | depth | filter | 73 | 0.68 | -4619 | 48 | 2.74 | 9904 | 2.94 | 1.26 | 5285 | -7337 | 1.07 | 14064 |
| depth1.0_99 | depth | filter | 68 | 0.91 | -1172 | 46 | 2.47 | 8372 | 2.77 | 1.38 | 7200 | -5048 | 1.04 | 7602 |
| depth0.5_2.0 | depth | filter | 54 | 0.3 | -7610 | 28 | 2.59 | 5199 | 1.99 | 0.83 | -2411 | -8336 | 1.19 | 24650 |
| depth0.5_3.0 | depth | filter | 62 | 0.38 | -7700 | 37 | 3.08 | 8876 | 2.4 | 1.07 | 1176 | -8116 | 1.14 | 25000 |
| depth1.5_size | depth | size | 75 | 0.59 | -4419 | 48 | 2.87 | 7573 | 2.99 | 1.21 | 3154 | -5093 | 1.2 | 27113 |
| vec_climax | vector | filter | 56 | 0.83 | -1797 | 34 | 2.76 | 6674 | 2.18 | 1.33 | 4877 | -5974 | 1.13 | 23517 |
| vec_any | vector | filter | 60 | 0.83 | -1840 | 38 | 3.0 | 7859 | 2.38 | 1.4 | 6019 | -6229 | 1.1 | 19723 |
| vec_sweep | vector | filter | 43 | 0.66 | -2881 | 26 | 2.26 | 4436 | 1.67 | 1.13 | 1554 | -4440 | 1.18 | 25820 |
| vec_either | vector | filter | 67 | 0.66 | -4516 | 39 | 2.71 | 8167 | 2.57 | 1.2 | 3651 | -6721 | 1.15 | 30297 |
| vec_size | vector | size | 75 | 0.69 | -3821 | 48 | 2.85 | 8597 | 2.99 | 1.28 | 4777 | -6265 | 1.16 | 29511 |
| vix18_0.3 | vix | filter | 49 | 0.44 | -5214 | 32 | 2.24 | 5278 | 1.97 | 1.0 | 65 | -6732 | 1.17 | 30512 |
| vix18_0.5 | vix | filter | 60 | 0.62 | -4681 | 37 | 2.49 | 6778 | 2.35 | 1.12 | 2097 | -5844 | 1.17 | 33029 |
| vix18_0.75 | vix | filter | 65 | 0.54 | -6384 | 43 | 2.61 | 8755 | 2.62 | 1.12 | 2371 | -6799 | 1.2 | 40759 |
| vix18_1.0 | vix | filter | 68 | 0.67 | -4626 | 44 | 2.87 | 10167 | 2.72 | 1.28 | 5541 | -6823 | 1.15 | 32332 |
| vix00_0.5 | vix | filter | 67 | 0.6 | -5918 | 44 | 2.69 | 9561 | 2.69 | 1.18 | 3643 | -7801 | 1.2 | 39902 |
| vix00_0.75 | vix | filter | 73 | 0.71 | -4271 | 48 | 2.63 | 9679 | 2.94 | 1.26 | 5408 | -6737 | 1.16 | 33950 |
| vixroom1.0 | vix | filter | 66 | 0.91 | -1244 | 35 | 2.17 | 5750 | 2.45 | 1.24 | 4506 | -6575 | 1.07 | 14064 |
| vixroom1.5 | vix | filter | 73 | 0.71 | -4238 | 43 | 2.12 | 6622 | 2.82 | 1.12 | 2384 | -6700 | 1.12 | 26773 |
| vix_size | vix | size | 75 | 0.68 | -4392 | 48 | 2.63 | 9679 | 2.99 | 1.27 | 5287 | -6430 | 1.15 | 29405 |
| vixext_size0.5 | vix | size | 75 | 0.7 | -3991 | 48 | 2.51 | 7935 | 2.99 | 1.21 | 3944 | -5917 | 1.15 | 30463 |
| nwog_side | gaps | filter | 44 | 0.59 | -3454 | 24 | 1.72 | 2281 | 1.65 | 0.9 | -1174 | -5730 | 1.06 | 9113 |
| nwog_against | gaps | filter | 52 | 1.24 | 2327 | 31 | 2.96 | 7184 | 2.01 | 1.72 | 9512 | -4863 | 1.01 | 888 |
| ndog_side | gaps | filter | 45 | 0.62 | -3232 | 28 | 2.68 | 5729 | 1.77 | 1.21 | 2497 | -5742 | 1.04 | 6248 |
| nwog_size | gaps | size | 75 | 0.79 | -2370 | 48 | 2.74 | 8356 | 2.99 | 1.38 | 5987 | -5284 | 1.11 | 18104 |
| smt_lvl | smt | filter | 37 | 0.93 | -503 | 27 | 2.02 | 3843 | 1.55 | 1.3 | 3340 | -3960 | 1.24 | 46934 |
| smt_sw | smt | filter | 10 | 0.0 | -1571 | 12 | 2.4 | 1664 | 0.53 | 1.03 | 93 | -1963 | 1.19 | 34627 |
| smt_any | smt | filter | 20 | 1.62 | 1396 | 18 | 1.6 | 1395 | 0.92 | 1.61 | 2792 | -1754 | 1.2 | 38220 |
| smt_size | smt | size | 75 | 0.72 | -4204 | 48 | 2.6 | 9652 | 2.99 | 1.26 | 5448 | -6961 | 1.15 | 32012 |
| smt_size_half | smt | size | 75 | 0.83 | -1420 | 48 | 2.19 | 5230 | 2.99 | 1.3 | 3810 | -3635 | 1.17 | 34136 |
| skip_mon | weekday | filter | 63 | 0.51 | -6515 | 37 | 2.3 | 5526 | 2.43 | 0.94 | -990 | -9062 | 1.14 | 22799 |
| skip_tue | weekday | filter | 61 | 0.95 | -491 | 41 | 3.08 | 10539 | 2.48 | 1.64 | 10048 | -4451 | 1.16 | 27439 |
| skip_wed | weekday | filter | 58 | 0.48 | -6015 | 37 | 1.65 | 3617 | 2.31 | 0.86 | -2398 | -7443 | 1.23 | 36517 |
| skip_thu | weekday | filter | 62 | 0.75 | -3414 | 40 | 3.08 | 10132 | 2.48 | 1.37 | 6718 | -6158 | 1.12 | 22226 |
| skip_fri | weekday | filter | 56 | 0.87 | -1246 | 37 | 3.24 | 8900 | 2.26 | 1.56 | 7654 | -6071 | 1.09 | 16894 |
| monfri_half | weekday | size | 75 | 0.73 | -3199 | 48 | 2.64 | 6914 | 2.99 | 1.23 | 3714 | -5773 | 1.11 | 19198 |
| news_skip | news | filter | 63 | 0.72 | -3202 | 40 | 2.28 | 6651 | 2.5 | 1.21 | 3449 | -5767 | 1.18 | 35801 |
| news_half | news | size | 75 | 0.69 | -4024 | 48 | 2.5 | 8441 | 2.99 | 1.24 | 4417 | -6071 | 1.17 | 34124 |
| news_guard5 | news | filter | 75 | 0.7 | -4420 | 48 | 2.63 | 9679 | 2.99 | 1.26 | 5258 | -6883 | 1.15 | 31469 |
| news_guard15 | news | filter | 75 | 0.7 | -4420 | 48 | 2.63 | 9679 | 2.99 | 1.26 | 5258 | -6883 | 1.15 | 31469 |
| news_guard60 | news | filter | 75 | 0.7 | -4420 | 48 | 2.63 | 9679 | 2.99 | 1.26 | 5258 | -6883 | 1.15 | 31620 |
| pr_half1.8 | vol regime | size | 75 | 0.71 | -4242 | 48 | 2.63 | 9679 | 2.99 | 1.27 | 5437 | -6877 | 1.14 | 29622 |
| pr_half2.0 | vol regime | size | 75 | 0.71 | -4242 | 48 | 2.63 | 9679 | 2.99 | 1.27 | 5437 | -6877 | 1.15 | 30724 |
| pr_half2.5 | vol regime | size | 75 | 0.71 | -4248 | 48 | 2.63 | 9679 | 2.99 | 1.27 | 5431 | -6883 | 1.14 | 29316 |
| pr_skip2.0 | vol regime | filter | 72 | 0.72 | -3930 | 48 | 2.63 | 9679 | 2.91 | 1.29 | 5749 | -6873 | 1.15 | 30596 |
| rg_0.8_1.3 | vol regime | filter | 51 | 0.7 | -2885 | 27 | 5.68 | 9168 | 1.89 | 1.55 | 6284 | -4963 | 1.12 | 17018 |
| rg_lt1.2 | vol regime | filter | 57 | 0.65 | -4091 | 43 | 2.29 | 7072 | 2.43 | 1.17 | 2981 | -6290 | 1.21 | 39124 |
| rg_gt0.8 | vol regime | filter | 64 | 0.72 | -3237 | 29 | 7.22 | 12202 | 2.26 | 1.65 | 8966 | -5783 | 1.08 | 13128 |
| vix_max25 | vol regime | filter | 69 | 0.66 | -4905 | 48 | 2.63 | 9679 | 2.84 | 1.24 | 4774 | -7367 | 1.14 | 26567 |
| nwog_size0.25 | gaps | size | 75 | 0.84 | -1542 | 48 | 2.76 | 8017 | 2.99 | 1.46 | 6475 | -4733 | 1.08 | 10725 |
| nwog_size0.75 | gaps | size | 75 | 0.73 | -3421 | 48 | 2.75 | 8990 | 2.99 | 1.31 | 5570 | -5968 | 1.13 | 24171 |
| gap2_size | gaps | size | 75 | 0.8 | -2295 | 48 | 2.66 | 7808 | 2.99 | 1.35 | 5513 | -5206 | 1.12 | 19067 |
| gap2_size_b | gaps | size | 75 | 0.83 | -2167 | 48 | 2.54 | 7974 | 2.99 | 1.33 | 5806 | -5279 | 1.17 | 30096 |
| es_conf | smt | filter | 62 | 0.72 | -2885 | 29 | 2.97 | 5750 | 2.21 | 1.21 | 2865 | -5044 | 0.47 | -14038 |
| es_conf_loose | smt | filter | 71 | 0.58 | -6050 | 38 | 3.82 | 10593 | 2.65 | 1.25 | 4543 | -6917 | 1.13 | 27968 |
| es_div_half | smt | size | 75 | 0.65 | -4950 | 48 | 3.23 | 10767 | 2.99 | 1.31 | 5817 | -6530 | 1.14 | 30485 |
| vz1_skip | vector | filter | 31 | 0.2 | -5188 | 16 | 3.07 | 3685 | 1.14 | 0.82 | -1502 | -5473 | 1.19 | 16948 |
| vz3_skip | vector | filter | 25 | 0.23 | -3802 | 9 | 1.77 | 1079 | 0.83 | 0.57 | -2723 | -5205 | 1.1 | 7398 |
| vz1_half | vector | size | 75 | 0.63 | -3510 | 48 | 2.79 | 7119 | 2.99 | 1.27 | 3609 | -4498 | 1.17 | 21816 |
| vz3_half | vector | size | 75 | 0.66 | -3158 | 48 | 2.47 | 5650 | 2.99 | 1.19 | 2491 | -4320 | 1.16 | 20292 |
| how_half | weekday | size | 75 | 0.85 | -1522 | 48 | 3.14 | 7581 | 2.99 | 1.45 | 6059 | -4833 | 1.16 | 21956 |
| tuethu_half | weekday | size | 75 | 0.85 | -1820 | 48 | 3.05 | 10478 | 2.99 | 1.5 | 8658 | -5241 | 1.15 | 25014 |
| nwog_ag+disp0.8 | gaps | filter | 64 | 0.78 | -2700 | 37 | 2.23 | 5971 | 2.45 | 1.19 | 3271 | -6002 | 1.02 | 4400 |
| nwog_ag+depth0.25 | gaps | filter | 52 | 1.25 | 2344 | 33 | 3.05 | 7832 | 2.06 | 1.76 | 10176 | -4846 | 0.98 | -3533 |
| C_na+how | combo | filter+size | 52 | 1.52 | 3441 | 31 | 4.0 | 6498 | 2.01 | 2.13 | 9938 | -3371 | 1.06 | 6239 |
| C_ns+how | combo | size | 75 | 0.86 | -1128 | 48 | 3.31 | 7358 | 2.99 | 1.55 | 6231 | -3945 | 1.11 | 12431 |
| C_ns25+how | combo | size | 75 | 0.88 | -879 | 48 | 3.31 | 7358 | 2.99 | 1.63 | 6480 | -3578 | 1.08 | 7877 |
| C_na+how+br | combo | filter+size | 51 | 1.57 | 3659 | 30 | 4.18 | 6590 | 1.97 | 2.2 | 10249 | -3152 | 1.03 | 2570 |
| C_na+br | combo | filter | 51 | 1.3 | 2765 | 30 | 3.2 | 7460 | 1.97 | 1.82 | 10225 | -4426 | 0.95 | -7690 |
| C_how+br | combo | filter+size | 73 | 0.86 | -1371 | 47 | 3.23 | 7673 | 2.91 | 1.47 | 6302 | -4683 | 1.17 | 22253 |
| C_ns+how+tt | combo | size | 75 | 1.02 | 114 | 48 | 3.64 | 7646 | 2.99 | 1.8 | 7760 | -3047 | 1.08 | 7296 |
| C_na+how+tt | combo | filter+size | 52 | 1.62 | 3323 | 31 | 4.61 | 6785 | 2.01 | 2.4 | 10108 | -2715 | 1.01 | 1231 |
| C_na+tt | combo | filter+size | 52 | 1.36 | 2759 | 31 | 3.42 | 7670 | 2.01 | 1.96 | 10429 | -3879 | 1.01 | 854 |
| C_how+tt | combo | size | 75 | 0.99 | -97 | 48 | 3.42 | 7870 | 2.99 | 1.66 | 7773 | -3998 | 1.11 | 13033 |
| C_na+how+pd2 | combo | filter+size | 64 | 1.33 | 2496 | 38 | 3.01 | 5889 | 2.48 | 1.8 | 8384 | -3866 | 1.06 | 7834 |
| C_na+how+disp0.9 | combo | filter+size | 57 | 1.39 | 2830 | 35 | 3.24 | 5987 | 2.23 | 1.89 | 8817 | -3920 | 1.13 | 14621 |
| C_na(out-how)+how | combo | filter+size | 60 | 0.96 | -316 | 35 | 3.07 | 5746 | 2.31 | 1.48 | 5429 | -4184 | 1.15 | 19536 |

## Definitions (all known at the trigger bar close or at entry; no look-ahead)

- **NWOG side:** this week's gap from the last Friday 17:00 close to the Sunday 18:00 open (`ctx["nwog"]` in `engine/lit.py`);
  +1 = entry on the premium side for the trade (long above the midpoint / short below), −1 = discount side, 0 = no gap.
- **HOW window:** Tuesday 03:00 ET to Wednesday 11:30 ET at the sweep extreme bar (`engine/lit.in_how_window`).
- **SMT with ES:** ES 5m from `data/ES_5m.csv` (from 2025-04-14, so the 2021-25 line covers only 2025-04 to 2025-12). ES's own copy of
  each swept session box / PDH-PDL / PWH-PWL / PMH-PML; "divergence" = ES did not take it between NQ's sweep and the trigger bar
  (and had not taken it earlier). Swing version: ES's low after the sweep held above its low of the 24 bars before.
- **Vector zones:** body of a PVSRA climax candle from the last 1 or 3 sessions above the entry, not yet traded through.
- **VIX move:** previous VIX close / 100 / √252 × the anchor (18:00 or 00:00 open).
- **News:** high-impact rows of `data/news/events.csv` and `ff_archive.csv`; an evening release belongs to the next trading day.
- **Volatility regime:** previous-day range / average of the 5 days before; 5-day average range / 60-day average range.

## Files and how to rerun

- `tools/lit_filters.py`: `search` (stage 1, one change at a time), `stage2`, `stage3` (combinations), `robust`, `save`, `table`.
  It imports `engine/lit.py` without editing it: `ESMarket` builds the same components on ES, `annotate_filters()` adds the features
  above, `run_f()` is `lit.run` plus a post-target hook and a size multiplier (self-test: identical to `lit.run` for `lit_A`).
- Runs: `lit_filters_na_how`, `lit_filters_na_how_d09`, `lit_filters_na_how_pd2` (2 trades a day: 2.48/wk, 2026 PF 1.80 +$8.4k),
  `lit_filters_ns_how` (size only: 2.99/wk, PF 1.55 +$6.2k, DD −$3.9k), `lit_filters_how_half` (window size only: PF 1.45 +$6.1k).
- About 1 minute per stage on 1 CPU (the lit_A candidates are cached in `research/runs/_cache`).
