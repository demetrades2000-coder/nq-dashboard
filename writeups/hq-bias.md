# HQ bias: trade toward the higher-time-frame draw

**The owner's question (2026-10-23).** "I need a strategy that trades 2+ times a week, high-quality setups, with high
probability and high profit (payoff)." The goal set for this family: more $ per trade and a better 2-week MFFU 50K eval
than today, at 2+ trades a week. True winners (trades closed at +1R or more) should be clearly above LIT's 22-32%, and the
average winner should stay at 1.5R or more.

**Short answer: no.** A higher-time-frame draw-on-liquidity bias does not make a high-probability strategy on NQ. It
looked good in Jan-Jun 2026, where we picked it. In Jul-Oct 2026 and in 2021-24 it was no better than a coin flip.
Nothing is adopted. No candidate is good enough even for a paper slot.

## What was new here (vs the earlier bias studies)
- `lit-htf-confluences.md`, `lit-bias-discretion.md`, `lit-untested-bias.md` and `lit-untested-targets.md` kept LIT's own
  120 trades and its VIX-band target. They used the bias only as a filter, a size tilt or a target tilt on those trades.
- Here the bias **builds a different trade list**:
  1. The bias picks the direction.
  2. The target is **the draw itself**: the nearest untested HTF pool on that side, banked at 2R / 3R / 5R or not at all.
  3. Only setups pointing at that draw trade.
- LIT's filters could be loosened (displacement 0.5 ATR, depth 0.3 ATR, no inducement gate) because the bias does the
  selecting. Up to 2 trades a day were allowed.
- The aim was a high-probability trade: a near target (1.5-3R) that the market is drawn to, instead of LIT's far VIX band.

## How it was tested (plain words)
- **Data:** CME NQ1! from TradingView (5m 2021-11 to 2026-10-16, true 1m bars in 2026) and the CBOE VIX file. No other
  source was used.
- **Costs:** $1.90 a micro and 1 tick of slippage on market entries and on stop, BE and time exits.
- **Headline size:** LIT's size rule ($800 risk up to a 20-pt stop, then 800 x 20 / stop, max 40 micros).
- **Eval size:** LIT's live two_week sizing, run through the same executors as the ATLAS / account B research
  (`tools/second_mix.py`, `tools/second_account_b.py`).
- **HTF pools,** all known before the trigger bar closes. "Untested" means not touched since the pool existed.
  - PDH/PDL, PWH/PWL and PMH/PML. A pool already taken earlier in its day, week or month counts as swept.
  - NWOG/NDOG gap edges.
  - 4H FVGs (kept 20 days) and daily FVGs (kept 60 days), aimed at their near edge.
- **12 bias methods:**
  - nearest untested pool (all pools / PDH-PDL only);
  - premium / discount of the prior week's range, and of the prior week plus this week so far;
  - the previous day's and the previous week's candle colour;
  - "opposite pool": one HTF side was taken this period and the other side not;
  - nearest untested HTF FVG;
  - four pairs where two methods must agree.
- **Grid,** 41,472 variants:
  - pools: levels only, or levels + FVGs;
  - target: the draw itself, or the first pool at 1.5R or more;
  - minimum distance 1.5R / 2R; cap 2R / 3R / 5R / none;
  - BE at 1R / 1.5R / off (stop moved to entry + 1.25 pts);
  - entry: LIT (5m CISD limit, then a 1m CISD), a plain limit at the near edge of the last displacement FVG, or market;
  - LIT's filters at the live values or loosened;
  - window: killzones 02:00-05:00 + 08:30-11:30, the same + 13:30-15:30, or LIT's 02:00-15:30;
  - 1 or 2 trades a day.
  - Every variant keeps the stop 1 tick beyond the sweep extreme (8-80 pts), the 15-minute check and flat at 15:55.
- **Pick on 2026 H1 only.**
  - First the bar: >= 2 trades a week, >= 40% true winners (>= +1R), average winner >= 1.5R, 40+ trades, net > 0.
  - Then rank by net $ (expectancy $ x trades) and run the eval path for the top 40.
  - Final pick: 2-week pass - 2 x 2-week fail - 1-month fail. 2-week fails may not exceed LIT's.
  - Checked untouched on H2 (Jul 1 - Oct 16), 2025 and 2021-24.
- **Pre-2025 re-pick:** the same selection on 2021-11..2024-12 only, then tested on 2025 and 2026.
- **Checks:**
  - look-ahead: features rebuilt on data cut at the entry bar, 46 of 46 identical;
  - plateau map: every one-step neighbour of each pick;
  - random-bias placebo: the same pipeline with a coin flip a day as the bias, 200 seeds;
  - same entry times with the direction shuffled, and same direction at random times in the same window (1,000 shuffles
    each, simple market executor for the trade and its placebos alike);
  - month by month; the best 5 trades dropped.

## The numbers (LIT size rule, costs in)

"Win" = true winners (+1R or more). BE = breakeven exits. Exp = expectancy per trade. $/mo = net $ per month.

| | span | trades/wk | % weeks 2+ | win | BE | avg winner | exp R / $ | PF | net | $/mo | max DD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **LIT live** (reference) | H1 | 3.12 | 85 | 22.5% | 36% | 5.32R | 0.84 / $421 | 4.92 | +$33,666 | $5,523 | -$2,213 |
| | H2 | 2.56 | 81 | 32.5% | 13% | 3.65R | 0.71 / $235 | 2.66 | +$9,410 | $2,533 | -$1,419 |
| | 2025 | 2.21 | 70 | 9.6% | 45% | 3.99R | 0.00 / $25 | 1.16 | +$2,823 | $230 | -$7,316 |
| | 2021-24 | 2.44 | 77 | 13.4% | 35% | 3.53R | 0.01 / -$9 | 0.96 | -$3,487 | -$90 | -$20,378 |
| **#1 weekly candle bias** (H1 pick) | H1 | 2.07 | 59 | 43.4% | 21% | 2.22R | 0.66 / $325 | 3.95 | +$17,218 | $2,825 | -$1,222 |
| | H2 | **1.60** | 44 | **28.0%** | 8% | 1.91R | 0.04 / $17 | 1.10 | +$432 | $116 | -$2,049 |
| | 2025 | 0.93 | 25 | 31.2% | 10% | 1.86R | 0.11 / $95 | 1.63 | +$4,556 | $371 | -$1,923 |
| | 2021-24 | 1.24 | 36 | 19.8% | 21% | 1.95R | -0.12 / -$78 | 0.70 | -$15,837 | -$409 | -$18,621 |
| **#2 nearest PDH/PDL** | H1 | 2.15 | 63 | 45.5% | 0% | 2.15R | 0.50 / $208 | 2.18 | +$11,425 | $1,874 | -$2,817 |
| | H2 | 1.86 | 44 | 37.9% | 0% | 1.90R | 0.12 / $13 | 1.07 | +$380 | $102 | -$2,244 |
| | 2025 | 1.03 | 28 | 41.5% | 0% | 2.01R | 0.46 / $211 | 2.20 | +$11,193 | $911 | -$2,433 |
| | 2021-24 | 0.96 | 26 | 31.2% | 0% | 1.93R | -0.04 / -$74 | 0.76 | -$11,561 | -$298 | -$19,341 |
| **#3** = #1 with the target at the draw itself | H1 | 2.03 | 59 | 42.3% | 21% | 2.22R | 0.63 / $325 | 3.90 | +$16,909 | $2,774 | -$1,222 |
| | H2 | 1.60 | 44 | 28.0% | 8% | 1.91R | 0.04 / $17 | 1.10 | +$432 | $116 | -$2,049 |
| | 2025 | 0.89 | 25 | 30.4% | 11% | 1.84R | 0.07 / $81 | 1.52 | +$3,716 | $302 | -$2,298 |
| | 2021-24 | 1.17 | 33 | 19.5% | 20% | 1.94R | -0.14 / -$87 | 0.67 | -$16,538 | -$427 | -$20,020 |
| **Pre-2025 re-pick** (weekly premium/discount) | 2021-24 | 2.06 | 69 | 32.4% | 0% | 1.98R | 0.02 / $17 | 1.05 | +$5,683 | $147 | -$14,862 |
| | 2025 | 1.65 | 55 | 42.4% | 0% | 2.02R | 0.33 / $198 | 1.96 | +$16,836 | $1,370 | -$1,635 |
| | H1 | 2.89 | 82 | 27.0% | 0% | 2.17R | -0.08 / -$42 | 0.85 | -$3,093 | -$507 | -$8,224 |
| | H2 | 2.76 | 75 | 25.6% | 0% | 2.13R | -0.07 / -$79 | 0.70 | -$3,390 | -$913 | -$4,915 |

The settings:
- **#1:** previous week's candle colour as the bias; targets on PD/PW/PM levels + gaps, the first one at 1.5R or more,
  banked at 3R; BE at 1R; LIT entry with loosened filters; killzones + 13:30-15:30; up to 2 a day.
- **#2:** nearer of PDH / PDL as the bias; targets on all pools incl. FVGs, banked at 3R; no BE; LIT entry with the live
  filters; 02:00-15:30; up to 2 a day.
- **Re-pick:** weekly premium / discount; target at the draw itself, banked at 3R; no BE; LIT entry, loosened; 1 a day.
- No variant reached 40% winners on 2021-24, so the bar for the re-pick was lowered to 30%.

## The MFFU eval path (two_week sizing, fresh eval every session)

2-week pass / fail (%) and the back-to-back eval path in $.

| | H1 2-wk | H2 2-wk | H1 1-mo | H2 1-mo | path H1 / H2 / 2025 / 2021-24 |
|---|---|---|---|---|---|
| LIT alone, 50K | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | +$34.2k / +$9.1k / -$7.2k / -$17.8k |
| #1 alone, 50K | 32.8 / 0.0 | **0.0 / 0.0** | 48.6 / 0.0 | 0.0 / 11.9 | +$19.0k / -$0.6k / +$0.5k / -$9.6k |
| #2 alone, 50K | 39.5 / 0.0 | 21.7 / 4.3 | 49.5 / 13.8 | 11.9 / 20.3 | +$19.8k / +$4.3k / +$7.8k / -$4.3k |
| LIT + #1 on one 50K (LIT first) | 52.9 / 10.1 | 44.9 / 14.5 | 67.9 / 15.6 | 42.4 / 28.8 | +$34.5k / +$6.0k / -$2.6k / -$16.2k |
| LIT + #2 on one 50K (LIT first) | 57.1 / 6.7 | 50.7 / 0.0 | 68.8 / 15.6 | 47.5 / 6.8 | +$36.5k / +$8.6k / +$0.3k / -$9.2k |
| #1 as account B, 25K (no-hedge) | 31.9 / 0.0 | 0.0 / 0.0 | 49.5 / 0.0 | 0.0 / 0.0 | +$8.9k / -$0.2k / +$1.8k / -$2.5k |
| #2 as account B, 25K (no-hedge) | 39.5 / 0.0 | 21.7 / 0.0 | 45.9 / 0.0 | 15.3 / 0.0 | +$7.1k / +$1.4k / +$4.9k / -$1.3k |
| (ATLAS on the 25K, `second-account-b.md`) | 68.9 / 0.0 | 43.5 / 0.0 | | | +$19.7k / +$5.4k |

Next to LIT, every pick takes eval passes away from LIT or adds fails. #2 is the least harmful: H1 the same pass with
slightly more fails, H2 50.7 vs 52.2. Its own trades lose money there (H2 8 trades, -$1.6k). On its own account it passes
too slowly, because a 2-3R target needs many winners to reach +$3,000.

## Why it is rejected (the checks)
1. **Almost nothing clears the bar, and the pick does not hold.**
   - Only 8 of 41,472 variants meet the H1 bar, and 0 meet it on 2021-24.
   - None of the 8 keeps 2 trades a week in H2: the bias halves the setups, and LIT has only ~1.7 candidates a day.
   - H1 win rates of 42-46% fall to 28-38% in H2 and to 20-31% in 2021-24.
2. **The ranking does not carry over.**
   - The Spearman correlation of expectancy, H1 vs H2, is 0.08 over the 24,909 variants with enough trades. H1 vs
     2021-24 is -0.01, and 2021-24 vs 2025 is 0.09.
   - 25% of the H1 qualifiers "hold" in H2 (positive and >= 40% win), against 15.6% of all variants. With 8 qualifiers
     that is 2 variants instead of the 1.2 chance gives.
3. **Placebos.**
   - In H1 the picks beat a coin-flip bias run through the same pipeline: p 0.01 for #1 and 0.04 for #2. That is just the
     selection: in H2 the p-values are 0.41-0.60, and in 2021-24 0.29-0.69.
   - With the direction shuffled at the same times, H1 p is 0.002-0.008, H2 0.38-0.46 and 2021-24 0.26-0.93.
   - Moved to random times with the same direction, H2 p is 0.11-0.25.
   - #2's 2025 result does beat its placebos (p 0.03 / 0.015 / 0.000), but 2021-24 does not.
4. **The money sits in a few trades.**
   - Drop the best 5 trades: #1's H2 goes from +$432 to -$3,832 and #2's from +$380 to -$3,700.
   - Over 2026 as a whole, #1 keeps +$7.4k and #2 +$2.8k. Their 2021-24 results are -$24.5k and -$18.7k.
   - Positive months over 5 years: #1 25 of 60, #2 31 of 60.
5. **No plateau.**
   - #1's neighbours: cap 2R loses in H2 and 2025, cap 5R wins only 23% in H2, 1 trade a day loses in H2, and LIT's full
     window loses in H2.
   - #2's neighbours: the bias swapped to the nearest pool of any kind gives H2 +$1.1k; cap 2R loses; loosened filters
     lose $3.9k in H2.
   - The only neighbour that is positive in every period is #2 with cap 5R (H1 +$17.2k, H2 +$5.4k, 2025 +$8.1k), and
     even it loses -$17.2k in 2021-24 at 25% wins.
6. **Entries.** The FVG-pullback limit and the market entry are worse than LIT's own chain almost everywhere: the market
   entry loses -$47k to -$64k over 2021-24.
7. **The pre-2025 re-pick fails too.** Picked on 2021-24 (+$5.7k), it makes +$16.8k in 2025, then loses in both 2026 halves
   (-$3.1k, -$3.4k).

## Verdict
- **Rejected.** A top-down HTF draw on liquidity, used as both the direction and the target, does not give NQ a
  high-probability edge.
- The owner's wish for 2+ trades a week, 40%+ true winners and 1.5R+ winners was met only in the half where the rules were
  picked.
- LIT stays the strategy. Its edge comes from the far target (the VIX band, winners average 3.7-5.3R). A near HTF target
  raises the win rate but kills the payoff, and on NQ the two do not combine into more money.
- Combined with LIT on the 50K or as a 25K account B, the candidates are worse than what is already built (LIT alone;
  ATLAS on the 25K).
- Don't redo this without a genuinely new direction signal. The same pools with other caps / BE / killzones are now mapped.

## Files
- `tools/hq_bias.py`: feats / lookahead / grid / pick / study / save.
- `research/hq/bias_grid.csv.gz`: every variant, every span.
- `research/hq/bias_picks.json`: picks + eval paths.
- `research/hq/bias_study.json`: multiple testing, look-ahead, plateau, placebos, months, drop-best-5.
- `research/hq/bias_pick1_trades.json`, `bias_pick2_trades.json`, `bias_pick3_trades.json` and
  `bias_repick_pre2025_trades.json`: trades in the common format.
- Runs: `hq_bias_pick1`, `hq_bias_pick2`, `hq_bias_pick3`, `hq_bias_repick_pre2025` (all rejected).
