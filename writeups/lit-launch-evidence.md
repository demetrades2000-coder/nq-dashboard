# LIT pre-launch evidence pack (for an external reviewer)

Built 2026-10-24 from the stored runs in `research/runs/` and a fresh engine run on today's data and settings. Headline
figures are quoted from the stored runs' `spans` / `verdict`. Every count and split below is printed by
`python -X utf8 tools/launch_evidence.py` (read-only, about 1 minute). Reproducibility check: the engine's
`run_x` on today's `live_model.json` `"lit"` reproduces stored run `lit_live` exactly, 631 of 631 trades (day, entry time,
exit, P&L). The eval-path counts reproduce `lit_adopt_t15_be_off_eval`, `lit_idm_eval_t15_be_off` and `hq_lit_live_eval`
(57.1/5.9 H1 and 52.2/0.0 H2, Monte Carlo 52.8/2.6 and 55.1/3.5). Paper only. No engine file and no `live_model*.json` was
changed.

## A. What each headline number is

| Field | Value |
|---|---|
| strategy_version | LIT, rules 1-11 of `STRATEGY.md`: locked 2026-10-18, loss pack 2026-10-18 (Monday rule + weekly stop), `t_check` + `be_off 1.25` ON 2026-10-20, `scale_in` OFF (`live_model.json` label "LIT - Liquidity Inducement (2026-tuned) + loss pack + 15-minute check + BE+costs") |
| parameter_hash | `8731a81ac0541ec0f92c7e6ed6b7de572443c714` = sha1 of `json.dumps({"lit": lit, "lit_sizing": lit_sizing}, sort_keys=True)` (default separators). Other spellings: sha1(dumps(lit) + dumps(lit_sizing)), each sort_keys = `c657fe182ae6d079bb94f3bb4ac75c998e91af3d`; `"lit"` alone = `90886562604e0bca4d3f7812f0d7f834c6866712` |
| data_hash | `17519777-21380e2635:1` (`tools/runlib._data_key()`: size of `data/NQ_5m.csv`, its sha1[:10], ENGINE_EPOCH 1). The key covers only the 5m file. LIT also reads `data/NQ_1m.csv` (13,967,504 bytes, sha1[:10] `d6ffd3ecfe`), `VIX_1d.csv` (`e5c621f32b`) and `VXN_1d.csv` (`313484bd7e`). Data commit `aeb9d10` (2026-10-23, official-data roll fix) |
| test_window | 2026: 2026-01-02 to 2026-10-16, 206 sessions (last trade 2026-10-14). H1 (picked on): 01-02 to 06-30, 128 sessions. H2 (check): 07-01 to 10-16, 78 sessions. Reference only: 2021-11-08 to 2025-12-31, 1,072 sessions (5m bars only, no 1m) |

| Headline | Run | sizing_mode | Commission | 2026 | H1 | H2 |
|---|---|---|---|---|---|---|
| LIT size rule | `lit_live` | **normal** = LIT size rule: $800 risk up to a 20-pt stop, then 800 x 20 / stop, max 40 micros, weekly stop half size (12 half-size trades); `"sizing": {}` | $1.40 / micro + 1 tick | 120 tr, PF 4.07, **+$43,394**, DD -$2,196 | +$33,901, PF 4.98 | +$9,493, PF 2.69 |
| Same, at MFFU's real commission | `hq_lit_live` | normal | $1.90 + 1 tick | +$43,076, PF 4.02 | +$33,666, PF 4.92 | +$9,410, PF 2.66 |
| Eval path | `lit_adopt_t15_be_off_eval` (= `lit_idm_eval_t15_be_off` = `hq_lit_live_eval`) | **two_week** (10 sessions) then safe_eval, no reset; stored `sizing` = the live `lit_sizing` trading keys | $1.90 + 1 tick | (H1 + H2 back-to-back paths joined: +$43,311) | +$34,253, PF 4.02, DD -$3,314 | +$9,059, PF 2.20, DD -$3,073 |

**Answer: +$43,394 (2026) comes from the normal LIT size rule, not from two_week.** The eval path is a separate run, sized
by `engine/sizing.lit_qty` in two_week mode. Two small notes:
- `CLAUDE.md` and `STRATEGY.md` still quote +$43,385. That was the run before the data commit `aeb9d10`; 7 target trades
  moved. The stored run now says +$43,394.
- The eval runs' "2026" span (p10 35.9 / f10 3.4) is scored on the joined back-to-back path. It is **not** the same thing as
  the per-half 57.1 / 52.2 figures. Do not mix them.

**Metadata caveat (labelling bug, not a rule bug):** `tools/runlib.save()` stamps every run with fixed fields:
- `method`: "exact live-loop replay (20-day window per session) + cold-streak filter + sizing".
- `live_params`: the old engine's.
- `live_equity_filter`: the old engine's cold-streak filter.
- `data`: "5m".

For the LIT runs these fields are wrong. The LIT runs are `engine/lit.py run_x` over the whole history, with no cold-streak
filter, on 5m + 1m bars. Equality with the live loop is checked separately (`tests/test_lit_live.py`). Read only `params` /
`sizing` / `verdict` / `notes`.

## B. "55% win" vs "about 1 in 4 reaches +0.5R"

2026 trades by exit (run `lit_live`, LIT size rule):

| Exit | 2026 n | pnl > 0 | Net $ | Avg R (range) | H1 n | H2 n |
|---|---:|---:|---:|---|---:|---:|
| TARGET (VIX band, banked at 8R) | 25 | 25 | +52,502 | +5.14 (+2.05 to +7.98) | 15 | 10 |
| BE (stop at entry + 1.25 after +1R) | 34 | 34 | +137 | +0.009 (+0.004 to +0.026) | 29 | 5 |
| CUT_T15 (15-minute check) | 13 | 0 | -1,849 | -0.48 (-0.63 to -0.34) | 9 | 4 |
| EOD (flat 15:55) | 8 | 7 | +4,831 | +1.85 (-0.55 to +5.88) | 4 | 4 |
| STOP | 40 | 0 | -12,227 | -1.02 (-1.05 to -1.01) | 23 | 17 |
| **Total** | **120** | **66** | **+43,394** | +0.80 | 80 | 40 |

**What "win" means here:** the win rate counts every trade with pnl > 0, after costs. All 34 breakeven exits count as wins.
Each one makes +$0.60 a micro (see F3), so it is a scratch.

| Win definition | 2026 | H1 | H2 |
|---|---:|---:|---:|
| pnl > 0 (the published "win %") | 66 / 120 = **55.0%** | 47 / 80 = 58.8% | 19 / 40 = 47.5% |
| final R >= +0.5 | 31 / 120 = **25.8%** | 18 / 80 = 22.5% | 13 / 40 = 32.5% |
| final R >= +1 | 31 / 120 = **25.8%** | 18 / 80 = 22.5% | 13 / 40 = 32.5% |
| for reference: best open point (MFE) >= +0.5R | 80 (66.7%) | 56 | 24 |
| MFE >= +1R (the breakeven trigger) | 66 (55.0%) | 47 | 19 |

**How the two numbers fit:**
- 55% of trades end above $0, but 34 of those 66 are breakeven scratches.
- About 1 in 4 trades *ends* at +0.5R or better: the 25 targets plus 6 end-of-day exits. No trade ends between +0.03R and
  +0.37R.
- Two thirds of trades *touch* +0.5R at some point, so "reaches" has to mean the final result.
- Leave out the scratches and 32 of 86 trades are real winners (37%).

## C. Eval pass / fail: what is counted

Both methods start a **fresh MFFU Builder 50K eval on every session**, so the windows overlap. Plan: $3,000 target, $2,000
end-of-day trailing max loss checked against the worst intraday point, lock at +$100, $1,000 soft daily loss. "Open" means
neither passed nor failed by the deadline. Each half is scored only on its own sessions: an eval never crosses 06-30 / 07-01
or the end of the data.

**Eval path, two_week sizing** (`tools/lit_adv_manage.evals`; only starts that see the full window count):

| | Starts total | 2-week (10 sessions): starts / pass / fail / open | % pass / fail / open | 1 month (20): starts / pass / fail / open | % |
|---|---:|---|---|---|---|
| H1 | 128 | 119 / 68 / 7 / 44 | **57.1 / 5.9 / 37.0** | 109 / 81 / 13 / 15 | 74.3 / 11.9 / 13.8 |
| H2 | 78 | 69 / 36 / 0 / 33 | **52.2 / 0.0 / 47.8** | 59 / 30 / 0 / 29 | 50.8 / 0.0 / 49.2 |

How independent these are:
- **H2's 36 two-week passes end on only 9 distinct winning sessions.** H1's 68 end on 14.
- Cut into non-overlapping 10-session blocks: H1 has 12 blocks (7 pass, 5 open, 0 fail) and H2 has 7 blocks (4 pass, 3
  open).
- Back to back, with a new eval only after a pass or a fail: H1 10 pass / 2 fail / 1 open; H2 3 pass / 1 fail / 1 open.
- Monte Carlo: 2,000 paths of 20 sessions, drawn in 5-session blocks from the same half. H1 52.8 / 2.6, H2 55.1 / 3.5.

Minimum trading days:
- The simulator passes on the day the balance reaches +$3,000. It does not wait for a 2nd trading day.
- MFFU's minimum is recorded as "conflict" (1 vs 2) in `research/lit/mffu_rules.json`.
- 17 of 68 (H1) and 14 of 36 (H2) 2-week passes came from a single traded day. None of them passed on session 10, so a
  2-day minimum (one 1-micro trade on a later session) would move none of them outside the 10-session window.

**LIT size rule** (`runlib.eval_speed`, run `lit_live`): every start counts, and the horizon is 60 sessions inside the span.
The last 9 starts of a span cannot reach 10 sessions, but they still count as open:

| | Starts | 2-week pass / fail / open | % | Full-window only | 1 month pass / fail / open | % |
|---|---:|---|---|---|---|---|
| 2026 | 206 | 65 / 2 / 139 | 31.6 / 1.0 / 67.5 | 197: 59 / 2 / 136 = 29.9 / 1.0 | 118 / 10 / 78 | 57.3 / 4.9 / 37.9 |
| H1 | 128 | 47 / 2 / 79 | 36.7 / 1.6 / 61.7 | 119: 47 / 2 / 70 = 39.5 / 1.7 | 82 / 10 / 36 | 64.1 / 7.8 / 28.1 |
| H2 | 78 | 18 / 0 / 60 | 23.1 / 0.0 / 76.9 | 69: 12 / 0 / 57 = 17.4 / 0.0 | 36 / 0 / 42 | 46.2 / 0.0 / 53.8 |

"Pass rate 90.8%" (2026) means 167 passed out of the 184 evals decided within 60 sessions. 22 starts were still open.

The two methods use different denominators: every start for the LIT size rule, full windows only for the eval path. Only
the eval-path figures describe the live two_week sizing.

## D. Trades a week

- **Denominator used everywhere** (`tools/export_backtest._stats`, `tools/lit_adv_manage.stats`): trades ÷ (sessions ÷ 5).
  For 2026 that is 120 ÷ (206 ÷ 5 = 41.2 "session-weeks") = **2.91**.
- Other ways to count the same trades:
  - 2026-01-02 to 2026-10-16 is 41.1 calendar weeks, giving 2.92.
  - 42 ISO weeks contain a session. Their weekly counts average **2.86** (median 3). Distribution: 1 trade in 6 weeks, 2 in
    10, 3 in 13, 4 in 10, 5 in 3. No 2026 week had zero trades.
  - 36 of 42 weeks (86%) had 2 or more trades.
- The 206 sessions are TradingView's sessions, which include the CME holiday Globex sessions (MLK, Presidents Day and so on).
- H1: 80 ÷ 25.6 = 3.12 (27 ISO weeks: 2.96). H2: 40 ÷ 15.6 = 2.56 (16 ISO weeks: 2.50). The week of 06-29 is split
  between the halves, and its H1 part had 0 trades.

## E. Which live rules were chosen after looking at Jul-Oct 2026

| Rule (adopted) | How it was picked (source) | Honest validation status |
|---|---|---|
| Base LIT = `lit_final` (2026-10-18): CISD entry, 1m confirmation, VIX band at 8R, disp 0.8, depth 0.5, etc. | Merge of four 2026 studies. The write-up says it was picked on H1 and that H2 "was not used to choose" (`lit-final.md` l.19-27) | **H1-picked, H2 out-of-sample by the write-up's own account.** This cannot be checked from the runs. H2 PF 2.19, below the old bot over the same months. 2021-25 PF ~1.0 (no edge) |
| Monday rule (`monday`, 2026-10-18) | Small grids, pick = best H1 net; "H2 is only looked at afterwards" (`lit-losses.md` l.65-67) | **H1-picked, weak H2 confirmation.** Rule off vs on: H1 +$31,788 → +$33,901 (+$2,113), H2 +$9,189 → +$9,493 (+$304), 2026 127 → 120 trades. 2021-25 costs $3.3k. Rests on about 10 removed trades |
| Weekly stop (`wk_stop [2, 0.5]`, 2026-10-18) | Picked on H1 by the fewest 1-month eval fails without costing H1 money. This is not the H1-money pick: that one was "3 stops → quarter", which was flat in H2 (`lit-losses.md` l.143-144) | **H1-picked by a risk criterion.** Its H1 money gain is $33. It acts only in normal sizing: two_week has no weekly stop |
| two_week sizing, config C (60% room, no weekly stop, 2026-10-18) | The write-up tabulated both halves. The higher-pass "recommended" config was rejected for its 18-22% fails, and the safer C was chosen (`lit-two-week-eval.md`) | **A risk choice made with H2 visible.** It is not a fitted performance pick, and H2 is not a clean holdout for it |
| 15-minute check (`t_check {"at":15,"x":0.3,"mfe":0.5}`, ON 2026-10-20) | `lit-loss-learning.md`, "Honesty about the pick": "the minute-by-minute table below was looked at on both halves before the window was chosen". The pure H1 pick of the family (the continuous check from minute 10/15) **failed** H2 (2-week pass 50.7 → 44.9). The single check at minute 15 ties the best H1 pass rate. About 190 variants were tried | **Chosen with H2 visible; H2 is NOT out-of-sample for this rule.** 13 cuts (9 H1, 4 H2), all would-be stop-outs. The H2 2-week gain is 1 eval start of 69. The write-up itself said "after the launch, not before" |
| Breakeven + costs (`be_off 1.25`, ON 2026-10-20) | The value comes from costs ($1.90 commission = 0.95 pt + 1 exit tick, rounded up to 5 ticks), not from fitting. Neighbours 0.5 / 1.0 / 1.5 were shown on both halves (`lit-adv-management.md` l.209-213) | **Cost-derived, low selection risk, also seen on H2.** It changed no exit in 2026, only the P&L of the 34 BE exits. Eval-path effect with t_check: H1 +$928, H2 +$20 |
| Not live (for completeness) | The `hq-lit.md` (2026-10-23) recommendations `room_f 0.55`, `wk_loss_usd 1200` and `cisd1m 22`, and `scale_in`, are **not** in `live_model.json` (room_f 0.6, no wk_loss_usd, cisd1m 20, scale_in null) | - |

Bottom line for E: the only half that was never used to choose anything is H2 for the base LIT and the loss pack, and
that rests on the write-ups' own account. For `t_check`, H2 was looked at before the pick. For `be_off` the choice is
mechanical. Quote the H2 rate: +$9,493 LIT size rule / +$9,059 eval path, about $2,450-2,550 a month.

## F. Edge cases in `engine/lit.py`

### F1. Monday rule (`monday_block`, l.1296-1307; applied at l.1494)

- **Monday took both Friday's high and its low:** no side rule, so either direction may trade. `took_hi == took_lo`
  returns False (l.1305). The same applies when it took neither.
  - 2026 Mondays, state at the 15:30 entry cutoff (41 Mondays): high only 15, low only 11, both 9, neither 6.
  - On the "both" days there were 3 Monday longs, all targets (+$2,967).
  - The state is checked at the close of the setup's 5m trigger bar `i` (`M.h[s:i+1]`, `M.l[s:i+1]`, l.1303-1304). A setup
    that triggers before the second side is taken is judged on what was known then.
- **Which Friday range:** the full Globex trading day, Thursday 18:00 to Friday 17:00 ET, not RTH.
  - `pdh` / `pdl` = max / min over all bars of the previous trading day (l.234).
  - Trading days come from `Bars.tday` = 18:00 → 17:00 ET (`engine/data.py` l.25, l.51; `engine/lit.py` l.183-187).
  - In 2026 the previous trading day was a Friday for every Monday. If a Friday were missing, it would be Thursday's
    range.
- **Which Monday clock:** the Monday trading day runs from **Sunday 18:00 ET** (bar `s`) to the trigger bar. `dow` is the
  trading date's weekday (`engine/data.py` l.52).
  - CME holiday Mondays that have a Globex session count as Mondays. 2026-01-19 (MLK) is one of the 10 days the rule
    changed.
- A blocked setup is skipped before the day's 1-trade slot is used (l.1494, before the trade is taken), so a later setup
  can still trade that day.

### F2. Displacement: direction only, so no rerun was needed

- The feature is the largest **signed** body in direction space:
  - `body = (c_d - o_d) / ATR` over bars `ee..i` (l.489).
  - The extreme bar is dropped: `disp = body[1:].max()` (l.525).
  - The setup is rejected if `disp < 0.8` (l.1281).
  - For shorts the prices are negated (`-c`, `-o`), so a bullish candle has a negative body there.
- An opposite candle therefore **cannot** qualify, because its body is < 0 while the threshold is +0.8.
- Measured: 120 of 120 2026 trades have a with-direction body >= 0.8 ATR (smallest 0.801). 0 trades depend on an opposite
  candle, so the $ at stake is $0.
- An absolute-body rule would have added 7 of the 1,325 2026 candidates. That is not live.

### F3. Breakeven price and its $ value

- **Rule:** after a bar's high reaches entry + 1R (direction space), the stop becomes `cur = entry + be_off` (l.1135-1136).
  The real price is `d x cur`, so it is **entry + 1.25 for longs and entry - 1.25 for shorts**.
- **Stop check:** the stop is checked before the move on each bar (l.1128), so the new stop acts from the next bar. The
  exit fills at `cur - SLIP` = entry + 1.00 pt (l.1129).
- **Measured:** 34 BE exits in 2026, 20 shorts and 14 longs, all at exactly +1.00 pt a micro after the exit tick. Of the
  routing path, `tests/test_lit_exit_route.py` covers longs and shorts; the NinjaTrader self-test covers the long case
  (25020 → 25021.25).
- **$ per micro, in plain words:**
  - Before slippage: 1.25 pts x $2 = $2.50. Minus the $1.90 MFFU round trip = **+$0.60**.
  - The backtest also takes 1 exit tick ($0.50): $2.00 - $1.90 = **+$0.10 a micro at MFFU's real commission**.
  - Run `lit_live` uses $1.40 a micro: $2.00 - $1.40 = **+$0.60 a micro**. The 34 BE exits total +$137.
  - The 1-tick slippage on a 1m market entry is already in the entry price.
  - With 2 ticks of exit slippage the BE exit is -$0.40 a micro at $1.90.
  - **So a breakeven exit is a scratch, not a win.**
- **Small fill optimism:** stop and BE exits fill at the stop level minus 1 tick, even when the exit bar opened beyond the
  stop. In 2026 this happened once (2026-06-17, a short BE exit, opened 1.75 pts through, 20 micros, $70 credited). All
  years together: 3 times, $411.

## Bugs found

- **Rule bugs:** none. The Monday rule, the displacement direction and the breakeven sign all behave as documented, for
  longs and shorts.
- **Labelling bug:**
  - `runlib.save()` writes the old engine's `method` / `live_params` / `live_equity_filter` / `data` text into LIT runs (see
    A). It is not fixed here, because it is research tooling.
  - The stale +$43,385 in `CLAUDE.md` / `STRATEGY.md` should read +$43,394.
