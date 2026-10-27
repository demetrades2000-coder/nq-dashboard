## In one minute

- **The owner's question (2026-10-21):** "See if it would be good to implement very big retail strategies like EMAs /
  supply and demand / support and resistance. I've seen profitable traders use these. Even MACD. Implementing into LIT. We
  still should definitely find 3 entries a week whatever we do."
- **This part of the answer:** the retail tools as a **filter or a size change on the trades LIT already takes**. Using them
  to find **new** trades is a separate study.
- **What was tested:** 63 retail facts on every LIT trade (the 120 of 2026 and the 510 of 2021-25). Each fact says whether
  the tool agrees with the trade (WITH), disagrees (AGAINST) or says nothing:
  - **EMA** 9 / 21 / 50 / 200 on 5m, 15m and 1h: which side price is on, the slope, the 9 > 21 > 50 stack, price stretched
    2+ ATR on the wrong side of the EMA 21, and the 1-hour EMA 20 "falling knife".
  - **MACD** (12, 26, 9) on 5m, 15m and 1h: histogram sign, histogram turning, a signal-line cross in the last 6 bars, and
    the classic reversal sign: **divergence** between the sweep extreme and the swing before it.
  - **Support / resistance:** levels where 2+ swing highs or lows bunch up (15m swings of 5 days, 1h swings of 10 days),
    with the prior day and week highs and lows taken out because LIT trades those already; and round numbers (every 100 and
    50 points). Three questions: is the sweep at S/R, does S/R stand between entry and target, does S/R protect the stop?
  - **Supply / demand zones** on 15m and 1h (1-3 small "base" candles, then a big impulse candle): does the sweep run into a
    fresh zone or a tested one, and does a fresh opposing zone sit before the target?
- **4 rules per fact, 252 tests in all:** (a) skip the trade when the fact is AGAINST, (b) half size when AGAINST, (c) x1.25
  or x1.5 size when WITH. They respect the 40-micro max and, on the eval path, the live two_week caps.
- **No look-ahead.** Every fact uses only bars that had closed before the entry: a 5m bar counts once its close is at or
  before the entry time, and a 15m / 1h bar once its last minute has closed. Recomputing the facts on data cut at the entry
  gives the same answer for 30 of 30 trades (`tools/lit_retail_conf.py lookahead`).
- **The result:**
  - **Skipping never works.** Every skip filter takes LIT below 2.9 trades a week (to between 0.12 and 2.89 a week), and
    none of them makes more money in both halves. LIT has only 2.91 trades a week in 2026, so even one skipped trade breaks the
    owner's 3-a-week rule.
  - **Half size when a tool disagrees never works.** 0 of 63 make more money in both halves.
  - **Bigger size when an EMA agrees "works" on paper.** 23 rules pass every part of the test. All 23 are "x1.25 / x1.5
    when price is on the trend side of an EMA". But a control shows this is extra risk, not better trade picks (next
    section).
  - **MACD, S/R, round numbers and supply / demand: 0 of 128 tests pass.**
- **Verdict: nothing is adopted and nothing was built.** `live_model.json` / `live_model_lit.json` are unchanged.
  - One rule is worth logging on paper trades: x1.5 when price is on the trade's side of the 1-hour EMA 21. It is the only
    finalist whose WITH trades are better in H1, in H2 and in 2021-25. It is still not better than random up-sizing.

## Why the 23 "working" rules are not real

On a profitable strategy, making some trades bigger raises the total almost no matter which trades you pick. Four checks:

1. **The WITH trades are usually not the better trades.** For most of the 23 rules, the trades the EMA "agrees" with are
   worse than the others in Jul-Oct. One example is price above the 1h EMA 50 for a long: in Jul-Oct those trades average
   +0.25R and the rest +0.97R. The x1.5 rule still makes more money in Jul-Oct, only because +0.25R × 1.5 is still positive.
2. **Random up-sizing does as well.** For each finalist, the same x1.5 was given to the same number of trades picked at
   random, 200 times:
   - The random picks pass the same "works" test **11-28% of the time**.
   - In Jul-Oct, 16-83% of random picks gain as much on the LIT rule, and 19-53% gain as much on the eval path.
   - No finalist is better than random in Jul-Oct (`perm` in `research/lit/retail_conf.json`).
3. **Up-sizing everything is about as good.** Every trade x1.5 makes H1 +$49.8k and H2 +$13.5k on the LIT size rule, more
   than any EMA rule. It only misses the test because it adds eval fails (H2 2-week fails 0% to 5.8%).
4. **The selection test is below chance.** The real question is whether trades where the tool agrees are better than trades
   where it disagrees, in both halves:
   - That is true for **3 of the 63** facts.
   - With the facts shuffled across the trades it is true for **12.3** on average (6 to 18 in 20 rounds).
   - The reverse reading (AGAINST the retail tool is better) holds for 14, which is chance level.
   - So the retail tools tell nothing about which LIT trades win. LIT is a reversal strategy: it buys a swept low, which is
     usually on the "wrong" side of the short-term EMAs and MACD. The retail reading points the wrong way about as often as
     the right way.

The up-size rules also carry a price on the eval. For example, x1.5 when price is on the trade's side of the 1h EMA 21:

| Eval fails | Live | With the rule |
|---|---:|---:|
| Jan-Jun, within 2 weeks | 5.9% | 7.6% |
| Jan-Jun, within 1 month | 11.9% | 13.8% |
| Jul-Oct, within 1 month | 0% | 6.8% |

The 2021-25 reference line also gets worse (2-week fails 13.3% to 17.4%, max drawdown -$19.4k to -$21.0k).

## Top 5 (all "x1.5 when WITH" on an EMA), costs in

LIT size rule = the engine's own size ($800 up to a 20-pt stop, weekly stop). Eval path = the live two_week sizing, on fresh
evals started on every session of the half (2-week and 1-month pass / fail) and on the back-to-back eval path ($ net / PF /
DD).

| Rule | Half | Trades/wk (wks 2+) | Win % | PF | Net $ | $/month | Max DD | Eval path net $ | Eval 2-wk pass / fail | Eval 1-mo pass / fail |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live LIT** (lit_live / lit_adopt_t15_be_off_eval) | H1 | 3.12 (85%) | 58.8 | 4.98 | +33,891 | 5,560 | -2,196 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 |
| | H2 | 2.56 (81%) | 47.5 | 2.69 | +9,493 | 2,556 | -1,396 | +9,059 | 52.2 / 0.0 | 50.8 / 0.0 |
| 1. Price on the trade's side of the **1h EMA 21** | H1 | 3.12 (85%) | 58.8 | 5.55 | +42,695 | 7,005 | -2,365 | +43,327 | 63.9 / 7.6 | 79.8 / 13.8 |
| | H2 | 2.56 (81%) | 47.5 | 2.84 | +11,539 | 3,107 | -1,826 | +10,383 | 52.2 / 0.0 | 50.8 / 6.8 |
| 2. Price on the trade's side of the **15m EMA 200** | H1 | 3.12 (85%) | 58.8 | 5.58 | +44,411 | 7,286 | -2,435 | +51,203 | 63.0 / 7.6 | 78.9 / 14.7 |
| | H2 | 2.56 (81%) | 47.5 | 2.51 | +10,333 | 2,782 | -1,918 | +10,383 | 52.2 / 0.0 | 50.8 / 6.8 |
| 3. **1h EMA 50** sloping the trade's way | H1 | 3.12 (85%) | 58.8 | 5.60 | +44,617 | 7,320 | -2,435 | +51,203 | 63.0 / 7.6 | 78.9 / 14.7 |
| | H2 | 2.56 (81%) | 47.5 | 2.47 | +10,091 | 2,717 | -1,918 | +10,383 | 52.2 / 0.0 | 50.8 / 6.8 |
| 4. **5m EMA 200** sloping the trade's way | H1 | 3.12 (85%) | 58.8 | 5.32 | +40,868 | 6,705 | -2,435 | +42,170 | 63.9 / 7.6 | 79.8 / 13.8 |
| | H2 | 2.56 (81%) | 47.5 | 2.76 | +11,362 | 3,059 | -1,826 | +10,383 | 52.2 / 0.0 | 50.8 / 6.8 |
| 5. **5m EMA 50** sloping the trade's way | H1 | 3.12 (85%) | 58.8 | 5.00 | +37,253 | 6,112 | -2,365 | +43,429 | 63.0 / 7.6 | 78.0 / 14.7 |
| | H2 | 2.56 (81%) | 47.5 | 2.75 | +10,416 | 2,804 | -1,509 | +9,233 | 52.2 / 0.0 | 50.8 / 3.4 |
| Control: **every trade x1.5** | H1 | 3.12 | | | +49,812 | | | +43,889 | 63.0 / 8.4 | |
| | H2 | 2.56 | | | +13,502 | | | +9,766 | 50.7 / 5.8 | |

The 2021-25 reference (LIT size rule, 5m entries) for the five rules: +$4,889 / +$3,827 / +$5,964 / +$3,077 / +$5,465, against
+$1,211 live. That is $60-117 a month, with a deeper drawdown (-$20.0k to -$22.2k against -$19.4k).

Random-pick check (200 rounds each; p = share of random picks of the same number of trades that gain at least as much):

| Rule | Gain LIT H1 / H2 | p LIT H1 / H2 | Gain eval H1 / H2 | p eval H1 / H2 | Random picks that pass the test |
|---|---:|---:|---:|---:|---:|
| 1h EMA 21 side x1.5 | +8,804 / +2,046 | 0.09 / 0.21 | +9,093 / +1,324 | 0.27 / 0.30 | 27.5% |
| 1h EMA 21 side x1.25 | +3,921 / +657 | 0.08 / 0.16 | +2,951 / +505 | 0.46 / 0.19 | 11.5% |
| 5m EMA 50 slope x1.5 | +3,362 / +923 | 0.50 / 0.47 | +9,195 / +174 | 0.21 / 0.53 | 28.0% |
| 15m EMA 200 side x1.5 | +10,520 / +840 | 0.09 / 0.73 | +16,969 / +1,324 | 0.01 / 0.33 | 20.5% |
| 1h EMA 50 slope x1.5 | +10,726 / +598 | 0.08 / 0.83 | +16,969 / +1,324 | 0.02 / 0.33 | 19.5% |
| 5m EMA 200 slope x1.5 | +6,977 / +1,869 | 0.30 / 0.29 | +7,936 / +1,324 | 0.43 / 0.32 | 25.0% |

The 15m EMA 200 and the 1h EMA 50 beat random in Jan-Jun (the half they were picked on, p 0.01-0.02). In Jul-Oct they do
not (p 0.33-0.83).

## Counting the tests honestly

| | Real | Shuffled facts (20 rounds) |
|---|---:|---:|
| Tests run | 252 (63 facts × 4 rules) + 2 controls + 3 size-neutral tilts + 6 random-pick checks | |
| Pass every part of the test (LIT net up H1 and H2, eval net up H1 and H2, eval 2-week pass minus fail not lower, 2.9+/wk) | **23** (all EMA up-sizes) | 15.6 on average (11-22) |
| Raise LIT net in both halves | 80 | 96.1 (87-102) |
| WITH trades beat AGAINST trades in both halves (5+ each side) | **3** of 63 | 12.3 (6-18) |

- **The pass count, 23, is above the shuffles.** But all 23 come from one family of near-identical facts. "Price above the
  1h EMA 50", "above the 15m EMA 200" and "1h EMA 50 rising" mark almost the same trades and give the same eval numbers, so
  it is one or two findings, not 23.
- **Each of those findings fails the random-pick check in Jul-Oct.**
- **The two counts that measure picking better trades are both below chance:** 80 against 96 and 3 against 12.

## By tool

| Tool | Tests | Pass | Raise LIT net both halves | What it says about LIT trades |
|---|---:|---:|---:|---|
| EMA (31 facts) | 124 | 23 (all up-size WITH) | 47 (all up-sizes) | LIT trades fight the short-term trend and do better that way: against the 5m EMA 9, +1.79R / +1.20R in H1 / H2 (with it +0.42R / +0.43R) |
| MACD (13) | 52 | 0 | 13 (up-sizes) | Divergence at the sweep looks good in Jan-Jun (+1.03R vs +0.79R on 5m) and flips in Jul-Oct (+0.51R vs +0.76R) |
| Support / resistance (8) | 32 | 0 | 8 | A 1h S/R level at the sweep: no edge (H1 +0.71R vs +0.90R, H2 +0.77R vs +0.70R) |
| Round numbers (5) | 20 | 0 | 8 | Sweep at a 100: +2.20R in H1 (17 trades), +0.91R in H2 (8), -0.04R in 2021-25: one lucky half |
| Supply / demand (6) | 24 | 0 | 4 | Only 5-15 of the 120 trades sweep into a 15m / 1h zone. Too rare to size and not better in Jan-Jun |

## What is genuinely new here (and what was done before)

- **`moving-averages.md` (old engine, 2026-10-17):** trend filters cost money there, and "falling knife" half size helped
  2021-25. **New:** on LIT the falling knife (3+ hourly ATRs on the wrong side of the 1h EMA 20) hits only 4 of 120 trades
  in 2026. Half size on them changes Jan-Jun by $0 and Jul-Oct by +$177. Over 2021-25 the knife trades are LIT's *better*
  trades (+0.45R, 16 trades), so the old engine's rule does not carry over (2021-25 +$1,211 to +$524).
- **`lit-htf-confluences.md` (2026-10-18):** 4H / 1H EMA trend and the HTF draw on LIT, at chance level. **New:** the 5m and
  15m EMAs, EMA slopes, stacks and stretch, the whole MACD family (never tested on LIT before), S/R from swing clusters and
  round numbers, and supply / demand zones. Also new: up-sizing on the live **two_week** eval path, and the random up-size
  control. That control shows any "bigger when X" rule on LIT looks good unless it is compared with random picks.
- **`lit-order-blocks.md`:** order blocks overlap with supply / demand (both mark where an impulse started). That study found
  10-25 trades sweeping into a fresh HTF block. Here 5-15 of 120 sweep into a fresh or tested 15m / 1h zone, with the same
  answer: too rare, and not better in Jan-Jun.
- **`lit-trade-intel.md`:** 8 of 50 facts were consistent against 13.4 by chance. The retail facts add the same picture: no
  entry fact sorts LIT winners from losers better than chance.

## About 3 trades a week

- None of these tools can add trades when it is used as a filter or a size. LIT stays at 2.91 a week in 2026 (H1 3.12, H2
  2.56; 86% of weeks with 2+).
- Every skip filter lowers that.
- More trades can only come from new entries (the separate retail-entries study) or from the earlier LIT studies of new
  setups.

## Every test

LIT size rule net $ by half, 2021-25 reference, and the eval path (two_week sizing) net $ and 2-week pass / fail %. "yes*" =
passes the letter of the test; see "Why the 23 working rules are not real". Every row is stored as run
`lit_retail_c_<fact>_<rule>` (the eval-path runs `..._eval` for the 23 + the top 6).

Fact names: `ema_<tf>_<p>_side` price on the trade's side of the EMA; `_slope` EMA rising (long) / falling (short) vs 3 bars
ago; `_stack` 9 > 21 > 50 the trade's way (WITH) / the other way (AGAINST); `_21_stretch2` 2+ ATR on the wrong side of the
EMA 21 (AGAINST); `ema_1h_20_knife3` 3+ ATR wrong side of the 1h EMA 20 (AGAINST). `macd_<tf>_hist` histogram on the trade's
side; `_turn` histogram turning the trade's way; `_cross6` MACD crossed the signal the trade's way in the last 6 bars (WITH),
is on the other side (AGAINST); `_div_line` / `_div_hist` regular divergence at the sweep extreme vs the prior swing (MACD line /
histogram). `sr_<tf>_sweep` sweep extreme at an S/R cluster; `_path` an opposing level between entry + 0.5R and the target
(AGAINST); `_path2r` the same within 2R; `_stop` a level between stop and entry (WITH). `rn_<step>_sweep` sweep within 10 / 5 pts
of a round 100 / 50; `rn_<step>_stop` a round number between stop and entry; `rn_100_path2r` a round 100 between entry + 0.5R
and 2R (AGAINST). `sd_<tf>_fresh_sweep` / `_any_sweep` the sweep extreme inside a fresh / any unbroken demand (long) or supply
(short) zone; `sd_<tf>_path` a fresh opposing zone between entry and target (AGAINST).

| Test | Rule | 2026 trades/wk | LIT H1 net | LIT H2 net | 2021-25 net | Eval H1 net | Eval H1 2-wk pass/fail | Eval H2 net | Eval H2 2-wk pass/fail | Works |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:-:|
| **live LIT (lit_live)** | - | 2.91 | +33,891 | +9,493 | +1,211 | +34,234 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 | |
| ema_5m_9_side | skip AGAINST | 1.94 | +7,317 | +2,329 | +296 | +4,310 | 39.5 / 2.5 | +1,440 | 29.0 / 0.0 |  |
| ema_5m_9_side | half size AGAINST | 2.91 | +20,026 | +5,820 | +834 | +19,860 | 40.3 / 0.0 | +5,239 | 42.0 / 0.0 |  |
| ema_5m_9_side | x1.25 WITH | 2.91 | +34,811 | +9,244 | +1,669 | +43,416 | 57.1 / 7.6 | +7,739 | 50.7 / 4.3 |  |
| ema_5m_9_side | x1.5 WITH | 2.91 | +36,873 | +10,603 | +2,685 | +37,820 | 57.1 / 8.4 | +10,663 | 50.7 / 4.3 |  |
| ema_5m_9_slope | skip AGAINST | 1.99 | +17,187 | +6,591 | -4,010 | +22,897 | 40.3 / 1.7 | +8,956 | 39.1 / 0.0 |  |
| ema_5m_9_slope | half size AGAINST | 2.91 | +25,183 | +7,473 | -1,317 | +21,173 | 41.2 / 1.7 | +9,053 | 52.2 / 0.0 |  |
| ema_5m_9_slope | x1.25 WITH | 2.91 | +37,230 | +9,786 | +976 | +44,382 | 59.7 / 8.4 | +9,526 | 50.7 / 0.0 |  |
| ema_5m_9_slope | x1.5 WITH | 2.91 | +41,585 | +12,276 | +756 | +39,894 | 63.0 / 8.4 | +11,854 | 50.7 / 0.0 |  |
| ema_5m_21_side | skip AGAINST | 1.48 | +336 | +3,105 | +3,521 | +1,475 | 31.1 / 0.0 | +1,931 | 30.4 / 0.0 |  |
| ema_5m_21_side | half size AGAINST | 2.91 | +16,649 | +6,256 | +2,853 | +19,701 | 31.1 / 0.0 | +6,374 | 47.8 / 0.0 |  |
| ema_5m_21_side | x1.25 WITH | 2.91 | +33,113 | +9,453 | +2,286 | +41,941 | 57.1 / 6.7 | +7,905 | 50.7 / 4.3 |  |
| ema_5m_21_side | x1.5 WITH | 2.91 | +33,221 | +10,946 | +3,515 | +43,654 | 57.1 / 8.4 | +8,474 | 50.7 / 4.3 |  |
| ema_5m_21_slope | skip AGAINST | 1.17 | +7,857 | +25 | +899 | +8,933 | 24.4 / 0.0 | -492 | 14.5 / 0.0 |  |
| ema_5m_21_slope | half size AGAINST | 2.91 | +21,046 | +4,096 | +1,581 | +21,745 | 22.7 / 0.0 | +3,098 | 26.1 / 0.0 |  |
| ema_5m_21_slope | x1.25 WITH | 2.91 | +34,769 | +9,247 | +1,630 | +41,727 | 59.7 / 7.6 | +8,988 | 50.7 / 0.0 |  |
| ema_5m_21_slope | x1.5 WITH | 2.91 | +37,186 | +9,445 | +2,065 | +43,139 | 63.0 / 6.7 | +9,233 | 50.7 / 0.0 |  |
| ema_5m_50_side | skip AGAINST | 0.87 | +1,515 | +2,252 | +9,007 | +1,780 | 16.8 / 0.0 | +2,100 | 31.9 / 0.0 |  |
| ema_5m_50_side | half size AGAINST | 2.91 | +17,651 | +5,508 | +5,899 | +18,281 | 17.6 / 0.0 | +7,418 | 49.3 / 0.0 |  |
| ema_5m_50_side | x1.25 WITH | 2.91 | +33,530 | +9,466 | +3,074 | +40,850 | 57.1 / 8.4 | +8,951 | 52.2 / 0.0 |  |
| ema_5m_50_side | x1.5 WITH | 2.91 | +34,180 | +10,199 | +5,969 | +42,321 | 57.1 / 7.6 | +9,472 | 52.2 / 0.0 |  |
| ema_5m_50_slope | skip AGAINST | 0.73 | +7,759 | +2,337 | +7,873 | +11,281 | 22.7 / 0.0 | +2,198 | 24.6 / 0.0 |  |
| ema_5m_50_slope | half size AGAINST | 2.91 | +20,821 | +5,376 | +5,490 | +14,182 | 23.5 / 0.0 | +6,438 | 36.2 / 0.0 |  |
| ema_5m_50_slope | x1.25 WITH | 2.91 | +34,965 | +9,732 | +2,391 | +41,827 | 59.7 / 8.4 | +8,988 | 52.2 / 0.0 |  |
| ema_5m_50_slope | x1.5 WITH | 2.91 | +37,253 | +10,416 | +5,465 | +43,429 | 63.0 / 7.6 | +9,233 | 52.2 / 0.0 | yes* |
| ema_5m_200_side | skip AGAINST | 0.95 | +9,726 | +3,584 | +1,644 | +10,042 | 30.3 / 0.0 | -1,578 | 20.3 / 0.0 |  |
| ema_5m_200_side | half size AGAINST | 2.91 | +21,675 | +6,576 | +1,839 | +23,205 | 30.3 / 0.0 | +5,767 | 31.9 / 0.0 |  |
| ema_5m_200_side | x1.25 WITH | 2.91 | +35,367 | +10,079 | +961 | +35,158 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_5m_200_side | x1.5 WITH | 2.91 | +38,137 | +11,328 | +2,409 | +39,397 | 63.9 / 7.6 | +10,312 | 52.2 / 0.0 | yes* |
| ema_5m_200_slope | skip AGAINST | 0.92 | +15,463 | +4,233 | +3,863 | +16,926 | 38.7 / 0.0 | +4,350 | 21.7 / 0.0 |  |
| ema_5m_200_slope | half size AGAINST | 2.91 | +24,681 | +6,610 | +2,678 | +26,254 | 38.7 / 0.0 | +7,616 | 33.3 / 0.0 |  |
| ema_5m_200_slope | x1.25 WITH | 2.91 | +36,749 | +10,061 | +1,419 | +36,583 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_5m_200_slope | x1.5 WITH | 2.91 | +40,868 | +11,362 | +3,077 | +42,170 | 63.9 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_5m_stack | skip AGAINST | 1.0 | +6,634 | +833 | -3,881 | +4,912 | 22.7 / 0.0 | +985 | 20.3 / 0.0 |  |
| ema_5m_stack | half size AGAINST | 2.91 | +20,234 | +4,670 | -742 | +20,504 | 23.5 / 0.0 | +6,540 | 31.9 / 0.0 |  |
| ema_5m_stack | x1.25 WITH | 2.91 | +34,394 | +9,493 | -285 | +33,424 | 59.7 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| ema_5m_stack | x1.5 WITH | 2.91 | +34,897 | +9,879 | -1,130 | +33,424 | 63.9 / 5.9 | +9,444 | 52.2 / 0.0 |  |
| ema_5m_21_stretch2 | skip AGAINST | 2.89 | +33,891 | +6,941 | +1,205 | +34,234 | 57.1 / 5.9 | +3,979 | 52.2 / 0.0 |  |
| ema_5m_21_stretch2 | half size AGAINST | 2.91 | +33,891 | +8,035 | +1,208 | +34,234 | 57.1 / 5.9 | +7,967 | 52.2 / 0.0 |  |
| ema_5m_21_stretch2 | x1.25 WITH | 2.91 | +40,769 | +9,932 | +1,673 | +49,062 | 59.7 / 8.4 | +8,290 | 50.7 / 4.3 |  |
| ema_5m_21_stretch2 | x1.5 WITH | 2.91 | +49,812 | +12,408 | +2,876 | +43,889 | 63.0 / 8.4 | +9,766 | 50.7 / 5.8 |  |
| ema_15m_9_side | skip AGAINST | 1.0 | +6,920 | -474 | -1,595 | +3,104 | 27.7 / 0.0 | -616 | 0.0 / 0.0 |  |
| ema_15m_9_side | half size AGAINST | 2.91 | +20,312 | +3,775 | +220 | +19,185 | 27.7 / 0.0 | +3,106 | 14.5 / 0.0 |  |
| ema_15m_9_side | x1.25 WITH | 2.91 | +34,933 | +9,298 | +633 | +42,221 | 57.1 / 7.6 | +8,951 | 50.7 / 0.0 |  |
| ema_15m_9_side | x1.5 WITH | 2.91 | +36,981 | +9,161 | +470 | +44,754 | 57.1 / 6.7 | +8,772 | 50.7 / 0.0 |  |
| ema_15m_9_slope | skip AGAINST | 0.46 | +13,132 | +618 | -875 | +16,175 | 22.7 / 0.0 | +482 | 15.9 / 0.0 |  |
| ema_15m_9_slope | half size AGAINST | 2.91 | +23,458 | +4,150 | +640 | +23,119 | 22.7 / 0.0 | +3,483 | 15.9 / 0.0 |  |
| ema_15m_9_slope | x1.25 WITH | 2.91 | +36,589 | +9,427 | +712 | +36,924 | 59.7 / 5.9 | +8,991 | 52.2 / 0.0 |  |
| ema_15m_9_slope | x1.5 WITH | 2.91 | +39,833 | +9,566 | +350 | +40,780 | 63.9 / 5.9 | +9,242 | 52.2 / 0.0 | yes* |
| ema_15m_21_side | skip AGAINST | 0.7 | +5,738 | +1,567 | +3,849 | +10,107 | 22.7 / 0.0 | -371 | 24.6 / 0.0 |  |
| ema_15m_21_side | half size AGAINST | 2.91 | +19,766 | +5,058 | +3,082 | +15,719 | 23.5 / 0.0 | +6,853 | 36.2 / 0.0 |  |
| ema_15m_21_side | x1.25 WITH | 2.91 | +34,317 | +9,573 | +1,660 | +34,518 | 57.1 / 8.4 | +8,988 | 52.2 / 0.0 |  |
| ema_15m_21_side | x1.5 WITH | 2.91 | +36,132 | +10,098 | +3,066 | +36,144 | 57.1 / 7.6 | +9,233 | 52.2 / 0.0 |  |
| ema_15m_21_slope | skip AGAINST | 0.51 | +895 | +1,021 | +437 | +1,670 | 0.0 / 0.0 | +875 | 24.6 / 0.0 |  |
| ema_15m_21_slope | half size AGAINST | 2.91 | +17,626 | +4,718 | +1,163 | +17,504 | 2.5 / 0.0 | +3,429 | 24.6 / 0.0 |  |
| ema_15m_21_slope | x1.25 WITH | 2.91 | +34,050 | +9,503 | +744 | +33,234 | 59.7 / 8.4 | +8,988 | 52.2 / 0.0 |  |
| ema_15m_21_slope | x1.5 WITH | 2.91 | +34,414 | +9,758 | +1,182 | +32,790 | 63.9 / 7.6 | +9,162 | 52.2 / 0.0 |  |
| ema_15m_50_side | skip AGAINST | 0.8 | +6,661 | +1,567 | +4,629 | +7,639 | 30.3 / 0.0 | -371 | 24.6 / 0.0 |  |
| ema_15m_50_side | half size AGAINST | 2.91 | +20,017 | +5,058 | +3,158 | +17,742 | 30.3 / 0.0 | +6,853 | 36.2 / 0.0 |  |
| ema_15m_50_side | x1.25 WITH | 2.91 | +34,862 | +9,573 | +1,408 | +35,203 | 57.1 / 8.4 | +8,988 | 52.2 / 0.0 |  |
| ema_15m_50_side | x1.5 WITH | 2.91 | +36,804 | +10,098 | +3,289 | +39,487 | 57.1 / 7.6 | +9,233 | 52.2 / 0.0 |  |
| ema_15m_50_slope | skip AGAINST | 0.73 | +12,346 | +1,015 | -3,059 | +13,817 | 33.6 / 0.0 | -1,262 | 24.6 / 0.0 |  |
| ema_15m_50_slope | half size AGAINST | 2.91 | +22,938 | +4,783 | -954 | +24,209 | 33.6 / 0.0 | +6,540 | 36.2 / 0.0 |  |
| ema_15m_50_slope | x1.25 WITH | 2.91 | +36,212 | +9,415 | +230 | +36,466 | 59.7 / 8.4 | +8,988 | 52.2 / 0.0 |  |
| ema_15m_50_slope | x1.5 WITH | 2.91 | +39,495 | +9,823 | -249 | +39,916 | 63.9 / 7.6 | +9,162 | 52.2 / 0.0 | yes* |
| ema_15m_200_side | skip AGAINST | 1.09 | +22,097 | +1,939 | +5,203 | +24,384 | 42.9 / 0.0 | -129 | 15.9 / 0.0 |  |
| ema_15m_200_side | half size AGAINST | 2.91 | +27,606 | +5,181 | +3,814 | +25,683 | 42.0 / 0.0 | +6,609 | 27.5 / 0.0 |  |
| ema_15m_200_side | x1.25 WITH | 2.91 | +38,677 | +9,629 | +2,033 | +44,365 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_15m_200_side | x1.5 WITH | 2.91 | +44,411 | +10,333 | +3,827 | +51,203 | 63.0 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_15m_200_slope | skip AGAINST | 1.02 | +21,476 | +1,731 | +7,111 | +22,910 | 42.9 / 0.0 | -118 | 15.9 / 0.0 |  |
| ema_15m_200_slope | half size AGAINST | 2.91 | +27,361 | +5,123 | +4,596 | +25,506 | 42.0 / 0.0 | +6,621 | 15.9 / 0.0 |  |
| ema_15m_200_slope | x1.25 WITH | 2.91 | +38,709 | +9,629 | +2,284 | +44,365 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_15m_200_slope | x1.5 WITH | 2.91 | +44,167 | +10,183 | +4,684 | +50,894 | 63.9 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_15m_stack | skip AGAINST | 1.17 | +13,683 | +5,007 | +3,046 | +14,613 | 38.7 / 0.0 | +2,905 | 36.2 / 0.0 |  |
| ema_15m_stack | half size AGAINST | 2.91 | +23,806 | +7,143 | +2,245 | +20,723 | 38.7 / 0.0 | +7,246 | 36.2 / 0.0 |  |
| ema_15m_stack | x1.25 WITH | 2.91 | +33,547 | +9,547 | +1,237 | +33,234 | 57.1 / 8.4 | +9,032 | 52.2 / 0.0 |  |
| ema_15m_stack | x1.5 WITH | 2.91 | +33,719 | +10,088 | +2,009 | +33,098 | 57.1 / 7.6 | +9,248 | 52.2 / 0.0 |  |
| ema_15m_21_stretch2 | skip AGAINST | 2.74 | +28,963 | +6,924 | -9,747 | +29,457 | 57.1 / 4.2 | +3,979 | 52.2 / 0.0 |  |
| ema_15m_21_stretch2 | half size AGAINST | 2.91 | +31,428 | +8,027 | -3,862 | +31,260 | 57.1 / 5.9 | +7,966 | 52.2 / 0.0 |  |
| ema_15m_21_stretch2 | x1.25 WITH | 2.91 | +39,580 | +9,928 | -723 | +49,276 | 59.7 / 8.4 | +8,290 | 50.7 / 4.3 |  |
| ema_15m_21_stretch2 | x1.5 WITH | 2.91 | +47,348 | +12,400 | -2,153 | +45,708 | 63.0 / 8.4 | +9,766 | 50.7 / 5.8 |  |
| ema_1h_9_side | skip AGAINST | 0.51 | -889 | +1,321 | +969 | +539 | 0.0 / 0.0 | -710 | 24.6 / 0.0 |  |
| ema_1h_9_side | half size AGAINST | 2.91 | +16,622 | +4,935 | +865 | +14,386 | 2.5 / 0.0 | +6,706 | 36.2 / 0.0 |  |
| ema_1h_9_side | x1.25 WITH | 2.91 | +33,547 | +9,547 | +1,076 | +33,234 | 57.1 / 8.4 | +9,032 | 52.2 / 0.0 |  |
| ema_1h_9_side | x1.5 WITH | 2.91 | +33,410 | +9,975 | +1,141 | +33,028 | 57.1 / 7.6 | +9,248 | 52.2 / 0.0 |  |
| ema_1h_9_slope | skip AGAINST | 0.78 | +3,881 | +3,006 | -3,232 | +3,703 | 16.8 / 0.0 | +1,985 | 39.1 / 0.0 |  |
| ema_1h_9_slope | half size AGAINST | 2.91 | +19,134 | +5,924 | -1,623 | +17,165 | 20.2 / 0.0 | +6,788 | 39.1 / 0.0 |  |
| ema_1h_9_slope | x1.25 WITH | 2.91 | +34,420 | +9,839 | -79 | +34,532 | 57.1 / 8.4 | +9,032 | 52.2 / 0.0 |  |
| ema_1h_9_slope | x1.5 WITH | 2.91 | +35,921 | +10,672 | -481 | +35,786 | 57.1 / 7.6 | +9,248 | 52.2 / 0.0 |  |
| ema_1h_21_side | skip AGAINST | 0.85 | +18,900 | +4,586 | +8,317 | +17,173 | 42.0 / 0.0 | +897 | 21.7 / 0.0 |  |
| ema_1h_21_side | half size AGAINST | 2.91 | +26,139 | +6,787 | +4,757 | +23,932 | 42.0 / 0.0 | +7,716 | 33.3 / 0.0 |  |
| ema_1h_21_side | x1.25 WITH | 2.91 | +37,812 | +10,150 | +2,524 | +37,185 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_1h_21_side | x1.5 WITH | 2.91 | +42,695 | +11,539 | +4,889 | +43,327 | 63.9 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_1h_21_slope | skip AGAINST | 1.0 | +18,531 | +3,969 | +3,755 | +16,601 | 42.0 / 0.0 | +4,079 | 21.7 / 0.0 |  |
| ema_1h_21_slope | half size AGAINST | 2.91 | +25,955 | +6,478 | +2,742 | +23,856 | 42.0 / 0.0 | +7,437 | 33.3 / 0.0 |  |
| ema_1h_21_slope | x1.25 WITH | 2.91 | +37,755 | +10,032 | +1,468 | +37,616 | 59.7 / 8.4 | +9,607 | 52.2 / 0.0 | yes* |
| ema_1h_21_slope | x1.5 WITH | 2.91 | +42,510 | +11,230 | +2,914 | +43,758 | 63.9 / 7.6 | +10,469 | 52.2 / 0.0 | yes* |
| ema_1h_50_side | skip AGAINST | 1.04 | +22,095 | +1,731 | +6,085 | +22,853 | 42.9 / 0.0 | -118 | 15.9 / 0.0 |  |
| ema_1h_50_side | half size AGAINST | 2.91 | +27,774 | +5,123 | +3,973 | +25,678 | 42.0 / 0.0 | +6,621 | 15.9 / 0.0 |  |
| ema_1h_50_side | x1.25 WITH | 2.91 | +38,709 | +9,629 | +2,214 | +44,365 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_1h_50_side | x1.5 WITH | 2.91 | +44,373 | +10,183 | +3,987 | +50,894 | 63.9 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_1h_50_slope | skip AGAINST | 1.14 | +22,717 | +1,350 | +9,353 | +24,327 | 42.9 / 0.0 | -3,007 | 15.9 / 0.0 |  |
| ema_1h_50_slope | half size AGAINST | 2.91 | +28,019 | +4,939 | +5,701 | +25,855 | 42.0 / 0.0 | +6,514 | 15.9 / 0.0 |  |
| ema_1h_50_slope | x1.25 WITH | 2.91 | +38,677 | +9,629 | +3,029 | +44,365 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_1h_50_slope | x1.5 WITH | 2.91 | +44,617 | +10,091 | +5,964 | +51,203 | 63.0 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_1h_200_side | skip AGAINST | 1.31 | +19,196 | +2,447 | +11,828 | +17,683 | 37.8 / 0.0 | +5,760 | 10.1 / 0.0 |  |
| ema_1h_200_side | half size AGAINST | 2.91 | +26,154 | +5,391 | +6,930 | +25,855 | 37.0 / 0.0 | +6,714 | 27.5 / 0.0 |  |
| ema_1h_200_side | x1.25 WITH | 2.91 | +38,031 | +9,699 | +4,093 | +43,789 | 59.7 / 9.2 | +9,634 | 52.2 / 0.0 |  |
| ema_1h_200_side | x1.5 WITH | 2.91 | +42,954 | +10,543 | +7,210 | +49,881 | 63.0 / 8.4 | +10,882 | 52.2 / 0.0 | yes* |
| ema_1h_200_slope | skip AGAINST | 1.38 | +19,097 | +2,447 | +11,247 | +17,377 | 37.8 / 0.0 | +5,760 | 10.1 / 0.0 |  |
| ema_1h_200_slope | half size AGAINST | 2.91 | +26,155 | +5,391 | +6,588 | +26,581 | 37.0 / 0.0 | +6,714 | 27.5 / 0.0 |  |
| ema_1h_200_slope | x1.25 WITH | 2.91 | +38,031 | +9,699 | +3,862 | +43,789 | 59.7 / 9.2 | +9,634 | 52.2 / 0.0 |  |
| ema_1h_200_slope | x1.5 WITH | 2.91 | +42,955 | +10,543 | +6,810 | +49,881 | 63.0 / 8.4 | +10,882 | 52.2 / 0.0 | yes* |
| ema_1h_stack | skip AGAINST | 1.53 | +21,851 | +4,527 | +4,592 | +21,237 | 42.9 / 0.0 | +6,417 | 24.6 / 0.0 |  |
| ema_1h_stack | half size AGAINST | 2.91 | +27,656 | +6,668 | +3,486 | +28,073 | 42.0 / 0.0 | +7,745 | 42.0 / 0.0 |  |
| ema_1h_stack | x1.25 WITH | 2.91 | +37,748 | +9,629 | -161 | +43,887 | 59.7 / 8.4 | +9,564 | 52.2 / 0.0 | yes* |
| ema_1h_stack | x1.5 WITH | 2.91 | +42,246 | +10,183 | -966 | +49,459 | 63.9 / 7.6 | +10,383 | 52.2 / 0.0 | yes* |
| ema_1h_21_stretch2 | skip AGAINST | 2.55 | +30,516 | +7,100 | -3,743 | +24,216 | 47.9 / 1.7 | +3,588 | 50.7 / 0.0 |  |
| ema_1h_21_stretch2 | half size AGAINST | 2.91 | +32,528 | +8,212 | -943 | +29,021 | 47.9 / 5.9 | +7,967 | 52.2 / 0.0 |  |
| ema_1h_21_stretch2 | x1.25 WITH | 2.91 | +40,236 | +10,020 | +422 | +47,430 | 59.7 / 8.4 | +8,456 | 52.2 / 4.3 |  |
| ema_1h_21_stretch2 | x1.5 WITH | 2.91 | +48,653 | +12,585 | +597 | +45,722 | 63.0 / 8.4 | +10,107 | 52.2 / 5.8 |  |
| ema_1h_20_knife3 | skip AGAINST | 2.82 | +33,888 | +10,011 | -426 | +34,234 | 57.1 / 5.9 | +9,677 | 52.2 / 0.0 |  |
| ema_1h_20_knife3 | half size AGAINST | 2.91 | +33,890 | +9,670 | +524 | +34,234 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| ema_1h_20_knife3 | x1.25 WITH | 2.91 | +40,769 | +10,385 | +1,388 | +49,062 | 59.7 / 8.4 | +8,820 | 52.2 / 4.3 |  |
| ema_1h_20_knife3 | x1.5 WITH | 2.91 | +49,810 | +13,679 | +2,192 | +43,888 | 63.0 / 8.4 | +7,632 | 52.2 / 5.8 |  |
| macd_5m_hist | skip AGAINST | 2.21 | +16,601 | +7,082 | +94 | +22,675 | 45.4 / 3.4 | +9,425 | 53.6 / 0.0 |  |
| macd_5m_hist | half size AGAINST | 2.91 | +24,759 | +7,914 | +744 | +21,467 | 46.2 / 2.5 | +6,416 | 55.1 / 0.0 |  |
| macd_5m_hist | x1.25 WITH | 2.91 | +37,318 | +9,928 | +1,488 | +44,867 | 59.7 / 7.6 | +8,318 | 50.7 / 4.3 |  |
| macd_5m_hist | x1.5 WITH | 2.91 | +41,420 | +12,491 | +2,293 | +39,071 | 63.0 / 8.4 | +9,894 | 50.7 / 5.8 |  |
| macd_5m_turn | skip AGAINST | 2.04 | +15,089 | +6,355 | +3,759 | +21,199 | 47.9 / 4.2 | +3,308 | 53.6 / 0.0 |  |
| macd_5m_turn | half size AGAINST | 2.91 | +23,899 | +8,102 | +2,593 | +22,705 | 48.7 / 3.4 | +12,791 | 52.2 / 0.0 |  |
| macd_5m_turn | x1.25 WITH | 2.91 | +36,694 | +9,959 | +2,227 | +44,721 | 57.1 / 8.4 | +8,147 | 52.2 / 4.3 |  |
| macd_5m_turn | x1.5 WITH | 2.91 | +40,745 | +12,333 | +4,225 | +40,385 | 57.1 / 8.4 | +10,564 | 52.2 / 4.3 |  |
| macd_5m_cross6 | skip AGAINST | 2.21 | +16,601 | +7,082 | +94 | +22,675 | 45.4 / 3.4 | +9,425 | 53.6 / 0.0 |  |
| macd_5m_cross6 | half size AGAINST | 2.91 | +24,759 | +7,914 | +744 | +21,467 | 46.2 / 2.5 | +6,416 | 55.1 / 0.0 |  |
| macd_5m_cross6 | x1.25 WITH | 2.91 | +34,936 | +9,669 | +3,370 | +40,843 | 57.1 / 7.6 | +7,810 | 52.2 / 4.3 |  |
| macd_5m_cross6 | x1.5 WITH | 2.91 | +36,332 | +11,937 | +7,454 | +34,922 | 57.1 / 7.6 | +11,286 | 52.2 / 4.3 |  |
| macd_15m_hist | skip AGAINST | 0.87 | +8,295 | -940 | +127 | +14,389 | 20.2 / 0.0 | -1,101 | 4.3 / 0.0 |  |
| macd_15m_hist | half size AGAINST | 2.91 | +21,055 | +3,323 | +1,081 | +26,755 | 19.3 / 0.0 | +2,534 | 4.3 / 0.0 |  |
| macd_15m_hist | x1.25 WITH | 2.91 | +35,270 | +9,168 | +993 | +43,203 | 59.7 / 5.9 | +6,330 | 50.7 / 4.3 |  |
| macd_15m_hist | x1.5 WITH | 2.91 | +37,579 | +8,776 | +1,365 | +38,753 | 63.0 / 5.9 | +6,196 | 50.7 / 5.8 |  |
| macd_15m_turn | skip AGAINST | 2.04 | +14,698 | +5,912 | +751 | +17,523 | 47.1 / 0.0 | +8,274 | 42.0 / 1.4 |  |
| macd_15m_turn | half size AGAINST | 2.91 | +23,683 | +7,169 | +751 | +19,891 | 47.9 / 2.5 | +8,764 | 42.0 / 0.0 |  |
| macd_15m_turn | x1.25 WITH | 2.91 | +36,886 | +9,991 | +1,725 | +44,753 | 57.1 / 7.6 | +8,385 | 50.7 / 4.3 |  |
| macd_15m_turn | x1.5 WITH | 2.91 | +40,593 | +12,066 | +2,684 | +39,770 | 57.1 / 8.4 | +11,214 | 50.7 / 4.3 |  |
| macd_15m_cross6 | skip AGAINST | 0.87 | +8,295 | -940 | +127 | +14,389 | 20.2 / 0.0 | -1,101 | 4.3 / 0.0 |  |
| macd_15m_cross6 | half size AGAINST | 2.91 | +21,055 | +3,323 | +1,081 | +26,755 | 19.3 / 0.0 | +2,534 | 4.3 / 0.0 |  |
| macd_15m_cross6 | x1.25 WITH | 2.91 | +34,191 | +9,301 | +801 | +35,748 | 59.7 / 5.9 | +8,954 | 50.7 / 0.0 |  |
| macd_15m_cross6 | x1.5 WITH | 2.91 | +34,146 | +9,043 | +768 | +34,927 | 63.0 / 5.9 | +8,781 | 50.7 / 0.0 |  |
| macd_1h_hist | skip AGAINST | 0.9 | +737 | +3,223 | +2,043 | +329 | 9.2 / 0.0 | +1,561 | 47.8 / 0.0 |  |
| macd_1h_hist | half size AGAINST | 2.91 | +17,702 | +6,188 | +1,245 | +17,836 | 11.8 / 0.8 | +7,373 | 43.5 / 0.0 |  |
| macd_1h_hist | x1.25 WITH | 2.91 | +33,803 | +9,640 | +1,446 | +34,094 | 57.1 / 6.7 | +8,994 | 52.2 / 0.0 |  |
| macd_1h_hist | x1.5 WITH | 2.91 | +34,283 | +10,973 | +2,098 | +34,774 | 57.1 / 6.7 | +9,326 | 52.2 / 0.0 |  |
| macd_1h_turn | skip AGAINST | 0.7 | +14,793 | -1,361 | +3,160 | +12,372 | 36.1 / 0.0 | -1,270 | 4.3 / 0.0 |  |
| macd_1h_turn | half size AGAINST | 2.91 | +24,318 | +3,208 | +1,864 | +26,124 | 36.1 / 0.0 | +2,180 | 4.3 / 0.0 |  |
| macd_1h_turn | x1.25 WITH | 2.91 | +36,834 | +9,167 | +1,974 | +44,688 | 57.1 / 5.0 | +6,330 | 50.7 / 4.3 |  |
| macd_1h_turn | x1.5 WITH | 2.91 | +40,770 | +8,661 | +2,969 | +48,925 | 57.1 / 5.0 | +6,195 | 50.7 / 5.8 |  |
| macd_1h_cross6 | skip AGAINST | 0.9 | +737 | +3,223 | +2,043 | +329 | 9.2 / 0.0 | +1,561 | 47.8 / 0.0 |  |
| macd_1h_cross6 | half size AGAINST | 2.91 | +17,702 | +6,188 | +1,245 | +17,836 | 11.8 / 0.8 | +7,373 | 43.5 / 0.0 |  |
| macd_1h_cross6 | x1.25 WITH | 2.91 | +33,562 | +9,253 | +404 | +33,570 | 57.1 / 5.0 | +9,064 | 52.2 / 0.0 |  |
| macd_1h_cross6 | x1.5 WITH | 2.91 | +33,436 | +9,167 | -353 | +34,040 | 57.1 / 5.0 | +9,224 | 52.2 / 0.0 |  |
| macd_5m_div_line | skip AGAINST | 0.63 | +11,993 | +2,103 | +3,511 | +9,891 | 19.3 / 0.0 | +1,797 | 5.8 / 0.0 |  |
| macd_5m_div_line | half size AGAINST | 2.91 | +22,561 | +5,211 | +2,112 | +20,610 | 21.8 / 0.0 | +5,823 | 5.8 / 0.0 |  |
| macd_5m_div_line | x1.25 WITH | 2.91 | +36,502 | +9,842 | +2,198 | +37,903 | 57.1 / 5.0 | +9,567 | 50.7 / 0.0 |  |
| macd_5m_div_line | x1.5 WITH | 2.91 | +39,362 | +10,338 | +3,102 | +39,611 | 57.1 / 6.7 | +10,295 | 50.7 / 0.0 |  |
| macd_5m_div_hist | skip AGAINST | 1.26 | +8,810 | +6,330 | +5,990 | +10,611 | 26.9 / 0.0 | +2,965 | 31.9 / 0.0 |  |
| macd_5m_div_hist | half size AGAINST | 2.91 | +21,013 | +7,623 | +3,265 | +23,279 | 26.9 / 0.0 | +6,425 | 31.9 / 0.0 |  |
| macd_5m_div_hist | x1.25 WITH | 2.91 | +35,526 | +10,273 | +2,919 | +37,552 | 57.1 / 8.4 | +9,496 | 52.2 / 0.0 |  |
| macd_5m_div_hist | x1.5 WITH | 2.91 | +37,737 | +12,185 | +4,634 | +37,141 | 57.1 / 8.4 | +10,335 | 52.2 / 0.0 |  |
| macd_15m_div_line | skip AGAINST | 0.66 | +9,776 | -756 | +6,105 | +14,496 | 29.4 / 0.0 | -1,038 | 0.0 / 0.0 |  |
| macd_15m_div_line | half size AGAINST | 2.91 | +21,736 | +3,591 | +3,380 | +24,337 | 25.2 / 0.0 | +2,932 | 2.9 / 0.0 |  |
| macd_15m_div_line | x1.25 WITH | 2.91 | +35,865 | +9,235 | +2,551 | +36,854 | 57.1 / 5.9 | +5,819 | 50.7 / 4.3 |  |
| macd_15m_div_line | x1.5 WITH | 2.91 | +38,226 | +8,976 | +3,963 | +46,237 | 57.1 / 5.9 | +5,819 | 50.7 / 4.3 |  |
| macd_15m_div_hist | skip AGAINST | 1.02 | +16,899 | -380 | +1,590 | +14,340 | 33.6 / 0.0 | -507 | 14.5 / 0.0 |  |
| macd_15m_div_hist | half size AGAINST | 2.91 | +25,068 | +3,821 | +1,282 | +26,345 | 31.9 / 0.0 | +3,168 | 15.9 / 0.0 |  |
| macd_15m_div_hist | x1.25 WITH | 2.91 | +37,617 | +9,228 | +1,947 | +39,470 | 59.7 / 5.0 | +8,954 | 50.7 / 0.0 |  |
| macd_15m_div_hist | x1.5 WITH | 2.91 | +41,759 | +8,992 | +2,218 | +41,755 | 63.0 / 5.9 | +9,167 | 50.7 / 0.0 |  |
| sr_15m_sweep | skip AGAINST | 2.09 | +23,970 | +3,195 | +4,661 | +20,534 | 46.2 / 0.0 | +182 | 53.6 / 0.0 |  |
| sr_15m_sweep | half size AGAINST | 2.91 | +29,741 | +6,112 | +3,550 | +25,071 | 45.4 / 2.5 | +10,800 | 52.2 / 0.0 |  |
| sr_15m_sweep | x1.25 WITH | 2.91 | +38,908 | +9,444 | +1,920 | +44,843 | 59.7 / 8.4 | +7,919 | 50.7 / 4.3 |  |
| sr_15m_sweep | x1.5 WITH | 2.91 | +45,658 | +10,631 | +4,040 | +40,636 | 63.0 / 8.4 | +8,745 | 50.7 / 5.8 |  |
| sr_15m_path | skip AGAINST | 0.17 | -530 | -231 | -1,054 | -537 | 0.0 / 0.0 | -361 | 0.0 / 0.0 |  |
| sr_15m_path | half size AGAINST | 2.91 | +16,631 | +4,145 | -147 | +15,018 | 2.5 / 0.0 | +3,480 | 1.4 / 0.0 |  |
| sr_15m_path | x1.25 WITH | 2.91 | +33,758 | +9,493 | +702 | +33,321 | 57.1 / 8.4 | +9,059 | 52.2 / 0.0 |  |
| sr_15m_path | x1.5 WITH | 2.91 | +33,625 | +9,493 | +479 | +33,202 | 57.1 / 7.6 | +9,059 | 52.2 / 0.0 |  |
| sr_15m_path2r | skip AGAINST | 0.49 | +262 | +4,452 | -6,263 | +229 | 8.4 / 0.0 | +2,220 | 17.4 / 0.0 |  |
| sr_15m_path2r | half size AGAINST | 2.91 | +16,532 | +6,812 | -2,741 | +18,610 | 10.9 / 0.0 | +6,767 | 17.4 / 0.0 |  |
| sr_15m_path2r | x1.25 WITH | 2.91 | +33,763 | +10,175 | -760 | +34,331 | 57.1 / 8.4 | +8,493 | 50.7 / 4.3 |  |
| sr_15m_path2r | x1.5 WITH | 2.91 | +33,519 | +11,508 | -2,456 | +34,098 | 57.1 / 7.6 | +9,221 | 50.7 / 4.3 |  |
| sr_15m_stop | skip AGAINST | 2.35 | +28,404 | +3,089 | -1,688 | +20,429 | 52.1 / 2.5 | +3,309 | 47.8 / 0.0 |  |
| sr_15m_stop | half size AGAINST | 2.91 | +31,657 | +5,902 | +357 | +28,083 | 52.1 / 5.9 | +3,500 | 49.3 / 0.0 |  |
| sr_15m_stop | x1.25 WITH | 2.91 | +39,809 | +9,444 | +924 | +40,292 | 59.7 / 8.4 | +7,919 | 50.7 / 4.3 |  |
| sr_15m_stop | x1.5 WITH | 2.91 | +47,482 | +10,526 | +1,221 | +53,013 | 63.0 / 8.4 | +8,745 | 50.7 / 5.8 |  |
| sr_1h_sweep | skip AGAINST | 0.83 | +7,586 | +1,677 | -751 | +3,917 | 16.8 / 0.0 | -5 | 29.0 / 0.0 |  |
| sr_1h_sweep | half size AGAINST | 2.91 | +21,095 | +5,027 | +90 | +19,674 | 16.0 / 2.5 | +11,110 | 30.4 / 0.0 |  |
| sr_1h_sweep | x1.25 WITH | 2.91 | +35,555 | +9,348 | +819 | +36,358 | 59.7 / 6.7 | +6,398 | 52.2 / 4.3 |  |
| sr_1h_sweep | x1.5 WITH | 2.91 | +37,511 | +10,067 | +744 | +37,117 | 63.9 / 5.9 | +11,060 | 52.2 / 4.3 |  |
| sr_1h_path | skip AGAINST | 0.9 | +4,946 | +3,347 | +2,038 | +2,358 | 17.6 / 1.7 | +2,351 | 39.1 / 0.0 |  |
| sr_1h_path | half size AGAINST | 2.91 | +19,377 | +6,077 | +753 | +18,665 | 16.8 / 1.7 | +6,203 | 33.3 / 0.0 |  |
| sr_1h_path | x1.25 WITH | 2.91 | +34,854 | +9,885 | +2,164 | +40,422 | 59.7 / 8.4 | +8,988 | 50.7 / 0.0 |  |
| sr_1h_path | x1.5 WITH | 2.91 | +36,577 | +10,825 | +2,700 | +34,102 | 63.9 / 7.6 | +8,848 | 50.7 / 0.0 |  |
| sr_1h_path2r | skip AGAINST | 1.58 | +11,166 | +4,724 | -2,476 | +7,876 | 37.0 / 1.7 | +4,012 | 44.9 / 0.0 |  |
| sr_1h_path2r | half size AGAINST | 2.91 | +22,002 | +6,940 | -2,081 | +22,110 | 37.8 / 1.7 | +4,774 | 36.2 / 0.0 |  |
| sr_1h_path2r | x1.25 WITH | 2.91 | +36,183 | +10,113 | +1,336 | +43,649 | 59.7 / 9.2 | +9,458 | 50.7 / 0.0 |  |
| sr_1h_path2r | x1.5 WITH | 2.91 | +39,254 | +11,504 | +848 | +38,142 | 63.9 / 8.4 | +9,432 | 50.7 / 0.0 |  |
| sr_1h_stop | skip AGAINST | 1.04 | +6,223 | +3,096 | -5,407 | +3,747 | 20.2 / 0.0 | +2,965 | 37.7 / 0.0 |  |
| sr_1h_stop | half size AGAINST | 2.91 | +19,878 | +5,864 | -2,274 | +16,280 | 20.2 / 2.5 | +7,463 | 39.1 / 0.0 |  |
| sr_1h_stop | x1.25 WITH | 2.91 | +35,249 | +9,436 | +404 | +36,743 | 59.7 / 6.7 | +8,013 | 52.2 / 4.3 |  |
| sr_1h_stop | x1.5 WITH | 2.91 | +36,602 | +10,518 | -982 | +37,200 | 63.0 / 5.9 | +11,060 | 52.2 / 4.3 |  |
| rn_100_sweep | skip AGAINST | 0.61 | +19,056 | +2,244 | -2,350 | +18,171 | 31.1 / 0.0 | +1,997 | 17.4 / 0.0 |  |
| rn_100_sweep | half size AGAINST | 2.91 | +26,749 | +5,475 | -895 | +25,082 | 30.3 / 0.0 | +5,830 | 18.8 / 0.0 |  |
| rn_100_sweep | x1.25 WITH | 2.91 | +38,100 | +9,714 | +674 | +37,264 | 57.1 / 8.4 | +9,021 | 52.2 / 0.0 |  |
| rn_100_sweep | x1.5 WITH | 2.91 | +43,232 | +10,552 | +517 | +41,013 | 57.1 / 8.4 | +8,983 | 52.2 / 0.0 |  |
| rn_100_stop | skip AGAINST | 1.43 | +19,216 | +2,147 | +1,166 | +17,620 | 40.3 / 0.0 | +1,260 | 21.7 / 0.0 |  |
| rn_100_stop | half size AGAINST | 2.91 | +26,197 | +5,250 | +869 | +16,277 | 39.5 / 0.0 | +6,554 | 30.4 / 0.0 |  |
| rn_100_stop | x1.25 WITH | 2.91 | +37,846 | +9,525 | +1,592 | +45,355 | 59.7 / 8.4 | +6,398 | 52.2 / 4.3 |  |
| rn_100_stop | x1.5 WITH | 2.91 | +42,674 | +9,957 | +2,192 | +42,816 | 63.0 / 6.7 | +6,867 | 52.2 / 4.3 |  |
| rn_50_sweep | skip AGAINST | 0.51 | +7,400 | +2,012 | +2,663 | +8,054 | 25.2 / 0.0 | +1,768 | 14.5 / 0.0 |  |
| rn_50_sweep | half size AGAINST | 2.91 | +20,379 | +5,502 | +1,826 | +22,513 | 25.2 / 0.0 | +5,858 | 14.5 / 0.0 |  |
| rn_50_sweep | x1.25 WITH | 2.91 | +35,286 | +9,807 | +1,571 | +36,878 | 57.1 / 6.7 | +9,059 | 52.2 / 0.0 |  |
| rn_50_sweep | x1.5 WITH | 2.91 | +36,973 | +10,486 | +3,186 | +38,418 | 57.1 / 6.7 | +9,059 | 52.2 / 0.0 |  |
| rn_50_stop | skip AGAINST | 2.33 | +23,005 | +9,500 | -2,545 | +15,291 | 47.9 / 1.7 | +13,048 | 50.7 / 0.0 |  |
| rn_50_stop | half size AGAINST | 2.91 | +28,280 | +9,375 | -749 | +19,830 | 47.9 / 3.4 | +13,036 | 52.2 / 0.0 |  |
| rn_50_stop | x1.25 WITH | 2.91 | +38,382 | +10,289 | +750 | +46,805 | 59.7 / 7.6 | +8,679 | 50.7 / 4.3 |  |
| rn_50_stop | x1.5 WITH | 2.91 | +44,545 | +13,627 | +707 | +42,165 | 63.0 / 7.6 | +11,606 | 50.7 / 4.3 |  |
| rn_100_path2r | skip AGAINST | 0.95 | +15,073 | -1,245 | -1,120 | +7,486 | 31.9 / 0.0 | -950 | 2.9 / 0.0 |  |
| rn_100_path2r | half size AGAINST | 2.91 | +24,852 | +3,583 | -145 | +19,083 | 30.3 / 0.0 | +2,704 | 4.3 / 0.0 |  |
| rn_100_path2r | x1.25 WITH | 2.91 | +37,154 | +9,344 | +999 | +37,554 | 57.1 / 7.6 | +8,964 | 52.2 / 0.0 |  |
| rn_100_path2r | x1.5 WITH | 2.91 | +41,102 | +8,810 | +1,011 | +39,135 | 57.1 / 6.7 | +8,661 | 52.2 / 0.0 |  |
| sd_15m_fresh_sweep | skip AGAINST | 0.19 | -574 | +1,201 | +4,938 | -577 | 0.0 / 0.0 | +313 | 14.5 / 0.0 |  |
| sd_15m_fresh_sweep | half size AGAINST | 2.91 | +16,609 | +4,717 | +2,568 | +14,981 | 2.5 / 0.0 | +3,139 | 18.8 / 0.0 |  |
| sd_15m_fresh_sweep | x1.25 WITH | 2.91 | +33,801 | +9,427 | +1,967 | +34,234 | 57.1 / 5.9 | +8,988 | 52.2 / 0.0 |  |
| sd_15m_fresh_sweep | x1.5 WITH | 2.91 | +33,604 | +9,678 | +3,327 | +34,190 | 57.1 / 5.9 | +9,234 | 52.2 / 0.0 |  |
| sd_15m_any_sweep | skip AGAINST | 0.36 | -1,628 | +1,702 | +8,609 | -1,796 | 0.0 / 0.0 | +813 | 14.5 / 0.0 |  |
| sd_15m_any_sweep | half size AGAINST | 2.91 | +16,158 | +4,871 | +4,840 | +14,253 | 2.5 / 0.0 | +3,315 | 18.8 / 0.0 |  |
| sd_15m_any_sweep | x1.25 WITH | 2.91 | +33,629 | +9,427 | +2,933 | +34,609 | 57.1 / 6.7 | +8,988 | 52.2 / 0.0 |  |
| sd_15m_any_sweep | x1.5 WITH | 2.91 | +33,153 | +9,833 | +5,027 | +34,573 | 57.1 / 5.9 | +9,388 | 52.2 / 0.0 |  |
| sd_15m_path | skip AGAINST | 2.48 | +23,568 | +6,863 | -5,494 | +13,558 | 53.8 / 1.7 | +7,738 | 49.3 / 4.3 |  |
| sd_15m_path | half size AGAINST | 2.91 | +28,182 | +7,949 | -2,423 | +27,278 | 54.6 / 3.4 | +9,304 | 50.7 / 0.0 |  |
| sd_15m_path | x1.25 WITH | 2.91 | +38,585 | +9,988 | +221 | +46,173 | 59.7 / 8.4 | +8,654 | 50.7 / 4.3 |  |
| sd_15m_path | x1.5 WITH | 2.91 | +44,828 | +12,267 | -719 | +44,509 | 63.0 / 7.6 | +9,766 | 50.7 / 5.8 |  |
| sd_1h_fresh_sweep | skip AGAINST | 0.12 | -444 | +579 | +2,818 | -619 | 0.0 / 0.0 | +579 | 4.3 / 0.0 |  |
| sd_1h_fresh_sweep | half size AGAINST | 2.91 | +16,610 | +4,145 | +1,347 | +15,415 | 2.5 / 0.0 | +6,503 | 4.3 / 0.0 |  |
| sd_1h_fresh_sweep | x1.25 WITH | 2.91 | +33,858 | +9,493 | +2,057 | +34,234 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| sd_1h_fresh_sweep | x1.5 WITH | 2.91 | +33,732 | +9,493 | +2,697 | +34,204 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| sd_1h_any_sweep | skip AGAINST | 0.24 | +417 | +474 | +10,189 | +237 | 8.4 / 0.0 | +366 | 4.3 / 0.0 |  |
| sd_1h_any_sweep | half size AGAINST | 2.91 | +16,524 | +4,145 | +4,805 | +19,363 | 10.9 / 0.0 | +3,502 | 4.3 / 0.0 |  |
| sd_1h_any_sweep | x1.25 WITH | 2.91 | +33,859 | +9,493 | +3,343 | +35,179 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| sd_1h_any_sweep | x1.5 WITH | 2.91 | +33,690 | +9,493 | +6,175 | +35,103 | 57.1 / 5.9 | +9,059 | 52.2 / 0.0 |  |
| sd_1h_path | skip AGAINST | 2.55 | +33,799 | +8,699 | +1,566 | +28,187 | 57.1 / 1.7 | +9,294 | 52.2 / 0.0 |  |
| sd_1h_path | half size AGAINST | 2.91 | +33,595 | +9,143 | +1,026 | +26,101 | 57.1 / 1.7 | +9,328 | 50.7 / 0.0 |  |
| sd_1h_path | x1.25 WITH | 2.91 | +40,920 | +10,363 | +2,115 | +49,133 | 59.7 / 8.4 | +8,887 | 50.7 / 4.3 |  |
| sd_1h_path | x1.5 WITH | 2.91 | +49,885 | +13,084 | +3,102 | +45,021 | 63.0 / 8.4 | +11,143 | 50.7 / 4.3 |  |

## Method and files

- `tools/lit_retail_conf.py`:
  - `feats`, `lookahead` (30/30), `grid` (the 252 tests), `chance` (20 shuffles), `followup` (controls + size-neutral
    tilts), `perm` (random-pick checks), `table`, `save` (the runs `lit_retail_c_*`).
  - The trades are run lit_live exactly (engine/lit.py run_x on live_model.json "lit": 120 trades in 2026, H1 +$33,891, H2
    +$9,493).
  - The eval path is the executor behind run `lit_adopt_t15_be_off_eval` (`tools/lit_big_ideas.run_eval_x`, with the
    per-trade multiplier capped by the live 60% room / soft daily loss / 40 micros). With no rule it gives back 57.1 / 5.9
    and 52.2 / 0.0 exactly.
- Results: `research/lit/retail_conf.json` (every test, every fact's WITH / AGAINST stats by half, controls, random-pick
  checks); `research/lit/retail_conf_chance.json` (the shuffles).
- **Caveats:**
  - Up-sizes on the LIT size rule are applied after the weekly stop (int(q × m), max 40). That is exact for P&L, because P&L
    is linear in micros.
  - Thresholds (2 ATR stretch, 6-bar cross, cluster tolerance 0.15 × 1h ATR, 1.5 ATR impulse) are textbook defaults chosen
    before the run and not tuned.
  - Jul-Oct has 40 trades.
- **Size-neutral tilts (post-hoc, x1.25 WITH / x0.75 AGAINST)** on the 3 facts that held in both halves (1h EMA 21 side, 5m
  EMA 50 slope, sweep at a round 100) all lose money in Jul-Oct on the LIT rule (and two of them in Jan-Jun too). They cut the Jan-Jun 2-week eval pass
  from 57.1% to 28.6-45.4%: under two_week sizing any cut means one winner no longer passes the eval.
