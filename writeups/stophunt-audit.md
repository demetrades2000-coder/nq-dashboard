## In one minute

- **The question:** are the two stop-hunt leads from `stophunt.md` real, or did a search of 28.7 million variants just find
  lucky ones? I tried to break them with 7 checks. Default answer: "not real" unless the evidence survives.
- **The code is clean.** My own rewrite of the rules (`tools/stophunt_audit.py`, no import of `engine/stophunt.py`) gives
  the same trades, every field equal. There is no look-ahead, and normal costs do not kill either lead.
- **The proof is not clean.** The two leads were not the pick rule's own number-1 choices. They came from deeper in the
  shortlists, and they are the ones with the best (trend) and 2nd-best (Asia) 2026 H2 results there. So the "untouched H2
  check" was very likely looked at when choosing.
- **A truly fresh test fails.** I re-ran the researcher's own search using only data up to 2024-12-31, then checked the
  picks on 2025 and 2026:
  - The generic search's picks lose money in 2025 and 2026.
  - In the trend family all 12 shortlist picks lose in 2025 and in 2026 H2.
  - In the Asia family the picks stay positive in 2026 H2 (12/12) but make little in 2025 and H1. They are other settings,
    not the lead.
- **Eval odds:** the pass rates reproduce exactly, but "0 fails in 2 weeks" hides the stuck accounts. 30-42% of evals are
  dead within 2 weeks in 2025 and 2021-24.
- **Verdict:**
  - **Asia resweep hunt: WEAK.** Paper only. There is some real-looking support for the region (Asia, 15m swings, big
    candle), but none for these exact settings.
  - **Trend inducement hunt: NOT REAL.** Everything good about it is in-sample or chosen with H2 in view.
  - No eval, no real money, no change to LIT or ATLAS.

## The checks and what they found

| # | check | Asia resweep hunt | Trend inducement hunt |
|---|---|---|---|
| 1 | Independent rewrite, trade for trade | **PASS** 558/558 identical (entry, stop, target, exit, kind, size, $) | **PASS** 467/467 identical |
| 2 | Look-ahead (cut data, causal pools / 1h trend / ATR, fills after the order, stop before target) | **PASS** 30/30; 0 bars with stop and target together | **PASS** 30/30; 2 such bars (scored as stop) |
| 3 | Costs and fills (+1 / +2 ticks, night tick, trade-through, BE ordering, 5 min late) | **PASS (dented)**: +1 tick + night keeps 95% of 2026, 90% of 2025, 78% of 2021-24; worst case 2021-24 half | **PASS**: +1 tick + night keeps 98-99% of 2026, 94-97% before; 5 min late halves H2 and kills 2025 |
| 4 | Robustness (each parameter one step, drop best trades, years, months, side, weekday) | **MIXED**: 95% of 40 neighbours positive in all 4 periods, every year positive; but H2 is -$20 without its 3 best trades, and the whole edge sits in 15m swings | **MIXED**: 98% of 40 neighbours positive in all 4; every year positive (2024 only +$2.3k, PF 1.11); H2 +$168 without its 5 best |
| 5 | True out-of-sample (search re-run on 2021-11..2024-12, tested on 2025 + 2026) | **FAIL for the variant, partial for the family**: the lead ranks ~12,000th; the family's pre-2025 picks are positive in H2 12/12 but weak in 2025 / H1 | **FAIL**: the lead is not even eligible; the family's pre-2025 picks lose in 2025 (0/12 positive) and H2 (0/12) |
| 6 | Multiple testing (rank in shortlist, H2 alone, deflated Sharpe) | **FAIL**: rank 9 of 12, 2nd-best H2 of 12; H2 p 0.21-0.25 (best-of-12 0.94); DSR 0.05 at N = 1,000, 0.00 at the family's 860k | **FAIL**: rank 10 of 12, best H2 of 12; H2 p 0.03-0.05, best-of-12 0.32-0.44; DSR 0.33 at N = 1,000, 0.00 at 1.5M |
| 7 | Eval path, ATLAS 25K + hunt | **PASS on numbers, FAIL on the "0 fails" wording**: reproduces 79.8 / 56.5 / 30.1 / 32.5%; beats a random-time placebo member by +21 / +18 / +1 / +7 points; dead in 2 weeks 0.8 / 5.8 / **40.6 / 40.7%** | **FAIL**: reproduces 61.3 / 59.4 / 39.4 / 30.4%; H1 no better than random (62.3%), the flipped-direction twin passes more in H1 (73.9%); dead 8.4 / 4.3 / **29.7 / 41.6%** |
| | **Verdict** | **WEAK** - paper only | **NOT REAL** |

Periods are 2026 H1 (Jan 2 - Jun 30), 2026 H2 (Jul 1 - Oct 16), 2025 and 2021-24. Money is at $500 risk a trade with the
researcher's costs ($1.90 a micro, 1 tick on market entries and stop / time / flat exits), unless stated.

## 1. Independent rewrite

- `tools/stophunt_audit.py` rebuilds everything from the raw `data/NQ_5m.csv` and `data/NQ_1m.csv`: pools, hunts, resweep /
  inducement, trigger candle, fills, the trade walk and the one-position rule. It does not import `engine/stophunt.py`.
- **Result: identical.** Asia 558 of 558 trades and trend 467 of 467 match on every field (entry, stop, target, exit, exit
  kind, micros, $). Both give the same period totals: Asia +$8,139 / +$2,915 / +$10,990 / +$22,705, trend +$6,536 / +$4,916 /
  +$13,384 / +$26,349.
- **The plain-language rules are not enough to rebuild the strategy.** To match I needed 14 details that are only in the
  researcher's code comments. They are listed in `audit.json` ("hidden_rule_details"), for example:
  - pool lifetimes (2 days for 15m swings);
  - swings of strength 2-5 all counting;
  - the ATR of the bar before the hunt;
  - only the latest swing counting for the structure shift;
  - 2026 walked on 1m bars.
  A live port has to copy these exactly.
- **Many rule words do nothing.** In the Asia hunt, these change no trade:
  - the 0.5 ATR bounce;
  - the 48-bar swing look-back;
  - the pool lives;
  - the 1h / session / day / week pools. Dropping any one of them changes nothing.

  The hunt is essentially "15m swing highs/lows". Dropping the 15m swings leaves 12 trades in H2 and a loss in 2021-24. The
  "resweep" adds nothing either: with no resweep condition it makes +$7.2k / +$2.4k / +$13.8k / +$22.5k.

## 2. Look-ahead

- **Cut-data test:** 30 random trades per lead, re-derived on data that ends at the signal bar's close. All 30 / 30 give the
  same signal bar, side, hunt extreme (stop) and pool. The trend lead also gets the same 1h trend from complete 1h bars only.
- **What is used when:**
  - Session highs/lows are used from the bar after the session's last bar.
  - HTF swings are used after the N-th HTF bar to the right has closed.
  - ATR is a running Wilder mean, and the thresholds use the ATR of the bar before the hunt.
  - The 1h trend uses the last closed hour.
  - Every entry is at or after the signal close.
  - Limits fill only when price trades 1 tick through after the order is placed, with no target and no BE on the fill bar.
- **Same-bar ordering:** a bar that touches both stop and target is scored as a stop. That happened in 0 Asia trades and
  2 trend trades.
- **One soft spot (not look-ahead, an ordering assumption):** before 2026 the trades are walked on 5m bars. On the bar that
  reaches +1R the code moves the stop to BE but does not check whether that same bar fell back to BE.
  - The fully pessimistic reading costs Asia -$3.8k in 2025 and -$2.8k in 2021-24, and costs the trend hunt -$8.7k in
    2021-24 (+$26.3k becomes +$17.6k).
  - Calibration on 2026, where 1m bars show the truth: the default 5m walk is within 1% of the 1m result, and the
    pessimistic one is 9% (Asia) / 24% (trend) too low.
  - So the stored pre-2026 numbers are about right. The pessimistic figure is a floor, not the expected value.

## 3. Costs and fills

Net $ for H1 / H2 / 2025 / 2021-24:

| scenario | Asia resweep hunt | Trend inducement hunt |
|---|---|---|
| researcher's costs | +8,139 / +2,915 / +10,990 / +22,705 | +6,536 / +4,916 / +13,384 / +26,349 |
| +1 tick on entries and stop / BE / flat exits | +7,999 / +2,763 / +10,377 / +19,761 | +6,481 / +4,870 / +13,093 / +25,042 |
| +2 ticks | +7,860 / +2,611 / +9,765 / +16,817 | +6,425 / +4,823 / +12,803 / +23,736 |
| night +1 tick (fills 18:00-02:00 ET) | +8,038 / +2,782 / +10,516 / +20,569 | +6,525 / +4,909 / +13,309 / +25,956 |
| +1 tick and night +1 tick | +7,899 / +2,630 / +9,903 / +17,625 | +6,469 / +4,862 / +13,018 / +24,650 |
| limits 2 ticks through, targets 1 tick through | unchanged | +6,536 / +4,916 / +13,382 / +23,101 |
| BE same-bar pessimistic (a floor, see 2) | +8,139 / +2,915 / +7,238 / +19,879 | +5,613 / +4,016 / +11,546 / +17,631 |
| 2026 walked on 5m instead of 1m | unchanged | +6,461 / +4,916 / unchanged |
| **order 5 minutes late** | +7,394 / +2,358 / +4,685 / +24,852 | +7,328 / **+2,376** / **+2,272** / +15,367 |
| worst case (+2 ticks, night, trade-through, BE pessimistic) | +7,759 / +2,478 / +5,483 / +11,789 | +5,478 / +3,898 / +10,845 / +11,280 |

- Normal cost stress does not break either lead.
- The Asia hunt's thin 2021-24 edge (PF 1.27) loses about a fifth of its money to one realistic night tick.
- The trend hunt depends on getting its limit in right after the signal: an order placed 5 minutes late keeps half of H2
  and a sixth of 2025.

## 4. Robustness

**One-step neighbours** (40 per lead: each parameter one step up / down, every pool type dropped, hours, BE, stop limits,
EMA length, limit level, timeout, no resweep / inducement condition):

| | Asia | Trend |
|---|---|---|
| neighbours positive H1 / H2 / 2025 / 2021-24 | 100 / 98 / 100 / 98% | 100 / 98 / 100 / 100% |
| positive in all four periods | 95% | 98% |
| worst neighbour | drop 15m swings: +1.9k / +0.7k / +2.3k / -0.7k | limit at 40% of the candle: H2 -$543; no 1h trend filter: 2021-24 +$6.9k |

**Drop the best trades** (net $):

| | Asia H1 / H2 / 2025 / 2021-24 | Trend H1 / H2 / 2025 / 2021-24 |
|---|---|---|
| all trades | +8,139 / +2,915 / +10,990 / +22,705 | +6,536 / +4,916 / +13,384 / +26,349 |
| without best 3 | +5,202 / **-20** / +8,045 / +19,754 | +3,629 / +2,046 / +10,442 / +23,404 |
| without best 5 | +3,336 / -1,850 / +6,106 / +17,805 | +1,743 / **+168** / +8,511 / +21,447 |
| without best 10 | -1,097 / -6,178 / +1,335 / +12,946 | -2,822 / -3,781 / +3,752 / +16,586 |

**By year:**
- Asia: 2021-22 +$6.7k (PF 1.20), 2023 +$8.2k (1.30), 2024 +$7.8k (1.34), 2025 +$11.0k (1.51), 2026 +$11.1k (1.86).
- Trend: 2021-22 +$11.4k (1.62), 2023 +$12.7k (1.60), **2024 +$2.3k (1.11)**, 2025 +$13.4k (1.72), 2026 +$11.5k (2.23).

**2026 H2 by month:**
- Asia: Jul +$374, Aug -$987, Sep +$2,243, Oct +$1,285.
- Trend: Jul +$457, Aug +$3,243 (7 of 8 won), Sep +$1,301, Oct -$85.

**Long vs short:**
- Asia: long +$24.9k (59.5% win), short +$19.9k (53.8%).
- Trend: long +$20.4k (59.8%), short +$30.8k (62.2%).

**Weekdays:** every weekday is positive for both. Thursday is the weakest (Asia PF 1.12, trend 1.30).

**Trend by session (5 years):** Asia +$14.2k, London +$23.0k, NY AM +$12.2k, NY PM +$1.8k.

- A smooth plateau and positive years are what a real edge looks like. They are also what the selection rule demanded
  (plateau 80%+ in H1 and 2021-24, worst t of three periods), so they cannot count as independent evidence.
- What is independent is H2, and H2 is fragile. The Asia hunt's H2 is three trades. The trend hunt's H2 is mostly August.

## 5. True out-of-sample: the researcher's search re-run on data ending 2024-12-31

The researcher's own code (`tools/stophunt.py`) was re-run with six periods: 2021-22, 2023, 2024, 2025, 2026 H1 and 2026 H2.

- **Pick rule:** the researcher's robust rule, shifted back. Rank on the worst t of 2024 / 2023 / 2021-22. 2024 plays the
  role H1 had: 1+ trade a week, PF 1.3+, and a plateau of 80%+ in 2024 and in 2021-22.
- **Then:** 2025 and 2026 are tested untouched. Nothing after 2024 was looked at to pick.

| search | variants | top pick: 2025 / H1 / H2 | shortlist of 12 positive in 2025 / H1 / H2 | base rate (all variants) |
|---|---|---|---|---|
| stage 1, the generic grid (defined before any result) | 7.68M | **-$8,244 / -$2,145 / -$1,120** | 33 / 50 / 25% | 37 / 48 / 46% |
| stage 2, management grid on the 23 best stage-1 setups | 3.35M | +$1,728 / +$2,064 / **-$4,295** (win 40% / 39% / 23%) | 67 / 67 / 25% | 27 / 41 / 42% |
| stage 3 Asia family (built after seeing all periods) | 8.29M | +$933 / -$124 / +$1,881 | 83 / 58 / **100%** | 47 / 70 / 78% |
| stage 3 trend family (built after seeing all periods) | 4.64M | -$1,927 / +$1,259 / -$310 | **0 / 25 / 0%** | 53 / 63 / 54% |

- **Done honestly, the procedure does not find a stop-hunt edge that lasts.**
  - The generic search picks losers.
  - The stage-2 pick is a 40%-win NY setup that loses in 2026 H2.
  - Neither lead comes out of it.
- **Trend family:** all 12 pre-2025 picks are strongly positive 2021-24 (+$9k to +$19k a year) and every one loses in
  2025 and 2026 H2. The trend lead itself was not even eligible: 2024 PF 1.11 < 1.3, pre-2025 worst t 0.38.
- **Asia family:** the pre-2025 picks are different settings: equal highs/lows, late Asia (22:00-02:00), a 1-ATR-deep
  hunt, the 15-minute check. They stay positive in H2 (12 of 12, mean +$3.4k) and in 2025 (10 of 12, mean +$1.2k), but
  are flat in H1. The Asia lead ranks about 12,000th of 100,861 eligible variants. This is the only part of the audit that
  points to something real. It is a region (Asia hours, HTF swing pools, a big candle back, 2R), not a setting. Note that
  the family itself was designed after the researcher had seen every period, so even this is not fully clean.

## 6. Multiple testing

**Were the leads the rule's own picks?** No (`stage3_picks.json`):

| | rule's shortlist | lead's rank | rank-1 pick's H2 | shortlist H2 mean | lead's H2 | lead's H2 rank among the 12 |
|---|---|---|---|---|---|---|
| Asia | asia_robust_win | 9 of 12 (not in asia_robust's 12) | -$1,624 (asia_robust #1: +$2,466) | +$1,024 | +$2,915 | **2nd** |
| Trend | trend_robust_win | 10 of 12 (not in trend_robust's 12) | +$1,192 | +$1,659 | +$4,916 | **1st** |

The write-up says "2026 H2 is never looked at". But the final two are the 2nd-best and best H2 results of their shortlists,
not the rule's top picks. Whatever the reason (a preference for simple fixed-2R market / mid-candle entries is plausible),
H2 can no longer be treated as a clean test of these exact variants.

**H2 alone, then corrected for choosing among 12:**

| | H2 trades | mean R | t | bootstrap p | random-time placebo p | adjusted for best of 12 |
|---|---|---|---|---|---|---|
| Asia | 40 | +0.16 | 0.79 | 0.21 | 0.25 | 0.94 / 0.97 |
| Trend | 24 | +0.43 | 1.60 | 0.047 | 0.032 | 0.44 / 0.32 |

**Deflated Sharpe on the pick periods** (H1 + 2025 + 2021-24, per-trade Sharpe):
- The luck level is the best Sharpe expected from N tries with no edge. The spread of tries comes from the family's own
  3M variants.
- Asia: Sharpe 0.135 a trade, in the top 3.9% of its family. DSR 0.29 at N = 100, 0.05 at N = 1,000, 0.00 at the
  family's 860k distinct trade sets.
- Trend: Sharpe 0.174 a trade, in the top 0.8%. DSR 0.69 at N = 100, 0.33 at 1,000, 0.11 at 10,000, 0.00 at 1.5M.
- The variants are highly correlated, so the true number of independent tries is far below 28.7M. Even at a generous 1,000,
  neither lead clears the luck level.

**Chance accounting** (`search_summary.json`, variants with t > 1 in H1, 2025 and 2021-24, observed vs expected if
independent):
- Asia stage 3: 13,083 vs 8,680 (1.5x). The 1.9x in stophunt.md is the stage-2 Asia family.
- Trend stage 3: 2,509 vs 4,989 (0.5x), i.e. rarer than chance.

## 7. Eval paths (ATLAS on the Builder 25K, `tools/second_account_b.py` rules, need size, no-hedge)

**Reproduction:**
- The researcher's numbers reproduce exactly from my own trade lists.
- Placebo members use the same mechanics (entry kind, the real stop points, 2R, BE + 1.25, flat 15:55, one position).
  Random-time = 10 runs, random 5m bars of the same session bucket. Flip = the same signal bars, other side.

2-week pass % (dead % = failed or stuck within 2 weeks), H1 / H2 / 2025 / 2021-24:

| account B (Builder 25K) | 2-week pass | dead in 2 weeks |
|---|---|---|
| ATLAS alone (EMA + MACD + S/R) | 68.9 / 43.5 / 28.9 / 23.9 | 7.6 / 0.0 / 34.9 / 38.9 |
| ATLAS + Asia hunt | 79.8 / 56.5 / 30.1 / 32.5 | 0.8 / 5.8 / **40.6 / 40.7** |
| ATLAS + Asia hunt, +1 tick + night tick | 79.8 / 53.6 / 29.7 / 31.3 | 0.8 / 5.8 / 41.0 / 42.4 |
| ATLAS + random-time placebo (Asia mechanics, mean of 10) | 58.3 / 38.1 / 28.7 / 25.5 | 14.3 / 19.1 / 42.3 / 48.5 |
| ATLAS + flipped Asia hunt | 45.4 / 40.6 / 20.1 / 23.5 | 16.0 / 11.6 / 58.2 / 57.0 |
| ATLAS + trend hunt | 61.3 / 59.4 / 39.4 / 30.4 | 8.4 / 4.3 / 29.7 / **41.6** |
| ATLAS + random-time placebo (trend mechanics, mean of 10) | 62.3 / 40.7 / 27.7 / 25.9 | 12.9 / 8.8 / 43.1 / 47.6 |
| ATLAS + flipped trend hunt | **73.9** / 37.7 / 28.5 / 26.5 | 5.0 / 4.3 / 43.4 / 41.6 |
| ATLAS + both hunts (two members; the researcher's merged book gives 74.8 / 65.2 / 39.4 / 34.7) | 73.9 / 65.2 / 39.4 / 34.8 | 5.0 / 8.7 / 33.3 / 40.6 |

- **"0 fails in 2 weeks" is true only for the FAIL label.** A STUCK account is dead too: within $100 of the trailing floor,
  the bot stops trading it and the owner buys a new one. With the hunts added, 30-42% of 2025 / 2021-24 evals are dead
  within 2 weeks, about the same as ATLAS alone (35-39%). In 2026 H2 it is 4-9%.
- **The Asia hunt adds something a random member does not:** +21 / +18 / +1 / +7 points of 2-week passes over the
  random-time placebo, and fewer dead evals in 2026. Its flipped twin is much worse. This is the second piece of evidence
  for the Asia region.
- **The trend hunt does not, outside H2.** In H1 the random-time placebo passes as often (62.3 vs 61.3%) and the
  flipped-direction trend hunt passes more (73.9%). Its eval gain is H2 (and 2025), the period that, per check 6, it was
  chosen on.

## Verdict

- **Asia resweep hunt: WEAK, paper only.**
  - The code is right, there is no look-ahead, and it survives costs, neighbours and every year.
  - Two independent signs that the region carries something: the pre-2025 search finds positive H2 variants in the same
    family, and it beats placebo members in the eval path.
  - But the exact variant is not significant on its only clean period (H2 p 0.21; 3 trades are all of H2), it was not the
    rule's own pick, and it does not survive the multiple-testing correction.
  - It is fine to paper-log it as an ATLAS member on account B. Do not quote +$2.9k H2 as a forecast, and judge it on 40+
    fresh paper trades before any money. A fair expectation is "about flat to slightly positive".
- **Trend inducement hunt: NOT REAL as evidenced.**
  - Its best number (H2 +$4.9k, PF 2.30) is the best H2 of a 12-variant shortlist it was picked from, and its family is
    rarer than chance.
  - The same search run without 2025-26 picks 12 variants that all lose in 2025 and 2026 H2.
  - The lead itself would not have passed the pick rule before 2025.
  - In the eval path it is no better than a random member outside H2.
  - Do not route it; if it is paper-logged, treat it as a control, not a candidate.
- **Neither goes on an eval, the 50K or real money.** LIT, ATLAS, `live_model*.json` and `second_model.json` are untouched.
- **Lesson for the next search:**
  - Fix the shortlist rank-1 as the pick before H2 is computed, or keep a final period that no script can read.
  - Report "dead in 2 weeks" (fail + stuck), not "fail".
  - Run the search pre-2025 first (check 5): it costs 10 minutes and would have flagged the trend family at once.

## Files

- `tools/stophunt_audit.py`: the independent rewrite and every check.
  - `python -X utf8 tools/stophunt_audit.py replicate | lookahead | costs | robust | multi | evals | oos | all`
  - `oos` takes about 15 minutes on 4 cores and writes `research/stophunt/_audit_oos.json`.
  - `multi` reads the researcher's grid caches (set `SH_CACHE` to the folder that holds `stophunt_s3*_stats.npy`).
- `research/stophunt/audit.json`: every number above, the hidden rule details, all neighbours and breakdowns.
- `research/stophunt/_audit_oos.json`: the pre-2025 selection re-run (picks, shortlists, the leads' ranks).
- Audited: `research/writeups/stophunt.md`, `research/stophunt/sh_asia_resweep.json`, `sh_trend_idm5.json`, `evals.json`,
  `stage3_picks.json`, `search_summary.json`.
