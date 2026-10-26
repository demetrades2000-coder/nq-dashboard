## In one minute

- **The ask (owner, 2026-10-22, overnight):** find 1-2 strategies to trade next to LIT and make them profitable, the way LIT
  was made profitable: tune on 2026 Jan-Jun, check on Jul-Oct without touching it. This note is the support/resistance
  family (levels, incl. the opening range).
- **One version survives: "NY sweep-and-reclaim".** Price runs through one of the day's levels between 09:30 and 12:00 ET,
  then closes back on the other side within 4 bars with a real candle. You trade back the way it came, stop beyond the
  sweep's wick, target 2R.
- **Money at $500 risk a trade** (costs in):

| period | trades | tr/wk | win % | PF | net $ | $ / month | max DD | avg R |
|---|---|---|---|---|---|---|---|---|
| 2026 H1 (picked here) | 29 | 1.14 | 65.5 | 3.72 | +$12,213 | +$2,019 | -$971 | +0.95 |
| **2026 H2 (untouched check)** | 16 | 1.03 | 50.0 | 1.89 | **+$2,914** | **+$784** | -$2,773 | +0.42 |
| 2025 (reference) | 71 | 1.38 | 39.4 | 1.26 | +$4,991 | +$408 | -$4,144 | +0.15 |
| 2021-24 (reference) | 256 | 1.56 | 34.8 | 1.06 | +$4,844 | +$124 | -$5,859 | +0.05 |

- **Next to LIT on one account** (LIT at its size rule, this at $500, LIT first, max 2 trades a day): 2026 **+$58.0k
  instead of +$43.4k**, max DD **-$1,767 instead of -$2,196**; H2 +$12.4k instead of +$9.5k. Daily P&L correlation with
  LIT: -0.05 (2026), +0.04 (2025), 0.00 (2021-24). It trades mostly 09:30-11:00, LIT mostly 02:00-08:00, so they rarely
  meet (in 2026 only 1 of its 45 trades was skipped because LIT was in a trade).
- **The honest catch:** H2 is positive but small (16 trades, t 1.2), and without its best 5 trades H2 is -3.2R and
  2025 / 2021-24 are about zero. Before 2026 it only just pays its costs. Of all 201,908 versions tried, picking on 2026 H1
  alone mostly failed on H2 (only 25% of the H1 winners were H2 winners; the base rate was 23%). This one held because it
  also had to be non-negative in 2025 and 2021-24 and sit on a plateau.
- **Verdict:** worth paper-trading next to LIT (simple, uncorrelated, positive in all four periods, the 1m re-check of 2026
  is identical). Not a "second LIT": a small add-on worth about +$800 / month in H2-type markets at $500 risk.

## What was tried and how it was picked

**Data and fills:** TradingView CME NQ1! 5m (`data/NQ_5m.csv`, 2021-11 to 2026-10-16). A signal is known at a bar close;
market entries fill at the next 5m open + 1 tick; limit entries fill only when price trades 1 tick through. Stops fill at
the stop (or a worse open) - 1 tick; the 15-minute check and the 15:55 flat - 1 tick. Stop and target in the same bar =
stop. **$1.90 a micro round trip.** Stops are structural (1 tick beyond the sweep extreme or the break's swing/candle),
6-80 pts; size = $ risk / (stop x $2) micros, max 40.

**Borrowed from LIT and tuned:** levels like LIT's (prior-day RTH, overnight, Asia 20:00-24:00, London 02:00-05:00,
prior week, opening range 09:30-10:00, each only once it is known), first touch only; the sweep depth (0 / 0.25 / 0.5 ATR);
confirmation by a close back (or LIT's CISD close); a displacement body (0 / 0.3 / 0.5 / 0.7 ATR); inducement first; market
or limit entry; time windows (02:00-15:30, London 02:00-05:00, NY 09:30-11:30 / 09:30-12:00 / 09:30-15:30 / 10:00-15:30,
08:00-12:00); targets (next level >= 1.0 / 1.5 / 2.0R, LIT's VIX band, 2R, 3R; banked at 2-8R); BE at 1R + 1.25 pts (LIT's
BE + costs) or none; LIT's 15-minute check; 1 or 2 a day; stop cap 60 / 80 / 120. Then VIX regime, weekday and news
blackouts as a second stage.

**Selection (the owner's LIT rule):** parameters picked on **2026 H1 (Jan 2 - Jun 30) only**, at least 25 trades
(1 a week), and a **plateau**: every one-step neighbour (depth, reclaim window, displacement, stop cap, min R, bank,
BE on/off, 15-minute check on/off, 1-2 a day) also positive on H1; score = median t of itself + neighbours. 2026 H2 (Jul 1 -
Oct 16) was never looked at to pick. 2025 and 2021-24 were used only as the owner's "prefer versions not negative there".

| round | versions | what it found |
|---|---|---|
| Stage 1: reclaim + break-and-retest, all levels / windows / targets / management (`tools/second_sr.py grid`) | 184,320 | 56,604 have 25+ H1 trades; 53% positive on H1, **only 23% positive on H2**; of the H1-positive ones 25% positive on H2 (t >= 2 on H1: 20%) = H1 alone does not predict H2 here. 2.0% positive in all four periods. The best H1-only picks lost on H2 (-7 to -12R) and in 2021-24 (-20 to -72R): rejected (runs `sr2_stage1_*`). The best pick that was also non-negative in 2025 / 2021-24 was a NY reclaim (H1 +21.6R, H2 -0.4R, 2025 +16.6R, 2021-24 +28.9R). |
| Refinement around that NY reclaim (`refine`) | 17,280 | 2,712 with 25+ H1 trades; 41% positive on H2 (56% of those with H1 t >= 2). The H1 plateau pick is below. |
| Stage 2: VIX regime, weekday, news blackout on the picks (`stage2`) | 308 | Nothing adopted: "no Wednesday" and "VIX >= 15" lift H1 but cut 2021-24 to about zero; news blackouts change nothing (NY-morning trades rarely sit on 08:30 / 14:00 releases). |
| **Total** | **201,908** | |

## The version: NY sweep-and-reclaim (`sr2_nyreclaim_*`)

Rules in plain words (also in `research/second/sr_best.json`):

1. **Levels** (each known before it is used): yesterday's RTH high/low, the overnight high/low (from 09:30), the Asia box
   20:00-24:00 high/low, the London box 02:00-05:00 high/low, last week's high/low, the 09:30-10:00 opening range high/low
   (from 10:00).
2. **Sweep:** the first time today a 5m bar trades through a level from the side price was on (a low under a level the
   bar before closed above = sell-side swept, long setup; mirror for shorts).
3. **Inducement first:** a 5m swing low (2 bars each side) between the level and 1 ATR above it, formed in the 3 hours
   before, was taken on the way in.
4. **Reclaim:** within 4 bars (the sweep bar counts) a 5m candle closes back above the level, green, body >= 0.3 x ATR.
5. **Entry:** market at the next 5m open, only 09:30-12:00 ET, 1 trade a day.
6. **Stop:** 1 tick beyond the sweep extreme (the protected low/high), 6-80 pts; size follows the stop.
7. **Target 2R**, no breakeven move, LIT's 15-minute check (never +0.5R and more than 0.3R against after 15 min -> out),
   flat 15:55.

What it trades: 2026 mostly the opening range (24 of 45) and the overnight high/low (10); 2021-24 mostly the overnight
high/low (117 of 256) and the opening range (93). About 80-85% of entries are 09:30-11:00. Median stop 58 pts in 2026 (35 in
2021-24), about $450 at risk.

**Plateau (H1 / H2 / 2025 / 2021-24 in R; picked on H1 only):**

| change from the pick | H1 | H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| **the pick** | **+27.4** | **+6.8** | **+10.3** | **+11.6** |
| sweep depth 0.25 ATR | +18.5 | +5.8 | +5.8 | +20.9 |
| reclaim within 3 bars | +27.4 | +2.8 | +9.5 | +12.4 |
| reclaim within 6 bars | +23.4 | +6.1 | +10.9 | +10.1 |
| body 0.5 ATR | +20.5 | +5.8 | +15.7 | +8.9 |
| stop cap 60 | +20.6 | +2.0 | +3.5 | -3.2 |
| stop cap 120 | +30.4 | +2.1 | +12.5 | +12.8 |
| BE at 1R + 1.25 pts | +17.5 | +4.7 | +13.2 | +5.3 |
| no 15-minute check | +27.4 | +8.5 | +7.7 | +9.0 |

Every neighbour is positive on H2 too (31 of 32 cells positive), so it is not a lone spike.

**Sizing** (net $ per period; max DD):

| sizing | 2026 H1 | 2026 H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| $300 risk | +$7,082 (DD -$545) | +$1,812 (-$1,650) | +$2,370 (-$2,272) | +$1,932 (-$3,638) |
| **$500 risk** | +$12,213 (-$971) | +$2,914 (-$2,773) | +$4,991 (-$4,144) | +$4,844 (-$5,859) |
| $800 risk | +$19,813 (-$1,636) | +$4,931 (-$4,580) | +$8,354 (-$7,032) | +$6,813 (-$9,670) |
| LIT rule ($800 to 20 pts) | +$8,314 (-$617) | +$1,608 (-$1,952) | +$2,055 (-$3,838) | -$661 (-$7,882) |

The LIT size rule shrinks it too much (its stops are mostly 30-80 pts); fixed $ risk fits it.

**MFFU Builder 50K eval** (a fresh eval started on every session; 2-week = 10 sessions, 1 month = 20; pass / fail %):

| account | 2026 H1 2 wk | 1 mo | 2026 H2 2 wk | 1 mo | 2025 2 wk | 1 mo | 2021-24 2 wk | 1 mo |
|---|---|---|---|---|---|---|---|---|
| alone, $500 fixed | 3.9 / 0.0 | 18.1 / 0.0 | 0.0 / 0.0 | 9.0 / 2.6 | 0.0 / 2.7 | 5.4 / 13.2 | 0.4 / 5.0 | 4.2 / 19.3 |
| alone, eval-safe ($500 capped at 0.6 x room / (stop x $2)) | 3.9 / 0.0 | 18.1 / 0.0 | 0.0 / 0.0 | 9.0 / 0.0 | 0.0 / 0.0 | 5.4 / 0.0 | 0.4 / 0.0 | 4.2 / 0.0 |
| alone, eval-safe at $800 | 15.0 / 0.0 | 44.1 / 0.0 | 9.0 / 0.0 | 34.6 / 0.0 | 8.2 / 0.0 | 24.9 / 0.0 | 7.7 / 0.0 | 16.3 / 0.0 |
| LIT alone (eval path `lit_adopt_t15_be_off_eval`) | 41.7 / 5.5 | 63.0 / 16.5 | 26.9 / 0.0 | 38.5 / 10.3 | - | - | - | - |
| LIT eval path + this (eval-safe $500), max 2 a day | 44.9 / 2.4 | 71.7 / 13.4 | 24.4 / 6.4 | 34.6 / 21.8 | - | - | - | - |
| LIT eval path + this, max 1 a day | 44.1 / 5.5 | 69.3 / 18.1 | 23.1 / 0.0 | 33.3 / 14.1 | - | - | - | - |

Alone it is far too slow for the owner's 2-week eval rule (1-15% pass in 2 weeks) but the eval-safe sizing never failed
one. Added to LIT's eval account it helps in H1 and hurts a little in H2 (more fails in a month), so **do not add it to
the LIT eval account**; run it on its own (funded-style) account or keep it paper. (The LIT eval line here replays the
stored eval-path P&L from every start, so it differs from the CLAUDE.md eval numbers, which restart the sizing per start.)

**Together with LIT on one account** (LIT = `lit_live` at the LIT rule, this at $500 risk; run `sr2_nyreclaim_with_lit`):

| period | LIT alone net / DD | max 2 a day (SR skipped while LIT is open) net / DD / $ per month | max 1 a day (SR only if LIT has not traded yet; LIT trades lost) net / DD |
|---|---|---|---|
| 2026 H1 | +$33,891 / -$2,196 | +$45,631 / -$1,584 / +$7,545 | +$39,739 / -$1,840 (0 lost) |
| 2026 H2 | +$9,493 / -$1,396 | +$12,407 / -$1,767 / +$3,340 | +$10,619 / -$1,508 (1 lost) |
| 2026 | +$43,385 / -$2,196 | +$58,039 / -$1,767 / +$5,945 | +$50,357 / -$1,840 (1 lost) |
| 2025 | +$3,199 / -$7,082 | +$7,736 / -$5,696 / +$632 | +$7,984 / -$5,068 (3 lost) |
| 2021-24 (LIT 5m only) | -$1,988 / -$19,029 | +$821 / -$20,956 / +$21 | +$3,582 / -$19,788 (18 lost) |

On the combined fixed-size account the 2026 MFFU eval is 36.1 / 0.0 in 2 weeks and 62.0 / 0.0 in a month (LIT alone at its
rule: 31.6 / 1.0 and 57.3 / 4.9). Max 2 a day is the better rule in 2026: the two strategies trade different hours.

**Robustness checks:**
- **No look-ahead:** all 374 trades were re-derived from data cut right after the signal bar (`lookahead`): same signal,
  stop, target, 0 flagged. The check does catch look-ahead: with the earlier study's level list it flags 15 of 15.
- **1m re-check of 2026:** the 45 trades replayed on 1m bars give the same result (+34.2R, all 45 the same sign).
- **One more tick of slippage in and out:** H1 +27.1R, H2 +6.6R, 2025 +9.3R, 2021-24 +7.2R.
- **Without the best 5 trades of each period:** H1 +17.5R, H2 -3.2R, 2025 +0.4R, 2021-24 +1.6R. Outside H1 it leans on a
  few winners.

## What did not work

- **Break and retest / break and limit at the level** (the earlier study's best 2026 line): every H1 pick lost on H2. The
  best H1 one (London 02:00-05:00, displacement 0.8 ATR, limit at the level, 2R) made +28.3R on H1, then -7.1R on H2,
  -8.3R in 2025 and -72.4R in 2021-24. The best non-negative-reference one had H1 t 1.1 and lost on H2 (-8.3R).
- **The VIX one-day band as the target, banking at 5-8R, the CISD close as confirmation, limit entries at the reclaimed
  level, the London window:** none made a plateau that held.
- **Stage-2 filters** (VIX regime, weekday, news): no keeper.
- **The earlier retail study's S/R numbers are too good.** `tools/retail_standalone.py` gave its S/R trades a target from
  the whole day's level list, including the overnight high/low before 09:30, when those are not known yet. With only
  known levels, a replica of its best 2026 line (PD/ON break, limit at the level, next-level target; this code's costs)
  falls from +48R to +13R in 2026 and from -6R to -22R in 2025 (`research/writeups/retail-standalone.md` should be read with that in mind; the bounce has the
  same flaw).
- H2 2026 is a quiet market (prior-day VIX 18+ on 7 of 78 H2 sessions vs 70 of 128 in H1) and most S/R variants lost
  there; the H1 S/R edges came mostly from VIX 18+ days.

## Verdict

- **Paper-trade the NY sweep-and-reclaim next to LIT** on its own ledger (or a second, funded-style account at $300-$500
  risk). It is uncorrelated with LIT, trades other hours, made money in all four periods with costs in, and lifts 2026 from
  +$43.4k to +$58.0k on one account with a smaller drawdown.
- **Do not add it to the LIT eval account** (eval odds in H2 get slightly worse) and do not expect much before 2026:
  +$124 / month in 2021-24 and +$408 / month in 2025 at $500 risk.
- Nothing in LIT changes; `engine/lit.py`, `live_model*.json` and the live loop are untouched. Integrator: the rules and
  every trade are in `research/second/sr_best.json` (setup "nyreclaim"); the code is `tools/second_sr.py`.

Files: `tools/second_sr.py` (grid / pick / refine / stage2 / final / look-ahead), `research/second/sr_grid.json.gz` (all
stage-1 scores), `sr_refine.json.gz`, `sr_picks.json`, `sr_refine_picks.json`, `sr_stage2.json`, `sr_final.json`,
`sr_best.json`.
