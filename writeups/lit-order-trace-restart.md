# LIT order trace: 2026-01-02 (SHORT 34 MNQ, backtest exit BE)

Built by `python -X utf8 tools/lit_order_trace.py --day 2026-01-02 --py-restart 3 --nt-restart 6 --nt-back 9 --out research/lit/order_trace_restart.md` (pre-launch audit 2026-10-24). The PC live loop (`engine/live.LiveBot`, model LIT = `live_model.json` "lit", NinjaTrader adapter on Sim101) polled on its own schedule (2 s and 32 s after each minute) against a fake NinjaTrader folder (`engine/ninjatrader._FakeNT`). The fake market walks the real TradingView NQ1! 1m bars (stop-side extreme first); a MARKET order fills at the forming minute's open. Times are ET. Size here = the plain LIT size rule (no eval caps), as in `tests/test_lit_oif.py`.

How to read it: the "limit at the CISD level for 30 min" is a price the model watches (MODEL rows: armed, tapped, waiting for the 1m CISD); nothing is sent to NinjaTrader until the 1m CISD candle closes. Then ONE MARKET entry, and only after NinjaTrader reports its fill, ONE STOPMARKET + LIMIT pair sharing an OCO id. One trade a day, and the adapter refuses any entry while a bracket is open or NinjaTrader shows a position. The CLOSEPOSITION after a bracket fill is the bot's sync flatten of the model's exit (harmless when already flat).

Backtest (tools/lit_final.run, live_model.json "lit"): entry bar 02:04:00 at -26438.0 (fill = that 1m bar's open + 1 tick), stop 26449.5, target 26346.0, 34 micros, exit BE at 02:25:00, $+20.40.

## Checks

- [PASS] no order file before the 1m CISD candle closed (the 30-min limit is virtual)
- [PASS] exactly one entry order (PLACE ... MARKET), no second entry
- [PASS] entry side / micros = the backtest's
- [PASS] stop STOPMARKET at the backtest's stop (tick-rounded)
- [PASS] target LIMIT at the backtest's target (tick-rounded)
- [PASS] stop and target placed only after NinjaTrader reported the entry fill
- [PASS] one bracket only (no second stop / target pair)
- [PASS] the trade's exit is routed exactly once

## Timeline

| ET | who | what |
|---|---|---|
| 00:49:02 | STATE | poll 00:49:02: LIT: waiting for London sweep (entries from 02:00 ET) |
| 02:00:02 | MODEL | setup SHORT: armed at the close of the 5m CISD bar (02:00:00), virtual limit 26,436.50, stop 26,449.50, target 26,332.50, valid until 02:30:00; waiting for price to tap the level (no order at NinjaTrader) |
| 02:00:02 | STATE | poll 02:00:02: LIT: SHORT limit armed at 26,436.50 until 02:30 ET (stop 26,449.50, target 26,332.50) |
| 02:01:02 | MODEL | setup SHORT: armed at the close of the 5m CISD bar (02:00:00), virtual limit 26,436.50, stop 26,449.50, target 26,332.50, valid until 02:30:00; level TAPPED by the 1m bar opening 02:00:00, waiting for a 1m CISD (no order at NinjaTrader) |
| 02:01:02 | STATE | poll 02:01:02: LIT: SHORT limit 26,436.50 tapped at 02:00, waiting for a 1m CISD (stop 26,449.50) |
| 02:04:02 | STATE | poll 02:04:02: LIT: ENTERING SHORT at market now (1m CISD closed 02:04 ET) / 34 micros / stop 26,449.50 / target 26,346.00 |
| 02:04:02.2 | OIF | adapter writes `oif_le_1792867772235_1.txt` (ENTRY): <br>`PLACE;Sim101;MNQ 03-26;SELL;34;MARKET;0;0;DAY;;LE1767337440DE64ME;;` |
| 02:04:02.2 | NT | fake NinjaTrader processed the file at price 26438.25: LE1767337440DE64ME MARKET SELL 34 -> FILLED filled 34 @ 26438.25 / position MNQ 03-26 Sim101: -34 @ 26438.25 |
| 02:04:02.3 | OIF | adapter writes `oif_le_1792867772236_2.txt` (BRACKET): <br>`PLACE;Sim101;MNQ 03-26;BUY;34;STOPMARKET;0;26449.50;DAY;LE1767337440DE64MO;LE1767337440DE64MS;;` <br>`PLACE;Sim101;MNQ 03-26;BUY;34;LIMIT;26346.00;0;DAY;LE1767337440DE64MO;LE1767337440DE64MT;;` |
| 02:04:02.3 | NT | fake NinjaTrader processed the file at price 26438.25: LE1767337440DE64MS STOPMARKET BUY 34 -> WORKING; LE1767337440DE64MT LIMIT BUY 34 -> WORKING / position MNQ 03-26 Sim101: -34 @ 26438.25 |
| 02:05:02 | STATE | poll 02:05:02: LIT: IN TRADE SHORT @ 26,438.00 / stop 26,449.50 / target 26,346.00 |
| 02:07:02 | RESTART | PYTHON RESTART: a new LiveBot starts on the same live_state.json / ninjatrader_state.json (restored: {"ledger": 1, "open_routed": 1767337440, "kill": false, "started_at": 1767332880, "saved_at": 1767337592}; adapter legs restored: [('LE1767337440DE64ME', 'protected')]) |
| 02:10:02 | RESTART | NINJATRADER RESTART: every file in outgoing deleted (the broker keeps the position and the working stop / target; NinjaTrader does not rewrite the order files) |
| 02:10:02.0 | ALERT | phone alert: NinjaTrader's outgoing reports vanished (MNQ 03-26 Globex_Sim101_Position.txt, LE1767337440DE64ME.txt, LE1767337440DE64MS.txt, LE1767337440DE64MT.txt): NinjaTrader restarted or its folder was cleared. The bot does NOT assume flat. Open: SELL 34 MNQ 03-26 (protected). The stop / target should still be working at the broker: check NinjaTrader Orders + Positions now. New entries are blocked until NinjaTrader writes the position file again or you run python -m engine.ninjatrader --confirm-reset. |
| 02:10:02.0 | ADAPTER | risk: NinjaTrader: NinjaTrader's outgoing reports vanished (MNQ 03-26 Globex_Sim101_Position.txt, LE1767337440DE64ME.txt, LE1767337440DE64MS.txt, LE1767337440DE64MT.txt): NinjaTrader restarted or its folder was cleared. The bot does NOT assume flat. Open: SELL 34 MNQ 03-26 (protected). The stop / target should still be working at the broker: check NinjaTrader Orders + Positions now. New entries are blocked until NinjaTrader writes the position file again or you run python -m engine.ninjatrader --confirm-reset. |
| 02:13:02 | RESTART | NinjaTrader connected again: it writes the position file (not the order files) |
| 02:13:02.0 | ALERT | phone alert: after the NinjaTrader restart the stop and target report of the open MNQ 03-26 trade did not come back: check in NinjaTrader's Orders tab that both are still working (the bot keeps managing the trade and routes its exit). |
| 02:13:02.0 | ADAPTER | system: NinjaTrader: NinjaTrader writes the position file again: new entries allowed again |
| 02:13:02.0 | ADAPTER | risk: NinjaTrader: after the NinjaTrader restart the stop and target report of the open MNQ 03-26 trade did not come back: check in NinjaTrader's Orders tab that both are still working (the bot keeps managing the trade and routes its exit). |
| 02:20:02 | STATE | poll 02:20:02: LIT: IN TRADE SHORT @ 26,438.00 / stop 26,436.75 (breakeven) / target 26,346.00 |
| 02:20:02.2 | OIF | adapter writes `oif_le_1792867779959_1.txt` (MOVE STOP): <br>`CHANGE;;;;0;;0;26436.75;;;LE1767337440DE64MS;;` |
| 02:20:02.2 | NT | fake NinjaTrader processed the file at price 26426.25: no order change / position MNQ 03-26 Sim101: -34 @ 26438.25 |
| 02:24:59.9 | NT | market trades 26437.00: LE1767337440DE64MS STOPMARKET BUY 34 -> FILLED @ 26436.75 |
| 02:24:59.9 | NT | market trades 26437.00: LE1767337440DE64MT LIMIT BUY 34 -> CANCELLED |
| 02:25:02 | STATE | poll 02:25:02: LIT: done for today (BE +0.03R, $+20); 1 trade a day |
| 02:25:02.0 | ADAPTER | system: NinjaTrader: bracket closed the trade: STOP filled 34 MNQ 03-26 @ 26436.75 |
| 02:25:02.2 | OIF | adapter writes `oif_le_1792867782414_2.txt` (CLOSE (BE)): <br>`CLOSEPOSITION;Sim101;MNQ 03-26;;;;;;;;;;` |
| 02:25:02.2 | NT | fake NinjaTrader processed the file at price 26435.25: no order change / position MNQ 03-26 Sim101: +0 @ 0.00 |

## Bot ledger (live_state.json rows)

```
{"t": 1767337442, "side": "sell", "qty": 34, "stop": 26449.5, "target": 26346.0, "entry": 26438.0, "reason": null, "pnl": null, "ok": true}
{"t": 1767338402, "side": "modify", "qty": 34, "stop": 26436.75, "target": null, "entry": null, "reason": "BE", "pnl": null, "ok": true}
{"t": 1767338702, "side": "exit", "qty": 34, "stop": null, "target": null, "entry": null, "reason": "BE", "pnl": 20.4, "ok": true}
```

## Adapter / bot log lines (order route)

```
```

## OIF audit log (logs/ninjatrader_oif.log format; stamps are this machine's wall clock)

```
2026-10-24 14:49:32 ET  Sim101  oif_le_1792867772235_1.txt  PLACE;Sim101;MNQ 03-26;SELL;34;MARKET;0;0;DAY;;LE1767337440DE64ME;;
2026-10-24 14:49:32 ET  Sim101  oif_le_1792867772236_2.txt  PLACE;Sim101;MNQ 03-26;BUY;34;STOPMARKET;0;26449.50;DAY;LE1767337440DE64MO;LE1767337440DE64MS;;
2026-10-24 14:49:32 ET  Sim101  oif_le_1792867772236_2.txt  PLACE;Sim101;MNQ 03-26;BUY;34;LIMIT;26346.00;0;DAY;LE1767337440DE64MO;LE1767337440DE64MT;;
2026-10-24 14:49:39 ET  Sim101  oif_le_1792867779959_1.txt  CHANGE;;;;0;;0;26436.75;;;LE1767337440DE64MS;;
2026-10-24 14:49:42 ET  Sim101  oif_le_1792867782414_2.txt  CLOSEPOSITION;Sim101;MNQ 03-26;;;;;;;;;;
```

196 polls in 48 s.
