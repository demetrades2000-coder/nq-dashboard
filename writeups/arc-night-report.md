# Liquidity Engine - Overnight Research Report (15 Oct 2026)

Scripts: `study_night_1_giveback.py`, `study_night_2_filters.py`, `study_night_3_sizing.py`, `study_night_4_firstweek.py`,
`study_night_5_stable.py` (shared helpers in `study_night_common.py`). Each runs standalone with `python <file>`; nothing in
`engine/` was changed. All strategy tests use the real engine with flat sizing (`dd_aware: False, daily_max_loss: 1e9`),
exactly like the earlier BE / exit-signal studies. The sizing study (3) uses the live risk settings instead.

**The four test periods** (as in the owner's record): NQ futures Aug-Oct 2026 (51 trading days); Nasdaq CFD proxy
Q4 2023 (`<= 2023-12-31`), Q1 2024 (`2024-01-01..2024-12-31`, labelled "CFD 2024" in script output) and Q4 2025
(`2025-01-01..2025-12-31`, labelled "CFD 2025"). Baseline with today's defaults: **NQ 2026 +$12,642 (PF 9.9, 2.8/wk) ·
CFD Q4 2023 -$2,438 · CFD Q1 2024 +$1,490 (PF 2.3) · CFD Q4 2025 -$821 · four-period total +$10,873.**

Table cells read: `trades · trades/week · average R per trade · net $ · profit factor · max drawdown $`. "LOW" marks a period
under the 2.5 trades/week floor.

---

## Executive summary

1. **The giveback exit survives the honesty check, but it is not a free lunch.** It improves the four-period total by
   +$1,188 versus no giveback and helps in 5 of the 8 half-periods, in all three CFD periods it cuts the damage, and on
   NQ 2026 it costs $94 (it is a loss-cutter: the 25 giveback exits average -0.2R each, the gain is what the trade
   *would* have lost). The 0.5R threshold is **knife-edge on NQ 2026**: at 0.4R one trade (7 Aug, an A+ that ran to the
   4.8R target after dipping) would have been cut at -0.14R, costing $2,500 of that period. 0.6R is nearly as good as
   0.5R everywhere. Keep 0.5R, but know that the NQ advantage over 0.4R is one trade.
2. **No entry-quality filter passes the owner's test.** Shallow-raid, strong-trigger-candle, skip-the-first-15-minutes,
   first-setup-only and 2R-minimum-room were all run in the real engine and as post-filters. Every one either drops a
   period under 2.5 trades/week, loses money on NQ 2026, or both. The two filters that looked best on paper (planned R:R
   >= 2, and room to major liquidity >= 3R) raise the total by only ~$300 and push CFD Q4 2025 to 1.0-2.3 trades/week.
   The strategy's edge is not in picking fewer setups; it is regime-dependent.
3. **Sizing: today's default (grade sizing, $350, no lock boost) is already the right eval configuration.** On NQ 2026
   it passes the MFFU Builder 50K eval from every start day (43/43 rolling evals, average 13 days), worst day -$290,
   worst open-trade dip -$674. Anything more aggressive that shortens the pass (lock_boost 1.5, risk_mode cushion)
   breaches the $1,000 worst-day line intraday. lock_boost 1.25 and $400 stay inside the line and pass ~2 days faster,
   but they only look good because NQ 2026 is the bot's best period; on the CFD periods bigger size means bigger holes.
4. **First week live - be honest about which distribution you are drawing from.** Using NQ 2026 trades alone, the chance
   of being down more than $1,000 at any point in the first 10 trades is 4% at $350 risk (1% at $250). Using the bot's
   full four-period record it is **21% at $350 and 9% at $250**, and the chance of being underwater after 10 trades is
   one in three. The CFD periods had a 15-29% win rate; NQ 2026 had 48%. Those are not the same bot in the same market.
5. **What is stable across all four periods:** the exit machinery (full stops cost -1.03R, giveback exits -0.15 to
   -0.38R, break-even exits ~0R, targets +1.8 to +3.8R), and nothing on the entry side. No binary entry feature has the
   same-sign lift in all four periods; grade correlates with outcome only on NQ 2026 (+0.52) and not at all on the
   CFD periods (+0.01 / +0.06 / -0.18). Recommendation: **no change to the strategy defaults**; one operational choice for
   the first live week (risk $300 for the first 10 trades) is offered at the end.

---

## 1. Giveback exit - walk-forward honesty check

The giveback rule: once a trade has been up at least `exit_giveback_r` (0.5R), a bar closing back below the entry price
closes the trade. Each period was cut into two halves by trading day and the engine was re-run with giveback off and
with thresholds from 0.3R to 0.75R.

### Full periods

| variant | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 | 4-period total | NQ 2026 net |
|---|---|---|---|---|---|---|
| no giveback | 29 · 2.8/wk · +1.19R · +$12,736 · PF 8.7 · DD -514 | 33 · 6.6/wk · -0.43R · -$3,344 · PF 0.1 · DD -3,344 | 28 · 4.5/wk · +0.14R · +$1,260 · PF 1.9 · DD -562 | 24 · 2.7/wk · -0.20R · -$966 · PF 0.4 · DD -1,095 | +$9,685 | +$12,736 |
| no giveback, exit learner off too | same | same | 28 · +0.07R · +$754 · PF 1.4 | 24 · -0.32R · -$1,232 · PF 0.3 | +$8,913 | +$12,736 |
| giveback 0.4R | 29 · +1.05R · +$10,118 · PF 7.8 · DD -442 | 33 · -0.32R · -$2,581 · PF 0.1 | 28 · +0.23R · +$1,596 · PF 2.5 · DD -329 | 24 · -0.18R · -$834 · PF 0.4 | +$8,299 | +$10,118 |
| **giveback 0.5R (default)** | **29 · 2.8/wk · +1.22R · +$12,642 · PF 9.9 · DD -372** | **33 · 6.6/wk · -0.29R · -$2,438 · PF 0.2 · DD -2,438** | **28 · 4.5/wk · +0.21R · +$1,490 · PF 2.3 · DD -435** | **24 · 2.7/wk · -0.18R · -$821 · PF 0.4 · DD -950** | **+$10,873** | **+$12,642** |
| giveback 0.6R | 29 · +1.16R · +$12,306 · PF 8.0 · DD -514 | 33 · -0.32R · -$2,517 · PF 0.2 | 28 · +0.18R · +$1,223 · PF 1.9 | 24 · -0.19R · -$855 · PF 0.4 | +$10,156 | +$12,306 |
| giveback 0.75R | 29 · +1.16R · +$12,306 · PF 8.0 | 33 · -0.34R · -$2,636 | 28 · +0.13R · +$972 · PF 1.6 | 24 · -0.26R · -$1,012 | +$9,631 | +$12,306 |

(0.3R gives the same result as 0.4R; trade counts are identical in every variant because the rule only changes exits.)

### Half-by-half: giveback net $ minus no-giveback net $

Halves split at 2026-09-11 (NQ), 2023-11-01, 2024-01-23 and 2025-11-13.

| threshold | NQ H1 | NQ H2 | Q4 23 H1 | Q4 23 H2 | Q1 24 H1 | Q1 24 H2 | Q4 25 H1 | Q4 25 H2 | halves improved | total |
|---|---|---|---|---|---|---|---|---|---|---|
| 0.4R | -2,686 | +68 | +575 | +189 | +414 | -78 | -13 | +145 | 5 / 8 | -$1,386 |
| **0.5R** | **-161** | **+68** | **+478** | **+428** | **+308** | **-78** | **0** | **+145** | **5 / 8** | **+$1,188** |
| 0.6R | -429 | 0 | +399 | +428 | +308 | -345 | -34 | +145 | 4 / 8 | +$472 |
| 0.75R | -429 | 0 | +280 | +428 | +51 | -338 | -191 | +145 | 4 / 8 | -$54 |

### Reading it

* Giveback helps in both halves of CFD Q4 2023 and in the second half of every CFD period. It hurts (slightly) on
  NQ 2026 half 1 and CFD Q1 2024 half 2 - the periods/halves where the bot's winners run cleanly after a wobble.
* The rule's value is a drawdown reducer, not a profit maker: NQ max DD -514 -> -372, Q4 2023 -3,344 -> -2,438.
* **Knife-edge warning.** The entire $2,500 gap between 0.4R and 0.5R on NQ 2026 is one trade: 7 Aug 14:50, A+ CISD short,
  dipped back under entry after a 0.4R-0.5R excursion, then ran to the 4.82R target. At 0.4R it is cut at -0.14R and the
  bot then takes a second losing trade that day. With 29 trades in the period that is what "knife-edge" looks like.
  0.6R is within $340 of 0.5R on NQ and within $100 in each CFD period, so the neighbourhood 0.5-0.6R is flat; 0.4R and
  below is where it breaks.
* Verdict: **keep `exit_giveback_r: 0.5` and `exit_rules: "giveback"`.** It has earned its place on the CFD periods, and
  the NQ cost is noise-level ($94). Do not tune it lower.

---

## 2. Entry quality filters (must keep >= 2.5 trades/week in every period)

How each was tested (no engine edits):

* (a) shallow raid: `w_shallow: 100, min_score: 101` turns the existing "shallow raid" confluence (sweep extreme within
  0.5 ATR of the swept pool) into a hard gate in the real engine. Other depths are post-filters on the recorded `depth_atr`.
* (b) trigger body: `w_disp: 100, min_score: 101` gates on body >= 1.0 ATR in the engine; 0.5 / 0.75 ATR are post-filters.
* (c) skip the first N minutes: `entry_windows` moved to 09:40 / 09:45 / 10:00 (and 10:15 for reference). Sweeps still arm from 08:00.
* (d) first valid setup: `max_trades_day: 1` in the engine; "first per session and side" and "drop the second trade" as post-filters.
* (e) target room: `min_rr: 2.0` (and 1.75) in the engine with and without the 2R fallback target; `rr_plan >= 2` and
  `dol_room3` (>= 3R to the nearest major pool) as post-filters.

Post-filters just remove trades from the default list; they ignore that removing a trade would have let the bot take a
different second trade that day, so they are a best case for an engine implementation.

### Real-engine variants

| variant | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 | total | owner's test |
|---|---|---|---|---|---|---|
| baseline (defaults) | 29 · 2.8/wk · +1.22R · +$12,642 · PF 9.9 · DD -372 | 33 · 6.6/wk · -0.29R · -$2,438 · PF 0.2 | 28 · 4.5/wk · +0.21R · +$1,490 · PF 2.3 | 24 · 2.7/wk · -0.18R · -$821 · PF 0.4 | +$10,873 | - |
| (a) shallow raid only (<= 0.5 ATR) | 8 · 0.8/wk LOW · +1.32R · +$4,234 | 6 · 1.2/wk LOW · -$864 | 4 · 0.6/wk LOW · -$228 | 7 · 0.8/wk LOW · +$89 | +$3,231 | fail (frequency, NQ) |
| (b) trigger body >= 1.0 ATR | 11 · 1.1/wk LOW · +0.47R · +$906 | 11 · 2.2/wk LOW · -$549 | 11 · 1.8/wk LOW · -$93 | 10 · 1.1/wk LOW · +$100 | +$364 | fail (frequency, NQ) |
| (c) skip first 10 min | 27 · 2.6/wk · +1.01R · +$11,444 · PF 8.3 | 31 · 6.2/wk · -$2,387 | 27 · 4.4/wk · +$1,522 | 20 · 2.2/wk LOW · -$643 | +$9,936 | fail |
| (c) skip first 15 min | 26 · 2.5/wk · +1.05R · +$11,447 · PF 8.3 | 30 · 6.0/wk · -$2,430 | 26 · 4.2/wk · +$1,531 | 18 · 2.0/wk LOW · -$462 | +$10,086 | fail |
| (c) skip first 30 min | 25 · 2.5/wk · +1.15R · +$10,846 | 30 · 6.0/wk · -$2,416 | 25 · 4.0/wk · +$1,297 | 15 · 1.7/wk LOW · -$1,027 | +$8,701 | fail |
| (c) ref: skip first 45 min | 23 · 2.3/wk LOW · +1.33R · +$11,126 · PF 12.4 | 26 · 5.2/wk · -$2,781 | 25 · 4.0/wk · +$1,289 | 14 · 1.6/wk LOW · -$1,290 | +$8,345 | fail |
| (d) first setup per day (max_trades_day 1) | 26 · 2.5/wk · +1.26R · +$11,346 · PF 10.9 | 22 · 4.4/wk · -$1,113 | 18 · 2.9/wk · +$639 | 21 · 2.3/wk LOW · -$674 | +$10,197 | fail |
| (e) min_rr 2.0 (fallback kept) | identical to baseline | 33 · -0.37R · -$3,127 | identical | 24 · -$796 | +$10,209 | fail (total) |
| (e) min_rr 2.0, no fallback | 29 · +1.12R · +$12,166 · PF 8.2 | 28 · 5.6/wk · -$3,279 | 25 · 4.0/wk · +$1,372 | 20 · 2.2/wk LOW · -$907 | +$9,352 | fail |
| (e) ref: min_rr 1.5, no fallback | 29 · +$12,166 | 30 · -$2,840 | 26 · +$1,265 | 20 · 2.2/wk LOW · -$932 | +$9,658 | fail |
| (e) min_rr 1.75 | identical | 33 · -$3,127 | identical | identical | +$10,184 | fail (total) |
| combo: skip 15 min + first setup per day | 25 · 2.5/wk LOW · +$11,550 | 21 · 4.2/wk · -$1,436 | 17 · 2.7/wk · +$661 | 17 · 1.9/wk LOW · -$277 | +$10,497 | fail |

### Post-filters on the default trade list (best case)

| filter | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 | total | owner's test |
|---|---|---|---|---|---|---|
| (a) depth <= 1.0 ATR | 14 · 1.4/wk LOW · +$4,734 | 13 · 2.6/wk · -$1,363 | 9 · 1.5/wk LOW · -$98 | 13 · 1.4/wk LOW · -$468 | +$2,806 | fail |
| (a) depth <= 1.5 ATR | 15 · 1.5/wk LOW · +$4,546 | 15 · 3.0/wk · -$1,422 | 13 · 2.1/wk LOW · +$150 | 16 · 1.8/wk LOW · -$560 | +$2,714 | fail |
| (a) complement: depth > 0.5 ATR | 22 · 2.2/wk LOW · +$8,197 | 28 · -$1,572 | 25 · +$1,505 | 17 · 1.9/wk LOW · -$559 | +$7,571 | fail |
| (b) body >= 0.5 ATR | 16 · 1.6/wk LOW · +$3,952 | 21 · 4.2/wk · -$566 | 19 · 3.1/wk · +$1,471 · PF 3.7 | 17 · 1.9/wk LOW · -$386 | +$4,471 | fail |
| (b) body >= 0.75 ATR | 12 · 1.2/wk LOW · +$3,324 | 16 · 3.2/wk · -$211 | 14 · 2.3/wk LOW · +$1,335 | 12 · 1.3/wk LOW · -$397 | +$4,051 | fail |
| (d) first per session and side | 27 · 2.6/wk · +$11,242 · PF 10.0 | 31 · 6.2/wk · -$2,418 | 25 · 4.0/wk · +$589 | 23 · 2.6/wk · -$731 | +$8,683 | fail (total, NQ) |
| (d) drop 2nd trade of the day | 26 · 2.5/wk · +$11,346 · PF 10.9 | 22 · 4.4/wk · -$1,113 | 18 · 2.9/wk · +$639 | 21 · 2.3/wk LOW · -$674 | +$10,197 | fail |
| (e) planned R:R >= 2 | identical (29 · +$12,642) | 29 · 5.8/wk · -$2,471 | 26 · 4.2/wk · +$1,597 · PF 2.5 | 21 · 2.3/wk LOW · -$594 | +$11,174 | fail (frequency only) |
| (e) room to major liquidity >= 3R | 23 · 2.3/wk LOW · +1.45R · +$12,434 · PF 11.6 | 16 · 3.2/wk · -$1,728 | 18 · 2.9/wk · +$1,255 | 9 · 1.0/wk LOW · -$808 | +$11,152 | fail (frequency, NQ) |

How often the default trades have each property: shallow raid 11-29% of trades, body >= 1 ATR 27-34%, entered 09:30-09:45
7-29%, second trade of the day 10-36%, planned R:R >= 2 already 88-100%.

### Reading it

* **Nothing passes.** The hard quality gates (shallow raid, big trigger candle) throw away two thirds of the trades,
  including the NQ winners; the bot's big NQ winners are not systematically "clean" setups.
* Skipping the first 15 minutes costs NQ 2026 two trades worth $1,200 and drops CFD Q4 2025 to 2.0/wk; its only gain is
  $360 in Q4 2025. The first-45-minutes penalty is already handled by the grade (`g_early: 2`), which sizes down instead
  of skipping - that is the right place for it.
* The second trade of the day is a mixed bag: dropping it saves $1,325 in CFD Q4 2023 but gives back $851 in Q1 2024
  and $1,296 on NQ. Not stable.
* The 2R-room idea is the closest thing to a real effect (+$300 best case with NQ untouched), but as an engine
  change (`min_rr: 2.0`) it moves targets further out and costs $700 in Q4 2023; as a hard skip it drops Q4 2025 under
  the floor. Not adoptable.

---

## 3. Position sizing on NQ 2026 (live risk settings, MFFU Builder 50K)

Everything here uses the live settings (`dd_aware: True`, `daily_max_loss: 600`). Important caveat: **the trade list is
not identical for every variant.** Grade sizing halves D-grade trades and the trending-regime rule halves again, so two
D-grade trades (23 Sep, 5 Oct) had a planned risk of $88 - less than one micro on a 49-58 point stop - and were skipped
by the engine ("risk too small"). Flat sizing takes them (+$360 and -$46). The table says where the list differs.

| sizing | same trades? | net | max DD | worst day | worst open-trade dip | < $1k day | avg / max risk per trade | eval from day 1 | rolling evals: pass rate (avg days) | bootstrap 60-day evals: pass / fail / median days |
|---|---|---|---|---|---|---|---|---|---|---|
| **default: grade sizing, $350, lock_boost 1** | yes | +$12,642 | -$372 | -$290 | -$674 | ok | $249 / $510 | PASS day 2 | **100% (43 runs, 13.1 d)** | 100% / 0% / 14 |
| conviction sizing (grade off) | yes | +$12,184 | -$548 | -$352 | -$674 | ok | $273 / $459 | PASS day 16 | 100% (36, 13.9 d) | 100% / 0.1% / 14 |
| flat $350 | no (31 vs 29) | +$11,090 | -$788 | -$552 | -$674 | ok | $288 / $348 | PASS day 16 | 100% (41, 13.5 d) | 99% / 0.8% / 14 |
| grade, $300 | yes | +$10,679 | -$284 | -$244 | -$337 | ok | $200 / $446 | PASS day 13 | 100% (36, 14.4 d) | 99.9% / 0% / 16 |
| grade, $400 | no (30) | +$14,585 | -$416 | -$336 | -$674 | ok | $280 / $595 | PASS day 2 | 100% (43, 11.6 d) | 100% / 0% / 12 |
| grade, $350, lock_boost 1.25 | no (30) | +$15,740 | -$444 | -$444 | -$674 | ok | $296 / $656 | PASS day 2 | 100% (43, 10.7 d) | 100% / 0% / 11 |
| grade, $350, lock_boost 1.5 | no (31) | +$18,086 | -$580 | -$489 | **-$1,011** | BREACH | $354 / $765 | PASS day 2 | 100% (44, 10.4 d) | 99.8% / 0.2% / 10 |
| grade, $400, lock_boost 1.5 | no (31) | +$20,856 | -$700 | -$534 | **-$1,011** | BREACH | $405 / $850 | PASS day 2 | 100% (45, 8.9 d) | 99.6% / 0.4% / 9 |
| grade, risk_mode cushion | no (31) | +$24,744 | -$788 | -$688 | **-$1,348** | BREACH | $488 / $1,020 | PASS day 2 | 100% (45, 8.3 d) | 98.9% / 1.1% / 7 |
| grade, cushion + lock_boost 1.5 | no (31) | +$33,594 | -$1,281 | **-$1,013** | **-$2,022** | BREACH | $712 / $1,558 | PASS day 2 | 88.9% (45, 7.0 d) | 94.2% / 5.9% / 6 |
| flat $300 | no (31) | +$9,151 | -$700 | -$444 | -$504 | ok | $244 / $300 | PASS day 16 | 100% (34, 20.5 d) | 99.2% / 0.4% / 17 |
| flat $250 | no (31) | +$8,009 | -$492 | -$398 | -$448 | ok | $201 / $248 | PASS day 16 | 100% (31, 21.7 d) | 99.2% / 0% / 20 |
| flat $400 | no (31) | +$12,854 | -$908 | -$608 | -$748 | ok | $339 / $399 | PASS day 2 | 100% (43, 10.8 d) | 98.4% / 1.5% / 12 |
| grade, $350, dd_aware off | yes | identical to default | | | | | | | | |

("worst open-trade dip" = the lowest point of the day counting an open trade at its worst excursion - what MFFU's
intraday monitoring would see. "rolling evals" start a fresh eval on every historical day; 60-day bootstrap = 2,000 random
sequences of NQ 2026 trading days.)

### Reading it

* **Best eval outcome inside the $1,000 line: the current default.** It never fails, passes in ~13 days on average, and
  its worst day is -$290. The faster variants (lock_boost 1.25 at 10.7 days, $400 at 11.6 days) are also inside the line,
  but the speed-up is two days and the cost is a bigger hole when the next period looks like the CFD ones (in CFD Q4 2023
  the same logic lost 9.7R flat; at $400 x grade that is a blown eval, not a slow one).
* `lock_boost 1.5`, `risk_mode: cushion`, and their combination all **breach** the $1,000 worst-day line on the open-trade
  dip (-$1,011 to -$2,022) even on the best period. Do not enable them for the eval.
* Grade sizing adds +6R on NQ 2026 but is flat on the CFD periods (see section 5): keep it on because it protects the
  downside (D trades at half size), not because it predicts winners.
* `dd_aware` never bound on NQ 2026 (identical results) - it is purely a safety net; leave it on.

---

## 4. First week live - what to expect, honestly

Bootstrap: 5,000 resamples of the bot's per-trade R outcomes, converted to dollars at a flat $350 or $250 per trade.
"Down > $X at any point" is the running low from the starting balance (what an eval account feels). The bot takes about
3 trades a week, so 5 trades ~ week 1, 10 ~ weeks 1-2, 20 ~ the first month and a half.

### The source distributions

| distribution | trades | win rate | avg R | median R | avg win | avg loss | full stops (<= -0.9R) |
|---|---|---|---|---|---|---|---|
| NQ 2026 (what the owner is looking at) | 29 | **48%** | +1.22 | -0.01 | +3.09R | -0.53R | 17% |
| CFD Q4 2023 | 33 | 15% | -0.29 | -0.23 | +0.97R | -0.52R | 33% |
| CFD Q1 2024 | 28 | 29% | +0.21 | -0.10 | +1.63R | -0.36R | 14% |
| CFD Q4 2025 | 24 | 17% | -0.18 | -0.19 | +1.28R | -0.47R | 25% |
| all four pooled | 114 | **27%** | +0.24 | -0.10 | +2.14R | -0.47R | 23% |

Note that the *median* trade is a small loss in every period, including NQ 2026. The bot makes money from a handful of
3-5R runners; a week without one is a losing week by design.

### If the live market behaves like NQ 2026 (optimistic case)

| risk | trades | P(down > $600) | P(down > $1,000) | P(down > $2,000) | P(underwater at end) | P(>= +$3,000, eval passed) | 5th pct | median | 95th pct |
|---|---|---|---|---|---|---|---|---|---|
| $350 | 5 | 11% | 2% | 0% | 10% | 29% | -$433 | +$2,081 | +$4,884 |
| $350 | 10 | 12% | 4% | 0% | 3% | 70% | +$622 | +$4,203 | +$8,167 |
| $350 | 20 | 12% | 4% | 0% | 0% | 96% | +$3,185 | +$8,458 | +$14,074 |
| $250 | 5 | 5% | 0% | 0% | 10% | 12% | -$338 | +$1,500 | +$3,599 |
| $250 | 10 | 6% | 1% | 0% | 3% | 51% | +$384 | +$3,044 | +$5,857 |
| $250 | 20 | 6% | 1% | 0% | 0% | 91% | +$2,314 | +$5,985 | +$9,963 |

### If the live market behaves like the bot's full record (honest case)

| risk | trades | P(down > $600) | P(down > $1,000) | P(down > $2,000) | P(DD from peak > $2,000) | P(underwater at end) | P(>= +$3,000) | 5th pct | median | 95th pct |
|---|---|---|---|---|---|---|---|---|---|---|
| $350 | 5 | 28% | 8% | 0% | 0% | 41% | 3% | -$1,096 | +$256 | +$2,547 |
| $350 | 10 | **40%** | **21%** | 2% | 2% | 33% | 10% | -$1,512 | +$675 | +$3,761 |
| $350 | 20 | 47% | 30% | 8% | 15% | 24% | 26% | -$1,813 | +$1,512 | +$5,598 |
| $250 | 5 | 14% | 1% | 0% | 0% | 42% | 0% | -$776 | +$196 | +$1,814 |
| $250 | 10 | 27% | **9%** | 0% | 0% | 33% | 3% | -$1,046 | +$480 | +$2,627 |
| $250 | 20 | 36% | 19% | 2% | 3% | 24% | 14% | -$1,260 | +$1,114 | +$4,065 |

### If the live market behaves like the worst period (CFD Q4 2023)

| risk | trades | P(down > $600) | P(down > $1,000) | P(down > $2,000) | P(underwater at end) | median |
|---|---|---|---|---|---|---|
| $350 | 10 | 82% | 62% | 11% | 89% | -$1,084 |
| $350 | 20 | 95% | 89% | **60%** | 95% | -$2,127 |
| $250 | 10 | 69% | 37% | 0% | 89% | -$752 |
| $250 | 20 | 92% | 80% | 30% | 95% | -$1,517 |

### The actual NQ 2026 sequence (flat $350) - how it felt

Trades 3-5 were -$359, -$163, -$358 in a row (a $880 slide from the day-2 high); trades 10-12 another -$577 run. Over
29 trades there were 9 targets (+$1,225 to +$1,745 each), 5 full stops, 4 giveback exits and 4 break-even scratches.
Four of the nine target hits were **D-grade** trades (6 Aug, 17 Sep, 21 Sep, 13 Oct) - grade sizing would have taken them
at half size.

### First-week plan (what I would actually do)

1. Keep the eval config exactly as the defaults (grade sizing, `daily_max_loss: 600`, `dd_aware: True`, `lock_boost: 1.0`).
   The engine already stops for the day at -$600 and sizes D-grade/trending trades down; that is what kept the worst
   live-config day at -$290.
2. For the **first 10 trades** run `risk_usd: 300` (grade sizing on). On NQ 2026 data this costs about one extra day to
   pass (14.4 vs 13.1) and nothing in pass rate; under the honest distribution it trims the chance of a > $1,000 hole in
   the first two weeks from ~21% to ~13% (interpolating between the $350 and $250 rows). Go to $350 once the account is
   above +$1,000 or after 10 trades, whichever is later.
3. Decide the kill rule now, not after the drawdown: if the account is down more than $1,000 from its peak after 10
   trades, or the win rate over the first 15 trades is under 25%, stop and treat the market as a "CFD-like" regime (the
   bot has no edge there). The honest tables say this happens roughly one time in five.
4. Expect week 1 to be flat-to-down about half the time (41% underwater after 5 trades on the pooled record, 10% even on
   NQ 2026). One 4R runner changes everything; the plan must survive until it arrives.
5. Do not touch sizing, thresholds or filters mid-week based on live results; 5-10 trades cannot distinguish luck from
   a regime change (see the knife-edge note in section 1).

---

## 5. What is stable across all four periods

Average R per trade (count) for the default configuration, flat sizing.

| exit reason | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 |
|---|---|---|---|---|
| TARGET | +3.82R (9) | +1.77R (2) | +2.47R (3) | +2.12R (2) |
| TIME (flat at close, in profit) | +1.77R (5) | +1.13R (1) | +1.40R (4) | - |
| BE/TRAIL (break-even scratch) | -0.02R (4) | -0.02R (4) | -0.03R (5) | -0.01R (3) |
| SIGNAL giveback | -0.38R (4) | -0.23R (8) | -0.17R (8) | -0.15R (5) |
| TIME STOP (no +0.5R in 30 min) | -0.59R (2) | -0.15R (7) | -0.48R (5) | -0.31R (7) |
| STOP | -1.03R (5) | -1.03R (11) | -1.08R (3) | -1.04R (6) |

| cut | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 |
|---|---|---|---|---|
| IFVG trigger | +0.82R (21) | -0.30R (23) | +0.39R (22) | -0.11R (15) |
| CISD trigger | +2.26R (8) | -0.27R (10) | -0.46R (6) | -0.29R (9) |
| longs / shorts | +0.89R (15) / +1.57R (14) | -0.27R / -0.31R | +0.18R / +0.24R | +0.33R (9) / -0.48R (15) |
| AM / PM session | +1.25R (16) / +1.18R (13) | -0.32R (25) / -0.21R (8) | +0.24R / +0.15R | -0.00R (16) / -0.53R (8) |
| rotational / trending regime | +1.14R (27) / +2.30R (2) | -0.39R (23) / -0.08R (10) | +0.65R (7) / +0.06R (21) | -0.03R (12) / -0.33R (12) |
| 1st / 2nd trade of day | +1.26R (26) / +0.81R (3) | -0.28R / -0.32R | +0.08R (18) / +0.43R (10) | -0.16R (21) / -0.28R (3) |

| grade sizing | NQ 2026 | CFD Q4 2023 | CFD Q1 2024 | CFD Q4 2025 |
|---|---|---|---|---|
| correlation(grade multiplier, R) | **+0.52** | +0.01 | +0.06 | -0.18 |
| sum R flat -> sum R x grade | +35.3R -> +41.5R (+6.1R) | -9.7R -> -8.1R (+1.6R) | +5.9R -> +5.9R (0) | -4.3R -> -4.4R (-0.1R) |

Stable (same direction in all four periods):

* **The exit ladder.** Full stops cost almost exactly 1R (slippage and commission included), break-even exits are free,
  time stops cost 0.15-0.6R, giveback exits 0.15-0.4R, winners 1.8-3.8R. The trade-management side of the bot behaves
  identically in good and bad markets. What changes between periods is purely *how often the target gets hit*: 31% of
  trades on NQ 2026, 6-11% on the CFD periods.
* **CISD triggers are worse than IFVG triggers in every CFD period** (-0.27 to -0.46R vs -0.30 to +0.39R) and better only
  on NQ 2026. With 6-10 CISD trades per period this is suggestive, not proven; it is worth a follow-up study with
  `use_cisd: False` (it would lower frequency by ~25%, so it fails the floor as a hard skip - a grade penalty is the
  only form it could take).
* **Grade does not predict outcome outside NQ 2026.** The checklist is largely the product of the NQ-period discovery
  runs; on the CFD data it is noise (correlations 0.01 / 0.06 / -0.18). Keep grade sizing for its downside protection,
  but do not read "A+" as a forecast.
* **No binary entry feature** (out of ~90 recorded) has a same-sign lift in all four periods with at least 4 trades on
  each side. This is the statistical version of "every entry filter failed": the entry edge is regime-dependent, and the
  regime the bot likes (NQ 2026: 48% win rate, rotational days) is not the regime the CFD data shows.
* **Second-trade-of-the-day and PM-session trades are not reliably worse**; the owner's instinct to keep frequency is
  supported by the data.

---

## Recommendations for defaults

**No change to the strategy defaults.** Specifically:

* `exit_rules: "giveback"`, `exit_giveback_r: 0.5` - keep (section 1). Not knife-edge upward (0.6R is close), knife-edge
  downward (0.4R loses one 4.8R trade on NQ); 0.5 is the right side of the edge.
* No entry filter is adoptable under the owner's rules (section 2). `entry_windows`, `min_rr`, `max_trades_day`,
  `w_shallow`, `w_disp`, `use_fallback` stay as they are.
* Sizing defaults (`grade_sizing: True`, `risk_usd: 350`, `risk_mode: "fixed"`, `lock_boost: 1.0`, `dd_aware: True`,
  `daily_max_loss: 600`) are already the best MFFU eval configuration inside the $1,000 worst-day line (section 3).
  `lock_boost >= 1.5` and `risk_mode: "cushion"` are rejected: they breach the line even on the best period.

Exact param dict to change in `DEFAULTS`: **`{}`** (nothing).

Operational suggestion for the live eval account only (a run-time override, not a default change), from section 4:

> _Code omitted on the public site._

Follow-up research worth a night (not adoptable yet): a grade penalty for CISD triggers (stable negative in all three
CFD periods), and a regime detector that recognises "CFD-like" conditions (win rate collapses to 15-29%) early enough to
halve size - the current `regime_er10_max` trending detector does not separate the good and bad periods (section 5,
regime row).
