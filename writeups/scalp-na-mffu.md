## Money first

**The best honest use of BLITZ: let it trade on LIT's own Builder 50K once that account is funded, only while LIT is flat.**
Each row is one MFFU account slot for 6 months: buy the eval ($91.80), pass, 2 sessions of paperwork, the funded account,
payouts (80% to you), and a new eval at once after a fail, a lost account or the 5th payout. Monte Carlo, 1,000 paths of
126 sessions drawn in 5-session blocks from the span (seed 23, as `uprisk.md`). Net of every eval bought.

| LIT's 50K slot | 2026 H1 (pick) | **2026 H2 (check)** | 2021-25 (reference) |
|---|---:|---:|---:|
| LIT alone (today's live sizing) | $823 / month | **$798 / month** | -$7 / month |
| **LIT + BLITZ once funded** (20% of the room, at most $450 a trade) | **$1,124 / month** | **$1,088 / month** | $9 / month |
| Gain, same paths | **+$301** | **+$290** | +$16 |
| Paths where BLITZ adds / costs money | 75% / 11% | 76% / 13% | 10% / 6% |
| 1 in 10 paths (worst tenth), LIT alone -> with BLITZ | $236 -> $251 | $216 -> $251 | -$78 -> -$76 |
| Slots that lose money in 6 months | 5.8% -> 6.2% | 7.6% -> 6.4% | 88% -> 84% |
| LIT's eval, 2-week pass / fail | 52.9 / 17.8 (unchanged) | 58.6 / 20.9 (unchanged) | 20.7 / 24.9 (unchanged) |
| Funded accounts reached in 6 months | 1.18 -> 1.45 | 1.15 -> 1.40 | 0.85 -> 0.85 |

- **The real 2026 path** (one slot from 2026-01-02 to 2026-10-16, no resampling): LIT alone 5 payouts, **$7,816** net; LIT +
  BLITZ 7 payouts, **$10,925** net (+$3,109 in 9.5 months, about +$330 a month).
- **Where the money comes from** (a funded 50K on its own, no eval): BLITZ adds about **+$850 (H1) / +$690 (H2) a month of
  trading profit** inside the account, but MFFU's payout limits ($2,000 a request, 5 payouts, the 50% best-day rule) let
  only about **+$180 a month more out** ($929 -> $1,108 H1, $915 -> $1,103 H2). The first payout comes sooner (26 -> 18
  sessions in H1, 23.5 -> 20 in H2), the worst tenth of 6-month accounts pays twice as much ($1,600 -> $3,197 H1), and
  **no funded account was lost** with or without BLITZ. The slot gains more (+$290-300) because each funded account
  reaches its 5 payouts sooner and the next one starts earlier.
- **2021-25 adds almost nothing** (+$16 a month), mainly because LIT's 2021-25 evals rarely pass (31%), so BLITZ rarely
  gets a funded account to trade on. BLITZ itself makes +$89 a month at $150 a trade there (below).

**BLITZ by itself** (the trades, $150 risk a trade, size = $150 / stop cost; 2026 on 1m bars, 2021-25 the same rule on 5m):

| Span | Trades | / week | Weeks with 2+ | Win % | Avg R | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 H1 (pick) | 221 | 8.6 | 89% | 55.7 | +0.150 | 1.63 | +$5,560 | **+$912** | -$1,314 |
| **2026 H2 (check)** | 109 | 7.0 | 75% | 55.0 | +0.171 | **1.49** | **+$2,143** | **+$577** | -$903 |
| 2021-25 (5m reference) | 1,869 | 8.7 | 81% | 50.3 | +0.016 | 1.06 | +$4,570 | +$89 | -$4,783 |
| ... 2025 | 447 | 8.7 | | 50.6 | +0.020 | 1.08 | +$1,703 | +$139 | -$2,433 |
| ... 2021-24 | 1,422 | 8.7 | | 50.2 | +0.014 | 1.05 | +$2,867 | +$74 | -$3,583 |
| the NA scalp before (2026 H1 / H2 / 2021-25) | 304 / 177 / 2,681 | 11.9 / 11.4 / 12.5 | | | +0.098 / +0.066 / +0.007 | 1.37 / 1.22 / 1.02 | | +$799 / +$466 / +$55 | |

By year at $150 a trade: 2022 +$264 a month, 2023 +$111, 2024 **-$144**, 2025 +$139, 2026 +$785. It trades on about 43%
of days, and on 41 of 2026's 89 trading days it took 5-6 trades: **it is a trend-day machine**. After the first entry it
re-enters at each later check while price stays outside the band.

**BLITZ alone on its own MFFU account** (fresh eval started on every session, 20 sessions; size picked on H1):

| BLITZ alone | 2-week pass / fail (p10/f10) | decided in 2 wks (dec10) | 3-week pass / fail | 1-month pass / fail | median sessions to pass | passes slower than 3 wks | whole slot, $ / month to you |
|---|---:|---:|---:|---:|---:|---:|---:|
| Builder 25K, H1 (40% of room, max $600) | 31.1 / 10.1 | 41% | 44.7 / 21.9 | 52.3 / 38.5 | 8.5 | 15% | $224 |
| Builder 25K, **H2** | 34.8 / 2.9 | 38% | 42.2 / 18.8 | 42.4 / 40.7 | 6.5 | 7% | **$3** |
| Builder 25K, 2021-25 | 16.8 / 13.6 | 30% | 21.8 / 27.8 | 24.8 / 37.7 | 6 | 12% | -$40 |
| Builder 50K, H1 (40% of room, max $1,200, half off at +1R) | 32.8 / 4.2 | 37% | 46.5 / 9.6 | 56.9 / 18.3 | 9 | 21% | $410 |
| Builder 50K, **H2** | 34.8 / 0.0 | 35% | 42.2 / 0.0 | 57.6 / 0.0 | 8 | 23% | **$290** |
| Builder 50K, 2021-25 | 17.8 / 4.8 | 23% | 22.1 / 13.8 | 25.4 / 22.2 | 6 | 13% | $11 |

"Whole slot" uses its own H1-picked sizes (25K: eval 60% of the room / $600, funded 10% / $150 with a +$400 day stop; 50K:
eval 60% / $1,200, funded 20% / $600 with a +$800 day stop, half off at +1R). The 2-week pass is better than the plain NA
scalp's (25K 21.0 / 4.2 and 21.7 / 18.8), but still only a third of evals pass
in 2 weeks and most are undecided: the owner's "passed or failed in 2 weeks" rule is missed. Once funded, a 25K gets stuck
at its floor before it pays (funded alone: $219 / $163 / $26 a month, 34-84% of accounts stuck); a 50K pays $473 / $475 /
$65 a month funded, but **MFFU allows only one funded Builder 50K per person, and that is LIT's.** None of the 768 25K slot
settings made money in H1, H2 and 2021-25 together.

**BLITZ inside ATLAS's 25K** (4th member, tools/atlas.py's real account-B rules, ATLAS's own trades first, the daily cap
raised to 6, BLITZ at 20% of the room, at most $300):

| ATLAS 25K | 2-week pass / dead H1 | H2 | 2025 | 2021-24 | funded $ / month H1 / H2 / 2025 / 2021-24 |
|---|---:|---:|---:|---:|---:|
| ATLAS today, cap raised to 6 (at cap 2: 65.5 / 0.8, 43.5 / 0.0; $582 / $517) | 66.4 / 0.8 | 43.5 / 0.0 | 31.7 / 22.5 | 22.6 / 27.0 | $605 / $517 / $83 / $40 |
| + BLITZ | 67.2 / 3.4 | **55.1** / 0.0 | 30.9 / 26.9 | 22.0 / **36.0** | $630 / $552 / $79 / $36 |

It helps H2 but kills more evals in 2 weeks in H1, 2025 and 2021-24 (stuck under the floor), the eventual pass drops in
H1 (92 -> 89%), and the funded account earns only +$25-35 a month. With ATLAS's real cap of 2 trades a day, BLITZ changes
nothing useful (2-week pass within -3 / +4 points, dead evals up 2-8 points). **Not adopted.**

## The rule (exact)

CME NQ / MNQ, ET times, 1m bars. Everything is known at the signal bar's close.

1. **Noise band.** For each minute of the day, sigma = the average over the last 14 sessions of |close / 09:30 open - 1|
   at that minute (today never included). Upper band = today's 09:30 open x (1 + sigma), lower = open x (1 - sigma).
2. **Day filter (new).** Trade only if **yesterday's 09:30-16:00 range is at least 0.8 x the average of the 14 RTH
   ranges before it** (a "the market is moving" day; known before the open).
3. **Checks** only at the 1m closes of 11:00, 11:30, ..., 15:30 (11 checks). A close above the upper band = BUY, below
   the lower band = SELL. While flat, a later check can enter again.
4. **Entry** at market at the next bar's open (+1 tick slippage). **Stop** = the signal close -/+ 1.5 x the 14-bar ATR of
   5-minute bars (about 60 points in 2026). No fixed target.
5. **Management.** After +1R the stop trails 1.5R behind the best price. Out at market after 30 minutes, or at 15:55.
6. One position, at most 6 trades a day, no new trade after -3R on the day.
7. **On LIT's funded 50K:** no BLITZ entry while LIT holds a trade or has a setup armed (limit working / waiting for its
   1m CISD); a BLITZ trade still open when LIT enters is closed at that bar's open (LIT first); never opposite to an open
   ATLAS trade on account B (skipped, or closed at ATLAS's opposite entry); size = 20% of the room to the trailing floor,
   at most $450 of risk a trade, inside what is left of the $1,000 soft daily loss; off during LIT's eval.

How 2026's trades ended: 73% at the 30-minute clock, 20% at the stop (first stop or trail), 7% at 15:55. Every 2026 trade
is in `research/scalp/na_best_trades.json` (330 trades).

## What was tried (picked on H1, judged on H2 and 2021-25)

**1. Filters (93 single filters, then 90 pairs on top of the pick).** Each filter removes candidate signals before the
executor runs, so a skipped signal can free the slot for a later one.

| Family | Best on H1 (t-stat) | H1 / H2 / 2021-25 avg R change | Verdict |
|---|---|---|---|
| **Yesterday's range** | **prior-day range >= 0.8 x 14-day mean** | **+0.052 / +0.105 / +0.009** | **adopted** (0.7-1.1 all improve all three spans) |
| VIX / VXN level | VXN >= 22 | +0.011 / -0.063 / +0.036 | the strongest 2021-25 effect (momentum likes high vol), fails H2 |
| VXN vs its 20-day mean | >= 0.9 | -0.004 / +0.015 / +0.005 | nothing |
| Trend day (first hour) | first hour closed on the trade's side (>= 0.35) | +0.024 / +0.012 / -0.003 | nothing in 2021-25; as a 2nd filter it fails H2 |
| LIT direction / LIT flat | trade with LIT's direction or on non-LIT days | +0.031 / +0.047 / -0.001 | 2026 only |
| LIT bias (draw on liquidity / Asia box) | not against the Asia-box bias | -0.065 / -0.076 / +0.015 | no |
| ES confirmation (ES outside its own band) | ES out too | +0.011 / +0.034 / +0.004 | small; ES 5m only from 2025-04 |
| Time of day | (sub-windows of 11:00-15:30, no lunch, no 15:30) | at most +0.000 | nothing beats the full window |
| Gap days | trade with the gap's side | +0.057 / +0.190 / -0.009 | 2026 only (2021-25 -0.009) |
| News days (CPI, NFP, FOMC, PCE/GDP) | skip FOMC days | +0.008 / -0.001 / +0.002 | nothing |
| Weekday | no Tuesdays | +0.027 / +0.031 / +0.007 | not adopted (calendar effect, `calendar-effects.md`) |

Of the 30 filters that improved H1, 24 also improved H2, 11 improved 2021-25 and 9 improved both. On top of the pick, the best
H1 second filter (first hour on the trade's side) lost in H2 and 2021-25; of the 22 pairs that improved H1, 3 also improved
both H2 and 2021-25. **One filter only.**

**2. Exits (4,800 on the filtered rule):** trail 0.5-2R from +0.5-1.5R or none, time exit 20-45 min, half off at +1R (with
or without breakeven after), breakeven at +1R, stop 1.25-2 x ATR, "hold while still outside the band" up to 3 more checks.
700 beat today's exit in H1; **61 of them also in H2**. The H1 winner (trail 1R from +0.5R, 40 minutes, half off at +1R,
1.75 x ATR stop) loses 0.09R a trade in H2. Half off at +1R lowers the swings a little (t-stat up in all three spans,
average R down in H1) and only exists with 2+ micros. **Today's exit stays.**

**3. Sizing on MFFU (896 eval / funded sizes, 1,536 whole slots):** 15-60% of the room, $150-1,200 caps, a "need" maximizer
(risk what is still needed to pass / 2-4, capped), a daily profit stop (+$200-1,200: no new trade after it), half off at
+1R. Results:
- Plain "share of the room" wins. The need maximizer is slower and passes less (25K best 25.2 / 20.2 in H1, 14.5 / 8.7 in
  H2, median 8-12 sessions).
- **The daily profit stop hurts the eval**: 5 of 216 25K eval sizes improve with it in H1, 1 in H2. It cuts the
  5-6-trade trend days, which is where BLITZ earns. On a funded account it helps about half the sizes in H1 and 2021-25
  (the 50% best-day rule) but few in H2 (6 of 120 on the 25K, 20 of 120 on the 50K).
- The most aggressive size that maximizes the 2-week pass (25K 60% of the room) also fails 37% in 2 weeks.

**4. Next to LIT and ATLAS:** the tables above (`tools/scalp_na_combo.py`). On LIT's account, 64 of the 120 sizes beat LIT
alone in both 2026 halves (58 also in 2021-25). All 30 "up to 6 a day" sizes from 7.5% to 30% of the room with a $300-600
cap add +$152 to +$332 a month in each half. Capped at **2 BLITZ trades a day** the H2 gain disappears (-$9 to -$167 at
caps of $450+).

## Honesty checks

- **Random directions** (same signal bars, coin-flip side, same stop distance, 40 seeds): BLITZ avg R +0.150 vs -0.018
  (H1, p 0.025), +0.171 vs -0.017 (H2, p < 0.025), +0.016 vs -0.036 (2021-25, p < 0.025). On LIT's account, random-direction
  BLITZ at the pick's size makes the slot **worse** than LIT alone: $632 / $670 / -$17 a month (8 seeds), against $1,121 /
  $1,085 / $7 for the real one. So the gain comes from BLITZ's edge, not from extra small trades feeding the 50% rule.
- **Without the new filter** (the plain NA scalp on LIT's account, same size): +$170 / +$88 / +$10 a month. The filter
  roughly doubles the gain.
- **Look-ahead:** BLITZ rebuilt on data cut at 13:00 on 6 random 2026 days = the full-data trades (0 of 936 closed trades
  differ). Yesterday's range is complete before the open.
- **The 5m reference is fair:** the band and the check-bar closes are identical on 1m and 5m (the same signals), only the
  fills are coarser. The 5m rule on 2026 is weaker than the 1m rule (NA +0.059 / +0.042 vs +0.098 / +0.066), so the
  2021-25 line probably understates a 1m BLITZ a little.
- **Stress on LIT's account** (gain vs LIT alone, H1 / H2 / 2021-25): 1 more tick on every BLITZ entry and exit +$273 /
  +$273 / +$8; 2 more ticks +$235 / +$254 / +$1; **1 bar late** +$246 / +$196 / -$2; **2 bars late +$165 / +$25 / -$15**;
  without the ATLAS rule +$326 / +$219 / +$17; BLITZ in the eval too +$307 / +$300 / +$23, but LIT's 2-week fail goes
  17.8 -> 21.2% (H1). The entry must go in within about a minute of the check.
- **Costs** take 12-14% of BLITZ's gross in 2026 and 65% in 2021-25. The stop is wide (about 60 points), so ticks matter
  less than for the rejected small-stop scalps.
- **What is not modelled:** the 2021-25 LIT trades are 5m-only reference rows; the LIT armed windows come from the LIT
  replay used by ATLAS (`atlas_lit_armed.py`); MFFU live accounts after 5 payouts are not traded by the bot.

## Verdict

- **(a) Stay a paper shadow: yes, for now.** There are two reasons. LIT's 50K is still in its eval; BLITZ only adds money
  on the funded account. Routing BLITZ there needs engine work that is not built: a second strategy on LIT's account, up to
  6 BLITZ trades a day (today's guards allow 2 when a second strategy routes), the LIT-flat / LIT-first / never-opposite-ATLAS
  rules, and an entry within a minute. The paper shadow (`engine/blitz.py`, 2026-10-28) runs this filtered rule
  (parity 330/330) on a paper 25K at 40% of the room, and a second paper ledger on a funded 50K next to LIT (20% of the
  room, at most $450; LIT first, never opposite ATLAS; parity 312/312). The number to watch is that 50K ledger, not the
  25K eval.
- **(b) Join ATLAS's 25K: no.** At ATLAS's cap of 2 a day it changes nothing useful. Raised to 6 a day it helps 2026 H2 (2-week
  pass 43.5 -> 55.1%) but adds dead evals (H1 0.8 -> 3.4%, 2025 22.5 -> 26.9%, 2021-24 27 -> 36%) for about +$25-35 a month
  funded.
- **(c) Its own account: no.** A 25K slot pays $224 / $3 / -$40 a month (H1 / H2 / 2021-25), and no 25K setting made money
  in all three. A 50K-type account would pay $410 / $290 / $11, but MFFU allows only one funded 50K, which is LIT's.
  Another firm's 50K was not modelled; check its rules first. It would earn less than putting BLITZ on LIT's existing
  funded 50K, which needs no extra eval.
- **Best honest configuration: BLITZ as an add-on on LIT's funded Builder 50K** (rules above): about **+$290-300 a month per
  LIT account slot** in both 2026 halves, +$16 in 2021-25, LIT's eval untouched, no funded account lost. If LIT runs on
  more 50K-type funded accounts, the gain should repeat per account (not tested; same trades, so the accounts move
  together).
  2021-25 shows the edge is thin outside 2026 (PF 1.06; 2024 lost money). Treat it as a 2026-regime bonus that costs
  little when it fades, not as a strategy of its own.

## Files

- `tools/scalp_na_lib.py`: signals and features, the 2-leg executor (checked trade for trade against the scalp_mo pick,
  0 of 481 / 3,202 differ), MFFU eval / funded / whole-slot simulators.
- `tools/scalp_na.py`: `filters`, `filters2`, `exits`, `sizing`, `life`, `checks`, `save`.
- `tools/scalp_na_combo.py`: `atlas`, `atlas_funded`, `atlas6` (tools/atlas.py scorer), `lit`, `lit_grid`, `lit_checks`,
  `lit_why` (tools/second_mix.py eval windows; tools/uprisk.py + tools/div_stack.py slots).
- Results: `research/scalp/na_filters.json`, `na_filters2.json`, `na_exits.json` (summary; the full grid
  `na_grid_exits.json` is local only), `na_sizing.json`, `na_life.json`, `na_checks.json`, `na_combo_atlas.json`,
  `na_combo_atlas_funded.json`, `na_combo_atlas_max6.json`, `na_combo_lit.json`, `na_combo_lit_grid.json`,
  `na_combo_lit_checks.json`, `na_combo_lit_why.json`, `na_best_trades.json`.
- Runs: `scalp_na_blitz` (BLITZ alone, $150 a trade), `scalp_na_blitz_lit50k` (BLITZ as it trades on LIT's account, $450 a
  trade), `scalp_na_atlas_member` (rejected).
