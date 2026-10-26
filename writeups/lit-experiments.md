## In one minute

- **The owner's request (2026-10-18):** "test other things": trade LIT the way a person with risk management would on a 50K
  eval.
- **What was tested:** about 150 variants of LIT final, in five groups:
  - **A.** Sizing and risk.
  - **B.** A New York second session.
  - **C.** Other targets (draws on liquidity) and partials.
  - **D.** Other stops.
  - **E.** The ideas the masters study (`research/lit/masters.md`) collected: breakeven on structure, ICT loss halving,
    cushion-then-press, partials at internal pools, re-entry, minimum 3R, two-stage entry.

  The MFFU $1,000 soft daily loss limit is part of every number.
- **The rule for adopting a change (owner):** it must be better in **2026 Jan-Jun (H1, where it was picked)** **and** in
  **2026 Jul-Oct (H2, the check)**. 2021-25 is shown as a reference only.
- **The strategy itself held:** no change to entries, targets, stops, breakeven, partials or sessions made more money in both
  halves.
  - The closest misses were each within ±$0.7k in one half and lost in the other:
    - target the nearer of the VIX band or an opening gap;
    - a half-size re-entry after a stop.
  - LIT final stays as it is.
- **Sizing is where the eval odds move.** LIT wins about 1 trade in 4, and the winners are big (5-8R). So:
  - more risk per trade means faster passes and also more failures;
  - shrinking after losses (the ICT rule) kills it, because the rare big winner then comes at quarter size.
- **The top 3:**
  1. **Fast-eval size** (`risk_ref_stop 40`): passes about half of all evals within 2 weeks in both halves, and a pass takes
     about half as long counting resets. About 1 eval in 4 fails within 2 weeks. **Adopt as the eval-mode option, owner's
     choice.**
  2. **Max-loss room cap 60%:** far fewer failed evals in H1 and in 2021-25; H2 unchanged. **Adopt as the safe-eval option.**
     Not both at once: the cap takes the speed back.
  3. **Re-entry after a stop at half size:** not adopted. Kept as the next idea once more 2026 data exists.

## How to read the tables

- **Money:** net $ and $ per month, MNQ micros at $2 a point, after costs: $1.40 per micro round trip, plus 1 tick of
  slippage on market entries and on stop, breakeven and end-of-day exits.
- **Today's size (LIT final):** $800 risk up to a 20-pt stop, then 800 × 20 ÷ stop. The median 2026 stop is 47 pts, so a
  typical trade is 3 micros, about **$290 at risk**.
- **Eval columns:** a fresh MFFU Builder 50K eval is started on every session. The rules:
  - $3,000 profit target;
  - $2,000 max loss, trailing the end-of-day high and locking at +$100; an intraday low through the floor fails the eval;
  - $1,000 soft daily loss limit: the position is closed and the day ends, but it is not a failure.

  The columns:
  - **2 wk / 1 mo:** % of evals passed / failed within 10 / 20 sessions.
  - **Pass rate:** passed ÷ (passed + failed), within 60 sessions.
  - **Median:** median sessions to a pass.
  - **Time to pass:** expected sessions until you hold a passed eval, counting resets after failures. This is the owner's
    speed question in one number.
  - **Evals per pass:** how many evals you buy per pass (about $100 each with a coupon).
- **Sizing that depends on the eval's own state** (room cap, cushion, press): $ and drawdown come from playing evals back to
  back, starting a new one the session after each ends.
- **H1 and H2 eval columns** only see their own half.

## A. Sizing and risk like a prop trader

| Size rule | Half | Net $ | $/mo | PF | Max DD | 2 wk pass/fail | 1 mo pass/fail | Pass rate | Median | Time to pass | Evals per pass |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **LIT final** ($800 to a 20-pt stop) | H1 | +30,661 | 5,030 | 3.55 | −3,097 | 32.8 / 14.8 | 52.3 / 25.8 | 66% | 8 | 14.5 | 1.51 |
| | H2 | +8,212 | 2,211 | 2.19 | −1,741 | 23.1 / 0.0 | 41.0 / 0.0 | 100% | 22.5 | 26.2 | 1.00 |
| | 2021-25 | +3,806 | 75 | 1.03 | −20,695 | 7.1 / 16.3 | 15.0 / 39.2 | 32% | 20 | 65 | 3.2 |
| $400 to a 20-pt stop | H1 | +15,573 | 2,555 | 3.46 | −1,703 | 7.0 / 0.0 | 35.2 / 0.0 | 100% | 22 | 24.7 | 1.00 |
| | H2 | +3,415 | 919 | 1.88 | −973 | 1.3 / 0.0 | 15.4 / 0.0 | 100% | 34.5 | 34.9 | 1.00 |
| $600 to a 20-pt stop | H1 | +23,297 | 3,822 | 3.60 | −2,301 | 26.6 / 3.1 | 46.9 / 7.8 | 85% | 14 | 18.4 | 1.18 |
| | H2 | +5,611 | 1,511 | 2.04 | −1,242 | 6.4 / 0.0 | 19.2 / 0.0 | 100% | 32.5 | 32.7 | 1.00 |
| $1,000 to a 20-pt stop | H1 | +37,647 | 6,177 | 3.29 | −4,363 | 41.4 / 18.8 | 58.6 / 24.2 | 71% | 7 | 10.9 | 1.41 |
| | H2 | +10,718 | 2,886 | 2.23 | −2,117 | 29.5 / 2.6 | 47.4 / 14.1 | 68% | 12 | 24.8 | 1.47 |
| $1,500 to a 20-pt stop | H1 | +31,802 | 5,218 | 2.10 | −8,714 | 48.4 / 32.0 | 57.8 / 35.2 | 62% | 5 | 9.6 | 1.61 |
| | H2 | +16,086 | 4,331 | 2.15 | −3,367 | 44.9 / 24.4 | 53.8 / 41.0 | 56% | 6 | 14.2 | 1.79 |
| **Fast-eval: $800 to a 40-pt stop** | H1 | **+38,345** | 6,291 | 2.71 | −6,237 | **52.3 / 21.1** | 62.5 / 23.4 | 73% | 5 | **8.2** | 1.38 |
| | H2 | **+15,962** | 4,298 | 2.18 | −3,306 | **47.4 / 26.9** | 56.4 / 38.5 | 59% | 6 | **13.3** | 1.70 |
| | 2021-25 | +15,418 | 302 | 1.09 | −30,740 | 15.8 / 33.1 | 23.9 / 60.4 | 30% | 10 | 43 | 3.4 |
| Flat $600 at any stop | H1 | +29,920 | 4,909 | 2.43 | −6,265 | 42.2 / 19.5 | 54.7 / 31.2 | 64% | 5 | 11.3 | 1.57 |
| | H2 | +13,675 | 3,682 | 2.08 | −3,438 | 37.2 / 21.8 | 46.2 / 38.5 | 48% | 7 | 22.3 | 2.08 |
| Flat $800 at any stop | H1 | +39,107 | 6,416 | 2.37 | −8,457 | 48.4 / 26.6 | 52.3 / 33.6 | 61% | 3 | 9.0 | 1.64 |
| | H2 | +19,145 | 5,155 | 2.10 | −4,628 | 48.7 / 32.1 | 52.6 / 43.6 | 55% | 4 | 11.0 | 1.83 |
| Flat $1,000 at any stop | H1 | +48,472 | 7,952 | 2.27 | −10,861 | 43.0 / 40.6 | 43.0 / 43.0 | 50% | 3 | 8.1 | 2.00 |
| | H2 | +23,030 | 6,200 | 2.03 | −5,784 | 51.3 / 37.2 | 52.6 / 44.9 | 54% | 3 | 9.2 | 1.85 |
| **Room cap: LIT final, never more than 60% of the room to the max-loss floor** | H1 | +24,835 | 4,074 | 3.35 | −2,684 | **32.8 / 3.9** | 50.8 / **10.2** | **80%** | 10 | 16.2 | 1.26 |
| | H2 | +7,004 | 1,886 | 2.02 | −1,732 | 23.1 / 0.0 | 41.0 / 0.0 | 100% | 22.5 | 26.8 | 1.00 |
| | 2021-25 | +8,699 | 170 | 1.10 | −12,074 | 7.1 / **6.8** | 13.6 / 19.4 | 30% | 18 | 84 | 3.3 |
| Room cap 50% | H1 | +23,419 | 3,842 | 3.42 | −2,716 | 32.0 / 2.3 | 46.9 / 6.2 | 75% | 10 | 20.2 | 1.33 |
| | H2 | +4,904 | 1,320 | 1.78 | −1,826 | 23.1 / 0.0 | 41.0 / 0.0 | 100% | 19.5 | 24.9 | 1.00 |
| $1,200 to a 20-pt stop + room cap 40% | H1 | +26,596 | 4,363 | 3.44 | −3,281 | 33.6 / 1.6 | 50.8 / 12.5 | 69% | 7 | 20.4 | 1.45 |
| | H2 | +7,514 | 2,023 | 1.97 | −2,059 | 26.9 / 0.0 | 38.5 / 0.0 | 96% | 22 | 28.6 | 1.05 |
| Fast-eval + room cap 60% | H1 | +27,319 | 4,482 | 2.67 | −3,956 | 45.3 / 13.3 | 53.9 / 22.7 | 64% | 5 | 14.3 | 1.56 |
| | H2 | +12,446 | 3,351 | 2.16 | −2,821 | 42.3 / 5.1 | 55.1 / 15.4 | 64% | 7 | 21.1 | 1.57 |
| Half size once the eval is up $1,000 | H1 | +27,342 | 4,486 | 3.34 | −3,097 | 33.6 / 13.3 | 54.7 / 15.6 | 81% | 10 | 13.5 | 1.24 |
| | H2 | +6,420 | 1,729 | 2.03 | −1,741 | 19.2 / 0.0 | 29.5 / 0.0 | 100% | 27 | 29.0 | 1.00 |
| 1.5× once the eval is up $1,000 | H1 | +31,301 | – | 3.54 | −3,097 | 35.2 / 14.8 | 55.5 / 27.3 | 67% | 8 | 13.7 | – |
| | H2 | +8,920 | – | 2.23 | −1,741 | 23.1 / 0.0 | 44.9 / 0.0 | 85% | 17 | 27.5 | – |
| Cushion first (masters S3): $500, $800 after +$1,500, $300 if the room is < $1,000 | H1 | +18,315 | – | 3.12 | −2,038 | 25.0 / 0.0 | 41.4 / 0.8 | 78% | 11 | 24.6 | – |
| | H2 | +5,711 | – | 2.20 | −1,125 | 2.6 / 0.0 | 16.7 / 0.0 | 100% | 33 | 34.7 | – |
| Room sizing (masters S2): risk = 45% of the room, $200-1,000 (as the 20-pt-stop $) | H1 | +24,824 | – | 3.75 | −2,136 | 32.0 / 0.0 | 46.1 / 3.1 | 76% | 9.5 | 23.8 | – |
| | H2 | +3,517 | – | 1.69 | −1,690 | 17.9 / 0.0 | 29.5 / 0.0 | 100% | 23 | 27.8 | – |
| ICT halving: ×0.5 after a stop, ×0.25 after a second, full once 50% is made back | H1 | +7,636 | – | 2.75 | −1,350 | 0.0 / 0.0 | 0.8 / 0.0 | 100% | 47 | 42.7 | – |
| | H2 | +2,376 | – | 1.89 | −853 | 0.0 / 0.0 | 0.0 / 0.0 | 100% | 39.5 | 39.5 | – |
| Grade sizing A 1.25 / B 1 / C 0.75 | H1 | +28,153 | – | 3.52 | −2,922 | 31.2 / 9.4 | 50.8 / 17.2 | 72% | 9.5 | 16.6 | – |
| | H2 | +6,489 | – | 2.05 | −1,629 | 12.8 / 0.0 | 25.6 / 0.0 | 100% | 31 | 31.4 | – |
| ×0.75 until the week's first winner | H1 | +24,665 | – | 3.84 | −2,257 | 26.6 / 2.3 | 45.3 / 6.2 | 85% | 13 | 18.1 | – |
| | H2 | +5,955 | – | 2.09 | −1,237 | 11.5 / 0.0 | 25.6 / 0.0 | 100% | 30.5 | 31.0 | – |

**The two answers the owner asked for:**
- **Risk level with the highest pass rate:** the smaller the risk, the higher the pass rate.
  - **$400 to a 20-pt stop** (about $150 actually at risk) passes **100% in both halves**, but the median pass takes 22 and
    34.5 sessions. That breaks the 3-week rule.
  - The highest pass rate whose H1 median stays within 3 weeks is **$600 to a 20-pt stop**: 85% in H1, 100% in H2. Its H2 median
    is 32.5 sessions, also too slow.
- **Risk level with the most 2-week passes:** **$800 up to a 40-pt stop.**
  - It is the best of all in H1 (52.3%) and among the best in H2 (47.4%).
  - It decides 73-74% of evals within 2 weeks, against 48% / 23% today.
  - The price is that 21-27% of evals fail within 2 weeks.
  - A flat $800-1,000 at any stop is about as fast but has a worse PF (2.0-2.4), because the widest stops are LIT's worst trades.
    So **"wide stop, less risk" still holds.**

**The other sizing ideas:**
- **Setup grade:** grade A means a big displacement, a deep sweep, 2+ inducements and the trade inside the high/low-of-week
  window; thresholds are the H1 medians. It does not predict anything. In H1, A trades had PF 2.47 against 4.05 for C; in H2,
  A 3.63, B 1.25, C 2.65; in 2021-25 every grade is about PF 1.04. Every grade weighting made less money. **Rejected.**
- **ICT halving:** with 1 winner in 4-5 trades the bot is almost always reduced, and the winners come at a quarter of the size.
  2026 makes +$10.0k against +$38.9k, and no eval passes within 2 weeks. **Rejected.**
- **Smaller until the week's first winner:** better PF, less money in both halves. **Rejected.**
- **Pressing after +$1,000:** +$0.6-0.7k in each half, but the H2 pass rate falls (85% vs 100%). **Not adopted.**
- **Cushion first and room sizing (masters S2/S3):** they protect the eval, but passes come too slowly in H2 (2-week passes
  2.6-18%). **Rejected.**
- **Daily loss limit:**
  - At today's size and 1 trade a day, the MFFU $1,000 soft daily loss limit never triggers.
  - It cuts losses only at $1,500+ risk on a tight stop.
  - A hard eval-day loss stop of $300 or $500 changes nothing either, even with 2 trades a day (section B).

**Neighbours of the fast-eval size** (2-week pass/fail; time to pass):

| Rule | H1 | H2 | 2021-25 |
|---|---|---|---|
| $700 to 40 pts | 47.7 / 18.0, 10.3 sessions | 35.9 / 16.7, 23.5 | 13.2 / 27.2, 52 |
| **$800 to 40 pts** | 52.3 / 21.1, 8.2 | 47.4 / 26.9, 13.3 | 15.8 / 33.1, 43 |
| $900 to 40 pts | 54.7 / 21.9, 7.6 | 51.3 / 25.6, 11.2 | 18.3 / 39.7, 38 |
| $800 to 35 pts | 49.2 / 19.5, 9.4 | 35.9 / 17.9, 23.7 | 15.3 / 31.3, 47 |
| $800 to 45 / 50 pts | 50.8 / 21.9, 8.6-8.7 | 51.3-52.6 / 25.6, 11.5-11.9 | 15-16 / 37-38, 44-45 |

- **The H2 speed has a cliff just below the pick:** $700 or a 35-pt reference lose half of the H2 gain. More risk is always
  faster and always fails more.
- **Slippage:** 2 extra ticks keep most of it (H1 +$37.6k, H2 +$15.7k, the same 2-week odds).
- **Typical risk:** the median trade risks $560-670 (5-7 micros), against $245-300 today.

## B. A second session: New York

The question: run LIT a second time in the NY killzones (09:30-11:30 and 13:30-15:30) as a diversifier. Three ways to combine
it with London: only on days London did not trade, only after London won, or always (2 trades a day).

| Variant (London 02:00-08:00 + NY leg) | H1 net $ | H2 net $ | 2026 PF | Trades/wk | NY trades 2026 (net) | 2021-25 PF / net |
|---|---:|---:|---:|---:|---:|---|
| **LIT final** (02:00-15:30, 1 a day) | **+30,661** | **+8,212** | 3.06 | 3.08 | 25 (+7.2k) | 1.03 / +3.8k |
| London only | +22,940 | +8,760 | 2.94 | 2.48 | – | 1.11 / +8.7k |
| + NY killzones, same rules, no London trade | +23,643 | +9,019 | 2.94 | 2.69 | 9 (+1.0k) | 1.06 / +5.5k |
| + NY killzones, pools + VIX targets, plain limit, no London trade | +25,242 | +9,340 | 2.80 | 3.03 | 23 (+2.9k) | 1.03 / +4.1k |
| + same, only after London won | +22,940 | +8,106 | 2.83 | 2.55 | 3 (−0.7k) | 1.08 / +7.0k |
| + same, always (2 a day) | +24,938 | +9,235 | 2.64 | 3.33 | 35 (+2.5k) | 1.10 / +15.3k |
| + NY 08:00-15:30, all levels, always (2 a day) | +31,972 | +7,286 | 2.85 | 3.40 | 38 (+7.6k) | 0.99 / −1.7k |
| + NY killzones, London + NY boxes as the swept liquidity | +22,724 | +9,019 | 2.89 | 2.67 | 8 (+0.0k) | 1.07 / +6.5k |

- **NY LIT setups are rare in 2026:**
  - Only 8-17 a year pass LIT's own filters in the NY killzones.
  - The 1-minute confirmation is the main reason. Without it there are 37 a year, PF 1.76.
  - "Only after London won" almost never fires: a London winner has usually hit the VIX band already.
- **Verdict:** no NY leg beats LIT final in both halves. LIT final already trades NY its own way: the first setup of the day,
  until 15:30. **Rejected.**

## C. Draws on liquidity as targets, and partials

| Target | H1 net $ | H2 net $ | 2026 PF | 2026 max DD | 2021-25 PF / net |
|---|---:|---:|---:|---:|---|
| **VIX band, 18:00 open ± 1 implied day move, bank 8R (final)** | **+30,661** | **+8,212** | 3.06 | −3,097 | 1.03 / +3.8k |
| VXN band (the Nasdaq volatility index) | +29,450 | +8,348 | 2.95 | −3,097 | 1.07 / +7.9k |
| Weekly high/low | +18,050 | +4,423 | 2.34 | −3,627 | 0.92 / −7.0k |
| Weekly + monthly high/low | +17,300 | +7,950 | 2.39 | −3,629 | 0.99 / −1.1k |
| Previous day/week/month high/low (lit_A) | +28,141 | +6,885 | 2.84 | −2,802 | 0.97 / −3.0k |
| NWOG / NDOG gap edges | +16,792 | −160 | 2.82 | −3,282 | 1.21 / +10.3k |
| Asia + London extremes | +15,982 | +5,876 | 2.32 | −2,916 | 1.01 / +0.5k |
| Equal highs/lows (build-ups) | +10,912 | +4,945 | 2.09 | −3,085 | 1.05 / +3.1k |
| Nearer of the VIX band or a gap edge | +31,379 | +7,897 | 3.09 | −2,806 | 1.08 / +8.4k |
| Nearer of the VIX band or PW/PM | +31,014 | +7,734 | 3.00 | −3,097 | 1.06 / +6.4k |
| Nearer of the VIX band or a build-up | +25,757 | +9,564 | 3.09 | −3,093 | 1.11 / +10.3k |
| VIX band, no bank / bank 6R / bank 10R | +32,349 / +21,661 / +30,030 | +5,808 / +5,261 / +4,877 | 3.00 / 2.42 / 2.84 | −6,164 / −3,097 / −6,164 | – |
| Half at the first pool (any) ≥ 2R, rest to the VIX band | +27,111 | +7,594 | 2.84 | −3,097 | 1.10 / +11.1k |
| Half at the first PD/PW/PM ≥ 1R, rest to the VIX band | +30,892 | +8,015 | 3.06 | −2,802 | 1.06 / +6.9k |
| 25% at the first internal 5m swing pool ≥ 1R, rest to the VIX band (masters) | +24,470 | +7,572 | 2.70 | −3,097 | 1.05 / +5.6k |
| 20% / 30% / 50% at the internal swing pool | +25,915 / +23,965 / +19,083 | +7,783 / +7,572 / +7,150 | 2.79 / 2.67 / 2.39 | −3,097 | – |
| Half at the first pool ≥ 2R, runner to PW/PM | +10,591 | +5,820 | 1.90 | −5,604 | 1.05 / +4.9k |

- **Nothing beats the VIX band in both halves.** The two near misses are the nearer of the VIX band or a gap edge, and half at
  the first PD/PW/PM. Each gains under $0.8k in H1 and loses $0.2-0.3k in H2.
- **Partials always cost money:** they cut the 5-8R days that carry LIT.
- **Rejected.**

## D. Stops

| Stop | Median stop | H1 net $ | H2 net $ | 2026 PF | 2026 max DD | 2-week fail H1 / H2 | Total R H1 / H2 |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Sweep extreme + 1 tick (final)** | 47 pts | **+30,661** | **+8,212** | 3.06 | −3,097 | 14.8 / 0.0 | 51.5 / 24.3 |
| Sweep extreme + 2 pts | 48 | +30,085 | +5,232 | 2.99 | −2,914 | 10.2 / 0.0 | – |
| Sweep extreme + 0.1 ATR / 0.25 ATR | 48 / 50 | +27,389 / +20,779 | +5,289 / +3,362 | 2.84 / 2.34 | −3,631 / −5,060 | – | – |
| Protected 1m swing (low since the limit tap) + 1 tick | 17 | +36,080 | +6,512 | 1.92 | −10,476 | 39.8 / 44.9 | 51.0 / 6.1 |
| Protected 1m swing + 0.1 ATR | 18 | +37,586 | +15,139 | 2.21 | −9,310 | 36.7 / 41.0 | 51.4 / 21.6 |
| Protected 1m swing + 0.25 ATR | 21 | +33,332 | +11,858 | 2.16 | −5,504 | 34.4 / 32.1 | 45.3 / 22.1 |
| Post-sweep higher low + 1 tick | 40 | +33,973 | +4,009 | 2.45 | −4,241 | 18.8 / 9.0 | – |
| The swept pool + 1 tick | 34 | +12,942 | −2,271 | 1.65 | −5,594 | – | – |
| The inducement low + 1 tick | 31 | +11,288 | −1,428 | 1.61 | −5,643 | – | – |

- **The tight 1m stop looks good in $ but isn't better.**
  - **Why the $ look big:** today's size rule puts the full $800 on a stop under 20 pts, so a trade risks about 2.6× more.
  - **Per $ risked it is the same or worse:** the total R in H1 is the same (51.4 vs 51.5), H2 is lower (21.6 vs 24.3), and
    the win rate falls from 24% to 15%.
  - **At equal risk ($400 a trade) it is not better in both halves:** H1 +$20.4k vs +$18.8k for the final's stop, but H2 +$8.1k
    vs +$9.0k, and 2021-25 loses (PF 0.93 vs 1.07).
- **Stops at the pool or the inducement** sit inside the stop hunt and lose in H2.
- **Rejected.** The sweep extreme + 1 tick stays.

## E. The masters' ideas (`research/lit/masters.md`)

| Idea | H1 net $ | H2 net $ | 2026 PF | Trades/wk | 2-week pass/fail H1 | H2 | 2021-25 PF / net |
|---|---:|---:|---:|---:|---:|---:|---|
| **LIT final (breakeven at +1R)** | **+30,661** | **+8,212** | 3.06 | 3.08 | 32.8 / 14.8 | 23.1 / 0.0 | 1.03 / +3.8k |
| Breakeven once the first opposing 1m swing after the fill is taken (no 1R) | +22,768 | +2,858 | 3.55 | 3.08 | 28.1 / 0.0 | 10.3 / 0.0 | 0.93 / −7.5k |
| Breakeven once the first opposing 5m swing is taken (no 1R) | +24,710 | +5,112 | 2.54 | 3.08 | 35.2 / 5.5 | 16.7 / 3.8 | 0.93 / −7.5k |
| 5m swing or 1R, whichever first | +28,911 | +5,895 | 3.42 | 3.08 | 35.9 / 5.5 | 16.7 / 0.0 | 0.85 / −13.1k |
| No breakeven | +30,098 | +6,707 | 2.23 | 3.08 | 42.2 / 18.0 | 23.1 / 3.8 | 1.06 / +10.6k |
| Minimum target 3R (and 30 or 40 pts: same trades) | +29,909 | +8,115 | 3.04 | 2.91 | 32.8 / 14.8 | 23.1 / 0.0 | 1.03 / +2.6k |
| Minimum target 2R | +30,661 | +8,369 | 3.08 | 3.06 | 32.8 / 14.8 | 23.1 / 0.0 | 1.04 / +4.8k |
| Re-entry at half size after a stop (same day and side, new sweep beyond the stop, inducement gate, target untouched) | +30,408 | +10,099 | 3.06 | 3.40 | 32.8 / 14.1 | 23.1 / 0.0 | 1.02 / +2.0k |
| Re-entry at full size | +30,012 | +11,907 | 3.05 | 3.40 | 32.8 / 14.1 | 35.9 / 6.4 | 0.99 / −0.6k |
| Two-stage entry: 20% on the limit, the rest on the 1m confirmation | +30,178 | +5,848 | 2.88 | 3.67 | 35.2 / 14.1 | 12.8 / 0.0 | 0.92 / −8.4k |
| Two-stage, 25% / 33% on the limit | +30,104 / +30,038 | +5,740 / +5,033 | 2.83 / 2.73 | 3.67 | – | – | 0.90 / 0.86 |

- **Breakeven on structure:** it moves the stop too early. With the 1m version, 85 of 127 trades end at breakeven against 37,
  and the winners are cut. **Rejected.**
- **Minimum 3R:** removes 7 trades and a little money. **Minimum 2R:** neutral (+$0.16k in H2). Neither is worth a rule.
- **Re-entry:** adds 13 trades. H2 gains +$1.9k at half size and +$3.7k at full size, but H1 loses −$0.3k / −$0.6k and 2021-25
  is worse. **Not adopted.** It is the next thing to recheck when more 2026 data exists.
- **Two-stage entry:** the limit share fills on setups the 1m confirmation would have skipped. **Rejected.**
- **ICT halving, cushion-then-press, room sizing:** see section A.

## The top 3 and what to do

1. **Fast-eval size for the MFFU 50K eval:** `risk_ref_stop 40`, i.e. $800 risk up to a 40-pt stop, then 800 × 40 ÷ stop
   (run `lit_x_fast_eval`).
   - **The gain:**
     - 2-week passes: H1 52.3% vs 32.8%, H2 47.4% vs 23.1%.
     - Expected sessions to a pass, counting resets: H1 8.2 vs 14.5, H2 13.3 vs 26.2.
     - Net: H1 +$38.3k vs +$30.7k, H2 +$16.0k vs +$8.2k.
     - 2021-25 is better too: PF 1.09 vs 1.03, 2-week passes 15.8% vs 7.1%.
   - **The cost:**
     - 2-week fails: H1 21.1% vs 14.8%, H2 26.9% vs 0%.
     - Max drawdown about doubles (2026 −$6.2k).
     - About 1.6 evals bought per pass instead of 1.25 in 2026, roughly +$40 per pass at couponed prices.
   - **Recommendation:** adopt as the **eval-mode option**, the open "fast-eval sizing mode" in CLAUDE.md, if the owner accepts
     about 1 failed eval in 4. Not for a funded account. It improves the 2-week pass rate in both halves, which is the owner's
     2-week rule. It does not improve the 2-week fail rate in either half.
2. **Max-loss room cap 60%:** micros = min(LIT rule, 60% × (balance − trailing max-loss floor) ÷ (stop × $2)), floor 1 micro
   (run `lit_x_room_cap60`).
   - **The gain:**
     - 2-week fails: H1 3.9% vs 14.8%.
     - 1-month fails: H1 10.2% vs 25.8%.
     - Pass rate: H1 80% vs 66%.
     - H2: identical, because the cap never binds there.
     - 2021-25: 2-week fails 6.8% vs 16.3%, max drawdown −$12.1k vs −$20.7k.
   - **The cost:** fewer passes per month in a back-to-back run (2026: 8 passed / 2 failed vs 10 / 3), and less money on that
     path.
   - **Recommendation:** adopt as the **safe-eval option.** It is better in H1 and not worse in H2, which is the weaker form of
     the rule. Use either this or the fast-eval size, not both: combined, the time to pass goes back to 14-21 sessions.
3. **Half-size re-entry after a stop** (`reentry 0.5`, run `lit_x_reentry`).
   - **The numbers:** H2 +$1.9k, H1 −$0.3k, 2026 +$1.6k at 3.4 trades a week, 2021-25 −$1.8k.
   - **Recommendation:** **do not adopt.** It fails the both-halves rule. Recheck it after a few more months of 2026 1m data.

**Nothing else changes:** LIT final's entry, VIX-band target, 1-tick stop beyond the sweep, breakeven at 1R and 1 trade a day
all held against every alternative.

## Honest limits

- **The check half is small:** H2 is 78 sessions and 42 trades. Its pass rate can jump between 59% and 100% on one or two
  evals.
- **2021-25 has no 1m data,** so the 1m confirmation runs on 5m bars there. Its lines are a reference only.
- **Partials and two-stage entries round to whole micros.** At 3 micros, "25%" is 1 micro (33%), and a 1-micro trade cannot
  be split.
- **The DLL model:** the daily loss limit is treated as flattening at −$1,000 on the day, including open P&L, plus 1 tick per
  micro. MFFU's own wording on the DLL varies between pages.
- **About 150 variants were run.** With that many, one could beat LIT final by luck in one half. That is why only changes that
  are better in both halves (or, for sizing, consistent with its neighbours) are put forward.

## Files and how to rerun

- **`tools/lit_experiments.py`** wraps `engine/lit.py` and `tools/lit_final.py`; neither was edited. 1 CPU process, about
  10-60 s per family.
  - `check`: the executor reproduces `lit.run_x(final)` trade for trade (661 of 661, same P&L and lows), and its eval simulator
    matches `rl.score`.
  - `A` / `B` / `C` / `D` / `E`: the families → `research/lit/experiments_results.json`.
  - `save`: stores the runs `lit_x_*` (family other, tags lit and lit_experiments).
    - Eval-state sizing runs store the back-to-back eval path.
    - Their fresh-start eval odds are in the run's verdict and in this write-up.
- **Executor options added on top of `lit.DEFAULTS`** (all default to LIT final):
  - `stop_mode`, `stop_atr`, `partial` (including the internal `swing` pool class), `be_mode`, `min_tgt_pts`, `reentry`,
    `two_stage`;
  - `after` / `days` for the second-session legs;
  - the VXN band target.
- **Sizing:**
  - `base_qty(t, risk_usd, ref_stop)`: `ref_stop None` = flat $.
  - `sized()` for fixed rules.
  - `eval_game()` for rules that depend on the eval's state (room, profit, week, day). It also reports the expected sessions to
    a pass and the evals bought per pass.
