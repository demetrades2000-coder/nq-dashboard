## In one minute

- **What was asked (2026-10-28):** the bot should know its written rules, trade "like a person, not a fixed RR", learn
  market structure for each strategy, and learn how to trade. After the -$437 LIT trade the owner felt it "should have gone
  breakeven" after the strong reversal.
- **What was built tonight (all read-only, nothing routes):**
  - `engine/structure.py`: market structure on closed bars (1m / 5m / 15m / 1h): swing highs and lows, HH / HL / LH / LL,
    trend, BOS and CHoCH, the protected swing, liquidity pools (session boxes, prior day, equal highs / lows, 1h swings, swept
    or not), premium / discount, displacement legs. A full recompute on a 12-day 1m window takes about 15-50 ms here
    (median of 20 cuts of 2026, depending on the machine's load; the Surface is slower), once per closed bar, in the page /
    live_publish thread; the poll thread only reads the cached block (+0 ms; the poll-speed test passes 27/27).
  - `docs/PLAYBOOK.md` + `engine/playbook.py`: the written rules of Zlarior, ATLAS and BLITZ; the bot names the rule it is on.
  - `engine/advisor.py`: the discretion advisor. On every finished live and paper trade it writes down what each structure
    rule would have done and why, and scores it in dollars. Its tally shows on the Learning page as suggestions.
  - The Live View gets a "structure" block and one structure line per strategy in the thinking panel; the narrator posts
    15m / 1h breaks and advice on an open trade.
- **The research answer: nothing changes in the bots.** No structure idea makes more money than the live rules in both
  halves of 2026 on both sizings (LIT size rule and the live two_week eval path).

| LIT idea (best version of each family) | 2026 H1 (picked) | 2026 H2 (check) | 2021-25 (reference) | Verdict |
|---|---:|---:|---:|---|
| **Live (no change)** | **+$33,901** ($5,562/mo) | **+$9,919** ($2,670/mo) | +$1,265 | stays |
| Breakeven on a 5m CHoCH against after +0.75R (the owner's idea) | -$1,442 | -$775 | -$6,420 | reject |
| Exit on a 5m CHoCH against after +1R | -$5,215 | -$2,150 | +$4,050 | reject |
| Exit on a 15m CHoCH against after +1R | +$59 | -$1,301 | +$1,842 | reject |
| After a 5m BOS in favour (+1R): stop to the 5m protected swing | -$6,305 | +$128 | +$2,616 | reject |
| **After a 15m break in favour (+1R): stop to the 15m protected swing** | **+$467** | **+$13** | -$1,800 | **promising (watch)** |
| Target = the nearer of the VIX band and the next LIT pool >= 1.5R | -$17,399 | -$979 | +$7,339 | reject |
| Target = the next LIT pool >= 3R instead of the band | -$11,264 | +$226 | +$17,727 | reject |
| Half off at the first LIT pool >= 1R | -$9,481 | -$1,388 | +$5,709 | reject |
| Let the winner run past the target (stop locks 75%, 15m trail) | +$13,600 | +$956 | -$10,278 | reject (2 trend days; eval -$12.2k H1) |
| Skip trades against the 1h trend | -$14,968 | -$7,479 | +$736 | reject (1 trade a week) |
| 1.5x with the 1h trend, 0.5x against | +$2,278 | -$2,478 | +$778 | reject |

$ are changes vs live at the LIT size rule (run `lit_live`, costs in, $1.40 + 1 tick); the first row is the live total.

- **The owner's breakeven idea.** "BE after a strong reversal" written as a structure rule = once the trade is +0.75R, a 5m
  CHoCH against it moves the stop to entry + 1.25. In 2026 it changes 6 trades: it saves 2 small losers (+$216) and cuts 4
  trades that went on to pay (-$2,433: 2026-06-19 +$939 -> -$503, 2026-10-14 target +$579 -> -$13; when the CHoCH closes
  already below entry + 1.25, the stop is out at the next open). On 2026-10-28 it would
  not have fired at all: the four green candles never made a 5m CHoCH before the stop. Same answer as `lit-reversal-exit.md`:
  LIT winners snap back too.
- **The 2026-10-28 trade (-$437).** No management rule fires on it (no 5m / 15m CHoCH, no BOS in favour, no pool >= 1.5R in
  front). The only rule that avoids it is "skip trades against the 1h trend" (the 1h was up, the trade was short): $0
  instead of -$437. That rule skips 76 of 119 trades in 2026 and costs $22,447 (H1 -$14,968, H2 -$7,479), and the trade rate
  falls to about 1 a week (owner's rule: 2-4).
- **The one lead.** The 15m structure trail changes only 7 of 120 trades in 2026: 6 breakeven exits become small wins
  (+$3 to +$192) and one end-of-day winner pays less (+$359 -> +$235). On the eval path it makes H1 +$1,019 and H2 +$3,762, but
  one more fresh eval fails within 2 weeks in H1 (1.7% -> 2.5%), so it fails the eval gate. Too thin to switch on: the
  advisor keeps score on it from now on (rule `trail_15m`).
- **ATLAS:** the best-looking idea, the stop at the 15m protected swing (when it sits beyond today's stop, at most 3x),
  passes the 25K account gates (H1 +$3,619, H2 +$377, 2025 +$3,323, 2021-24 +$1,022, same 2-week pass / fail). But its trades
  are worse at a fixed risk in every span (total R H1 123.4 -> 122.8, H2 31.6 -> 29.7, 2025 53.0 -> 46.2, 2021-24 87.3 ->
  84.2): the account gain is the need-sizing path, not a better trade. **Rejected.** Every ATLAS exit / trail idea loses in
  2026.

## How it was tested

- **Same trades.** LIT: `tools/structure_manage.py` takes the live LIT trades (`tools/lit_final.run(live_model.json "lit")`,
  631 trades, 120 in 2026 = run `lit_live` +$43,820 / 2021-25 +$1,265) and only changes what happens after the fill (and, for
  the 1h ideas, which trades are kept). The executor is `tools/lit_rev_exit.manage` (the post-fill part of
  `engine/lit.simulate_x`) plus the structure rules. With every new rule off it gives every live trade's exit and points
  exactly (`check`: 0 mismatches, 0 size mismatches, and today's trade -$437).
- **Structure, no look-ahead.** `engine/structure.Tracker` on the Market's 5m bars (2021-26), 15m and 1h resampled from them,
  and the true 1m bars (2026). A swing exists from 2 bars after it; a BOS / CHoCH from its bar's close. A rule decides at a 1m
  close (5m on 2021-25 days) and acts from the next bar. Pools for the targets are LIT's own levels known before the fill and
  still untaken (plus unbroken 1h swings in the "lit1h" / "1h" sets).
- **The rules.**
  - **Target at the pool:** the next untaken opposing pool at least 1.5 / 2 / 3R away, 1 tick in front of it; "cap" = the
    nearer of it and the VIX band, "pool" = the pool instead of the band (never beyond 8R).
  - **Partial at the pool:** half off at the first pool >= 1R / 2R, the rest to the band (optionally the rest to breakeven).
  - **Structure trail:** after a BOS (or any break) in the trade's direction on 5m / 15m / 1m, once the trade was +0 / +1 /
    +2R, the stop goes 1 tick beyond the new protected swing (only ever tighter and below the close).
  - **CHoCH exit / BE:** a CHoCH against the trade on 5m / 15m / 1m once +0.5 / 0.75 / 1 / 1.5 / 2R: out at the next open, or
    the stop to entry + 1.25 (a BE version at +1R or more is the live rule already).
  - **Higher timeframe:** the 1h / 15m trend at the fill: skip against / only with / 1.5x with and 0.5x against.
- **Money and judging (LIT rule):** the LIT size rule (as `lit_live`) and the live eval path (two_week, room 0.8, no weekly
  loss stop, $1.90, a new eval after a pass, a fail or 10 sessions) with fresh-eval odds on every session and a 2,000-path
  Monte Carlo (`tools/lit_rev_exit.eval_path`). Picked on 2026 H1, checked on H2; 2021-25 is a reference only. A change has
  to make more money than live in H1 AND H2 on the LIT size rule AND on the eval path, not raise 2-week fails, and keep 2-4
  trades a week.
- **ATLAS** (`tools/structure_atlas.py`): the members' stored research trades (EMA, MACD, S/R; 1,395 trades), re-managed by
  the difference method: one small executor (`engine/advisor.walk`: stop before target, the member's breakeven / 15-minute
  check, flat 15:55) walks each trade twice on the same bars (true 1m in 2026, 5m otherwise), base and with the rule; the
  stored points get the difference when the rule fired. Its base matches the stored points within 0.5 pt on 96% of the
  trades. Scored by `tools/atlas.score` (the real account-B rules on the Builder 25K: need sizing, LIT first, no hedge, LIT's
  armed setups block, max 2 a day, $600 soft daily loss). ATLAS is judged on 2026 AND 2021-25, plus a per-trade check (total
  R at a fixed risk not lower in H1 and H2).
- **All variants:** `research/lit/structure_results.json` (101; 9 of them equal live: a breakeven at +1R or later is the live rule), `research/second/structure_atlas.json` (24).

## Results: LIT (selected; all variants in the JSON)

**LIT size rule and live eval path** (trades a week 3.12 H1 / 2.56 H2 in every row except the 1h skips):

| Idea | H1 net (chg) | H2 net (chg) | 2021-25 ref (chg) | Trades/wk H1 / H2 | Eval H1 net | Eval H2 net | Eval 2-wk pass/fail H1 | H2 | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Live (no change) | +$33,901 (PF 4.98) | +$9,919 (PF 2.91) | +$1,265 (PF 1.01) | 3.12 / 2.56 | +$34,822 | +$16,264 | 57.1 / 1.7 | 52.2 / 5.8 | stays |
| Target = nearer of the VIX band and the next LIT pool >= 1.5R | -17,399 | -979 | +7,339 | 3.12 / 2.56 | -14,407 | -4,659 | 46.2 / 1.7 | 46.4 / 8.7 | reject |
| Target = the next LIT pool >= 3R instead of the band | -11,264 | +226 | +17,727 | 3.12 / 2.56 | +4,412 | -1,356 | 48.7 / 1.7 | 40.6 / 0.0 | reject |
| Target capped at the next unbroken 1h swing >= 3R | -6,636 | -965 | +8,365 | 3.12 / 2.56 | -5,233 | -5,313 | 50.4 / 1.7 | 49.3 / 1.4 | reject |
| Half off at the first LIT pool >= 1R, rest to the band | -9,481 | -1,388 | +5,709 | 3.12 / 2.56 | -16,570 | -3,269 | 25.2 / 1.7 | 34.8 / 0.0 | reject |
| Half off at the first LIT pool >= 2R | -6,712 | -394 | +4,313 | 3.12 / 2.56 | -16,890 | -4,600 | 36.1 / 2.5 | 42.0 / 0.0 | reject |
| After a 5m BOS in favour (+1R): stop to the 5m protected swing | -6,305 | +128 | +2,616 | 3.12 / 2.56 | -10,779 | +4,629 | 43.7 / 2.5 | 53.6 / 5.8 | reject |
| **After a 15m break in favour (+1R): stop to the 15m protected swing** | **+467** | **+13** | -1,800 | 3.12 / 2.56 | **+1,019** | **+3,762** | 57.1 / **2.5** | 53.6 / 5.8 | **promising** |
| After a 1m BOS in favour (+1R): stop to the 1m protected swing | -8,888 | -4,052 | +2,616 | 3.12 / 2.56 | -16,338 | -7,952 | 27.7 / 1.7 | 37.7 / 5.8 | reject |
| After any 5m BOS in favour: stop to the 5m protected swing | -5,865 | -720 | -3,483 | 3.12 / 2.56 | -10,633 | -1,483 | 44.5 / 2.5 | 52.2 / 5.8 | reject |
| Breakeven on a 5m CHoCH against after +0.5R | -5,913 | -3,345 | -15,532 | 3.12 / 2.56 | -2,964 | -9,161 | 56.3 / 1.7 | 44.9 / 7.2 | reject |
| Breakeven on a 5m CHoCH against after +0.75R (the owner's idea) | -1,442 | -775 | -6,420 | 3.12 / 2.56 | -1,063 | -4,157 | 57.1 / 1.7 | 53.6 / 0.0 | reject |
| Breakeven on a 1m CHoCH against after +0.75R | -653 | -1,886 | -6,420 | 3.12 / 2.56 | +33 | -4,309 | 58.0 / 1.7 | 52.2 / 0.0 | reject |
| Exit on a 5m CHoCH against after +1R | -5,215 | -2,150 | +4,050 | 3.12 / 2.56 | -15,084 | -37 | 42.9 / 2.5 | 49.3 / 5.8 | reject |
| Exit on a 15m CHoCH against after +1R | +59 | -1,301 | +1,842 | 3.12 / 2.56 | +782 | -1,128 | 57.1 / 1.7 | 50.7 / 5.8 | reject |
| Exit on a 1m CHoCH against after +1R | -15,192 | -7,737 | +4,197 | 3.12 / 2.56 | -18,145 | -12,061 | 16.0 / 2.5 | 14.5 / 7.2 | reject |
| Skip when the 1h trend is against the trade | -14,968 | -7,479 | +736 | 1.09 / 1.03 | -15,826 | -10,584 | 34.5 / 0.0 | 34.8 / 0.0 | reject |
| Skip when the 1h AND 15m trends are against | -9,534 | -7,771 | +9,710 | 1.37 / 1.47 | -10,695 | -10,276 | 47.9 / 0.0 | 42.0 / 0.0 | reject |
| 1.5x with the 1h trend, 0.5x against (LIT size only) | +2,278 | -2,478 | +778 | 3.12 / 2.56 | - | - | - | - | reject |

**"Not a fixed RR": let the winner run past the target on the 15m structure** (`lit_struct_runner_075_15m`,
`lit_struct_runner_09_15m`): when the VIX target (or the 8R bank) is reached, nothing is taken; the stop locks 75% (or 90%)
of the target distance and then trails to each new 15m protected swing; out on that stop or at 15:55.

| Runner | LIT size H1 | H2 | 2021-25 ref | Eval path H1 | H2 | Eval 2-wk pass/fail H1 | H2 | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Live (bank at the target) | +$33,901 | +$9,919 | +$1,265 | +$34,822 | +$16,264 | 57.1 / 1.7 | 52.2 / 5.8 | stays |
| Lock 75%, 15m trail | **+$13,600** | **+$956** | -$10,278 | -$12,192 | +$5,479 | 36.1 / 1.7 | 44.9 / 5.8 | reject |
| Lock 90%, 15m trail | +$10,719 | +$1,055 | -$2,425 | -$13,614 | -$1,869 | 43.7 / 1.7 | 44.9 / 5.8 | reject |
| Lock 75%, bank half at the target | +$6,800 | +$478 | -$5,139 | -$15,272 | -$732 | 36.1 / 1.7 | 46.4 / 5.8 | reject |

- On the LIT size rule it makes more in both halves of 2026, but the H1 gain is two trend days: 2026-04-17 (+$6,226 ->
  +$19,699, the move ran 29.7R) and 2026-03-18 (+$4,649 -> +$10,825). On 18 of the 25 target trades it gives back up to a
  quarter of the target (-$2 to -$1,310 each). Without those two days H1 is about -$6,000.
- On the eval path it is clearly worse (2-week pass 57.1% -> 36.1% H1, 52.2% -> 44.9% H2): "one winner passes" needs the
  target banked the moment it trades.
- On a funded account it would also make the big days that MFFU's 50% best-day consistency rule punishes. Rejected; the
  live target stays (Z14).

**The lead in full** (`lit_struct_strail_15m_k1_any`):

| | LIT size H1 | LIT size H2 | Eval path H1 | Eval path H2 |
|---|---:|---:|---:|---:|
| Live: PF / net / $ a month | 4.98 / +$33,901 / $5,562 | 2.91 / +$9,919 / $2,670 | 3.51 / +$34,822 / $5,713 | 2.51 / +$16,264 / $4,379 |
| 15m structure trail | 5.03 / +$34,368 / $5,638 | 2.91 / +$9,932 / $2,674 | 3.54 / +$35,841 / $5,880 | 2.89 / +$20,026 / $5,392 |
| Max DD live -> trail | -$2,196 -> -$2,067 | -$1,396 -> -$1,396 | -$3,915 -> -$3,915 | -$2,436 -> -$2,436 |
| 2-week pass / fail (p10 / f10) | 36.7 / 1.6 -> 37.5 / 1.6 | 23.1 / 0.0 -> 23.1 / 0.0 | 57.1 / 1.7 -> 57.1 / 2.5 | 52.2 / 5.8 -> 53.6 / 5.8 |
| Monte Carlo 2-week pass / fail | | | 53.4 / 3.5 -> 53.9 / 3.5 | 56.6 / 2.4 -> 57.6 / 2.6 |
| dec10 / p15 / f15 / slow pass / median | | | 58.8 / 64.9 / 1.8 / 18.7 / 6 -> 59.6 / 64.9 / 2.6 / 20.4 / 6 | 58.0 / 53.1 / 6.2 / 25.8 / 5 -> 59.4 / 54.7 / 6.2 / 24.2 / 5 |

It fails one gate (2-week fails H1 1.7% -> 2.5%: one more of 119 fresh-eval starts fails) and changes 7 trades in 2026
(6 better by +$3 to +$192, 1 worse by -$124). 2021-25 reference -$1,800. Verdict: **promising, not an adopt-candidate.**

## Results: ATLAS (account B, Builder 25K; changes vs ATLAS today)

| Idea | H1 net | H2 net | 2025 | 2021-24 | 2-wk pass / dead H1 | H2 | p60 H1 / H2 | Funded 3 mo H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ATLAS today | +$6,485 ($1,064/mo) | +$4,434 ($1,194/mo) | -$2,152 (-$175/mo) | +$2,457 ($63/mo) | 65.5 / 0.8 | 43.5 / 0.0 | 92.2 / 100.0 | $1,842 / $1,349 | 2.11 / 1.6 | today |
| Exit on a 5m CHoCH against after +1R | -3,277 | -1,932 | -2,284 | -3,640 | 52.1 / 0.8 | 39.1 / 0.0 | 91.4 / 100.0 | $1,076 / $550 | 1.17 / 1.67 | reject |
| BE on a 5m CHoCH against after +0.5R | -533 | -3,151 | -451 | -7,044 | 60.5 / 0.0 | 43.5 / 0.0 | 93.0 / 100.0 | $1,347 / $400 | 2.46 / 1.54 | reject |
| Exit on a 15m CHoCH against after +1R | -1,089 | -1,766 | -758 | +1,106 | 57.1 / 0.8 | 36.2 / 0.0 | 92.2 / 100.0 | $1,327 / $400 | 2.11 / 1.6 | reject |
| Trail to the 5m protected swing (+1R) | -3,819 | -1,754 | -1,944 | -4,508 | 49.6 / 0.0 | 46.4 / 0.0 | 92.2 / 100.0 | $887 / $1,130 | 1.29 / 1.67 | reject |
| Trail to the 15m protected swing (+1R) | -1,134 | -1,936 | +899 | +1,179 | 59.7 / 0.8 | 43.5 / 0.0 | 91.4 / 100.0 | $1,369 / $550 | 2.11 / 1.67 | reject |
| Stop at the 5m protected swing (when wider, <= 2.5x) | -88 | -23 | +159 | -700 | 68.9 / 0.8 | 43.5 / 0.0 | 93.8 / 100.0 | $1,883 / $1,350 | 1.99 / 1.47 | reject |
| Stop at the 15m protected swing (<= 2x) | -884 | +363 | +3,089 | -1,558 | 68.1 / 0.8 | 43.5 / 0.0 | 89.1 / 100.0 | $1,894 / $1,349 | 2.07 / 1.6 | reject |
| Stop at the 15m protected swing (<= 3x) | +3,619 | +377 | +3,323 | +1,022 | 65.5 / 0.8 | 43.5 / 0.0 | 89.1 / 100.0 | $2,072 / $1,349 | 2.11 / 1.6 | reject (trades worse in R) |
| Stop at the 1h protected swing (<= 3x) | +2,618 | +10 | +515 | +2,378 | 54.6 / 0.8 | 43.5 / 0.0 | 95.3 / 100.0 | $1,776 / $1,349 | 2.62 / 1.6 | reject |

- The 15m protected-swing stop at <= 2.5x / 3x / 4x all pass the account gates, the <= 1.5x / 2x versions lose in H1. At a
  fixed $ risk per trade (size follows the stop, no account rules) the same trades are worse in every span (total R H1 123.4
  -> 122.8, H2 31.6 -> 29.7, 2025 53.0 -> 46.2, 2021-24 87.3 -> 84.2). The account gain comes from how the need sizing and the
  account rules play out on a few trades (2026-04-22 EMA: a -1R stop became a +2.5R target with the wider stop), and the
  eventual pass rate drops (p60 H1 92.2% -> 89.1%). Not a better way to trade: rejected.
- Every ATLAS exit and trail idea loses money in 2026 H1 and H2 and needs more sessions to pass.

## What structure says about each strategy's own trades (descriptive, not a rule)

The structure trend at the entry vs each strategy's research trades (`python -X utf8 tools/structure_manage.py split`,
`research/lit/structure_trend_split.json`). These numbers are what the Live View's per-strategy structure notes quote.

| Strategy, state at the entry | Trades | $ a trade | R a trade | Win % |
|---|---:|---:|---:|---:|
| LIT 2026, with the 1h trend | 44 | $492 | 1.02 | 57 |
| LIT 2026, against the 1h trend | 76 | $292 | 0.72 | 55 |
| LIT 2021-25, with / against the 1h trend | 178 / 333 | $13 / -$3 | 0.10 / 0.00 | 52 / 55 |
| ATLAS members 2026 ($500 a trade), 15m + 1h both with the trade | 35 | $23 | 0.05 | 54 |
| ATLAS 2026, mixed (15m against the 1h: a pullback) / both against | 86 / 54 | $561 / $526 | 1.12 / 1.05 | 59 / 50 |
| ATLAS 2021-25, both with / mixed / both against | 263 / 508 / 449 | -$25 / $72 / $89 | -0.05 / 0.14 / 0.18 | 38 / 39 / 34 |
| BLITZ 2026, with / against the 5m trend | 262 / 68 | - | 0.16 / 0.13 | 54 / 60 |

- LIT trades with the 1h trend pay more per trade, but the ones against it still pay: skipping them is the -$22k row above.
- ATLAS pays least when the 15m and 1h structure already agree with its trade (late in the move). In 2026 those 35 trades
  still made $800, so a filter would cost money in 2026: context only.
- BLITZ: no real difference.

## The discretion advisor (live from now on)

- `engine/advisor.py` runs the six structure rules on every finished trade (PC: `narrator.tick` after each poll, once a new
  1m bar closed, on the bot's own NinjaTrader 1m store; cloud: `live_learning.cloud_hook` on the paper ledgers and the
  PC's pushed bars). It never changes an order.
- It records what each rule would have done and why ("5m CHoCH down through 29,950.25 after +0.95R: stop to entry +
  1.25"), then the $ difference vs what really happened, and keeps a tally per strategy and rule (`logs/advisor/`, gitignored;
  cloud state "advisor"). The Learning page shows "would have saved / cost $X over N trades" cards with the research numbers.
- **Its backtest equals this research.** On the 119 LIT trades of 2026 with 1m bars, at the LIT size (`python -X utf8
  tools/structure_manage.py advisor`, `research/lit/advisor_backtest.json`):

| Advisor rule | Advisor H1 / H2 | Research H1 / H2 (variant) | Tally text on 2026 |
|---|---:|---:|---|
| be_choch (BE on a 5m CHoCH, +0.75R) | -$1,449 / -$775 | -$1,442 / -$775 (choch_5m_k0.75_be) | would have cost $2,224 over 119 trades (fired on 7) |
| exit_choch (exit on a 5m CHoCH, +1R) | -$5,215 / -$2,153 | -$5,215 / -$2,150 (choch_5m_k1.0_exit) | would have cost $7,368 (fired on 32) |
| trail_15m (15m protected swing, +1R) | +$466 / +$13 | +$467 / +$13 (strail_15m_k1.0_any) | would have saved $480 (fired on 17) |
| trail_5m (5m protected swing, +1R) | -$6,305 / +$129 | -$6,305 / +$128 (strail_5m_k1.0_bos) | would have cost $6,177 (fired on 31) |
| tp_pool (first pool >= 1.5R) | -$14,616 / -$987 | -$16,695 / -$1,305 (tgt_cap_lit1h_r1.5, other pool set) | would have cost $15,603 (fired on 27) |
| skip_htf (1h trend against) | -$14,808 / -$7,351 | -$14,968 / -$7,479 (htf_1h_skip_against) | would have cost $22,159 (fired on 76) |

The live tally starts from zero; a rule that keeps saving money on new trades goes back to research before anything changes.

## What would change this

- 20+ new live / paper trades where the 15m structure trail fires and the tally stays positive, then a rerun of this study
  with the extra months: if it then passes the eval gate in both halves, it becomes an adopt-candidate for the owner.
- A new idea, not a new threshold: the 2026 sample has only 3-7 trades a half where any of these rules act.
