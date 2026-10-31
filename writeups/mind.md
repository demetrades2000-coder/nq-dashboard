## In one minute

- **What was asked:** a brain that thinks for itself: remembers similar setups, reads the day, makes a plan before each
  window, reviews every trade, and researches its own ideas, without ever changing a rule, a size or an order by itself.
- **What was built (read-only, no paid service, no external AI):** `engine/mind.py`, its memory and calibration
  (`tools/mind_build.py` -> `research/mind/`), wired into the Live View, the phone, the heartbeat, the Holodeck, the
  narrator (kind "brain", no phone push by default) and `GET /api/next/mind`.
- **Honest result 1 - similar setups do not predict.** Fit on 2026 H1, checked on 2026 H2 and 2021-25, the k nearest past
  setups did not tell a better trade from a worse one for any bot. The dashboards say so and show the numbers as context
  ("Context only"), confidence always "low".
- **Honest result 2 - the trend-day odds are weak but real.** AUC 0.66 (2026 H2) and 0.63 (2021-25), where 0.5 is a coin
  flip. As a yes / no call it is no better than "not a trend day"; as odds it helps (>= 60% odds: 51% trend days vs 33%).
- **Honest result 3 - Mind's own ideas all failed their test tonight.** 9 patterns noticed, 22 rules tested (with 5 standing questions), 0 candidates.
- **Nothing changes in how the bots trade.** A candidate would go to the dashboard with the exact change for the owner.

## 1. The memory (similar setups)

Every historical setup of each bot, with the features the PC bot can compute at the deciding bar:

| Bot | Setups | Source | Setup features (plus the shared context) |
|---|---|---|---|
| Zlarior (LIT) | 631 (2021-25 5m: 511, 2026 1m: 120) | run `lit_live` settings, `tools/lit_final.run` on `live_model.json` "lit" | sweep depth (ATR), displacement (ATR), inducements, stop (ATR), R to the VIX band, swept level family |
| ATLAS | 1,129 (2021-11 -> 2026-10) | run `atlas_funded_live` | member (EMA / MACD / S/R), stop (ATR) |
| BLITZ | 330 (2026 only, it needs 1m bars) | `research/scalp/na_best_trades.json` | first-hour range vs its 14-day average, the trend-day odds at the signal (from 10:30) |

Shared context (all bots): minutes since the 18:00 open, killzone, VIX (prior close, CBOE file), 15m and 1h structure trend
vs the trade (engine/structure, closed bars), prior-day 09:30-16:00 range vs its 14-day average, where price sits in the
day's range, 5m ATR vs its 7-day median, side. Data: TradingView CME NQ1! 5m export only.

**Same numbers live and in research:** the live bot builds the same `Hist` from a 45-day window (the export's tail, its
NinjaTrader archive, its own bars). The test rebuilds 9 stored trades (2024 and 2026) from a 45-day window and gets the
stored features exactly (tests/test_mind.py).

**How it was judged (no peeking):** each 2026 H2 and 2021-25 setup was predicted from its 15-20 nearest 2026 H1 setups
(never its own day), then compared with what really happened:

| Bot | Check span | n | Rank corr. predicted vs real R | Top third minus bottom third | p (shuffled) | Win-rate Brier vs base rate |
|---|---|---|---|---|---|---|
| Zlarior | 2026 H2 | 40 | +0.00 | -0.30R | 0.62 | 0.281 vs 0.258 (worse) |
| Zlarior | 2021-25 | 511 | +0.03 | +0.25R | 0.06 | 0.262 vs 0.251 (worse) |
| ATLAS | 2026 H2 | 45 | -0.25 | -0.30R | 0.61 | 0.256 vs 0.247 (worse) |
| ATLAS | 2021-25 | 983 | -0.05 | +0.13R | 0.24 | 0.256 vs 0.260 |
| BLITZ | 2026 H2 | 109 | -0.05 | -0.16R | 0.79 | 0.252 vs 0.248 (worse) |

Rule: similarity counts as predictive only if every checked span has a positive rank correlation, a positive top-minus-
bottom spread and p < 0.10. **No bot passes.** So the block carries `"valid": false`, `"conf": "low"` and the sentence
"Context only: out of sample, similar setups did not predict the outcome".

The checker itself works: on a synthetic store where R follows one feature it says "valid", on noise it says "not valid"
(tests/test_mind.py).

**A lead that did not hold:** the other way round, years of memory and a later period as the check:

| Bot | 2026 H1 (fit 2021-25): top / bottom third (p) | 2026 H2 (fit 2021-25) | 2025 (fit 2021-24) |
|---|---|---|---|
| ATLAS | +1.71R / +0.54R (0.03) | +1.80R / +0.24R (0.03) | +0.23R / +0.24R (0.50) |
| Zlarior | +1.40R / +0.38R (0.09) | +1.72R / +0.62R (0.13) | +0.12R / -0.00R (0.34) |

With 5 years as memory ATLAS similarity separated both 2026 halves, but the same check one year earlier (2021-24 as memory,
2025 as the check) shows nothing: the 2026 separation is more likely "2026 looked like the good years" than a skill of the
memory. So: not predictive anywhere, context only. The memory keeps growing with every live / paper trade
(`logs/mind/<bot>_live.jsonl`) and `python -X utf8 tools/mind_build.py` re-runs all three checks.

## 2. Regime and trend-day odds

- **Regime** at every closed 5m bar: trend = 15m and 1h structure (both up = up, both down = down, else range);
  volatility = 5m ATR vs its usual at the same time of day (10 sessions, +/- 30 min) and VIX (>= 1.35x or VIX >= 25 = high,
  <= 0.75x with VIX < 16 = quiet). A plain sentence says why (last 1h BOS / CHoCH, ATR, VIX).
- **Trend day** (label): the 09:30-16:00 session opens in one quarter of its range and closes in the opposite quarter
  (30% of 2026 H1 days, 26% of H2, 33% of 2021-25).
- **Model at 10:30 ET:** logistic regression on six numbers known at 10:30 (first-hour range vs average, how directional the
  first hour was, where price sits vs the overnight range, the gap vs yesterday's range, yesterday's range, VIX). Fit on
  2026 H1 (127 days). No look-ahead: the features from bars cut at 10:30 equal those from the full file (test).

| Span | Days | Base rate | AUC | Brier (model / base rate) | Right at 50% (model / always "no") | Odds >= 60%: trend days | Odds < 20%: trend days |
|---|---|---|---|---|---|---|---|
| 2026 H1 (fit) | 127 | 30% | 0.73 | 0.179 / 0.210 | 74% / 70% | 83% (n 6) | 14% (n 42) |
| 2026 H2 | 78 | 26% | 0.66 | 0.179 / 0.193 | 77% / 74% | none that high | 13% (n 24) |
| 2021-25 | 1,070 | 33% | 0.63 | 0.217 / 0.220 | 66% / 68% | 51% (n 73) | 20% (n 366) |

The strongest input is a directional first hour (it raises the odds); a very wide first hour lowers them. Weak but real:
shown as odds with this table's numbers next to it, never as a call.

## 3. Game plans (01:45 ET Zlarior + ATLAS, 10:45 ET BLITZ)

One if-then plan per bot from today's levels and structure, e.g. (2026-10-14 replay):
"If price sweeps the NY 09:30-10 high 30,660.75 by >= 0.5 ATR and a 5m candle closes back below ~30,633.5, Zlarior looks
for a SHORT 5m CISD then the 1m CISD; stop ~80 pts; target band 30,495.31 (1.7R) -> 6 micros at today's room = about
+$1,647 / -$974. History: 332 Zlarior shorts like it won 53%, average +0.19R." plus "what would change my mind" (the 1h
protected high / low, what the 1h trend split paid, VIX / news). Micros come from the bot's own sizing math (engine/brain).
The odds / $ next to a scenario are plain history of that kind of setup (not a model). The plan is frozen once a day in
`logs/mind/plans.jsonl` and goes to the narrator (kind "brain": the phone only gets it if the owner switches that kind on).

## 4. Trade reviews

After every closed trade (Zlarior real or paper, ATLAS members, BLITZ paper): grade A-F (plan followed, the setup vs similar
setups, management vs the discretion advisor, the result), what went right / wrong, the lesson, and luck or skill. Because
similarity does not predict, luck vs skill is read from the trade's own path: a winner that went >= 0.8R against first =
luck, < 0.5R = skill; a loser that never made +0.3R = skill (the read was wrong), one that was +1R first = luck; a scratch is
mixed. Example (2026-10-14 Zlarior short, +3.80R): grade A, "luck: it went 0.9R against first - nearly stopped". Journal:
`logs/mind/reviews.jsonl` (gitignored); each reviewed trade joins the memory.

## 5. Self-research (nightly, after 16:05 ET)

A low-priority child process (nice 15 / below normal on Windows), capped at 10 minutes (tonight it took 0.2 s):
1. **Notice** where its recent losses bunch up (time, killzone, side, structure, VIX, ranges, member, trend-day odds) and
   where the money came from.
2. **Hypothesis:** half size there (size before skipping, CLAUDE.md), skip there, or half size everywhere else.
3. **Test** on the stored trades with the run library's exact re-size (P&L linear in micros, floor 1 micro): 2026 H1 =
   pick, 2026 H2 = check, 2021-25 = reference for Zlarior (the LIT rule) and a gate for ATLAS / BLITZ; 2+ trades a week;
   net $, $ a month, PF, max DD, and for Zlarior the MFFU 50K eval speed (2-week pass / fail, median pass).
4. **File** a proposal: testing / candidate / rejected. Never adopted; a candidate carries the exact change to approve.

First run (seed, `research/mind/proposals_seed.json`): 9 observations + its standing questions (Zlarior in London after 03:30 and against the 1h trend, ATLAS with the 1h trend and on low trend-day odds, BLITZ in the lunch and on low trend-day odds), 22 rules, **0 candidates**. Examples:
- "14 of the last 20 Zlarior losses came after a buildup (equal highs / lows) sweep": half size there costs 2026 H1
  -$6,097 and H2 -$1,875 (2-week pass 37% -> 29% H1, 23% -> 13% H2): those sweeps also make the money. Rejected.
- "14 of the last 17 ATLAS losses came with VIX under 15.8": half size H1 +$381, H2 -$1,636. Rejected (a fit to H1).
- "7 of the last 12 BLITZ losses came in the New York lunch": half size H1 -1,671 / H2 -383 (BLITZ $ at $150 risk a trade).
  Rejected.
- Standing question "Zlarior in London after 03:30" (the owner's kind of example): half size H1 -$6,430, H2 -$457
  (2-week pass 37% -> 23% in H1). Rejected.
- Standing question "BLITZ on days with trend-day odds under 20%": half size H1 -$209, H2 +$11. Rejected (BLITZ made
  +0.19R a trade on >= 40% days vs +0.03R under 20% in 2026, but cutting the low days does not pay on the pick half).

The observations come from the latest trades (mostly 2026 H2), the pick is always 2026 H1: an idea has to work on trades it
was not noticed on before the H2 check counts.

## Numbers that matter for the PC

- Compute: about 45-80 ms per new 5m bar in Mind's own thread (bars rebuilt, features, memory, plans, reviews; 200 ms the
  first time, when the TradingView export is read), measured with a 12-day 1m store and 400 5m bars. The poll thread only
  checks a key (pc_tick 1-3 ms) and Mind only starts 15-45 s into a minute, never on the polls right after a bar close.
  While Mind computes, a 5 ms loop on the main thread was delayed by at most 5.7 ms (p99 5.0 ms: Python's thread switch).
  Nothing in the trading poll: tests/test_poll_speed unchanged.
- Sizes: the heartbeat / phone cut stays under 12 KB (a huge synthetic block: 11.7 KB); the memory file is 280 KB.

## What is left

- More live trades in the memory; rerun `python -X utf8 tools/mind_build.py` after big rule changes (it rebuilds the store
  from the run settings, the calibration and the seed proposals in about 10 s).
- The dashboard rendering of the block (the dashboard agent; sample: tests/fixtures/mind_sample.json).
- Mind's research only tests size / skip rules on stored trades; management ideas stay with the advisor (engine/advisor.py).
