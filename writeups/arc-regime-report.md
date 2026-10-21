# Liquidity Engine: regime and equity-curve governor study (16 Oct 2026)

Scripts: `study_regime_night1.py` (all sizing rules, regime measures, kill-switches, walk-forward, bootstrap CIs) and
`study_regime_night2.py` (governor sensitivity, placebo, synthetic-sequence cost/benefit). `study_regime_night0_probe.py`
is a small check of the trade fields. Each script takes `--from YYYY-MM-DD --to YYYY-MM-DD` and filters after the run, so
warm-up history is kept. When more CME history comes in (Databento), re-run them with no code changes.
Nothing in `engine/`, `server.py` or `web/` was changed.

## Data and method (owner instruction: real CME futures only)

* **NQ futures** (`data/NQ_5m.csv`), 2026-08-06 to 2026-10-16: 52 sessions, **29 default trades, +$10,718, PF 6.9, max DD -$372,
  2.8 trades/wk.** This is the decision market.
* **ES futures**, same window, as a cross-instrument check only: 51 sessions, 47 trades, **-$4,272, PF 0.28**. On ES the bot
  loses in every bucket I looked at. That matters: on ES, any rule that trades smaller "helps", whether it has skill or not.
* No CFD (NQX) data was read. The CFD parts of the original brief (four-period total, 2024 H1/H2 split) were replaced by
  the owner's new validation design.
* Daily (`*_1d.csv`, from 2016) and 1H (`*_1h.csv`, from May 2024) futures bars supply warm-up for the 3/5/10-day efficiency
  and 1H ADX(14). Every feature uses only bars that had closed before the entry.
* **Emulation, not engine changes.** I run the engine at full size in the trending regime (`regime_mode: "none"`, flat
  sizing `dd_aware: False, daily_max_loss: 1e9`). Then I re-size each trade the way `engine._size` does:
  micros = floor($350 x grade_mult x m / (risk_pts_plan x $2)), capped at 40, with the auto mini/micro split and commission
  recomputed. A trade whose size rounds to 0 is dropped, as the engine does ("risk too small"). Check: emulating today's
  rule reproduces the engine **exactly** (29 trades, +$10,718, DD -$372 on NQ; 47 / -$4,272 on ES). Kill-switches are
  emulated by dropping the rest of the ISO week, which is exact.
* **Samples.** A = default taken trades (NQ 31 at full size, 29 after today's rule). B = "wide" managed trades
  (`max_trades_day 9, stop_after_win off`): NQ 35, ES 54. C = shadow candidates from the wide run: NQ 57, ES 89. Shadows
  resolve at stop, target or flat only, in R x grade. The shadow sample was meant to be much larger, but this engine only
  logs a shadow for a fully valid setup, so it adds about 25 NQ samples, not hundreds.
* **Validation.** Walk-forward over 5 folds of 10 sessions (about 2 weeks each). For each rule family the threshold is
  picked on earlier folds of sample B and scored on the next fold. Fixed thresholds are also shown fold by fold. Every lift
  has a 90% day-block bootstrap CI and p+ = P(lift > 0).
* **Adoption rule:** improves NQ in the walk-forward test folds, keeps 2.0-4.5 trades/wk, and does not hurt ES.

## Executive summary

1. **On real NQ futures, "trending" is where the bot makes its money, not where it loses.** Every fast trend measure flags
   *better* NQ trades than average. Examples: 5-day efficiency >= 0.5 flags 12 trades at +2.08R vs +0.48R for the rest;
   1H ADX >= 20 flags +1.22R vs +0.78R; one-sided initial balance flags +1.26R vs +1.04R. Halving those trades costs NQ
   $1,200-$4,750, often with the CI wholly below zero. The CFD "losing months are trending months" fingerprint does not
   carry over to the futures sample we have.
2. **The equity-curve / no-runner governor has no timing skill.** On NQ it cuts the trades just before the runners:
   N=4 costs -$1,440, N=5 -$1,116, N=6 -$44. On ES it saves $1,400-$2,100, but cutting the same number of trades at
   random saves the same amount (placebo P = 0.23-0.57). It works only as "trade smaller when the system is losing". The
   expectancy version (last 10 trades < 0R, then 0.5x) **never fires on NQ** ($0 cost) and saves +$2,111 on ES
   (CI +$1,098..+$3,114). In synthetic NQ-like sequences it cuts 1% of trades for -0.6R per 60 trades. In ES-like
   sequences it cuts 77% of trades for +8.4R. That makes it cheap insurance, but it fails the owner's "improves NQ" test.
3. **Today's 10-day rule (`regime_er10_max 0.45`, half size) cost $1,513 on NQ futures.** It fired on 5 trades (23 Sep to
   5 Oct): it halved an A+ 4.76R target and turned two D-grade trades into skips. The skips happen because D x 0.5 x 0.5 =
   $87 is less than one micro on a 44+ point stop, and one of them was a +3.56R target. It never fires on ES. The
   evidence is essentially one trade (CI -$130..+$4,067, p+ 0.87), so it is inside the noise. The rule's original support
   came from CFD data that is now excluded.
4. **Direction-aware sizing (halve only trades against the 5-day trend) and the opening-drive, gap and ADX variants are all
   inside the noise on NQ.** The "best" ones (`od_er >= 0.6`, `gap >= 0.5 ADR`, "replaces er10") only look good because
   they also drop the er10 rule; on top of the er10 rule they add $0 to +$120. Walk-forward agrees: no family picks a
   threshold that helps NQ in the test folds, apart from the er10-removal effect.
5. **Kill-switches do not help NQ.** "-2R in the week, stop for the week" and "3 full stops in a row" never triggered on
   NQ. "3 losses in a row" removed 2 trades and cost -$812 (2.6/wk). On ES they help by +$375 to +$930, again only because
   ES loses.

## Tables

Cells: n / trades per week / net $ / PF / max DD. Lift is against today's engine (er10 rule kept) unless the row says
"replaces er10". ES lifts are shown for completeness, but on a losing market any size cut is positive.

### Sizing rules: NQ futures (A = taken trades $, B = wide managed trades $, C = shadows R)

| variant | NQ A | NQ A lift $ (90% CI, p+) | NQ lift by fold (5 x 2 wk) | NQ B lift $ | NQ C lift R | ES A lift $ (CI) |
|---|---|---|---|---|---|---|
| **today: er10 > 0.45 half** | 29 / 2.8 / +10,718 / 6.94 / -372 | 0 | 0 0 0 0 0 | 0 | 0 | 0 (ES -4,272) |
| no regime rule (full size) | 31 / 3.0 / +12,232 / 7.33 / -372 | +1,513 (-130..+4,067, 0.87) | 0 0 0 +1557 -44 | +1,513 | +3.1 | 0 |
| er10 from daily history (warm), replaces | 28 / 2.7 / +10,759 / 7.10 / -329 | +40 (-6..+128) | +44 0 0 -3 0 | +40 | -1.8 | -33 |
| 5-day ER >= 0.5, replaces | 30 / 2.9 / +7,832 / 5.66 / -296 | **-2,887 (-5,483..-664, 0.01)** | -1450 -465 0 -80 -892 | -3,575 | -11.2 | +488 |
| 5-day ER >= 0.4, replaces | 29 / 2.8 / +6,492 / 5.19 / -296 | **-4,227 (-7,396..-1,599)** | -1450 -1513 +120 -244 -1141 | -4,905 | -12.2 | +1,325 |
| 3-day ER >= 0.7, replaces | 28 / 2.7 / +10,006 / 7.13 / -382 | -713 (-3,756..+2,489) | -162 -1058 +4 +1039 -537 | -607 | -3.4 | +1,461 |
| 3-day ER >= 0.6 + er10 | 27 / 2.6 / +8,262 / 6.52 / -378 | **-2,457 (-4,892..-496)** | -162 -1008 -28 -162 -1097 | -3,135 | -11.2 | +1,563 |
| 1H ADX >= 20, replaces | 27 / 2.6 / +7,277 / 6.83 / -255 | **-3,442 (-6,255..-1,103)** | -1318 -504 -402 -46 -1171 | -4,120 | -12.5 | +834 |
| 1H ADX >= 25, replaces | 27 / 2.6 / +10,803 / 9.15 / -255 | +84 (-2,152..+2,880, 0.51) | -162 +10 +4 +1402 -1171 | -594 | +0.4 | +735 |
| 1H ADX >= 25 + er10 | 26 / 2.5 / +9,643 / 9.04 / -255 | -1,076 (-2,542..+207) | -162 +10 +4 +198 -1127 | -1,754 | -2.7 | +735 |
| opening-drive ER >= 0.4 + er10 | 29 / 2.8 / +10,502 / 7.97 / -284 | -217 (-1,281..+504) | +88 -514 +120 +90 0 | -101 | -0.2 | +470 |
| opening-drive ER >= 0.5 + er10 | 29 / 2.8 / +10,292 / 7.00 / -372 | -426 (-1,456..+176) | 0 -514 0 +88 0 | -310 | -1.3 | +349 |
| IB broke one side only + er10 | 29 / 2.8 / +8,014 / 6.40 / -372 | **-2,704 (-5,709..-327)** | 0 -2590 -374 +2 +258 | -3,495 | -11.1 | +433 |
| gap >= 0.5 ADR + er10 | 29 / 2.8 / +10,838 / 7.44 / -372 | +120 (0..+360) | 0 0 +120 0 0 | +120 | +0.9 | 0 |
| gap >= 0.5 ADR, replaces | 31 / 3.0 / +12,352 / 7.82 / -372 | +1,633 (-84..+4,129, 0.91) | 0 0 +120 +1557 -44 | +1,633 | +4.0 | 0 |
| direction-aware: 5d ER >= 0.5 & against 5d dir + er10 | 29 / 2.8 / +9,586 / 6.88 / -372 | -1,132 (-2,853..+174) | 0 +50 0 -646 -536 | -1,820 | -5.7 | +519 |
| direction-aware: 5d ER >= 0.4 & against, replaces | 29 / 2.8 / +8,768 / 6.39 / -372 | **-1,950 (-4,286..-119)** | 0 -998 +120 -244 -828 | -2,638 | -6.4 | +643 |
| direction-aware: OD ER >= 0.5 & against OD + er10 | 29 / 2.8 / +10,806 / 7.30 / -372 | +88 (0..+264) | 0 0 0 +88 0 | +204 | -0.0 | +505 |
| no-runner governor N4 x0.5 + er10 | 29 / 2.8 / +9,278 / 6.69 / -372 | -1,440 (-3,604..+64, 0.07) | 0 -1028 -249 -164 0 | -1,440 | n/a | +1,830 |
| no-runner N5 x0.5 + er10 | 29 / 2.8 / +9,602 / 6.72 / -372 | -1,116 (-3,274..+129) | 0 -1077 +124 -164 0 | -1,116 | n/a | +1,621 |
| no-runner N6 x0.5 + er10 | 29 / 2.8 / +10,675 / 7.34 / -372 | -44 (-370..+240) | 0 0 +120 -164 0 | -44 | n/a | +1,431 |
| no-runner N4 x0.25 + er10 | 29 / 2.8 / +8,430 / 6.52 / -372 | -2,288 | 0 -1587 -429 -272 0 | -2,288 | n/a | +2,816 (ES 41 trades, 6 drop to qty 0) |
| **expectancy governor: last 10 < 0R, then x0.5, + er10** | 29 / 2.8 / +10,718 / 6.94 / -372 | **0 (never fires)** | 0 0 0 0 0 | 0 | n/a | **+2,111 (+1,098..+3,114)** |
| expectancy governor, replaces er10 | 31 / 3.0 / +12,232 / 7.33 / -372 | +1,513 (= drop er10) | 0 0 0 +1557 -44 | +1,513 | n/a | +2,111 |
| no-runner N5 x0.5 + 5d ER >= 0.5, replaces | 30 / 2.9 / +6,716 / 5.32 / -296 | -4,003 | -1450 -1542 +124 -244 -892 | -4,691 | -11.2 | +2,138 |
| no-runner N5 x0.5 + OD ER >= 0.5, replaces | 31 / 3.0 / +10,689 / 7.22 / -372 | -30 | 0 -1592 +124 +1482 -44 | +86 | +1.9 | +1,973 |

Full grid, including er5 >= 0.6, er3 >= 0.8, ADX >= 30, OD ER >= 0.6, gap >= 0.35 ADR, IB-against and the 0.25x cuts:
`python study_regime_night1.py`. All sizing rules keep the trade count except where a halved D-grade trade rounds to
0 micros (shown as fewer trades). Every NQ row is in the 2.5-3.0 trades/wk range.

### Walk-forward: threshold picked on earlier folds, scored on the next fold (NQ, test folds 2-5)

| family | thresholds picked | NQ A test lift $ | NQ B test lift $ | ES A test lift $ |
|---|---|---|---|---|
| 5-day ER (+ er10) | baseline in every fold (no threshold helped in-sample) | 0 | 0 | +1,078 |
| 3-day ER (+ er10) | 0.8, baseline, baseline, baseline | -1,058 | -1,058 | +1,121 |
| 1H ADX (+ er10) | 30, 30, 30, 30 | -986 | -1,770 | +446 |
| opening-drive ER (+ er10) | 0.4, 0.6, 0.6, 0.6 | -514 | -514 | +300 |
| gap vs ADR (+ er10) | baseline, baseline, 0.5, 0.5 | 0 | 0 | 0 |
| no-runner governor (+ er10) | baseline, baseline, N6 x0.25, baseline | -272 | -272 | +2,346 |
| ADX / OD / gap, **replacing** er10 | | +174 / +998 / +1,513 | -610 / +998 / +1,513 | |

The positive "replacing" numbers all come from one fold (17-30 Sep) and one trade: the A+ 4.76R target on 25 Sep that
today's rule halved.

### Governor sensitivity (er10 kept; lift $ / trades cut)

| governor | NQ x0.5 | NQ x0.25 | ES x0.5 | ES x0.25 |
|---|---|---|---|---|
| expectancy last 5 < 0R | -1,077 / 2 | -1,670 / 2 | +1,438 / 34 | +2,208 / 34 |
| expectancy last 8 < 0R | 0 / 0 | 0 / 0 | +2,111 / 37 | +3,230 / 37 |
| **expectancy last 10 < 0R** | **0 / 0** | 0 / 0 | **+2,111 / 37** | +3,230 / 37 |
| expectancy last 10 < -0.25R | 0 / 0 | 0 / 0 | +1,023 / 25 | +1,572 / 25 |
| expectancy last 15 < 0R | 0 / 0 | 0 / 0 | +1,680 / 32 | +2,528 / 32 |
| expectancy last 20 < 0R | 0 / 0 | 0 / 0 | +1,490 / 27 | +2,242 / 27 |
| no-runner N3 | -1,987 / 8 | -3,040 / 8 | +2,098 / 38 | +3,236 / 38 |
| no-runner N4 | -1,440 / 6 | -2,288 / 6 | +1,830 / 35 | +2,816 / 35 |
| no-runner N5 | -1,116 / 4 | -1,748 / 4 | +1,621 / 32 | +2,485 / 32 |
| no-runner N6 | -44 / 2 | -92 / 2 | +1,431 / 29 | +2,185 / 29 |
| no-runner N8 | 0 / 0 | 0 / 0 | +1,561 / 24 | +2,424 / 24 |

Window 8-20 is a flat plateau for the expectancy governor, not a knife edge; window 5 is too twitchy and costs NQ.

### Placebo: does the governor time its cuts, or does it just trade smaller? (random cut of the same number of trades, 2,000 draws)

| governor x0.5 | ES trades cut | ES governor lift | ES placebo median (5-95%) | P(placebo >= governor) | NQ governor lift | NQ placebo median |
|---|---|---|---|---|---|---|
| expectancy W10 < 0 | 37 | +2,111 | +1,881 (+1,441..+2,368) | 0.23 | 0 (0 cut) | - |
| expectancy W15 < 0 | 32 | +1,680 | +1,640 | 0.45 | 0 | - |
| no-runner N4 | 35 | +1,830 | +1,797 | 0.45 | -1,440 | -1,021 |
| no-runner N5 | 32 | +1,621 | +1,637 | 0.51 | -1,116 | -625 |
| no-runner N6 | 29 | +1,431 | +1,489 | 0.57 | -44 | -205 |

The governors are no better than random at choosing *which* trades to cut. The no-runner rule does worse than random on
NQ, because the cuts land on the trades before the runners.

### Synthetic sequences (60 trades, block bootstrap of the real trade R's, blocks of 5): cost in a good regime, saving in a bad one

| source | governor x0.5 | mean lift R | 5%..95% | share of trades cut |
|---|---|---|---|---|
| NQ-like | expectancy W10 < 0 | **-0.62** | -2.79..0.00 | 1% |
| NQ-like | expectancy W5 < 0 | -4.17 | -8.14..-0.73 | 10% |
| NQ-like | no-runner N5 | -5.48 | -9.80..-1.42 | 15% |
| NQ-like | no-runner N6 | -3.71 | -7.94..0.00 | 10% |
| ES-like | expectancy W10 < 0 | **+8.35** | +3.12..+13.16 | 77% |
| ES-like | no-runner N5 | +9.90 | +5.34..+14.25 | 92% |

### Kill-switches (rest of the ISO week off; today's sizing)

| rule | NQ A | NQ lift $ | ES A | ES lift $ (CI) |
|---|---|---|---|---|
| week net <= -2R ($700): stop for the week | 29 / 2.8 / +10,718 | 0 (never triggered) | 45 / 4.4 / -3,898 | +375 (0..+818) |
| 3 losing trades in a row: stop for the week | 27 / **2.6** / +9,906 / DD -506 | **-812** | 37 / 3.6 / -3,342 | +930 (-207..+2,168) |
| 3 full stops in a row: stop for the week | 29 / 2.8 / +10,718 | 0 (never triggered) | 47 / 4.6 / -4,272 | 0 |

### Who gets flagged "trending"? Mean R of flagged vs other trades (NQ taken trades; ES taken trades)

| measure | NQ flagged n, R | NQ other n, R | ES flagged n, R | ES other n, R |
|---|---|---|---|---|
| today: engine er10 > 0.45 | 5, +1.38 | 26, +1.05 | 0 | 47, -0.37 |
| 10-day ER (daily history) > 0.45 | 5, +1.29 | 26, +1.07 | 6, +0.18 | 41, -0.45 |
| 5-day ER >= 0.5 | 12, **+2.08** | 19, +0.48 | 15, -0.28 | 32, -0.42 |
| 3-day ER >= 0.6 | 16, +1.39 | 15, +0.79 | 21, -0.59 | 26, -0.20 |
| 1H ADX >= 25 | 16, +0.85 | 15, +1.37 | 22, -0.22 | 25, -0.51 |
| opening-drive ER >= 0.4 | 6, -0.16 | 25, +1.41 | 12, -0.20 | 35, -0.43 |
| IB broke one side only | 9, +1.26 | 22, +1.04 | 14, -0.28 | 33, -0.41 |
| gap >= 0.35 ADR | 2, +2.18 | 29, +1.03 | 2, +0.16 | 45, -0.39 |
| 5d ER >= 0.5 & against 5d dir | 7, +1.63 | 24, +0.95 | 10, -0.40 | 37, -0.36 |

No measure flags worse trades in both markets. The only NQ measure whose flagged trades are worse (opening-drive
efficiency >= 0.4: 6 trades) flags *better* trades on ES. That is what noise looks like.

## Recommendation for Sunday's launch

**No change to the strategy or regime defaults.** `regime_er10_max: 0.45` and `regime_mode: "half"` stay. No governor and
no kill-switch goes into the engine for Sunday.

Reasons:

* Nothing passes the owner's rule with evidence outside the noise. The only rules that "improve NQ in the test folds"
  do it by dropping today's er10 rule, and that result is one trade (25 Sep, A+ 4.76R target, +$1,285 at full size;
  CI -$130..+$4,067). Removing the bot's only bad-regime defence on one trade is as much a fit as adding a filter on one trade.
* Every faster trend measure (3/5-day ER, 1H ADX, IB one-sided, direction-aware variants) is wrong-signed on NQ futures:
  it halves the best trades. These should not be built.
* The no-runner governor, the direct answer to the "zero +2R trades" fingerprint, costs NQ -$44 to -$1,440 and has no
  timing skill (placebo). Reject it.
* Kill-switches either never trigger on NQ or cost money (-$812). Reject them.

Two optional items for the lead and owner. Neither is required, and neither is proven:

1. **Mechanical fix, low stakes: floor the trending-regime half size at 1 micro.** Today, a D-grade trade in a trending
   regime has a planned risk of $350 x 0.5 x 0.5 = $87.50. On a 44+ point stop that rounds to 0 micros, so "half size"
   silently becomes "skip". That happened twice on NQ (23 Sep, +3.56R target; 5 Oct, -0.38R): about +$310 net forgone.
   The engine change would go in `Engine._size`: if `micros < 1` and the trade would have had `micros >= 1` without the
   `regime == "trending"` halving, set `micros = 1` (still capped by `cushion x 0.35` when `dd_aware` is on). Effect on
   this sample: about +$310 on NQ (two trades, inside the noise), 0 on ES, frequency 2.8 -> 3.0/wk. Adopt it only as a
   logic-consistency fix, not as a performance claim.
2. **If the owner wants a bad-regime circuit breaker, this is the one to use: the 10-trade expectancy governor.** It
   multiplies risk by 0.5 while the mean R of the last 10 *closed* trades is below 0R, and goes back to full size once it
   is >= 0. It never fired on NQ futures ($0 cost). In NQ-like synthetic sequences it costs -0.6R per 60 trades (1% of
   trades cut). On ES and in ES-like sequences it halves the losses (+$2,111, +8.4R per 60 trades). It is not a forecast:
   its value is the same as cutting size at random on a losing system. Treat it as risk control, not edge, and know that
   it fails the strict "improves NQ" test. Engine change if adopted: a new param `exp_gov_n: 10` (0 = off) with
   `exp_gov_mult: 0.5`. In `_size`, multiply `risk_usd` by `exp_gov_mult` when the last `exp_gov_n` finalized trades'
   `pnl_r` average < 0. In live mode the history must be seeded from the persistent trade memory (paper + live trades,
   `engine/memory.py`), not reset on restart. It cannot act until 10 trades have closed (about 3.5 weeks at 2.8/wk).

What to re-run when more CME history arrives:
`python study_regime_night1.py --from <date>` and `python study_regime_night2.py --from <date>`. The question to answer
then is whether the futures record shows any period like ES here (a losing regime on NQ itself). Only then can a
regime detector be validated on the market it trades.
