## In one minute

- **The order (owner, 2026-10-18):** "Get more bots to get the perfect entries. I need entries that are on dot." Plus the
  owner's advanced report, ch.5 ("confirmation and refinement have an opportunity cost") and ch.13 experiment 1: compare a
  direct-zone entry, a delayed confirmation and a refined limit **per original setup**, a missed fill counted as zero.
- **The answer:** today's entry is already the "on the dot" entry for LIT. 43 ways to enter were tested. None is better in
  both halves of 2026.
- **Why, in plain words:**
  - **The confirmation is the filter.** About half of LIT setups never print a 1m CISD after the tap. A resting limit
    buys them all. Those extra trades lose: in Jan-Jun, 48 extra fills cost $28.9k at $1,000 a setup. The 1m CISD keeps
    LIT out of them.
  - **A better price costs the best winners.** Waiting for a pullback after the CISD (FVG, order block, 50%, the 1m CISD
    level) misses the trades that leave at once, and those are the big winners. A deeper limit buys more of the losers.
  - **Slower confirmation is late.** A 1m BOS, a 2m / 3m CISD or a close back above the zone confirms later. That gives a
    worse price and misses more setups.
- **Closest miss:** a limit at the CISD candle's close for 1 minute, then buy at market. It is +$1,320 in H1 and -$177 in
  H2. The 2-week eval pass is 52.9% / 49.3% against live's 52.9% / 50.7%. That is noise, not an edge, and it fails the
  both-halves rule.
- **Recommendation:** keep today's entry. No engine option was added, because nothing passed. `live_model.json` is
  unchanged.

## What had already been tried (not redone, except as a reference row)

| Idea | Where | Result |
|---|---|---|
| Inner 1m inducement, 1m displacement / volume / absorption filters | lit-1m-management.md | worse in both halves |
| Patience: skip when the CISD close is > 0.25-0.5R above the limit, or > 10-20% to target | lit-1m-management.md | H1 only / worse |
| Pullback limit at the CISD candle's body / range 50% | lit-1m-management.md | worse in both |
| Refined limits after the CISD: 1m CISD level, FVG, FVG CE, order block, OB 50%, fib 50% (limit only) | lit-tight-stops-size.md | miss the best winners |
| Tight stops: 1m protected swing, 5m CISD candle, post-sweep higher low, inducement, ATR / fraction caps | lit-tight-stops-size.md, lit-experiments.md | win H1 only (size effect), lose H2 |
| Buy-stop above the 1m CISD candle | lit-untested-entries.md | H2 -$4.8k |
| Chasing a missed limit on a 1m pullback CISD | lit-untested-entries.md | H1 -$4.6k |
| ES SMT as size / filter / early trigger | lit-untested-entries.md | rejected |
| Two-stage entry (20-33% at the limit, rest on the 1m CISD) | lit-experiments.md | H2 -$2.4k to -$3.2k |
| Re-entry after a stop | lit-experiments.md | H1 down |
| Reclaim, confirmation deadline, acceptance, displacement quality | lit-report-tests.md | none adopted |
| Realistic fills: bot latency, stop slippage, target trade-through | lit-live-fills.md | ~$1.2k a year; fix the bot's timing |
| Trade selection by grade / model | lit-trade-selection.md | no out-of-sample skill |
| "Refined stop to the 1m sweep extreme" | this study | **the same stop as today**: the 1m bars rebuild the 5m bars exactly, so the 5m sweep low is the 1m sweep low |

## How it was tested

- **Same setups, same plan:** `tools/lit_entry_precision.py` wraps `engine/lit.py` (not edited) on the live settings
  (`live_model.json` "lit": lit_final + Monday rule + weekly stop). The setup list, the stop (1 tick beyond the sweep extreme,
  wick touch, filled 1 tick worse), the target price (VIX band, >= 1.5R re-measured from the real fill, banked at 8R),
  breakeven at 1R of the real risk and the 15:55 flat are the live ones. Only how and where the entry fills changes.
- **Check:** with every option off it gives the 120 trades of run `lit_live` trade for trade (+$41,734), and the live 2-week
  numbers of `lit_2wk_rec` (H1 52.9 / 8.4, H2 50.7 / 2.9).
- **Fills, no look-ahead:**
  - A resting limit fills only when price trades **through** it by 1 tick (variants: touch, 2 ticks), at the limit or at
    the bar's open on a gap.
  - The bar where a limit fills gets no target or breakeven credit.
  - Market entries cost 1 tick.
  - A decision on a bar's close acts from the next bar.
  - 2m / 3m / 5m confirmations use clock-aligned bars built from closed 1m bars.
- **Data:** CME NQ1! 5m and the 2026 1m file (`data/NQ_1m.csv`). Futures only. 2026 only (owner's LIT rule). There are no
  1m bars before 2026, so 2021-25 cannot test 1m entries.
- **Money:** the LIT rule ($800 up to a 20-pt stop, then 800×20/stop, weekly stop, the MFFU $1,000 soft daily loss).
  Costs are $1.40 a micro plus 1 tick.
- **Key metric (eval):** MFFU Builder 50K pass / fail within 10 sessions under the **live two_week sizing**:
  - one winner passes, capped at 60% of the room to the trailing max-loss floor;
  - the $1,000 soft daily loss, max 40 micros (`tools/lit_2wk.run_eval`);
  - a fresh eval started on every session of the half, plus a 4,000-path Monte Carlo.
- **Per original setup (report ch.5):**
  - Every 2026 setup that passes the live filters (222 in H1, 108 in H2) is simulated on its own, without the one-a-day
    queue.
  - Each fill is sized at one common budget U = $1,000 (whole micros at that rule's own stop distance).
  - A miss counts as $0.
  - The paired difference is per setup, with a 90% bootstrap band.
  - "Shared fills" are the setups both rules take. "Live fills it misses" is what live made on the setups the rule does
    not take. "Extra fills" are the setups only the rule takes.

## 1. The report's experiment: direct vs confirmation vs refined, per original setup

Per setup at U = $1,000. Live fills only 54.5% (H1) / 50.9% (H2) of the setups and still makes the most per setup.

| Branch | Half | Fill % | $ per setup | Δ vs live per setup (90% band) | Shared fills: Δ $ | Setups only this rule fills: $ |
|---|---|---:|---:|---:|---:|---:|
| **Live: tap, then 1m CISD, next open** | H1 | 54.5 | +277 | – | – | – |
| | H2 | 50.9 | +240 | – | – | – |
| Direct limit at the zone (1-tick trade-through) | H1 | 75.7 | +214 | −63 (−148 to +25) | 120: **+19,093** | 48: **−28,861** |
| | H2 | 72.2 | +140 | −100 (−329 to +140) | 54: −6,492 | 24: −621 |
| Direct limit, touch fill (optimistic) | H1 | 76.1 | +239 | −38 (−123 to +45) | 121: +20,395 | 48: −28,861 |
| | H2 | 73.1 | +212 | −27 (−261 to +211) | 55: −2,315 | 24: −621 |
| Delayed: 1m BOS | H1 | 39.2 | +219 | −58 (−158 to +32) | 86: −10,756 | 1: +1,639 (misses 35 live fills worth +3,749) |
| | H2 | 41.7 | +179 | −61 (−215 to +84) | 42: −9,650 | 3: +2,792 |
| Delayed: 3m CISD | H1 | 38.3 | +82 | −195 | – | – |
| | H2 | 27.8 | +69 | −171 | – | – |
| Refined: limit at the CISD close 1 min, else market | H1 | 54.5 | +276 | −1 (−11 to +8) | 121: −202 | 0 |
| | H2 | 51.9 | +220 | −19 (−43 to +1) | 55: −1,110 | 1: −969 |
| Refined: limit at the 1m FVG 3 min, else market | H1 | 55.0 | +287 | +10 (−9 to +31) | 121: +2,327 | 1: −10 |
| | H2 | 50.0 | +182 | −58 (−175 to +35) | 54: −2,749 | 0 (misses 1 live fill worth +3,477) |
| Refined: limit at the 1m CISD level 3 min, else market | H1 | 55.0 | +220 | −57 (−150 to +25) | 119: −2,103 | 3: +1,260 (misses 2 worth +11,852) |
| | H2 | 52.8 | +86 | −154 (−284 to −49) | 54: −11,221 | 3: −1,882 |

What it shows, in the report's own terms:
- **Direct-zone entry:** on the setups both take, the limit's better price is worth +$19k in H1. But in H2 the same shared
  trades lose $6.5k. The likely cause: the tighter risk puts the breakeven closer, so H2's normal dip scratches more
  winners (lit-1m-management.md: H2 winners dip a median 0.54R first). The 48 H1 setups
  that tap and never confirm cost $28.9k. **The confirmation pays for itself several times over.**
- **Delayed confirmation (BOS, 2m / 3m / 5m CISD):** it costs on both sides. The shared trades enter later (H1 −$10.8k) and
  it misses setups that live wins.
- **Refined limit:** a 1-minute limit at the CISD close is a wash (−$1 / −$19 a setup). Deeper limits (1m CISD level, 50%
  of the candle) miss the runaways that make LIT's money: −$151 to −$191 a setup in H2.
- The 90% bands of the paired differences all include or sit below zero in at least one half. None is a measured
  improvement.

## 2. The account path (one trade a day) and the 2-week eval at the live sizing

H1 = Jan 2 - Jun 30 (picked), H2 = Jul 1 - Oct 16 (check). $ on the LIT rule; eval columns with the live two_week sizing.
The most useful rows:

| Entry rule | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | Δ net | 2-wk pass / fail | MC 2-wk pass / fail |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Live** | H1 | 3.12 | 22.5 | 4.44 | +32,773 | 5,377 | −2,315 | – | **52.9 / 8.4** | 50.5 / 6.2 |
| | H2 | 2.56 | 35.0 | 2.46 | +8,962 | 2,413 | −1,466 | – | **50.7 / 2.9** | 55.4 / 5.5 |
| Limit at the CISD close 1 min, else market (closest miss) | H1 | 3.12 | 22.5 | 4.60 | +34,093 | 5,593 | −2,336 | +1,320 | 52.9 / 7.6 | 50.6 / 6.3 |
| | H2 | 2.56 | 35.0 | 2.41 | +8,785 | 2,365 | −1,542 | **−177** | 49.3 / 1.4 | 53.0 / 5.1 |
| Limit at the 1m FVG 3 min, else market | H1 | 3.12 | 22.5 | 4.67 | +34,053 | 5,587 | −2,227 | +1,280 | 53.8 / 6.7 | 53.0 / 4.1 |
| | H2 | 2.50 | 30.8 | 2.12 | +6,979 | 1,879 | −1,546 | −1,983 | 50.7 / 8.7 | 48.5 / 6.5 |
| Fill at the CISD candle close (vs next open) | H1 | 3.12 | 22.5 | 4.47 | +32,332 | 5,304 | −2,158 | −441 | 52.9 / 7.6 | 50.5 / 6.5 |
| | H2 | 2.56 | 35.0 | 2.40 | +8,713 | 2,346 | −1,510 | −249 | 50.7 / 4.3 | 55.3 / 6.4 |
| Direct limit at the zone (1-tick trade-through) | H1 | 3.67 | 19.1 | 2.15 | +19,918 | 3,268 | −3,417 | −12,855 | 45.4 / 9.2 | 46.0 / 7.1 |
| | H2 | 3.14 | 24.5 | 1.70 | +5,665 | 1,525 | −2,220 | −3,297 | 27.5 / 1.4 | 32.9 / 1.7 |
| 1m BOS instead of 1m CISD | H1 | 2.46 | 23.8 | 3.39 | +22,067 | 3,620 | −2,801 | −10,706 | 44.5 / 0.0 | 38.9 / 1.7 |
| | H2 | 2.24 | 31.4 | 1.64 | +3,520 | 948 | −1,711 | −5,442 | 52.2 / 0.0 | 45.5 / 4.0 |
| Tap tolerance 16 ticks (4 pts) | H1 | 3.48 | 21.3 | 3.21 | +24,538 | 4,026 | −3,148 | −8,235 | 41.2 / 13.4 | 44.5 / 10.1 |
| | H2 | 2.88 | 35.6 | 2.67 | +10,543 | 2,839 | −1,897 | +1,581 | 53.6 / 4.3 | 57.2 / 4.2 |
| Skip if the fill is > 0.5R above the zone | H1 | 2.93 | 24.0 | 5.05 | +35,622 | 5,844 | −2,061 | +2,849 | 53.8 / 8.4 | 51.8 / 5.2 |
| | H2 | 2.24 | 28.6 | 1.83 | +4,808 | 1,295 | −2,756 | −4,154 | 31.9 / 0.0 | 38.9 / 1.8 |
| Two-step: half limit, half 1m CISD | H1 | 3.67 | 21.3 | 3.01 | +25,385 | 4,165 | −2,961 | −7,388 | 46.2 / 6.7 | 42.3 / 4.9 |
| | H2 | 3.14 | 30.6 | 2.13 | +7,188 | 1,935 | −1,624 | −1,774 | 42.0 / 1.4 | 36.2 / 1.4 |

Back to back on 2026 at the live sizing (a new eval after a pass, a fail or 10 sessions):
- **Live:** 15 passes in 32 evals ($196 a pass at $91.80).
- **The closest miss:** the same 15 in 32.
- **Direct limit:** 12 in 29 ($222 a pass).

All 43 variants are in the appendix tables.

**Patterns across the grid:**
- **Every variant that wins H1 loses H2, and the other way round:**
  - H1 only: refined limits at the close or FVG, skip-if-ran-away 0.5R.
  - H2 only: tap tolerance 16 ticks, zone at 50% of the leg (which falls to 1.8 trades a week), a shallower zone
    (+$0.2k).
- **Waiting longer for the zone does not help.** 45 / 60 minutes instead of 30 costs $0.2-0.9k in H1 and is flat in H2.
  15 minutes costs $4.6k in H1.
- **A longer 1m confirmation window** (30 / 45 bars instead of 20) is flat in H1 and loses $1.3-3.2k in H2. A shorter one
  (10 bars) loses $20k in H1.
- **Entry tolerance** (counting a tap when price comes within 2-16 ticks): it loses $2.3-8.2k in H1 at every tolerance.

## Verdict

- **Keep today's entry.** It is the best of 43 in the pick half, and no variant beats it in both halves.
- Under the report's paired, per-setup comparison:
  - the confirmation step earns its missed fills: the setups it skips lose money;
  - refinement does not pay for its misses.
- No engine option was added: the task's rule is to implement only what passes H1 and H2. `engine/lit.py`,
  `live_model.json` and the live loop are unchanged.
- **Where "on the dot" can still be gained: execution, not rules.** `lit-live-fills.md` found that the PC bot buys about
  95 s late, ±7.5 pts. That costs more eval odds (pass rate 85% → 71%) than any rule here could add. The fix is to decide
  on the CISD bar's close and poll 2 s after each minute. That is the real "on the dot" work.

## Honest caveats

- **Small samples:** 120 trades in 2026 (80 / 40). The closest miss differs from live by about one trade's worth of $ in
  each half.
- **1-minute candles, not ticks:** inside a minute the stop is assumed to come first, and limit fills need a trade-through.
  That is conservative for limits; a touch-fill version is shown for the direct limit (still worse).
- **The two-step rule** is scored as one position. A missing leg trades nothing. It is approximate at small sizes (whole
  micros).
- **The per-setup table** runs each setup on its own. The account path (section 2) is the real one-a-day sequence. Both
  agree.
- **No 1m data before 2026:** no 2021-25 line for 1m entries.

## Files and how to rerun

- `python -X utf8 tools/lit_entry_precision.py check`: live mode == run `lit_live` (120 trades, +$41,734) and the live
  2-week numbers.
- `python -X utf8 tools/lit_entry_precision.py grid [prefix ...]`: every variant (or those whose name starts with a prefix)
  → `research/lit/entry_precision.json` (about 1.5 min a variant, 1 process).
- `python -X utf8 tools/lit_entry_precision.py save`: stores the runs `lit_ep_*` (family other, tags lit,
  lit_entry_precision).

## Appendix: every variant

### Account path, LIT-rule $ and the 2-week eval at the live sizing

| Entry rule | Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD | Δ net vs live | 2-wk pass/fail (live sizing) | MC 2-wk pass/fail |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **live: tap -> 1m CISD -> next open** | H1 | 3.12 | 22.5 | 4.44 | +32,773 | 5,377 | -2,315 | +0 | 52.9 / 8.4 | 50.5 / 6.2 |
|  | H2 | 2.56 | 35.0 | 2.46 | +8,962 | 2,413 | -1,466 | +0 | 50.7 / 2.9 | 55.4 / 5.5 |
| **A1 direct limit at the CISD level (1-tick trade-through)** | H1 | 3.67 | 19.1 | 2.15 | +19,918 | 3,268 | -3,417 | -12,855 | 45.4 / 9.2 | 46.0 / 7.1 |
|  | H2 | 3.14 | 24.5 | 1.7 | +5,665 | 1,525 | -2,220 | -3,297 | 27.5 / 1.4 | 32.9 / 1.7 |
| **A1 direct limit, touch fill** | H1 | 3.67 | 20.2 | 2.32 | +22,145 | 3,633 | -3,417 | -10,628 | 50.4 / 9.2 | 49.5 / 7.0 |
|  | H2 | 3.14 | 24.5 | 1.7 | +5,665 | 1,525 | -2,220 | -3,297 | 27.5 / 1.4 | 32.9 / 1.7 |
| **A1 direct limit, 2-tick trade-through** | H1 | 3.67 | 20.2 | 2.49 | +25,886 | 4,247 | -3,417 | -6,887 | 46.2 / 9.2 | 48.1 / 7.0 |
|  | H2 | 3.01 | 25.5 | 1.81 | +6,143 | 1,654 | -2,261 | -2,819 | 27.5 / 1.4 | 33.5 / 0.9 |
| **A2 confirmation: 1m BOS** | H1 | 2.46 | 23.8 | 3.39 | +22,067 | 3,620 | -2,801 | -10,706 | 44.5 / 0.0 | 38.9 / 1.7 |
|  | H2 | 2.24 | 31.4 | 1.64 | +3,520 | 948 | -1,711 | -5,442 | 52.2 / 0.0 | 45.5 / 4.0 |
| **A2 confirmation: 1m close back above the zone** | H1 | 3.36 | 18.6 | 1.89 | +14,101 | 2,313 | -5,133 | -18,672 | 34.5 / 10.9 | 35.8 / 10.0 |
|  | H2 | 2.76 | 20.9 | 2.29 | +7,848 | 2,113 | -1,905 | -1,114 | 46.4 / 1.4 | 37.8 / 2.5 |
| **A2 confirmation: CISD candle close (vs next open)** | H1 | 3.12 | 22.5 | 4.47 | +32,332 | 5,304 | -2,158 | -441 | 52.9 / 7.6 | 50.5 / 6.5 |
|  | H2 | 2.56 | 35.0 | 2.4 | +8,713 | 2,346 | -1,510 | -249 | 50.7 / 4.3 | 55.3 / 6.4 |
| **A2 confirmation: 1m CISD within 10 bars** | H1 | 2.38 | 19.7 | 2.54 | +12,670 | 2,079 | -2,361 | -20,103 | 29.4 / 0.0 | 35.4 / 1.2 |
|  | H2 | 2.18 | 35.3 | 2.47 | +8,032 | 2,163 | -1,430 | -930 | 43.5 / 0.0 | 48.0 / 4.0 |
| **A2 confirmation: 1m CISD within 30 bars** | H1 | 3.2 | 22.0 | 4.43 | +32,743 | 5,372 | -2,315 | -30 | 52.9 / 8.4 | 51.0 / 7.0 |
|  | H2 | 2.69 | 33.3 | 2.27 | +7,633 | 2,055 | -1,705 | -1,329 | 49.3 / 2.9 | 51.1 / 5.8 |
| **A2 confirmation: 1m CISD within 45 bars** | H1 | 3.2 | 22.0 | 4.4 | +32,693 | 5,364 | -2,315 | -80 | 52.9 / 8.4 | 51.0 / 7.1 |
|  | H2 | 2.76 | 30.2 | 1.86 | +5,731 | 1,543 | -1,705 | -3,231 | 47.8 / 7.2 | 45.4 / 6.5 |
| **A3 refined: limit at the CISD close 1 bar, else market** | H1 | 3.12 | 22.5 | 4.6 | +34,093 | 5,593 | -2,336 | +1,320 | 52.9 / 7.6 | 50.6 / 6.3 |
|  | H2 | 2.56 | 35.0 | 2.41 | +8,785 | 2,365 | -1,542 | -177 | 49.3 / 1.4 | 53.0 / 5.1 |
| **A3 refined: limit at the CISD close 2 bars, else market** | H1 | 3.12 | 22.5 | 4.6 | +34,087 | 5,592 | -2,336 | +1,314 | 52.9 / 7.6 | 50.6 / 6.5 |
|  | H2 | 2.5 | 30.8 | 2.17 | +7,658 | 2,062 | -1,902 | -1,304 | 40.6 / 1.4 | 49.0 / 5.2 |
| **A3 refined: limit at the CISD close 3 bars, else market** | H1 | 3.12 | 22.5 | 4.57 | +34,039 | 5,584 | -2,336 | +1,266 | 52.9 / 7.6 | 50.6 / 6.6 |
|  | H2 | 2.5 | 33.3 | 2.22 | +7,594 | 2,045 | -1,542 | -1,368 | 49.3 / 5.8 | 51.1 / 5.2 |
| **A3 refined: limit at the CISD close 5 bars, else market** | H1 | 3.12 | 22.5 | 4.51 | +33,897 | 5,561 | -2,336 | +1,124 | 52.9 / 7.6 | 50.0 / 7.4 |
|  | H2 | 2.5 | 30.8 | 2.17 | +7,674 | 2,066 | -1,902 | -1,288 | 42.0 / 1.4 | 49.0 / 5.2 |
| **A3 refined: limit at the CISD body 50% 2 bars, else market** | H1 | 3.09 | 21.5 | 3.98 | +31,376 | 5,148 | -3,745 | -1,397 | 48.7 / 5.9 | 47.9 / 6.3 |
|  | H2 | 2.5 | 25.6 | 1.2 | +1,391 | 374 | -3,594 | -7,571 | 36.2 / 0.0 | 34.6 / 5.6 |
| **A3 refined: limit at the CISD body 50% 5 bars, else market** | H1 | 3.09 | 21.5 | 3.86 | +30,691 | 5,035 | -4,075 | -2,082 | 49.6 / 7.6 | 48.2 / 6.8 |
|  | H2 | 2.44 | 21.1 | 1.05 | +385 | 104 | -3,519 | -8,577 | 37.7 / 0.0 | 35.8 / 5.7 |
| **A3 refined: limit at the 1m CISD level 3 bars, else market** | H1 | 3.09 | 22.8 | 3.26 | +23,916 | 3,924 | -3,793 | -8,857 | 46.2 / 6.7 | 43.5 / 5.7 |
|  | H2 | 2.5 | 25.6 | 1.35 | +2,246 | 605 | -2,779 | -6,716 | 37.7 / 5.8 | 40.5 / 7.0 |
| **A3 refined: limit at the 1m CISD level 5 bars, else market** | H1 | 3.09 | 22.8 | 2.96 | +21,692 | 3,559 | -4,103 | -11,081 | 48.7 / 5.0 | 45.8 / 6.5 |
|  | H2 | 2.5 | 23.1 | 1.32 | +2,162 | 582 | -3,448 | -6,800 | 39.1 / 0.0 | 42.8 / 6.5 |
| **A3 refined: limit at the 1m FVG 3 bars, else market** | H1 | 3.12 | 22.5 | 4.67 | +34,053 | 5,587 | -2,227 | +1,280 | 53.8 / 6.7 | 53.0 / 4.1 |
|  | H2 | 2.5 | 30.8 | 2.12 | +6,979 | 1,879 | -1,546 | -1,983 | 50.7 / 8.7 | 48.5 / 6.5 |
| **A3 refined: limit at the 1m FVG 5 bars, else market** | H1 | 3.12 | 22.5 | 4.48 | +33,166 | 5,441 | -2,227 | +393 | 52.9 / 6.7 | 52.9 / 3.9 |
|  | H2 | 2.5 | 28.2 | 2.16 | +7,518 | 2,024 | -1,796 | -1,444 | 52.2 / 4.3 | 50.3 / 6.6 |
| **B zone: 50% of the 5m displacement leg** | H1 | 1.8 | 19.6 | 4.04 | +20,364 | 3,341 | -2,610 | -12,409 | 42.9 / 0.0 | 39.8 / 0.7 |
|  | H2 | 1.73 | 33.3 | 3.07 | +10,308 | 2,775 | -1,925 | +1,346 | 63.8 / 0.0 | 55.0 / 0.4 |
| **B zone: the inducement level** | H1 | 2.93 | 17.3 | 2.9 | +20,607 | 3,381 | -3,541 | -12,166 | 39.5 / 16.0 | 36.0 / 8.6 |
|  | H2 | 2.69 | 31.0 | 2.08 | +7,664 | 2,063 | -2,790 | -1,298 | 53.6 / 7.2 | 51.5 / 3.8 |
| **B zone: the swept level** | H1 | 2.66 | 19.1 | 3.46 | +22,655 | 3,717 | -2,664 | -10,118 | 44.5 / 5.9 | 38.2 / 4.8 |
|  | H2 | 2.5 | 33.3 | 2.19 | +7,504 | 2,020 | -2,319 | -1,458 | 50.7 / 7.2 | 50.2 / 4.9 |
| **B zone: halfway CISD level - trigger close** | H1 | 3.44 | 21.6 | 3.41 | +26,866 | 4,408 | -2,480 | -5,907 | 42.0 / 7.6 | 44.9 / 10.6 |
|  | H2 | 2.82 | 29.5 | 2.52 | +9,141 | 2,461 | -1,823 | +179 | 46.4 / 7.2 | 48.1 / 5.6 |
| **B direct limit at 50% of the leg** | H1 | 2.89 | 10.8 | 1.31 | +6,843 | 1,123 | -5,653 | -25,930 | 44.5 / 6.7 | 35.6 / 6.5 |
|  | H2 | 2.5 | 15.4 | 1.45 | +3,757 | 1,011 | -2,764 | -5,205 | 31.9 / 2.9 | 26.4 / 1.7 |
| **B direct limit at the inducement level** | H1 | 3.55 | 14.3 | 1.81 | +14,575 | 2,391 | -4,266 | -18,198 | 47.1 / 17.6 | 40.7 / 12.4 |
|  | H2 | 3.14 | 18.4 | 1.5 | +4,362 | 1,174 | -2,186 | -4,600 | 42.0 / 2.9 | 41.7 / 6.8 |
| **B direct limit at the swept level** | H1 | 3.4 | 13.8 | 1.7 | +13,357 | 2,191 | -3,609 | -19,416 | 44.5 / 15.1 | 39.8 / 13.1 |
|  | H2 | 3.08 | 12.5 | 1.39 | +3,494 | 941 | -2,912 | -5,468 | 37.7 / 4.3 | 32.0 / 5.7 |
| **C tap tolerance 2 ticks** | H1 | 3.16 | 22.2 | 4.03 | +30,499 | 5,004 | -2,708 | -2,274 | 47.1 / 12.6 | 48.8 / 7.2 |
|  | H2 | 2.63 | 34.1 | 2.34 | +8,282 | 2,230 | -1,466 | -680 | 49.3 / 5.8 | 52.0 / 4.2 |
| **C tap tolerance 4 ticks** | H1 | 3.2 | 22.0 | 3.88 | +28,998 | 4,757 | -3,384 | -3,775 | 45.4 / 12.6 | 47.0 / 7.5 |
|  | H2 | 2.63 | 34.1 | 2.34 | +8,282 | 2,230 | -1,466 | -680 | 49.3 / 5.8 | 52.0 / 4.2 |
| **C tap tolerance 8 ticks** | H1 | 3.32 | 21.2 | 3.5 | +25,157 | 4,127 | -2,963 | -7,616 | 42.9 / 7.6 | 44.2 / 7.2 |
|  | H2 | 2.69 | 33.3 | 2.36 | +8,352 | 2,248 | -1,810 | -610 | 49.3 / 5.8 | 52.5 / 4.6 |
| **C tap tolerance 16 ticks** | H1 | 3.48 | 21.3 | 3.21 | +24,538 | 4,026 | -3,148 | -8,235 | 41.2 / 13.4 | 44.5 / 10.1 |
|  | H2 | 2.88 | 35.6 | 2.67 | +10,543 | 2,839 | -1,897 | +1,581 | 53.6 / 4.3 | 57.2 / 4.2 |
| **C zone valid 15 min** | H1 | 2.85 | 21.9 | 4.26 | +28,187 | 4,624 | -2,719 | -4,586 | 46.2 / 10.1 | 47.1 / 5.6 |
|  | H2 | 2.24 | 34.3 | 2.73 | +8,952 | 2,410 | -1,466 | -10 | 49.3 / 0.0 | 54.9 / 2.9 |
| **C zone valid 45 min** | H1 | 3.12 | 22.5 | 4.33 | +32,540 | 5,339 | -2,315 | -233 | 51.3 / 8.4 | 49.9 / 6.3 |
|  | H2 | 2.63 | 34.1 | 2.46 | +8,948 | 2,409 | -1,479 | -14 | 50.7 / 2.9 | 55.3 / 5.7 |
| **C zone valid 60 min** | H1 | 3.2 | 22.0 | 4.2 | +31,861 | 5,227 | -2,315 | -912 | 51.3 / 8.4 | 49.7 / 7.8 |
|  | H2 | 2.63 | 34.1 | 2.43 | +8,807 | 2,371 | -1,479 | -155 | 50.7 / 2.9 | 55.3 / 5.7 |
| **D skip if the fill is > 0.25R above the zone** | H1 | 2.38 | 21.3 | 4.09 | +27,733 | 4,550 | -2,603 | -5,040 | 45.4 / 0.0 | 44.2 / 1.5 |
|  | H2 | 1.79 | 28.6 | 1.69 | +3,399 | 915 | -1,595 | -5,563 | 42.0 / 0.0 | 35.3 / 0.3 |
| **D skip if the fill is > 0.5R above the zone** | H1 | 2.93 | 24.0 | 5.05 | +35,622 | 5,844 | -2,061 | +2,849 | 53.8 / 8.4 | 51.8 / 5.2 |
|  | H2 | 2.24 | 28.6 | 1.83 | +4,808 | 1,295 | -2,756 | -4,154 | 31.9 / 0.0 | 38.9 / 1.8 |
| **D skip if the fill is > 0.75R above the zone** | H1 | 3.12 | 22.5 | 4.44 | +32,773 | 5,377 | -2,315 | +0 | 52.9 / 8.4 | 50.5 / 6.2 |
|  | H2 | 2.37 | 32.4 | 2.01 | +6,090 | 1,639 | -2,408 | -2,872 | 37.7 / 0.0 | 47.1 / 3.2 |
| **D two-step: half limit at the zone, half on the 1m CISD** | H1 | 3.67 | 21.3 | 3.01 | +25,385 | 4,165 | -2,961 | -7,388 | 46.2 / 6.7 | 42.3 / 4.9 |
|  | H2 | 3.14 | 30.6 | 2.13 | +7,188 | 1,935 | -1,624 | -1,774 | 42.0 / 1.4 | 36.2 / 1.4 |
| **D two-step: 1/3 limit, 2/3 on the 1m CISD** | H1 | 3.67 | 21.3 | 3.49 | +27,882 | 4,574 | -2,864 | -4,891 | 50.4 / 8.4 | 44.0 / 5.3 |
|  | H2 | 3.14 | 30.6 | 2.2 | +7,067 | 1,903 | -1,491 | -1,895 | 42.0 / 1.4 | 36.5 / 1.8 |
| **E confirmation: 2m CISD (instead of 1m), next 1m open** | H1 | 2.58 | 24.2 | 2.28 | +13,356 | 2,191 | -2,216 | -19,417 | 42.9 / 5.0 | 41.3 / 4.7 |
|  | H2 | 1.86 | 37.9 | 2.55 | +5,463 | 1,471 | -932 | -3,499 | 49.3 / 0.0 | 44.1 / 1.0 |
| **E confirmation: 3m CISD (instead of 1m), next 1m open** | H1 | 2.3 | 15.3 | 1.4 | +3,827 | 628 | -4,293 | -28,946 | 24.4 / 5.0 | 27.6 / 5.5 |
|  | H2 | 1.67 | 30.8 | 1.46 | +1,712 | 461 | -1,593 | -7,250 | 34.8 / 4.3 | 29.2 / 2.5 |
| **E confirmation: 5m CISD (instead of 1m), next 1m open** | H1 | 1.95 | 18.0 | 2.05 | +7,285 | 1,195 | -2,800 | -25,488 | 25.2 / 0.0 | 24.1 / 2.0 |
|  | H2 | 1.47 | 30.4 | 1.42 | +1,642 | 442 | -1,161 | -7,320 | 34.8 / 0.0 | 30.2 / 1.3 |
| **E 3m CISD within 30 1m bars** | H1 | 2.58 | 16.7 | 1.57 | +6,071 | 996 | -3,327 | -26,702 | 29.4 / 3.4 | 32.3 / 7.7 |
|  | H2 | 1.92 | 36.7 | 2.05 | +4,220 | 1,136 | -1,593 | -4,742 | 43.5 / 4.3 | 40.1 / 2.4 |

### Per original setup (U = $1,000, a miss = $0)

| Entry rule | Half | Setups | Filled | Fill % | $ per setup | Δ $ per setup vs live (90% band) | Shared fills: Δ $ | Live fills it misses: live $ | Extra fills: $ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| live: tap -> 1m CISD -> next open | H1 | 222 | 121 | 54.5 | +277 | +0 (+0 to +0) | 121: +0 | 0: +0 | 0: +0 |
|  | H2 | 108 | 55 | 50.9 | +240 | +0 (+0 to +0) | 55: +0 | 0: +0 | 0: +0 |
| A1 direct limit at the CISD level (1-tick trade-through) | H1 | 222 | 168 | 75.7 | +214 | -63 (-148 to +25) | 120: +19,093 | 1: +4,191 | 48: -28,861 |
|  | H2 | 108 | 78 | 72.2 | +140 | -100 (-329 to +140) | 54: -6,492 | 1: +3,703 | 24: -621 |
| A1 direct limit, touch fill | H1 | 222 | 169 | 76.1 | +239 | -38 (-123 to +45) | 121: +20,395 | 0: +0 | 48: -28,861 |
|  | H2 | 108 | 79 | 73.1 | +212 | -27 (-261 to +211) | 55: -2,315 | 0: +0 | 24: -621 |
| A1 direct limit, 2-tick trade-through | H1 | 222 | 167 | 75.2 | +214 | -63 (-148 to +25) | 119: +19,115 | 2: +4,166 | 48: -28,861 |
|  | H2 | 108 | 76 | 70.4 | +158 | -82 (-311 to +159) | 52: -6,541 | 3: +1,719 | 24: -591 |
| A2 confirmation: 1m BOS | H1 | 222 | 87 | 39.2 | +219 | -58 (-158 to +32) | 86: -10,756 | 35: +3,749 | 1: +1,639 |
|  | H2 | 108 | 45 | 41.7 | +179 | -61 (-214 to +84) | 42: -9,650 | 13: -311 | 3: +2,792 |
| A2 confirmation: 1m close back above the zone | H1 | 222 | 141 | 63.5 | +166 | -111 (-212 to -17) | 115: +10,603 | 6: +21,053 | 26: -14,103 |
|  | H2 | 108 | 64 | 59.3 | +197 | -42 (-234 to +150) | 50: -2,379 | 5: +1,582 | 14: -621 |
| A2 confirmation: CISD candle close (vs next open) | H1 | 222 | 121 | 54.5 | +277 | +0 (-4 to +4) | 121: +2 | 0: +0 | 0: +0 |
|  | H2 | 108 | 55 | 50.9 | +233 | -7 (-16 to +0) | 55: -770 | 0: +0 | 0: +0 |
| A2 confirmation: 1m CISD within 10 bars | H1 | 222 | 88 | 39.6 | +158 | -119 (-241 to -4) | 88: +0 | 33: +26,473 | 0: +0 |
|  | H2 | 108 | 43 | 39.8 | +190 | -49 (-144 to +30) | 43: +0 | 12: +5,333 | 0: +0 |
| A2 confirmation: 1m CISD within 30 bars | H1 | 222 | 124 | 55.9 | +272 | -5 (-14 to -0) | 121: +0 | 0: +0 | 3: -1,062 |
|  | H2 | 108 | 60 | 55.6 | +234 | -6 (-23 to +7) | 55: +0 | 0: +0 | 5: -610 |
| A2 confirmation: 1m CISD within 45 bars | H1 | 222 | 125 | 56.3 | +272 | -5 (-14 to -0) | 121: +0 | 0: +0 | 4: -1,132 |
|  | H2 | 108 | 62 | 57.4 | +216 | -24 (-51 to +0) | 55: +0 | 0: +0 | 7: -2,574 |
| A3 refined: limit at the CISD close 1 bar, else market | H1 | 222 | 121 | 54.5 | +276 | -1 (-11 to +8) | 121: -202 | 0: +0 | 0: +0 |
|  | H2 | 108 | 56 | 51.9 | +220 | -19 (-43 to +0) | 55: -1,110 | 0: +0 | 1: -969 |
| A3 refined: limit at the CISD close 2 bars, else market | H1 | 222 | 121 | 54.5 | +276 | -1 (-11 to +8) | 121: -251 | 0: +0 | 0: +0 |
|  | H2 | 108 | 54 | 50.0 | +180 | -60 (-130 to -7) | 53: -100 | 2: +5,410 | 1: -969 |
| A3 refined: limit at the CISD close 3 bars, else market | H1 | 222 | 121 | 54.5 | +277 | -0 (-10 to +9) | 121: -6 | 0: +0 | 0: +0 |
|  | H2 | 108 | 55 | 50.9 | +188 | -52 (-119 to -4) | 54: -1,183 | 1: +3,477 | 1: -969 |
| A3 refined: limit at the CISD close 5 bars, else market | H1 | 222 | 121 | 54.5 | +278 | +1 (-8 to +9) | 121: +128 | 0: +0 | 0: +0 |
|  | H2 | 108 | 54 | 50.0 | +180 | -59 (-129 to -6) | 53: -36 | 2: +5,410 | 1: -969 |
| A3 refined: limit at the CISD body 50% 2 bars, else market | H1 | 222 | 120 | 54.1 | +242 | -35 (-107 to +28) | 118: +2,777 | 3: +11,841 | 2: +1,252 |
|  | H2 | 108 | 55 | 50.9 | +88 | -152 (-286 to -42) | 53: -10,943 | 2: +5,410 | 2: -25 |
| A3 refined: limit at the CISD body 50% 5 bars, else market | H1 | 222 | 119 | 53.6 | +237 | -40 (-103 to +15) | 117: -2,061 | 4: +7,983 | 2: +1,252 |
|  | H2 | 108 | 54 | 50.0 | +49 | -191 (-342 to -68) | 52: -11,460 | 3: +9,113 | 2: -25 |
| A3 refined: limit at the 1m CISD level 3 bars, else market | H1 | 222 | 122 | 55.0 | +220 | -57 (-150 to +25) | 119: -2,103 | 2: +11,852 | 3: +1,260 |
|  | H2 | 108 | 57 | 52.8 | +86 | -154 (-284 to -49) | 54: -11,221 | 1: +3,477 | 3: -1,882 |
| A3 refined: limit at the 1m CISD level 5 bars, else market | H1 | 222 | 121 | 54.5 | +229 | -48 (-130 to +26) | 118: -3,899 | 3: +7,994 | 3: +1,260 |
|  | H2 | 108 | 55 | 50.9 | +89 | -151 (-284 to -42) | 53: -9,901 | 2: +5,410 | 2: -1,005 |
| A3 refined: limit at the 1m FVG 3 bars, else market | H1 | 222 | 122 | 55.0 | +287 | +10 (-9 to +31) | 121: +2,327 | 0: +0 | 1: -10 |
|  | H2 | 108 | 54 | 50.0 | +182 | -58 (-175 to +35) | 54: -2,749 | 1: +3,477 | 0: +0 |
| A3 refined: limit at the 1m FVG 5 bars, else market | H1 | 222 | 121 | 54.5 | +289 | +12 (-7 to +32) | 120: +2,617 | 1: -11 | 1: -10 |
|  | H2 | 108 | 53 | 49.1 | +180 | -59 (-180 to +44) | 53: -979 | 2: +5,410 | 0: +0 |
| B zone: 50% of the 5m displacement leg | H1 | 222 | 59 | 26.6 | +164 | -112 (-250 to +17) | 56: +1,907 | 65: +26,185 | 3: -672 |
|  | H2 | 108 | 31 | 28.7 | +179 | -61 (-228 to +88) | 27: +2,695 | 28: +10,671 | 4: +1,382 |
| B zone: the inducement level | H1 | 222 | 118 | 53.2 | +163 | -114 (-221 to -14) | 91: -3,190 | 30: +16,913 | 27: -5,101 |
|  | H2 | 108 | 57 | 52.8 | +264 | +24 (-109 to +163) | 44: +768 | 11: +4,700 | 13: +6,500 |
| B zone: the swept level | H1 | 222 | 103 | 46.4 | +168 | -109 (-224 to +4) | 79: -1,469 | 42: +20,580 | 24: -2,174 |
|  | H2 | 108 | 52 | 48.1 | +236 | -4 (-168 to +153) | 42: -1,071 | 13: +7,265 | 10: +7,894 |
| B zone: halfway CISD level - trigger close | H1 | 222 | 135 | 60.8 | +237 | -40 (-90 to +9) | 116: -6,170 | 5: -2,847 | 19: -5,480 |
|  | H2 | 108 | 62 | 57.4 | +246 | +6 (-121 to +137) | 51: -2,186 | 4: +2,810 | 11: +5,636 |
| B direct limit at 50% of the leg | H1 | 222 | 106 | 47.7 | +41 | -236 (-392 to -91) | 69: +13,969 | 52: +38,547 | 37: -27,855 |
|  | H2 | 108 | 53 | 49.1 | +61 | -179 (-463 to +104) | 31: -13,754 | 24: +14,571 | 22: +9,042 |
| B direct limit at the inducement level | H1 | 222 | 162 | 73.0 | +103 | -174 (-310 to -28) | 95: -6,564 | 26: +20,755 | 67: -11,339 |
|  | H2 | 108 | 79 | 73.1 | +170 | -70 (-294 to +151) | 49: -8,062 | 6: +3,827 | 30: +4,320 |
| B direct limit at the swept level | H1 | 222 | 145 | 65.3 | +90 | -187 (-322 to -43) | 85: -1,179 | 36: +26,345 | 60: -13,967 |
|  | H2 | 108 | 77 | 71.3 | +83 | -157 (-418 to +100) | 47: -11,589 | 8: +11,164 | 30: +5,814 |
| C tap tolerance 2 ticks | H1 | 222 | 123 | 55.4 | +273 | -4 (-17 to +9) | 121: +82 | 0: +0 | 2: -1,045 |
|  | H2 | 108 | 56 | 51.9 | +240 | -0 (-17 to +16) | 55: +891 | 0: +0 | 1: -897 |
| C tap tolerance 4 ticks | H1 | 222 | 124 | 55.9 | +259 | -18 (-46 to +4) | 121: -2,930 | 0: +0 | 3: -1,075 |
|  | H2 | 108 | 56 | 51.9 | +240 | -0 (-17 to +16) | 55: +891 | 0: +0 | 1: -897 |
| C tap tolerance 8 ticks | H1 | 222 | 130 | 58.6 | +254 | -23 (-63 to +22) | 119: -4,573 | 2: -2,010 | 11: -2,527 |
|  | H2 | 108 | 57 | 52.8 | +240 | +0 (-26 to +27) | 54: +891 | 1: -1,004 | 3: -1,863 |
| C tap tolerance 16 ticks | H1 | 222 | 135 | 60.8 | +246 | -30 (-84 to +26) | 119: -7,482 | 2: -1,000 | 16: -298 |
|  | H2 | 108 | 60 | 55.6 | +310 | +70 (-20 to +184) | 53: +39 | 2: -2,014 | 7: +5,558 |
| C zone valid 15 min | H1 | 222 | 109 | 49.1 | +247 | -30 (-97 to +26) | 109: +0 | 12: +6,654 | 0: +0 |
|  | H2 | 108 | 46 | 42.6 | +176 | -63 (-181 to +35) | 46: +0 | 9: +6,837 | 0: +0 |
| C zone valid 45 min | H1 | 222 | 124 | 55.9 | +268 | -8 (-17 to +0) | 121: +0 | 0: +0 | 3: -1,874 |
|  | H2 | 108 | 56 | 51.9 | +239 | -0 (-1 to +0) | 55: +0 | 0: +0 | 1: -28 |
| C zone valid 60 min | H1 | 222 | 128 | 57.7 | +252 | -25 (-42 to -9) | 121: +0 | 0: +0 | 7: -5,596 |
|  | H2 | 108 | 58 | 53.7 | +248 | +9 (-1 to +27) | 55: +0 | 0: +0 | 3: +945 |
| D skip if the fill is > 0.25R above the zone | H1 | 222 | 73 | 32.9 | +200 | -77 (-180 to +24) | 73: +0 | 48: +16,994 | 0: +0 |
|  | H2 | 108 | 32 | 29.6 | +105 | -135 (-315 to +26) | 32: +0 | 23: +14,551 | 0: +0 |
| D skip if the fill is > 0.5R above the zone | H1 | 222 | 108 | 48.6 | +312 | +36 (+18 to +57) | 108: +0 | 13: -7,890 | 0: +0 |
|  | H2 | 108 | 44 | 40.7 | +180 | -60 (-176 to +44) | 44: +0 | 11: +6,451 | 0: +0 |
| D skip if the fill is > 0.75R above the zone | H1 | 222 | 121 | 54.5 | +277 | +0 (+0 to +0) | 121: +0 | 0: +0 | 0: +0 |
|  | H2 | 108 | 51 | 47.2 | +190 | -50 (-135 to +26) | 51: +0 | 4: +5,341 | 0: +0 |
| D two-step: half limit at the zone, half on the 1m CISD | H1 | 222 | 169 | 76.1 | +234 | -43 (-84 to -1) | 121: +4,948 | 0: +0 | 48: -14,430 |
|  | H2 | 108 | 79 | 73.1 | +193 | -47 (-156 to +62) | 55: -4,747 | 0: +0 | 24: -311 |
| D two-step: 1/3 limit, 2/3 on the 1m CISD | H1 | 222 | 169 | 76.1 | +248 | -29 (-55 to -1) | 121: +3,220 | 0: +0 | 48: -9,620 |
|  | H2 | 108 | 79 | 73.1 | +202 | -38 (-110 to +34) | 55: -3,901 | 0: +0 | 24: -207 |
| E confirmation: 2m CISD (instead of 1m), next 1m open | H1 | 222 | 97 | 43.7 | +142 | -134 (-255 to -27) | 91: -18,731 | 30: +8,446 | 6: -2,650 |
|  | H2 | 108 | 39 | 36.1 | +215 | -25 (-153 to +78) | 37: -5,943 | 18: -4,240 | 2: -1,010 |
| E confirmation: 3m CISD (instead of 1m), next 1m open | H1 | 222 | 85 | 38.3 | +82 | -195 (-325 to -67) | 85: -19,870 | 36: +23,350 | 0: +0 |
|  | H2 | 108 | 30 | 27.8 | +69 | -171 (-352 to -15) | 27: -7,445 | 28: +10,060 | 3: -938 |
| E confirmation: 5m CISD (instead of 1m), next 1m open | H1 | 222 | 60 | 27.0 | +108 | -169 (-311 to -31) | 59: -14,228 | 62: +23,225 | 1: -11 |
|  | H2 | 108 | 27 | 25.0 | +70 | -170 (-342 to -14) | 27: -5,994 | 28: +12,358 | 0: +0 |
| E 3m CISD within 30 1m bars | H1 | 222 | 99 | 44.6 | +89 | -188 (-312 to -71) | 97: -24,367 | 24: +17,293 | 2: -70 |
|  | H2 | 108 | 39 | 36.1 | +126 | -113 (-262 to +17) | 34: -11,720 | 21: +96 | 5: -426 |
