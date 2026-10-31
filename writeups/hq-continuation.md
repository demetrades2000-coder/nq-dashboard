## In one minute

- **The ask (owner, 2026-10-23):** "I need a strategy that trades 2+ times a week, high-quality setups, with high probability
  and high profit." The goal set for this study:
  - 2+ trades a week;
  - a win rate (trades that make +1R or more) well above LIT's 22-32%;
  - an average winner of 1.5R or more;
  - a positive expectancy that holds out of sample.
- **This study's family:** trend continuation, the opposite of LIT.
  - LIT waits for a sweep and trades the reversal. This family waits for a clear directional session and joins it on the
    first pullback.
- **Answer: no.** No version of this family meets the goal. Nothing should be built or switched on.
  - **Picked on 2026 H1, the way LIT was tuned:** the picks make money in 2026, then lose a lot over 2021-24.
    - The best pick: **H1 +$17.4k, H2 +$4.6k, then 2025 -$9.9k and 2021-24 -$44.3k**, at 4 trades a week.
    - Its win rate (+1R or more) is 36% in H1, 28% in H2, 21% in 2025 and 20% in 2021-24. That is no better than LIT's.
  - **Picked on 2021-11 .. 2024-12 instead (the pre-2025 re-pick):** not one variant at 2+ a week passed the quality floor.
    - With the floor lowered to 1.5 a week, the best pick makes +$21.1k in 2021-24 and +$3.7k in 2025.
    - It then loses in both halves of 2026 (-$2.1k / -$1.1k), at only about 1 trade a week.
  - **The search is close to noise.**
    - Across all variants, a variant's H1 result says nothing about its H2 result (t-stat correlation 0.008).
    - The same holds for 2021-24 vs 2025 (correlation 0.034).
    - Only 2.5% of variants are positive in H2, 2025 and 2021-24 together. Among the 135 that qualify on H1, none are.
- **The "high probability" part does not exist here.**
  - The highest win rate (+1R or more) found at 2+ a week, with a positive expectancy and a 1.5R average winner, is 41% in
    H1, 47% in H2, 42% in 2025 and 35% in 2021-24.
  - Each of those is a different variant, and none of them holds in another period.
- **Closest lead (chosen after looking at every period, so it is not a fair test):**
  - The rules: NY session, a leg of 4 ATR or more out of the first 30 minutes, the 1h trend agreeing, the first pullback into
    the leg's fair value gap, a 5m close back in the trend, a 1.5R target and breakeven at 1R.
  - It is positive in all four periods, with a 38-44% win rate (+1R or more), and most of its neighbours are positive too.
  - The catch: only **about 1 trade a week**, $180-$530 a month, and random entries in the same direction do about as well
    (placebo p 0.1-0.4).
- **What is new versus the earlier continuation studies:**
  - `allday.md` tested continuation after a one-way window: a pullback share of the range and a close beyond the prior
    candle, with no structure, zone, trend or VWAP filter.
  - `second-ema.md` tested an EMA pullback with a sweep.
  - `lit-adv-continuation.md` tested continuation trades inside LIT.
  - What only this study adds:
    - the opening-structure break by a k-ATR leg;
    - FVG, order-block and 50% zones for the first pullback;
    - the CISD trigger and the stop-hunt second leg;
    - the 1h trend and VWAP filters;
    - pool targets with banked-R and partial exits;
    - London and NY together on one account.

## The setup that was tested

The long side is described below; shorts are the mirror image. Everything a signal uses is known at its 5m close.

1. **Session.**
   - London: from 02:00 ET. The leg must confirm by 05:00. Entries until 07:30.
   - NY: from 09:30 ET. The leg must confirm by 11:30. Entries until 12:00.
   - Both: London and NY in one account, one position at a time.
2. **Opening structure.**
   - The session's first 15 or 30 minutes,
   - or the range before the session: Asia 20:00-00:00 for London, the overnight 18:00-09:30 for NY.
3. **Directional leg.**
   - The first 5m close beyond the structure starts the leg.
   - The leg, measured from the session low, must reach k = 2, 3 or 4 times the 5m ATR.
   - Optional: a candle body of 0.8 ATR or more somewhere in the leg.
   - Only the session's first leg counts: one clear direction or no trade.
   - Optional filters: the close is on the trend side of the 18:00 VWAP; the 1h EMA 21 vs EMA 50 agrees with the leg.
4. **The first pullback.**
   - Price must reach the zone within 60 or 120 minutes of the leg. The zone is one of:
     - 50% of the leg;
     - the leg's most recent 5m fair value gap;
     - the order block (the last opposite candle before the leg's first big candle).
   - A trade below the leg origin before that cancels the setup.
5. **Trigger, within 30 minutes of the touch.** One of:
   - a 5m close above the prior candle's high;
   - a 5m CISD back in the trend;
   - **the stop-hunt second leg:** after the first CISD, price takes the pullback low (the first entry's stop) but holds the
     leg origin, then a new 5m CISD.
6. **Entry and stop.**
   - Entry at the next 5m open + 1 tick.
   - Stop 1 tick beyond the pullback's protected low, or beyond the leg origin.
   - Stops must be 6-80 pts.
7. **Targets.**
   - Fixed 1.5R, 2R or 3R.
   - The next liquidity pool in the trend direction, at least 1R away, banked at 8R or capped at 3R. The pools are the leg
     high, the day's high so far, PDH / PWH / PMH, the Asia and London box highs, and untaken equal highs.
   - Half at 1R and the rest at 2R or at the pool, with the stop moved to entry + 1.25 after the half.
   - Breakeven at +1R on or off.
   - Flat at the session end (London 09:25, NY 13:30) or at 15:55.
8. **Size and costs.**
   - Size uses the LIT size rule: $800 up to a 20-pt stop, then 800 x 20 / stop, max 40 micros.
   - Costs: $1.90 a micro and 1 tick of slippage on market fills, stops and time exits.
   - 2026 trades run on true 1m bars; earlier years run on 5m bars.

**A 1m CISD trigger was not tested.** There are no 1m bars before 2026, so it could not be checked on 2021-25.

## Results: the three H1 picks (2026 H1 picked, everything else untouched)

How the picks were made:

- Only variants with 2+ trades a week, 30+ trades, PF 1.2 or more and an average winner of 1.5R or more in H1 could be
  picked.
- They were ranked by a plateau score: half their own H1 t-stat, half the median of their one-step neighbours.
- 135 variants qualified.

Columns: "win ≥1R" = trades that made +1R or more; "BE" = breakeven exits; "exp" = average result per trade.

**#1 `hq_cont_h1_1`: both sessions, 30-min opening range, 3-ATR leg with a 0.8-ATR candle, FVG pullback within 60 min, close
trigger, pool target banked at 8R, breakeven at 1R, flat 15:55.**

| period | trades | a week | weeks 2+ | win ≥1R | BE | avg winner | exp R / $ | PF | net $ | $ a month | max DD |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026 H1 (picked) | 101 | 3.95 | 93% | 35.6% | 22% | 1.50R | +0.45 / +$172 | 1.87 | **+17,399** | +2,855 | -3,682 |
| 2026 H2 | 64 | 4.10 | 94% | 28.1% | 31% | 1.12R | +0.24 / +$72 | 1.41 | **+4,594** | +1,237 | -2,722 |
| 2025 | 232 | 4.50 | 94% | 21.1% | 24% | 0.97R | -0.08 / -$43 | 0.86 | **-9,906** | -806 | -27,621 |
| 2021-24 | 819 | 5.03 | 98% | 19.5% | 26% | 0.96R | -0.07 / -$54 | 0.82 | **-44,254** | -1,142 | -53,114 |

- **Drop the best 5 trades:** H1 -$384, H2 -$4,146.
- **Neighbours:** 19 of 21 are positive in H1 and 16 of 21 in H2, but only 2 in 2025 and 1 in 2021-24.
- **Placebos:**
  - Random times after the leg, same direction: p 0.00 in H1, but 0.29 in H2.
  - Random direction at the same entries: p 0.03 in H2.
- **2026 months:** 8 of 10 are positive.
- **Verdict:** 2026 only. It loses over the four years before.

**#2 `hq_cont_h1_2`: both sessions, 30-min opening range, 2-ATR leg, 1h trend, FVG pullback within 120 min, 5m CISD, 2R,
session flat.**

- H1: 52 trades (2.0 a week), win ≥1R 40.4%, PF 1.77, **+$9,177**.
- H2: 31 trades, 29.0%, PF 0.72, **-$2,500**.
- 2025: 31.1%, PF 0.92, **-$2,828**.
- 2021-24: 26.6%, PF 0.73, **-$43,768**.
- Only 4 of its 22 neighbours are positive in H2. It fails at once.

**#3 `hq_cont_h1_3`: London only, otherwise #1.**

- H1: 64 trades (2.5 a week), 32.8%, PF 1.80, **+$13,175**.
- H2: 36 trades, 22.2%, PF 1.16, **+$1,261**.
- 2025: 21.8%, PF 1.01, **+$697**.
- 2021-24: 16.1%, PF 0.77, **-$34,915**.
- Drop the best 5: H2 -$6,204.

## Results: the pre-2025 re-pick (selected on 2021-11 .. 2024-12, tested on 2025 and 2026)

- **Not one variant at 2+ a week passes the quality floor over 2021-24.**
  - The floor: PF 1.2 or more, an average winner of 1.5R or more, net positive.
  - Only 10 variants reach PF 1.2 there at all, and none of them has a 1.5R average winner.
- **With the frequency lowered to 1.5 a week**, 36 variants qualify. The best three:

| pick | 2021-24 (picked) | 2025 (test) | 2026 H1 (test) | 2026 H2 (test) |
|---|---|---|---|---|
| `hq_cont_pre2025_1`: NY, 15-min range, 3-ATR leg, VWAP side, FVG, CISD, 3R | 1.81/wk, win ≥1R 32%, PF 1.26, **+$21,065** | 1.51/wk, 35%, PF 1.23, **+$3,680** | 0.94/wk, 13%, PF 0.48, **-$2,072** | 1.41/wk, 18%, PF 0.77, **-$1,141** |
| `hq_cont_pre2025_2`: both, pre-session box, 4-ATR leg, FVG, close, stop at origin, 3R | 1.74/wk, 30%, PF 1.34, **+$23,517** | 1.47/wk, 16%, PF 0.43, **-$12,753** | 0.62/wk, PF 1.06, +$196 | 4 trades, -$802 |
| `hq_cont_pre2025_3`: both, 15-min range, 4-ATR leg, FVG, close, origin stop, pool target | 1.67/wk, 33%, PF 1.23, **+$15,394** | 1.32/wk, 25%, PF 0.67, **-$5,160** | 0.62/wk, +$1,216 | 4 trades, +$1,619 |

- Pick 1 passes its first test, 2025, and then loses in both halves of 2026.
- Picks 2 and 3 fail 2025 outright.
- In 2026 all three trade well under the owner's 2 a week.

## Leads chosen after looking (not out of sample)

Both of these were found by scanning all four periods for variants positive everywhere. They are shown only so the owner can
see the best this family can do. They are not a fair test: they were chosen with the answer in hand.

| lead | period | trades | a week | win ≥1R | BE | PF | net $ | $ a month | max DD |
|---|---|---|---|---|---|---|---|---|---|
| `hq_cont_peeked_1`: both, 30-min range, 3-ATR leg, 1h trend, FVG within 60 min, close trigger, 3R, breakeven at 1R | H1 | 55 | 2.15 | 23.6% | 38% | 1.33 | +3,459 | +567 | -3,887 |
| | H2 | 33 | 2.12 | 24.2% | 39% | 2.28 | +5,459 | +1,470 | -1,509 |
| | 2025 | 129 | 2.50 | 26.4% | 30% | 1.56 | +18,262 | +1,486 | -3,889 |
| | 2021-24 | 464 | 2.85 | 19.2% | 29% | 1.02 | +3,417 | +88 | -16,868 |
| `hq_cont_peeked_2`: NY, 30-min range, 4-ATR leg + 0.8-ATR candle, 1h trend, FVG within 120 min, close trigger, 1.5R, breakeven at 1R | H1 | 23 | 0.90 | 39.1% | 35% | 3.34 | +3,220 | +528 | -801 |
| | H2 | 19 | 1.22 | 42.1% | 26% | 2.02 | +1,794 | +483 | -660 |
| | 2025 | 52 | 1.01 | 44.2% | 12% | 1.28 | +2,630 | +214 | -2,201 |
| | 2021-24 | 221 | 1.36 | 38.0% | 16% | 1.15 | +7,022 | +181 | -3,423 |

- **Lead 1:**
  - It trades 2+ a week everywhere, but its win rate is LIT's (19-26%).
  - It is flat over 2021-24 (PF 1.02, a -$16.9k drawdown).
  - Dropping the best 5 trades turns H1, H2 and 2021-24 negative.
- **Lead 2 is the cleanest result of the study.**
  - It is positive in every period, and 16-17 of its 20 neighbours are positive in 2025 and 2021-24.
  - It wins 38-44% at +1R or more. This is the only "higher probability" shape found here.
  - The catch:
    - it trades about 1 a week;
    - it earns $180-$530 a month;
    - its average winner is under 1.5R once breakeven exits count as small winners;
    - random entries at other times after the same leg, in the same direction, are not clearly worse (placebo p 0.10 in H1,
      0.20 in H2, 0.31 in 2025, 0.39 in 2021-24).
  - So most of its money comes from "trade with a strong NY leg and the 1h trend", not from the FVG or the trigger.

## Eval paths (MFFU, costs in)

Two eval set-ups were scored:

- **50K next to LIT:** LIT first, one position, max 2 trades a day. The extra setup is sized at half of LIT's two_week
  "need" (`need0.5`).
- **25K alone (account B rules):** `tools/second_account_b.py`, two_week need size, never opposite to LIT. On the 25K the
  executor shows 0% fails because accounts get stuck instead, so the third number in that column is the "dead" share (stuck
  in 10 sessions).

LIT alone on the 50K, 2-week pass / fail: H1 57.1 / 5.9, H2 52.2 / 0.0, 2025 14.1 / 1.2, 2021-24 14.7 / 6.8.

| setup | 50K + LIT 2-week pass/fail H1 · H2 · 2025 · 2021-24 | 50K + LIT 1-month pass/fail H1 · H2 | 25K alone 2-week pass / fail / dead H1 · H2 · 2025 · 2021-24 |
|---|---|---|---|
| H1 pick #1 | 61.3/5.0 · 52.2/4.3 · 11.2/3.2 · 12.8/14.9 | 78.0/7.3 · 50.8/6.8 | 37.0/0/10.1 · 23.2/0/13.0 · 21.3/0/31.7 · 15.0/0/37.5 |
| H1 pick #2 | 55.5/7.6 · 46.4/0.0 · 12.9/5.2 · 13.9/13.2 | 77.1/12.8 · 42.4/16.9 | 28.6/0/5.9 · 13.0/0/2.9 · 7.6/0/4.4 · 10.2/0/22.5 |
| H1 pick #3 | 60.5/1.7 · 49.3/4.3 · 9.6/4.0 · 13.4/12.9 | 77.1/7.3 · 47.5/6.8 | 26.9/0/4.2 · 29.0/0/0.0 · 16.9/0/8.4 · 8.9/0/10.1 |
| pre-2025 #1 | 55.5/8.4 · 43.5/11.6 · 15.3/8.0 · 16.8/11.4 | 74.3/11.0 · 39.0/20.3 | 0.0 · 0.0 · 9.6 · 20.4 (too few trades) |
| peeked lead 1 | 54.6/5.9 · 50.7/0.0 · 13.7/3.6 · 14.7/11.8 | 75.2/13.8 · 49.2/5.1 | 15.1/0/0 · 24.6/0/2.9 · 28.1/0/7.2 · 16.4/0/16.5 |
| peeked lead 2 | 57.1/4.2 · 52.2/5.8 · 15.3/2.4 · 15.4/10.2 | 74.3/10.1 · 50.8/8.5 | 0.8 · 0.0 · 8.4 · 5.6 (too few trades) |

- **Next to LIT on the 50K,** none of them improves both halves of 2026. In H2 they add fails (+4-12 points) or cut passes.
  Over 2021-24 they double the fail rate (LIT 6.8% → 10-15%).
- **Alone on a 25K,** the best (H1 #1) passes 37% / 23% in 2 weeks in H1 / H2. ATLAS passes 68.9% / 43.5%. In 2021-24 it
  leaves 37.5% of evals stuck.

## Multiple testing and chance

- **The search:** 186,624 variants, 128,113 of them with different trade lists. 135 qualified on H1.
- **Do qualified variants hold?** Of the 135 that qualified on H1, 55% are positive in H2. Of all variants, 33% are.
- **Positive in all three checks** (H2, 2025 and 2021-24 together):
  - none of the 135 qualified variants;
  - none of the 50 best;
  - 2.5% of all variants.
- **Average edge:** the mean expectancy per variant is about 0R in every period (H1 -0.005R, H2 -0.05R, 2025 -0.09R,
  2021-24 +0.02R).
- **Chance level:** random-time strategies were built with the same days, sessions, directions, stops and targets as random
  grid variants, after the leg had confirmed. Of 120 such strategies:
  - 12.5% are positive in H2, 2025 and 2021-24 together;
  - 7.5% are positive in all four periods.
  - The real setup variants manage only 2.5% and 0.9%. The zone, trigger and target rules do not add anything over
    "trade in the leg's direction at some point".
  - Caveat: one random draw has more spread than a rule, which inflates the random rates a little.
- **By part of the setup** (median expectancy over variants, `research/hq/cont/family.json`):
  - No zone, trigger or target is positive in all four periods.
  - The stop-hunt second leg is the best part in 2021-24 (+0.13R, 67% of its variants positive). It is the worst in H2 and
    2025 (-0.15R / -0.19R, only 22% / 11% positive). It is also rare: 0.2-0.8 a week.
  - NY-only variants are slightly positive in 2025 and 2021-24 (+0.02R / +0.04R) but trade 0.3-0.7 a week.
  - VWAP and the 1h trend filters change little.

## Honest verdict

- **Rejected.** As a mechanical rule set, trend continuation after a session leg does not give a high-probability edge on NQ:
  - at 2+ a week it wins +1R or more about 20-35% of the time, the same as LIT;
  - the versions that look good in one period fail in the others;
  - the setup rules do no better than random entries in the leg's direction.
- **The only shape that holds everywhere is the NY strong-leg pullback with a 1.5R target and breakeven** (peeked lead 2).
  - Its win rate is around 40%, at about 1 trade a week and a few hundred dollars a month.
  - It was found by looking at every period, so it would need fresh data (2026 Q4 onward) before anyone trusts it.
  - Its frequency also misses the owner's 2+ a week.
- **No change to LIT or ATLAS.** Nothing was built and nothing is switched on.

## Files

- `tools/hq_cont.py`. Commands: `grid` (~27 min on 4 processes), `pick`, `peek`, `evals`, `save`.
- `research/hq/cont/`:
  - `picks.json`: picks, spans, months, neighbours, drop-best-5, placebos, family counts and chance;
  - `evals.json`: the eval paths;
  - `family.json`: medians by part of the setup and the variants positive everywhere;
  - `hq_cont_<pick>.json`: every trade in the common format;
  - `index.json`.
- The full grid (`research/runs/_cache/hq_cont_grid.json.gz`, 11 MB) and the trade cache stay in the gitignored cache
  directory.
- Runs: `hq_cont_h1_1..3`, `hq_cont_pre2025_1..3`, `hq_cont_peeked_1..2`.
