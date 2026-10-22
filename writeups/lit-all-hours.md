## In one minute

- **The owner's order (2026-10-18):** "The bot should ALWAYS be looking for trades based off LIT. We should be trading all of
  LIT." CME NQ trades from 18:00 ET to 17:00 ET (with a 1-hour halt). Today's LIT only enters from 02:00 to 15:30, takes 1
  trade a day and is flat at 15:55.
- **What was tested (30 variants):**
  1. Longer entry windows: Asia added (18:00, 19:00, 20:00 or 00:00 to 15:30), Asia on its own, and 15:30-15:50.
  2. More trades a day: 1 per session (Asia / London / NY), 2 a day, 2 a day but stop after a loss, 1 Asia + 1 day trade.
  3. Re-arming: after a trade ends at the target or breakeven, keep looking for the next LIT setup (no daily cap).
  4. The owner's LIT-group notes: the false break (F-BoS) of the 16:30-17:00 build-up at the 18:00 open, "no build-up = the
     LIT cycle before Asia continues", and trendline / channel liquidity ("TS") as an extra level.
- **The answer: nothing beats today's LIT in both halves of 2026.** It is the same pattern every time:
  - **Jul-Oct (the check half) likes more trades**: up to +$4k more and up to 64-70% of evals passed within 2 weeks.
  - **Jan-Jun (the pick half) gets worse**: less money (up to -$7.8k), fewer 2-week passes (down to 42%) and many more
    2-week fails (up to 23.5%).
  - The extra trades are weaker than the live ones. Asia LIT setups on their own made -$1,336 in Jan-Jun (PF 0.82, win 8%).
  - With one trade a day, an Asia setup takes the day's slot before the London setup, which is LIT's best trade.
- **Closest to passing: the F-BoS at the 18:00 open** (run `lit_hours_fbos`). It is the live LIT plus setups between 18:00 and
  02:00 that swept the previous session's 16:30-17:00 build-up.
  - Money: Jan-Jun +$32,880 (vs +$32,773), Jul-Oct +$13,715 (vs +$8,962).
  - 2-week eval: Jan-Jun 52.9% pass / 13.4% fail (vs 52.9 / 8.4), Jul-Oct 66.7% / 8.7% (vs 50.7 / 2.9).
  - **Not adopted:** the main metric does not improve in Jan-Jun and the fails go up in both halves. Its 16 trades in 2026 had
    3 winners, none of them in Jan-Jun. One trade (2026-09-04, +$3,626) carries Jul-Oct. Worth watching on paper, not worth
    switching on.
- **Today's LIT stays as it is:** entries 02:00-15:30, 1 trade a day, flat 15:55. Run `lit_hours_base` = `lit_live`.

## How it was tested

- **Data:** CME NQ1! from TradingView only. 5m (2021-11 to 2026-10-16) and 1m for 2026. Both cover the full 23-hour day: 1m bars
  exist in every hour from 18:00 to 17:00 ET in 2026. No Yahoo, no CFD.
- **Same LIT:** `engine/lit.py` run_x with the live settings (`live_model.json` "lit"): sweep >= 0.5 ATR, inducement taken
  first, displacement >= 0.8 ATR, 5m CISD, limit for 30 min, 1m CISD entry, stop 1 tick beyond the sweep extreme, target the
  18:00 open +/- 1 VIX day move (>= 1.5R, banked at 8R), breakeven at 1R, Monday rule, weekly stop.
- **New engine options (all off by default, so the live bot does not change):**
  - `candidates(evening=True)`: setups on the whole trading day from 18:30 ET (6 bars after the open).
  - `all_hours: true`: trades run in trading-day order. An 18:00-02:00 entry is held at most to 15:55 of the same trading day:
    never through the 17:00 halt, flat before MFFU's 16:10 close. (No MFFU rule file existed; that rule was assumed.)
  - `per_session: [[[1080,120],[120,480],[480,1080]], n]`: at most n trades in Asia (18:00-02:00), London (02:00-08:00) and NY
    (08:00-17:00).
  - `stop_after_loss: true`: no new trade that day after a stop-out. A later trade comes only after a target or a breakeven.
  - Always one trade at a time: the next one starts only after the last one ended.
  - **Check:** with the new candidates and the live window, the 2026 trades are the same as `lit_live` (120/120, +$41,734). The
    two_week eval matches `lit_2wk_rec` (Jan-Jun 52.9 / 8.4, Jul-Oct 50.7 / 2.9). The 00:00 window matches the earlier
    `lit_2wk_window0` (51.3 / 47.8).
- **VIX target overnight:** the band is the 18:00 open +/- 1 VIX day move. The VIX close it uses is from 16:15 ET, so the band is
  known at 18:00. An Asia entry sits close to the open, so the band is about 1 day move away and the 1.5R minimum is easy to
  meet. The bank at 8R does most of the capping.
- **Money:** the LIT size ($800 up to a 20-pt stop, then 800 x 20 / stop, weekly stop), which equals `lit_live`. $1.40 per
  micro, 1 tick of slippage on market entries and stop / breakeven / end-of-day exits.
- **Eval:** an MFFU Builder 50K started on every session of the half, under lit_sizing mode **two_week** (config C:
  "one winner passes", 60% of the room, $1,000 soft daily loss, 40 micros). The engine is `tools/lit_2wk.py` run_eval
  (exact MFFU rules), plus its 4,000-path Monte Carlo (MC). With more than one trade a day, the sizing sees that day's P&L,
  and it takes no new trade once the day has reached the target.
- **Judge:** pick on H1 (Jan 2 - Jun 30 2026), check on H2 (Jul 1 - Oct 16). A change is adopted only if both halves improve,
  the 2-week pass rate first, at 2-4 trades a week. 2021-25 is a reference line only: it has no 1m bars, so entries there
  run on 5m.

## Results (costs in)

Variant names: `window · trades rule`.
- **Windows:** live = 02:00-15:30, full = 18:00-15:30, w20 = 20:00-15:30, w00 = 00:00-15:30, late = 02:00-15:50.
- **Trades rules:**
  - 1day = 1 trade a day;
  - 1sess = 1 per Asia / London / NY session;
  - 2day = 2 a day;
  - rearm = no daily cap;
  - _sal = stop for the day after a loss;
  - asia_plus = 1 Asia trade + 1 London/NY trade.
- **The owner's notes:**
  - fbos = live LIT + 18:00-20:00 setups that swept the 16:30-17:00 build-up;
  - fbos_all = the same from 18:00 to 02:00;
  - cycle = live LIT + 18:00-02:00 setups in the direction of the last LIT setup before the halt;
  - fbos_cycle = the F-BoS setups first, otherwise the cycle setups;
  - ts = trendline / channel liquidity as an extra level.
- **Columns:** "Worst day" is the worst day at the LIT size. "2-wk pass / fail" is the share of fresh two_week evals that
  pass or fail within 10 sessions, started on every session of that half. MC is the same over 4,000 Monte Carlo paths.

| Variant | Half | Trades | /wk | Win % | PF | Net $ | $/mo | Max DD | Worst day | 2-wk pass / fail (two_week) | MC 2-wk pass / fail |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `live · 1day` | H1 | 80 | 3.12 | 22.5 | 4.44 | +32,773 | +5,377 | -2,315 | -755 | 52.9 / 8.4 | 50.5 / 6.2 |
| `live · 1day` | H2 | 40 | 2.56 | 35.0 | 2.46 | +8,962 | +2,413 | -1,466 | -635 | 50.7 / 2.9 | 55.4 / 5.5 |
| `live · 1day` | 2021-25 ref | 510 | 2.38 | 17.5 | 1.01 | +1,275 | +25 | -20,462 | -860 | 15.4 / 5.6 | - |
| `full · 1day` | H1 | 95 | 3.71 | 18.9 | 3.26 | +27,310 | +4,480 | -3,533 | -876 | 50.4 / 5.9 | 46.6 / 5.2 |
| `full · 1day` | H2 | 50 | 3.21 | 22.0 | 2.0 | +9,644 | +2,597 | -1,793 | -853 | 53.6 / 4.3 | 52.2 / 9.4 |
| `full · 1day` | 2021-25 ref | 640 | 2.99 | 15.3 | 0.93 | -10,511 | -206 | -19,501 | -874 | 22.6 / 9.3 | - |
| `asia_only_add · 1day` | H1 | 48 | 1.88 | 8.3 | 0.82 | -1,336 | -219 | -3,184 | -876 | 16.8 / 0.0 | 14.6 / 0.1 |
| `asia_only_add · 1day` | H2 | 28 | 1.79 | 17.9 | 1.84 | +5,236 | +1,410 | -2,418 | -853 | 42.0 / 0.0 | 38.9 / 0.5 |
| `asia_only_add · 1day` | 2021-25 ref | 251 | 1.17 | 10.8 | 0.83 | -13,910 | -272 | -26,471 | -874 | 13.5 / 2.5 | - |
| `w20 · 1day` | H1 | 94 | 3.67 | 19.1 | 3.09 | +26,659 | +4,374 | -3,533 | -876 | 50.4 / 7.6 | 46.3 / 5.5 |
| `w20 · 1day` | H2 | 50 | 3.21 | 22.0 | 1.66 | +6,473 | +1,743 | -2,235 | -853 | 42.0 / 7.2 | 46.2 / 11.1 |
| `w20 · 1day` | 2021-25 ref | 632 | 2.95 | 16.0 | 1.01 | +1,590 | +31 | -15,190 | -874 | 23.0 / 8.4 | - |
| `w00 · 1day` | H1 | 85 | 3.32 | 20.0 | 3.33 | +26,116 | +4,285 | -2,300 | -822 | 51.3 / 5.9 | 48.0 / 4.5 |
| `w00 · 1day` | H2 | 48 | 3.08 | 27.1 | 1.95 | +7,647 | +2,059 | -2,165 | -853 | 47.8 / 4.3 | 48.8 / 8.7 |
| `w00 · 1day` | 2021-25 ref | 557 | 2.6 | 16.3 | 0.97 | -3,553 | -70 | -22,685 | -874 | 17.6 / 6.9 | - |
| `late · 1day` | H1 | 80 | 3.12 | 22.5 | 4.44 | +32,773 | +5,377 | -2,315 | -755 | 52.9 / 8.4 | 50.5 / 6.2 |
| `late · 1day` | H2 | 42 | 2.69 | 35.7 | 2.45 | +8,963 | +2,413 | -1,466 | -635 | 50.7 / 0.0 | 55.5 / 5.8 |
| `late · 1day` | 2021-25 ref | 516 | 2.41 | 17.6 | 1.01 | +1,087 | +21 | -20,462 | -860 | 15.4 / 5.7 | - |
| `full_late · 1day` | H1 | 95 | 3.71 | 18.9 | 3.26 | +27,310 | +4,480 | -3,533 | -876 | 50.4 / 5.9 | 46.6 / 5.2 |
| `full_late · 1day` | H2 | 51 | 3.27 | 23.5 | 2.01 | +9,698 | +2,611 | -1,739 | -853 | 53.6 / 2.9 | 52.6 / 9.3 |
| `full_late · 1day` | 2021-25 ref | 644 | 3.0 | 15.4 | 0.93 | -10,707 | -210 | -19,613 | -874 | 22.6 / 9.5 | - |
| `live · 1sess` | H1 | 89 | 3.48 | 22.5 | 3.89 | +31,227 | +5,123 | -2,762 | -858 | 46.2 / 6.7 | 50.5 / 6.7 |
| `live · 1sess` | H2 | 45 | 2.88 | 33.3 | 2.08 | +7,536 | +2,029 | -1,741 | -743 | 49.3 / 14.5 | 52.3 / 12.5 |
| `live · 1sess` | 2021-25 ref | 573 | 2.67 | 18.2 | 0.97 | -3,191 | -63 | -20,635 | -1,458 | 15.1 / 7.8 | - |
| `live · 1sess_sal` | H1 | 82 | 3.2 | 22.0 | 4.07 | +31,909 | +5,235 | -2,911 | -858 | 52.9 / 8.4 | 50.5 / 6.7 |
| `live · 1sess_sal` | H2 | 42 | 2.69 | 33.3 | 2.33 | +8,616 | +2,320 | -1,470 | -635 | 50.7 / 10.1 | 54.9 / 7.2 |
| `live · 1sess_sal` | 2021-25 ref | 538 | 2.51 | 17.5 | 0.97 | -2,724 | -53 | -22,051 | -862 | 15.1 / 6.7 | - |
| `live · 2day_sal` | H1 | 87 | 3.4 | 20.7 | 3.63 | +30,307 | +4,972 | -2,911 | -858 | 52.9 / 9.2 | 48.8 / 9.4 |
| `live · 2day_sal` | H2 | 44 | 2.82 | 34.1 | 2.39 | +9,030 | +2,431 | -1,470 | -635 | 50.7 / 10.1 | 55.5 / 7.2 |
| `live · 2day_sal` | 2021-25 ref | 548 | 2.56 | 17.5 | 0.97 | -3,530 | -69 | -22,954 | -862 | 14.6 / 7.5 | - |
| `live · 2day` | H1 | 99 | 3.87 | 19.2 | 3.29 | +28,014 | +4,596 | -2,768 | -858 | 45.4 / 9.2 | 45.6 / 12.1 |
| `live · 2day` | H2 | 49 | 3.14 | 32.7 | 2.58 | +11,771 | +3,169 | -1,871 | -758 | 49.3 / 14.5 | 54.2 / 11.6 |
| `live · 2day` | 2021-25 ref | 599 | 2.79 | 18.0 | 0.96 | -5,157 | -101 | -21,742 | -1,659 | 14.9 / 9.2 | - |
| `live · rearm_sal` | H1 | 88 | 3.44 | 20.5 | 3.63 | +30,296 | +4,970 | -2,911 | -858 | 52.9 / 9.2 | 48.8 / 9.4 |
| `live · rearm_sal` | H2 | 45 | 2.88 | 35.6 | 2.44 | +9,356 | +2,519 | -1,444 | -635 | 50.7 / 10.1 | 55.5 / 7.1 |
| `live · rearm_sal` | 2021-25 ref | 549 | 2.56 | 17.5 | 0.97 | -3,664 | -72 | -23,088 | -862 | 14.6 / 7.5 | - |
| `live · rearm` | H1 | 103 | 4.02 | 20.4 | 3.41 | +29,543 | +4,847 | -2,521 | -858 | 45.4 / 4.2 | 47.7 / 8.8 |
| `live · rearm` | H2 | 52 | 3.33 | 34.6 | 2.63 | +12,141 | +3,269 | -1,873 | -758 | 49.3 / 14.5 | 54.2 / 11.7 |
| `live · rearm` | 2021-25 ref | 611 | 2.85 | 18.2 | 0.96 | -4,952 | -97 | -22,709 | -1,659 | 14.9 / 10.4 | - |
| `full · 1sess` | H1 | 128 | 5.0 | 16.4 | 2.76 | +26,576 | +4,360 | -3,783 | -931 | 46.2 / 21.0 | 47.0 / 14.0 |
| `full · 1sess` | H2 | 67 | 4.29 | 29.9 | 2.09 | +12,127 | +3,265 | -1,793 | -853 | 63.8 / 10.1 | 59.5 / 12.6 |
| `full · 1sess` | 2021-25 ref | 797 | 3.72 | 16.1 | 0.93 | -11,965 | -234 | -23,397 | -1,658 | 22.7 / 16.0 | - |
| `full · 1sess_sal` | H1 | 112 | 4.38 | 17.9 | 3.03 | +29,249 | +4,799 | -3,642 | -876 | 49.6 / 16.8 | 50.0 / 9.4 |
| `full · 1sess_sal` | H2 | 57 | 3.65 | 28.1 | 2.09 | +11,131 | +2,997 | -1,793 | -853 | 60.9 / 4.3 | 58.3 / 8.4 |
| `full · 1sess_sal` | 2021-25 ref | 706 | 3.29 | 15.7 | 0.95 | -7,601 | -149 | -20,239 | -890 | 23.4 / 11.2 | - |
| `full · 2day_sal` | H1 | 117 | 4.57 | 17.1 | 2.84 | +28,030 | +4,599 | -3,923 | -876 | 49.6 / 18.5 | 49.0 / 12.7 |
| `full · 2day_sal` | H2 | 59 | 3.78 | 28.8 | 2.11 | +11,455 | +3,084 | -1,793 | -853 | 60.9 / 4.3 | 57.1 / 8.9 |
| `full · 2day_sal` | 2021-25 ref | 710 | 3.31 | 15.6 | 0.95 | -8,262 | -162 | -21,729 | -890 | 23.5 / 12.0 | - |
| `full · 2day` | H1 | 131 | 5.12 | 15.3 | 2.55 | +25,041 | +4,108 | -4,014 | -931 | 42.0 / 23.5 | 44.3 / 17.9 |
| `full · 2day` | H2 | 71 | 4.55 | 31.0 | 2.17 | +12,977 | +3,494 | -1,943 | -853 | 62.3 / 14.5 | 58.1 / 16.0 |
| `full · 2day` | 2021-25 ref | 813 | 3.79 | 15.9 | 0.94 | -10,648 | -209 | -19,384 | -1,659 | 22.8 / 17.8 | - |
| `full · rearm_sal` | H1 | 118 | 4.61 | 16.9 | 2.84 | +28,019 | +4,597 | -3,934 | -876 | 49.6 / 18.5 | 49.0 / 12.7 |
| `full · rearm_sal` | H2 | 60 | 3.85 | 28.3 | 2.1 | +11,442 | +3,080 | -1,793 | -853 | 60.9 / 4.3 | 57.1 / 8.9 |
| `full · rearm_sal` | 2021-25 ref | 714 | 3.33 | 15.5 | 0.95 | -8,633 | -169 | -21,962 | -890 | 23.1 / 12.4 | - |
| `full · rearm` | H1 | 142 | 5.55 | 15.5 | 2.51 | +24,977 | +4,098 | -4,187 | -931 | 42.0 / 21.8 | 43.9 / 18.3 |
| `full · rearm` | H2 | 77 | 4.94 | 28.6 | 2.05 | +12,322 | +3,318 | -1,946 | -853 | 62.3 / 14.5 | 58.0 / 17.2 |
| `full · rearm` | 2021-25 ref | 840 | 3.92 | 16.2 | 0.95 | -9,499 | -186 | -18,410 | -1,659 | 21.7 / 19.7 | - |
| `full · asia_plus` | H1 | 121 | 4.73 | 16.5 | 2.79 | +26,664 | +4,375 | -3,718 | -931 | 47.1 / 21.0 | 48.0 / 12.8 |
| `full · asia_plus` | H2 | 64 | 4.1 | 31.2 | 2.19 | +12,602 | +3,393 | -1,793 | -853 | 62.3 / 4.3 | 60.5 / 9.2 |
| `full · asia_plus` | 2021-25 ref | 740 | 3.45 | 15.5 | 0.94 | -9,337 | -183 | -19,711 | -1,658 | 23.2 / 12.3 | - |
| `full · asia_plus_sal` | H1 | 111 | 4.34 | 18.0 | 3.04 | +29,261 | +4,801 | -3,631 | -876 | 49.6 / 16.8 | 50.0 / 9.2 |
| `full · asia_plus_sal` | H2 | 57 | 3.65 | 28.1 | 2.09 | +11,131 | +2,997 | -1,793 | -853 | 60.9 / 4.3 | 58.3 / 8.4 |
| `full · asia_plus_sal` | 2021-25 ref | 683 | 3.19 | 15.7 | 0.96 | -5,694 | -112 | -18,633 | -890 | 23.2 / 9.6 | - |
| `w20 · 1sess_sal` | H1 | 110 | 4.3 | 18.2 | 3.06 | +29,353 | +4,816 | -3,642 | -876 | 49.6 / 16.8 | 50.1 / 9.2 |
| `w20 · 1sess_sal` | H2 | 57 | 3.65 | 28.1 | 1.77 | +7,960 | +2,143 | -1,793 | -853 | 49.3 / 4.3 | 53.1 / 9.8 |
| `w20 · 1sess_sal` | 2021-25 ref | 695 | 3.24 | 16.3 | 1.03 | +5,188 | +102 | -15,932 | -890 | 24.0 / 9.8 | - |
| `w20 · rearm_sal` | H1 | 116 | 4.53 | 17.2 | 2.86 | +28,123 | +4,614 | -3,934 | -876 | 49.6 / 18.5 | 49.0 / 12.5 |
| `w20 · rearm_sal` | H2 | 60 | 3.85 | 28.3 | 1.79 | +8,271 | +2,227 | -1,793 | -853 | 49.3 / 4.3 | 52.1 / 11.1 |
| `w20 · rearm_sal` | 2021-25 ref | 704 | 3.28 | 16.2 | 1.03 | +4,433 | +87 | -17,654 | -890 | 23.7 / 11.0 | - |
| `fbos · 1day` | H1 | 82 | 3.2 | 22.0 | 4.34 | +32,559 | +5,342 | -2,471 | -755 | 52.9 / 12.6 | 50.5 / 7.2 |
| `fbos · 1day` | H2 | 40 | 2.56 | 35.0 | 3.07 | +12,238 | +3,295 | -1,466 | -635 | 52.2 / 2.9 | 55.8 / 5.3 |
| `fbos · 1day` | 2021-25 ref | 515 | 2.4 | 17.3 | 1.01 | +1,251 | +25 | -20,462 | -860 | 15.5 / 6.3 | - |
| `fbos_all · 1day` | H1 | 83 | 3.24 | 21.7 | 4.49 | +32,880 | +5,394 | -2,618 | -755 | 52.9 / 13.4 | 50.3 / 8.1 |
| `fbos_all · 1day` | H2 | 45 | 2.88 | 35.6 | 3.06 | +13,715 | +3,693 | -1,638 | -635 | 66.7 / 8.7 | 63.0 / 9.1 |
| `fbos_all · 1day` | 2021-25 ref | 537 | 2.5 | 16.4 | 0.96 | -4,655 | -91 | -22,155 | -866 | 16.0 / 6.3 | - |
| `cycle · 1day` | H1 | 87 | 3.4 | 20.7 | 3.91 | +31,022 | +5,090 | -3,292 | -692 | 48.7 / 8.4 | 44.9 / 5.8 |
| `cycle · 1day` | H2 | 45 | 2.88 | 26.7 | 1.85 | +7,733 | +2,082 | -1,892 | -808 | 53.6 / 2.9 | 53.3 / 6.2 |
| `cycle · 1day` | 2021-25 ref | 573 | 2.67 | 15.5 | 0.97 | -4,165 | -82 | -17,196 | -874 | 17.4 / 7.4 | - |
| `fbos_cycle · 1day` | H1 | 86 | 3.36 | 20.9 | 3.61 | +28,605 | +4,693 | -3,437 | -755 | 48.7 / 12.6 | 45.3 / 8.2 |
| `fbos_cycle · 1day` | H2 | 43 | 2.76 | 34.9 | 3.46 | +15,186 | +4,088 | -1,444 | -635 | 69.6 / 2.9 | 67.2 / 5.1 |
| `fbos_cycle · 1day` | 2021-25 ref | 547 | 2.55 | 16.5 | 0.94 | -7,626 | -149 | -21,630 | -874 | 16.1 / 6.4 | - |
| `ts · live · 1day` | H1 | 81 | 3.16 | 22.2 | 3.81 | +29,811 | +4,891 | -2,453 | -755 | 48.7 / 3.4 | 50.5 / 4.7 |
| `ts · live · 1day` | H2 | 38 | 2.44 | 34.2 | 1.88 | +5,552 | +1,495 | -1,556 | -678 | 37.7 / 2.9 | 45.1 / 6.8 |
| `ts · live · 1day` | 2021-25 ref | 518 | 2.42 | 18.5 | 1.16 | +15,766 | +309 | -13,888 | -860 | 19.6 / 6.2 | - |
| `ts · full · 1day` | H1 | 96 | 3.75 | 18.8 | 2.94 | +24,843 | +4,076 | -3,548 | -876 | 47.9 / 4.2 | 46.0 / 4.1 |
| `ts · full · 1day` | H2 | 50 | 3.21 | 20.0 | 1.85 | +7,682 | +2,068 | -1,752 | -834 | 52.2 / 1.4 | 50.3 / 7.5 |
| `ts · full · 1day` | 2021-25 ref | 650 | 3.03 | 15.8 | 1.03 | +5,144 | +101 | -13,146 | -874 | 26.5 / 9.4 | - |
| `ts · live · rearm_sal` | H1 | 91 | 3.55 | 20.9 | 3.49 | +31,494 | +5,167 | -3,306 | -858 | 53.8 / 5.9 | 51.1 / 7.6 |
| `ts · live · rearm_sal` | H2 | 43 | 2.76 | 34.9 | 1.9 | +5,972 | +1,608 | -1,556 | -678 | 37.7 / 10.1 | 44.8 / 8.6 |
| `ts · live · rearm_sal` | 2021-25 ref | 564 | 2.63 | 18.3 | 1.08 | +8,637 | +169 | -16,573 | -862 | 18.4 / 9.1 | - |

(w19 = w20's neighbour 19:00-15:30 gives the same 2026 trades as full: no LIT setup triggered 18:00-19:00 in 2026. Every row is in
`research/lit/all_hours.json`.)

## What it means

1. **Asia (18:00-02:00): no.**
   - Alone it loses in Jan-Jun (-$1,336, PF 0.82, 1.9 trades a week) and makes +$5,236 in Jul-Oct.
   - Added to the one daily slot (`full`), it pushes out London trades:
     - Jan-Jun: -$5.5k, 2-week passes 52.9% -> 50.4%.
     - Jul-Oct: +$0.7k, 2-week passes 50.7% -> 53.6%.
     - 2026 max drawdown -$2.3k -> -$4.8k.
   - Starting at 20:00 or at 00:00 is worse in both halves.
2. **15:30-16:00: no effect.**
   - The 30-minute limit leaves no room before the 15:55 flat: 0 extra trades in Jan-Jun, 2 in Jul-Oct for +$1.
   - The only change is in the Jul-Oct 2-week fails (2.9% -> 0.0%): one eval.
3. **More trades a day (1 per session, 2 a day, re-arming): no.**
   - On today's window, stop-after-loss keeps the Jan-Jun 2-week passes at 52.9%, but:
     - Jan-Jun money drops by $0.9-2.5k;
     - Jul-Oct 2-week fails rise from 2.9% to 10.1%.
   - Without a stop after a loss, Jul-Oct money rises (+$2.8k to +$3.2k), but:
     - Jan-Jun 2-week passes fall to 45.4% (1 per session: 46.2%);
     - Jul-Oct fails rise to 14.5%.
   - In two_week sizing every trade risks up to about $1,000, so a second loser on the same day is what fails the eval.
4. **All hours plus more trades (the full "always looking" bot): no.**
   - Jul-Oct is the best of the study: 61-64% of evals pass within 2 weeks, +$11-13k.
   - But it trades 4.3-5.6 times a week, above the owner's 2-4.
   - And Jan-Jun gets worse: 42-50% pass, 17-23.5% fail, $3.5-7.8k less money.
   - 2021-25 loses $5.7-12k.
5. **The owner's F-BoS notes: closest, still no.**
   - The false break of the 16:30-17:00 build-up at the 18:00 open adds 16 trades in 2026:
     - 3 winners: Aug 7 +$1,769, Sep 4 +$3,626, Oct 16 +$465;
     - 9 stop-outs, 4 breakevens;
     - in Jan-Jun: 7 trades, 0 winners.
   - It gains in Jan-Jun only because the London trades it pushed out were losers.
   - "No build-up -> the cycle continues" (`cycle`) loses money in both halves.
   - The F-BoS + cycle mix has the best Jul-Oct of the study (69.6% / 2.9%), but Jan-Jun drops to -$4.2k and 48.7% / 12.6%.
   - The 09:30 build-up is already a LIT level today: the 08:30-09:30 box (`ny830`) counts as swept liquidity in the live sweep set.
6. **Trendline / channel liquidity (TS): no.**
   - Definition used: the last low of a falling channel (two lower lows and two lower highs before it), or the mirror.
   - It changes the nearest swept level and the setups, and it is worse in both halves of 2026 (Jul-Oct 2-week passes 37.7%).
   - Only 2021-25 improves (+$15.8k).
7. "Session opens give the final inducement" was not tested separately. The opens as filters (PO3) were rejected earlier
   (`research/lit/sessions.md`).

## Caveats

- The halves are small. Jan-Jun has 80 live trades and Jul-Oct 40, and one trade can move a half by $3-4k.
- Every "more trades" result points the same way: Jul-Oct better, Jan-Jun worse. That looks like a regime difference between
  the halves, not an edge. A rule that only one half likes is what the pick/check split exists to catch.
- The overnight hold (an Asia entry held until 15:55) is assumed MFFU-compliant (flat before 16:10, nothing held through 17:00).
- If any of this were switched on, the live loop would need `engine/lit_live.py` to call `candidates(evening=True)`, the PC and
  NinjaTrader to run all night, and the Yahoo 1m feed to cover the evening. None of that is done, because nothing passed.

## Reproduce

- `python tools/lit_all_hours.py check`: parity with `lit_live` and `lit_2wk_rec`.
- `python tools/lit_all_hours.py grid`: the window and trades-rule variants.
- `python tools/lit_all_hours.py fbos`: the F-BoS and cycle variants.
- `ts_grid()` in the same file: the trendline variants.
- 1 process, about 40 s a variant. Candidates are cached in `research/runs/_cache/litallhours_*.pkl`.
