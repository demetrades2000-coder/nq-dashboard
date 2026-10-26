## In one minute

- **The ask (owner, 2026-10-22):** "There are LIT entries all the time, there isn't a specific window. Look deeper. I need this
  better." Goal: 3+ LIT trades a week (ideally 3-5) that add money in both 2026 halves without more MFFU eval fails.
- **Today's LIT:** entries 02:00-15:30 ET, 1 trade a day, 15-minute check and BE + costs on. 2026 H1 (Jan-Jun): 3.12 trades a
  week, +$33,891 at the LIT size. H2 (Jul-Oct 16): 2.56 a week, +$9,493. Eval path 2-week pass / fail H1 57.1 / 5.9, H2 52.2 / 0.0.
- **498 variants tested.** Windows, 2-3 trades a day with many 2nd-trade rules, sizes for the extra trades, Asia at its own
  size and bank, looser rules at night, a 15m LIT chain at night.
- **Answer: nothing passes every gate.** No variant adds money in both halves, keeps eval fails at or below today and reaches 3
  trades a week in both halves. Today's LIT stays.
- **Lead 1 (new): Asia as its own slot with a 3R bank** (`asiaslotn_rr3_x1.0`). 1 Asia trade (18:00-02:00) plus the normal
  02:00-15:30 trade; the Asia trade banks at 3R instead of 8R.
  - Trades: 4.8 a week (H1) and 4.1 (H2); 89% / 75% of weeks have 3+.
  - Money (LIT size): H1 +$34,661 (+$770), H2 +$13,686 (+$4,193). Eval path: H1 +$41,006, H2 +$12,385.
  - Eval fails go UP a little: 2-week H1 5.9 -> 6.7%, H2 0.0 -> 2.9%; 1 month H2 0.0 -> 3.4%. 2-week passes H2 52.2 -> 59.4%.
  - Why not: fails rise, the H1 gain is small and all from February, 2021-25 loses $15.5k (vs +$1.2k). (The PC route that
    blocked Asia entries before 00:00 is fixed since 2026-10-22: see "PC route: fixed".)
- **Lead 2: 1 London + 1 NY trade, the NY one 2+ hours after the first exit** (`lonny_c120_x1.0`).
  - Money: H1 +$34,464 (+$573), H2 +$9,524 (+$31). Eval path: H1 +$36,389, H2 +$14,724.
  - Eval fails go DOWN in H1: 2-week 5.9 -> 3.4%, 1 month 11.9 -> 5.5%. H2 unchanged at 0.0 / 0.0.
  - Why not: only 11 extra trades in 2026 (one +$1,301 trade carries H1), 3.40 / 2.82 trades a week (H2 under 3).
  - It is the only one that is PC-route ready (tested: 2 trades on one day routed and exited once each).
- **Chance:** only 13 of 498 variants add money in both halves on both views (2.6%). If extra trades were neutral, about a
  quarter would. Most extra LIT trades lose money in at least one half.

## What is new compared with the earlier studies

- `lit-all-hours.md` (2026-10-18) ran before the 15-minute check and BE + costs existed. There the Asia trade took the day's
  only slot and kept the far 8R bank. New here:
  - all of it rerun with today's upgrades;
  - Asia in its own slot (it never takes the London trade's place);
  - Asia with its own bank / breakeven / VIX band.
  - Asia with a 3R bank is the first Asia version that makes money in both halves on its own: H1 +$1,890 (PF 1.29), H2
    +$4,724 (PF 2.05). With the 8R bank it is -$4,025 / +$4,907.
- `lit-adv-continuation.md` and `lit-more-setups.md` tried continuation / flip 2nd trades and a 2nd trade for big levels on the
  older path. New here: the 2nd trade only after a win / a loss / a breakeven, flip vs same side, cool-downs (30-240 min), day
  R caps, a new level, a stricter setup, and every rule at full, half and quarter size, on the live eval path.
- New: looser setup rules only outside the main hours; a 15m LIT chain at night; the London / NY split with a cool-down.
- `lit-retail-entries.md` and its `src_cap` option are not on this branch; the 2nd-trade plumbing used here is the old
  `max_per_day` / `per_session` / `stop_after_loss` plus the new `second` and `sess_m` options.

## How it was tested

- **Data:** CME NQ1! from TradingView only, 5m 2021-11 to 2026-10-16, 1m for 2026. Official CME data only (TradingView / NinjaTrader), no CFD.
- **Same LIT:** `engine/lit.py` run_x with `live_model.json` "lit" (15-minute check, BE + 1.25 pts, Monday rule, weekly stop,
  1m CISD entries, stop 1 tick past the sweep extreme, VIX-band target banked at 8R). Candidates on the whole trading day
  (`candidates(evening=True)`). With the live window they give exactly the live trades: base = run `lit_live`
  (120 trades, H1 +$33,891, H2 +$9,493) and eval = run `lit_adopt_t15_be_off_eval` (57.1 / 5.9, 52.2 / 0.0).
- **Two money views (costs in):**
  - LIT size: $800 up to a 20-pt stop, then 800 x 20 / stop, weekly stop (how `lit_live` is scored).
  - Eval path: the live two_week sizing (`engine/sizing.lit_qty`: "one winner passes" for 10 sessions, then safe_eval, no
    reset, $1.90 a micro). The 60% room cap and the $1,000 soft daily loss use the day's closed P&L, so a 2nd trade is
    sized on what the day already made or lost. No new trade once the day reached the target. Fresh evals on every session
    (2-week and 1-month pass / fail) plus a Monte Carlo (MC). The eval-path $ is one back-to-back eval path per half.
- **Pick and check:** pick on H1 (Jan 2 - Jun 30), check on H2 (Jul 1 - Oct 16). 2021-25 is a reference line (5m only; the
  15-minute check never acts there).
- **Gates for "adopt":** in each half, more $ at the LIT size AND on the eval path, 2-week and 1-month eval fails not above
  today, 3+ trades a week.
- **One trade at a time** in every variant: a new setup only after the last trade ended.

## Results: the main lines (costs in)

Columns: trades a week, % of weeks with 3+ trades, win %, PF, net $, $ a month, max drawdown at the LIT size; then the eval
path: net $, 2-week pass / fail, 1-month pass / fail, Monte Carlo 2-week pass / fail.

| Variant | Half | /wk | 3+ wk % | Win % | PF | Net $ | $/mo | Max DD | Eval net $ | 2-wk p/f | 1-mo p/f | MC 2-wk p/f |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `base` (today) | H1 | 3.12 | 70 | 58.8 | 4.98 | +33,891 | +5,560 | -2,196 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 52.8 / 2.6 |
| `base` (today) | H2 | 2.56 | 44 | 47.5 | 2.69 | +9,493 | +2,556 | -1,396 | +9,059 | 52.2 / 0.0 | 50.8 / 0.0 | 55.1 / 3.5 |
| `base` (today) | 2021-25 ref | 2.38 | 43 | 53.7 | 1.01 | +1,211 | +24 | -19,436 | - | - | - | - |
| `asiaslotn_rr3_x1.0` (lead 1) | H1 | 4.8 | 89 | 59.3 | 3.4 | +34,661 | +5,687 | -2,755 | +41,006 | 56.3 / 6.7 | 71.6 / 11.0 | 56.4 / 5.7 |
| `asiaslotn_rr3_x1.0` (lead 1) | H2 | 4.1 | 75 | 51.6 | 2.43 | +13,686 | +3,685 | -1,643 | +12,385 | 59.4 / 2.9 | 69.5 / 3.4 | 60.8 / 4.7 |
| `asiaslotn_rr3_x1.0` (lead 1) | 2021-25 ref | 3.24 | 68 | 51.3 | 0.9 | -15,505 | -304 | -23,399 | - | - | - | - |
| `asiaslotn_rr3_depth075` (H1 pick) | H1 | 4.73 | 89 | 61.2 | 3.53 | +35,224 | +5,779 | -2,516 | +36,098 | 58.0 / 5.0 | 75.2 / 10.1 | 56.8 / 5.0 |
| `asiaslotn_rr3_depth075` (H1 pick) | H2 | 4.1 | 75 | 50.0 | 2.2 | +12,355 | +3,326 | -1,643 | +15,783 | 58.0 / 4.3 | 64.4 / 5.1 | 58.4 / 5.3 |
| `asiaslotn_rr3_depth075` (H1 pick) | 2021-25 ref | 3.19 | 66 | 51.5 | 0.92 | -12,273 | -240 | -22,702 | - | - | - | - |
| `asiaslotn_rr2.75_x1.0` | H1 | 4.73 | 89 | 59.5 | 3.38 | +34,313 | +5,629 | -2,755 | +35,022 | 55.5 / 6.7 | 67.9 / 11.9 | 56.4 / 5.7 |
| `asiaslotn_rr2.75_x1.0` | H2 | 4.04 | 69 | 52.4 | 2.42 | +13,188 | +3,551 | -1,643 | +12,181 | 59.4 / 1.4 | 66.1 / 1.7 | 61.4 / 4.7 |
| `asiaslotn_rr3_w20` (Asia from 20:00) | H1 | 4.73 | 89 | 59.5 | 3.42 | +34,737 | +5,699 | -2,755 | +43,432 | 57.1 / 6.7 | 71.6 / 11.0 | 57.0 / 5.5 |
| `asiaslotn_rr3_w20` (Asia from 20:00) | H2 | 3.97 | 69 | 51.6 | 2.38 | +12,729 | +3,427 | -1,643 | +11,105 | 56.5 / 2.9 | 62.7 / 5.1 | 60.5 / 5.2 |
| `lonny_c120_x1.0` (lead 2) | H1 | 3.4 | 70 | 59.8 | 4.66 | +34,464 | +5,654 | -2,522 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 55.0 / 2.7 |
| `lonny_c120_x1.0` (lead 2) | H2 | 2.82 | 50 | 50.0 | 2.6 | +9,524 | +2,564 | -1,230 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | 55.6 / 3.5 |
| `lonny_c120_x1.0` (lead 2) | 2021-25 ref | 2.62 | 51 | 53.3 | 0.99 | -732 | -14 | -19,311 | - | - | - | - |
| `asiaslot_rr8_x1.0` (Asia slot, live 8R bank) | H1 | 4.73 | 89 | 59.5 | 2.92 | +27,367 | +4,490 | -4,132 | +28,284 | 49.6 / 12.6 | 60.6 / 25.7 | 50.1 / 6.6 |
| `asiaslot_rr8_x1.0` (Asia slot, live 8R bank) | H2 | 4.1 | 75 | 51.6 | 2.22 | +12,531 | +3,374 | -1,658 | +2,795 | 63.8 / 2.9 | 66.1 / 3.4 | 61.0 / 6.7 |
| `win_full` (18:00-15:30, 1 a day) | H1 | 3.71 | 89 | 61.1 | 3.5 | +27,459 | +4,505 | -3,388 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 49.1 / 1.4 |
| `win_full` (18:00-15:30, 1 a day) | H2 | 3.21 | 69 | 44.0 | 2.03 | +9,568 | +2,576 | -1,726 | +4,458 | 55.1 / 1.4 | 59.3 / 11.9 | 52.4 / 6.2 |
| `win_24h` (18:00-15:50, 1 a day) | H1 | 3.71 | 89 | 61.1 | 3.5 | +27,459 | +4,505 | -3,388 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 49.1 / 1.4 |
| `win_24h` (18:00-15:50, 1 a day) | H2 | 3.27 | 69 | 45.1 | 2.03 | +9,623 | +2,591 | -1,726 | +3,903 | 55.1 / 1.4 | 59.3 / 15.3 | 52.8 / 6.2 |
| `win_late` (02:00-15:50) | H2 | 2.69 | 50 | 47.6 | 2.67 | +9,495 | +2,556 | -1,396 | +9,006 | 52.2 / 0.0 | 50.8 / 0.0 | 55.1 / 3.5 |
| `win_asia` (18:00-02:00 only) | H1 | 1.88 | 33 | 56.2 | 0.42 | -4,025 | -660 | -5,518 | -406 | 8.4 / 0.0 | 9.2 / 0.0 | 6.7 / 0.0 |
| `win_asia` (18:00-02:00 only) | H2 | 1.79 | 31 | 50.0 | 1.8 | +4,907 | +1,321 | -2,400 | +471 | 42.0 / 0.0 | 54.2 / 1.7 | 39.6 / 0.3 |
| `asia_kz_mg_rr3` (Asia only, 3R bank) | H1 | 1.8 | 26 | 56.5 | 1.29 | +1,890 | +310 | -2,403 | +2,349 | 11.8 / 0.0 | 20.2 / 0.0 | 12.4 / 0.0 |
| `asia_kz_mg_rr3` (Asia only, 3R bank) | H2 | 1.6 | 19 | 56.0 | 2.05 | +4,724 | +1,272 | -1,288 | +3,518 | 30.4 / 0.0 | 54.2 / 0.0 | 27.0 / 0.2 |
| `asia_kz_mg_rr3` (Asia only, 3R bank) | 2021-25 ref | 0.9 | 6 | 44.6 | 0.66 | -23,182 | -454 | -23,206 | - | - | - | - |
| `live_n2_any_x1.0` (2 a day) | H1 | 3.87 | 74 | 55.6 | 3.53 | +28,933 | +4,747 | -2,704 | +29,590 | 46.2 / 8.4 | 66.1 / 17.4 | 48.2 / 8.2 |
| `live_n2_any_x1.0` (2 a day) | H2 | 3.14 | 56 | 46.9 | 2.68 | +12,058 | +3,246 | -1,868 | +13,287 | 50.7 / 11.6 | 57.6 / 22.0 | 53.9 / 9.9 |
| `live_n2_any_x0.5` (2nd at half size) | H1 | 3.87 | 74 | 55.6 | 4.1 | +30,523 | +5,008 | -2,194 | +33,333 | 57.1 / 7.6 | 73.4 / 13.8 | 52.4 / 5.3 |
| `live_n2_any_x0.5` (2nd at half size) | H2 | 3.14 | 56 | 46.9 | 2.61 | +10,408 | +2,802 | -1,634 | +15,355 | 50.7 / 4.3 | 50.8 / 6.8 | 53.6 / 8.6 |
| `live_n3_any_x1.0` (3 a day) | H1 | 4.06 | 74 | 57.7 | 3.66 | +30,492 | +5,003 | -2,456 | +25,928 | 47.1 / 3.4 | 78.9 / 8.3 | 51.0 / 5.8 |
| `live_n3_any_x1.0` (3 a day) | H2 | 3.33 | 56 | 50.0 | 2.73 | +12,430 | +3,347 | -1,868 | +13,421 | 50.7 / 11.6 | 57.6 / 22.0 | 53.9 / 9.8 |
| `live_n2_after_win_x1.0` | H1 | 3.12 | 70 | 58.8 | 4.98 | +33,891 | +5,560 | -2,196 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 52.8 / 2.6 |
| `live_n2_after_win_x1.0` | H2 | 2.76 | 56 | 48.8 | 2.61 | +9,583 | +2,580 | -1,396 | +9,447 | 52.2 / 0.0 | 50.8 / 0.0 | 55.5 / 3.5 |
| `live_n2_after_loss_x1.0` | H1 | 3.59 | 70 | 57.6 | 4.27 | +31,298 | +5,135 | -2,202 | +32,587 | 46.2 / 8.4 | 66.1 / 14.7 | 49.4 / 6.5 |
| `live_n2_after_loss_x1.0` | H2 | 2.88 | 44 | 44.4 | 2.75 | +11,967 | +3,222 | -1,868 | +9,069 | 50.7 / 4.3 | 57.6 / 6.8 | 54.7 / 8.8 |
| `live_n2_after_be_x1.0` | H1 | 3.4 | 74 | 56.3 | 4.03 | +31,527 | +5,172 | -2,691 | +32,069 | 57.1 / 5.9 | 73.4 / 15.6 | 51.5 / 4.9 |
| `live_n2_after_be_x1.0` | H2 | 2.63 | 44 | 48.8 | 2.69 | +9,495 | +2,556 | -1,395 | +8,028 | 52.2 / 7.2 | 50.8 / 11.9 | 54.2 / 5.4 |
| `live_n2_flip_stop_x1.0` (opposite side after a loss) | H1 | 3.2 | 70 | 58.5 | 4.87 | +33,713 | +5,531 | -2,196 | +34,446 | 57.1 / 6.7 | 74.3 / 12.8 | 52.7 / 4.2 |
| `live_n2_flip_stop_x1.0` (opposite side after a loss) | H2 | 2.69 | 44 | 45.2 | 2.38 | +8,771 | +2,361 | -1,396 | +9,233 | 52.2 / 0.0 | 47.5 / 1.7 | 55.0 / 4.8 |
| `live_n2_reenter_stop_x1.0` (same side after a loss) | H1 | 3.55 | 70 | 58.2 | 4.38 | +31,723 | +5,205 | -2,202 | +25,776 | 47.1 / 5.0 | 67.0 / 11.0 | 50.2 / 4.5 |
| `live_n2_reenter_stop_x1.0` (same side after a loss) | H2 | 2.76 | 44 | 46.5 | 3.07 | +12,689 | +3,416 | -1,739 | +10,361 | 50.7 / 4.3 | 61.0 / 5.1 | 54.8 / 8.4 |
| `live_n2_cont_win_x1.0` (same side after a win) | H2 | 2.63 | 44 | 48.8 | 2.76 | +9,921 | +2,671 | -1,396 | +9,485 | 52.2 / 0.0 | 50.8 / 0.0 | 55.5 / 3.5 |
| `live_n2_cool120_x1.0` (2nd 2 h after) | H1 | 3.55 | 70 | 60.4 | 4.47 | +33,702 | +5,529 | -2,518 | +36,090 | 57.1 / 3.4 | 78.0 / 5.5 | 54.6 / 3.0 |
| `live_n2_cool120_x1.0` (2nd 2 h after) | H2 | 2.95 | 50 | 50.0 | 2.43 | +9,359 | +2,520 | -1,230 | +12,893 | 52.2 / 0.0 | 47.5 / 0.0 | 55.9 / 3.5 |
| `live_n2_rstop_m05_x1.0` (stop the day at -0.5R) | H1 | 3.44 | 74 | 55.7 | 3.96 | +31,344 | +5,142 | -2,873 | +32,009 | 57.1 / 6.7 | 73.4 / 16.5 | 51.5 / 6.0 |
| `live_n2_rstop_m05_x1.0` (stop the day at -0.5R) | H2 | 2.82 | 56 | 50.0 | 2.61 | +9,584 | +2,580 | -1,395 | +7,991 | 52.2 / 7.2 | 50.8 / 11.9 | 55.0 / 5.4 |
| `live_n2_new_level_x1.0` | H1 | 3.52 | 70 | 57.8 | 4.13 | +31,811 | +5,219 | -2,869 | +34,088 | 57.1 / 5.0 | 73.4 / 14.7 | 52.1 / 5.0 |
| `live_n2_new_level_x1.0` | H2 | 2.95 | 56 | 47.8 | 2.32 | +8,862 | +2,386 | -1,395 | +7,689 | 52.2 / 7.2 | 47.5 / 13.6 | 54.9 / 6.5 |
| `live_n2_q_disp12_x1.0` (2nd needs disp 1.2 ATR) | H1 | 3.52 | 70 | 60.0 | 4.62 | +33,008 | +5,415 | -2,193 | +33,261 | 52.9 / 6.7 | 74.3 / 12.8 | 50.8 / 4.7 |
| `live_n2_q_disp12_x1.0` (2nd needs disp 1.2 ATR) | H2 | 2.76 | 44 | 46.5 | 2.58 | +9,292 | +2,502 | -1,479 | +12,191 | 52.2 / 4.3 | 50.8 / 5.1 | 54.9 / 8.9 |
| `live_n2_sal_x1.0` (stop after a loss) | H1 | 3.55 | 74 | 54.9 | 3.87 | +31,124 | +5,106 | -2,869 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 49.8 / 7.0 |
| `live_n2_sal_x1.0` (stop after a loss) | H2 | 2.88 | 56 | 48.9 | 2.37 | +8,992 | +2,421 | -1,395 | +7,819 | 52.2 / 7.2 | 47.5 / 11.9 | 54.9 / 5.5 |
| `full_n2_any_x0.5` (18:00-15:30, 2 a day, 2nd half) | H1 | 5.12 | 89 | 58.0 | 2.9 | +25,395 | +4,166 | -3,947 | +28,376 | 54.6 / 10.9 | 66.1 / 24.8 | 48.5 / 7.6 |
| `full_n2_any_x0.5` (18:00-15:30, 2 a day, 2nd half) | H2 | 4.55 | 75 | 49.3 | 2.3 | +12,467 | +3,356 | -1,843 | +12,781 | 58.0 / 4.3 | 62.7 / 10.2 | 54.5 / 8.4 |
| `full_n3_any_x1.0` (18:00-15:30, 3 a day) | H1 | 5.51 | 89 | 57.4 | 2.6 | +25,663 | +4,210 | -4,725 | +25,767 | 51.3 / 16.0 | 60.6 / 29.4 | 48.0 / 12.2 |
| `full_n3_any_x1.0` (18:00-15:30, 3 a day) | H2 | 4.94 | 75 | 48.1 | 2.09 | +12,304 | +3,313 | -2,005 | +15,243 | 60.9 / 10.1 | 59.3 / 18.6 | 57.8 / 16.1 |
| `win_full_asia_x0.5` (Asia at half size) | H1 | 3.71 | 89 | 61.1 | 4.86 | +29,346 | +4,815 | -2,530 | +32,806 | 54.6 / 0.0 | 67.0 / 3.7 | 50.4 / 0.3 |
| `win_full_asia_x0.5` (Asia at half size) | H2 | 3.21 | 69 | 44.0 | 2.13 | +7,222 | +1,944 | -1,221 | +2,199 | 24.6 / 0.0 | 37.3 / 6.8 | 30.6 / 1.5 |
| `24h_kz_out_disp0.6` (looser outside 02:00-12:00) | H1 | 4.02 | 89 | 58.3 | 2.21 | +16,979 | +2,786 | -4,136 | +7,388 | 51.3 / 0.8 | 62.4 / 9.2 | 46.5 / 2.3 |
| `24h_kz_out_disp0.6` (looser outside 02:00-12:00) | H2 | 3.65 | 81 | 52.6 | 2.15 | +10,814 | +2,912 | -2,271 | +7,946 | 68.1 / 0.0 | 67.8 / 10.2 | 60.5 / 3.5 |
| `live_kz_all_disp0.6` (looser all day) | H1 | 3.67 | 78 | 60.6 | 4.55 | +35,508 | +5,826 | -2,378 | +29,427 | 63.0 / 6.7 | 75.2 / 9.2 | 58.2 / 3.6 |
| `live_kz_all_disp0.6` (looser all day) | H2 | 2.95 | 62 | 41.3 | 1.36 | +2,685 | +723 | -2,291 | +1,277 | 47.8 / 10.1 | 44.1 / 22.0 | 41.2 / 8.7 |
| `5m+15m_24h_1day` (15m LIT chain all day) | H1 | 3.2 | 70 | 58.5 | 4.29 | +28,802 | +4,725 | -2,664 | +31,403 | 56.3 / 3.4 | 73.4 / 5.5 | 51.8 / 1.6 |
| `5m+15m_24h_1day` (15m LIT chain all day) | H2 | 2.76 | 62 | 51.2 | 3.09 | +11,398 | +3,069 | -1,426 | +19,445 | 52.2 / 1.4 | 52.5 / 1.7 | 58.0 / 3.4 |
| `5m+15m_night_2day_x0.5` (15m chain at night, half) | H1 | 3.24 | 70 | 57.8 | 4.68 | +33,352 | +5,472 | -2,323 | +33,276 | 57.1 / 5.9 | 74.3 / 11.9 | 52.6 / 2.8 |
| `5m+15m_night_2day_x0.5` (15m chain at night, half) | H2 | 2.69 | 56 | 50.0 | 2.92 | +10,389 | +2,797 | -1,396 | +17,919 | 52.2 / 0.0 | 50.8 / 0.0 | 56.5 / 3.1 |

Every one of the 498 variants is in the appendix below and in `research/lit/more_entries.json`.

## Where the extra trades land (LIT size, number of trades / net $)

| Variant | Half | Asia 18-02 | London 02-08 | NY AM 08-12 | NY PM 12-17 |
|---|---|---|---|---|---|
| today | H1 | - | 63 / +27,503 | 15 / +4,530 | 2 / +1,858 |
| today | H2 | - | 32 / +9,609 | 6 / -617 | 2 / +501 |
| 18:00-15:30, 1 a day | H1 | 47 / -3,642 | 37 / +25,473 | 10 / +4,710 | 1 / +918 |
| 18:00-15:30, 1 a day | H2 | 27 / +3,532 | 20 / +6,311 | 2 / -584 | 1 / +309 |
| Asia slot, 3R bank (lead 1) | H1 | 45 / +2,406 | 60 / +26,719 | 15 / +4,530 | 3 / +1,005 |
| Asia slot, 3R bank (lead 1) | H2 | 24 / +4,191 | 32 / +9,391 | 6 / -396 | 2 / +501 |
| London + NY, 2 h cool-down (lead 2) | H1 | - | 63 / +27,503 | 20 / +6,005 | 4 / +956 |
| London + NY, 2 h cool-down (lead 2) | H2 | - | 32 / +9,609 | 6 / -617 | 6 / +532 |
| 3 a day, 02:00-15:30 | H1 | - | 77 / +24,095 | 23 / +5,911 | 4 / +486 |
| 3 a day, 02:00-15:30 | H2 | - | 36 / +13,151 | 10 / -1,253 | 6 / +532 |
| 3 a day, 18:00-15:30 | H1 | 50 / -4,074 | 67 / +24,834 | 21 / +4,888 | 3 / +16 |
| 3 a day, 18:00-15:30 | H2 | 32 / +3,267 | 31 / +9,411 | 8 / -906 | 6 / +532 |

- London is LIT's money in both halves. Every rule that lets another trade into London (a 2nd London trade, or an Asia trade
  still open at 02:00) costs London money.
- **The pool of extra LIT setups on today's hours is small.** With no daily cap at all (3 a day), 02:00-15:30 adds only 24
  trades in H1 (+0.2R in total) and 12 in H2 (+4.4R). That is too few to reach 3 a week in H2 and has no edge in H1.
- **Asia is where the extra trades are** (about 1.8 a week), and with the live 8R bank they lose in H1 (-$4,025, PF 0.42).
  With a 3R bank they make money in both halves of 2026 but lose -$23k in 2021-25 (5m, no 15-minute check).

## The two leads in detail

### Lead 1: Asia as its own slot, bank at 3R (`asiaslotn_rr3_x1.0`)

- Rules: entries 18:00-15:30; at most 1 Asia trade (18:00-02:00) and 1 trade 02:00-15:30 (`per_session`); the Asia trade's
  bank is 3R (`kz`), everything else as live. Still one trade at a time.
- 75 new trades in 2026: H1 49 (+$1,324, but +$3,169 in February and -$2,394 in March-April), H2 26 (+$3,447, from August-
  September). 8 live trades are lost because an Asia trade was still open; they were losers (-$1,638).
- **The 3R bank is a narrow ridge, not a plateau.** Asia slot at the LIT size, H1 / H2 vs today: bank 2.5R +$230 / +$2,153,
  2.75R +$422 / +$3,695, 3R +$770 / +$4,193, 3.25R -$569 / +$3,628, 3.5R -$1,466 / +$3,512, 4R -$669 / +$4,922, 8R -$6,524 /
  +$3,038. Only 2.5-3R holds in H1, and only by a few hundred dollars.
- **Eval fails go up.** 2-week fails H1 5.9 -> 6.7%, H2 0.0 -> 2.9%; 1 month H2 0.0 -> 3.4%; Monte Carlo 2-week fails H1 2.6 ->
  5.7%. Passes go up in H2 (2-week 52.2 -> 59.4%, 1 month 50.8 -> 69.5%) and are flat in H1 (57.1 -> 56.3%).
- **The eval-path $ is very path-sensitive** (one back-to-back path per half): H1 +$41,006 at 3R, +$35,022 at 2.75R, +$35,286 at
  3.25R, +$17,176 at 2.5R. Do not read the eval-path $ as the gain; the LIT-size $ is the cleaner number.
- The H1 pick of the study (the best H1 among the variants that pass the H1 gates with 3+ a week) is this slot with a sweep
  depth of 0.75 ATR for Asia (`asiaslotn_rr3_depth075`: H1 +$35,224, 2-week fails 5.0%). It fails the H2 check: 2-week fails
  0.0 -> 4.3%, 1 month 0.0 -> 5.1%.
- PC route: fixed 2026-10-22 (see "PC route: fixed" below); the switch stays off.

### Lead 2: 1 London + 1 NY trade, the NY one 2+ hours after the first exit (`lonny_c120_x1.0`)

- Rules: entries 02:00-15:30; at most 1 trade 02:00-08:00 and 1 trade 08:00-15:30 (`per_session`); the 2nd trade's 5m entry
  bar must start 120+ minutes after the first trade's exit (`second.cool`).
- A plateau in its knobs: cool-down 120-240 min and the split at 07:00-08:30 give the same H1 (+$570-575 at the LIT size,
  2-week fails 3.4%); 30-90 min raise the H2 fails to 4.3%.
- But it is 11 trades in 2026 (H1 7 = +$572, of which one 2026-02-26 target +$1,301; H2 4 = +$31). The H1 fail drop (5.9 ->
  3.4%) is 3 evals out of 119. 3.40 / 2.82 trades a week.
- 2021-25 (5m): -$732 vs +$1,211.

## Chance

- 498 variants. 17 pass the H1 gates; none of them passes the H2 check. 13 add money in both halves on both views (2.6%). If
  extra trades were neutral, about 1 in 4 would do that by luck; 2.6% means most extra LIT trades cost money.
- **Placebo for a 2nd-trade rule:** 200 random sets of 11 extra trades drawn from the "any 2nd trade" pool (28 extra setups in
  2026): 0 of 200 pass the money gates ($ up in both halves on both views, eval fails not up). 36 of 200 (18%) add money in
  both halves at the LIT size. Lead 2 passes the money gates, so its cool-down does better than a random 2nd-trade rule, but
  on 11 trades.
- **Placebo for all-hours trades:** 200 random sets of 75 extra trades from the 18:00-15:30 "2 a day" pool (102 extra setups):
  0 of 200 pass, 0 of 200 add money in both halves. Lead 1's slot + 3R bank beats random all-hours trades.
- **Lead 1 with a random half of its extra trades** (100 draws): 0 pass the money gates, 28 of 100 add money in both halves at
  the LIT size; the median eval path is -$3.1k (H1) / -$1.7k (H2). Lead 1 depends on which Asia trades it gets.

## Re-arming: does one setup block the day?

- No. An unfilled limit (no tap in 30 min, or no 1m CISD) never blocks a later setup, in the backtest and in the live loop.
- 2026 H1: 142 setups were armed, 80 filled. On 42 days the first armed setup did not fill; on 14 of them a later setup
  filled. H2: 79 armed, 40 filled; 27 days, 8 traded later.
- What does stop more trades: the 1-a-day cap after a fill, and "one trade at a time" (a setup that forms while a trade is
  open is dropped).

## Verdict

- **Today's LIT stays** (02:00-15:30, 1 trade a day). No switch is recommended tonight.
- Nothing gets 3+ trades a week in both halves AND more money in both halves AND no rise in eval fails. The extra LIT trades
  exist (Asia, 2nd trades), but on today's hours they are few and edgeless, and at night they need their own bank to make
  money, which is a narrow and 2026-only result.
- **Lead 1 (Asia slot, 3R bank)** is worth a paper shadow before anything else: it is the first Asia version positive in
  both 2026 halves, at 4-5 trades a week. It needs more data (the H1 gain is February); the PC route
  (18:00-24:00 entries, the late sighting) is fixed since 2026-10-22.
- **Lead 2 (London + NY, 2 h cool-down)** is safe and route-tested but tiny: it does not reach 3 a week.

### Switch JSON (for the owner's decision only; NOT applied)

Lead 2 (PC-route ready), in `live_model.json` and `live_model_lit.json`, inside "lit":

```json
"max_per_day": 2, "per_session": [[[120, 480], [480, 1080]], 1], "second": {"cool": 120}
```

and at the top level of `live_model.json`: `"guards": {"max_per_day": 2}` (the PC guard allows 1 entry a day by default).

Lead 1 (PC route fixed 2026-10-22), inside "lit":

```json
"window": [[1080, 1440], [0, 930]], "all_hours": true, "max_per_day": 2,
"per_session": [[[1080, 120], [120, 1080]], 1],
"kz": [[1080, 1440, {"max_rr": 3.0}], [0, 120, {"max_rr": 3.0}]]
```

plus `"guards": {"max_per_day": 2}` at the top level of `live_model.json`; NinjaTrader and the PC must run from 18:00 ET
(`scripts/schedule_pc.ps1` wakes at 01:30 ET and hibernates at 16:35 ET: with the Asia slot the PC must stay on from 18:00).

## What was built (all default off: today's trades unchanged)

- `engine/lit.py`:
  - `second`: rules for the 2nd+ trade of a day (after which exit, same / opposite side, cool-down in minutes, day R stop /
    take, a new level, a stricter setup, a size multiplier).
  - `sess_m`: size multiplier by session (e.g. Asia at half size).
  - Size multipliers from these are carried on the trade as `x_m`. engine/sizing.py does not apply `x_m` yet: neither lead
    uses a size below 1, so no sizing change was needed.
- `engine/lit_live.py`: builds the all-hours candidates when `all_hours` is on (the PC bot and the cloud monitor both use it);
  the "done for today" text shows the real daily cap.
- `tests/test_lit_live.py`: `bot_replay` takes extra live-model keys (e.g. "guards").
- `tools/lit_more_entries.py`: the study (check, grid, m15, chance, rearm, save).
- `tests/test_lit_more_entries.py`: both leads through the live loop.

### Tests

- Option off = today: `python -X utf8 -m tests.test_lit_live --days`: 120/120 trades identical.
- Option on, live loop = backtest (`python -X utf8 -m tests.test_lit_more_entries`):
  - Lead 1: 187/187 trades identical on every 2026 session (45 days with 2 trades).
  - Lead 2: 131/131 identical (11 days with 2 trades).
- **PC route** (engine/live.py LiveBot, PaperAdapter, guards on with `max_per_day 2`):
  - Lead 2 on 2026-09-16 (London + NY trade): 2/2 entries routed once, in order, one position at a time; 2/2 exits routed once.
    The default guard (`max_per_day 1`) would block the 2nd entry: the switch needs `"guards": {"max_per_day": 2}`.
  - Lead 1 on 2026-09-01/02: 2 of 4 routed. The 23:28 ET Asia entry is blocked by the calendar guard ("before the session start
    00:00": `engine/guards.calendar` refuses every entry from 18:00 to 24:00). The 20:41 ET Asia entry was first seen 79 min
    late in the replay and not chased: not explained yet. Both must be fixed before Asia could go live.
  - The test reports lead 1's LiveBot part as a known gap (not failed) and fails only on lead 2 or the day-end replays.

### PC route: fixed (2026-10-22, still OFF until the owner switches it)

- **Root causes.**
  1. `engine/guards.calendar` refused every 18:00-24:00 entry ("before the session start"). Now, only when LIT `all_hours` is
     on, it follows the CME trading day (18:00 opens the next date's session, its holiday / early close; 17:00-18:00 halt
     closed; session start = the window's first minute in that order = 18:00). Off: the same code path as before.
  2. The 79-min-late sighting: `lit.candidates(evening=True)` skips a day with fewer than 50 bars. Live, the forming day
     has fewer than 50 bars until 22:10 ET (18:00 + 50 x 5 min), so every evening setup was invisible until then (the
     backtest always sees the whole day). The rule now applies to finished days only (backtest unchanged; RTH detector
     unchanged).
  3. Found on the way: `lit._next_bar_same_day` treated 18:00-24:00 on an early-close day (e.g. the evening before
     Presidents' Day) as after the 13:00 halt, so the 1m CISD entry was routed a minute late (not at the CISD close).
  4. The NinjaTrader adapter refused evening / Sunday-evening entries and would have flattened an Asia trade at once
     ("before the session start"); the LiveBot clock safety flatten fired at any time after 15:58 (incl. 20:00). Both now
     use the trading-day order when all_hours is on.
- **Also checked / fixed for the evening:** daily counters and the max-2-a-day guard are per CME day (`trading_day`);
  weekly stop / Monday rule use the trading day (Sunday evening = Monday's week); the two_week eval clock counted the
  session as over from 16:00 into the evening (now only 16:00-18:00; text only); end-of-day summary covers the whole CME day
  with all_hours; heartbeat / Bot Brain texts show 18:00-15:30; auto-update hourly checks with all_hours run only 16:00-17:30
  ET on weekdays and at the weekend (they already wait while a position / bracket / armed setup exists). Cloud health
  alert window (01:50-15:55) is unchanged: alerts only.
- **Tests** (`python -X utf8 -m tests.test_lit_more_entries`): LiveBot (paper, guards on, max 2 a day) on 2026-09-01/02
  4/4 entries + 4/4 exits, 09-03/04 3/3 (incl. a 19:03 entry), Labor Day 09-07 2/2, Sunday evening 06-01 1/1, Presidents' Day 02-16 (Sunday evening, 13:00 halt) 1/1: 11/11 entries and exits; every
  entry routed 3 s after its 1m CISD close. Today's config: `tests.test_lit_live --days --bot` 120/120 and the LiveBot
  checks unchanged; tests.test_guards, test_autorun, test_eval_lifecycle, test_ops, test_brain, engine.ninjatrader
  --selftest (69/69) pass; day-end replays 187/187 (Asia slot) and 131/131 (London + NY) unchanged.

## Caveats

- The halves are small: H1 has 80 live trades, H2 40. One trade moves a half by $1-3k.
- The eval-path $ (one back-to-back eval path per half) swings by $5-20k between neighbouring variants. The fresh-eval pass /
  fail rates and the LIT-size $ are the numbers to trust.
- 2021-25 has no 1m bars (no 15-minute check), so it is a rough reference. It is negative for every Asia variant.
- The 5m + 15m merges are combined after the fact (the weekly stop of each run is its own), so they are approximate.

## Reproduce

- `python -X utf8 tools/lit_more_entries.py check`: base == run `lit_live` and `lit_adopt_t15_be_off_eval`.
- `python -X utf8 tools/lit_more_entries.py grid`: every variant -> `research/lit/more_entries.json` (about 1 s a variant).
- `python -X utf8 tools/lit_more_entries.py m15`, `chance`, `rearm`, `save` (runs `lit_more_ent_*`).

## Appendix: every variant (costs in)

H1 = Jan 2 - Jun 30 2026 (pick), H2 = Jul 1 - Oct 16 2026 (check). LIT $ = LIT size; eval $ = the two_week eval path; p/f =
pass / fail % of fresh evals. Names: window (`live` 02:00-15:30, `late` 02:00-15:50, `w00` 00:00, `w20` 20:00, `full` 18:00,
`24h` 18:00-15:50), `n2` / `n3` = max trades a day, then the 2nd-trade rule and `x` = its size; `kz_*` = setup or management
overrides in some hours; `asiaslot*` = Asia as its own slot; `lonny*` = 1 London + 1 NY trade; `5m+15m_*` = with the 15m chain.

| Variant | H1 /wk | H1 LIT $ | H1 eval $ | H1 2-wk p/f | H1 1-mo p/f | H2 /wk | H2 LIT $ | H2 eval $ | H2 2-wk p/f | H2 1-mo p/f | 2021-25 $ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `base` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.56 | +9,493 | +9,059 | 52.2 / 0.0 | 50.8 / 0.0 | +1,211 |
| `win_late` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +9,495 | +9,006 | 52.2 / 0.0 | 50.8 / 0.0 | +1,023 |
| `win_w00` | 3.32 | +28,127 | +26,277 | 55.5 / 2.5 | 67.9 / 11.9 | 3.08 | +7,755 | -1,292 | 47.8 / 4.3 | 54.2 / 11.9 | -8,099 |
| `win_w20` | 3.67 | +26,642 | +29,705 | 54.6 / 1.7 | 66.1 / 11.9 | 3.21 | +6,397 | +790 | 43.5 / 4.3 | 39.0 / 25.4 | -831 |
| `win_full` | 3.71 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.21 | +9,568 | +4,458 | 55.1 / 1.4 | 59.3 / 11.9 | -12,888 |
| `win_24h` | 3.71 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +9,623 | +3,903 | 55.1 / 1.4 | 59.3 / 15.3 | -13,084 |
| `win_asia` | 1.88 | -4,025 | -406 | 8.4 / 0.0 | 9.2 / 0.0 | 1.79 | +4,907 | +471 | 42.0 / 0.0 | 54.2 / 1.7 | -15,836 |
| `win_lon` | 2.54 | +27,512 | +29,311 | 55.5 / 4.2 | 71.6 / 6.4 | 2.05 | +9,503 | +17,437 | 52.2 / 0.0 | 49.2 / 0.0 | +6,696 |
| `win_nyam` | 0.98 | +12,859 | +13,276 | 23.5 / 0.0 | 35.8 / 0.0 | 0.58 | -1,370 | -1,386 | 0.0 / 0.0 | 0.0 / 10.2 | -12,029 |
| `win_nypm` | 0.16 | -36 | +394 | 0.0 / 0.0 | 0.0 / 0.0 | 0.38 | +532 | +526 | 0.0 / 0.0 | 0.0 / 0.0 | -1,583 |
| `win_full_asia_x0.5` | 3.71 | +29,346 | +32,806 | 54.6 / 0.0 | 67.0 / 3.7 | 3.21 | +7,222 | +2,199 | 24.6 / 0.0 | 37.3 / 6.8 | -3,454 |
| `win_full_asia_x0.25` | 3.71 | +30,810 | +32,345 | 56.3 / 0.0 | 73.4 / 0.0 | 3.21 | +6,709 | +2,686 | 23.2 / 0.0 | 18.6 / 1.7 | +1,004 |
| `win_24h_asia_x0.5` | 3.71 | +29,346 | +32,806 | 54.6 / 0.0 | 67.0 / 3.7 | 3.27 | +7,276 | +2,212 | 24.6 / 0.0 | 37.3 / 6.8 | -3,650 |
| `win_w20_asia_x0.5` | 3.67 | +28,492 | +33,000 | 53.8 / 0.0 | 65.1 / 8.3 | 3.21 | +5,692 | +4,731 | 24.6 / 0.0 | 30.5 / 13.6 | +3,804 |
| `live_n2_any_x1.0` | 3.87 | +28,933 | +29,590 | 46.2 / 8.4 | 66.1 / 17.4 | 3.14 | +12,058 | +13,287 | 50.7 / 11.6 | 57.6 / 22.0 | -4,418 |
| `live_n2_any_x0.5` | 3.87 | +30,523 | +33,333 | 57.1 / 7.6 | 73.4 / 13.8 | 3.14 | +10,408 | +15,355 | 50.7 / 4.3 | 50.8 / 6.8 | -1,766 |
| `live_n2_any_x0.25` | 3.87 | +31,067 | +33,780 | 57.1 / 5.9 | 73.4 / 12.8 | 3.14 | +9,652 | +15,426 | 50.7 / 4.3 | 50.8 / 6.8 | -388 |
| `live_n2_after_win_x1.0` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,583 | +9,447 | 52.2 / 0.0 | 50.8 / 0.0 | +581 |
| `live_n2_after_win_x0.5` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,538 | +9,299 | 52.2 / 0.0 | 50.8 / 0.0 | +953 |
| `live_n2_after_win_x0.25` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,622 | +9,239 | 52.2 / 0.0 | 50.8 / 0.0 | +1,098 |
| `live_n2_after_loss_x1.0` | 3.59 | +31,298 | +32,587 | 46.2 / 8.4 | 66.1 / 14.7 | 2.88 | +11,967 | +9,069 | 50.7 / 4.3 | 57.6 / 6.8 | +247 |
| `live_n2_after_loss_x0.5` | 3.59 | +31,943 | +34,396 | 57.1 / 7.6 | 73.4 / 13.8 | 2.88 | +10,363 | +15,328 | 50.7 / 4.3 | 50.8 / 6.8 | +584 |
| `live_n2_after_loss_x0.25` | 3.59 | +32,159 | +25,507 | 57.1 / 4.2 | 73.4 / 11.0 | 2.88 | +9,522 | +15,458 | 50.7 / 4.3 | 50.8 / 6.8 | +1,017 |
| `live_n2_after_stop_x1.0` | 3.44 | +31,701 | +26,914 | 50.4 / 3.4 | 66.1 / 9.2 | 2.82 | +12,560 | +9,175 | 50.7 / 4.3 | 61.0 / 5.1 | +247 |
| `live_n2_after_stop_x0.5` | 3.44 | +32,025 | +25,537 | 57.1 / 3.4 | 73.4 / 9.2 | 2.82 | +10,632 | +13,820 | 50.7 / 4.3 | 54.2 / 5.1 | +584 |
| `live_n2_after_stop_x0.25` | 3.44 | +32,110 | +25,911 | 57.1 / 3.4 | 73.4 / 9.2 | 2.82 | +9,630 | +13,820 | 50.7 / 4.3 | 50.8 / 5.1 | +1,017 |
| `live_n2_after_be_x1.0` | 3.4 | +31,527 | +32,069 | 57.1 / 5.9 | 73.4 / 15.6 | 2.63 | +9,495 | +8,028 | 52.2 / 7.2 | 50.8 / 11.9 | -2,769 |
| `live_n2_after_be_x0.5` | 3.4 | +32,472 | +33,618 | 57.1 / 5.9 | 73.4 / 13.8 | 2.63 | +9,494 | +8,028 | 52.2 / 0.0 | 50.8 / 0.0 | -880 |
| `live_n2_after_be_x0.25` | 3.4 | +32,799 | +33,450 | 57.1 / 5.9 | 73.4 / 13.8 | 2.63 | +9,494 | +8,028 | 52.2 / 0.0 | 50.8 / 0.0 | -81 |
| `live_n2_after_scratch_x1.0` | 3.55 | +31,124 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 2.69 | +8,902 | +5,120 | 52.2 / 7.2 | 47.5 / 11.9 | -2,769 |
| `live_n2_after_scratch_x0.5` | 3.55 | +32,389 | +33,368 | 57.1 / 5.9 | 73.4 / 14.7 | 2.69 | +9,225 | +7,756 | 52.2 / 0.0 | 47.5 / 0.0 | -880 |
| `live_n2_after_scratch_x0.25` | 3.55 | +32,849 | +33,644 | 57.1 / 5.0 | 73.4 / 13.8 | 2.69 | +9,386 | +7,920 | 52.2 / 0.0 | 50.8 / 0.0 | -81 |
| `live_n2_after_nonstop_x1.0` | 3.55 | +31,124 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 2.88 | +8,992 | +7,819 | 52.2 / 7.2 | 47.5 / 11.9 | -3,399 |
| `live_n2_after_nonstop_x0.5` | 3.55 | +32,389 | +33,368 | 57.1 / 5.9 | 73.4 / 14.7 | 2.88 | +9,269 | +9,717 | 52.2 / 0.0 | 47.5 / 0.0 | -1,138 |
| `live_n2_after_nonstop_x0.25` | 3.55 | +32,849 | +33,644 | 57.1 / 5.0 | 73.4 / 13.8 | 2.88 | +9,515 | +7,887 | 52.2 / 0.0 | 50.8 / 0.0 | -194 |
| `live_n2_same_x1.0` | 3.71 | +31,032 | +24,839 | 47.1 / 5.0 | 67.0 / 13.8 | 2.88 | +13,442 | +6,864 | 50.7 / 4.3 | 61.0 / 5.1 | -4,407 |
| `live_n2_same_x0.5` | 3.71 | +31,718 | +25,756 | 57.1 / 5.0 | 73.4 / 11.0 | 2.88 | +11,084 | +14,597 | 50.7 / 4.3 | 54.2 / 5.1 | -1,932 |
| `live_n2_same_x0.25` | 3.71 | +31,924 | +26,253 | 57.1 / 4.2 | 73.4 / 11.0 | 2.88 | +10,082 | +14,676 | 50.7 / 4.3 | 50.8 / 5.1 | -438 |
| `live_n2_opp_x1.0` | 3.36 | +32,043 | +34,200 | 57.1 / 6.7 | 73.4 / 14.7 | 2.88 | +8,435 | +4,953 | 52.2 / 7.2 | 47.5 / 13.6 | -406 |
| `live_n2_opp_x0.5` | 3.36 | +32,945 | +34,443 | 57.1 / 6.7 | 73.4 / 14.7 | 2.88 | +8,926 | +9,587 | 52.2 / 0.0 | 47.5 / 0.0 | +470 |
| `live_n2_opp_x0.25` | 3.36 | +33,282 | +34,486 | 57.1 / 5.9 | 73.4 / 13.8 | 2.88 | +9,172 | +7,757 | 52.2 / 0.0 | 50.8 / 0.0 | +618 |
| `live_n2_flip_stop_x1.0` | 3.2 | +33,713 | +34,446 | 57.1 / 6.7 | 74.3 / 12.8 | 2.69 | +8,771 | +9,233 | 52.2 / 0.0 | 47.5 / 1.7 | +3,134 |
| `live_n2_flip_stop_x0.5` | 3.2 | +33,977 | +34,513 | 57.1 / 6.7 | 74.3 / 12.8 | 2.69 | +9,095 | +9,559 | 52.2 / 0.0 | 47.5 / 0.0 | +2,084 |
| `live_n2_flip_stop_x0.25` | 3.2 | +34,108 | +34,224 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +9,256 | +8,950 | 52.2 / 0.0 | 50.8 / 0.0 | +1,709 |
| `live_n2_reenter_stop_x1.0` | 3.55 | +31,723 | +25,776 | 47.1 / 5.0 | 67.0 / 11.0 | 2.76 | +12,689 | +10,361 | 50.7 / 4.3 | 61.0 / 5.1 | -2,753 |
| `live_n2_reenter_stop_x0.5` | 3.55 | +32,105 | +26,616 | 57.1 / 5.0 | 73.4 / 11.0 | 2.76 | +10,762 | +14,489 | 50.7 / 4.3 | 54.2 / 5.1 | -925 |
| `live_n2_reenter_stop_x0.25` | 3.55 | +32,189 | +26,990 | 57.1 / 4.2 | 73.4 / 11.0 | 2.76 | +9,759 | +14,567 | 50.7 / 4.3 | 50.8 / 5.1 | +104 |
| `live_n2_cont_win_x1.0` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.63 | +9,921 | +9,485 | 52.2 / 0.0 | 50.8 / 0.0 | +966 |
| `live_n2_cont_win_x0.5` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.63 | +9,707 | +9,272 | 52.2 / 0.0 | 50.8 / 0.0 | +1,089 |
| `live_n2_cont_win_x0.25` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.63 | +9,707 | +9,272 | 52.2 / 0.0 | 50.8 / 0.0 | +1,089 |
| `live_n2_cool30_x1.0` | 3.79 | +30,776 | +31,968 | 46.2 / 6.7 | 78.0 / 11.9 | 3.08 | +8,790 | +9,004 | 52.2 / 11.6 | 47.5 / 18.6 | -1,039 |
| `live_n2_cool30_x0.5` | 3.79 | +31,198 | +35,404 | 57.1 / 5.9 | 74.3 / 10.1 | 3.08 | +9,067 | +9,514 | 52.2 / 4.3 | 47.5 / 6.8 | +374 |
| `live_n2_cool30_x0.25` | 3.79 | +31,621 | +35,729 | 57.1 / 4.2 | 74.3 / 9.2 | 3.08 | +9,313 | +12,049 | 52.2 / 4.3 | 50.8 / 6.8 | +698 |
| `live_n2_cool60_x1.0` | 3.63 | +33,464 | +35,977 | 57.1 / 5.9 | 78.0 / 9.2 | 3.01 | +9,244 | +12,105 | 52.2 / 4.3 | 47.5 / 6.8 | -35 |
| `live_n2_cool60_x0.5` | 3.63 | +33,497 | +36,219 | 57.1 / 4.2 | 74.3 / 8.3 | 3.01 | +9,305 | +15,352 | 52.2 / 4.3 | 47.5 / 6.8 | +852 |
| `live_n2_cool60_x0.25` | 3.63 | +33,833 | +36,262 | 57.1 / 3.4 | 74.3 / 7.3 | 3.01 | +9,551 | +15,422 | 52.2 / 4.3 | 50.8 / 6.8 | +861 |
| `live_n2_cool120_x1.0` | 3.55 | +33,702 | +36,090 | 57.1 / 3.4 | 78.0 / 5.5 | 2.95 | +9,359 | +12,893 | 52.2 / 0.0 | 47.5 / 0.0 | +1,393 |
| `live_n2_cool120_x0.5` | 3.55 | +33,467 | +36,307 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,422 | +13,092 | 52.2 / 0.0 | 47.5 / 0.0 | +1,462 |
| `live_n2_cool120_x0.25` | 3.55 | +33,669 | +36,516 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,669 | +13,163 | 52.2 / 0.0 | 50.8 / 0.0 | +1,169 |
| `live_n2_rstop_m05_x1.0` | 3.44 | +31,344 | +32,009 | 57.1 / 6.7 | 73.4 / 16.5 | 2.82 | +9,584 | +7,991 | 52.2 / 7.2 | 50.8 / 11.9 | -3,399 |
| `live_n2_rstop_m05_x0.5` | 3.44 | +32,554 | +33,583 | 57.1 / 6.7 | 73.4 / 14.7 | 2.82 | +9,539 | +9,300 | 52.2 / 0.0 | 50.8 / 0.0 | -1,138 |
| `live_n2_rstop_m05_x0.25` | 3.44 | +33,015 | +33,749 | 57.1 / 5.9 | 73.4 / 13.8 | 2.82 | +9,623 | +7,996 | 52.2 / 0.0 | 50.8 / 0.0 | -194 |
| `live_n2_rstop_0_x1.0` | 3.4 | +31,527 | +32,069 | 57.1 / 5.9 | 73.4 / 15.6 | 2.82 | +9,584 | +7,991 | 52.2 / 7.2 | 50.8 / 11.9 | -3,399 |
| `live_n2_rstop_0_x0.5` | 3.4 | +32,472 | +33,618 | 57.1 / 5.9 | 73.4 / 13.8 | 2.82 | +9,539 | +9,300 | 52.2 / 0.0 | 50.8 / 0.0 | -1,138 |
| `live_n2_rstop_0_x0.25` | 3.4 | +32,799 | +33,450 | 57.1 / 5.9 | 73.4 / 13.8 | 2.82 | +9,623 | +7,996 | 52.2 / 0.0 | 50.8 / 0.0 | -194 |
| `live_n2_rtake_1_x1.0` | 3.87 | +28,933 | +29,590 | 46.2 / 8.4 | 66.1 / 17.4 | 2.95 | +11,968 | +9,069 | 50.7 / 11.6 | 57.6 / 22.0 | -3,788 |
| `live_n2_rtake_1_x0.5` | 3.87 | +30,523 | +33,333 | 57.1 / 7.6 | 73.4 / 13.8 | 2.95 | +10,364 | +15,328 | 50.7 / 4.3 | 50.8 / 6.8 | -1,508 |
| `live_n2_rtake_1_x0.25` | 3.87 | +31,067 | +33,780 | 57.1 / 5.9 | 73.4 / 12.8 | 2.95 | +9,523 | +15,458 | 50.7 / 4.3 | 50.8 / 6.8 | -276 |
| `live_n2_rstop_m05_rtake_1_x1.0` | 3.44 | +31,344 | +32,009 | 57.1 / 6.7 | 73.4 / 16.5 | 2.63 | +9,495 | +8,028 | 52.2 / 7.2 | 50.8 / 11.9 | -2,769 |
| `live_n2_rstop_m05_rtake_1_x0.5` | 3.44 | +32,554 | +33,583 | 57.1 / 6.7 | 73.4 / 14.7 | 2.63 | +9,494 | +8,028 | 52.2 / 0.0 | 50.8 / 0.0 | -880 |
| `live_n2_rstop_m05_rtake_1_x0.25` | 3.44 | +33,015 | +33,749 | 57.1 / 5.9 | 73.4 / 13.8 | 2.63 | +9,494 | +8,028 | 52.2 / 0.0 | 50.8 / 0.0 | -81 |
| `live_n2_new_level_x1.0` | 3.52 | +31,811 | +34,088 | 57.1 / 5.0 | 73.4 / 14.7 | 2.95 | +8,862 | +7,689 | 52.2 / 7.2 | 47.5 / 13.6 | +418 |
| `live_n2_new_level_x0.5` | 3.52 | +32,869 | +34,427 | 57.1 / 5.0 | 73.4 / 14.7 | 2.95 | +9,140 | +9,587 | 52.2 / 0.0 | 47.5 / 0.0 | +555 |
| `live_n2_new_level_x0.25` | 3.52 | +33,204 | +34,470 | 57.1 / 4.2 | 73.4 / 13.8 | 2.95 | +9,386 | +7,757 | 52.2 / 0.0 | 50.8 / 0.0 | +350 |
| `live_n2_q_disp12_x1.0` | 3.52 | +33,008 | +33,261 | 52.9 / 6.7 | 74.3 / 12.8 | 2.76 | +9,292 | +12,191 | 52.2 / 4.3 | 50.8 / 5.1 | +1,121 |
| `live_n2_q_disp12_x0.5` | 3.52 | +33,466 | +34,194 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,292 | +12,191 | 52.2 / 4.3 | 50.8 / 5.1 | +1,191 |
| `live_n2_q_disp12_x0.25` | 3.52 | +33,596 | +25,710 | 57.1 / 3.4 | 74.3 / 9.2 | 2.76 | +9,292 | +12,191 | 52.2 / 4.3 | 50.8 / 5.1 | +1,456 |
| `live_n2_q_depth1_x1.0` | 3.83 | +29,117 | +29,650 | 46.2 / 6.7 | 66.1 / 15.6 | 3.14 | +7,782 | +8,612 | 50.7 / 11.6 | 47.5 / 18.6 | -5,633 |
| `live_n2_q_depth1_x0.5` | 3.83 | +30,441 | +33,368 | 57.1 / 6.7 | 73.4 / 12.8 | 3.14 | +8,293 | +9,357 | 50.7 / 4.3 | 47.5 / 6.8 | -2,241 |
| `live_n2_q_depth1_x0.25` | 3.83 | +30,851 | +33,982 | 57.1 / 5.9 | 73.4 / 12.8 | 3.14 | +8,617 | +10,912 | 50.7 / 4.3 | 50.8 / 6.8 | -333 |
| `live_n2_q_idm2_x1.0` | 3.67 | +30,681 | +31,680 | 46.2 / 8.4 | 66.1 / 16.5 | 2.95 | +14,112 | +10,399 | 52.2 / 4.3 | 61.0 / 5.1 | -52 |
| `live_n2_q_idm2_x0.5` | 3.67 | +31,471 | +33,551 | 57.1 / 5.9 | 73.4 / 14.7 | 2.95 | +11,689 | +10,356 | 52.2 / 4.3 | 54.2 / 5.1 | +456 |
| `live_n2_q_idm2_x0.25` | 3.67 | +31,807 | +33,666 | 57.1 / 5.0 | 73.4 / 13.8 | 2.95 | +10,693 | +14,721 | 52.2 / 4.3 | 50.8 / 5.1 | +396 |
| `live_n3_any_x1.0` | 4.06 | +30,492 | +25,928 | 47.1 / 3.4 | 78.9 / 8.3 | 3.33 | +12,430 | +13,421 | 50.7 / 11.6 | 57.6 / 22.0 | -4,204 |
| `live_n3_any_x0.5` | 4.06 | +31,209 | +30,226 | 57.1 / 3.4 | 74.3 / 7.3 | 3.33 | +10,563 | +6,366 | 50.7 / 4.3 | 50.8 / 6.8 | -1,659 |
| `live_n3_any_x0.25` | 4.06 | +31,750 | +23,276 | 57.1 / 2.5 | 74.3 / 7.3 | 3.33 | +9,807 | +9,763 | 50.7 / 4.3 | 50.8 / 6.8 | -378 |
| `live_n3_after_win_x1.0` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,583 | +9,447 | 52.2 / 0.0 | 50.8 / 0.0 | +581 |
| `live_n3_after_win_x0.5` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,538 | +9,299 | 52.2 / 0.0 | 50.8 / 0.0 | +953 |
| `live_n3_after_win_x0.25` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.76 | +9,622 | +9,239 | 52.2 / 0.0 | 50.8 / 0.0 | +1,098 |
| `live_n3_after_loss_x1.0` | 3.67 | +31,305 | +32,588 | 46.2 / 8.4 | 66.1 / 14.7 | 2.95 | +11,967 | +9,069 | 50.7 / 4.3 | 57.6 / 6.8 | +176 |
| `live_n3_after_loss_x0.5` | 3.67 | +31,946 | +34,397 | 57.1 / 7.6 | 73.4 / 13.8 | 2.95 | +10,364 | +14,804 | 50.7 / 4.3 | 50.8 / 6.8 | +468 |
| `live_n3_after_loss_x0.25` | 3.67 | +32,161 | +25,507 | 57.1 / 4.2 | 73.4 / 11.0 | 2.95 | +9,523 | +14,934 | 50.7 / 4.3 | 50.8 / 6.8 | +805 |
| `live_n3_after_scratch_x1.0` | 3.63 | +31,374 | +27,716 | 52.9 / 5.9 | 73.4 / 14.7 | 2.76 | +9,228 | +5,120 | 52.2 / 7.2 | 47.5 / 11.9 | -2,904 |
| `live_n3_after_scratch_x0.5` | 3.63 | +32,638 | +24,919 | 57.1 / 2.5 | 73.4 / 11.0 | 2.76 | +9,333 | +7,756 | 52.2 / 0.0 | 47.5 / 3.4 | -1,015 |
| `live_n3_after_scratch_x0.25` | 3.63 | +33,096 | +25,085 | 57.1 / 2.5 | 73.4 / 11.0 | 2.76 | +9,495 | +7,920 | 52.2 / 0.0 | 50.8 / 3.4 | -216 |
| `live_n3_after_nonstop_x1.0` | 3.63 | +31,374 | +27,716 | 52.9 / 5.9 | 73.4 / 14.7 | 2.95 | +9,317 | +7,819 | 52.2 / 7.2 | 47.5 / 11.9 | -3,534 |
| `live_n3_after_nonstop_x0.5` | 3.63 | +32,638 | +24,919 | 57.1 / 2.5 | 73.4 / 11.0 | 2.95 | +9,378 | +13,047 | 52.2 / 0.0 | 47.5 / 3.4 | -1,273 |
| `live_n3_after_nonstop_x0.25` | 3.63 | +33,096 | +25,085 | 57.1 / 2.5 | 73.4 / 11.0 | 2.95 | +9,624 | +7,887 | 52.2 / 0.0 | 50.8 / 3.4 | -328 |
| `live_n3_cool60_x1.0` | 3.71 | +33,469 | +35,977 | 57.1 / 5.9 | 78.0 / 9.2 | 3.08 | +9,244 | +15,190 | 52.2 / 4.3 | 47.5 / 6.8 | +169 |
| `live_n3_cool60_x0.5` | 3.71 | +33,499 | +36,220 | 57.1 / 4.2 | 74.3 / 8.3 | 3.08 | +9,305 | +15,966 | 52.2 / 4.3 | 47.5 / 6.8 | +1,137 |
| `live_n3_cool60_x0.25` | 3.71 | +33,834 | +36,262 | 57.1 / 3.4 | 74.3 / 7.3 | 3.08 | +9,551 | +16,036 | 52.2 / 4.3 | 50.8 / 6.8 | +1,190 |
| `live_n3_rstop_m05_x1.0` | 3.48 | +31,348 | +32,010 | 57.1 / 6.7 | 73.4 / 16.5 | 2.88 | +9,910 | +7,991 | 52.2 / 7.2 | 50.8 / 11.9 | -3,534 |
| `live_n3_rstop_m05_x0.5` | 3.48 | +32,556 | +33,583 | 57.1 / 6.7 | 73.4 / 14.7 | 2.88 | +9,647 | +14,743 | 52.2 / 0.0 | 50.8 / 3.4 | -1,273 |
| `live_n3_rstop_m05_x0.25` | 3.48 | +33,015 | +33,749 | 57.1 / 5.9 | 73.4 / 13.8 | 2.88 | +9,731 | +7,996 | 52.2 / 0.0 | 50.8 / 3.4 | -328 |
| `live_n3_new_level_x1.0` | 3.59 | +32,060 | +31,278 | 57.1 / 2.5 | 73.4 / 12.8 | 3.01 | +9,188 | +7,689 | 52.2 / 7.2 | 47.5 / 13.6 | +200 |
| `live_n3_new_level_x0.5` | 3.59 | +33,117 | +26,157 | 57.1 / 1.7 | 73.4 / 11.0 | 3.01 | +9,248 | +13,047 | 52.2 / 0.0 | 47.5 / 3.4 | +483 |
| `live_n3_new_level_x0.25` | 3.59 | +33,452 | +26,489 | 57.1 / 1.7 | 73.4 / 11.0 | 3.01 | +9,494 | +7,757 | 52.2 / 0.0 | 50.8 / 3.4 | +277 |
| `late_n2_any_x1.0` | 3.87 | +28,933 | +29,590 | 46.2 / 8.4 | 66.1 / 17.4 | 3.27 | +12,059 | +5,400 | 50.7 / 11.6 | 57.6 / 22.0 | -4,109 |
| `late_n2_any_x0.5` | 3.87 | +30,523 | +33,333 | 57.1 / 7.6 | 73.4 / 13.8 | 3.27 | +10,409 | +15,448 | 50.7 / 4.3 | 50.8 / 6.8 | -1,800 |
| `late_n2_any_x0.25` | 3.87 | +31,067 | +33,780 | 57.1 / 5.9 | 73.4 / 12.8 | 3.27 | +9,653 | +15,611 | 50.7 / 4.3 | 50.8 / 6.8 | -411 |
| `late_n2_after_win_x1.0` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,584 | +9,394 | 52.2 / 0.0 | 50.8 / 0.0 | +944 |
| `late_n2_after_win_x0.5` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,539 | +9,154 | 52.2 / 0.0 | 50.8 / 0.0 | +949 |
| `late_n2_after_win_x0.25` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,623 | +9,186 | 52.2 / 0.0 | 50.8 / 0.0 | +1,094 |
| `late_n2_after_loss_x1.0` | 3.59 | +31,298 | +32,587 | 46.2 / 8.4 | 66.1 / 14.7 | 3.01 | +11,968 | +8,676 | 50.7 / 4.3 | 57.6 / 6.8 | -13 |
| `late_n2_after_loss_x0.5` | 3.59 | +31,943 | +34,396 | 57.1 / 7.6 | 73.4 / 13.8 | 3.01 | +10,364 | +15,513 | 50.7 / 4.3 | 50.8 / 6.8 | +347 |
| `late_n2_after_loss_x0.25` | 3.59 | +32,159 | +25,507 | 57.1 / 4.2 | 73.4 / 11.0 | 3.01 | +9,523 | +15,643 | 50.7 / 4.3 | 50.8 / 6.8 | +792 |
| `late_n2_after_scratch_x1.0` | 3.55 | +31,124 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 2.82 | +8,903 | +9,548 | 52.2 / 7.2 | 47.5 / 11.9 | -2,938 |
| `late_n2_after_scratch_x0.5` | 3.55 | +32,389 | +33,368 | 57.1 / 5.9 | 73.4 / 14.7 | 2.82 | +9,226 | +9,874 | 52.2 / 0.0 | 47.5 / 0.0 | -1,049 |
| `late_n2_after_scratch_x0.25` | 3.55 | +32,849 | +33,644 | 57.1 / 5.0 | 73.4 / 13.8 | 2.82 | +9,387 | +8,897 | 52.2 / 0.0 | 50.8 / 0.0 | -250 |
| `late_n2_after_nonstop_x1.0` | 3.55 | +31,124 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 3.01 | +8,993 | +9,511 | 52.2 / 7.2 | 47.5 / 11.9 | -3,018 |
| `late_n2_after_nonstop_x0.5` | 3.55 | +32,389 | +33,368 | 57.1 / 5.9 | 73.4 / 14.7 | 3.01 | +9,270 | +7,877 | 52.2 / 0.0 | 47.5 / 0.0 | -1,124 |
| `late_n2_after_nonstop_x0.25` | 3.55 | +32,849 | +33,644 | 57.1 / 5.0 | 73.4 / 13.8 | 3.01 | +9,516 | +9,078 | 52.2 / 0.0 | 50.8 / 0.0 | -179 |
| `late_n2_same_x1.0` | 3.71 | +31,032 | +24,839 | 47.1 / 5.0 | 67.0 / 13.8 | 3.01 | +13,443 | +9,819 | 50.7 / 4.3 | 61.0 / 5.1 | -4,667 |
| `late_n2_same_x0.5` | 3.71 | +31,718 | +25,756 | 57.1 / 5.0 | 73.4 / 11.0 | 3.01 | +11,085 | +10,513 | 50.7 / 4.3 | 54.2 / 5.1 | -2,168 |
| `late_n2_same_x0.25` | 3.71 | +31,924 | +26,253 | 57.1 / 4.2 | 73.4 / 11.0 | 3.01 | +10,083 | +10,513 | 50.7 / 4.3 | 50.8 / 5.1 | -663 |
| `late_n2_opp_x1.0` | 3.36 | +32,043 | +34,200 | 57.1 / 6.7 | 73.4 / 14.7 | 3.01 | +8,436 | +9,381 | 52.2 / 7.2 | 47.5 / 13.6 | -24 |
| `late_n2_opp_x0.5` | 3.36 | +32,945 | +34,443 | 57.1 / 6.7 | 73.4 / 14.7 | 3.01 | +8,927 | +7,747 | 52.2 / 0.0 | 47.5 / 0.0 | +484 |
| `late_n2_opp_x0.25` | 3.36 | +33,282 | +34,486 | 57.1 / 5.9 | 73.4 / 13.8 | 3.01 | +9,173 | +8,865 | 52.2 / 0.0 | 50.8 / 0.0 | +632 |
| `late_n2_cool60_x1.0` | 3.63 | +33,464 | +35,977 | 57.1 / 5.9 | 78.0 / 9.2 | 3.14 | +9,245 | +12,290 | 52.2 / 4.3 | 47.5 / 6.8 | +274 |
| `late_n2_cool60_x0.5` | 3.63 | +33,497 | +36,219 | 57.1 / 4.2 | 74.3 / 8.3 | 3.14 | +9,306 | +15,444 | 52.2 / 4.3 | 47.5 / 6.8 | +817 |
| `late_n2_cool60_x0.25` | 3.63 | +33,833 | +36,262 | 57.1 / 3.4 | 74.3 / 7.3 | 3.14 | +9,552 | +15,607 | 52.2 / 4.3 | 50.8 / 6.8 | +839 |
| `late_n2_rstop_m05_x1.0` | 3.44 | +31,344 | +32,009 | 57.1 / 6.7 | 73.4 / 16.5 | 2.95 | +9,586 | +9,394 | 52.2 / 7.2 | 50.8 / 11.9 | -3,018 |
| `late_n2_rstop_m05_x0.5` | 3.44 | +32,554 | +33,583 | 57.1 / 6.7 | 73.4 / 14.7 | 2.95 | +9,540 | +8,149 | 52.2 / 0.0 | 50.8 / 0.0 | -1,124 |
| `late_n2_rstop_m05_x0.25` | 3.44 | +33,015 | +33,749 | 57.1 / 5.9 | 73.4 / 13.8 | 2.95 | +9,624 | +9,186 | 52.2 / 0.0 | 50.8 / 0.0 | -179 |
| `late_n2_new_level_x1.0` | 3.52 | +31,811 | +34,088 | 57.1 / 5.0 | 73.4 / 14.7 | 3.08 | +8,863 | +9,381 | 52.2 / 7.2 | 47.5 / 13.6 | +770 |
| `late_n2_new_level_x0.5` | 3.52 | +32,869 | +34,427 | 57.1 / 5.0 | 73.4 / 14.7 | 3.08 | +9,141 | +7,747 | 52.2 / 0.0 | 47.5 / 0.0 | +540 |
| `late_n2_new_level_x0.25` | 3.52 | +33,204 | +34,470 | 57.1 / 4.2 | 73.4 / 13.8 | 3.08 | +9,387 | +9,078 | 52.2 / 0.0 | 50.8 / 0.0 | +335 |
| `late_n3_any_x1.0` | 4.06 | +30,492 | +25,928 | 47.1 / 3.4 | 78.9 / 8.3 | 3.46 | +12,431 | +6,408 | 50.7 / 11.6 | 57.6 / 22.0 | -3,894 |
| `late_n3_any_x0.5` | 4.06 | +31,209 | +30,226 | 57.1 / 3.4 | 74.3 / 7.3 | 3.46 | +10,565 | +9,870 | 50.7 / 4.3 | 50.8 / 6.8 | -1,694 |
| `late_n3_any_x0.25` | 4.06 | +31,750 | +23,276 | 57.1 / 2.5 | 74.3 / 7.3 | 3.46 | +9,808 | +9,937 | 50.7 / 4.3 | 50.8 / 6.8 | -401 |
| `late_n3_after_win_x1.0` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,584 | +9,394 | 52.2 / 0.0 | 50.8 / 0.0 | +944 |
| `late_n3_after_win_x0.5` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,539 | +9,154 | 52.2 / 0.0 | 50.8 / 0.0 | +949 |
| `late_n3_after_win_x0.25` | 3.12 | +33,891 | +34,234 | 57.1 / 5.9 | 74.3 / 11.9 | 2.88 | +9,623 | +9,186 | 52.2 / 0.0 | 50.8 / 0.0 | +1,094 |
| `late_n3_after_loss_x1.0` | 3.67 | +31,305 | +32,588 | 46.2 / 8.4 | 66.1 / 14.7 | 3.08 | +11,968 | +8,676 | 50.7 / 4.3 | 57.6 / 6.8 | -84 |
| `late_n3_after_loss_x0.5` | 3.67 | +31,946 | +34,397 | 57.1 / 7.6 | 73.4 / 13.8 | 3.08 | +10,365 | +14,989 | 50.7 / 4.3 | 50.8 / 6.8 | +231 |
| `late_n3_after_loss_x0.25` | 3.67 | +32,161 | +25,507 | 57.1 / 4.2 | 73.4 / 11.0 | 3.08 | +9,524 | +15,119 | 50.7 / 4.3 | 50.8 / 6.8 | +580 |
| `late_n3_after_scratch_x1.0` | 3.63 | +31,374 | +27,716 | 52.9 / 5.9 | 73.4 / 14.7 | 2.88 | +9,229 | +12,406 | 52.2 / 7.2 | 47.5 / 11.9 | -3,073 |
| `late_n3_after_scratch_x0.5` | 3.63 | +32,638 | +24,919 | 57.1 / 2.5 | 73.4 / 11.0 | 2.88 | +9,334 | +12,753 | 52.2 / 0.0 | 47.5 / 3.4 | -1,184 |
| `late_n3_after_scratch_x0.25` | 3.63 | +33,096 | +25,085 | 57.1 / 2.5 | 73.4 / 11.0 | 2.88 | +9,496 | +12,884 | 52.2 / 0.0 | 50.8 / 3.4 | -385 |
| `late_n3_after_nonstop_x1.0` | 3.63 | +31,374 | +27,716 | 52.9 / 5.9 | 73.4 / 14.7 | 3.08 | +9,319 | +12,795 | 52.2 / 7.2 | 47.5 / 11.9 | -3,152 |
| `late_n3_after_nonstop_x0.5` | 3.63 | +32,638 | +24,919 | 57.1 / 2.5 | 73.4 / 11.0 | 3.08 | +9,379 | +7,877 | 52.2 / 0.0 | 47.5 / 3.4 | -1,258 |
| `late_n3_after_nonstop_x0.25` | 3.63 | +33,096 | +25,085 | 57.1 / 2.5 | 73.4 / 11.0 | 3.08 | +9,625 | +13,064 | 52.2 / 0.0 | 50.8 / 3.4 | -314 |
| `late_n3_cool60_x1.0` | 3.71 | +33,469 | +35,977 | 57.1 / 5.9 | 78.0 / 9.2 | 3.21 | +9,246 | +15,375 | 52.2 / 4.3 | 47.5 / 6.8 | +478 |
| `late_n3_cool60_x0.5` | 3.71 | +33,499 | +36,220 | 57.1 / 4.2 | 74.3 / 8.3 | 3.21 | +9,307 | +16,058 | 52.2 / 4.3 | 47.5 / 6.8 | +1,103 |
| `late_n3_cool60_x0.25` | 3.71 | +33,834 | +36,262 | 57.1 / 3.4 | 74.3 / 7.3 | 3.21 | +9,553 | +16,221 | 52.2 / 4.3 | 50.8 / 6.8 | +1,167 |
| `late_n3_rstop_m05_x1.0` | 3.48 | +31,348 | +32,010 | 57.1 / 6.7 | 73.4 / 16.5 | 3.01 | +9,911 | +14,863 | 52.2 / 7.2 | 50.8 / 11.9 | -3,152 |
| `late_n3_rstop_m05_x0.5` | 3.48 | +32,556 | +33,583 | 57.1 / 6.7 | 73.4 / 14.7 | 3.01 | +9,648 | +8,149 | 52.2 / 0.0 | 50.8 / 3.4 | -1,258 |
| `late_n3_rstop_m05_x0.25` | 3.48 | +33,015 | +33,749 | 57.1 / 5.9 | 73.4 / 13.8 | 3.01 | +9,733 | +14,868 | 52.2 / 0.0 | 50.8 / 3.4 | -314 |
| `late_n3_new_level_x1.0` | 3.59 | +32,060 | +31,278 | 57.1 / 2.5 | 73.4 / 12.8 | 3.14 | +9,189 | +12,234 | 52.2 / 7.2 | 47.5 / 13.6 | +552 |
| `late_n3_new_level_x0.5` | 3.59 | +33,117 | +26,157 | 57.1 / 1.7 | 73.4 / 11.0 | 3.14 | +9,250 | +7,747 | 52.2 / 0.0 | 47.5 / 3.4 | +468 |
| `late_n3_new_level_x0.25` | 3.59 | +33,452 | +26,489 | 57.1 / 1.7 | 73.4 / 11.0 | 3.14 | +9,495 | +13,064 | 52.2 / 0.0 | 50.8 / 3.4 | +262 |
| `full_n2_any_x1.0` | 5.12 | +25,889 | +35,641 | 49.6 / 14.3 | 58.7 / 26.6 | 4.55 | +13,015 | +10,080 | 62.3 / 7.2 | 61.0 / 13.6 | -8,020 |
| `full_n2_any_x0.5` | 5.12 | +25,395 | +28,376 | 54.6 / 10.9 | 66.1 / 24.8 | 4.55 | +12,467 | +12,781 | 58.0 / 4.3 | 62.7 / 10.2 | -9,427 |
| `full_n2_any_x0.25` | 5.12 | +25,134 | +21,900 | 54.6 / 7.6 | 66.1 / 21.1 | 4.55 | +12,662 | +9,830 | 58.0 / 4.3 | 57.6 / 10.2 | -9,895 |
| `full_n2_after_win_x1.0` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +10,322 | +2,093 | 56.5 / 1.4 | 59.3 / 11.9 | -10,550 |
| `full_n2_after_win_x0.5` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +9,891 | +4,569 | 55.1 / 1.4 | 59.3 / 11.9 | -11,470 |
| `full_n2_after_win_x0.25` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +9,891 | +4,569 | 55.1 / 1.4 | 59.3 / 11.9 | -12,116 |
| `full_n2_after_loss_x1.0` | 4.38 | +27,184 | +22,324 | 54.6 / 9.2 | 65.1 / 23.9 | 3.97 | +11,201 | +6,219 | 56.5 / 7.2 | 55.9 / 15.3 | -8,864 |
| `full_n2_after_loss_x0.5` | 4.38 | +27,084 | +22,638 | 54.6 / 7.6 | 67.0 / 21.1 | 3.97 | +11,534 | +4,078 | 56.5 / 4.3 | 55.9 / 10.2 | -10,757 |
| `full_n2_after_loss_x0.25` | 4.38 | +27,156 | +22,317 | 54.6 / 6.7 | 67.0 / 21.1 | 3.97 | +11,568 | +7,663 | 56.5 / 5.8 | 55.9 / 10.2 | -11,430 |
| `full_n2_after_stop_x1.0` | 3.95 | +27,232 | +32,368 | 54.6 / 0.0 | 66.1 / 11.9 | 3.91 | +11,379 | +6,981 | 58.0 / 7.2 | 55.9 / 15.3 | -13,535 |
| `full_n2_after_stop_x0.5` | 3.95 | +27,385 | +32,454 | 54.6 / 0.0 | 66.1 / 11.9 | 3.91 | +11,623 | +7,296 | 56.5 / 4.3 | 55.9 / 10.2 | -12,991 |
| `full_n2_after_stop_x0.25` | 3.95 | +27,462 | +32,453 | 54.6 / 0.0 | 66.1 / 11.9 | 3.91 | +11,656 | +7,655 | 56.5 / 5.8 | 55.9 / 10.2 | -12,446 |
| `full_n2_after_be_x1.0` | 4.41 | +26,164 | +21,107 | 48.7 / 3.4 | 59.6 / 20.2 | 3.59 | +10,628 | +1,641 | 59.4 / 1.4 | 61.0 / 6.8 | -13,715 |
| `full_n2_after_be_x0.5` | 4.41 | +25,769 | +18,068 | 54.6 / 1.7 | 66.1 / 17.4 | 3.59 | +10,178 | +1,811 | 56.5 / 1.4 | 55.9 / 8.5 | -12,609 |
| `full_n2_after_be_x0.25` | 4.41 | +25,436 | +23,054 | 54.6 / 0.0 | 66.1 / 17.4 | 3.59 | +10,340 | +2,282 | 56.5 / 1.4 | 55.9 / 11.9 | -12,123 |
| `full_n2_after_scratch_x1.0` | 4.84 | +27,187 | +35,811 | 49.6 / 14.3 | 58.7 / 26.6 | 3.65 | +10,450 | +1,568 | 56.5 / 2.9 | 61.0 / 10.2 | -9,044 |
| `full_n2_after_scratch_x0.5` | 4.84 | +26,004 | +28,549 | 54.6 / 10.9 | 67.0 / 24.8 | 3.65 | +10,090 | +1,819 | 56.5 / 1.4 | 57.6 / 10.2 | -10,375 |
| `full_n2_after_scratch_x0.25` | 4.84 | +25,130 | +21,986 | 54.6 / 7.6 | 67.0 / 21.1 | 3.65 | +10,251 | +2,290 | 55.1 / 1.4 | 57.6 / 11.9 | -11,107 |
| `full_n2_after_nonstop_x1.0` | 4.88 | +27,188 | +35,812 | 49.6 / 14.3 | 58.7 / 26.6 | 3.85 | +11,204 | +2,319 | 59.4 / 2.9 | 61.0 / 10.2 | -6,706 |
| `full_n2_after_nonstop_x0.5` | 4.88 | +26,005 | +28,549 | 54.6 / 10.9 | 67.0 / 24.8 | 3.85 | +10,412 | +2,141 | 56.5 / 1.4 | 57.6 / 10.2 | -8,957 |
| `full_n2_after_nonstop_x0.25` | 4.88 | +25,131 | +21,986 | 54.6 / 7.6 | 67.0 / 21.1 | 3.85 | +10,574 | +2,612 | 56.5 / 1.4 | 57.6 / 11.9 | -10,336 |
| `full_n2_same_x1.0` | 4.84 | +31,794 | +37,869 | 52.1 / 9.2 | 65.1 / 23.9 | 4.23 | +11,405 | +8,581 | 58.0 / 10.1 | 57.6 / 25.4 | -8,407 |
| `full_n2_same_x0.5` | 4.84 | +28,441 | +26,980 | 54.6 / 7.6 | 68.8 / 21.1 | 4.23 | +12,060 | +6,197 | 58.0 / 8.7 | 57.6 / 15.3 | -9,792 |
| `full_n2_same_x0.25` | 4.84 | +26,968 | +25,155 | 54.6 / 6.7 | 66.1 / 21.1 | 4.23 | +12,314 | +6,570 | 58.0 / 7.2 | 57.6 / 16.9 | -10,110 |
| `full_n2_opp_x1.0` | 4.22 | +25,583 | +22,913 | 53.8 / 2.5 | 65.1 / 21.1 | 3.78 | +10,347 | +3,458 | 58.0 / 4.3 | 61.0 / 10.2 | -15,480 |
| `full_n2_opp_x0.5` | 4.22 | +26,354 | +22,728 | 54.6 / 0.8 | 66.1 / 18.3 | 3.78 | +9,745 | -865 | 53.6 / 1.4 | 55.9 / 8.5 | -14,142 |
| `full_n2_opp_x0.25` | 4.22 | +26,597 | +23,152 | 54.6 / 0.8 | 66.1 / 18.3 | 3.78 | +10,014 | -87 | 53.6 / 1.4 | 55.9 / 10.2 | -13,738 |
| `full_n2_flip_stop_x1.0` | 3.87 | +27,427 | +29,090 | 54.6 / 0.8 | 66.1 / 12.8 | 3.4 | +9,511 | +3,072 | 55.1 / 8.7 | 59.3 / 15.3 | -12,235 |
| `full_n2_flip_stop_x0.5` | 3.87 | +27,408 | +29,089 | 54.6 / 0.8 | 66.1 / 12.8 | 3.4 | +9,576 | +4,521 | 53.6 / 1.4 | 59.3 / 11.9 | -12,799 |
| `full_n2_flip_stop_x0.25` | 3.87 | +27,398 | +29,089 | 54.6 / 0.8 | 66.1 / 12.8 | 3.4 | +9,683 | +4,521 | 53.6 / 1.4 | 59.3 / 11.9 | -12,996 |
| `full_n2_reenter_stop_x1.0` | 4.3 | +27,393 | +23,060 | 56.3 / 9.2 | 67.0 / 23.9 | 3.97 | +10,467 | +7,217 | 55.1 / 8.7 | 55.9 / 25.4 | -11,949 |
| `full_n2_reenter_stop_x0.5` | 4.3 | +27,312 | +23,375 | 54.6 / 7.6 | 67.0 / 21.1 | 3.97 | +11,065 | +5,345 | 56.5 / 4.3 | 55.9 / 11.9 | -12,093 |
| `full_n2_reenter_stop_x0.25` | 4.3 | +27,394 | +23,054 | 54.6 / 6.7 | 67.0 / 21.1 | 3.97 | +11,185 | +6,088 | 56.5 / 7.2 | 55.9 / 16.9 | -12,208 |
| `full_n2_cont_win_x1.0` | 3.75 | +27,226 | +32,423 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +9,996 | +4,458 | 56.5 / 1.4 | 59.3 / 11.9 | -9,340 |
| `full_n2_cont_win_x0.5` | 3.75 | +27,342 | +32,423 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +9,782 | +4,458 | 55.1 / 1.4 | 59.3 / 11.9 | -10,889 |
| `full_n2_cont_win_x0.25` | 3.75 | +27,342 | +32,423 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +9,782 | +4,458 | 55.1 / 1.4 | 59.3 / 11.9 | -11,724 |
| `full_n2_cool30_x1.0` | 5.08 | +26,133 | +35,825 | 49.6 / 14.3 | 58.7 / 26.6 | 4.49 | +11,722 | +7,724 | 58.0 / 8.7 | 55.9 / 15.3 | -6,179 |
| `full_n2_cool30_x0.5` | 5.08 | +25,516 | +28,622 | 54.6 / 10.9 | 66.1 / 24.8 | 4.49 | +11,983 | +11,228 | 58.0 / 1.4 | 57.6 / 8.5 | -8,305 |
| `full_n2_cool30_x0.25` | 5.08 | +25,195 | +22,023 | 54.6 / 7.6 | 66.1 / 21.1 | 4.49 | +12,236 | +9,128 | 58.0 / 1.4 | 57.6 / 6.8 | -9,544 |
| `full_n2_cool60_x1.0` | 5.0 | +26,387 | +30,949 | 49.6 / 14.3 | 58.7 / 26.6 | 4.49 | +11,746 | +9,269 | 59.4 / 8.7 | 55.9 / 15.3 | -8,437 |
| `full_n2_cool60_x0.5` | 5.0 | +25,770 | +28,946 | 54.6 / 10.9 | 66.1 / 24.8 | 4.49 | +12,047 | +3,424 | 58.0 / 1.4 | 57.6 / 6.8 | -9,423 |
| `full_n2_cool60_x0.25` | 5.0 | +25,448 | +22,259 | 54.6 / 7.6 | 66.1 / 21.1 | 4.49 | +12,299 | +6,974 | 58.0 / 1.4 | 57.6 / 5.1 | -9,966 |
| `full_n2_cool120_x1.0` | 4.8 | +22,742 | +25,358 | 48.7 / 12.6 | 59.6 / 25.7 | 4.29 | +10,840 | +11,253 | 58.0 / 13.0 | 55.9 / 18.6 | -8,271 |
| `full_n2_cool120_x0.5` | 4.8 | +24,102 | +28,129 | 54.6 / 6.7 | 66.1 / 22.9 | 4.29 | +10,907 | +7,748 | 56.5 / 13.0 | 59.3 / 18.6 | -9,765 |
| `full_n2_cool120_x0.25` | 4.8 | +24,739 | +18,179 | 54.6 / 1.7 | 66.1 / 21.1 | 4.29 | +11,130 | +8,460 | 56.5 / 11.6 | 59.3 / 16.9 | -10,646 |
| `full_n2_rstop_m05_x1.0` | 4.61 | +27,969 | +27,713 | 49.6 / 5.0 | 60.6 / 22.0 | 3.85 | +11,204 | +2,319 | 59.4 / 2.9 | 61.0 / 10.2 | -6,706 |
| `full_n2_rstop_m05_x0.5` | 4.61 | +26,602 | +29,228 | 54.6 / 3.4 | 67.0 / 19.3 | 3.85 | +10,412 | +2,141 | 56.5 / 1.4 | 57.6 / 10.2 | -8,957 |
| `full_n2_rstop_m05_x0.25` | 4.61 | +25,730 | +19,314 | 54.6 / 0.0 | 67.0 / 17.4 | 3.85 | +10,574 | +2,612 | 56.5 / 1.4 | 57.6 / 11.9 | -10,336 |
| `full_n2_rstop_0_x1.0` | 4.45 | +26,164 | +21,107 | 48.7 / 3.4 | 59.6 / 20.2 | 3.78 | +11,382 | +2,392 | 60.9 / 1.4 | 62.7 / 6.8 | -11,377 |
| `full_n2_rstop_0_x0.5` | 4.45 | +25,770 | +18,068 | 54.6 / 1.7 | 66.1 / 17.4 | 3.78 | +10,501 | +2,133 | 56.5 / 1.4 | 57.6 / 8.5 | -11,191 |
| `full_n2_rstop_0_x0.25` | 4.45 | +25,436 | +23,054 | 54.6 / 0.0 | 66.1 / 17.4 | 3.78 | +10,663 | +2,603 | 56.5 / 1.4 | 55.9 / 11.9 | -11,351 |
| `full_n2_rtake_1_x1.0` | 5.08 | +25,889 | +35,641 | 49.6 / 14.3 | 58.7 / 26.6 | 4.36 | +12,261 | +3,846 | 60.9 / 7.2 | 61.0 / 15.3 | -10,359 |
| `full_n2_rtake_1_x0.5` | 5.08 | +25,394 | +28,376 | 54.6 / 10.9 | 66.1 / 24.8 | 4.36 | +12,144 | +12,673 | 58.0 / 4.3 | 62.7 / 10.2 | -10,845 |
| `full_n2_rtake_1_x0.25` | 5.08 | +25,133 | +21,900 | 54.6 / 7.6 | 66.1 / 21.1 | 4.36 | +12,339 | +9,509 | 58.0 / 4.3 | 57.6 / 10.2 | -10,667 |
| `full_n2_rstop_m05_rtake_1_x1.0` | 4.57 | +27,968 | +27,713 | 49.6 / 5.0 | 60.6 / 22.0 | 3.65 | +10,450 | +1,568 | 56.5 / 2.9 | 61.0 / 10.2 | -9,044 |
| `full_n2_rstop_m05_rtake_1_x0.5` | 4.57 | +26,602 | +29,228 | 54.6 / 3.4 | 67.0 / 19.3 | 3.65 | +10,090 | +1,819 | 56.5 / 1.4 | 57.6 / 10.2 | -10,375 |
| `full_n2_rstop_m05_rtake_1_x0.25` | 4.57 | +25,729 | +19,314 | 54.6 / 0.0 | 67.0 / 17.4 | 3.65 | +10,251 | +2,290 | 55.1 / 1.4 | 57.6 / 11.9 | -11,107 |
| `full_n2_new_level_x1.0` | 4.41 | +28,776 | +23,648 | 54.6 / 6.7 | 66.1 / 21.1 | 4.1 | +12,461 | +11,517 | 62.3 / 2.9 | 62.7 / 6.8 | -16,897 |
| `full_n2_new_level_x0.5` | 4.41 | +27,988 | +22,692 | 54.6 / 9.2 | 66.1 / 20.2 | 4.1 | +11,686 | +6,750 | 56.5 / 1.4 | 57.6 / 5.1 | -15,392 |
| `full_n2_new_level_x0.25` | 4.41 | +27,359 | +23,172 | 54.6 / 6.7 | 66.1 / 21.1 | 4.1 | +11,847 | +10,039 | 56.5 / 1.4 | 57.6 / 5.1 | -14,884 |
| `full_n2_q_disp12_x1.0` | 4.34 | +24,145 | +33,926 | 49.6 / 0.0 | 61.5 / 14.7 | 3.78 | +10,937 | +10,478 | 56.5 / 8.7 | 64.4 / 15.3 | -14,588 |
| `full_n2_q_disp12_x0.5` | 4.34 | +24,825 | +38,633 | 56.3 / 0.0 | 68.8 / 14.7 | 3.78 | +10,551 | +7,939 | 56.5 / 7.2 | 59.3 / 16.9 | -12,673 |
| `full_n2_q_disp12_x0.25` | 4.34 | +25,038 | +39,004 | 56.3 / 0.0 | 68.8 / 14.7 | 3.78 | +10,551 | +7,364 | 55.1 / 5.8 | 59.3 / 16.9 | -11,437 |
| `full_n2_q_depth1_x1.0` | 5.08 | +26,722 | +38,294 | 49.6 / 13.4 | 58.7 / 25.7 | 4.55 | +13,038 | +11,624 | 63.8 / 7.2 | 62.7 / 13.6 | -8,403 |
| `full_n2_q_depth1_x0.5` | 5.08 | +25,789 | +28,266 | 54.6 / 10.9 | 66.1 / 24.8 | 4.55 | +12,530 | +7,467 | 58.0 / 4.3 | 62.7 / 8.5 | -9,690 |
| `full_n2_q_depth1_x0.25` | 5.08 | +25,302 | +25,450 | 54.6 / 6.7 | 66.1 / 21.1 | 4.55 | +12,726 | +8,535 | 58.0 / 4.3 | 57.6 / 8.5 | -9,980 |
| `full_n2_q_idm2_x1.0` | 4.84 | +27,575 | +14,111 | 49.6 / 7.6 | 59.6 / 22.0 | 4.29 | +12,758 | +12,244 | 62.3 / 7.2 | 61.0 / 13.6 | -1,909 |
| `full_n2_q_idm2_x0.5` | 4.84 | +26,407 | +22,269 | 54.6 / 9.2 | 66.1 / 20.2 | 4.29 | +11,741 | +12,652 | 58.0 / 1.4 | 62.7 / 6.8 | -6,800 |
| `full_n2_q_idm2_x0.25` | 4.84 | +25,949 | +25,705 | 54.6 / 6.7 | 66.1 / 21.1 | 4.29 | +11,741 | +9,306 | 58.0 / 1.4 | 57.6 / 6.8 | -9,319 |
| `full_n3_any_x1.0` | 5.51 | +25,663 | +25,767 | 51.3 / 16.0 | 60.6 / 29.4 | 4.94 | +12,304 | +15,243 | 60.9 / 10.1 | 59.3 / 18.6 | -7,916 |
| `full_n3_any_x0.5` | 5.51 | +25,467 | +35,013 | 50.4 / 10.9 | 62.4 / 22.9 | 4.94 | +11,964 | +10,932 | 58.0 / 5.8 | 61.0 / 11.9 | -8,977 |
| `full_n3_any_x0.25` | 5.51 | +25,205 | +30,005 | 56.3 / 10.9 | 68.8 / 21.1 | 4.94 | +12,244 | +10,568 | 58.0 / 7.2 | 57.6 / 13.6 | -9,494 |
| `full_n3_after_win_x1.0` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +10,322 | +2,093 | 56.5 / 1.4 | 59.3 / 11.9 | -10,548 |
| `full_n3_after_win_x0.5` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +9,891 | +4,569 | 55.1 / 1.4 | 59.3 / 11.9 | -11,469 |
| `full_n3_after_win_x0.25` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.4 | +9,891 | +4,569 | 55.1 / 1.4 | 59.3 / 11.9 | -12,116 |
| `full_n3_after_loss_x1.0` | 4.53 | +26,992 | +22,970 | 56.3 / 11.8 | 67.0 / 21.1 | 4.17 | +10,907 | +10,060 | 56.5 / 10.1 | 55.9 / 25.4 | -9,488 |
| `full_n3_after_loss_x0.5` | 4.53 | +27,050 | +22,662 | 54.6 / 10.9 | 67.0 / 21.1 | 4.17 | +11,240 | +6,661 | 55.1 / 10.1 | 55.9 / 15.3 | -11,076 |
| `full_n3_after_loss_x0.25` | 4.53 | +27,122 | +22,896 | 54.6 / 8.4 | 67.0 / 21.1 | 4.17 | +11,274 | +7,465 | 56.5 / 10.1 | 55.9 / 15.3 | -11,671 |
| `full_n3_after_scratch_x1.0` | 5.0 | +27,323 | +19,686 | 51.3 / 14.3 | 60.6 / 24.8 | 3.65 | +10,450 | +1,568 | 56.5 / 2.9 | 61.0 / 10.2 | -9,412 |
| `full_n3_after_scratch_x0.5` | 5.0 | +26,196 | +22,473 | 54.6 / 7.6 | 67.0 / 22.9 | 3.65 | +10,090 | +1,819 | 56.5 / 1.4 | 57.6 / 10.2 | -10,700 |
| `full_n3_after_scratch_x0.25` | 5.0 | +25,321 | +23,483 | 54.6 / 7.6 | 67.0 / 21.1 | 3.65 | +10,251 | +2,290 | 55.1 / 1.4 | 57.6 / 11.9 | -11,432 |
| `full_n3_after_nonstop_x1.0` | 5.04 | +27,324 | +19,686 | 51.3 / 14.3 | 60.6 / 24.8 | 3.91 | +11,208 | +2,319 | 59.4 / 2.9 | 61.0 / 10.2 | -7,071 |
| `full_n3_after_nonstop_x0.5` | 5.04 | +26,196 | +22,473 | 54.6 / 7.6 | 67.0 / 22.9 | 3.91 | +10,414 | +2,141 | 56.5 / 1.4 | 57.6 / 10.2 | -9,280 |
| `full_n3_after_nonstop_x0.25` | 5.04 | +25,321 | +23,483 | 54.6 / 7.6 | 67.0 / 21.1 | 3.91 | +10,575 | +2,612 | 56.5 / 1.4 | 57.6 / 11.9 | -10,659 |
| `full_n3_cool60_x1.0` | 5.27 | +26,442 | +30,864 | 51.3 / 15.1 | 60.6 / 26.6 | 4.74 | +11,242 | +6,217 | 59.4 / 13.0 | 55.9 / 22.0 | -6,931 |
| `full_n3_cool60_x0.5` | 5.27 | +25,820 | +31,622 | 54.6 / 12.6 | 66.1 / 24.8 | 4.74 | +11,712 | +3,765 | 56.5 / 8.7 | 57.6 / 13.6 | -8,141 |
| `full_n3_cool60_x0.25` | 5.27 | +25,496 | +23,389 | 54.6 / 8.4 | 66.1 / 21.1 | 4.74 | +12,050 | +6,198 | 58.0 / 8.7 | 57.6 / 13.6 | -9,041 |
| `full_n3_rstop_m05_x1.0` | 4.69 | +27,973 | +27,714 | 49.6 / 5.0 | 60.6 / 22.0 | 3.91 | +11,208 | +2,319 | 59.4 / 2.9 | 61.0 / 10.2 | -7,071 |
| `full_n3_rstop_m05_x0.5` | 4.69 | +26,605 | +29,229 | 54.6 / 3.4 | 67.0 / 19.3 | 3.91 | +10,414 | +2,141 | 56.5 / 1.4 | 57.6 / 10.2 | -9,280 |
| `full_n3_rstop_m05_x0.25` | 4.69 | +25,731 | +19,315 | 54.6 / 0.0 | 67.0 / 17.4 | 3.91 | +10,575 | +2,612 | 56.5 / 1.4 | 57.6 / 11.9 | -10,659 |
| `full_n3_new_level_x1.0` | 4.53 | +28,954 | +16,856 | 55.5 / 6.7 | 67.0 / 21.1 | 4.23 | +12,336 | +11,566 | 62.3 / 2.9 | 62.7 / 6.8 | -16,553 |
| `full_n3_new_level_x0.5` | 4.53 | +28,166 | +29,487 | 56.3 / 9.2 | 68.8 / 20.2 | 4.23 | +11,558 | +6,625 | 56.5 / 2.9 | 57.6 / 6.8 | -15,252 |
| `full_n3_new_level_x0.25` | 4.53 | +27,537 | +29,664 | 56.3 / 6.7 | 68.8 / 21.1 | 4.23 | +11,718 | +9,340 | 56.5 / 2.9 | 57.6 / 6.8 | -14,915 |
| `24h_n2_any_x1.0` | 5.12 | +25,889 | +35,641 | 49.6 / 14.3 | 58.7 / 26.6 | 4.68 | +13,016 | +10,130 | 62.3 / 7.2 | 61.0 / 13.6 | -7,711 |
| `24h_n2_any_x0.5` | 5.12 | +25,395 | +28,376 | 54.6 / 10.9 | 66.1 / 24.8 | 4.68 | +12,468 | +12,591 | 58.0 / 4.3 | 62.7 / 10.2 | -9,469 |
| `24h_n2_any_x0.25` | 5.12 | +25,134 | +21,900 | 54.6 / 7.6 | 66.1 / 21.1 | 4.68 | +12,663 | +9,455 | 58.0 / 4.3 | 57.6 / 10.2 | -9,922 |
| `24h_n2_after_win_x1.0` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +10,376 | +4,228 | 56.5 / 1.4 | 59.3 / 15.3 | -10,224 |
| `24h_n2_after_win_x0.5` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +9,945 | +4,011 | 55.1 / 1.4 | 59.3 / 15.3 | -11,512 |
| `24h_n2_after_win_x0.25` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +9,945 | +4,011 | 55.1 / 1.4 | 59.3 / 15.3 | -12,158 |
| `24h_n2_after_loss_x1.0` | 4.38 | +27,184 | +22,324 | 54.6 / 9.2 | 65.1 / 23.9 | 4.1 | +11,202 | +5,844 | 56.5 / 7.2 | 55.9 / 15.3 | -9,086 |
| `24h_n2_after_loss_x0.5` | 4.38 | +27,084 | +22,638 | 54.6 / 7.6 | 67.0 / 21.1 | 4.1 | +11,535 | +4,111 | 56.5 / 4.3 | 55.9 / 10.2 | -10,967 |
| `24h_n2_after_loss_x0.25` | 4.38 | +27,156 | +22,317 | 54.6 / 6.7 | 67.0 / 21.1 | 4.1 | +11,569 | +7,288 | 56.5 / 5.8 | 55.9 / 10.2 | -11,629 |
| `24h_n2_after_scratch_x1.0` | 4.84 | +27,187 | +35,811 | 49.6 / 14.3 | 58.7 / 26.6 | 3.72 | +10,505 | +971 | 56.5 / 2.9 | 61.0 / 13.6 | -9,230 |
| `24h_n2_after_scratch_x0.5` | 4.84 | +26,004 | +28,549 | 54.6 / 10.9 | 67.0 / 24.8 | 3.72 | +10,144 | +418 | 56.5 / 1.4 | 57.6 / 13.6 | -10,557 |
| `24h_n2_after_scratch_x0.25` | 4.84 | +25,130 | +21,986 | 54.6 / 7.6 | 67.0 / 21.1 | 3.72 | +10,305 | +3,457 | 55.1 / 1.4 | 57.6 / 15.3 | -11,286 |
| `24h_n2_after_nonstop_x1.0` | 4.88 | +27,188 | +35,812 | 49.6 / 14.3 | 58.7 / 26.6 | 3.91 | +11,258 | +1,780 | 59.4 / 2.9 | 61.0 / 13.6 | -6,370 |
| `24h_n2_after_nonstop_x0.5` | 4.88 | +26,005 | +28,549 | 54.6 / 10.9 | 67.0 / 24.8 | 3.91 | +10,466 | +1,602 | 56.5 / 1.4 | 57.6 / 13.6 | -8,985 |
| `24h_n2_after_nonstop_x0.25` | 4.88 | +25,131 | +21,986 | 54.6 / 7.6 | 67.0 / 21.1 | 3.91 | +10,628 | +5,595 | 56.5 / 1.4 | 57.6 / 15.3 | -10,360 |
| `24h_n2_same_x1.0` | 4.84 | +31,794 | +37,869 | 52.1 / 9.2 | 65.1 / 23.9 | 4.36 | +11,407 | +8,511 | 58.0 / 10.1 | 57.6 / 23.7 | -8,655 |
| `24h_n2_same_x0.5` | 4.84 | +28,441 | +26,980 | 54.6 / 7.6 | 68.8 / 21.1 | 4.36 | +12,061 | +6,007 | 58.0 / 8.7 | 57.6 / 13.6 | -10,012 |
| `24h_n2_same_x0.25` | 4.84 | +26,968 | +25,155 | 54.6 / 6.7 | 66.1 / 21.1 | 4.36 | +12,315 | +6,380 | 58.0 / 7.2 | 57.6 / 15.3 | -10,315 |
| `24h_n2_opp_x1.0` | 4.22 | +25,583 | +22,913 | 53.8 / 2.5 | 65.1 / 21.1 | 3.85 | +10,401 | +6,568 | 58.0 / 4.3 | 62.7 / 13.6 | -15,119 |
| `24h_n2_opp_x0.5` | 4.22 | +26,354 | +22,728 | 54.6 / 0.8 | 66.1 / 18.3 | 3.85 | +9,800 | -175 | 53.6 / 1.4 | 55.9 / 11.9 | -14,159 |
| `24h_n2_opp_x0.25` | 4.22 | +26,597 | +23,152 | 54.6 / 0.8 | 66.1 / 18.3 | 3.85 | +10,068 | +1,612 | 53.6 / 1.4 | 55.9 / 13.6 | -13,755 |
| `24h_n2_cool60_x1.0` | 5.0 | +26,387 | +30,949 | 49.6 / 14.3 | 58.7 / 26.6 | 4.62 | +11,747 | +9,198 | 59.4 / 8.7 | 55.9 / 15.3 | -8,128 |
| `24h_n2_cool60_x0.5` | 5.0 | +25,770 | +28,946 | 54.6 / 10.9 | 66.1 / 24.8 | 4.62 | +12,048 | +3,234 | 58.0 / 1.4 | 57.6 / 6.8 | -9,465 |
| `24h_n2_cool60_x0.25` | 5.0 | +25,448 | +22,259 | 54.6 / 7.6 | 66.1 / 21.1 | 4.62 | +12,300 | +6,783 | 58.0 / 1.4 | 57.6 / 5.1 | -9,993 |
| `24h_n2_rstop_m05_x1.0` | 4.61 | +27,969 | +27,713 | 49.6 / 5.0 | 60.6 / 22.0 | 3.91 | +11,258 | +1,780 | 59.4 / 2.9 | 61.0 / 13.6 | -6,370 |
| `24h_n2_rstop_m05_x0.5` | 4.61 | +26,602 | +29,228 | 54.6 / 3.4 | 67.0 / 19.3 | 3.91 | +10,466 | +1,602 | 56.5 / 1.4 | 57.6 / 13.6 | -8,985 |
| `24h_n2_rstop_m05_x0.25` | 4.61 | +25,730 | +19,314 | 54.6 / 0.0 | 67.0 / 17.4 | 3.91 | +10,628 | +5,595 | 56.5 / 1.4 | 57.6 / 15.3 | -10,360 |
| `24h_n2_new_level_x1.0` | 4.41 | +28,776 | +23,648 | 54.6 / 6.7 | 66.1 / 21.1 | 4.17 | +12,515 | +11,483 | 62.3 / 2.9 | 62.7 / 6.8 | -16,536 |
| `24h_n2_new_level_x0.5` | 4.41 | +27,988 | +22,692 | 54.6 / 9.2 | 66.1 / 20.2 | 4.17 | +11,740 | +6,716 | 56.5 / 1.4 | 57.6 / 5.1 | -15,410 |
| `24h_n2_new_level_x0.25` | 4.41 | +27,359 | +23,172 | 54.6 / 6.7 | 66.1 / 21.1 | 4.17 | +11,901 | +10,005 | 56.5 / 1.4 | 57.6 / 5.1 | -14,902 |
| `24h_n3_any_x1.0` | 5.51 | +25,663 | +25,767 | 51.3 / 16.0 | 60.6 / 29.4 | 5.06 | +12,305 | +15,172 | 60.9 / 10.1 | 59.3 / 18.6 | -7,606 |
| `24h_n3_any_x0.5` | 5.51 | +25,467 | +35,013 | 50.4 / 10.9 | 62.4 / 22.9 | 5.06 | +11,965 | +10,844 | 58.0 / 5.8 | 61.0 / 11.9 | -9,018 |
| `24h_n3_any_x0.25` | 5.51 | +25,205 | +30,005 | 56.3 / 10.9 | 68.8 / 21.1 | 5.06 | +12,245 | +10,378 | 58.0 / 7.2 | 57.6 / 13.6 | -9,521 |
| `24h_n3_after_win_x1.0` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +10,376 | +4,228 | 56.5 / 1.4 | 59.3 / 15.3 | -10,223 |
| `24h_n3_after_win_x0.5` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +9,945 | +4,011 | 55.1 / 1.4 | 59.3 / 15.3 | -11,511 |
| `24h_n3_after_win_x0.25` | 3.75 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.46 | +9,945 | +4,011 | 55.1 / 1.4 | 59.3 / 15.3 | -12,158 |
| `24h_n3_after_loss_x1.0` | 4.53 | +26,992 | +22,970 | 56.3 / 11.8 | 67.0 / 21.1 | 4.29 | +10,909 | +10,092 | 56.5 / 10.1 | 55.9 / 25.4 | -9,710 |
| `24h_n3_after_loss_x0.5` | 4.53 | +27,050 | +22,662 | 54.6 / 10.9 | 67.0 / 21.1 | 4.29 | +11,241 | +6,286 | 55.1 / 10.1 | 55.9 / 15.3 | -11,286 |
| `24h_n3_after_loss_x0.25` | 4.53 | +27,122 | +22,896 | 54.6 / 8.4 | 67.0 / 21.1 | 4.29 | +11,275 | +7,090 | 56.5 / 10.1 | 55.9 / 15.3 | -11,869 |
| `24h_n3_after_scratch_x1.0` | 5.0 | +27,323 | +19,686 | 51.3 / 14.3 | 60.6 / 24.8 | 3.72 | +10,505 | +971 | 56.5 / 2.9 | 61.0 / 13.6 | -9,598 |
| `24h_n3_after_scratch_x0.5` | 5.0 | +26,196 | +22,473 | 54.6 / 7.6 | 67.0 / 22.9 | 3.72 | +10,144 | +418 | 56.5 / 1.4 | 57.6 / 13.6 | -10,881 |
| `24h_n3_after_scratch_x0.25` | 5.0 | +25,321 | +23,483 | 54.6 / 7.6 | 67.0 / 21.1 | 3.72 | +10,305 | +3,457 | 55.1 / 1.4 | 57.6 / 15.3 | -11,611 |
| `24h_n3_after_nonstop_x1.0` | 5.04 | +27,324 | +19,686 | 51.3 / 14.3 | 60.6 / 24.8 | 3.97 | +11,262 | +1,781 | 59.4 / 2.9 | 61.0 / 13.6 | -6,735 |
| `24h_n3_after_nonstop_x0.5` | 5.04 | +26,196 | +22,473 | 54.6 / 7.6 | 67.0 / 22.9 | 3.97 | +10,468 | +1,602 | 56.5 / 1.4 | 57.6 / 13.6 | -9,308 |
| `24h_n3_after_nonstop_x0.25` | 5.04 | +25,321 | +23,483 | 54.6 / 7.6 | 67.0 / 21.1 | 3.97 | +10,629 | +5,595 | 56.5 / 1.4 | 57.6 / 15.3 | -10,683 |
| `24h_n3_cool60_x1.0` | 5.27 | +26,442 | +30,864 | 51.3 / 15.1 | 60.6 / 26.6 | 4.87 | +11,243 | +6,146 | 59.4 / 13.0 | 55.9 / 22.0 | -6,622 |
| `24h_n3_cool60_x0.5` | 5.27 | +25,820 | +31,622 | 54.6 / 12.6 | 66.1 / 24.8 | 4.87 | +11,713 | +3,678 | 56.5 / 8.7 | 57.6 / 13.6 | -8,182 |
| `24h_n3_cool60_x0.25` | 5.27 | +25,496 | +23,389 | 54.6 / 8.4 | 66.1 / 21.1 | 4.87 | +12,051 | +6,007 | 58.0 / 8.7 | 57.6 / 13.6 | -9,068 |
| `24h_n3_rstop_m05_x1.0` | 4.69 | +27,973 | +27,714 | 49.6 / 5.0 | 60.6 / 22.0 | 3.97 | +11,262 | +1,781 | 59.4 / 2.9 | 61.0 / 13.6 | -6,735 |
| `24h_n3_rstop_m05_x0.5` | 4.69 | +26,605 | +29,229 | 54.6 / 3.4 | 67.0 / 19.3 | 3.97 | +10,468 | +1,602 | 56.5 / 1.4 | 57.6 / 13.6 | -9,308 |
| `24h_n3_rstop_m05_x0.25` | 4.69 | +25,731 | +19,315 | 54.6 / 0.0 | 67.0 / 17.4 | 3.97 | +10,629 | +5,595 | 56.5 / 1.4 | 57.6 / 15.3 | -10,683 |
| `24h_n3_new_level_x1.0` | 4.53 | +28,954 | +16,856 | 55.5 / 6.7 | 67.0 / 21.1 | 4.29 | +12,390 | +11,532 | 62.3 / 2.9 | 62.7 / 6.8 | -16,192 |
| `24h_n3_new_level_x0.5` | 4.53 | +28,166 | +29,487 | 56.3 / 9.2 | 68.8 / 20.2 | 4.29 | +11,612 | +6,591 | 56.5 / 2.9 | 57.6 / 6.8 | -15,269 |
| `24h_n3_new_level_x0.25` | 4.53 | +27,537 | +29,664 | 56.3 / 6.7 | 68.8 / 21.1 | 4.29 | +11,773 | +9,306 | 56.5 / 2.9 | 57.6 / 6.8 | -14,933 |
| `full_n2_any_x1.0_asia_x0.5` | 5.12 | +27,954 | +29,191 | 56.3 / 9.2 | 67.0 / 23.9 | 4.55 | +10,653 | +14,033 | 40.6 / 4.3 | 47.5 / 8.5 | -3,676 |
| `full_n2_any_x0.5_asia_x0.5` | 5.12 | +27,463 | +30,261 | 54.6 / 8.4 | 65.1 / 22.0 | 4.55 | +9,823 | +10,770 | 24.6 / 4.3 | 50.8 / 8.5 | -3,438 |
| `full_n2_after_win_x1.0_asia_x0.5` | 3.75 | +29,347 | +32,806 | 54.6 / 0.0 | 67.0 / 3.7 | 3.4 | +7,976 | +5,360 | 24.6 / 0.0 | 37.3 / 6.8 | -1,340 |
| `full_n2_after_win_x0.5_asia_x0.5` | 3.75 | +29,347 | +32,806 | 54.6 / 0.0 | 67.0 / 3.7 | 3.4 | +7,545 | +4,896 | 24.6 / 0.0 | 37.3 / 6.8 | -2,260 |
| `full_n2_after_nonstop_x1.0_asia_x0.5` | 4.88 | +29,333 | +29,535 | 58.8 / 9.2 | 70.6 / 23.9 | 3.85 | +8,947 | +5,319 | 39.1 / 0.0 | 50.8 / 5.1 | -519 |
| `full_n2_after_nonstop_x0.5_asia_x0.5` | 4.88 | +28,153 | +30,433 | 54.6 / 8.4 | 65.1 / 22.0 | 3.85 | +8,066 | +5,022 | 24.6 / 0.0 | 52.5 / 5.1 | -1,549 |
| `full_n2_after_scratch_x1.0_asia_x0.5` | 4.84 | +29,333 | +29,535 | 58.8 / 9.2 | 70.6 / 23.9 | 3.65 | +8,193 | +2,559 | 39.1 / 0.0 | 45.8 / 5.1 | -2,633 |
| `full_n2_after_scratch_x0.5_asia_x0.5` | 4.84 | +28,153 | +30,433 | 54.6 / 8.4 | 65.1 / 22.0 | 3.65 | +7,743 | +4,943 | 24.6 / 0.0 | 50.8 / 5.1 | -2,742 |
| `full_n2_new_level_x1.0_asia_x0.5` | 4.41 | +30,847 | +26,938 | 54.6 / 0.8 | 67.0 / 20.2 | 4.1 | +10,315 | +16,926 | 43.5 / 1.4 | 50.8 / 5.1 | -9,814 |
| `full_n2_new_level_x0.5_asia_x0.5` | 4.41 | +30,059 | +26,083 | 54.6 / 0.0 | 67.0 / 19.3 | 4.1 | +9,339 | +7,795 | 24.6 / 0.0 | 44.1 / 3.4 | -7,330 |
| `full_n2_rstop_m05_x1.0_asia_x0.5` | 4.61 | +30,114 | +30,886 | 58.8 / 2.5 | 72.5 / 17.4 | 3.85 | +8,947 | +5,319 | 39.1 / 0.0 | 50.8 / 5.1 | -519 |
| `full_n2_rstop_m05_x0.5_asia_x0.5` | 4.61 | +28,751 | +34,716 | 54.6 / 1.7 | 67.0 / 12.8 | 3.85 | +8,066 | +5,022 | 24.6 / 0.0 | 52.5 / 5.1 | -1,549 |
| `live_1sess_x1.0` | 3.48 | +32,388 | +36,089 | 50.4 / 3.4 | 78.0 / 5.5 | 2.88 | +8,073 | +10,377 | 50.7 / 11.6 | 50.8 / 16.9 | -2,467 |
| `live_1sess_x0.5` | 3.48 | +32,128 | +36,438 | 57.1 / 3.4 | 74.3 / 7.3 | 2.88 | +8,477 | +11,081 | 50.7 / 4.3 | 50.8 / 5.1 | +147 |
| `live_1sess_x0.25` | 3.48 | +32,417 | +36,819 | 57.1 / 3.4 | 74.3 / 7.3 | 2.88 | +8,640 | +11,020 | 50.7 / 4.3 | 50.8 / 5.1 | +1,046 |
| `full_1sess_x1.0` | 5.0 | +27,321 | +30,132 | 50.4 / 12.6 | 61.5 / 30.3 | 4.29 | +12,165 | +962 | 62.3 / 5.8 | 66.1 / 6.8 | -14,257 |
| `full_1sess_x0.5` | 5.0 | +26,594 | +34,160 | 48.7 / 8.4 | 60.6 / 22.9 | 4.29 | +11,719 | +7,173 | 58.0 / 5.8 | 61.0 / 8.5 | -11,683 |
| `full_1sess_x0.25` | 5.0 | +26,274 | +24,961 | 54.6 / 2.5 | 67.0 / 21.1 | 4.29 | +12,000 | +10,456 | 58.0 / 5.8 | 61.0 / 11.9 | -10,788 |
| `live_n2_sal_x1.0` | 3.55 | +31,124 | +30,525 | 52.9 / 8.4 | 73.4 / 16.5 | 2.88 | +8,992 | +7,819 | 52.2 / 7.2 | 47.5 / 11.9 | -3,399 |
| `live_n2_sal_x0.5` | 3.55 | +32,389 | +33,368 | 57.1 / 5.9 | 73.4 / 14.7 | 2.88 | +9,269 | +9,717 | 52.2 / 0.0 | 47.5 / 0.0 | -1,138 |
| `full_n2_sal_x1.0` | 4.88 | +27,188 | +35,812 | 49.6 / 14.3 | 58.7 / 26.6 | 3.85 | +11,204 | +2,319 | 59.4 / 2.9 | 61.0 / 10.2 | -6,706 |
| `full_n2_sal_x0.5` | 4.88 | +26,005 | +28,549 | 54.6 / 10.9 | 67.0 / 24.8 | 3.85 | +10,412 | +2,141 | 56.5 / 1.4 | 57.6 / 10.2 | -8,957 |
| `full_kz_asia_disp1.0` | 3.48 | +31,831 | +30,908 | 58.8 / 0.0 | 70.6 / 7.3 | 3.01 | +6,734 | +3,655 | 44.9 / 2.9 | 40.7 / 20.3 | -19,097 |
| `full_n2_any_x0.5_kz_asia_disp1.0` | 4.57 | +31,452 | +26,020 | 58.8 / 7.6 | 72.5 / 16.5 | 4.1 | +11,462 | +10,532 | 46.4 / 0.0 | 54.2 / 5.1 | -16,570 |
| `full_kz_asia_disp1.2` | 3.36 | +36,636 | +30,212 | 58.8 / 1.7 | 76.1 / 5.5 | 2.69 | +5,180 | +5,548 | 26.1 / 0.0 | 16.9 / 3.4 | -4,012 |
| `full_n2_any_x0.5_kz_asia_disp1.2` | 4.18 | +35,084 | +34,832 | 58.8 / 5.9 | 75.2 / 10.1 | 3.46 | +7,732 | +5,006 | 24.6 / 4.3 | 18.6 / 5.1 | -10,245 |
| `full_kz_asia_depth0.75` | 3.67 | +27,898 | +27,823 | 56.3 / 0.0 | 66.1 / 15.6 | 3.21 | +7,101 | +6,679 | 50.7 / 5.8 | 54.2 / 20.3 | -5,377 |
| `full_n2_any_x0.5_kz_asia_depth0.75` | 5.08 | +25,888 | +31,655 | 56.3 / 11.8 | 66.1 / 25.7 | 4.55 | +9,962 | +10,472 | 53.6 / 8.7 | 57.6 / 18.6 | -1,800 |
| `full_kz_asia_depth1.0` | 3.67 | +27,890 | +27,822 | 56.3 / 0.0 | 66.1 / 15.6 | 3.14 | +9,349 | +2,530 | 52.2 / 0.0 | 64.4 / 13.6 | +7,315 |
| `full_n2_any_x0.5_kz_asia_depth1.0` | 5.08 | +25,880 | +31,655 | 56.3 / 11.8 | 66.1 / 25.7 | 4.42 | +11,880 | +6,437 | 55.1 / 2.9 | 71.2 / 10.2 | +8,373 |
| `full_kz_asia_idm2` | 3.48 | +34,527 | +20,459 | 53.8 / 5.0 | 67.9 / 11.9 | 2.88 | +12,101 | +7,380 | 59.4 / 0.0 | 67.8 / 0.0 | +6,216 |
| `full_n2_any_x0.5_kz_asia_idm2` | 4.41 | +33,769 | +38,512 | 53.8 / 10.9 | 68.8 / 18.3 | 3.85 | +14,013 | +9,904 | 59.4 / 4.3 | 74.6 / 5.1 | +6,217 |
| `full_kz_asia_rr2` | 3.71 | +27,459 | +32,540 | 54.6 / 0.0 | 66.1 / 11.9 | 3.21 | +9,568 | +4,458 | 55.1 / 1.4 | 59.3 / 11.9 | -12,892 |
| `full_n2_any_x0.5_kz_asia_rr2` | 5.12 | +25,395 | +28,376 | 54.6 / 10.9 | 66.1 / 24.8 | 4.55 | +12,467 | +12,781 | 58.0 / 4.3 | 62.7 / 10.2 | -9,431 |
| `full_kz_asia_stop40` | 3.4 | +23,672 | +30,595 | 50.4 / 1.7 | 65.1 / 7.3 | 3.01 | +8,641 | -440 | 55.1 / 2.9 | 61.0 / 10.2 | -11,521 |
| `full_n2_any_x0.5_kz_asia_stop40` | 4.69 | +22,236 | +7,669 | 50.4 / 2.5 | 60.6 / 17.4 | 4.1 | +11,130 | +9,135 | 63.8 / 4.3 | 67.8 / 5.1 | -7,616 |
| `24h_kz_out_disp0.6` | 4.02 | +16,979 | +7,388 | 51.3 / 0.8 | 62.4 / 9.2 | 3.65 | +10,814 | +7,946 | 68.1 / 0.0 | 67.8 / 10.2 | -28,463 |
| `live_n2_any_x0.5_kz_pm_disp0.6` | 4.22 | +30,031 | +31,768 | 57.1 / 8.4 | 73.4 / 13.8 | 3.33 | +10,205 | +11,106 | 50.7 / 5.8 | 54.2 / 6.8 | -5,072 |
| `live_kz_all_disp0.6` | 3.67 | +35,508 | +29,427 | 63.0 / 6.7 | 75.2 / 9.2 | 2.95 | +2,685 | +1,277 | 47.8 / 10.1 | 44.1 / 22.0 | -14,984 |
| `24h_kz_out_depth0.3` | 3.79 | +27,131 | +29,767 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +8,160 | +4,033 | 52.2 / 1.4 | 54.2 / 16.9 | -10,863 |
| `live_n2_any_x0.5_kz_pm_depth0.3` | 3.91 | +30,740 | +33,391 | 57.1 / 6.7 | 73.4 / 12.8 | 3.14 | +10,408 | +15,355 | 50.7 / 4.3 | 50.8 / 6.8 | -1,993 |
| `live_kz_all_depth0.3` | 3.16 | +33,892 | +34,235 | 57.1 / 5.9 | 74.3 / 11.9 | 2.56 | +8,876 | +8,514 | 43.5 / 0.0 | 39.0 / 0.0 | -125 |
| `24h_kz_out_noidm` | 3.98 | +27,382 | +16,052 | 50.4 / 0.0 | 59.6 / 1.8 | 3.59 | +10,716 | +5,160 | 50.7 / 2.9 | 59.3 / 16.9 | -23,195 |
| `live_n2_any_x0.5_kz_pm_noidm` | 4.02 | +30,766 | +33,814 | 57.1 / 7.6 | 73.4 / 13.8 | 3.33 | +10,428 | +7,725 | 52.2 / 5.8 | 52.5 / 8.5 | -881 |
| `live_kz_all_noidm` | 3.48 | +29,326 | +24,195 | 47.9 / 6.7 | 59.6 / 25.7 | 3.14 | +7,353 | +2,407 | 49.3 / 4.3 | 42.4 / 20.3 | +1,279 |
| `24h_kz_out_wait12` | 3.75 | +21,334 | +18,900 | 47.1 / 0.0 | 57.8 / 14.7 | 3.33 | +9,883 | +974 | 55.1 / 1.4 | 55.9 / 15.3 | -15,189 |
| `live_n2_any_x0.5_kz_pm_wait12` | 3.87 | +30,523 | +33,333 | 57.1 / 7.6 | 73.4 / 13.8 | 3.14 | +10,408 | +15,355 | 50.7 / 4.3 | 50.8 / 6.8 | -2,303 |
| `live_kz_all_wait12` | 3.2 | +33,887 | +34,115 | 57.1 / 6.7 | 71.6 / 12.8 | 2.63 | +9,356 | +9,265 | 52.2 / 0.0 | 50.8 / 0.0 | -7,576 |
| `24h_kz_out_cisd30` | 3.75 | +20,408 | +27,611 | 47.9 / 0.0 | 55.0 / 20.2 | 3.33 | +9,536 | +629 | 55.1 / 1.4 | 59.3 / 15.3 | -6,556 |
| `live_n2_any_x0.5_kz_pm_cisd30` | 3.91 | +30,267 | +39,041 | 57.1 / 7.6 | 73.4 / 16.5 | 3.21 | +10,479 | +15,344 | 52.2 / 4.3 | 50.8 / 6.8 | -2,274 |
| `live_kz_all_cisd30` | 3.2 | +34,114 | +40,388 | 57.1 / 6.7 | 74.3 / 12.8 | 2.69 | +8,218 | +7,335 | 50.7 / 0.0 | 45.8 / 3.4 | +6,654 |
| `full_kz_asia_mg_rr2` | 3.48 | +37,644 | +27,918 | 59.7 / 5.0 | 73.4 / 8.3 | 2.95 | +7,902 | +6,723 | 39.1 / 7.2 | 44.1 / 13.6 | +3,652 |
| `full_n2_any_x1.0_kz_asia_mg_rr2` | 4.69 | +30,433 | +17,987 | 54.6 / 12.6 | 63.3 / 26.6 | 3.85 | +7,745 | +6,872 | 43.5 / 11.6 | 44.1 / 18.6 | -3,283 |
| `asia_kz_mg_rr2` | 1.13 | -1,423 | +21 | 0.8 / 0.0 | 0.9 / 0.0 | 1.03 | -2,042 | -1,217 | 11.6 / 0.0 | 13.6 / 0.0 | -1,580 |
| `full_kz_asia_mg_rr3` | 3.67 | +32,884 | +39,722 | 57.1 / 0.8 | 72.5 / 6.4 | 3.08 | +11,858 | +9,643 | 53.6 / 1.4 | 64.4 / 1.7 | -15,839 |
| `full_n2_any_x1.0_kz_asia_mg_rr3` | 5.2 | +33,759 | +30,242 | 58.8 / 8.4 | 70.6 / 15.6 | 4.49 | +12,511 | +12,783 | 59.4 / 5.8 | 64.4 / 10.2 | -16,189 |
| `asia_kz_mg_rr3` | 1.8 | +1,890 | +2,349 | 11.8 / 0.0 | 20.2 / 0.0 | 1.6 | +4,724 | +3,518 | 30.4 / 0.0 | 54.2 / 0.0 | -23,182 |
| `full_kz_asia_mg_rr4` | 3.71 | +30,524 | +21,184 | 47.9 / 0.0 | 67.0 / 2.8 | 3.21 | +12,127 | +10,122 | 52.2 / 1.4 | 66.1 / 11.9 | -17,800 |
| `full_n2_any_x1.0_kz_asia_mg_rr4` | 5.23 | +31,429 | +25,017 | 50.4 / 8.4 | 60.6 / 24.8 | 4.74 | +14,499 | +18,359 | 59.4 / 7.2 | 69.5 / 11.9 | -12,936 |
| `asia_kz_mg_rr4` | 1.88 | -816 | -2,383 | 7.6 / 0.0 | 8.3 / 0.0 | 1.79 | +6,429 | +9,731 | 33.3 / 0.0 | 64.4 / 0.0 | -21,776 |
| `full_kz_asia_mg_be15` | 3.71 | +23,696 | +10,197 | 42.9 / 6.7 | 56.9 / 21.1 | 3.21 | +10,926 | +4,326 | 60.9 / 2.9 | 59.3 / 11.9 | -16,839 |
| `full_n2_any_x1.0_kz_asia_mg_be15` | 5.04 | +19,609 | +17,949 | 37.8 / 20.2 | 45.9 / 36.7 | 4.49 | +13,317 | +13,681 | 62.3 / 8.7 | 57.6 / 18.6 | -13,080 |
| `asia_kz_mg_be15` | 1.88 | -7,967 | -3,992 | 8.4 / 0.0 | 9.2 / 16.5 | 1.79 | +6,264 | +2,073 | 46.4 / 0.0 | 62.7 / 3.4 | -21,271 |
| `full_kz_asia_mg_rr3_be15` | 3.67 | +29,383 | +24,307 | 48.7 / 5.0 | 61.5 / 15.6 | 3.08 | +12,380 | +11,434 | 55.1 / 5.8 | 64.4 / 6.8 | -5,860 |
| `full_n2_any_x1.0_kz_asia_mg_rr3_be15` | 5.12 | +29,333 | +23,481 | 52.9 / 9.2 | 63.3 / 17.4 | 4.42 | +12,618 | +10,915 | 55.1 / 10.1 | 64.4 / 15.3 | -8,220 |
| `asia_kz_mg_rr3_be15` | 1.8 | -1,611 | +4,227 | 11.8 / 0.0 | 14.7 / 0.9 | 1.6 | +5,743 | +5,580 | 33.3 / 0.0 | 57.6 / 1.7 | -14,059 |
| `full_kz_asia_mg_vix05` | 3.63 | +26,234 | +27,435 | 51.3 / 0.0 | 63.3 / 6.4 | 3.21 | +6,818 | +6,885 | 44.9 / 1.4 | 49.2 / 13.6 | -15,761 |
| `full_n2_any_x1.0_kz_asia_mg_vix05` | 5.04 | +22,468 | +34,619 | 45.4 / 11.8 | 52.3 / 24.8 | 4.62 | +9,446 | +12,563 | 55.1 / 8.7 | 55.9 / 20.3 | -8,023 |
| `asia_kz_mg_vix05` | 1.76 | -5,106 | -4,321 | 0.0 / 0.0 | 0.0 / 0.0 | 1.79 | +2,157 | -923 | 33.3 / 0.0 | 45.8 / 1.7 | -19,065 |
| `full_kz_asia_mg_vix05_rr4` | 3.63 | +29,970 | +21,781 | 45.4 / 0.0 | 68.8 / 1.8 | 3.21 | +12,035 | +10,051 | 52.2 / 1.4 | 66.1 / 11.9 | -19,799 |
| `full_n2_any_x1.0_kz_asia_mg_vix05_rr4` | 5.16 | +28,610 | +17,919 | 49.6 / 6.7 | 60.6 / 20.2 | 4.74 | +14,431 | +14,125 | 59.4 / 4.3 | 72.9 / 8.5 | -14,831 |
| `asia_kz_mg_vix05_rr4` | 1.76 | -1,439 | -2,378 | 0.0 / 0.0 | 0.0 / 0.0 | 1.79 | +6,337 | +9,639 | 33.3 / 0.0 | 64.4 / 0.0 | -23,637 |
| `live_lon_ny_x1.0` | 3.48 | +32,388 | +36,089 | 50.4 / 3.4 | 78.0 / 5.5 | 2.88 | +8,073 | +10,377 | 50.7 / 11.6 | 50.8 / 16.9 | -2,467 |
| `live_lon_ny_cool120_x1.0` | 3.4 | +34,464 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | -732 |
| `live_lon_ny_x0.5` | 3.48 | +32,128 | +36,438 | 57.1 / 3.4 | 74.3 / 7.3 | 2.88 | +8,477 | +11,081 | 50.7 / 4.3 | 50.8 / 5.1 | +147 |
| `live_lon_ny_cool120_x0.5` | 3.4 | +34,033 | +36,407 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +704 |
| `live_lon_ny_x0.25` | 3.48 | +32,417 | +36,819 | 57.1 / 3.4 | 74.3 / 7.3 | 2.88 | +8,640 | +11,020 | 50.7 / 4.3 | 50.8 / 5.1 | +1,046 |
| `live_lon_ny_cool120_x0.25` | 3.4 | +34,236 | +36,616 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,563 | +14,729 | 52.2 / 0.0 | 50.8 / 0.0 | +1,039 |
| `live_n2_cool45_x1.0` | 3.67 | +33,113 | +34,431 | 52.9 / 5.9 | 78.0 / 9.2 | 3.08 | +8,790 | +9,004 | 52.2 / 11.6 | 47.5 / 18.6 | -638 |
| `full_n2_cool45_x1.0` | 5.04 | +26,277 | +30,509 | 49.6 / 14.3 | 58.7 / 26.6 | 4.49 | +11,722 | +7,724 | 58.0 / 8.7 | 55.9 / 15.3 | -4,280 |
| `live_n2_cool45_x0.5` | 3.67 | +33,306 | +35,983 | 57.1 / 4.2 | 74.3 / 8.3 | 3.08 | +9,067 | +9,514 | 52.2 / 4.3 | 47.5 / 6.8 | +544 |
| `full_n2_cool45_x0.5` | 5.04 | +25,661 | +28,726 | 54.6 / 10.9 | 66.1 / 24.8 | 4.49 | +11,983 | +11,228 | 58.0 / 1.4 | 57.6 / 8.5 | -7,514 |
| `live_n2_cool45_x0.25` | 3.67 | +33,643 | +36,136 | 57.1 / 3.4 | 74.3 / 7.3 | 3.08 | +9,313 | +12,049 | 52.2 / 4.3 | 50.8 / 6.8 | +680 |
| `full_n2_cool45_x0.25` | 5.04 | +25,339 | +22,149 | 54.6 / 7.6 | 66.1 / 21.1 | 4.49 | +12,236 | +9,128 | 58.0 / 1.4 | 57.6 / 6.8 | -9,222 |
| `live_n2_cool90_x1.0` | 3.59 | +33,650 | +36,037 | 57.1 / 4.2 | 78.0 / 7.3 | 2.95 | +9,240 | +12,104 | 52.2 / 4.3 | 47.5 / 6.8 | +1,107 |
| `full_n2_cool90_x1.0` | 4.88 | +22,712 | +32,456 | 48.7 / 14.3 | 59.6 / 25.7 | 4.42 | +10,476 | +10,024 | 56.5 / 15.9 | 54.2 / 23.7 | -7,572 |
| `live_n2_cool90_x0.5` | 3.59 | +33,415 | +36,255 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,303 | +15,352 | 52.2 / 4.3 | 47.5 / 6.8 | +1,495 |
| `full_n2_cool90_x0.5` | 4.88 | +24,013 | +28,156 | 53.8 / 10.9 | 66.1 / 24.8 | 4.42 | +10,666 | +6,140 | 56.5 / 13.0 | 55.9 / 18.6 | -9,015 |
| `live_n2_cool90_x0.25` | 3.59 | +33,617 | +36,464 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,550 | +15,422 | 52.2 / 4.3 | 50.8 / 6.8 | +1,255 |
| `full_n2_cool90_x0.25` | 4.88 | +24,650 | +24,797 | 54.6 / 7.6 | 66.1 / 21.1 | 4.42 | +10,889 | +3,381 | 56.5 / 13.0 | 55.9 / 18.6 | -9,785 |
| `live_n2_cool150_x1.0` | 3.48 | +33,700 | +36,089 | 57.1 / 3.4 | 78.0 / 5.5 | 2.95 | +9,359 | +12,893 | 52.2 / 0.0 | 47.5 / 0.0 | -1,013 |
| `full_n2_cool150_x1.0` | 4.69 | +22,712 | +25,356 | 48.7 / 12.6 | 59.6 / 25.7 | 4.23 | +11,160 | +11,349 | 58.0 / 13.0 | 55.9 / 18.6 | -11,344 |
| `live_n2_cool150_x0.5` | 3.48 | +33,466 | +36,307 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,422 | +13,092 | 52.2 / 0.0 | 47.5 / 0.0 | +261 |
| `full_n2_cool150_x0.5` | 4.69 | +24,087 | +28,128 | 54.6 / 6.7 | 66.1 / 22.9 | 4.23 | +11,067 | +8,832 | 56.5 / 10.1 | 61.0 / 15.3 | -11,388 |
| `live_n2_cool150_x0.25` | 3.48 | +33,668 | +36,516 | 57.1 / 3.4 | 74.3 / 7.3 | 2.95 | +9,669 | +13,163 | 52.2 / 0.0 | 50.8 / 0.0 | +836 |
| `full_n2_cool150_x0.25` | 4.69 | +24,732 | +18,179 | 54.6 / 1.7 | 66.1 / 21.1 | 4.23 | +11,183 | +9,498 | 56.5 / 10.1 | 61.0 / 15.3 | -11,397 |
| `live_n2_cool180_x1.0` | 3.44 | +34,556 | +29,451 | 57.1 / 1.7 | 78.0 / 3.7 | 2.95 | +9,359 | +12,893 | 52.2 / 0.0 | 47.5 / 0.0 | -420 |
| `full_n2_cool180_x1.0` | 4.61 | +23,664 | +20,664 | 48.7 / 9.2 | 59.6 / 23.9 | 4.17 | +11,160 | +11,349 | 58.0 / 13.0 | 55.9 / 18.6 | -10,093 |
| `live_n2_cool180_x0.5` | 3.44 | +33,879 | +20,778 | 57.1 / 1.7 | 74.3 / 5.5 | 2.95 | +9,422 | +13,092 | 52.2 / 0.0 | 47.5 / 0.0 | +430 |
| `full_n2_cool180_x0.5` | 4.61 | +24,568 | +24,922 | 54.6 / 5.9 | 66.1 / 21.1 | 4.17 | +11,067 | +8,832 | 56.5 / 10.1 | 61.0 / 15.3 | -11,172 |
| `live_n2_cool180_x0.25` | 3.44 | +33,874 | +20,777 | 57.1 / 1.7 | 74.3 / 5.5 | 2.95 | +9,669 | +13,163 | 52.2 / 0.0 | 50.8 / 0.0 | +788 |
| `full_n2_cool180_x0.25` | 4.61 | +25,006 | +23,635 | 54.6 / 0.8 | 66.1 / 21.1 | 4.17 | +11,183 | +9,498 | 56.5 / 10.1 | 61.0 / 15.3 | -11,619 |
| `live_n2_cool240_x1.0` | 3.36 | +35,320 | +29,752 | 57.1 / 1.7 | 78.0 / 3.7 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +625 |
| `full_n2_cool240_x1.0` | 4.49 | +24,742 | +14,221 | 48.7 / 6.7 | 59.6 / 25.7 | 3.97 | +11,350 | +5,090 | 56.5 / 13.0 | 59.3 / 15.3 | -13,901 |
| `live_n2_cool240_x0.5` | 3.36 | +34,446 | +20,878 | 57.1 / 1.7 | 74.3 / 5.5 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +1,346 |
| `full_n2_cool240_x0.5` | 4.49 | +25,197 | +25,138 | 54.6 / 3.4 | 67.0 / 21.1 | 3.97 | +10,948 | +5,151 | 56.5 / 13.0 | 59.3 / 15.3 | -13,041 |
| `live_n2_cool240_x0.25` | 3.36 | +34,442 | +20,878 | 57.1 / 1.7 | 74.3 / 5.5 | 2.82 | +9,563 | +14,729 | 52.2 / 0.0 | 50.8 / 0.0 | +1,488 |
| `full_n2_cool240_x0.25` | 4.49 | +25,591 | +23,725 | 54.6 / 0.8 | 67.0 / 21.1 | 3.97 | +10,902 | +5,185 | 56.5 / 11.6 | 59.3 / 13.6 | -12,891 |
| `15m_live_alone` | 0.47 | +4,117 | +3,472 | 16.8 / 0.0 | 18.3 / 0.0 | 0.26 | -309 | +1,833 | 0.0 / 0.0 | 0.0 / 0.0 | +32 |
| `5m+15m_live_1day` | 3.2 | +33,267 | +35,961 | 57.1 / 4.2 | 74.3 / 10.1 | 2.63 | +9,811 | +17,253 | 52.2 / 0.0 | 52.5 / 0.0 | +3,635 |
| `5m+15m_live_2day` | 3.4 | +33,375 | +34,368 | 57.1 / 6.7 | 73.4 / 13.8 | 2.69 | +9,574 | +17,015 | 52.2 / 4.3 | 52.5 / 5.1 | +979 |
| `5m+15m_live_2day_x0.5` | 3.4 | +33,663 | +34,300 | 57.1 / 6.7 | 73.4 / 13.8 | 2.69 | +9,820 | +16,744 | 52.2 / 4.3 | 50.8 / 5.1 | +358 |
| `5mfull+15m_live_2day_x0.5` | 3.98 | +27,229 | +26,653 | 54.6 / 0.0 | 66.1 / 16.5 | 3.33 | +9,895 | +4,275 | 55.1 / 5.8 | 59.3 / 10.2 | -15,247 |
| `15m_night_alone` | 0.12 | -1,079 | -748 | 0.0 / 0.0 | 0.0 / 0.0 | 0.19 | +1,234 | +1,232 | 7.2 / 0.0 | 0.0 / 0.0 | -741 |
| `5m+15m_night_1day` | 3.12 | +29,427 | +29,676 | 56.3 / 5.0 | 73.4 / 7.3 | 2.69 | +11,081 | +17,251 | 52.2 / 1.4 | 50.8 / 1.7 | +633 |
| `5m+15m_night_2day` | 3.24 | +32,812 | +28,323 | 56.3 / 7.6 | 73.4 / 8.3 | 2.69 | +11,081 | +17,251 | 52.2 / 1.4 | 50.8 / 1.7 | +455 |
| `5m+15m_night_2day_x0.5` | 3.24 | +33,352 | +33,276 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +10,389 | +17,919 | 52.2 / 0.0 | 50.8 / 0.0 | +790 |
| `5mfull+15m_night_2day_x0.5` | 3.83 | +26,919 | +29,164 | 54.6 / 0.0 | 66.1 / 11.9 | 3.27 | +11,298 | +11,381 | 55.1 / 1.4 | 59.3 / 11.9 | -13,191 |
| `15m_24h_alone` | 0.59 | +3,038 | +1,249 | 16.8 / 0.0 | 18.3 / 0.0 | 0.45 | +925 | +3,065 | 7.2 / 0.0 | 0.0 / 0.0 | -710 |
| `5m+15m_24h_1day` | 3.2 | +28,802 | +31,403 | 56.3 / 3.4 | 73.4 / 5.5 | 2.76 | +11,398 | +19,445 | 52.2 / 1.4 | 52.5 / 1.7 | +3,058 |
| `5m+15m_24h_2day` | 3.52 | +32,296 | +28,456 | 56.3 / 8.4 | 72.5 / 10.1 | 2.82 | +11,162 | +16,622 | 52.2 / 4.3 | 52.5 / 5.1 | +224 |
| `5m+15m_24h_2day_x0.5` | 3.52 | +33,123 | +33,342 | 57.1 / 6.7 | 73.4 / 13.8 | 2.82 | +10,715 | +14,784 | 52.2 / 4.3 | 50.8 / 5.1 | -62 |
| `5mfull+15m_24h_2day_x0.5` | 4.1 | +26,689 | +23,277 | 54.6 / 0.0 | 66.1 / 16.5 | 3.4 | +11,625 | +11,127 | 55.1 / 5.8 | 59.3 / 10.2 | -15,550 |
| `15m_24h_loose_alone` | 0.9 | +7,758 | +3,855 | 25.2 / 0.0 | 36.7 / 0.0 | 0.64 | +1,045 | +3,182 | 7.2 / 0.0 | 0.0 / 0.0 | +1,788 |
| `5m+15m_24h_loose_1day` | 3.32 | +28,376 | +30,557 | 56.3 / 3.4 | 73.4 / 5.5 | 2.82 | +11,326 | +19,428 | 52.2 / 1.4 | 52.5 / 1.7 | +2,851 |
| `5m+15m_24h_loose_2day` | 3.67 | +31,978 | +28,046 | 56.3 / 8.4 | 72.5 / 10.1 | 3.01 | +10,925 | +16,600 | 52.2 / 4.3 | 52.5 / 5.1 | -726 |
| `5m+15m_24h_loose_2day_x0.5` | 3.67 | +32,931 | +32,693 | 57.1 / 6.7 | 73.4 / 13.8 | 3.01 | +10,532 | +14,268 | 52.2 / 4.3 | 50.8 / 5.1 | -425 |
| `5mfull+15m_24h_loose_2day_x0.5` | 4.22 | +26,496 | +26,419 | 54.6 / 0.0 | 66.1 / 19.3 | 3.65 | +11,633 | +10,850 | 56.5 / 5.8 | 61.0 / 10.2 | -15,019 |
| `lonny_c0_x1.0` | 3.48 | +32,388 | +36,089 | 50.4 / 3.4 | 78.0 / 5.5 | 2.88 | +8,073 | +10,377 | 50.7 / 11.6 | 50.8 / 16.9 | -2,467 |
| `lonny_c0_x0.5` | 3.48 | +32,128 | +36,438 | 57.1 / 3.4 | 74.3 / 7.3 | 2.88 | +8,477 | +11,081 | 50.7 / 4.3 | 50.8 / 5.1 | +147 |
| `lonny_c30_x1.0` | 3.48 | +32,388 | +36,089 | 50.4 / 3.4 | 78.0 / 5.5 | 2.82 | +9,081 | +12,153 | 52.2 / 11.6 | 50.8 / 16.9 | -1,343 |
| `lonny_c30_x0.5` | 3.48 | +32,128 | +36,438 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,251 | +12,218 | 52.2 / 4.3 | 50.8 / 5.1 | +622 |
| `lonny_c60_x1.0` | 3.44 | +34,465 | +36,390 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,405 | +14,486 | 52.2 / 4.3 | 50.8 / 5.1 | -1,066 |
| `lonny_c60_x0.5` | 3.44 | +34,034 | +36,407 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,359 | +14,670 | 52.2 / 4.3 | 50.8 / 5.1 | +610 |
| `lonny_c90_x1.0` | 3.4 | +34,464 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,405 | +14,486 | 52.2 / 4.3 | 50.8 / 5.1 | -919 |
| `lonny_c90_x0.5` | 3.4 | +34,033 | +36,407 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,359 | +14,670 | 52.2 / 4.3 | 50.8 / 5.1 | +756 |
| `lonny_c120_x1.0` | 3.4 | +34,464 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | -732 |
| `lonny_c120_x0.5` | 3.4 | +34,033 | +36,407 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +704 |
| `lonny_c150_x1.0` | 3.36 | +34,463 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | -603 |
| `lonny_c150_x0.5` | 3.36 | +34,032 | +36,406 | 57.1 / 3.4 | 74.3 / 7.3 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +555 |
| `lonny_c180_x1.0` | 3.32 | +35,315 | +29,751 | 57.1 / 1.7 | 78.0 / 3.7 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | -256 |
| `lonny_c180_x0.5` | 3.32 | +34,444 | +20,877 | 57.1 / 1.7 | 74.3 / 5.5 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +728 |
| `lonny_c240_x1.0` | 3.32 | +35,315 | +29,751 | 57.1 / 1.7 | 78.0 / 3.7 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +1,057 |
| `lonny_c240_x0.5` | 3.32 | +34,444 | +20,877 | 57.1 / 1.7 | 74.3 / 5.5 | 2.82 | +9,478 | +14,789 | 52.2 / 0.0 | 50.8 / 0.0 | +1,579 |
| `lonny_cut420_c120_x1.0` | 3.48 | +34,466 | +36,390 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +10,293 | +14,761 | 52.2 / 0.0 | 50.8 / 0.0 | +2,182 |
| `lonny_cut450_c120_x1.0` | 3.4 | +34,461 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +188 |
| `lonny_cut510_c120_x1.0` | 3.36 | +34,463 | +36,389 | 57.1 / 3.4 | 78.0 / 5.5 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +846 |
| `lonny_cut540_c120_x1.0` | 3.36 | +34,705 | +30,080 | 58.0 / 1.7 | 78.9 / 3.7 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +860 |
| `lonny_cut570_c120_x1.0` | 3.32 | +33,404 | +26,632 | 58.0 / 3.4 | 74.3 / 9.2 | 2.82 | +9,524 | +14,724 | 52.2 / 0.0 | 50.8 / 0.0 | +2,405 |
| `lonny_c120_after_nonstop_x1.0` | 3.24 | +33,047 | +34,480 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +9,478 | +9,129 | 52.2 / 0.0 | 50.8 / 0.0 | -1,822 |
| `lonny_c120_after_loss_x1.0` | 3.32 | +35,313 | +29,751 | 57.1 / 1.7 | 78.0 / 3.7 | 2.69 | +9,540 | +9,105 | 52.2 / 0.0 | 50.8 / 0.0 | +2,301 |
| `lonny_c120_after_scratch_x1.0` | 3.24 | +33,047 | +34,480 | 57.1 / 5.9 | 74.3 / 11.9 | 2.63 | +9,819 | +14,716 | 52.2 / 0.0 | 50.8 / 0.0 | -1,822 |
| `lonny_c120_same_x1.0` | 3.32 | +35,555 | +31,436 | 58.0 / 1.7 | 78.9 / 3.7 | 2.76 | +9,866 | +14,761 | 52.2 / 0.0 | 50.8 / 0.0 | +1,363 |
| `lonny_c120_opp_x1.0` | 3.24 | +33,047 | +34,480 | 57.1 / 5.9 | 74.3 / 11.9 | 2.63 | +9,152 | +9,021 | 52.2 / 0.0 | 50.8 / 0.0 | -1,091 |
| `lonny_c120_new_level_x1.0` | 3.24 | +33,047 | +34,480 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +9,478 | +9,129 | 52.2 / 0.0 | 50.8 / 0.0 | +616 |
| `lonny_c120_rstop_m05_x1.0` | 3.2 | +33,042 | +34,480 | 57.1 / 5.9 | 74.3 / 11.9 | 2.69 | +9,478 | +9,129 | 52.2 / 0.0 | 50.8 / 0.0 | -1,822 |
| `asiaslot_rr8_x1.0` | 4.73 | +27,367 | +28,284 | 49.6 / 12.6 | 60.6 / 25.7 | 4.1 | +12,531 | +2,795 | 63.8 / 2.9 | 66.1 / 3.4 | -12,287 |
| `asiaslot_rr8_x1.0_lonny_c120` | 4.8 | +23,539 | +25,642 | 50.4 / 12.6 | 61.5 / 24.8 | 4.23 | +10,096 | +4,741 | 55.1 / 13.0 | 55.9 / 15.3 | -11,507 |
| `asiaslot_rr8_x0.5` | 4.73 | +29,045 | +31,993 | 56.3 / 4.2 | 68.8 / 20.2 | 4.1 | +10,185 | +11,006 | 50.7 / 1.4 | 61.0 / 1.7 | -3,608 |
| `asiaslot_rr8_x0.5_lonny_c120` | 4.8 | +25,218 | +30,162 | 57.1 / 8.4 | 68.8 / 20.2 | 4.23 | +7,750 | +6,931 | 29.0 / 10.1 | 37.3 / 20.3 | -3,260 |
| `asiaslot_rr8_x0.25` | 4.73 | +30,445 | +33,198 | 58.8 / 2.5 | 71.6 / 20.2 | 4.1 | +9,672 | +10,713 | 50.7 / 0.0 | 44.1 / 0.0 | +485 |
| `asiaslot_rr8_x0.25_lonny_c120` | 4.8 | +26,617 | +30,889 | 58.0 / 5.9 | 69.7 / 20.2 | 4.23 | +7,236 | +8,379 | 31.9 / 15.9 | 20.3 / 25.4 | +683 |
| `asiaslot_rr3_x1.0` | 4.8 | +34,661 | +41,006 | 56.3 / 6.7 | 71.6 / 11.0 | 4.1 | +13,686 | +12,385 | 59.4 / 2.9 | 69.5 / 3.4 | -15,505 |
| `asiaslot_rr3_x1.0_lonny_c120` | 4.84 | +33,259 | +40,362 | 56.3 / 4.2 | 70.6 / 11.9 | 4.23 | +15,979 | +6,774 | 55.1 / 7.2 | 62.7 / 8.5 | -15,294 |
| `asiaslot_rr3_x0.5` | 4.8 | +33,275 | +32,694 | 54.6 / 2.5 | 71.6 / 7.3 | 4.1 | +11,365 | +5,224 | 44.9 / 1.4 | 59.3 / 1.7 | -5,298 |
| `asiaslot_rr3_x0.5_lonny_c120` | 4.84 | +31,915 | +33,846 | 56.3 / 1.7 | 70.6 / 5.5 | 4.23 | +13,395 | +9,301 | 42.0 / 8.7 | 47.5 / 10.2 | -4,580 |
| `asiaslot_rr3_x0.25` | 4.8 | +33,166 | +28,411 | 57.1 / 4.2 | 73.4 / 9.2 | 4.1 | +10,400 | +14,833 | 52.2 / 1.4 | 50.8 / 1.7 | -98 |
| `asiaslot_rr3_x0.25_lonny_c120` | 4.84 | +31,828 | +32,103 | 58.8 / 1.7 | 69.7 / 6.4 | 4.23 | +12,299 | +9,000 | 49.3 / 5.8 | 54.2 / 8.5 | +916 |
| `asiaslot_rr4_x1.0` | 4.84 | +33,222 | +31,331 | 50.4 / 7.6 | 64.2 / 19.3 | 4.29 | +14,415 | +6,387 | 59.4 / 1.4 | 74.6 / 1.7 | -14,506 |
| `asiaslot_rr4_x1.0_lonny_c120` | 4.92 | +32,155 | +38,438 | 54.6 / 5.0 | 64.2 / 9.2 | 4.36 | +16,183 | +11,684 | 52.2 / 13.0 | 66.1 / 15.3 | -14,386 |
| `asiaslot_rr4_x0.5` | 4.84 | +33,192 | +34,599 | 50.4 / 5.9 | 67.9 / 11.0 | 4.29 | +11,224 | +9,180 | 44.9 / 0.0 | 62.7 / 0.0 | -3,946 |
| `asiaslot_rr4_x0.5_lonny_c120` | 4.92 | +32,125 | +37,464 | 54.6 / 3.4 | 75.2 / 4.6 | 4.36 | +12,624 | +10,953 | 37.7 / 15.9 | 42.4 / 23.7 | -3,561 |
| `asiaslot_rr4_x0.25` | 4.84 | +33,784 | +34,184 | 58.0 / 4.2 | 74.3 / 11.0 | 4.29 | +10,027 | +8,896 | 52.2 / 1.4 | 50.8 / 1.7 | +1,428 |
| `asiaslot_rr4_x0.25_lonny_c120` | 4.92 | +32,717 | +36,362 | 63.0 / 3.4 | 75.2 / 5.5 | 4.36 | +11,243 | +8,557 | 44.9 / 11.6 | 50.8 / 22.0 | +1,920 |
| `asiaslotn_rr2.5_x1.0` | 4.65 | +34,121 | +17,176 | 56.3 / 6.7 | 67.0 / 11.0 | 3.78 | +11,646 | +3,823 | 58.0 / 1.4 | 64.4 / 1.7 | -10,961 |
| `asiaslotn_rr2.5_x0.75` | 4.65 | +33,596 | +27,297 | 54.6 / 3.4 | 72.5 / 8.3 | 3.78 | +11,007 | +8,035 | 43.5 / 1.4 | 59.3 / 1.7 | -6,642 |
| `asiaslotn_rr2.75_x1.0` | 4.73 | +34,313 | +35,022 | 55.5 / 6.7 | 67.9 / 11.9 | 4.04 | +13,188 | +12,181 | 59.4 / 1.4 | 66.1 / 1.7 | -8,710 |
| `asiaslotn_rr2.75_x0.75` | 4.73 | +33,734 | +28,026 | 54.6 / 2.5 | 70.6 / 8.3 | 4.04 | +12,025 | +8,141 | 43.5 / 1.4 | 62.7 / 1.7 | -5,464 |
| `asiaslotn_rr3_x1.0` | 4.8 | +34,661 | +41,006 | 56.3 / 6.7 | 71.6 / 11.0 | 4.1 | +13,686 | +12,385 | 59.4 / 2.9 | 69.5 / 3.4 | -15,505 |
| `asiaslotn_rr3_x0.75` | 4.8 | +33,895 | +33,471 | 54.6 / 2.5 | 71.6 / 6.4 | 4.1 | +12,420 | +8,495 | 43.5 / 1.4 | 62.7 / 1.7 | -10,220 |
| `asiaslotn_rr3.25_x1.0` | 4.84 | +33,322 | +35,286 | 55.5 / 5.9 | 69.7 / 11.9 | 4.17 | +13,121 | +6,515 | 56.5 / 1.4 | 69.5 / 3.4 | -15,461 |
| `asiaslotn_rr3.25_x0.75` | 4.84 | +33,204 | +28,717 | 55.5 / 4.2 | 71.6 / 8.3 | 4.17 | +11,789 | +12,496 | 47.8 / 1.4 | 67.8 / 1.7 | -9,968 |
| `asiaslotn_rr3.5_x1.0` | 4.84 | +32,425 | +27,041 | 49.6 / 7.6 | 63.3 / 19.3 | 4.23 | +13,005 | +8,674 | 59.4 / 1.4 | 69.5 / 3.4 | -13,629 |
| `asiaslotn_rr3.5_x0.75` | 4.84 | +32,649 | +30,011 | 51.3 / 5.9 | 66.1 / 13.8 | 4.23 | +11,686 | +7,912 | 47.8 / 1.4 | 67.8 / 1.7 | -9,029 |
| `asiaslotn_rr3_w20` | 4.73 | +34,737 | +43,432 | 57.1 / 6.7 | 71.6 / 11.0 | 3.97 | +12,729 | +11,105 | 56.5 / 2.9 | 62.7 / 5.1 | -12,321 |
| `asiaslotn_rr3_w00` | 3.79 | +32,758 | +30,296 | 54.6 / 2.5 | 72.5 / 13.8 | 3.4 | +12,316 | +8,049 | 55.1 / 0.0 | 59.3 / 5.1 | -2,226 |
| `asiaslotn_rr3_w19` | 4.8 | +34,661 | +41,006 | 56.3 / 6.7 | 71.6 / 11.0 | 4.1 | +13,686 | +12,385 | 59.4 / 2.9 | 69.5 / 3.4 | -14,337 |
| `asiaslotn_rr3_be15` | 4.73 | +30,935 | +19,634 | 52.1 / 10.9 | 60.6 / 20.2 | 4.1 | +13,050 | +13,030 | 56.5 / 7.2 | 64.4 / 8.5 | -5,734 |
| `asiaslotn_rr3_minrr2` | 4.49 | +35,166 | +37,998 | 58.8 / 6.7 | 76.1 / 8.3 | 3.72 | +11,898 | +7,758 | 58.0 / 2.9 | 62.7 / 3.4 | -10,004 |
| `asiaslotn_rr3_depth075` | 4.73 | +35,224 | +36,098 | 58.0 / 5.0 | 75.2 / 10.1 | 4.1 | +12,355 | +15,783 | 58.0 / 4.3 | 64.4 / 5.1 | -12,273 |
| `asiaslotn_rr3_disp1` | 4.3 | +34,387 | +19,340 | 56.3 / 2.5 | 70.6 / 12.8 | 3.65 | +9,334 | +8,029 | 50.7 / 1.4 | 44.1 / 3.4 | -11,270 |
