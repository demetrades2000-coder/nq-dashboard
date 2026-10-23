## In one minute (owner summary)

- **Four new ideas were tested on the live LIT trades of 2026.** Each one was picked on Jan-Jun (H1) and checked on Jul-Oct (H2),
  under the live eval sizing (two-week mode for 10 sessions, then safe-eval, no reset), with $1.90 commission and true 1m fills.
  The rule: it must make more money **and** pass more 2-week evals in **both** halves.
- **1. Adding to a winner (scale-in): yes, an adopt-candidate.**
  - After the stop is at breakeven, wait for the first small pullback (at least 0.25R), then a 1m CISD back our way, and add the
    same number of micros. Same breakeven stop, same target.
  - Once the add is itself +1 of its own risk, move the stop of the whole position up to the add's price. Now the add can't lose.
  - **Money:** H1 +$36.7k → **+$49.2k**, H2 +$9.7k → **+$26.0k** ($2,605 → **$7,004 a month** in the check half).
  - **2-week pass:** H1 52.9% → 53.8%, H2 50.7% → 52.2%. **2-week fails:** H2 unchanged (2.9%), H1 9.2% → 10.1%.
  - **Honest part:** the extra money is solid. Every neighbour gains in both halves, and so do add fills 2 pts worse. The
    pass-rate gain is small, about one eval start per half, and the H2 part rests on one trade (Oct 13). One-month fails also go
    up (H1 16.5% → 21.1%).
  - The total $ at risk never goes above the first entry's risk: the add only trades once the first entry is at breakeven.
  - "Start at half size and add at +1R" makes evals much safer (2-week fails 9.2% → 4.2%, 2.9% → 0%). But it makes less money in
    Jan-Jun (−$4.2k), so it fails the rule.
- **2. Trend-day mode: no.** I tried 328 trend-day classifiers x management modes (later bank, BE at 2R, next VIX band). 16 looked
  better in Jan-Jun; **none** held in Jul-Oct. Only 3 trades in all of 2026 hit the 8R bank, so the bank barely matters.
- **3. Size by volatility (VIX, VXN, ATR): no.** None of 160 tilts was better in both halves.
- **4. News-release setups: can't be traded with LIT's rules.** The release spike makes the stop (1 tick beyond the sweep
  extreme) 94-395 pts deep, far over the 80-pt maximum. 0 trades in 2026, 0 in 2021-25, even with the stop allowed to 250 pts.
- **Nothing in live_model.json changed.** Scale-in is a new engine option, `scale_in`, off by default. The live bot can't send the
  add order yet, so it is research and backtest only for now.
- **Trades a week don't change** for any idea: 3.12 (H1) / 2.56 (H2), 85% / 81% of weeks with 2+ trades.

## Method

- **Trades:** the 120 live 2026 LIT trades (`engine/lit.py` on `live_model.json` "lit", via `tools/lit_adv_manage.py`;
  `python -X utf8 tools/lit_big_ideas.py check`: 120/120 equal, and the add simulator with no add 119/119 equal on the 1m days).
- **Fills:** true 1m bars. In a bar the stop is checked before the target, and stop / breakeven exits fill 1 tick worse. A market
  add fills at the next 1m open + 1 tick. Every decision is made on a closed 1m bar and acts from the next one.
- **Sizing:** the live `lit_sizing` (engine/sizing.lit_qty: two_week "one winner passes" for 10 sessions, then safe_eval, no
  reset), $1.90 a micro. Adds are sized by the new `engine/sizing.scale_in_qty`: the open risk of all adds (a full stop-out + 1
  tick + commission) stays inside the first entry's $ risk, 60% of the room and the soft daily loss left. Max 40 micros in all.
  A size tilt below 1 rounds down (min 1). A tilt above 1 is capped by the live caps (60% room, soft daily loss, 40).
- **Scores per half:**
  - Exact fresh-eval starts on every session (2-week pass / fail = within 10 sessions).
  - A 2,000-path Monte Carlo of the eval (MC).
  - Money, PF, win % and drawdown on the back-to-back eval path (a new eval only after a pass or a fail).
- **2021-25:** no 1m bars, so the 1m ideas are not tested there (a reference line only, never a gate).

Table columns are H1 / H2. The 2-wk columns are pass / fail %.

| Variant | Trades/wk | Win % | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|---|---|
| **Live (reference)** | 3.12 / 2.56 | 22.5 / 35.0 | 3.66 / 2.13 | +36,723 / +9,674 | 6,025 / 2,605 | -3,612 / -2,493 | 52.9 / 9.2 | 50.7 / 2.9 | 50.5/7.0 ; 54.0/6.8 |

## 1. Scale-in / pyramiding

The add triggers:
- **imm:** the next 1m open after breakeven.
- **cisd:** after breakeven, the first 1m pullback of at least pb R from the high since the breakeven bar, then a 1m close above
  that pullback's CISD level. The add fills at the next 1m open.
- **pull:** a resting limit at entry + p R.

The add's stop is the breakeven stop. "rat" moves the stop of the whole position to the add's price once the add is + rat_k x its
own risk.

| Variant | Trades/wk | Win % | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|---|---|
| **cisd pb 0.25, rat, add 1.0x (candidate)** | 3.12 / 2.56 | 32.5 / 35.0 | 3.81 / 3.27 | **+49,205 / +26,015** | 8,073 / 7,004 | -3,861 / -2,612 | **53.8** / 10.1 | **52.2** / 2.9 | 50.8/10.7 ; 57.1/6.3 |
| neighbour pb 0.1 | 3.12 / 2.56 | 33.8 / 35.0 | 3.67 / 2.89 | +45,044 / +21,518 | 7,390 / 5,793 | -3,882 / -2,570 | 57.1 / 10.1 | 53.6 / 2.9 | 49.6/10.8 ; 54.6/6.4 |
| neighbour pb 0.2 | 3.12 / 2.56 | 33.8 / 35.0 | 3.88 / 2.88 | +49,636 / +21,476 | 8,143 / 5,782 | -3,861 / -2,612 | 55.5 / 10.1 | 52.2 / 2.9 | 51.0/10.6 ; 54.4/6.5 |
| neighbour pb 0.3 | 3.12 / 2.56 | 31.2 / 35.0 | 3.63 / 2.85 | +50,225 / +21,333 | 8,240 / 5,744 | -3,861 / -2,612 | 53.8 / 9.2 | 52.2 / 2.9 | 50.0/10.7 ; 57.4/6.2 |
| neighbour pb 0.4 | 3.12 / 2.56 | 31.2 / 35.0 | 3.81 / 2.83 | +49,801 / +21,046 | 8,170 / 5,666 | -3,748 / -2,493 | 54.6 / 9.2 | 52.2 / 2.9 | 50.5/10.6 ; 57.2/6.2 |
| neighbour pb 0.5 | 3.12 / 2.56 | 31.2 / 35.0 | 4.16 / 2.32 | +48,566 / +13,099 | 7,968 / 3,527 | -2,784 / -2,755 | 50.4 / 9.2 | 52.2 / 2.9 | 47.1/10.4 ; 56.4/6.2 |
| neighbour add 0.75x | 3.12 / 2.56 | 32.5 / 35.0 | 3.46 / 3.63 | +42,164 / +21,749 | 6,917 / 5,856 | -3,845 / -2,493 | 55.5 / 10.1 | 52.2 / 2.9 | 52.3/10.7 ; 56.8/6.3 |
| neighbour add 1.5x | 3.12 / 2.56 | 32.5 / 35.0 | 3.68 / 2.84 | +48,945 / +18,060 | 8,030 / 4,862 | -3,861 / -2,493 | 53.8 / 10.1 | 52.2 / 2.9 | 50.8/10.7 ; 57.4/6.3 |
| neighbour add 0.5x | 3.12 / 2.56 | 32.5 / 37.5 | 3.2 / 2.65 | +35,463 / +15,349 | 5,818 / 4,132 | -3,891 / -2,493 | 55.5 / 10.1 | 50.7 / 2.9 | 50.5/9.9 ; 56.4/6.2 |
| neighbour rat_k 0.75 | 3.12 / 2.56 | 33.8 / 35.0 | 3.6 / 3.09 | +44,234 / +23,960 | 7,257 / 6,451 | -3,861 / -2,612 | 52.1 / 10.1 | 50.7 / 2.9 | 48.0/10.7 ; 56.3/6.3 |
| neighbour rat_k 1.5 | 3.12 / 2.56 | 28.7 / 35.0 | 3.74 / 3.27 | +51,493 / +25,863 | 8,448 / 6,963 | -3,861 / -2,612 | 52.9 / 9.2 | 52.2 / 2.9 | 50.8/10.9 ; 57.1/6.3 |
| stress: add fills 2 pts worse | 3.12 / 2.56 | 31.2 / 35.0 | 3.96 / 3.25 | +53,018 / +25,691 | 8,698 / 6,917 | -3,913 / -2,493 | 54.6 / 9.2 | 52.2 / 2.9 | 51.8/10.8 ; 56.7/6.3 |
| stress: without the Oct 13 add (H2's best) | 3.12 / 2.56 | 32.5 / 35.0 | 3.81 / 3.11 | +49,205 / +24,162 | 8,073 / 6,505 | -3,861 / -2,612 | 53.8 / 10.1 | 50.7 / 2.9 | 50.8/10.7 ; 57.0/6.3 |
| control: stop move only, no add | 3.12 / 2.56 | 32.5 / 37.5 | 3.74 / 2.14 | +33,882 / +9,786 | 5,559 / 2,635 | -2,668 / -2,493 | 51.3 / 7.6 | 50.7 / 2.9 | 47.2/6.3 ; 54.2/6.0 |
| control: cisd add, no stop move | 3.12 / 2.56 | 22.5 / 32.5 | 3.36 / 3.26 | +45,924 / +25,770 | 7,534 / 6,938 | -3,861 / -2,705 | 53.8 / 13.4 | 50.7 / 2.9 | 52.5/13.0 ; 54.5/7.4 |
| imm add 1.0x | 3.12 / 2.56 | 22.5 / 32.5 | 2.79 / 3.04 | +39,883 / +21,445 | 6,543 / 5,774 | -4,839 / -2,493 | 54.6 / **15.1** | 53.6 / **8.7** | 52.5/14.3 ; 56.7/8.2 |
| imm add 1.0x, start at half size | 3.12 / 2.56 | 22.5 / 32.5 | 3.12 / 4.46 | +32,508 / +20,613 | 5,333 / 5,550 | -2,788 / -2,087 | 52.9 / **4.2** | 55.1 / **0.0** | 46.1/4.4 ; 59.4/0.1 |
| cisd candidate, start at half size | 3.12 / 2.56 | 32.5 / 35.0 | 3.93 / 2.65 | +31,502 / +8,636 | 5,168 / 2,325 | -2,436 / -1,860 | 47.1 / 2.5 | 44.9 / 0.0 | 43.9/4.0 ; 49.8/0.0 |
| no add, start at half size | 3.12 / 2.56 | 22.5 / 35.0 | 3.35 / 1.74 | +14,619 / +3,102 | 2,398 / 835 | -1,753 / -1,395 | 2.5 / 0.0 | 1.4 / 0.0 | 2.3/0.0 ; 1.9/0.0 |
| pull 0.75R, add 1.0x | 3.12 / 2.56 | 22.5 / 32.5 | 2.89 / 3.21 | +39,944 / +28,414 | 6,553 / 7,650 | -4,826 / -3,223 | 52.1 / 13.4 | 58.0 / 7.2 | 51.2/14.9 ; 58.3/9.3 |
| imm, rat, 2 adds, add 1.0x | 3.12 / 2.56 | 16.2 / 25.0 | 0.49 / 0.25 | -18,297 / -9,132 | -3,002 / -2,459 | -22,599 / -9,517 | 5.0 / 68.1 | 0.0 / 53.6 | 4.3/63.2 ; 0.0/53.6 |

The full grid of 104 + 37 variants (pullback adds at 0.25 / 0.5 / 0.75R, two adds, every size and start) is in
`research/lit/big_ideas.json` (groups `scale`, `scale_nb`, `stress`).

What happens:
- **The adds:** 52 of the 120 trades get an add (H1 35, H2 17). At unit size the adds earn +41.6R (H1) and +25.3R (H2), measured
  in the first entry's R. H1 exits: 22 BE, 11 target, 2 EOD; H2: 10 target, 5 BE, 2 EOD.
- **Why the stop move matters:**
  - Without it, an add whose trade later comes back to breakeven loses the full distance from the entry to the add, about 1R of
    the add's own size. That is why "add, no stop move" raises H1 2-week fails 9.2 → 13.4.
  - With it, the add risks nothing once it is +1 of its own risk.
  - The stop move alone, with no add, loses H1 money: it gives back targets. The gain is the add.
- **Why "add right after breakeven" is worse:** it buys the top of the first push. Many of those trades pull back to breakeven, so
  the add loses its 1R+ and 2-week fails rise 6 points in both halves.
- **Two adds** stack risk on the same move and blow up (fails 50-68%).
- **Where the money comes from:**
  - In H1, three days (Jan 6, Mar 16, May 1) carry the whole gain on the eval path. Two big Jan targets (Jan 7, Jan 22) became
    stop-at-the-add exits, which cost $6k.
  - H2 is broader: 8 targets each gain $1.1-4.4k.
- **Eval odds:**
  - 2-week pass +0.9 (H1) and +1.5 (H2) points: one eval start each. Without the Oct 13 add, H2 is back to 50.7.
  - 2-week fails: H1 +0.9 (MC +3.7), H2 0.
  - 1-month fails: H1 16.5 → 21.1, H2 6.8 → 8.5.
  - Cost per 2-week pass: $174 → $171 (H1), $181 → $176 (H2).
- **Verdict: adopt-candidate.** The money edge is strong and robust in both halves. The 2-week pass gain is real but tiny and
  thin, with a small rise in H1 fails. Paper-trade it first.

## 2. Trend-day mode

The trend-day flag uses facts known at the 5m setup bar:
- **on_rng:** the range since 18:00 / the 20-session average daily range.
- **cov:** the distance already covered from the 18:00 open in VIX one-day moves.
- **lvl_htf:** the swept level is PDH/PDL/PWH/PWL/PMH/PML.
- **disp:** the displacement body / ATR.
- **vix:** the prior VIX close.

On flagged days the trade uses one of these modes:
- bank 12R / bank 15R / no bank
- breakeven at 2R (be2)
- target = the next VIX band step (18:00 open +/- 2 VIX moves, band2)
- combinations of the above

Thresholds are the H1 quantiles 0.2-0.8, on both sides, frozen for H2.

| Variant | Trades/wk | Win % | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|---|---|
| every day: bank 12R | 3.12 / 2.56 | 17.5 / 27.5 | 3.18 / 1.36 | +26,582 / +3,085 | 4,361 / 830 | -3,970 / -3,407 | 37.8 / 7.6 | 43.5 / 0.0 | 37.8/5.5 ; 42.0/4.6 |
| every day: no bank | 3.12 / 2.56 | 17.5 / 27.5 | 4.56 / 1.44 | +35,983 / +3,833 | 5,903 / 1,032 | -3,831 / -3,432 | 32.8 / 2.5 | 44.9 / 0.0 | 35.0/4.3 ; 41.5/5.0 |
| every day: BE at 2R | 3.12 / 2.56 | 27.5 / 35.0 | 2.75 / 2.48 | +31,536 / +13,529 | 5,174 / 3,642 | -3,470 / -2,558 | 49.6 / 10.1 | 44.9 / 2.9 | 51.5/11.1 ; 52.4/7.8 |
| every day: next VIX band | 3.16 / 2.56 | 19.8 / 32.5 | 3.58 / 2.15 | +34,420 / +8,722 | 5,647 / 2,348 | -3,328 / -3,133 | 54.6 / 7.6 | 46.4 / 0.0 | 51.2/6.5 ; 54.9/4.5 |
| **H1 pick:** disp <= 1.27 (q0.67), next band + BE 2R | 3.16 / 2.56 | 25.9 / 32.5 | 3.3 / 2.59 | +38,097 / +13,697 | 6,250 / 3,688 | -3,461 / -2,010 | 58.0 / 7.6 | **46.4** / 0.0 | 54.5/8.0 ; 52.9/6.1 |
| neighbour disp <= 1.10 (q0.5) | 3.16 / 2.56 | 23.5 / 32.5 | 3.05 / 2.15 | +35,630 / +10,159 | 5,846 / 2,735 | -3,461 / -2,558 | 54.6 / 7.6 | 42.0 / 2.9 | 53.4/7.7 ; 51.9/7.2 |
| neighbour disp <= 1.44 (q0.8) | 3.16 / 2.56 | 24.7 / 32.5 | 2.68 / 2.59 | +26,642 / +13,697 | 4,371 / 3,688 | -3,402 / -2,010 | 57.1 / 6.7 | 46.4 / 0.0 | 56.0/8.3 ; 52.9/6.1 |
| 2nd H1 pick: on_rng >= 0.67 (q0.8), BE 2R | 3.12 / 2.56 | 25.0 / 35.0 | 3.61 / 2.13 | +37,994 / +9,674 | 6,233 / 2,605 | -3,612 / -2,493 | 56.3 / 10.1 | 50.7 / 2.9 | 51.3/7.0 ; 54.0/6.8 |
| 4th H1 pick: cov <= -0.47 (q0.2), BE 2R | 3.12 / 2.56 | 23.8 / 35.0 | 3.36 / 2.5 | +36,730 / +13,594 | 6,026 / 3,660 | -3,612 / -2,493 | 56.3 / 10.1 | 50.7 / 2.9 | 51.0/7.3 ; 53.0/7.2 |

- 16 of 328 classifier x mode variants beat the live trade on both pass and money in H1. **0 of the 16 did in H2.** The best H1
  pick loses 4.3 points of 2-week passes in Jul-Oct. The others leave H2 passes unchanged (the flag hardly fires) or lower.
- The 8R bank binds on 22 trades, but only 3 of them (all H1) reached it. A later bank turns those into full-target trades that
  mostly come back. In this sizing one winner must pass, so a bigger but rarer target loses evals (bank 12R: 52.9 → 37.8).
- **Verdict: rejected.**

## 3. Volatility-regime sizing

The tilt multiplies the micros by the VIX or VXN prior close, the VIX / its 20-session mean, or the 5m ATR / its 20-session mean.
Thresholds: the H1 terciles and median, plus fixed levels (VIX 16/18/20/22, VXN 20/22/24/26). Shapes: up / down in either bucket
(0.5, 0.67, 0.75, 1.25, 1.5x).

| Variant | Trades/wk | Win % | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|---|---|
| best ranked: VIX >= 16.9 (q0.33) x1.5 | 3.12 / 2.56 | 22.5 / 35.0 | 3.09 / 1.72 | +32,095 / +6,498 | 5,266 / 1,749 | -3,713 / -2,493 | 54.6 / 9.2 | 50.7 / 2.9 | 51.0/8.8 ; 53.9/6.8 |
| neighbour VIX >= 16 x1.5 | 3.12 / 2.56 | 22.5 / 35.0 | 2.94 / 1.76 | +31,229 / +6,883 | 5,123 / 1,853 | -3,713 / -2,493 | 52.9 / 9.2 | 50.7 / 2.9 | 50.1/8.9 ; 53.9/6.8 |
| neighbour VIX >= 20 x1.5 | 3.12 / 2.56 | 22.5 / 35.0 | 3.43 / 2.13 | +35,347 / +9,674 | 5,799 / 2,605 | -3,713 / -2,493 | 52.1 / 9.2 | 50.7 / 2.9 | 50.2/7.3 ; 54.0/6.8 |
| VIX >= 16.9: high x0.75 / low x1.25 | 3.12 / 2.56 | 22.5 / 35.0 | 3.18 / 2.05 | +23,618 / +9,412 | 3,875 / 2,534 | -2,890 / -2,598 | 26.9 / 4.2 | 37.7 / 2.9 | 25.4/4.2 ; 47.7/4.6 |
| VIX >= 16.9: high x1.25 / low x0.75 | 3.12 / 2.56 | 22.5 / 35.0 | 3.11 / 1.98 | +25,420 / +5,396 | 4,170 / 1,453 | -3,733 / -1,741 | 49.6 / 8.4 | 21.7 / 0.0 | 45.3/6.2 ; 20.2/1.9 |
| VXN >= 20 x1.5 | 3.12 / 2.56 | 22.5 / 35.0 | 2.87 / 2.14 | +30,482 / +9,308 | 5,001 / 2,506 | -3,713 / -2,704 | 52.9 / 10.1 | 50.7 / 8.7 | 50.0/9.4 ; 50.5/10.6 |
| 5m ATR / 20-day >= 0.77 (q0.5) x1.5 | 3.12 / 2.56 | 22.5 / 35.0 | 2.5 / 2.2 | +24,197 / +11,222 | 3,970 / 3,021 | -3,707 / -2,704 | 54.6 / 9.2 | 50.7 / 2.9 | 51.1/7.7 ; 53.1/7.0 |

- **0 of 160 tilts** gain in both halves on money and 2-week passes. 1 gains money in both; none gains passes in both.
- Any size cut below the "one winner passes" size kills passes: the winner no longer covers the target. Any size-up runs into the
  60%-room and $1,000 daily caps, which already bind, so it only adds risk.
- **Verdict: rejected.** Volatility is already inside LIT twice: the stop is wider on volatile days (fewer micros), and the target
  is a VIX band.

## 4. News-release setups

A news setup is a LIT setup whose sweep extreme prints 0-15 minutes after an 08:30 / 10:00 / 14:00 release
(`data/news/events.csv`; high impact, also high + medium; windows 10 / 15 / 20 min).

- **2026:**
  - 7 such setups. 4 pass the LIT setup rules (depth, inducement, displacement).
  - Their stops would be 154 / 94 / 395 / 285 pts against an 80-pt maximum. The medium-impact ones: 62 and 272.
  - The two that fit a stop of up to 120 pts (Apr 14, 62 pts; May 8, 94 pts) never fill: no tap of the limit and no 1m CISD inside
    the window.
- **2021-25** (5m reference): 12 setups pass the rules, 11 of them need a stop over 80 pts, and 0 trade.
- Every variant gives exactly the live result: size x0.5-1.5, a 2nd trade a day for news setups only (after any exit / after a
  stop-out), and max stop 120 / 160 / 250 for news setups.
- **Why:** the release candle is the sweep. Its extreme sits 100-400 pts from where a CISD forms, and LIT's stop goes beyond the
  protected extreme. The target (one VIX move from the 18:00 open) is then under 1.5R.
- **Verdict: not testable** with LIT's own stop rule. A news model would need a different stop, and that is a different strategy.

## Ranking

| Rank | Idea | Both halves: net $ | Both halves: 2-wk pass | Verdict |
|---|---|---|---|---|
| 1 | Scale-in on a 1m CISD after breakeven + stop to the add | yes (+$12.5k / +$16.3k) | yes, small (+0.9 / +1.5 pts) | adopt-candidate |
| 2 | Half size + add right after breakeven | no (H1 −$4.2k) | H1 equal, H2 +4.4 | rejected (fails 4.2 / 0.0%: an eval-safety idea) |
| 3 | Add right after breakeven | yes | yes | rejected (2-week fails +6 pts in both halves) |
| 4 | Trend-day mode | 0 of 16 H1 picks | 0 of 16 | rejected |
| 5 | Volatility tilt | 1 of 160 | 0 of 160 | rejected |
| 6 | News-release setups | no trades | no trades | not testable |

## Implementation (default off)

- **engine/lit.py:**
  - `DEFAULTS["scale_in"] = None`.
  - With `{"pb": 0.25, "f": 1.0, "rat_k": 1.0, "min_rk": 2.0, "n": 1}`, `simulate_x` adds the scale-in on 1m days in the backtest.
    The trade gets `adds` (time, price, points, micros), `qty_total`, and pnl / low with the adds. `qty` stays the first entry's.
  - Live (2026-10-19): the open position carries `adds`, and when the add's 1m CISD candle is the last closed bar it carries
    `add_now` (price from the forming bar's open when the feed shows it, micros as the backtest sizes them) for the PC bot to
    route at market at once.
  - `scale_trade` (the weekly stop) scales the adds too.
- **engine/sizing.py:** `scale_in_qty(q_base, q_full, risk_pts, adds, f, state)` gives the add micros under the caps. The research
  harness uses the same function.
- **Tests:**
  - `python -X utf8 -m tests.test_lit_scale_in`: 10/10. Off by default; the sizing caps; engine == research simulator on all 52
    add trades; same 120 trades.
  - `python -X utf8 -m tests.test_lit_live --days`: 120/120 identical at the default.
- **Config change, to try it in a backtest only:** add `"scale_in": {"pb": 0.25, "f": 1.0, "rat_k": 1.0, "min_rk": 2.0, "n": 1}`
  to `live_model.json` "lit".
- **Live route (done 2026-10-19, paper / Sim tested, see `lit-live-fills.md` "Exits and adds on the route"):**
  - `engine/live.py` routes `add_now` once, 2 s after the add's CISD close (`_route_add`); add micros: the model's add at the
    routed size in normal mode, `scale_in_qty` with the eval state (60% room, soft daily loss left, 40 micros) in the eval modes.
  - `engine/ninjatrader.py add_to_position`: a MARKET add, then CHANGE of the quantity of the one OCO stop + target to the
    whole position (no second bracket). Self-test `python -m engine.ninjatrader --selftest` section 16.
  - `python -X utf8 -m tests.test_lit_scale_in --all`: every 2026 add trade through the PC bot = the backtest (time, micros,
    price, exit P&L).
  - To switch it on: the config change above. Run Sim101 for a week first.
- Commands: `python -X utf8 tools/lit_big_ideas.py check | grid [1 1b 2 3 4] | save`. Results: `research/lit/big_ideas.json`.

## The three adopt-candidates together (2026-10-19, runs `lit_adopt_all3`, `lit_adopt_all3_eval`)

`tools/lit_adopt_combo.py` runs the engine itself (`engine/lit.py run_x`, the code the live loop runs) with t_check +
scale_in + be_off on top of the live settings. Options off it reproduces `lit_live` and the research executor (120/120).
Costs in. 2021-25 has no 1m bars, so only be_off acts there (reference: PF 1.01, +$1.2k, as before).

| 2026 | lit_live H1 | all three H1 | lit_live H2 | all three H2 |
|---|---:|---:|---:|---:|
| Trades / week (weeks 2+) | 3.12 (85%) | 3.12 (85%) | 2.56 (81%) | 2.56 (81%) |
| LIT size rule: PF | 4.44 | 4.94 | 2.46 | 3.48 |
| LIT size rule: net · $/month | +$32,773 · $5,377 | +$44,507 · $7,302 | +$8,962 · $2,413 | +$15,192 · $4,090 |
| LIT size rule: max DD | -$2,315 | -$2,510 | -$1,466 | -$1,451 |
| Eval path (two_week): net · $/month | +$36,723 · $6,025 | +$53,116 · $8,714 | +$9,674 · $2,605 | +$17,262 · $4,647 |
| Eval path: max DD | -$3,612 | -$3,059 | -$2,493 | -$3,076 |
| MFFU 50K 2-week pass / fail | 52.9 / 9.2 | 58.0 / 2.5 | 50.7 / 2.9 | 52.2 / 0.0 |
| Monte Carlo 2-week pass / fail | 50.5 / 7.0 | 51.9 / 3.2 | 54.0 / 6.8 | 58.1 / 3.2 |

Better in both halves on every line except the eval-path drawdown in H2 (-$2.5k to -$3.1k). Honest note: on the eval path
H2 makes less with all three (+$17.3k) than with scale_in alone (+$26.0k): the 15-minute check cuts trades that the add would
later have carried. The pass / fail numbers favour all three; the H2 money favours scale_in alone. Thin sample (13 cuts, 52 adds).
