## In one minute

- **What was asked:** the owner's *LIT Advanced Decisions Report*, chapters 2, 3 and 4 and experiment 4 of chapter 13.
  On top of that, the owner's LIT group notes (`research/lit/owner_lit_notes.md`): the sessions, the Smart Money Trap and
  the inducement tips. Everything is judged the LIT way: **2026 only**, picked on **Jan-Jun (H1)** and checked on
  **Jul-Oct (H2)**.
  - A rule counts as better only if the **2-week eval pass rate AND the money** both go up in both halves, at 2-4 trades
    a week.
  - Sizing is the live **two_week** mode ("one winner passes", `engine/sizing.py`). Costs are in.
- **Result: nothing is adopted.** 176 variants; 4 improve both halves.
  - **"Skip a sweep made by one huge bar with no pause before it"** (Gadd's "a timed forceful sweep can be continuation").
    The 2-week pass rate goes 52.9% → 53.8% in H1 and **50.7% → 65.2% in H2**. Net: H1 +$1.9k, H2 +$2.5k.
    - But it changes only **2 trades in each half**.
    - Its neighbours fail: with a 2.0-ATR bar, H1 loses $2.9k; with a 1.5-ATR pause, the H1 pass rate drops to 44.5%.
    - Marked *promising*: it is worth re-checking when more 1m data exists, but not worth adopting now.
  - The other three that improve both halves are lone points whose neighbours lose (details below).
- **The owner's session notes do not hold as size rules.**
  - "Asia → London continues" at half size cuts the H2 2-week pass rate from 50.7% to 17.4%.
  - "London → NY continues" changes almost nothing: LIT has few NY trades.
  - "No inducement before NY" helps H2 money only.
- **Smart Money Trap (liquidity right beside the zone):** cutting size on those setups improves both halves at exactly one
  distance (an unbroken 15m swing within 0.25 ATR beyond the extreme). At 0.5 ATR, or as a skip, it fails. Rejected.
- **Carryover vs reset (chapter 3):** an Asia thesis that is still valid at 02:00 gets its limit then.
  - That adds 7 trades in H1 and 7 in H2: H2 +$2.9k and pass rate 53.6%, but H1 −$7.0k and pass rate 36.1%. Rejected.
  - Only-unmitigated theses add 1 trade (H1 +$2.7k, H2 unchanged): too thin.
- **LIT live stays exactly as it is.** Under the live two-week sizing it makes H1 +$31.1k (2-week pass 52.9% / fail 8.4%)
  and H2 +$10.5k (50.7% / 2.9%). Under the plain LIT rule that is 2026 +$41,734.

## How this was done

- `tools/lit_adv_cont.py` (new; engine files are not edited). It wraps the 2026 LIT candidate set of
  `tools/lit_select.py`: every setup the live filters accept, each simulated alone with the live executor.
  - Its one-trade-a-day replay equals run `lit_live` trade for trade: `check`, 120 trades, +$41,734.
- Each setup gets new labels, computed only from bars that had closed by the trigger bar. The **lookahead test** recomputes
  25 random setups on data cut at the trigger bar: 25 of 25 are identical.
- Rules change **skip / size / target / new setups** on the real path. A skipped setup frees the day for a later one, as
  in the live loop.
- Scoring:
  - **Live two_week sizing** (`tools/lit_2wk.run_eval` → `engine/sizing.two_week_qty`). A fresh MFFU 50K eval is started
    on every session for the 2-week pass/fail (p10/f10). The $ and DD come from back-to-back evals reset at 10 sessions.
  - The **plain LIT-rule $** ($800 up to a 20-pt stop + weekly stop) for comparison with `lit_live`.
  - **Unit R per ORIGINAL candidate:** every live-filter setup of the half counts, simulated alone at 1 micro. Skipped or
    unfilled ones count as 0, never dropped. This is the report's "per original opportunity" measure.
- Under two_week, a size-up does nothing ("one winner passes" already sets the size). So size tilts are tested as cuts:
  half, 0.75x, or skip.
- Every result is stored in `research/lit/adv_cont_results.json`. The carryover ledger is in
  `research/lit/adv_cont_ledger.json` and the class tables in `research/lit/adv_cont_classes.json`.
- Limits:
  - The new setup types (carryover, internal continuation trades) are built for **2026 days only**, so their 2021-25 line
    is the base line.
  - ES 5m starts 2025-04, so all of 2026 has ES.

## The results that matter

Two-week sizing ($ = back-to-back evals). "LIT rule" = the same trades at the plain LIT size. The H1 pick of each family
is listed, plus every variant that improved both halves.

| Rule (chapter) | H1 n · /wk | H1 2-wk pass / fail | H1 net ($/mo) | H2 n · /wk | H2 2-wk pass / fail | H2 net ($/mo) | H2 PF · DD | LIT rule H1 / H2 | 2021-25 ref (two_week net, PF) | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **LIT live (base)** | 80 · 3.12 | 52.9 / 8.4 | +31,116 (5,105) | 40 · 2.56 | 50.7 / 2.9 | +10,481 (2,822) | 1.85 · −3,122 | +32,773 / +8,962 | +5,129, 1.04 | live |
| Forceful sweep (one bar ≥ 2.5 ATR) without a pause (6-bar range ≤ 2.5 ATR): skip (ch4) | 78 · 3.05 | 53.8 / 6.7 | +32,998 (5,414) | 38 · 2.44 | **65.2** / 2.9 | +12,985 (3,496) | 2.16 · −3,122 | +32,984 / +13,852 | +647, 1.00 | both up, but 2 trades a half and the neighbours fail: **promising, not adopted** |
| same, bar ≥ 2.0 ATR (neighbour) | 73 · 2.85 | 52.1 / 6.7 | +28,226 | 38 · 2.44 | 65.2 / 2.9 | +12,985 | | +33,389 / +13,852 | | H2 only |
| same, pause ≤ 1.5 ATR (neighbour) | 75 · 2.93 | 44.5 / 5.0 | +32,688 | 36 · 2.31 | 65.2 / 2.9 | +11,539 | | +26,406 / +13,765 | | H2 only |
| Smart Money Trap: half when an unbroken 15m swing sits ≤ 0.25 ATR beyond the extreme (owner) | 80 · 3.12 | 57.1 / 8.4 | +32,660 | 40 · 2.56 | 52.2 / 2.9 | +12,169 | 1.98 · −3,122 | +32,339 / +8,322 | −4,312, 0.97 | both up at one point only (0.5 ATR: H2 pass 44.9%; skip: H2 40.6%): rejected |
| Untaken major level ≤ 2 ATR beyond the extreme ("on the way", ch4): skip | 71 · 2.77 | 53.8 / 6.7 | +35,739 | 38 · 2.44 | 52.2 / **10.1** | +11,173 | 1.91 · −3,122 | +35,791 / +9,132 | +9,043, 1.07 | both up, but H2 fails 2.9 → 10.1% and 0.5 / 1 ATR are worse: rejected |
| Thesis boundary bos15 intact (continuation): half (ch2) | 80 · 3.12 | 53.8 / 5.9 | +32,964 | 40 · 2.56 | 52.2 / 0.0 | +12,623 | 2.13 · −2,878 | +33,186 / +8,232 | −14, 1.00 | both up by 1-2 points; unit R per candidate is lower in H2 and the LIT-rule $ is lower; the opposite of the report's idea: noise |
| Thesis boundary bos1h broken (generic fade of a thesis-changing break): half (ch2) | 80 · 3.12 | 52.9 / 9.2 | +31,459 | 40 · 2.56 | 53.6 / 2.9 | +10,481 | 1.85 | +32,414 / +8,962 | +15,813, 1.12 | flat: worse |
| Thesis boundary 24-hour range broken: skip (ch2) | 65 · 2.54 | 47.9 / 2.5 | +20,653 | 31 · 1.99 | 39.1 / 2.9 | +6,407 | 1.65 | +25,113 / +4,297 | −10,660, 0.92 | worse |
| Boundary-preserving setups target the next pool (bos1h intact) (ch2) | 74 · 2.89 | 49.6 / 5.9 | +28,999 | 38 · 2.44 | 43.5 / 0.0 | +7,137 | 1.57 | +27,474 / +6,629 | −3,251, 0.98 | worse |
| New continuation trades: an internal 15m swing swept, 1h structure intact, target the next pool (ch2) | 81 · 3.16 | 52.9 / 8.4 | +30,946 | 40 · 2.56 | 50.7 / 2.9 | +10,481 | 1.85 | +33,223 / +8,962 | (2026 only) | +1 trade in H1, none in H2: no effect |
| Carry pre-02:00 Asia theses into the 02:00 window (ch3 / exp. 4) | 87 · 3.40 | **36.1** / 9.2 | +24,094 | 47 · 3.01 | 53.6 / 2.9 | +13,388 (3,604) | 2.08 · −3,319 | +30,383 / +9,367 | (2026 only) | H2 only: rejected |
| Carry, unmitigated theses only (ch3) | 81 · 3.16 | 52.9 / 6.7 | +33,785 | 40 · 2.56 | 50.7 / 2.9 | +10,481 | 1.85 | +37,708 / +8,962 | (2026 only) | 1 extra H1 trade, H2 unchanged |
| Re-arm an expired untapped limit at the next session open 03:00/08:00/09:30 (ch3) | 82 · 3.20 | 52.9 / 8.4 | +30,326 | 41 · 2.63 | 50.7 / 2.9 | +10,479 | 1.85 | +32,094 / +8,960 | | worse |
| Weak zone: skip "completed traps" (touch + ≥ 1 ATR reaction before the sweep) (ch4) | 72 · 2.81 | 52.9 / 1.7 | +32,900 | 37 · 2.37 | 46.4 / 2.9 | +5,174 | 1.47 | +33,758 / +2,712 | +5,116, 1.04 | worse |
| Weak zone: half "pass-through" sweeps (no touch first) (ch4) | 80 · 3.12 | 10.9 / 4.2 | +13,290 | 40 · 2.56 | 30.4 / 0.0 | +11,637 | 2.32 | +18,423 / +6,932 | +6,356, 1.07 | worse |
| ES did not take its copy of the level (NQ only): skip (ch4) | 78 · 3.05 | 52.9 / 8.4 | +31,520 | 33 · 2.12 | 59.4 / 0.0 | +11,919 | 2.27 · −1,852 | +32,894 / +11,606 | +6,925, 1.05 | H2 only (H1 pass rate equal) |
| ES has not made its own 5m CISD by NQ's trigger bar: skip (ch4) | 69 · 2.70 | 40.3 / 7.6 | +15,369 | 31 · 1.99 | 43.5 / 11.6 | +12,408 | 2.19 | +26,945 / +8,431 | +321, 1.00 | worse |
| Owner: Asia IDM → London / pre-NY continue: half setups against Asia's direction | 80 · 3.12 | 47.1 / 5.9 | +25,986 | 40 · 2.56 | **17.4** / 0.0 | +12,378 | 2.35 | +27,803 / +6,357 | +5,129, 1.04 | worse |
| Owner: London IDM → NY continues: half NY (08:00+) setups against London | 80 · 3.12 | 51.3 / 8.4 | +32,209 | 40 · 2.56 | 50.7 / 2.9 | +10,481 | 1.85 | +32,464 / +9,027 | +4,361, 1.03 | worse |
| Owner: no IDM before NY: half NY setups on days that had an earlier IDM | 80 · 3.12 | 51.3 / 9.2 | +31,110 | 40 · 2.56 | 52.2 / 2.9 | +15,608 | 2.30 | +29,375 / +9,079 | +7,041, 1.05 | H2 only |
| Owner: both session rules together, half | 80 · 3.12 | 47.1 / 5.9 | +26,132 | 40 · 2.56 | 17.4 / 0.0 | +12,742 | 2.38 | +27,803 / +6,203 | +5,930, 1.04 | worse |
| Owner tip: inducement speed, half when the inducement swing is > 12 bars old | 80 · 3.12 | 52.9 / 7.6 | +33,249 | 40 · 2.56 | 47.8 / 2.9 | +12,366 | 2.19 | +33,987 / +8,063 | | H1 only |
| Owner tip: hierarchy, half when only a minor level (build-up) was swept | 80 · 3.12 | 56.3 / 7.6 | +29,482 | 40 · 2.56 | 52.2 / 2.9 | +14,608 | 2.41 | +31,852 / +8,214 | | H2 only |
| Owner tip: session opens, half unless the sweep came within 30 min of an open | 80 · 3.12 | 14.3 / 1.7 | +11,856 | 40 · 2.56 | 27.5 / 0.0 | +8,053 | 1.94 | +18,195 / +5,367 | | worse |
| Owner tip: continuation / reversal inducement only, half the rest | 80 · 3.12 | 47.1 / 7.6 | +25,556 | 40 · 2.56 | 50.7 / 2.9 | +7,323 | 1.61 | +27,042 / +6,919 | | worse |

Counts over all 176 variants:
- 4 improve both halves (all above);
- 25 improve H2 only;
- 5 improve H1 only;
- 137 are worse and 5 change nothing.

Every row with all its columns (win %, 1-month odds, unit R per candidate, 2021-25) is in `adv_cont_results.json`.

## What each chapter's idea looks like on NQ

**Chapter 2: the internal sweep vs the thesis boundary.**
- Nine boundary selectors were declared before scoring:
  - the last unbroken 15m / 1h / 4h swing;
  - the nearest unbroken 1h / 4h swing beyond the swept level;
  - the protected low of the last 15m / 1h / 4h break of structure;
  - the 24-hour range.
- They disagree a lot (see `adv_cont_classes.json`, "agreement"). That is the report's own warning: the same setup is
  "continuation" under one selector and "fade" under another.
- **No selector separates good LIT setups from bad ones in both halves.**
  - Skipping the "wrong kind of fade" (boundary broken) costs $6-11k in H1 for the 1h and 24-hour selectors. The 4h
    selectors are flat.
  - Halving it is flat.
  - Cutting the "against the trend" setups (last 1h break of structure the other way) costs $12-17k in H1.
  - LIT's winners in 2026 are often exactly those external sweeps.
  - **Per original candidate the 1h structure boundary does sort the setups, in both halves:**
    - intact +0.43 / +0.46 R per candidate (H1 / H2);
    - against +0.26 / +0.20;
    - broken −0.01 / −0.17.
    - But "broken" is rare (22 + 6 candidates). Skipping them frees the day for a later setup that does worse, so on the
      real path the 2-week pass rate and the money do not both rise in either half.
    - This is the one boundary fact worth remembering. It is not worth a rule today.
- **Targeting the next liquidity pool** on boundary-preserving setups (the report's "continuation toward the next
  objective") loses to the VIX band again, as in every earlier target test.
- **New continuation trades** (an internal 15m swing swept with the 1h structure intact):
  - almost never pass LIT's other filters as new setups;
  - nearly every such sweep also takes a LIT level and is already a LIT setup;
  - they add 1-3 trades in 2026 and change nothing that matters.

**Chapter 3 / experiment 4: carryover vs reset.**
- Every Asia thesis (sweep + inducement + displacement + 5m CISD completed between 18:30 and 01:55) is kept in a ledger
  (`adv_cont_ledger.json`). Each row has:
  - the time its level became known;
  - its eligibility time (the trigger close);
  - the order-permission time (02:00);
  - why it expired: extreme broken, objective traded before 02:00, or mitigated without an order.
- Both clocks always run in order (level known ≤ eligibility ≤ permission): checked over the whole ledger.
- The 2026 ledger has 172 Asia theses that pass the live setup filters:
  - 72 had the extreme broken before 02:00;
  - in 4 the objective traded before 02:00;
  - 68 got no fill in the 30 minutes after 02:00;
  - 28 filled.
- Carrying the still-valid theses to 02:00 adds 7 trades in each half: H2 better, H1 much worse.
  - On the days it changed, carryover made +3.8R against +14.9R for reset in H1, and +1.6R against +1.4R in H2.
  - The carried trade takes the day's one slot from a better London setup.
- Requiring the CISD level to be still untouched at 02:00 leaves 1 trade. **Reset (today's rule) stays.**
- Re-arming an expired London limit at the next session open adds 1-2 trades and loses a little.

**Chapter 4: weak reaction vs completed trap; forceful sweeps; ES on the same event.**
- **Trap sequence** (the swept level touched, then a reaction of at least x ATR, then the sweep, each timestamped):
  - LIT's sweeps are mostly *pass-throughs* (no earlier touch): 191 of 222 candidates in H1 and 88 of 108 in H2.
  - Completed traps flip between the halves: −0.34 R per candidate in H1, +1.00 in H2.
  - Requiring a completed trap leaves 0.4-0.7 trades a week and loses money.
  - Halving the pass-throughs costs most of the H1 eval passes.
  - **The pass-through sweeps carry most of LIT's money.** The completed-trap label does not hold its sign.
- **Forceful sweep without a pause:**
  - This is the only idea with a plausible signal.
  - Skipping a sweep that has a 5m bar of at least 2.5 ATR and no compression before it helped both halves, but on 2
    trades each. It is the clearest candidate to re-check later.
  - "Forceful ≥ 2 ATR" on its own flips: +0.37 R per candidate in H1, −0.12 in H2.
  - The *pause* itself (the 6 bars before the sweep span at most 1.5 ATR) is the opposite of Gadd's preference on NQ.
    Those setups make −0.05 R (H1) and +0.07 R (H2) per candidate, against +0.33 / +0.30 for the rest. The post-hoc test
    is below.
  - **Post-hoc test, not a pick:** skipping or halving the paused setups (≤ 1.0 / 1.5 / 2.0 ATR) never improves both
    halves. At 1.5 ATR the H2 2-week pass rate drops 50.7% → 40.6%. At 1.0 ATR nothing changes. So the pause is not a rule
    either way.
  - Adding "timed" (first 15 minutes of an open) made it worse.
- **"On the way" to a farther level:** skipping when an untaken major level sits within 2 ATR beyond the extreme helps
  money in both halves. But it triples the H2 fail rate and the nearer distances are worse.
- **ES:**
  - Matching rule: ES's copy of the same named level, over the same timestamps, from NQ's sweep bar to NQ's trigger bar.
    "ES led" means ES took it before NQ's sweep bar. Setups with no copy, or with missing ES bars, are kept as "unmatched",
    not dropped.
  - "NQ swept, ES held" (the divergence): skipping it helps H2 only.
  - Requiring ES's own CISD by the same bar cuts the 2-week pass rate in both halves.
  - "NQ only" setups flip: −0.13 R per candidate in H1, +0.34 in H2.
  - This agrees with the earlier SMT tests (`lit-losses.md`).

**The owner's notes (`owner_lit_notes.md`):**
- **Sessions:**
  - Asia's direction does not predict London's LIT trades. Halving the London setups that go against Asia drops the H2
    2-week pass rate from 50.7% to 17.4%.
  - London → NY and "no inducement before NY" barely matter: only 25 of 120 LIT trades are NY trades.
- **Smart Money Trap** (untaken liquidity right beside the zone): it holds at only one distance (0.25 ATR, as a half
  size), so it is a lone spike.
- **Inducement speed** (a slow, old inducement is a build-up): H1 only.
- **Hierarchy** (half when only a build-up was swept): H2 money only.
- **Session open as the final inducement:** worse in both halves.
- **Continuation / reversal inducement only:** worse.

## Honest verdict

- **Nothing passes.** The forceful-sweep skip is the only rule worth keeping an eye on. It is cheap to code and has a clear
  story (a forceful sweep without a pause tends to continue). But it changes 2 trades per half and its neighbours fail.
  - If it is ever wanted, it would be a default-off option on the setup filter: skip when the largest 5m bar between the
    sweep bar and the extreme is ≥ 2.5 ATR and the 6 bars before the sweep span more than 2.5 ATR.
  - It is not implemented in the engine, and `live_model.json` is unchanged.
- The report's own caution fits these results: boundary and trap labels depend on the selector chosen, and a selector
  picked after seeing the outcome would be the "hidden decision" the report warns about.
- **LIT live is unchanged:**
  - 2026 +$41,734, PF 3.66, 2.91 trades a week;
  - under two_week sizing, 2-week pass H1 52.9% / H2 50.7%;
  - **H2 about $2,400-2,800 a month.**

## Files and how to rerun

- `python tools/lit_adv_cont.py check`: the base path equals `lit_live`, plus the lookahead test.
- `grid` runs every variant into `research/lit/adv_cont_results.json`. `ledger` writes the carryover ledger. `describe`
  writes the class tables.
- Runs are stored as `lit_adv_*` (family other, tags lit, lit_adv). Paper only.
