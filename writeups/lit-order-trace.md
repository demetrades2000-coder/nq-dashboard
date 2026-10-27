# LIT order trace: 2026-01-07 (LONG 16 MNQ, backtest exit TARGET)

Built by `python -X utf8 tools/lit_order_trace.py --day 2026-01-07` (pre-launch audit 2026-10-24). The PC live loop (`engine/live.LiveBot`, model LIT = `live_model.json` "lit", NinjaTrader adapter on Sim101) polled on its own schedule (2 s and 32 s after each minute) against a fake NinjaTrader folder (`engine/ninjatrader._FakeNT`). The fake market walks the real TradingView NQ1! 1m bars (stop-side extreme first); a MARKET order fills at the forming minute's open. Times are ET. Size here = the plain LIT size rule (no eval caps), as in `tests/test_lit_oif.py`.

How to read it: the "limit at the CISD level for 30 min" is a price the model watches (MODEL rows: armed, tapped, waiting for the 1m CISD); nothing is sent to NinjaTrader until the 1m CISD candle closes. Then ONE MARKET entry, and only after NinjaTrader reports its fill, ONE STOPMARKET + LIMIT pair sharing an OCO id. One trade a day, and the adapter refuses any entry while a bracket is open or NinjaTrader shows a position. The CLOSEPOSITION after a bracket fill is the bot's sync flatten of the model's exit (harmless when already flat).

Backtest (tools/lit_final.run, live_model.json "lit"): entry bar 04:43:00 at 26548.0 (fill = that 1m bar's open + 1 tick), stop 26526.0, target 26681.25, 16 micros, exit TARGET at 10:33:00, $+4,241.60.

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
| 03:28:02 | STATE | poll 03:28:02: LIT: watching for a sweep + inducement + CISD (entries until 15:30 ET) |
| 04:00:02 | MODEL | setup SHORT: armed at the close of the 5m CISD bar (04:00:00), virtual limit 26,563.25, stop 26,587.50, target 26,383.06, valid until 04:30:00; waiting for price to tap the level (no order at NinjaTrader) |
| 04:00:02 | STATE | poll 04:00:02: LIT: SHORT limit armed at 26,563.25 until 04:30 ET (stop 26,587.50, target 26,383.06) |
| 04:30:02 | MODEL | setup LONG: armed at the close of the 5m CISD bar (04:30:00), virtual limit 26,543.25, stop 26,526.00, target 26,681.25, valid until 05:00:00; waiting for price to tap the level (no order at NinjaTrader) |
| 04:31:02 | MODEL | setup LONG: armed at the close of the 5m CISD bar (04:30:00), virtual limit 26,543.25, stop 26,526.00, target 26,681.25, valid until 05:00:00; level TAPPED by the 1m bar opening 04:30:00, waiting for a 1m CISD (no order at NinjaTrader) |
| 04:31:02 | STATE | poll 04:31:02: LIT: LONG limit 26,543.25 tapped at 04:30, waiting for a 1m CISD (stop 26,526.00) |
| 04:43:02 | STATE | poll 04:43:02: LIT: ENTERING LONG at market now (1m CISD closed 04:43 ET) / 16 micros / stop 26,526.00 / target 26,681.25 |
| 04:43:02.3 | OIF | adapter writes `oif_le_1792867523922_1.txt` (ENTRY): <br>`PLACE;Sim101;MNQ 03-26;BUY;16;MARKET;0;0;DAY;;LE1767778980YEZRME;;` |
| 04:43:02.3 | NT | fake NinjaTrader processed the file at price 26547.75: LE1767778980YEZRME MARKET BUY 16 -> FILLED filled 16 @ 26547.75 / position MNQ 03-26 Sim101: +16 @ 26547.75 |
| 04:43:02.3 | OIF | adapter writes `oif_le_1792867523923_2.txt` (BRACKET): <br>`PLACE;Sim101;MNQ 03-26;SELL;16;STOPMARKET;0;26526.00;DAY;LE1767778980YEZRMO;LE1767778980YEZRMS;;` <br>`PLACE;Sim101;MNQ 03-26;SELL;16;LIMIT;26681.25;0;DAY;LE1767778980YEZRMO;LE1767778980YEZRMT;;` |
| 04:43:02.3 | NT | fake NinjaTrader processed the file at price 26547.75: LE1767778980YEZRMS STOPMARKET SELL 16 -> WORKING; LE1767778980YEZRMT LIMIT SELL 16 -> WORKING / position MNQ 03-26 Sim101: +16 @ 26547.75 |
| 04:44:02 | STATE | poll 04:44:02: LIT: IN TRADE LONG @ 26,548.00 / stop 26,526.00 / target 26,681.25 |
| 07:04:02 | STATE | poll 07:04:02: LIT: IN TRADE LONG @ 26,548.00 / stop 26,549.25 (breakeven) / target 26,681.25 |
| 07:04:02.3 | OIF | adapter writes `oif_le_1792867605301_3.txt` (MOVE STOP): <br>`CHANGE;;;;0;;0;26549.25;;;LE1767778980YEZRMS;;` |
| 07:04:02.3 | NT | fake NinjaTrader processed the file at price 26570.50: no order change / position MNQ 03-26 Sim101: +16 @ 26547.75 |
| 10:32:59.9 | NT | market trades 26683.50: LE1767778980YEZRMS STOPMARKET SELL 16 -> CANCELLED |
| 10:32:59.9 | NT | market trades 26683.50: LE1767778980YEZRMT LIMIT SELL 16 -> FILLED @ 26681.25 |
| 10:33:02 | STATE | poll 10:33:02: LIT: done for today (TARGET +6.03R, $+4,242); 1 trade a day |
| 10:33:02.0 | ADAPTER | system: NinjaTrader: bracket closed the trade: TARGET filled 16 MNQ 03-26 @ 26681.25 |
| 10:33:02.3 | OIF | adapter writes `oif_le_1792867728190_4.txt` (CLOSE (TARGET)): <br>`CLOSEPOSITION;Sim101;MNQ 03-26;;;;;;;;;;` |
| 10:33:02.3 | NT | fake NinjaTrader processed the file at price 26683.00: no order change / position MNQ 03-26 Sim101: +0 @ 0.00 |

## Bot ledger (live_state.json rows)

```
{"t": 1767778982, "side": "buy", "qty": 16, "stop": 26526.0, "target": 26681.25, "entry": 26548.0, "reason": null, "pnl": null, "ok": true}
{"t": 1767787442, "side": "modify", "qty": 16, "stop": 26549.25, "target": null, "entry": null, "reason": "BE", "pnl": null, "ok": true}
{"t": 1767799982, "side": "exit", "qty": 16, "stop": null, "target": null, "entry": null, "reason": "TARGET", "pnl": 4241.6, "ok": true}
```

## Adapter / bot log lines (order route)

```
04:43:02 system: LIT 1m CISD closed at 04:43 ET: MARKET entry sent at once (2 s after the close; the backtest fills at this bar's open)
```

## OIF audit log (logs/ninjatrader_oif.log format; stamps are this machine's wall clock)

```
2026-10-24 14:45:23 ET  Sim101  oif_le_1792867523922_1.txt  PLACE;Sim101;MNQ 03-26;BUY;16;MARKET;0;0;DAY;;LE1767778980YEZRME;;
2026-10-24 14:45:23 ET  Sim101  oif_le_1792867523923_2.txt  PLACE;Sim101;MNQ 03-26;SELL;16;STOPMARKET;0;26526.00;DAY;LE1767778980YEZRMO;LE1767778980YEZRMS;;
2026-10-24 14:45:23 ET  Sim101  oif_le_1792867523923_2.txt  PLACE;Sim101;MNQ 03-26;SELL;16;LIMIT;26681.25;0;DAY;LE1767778980YEZRMO;LE1767778980YEZRMT;;
2026-10-24 14:46:45 ET  Sim101  oif_le_1792867605301_3.txt  CHANGE;;;;0;;0;26549.25;;;LE1767778980YEZRMS;;
2026-10-24 14:48:48 ET  Sim101  oif_le_1792867728190_4.txt  CLOSEPOSITION;Sim101;MNQ 03-26;;;;;;;;;;
```

854 polls in 249 s.
