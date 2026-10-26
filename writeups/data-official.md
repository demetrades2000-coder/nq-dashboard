# Official data only

**Owner, 2026-10-23:** use only official data: TradingView CME exports (NQ1! / ES1! / single contracts), NinjaTrader bars,
CBOE for VIX / VXN.

## What changed

**1. NQ roll gaps (data/NQ_rolls.json).** Two of the 20 rolls had gaps measured with non-official quotes. Both now use
official estimates, the same way the other 18 rolls always did:

| Roll | Switch (ET) | Before | Now | Method now (error) |
|---|---|---|---|---|
| NQU26 -> NQZ26 | 2026-09-14 18:00 (weekday) | 295.75 | **294.75** | TradingView NQ1! session-open jump (+-4 pts) |
| NQM26 -> NQU26 | 2026-06-14 18:00 (Sunday) | 254.75 | **289.25** | carry model of the 4 nearest measured rolls (+-15 pts) |

- What this does to the back-adjusted NQ bars (data/NQ_5m, 15m, 1h, 1m): bars before 2026-06-14 18:00 ET (all of 2021 to
  mid-June 2026) **+33.5 pts**; bars from 2026-06-14 18:00 to 2026-09-14 18:00 ET **-1.0 pt**; bars since the Sep switch
  are exchange prices and **did not change** (checked: 0 of 6,624 5m bars, 0 of 33,120 1m bars changed).
- The task asked for 294.0 ("ref_NQZ26_1h") and a -1.75 shift. That candidate came from a non-official NQZ26 download
  (`data/clean/_src/`, now deleted), and so did the Jun-26 gap of 254.75. Only the session-open jump is official for the
  Sep roll, hence 294.75 and -1.0.
- The Jun-26 roll is a weekend switch. Its session-open jump (513.25) includes the weekend move, so the carry model is the
  only official estimate today. It is about 34 pts away from the old non-official reading, which is inside two error bars.
  To measure it exactly, export TradingView **NQZ2026 1h** (May-June 2026, B-ADJ off) as
  `data/tv_exports/NQZ26_1h_<date>.csv` and rerun `python tools/stitch_tv_chunks.py`. The stitcher now reads such
  single-contract exports itself (candidate `ref_NQZ26_tv`, error ~0.4 pts).
- A constant shift does not change anything relative in LIT (levels, sweeps, ATR, stops, sizes). One thing is
  proportional to price: the target band (18:00 open +/- one VIX day move = price x VIX / sqrt(252)). Higher prices before
  June widen it by about 0.1%, so a few targets sit a fraction of a point further away (see Results).

**2. ES (data/ES_*.csv, data/ES_rolls.json).**
- **No truncation was needed.** The ES 5m / 15m / 1h files were already 100% TradingView ES1! from 2025-04-13 to
  2026-10-16 (392 sessions; every bar equals the raw ES1! chunks plus the roll gaps). The note saying "another source
  after 2026-08-23" was left over from an older build. Dropping those bars would have deleted official data, so they stay.
- Two weekend rolls had non-official gaps. Both now use the carry model of the 4 official weekday rolls (session-open jumps
  56.5, 58.5, 52.5, 67.0):
  - ESM25 -> ESU25 (2025-06-15): 53.0 -> **51.25**
  - ESM26 -> ESU26 (2026-06-14): 63.75 -> **63.50**
  - ES bars move by **-2.0 pts** before 2025-06-15 18:00 ET and by **-0.25** up to 2026-06-14 18:00 ET. Nothing changes after.
- The extra ESU26 record (a switch at 11:30 ET from the other source) is gone.
- **data/ES_1m.csv is deleted.** It came from a non-official source (2026-09-16 to 2026-10-15) and no TradingView ES1! 1m
  export exists yet. Nothing used it in a result: the ES LIT test in `lit-more-setups.md` already ran on 5m because no
  ES day passed the 1m coverage rule. `tools/data_check.py` no longer expects the file.

**3. Daily files (data/NQ_1d.csv, data/ES_1d.csv).** Both were non-official daily bars (2016 on, not back-adjusted). They
are now built from the official 5m bars, one bar per CME trading day (18:00 -> 17:00 ET), back-adjusted like the 5m. NQ
covers 2021-10-18 on and ES 2025-04-14 on. On the days both files have, the daily ranges are identical. Only
`tools/lit_bias.py` (ES daily SMT, `lit-bias-discretion.md`) read ES_1d. That study's 2026 numbers came from the old file and
were not rerun; a note is in the write-up.

**4. VIX / VXN (data/VIX_1d.csv, data/VXN_1d.csv).** The history is now CBOE's own files
(`cdn.cboe.com .../VIX_History.csv`, `VXN_History.csv`), on the same dates as before. Two values really changed:
- VIX close 2026-02-06: 20.37 -> **17.76** (CBOE).
- VXN 2026-10-16: an empty row (all zeros except the close) now holds CBOE's open / high / low.
- Everything else differs only by float noise (1e-6). No LIT trade moved because of the VIX fix.

**5. Code.** No builder can pick a non-official source any more:
- `tools/stitch_tv_chunks.py` (NQ) reads only TradingView files. Gap order per roll: an override file, a TradingView
  single-contract export (error <= 2), the session-open jump for weekday switches, a looser single-contract reference,
  then the carry model.
- `tools/stitch_es_chunks.py` (ES) uses the same gap code and only ES1! chunks. It now also writes ES_1d.
- `tools/data_audit.py`: the download, cross-check and ES / 1m builders that used the other source are removed, and
  `daily()` is added.
- `tools/stitch_tv_1m.py`: text only.
- `tools/data_check.py`: no ES 1m expected.
- The no-Yahoo live rule code (`engine/pcbars.py`, `tests/test_no_yahoo.py`) is untouched.
- **Rebuild check:** a fresh `tools/stitch_tv_chunks.py` + `tools/stitch_es_chunks.py` + `tools/stitch_tv_1m.py` run
  reproduces `data/NQ_{5m,15m,1h,1m}.csv` and `data/ES_{5m,15m,1h}.csv` bar for bar. There are 0 OHLC mismatches, and
  the volumes are unchanged.

## Results: what moved (costs in)

**LIT (run lit_live = live settings, LIT size rule)**

| Span | Before | Now |
|---|---|---|
| 2026 | 120 trades, PF 4.07, +$43,385 ($4,423/mo), DD -$2,196, eval 2 wk 31.6/1.0, 1 mo 57.3/4.9 | 120, PF 4.07, **+$43,394** ($4,424/mo), DD -$2,196, eval unchanged |
| 2026 H1 (pick) | PF 4.98, +$33,891 | PF 4.98, **+$33,901** |
| 2026 H2 (check) | PF 2.69, +$9,493 | PF 2.69, +$9,493 |
| 2021-25 (reference) | 510 trades, PF 1.01, +$1,211, DD -$19,436 | **511**, PF 1.01, **+$1,265**, DD **-$19,426** |

- 2026: the same 120 trades with the same entry times, sides, exits and micros. 7 target-hit trades have a target a
  fraction of a point further away (5 in H1: +$1.16 to +$3.48 each; 2026-07-22 and 2026-09-01: -$0.04 each).
- 2021-25: 19 target trades are a little bigger, and one new breakeven trade appears (2024-07-26 long, +$3): its target now
  clears the 1.5R minimum.
- The live loop check (`tests.test_lit_live --days --bot`) gives 120/120 identical and LiveBot 2/2 routed, 2/2 exited.

**Eval path and adopt runs (rebuilt with `tools/lit_adopt_combo.py save`, `tools/lit_idm_eval.py save`)**

| Run | Before | Now |
|---|---|---|
| lit_adopt_t15_be_off_eval | 2026 PF 3.29, +$43,293; H1 +$34,234 | PF 3.30, +$43,311; H1 +$34,253 |
| lit_adopt_all3 (scale-in, off live) | 2026 +$59,698; H1 +$44,507 | +$59,713; H1 +$44,522 |
| lit_adopt_all3_eval | 2026 PF 4.04, +$70,378 | PF 4.05, +$70,421 |

The 2-week pass/fail on the eval path did not move: H1 57.1/5.9, H2 52.2/0.0 (all3: 58.0/2.5, 52.2/0.0).

**Second strategies / ATLAS / stop hunts**

The reference trades were regenerated by the research code on the new data. Only VIX-band targets moved:

| Strategy | Changed trades | $ change |
|---|---|---|
| ema_lon_vix (`ema_best.json`) | H1 7 | H1 +$28, H2 $0, 2025 +$42, 2021-24 +$150 |
| macd_sweep (`md_best.json`) | H1 1, H2 1 | H1 +$3, H2 $0, 2025 +$7, 2021-24 +$71 |
| sr_nyreclaim | none | none |
| lit_asia (`lit_more_ent_asia_slot_rr3`) | H1 5, H2 2 | H1 +$10, H2 $0, 2025 +$11, 2021-24 +$40 (+1 trade); eval path H1 +$19 |
| Stop hunts (sh_asia, sh_trend), `lit/rehearsal.json` | none | none |

For the stop hunts and the rehearsal, the stored prices were moved by the same constant shift. Their replays stay 78/78
and 59/59. Account B and route tests are unchanged.

**Research that used ES after 2026-08-23:** none of it rested on dropped bars. Those ES 5m bars were TradingView ES1!
all along and stay. The SMT / cross-market / ATLAS confluence numbers are unchanged apart from a constant -2.0 / -0.25 pt
ES shift before mid-2026, which does not change a relative SMT read. The one exception is the daily-SMT row of
`lit-bias-discretion.md` (see 3).

Write-ups and docs that quote LIT's old totals (for example +$43,385, +$1,211) are now off by under $60. They were not
edited one by one; this page is the reference.

## Tests (2026-10-23, after the change)

| Test | Result |
|---|---|
| `tests.test_lit_live --days --bot` | 120/120 identical, LiveBot 2/2 routed, 2/2 exited |
| `tools/lit_losses.py live` | live == run lit_adopt_t15_be_off (631/631), lit_live stored |
| `tests.test_second --quick` | 31/31 (lit_asia 187/187, EMA 86/86, MACD 44/44, S/R 45/45) |
| `tests.test_second_stophunt --quick` | 18/18 (78/78, 59/59) |
| `tests.test_second_account_b --quick` | 42/42 |
| `tests.test_second_route --quick` | 24/24 |
| `tests.test_stophunt --quick` | all OK |
| `tests.test_brain --quick` | 22/22 |
| `tests.test_trade_intel` | 24/24 (expected totals updated: 511 / +$33,901 / 631) |
| `tests.test_atlas_ui` | 26/26 |
| `tests.test_pcdash_api` | 130/130 |
| `tests.test_no_yahoo` | 23/23 |
| `tests.test_roll`, `tests.test_import_tv`, `tests.test_data_check`, `tools/data_check.py` | 23/23, 24/24, 8/8, 0 to fix / 0 to look at |
