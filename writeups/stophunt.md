## In one minute

- **Audit (2026-10-23, `stophunt-audit.md`):** the code and trades check out (independent rewrite identical, no
  look-ahead), but the leads were not the pick rule's top choices and have the best H2 of their shortlists, a search
  re-run on pre-2025 data does not find them, and "0 fails" hides 30-42% stuck evals in 2025 / 2021-24. Asia resweep hunt
  = WEAK (paper only), trend inducement hunt = NOT REAL.
- **The ask (owner, 2026-10-23):** "When all the retail traders get stopped out, it's usually because their stop loss is at a
  low or high. If we wait for a resweep, or inducement, then a strong candle move toward our DOL, we could find gold." Find
  more setups with LIT's win rate (55%) or better. Deep research, not the same results as before.
- **What was built:** a separate stop-hunt strategy that can trade any hour (18:00-15:30 ET, flat 15:55): 16 kinds of
  places where retail stops sit, the moment price runs through them, what happens next (immediate reclaim, a resweep, an
  inducement), a strong candle back, an objective target (the next untaken pool on the other side, or fixed R, or LIT's VIX
  band). **28.7 million variants** were scored with costs, structural stops and no look-ahead.
- **The honest headline: most stop hunts are not gold.** Pooled over every variant, a stop-hunt reversal earns about 0 R
  before costs (win 46-49%) in every period, and a variant's result in one period tells you nothing about another (H1 vs H2
  t-stat correlation -0.003; 2025 vs 2021-24 -0.006).
- **Picking on 2026 H1 alone (as for LIT) does not work here.** The H1 champions look great (80% win, PF 5-6) and then lose
  in 2021-24 (-$6k to -$9k) and are positive in H2 no more often than any random variant.
- **Two leads survive a stricter pick** (on H1 + 2025 + 2021-24 together, worst period counts; 2026 H2 kept untouched as
  the check). Both win 55%+ in every period, at $500 risk a trade:

| pick | period | trades | /wk | win % | PF | net $ | $/month | max DD |
|---|---|---|---|---|---|---|---|---|
| **Asia resweep hunt** | 2026 H1 | 38 | 1.5 | 71.1 | 2.60 | +$8,139 | +$1,335 | -$1,431 |
| | **2026 H2 (untouched)** | 40 | 2.6 | 57.5 | 1.37 | **+$2,915** | +$785 | -$2,334 |
| | 2025 | 104 | 2.0 | 56.7 | 1.51 | +$10,990 | +$895 | -$5,005 |
| | 2021-24 | 376 | 2.3 | 54.8 | 1.27 | +$22,705 | +$582 | -$6,360 |
| **Trend inducement hunt** | 2026 H1 | 35 | 1.4 | 65.7 | 2.18 | +$6,536 | +$1,072 | -$1,385 |
| | **2026 H2 (untouched)** | 24 | 1.5 | 66.7 | 2.30 | **+$4,916** | +$1,324 | -$1,027 |
| | 2025 | 98 | 1.9 | 60.2 | 1.72 | +$13,384 | +$1,089 | -$2,640 |
| | 2021-24 | 310 | 1.9 | 60.0 | 1.44 | +$26,349 | +$676 | -$4,968 |
| **Both (one position)** | 2026 H1 | 67 | 2.6 | 68.7 | 2.33 | +$12,882 | +$2,114 | -$1,886 |
| | **2026 H2 (untouched)** | 58 | 3.7 | 60.3 | 1.66 | **+$6,940** | +$1,869 | -$1,855 |
| | 2025 | 180 | 3.5 | 57.8 | 1.63 | +$22,854 | +$1,860 | -$3,725 |
| | 2021-24 | 632 | 3.9 | 56.6 | 1.31 | +$40,568 | +$1,040 | -$6,001 |

- **Where it helps most: as ATLAS members on the Builder 25K (account B).** Today's ATLAS (EMA + MACD + S/R) passes 68.9% /
  43.5% of evals within 2 weeks in H1 / H2. With the Asia hunt added: 79.8% / 56.5%; with both hunts: 74.8% / 65.2%; also
  better in 2025 (28.9 -> 30.1 / 39.4%) and 2021-24 (23.9 -> 32.5 / 34.7%); still 0 fails in 2 weeks.
- **Verdict:** two real but modest edges, the first strategy family in this repo that is positive in all four periods with a
  55%+ win rate. Not "gold": in H2 alone neither is beyond doubt (H2 is 24-40 trades), the Asia hunt's H2 is flat without its
  3 best trades, and the trend hunt's wider family does not beat chance. **Paper-trade them as ATLAS members on account B;
  no real money, no change to LIT.**

## What is NEW here (and what was already tried)

Before: LIT itself (its fixed levels, one window 02:00-15:30, inducement before the sweep, 1 trade a day), the S/R "NY
sweep-and-reclaim" of the day's levels (`second-sr.md`), LIT all-hours / Asia (`lit-all-hours.md`, `lit-more-entries.md`),
retail tools as extra LIT entries (`lit-retail-entries.md`), the retail standalone study (`retail-standalone.md`, with its
look-ahead bugs), ATLAS confluences (`atlas-confluences.md`), the old engine's `x_resweep` / `x_inducement`. None of these
was a stop-hunt strategy of its own over every kind of retail stop. New in this study:

1. **A map of retail stop pools, each its own type** (`engine/stophunt.py build_pools`, 637k pools in 5 years): fractal
   swing highs/lows with N = 2-5 bars each side on 1m (2026), 5m, 15m and 1h; equal highs/lows (two or more 5m/15m swings
   within max(1 pt, 0.1 ATR), still intact); edges of tight 2h/4h consolidations (2+ touches of each side); 3-touch
   trendlines (rising lows / falling highs, stops beyond a sloped line); Asia, London, prior NY session, overnight, prior day
   and prior week highs/lows; x00 and x50 round numbers. Each pool has an **obviousness score** (timeframe, swing strength,
   touches) and every hunt knows how many retail features sat within 0.3 ATR of it ("stacked").
2. **Any hour, 24/5** (18:00-15:30 entries, flat 15:55 for MFFU), with Asia, London, NY AM and NY PM scored separately.
3. **The owner's sequence as separate tests:** an immediate reclaim; a **resweep** of the same pool after a close back
   inside; a **double stop hunt** of the hunt's own new extreme after a bounce; an **inducement after the hunt** (a small
   swing that early reversal traders lean on gets taken first); LIT's inducement before the hunt; both; either.
4. **The draw on liquidity from the live pool map:** the nearest untaken opposite pool known at the signal (any pool, HTF
   pools only, or the most obvious ones), banked or not, next to fixed 1.5/2/3R and LIT's VIX band.
5. **Fair placebos:** the same entry mechanics (same limit distance below the signal close, same timeout, same stop points,
   same target R, same management), only the time or the direction changed, 2000 runs each.
6. **Chance accounting over the whole search:** how many variants "survive" versus how many would by luck, per family.

## Method

- **Data:** TradingView CME NQ1! 5m (`data/NQ_5m.csv`, 2021-11 to 2026-10-16) for pools, hunts and signals. The trade
  itself walks on 1m bars in 2026 (`data/NQ_1m.csv`) and on 5m before (there is no older 1m). Checked: re-walking 2026 on
  5m changes results by a few %, so the 2026-vs-older gap is the market, not the path.
- **No look-ahead:** a pool is used only from the 5m bar after the one where it became known (a swing with N bars each side
  when the N-th bar to its right has closed; a session high when the session is over; an HTF bar when its last 5m bar has
  closed). Signals are known at a 5m close and traded from the next bar. **Every final pick was re-derived on data cut at the
  signal close for 40 random trades: 40/40 identical** (same signal bar, direction, stop, pool, target). The check found one
  end-of-data guard (a hunt on the very last bar was skipped); fixed, no stored trade changed.
- **Fills and costs:** market entries at the next open + 1 tick; limits fill only when price trades 1 tick through; stop
  and target in the same bar = stop; $1.90 a micro round trip; 1 tick slippage on stop / time / flat exits. One extra tick
  each way keeps 85-98% of the money.
- **Size:** $500 risk a trade = floor(500 / (stop x $2)) micros (max 50); stop 1 tick beyond the hunt extreme (the
  protected low/high), 6-80 pts, else no trade. Eval paths use the plans' own sizing (below).
- **Search** (`tools/stophunt.py`): stage 1 = 19,200 setups (16 pool sets x 9 hunt variants x 3 windows x 4 candle sizes x
  3 structure rules x FVG x depth) x entry x target x 15-minute check x 10 hour windows x max/day = 7.68M variants; stage 2 =
  full management on the 39 best H1 setups (4.46M) and a 1,890-setup Asia family (3.63M); stage 3 = refinement around the two
  leads (8.29M + 4.64M). **Total 28.7M variants.**

## Result 1: on average, a stop hunt is worth nothing

Pooled over all stage-1 variants (15+ H1 trades), average R per trade after costs and the share of variants that made
money (H1 / H2 / 2025 / 2021-24):

| pools hunted | avg R per trade | % of variants positive |
|---|---|---|
| 5m swings | +0.01 / +0.04 / -0.05 / -0.07 | 54 / 55 / 30 / 15 |
| 15m swings | +0.02 / +0.01 / -0.05 / -0.06 | 52 / 48 / 31 / 19 |
| 1h swings | -0.06 / -0.10 / -0.05 / -0.05 | 38 / 32 / 34 / 24 |
| equal highs/lows | -0.03 / +0.07 / +0.01 / -0.06 | 41 / 54 / 50 / 18 |
| range edges | +0.07 / +0.01 / 0.00 / -0.06 | 54 / 47 / 46 / 23 |
| trendlines | +0.01 / +0.05 / -0.01 / -0.11 | 51 / 55 / 45 / 7 |
| Asia / London highs/lows | +0.02 / -0.13 / -0.04 / -0.07 | 49 / 35 / 38 / 15 |
| prior NY / overnight / day | -0.02 / -0.09 / +0.03 / -0.05 | 49 / 36 / 58 / 20 |
| round numbers | -0.10 / -0.04 / -0.04 / -0.03 | 29 / 41 / 36 / 34 |
| most obvious only (score 3+) | -0.06 / -0.01 / -0.09 / -0.05 | 36 / 44 / 23 / 24 |
| stacked (2+ features) | -0.02 / -0.02 / -0.03 / -0.06 | 45 / 43 / 39 / 21 |

- No pool type is "gold" on its own. The most obvious pools (1h swings, session/day/week levels) are **not better**; round
  numbers are the worst. Win rates sit at 44-52% for every type.
- Hunt variants barely differ (avg R -0.11 to +0.03 in every period). A **resweep** or an **inducement** first changes the
  average by a few hundredths of an R. An immediate reclaim is the worst (-0.11 R in 2021-24).
- What helps a little everywhere: a bigger trigger candle (1.2 ATR beats 0.5-0.8), a close beyond the last swing (market
  structure shift beats CISD or a plain reclaim), no 15-minute check (it cuts winners in this family).
- **Periods do not agree:** the sign of a variant's H1 result and its H2 result are uncorrelated (0.03); the same for 2025
  vs 2021-24. 2021-24 is negative for 84% of all variants.

## Result 2: picking on 2026 H1 alone fails

The LIT rule (pick on Jan-Jun 2026, check Jul-Oct) was applied first, with a plateau check (80% of one-step neighbours
positive in H1):

| H1 pick rule | stage | H1 picks positive in H2 | all variants positive in H2 |
|---|---|---|---|
| win rate 55%+, best t | stage 1 | 64% | 49% |
| most $ | stage 1 | 76% | 49% |
| win rate 55%+, best t | stage 2 (full management) | 80% | 40% |
| most $ | stage 2 | 27% | 40% |
| win rate / most $ (Asia family) | stage 2 | 0% / 13% | 65% |
| win rate / most $ (Asia) | stage 3 | 100% / 25% | 75% |
| win rate / most $ (trend) | stage 3 | 8% / 58% | 59% |

The H2 hit rate swings between far below and a bit above chance, and almost every H1 pick loses money in 2021-24. Two of
them are stored as `sh_h1pick_asia` (H1 +$13.2k with 80% wins; H2 +$3.2k; 2025 +$3.8k; 2021-24 **-$9.2k**) and
`sh_h1pick_trend` (H1 +$13.9k, 82% wins; H2 **-$3.0k**; 2021-24 **-$6.2k**). 2026 H1 is a market where many reversal rules
look brilliant; that does not carry.

## Result 3: two leads from a stricter pick

**Pick rule:** among variants with 1+ trade a week and PF 1.3+ in H1, rank by the **worst** t-stat of H1, 2025 and 2021-24;
the pick and its one-step neighbours must be profitable in H1 and in 2021-24 (plateau 80%+). **2026 H2 is never looked at**
and stays the only untouched check. (2025 and 2021-24 are used to pick, so they are no longer independent references.)
Under this rule 75-92% of the picks were positive in H2 against a 59-75% base rate.

### Pick 1: Asia resweep hunt (`sh_asia_resweep`)

In plain words:
1. Pools: higher-timeframe stops - 15m / 1h swing highs and lows, 15m equal highs/lows, the Asia / London / prior NY /
   overnight / prior day / prior week highs and lows.
2. Between 18:00 and 02:00 ET a 5m bar runs through one of them, and the hunt reaches at least 0.5 ATR beyond it.
3. **Resweep:** after closing back inside, price runs the same pool again, or after a 0.5 ATR bounce it takes the hunt's own
   new low/high (a double stop hunt).
4. Within 3 hours of the hunt: a strong 5m candle back (body >= 1.2 x ATR) that closes back beyond the pool and beyond the
   last 5m swing the other way.
5. Market entry at the next open; stop 1 tick beyond the hunt extreme (6-80 pts); target 2R; at +1R the stop goes to entry
   + 1.25 pts; flat 15:55; max 1 a session.

2026 by month (trades / wins / $): Jan 5/3/+$1,828 · Feb 10/7/+$1,553 · Mar 7/5/+$1,464 · Apr 9/7/+$1,716 · May 6/4/+$1,577
· Jun 1/1/$0 · **Jul 6/3/+$374 · Aug 12/6/-$987 · Sep 14/9/+$2,243 · Oct 8/5/+$1,285**. Positive months: 2022 8/12, 2023
8/12, 2024 6/12, 2025 8/12, 2026 9/10.

- Placebos (2000 runs, same entry and exits): **random times** p = 0.015 (H1), **0.25 (H2)**, 0.012 (2025), 0.003
  (2021-24), 0.000 overall; **shuffled directions** p = 0.005, **0.23**, 0.035, 0.030, 0.000 overall.
- Fragile spots: H2 without its 3 best trades is -$20; London / NY hours are not part of it; the 15-minute check costs a
  little; a session-end flat (out at 02:00) turns 2025 and 2021-24 negative, so these trades need the day to work.
- Neighbours: 94% / 97% / 81% / 81% of one-change variants are positive in H1 / H2 / 2025 / 2021-24. The pool choice
  matters most: 15m swings alone = nearly the same trades; every pool type mixed in weakens it; trendlines and round numbers alone
  lose. Resweep vs no extra condition: about the same money (the resweep adds little here).
- **Family check:** across the 3.6M-variant Asia family, "t > 1 in H1, 2025 and 2021-24" happens 1.9x as often as chance
  would give (5,184 vs 2,748), and those variants are positive in H2 88% of the time (base 65%). This is the strongest
  evidence in the study that something real is going on in this corner (Asia, HTF pools, big candle).

### Pick 2: Trend inducement hunt (`sh_trend_idm5`; sibling `sh_trend_idm`)

In plain words:
1. Pools: 5m swing highs/lows (sibling: every pool type).
2. The 1h trend (last closed 1h close vs its EMA 50) points one way; price pulls back against it and runs through a 5m
   swing at least 0.25 ATR (sibling 0.5 ATR).
3. **Inducement first (LIT style):** on the way into that pool, a smaller 5m swing within 1 ATR of it was taken.
4. Within 30 minutes: a 5m candle back with the trend (body >= 1.2 x ATR) closing beyond the pool and beyond the last swing.
5. A limit at the middle of that candle for 30 minutes; stop 1 tick beyond the hunt extreme; target 2R (sibling: the
   nearest untaken opposite pool, banked at 5R); BE + 1.25 at +1R; any hour 18:00-15:30, max 2 a session.

2026 by month: Jan 4/2/-$24 · Feb 8/6/+$2,596 · Mar 9/7/+$2,039 · Apr 6/3/+$1,436 · May 5/4/+$1,417 · Jun 3/1/-$928 ·
**Jul 7/5/+$457 · Aug 8/7/+$3,243 · Sep 6/3/+$1,301 · Oct 3/1/-$85**. Positive months: 2022 7/12, 2023 10/12, 2024 7/12,
2025 10/12, 2026 7/10. Sessions 2021-24: London +$13.3k, NY AM +$10.8k, Asia +$0.9k.

- Placebos: random times p = 0.020 (H1), **0.032 (H2)**, 0.003, 0.000, 0.000 overall; shuffled directions p = 0.40, **0.19**,
  0.022, 0.073, 0.011 overall. The timing matters; the direction matters less than one would hope.
- Neighbours: 86% / 94% / 89% / 92% positive. **Fragile:** without the 1h-trend rule it falls to +$6.9k in 2021-24; a 24-bar
  trigger window instead of 6 turns H1 negative, 12 bars halves it.
- **Family check fails:** across its 4.6M-variant family, variants with t > 1 in H1, 2025 and 2021-24 are rarer than chance
  (2,509 vs 4,989) and are positive in H2 56% of the time vs 59% for all. So its good H2 may be luck within the family.
- The DOL sibling (`sh_trend_idm`, nearest untaken pool as target): H1 +$8.8k (74% win), H2 +$2.4k, 2025 +$10.9k,
  2021-24 +$16.8k, H2 random-time p 0.14. Targeting the next pool did not beat a fixed 2R anywhere in this study.

### What the placebos say

At the moments these setups fire, a trade the **other way** with the same mechanics also makes money on average (Asia:
+$0.5k per half; trend: +$1.7k to +$14.5k per period). Random moments lose. So a good part of the edge is "trade right after a
big candle that followed a hunt, with these exits"; the direction read adds to it, clearly in the Asia hunt (p 0.000-0.035
outside H2), weakly in the trend hunt.

## Result 4: how to use them (MFFU eval paths)

Executors of the repo, nothing re-tuned: `tools/second_account_b.py` (account B, the plan's two_week "need" size, never
opposite to LIT, max 2 a day) and `tools/second_mix.py` (one account with LIT, LIT first). Fresh eval every session, 20
sessions; $ = the back-to-back eval path. 2-week pass / fail %:

| account | H1 | H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| ATLAS alone, Builder 25K (today) | 68.9 / 0.0 | 43.5 / 0.0 | 28.9 / 0.0 | 23.9 / 0.0 |
| **ATLAS + Asia hunt, 25K** | **79.8 / 0.0** | **56.5 / 0.0** | 30.1 / 0.0 | 32.5 / 0.0 |
| **ATLAS + both hunts, 25K** | 74.8 / 0.0 | **65.2 / 0.0** | **39.4 / 0.0** | **34.7 / 0.0** |
| ATLAS + trend hunt, 25K | 61.3 / 0.0 | 59.4 / 0.0 | 39.4 / 0.0 | 30.4 / 0.0 |
| Asia hunt alone, own 25K | 17.6 / 0.0 | 7.2 / 0.0 | 20.9 / 0.0 | 19.1 / 0.0 |
| both hunts alone, own 25K | 33.6 / 0.0 | 29.0 / 0.0 | 36.1 / 0.0 | 24.2 / 0.0 |
| LIT alone, 50K (today) | 57.1 / 5.9 | 52.2 / 0.0 | 14.1 / 1.2 | 14.7 / 6.8 |
| LIT + trend hunt ($500 safe), 50K | 53.8 / 3.4 | 63.8 / 0.0 | 15.7 / 3.2 | 21.5 / 12.0 |
| LIT + Asia hunt ($500 safe), 50K | 65.5 / 12.6 | 55.1 / 10.1 | 16.1 / 4.8 | 17.4 / 13.7 |

Eval path $: ATLAS alone +$19.7k / +$5.4k / +$1.0k / +$9.0k; ATLAS + both hunts **+$22.5k / +$12.9k / +$9.6k / +$21.7k**
(max DD -$1.6k / -$1.6k / -$4.1k / -$6.8k). LIT + trend hunt on the 50K: +$34.3k / +$17.1k vs LIT alone +$34.2k / +$9.1k.

- On their own account the hunts pass too slowly for the owner's 2-week rule (too few trades for "one winner passes").
- Next to LIT on the 50K the Asia hunt raises eval fails (its trades run into LIT's morning and use the room); the trend hunt
  adds H2 money and passes but not H1, and raises 2021-24 fails (6.8% -> 12.0%). LIT stays alone on the 50K.
- **As ATLAS members on the 25K they help in every period, with no 2-week fails.** That is the place to paper-trade them.

## Multiple testing, in numbers

- Variants tried: **28.7M** (stage 1 7.68M, stage 2 8.08M, stage 3 12.94M); 0.9-2.5M distinct trade sets per stage.
- Stage 1, all four periods positive: 40,876 observed vs 32,809 expected if periods were independent (1.25x); t > 1 in H1,
  2025 and 2021-24: 703 vs 616 (1.14x). Weak.
- Asia family (stage 2): t > 1 in H1, 2025 and 2021-24: **5,184 vs 2,748 (1.9x)**, H2 positive 88% vs 65%. Trend family
  (stage 3): **2,509 vs 4,989 (0.5x)**, H2 positive 56% vs 59%.
- The final 3 picks were chosen from millions; their in-sample p-values (H1, 2025, 2021-24) are inflated by that choice.
  Only H2 is clean: random-time p 0.25 (Asia), 0.03 (trend 5m), 0.14 (trend DOL).

## What failed (so nobody redoes it)

- Every pool type alone, including "the most obvious pools" and stacked pools: no edge on average (table above).
- Round numbers, trendlines, 1h swings, session highs/lows as the hunted pool: negative in 2021-24 for most settings.
- Immediate reclaim (hunt and reclaim in 1 bar): the worst hunt variant.
- The inducement **after** the hunt (early reversal traders' swing taken): no better on average; in the Asia hunt it stays
  positive in all periods with half the trades and less money, in the trend hunt it leaves 0-3 trades a period.
- DOL targets (next pool any / HTF / obvious, banked 3-5R): never better than fixed 2R in the final picks; the VIX band
  helps 2026 and hurts 2025.
- LIT's 15-minute check, a 1m CISD entry, half off at the first pool, session-end flats: none improves the picks across
  periods (1m CISD and session flats hurt 2025 / 2021-24).
- The H1-only pick for this family (Result 2).

## Verdict and next steps

- **Honest answer to "find gold":** the hunt of retail stops is not an edge by itself - price runs through obvious stops
  all the time and reverses only about half of the time. Two narrower setups hold up across 5 years with a 55%+ win rate and
  PF 1.27-2.6: the **Asia resweep hunt** (strongest evidence as a family) and the **trend inducement hunt** (best untouched H2,
  weaker family evidence). They make about +$600-1,300 a month each at $500 risk, much less than LIT in 2026, but unlike LIT
  they also made money in 2021-24.
- **Recommendation:** paper-log both as ATLAS members on account B (Builder 25K), next to EMA / MACD / S/R. Nothing is wired
  into the bot; `live_model*.json`, `second_model.json`, `engine/lit.py` and `engine/live.py` are untouched. If the owner wants
  them on paper, the next job is a `second_model.json` plugin (`live_run`) around `engine/stophunt.py` + a live parity test.
- Not for the LIT 50K eval (the Asia hunt adds fails; LIT stays alone).

## Files

- Core: `engine/stophunt.py` (pools, hunts, signals, DOL tables, fills, trade walk; numba speeds it up, plain Python works).
- Research driver: `tools/stophunt.py` (`base`, `grid`, `pick`, `stage2`, `pick2`, `stage3`, `pick3`, `final`, `book`,
  `evals`, `summary`, `save`). The grid caches live in `research/runs/_cache/stophunt_*` (gitignored, rebuild with the commands).
- Picks with every trade in the common format, params, plain-words rules, spans, months, placebos, look-ahead, sensitivity:
  `research/stophunt/sh_asia_resweep.json`, `sh_trend_idm5.json`, `sh_trend_idm.json`, `sh_book.json`; eval paths
  `research/stophunt/evals.json`; search and chance numbers `search_summary.json`, `stage1_picks.json`, `stage2_picks.json`,
  `stage3_picks.json`.
- Runs: `sh_asia_resweep`, `sh_trend_idm5`, `sh_trend_idm`, `sh_book` ($500 a trade), `sh_atlas25k_asia`,
  `sh_atlas25k_book`, `sh_withlit50k_trend5` (eval paths), `sh_h1pick_asia`, `sh_h1pick_trend` (the failed H1-only route).
  The run library's own eval columns re-score $500 trades on the 50K and are not the eval odds above.
