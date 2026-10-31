# Proposed engine/lit.py change: the 15-minute check (NOT applied; off by default)

Research: research/writeups/lit-loss-learning.md, run lit_ll_t15, tools/lit_loss_learn.py.
Apply only AFTER the 21:00 ET launch, with tests. Default None = today's behaviour exactly.

## 1. Default (in the LIT defaults dict, after "wk_stop")

> _Code omitted on the public site._

## 2. simulate_x management loop

Replace

> _Code omitted on the public site._

with

> _Code omitted on the public site._

and after the flat check (`exit_px, kind = float(c_d[k]) - SLIP, "EOD"; break`), before `k += 1`:

> _Code omitted on the public site._

This is exactly the study's rule (tools/lit_loss_learn.py psim, rule "ts" with upto = at): close strictly below entry - x R.

## 3. Before switching it on

- `python -X utf8 -m tests.test_lit_live` must stay 120/120 with t_check None.
- A new test: with `t_check {"at": 15, "x": 0.3, "mfe": 0.5}` the engine's 2026 trades must equal
  `tools/lit_loss_learn.py variant(T15)` (13 CUT_T15 exits: 2026-01-13, 01-16, 01-29, 01-30, 03-04, 03-31, 04-28, 05-07, 05-12,
  07-03, 07-07, 09-02, 10-06).
- Live wiring: CUT_T15 is a market exit. The PC/NinjaTrader route needs `route_all_exits`; the cloud paper ledger must accept
  the new exit kind. The weekly stop (`wk_stop`) counts "STOP" exits only; under two_week config C it is off anyway.
- live_model.json change (coordinator): `"lit": {..., "t_check": {"at": 15, "x": 0.3, "mfe": 0.5}}`.
