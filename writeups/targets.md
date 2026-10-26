## What was tested

Today the target is the **nearest untaken major pool at least 1.5R away**, with the exit order 1 tick in front of it.
When that pool is more than 5R away the trade still aims at it but banks at **5R**. No major pool in range = no trade.

- **Minimum distance** of the pool: 1.2R, 2R, 2.5R, 3R (changes which trades are taken: one-pass 5-year backtest).
- **Banking cap**: 3R, 4R, 6R, 8R (one-pass backtest).
- **Aim for the second major pool** instead of the first (one-pass backtest).
- **Fill rules**: the target needs 0 or 2 ticks of trade-through instead of 1, or the exit sits 4 / 8 / 16 ticks
  (1 / 2 / 4 points) in front of the pool. These cannot change which trades are taken, so they were re-simulated on
  the exact replay's own trades (the simulator reproduces all 768 baseline trades exactly).

Tested before on the old settings: min 1R / 2R, caps 3R / 8R, nearest-any-pool and fixed 2R / 3R targets (all
rejected), and on today's settings: no cap, the draw mode and "last real pool" (2026 PF 1.6-2.2).

## Results (costs included, cold-streak filter on)

| Setting | 2026 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | 2021-25 trades | /wk | PF | net | max DD | eval pass/fail % 2 wk · 3 wk | back-to-back pass/fail | status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Today, exact replay** | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | baseline |
| **Today, one-pass yardstick** | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 691 | 3.18 | 1.11 | +$8.8k | −$11.6k | 4.7/2 · 6.6/5.6 | 7/18 | yardstick |
| Pool at least 1.2R away | 89 | 2.16 | 3.26 | +$17.9k | −$2.2k | 14.6/0 · 20.9/0 | 712 | 3.28 | 1.01 | +$0.5k | −$14.1k | 2.8/2.2 · 4.2/6.1 | 6/17 | rejected |
| Pool at least 2R away | 86 | 2.09 | 3.33 | +$19.2k | −$3.1k | 19.4/0 · 28.2/0 | 665 | 3.06 | 1.04 | +$3.0k | −$9.4k | 4/2.7 · 5.5/4.9 | 6/16 | rejected |
| Pool at least 2.5R away | 85 | 2.06 | 3.32 | +$18.7k | −$3.1k | 17/0 · 24.8/0 | 618 | 2.84 | 1.03 | +$2.4k | −$9.3k | 4.7/2.5 · 6.4/4.6 | 7/17 | rejected |
| Pool at least 3R away | 83 | 2.01 | 3.3 | +$18.7k | −$3.2k | 17/0 · 24.8/0 | 584 | 2.69 | 1.0 | −$0.3k | −$11.4k | 3.9/3 · 5.8/6.5 | 6/17 | rejected |
| Bank at 3R | 95 | 2.31 | 2.24 | +$11.8k | −$2.3k | 2.9/0 · 10.7/0 | 725 | 3.33 | 1.06 | +$4.7k | −$10.9k | 2.1/2.3 · 4.4/5.3 | 7/17 | rejected |
| Bank at 4R | 93 | 2.26 | 2.62 | +$15.2k | −$2.8k | 13.6/0 · 20.9/0 | 702 | 3.23 | 1.08 | +$6.0k | −$11.9k | 3.8/2.2 · 5.7/5.4 | 8/17 | rejected |
| Bank at 6R | 86 | 2.09 | 2.65 | +$13.3k | −$2.6k | 7.8/0 · 14.6/0 | 684 | 3.15 | 1.12 | +$9.2k | −$10.7k | 4.7/1.7 · 7/4.2 | 7/17 | rejected |
| Bank at 8R | 85 | 2.06 | 2.86 | +$15.0k | −$2.6k | 7.8/0 · 14.1/0 | 670 | 3.08 | 1.14 | +$10.1k | −$11.4k | 5.2/1.7 · 7/4.2 | 7/17 | rejected |
| Bank at 8R, exact replay | 85 | 2.06 | 2.88 | +$15.2k | −$2.6k | 7.8/0 · 14.1/0 | 658 | 3.07 | 1.11 | +$8.0k | −$11.3k | 4.6/1.8 · 6.4/4.3 | 7/17 | rejected |
| Second major pool | 83 | 2.01 | 3.7 | +$18.3k | −$3.0k | 16/0 · 24.8/0 | 626 | 2.88 | 1.04 | +$3.0k | −$9.8k | 5.1/2.2 · 7.1/5.2 | 9/18 | rejected |
| Fill on touch (0 ticks) | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | no effect |
| Fill after 2 ticks | 89 | 2.16 | 3.48 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.09 | +$6.5k | −$11.4k | 4.1/2.1 · 6.1/5.7 | 7/18 | no effect |
| Exit 4 ticks in front | 89 | 2.16 | 3.47 | +$20.1k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.08 | +$6.0k | −$11.4k | 4/2.1 · 6/5.7 | 7/18 | rejected |
| Exit 8 ticks in front | 89 | 2.16 | 3.46 | +$20.0k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.07 | +$5.3k | −$11.5k | 4/2.1 · 6/5.2 | 6/17 | rejected |
| Exit 16 ticks in front | 89 | 2.16 | 3.45 | +$19.9k | −$2.7k | 19.4/0 · 28.2/0 | 679 | 3.17 | 1.05 | +$4.2k | −$11.6k | 4/2.2 · 6/6.1 | 6/18 | rejected |

The "pool at least ...", "bank at ..." and "second major pool" rows are one-pass backtests: compare them with the
yardstick row. The fill and "in front" rows are exact (re-simulated on the replay's trades), and "bank at 8R, exact
replay" is a full live-loop replay: it agrees with the one-pass result (2026 falls by $4.9k to +$15.2k, PF 2.88;
2021-25 rises by $1.5k to +$8.0k, PF 1.11).

## What it means

- **2026's profit is a handful of big winners that reach far pools.** Any cap below 5R cuts them: banking at 3R
  takes 40% off 2026 profit (PF 3.45 → 2.24 on the same backtest) and still does not help 2021-25.
- **Letting winners run past 5R** helps 2021-25 a little (+$0.4k to +$1.3k against the yardstick, +$1.5k in the exact
  replay of 8R) but costs 2026 $5-7k: 5R is the balance point between the two periods.
- **Asking for a farther pool (2-3R) or the second pool** loses the trades with a near draw that pay well in 2021-25.
  1.2R lets in trades whose reward is too small for the costs.
- **Exiting in front of the pool does not catch more winners.** Few trades stall within 1-4 points of the pool;
  most either touch it or turn well before it. Each extra tick in front just gives away a little on every winner.

## Verdict

Keep the target exactly as it is: nearest major pool at least 1.5R away, exit 1 tick in front, bank at 5R on the way
to a farther draw, no trade without a major pool.
