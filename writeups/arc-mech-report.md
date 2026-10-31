# MECH report: the public Mechanical Model / IFVG model on NQ and ES (2026-10-16)

**Verdict: no.** As publicly taught and built on 5m bars, the model has no edge on NQ or ES. It loses on both symbols in
2026 YTD and in 2025. It never beats the zero-edge 50K eval baseline, and no variant clears the lab gate in any period. The
only positive line is NQ + SMT. That line trades 0.56 times a week, loses in 2025, and the same SMT rule is the worst
variant on ES, so it reads as noise. Do not wire this into the bot as a money strategy. If the owner wants a famous public
model on screen, run `MECH_NQ_base` paper-only.

| | |
|---|---|
| **Rules** | `research/lab/MECH_RULES.md` (10 numbered rules, sources, the disagreements and what we picked) |
| **Model** | `tools/lab_models/mech_ifvg.py` (`run`, `state`) |
| **Runner** | `tools/lab_mech_run.py` (one run of all 3 variants), tables from `tools/lab_mech_report.py` |
| **Trades** | `research/lab/MECH_trades_<SYM>_<variant>.json` |
| **Scorecards** | `research/lab/MECH_<SYM>_<variant>__<period>.json`, `research/lab/MECH_results.json` |

## Setup

**Data.** TradingView CME futures **NQ1! / ES1!**, 5m bars, as refreshed on 2026-10-16 and running through 16:55 ET that
day. Official CME data only, no CFD. ES history starts 2025-04-13, so the first ES day has no prior-day levels.

**Costs** (`strategy_lab.make_trade`):
- MNQ $2/pt, MES $5/pt
- $1.40 round trip per micro
- 1 tick slippage on the market entry and on stop, break-even and time exits
- targets fill at the limit price on a touch, which is slightly generous

**Risk.**
- $350 fixed risk, floored to whole micros
- max 2 trades a day; done after a winner or after 2 losers; −$700 daily stop
- flat at 15:55 ET

**Variants.** Exactly three configurations were scored, once each:

| variant | rules |
|---|---|
| `base` | rules 1–10: NY AM 09:30–11:00, a sweep of PDH/PDL, Asia, London or 1H swing liquidity, a 5m IFVG body close, stop beyond the sweep, target the nearest liquidity at ≥1R (capped at 3R), BE at +1R |
| `smt` | base + SMT required: the partner index did not take its matching level |
| `rr2` | base with a fixed 2R target |

No other configuration was searched. Before the research was in, an earlier draft (target ≥2R, no break-even) was run once
as an unscored mechanics check. We looked at fills and counts only, not its P&L. The final rules come from the research,
not from that run.

**How to read the eval columns.** The pass % is the rolling MFFU Builder 50K pass rate: a fresh eval starts on every day
(target +$3,000, $2,000 EOD trailing MLL). The zero-edge % is the same day series with the average trade-day P&L removed.
"n/a" means no eval finished inside the window, i.e. too few trades to reach either +$3k or −$2k.

## Results

### NQ (MNQ)

| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | worst day $ | 50K pass % | zero-edge % | edge pts |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| base | ytd | 80 | 1.94 | 30.0 | -0.137 [-0.39, +0.13] | 0.83 | -1,991 | -3,537 | -632 | 0.0 | 0.0 | +0.0 |
| base | aug_oct | 17 | 1.55 | 29.4 | -0.004 [-0.52, +0.58] | 1.1 | +196 | -1,467 | -339 | n/a | n/a | n/a |
| base | y2025 | 77 | 2.07 | 31.2 | -0.125 [-0.35, +0.12] | 0.74 | -2,864 | -4,236 | -358 | 0.0 | 0.0 | +0.0 |
| base | all18m | 157 | 2.0 | 30.6 | -0.131 [-0.30, +0.04] | 0.79 | -4,855 | -6,750 | -632 | 0.0 | 0.0 | +0.0 |
| smt | ytd | 23 | 0.56 | 43.5 | +0.137 [-0.42, +0.71] | 1.55 | +1,582 | -1,244 | -339 | n/a | n/a | n/a |
| smt | aug_oct | 6 | 0.55 | 33.3 | +0.394 [-0.85, +1.73] | 1.95 | +814 | -642 | -339 | n/a | n/a | n/a |
| smt | y2025 | 29 | 0.78 | 31.0 | -0.072 [-0.43, +0.31] | 0.79 | -805 | -1,973 | -339 | 0.0 | n/a | n/a |
| smt | all18m | 52 | 0.66 | 36.5 | +0.020 [-0.31, +0.37] | 1.11 | +777 | -1,973 | -339 | 0.0 | 0.0 | +0.0 |
| rr2 | ytd | 87 | 2.11 | 26.4 | -0.236 [-0.45, -0.01] | 0.67 | -4,395 | -5,739 | -632 | 0.0 | 0.0 | +0.0 |
| rr2 | aug_oct | 18 | 1.64 | 33.3 | -0.029 [-0.50, +0.48] | 1.12 | +265 | -1,647 | -339 | n/a | n/a | n/a |
| rr2 | y2025 | 85 | 2.28 | 28.2 | -0.155 [-0.38, +0.07] | 0.71 | -3,580 | -4,749 | -358 | 0.0 | 0.0 | +0.0 |
| rr2 | all18m | 172 | 2.19 | 27.3 | -0.196 [-0.35, -0.04] | 0.69 | -7,975 | -9,318 | -632 | 0.0 | 0.0 | +0.0 |

### ES (MES)

| variant | period | trades | /wk | win % | avg R [95% CI] | PF | net $ | max DD $ | worst day $ | 50K pass % | zero-edge % | edge pts |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| base | ytd | 94 | 2.28 | 26.6 | -0.202 [-0.42, +0.03] | 0.62 | -6,180 | -6,974 | -371 | 0.0 | 15.9 | -15.9 |
| base | aug_oct | 19 | 1.73 | 36.8 | -0.010 [-0.51, +0.54] | 0.99 | -44 | -1,133 | -369 | n/a | n/a | n/a |
| base | y2025 | 58 | 1.56 | 31.0 | -0.128 [-0.39, +0.16] | 0.74 | -2,446 | -3,700 | -376 | 0.0 | 0.0 | +0.0 |
| base | all18m | 152 | 1.94 | 28.3 | -0.174 [-0.34, +0.00] | 0.67 | -8,626 | -10,487 | -376 | 0.0 | 3.8 | -3.8 |
| smt | ytd | 24 | 0.58 | 16.7 | -0.466 [-0.76, -0.13] | 0.26 | -3,426 | -3,562 | -369 | 0.0 | n/a | n/a |
| smt | aug_oct | 8 | 0.73 | 25.0 | -0.421 [-0.96, +0.30] | 0.38 | -1,073 | -1,209 | -369 | n/a | n/a | n/a |
| smt | y2025 | 13 | 0.35 | 23.1 | -0.267 [-0.70, +0.23] | 0.49 | -1,110 | -1,460 | -376 | n/a | n/a | n/a |
| smt | all18m | 37 | 0.47 | 18.9 | -0.396 [-0.66, -0.11] | 0.33 | -4,536 | -5,022 | -376 | 0.0 | n/a | n/a |
| rr2 | ytd | 101 | 2.45 | 23.8 | -0.171 [-0.39, +0.04] | 0.67 | -5,595 | -6,425 | -371 | 0.0 | 12.8 | -12.8 |
| rr2 | aug_oct | 20 | 1.82 | 25.0 | -0.154 [-0.63, +0.38] | 0.74 | -887 | -1,377 | -369 | n/a | n/a | n/a |
| rr2 | y2025 | 67 | 1.8 | 31.3 | -0.011 [-0.28, +0.29] | 0.95 | -478 | -2,988 | -376 | 0.0 | 0.0 | +0.0 |
| rr2 | all18m | 168 | 2.14 | 26.8 | -0.107 [-0.29, +0.06] | 0.78 | -6,074 | -9,139 | -376 | 0.0 | 0.0 | +0.0 |

Back-to-back 50K evals (pass/fail):
- NQ base 0/5 over 18 months; NQ smt 0/1; NQ rr2 0/7
- ES base 0/5; ES smt 0/2; ES rr2 0/5

No variant passed a single eval.

## 2026 by month (trades / net $)

**NQ**

| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct (to 16th) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | 10 / -1,160 | 8 / +527 | 11 / -545 | 8 / -388 | 11 / -423 | 5 / -130 | 10 / -66 | 6 / +709 | 7 / -1,164 | 4 / +651 |
| smt | 1 / +24 | 3 / -123 | 3 / +81 | 1 / +482 | 3 / +815 | 2 / +307 | 4 / -818 | 2 / +546 | 1 / -339 | 3 / +607 |
| rr2 | 12 / -2,171 | 10 / -63 | 12 / -556 | 9 / -723 | 11 / -637 | 5 / -147 | 10 / -362 | 7 / +388 | 7 / -1,164 | 4 / +1,041 |

**ES**

| variant | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct (to 16th) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | 15 / -3,340 | 9 / +1,418 | 11 / -1,251 | 7 / -1,456 | 9 / -817 | 15 / -1,170 | 9 / +480 | 8 / +177 | 8 / +140 | 3 / -361 |
| smt | 3 / -970 | 1 / +175 | 2 / -544 | 0 / 0 | 3 / -58 | 5 / -1,055 | 2 / +100 | 5 / -841 | 2 / +87 | 1 / -320 |
| rr2 | 17 / -3,142 | 10 / +1,222 | 12 / -970 | 7 / -1,336 | 10 / -684 | 15 / -1,365 | 10 / +1,566 | 8 / +157 | 9 / -1,002 | 3 / -41 |

Base losing months in 2026: NQ 7 of 10, ES 6 of 10.

## What the trades look like (all 18 months, descriptive only; none of this was tested as a rule)

| | NQ base | ES base |
|---|---|---|
| exits | 52% full stop, 20% target, 15% break-even scratch, 13% 15:55 time exit | 51% stop, 23% target, 20% BE, 6% time |
| median stop | 81 pts; about 95 pts in 2026 | 15 pts |
| win rate (BE scratches excluded) | 36% | 35% |
| average target | 1.9R (median 1.7R) | similar |
| sizing | 45% of trades are 1 micro, so the average dollar risk taken is about $277, not $350 | about $306 average risk |
| long vs short avg R | +0.02 long, −0.30 short | −0.17 long, −0.18 short |

1H swing highs/lows make up about two-thirds of all swept levels on both symbols. London, Asia and prior-day levels make up
the other third.

The published claims are 70%+ win rates. Measured on 5m, the win rate is about 30%, and the full-stop rate is about 50%.

## Caveats (they cut both ways)

1. **5m is not how it is traded.**
   - PB confirms on 1–5m and takes the highest timeframe with a gap in the leg. We have only 5m history, so we trade only
     5m inversions. Legs whose only gap is on 1–4m are skipped.
   - Our stops are wide (median NQ about 81–95 pts) because they sit at the 5m swing extreme. Real 1–3m entries would have
     tighter stops, more trades and different outcomes.
   - The repo's 1m files cover only a few weeks, far too short for an honest test.
2. **Discretion that cannot be coded is missing.** This is PB's 2026 version: the HTF Daily/4H/1H FVG-respect bias, the
   HTF key levels (FVG, CISD, rejection block) and "closest obvious high/low" target picking. The older Mech Model says
   HTF bias is not needed, and we follow that.
3. **Our own choices where the teaching is vague.** These were fixed before scoring and never tuned:
   - the leg = the 12 bars (1 hour) before the extreme
   - the first gap to be inverted
   - a stop 1 tick beyond the extreme
   - target the nearest liquidity at ≥1R, capped at 3R
   - BE at +1R
4. **Samples are small.** Every 95% CI on avg R includes 0 except NQ rr2 (all18m, ytd) and ES smt (all18m, ytd), which are
   negative. The NQ+SMT result (+$1,582 YTD) is 23 trades with a CI of [−0.42, +0.71] R, and it fails the owner's 1–4
   trades/week rule (0.56/wk).
5. **Fill model.** Targets fill on a touch (slightly generous) and stops pay 1 tick. A stricter trade-through fill would
   make the results worse.

## Bottom line for tonight

| | NQ | ES |
|---|---|---|
| best variant | `smt`, the only non-negative line | `rr2`, the least bad |
| ytd | +$1,582, PF 1.55, 0.56/wk | −$5,595, PF 0.67 |
| aug_oct | +$814, PF 1.95, 6 trades | −$887 |
| y2025 | −$805, PF 0.79 | −$478, PF 0.95 |
| 50K eval vs zero-edge | 0%, or n/a for lack of finished evals, vs 0%. No edge | 0% vs 12.8% (ytd) |

- **NQ base,** the "as taught" version: ytd −$1,991, aug_oct +$196, y2025 −$2,864.
- **ES base:** ytd −$6,180, aug_oct −$44, y2025 −$2,446.

None of these beats the zero-edge eval baseline. None should go live for money. The module follows the plug-in interface
(`run`, `state`) and can be shown on the dashboard or paper-traded as a public reference model.
