## In one minute

- **The owner's order (2026-10-18):** an MFFU eval must be **passed in 2 weeks (10 sessions) or less**. "Eventually" does not
  count. An eval that has not passed by session 10 counts as a failed purchase, and the owner can reset it.
- **What we measure:**
  - **P(pass in 10):** the share of fresh MFFU Builder 50K evals that reach +$3,000 within 10 sessions.
  - **Cost per 2-week pass** = $91.80 ÷ P(pass in 10).
  - P(fail in 10) and P(still open at 10) are shown next to it.
- **The trades are the real LIT trades.** These are the 120 trades of 2026 that the live loop takes: the same signals, the same
  1m entries, stops 1 tick beyond the sweep extreme. Only the size changes.
- **The new sizing, "one winner passes":**
  1. When LIT enters, the target is already known (the VIX band, 1.5R to 8R).
  2. Buy enough micros that, if this trade hits its target, the eval is passed.
  3. Then cap it so that one full stop-out (stop, 1 tick and commission) stays:
     - inside the $1,000 soft daily loss;
     - inside the room to the max-loss floor;
     - at 40 micros or fewer.
  4. Never go below 1 micro.
  5. No new trade once the day has already reached the target.
- **Results, 2-week pass / fail (Jan-Jun starts | Jul-Oct starts):**

  | | Jan-Jun | Jul-Oct | Cost per 2-week pass |
  |---|---|---|---|
  | Today's eval mode | 40% / 3% | 25% / 0% | **$228 / $373** |
  | **Recommended (A0):** one winner passes, all the room, weekly stop on | **58% / 18%** | **54% / 22%** | **$158 / $171** |
  | Safer option (C): one winner passes, 60% of the room | 53% / 8% | 51% / 3% | $174 / $181 |

  - Monte Carlo (4,000 shuffled 2026 paths), recommended: 51% / 57% pass.
- **The honest ceiling is about 70%.**
  - LIT takes about 6 trades in 10 sessions and about 21% of its trades hit their target.
  - So about 70% of 10-session windows contain at least one winner big enough to pass.
  - Even a perfect hindsight sizer would pass only 69-73%.
  - The best real configs reach 54-59%: about 80% of the ceiling. What stops them is the losers that come before the winner,
    at the same size.
- **The 50% question:** yes. Configs A, A0, B and C pass at least 50% in all four samples (Jan-Jun, Jul-Oct, and both Monte
  Carlos). C does it with only 3-8% failing.
- **What did not help:**
  - More LIT shots: a 2nd trade after a stop-out, or an earlier window.
  - Profit protection: it changes nothing, because the size already shrinks near the target.
  - A clock press: it adds fails without adding passes in both halves.
  - Start timing: "after 3 LIT losers in a row" looks good, but the sample is too thin.
- **Nothing is live:** `live_model.json`, `engine/lit_live.py`, `STRATEGY.md` and the dashboards are unchanged. The exact
  config to switch on is at the end.

## How to read the tables

- **Starts:**
  - A fresh eval is started on every 2026 session.
  - "Jan-Jun" (H1) starts are played on Jan-Jun sessions only (pick). "Jul-Oct" (H2) starts are played on Jul-Oct sessions only
    (check).
  - Only starts that can see the full 10 sessions count: 119 in H1, 69 in H2.
  - Older write-ups also counted the last starts of each half. Measured that way, today's eval mode is 37.5% / 29.5%; measured
    here, it is 40.3% / 24.6%.
- **Monte Carlo:** 4,000 evals of 20 sessions, drawn in blocks of 5 consecutive sessions from the same half.
- **2 wk:** % passed / failed / still open after 10 sessions. **1 mo:** % passed / failed within 20 sessions (reference only).
- **Cost:** $91.80 ÷ 2-week pass rate.
- **Worst day:** the worst single day of any eval. About −$1,000 means MFFU's soft daily loss closed the position.
- **Max risk:** the largest $ a full stop-out could cost on one trade.
- **2021-25:** a reference only (5m entries, no 1m data, LIT PF 1.01 there). It is never a gate (owner, 2026-10-18).
- **Small samples:** H2 has 69 starts, but they overlap. That is only about 7 separate 2-week blocks. Read differences under
  about 5 points as noise.
- **Eval rules modelled:**
  - $3,000 target.
  - $2,000 max loss, trailing the end-of-day high. It is checked against the worst open loss inside the day and locks at +$100.
  - $1,000 soft daily loss: the position is closed and the day ends.
  - Max 40 micros.
  - Commission $1.40 a micro, 1 tick of slippage on market entries and stop exits.

## The table (MFFU Builder 50K, $91.80)

| Config | H1 2 wk pass / fail / open | H2 2 wk pass / fail / open | MC H1 / MC H2 2 wk pass (fail) | 1 mo H1 · H2 pass / fail | Cost per 2-wk pass H1 / H2 | Worst day | Max risk | 2021-25 2 wk (ref) |
|---|---|---|---|---|---|---:|---:|---|
| **A. One winner passes, all the room, weekly stop on, ×2 from session 6** | **58.8 / 17.6 / 23.6** | **56.5 / 29.0 / 14.5** | 52.9 (21.5) / 56.6 (23.7) | 73.4/25.7 · 52.5/47.5 | **$156 / $162** | −$1,011 | $1,000 | 19.6 / 33.3 ($468) |
| **A0. One winner passes, all the room, weekly stop on (recommended)** | **58.0 / 17.6 / 24.4** | **53.6 / 21.7 / 24.7** | 51.3 (17.8) / 57.0 (21.3) | 74.3/20.2 · 52.5/42.4 | **$158 / $171** | −$1,006 | $992 | 20.3 / 26.6 ($452) |
| B. One winner passes, 60% of the room, all of it from session 6 | 54.6 / 14.3 / 31.1 | 52.2 / 13.0 / 34.8 | 52.6 (16.3) / 57.5 (17.9) | 74.3/20.2 · 55.9/33.9 | $168 / $176 | −$1,008 | $992 | 18.3 / 24.6 ($502) |
| **C. One winner passes, 60% of the room, no weekly stop (safer option)** | 52.9 / 8.4 / 38.7 | 50.7 / 2.9 / 46.4 | 50.5 (6.2) / 55.4 (5.5) | 75.2/17.4 · 61.0/16.9 | $174 / $181 | −$1,008 | $992 | 15.4 / 5.6 ($596) |
| D. One winner passes, 50% of the room, no weekly stop | 52.1 / 6.7 / 41.2 | 49.3 / 0.0 / 50.7 | 50.1 (3.8) / 50.0 (2.9) | 77.1/12.8 · 59.3/0.0 | $176 / $186 | −$1,008 | $992 | 14.1 / 2.6 ($651) |
| $1,200 up to a 60-pt stop, all the room | 59.7 / 24.4 / 15.9 | 53.6 / 29.0 / 17.4 | 51.0 (35.7) / 55.6 (29.6) | 68.8/31.2 · 52.5/47.5 | $154 / $171 | −$1,011 | $1,000 | 17.4 / 45.7 ($528) |
| Fast eval $800 up to 40 pts + room 60% | 47.1 / 5.9 / 47.0 | 44.9 / 0.0 / 55.1 | 45.1 (4.8) / 41.3 (4.0) | 72.5/21.1 · 54.2/13.6 | $195 / $204 | −$1,006 | $853 | 12.9 / 5.7 ($712) |
| Today's eval mode ($800 up to 25 pts + room 60%) | 40.3 / 3.4 / 56.3 | 24.6 / 0.0 / 75.4 | 38.0 (2.2) / 28.7 (0.9) | 69.7/7.3 · 35.6/0.0 | $228 / $373 | −$806 | $853 | 8.0 / 4.0 ($1,148) |
| Plain LIT rule ($800 up to 20 pts, no cap) | 31.1 / 3.4 / 65.5 | 17.4 / 0.0 / 82.6 | 35.1 (3.3) / 21.4 (0.6) | 72.5/7.3 · 32.2/0.0 | $295 / $528 | −$755 | $853 | 6.9 / 15.0 ($1,330) |

- **1-month numbers in H2 can be lower than the 2-week numbers.** Fewer H2 starts can see 20 sessions, so the base is different.
  - With the all-room configs (A, A0), an eval still open after 10 sessions in H2 fails far more often than it passes.
  - Follow the owner's rule: reset at session 10 instead of hoping.
- **Back to back** (buy a new eval after a pass, a fail or 10 open sessions, played on real 2026):
  - **A0: 18 passes in 30 evals ($153 a pass).**
  - A: 18 in 31 ($158). C: 15 in 32 ($196). Today's eval mode: 10 in 25 ($230).
  - 2021-25 reference: A0 $443 a pass, C $565, today's mode $1,153.
- **Money:** every config trades the same 120 LIT trades in 2026: 2.91 a week, 86% of weeks with 2+.
  - On the back-to-back eval path the eval accounts made:
    - A0 +$46,059 ($4,695 a month), PF 2.61, max DD −$4,375, median $492 at risk;
    - C +$42,211 ($4,303 a month), PF 2.50;
    - today's mode +$48,851, PF 3.55.
  - This is eval-account P&L, not cash. The cash comes from the funded accounts the passes buy.
  - In the 2021-25 reference all are about break-even (A0 +$6,556, PF 1.04).

### The same on the MFFU Builder 25K ($63; $1,500 target, $1,000 max loss, $600 soft daily loss, 20 micros, every $ halved)

| Config | H1 2 wk pass / fail | H2 2 wk pass / fail | MC H1 / MC H2 pass | Cost per 2-wk pass H1 / H2 | Max risk |
|---|---|---|---|---|---:|
| A. ×2 from session 6 | 54.6 / 19.3 | 53.6 / 26.1 | 51.3 / 57.8 | $115 / $118 | $600 |
| **A0 (recommended)** | **55.5 / 18.5** | **55.1 / 26.1** | 50.6 / 58.9 | **$114 / $114** | $600 |
| B. Clock press | 54.6 / 16.0 | 56.5 / 21.7 | 53.2 / 55.3 | $115 / $112 | $600 |
| C. Safer option | 54.6 / 14.3 | 52.2 / 8.7 | 51.4 / 51.5 | $115 / $121 | $600 |
| D. 50% of the room | 53.8 / 12.6 | 47.8 / 2.9 | 50.1 / 48.0 | $117 / $132 | $499 |
| Today's eval mode (scaled) | 45.4 / 4.2 | 17.4 / 0.0 | 39.5 / 25.9 | $139 / $362 | $423 |

- **The 25K buys a 2-week pass for about $115 instead of $158-185.** It passes about as often as the 50K and costs $63.
- **But it fails more often with the safer configs** (C: 14% vs 8% in H1). LIT's wide stops (up to 88 pts) make even 1 micro
  a big share of a $1,000 max loss.
- **And the funded account is half the size.** If the goal is "a funded account within 2 weeks for the least money", the 25K is
  cheaper. For the bigger payout, take the 50K.

## The ceiling: how high can P(pass in 10) go with LIT?

Every 10-session window of real history (full windows only):

| | Trades in 10 sessions | % of trades hitting target | % winners | Windows with ≥ 1 target | Windows with ≥ 1 winner | Perfect hindsight sizing | 1 − e^(−n·p) |
|---|---:|---:|---:|---:|---:|---:|---:|
| H1 (Jan-Jun) | 6.7 | 18.8 | 22.5 | 67.2% | 83.2% | **73.1%** | 71.6% |
| H2 (Jul-Oct) | 5.8 | 25.0 | 35.0 | 73.9% | 73.9% | **71.0%** | 76.5% |
| 2026 | 6.1 | 20.8 | 26.7 | 66.5% | 77.2% | **69.0%** | 71.9% |
| 2021-25 (ref) | 4.8 | 10.2 | 17.5 | 39.9% | 61.9% | 32.7% | 38.7% |

- **The simple maths:**
  - LIT takes about 6 trades in 2 weeks, and about 1 in 5 hits its target.
  - P(at least one target in 6 trades) = 1 − 0.79⁶ ≈ **75%**. Allowing for the trade count varying (Poisson), it is about 72%.
- **Why one target is enough:** the median target is 5.7R. At ~$1,000 of risk (the daily-loss limit), one target is worth
  ~$5,700, almost twice the $3,000 needed.
- **"Perfect hindsight sizing":**
  - Every winner gets the most the rules allow (40 micros, a full stop-out inside the $1,000 day). Every loser gets 1 micro.
  - It still passes only **69-73%**. Some targets are too small: 1.5-3R at $1,000 is $1,500-3,000.
  - **This is the true ceiling. No sizing rule can beat it on these trades.**
- **How close the configs get:**

  | | H1 / H2 | Share of the ceiling |
  |---|---|---|
  | A | 58.8% / 56.5% | 80% / 80% |
  | A0 | 58.0% / 53.6% | 79% / 75% |
  | C | 52.9% / 50.7% | 72% / 71% |
  | Today's eval mode | 40.3% / 24.6% | 55% / 35% |

- **The gap is the losers before the winner.**
  - A real sizer does not know which trade wins, so the 1-2 losers before the target are as big as the target trade.
  - With all the room in play, two full losers in a row (about 0.4 × 0.4 = 16% of starts) end the eval. That is the 18-22% fail
    rate of A0.
  - The safer C keeps the second loss small (60% of the room left) and gives up about 5 points of passes for it.

## The levers, one by one

### 1. Size from the eval state

- **"One winner passes" beats every fixed-$ scheme at the same fail rate.**
  - The fixed schemes tested: $800 / $1,000 / $1,200 up to a 25 / 40 / 60-pt stop, room 40-100%. 45 of them.
  - The best fixed scheme ($1,200 up to 60 pts, all the room) passes like A0: 59.7% / 53.6%. But it fails 24-36% within
    2 weeks, against 18-22% for A0.
  - Why "need" wins: a far target gets fewer micros (less risk, same pass), and the size falls automatically as the eval gets
    close to +$3,000.
- **Room share** (the main dial, all "need" with the weekly stop off):

  | Room share | 2-week pass H1 / H2 | 2-week fail H1 / H2 |
  |---:|---|---|
  | 40% | 48.7 / 39.1 | 2.5 / 0.0 |
  | 50% | 52.1 / 49.3 | 6.7 / 0.0 |
  | 60% | 52.9 / 50.7 | 8.4 / 2.9 |
  | 80% | 57.1 / 50.7 | 14.3 / 8.7 |
  | 100% | 57.1 / 50.7 | 19.3 / 20.3 |

  - Above 60%, H2 passes stop rising; only the fails grow.
- **The weekly stop** (half size after 2 stop-outs in a week):
  - With all the room it helps: 58.0 / 53.6 against 57.1 / 50.7.
  - At 60% of the room it is a wash: Monte Carlo H1 48.2 against 50.5.
  - So A0 keeps it on and C keeps it off.
- **A $ cap per trade** (max $800 or $1,000) changes nothing above $1,000, because the $1,000 daily loss already caps it.
  At $800 it costs 1-5 points.
- **"need_buf"** (aim for more or less than the missing $):
  - Aiming short (×0.8) collapses passes to 26-33%: the winner then leaves the eval just short of +$3,000.
  - Aiming long (×1.1, ×1.25) changes nothing.

### 2. Day-by-day pressure and protection

- **Clock press, ×1.5 to ×3 from session 5-8** (if not passed yet):
  - On A0 the best version, ×2 from session 6 (config A), adds +0.8 / +2.9 points of passes in the exact starts.
  - In the Monte Carlo it adds +1.6 / −0.4, and H2 fails rise from 21.7% to 29.0%.
  - It does not hold in both checks, so A0 stays plain.
- **Room 60% → 100% from session 6 (config B):** halfway between C and A0 in passes and in fails.
- **Protect** (once up +$1,000 / 1,500 / 2,000, a loss may not take the profit below 0-70% of it): no effect at all. The "need"
  size near the target is already small.

### 3. More shots inside the 10 sessions (still LIT)

- **A second LIT trade on the same day, only after a stop-out** (a new sweep + inducement + CISD after the first exit):
  - It adds about 0.4 trades a week, but these trades are weaker (win 24.4% vs 26.7%).
  - 2-week pass H1 45.4% (vs 52.9%), H2 49.3% (vs 50.7%). **Rejected.**
- **Earlier window, 00:00-15:30 instead of 02:00-15:30:**
  - It adds 0.17 trades a week. H1 51.3% (vs 52.9), H2 47.8% (vs 50.7); only the H2 Monte Carlo is better. **Rejected.**
- **London + NY:** both are already inside LIT's 02:00-15:30 window, so there is nothing to add.
  - A separate NY run of LIT was rejected earlier (`lit-experiments.md`).

### 4. When to start (buy) the eval: causal rules from LIT's own history

2-week pass / fail (number of starts):

| Start rule | A0 H1 | A0 H2 | C H1 | C H2 | 2021-25 (A0) |
|---|---|---|---|---|---|
| Any session | 58.0 / 17.6 (119) | 53.6 / 21.7 (69) | 52.9 / 8.4 | 50.7 / 2.9 | 20.3 / 26.6 |
| After 2 LIT non-winners in a row | 58.0 / 15.9 (69) | 56.4 / 25.6 (39) | 56.5 / 5.8 | 53.8 / 5.1 | 20.1 / 24.0 |
| After 3 LIT non-winners in a row | 56.6 / 13.2 (53) | 66.7 / 14.8 (27) | 54.7 / 0.0 | 66.7 / 0.0 | 21.4 / 24.1 |
| After a LIT target | 70.4 / 18.5 (27) | 28.6 / 21.4 (14) | 55.6 / 7.4 | 21.4 / 0.0 | 10.9 / 27.1 |
| Monday | 50.0 / 20.8 (24) | 57.1 / 28.6 (14) | 45.8 / 8.3 | 50.0 / 0.0 | 21.8 / 24.2 |

- **"After 3 non-winners" lowers 2-week fails for every config in both halves.** But:
  - the samples are tiny (53 and 27 overlapping starts);
  - 2021-25 shows no gain;
  - the back-to-back path with the rule is mixed (2026: 9 passes in 17 evals, $173 a pass, against $153 without the rule);
  - waiting for the streak costs calendar time.
- **Verdict: not proven.** Do not wait for it. Starting right after a big LIT win is the worst Jul-Oct start but the best Jan-Jun
  one, so that is noise too.
- **Mondays are not better.**

### 5. Rules kept everywhere

- 1 micro minimum, 40 micros maximum.
- A full stop-out always fits the $1,000 soft daily loss. The worst day is about −$1,006: the 1 tick on MFFU's flatten.
- Stops stay 1 tick beyond the sweep extreme. No tighter stop: rejected in `lit-tight-stops-size.md`.
- Trades are unchanged at 2.91 a week.

## Recommendation

- **Switch the eval mode to "two_week" with config A0.**
  - It passes **58% / 54%** of evals within 2 weeks (Monte Carlo 51% / 57%), against 40% / 25% today.
  - A 2-week pass costs **$158-171** instead of $228-373. Back to back on 2026: 18 passes in 30 evals.
  - **Expect about 1 eval in 5 to fail within 2 weeks** (two full losers before the first target). The eval costs $91.80
    either way, so the owner's cost rule already counts it.
  - The first trade of an eval can risk up to ~$990: about half the max loss, on purpose.
- **If blown evals bother the owner more than 2-week speed:** use C (`"room_f": 0.6, "wk": false`).
  - It passes 53% / 51% (≥ 50% in every sample), fails 3-8%, and costs $174-181 a 2-week pass.
- **Before switching on, two things matter:**
  1. **The live entry timing fix from `lit-live-fills.md`.** Decide on the CISD bar's close and poll 2 s after each minute. A
     95-second-late entry can risk up to 1.65 times the planned amount, and at ~$1,000 a trade that alone can breach the floor.
  2. **The trade's target distance must be passed to the sizer.** The live plan has it (entry and target prices).
- **Reset at session 10.** An open eval at session 10 in Jul-Oct went on to fail more often than pass with A0. Follow the
  owner's rule and buy a fresh one.

**The exact `live_model.json` "lit_sizing" change to switch on.** Keep every existing key (`modes`, `safe_cap`,
`fast_ref_stop`, `eval_ref_stop`, `note`). Set `mode` and add the `two_week` block and its `modes` entry:

```json
"mode": "two_week",
"two_week": {"base": "need", "need_buf": 1.0, "room_f": 1.0, "wk": true, "dll_cap": true, "stop_at_target": true,
             "max_usd": null, "press_at": null, "press_mult": 1.0, "press_room": null,
             "protect_over": null, "protect_keep": 0.0}
```

`modes.two_week`:

```text
one winner passes: micros so the target covers what is still needed to +$3,000, capped by the room to the max-loss floor
(room_f 1.0), the $1,000 soft daily loss and 40 micros, min 1, weekly stop x0.5 (run lit_2wk_max_plain: 2-week pass
H1 58.0% / H2 53.6%, fail 17.6 / 21.7, $158 / $171 per 2-week pass)
```

- **Safer option C:** the same block with `"room_f": 0.6, "wk": false`.
- **Code:**
  - `tools/lit_2wk_sizing.py`, `two_week_qty(trade, state, cfg, acct)`. It is self-contained; move it into `engine/sizing.py`
    and call it from `lit_qty` when `mode == "two_week"` with `cfg = lit_sizing["two_week"]`.
  - `state` = `{"profit", "cum", "room", "session"}`:
    - **profit:** eval profit at the start of the day;
    - **cum:** today's closed P&L;
    - **room:** balance + cum − trailing floor;
    - **session:** the session number since the eval started.
  - `eval_state(day_pnl, today_cum)` builds it from the eval's P&L per session. Every session counts, with 0 on days without a
    trade.
  - `trade` needs `risk_pts`, the target distance (`tgt_pts`, or `entry` + `target`) and `size_mult` (the weekly stop).
  - Unit test: `python -X utf8 -m tests.test_lit_2wk_sizing` (22 checks). It includes a regression against this study:
    A0 H1 = 58.0 / 17.6, and today's mode = 37.5 / 3.1 on the older all-starts count.

## Reproduce

- `python tools/lit_2wk.py build`: the unit trades of the 4 signal sets (live, second shot, 00:00 window, both). About 1 minute
  each, 1 process. The live set is 630 trades; 2026 = 120, the same as run `lit_live`.
- `python tools/lit_2wk.py ceiling`: the ceiling table → `research/lit/two_week_ceiling.json`.
- `python tools/lit_2wk.py grid` and `press`: every config → `research/lit/two_week.json` (2 processes).
- `python tools/lit_2wk.py final`: the shortlist on the 50K and the 25K, with 2021-25 → `research/lit/two_week_final.json`.
- `python tools/lit_2wk.py timing`: the start rules → `research/lit/two_week_timing.json`.
- `python tools/lit_2wk.py save`: stores the runs `lit_2wk_*`.
  - The stored trades are the back-to-back eval path, because the size depends on the eval state. So the run library's own
    eval columns are not the eval numbers. The exact numbers are in each run's verdict and notes.
