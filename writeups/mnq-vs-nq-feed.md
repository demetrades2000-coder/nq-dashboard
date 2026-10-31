# MNQ feed vs NQ backtest: does the bot trade the backtest's signals? (2026-10-26)

**Short answer: no, not trade for trade.** LIT is built and backtested on CME **NQ** bars (TradingView NQ1!). The PC bot
decides on its NinjaTrader **MNQ** chart. MNQ prints slightly different wicks (a thinner book), and LIT's sweep / CISD
rules react to single ticks: about **a third of the setups** and **more than half of the trade days** come out
differently. Measured on every MNQ bar there is, plus a whole-2026 noise test, the MNQ feed costs about
**$230-460 a month at the H2 rate** (9-17% of $2,670/mo) and matches the backtest on only **~1 trade in 4**.

**Built (OFF by default): `signal_root`.** With `"signal_root": "NQ"` the bot takes every decision from an NQ chart and
still sends every order to MNQ. Same rules, same sizing ($2 a point), same 2-4 trades a week. **Recommendation: switch it
on** once an NQ 12-26 chart with LE_BarFeed is open and shows data (3 steps at the end).

Scripts and data: `tools/hb_bars.py` (collects the PC's bars), `tools/mnq_vs_nq.py` (this study),
`research/feed/mnq_vs_nq.json` (every number), `research/feed/mnq_vs_nq_trades.csv` (trade days side by side),
`research/feed/nt_mnq_{5m,1m}.csv.gz` (the PC's MNQ bars). Runs: `lit_feed_mnq_noise`, `lit_feed_mnq_live_5m`,
`lit_feed_nq_same_5m`. Follows A1 audit section 6 (`research/handoff/2026-10-25/A1_data_timing.md`).

## The data

| Feed | What | Span (ET) |
|---|---|---|
| NQ1! | TradingView CME NQ1! 5m + 1m (`data/NQ_5m.csv`, `NQ_1m.csv`): the backtest | to 2026-10-16 16:59 |
| NinjaTrader MNQ | the PC's own LE_BarFeed bars, from 27 commits of the `heartbeat` branch's history (the branch is one force-pushed commit; older ones fetched by their SHA from GitHub's push list) | 5m 2026-09-17 18:00 -> 10-25 (7,222 bars); 1m 10-18 -> 10-26 (7,089) |
| TradingView MNQ1! | `data/tv_mnq_5m_2026-10-16.csv` | 5m 2026-08-23 18:00 -> 10-16 07:10 |

The PC's 1m bars start Oct 18, after the NQ 1m file ends (Oct 16): there is **no session with both MNQ 1m and NQ 1m**.
The direct LIT comparison therefore runs on 5m execution on both sides; the noise test below covers 1m execution.

## 1. Bars

| Pair (5m bars) | Shared bars | All 4 prices equal | High within 1 tick | Close within 1 tick | Within 1 pt |
|---|---:|---:|---:|---:|---:|
| NinjaTrader MNQ vs NQ1! | 5,796 | 0.5% | 61.9% | 54.3% | 92-94% |
| TradingView MNQ1! vs NQ1! | 10,874 | 0.4% | 60.5% | 54.1% | 92-93% |
| NinjaTrader MNQ vs TradingView MNQ1! | 5,678 | **95.4%** | 99.9% | 98.8% | 99.8% |

- MNQ vs NQ: overnight only 49-58% of prices within a tick (RTH 67-78%). MNQ's bar range is 0.40 pt wider on average;
  31 bars have a wick more than 5 pts beyond NQ's (largest 17 pts). Close offset median 0: no shift is ever applied
  (`pcbars.merge_basis` needs 2+ pts), so the roll logic is unaffected.
- **NinjaTrader MNQ = TradingView MNQ1!** on 95% of bars (highs / lows 99.9%): the A1 audit's TradingView sample is
  what the PC really sees.
- The PC's 1m bars rebuild its 5m bars on 95.0% of windows exactly and 99.4% within 1 pt (0.3% miss a minute): the
  live 1m entry works on its own feed.
- NinjaTrader revised 92 already-pushed 5m bars and 65 1m bars between pushes (a chart reload replaces the bars built
  live with the server's history; mostly a tick or two, the largest 12.75 pts).

## 2. LIT on each feed, same sessions (5m execution, 40 sessions Aug 24 - Oct 16, all in H2)

The live loop (`engine/lit_live.run`, live_model.json "lit") at each session's close. MNQ = the live merge: NQ1!
history, then TradingView MNQ1! until Sep 17 and NinjaTrader MNQ after it.

| | NQ1! | MNQ feed |
|---|---:|---:|
| Setups sent to the executor | 54 | 59 |
| ... on this feed only | 10 | 15 |
| Trades | 12 | 13 |
| Trades a week | 1.50 | 1.62 |
| Win rate | 50.0% | 53.8% |
| PF | 2.61 | 1.22 |
| **Net (LIT size rule, $1.90 commission)** | **+$2,362** | **+$367** |
| **$ a month** | **+$1,240** | **+$193** |

- **Setups: 25 of 69 (36%) exist on one feed only.** Of the 44 shared, 43 have a price a little apart (median 0.25 pt
  on the limit and stop, 2 pts on the target; p90 1.4 / 1.9 / 14 pts).
- **Trade days: 9 of 15 (60%) differ**: 6 the same trade, 2 the same entry with another exit or size, 2 a different
  entry, 5 on one feed only.
- **$: -$1,995 over 40 sessions (-$1,047 a month).** One day, Sep 23, is -$1,286 of it: both shorts hit the target,
  but on MNQ the setup came 5 minutes earlier and 14.5 pts lower, so the stop was wider and the size 1 micro instead of
  3. Small sample: read the direction, not the size.
- NinjaTrader-only part (21 sessions Sep 18 - Oct 16): setups 27% on one feed only, NQ +$1,728 vs MNQ -$58.
- For scale: the real backtest (NQ, 1m execution) made **+$10,374** in those 40 sessions (25 trades, PF 4.76). The MNQ
  1m number cannot be measured yet (no overlapping MNQ 1m bars).

## 3. The whole of 2026 with MNQ-sized noise (1m execution, 40 draws)

Every 5m bar of the 2026 backtest gets one (open, high, low, close) difference drawn from the measured NinjaTrader MNQ
minus NQ bars of the same session part (overnight / RTH), and its 1m bars are moved so they still rebuild the new 5m bar
(only the 1m extremes and the window's first open / last close move: a lower bound on the 1m-level scatter). Then the
real backtest (`lit.run_x`, live_model.json "lit", LIT size rule, eval scored by `tools/lit_final.score`). Controls:
the same differences negated (same size, narrower bars instead of wider) and NinjaTrader MNQ minus TradingView MNQ1!
(two data vendors, one contract).

| | NQ1! (backtest) | MNQ noise: median (p10 - p90) | negated | vendor noise |
|---|---:|---:|---:|---:|
| **2026** trades / week | 120 / 2.91 | 117 / 2.84 | 117 / 2.84 | 120 / 2.91 |
| % weeks with 2+ | 86 | 84.5 | 84.5 | 86 |
| PF | 4.19 | 3.16 | 2.94 | 4.19 |
| Net | +$43,820 | +$32,824 ($25,050 - $37,785) | +$32,449 | +$43,820 |
| $ a month | $4,467 | $3,346 | $3,308 | $4,467 |
| Max DD | -$2,196 | -$2,932 | -$3,393 | -$2,196 |
| MFFU 50K p10 / f10 (2 weeks) | 31.6 / 1.0 | 26.2 / 2.7 | 26.0 / 4.4 | 31.6 / 1.0 |
| p20 / f20 (a month) | 57.8 / 4.9 | 44.5 / 10.7 | 43.7 / 16.3 | 57.8 / 4.9 |
| **H1** (picked on) net | +$33,901 | +$23,572 | +$24,985 | +$33,901 |
| **H2** (check: quote this) net | **+$9,919** | **+$9,068** ($5,617 - $11,594) | +$8,210 | +$9,919 |
| H2 $ a month | **$2,670** | **$2,441 (-$229)** | $2,211 (-$460) | $2,670 |
| H2 PF / max DD | 2.91 / -$1,396 | 2.80 / -$1,906 | 2.51 / -$1,997 | 2.91 / -$1,396 |
| H2 p10 / f10, p20 / f20, median sessions to pass | 23.1 / 0.0, 47.4 / 0.0, 21 | 23.1 / 0.0, 40.4 / 1.3, 18.5 | 21.8 / 0.7, 38.5 / 12.2, 17.5 | unchanged |
| Draws below the NQ result (2026 / H2) | | 98% / 72% | 95% / 75% | 45% / 30% (= equal) |
| Trades identical to the backtest | | **27.5%** | 26.7% | 99.2% |
| Trade days with a different entry | | 41.5% | 43.8% | 0.8% |

(Eval columns at the LIT size rule, as in run `lit_live`; the live eval path's two_week numbers come from
`research/lit/uprisk_eval.json` and were not re-run here.)

Reading:
- **Vendor noise does nothing; MNQ noise changes most trades.** The difference between two vendors of one contract is
  too small to move LIT; the difference between MNQ and NQ is not.
- **H1 drops 30%, H2 9-17%.** H1 is where LIT's parameters were picked on NQ's exact ticks, so part of its result is
  fitted to them. H2 was not tuned on, and still loses in 72-75% of draws in both noise directions: MNQ-sized noise costs
  money on average, it does not just scatter.
- Trades a week (2.84 vs 2.91, 2+ in ~85% of weeks) and the 2-week eval odds in H2 stay the same; within a month the
  pass rate drops (H2 p20 47 -> 38-40) and some fails appear.

## 4. The $ impact, in one line

Deciding on MNQ instead of NQ: **about -$230 to -$460 a month at the H2 rate** (-9 to -17% of $2,670/mo), up to
-$1,100 a month on the whole of 2026, and live trades that match the backtest only about 1 in 4. The 40 real sessions
point the same way (-$1,047 a month on 5m execution) but are too few to size it.

## 5. The option: decide on NQ, trade MNQ (`signal_root`, built, OFF)

- **Switch:** `"signal_root": "MNQ"` (default) / `"NQ"` at the top of `live_model.json` and `live_model_lit.json`
  (`engine/ninjatrader.signal_root`; `LE_SIGNAL_ROOT` or a start cfg `nt_feed_roots` override it). Not a rule or size
  key: the "lit" and "lit_sizing" blocks, the rules fingerprint and `tests.test_lit_live` are untouched.
- **What reads NQ:** `NinjaTraderBars` picks ONE chart per symbol (`root_for`): the NQ chart's `le_feed\NQ_5m.csv`,
  `NQ_1m.csv`, `NQ_1m_open.csv` (the entry sizing price) and `NQ_instrument.txt` (the roll guard) when they exist,
  else the MNQ chart's as before. It never mixes NQ 5m with MNQ 1m. A stale NQ chart blocks new entries (FEED STALE
  NQ_5m.csv), it never switches to MNQ by itself. The heartbeat's bars (so the cloud paper bot), HEALTH CHECK's feed
  lines, `--status` ("Signals from : NQ chart ... -> orders MNQ 12-26") and ATLAS (it reads the same bars; also
  backtested on NQ1!) follow it.
- **What stays MNQ:** the order contract (`nt_instrument("MNQ")`), every OIF line, the stop and target prices (same
  index points, 0.25 tick), the micros ($2 a point, `engine/lit.py` PV). Checked in `tests.test_signal_root` (22/22):
  with NQ on the bot's LIT window is the NQ chart's bars exactly and LIT's 22 trades in the window equal LIT on NQ1!;
  the adapter still writes `PLACE;Sim101;MNQ 12-26;...` with the given stop / target / qty.
- **LE_BarFeed file names:** it uses the root of the chart's instrument, so an NQ chart writes `NQ_*` files and the MNQ
  chart `MNQ_*`: no clash, **nothing to untick** on the MNQ chart (the 1-minute writer clash is only for two charts of
  the same instrument). Both write `accounts.csv` with the same lines under one shared lock (harmless).
- **Residual differences with NQ on:** the broker's MNQ bracket can fill a tick or two from the NQ price the bot
  watches; the bot flattens at its own exit (`route_all_exits`), so the gap stays ~1-2 ticks ($0.50-1 a micro). The
  PC's archive (`data/nt_bars`) keeps its older MNQ bars (merged without a shift, a tick apart) until they leave the
  LIT window (~2 months).
- **Not tested yet:** NinjaTrader NQ vs TradingView NQ1! (expected equal, as NinjaTrader MNQ = TradingView MNQ1! on 95%
  of bars) and whether the MFFU NinjaTrader connection carries NQ (E-mini) data.

## Recommendation

**Switch `signal_root` to NQ** after the NQ chart is up: the bot then trades the bars the strategy was built and judged on,
the PC, the cloud paper ledger and the backtest line up trade for trade (live learning's twin reviews become clean), and
the measurement says MNQ bars cost money on average. Nothing in the rules or the size changes. Default stays OFF until you
have done steps 1-2.

Your steps:
1. NinjaTrader: **New > Chart > NQ 12-26**, Minute 5, Days to load 30, add **LE_BarFeed** (defaults), OK, save the
   workspace. Keep the MNQ chart open.
2. Tell Claude: "switch signals to NQ" (Claude sets `signal_root` NQ; the PC updates itself).
3. On the PC: `python -m engine.ninjatrader --status` (the line "Signals from" should say NQ chart).

## Re-run

    python tools/hb_bars.py                                  # refresh the PC's bars from the heartbeat history (gh)
    python -X utf8 tools/mnq_vs_nq.py --noise 40 --save-runs # ~8 min; parts 1-2 alone ~1 min
    python -X utf8 -m tests.test_signal_root
