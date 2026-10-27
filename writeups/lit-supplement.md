## In one minute (owner summary)

- **I tested the supplement's ideas on the live LIT: 8 ideas, 21 versions.** None makes clearly more money. **Keep LIT as it is.**
- Live LIT for comparison (2026, costs in): 120 trades, 2.91 a week, PF 4.07, **+$43,394 (~$4,420 a month)**, max DD -$2,196.
  H1 (Jan-Jun, where a rule is picked) +$33,901; **H2 (Jul-Oct, the check) +$9,493**. Eval path (two_week): 2-week pass / fail
  57.1 / 5.9 % (H1) and 52.2 / 0.0 % (H2).
- **One rule passes on paper:** count a low/high that came within **1 tick** of a level as "swept" (equal lows/highs). It
  makes +$346 in H1 and +$677 in H2, the eval odds do not move. That is one H1 trade, the 2-tick version loses $4,100 in
  H1, and a random-skip placebo explains each half on its own 10-19% of the time. **Too small and too fragile to switch on.**
- **The most tempting one is a trap:** "the inducement must sit inside the leg" makes +$4,800 in H2, but it loses $173 in
  H1 (where we pick) and the H2 gain is one new $4,322 winner on Aug 11. Not adopted.
- Everything else **loses money**, some a lot: demanding a wick-only or a body inducement take (-$9k to -$14k in 2026),
  moving the CISD threshold to a wick probe (-$7.5k), the second-shift re-arm (-$3.1k in H1), skipping countertrend trades
  after the other side's VIX objective was hit (-$3.8k).

## The ideas as rules (fixed before any result)

All rules read only bars up to the setup's trigger bar (the moment the limit is placed). Skip = the setup is removed and
the day stays free for a later setup; half = the same trade at half size (eval path: unit size x0.5).

| # | Supplement idea | Variants |
|---|---|---|
| 1 | S07 path history: the trade's own objective (18:00 open +/- 1 VIX move) already traded earlier today | 1a skip, 1b half |
| 2 | S24/S25 trap geometry: an inducement counted by the live rule must be inside the leg (swing formed after the leg's swing high), optionally also in front of the entry (below the limit for a long) | 2a inside: skip, 2b inside + front: skip, 2c same: half |
| 3 | S15/S16 IDM taken vs reclaimed | 3a take bar closes back (wick take), 3b close back within 2 bars, 3c body close beyond (all skip) |
| 4 | S01/S11 required raid: an untaken HIGHER-tier pool (PM > PW > PD > session box > build-up) sits just beyond the extreme | 4a within 0.5 ATR skip, 4b 1.0 ATR skip, 4c 1.0 ATR half |
| 5 | S05 second shift after a failed first: a deeper sweep within 36 bars of a first setup inherits the first's trap (inducements + swept levels) | 5a 24-bar sweep window, 5b also the setups a 48-bar window finds |
| 6 | S02 completed cycle: the OTHER side's VIX objective was hit today before the setup = countertrend | 6a skip, 6b half, 6c skip only when the swept level is older than that hit |
| 7 | S13/S22 equality policy (every level moved toward price) | 7a 1 tick counts as swept, 7b 2 ticks, 7c must go > 2 ticks beyond |
| 8 | S26 CISD threshold moves to a wick probe between the extreme and the trigger | 8a skip if the trigger is not above it, 8b trigger on the first later close above it (6 bars) |

Idea 1 with "the draw is the nearest opposing pool" was not redone: that is the double-sided sweep of `lit-report-tests.md`.

## Results (2026 = Jan 2 - Oct 16, costs in, LIT size rule; eval = two_week path)

| Variant | 2026 /wk | win % | PF | 2026 net | $/mo | max DD | H1 net (PF) | H2 net (PF) | eval 2-wk H1 | eval 2-wk H2 | 2021-25 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **live LIT** | 2.91 | 55.0 | 4.07 | +$43,394 | ~$4,420 | -$2,196 | +$33,901 (4.98) | +$9,493 (2.69) | 57.1 / 5.9 | 52.2 / 0.0 | +$1,265 |
| 7a equal 1 tick = swept **(passes)** | 2.79 | 57.4 | 4.38 | +$44,417 | ~$4,530 | -$2,196 | +$34,247 (5.19) | +$10,170 (3.06) | 57.1 / 5.9 | 52.2 / 0.0 | +$5,587 |
| 2a inducement inside the leg | 2.38 | 57.1 | 5.41 | +$48,010 | ~$4,900 | -$2,095 | +$33,728 (5.93) | +$14,281 (4.52) | 55.5 / 0.0 | 68.1 / 4.3 | -$649 |
| 4a/4b higher-tier pool beyond: skip | 2.79 | 53.9 | 3.99 | +$41,783 | ~$4,260 | -$2,196 | +$34,059 (5.07) | +$7,724 (2.37) | 57.1 / 5.9 | 40.6 / 0.0 | +$4,155 / +$683 |
| 4c same: half | 2.91 | 55.0 | 4.03 | +$42,497 | ~$4,330 | -$2,196 | +$34,035 (5.06) | +$8,462 (2.50) | 57.1 / 5.9 | 43.5 / 0.0 | +$1,240 |
| 1b target visited: half | 2.91 | 55.0 | 4.03 | +$42,925 | ~$4,380 | -$2,196 | +$33,431 (4.92) | +$9,493 (2.69) | 57.1 / 5.9 | 52.2 / 0.0 | +$1,025 |
| 1a target visited: skip | 2.89 | 54.6 | 4.00 | +$42,455 | ~$4,330 | -$2,196 | +$32,962 (4.87) | +$9,493 (2.69) | 57.1 / 5.9 | 52.2 / 0.0 | -$369 |
| 6b opposite objective hit: half | 2.91 | 55.0 | 4.16 | +$42,250 | ~$4,310 | -$2,082 | +$33,937 (5.23) | +$8,313 (2.55) | 50.4 / 3.4 | 52.2 / 0.0 | +$1,871 |
| 6c same, older level: skip | 2.60 | 56.1 | 4.21 | +$41,211 | ~$4,200 | -$1,969 | +$33,670 (5.30) | +$7,541 (2.50) | 56.3 / 0.0 | 52.2 / 0.0 | +$1,617 |
| 5a/5b second shift re-arm | 2.94 | 53.7 | 3.65 | +$40,301 | ~$4,110 | -$3,326 | +$30,808 (4.21) | +$9,493 (2.69) | 57.1 / 9.2 | 52.2 / 0.0 | -$589 / +$1,215 |
| 6a opposite objective hit: skip | 2.55 | 54.3 | 4.03 | +$39,628 | ~$4,040 | -$1,969 | +$32,446 (5.02) | +$7,182 (2.43) | 50.4 / 0.0 | 50.7 / 0.0 | +$2,087 |
| 7b equal 2 ticks = swept | 2.77 | 56.1 | 3.96 | +$39,406 | ~$4,020 | -$2,196 | +$29,770 (4.72) | +$9,636 (2.82) | 54.6 / 5.9 | 52.2 / 2.9 | +$5,845 |
| 7c sweep must go > 2 ticks | 3.18 | 50.4 | 3.01 | +$36,844 | ~$3,760 | -$4,495 | +$27,571 (3.55) | +$9,273 (2.24) | 47.1 / 7.6 | 50.7 / 7.2 | +$100 |
| 8b CISD threshold to wick, later trigger | 2.72 | 51.8 | 3.45 | +$35,886 | ~$3,660 | -$2,372 | +$26,384 (3.93) | +$9,501 (2.69) | 45.4 / 1.7 | 52.2 / 0.0 | -$2,541 |
| 8a CISD threshold to wick, skip | 2.69 | 50.5 | 3.23 | +$33,975 | ~$3,460 | -$2,372 | +$26,359 (3.93) | +$7,616 (2.22) | 45.4 / 1.7 | 47.8 / 7.2 | -$7,941 |
| 2c inside + front: half | 2.91 | 55.0 | 4.17 | +$30,090 | ~$3,070 | -$1,832 | +$24,615 (5.28) | +$5,475 (2.46) | 33.6 / 0.0 | 29.0 / 0.0 | +$5,392 |
| 3b inducement reclaimed | 2.40 | 52.5 | 3.40 | +$29,937 | ~$3,050 | -$2,521 | +$26,680 (4.65) | +$3,257 (1.63) | 50.4 / 1.7 | 43.5 / 7.2 | -$7,305 |
| 3a wick take | 1.99 | 53.7 | 3.86 | +$29,108 | ~$2,970 | -$2,521 | +$22,160 (4.32) | +$6,949 (2.98) | 50.4 / 1.7 | 50.7 / 0.0 | -$13,201 |
| 3c body take | 1.92 | 51.9 | 3.72 | +$29,043 | ~$2,960 | -$1,847 | +$23,522 (4.72) | +$5,521 (2.26) | 48.7 / 0.0 | 34.8 / 5.8 | -$4,951 |
| 2b inside + front: skip | 1.17 | 52.1 | 3.95 | +$19,367 | ~$1,970 | -$2,237 | +$12,969 (3.79) | +$6,398 (4.36) | 33.6 / 0.0 | 46.4 / 0.0 | +$10,418 |

$ a month = 2026 net / 9.8 months. 2021-25 has 5m bars only (no 1m CISD, no 15-minute check): a reference line, not a gate.

## The one that passes: equal within 1 tick counts as swept (7a)

- What changes in 2026: 6 trades go, 1 comes in, all losers out: Jun 2 (-$346, the only H1 change), Aug 28, Sep 2, Sep 14,
  Sep 21, Oct 5. Mostly build-up sweeps: when a level was already touched to the tick earlier, its "first breach" moves
  earlier and the late sweep is no longer counted as fresh.
- Why not adopt: the H1 gain is one trade; the next setting (2 ticks) loses $4,131 in H1; paired day bootstrap P(no gain)
  0.37 (H1) / 0.20 (H2); placebo (200 draws of random skips of the same count, 1 in H1 / 5 in H2) beats the H1 gain 10.5%
  of the time and the H2 gain 19% (never both together). With 21 tests, one pass this size is what chance gives. 2021-25
  +$4.3k agrees in sign. Paper-only JSON if the owner ever wants it watched: level tolerance 0.25 pt (a research Market
  subclass, `tools/lit_supplement.py MarketEq`, there is no live_model switch).

## Honest notes

- **Multiple testing:** 21 variants. Expected false "passes" at this bar: about 1. We got 1.
- **Look-ahead:** `python -X utf8 tools/lit_supplement.py lookahead` overwrites every bar after the trigger with noise on
  400 setups: no feature changed. A deliberately leaky feature (close 3 bars later) was caught on 40 of 100 setups, so the
  check works.
- The 2a gain is one trade (Aug 11, new +$4,322 target winner replacing a -$276 stop); it also drops 29 trades and gets to
  2.12 a week in H2. Rejected by the H1 rule, and it would be picking on H2.
- 2b shows that in LIT the inducement sits almost always ABOVE the CISD limit (84 of 120 trades fail "in front of the
  entry"): the supplement's "IDM in front of the block" geometry is not how LIT's inducement works on NQ 5m.
- The re-arm (5) flagged ~800 setups but only 2 new trades came: the deeper setups fall on days already traded or fail the
  8-80 pt stop. The ones that did trade lost.
- `engine/lit.py` and `live_model*.json` are untouched; `python -X utf8 -m tests.test_lit_live` still replays 120/120.
- Data: TradingView CME NQ1! exports only (5m 2021-11 -> 2026-10-16, 1m for 2026). Numbers in `research/lit/supplement.json`.
