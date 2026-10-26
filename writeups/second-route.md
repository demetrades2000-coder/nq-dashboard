## In one minute

- **Built (OFF):** `second_model.json` has `"route": false` per strategy. `python -m engine.second --route ema_lon_vix on`
  makes the PC bot trade that strategy on its own account next to LIT (it refuses when `engine.ninjatrader --selftest`
  fails). `off` puts it back to paper. Nothing is switched on.
- **The rules on one account:**
  - one position at a time;
  - LIT first: no second-strategy entry while LIT is in a trade, entering, has a limit armed or waits for its 1m CISD;
  - when LIT enters while a second trade is open, that trade is closed at market first, then LIT enters;
  - max 2 trades a day, at most 1 of them a second strategy (the other slot is LIT's); LIT keeps its own 1 a day;
  - size on the eval: $500 risk, capped at 60% of the room to the trailing floor and by the $1,000 soft daily loss shared
    with LIT; no trade on a passed or failed eval; same session count as LIT.
- **Eval numbers with these rules (EMA, 2026):**
  - H1 2-week pass/fail **55.5 / 10.9** (research 61.3/5.0, LIT alone 57.1/5.9);
  - H2 2-week pass/fail **69.6 / 0.0** (research 69.6/2.9, LIT alone 52.2/0.0);
  - eval-path $: H1 **+$36,843** (research +$39,670, LIT alone +$34,234), H2 **+$11,216** (research +$23,040, LIT alone +$9,059).
- **Verdict:** the route works (tests below), but on the eval it is a weak add: H2 only +$2.2k over LIT alone and more
  fails in H1. Keep it OFF on the eval; if the owner wants the second strategies traded, a second account (second-mix.md)
  is still the better plan.

## Which rule did what (EMA on the eval, `tools/second_route_eval.py`, `research/second/route_eval.json`)

Each step is on top of the one before. LIT is the live two-week sizing (run `lit_adopt_t15_be_off_eval`), the EMA trades are
the live loop's own (`engine/second.run` gives exactly `research/second/ema_best.json` on every 2026 session).

| step | EMA trades 2026 | H1 2-wk pass/fail | H1 1-mo | H1 path $ (PF) | H2 2-wk pass/fail | H2 1-mo | H2 path $ (PF) |
|---|---:|---|---|---|---|---|---|
| LIT alone | 0 | 57.1 / 5.9 | 74.3 / 11.9 | +34,234 (4.02) | 52.2 / 0.0 | 50.8 / 0.0 | +9,059 (2.20) |
| 1. research (second-ema.md) | 71 | 61.3 / 5.0 | 76.1 / 11.0 | +39,670 (3.13) | 69.6 / 2.9 | 78.0 / 3.4 | +23,040 (3.19) |
| 2. + no EMA entry while LIT is armed / entering | 54 | 56.3 / 4.2 | 75.2 / 7.3 | +36,198 (3.09) | 69.6 / 0.0 | 76.3 / 0.0 | +12,042 (2.47) |
| 3. + EMA closed at market when LIT enters | 54 | 55.5 / 10.9 | 69.7 / 15.6 | +36,843 (3.13) | 69.6 / 0.0 | 74.6 / 0.0 | +11,216 (2.33) |
| 4. + pass lock = **the live route** | 54 | **55.5 / 10.9** | 69.7 / 15.6 | **+36,843 (3.13)** | **69.6 / 0.0** | 74.6 / 0.0 | **+11,216 (2.33)** |
| alt: live route without the armed block | 71 | 60.5 / 11.8 | 68.8 / 16.5 | +32,365 (2.78) | 71.0 / 0.0 | 76.3 / 0.0 | +11,247 (2.32) |

Why the gap to the research:

- **The research let LIT and EMA run at the same time.** In `tools/second_ema.combine` an EMA trade is only skipped when
  LIT is already in a trade; a LIT trade that starts while an EMA trade is open runs next to it (two positions). That
  happened 17 times in 2026. One position at a time needs a rule; LIT first means the EMA trade is closed at that minute
  (the MACD research rule, second-mix.md "pre"). 11 of the 17 are already gone with the armed block (LIT was armed when
  the EMA entered); the other 6 are closed when LIT enters: 02-25 target +7.1R -> +0.05R, 02-27 +1.4R -> +0.7R, 10-06
  +1.3R -> -0.5R, 02-12 stop -1.0R -> -0.6R, 06-03 and 06-16 breakevens -> +0.45R and +1.2R (about -7.5R in all).
- **No entry while LIT is armed** (the owner's order) removes 17 more EMA trades: 12 with a LIT limit working and 5 with
  LIT waiting for its 1m CISD. Most were breakevens and stops, but 4 were targets (03-27 +7.9R, 06-12 +8.0R, 05-27 +4.8R,
  10-02 +3.5R). This is most of the H2 money gap (+$23.0k -> +$12.0k).
- **The pass lock** never changed a result in 2026 (the eval is passed at a session's end in both).
- Without the armed block (the "alt" row) H2 is the same and H1 is worse on fails: the armed block is not what hurts the
  fails, the LIT-priority close is.

## How it works (engine/live.py)

- `engine/second.py` only computes (no adapter import; `tests/test_second.py` checks it). `LiveBot._second_route_tick`
  runs after LIT's routing and the state save, every poll (about 0.3 s): it manages the open second-strategy position and,
  right at a 5m open with the account flat and LIT idle, asks the strategy's own code (closed bars + the opening bar at
  its real open from the feed) whether it enters now. An entry is routed at market at once (2 s after the open in the
  replay), with the strategy's stop (1 tick beyond the sweep wick) and target in the same OCO bracket LIT uses, through
  `engine/guards.entry_block` (calendar, sanity, duplicate / 2 a day, feed stale, pause, presence, clock).
- Once the fill bar has closed the trade is checked against the strategy's own trade (not there -> flattened as NO TRADE).
- Breakeven moves (EMA: entry + 1.25 at 1R) go out as the same stop CHANGE LIT uses; the 15-minute cut (MACD, S/R) and the
  15:55 flat go out as CLOSEPOSITION at once; every model exit is routed like LIT's (`route_all_exits`).
- A failure in the second-strategy code is logged and never touches LIT (tested: LIT's orders identical, same delay).
- Restart: `live_state.json` keeps the open position's owner (`open_src`) and its plan; the reconcile guard sees it as the
  bot's own position.
- Not mirrored to extra accounts (`engine/multi_account.py` copies LIT only).

## Tests

`python -X utf8 -m tests.test_second_route` (results in `research/second/route_check.json`): unit checks (sizing = the
research eval-safe size, guards, the switch), route off = today (tests.test_lit_live --days --bot), EMA routed on 7 days
of 2026 H2 on the fake NinjaTrader (Sim101) incl. LIT + EMA days, MACD and S/R days with their 15-minute cuts, an injected
exception, a restart mid-trade. `tests/test_second.py` part e checks the second brain's rule checks against each
strategy's real decisions.
