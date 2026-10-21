## The question

"I think EMAs and moving averages could be additional confluence in our strategy. Remember we still want a decent amount
of trades per week."

## Short answer

- **Using EMAs the usual way hurts this strategy.** "Only trade with the EMA trend" (above the 1h EMA 50, the daily
  50 / 200-day average, EMAs stacked 20 > 50 > 200) cuts 2026 net by $5,000-8,000. The Liquidity Engine makes its money
  catching the turn after a sweep, and those turns usually start on the "wrong" side of the EMAs.
- **One EMA fact does help, as a warning sign, not as a reason to trade.** When price is **3 or more hourly ATRs away
  from the 1-hour EMA 20, on the wrong side** (a long while price is far below it, a short while price is far above it),
  the setup is fading a strong one-way move. Over 2021-25 these setups won only 8% of the time (the rest: 22%) and lost
  money in every single year.
- **Suggested rule (adopt-candidate, `ema_knife_rma_half`): trade those setups at half size.** Every setup is still
  taken, so trades per week do not change. The ATR is measured the way TradingView and the engine measure it (Wilder);
  the first version, picked on 2021-25 with a plain 14-bar ATR, does even better in 2021-25 but costs $1,150 in 2026
  because of one winner (see "Honest caveats").

| | Live strategy | With the falling-knife half size |
|---|---:|---:|
| **2026** trades / week (weeks with 2+) | 2.16 (71%) | 2.16 (71%) |
| 2026 net / per month / PF | +$20,111 / +$2,050 / 3.48 | +$20,139 / +$2,053 / 3.49 |
| 2026 max drawdown | -$2,661 | -$2,660 |
| 2026 MFFU eval: pass / fail within 2 weeks (decided) | 19.4% / 0.0% (19.4%) | 19.4% / 0.0% (19.4%) |
| 2026 MFFU eval: pass / fail within 1 month | 33.0% / 0.0% | 33.0% / 0.0% |
| 2026 passes slower than 3 weeks / median sessions to pass | 55.4% / 19 | 55.4% / 19 |
| **2021-25** trades / week (weeks with 2+) | 3.17 (92%) | 3.17 (92%) |
| 2021-25 net / per month / PF | +$6,491 / +$127 / 1.09 | **+$9,639 / +$189 / 1.13** |
| 2021-25 max drawdown | -$11,401 | **-$9,944** |
| 2021-25 MFFU eval: pass / fail within 2 weeks (decided) | 4.1% / 2.1% (6.2%) | 4.1% / **0.9%** (5.0%) |
| 2021-25 MFFU eval: pass / fail within 1 month | 8.7% / 9.4% | 9.3% / **6.2%** |
| 2021-25 passes slower than 3 weeks / median sessions to pass | 70.5% / 25 | 76.9% / 27 |
| 2021-25 back-to-back evals passed / failed | 7 / 18 | 7 / 14 |

It hits few setups (51 of 679 in 2021-25, 3 of 89 in 2026), so it is a small change: it mostly removes losing size in the
bad stretches. 2026 cannot confirm it (3 setups); it only shows that it does not hurt. It does **not** make evals faster:
it mainly removes fast fails (2021-25: failed within 2 weeks 2.1% -> 0.9%, within 1 month 9.4% -> 6.2%);
passes stay rare and slow.

## How it was tested

- The exact live-loop replay of the live strategy (768 trades, costs included), the same trades as the dashboard.
- For every trade, the moving averages were computed from the **TradingView CME NQ1! 5-minute file**, using only candles
  that had **closed before the entry** (the bot enters at the open of the candle after the signal candle). 15-minute,
  1-hour and daily candles were built from the same file. A self-test recomputed everything on data cut off at the entry
  for 80 random trades: 0 differences, so nothing peeks at the future.
- Each idea was then applied as a **size change** on top of the live cold-streak half size (or, only as a check, as a skip).
- **Anti-overfitting:** the rules and their settings were chosen on 2021-25 only. 2026 was checked afterwards, untouched.

## Step 1: 55 moving-average facts, 2021-25 only

Price above / below the EMA 9, 20, 50, 100, 200 on 5m, 15m and 1h; the daily 10 / 20 / 50 / 100 / 200-day averages;
slopes; stack order (20 > 50 > 200); the sweep wick piercing an EMA and closing back; an EMA sitting between entry and
target; price stretched far from an EMA. What came out (2021-25, average R per trade with the fact vs without):

- **"With the trend" facts: no edge.** On 5m / 15m / 1h, trades with the EMA trend did between -0.03R and +0.14R
  better (none of it beyond noise), and for most of them the sign flipped between 2021-23 and 2024-25. On the daily
  chart, trades **with** the 50-day average actually did worse (-0.14R vs +0.09R), but the gap came from 2022-23; in
  2024-25 it was small or reversed (in dollars, 2024 went the other way). In 2026 the best trades started on the "wrong"
  side of the short EMAs (15m EMA 9: +0.47R against vs -0.01R with), which is why the textbook filters cost 2026 money.
- **Sweep tagging the ~2-day EMA** (1h EMA 50, which is almost the same line as the 15m EMA 200): +0.13R better, weak
  (100 trades, t = 1.0) and the neighbouring EMAs did not agree.
- **The clear one: price far on the wrong side of the hourly EMA.** The further price was stretched against the trade,
  the worse the setup did (1h EMA 20, 2021-25):

| Price vs the 1h EMA 20 at the entry (hourly ATRs, minus = wrong side) | Setups | Avg R | Win % | Net $ (live size) | PF |
|---|---:|---:|---:|---:|---:|
| beyond -3 (falling knife) | 80 | -0.37 | 8% | -$9,182 | 0.25 |
| -3 to -2 | 88 | +0.06 | 22% | -$3,659 | 0.70 |
| -2 to -1 | 138 | +0.15 | 23% | +$11,114 | 1.89 |
| -1 to 0 | 147 | +0.03 | 23% | +$1,093 | 1.07 |
| 0 to +1 | 131 | -0.13 | 18% | -$720 | 0.94 |
| +1 to +2 | 72 | +0.19 | 28% | +$6,242 | 1.79 |
| beyond +2 | 23 | +0.04 | 22% | +$1,602 | 1.73 |

It holds for longs (-0.54R, 35 setups) and shorts (-0.24R, 45 setups), with or without the trending regime, and the
neighbours agree: 2 / 2.5 / 3 / 3.5 / 4 ATR give -0.15 / -0.31 / -0.37 / -0.57 / -0.65R; the 1h EMA 9, 1h EMA 50 and
15m EMA 50 show the same tail. 97% of these setups are already "against the 1H trend" in the engine's checklist, but
the discount / premium point cancels that out, so the engine takes them at full size today.

**Why it makes sense:** the bot bets that the sweep was a stop hunt. When price is already 3+ hourly ATRs away from its
20-hour average, a strong one-way move (displacement) is running, and a new high or low in that move is more often
continuation than a stop hunt. It is the old "don't catch a falling knife".

## Step 2: the rules, 2026 vs 2021-25 vs the live strategy

All size rules keep every setup: 2.16 trades a week in 2026 (71% of weeks with 2+) and 3.17 in 2021-25 (92%).

| Run | Rule | 2026 net ($/month) | 2026 PF | 2026 DD | 2026 eval 2w pass/fail | 2021-25 net ($/month) | 2021-25 PF | 2021-25 DD | 2021-25 eval 2w pass/fail | 2021-25 eval 1m pass/fail | Status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| baseline | live strategy | +$20,111 (+$2,050) | 3.48 | -$2,661 | 19.4 / 0.0% | +$6,491 (+$127) | 1.09 | -$11,401 | 4.1 / 2.1% | 8.7 / 9.4% |  |
| ema_knife_rma_half | **half size on a falling knife (1h EMA 20, 3 Wilder ATR)** | +$20,139 (+$2,053) | 3.49 | -$2,660 | 19.4 / 0.0% | +$9,639 (+$189) | 1.13 | -$9,944 | 4.1 / 0.9% | 9.3 / 6.2% | adopt-candidate |
| ema_knife_half | same, plain 14-bar ATR (the version picked on 2021-25) | +$18,961 (+$1,933) | 3.38 | -$2,660 | 16.0 / 0.0% | +$11,120 (+$218) | 1.16 | -$8,504 | 4.1 / 0.9% | 9.2 / 5.1% | rejected |
| ema_knife_quarter | quarter size instead of half | +$18,319 (+$1,867) | 3.31 | -$2,660 | 16.0 / 0.0% | +$12,658 (+$248) | 1.19 | -$7,550 | 4.1 / 0.9% | 9.6 / 4.9% | rejected |
| ema_knife_k2_half | neighbour: 2 ATR | +$19,065 (+$1,944) | 3.7 | -$2,315 | 16.0 / 0.0% | +$13,329 (+$261) | 1.21 | -$7,763 | 4.1 / 0.7% | 9.2 / 2.7% | rejected |
| ema_knife_k25_half | neighbour: 2.5 ATR | +$19,336 (+$1,971) | 3.55 | -$2,340 | 16.0 / 0.0% | +$13,245 (+$259) | 1.2 | -$8,611 | 4.1 / 0.8% | 9.4 / 4.8% | rejected |
| ema_knife_k35_half | neighbour: 3.5 ATR | +$20,138 (+$2,053) | 3.49 | -$2,661 | 19.4 / 0.0% | +$9,926 (+$194) | 1.14 | -$9,805 | 4.1 / 0.9% | 9.3 / 6.3% | adopt-candidate |
| ema_knife_e9_half | neighbour: 1h EMA 9 | +$20,111 (+$2,050) | 3.48 | -$2,661 | 19.4 / 0.0% | +$8,142 (+$160) | 1.11 | -$10,273 | 4.1 / 0.9% | 9.2 / 6.3% | promising |
| ema_knife_e50_half | neighbour: 1h EMA 50 | +$18,059 (+$1,841) | 3.41 | -$2,474 | 14.6 / 0.0% | +$10,839 (+$212) | 1.17 | -$8,119 | 4.1 / 0.7% | 9.0 / 2.2% | rejected |
| ema_knife_15m50_half | neighbour: 15m EMA 50 | +$18,982 (+$1,935) | 3.46 | -$2,374 | 19.4 / 0.0% | +$11,769 (+$231) | 1.17 | -$8,786 | 4.1 / 0.9% | 9.3 / 4.6% | rejected |
| ema_1h50_trend_half | textbook: half size below the 1h EMA 50 (for a long) | +$12,179 (+$1,242) | 3.09 | -$1,689 | 5.3 / 0.0% | +$6,879 (+$135) | 1.13 | -$7,125 | 2.1 / 0.2% | 5.3 / 1.2% | rejected |
| ema_1h50_trend_x125 | textbook: 1.25x above the 1h EMA 50 | +$21,412 (+$2,183) | 3.5 | -$2,663 | 20.4 / 0.0% | +$7,627 (+$149) | 1.1 | -$11,928 | 4.6 / 2.9% | 9.4 / 12.3% | rejected |
| ema_15m_stack_half | textbook: half size when 15m EMAs 20/50/200 are stacked against | +$14,669 (+$1,495) | 3.1 | -$2,284 | 10.2 / 0.0% | +$8,075 (+$158) | 1.13 | -$7,280 | 2.3 / 0.7% | 5.3 / 1.7% | rejected |
| ema_d200_trend_half | textbook: half size against the 200-day average | +$12,121 (+$1,236) | 2.87 | -$1,971 | 4.9 / 0.0% | +$3,552 (+$70) | 1.06 | -$9,169 | 3.1 / 0.0% | 6.3 / 1.2% | rejected |
| ema_d50_trend_half | textbook: half size against the 50-day average | +$14,366 (+$1,464) | 3.0 | -$2,015 | 10.2 / 0.0% | +$3,210 (+$63) | 1.06 | -$8,788 | 2.8 / 1.0% | 5.8 / 2.3% | rejected |
| ema_d50_with_half | the opposite: half size WITH the 50-day average | +$14,787 (+$1,507) | 3.81 | -$2,249 | 9.2 / 0.0% | +$6,651 (+$130) | 1.11 | -$8,880 | 2.1 / 0.8% | 5.1 / 2.8% | rejected |
| ema_d50_against_x125 | 1.25x against the 50-day average | +$21,920 (+$2,235) | 3.62 | -$2,858 | 20.9 / 0.0% | +$6,118 (+$120) | 1.08 | -$12,084 | 4.5 / 3.2% | 9.0 / 11.0% | rejected |
| ema_tag50h_x125 | 1.25x when the sweep wick tagged the 1h EMA 50 | +$20,324 (+$2,072) | 3.45 | -$2,661 | 21.8 / 0.0% | +$6,992 (+$137) | 1.09 | -$11,791 | 4.1 / 2.1% | 8.7 / 10.1% | rejected |
| ema_tag50h_x150 | 1.5x when the sweep wick tagged the 1h EMA 50 | +$20,572 (+$2,097) | 3.37 | -$2,661 | 21.8 / 0.0% | +$7,884 (+$154) | 1.1 | -$12,422 | 4.4 / 2.3% | 9.2 / 10.8% | rejected |
| ema_knife_skip | check: skip the falling knives | +$18,057 (+$1,841) | 3.33 | -$2,631 | 16.0 / 0.0% | +$15,672 (+$307) | 1.25 | -$6,223 | 4.1 / 0.9% | 9.7 / 4.1% | info |
| ema_knife_half_nocold | check: knife rule with the cold-streak filter off | +$19,782 (+$2,017) | 3.0 | -$4,445 | 20.9 / 0.0% | +$3,824 (+$75) | 1.04 | -$13,463 | 4.3 / 4.2% | 10.2 / 19.9% | info |

Notes on the table:
- **Skipping** the falling knives drops 2026 to 2.01 trades a week (69% of weeks with 2+) and 2021-25 to 2.79, which is
  too close to the 2-a-week floor, and a post-hoc skip only approximates an engine filter (the engine could have taken a
  later signal that day). Half size keeps every setup.
- **Cold-streak filter:** the knife rule adds to it rather than overlapping. With the cold filter off, the knife rule
  still lifts 2021-25 from -$2,542 to +$3,824; with it on, from +$6,491 to +$11,120 (plain ATR) / +$9,639 (Wilder).
- The 1.25x lean-in rules look better on money only because they add size (more risk); the eval fail rate goes up.
- Eval numbers use the run library's eval-speed scoring (a new MFFU 50K eval started on every session, run up to 60
  sessions), the same scoring as every other run on the dashboard.

### Year by year (Wilder-ATR version)

| Year | Live net | Live PF | With the rule | PF | Falling-knife setups | Their avg R | Their win % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2021 (Nov-Dec) | +$1,718 | 1.52 | +$1,762 | 1.55 | 2 | -0.11 | 50% |
| 2022 | -$6,951 | 0.60 | -$5,975 | 0.64 | 12 | -0.88 | 0% |
| 2023 | +$8,433 | 1.40 | +$9,567 | 1.49 | 20 | -0.39 | 10% |
| 2024 | +$1,737 | 1.09 | +$2,484 | 1.13 | 12 | -0.47 | 8% |
| 2025 | +$1,554 | 1.11 | +$1,802 | 1.13 | 5 | -0.63 | 0% |
| 2026 (to Oct 16) | +$20,111 | 3.48 | +$20,139 | 3.49 | 3 | -0.16 | 0% |

Better in every year. The plain-ATR version (the one picked on 2021-25) is also better in every year from 2021 to 2025.

## Honest caveats

- **2026 can only say "no harm".** The rule hits 2-6 of the 89 setups in 2026, depending on the version. The version
  picked on 2021-25 (plain 14-bar ATR) **fails** the both-periods test: one of its 6 setups in 2026 was a +4.0R winner
  (2026-10-06, a short at 3.14 ATR, just past the line); halving it and the 5 small losers costs $1,150 net (PF 3.48 to
  3.38). With the Wilder ATR (TradingView's and the engine's) the same 3-ATR line sits a little further out, that trade
  is not hit and 2026 is unchanged.
  The Wilder ATR is what the engine already uses for stops and what Pine's `ta.atr` gives, so it is the natural way to
  build it, but I noticed that only after seeing 2026. Treat it as "3 ATR, measured the way the platform measures ATR".
- **The evidence is 2021-25:** 51-80 falling-knife setups over 5 years, a loss in every year, worse the further the
  stretch, both directions, all neighbours pointing the same way. A placebo test (half size on 80 random 2021-25 setups,
  200 draws: average -$634, best +$4,089) never reached the plain-ATR rule's +$4,629. But 55 facts were scanned to find
  it, so part of the 2021-25 gain is luck of the search.
- **Post-hoc sizing:** the cut is applied to the engine's micros the way the live loop applies the cold-streak half size
  (max(1, micros x 0.5)), so a 1-micro trade stays at 1 micro and nothing is skipped. An engine replay should confirm it
  once it is coded.
- **Daily averages:** the 200-day average needs 200 sessions of 5-minute history, so it only exists from August 2022
  (earlier trades kept full size in that run). The daily file `data/NQ_1d.csv` was not used: it comes from another
  source, closes at another time and is not back-adjusted.

## How hard is it to add?

- **Engine / live loop:** simple. It needs the 1-hour EMA 20 and the Wilder ATR 14 of closed 1-hour candles at the signal
  candle (the engine already builds 1-hour candles for the 1H trend and swing pools), then
  `knife = dir * (close - ema20_1h) < -3 * atr14_1h`, and if so multiply the routed micros by 0.5 with a floor of 1
  micro, exactly where the cold-streak half size is applied. Two settings (EMA length 20, 3 ATR), off by default so old
  backtests stay valid. The alert would say "HALF SIZE - falling knife (3+ ATR from the 1h EMA 20)".
- **TradingView Pine:** about 5 lines: `request.security(syminfo.tickerid, "60", ta.ema(close, 20)[1], lookahead =
  barmerge.lookahead_on)` and the same for `ta.atr(14)[1]` (last closed hourly candle, no repainting), then the same
  comparison on the signal candle's close. The Pine port does not have the cold-streak filter yet either (open work 3),
  so both size rules could go in together.

## What to test next

1. Code it in the engine (option off by default) and confirm with the exact live-loop replay (`tools/five_year.py
   live_jobs`), then the dry-run harness.
2. **EMAs as targets:** in 2021-25, setups where the 1h EMA 20 sat between the entry and the target did better (+0.06R vs
   -0.08R, both halves). The hourly mean may work as a magnet or a first partial. Needs the exit re-simulator, not sizing.
3. Re-check the falling-knife rule at the end of 2026 and in 2027: it is a small rule, so it needs a few dozen more
   setups before 2026-style data can confirm it.
4. Not worth more time: "trade with the EMA trend" in any form (5m to daily, slopes, stacks) and the daily 50-day
   average either way; they move with the market regime and cost 2026 money.

## Variants tried

- 55 moving-average facts in the 2021-25 scan (`python tools/research_ema.py explore`), plus about 40 threshold / length
  cells for the falling-knife family (EMA 9/20/50/100 on 15m and 1h, 2-4 ATR) and the direction / year splits.
- 21 saved runs (the table above).
- A placebo of 200 random half-size rules (`python tools/research_ema.py noise`): the knife rule beat all 200.
- Reproduce everything: `python tools/research_ema.py all` (look-ahead check, scan, runs, years, 2026 scan, placebo,
  summary). The 2026 scan of all 55 facts: `python tools/research_ema.py oos`.
