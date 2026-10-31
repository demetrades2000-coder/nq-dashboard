## In one minute

- **The trade (2026-10-28):** short 5 MNQ at 29,945.00 (03:43 ET). The stop was 29,987.50, 42.5 pts, 1 tick above the
  03:13 sweep high. The target was 29,665.75.
  - At 03:56 price reached 29,904.50 (+0.95R). Breakeven at 1R never came.
  - Then four big green 1m candles (03:56-03:59, about 18-22 pts each, 2-3x the usual 1m range) took it back up. The stop
    filled at 04:01 @ 29,987.75: **-$437.**
  - Our replay of the live rules on the NinjaTrader bars gives exactly that: STOP, 04:01, 29,987.75, -$437.
- **The owner's ideas:** "we should have trailed", "the stop shouldn't be that big, maybe at the first highs", "after those
  long green candles the bot should have known we were reversing".
- **The answer: none of these rules makes more money in both halves of 2026. Nothing changes in the bot.**

| Idea (best or closest version) | Today's trade | 2026 H1 change | 2026 H2 change | 2021-25 (ref) | Verdict |
|---|---:|---:|---:|---:|---|
| Live (no change) | **-$437** | - | - | - | stays |
| Exit at the next open after one big reversal candle (>= 2 ATR), once +0.9R | **+$168** | **-$9,082** | **-$2,317** | +$43 | reject |
| Same, needs a 3-ATR candle (the only exit version with H2 up) | -$437 (doesn't fire) | -$2,741 | +$1,049 | -$1,940 | reject |
| Stop to entry + 1.25 after 2 reversal candles (>= 2 ATR), once +0.75R | $0 | -$1,433 | +$155 | +$2,458 | reject |
| Exit when half the best open profit is given back, once +0.9R | +$168 | -$17,000 | -$6,693 | -$1,916 | reject |
| Trail on 1m swings once +0.9R | +$113 | -$19,171 | -$8,713 | +$10,960 | reject |
| Trail on 5m swings once +0.75R | -$437 | -$8,091 | -$2,854 | +$3,637 | reject |
| Breakeven at 0.9R (instead of 1R) | $0 | -$931 | -$579 | -$4,382 | reject |
| Breakeven at 0.75R | $0 | -$6,501 | -$5,049 | -$14,170 | reject (again) |
| Stop at the first 1m highs, size follows the stop | $0 (BE, 7 micros) | +$29,330 | **-$13,147** | -$1,023 | reject |
| Stop at the first 5m highs, target re-banked at 8R | -$437 (no 5m swing) | +$2,392 | -$1,284 | +$3,238 | reject |

$ are at the LIT size rule (run `lit_live`, costs in). The eval-path numbers are below.

- **Why it doesn't work:** LIT winners snap back hard too. After +0.5-1R a winner often prints the same 2-3 big candles
  against us before it runs to the target. In 2026:
  - **Not one trade before today went 0.9-1R and then hit the full stop.**
  - Only 4 trades went 0.75-0.9R and then stopped: -$917 in total, all year.
  - The 15 + 10 target winners pay $52.5k. A rule that cuts 1 of them costs more than all 4 of those losses.
- **"Stop at the first highs"** fits the owner's own principle badly, and it fails the check:
  - It makes H1 look huge (+$29k), only because the size rule then buys more micros: the median stop on the 104 trades it changes is 18 pts instead of 47.
  - In H2 the tight stop gets wicked out on 11 winners (-$15.8k), PF 0.75.
  - The same result as `lit-tight-stops-size.md` (2026-10-18). The stop stays 1 tick beyond the sweep extreme.

## How it was tested

- **Same trades:** `tools/lit_rev_exit.py` takes the live LIT trades from `tools/lit_final.run(live_model.json "lit")`
  (631 trades, 120 in 2026, = run `lit_live` +$43,820 / 2021-25 +$1,265).
  - Only what happens after the fill changes. One trade a day and flat at 15:55, so the trade list never changes.
  - The executor is the post-fill part of `engine/lit.simulate_x`: stop before target inside a bar, BE at 1R to
    entry + 1.25, the 15-minute check, flat at 15:55.
  - With every new rule off, `check` gives every live trade's exit and points exactly (0 mismatches, 0 size mismatches),
    plus today's -$437.
- **Data:**
  - 2026: true 1m CME NQ bars (data/NQ_1m.csv).
  - 2021-25: no 1m bars, so 5m bars. Candles, ATR and swings are 5m there, and there is no 15-minute check (as live).
    It is a reference line only.
  - Today's trade: the PC's NinjaTrader 1m bars on the heartbeat branch (`bars_1m.csv.gz`).
- **No look-ahead:**
  - Every rule decides at a 1m close and acts at the next 1m open, minus 1 tick.
  - A moved stop fills at its level, or at the bar's open on a gap through it.
  - Swings (fractal, 2 bars each side) count only once confirmed.
- **The rules:**
  - **Reversal.** Once the best point is >= k R (k = 0.5 / 0.75 / 0.9), one of these triggers fires:
    - one 1m candle closing against by >= m x ATR(14) (m = 1.5 / 2 / 3);
    - 2 candles in a row against (>= 2 / 3 ATR), or 3 in a row (>= 2.5 / 3.5 ATR);
    - the close gives back >= 50 / 75% of the best open profit.
  - **What happens then:** exit at the next open, or the stop to entry + 1.25, or the stop to entry.
  - **Trail.** Once +k R (0.5 / 0.75 / 0.9 / 1.0), the stop ratchets to 1 tick beyond the last confirmed 1m or 5m swing
    since the fill. "lock" = only once that swing is past entry + 1.25.
  - **Near-1R breakeven.** BE at 0.75R or 0.9R, still at entry + 1.25.
  - **First highs.** The stop goes 1 tick beyond the nearest confirmed swing (1m or 5m) between the entry and the sweep
    extreme, untaken before the fill and >= 8 pts away. If there is none, the live stop stays.
    - Size, the BE level and the 15-minute check follow the new stop.
    - The target stays the same price ("same"), or is re-banked at 8 new R ("cap8").
- **Money:**
  - **(1) The LIT size rule** (as `lit_live`): $800 up to 20 pts, the weekly half size, $1.40 + 1 tick.
  - **(2) The live eval path:** `lit_sizing` two_week (room_f 0.8, no weekly loss stop, safe_eval after session 10,
    $1.90), with a new eval after a pass, a fail or 10 sessions. The eval odds start a fresh MFFU 50K eval on every session
    of the half (`tools/lit_adv_manage.run_eval`), plus a 2,000-path Monte Carlo.
- **Judging (LIT rule):** pick on 2026 H1, check on H2. 2021-25 is only a reference.
- **All 103 variants:** `research/lit/rev_exit_results.json`.

## Results (selected; all variants in the JSON)

**LIT size rule** (trades/week 3.12 H1 / 2.56 H2 / 2.38 2021-25 and weeks with 2+ trades 85 / 81 / 76% in every row;
the eval columns are a fresh eval on every session at this size):

| Rule | Half | Win % | PF | Net $ | $/mo | Max DD | Total R | 2-wk pass/fail | dec10 | slow pass | median | Winners cut ($) | Losers saved ($) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live** | H1 | 58.8 | 4.98 | +33,901 | 5,562 | -2,196 | 69.2 | 36.7 / 1.6 | 38.3 | 24.1 | 10 | - | - |
| | H2 | 50.0 | 2.91 | +9,919 | 2,670 | -1,396 | 30.4 | 23.1 / 0.0 | 23.1 | 65.3 | 21 | - | - |
| | 21-25 | 53.8 | 1.01 | +1,265 | 25 | -19,426 | 18.1 | 6.0 / 13.3 | 19.3 | 62.8 | 20 | - | - |
| Exit on a >= 2 ATR reversal candle, after +0.9R | H1 | 56.2 | 3.73 | +24,819 | 4,072 | -1,840 | 61.0 | 28.9 / 1.6 | 30.5 | 37.9 | 13 | 6 (-11,724) | 0 |
| | H2 | 45.0 | 2.36 | +7,602 | 2,047 | -1,407 | 20.9 | 11.5 / 0.0 | 11.5 | 74.6 | 23 | 6 (-3,504) | 0 |
| | 21-25 | 53.6 | 1.01 | +1,308 | 26 | -19,786 | 21.6 | 6.5 / 13.3 | 19.8 | 61.3 | 19 | 8 (-8,317) | 4 (+710) |
| Exit on a >= 3 ATR reversal candle, after +0.5R | H1 | 58.8 | 4.66 | +31,160 | 5,112 | -2,196 | 63.0 | 28.9 / 1.6 | 30.5 | 34.5 | 12 | 2 (-3,083) | 0 |
| | H2 | 50.0 | 3.11 | +10,968 | 2,953 | -1,047 | 33.8 | 23.1 / 0.0 | 23.1 | 64.0 | 20 | 0 | 0 |
| Stop to entry + 1.25 after 2 reversal candles (>= 2 ATR), after +0.75R | H1 | 56.2 | 4.60 | +32,468 | 5,327 | -2,129 | 67.2 | 36.7 / 1.6 | 38.3 | 23.3 | 10 | 2 (-1,500) | 1 (+67) |
| | H2 | 47.5 | 3.00 | +10,074 | 2,712 | -1,280 | 31.8 | 23.1 / 0.0 | 23.1 | 65.3 | 21 | 2 (-104) | 2 (+259) |
| | 21-25 | 53.4 | 1.04 | +3,723 | 73 | -17,715 | 22.1 | 6.0 / 13.2 | 19.2 | 65.9 | 21.5 | 3 (-506) | 9 (+2,412) |
| Exit after giving back 50% of the best profit, after +0.9R | H1 | 58.8 | 2.98 | +16,901 | 2,773 | -2,107 | 45.2 | 15.6 / 1.6 | 17.2 | 54.4 | 17 | 10 (-23,215) | 0 |
| | H2 | 50.0 | 1.62 | +3,226 | 869 | -1,231 | 9.4 | 9.0 / 0.0 | 9.0 | 84.4 | 38 | 9 (-8,464) | 0 |
| Trail on 1m swings, after +0.9R | H1 | 57.5 | 2.72 | +14,730 | 2,417 | -2,253 | 35.9 | 8.6 / 1.6 | 10.2 | 65.0 | 20 | 14 (-25,368) | 0 |
| | H2 | 50.0 | 1.23 | +1,206 | 325 | -1,918 | 4.4 | 0.0 / 0.0 | 0.0 | - | - | 12 (-9,574) | 0 |
| | 21-25 | 54.4 | 1.13 | +12,225 | 239 | -14,890 | 40.5 | 4.9 / 11.3 | 16.2 | 73.4 | 24 | 41 (-32,180) | 9 (+3,972) |
| Trail on 5m swings, after +0.9R | H1 | 58.8 | 4.01 | +25,699 | 4,216 | -1,928 | 53.2 | 32.8 / 1.6 | 34.4 | 33.7 | 12 | 8 (-12,733) | 0 |
| | H2 | 47.5 | 2.37 | +7,443 | 2,004 | -1,396 | 20.5 | 16.7 / 0.0 | 16.7 | 70.1 | 23 | 7 (-3,033) | 0 |
| Breakeven at 0.9R | H1 | 58.8 | 4.87 | +32,970 | 5,409 | -2,196 | 67.8 | 36.7 / 1.6 | 38.3 | 23.3 | 10 | 1 (-931) | 0 |
| | H2 | 50.0 | 2.80 | +9,340 | 2,515 | -1,396 | 26.6 | 19.2 / 0.0 | 19.2 | 68.1 | 21.5 | 1 (-579) | 0 |
| | 21-25 | 55.6 | 0.97 | -3,117 | -61 | -19,774 | 8.3 | 4.8 / 12.8 | 17.6 | 62.9 | 22 | 6 (-6,883) | 9 (+3,598) |
| Breakeven at 0.75R | H1 | 61.3 | 4.47 | +27,400 | 4,495 | -2,063 | 61.9 | 28.9 / 1.6 | 30.5 | 48.0 | 15 | 2 (-7,141) | 2 (+638) |
| | H2 | 55.0 | 1.99 | +4,870 | 1,311 | -1,395 | 15.2 | 10.3 / 0.0 | 10.3 | 78.6 | 25.5 | 4 (-5,335) | 2 (+286) |
| Stop at the first 1m highs (target same) | H1 | 56.2 | 3.92 | +63,231 | 10,374 | -6,826 | 92.8 | 50.8 / 23.4 | 74.2 | 1.3 | 5 | 12 (-15,010) | 8 (+1,843) |
| | H2 | 45.0 | **0.75** | **-3,228** | -869 | -8,849 | 2.0 | 15.4 / **47.4** | 62.8 | 0.0 | 6 | 11 (-15,787) | 5 (+971) |
| | 21-25 | 53.8 | 1.00 | +242 | 5 | -26,328 | 19.5 | 10.9 / 18.5 | 29.4 | 39.9 | 13 | 20 (-13,072) | 24 (+5,139) |
| Stop at the first 5m highs (target re-banked at 8R) | H1 | 58.8 | 4.63 | +36,293 | 5,954 | -2,196 | 74.9 | 48.4 / 2.3 | 50.7 | 23.5 | 8 | 2 (-1,785) | 3 (+244) |
| | H2 | 45.0 | 2.37 | +8,635 | 2,325 | -1,503 | 27.8 | 17.9 / 0.0 | 17.9 | 65.3 | 23 | 2 (-656) | 0 |
| | 21-25 | 53.8 | 1.04 | +4,503 | 88 | -26,328 | 27.3 | 11.4 / 18.5 | 29.9 | 38.1 | 12 | 20 (-13,072) | 24 (+5,139) |

"Winners cut" = trades that made money live and make less here. "Losers saved" = losing trades that lose less. The rest of
the change (the "first highs" stop above all) is size: a tighter stop buys more micros on the same trade.

**Live eval path (two_week sizing, MFFU 50K; a new eval after a pass, a fail or 10 sessions):**

| Rule | Half | PF | Net $ | $/mo | Max DD | 2-wk pass/fail | MC 2-wk | dec10 | 3-wk pass/fail | slow pass | median | Evals P/F/open |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Live** | H1 | 3.51 | +34,822 | 5,713 | -3,915 | 57.1 / 1.7 | 53.4 / 3.5 | 58.8 | 64.9 / 1.8 | 18.7 | 6 | 13/1/8 |
| | H2 | 2.51 | +16,264 | 4,379 | -2,436 | 52.2 / 5.8 | 56.6 / 2.4 | 58.0 | 53.1 / 6.2 | 25.8 | 5 | 6/1/5 |
| Exit on a >= 2 ATR candle, after +0.9R | H1 | 2.88 | +27,946 | 4,585 | -3,807 | 44.5 / 1.7 | 45.9 / 3.2 | 46.2 | 60.5 / 1.8 | 26.6 | 9 | 9/1/9 |
| | H2 | 2.37 | +13,973 | 3,762 | -2,419 | 47.8 / 0.0 | 43.5 / 2.2 | 47.8 | 53.1 / 0.0 | 30.2 | 8 | 4/0/7 |
| Exit on a >= 3 ATR candle, after +0.5R | H1 | 3.38 | +31,062 | 5,096 | -3,915 | 53.8 / 1.7 | 49.4 / 3.4 | 55.5 | 64.0 / 1.8 | 18.9 | 6 | 11/1/8 |
| | H2 | 2.89 | +20,439 | 5,503 | -2,367 | 53.6 / 0.0 | 58.8 / 2.2 | 53.6 | 54.7 / 0.0 | 25.4 | 5 | 7/0/5 |
| BE after 2 reversal candles, after +0.75R | H1 | 3.43 | +34,122 | 5,598 | -3,954 | 57.1 / 1.7 | 53.1 / 3.6 | 58.8 | 65.8 / 1.8 | 14.8 | 5 | 13/1/8 |
| | H2 | 2.62 | +16,744 | 4,508 | -2,388 | 55.1 / 0.0 | 58.8 / 1.9 | 55.1 | 54.7 / 0.0 | 28.8 | 5 | 6/0/6 |
| Trail on 1m swings, after +0.9R | H1 | 1.80 | +11,753 | 1,928 | -3,829 | 14.3 / 3.4 | 18.8 / 3.5 | 17.7 | 26.3 / 3.5 | 55.9 | 17 | 3/2/11 |
| | H2 | 1.06 | +593 | 160 | -4,116 | 0.0 / 1.4 | 0.4 / 3.0 | 1.4 | 6.2 / 1.6 | 50.0 | 15.5 | 0/0/8 |
| Breakeven at 0.9R | H1 | 3.47 | +34,290 | 5,626 | -3,915 | 57.1 / 1.7 | 53.3 / 3.4 | 58.8 | 64.9 / 1.8 | 18.7 | 6 | 13/1/8 |
| | H2 | 2.40 | +15,106 | 4,067 | -2,436 | 50.7 / 5.8 | 56.2 / 2.4 | 56.5 | 53.1 / 6.2 | 26.7 | 5 | 5/1/5 |
| Stop at the first 1m highs | H1 | 4.11 | +31,549 | 5,176 | -3,121 | 54.6 / 1.7 | 53.1 / 0.8 | 56.3 | 64.9 / 1.8 | 22.1 | 6 | 10/0/9 |
| | H2 | 1.75 | +5,770 | 1,553 | -4,118 | 43.5 / 2.9 | 29.9 / 3.0 | 46.4 | 42.2 / 6.2 | 0.0 | 6 | 3/0/6 |
| Stop at the first 5m highs, 8R | H1 | 3.45 | +35,159 | 5,768 | -3,915 | 63.9 / 2.5 | 57.5 / 4.5 | 66.4 | 71.9 / 2.6 | 10.9 | 5 | 13/1/8 |
| | H2 | 2.60 | +18,450 | 4,967 | -2,414 | 55.1 / 0.0 | 56.3 / 3.8 | 55.1 | 53.1 / 0.0 | 24.6 | 5 | 7/0/6 |

- **The near-misses:**
  - "Exit on a 3-ATR reversal candle after +0.5R" and "BE after 2 reversal candles after +0.75R" are up in H2 on both
    sizings, but **down in H1** (-$2,741 / -$1,433 at the LIT size; -$3,760 / -$700 on the eval path). They change only
    2-4 trades a half, and neither fires on today's trade.
  - "First 5m highs, 8R" is up on the eval path in both halves (+$337 / +$2,186, 2-week pass 57.1 -> 63.9 and 52.2 -> 55.1).
    But it is **down at the LIT size in H2** (-$1,284, PF 2.91 -> 2.37), and 2-week fails rise in H1 (1.7 -> 2.5) and in
    both MCs (3.5 -> 4.5, 2.4 -> 3.8). It changes 28 trades in 2026 (5 in H2), and it did nothing for today's trade
    (there was no 5m swing). Not proven: rejected.
- **Not redone:** these ideas were already rejected before:
  - the "trade is wrong" exits before the trade works, and the 1m BOS structure trail after 1R (`lit-1m-management.md`);
  - BE later / on structure, and BE at 0.75R (`lit-adv-management.md`);
  - profit locks and time-based BE (`lit-untested-stops.md`);
  - the 1m protected-swing stop (`lit-tight-stops-size.md`).

  What is new here: the trigger needs the trade to have **worked first** (+0.5-0.9R), then reverse violently (ATR candles
  or giving back the profit). That is today's pattern exactly, and it loses as well.

## What this means for the bot

- **Nothing changes.** The stop stays 1 tick beyond the sweep extreme, breakeven stays at +1R (entry + 1.25), and the
  target, the 15-minute check and flat at 15:55 stay the same.
- **Today's -$437 was a normal LIT loss of about 1R** (the plan's risk), not a management failure. A trade that reaches
  0.95R and then stops out happened 0 times in 2026 before today, and 9 times in 511 trades in 2021-25.
- **What the "discretion" would cost:** the 1m chart cannot tell today's reversal from a winner's pullback. The same
  candles show up on the way to the 2026 targets that paid $52.5k.
- **If the owner wants to watch it:** "BE after 2 reversal candles >= 2 ATR once +0.75R" would have scratched today's
  trade ($0). In 2026 it is -$1.4k H1 / +$0.2k H2, which is roughly neutral but not proven. Re-run it once H2 has more
  trades: `python -X utf8 tools/lit_rev_exit.py grid rev_run2_k0.75_m2.0_be`.

## Honest caveats

- The H2 sample is small: 40 trades, of which 10 hit the target. Most variants touch 1-12 trades a half.
- 2021-25 runs on 5m bars, so its candles, ATR and swings are 5-minute ones. It is a reference only.
- Today's trade is replayed on the PC's NinjaTrader MNQ bars. Its "first highs" size (7 micros) is the same $ risk as
  the live 5 micros, not a full two_week re-size.

## Reproduce

- `python -X utf8 tools/lit_rev_exit.py check`: the executor equals the live trades (exit + points + size), and today's
  -$437.
- `python -X utf8 tools/lit_rev_exit.py grid`: 103 variants -> `research/lit/rev_exit_results.json` (~12 min, 1 process).
- `python -X utf8 tools/lit_rev_exit.py save`: stores runs `lit_rev_*` (tags `lit`, `lit_rev_exit`).
