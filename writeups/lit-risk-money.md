## In one minute (owner summary)

- **What was tested:** the risk and money ideas nobody had tried on LIT yet. About 300 versions, all on the same 120 live LIT
  trades of 2026, the real eval sizing (two-week mode, then safe_eval after session 10, no reset), $1.90 a micro, true 1m
  fills. Picked on Jan-Jun, checked on Jul-Oct. Every idea was run twice: on live LIT, and on LIT + the three candidates that
  are not live yet (15-minute check, scale-in, breakeven + costs).
- **Ranked:**

  | Rank | Idea | What it does (Jan-Jun / Jul-Oct) | Money | Verdict |
  |---|---|---|---|---|
  | 1 | **Buy a 2nd eval 1 week after the 1st** (only while no funded account) | 6-month paths with no money: 9.4 → 7.4% / 14.8 → 9.8% | **+$21 / +$45 a month** ($641 → $662, $608 → $653), about 0.8 more evals per 6 months | **adopt-candidate** (your habit, no code) |
  | 2 | **Eval weekly loss stop: once the eval is down $1,200+ this week, no new trade until Monday** | 2-week fails 9.2 → 5.0% at the same 52.9% pass / pass 50.7 → 52.2% at the same 2.9% fail | neutral (−$2 / −$3 a month) | **adopt-candidate** (default-off switch) |
  | 3 | After session 10: safe_eval at 40% instead of 60% | eventual pass 72.9 → 74.6% / 88.2 → 91.2%, but slower | neutral | promising only (2021-25 says the opposite) |
  | - | Cold-streak filter (old engine) on LIT | 2-week pass in the Monte Carlo −3 to −16 points | −$1k to −$16k | rejected |
  | - | Hot hand (bigger after a winning stretch) | Jul-Oct 2-week fails 2.9 → 7.2% | 2021-25 loses | rejected |
  | - | Weekly profit stop (+2R … +8R, or after a target) | passes −1 to −18 points | −$0.7k to −$32k | rejected |
  | - | Start the eval on a certain day / after LIT lost | 2026 looks great (95% pass), 2-4 episodes; 2021-25 reverses | - | rejected |
  | - | Funded: risk ramp after each payout, Kelly fraction, room tiers | +$3 / +$101 per 6 months (noise), risk a trade +60-100% | - | rejected |

- **What to do:**
  1. **When you buy an eval, buy a second one 5 sessions (1 week) later if the first is still open.** If either passes, don't
     buy more until the funded account is gone. Never two on the same day: the bot trades both the same way, so they pass or
     fail together.
  2. **Optional switch:** `"wk_loss_usd": 1200` in `live_model.json` `lit_sizing`. It needs one line in `engine/live.py` (pass
     `today=` to `eval_state`) and the same in `tools/cloud_monitor.py` before it does anything. That wiring was not done
     here (live.py is off limits for this study).
- **Honest scale:** with only one funded Builder 50K allowed at a time, the funded account makes the money ($770-800 a month).
  Eval tricks change the bill by tens of dollars, not hundreds. If MFFU (or other firms) allowed 3 funded accounts, the same
  pipeline would make about $1,800 a month (sensitivity table at the end).
- **Nothing in `live_model.json` changed.** `engine/sizing.py` got one default-off option (`wk_loss_usd`) and an optional
  `today=` argument on `eval_state`; `python -m engine.sizing` and `tests.test_lit_2wk_sizing` are unchanged (OK, 22/22).

## How it was measured

- **Trades:** `engine/lit.py` run_x on `live_model.json` "lit" (= run `lit_live`, 120 trades in 2026) and with
  `t_check + scale_in + be_off` (research/lit/adopt_combo.json "all3"), turned into units by `tools/lit_adopt_combo.units`.
- **Eval executor:** `tools/lit_risk_money.py` `run_eval_h` = `tools/lit_big_ideas.run_eval_x` + hooks (a size multiplier, a
  per-trade sizing config, a weekly $ stop). With the hooks off it gives the published numbers exactly
  (`python -X utf8 tools/lit_risk_money.py check`: H1 +$36,723 2-week 52.9/9.2, H2 +$9,674 50.7/2.9; combo +$53,116 58.0/2.5,
  +$17,262 52.2/0.0).
- **Eval scores:** fresh MFFU Builder 50K evals on every session of the half (2-week = 10 sessions), a 2,000-path Monte Carlo
  (5-session blocks), the **eventual** pass (no reset: exact starts to the end of data + 1,000 Monte Carlo evals of 120
  sessions), and the back-to-back path (a new eval after a pass or a fail). The eval-path $ is the eval account's P&L, not
  cash: it is shown, never a gate.
- **Adopt rule (eval):** in both halves 2-week pass not down and 2-week fail not up (exact starts), Monte Carlo not worse by
  more than 1 point, at least one strictly better in each half, 2+ trades a week; neighbours agree; not a few-trade fluke.
- **Funded:** `tools/lit_money2.py`'s MFFU Builder 50K funded model (EOD trailing $2,000 locking at +$100, $1,000 soft daily,
  buffer $2,100, $500-$2,000 a request, best day ≤ 50% of the cycle, 2 traded days, 5 sim payouts, 80%), the same 1,000
  Monte Carlo paths of 126 sessions, with the payout policy "ask once $1,500+ is above the buffer" (lit-money-batch2). Base
  reproduces lit-money-batch2 exactly ($4,788 / $4,622 in 6 months, 0.8 / 1.4% lost).
- **Portfolio:** 500 paths of 126 sessions (6 months) per half; every eval and funded account trades the same LIT trades
  (the correlation is built in); evals cost $91.80; a pass becomes the funded account the next session.
- **2021-25** (5m entries, no 1m): a reference line for the eval rules only, never a gate.

Columns: H1 = Jan-Jun 2026 (pick), H2 = Jul-Oct 2026 (check). "2-wk" = pass / fail % within 10 sessions; "MC" the Monte
Carlo; "ev" = eventual pass / fail with no reset.

## 1. Equity-curve sizing on LIT (the old engine's cold filter, re-tested)

Each rule multiplies the size from LIT's own history known at the entry (the R of every earlier LIT trade, from 2021 on).
On the eval path the multiplier acts after the two-week sizing (a cut never below 1 micro; an increase stays inside 60% of
the room and the soft daily loss). "LIT size rule" = the plain $800-to-20-pts size (the money view, incl. 2021-25).

| Rule (live LIT) | Eval Δ net H1 / H2 | 2-wk Δ H1 | 2-wk Δ H2 | MC Δ H1 ; H2 | LIT size rule Δ H1 / H2 / 2021-25 |
|---|---|---|---|---|---|
| last 5 R ≤ 0 → ×0.5 | −6,241 / −736 | 0.0 / 0.0 | −1.4 / −2.9 | −3.0/−2.1 ; −9.9/−3.8 | −4,196 / −1,666 / −3,682 |
| last 10 R ≤ 0 → ×0.5 | −13,387 / −2,010 | −5.8 / 0.0 | −23.2 / 0.0 | −8.9/−0.9 ; −15.2/−0.6 | −6,087 / −2,169 / −2,412 |
| last 15 R ≤ 0 → ×0.5 (old engine's lookback) | −13,808 / +86 | −2.5 / 0.0 | −8.7 / 0.0 | −4.6/0.0 ; −4.1/−1.5 | −8,135 / −1,162 / −3,338 |
| last 20 R ≤ 0 → ×0.25 | −3,392 / +500 | 0.0 / 0.0 | −14.5 / 0.0 | −1.5/0.0 ; −11.0/+0.2 | −2,872 / −1,942 / −6,927 |
| hot: last 10 R ≥ +5 → ×1.5 | +1,203 / −3,001 | 0.0 / +1.7 | 0.0 / +4.3 | +0.1/+2.2 ; −0.2/+3.2 | +8,125 / +2,306 / −939 |
| hot: last 20 R ≥ +10 → ×1.5 | −716 / −2,590 | 0.0 / 0.0 | 0.0 / +4.3 | +0.5/+1.5 ; −0.6/+3.4 | +6,373 / +2,597 / −710 |
| R drawdown ≥ 5R → ×0.5 | −6,887 / −552 | −6.7 / −3.3 | 0.0 / 0.0 | −8.5/−3.5 ; −5.1/0.0 | −7,204 / −1,585 / +3,686 |
| after a LIT target → ×0.5 | −6,655 / +1,599 | −6.7 / −1.6 | −8.7 / 0.0 | −7.4/−0.3 ; −5.0/−1.3 | −5,022 / −616 / +1,844 |
| after 2 stop-outs in a row → ×0.5 | −12,587 / −746 | +1.7 / −6.7 | 0.0 / −2.9 | +0.5/−5.3 ; −4.0/−2.6 | +455 / −804 / +1,148 |

(Δ = change vs live; 2-wk Δ = pass / fail points. All 54 rules are in `research/lit/risk_money.json`.)

- **No cold, drawdown or streak rule holds.** LIT's money comes from a few far targets (1 in 5 trades). A cold filter is
  small exactly when the next target comes, so it cuts the winners it needs. Under the two-week "one winner passes" sizing a
  smaller winner also misses the +$3,000, so 2-week passes fall in the Monte Carlo (−3 to −16 points).
- **The old engine's cold filter (15 trades, half or quarter size) costs** $13.8-16.3k of H1 eval-path money and
  $8.1-11.7k at the LIT size, and loses in 2021-25 too. It is an old-engine idea; it does not transfer.
- **Hot hand** (bigger after a good stretch) makes more at the plain LIT size in 2026 (+$6-14k), but on the eval it raises the
  Jul-Oct 2-week fails 2.9 → 7.2% and it loses in 2021-25. It is just leverage. Rejected.
- **The one that looked good:** on the combo, "after 2 stop-outs in a row → ×0.5" gains +$0.3k / +$5.0k with 2-week passes
  +0.8 / +2.9. On live LIT the same rule costs $12.6k in H1 and the Jul-Oct Monte Carlo pass −4.0; its neighbour (3 in a row)
  costs $8.1k in H2 on the combo. A path effect of 12 trades. Rejected.

## 2. Eval-game refinements on config C

| Idea (live LIT; the combo agrees unless noted) | Versions | Best / typical result | Verdict |
|---|---:|---|---|
| Room share by session (early 50-70%, late 50-100%, switch at 4 / 6 / 8) | 28 | more room late raises fails (+1 to +19 pts) without passes; less room early costs passes | rejected |
| Clock press on C (×1.5 / ×2 from session 5 / 6 / 8) | 6 | H1 pass −0.8 to +2.6 with up to +0.9 fail; H2 pass 0 to −2.9 | rejected |
| Protect near target (from +$1,500 / 2,000 / 2,500, keep 30-70%) | 9 | **no effect at all**: the "need" size near the target is already small | rejected |
| $-to-go cap (need ≤ $1,000-2,000 → max $400-800 a stop-out) | 4 | no effect (same reason) | rejected |
| After the eval's 1st / 2nd loss: room 40-80% or size ×0.5-1.5 | 14 | a cut costs passes (−1 to −37 pts); more size adds fails | rejected |
| Need buffer ×1.25 / ×1.5 / ×0.75 in sessions 1-3 | 3 | worse in both halves | rejected |
| **After session 10** (no reset; eventual pass) | 12 | see below | safe_eval 40%: promising |

**After session 10** (eventual pass / fail with no reset; exact starts, then the Monte Carlo):

| after_mode | Live LIT H1 | Live LIT H2 | Combo H1 | Combo H2 | 2021-25 eventual pass |
|---|---|---|---|---|---|
| **safe_eval 60% (live)** | 72.9/18.6 · MC 78.2 | 88.2/11.8 · MC 75.7 | 81.4/11.9 · MC 80.4 | 95.6/4.4 · MC 82.4 | 31.0% |
| safe_eval 30% | 74.6/13.6 · MC 80.8 | 85.3/7.4 · MC 79.5 | 77.1/11.0 · MC 84.7 | 97.1/2.9 · MC 87.3 | - |
| safe_eval 40% | 74.6/15.3 · MC 79.7 | 91.2/8.8 · MC 77.9 | 80.5/11.0 · MC 83.0 | 95.6/4.4 · MC 85.7 | 28.3% |
| safe_eval 50% | 72.9/17.8 · MC 78.8 | 91.2/8.8 · MC 76.5 | 82.2/11.0 · MC 81.8 | 95.6/4.4 · MC 83.9 | - |
| safe_eval 80% | 73.7/18.6 · MC 77.1 | 89.7/10.3 · MC 74.7 | 81.4/11.9 · MC 77.3 | 89.7/10.3 · MC 81.0 | - |
| eval ($800 to 25 pts) | 73.7/18.6 · MC 77.0 | 77.9/22.1 · MC 74.3 | 81.4/11.9 · MC 78.7 | 88.2/11.8 · MC 81.9 | - |
| normal LIT size | 73.7/19.5 · MC 74.0 | 91.2/8.8 · MC 72.3 | 74.6/18.6 · MC 73.5 | 94.1/5.9 · MC 77.0 | - |
| fast_eval | 66.9/26.3 · MC 69.1 | 73.5/26.5 · MC 68.7 | 70.3/22.9 · MC 69.4 | 75.0/25.0 · MC 71.7 | - |
| two_week continues (60%) | 73.7/18.6 · MC 77.1 | 70.6/29.4 · MC 75.8 | 81.4/11.9 · MC 81.1 | 88.2/11.8 · MC 81.8 | - |
| two_week at 40% | 72.9/18.6 · MC 80.4 | 91.2/8.8 · MC 78.1 | 82.2/11.0 · MC 83.0 | 94.1/5.9 · MC 85.6 | - |

- **safe_eval 40% is the best after-10 mode on paper:** +1.5 to +3.3 points of eventual pass in both halves and both variants
  (Monte Carlo), fewer eventual fails.
- **But:** the extra passes are slow ones (more passes after session 15, against the owner's 3-week rule), the combo's exact
  H1 eventual pass is −0.9, and in 2021-25 the eventual pass falls 31.0 → 28.3%. **Promising only.** If adopted later it is
  `"safe_cap": 0.4` (that key also caps the "eval" mode).
- **Minimum days:** 13 of 80 (H1) and 7 of 38 (H2) 2-week passes come on session 1. MFFU then needs a 2nd traded day: the
  existing 1-micro minimum-days trade covers it (a few dollars of risk). Nothing to change.

**The day to start an eval** (fresh 2-week evals by the start session; live LIT, then the combo):

| Start | Live H1 | Live H2 | Combo H1 | Combo H2 | 2021-25 |
|---|---|---|---|---|---|
| any session | 52.9/9.2 (119) | 50.7/2.9 (69) | 58.0/2.5 | 52.2/0.0 | 15.4/5.6 |
| Monday | 45.8/12.5 | 50.0/0.0 | 54.2/8.3 | 57.1/0.0 | 17.1/5.7 |
| Friday | 54.2/4.2 | 57.1/0.0 | 62.5/0.0 | 57.1/0.0 | 16.2/5.7 |
| after a LIT stop-out | 45.0/7.5 | 57.9/0.0 | 32.0/0.0 | 53.3/0.0 | - |
| after a LIT target | 55.6/14.8 | 21.4/0.0 | 47.4/0.0 | 28.6/0.0 | - |
| after 2+ sessions with no LIT trade | 63.2/0.0 | 35.3/11.8 | 63.2/0.0 | 35.3/0.0 | - |
| last 5 LIT trades ≤ 0R | 60.0/0.0 | 62.5/8.3 | 75.0/0.0 | 62.5/0.0 | 14.5/6.0 |
| last 8 LIT trades ≤ 0R | 95.5/0.0 (22) | 76.2/0.0 (21) | 96.6/0.0 | 72.2/0.0 | **13.0/6.1** (vs 18.2/5.1 after > 0R) |
| last 10 LIT trades ≤ 0R | 71.0/0.0 | 50.0/0.0 | 100.0/0.0 | 93.3/0.0 | 13.6/4.9 |

- **"Start after a cold LIT stretch" looks huge in 2026 and is not real.** The qualifying starts are 2-4 separate episodes per
  half (e.g. January's losing run before February's targets). In 2021-25 it is the other way round: 13.0% after a cold
  stretch against 18.2% after a good one. It also costs calendar time: waiting for the condition the back-to-back path makes
  3 passes in Jan-Jun instead of 11. Rejected (the same verdict as `lit-two-week-eval.md`, now with the reason).
- **Weekday:** Friday starts look better in 2026 (both halves, both variants) but 2021-25 shows no weekday effect
  (13.6-17.1% for every day). 24 / 14 starts. No rule.

## 3. Weekly profit and loss stops

| Rule | Live LIT 2-wk Δ H1 ; H2 | Trades/wk on the path | LIT size rule Δ H1 / H2 / 2021-25 | Verdict |
|---|---|---|---|---|
| stop the week after +2R (or after a target) | −17.6/+1.7 ; −8.7/0.0 | 2.6 / 2.1 | −22,247 / −922 / +4,806 | rejected |
| half size after +3R | −6.7/0.0 ; −8.7/0.0 | 3.1 / 2.6 | −5,162 / −303 / +710 | rejected |
| stop the week after +8R | −0.8/+0.9 ; 0/0 | 2.9 / 2.6 | −4,225 / 0 / +347 | rejected |
| stop the week after −1R / after 1 stop-out | −9.2/−9.2 ; −1.4/−2.9 | **1.8-1.9** | −7,480 / +378 / +6,537 | rejected (< 2 a week) |
| stop the week after 2 stop-outs | −1.6/−9.2 ; +2.9/0.0 | 2.7 / 2.2 | −711 / +86 / +542 | rejected (H1 pass down) |
| half after 3 stop-outs | 0/−0.8 ; 0/0 | 3.1 / 2.6 | +300 / 0 / −343 | promising (4 trades) |
| **eval week: no trade after −$1,200** | **0.0/−4.2 ; +1.5/0.0** | 3.0 / 2.4 | (eval-only rule) | **adopt-candidate** |

- **Profit stops are wrong for LIT:** a week with a target is usually a trending week, and the trades after it carry money.
  Stopping after +2R costs $22k of H1 at the LIT size and 17.6 points of 2-week passes.
- **R-based loss stops** either cut trading below 2 a week (stop after one loser) or lose H1 passes.
- **The eval's own week in $ works.** Neighbour table (fresh 2-week evals; eventual pass in brackets):

  | Weekly loss stop | Live H1 | Live H2 | Combo H1 | Combo H2 | 2021-25 |
  |---|---|---|---|---|---|
  | none (live) | 52.9/9.2 (72.9) | 50.7/2.9 (88.2) | 58.0/2.5 (81.4) | 52.2/0.0 (95.6) | 15.4/5.6 |
  | −$600 | 51.3/0.0 (83.1) | 50.7/0.0 (95.6) | 54.6/0.0 (82.2) | 52.2/0.0 (97.1) | - |
  | −$800 | 52.9/4.2 (76.3) | 52.2/0.0 (94.1) | 55.5/0.0 (89.0) | 52.2/0.0 (95.6) | 15.1/3.3 |
  | −$1,000 | 52.9/4.2 (76.3) | 52.2/0.0 (94.1) | 56.3/0.0 (87.3) | 52.2/0.0 (95.6) | - |
  | **−$1,200** | **52.9/5.0 (72.0)** | **52.2/2.9 (91.2)** | **58.0/0.8 (84.7)** | **52.2/0.0 (95.6)** | **15.4/5.2** |
  | −$1,500 | 52.9/5.9 (72.9) | 52.2/2.9 (88.2) | 58.0/0.8 (81.4) | 52.2/0.0 (95.6) | 15.4/4.9 |
  | −$2,000 | = live | = live | = live | = live | - |
  | stop after any stop-out | 45.4/0.0 | 50.7/0.0 | 49.6/0.0 | 50.7/0.0 | - |

  Monte Carlo 2-week fail at −$1,200: 5.3 / 4.5% (live 7.0 / 6.8), combo 2.6 / 1.6% (3.2 / 3.2). Eventual pass in the Monte
  Carlo: 80.2 / 79.8% (live 78.2 / 75.7).

- **Why it works:** the two-week size puts up to ~$990 on the first trades. Two full losers in a row are what fail an eval.
  After a loss week of −$1,200 the eval sits out until Monday and starts the new week with a fresh daily loss and a room the
  trailing floor has not eaten further.
- **Why −$1,200 and not −$800:** −$800 (= right after one full stop-out) cuts more fails on live LIT, but on the combo its
  Jan-Jun 2-week pass drops 58.0 → 55.5%. −$1,200 is the level where the pass is not down in any of the four cells. The whole
  ridge −$700 to −$1,500 cuts fails; 2021-25 agrees (fails 5.6 → 5.2%, pass unchanged).
- **Cost:** on live LIT the H1 eventual pass is −0.9 (72.0 vs 72.9, exact starts; the Monte Carlo is +2.0), and about 0.15
  trades a week are skipped. In money (section 5) it is neutral: −$2 / −$3 a month.
- **Verdict: adopt-candidate**, an eval-safety rule rather than a money rule.

## 4. Funded-phase risk

Paid to you in 6 months (Monte Carlo, 1,000 accounts), accounts lost, max risk a trade. All with payouts once $1,500+ is above
the buffer.

| Funded sizing | Live LIT H1 | Live LIT H2 | Combo H1 | Combo H2 |
|---|---|---|---|---|
| **live funded (40% of room, max $800, best day $1,500)** | **$4,788 · 0.8% · $342** | **$4,622 · 1.4% · $412** | $4,729 · 0.6% | $5,659 · 0.6% |
| (same, payouts as soon as eligible) | $4,613 · 1.0% | $4,433 · 1.5% | $4,697 · 0.6% | $5,653 · 0.6% |
| 20% of the room (≈ full Kelly) | $4,410 · 0.3% | $3,092 · 0.6% | $4,472 · 0.0% | $4,307 · 0.1% |
| 30% of the room | $4,710 · 0.4% | $4,075 · 1.0% | $4,630 · 0.3% | $5,232 · 0.1% |
| 50% of the room | $4,804 · 1.4% | $4,788 · 1.7% | $4,746 · 1.0% | $5,742 · 1.0% |
| 60% of the room | $4,792 · 2.0% | $4,859 · 3.0% | $4,755 · 0.9% | $5,769 · 1.5% |
| max $1,200 a trade | $4,785 · 0.9% | $4,762 · 1.4% | $4,778 · 0.6% | $5,853 · 0.6% |
| ramp +$200 max a payout (to $1,400) | $4,770 · 0.8% · $581 | $4,731 · 1.3% · $482 | $4,738 · 0.6% | $5,856 · 0.6% |
| ramp +$400 max a payout (to $2,000) | $4,791 · 0.9% · $678 | $4,723 · 1.3% · $602 | $4,846 · 0.6% | $5,935 · 0.6% |
| ramp + bigger best-day cap | $4,570 · 1.1% | $4,582 · 1.8% | $4,531 · 0.6% | $5,609 · 0.6% |
| room < $1,500 → 25% | $4,763 · 0.3% | $4,516 · 1.5% | $4,705 · 0.0% | $5,561 · 0.8% |
| cold: last 5 R ≤ 0 → ×0.5 | $3,945 · 0.7% | $3,826 · 1.4% | $4,040 · 0.3% | $4,621 · 0.4% |
| hot: last 10 R ≥ +5 → ×1.5 | $4,750 · 1.9% | $4,427 · 1.7% | $4,785 · 0.5% | $5,339 · 1.0% |
| R drawdown ≥ 5R → ×0.5 | $3,941 · 0.8% | $3,830 · 2.1% | $4,003 · 0.2% | $4,870 · 0.7% |

- **Kelly check:** from LIT's R distribution (1-micro result / 1-micro full stop-out), the full Kelly fraction of the room is
  **21% / 20%** (live LIT, H1 / H2) and 29% / 24% (combo); half Kelly 10-15%. The live funded mode's "40% of the room" looks
  like 2× Kelly, but the best-day cap ($1,500 / target distance) sets the size on most trades: the biggest real risk is
  $342-412 a trade, about 17-21% of a fresh $2,000 room, i.e. **about full Kelly already**. Going to 20% loses fewer accounts
  but pays $380-1,530 less in 6 months.
- **Risk ramp after each payout:** +$3 / +$101 per 6 months on live LIT (noise), while the biggest risk a trade grows 60-100%.
  The best-day cap and the payout reset keep the size flat, as lit-money-batch2 found for compounding. Rejected.
- **Streak multipliers on the funded account:** cold and drawdown rules cost $700-1,100 per 6 months; hot loses more
  accounts. Rejected.
- **Verdict:** keep the live funded sizing with the $1,500+ payout habit. Nothing here beats it in both halves without more
  accounts lost.

## 5. A portfolio of evals: how many, and when

MFFU's Builder 50K guide allows **1 active sim-funded account per person** (`research/lit/mffu_rules.json`). So extra passes
cannot all be used; the question is how to keep that one slot filled for the least eval money. Net = payouts − $91.80 per
eval, over 6 months, per month:

| Policy (1 funded slot) | Live H1 | Live H2 | Combo H1 | Combo H2 | Evals in 6 mo (live) |
|---|---|---|---|---|---|
| **A. Serial: 1 eval; the next only after a fail or when the funded account ends** | $641 · 9.4% | $608 · 14.8% | $639 · 7.2% | $793 · 4.4% | 1.4-1.5 |
| B. Always 1 eval running (5-7 passes wasted) | $498 · 9.8% | $491 · 14.6% | $509 · 7.4% | $659 · 4.4% | 9-11 |
| C. 2 evals the same day | $619 · 9.4% | $584 · 14.8% | $618 · 7.2% | $771 · 4.4% | 2.9-3.0 |
| D. 2 evals, the 2nd 3 sessions later | $654 · 8.0% | $632 · 11.0% | $647 · 6.0% | $817 · 2.8% | 2.4-2.5 |
| **E. 2 evals, the 2nd 5 sessions later** | **$662 · 7.4%** | **$653 · 9.8%** | **$657 · 5.4%** | **$837 · 2.4%** | 2.2 |
| F. 2 evals, the 2nd 10 sessions later | $654 · 8.4% | $653 · 8.8% | $654 · 6.2% | $827 · 2.8% | 1.9-2.0 |
| G. 3 evals, 5 sessions apart | $662 · 7.4% | $665 · 8.6% | $660 · 5.0% | $839 · 2.8% | 2.5-2.7 |
| H. Serial + a standby eval when the funded room < $1,000 | $623 · 9.8% | $594 · 14.8% | $630 · 7.4% | $787 · 4.4% | 2.4 |
| E + eval weekly loss stop −$1,200 | $662 · 7.8% | $653 · 9.6% | $654 · 6.0% | $837 · 2.6% | 2.1-2.2 |

($/month net · share of 6-month paths that end with less money than they cost.)

- **The 2nd eval one week later is the best use of $92.** It pays +$21 / +$45 a month (live), +$18 / +$44 (combo), and the
  share of 6-month stretches that lose money falls 9.4 → 7.4% / 14.8 → 9.8%. The neighbours (3 or 10 sessions later, or a 3rd eval) all beat
  serial too; 5 sessions is the middle of that ridge.
- **Why not the same day:** both evals see the same trades with the same sizing, so they pass or fail together. The 2nd is
  pure cost (C is worse than A). A week's offset gives the 2nd eval different trades at the start, which is what decides an
  eval.
- **A standby eval while funded** does not pay: funded accounts are rarely lost (1%), so the standby mostly passes into a full
  slot.
- **If more funded slots were allowed** (MFFU's general page mentions up to 5 sim-funded 25K/50K accounts; the Builder 50K
  page says 1 - ask support; other firms: `lit-funded-firms.md`):

  | 3 funded slots | Live H1 | Live H2 | Combo H1 | Combo H2 |
  |---|---|---|---|---|
  | 1 eval at a time | $1,577 | $1,442 | $1,559 | $1,994 |
  | 2 evals, 5 sessions apart | $1,781 | $1,731 | $1,772 | $2,279 |
  | 3 evals, 5 sessions apart | $1,828 | $1,820 | $1,828 | $2,346 |
  | 3 evals, max 2 bought a month ($184) | $1,715 | $1,681 | $1,719 | $2,207 |
  | 3 evals, max 1 bought a month ($92) | $1,340 | $1,274 | $1,375 | $1,763 |

  With 3 slots, ~$90 a month of evals buys about $1,800 a month; one eval a month costs ~$500 a month of that.

## What changes

- **Owner habit (adopt-candidate, no code):** when you buy a Builder 50K eval and have no funded account, buy a 2nd one
  5 sessions later if the 1st is still open. Stop buying once one passes; buy again only when the funded account ends or both
  evals have failed. Never two the same day. Run `lit_risk_m_portfolio_stagger5`.
- **Eval weekly loss stop (adopt-candidate, default off):** in `live_model.json` `"lit_sizing"` add `"wk_loss_usd": 1200`.
  `engine/sizing.lit_qty` then routes 0 in an eval mode once `state["wk_pnl"]` ≤ −$1,200. Before it acts, the state must carry
  the week P&L:
  - `engine/live.py` `eval_state()`: pass `today=today` to `_sz.eval_state(...)` (one argument; not done here, live.py was off
    limits for this study);
  - `tools/cloud_monitor.py` `lit_eval_state()`: pass `today=day` the same way.
  - Without that, the option logs "week P&L unknown" and changes nothing. Run `lit_risk_m_wk1200`.
  - **Wired 2026-10-20** (`engine/eval_life.py`, `tests/test_eval_lifecycle.py`): both callers pass `today=`, every eval mode
    (also safe_eval after session 10) gets the state, the PC Today page / phone Eval HQ show "weekly loss stop: off / armed /
    tripped" and the PC bot pushes once when it trips. Still OFF in `live_model.json`: the switch is the one line above, in
    `live_model.json` and `live_model_lit.json`.
- **Everything else:** no change. Live funded sizing and the $1,500+ payout habit stay.

## Files

- `tools/lit_risk_money.py`: `check` (executor == adopt_combo.json), `grid` (parts 1-3), `round2` (neighbours, start rules),
  `funded`, `portfolio` (`portfolio check`: the session-by-session eval / funded machines == the executors), `save`; also
  `ref2125()`, `check_engine_wk()`, `portfolio_extra()`.
- `research/lit/risk_money.json` (eval grids, round 2, 2021-25 reference), `research/lit/risk_money_funded.json`,
  `research/lit/risk_money_portfolio.json`.
- `engine/sizing.py`: `lit_sizing["wk_loss_usd"]` (default off), `eval_state(..., today=)` and `eval_week_pnl()`.
- `tests/test_lit_wk_loss.py`: 10 checks (unit + the research rule == engine `lit_qty` on the 2026 eval path).
- Runs: `lit_risk_m_wk1200`, `lit_risk_m_wk1200_all3`, `lit_risk_m_wk800`, `lit_risk_m_portfolio_stagger5`,
  `lit_risk_m_after10_safe40`, `lit_risk_m_cold5`, `lit_risk_m_hot10`, `lit_risk_m_wkprofit3`, `lit_risk_m_funded_ramp400`,
  `lit_risk_m_funded_ref`. (The name `lit_risk_*` was taken by the 2026-10-18 stops / targets study in `tools/lit_risk.py`, so
  these runs are `lit_risk_m_*`.)
