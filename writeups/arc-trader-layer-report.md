# TRADER LAYER report: every model traded "like a person", raw vs layer

Written 2026-10-16 20:00-20:30 ET. Real CME futures only: TradingView NQ1!/ES1! 5m, plus NQ1! 1m for 2026. Rules are
in `research/lab/TRADER_LAYER_RULES.md` (configs fixed at 19:25-19:45, before any result; later rows are labeled).
All periods and configs are in `research/lab/TRADER_LAYER_tables.md`.

## Verdict

1. **The layer works as a machine.** It trades any model's entries with the brain's judgment, the liquidity map's
   targets, playbook management and the risk manager's sizing, and writes a thought log for every trade. The replay
   check reproduces SB 94/94 and CONT 20/20 raw trades exactly (M22 53/54).
2. **It does not help consistently.** It turns the three weak ICT models positive in 2026: SB goes from -$2,013 to
   +$2,537, M22 from -$1,914 to +$1,013, and MECH from -$1,991 to about $0. Drawdowns roughly halve. But SB and M22
   get worse in 2025. It cuts the Liquidity Engine's 2026 by about 70% (+$11.6k to +$3.2k), almost all of it in Aug-Oct.
3. **Frequency breaks.** The person's vetoes remove 25-50% of setups. Single models drop to 0.15-1.6 trades a week
   in 2026 (most 0.6-1.6), under the owner's 1-4/week rule. Only the pooled portfolio (PORT) stays in range, at 3.7/wk in 2026 and 4.7/wk
   in 2025.
4. **What each piece does** (net $, FULL vs the same config with that piece off, 20 model-years):

   | piece | helps in | notes |
   |---|---|---|
   | management | 13/20 | helps in 2026, hurts the ICT models in 2025; regime-dependent, as the old engine tests found |
   | judgment (brain + vetoes) | 12/20 | the most consistent piece |
   | sizing | 8/20 | grades don't rank trades, so tier sizing is noise |
   | liquidity-map targets | 5/20 | the most consistent loser |

   Within judgment, only two vetoes removed raw losers in both years: **FOMC day** (avg -0.52R) and **fading an open
   drive** (avg -0.21R). The targets lose because the HRLR rule sends about two-thirds of trades (58-73%) "all out at
   the first draw", with a median target of about 1.4-1.9R.
5. **Bias.** No bias option helps both years. `require` (narrative bias) cuts 25-40% of trades. `skip_counter` with
   the bias study's best method (`open_amd`) helps the engine in 2026 but not in 2025, so by the coordinator's
   pre-set rule **the final pick keeps bias as grade/context only.**
6. **Coordinator variants.**
   - Retest entries fill 70-90% of the time. On the same days they beat the market entry, but they miss the runaway
     winners, so they lose in every model-year except CONT.
   - The ATM "recent swing" stop rarely exists: only 11 of 57 V's have a 2-bar swing between the sweep extreme and
     the entry. The 5 taken trades that used it lost.
7. **ATM, the owner's model.**
   - FULL turns Jul-Oct from -$1,969 into -$36, but also erases Jan-Jun (+$2,400 becomes -$201).
   - The best ATM row is the layer with ATM's own opposite-side target (`noP`), positive in both halves:
     - ATM1M: +$497 / +$251
     - ATM1MB: +$922 / +$420
   - It trades only 0.6-0.7 a week (raw 1.2-1.4), so it is under the 1-2/week ask.
   - Nothing rescues Jul-Oct at full frequency.
8. **Best combination (pre-registered): Liquidity Engine at 2/day + FULL layer (`ENG2 FULL`).**
   - It is the only pre-registered row positive in dev, confirm and 2025:
     - net +$1,390 / +$2,270 / +$2,980
     - PF 1.32 / 1.58 / 1.25
   - It is not a clear win:
     - it fails the lab gate on frequency (1.4-1.9/wk in 2026);
     - its 2025 max drawdown is -$3,171;
     - its 2025 dollars come from tier sizing (avg R +0.01);
     - it earns a third of the raw engine in 2026.
   - **Recommendation: keep the engine's own exits.**
     - Adopt only "no entries on FOMC days" from this layer (as CONFLUENCE_RESULTS also suggested).
     - Treat the layer as a deployable option for the weak ICT models, not as an edge.

## 1. What was built

| file | what |
|---|---|
| `tools/trader_layer.py` | `apply(setups, bars5, es5, config, log, bars1)` -> `make_trade`-format trades plus `grade`, `plan`, `thoughts`, `mgmt`, `legs`. `setups_from_trades(trades, kind)` turns any model's trade list into setups. `Layer` keeps the simulated eval account. Option helpers: `trigger_zone` / `retest_fill` (retest entry) and `recent_swing_stop` (ATM). |
| `tools/lab_models/with_trader.py` | Live plug-in: `run(bars5, params, es5)` + `state()`, with `params = {"base": "<module>", "base_params": {...}, "layer": {...}}`. Bonus: `base: "engine"` runs `engine.model.Engine` on the same frame and trades its entries. An open trade carries the CURRENT stop, next target and open contracts (after BE / trail). Tested through `engine/lab_adapter.run("with_trader", ...)` with silver_bullet, atm, mech_ifvg and engine. |
| `tools/lab_trader_run.py` | `run` (the batch, single process, about 2 min for everything) and `tables`. |
| `research/lab/TRADER_LAYER_*` | rules, report, tables, results JSON, trades and decision logs per source/config (with thoughts). Scorecards `TRADER_LAYER_{ENG2_FULL,ENG1_FULL,ATM1M_noP}__<period>.json` are the only `score()` calls: 3 named rows, 6 confirm-log lines (confirm + ytd each). |

**How the person trades a setup.**

1. **Judgment.**
   - The brain is `narrative()` + `assess()` (v1, the version frozen at 19:15). It grades A/B/C/SKIP with thoughts and
     judges the layer's own plan.
   - Hard vetoes:
     - news window;
     - lunch 11:35-13:30;
     - 08:30 release day before 09:45;
     - FOMC day;
     - after 15:30;
     - fading an open drive;
     - fading a trend day.
   - A frequency guard turns a brain SKIP into a small C trade when fewer than 2 trades were taken in the last 5
     sessions.
2. **Stop.** The model's invalidation plus max(2 ticks, 0.1 ATR14). It is never tightened.
3. **Targets.** From `liquidity_map.draws()`, fed the brain's pools and gaps:
   - Final target, first that applies:
     - the TTrades draw (PDH/PDL after a close beyond the day-before high/low);
     - else the most significant Tier A/B ERL at least 1R away and within reach;
     - else the nearest draw at least 1R away.
   - Skip when nothing is at least 1R inside today's reach.
   - The inside-open one-side rule removes the opposite prior-day extremes.
   - A target at 3R or more gets a 50% partial at the first internal draw.
   - Consolidation day, PM, or HRLR: all out at the first draw.
4. **Management.** The playbook's MGMT-2/3/5/6/7: BE at TP1 or +1R, structure trail, opposing CISD with displacement,
   giveback, 12-bar stall, 12:00 unprotected exit, 15:55 flat. The stop wins any ambiguous bar. On 1m data the path
   inside each 5m bar is walked minute by minute.
5. **Size and day rules.**
   - Sizing: `risk_policy.size()` tiers A $700 / B $350 / C $175 with hard guards, on a back-to-back simulated MFFU 50K
     account.
   - Day rules: one position at a time, at most 2 trades a day, done after 2 losers, -$600, or a +1R winner.

Example (ATM1M, 2026-04-24, from `TRADER_LAYER_trades_ATM1M_FULL.json`):

> Bias bullish (conviction 0.83) [...] This trade is WITH the bias. Long after a sweep of the ATM low (07:00-09:25) at
> 27,744.25: [...] the sweep of the ATM low is the manipulation into the draw. Against it: buying from premium (75% of
> the 2-day range). Grade A (score +4.4) -> full size. Plan: stop 27,674.06 (R 70.2 pts, model stop + 4.16 buffer); all
> out at the first draw: 5m swing 27,816.75 (1.0R) - crowded path (3 obstacles, HRLR). [...] 4 MNQ, $564 at the stop.
> Management: 10:15 +1.0R in my favor: stop to break-even (1m); 10:15 target delivered. (+1.02R)

## 2. Raw vs trader layer (FULL)

2026 ytd (2026-01-02..10-16) and the 2025 holdout (2025-04-14..12-31).
- Pass = rolling MFFU 50K pass %, with the zero-edge baseline in brackets.
- n/a = no rolling eval finished.
- Days-to-pass is the average over passing windows.

| model | config | ytd net | PF | /wk | max DD | 50K pass % (zero-edge) [completed windows, days to pass] | 2025 net | 2025 PF | 2025 /wk | 2025 max DD |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| ENG1 engine live pick | RAW | +11,630 | 2.41 | 2.26 | -3,147 | 48.1 (27.0) [189, 30 d] | +1,361 | 1.14 | 3.17 | -3,362 |
| | FULL | +3,175 | 1.41 | 1.46 | -3,001 | 26.3 (0.0) [118, 41 d] | +3,117 | 1.31 | 2.31 | -2,631 |
| ENG2 engine 2/day | RAW | +11,254 | 2.22 | 2.57 | -2,944 | 46.9 (28.6) [196, 28 d] | +2,026 | 1.18 | 3.90 | -3,592 |
| | FULL | +3,660 | 1.44 | 1.60 | -2,111 | 14.4 (0.0) [104, 47 d] | +2,980 | 1.25 | 2.77 | -3,171 |
| SB silver bullet | RAW | -2,013 | 0.91 | 2.28 | -5,664 | 33.5 (37.1) [197] | -1,314 | 0.93 | 2.47 | -7,459 |
| | FULL | +2,537 | 1.50 | 1.46 | -1,127 | 100 (0.0) [61, **112 d**] | -2,136 | 0.73 | 1.85 | -3,172 |
| MECH IFVG | RAW | -1,991 | 0.83 | 1.94 | -3,537 | 0.0 (0.0) | -2,864 | 0.74 | 2.07 | -4,236 |
| | FULL | +12 | 1.00 | 0.90 | -1,617 | n/a | -2,912 | 0.47 | 1.10 | -3,259 |
| M22 ICT 2022 | RAW | -1,914 | 0.77 | 1.31 | -3,611 | 0.0 (0.0) | -1,662 | 0.78 | 1.16 | -3,456 |
| | FULL | +1,013 | 1.28 | 0.70 | -1,713 | 0.0 (0.0) [96] | -2,763 | 0.47 | 0.73 | -3,751 |
| CONT continuation | RAW | +507 | 1.22 | 0.49 | -1,200 | n/a | -139 | 0.92 | 0.30 | -1,238 |
| | FULL | +137 | 1.16 | 0.34 | -437 | n/a | +355 | 1.92 | 0.22 | -213 |
| ATM1M owner's ATM, 1m | RAW | +431 | 1.04 | 1.38 | -3,968 | 22.8 (22.8) [184, 37 d] | - | | | |
| | FULL | -237 | 0.94 | 0.73 | -1,576 | n/a | - | | | |
| ATM1MB ATM 1m "best" | RAW | +1,647 | 1.19 | 1.17 | -3,336 | 38.8 (25.6) [116, 37 d] | - | | | |
| | FULL | +387 | 1.13 | 0.61 | -1,468 | n/a | - | | | |
| ATM (5m base) | RAW | +215 | 1.25 | 0.17 | -511 | n/a | +69 | 1.17 | 0.11 | -418 |
| | FULL | -233 | 0.65 | 0.15 | -415 | n/a | +437 | 18.2 | 0.08 | -25 |
| ATMX (5m, every signal) | RAW | -919 | 0.82 | 1.12 | -1,781 | n/a | -205 | 0.96 | 1.21 | -2,002 |
| | FULL | -1,095 | 0.68 | 0.73 | -1,690 | n/a | -145 | 0.96 | 0.83 | -1,376 |
| PORT (ENG1+SB+MECH+M22+CONT) | RAW | +6,219 | 1.12 | 8.28 | -5,818 | 38.2 (29.5) [170, 14 d] | -4,617 | 0.91 | 9.17 | -12,303 |
| | FULL | +2,773 | 1.17 | 3.69 | -1,863 | 7.2 (0.0) [125, 145 d] | -4,834 | 0.80 | 4.70 | -8,131 |

How to read it:

- **Per-trade R strips sizing out.** Here is avg R for dev / confirm / 2025:

  | model | RAW | FULL |
  |---|---|---|
  | ENG1 | -0.02 / +0.92 / -0.05 | -0.00 / +0.33 / -0.02 |
  | ENG2 | -0.05 / +0.87 / -0.02 | +0.08 / +0.34 / +0.01 |
  | SB | +0.03 / -0.32 / -0.06 | +0.12 / +0.09 / -0.08 |
  | MECH | -0.17 / -0.08 / -0.12 | -0.01 / +0.12 / -0.17 |

  The engine's 2025 dollar gain under FULL is tier sizing: A-grade trades happened to win in 2025 (+0.40R vs B -0.30R).
  With flat $350 (`noS`), 2025 is -$1,234 against the raw +$1,361. The five-year test already said grades don't rank,
  and they don't here either (ENG1 2026: A +0.03R, B +0.31R, C +0.02R).
- **Same check with the risk manager's final policy.** `POLICIES["RECOMMENDED"]` is flat $350 capped at 35% of the
  cushion, with guards and a reset when the eval is dead; it landed at 20:00 (row `FULL_rec`).
  - The layer's 2025 engine result falls to about zero: ENG1 -$956, ENG2 +$273.
  - 2026: ENG1 +$4,001 (PF 1.65), ENG2 +$3,007, SB +$2,355, PORT +$4,636 (4.0/wk, max DD -$1,826).
- **Pass rates are not comparable as printed.** The layer trades smaller (C = $175) and less often, so most rolling
  windows never finish and the passing ones take 41-145 days against 14-37 raw. SB's "100%" is 61 finished windows
  that took 112 days on average.
- **Bootstrap 95% CIs on avg R straddle 0 for every FULL row in ytd and 2025**, e.g. ENG2 FULL ytd +0.197
  [-0.072, +0.475]. With 7 + 13 configs x 11 sources x 5 periods, most single differences are noise.

## 3. Which pieces help (ablation)

ytd 2026 net (trades/week) / 2025 net (trades/week). Pre-registered columns first, then two post-hoc rows (RULES section 7):
- JF = the layer's judgment kept or dropped each of the model's own trades;
- Monly = the person's management on the model's own stop and target.

| model | RAW | FULL | noJ | noP | noM | noS | JF | Monly |
|---|---|---|---|---|---|---|---|---|
| ENG1 | +11,630 (2.26) / +1,361 (3.17) | +3,175 (1.46) / +3,117 (2.31) | +4,607 (2.18) / -2,409 (3.04) | +4,387 (1.46) / +3,227 (2.37) | +2,128 (1.46) / +638 (2.31) | +3,210 (1.46) / -1,234 (2.31) | +8,290 (1.46) / +240 (2.37) | +9,952 (2.26) / +945 (3.17) |
| ENG2 | +11,254 (2.57) / +2,026 (3.9) | +3,660 (1.6) / +2,980 (2.77) | +5,417 (2.45) / -1,699 (3.68) | +4,367 (1.63) / +3,814 (2.77) | +2,669 (1.58) / +1,907 (2.58) | +4,264 (1.67) / -226 (2.77) | +7,888 (1.65) / +1,628 (2.8) | +10,261 (2.57) / +1,587 (3.84) |
| SB | -2,013 (2.28) / -1,314 (2.47) | +2,537 (1.46) / -2,136 (1.85) | -2,155 (2.23) / -2,911 (2.37) | +2,406 (1.31) / -578 (1.8) | +143 (1.46) / -127 (1.85) | +2,345 (1.53) / -1,645 (1.88) | +2,472 (1.5) / +2,589 (1.85) | -2,339 (2.28) / -349 (2.47) |
| MECH | -1,991 (1.94) / -2,864 (2.07) | +12 (0.9) / -2,912 (1.1) | +2 (1.8) / -3,090 (1.91) | +92 (0.83) / -2,793 (1.16) | -2,771 (0.9) / -843 (1.1) | +224 (1.09) / -2,103 (1.26) | -1,062 (1.17) / -514 (1.32) | +533 (1.94) / -3,260 (2.07) |
| M22 | -1,914 (1.31) / -1,662 (1.16) | +1,013 (0.7) / -2,763 (0.73) | -323 (1.17) / -1,823 (1.05) | +2,909 (0.8) / -3,178 (0.78) | -1,299 (0.7) / +0 (0.73) | -45 (0.83) / -3,702 (0.78) | -504 (0.92) / -3,776 (0.83) | -24 (1.31) / -1,757 (1.16) |
| CONT | +507 (0.49) / -139 (0.3) | +137 (0.34) / +355 (0.22) | -504 (0.49) / -102 (0.27) | -449 (0.34) / +115 (0.24) | +1,609 (0.34) / +654 (0.22) | -280 (0.46) / -102 (0.27) | +810 (0.46) / -139 (0.3) | -850 (0.49) / -490 (0.3) |
| ATMX | -919 (1.12) / -205 (1.21) | -1,095 (0.73) / -145 (0.83) | +554 (1.0) / +467 (1.13) | -1,024 (0.8) / +729 (0.86) | -3,222 (0.73) / +124 (0.83) | -490 (0.83) / +139 (0.91) | -1,610 (0.87) / +23 (0.94) | -610 (1.12) / +484 (1.21) |
| ATM1M | +431 (1.38) | -237 (0.73) | -938 (1.36) | +749 (0.68) | -1,926 (0.73) | +192 (0.75) | -280 (0.75) | -790 (1.38) |
| ATM1MB | +1,647 (1.17) | +387 (0.61) | -486 (1.14) | +1,342 (0.58) | -1,289 (0.61) | +834 (0.63) | +649 (0.63) | -436 (1.17) |
| PORT | +6,219 (8.28) / -4,617 (9.17) | +2,773 (3.69) / -4,834 (4.7) | +3,595 (5.7) / -8,577 (6.4) | +6,810 (3.74) / -2,737 (4.7) | +714 (3.37) / +1,402 (4.3) | +4,932 (4.03) / -6,031 (4.95) | +11,340 (5.1) / -141 (6.32) | +5,996 (6.07) / -3,510 (6.83) |

Readings:

- **Judgment.**
  - It is what turns SB around: noJ is -$2,155 in 2026.
  - The post-hoc JF row ("a person picking which of SB's own trades to take") is positive in both years: +$2,472 /
    +$2,589. This is post-hoc and SB's confirm half is still -$465, so it is not a candidate.
  - On the engine, judgment removes good 2026 trades. The trend-day veto alone skipped 20 ENG1 setups that averaged
    +0.48R raw.
- **Targets (P).**
  - 15 of 20 model-years are better with the model's own target (noP).
  - With the coordinator's room rule (under 3R: single target) and the playbook's HRLR rule (3 or more obstacles: all
    at the first draw), 58-73% of trades exit at the first draw, 1.0-1.9R away.
  - The liquidity map's obstacle count is almost always 3 or more for anything over 2R. DRAW_LEARNER already found that
    obstacles carry no information beyond distance.
- **Management.** Positive for 10 of 11 sources in 2026 (+$0.1k to +$2.8k, ATM included; CONT -$1.5k). Negative for
  SB / MECH / M22 / PORT in 2025. The same regime split the house found for the engine's exits.
- **Sizing.** The tiers mostly move money around; the 2025 engine gain is the one big effect, and it is luck (see
  above). Management alone on the model's own exits (`Monly`) is roughly flat against raw, and worse for the engine.

### What the vetoes removed

The removed setups' **own raw** outcomes, pooled over the models. "Helps" means the removed trades were losers:

| skip reason | setups | raw avg R | 2026 | 2025 | verdict |
|---|---:|---:|---:|---:|---|
| FOMC day | 43 | **-0.52** | -0.65 | -0.42 | removed losers in both years and on nearly every model: keep, as a risk rule |
| fading an open drive | 99 | **-0.21** | -0.11 | -0.27 | helps SB and MECH (-0.10 to -0.68R); mixed for the engine (-0.16 to +0.13R) |
| fading a trend day (>= 0.4 ADR from the 18:00 open, extreme quarter) | 136 | +0.02 | +0.09 | -0.15 | noise, and the biggest frequency cut (17 of 57 ATM1M setups; 20 ENG1 setups at +0.48R in 2026) |
| against the narrative bias (`require`) | 184 | +0.05 | +0.13 | -0.05 | noise |
| no draw >= 1R in reach (plan) | 29 | +0.02 | -0.16 | +0.18 | noise |
| 08:30 day before 09:45 | 17 | -0.03 | +0.28 | -1.02 | too few |
| after 15:30 | 12 | +0.66 | -0.51 | +1.83 | too few |

Lunch (11:35-13:30) never fired. The models already avoid it.

## 4. ATM, the owner's model (1m trigger; management and fills on 1m bars)

Monthly net $, 2026 (`ATM_trades_1m_base.json`, 57 setups):

| ATM1M config | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | Jan-Jun | Jul-Oct | /wk | losing months |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| RAW | +446 | +996 | +417 | +2,507 | -570 | -1,396 | -259 | +288 | -1,072 | -926 | +2,400 | -1,969 | 1.38 | 5 |
| FULL | +496 | +76 | -452 | +1,124 | -741 | -704 | -131 | +878 | -784 | 0 | -201 | -36 | 0.73 | 5 |
| **noP** (own opposite-side target) | +198 | +6 | -307 | +1,345 | -295 | -449 | -131 | +1,214 | -832 | 0 | **+497** | **+251** | 0.68 | 5 |
| noM (no management) | +1,331 | -201 | -767 | +756 | -838 | -842 | -266 | -257 | -843 | 0 | -560 | -1,367 | 0.73 | 7 |
| BIAS require (narrative) | +496 | +76 | -402 | +572 | -322 | -704 | 0 | +658 | -595 | 0 | -283 | +62 | 0.44 | 4 |
| DB_skip (open_amd) | 0 | +84 | -402 | +1,128 | -310 | -216 | -131 | +234 | -304 | 0 | +284 | -201 | 0.39 | 5 |
| DB_grade (open_amd +/-1) | +255 | -291 | -329 | +1,126 | -472 | -460 | -131 | +806 | -590 | 0 | -170 | +86 | 0.70 | 6 |
| Monly (management only) | +220 | -17 | -874 | +1,697 | -480 | -887 | +78 | +1,033 | -1,258 | -302 | -341 | -449 | 1.38 | 6 |
| RTa (retest, 15 min) | -5 | -307 | -293 | +905 | -454 | -781 | -3 | +280 | -639 | 0 | -936 | -361 | 0.53 | 7 |

ATM1MB (`ATM_trades_1m_best.json`, 48 setups):

| config | Jan-Jun | Jul-Oct | /wk |
|---|---:|---:|---:|
| RAW | +2,927 | -1,280 | 1.17 |
| FULL | +256 | +131 | 0.61 |
| noP | +922 | +420 | 0.58 |
| DB_skip | +510 | -187 | 0.34 |

- **Does the layer turn Jul-Oct around?** Partly, and only by trading less:
  - October has no layer trades at all (raw -$926): its three setups were all trend-day vetoes. September loses less
    (one FOMC veto, one trend-day veto).
  - August improves through management.
  - Every layer row costs most of the Jan-Jun profit and halves frequency to 0.4-0.7/wk.
  - The trend-day veto removes 17 of 57 setups whose raw average was -0.06R, so most of the frequency cut buys nothing.
- **Best ATM row: `noP`.** The layer's judgment, management and sizing with ATM's own opposite-side target, and the
  only ATM row positive in both halves:
  - ATM1M: ytd +$749, PF 1.23, max DD -$1,212;
  - ATM1MB: ytd +$1,342, PF 1.52, max DD -$911.
  - But 0.6-0.7 trades/week, a bootstrap CI of [-0.36, +0.64]R, and 28 trades: indistinguishable from zero.
- **Bias on ATM.**
  - D-aligned ATM (`DB_skip`) keeps 16 trades (0.39/wk) for +$84.
  - `require` on the narrative bias keeps 18 for -$221.
  - Nothing rescues Jul-Oct at a usable frequency.
- **Recent-swing stop** (`SW_FULL`, `SW_noP`, `SW1_*`):
  - Only 11 of 57 ATM1M setups had a swing with 2 bars each side between the sweep extreme and the entry on the trigger
    timeframe; 12 of 57 on 1m bars. For ATM1MB it was 1 and 4 of 48.
  - The V is too fast: 10 entries come within 3 minutes of the extreme, and 35-36 have no 2-bar pullback.
  - After the vetoes, only 5 taken trades used the tighter stop, and they lost (-$586, avg -0.57R under FULL).
  - Median stop of the taken trades 63.6 vs 67.7 pts; planned R:R to the opposite side 2.40 vs 2.35.
  - Results: `SW_FULL` -$680 vs FULL -$237, and `SW_noP` +$557 vs `noP` +$749.
  - The tighter-stop idea needs a different definition (e.g. the IFVG's far edge). With "2 bars each side" it rarely
    exists on these entries, and the few cases are too few to judge.

## 5. Bias options

2026 net / PF / trades a week / losing months, then the dev, confirm and 2025 net. FULL = "grade (brain, narrative)".

| model | bias option | 2026 net | PF | /wk | losing months | dev | confirm | 2025 net | 2025 /wk |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ENG1 | off | +3,894 | 1.51 | 1.46 | 2 | +1,433 | +2,461 | +2,503 | 2.31 |
| | grade (brain, narrative) = FULL | +3,175 | 1.41 | 1.46 | 3 | +940 | +2,236 | +3,117 | 2.31 |
| | require (narrative) | +2,384 | 1.40 | 1.00 | 4 | +871 | +1,513 | +2,025 | 1.80 |
| | grade +/-1 (open_amd) | +2,750 | 1.33 | 1.46 | 4 | +743 | +2,007 | -341 | 2.28 |
| | skip_counter (open_amd) | +3,934 | 1.67 | 1.07 | 3 | +593 | +3,341 | +521 | 1.53 |
| | require (ttrades) | -46 | 0.99 | 0.70 | 5 | +415 | -461 | +2,548 | 1.51 |
| ENG2 | off | +5,786 | 1.71 | 1.63 | 2 | +2,530 | +3,257 | +3,423 | 2.77 |
| | grade = FULL | +3,660 | 1.44 | 1.60 | 3 | +1,390 | +2,270 | +2,980 | 2.77 |
| | require (narrative) | +2,037 | 1.29 | 1.04 | 3 | +1,060 | +977 | +2,702 | 2.20 |
| | skip_counter (open_amd) | +3,509 | 1.54 | 1.17 | 3 | +58 | +3,451 | +79 | 1.85 |
| SB | grade = FULL | +2,537 | 1.50 | 1.46 | 5 | +1,593 | +944 | -2,136 | 1.85 |
| | require (narrative) | +2,282 | 1.47 | 1.33 | 6 | +1,788 | +494 | -1,350 | 1.61 |
| | skip_counter (open_amd) | +2,416 | 1.77 | 1.04 | 3 | +2,005 | +411 | -2,490 | 1.42 |
| MECH | grade = FULL | +12 | 1.00 | 0.90 | 5 | -108 | +120 | -2,912 | 1.10 |
| | require (narrative) | -882 | 0.68 | 0.53 | 6 | -560 | -322 | -1,776 | 0.75 |
| | skip_counter (open_amd) | -1,208 | 0.41 | 0.44 | 4 | -1,527 | +319 | -1,494 | 0.70 |
| M22 | grade = FULL | +1,013 | 1.28 | 0.70 | 7 | +2,463 | -1,450 | -2,763 | 0.73 |
| | skip_counter (open_amd) | +2,164 | 1.87 | 0.61 | 6 | +2,947 | -783 | -1,891 | 0.59 |
| ATM1M | grade = FULL | -237 | 0.94 | 0.73 | 5 | -201 | -36 | - | - |
| | require (narrative) | -221 | 0.91 | 0.44 | 4 | -283 | +62 | - | - |
| | skip_counter (open_amd) | +84 | 1.04 | 0.39 | 5 | +284 | -201 | - | - |
| PORT | grade = FULL | +2,773 | 1.17 | 3.69 | 4 | +1,463 | +1,310 | -4,834 | 4.70 |
| | require (narrative) | +820 | 1.05 | 3.25 | 6 | +1,863 | -1,044 | -3,086 | 4.09 |
| | skip_counter (open_amd) | +3,388 | 1.26 | 2.79 | 5 | +421 | +2,967 | -3,445 | 3.58 |

All rows, including CONT, ATMX and ATM1MB, are in `TRADER_LAYER_tables.md`.

- **`require` (narrative bias)** cuts 25-40% of the engine's and the ATM model's trades. It helps in 8 of 20
  model-years.
- **`skip_counter` on `open_amd`** fails the coordinator's adoption rule:
  - on the engine: dev +$593 vs +$940 for ENG1, and 2025 +$521 vs +$3,117;
  - on ENG2 it drops to 1.17/wk.
- **`off` vs `grade`** is mixed: off is better on ENG2 in both years and worse on ENG1 in 2025. Bias stays a grade
  element, not a gate. That matches the coordinator's chart finding: counter-bias engine trades did better.

## 6. Retest entries (coordinator variant)

FULL plus a limit at the trigger zone instead of the trigger close:
- the zone is ATM's own IFVG, or the inverted 5m FVG's edge, the CISD level, or the signal body's midpoint;
- windows: 30 / 60 min (6 / 12 x 5m), or 15 / 30 min on 1m for ATM;
- in 2026, fills and management run on 1m, so 2026 is compared with FULL_1m.

| model | FULL (1m) 2026 | RTa 2026 | RTb 2026 | FULL 2025 | RTa 2025 | RTb 2025 | fill rate RTa (2026 / 2025) |
|---|---|---|---|---|---|---|---|
| ENG1 | +2,256 (1.46/wk) | -4,031 (1.04) | -3,848 (1.14) | +3,117 (2.31) | -1,446 (1.88) | -1,808 (1.94) | 71% / 81% |
| ENG2 | +2,603 (1.60) | -3,429 (1.21) | -3,258 (1.31) | +2,980 (2.77) | -222 (2.23) | -882 (2.34) | 74% / 80% |
| MECH | +12 (0.90) | -799 (0.63) | -32 (0.73) | -2,912 (1.10) | -2,730 (1.08) | -2,730 (1.08) | 74% / 91% |
| CONT | +137 (0.34) | +1,283 (0.32) | +1,245 (0.34) | +355 (0.22) | +385 (0.22) | +245 (0.24) | 74% / 90% |
| ATM1M | -237 (0.73) | -1,297 (0.53) | -2,090 (0.58) | - | - | - | 71% |
| ATM1MB | +387 (0.61) | -635 (0.44) | -1,584 (0.49) | - | - | - | 69% |
| PORT | - | -402 (3.35) | -616 (3.47) | -4,834 (4.70) | -9,469 (4.49) | -10,486 (4.49) | 70% / 83% |

- On days where both versions traded, the retest is better. Matched ENG1 trades:
  - 2026: -$4,031 vs -$4,198;
  - 2025: -$1,446 vs -$4,932.
  The trades the gallery flagged ("died inside the entry bar") are partly avoided.
- But 10-14 setups a year "ran to the target without a retest", and those are the engine's biggest winners. The
  missing winners outweigh the better fills everywhere except CONT (20 setups, noise). **Don't adopt.**

## 7. Best combination and recommendation

- **Pre-registered winner by robustness: `ENG2 FULL`** (`TRADER_LAYER_ENG2_FULL__*.json`).
  - It is the only row positive in dev, confirm and 2025:

    | period | net | PF | trades/wk | max DD |
    |---|---:|---:|---:|---:|
    | dev | +$1,390 | 1.32 | 1.41 | -$1,743 |
    | confirm | +$2,270 | 1.58 | 1.92 | -$1,083 |
    | 2025 | +$2,980 | 1.25 | 2.77 | -$3,171 |

  - It fails the lab gate: under 2/wk in both 2026 halves, and the pass rate is not 10 points over zero-edge in dev.
  - Its 2025 dollars are tier-sizing luck (avg R +0.01). With the risk manager's RECOMMENDED sizing, 2025 is +$273.
  - It leaves about $7.6k of the raw engine's 2026 on the table.
- **For the owner's ATM: `ATM1M noP` / `ATM1MB noP`.** Positive in both 2026 halves, but at about 0.65 trades/week and
  statistically zero.
- **What I would deploy Monday:**
  1. Keep the engine with its own exits.
  2. Add "no entries on FOMC days" (a risk rule that removed -0.52R setups in both years on nearly every model).
  3. Optionally add "don't fade an open drive" for the ICT models only. It is neutral for the engine.
  4. Everything else in the layer reshapes P&L by regime; it does not create edge.
  5. If the owner wants the person-style behaviour live anyway, `lab:with_trader` with `{"base": "<model>"}` runs it,
     and the thoughts appear in `state()["trader_layer"]`.

## 8. Caveats

- **Multiple testing.**
  - 7 pre-registered configs, 13 labeled extra rows, 11 sources and 5 periods: hundreds of comparisons.
  - Only the pre-registered 7 should be read as tests. The rest are descriptive.
  - The best row of a search like this is expected to look good by chance.
- **Small samples.** ATM has 28-57 trades, CONT 20, M22 54. Every FULL avg-R CI includes 0.
- **In-sample pieces.**
  - The coordinator's data-verified facts (B1 80/67%, one-side 10%, OD, lunch) come from overlapping 2016-2026 NQ data.
  - The brain's v1 weights were set using CONFLUENCE results from 2025-2026.
  - The draw learner is in-sample everywhere, so it is logged (`plan.p_hit`) and never used.
- **Moving targets.**
  - `engine/narrative.py` was edited by the brain agent during the session. Its story text changed, and v1 elements
    and cutoffs are as of the run (VERSIONS = v1 only).
  - `engine/daily_bias.py` `DEFAULT_METHOD` changed from `ttrades` to `open_amd` mid-session. `BIAS_db` is pinned to
    `ttrades`.
  - Re-running `python -X utf8 tools/lab_trader_run.py run` reproduces everything in about 2 minutes, single process.
- **Fills.**
  - Stop-first on ambiguous 5m bars; 1-tick trade-through for targets and limits.
  - With 1m data, the BE move after TP1 / +1R applies from the next minute. That is why `FULL_1m` differs from FULL
    (ENG1 2026 +$2,256 vs +$3,175).
  - Engine setups use the signal close as the entry and the engine's real stop (fill - dir x risk_pts).
- **Live wrapper limits.**
  - The base model's own day rules still gate what it proposes. Set its `base_params` no stricter than the layer's.
  - ATM 1m needs `bars1_path` (1m bars) to manage on 1m.
  - The simulated account restarts with each `run()` frame. Live sizing should come from the real account.
