# Archive: the previous strategy (Liquidity Engine, eval mode)

LIT has been the live paper strategy since 2026-10-18. The Liquidity Engine is not deleted: it keeps running as a paper
shadow in the cloud monitor (README section "Old strategy (shadow, paper)", no alerts), and everything needed to bring it
back is listed here.

## What it did, in plain words

- **Market:** NQ futures traded as MNQ micros ($2 a point) on 5-minute candles, New York time.
- **Setup:** from 08:00 ET it waits for price to run a liquidity pool (an old high or low: prior day, prior week,
  overnight, London, Asia, 1-hour swings, equal highs/lows). A swept low arms a long, a swept high arms a short.
- **Entry:** only in the New York killzones (09:30-11:30 and 13:30-15:30 ET), on an inverted fair value gap (IFVG) of the
  leg into the sweep, or a CISD when that leg has no gap. A small confluence score (1-hour trend, premium/discount, clean
  path, late entry) has to be at least 1.
- **Stop:** beyond the sweep extreme + 2 points, 10 to 60 points.
- **Target:** the nearest untaken major pool at least 1.5R away; profit banked at 5R when the pool is farther. No major
  pool in range means no trade.
- **Management:** breakeven at +1R (+3R on trending days), out after 30 minutes if not +0.5R, out on a giveback through the
  entry, flat by 15:55, one trade a day.
- **Size:** $800 of risk up to a 20-point stop, $800 x 20 / stop beyond it, at most 40 micros. Half size on a trending day,
  half size on a late entry, and a **cold-streak filter**: when the last 15 finished signals add up to 0R or less, every
  trade is still taken at a quarter of the size until the record turns positive again.
- **Eval timing:** the dashboards showed GO / WAIT for buying an MFFU eval from the cold-streak state (best within 5
  sessions of the switch back to full size, never in a cold streak).

## Its numbers (exact live-loop replay, costs included, run `baseline`)

| | 2026 (Jan 2 - Oct 16) | 2021-25 | All 5 years |
|---|---:|---:|---:|
| Trades | 89 (2.16 a week) | 679 (3.17 a week) | 768 (3.0 a week) |
| Profit factor | 3.94 | 1.27 | 1.54 |
| Net | +$20,487 ($2,088 a month) | +$16,379 ($321 a month) | +$36,866 ($606 a month) |
| Max drawdown | -$2,249 | -$9,265 | -$9,265 |
| MFFU eval pass / fail within 2 weeks | 20.4% / 0.0% | 4.1% / 1.9% | 6.7% / 1.6% |
| MFFU eval pass / fail within 1 month | 34.0% / 0.0% | 8.8% / 5.2% | 13.1% / 4.4% |
| Back-to-back evals (passed / failed) | 4 / 1 | 8 / 10 | 12 / 11 |

The morning lock of 2026-10-17 (half size in cold streaks, breakeven at 1R every day) is run `live_2026-10-17am`:
2026 PF 3.48 +$20.1k, 2021-25 PF 1.09 +$6.5k, 5 years PF 1.32 +$26.6k. The honest 2021-25 range of the evening lock is
+$8k to +$17k (the cold-streak lookback of 15 is a ridge; see the parameter-robustness write-up).

Monte Carlo of the MFFU Builder 50K eval on this strategy (4,000 resampled paths, all years, 5-session blocks): pass /
fail within 2 weeks 6.5% / 0.9%, within 60 sessions 35.4% / 30.2%, median 28 sessions to pass. Stored as
`research/archive/engine-2026-10-17/montecarlo.json` (the Archive pages read it).

## Where its files are

| What | File |
|---|---|
| The lock (settings) | `live_model_engine.json` (it was `live_model.json` until 2026-10-18) |
| The rules, word for word | `STRATEGY.md`, section "Previous strategy (shadow): Liquidity Engine, eval mode" |
| The code | `engine/model.py` (setups), `engine/equity_filter.py` (cold-streak filter, eval timing), `engine/sizing.py` (size rules) |
| Its last dashboard bundle (5-year replay, every trade with its report) | `research/lab/backtest_engine.json` |
| Monte Carlo and intraday heat (as the dashboards showed them on Oct 17) | `research/archive/engine-2026-10-17/montecarlo.json`, `intraday_heat.json` |
| Stored runs | `research/runs/baseline.json` (the evening lock), `research/runs/live_2026-10-17am.json` (the morning lock); every engine experiment is in `research/runs/` (ids without the `lit` prefix) |
| Older variant table and study trades | `research/lab/variant_results.json`, `research/study/` |
| TradingView port | `tradingview/liquidity_engine.pine` (+ `tradingview/BRIDGE_SETUP.md`, `research/PINE_PARITY.md`) |
| Write-ups | `research/writeups/` (everything without the `lit-` prefix: risk-summary, trade-construction-summary, monte-carlo-evals, eval-game, parameter-robustness, ...) |
| Live-loop harness | `tests/test_live_dryrun.py` (pinned to this engine), `tools/runlib.py baseline` (its replay) |

## How to switch back to it

1. Copy the lock over the live settings: `cp live_model_engine.json live_model.json` (keep `live_model_lit.json` as
   LIT's lock, so LIT can come back the same way).
2. Re-export the dashboard bundle: `python tools/export_backtest.py` (about 1 minute; it writes
   `research/lab/backtest_live.json` for the engine, because `live_model.json` now says `"model": "engine"`).
3. Put its research files back for the dashboards: `cp research/archive/engine-2026-10-17/montecarlo.json
   research/archive/engine-2026-10-17/intraday_heat.json research/lab/` (`python tools/research_mc.py all` and
   `python tools/research_intra.py` rebuild them, into this folder, from the engine replay).
4. Re-run the replays file: `python tools/export_replays.py`, then check the live loop:
   `python -X utf8 -m tests.test_live_dryrun --quick` (expected 41/44).
5. Commit and merge to the default branch: the cloud monitor reads `live_model.json` on its next run; the PC bot runs it
   with `"model": "engine"` in its start settings.

To go back to LIT afterwards: `cp live_model_lit.json live_model.json`, then `python tools/export_backtest.py` and
`python tools/lit_dash_data.py`.

Paper only either way: neither strategy ever places a real order.
