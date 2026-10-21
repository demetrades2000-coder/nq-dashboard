## What was tested

Today the stop sits **2 points beyond the sweep extreme** (the low before the IFVG for a long). It is widened to at
least 10 points; above 60 points the bot uses the far side of the inverted gap if that fits, otherwise it skips.
Size always follows the stop ($800 risk up to a 20-point stop, less above).

Every variant keeps the rule "stop beyond the sweep extreme" (the owner's hard rule) and only changes how far beyond,
and the limits. These change which trades are taken, so they were run with the fast one-pass 5-year backtest
(it matches the exact live replay on 766 of 768 trades) and compared with the same backtest of today's rules.

Tested before on the old settings (2-a-day, $350 risk, grade sizing): max stop 45 / 80 / 100, min stop 15, a 3-point
buffer and the gap stop were all rejected; fixed 10-15 point stops lose money. This is the first test on today's
settings, plus a new idea: a buffer that grows with volatility (a share of the 5-minute ATR, new engine option
`stop_buf_atr`, off by default).

## Results (costs included, cold-streak filter on)

| Setting | 2026 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | 2021-25 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | back-to-back pass/fail | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Today: 2 pts beyond, 10-60 pts** | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.11 | +$8.8k | −$11.6k | 4.7/2 · 6.6/5.6 | 7/18 | yardstick |
| 1 pt beyond the sweep | 91 | 2.21 | 3.08 | +$17.6k | −$3.1k | 15/0 · 22.8/0 | 700 | 3.22 | 1.08 | +$6.0k | −$12.5k | 4.5/2.1 · 6.3/5.7 | 8/18 | rejected |
| 3 pts beyond | 86 | 2.09 | 3.38 | +$18.6k | −$2.6k | 17/0 · 24.8/0 | 682 | 3.14 | 1.1 | +$7.4k | −$9.6k | 4.3/1.7 · 6.4/3.4 | 7/17 | rejected |
| 4 pts beyond | 80 | 1.94 | 3.08 | +$14.1k | −$2.1k | 9.7/0 · 16.5/0 | 674 | 3.1 | 1.07 | +$4.9k | −$8.6k | 3.1/2 · 5/4.1 | 6/15 | rejected |
| 6 pts beyond | 75 | 1.82 | 2.94 | +$11.5k | −$1.7k | 9.2/0 · 15/0 | 656 | 3.02 | 0.95 | −$3.2k | −$11.5k | 1.9/0.6 · 3/3.3 | 5/14 | rejected |
| 0.10 x ATR beyond | 83 | 2.01 | 2.81 | +$14.7k | −$3.8k | 13.6/0 · 19.9/0 | 681 | 3.13 | 1.1 | +$7.6k | −$9.6k | 3.9/2.1 · 6.2/5.1 | 8/17 | rejected |
| 0.15 x ATR beyond | 76 | 1.84 | 3.71 | +$17.4k | −$2.1k | 15.5/0 · 24.3/0 | 666 | 3.06 | 1.14 | +$10.1k | −$8.7k | 3.8/1.8 · 5.4/3.9 | 6/14 | rejected |
| 0.15 x ATR beyond, exact replay | 76 | 1.84 | 3.74 | +$17.6k | −$2.1k | 15.5/0 · 24.3/0 | 654 | 3.05 | 1.1 | +$6.9k | −$9.4k | 3.2/1.9 · 4.9/3.9 | 6/15 | rejected |
| 0.25 x ATR beyond | 70 | 1.7 | 3.09 | +$10.2k | −$2.0k | 9.2/0 · 14.6/0 | 643 | 2.96 | 1.05 | +$3.4k | −$11.9k | 2.9/1.1 · 4.3/3 | 5/14 | rejected |
| 0.5 x ATR beyond | 58 | 1.41 | 2.29 | +$4.9k | −$1.1k | 0/0 · 0/0 | 557 | 2.56 | 1.05 | +$2.4k | −$7.8k | 0.9/0 · 2.9/0.5 | 3/9 | rejected |
| 0.10 x ATR, widest 70 | 96 | 2.33 | 3.11 | +$15.4k | −$3.0k | 18/0 · 26.7/0 | 716 | 3.29 | 1.16 | +$11.4k | −$12.0k | 5.6/1.3 · 7.5/3.6 | 9/15 | rejected |
| 0.15 x ATR, widest 70 | 94 | 2.28 | 3.2 | +$15.9k | −$2.8k | 15.5/0 · 24.3/0 | 703 | 3.23 | 1.14 | +$9.3k | −$11.7k | 5/1 · 7.5/3.5 | 9/17 | rejected |
| 0.15 x ATR, widest 80 | 103 | 2.5 | 3.19 | +$15.1k | −$2.9k | 15.5/0 · 24.3/0 | 735 | 3.38 | 1.11 | +$7.2k | −$13.0k | 5.5/0.6 · 7.6/2.8 | 7/15 | rejected |
| Widest stop 45 | 63 | 1.53 | 3.06 | +$14.9k | −$2.7k | 16/0 · 22.8/0 | 570 | 2.62 | 0.93 | −$5.4k | −$14.7k | 3.3/3 · 4/5.6 | 6/20 | rejected |
| Widest stop 50 | 70 | 1.7 | 3.42 | +$17.5k | −$2.9k | 21.8/0 · 31.6/0 | 625 | 2.87 | 1.03 | +$2.7k | −$12.7k | 4.8/3.1 · 6.9/6 | 8/20 | rejected |
| Widest stop 70 | 100 | 2.43 | 3.13 | +$17.7k | −$2.8k | 18.4/0 · 26.7/0 | 728 | 3.35 | 1.09 | +$6.4k | −$14.2k | 5.3/1.8 · 7.2/5.3 | 9/17 | rejected |
| Widest stop 80 | 111 | 2.69 | 3.37 | +$19.0k | −$2.6k | 18.4/0 · 27.7/0 | 750 | 3.45 | 1.07 | +$5.1k | −$13.8k | 5.2/1.1 · 7.5/4.1 | 8/15 | rejected |
| Tightest stop 8 | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.1 | +$8.1k | −$11.6k | 4.6/2 · 6.1/5.6 | 7/18 | rejected |
| Tightest stop 12 | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.09 | +$6.9k | −$11.6k | 4.6/2 · 6.5/5.6 | 7/18 | rejected |
| Tightest stop 15 | 89 | 2.16 | 3.2 | +$17.9k | −$2.7k | 17.5/0 · 27.7/0 | 691 | 3.18 | 1.07 | +$5.2k | −$11.9k | 4.5/1.9 · 6/6.5 | 6/17 | rejected |
| Stop beyond the gap (check) | 91 | 2.21 | 3.08 | +$19.5k | −$2.7k | 15/0 · 20.9/0 | 710 | 3.27 | 0.99 | −$1.3k | −$17.1k | 4.7/4.1 · 6.6/9.3 | 7/21 | rejected |

(One-pass backtest numbers, except the "exact replay" row; the exact live replay of today's rules is 2026 PF 3.48 /
+$20.1k and 2021-25 PF 1.09 / +$6.5k. Compare each one-pass row with the first row, and the exact-replay row with
the replay. The exact replay of the most tempting variant, 0.15 x ATR, agrees with the one-pass result: 2026 drops to
76 trades (1.84 a week) and +$17.6k, 2021-25 is about the same as today (+$6.9k vs +$6.5k, PF 1.10 vs 1.09).)

## What it means

- **2 points beyond the extreme is the sweet spot.** 1 point gets wicked out more (PF falls in both periods). Every
  extra point of room makes more stops too wide for the 60-point limit, so trades disappear (4 points: 1.9 a week in
  2026) and 2026 profit falls.
- **The ATR buffer does not hold up.** 0.15 x ATR looked good on PF (3.71 / 1.14) but only by skipping trades
  (1.8 a week in 2026), and its neighbours 0.10 and 0.25 are clearly worse: a knife-edge, not a real effect. Allowing
  70-80 point stops to win the trades back gives the 2021-25 gain but costs $4k in 2026.
- **The 60-point limit is right.** 45 or 50 cuts good trades and frequency; 70 or 80 adds trades (up to 2.7 a week and
  88% of 2026 weeks with 2+) that roughly break even after the size cut. If the owner ever wants more trades a week,
  "widest stop 80" is the cheapest way to get them (2026 −$0.9k, 2021-25 −$3.7k).
- **The 10-point floor barely matters** (8 and 12 change a few 2021-25 trades); 15 is worse.
- **Stops beyond the gap** (closer) lose money over 2021-25: the sweep extreme is the right invalidation.

## Verdict

Keep the stop exactly as it is: 2 points beyond the sweep extreme, 10-60 points, gap fallback above 60. Not one
variant beat it in both periods. The new `stop_buf_atr` option stays in the engine switched off.
