## In one minute

- **The question (owner, 2026-10-22):** find 1-2 strategies to trade next to LIT and make them profitable, the way LIT
  went from "not profitable" to PF 4 by tuning on 2026. This write-up covers the EMA family (trend and momentum).
- **The answer is yes, one version.** It is an EMA trend trade built from LIT's own tools:
  - **Trend:** the 15-minute and the 1-hour EMA 21 are both above the EMA 50. Shorts are the mirror.
  - **Pullback and sweep:** price pulls back to the 5-minute EMA 50, and the pullback low takes out an earlier swing low
    (a stop hunt).
  - **Trigger:** a 5-minute CISD back in the trend.
  - **Hours and target:** London hours (03:00-09:30 ET), no Mondays. The target is LIT's VIX band, with breakeven plus
    costs at 1R.
- **Money at $500 risk a trade (costs in):**

| period | trades | a week | win % | PF | net $ | $ a month | max DD | avg R |
|---|---|---|---|---|---|---|---|---|
| 2026 H1 (picked here) | 60 | 2.36 | 60.0 | 2.72 | **+19,838** | +3,280 | -3,367 | 0.73 |
| **2026 H2 (untouched check)** | 26 | 1.67 | 69.2 | **3.10** | **+8,136** | **+2,191** | -1,492 | 0.66 |
| 2026 Jan 2 - Oct 16 | 86 | 2.10 | 62.8 | 2.82 | +27,974 | +2,866 | -3,367 | 0.71 |
| 2025 (reference) | 130 | 2.53 | 47.7 | 1.18 | +6,214 | +508 | -9,472 | 0.10 |
| 2021-24 (reference) | 420 | 2.57 | 48.3 | 1.05 | +5,457 | +140 | -21,509 | 0.03 |

- **Next to LIT:** the two strategies barely move together (daily correlation +0.19 in 2026, -0.02 in H2). On one
  account, with LIT first (no EMA entry while LIT is in a trade, so at most 2 trades a day):
  - 2026 goes from **+$43,385 to +$66,791**: H1 from +$33.9k to +$47.7k, H2 from +$9.5k to +$19.1k.
  - Max drawdown goes from -$2,196 to -$3,512.
  - Trades go from 2.9 a week to 4.7 a week.
- **On the MFFU 50K eval** (LIT on its live two_week sizing; the EMA trade capped at 60% of the room and the $1,000 soft
  daily loss), the 2-week pass/fail changes like this:
  - H1: **57.1/5.9 -> 61.3/5.0**.
  - H2: **52.2/0.0 -> 69.6/2.9**.
  - Within a month: H1 74.3/11.9 -> 76.1/11.0 and H2 50.8/0.0 -> 78.0/3.4.
- **Why I trust it more than a lucky pick:**
  - All 13 one-step neighbours (another trend filter, window, pullback EMA, sweep on/off, target, BE, Monday rule) are
    profitable in H1 **and** H2.
  - Random CISD trades in the same window with the same exit beat its H2 result in only 1% of 300 draws.
  - It survives one extra tick of slippage on every market fill (H2 PF 2.92).
- **The honest catch:**
  - Before 2026 the edge is thin: 2025 PF 1.18, 2021-24 PF 1.05, and the 2021-24 drawdown was -$21.5k at $500 a trade.
    One extra tick of slippage makes 2021-24 flat. That is the same picture as LIT itself (2021-25 PF 1.01).
  - It trades the same hours as LIT (02:00-08:00 ET): 57 of its 86 trade days in 2026 were LIT days too.
  - The H2 sample is small (26 trades).
- **Verdict:** add it to the paper bot next to LIT, at $500 risk on the LIT account (or eval-safe sizing on an eval).
  Don't put real money on it until about 20 paper trades look like the backtest.

## The rules (plain words)

1. **Chart and hours:** NQ / MNQ futures on the 5-minute chart. Entries from 03:00 to 09:30 ET, not on Mondays. Max 1
   trade a day, flat at 15:55.
2. **Trend (longs):** on the 15-minute **and** the 1-hour chart, the EMA 21 is above the EMA 50. Only closed bars count.
   Shorts are the mirror of every rule here.
3. **Pullback:** a run of red 5-minute candles that reaches the 5-minute EMA 50 (the low gets within 0.1 ATR of it).
4. **Sweep:** that pullback low takes out an earlier 5-minute swing low by less than 1.5 ATR. The swing low must have been
   confirmed before the pullback started. This is the stop hunt.
5. **Trigger (CISD, as in LIT):** a 5-minute candle closes above the open of the first red candle of that run. Enter at
   the next 5-minute open.
6. **Stop:** 1 tick below the pullback low, i.e. the sweep wick. If the stop is under 6 or over 80 points, there is no
   trade. Size follows the stop.
7. **Target:** LIT's VIX band, i.e. the 18:00 open plus 1 VIX one-day move (yesterday's VIX / 100 / sqrt(252) x the
   open). It must be at least 1.5R away, else there is no trade. It is banked at 8R.
8. **Breakeven:** at +1R the stop moves to entry + 1.25 points, which covers the costs. Nothing else is managed.
9. **Size:** $500 risk a trade (micros = 500 / (stop x $2), 1 to 40).
   - On an eval: the same, capped at 60% of the room to the trailing max loss and by the $1,000 soft daily loss.
   - On LIT's account: LIT goes first, and there is no EMA entry while a LIT trade is open.

In 2026 it took 59 longs and 27 shorts. Entries by hour (ET): 03h 35, 04h 20, 05h 10, 06h 3, 07h 12, 08h 6. Exits: 17
targets, 35 breakevens, 32 stops, 2 flat. The median stop was 38.5 points (20 points in 2021-24, when NQ was lower).

## How it was found

- **Data and costs:**
  - TradingView CME NQ1! 5m bars, 2021-11 to 2026-10-16 (`data/NQ_5m.csv`). Official CME data only (TradingView / NinjaTrader), no CFD.
  - 15m, 1h and 4h bars are built from the 5m bars. A higher-timeframe value is used only once its bar has closed.
  - VIX and VXN are the prior day's close from the CBOE files. High-impact news comes from `data/news/events.csv`.
  - Market entries fill at the next 5m open + 1 tick. Stop, BE, check and flat exits fill 1 tick worse.
  - Targets fill at the limit. Stop and target in the same bar count as the stop.
  - **$1.90 a micro round trip.**
- **The signal (every version):** a 5m CISD that ends a counter-trend run, about 33,500 of them in 5 years, both
  directions. Each one carries about 35 facts known at its close (trend on 5m / 15m / 1h / 4h, EMA touches, sweep, body /
  ATR, ADX, ribbon, slope, VIX / VXN, gap, first-hour range, VWAP, opening range, news, day of week).
- **The grid:**
  - 6 windows (all day, London, London + NY AM, NY, NY AM, opening hour).
  - 6 trend filters (15m, 1h, 15m + 1h, 1h + 4h, all three, the 5m 8 > 21 > 50 stack).
  - 3 pullback depths (EMA 21, EMA 50, any), sweep yes/no, 3 body sizes (0 / 0.5 / 0.8 ATR).
  - 10 regime filters (none, ADX >= 20, 15m EMA slope, VXN low, VXN high, no news, first-hour range, VWAP side, no
    Mondays, opening-range side).
  - 36 exits (2R / 3R / 4R / VIX band / ride, BE + costs on/off, 15-minute check on/off, ride on the 15m EMA 21 on/off).
  - With max 1 trade a day this made **192,776 versions**, of which 156,324 trade 1-5 times a week in H1.
- **Pick on 2026 H1 only:**
  - *Best* = highest t-stat of R in H1.
  - *Plateau* = every one-step neighbour profitable in H1, highest median t of itself and its neighbours.
  - The top two plateau picks overall were both this London family (the next ones were opening-hour versions, which
    lose in H2; see below). Within the London family's 25 best plateau picks I kept those not negative in 2025 and
    2021-24 (the brief's "prefer versions not negative there") and took the one with the most H1 R.
  - Two of them qualified: the VIX-band version above and a 3R version without the sweep (`ema2_lon_3r`, below).
  - Applied to all windows instead of London only, the same rule picks the 3R version. Both are reported. The 3R
    version passes H2 too, but it adds less next to LIT.
- **Look-ahead check:**
  - `python tools/second_ema.py lookahead 30` recomputes the candidates with every bar after the signal blanked.
  - **30 of 30 trades of the pick have identical features, stop and CISD level.**
  - The check did catch one leak during the build: the gap feature read the 09:30 open for London signals. No rule used
    it, and it is fixed.

## Chance and plateau

| group of versions (1-5 trades a week in H1) | count | positive in H2 | mean H2 R |
|---|---|---|---|
| all versions | 156,324 | 52.3% | +1.15 |
| top 10% by H1 t-stat | 15,686 | 58.1% | +1.87 |
| top 1% | 1,566 | 59.3% | +1.87 |
| top 0.1% | 161 | 67.7% | +3.31 |

So being good in H1 says only a little about H2. The leaders survive 58-68% of the time against 52% for everything. For
the pick itself:

- **Random trades:** the same exit on random CISD trades of the same window (any trend, any pullback, 1 a day, as many
  trades as the pick) made H2 -1.2R on average, with the top 5% at +12.9R. The pick made **+17.2R**, and only 1% of the
  draws beat it. In H1, 0% beat it.
- **Earlier years:** in 2025 and 2021-24, 10-12% of the random draws did better, so the edge there is weak.
- **Every one-step neighbour** is profitable in H1 and in H2:

| change from the pick | H1 R (PF) | H2 R (PF) | 2025 R (PF) | 2021-24 R (PF) |
|---|---|---|---|---|
| **the pick** | **+43.7 (2.76)** | **+17.2 (3.04)** | **+12.9 (1.18)** | **+10.4 (1.05)** |
| window 03:00-11:30 | +49.2 (2.83) | +17.2 (3.04) | +13.4 (1.18) | +4.2 (1.02) |
| trend 15m only | +31.5 (2.38) | +16.6 (2.33) | +24.2 (1.34) | -28.1 (0.88) |
| trend 1h only | +30.3 (1.70) | +9.0 (1.41) | +9.6 (1.09) | +35.5 (1.12) |
| trend 15m + 1h + 4h | +28.6 (2.84) | +12.4 (2.47) | +16.3 (1.31) | -10.9 (0.93) |
| pullback to any depth | +42.5 (2.52) | +9.7 (1.72) | +3.9 (1.05) | +18.8 (1.08) |
| no sweep needed | +38.0 (2.18) | +10.1 (1.83) | +18.7 (1.26) | +72.7 (1.28) |
| body >= 0.5 ATR | +16.7 (1.67) | +13.7 (2.89) | +25.5 (1.42) | -5.3 (0.98) |
| Mondays too | +36.5 (2.13) | +12.0 (1.88) | +20.4 (1.25) | +9.8 (1.04) |
| target 3R | +35.3 (2.31) | +16.3 (2.55) | -4.4 (0.94) | -12.3 (0.95) |
| target 4R | +32.6 (2.21) | +17.3 (2.65) | -13.0 (0.82) | +7.4 (1.03) |
| no breakeven | +34.2 (1.71) | +5.8 (1.29) | +46.3 (1.42) | -32.9 (0.91) |
| + 15-minute check | +38.8 (2.57) | +16.1 (2.69) | +15.7 (1.23) | +11.3 (1.05) |
| + ride the 15m EMA 21 | +16.5 (1.68) | +14.2 (3.45) | +17.9 (1.33) | -30.8 (0.83) |

## Sizing: R first, then dollars

| sizing | H1 net (PF) | H2 net (PF) | 2026 $/mo | 2025 | 2021-24 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo |
|---|---|---|---|---|---|---|---|---|
| $300 risk | +11,747 (2.80) | +4,164 (2.89) | +1,630 | +2,826 | +2,108 | -1,843 | 11.7/0.0 | 27.8/0.0 |
| **$500 risk** | **+19,838 (2.72)** | **+8,136 (3.10)** | **+2,866** | +6,214 | +5,457 | -3,367 | 34.1/0.0 | 50.2/9.8 |
| $800 risk | +33,821 (2.81) | +12,240 (2.90) | +4,718 | +7,833 | +11,391 | -5,393 | 42.0/17.1 | 53.7/30.7 |
| LIT rule ($800 to 20 pts) | +21,467 (3.02) | +5,794 (2.24) | +2,793 | +3,833 | +8,411 | -3,169 | 31.7/3.4 | 49.8/17.6 |

**MFFU 50K eval on its own, eval-safe** ($500 a trade capped at 60% of the room and the soft daily loss; fresh evals
started on every session):

| period | 2-week pass/fail | 1-month pass/fail |
|---|---|---|
| H1 | 44.9/0.0 | 65.7/0.0 |
| H2 | 24.6/0.0 | 42.4/0.0 |
| 2025 | 25.0/0.0 | 33.2/0.0 |
| 2021-24 | 15.5/0.0 | 21.7/0.0 |

The cap stops fails, but evals that never pass stay open.

**$500 is the sizing to use.** At $800 the 2025 and 2021-24 drawdowns ($15k-$34k) and the eval fails (2025: 46% in 2
weeks) are too big.

## On one account with LIT (LIT first)

LIT here is run `lit_live` at the LIT size rule. 2021-25 is LIT's 5m-only reference line.

| | LIT alone | LIT + EMA, max 2 a day | LIT + EMA, max 1 a day |
|---|---|---|---|
| 2026 H1 net (PF) | +33,891 (4.98) | **+47,713 (3.56)** | +36,769 (3.91) |
| 2026 H2 net (PF) | +9,493 (2.69) | **+19,078 (3.37)** | +16,277 (3.47) |
| 2026 $/month | +4,444 | **+6,842** | +5,434 |
| 2026 max DD | -2,196 | -3,512 | -3,145 |
| trades a week 2026 | 2.93 | 4.66 | 3.63 |
| 2025 net | +3,199 | +2,032 | -2,581 |
| 2021-24 net | -1,988 | -966 | +13,310 |
| eval 2 wk H1 / H2 (fixed size) | 37.0/1.6, 23.1/0.0 | 52.0/8.7, 46.2/0.0 | 48.8/1.6, 37.2/0.0 |

- **Max 2 a day** means 1 LIT + 1 EMA, with no EMA entry while LIT is in a trade. It kept 71 of the 86 EMA trades of
  2026 and every LIT trade.
- **Max 1 a day** means an EMA trade only if LIT has not traded yet, and then LIT is blocked for that day. That costs 32
  LIT trades in 2026 and makes less money, so **max 2 is the setting to use**.

**The eval path** uses LIT's live two_week sizing (run `lit_adopt_t15_be_off_eval`, reproduced exactly here) plus the
EMA trade at eval-safe size, both on the same eval:

| | LIT alone H1 | LIT + EMA H1 | LIT alone H2 | LIT + EMA H2 |
|---|---|---|---|---|
| 2-week pass/fail | 57.1/5.9 | **61.3/5.0** | 52.2/0.0 | **69.6/2.9** |
| 1-month pass/fail | 74.3/11.9 | 76.1/11.0 | 50.8/0.0 | **78.0/3.4** |
| back-to-back path net (PF) | +34,234 (4.02) | +39,670 (3.13) | +9,059 (2.20) | **+23,040 (3.19)** |
| back-to-back passes/fails | 10/2 | 12/3 | 3/1 | 7/1 |
| path max DD | -3,314 | -3,659 | -3,073 | -2,071 |

**Month by month, 2026** ($500 risk, EMA alone): Jan -1,400 | Feb +1,852 | Mar +4,923 | Apr +2,550 | May +4,097 | Jun
+7,816 | Jul +2,934 | Aug +3,377 | Sep -312 | Oct (to the 16th) +2,138. 8 of 10 months were positive.

## The 3R sibling (`ema2_lon_3r`)

This version uses the same rules with no sweep needed and a fixed 3R target.

- **At $500:** H1 +$14,459 (PF 1.93), H2 +$7,178 (PF 2.06), 2025 +$854, 2021-24 -$726, about 2.7 trades a week.
- **Next to LIT:** on LIT's account it adds +$18.8k in 2026.
- **On the eval path** it adds almost nothing: H2 2-week pass/fail is 53.6/0.0 against LIT's 52.2/0.0, and the H2 path
  net is +$7.9k, below LIT alone at +$9.1k.

Keep it as a reference. The VIX version is the one to trade.

## What did not work

- **Opening-hour EMA momentum (09:35-10:30).** In H1 these were the top plateau picks after the London family, and they
  were positive in 2025 and 2021-24. **Every one of them lost in H2** (-10 to -16R, PF 0.4-0.6). This is the same failure
  as the retail study's 8/21 opening-hour version. NY-only windows in general did not hold in H2.
- **Limit entry back at the CISD level** (LIT's 30-minute limit, tested as a full second grid of 180,928 versions). This
  is worse than entering at the next open:
  - Only 48% of versions are positive in H1 and 43% in H2.
  - The H1 leaders lose heavily in 2021-24.
  - A first run looked spectacular, but that was a fill bug in my own code: bars that traded through both the limit and
    the stop were dropped instead of being filled and stopped out. It was fixed before any conclusion.
- **Riding the trend** (exit on a 15m close through the EMA 21) and the 15-minute check add nothing to the pick.
  Breakeven plus costs at 1R helps a lot in 2026.
- **A bug in the earlier retail study** (`tools/retail_standalone.py` `trend_filter`): `to5(..., fill=0.0)` never forward
  fills, so its 1h / 4h trend filters were 0 on most 5m bars. Their trend-filtered variants traded only on the few bars
  where an HTF bar closed. This tool fills HTF values correctly. That study's filtered rows should be rerun before anyone
  relies on them.

## What's next

1. Paper-trade it next to LIT on the PC bot (5m bars from NinjaTrader are enough; LIT already needs the PC on from 01:55
   ET). It needs its own small module in the live loop. Nothing in `engine/lit.py` or `live_model*.json` was touched.
2. After about 20 paper trades, compare them with this backtest (win %, R, fills) before any real money.
3. Optional: a 1m entry refinement for 2026, which is LIT's biggest lever, was not tried here.

Code: `tools/second_ema.py`. The commands are `grid`, `pick`, `save` and `lookahead`, and `EMA2_ENTRY=lim` runs the limit
grid. The picked trades in the common format (2021-11 to 2026-10 at $500 risk, with the params and the plain rules) are
in `research/second/ema_best.json`. The full report is `research/second/ema_report.json`, and the H1 picks are in
`research/second/ema_picks_*.json`. The runs are `ema2_lon_vix`, `ema2_lon_vix_with_lit`, `ema2_lon_3r` and
`ema2_lon_3r_with_lit`.
