## In one minute (owner summary)

- **Your question:** 2+ trades a week, high-quality setups, high probability, high profit. Can LIT win more often and still
  make its money?
- **Short answer: no, not by changing the exits or by grading setups.** LIT wins big, not often. About 1 trade in 4 (H1) to 1 in
  3 (H2) reaches +0.5R. The winners average +5.3R (H1) / +3.7R (H2), because the VIX-band target is far away. Every exit that
  takes money earlier (partials, trailing, an earlier breakeven) cuts those big winners. It costs more money than it gives
  back, and on the eval it breaks the "one winner passes" sizing.
- **The partial at 1R is now measured exactly.** Take 50% off at 1R and run the rest to the band: H1 **$21.4k instead of
  $33.7k**, H2 **$5.4k instead of $9.4k**. The 2-week eval pass falls from 57% / 52% to **11% / 15%**. Even if the eval sizing
  is changed to plan for the smaller winner, it is still 45% / 29%. It does not even raise the win rate: after costs the
  "+1R half, breakeven half" trade lands just below +0.5R.
- **What does raise the money and keeps the eval odds:** the switches that already exist. Ranked by July-October (H2) money:

| rank | switch | H2 $ (LIT rule) | H2 $ (eval path) | H2 2-week pass / fail | H1 2-week pass / fail | verdict |
|---|---|---|---|---|---|---|
| 1 | **scale-in after BE** (`scale_in`) | +$15.1k (live +$9.4k) | +$17.3k (live +$9.1k) | 52.2 / 0.0 (same) | 58.0 / 2.5 (live 57.1 / 5.9) | **yes, after your Sim roundtrip** |
| 2 | Asia slot (lead 1) | +$13.5k | +$12.4k | 59.4 / **2.9** | 56.3 / **6.7** | no: more fails, 2021-25 -$18.6k |
| 3 | half size outside the high/low-of-week window (`how_out 0.5`) | +$7.9k | +$10.8k | 52.2 / 0.0 | 57.1 / 5.9 | no: the LIT rule loses $11.4k in H1 |
| 4 | eval weekly loss stop -$1,200 (`wk_loss_usd`) | +$9.4k (same trades) | +$9.5k | 52.2 / 0.0 | 57.1 / **3.4** | **yes** (fewer fails, costs H1 eval $4.5k) |
| 5 | 1m CISD window 22 (`cisd1m 22`) | +$9.8k | +$9.3k | 52.2 / 0.0 | 57.1 / 5.9 | **yes** (insurance off a cliff) |
| 6 | room cap 55% (`room_f 0.55`) | +$9.4k (same trades) | +$9.1k | 52.2 / 0.0 | 57.1 / **2.5** | **yes** (fewer fails) |

- **Best combination (picked on Jan-Jun, checked on Jul-Oct):** scale-in + room cap 55% + weekly loss stop $1,200.
  - H1: eval path **+$53.6k** (live +$34.3k). 2-week pass/fail **57.1 / 0.0** (live 57.1 / 5.9). 1 month **78.9 / 2.8** (live
    74.3 / 11.9).
  - H2 check: **+$14.7k** (live +$9.1k), 2-week **52.2 / 0.0** (same), 1 month 52.5 / 1.7 (live 50.8 / 0.0). On the LIT
    rule: +$15.1k, about **$4,060 a month** (live $2,530). Still 2.6-3.1 trades a week.
- **Until the Sim check is done**, use the same set without scale-in: cisd1m 22 + room cap 55% + weekly loss stop. That gives
  H1 2-week fails **5.9% -> 0.0%** with passes unchanged and H2 +$9.8k (live +$9.1k). It costs about $4.4k of H1 eval-path
  money (smaller size after a bad week). It is a safety change, not a money change.
- **A+ grading does not work on LIT.** Three different grades were tested against a placebo, where the same A/B/C counts are
  dealt to random trades. None of them beats the placebo in Jul-Oct at the 95% level, and all of them turn negative in
  2021-25. Sizing down the "C" setups also hurts the eval: the two-week sizing needs every winner at full size.
- **Honest count:** 158 changed variants. 29 beat live on money in both halves, against about 40 expected from coin flips.
  14 also kept the eval odds, against about 10 by chance. Every one of those 14 except two tiny ones contains scale-in, or the
  Asia slot plus the weekly stop. The only real new money in this study is scale-in, which was already found in
  `lit-big-ideas.md`.

## What "probability" means here, and why LIT can't have much more of it

| live LIT (2026) | H1 (Jan-Jun) | H2 (Jul-Oct) |
|---|---|---|
| trades a week / weeks with 2+ | 3.12 / 85% | 2.56 / 81% |
| trades >= +1R | 22.5% | 32.5% |
| trades >= +0.5R ("true winners") | 22.5% | 32.5% |
| trades > $0 (BE scratches with +1.25 pts count here) | 58.8% | 47.5% |
| breakeven exits | 36.2% | 12.5% |
| losers <= -0.5R | 35.0% | 45.0% |
| average true winner | +5.32R | +3.65R |
| expectancy a trade | +0.84R | +0.71R |
| PF / net (LIT rule, $1.90 a micro) | 4.92 / +$33,666 | 2.66 / +$9,410 |

- No LIT trade ends between +0.5R and +1R: a trade either reaches the target (most are 2-8R), stops out, or scratches at
  breakeven. So the "win rate" is the share of trades that make it to the far target.
- Making that share bigger means accepting a nearer target. That is exactly what the VIX-band target is not, and the ablation
  already showed the band is one of the four rules that make the money (`lit-ablation.md`).

## 1. Exit redesign (93 variants, same setups, same fills, same stops)

**Method.** `tools/hq_lit.py` takes each of the engine's 631 trades (2021-10 to 2026-10) and re-walks it from its fill bar
with a new exit policy. The intrabar order is the engine's: stop first, then the partial, the target, the breakeven move. A
decision at a bar's close acts from the next bar, and a swing counts only once its confirming bar has closed. With the live
policy the re-walker gives **631/631 trades identical to the engine** (exit type, exit bar, P&L to 5 cents) and
**120/120 eval units identical** to `tools/lit_adopt_combo.units`. **Partials are booked per micro:** int(q x f) micros
leave at the partial price (a resting limit, no slippage) and the rest rides the runner. Commission is paid on every micro.
The weekly stop is rebuilt from the new exits. For the eval path, the live two-week sizing is used. Partial rows are also
shown with a research-only sizing target: the blended winner, f x partial + (1 - f) x target, so the "one winner passes"
rule sizes for the smaller winner.

Main rows (all 93 rows are in Appendix A/B):

| exit | win >= 0.5R H1 / H2 | BE % H1 / H2 | avg winner R H1 / H2 | LIT $ H1 / H2 | 2021-25 $ | eval $ H1 / H2 | eval 2-wk pass/fail H1 · H2 |
|---|---|---|---|---|---|---|---|
| **live** (BE 1R + 1.25 pts, 15-min check, band banked at 8R) | 22.5 / 32.5 | 36.2 / 12.5 | 5.32 / 3.65 | +33.7k / +9.4k | -0.7k | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 |
| partial 25% at 1R | 22.5 / 35.0 | 36.2 / 12.5 | 4.64 / 3.24 | +28.4k / +8.5k | -0.5k | +22.2k / +7.7k | 27.7/4.2 · 40.6/0.0 |
| partial 50% at 1R | 22.5 / 35.0 | 36.2 / 12.5 | 3.51 / 2.46 | +21.4k / +5.4k | +0.5k | +19.4k / +4.1k | 10.9/3.4 · 14.5/0.0 |
| ... + blended sizing target | | | | | | +26.4k / +6.7k | 45.4/6.7 · 29.0/4.3 |
| partial 33% at 2R | 23.8 / 35.0 | 36.2 / 12.5 | 4.43 / 3.24 | +27.7k / +8.5k | +0.2k | +29.4k / +7.8k | 34.5/4.2 · 40.6/0.0 |
| partial 50% at 1R + trail after 2R | 32.5 / 40.0 | 25.0 / 7.5 | - | +17.1k / +4.5k | +5.1k | +16.8k / +2.1k | 3.4/1.7 · 1.4/0.0 |
| BE at 0.75R | 20.0 / 22.5 | 41.2 / 27.5 | 5.40 / 3.36 | +27.2k / +4.4k | -14.9k | +36.7k / +1.7k | 49.6/4.2 · 50.7/4.3 |
| BE at 1.5R | 23.8 / 32.5 | 23.8 / 12.5 | 5.34 / 3.65 | +28.1k / +9.4k | +13.6k | +29.5k / +9.1k | 55.5/5.0 · 52.2/0.0 |
| no breakeven | 31.2 / 32.5 | 0 / 0 | 4.83 / 3.65 | +29.9k / +7.9k | +12.1k | +26.4k / +14.9k | 55.5/9.2 · 46.4/4.3 |
| BE after a confirmed 1m higher low (structure) | 16.2 / 22.5 | 46.2 / 35.0 | 5.37 / 3.57 | +22.4k / +6.2k | +12.3k | +18.2k / +2.2k | 47.9/0.0 · 40.6/0.0 |
| trail behind 5m swings after 2R | 32.5 / 37.5 | 25.0 / 7.5 | 3.13 / 2.77 | +25.7k / +7.6k | +7.2k | +24.2k / +6.5k | 37.8/2.5 · 49.3/0.0 |
| trail behind 5m swings after 4R | 23.8 / 35.0 | 35.0 / 10.0 | 4.46 / 3.61 | +27.1k / +9.7k | +1.6k | +27.8k / +9.6k | 45.4/4.2 · 53.6/0.0 |
| trail behind 1m swings after 2R | 33.8 / 37.5 | 25.0 / 5.0 | - | +17.9k / +3.3k | +7.5k | +14.3k / +3.3k | 19.3/2.5 · 17.4/0.0 |
| time exit: out at 120 min if below 0R | 22.5 / 30.0 | 36.2 / 12.5 | 5.32 / 3.86 | +33.9k / +9.3k | +0.9k | +34.4k / +14.6k | 57.1/5.9 · 52.2/0.0 |
| time exit: out at 60 min if below 0.5R | 21.2 / 20.0 | 28.7 / 2.5 | - | +30.5k / +6.0k | -13.9k | +36.5k / +4.4k | 57.1/2.5 · 36.2/4.3 |
| 15-min check, MFE < 0.7R (was 0.5R) | 22.5 / 32.5 | 36.2 / 12.5 | 5.32 / 3.65 | +33.8k / +9.7k | -0.7k | +34.3k / +9.3k | 57.1/5.0 · 52.2/0.0 |
| no 15-minute check | 22.5 / 32.5 | 36.2 / 12.5 | 5.32 / 3.65 | +33.0k / +9.0k | -0.9k | +37.4k / +9.8k | 52.9/8.4 · 50.7/2.9 |

What it says:

- **Partials:** every partial (1R / 1.5R / 2R, 25-75%, with BE at 1R or BE at the partial) loses money in both halves.
  They lose $4.8k to $22.3k in H1 and $0.6k to $5.7k in H2. On the eval they cut the 2-week pass, because the two-week sizing
  buys exactly enough micros for one full target to pass. The bootstrap of the 50% / 1R partial vs live: P(not worse) is
  0.2% in H1 and 0.4% in H2. It is a clear loss, not noise. The blended sizing target helps a little in H1 (58.0 / 5.0 for
  25% at 1R) but raises the H2 fails to 4.3%.
- **The win-rate trade-off, in numbers:** the variants that really raise ">= +0.5R" (trailing after 1.5-2R, no breakeven,
  BE only after the partial) reach 31-41% (H1) and 37-45% (H2), against 22.5 / 32.5. They cost $4k-$16k of H1 and
  $1.5k-$7k of H2, and the eval 2-week pass falls 7-40 points. Each extra point of win rate costs about $400-$1,000 of H1.
- **Breakeven timing:** 1R is the H1 peak, and the ablation already showed 1.0-1.1R is a plateau. Later or no breakeven is
  better in 2021-25 (+$12-14k), but that is the known 2026-vs-2021-25 split; on the eval it raises fails. Structure
  breakeven (a 1m higher low) moves to BE too early and costs $11k / $3k.
- **Time exits:** "out at 120 minutes when below 0R" changes 5 trades. LIT rule +$208 / -$99, eval H2 +$5.6k on the same
  odds. The neighbours slope (90 min: H1 -$3.4k; 180 min: H2 eval -$3.7k), so it is path luck, not a plateau. Not adopted.
- **15-minute check thresholds (36 grid points):** the live 15 min / -0.3R / MFE 0.5R holds up. MFE 0.7R is the only variant
  in the whole study that beats live on every gate in both halves: +$86 / +$246, H1 2-week fails 5.9 -> 5.0, 1-month H1 fails
  11.9 -> 8.3. It changes 2 trades, so it is too small to act on. A 10-minute check helps H1 (+$2.0k) and hurts H2 (2-week
  pass 52 -> 42-51).
- **Verdict: keep today's exits.** No redesign raises probability without losing the payoff.

## 2. A+ grading (size up A+, size down C, never skip)

Facts known at the fill (from the 5m setup, the fill price, the planned stop and target): sweep depth, displacement body,
inducements taken first, the nearest inducement's age, a PD/PW/PM level swept, London (entry before 08:00), the VIX close the
day before, distance to the target in R, stop width, and a PVSRA vector at the sweep. The trade count never changes, so it
stays 3.12 / 2.56 a week.

Three grades:

- **Textbook (no fitting):** a 7-point checklist fixed in advance. The points are an HTF level, displacement >= 1.2 ATR, 2+
  inducements, sweep >= 0.75 ATR, a vector, an inducement <= 6 bars old, and a target >= 3R. A = 5+ points, B = 4, C = 3 or
  fewer.
- **Data (fitted on H1 only):** a median split on each fact. The H1-better side scores a point, and A / C are the top /
  bottom third of the H1 score.
- **Single:** the one fact with the biggest H1 spread, which is the nearest inducement's age: <= 6 bars (30 min) = A, else C.

| grade | avg unit R by grade H1 (A / B / C) | H2 | 2021-25 | LIT $ H1 / H2 (A 1.5x / C 0.5x) | placebo percentile H1 / H2 / 2021-25 | eval 2-wk H1 · H2 |
|---|---|---|---|---|---|---|
| live (no grade) | - | - | - | +33.7k / +9.4k | - | 57.1/5.9 · 52.2/0.0 |
| textbook | 1.21 / 1.41 / 0.33 | 0.82 / 1.25 / 0.43 | -0.19 / 0.10 / 0.10 | +34.9k / +8.5k | 83 / 85 / **1** | 51.3/0.0 · 34.8/0.0 |
| data (H1 fit) | **4.32** / 0.83 / 0.05 | 0.23 / 0.83 / 0.78 | -0.06 / 0.08 / 0.02 | +40.5k / +7.7k | 100 / **48** / 42 | 58.0/1.7 · 53.6/0.0 |
| single: fresh inducement | 1.65 / - / 0.08 | 0.87 / - / 0.60 | -0.04 / - / 0.11 | +49.0k / +11.9k | 100 / 89 / 9 | 60.5/0.0 · 42.0/0.0 |
| single, A 1.5x only (no cut) | | | | +49.3k / +12.7k | 100 / 86 / 11 | 63.9/6.7 · 50.7/0.0 |

- The **data grade** is the textbook overfit: A trades earn 4.3R in H1 and 0.2R in H2, which is worse than its own C trades.
- The **textbook grade** has the right sign in 2026 (C trades are weak in both halves) but reverses in 2021-25. Sizing up A by
  itself (no cut) looks good on money (+$5.8k / +$0.2k), but the placebo puts that at the 82nd / 46th percentile. Sizing up
  *any* random third of LIT in 2026 makes about the same money, because 2026 was a good year.
- The **fresh-inducement** lead is the one to watch. It was also the best tilt in `lit-trade-selection.md` (2026-10-18, older
  LIT rules), and in H2 the fresh trades still earn more (0.87R vs 0.60R). But H2 is only the 86-89th percentile against the
  placebo, 2021-25 reverses (9-11th), and the eval H2 2-week pass falls 52.2 -> 42.0 (A 1.5 / C 0.5) or 50.7 (A 1.5 only).
  It stays a paper lead.
- **What is different from the old engine's rejected grade sizing:**
  1. Every fact here is known at the fill on today's LIT, so there is no look-ahead.
  2. The grade is fitted on H1 only and checked on untouched H2.
  3. There is a pre-registered grade with no fitting.
  4. Everything is tested against a random-grade placebo with the same A/B/C counts.
  5. Setups are never skipped.
  6. It is scored on the real eval sizing.

  The answer is the same as before: grading adds nothing that a random grade doesn't.
- **Why sizing down C hurts the eval:** in two_week mode the size is "enough micros for one target to pass". A C trade at half
  size that hits its target no longer passes the eval, and in 2026 the C trades still hit often enough. Every "C x0.5" scheme
  lowers the H2 2-week pass (34.8-53.6 vs 52.2).

## 3. The OFF switches, re-scored on today's data and live rules

Each switch alone, then all 64 combinations (Appendix D). The switch settings:

- scale_in = the CLAUDE.md config `{"pb":0.25,"f":1.0,"rat_k":1.0,"min_rk":2.0,"n":1}`
- the Asia slot = the `lit-more-entries.md` lead 1 JSON, with the evening candidates
- `cisd1m 22`, `room_f 0.55`, `wk_loss_usd 1200`, `how_out 0.5`

The eval runner adds the two pieces the older eval executor lacked, both exactly as `engine/sizing.lit_qty` uses them: the
eval's ISO-week closed P&L (`wk_pnl`) for the weekly loss stop, and the `how_out` multiplier on the base micros. In two_week
mode `how_out` acts only after session 10, as in the live code.

| switch | trades/wk H1 / H2 | win >= 0.5R H1 / H2 | LIT $ H1 / H2 / 2021-25 | H2 $/month | eval $ H1 / H2 | 2-wk pass/fail H1 · H2 | 1-mo pass/fail H1 · H2 | median sessions to pass | H2 bootstrap P(no gain) |
|---|---|---|---|---|---|---|---|---|---|
| live | 3.12 / 2.56 | 22.5 / 32.5 | +33.7k / +9.4k / -0.7k | $2,533 | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5 / 4 | - |
| scale_in | 3.12 / 2.56 | 32.5 / 35.0 | +44.2k / +15.1k / -0.7k | $4,062 | +53.2k / +17.3k | 58.0/2.5 · 52.2/0.0 | 78.0/11.9 · 54.2/0.0 | 5 / 4 | **0.004** |
| cisd1m 22 | 3.12 / 2.56 | 22.5 / 32.5 | +33.7k / +9.8k / -0.7k | $2,648 | +34.3k / +9.3k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5 / 4 | 0.36 |
| room_f 0.55 | same trades | | +33.7k / +9.4k | $2,533 | +34.4k / +9.1k | 57.1/**2.5** · 52.2/0.0 | 74.3/8.3 · 49.2/1.7 | 5 / 4 | - |
| Asia slot | **4.8 / 4.1** | 22.8 / 34.4 | +34.2k / +13.5k / **-18.6k** | $3,639 | +41.0k / +12.4k | 56.3/6.7 · 59.4/**2.9** | 71.6/11.0 · 69.5/3.4 | 4 / 4 | 0.12 |
| wk_loss_usd 1200 | same trades | | +33.7k / +9.4k | $2,533 | +29.8k / +9.5k | 57.1/**3.4** · 52.2/0.0 | 73.4/9.2 · 50.8/0.0 | 5 / 4 | - |
| how_out 0.5 | 3.12 / 2.56 | 22.5 / 32.5 | **+22.3k** / +7.9k / +10.5k | $2,117 | +37.9k / +10.8k | 57.1/5.9 · 52.2/0.0 | 71.6/11.9 · 47.5/0.0 | 5 / 4 | 0.78 |
| **scale + room 55% + wk stop** (H1 pick) | 3.12 / 2.56 | 32.5 / 35.0 | +44.2k / +15.1k / -0.7k | **$4,062** | **+53.6k / +14.7k** | **57.1/0.0 · 52.2/0.0** | **78.9/2.8** · 52.5/1.7 | 6 / 4 | 0.004 |
| cisd 22 + room 55% + wk stop (no scale-in) | 3.12 / 2.56 | 22.5 / 32.5 | +33.7k / +9.8k / -0.7k | $2,648 | +29.8k / +9.8k | **57.1/0.0** · 52.2/0.0 | 73.4/5.5 · 49.2/1.7 | 5 / 4 | 0.36 |
| scale + Asia + wk stop | 4.8 / 4.1 | 29.3 / 34.4 | +41.8k / +16.9k / -18.6k | $4,563 | +26.5k / +20.8k | 43.7/5.9 · 55.1/5.8 | 62.4/15.6 · 59.3/11.9 | 5 / 4 | - |

- **The pick rule (stated before looking at H2):** the best H1 sum of (2-week pass - fail) + (1-month pass - fail) with 2+
  trades a week, and the fewest switches on a tie. Winner: scale + room 55% + weekly stop: 57.1 + 76.1 = 133.2, against
  live's 113.6. Adding cisd1m 22 ties it in H1 (it changes no H1 trade) and gives H2 +$71.
- **H2 check, untouched:** +$14.7k eval path (live +$9.1k), 2-week 52.2 / 0.0 (same), 1 month 52.5 / 1.7 (live 50.8 / 0.0:
  one more 1-month fail out of 59 starts). LIT rule +$15.1k (live +$9.4k). Monte Carlo 2-week (2,000 shuffled paths): H1
  49.8 / 1.9 (live 52.8 / 2.6), H2 57.5 / 0.9 (live 55.1 / 3.5).
- **Plateau:** weekly loss stop $1,000 / $1,200 / $1,500 with scale + room 55%: H1 2-week fails 0.0 / 0.0 / 0.0, 1 month
  1.8 / 2.8 / 4.6. Room 50% / 55% / 65% with scale + weekly stop: H1 2-week fails 0.0 / 0.0 / 0.8, H2 2-week pass 52.2 /
  52.2 / 55.1. A flat ridge, not a spike. The no-scale version holds the same way (Appendix E).
- **Month by month (LIT rule, the pick vs live):**
  - Jan 8.0k vs 10.0k, Feb 6.0 vs 2.3, Mar 9.5 vs 7.4, Apr 8.3 vs 6.7, May 9.2 vs 5.1
  - Jun 3.3 vs 2.3, Jul 1.4 vs 0.9, Aug 0.8 vs 0.0, Sep 3.5 vs 1.9, Oct 9.4 vs 6.6
  - 10 of 10 months up in both; the pick is ahead in 9 of 10.
- **Drop the best 5 trades:** the pick +$7.9k (H1) / $0 (H2), against live +$9.6k / -$0.5k. LIT's money is a handful of
  big winners whichever way you slice it. Scale-in adds to those same winners, which is why it gains.
- **Asia slot:** the only switch that gets 4+ trades a week (93-94% of weeks with 2+), and the best 2-week pass in H2 (59.4).
  But H2 2-week fails go 0 -> 2.9%, H1 1-month fails stay high, it loses $18.6k in 2021-25, and its H2 gain has a bootstrap
  P(no gain) of 12%. Paper only, as before. With the weekly stop its fails fall (H1 1.7, H2 1.4), but scale + Asia together
  raise the fails a lot (H1 10.9%).
- **how_out 0.5:** the eval-path gain is an artefact of the sizing. two_week ignores the multiplier, so it only cuts size after
  session 10, when the eval is mostly decided. On the real LIT size rule it costs $11.4k in H1 (bootstrap P(loss) 99.7%).
  Rejected for 2026 (it only helps 2021-25: +$11.1k).

## Verdict

- **Exits: keep today's.** The partial at 1R costs 37-42% of the money and most of the eval odds. No exit raises the true
  win rate without paying for it, roughly $400-$1,000 of H1 for every point of win rate.
- **A+ grading: not adopted.** None of the three grades beats a random grade in H2 at 95%. All reverse in 2021-25, and they
  lower the eval pass. The fresh-inducement (<= 6 bars) size-up stays a paper lead.
- **Switches, recommended (your OK needed; nothing was changed):**
  1. **Now, safety pair + insurance:** `room_f 0.55` + `wk_loss_usd 1200` + `cisd1m 22`. H1 2-week fails 5.9% -> 0.0% and
     1-month fails 11.9% -> 5.5%, with the same passes. H2 unchanged (52.2 / 0.0) and +$0.7k. Price: about $4.4k less H1
     eval-path money (smaller trades after a -$1,200 week).
  2. **After the Sim roundtrip** (`python -m engine.ninjatrader --sim-roundtrip-add` on Sim101): `scale_in`. With 1, this
     is the study's pick: H2 +$14.7k vs +$9.1k on the eval path and +$15.1k vs +$9.4k on the LIT rule ($4,060 a month vs
     $2,530), with the same 2-week odds.
- **Not recommended:** the Asia slot (fails up, 2021-25 -$18.6k), `how_out 0.5` (H1 -$11.4k on the LIT rule), every partial
  / trail / earlier BE, the time exit, and every grade.
- **About "2+ a week with high probability":** LIT gives 2.6-3.1 trades a week with about 1 in 4 to 1 in 3 real winners at
  +3.7-5.3R. That is its nature. A high-win-rate strategy would need a different, near target. On this data that loses the
  money (fixed 2R target in the ablation: -$16.6k H1). The honest version of "high probability" here is the eval: a
  **57% / 52% chance to pass within 2 weeks with a 0% chance to fail** (with the safety pair).

### Switch JSON (for the owner's decision only; NOT applied)

1 (now), in `live_model.json` **and** `live_model_lit.json`:

```json
"lit": { ..., "cisd1m": 22 },
"lit_sizing": { ..., "wk_loss_usd": 1200, "two_week": { ..., "room_f": 0.55 } }
```

2 (after the Sim roundtrip passes), inside "lit" in both files:

```json
"scale_in": {"pb": 0.25, "f": 1.0, "rat_k": 1.0, "min_rk": 2.0, "n": 1}
```

After switching: rerun `python tools/lit_losses.py live` and the dashboard data (CLAUDE.md "Switch one off/on").

## Multiple testing

- **158 changed variants:** 93 exits, 12 grade x scheme, 63 switch combinations (plus 8 neighbours and 600 placebo draws per
  grade).
- **29 beat live in both halves on the LIT rule.** 40 would be expected from coin flips, so most of the field is worse than
  live.
- **14 also beat live on eval-path money in both halves without losing eval odds** (about 10 by chance):
  - 11 contain scale_in or the Asia slot + the weekly stop
  - 1 is the textbook size-up, which the placebo rejects
  - 1 is the MFE-0.7 check (2 trades)
- The pick's H2 gain is the scale-in gain. Its bootstrap P(no gain in H2) is 0.4%, and `lit-big-ideas.md` found it first, on
  the same data.

## Method and files

- `tools/hq_lit.py`:
  - `check`: re-walker == engine 631/631, units == lit_adopt_combo 120/120, eval == published 57.1/5.9 · 52.2/0.0
  - `exits`, `grade`, `switch`, `follow` (neighbours), `mtest`, `tables`, `save`
- Results are in `research/hq/`: `exits.json`, `grade.json`, `switch.json`, `follow.json`, `mtest.json`.
- Costs are $1.90 a micro round trip + 1 tick on market entries and stop / BE / time exits. So the live numbers here are about
  $235 / $83 below the published `lit_live` ($1.40 a micro).
- 2021-25 has 5m bars only, so the 15-minute check never acts there.
- Runs `hq_lit_*`: the LIT rule, plus `_eval` = the back-to-back eval path.
- No engine file and no `live_model*.json` was changed, so `tests.test_lit_live` is untouched.

## Appendix (generated by `python -X utf8 tools/hq_lit.py tables`)

### Appendix A - every exit variant: quality (LIT size rule)

| variant | H1: trades/wk · weeks 2+ · win >= 1R / >= 0.5R / > $0 · BE % · loss <= -0.5R % · avg winner R · expectancy R | H2: same |
|---|---|---|
| live exits (BE at 1R + 1.25 pts, 15-minute check, VIX band banked at 8R, flat 15:55) (`live`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| BE at 0.5R (`be0.5`) | 3.12 · 85% · 15.0 / 15.0 / 70.0 · 55.0 · 23.8 · 5.01 · +0.51 | 2.56 · 81% · 15.0 / 15.0 / 60.0 · 45.0 · 32.5 · 2.83 · +0.07 |
| BE at 0.75R (`be0.75`) | 3.12 · 85% · 20.0 / 20.0 / 61.3 · 41.2 · 32.5 · 5.4 · +0.75 | 2.56 · 81% · 22.5 / 22.5 / 52.5 · 27.5 · 40.0 · 3.36 · +0.33 |
| BE at 1.25R (`be1.25`) | 3.12 · 85% · 22.5 / 22.5 / 52.5 · 30.0 · 41.2 · 5.32 · +0.77 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| BE at 1.5R (`be1.5`) | 3.12 · 85% · 23.8 / 23.8 / 47.5 · 23.8 · 46.2 · 5.34 · +0.79 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| BE at 2R (`be2`) | 3.12 · 85% · 26.2 / 27.5 / 38.8 · 11.2 · 55.0 · 5.03 · +0.82 | 2.56 · 81% · 32.5 / 32.5 / 42.5 · 7.5 · 50.0 · 3.65 · +0.66 |
| no breakeven (`be_none`) | 3.12 · 85% · 30.0 / 31.2 / 31.2 · 0.0 · 62.5 · 4.83 · +0.87 | 2.56 · 81% · 32.5 / 32.5 / 37.5 · 0.0 · 55.0 · 3.65 · +0.61 |
| BE after a confirmed 1m higher low above the BE price (structure), no R trigger (`be_sw1`) | 3.12 · 85% · 16.2 / 16.2 / 62.5 · 46.2 · 31.2 · 5.37 · +0.55 | 2.56 · 81% · 22.5 / 22.5 / 57.5 · 35.0 · 35.0 · 3.57 · +0.42 |
| partial 25% at 1R, runner to the band, BE at 1R (`p1_25`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 4.64 · +0.72 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.24 · +0.66 |
| partial 33% at 1R, runner to the band, BE at 1R (`p1_33`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 4.49 · +0.69 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.16 · +0.64 |
| partial 50% at 1R, runner to the band, BE at 1R (`p1_50`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 3.51 · +0.54 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 2.46 · +0.40 |
| partial 75% at 1R, runner to the band, BE at 1R (`p1_75`) | 3.12 · 85% · 22.5 / 43.8 / 58.8 · 36.2 · 35.0 · 1.7 · +0.40 | 2.56 · 81% · 32.5 / 40.0 / 47.5 · 12.5 · 45.0 · 1.96 · +0.30 |
| partial 25% at 1.5R, runner to the band, BE at 1R (`p1.5_25`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 4.71 · +0.72 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.28 · +0.68 |
| partial 25% at 1.5R, BE only when the partial fills (`p1.5_25_bep`) | 3.12 · 85% · 23.8 / 23.8 / 47.5 · 23.8 · 46.2 · 4.8 · +0.69 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.28 · +0.68 |
| partial 33% at 1.5R, runner to the band, BE at 1R (`p1.5_33`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 4.57 · +0.69 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.21 · +0.66 |
| partial 33% at 1.5R, BE only when the partial fills (`p1.5_33_bep`) | 3.12 · 85% · 23.8 / 23.8 / 47.5 · 23.8 · 46.2 · 4.67 · +0.66 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.21 · +0.66 |
| partial 50% at 1.5R, runner to the band, BE at 1R (`p1.5_50`) | 3.12 · 85% · 22.5 / 30.0 / 58.8 · 36.2 · 35.0 · 2.97 · +0.55 | 2.56 · 81% · 32.5 / 40.0 / 47.5 · 12.5 · 45.0 · 2.4 · +0.47 |
| partial 50% at 1.5R, BE only when the partial fills (`p1.5_50_bep`) | 3.12 · 85% · 23.8 / 32.5 / 47.5 · 23.8 · 46.2 · 2.93 · +0.50 | 2.56 · 81% · 32.5 / 40.0 / 47.5 · 12.5 · 45.0 · 2.4 · +0.47 |
| partial 75% at 1.5R, runner to the band, BE at 1R (`p1.5_75`) | 3.12 · 85% · 26.2 / 33.8 / 58.8 · 36.2 · 35.0 · 2.3 · +0.42 | 2.56 · 81% · 40.0 / 40.0 / 47.5 · 12.5 · 45.0 · 2.21 · +0.40 |
| partial 75% at 1.5R, BE only when the partial fills (`p1.5_75_bep`) | 3.12 · 85% · 27.5 / 37.5 / 47.5 · 23.8 · 46.2 · 2.3 · +0.39 | 2.56 · 81% · 40.0 / 40.0 / 47.5 · 12.5 · 45.0 · 2.21 · +0.40 |
| partial 25% at 2R, runner to the band, BE at 1R (`p2_25`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 4.77 · +0.73 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.51 · +0.68 |
| partial 25% at 2R, BE only when the partial fills (`p2_25_bep`) | 3.12 · 85% · 26.2 / 27.5 / 38.8 · 11.2 · 55.0 · 4.59 · +0.71 | 2.56 · 81% · 32.5 / 32.5 / 42.5 · 7.5 · 50.0 · 3.51 · +0.62 |
| partial 33% at 2R, runner to the band, BE at 1R (`p2_33`) | 3.12 · 85% · 22.5 / 23.8 / 58.8 · 36.2 · 35.0 · 4.43 · +0.71 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 3.24 · +0.66 |
| partial 33% at 2R, BE only when the partial fills (`p2_33_bep`) | 3.12 · 85% · 26.2 / 28.7 / 38.8 · 11.2 · 55.0 · 4.32 · +0.69 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 7.5 · 50.0 · 3.24 · +0.61 |
| partial 50% at 2R, runner to the band, BE at 1R (`p2_50`) | 3.12 · 85% · 22.5 / 28.7 / 58.8 · 36.2 · 35.0 · 3.25 · +0.58 | 2.56 · 81% · 32.5 / 35.0 / 47.5 · 12.5 · 45.0 · 2.81 · +0.51 |
| partial 50% at 2R, BE only when the partial fills (`p2_50_bep`) | 3.12 · 85% · 26.2 / 33.8 / 38.8 · 11.2 · 55.0 · 3.2 · +0.51 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 7.5 · 50.0 · 2.81 · +0.46 |
| partial 75% at 2R, runner to the band, BE at 1R (`p2_75`) | 3.12 · 85% · 27.5 / 28.7 / 58.8 · 36.2 · 35.0 · 2.83 · +0.46 | 2.56 · 81% · 35.0 / 35.0 / 47.5 · 12.5 · 45.0 · 2.6 · +0.43 |
| partial 75% at 2R, BE only when the partial fills (`p2_75_bep`) | 3.12 · 85% · 31.2 / 33.8 / 38.8 · 11.2 · 55.0 · 2.81 · +0.39 | 2.56 · 81% · 35.0 / 35.0 / 42.5 · 7.5 · 50.0 · 2.6 · +0.38 |
| trail behind confirmed 5m swings after 1.5R (`tr1.5_5m`) | 3.12 · 85% · 32.5 / 36.2 / 58.8 · 18.8 · 35.0 · 2.79 · +0.66 | 2.56 · 81% · 37.5 / 42.5 / 47.5 · 5.0 · 45.0 · 2.43 · +0.55 |
| trail behind confirmed 1m swings after 1.5R (`tr1.5_1m`) | 3.12 · 85% · 36.2 / 41.2 / 58.8 · 16.2 · 35.0 · 2.07 · +0.50 | 2.56 · 81% · 35.0 / 45.0 / 47.5 · 0.0 · 45.0 · 1.56 · +0.22 |
| trail behind confirmed 5m swings after 2R (`tr2_5m`) | 3.12 · 85% · 32.5 / 32.5 / 58.8 · 25.0 · 35.0 · 3.13 · +0.66 | 2.56 · 81% · 37.5 / 37.5 / 47.5 · 7.5 · 45.0 · 2.77 · +0.56 |
| trail behind confirmed 1m swings after 2R (`tr2_1m`) | 3.12 · 85% · 33.8 / 33.8 / 58.8 · 25.0 · 35.0 · 2.55 · +0.50 | 2.56 · 81% · 37.5 / 37.5 / 47.5 · 5.0 · 45.0 · 2.2 · +0.35 |
| trail behind confirmed 5m swings after 3R (`tr3_5m`) | 3.12 · 85% · 27.5 / 27.5 / 58.8 · 31.2 · 35.0 · 3.96 · +0.73 | 2.56 · 81% · 35.0 / 35.0 / 47.5 · 10.0 · 45.0 · 3.35 · +0.70 |
| trail behind confirmed 1m swings after 3R (`tr3_1m`) | 3.12 · 85% · 27.5 / 27.5 / 58.8 · 31.2 · 35.0 · 3.64 · +0.64 | 2.56 · 81% · 35.0 / 35.0 / 47.5 · 7.5 · 45.0 · 2.84 · +0.52 |
| trail behind confirmed 5m swings after 4R (`tr4_5m`) | 3.12 · 85% · 23.8 / 23.8 / 58.8 · 35.0 · 35.0 · 4.46 · +0.70 | 2.56 · 81% · 35.0 / 35.0 / 47.5 · 10.0 · 45.0 · 3.61 · +0.79 |
| trail behind confirmed 1m swings after 4R (`tr4_1m`) | 3.12 · 85% · 23.8 / 23.8 / 58.8 · 35.0 · 35.0 · 4.39 · +0.69 | 2.56 · 81% · 35.0 / 35.0 / 47.5 · 10.0 · 45.0 · 3.46 · +0.74 |
| partial 50% at 1R + trail the runner behind 5m swings after 2R (`p1_50_tr2_5m`) | 3.12 · 85% · 31.2 / 32.5 / 58.8 · 25.0 · 35.0 · 2.18 · +0.43 | 2.56 · 81% · 37.5 / 40.0 / 47.5 · 7.5 · 45.0 · 2.01 · +0.34 |
| partial 33% at 1R + trail behind 5m swings after 2R (`p1_33_tr2_5m`) | 3.12 · 85% · 31.2 / 32.5 / 58.8 · 25.0 · 35.0 · 2.7 · +0.55 | 2.56 · 81% · 37.5 / 40.0 / 47.5 · 7.5 · 45.0 · 2.41 · +0.50 |
| time exit: out at 30 min when below 0R (`tx30_0`) | 3.12 · 85% · 21.2 / 21.2 / 50.0 · 28.7 · 23.8 · 5.55 · +0.92 | 2.56 · 81% · 20.0 / 20.0 / 27.5 · 5.0 · 27.5 · 3.48 · +0.33 |
| time exit: out at 30 min when below 0.5R (`tx30_0.5`) | 3.12 · 85% · 13.8 / 13.8 / 53.8 · 22.5 · 18.8 · 5.25 · +0.56 | 2.56 · 81% · 15.0 / 15.0 / 32.5 · 2.5 · 22.5 · 3.12 · +0.18 |
| time exit: out at 60 min when below 0R (`tx60_0`) | 3.12 · 85% · 21.2 / 21.2 / 56.2 · 35.0 · 28.7 · 5.28 · +0.82 | 2.56 · 81% · 30.0 / 30.0 / 42.5 · 10.0 · 42.5 · 3.64 · +0.65 |
| time exit: out at 60 min when below 0.5R (`tx60_0.5`) | 3.12 · 85% · 21.2 / 21.2 / 57.5 · 28.7 · 27.5 · 5.28 · +0.84 | 2.56 · 81% · 20.0 / 20.0 / 47.5 · 2.5 · 37.5 · 3.48 · +0.34 |
| time exit: out at 90 min when below 0R (`tx90_0`) | 3.12 · 85% · 21.2 / 21.2 / 57.5 · 36.2 · 31.2 · 5.28 · +0.80 | 2.56 · 81% · 30.0 / 30.0 / 40.0 · 7.5 · 40.0 · 3.86 · +0.71 |
| time exit: out at 90 min when below 0.5R (`tx90_0.5`) | 3.12 · 85% · 21.2 / 21.2 / 58.8 · 31.2 · 30.0 · 5.28 · +0.83 | 2.56 · 81% · 22.5 / 22.5 / 45.0 · 7.5 · 35.0 · 3.63 · +0.45 |
| time exit: out at 120 min when below 0R (`tx120_0`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 33.8 · 5.32 · +0.85 | 2.56 · 81% · 30.0 / 30.0 / 45.0 · 12.5 · 42.5 · 3.86 · +0.72 |
| time exit: out at 120 min when below 0.5R (`tx120_0.5`) | 3.12 · 85% · 21.2 / 21.2 / 61.3 · 31.2 · 31.2 · 5.28 · +0.83 | 2.56 · 81% · 25.0 / 25.0 / 45.0 · 10.0 · 42.5 · 3.84 · +0.56 |
| time exit: out at 180 min when below 0R (`tx180_0`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 30.0 / 30.0 / 45.0 · 12.5 · 45.0 · 3.64 · +0.61 |
| time exit: out at 180 min when below 0.5R (`tx180_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 33.8 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 27.5 / 27.5 / 45.0 · 12.5 · 45.0 · 3.45 · +0.47 |
| no 15-minute check (`tc_off`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 41.2 · 5.32 · +0.78 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 52.5 · 3.65 · +0.66 |
| 15-minute check at 10 min, below -0.2R, MFE < 0.3R (`tc10_0.2_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 36.2 · 5.32 · +0.83 | 2.56 · 81% · 27.5 / 27.5 / 42.5 · 12.5 · 45.0 · 3.77 · +0.56 |
| 15-minute check at 10 min, below -0.2R, MFE < 0.5R (`tc10_0.2_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 36.2 · 5.32 · +0.83 | 2.56 · 81% · 27.5 / 27.5 / 42.5 · 12.5 · 45.0 · 3.77 · +0.56 |
| 15-minute check at 10 min, below -0.2R, MFE < 0.7R (`tc10_0.2_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 27.5 / 27.5 / 42.5 · 12.5 · 45.0 · 3.77 · +0.56 |
| 15-minute check at 10 min, below -0.3R, MFE < 0.3R (`tc10_0.3_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 38.8 · 5.32 · +0.81 | 2.56 · 81% · 30.0 / 30.0 / 45.0 · 12.5 · 50.0 · 3.86 · +0.65 |
| 15-minute check at 10 min, below -0.3R, MFE < 0.5R (`tc10_0.3_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 38.8 · 5.32 · +0.81 | 2.56 · 81% · 30.0 / 30.0 / 45.0 · 12.5 · 50.0 · 3.86 · +0.65 |
| 15-minute check at 10 min, below -0.3R, MFE < 0.7R (`tc10_0.3_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 38.8 · 5.32 · +0.81 | 2.56 · 81% · 30.0 / 30.0 / 45.0 · 12.5 · 50.0 · 3.86 · +0.65 |
| 15-minute check at 10 min, below -0.4R, MFE < 0.3R (`tc10_0.4_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 41.2 · 5.32 · +0.80 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 52.5 · 3.65 · +0.67 |
| 15-minute check at 10 min, below -0.4R, MFE < 0.5R (`tc10_0.4_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 41.2 · 5.32 · +0.80 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 52.5 · 3.65 · +0.67 |
| 15-minute check at 10 min, below -0.4R, MFE < 0.7R (`tc10_0.4_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 41.2 · 5.32 · +0.80 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 52.5 · 3.65 · +0.67 |
| 15-minute check at 15 min, below -0.2R, MFE < 0.3R (`tc15_0.2_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 33.8 · 5.32 · +0.84 | 2.56 · 81% · 27.5 / 27.5 / 40.0 · 10.0 · 45.0 · 3.77 · +0.54 |
| 15-minute check at 15 min, below -0.2R, MFE < 0.5R (`tc15_0.2_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 33.8 · 5.32 · +0.84 | 2.56 · 81% · 27.5 / 27.5 / 40.0 · 10.0 · 42.5 · 3.77 · +0.56 |
| 15-minute check at 15 min, below -0.2R, MFE < 0.7R (`tc15_0.2_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 33.8 · 5.32 · +0.85 | 2.56 · 81% · 25.0 / 25.0 / 37.5 · 10.0 · 40.0 · 3.73 · +0.46 |
| 15-minute check at 15 min, below -0.3R, MFE < 0.3R (`tc15_0.3_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 47.5 · 3.65 · +0.70 |
| 15-minute check at 15 min, below -0.3R, MFE < 0.7R (`tc15_0.3_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 42.5 · 3.65 · +0.73 |
| 15-minute check at 15 min, below -0.4R, MFE < 0.3R (`tc15_0.4_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 38.8 · 5.32 · +0.81 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 50.0 · 3.65 · +0.68 |
| 15-minute check at 15 min, below -0.4R, MFE < 0.5R (`tc15_0.4_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 38.8 · 5.32 · +0.81 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 50.0 · 3.65 · +0.68 |
| 15-minute check at 15 min, below -0.4R, MFE < 0.7R (`tc15_0.4_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 38.8 · 5.32 · +0.82 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 47.5 · 3.65 · +0.69 |
| 15-minute check at 20 min, below -0.2R, MFE < 0.3R (`tc20_0.2_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 38.8 · 5.32 · +0.83 | 2.56 · 81% · 32.5 / 32.5 / 42.5 · 7.5 · 52.5 · 3.65 · +0.68 |
| 15-minute check at 20 min, below -0.2R, MFE < 0.5R (`tc20_0.2_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 37.5 · 5.32 · +0.83 | 2.56 · 81% · 32.5 / 32.5 / 42.5 · 7.5 · 50.0 · 3.65 · +0.69 |
| 15-minute check at 20 min, below -0.2R, MFE < 0.7R (`tc20_0.2_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 37.5 · 5.32 · +0.83 | 2.56 · 81% · 32.5 / 32.5 / 42.5 · 7.5 · 50.0 · 3.65 · +0.69 |
| 15-minute check at 20 min, below -0.3R, MFE < 0.3R (`tc20_0.3_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 43.8 · 5.32 · +0.79 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 52.5 · 3.65 · +0.69 |
| 15-minute check at 20 min, below -0.3R, MFE < 0.5R (`tc20_0.3_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 42.5 · 5.32 · +0.80 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 50.0 · 3.65 · +0.70 |
| 15-minute check at 20 min, below -0.3R, MFE < 0.7R (`tc20_0.3_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 42.5 · 5.32 · +0.80 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 50.0 · 3.65 · +0.70 |
| 15-minute check at 20 min, below -0.4R, MFE < 0.3R (`tc20_0.4_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 45.0 · 5.32 · +0.78 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 52.5 · 3.65 · +0.69 |
| 15-minute check at 20 min, below -0.4R, MFE < 0.5R (`tc20_0.4_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 43.8 · 5.32 · +0.79 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 50.0 · 3.65 · +0.70 |
| 15-minute check at 20 min, below -0.4R, MFE < 0.7R (`tc20_0.4_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 43.8 · 5.32 · +0.79 | 2.56 · 81% · 32.5 / 32.5 / 45.0 · 10.0 · 50.0 · 3.65 · +0.70 |
| 15-minute check at 30 min, below -0.2R, MFE < 0.3R (`tc30_0.2_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 35.0 · 5.32 · +0.83 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.2R, MFE < 0.5R (`tc30_0.2_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 33.8 · 5.32 · +0.84 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.2R, MFE < 0.7R (`tc30_0.2_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 55.0 · 32.5 · 33.8 · 5.32 · +0.85 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.3R, MFE < 0.3R (`tc30_0.3_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 37.5 · 5.32 · +0.82 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.3R, MFE < 0.5R (`tc30_0.3_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 37.5 · 5.32 · +0.83 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.3R, MFE < 0.7R (`tc30_0.3_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 56.2 · 33.8 · 37.5 · 5.32 · +0.83 | 2.56 · 81% · 27.5 / 27.5 / 37.5 · 7.5 · 50.0 · 3.77 · +0.52 |
| 15-minute check at 30 min, below -0.4R, MFE < 0.3R (`tc30_0.4_0.3`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 40.0 · 5.32 · +0.81 | 2.56 · 81% · 30.0 / 30.0 / 42.5 · 10.0 · 55.0 · 3.55 · +0.54 |
| 15-minute check at 30 min, below -0.4R, MFE < 0.5R (`tc30_0.4_0.5`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 40.0 · 5.32 · +0.81 | 2.56 · 81% · 30.0 / 30.0 / 42.5 · 10.0 · 55.0 · 3.55 · +0.54 |
| 15-minute check at 30 min, below -0.4R, MFE < 0.7R (`tc30_0.4_0.7`) | 3.12 · 85% · 22.5 / 22.5 / 57.5 · 35.0 · 40.0 · 5.32 · +0.82 | 2.56 · 81% · 30.0 / 30.0 / 42.5 · 10.0 · 55.0 · 3.55 · +0.54 |

### Appendix B - every exit variant: money and eval path (partial rows twice: live sizing, then the blended sizing target)

| variant | PF H1 / H2 | LIT $ H1 / H2 | H2 $/month | 2021-25 $ | max DD 2026 | $ without the best 5 H1 / H2 | eval $ H1 / H2 | eval 2-wk pass/fail H1 · H2 | eval 1-mo pass/fail H1 · H2 | median sessions to pass H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `live` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `be0.5` | 4.27 / 1.06 | +19.2k / +0.2k | $65 | -23.3k | -2.0k | +1.7k / -4.0k | +17.4k / +0.6k | 39.5/0.0 · 30.4/4.3 | 56.0/1.8 · 20.3/16.9 | 5.5 / 4.0 |
| `be0.75` | 4.42 / 1.81 | +27.2k / +4.4k | $1,174 | -14.9k | -2.1k | +5.9k / -3.4k | +36.7k / +1.7k | 49.6/4.2 · 50.7/4.3 | 68.8/8.3 · 49.2/6.8 | 5.0 / 4.5 |
| `be1.25` | 3.72 / 2.66 | +30.6k / +9.4k | $2,533 | +7.3k | -2.2k | +6.5k / -0.5k | +29.5k / +9.1k | 56.3/5.9 · 52.2/0.0 | 73.4/13.8 · 50.8/0.0 | 5.0 / 4.0 |
| `be1.5` | 3.13 / 2.66 | +28.1k / +9.4k | $2,533 | +13.6k | -2.2k | +4.0k / -0.5k | +29.5k / +9.1k | 55.5/5.0 · 52.2/0.0 | 66.1/12.8 · 50.8/0.0 | 4.0 / 4.0 |
| `be2` | 3.02 / 2.4 | +29.3k / +8.8k | $2,364 | +5.6k | -2.8k | +5.3k / -1.2k | +28.6k / +12.1k | 52.1/6.7 · 46.4/0.0 | 66.1/12.8 · 42.4/3.4 | 4.0 / 3.0 |
| `be_none` | 2.79 / 2.1 | +29.9k / +7.9k | $2,130 | +12.1k | -3.2k | +5.8k / -2.0k | +26.4k / +14.9k | 55.5/9.2 · 46.4/4.3 | 68.8/14.7 · 42.4/16.9 | 4.0 / 3.0 |
| `be_sw1` | 3.52 / 2.2 | +22.4k / +6.2k | $1,658 | +12.3k | -2.6k | +0.8k / -3.4k | +18.2k / +2.2k | 47.9/0.0 · 40.6/0.0 | 63.3/3.7 · 39.0/5.1 | 6.0 / 4.0 |
| `p1_25` | 4.3 / 2.5 | +28.4k / +8.5k | $2,285 | -0.5k | -2.2k | +9.0k / -0.2k | +22.2k / +7.7k | 27.7/4.2 · 40.6/0.0 | 62.4/11.9 · 49.2/3.4 | 11.0 / 7.5 |
| `p1_25` + blended sizing target | 4.3 / 2.5 | +28.4k / +8.5k | $2,285 | -0.5k | -2.2k | +9.0k / -0.2k | +35.9k / +6.4k | 58.0/5.0 · 50.7/4.3 | 72.5/16.5 · 49.2/8.5 | 5.0 / 5.0 |
| `p1_33` | 4.14 / 2.42 | +27.0k / +8.1k | $2,172 | +1.1k | -2.2k | +9.0k / -0.1k | +21.8k / +8.8k | 26.1/3.4 · 31.9/0.0 | 62.4/11.9 · 35.6/0.0 | 11.0 / 7.5 |
| `p1_33` + blended sizing target | 4.14 / 2.42 | +27.0k / +8.1k | $2,172 | +1.1k | -2.2k | +9.0k / -0.1k | +36.8k / +9.1k | 52.9/6.7 · 44.9/5.8 | 70.6/15.6 · 45.8/10.2 | 5.0 / 5.0 |
| `p1_50` | 3.49 / 1.96 | +21.4k / +5.4k | $1,459 | +0.5k | -2.2k | +7.5k / -1.2k | +19.4k / +4.1k | 10.9/3.4 · 14.5/0.0 | 56.0/15.6 · 20.3/3.4 | 13.0 / 11.0 |
| `p1_50` + blended sizing target | 3.49 / 1.96 | +21.4k / +5.4k | $1,459 | +0.5k | -2.2k | +7.5k / -1.2k | +26.4k / +6.7k | 45.4/6.7 · 29.0/4.3 | 59.6/16.5 · 27.1/5.1 | 6.0 / 7.0 |
| `p1_75` | 2.77 / 1.66 | +15.2k / +3.8k | $1,010 | +1.8k | -2.2k | +6.6k / -0.9k | +14.1k / +2.9k | 5.0/3.4 · 1.4/0.0 | 48.6/11.9 · 5.1/3.4 | 15.0 / 13.0 |
| `p1_75` + blended sizing target | 2.77 / 1.66 | +15.2k / +3.8k | $1,010 | +1.8k | -2.2k | +6.6k / -0.9k | +16.5k / +2.9k | 33.6/6.7 · 20.3/7.2 | 56.0/20.2 · 13.6/11.9 | 9.0 / 6.5 |
| `p1.5_25` | 4.29 / 2.56 | +28.2k / +8.8k | $2,377 | -1.7k | -2.2k | +8.5k / -0.1k | +22.5k / +7.9k | 34.5/4.2 · 39.1/0.0 | 63.3/11.9 · 49.2/0.0 | 9.0 / 7.0 |
| `p1.5_25` + blended sizing target | 4.29 / 2.56 | +28.2k / +8.8k | $2,377 | -1.7k | -2.2k | +8.5k / -0.1k | +38.5k / +6.8k | 58.0/4.2 · 50.7/4.3 | 71.6/15.6 · 49.2/5.1 | 5.0 / 5.0 |
| `p1.5_25_bep` | 2.76 / 2.56 | +23.3k / +8.8k | $2,377 | +10.7k | -2.3k | +3.6k / -0.1k | +17.4k / +7.9k | 37.0/3.4 · 39.1/0.0 | 64.2/16.5 · 49.2/0.0 | 9.0 / 7.0 |
| `p1.5_25_bep` + blended sizing target | 2.76 / 2.56 | +23.3k / +8.8k | $2,377 | +10.7k | -2.3k | +3.6k / -0.1k | +15.6k / +6.8k | 54.6/5.0 · 50.7/4.3 | 65.1/19.3 · 49.2/5.1 | 4.0 / 5.0 |
| `p1.5_33` | 4.13 / 2.51 | +26.9k / +8.5k | $2,297 | -0.6k | -2.2k | +8.4k / +0.1k | +21.6k / +7.6k | 31.1/4.2 · 39.1/0.0 | 63.3/11.9 · 49.2/3.4 | 10.0 / 8.0 |
| `p1.5_33` + blended sizing target | 4.13 / 2.51 | +26.9k / +8.5k | $2,297 | -0.6k | -2.2k | +8.4k / +0.1k | +33.2k / +6.2k | 53.8/7.6 · 50.7/4.3 | 71.6/16.5 · 49.2/11.9 | 5.0 / 4.5 |
| `p1.5_33_bep` | 2.66 / 2.51 | +21.9k / +8.5k | $2,297 | +11.3k | -2.3k | +3.4k / +0.1k | +18.7k / +7.6k | 34.5/3.4 · 39.1/0.0 | 64.2/16.5 · 49.2/3.4 | 9.0 / 8.0 |
| `p1.5_33_bep` + blended sizing target | 2.66 / 2.51 | +21.9k / +8.5k | $2,297 | +11.3k | -2.3k | +3.4k / +0.1k | +21.7k / +6.2k | 53.8/7.6 · 50.7/4.3 | 64.2/21.1 · 49.2/11.9 | 4.0 / 4.5 |
| `p1.5_50` | 3.49 / 2.15 | +21.4k / +6.5k | $1,759 | -2.2k | -2.2k | +6.7k / -0.5k | +22.0k / +5.1k | 15.1/4.2 · 13.0/0.0 | 56.0/11.0 · 23.7/3.4 | 12.0 / 11.0 |
| `p1.5_50` + blended sizing target | 3.49 / 2.15 | +21.4k / +6.5k | $1,759 | -2.2k | -2.2k | +6.7k / -0.5k | +30.1k / +7.5k | 47.1/8.4 · 37.7/5.8 | 64.2/15.6 · 37.3/6.8 | 6.0 / 6.0 |
| `p1.5_50_bep` | 2.26 / 2.15 | +16.6k / +6.5k | $1,759 | +8.3k | -2.6k | +1.9k / -0.5k | +17.2k / +5.1k | 14.3/3.4 · 13.0/0.0 | 52.3/12.8 · 23.7/3.4 | 12.0 / 11.0 |
| `p1.5_50_bep` + blended sizing target | 2.26 / 2.15 | +16.6k / +6.5k | $1,759 | +8.3k | -2.6k | +1.9k / -0.5k | +22.7k / +7.5k | 47.9/8.4 · 37.7/5.8 | 58.7/22.9 · 37.3/6.8 | 5.0 / 6.0 |
| `p1.5_75` | 2.79 / 1.95 | +15.4k / +5.4k | $1,445 | -2.0k | -2.2k | +5.5k / -0.1k | +14.8k / +2.6k | 10.1/3.4 · 11.6/0.0 | 46.8/12.8 · 15.3/0.0 | 13.0 / 11.0 |
| `p1.5_75` + blended sizing target | 2.79 / 1.95 | +15.4k / +5.4k | $1,445 | -2.0k | -2.2k | +5.5k / -0.1k | +20.1k / +4.2k | 37.8/6.7 · 29.0/5.8 | 51.4/20.2 · 23.7/6.8 | 7.0 / 6.5 |
| `p1.5_75_bep` | 1.86 / 1.95 | +11.3k / +5.4k | $1,445 | +6.2k | -2.7k | +1.5k / -0.1k | +13.1k / +2.6k | 10.1/2.5 · 11.6/0.0 | 41.3/13.8 · 15.3/0.0 | 13.0 / 11.0 |
| `p1.5_75_bep` + blended sizing target | 1.86 / 1.95 | +11.3k / +5.4k | $1,445 | +6.2k | -2.7k | +1.5k / -0.1k | +11.0k / +4.2k | 41.2/6.7 · 29.0/5.8 | 51.4/24.8 · 23.7/6.8 | 6.0 / 6.5 |
| `p2_25` | 4.36 / 2.56 | +28.9k / +8.9k | $2,384 | -0.7k | -2.2k | +8.8k / -0.2k | +23.2k / +8.0k | 37.0/4.2 · 40.6/0.0 | 63.3/11.9 · 49.2/3.4 | 9.0 / 7.0 |
| `p2_25` + blended sizing target | 4.36 / 2.56 | +28.9k / +8.9k | $2,384 | -0.7k | -2.2k | +8.8k / -0.2k | +32.0k / +5.8k | 57.1/5.0 · 50.7/4.3 | 72.5/16.5 · 49.2/8.5 | 5.0 / 5.0 |
| `p2_25_bep` | 2.71 / 2.31 | +24.9k / +8.2k | $2,214 | +5.2k | -2.8k | +4.8k / -0.8k | +20.8k / +11.8k | 40.3/5.9 · 34.8/0.0 | 63.3/17.4 · 42.4/6.8 | 7.0 / 7.0 |
| `p2_25_bep` + blended sizing target | 2.71 / 2.31 | +24.9k / +8.2k | $2,214 | +5.2k | -2.8k | +4.8k / -0.8k | +18.7k / +9.5k | 50.4/7.6 · 44.9/4.3 | 59.6/21.1 · 42.4/18.6 | 4.0 / 4.0 |
| `p2_33` | 4.22 / 2.51 | +27.7k / +8.5k | $2,301 | +0.2k | -2.2k | +8.7k / -0.1k | +29.4k / +7.8k | 34.5/4.2 · 40.6/0.0 | 63.3/11.9 · 49.2/0.0 | 9.0 / 8.0 |
| `p2_33` + blended sizing target | 4.22 / 2.51 | +27.7k / +8.5k | $2,301 | +0.2k | -2.2k | +8.7k / -0.1k | +30.1k / +6.8k | 52.9/5.9 · 47.8/4.3 | 72.5/16.5 · 49.2/8.5 | 5.0 / 5.0 |
| `p2_33_bep` | 2.63 / 2.26 | +23.7k / +7.9k | $2,131 | +5.9k | -2.8k | +4.7k / -0.7k | +18.3k / +11.3k | 37.8/5.9 · 34.8/0.0 | 62.4/17.4 · 42.4/3.4 | 7.0 / 7.0 |
| `p2_33_bep` + blended sizing target | 2.63 / 2.26 | +23.7k / +7.9k | $2,131 | +5.9k | -2.8k | +4.7k / -0.7k | +27.3k / +8.8k | 48.7/8.4 · 42.0/4.3 | 59.6/22.0 · 42.4/18.6 | 4.0 / 4.5 |
| `p2_50` | 3.66 / 2.22 | +22.8k / +6.9k | $1,854 | +0.3k | -2.2k | +7.3k / -0.6k | +17.0k / +5.5k | 16.8/3.4 · 37.7/0.0 | 56.9/10.1 · 44.1/0.0 | 12.0 / 8.0 |
| `p2_50` + blended sizing target | 3.66 / 2.22 | +22.8k / +6.9k | $1,854 | +0.3k | -2.2k | +7.3k / -0.6k | +31.2k / +8.1k | 46.2/5.9 · 43.5/4.3 | 62.4/15.6 · 44.1/5.1 | 5.0 / 6.0 |
| `p2_50_bep` | 2.25 / 1.99 | +18.3k / +6.3k | $1,684 | +6.7k | -2.8k | +2.7k / -1.2k | +18.8k / +8.6k | 21.0/5.0 · 31.9/0.0 | 56.0/16.5 · 37.3/3.4 | 11.0 / 7.5 |
| `p2_50_bep` + blended sizing target | 2.25 / 1.99 | +18.3k / +6.3k | $1,684 | +6.7k | -2.8k | +2.7k / -1.2k | +19.4k / +6.5k | 47.9/8.4 · 37.7/4.3 | 57.8/22.9 · 37.3/15.3 | 4.5 / 5.0 |
| `p2_75` | 3.03 / 2.02 | +17.4k / +5.8k | $1,552 | +1.2k | -2.2k | +6.2k / -0.6k | +16.0k / +3.6k | 11.8/2.5 · 26.1/0.0 | 50.5/11.0 · 33.9/0.0 | 13.0 / 9.0 |
| `p2_75` + blended sizing target | 3.03 / 2.02 | +17.4k / +5.8k | $1,552 | +1.2k | -2.2k | +6.2k / -0.6k | +21.4k / +2.8k | 42.0/5.9 · 30.4/8.7 | 59.6/21.1 · 27.1/13.6 | 6.0 / 7.0 |
| `p2_75_bep` | 1.89 / 1.82 | +13.0k / +5.1k | $1,382 | +7.3k | -2.8k | +1.9k / -1.2k | +11.2k / +4.8k | 8.4/3.4 · 20.3/0.0 | 39.4/16.5 · 27.1/3.4 | 13.0 / 9.5 |
| `p2_75_bep` + blended sizing target | 1.89 / 1.82 | +13.0k / +5.1k | $1,382 | +7.3k | -2.8k | +1.9k / -1.2k | +14.8k / +7.2k | 42.0/8.4 · 30.4/8.7 | 53.2/24.8 · 27.1/23.7 | 6.0 / 7.0 |
| `tr1.5_5m` | 3.95 / 2.35 | +25.4k / +7.7k | $2,060 | +6.2k | -1.9k | +7.2k / -1.9k | +22.9k / +4.7k | 37.8/2.5 · 49.3/0.0 | 69.7/8.3 · 49.2/0.0 | 9.0 / 5.0 |
| `tr1.5_1m` | 3.01 / 1.41 | +17.2k / +2.3k | $627 | +6.5k | -2.0k | +4.3k / -2.4k | +15.5k / +0.6k | 13.4/2.5 · 10.1/0.0 | 45.9/10.1 · 18.6/0.0 | 14.0 / 12.0 |
| `tr2_5m` | 3.99 / 2.34 | +25.7k / +7.6k | $2,039 | +7.2k | -2.0k | +7.6k / -1.9k | +24.2k / +6.5k | 37.8/2.5 · 49.3/0.0 | 68.8/9.2 · 49.2/0.0 | 9.0 / 5.0 |
| `tr2_1m` | 3.09 / 1.59 | +17.9k / +3.3k | $899 | +7.5k | -2.0k | +5.0k / -1.9k | +14.3k / +3.3k | 19.3/2.5 · 17.4/0.0 | 53.2/9.2 · 32.2/0.0 | 12.0 / 11.0 |
| `tr3_5m` | 4.33 / 2.56 | +28.6k / +8.8k | $2,374 | +7.3k | -1.9k | +8.4k / -0.8k | +28.6k / +8.4k | 40.3/4.2 · 52.2/0.0 | 69.7/9.2 · 49.2/0.0 | 8.0 / 4.0 |
| `tr3_1m` | 3.91 / 1.96 | +25.0k / +5.5k | $1,469 | +7.3k | -1.9k | +9.1k / -0.9k | +23.7k / +3.0k | 18.5/4.2 · 49.3/0.0 | 62.4/9.2 · 49.2/0.0 | 12.0 / 5.0 |
| `tr4_5m` | 4.16 / 2.72 | +27.1k / +9.7k | $2,620 | +1.6k | -1.9k | +6.9k / -0.2k | +27.8k / +9.6k | 45.4/4.2 · 53.6/0.0 | 67.0/9.2 · 50.8/0.0 | 6.0 / 4.0 |
| `tr4_1m` | 3.91 / 2.51 | +25.0k / +8.6k | $2,309 | +1.6k | -1.9k | +8.1k / -0.3k | +23.7k / +8.4k | 29.4/4.2 · 50.7/0.0 | 62.4/9.2 · 50.8/0.0 | 10.0 / 5.0 |
| `p1_50_tr2_5m` | 2.99 / 1.79 | +17.1k / +4.5k | $1,210 | +5.1k | -2.0k | +6.2k / -1.7k | +16.8k / +2.1k | 3.4/1.7 · 1.4/0.0 | 50.5/9.2 · 20.3/3.4 | 14.0 / 14.5 |
| `p1_50_tr2_5m` + blended sizing target | 2.99 / 1.79 | +17.1k / +4.5k | $1,210 | +5.1k | -2.0k | +6.2k / -1.7k | +17.2k / +3.3k | 30.3/6.7 · 23.2/4.3 | 59.6/14.7 · 23.7/5.1 | 10.0 / 7.0 |
| `p1_33_tr2_5m` | 3.46 / 2.12 | +21.1k / +6.4k | $1,711 | +6.4k | -2.0k | +7.3k / -1.6k | +19.7k / +5.4k | 13.4/1.7 · 23.2/0.0 | 59.6/8.3 · 30.5/0.0 | 12.5 / 10.0 |
| `p1_33_tr2_5m` + blended sizing target | 3.46 / 2.12 | +21.1k / +6.4k | $1,711 | +6.4k | -2.0k | +7.3k / -1.6k | +25.9k / +5.2k | 37.0/5.0 · 33.3/5.8 | 69.7/14.7 · 33.9/10.2 | 9.0 / 5.0 |
| `tx30_0` | 6.74 / 2.27 | +37.0k / +6.0k | $1,625 | -12.0k | -2.1k | +12.5k / -3.4k | +35.6k / +8.8k | 58.8/0.0 · 33.3/1.4 | 79.8/3.7 · 27.1/10.2 | 5.0 / 5.0 |
| `tx30_0.5` | 5.62 / 1.45 | +25.9k / +2.0k | $539 | -18.6k | -1.9k | +2.2k / -3.7k | +22.2k / -0.7k | 43.7/0.0 · 29.0/0.0 | 62.4/4.6 · 20.3/6.8 | 7.0 / 5.0 |
| `tx60_0` | 4.84 / 2.72 | +30.2k / +9.2k | $2,469 | -7.5k | -2.3k | +6.9k / -0.8k | +34.8k / +11.9k | 56.3/2.5 · 50.7/0.0 | 73.4/6.4 · 50.8/0.0 | 5.0 / 4.0 |
| `tx60_0.5` | 4.92 / 2.18 | +30.5k / +6.0k | $1,614 | -13.9k | -2.3k | +7.2k / -3.5k | +36.5k / +4.4k | 57.1/2.5 · 36.2/4.3 | 74.3/6.4 · 33.9/20.3 | 5.0 / 5.0 |
| `tx90_0` | 4.92 / 2.65 | +30.3k / +9.3k | $2,493 | -3.8k | -2.2k | +7.0k / -0.7k | +33.2k / +14.7k | 56.3/5.9 · 52.2/0.0 | 73.4/12.8 · 49.2/0.0 | 5.0 / 4.0 |
| `tx90_0.5` | 5.04 / 2.26 | +30.9k / +6.8k | $1,822 | -0.9k | -2.2k | +7.6k / -3.0k | +31.4k / +1.9k | 57.1/4.2 · 43.5/2.9 | 73.4/11.0 · 44.1/15.3 | 5.0 / 5.0 |
| `tx120_0` | 5.04 / 2.67 | +33.9k / +9.3k | $2,507 | +0.9k | -2.2k | +9.8k / -0.6k | +34.4k / +14.6k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `tx120_0.5` | 5.07 / 2.4 | +31.2k / +7.8k | $2,106 | -6.0k | -2.2k | +7.9k / -2.1k | +32.3k / +10.4k | 56.3/3.4 · 43.5/1.4 | 73.4/9.2 · 39.0/1.7 | 5.0 / 4.0 |
| `tx180_0` | 4.96 / 2.54 | +33.7k / +8.8k | $2,369 | +0.2k | -2.2k | +9.7k / -1.1k | +34.3k / +5.4k | 57.1/5.9 · 50.7/0.0 | 74.3/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `tx180_0.5` | 4.98 / 2.33 | +33.9k / +7.6k | $2,044 | +2.1k | -2.2k | +9.9k / -2.3k | +34.4k / +5.6k | 57.1/5.9 · 49.3/4.3 | 74.3/11.9 · 50.8/6.8 | 5.0 / 4.5 |
| `tc_off` | 4.58 / 2.47 | +33.0k / +9.0k | $2,416 | -0.9k | -2.3k | +9.0k / -1.0k | +37.4k / +9.8k | 52.9/8.4 · 50.7/2.9 | 72.5/16.5 · 50.8/3.4 | 5.0 / 4.0 |
| `tc10_0.2_0.3` | 5.26 / 2.54 | +35.9k / +8.4k | $2,250 | -0.7k | -2.0k | +11.5k / -1.6k | +34.9k / +7.4k | 57.1/5.0 · 42.0/0.0 | 73.4/15.6 · 39.0/0.0 | 5.0 / 4.0 |
| `tc10_0.2_0.5` | 5.26 / 2.54 | +35.9k / +8.4k | $2,250 | -0.7k | -2.0k | +11.5k / -1.6k | +34.9k / +7.4k | 57.1/5.0 · 42.0/0.0 | 73.4/15.6 · 39.0/0.0 | 5.0 / 4.0 |
| `tc10_0.2_0.7` | 5.37 / 2.54 | +36.1k / +8.4k | $2,250 | -0.7k | -1.8k | +11.6k / -1.6k | +38.2k / +7.4k | 57.1/5.0 · 42.0/0.0 | 73.4/11.9 · 39.0/0.0 | 5.0 / 4.0 |
| `tc10_0.3_0.3` | 5.12 / 2.55 | +35.7k / +9.1k | $2,437 | -0.7k | -2.0k | +11.2k / -0.9k | +37.4k / +4.6k | 57.1/6.7 · 50.7/0.0 | 73.4/16.5 · 50.8/0.0 | 5.0 / 4.0 |
| `tc10_0.3_0.5` | 5.12 / 2.55 | +35.7k / +9.1k | $2,437 | -0.7k | -2.0k | +11.2k / -0.9k | +37.4k / +4.6k | 57.1/6.7 · 50.7/0.0 | 73.4/16.5 · 50.8/0.0 | 5.0 / 4.0 |
| `tc10_0.3_0.7` | 5.12 / 2.55 | +35.7k / +9.1k | $2,437 | -0.7k | -2.0k | +11.2k / -0.9k | +37.4k / +4.6k | 57.1/6.7 · 50.7/0.0 | 73.4/16.5 · 50.8/0.0 | 5.0 / 4.0 |
| `tc10_0.4_0.3` | 4.9 / 2.52 | +35.3k / +9.1k | $2,448 | -0.7k | -2.2k | +10.9k / -0.9k | +38.2k / +9.9k | 57.1/6.7 · 50.7/2.9 | 73.4/16.5 · 50.8/3.4 | 5.0 / 4.0 |
| `tc10_0.4_0.5` | 4.9 / 2.52 | +35.3k / +9.1k | $2,448 | -0.7k | -2.2k | +10.9k / -0.9k | +38.2k / +9.9k | 57.1/6.7 · 50.7/2.9 | 73.4/16.5 · 50.8/3.4 | 5.0 / 4.0 |
| `tc10_0.4_0.7` | 4.9 / 2.52 | +35.3k / +9.1k | $2,448 | -0.7k | -2.2k | +10.9k / -0.9k | +38.2k / +9.9k | 57.1/6.7 · 50.7/2.9 | 73.4/16.5 · 50.8/3.4 | 5.0 / 4.0 |
| `tc15_0.2_0.3` | 5.01 / 2.25 | +33.8k / +7.7k | $2,061 | -0.7k | -2.2k | +9.8k / -2.3k | +35.2k / +8.6k | 57.1/5.9 · 43.5/0.0 | 74.3/11.9 · 37.3/3.4 | 5.0 / 4.0 |
| `tc15_0.2_0.5` | 5.01 / 2.36 | +33.8k / +7.9k | $2,139 | -0.7k | -2.2k | +9.8k / -2.0k | +35.2k / +8.6k | 57.1/5.9 · 43.5/0.0 | 74.3/11.9 · 37.3/3.4 | 5.0 / 4.0 |
| `tc15_0.2_0.7` | 5.06 / 2.23 | +33.9k / +7.0k | $1,875 | -0.7k | -2.2k | +9.9k / -3.0k | +35.2k / +7.2k | 57.1/5.0 · 36.2/1.4 | 74.3/8.3 · 28.8/15.3 | 5.0 / 4.0 |
| `tc15_0.3_0.3` | 4.92 / 2.53 | +33.7k / +9.1k | $2,455 | -0.7k | -2.2k | +9.6k / -0.8k | +34.3k / +15.2k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/3.4 | 5.0 / 4.0 |
| `tc15_0.3_0.7` | 4.97 / 2.78 | +33.8k / +9.7k | $2,600 | -0.7k | -2.1k | +9.7k / -0.3k | +34.3k / +9.3k | 57.1/5.0 · 52.2/0.0 | 74.3/8.3 · 50.8/0.0 | 5.0 / 4.0 |
| `tc15_0.4_0.3` | 4.69 / 2.49 | +33.2k / +9.0k | $2,431 | -0.7k | -2.2k | +9.2k / -0.9k | +39.6k / +11.6k | 57.1/6.7 · 52.2/2.9 | 74.3/14.7 · 50.8/3.4 | 5.0 / 4.0 |
| `tc15_0.4_0.5` | 4.69 / 2.49 | +33.2k / +9.0k | $2,431 | -0.7k | -2.2k | +9.2k / -0.9k | +39.6k / +11.6k | 57.1/6.7 · 52.2/2.9 | 74.3/14.7 · 50.8/3.4 | 5.0 / 4.0 |
| `tc15_0.4_0.7` | 4.73 / 2.6 | +33.3k / +9.3k | $2,497 | -0.7k | -2.1k | +9.3k / -0.7k | +39.7k / +11.5k | 57.1/5.9 · 52.2/2.9 | 74.3/11.0 · 50.8/3.4 | 5.0 / 4.0 |
| `tc20_0.2_0.3` | 4.63 / 2.43 | +33.1k / +8.9k | $2,385 | -0.6k | -2.1k | +9.1k / -1.1k | +34.9k / +8.5k | 55.5/5.0 · 52.2/0.0 | 73.4/9.2 · 50.8/3.4 | 5.0 / 4.0 |
| `tc20_0.2_0.5` | 4.68 / 2.46 | +33.2k / +8.9k | $2,407 | -0.6k | -2.1k | +9.2k / -1.0k | +35.3k / +8.5k | 55.5/5.0 · 52.2/0.0 | 73.4/9.2 · 50.8/3.4 | 5.0 / 4.0 |
| `tc20_0.2_0.7` | 4.68 / 2.46 | +33.2k / +8.9k | $2,407 | -0.6k | -2.1k | +9.2k / -1.0k | +35.3k / +8.5k | 55.5/5.0 · 52.2/0.0 | 73.4/9.2 · 50.8/3.4 | 5.0 / 4.0 |
| `tc20_0.3_0.3` | 4.38 / 2.53 | +32.6k / +9.1k | $2,454 | -0.6k | -2.4k | +8.6k / -0.8k | +37.6k / +8.5k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc20_0.3_0.5` | 4.42 / 2.56 | +32.7k / +9.2k | $2,476 | -0.6k | -2.4k | +8.7k / -0.8k | +38.1k / +8.6k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc20_0.3_0.7` | 4.42 / 2.56 | +32.7k / +9.2k | $2,476 | -0.6k | -2.4k | +8.7k / -0.8k | +38.1k / +8.6k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc20_0.4_0.3` | 4.33 / 2.53 | +32.5k / +9.1k | $2,454 | -0.6k | -2.4k | +8.4k / -0.8k | +37.6k / +8.5k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc20_0.4_0.5` | 4.37 / 2.56 | +32.6k / +9.2k | $2,476 | -0.6k | -2.4k | +8.5k / -0.8k | +38.0k / +8.6k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc20_0.4_0.7` | 4.37 / 2.56 | +32.6k / +9.2k | $2,476 | -0.6k | -2.4k | +8.5k / -0.8k | +38.0k / +8.6k | 55.5/5.0 · 52.2/0.0 | 72.5/14.7 · 50.8/0.0 | 5.0 / 4.0 |
| `tc30_0.2_0.3` | 4.88 / 2.17 | +33.6k / +7.4k | $1,999 | -0.9k | -2.1k | +9.5k / -2.5k | +31.1k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.2_0.5` | 5.01 / 2.17 | +33.8k / +7.4k | $1,999 | -0.9k | -2.0k | +9.8k / -2.5k | +35.0k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.2_0.7` | 5.03 / 2.17 | +33.9k / +7.4k | $1,999 | -0.9k | -2.0k | +9.8k / -2.5k | +35.0k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.3_0.3` | 4.82 / 2.17 | +33.5k / +7.4k | $1,999 | -0.9k | -2.1k | +9.4k / -2.5k | +30.9k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.3_0.5` | 4.88 / 2.17 | +33.6k / +7.4k | $1,999 | -0.9k | -2.0k | +9.5k / -2.5k | +34.2k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.3_0.7` | 4.89 / 2.17 | +33.6k / +7.4k | $1,999 | -0.9k | -2.0k | +9.6k / -2.5k | +34.2k / +8.4k | 52.9/5.9 · 43.5/0.0 | 74.3/8.3 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.4_0.3` | 4.78 / 2.25 | +33.4k / +7.8k | $2,088 | -0.9k | -2.1k | +9.4k / -2.2k | +38.4k / +12.7k | 52.9/6.7 · 43.5/0.0 | 73.4/15.6 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.4_0.5` | 4.84 / 2.25 | +33.5k / +7.8k | $2,088 | -0.9k | -2.0k | +9.5k / -2.2k | +36.3k / +12.7k | 52.9/6.7 · 43.5/0.0 | 73.4/15.6 · 37.3/3.4 | 5.0 / 4.0 |
| `tc30_0.4_0.7` | 4.86 / 2.25 | +33.6k / +7.8k | $2,088 | -0.9k | -2.0k | +9.5k / -2.2k | +36.3k / +12.7k | 52.9/6.7 · 43.5/0.0 | 73.4/15.6 · 37.3/3.4 | 5.0 / 4.0 |

### Appendix C - grades x size schemes

| variant | PF H1 / H2 | LIT $ H1 / H2 | H2 $/month | 2021-25 $ | max DD 2026 | $ without the best 5 H1 / H2 | eval $ H1 / H2 | eval 2-wk pass/fail H1 · H2 | eval 1-mo pass/fail H1 · H2 | median sessions to pass H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|---|
| textbook a15_c05 | 6.66 / 2.91 | +34.9k / +8.5k | $2,285 | -14.9k | -1.5k | +10.1k / -1.1k | +26.7k / +8.7k | 51.3/0.0 · 34.8/0.0 | 69.7/0.0 · 28.8/0.0 | 5.0 / 4.5 |
| textbook a125_c075 | 5.82 / 2.61 | +34.0k / +8.0k | $2,140 | -7.6k | -1.7k | +10.8k / -1.3k | +23.0k / +12.8k | 47.9/0.0 · 37.7/0.0 | 66.1/3.7 · 35.6/3.4 | 5.0 / 5.0 |
| textbook c05 | 5.88 / 2.96 | +29.1k / +8.3k | $2,235 | -7.9k | -1.4k | +9.2k / -0.9k | +26.3k / +8.7k | 45.4/0.0 · 40.6/0.0 | 62.4/0.0 · 33.9/0.0 | 5.0 / 5.0 |
| textbook a15 | 5.49 / 2.64 | +39.5k / +9.6k | $2,583 | -7.6k | -2.3k | +12.5k / -0.7k | +38.2k / +9.2k | 63.0/5.9 · 52.2/0.0 | 78.0/11.9 · 50.8/0.0 | 4.5 / 4.0 |
| data a15_c05 | 6.97 / 2.44 | +40.5k / +7.7k | $2,075 | -1.9k | -1.8k | +13.5k / -1.3k | +34.9k / +5.3k | 58.0/1.7 · 53.6/0.0 | 84.4/3.7 · 52.5/0.0 | 6.0 / 5.0 |
| data a125_c075 | 5.98 / 2.45 | +36.8k / +8.0k | $2,147 | -1.2k | -1.9k | +11.4k / -1.5k | +36.7k / +11.6k | 59.7/2.5 · 47.8/0.0 | 75.2/6.4 · 49.2/0.0 | 5.0 / 5.0 |
| data c05 | 6.02 / 2.49 | +34.1k / +7.4k | $2,005 | -1.5k | -1.8k | +10.1k / -1.0k | +23.3k / +6.5k | 51.3/1.7 · 53.6/0.0 | 78.9/3.7 · 52.5/0.0 | 6.0 / 5.0 |
| data a15 | 5.67 / 2.61 | +40.1k / +9.7k | $2,603 | -1.0k | -2.2k | +13.1k / -0.9k | +41.7k / +9.0k | 63.9/5.9 · 50.7/0.0 | 79.8/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| single a15_c05 | 7.94 / 3.35 | +49.0k / +11.9k | $3,203 | -11.1k | -2.0k | +13.8k / -1.2k | +35.9k / +4.7k | 60.5/0.0 · 42.0/0.0 | 83.5/3.7 · 45.8/0.0 | 6.0 / 6.0 |
| single a125_c075 | 6.49 / 2.78 | +40.4k / +9.2k | $2,480 | -6.1k | -2.0k | +11.3k / -1.3k | +34.3k / +12.6k | 58.0/0.0 · 47.8/0.0 | 73.4/3.7 · 49.2/3.4 | 5.0 / 5.0 |
| single c05 | 6.66 / 3.07 | +33.4k / +8.6k | $2,321 | -6.6k | -1.6k | +9.7k / -0.6k | +35.1k / +7.3k | 52.1/0.0 · 50.7/0.0 | 74.3/1.8 · 47.5/0.0 | 6.0 / 5.0 |
| single a15 | 6.05 / 2.94 | +49.3k / +12.7k | $3,416 | -5.2k | -2.6k | +14.1k / -0.7k | +46.8k / +10.2k | 63.9/6.7 · 50.7/0.0 | 78.9/8.3 · 50.8/3.4 | 5.0 / 4.0 |

### Appendix D - all 64 switch combinations: money and eval path

| variant | PF H1 / H2 | LIT $ H1 / H2 | H2 $/month | 2021-25 $ | max DD 2026 | $ without the best 5 H1 / H2 | eval $ H1 / H2 | eval 2-wk pass/fail H1 · H2 | eval 1-mo pass/fail H1 · H2 | median sessions to pass H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `live` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `scale` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.2k / +17.3k | 58.0/2.5 · 52.2/0.0 | 78.0/11.9 · 54.2/0.0 | 5.0 / 4.0 |
| `c22` | 4.92 / 2.88 | +33.7k / +9.8k | $2,648 | -0.7k | -2.2k | +9.6k / -0.1k | +34.3k / +9.3k | 57.1/5.9 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `r55` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +34.4k / +9.1k | 57.1/2.5 · 52.2/0.0 | 74.3/8.3 · 49.2/1.7 | 5.0 / 4.0 |
| `asia` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +41.0k / +12.4k | 56.3/6.7 · 59.4/2.9 | 71.6/11.0 · 69.5/3.4 | 4.0 / 4.0 |
| `wk12` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +29.8k / +9.5k | 57.1/3.4 · 52.2/0.0 | 73.4/9.2 · 50.8/0.0 | 5.0 / 4.0 |
| `how` | 4.64 / 3.13 | +22.3k / +7.9k | $2,117 | +10.5k | -1.9k | +4.1k / -0.3k | +37.9k / +10.8k | 57.1/5.9 · 52.2/0.0 | 71.6/11.9 · 47.5/0.0 | 5.0 / 4.0 |
| `scale+c22` | 4.88 / 3.48 | +44.2k / +15.2k | $4,081 | -0.7k | -2.5k | +7.9k / +0.1k | +53.2k / +17.3k | 58.0/2.5 · 52.2/0.0 | 78.0/11.9 · 54.2/0.0 | 5.0 / 4.0 |
| `scale+r55` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.5k / +15.6k | 57.1/1.7 · 52.2/0.0 | 78.9/6.4 · 52.5/1.7 | 6.0 / 4.0 |
| `scale+asia` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +36.4k / +10.0k | 46.2/10.9 · 53.6/4.3 | 62.4/21.1 · 61.0/8.5 | 4.0 / 3.5 |
| `scale+wk12` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.3k / +17.0k | 58.0/0.8 · 52.2/0.0 | 78.0/8.3 · 54.2/0.0 | 5.0 / 4.0 |
| `scale+how` | 4.78 / 3.9 | +28.3k / +12.0k | $3,231 | +10.5k | -1.6k | +3.4k / -0.5k | +38.3k / +16.3k | 58.0/2.5 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 4.5 / 4.0 |
| `c22+r55` | 4.92 / 2.88 | +33.7k / +9.8k | $2,648 | -0.7k | -2.2k | +9.6k / -0.1k | +34.4k / +9.3k | 57.1/2.5 · 52.2/0.0 | 74.3/8.3 · 49.2/1.7 | 5.0 / 4.0 |
| `c22+asia` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +41.0k / +12.4k | 56.3/6.7 · 59.4/2.9 | 71.6/11.0 · 69.5/3.4 | 4.0 / 4.0 |
| `c22+wk12` | 4.92 / 2.88 | +33.7k / +9.8k | $2,648 | -0.7k | -2.2k | +9.6k / -0.1k | +29.8k / +9.7k | 57.1/3.4 · 52.2/0.0 | 73.4/9.2 · 50.8/0.0 | 5.0 / 4.0 |
| `c22+how` | 4.64 / 3.32 | +22.3k / +8.1k | $2,175 | +10.5k | -1.9k | +4.1k / -0.1k | +37.9k / +11.2k | 57.1/5.9 · 52.2/0.0 | 71.6/11.9 · 50.8/0.0 | 5.0 / 4.0 |
| `r55+asia` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +33.3k / +7.8k | 54.6/1.7 · 59.4/0.0 | 70.6/9.2 · 69.5/0.0 | 4.0 / 4.0 |
| `r55+wk12` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +29.8k / +9.6k | 57.1/0.0 · 52.2/0.0 | 73.4/5.5 · 49.2/1.7 | 5.0 / 4.0 |
| `r55+how` | 4.64 / 3.13 | +22.3k / +7.9k | $2,117 | +10.5k | -1.9k | +4.1k / -0.3k | +38.0k / +13.5k | 57.1/2.5 · 52.2/0.0 | 71.6/8.3 · 45.8/0.0 | 5.0 / 4.0 |
| `asia+wk12` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +47.4k / +13.3k | 58.0/1.7 · 59.4/1.4 | 78.0/11.0 · 69.5/3.4 | 5.0 / 4.0 |
| `asia+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +29.4k / +9.1k | 56.3/6.7 · 59.4/2.9 | 68.8/11.0 · 61.0/3.4 | 4.0 / 3.5 |
| `wk12+how` | 4.64 / 3.13 | +22.3k / +7.9k | $2,117 | +10.5k | -1.9k | +4.1k / -0.3k | +27.8k / +10.9k | 57.1/3.4 · 52.2/0.0 | 71.6/9.2 · 47.5/0.0 | 5.0 / 4.0 |
| `scale+c22+r55` | 4.88 / 3.48 | +44.2k / +15.2k | $4,081 | -0.7k | -2.5k | +7.9k / +0.1k | +53.5k / +15.6k | 57.1/1.7 · 52.2/0.0 | 78.9/6.4 · 52.5/1.7 | 6.0 / 4.0 |
| `scale+c22+asia` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +36.4k / +10.0k | 46.2/10.9 · 53.6/4.3 | 62.4/21.1 · 61.0/8.5 | 4.0 / 3.5 |
| `scale+c22+wk12` | 4.88 / 3.48 | +44.2k / +15.2k | $4,081 | -0.7k | -2.5k | +7.9k / +0.1k | +53.3k / +17.1k | 58.0/0.8 · 52.2/0.0 | 78.0/8.3 · 54.2/0.0 | 5.0 / 4.0 |
| `scale+c22+how` | 4.78 / 4.02 | +28.3k / +12.1k | $3,264 | +10.5k | -1.6k | +3.4k / -0.4k | +38.3k / +16.4k | 58.0/2.5 · 52.2/0.0 | 74.3/11.9 · 50.8/0.0 | 4.5 / 4.0 |
| `scale+r55+asia` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +31.9k / +5.1k | 44.5/8.4 · 53.6/0.0 | 63.3/18.3 · 66.1/3.4 | 5.0 / 4.0 |
| `scale+r55+wk12` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.6k / +14.7k | 57.1/0.0 · 52.2/0.0 | 78.9/2.8 · 52.5/1.7 | 6.0 / 4.0 |
| `scale+r55+how` | 4.78 / 3.9 | +28.3k / +12.0k | $3,231 | +10.5k | -1.6k | +3.4k / -0.5k | +36.5k / +19.9k | 57.1/1.7 · 52.2/0.0 | 75.2/6.4 · 49.2/0.0 | 5.0 / 3.5 |
| `scale+asia+wk12` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +26.5k / +20.8k | 43.7/5.9 · 55.1/5.8 | 62.4/15.6 · 59.3/11.9 | 5.0 / 4.0 |
| `scale+asia+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +27.8k / +6.9k | 46.2/10.9 · 53.6/4.3 | 59.6/18.3 · 50.8/8.5 | 4.0 / 3.0 |
| `scale+wk12+how` | 4.78 / 3.9 | +28.3k / +12.0k | $3,231 | +10.5k | -1.6k | +3.4k / -0.5k | +38.5k / +16.1k | 58.0/0.8 · 52.2/0.0 | 73.4/8.3 · 50.8/0.0 | 4.0 / 4.0 |
| `c22+r55+asia` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +33.3k / +7.8k | 54.6/1.7 · 59.4/0.0 | 70.6/9.2 · 69.5/0.0 | 4.0 / 4.0 |
| `c22+r55+wk12` | 4.92 / 2.88 | +33.7k / +9.8k | $2,648 | -0.7k | -2.2k | +9.6k / -0.1k | +29.8k / +9.8k | 57.1/0.0 · 52.2/0.0 | 73.4/5.5 · 49.2/1.7 | 5.0 / 4.0 |
| `c22+r55+how` | 4.64 / 3.32 | +22.3k / +8.1k | $2,175 | +10.5k | -1.9k | +4.1k / -0.1k | +38.0k / +13.9k | 57.1/2.5 · 52.2/0.0 | 71.6/8.3 · 49.2/0.0 | 5.0 / 4.0 |
| `c22+asia+wk12` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +47.4k / +13.3k | 58.0/1.7 · 59.4/1.4 | 78.0/11.0 · 69.5/3.4 | 5.0 / 4.0 |
| `c22+asia+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +29.4k / +9.1k | 56.3/6.7 · 59.4/2.9 | 68.8/11.0 · 61.0/3.4 | 4.0 / 3.5 |
| `c22+wk12+how` | 4.64 / 3.32 | +22.3k / +8.1k | $2,175 | +10.5k | -1.9k | +4.1k / -0.1k | +27.8k / +11.3k | 57.1/3.4 · 52.2/0.0 | 71.6/9.2 · 50.8/0.0 | 5.0 / 4.0 |
| `r55+asia+wk12` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +34.8k / +12.7k | 56.3/0.8 · 59.4/0.0 | 75.2/10.1 · 69.5/1.7 | 5.0 / 4.0 |
| `r55+asia+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +27.0k / +6.2k | 54.6/1.7 · 59.4/0.0 | 67.0/8.3 · 61.0/0.0 | 4.0 / 4.0 |
| `r55+wk12+how` | 4.64 / 3.13 | +22.3k / +7.9k | $2,117 | +10.5k | -1.9k | +4.1k / -0.3k | +27.8k / +13.5k | 57.1/0.0 · 52.2/0.0 | 71.6/5.5 · 45.8/0.0 | 5.0 / 4.0 |
| `asia+wk12+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +33.1k / +10.3k | 58.0/1.7 · 59.4/1.4 | 71.6/11.0 · 61.0/3.4 | 4.0 / 3.5 |
| `scale+c22+r55+asia` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +31.9k / +5.1k | 44.5/8.4 · 53.6/0.0 | 63.3/18.3 · 66.1/3.4 | 5.0 / 4.0 |
| `scale+c22+r55+wk12` | 4.88 / 3.48 | +44.2k / +15.2k | $4,081 | -0.7k | -2.5k | +7.9k / +0.1k | +53.6k / +14.8k | 57.1/0.0 · 52.2/0.0 | 78.9/2.8 · 52.5/1.7 | 6.0 / 4.0 |
| `scale+c22+r55+how` | 4.78 / 4.02 | +28.3k / +12.1k | $3,264 | +10.5k | -1.6k | +3.4k / -0.4k | +36.5k / +20.0k | 57.1/1.7 · 52.2/0.0 | 75.2/6.4 · 49.2/0.0 | 5.0 / 3.5 |
| `scale+c22+asia+wk12` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +26.5k / +20.8k | 43.7/5.9 · 55.1/5.8 | 62.4/15.6 · 59.3/11.9 | 5.0 / 4.0 |
| `scale+c22+asia+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +27.8k / +6.9k | 46.2/10.9 · 53.6/4.3 | 59.6/18.3 · 50.8/8.5 | 4.0 / 3.0 |
| `scale+c22+wk12+how` | 4.78 / 4.02 | +28.3k / +12.1k | $3,264 | +10.5k | -1.6k | +3.4k / -0.4k | +38.5k / +16.2k | 58.0/0.8 · 52.2/0.0 | 73.4/8.3 · 50.8/0.0 | 4.0 / 4.0 |
| `scale+r55+asia+wk12` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +22.3k / +5.5k | 42.0/5.0 · 53.6/1.4 | 65.1/16.5 · 59.3/6.8 | 6.0 / 3.0 |
| `scale+r55+asia+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +39.0k / +2.3k | 44.5/8.4 · 53.6/0.0 | 58.7/15.6 · 55.9/3.4 | 4.0 / 3.0 |
| `scale+r55+wk12+how` | 4.78 / 3.9 | +28.3k / +12.0k | $3,231 | +10.5k | -1.6k | +3.4k / -0.5k | +36.7k / +19.1k | 57.1/0.0 · 52.2/0.0 | 75.2/2.8 · 49.2/0.0 | 5.0 / 3.5 |
| `scale+asia+wk12+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +33.3k / +10.2k | 43.7/5.9 · 55.1/5.8 | 62.4/14.7 · 50.8/11.9 | 5.0 / 3.0 |
| `c22+r55+asia+wk12` | 3.34 / 2.4 | +34.2k / +13.5k | $3,639 | -18.6k | -2.8k | +10.2k / +2.5k | +34.8k / +12.7k | 56.3/0.8 · 59.4/0.0 | 75.2/10.1 · 69.5/1.7 | 5.0 / 4.0 |
| `c22+r55+asia+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +27.0k / +6.2k | 54.6/1.7 · 59.4/0.0 | 67.0/8.3 · 61.0/0.0 | 4.0 / 4.0 |
| `c22+r55+wk12+how` | 4.64 / 3.32 | +22.3k / +8.1k | $2,175 | +10.5k | -1.9k | +4.1k / -0.1k | +27.8k / +13.9k | 57.1/0.0 · 52.2/0.0 | 71.6/5.5 · 49.2/0.0 | 5.0 / 4.0 |
| `c22+asia+wk12+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +33.1k / +10.3k | 58.0/1.7 · 59.4/1.4 | 71.6/11.0 · 61.0/3.4 | 4.0 / 3.5 |
| `r55+asia+wk12+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +23.7k / +6.2k | 56.3/0.8 · 59.4/0.0 | 70.6/10.1 · 61.0/1.7 | 4.0 / 4.0 |
| `scale+c22+r55+asia+wk12` | 3.09 / 2.5 | +41.8k / +16.9k | $4,549 | -18.6k | -4.1k | +8.4k / +1.8k | +22.3k / +5.5k | 42.0/5.0 · 53.6/1.4 | 65.1/16.5 · 59.3/6.8 | 6.0 / 3.0 |
| `scale+c22+r55+asia+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +39.0k / +2.3k | 44.5/8.4 · 53.6/0.0 | 58.7/15.6 · 55.9/3.4 | 4.0 / 3.0 |
| `scale+c22+r55+wk12+how` | 4.78 / 4.02 | +28.3k / +12.1k | $3,264 | +10.5k | -1.6k | +3.4k / -0.4k | +36.7k / +19.1k | 57.1/0.0 · 52.2/0.0 | 75.2/2.8 · 49.2/0.0 | 5.0 / 3.5 |
| `scale+c22+asia+wk12+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +33.3k / +10.2k | 43.7/5.9 · 55.1/5.8 | 62.4/14.7 · 50.8/11.9 | 5.0 / 3.0 |
| `scale+r55+asia+wk12+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +37.2k / +5.6k | 42.0/5.0 · 53.6/1.4 | 65.1/14.7 · 54.2/6.8 | 6.0 / 3.0 |
| `c22+r55+asia+wk12+how` | 3.13 / 2.47 | +21.5k / +9.5k | $2,549 | -3.4k | -1.7k | +3.2k / +1.2k | +23.7k / +6.2k | 56.3/0.8 · 59.4/0.0 | 70.6/10.1 · 61.0/1.7 | 4.0 / 4.0 |
| `scale+c22+r55+asia+wk12+how` | 2.92 / 2.5 | +25.3k / +12.0k | $3,239 | -3.4k | -2.0k | +2.0k / -0.5k | +37.2k / +5.6k | 42.0/5.0 · 53.6/1.4 | 65.1/14.7 · 54.2/6.8 | 6.0 / 3.0 |

### Appendix D2 - all 64 switch combinations: quality

| variant | H1: trades/wk · weeks 2+ · win >= 1R / >= 0.5R / > $0 · BE % · loss <= -0.5R % · avg winner R · expectancy R | H2: same |
|---|---|---|
| `live` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `scale` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.69 · +1.13 |
| `c22` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `r55` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `asia` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `wk12` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `scale+c22` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.69 · +1.13 |
| `scale+r55` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.69 · +1.13 |
| `scale+asia` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+wk12` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.69 · +1.13 |
| `scale+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.4 · +1.03 |
| `c22+r55` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `c22+asia` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+wk12` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `c22+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `r55+asia` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `r55+wk12` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `r55+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `asia+wk12` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `asia+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `wk12+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `scale+c22+r55` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.69 · +1.13 |
| `scale+c22+asia` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+c22+wk12` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.69 · +1.13 |
| `scale+c22+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.4 · +1.04 |
| `scale+r55+asia` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+r55+wk12` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.69 · +1.13 |
| `scale+r55+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.4 · +1.03 |
| `scale+asia+wk12` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+asia+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `scale+wk12+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.4 · +1.03 |
| `c22+r55+asia` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+r55+wk12` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `c22+r55+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `c22+asia+wk12` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+asia+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+wk12+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `r55+asia+wk12` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `r55+asia+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `r55+wk12+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 47.5 · 12.5 · 45.0 · 3.65 · +0.71 |
| `asia+wk12+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `scale+c22+r55+asia` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+c22+r55+wk12` | 3.12 · 85% · 27.5 / 32.5 / 45.0 · 40.0 · 47.5 · 4.77 · +1.08 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.69 · +1.13 |
| `scale+c22+r55+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.4 · +1.04 |
| `scale+c22+asia+wk12` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+c22+asia+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `scale+c22+wk12+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.4 · +1.04 |
| `scale+r55+asia+wk12` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+r55+asia+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `scale+r55+wk12+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 15.0 · 47.5 · 4.4 · +1.03 |
| `scale+asia+wk12+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `c22+r55+asia+wk12` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+r55+asia+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `c22+r55+wk12+how` | 3.12 · 85% · 22.5 / 22.5 / 58.8 · 36.2 · 35.0 · 5.32 · +0.84 | 2.56 · 81% · 32.5 / 32.5 / 50.0 · 15.0 · 42.5 · 3.65 · +0.74 |
| `c22+asia+wk12+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `r55+asia+wk12+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `scale+c22+r55+asia+wk12` | 4.8 · 93% · 24.4 / 29.3 / 43.1 · 40.7 · 49.6 · 4.19 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.83 · +0.82 |
| `scale+c22+r55+asia+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `scale+c22+r55+wk12+how` | 3.12 · 85% · 27.5 / 32.5 / 50.0 · 40.0 · 42.5 · 4.64 · +1.09 | 2.56 · 81% · 32.5 / 35.0 / 42.5 · 17.5 · 47.5 · 4.4 · +1.04 |
| `scale+c22+asia+wk12+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `scale+r55+asia+wk12+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |
| `c22+r55+asia+wk12+how` | 4.8 · 93% · 22.8 / 22.8 / 59.3 · 36.6 · 34.1 · 4.22 · +0.62 | 4.1 · 94% · 34.4 / 34.4 / 51.6 · 15.6 · 42.2 · 3.02 · +0.59 |
| `scale+c22+r55+asia+wk12+how` | 4.8 · 93% · 24.4 / 29.3 / 47.2 · 40.7 · 45.5 · 4.06 · +0.76 | 4.1 · 94% · 32.8 / 34.4 / 43.8 · 20.3 · 48.4 · 3.65 · +0.76 |

### Appendix E - neighbours of the picks

| variant | PF H1 / H2 | LIT $ H1 / H2 | H2 $/month | 2021-25 $ | max DD 2026 | $ without the best 5 H1 / H2 | eval $ H1 / H2 | eval 2-wk pass/fail H1 · H2 | eval 1-mo pass/fail H1 · H2 | median sessions to pass H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `pick_wk1000` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +50.6k / +19.2k | 57.1/0.0 · 52.2/0.0 | 80.7/1.8 · 54.2/0.0 | 6.0 / 4.0 |
| `pick_wk1500` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.5k / +15.6k | 57.1/0.0 · 52.2/0.0 | 78.9/4.6 · 52.5/1.7 | 6.0 / 4.0 |
| `pick_r50` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +53.6k / +14.3k | 57.1/0.0 · 52.2/0.0 | 78.9/1.8 · 52.5/1.7 | 6.0 / 4.0 |
| `pick_r65` | 4.88 / 3.44 | +44.2k / +15.1k | $4,062 | -0.7k | -2.5k | +7.9k / -0.0k | +36.6k / +21.0k | 58.8/0.8 · 55.1/0.0 | 78.0/9.2 · 55.9/0.0 | 5.0 / 4.0 |
| `noscale_wk1000` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +30.5k / +9.6k | 57.1/0.0 · 52.2/0.0 | 73.4/3.7 · 49.2/0.0 | 5.0 / 4.0 |
| `noscale_wk1500` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +26.2k / +9.6k | 57.1/0.0 · 52.2/0.0 | 74.3/5.5 · 49.2/1.7 | 5.0 / 4.0 |
| `noscale_r50` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +29.9k / +9.3k | 57.1/0.0 · 50.7/0.0 | 73.4/3.7 · 49.2/1.7 | 5.0 / 4.5 |
| `noscale_r65` | 4.92 / 2.66 | +33.7k / +9.4k | $2,533 | -0.7k | -2.2k | +9.6k / -0.5k | +26.2k / +9.9k | 57.1/5.0 · 52.2/0.0 | 72.5/9.2 · 50.8/0.0 | 5.0 / 4.0 |
| `noscale+tx120_0` | 5.04 / 2.67 | +33.9k / +9.3k | $2,507 | +0.9k | -2.2k | +9.8k / -0.6k | +30.0k / +13.9k | 57.1/0.0 · 50.7/0.0 | 73.4/5.5 · 49.2/0.0 | 5.0 / 4.0 |
| `noscale+tc_mfe07` | 4.97 / 2.78 | +33.8k / +9.7k | $2,600 | -0.7k | -2.1k | +9.7k / -0.3k | +29.9k / +9.8k | 57.1/0.0 · 52.2/0.0 | 73.4/5.5 · 49.2/1.7 | 5.0 / 4.0 |
