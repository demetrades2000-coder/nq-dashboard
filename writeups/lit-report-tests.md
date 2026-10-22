## In one minute

- **The order (owner, 2026-10-18):** "continue pushing all of LIT; add the useful things from this report". Judged the LIT
  way: **2026 only**, rules picked on **Jan-Jun (H1)** and checked on **Jul-Oct (H2)**. A rule is adopted only if both halves
  make more money and trades stay at 2-4 a week. 2021-25 is a reference line.
- **The report:** 29 chapters, about 29,000 words. Chapters 1-20 explain LIT, chapters 21-23 give a test model and testing
  rules, 24-25 a glossary and checklists, 26 audits published LIT trades, and 27-28 are a contract for a bot developer
  (order states, clocks, sessions).
- **What was new for LIT:** 16 rule ideas (44 variants). They are reclaim, a confirmation deadline, acceptance, three
  displacement-quality rules, multiple inducements, inducement room, final sweep (2+ levels), premium/discount, double-sided
  sweep, first obstacle, continuation, failed reversal, sizing with costs and Berlin-time boxes. The report's own model
  (Session Range Reclaim V2) was also run as a benchmark.
- **Result: nothing is adopted.** Every variant loses money in at least one half, except one that is a lone spike. The best
  look:
  - **First obstacle within 0.5R: skip.** H1 +$1,313, H2 +$10. But 0.4R is −$580 in H2 and 0.6R is −$3,066. The H1 pick of
    that grid (0.75R, +$2,885) loses $2,969 in H2. **Rejected.**
  - **Continuation (a 2nd trade the same way after a non-losing first trade):** H1 −$699, H2 +$753. **Rejected.**
  - **Sizing with fees and slippage inside the $800:** fewer micros, costs $1,628 (H1 −$1,497, H2 −$131). It is safer bookkeeping, not
    better money. **Not adopted.**
- **The report's model (chapter 21) made 0 trades in 2026** on 208 days of 1m bars. Its four-part confirmation candle (close
  through the pivot, 1.5x body, top quarter, a fresh FVG) almost never happens on NQ 1m.
- **What the report changed in the bot:** four execution fixes from chapters 27-28, each with a test (below). The rules, the
  live settings and the numbers stay as they are: **2026 +$41,734, PF 3.66, 2.91 trades a week; H2 +$8,962 (about
  $2,400 a month).**

## How this was done

- `tools/lit_report.py`: `core()` is a copy of `engine/lit.py` `_run_core` with default-off hooks (skip a setup, size a
  setup, allow a second trade, re-size). With no hook it reproduces LIT live trade for trade (`check`: 120 trades in 2026,
  +$41,734, identical).
- Every number includes costs ($1.40 per micro, 1 tick slippage), true 1m bars for the entry in 2026, and the live sizing
  ($800 up to a 20-pt stop, then 800 x 20 / stop; weekly stop; Monday rule).
- "Skip" removes the setup and leaves the day free for a later one, as the live loop would. "Half" halves the micros (one
  rounding with the weekly stop, at least 1 micro).
- Eval columns: a new MFFU Builder 50K eval started on every 2026 session ($3,000 target, $2,000 trailing max loss). They
  show the % passed / failed within 10 sessions (2 weeks) and within 20 (1 month).
- Runs are stored as `lit_rep_*` (family other, tags lit, lit_report). All the numbers are in
  `research/lit/report_results.json`.

## Results (2026; H1 = Jan 2 - Jun 30, the pick half; H2 = Jul 1 - Oct 16, the check half)

Net $ with the change against LIT live in brackets.

| Rule tested (report chapter) | H1 net (pick) | H2 net (check) | 2026 net | $/month | PF 2026 · H1 / H2 | Win | Trades/wk 2026 · H1 / H2 | Max DD | Eval 2 wk pass / fail | Eval 1 mo pass / fail | 2021-25 PF (ref) | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **LIT live (today's rules)** | +32,773 | +8,962 | +41,734 | 4,254 | 3.66 · 4.44 / 2.46 | 26.7% | 2.91 · 3.12 / 2.56 | -2,315 | 26.7 / 1.9 | 55.3 / 3.9 | 1.01 | live |
| reclaim: trigger closes back beyond the swept level (skip if not) (ch13) | +15,966 (-16,807) | +8,304 (-658) | +24,270 | 2,474 | 3.02 · 2.96 / 3.15 | 27.7% | 2.01 · 2.19 / 1.73 | -2,728 | 14.6 / 1.5 | 31.6 / 1.9 | 1.13 | worse in both: rejected |
| reclaim: half size if not (ch13) | +23,957 (-8,816) | +6,275 (-2,687) | +30,231 | 3,082 | 3.41 · 4.11 / 2.3 | 26.7% | 2.91 · 3.12 / 2.56 | -1,894 | 14.6 / 0.0 | 35.9 / 0.0 | 1.09 | worse in both: rejected |
| deadline: confirmation within 3 bars of the extreme (ch13) | +10,564 (-22,209) | +6,376 (-2,586) | +16,940 | 1,727 | 2.4 · 2.6 / 2.17 | 23.2% | 1.67 · 1.68 / 1.67 | -2,981 | 21.4 / 1.9 | 29.6 / 11.2 | 1.04 | worse in both: rejected |
| deadline: confirmation within 6 bars of the extreme (ch13) | +17,849 (-14,924) | +9,027 (+65) | +26,876 | 2,740 | 2.78 · 2.83 / 2.7 | 26.0% | 2.33 · 2.5 / 2.05 | -2,989 | 18.9 / 1.5 | 35.9 / 10.2 | 1.21 | H2 only: rejected |
| deadline: confirmation within 9 bars of the extreme (ch13) | +22,731 (-10,042) | +8,874 (-88) | +31,605 | 3,222 | 2.93 · 3.2 / 2.47 | 25.5% | 2.67 · 2.85 / 2.37 | -3,218 | 21.8 / 1.9 | 44.2 / 11.2 | 1.04 | worse in both: rejected |
| deadline: confirmation within 12 bars of the extreme (ch13) | +22,777 (-9,996) | +8,919 (-43) | +31,696 | 3,231 | 2.95 · 3.21 / 2.49 | 24.8% | 2.74 · 2.93 / 2.44 | -3,392 | 21.8 / 1.9 | 44.7 / 13.1 | 1.04 | worse in both: rejected |
| acceptance: skip after 1+ closes beyond the swept level (ch18) | -177 (-32,950) | -260 (-9,222) | -436 | -44 | 0.0 · 0.0 / 0.0 | 0.0% | 0.15 · 0.16 / 0.13 | -436 | 0.0 / 0.0 | 0.0 / 0.0 | 1.23 | worse in both: rejected |
| acceptance: skip after 2+ closes beyond the swept level (ch18) | -1,969 (-34,742) | -1,438 (-10,400) | -3,406 | -347 | 0.0 · 0.0 / 0.0 | 0.0% | 0.44 · 0.47 / 0.38 | -3,406 | 0.0 / 0.0 | 0.0 / 0.0 | 1.82 | worse in both: rejected |
| acceptance: skip after 3+ closes beyond the swept level (ch18) | -998 (-33,771) | -2,463 (-11,425) | -3,461 | -353 | 0.33 · 0.63 / 0.0 | 7.4% | 0.66 · 0.7 / 0.58 | -4,081 | 0.0 / 0.0 | 0.0 / 0.0 | 1.66 | worse in both: rejected |
| acceptance: skip after 4+ closes beyond the swept level (ch18) | +2,781 (-29,992) | +6,509 (-2,453) | +9,290 | 947 | 2.51 · 1.89 / 3.14 | 22.2% | 0.87 · 0.82 / 0.96 | -2,756 | 12.6 / 0.0 | 19.9 / 4.9 | 1.56 | worse in both: rejected |
| acceptance: half after 2+ closes beyond (ch18) | +15,562 (-17,211) | +3,614 (-5,348) | +19,176 | 1,955 | 3.02 · 3.68 / 1.98 | 26.7% | 2.91 · 3.12 / 2.56 | -1,724 | 7.8 / 0.0 | 29.1 / 0.0 | 1.08 | worse in both: rejected |
| displacement: trigger closes in the top quarter of its bar (ch21) | +12,529 (-20,244) | +4,364 (-4,598) | +16,893 | 1,722 | 2.24 · 2.6 / 1.75 | 22.9% | 2.33 · 2.38 / 2.24 | -2,170 | 12.6 / 1.5 | 20.4 / 7.8 | 1.13 | worse in both: rejected |
| displacement: trigger closes in the top half of its bar (ch21) | +30,694 (-2,079) | +7,084 (-1,878) | +37,778 | 3,851 | 3.34 · 4.27 / 2.05 | 24.8% | 2.84 · 3.01 / 2.56 | -2,178 | 24.3 / 3.4 | 47.6 / 9.2 | 1.05 | worse in both: rejected |
| displacement: half size unless top quarter (ch21) | +23,062 (-9,711) | +6,496 (-2,466) | +29,558 | 3,013 | 3.11 · 3.73 / 2.16 | 26.7% | 2.91 · 3.12 / 2.56 | -2,018 | 20.9 / 1.0 | 42.2 / 2.4 | 1.04 | worse in both: rejected |
| displacement: body >= 1.5x median body of 20 bars (ch21) | +29,380 (-3,393) | +7,419 (-1,543) | +36,798 | 3,751 | 3.36 · 4.11 / 2.21 | 25.4% | 2.86 · 3.09 / 2.5 | -2,854 | 25.2 / 1.9 | 45.6 / 9.2 | 1.01 | worse in both: rejected |
| displacement: body >= 2.0x median body of 20 bars (ch21) | +29,145 (-3,628) | +6,725 (-2,237) | +35,870 | 3,657 | 3.31 · 4.16 / 2.06 | 25.7% | 2.74 · 2.93 / 2.44 | -2,516 | 25.2 / 1.0 | 45.1 / 6.3 | 0.97 | worse in both: rejected |
| displacement: body >= 3.0x median body of 20 bars (ch21) | +19,877 (-12,896) | -698 (-9,660) | +19,180 | 1,955 | 3.03 · 4.71 / 0.83 | 25.7% | 1.7 · 1.88 / 1.41 | -2,461 | 11.7 / 0.0 | 21.4 / 0.0 | 0.98 | worse in both: rejected |
| displacement: FVG left between the extreme and the trigger (skip without) (ch21) | +10,881 (-21,892) | +2,705 (-6,257) | +13,586 | 1,385 | 2.4 · 2.45 / 2.24 | 27.8% | 1.75 · 1.95 / 1.41 | -2,134 | 10.2 / 1.5 | 25.2 / 11.2 | 0.77 | worse in both: rejected |
| inducements: 2+ taken (skip with 1) (ch14) | +13,093 (-19,680) | +4,293 (-4,669) | +17,386 | 1,772 | 3.22 · 3.25 / 3.15 | 25.5% | 1.33 · 1.68 / 0.77 | -1,923 | 13.6 / 0.0 | 28.2 / 0.0 | 0.95 | worse in both: rejected |
| inducements: half size with only 1 (ch14) | +23,869 (-8,904) | +6,463 (-2,499) | +30,332 | 3,092 | 3.77 · 4.49 / 2.57 | 26.7% | 2.91 · 3.12 / 2.56 | -1,894 | 15.0 / 0.0 | 37.4 / 0.0 | 1.02 | worse in both: rejected |
| inducement: at least 0.1 ATR above the swept level (ch5) | +24,349 (-8,424) | +10,307 (+1,345) | +34,655 | 3,533 | 3.66 · 3.79 / 3.4 | 26.5% | 2.48 · 2.77 / 1.99 | -2,636 | 20.9 / 1.9 | 41.3 / 7.8 | 0.99 | H2 only: rejected |
| inducement: at least 0.2 ATR above the swept level (ch5) | +14,993 (-17,780) | +10,899 (+1,937) | +25,892 | 2,639 | 3.09 · 2.74 / 3.9 | 27.5% | 2.21 · 2.46 / 1.79 | -3,279 | 16.0 / 4.4 | 31.6 / 15.5 | 1.02 | H2 only: rejected |
| inducement: at least 0.3 ATR above the swept level (ch5) | +5,021 (-27,752) | +9,356 (+394) | +14,377 | 1,466 | 2.19 · 1.6 / 3.49 | 22.9% | 2.01 · 2.19 / 1.73 | -3,114 | 12.1 / 2.4 | 20.9 / 8.3 | 1.0 | H2 only: rejected |
| final sweep: 2+ levels swept (skip with 1) (ch7) | +29,223 (-3,550) | +7,703 (-1,259) | +36,927 | 3,764 | 3.62 · 4.16 / 2.59 | 25.0% | 2.43 · 2.77 / 1.86 | -2,905 | 24.8 / 1.9 | 48.1 / 1.9 | 0.9 | worse in both: rejected |
| final sweep: half size with 1 level swept (ch7) | +31,515 (-1,258) | +8,221 (-741) | +39,737 | 4,051 | 3.79 · 4.59 / 2.51 | 26.7% | 2.91 · 3.12 / 2.56 | -2,145 | 26.2 / 1.9 | 52.9 / 3.9 | 0.95 | worse in both: rejected |
| discount: limit in the lower half of the leg (skip in premium) (ch11) | +19,818 (-12,955) | +8,249 (-713) | +28,068 | 2,861 | 2.89 · 3.15 / 2.47 | 26.0% | 2.43 · 2.58 / 2.18 | -2,736 | 21.8 / 2.9 | 37.4 / 15.0 | 1.1 | worse in both: rejected |
| discount: half size in premium (ch11) | +25,851 (-6,922) | +9,171 (+209) | +35,023 | 3,570 | 3.49 · 3.96 / 2.73 | 26.7% | 2.91 · 3.12 / 2.56 | -2,315 | 27.7 / 1.0 | 54.9 / 3.4 | 1.05 | H2 only: rejected |
| double-sided: skip when the same box's other side was taken first (ch6) | +19,625 (-13,148) | +4,668 (-4,294) | +24,293 | 2,476 | 2.72 · 3.24 / 1.87 | 24.7% | 2.35 · 2.46 / 2.18 | -2,750 | 18.4 / 2.4 | 36.9 / 8.7 | 1.01 | worse in both: rejected |
| double-sided: skip when any opposite level was taken first today (ch6) | +1,319 (-31,454) | +4,820 (-4,142) | +6,139 | 626 | 1.82 · 1.27 / 2.79 | 17.5% | 0.97 · 1.02 / 0.9 | -4,681 | 3.4 / 1.9 | 8.3 / 2.4 | 0.88 | worse in both: rejected |
| double-sided: half size when any opposite level was taken first (ch6) | +16,435 (-16,338) | +6,759 (-2,203) | +23,194 | 2,364 | 2.88 · 3.19 / 2.4 | 26.7% | 2.91 · 3.12 / 2.56 | -2,055 | 11.7 / 1.9 | 31.1 / 1.9 | 0.99 | worse in both: rejected |
| first obstacle: skip when a level sits within 0.25R (ch26) | +32,218 (-555) | +8,962 (+0) | +41,179 | 4,198 | 3.64 · 4.4 / 2.46 | 26.5% | 2.84 · 3.01 / 2.56 | -2,315 | 29.1 / 1.9 | 57.8 / 3.9 | 1.02 | worse in both: rejected |
| first obstacle: skip when a level sits within 0.4R (ch26) | +33,992 (+1,219) | +8,382 (-580) | +42,374 | 4,320 | 3.71 · 4.57 / 2.37 | 27.4% | 2.74 · 2.89 / 2.5 | -2,315 | 30.1 / 1.5 | 53.9 / 3.9 | 0.96 | H1 only: rejected |
| first obstacle: skip when a level sits within 0.5R (ch26) | +34,086 (+1,313) | +8,972 (+10) | +43,057 | 4,389 | 3.91 · 4.68 / 2.62 | 27.5% | 2.65 · 2.81 / 2.37 | -2,315 | 30.1 / 1.9 | 54.4 / 3.9 | 0.97 | both up, but a lone spike: rejected |
| first obstacle: skip when a level sits within 0.6R (ch26) | +34,378 (+1,605) | +5,896 (-3,066) | +40,274 | 4,106 | 3.59 · 4.83 / 1.89 | 26.4% | 2.57 · 2.73 / 2.31 | -2,175 | 25.7 / 2.9 | 46.6 / 9.2 | 1.0 | H1 only: rejected |
| first obstacle: skip when a level sits within 0.75R (ch26) | +35,658 (+2,885) | +5,993 (-2,969) | +41,651 | 4,246 | 3.93 · 5.64 / 1.92 | 27.5% | 2.48 · 2.62 / 2.24 | -2,041 | 26.2 / 2.9 | 46.6 / 8.3 | 1.0 | H1 only: rejected |
| first obstacle: skip when a level sits within 1.0R (ch26) | +27,600 (-5,173) | +7,594 (-1,368) | +35,194 | 3,588 | 3.61 · 4.22 / 2.55 | 28.9% | 2.18 · 2.38 / 1.86 | -2,333 | 24.8 / 5.3 | 42.7 / 21.4 | 1.07 | worse in both: rejected |
| first obstacle: skip when a level sits within 1.5R (ch26) | +16,877 (-15,896) | +8,067 (-895) | +24,944 | 2,543 | 2.98 · 3.06 / 2.82 | 25.3% | 1.92 · 2.03 / 1.73 | -5,638 | 19.4 / 3.9 | 26.7 / 15.0 | 0.97 | worse in both: rejected |
| first obstacle: half size when a level sits within 0.5R (ch26) | +30,417 (-2,356) | +9,279 (+317) | +39,696 | 4,047 | 3.69 · 4.4 / 2.6 | 26.7% | 2.91 · 3.12 / 2.56 | -2,315 | 30.1 / 1.5 | 56.8 / 3.9 | 1.0 | H2 only: rejected |
| first obstacle: half size when a level sits within 1R (ch26) | +27,670 (-5,103) | +9,103 (+141) | +36,773 | 3,749 | 3.83 · 4.47 / 2.82 | 26.7% | 2.91 · 3.12 / 2.56 | -1,777 | 27.2 / 1.0 | 56.3 / 1.5 | 1.02 | H2 only: rejected |
| continuation: 2nd trade same side after a non-stop first trade (ch14) | +32,074 (-699) | +9,715 (+753) | +41,789 | 4,260 | 3.55 · 4.14 / 2.58 | 27.0% | 3.06 · 3.28 / 2.69 | -2,315 | 26.7 / 1.9 | 55.3 / 7.3 | 1.0 | H2 only: rejected |
| failed reversal: 2nd trade opposite side after a stop-out (ch14) | +32,752 (-21) | +8,507 (-455) | +41,259 | 4,206 | 3.56 · 4.43 / 2.29 | 25.8% | 3.01 · 3.2 / 2.69 | -2,315 | 26.7 / 1.9 | 51.9 / 3.9 | 1.03 | worse in both: rejected |
| failed reversal: same, at half size (ch14) | +32,763 (-10) | +8,830 (-132) | +41,594 | 4,240 | 3.63 · 4.44 / 2.41 | 25.8% | 3.01 · 3.2 / 2.69 | -2,315 | 26.7 / 1.9 | 55.3 / 3.9 | 1.02 | worse in both: rejected |
| sizing: fees + 1 tick slippage inside the $800 budget (ch15) | +31,276 (-1,497) | +8,831 (-131) | +40,107 | 4,089 | 3.68 · 4.47 / 2.48 | 26.7% | 2.91 · 3.12 / 2.56 | -2,180 | 26.2 / 1.0 | 55.3 / 2.4 | 1.02 | worse in both: rejected |
| European boxes on Berlin time (lon34 / lon23 in DST-mismatch weeks) (ch28) | +32,773 (+0) | +8,962 (+0) | +41,734 | 4,254 | 3.66 · 4.44 / 2.46 | 26.7% | 2.91 · 3.12 / 2.56 | -2,315 | 26.7 / 1.9 | 55.3 / 3.9 | 1.07 | no 2026 change: not adopted |

## What the tests say about LIT (useful even though nothing was adopted)

- **LIT's winners do not wait for a reclaim.** Asking the trigger to close back above the swept level (the report's
  "reclaim") cuts H1 by $16.8k. Most 2026 winners trigger on the 5m CISD while price is still below the level they swept.
  **Requiring a quick turn is the same story:** the confirmation within 3-12 bars of the low loses $10-22k in H1.
- **"Acceptance" is the normal LIT path here.** Almost every 2026 setup has one or more 5m closes beyond the swept level
  before it turns. "Skip after 1+ closes" leaves 0.15 trades a week. The report's acceptance test is meant for a fast
  wick-and-reclaim model, not for LIT's sweep-then-shift.
- **Stricter displacement or more inducements cost money in both halves.** That covers a top-quarter close, a 1.5-3x
  median body, an FVG in the move, 2+ inducements, and 2+ levels swept. The report says it too: adding confirmation delays
  the entry and removes reward.
- **Inducement room** (the trapped swing at least 0.1-0.3 ATR above the level) helps H2 (+$0.4k to +$1.9k) but costs H1
  $8-28k and drops H2 to under 2 trades a week.
- **Premium/discount of the leg:** half size in premium is +$209 in H2 but −$6,922 in H1.
- **A second trade (continuation, or a flip after a stop-out)** changes the money by under $1k either way. The "one trade a
  day" rule stays.
- **Berlin-time European boxes** (the report's ch.28 DST point: Reim's London window is 09:00-10:00 Berlin, so 04:00-05:00
  ET in the weeks the US and Europe are on different clocks):
  - In 2026 that is Mar 9-27; Oct 26-30 is still ahead. The 7 trades on those days are identical, so there is no 2026 change.
  - In 2021-25 (reference) it lifts PF from 1.01 to 1.07 (+$5.8k).
  - Not adopted: it does not improve the halves that decide. It is a clean candidate for the owner, since it cannot change
    2026.
  - Note for **Oct 26-30**: the bot keeps its 03:00-04:00 ET London box, exactly as in the backtest.

## The report's own model (chapter 21, Session Range Reclaim V2) as a benchmark

- **The rules, coded as written:** the range is 08:00-09:25. The first boundary break comes from 09:30, with a reclaim
  close within 3 bars. A strict 5-bar pivot is frozen. The confirmation candle closes through the pivot with a body of at
  least 1.5x the median, in the top quarter, as the third candle of an FVG, all before 10:30. Then a limit at the FVG
  midpoint for 5 bars, a stop 2 ticks beyond the setup low, a 2R target inside the range, flat at 11:00, one candidate a
  day. Sizing is the same as LIT.
- **2026 (208 days with clean 1m bars): 0 trades.** Where the days dropped out:

| Step | Days lost |
|---|---:|
| 08:00-09:25 range incomplete (missing 1m bars) | 5 |
| no boundary break 09:30-10:30 | 18 |
| no reclaim close within 3 bars | 55 |
| no strict 5-bar pivot | 2 |
| the other side of the range traded before confirmation | 19 |
| no confirmation candle meeting all four conditions within 6 bars | 99 |
| 2R target beyond the range | 6 |
| limit never filled | 4 |

- **Lesson:** the report calls its own model "a research candidate, not a validated strategy". On NQ 1m bars it is too
  strict to trade. LIT live trades 2.9 times a week because each of its rules was tested on its own.

## Every codable rule in the report, against LIT

"In LIT" = already part of the live rules. "Tested" = tested before (cited) or now (`lit_rep_*`). Not codable = needs a
human choice the report itself says is ambiguous.

| Report rule (chapter) | Status | How it is coded / where |
|---|---|---|
| Levels must exist before the event; a box counts only after it closes (3, 22) | in LIT | `engine/lit.py` levels carry their known bar |
| Swings are known only after their right-hand bars close (4, 22) | in LIT | fractals k=2 confirmed at j+2; `tests/test_lit_lookahead.py` |
| CISD (close through the open of the opposing run) vs a swing break (4) | tested | CISD beat the fractal break (`research/lit/entry.md`, `lit-final.md` "E: CISD shift -> fractal break") |
| Wick vs close break: choose one (4) | in LIT | close-based CISD trigger |
| Inducement swing above the swept level, taken first (5, 7) | in LIT | `idm_a` gate (1 ATR, 36 bars) |
| Inducement age (5) | tested | `lit_loss_idm12` (rejected, `lit-losses.md`) |
| Inducement room: too close to the level = noise (5) | tested now | `lit_rep_inducement_at_least_*` (rejected) |
| Multiple inducements with a stopping rule (6, 14) | tested now | `lit_rep_inducements_*` (rejected); stopping rule = 1 trade a day |
| Final sweep across 2+ levels (ETM, 7) | tested now | `lit_rep_final_sweep_*` (rejected) |
| Smart Risk 50% retracement / premium-discount of the range (7, 11) | tested now | `lit_rep_discount_*` (rejected); vs 18:00 / midnight open in `lit-losses.md` (rejected) |
| Double-sided sweep of a range (6) | tested now | `lit_rep_double_sided_*` (rejected) |
| Trendline / support touch traps (3, 7) | not codable | needs pivot anchors and touch tolerance the report leaves open |
| Smart money trap (zone reacts, then fails) (5) | not coded | needs a zone detector and a "minimum reaction" the report leaves open |
| SMT divergence with ES (24) | tested | `research/lit/filters.md`, `lit-losses.md` (rejected) |
| Order block / mean threshold / FVG CE / breaker entries (8, 9, 15) | tested | `research/lit/entry.md` (CISD level + 1m confirmation won; OB, FVG 50%, fib, breaker worse) |
| FVG left by the displacement (9) | tested | `filters.md` fvg0 (rejected) and now `lit_rep_displacement_fvg_*` (rejected) |
| Displacement: body vs ATR (10) | in LIT | 0.8 ATR (entry study pick) |
| Displacement: 1.5x median body, close in the top quarter (10, 21) | tested now | `lit_rep_displacement_*` (rejected) |
| PVSRA / vector candles (10) | tested | `filters.md` (rejected) |
| HTF context / 1H-4H bias, top-down timeframes (11) | tested | `lit-losses.md` section 4 (rejected) |
| Sessions: Reim's Asia 17-01 / London 09-10 Berlin / NY 08-09 (12) | tested | `lit-losses.md` Reim boxes (rejected); Berlin DST now (no 2026 change) |
| Reclaim close back beyond the reference (13) | tested now | `lit_rep_reclaim_*` (rejected) |
| Confirmation deadline (13) | tested now | `lit_rep_deadline_*` (rejected); live limit 30 min + 1m CISD 20 min |
| Cancel an unfilled order: stop breached, target traded, window over (13) | in LIT | `engine/lit.py` `simulate_x` |
| Never chase a missed move with a market order (13) | in LIT | no market fallback |
| Continuation after a reversal (14) | tested now | `lit_rep_continuation_*` (rejected) |
| Failed reversal becomes the other way (14) | tested now | `lit_rep_failed_reversal_*` (rejected) |
| Two-stage entry / second confirmation (14, 15) | tested | `lit-experiments.md` E (rejected) |
| Re-entry after a stop (18) | tested | `lit-experiments.md` E (not adopted; recheck with more data) |
| Second sweep of the same side (18) | tested | `lit-losses.md` (rejected: second sweeps are better) |
| Structural stop beyond the sweep + a buffer (15) | in LIT | 1 tick; buffers 2 pts / 0.1 / 0.25 ATR tested in `lit-experiments.md` D |
| Never widen the stop after entry (15) | in LIT | the stop only moves to breakeven |
| Size from the loss budget, round down, 0 = no trade (15, 27) | in LIT | `qty_for`; costs inside the budget tested now (rejected) |
| Target the nearest relevant opposing liquidity (16, 26) | tested | `lit-experiments.md` C (pool targets lose to the VIX band) |
| First obstacle in the path (16, 26) | tested now | `lit_rep_first_obstacle_*` (rejected: lone spike) |
| Partials (half at 3R) and breakeven variants (16, 26) | tested | `lit-losses.md`, `lit-experiments.md`, `risk.md` (all cost money) |
| Time exits (16) | tested | `research/lit/risk.md` (H1 better, H2 worse) |
| Trailing stops (16) | tested | `lit-losses.md` (rejected) |
| Grade / confluence score (17) | tested | grade sizing rejected for the old engine (CLAUDE.md); the report: "a score is not a probability" |
| News / event policy (18, 26) | tested | `filters.md`, `lit-losses.md` (no help; LIT entries rarely near releases) |
| Holidays and early closes in research and execution alike (22, 28) | tested + fixed | skip rule rejected (`lit-losses.md` D8); execution fix below |
| Ambiguous bars: stop before target (21, 22) | in LIT | conservative intrabar rule; no target credit on the fill bar |
| Separate signals, no-fills and trades (22, 25) | in LIT | live `signals` with status |
| Contract roll handling (19, 28) | open | see the audit list |

## Chapters 27-28 audit: the bot against the report's implementation contract

Checked: `engine/lit.py`, `engine/lit_live.py`, `tools/cloud_monitor.py`, `engine/ninjatrader.py` (and `engine/live.py`
where they call it).

**Fixed (with tests):**

1. **CANCEL PENDING (ch.27, "an entry fills while its cancel request is pending").**
   - Before: when NinjaTrader did not confirm an entry within 45 s, the adapter sent a cancel and forgot the order at once.
     A fill arriving after that would have been a position with no stop.
   - Now the order goes to `cancel_pending`. It is still watched, it blocks a new entry and it survives a restart. A late
     fill gets its stop and target. Only NinjaTrader's CANCELLED / REJECTED (or a long silence with the account flat)
     closes it.
   - Self-test checks "cancel pending" and "cancel confirmed".
2. **Partial exit fills (ch.27, "a stop or target partially fills").**
   - Before: if the stop filled 1 of 4 micros, the target still worked for 4. Its full fill would have opened a short.
   - Now the other leg is resized to what is still open. Self-test "partial exit".
3. **CME early closes (ch.28 product calendar).**
   - The day after Thanksgiving and Christmas Eve halt at 13:15 ET (12:15 CT), not 13:00 (`engine/lit_live.py`
     `early_close`).
   - The NinjaTrader adapter now refuses entries from 15 minutes before an early halt and flattens 5 minutes before it.
     Before, a LIT trade open at 13:00 on a holiday would have been held into the close and over the holiday.
   - Self-test "early close" (Black Friday 2026: a 12:00 entry is flattened at 13:11, a 13:02 entry is refused).
4. **The paper ledger keeps the original decision (ch.27, "a later data correction changes a historical pivot").**
   - Before: the cloud monitor rewrote a finished paper trade when a later poll's re-run on revised Yahoo bars gave a
     different exit.
   - Now a finished row is frozen. The re-run's different result is only noted next to it (`revised_replay`).
   - Test `python -X utf8 -m tests.test_ledger_freeze`.

NinjaTrader self-test: 54 of 54 checks pass (was 50). `tests/test_lit_live.py`: the day-end replay is still 120 of 120
trades identical, and the intraday polls Jan 2 - Feb 11 show 0 differences (the full intraday pass was not run to the end).
`tests/test_live_dryrun --quick`: 41/44, with the same 3 known failures as before.

**Already right:**
- **Closed bars only:** `engine/live.py` `clean_bars` drops the forming 5m and 1m bar.
- **No look-ahead:** swings are confirmed before use; the VIX band uses the previous day's close; boxes count once closed.
- **Time zones:** named time zones (America/New_York) and UTC storage, with no fixed offset.
- **Trading day and halt:** the trading day is 18:00-17:00 and the 17:00-18:00 halt is handled (`_closed`).
- **Restarts:** one trade a day and the weekly stop are rebuilt from the bars and the ledger, so a restart cannot reset
  them; NinjaTrader brackets survive a restart (state file).
- **Order handling:** partial entry fills grow the bracket; a rejected stop or target flattens; a missing bracket is retried
  or dropped if the account is already flat; the kill switch flattens everything.

**Open (listed, not changed today):**
- **Contract roll (most important, before mid-December 2026).**
  - The live window joins the stored back-adjusted TradingView file to Yahoo's NQ=F, which is not back-adjusted, and the
    Yahoo bars win where the two overlap.
  - After the December roll, the window's bars from before the roll stay on the December contract's prices, roughly
    0.5-1% (100-250 pts) away from the March contract. They stay until they leave the window, which means into February
    for the previous-month levels. The previous day, week and month levels and the gaps are then wrong, which gives false
    sweeps and targets.
  - Fix before the roll: detect the roll jump in the merged window and shift the older bars by it (back-adjust), with a
    test on the September 2026 roll.
- **Missing bars inside a session:**
  - The PC bot blocks entries when the feed goes stale, and the cloud monitor reports gaps. Neither one makes a setup that
    spans a gap "unknown" as the report asks.
  - Changing that would change the backtest (the 5m file has gaps too), so it needs its own test.
- **Holiday calendar:** the rule-based calendar is not CME's published, versioned calendar. The bot does not know about a
  one-off closure (for example a national day of mourning).
- **Integer partials:** none apply, since LIT takes no partial profits. If a partial is ever added, its micros must be fixed
  before the trade (one micro cannot be halved).
- **NQ signals, MNQ orders:** the bot reads NQ prices and routes MNQ at the same price levels. The report wants that
  mapping written down. NQ and MNQ trade within a tick or two of each other, but they are separate order books.
- **Costs inside the risk budget:** the $800 budget does not include fees and slippage, so a full-size stop-out costs about
  $840-880. The variant that includes them is tested above (−$1.6k in 2026); it is the owner's choice.

## Files and how to rerun

- `python tools/lit_report.py check` checks that the copy equals LIT live. `test` runs every variant (one process, about 15
  min), `srr` runs the chapter 21 model, `dst` the Berlin boxes, and `save` stores the `lit_rep_*` runs.
- Results: `research/lit/report_results.json`. Beginner guide to the report: `research/writeups/lit-playbook.md`.
