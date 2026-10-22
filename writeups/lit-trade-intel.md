## In one minute (owner summary)

- **What it is:** a table of every trade the bot has taken in the backtest (630: 2026 H1 80, H2 40, 2021-25 510), on
  paper (the cloud ledger) and live (the PC). Each trade has about 60 facts. The PC dashboard shows it under Data → Trade intel
  (sortable table, Signs tab, MFE / MAE scatter). The phone app shows it under Trades → Trade intel.
- **What winners have in common** (2026 H1 and H2 both, avg R vs the other side):
  - VXN at or below 22.9: +0.93R / +0.91R
  - target at or below 204 pts: +0.99R / +0.86R
  - the day's range so far under 0.53 VIX moves: +0.69R / +0.70R
  - ES also swept its own 3-hour level: +0.38R / +0.97R
  - more than 2.6R of room to the nearest opposing level: +0.36R / +0.58R. This is the only one that also leans the same
    way in 2021-25 (+0.07R).
  - the 5m CISD closed in an ICT macro window: +0.34R / +0.29R
  - the sweep was not of a London box: +0.60R / +0.18R
  - a vector candle in the displacement: +0.17R / +0.25R
- **What losers have in common:** the opposite side of each line above. For example, VXN above 24.7, a target beyond 325
  pts, a day already 0.8 VIX moves wide at the CISD, ES not sweeping, and the next opposing level within 1R.
- **+1R then gave it back vs clean wins (2026):** 35 trades reached +1R and ended under +0.5R, at breakeven or cut. 16
  trades were clean wins: target hit and never 0.5R under water. Those 16 made +$32.3k of the +$43.4k. Clean wins reached
  +1R in 21 minutes (median) and the givebacks in 38. The clean wins had more heat-free room and a slightly wider stop
  (median 54 vs 43 pts).
- **Honest warning:** these are descriptive. 8 of 50 facts look "consistent", but random shuffles of the outcomes give 13.4,
  so as a group they are not better than chance. Several were already tested as size tilts or filters, and none passed:
  ICT macros, level type, age and touches, and rejection in [lit-batch3a](lit-batch3a.md); ES, news and the Asia / London
  range in [lit-batch3b](lit-batch3b.md); VIX, VXN and gamma in [lit-market-context](lit-market-context.md); daily bias in
  [lit-bias-discretion](lit-bias-discretion.md); inducement count in [lit-new-entries](lit-new-entries.md); the 50 features
  in [lit-trade-selection](lit-trade-selection.md). A bucket of 10-30 trades is noise. Several of these signs also follow
  from the rules. For example, a closer target is reached more often, and a low-VXN 2026 is simply the calm part of the year.

## How it is built

- `tools/trade_intel.py` reruns the live config (`engine/lit.py` run_x, checked equal to run lit_live) and computes the entry
  facts with the studies' own code: `tools/lit_select.feats` (the 50 features the learning loop journals live),
  `tools/lit_batch3a.features` (macros, level age / touches, rejection, level class), `tools/lit_context.context` (GEX),
  `engine/lit_learn.h4_feats`, `tools/lit_batch3b.atr_d`. The outcome facts come from a walk over the trade's own 1m (2026) or
  5m bars. ~8 s. The file `research/lab/trade_intel.json` (370 KB) is rebuilt only when run lit_live changes (`python -X utf8
  tools/trade_intel.py`, also run by `tools/lit_dash_data.py`).
- Win % counts $ > 0, as every LIT report does. Outcome: win means R >= +0.5, loss means R <= -0.5, scratch is in between.
- Signs: terciles are set on 2026 H1 (the half LIT was picked on) and applied unchanged to H2 and 2021-25. A fact is
  "consistent" when the same side is better in H1 and H2 by at least 0.1R, with 8 or more trades on each side in both halves.
  Size columns (micros, $ at risk) are left out, because by rule they follow the stop.
- Paper and live trades: the cloud build (`tools/build_web_dashboard.py`) appends them from the cloud state (paper ledger,
  the PC heartbeat's trades) and the learning journal (its features), in a few ms with no engine run. The phone loads the
  full file as `intel.json`, and data.json carries a 13 KB cut. Paper rows show the facts their ledger and journal hold.
  Until the journal records a paper trade, its setup facts stay empty.
- Tests: `tests/test_trade_intel.py` (rows per source, totals = run lit_live, the features = the journal's on all 120 2026
  trades, no look-ahead: the entry facts recomputed on data cut at the fill bar are identical, bucket math, cloud merge, size
  budget) and `tests/test_pcdash_api.py` (/api/next/intel).
