## In one minute

- **What LIT is:** a way to read a chart. Obvious highs and lows attract orders (stops, breakout entries). Price often runs
  through such a level, traps the traders who reacted to it, and then turns. LIT tries to trade that turn.
- **What the report insists on:** LIT is a set of ideas to test, not a proof. A sweep (price running through a level) can
  turn into a reversal, a breakout that keeps going, or a range. Only rules that are written before the trade, and then
  tested with real costs, can show an edge.
- **What the bot does:** one fixed version of LIT, written as exact rules (below). Every number in it was picked on Jan-Jun
  2026 and checked on Jul-Oct 2026. Results: 2026 +$41,734 (PF 3.66, 2.9 trades a week), Jul-Oct alone +$8,962
  (about $2,400 a month, the rate to expect).
- **What the report added:** 16 new rule ideas (44 variants) were tested on 2026 (`lit-report-tests`). None improved both halves of
  2026 in a way that holds up, so the rules did not change. Four execution fixes from the report's last two chapters went
  into the bot's plumbing (order states, early closes, the paper ledger).

## The model as the bot trades it (long; a short is the mirror image)

All times are New York (ET). The trading day runs 18:00 to 17:00. Setups use 5-minute candles; the entry and the trade use
1-minute candles.

1. **Mark the liquidity first.** The bot keeps a list of levels that exist *before* anything happens: the Asia, London and
   New York session highs and lows (a box counts only after its last candle closed), the previous day, week and month high
   and low, the weekly and daily opening gaps, and "equal lows" (two 5m swing lows at the same price, untouched in between).
2. **Wait for a sweep.** Price makes a new 2-hour low and, on the way, trades through a level nobody had touched yet. It has
   to go at least half an ATR past it.
3. **Check the inducement.** Before the sweep, a small 5m swing low sat a little above the level (within 1 ATR, at most 3
   hours old). The final push ran through it: the early buyers got stopped. That trapped group is the "inducement".
4. **Wait for the shift (5m CISD).** Take the run of down-close 5m candles into the low; its first candle's open is the CISD
   level. The trigger is the first 5m close above it. Somewhere between the low and the trigger, one candle body must be at
   least 0.8 ATR (displacement).
5. **Place the order.** A buy limit at the CISD level, valid for 30 minutes. Entries only from 02:00 to 15:30.
6. **Confirm on 1 minute.** When price taps the limit, the bot waits up to 20 one-minute candles for a 1m CISD (a 1m close
   back above the open of the last run of 1m down-closes), then buys at the next 1m open.
7. **Stop:** 1 tick beyond the sweep low. Never a fixed distance. A planned stop under 8 or over 80 points means no trade.
8. **Target:** the 18:00 open plus one VIX one-day move (the "VIX band"). It must be at least 1.5R away; if it is more
   than 8R away, profit is taken at 8R.
9. **Manage:** stop to breakeven at +1R, flat by 15:55, one trade a day.
10. **Size:** $800 risk up to a 20-point stop, then 800 x 20 / stop (a wider stop = fewer micros). After 2 stop-outs in a
    week, half size for the rest of that week. On Mondays, once Friday's high is taken only shorts, once Friday's low is
    taken only longs.

What cancels a setup before the fill (report ch.13 "what cancels a reversal", all applied by the bot): the sweep low
breaks, the target trades first, 30 minutes pass without a tap, 20 minutes pass without the 1m confirmation, or it is
15:55. A missed move stays missed: the bot never chases with a market order.

## Before a trade (report ch.25) - does the bot do it?

| Question from the report | Bot | How |
|---|---|---|
| Which model version and session window are active? | yes | `live_model.json` "lit" (one frozen version); entries 02:00-15:30 |
| Was the level marked before the event, and when did it become available? | yes | every level carries the bar it became known; a box counts only after it closed |
| What apparent trade is the inducement, and what confirms or rejects it? | yes | the trapped swing low above the level (step 3); the 5m CISD confirms |
| Have the response and the trigger actually completed? | yes | decisions use closed candles only |
| Executable entry, structural stop, cost allowance, first objective? | yes / partly | limit, stop beyond the sweep, VIX band; costs ($1.40 a micro, 1 tick) are in every result but not inside the $800 budget (tested: costs $1.6k, not adopted) |
| Does the whole-number size fit the remaining risk budget? | yes | micros rounded down, under 1 micro = no trade; MFFU daily limit never binds (worst 2026 day -$755) |
| When does the setup expire, and what cancels an unfilled order? | yes | 30 + 20 minutes, the cancel list above |

## After a trade (report ch.25)

| Item | Bot | Where |
|---|---|---|
| Intended vs actual fills, fees, slippage, exit reason | yes | paper ledger (cloud monitor), NinjaTrader audit log |
| Separate "followed the rules" from "made money" | yes | every replay trade has a report (why it entered, plan, result, lessons) in `backtest_live.json` |
| Save the chart as it looked at the decision time | partly | trade gallery from the replay (`tools/trade_gallery.py`); the live bot keeps the bars, not a screenshot |
| Did the level, pivot and zone exist when the order went in? | yes | `tests/test_lit_lookahead.py`, `tests/test_lit_live.py` (120 of 120 trades equal live vs backtest) |
| Keep no-fill, expired and rejected signals apart from trades | yes | the live loop lists every signal with its status (pending / filled / no fill) |
| Change a rule only as a new version, judged on later data | yes | every experiment is a stored run (`research/runs/`); adopt only if Jan-Jun and Jul-Oct both improve |

## Reasons to skip (report ch.18 "a practical skip policy")

| Skip when... | Bot | Note |
|---|---|---|
| the level or zone was not known before the signal | yes | built into the level list |
| the reclaim, displacement or entry return is missing | yes | no CISD close, no 0.8 ATR body, no tap = no trade. (Requiring a close back above the swept level itself was tested: -$17k in Jan-Jun) |
| the first objective already traded, or there is too little room | yes | target trades before the tap = cancelled; target under 1.5R = no trade |
| the size rounds to zero or the daily risk is used up | yes | one trade a day; under 1 micro = no trade |
| data quality or execution conditions break the model | partly | stale feed blocks new entries (PC bot); a day without clean 1m bars falls back to 5m; missing bars inside the day are not checked |
| explaining the trade needs a changed range, pivot or zone | yes | the rules are fixed code; nothing is redrawn afterwards |
| a news release is due | no | tested twice (news day, CPI/FOMC weeks, 5-60 min guards): no help, LIT entries are rarely near releases |
| a second sweep after a stop-out | yes | one trade a day; a same-day re-entry or a flip to the other side was tested and rejected |

## Session clocks (report ch.12 and 28)

- **New York time with a named time zone** (America/New_York), never a fixed UTC offset. Bars are stored in UTC.
- **Trading day 18:00 to 17:00**; the CME daily halt is 17:00-18:00 ET and Friday has no evening session.
- **Early closes:** US holiday sessions halt at 13:00 ET; the day after Thanksgiving and Christmas Eve at 13:15 ET; Good
  Friday 09:15 ET when it trades. Since 2026-10-18 the NinjaTrader route stops new entries 15 minutes and flattens 5 minutes
  before such a halt (before, it would have held a position into a holiday close).
- **Daylight saving:** the US and Europe change clocks on different dates. In 2026, Mar 9-27 and Oct 26-30 the London
  open is 04:00 ET instead of 03:00. The bot's London boxes are New York windows (03:00-04:00 ET all year); the
  Berlin-time version was tested (`lit-report-tests`).
- **The old 16:15-16:30 pause no longer exists** for NQ/MNQ (removed by CME in June 2021).

## Glossary (short)

| Term | Meaning |
|---|---|
| Liquidity (chart sense) | orders assumed to rest near obvious highs and lows (stops, breakout orders). Inferred, not visible |
| BSL / SSL | buy-side liquidity above highs / sell-side liquidity below lows |
| Sweep (raid) | price trades through a known high or low |
| Inducement (IDM) | an obvious early trade (a small swing) that gets trapped before the real move |
| Reclaim | price closes back on the original side of the swept level |
| Acceptance | price stays beyond the level (closes there, retests it from the other side): the sweep became a breakout |
| CISD | change in state of delivery: a close through the open of the run of opposite candles into the extreme |
| BOS / CHOCH / MSS | break of structure / change of character / market structure shift: kinds of swing breaks |
| Displacement | a strong candle relative to recent ones (here: a body of 0.8 ATR or more) |
| FVG / CE / IFVG | fair value gap (3-candle gap) / its midpoint / a gap closed through and used the other way |
| Order block (OB) | the last opposite candle(s) before a displacement, used as a zone |
| POI | point of interest: a place to watch, not a signal |
| Premium / discount | above / below the middle of a chosen range |
| PDH / PDL, PWH / PWL, PMH / PML | previous day / week / month high and low |
| NWOG / NDOG | new week / new day opening gap |
| Build-up, EQH / EQL | a cluster of equal highs or lows that attracts orders |
| R | the entry-to-stop risk; +2R = won twice the risk |
| BE | breakeven: stop moved to the entry (fees still cost a little) |
| MAE / MFE | worst / best point a trade reached |
| SMT | in official LIT, "smart money trap" (a zone that first works, then fails); elsewhere a divergence between two markets |

## What the report's audit of published LIT trades found (chapter 26)

- **No published LIT record proves a profitable, repeatable NQ or MNQ strategy.** The report checked every number it could.
- **A practitioner journal (62 trades, two prop challenges):** both challenges lost money (-$96 and -$831 on $5k and $10k
  accounts) although they contained winners. A "9.9R target" trade lost $25; a reported 4R winner took half at 3R and moved
  the stop to entry.
- **A published simulation (238 trades, "62.6% win rate, +247R"):** the 62.6% leaves out 27 breakevens and 64 unresolved
  trades. Counted over all 238, only 38.7% were positive. Its later forward test (52 trades) lost money (PF 0.94).
- **A gold bot with a 77% win rate** had a 40.7% drawdown; **a "LIT" service with 71% wins** had PF 0.83 and lost almost
  everything. A high win rate can still lose money.
- **Official ReimFX videos** are replays: target touches, not account profit. Their useful lessons are practical: target
  the next opposing liquidity first, keep the stop beyond the real structure (not the exact extreme tick), avoid holding
  into big news.
- **Big R claims come from tiny stops** (a 2.8-pip stop "worth 140R"): a small stop magnifies both the R and the effect of
  slippage.
- **For the bot this means:** keep judging LIT only on its own complete, costed sample, split into a tuning half and a check
  half, which is what every LIT study here does. Partial profits and earlier breakevens (the report's "half at 3R" lesson)
  were tested on the bot's trades and cost money in both halves (`lit-losses`), because LIT's year is carried by a few
  5-8R days.

## Where to read more

- The rules and numbers: `STRATEGY.md`, `research/writeups/lit-final.md`, `lit-losses.md`, `lit-experiments.md`.
- The report's ideas tested on 2026: `research/writeups/lit-report-tests.md` (`tools/lit_report.py`).
