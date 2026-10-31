# NQ 1-minute data (TradingView NQ1!, 2026)

Generated 2026-10-23 18:04 by `python tools/stitch_tv_1m.py` (re-runnable as chunks are added).

**Source:** CME_MINI:NQ1! 1-minute, ETH, exported from the user's TradingView (layout "Liquidity Engine Bot") via Bar Replay + Download chart data. Official CME futures data only.

**Files:** `data/clean/NQ_1m_tv.csv` (authoritative) = `data/NQ_1m.csv` (installed copy). Columns `time,open,high,low,close,volume`; `time` = bar open, UNIX seconds UTC (same convention as `data/NQ_5m.csv`); volume in NQ contracts.

## Coverage

- First bar 2025-12-28 18:00 ET, last bar 2026-10-16 16:59 ET
- Sessions (CME trading days, 18:00 ET -> 17:00 ET): **209**, first **2025-12-29**, last **2026-10-16**
- Rows: 286,503
- Weekdays with no session: 1 (1 exchange holiday(s): 2026-01-01 NewYear; 0 unexplained: none)
- Sessions not fully clean: 0 (listed below; holiday early closes are expected)

| month | sessions | bars | missing_inside | days_with_gaps | holiday_sessions | not_ok_days | contracts |
|---|---|---|---|---|---|---|---|
| 2025-12 | 3 | 4140 | 0 | 0 | 0 | 0 | NQH26 |
| 2026-01 | 21 | 28739 | 1 | 0 | 1 | 0 | NQH26 |
| 2026-02 | 20 | 27358 | 2 | 0 | 1 | 0 | NQH26 |
| 2026-03 | 22 | 30359 | 1 | 0 | 0 | 0 | NQH26/NQM26 |
| 2026-04 | 22 | 29888 | 7 | 0 | 1 | 0 | NQM26 |
| 2026-05 | 21 | 28740 | 0 | 0 | 1 | 0 | NQM26 |
| 2026-06 | 22 | 30120 | 0 | 0 | 1 | 0 | NQM26/NQU26 |
| 2026-07 | 23 | 31499 | 1 | 0 | 1 | 0 | NQU26 |
| 2026-08 | 21 | 28980 | 0 | 0 | 0 | 0 | NQU26 |
| 2026-09 | 22 | 30120 | 0 | 0 | 1 | 0 | NQU26/NQZ26 |
| 2026-10 | 12 | 16560 | 0 | 0 | 0 | 0 | NQZ26 |

`missing_inside` = 1-minute slots without a bar between a session's first and last bar. NQ prints every minute in practice, so a few per month are minutes with no trade; `gaps` status needs > 2% of the session missing.

### Sessions with flags

none

### Holiday sessions (shortened by the exchange; kept, not flagged)

| day | holiday | bars | expected | first_et | last_et | missing_at_close |
|---|---|---|---|---|---|---|
| 2026-01-19 | MLK | 1140 | 1380 | Sun 18:00 | Mon 12:59 | 240 |
| 2026-02-16 | Presidents | 1138 | 1380 | Sun 18:00 | Mon 12:59 | 240 |
| 2026-04-03 | GoodFriday | 909 | 1380 | Thu 18:00 | Fri 09:14 | 465 |
| 2026-05-25 | Memorial | 1140 | 1380 | Sun 18:00 | Mon 12:59 | 240 |
| 2026-06-19 | Juneteenth | 1140 | 1380 | Thu 18:00 | Fri 12:59 | 240 |
| 2026-07-03 | July4 | 1139 | 1380 | Thu 18:00 | Fri 12:59 | 240 |
| 2026-09-07 | Labor | 1140 | 1380 | Sun 18:00 | Mon 12:59 | 240 |

## Price space / rolls

Back-adjusted (additive) to NQZ26 exactly like `data/NQ_5m.csv`: switch times and gaps come from `data/NQ_rolls.json`; bars before a switch get +gap (cumulative). Bars since the 2026-09-14 18:00 ET switch are exact exchange prices. Raw (unadjusted) price = adjusted - sum of the gaps of the rolls after the bar.

The 1m open jump at each switch equals the 5m open_jump in NQ_rolls.json, i.e. TradingView switched contracts at the same bar on both timeframes:

| roll | switch_et | bar_at_switch | jump_1m | jump_5m | match | gap_applied | gap_method | gap_unc |
|---|---|---|---|---|---|---|---|---|
| NQH26->NQM26 | 2026-03-16 18:00 | True | 215.25 | 215.25 | True | 215.25 | open_jump | 4.0 |
| NQM26->NQU26 | 2026-06-14 18:00 | True | 513.25 | 513.25 | True | 289.25 | carry_model | 15.17 |
| NQU26->NQZ26 | 2026-09-14 18:00 | True | 294.75 | 294.75 | True | 294.75 | open_jump | 4.0 |

## Verification against data/NQ_5m.csv

The 1m series resampled to 5m (`data_audit.resample`) vs the existing 5m file on the same bars (pass: |median close diff| <= 0.125, p90 |close diff| <= 0.25).

```
{
 "bars_5m_compared": 57303,
 "ref_5m_bars_in_span": 57303,
 "ref_5m_bars_missing_from_1m": 0,
 "resampled_5m_bars_not_in_ref": 0,
 "close_diff_median": 0.0,
 "close_absdiff_p90": 0.0,
 "close_absdiff_p99": 0.0,
 "close_absdiff_max": 0.0,
 "exact_match_pct": {
  "open": 100.0,
  "high": 100.0,
  "low": 100.0,
  "close": 100.0
 },
 "volume_exact_pct": 100.0,
 "volume_sum_ratio_1m_over_5m": 1.0,
 "bars_close_off_by_more_than_0.25": 0,
 "days_with_close_mismatch": {}
}
```

## Harvest

- 21 export files, 297,234 rows before de-duplication; 10,731 overlapping timestamps; 0 of them disagree between files (per column: {"open": 0, "high": 0, "low": 0, "close": 0, "volume": 0}). Skipped (no Volume column): none.
- Sanitize dropped 0 rows.

| file | bars | from_et | to_et |
|---|---|---|---|
| NQ1_1m_chunk_2026-01-12.csv | 12779 | 2025-12-28 18:00 | 2026-01-11 23:59 |
| NQ1_1m_chunk_2026-01-26.csv | 13920 | 2026-01-11 18:00 | 2026-01-25 23:59 |
| NQ1_1m_chunk_2026-02-09.csv | 14160 | 2026-01-25 18:00 | 2026-02-08 23:59 |
| NQ1_1m_chunk_2026-02-23.csv | 13918 | 2026-02-08 18:00 | 2026-02-22 23:59 |
| NQ1_1m_chunk_2026-03-09.csv | 14160 | 2026-02-22 18:00 | 2026-03-08 23:59 |
| NQ1_1m_chunk_2026-03-23.csv | 14159 | 2026-03-08 18:00 | 2026-03-22 23:59 |
| NQ1_1m_chunk_2026-04-06.csv | 13689 | 2026-03-22 18:00 | 2026-04-05 23:59 |
| NQ1_1m_chunk_2026-04-20.csv | 14160 | 2026-04-05 18:00 | 2026-04-19 23:59 |
| NQ1_1m_chunk_2026-05-04.csv | 14159 | 2026-04-19 18:00 | 2026-05-03 23:59 |
| NQ1_1m_chunk_2026-05-18.csv | 14160 | 2026-05-03 18:00 | 2026-05-17 23:59 |
| NQ1_1m_chunk_2026-06-01.csv | 13920 | 2026-05-17 18:00 | 2026-05-31 23:59 |
| NQ1_1m_chunk_2026-06-15.csv | 14160 | 2026-05-31 18:00 | 2026-06-14 23:59 |
| NQ1_1m_chunk_2026-06-29.csv | 13920 | 2026-06-14 18:00 | 2026-06-28 23:59 |
| NQ1_1m_chunk_2026-07-13.csv | 13919 | 2026-06-28 18:00 | 2026-07-12 23:59 |
| NQ1_1m_chunk_2026-07-27.csv | 14160 | 2026-07-12 18:00 | 2026-07-26 23:59 |
| NQ1_1m_chunk_2026-08-10.csv | 14160 | 2026-07-26 18:00 | 2026-08-09 23:59 |
| NQ1_1m_chunk_2026-08-24.csv | 14160 | 2026-08-09 18:00 | 2026-08-23 23:59 |
| NQ1_1m_chunk_2026-09-08.csv | 15300 | 2026-08-23 18:00 | 2026-09-07 23:59 |
| NQ1_1m_chunk_2026-09-22.csv | 15300 | 2026-09-06 18:00 | 2026-09-21 23:59 |
| NQ1_1m_chunk_2026-10-06.csv | 15171 | 2026-09-21 00:09 | 2026-10-05 23:59 |
| NQ1_1m_chunk_2026-10-16_regular.csv | 13800 | 2026-10-04 18:00 | 2026-10-16 16:59 |

## How to extend

1. On the "Liquidity Engine Bot" layout set `CME_MINI:NQ1!`, 1 minute (ETH, Vol indicator stay as they are).
2. Bar Replay -> Select date = D; click the chart, Alt+G, go to D - 20 days. TradingView loads ~10 sessions (13.9k-15.3k bars) before the replay point and then reports "Last available bar".
3. Save/Load menu -> Download chart data -> Download, then `python tools/grab_tv_export.py NQ1_1m_chunk_<D> 3`.
4. Next chunk: D = (first day of the previous chunk) + 1 day, so consecutive chunks overlap.
5. The regular chart (no replay) gives the latest 10 sessions: export it as NQ1_1m_chunk_<today>_regular.
6. `python tools/stitch_tv_1m.py --install`. A new roll must first be in data/NQ_rolls.json (re-run tools/stitch_tv_chunks.py on new 5m chunks), otherwise the roll check / verification fails.
