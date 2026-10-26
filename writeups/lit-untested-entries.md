## In one minute

- **The owner's order (2026-10-18):** "Remember our strategy is LIT based, nothing that goes outside. Try every single one of
  these and go find more we haven't tested."
- **What was tested:** 4 entry ideas, **33 variants** (2-8 settings each, plus neighbours of the best one). Every variant uses the
  live LIT setups, the live stop (1 tick beyond the sweep extreme), the VIX-band target, breakeven at +1R and flat at 15:55.
  Only **how and when the trade is entered** changes.
- **The answer:**

| Idea | Best version (picked on Jan-Jun) | H1 Δ net $ | H2 Δ net $ | Trades/wk H1 / H2 | Verdict |
|---|---|---:|---:|---:|---|
| 1. Buy-stop 1 tick beyond the 1m CISD candle | cancel after 3 bars | −398 | −4,844 | 2.81 / 2.12 | **REJECT** |
| 2. Chase a missed limit on a 1m pullback CISD | after the 30-min limit expired, < 40% of the way, 60 min | −4,563 | −401 | 3.48 / 2.69 | **REJECT** |
| 3a. ES SMT: bigger size when ES did not take its level | ×1.5 | +730 | −228 | 3.12 / 2.56 | **REJECT** (×1.25: +433 / −615) |
| 3b. ES SMT as a filter (only SMT setups) | - | −29,967 | −11,966 | 0.66 / 0.83 | **REJECT** (and far under 2/wk) |
| 3c. ES SMT as the 1m trigger (instead of the 5m CISD) | with a 0.8 ATR displacement, 60 min | −682 | −3,200 | 3.59 / 3.40 | **REJECT** |
| 4. LIT opening model (09:30-10:00 sweep, 1m CISD) | overnight high/low only, depth 0.25 ATR, entry by 10:00 | **+1,589** | **+839** | 3.36 / 2.95 | **ADOPT-candidate (small, thin)** |

- **The live entry stays as it is** (run `lit_u_entries_base`, equal to `lit_tight_eval_800_25_room60`):
  - **Jan-Jun:** PF 4.01, +$33,305 ($5,464/mo), max DD −$2,513, 2-week eval 37.5% pass / 3.1% fail, pass rate 92.3%, median 10.5 sessions.
  - **Jul-Oct:** PF 2.51, +$10,465 ($2,818/mo), max DD −$2,157, 2-week eval 29.5% / 0.0%, pass rate 95.7%, median 17.5 sessions.
- **The one candidate, the opening model on the overnight range,** passes the rule (more money in both halves, 2-4 trades a week):
  - **Jan-Jun:** PF 4.10, +$34,894 ($5,725/mo), 2-week 34.4/3.1, 1 month 58.6/6.2, pass rate 91.3%.
  - **Jul-Oct:** PF 2.41, +$11,304 ($3,043/mo), 2-week 30.8/0.0, 1 month 61.5/1.3, pass rate 94.7%.
  - **But be careful with it:**
    - It adds only 6 trades in Jan-Jun (1 winner) and 7 in Jul-Oct (2 winners). One big winner (2026-03-19, +221 pts) carries Jan-Jun.
    - Letting it enter until 10:15 or 10:30 instead of 10:00 loses money in Jan-Jun (−$4.0k).
    - Its stops are wide (45-80 pts), so it trades small.
    - **Recommendation:** add it to the engine **switched off**, run it as a paper shadow for a few months, and switch it on only
      if the shadow agrees.

## How it was tested

- **The data:** CME NQ1! futures from TradingView only: 5m, 1m for 2026, VIX daily. ES1! 5m (`data/ES_5m.csv`, from 2025-04) for
  SMT. There is no official ES 1m file, so SMT uses closed ES 5m candles. Official CME data only (TradingView / NinjaTrader), no CFD.
- **Same signals:** `tools/lit_t_entries.py` wraps `engine/lit.py` without editing it. With every new option off it reproduces
  the live bot trade for trade: 630 trades of run `lit_live` (120 in 2026, +$41,734 at the LIT size). It also reproduces the
  baseline run `lit_tight_eval_800_25_room60` to the dollar (`python tools/lit_t_entries.py check`).
- **The live eval sizing:**
  - $800 up to a 25-pt stop, then 800 × 25 ÷ stop;
  - half size after 2 stop-outs in a week;
  - never more than 60% of the room to the MFFU trailing max-loss floor;
  - max 40 micros.
  - **Size follows the stop:** a wider stop means fewer micros.
- **Costs in:** $1.40 per micro round trip, plus 1 tick of slippage on market and stop-order entries and on stop, breakeven and
  end-of-day exits.
- **No look-ahead:** every decision uses closed 1m bars (ES: closed 5m bars). A new setup from the 1m detector (ideas 3c and 4)
  enters at the next 1m open. It competes with the live setups first come, first served: one trade a day, never two at once.
- **The judge:** pick on **H1** (Jan 2 - Jun 30 2026), check on **H2** (Jul 1 - Oct 16 2026). A change is adopted only if it makes
  more money in **both** halves and keeps 2-4 trades a week.
- **2021-25 is a reference line only.** There are no 1m bars there, so the 1m rules run on 5m candles. ES starts in 2025-04, so
  the SMT rules only touch Apr-Dec 2025.
- **The columns:**
  - Net $, $/mo, max DD, PF, win % and the average win and loss come from back-to-back MFFU 50K evals, like the baseline run.
  - The eval odds start a fresh eval on every session ($3,000 target, $2,000 trailing max loss, $1,000 daily loss limit).
  - "2 wk" = passed or failed within 10 sessions, "1 mo" = within 20.
  - Median = the median number of sessions to a pass.
  - Δ = net $ minus the live strategy's in the same period.

## Idea 1: buy-stop entry beyond the 1m CISD candle

**The rule tested:** the live bot buys at the next 1m open once a 1m candle closes back above the CISD level (the 1m CISD). Here it
places a **buy-stop 1 tick above that candle's high** (sell-stop below the low for shorts) and cancels it after 3, 5 or 10 bars,
or when the sweep extreme breaks first. The idea is "only get in once price proves itself".

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions | Δ net vs live |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |  |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |  |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |  |
| bstop 3 | H1 (pick) | 2.81 | 23.6 | 4.54 | +32,907 | +5,399 | -2,660 | 2,483 | -169 | 37.5/2.3 | 58.6/7.8 | 88.7 | 9.5 | -398 |
|  | H2 (check) | 2.12 | 33.3 | 1.94 | +5,621 | +1,513 | -2,072 | 1,056 | -273 | 19.2/0.0 | 42.3/0.0 | 97.0 | 20.0 | -4,844 |
|  | 2021-25 (ref) | 1.88 | 19.8 | 1.06 | +4,064 | +80 | -17,625 | 953 | -223 | 6.6/7.6 | 12.8/19.7 | 30.4 | 18.0 | +5,494 |
| bstop 5 | H1 (pick) | 2.93 | 25.3 | 4.21 | +31,110 | +5,104 | -2,092 | 2,147 | -173 | 37.5/2.3 | 58.6/5.5 | 92.0 | 10.0 | -2,195 |
|  | H2 (check) | 2.12 | 33.3 | 1.94 | +5,621 | +1,513 | -2,072 | 1,056 | -273 | 19.2/0.0 | 42.3/0.0 | 97.0 | 20.0 | -4,844 |
|  | 2021-25 (ref) | 1.98 | 19.5 | 1.05 | +3,679 | +72 | -17,300 | 980 | -227 | 7.6/7.6 | 14.7/19.8 | 32.2 | 18.0 | +5,109 |
| bstop 10 | H1 (pick) | 3.01 | 24.7 | 4.02 | +30,276 | +4,967 | -2,092 | 2,121 | -173 | 37.5/2.3 | 58.6/6.2 | 91.8 | 10.0 | -3,029 |
|  | H2 (check) | 2.31 | 33.3 | 1.99 | +5,966 | +1,606 | -2,187 | 997 | -250 | 19.2/0.0 | 42.3/0.0 | 95.5 | 20.0 | -4,499 |
|  | 2021-25 (ref) | 2.05 | 19.1 | 1.08 | +6,391 | +125 | -14,442 | 1,017 | -222 | 7.5/8.7 | 14.7/21.7 | 32.5 | 18.0 | +7,821 |

**Verdict: REJECT.** H2 loses $4.5-4.8k in every setting.

**Why, in plain words:**
- The buy-stop always fills **higher** than the next open (2 ticks above the candle's high instead of 1 tick above the open). The
  stop does not move, so the risk is bigger and the size smaller on every trade.
- It skips the trades that never break the candle's high. In Jul-Oct those skipped trades were the good ones: 7 skipped trades
  made +$3,740 (3 winners). In Jan-Jun the 5 skipped trades lost $1,061.
- The higher PF in Jan-Jun (4.54) comes from fewer trades, not more money.

## Idea 2: chase a missed limit on a 1m pullback

**The rule tested:** when the 30-min limit at the CISD level is **never tapped** and price runs toward the target, the bot looks
for the first 1m pullback that makes a 1m CISD in the trade's direction. It buys the next 1m open, but only while that price is
less than 25%, 40% or 60% of the way from the limit to the target. The stop stays 1 tick beyond the sweep extreme.
- **"exp"** = only after the 30-min limit has expired, for 60 (or 120) more minutes. **"any"** = also while the limit still works.
- "half" = chase trades at half size.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions | Δ net vs live |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |  |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |  |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |  |
| chase exp 0.25 60m | H1 (pick) | 3.44 | 20.5 | 3.35 | +27,768 | +4,556 | -2,546 | 2,199 | -169 | 36.7/7.8 | 58.6/9.4 | 87.8 | 10.0 | -5,537 |
|  | H2 (check) | 2.69 | 33.3 | 2.43 | +10,064 | +2,710 | -2,262 | 1,220 | -251 | 28.2/0.0 | 47.4/9.0 | 68.0 | 15.0 | -401 |
|  | 2021-25 (ref) | 2.7 | 16.9 | 0.9 | -9,740 | -191 | -21,272 | 886 | -201 | 8.7/9.4 | 13.7/26.3 | 28.6 | 19.0 | -8,310 |
| chase any 0.25 60m | H1 (pick) | 3.55 | 19.8 | 2.83 | +24,033 | +3,943 | -2,483 | 2,065 | -180 | 28.9/7.8 | 44.5/18.8 | 61.8 | 9.0 | -9,272 |
|  | H2 (check) | 2.95 | 26.1 | 2.35 | +9,460 | +2,547 | -2,123 | 1,373 | -206 | 24.4/0.0 | 47.4/0.0 | 97.3 | 19.5 | -1,005 |
|  | 2021-25 (ref) | 2.74 | 16.5 | 0.81 | -18,230 | -357 | -26,029 | 798 | -195 | 8.7/9.6 | 13.7/29.7 | 27.3 | 18.0 | -16,800 |
| chase exp 0.4 60m | H1 (pick) | 3.48 | 21.3 | 3.43 | +28,742 | +4,715 | -2,546 | 2,134 | -169 | 36.7/7.8 | 58.6/9.4 | 87.8 | 10.0 | -4,563 |
|  | H2 (check) | 2.69 | 33.3 | 2.43 | +10,064 | +2,710 | -2,262 | 1,220 | -251 | 28.2/0.0 | 47.4/9.0 | 68.0 | 15.0 | -401 |
|  | 2021-25 (ref) | 2.71 | 17.2 | 0.95 | -4,554 | -89 | -16,984 | 918 | -200 | 8.8/9.6 | 13.8/26.2 | 30.1 | 20.0 | -3,124 |
| chase any 0.4 60m | H1 (pick) | 3.59 | 20.7 | 2.9 | +25,007 | +4,103 | -2,483 | 2,007 | -180 | 28.9/7.8 | 44.5/18.8 | 61.8 | 9.0 | -8,298 |
|  | H2 (check) | 2.95 | 26.1 | 2.29 | +9,289 | +2,501 | -2,123 | 1,373 | -212 | 24.4/0.0 | 47.4/0.0 | 97.3 | 19.5 | -1,176 |
|  | 2021-25 (ref) | 2.76 | 16.7 | 0.86 | -13,287 | -260 | -21,365 | 832 | -194 | 8.8/9.8 | 13.8/29.6 | 28.8 | 19.0 | -11,857 |
| chase exp 0.6 60m | H1 (pick) | 3.44 | 20.5 | 3.35 | +27,768 | +4,556 | -2,546 | 2,199 | -169 | 36.7/7.8 | 58.6/9.4 | 87.8 | 10.0 | -5,537 |
|  | H2 (check) | 2.69 | 33.3 | 2.43 | +10,064 | +2,710 | -2,262 | 1,220 | -251 | 28.2/0.0 | 47.4/9.0 | 68.0 | 15.0 | -401 |
|  | 2021-25 (ref) | 2.71 | 17.2 | 0.95 | -4,554 | -89 | -16,984 | 918 | -200 | 8.8/9.6 | 13.8/26.2 | 30.1 | 20.0 | -3,124 |
| chase any 0.6 60m | H1 (pick) | 3.55 | 19.8 | 2.83 | +24,033 | +3,943 | -2,483 | 2,065 | -180 | 28.9/7.8 | 44.5/18.8 | 61.8 | 9.0 | -9,272 |
|  | H2 (check) | 2.95 | 26.1 | 2.32 | +9,386 | +2,527 | -2,026 | 1,373 | -209 | 24.4/0.0 | 47.4/0.0 | 97.3 | 19.5 | -1,079 |
|  | 2021-25 (ref) | 2.76 | 16.7 | 0.86 | -13,287 | -260 | -21,365 | 832 | -194 | 8.8/9.8 | 13.8/29.6 | 28.8 | 19.0 | -11,857 |
| chase exp 0.4 120m | H1 (pick) | 3.48 | 21.3 | 3.43 | +28,742 | +4,715 | -2,546 | 2,134 | -169 | 36.7/7.8 | 58.6/9.4 | 87.8 | 10.0 | -4,563 |
|  | H2 (check) | 2.69 | 31.0 | 2.35 | +9,699 | +2,611 | -2,262 | 1,299 | -248 | 28.2/0.0 | 47.4/9.0 | 68.0 | 15.0 | -766 |
|  | 2021-25 (ref) | 2.88 | 17.7 | 0.92 | -8,291 | -162 | -20,712 | 843 | -197 | 9.0/10.7 | 14.4/27.1 | 28.8 | 18.0 | -6,861 |
| chase exp 0.4 60m half | H1 (pick) | 3.48 | 21.3 | 3.5 | +28,371 | +4,655 | -2,375 | 2,092 | -162 | 36.7/4.7 | 60.2/7.0 | 91.2 | 10.0 | -4,934 |
|  | H2 (check) | 2.69 | 33.3 | 2.44 | +10,086 | +2,716 | -2,240 | 1,220 | -250 | 28.2/0.0 | 47.4/0.0 | 91.3 | 18.0 | -379 |
|  | 2021-25 (ref) | 2.71 | 17.2 | 0.96 | -4,144 | -81 | -17,972 | 905 | -196 | 8.8/9.4 | 14.4/25.3 | 31.9 | 20.5 | -2,714 |

**Verdict: REJECT.** Every setting loses money in both halves (H1 −$4.6k to −$9.3k).

**Why, in plain words:**
- The chased trades themselves are about break-even. "exp 40%": 12 trades in Jan-Jun (2 winners, −$727), 3 in Jul-Oct (−$100).
- They enter higher than the limit with the same stop, so the stop is wider and the trade smaller, and 1.5R to the target is
  harder to reach.
- They take the day: one trade a day, so a chased trade blocks a later, better LIT setup on the same day.
- "any" is worse still: it buys a pullback before the limit is tapped and loses the cheaper limit fill.
- The 25/40/60% setting barely matters. Almost every chase signal comes early, near the limit.
- This is what LIT teaches: a missed move stays missed.

## Idea 3: ES SMT (the S&P future does not confirm the sweep)

**The rules tested:** at the sweep, NQ takes a level (session box, PDH/PDL, PWH/PWL, PMH/PML) but ES has not taken its own copy of
that level. ES had not already taken it before NQ, and still has not by NQ's trigger candle.
- **size ×1.25 / ×1.5** when SMT is present (one rounding with the weekly stop, max 40 micros, then the room cap);
- **nosmt ×0.75** = smaller when SMT is absent;
- **filter** = only SMT setups;
- **trig** = SMT **as the 1m trigger instead of the 5m CISD**. NQ's 1m low takes a LIT level by at least 0.5 ATR, the inducement
  swing was taken first, and ES has not taken its copy. Then the first 1m CISD triggers an entry at the next 1m open, with the stop
  1 tick beyond the 1m sweep extreme. This setup is added to the live ones; "disp0.8" also needs a 0.8 ATR displacement candle.
  "30m / 60m" = how long after the sweep the 1m CISD may come.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions | Δ net vs live |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |  |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |  |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |  |
| smt size 1.25 | H1 (pick) | 3.12 | 22.5 | 4.02 | +33,738 | +5,535 | -2,513 | 2,495 | -180 | 40.6/3.1 | 65.6/6.2 | 92.6 | 10.0 | +433 |
|  | H2 (check) | 2.56 | 35.0 | 2.37 | +9,850 | +2,652 | -2,224 | 1,217 | -277 | 29.5/0.0 | 48.7/0.0 | 70.7 | 12.0 | -615 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,969 | -39 | -17,694 | 956 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 | -539 |
| smt size 1.5 | H1 (pick) | 3.12 | 22.5 | 3.98 | +34,035 | +5,584 | -2,646 | 2,525 | -184 | 46.1/3.1 | 67.2/6.2 | 92.7 | 9.0 | +730 |
|  | H2 (check) | 2.56 | 35.0 | 2.39 | +10,237 | +2,756 | -2,214 | 1,256 | -283 | 32.1/0.0 | 43.6/10.3 | 68.0 | 11.0 | -228 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.91 | -7,434 | -146 | -17,694 | 885 | -205 | 8.8/8.1 | 15.8/20.9 | 30.5 | 16.5 | -6,004 |
| smt nosmt 0.75 | H1 (pick) | 3.12 | 22.5 | 3.93 | +24,008 | +3,939 | -1,835 | 1,789 | -132 | 28.1/0.0 | 59.4/0.0 | 100.0 | 14.5 | -9,297 |
|  | H2 (check) | 2.56 | 35.0 | 2.46 | +9,066 | +2,441 | -2,105 | 1,091 | -239 | 29.5/0.0 | 47.4/0.0 | 95.8 | 18.5 | -1,399 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.1 | +6,924 | +136 | -13,740 | 859 | -165 | 4.7/5.5 | 9.9/16.1 | 30.2 | 22.0 | +8,354 |
| smt filter | H1 (pick) | 0.66 | 17.6 | 2.59 | +3,338 | +548 | -967 | 1,814 | -150 | 0.0/0.0 | 0.0/0.0 | 100.0 | 42.5 | -29,967 |
|  | H2 (check) | 0.83 | 23.1 | 0.54 | -1,501 | -404 | -1,866 | 593 | -328 | 14.1/0.0 | 20.5/0.0 | 100.0 | 7.5 | -11,966 |
|  | 2021-25 (ref) | 0.11 | 17.4 | 1.05 | +145 | +3 | -2,340 | 746 | -149 | 0.0/0.0 | 0.0/0.0 | 0.0 | None | +1,575 |
| smt trig 30m | H1 (pick) | 4.02 | 19.4 | 2.3 | +25,132 | +4,123 | -3,732 | 2,224 | -233 | 37.5/16.4 | 54.7/28.9 | 64.4 | 8.5 | -8,173 |
|  | H2 (check) | 4.04 | 22.2 | 1.39 | +4,953 | +1,334 | -2,295 | 1,264 | -260 | 20.5/12.8 | 23.1/42.3 | 25.0 | 5.0 | -5,512 |
|  | 2021-25 (ref) | 2.44 | 17.0 | 0.95 | -4,097 | -80 | -17,694 | 941 | -202 | 8.8/8.8 | 16.3/21.9 | 31.1 | 17.0 | -2,667 |
| smt trig 60m | H1 (pick) | 4.14 | 19.8 | 2.58 | +30,460 | +4,997 | -3,696 | 2,368 | -227 | 33.6/14.1 | 45.3/32.0 | 49.6 | 7.0 | -2,845 |
|  | H2 (check) | 4.36 | 20.6 | 0.97 | -345 | -93 | -4,296 | 957 | -254 | 9.0/14.1 | 15.4/52.6 | 17.9 | 8.0 | -10,810 |
|  | 2021-25 (ref) | 2.49 | 17.4 | 1.04 | +3,402 | +67 | -17,694 | 1,005 | -204 | 10.7/10.0 | 18.7/25.2 | 32.8 | 15.0 | +4,832 |
| smt trig 60m 1.25 | H1 (pick) | 4.14 | 19.8 | 2.51 | +31,111 | +5,104 | -3,931 | 2,462 | -242 | 35.9/13.3 | 48.4/28.9 | 53.2 | 7.0 | -2,194 |
|  | H2 (check) | 4.36 | 20.6 | 0.86 | -1,843 | -496 | -4,951 | 811 | -244 | 7.7/12.8 | 12.8/52.6 | 14.9 | 8.0 | -12,308 |
|  | 2021-25 (ref) | 2.49 | 17.4 | 1.05 | +4,696 | +92 | -17,694 | 1,020 | -205 | 10.7/10.0 | 18.7/25.6 | 32.8 | 15.0 | +6,126 |
| smt trig 60m disp0.8 | H1 (pick) | 3.59 | 20.7 | 3.39 | +32,623 | +5,352 | -2,772 | 2,434 | -187 | 37.5/3.1 | 61.7/14.1 | 76.6 | 11.0 | -682 |
|  | H2 (check) | 3.4 | 28.3 | 1.91 | +7,265 | +1,956 | -2,199 | 1,014 | -209 | 25.6/2.6 | 56.4/9.0 | 84.7 | 16.0 | -3,200 |
|  | 2021-25 (ref) | 2.47 | 17.2 | 1.01 | +636 | +12 | -17,694 | 993 | -205 | 9.0/10.2 | 17.4/25.5 | 31.4 | 16.5 | +2,066 |

**Verdict: REJECT** (all six).

**Why, in plain words:**
- **SMT does not pick better LIT trades.** Of the 2026 live trades, 23 had SMT, 77 did not, and 20 could not be judged (the swept
  level was a build-up or a gap, with no ES copy).
  - **H1:** SMT trades made $361 a trade, the others $457.
  - **H2:** SMT trades made $353 a trade, the others $326.
  - The difference is noise, so a bigger size on SMT just adds risk. ×1.5 wins $730 in H1 and loses $228 in H2.
- **The filter** leaves 0.7-0.8 trades a week, far below the owner's 2-4.
- **SMT as an early 1m trigger** adds 40 trades per half that are mostly stop-outs.
  - **60 min:** 25 and 22 stop-outs; the new trades lose $1.3k in H1 and $6.0k in H2.
  - The 5m CISD with its displacement candle is what filters out weak reversals, and SMT cannot replace it. Even with a
    displacement candle (disp0.8), H2 loses $3.2k.
  - It also hurts the eval: the 1-month fail rate goes from 0% to 9-53% in H2.
- **This matches the earlier tests:** `lit-losses.md` (★ "skip when ES did not sweep" lost money) and `research/lit/filters.md`
  (SMT filter / size: rejected). It is now rejected on the live LIT signals too.

## Idea 4: a LIT opening model (09:30-10:00)

**The rule tested:** an extra NY setup on days the bot has not traded yet (one trade a day, so a London trade always comes first):
- **Sweep:** between 09:30 and 10:00, NQ's 1m low takes the **NY trap box** low (08:00-09:30) or the **overnight** low (18:00-09:30)
  (highs for shorts), for the first time, by at least `d` ATR (0, 0.25 or 0.5);
- **Inducement:** a 5m swing low above the level, at most 1 ATR above it and 36 candles old, untouched until the final push took it
  (the live LIT rule; "noidm" = without it);
- **Entry:** the first 1m CISD after the sweep extreme → next 1m open, only until 10:00 / 10:15 / 10:30 ("to1000" etc.);
- **Stop** 1 tick beyond the 1m sweep extreme (8-80 pts), **target** the live VIX band (≥ 1.5R, banked at 8R), BE at 1R, flat 15:55;
- variants: only the trap box, only the overnight range, half size, ES SMT required, a 30-min instead of a 60-min sweep life.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions | Δ net vs live |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |  |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |  |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |  |
| open d0.25 to1000 | H1 (pick) | 3.44 | 21.6 | 3.97 | +34,291 | +5,626 | -2,376 | 2,413 | -167 | 33.6/3.1 | 53.1/7.8 | 82.7 | 10.5 | +986 |
|  | H2 (check) | 3.21 | 30.0 | 2.43 | +11,363 | +3,059 | -1,969 | 1,287 | -227 | 30.8/0.0 | 64.1/9.0 | 85.3 | 13.5 | +898 |
|  | 2021-25 (ref) | 2.64 | 17.7 | 0.99 | -1,411 | -28 | -19,609 | 940 | -205 | 10.4/8.0 | 17.4/23.6 | 31.6 | 15.0 | +19 |
| open d0.25 to1030 | H1 (pick) | 3.59 | 19.6 | 3.23 | +29,318 | +4,810 | -2,452 | 2,359 | -178 | 33.6/3.1 | 50.0/7.8 | 79.4 | 10.0 | -3,987 |
|  | H2 (check) | 3.33 | 25.0 | 2.25 | +10,358 | +2,789 | -2,119 | 1,435 | -213 | 24.4/0.0 | 64.1/10.3 | 82.7 | 15.0 | -107 |
|  | 2021-25 (ref) | 2.87 | 17.7 | 1.01 | +1,161 | +23 | -19,346 | 934 | -199 | 10.9/9.6 | 17.5/27.1 | 29.6 | 13.0 | +2,591 |
| open d0.5 to1000 | H1 (pick) | 3.44 | 21.6 | 3.97 | +34,291 | +5,626 | -2,376 | 2,413 | -167 | 33.6/3.1 | 53.1/7.8 | 82.7 | 10.5 | +986 |
|  | H2 (check) | 3.21 | 30.0 | 2.28 | +10,832 | +2,916 | -1,969 | 1,287 | -242 | 30.8/0.0 | 64.1/9.0 | 85.3 | 13.5 | +367 |
|  | 2021-25 (ref) | 2.57 | 17.5 | 0.97 | -2,446 | -48 | -16,697 | 902 | -196 | 9.4/8.0 | 17.2/21.5 | 31.9 | 16.0 | -1,016 |
| open d0.5 to1030 | H1 (pick) | 3.63 | 19.4 | 3.23 | +29,312 | +4,809 | -2,452 | 2,359 | -175 | 33.6/3.1 | 50.0/7.8 | 79.4 | 10.0 | -3,993 |
|  | H2 (check) | 3.33 | 25.0 | 2.07 | +9,462 | +2,548 | -2,119 | 1,407 | -226 | 24.4/0.0 | 64.1/10.3 | 82.7 | 15.0 | -1,003 |
|  | 2021-25 (ref) | 2.79 | 17.6 | 0.98 | -1,958 | -38 | -19,218 | 884 | -192 | 10.0/8.5 | 17.4/23.3 | 30.1 | 14.5 | -528 |
| open d0.25 to1030 noidm | H1 (pick) | 4.06 | 17.3 | 2.43 | +22,348 | +3,667 | -2,938 | 2,108 | -181 | 21.9/3.1 | 43.0/12.5 | 69.6 | 13.0 | -10,957 |
|  | H2 (check) | 3.91 | 21.3 | 2.2 | +11,035 | +2,971 | -2,775 | 1,556 | -191 | 24.4/0.0 | 60.3/11.5 | 82.7 | 15.0 | +570 |
|  | 2021-25 (ref) | 3.16 | 18.0 | 1.11 | +12,130 | +238 | -16,317 | 1,004 | -199 | 11.5/9.4 | 19.1/26.7 | 30.7 | 13.0 | +13,560 |
| open d0.5 to1030 smt | H1 (pick) | 3.24 | 21.7 | 4.01 | +33,300 | +5,463 | -2,376 | 2,465 | -170 | 35.2/3.1 | 53.9/4.7 | 93.3 | 11.0 | -5 |
|  | H2 (check) | 2.69 | 35.7 | 2.02 | +7,108 | +1,914 | -1,918 | 936 | -257 | 30.8/0.0 | 61.5/0.0 | 100.0 | 15.5 | -3,357 |
|  | 2021-25 (ref) | 2.41 | 17.6 | 0.96 | -3,516 | -69 | -17,694 | 893 | -200 | 8.8/8.1 | 15.8/20.2 | 30.6 | 16.5 | -2,086 |
| open d0.25 to1015 | H1 (pick) | 3.59 | 19.6 | 3.23 | +29,318 | +4,810 | -2,452 | 2,359 | -178 | 33.6/3.1 | 50.0/7.8 | 79.4 | 10.0 | -3,987 |
|  | H2 (check) | 3.33 | 25.0 | 2.25 | +10,358 | +2,789 | -2,119 | 1,435 | -213 | 24.4/0.0 | 64.1/10.3 | 82.7 | 15.0 | -107 |
|  | 2021-25 (ref) | 2.77 | 18.0 | 1.01 | +677 | +13 | -20,833 | 942 | -206 | 11.0/8.0 | 18.1/24.2 | 30.4 | 14.0 | +2,107 |
| open d0.25 to1000 ev30 | H1 (pick) | 3.44 | 21.6 | 3.97 | +34,291 | +5,626 | -2,376 | 2,413 | -167 | 33.6/3.1 | 53.1/7.8 | 82.7 | 10.5 | +986 |
|  | H2 (check) | 3.21 | 30.0 | 2.43 | +11,363 | +3,059 | -1,969 | 1,287 | -227 | 30.8/0.0 | 64.1/9.0 | 85.3 | 13.5 | +898 |
|  | 2021-25 (ref) | 2.64 | 17.7 | 0.99 | -1,411 | -28 | -19,609 | 940 | -205 | 10.4/8.0 | 17.4/23.6 | 31.6 | 15.0 | +19 |
| open d0.25 to1000 trap only | H1 (pick) | 3.36 | 22.1 | 4.05 | +34,732 | +5,698 | -2,376 | 2,428 | -170 | 35.2/3.1 | 55.5/6.2 | 89.4 | 11.0 | +1,427 |
|  | H2 (check) | 3.21 | 30.0 | 2.43 | +11,363 | +3,059 | -1,969 | 1,287 | -227 | 30.8/0.0 | 64.1/9.0 | 85.3 | 13.5 | +898 |
|  | 2021-25 (ref) | 2.63 | 17.6 | 0.99 | -949 | -19 | -19,603 | 946 | -203 | 10.4/8.0 | 17.4/23.4 | 31.8 | 15.0 | +481 |
| open d0.25 to1000 overnight only | H1 (pick) | 3.36 | 22.1 | 4.1 | +34,894 | +5,725 | -2,519 | 2,428 | -168 | 34.4/3.1 | 58.6/6.2 | 91.3 | 11.0 | +1,589 |
|  | H2 (check) | 2.95 | 32.6 | 2.41 | +11,304 | +3,043 | -1,967 | 1,287 | -258 | 30.8/0.0 | 61.5/1.3 | 94.7 | 16.0 | +839 |
|  | 2021-25 (ref) | 2.53 | 17.3 | 1.0 | +395 | +8 | -23,502 | 976 | -204 | 10.1/8.0 | 17.2/22.2 | 30.7 | 15.0 | +1,825 |
| open d0.25 to1000 half | H1 (pick) | 3.44 | 21.6 | 4.04 | +34,061 | +5,588 | -2,376 | 2,382 | -162 | 34.4/3.1 | 54.7/6.2 | 88.5 | 11.0 | +756 |
|  | H2 (check) | 3.21 | 30.0 | 2.37 | +10,553 | +2,841 | -2,152 | 1,216 | -220 | 30.8/0.0 | 52.6/10.3 | 81.3 | 15.0 | +88 |
|  | 2021-25 (ref) | 2.64 | 17.7 | 0.97 | -3,190 | -62 | -20,990 | 919 | -204 | 9.9/8.0 | 16.1/22.3 | 29.2 | 15.0 | -1,760 |
| open d0.25 to1000 smt | H1 (pick) | 3.2 | 22.0 | 4.01 | +33,304 | +5,464 | -2,376 | 2,465 | -173 | 35.2/3.1 | 53.9/4.7 | 93.3 | 11.0 | -1 |
|  | H2 (check) | 2.69 | 35.7 | 2.02 | +7,108 | +1,914 | -1,918 | 936 | -257 | 30.8/0.0 | 61.5/0.0 | 100.0 | 15.5 | -3,357 |
|  | 2021-25 (ref) | 2.4 | 17.5 | 0.95 | -4,613 | -90 | -17,694 | 910 | -204 | 8.8/8.1 | 15.8/20.2 | 30.6 | 16.5 | -3,183 |
| open d0 to1000 | H1 (pick) | 3.52 | 21.1 | 3.77 | +33,677 | +5,525 | -2,624 | 2,413 | -171 | 33.6/3.1 | 53.1/7.8 | 82.7 | 10.5 | +372 |
|  | H2 (check) | 3.27 | 29.4 | 2.31 | +10,332 | +2,782 | -2,240 | 1,216 | -220 | 30.8/0.0 | 62.8/10.3 | 82.7 | 13.0 | -133 |
|  | 2021-25 (ref) | 2.69 | 17.5 | 1.0 | +142 | +3 | -20,347 | 946 | -201 | 10.4/8.1 | 17.4/24.3 | 31.4 | 15.0 | +1,572 |

**Verdict: ADOPT-candidate, small and thin**: the overnight-only version, depth 0.25 ATR, entry by 10:00 (run
`lit_u_entries_open_d0p25_to1000_overnight_only`).
- **Picked on H1:** it has the best Jan-Jun net of the ideas (+$1,589).
- **Checked on H2:** +$839, at 3.36 and 2.95 trades a week.
- **Eval odds about the same:**
  - pass rate 91.3% / 94.7% vs 92.3% / 95.7%;
  - 2-week pass 34.4% / 30.8% vs 37.5% / 29.5%;
  - 1-month pass 58.6% / 61.5% vs 60.2% / 47.4%;
  - 1-month fail 6.2% / 1.3% vs 6.2% / 0.0%.
- **2021-25 reference** (5m candles): +$395 vs −$1,430.

**Why it works a little, and why to be careful:**
- **The opening sweep of the overnight range is classic LIT:** the overnight buyers' stops sit under the overnight low, the cash
  open runs them, and then the market turns.
  - In 2026 the model added 6 trades in H1 and 7 in H2, of which only 1 + 2 won.
  - The money is in 3 trades: 2026-03-19 long +221 pts, 2026-07-31 short to target +534 pts, 2026-10-07 long +202 pts.
- **Its neighbours are mixed:**
  - Every version that stops new entries at **10:00** is positive in both halves: trap + overnight +$986 / +$898, trap box only
    +$1,427 / +$898, depth 0.5 +$986 / +$367.
  - **10:15 and 10:30 lose $4.0k in H1.**
  - The trap + overnight version also drops the pass rate by about 10 points (82.7% / 85.3%). The overnight-only version does not.
- With 13 trades, one losing quarter can erase it. **Switch it on only after a paper shadow agrees.**

## What would change in the bot (only if the owner switches it on)

Default **off**, so today's results stay identical:
- **`engine/lit.py`:** a new parameter `"open_model": null` in `DEFAULTS`, plus a function `open_signals(M, B, P, day)` (port of
  `detect()` in `tools/lit_t_entries.py`, kind "open", `lv: "on"`).
  - The overnight low/high is computed from 18:00 to 09:30 and becomes known at 09:30.
  - A first 1m breach between 09:30 and 10:00 starts an event; the extreme follows new lows.
  - The event needs depth ≥ 0.25 ATR (5m ATR before the breach) and the live inducement rule on 5m bars before the breach.
  - On the first 1m close above the CISD level of the run into the extreme, the bot enters at the next 1m open until 10:00.
  - The stop is 1 tick beyond the extreme (8-80 pts), the target is the VIX band ≥ 1.5R (banked at 8R), and the 60-min event
    life applies.
- **`_run_core`:** these signals are merged with the 5m candidates by time: one trade a day, never two at once. The Monday rule and
  the weekly stop apply to them too.
- **`engine/lit_live.py`:** an opening signal is a **market** entry at the next 1m open. There is no resting limit, so the live
  loop needs the 1m bars up to now (it already loads them) and must route it as a market bracket.
- **`engine/sizing.py`:** no change (same `lit_qty` eval sizing).

## Files

- `tools/lit_t_entries.py`: the wrapper.
  - `check` reproduces the live bot and the baseline;
  - `grid` runs every variant → `research/lit/t_entries_results.json`;
  - `save` stores the runs `lit_u_entries_*`.
- Runs: family other, tags `lit`, `lit_untested`, `lit_entries`.
