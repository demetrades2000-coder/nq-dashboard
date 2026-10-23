## In one minute

- **The owner's order (2026-10-18):** "upsizing and less stops. We don't need 50-60 point stops, especially if we trade more
  micros or 1 NQ. Figure it out."
- **Today:**
  - LIT's median stop is about 46 pts (44 in Jan-Jun, 52 in Jul-Oct).
  - The size rule ($800 up to a 20-pt stop, then 800 × 20 ÷ stop) gives a median of **3 micros, about $275 at risk**.
- **What was tested, all on exactly the same live LIT signals and fills:**
  - 20 stop placements;
  - 18 stop caps;
  - 18 refined limit entries;
  - each at 12 sizes;
  - the MFFU Builder 50K eval simulated for each.
- **The honest answer: a tighter stop is not better. It only looks better when it quietly risks more money.**
  - The 1m protected-swing stop cuts the stop from ~46 to ~15 pts. The size rule then buys 25 micros instead of 3, so each trade
    risks **$735 instead of $279**.
  - At the **same $800 a trade**:
    - Jan-Jun: the tight stop makes **+$79.7k against +$46.3k**;
    - Jul-Oct: it makes **+$5.7k against +$21.2k**;
    - 2021-25: it makes **−$36.9k against +$7.4k**.
  - It fails the both-halves rule.
- **Why:** a tight stop turns LIT's rare big winners into breakeven scratches.
  - Breakeven at +1R comes after 15 pts instead of 46, so the normal pullback takes the trade out at entry.
  - The win rate falls from 23% to 13% in H1 and from 35% to 10% in H2.
  - The stop-out rate hardly changes (40% to 42%): LIT's losers lose either way.
- **Skipping wide setups:** with a cap at 15-40 pts, only 0.05-1.2 trades a week are left. That breaks the 2-4 a week rule.
- **Refined entries:** a limit at the 1m CISD / FVG / order block / 50% after the confirmation saves only 3-8 pts of stop. It
  misses the winners that never come back: H1 −$15k to −$26k against live.
- **So the "upsizing" has to happen on the live stop, with the MFFU room cap as the seat belt.** "Room" is the distance from
  the balance to the trailing max-loss floor; the cap never risks more than 60% of it on one trade.
  1. **Eval speed: $800 up to a 40-pt stop + room cap 60%.**
     - 2-week pass / fail: **H1 46.9% / 5.5%, H2 47.4% / 5.1%** (live: 28.9 / 3.1 and 23.1 / 0.0).
     - Median 6-8 sessions to a pass.
     - The price: 15-18% of evals fail within a month, and the pass rate is 74-76%.
  2. **Balanced eval: $800 up to a 25-pt stop + room cap 60%.**
     - Pass rate **92.3% / 95.7%**, the same as live (92.3% / 100%).
     - 2-week pass **37.5% / 29.5%** (live 28.9 / 23.1); 2-week fail 3.1% / 0%.
     - Median **10.5 / 17.5 sessions** (live 13.5 / 21).
  3. **Funded account: the same $800 up to 25 pts, with the room cap until the max-loss floor locks.**
     - Uncapped it makes **$6,078 / $3,139 a month** (live $5,377 / $2,413), PF 4.06 / 2.50.
     - Max DD is −$3,022 in H1. That is more than the $2,000 trailing limit, so the cap must stay on until the floor locks.
- **1 NQ fixed:**
  - It makes a lot of money: H1 +$45.1k, H2 +$20.9k, 2021-25 +$21.7k.
  - But on a 45-pt median stop it risks **$865 a trade (up to $1,680)**. **21 days in H1 hit the $1,000 daily limit.**
  - **28-38% of evals fail within 2 weeks**, and the pass rate is 51-58%. Not for the eval.
- **Nothing here is live:** live_model.json, engine/lit_live.py and STRATEGY.md are unchanged. These are adopt-candidates for the
  owner.

## How to read the tables

- **Same signals:** the live LIT setups, limit, 1m CISD confirmation and fill (`engine/lit.py` run_x with the live loss pack).
  - A setup is still cancelled if the 5m sweep extreme breaks before the fill.
  - Only the stop after the fill, the entry limit (part C) or the size changes.
  - The targets are the live ones: the VIX-band price, at least 1.5R and banked at 8R, measured on the live stop. So every stop
    variant has the same 120 trades in 2026.
  - Breakeven is at +1R of the stop in use. One variant keeps it at the live 1R distance instead.
- **Reproduction check:** the tool with the live stop and the live size reproduces run `lit_live` trade for trade:
  - 630 of 630 trades;
  - 2026: 120 trades, +$41,734, eval 2 wk 26.7 / 1.9, pass rate 95.5%.
- **H1 / H2:** Jan 2 - Jun 30 2026 (pick) and Jul 1 - Oct 16 2026 (check). 2021-25 is a reference only, on 5m bars (no 1m data).
- **Money:** MNQ is $2 a point, $1.40 per micro round trip. NQ is $20 a point, $4.50 per mini round trip. 1 tick of slippage on
  market entries and on stop, breakeven and end-of-day exits.
- **Rules applied to every number:**
  - The weekly stop of the loss pack: half size after 2 stop-outs in a week. 1 NQ halves to 5 MNQ.
  - Max 40 micros / 4 minis.
  - The MFFU $1,000 soft daily loss: the position is closed at −$1,000.
- **Eval:** a fresh MFFU Builder 50K is started on every session of the half.
  - Rules: $3,000 target; $2,000 max loss, trailing the end-of-day high and locking at +$100; an intraday breach fails.
  - The columns:
    - **2 wk / 1 mo:** % passed / failed within 10 / 20 sessions.
    - **Pass rate:** passed ÷ (passed + failed) within 60 sessions.
    - **Median:** median sessions to a pass.
- **Room cap rows:** the $ and drawdown come from playing evals back to back. A new eval starts after each pass or fail.
- **"Total R":** the sum of each trade's result divided by its own risk. Use it to compare stops fairly.
- Frequency is the same for every same-signal variant: **3.12 trades a week in H1, 2.56 in H2, 86% of 2026 weeks with 2+**.

## A. Tighter stop placements (same trades, flat $800 a trade, so the risk is equal)

| Stop | Half | Median stop (pts) | Win % | Stopped % | Total R | Net $ | $/mo | PF | Max DD | 2021-25 net |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live: sweep extreme + 1 tick** | H1 | 44 | 22.5 | 40.0 | 61.8 | +46,290 | 7,594 | 3.00 | −5,850 | +7,390 |
| | H2 | 52 | 35.0 | 52.5 | 26.3 | **+21,184** | 5,703 | 2.44 | −3,823 | |
| 1m protected swing + 1 tick | H1 | 14 | 12.5 | 42.5 | 109.8 | +79,659 | 13,069 | 3.86 | −9,409 | −36,901 |
| | H2 | 17 | 10.0 | 47.5 | 9.6 | +5,702 | 1,535 | 1.39 | −9,465 | |
| 1m protected swing + 0.1 ATR | H1 | 16 | 13.8 | 42.5 | 107.0 | +79,125 | 12,981 | 3.86 | −8,296 | −35,670 |
| | H2 | 19 | 15.0 | 42.5 | 21.0 | +10,406 | 2,802 | 1.76 | −9,017 | |
| 1m protected swing, breakeven kept at the live 1R | H1 | 14 | 17.5 | 58.8 | 182.1 | +138,809 | 22,773 | 4.97 | −9,906 | −9,503 |
| | H2 | 17 | 20.0 | 77.5 | 24.3 | +16,181 | 4,356 | 1.72 | −6,211 | |
| 5m CISD candle + 1 tick | H1 | 20 | 15.0 | 42.5 | 79.0 | +55,150 | 9,048 | 3.02 | −6,597 | −37,860 |
| | H2 | 25 | 15.0 | 57.5 | 3.6 | +1,708 | 460 | 1.10 | −5,996 | |
| 5m higher low after the sweep | H1 | 39 | 20.0 | 37.5 | 67.3 | +51,385 | 8,430 | 3.26 | −5,177 | −2,292 |
| | H2 | 43 | 25.0 | 60.0 | 15.3 | +12,948 | 3,486 | 1.76 | −3,881 | |
| Inducement low + 1 tick (56 of 120 fall back to the extreme) | H1 | 24 | 20.0 | 41.2 | 75.7 | +62,335 | 10,227 | 3.48 | −5,684 | −52,172 |
| | H2 | 31 | 25.0 | 52.5 | 16.5 | +13,798 | 3,715 | 1.88 | −5,736 | |
| 25% of the extreme distance | H1 | 11 | 11.2 | 47.5 | 108.9 | +79,800 | 13,092 | 3.62 | −11,251 | −95,672 |
| | H2 | 13 | 5.0 | 50.0 | −3.4 | −6,295 | −1,695 | 0.61 | −9,219 | |
| 50% of the extreme distance | H1 | 22 | 15.0 | 46.2 | 80.7 | +58,978 | 9,676 | 3.10 | −8,436 | −39,869 |
| | H2 | 26 | 10.0 | 62.5 | −4.6 | −4,311 | −1,161 | 0.77 | −9,276 | |
| 75% of the extreme distance | H1 | 33 | 18.8 | 43.8 | 72.1 | +57,239 | 9,391 | 3.21 | −7,874 | −9,926 |
| | H2 | 39 | 25.0 | 50.0 | 20.0 | +17,312 | 4,661 | 2.21 | −3,577 | |
| Extreme, capped at 1 ATR (5m) | H1 | 17 | 13.8 | 42.5 | 72.9 | +54,623 | 8,962 | 2.93 | −8,483 | −83,852 |
| | H2 | 20 | 15.0 | 50.0 | 10.6 | +5,016 | 1,351 | 1.31 | −7,944 | |
| Extreme, capped at 1.5 ATR | H1 | 25 | 20.0 | 42.5 | 82.2 | +62,386 | 10,235 | 3.37 | −6,332 | −72,744 |
| | H2 | 31 | 22.5 | 52.5 | 11.2 | +10,792 | 2,905 | 1.71 | −6,153 | |
| Extreme, capped at 2 ATR | H1 | 32 | 21.2 | 43.8 | 66.4 | +51,204 | 8,401 | 2.99 | −5,851 | −10,282 |
| | H2 | 35 | 27.5 | 52.5 | 15.9 | +12,660 | 3,408 | 1.85 | −3,828 | |
| Extreme, capped at 20 pts (fixed: breaks the stop rule) | H1 | 20 | 15.0 | 43.8 | 75.3 | +61,739 | 10,129 | 3.14 | −9,063 | −24,415 |
| | H2 | 20 | 12.5 | 57.5 | 3.1 | +363 | 98 | 1.02 | −8,433 | |
| Extreme, capped at 30 pts (fixed) | H1 | 30 | 20.0 | 43.8 | 67.7 | +53,428 | 8,766 | 3.06 | −6,617 | −11,618 |
| | H2 | 30 | 22.5 | 52.5 | 19.4 | +11,260 | 3,032 | 1.71 | −4,456 | |

- **Every tighter stop beats the live stop in H1 and loses to it in H2.**
  - The pattern is the same for structure stops (1m swing, 5m CISD candle, inducement), for fractions and for ATR or point caps.
  - The closest misses are 75% of the distance (H2 −$3.9k) and the inducement stop (H2 −$7.4k).
  - Most of them lose money in 2021-25.
- **"Breakeven kept at the live 1R" has the biggest H1 number.**
  - It is one or two huge-R trades: total R jumps from 61.8 to 182.1.
  - It stops out 78% of trades in H2, and 50-59% of evals fail within 2 weeks.
  - **Rejected.**
- At the live size rule ($800 up to 20 pts) the tight stops look even better in H1 (1m swing: +$81.3k, PF 4.13). That is only
  because the trade risks ~$740 instead of ~$280. See part D.
- **Rejected:** no stop placement holds in both halves.

## B. Stop caps (max stop 15-40 pts)

Flat $800 a trade, so the risk is equal.

| Cap | Rule for setups wider than the cap | Trades/wk 2026 | Median stop | H1 net | H2 net | H1 PF | H2 PF | 2021-25 net |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| – | **Live, no cap** | 2.91 | 46 | +46,290 | **+21,184** | 3.00 | 2.44 | +7,390 |
| 15 | skip | 0.05 | 13 | +5,086 | 0 | – | – | −6,580 |
| 15 | 1m-swing stop if it fits, else skip | 1.60 | 12 | +59,105 | −1,817 | 4.35 | 0.75 | +7,802 |
| 20 | skip | 0.12 | 19 | +4,970 | 0 | – | – | −1,447 |
| 20 | 1m-swing stop if it fits, else skip | 2.43 | 14 | +74,330 | +1,638 | 4.19 | 1.12 | −24,294 |
| 25 | skip | 0.32 | 22 | +18,377 | +4,862 | 10.9 | – | −17,341 |
| 25 | 1m-swing stop if it fits, else skip | 2.65 | 15 | +88,758 | +6,335 | 4.70 | 1.45 | +452 |
| 30 | skip | 0.58 | 25 | +20,655 | +5,980 | 6.28 | 2.87 | −8,461 |
| 30 | 1m-swing stop if it fits, else skip | 2.77 | 17 | +81,401 | +10,812 | 4.30 | 1.77 | −5,216 |
| 30 | 1m-swing stop, cut to 30 | 2.91 | 17 | +78,952 | +10,017 | 3.91 | 1.67 | −23,094 |
| 35 | skip | 0.92 | 27 | +30,395 | +9,100 | 5.51 | 2.92 | +21,255 |
| 35 | 1m-swing stop if it fits, else skip | 2.84 | 18 | +80,680 | +12,658 | 4.18 | 1.88 | −12,008 |
| 40 | skip | 1.24 | 30 | +23,589 | +11,091 | 3.82 | 2.27 | +9,154 |
| 40 | 1m-swing stop if it fits, else skip | 2.84 | 19 | +80,933 | +10,896 | 4.22 | 1.72 | −6,803 |

- **Skipping wide setups kills the frequency.** Only about 1 LIT stop in 9 is under 25 pts (13 of 120 in 2026). A 40-pt cap leaves 1.2 trades a week; the
  owner's rule is 2-4. **Rejected.**
- **Keeping the trade with the tighter 1m-swing stop** keeps 2.4-2.8 trades a week, but it is part A again: H1 up, H2 down. **Rejected.**

## C. Refined entries: a limit on the 1m retest after the confirmation

Live size rule.

| Entry after the 1m CISD (limit, not market) | Trades/wk 2026 | Median stop | H1 net | H2 net | H1 PF | H2 PF | 2021-25 net |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Live: market on the next 1m open** | 2.91 | 46 | **+32,773** | +8,962 | 4.44 | 2.46 | +1,275 |
| Retest of the 1m CISD level, 10 / 20 bars | 2.43 / 2.55 | 42 | +15,858 / +15,633 | +2,465 / +3,907 | 2.48 / 2.43 | 1.38 / 1.59 | −3.8k / +7.6k |
| 1m FVG top, 10 / 20 bars | 0.92 / 1.00 | 38 | +6,475 / +6,744 | +7,457 / +7,044 | 2.03 / 2.07 | 6.83 / 5.17 | +2.3k / −0.8k |
| 1m FVG middle, 10 / 20 bars | 0.87 / 0.97 | 37 | +6,031 / +6,483 | +15,128 / +14,673 | 1.92 / 1.99 | 12.2 / 9.1 | −3.7k / −6.1k |
| 1m order block (last down candle's open), 10 / 20 bars | 2.35 / 2.48 | 41 | +17,462 / +16,628 | +10,444 / +9,509 | 2.53 / 2.36 | 2.70 / 2.42 | −24.3k / −15.5k |
| 1m order block middle, 10 / 20 bars | 2.04 / 2.28 | 38 | +6,348 / +11,239 | +13,469 / +11,921 | 1.55 / 1.90 | 3.07 / 2.56 | −20.3k / −19.1k |
| 50% of the 1m leg, 10 / 20 bars | 2.28 / 2.40 | 39 | +6,618 / +6,989 | +11,849 / +11,314 | 1.53 / 1.58 | 2.73 / 2.53 | +21.3k / +21.0k |
| Any of these + the 1m-swing stop (8-14 pts) | 1.0-2.6 | 8-14 | −4.5k to +45.8k | −11.5k to −1.9k | 0.6-2.9 | 0-0.8 | −44k to +22k |

- **The stop shrinks by only 3-8 pts.** The 1m pullback after the confirmation is shallow compared with the 46-pt sweep distance.
- **The limits miss the best trades.** The strongest LIT moves leave without a retest, and those are the winners. H1 loses $15-26k
  against live.
- Some H2 numbers are higher (FVG middle +$15.1k on 0.9 trades a week), but H1 loses and the frequency fails. **Rejected.**

## D. Sizing up on the live stop (the real lever)

Live stop. Each half is shown on its own; 2021-25 is the reference.

| Size | Half | Net $ | $/mo | PF | Max DD | Median contracts (micros) | Median $ at risk | Max $ at risk | Worst day | Days hitting −$1,000 | 2 wk pass / fail | 1 mo pass / fail | Pass rate | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live: $800 up to 20 pts** | H1 | +32,773 | 5,377 | 4.44 | −2,315 | 3 | 279 | 800 | −755 | 0 | 28.9 / 3.1 | 61.7 / 6.2 | 92.3 | 13.5 |
| | H2 | +8,962 | 2,413 | 2.46 | −1,466 | 2.5 | 231 | 783 | −635 | 0 | 23.1 / 0.0 | 44.9 / 0.0 | 100 | 21 |
| | 21-25 | +1,275 | 25 | 1.01 | −20,462 | 5 | 370 | 800 | −860 | 30 | 6.6 / 14.3 | 12.9 / 34.4 | 28.4 | 20 |
| $800 up to 25 pts | H1 | +37,046 | 6,078 | 4.06 | −3,022 | 4 | 366 | 800 | −806 | 0 | 37.5 / 10.9 | 61.7 / 18.8 | 77.4 | 9 |
| | H2 | +11,659 | 3,139 | 2.50 | −1,988 | 3 | 334 | 800 | −807 | 0 | 29.5 / 2.6 | 47.4 / 3.8 | 96.0 | 20 |
| | 21-25 | +4,252 | 83 | 1.04 | −24,847 | – | – | – | – | – | 9.2 / 18.3 | – | 30.8 | – |
| Fast-eval: $800 up to 40 pts | H1 | +43,370 | 7,115 | 3.39 | −4,491 | 7 | 567 | 800 | −806 | 1 | 52.3 / 17.2 | 66.4 / 18.8 | 78.2 | 6 |
| | H2 | +17,358 | 4,673 | 2.48 | −2,965 | 5 | 564 | 800 | −807 | 1 | 48.7 / 15.4 | 65.4 / 28.2 | 70.7 | 7 |
| | 21-25 | +9,277 | 182 | 1.06 | −30,280 | 10 | 741 | 800 | −860 | 57 | 14.5 / 31.6 | 22.3 / 59.6 | 29.0 | 10.5 |
| Flat $400 | H1 | +22,298 | 3,658 | 3.11 | −2,709 | 4 | 346 | 400 | −403 | 0 | 25.8 / 1.6 | 46.9 / 18.8 | 63.5 | 10.5 |
| | H2 | +9,958 | 2,681 | 2.49 | −1,716 | 3 | 338 | 400 | −401 | 0 | 26.9 / 0.0 | 47.4 / 0.0 | 100 | 20 |
| Flat $600 | H1 | +35,343 | 5,798 | 3.11 | −4,240 | 6 | 547 | 600 | −622 | 0 | 43.8 / 14.1 | 57.0 / 27.3 | 68.2 | 6 |
| | H2 | +14,877 | 4,005 | 2.38 | −2,758 | 5 | 541 | 600 | −619 | 1 | 37.2 / 12.8 | 52.6 / 32.1 | 54.7 | 8 |
| Flat $800 | H1 | +46,290 | 7,594 | 3.00 | −5,850 | 8 | 751 | 800 | −814 | 3 | 54.7 / 21.1 | 64.1 / 21.9 | 74.5 | 5 |
| | H2 | +21,184 | 5,703 | 2.44 | −3,823 | 7 | 761 | 800 | −807 | 1 | 56.4 / 24.4 | 57.7 / 38.5 | 60.0 | 4 |
| Flat $1,000 | H1 | +58,834 | 9,652 | 2.95 | −7,359 | 10 | 950 | 1,000 | −1,012 | 23 | 54.7 / 28.9 | 57.0 / 28.9 | 66.4 | 4 |
| | H2 | +25,332 | 6,820 | 2.34 | −4,803 | 9 | 952 | 998 | −1,010 | 14 | 59.0 / 29.5 | 60.3 / 37.2 | 61.8 | 4 |
| Flat $1,200 | H1 | +64,099 | 10,516 | 2.86 | −7,679 | 12 | 1,142 | 1,200 | −1,014 | 30 | 53.9 / 37.5 | 56.2 / 38.3 | 59.5 | 4 |
| | H2 | +32,926 | 8,865 | 2.58 | −6,040 | 11 | 1,142 | 1,200 | −1,012 | 19 | 52.6 / 37.2 | 52.6 / 44.9 | 53.9 | 3 |
| 5 MNQ fixed | H1 | +21,421 | 3,514 | 2.40 | −3,880 | 5 | 432 | 832 | −817 | 0 | 30.5 / 14.8 | 41.4 / 35.9 | 54.8 | 7 |
| | H2 | +12,575 | 3,386 | 2.25 | −2,620 | 5 | 432 | 840 | −827 | 1 | 35.9 / 9.0 | 56.4 / 21.8 | 62.7 | 9 |
| 10 MNQ fixed | H1 | +44,621 | 7,321 | 2.53 | −6,752 | 10 | 865 | 1,665 | −1,005 | 22 | 42.2 / 37.5 | 44.5 / 43.0 | 50.9 | 4 |
| | H2 | +20,659 | 5,562 | 2.08 | −4,537 | 10 | 865 | 1,680 | −1,005 | 12 | 50.0 / 28.2 | 52.6 / 38.5 | 57.7 | 4 |
| **1 NQ fixed** | H1 | +45,115 | 7,402 | 2.57 | −6,714 | 10 (1 NQ) | 865 | 1,665 | −1,005 | 21 | 42.2 / 37.5 | 44.5 / 43.0 | 50.9 | 4 |
| | H2 | +20,897 | 5,626 | 2.10 | −4,508 | 10 (1 NQ) | 865 | 1,680 | −1,005 | 12 | 51.3 / 28.2 | 52.6 / 38.5 | 57.7 | 4 |
| | 21-25 | +21,712 | 425 | 1.13 | −26,806 | 10 | 718 | 1,765 | −1,005 | 102 | 14.1 / 34.6 | 20.1 / 64.2 | 24.6 | 9 |
| 20 MNQ / 2 NQ fixed | H1 | +107,235 | 17,593 | 3.64 | −8,954 | 20 | 1,730 | 3,330 | −1,010 | 37 | 50.8 / 36.7 | 50.8 / 36.7 | 58.0 | 3 |
| | H2 | +29,297 | 7,888 | 2.05 | −8,634 | 20 | 1,730 | 3,360 | −1,010 | 27 | 37.2 / 59.0 | 37.2 / 59.0 | 38.7 | 2 |
| | 21-25 | −38,717 | −758 | 0.87 | −57,428 | 20 | 1,435 | 3,530 | −1,010 | 278 | 17.8 / 65.9 | 20.1 / 78.9 | 20.2 | 4 |

**The same sizes on the 1m protected-swing stop (median 14-17 pts):**

| Size | Half | Net $ | $/mo | PF | Max DD | Median micros | Median $ at risk | 2 wk pass / fail | 1 mo pass / fail | Pass rate |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Live rule ($800 up to 20) | H1 | +81,328 | 13,343 | 4.13 | −9,386 | 25.5 | 735 | 43.0 / 39.8 | 45.3 / 40.6 | 52.7 |
| | H2 | +6,356 | 1,711 | 1.47 | −8,842 | 21.5 | 745 | 21.8 / 43.6 | 21.8 / 53.8 | 36.4 |
| Flat $400 | H1 | +44,230 | 7,256 | 4.12 | −4,684 | 12.5 | 388 | 33.6 / 9.4 | 45.3 / 33.6 | 52.7 |
| | H2 | +2,419 | 651 | 1.33 | −4,721 | 10.5 | 384 | 11.5 / 2.6 | 24.4 / 20.5 | 71.4 |
| 1 NQ fixed | H1 | +22,578 | 3,704 | 2.95 | −3,324 | 10 | 268 | 26.6 / 7.0 | 39.8 / 33.6 | 46.4 |
| | H2 | +2,199 | 592 | 1.32 | −4,484 | 10 | 309 | 11.5 / 6.4 | 24.4 / 24.4 | 65.5 |
| | 21-25 | −17,069 | −334 | 0.83 | −21,159 | 10 | 320 | 7.6 / 6.2 | 11.0 / 34.2 | 17.7 |

**What this shows:**
- **More risk per trade means more money and faster passes, but more failed evals.** The question is how much risk the $2,000
  trailing max loss can carry.
- **"Wide stop means less risk" still wins.**
  - Flat $ at any stop, or fixed contracts, put the most money on LIT's widest stops, and those are its worst trades.
  - So these rules have a lower PF (2.0-3.1) and fail more evals than rules that shrink the size as the stop grows.
- **1 NQ fixed on the live stop:**
  - The typical trade risks $865, and a 80-pt stop risks $1,680.
  - The $1,000 daily limit closes the trade on **21 of 80 H1 days** and **12 of 40 H2 days**.
  - It fails **37.5% / 28.2% of evals within 2 weeks**, and the pass rate is 51-58%.
  - It also beats live on $ in 2021-25 (+$21.7k): the daily limit caps the wide-stop losses at $1,000.
  - **It is a funded-account option at best, never the eval.**
- **2 NQ / 20 MNQ:** a single 80-pt stop is $3,300, more than the whole $2,000 max loss. **Never.**

## E. The room cap: upsizing with a seat belt

Live stop. Never risk more than k × the room left to the trailing max-loss floor; the size drops to micros when the cap binds.

| Size + cap | Half | Net $ (evals back to back) | $/mo | PF | Max DD | Median micros | Median $ at risk | 2 wk pass / fail | 1 mo pass / fail | Pass rate | Median | Evals passed / failed back to back |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live ($800 up to 20, no cap)** | H1 | +32,773 | 5,377 | 4.44 | −2,315 | 3 | 279 | 28.9 / 3.1 | 61.7 / 6.2 | 92.3 | 13.5 | 8/2 |
| | H2 | +8,962 | 2,413 | 2.46 | −1,466 | 2.5 | 231 | 23.1 / 0.0 | 44.9 / 0.0 | 100 | 21 | 2/0 |
| Live + room cap 60% | H1 | +27,625 | 4,532 | 4.10 | −2,123 | 3 | 253 | 28.9 / 0.0 | 56.2 / 1.6 | 94.2 | 14 | 6/1 |
| | H2 | +8,370 | 2,254 | 2.37 | −1,456 | 2.5 | 231 | 23.1 / 0.0 | 44.9 / 0.0 | 100 | 20.5 | 2/0 |
| **$800 up to 25 pts + room cap 60%** | H1 | +33,305 | 5,464 | 4.01 | −2,513 | 4 | 331 | **37.5 / 3.1** | 60.2 / 6.2 | **92.3** | **10.5** | 7/2 |
| | H2 | +10,465 | 2,818 | 2.51 | −2,157 | 2.5 | 263 | **29.5 / 0.0** | 47.4 / 0.0 | **95.7** | **17.5** | 3/1 |
| $800 up to 25 pts + room cap 50% | H1 | +33,552 | 5,505 | 4.25 | −2,120 | 4 | 328 | 35.9 / 2.3 | 60.2 / 5.5 | 91.3 | 11 | 7/2 |
| | H2 | +10,259 | 2,762 | 2.51 | −2,053 | 2 | 263 | 29.5 / 0.0 | 47.4 / 0.0 | 95.8 | 18.5 | 3/1 |
| $1,000 up to 20 pts + room cap 60% | H1 | +37,179 | 6,100 | 4.35 | −2,513 | 4 | 331 | 39.1 / 3.9 | 60.2 / 9.4 | 88.5 | 10 | 7/2 |
| | H2 | +10,465 | 2,818 | 2.51 | −2,157 | 2.5 | 263 | 29.5 / 0.0 | 47.4 / 0.0 | 95.7 | 17.5 | 3/1 |
| Fast-eval $800 up to 40, no cap | H1 | +43,370 | 7,115 | 3.39 | −4,491 | 7 | 567 | 52.3 / 17.2 | 66.4 / 18.8 | 78.2 | 6 | 10/5 |
| | H2 | +17,358 | 4,673 | 2.48 | −2,965 | 5 | 564 | 48.7 / 15.4 | 65.4 / 28.2 | 70.7 | 7 | 4/3 |
| **Fast-eval $800 up to 40 + room cap 60%** | H1 | +44,233 | 7,257 | 4.11 | −2,982 | 6 | 499 | **46.9 / 5.5** | 63.3 / 18.0 | 75.9 | **6** | 9/3 |
| | H2 | +14,801 | 3,985 | 2.60 | −2,403 | 3 | 370 | **47.4 / 5.1** | 60.3 / 15.4 | 74.3 | **8** | 4/2 |
| Fast-eval + room cap 50% | H1 | +40,929 | 6,715 | 4.02 | −2,893 | 5.5 | 487 | 43.0 / 4.7 | 55.5 / 18.8 | 70.4 | 6.5 | 9/3 |
| | H2 | +11,601 | 3,123 | 2.40 | −2,092 | 2 | 326 | 35.9 / 0.0 | 48.7 / 0.0 | 95.6 | 13 | 3/1 |
| Flat $800 + room cap 60% | H1 | +40,680 | 6,674 | 3.43 | −3,643 | 6 | 704 | 44.5 / 6.2 | 56.2 / 18.8 | 67.6 | 5 | 9/3 |
| | H2 | +20,502 | 5,520 | 2.82 | −2,599 | 5 | 670 | 53.8 / 5.1 | 59.0 / 17.9 | 64.0 | 5 | 5/3 |
| $1,000 up to 30 pts + room cap 60% | H1 | +47,478 | 7,789 | 4.33 | −2,873 | 5.5 | 485 | 46.9 / 9.4 | 58.6 / 18.8 | 70.4 | 6 | 9/3 |
| | H2 | +13,161 | 3,543 | 2.40 | −2,476 | 3 | 352 | 44.9 / 7.7 | 56.4 / 20.5 | 68.9 | 7 | 3/2 |
| 1m-swing stop (+0.1 ATR), flat $600 + room cap 50% | H1 | +62,649 | 10,278 | 5.60 | −4,642 | 12 | 562 | 45.3 / 3.1 | 55.5 / 18.0 | 66.7 | 5 | 9/5 |
| | H2 | +4,074 | 1,097 | 1.57 | −3,847 | 10.5 | 559 | 30.8 / 0.0 | 46.2 / 16.7 | 78.3 | 10 | 1/1 |

- **The room cap makes upsizing safe.** With the loss pack in, fast-eval + cap 60% fails only 5.5% / 5.1% of evals within
  2 weeks (17% / 15% without the cap).
  - In `lit-experiments.md`, before the loss pack, that combination still failed 13% in H1. The weekly stop is what made the
    pair work.
- **$800 up to 25 pts is the "free" upsizing:**
  - The only change is that full $800 risk now runs up to a 25-pt stop instead of 20 (above 25 pts: 800 × 25 ÷ stop).
  - The typical trade has 4 micros instead of 3, about $330-365 at risk.
  - With the cap, the pass rate holds (92.3% / 95.7%) and passes come 3 sessions sooner in both halves.
- **$1,000 up to 20 pts + cap** is the same as $800 up to 25 above a 25-pt stop. It is slightly faster in H1 and fails a little
  more (1-month 9.4% vs 6.2%).
- **The tight stop with a cap still loses H2** (+$4.1k vs +$8-10k).

**Picking rule (owner):** pick on H1, check on H2.
- **(a) Highest H1 2-week pass with H1 2-week fail under 10%:**
  - The strict H1 winner is the 50%-distance stop with breakeven at the live 1R, at flat $400: H1 50.0% / 7.0%.
  - It **collapses in H2** (20.5% / 9.0%, pass rate 27.6%, +$567).
  - The best that holds in H2 is **fast-eval $800 up to 40 pts + room cap 60%**: H1 46.9 / 5.5, H2 47.4 / 5.1.
- **(b) Most $ a month at a pass rate of 80% or more (both halves):**
  - Without a cap, that is the **live rule itself** ($5,377 / $2,413 a month, pass rate 92% / 100%).
  - With the cap, it is **$1,000 up to 20 pts + room cap 60%** (run `lit_tight_eval_1000_20_room60`).
    - H1: $6,100 a month, 2 wk 39.1 / 3.9, 1 mo 60.2 / 9.4, pass rate 88.5%.
    - H2: $2,818 a month, 29.5 / 0.0, pass rate 95.7%.
  - **$800 up to 25 pts + cap** is the same in H2 and gives up $636 a month in H1 for fewer failures (1 mo 6.2% vs 9.4%,
    pass rate 92.3% vs 88.5%). That is why it is the recommendation below.
  - Uncapped (the funded view), $800 up to 25 pts makes $6,078 / $3,139 a month.
- **(c) 1 NQ fixed:** see part D. It makes money, but 28-38% of evals fail within 2 weeks.

## F. The honest view: what a tight stop does to the same trades

Each row compares one tight stop against the live stop, trade by trade, on the 2026 trades.

| Stop | Half | Median stop pts (live → tight) | Stopped % | Win % | Live winners stopped out | Live target hits stopped out | Avg R a trade | Total R | Live losers turned into a scratch |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1m protected swing + 1 tick | H1 | 44 → 14 | 40 → 42.5 | 22.5 → 12.5 | 2 of 18 | 1 of 15 | 0.79 → 1.43 | 63 → 114 | 8 |
| | H2 | 52 → 17 | 52.5 → 47.5 | 35.0 → 10.0 | 4 of 14 | 2 of 10 | 0.67 → 0.28 | 27 → 11 | 8 |
| 1m protected swing + 0.1 ATR | H1 | 44 → 16 | 40 → 42.5 | 22.5 → 13.8 | 2 of 18 | 1 of 15 | 0.79 → 1.39 | 63 → 111 | 8 |
| | H2 | 52 → 19 | 52.5 → 42.5 | 35.0 → 15.0 | 4 of 14 | 2 of 10 | 0.67 → 0.57 | 27 → 23 | 10 |
| 5m CISD candle | H1 | 44 → 20 | 40 → 42.5 | 22.5 → 15.0 | 1 of 18 | 1 of 15 | 0.79 → 1.03 | 63 → 82 | 6 |
| | H2 | 52 → 25 | 52.5 → 57.5 | 35.0 → 15.0 | 5 of 14 | 3 of 10 | 0.67 → 0.12 | 27 → 5 | 5 |
| Inducement low | H1 | 44 → 24 | 40 → 41.2 | 22.5 → 20.0 | 0 of 18 | 0 of 15 | 0.79 → 0.98 | 63 → 79 | 4 |
| | H2 | 52 → 31 | 52.5 → 52.5 | 35.0 → 25.0 | 0 of 14 | 0 of 10 | 0.67 → 0.45 | 27 → 18 | 1 |
| 50% of the distance | H1 | 44 → 22 | 40 → 46.2 | 22.5 → 15.0 | 2 of 18 | 2 of 15 | 0.79 → 1.05 | 63 → 84 | 6 |
| | H2 | 52 → 26 | 52.5 → 62.5 | 35.0 → 10.0 | 6 of 14 | 4 of 10 | 0.67 → −0.08 | 27 → −3 | 4 |
| 75% of the distance | H1 | 44 → 33 | 40 → 43.8 | 22.5 → 18.8 | 2 of 18 | 2 of 15 | 0.79 → 0.93 | 63 → 74 | 3 |
| | H2 | 52 → 39 | 52.5 → 50.0 | 35.0 → 25.0 | 0 of 14 | 0 of 10 | 0.67 → 0.52 | 27 → 21 | 2 |
| Capped at 25 pts (fixed) | H1 | 44 → 25 | 40 → 41.2 | 22.5 → 20.0 | 0 of 18 | 0 of 15 | 0.79 → 1.06 | 63 → 85 | 7 |
| | H2 | 52 → 25 | 52.5 → 50.0 | 35.0 → 17.5 | 2 of 14 | 1 of 10 | 0.67 → 0.38 | 27 → 15 | 4 |

**What the honest view says:**
- **Do tighter stops raise the win rate? No. They lower it, every time.** The stop-out rate barely moves: LIT's losers are
  trades that never work, so they lose with any stop.
- **The damage is mostly breakeven, not the stop.**
  - With a 14-pt stop, +1R is only 14 pts away. The normal pullback after it hits the breakeven stop.
  - In H2, 10 of the 14 live winners became scratches or losses with the 1m-swing stop. Only 4 were stopped out outright.
- **Winners stopped out before they ran:**
  - 1m swing: 2 of 18 (H1) and 4 of 14 (H2).
  - 50% of the distance: 6 of 14 in H2. 4 of the 10 H2 target hits were stopped out first and never got the target.
- **The H1 "gain" is a handful of trades.** When one of the rare 5-8R winners also runs with the tight stop, it becomes a 15-25R
  trade, and H1 had a few of those. H2 had almost none.
- **Some live losers lose less:** 4-10 per half become a breakeven scratch. That is real, but it does not pay for the lost winners.
- **Keeping breakeven at the live 1R** (the last variant in part A) keeps more winners, but the stop-outs jump to 59-78%.

## Recommendation

**Keep the stop where it is:** 1 tick beyond the sweep extreme. This is also the CLAUDE.md stop rule. A 50-60 pt stop is what
LIT needs: the setup is a deep sweep, and the trade only works when that extreme holds.

**Upsize by size, not by a tighter stop.** Three choices, best first:

1. **On the eval, the balanced choice: `$800 up to a 25-pt stop + room cap 60%`** (run `lit_tight_eval_800_25_room60`).
   - Parameters: `lit_sizing` risk_usd 800, ref_stop 25 (risk = 800 × 25 ÷ stop above 25 pts), max 40 micros. Never risk more
     than 0.6 × (balance − trailing max-loss floor). Weekly stop and Monday rule as live.
   - H1: 2 wk 37.5 / 3.1, 1 mo 60.2 / 6.2, pass rate 92.3%, median 10.5 sessions, $5,464/mo.
   - H2: 2 wk 29.5 / 0.0, 1 mo 47.4 / 0.0, pass rate 95.7%, median 17.5, $2,818/mo.
   - Live: 28.9 / 3.1, 92.3%, median 13.5 (H1) and 23.1 / 0.0, 100%, median 21 (H2).
   - Median 4 micros, about $330 at risk; worst day −$806.
   - **2026 as a whole:** 2 wk 34.5 / 1.9, pass rate 84.8% (live 95.5%), median 12 sessions (live 16).
2. **On the eval, when speed matters most: `$800 up to a 40-pt stop + room cap 60%`** (run `lit_tight_eval_fast_room60`).
   - About half of all evals pass within 2 weeks in both halves (46.9% / 47.4%), and 5.5% / 5.1% fail.
   - Median 6 / 8 sessions to a pass, which meets the owner's 2-to-3-week rule.
   - The price: 18% / 15% fail within a month, and the pass rate is 74-76%. About 1 eval in 4 is bought twice.
   - Median 6 / 3 micros, $370-500 at risk; worst day −$806.
3. **On a funded account: the same $800 up to 25 pts, with the room cap until the max-loss floor locks** (+$2,100, floor at
   $50,100); then uncapped.
   - Uncapped it makes $6,078 / $3,139 a month (PF 4.06 / 2.50) against live $5,377 / $2,413.
   - Max DD is −$3,022 (H1) / −$1,988 (H2). Run without the cap from day one, the H1 drawdown would breach the $2,000 trailing
     limit, so the cap must stay on until the floor locks.
- **Not recommended:**
  - 1 NQ fixed: 28-38% of evals fail within 2 weeks, the $1,000 daily limit hits on 1 day in 4, and the pass rate is 51-58%.
  - 2 NQ / 20 MNQ: one wide stop is bigger than the whole max loss.
  - Any tight stop, stop cap or refined entry: each fails H2 or the 2-4 trades a week rule.

**How sure:**
- Every recommended row holds in both halves, but H2 has only 40 trades.
- In 2021-25 (reference, 5m only), $800 up to 25 pts without a cap makes +$4.3k against +$1.3k for live, and passes more evals
  within 2 weeks (9.2% vs 6.6%). It also fails more (18.3% vs 14.3%).
- This is sizing only: the signals, entries, stops, targets and exits stay the live LIT.

## How this was done

- **Code:** `tools/lit_tightstop.py`. It wraps `engine/lit.py` and edits nothing.
  - Its executor `tsim` / `trun` is `lit.simulate_x` / `lit._run_core` (research mode) with new options, all off by default.
  - `python tools/lit_tightstop.py check`: with all options off and the live size it reproduces `lit_live` trade for trade
    (630 / 630; 2026: 120 trades, +$41,734).
  - `grid`: every stop and entry variant × 12 sizes → `research/lit/tight_results.json`.
  - `room`: room-cap combinations → `research/lit/tight_room.json`.
  - `honest`: the trade-by-trade comparison → `research/lit/tight_honest.json`.
  - `save`: stores the `lit_tight_*` runs.
  - The finer size sweep on the live stop (5 risk levels × 4 reference stops × 4 caps, plus 3-8 MNQ) is in
    `research/lit/tight_live_sizes.json`.
- **Stop definitions (long; mirror for shorts):**
  - **1m protected swing:** the lowest 1m low from the limit tap to the 1m CISD bar, which is the swing that made the 1m shift.
  - **5m CISD candle:** the low of the 5m bar that closed through the CISD level, or the 1m low since the tap if lower.
  - **5m higher low:** the lowest 5m low after the sweep bar up to the trigger.
  - **Inducement:** the lowest qualifying inducement low (within 1 ATR of the swept level, 36 bars). When it sits above the
    entry, the sweep extreme is used instead (56 of 120 trades).
  - **Fractions / ATR / point caps:** measured from the real fill.
  - No stop is ever wider than the sweep extreme or tighter than 8 pts.
- **Refined entries:** after the 1m CISD close, a limit at:
  - the 1m CISD level;
  - the top or middle of the newest unfilled 1m FVG of the move;
  - the open or middle of the last down-close 1m candle (the order block);
  - 50% of the 1m leg.

  The limit is valid 10 or 20 1m bars. It is cancelled if the target trades first or the sweep extreme breaks. A fill bar gets no
  target or breakeven credit, and a fill bar that also touches the stop is a loss.
- **Sizing (exact):**
  - Integer micros. The weekly stop halves the size after 2 STOP exits of that variant in the ISO week (floor 1 micro).
  - The $1,000 soft daily loss closes the position at −$1,000 minus 1 tick, so it also caps a large stop loss.
  - The room cap re-sizes each trade from the eval's own balance and floor.
