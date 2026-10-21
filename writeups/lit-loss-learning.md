## In one minute

- **The order (owner, 2026-10-18):** "Start really working on these losses and how to learn from it. There's definitely a way.
  You're just not finding it, so go figure it out."
- **What was different this time:**
  - Every idea was scored on the **2-week pass rate under the live sizing** (two-week mode, config C: one winner passes, 60% of
    the room, $1,000 daily cap). Earlier loss studies scored R or the older eval size.
  - Under that sizing a loser doesn't just cost money. It eats the room, and the room decides how big the next trade can be when
    the winner finally comes. So a loser cut from −1R to −0.45R is worth more than its dollars.
  - The question was: **is there a moment where a loser is already obvious, but a winner is not yet at risk?**
- **The answer: yes, at about minute 15.**
  - In the first 5-10 minutes, winners and losers look the same. Cutting there kills winners in both halves.
  - **By minute 15, a trade that has never gone +0.5R our way and is still 0.3R or more under water was a loser every time in
    2026** (9 of 9 in Jan-Jun, 4 of 4 in Jul-Oct).
  - After minute 20, some slow Jul-Oct winners dip that far before they run. Checking later, or keeping the check on after
    minute 15, kills them.
- **The rule: the 15-minute check.** At the close of the 15th 1-minute bar after the fill: if the best point so far is under +0.5R
  and that close is more than 0.3R below the entry, exit at the next 1m open. Otherwise do nothing, and never check again.
- **Results (live sizing, costs in):**

| | 2-wk pass / fail | Monte Carlo 2-wk pass / fail | Eval-path net $ | $/month | PF | Max DD | Plain LIT size net $ (PF) | Trades/wk | Win % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live today, H1 (Jan-Jun)** | 52.9 / 8.4 | 50.6 / 6.2 | +31,116 | 5,105 | 2.97 | −3,980 | +32,773 (4.44) | 3.12 | 22.5 |
| **15-minute check, H1** | **57.1 / 5.9** | **52.9 / 2.9** | **+35,545** | **5,832** | **3.80** | **−3,517** | **+34,219 (5.23)** | 3.12 | 22.5 |
| **Live today, H2 (Jul-Oct)** | 50.7 / 2.9 | 55.4 / 5.5 | +10,481 | 2,822 | 1.85 | −3,122 | +8,962 (2.46) | 2.56 | 35.0 |
| **15-minute check, H2** | **52.2 / 0.0** | **56.2 / 2.9** | **+15,456** | **4,161** | **2.40** | **−2,348** | **+9,611 (2.75)** | 2.56 | 35.0 |

- **Back to back** (buy a new eval after a pass, a fail or 10 sessions): H1 13 passes in 20 evals (was 11), H2 6 in 11 (was 5).
  On all of 2026 that is 18 passes in 32 evals, $163 a pass at $91.80 (was 15 in 32, $196).
- **Trades a week don't change** (it is an exit, not a filter): 3.12 / 2.56, 86% of weeks with 2+.
- **Verdict: adopt-candidate, low-to-medium confidence.**
  - It helps both halves on every measure the owner asked for.
  - It rests on 13 trades, and Jul-Oct's 2-week gain is 1 eval start out of 69. The solid part is fewer fails and more money.
  - **The owner goes live at 21:00 ET tonight. This goes in after the launch, not before.**
  - The engine change is ready but not applied (below).

## How this was done

- **Trades:** the 120 live LIT trades of 2026 (`tools/lit_1m_manage.py` unit() = run `lit_live`, Monday rule on), with their true
  CME NQ1! 1m path from the fill to the end of the day. No Yahoo.
- **Path simulator** (`tools/lit_loss_learn.py psim`): with no rule it gives all 120 trades exactly (points, exit, worst open
  point; `check` = 120/120).
- **Every decision uses closed 1m bars only.** An exit happens at the next 1m open minus 1 tick. A resting stop fills at its
  level, or at the open on a gap, minus 1 tick.
- **Scoring:** `tools/lit_2wk.py`, the exact MFFU Builder 50K model, with the live two-week config C from `live_model.json`
  (engine/sizing.py two_week_qty, including the 2-trading-day minimum added today).
  - A fresh eval starts on every session, and only starts that see 10 full sessions count (H1 119, H2 69).
  - The Monte Carlo is 4,000 evals of 20 sessions, drawn in blocks of 5 days.
  - Money is the back-to-back eval path, plus the plain LIT size ($800 up to 20 pts) as a reference.
- **Judging:** pick on Jan-Jun (H1), check on Jul-Oct (H2). Adopt only if both halves improve, at 2-4 trades a week, with no
  filter that pauses trading.
- **Honesty about the pick:** the minute-by-minute table below was looked at on both halves before the window was chosen.
  - The pure H1 pick of the time-stop family was the continuous version ("from minute 10 or 15 on"). It **fails** Jul-Oct's
    2-week pass (50.7% → 44.9%), even though Jul-Oct money rises.
  - The single check at minute 15 ties the best H1 pass rate (57.1%) and has the best H1 Monte Carlo of the single checks.
  - So it is a fair H1 pick, but not the only one. Minute 25 nearly ties it on H1 and fails H2.
- **How many things were tried:** about 190 variants in 7 families: 140 time stop/check, 15 tightening, 9 scratch, 7 wider
  stops, 7 sequence and 5 context models. With that many tries, one lucky rule is expected. The case for the 15-minute check
  is that its **whole neighbourhood** works (below), and that it has a plain reason.

## 1. The trade path: when does a loser become obvious?

The state of each trade still open at minute N after the fill. "Under water" = the 1m close is more than 0.3R below the entry
and the best point so far is under +0.5R. W = winner (target or a positive end of day), L = full stop-out, B = breakeven or scratch.

| Minute | H1 under water: W / B / L | H2 under water: W / B / L | Read |
|---:|---|---|---|
| 5 | 2 / 3 / 9 | 2 / 1 / 3 | noise: winners still dip here |
| 10 | 0 / 2 / 8 | 1 / 0 / 3 | |
| **15** | **0 / 0 / 9** | **0 / 0 / 5** | **only losers** (one H2 loser hit its stop inside that same bar) |
| 20 | 0 / 4 / 8 | 0 / 1 / 5 | |
| 30 | 0 / 2 / 10 | 2 / 2 / 6 | slow H2 winners dip here |
| 45 | 0 / 1 / 5 | 1 / 1 / 4 | |

- **Winners move fast in H1, slowly in H2.** Half the H1 winners were +0.5R within 10 minutes. In H2 the median is 12 minutes, and
  4 of 14 took 38-126 minutes.
- **Losers die slowly:** a median of 42 minutes (H1) and 44 minutes (H2) to the stop. So at minute 15 most losers are still open,
  and that's where the saving is.
- **Most losers never work:** the median best point is about +0.3R. Those are the ones the check catches.

## 2. The 15-minute check and its neighbours

Change vs live in 2-week pass (points), with the eval-path $ change, H1 / H2:

| Variant | 2-wk pass Δ H1 / H2 | 2-wk fail H1 / H2 (live 8.4 / 2.9) | Eval-path $ Δ H1 / H2 | Verdict |
|---|---:|---:|---:|---|
| **Check at minute 15, −0.3R, best < +0.5R** | **+4.2 / +1.5** | **5.9 / 0.0** | **+4.4k / +5.0k** | **adopt-candidate** |
| same, −0.25R | +4.2 / +1.5 | 5.9 / 0.0 | +4.1k / +5.2k | agrees |
| same, −0.4R | +4.2 / +1.5 | 6.7 / 2.9 | +3.1k / +4.7k | agrees |
| same, best < +0.3R / +0.7R | +4.2 / +1.5 | 5.9 / 0.0 · 5.0 / 0.0 | +4.3k / +4.8k · +4.5k / +4.6k | agrees |
| check at minute 18 | +4.2 / +1.5 | 3.4 / 0.0 | +4.2k / +4.8k | agrees |
| check at minute 20 | +2.6 / +1.5 | 5.0 / 0.0 | +3.5k / +5.1k | agrees |
| window minute 15-19 (run `lit_ll_t15_win`) | +4.2 / +1.5 | 4.2 / 0.0 | +5.4k / +5.2k | agrees (end picked knowing H2) |
| check at minute 10 / 12 | +4.2 / 0.0 | 6.7 / 0.0 | +2.5k / +2.6k · +3.1k / +1.3k | H2 unchanged |
| check at minute 25 (run `lit_ll_t25`) | +2.6 / **−7.2** | 6.7 / 0.0 | +4.4k / +2.7k | fails H2 |
| check at minute 30 | 0.0 / **−7.2** | 5.9 / 0.0 | +3.0k / −0.8k | fails H2 |
| from minute 15 on, continuous (run `lit_ll_cont15`) | +4.2 / **−5.8** | 0.0 / 0.0 | +6.7k / +7.6k | fails H2's pass rate |
| from minute 10 on, continuous (run `lit_ll_cont10`) | +5.1 / **−5.8** | 0.0 / 0.0 | +6.7k / +9.3k | fails H2's pass rate |
| minute 5-14 window (run `lit_ll_t5`) | +3.4 / **−18.8** | 1.7 / 0.0 | −3.0k / −6.7k | early dips are noise |

**What the check did, trade by trade (2026):**
- **9 trades in H1:** 01-13, 01-16, 01-29, 01-30, 03-04, 03-31, 04-28, 05-07 and 05-12.
- **4 trades in H2:** 07-03, 07-07, 09-02 and 10-06.
- All 13 were going to be full stop-outs. They were closed at −0.33R to −0.62R instead.
- No winner, breakeven or end-of-day trade was touched.

**Why it makes sense:**
- A LIT entry is a reversal off a swept level. If it is right, price leaves fast. None of the 32 winners of 2026 was under
  water at minute 15.
- A trade that is 0.3R the wrong way after 15 minutes, having never left, means the sweep is not holding.
- After that, the market can still turn. The slow Jul-Oct winners did. So the check is made **once**, not as a rule that stays on.

## 3. Everything else: tested and rejected

| Idea | 2-wk pass Δ H1 / H2 | Eval-path $ Δ H1 / H2 | Why it fails |
|---|---:|---:|---|
| **Wider stop**, 1-8 ticks or 0.1-0.3R beyond the sweep extreme (size follows the stop) | 0 to −3.3 / 0 to −10.1 | −12.5k to +0.9k / 0 to +3.0k | Stop-outs are not stop hunts. 12 of 53 stop-outs later hit the target, but only 1 after going less than 0.5R beyond the stop; the rest went 0.5-12R further first. |
| **Time-tightened stop:** after 15-90 min without +0.5R, stop to −0.3/−0.5/−0.7R | −2.5 to +4.2 / −10.1 to 0 | | Before 60 min it stops slow H2 winners. At 60-90 min it is harmless but changes no pass. |
| **Scratch:** after +0.3/0.5/0.7R, a close back below −0.3R before breakeven → out | −1.6 to +0.9 / −18.8 to +2.9 | −5.0k to +1.2k / −6.5k to +1.7k | The winners do exactly this before they run. |
| **Sequence memory:** half size when the last trade in the **same direction** was a stop-out | **−8.4 / −8.7** | −2.9k / +2.8k | Flips: after a stop-out, H1 trades are worse (mean −0.0R vs +1.3R), H2 trades better (+0.5R vs +0.9R, roughly the same). |
| ... the last trade was a stop in the same direction / the opposite direction | −10.0 / −15.9 · 0.0 / 0.0 | | flips between halves |
| ... the last trade on the **same level type** (Asia, London, PDH...) was a stop | −8.4 / −31.9 | −8.2k / −3.8k | H2 trades after a same-level stop are *better* (+1.1R vs +0.3R) |
| ... the same session block was stopped / the previous day was a stop | −11.7 / −31.9 · −8.4 / −21.7 | | the same flip |
| **Context model:** 3-feature logistic regression for "full stop-out", fit on H1 only, x0.5 on its top third, 5 feature sets | −10.0 to −0.8 / −36.2 to −2.9 | | No skill: H2 AUC 0.47-0.63. This matches `lit-trade-selection.md` (AUC 0.23-0.52). |

**What the failures say:**
- **The context at entry can't tell a LIT loser from a winner.** Around 50 features, 75 HTF confluences and now 5 small
  models all fail out of sample.
- **Neither can memory of recent losses.** LIT's winners cluster, but in H1 they cluster after winners, and in H2 after
  losers. A "learn from the last loss" rule is a coin flip.
- **The only thing that learns from a loss is the trade itself, early in its life:** how it behaves in its first 15 minutes.
  That is what the check uses.
- **For the learning loop** (`engine/lit_learn.py`, another agent's work, observe mode): none of the sequence buckets above is
  worth a knob. If the loop wants one more feature, the most useful one is the trade's own 15-minute state, logged as "under
  water at 15 min yes/no". It is an outcome of the trade, so it can only drive an exit, never a size.

## 4. To switch it on (after the launch)

- **Engine:** an option `t_check` in `engine/lit.py` simulate_x, default None (today's behaviour).
  - With `{"at": 15, "x": 0.3, "mfe": 0.5}`: at the close of the 1m bar that ends 15 minutes after the fill, if the breakeven has
    not moved the stop, the best point is under +0.5R and the close is more than 0.3R below the entry, exit at the next 1m open
    ("CUT_T15").
  - In live mode: if that bar is the last closed bar, exit at market now.
  - 1m bars only.
  - The patch is written out in `research/lit/loss_learn_t15_patch.md` but **not applied**: editing the live engine on launch
    day was refused, rightly.
- **live_model.json** (coordinator): `"lit": {..., "t_check": {"at": 15, "x": 0.3, "mfe": 0.5}}`.
- **Tests before switching it on:**
  - `python -X utf8 -m tests.test_lit_live` must stay 120/120 with the option off.
  - With it on, the engine's 2026 trades must equal `tools/lit_loss_learn.py` variant(T15): 13 CUT_T15 exits on the dates above.
- **Routing:** it is a market exit. The PC / NinjaTrader route needs `route_all_exits`, and the cloud ledger must accept the new
  exit kind.
  - **Done 2026-10-19:** the live loop decides the cut on the check bar's close and the bot sends it in the poll 2 s later,
    priced from the forming bar's open = the backtest's exit (`tests/test_lit_exit_route.py`: 13/13 cuts of 2026, 2 s, exit
    time and P&L = backtest). The "~3 min late" seen earlier was the estimate price and an exit time one bar early, not the
    order (details: `lit-live-fills.md` "Exits and adds on the route").
  - The weekly stop counts STOP exits only. It is off under config C anyway.

## Honest caveats

- **13 trades.** Jul-Oct's 2-week pass gain (+1.5 points) is 1 eval start out of 69. The robust parts are 2-week fails down in
  both halves (8.4 → 5.9, 2.9 → 0.0), the Monte Carlo agreeing, and money up in both halves at both sizes.
- **H1 and H2 are different markets for exits.** H1 winners go at once, H2 winners often dip first. The check works because
  minute 15 sits between "early noise" and "slow winners dip". If future winners dip even earlier, it will cost winners.
  Watch the cut trades: a CUT_T15 that would have hit the target is the alarm.
- **2021-25 can't test it:** there are no 1m bars there.
- **Paper only.** Nothing live was changed: `engine/lit.py`, `engine/sizing.py`, `live_model.json`, `engine/lit_learn.py`
  and the live loops are untouched.

## Files and how to rerun

- `python -X utf8 tools/lit_loss_learn.py build`: the 120 trades and their 1m paths → `research/runs/_cache/litll_v1.pkl`.
  About 1 minute.
- `python -X utf8 tools/lit_loss_learn.py check`: the simulator with no rule = the live trades (120/120).
- `python -X utf8 tools/lit_loss_learn.py grid`: the stored variants → `research/lit/loss_learn.json`. About 3 minutes, 1 process.
- `python -X utf8 tools/lit_loss_learn.py save`: the runs `lit_ll_*` (tags lit, lit_loss_learn).
