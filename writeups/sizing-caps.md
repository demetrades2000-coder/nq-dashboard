## In one minute

- **The bug.** Each cap did `q = max(1, cap)`: when the cap allowed 0.4 micros, the bot still sent 1. With a $120 room and a
  50-pt stop that is a $102 stop-out against a $72 cap; with $60 room it breaks the max-loss floor (eval failed by the bot's own
  order). Same with the soft daily loss nearly used, ATLAS / account B on a wide stop, the extra accounts' daily loss.
- **The fix.** Micros after all caps; fewer than 1 -> **skip**. Every cap uses (stop + 1 tick) x $2 + $1.90 a micro. The
  "risk $" base may still round to 1 micro, but only when that micro fits every ceiling. The 1-micro minimum-days trade after
  an early target stays, and must fit too. A last check in every eval mode (`sizing.ceilings`): below the room, inside the soft
  daily loss ($1,000 50K / $600 25K), inside the weekly loss budget when `wk_loss_usd` is on.
- **What it costs.** Nothing on fresh evals' pass odds; the 2-week fails become "stuck" evals. The owner must replace a stuck
  eval (push "EVAL STUCK", room under $200), or the bot waits on it for weeks.

## Where "min 1 micro" overrode a cap (before)

| place | cap |
|---|---|
| `engine/sizing.py` two_week_qty caps loop `q = max(1, cap)` | max_usd, protect, 60% room, soft daily loss |
| two_week_qty min-days `return 1` | not checked against any cap |
| lit_qty_core eval / safe_eval `q = max(1, cap)` | 60% room (`safe_cap`) |
| fast_eval | no room cap at all |
| eval_lock min-days `qty=1` | not checked |
| funded_qty best-day / 60% room `max(1, cap)`, hard caps with `skip_breach false` | best day, room, soft daily loss |
| day_guard `breach "one"` | room, daily loss (option, off) |
| second_qty base `max(1, ...)` | ATLAS $500 / account B $150 / $300 |
| `engine/multi_account.py` qty_for `max(1, ...)` | best-day rule, the account's daily loss, max_risk_usd |

Multipliers that floor at 1 (weekly stop, learned cut, inducement cut, old engine cold / late) stay: they only shrink a size
that already fit, and the final ceilings run after them.

## Numbers (2026, eval path, run lit_adopt_t15_be_off_eval units, costs in)

| | H1 path $ | H2 path $ | 2-week pass / fail / stuck H1 | H2 |
|---|---|---|---|---|
| before (published) | +34,253 | +9,059 | 57.1 / 5.9 / - | 52.2 / 0.0 / - |
| after, old path rule | +27,164 | -1,940 | 57.1 / 0.0 / - | 52.2 / 0.0 / - |
| before, stuck at $200 | +27,949 | +15,336 | 57.1 / 0.0 / 14.3 | 52.2 / 0.0 / 11.6 |
| after, stuck at $200 | +28,482 | +14,771 | 57.1 / 0.0 / 13.4 | 52.2 / 0.0 / 11.6 |

Entries skipped by a cap on the path: 4 (H1) + 25 (H2) with the old path rule (the H2 eval from Jul 1 drained to $60 room and
skipped every later signal), 0 with the stuck rule. 1-month pass H2 50.8 -> 49.2. The stored run lit_live (LIT size rule,
mode normal) is unchanged: the invariant acts only in the eval modes.

Account B (tools/second_account_b.py): 25K need H1 2-week 68.9/0.0 -> 62.2/0.0 (stuck 7.6 -> 0.8), H2 43.5/0.0 unchanged; path
H1 +$19.7k -> +$14.8k, H2 +$5.4k -> +$6.7k. 50K need H1 72.3/2.5 -> 73.9/0.0, H2 53.6/0.0 unchanged. Skip-only (old room-cap
denominator) would keep the 25K H1 at 68.1: the 1 tick + $1.90 in the room cap is what costs it. ATLAS EMA routed on LIT's
account (tools/second_route_eval.py, live route): H1 2-week 55.5/10.9 -> 51.3/0.0, H2 69.6/0.0 unchanged.

Path $ hangs on one or two evals (a 40-trade H2): read the fresh-eval odds, not the path, for the change itself.
