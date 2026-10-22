# Draw learner: which draws on liquidity does price actually reach?

Built 2026-10-16 18:43 ET by `tools/train_draw_learner.py` (runtime 14.9 s). Model for live use: `data/draw_learner.json`, read by `engine/draw_learner.py` (`predict(features)`). **Every number below is walk-forward (out of sample) unless it says otherwise.**

## Verdict

- **2026** (103 trades): learned max-EV +0.147R/trade (win 41%, PF 1.26) vs current +0.189R (win 34%, PF 1.30); difference -0.043R [95% CI -0.266, +0.171]. ERL-only learned (>= 1.5R): +0.153R; miss-adjusted EV: +0.146R.
- **2025** (173 trades): learned max-EV +0.034R/trade (win 43%, PF 1.06) vs current -0.009R (win 36%, PF 0.99); difference +0.043R [95% CI -0.104, +0.190]. ERL-only learned (>= 1.5R): -0.039R; miss-adjusted EV: -0.087R.
- **2026 Jan-Jul (before the tuning window)** (69 trades): learned max-EV -0.026R/trade (win 35%, PF 0.96) vs current -0.169R (win 28%, PF 0.76); difference +0.142R [95% CI -0.069, +0.358]. ERL-only learned (>= 1.5R): -0.105R; miss-adjusted EV: -0.153R.
- Regime pattern: in 2026-01..07 (losing months) the learned rule lost -1.8R vs -11.6R for the current rule; in 2026-08..10 it made +16.9R vs +31.1R. Nearer targets (about 2R vs about 4R) lose less in the bad regime and give back more in the trending one.
- Features with unique out-of-sample information (drop-one log-loss x1000, draws >= 1R): session (+7.1), dist_r (+4.0), dist_atr (+2.3), within_reach (+2.1). No unique gain: eq, kind, obstacles, age_h, source, htf_dir. Strongest on their own: dist_r (+63), dist_atr (+60), within_reach (+41), obstacles (+30), age_h (+21).

## Data and method

- **Entries:** 987 NQ trades of the engine's live-loop replay (`research/five_year/run_live.json`, 2021-11 .. 2026-10). Real CME NQ1! 5m bars only (`data/NQ_5m.csv`).
- **Entry, stop:** `entry_t` in run_live.json is the *fill* bar (the engine fills at the open of the bar after the signal). The decision is taken at the close of the signal bar (`entry_t - 5m`): entry E = that close (the engine's planned entry), stop S = the engine's real stop = fill - dir x risk_pts (fill = next open + 1 tick). R = |E - S|. Using the close of the bar *starting* at `entry_t` would peek 5 minutes ahead, so it is not used.
- **Draws:** 17902 candidate draws (18.1 per entry), enumerated causally at the signal close from 5m bars only (definitions below). Draws further than 12R are not enumerated.
- **Label:** hit = price touches the draw before the stop (a bar that touches both counts as a stop), before 15:55 ET, same CME day. Base hit rate 17.2%.
- **Model:** L2 logistic regression (numpy IRLS, standardised features, ridge = 2 pseudo-trades per coefficient: lambda 36). Features in `engine/draw_learner.py` (`design_row`). Walk-forward by month: the model for month M is fitted only on entries before M; first predicted month 2022-07 (after 120 trades).
- **Decision rules** use the same entry and stop and a plain exit: the target if touched first (limit 1 tick in front of the draw, needs a touch of the draw), else the stop (1 tick slippage, stop first on ties), else the 15:55 close (1 tick slippage). No break-even, time stop or giveback, so this isolates the *target choice*. `current` = the engine's own planned target for that trade (nearest major pool >= 1.5R, 5R cap, 2R fallback; read from `rr_plan`). `learned max-EV` = the draw with the highest EV = p x dist_r - (1 - p) among draws >= 1R (falls back to the current target when none qualifies).

## Feature definitions (match these exactly when calling `predict`)

All prices in the trade direction (long: above entry; short: below). Definitions follow `research/lab/DOL_PLAYBOOK.md`.

| feature | definition |
|---|---|
| `kind` | `IRL` for FVG draws, `ERL` for every resting pool (day/week/session H-L, swings, EQ) |
| `source` | `PDH`/`PDL` previous CME day H/L (usable from 18:00); `PWH`/`PWL` previous week H/L (usable from Sunday 18:00); `RTH` previous day's 09:30-16:00 H/L (from 16:00); `ASIA` 20:00-00:00 H/L (from 00:00), `LON` 02:00-05:00 (from 05:00), `ON` 18:00-09:30 (from 09:30), today's sessions only; `D1SW`/`H4SW`/`H1SW`/`M15SW` confirmed 3-bar fractal swings (k=1) on daily / 4H / 1H / 15m bars built from 5m, tracked 60 / 30 / 10 / 5 days after confirming; `M5SW` 5m k=2 swings confirmed today or on the previous CME day; `EQ` equal highs/lows (D8) not coinciding with a named pool; `FVG5`/`FVG15`/`FVG1H`/`FVG4H`/`FVG1D` live opposing fair value gaps. Same price on several lenses = one draw with the most significant source (PW > PD > RTH > LON > ASIA > ON > D1SW > H4SW > H1SW > M15SW > M5SW). |
| pool taken | a 5m high >= level + 1 tick (low <= level - 1 tick) at any bar since the pool became usable: it is no longer a draw |
| FVG | 3-candle gap on 5m/15m/1H/4H/1D (15m/1H clock-aligned, 4H anchored 18:00 ET, 1D = CME day, all built from closed 5m bars; known at the close of candle 3). Min size 5m = max(1 tick, 0.1 x Wilder ATR14(5m)), else 1 tick. Draw = bearish gap above (long) / bullish gap below (short); level = its **near edge**. It stops being a draw when **any 5m wick touches its CE** (50%). Expiry: 5m at the end of the next CME day, 15m after 5 days, 1H after 10 days, 4H/1D never (the 10 nearest per side are kept). |
| `eq` | true when the draw is a D8 EQH/EQL pool or a named pool (H1SW or more significant) within its tolerance: two confirmed swings on the same TF (5m k=2 today+yesterday, 15m, 1H) within max(2 ticks, 0.1 x Wilder ATR14 of that TF at the 2nd confirmation), >= 3 bars apart, with a pullback of >= 1 ATR_tf between them; level = the higher (lower) one; usable when the 2nd swing confirms. M15SW / M5SW swings inside an EQ pool are folded into it. |
| `dist_atr` | (draw - entry) x dir / Wilder ATR14 of the closed 5m bars at the signal bar |
| `dist_r` | (draw - entry) x dir / (entry - stop) x dir |
| `obstacles` | DOL-6 n_res as price zones: live opposing 15m/1H/4H/1D gaps (near-far interval) and fresh untaken swing points (5m k=2 confirmed today or yesterday, 15m k=1 of the last 5 days) beyond entry, sorted and merged when an item starts within max(2 ticks, 0.1 ATR5) of the previous zone's end; obstacles = number of zones starting strictly between entry and (draw - 2 ticks). Same rule as `engine/liquidity_map.draws()`. |
| `age_h` | hours from when the pool/gap became usable (table above; swings: close of the confirming bar; FVG: close of candle 3; EQ: 2nd confirmation) to the signal close |
| `htf_dir` | engine 1H structure trend x trade direction (+1 / 0 / -1), i.e. the engine's `features['htf_trend']` |
| `session` | `AM` if the signal bar opens before 12:00 ET, else `PM` |
| `within_reach` | dist (points) <= max(0.5 x ADR10, ADR10 - (running CME-day high - low through the signal bar)); ADR10 = mean high-low of the last 10 completed CME days |

## Out-of-sample fit

| draws | model | log-loss | Brier | AUC |
|---|---|---:|---:|---:|
| all OOS draws (n=15770) | full model | 0.3289 | 0.1020 | 0.858 |
| all OOS draws (n=15770) | distance only | 0.3351 | 0.1034 | 0.850 |
| all OOS draws (n=15770) | base rate | 0.4631 | 0.1440 | 0.500 |
| OOS draws with dist_r >= 1 (n=14154) | full model | 0.2954 | 0.0889 | 0.811 |
| OOS draws with dist_r >= 1 (n=14154) | distance only | 0.3024 | 0.0906 | 0.796 |
| OOS draws with dist_r >= 1 (n=14154) | base rate | 0.3696 | 0.1058 | 0.500 |

### Calibration (walk-forward predictions, by decile of predicted p)

| decile | all draws: n | predicted | actual | draws >= 1R: n | predicted | actual |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1577 | 1.0% | 1.5% | 1416 | 0.9% | 1.7% |
| 2 | 1577 | 1.9% | 1.4% | 1415 | 1.8% | 1.2% |
| 3 | 1577 | 2.8% | 2.1% | 1415 | 2.6% | 2.1% |
| 4 | 1577 | 4.1% | 3.9% | 1416 | 3.6% | 3.1% |
| 5 | 1577 | 6.1% | 5.8% | 1415 | 5.1% | 3.9% |
| 6 | 1577 | 9.2% | 10.2% | 1415 | 7.2% | 8.1% |
| 7 | 1577 | 14.4% | 16.2% | 1416 | 10.7% | 11.8% |
| 8 | 1577 | 22.9% | 26.6% | 1415 | 16.0% | 18.7% |
| 9 | 1577 | 35.8% | 41.0% | 1415 | 24.3% | 27.6% |
| 10 | 1577 | 64.0% | 65.3% | 1416 | 38.9% | 39.9% |

### Which features predict (walk-forward, quarterly refits)

`drop-one` = how much worse the out-of-sample log-loss gets without the feature (unique information); `alone` = log-loss gain of a model with only that feature over the base rate. Draws >= 1R (the decision region), x 1000.

| feature | drop-one (x1000) | alone (x1000) | alone AUC | drop-one, all draws (x1000) |
|---|---:|---:|---:|---:|
| session | +7.09 | +4.99 | 0.581 | +6.45 |
| dist_r | +3.98 | +63.41 | 0.786 | +6.38 |
| dist_atr | +2.26 | +60.11 | 0.789 | +1.81 |
| within_reach | +2.10 | +41.22 | 0.702 | +1.81 |
| eq | +0.01 | -0.37 | 0.502 | +0.01 |
| kind | -0.01 | -0.27 | 0.507 | -0.01 |
| obstacles | -0.22 | +30.25 | 0.697 | -0.33 |
| age_h | -0.23 | +20.55 | 0.667 | -0.28 |
| source | -0.89 | +4.73 | 0.585 | -0.94 |
| htf_dir | -1.03 | -3.44 | 0.488 | -0.84 |

### Final-model coefficients (standardised; positive = more likely to be hit)

| term | coef | term | coef |
|---|---:|---|---:|
| log_dist_r | -0.639 | src_EQ | +0.025 |
| log_dist_atr | -0.619 | src_PDL | +0.025 |
| pm | -0.393 | irl | -0.022 |
| within_reach | +0.332 | src_M15SW | +0.019 |
| log_dist_r2 | -0.258 | src_D1SW | -0.019 |
| log1p_obstacles | +0.095 | src_H4SW | -0.019 |
| htf_dir | -0.082 | src_FVG1D | +0.018 |
| src_PWL | -0.063 | src_ON | -0.018 |
| src_FVG4H | +0.056 | src_PDH | +0.017 |
| src_RTH | +0.050 | log1p_age_h | +0.015 |
| eq | -0.040 | src_M5SW | +0.014 |
| src_FVG5 | -0.039 | src_ASIA | -0.008 |
| src_FVG15 | -0.038 | src_H1SW | +0.006 |
| src_PWH | -0.032 | src_FVG1H | +0.000 |
| src_LON | +0.029 | htf_flat | +0.000 |

## Hit rates (all labelled draws; OOS columns = walk-forward months only)

**By source**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| PDH | 174 | 174 | 12.6 | 5.55 | 12.5 | 12.3 |
| PDL | 224 | 224 | 8.9 | 6.41 | 9.2 | 8.5 |
| PWH | 144 | 144 | 4.9 | 6.70 | 4.0 | 4.8 |
| PWL | 105 | 105 | 1.9 | 7.38 | 2.5 | 1.1 |
| RTH | 188 | 188 | 12.2 | 6.19 | 9.9 | 11.9 |
| ASIA | 160 | 160 | 11.9 | 5.37 | 9.8 | 12.9 |
| LON | 282 | 282 | 23.4 | 4.11 | 24.8 | 23.8 |
| ON | 372 | 372 | 22.6 | 3.76 | 21.5 | 22.3 |
| D1SW | 372 | 279 | 4.8 | 7.73 | 4.7 | 4.3 |
| H4SW | 759 | 435 | 5.4 | 7.10 | 5.9 | 5.3 |
| H1SW | 1607 | 722 | 11.0 | 5.71 | 11.6 | 10.6 |
| M15SW | 2631 | 833 | 18.8 | 4.77 | 18.2 | 18.5 |
| M5SW | 1516 | 680 | 24.9 | 3.91 | 23.0 | 26.0 |
| EQ | 226 | 189 | 22.6 | 3.90 | 20.7 | 22.3 |
| FVG5 | 3073 | 802 | 23.7 | 3.92 | 21.9 | 24.5 |
| FVG15 | 2712 | 766 | 20.2 | 4.46 | 18.4 | 20.7 |
| FVG1H | 1637 | 661 | 13.8 | 5.39 | 12.0 | 14.4 |
| FVG4H | 1259 | 652 | 10.2 | 6.48 | 10.3 | 10.2 |
| FVG1D | 461 | 369 | 8.9 | 6.66 | 9.7 | 8.4 |

**By kind**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| ERL | 8760 | 983 | 16.0 | 5.20 | 15.5 | 16.0 |
| IRL | 9142 | 946 | 18.3 | 4.84 | 16.9 | 18.8 |

**By obstacles (6 = 6+)**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 1427 | 964 | 59.8 | 0.96 | 56.1 | 61.0 |
| 1 | 2103 | 955 | 36.5 | 2.18 | 33.3 | 37.0 |
| 2 | 2136 | 926 | 21.0 | 3.36 | 20.4 | 20.8 |
| 3 | 1943 | 866 | 14.5 | 4.15 | 15.1 | 14.7 |
| 4 | 1746 | 773 | 12.4 | 4.89 | 11.4 | 12.8 |
| 5 | 1722 | 695 | 8.2 | 5.59 | 9.1 | 8.6 |
| 6 | 6825 | 617 | 5.3 | 7.38 | 4.6 | 5.4 |

**By dist_atr**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| 0-1 | 927 | 588 | 72.3 | 0.36 | 71.1 | 73.7 |
| 1-2 | 1115 | 650 | 53.2 | 0.94 | 47.8 | 54.5 |
| 2-3 | 1278 | 679 | 35.4 | 1.70 | 33.8 | 36.9 |
| 3-5 | 2702 | 840 | 23.1 | 2.80 | 22.0 | 23.4 |
| 5-8 | 3675 | 848 | 13.1 | 4.37 | 11.2 | 13.4 |
| 8-12 | 3578 | 778 | 5.3 | 6.27 | 5.0 | 5.6 |
| 12-20 | 3489 | 665 | 1.7 | 8.26 | 2.7 | 1.4 |
| >=20 | 1138 | 308 | 0.2 | 9.91 | 1.6 | 0.2 |

**By dist_r**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| 0-0.5 | 843 | 515 | 75.0 | 0.27 | 72.6 | 75.6 |
| 0.5-1 | 994 | 559 | 57.4 | 0.74 | 51.1 | 58.6 |
| 1-1.5 | 996 | 543 | 39.0 | 1.25 | 37.3 | 40.4 |
| 1.5-2 | 1127 | 571 | 31.2 | 1.74 | 28.9 | 31.8 |
| 2-3 | 2040 | 735 | 22.8 | 2.48 | 19.9 | 22.6 |
| 3-4 | 1987 | 723 | 11.9 | 3.48 | 12.3 | 11.9 |
| 4-6 | 3385 | 811 | 7.9 | 4.97 | 7.0 | 7.6 |
| >=6 | 6530 | 884 | 2.5 | 8.69 | 2.8 | 2.4 |

**By within_reach**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| True | 8763 | 982 | 31.1 | 2.73 | 29.0 | 31.6 |
| False | 9139 | 839 | 3.8 | 7.20 | 3.9 | 3.8 |

**By eq**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| False | 17128 | 986 | 17.3 | 5.01 | 16.3 | 17.6 |
| True | 774 | 487 | 14.9 | 5.01 | 14.2 | 14.1 |

**By htf_dir**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| -1 | 10839 | 485 | 16.4 | 5.25 | 14.9 | 17.1 |
| 1 | 7063 | 501 | 18.3 | 4.65 | 18.1 | 17.9 |

**By session**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| AM | 11851 | 635 | 19.4 | 4.95 | 18.4 | 19.7 |
| PM | 6051 | 351 | 12.7 | 5.13 | 11.8 | 12.9 |

**By age_h**

| value | draws | trades | hit % | avg dist_r | OOS predicted % | OOS actual % |
|---|---:|---:|---:|---:|---:|---:|
| 0-1 | 2499 | 898 | 44.9 | 1.70 | 42.8 | 46.0 |
| 1-4 | 2985 | 671 | 25.3 | 2.99 | 22.1 | 26.0 |
| 4-12 | 2211 | 458 | 15.4 | 4.89 | 16.0 | 16.0 |
| 12-24 | 2912 | 577 | 10.9 | 5.51 | 11.3 | 11.1 |
| 24-72 | 3261 | 479 | 8.3 | 6.53 | 7.1 | 8.5 |
| 72-168 | 2381 | 414 | 7.6 | 6.84 | 6.7 | 7.0 |
| >=168 | 1653 | 444 | 5.2 | 7.31 | 6.8 | 5.1 |

**At matched distance** (hit % [draws / trades] inside R bands; distance dominates everything, so compare along a column)

| source | 1-2R | 2-3R | 3-5R | 5-12R |
|---|---:|---:|---:|---:|
| PDH | (21% n=14) | (28% n=18) | 16% [49/49] | 3% [90/90] |
| PDL | (40% n=10) | 22% [23/23] | 16% [38/38] | 3% [152/152] |
| PWH | (25% n=8) | (0% n=4) | 7% [29/29] | 2% [101/101] |
| PWL | (50% n=2) | (33% n=3) | (0% n=19) | 0% [81/81] |
| RTH | (56% n=9) | (29% n=17) | 15% [39/39] | 5% [122/122] |
| ASIA | (18% n=11) | 19% [21/21] | 13% [52/52] | 5% [74/74] |
| LON | 46% [39/39] | 27% [51/51] | 14% [85/85] | 9% [87/87] |
| ON | 34% [76/76] | 23% [56/56] | 11% [84/84] | 5% [107/107] |
| D1SW | (64% n=11) | (20% n=15) | 10% [40/39] | 1% [304/247] |
| H4SW | (38% n=16) | 28% [50/45] | 6% [142/116] | 1% [543/356] |
| H1SW | 31% [128/119] | 23% [194/172] | 9% [356/284] | 3% [876/475] |
| M15SW | 38% [374/299] | 24% [356/277] | 12% [534/380] | 4% [1097/450] |
| M5SW | 36% [252/219] | 26% [197/171] | 11% [321/246] | 6% [481/253] |
| EQ | 30% [40/39] | 29% [31/30] | 16% [49/46] | 5% [73/66] |
| FVG5 | 34% [473/369] | 16% [380/287] | 9% [645/360] | 5% [989/337] |
| FVG15 | 31% [364/308] | 22% [318/262] | 9% [566/371] | 3% [1050/416] |
| FVG1H | 34% [188/173] | 24% [177/166] | 11% [355/295] | 3% [823/437] |
| FVG4H | 38% [85/81] | 28% [93/89] | 13% [241/215] | 3% [816/531] |
| FVG1D | 43% [23/23] | 28% [36/36] | 6% [89/87] | 2% [303/272] |

| kind | 1-2R | 2-3R | 3-5R | 5-12R |
|---|---:|---:|---:|---:|
| ERL | 36% [990/566] | 25% [1036/562] | 11% [1837/743] | 3% [4188/838] |
| IRL | 34% [1133/555] | 21% [1004/483] | 10% [1896/659] | 3% [3981/802] |

| within_reach | 1-2R | 2-3R | 3-5R | 5-12R |
|---|---:|---:|---:|---:|
| beyond reach | (7% n=15) | 21% [305/115] | 7% [1820/433] | 2% [6999/818] |
| in reach | 35% [2108/768] | 23% [1735/681] | 14% [1913/581] | 10% [1170/283] |

| obstacles | 1-2R | 2-3R | 3-5R | 5-12R |
|---|---:|---:|---:|---:|
| obst 0 | 41% [288/232] | 35% [72/64] | 16% [62/53] | 23% [22/17] |
| obst 1 | 36% [720/455] | 27% [313/224] | 17% [295/162] | 11% [173/76] |
| obst 2 | 32% [515/342] | 21% [471/302] | 10% [566/287] | 6% [408/191] |
| obst 3+ | 33% [600/213] | 22% [1184/382] | 10% [2810/639] | 3% [7566/839] |

## Decision rule: learned max-EV draw vs the current target

Same entries, same stop, plain exit (target / stop / 15:55). R per trade; PF = sum of winning R / sum of losing R. `diff` = mean R per trade minus the current rule, with a paired bootstrap 95% CI.

**2026** (103 trades)

| rule | avg R | total R | win % | PF | target % | stop % | 15:55 % | avg target R | diff vs current [95% CI] |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| current (engine target) | +0.189 | +19.5 | 34.0 | 1.30 | 15 | 61 | 24 | 4.03 | - |
| learned max-EV, any draw >= 1R | +0.147 | +15.1 | 40.8 | 1.26 | 34 | 55 | 11 | 2.13 | -0.043 [-0.266, +0.171] |
| learned max-EV, ERL >= 1.5R | +0.153 | +15.8 | 35.9 | 1.25 | 21 | 59 | 19 | 2.94 | -0.036 [-0.200, +0.119] |
| distance-only max-EV, any draw >= 1R | +0.197 | +20.2 | 44.7 | 1.37 | 38 | 51 | 11 | 1.90 | +0.007 [-0.241, +0.253] |
| learned max-EV miss-adjusted, any draw >= 1R | +0.146 | +15.0 | 35.0 | 1.23 | 13 | 61 | 26 | 4.74 | -0.043 [-0.263, +0.138] |
| learned max-EV miss-adjusted, ERL >= 1.5R | +0.096 | +9.9 | 33.0 | 1.15 | 11 | 62 | 27 | 4.90 | -0.093 [-0.302, +0.067] |
| learned E[R] regression, any draw >= 1R | +0.110 | +11.3 | 32.0 | 1.17 | 7 | 63 | 30 | 6.22 | -0.080 [-0.318, +0.121] |
| nearest draw >= 1R | +0.197 | +20.2 | 44.7 | 1.37 | 38 | 51 | 11 | 1.90 | +0.007 [-0.241, +0.253] |
| nearest ERL >= 1.5R | +0.210 | +21.6 | 38.8 | 1.36 | 25 | 56 | 18 | 2.80 | +0.020 [-0.164, +0.201] |
| fixed 1R | +0.011 | +1.2 | 50.5 | 1.02 | 48 | 46 | 7 | 1.00 | -0.178 [-0.493, +0.122] |
| fixed 1.5R | +0.107 | +11.1 | 45.6 | 1.20 | 40 | 50 | 10 | 1.50 | -0.082 [-0.377, +0.195] |
| fixed 2R | +0.042 | +4.4 | 39.8 | 1.07 | 26 | 56 | 17 | 2.00 | -0.147 [-0.389, +0.086] |
| fixed 3R | +0.107 | +11.0 | 36.9 | 1.17 | 19 | 59 | 21 | 3.00 | -0.082 [-0.255, +0.097] |

**2025** (173 trades)

| rule | avg R | total R | win % | PF | target % | stop % | 15:55 % | avg target R | diff vs current [95% CI] |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| current (engine target) | -0.009 | -1.6 | 35.8 | 0.99 | 14 | 60 | 26 | 3.52 | - |
| learned max-EV, any draw >= 1R | +0.034 | +5.9 | 42.8 | 1.06 | 32 | 53 | 14 | 1.93 | +0.043 [-0.104, +0.190] |
| learned max-EV, ERL >= 1.5R | -0.039 | -6.8 | 37.0 | 0.94 | 18 | 58 | 23 | 2.97 | -0.030 [-0.184, +0.106] |
| distance-only max-EV, any draw >= 1R | -0.017 | -2.9 | 43.4 | 0.97 | 34 | 53 | 13 | 1.71 | -0.008 [-0.159, +0.137] |
| learned max-EV miss-adjusted, any draw >= 1R | -0.087 | -15.1 | 33.5 | 0.86 | 13 | 61 | 26 | 4.43 | -0.078 [-0.222, +0.050] |
| learned max-EV miss-adjusted, ERL >= 1.5R | -0.071 | -12.3 | 34.1 | 0.89 | 11 | 61 | 28 | 4.50 | -0.062 [-0.202, +0.066] |
| learned E[R] regression, any draw >= 1R | -0.050 | -8.7 | 34.1 | 0.92 | 10 | 61 | 29 | 5.63 | -0.041 [-0.203, +0.106] |
| nearest draw >= 1R | -0.017 | -2.9 | 43.4 | 0.97 | 34 | 53 | 13 | 1.71 | -0.008 [-0.159, +0.137] |
| nearest ERL >= 1.5R | -0.029 | -4.9 | 37.6 | 0.95 | 20 | 58 | 22 | 2.77 | -0.019 [-0.154, +0.109] |
| fixed 1R | +0.046 | +7.9 | 53.2 | 1.10 | 49 | 44 | 8 | 1.00 | +0.055 [-0.120, +0.234] |
| fixed 1.5R | +0.087 | +15.1 | 46.8 | 1.17 | 36 | 50 | 14 | 1.50 | +0.096 [-0.066, +0.254] |
| fixed 2R | +0.012 | +2.1 | 39.3 | 1.02 | 24 | 56 | 20 | 2.00 | +0.021 [-0.106, +0.144] |
| fixed 3R | -0.067 | -11.6 | 33.5 | 0.89 | 11 | 61 | 28 | 3.00 | -0.058 [-0.172, +0.054] |

**2026 Jan-Jul (before the tuning window)** (69 trades)

| rule | avg R | total R | win % | PF | target % | stop % | 15:55 % | avg target R | diff vs current [95% CI] |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| current (engine target) | -0.169 | -11.6 | 27.5 | 0.76 | 9 | 65 | 26 | 3.95 | - |
| learned max-EV, any draw >= 1R | -0.026 | -1.8 | 34.8 | 0.96 | 29 | 59 | 12 | 2.14 | +0.142 [-0.069, +0.358] |
| learned max-EV, ERL >= 1.5R | -0.105 | -7.2 | 29.0 | 0.85 | 17 | 64 | 19 | 2.98 | +0.064 [-0.073, +0.211] |
| distance-only max-EV, any draw >= 1R | +0.060 | +4.2 | 39.1 | 1.10 | 33 | 55 | 12 | 1.89 | +0.229 [-0.022, +0.488] |
| learned max-EV miss-adjusted, any draw >= 1R | -0.153 | -10.5 | 30.4 | 0.77 | 12 | 64 | 25 | 4.56 | +0.016 [-0.222, +0.228] |
| learned max-EV miss-adjusted, ERL >= 1.5R | -0.231 | -15.9 | 27.5 | 0.66 | 9 | 65 | 26 | 4.83 | -0.062 [-0.286, +0.108] |
| learned E[R] regression, any draw >= 1R | -0.193 | -13.3 | 27.5 | 0.72 | 6 | 65 | 29 | 6.19 | -0.024 [-0.248, +0.143] |
| nearest draw >= 1R | +0.060 | +4.2 | 39.1 | 1.10 | 33 | 55 | 12 | 1.89 | +0.229 [-0.022, +0.488] |
| nearest ERL >= 1.5R | -0.015 | -1.0 | 33.3 | 0.98 | 22 | 59 | 19 | 2.82 | +0.154 [-0.035, +0.358] |
| fixed 1R | -0.055 | -3.8 | 46.4 | 0.89 | 45 | 48 | 7 | 1.00 | +0.114 [-0.204, +0.421] |
| fixed 1.5R | +0.039 | +2.7 | 42.0 | 1.07 | 38 | 52 | 10 | 1.50 | +0.207 [-0.097, +0.505] |
| fixed 2R | -0.094 | -6.5 | 34.8 | 0.85 | 23 | 59 | 17 | 2.00 | +0.075 [-0.176, +0.331] |
| fixed 3R | -0.086 | -6.0 | 31.9 | 0.87 | 16 | 62 | 22 | 3.00 | +0.082 [-0.104, +0.316] |

**all OOS (2022-07..2026-10)** (865 trades)

| rule | avg R | total R | win % | PF | target % | stop % | 15:55 % | avg target R | diff vs current [95% CI] |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| current (engine target) | +0.084 | +72.6 | 34.9 | 1.14 | 17 | 59 | 23 | 3.43 | - |
| learned max-EV, any draw >= 1R | +0.042 | +36.1 | 39.9 | 1.07 | 31 | 55 | 14 | 2.04 | -0.042 [-0.104, +0.021] |
| learned max-EV, ERL >= 1.5R | +0.068 | +58.6 | 35.8 | 1.11 | 22 | 58 | 20 | 2.89 | -0.016 [-0.063, +0.031] |
| distance-only max-EV, any draw >= 1R | +0.050 | +43.1 | 43.0 | 1.09 | 36 | 52 | 12 | 1.72 | -0.034 [-0.102, +0.035] |
| learned max-EV miss-adjusted, any draw >= 1R | +0.044 | +37.9 | 33.5 | 1.07 | 14 | 61 | 25 | 4.83 | -0.040 [-0.100, +0.018] |
| learned max-EV miss-adjusted, ERL >= 1.5R | +0.058 | +50.1 | 33.3 | 1.09 | 14 | 61 | 26 | 4.83 | -0.026 [-0.082, +0.029] |
| learned E[R] regression, any draw >= 1R | +0.098 | +85.2 | 32.8 | 1.15 | 10 | 61 | 29 | 6.49 | +0.015 [-0.050, +0.081] |
| nearest draw >= 1R | +0.050 | +43.1 | 43.0 | 1.09 | 36 | 52 | 12 | 1.72 | -0.034 [-0.102, +0.035] |
| nearest ERL >= 1.5R | +0.072 | +61.9 | 36.8 | 1.12 | 24 | 58 | 18 | 2.66 | -0.012 [-0.060, +0.035] |
| fixed 1R | +0.007 | +6.0 | 50.4 | 1.01 | 47 | 46 | 8 | 1.00 | -0.077 [-0.160, +0.006] |
| fixed 1.5R | +0.048 | +41.9 | 43.6 | 1.09 | 36 | 51 | 12 | 1.50 | -0.035 [-0.106, +0.034] |
| fixed 2R | +0.043 | +37.5 | 38.7 | 1.07 | 27 | 56 | 17 | 2.00 | -0.041 [-0.100, +0.019] |
| fixed 3R | +0.038 | +33.1 | 33.9 | 1.06 | 16 | 60 | 23 | 3.00 | -0.046 [-0.094, +0.003] |

**What a miss really costs** (all labelled draws, in-sample, descriptive). The brief's EV charges -1R for every miss; a miss that is still open at 15:55 exits at the market instead, so far targets are under-valued by that formula. `miss-adjusted` rules replace the -1R by the walk-forward mean R of past misses in the same distance band.

| dist_r band | draws | hit % | avg realised R if targeted | avg R of a miss | misses ending at the stop % | misses ending at 15:55 % |
|---|---:|---:|---:|---:|---:|---:|
| <1R | 1837 | 65.5 | -0.001 | -0.895 | 85 | 15 |
| 1-1.5R | 996 | 39.0 | -0.009 | -0.799 | 82 | 18 |
| 1.5-2R | 1127 | 31.2 | +0.047 | -0.712 | 77 | 23 |
| 2-3R | 2040 | 22.8 | +0.095 | -0.597 | 72 | 28 |
| 3-4R | 1987 | 11.9 | -0.011 | -0.480 | 69 | 31 |
| 4-6R | 3385 | 7.9 | +0.097 | -0.314 | 67 | 33 |
| 6-12R | 6530 | 2.5 | +0.038 | -0.170 | 67 | 33 |

Replay check: replaying each trade with the engine's own target reproduces the engine's STOP / TARGET exits on STOP 231/232, TARGET 92/94 trades (the rest left early through the engine's management before reaching either).

**Monthly R (sum over the month's trades), 2025-2026**

| month | trades | current (engine target) | learned max-EV, any draw >= 1R | learned max-EV miss-adjusted, any draw >= 1R | learned max-EV, ERL >= 1.5R | fixed 2R |
|---|---:|---:|---:|---:|---:|---:|
| 2025-01 | 12 | +9.23 | +7.54 | +9.25 | +7.56 | +5.78 |
| 2025-02 | 14 | -5.20 | +2.05 | -1.99 | +0.81 | -2.10 |
| 2025-03 | 11 | -4.30 | -4.83 | -4.78 | -4.78 | -4.30 |
| 2025-04 | 6 | +6.74 | +3.00 | +6.31 | +5.93 | +2.99 |
| 2025-05 | 15 | +3.29 | +1.99 | -3.84 | +2.11 | +3.55 |
| 2025-06 | 13 | +4.97 | +6.31 | +2.26 | +4.82 | +6.27 |
| 2025-07 | 20 | -0.04 | +5.78 | +3.96 | +2.88 | +4.70 |
| 2025-08 | 21 | +12.38 | +1.91 | +1.34 | -1.17 | +3.68 |
| 2025-09 | 18 | -9.13 | -4.02 | -11.91 | -8.41 | -5.35 |
| 2025-10 | 14 | -11.26 | -11.26 | -11.26 | -11.26 | -9.65 |
| 2025-11 | 11 | -3.47 | -0.39 | -2.83 | +0.02 | -0.84 |
| 2025-12 | 18 | -4.78 | -2.16 | -1.57 | -5.30 | -2.61 |
| 2026-01 | 12 | -2.00 | -3.45 | -1.18 | -1.99 | -3.99 |
| 2026-02 | 7 | -2.74 | +0.01 | -2.74 | -2.02 | -0.83 |
| 2026-03 | 11 | +12.54 | +12.30 | +9.39 | +11.91 | +6.97 |
| 2026-04 | 7 | -6.52 | -4.47 | -6.52 | -6.52 | -3.51 |
| 2026-05 | 16 | -4.09 | -0.84 | -0.67 | -2.83 | -1.09 |
| 2026-06 | 8 | -6.79 | -6.79 | -6.79 | -6.79 | -6.79 |
| 2026-07 | 8 | -2.03 | +1.42 | -2.03 | +1.03 | +2.75 |
| 2026-08 | 15 | +13.63 | +9.53 | +16.03 | +14.14 | +5.66 |
| 2026-09 | 12 | +8.96 | +4.00 | +1.48 | +2.69 | +1.36 |
| 2026-10 | 7 | +8.55 | +3.40 | +8.06 | +6.18 | +3.84 |

Reference: on the same 103 2026 entries the engine's real managed result (BE at 1R, 30-min time stop, giveback, news flat) averaged +0.225R; the unmanaged replay of its target averages +0.189R.

## Hand-off: using it from the engine

- Call `from engine.draw_learner import predict` with one draw's feature dict (`engine/liquidity_map.features(x)` plus `within_reach`). It returns P(hit before the stop, by 15:55) or **None** when `data/draw_learner.json` is missing or the input has no usable distance; the caller then falls back to its rule. `pick(draws, min_r)` returns the max-EV draw with the brief's EV. Extra keys (`tier`, `price`, ...) are ignored; an unknown `source` gets the average source effect; `age_h=None` counts as 0; a missing `within_reach` counts as inside reach.
- Retrain: `python tools/train_draw_learner.py` (about 15 s, single process). It rewrites the model and this report.
- The model's weight sits on `dist_r`, `dist_atr`, `session` and `within_reach`. These match exactly when the caller uses the same entry (signal close), stop, Wilder ATR14(5m) and ADR10. Source / eq / kind coefficients are small (|standardised coef| < 0.1), so the definition gaps below move p by a few points at most (e.g. PDH -> unknown source at 2.5R: 0.25 -> 0.22).

Known differences between this trainer and `engine/liquidity_map.py` as read at 18:36 ET (align one side or the other):

| item | this trainer (DOL_PLAYBOOK) | liquidity_map.py / engine pools |
|---|---|---|
| 1H / 15m swing pools | 3-bar fractal (k=1) on 1H / 15m bars built from 5m; tracked 10 / 5 days | engine `H1H/H1L`, `ITH/ITL` = Structure(2) (k=2) fractals, 1H from `data/NQ_1h.csv`; retired after 5 / 1.2 days |
| PDH/PDL, sessions | previous CME day's H/L only; today's Asia / London / ON only | engine keeps untaken PD and session pools up to 2.2 days, so yesterday's sessions can still be draws |
| `eq` | D8: max(2 ticks, 0.1 ATR_tf), >= 3 bars apart, >= 1 ATR pullback, same TF | engine eq flag (6 NQ points, set when a pool is created) |
| `kind` of non-eq M15SW / M5SW | ERL (D7 lists swings as external liquidity) | IRL |
| HTF gap mitigation timing | any closed 5m bar whose wick reaches the CE | checked when the gap's own TF bar closes (a 1H gap tagged at 10:05 stays live until 11:00) |
| 4H / 1D gaps kept | the 10 nearest live per side | up to 40 stored per side |

## Caveats (read before using it)

- **Labels are one number per trade.** Every draw of a trade shares one price path, so 'hit' is just `max favourable excursion before the stop >= distance`. Draw features can only matter *across* trades (a PDH at 2R vs a 5m gap at 2R on different days). The effective sample is the number of trades, not the number of draws.
- **Distance, time of day and reach carry the information.** Out of sample, only dist_r, dist_atr, session (AM vs PM) and within_reach add unique information; the liquidity attributes (source, kind, eq, obstacles beyond what distance already says, age, htf_dir) add nothing. Read the matched-distance tables, not the raw ones.
- **The EV formula charges a full -1R to every miss.** Many far targets end at 15:55 with a partial result, not at the stop, so EV = p x R - (1 - p) is conservative for far draws. The simulated R uses the real path, so the comparison itself is fair.
- **Unmanaged exits.** The comparison removes the engine's break-even, 30-minute time stop and giveback exit for both rules, so neither line equals the engine's real P&L. A target that wins here can still lose once those management rules cut trades early.
- **Entry edge is not created here.** The five-year verdict (no proven entry edge) still stands; the learner can only reshape exits on entries that are themselves roughly break-even before Aug 2026.
- **Definition drift.** The live caller (engine/liquidity_map.py) must compute the features exactly as defined above. Known differences at the time of writing are listed in the hand-off notes. `predict()` returns None without data/draw_learner.json, and unknown sources fall back to the average source effect.
- **2026 Aug-Oct is the window the engine's defaults were tuned on**; the Jan-Jul 2026 and 2025 lines are the cleaner out-of-sample checks.
