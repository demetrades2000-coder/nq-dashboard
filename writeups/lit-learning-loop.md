## In one minute

- **The order (owner, 2026-10-18):** "It should start learning from its losses and change. This is a must."
- **What was built:** a loop that really learns, but can't overfit or blow up the eval.
  1. **A journal.** Every finished LIT trade gets one record: the backtest, the cloud paper bot and the PC / NinjaTrader bot.
     Each record holds the 50 facts known at the entry, the result, how far it went for and against us, and a **loss cause**.
  2. **A Sunday review.** It looks at the last 6 months of the journal. It may only change **size knobs**, between 0.5x and
     1.25x, for groups of trades ("buckets") such as fresh trap / old trap, or London / New York.
  3. **Guardrails.** A change goes live only if it passes all six checks. At most one bucket changes a week, by at most 0.25x.
  4. **A decision log.** Every Sunday's decision, including "no change", is written down with the reason, the evidence and the
     before/after numbers. Any change can be reverted with one command.
- **What it would have learned in 2026:** by late April it had learned **"size up fresh traps, size down old traps"**:
  - Apr 12: old traps 1.0x → 0.75x;
  - Apr 19: old traps 0.75x → 0.5x;
  - Apr 26: fresh traps 1.0x → 1.25x.

  After that it changed nothing more, because nothing else passed the checks. On 2021-25 it changed nothing at all.
- **Did it make more money?** Not on both halves of 2026:

| | Trades/wk | PF | Net $ (eval path) | $/month | Max DD | Funded $ | 2-wk pass / fail | 1-mo pass / fail |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Fixed LIT, H1 | 3.12 | 4.01 | +33,305 | 5,464 | −2,513 | +37,046 | 37.5 / 3.1 | 60.2 / 6.2 |
| **Learned, H1** | 3.12 | 4.58 | **+36,862** | 6,048 | −2,513 | **+35,984** | 39.8 / 3.1 | 65.6 / 6.2 |
| Fixed LIT, H2 | 2.56 | 2.51 | +10,465 | 2,818 | −2,157 | +11,659 | 29.5 / 0.0 | 47.4 / 0.0 |
| **Learned, H2** | 2.56 | 2.61 | **+10,050** | 2,706 | −1,496 | **+11,548** | **23.1** / 0.0 | 47.4 / 0.0 |
| Fixed LIT, 2026 | 2.91 | 3.48 | +43,838 | 4,469 | −2,513 | +48,705 | 34.5 / 1.9 | 55.3 / 3.9 |
| Learned, 2026 | 2.91 | 3.75 | +43,948 | 4,480 | −2,513 | +47,533 | 33.5 / 1.9 | 58.7 / 3.9 |
| 2021-25 (reference) | 2.38 | 0.98 | −1,430 | −28 | −17,694 | +4,252 | 8.8 / 8.1 | 15.8 / 20.8 |
| Learned, 2021-25 | same: no change was made | | | | | | | |

- **Verdict: ships in OBSERVE mode.** The loop journals every trade, runs every Sunday and logs what it would change. It keeps a
  "shadow" set of knobs, so the dashboard can show what it learned. **It does not touch the size.**
  - **Why:** H1 makes more money on the eval path but less at the funded size. H2 makes a little less, and its 2-week pass rate
    drops.
  - **When it switches on:** when a replay shows both halves better. Switching on is one command:
    `python -m engine.lit_learn mode apply`.

## How the bot learns from a loss, step by step

1. **The trade finishes.** The bot writes one line to the journal:
   - **When:** the cloud writes it after the session ends, at the 16:05 run, so the "what happened after" facts cover the whole
     day. The PC writes it at the routed exit.
   - **What is in it:** the 50 facts known at the entry (the same ones as `research/writeups/lit-trade-selection.md`), plus the
     4H draw and 4H candle. Then the exit, R, $, MFE / MAE and the hindsight facts.
2. **The loss gets a cause code.** One main cause, plus every tag that matches. The rules come from
   `research/writeups/lit-losses.md`:

| Code | Means | 2026 losses (main cause) | $ at eval size |
|---|---|---:|---:|
| `opp_extreme_in` | the day's opposite extreme was already in before the entry (the trade came late) | 27 | −9,012 |
| `wick_then_target` | stopped by a wick, then price went on to the target the same day | 12 | −4,899 |
| `es_no_confirm` | ES did not sweep its own level | 5 | −2,130 |
| `stale_trap` | the inducement swing was older than 10 bars (50 min) | 4 | −1,161 |
| `not_turning_point` | price ran through the sweep extreme (every stop-out has this tag) | 1 | −806 |
| `be_scratch` | went +1R, came back to breakeven | 34 | −477 |
| `late_london` / `against_4h_draw` / `wide_stop` / `news_spike` | entry 05:00-08:00 / nearest 4H swing on the stop side / stop over 47 pts / news inside the trade | 1 / 1 / 2 / 1 | −432 / −425 / −293 / −276 |

   The main cause is the most specific one in that order. The tags count everything: 53 stop-outs, 50 against the 4H draw, 42
   came after the day's opposite extreme, 27 had a stale trap, 26 were late London and 25 had no ES confirmation.
   - **Causes explain; they never size anything.** Several of them (the opposite extreme, the wick, news inside the trade) are
     hindsight, so they can't be rules.
3. **On Sunday the review asks one question per bucket:** do the trades in this bucket earn more or less than the average
   trade?
   - **The buckets:**
     - trap: fresh / old;
     - liquidity: 2+ levels or a big level / one minor level;
     - entry time: London 02-05 / late London 05-08 / New York;
     - VIX: under 16 / 16-22 / 22+;
     - the A/B/C grade;
     - ES confirmed / not;
     - 4H draw: with / against / none.
   - **The answer is shrunk toward "no difference".** The bucket's average R is mixed with the overall average, as if it had 20
     extra ordinary trades. A bucket with 5 trades barely moves; a bucket with 60 moves a lot.
   - **The knob it aims for** = shrunk average ÷ overall average, kept between 0.5x and 1.25x.
4. **The guardrails.** A proposed change is a move toward that target, at most 0.25x. It must pass every check:
   - **a. Walk-forward:** the same rule, run at the start of each of the last six 30-day blocks on only the data before it,
     must have made money on the blocks where it would have changed something (at least 2 of them).
   - **a. Both halves:** the change must make money in both halves of the visible 2026 history: Jan-Jun and Jul on, once each
     has 20+ trades.
   - **b. Trades a week:** 2-4 trades a week still. Only a skip can lower this.
   - **c. Eval:** the MFFU 50K 2-week fail rate must not go up, on the last 6 months and on all of the visible history. That
     is a fresh eval started on every session, at the eval size with the 60% room cap.
   - **d. Step size:** at most one bucket a week, at most ±0.25x.
   - **e. Signal:** a move away from 1.0x, or a skip, needs the bucket to differ from the rest by **2.5 standard errors**. A
     move back toward 1.0x needs no signal.
5. **The decision is logged** in `data/lit_learning.json` (the cloud keeps its copy on the dashboard branch):
   - what changed, or why nothing did;
   - the bucket's numbers;
   - every check's result;
   - the $ / PF / drawdown / eval odds before and after.

## What it is allowed to change, and what it never touches

- **Allowed:** the size of a trade, through one multiplier between 0.5x and 1.25x per trade.
  - It joins the weekly stop in the **one rounding** of `engine/sizing.py` `lit_qty`, with a minimum of 1 micro.
  - A size-up never risks more than **$900**, inside MFFU's $1,000 daily loss limit.
  - The 60% room cap still applies after it.
  - In the new two-week eval mode the learner may only cut size or skip, never add.
- **Allowed, rarely:** skipping a bucket, only if it **lost money over 15+ trades**, the skip keeps 2+ trades a week, and every
  other check passes.
- **Never:** stops, targets, entries, the LIT setup rules, the weekly stop, the Monday rule, breakeven, the flat time.

## Why the guardrails are strict

- **The problem:** a first version had no signal check (e). It changed a knob in **40% of weeks on journals made of pure
  noise**, and 36 times on 2021-25, where LIT has no edge. That made 2021-25 worse: PF 0.98 → 0.86.
- **Why:** LIT's results are lumpy. A few 5-8R winners carry the year, so two buckets differ by 0.5R on chance alone.
- **The fix:** the signal check was calibrated on noise only, never on 2026:

| Signal threshold | Weeks with a knob change, on pure noise |
|---|---:|
| none | 40% |
| 2.0 standard errors | 15% |
| **2.5 (chosen)** | **4%** |
| 3.0 | 1% |

  `tests/test_lit_learn.py` keeps this in check (`test_noise_false_change_rate`).
- **Sensitivity** (for information only; nothing was picked from it):

| Version | Changes 2026 / 2021-25 | H1 net / funded Δ | H2 net / funded Δ |
|---|---|---|---|
| **Shipped (signal 2.5, prior 20)** | 3 / 0 | +3,557 / −1,062 | −415 / −111 |
| Signal 2.0 | 3 / 2 | +3,557 / −1,062 | −415 / −111 (2021-25 −4.5k) |
| Signal 3.0 | 3 / 0 | +509 / −2,356 | −415 / −111 |
| Prior 40 trades | 3 / 0 | +2,428 / −1,235 | −442 / −142 |
| No signal check | 5 / 29 | +2,751 / −842 | +203 / +507 (2021-25 −8.2k) |

  None of them is better in both halves on both money lines. The shipped settings are not hiding a better choice.

## Which proposal came closest, and what would make it pass

Over 2026 the review looked at **549 proposals**: 18 of them failed only one check.

- **Closest: late London (05:00-08:00 ET) at 0.75x**, proposed on Oct 4 and Oct 11. It passed everything except "both
  halves":
  - **What passed:**
    - the signal check (z −2.6: 18 trades, average −0.63R);
    - the walk-forward (+$574 / +$660 over 4-5 blocks);
    - the eval check (no 2-week fails either way);
    - 2+ trades a week.
  - **What failed:** late-London trades made money in Jan-Jun (the cut costs −$957 there) and lost in Jul-Oct (+$378).
  - **What would make it pass:** the weakness has to show in a period that also includes the first half. In practice, about 10-15
    more late-London trades that keep losing, so that the rolling 12-month history no longer has a good half for the bucket.
  - **The research agrees it is a mixed bucket:** `lit-losses.md` found 05:00-06:00 half size +$1.4k in H1, −$1.3k in H2.
- **Old traps at 0.75x** failed only the walk-forward on 5 Sundays (Feb 15 - Apr 5), even though both halves were already
  better.
  - **Why:** the rule needs 2 earlier 30-day blocks with 20+ trades behind them, and there wasn't enough history yet. That is
    the guardrail working as designed: no change on two months of data.
  - It passed on Apr 12. This is the one bucket where the learner, the trade-selection study and `lit-losses.md` all point
    the same way.
- **Grade B at 1.15x and ES-confirmed at 1.10x** failed only the signal check: z 0.7, and too few non-confirmed trades to
  test. Both made money in both halves and in the walk-forward. The difference is too small to call it learning, not luck.
- **Fresh trap at 1.25x** failed only the eval check on Apr 12 and Apr 19. The 2-week fail rate went from 5.6% to 7.0%, and
  from 0% to 3.9%. It passed on Apr 26.
  - That is the real cost of sizing up for an eval: a bigger trade before a pass raises the 2-week fail risk.
  - The same trade-off shows up in the result: H2's 2-week passes fell.
- **What could make the loop switch on** is more, cleaner data, not looser checks:
  - every live paper trade adds a record;
  - the old-trap and late-London buckets are the ones to watch;
  - the review re-checks every Sunday by itself.

## Where it runs

- **Cloud** (`tools/cloud_monitor.py`, GitHub Actions, free):
  - every run computes the entry facts for the LIT trades (the ES features stay unknown there: no fresh ES bars);
  - it writes the journal after each session;
  - it runs the review on Sunday (cron `47 21 * * 0`), or on the first run after it, or at once with the workflow input
    **learn_review**.
  - Files: `lit_journal.jsonl` and `lit_learning.json` on the `dashboard` branch.
  - Outputs: `state.json` key **`learning`**, and `data.json` key **`learning`** (also under `live.learning`). It has the mode,
    the knobs, the last review, the last 20 decisions, this month's loss causes and the replay summary, ready for a "What the
    bot learned" card.
- **PC / NinjaTrader** (`engine/live.py`):
  - the same entry facts on every poll;
  - sizing reads `data/lit_learning.json` (`python -m engine.lit_learn pull` copies the cloud's file);
  - every routed LIT exit is appended to `data/lit_journal.jsonl` as source `pc`;
  - when the same trade is in the journal more than once, the PC record wins over the cloud's, and the cloud's over the
    backtest's.

## Commands

- `python -m engine.lit_learn status`: the mode, the knobs, the last review and this month's causes.
- `python -m engine.lit_learn review --asof 2026-10-18`: a review by hand.
- `python -m engine.lit_learn revert d0013`: undo one decision. The revert is logged too.
- `python -m engine.lit_learn mode apply` (or `observe`): switch the mode.
- `python tools/lit_learn_replay.py run --seed`: this study. It writes `research/lit/learn_replay.json`, run
  `lit_learn_replay`, seeds `data/lit_journal.jsonl` with the 120 backtest trades of 2026, and writes `data/lit_learning.json`.
  About 2 minutes on 1 process.
- `research/lit/learn_proposals_2026.json`: every proposal of 2026 with its checks.
- `research/lit/learn_sensitivity.json`: the sensitivity table.
- `python -X utf8 -m tests.test_lit_learn`: the unit tests (cause codes, shrinkage, guardrails, noise rate, apply / revert,
  journal, sizing hook).

## Honest caveats

- **Thin data.** 2026 has 120 trades; a bucket has 15-60. Even a real effect takes months to show at 2.9 trades a week.
- **The eval path is noisy.** When a re-sized trade makes an eval pass a day earlier, the next eval starts elsewhere. That is
  why the funded $ line is part of the verdict.
- **Some facts are approximate.**
  - The guardrails' eval simulation uses weekdays as sessions and the trade's MAE for the intraday low. The replay's final
    numbers use the exact eval player.
  - The live features equal the research's (73 of 73 recent live trades identical). Old trades at the start of the live window
    can differ, because last month's levels are cut there. They are never journaled live.
- **Paper only.** Nothing here routes an order, and observe mode leaves every size exactly as before.
