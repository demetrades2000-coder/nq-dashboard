# NARRATIVE RESULTS: does the trader brain rank trades?

Generated 2026-10-16 19:39 ET by `python -X utf8 tools/lab_narrative_run.py report` from `NARRATIVE_results.json`, `NARRATIVE_models_results.json`, `NARRATIVE_atm_results.json`, `NARRATIVE_bias_results.json` and `NARRATIVE_diag.json`. Rules: `NARRATIVE_RULES.md` (v1 pre-registered before any outcome; v2 section 7). Code: `engine/narrative.py`. Real CME NQ1!/ES1! 5m only. R = the trade's own result (its model's management); grades come from closed bars at the decision time.

## What was run (all of it is reported)

- **Primary:** v1 grades (10 judgment elements, fixed weights) on the engine's current picks (`conf_testbed_orig1day.json`).
- **Alt-1:** v2 = v1 reworked with the broad-agreement heuristics from `TRADER_HEURISTICS.md` (19 elements, 3 hard vetoes).
- **Alt-2:** experience layer: per-element trust re-learned every month from past trades only (walk-forward), applied to v1.
- **Alt-3:** the brain's own in-trade management (`manage()`) replacing the engine's exits on the same entries.
- Descriptive extras requested by the owner/coordinator (no selection made on them): score-only grades (vetoes ignored), other models' trades (Silver Bullet, Mech/IFVG, ICT2022, ATM), a daily-bias alignment study with 6 bias definitions, `require_bias_alignment` on/off, and whether the pre-market narrative predicts the day at all.

## 1. Engine trades (2026 dev / confirm, 2025 check): grade ranking

| readout | n | A: n / avg R | B | C | SKIP | A > B > C? | Spearman(score, R) | A minus (C+SKIP) [95% CI] |
|---|---:|---|---|---|---|---|---:|---|
| v1 dev | 54 | 10 / -0.44 | 17 / +0.07 | 23 / +0.17 | 4 / -0.40 | no | -0.12 | -0.52 [-1.27, +0.24] |
| v1 confirm | 39 | 5 / +0.48 | 9 / +1.12 | 16 / +0.82 | 9 / +1.13 | no | -0.20 | -0.46 [-1.82, +0.88] |
| v1 y2025 | 118 | 26 / +0.24 | 37 / -0.24 | 43 / -0.10 | 12 / +0.12 | no | +0.08 | +0.29 [-0.28, +0.88] |
| v1 ytd | 93 | 15 / -0.13 | 26 / +0.43 | 39 / +0.44 | 13 / +0.66 | no | -0.18 | -0.63 [-1.34, +0.12] |
| v2 dev | 54 | 14 / -0.68 | 16 / +0.67 | 5 / -0.40 | 19 / -0.00 | no | -0.36 | -0.59 [-1.09, -0.12] |
| v2 confirm | 39 | 8 / +0.75 | 16 / +0.85 | 3 / +2.17 | 12 / +0.81 | no | -0.01 | -0.33 [-1.71, +1.30] |
| v2 y2025 | 118 | 28 / -0.14 | 31 / -0.15 | 10 / -0.02 | 49 / +0.07 | no | +0.06 | -0.20 [-0.65, +0.30] |
| v2 ytd | 93 | 22 / -0.16 | 32 / +0.76 | 8 / +0.56 | 31 / +0.31 | no | -0.20 | -0.52 [-1.22, +0.26] |
| v1_scoreonly dev | 54 | 10 / -0.44 | 17 / +0.07 | 23 / +0.17 | 4 / -0.40 | no | -0.12 | -0.52 [-1.27, +0.24] |
| v1_scoreonly confirm | 39 | 5 / +0.48 | 9 / +1.12 | 16 / +0.82 | 9 / +1.13 | no | -0.20 | -0.46 [-1.82, +0.88] |
| v1_scoreonly y2025 | 118 | 26 / +0.24 | 37 / -0.24 | 43 / -0.10 | 12 / +0.12 | no | +0.08 | +0.29 [-0.28, +0.88] |
| v2_scoreonly dev | 54 | 16 / -0.72 | 27 / +0.33 | 9 / +0.23 | 2 / -0.15 | no | -0.36 | -0.89 [-1.57, -0.29] |
| v2_scoreonly confirm | 39 | 10 / +0.69 | 22 / +0.96 | 4 / +1.56 | 3 / +0.53 | no | -0.01 | -0.42 [-2.09, +1.21] |
| v2_scoreonly y2025 | 118 | 33 / -0.18 | 62 / +0.01 | 16 / +0.19 | 7 / -0.46 | no | +0.06 | -0.17 [-0.82, +0.41] |
| experience (v1 elements) dev | 54 | 8 / -0.41 | 19 / -0.12 | 19 / +0.44 | 8 / -0.44 | no | -0.11 | -0.59 [-1.36, +0.31] |
| experience (v1 elements) confirm | 39 | 2 / -0.62 | 11 / +1.34 | 18 / +0.56 | 8 / +1.52 | no | -0.14 | -1.48  |
| experience (v1 elements) y2025 | 118 | 23 / +0.27 | 37 / -0.18 | 46 / -0.15 | 12 / +0.14 | no | +0.07 | +0.36 [-0.26, +1.01] |

Cells are `n / avg R`. SKIP rows are trades the brain would have passed on (their R is what the engine actually got).

### Policy readouts (2026 = dev + confirm; 2025 = holdout)

`base` = every engine trade as traded ($350 risk). `drop` = C and SKIP removed, A at $700 risk (max 10 MNQ = 1 NQ), B at $350. `tier` = C kept at $175 (min 1 MNQ). Same entries, per-contract P&L x the new size; 50K pass = rolling MFFU 50K (`strategy_lab.stats`).

**dev**

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| base (engine as is) | 54 | 2.11 | +592 | 1.11 | -2,706 | 8.2 (4.5) | 4 |
| v1 drop C/SKIP, A/B tiered | 27 | 1.05 | -2,308 | 0.62 | -3,610 | 0.0 (0.0) | 5 |
| v1 tier (C at $175) | 50 | 1.95 | -1,516 | 0.79 | -3,981 | 0.0 (31.0) | 5 |
| v2 drop C/SKIP, A/B tiered | 30 | 1.17 | -2,184 | 0.68 | -5,082 | 0.0 (15.2) | 4 |
| v2 tier (C at $175) | 35 | 1.37 | -2,412 | 0.66 | -5,109 | 0.0 (15.2) | 4 |
| experience drop | 27 | 1.05 | -2,764 | 0.57 | -3,722 | 0.0 (0.0) | 5 |
| experience tier | 46 | 1.8 | -1,410 | 0.8 | -3,752 | 0.0 (30.0) | 5 |

**confirm**

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| base (engine as is) | 39 | 2.5 | +11,038 | 5.15 | -876 | 100.0 (19.4) | 1 |
| v1 drop C/SKIP, A/B tiered | 14 | 0.9 | +5,015 | 3.4 | -889 | 100.0 (0.0) | 1 |
| v1 tier (C at $175) | 30 | 1.92 | +6,583 | 3.67 | -823 | 100.0 (0.0) | 1 |
| v2 drop C/SKIP, A/B tiered | 24 | 1.54 | +6,805 | 4.06 | -1,136 | 100.0 (17.1) | 1 |
| v2 tier (C at $175) | 27 | 1.73 | +7,571 | 4.39 | -1,136 | 100.0 (19.0) | 1 |
| experience drop | 13 | 0.83 | +4,077 | 3.5 | -565 | 100.0 (None) | 1 |
| experience tier | 31 | 1.99 | +5,337 | 3.49 | -646 | 100.0 (0.0) | 1 |

**ytd**

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| base (engine as is) | 93 | 2.26 | +11,630 | 2.41 | -3,147 | 48.1 (27.0) | 5 |
| v1 drop C/SKIP, A/B tiered | 41 | 1.0 | +2,707 | 1.33 | -3,785 | 44.9 (34.8) | 6 |
| v1 tier (C at $175) | 80 | 1.94 | +5,067 | 1.53 | -4,254 | 45.5 (36.0) | 6 |
| v2 drop C/SKIP, A/B tiered | 54 | 1.31 | +4,622 | 1.51 | -5,730 | 32.4 (22.7) | 5 |
| v2 tier (C at $175) | 62 | 1.5 | +5,159 | 1.55 | -5,762 | 32.4 (22.7) | 5 |
| experience drop | 40 | 0.97 | +1,314 | 1.16 | -3,897 | 39.6 (32.2) | 6 |
| experience tier | 77 | 1.87 | +3,927 | 1.43 | -4,052 | 44.6 (30.0) | 6 |

**y2025**

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| base (engine as is) | 118 | 3.17 | +1,361 | 1.14 | -3,362 | 11.8 (0.8) | 5 |
| v1 drop C/SKIP, A/B tiered | 63 | 1.69 | +1,431 | 1.13 | -4,055 | 12.4 (6.5) | 4 |
| v1 tier (C at $175) | 106 | 2.85 | +968 | 1.07 | -5,037 | 21.0 (14.1) | 4 |
| v2 drop C/SKIP, A/B tiered | 59 | 1.59 | -4,506 | 0.55 | -6,007 | 0.0 (12.5) | 6 |
| v2 tier (C at $175) | 69 | 1.85 | -4,681 | 0.57 | -6,495 | 0.0 (13.1) | 6 |
| experience drop | 60 | 1.61 | +2,119 | 1.21 | -3,466 | 12.2 (6.5) | 4 |
| experience tier | 106 | 2.85 | +1,389 | 1.11 | -4,567 | 21.0 (16.7) | 4 |

### 2026 monthly P&L ($)

| month | base trades | base net | v1 drop trades | v1 drop net | v1 tier net | v2 tier net |
|---|---:|---:|---:|---:|---:|---:|
| 2026-01 | 11 | +894 | 4 | -843 | -241 | +1,002 |
| 2026-02 | 6 | -436 | 3 | -95 | -220 | -808 |
| 2026-03 | 9 | +2,684 | 5 | +2,240 | +2,926 | +1,967 |
| 2026-04 | 10 | -832 | 6 | -602 | -775 | -708 |
| 2026-05 | 11 | -790 | 6 | -1,973 | -2,058 | -2,502 |
| 2026-06 | 7 | -928 | 3 | -1,035 | -1,148 | -1,364 |
| 2026-07 | 7 | -340 | 3 | -176 | -265 | -636 |
| 2026-08 | 14 | +5,288 | 5 | +2,005 | +2,478 | +4,062 |
| 2026-09 | 11 | +4,125 | 4 | +2,218 | +2,640 | +3,150 |
| 2026-10 | 7 | +1,964 | 2 | +968 | +1,730 | +994 |

## 2. Same fixed grades on the engine's five-year trades (run_live.json, 2021-11 .. 2026-10)

| readout | n | A: n / avg R | B | C | SKIP | A > B > C? | Spearman(score, R) | A minus (C+SKIP) [95% CI] |
|---|---:|---|---|---|---|---|---:|---|
| v1 2022 | 192 | 16 / -0.48 | 60 / -0.13 | 99 / +0.00 | 17 / -0.15 | no | -0.01 | -0.46 [-0.90, +0.00] |
| v1 2023 | 260 | 32 / +0.12 | 76 / +0.04 | 113 / -0.01 | 39 / -0.01 | yes | +0.05 | +0.12 [-0.25, +0.52] |
| v1 2024 | 221 | 40 / +0.23 | 61 / -0.12 | 98 / +0.10 | 22 / +0.07 | no | -0.15 | +0.13 [-0.39, +0.69] |
| v1 2025 | 173 | 27 / +0.18 | 55 / -0.07 | 69 / -0.04 | 22 / +0.05 | no | +0.04 | +0.20 [-0.31, +0.73] |
| v1 2026 | 103 | 13 / -0.09 | 24 / +0.41 | 52 / +0.09 | 14 / +0.71 | no | -0.22 | -0.31 [-1.11, +0.69] |
| v1 pre2025 | 711 | 90 / +0.04 | 209 / -0.06 | 329 / +0.04 | 83 / -0.03 | no | -0.04 | +0.02 [-0.26, +0.32] |
| v1 all | 987 | 130 / +0.06 | 288 / -0.02 | 450 / +0.03 | 119 / +0.07 | no | -0.04 | +0.02 [-0.22, +0.28] |
| v2 2022 | 192 | 31 / +0.01 | 64 / +0.03 | 25 / -0.35 | 72 / -0.15 | no | +0.02 | +0.22 [-0.34, +0.84] |
| v2 2023 | 260 | 30 / -0.08 | 92 / +0.11 | 39 / +0.21 | 99 / -0.10 | no | -0.05 | -0.07 [-0.55, +0.49] |
| v2 2024 | 221 | 33 / -0.16 | 79 / +0.33 | 27 / -0.28 | 82 / +0.00 | no | -0.08 | -0.09 [-0.47, +0.32] |
| v2 2025 | 173 | 41 / -0.04 | 54 / -0.05 | 21 / -0.01 | 57 / +0.08 | no | -0.00 | -0.10 [-0.52, +0.32] |
| v2 2026 | 103 | 30 / -0.20 | 39 / +0.57 | 11 / +0.31 | 23 / +0.15 | no | -0.25 | -0.40 [-1.10, +0.35] |
| v2 pre2025 | 711 | 99 / -0.06 | 252 / +0.15 | 96 / -0.09 | 264 / -0.08 | no | -0.04 | +0.02 [-0.25, +0.33] |
| v2 all | 987 | 170 / -0.08 | 345 / +0.17 | 128 / -0.04 | 344 / -0.04 | no | -0.05 | -0.04 [-0.25, +0.19] |

## 3. Other models' trades (cached lab beds, default params, NQ)

| readout | n | A: n / avg R | B | C | SKIP | A > B > C? | Spearman(score, R) | A minus (C+SKIP) [95% CI] |
|---|---:|---|---|---|---|---|---:|---|
| silver_bullet v1 dev | 62 | 2 / -1.03 | 17 / +0.76 | 27 / -0.36 | 16 / +0.02 | no | +0.24 | -0.81  |
| silver_bullet v1 confirm | 32 | 1 / -1.02 | 10 / -0.55 | 16 / -0.13 | 5 / -0.33 | no | +0.11 | -0.84  |
| silver_bullet v1 y2025 | 92 | 7 / +0.20 | 22 / -0.33 | 36 / +0.15 | 27 / -0.16 | no | +0.03 | +0.18 [-1.17, +1.76] |
| silver_bullet v2 dev | 62 | 24 / -0.01 | 25 / +0.15 | 6 / +0.37 | 7 / -0.57 | no | +0.08 | +0.12 [-1.09, +1.21] |
| silver_bullet v2 confirm | 32 | 17 / -0.10 | 9 / -0.65 | 2 / +0.71 | 4 / -1.04 | no | +0.26 | +0.35 [-1.00, +1.48] |
| silver_bullet v2 y2025 | 92 | 32 / -0.16 | 38 / -0.10 | 7 / +0.61 | 15 / -0.02 | no | -0.04 | -0.34 [-1.32, +0.55] |
| mech_ifvg v1 dev | 53 | 1 / -1.01 | 16 / -0.39 | 28 / -0.09 | 8 / +0.11 | no | -0.07 | -0.97  |
| mech_ifvg v1 confirm | 27 | 1 / -1.02 | 11 / -0.51 | 14 / +0.29 | 1 / +0.36 | no | -0.58 | -1.31  |
| mech_ifvg v1 y2025 | 77 | 7 / +0.02 | 25 / -0.27 | 41 / -0.09 | 4 / +0.13 | no | +0.03 | +0.09 [-0.55, +0.72] |
| mech_ifvg v2 dev | 53 | 4 / +0.28 | 21 / -0.30 | 9 / +0.07 | 19 / -0.22 | no | -0.13 | +0.41 [-0.92, +1.76] |
| mech_ifvg v2 confirm | 27 | 3 / -0.94 | 8 / +0.11 | 6 / -0.36 | 10 / +0.19 | no | -0.31 | -0.92 [-1.46, -0.42] |
| mech_ifvg v2 y2025 | 77 | 5 / +0.90 | 28 / -0.29 | 11 / +0.26 | 33 / -0.27 | no | +0.03 | +1.03 [-0.19, +2.32] |
| ict2022 v1 dev | 36 | 13 / +0.24 | 12 / +0.08 | 8 / -0.15 | 3 / +0.69 | yes | +0.02 | +0.16 [-0.70, +0.98] |
| ict2022 v1 confirm | 18 | 4 / -1.01 | 5 / -0.22 | 6 / -0.27 | 3 / -0.98 | no | -0.00 | -0.51 [-1.21, +0.01] |
| ict2022 v1 y2025 | 43 | 15 / -0.05 | 12 / -0.70 | 8 / -0.08 | 8 / +0.57 | no | -0.29 | -0.30 [-1.08, +0.51] |
| ict2022 v2 dev | 36 | 7 / +0.49 | 10 / -0.12 | 4 / +0.51 | 15 / +0.05 | no | +0.16 | +0.34 [-0.64, +1.26] |
| ict2022 v2 confirm | 18 | 5 / -0.17 | 8 / -0.70 | 0 / - | 5 / -0.65 | no | -0.26 | +0.48 [-0.73, +1.64] |
| ict2022 v2 y2025 | 43 | 3 / +1.13 | 12 / -0.39 | 6 / -0.67 | 22 / -0.00 | yes | -0.16 | +1.28 [+0.60, +1.94] |

Policy readouts on those beds (2026 ytd):

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| silver_bullet base | 94 | 2.28 | -2,013 | 0.91 | -5,664 | 35.0 (37.6) | 5 |
| silver_bullet v1 tier | 73 | 1.77 | -1,027 | 0.91 | -3,918 | 30.8 (39.5) | 7 |
| silver_bullet v2 tier | 80 | 1.94 | -884 | 0.96 | -6,292 | 37.6 (49.0) | 4 |
| mech_ifvg base | 80 | 1.94 | -1,991 | 0.83 | -3,537 | 0.0 (0.0) | 7 |
| mech_ifvg v1 tier | 71 | 1.72 | -4,078 | 0.61 | -4,589 | 0.0 (0.0) | 9 |
| mech_ifvg v2 tier | 51 | 1.24 | -3,014 | 0.69 | -3,928 | 0.0 (0.0) | 6 |
| ict2022 base | 54 | 1.31 | -1,914 | 0.77 | -3,611 | 0.0 (0.0) | 7 |
| ict2022 v1 tier | 47 | 1.14 | -959 | 0.9 | -4,067 | 17.8 (27.6) | 7 |
| ict2022 v2 tier | 34 | 0.83 | +324 | 1.05 | -2,803 | 19.9 (11.1) | 6 |

### ATM 1m ladder model (57 trades; source: research/lab/ATM_trades_1m_base.json; atm.py time 19:26)

| readout | n | A: n / avg R | B | C | SKIP | A > B > C? | Spearman(score, R) | A minus (C+SKIP) [95% CI] |
|---|---:|---|---|---|---|---|---:|---|
| ATM 1m ladder v1 dev | 36 | 10 / +0.55 | 14 / -0.33 | 11 / -0.01 | 1 / +5.50 | no | +0.02 | +0.10 [-1.50, +1.56] |
| ATM 1m ladder v1 confirm | 21 | 3 / +0.32 | 10 / -0.37 | 8 / -0.28 | 0 / - | no | +0.34 | +0.59 [-0.97, +2.16] |
| ATM 1m ladder v2 dev | 36 | 7 / -0.51 | 10 / -0.45 | 3 / +2.38 | 16 / +0.45 | no | -0.33 | -1.27 [-2.44, +0.14] |
| ATM 1m ladder v2 confirm | 21 | 2 / -1.02 | 5 / +0.33 | 1 / -1.04 | 13 / -0.27 | no | +0.07 | -0.70  |
| ATM 1m ladder owner's own tiers dev | 36 | 17 / +0.28 | 15 / -0.19 | 4 / +1.08 | 0 / - | no | +0.16 | -0.81 [-3.81, +1.49] |
| ATM 1m ladder owner's own tiers confirm | 21 | 12 / +0.03 | 6 / -0.37 | 3 / -1.01 | 0 / - | yes | +0.14 | +1.04 [+0.38, +1.75] |

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| ATM 1m ladder base ytd | 57 | 1.38 | +431 | 1.04 | -3,968 | 22.8 (22.8) | 5 |
| ATM 1m ladder v1 drop ytd | 37 | 0.9 | +1,171 | 1.13 | -3,142 | 24.6 (18.6) | 4 |
| ATM 1m ladder v1 tier ytd | 56 | 1.36 | +733 | 1.07 | -3,616 | 15.8 (12.0) | 6 |
| ATM 1m ladder v2 drop ytd | 24 | 0.58 | -4,740 | 0.4 | -4,740 | 0.0 (33.3) | 7 |
| ATM 1m ladder v2 tier ytd | 28 | 0.68 | -3,754 | 0.54 | -3,754 | 0.0 (None) | 7 |

### ATM 5m model (11 trades; source: atm.run() 5m defaults, sizing flat; atm.py time 19:26)

| readout | n | A: n / avg R | B | C | SKIP | A > B > C? | Spearman(score, R) | A minus (C+SKIP) [95% CI] |
|---|---:|---|---|---|---|---|---:|---|
| ATM 5m v1 dev | 5 | 1 / -1.02 | 3 / +0.10 | 1 / +1.77 | 0 / - | no | -0.67 | -2.78  |
| ATM 5m v1 confirm | 2 | 0 / - | 1 / -1.02 | 0 / - | 1 / +0.92 | no | - | -  |
| ATM 5m v1 y2025 | 4 | 0 / - | 1 / +1.49 | 3 / -0.67 | 0 / - | no | - | -  |
| ATM 5m v2 dev | 5 | 0 / - | 1 / -0.29 | 0 / - | 4 / +0.34 | no | -0.82 | -  |
| ATM 5m v2 confirm | 2 | 0 / - | 2 / -0.05 | 0 / - | 0 / - | no | - | -  |
| ATM 5m v2 y2025 | 4 | 1 / -1.01 | 0 / - | 1 / +1.49 | 2 / -0.50 | no | - | -1.18  |
| ATM 5m owner's own tiers dev | 5 | 1 / -1.02 | 3 / +0.10 | 1 / +1.77 | 0 / - | no | -0.67 | -2.78  |
| ATM 5m owner's own tiers confirm | 2 | 0 / - | 1 / -1.02 | 1 / +0.92 | 0 / - | no | - | -  |
| ATM 5m owner's own tiers y2025 | 4 | 1 / +1.49 | 2 / -0.50 | 1 / -1.01 | 0 / - | yes | - | +2.50  |

| policy | trades | /wk | net $ | PF | max DD $ | 50K pass % (zero-edge) | losing months |
|---|---:|---:|---:|---:|---:|---|---:|
| ATM 5m base ytd | 7 | 0.17 | +215 | 1.25 | -511 | None (None) | 2 |
| ATM 5m v1 drop ytd | 5 | 0.12 | -822 | 0.3 | -822 | None (None) | 3 |
| ATM 5m v1 tier ytd | 6 | 0.15 | -652 | 0.45 | -652 | None (None) | 3 |
| ATM 5m v2 drop ytd | 3 | 0.07 | -112 | 0.67 | -335 | None (None) | 2 |
| ATM 5m v2 tier ytd | 3 | 0.07 | -112 | 0.67 | -335 | None (None) | 2 |
| ATM 5m base y2025 | 4 | 0.11 | +69 | 1.17 | -418 | None (None) | 2 |
| ATM 5m v1 drop y2025 | 1 | 0.03 | +482 | 99.0 | 0 | None (None) | 0 |
| ATM 5m v1 tier y2025 | 4 | 0.11 | +66 | 1.16 | -418 | None (None) | 2 |
| ATM 5m v2 drop y2025 | 1 | 0.03 | -559 | 0.0 | -559 | None (None) | 1 |
| ATM 5m v2 tier y2025 | 2 | 0.05 | -398 | 0.29 | -559 | None (None) | 1 |

## 4. Experience layer (Alt-2): what the brain learned

Memory: 1022 de-duplicated past trades (engine 2021-2026, both beds). Monthly log: `NARRATIVE_EXPERIENCE_LOG.md`. Final trust multipliers (2026-10):

| element | trust | evidence |
|---|---:|---|
| bias alignment | x0.70 | liked vs disliked: -0.08R (n~106) vs +0.04R (n~129) |
| manipulation into the draw | x0.38 | liked vs disliked: -0.09R (n~87) vs +0.18R (n~87) |
| premium/discount location | x1.27 | liked vs disliked: +0.10R (n~252) vs +0.01R (n~164) |
| time of day | x0.75 | liked vs disliked: +0.04R (n~231) vs +0.13R (n~252) |
| displacement / V quality | x0.03 | liked vs disliked: +0.09R (n~294) vs +0.54R (n~41) |
| SMT / NQ-vs-ES | x0.88 | liked vs disliked: +0.02R (n~141) vs +0.07R (n~88) |
| room in the day's range | x0.98 | liked vs disliked: +0.07R (n~352) vs +0.07R (n~187) |
| path resistance | x1.09 | liked vs disliked: +0.12R (n~104) vs +0.09R (n~335) |
| news | x0.70 | the rest vs disliked: +0.06R (n~491) vs +0.19R (n~48) |
| PO3 open location | x1.20 | liked vs the rest: +0.16R (n~32) vs +0.06R (n~508) |

## 5. Brain management (Alt-3): `manage()` instead of the engine's exits, same entries, flat $350

| period | engine avg R | brain avg R | engine net | brain net | brain PF | brain max DD |
|---|---:|---:|---:|---:|---:|---:|
| dev | -0.016 | +0.089 | +592 | +1,459 | 1.2 | -2,350 |
| confirm | +0.920 | +0.277 | +11,038 | +3,971 | 1.83 | -927 |
| ytd | +0.377 | +0.168 | +11,630 | +5,430 | 1.45 | -3,163 |
| y2025 | -0.046 | -0.100 | +1,361 | -182 | 0.99 | -3,173 |

## 6. Daily bias: does trading WITH the bias help? (owner request)

Aligned = trade direction equals the bias; counter = opposite; neutral days not shown. Bias definitions (all causal at the decision time): `brain_composite` = the narrative's bias after the intraday failure check (v1 E1); `brain_premarket` = the same at 09:30; `ttrades_b1` = TTrades candle-closure target side; `daily_bos` / `h1_bos` = last daily / 1H BOS; `htf_draw_b2` = the B2 best-scored draw side (two-sided days = neutral).

| bed | bias | aligned n / avg R | counter n / avg R | aligned minus counter [95% CI] |
|---|---|---|---|---|
| engine | brain_composite | 43 / -0.10 | 55 / +0.16 | -0.26 [-0.77, +0.21] |
| engine | brain_premarket | 74 / -0.11 | 74 / +0.21 | -0.33 [-0.77, +0.10] |
| engine | ttrades_b1 | 91 / -0.05 | 94 / +0.24 | -0.29 [-0.70, +0.10] |
| engine | daily_bos | 97 / +0.19 | 114 / +0.10 | +0.09 [-0.32, +0.47] |
| engine | h1_bos | 94 / +0.15 | 117 / +0.13 | +0.02 [-0.37, +0.41] |
| engine | htf_draw_b2 | 48 / +0.06 | 61 / +0.05 | +0.02 [-0.53, +0.58] |
| engine_2021_2024 | brain_composite | 124 / -0.04 | 165 / +0.01 | -0.05 [-0.32, +0.21] |
| engine_2021_2024 | brain_premarket | 282 / +0.01 | 222 / +0.07 | -0.06 [-0.27, +0.16] |
| engine_2021_2024 | ttrades_b1 | 344 / -0.05 | 312 / +0.04 | -0.09 [-0.28, +0.10] |
| engine_2021_2024 | daily_bos | 358 / +0.01 | 353 / -0.01 | +0.02 [-0.16, +0.20] |
| engine_2021_2024 | h1_bos | 319 / -0.00 | 392 / +0.00 | -0.00 [-0.18, +0.18] |
| engine_2021_2024 | htf_draw_b2 | 183 / -0.06 | 215 / -0.04 | -0.02 [-0.25, +0.23] |
| silver_bullet | brain_composite | 21 / +0.23 | 27 / -0.11 | +0.34 [-0.59, +1.27] |
| silver_bullet | brain_premarket | 54 / -0.13 | 76 / -0.08 | -0.05 [-0.57, +0.49] |
| silver_bullet | ttrades_b1 | 91 / -0.04 | 75 / -0.10 | +0.06 [-0.44, +0.52] |
| silver_bullet | daily_bos | 77 / -0.11 | 109 / -0.05 | -0.05 [-0.51, +0.41] |
| silver_bullet | h1_bos | 88 / +0.06 | 98 / -0.19 | +0.25 [-0.22, +0.73] |
| silver_bullet | htf_draw_b2 | 62 / +0.04 | 36 / -0.01 | +0.05 [-0.69, +0.76] |
| mech_ifvg | brain_composite | 9 / +0.33 | 54 / +0.02 | +0.31 [-0.38, +0.96] |
| mech_ifvg | brain_premarket | 51 / -0.10 | 57 / +0.02 | -0.12 [-0.56, +0.31] |
| mech_ifvg | ttrades_b1 | 65 / -0.14 | 76 / -0.17 | +0.04 [-0.33, +0.38] |
| mech_ifvg | daily_bos | 78 / -0.23 | 79 / -0.04 | -0.19 [-0.55, +0.16] |
| mech_ifvg | h1_bos | 42 / +0.20 | 115 / -0.25 | +0.45 [+0.05, +0.88] |
| mech_ifvg | htf_draw_b2 | 43 / -0.11 | 48 / -0.04 | -0.07 [-0.55, +0.43] |
| ict2022 | brain_composite | 44 / -0.08 | 2 / -1.03 | +0.94  |
| ict2022 | brain_premarket | 67 / -0.05 | 4 / -0.42 | +0.38 [-0.29, +1.02] |
| ict2022 | ttrades_b1 | 90 / -0.13 | 0 / - | -  |
| ict2022 | daily_bos | 55 / -0.10 | 42 / -0.12 | +0.02 [-0.41, +0.44] |
| ict2022 | h1_bos | 42 / +0.10 | 55 / -0.26 | +0.35 [-0.09, +0.81] |
| ict2022 | htf_draw_b2 | 19 / -0.02 | 33 / -0.12 | +0.10 [-0.44, +0.65] |
| atm | brain_composite | 13 / +0.07 | 20 / +0.03 | +0.04 [-1.06, +1.16] |
| atm | brain_premarket | 21 / -0.07 | 20 / +0.03 | -0.11 [-1.14, +0.81] |
| atm | ttrades_b1 | 25 / +0.08 | 25 / -0.22 | +0.30 [-0.54, +1.16] |
| atm | daily_bos | 29 / +0.07 | 28 / -0.03 | +0.09 [-0.75, +0.85] |
| atm | h1_bos | 20 / -0.02 | 37 / +0.04 | -0.06 [-0.84, +0.75] |
| atm | htf_draw_b2 | 13 / -0.59 | 13 / +0.37 | -0.96 [-1.96, +0.07] |

### `require_bias_alignment` (skip counter-bias setups unless the bias is neutral; brain composite bias), off vs on

| bed | period | off: as traded | off: v1 tier | on: flat $350 | on: v1 tier |
|---|---|---|---|---|---|
| engine | dev | 54 tr, 2.11/wk, +592, PF 1.11 | 50 tr, 1.95/wk, -1,516, PF 0.79 | 36 tr, 1.41/wk, +646, PF 1.14 | 35 tr, 1.37/wk, -827, PF 0.85 |
| engine | confirm | 39 tr, 2.5/wk, +11,038, PF 5.15 | 30 tr, 1.92/wk, +6,583, PF 3.67 | 29 tr, 1.86/wk, +8,688, PF 4.69 | 24 tr, 1.54/wk, +4,560, PF 2.98 |
| engine | ytd | 93 tr, 2.26/wk, +11,630, PF 2.41 | 80 tr, 1.94/wk, +5,067, PF 1.53 | 65 tr, 1.58/wk, +9,333, PF 2.33 | 59 tr, 1.43/wk, +3,733, PF 1.47 |
| engine | y2025 | 118 tr, 3.17/wk, +1,361, PF 1.14 | 106 tr, 2.85/wk, +968, PF 1.07 | 91 tr, 2.45/wk, -2,192, PF 0.81 | 86 tr, 2.31/wk, +1,263, PF 1.11 |
| silver_bullet | dev | 62 tr, 2.42/wk, +1,066, PF 1.08 | 46 tr, 1.8/wk, +1,465, PF 1.2 | 51 tr, 1.99/wk, +1,210, PF 1.11 | 39 tr, 1.52/wk, +2,334, PF 1.4 |
| silver_bullet | confirm | 32 tr, 2.05/wk, -3,079, PF 0.61 | 27 tr, 1.73/wk, -2,492, PF 0.49 | 29 tr, 1.86/wk, -3,982, PF 0.46 | 25 tr, 1.6/wk, -2,871, PF 0.37 |
| silver_bullet | ytd | 94 tr, 2.28/wk, -2,013, PF 0.91 | 73 tr, 1.77/wk, -1,027, PF 0.91 | 80 tr, 1.94/wk, -2,772, PF 0.85 | 64 tr, 1.55/wk, -536, PF 0.95 |
| silver_bullet | y2025 | 92 tr, 2.47/wk, -1,314, PF 0.93 | 65 tr, 1.75/wk, -50, PF 1.0 | 79 tr, 2.12/wk, +254, PF 1.02 | 58 tr, 1.56/wk, +50, PF 1.0 |
| mech_ifvg | dev | 53 tr, 2.07/wk, -2,121, PF 0.75 | 45 tr, 1.76/wk, -3,173, PF 0.53 | 34 tr, 1.33/wk, -1,520, PF 0.69 | 30 tr, 1.17/wk, -1,308, PF 0.68 |
| mech_ifvg | confirm | 27 tr, 1.73/wk, +130, PF 1.04 | 26 tr, 1.67/wk, -905, PF 0.75 | 16 tr, 1.03/wk, -1,987, PF 0.22 | 16 tr, 1.03/wk, -1,948, PF 0.22 |
| mech_ifvg | ytd | 80 tr, 1.94/wk, -1,991, PF 0.83 | 71 tr, 1.72/wk, -4,078, PF 0.61 | 50 tr, 1.21/wk, -3,507, PF 0.53 | 46 tr, 1.12/wk, -3,255, PF 0.5 |
| mech_ifvg | y2025 | 77 tr, 2.07/wk, -2,864, PF 0.74 | 73 tr, 1.96/wk, -2,362, PF 0.75 | 53 tr, 1.42/wk, -1,875, PF 0.76 | 53 tr, 1.42/wk, -1,444, PF 0.8 |
| ict2022 | dev | 36 tr, 1.41/wk, +709, PF 1.16 | 32 tr, 1.25/wk, +2,063, PF 1.39 | 35 tr, 1.37/wk, +1,066, PF 1.27 | 31 tr, 1.21/wk, +2,259, PF 1.45 |
| ict2022 | confirm | 18 tr, 1.15/wk, -2,623, PF 0.33 | 15 tr, 0.96/wk, -3,022, PF 0.23 | 17 tr, 1.09/wk, -2,284, PF 0.36 | 15 tr, 0.96/wk, -3,022, PF 0.23 |
| ict2022 | ytd | 54 tr, 1.31/wk, -1,914, PF 0.77 | 47 tr, 1.14/wk, -959, PF 0.9 | 52 tr, 1.26/wk, -1,218, PF 0.84 | 46 tr, 1.12/wk, -763, PF 0.92 |
| ict2022 | y2025 | 43 tr, 1.16/wk, -1,662, PF 0.78 | 35 tr, 0.94/wk, -979, PF 0.86 | 43 tr, 1.16/wk, -1,306, PF 0.82 | 35 tr, 0.94/wk, -979, PF 0.86 |
| atm | dev | 36 tr, 1.41/wk, +2,400, PF 1.36 | 35 tr, 1.37/wk, +1,545, PF 1.2 | 23 tr, 0.9/wk, +673, PF 1.15 | 23 tr, 0.9/wk, +1,866, PF 1.31 |
| atm | confirm | 21 tr, 1.35/wk, -1,969, PF 0.51 | 21 tr, 1.35/wk, -813, PF 0.77 | 14 tr, 0.9/wk, -628, PF 0.73 | 14 tr, 0.9/wk, +11, PF 1.0 |
| atm | ytd | 57 tr, 1.38/wk, +431, PF 1.04 | 56 tr, 1.36/wk, +733, PF 1.07 | 37 tr, 0.9/wk, +45, PF 1.01 | 37 tr, 0.9/wk, +1,877, PF 1.22 |
| atm | y2025 | 0 tr, 0.0/wk, +0, PF None | 0 tr, 0.0/wk, +0, PF None | 0 tr, 0.0/wk, +0, PF None | 0 tr, 0.0/wk, +0, PF None |

## 7. Does the pre-market narrative predict the day? (all sessions, descriptive)

| year | days | bias days | bias = RTH direction % | high-conviction = RTH dir % (n) | primary draw hit % | nearest opposite pool hit % (pairs) | RTH range / ADR by day type |
|---|---:|---:|---:|---|---:|---|---|
| 2022 | 244 | 174 | 50.0 | 51.0 (102) | 53.6 | 44.6 (168) | {'consolidation': [23, 0.95], 'expansion': [90, 0.82], 'normal': [131, 0.81]} |
| 2023 | 248 | 167 | 51.5 | 56.5 (108) | 52.6 | 49.4 (154) | {'consolidation': [18, 1.03], 'expansion': [99, 0.84], 'normal': [131, 0.85]} |
| 2024 | 249 | 178 | 47.8 | 45.9 (111) | 51.2 | 46.3 (164) | {'consolidation': [15, 1.19], 'expansion': [86, 0.84], 'normal': [148, 0.82]} |
| 2025 | 247 | 169 | 50.3 | 47.6 (105) | 49.7 | 57.5 (153) | {'consolidation': [19, 0.87], 'expansion': [94, 0.75], 'normal': [134, 0.86]} |
| 2026 | 199 | 139 | 52.5 | 48.8 (80) | 54.5 | 53.0 (132) | {'consolidation': [26, 0.8], 'expansion': [55, 0.69], 'normal': [118, 0.83]} |

## 8. Which trader judgments does the data agree with? (descriptive map, every element on every bed)

Cell = avg R when the element liked the trade minus avg R when it disliked it (or vs the rest when one side is thin). Many cells are tested here, so expect several |diffs| of 0.3R by luck alone; look for the same sign everywhere.

| element | engine_2026 | engine_2025 | engine_2021_24 | silver_bullet | mech_ifvg | ict2022 |
|---|---:|---:|---:|---:|---:|---:|
| bias alignment (E1_align) | -0.26 | -0.21 | -0.05 | +0.34 | +0.31 | +0.04 |
| manipulation into the draw (E2_manip) | -0.92 | -0.07 | -0.13 | -0.04 | +0.23 | -0.22 |
| premium/discount location (E3_location) | +0.47 | -0.02 | -0.11 | -0.01 | -0.02 | -0.19 |
| time of day (E4_timing) | -0.39 | +0.12 | +0.04 | +0.32 | -0.44 | -0.32 |
| displacement / V quality (E5_quality) | -1.18 | -0.67 | +0.01 | -0.27 | -0.20 | +0.18 |
| SMT / NQ-vs-ES (E6_intermarket) | -0.12 | +0.16 | thin | +0.28 | +0.19 | +0.07 |
| room in the day's range (E7_room) | -0.03 | +0.35 | +0.12 | -0.14 | -0.27 | -0.17 |
| path resistance (E8_path) | +0.22 | -0.15 | +0.07 | -0.25 | -0.09 | +0.24 |
| news (E9_news) | -0.32 | +0.57 | -0.47 | +0.49 | -0.06 | -0.27 |
| PO3 open location (E10_po3) | thin | +0.19 | +0.06 | thin | thin | -0.07 |
| H1_htf (H1_htf) | +0.17 | -0.08 | +0.01 | +0.13 | +0.16 | +0.46 |
| H2_b1 (H2_b1) | +0.36 | -0.08 | +0.04 | -0.10 | +0.43 | -0.24 |
| H3_oneside (H3_oneside) | thin | thin | +0.00 | +0.01 | -0.05 | thin |
| H4_sides (H4_sides) | -0.67 | -0.25 | +0.17 | +0.15 | -0.36 | +0.64 |
| H5_time (H5_time) | -0.43 | -0.07 | +0.12 | thin | -0.07 | +0.12 |
| H6_lunch (H6_lunch) | thin | thin | thin | thin | thin | thin |
| H7_disp (H7_disp) | -1.14 | +0.43 | +0.08 | -0.41 | -0.29 | -0.16 |
| H8_smt (H8_smt) | -0.45 | +0.22 | thin | +0.33 | +0.15 | -0.03 |
| H9_news (H9_news) | -0.32 | +0.57 | -0.47 | +0.49 | -0.06 | -0.27 |
| H10_room (H10_room) | +0.29 | +0.44 | +0.09 | -0.00 | -0.35 | -0.21 |
| H11_draw (H11_draw) | +0.20 | -0.33 | -0.08 | +0.17 | +0.03 | +0.10 |
| H12_od (H12_od) | thin | thin | +0.36 | +0.45 | thin | thin |
| H13_ib (H13_ib) | +0.40 | +0.08 | +0.09 | +0.16 | thin | +0.36 |
| H14_gap (H14_gap) | -0.19 | -0.46 | +0.21 | -0.70 | -0.06 | +0.63 |
| H15_10am (H15_10am) | thin | -0.21 | -0.11 | +0.19 | -0.04 | thin |
| H16_obst (H16_obst) | +0.30 | +0.78 | +0.01 | -0.27 | +0.45 | -0.62 |
