# 1-minute entry confirmation (hybrid 5m context + 1m trigger) - 2026-10-16

Question: "1 minute might help more for entry." This tests the hybrid version. The 5-minute context stays as it is
(pools, sweeps, structure, targets). The entry is confirmed on the first 1-minute body close through the same FVG,
or through a 1m CISD, instead of waiting for the 5-minute close.

## Verdict (plain English)

**Do not switch for Sunday's launch. Keep the 5m trigger (the default; the new option is OFF).**

- **On the same setups, the 1m confirmation helped a little.** Across the 12 setups both versions traded, the 1m
  entry was about 3 points better (median 2). The stop was about 10% tighter, and the result was +0.24R per trade
  better (1 standard error = 0.14R).
  - That is not statistically meaningful.
  - Most of it comes from one trade: Sep 17, +1.5R, where a 1m CISD hit the 10-point minimum stop. Without that
    trade the gain is +0.13R.
- **The cost is false triggers.** The 1m version took 21 trades against 14. In 8 of the 21, the 5-minute bar closed
  back through the level the 1m close had just broken; the 5m model would never have entered.
  - 6 of those 8 lost or scratched.
  - 2 were big winners (+2.4R and +2.9R), and those two are the whole reason the 1m version's net is higher.
  - That is luck you cannot plan on.
- **Overall it is a wash.** Average R +0.66 against +0.64, profit factor 4.2 against 4.8, worst drawdown -$579
  against -$286.
  - Trades per week rose from 2.6 to 3.9, right at the top of the 1-4 a week target.
- **The ceiling is real but mostly not reachable.** Re-pricing every 5m trade as if it had entered one tick through
  its trigger level (no false triggers, same exits) would roughly double average R on NQ. It would also lift every
  CFD period by +0.4 to +0.6R.
  - The real 1m data captured only about a third of that entry improvement.
  - It also paid for it with false triggers.
- **The sample is far too small to decide.** 27 sessions, 14 against 21 trades. One standard error on average R is
  about ±0.5R, which is ten times the difference we are trying to measure.

## Key table

### Real 1-minute test (NQ, Aug 31 - Oct 7 2026, 27 RTH sessions, the only true NQ 1m data we have)

Both versions run on the same 5m base, whose RTH prices are rebuilt from the same 1m feed (see "Data"). Sizing as
in study_be.py: dd_aware off, no daily loss cap, grade sizing on.

| arm | trades | /wk | avg R | net $ | PF | avg risk pts | win % | max DD $ | false triggers |
|---|---|---|---|---|---|---|---|---|---|
| 5m trigger (current) | 14 | 2.6 | +0.64 | +3,055 | 4.80 | 34.8 | 36 | -286 | - |
| 1m trigger (hybrid) | 21 | 3.9 | +0.66 | +3,892 | 4.18 | 36.5 | 33 | -579 | 8 (6 lost) |
| last 7 sessions, 5m | 3 | 2.1 | +0.78 | +1,050 | 4.97 | 37.6 | 33 | -184 | - |
| last 7 sessions, 1m | 6 | 4.3 | +0.63 | +1,224 | 3.92 | 42.3 | 33 | -190 | 3 (2 lost) |

- **Paired setups (12, traded by both):**
  - 1m entry +3.1 pts better on average (median +2.0)
  - risk 0.90x
  - +0.24R per trade (1m better on 5, worse on 1)
- **1m-only trades: 9, sum +2.50R.** 6 of them are false triggers, summing +2.08R from 2 winners and 4 losers.
- **5m-only trades: 2, sum +0.41R.**
- **When in the 5m bar the 1m trigger fired** (minute 0 to 4): 8 / 3 / 4 / 4 / 2. "Minute 4" is the same moment as
  the 5m close.
- **Average risk is not lower overall** (36.5 against 34.8 pts). The extra 1m-only trades are mostly wide-stop
  IFVGs, and they offset the tighter paired entries.

### Synthetic upper bound (5m data, all four periods; NOT an estimate)

Each real 5m-trigger trade is re-priced with an earlier entry inside its trigger bar. Stop, target and exit price are
unchanged; commission is included. The bound ignores the extra false triggers, earlier stop-outs inside the trigger
bar, and any change in how exits behave. "1 tick through level" is the most realistic ceiling: a body close cannot
confirm before price is through the level. "Bar open" cannot actually be reached.

| period | n | actual 5m | entry at bar open | entry at body mid | 1 tick through level |
|---|---|---|---|---|---|
| NQ fut 2026 | 29 | +1.07R, PF 4.2, 36.2 pt | +3.34R, PF 19.1, 19.7 pt | +1.93R, PF 8.5, 26.9 pt | +2.13R, PF 8.2, 27.6 pt |
| CFD Q4 2023 | 33 | -0.30R, PF 0.33 | +0.44R, PF 2.3 | -0.04R, PF 0.90 | +0.09R, PF 1.24 |
| CFD 2024 | 175 | +0.14R, PF 1.45 | +1.39R, PF 7.2 | +0.52R, PF 2.9 | +0.60R, PF 3.2 |
| CFD 2025 | 26 | -0.21R, PF 0.49 | +1.39R, PF 5.6 | +0.26R, PF 1.7 | +0.27R, PF 1.8 |

Reading: on NQ, the ceiling says the earlier entry could save up to about 8.6 points of risk per trade. The real 1m
data saved 3.1 points on the setups both versions traded, and added false triggers. The gap between the ceiling and
reality is the 1m close itself: the candle that closes through the level usually closes several points past it.

## Data (what was used, and what is broken)

- **data/NQ_1m.csv contains no clean 1-minute data.**
  - From 2026-08-24 on, every row on a 5-minute mark (:x0, :x5) is a 5-minute MNQ bar. It is 100% identical to
    NQ_5m.csv; the TradingView 5m import of 2026-10-16 07:11 wrote it there.
  - The other four minutes are 1m bars from a different feed.
  - Spacing alone does not reveal this, because the file is still evenly 60 s spaced.
  - The new loader `data.load_ltf` detects and drops those windows: 0 of 33,953 rows kept. Do not use this file for
    any 1m work until it is restored from its source.
- **The 24 "CME_MINI_NQ1!, 1 (N).csv" files in Downloads are not 24 January exports.**
  - 19 are byte-identical copies of one export: true NQ1! 1m, RTH 09:30-16:14 ET, 2026-08-31 to 2026-10-07
    (27 sessions). This is the data the real test above runs on.
  - 5 are identical copies of 2026-01-14 (from 10:51 ET) and 2026-01-15.
  - Each export was imported once, into `data/ltf/NQJ_1m.csv`: 11,664 rows, of which 11,640 are in complete
    5-minute windows. Nothing was written to NQ_*.csv.
- **The January files do not help.** It is 1.5 sessions, and there is no NQ futures 5m context for January
  (NQ_5m.csv starts 2026-08-06). The CFD 5m does cover January, but it trades at a basis to futures, so the two
  cannot be mixed.
- **The 5m base is a different contract.** NQ_5m.csv for this period is MNQ (TradingView 5m), not NQ1!. It differs
  from the NQ1! 1m feed by about 0.3-0.4 pt per bar; only about 30% of bars match exactly.
  - Mixing the two would make 1m closes and 5m FVG levels disagree at the tick level.
  - So the study rebuilds the prices of the 2,183 RTH 5m bars the 1m feed covers from that feed, keeping volume, and
    runs both versions on that base.
  - On the raw MNQ base, the engine flags 307 windows as inconsistent (more than 1 pt apart) and uses the 5m trigger
    there instead. That run is the "reference" row in the study output: 19 trades, +0.64R, PF 3.9.
- **Other files moved.** The CFD files were moved to `data/_cfd_archive/` today at 14:56 (not by this study). As a
  result, `python study_be.py` fails on its three CFD periods. study_1m_trigger.py and the before/after check
  resolve them there read-only.

## What data would settle it

1. **True 1-minute CME NQ (NQ1! or NQ.v.0) from the same feed for the 5m context, at least 6 months long.**
   - Paired-setup differences have a standard deviation of about 0.5R.
   - About 30-40 paired setups (5-6 months at the current rate) would show whether a +0.25R improvement on the same
     setups is real.
   - Telling whether the extra 1m-only (false) triggers pay for themselves needs much more: 12-18 months, because
     single-trade outcomes vary by about ±2R.
2. **Sources.**
   - **Databento.** `data/import_futures.py databento NQ <start> <end>` already pulls GLBX.MDP3 ohlcv-1m for the
     continuous front month. It would give years in one pull, and the whole 5m/15m/1h base could be rebuilt from
     the same 1m feed.
   - **TradingView Plus.** It only serves about 8 weeks of 1m history. Export NQ1! 1m with extended hours on, every
     ~6 weeks, as one file per export, and append it to data/ltf/NQJ_1m.csv.
     - Use `import_futures.tradingview_text` with the folder redirected, as in this study.
     - Duplicates are harmless, but each export only needs to be saved once.
   - **Forward data.** From Sunday the live bot sees every 1m bar. Recording them gives clean forward data for this
     question at no cost.
3. **Keep the 5m base on the same feed as the 1m.** Today's NQ_5m (MNQ) and the NQ1! 1m disagree by tenths of a
   point on most bars.

## How the option works (engine)

- **Turning it on.** `ifvg_tf: "lower"` turns it on; DEFAULTS still says `"base"`. `Engine(..., ltf=<1m Bars>)`
  supplies the 1m bars. `backtest.run` loads them itself when the option is on, via `data.load_ltf(sym, base)`.
  That merges `data/<sym>_1m.csv` with the verified exports in `data/ltf/` and keeps only clean, complete 1m windows.
- **When a bar can use 1m.** A 5m bar uses 1m confirmation only if all five of its 1m bars exist (60 s apart) and
  they rebuild the 5m bar within `spec["ltf_tol"]` points (default 1.0). Every other bar falls back to the normal 5m
  trigger.
  - The result carries an `ltf` block. For example: "1m confirmation on 1295 of 2424 entry-window 5m bars; the rest
    fell back to the normal 5m trigger", plus counts of trades using the 1m trigger and the 5m fallback.
  - With no 1m data (NQX, or anything else), the run is the normal 5m model and the block says so.
- **No lookahead.**
  - The 1m scan runs at the start of each 5m bar, before that bar's structure, pool, VWAP or 15m/1h updates. Its
    context is therefore the previous 5m close.
  - It walks the bar's 1m bars in order, with the 5m bar rebuilt from the 1m bars closed so far. Sweep extremes,
    the leg, grade, day range and the trigger-candle features all see only closed 1m bars.
  - A trigger on 1m bar j fills at the open of 1m bar j+1, with slippage. Stop and target are checked 1m by 1m for
    the rest of that 5m bar (stop first, as on 5m).
  - From the 5m close on, the normal 5m management takes over: break-even, giveback, time stop, flatten. On the
    entry bar it sees only the part after the fill.
  - A trigger on the bar's last minute fills at the next 5m open, which is the same price as the next 1m open.
- **Trigger definition.**
  - The FVGs are the 5m FVGs inside the manipulation leg. The trigger is the FIRST 1m body close through one of them:
    no earlier 5m or 1m close may have gone through it, and each level fires only once.
  - When the leg has no 5m FVG, a 1m CISD is used instead: a 1m body close through the open of the 1m down-run that
    printed the extreme. If the extreme bar has no 1m data, the 5m CISD level is confirmed on the 1m close.
- **Known simplifications.**
  - A setup armed by a sweep inside the current 5m bar can only confirm on that bar's 5m close, because sweeps are
    detected on 5m.
  - Overnight high/low pools are created at the 09:30 bar, so a 1m trigger inside the 09:30-09:35 bar cannot target
    them.
  - The SMT feature (weight 0) reads the partner's full 5m bar.
  - Shadow trades for 1m triggers resolve on 5m.
  - The time stop counts the entry bar as a full 5 minutes.
  - Partials (`partial_pct` > 0; 0 by default) are only checked at the 5m close.
- **Default behaviour is unchanged, bit for bit.** The `python study_be.py` "current" row before and after the edits:

  `29t 2.8/wk +1.07R $+10718 pf 6.94 dd -372 | 33t 6.6/wk -0.29R $-2438 pf 0.19 | 175t 3.7/wk +0.14R $+5259 pf 1.52 | 26t 2.9/wk -0.21R $-1100 pf 0.37`

  These are identical. So are full trade-list hashes (entry and exit time and price, P&L, stop, target, exit reason)
  for NQ and NQX under study params, defaults, and `memory_seed` off.

## Files

- `engine/model.py`
  - `Engine(..., ltf=None)`, `_ltf_setup`, `_find_trigger(..., ltf_j=None)` -> `_find_trigger_1m`
  - the 1m scan block and two guarded hooks in `run()`
  - `ltf_summary()` / `result()["ltf"]`
  - the `ifvg_tf` comment
- `engine/data.py`: `load_ltf`, `_clean_1m`, `LTF_DIR`, `LTF_EXTRA`
- `engine/backtest.py`: loads the 1m bars when `ifvg_tf == "lower"`; `out["ltf"]`
- `study_1m_trigger.py`: the study (run `python study_1m_trigger.py`; 5 worker processes)
- `data/ltf/NQJ_1m.csv` (+ NQJ_5m / 15m / 1h, NQJ_imported_days.json): the imported NQ1! 1m exports
