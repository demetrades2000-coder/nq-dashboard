# NQ / ES futures data audit (2026-10-16)

## Plain-English summary

1. **There is a clean, authoritative NQ set in `data/clean/`.** It covers 2021-10-18 to 2026-10-16 (1,293 sessions,
   354,216 five-minute bars). All of it is TradingView CME exchange data: NQ1! up to 2026-08-21, and MNQ1! from 2026-08-24,
   because no NQ1! export exists for that window yet. Every session is complete except 2025-11-28: on that day the source
   has no bars from 21:40 to 08:30 ET, which matches the CME Globex outage that day. The 15m and 1h files are derived
   from the 5m file. Nothing in `data/NQ_*.csv` or `data/ES_*.csv` was touched.
2. **None of the TradingView files are back-adjusted, even though they are labelled B-ADJ.** That includes the 36 NQ1!
   chunks, `NQ1_5m_harvest_full.csv` and the MNQ1! "badj" export. On the shared days they match unadjusted Yahoo NQ=F to
   the tick (median difference 0.00 on 554 of 580 overlapping days; the other 26 are days where Yahoo itself has a roll
   glitch). Every quarterly roll shows up in them as a raw price jump at a session open, for example +300.75 on
   2026-09-14 18:00 and +513.25 on 2026-06-14 18:00 (that one includes a weekend move). So I back-adjust the series
   myself. The method is additive, anchored to the current contract (NQZ26), with 20 rolls listed below. Bars since
   2026-09-14 18:00 ET are exact NQZ26 prices, so they match the live price space. Earlier bars are shifted so that
   prior-day, week and month levels stay in the same price space as the bar being traded.
3. **Why Yahoo gave +$12,642 / PF 9.87 and TradingView gave +$10,718 / PF 6.94 on Aug 6 to Oct 16.** It was not
   back-adjustment, not a timezone shift (best clock alignment is 0 s), and not volume (swapping only the volumes moves
   the result by about $200). It had two causes:
   - **(a) The Sep-2026 roll.** In the unadjusted TradingView series, levels made before Sep 14 sit about 296 pts below
     post-roll prices. That changed the 09-17 target (-$495) and removed the 09-23 trade (-$354). Yahoo has its own,
     worse roll problem: it jumped to the December contract at 11:30 ET on Sep 14, in the middle of the session, which
     creates a fake +300-pt bar.
   - **(b) Tick-level noise.** MNQ and NQ prints differ by 0.25 to 1 pt on about 80% of bars. Yahoo also has defects:
     it misses the 18:00 and 18:05 bars every Sunday, misses the whole Labor Day session, has 36 zero-volume bars and
     some bad prints. The engine enters at exact levels with 0.25-pt stops and sizes from stop distance, so quarter-point
     differences change size (08-28: 4 vs 3 lots, -$517), move the trigger bar (09-04), or flip a whole day (10-08:
     Yahoo short +$1,582 vs TradingView long +$626).

   **Lesson for research:** at this sample size, results move by about ±$1k from quarter-point data differences alone.
4. **Results on the clean set (Aug 6 to Oct 16, default parameters):** 31 trades, +$11,495.50, PF 7.08, max DD -$377.
   For comparison, the current mixed files give 29 trades, +$10,718.50, PF 6.94. Before the roll, every trade has the same
   dollar result; only the displayed prices move by the adjustment. The difference comes from after the roll, where the
   corrected levels gain +$766.50.
5. **`NQ_1m.csv` was contaminated.** The old importer wrote all 10,875 TradingView 5-minute bars into it as if they were
   1-minute rows. Before Sep 16 those were the only rows. Between Sep 16 and Oct 16 they overwrote 5,963 genuine Yahoo
   minutes. The clean `NQ_1m.csv` holds true 1-minute Yahoo NQ=F bars only: 28,569 rows, sessions 2026-09-18 to
   2026-10-16. That is all after the roll, so the bars are already in NQZ26 price space. A re-pull matched the surviving
   genuine rows 100% on close.
6. **The importer is fixed (`data/import_futures.py`).**
   - It detects the source bar interval from the median timestamp spacing and writes only that interval and coarser
     ones. A 5m export now writes 5m, 15m and 1h, never 1m. Tested: `NQ_1m.csv` was left untouched.
   - It applies `<SYM>_rolls.json` to incoming raw bars, so new exports land in the adjusted price space.
   - It refuses to merge when the incoming bars disagree with the bars on file by more than 5 pts (median over a
     session). Tested: a raw export onto adjusted files without the rolls file was refused ("median -295.50 pts on
     2026-08-24") and nothing was written.
7. **ES** has no TradingView data. The clean ES set is Yahoo ES=F, with its mid-session Sep-14 contract switch removed:
   ESZ26 - ESU26 = 66.25 pts, measured from ESZ26 single-contract quotes. It also drops 17:00-hour, weekend and
   zero-range placeholder rows. ES_5m starts 2026-08-06, so multi-year NQ research has no ES partner bars before then.
   Harvest ES1! the same way if SMT matters.

## Swap (one line, PowerShell, from the project root; it backs up the current files first)

> _Code omitted on the public site._

Run it between research runs, not during one: a backtest reads 5m and 1h separately. The engine's mtime cache picks up
the new files automatically. `NQ_1d`/`ES_1d` (Yahoo daily) are not replaced. Undo:
`Copy-Item data\_pre_clean_backup\*.csv data\ -Force`.
After the swap, prices before 2026-09-14 18:00 ET are higher than the old files (by +295.5 pts in Aug/Sep 2026 and up
to +3,669 pts in late 2021). Point distances, R and $ are unchanged.

Rebuild after new exports land in `data/tv_exports/` (it is idempotent and only writes `data/clean/`):

> _Code omitted on the public site._

## What the owner should export from TradingView (optional, but it removes the last MNQ / estimate pieces)

1. **NQ1! for 2026-08-24 to now.** That window is MNQ1! at the moment, with prices within 0.25 of NQ but volume in MNQ
   units (about 5.3x).
   - Open the chart for `CME_MINI:NQ1!` on the 5m interval, with ETH on (extended hours: `ETH` at the bottom right of
     the chart, or Chart settings > Symbol > Session = Electronic trading hours).
   - Turn back-adjustment **off**: click `B-ADJ` at the bottom right of the chart so it is no longer highlighted, or open
     Chart settings (gear) > Symbol and untick the back-adjustment option. The pipeline expects raw front-month bars and
     does the adjustment itself; that is the only way the gaps are known exactly. The current exports are raw already,
     whatever the toggle showed.
   - Use the normal chart, not Bar Replay. Scroll left until 2026-08-24 is loaded.
   - Open the layout menu (arrow next to the layout name, top right), choose **Export chart data...**, set Time format to
     **UNIX timestamp**, and click Export.
   - Save the file as `data/tv_exports/NQ1_5m_chunk_2026-10-17.csv`, then run `python tools/stitch_tv_chunks.py`. NQ1!
     automatically takes priority over MNQ1! for every session it covers fully.
2. **Exact gaps for the three weekend rolls.** These are currently estimated: Jun-2024 ±15, Jun-2025 ±34 and Jun-2026
   ±9 pts. TradingView switched NQ1! at a Sunday open for these, so the weekend move is mixed into the jump.
   - If the plan shows expired contracts, open `CME_MINI:NQU2024` and `CME_MINI:NQM2024` on 5m. Read the close of the
     Fri 2024-06-14 16:55 ET bar on both.
   - Do the same for U2025/M2025 on Fri 2025-06-13 and for U2026/M2026 on Fri 2026-06-12.
   - Write the differences (U minus M) into `data/clean/NQ_roll_overrides.json`, e.g.
     `{"NQM24->NQU24": 259.0, "NQM25->NQU25": 221.5, "NQM26->NQU26": 255.0}`, then rerun the stitch.
   - Nothing else needs re-exporting.

## How each question was settled

### 1. Yahoo NQ=F vs TradingView MNQ1! (Aug 24 to Oct 16; `python tools/data_audit.py compare`)

| check | result |
|---|---|
| clock alignment (shift TV by -1h, -10m, -5m, 0, +5m, +10m, +1h) | best match at **0 s** (median abs close diff 0.25); ±5 min gives 8.25. No timezone or stamping shift. |
| bars matched | 10,383; only in TV 492 (all Sunday 18:00/18:05 bars, all of Labor Day 2026-09-07, today); only in Yahoo 2 (17:00 maintenance-break junk) |
| close difference \|TV - Yahoo\| | p50 0.25, p90 1.0, p99 4.3 pts; exactly equal on only 19.9% of bars. MNQ and NQ are separate order books. |
| highs / lows | TV highs +0.25, lows -0.25 (median): MNQ wicks are a tick wider |
| volume | TV/Yahoo ratio median 5.29 (MNQ vs NQ contracts); Yahoo has 36 zero-volume bars |
| contract mismatch | 66 bars on **2026-09-14 11:30 to 16:55 ET**: Yahoo already on NQZ26, TV still on NQU26, Yahoo - TV = 298.6 pts median. TV switches at the 18:00 session open. |
| back-adjustment | none in either. Pre-roll TV = Yahoo NQU26 (median 0.00 every day). |

Attribution runs: engine.backtest.run with default parameters, 2026-08-06 to 2026-10-16. Data dirs were pointed at temp
copies; engine files were not modified.

| data | trades | net | PF |
|---|---|---|---|
| Yahoo 5m (old) | 29 | +12,642.5 | 9.87 |
| Yahoo prices + TV volume | 29 | +12,863.5 | 10.35 |
| TV prices + Yahoo volume | 29 | +10,493.5 | 6.65 |
| current files (Yahoo Aug 6-21, then TV MNQ unadjusted) | 29 | +10,718.5 | 6.94 |
| current, with the Sep roll back-adjusted only | 30 | +11,485.0 | 7.09 |
| **clean set** (NQ1! + MNQ1!, all rolls adjusted) | **31** | **+11,495.5** | **7.08** |
| clean bars, rolls left unadjusted | 30 | +10,729.0 | 6.93 |

Prices drive about $2k of the gap and volume about $0.2k. The roll adjustment is worth +$766.50.

Current files vs clean set, trade by trade (only trades that differ in $):

| trade | current | clean | delta |
|---|---|---|---|
| 08-07 14:50 L CISD | q10 +4.82R +$2,456 (Yahoo bars) | q10 +4.99R +$2,470 (NQ1! bars) | +15 |
| 08-17 09:50 / 10:30 L IFVG | -$44 (one trade) | -$42, plus a 10:30 BE trade -$4 | -3.5 |
| 08-19 13:55 L IFVG | -$176 | -$177 | -1 |
| 09-17 14:45 L CISD | target 29744.50 (pre-roll level, wrong space) +$327 | target 29785.75 +$822 | **+495** |
| 09-23 09:35 S IFVG | none | +3.56R +$354 | **+354.5** |
| 09-24 10:45 S IFVG | q2 -$3 | q4 -$6 | -3 |
| 09-29 09:40 L CISD | q1 -$80 | q2 -$160 | -80 |
| 19 other trades | identical $ (prices shown +295.5 pts higher before the roll) | | 0 |
| **total** | +10,718.5 | +11,495.5 | **+777** |

The full 29-vs-29 Yahoo-vs-TV diff is reproducible with
`python tools/data_audit.py backtest <dirA> <dirB> 2026-08-06`. The biggest single item is 10-08: Yahoo shorts at 10:40
for +$1,582, TV goes long at 10:00 for +$626.

### 2. Authoritative source per date range

| range | source | why |
|---|---|---|
| 2021-10-18 to 2026-08-21 | TradingView CME_MINI:NQ1! 5m (36 Bar Replay chunks + harvest_full; 0 overlap disagreements) | exchange data, complete sessions, rolls cleanly at a session open |
| 2026-08-24 to 2026-10-16 | TradingView CME_MINI:MNQ1! 5m | only exchange-data source for the window; equals NQ to about 0.25 (72-bar overlap with NQ1!: median +0.25). Replace with an NQ1! export (above). |
| (not used for bars) | Yahoo NQ=F | mid-session roll switch, missing Sunday-open bars and the Labor Day session, zero-volume junk. Kept only as a cross-check and to measure the Sep-26 spread. |
| NQ 1m 2026-09-18 to 2026-10-16 | Yahoo NQ=F 1m (fresh pull) | the only true 1-minute source |
| ES 5m/15m 2026-08-06 to 10-15, ES 1h 2024-05 to 2026-10, ES 1m 2026-09-17 to 10-15 | Yahoo ES=F, Sep-26 roll fixed | no exchange export exists for ES |

The stitch picks one source per session (18:00 to 17:00 ET), never a mix. The order is NQ1! > MNQ1! > Yahoo, unless a
higher-priority source has fewer than 98% of the bars the best source has for that day. The per-session choice is in
`data/clean/audit/source_bars_by_day.csv` and `manifest.json`.

### 3. Back-adjustment decision

Use **additive back-adjustment anchored to the current front month** (what TradingView's B-ADJ is supposed to do,
computed here because the exports are raw).

- **Bars since the last roll are the live contract's own unadjusted prices.** Since 2026-09-14 18:00 ET they are exact
  NQZ26 prices, and NQZ26 is what Tradovate trades. Live price space matches exactly.
- **Older bars are shifted by the roll gaps.** Lookback levels (PDH/PDL, weekly and monthly pools, HTF FVGs, POC/VAH/VAL)
  then sit in the same space as the bar being traded. Unadjusted front-month bars break that for the days after every
  roll: on 09-15 to 09-23 the pre-roll levels were about 296 pts too low, which is exactly the +$849 seen in 09-17 and
  09-23.
- **Additive keeps point distances**, so stops, targets, R and $ are exact.
- **Caveat:** percent-of-price quantities are distorted in old data. Price is inflated by +3,669 pts (+23 to 27%) in
  late 2021. Anything computed as a % of price over multi-year history is slightly off; anything in points or ratios of
  ranges is fine.
- **For the live bot:** at the December roll (NQZ26 last trading day Fri 2026-12-18), TradingView will switch at
  **Mon 2026-12-14 18:00 ET**. From then on, history must be re-anchored (+H7-Z6 gap) or the live levels will be about
  250 to 300 pts off. Re-export NQ1! after the switch and rerun `tools/stitch_tv_chunks.py`; the importer refuses
  unadjusted merges, so this cannot go unnoticed.

Rolls applied (`data/clean/NQ_rolls.json`):

- **Switch rule:** first bar of the session 3 full trading days before the last trading day, with holiday short
  sessions not counted. This reproduces TradingView's NQ1! switch on all 20 rolls; the sanity check found no
  contradicting larger jump.
- **Gap estimate, best first:** exact override; simultaneous quotes (Yahoo was already on the new contract); NQZ26
  single-contract hourly quotes; the weekday session-open jump (error is the 17:00 to 18:00 drift, median 4 pts); a carry
  model (median gap/price of the 4 nearest measured rolls).
- 2021 to 22 gaps are near zero because rates were near zero.

| roll | last trading day | switch (first bar of new contract, ET) | raw jump at switch | gap used | method | ± pts | cumulative shift applied to bars before switch |
|:---|:---|:---|---:|---:|:---|---:|---:|
| NQZ21 -> NQH22 | 2021-12-17 | 2021-12-13 18:00 | -5.25 | -5.25 | open_jump | 4 | 3668.75 |
| NQH22 -> NQM22 | 2022-03-18 | 2022-03-14 18:00 | -2.5 | -2.5 | open_jump | 4 | 3674 |
| NQM22 -> NQU22 | 2022-06-17 | 2022-06-13 18:00 | 36.5 | 36.5 | open_jump | 4 | 3676.5 |
| NQU22 -> NQZ22 | 2022-09-16 | 2022-09-12 18:00 | 82.75 | 82.75 | open_jump | 4 | 3640 |
| NQZ22 -> NQH23 | 2022-12-16 | 2022-12-12 18:00 | 119 | 119 | open_jump | 4 | 3557.25 |
| NQH23 -> NQM23 | 2023-03-17 | 2023-03-13 18:00 | 129.25 | 129.25 | open_jump | 4 | 3438.25 |
| NQM23 -> NQU23 | 2023-06-16 | 2023-06-12 18:00 | 180.5 | 180.5 | open_jump | 4 | 3309 |
| NQU23 -> NQZ23 | 2023-09-15 | 2023-09-11 18:00 | 191 | 191 | open_jump | 4 | 3128.5 |
| NQZ23 -> NQH24 | 2023-12-15 | 2023-12-11 18:00 | 209.75 | 209.75 | open_jump | 4 | 2937.5 |
| NQH24 -> NQM24 | 2024-03-15 | 2024-03-11 18:00 | 253.75 | 253.75 | open_jump | 4 | 2727.75 |
| NQM24 -> NQU24 | 2024-06-21 | 2024-06-16 18:00 (Sunday) | 258.5 | 261 | carry_model | 14.6 | 2474 |
| NQU24 -> NQZ24 | 2024-09-20 | 2024-09-16 18:00 | 235.5 | 235.5 | open_jump | 4 | 2213 |
| NQZ24 -> NQH25 | 2024-12-20 | 2024-12-16 18:00 | 300.5 | 300.5 | open_jump | 4 | 1977.5 |
| NQH25 -> NQM25 | 2025-03-21 | 2025-03-17 18:00 | 209.75 | 209.75 | open_jump | 4 | 1677 |
| NQM25 -> NQU25 | 2025-06-20 | 2025-06-15 18:00 (Sunday) | 120.5 | 220.25 | carry_model | 34.2 | 1467.25 |
| NQU25 -> NQZ25 | 2025-09-19 | 2025-09-15 18:00 | 237.25 | 237.25 | open_jump | 4 | 1247 |
| NQZ25 -> NQH26 | 2025-12-19 | 2025-12-15 18:00 | 244.25 | 244.25 | open_jump | 4 | 1009.75 |
| NQH26 -> NQM26 | 2026-03-20 | 2026-03-16 18:00 | 215.25 | 215.25 | open_jump | 4 | 765.5 |
| NQM26 -> NQU26 | 2026-06-18 (Juneteenth moved LTD) | 2026-06-14 18:00 (Sunday) | 513.25 | 254.75 | ref_NQZ26_1h | 9.4 | 550.25 |
| NQU26 -> NQZ26 | 2026-09-18 | 2026-09-14 18:00 | 300.75 | 295.5 | simultaneous_yahoo (66 bars; NQZ26 ref gives 293.6) | 0.5 | 295.5 |

ES: ESU26 -> ESZ26, Yahoo switch bar 2026-09-14 11:30 ET, gap +66.25 (ESZ26 single-contract hourly quotes, ±0.1). The
mixed switch bar's open and low were re-based. Older Yahoo ES_1h rolls are **not** adjusted: Yahoo flip-flops between
contracts for days (e.g. 2025-12-16/17), and those days are flagged `jump` in the quality table.

### 4. Quality audit (gaps, duplicates, grid, maintenance break, weekend, DST, roll)

The checks run per trading day (prev 18:00 to 17:00 ET, wall-clock and DST-safe), for every file:

- missing bars inside the session, at the open, and at the close
- duplicates and off-grid stamps
- bars in the 17:00 to 18:00 ET break or on the weekend
- zero-volume and flat placeholder rows, and impossible OHLC
- intra-session jumps over 0.5% (contract switch or bad print)
- US holiday sessions, flagged by name

The full table is in `data/clean/audit/quality_by_day.csv`, with `quality_current_by_day.csv` for the current files.

| file (clean) | sessions | OK | not OK |
|---|---|---|---|
| NQ_5m / 15m / 1h | 1,293 | 1,292 | 2025-11-28 `gaps`: 129 bars missing 21:40 to 08:30 ET, CME outage day |
| NQ_1m | 21 | 17 | 4 `late-open`: Yahoo lacks the Sunday 18:00 to 18:09 minutes |
| ES_5m | 51 | 40 | 11 `late-open`: Yahoo lacks Sunday 18:00/18:05 every week; 2026-08-06 starts at 00:05; Labor Day session missing |
| ES_1h (Yahoo history) | 618 | 580 | 21 late-open, 6 early-close, 7 gaps, 7 jump (Yahoo roll flip-flops and early-close days) |

Further findings:

- **Weekend gaps and DST.** Every TradingView session opens at 18:00 ET and closes at 16:55. That includes the DST weeks
  (2024-11-04, 2025-11-03, 2026-03-09), so stamps are true UTC.
- **Duplicates, off-grid stamps and break bars.** None in the clean NQ set. The sanitizer dropped them from the Yahoo
  sources (ES_1h: 24 off-grid early-close bars, 7 break bars, 5 expiry-Friday 16:00 settlement rows).
- **Holidays.** Holiday sessions (MLK, Presidents, Good Friday, Memorial, Juneteenth, July 3/4, Labor, Thanksgiving,
  Black Friday, Christmas Eve, New Year, and the 2025-01-09 national day of mourning) are kept as the short sessions they
  were. Note that the engine treats each one as its own "day", so the session after it uses the short holiday session
  as its "prior day".

Coverage by month (NQ_5m clean; `data/clean/audit/coverage_by_month.csv`):

| month | sessions | bars | missing inside | source | contract |
|:---|---:|---:|---:|:---|:---|
| 2021-10 | 10 | 2760 | 0 | tv-NQ1! | NQZ21 |
| 2021-11 | 22 | 5979 | 0 | tv-NQ1! | NQZ21 |
| 2021-12 | 22 | 6072 | 0 | tv-NQ1! | NQH22/NQZ21 |
| 2022-01 | 21 | 5748 | 0 | tv-NQ1! | NQH22 |
| 2022-02 | 20 | 5472 | 0 | tv-NQ1! | NQH22 |
| 2022-03 | 23 | 6348 | 0 | tv-NQ1! | NQH22/NQM22 |
| 2022-04 | 20 | 5520 | 0 | tv-NQ1! | NQM22 |
| 2022-05 | 22 | 6024 | 0 | tv-NQ1! | NQM22 |
| 2022-06 | 22 | 6024 | 0 | tv-NQ1! | NQM22/NQU22 |
| 2022-07 | 21 | 5748 | 0 | tv-NQ1! | NQU22 |
| 2022-08 | 23 | 6348 | 0 | tv-NQ1! | NQU22 |
| 2022-09 | 22 | 6024 | 0 | tv-NQ1! | NQU22/NQZ22 |
| 2022-10 | 21 | 5796 | 0 | tv-NQ1! | NQZ22 |
| 2022-11 | 22 | 5979 | 0 | tv-NQ1! | NQZ22 |
| 2022-12 | 21 | 5796 | 0 | tv-NQ1! | NQH23/NQZ22 |
| 2023-01 | 21 | 5748 | 0 | tv-NQ1! | NQH23 |
| 2023-02 | 20 | 5472 | 0 | tv-NQ1! | NQH23 |
| 2023-03 | 23 | 6348 | 0 | tv-NQ1! | NQH23/NQM23 |
| 2023-04 | 20 | 5427 | 0 | tv-NQ1! | NQM23 |
| 2023-05 | 23 | 6300 | 0 | tv-NQ1! | NQM23 |
| 2023-06 | 22 | 6024 | 0 | tv-NQ1! | NQM23/NQU23 |
| 2023-07 | 21 | 5703 | 0 | tv-NQ1! | NQU23 |
| 2023-08 | 23 | 6348 | 0 | tv-NQ1! | NQU23 |
| 2023-09 | 21 | 5748 | 0 | tv-NQ1! | NQU23/NQZ23 |
| 2023-10 | 22 | 6072 | 0 | tv-NQ1! | NQZ23 |
| 2023-11 | 22 | 5979 | 0 | tv-NQ1! | NQZ23 |
| 2023-12 | 20 | 5520 | 0 | tv-NQ1! | NQH24/NQZ23 |
| 2024-01 | 22 | 6024 | 0 | tv-NQ1! | NQH24 |
| 2024-02 | 21 | 5748 | 0 | tv-NQ1! | NQH24 |
| 2024-03 | 20 | 5520 | 0 | tv-NQ1! | NQH24/NQM24 |
| 2024-04 | 22 | 6072 | 0 | tv-NQ1! | NQM24 |
| 2024-05 | 23 | 6300 | 0 | tv-NQ1! | NQM24 |
| 2024-06 | 20 | 5472 | 0 | tv-NQ1! | NQM24/NQU24 |
| 2024-07 | 23 | 6255 | 0 | tv-NQ1! | NQU24 |
| 2024-08 | 22 | 6072 | 0 | tv-NQ1! | NQU24 |
| 2024-09 | 21 | 5748 | 0 | tv-NQ1! | NQU24/NQZ24 |
| 2024-10 | 23 | 6348 | 0 | tv-NQ1! | NQZ24 |
| 2024-11 | 21 | 5703 | 0 | tv-NQ1! | NQZ24 |
| 2024-12 | 21 | 5751 | 0 | tv-NQ1! | NQH25/NQZ24 |
| 2025-01 | 22 | 5934 | 0 | tv-NQ1! | NQH25 |
| 2025-02 | 20 | 5472 | 0 | tv-NQ1! | NQH25 |
| 2025-03 | 21 | 5796 | 0 | tv-NQ1! | NQH25/NQM25 |
| 2025-04 | 21 | 5796 | 0 | tv-NQ1! | NQM25 |
| 2025-05 | 22 | 6024 | 0 | tv-NQ1! | NQM25 |
| 2025-06 | 21 | 5748 | 0 | tv-NQ1! | NQM25/NQU25 |
| 2025-07 | 23 | 6255 | 0 | tv-NQ1! | NQU25 |
| 2025-08 | 21 | 5796 | 0 | tv-NQ1! | NQU25 |
| 2025-09 | 22 | 6024 | 0 | tv-NQ1! | NQU25/NQZ25 |
| 2025-10 | 23 | 6348 | 0 | tv-NQ1! | NQZ25 |
| 2025-11 | 20 | 5298 | 129 | tv-NQ1! | NQZ25 |
| 2025-12 | 22 | 6027 | 0 | tv-NQ1! | NQH26/NQZ25 |
| 2026-01 | 21 | 5748 | 0 | tv-NQ1! | NQH26 |
| 2026-02 | 20 | 5472 | 0 | tv-NQ1! | NQH26 |
| 2026-03 | 22 | 6072 | 0 | tv-NQ1! | NQH26/NQM26 |
| 2026-04 | 22 | 5979 | 0 | tv-NQ1! | NQM26 |
| 2026-05 | 21 | 5748 | 0 | tv-NQ1! | NQM26 |
| 2026-06 | 22 | 6024 | 0 | tv-NQ1! | NQM26/NQU26 |
| 2026-07 | 23 | 6300 | 0 | tv-NQ1! | NQU26 |
| 2026-08 | 21 | 5796 | 0 | tv-NQ1! (to 08-21) / tv-MNQ1! | NQU26 |
| 2026-09 | 22 | 6024 | 0 | tv-MNQ1! | NQU26/NQZ26 |
| 2026-10 | 12 | 3195 | 0 | tv-MNQ1! (to 10-16 07:10) | NQZ26 |

Per-day table for the research window, current files vs clean set. Columns:

- **cur 1m**: rows in the current `NQ_1m.csv` that are really TradingView 5m bars, out of all rows that day.
- **Y-TV**: median close difference, TradingView minus Yahoo.

| day | current 5m source | cur bars | cur status | cur 1m (5m rows / total) | clean source | contract | clean bars | clean status | clean 1m | ES 5m clean | Y-TV | notes |
|:---|:---|---:|:---|:---|:---|:---|---:|:---|:---|:---|:---|:---|
| 2026-08-06 | yahoo | 203 | late-open | - | tv-NQ1! | NQU26 | 276 | OK | - | late-open | - | Yahoo file starts 00:05 |
| 2026-08-07 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-10 | yahoo | 274 | late-open | - | tv-NQ1! | NQU26 | 276 | OK | - | late-open | - | |
| 2026-08-11 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-12 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-13 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-14 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-17 | yahoo | 274 | late-open | - | tv-NQ1! | NQU26 | 276 | OK | - | late-open | - | |
| 2026-08-18 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-19 | yahoo | 274 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-20 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-21 | yahoo | 275 | OK | - | tv-NQ1! | NQU26 | 276 | OK | - | OK | - | |
| 2026-08-24 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | late-open | +0.00 | |
| 2026-08-25 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-08-26 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-08-27 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-08-28 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-08-31 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | late-open | +0.00 | |
| 2026-09-01 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-02 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-03 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-04 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-07 | tv-MNQ1! | 228 | OK | 228/228 | tv-MNQ1! | NQU26 | 228 | OK | - | missing | - | Labor Day (halt 13:00); absent from Yahoo |
| 2026-09-08 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | late-open | +0.00 | Yahoo missing 73 bars |
| 2026-09-09 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-10 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-11 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-14 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQU26 | 276 | OK | - | late-open | -0.50 | **roll day**: Yahoo on NQZ26 from 11:30 (max diff 302); ES=F switch fixed |
| 2026-09-15 | tv-MNQ1! | 276 | OK | 276/276 | tv-MNQ1! | NQZ26 | 276 | OK | - | OK | +0.00 | first NQZ26 session |
| 2026-09-16 | tv-MNQ1! | 276 | OK | 276/308 | tv-MNQ1! | NQZ26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-17 | tv-MNQ1! | 276 | OK | 276/1365 | tv-MNQ1! | NQZ26 | 276 | OK | - | OK | +0.00 | |
| 2026-09-18 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | NQU26 expiry |
| 2026-09-21 | tv-MNQ1! | 276 | OK | 276/1371 | tv-MNQ1! | NQZ26 | 276 | OK | late-open | late-open | +0.00 | |
| 2026-09-22 | tv-MNQ1! | 276 | OK | 276/1361 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-09-23 | tv-MNQ1! | 276 | OK | 276/1365 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-09-24 | tv-MNQ1! | 276 | OK | 276/1368 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-09-25 | tv-MNQ1! | 277 | off-session | 276/1369 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | Yahoo 17:00 bar |
| 2026-09-28 | tv-MNQ1! | 276 | OK | 276/1371 | tv-MNQ1! | NQZ26 | 276 | OK | late-open | late-open | +0.00 | |
| 2026-09-29 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-09-30 | tv-MNQ1! | 276 | OK | 276/1368 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-01 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-02 | tv-MNQ1! | 276 | OK | 276/1368 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-05 | tv-MNQ1! | 276 | OK | 276/1368 | tv-MNQ1! | NQZ26 | 276 | OK | late-open | late-open | +0.00 | |
| 2026-10-06 | tv-MNQ1! | 277 | off-session | 276/1373 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | Yahoo 17:00 bar |
| 2026-10-07 | tv-MNQ1! | 276 | OK | 276/1361 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-08 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-09 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-12 | tv-MNQ1! | 276 | OK | 276/1371 | tv-MNQ1! | NQZ26 | 276 | OK | late-open | late-open | +0.00 | |
| 2026-10-13 | tv-MNQ1! | 276 | OK | 276/1368 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-14 | tv-MNQ1! | 276 | OK | 276/1372 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-15 | tv-MNQ1! | 276 | OK | 276/1363 | tv-MNQ1! | NQZ26 | 276 | OK | OK | OK | +0.00 | |
| 2026-10-16 | tv-MNQ1! | 159 | OK | 159/259 | tv-MNQ1! | NQZ26 | 159 | OK | OK | OK | +0.25 | live edge (07:10) |

## Files

The tools and outputs below sit under the project root
`C:\Users\Demetri Condax\AppData\Roaming\Claude\scratch-workspaces\70db7b8c-199a-421c-a714-e2c2b5e695d0\6871d521-939b-4b97-a32d-cbe1d3df7863\scratch-2026-10-15-bb0e63\nqbot`.

Tools:

- `tools/stitch_tv_chunks.py`: re-runnable NQ stitch, roll detection and adjustment, coverage, manifest; `--check` is a dry run.
- `tools/data_audit.py`: `fetch-refs`, `build-es`, `build-1m`, `audit [dir] [out.csv]`, `compare`, `backtest dirA dirB [from] [to]`.
- `data/import_futures.py`: interval detection, rolls.json, price-space refusal; the server's `tradingview_text()` signature is unchanged.

Clean data:

- `data/clean/NQ_{1m,5m,15m,1h}.csv`, `data/clean/ES_{1m,5m,15m,1h}.csv`: engine format (time, open, high, low, close, volume).
- `data/clean/NQ_rolls.json`, `data/clean/ES_rolls.json`, `data/clean/manifest.json`: sources, sessions per source,
  overlap disagreements (0), volume units, swap command.
- `data/clean/raw/NQ_5m_unadjusted.csv`: same bars before adjustment, with source and contract columns.

Audit and references:

- `data/clean/audit/`: `quality_by_day.csv`, `quality_current_by_day.csv`, `coverage_by_month.csv`, `source_bars_by_day.csv`.
- `data/clean/_src/`: Yahoo NQZ26 / ESZ26 hourly reference quotes and the fresh NQ=F 1m pull.

## Notes for the lead (outside my files)

- **`engine/data.py resample(..., "4h")` uses a fixed 22:00 UTC offset.** That is 18:00 ET only during daylight time.
  In winter (EST) the 4h buckets start at 17:00 ET, one hour before the session. Multi-year 1h runs (which use 4h as
  HTF) now cross 5 winters.
- **A single default backtest over the whole 2021 to 2026 clean history gives 130 trades (0.5/week), PF 1.02, +$156,
  and trades thin out over time.** The Aug 6 to Oct 16 window alone gives 31 trades. Some state in the engine carries
  across the long run (account / learner / governor), so research on the long history should use windowed runs
  (`days_from`/`days_to`) until that is understood. This is not a data issue.
- **ES partner bars exist only from 2026-08-06**, so SMT/partner features are absent for multi-year NQ runs.
