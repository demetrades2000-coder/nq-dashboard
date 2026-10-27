## In one minute

- **The order (owner, 2026-10-25):** Zlarior (the LIT bot) and ATLAS "should learn, like a human trader without emotion".
- **What a good trader learns from his own trading** - and what was built:
  1. **What his fills really cost.** The PC now measures every real NinjaTrader fill: how many ticks worse than the model's
     price the entry was, how far past the stop the stop filled, how long from the signal to the order, and what the
     commission really was (from the real balance).
  2. **How far he is from his plan.** Every finished trade is put next to what the backtest did on the same bars: same
     trade, missed trade, or extra trade, and the $ and R difference. Every Sunday evening one push sums up the week.
  3. **What he would change - written down, not acted on.** The learning loop's size ideas show as "The bot suggests"
     cards, with the evidence and the $ they would have made or cost. You approve them with one command, or not.
- **What it may change by itself: nothing, unless you switch it on.** With `learn_costs` on, the only effect is a
  **smaller** size when real fills cost more than the 1 tick and $1.90 the sizing assumes. Never larger. Never a
  different entry, stop or target.
- **Why not more:** the research already showed that a bot that re-tunes its own size or filters does worse
  (`research/writeups/lit-learning-loop.md`: the learning loop ships in observe mode; `hq-habits.md`: the weekly
  self-check lost money). So the learning here is the safe kind.

## 1. Execution learning (switch `learn_costs`, default OFF)

**What is measured, per bot** (Zlarior = LIT; ATLAS = the routed second strategies; ATLAS v2 is paper only and has no fills):

| Measure | How | Source |
|---|---|---|
| Entry slippage | fill price vs the model's entry, in ticks (+ = worse) | NinjaTrader legs / route result |
| Stop slippage | a stop or breakeven fill vs the stop price | NinjaTrader `outgoing\` order states |
| Target slippage | a target fill vs the target | same |
| Latency | signal (1m CISD close) to order, and to fill, seconds | the bot's ledger |
| Commission | $1.90 + (the fills' P&L - the real cash change) / micros, per day | `engine/broker_balance.py` real cash |

**The learned cost reserve** (last 30 real fills, at least 5, else nothing is learned):

- `reserve_ticks` = the 75th percentile of the adverse slippage (entries and stop exits; a better fill counts 0), rounded
  up, never below 1 tick (today's assumption), never above 4.
- `comm` = the median commission a micro, never below $1.90, never above $4.00.

**What sizing does with it (`learn_costs: true`):** every cap that protects the account prices one micro's full stop-out
at `(stop + reserve x 0.25) x $2 + comm` instead of `(stop + 1 tick) x $2 + $1.90`:

- the room to the trailing max-loss floor,
- the two-week room share (55%) / the eval safe cap (60%),
- the $1,000 soft daily loss (minus today's losses),
- the eval weekly loss ($1,200).

So a trade sitting at a cap gets fewer micros; one micro that no longer fits is skipped. A trade not at any cap is
unchanged. ATLAS's routed size (`second_qty`) uses ATLAS's own reserve the same way.

**Proof that it is safe** (`tests/test_learning_live.py`):

- Off, absent, or on with nothing learned: **identical** size and reasons on 2,100 sizing cases (every mode, stops
  6-80 pts, fresh / mid / near-the-floor / passed / session-12 evals).
- On, with 2 / 3 / 4 ticks and $1.90-$4.00 (and a nonsense 9 ticks / $9, clipped to 4 / $4): **never more micros** on
  3,000+ LIT and ATLAS cases; every routed size fits the room and the soft daily loss at the learned price; every cut says
  why in the size reasons.

**What it does to the money** - the MFFU Builder 50K eval Monte Carlo (`engine/eval_mc.py`, 2,000 paths, fresh eval,
the live `two_week` sizing, the 2026 sessions of the live replay). "Fills worse" = the real fills are that many ticks worse
than the model on both the entry and the exit:

| Half | Fills worse | Sizing | 2-wk pass (p10) | 2-wk fail (f10) | Pass eventually | Median sessions |
|---|---:|---|---:|---:|---:|---:|
| H1 (Jan-Jun) | 0 | today (1 tick) | 51.5% | 0.0% | 88.3% | 8 |
| H1 | 0 | reserve 2 ticks | 51.5% | 0.0% | 88.0% | 8 |
| H1 | 1 | today | 51.4% | 0.0% | 87.3% | 8 |
| H1 | 1 | reserve 2 ticks | 51.4% | 0.0% | 87.6% | 8 |
| H1 | 3 | today | 46.8% | 0.0% | 85.3% | 9 |
| H1 | 3 | reserve 4 ticks | 46.8% | 0.0% | 84.8% | 9 |
| **H2 (Jul-Oct, check)** | 0 | today | 52.2% | 0.0% | 82.3% | 7 |
| H2 | 0 | reserve 2 ticks | 52.2% | 0.0% | 82.7% | 7 |
| H2 | 1 | today | 52.0% | 0.0% | 82.7% | 7 |
| H2 | 1 | reserve 2 ticks | 52.0% | 0.0% | 82.5% | 7 |
| H2 | 3 | today | 51.9% | 0.0% | 80.1% | 7 |
| H2 | 3 | reserve 4 ticks | 51.7% | 0.0% | 80.3% | 7 |

- **Verdict:** neutral on eval speed (differences of 0.5 points or less = noise), fails stay 0%. It is insurance for the
  day the real fills are much worse than the model (a fast market, a wide stop near the floor), not a money change. It
  ships **OFF** because the owner asked for it off by default; turning it on costs nothing measurable.
- **Rejected: shrinking every size in proportion** (`learn_costs: "scale"`, kept as an option). On the 120 trades of the
  2026 journal at the LIT size rule, a 2-tick reserve makes 97 of 120 trades 1 micro smaller (the rounding down bites on
  almost every trade):

| Span | Fills worse | Today: net / $ a month / PF / max DD | "scale" 2-4 ticks: net / $ a month / PF / max DD |
|---|---:|---|---|
| H1 | 0 | +$37,046 / $6,174 / 4.06 / -$3,022 | +$34,175 / $5,696 / 4.62 / -$2,188 |
| H2 | 0 | +$11,659 / $2,915 / 2.50 / -$1,988 | +$9,360 / $2,340 / 2.44 / -$1,570 |
| H2 | 3 | +$11,050 / $2,763 / 2.35 / -$2,084 | +$8,843 / $2,211 / 2.30 / -$1,709 |
| 2026 | 0 | +$48,705 / $4,870 / 3.45 / -$3,022 | +$43,536 / $4,354 / 3.74 / -$2,188 |

  It gives up about $500 a month to save about $400-800 of drawdown, even when the fills really are 3 ticks worse. Not
  worth it on an eval that must pass in 2 weeks. 2021-25 is not used here: there are no real fills from those years, and
  the reserve changes nothing until real fills exist.

## 2. Trade review journal (observe)

Every finished trade gets one record (`engine/live_learning.review`):

- **What the backtest twin did on the same bars:** Zlarior - the live loop's own replay (`engine/lit_live.run`; on the PC
  the fill audit's day replay, the same trades - checked in the test); ATLAS - this run's `engine/second.run`; ATLAS v2 -
  the member trade it copied.
- **Status:** same trade (matched), missed (the backtest traded, the bot did not), extra (the bot traded, the backtest
  did not).
- **Differences:** entry time, fill (ticks), exit kind and ticks, micros (sizing, not execution), $ gap and R gap, and the
  execution $ (the gap at the same micros).
- **Why it lost:** the LIT journal's cause code (`engine/lit_learn.cause_codes`: wick then target, opposite extreme
  already in, breakeven scratch, ...).
- **MFE / MAE** in R from the 1m bars.
- **Rule checks** (PC, after each session): every LIT rule the Bot Brain checked on that setup (`engine/brain._checks`
  through `brain.replay`).

**Tested on the 2026 replay** (Aug-Oct 2026, 24 finished trades): with paper fills at the model price every record is
"same trade", 0 ticks, $0 gap. A fill 3 ticks worse shows +3 ticks and -$1.50 a micro; a dropped trade shows as missed with
the backtest's $; an added trade shows as extra with its own $.

**Weekly summary** (Mon-Fri, per bot): live vs backtest trades, $ and R, the gap, missed / extra trades and their $, median
fill slippage and entry delay, the loss causes, and **inside the expected band?** - Zlarior: the H2 bootstrap band
(`engine/health_band.py`); ATLAS: the go / no-go scorecard (`engine/second_scorecard.py`). **Pushed Sunday from 17:00 ET**
(or Monday morning if Sunday's run was missed), one push a week (kind "weekly", opens the Learning page).

## 3. "The bot suggests" (proposals, never changes)

- The learning loop (`engine/lit_learn.py`, observe mode since 2026-10-18) keeps its shadow size knobs. Today it suggests
  **stale traps 0.5x** and **fresh traps 1.25x** (learned by late April 2026). Each card shows the evidence, what the knob
  would have changed in $ on the journal (`lit_learn.simulate`, with the knob minus without), and:
  - approve: `python -m engine.lit_learn mode apply`
  - undo one knob: `python -m engine.lit_learn revert <id>`
- The cost reserve gets a card when the PC learned more than 1 tick or $1.90 and `learn_costs` is off.
- Nothing is applied from the dashboard. The research verdict on the knobs stands (H2 2-week passes fell from 29.5% to
  23.1% when applied), so the card is for information until a replay shows both halves better.

## Where to see it

- **Phone:** Zlarior > Results > **Learning**; ATLAS > Results > **Learning** (`tools/web_public/learning.js`, renderer
  `learncore.js`, data.json `learning_live`). Service worker cache `le-public-v35`.
- **PC:** Zlarior > Results > Learning (`#learnlit`), ATLAS > Results > Learning (`#learnatlas`); `GET /api/next/pc/learning`.
- **Files:** PC `logs/learning/costs.json`, `reviews.jsonl`, `cash.json` (machine-local); the heartbeat carries a small
  `learn` block; the cloud keeps its journal in `state.json` `learning_live`.

## Switches and commands

| What | Where | Default |
|---|---|---|
| Learned costs in sizing | `live_model.json` + `live_model_lit.json` `lit_sizing.learn_costs`: `true` (caps) / `"scale"` (caps + every size, not recommended) | `false` |
| Learning loop knobs | `python -m engine.lit_learn mode apply` / `mode observe` | observe |

- `python -m engine.live_learning costs` - rebuild the PC's learned costs and print them.
- `python -m engine.live_learning reviews --checks` - rebuild the PC's trade reviews with the rule checks.
- `python -X utf8 -m tests.test_learning_live` - the 48 checks.
