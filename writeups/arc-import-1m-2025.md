# Importing 2025 NQ 1-minute bars: readiness and steps

Written 2026-10-20. Status: **ready**. The dry-run passes on real 2026 chunks and on its own self-test. No 2025 1m file
exists yet: the owner has to export it from TradingView on the PC.

## Why it matters

LIT executes on 1-minute bars: the 1m CISD after the limit tap, the fill price and the 15-minute check. In 2026 the 1m
data is worth most of the result: +$43.4k with 1m, about +$6.6k on 5m only. Before 2026 there is no 1m data, so every
"2021-25 reference" number (PF 1.01, +$1,211, DD -$19,436) is a 5m-only replay and probably reads LIT too low. With 2025
on 1m, the reference year gets judged the way 2026 is.

The engine picks up the new bars by itself. `engine/lit.bars_1m` runs a day on 1m when at least 97% of its 5-minute
windows have five clean 1m bars that rebuild the 5m bar. Other days fall back to 5m. No code change is needed.

## What to export (owner, on the PC)

- TradingView, symbol **CME_MINI:NQ1!**, **1-minute** chart, **B-ADJ off** (raw front month; the importer applies
  `data/NQ_rolls.json` itself), extended hours on.
- Bar Replay chunks of two weeks each, the same way as the 2026 files `data/tv_exports/NQ1_1m_chunk_2026-*.csv`
  (~13,900 bars per chunk). 2025 needs about **26 chunks**; 2021-24 would need ~104 more.
- After each "Export chart data": `python tools/grab_tv_export.py NQ1_1m_chunk_2025-MM-DD` (it copies the newest download
  into `data/tv_exports/`).

## Dry-run first (never writes data/)

> _Code omitted on the public site._

This runs the real importer (`data/import_futures.py` `_finish`) on a temp copy of `data/` and reports:

| Check | What it means |
|---|---|
| source | each file is a 1-minute export, with its ET range |
| price space | the importer's own guard: within 5 pts of the 5m file in every session. A B-ADJ-on export or the wrong contract is refused here (tested with a +300 pt shift) |
| 5m rewrite | a 1m import also rewrites NQ_5m / 15m / 1h on the same days. Expect 0 changed bars, as in the 2026 test |
| coverage | how many imported days reach the 97% rule and so will run on 1m |
| cache | see below |

`python -X utf8 tools/import_1m_dryrun.py` with no file is a self-test. It cuts Feb 2026 out of the copy and imports it
back. Result 2026-10-20: 27,358 bars round-trip identical, 0 5m bars changed, 20/20 days on 1m. Two real chunks
(2026-02-09, 2026-02-23) also passed: 21/21 days on 1m. `tests/test_import_1m_dryrun.py` checks all of this.

## The real import

1. Stop the PC bot (UPDATE-style quiet hours, never during a session).
2. For each chunk, oldest first: `python data/import_futures.py csv NQ data/tv_exports/NQ1_1m_chunk_2025-MM-DD.csv`.
   The dashboard's TradingView import does the same.
3. **Clear the replay caches.** `tools/runlib._data_key` keys the caches on the NQ_5m.csv size only, and a 1m import that
   changes no 5m bar leaves that size the same. Delete `research/runs/_cache/litfinal_*.pkl` and
   `research/runs/_cache/lit_2wk_unit_*.json`, or the replays keep using the old 5m-only executions.
4. `python -X utf8 tools/data_check.py`: it should still show nothing to fix.
5. Rerun: `python tools/lit_losses.py live` (run `lit_live`), `python tools/export_backtest.py`,
   `python -X utf8 tools/lit_eval_sample.py`, `tools/lit_dash_data.py`.
6. `python -X utf8 -m tests.test_golden` will now fail on the **2021-25** numbers (2026 must not move). Read the diff, then
   `--update` and commit it together with a write-up of the new 2021-25 reference line.

## What does not change

The live strategy, its 2026 numbers and the owner's rule stay as they are: LIT is judged on 2026, and 2021-25 is a
reference line, never a gate. The import only makes that reference line honest.
