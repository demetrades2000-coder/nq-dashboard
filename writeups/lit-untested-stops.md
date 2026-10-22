## In one minute

- **The owner's order (2026-10-18):** "Remember our strategy is LIT based, nothing that goes outside. Try every single one of
  these and go find more we haven't tested."
- **What was tested:** 5 stop ideas + 2 extra ones, **44 variants**. Every one uses the exact live LIT setups, entries and target.
  Only the stop and the stop moves after the fill change.
- **The answer: no stop idea beats the live stop in both halves of 2026.** Nothing is adopted and nothing changes in the bot.

| Idea | Best version (picked on Jan-Jun) | H1 Δ net $ | H2 Δ net $ | Verdict |
|---|---|---:|---:|---|
| 1. Close-based stop + emergency stop | 5m close past the stop, emergency 10 pts further, live size | +4,221 | −1,940 | **REJECT** |
| 1b. same, sized on the emergency stop (size follows the stop) | 1m close, emergency +5 pts | −11,593 | −3,344 | **REJECT** |
| 2. Stop behind the next liquidity | next equal lows/highs, keep the live stop if that is over 80 pts | +1,416 | −931 | **REJECT** |
| 3. Volatility buffer | extreme + 0.05 ATR, target/BE on the new R | −1,335 | −727 | **REJECT** |
| 4. Time-based breakeven | (extra) BE on a 1m close at +1R | −3,297 | 0 | **REJECT** |
| 4b. BE at +1R only after M minutes | after 30 min | −5,884 | 0 | **REJECT** |
| 5. Profit lock | lock 50% at 85% of the way (lock 25% at 75%: no change at all) | 0 | −138 | **NEUTRAL** (no rule) |

- **The live strategy stays as it is (run `lit_u_stops_base`, equal to `lit_tight_eval_800_25_room60`):**
  - **Jan-Jun:** PF 4.01, +$33,305 ($5,464/mo), max DD −$2,513, 2-week eval 37.5% pass / 3.1% fail, pass rate 92.3%.
  - **Jul-Oct:** PF 2.51, +$10,465 ($2,818/mo), max DD −$2,157, 2-week eval 29.5% / 0.0%, pass rate 95.7%.

## How it was tested

- **The data:** CME NQ1! futures from TradingView only, 5m + 1m bars for 2026, VIX daily. No Yahoo, no CFD.
- **Same signals:** `tools/lit_t_stops.py` wraps `engine/lit.py` without editing it. With every new option off it reproduces the
  live bot trade for trade: 630 trades of run `lit_live` (120 in 2026, +$41,734 at the LIT size). It also reproduces the baseline
  run `lit_tight_eval_800_25_room60` to the dollar.
- **The same setups, every time:**
  - the same limit at the 5m CISD level and the same 1m CISD confirmation;
  - the same fill and the same VIX-band target price;
  - the setup is still cancelled when the sweep extreme breaks before the fill.
- **The live eval sizing:**
  - $800 up to a 25-pt stop, then 800 × 25 ÷ stop;
  - half size after 2 stop-outs in a week;
  - never more than 60% of the room to the MFFU trailing max-loss floor.
  - **Size follows the stop:** a wider stop means fewer micros.
- **Costs in:** $1.40 per micro round trip, plus 1 tick of slippage on market entries and on stop, breakeven and end-of-day exits.
- **The judge:** pick on **H1** (Jan 2 - Jun 30 2026), check on **H2** (Jul 1 - Oct 16 2026). A change is adopted only if it makes
  more money in **both** halves and keeps 2-4 trades a week.
- **2021-25 is a reference line only.** There are no 1m bars there, so it runs on 5m.
- **The money columns** come from back-to-back MFFU 50K evals, like the baseline run.
- **The eval columns:**
  - a fresh eval is started on every session ($3,000 target, $2,000 trailing max loss, $1,000 daily loss limit);
  - "2 wk" = passed or failed within 10 sessions, "1 mo" = within 20;
  - median = the median number of sessions to a pass.
- **"Target/BE on the new R"** (ideas 2-3): the 1.5R minimum, the 8R bank and the +1R breakeven are measured on the new, wider
  stop. Otherwise they stay measured on the live stop, so the trade list stays the same.

## Idea 1: close-based stop with an emergency stop

**The rule tested:** the trade is closed only when a candle **closes** past the live stop, at the next bar's open. The 1m version
uses 1m closes; the extra 5m version uses only 5m candle closes. A hard emergency stop 5, 10 or 15 pts further out always works.

**Two ways to size it:**
- **on the emergency stop:** honest, because that is the real worst case;
- **at the live size:** the real loss can then be up to N pts bigger than the size assumes.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** (1 tick past the sweep extreme, touch stop, BE at +1R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| 1m close beyond, emergency +5 pts, size on the emergency stop | H1 (pick) | 3.12 | 22.5 | 3.35 | +21,712 | +3,562 | -2,133 | 1,720 | -149 | 27.3/0.0 | 47.7/1.6 | 93.0 | 14.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.08 | +7,121 | +1,917 | -2,028 | 980 | -254 | 20.5/0.0 | 39.7/0.0 | 97.1 | 22.0 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 0.88 | -8,205 | -161 | -17,706 | 699 | -169 | 4.2/4.9 | 8.3/14.2 | 25.2 | 24.0 |
| 1m close beyond, emergency +5 pts, live size | H1 (pick) | 3.12 | 22.5 | 3.79 | +32,308 | +5,301 | -2,629 | 2,437 | -187 | 37.5/3.9 | 60.2/9.4 | 87.5 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.23 | +9,049 | +2,436 | -2,240 | 1,171 | -282 | 29.5/0.0 | 42.3/10.3 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 0.89 | -10,743 | -210 | -20,993 | 968 | -233 | 8.5/7.6 | 14.6/23.8 | 24.8 | 15.0 |
| 1m close beyond, emergency +10 pts, size on the emergency stop | H1 (pick) | 3.12 | 22.5 | 3.3 | +17,767 | +2,915 | -1,873 | 1,417 | -125 | 25.0/0.0 | 45.3/0.0 | 100.0 | 18.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.36 | +7,233 | +1,947 | -1,234 | 898 | -205 | 7.7/0.0 | 26.9/0.0 | 100.0 | 29.5 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 1.02 | +985 | +19 | -11,869 | 689 | -147 | 1.9/2.8 | 5.5/8.8 | 21.2 | 24.5 |
| 1m close beyond, emergency +10 pts, live size | H1 (pick) | 3.12 | 22.5 | 4.26 | +37,241 | +6,110 | -2,624 | 2,703 | -184 | 37.5/6.2 | 60.2/16.4 | 78.8 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.18 | +8,541 | +2,299 | -2,294 | 1,128 | -279 | 29.5/0.0 | 42.3/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.77 | -22,033 | -432 | -28,585 | 790 | -224 | 7.9/7.2 | 14.1/23.5 | 24.6 | 16.0 |
| 1m close beyond, emergency +15 pts, size on the emergency stop | H1 (pick) | 3.12 | 22.5 | 3.51 | +15,830 | +2,597 | -1,514 | 1,230 | -102 | 10.2/0.0 | 36.7/0.0 | 100.0 | 21.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.06 | +4,845 | +1,304 | -1,087 | 673 | -176 | 5.1/0.0 | 16.7/0.0 | 100.0 | 32.5 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.93 | -3,690 | -72 | -12,670 | 522 | -122 | 0.9/1.3 | 2.7/5.0 | 21.0 | 30.0 |
| 1m close beyond, emergency +15 pts, live size | H1 (pick) | 3.12 | 22.5 | 4.28 | +37,290 | +6,118 | -2,602 | 2,703 | -183 | 37.5/7.8 | 60.2/18.0 | 74.5 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.24 | +8,947 | +2,409 | -2,285 | 1,154 | -277 | 29.5/0.0 | 42.3/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.8 | -19,794 | -388 | -27,964 | 851 | -232 | 7.8/6.9 | 13.2/25.6 | 23.8 | 16.0 |
| 5m close beyond, emergency +10 pts, size on the emergency stop | H1 (pick) | 3.12 | 22.5 | 3.24 | +17,342 | +2,845 | -1,904 | 1,393 | -125 | 25.0/0.0 | 45.3/0.0 | 100.0 | 18.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.28 | +7,061 | +1,901 | -1,326 | 898 | -212 | 7.7/0.0 | 26.9/0.0 | 100.0 | 26.5 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 1.02 | +985 | +19 | -11,869 | 689 | -147 | 1.9/2.8 | 5.5/8.8 | 21.2 | 24.5 |
| 5m close beyond, emergency +10 pts, live size | H1 (pick) | 3.12 | 22.5 | 4.37 | +37,526 | +6,157 | -2,628 | 2,703 | -180 | 37.5/4.7 | 60.2/14.8 | 77.9 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.17 | +8,525 | +2,295 | -2,322 | 1,128 | -279 | 29.5/0.0 | 42.3/10.3 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.77 | -22,033 | -432 | -28,585 | 790 | -224 | 7.9/7.2 | 14.1/23.5 | 24.6 | 16.0 |
| 5m close beyond, emergency +15 pts, size on the emergency stop | H1 (pick) | 3.12 | 22.5 | 3.4 | +15,369 | +2,522 | -1,606 | 1,210 | -103 | 10.2/0.0 | 35.9/0.0 | 100.0 | 22.5 |
|  | H2 (check) | 2.56 | 35.0 | 1.93 | +4,537 | +1,221 | -1,155 | 673 | -188 | 5.1/0.0 | 15.4/0.0 | 100.0 | 33.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.93 | -3,707 | -73 | -12,670 | 522 | -122 | 0.9/1.3 | 2.7/5.0 | 21.0 | 30.0 |
| 5m close beyond, emergency +15 pts, live size | H1 (pick) | 3.12 | 22.5 | 4.24 | +37,185 | +6,101 | -2,701 | 2,703 | -185 | 37.5/3.9 | 59.4/15.6 | 76.0 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 1.83 | +7,099 | +1,911 | -3,267 | 1,119 | -329 | 29.5/0.0 | 42.3/12.8 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.8 | -19,828 | -388 | -27,964 | 851 | -232 | 7.8/6.9 | 13.2/25.6 | 23.7 | 16.0 |

| Variant | H1 Δ net $ | H2 Δ net $ | 2021-25 Δ net $ |
|---|---:|---:|---:|
| 1m close beyond, emergency +5 pts, size on the emergency stop | -11,593 | -3,344 | -6,775 |
| 1m close beyond, emergency +5 pts, live size | -997 | -1,416 | -9,313 |
| 1m close beyond, emergency +10 pts, size on the emergency stop | -15,538 | -3,232 | +2,415 |
| 1m close beyond, emergency +10 pts, live size | +3,936 | -1,924 | -20,603 |
| 1m close beyond, emergency +15 pts, size on the emergency stop | -17,475 | -5,620 | -2,260 |
| 1m close beyond, emergency +15 pts, live size | +3,985 | -1,518 | -18,364 |
| 5m close beyond, emergency +10 pts, size on the emergency stop | -15,963 | -3,404 | +2,415 |
| 5m close beyond, emergency +10 pts, live size | +4,221 | -1,940 | -20,603 |
| 5m close beyond, emergency +15 pts, size on the emergency stop | -17,936 | -5,928 | -2,277 |
| 5m close beyond, emergency +15 pts, live size | +3,880 | -3,366 | -18,398 |

**Verdict: REJECT.**
- **Why: LIT's stop-outs are not wick-outs.**
  - In 2026 the stop sits 1 tick past the sweep extreme, which is already the wick that took the liquidity.
  - When price comes back through it, it keeps going. 52-53 of the 53 stop-outs also **closed** a 1m candle past the stop.
  - Waiting for the close saved 1 trade (2 on 5m closes), and every other stop-out lost more:
    - H1: total R 63.3 → 60.8;
    - H2: 27.0 → 24.7.
- **Sized on the emergency stop:** the size drops, so every version makes $3-18k less.
- **At the live size:** the losses are bigger than the size planned for, so the 60% room cap no longer protects the eval:
  - Jul-Oct pass rate 95.7% → 68-71%;
  - 1-month fails up to 10-18%.
- **The +$4k in H1 at the live size is not a better trade.** The R per trade is lower. The $ come from where the back-to-back
  evals happened to reset.

## Idea 2: stop behind the next liquidity

**The rule tested:** the stop goes 1 tick past the nearest **untouched** liquidity beyond the sweep extreme, known at the trigger
candle. Four kinds were tried:
- the next confirmed 5m swing low/high (last 2 days);
- the next equal lows/highs (LIT build-up);
- the next LIT level (session boxes, PDL/PWL/PML, opening gaps, build-ups);
- the nearest of them all.

**When that level is more than 80 pts from the fill:** either cut the stop to 80 pts, or keep the live stop.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** (1 tick past the sweep extreme, touch stop, BE at +1R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| next 5m swing low/high, cut to 80 pts | H1 (pick) | 3.12 | 26.2 | 3.69 | +16,953 | +2,781 | -1,467 | 1,107 | -107 | 16.4/0.0 | 37.5/0.0 | 100.0 | 17.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.66 | +8,227 | +2,215 | -1,385 | 878 | -198 | 12.8/0.0 | 25.6/0.0 | 100.0 | 30.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 1.03 | +1,919 | +38 | -13,708 | 788 | -167 | 5.9/2.3 | 10.4/10.6 | 33.8 | 27.0 |
| next 5m swing, live stop if it is over 80 pts | H1 (pick) | 3.12 | 22.5 | 3.92 | +24,635 | +4,042 | -2,141 | 1,837 | -136 | 29.7/0.0 | 53.1/1.6 | 80.9 | 13.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.64 | +10,280 | +2,768 | -1,765 | 1,104 | -251 | 23.1/0.0 | 47.4/0.0 | 100.0 | 20.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 1.03 | +1,874 | +37 | -11,876 | 828 | -175 | 5.8/3.4 | 11.2/12.5 | 29.9 | 21.0 |
| next 5m swing, live stop if over 80, target/BE on the new R | H1 (pick) | 3.09 | 24.1 | 3.46 | +24,324 | +3,991 | -2,647 | 1,800 | -165 | 29.7/0.0 | 48.4/7.8 | 72.1 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.64 | +10,280 | +2,768 | -1,765 | 1,104 | -251 | 23.1/0.0 | 47.4/0.0 | 100.0 | 20.0 |
|  | 2021-25 (ref) | 2.34 | 19.4 | 1.09 | +6,999 | +137 | -15,412 | 836 | -183 | 6.6/4.3 | 13.0/16.6 | 32.9 | 21.0 |
| next equal lows/highs (build-up), cut to 80 | H1 (pick) | 3.12 | 23.8 | 3.78 | +23,607 | +3,873 | -2,430 | 1,689 | -139 | 23.4/0.0 | 45.3/7.0 | 72.8 | 13.0 |
|  | H2 (check) | 2.56 | 40.0 | 2.37 | +7,093 | +1,910 | -1,584 | 767 | -216 | 12.8/0.0 | 25.6/0.0 | 100.0 | 30.5 |
|  | 2021-25 (ref) | 2.38 | 18.6 | 0.92 | -5,132 | -101 | -17,478 | 649 | -161 | 5.7/6.8 | 10.0/16.7 | 30.0 | 24.0 |
| next equal lows/highs, live stop if over 80 | H1 (pick) | 3.12 | 22.5 | 4.43 | +34,721 | +5,696 | -2,376 | 2,492 | -163 | 37.5/3.1 | 67.2/4.7 | 94.5 | 11.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.38 | +9,534 | +2,567 | -2,160 | 1,175 | -266 | 29.5/0.0 | 46.2/0.0 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 0.92 | -6,738 | -132 | -21,926 | 816 | -191 | 6.0/6.8 | 11.2/17.6 | 26.2 | 19.0 |
| next equal lows/highs, live stop if over 80, target/BE on the new R | H1 (pick) | 3.09 | 22.8 | 4.13 | +32,894 | +5,397 | -2,376 | 2,412 | -173 | 37.5/3.1 | 62.5/4.7 | 94.0 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.38 | +9,534 | +2,567 | -2,160 | 1,175 | -266 | 29.5/0.0 | 46.2/0.0 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.36 | 18.6 | 0.9 | -7,705 | -151 | -24,784 | 778 | -196 | 6.0/6.8 | 11.8/19.6 | 27.2 | 19.0 |
| next LIT level (boxes, PDL/PWL, gaps, build-ups), cut to 80 | H1 (pick) | 3.12 | 26.2 | 3.22 | +13,082 | +2,146 | -1,474 | 903 | -100 | 13.3/0.0 | 28.1/0.0 | 100.0 | 21.0 |
|  | H2 (check) | 2.56 | 40.0 | 3.07 | +7,705 | +2,074 | -817 | 714 | -155 | 12.8/0.0 | 25.6/0.0 | 100.0 | 33.5 |
|  | 2021-25 (ref) | 2.38 | 18.8 | 1.11 | +5,843 | +114 | -11,875 | 602 | -125 | 4.1/2.5 | 10.4/10.2 | 35.7 | 23.0 |
| next LIT level, live stop if over 80 | H1 (pick) | 3.12 | 23.8 | 3.78 | +25,138 | +4,124 | -1,664 | 1,799 | -148 | 29.7/0.0 | 55.5/0.0 | 100.0 | 16.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.47 | +9,606 | +2,586 | -1,765 | 1,075 | -261 | 29.5/0.0 | 55.1/0.0 | 100.0 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.96 | -3,112 | -61 | -17,081 | 766 | -174 | 4.4/4.0 | 10.8/15.0 | 30.9 | 22.5 |
| next LIT level, live stop if over 80, target/BE on the new R | H1 (pick) | 3.09 | 24.1 | 3.56 | +23,141 | +3,797 | -2,575 | 1,693 | -150 | 29.7/0.0 | 50.8/0.0 | 97.1 | 15.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.47 | +9,606 | +2,586 | -1,765 | 1,075 | -261 | 29.5/0.0 | 55.1/0.0 | 100.0 | 17.0 |
|  | 2021-25 (ref) | 2.33 | 19.2 | 0.91 | -6,434 | -126 | -19,870 | 714 | -186 | 4.4/6.3 | 10.5/19.9 | 26.3 | 19.0 |
| nearest of all of them, cut to 80 | H1 (pick) | 3.12 | 26.2 | 3.43 | +14,523 | +2,383 | -1,557 | 976 | -101 | 16.4/0.0 | 33.6/0.0 | 100.0 | 18.0 |
|  | H2 (check) | 2.56 | 37.5 | 3.12 | +8,947 | +2,409 | -1,105 | 878 | -169 | 12.8/0.0 | 26.9/0.0 | 100.0 | 25.0 |
|  | 2021-25 (ref) | 2.38 | 18.0 | 1.0 | +276 | +5 | -18,188 | 653 | -143 | 5.5/1.8 | 11.8/9.3 | 37.4 | 24.0 |
| nearest of all, live stop if over 80 | H1 (pick) | 3.12 | 23.8 | 4.13 | +25,794 | +4,232 | -1,677 | 1,791 | -135 | 29.7/0.0 | 57.0/0.0 | 100.0 | 16.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.64 | +10,280 | +2,768 | -1,765 | 1,104 | -251 | 23.1/0.0 | 47.4/0.0 | 100.0 | 20.0 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.99 | -413 | -8 | -13,140 | 808 | -176 | 5.8/4.0 | 11.4/13.2 | 28.5 | 20.0 |
| nearest of all, live stop if over 80, target/BE on the new R | H1 (pick) | 3.09 | 25.3 | 3.86 | +26,713 | +4,383 | -1,677 | 1,802 | -158 | 29.7/0.0 | 53.9/0.0 | 100.0 | 15.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.64 | +10,280 | +2,768 | -1,765 | 1,104 | -251 | 23.1/0.0 | 47.4/0.0 | 100.0 | 20.0 |
|  | 2021-25 (ref) | 2.34 | 19.3 | 1.01 | +1,014 | +20 | -15,895 | 788 | -186 | 6.6/5.4 | 12.8/17.3 | 32.7 | 20.5 |

| Variant | H1 Δ net $ | H2 Δ net $ | 2021-25 Δ net $ |
|---|---:|---:|---:|
| next 5m swing low/high, cut to 80 pts | -16,352 | -2,238 | +3,349 |
| next 5m swing, live stop if it is over 80 pts | -8,670 | -185 | +3,304 |
| next 5m swing, live stop if over 80, target/BE on the new R | -8,981 | -185 | +8,429 |
| next equal lows/highs (build-up), cut to 80 | -9,698 | -3,372 | -3,702 |
| next equal lows/highs, live stop if over 80 | +1,416 | -931 | -5,308 |
| next equal lows/highs, live stop if over 80, target/BE on the new R | -411 | -931 | -6,275 |
| next LIT level (boxes, PDL/PWL, gaps, build-ups), cut to 80 | -20,223 | -2,760 | +7,273 |
| next LIT level, live stop if over 80 | -8,167 | -859 | -1,682 |
| next LIT level, live stop if over 80, target/BE on the new R | -10,164 | -859 | -5,004 |
| nearest of all of them, cut to 80 | -18,782 | -1,518 | +1,706 |
| nearest of all, live stop if over 80 | -7,511 | -185 | +1,017 |
| nearest of all, live stop if over 80, target/BE on the new R | -6,592 | -185 | +2,444 |

**Verdict: REJECT.**
- **Why:** a stop further away means fewer micros, so the winners pay less (in most versions $900-1,850 a win instead of $2,465 in H1).
- **It saves very few trades:**
  - the win rate rises only from 22.5% to 23-26%;
  - most trades that break the sweep extreme also run through the next swing or equal lows.
- **The best version moves the stop on only 17 of 120 trades:** equal lows/highs, keeping the live stop when they are more than
  80 pts away. It gains +$1.4k in H1 and loses −$0.9k in H2, and the H2 pass rate falls from 95.7% to 68%.

## Idea 3: volatility buffer

**The rule tested:** stop = sweep extreme + k × ATR (14-bar, 5m), with k = 0.05 / 0.1 / 0.2, instead of 1 tick.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** (1 tick past the sweep extreme, touch stop, BE at +1R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| extreme + 0.05 ATR | H1 (pick) | 3.12 | 22.5 | 3.88 | +31,653 | +5,193 | -2,526 | 2,369 | -177 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.4 | +9,738 | +2,622 | -2,221 | 1,193 | -268 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.95 | -4,389 | -86 | -20,050 | 919 | -205 | 8.5/7.9 | 14.9/20.9 | 28.7 | 16.0 |
| extreme + 0.05 ATR, target/BE on the new R | H1 (pick) | 3.12 | 22.5 | 3.91 | +31,970 | +5,245 | -2,526 | 2,387 | -177 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.4 | +9,738 | +2,622 | -2,221 | 1,193 | -268 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.93 | -5,793 | -113 | -18,711 | 900 | -204 | 8.5/9.5 | 14.9/23.0 | 28.7 | 16.0 |
| extreme + 0.1 ATR | H1 (pick) | 3.12 | 22.5 | 3.8 | +30,017 | +4,925 | -2,533 | 2,264 | -173 | 31.2/3.1 | 55.5/4.7 | 94.2 | 12.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.28 | +8,681 | +2,337 | -2,196 | 1,105 | -261 | 23.1/0.0 | 47.4/0.0 | 95.7 | 18.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,421 | -47 | -12,425 | 901 | -196 | 8.5/6.7 | 15.5/19.2 | 29.7 | 16.0 |
| extreme + 0.1 ATR, target/BE on the new R | H1 (pick) | 3.12 | 22.5 | 3.85 | +30,631 | +5,025 | -2,533 | 2,298 | -173 | 31.2/3.1 | 55.5/4.7 | 94.2 | 12.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.28 | +8,681 | +2,337 | -2,196 | 1,105 | -261 | 23.1/0.0 | 47.4/0.0 | 95.7 | 18.5 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 0.96 | -3,465 | -68 | -14,763 | 908 | -203 | 8.3/8.0 | 14.7/21.9 | 27.5 | 14.0 |
| extreme + 0.2 ATR | H1 (pick) | 3.12 | 22.5 | 3.58 | +26,561 | +4,358 | -2,250 | 2,047 | -166 | 27.3/2.3 | 46.9/3.9 | 86.0 | 13.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.21 | +8,068 | +2,172 | -2,181 | 1,052 | -256 | 23.1/0.0 | 44.9/0.0 | 95.8 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.89 | -8,908 | -175 | -18,131 | 823 | -195 | 6.8/6.2 | 12.9/19.1 | 26.4 | 18.0 |
| extreme + 0.2 ATR, target/BE on the new R | H1 (pick) | 3.12 | 22.5 | 3.35 | +26,373 | +4,327 | -2,250 | 2,088 | -181 | 27.3/2.3 | 46.1/3.9 | 85.4 | 12.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.21 | +8,068 | +2,172 | -2,181 | 1,052 | -256 | 23.1/0.0 | 44.9/0.0 | 95.8 | 19.5 |
|  | 2021-25 (ref) | 2.37 | 18.1 | 0.93 | -6,536 | -128 | -21,181 | 896 | -213 | 7.6/7.6 | 13.7/22.4 | 27.9 | 18.0 |

| Variant | H1 Δ net $ | H2 Δ net $ | 2021-25 Δ net $ |
|---|---:|---:|---:|
| extreme + 0.05 ATR | -1,652 | -727 | -2,959 |
| extreme + 0.05 ATR, target/BE on the new R | -1,335 | -727 | -4,363 |
| extreme + 0.1 ATR | -3,288 | -1,784 | -991 |
| extreme + 0.1 ATR, target/BE on the new R | -2,674 | -1,784 | -2,035 |
| extreme + 0.2 ATR | -6,744 | -2,397 | -7,478 |
| extreme + 0.2 ATR, target/BE on the new R | -6,932 | -2,397 | -5,106 |

**Verdict: REJECT.**
- **Why: the bigger the buffer, the less money, in both halves.** There are no wick-outs in that band to save, only a smaller size
  on every trade.
- **It agrees with the earlier test** (`lit-experiments.md` D: 0.1 / 0.25 ATR, and 2 pts, on LIT final).

## Idea 4: time-based breakeven (and the extra idea: breakeven on a close)

**The rules tested:**
- **Time in profit:** no breakeven at +1R. The stop goes to breakeven once the 1m candles that **closed** above +0.5R add up to
  15 / 30 / 60 minutes ("in total") or run that long in a row.
- **BE at +1R only after 10 / 15 / 30 minutes in the trade.**
- **(extra) BE only when a 1m candle closes at +1R,** not on a wick touch.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** (1 tick past the sweep extreme, touch stop, BE at +1R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| BE after 15 min (in total) of 1m closes above +0.5R | H1 (pick) | 3.12 | 22.5 | 3.09 | +27,582 | +4,525 | -2,762 | 2,265 | -213 | 29.7/3.1 | 44.5/14.8 | 63.7 | 9.0 |
|  | H2 (check) | 2.56 | 30.0 | 2.03 | +6,970 | +1,877 | -2,009 | 1,145 | -242 | 28.2/0.0 | 38.5/0.0 | 95.9 | 23.0 |
|  | 2021-25 (ref) | 2.38 | 16.5 | 1.08 | +6,929 | +136 | -16,644 | 1,128 | -206 | 9.6/9.2 | 15.8/21.4 | 32.9 | 17.0 |
| BE after 15 min in a row above +0.5R | H1 (pick) | 3.12 | 22.5 | 2.81 | +26,148 | +4,290 | -2,762 | 2,257 | -234 | 29.7/3.1 | 44.5/14.8 | 63.7 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.12 | +8,540 | +2,299 | -2,848 | 1,153 | -292 | 29.5/0.0 | 47.4/2.6 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.1 | 1.02 | +2,179 | +43 | -18,193 | 1,034 | -207 | 10.6/9.7 | 16.7/23.2 | 29.1 | 13.0 |
| BE after 30 min in total above +0.5R | H1 (pick) | 3.12 | 23.8 | 2.45 | +21,383 | +3,508 | -2,762 | 1,903 | -242 | 29.7/3.1 | 48.4/12.5 | 72.0 | 10.0 |
|  | H2 (check) | 2.56 | 32.5 | 2.05 | +7,959 | +2,143 | -2,848 | 1,197 | -282 | 29.5/0.0 | 47.4/2.6 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.89 | -10,112 | -198 | -27,407 | 873 | -214 | 10.5/9.8 | 17.0/24.4 | 28.2 | 12.0 |
| BE after 30 min in a row above +0.5R | H1 (pick) | 3.12 | 23.8 | 2.5 | +21,710 | +3,562 | -2,762 | 1,903 | -237 | 29.7/3.1 | 48.4/12.5 | 72.0 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.17 | +9,359 | +2,520 | -3,263 | 1,241 | -308 | 29.5/3.8 | 47.4/19.2 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 19.0 | 1.0 | +417 | +8 | -16,150 | 1,030 | -241 | 10.8/10.4 | 17.4/26.0 | 26.0 | 12.0 |
| BE after 60 min in total above +0.5R | H1 (pick) | 3.12 | 25.0 | 2.63 | +26,659 | +4,374 | -2,762 | 2,152 | -273 | 35.2/3.1 | 52.3/12.5 | 72.5 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.17 | +9,359 | +2,520 | -3,263 | 1,241 | -308 | 29.5/3.8 | 47.4/19.2 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 20.8 | 1.11 | +11,437 | +224 | -17,722 | 1,089 | -258 | 12.6/10.7 | 21.6/24.6 | 33.0 | 13.0 |
| BE after 60 min in a row above +0.5R | H1 (pick) | 3.12 | 26.2 | 2.44 | +23,248 | +3,814 | -2,889 | 1,876 | -274 | 35.2/3.1 | 50.8/14.1 | 68.9 | 8.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.17 | +9,359 | +2,520 | -3,263 | 1,241 | -308 | 29.5/3.8 | 47.4/19.2 | 68.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 22.4 | 1.17 | +18,697 | +366 | -18,969 | 1,123 | -276 | 13.0/11.9 | 21.9/26.9 | 32.9 | 12.0 |
| BE at +1R, only once 10 min have passed | H1 (pick) | 3.12 | 22.5 | 2.94 | +24,096 | +3,953 | -2,762 | 2,029 | -200 | 29.7/3.1 | 46.1/12.5 | 72.5 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 1.01 | +1,035 | +20 | -18,477 | 987 | -209 | 9.6/8.1 | 16.8/20.9 | 30.5 | 15.0 |
| BE at +1R, only once 15 min have passed | H1 (pick) | 3.12 | 22.5 | 2.94 | +24,096 | +3,953 | -2,762 | 2,029 | -200 | 29.7/3.1 | 46.1/12.5 | 72.5 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.6 | 1.0 | +374 | +7 | -18,477 | 981 | -209 | 9.6/9.0 | 16.8/22.0 | 30.5 | 15.0 |
| BE at +1R, only once 30 min have passed | H1 (pick) | 3.12 | 22.5 | 3.05 | +27,421 | +4,499 | -2,762 | 2,265 | -215 | 29.7/3.1 | 44.5/14.8 | 63.7 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 18.0 | 1.04 | +3,786 | +74 | -21,443 | 1,024 | -216 | 11.4/9.7 | 18.7/23.0 | 32.4 | 14.0 |
| (extra) BE only on a 1m CLOSE at +1R, not a wick | H1 (pick) | 3.12 | 22.5 | 3.36 | +30,008 | +4,923 | -2,513 | 2,372 | -205 | 37.5/3.1 | 58.6/6.2 | 92.0 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.4 | 1.05 | +5,122 | +100 | -17,182 | 1,015 | -232 | 10.7/9.8 | 17.2/23.8 | 30.5 | 14.0 |

| Variant | H1 Δ net $ | H2 Δ net $ | 2021-25 Δ net $ |
|---|---:|---:|---:|
| BE after 15 min (in total) of 1m closes above +0.5R | -5,723 | -3,495 | +8,359 |
| BE after 15 min in a row above +0.5R | -7,157 | -1,925 | +3,609 |
| BE after 30 min in total above +0.5R | -11,922 | -2,506 | -8,682 |
| BE after 30 min in a row above +0.5R | -11,595 | -1,106 | +1,847 |
| BE after 60 min in total above +0.5R | -6,646 | -1,106 | +12,867 |
| BE after 60 min in a row above +0.5R | -10,057 | -1,106 | +20,127 |
| BE at +1R, only once 10 min have passed | -9,209 | +0 | +2,465 |
| BE at +1R, only once 15 min have passed | -9,209 | +0 | +1,804 |
| BE at +1R, only once 30 min have passed | -5,884 | +0 | +5,216 |
| (extra) BE only on a 1m CLOSE at +1R, not a wick | -3,297 | +0 | +6,552 |

**Verdict: REJECT.**
- **Why: the breakeven at +1R is what keeps LIT's losers small.**
  - The trades that touch +1R fast and then fail are exactly the ones a later breakeven turns from a scratch into a full stop-out.
  - "BE on a close" changes 4 trades in H1, all from breakeven to a full stop.
  - "BE at 1R after 15 min" changes 2.
  - H2 had no such trade, so H2 is unchanged.
- **The time-in-profit rules lose $5-12k in H1 and $1-3.5k in H2.** The pass rate falls to 64-73% in H1.
- **2021-25 does look better for some of them** (+$8-20k for the 15-minute-total and the 60-minute versions). That is a reference line on 5m bars only, and it is not
  allowed to decide.

## Idea 5: profit lock

**The rule tested:** once price has covered x of the way from the fill to the target, the stop moves to lock a share of the open
profit. The main test locks 50% at 60 / 75 / 85%; extra versions lock 50% at 50%, and 25% / 75% at 75%. The breakeven at +1R stays.

| Variant | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today** (1 tick past the sweep extreme, touch stop, BE at +1R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| lock 50% of the open profit at 50% of the way | H1 (pick) | 3.12 | 27.5 | 3.69 | +29,583 | +4,854 | -2,422 | 1,845 | -190 | 32.0/3.1 | 61.7/6.2 | 90.7 | 11.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.5 | +10,388 | +2,797 | -2,157 | 1,153 | -276 | 29.5/0.0 | 50.0/0.0 | 95.7 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 27.8 | 1.11 | +9,785 | +192 | -19,471 | 678 | -235 | 7.9/7.9 | 14.2/18.0 | 38.6 | 23.5 |
| lock 50% at 60% of the way | H1 (pick) | 3.12 | 27.5 | 3.81 | +31,614 | +5,187 | -2,476 | 1,948 | -194 | 32.8/3.1 | 61.7/6.2 | 91.8 | 11.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.58 | +10,444 | +2,812 | -2,194 | 1,137 | -264 | 29.5/0.0 | 50.0/0.0 | 95.7 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 23.7 | 1.01 | +639 | +13 | -21,812 | 699 | -216 | 8.4/8.1 | 14.6/18.4 | 35.3 | 21.0 |
| lock 25% at 75% of the way | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | +2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 20.6 | 0.91 | -7,718 | -151 | -22,954 | 736 | -210 | 8.4/8.1 | 14.6/20.7 | 29.7 | 17.0 |
| lock 50% at 75% of the way | H1 (pick) | 3.12 | 22.5 | 3.97 | +32,899 | +5,398 | -2,513 | 2,443 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.59 | +10,302 | +2,774 | -2,320 | 1,200 | -250 | 29.5/0.0 | 47.4/0.0 | 93.8 | 15.5 |
|  | 2021-25 (ref) | 2.38 | 20.6 | 1.01 | +492 | +10 | -16,949 | 799 | -206 | 8.4/8.1 | 15.3/20.1 | 32.0 | 18.0 |
| lock 75% at 75% of the way | H1 (pick) | 3.12 | 22.5 | 3.04 | +22,629 | +3,713 | -2,906 | 1,874 | -179 | 36.7/3.1 | 59.4/6.2 | 91.3 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.54 | +10,172 | +2,739 | -2,196 | 1,198 | -254 | 29.5/0.0 | 47.4/0.0 | 95.4 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 20.6 | 1.03 | +2,703 | +53 | -17,470 | 828 | -208 | 7.8/8.1 | 14.1/18.8 | 31.0 | 19.5 |
| lock 50% at 85% of the way | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | +5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.59 | +10,327 | +2,780 | -2,295 | 1,202 | -250 | 29.5/0.0 | 47.4/0.0 | 93.9 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 18.6 | 0.99 | -987 | -19 | -15,908 | 878 | -203 | 7.9/8.1 | 14.3/21.1 | 30.0 | 19.0 |

| Variant | H1 Δ net $ | H2 Δ net $ | 2021-25 Δ net $ |
|---|---:|---:|---:|
| lock 50% of the open profit at 50% of the way | -3,722 | -77 | +11,215 |
| lock 50% at 60% of the way | -1,691 | -21 | +2,069 |
| lock 25% at 75% of the way | +0 | +0 | -6,288 |
| lock 50% at 75% of the way | -406 | -163 | +1,922 |
| lock 75% at 75% of the way | -10,676 | -293 | +4,133 |
| lock 50% at 85% of the way | +0 | -138 | +443 |

**Verdict: NEUTRAL; no rule.**
- **Why:** LIT's targets are 1.5-8R away, and the trades that get 75-85% of the way nearly always finish at the target.
- **It almost never fires:**
  - 75% → 1-3 trades in 2026;
  - 85% → 2;
  - 25% at 75% → none.
- **When it fires, it costs a little.** In H2 two trades that ran to the target were closed at the lock (−$163).
- **Locking earlier (50-60% of the way) or tighter (75% of the profit)** raises the win rate (22.5% → 27.5%) but cuts the runners
  that pay for the year: −$1.7k to −$10.7k in H1.

## What this means for the bot

- **Nothing changes.** The stop stays:
  - 1 tick past the 5m sweep extreme, closed on a touch;
  - breakeven at +1R (touch);
  - flat at 15:55;
  - the VIX-band target, banked at 8R.
- **No code change is needed** in `engine/lit.py`, `engine/lit_live.py` or `engine/sizing.py`.
- **Quote the H2 rate:** about $2,800 a month at the eval sizing.
- **Don't redo these ideas** without a new idea. Every variant is stored as a run `lit_u_stops_*` (tags `lit`, `lit_untested`,
  `lit_stops`) with all its trades.

## Reproduce

- `python -X utf8 tools/lit_t_stops.py check`: the wrapper equals `lit_live` trade for trade, and the baseline numbers.
- `python -X utf8 tools/lit_t_stops.py grid`: every variant → `research/lit/t_stops_results.json` (about 30 min, 1 process).
- `python -X utf8 tools/lit_t_stops.py save`: stores the runs `lit_u_stops_*`.
