## In one minute

- **The owner's order (2026-10-18):** "Order blocks are huge, implement these too. I want you trading all of LIT." Then:
  "Higher time frame order blocks connected with LIT is good, get entries in that too."
- **What was built:**
  - An order-block detector that marks blocks the way LIT / ICT traders do, with no look-ahead (`engine/lit_ob.py`, a pure
    function the dashboard can call to draw the same blocks).
  - A test harness that puts the blocks into the real live LIT trade (`tools/lit_ob.py`). With no order-block option it gives
    back the live trade exactly: 120 trades in 2026, +$41,734.
- **What was tested (84 variants), each with both live sizes:**
  1. The block as the **point of interest**: the sweep must run into a fresh 15m / 1H / 4H / daily block, or size up when it
     does, or skip / half-size when it is far from one.
  2. The block as the **entry**: a limit at the 5m or 1m block's mean threshold or edge, only when that level is close.
  3. The block as the **target** or as an **obstacle** in the way.
  4. **Chapter 12** of the second report: qualify the origin before using the block.
  5. **New trades from higher-timeframe blocks:** a LIT sweep + inducement + CISD into or inside a fresh 1H / 4H / daily
     block, on days the main model has nothing, or as a second trade a day.
  6. The **owner's LIT group notes on mitigation**: the block of the initial break off the peak, the FVG next to it, the
     trap rule (untaken liquidity next to the zone), full box vs refined box, orderflow continuation, flip zones.
- **Result: nothing improves both halves of 2026, so nothing changes live.**
  - Only 10 of the 120 live trades (strict definition) or about 25 (loose) sweep into a fresh higher-timeframe block.
  - In Jan-Jun (the half the choices are made on) those trades are **worse** than the rest. Requiring a block cuts LIT to
    0.2-0.8 trades a week and loses most of the money.
  - Fresh 1H / 4H / daily blocks are rare (a 1H block about 3 times a week, a 4H block less than once a week, a daily block
    about 7 times a year), and most of the LIT setups they give are the same setups the main model already takes. Trading
    them on their own adds 1 to 16 trades a year.
- **Two ideas to keep watching (not adopted):**
  - **Opposing block in the way:** skip a trade when a fresh opposing 15m / 1H block sits less than 2R from the entry. With
    the live two_week sizing it halves the 2-week fails (Jan-Jun 8.4% to 3.4%, Jul-Oct 2.9% to 0%) and lifts the 2-week pass
    on real starts (52.9% to 54.6%, 50.7% to 53.6%). But it costs $6,000 in Jan-Jun, and in the Monte Carlo the Jan-Jun pass
    falls (50.5% to 47.4%). It makes the eval safer, not faster.
  - **HTF block setups as a 2nd trade a day:** about 10 extra trades in 2026, +$4.5k (Jan-Jun) and +$1.5k (Jul-Oct) with
    the two_week sizing, but the Jul-Oct 2-week pass is flat to slightly worse (50.7% to 49.3%; Monte Carlo 55.4% to 55.1%),
    and it needs a second trade a day.
- **Nothing live was changed:** `live_model.json`, `engine/lit.py`, `engine/lit_live.py`, `STRATEGY.md` and the dashboards are
  untouched.

## 1. What an order block is (for a beginner)

An **order block** is the place a strong move started. Traders believe big players left orders there, so when price comes
back to it for the first time, it may react again.

- **Bullish block (a place to buy):** the last red (down-close) candle, or the last small run of red candles, right before a
  strong move up.
- **Bearish block (a place to sell):** the last green candle, or run of green candles, right before a strong move down.

Not every last red candle is an order block. The move after it has to prove it was strong:

1. **Displacement:** the move has a big candle body (at least 0.8 ATR, the same test LIT uses).
2. **It leaves a fair value gap (FVG):** a gap between candle 1's high and candle 3's low that price skipped.
3. **It breaks structure (BOS):** it closes beyond the last swing high that sits above the block and was still intact. Or,
   when the block itself took liquidity (its low ran a previous swing low), a close above the block's body is enough.
4. **No look-ahead:** the block exists only after the candle that completes all three has closed.

What a trader marks on the chart:

- **Zone:** the block's body (open to close; TTrades) or its full range with wicks (the "full mitigation box"). Both tested.
- **Mean threshold (MT):** the middle of the body.
- **Fresh vs mitigated:** the block is fresh until price touches it for the first time. That first touch is the
  **mitigation**.
- **Breaker (flip zone):** if price then closes through the far side of the block, the block failed. It flips: a failed
  demand block becomes supply, and its first retest is a possible trade the other way.
- **Extreme vs decisional:** the extreme block is the origin of the leg (it holds the lowest low since the swing that was
  broken). A decisional block is one formed later, higher in the same leg, closer to price.

### How the bot finds one (engine/lit_ob.py)

- `resample()` builds 15m, 1H, 4H and daily candles from the CME NQ 5m file. 1H = clock hours, 4H from 18:00 ET, daily = the
  CME trading day. A higher-timeframe candle counts only after its last 5m bar closed.
- `detect()` walks every up candle that follows a down candle. It takes the down run before it (1 to 3 candles, a doji inside
  is allowed, one doji may sit between the run and the move). Then it gives the move 4 candles to leave an FVG and break
  structure. The move must not trade below the block first.
- Extra rules found from the charts:
  - Runs longer than 3 candles made zones 100+ points tall: capped at 3.
  - The swing to break must sit above the block. In a slow grind, an old swing far below price was counted as "broken"; fixed.
  - A gap across the 17:00 halt or a weekend is not a displacement: rejected.
  - 1-tick FVGs in a slow grind are not displacement: the FVG must be at least 0.1 ATR.
- `lifecycle()` adds the first touch (mitigation), the close-through (breaker) and the breaker's first retest.
- `chart_zones()` returns ready-to-draw rows (times, zone, mean threshold, state) for the dashboard.
- Self-test: `python -m engine.lit_ob`.

How many blocks it finds (Oct 2021 - Oct 2026, about 1,290 trading days):

| Timeframe | Blocks | Per week | Took liquidity | Extreme | Touched within a day | Median height |
|---|---:|---:|---:|---:|---:|---:|
| 5m | 11,550 | 45 | 30% | 54% | 92% | 8 pts |
| 15m | 3,384 | 13 | 30% | 54% | 85% | 15 pts |
| 1H | 738 | 2.9 | 30% | 52% | 67% | 32 pts |
| 4H | 215 | 0.8 | 27% | 50% | 42% | 66 pts |
| Daily | 37 | 0.14 | 22% | 49% | 8% | 212 pts |

**The pictures:** `research/study/lit_ob/detector_*.png` (20 charts on 5m / 15m / 1H / 4H). They show clear blocks, edge cases
(a doji in the run, an inside-bar block, a price gap, back-to-back blocks) and candidates the rules reject, each with the
reason (no FVG, no structure break, weak move, price went back below the block first, an opening gap).
`research/study/lit_ob/trade_*.png`: 6 live 2026 LIT trades whose sweep ran into a fresh HTF block (3 winners, 3 losers).

## 2. How the tests were run

- **The trades are the real live LIT trades:** the same sweeps, inducements, 5m CISD, limit at the CISD level, 1m CISD
  confirmation, stop 1 tick beyond the sweep extreme, VIX-band target, breakeven at 1R, Monday rule and weekly stop. Only the
  order-block option changes. Check: with no option the harness gives run `lit_live` exactly (120 trades, +$41,734).
- **Both live sizes:**
  - **eval:** $800 up to a 25-pt stop, then 800 x 25 / stop, never more than 60% of the room to the MFFU trailing floor.
  - **two_week (live since 2026-10-18, config C):** "one winner passes" sizing. It sizes each trade to the target, so a
    "size up when there is a block" rule changes nothing in this mode. Only skips and half sizes do.
- **MFFU Builder 50K evals:** a fresh eval on every session. "2-wk" = pass / fail within 10 sessions, "1-mo" = within 20.
- **Pick on 2026 H1 (Jan 2 - Jun 30), check on 2026 H2 (Jul 1 - Oct 16).** 2021-25 is a reference line (5m only, no 1m data).
- Costs in: $1.40 per micro, 1 tick of slippage on market entries and stop / breakeven / end-of-day exits.

## 3. The results

Each test shows H1 (pick), H2 (check) and the 2021-25 reference. Money columns are the eval mode; the last two columns are the
live two_week mode.

#### The live trade (reference)

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base: live LIT | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 8.8 / 8.1 | 15.8 / 20.8 | 15.4 / 5.6 | +5,131 |

#### Test 2 - the order block as the point of interest

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| POI require 15m/1h/4h body | H1 | 0.16 | 25.0 | 0.41 | -770 | -126 | -1,306 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | -425 |
|  | H2 | 0.51 | 37.5 | 1.42 | +585 | 158 | -930 | 0.0 / 0.0 | 0.0 / 0.0 | 14.5 / 0.0 | +2,729 |
| | 2021-25 ref | 0.37 | 20.3 | 0.73 | -3,939 | -77 | -6,039 | 1.1 / 0.0 | 2.8 / 0.0 | 4.7 / 0.0 | -3,027 |
| POI require loose (3h-6h leg, 2 ATR) | H1 | 0.47 | 33.3 | 4.69 | +6,367 | 1,045 | -1,534 | 7.8 / 0.0 | 22.7 / 0.0 | 12.6 / 0.0 | +3,187 |
|  | H2 | 0.77 | 41.7 | 2.02 | +2,173 | 585 | -772 | 0.0 / 0.0 | 0.0 / 0.0 | 18.8 / 0.0 | +6,203 |
| | 2021-25 ref | 0.61 | 24.6 | 0.78 | -5,397 | -106 | -10,584 | 3.2 / 2.0 | 5.6 / 3.1 | 8.4 / 0.9 | +595 |
| POI require loose 15m/1h/4h/1d | H1 | 0.51 | 30.8 | 4.66 | +6,353 | 1,042 | -1,534 | 7.8 / 0.0 | 22.7 / 0.0 | 12.6 / 0.0 | +3,180 |
|  | H2 | 0.77 | 41.7 | 2.02 | +2,173 | 585 | -772 | 0.0 / 0.0 | 0.0 / 0.0 | 18.8 / 0.0 | +6,203 |
| | 2021-25 ref | 0.62 | 24.8 | 0.73 | -6,453 | -126 | -10,244 | 3.2 / 2.0 | 5.6 / 3.1 | 8.4 / 0.9 | -3 |
| POI require extreme OB only | H1 | 0.27 | 42.9 | 17.43 | +8,404 | 1,379 | -321 | 7.8 / 0.0 | 22.7 / 0.0 | 16.8 / 0.0 | +6,075 |
|  | H2 | 0.58 | 55.6 | 1.81 | +1,342 | 361 | -607 | 0.0 / 0.0 | 0.0 / 0.0 | 15.9 / 0.0 | +5,803 |
| | 2021-25 ref | 0.36 | 21.8 | 0.87 | -1,838 | -36 | -4,161 | 1.2 / 0.9 | 1.8 / 1.9 | 3.8 / 0.0 | +2,260 |
| POI require + breakers | H1 | 0.23 | 16.7 | 0.21 | -1,241 | -204 | -1,576 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | -1,106 |
|  | H2 | 0.71 | 36.4 | 2.09 | +2,001 | 539 | -937 | 0.0 / 0.0 | 0.0 / 0.0 | 18.8 / 0.0 | +3,149 |
| | 2021-25 ref | 0.54 | 20.9 | 0.82 | -3,610 | -71 | -7,475 | 1.1 / 0.0 | 2.8 / 0.7 | 4.0 / 0.0 | -5,549 |
| POI x1.5 when present | H1 | 3.12 | 22.5 | 4.03 | +33,506 | 5,497 | -2,513 | 37.5 / 3.9 | 61.7 / 9.4 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.59 | +11,005 | 2,963 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.99 | -557 | -11 | -14,891 | 10.0 / 8.2 | 16.7 / 22.7 | 15.4 / 5.6 | +5,131 |
| POI x1.25 when present (wick, loose) | H1 | 3.12 | 22.5 | 4.01 | +33,860 | 5,555 | -2,513 | 39.1 / 3.9 | 63.3 / 9.4 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.52 | +10,661 | 2,870 | -2,190 | 29.5 / 0.0 | 48.7 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 1.0 | -392 | -8 | -13,032 | 9.6 / 7.2 | 16.6 / 20.3 | 15.4 / 5.6 | +5,131 |
| POI half size without one | H1 | 3.12 | 22.5 | 4.09 | +18,574 | 3,047 | -1,640 | 17.2 / 0.0 | 43.8 / 0.0 | 2.5 / 0.0 | +12,395 |
|  | H2 | 2.56 | 35.0 | 2.43 | +6,075 | 1,636 | -1,075 | 7.7 / 0.0 | 20.5 / 0.0 | 14.5 / 0.0 | +6,028 |
| | 2021-25 ref | 2.38 | 17.5 | 1.01 | +660 | 13 | -12,059 | 1.8 / 2.1 | 5.1 / 7.7 | 3.8 / 1.9 | +437 |
| POI skip when > 3 ATR from any fresh HTF OB | H1 | 0.74 | 15.8 | 0.84 | -579 | -95 | -2,700 | 0.0 / 0.0 | 0.0 / 0.0 | 16.0 / 0.0 | +2,482 |
|  | H2 | 0.45 | 28.6 | 0.99 | -18 | -5 | -1,060 | 0.0 / 0.0 | 0.0 / 0.0 | 14.5 / 0.0 | +2,338 |
| | 2021-25 ref | 0.6 | 20.9 | 0.98 | -476 | -9 | -6,231 | 2.1 / 0.0 | 4.5 / 0.0 | 6.2 / 0.0 | +2,874 |

#### Test 3 - the order block as the entry

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| entry 5m OB mean threshold (tap + 1m CISD) if within 0.25 of the stop | H1 | 3.09 | 22.8 | 4.51 | +36,650 | 6,013 | -2,285 | 41.4 / 2.3 | 63.3 / 5.5 | 53.8 / 6.7 | +32,728 |
|  | H2 | 2.44 | 34.2 | 2.42 | +9,658 | 2,600 | -2,029 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +9,641 |
| | 2021-25 ref | 2.32 | 17.7 | 0.99 | -932 | -18 | -20,304 | 9.3 / 8.1 | 16.2 / 20.6 | 15.5 / 6.3 | +8,047 |
| entry 5m OB mean threshold (plain limit) if within 0.5 of the stop | H1 | 2.66 | 11.8 | 1.92 | +11,236 | 1,843 | -6,590 | 31.2 / 10.2 | 40.6 / 19.5 | 36.1 / 5.0 | +10,686 |
|  | H2 | 1.99 | 12.9 | 0.51 | -3,366 | -906 | -3,766 | 17.9 / 0.0 | 17.9 / 5.1 | 20.3 / 0.0 | +2,452 |
| | 2021-25 ref | 3.03 | 11.4 | 1.24 | +38,716 | 758 | -18,665 | 24.9 / 32.2 | 29.5 / 55.2 | 29.7 / 14.2 | +28,549 |
| entry 5m OB wick top (shallower tap) | H1 | 3.36 | 22.1 | 3.47 | +28,818 | 4,728 | -2,699 | 29.7 / 3.9 | 44.5 / 15.6 | 43.7 / 10.9 | +23,473 |
|  | H2 | 2.76 | 37.2 | 3.0 | +13,713 | 3,692 | -1,995 | 41.0 / 2.6 | 65.4 / 10.3 | 60.9 / 4.3 | +16,206 |
| | 2021-25 ref | 2.69 | 17.0 | 0.9 | -10,581 | -207 | -21,730 | 9.0 / 13.1 | 14.4 / 29.7 | 19.1 / 9.6 | -14,252 |
| entry 1m OB body edge after the 1m CISD if within 0.15 of the stop | H1 | 2.77 | 18.3 | 2.44 | +16,591 | 2,722 | -2,778 | 28.9 / 3.1 | 43.0 / 15.6 | 42.9 / 5.9 | +18,598 |
|  | H2 | 2.5 | 20.5 | 1.22 | +1,491 | 401 | -4,525 | 19.2 / 1.3 | 30.8 / 10.3 | 31.9 / 0.0 | -14 |
| | 2021-25 ref | 2.34 | 17.6 | 1.06 | +4,610 | 90 | -13,632 | 8.4 / 8.0 | 14.8 / 21.6 | 16.0 / 4.5 | +3,407 |
| entry 1m OB mean threshold after the 1m CISD if within 0.15 of the stop | H1 | 2.93 | 18.7 | 3.54 | +30,451 | 4,996 | -2,411 | 45.3 / 3.9 | 64.1 / 11.7 | 54.6 / 6.7 | +23,172 |
|  | H2 | 2.24 | 34.3 | 1.97 | +6,525 | 1,757 | -1,978 | 29.5 / 2.6 | 48.7 / 11.5 | 52.2 / 7.2 | +7,554 |
| | 2021-25 ref | 2.36 | 17.6 | 1.03 | +2,222 | 44 | -18,218 | 9.6 / 8.2 | 16.1 / 20.6 | 16.5 / 5.6 | +13,027 |

#### Test 4 - the order block as target or obstacle

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| target opposing 15m/1h/4h OB alone | H1 | 2.38 | 23.0 | 2.46 | +11,770 | 1,931 | -3,069 | 24.2 / 3.9 | 34.4 / 7.0 | 31.1 / 4.2 | +14,989 |
|  | H2 | 1.79 | 32.1 | 1.86 | +4,418 | 1,189 | -1,975 | 12.8 / 1.3 | 15.4 / 6.4 | 17.4 / 0.0 | +6,068 |
| | 2021-25 ref | 1.62 | 20.7 | 1.0 | +257 | 5 | -14,812 | 5.9 / 4.0 | 12.1 / 12.7 | 14.7 / 3.0 | -65 |
| target nearer of 1h/4h OB and VIX band | H1 | 3.12 | 23.8 | 4.0 | +32,013 | 5,252 | -2,513 | 37.5 / 3.1 | 62.5 / 6.2 | 52.9 / 9.2 | +28,901 |
|  | H2 | 2.63 | 34.1 | 2.04 | +7,372 | 1,985 | -2,157 | 23.1 / 0.0 | 41.0 / 0.0 | 49.3 / 2.9 | +7,079 |
| | 2021-25 ref | 2.33 | 19.0 | 1.01 | +467 | 9 | -16,662 | 8.3 / 8.1 | 16.5 / 21.4 | 16.4 / 5.1 | -1,442 |
| obstacle skip: opposing 15m/1h OB < 1R | H1 | 2.7 | 21.7 | 3.52 | +25,184 | 4,132 | -2,815 | 25.8 / 3.1 | 43.0 / 11.7 | 46.2 / 6.7 | +21,222 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.23 | 17.4 | 1.0 | +194 | 4 | -17,801 | 8.7 / 9.4 | 14.7 / 20.4 | 14.4 / 5.9 | +10,582 |
| obstacle skip: opposing 15m/1h OB < 1.5R | H1 | 2.58 | 24.2 | 3.94 | +28,173 | 4,622 | -2,376 | 26.6 / 3.1 | 47.7 / 3.1 | 52.1 / 3.4 | +25,631 |
|  | H2 | 2.5 | 35.9 | 2.57 | +10,615 | 2,858 | -2,007 | 29.5 / 0.0 | 47.4 / 0.0 | 53.6 / 2.9 | +10,630 |
| | 2021-25 ref | 2.07 | 18.0 | 1.12 | +8,600 | 168 | -14,228 | 8.2 / 9.1 | 15.3 / 20.7 | 14.1 / 5.6 | +1,685 |
| obstacle skip: opposing 15m/1h OB < 2R | H1 | 2.34 | 23.3 | 4.62 | +28,807 | 4,726 | -2,045 | 33.6 / 2.3 | 48.4 / 2.3 | 54.6 / 3.4 | +25,339 |
|  | H2 | 2.37 | 40.5 | 2.63 | +11,411 | 3,072 | -1,561 | 29.5 / 0.0 | 55.1 / 0.0 | 53.6 / 0.0 | +11,831 |
| | 2021-25 ref | 1.97 | 18.7 | 1.13 | +9,517 | 186 | -15,596 | 8.6 / 6.9 | 16.8 / 17.3 | 14.5 / 4.7 | +8,514 |
| obstacle skip: opposing 15m/1h OB < 2.5R | H1 | 2.27 | 24.1 | 4.67 | +28,893 | 4,740 | -2,017 | 33.6 / 2.3 | 48.4 / 2.3 | 54.6 / 3.4 | +25,390 |
|  | H2 | 2.37 | 40.5 | 2.63 | +11,411 | 3,072 | -1,561 | 29.5 / 0.0 | 55.1 / 0.0 | 53.6 / 0.0 | +11,831 |
| | 2021-25 ref | 1.88 | 19.1 | 1.07 | +4,659 | 91 | -16,831 | 8.8 / 6.9 | 18.1 / 17.3 | 14.7 / 4.5 | +10,729 |
| obstacle skip: opposing 15m/1h OB < 3R | H1 | 1.95 | 24.0 | 4.44 | +26,250 | 4,307 | -2,067 | 33.6 / 3.1 | 49.2 / 4.7 | 53.8 / 6.7 | +23,259 |
|  | H2 | 2.37 | 40.5 | 2.46 | +10,555 | 2,842 | -1,800 | 29.5 / 0.0 | 55.1 / 0.0 | 53.6 / 0.0 | +11,826 |
| | 2021-25 ref | 1.79 | 19.1 | 1.09 | +5,692 | 112 | -17,341 | 8.2 / 6.2 | 16.9 / 14.9 | 14.5 / 4.9 | +11,053 |
| obstacle half: opposing 15m/1h OB < 2R | H1 | 3.12 | 22.5 | 4.07 | +28,225 | 4,631 | -2,028 | 28.9 / 2.3 | 50.0 / 2.3 | 46.2 / 5.9 | +25,269 |
|  | H2 | 2.56 | 35.0 | 2.47 | +10,504 | 2,828 | -2,118 | 29.5 / 0.0 | 47.4 / 0.0 | 53.6 / 2.9 | +10,826 |
| | 2021-25 ref | 2.38 | 17.5 | 1.11 | +8,853 | 173 | -16,752 | 8.7 / 7.4 | 16.3 / 20.2 | 14.0 / 4.7 | +19,089 |

#### Chapter 12 of the second report

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ch12 POI x1.5, origin took liquidity | H1 | 3.12 | 22.5 | 4.11 | +34,377 | 5,640 | -2,513 | 42.2 / 3.1 | 63.3 / 9.4 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.47 | +10,481 | 2,822 | -2,157 | 32.1 / 0.0 | 50.0 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.91 | -7,918 | -155 | -19,251 | 8.5 / 8.4 | 15.5 / 21.2 | 15.4 / 5.6 | +5,131 |
| ch12 POI x1.5, no liquidity beyond the zone | H1 | 3.12 | 22.5 | 4.12 | +34,577 | 5,673 | -2,513 | 42.2 / 3.9 | 62.5 / 9.4 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.49 | +10,389 | 2,797 | -2,234 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.92 | -6,567 | -129 | -16,759 | 9.8 / 8.1 | 16.5 / 22.3 | 15.4 / 5.6 | +5,131 |
| ch12 POI x1.5, no imbalance beyond the zone | H1 | 3.12 | 22.5 | 4.12 | +34,577 | 5,673 | -2,513 | 42.2 / 3.1 | 63.3 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.37 | +9,864 | 2,656 | -2,234 | 32.1 / 0.0 | 50.0 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.95 | -4,054 | -79 | -18,377 | 9.0 / 8.1 | 15.8 / 22.2 | 15.4 / 5.6 | +5,131 |
| ch12 POI x1.5, all origin checks | H1 | 3.12 | 22.5 | 4.11 | +34,377 | 5,640 | -2,513 | 42.2 / 3.1 | 63.3 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.94 | -5,022 | -98 | -19,426 | 8.8 / 8.1 | 15.8 / 21.2 | 15.4 / 5.6 | +5,131 |
| ch12 POI require, all origin checks | H1 | 0.04 | 100.0 | - | +2,680 | 440 | 0 | 0.0 / 0.0 | 0.0 / 0.0 | 8.4 / 0.0 | +3,217 |
|  | H2 | - | - | - | - | - | - | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | - |
| | 2021-25 ref | 0.09 | 26.3 | 0.38 | -1,577 | -31 | -1,862 | 0.9 / 0.0 | 1.9 / 0.0 | 0.9 / 0.0 | +2,313 |
| ch12 target first opposition 15m/1h/4h if >= 1R, else VIX | H1 | 2.97 | 27.6 | 3.42 | +24,227 | 3,975 | -2,374 | 39.1 / 3.9 | 59.4 / 3.9 | 52.9 / 7.6 | +30,005 |
|  | H2 | 2.37 | 37.8 | 1.82 | +5,685 | 1,531 | -1,711 | 14.1 / 0.0 | 32.1 / 0.0 | 40.6 / 0.0 | +6,140 |
| | 2021-25 ref | 2.02 | 22.4 | 1.27 | +19,285 | 378 | -17,494 | 8.7 / 6.7 | 16.6 / 15.2 | 16.9 / 3.9 | +13,894 |

#### Test 5 - HTF order-block entries as new trades

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| OB-only setups 1h/4h/1d depth 0 tol 1 | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.63 | 36.6 | 2.55 | +10,723 | 2,887 | -2,007 | 29.5 / 0.0 | 48.7 / 0.0 | 52.2 / 2.9 | +10,589 |
| | 2021-25 ref | 2.43 | 17.3 | 1.03 | +2,950 | 58 | -15,958 | 8.7 / 8.8 | 15.7 / 23.4 | 15.7 / 6.3 | +3,003 |
| OB-only setups 15m/1h/4h/1d depth 0 tol 1 | H1 | 3.16 | 22.2 | 4.16 | +33,703 | 5,529 | -2,490 | 37.5 / 3.9 | 63.3 / 6.2 | 52.9 / 7.6 | +31,747 |
|  | H2 | 2.69 | 33.3 | 1.83 | +6,152 | 1,656 | -2,069 | 19.2 / 0.0 | 38.5 / 0.0 | 47.8 / 2.9 | +7,650 |
| | 2021-25 ref | 2.48 | 16.9 | 0.97 | -2,907 | -57 | -18,282 | 8.6 / 8.5 | 14.1 / 25.2 | 15.1 / 7.2 | -8,394 |
| OB-inside setups 1h/4h/1d depth 0.25 | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.52 | +10,475 | 2,820 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 52.2 / 2.9 | +12,002 |
| | 2021-25 ref | 2.4 | 17.7 | 1.08 | +7,397 | 145 | -15,306 | 9.6 / 8.8 | 16.0 / 22.8 | 16.2 / 6.3 | +4,625 |
| OB setups (into + inside) 1h/4h/1d as a 2nd trade a day | H1 | 3.16 | 22.2 | 4.0 | +33,292 | 5,462 | -2,526 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,330 |
|  | H2 | 2.63 | 36.6 | 2.56 | +10,732 | 2,890 | -2,007 | 29.5 / 0.0 | 48.7 / 0.0 | 53.6 / 2.9 | +12,110 |
| | 2021-25 ref | 2.44 | 17.2 | 1.06 | +5,224 | 102 | -15,595 | 9.5 / 8.8 | 15.9 / 23.1 | 16.2 / 6.3 | +3,100 |
| OB setups (into + inside) 15m/1h/4h/1d as a 2nd trade a day | H1 | 3.28 | 23.8 | 4.26 | +34,722 | 5,697 | -2,505 | 37.5 / 3.9 | 63.3 / 6.2 | 55.5 / 7.6 | +35,867 |
|  | H2 | 2.69 | 35.7 | 2.53 | +10,671 | 2,873 | -2,069 | 29.5 / 0.0 | 48.7 / 0.0 | 49.3 / 2.9 | +11,932 |
| | 2021-25 ref | 2.55 | 17.0 | 1.03 | +2,762 | 54 | -16,803 | 9.5 / 8.5 | 14.8 / 25.3 | 16.3 / 7.5 | -4,547 |
| OB setups 15m/1h/4h/1d, displacement 0.5 ATR, as a 2nd trade a day | H1 | 3.44 | 23.9 | 4.36 | +36,958 | 6,064 | -2,505 | 43.0 / 3.9 | 64.8 / 6.2 | 57.1 / 7.6 | +36,283 |
|  | H2 | 2.76 | 34.9 | 2.37 | +10,183 | 2,742 | -2,069 | 24.4 / 0.0 | 48.7 / 0.0 | 44.9 / 2.9 | +13,800 |
| | 2021-25 ref | 2.73 | 17.1 | 1.02 | +2,343 | 46 | -17,826 | 10.6 / 8.5 | 15.9 / 27.4 | 17.4 / 7.8 | -9,919 |

#### Owner notes on mitigation (all as HTF block setups, 2nd trade a day, unless POI)

| Test | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | 2-wk pass/fail (eval) | 1-mo pass/fail (eval) | 2-wk pass/fail (two_week) | Net $ (two_week) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mit: OB setups 2nd trade, initial-BoS (peak) blocks only | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.63 | 36.6 | 2.55 | +10,723 | 2,887 | -2,007 | 29.5 / 0.0 | 48.7 / 0.0 | 52.2 / 2.9 | +10,589 |
| | 2021-25 ref | 2.41 | 17.4 | 1.04 | +3,690 | 72 | -17,729 | 8.6 / 8.1 | 15.0 / 21.0 | 15.4 / 5.7 | +3,817 |
| mit: OB setups 2nd trade, FVG right next to the block | H1 | 3.2 | 23.2 | 4.04 | +33,537 | 5,502 | -2,490 | 37.5 / 3.9 | 60.2 / 6.2 | 52.9 / 7.6 | +31,785 |
|  | H2 | 2.63 | 34.1 | 2.5 | +10,414 | 2,804 | -2,218 | 29.5 / 0.0 | 47.4 / 0.0 | 47.8 / 2.9 | +11,824 |
| | 2021-25 ref | 2.46 | 17.0 | 1.01 | +933 | 18 | -18,112 | 9.5 / 9.0 | 15.5 / 23.3 | 15.6 / 6.8 | +3,582 |
| mit: OB setups 2nd trade, trap rule (no untaken liquidity beyond) | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.52 | +10,475 | 2,820 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 52.2 / 2.9 | +12,002 |
| | 2021-25 ref | 2.44 | 17.2 | 1.01 | +1,106 | 22 | -16,431 | 9.6 / 8.8 | 15.6 / 23.7 | 15.9 / 6.5 | +2,466 |
| mit: OB setups 2nd trade, all three | H1 | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 8.4 | +31,342 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 8.8 / 8.1 | 15.8 / 20.8 | 15.4 / 5.6 | +5,131 |
| mit: OB setups 2nd trade, full mitigation box (wick zone) | H1 | 3.24 | 22.9 | 4.59 | +39,064 | 6,409 | -2,501 | 37.5 / 3.9 | 63.3 / 10.9 | 55.5 / 8.4 | +33,687 |
|  | H2 | 2.76 | 34.9 | 2.42 | +10,336 | 2,783 | -2,069 | 24.4 / 0.0 | 48.7 / 0.0 | 44.9 / 2.9 | +15,143 |
| | 2021-25 ref | 2.59 | 18.0 | 1.08 | +7,388 | 145 | -12,204 | 10.2 / 8.8 | 14.4 / 23.2 | 16.2 / 7.2 | -2,834 |
| mit: orderflow continuation, 5m/15m OB-inside as 2nd trade | H1 | 3.24 | 21.7 | 3.33 | +28,169 | 4,621 | -3,568 | 37.5 / 6.2 | 58.6 / 9.4 | 52.9 / 13.4 | +31,596 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.48 | 17.5 | 1.01 | +585 | 11 | -16,203 | 8.4 / 8.1 | 13.6 / 22.9 | 15.7 / 6.5 | -4,044 |
| mit: flip zones (failed demand = supply, retest) 15m/1h/4h/1d as 2nd trade | H1 | 3.16 | 22.2 | 4.01 | +33,303 | 5,464 | -2,515 | 37.5 / 3.1 | 60.2 / 6.2 | 52.9 / 7.6 | +31,338 |
|  | H2 | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 29.5 / 0.0 | 47.4 / 0.0 | 50.7 / 2.9 | +10,481 |
| | 2021-25 ref | 2.41 | 17.6 | 1.04 | +3,330 | 65 | -19,096 | 8.9 / 8.1 | 16.0 / 21.0 | 15.8 / 5.7 | +6,476 |
| mit: POI require, initial-BoS + FVG next to it + trap rule (loose) | H1 | - | - | - | - | - | - | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | - |
|  | H2 | - | - | - | - | - | - | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | - |
| | 2021-25 ref | 0.01 | 0.0 | 0.0 | -512 | -10 | -512 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | -757 |

## 4. What each test says, in plain words

**Test 2 - block as the point of interest (the classic LIT sequence).**
- Liquidity builds, the inducement is taken, then the real liquidity is swept **into** a fresh 15m / 1H / 4H block.
  - Strict version: the first touch of the block happens in the last hour of the sweep leg, and the extreme is no more
    than 1 ATR past the block's far edge.
  - Loose version: up to 6 hours, 2 ATR.
- Only 10 (strict) to 25 (loose) of the 120 live trades do that. In Jan-Jun they average 0.1-0.4R against 0.8-0.9R for
  the rest (1 micro, before sizing).
- **Require it:** 0.2-0.8 trades a week. Far below the 2-a-week minimum, and it loses $27k-35k of Jan-Jun profit.
- **Size up 1.25x / 1.5x when present:** +$200 to +$1,300 in Jan-Jun and -$600 to +$540 in Jul-Oct, eval mode only. The
  2-week and 1-month fails go up a little. Too thin to matter, and it does nothing in the two_week mode.
- **Skip or half when far from any fresh HTF block:** most live trades are far from one. The best trades are the ones more
  than 3 ATR away. It costs $15k-34k.
- **Extreme vs decisional, breakers, daily blocks:** same picture. All under 1 trade a week, none better in both halves.

**Test 3 - block as the entry.** After the 5m CISD the bot knows the 5m block that made it. That block is the down-close run
into the extreme, and its body top **is** the CISD level, so today's limit is already the block's edge.
- **Mean threshold:** a deeper limit at the block's middle, only when it is within 25% / 50% of the stop distance.
  - 25%: +$3.3k in H1 but -$0.8k in H2.
  - 50%: far fewer fills.
- **Plain limit without the 1m confirmation:** loses in H2.
- **Wick top (a shallower limit):** better in H2, worse in H1.
- **1m block after the 1m CISD** (a limit at its edge or middle instead of the next 1m open): worse in both halves. The
  winners leave without a pullback.
- This repeats the earlier finding (`research/lit/entry.md`): deeper LIT limits lose more winners than they save in stop.

**Test 4 - block as target or obstacle.**
- **The nearest opposing fresh block as the target:**
  - Alone: -$22k to -$28k in H1.
  - The nearer of it and the VIX band: -$1.3k to -$7.6k in H1 and -$3.1k to -$4.1k in H2.
  - The VIX band stays.
- **Obstacle (skip a trade when an opposing fresh block is close):**
  - 1R: worse in H1.
  - 1.5R: mixed.
  - 2R to 2.5R: fails drop a lot in both halves. 2-week fails go from 8.4% to 3.4% (H1) and from 2.9% to 0% (H2) with the
    two_week size, and passes on real starts rise (52.9% to 54.6%, 50.7% to 53.6%).
  - But it skips 20 of 80 H1 trades and costs $6,000 there (eval mode -$4,500).
  - The Monte Carlo (4,000 shuffled 20-session paths) shows H1 passes **falling** (50.5% to 47.4%) and H2 rising (55.4% to
    57.8%), fails 6.2% to 3.4% and 5.5% to 2.0%.
  - 3R drops below 2 trades a week.
  - **Verdict: a fail-reducer, not a faster pass.** It does not meet the bar.

**Chapter 12 of the second report** (give each block one job; qualify the origin before refining the box; nested blocks;
first opposition).
- **One job per block:** built in. The point of interest, the entry block, the opposing block and the breaker are separate
  objects, each tested in its own role (tests 2-4).
- **Qualify the origin** (four objections), as checks on the point-of-interest block:
  - "No relevant extension": the detector already demands a structure break.
  - "No qualifying sweep": the block must have taken liquidity.
  - "Liquidity beyond the zone": no untaken LIT level within 2 ATR beyond the far edge.
  - "Imbalance beyond it": no unfilled FVG within 2 ATR beyond the far edge.
  - Results, size x1.5 with each check: H1 +$1.1k to +$1.3k, H2 -$0.6k to +$0. With all four, only 1 trade a year is left.
    Requiring them: 1 trade.
- **Nested blocks:** the extreme-only and decisional-only selectors were run separately (test 2). Every selector gave the
  same answer, with the same sign in both halves: requiring a block loses. The conclusion does not depend on the selector.
- **Protected high / low:** already in the bot. The LIT setup is cancelled when the sweep extreme (the protected low)
  breaks before the fill.
- **Targets from the entry location / first opposition:**
  - First opposing 15m/1H/4H block when it is at least 1R away, else the VIX band: H1 -$9.1k, H2 -$4.8k.
  - 1H/4H only: H1 -$1.3k, H2 -$3.1k.
  - Rejected.

**Test 5 - higher-timeframe blocks as new LIT entries** (the owner's "get entries in that too").
- **Into:** a fresh 1H / 4H / daily (and 15m) block's edge is treated as the liquidity. Price trades into it, then the
  usual inducement, displacement and 5m CISD, and the same 1m entry.
- **Inside:** once price is inside a fresh block, a 5m swing low it makes there is the liquidity. The LIT sweep of that
  internal low, with inducement and CISD, is the setup.
- Of 292 "into" setups in 2026:
  - 65 are the main model's own setups.
  - 88 fail the displacement and 63 the inducement.
  - 53 are valid new setups, but 36 of those fall on days the main model already trades.
- Inside: 97 setups, 8 valid new, 6 on main-model days.
- **On free days only (one trade a day):** +1 to +6 trades a year. H2 is flat or worse.
- **As a second trade a day (after or before the main trade, at most one OB trade a day):**
  - 15m/1H/4H/daily: +10 trades. Eval +$1.4k (H1) / +$0.2k (H2). two_week +$4.5k / +$1.5k. 2-week pass 52.9% to 55.5%
    (H1) but 50.7% to 49.3% (H2). Monte Carlo 50.5% to 52.5% (H1), 55.4% to 55.1% (H2).
  - 1H/4H/daily only: +3 trades, about $0.
  - With the displacement relaxed to 0.5 ATR: +16 trades, H1 up (2-week 57.1%), H2 down (44.9%).
- **Verdict:** the main LIT model already trades almost every HTF block setup. The rest is too small and does not hold in
  Jul-Oct.

**The owner's LIT group notes on mitigation** (`research/lit/owner_lit_notes.md`).

- **(1) The strongest block is the one from the initial break of structure off the peak.**
  - The block must hold the extreme of the last 48 candles of its timeframe (it sits at the peak).
  - As new HTF setups: +1 trade a year. H2 +$258 (eval). two_week 2-week pass H1 unchanged, H2 50.7% to 52.2%.
  - One trade cannot carry a rule.
- **(2) A valid mitigation must have an FVG above / below it.**
  - Already a rule of the detector: no FVG, no block.
  - The stricter version (the FVG must start right at the block's last candle) leaves +5 trades: H1 +$232, H2 -$51. two_week
    H2 47.8% (worse).
- **(3) Induce before mitigate / the trap rule** (untaken liquidity right next to the zone = a likely trap).
  - The zone counts only when no untaken LIT level sits within 2 ATR beyond its far edge.
  - As a filter on the point of interest (chapter 12 row): H1 +$1.3k, H2 -$76.
  - As new setups: +1 trade, H2 +$10.
  - All three rules together: 0 new trades, and 0 point-of-interest trades.
- **(4) Full "mitigation" box vs "refined" box.**
  - The refined box is the body zone (every other test uses it); the full box is the wick zone.
  - With the full box as new setups: +10 trades, H1 +$5.8k (eval) and 2-week pass 55.5%. But H2 -$129 and 2-week pass 44.9%
    (vs 50.7%). It fails the check half.
  - As a point of interest (test 2), the wick box was better in H1 and worse in H2 too.
- **(5) Orderflow mitigation** (continuation into each new lower-high / higher-low block).
  - A LIT sweep inside a fresh 5m / 15m block, as a second trade a day: +5 trades, H1 -$5.1k, 2-week fails 8.4% to 13.4%.
    Rejected.
- **Flip zones** (failed demand becomes supply; the retest is the entry; the owner's "Tips"): +1 trade a year, no change.
  - As a point of interest ("POI require + breakers", test 2) it loses in H1.
  - The wedge-break supply block and the FVG + compression return were not tested (no time today). They need a wedge /
    compression detector first.

## 5. Recommendation

- **Adopt nothing.** No order-block rule improves both 2026 halves under the live two_week sizing, and none keeps more money
  in Jan-Jun.
- **The detector stays useful:**
  - `engine/lit_ob.py` (pure, tested, no look-ahead) can draw the blocks on the dashboards with `chart_zones()`.
  - The harness `tools/lit_ob.py` can re-test any order-block idea on the live LIT trade.
- **Watch list:**
  - The 2R obstacle rule as a possible "safe eval" switch, if the owner ever prefers fewer fails over passes.
  - HTF block setups as a 2nd trade a day, once there is more 1m data.
- Engine options would be: `ob_obstacle: {"tfs": ["15m","1h"], "rr": 2.0}` and
  `ob_setups: {"tfs": ["15m","1h","4h","1d"], "second": true}`. Neither is implemented in the engine: neither passed.

## Files

- Detector: `engine/lit_ob.py` (`python -m engine.lit_ob` self-test).
- Harness: `tools/lit_ob.py` (`check`, `grid`, `save`, `charts`, `detector`).
- Every number: `research/lit/ob_results.json`; Monte Carlo of the two candidates: `research/lit/ob_mc.json`.
- Charts: `research/study/lit_ob/`.
- Runs: `lit_ob_*` (family other, tags lit, lit_ob). The stored trades are the eval-mode path; the verdict of each run
  carries both sizes.
