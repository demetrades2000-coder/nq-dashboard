## Money first

**Nothing passes every gate, so nothing changes, and there is no pick v3.** BLITZ's trades stay exactly as they are. The
later-break eval size (`research/scalp/blitz_25k_pick_v2.json`, still waiting for your OK) remains the one change on the
table. There is one lead for the funded 25K, for paper only.

**Round 3 in one table** (20 Monte Carlo seeds; slot $ a month to you, net of every $63 eval):

| Set-up | Slot H1 / H2 / 2021-25 (mean of 20 seeds) | vs v2: seeds better H1 / H2 / 2021-25 | Verdict |
|---|---|---|---|
| Today | $257 / $43 / -$40 | | baseline |
| v2 (later-break eval size) | $276 / $57 / -$38 | | adopt-candidate since this morning |
| (a) v2 + the funded later-break size only (later 2 micros, <= 25% of the room) | $299 / $93 / -$38 | 20 / 20 / 8 | 2021-25 flat |
| (b) v2 + the later give-up line only (1 x the median stop) | $272 / $64 / -$31 | 0 / 20 / 20 | loses in H1; fee saving, not edge |
| C3 = (a) + (b) | $293 / $99 / -$28 | 20 / 20 / 20 | not what the H1 rules pick |
| C1 (later 3 micros, 2 on every trade after the lock, <= 50%) | $320 / $134 / -$34 | 20 / 20 / 19 | not the H1 pick; weak under stress |
| **H1-rule pick (later 2 micros, <= 35% of the room, give up at 1.5 x)** | $328 / $69 / -$35 (+51.8 / +11.7 / +3.2) | 20 / 20 / 20 | **fails the stress / year / control checks** |
| Momentum-regime day gate (H1 pick) | at $150: $908 / -$16 / -$4 a month (today $963 / $667 / $73) | | rejected |
| BLITZ on ES as a 2nd market (MES, 5m; 2025 May-Dec / 2026 H1 / H2) | at $150: -$96 / +$42 / -$311 a month, PF 0.94 / 1.03 / 0.82 | | rejected |

## Round 4 (13:12): BLITZ on ES as a second market

**The question.** Could the same 25K also trade BLITZ on ES (micro contract MES) to get more trades from a second market?
Nothing in the write-ups had run the noise-area scalp on ES itself.

**How it was tested.**

- Today's rule, unchanged, on CME ES1! 5m bars (`data/ES_5m.csv`, TradingView, 2025-04-13 .. 2026-10-16). It runs
  exactly as the 2021-25 NQ 5m reference runs:
  - the 14-day noise band, the prior-day range filter and the 11:00-15:30 checks;
  - a stop at 1.5 x the 5m ATR, the 1.5R trail and the 30-minute clock.
- Costs: MES $5 a point a micro, $1.90 a micro round trip, 1 tick (0.25 pt = $1.25) on market and stop fills.
- ES has no anti-hedge partner. NQ BLITZ is shown on the same 5m bars (as account C) for a like-for-like line.
- April 2025 is the warm-up for the 14-day band, so the reference span is May-Dec 2025.

| At $150 a trade | Trades / week | Weeks 2+ | Win % | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| ES, 2025 May-Dec | 9.0 | 81% | 47.0 | 0.94 | -$795 | **-$96** | -$1,881 |
| ES, 2026 H1 | 9.2 | 85% | 44.3 | 1.03 | +$255 | **+$42** | -$1,318 |
| ES, 2026 H2 (to Oct 16) | 9.5 | 88% | 46.6 | 0.82 | -$1,155 | **-$311** | -$1,740 |
| NQ (5m, same bars), 2025 May-Dec | 8.5 | 83% | 51.4 | 1.13 | +$1,458 | +$176 | -$1,647 |
| NQ (5m), 2026 H1 | 10.0 | 100% | 55.7 | 1.48 | +$5,058 | +$830 | -$1,020 |
| NQ (5m), 2026 H2 | 6.8 | 75% | 51.9 | 1.50 | +$2,120 | +$571 | -$799 |
| NQ (1m, the live rule), 2026 H1 / H2 | 8.5 / 6.8 | 89 / 75% | 56.7 / 56.6 | 1.70 / 1.62 | +$5,873 / +$2,478 | +$963 / +$667 | -$1,152 / -$815 |

- **ES fails in every span** (PF 0.94 / 1.03 / 0.82, the test was PF > 1.1).
- **It would not diversify either.** The daily P&L correlation with NQ BLITZ is 0.66 / 0.64 / 0.58 (with the 1m NQ
  rule: 0.60 / 0.56 in 2026). On the days both trade, ES takes the same side as NQ 88% / 94% / 86% of the time. On one
  25K that is mostly the same bet twice.
- **Why ES is worse.**
  - Costs: ES's median stop is 10.3 points (a 1-micro stop-out of about $55). A tick and the commission are 7-9% of 1R
    on ES, against 2-3% on NQ.
  - Before costs, ES is PF 1.21 / 1.28 / 1.11 and NQ is 1.22 / 1.52 / 1.79. In 2026 ES is weaker even before costs.
- **Step 2 (NQ + ES on one 25K) was not built**, because ES failed step 1.
  - If it ever is, the live engine would need an MES contract route, a second `engine/blitz.Engine` on ES bars, and one
    room / daily-loss budget shared by both positions.
  - It would have no anti-hedge partner on ES.
- **Caveat:** only 18 months of ES 5m history (2021-25 cannot be checked on ES), and 5m bars only (the live NQ rule runs
  on 1m). With a PF under 1 in two of three spans, a longer history is unlikely to change the verdict.
- Rejected. Run `bzx_es_solo`; code `python -X utf8 tools/bzx_es.py solo`.

**BLITZ's trades at $150 a trade** (unchanged by everything below; costs in):

| Period | Trades / week | Weeks with 2+ | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|
| 2026 Jan-Jun (pick) | 8.5 | 89% | 1.70 | +$5,873 | **+$963** | -$1,152 |
| 2026 Jul-Oct 16 (check) | 6.8 | 75% | 1.62 | +$2,478 | **+$667** | -$815 |
| 2021-25 (5m, 5 years) | 8.6 | 80% | 1.05 | +$3,765 | **+$73** | -$5,512 |

**The whole 25K slot** (buy the $63 eval, pass, 2 sessions of paperwork, funded, payouts 80% to you, a new eval after a fail
/ stuck / 5 payouts; 6-month Monte Carlo, 1,000 paths, $ a month to you **net of every eval bought**):

| | 25K eval 2-week pass / fail (H1 / H2 / 2021-25) | **Slot $ / month H1** | **H2** | **2021-25** | Passes every gate? |
|---|---|---:|---:|---:|---|
| Today (eval 40% of the room, full room from session 5; funded 1 micro: 10% of the room, <= $150) | 36.1/37.8, 36.2/34.8, 20.4/50.2 | $270 | $37 | -$40 | (baseline) |
| v2: the later-break eval size (blitz_25k_pick_v2.json), funded as today | 47.9/23.5, 36.2/21.7, 24.7/48.4 | $286 | $52 | -$39 | yes (this morning) |
| **C3 lead: v2 eval + funded later break 2 micros (first 1) while <= 25% of the room, abandon at 1 x the median stop** | same as v2 | **$308** | **$94** | **-$30** | **no - not the H1 pick** |
| C1: v2 eval + funded later break 3 micros, every trade 2 after the floor locks, <= 50% of the room | same as v2 | $333 | $122 | -$36 | no - not the H1 pick; 2021-25 ties / loses under stress |
| H1 pick: v2 eval + funded later break 2 micros (first 1), <= 50% of the room | same as v2 | $360 | $36 | -$42 | **no - fails H2 and 2021-25** |

In money: the C3 lead would add about **+$22 / +$42 / +$9 a month** to v2's slot (H1 / H2 / 2021-25, the mean of 3
Monte Carlo seeds +$17 / +$41 / +$10). Against today's whole set-up (today's eval and funded size) that is +$38 / +$57 /
+$10 a month. The BLITZ 25K slot still loses about $30 a month in a 2021-25-like market.

## Round 3 (13:00): can C3 become an adopt-candidate? And a momentum-regime gate

### C3 on 20 seeds, and its two parts

Slot $ a month vs v2 on the same seed. 20 Monte Carlo seeds (23-42), 1,000 paths each. Columns: mean gain (worst / best
seed, seeds better).

| | H1 | H2 | 2021-25 |
|---|---|---|---|
| C3 (a + b) | +16.9 (+11 / +24, 20/20) | +42.2 (+39 / +45, 20/20) | +9.8 (+8 / +12, 20/20) |
| (a) later-break funded size alone | +23.4 (+19 / +30, 20/20) | +35.3 (+33 / +38, 20/20) | +0.3 (-2 / +3, 8/20) |
| (b) give-up at 1 x the median stop alone | -3.9 (-5 / -1, 0/20) | +6.8 (+5 / +9, 20/20) | +6.9 (+5 / +8, 20/20) |
| C1 | +44.0 (+37 / +53, 20/20) | +76.3 (+70 / +84, 20/20) | +4.2 (+0 / +8, 19/20) |

Random directions (8 seeds, the same sizes on coin-flip trades), gain vs v2:

| | H1 | H2 | 2021-25 |
|---|---:|---:|---:|
| (a) | +3 | +8 | -2 |
| (b) | +13 | +2 | +10 |
| C3 | +16 | +11 | +10 |

- **(b) is fee saving, not edge.** Keeping a funded account alive until it is down to 1 stop-out, instead of 2, delays
  buying the next $63 eval. It earns as much on random trades as on BLITZ's trades. Alone it loses $1-5 a month in H1
  on every seed, so it cannot be adopted alone.
- **(a) is real in 2026 and zero in 2021-25.** It needs BLITZ's edge: random trades gain nothing. But in 2021-25 it is
  +0.3 a month and better on only 8 of 20 seeds.
- **C3's 2021-25 gain is almost all (b).**

### Would an H1-only rule pick C3?

The grid (40 cells): room share 15 / 20 / 25 / 30 / 35%, give-up line 0.75 / 1.0 / 1.25 / 1.5 x the median stop, later
break 2 or 3 micros. First break 1 micro.

Three selection rules were written into `research/scalp/bzx_c3_pick.json` before any H2 or 2021-25 number of the grid
was computed. Each uses 10 H1 seeds, gain vs v2:

- A = the best worst-case over the cell and its grid neighbours (plateau);
- B = the best worst seed;
- C = the best median.

**All three pick the same cell: later 2 micros, <= 35% of the room, give up at 1.5 x.** That is not C3: it is two steps
up in room share and two steps up in the give-up line, and it is the corner of the grid.

Median H1 gain vs v2 (10 seeds), later 2 micros. Rows = give-up line, columns = room share 15 / 20 / 25 / 30 / 35%:

| give-up | 15% | 20% | 25% | 30% | 35% |
|---|---:|---:|---:|---:|---:|
| 0.75 x | -5.0 | +4.0 | +10.0 | +24.5 | +33.5 |
| 1.0 x | +0.0 | +8.0 | **+17.0 (C3)** | +32.5 | +44.0 |
| 1.25 x | +3.5 | +12.5 | +20.5 | +37.0 | +49.5 |
| 1.5 x | +5.0 | +15.0 | +23.0 | +40.0 | **+52.5 (pick)** |

The same cells in H2: +33 to +44.5 at 15-25% of the room, falling to +12 to +21.5 at 30-35%. In 2021-25: +2 to +19.5,
set mostly by the give-up line (0.75 x the most). Later 3 micros lose in H1 in 17 of 20 cells. 21 of the 40 cells have a
positive median gain in all three spans.

**The rule's pick, checked** (gain vs v2):

| Check | H1 | H2 | 2021-25 |
|---|---:|---:|---:|
| 20 seeds (mean, worst, seeds better) | +51.8 (+48, 20/20) | +11.7 (+7, 20/20) | +3.2 (+1, 20/20) |
| +1 tick a side | +44 | +7 | **-2** |
| +2 ticks a side | +42 | +7 | **-5** |
| 1 bar late | +23 | **-2** | +4 |
| 2021-25 by year (2022 / 2023 / 2024 / 2025) | | | +22 / +4 / **-8** / +6 |
| random directions | +5 | +5 | 0 |
| shuffled first / later labels: real vs shuffled mean (share of shuffles as good) | $335 vs $296 (0.00) | $61 vs **$84 (0.95)** | -$37 vs -$37 (0.60) |
| next cell out: room share 50% (5 seeds) | +74.2 | **-8.6 (0/5)** | -0.4 |

- It passes the plain three-span test on all 20 seeds. It needs BLITZ's edge: random directions gain about nothing.
- It fails the checks around it:
  - In 2021-25 it turns negative with one extra tick of slippage, and it loses in 2024.
  - It loses in H2 when the entry is one bar late.
  - In H2, putting the 2nd micro on random trades does better than putting it on later breaks.
  - One step past the grid edge (50% of the room) fails H2.
- **Not an adopt-candidate. C3 itself is dropped as a candidate:** the H1 data would not have chosen it.
- What remains is a paper lead: "a later band break gets the 2nd micro in the funded 25K". It is worth watching on BLITZ's
  funded paper ledger, not switching.

### The momentum-regime day gate (new family)

The measures come from the market only (CME NQ 5m, every session 2021-11 to 2026-10). They use the prior 20 or 40
sessions, so they are known before the open:

- **ac** = the lag-1 autocorrelation of the thirteen 30-minute RTH returns;
- **vr** = the variance ratio of the day's return vs its 30-minute pieces (> 1 = moves persist);
- **ft** = the share of days whose first noise-band break at 11:00 / 11:30 / 12:00 kept going to the 16:00 close.

The gate: no BLITZ trade on an "off" day, or half size. "On" = the measure at or above its 20 / 35 / 50 / 65 / 80th
percentile over 2026 H1 BLITZ days. Pick rules were written before H2 / 2021-25 were computed (`bzx_regime_pick.json`):

- G1 = the best H1 $ a month with >= 2 trades a week;
- G2 = the strictest gate that keeps >= 95% of H1's $.

| At $150 a trade | H1: on / trades a week / PF / $ a month | H2 | 2021-25 |
|---|---|---|---|
| No gate (today) | 100% / 8.5 / 1.70 / $963 | 100% / 6.8 / 1.62 / $667 | 100% / 8.6 / 1.05 / $73 |
| G1: ft40 >= H1 p35 (0.54) | 65% / 5.6 / 2.02 / $908 | **14% / 0.96 / 0.94 / -$16** | 67% / 5.7 / 1.00 / -$4 |
| best 2021-25 gate: vr40 >= p20 | 80% / 6.8 / 1.42 / $510 | 54% / 3.7 / 1.41 / $291 | 88% / 7.5 / 1.04 / $60 |

- **0 of 30 skip gates and 0 of 30 half-size gates beat today in all three spans.** Not one gate raises 2021-25 above
  $73 a month.
- G2 does not exist: every gate costs more than 5% of H1's $.
- G1 by year (2021-25): 2022 $244 -> $59, 2023 $131 -> $58, 2024 -$200 -> -$153, 2025 $140 -> $28. Trades a week stay at
  4.6-6.8.
- Shuffled days (the measure's values on random dates, 20 seeds): $35 a month in 2021-25 vs the real gate's -$4. The
  real gate is worse than random.
- The fact behind it: **2026 H2 reads as a low-momentum market on all three measures.** The H1 cut leaves only 14% of H2
  days "on". Yet BLITZ made PF 1.62 there. The market's own momentum does not explain why BLITZ works in 2026 and not in
  2021-25. Rejected.

## Why the funded stage loses the money

- At today's funded size a BLITZ trade is **always 1 micro**. One stop-out costs about $122 (2026) / $80 (2021-25). 10% of
  the $1,000 room is under that, so the "at least 1 micro" rule decides the size.
- The first payout needs the balance at +$1,350 (the $1,100 buffer + the $250 minimum). At 1 micro that takes about 8
  weeks of 2026-quality trading.
- After 6 months, most funded accounts are **still open without a payout**: 68% in H1, 59% in H2, 57% in 2021-25. The
  rest are mostly given up at the "stuck" line (room under 2 stop-outs): 18% / 40% / 43%. Only in H1 do some finish all
  5 payouts (14%). Funded accounts are never lost outright. The stuck line catches them first.
- So the funded account needs either more $ per good trade, or a later "give up" line. A smaller size is impossible: a
  micro is the minimum.

## 1. The funded stage (direction 1)

All on the later-break eval (v2), so each row shows only the funded change. Slot $ a month vs today's funded size
(H1 / H2 / 2021-25, 600 paths, seed 23; base $282 / $52 / -$38):

| Funded rule (new for BLITZ's 25K) | H1 | H2 | 2021-25 | Verdict |
|---|---:|---:|---:|---|
| Buffer first: 1 micro until the floor locks at +$100, then 20-60% of the room, <= $300-600 | -$24 to -$142 | +$30 to +$41 | -$4 to +$4 | rejected (H1) |
| Funded day loss stop -$150 / -$250 / -$350 | +$39 / +$12 / $0 | -$1 / $0 / $0 | -$3 / $0 / -$1 | rejected |
| Stop after 1 / 2 / 3 losing trades a day | -$149 / -$17 / +$1 | -$55 / -$21 / +$7 | -$8 / -$3 / -$2 | rejected |
| At most 2 / 3 / 4 trades a day | -$86 / -$59 / -$23 | -$84 / -$54 / -$35 | -$4 / -$4 / +$2 | rejected |
| Week loss stop -$250 / -$400 / -$600 | -$11 / -$12 / -$1 | -$1 / -$10 / -$7 | $0 / -$1 / $0 | rejected |
| Ask for at most $250 / $500 / $750 a payout | -$210 / -$125 / -$58 | -$46 / -$22 / -$8 | -$8 / -$3 / -$1 | rejected |
| Ask only once $500 / $750 / $1,000 is above the buffer | +$8 / +$14 / -$2 | -$1 / -$4 / -$12 | $0 / -$2 / -$6 | rejected |
| No +$400 day stop | -$25 | +$9 | -$3 | rejected |
| Give up at 1.5 x / 1 x / never (instead of 2 x the median stop) | -$1 / -$4 / -$10 | +$4 / +$8 / +$9 | +$2 / +$7 / +$16 | rejected alone (H1) |
| Near the floor, skip a 1-micro trade whose stop is > 15-35% of the room | -$35 to -$240 | +$7 to +$50 | +$0 to +$12 | rejected (H1) |
| Skip first breaks in the funded account (later breaks only, 1-2 micros) | +$7 to +$116 | -$10 to -$68 | -$3 to +$4 | rejected (H2) |
| **Later break 2-3 micros, first break 1 (whole micros), <= 20-50% of the room** | see below | | | **the one family that helps** |

**The later-break funded size.** This is the eval adopt-candidate's mechanism (the day's later band breaks are BLITZ's
better trades) carried over in whole micros. It is a new twist: this morning's "eval + funded" test scaled 10% of the room
by 1.75, which almost never reached a 2nd micro. 123 variants: later 2-3 micros, first 1 micro (or 2 after the floor
locks), at most 20-50% of the room, give-up line 2 x / 1.5 x / 1 x / never.

- **The H1-only pick fails.** Picked on the best worst quarter of 2026 Jan-Mar / Apr-Jun, the pick is "later 2 micros,
  first 1, <= 50% of the room". On 3 seeds it makes +$74 / +$71 / +$77 a month in H1, but -$16 / -$17 / -$19 in H2 and -$3
  in 2021-25. The more room a later break may use, the better H1 gets and the worse H2 gets.
- **The family is real but the H1 top is not.** 25 of 123 beat today in both H1 quarters, and 18 of those also beat it in
  H2 and 2021-25.
- **Shuffled labels** (the same micros with first / later swapped at random, 20 draws) do not reach the H1 gain in any draw
  (C3: 0%, C1: 0%). In H1 the gain needs the later-break label. In H2 and 2021-25 the shuffles do as well (share 0.5-0.6):
  there the gain is just more size in the funded account.

**C3 (the sturdiest member): later break 2 micros while 2 stop-outs are <= 25% of the room, first break 1, give up at 1 x
the median stop.** Slot $ a month vs v2 with today's funded size:

| Check | H1 | H2 | 2021-25 |
|---|---:|---:|---:|
| seed 23 / 24 / 25 (1,000 paths) | +$22 / +$17 / +$11 | +$42 / +$40 / +$42 | +$9 / +$11 / +$11 |
| +1 tick a side | +$13 | +$41 | +$9 |
| +2 ticks a side | +$9 | +$38 | +$6 |
| 1 bar late | +$20 | +$5 | +$7 |
| 2021-25 by year (2022 / 2023 / 2024 / 2025) | | | +$22 / +$12 / +$7 / +$14 |
| random directions (8 seeds; v2 -> C3) | -$59 -> -$43 | +$27 -> +$38 | -$66 -> -$56 |
| neighbours (<= 20 / 30 / 35 / 50% of the room, same give-up line) | +$11 / +$36 / +$45 / +$64 | +$42 / +$19 / +$16 / +$5 | +$8 / +$7 / +$7 / +$7 |

- What C3 does: funded 3-month accounts in H1 are stuck 4.5% of the time instead of 45.5%, and pay $121 a month instead
  of $108. In H2 (6 starts only) it pays $28 instead of $0. In 2021-25 it pays $14 instead of $2.
- Why it is not adopted:
  1. It was not the H1 pick.
  2. Random directions gain too: the later give-up line saves eval fees with or without BLITZ's edge.
  3. The give-up line alone loses $1-10 in H1.
- It is a sound paper lead. If the owner wants it, the place to test it is BLITZ's funded paper ledger, not the eval.

**The C3 lead, exactly (paper only; no pick file, because it did not pass):**

- `engine/account_c` funded `qty()` returns whole micros:
  - a later break (`brk_n >= 2`) gets 2 micros, a first break gets 1;
  - drop to 1 micro while 2 stop-outs ((stop + 1 tick) x $2 + $1.90 each) are more than 25% of the room;
  - 0 micros when 1 micro would risk more than half the room or 90% of the daily loss left (as today).
- Everything else stays as today, including the +$400 day stop.
- The funded "stuck" line becomes 1 x the median 1-micro stop-out, about $125 (`engine/blitz.STUCK_ROOM` / 2), instead of
  $249.56.
- Research keys (tools/bzx_edge.FundedX):
  `{"mode": "frac", "f": 0.1, "cap": 150.0, "day_tp": 400.0, "q1": 1, "q2": 2, "q1b": 1, "q2b": 2, "rq": 0.25, "stuck_k": 1.0}`.

## 2. The eval (direction 2)

With today's funded size, 2-week pass / fail, 4-week pass / fail, the slot (1,000 paths):

| Eval | H1 2w | H1 4w | H2 2w | H2 4w | 2021-25 2w | 2021-25 4w | Slot $ H1 / H2 / 2021-25 |
|---|---|---|---|---|---|---|---|
| today | 36.1/37.8 | 48.6/49.5 | 36.2/34.8 | 27.1/72.9 | 20.4/50.2 | 25.3/70.8 | $270 / $37 / -$40 |
| **v2 later-break** (median 7 / 5 / 5 sessions to pass, slow passes 12.0 / 0 / 2.8%) | **47.9/23.5** | 70.6/25.7 | **36.2/21.7** | 30.5/59.3 | **24.7/48.4** | 30.0/65.9 | **$286 / $52 / -$39** |
| v2 + the first winner ends the day, sessions 1-4 | 37.8/23.5 | 63.3/33.0 | 24.6/17.4 | 27.1/55.9 | 19.0/38.2 | 26.7/67.2 | $262 / $37 / -$41 |
| v2 + skip first breaks on sessions 1-4 | 42.0/30.3 | 64.2/34.9 | 37.7/20.3 | 32.2/57.6 | 25.7/45.7 | 31.1/64.7 | $283 / $53 / -$38 |
| v2 + 2 losing trades end the day | 47.1/18.5 | 62.4/30.3 | 37.7/14.5 | 32.2/64.4 | 25.5/44.1 | 31.8/62.9 | $290 / $53 / -$38 |
| v2 + C3 funded | same as v2 | | | | | | $308 / $94 / -$30 |

- **First winner ends the day (sessions 1-2 ... 1-6):** every version passes fewer in 2 weeks, loses slot $ in H1 and H2,
  and never gains in 2021-25. The early winner is not worth protecting; the later breaks of that day are BLITZ's best trades. Rejected.
- **2 losers end the day:** fewer 2-week fails (18.5 vs 23.5 in H1), but the fails only come later. In H1, 4-week passes
  drop from 70.6% to 62.4% and the 2-week pass is 47.1 vs 47.9. The slot moves +$1-4. Rejected: it makes the eval slower,
  not better. This is the count version of the "$250 / $350 day loss" already rejected in blitz-25k.md.
- **Skip first breaks early:** mixed (H1 2-week pass 42.0 vs 47.9). Rejected.
- **v2 + funded improvements:** see section 1. The eval part is v2 unchanged.

## 3. Signal facts (direction 3)

Each fact is known at the signal close. It is used as a size tilt (x1.5 / x0.5, x1.25 / x0.75, x1 / x0.5) or a skip (x0),
cut at 2026 H1 terciles / the median. A tilt counts when it is better per unit of risk AND in $ at $150 a trade in H1, H2 and
2021-25.

| Fact (new for BLITZ) | avg R by H1 tercile (low / mid / high): H1 | H2 | 2021-25 |
|---|---|---|---|
| Signal bar volume / the same minute's 14-session mean | +0.019 / +0.243 / +0.230 | +0.259 / +0.290 / +0.088 | +0.115 / -0.005 / -0.031 |
| Band half-width / 5m ATR | +0.281 / +0.226 / -0.015 | -0.034 / +0.253 / +0.628 | +0.005 / +0.016 / +0.021 |
| Noise sigma today / its 60-session mean (band regime) | +0.174 / +0.150 / +0.169 | +0.119 / +0.241 / +0.364 | +0.019 / +0.021 / -0.004 |
| Mean R of BLITZ's last 10 trades | +0.024 / +0.278 / +0.146 | +0.008 / +0.554 / +0.212 | +0.075 / -0.075 / -0.030 |
| BLITZ's previous day won (no / yes) | +0.110 / +0.207 | +0.014 / +0.292 | +0.033 / -0.011 |
| Yesterday had a later break (no / yes) | +0.161 / +0.166 | +0.124 / +0.250 | +0.038 / -0.001 |
| An opposite-side break earlier today | 3 trades in H1, 5 in H2, 27 in 2021-25 | (too rare to act on) | |

- **0 of 120 tilts pass.** The same grid on shuffled facts finds 4.9 on average (95th percentile 10).
- Every fact flips between 2026 and 2021-25. The closest is "BLITZ won yesterday" (x1 after a winning day, x0.5 after a
  losing one): at $150 it gives H1 PF 1.79 / $1,005 a month (today 1.70 / $963), but H2 1.58 / $621 (1.62 / $667) and
  2021-25 1.04 / $57 (1.05 / $73).
- **The "skip after an opposite-side break" idea has nothing to act on:** BLITZ almost never trades after an
  opposite-side break on the same day.

## What was tested, and what was new about it

| # | Idea | New twist vs the rejected list | Result |
|---|---|---|---|
| 1 | Buffer-first funded size | funded only, keyed to the floor lock (+$1,100 peak) | rejected (H1 -$24 to -$142) |
| 2 | Funded day / losing-trade / week stops, max trades a day | funded stage (the eval versions were tested in blitz-25k.md) | rejected |
| 3 | Payout ask amount and wait | first test on BLITZ's 25K (payout-policy.md was LIT's 50K stack) | rejected |
| 4 | The give-up ("stuck") line | first test | helps H2 / 2021-25, hurts H1 alone |
| 5 | Near-floor skip of big stops | funded only, room-relative | rejected (H1) |
| 6 | **Funded later-break size in whole micros** | the eval adopt-candidate's mechanism at 2-3 micros (this morning's version never reached a 2nd micro) | **promising (C3); the H1 pick fails H2** |
| 7 | Eval: first winner ends the day, sessions 1-s | first test | rejected |
| 8 | Eval: 2 losers end the day; skip first breaks early | count-based (the $ day loss was tested) | rejected |
| 9 | Signal-bar relative volume, band width / ATR, sigma regime | the signal bar itself (first-hour volume was tested) | rejected (flip) |
| 10 | An opposite-side break earlier today | first test | too rare (3-27 trades) |
| 11 | Yesterday's BLITZ result, last 10 trades, yesterday a trend day | first test for BLITZ (ATLAS hot / cold was rejected) | rejected (2026 only) |

## Method

- Code: `python -X utf8 tools/bzx_edge.py selfcheck | funded | funded2 | fcheck | funded3 | funded4 | fstress | evalx | signals | save`.
  Results are in `research/scalp/bzx_*.json`; runs are `bzx_funded_later2`, `bzx_funded_rules`, `bzx_eval_rules` and
  `bzx_signal_facts`.
- Trades: `tools/blitz25k_lib.trades(today, "lit+atlas")`, i.e. engine/blitz.py v2 as account C (never opposite LIT /
  ATLAS). Costs: $1.90 a micro, 1 tick on market and stop fills, a same-bar tie counts as a loss. Data: CME NQ1! from
  TradingView, 1m for 2026 and 5m for 2021-25.
- Simulators: `FundedX` / `EvalX` / `lifeX` are `scalp_na_lib.Funded`, `blitz25k_size.Eval` and `life_hybrid` with new knobs.
  With every knob off they reproduce today's numbers exactly (`selfcheck`: slot $277 / $30 / -$41 and v2 $291 / $45 / -$39
  at 300 paths, eval and funded scores identical).
- Slot: 6 months, 5-session Monte Carlo blocks, seed 23 (24 and 25 as checks). Funded 25K: $1,000 EOD trailing floor
  locked at start + $100, payout = balance - $1,100 ($250-1,000, 80% to you), 2 traded days a cycle, 50% best-day rule,
  5 payouts.
- Eval: a new eval on every session, 20-session horizon. Scores: p10 / f10 / dec10 / p15 / f15 / p20 / f20 / pass_med /
  slow_pass.
- "$150 a trade" = integer micros at $150 risk (the funded micro-ratio view, x2 on later breaks, stored in
  `bzx_funded_later2`, is H1 $1,331 / H2 $1,339 / 2021-25 $126 a month, PF 1.62 / 1.96 / 1.04, max DD -$1,410 / -$1,112 /
  -$9,721).
