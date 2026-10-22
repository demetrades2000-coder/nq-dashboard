## The question

The bot keeps a small database of its own paper and live trades (`data/memory.db`). At the start of every backtest the
exit learner can be "seeded" from it (`memory_seed`), and during a run it can start acting on extra exit signals once
they have proven themselves (`exit_learn`). If the database held trades from the future (for example October 2026 paper
trades) and a 2022 backtest could read them, the old years would look better than they really were. The cloud monitor on
GitHub has no `memory.db` at all, so a difference here would also mean the PC bot and the cloud bot trade differently.

## What the code does

- The backtest **does open** `data/memory.db` (it exists in this checkout: 1 paper trade from 2026-10-15).
- It only reads trades that **closed before the first bar of the window** being tested. For a 2022 session that is a
  date in 2022, so October 2026 paper trades can never reach it. The rule is written into the database query itself.
- Backtest trades are never written into the database (`memory_write_backtest` is off), and only paper/live trades
  are ever used for seeding.
- The exit learner only acts on a signal after **20 finished trades** where that signal fired, with an average gain of
  at least +0.2R. The live loop re-runs the engine on the last 20 days for every session, which holds at most ~14
  trades, so inside a replay it can never reach 20. Only a seeded memory could switch it on.

## What the replays show (exact live-loop replay, costs included)

| Run | 2026 trades | 2026 PF | 2026 net | 2021-25 trades | 2021-25 PF | 2021-25 net | Same trades as baseline? |
|---|---:|---:|---:|---:|---:|---:|---|
| Live strategy (baseline) | 89 | 3.48 | +$20,111 | 679 | 1.09 | +$6,491 | - |
| Trade memory off | 89 | 3.48 | +$20,111 | 679 | 1.09 | +$6,491 | yes, all 768 |
| Exit learner off | 89 | 3.48 | +$20,111 | 679 | 1.09 | +$6,491 | yes, byte for byte |
| Both off (leak-free) | 89 | 3.48 | +$20,111 | 679 | 1.09 | +$6,491 | yes, all 768 |

With the memory off, the only difference in the stored records is the 15th decimal of the recorded VIX value on 5 trades:
`data/VIX_1d.csv` was rewritten by the dashboard's VIX download between the two runs. Entries, exits, sizes and P&L are
identical.

## Other things checked

- **Hourly bars:** the 1H file (used for 1H swing pools and the 1H trend) matches the 5-minute file exactly in every
  year, and only closed hourly bars are used.
- **VIX, GEX, news:** VIX and GEX use the previous session's value; news uses the published calendar times. None of
  them can see the day being traded.
- **Fast research tools** used in the other write-ups were checked against the replay: the exit re-simulator
  reproduces all 768 baseline trades exactly (and all 768 trades of the replay with the recommended breakeven
  change), and the one-pass backtest matches 766 of 768 baseline trades.
- **Engine edits:** after adding the new research options (all off by default), the baseline replay was re-run from
  scratch: the same 768 trades and the same numbers.

## Verdict

- **No leakage.** All results in the trade-construction research use the live settings unchanged; the leak-free setting
  gives the same trades.
- **One thing to watch later:** once the PC's `memory.db` has 20+ paper trades for one exit signal with a good average,
  the PC bot could start using an extra exit that the cloud monitor (no database) and every backtest never use. If you
  want the PC, the cloud and the backtests to stay identical, set `memory_seed: false` in `live_model.json`. Today it
  changes nothing.
