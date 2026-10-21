## What was tested

Today: stop to breakeven (entry + 1 tick) at **+1R**; **time stop** if not +0.5R after 30 minutes; **giveback** exit
when a trade that was +0.5R closes back through entry; flat by 15:55; close 5 minutes before high-impact news.

With 1 trade a day, management cannot change which trades are taken, so every variant was re-simulated bar by bar on
the exact replay's own trades with a copy of the engine's exit logic. The simulator reproduces all 768 baseline trades
exactly (exit, time, R, $), so these numbers are exact. The final candidate was also run as a full replay.

Tested before on the old settings: breakeven off / 0.75R / 1.5R, time stop 0 / 15 / 60, giveback off / 1R, partials
and trails (all rejected); earlier breakeven or nearer targets on trending days (0.5-0.75R, caps 1.5-2.5R) in
`study_regime_exits.py`. New here: later breakeven on trending days, profit locks, the time-stop threshold, the gap
"failure" exit.

## Results (exact, costs included, cold-streak filter on)

| Setting | 2026 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | 2021-25 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | back-to-back pass/fail | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Today** | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | baseline |
| No breakeven move | 89 | 2.16 | 2.54 | +$16.7k | −$3.1k | 13.6/0 · 20.9/0 | 679 | 3.17 | 1.11 | +$9.4k | −$11.9k | 4.2/3.9 · 6.5/8.9 | 9/18 | rejected |
| Breakeven at +0.75R | 89 | 2.16 | 3.27 | +$16.9k | −$2.6k | 14.6/0 · 21.8/0 | 679 | 3.17 | 1.06 | +$4.0k | −$10.9k | 3.3/2.1 · 4.8/6.1 | 6/18 | rejected |
| Breakeven at +1.25R | 89 | 2.16 | 3.47 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.01 | +$0.7k | −$11.7k | 3.3/2.3 · 4.7/5.3 | 7/19 | rejected |
| Breakeven at +1.5R | 89 | 2.16 | 3.15 | +$19.3k | −$3.1k | 19.4/0 · 27.2/0 | 679 | 3.17 | 1.03 | +$2.0k | −$11.8k | 3.4/2.3 · 4.9/5.3 | 6/18 | rejected |
| Breakeven at +2R | 89 | 2.16 | 2.68 | +$16.6k | −$3.1k | 13.6/0 · 19.9/0 | 679 | 3.17 | 1.07 | +$5.8k | −$11.5k | 4.2/2.3 · 6.2/6 | 6/18 | rejected |
| Trending days: breakeven at +0.75R | 89 | 2.16 | 3.5 | +$20.2k | −$2.6k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.07 | +$5.3k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | rejected |
| Trending days: breakeven at +1.5R | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.11 | +$8.0k | −$11.5k | 4.2/2.1 · 6.2/5.7 | 7/18 | promising |
| Trending days: breakeven at +2R | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.11 | +$8.0k | −$11.5k | 4.2/2.1 · 6.2/5.7 | 7/18 | promising |
| Trending days: breakeven at +2.5R | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.12 | +$9.2k | −$11.6k | 4.2/2.1 · 6.2/5.7 | 7/19 | promising |
| **Trending days: breakeven at +3R** | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.15 | +$11.2k | −$11.4k | 4.2/2.1 · 6.2/5.7 | 8/18 | promising |
| Trending days: +3R, exact replay | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.15 | +$11.2k | −$11.4k | 4.2/2.1 · 6.2/5.7 | 8/18 | promising |
| Trending days: never breakeven | 89 | 2.16 | 3.39 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.14 | +$11.0k | −$11.4k | 4.2/2.1 · 6.2/5.7 | 8/18 | promising |
| Lock +0.5R after +1.5R | 89 | 2.16 | 3.67 | +$21.5k | −$2.1k | 22.3/0 · 35/0 | 679 | 3.17 | 0.98 | −$1.1k | −$14.1k | 3.2/2 · 5.1/4.2 | 6/16 | rejected |
| Lock +0.5R after +2R | 89 | 2.16 | 3.37 | +$19.2k | −$2.2k | 17.5/0 · 28.2/0 | 679 | 3.17 | 1.0 | −$0.3k | −$12.3k | 3.1/2.1 · 4.6/4.7 | 5/17 | rejected |
| Lock +1R after +2R | 89 | 2.16 | 3.05 | +$17.2k | −$2.4k | 17.5/0 · 28.6/0 | 679 | 3.17 | 0.95 | −$3.6k | −$10.3k | 1.5/2.2 · 2.5/4.9 | 4/16 | rejected |
| Lock +1R after +3R | 89 | 2.16 | 3.32 | +$18.8k | −$2.4k | 17.5/0 · 28.2/0 | 679 | 3.17 | 1.06 | +$4.8k | −$10.3k | 3.1/1.8 · 4.6/4.9 | 6/17 | rejected |
| Lock +1.5R after +3R | 89 | 2.16 | 3.17 | +$17.6k | −$2.3k | 14.6/0 · 22.3/0 | 679 | 3.17 | 1.08 | +$5.9k | −$11.4k | 3.1/1.8 · 4.6/4.9 | 6/15 | rejected |
| No time stop | 89 | 2.16 | 3.29 | +$19.6k | −$3.0k | 19.4/0 · 27.2/0 | 679 | 3.17 | 1.04 | +$2.9k | −$13.8k | 4.1/3.1 · 6.5/8.2 | 6/20 | rejected |
| Time stop 15 min | 89 | 2.16 | 3.27 | +$18.2k | −$2.5k | 19.4/0 · 27.7/0 | 679 | 3.17 | 0.97 | −$1.8k | −$9.7k | 3.3/1.9 · 5.6/4.9 | 4/16 | rejected |
| Time stop 20 min | 89 | 2.16 | 3.28 | +$18.5k | −$2.8k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.04 | +$2.8k | −$11.6k | 4.1/2.1 · 5.7/4.6 | 6/16 | rejected |
| Time stop 45 min | 89 | 2.16 | 3.08 | +$17.6k | −$2.8k | 14.6/0 · 19.9/0 | 679 | 3.17 | 1.04 | +$3.0k | −$12.5k | 4.2/2.5 · 6.2/6.8 | 6/19 | rejected |
| Time stop 60 min | 89 | 2.16 | 3.33 | +$19.7k | −$2.8k | 19.4/0 · 27.2/0 | 679 | 3.17 | 1.06 | +$5.1k | −$12.8k | 4.2/2.6 · 6.4/6.9 | 7/19 | rejected |
| Time stop asks +0.25R | 89 | 2.16 | 3.35 | +$19.8k | −$2.8k | 19.4/0 · 27.2/0 | 679 | 3.17 | 1.02 | +$1.8k | −$12.9k | 4.1/2.9 · 6.1/7.5 | 6/18 | rejected |
| Time stop asks +1R | 89 | 2.16 | 3.48 | +$19.7k | −$2.5k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.02 | +$1.4k | −$11.7k | 3.3/2.1 · 4.6/5.5 | 5/17 | rejected |
| Giveback after +0.75R | 89 | 2.16 | 3.33 | +$20.5k | −$2.8k | 19.4/0 · 27.2/0 | 679 | 3.17 | 1.06 | +$5.0k | −$13.6k | 4.2/3.1 · 5.9/7.7 | 7/22 | rejected |
| Giveback after +1R | 89 | 2.16 | 3.12 | +$20.2k | −$2.7k | 19.4/0 · 26.7/0 | 679 | 3.17 | 1.02 | +$2.0k | −$11.4k | 3.6/3.4 · 5.9/7.3 | 7/20 | rejected |
| No giveback exit | 89 | 2.16 | 3.11 | +$20.1k | −$2.7k | 19.4/0 · 26.7/0 | 679 | 3.17 | 1.02 | +$1.9k | −$11.4k | 3.6/3.4 · 5.9/7.3 | 7/20 | rejected |
| Exit on a close back through the gap | 89 | 2.16 | 3.2 | +$18.7k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.04 | +$3.3k | −$10.4k | 2.8/1.9 · 4.7/4.9 | 7/15 | rejected |
| Keep trades open into news | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | no effect |

Trades are the same in every row: 89 in 2026 (2.16 a week), 679 in 2021-25 (3.17 a week).

## What it means

- **Breakeven at +1R, the 30-minute time stop and the +0.5R giveback are each at their best value** for all days.
  Moving any of them a little either way loses money in 2021-25 (be careful: 1.25R instead of 1R costs $5.8k in
  2021-25, so small changes here are noisy).
- **Profit locks** raise the win rate (to 28-35%) but cut the trades that would have gone on to the target: they
  lose in 2021-25 every time.
- **Trending days are the exception.** On days the market has been trending (10-day efficiency above 0.45; these
  trades already run at half size), moving the stop to breakeven at +1R cuts trades that would have reached the pool.
  Waiting longer helps 2021-25 steadily: +1.5R → +$1.5k, +2.5R → +$2.7k, +3R or never → +$4.5k to +$4.7k (no
  knife-edge). 2026 net is unchanged (+$20,114 vs +$20,111); its PF dips 3.48 → 3.39 only because one small 2026
  trade that now reaches its target (+2.98R instead of −0.02R, +$288) keeps the cold-streak filter from halving
  three May losers (−$283). Without the cold-streak filter the change is better in both periods (2026 PF
  3.07 → 3.10, 2021-25 PF 0.98 → 1.02).
- **Eval side effect on today's sizing:** evals are identical up to 1 month in 2026, but those $283 push evals
  started from mid-March to April 2026 over the limit in late May (2026 evals failed within 3 months 14.1% → 20.4%).
  With the sizing research's quarter size in cold streaks this disappears (no 2026 eval fails within 3 months
  either way) and the change adds +$4.8k to 2021-25 (run `combo_betrend3_risksizing`).
- **Why it works, and the honest caveat:** of the 30 trades it changes, 25 lose a little more (breakeven −0.02R
  becomes a giveback exit around −0.2R) and 5 win big (4 reach the target at +3 to +5R). The gain rests on those 5
  trades, so it is a modest, plausible edge, not a proven one. By year: 2021 +$1.9k, 2022 +$1.9k, 2023 −$0.1k,
  2024 +$1.1k, 2025 −$0.1k, 2026 $0.

## Verdict

- Keep breakeven at +1R, the 30-minute time stop and the giveback exit for normal days.
- **Candidate:** on trending days, move to breakeven only at +3R (`be_at_r_trending: 3`). It is the only
  management change that adds money in 2021-25 without taking any from 2026. Adopt it together with the sizing
  change (quarter size in cold streaks); on today's sizing alone it adds late-May 2026 eval fails, so then keep
  breakeven at +1R everywhere. Easy to port: the Pine script already computes the 10-day efficiency for the
  half-size rule.
