## In one minute

- **The question (owner's Advanced Decisions Report, ch. 6, 8, 9, 10, experiments 2-3):**
  - Does breakeven remove more good recoveries than losses?
  - Do partial profits at the first obstacle pay?
  - Should the target depend on where we entered, how far the day has already run, or the time left?
  - What should happen when the target trades before our entry fills?
- **The answer:**
  - **Breakeven at 1R stays.** Of the trades it scratched, only 3 of 34 in 2026 would have gone on to the target (H1 3 of 29,
    H2 0 of 5). For breakeven to cost money, more than about 13% would have to. Without breakeven, more evals fail.
  - **Every later or "smarter" breakeven** (1.5R, 2R, after a new 1m or 5m swing, after price leaves the mitigation area,
    held while the zone's 50% is untouched, held while a 1m gap is open) **fails one half.**
  - **Partials at the first obstacle are a clear no.** LIT's eval sizing makes one winner pass the eval. Cutting the winner
    in half breaks that: 2-week passes fall from 52.9% to 22-50% in H1.
  - **Nearer targets** (from the entry location, the day's range so far, or a time deadline) **help H1 only.**
  - **A target that trades before the fill** happened only once in 2026 (before the setup) and never between the limit and
    the fill. Nothing can be learned from one trade.
  - **One small, mechanical change helps in both halves:** put the breakeven stop at **entry + 1.25 pts** (5 ticks) instead
    of exactly at the entry. Then a breakeven exit covers its own costs ($1.90 commission + 1 tick of slippage).
    - It changed no exit in 2026: no trade that went on to the target came back to within 5 ticks of the entry after 1R.
    - Money: H1 +$681, H2 +$80. With the 15-minute check: H1 +$928, H2 +$20.
    - The 2-week pass rate is unchanged, and H1 2-week fails drop by 0.8 points.
    - It is small: about $15-25 per breakeven trade on the eval path.
- **To switch it on (coordinator):** `live_model.json` `"lit": {..., "be_off": 1.25}`. The engine option is in place and
  defaults to 0.0 (today).

## How this was done

- **Trades:** the exact live LIT signals of 2026 on true 1m bars (119 of the 120 trades). Same setups, same 30-min limit at
  the 5m CISD level, same 1m CISD entry, same stop 1 tick beyond the sweep extreme, VIX-band target (≥ 1.5R, banked at 8R),
  flat 15:55, 1 trade a day.
  - `tools/lit_adv_manage.py` wraps `engine/lit.py`. With every option off it gives the live trades exactly (`check`:
    120/120).
  - The 15-minute check (`t_check {"at": 15, "x": 0.3, "mfe": 0.5}`, `research/lit/loss_learn_t15_patch.md`) reproduces the
    loss study's 13 exits on the same dates.
- **No look-ahead:**
  - A swing (fractal k=2) is used only after its confirming bar has closed.
  - A decision made at a bar's close acts from the next bar.
  - In the same bar the stop is checked before the target, partial or breakeven, as live.
  - The VIX band is known from 18:00 (the VIX close of the day before), so "traded before the setup" uses the bars from 18:00
    to the setup bar only.
- **Sizing = live:** `engine/sizing.py lit_qty`, exactly as the live loop calls it. That is `two_week` (one winner passes, 60%
  of the room, the $1,000 daily cap, 40 micros) for 10 sessions, then `safe_eval`. Costs are $1.90 a micro and 1 tick on
  market entries and on stop / breakeven / time exits.
- **Main metric:** P(pass within 10 sessions) of a fresh MFFU Builder 50K eval started on every session of the half. A
  2,000-path Monte Carlo (20 sessions in 5-session blocks) is shown next to it.
- **Money ($, $/month, PF, win %, drawdown):** played on the owner's path, with no reset: a new eval only after a pass or a
  fail.
- **Judging:** pick on 2026 H1 (Jan 2 - Jun 30), check on H2 (Jul 1 - Oct 16). Adopt only if both halves improve and trades
  stay 2-4 a week. All management ideas keep the trades (3.12 / 2.56 a week, 85% / 81% of weeks with 2+).
- **2021-25:** no 1m bars, so these 1m management rules cannot be tested there.

## 1. Breakeven versus the recoveries it removes (ch. 8, experiment 2)

The same trades with and without breakeven. "Changed" means trades where breakeven closed the trade at entry. "Recovery"
means the trade would have reached the target without breakeven. "Loss avoided" means it would have hit the full stop. $ are
at the live size of each trade.

| Half | Reached 1R | Closed at breakeven | Would have hit target (recovery q) | 95% range of q | Would have hit full stop | Other (15:55 exit) | $ recoveries removed | $ losses avoided | $ other | Net $ of breakeven | q at which BE stops paying |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 | 47 | 29 | 3 (10.3%) | 3.6-26.4% | 22 | 4 | -6,880 | +10,724 | -5,423 | -1,579 | 13.6% |
| H2 | 18 | 5 | 0 (0%) | 0-43.4% | 4 | 1 | 0 | +1,407 | -29 | +1,378 | 12.0% |

- **The report's rule:** breakeven pays only if q < (z + 1 - costs) / (b + 1). Here z = the breakeven exit, about 0R, and
  b = the target, 6-7R. That gives about **12-14%**.
- **What we see:** LIT's q is 10% (H1) and 0% (H2). That is below the line, but the 95% range crosses it, as the report
  warned it would.
- **The money is a wash:** H1 -$1.6k, H2 +$1.4k. The bill in H1 is not the 3 recoveries alone. It is also 4 trades that
  would have closed at 15:55 in profit.
- **What breakeven really buys is eval safety:**
  - Without it, 2-week fails rise from 9.2% to 13.4% (H1) and from 2.9% to 7.2% (H2).
  - 2-week passes fall in H2 (50.7% to 44.9%).
- **Breakeven stays.**

### Breakeven variants

All at the live size, vs live. Trades a week 3.12 / 2.56 in every row.

| Breakeven rule | H1 net $ | H1 $/mo | H1 PF | H1 DD | H1 2-wk pass/fail | H2 net $ | H2 $/mo | H2 PF | H2 DD | H2 2-wk pass/fail | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **Live: BE at 1R, stop at entry** | +36,723 | 6,025 | 3.66 | -3,612 | 52.9 / 9.2 | +9,674 | 2,605 | 2.13 | -2,493 | 50.7 / 2.9 | reference |
| **BE at 1R, stop at entry + 1.25 pts (costs)** | **+37,404** | 6,137 | 3.87 | -3,522 | 52.9 / **8.4** | **+9,754** | 2,626 | 2.15 | -2,491 | 50.7 / 2.9 | **adopt-candidate (small)** |
| BE at 1R, entry + 0.5 / 1.0 / 1.5 / 2.0 / 3.0 pts | +36,883 / +37,374 / +37,504 / +37,703 / +31,985 | - | 3.72-3.89 / 3.46 | -3,501 to -3,531 | 52.9 / 7.6-8.4 | +9,706 / +9,738 / +9,770 / +9,950 / +10,030 | - | 2.14-2.18 | -2,487 to -2,492 | 50.7 / 2.9 (2.0+: 4.3) | 0.5-1.5 all good; 2.0+ hurts |
| No breakeven | +37,547 | 6,160 | 2.89 | -3,366 | 54.6 / **13.4** | +7,335 | 1,975 | 1.68 | -3,467 | **44.9** / 7.2 | rejected |
| BE at 0.75R (round 1*) | +1,799 vs live | - | 3.42 | - | 53.8 / 8.4 | -3,604 vs live | - | 1.62 | - | 50.7 / 4.3 | rejected |
| BE at 1.25R (round 1*) | -2,086 vs live | - | 2.67 | - | 52.1 / 8.4 | 0 | - | 1.85 | - | 50.7 / 2.9 | rejected |
| BE at 1.5R | +30,884 | 5,067 | 2.82 | -3,501 | 51.3 / 9.2 | +9,674 | 2,605 | 2.13 | -2,493 | 50.7 / 2.9 | rejected |
| BE at 2R (round 1*) | -2,928 vs live | - | 2.39 | - | 49.6 / 9.2 | -594 vs live | - | 1.77 | - | 44.9 / 2.9 | rejected |
| BE only after a new 1m higher low above entry (no 1R) (round 1*) | -13,934 vs live | - | 2.35 | - | 43.7 / 4.2 | -5,618 vs live | - | 1.46 | - | 40.6 / 1.4 | rejected |
| BE at 1R once a new 1m higher low formed (round 1*) | -2,342 vs live | - | 2.76 | - | 52.9 / 8.4 | 0 | - | 1.85 | - | 50.7 / 2.9 | rejected |
| BE at 1R once a new 5m higher low formed | +27,143 | 4,453 | 2.71 | -2,748 | 54.6 / 8.4 | +9,968 | 2,684 | 2.05 | -3,022 | **44.9 / 7.2** | rejected (H2 passes) |
| BE only after a 1m close beyond the pre-pullback high ("left the mitigation area") (round 1*) | -13,413 vs live | - | 2.61 | - | 41.2 / 0.0 | -5,467 vs live | - | 1.92 | - | 30.4 / 0.0 | rejected |
| BE at 1R + that close (round 1*) | -3,544 vs live | - | 2.73 | - | 47.1 / 8.4 | -65 vs live | - | 1.84 | - | 44.9 / 2.9 | rejected |
| **No BE while the zone's 50% (limit to stop) is untouched** | +38,259 | 6,277 | 3.52 | -3,711 | **60.5 / 12.6** | +9,703 | 2,612 | 2.13 | -2,493 | 50.7 / 2.9 | H1 only: rejected |
| No BE while a 1m gap near entry is open (round 1*) | -5,853 vs live | - | 2.37 | - | 49.6 / 10.9 | -1,092 vs live | - | 1.70 | - | 50.7 / 2.9 | rejected |

*Round 1 used the earlier sizing (two_week to the end, $1.40, reset after 10 sessions); its rows are shown as the change vs
live under that sizing (`research/lit/adv_results.json`). Every round-2 row uses today's live sizing
(`research/lit/adv_results2.json`).

- **"No breakeven while the zone's 50% is untouched"** is the report's mitigation idea in its purest form. It lifts H1
  2-week passes by 7.6 points, but H1 fails rise too (9.2% to 12.6%), and **it changes nothing in H2**. It is not proven:
  rejected.
- **Structure-based breakevens** move the stop either later (more full losses) or too early (more scratches). Neither
  helps both halves.

## 2. Partials at the first obstacle (ch. 9)

The new angle was the first opposing structure from the fill. Candidates were the setup's own pre-pullback high ("leg"),
untouched LIT pools, both together ("struct"), and those plus the 18:00 and midnight opens ("all"). A fraction f is closed
there; the rest goes to the target. "BE keep" keeps the live breakeven at 1R. "BE after" means no breakeven at 1R, and
breakeven on the rest once the partial is filled (the report's "partial and BE cannot be added" case).

| Partial | H1 net $ | H1 PF | H1 2-wk pass/fail | H2 net $ | H2 PF | H2 2-wk pass/fail | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| **Live (no partial)** | +36,723 | 3.66 | 52.9 / 9.2 | +9,674 | 2.13 | 50.7 / 2.9 | reference |
| 1/3 at the pre-pullback high ≥ 1R, BE keep | +25,683 | 2.90 | 49.6 / 9.2 | +9,674 | 2.13 | 50.7 / 2.9 | rejected |
| 1/2 at the first struct obstacle ≥ 1R, BE after | +13,329 | 1.94 | 28.6 / 9.2 | +5,252 | 1.53 | 18.8 / 8.7 | rejected |
| Round 1*: 1/2 at the first pool / struct / all ≥ 1R | -13.2k to -15.9k vs live | 1.97-2.26 | 21.8-33.6 | -2.7k to +1.7k vs live | 1.77-2.31 | 18.8-21.7 | rejected |
| Round 1*: 1/3 at the first pool / struct / all ≥ 1R | -8.6k to -13.2k vs live | 2.02-2.70 | 32.8-43.7 | -2.7k to -3.3k vs live | 1.57-1.65 | 33.3-39.1 | rejected |
| Round 1*: 1/2 at struct ≥ 2R, BE keep | -9,741 vs live | 2.46 | 33.6 / 6.7 | -3,833 vs live | 1.56 | 42.0 / 2.9 | rejected |

- **The report's test, measured.** Once price reaches the first obstacle (median 0.8R away) before the stop, LIT goes on to
  its target first 39% of the time (H1) and 48% (H2). A partial at the obstacle pays only below about 29-35%. **LIT
  continues too often for a partial to pay.**
- **The interaction with the eval sizing matters more.** Live sizing picks the micros so that one target hit passes the
  eval. A partial makes every winner smaller, so a single winner no longer passes. That is why the 2-week pass rate collapses.
- The pre-pullback high is usually inside 1R (34 of 119 first obstacles are it), so the "leg" partial rarely fires (never in
  H2).

## 3. Target choice from the entry location, the journey and the deadline (ch. 10)

**First passage (live trades, every exit ignored, to 15:55):**

| Half | Target first by 30 min | 60 min | 120 min | 240 min | 15:55 | Stop first by 15:55 | Neither by 15:55 | Target seen only after the stop |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 (79) | 2.5% | 5.1% | 8.9% | 11.4% | 22.8% | 67.1% | 10.1% | 15 |
| H2 (40) | 0% | 2.5% | 7.5% | 17.5% | 25.0% | 62.5% | 12.5% | 7 |

- **LIT targets take time.** Half of the target hits come after 2-4 hours. In 22 trades the target traded only *after* the
  stop. The report warns those are not winners, and we count them as stops.
- **The 15:55 deadline rarely binds:** only 10-12% of trades are still open at 15:55 with neither stop nor target hit.

| Target rule (at the fill) | H1 net $ | H1 2-wk pass/fail | H2 net $ | H2 2-wk pass/fail | + 15-min check: H1 net / pass | H2 net / pass | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| **Live: VIX band** | +36,723 | 52.9 / 9.2 | +9,674 | 50.7 / 2.9 | +33,306 / 57.1 | +9,039 / 52.2 | reference |
| Nearer target when the sweep low is not the session's low ("inside a leg") | +24,675 | 52.9 / 13.4 | +12,066 | 50.7 / 7.2 | +25,355 / 53.8 | +8,094 / 50.7 | rejected |
| Nearer target when the day already ran ≥ 1 VIX move | +28,557 | 52.9 / 9.2 | +8,948 | 43.5 / 2.9 | +26,632 / 57.1 | +8,472 / 44.9 | rejected |
| Deadline: cap at 1.5 × the VIX move for the time left | +32,216 | 58.0 / 9.2 | +9,516 | 50.7 / 2.9 | +35,343 / 59.7 | +11,672 / 52.2 | H1 passes only; money only with t15 |
| Deadline: cap at 2.0 × the VIX move for the time left | +36,391 | 58.8 / 9.2 | +9,674 | 50.7 / 2.9 | +33,087 / 63.0 | +9,347 / 52.2 | H1 only: rejected |
| Round 1*: always the nearer of band / first obstacle | -11.5k to -11.8k vs live | 37.8-38.7 | -4.3k to -5.8k vs live | 33.3-37.7 | - | - | rejected |

- **The deadline target** is the most interesting near miss. It caps the target at c × the VIX move scaled by
  √(minutes left / a full day), never under 1.5R.
  - At c = 2 it lifts H1 2-week passes from 52.9% to 58.8% (63.0% with the 15-minute check).
  - **H2 does not move** (50.7%, and 52.2% with the check). Money is flat or down.
  - At c = 1.5 on top of the 15-minute check, money rises in both halves (+$2.0k / +$2.6k), but alone it loses money in both
    halves, and its neighbour c = 2 loses H1 money. That is a lone spike: **rejected.** Worth a recheck when more H2 data
    exists.

## 4. A target that trades before the entry fills (ch. 6, experiment 3)

- **Today's rules:**
  - If the target trades before the limit is tapped, the setup is cancelled.
  - Between the tap and the 1m CISD fill, nothing is checked.
  - The VIX band is not checked against the bars from 18:00 to the setup.
- **What happened in 2026:**
  - Target traded between the limit and the tap: **3 setups**, all cancelled. Keeping or revalidating them (new target
    1.5 / 2 VIX moves or the next pool) changed nothing: none of them would have filled anyway.
  - Target traded between the tap and the fill: **0 trades.** It can't happen in practice: 20 1m bars are too short to run
    1.5R and come back.
  - Band already traded between 18:00 and the setup: **1 filled trade** (2026-06-19, +1.44R at 15:55), plus 4 setups that did
    not trade.
    - Skipping it: H1 -$539 (round 1).
    - Retargeting it to the next untouched pool: H1 +$1,796.
    - Both rest on one trade.
- **Verdict:** keep today's rules. The policy question is real, but LIT almost never meets it. The executor records it
  (`pre` field) so it can be rechecked later.

## 5. On top of the 15-minute early-loss check

The loss study's leading candidate is `t_check`: exit at 15 minutes if the trade never reached +0.5R and is 0.3R or more
under water. Every idea was rerun on top of it.

| Idea | Alone: H1 / H2 net vs live | Alone: 2-wk pass H1 / H2 | On top of t15: H1 / H2 net vs t15 | On t15: 2-wk pass H1 / H2 (t15: 57.1 / 52.2) | Still helps? |
|---|---|---|---|---|---|
| **BE stop at entry + 1.25 pts** | **+681 / +80** | 52.9 / 50.7 (fails H1 8.4) | **+928 / +20** | 57.1 / 52.2 (fails H1 5.9 vs 6.7) | **yes, small** |
| No BE while the zone's 50% is untouched | +1,536 / +29 | 60.5 / 50.7 | +2,641 / +14 | 61.3 / 52.2 | H1 only |
| BE at 1R once a 5m higher low formed | -9,580 / +294 | 54.6 / 44.9 | -2,520 / +6,079 | 59.7 / 46.4 | no (H2 passes) |
| No BE | +824 / -2,339 | 54.6 / 44.9 | -6,940 / +5,868 | 55.5 / 46.4 | no |
| Deadline target c = 2 | -332 / 0 | 58.8 / 50.7 | -219 / +308 | 63.0 / 52.2 | H1 passes only |
| Partials (any) | -11k to -23k / 0 to -4k | 28.6-49.6 / 18.8-50.7 | similar | 27.7-53.8 / 18.8-52.2 | no |

- The 15-minute check and the cost-covering breakeven stop do not overlap. The check acts only before the breakeven has
  moved; the offset acts only after it has. Their gains add up.

## The recommendation, exactly

- **Breakeven stop at entry + costs: adopt-candidate (small).** Runs `lit_adv_be_costs` and `lit_adv_be_costs_t15`.
  - **Rule:** when the trade first trades 1R in our favour, move the stop to the fill price + 1.25 pts (5 ticks) instead of
    the fill price.
    - 1.25 pts covers the $1.90 round-trip commission (0.95 pt a micro) plus 1 tick of exit slippage.
    - Neighbours 0.5, 1.0 and 1.5 pts all help both halves. 2.0 pts and more start to turn breakevens into full trades back
      (H2 2-week fails 2.9% to 4.3%).
  - **Engine option (done):** `engine/lit.py` DEFAULTS `"be_off": 0.0`. `simulate_x` puts the breakeven stop at
    `entry + be_off`; `engine/lit_fills.py` uses the same level. The default 0.0 is today's behaviour
    (`entry + 0.0` is the same number): the day-end replay of `python -X utf8 -m tests.test_lit_live` stays 120/120. With
    `be_off 1.25`, `engine/lit.py run_x` equals the study executor on all 120 trades of 2026 (34 breakeven exits at +1.0 pt
    after slippage). The live loop routes the model's `stop_now`, so the broker stop
    follows automatically (reason "BE", since it is above the entry).
  - **Config change:** `live_model.json` `"lit": {..., "be_off": 1.25}`.
  - **Route check (2026-10-19):** `tests/test_lit_exit_route.py` replays 6 breakeven trades (3 long, 3 short) through the PC
    bot: one CHANGE to exactly entry +/- 1.25 on the tick grid, 2 s after the +1R bar closed, BE exit P&L = backtest.
    NinjaTrader self-test: `CHANGE;;;;0;;0;25021.25;;;<id>S;;` for a 25020 long. A stop that close to the market is a little
    more likely to be refused if price has already come back; the bot retries 3 times and the model's BE exit is routed anyway.
  - **Honest size of it:** about $15-25 per breakeven trade on the eval path ($2.50 a micro). 2026 had 34 breakeven exits, about $760 in the eval path, almost
    all in H1 (29 of the 34 breakevens). In H2 it adds $80 (5 breakevens). The 2-week pass rate does not move. Take it as
    free money, not as an edge.
- **Everything else: keep as it is.** That covers breakeven at 1R, no partials, the VIX-band target, the 15:55 flat and
  today's pre-fill cancel.

## Honest caveats

- **Thin samples.**
  - 2026 has 120 trades, and only 34 breakeven exits (5 in H2).
  - The breakeven recovery rate is 3 of 34 (95% range 3-23%), and the decision line (12-14%) sits inside that range.
  - H2 cannot confirm or reject breakeven ideas well: only 18 trades reached 1R there.
- **The live sizing makes partials look worse than at a fixed size.** That is the honest answer for this bot: it sizes for
  one winner to pass.
- **Round 1 rows** used the earlier two_week sizing ($1.40, reset after 10 sessions). The verdicts were the same under both
  sizings for every idea that was rerun.
- **No 1m bars before 2026:** none of these rules can be checked on 2021-25.
- **Paper only.** `live_model.json` was not changed.

## Files and how to rerun

- `tools/lit_adv_manage.py`:
  - `check`: options off == the live trades.
  - `grid`: the variants → `research/lit/adv_results2.json` (round 1: `research/lit/adv_results.json`).
  - `diag`: breakeven recoveries vs losses, first passage, obstacle continuation, pre-fill events →
    `research/lit/adv_diag.json`.
  - `save`: stores the runs `lit_adv_*`.
- All of it runs in one process, about 10 minutes.
