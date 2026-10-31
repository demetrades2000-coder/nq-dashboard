## In one minute

- **Robust to bad data and costs.** The strategies keep most of their 2026 money under each of these stresses:
  - noisy prices (+/-1 or +/-2 ticks on every bar, 50 copies);
  - 0-3 extra ticks of slippage on every market fill;
  - 10-20% of the trades missed.

  Account B's 2-week pass rate on a Builder 25K stays within about 8 points of today, and nothing fails outright.
- **Weak spot: entering late.** With every entry one 5-minute bar late:
  - EMA keeps 56% of its H1 money and 4% of its H2 money;
  - S/R keeps 28% of its H1 money and loses money in H2;
  - MACD keeps 75% / 68%;
  - account B's 2-week pass drops from 68.9 to 49.6 (H1) and from 43.5 to 31.9 (H2).

  The bot already guards against this. It enters about 2 s after the open, and a probe that comes more than 45 s late is
  skipped. A skip is a missed trade, and missed trades are fine. Keep NinjaTrader and the PC on time.
- **Go / no-go scorecard: built, on both dashboards and in the cloud README.** Go live only with **20+ finished paper
  trades at or above the expected p10**. Below the p5 means **don't go live**. Today: "collecting (0/20)".
- **Bad-market brake: nothing worth switching on.**
  - The rules that save dead evals in 2021-25 also lose passes.
  - Counted in real money, the best rule earns at most +$1,600 over 5 years, and only on the 50K.
  - The cheap brake is the scorecard plus the "stuck" rule already in place: stop, buy a new $63 eval.
- **Verdict:** go ahead with paper / Sim on account B. Buy the Builder 25K only when the scorecard says
  **"ready: 20+ trades inside the range"**.

## 1. Stress test (tools/second_robust.py, research/second/robust.json, runs sb_robust_*)

How it was run:
- Each strategy is re-run by its **own research code** (tools/second_ema.py, second_md.py, second_sr.py) on changed bars.
  First check: the clean re-run gives exactly the stored trades (EMA 636, MACD 387, S/R 372).
- Account B uses tools/second_account_b.py: the need size (engine/account_b.qty), no hedge against LIT, the stuck rule,
  and a fresh eval every session. Its base reproduces second-account-b.md exactly: 25K 68.9/0.0 and 43.5/0.0.
- Size: $500 risk a trade for each strategy alone.
- Copies: 50 for noise and "all at once", 200 random draws for slippage and misses.
- Each figure is the mean over the copies.

**$ kept at $500 risk (% of the stored backtest; PF in brackets)**

| Test | EMA H1 / H2 | MACD H1 / H2 | S/R H1 / H2 | EMA / MACD / S/R 2025 | 2021-24 |
|---|---|---|---|---|---|
| Base $ | +$19,838 (2.72) / +$8,136 (3.10) | +$22,087 (3.78) / +$2,569 (1.75) | +$12,213 (3.72) / +$2,914 (1.89) | +$6.2k / +$8.2k / +$5.0k | +$5.5k / +$12.1k / +$4.8k |
| Noise +/-1 tick | 104% / 99% | 87% / 91% | 101% / 98% | 87% / 126% / 107% | 54% / 86% / 62% |
| Noise +/-2 ticks | 104% / 92% | 80% / 89% | 101% / 96% | 76% / 135% / 95% | 33% / 68% / 39% |
| Slippage 0-3 ticks | 97% / 97% | 99% / 96% | 99% / 97% | 65% / 90% / 88% | -46% / 69% / 48% |
| 10% missed | 91% / 88% | 89% / 91% | 90% / 89% | 93% / 88% / 91% | 92% / 87% / 93% |
| 20% missed | 81% / 81% | 79% / 79% | 80% / 82% | 89% / 80% / 83% | 89% / 81% / 92% |
| **1 bar late** | **56% / 4%** | 75% / 68% | **28% / -58%** | -143% / 155% / 22% | -227% / 16% / -116% |
| 2 bars late | 11% / 21% | 37% / 40% | 10% / 48% | 339% / -16% / -31% | -72% / 41% / 2% |
| All at once | 45% / 3% | 57% / 7% | 23% / -61% | -140% / 154% / 0% | -333% / -29% / -191% |

"All at once" = noise 1 + slip 0-3 + miss 10% + 1 bar late.

**Account B on the Builder 25K (the pick)**

2-week pass / fail + stuck, and the eval-path $ (PF):

| Test | 2026 H1 | 2026 H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| Base | 68.9 / 0.0+7.6, +$19,722 (2.97) | 43.5 / 0.0+0.0, +$5,391 (2.36) | 28.9 / 0.0+34.9, +$1,020 | 23.9 / 0.0+38.9, +$8,990 |
| Noise +/-1 | 67.9 / 0.0+7.3, +$18,180 (2.88) | 43.3 / 0.0+1.4, +$5,660 (2.35) | 29.7 / 0+32.1, +$4,014 | 24.1 / 0+39.5, +$7,409 |
| Noise +/-2 | 66.8 / 0.0+8.1, +$17,411 (2.82) | 42.5 / 0.0+1.8, +$5,265 (2.23) | 29.7 / 0+31.1, +$3,108 | 23.8 / 0+40.0, +$6,429 |
| Slippage 0-3 | 67.8 / 0.2+7.8, +$18,666 (2.75) | 43.5 / 0.0+2.3, +$5,563 (2.25) | 28.5 / 0.1+36.4, +$2,659 | 22.6 / 0.1+43.9, +$485 |
| 10% missed | 64.8 / 0.0+5.6, +$16,332 (2.82) | 41.8 / 0.0+0.3, +$4,864 (2.37) | 27.5 / 0+29.6, +$1,883 | 22.9 / 0+34.4, +$6,290 |
| 20% missed | 61.1 / 0.0+4.2, +$15,047 (2.91) | 40.6 / 0.0+0.3, +$4,607 (2.54) | 26.2 / 0+24.1, +$2,211 | 22.3 / 0+29.2, +$5,842 |
| **1 bar late** | **49.6 / 0.0+5.9, +$5,028 (1.63)** | **31.9 / 0.0+11.6, +$33 (1.01)** | 19.7 / 0+35.3, +$3,208 | 22.9 / 0+44.3, -$4,758 |
| 2 bars late | 20.2 / 0.0+13.4, +$621 | 33.3 / 0.0+11.6, +$101 | 29.7 / 0+26.1, +$6,444 | 24.1 / 0+41.4, +$1,620 |
| All at once | 43.0 / 0.0+7.7, +$5,289 (1.70) | 23.2 / 0.0+8.1, -$214 (0.92) | 21.3 / 0.1+29.0, +$3,652 | 19.9 / 0.1+42.9, -$10,545 |

**On the Builder 50K:**
- Noise +/-1 gives 70.3/3.3 (H1) and 53.0/3.0 (H2), path +$37.1k / +$7.1k.
- One bar late gives 48.7/1.7 and 30.4/0.0, +$15.7k / +$6.3k.
- All at once gives 44.7/2.9 and 21.7/0.0, +$10.9k / -$0.4k.

**What it means**
- **Prices, costs and misses barely matter in 2026.** The 2026 edge does not hang on exact ticks.
  - The 2021-24 money is thin to begin with (PF 1.05-1.12). It is the first thing noise and slippage eat: EMA keeps 33-54%
    and goes negative with 0-3 ticks of slippage.
  - That is the same old story: these are 2026 bets.
- **Timing matters.** EMA and S/R enter at the open right after a reversal close, and most of the edge is in that first
  bar. MACD survives a late entry best.
  - The live bot already works this way: market order about 2 s after the 5m open (`engine/account_b.py`,
    `LiveBot._second_route_tick`), probes no later than 45 s after the open (`MAX_AGE_S`), and checks the fill once the
    fill bar has closed.
  - Practical rule: if the PC or NinjaTrader lags, the trade is skipped, never chased.

## 2. Go / no-go scorecard (engine/second_scorecard.py, research/second/scorecard.json)

**The bands**

Each strategy's 2026 H2 trades (the untouched check half) are resampled 4,000 times for 1 to 40 trades. This gives the
expected range of cumulative R, win rate, PF and $ (at $500 risk, the paper ledger's size). The same is done on 2025 as
the "bad-year" band. Account B pools the three strategies.

Rebuild: `python -X utf8 -m engine.second_scorecard build`, only when the research trades change. It is seeded, so the
same input gives the same file.

**The rule (on the finished paper trades)**

| Paper trades | Result | Verdict |
|---|---|---|
| under 5 | - | collecting (n/20) |
| 5 or more | cumulative R under the expected p5 | below range: don't go live |
| 5-19 (or 20+ between p5 and p10) | inside | on track (pXX), XX = where it sits in the expected band |
| 20 or more | at or above the expected p10 | ready: 20+ trades inside the range |

- Account B is also "below range" when any one of its strategies is below its own range.
- "looks like 2025 so far" is flagged when the result is under the bad-year median. A strategy that only matches its bad
  year is not a reason to buy an account.

**After 20 trades** (cumulative R; $ at $500 risk):

| | Pool H2 / 2025 | Expected p5 / p10 / median / p90 | Expected $ p10-p90 | 2025-like median |
|---|---|---|---|---|
| EMA | 26 / 130 | -1.4 / +1.4 / +12.5 / +25.7R | +$734 to +$12,326 | +1.3R |
| MACD | 15 / 72 | -5.1 / -2.6 / +7.7 / +20.7R | -$1,453 to +$8,947 | +4.2R |
| S/R | 16 / 71 | -2.0 / +0.2 / +8.2 / +16.5R | -$99 to +$7,183 | +3.0R |
| Account B (pooled) | 57 / 273 | -2.7 / -0.1 / +9.7 / +22.0R | -$184 to +$10,071 | +2.4R |

**Honest limit:** MACD and S/R have only 15-16 trades in H2, so their bands are wide. The bands only tell an obvious
failure from a normal start. They cannot prove an edge.

**Where it shows**
- data.json `second.scorecard` and per strategy `scorecard`: `engine/second.dashboard_block`, so the phone (via data.json)
  and the PC (`/api/next/second`) get the same numbers.
- The phone's System > Second strategies page and the PC's Data > Second strategies page show a "Scorecard" card (account
  B) and a "Go / no-go" box on every strategy (`secondcore.js` v4, both copies byte-identical).
- The cloud README section "Second strategies (paper)" has a "Go / no-go scorecard" table.
- The cloud uses its frozen paper ledger plus any finished trades from the PC heartbeat it does not have yet.
- The PC page, when the bot runs, judges the trades of its live window (the last weeks, replayed). The page says which
  source it used.

**Test:** `python -X utf8 -m tests.test_second_scorecard`, 27/27.

## 3. Bad-market brake (tools/second_brake.py, research/second/brake.json, runs sb_brake_*)

**Rules tested** (57 per plan). Each looks back only, at the three strategies' own finished trades, exactly what the live
bot's `engine/second.run` has:
- size x0.5 after 2-5 losses in a row;
- size x0.5, x0.25 or no trade while the last 5-20 trades sum to 0R or less;
- no trade or half size for the rest of the week after -2 / -3 / -4R that week;
- half size when the prior day's VXN / VIX is outside a band;
- a softer "stuck" rule: keep the eval alive and skip only the trades whose 1-micro stop does not fit.

**How they were judged**
- Picked on 2025 + 2021-24, checked on 2026 H1 / H2.
- Real money = passes x funded payouts in 3 months - evals bought x price. Eval profit itself is never paid out.

**Builder 25K, the rules that stop the most dead evals**

| Brake | 2025 2-wk pass / dead | 2021-24 pass / dead | 2026 H1 / H2 pass | Real money 2021-25 vs base |
|---|---|---|---|---|
| Base | 28.9 / 34.9 | 23.9 / 38.9 | 68.9 / 43.5 | 0 |
| Half size when VXN < 20 (`vxn20-99`) | 19.3 / 20.1 | 19.5 / 23.4 | 68.9 / 43.5 | about -$750 |
| Quarter size after the last 8 sum <= 0R (`sum8_q`) | 23.3 / 13.3 | 16.3 / 14.4 | 67.2 / 43.5 | about -$1,500 |
| Half size after the last 10 sum <= 0R (`sum10`) | 23.7 / 18.5 | 19.6 / 19.1 | 68.1 / 40.6 | about -$1,300 |
| Half after 3 losses in a row (`streak3`) | 24.1 / 33.7 | 19.4 / 33.9 | 70.6 / 43.5 | about -$1,200 |
| Soft stuck rule (`fit`) | 28.9 / 12.9 | 23.9 / 8.2 | 69.7 / 43.5 | evals linger open: fewer passes, the path loses |
| Best on real money (`vix0-35`) | unchanged | unchanged | unchanged | +$161 |

**Builder 50K:** the best was "half size for the rest of the week after -3R" (`wk3_half`), at +$1,567 over 5 years. The
VXN and sum rules again trade passes for fewer dead evals (`sum15`: dead -18 points, real money +$201).

**Why none:**
- A brake turns a dead eval into one that stays open and passes later or not at all.
- In the failure years it saves a few $63 fees, but it also loses passes, and passes are where the money is.
- Every rule that clearly cut the dead evals cut the 2-week pass rate by 5-15 points. That breaks the 2-week goal.
- The rules that leave the pass rate alone change less than $1,600 in 5 years. That is noise.
- So nothing is built in `engine/account_b.py`, and `second_model.json` is unchanged.

**What protects account B instead:**
1. the scorecard: don't buy until 20 paper trades look like 2026;
2. the stuck rule already in place: under $100 of room the bot stops, and you buy a new $63 eval.

## Commands

- `python -X utf8 tools/second_robust.py`: about 20 min on 4 cores, writes research/second/robust.json and runs
  sb_robust_*. Add `--quick` for a check.
- `python -X utf8 tools/second_brake.py save`: about 5 min, writes research/second/brake.json and runs sb_brake_*.
- `python -X utf8 -m engine.second_scorecard build`: the bands, in about 5 s.
- Both research tools need `research/runs/_cache/second_mix_units.pkl` (`python -X utf8 tools/second_mix.py units`,
  about 20 s).
- Paper research only: no live_model*.json, no second_model.json, and no engine default is changed.
