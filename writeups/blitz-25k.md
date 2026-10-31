## Money first

**Short answer: keep BLITZ's rule exactly as it is. Nothing "like a person" beat it in all three test periods.** On its own
25K the only useful change is the eval size: it decides the eval faster, but it does not make more money. In 2021-25-like
markets the account still loses about $40 a month. BLITZ on its own 25K is a bet that the 2026 market continues.

**BLITZ as it will trade on account C** (today's rule, never opposite LIT or ATLAS; fixed $150 risk a trade = 1 micro at a
~60-point stop; 2026 on 1m bars, 2021-25 the same rule on 5m bars):

| Span | Trades | / week | Weeks with 2+ | Win % | Avg R | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 H1 (pick) | 217 | 8.5 | 89% | 56.7 | +0.165 | 1.70 | +$5,873 | **+$963** | -$1,152 |
| **2026 H2 (check)** | 106 | 6.8 | 75% | 56.6 | +0.200 | **1.62** | **+$2,478** | **+$667** | -$815 |
| 2021-25 (5m) | 1,841 | 8.6 | 80% | 50.1 | +0.013 | 1.05 | +$3,765 | +$73 | -$5,512 |
| same rule alone (no anti-hedge rule) H1 / H2 / 2021-25 | 221 / 109 / 1,869 | | | | +0.150 / +0.171 / +0.016 | 1.63 / 1.49 / 1.06 | | +$912 / +$577 / +$89 | |

**The 25K eval and the whole account slot** (MFFU Builder 25K: $63, +$1,500 target, $1,000 end-of-day trailing loss
locked at start + $100, $600 soft daily loss; a fresh eval on every session; "slot" = buy the eval, pass, 2 sessions of
paperwork, the funded 25K, payouts at 80%, a new eval after a fail / stuck / lost account; 6-month Monte Carlo paths in
5-session blocks, net of every eval bought). Funded size for every row: 10% of the room, at most $150 (1 micro), no new
trade after +$400 on the day.

| Eval size (today's rule, account C) | 2-week pass / fail H1 | H2 | 2021-25 | decided in 2 wks H1 / H2 / 2021-25 | passes slower than 3 wks | median sessions to pass | **slot $ / month H1 / H2 / 2021-25** |
|---|---:|---:|---:|---:|---:|---:|---:|
| 40% of the room, <= $600 (the paper ledger today) | 32.8 / 8.4 | 36.2 / 2.9 | 15.8 / 13.1 | 41 / 39 / 29% | 23 / 5 / 11% | 9 / 6.5 / 6 | $251 / $40 / -$34 |
| 60% of the room, <= $600 (scalp-na-mffu's slot) | 31.1 / 40.3 | 29.0 / 33.3 | 18.4 / 38.0 | 71 / 62 / 56% | 11 / 4 / 6% | 6 / 5 / 4 | $258 / $39 / -$42 |
| 100% of the room, <= $600 | 37.8 / 40.3 | 30.4 / 42.0 | 20.8 / 54.3 | 78 / 72 / 75% | 10 / 0 / 4% | 5 / 5 / 4 | $273 / $36 / -$42 |
| **40%, then 100% from session 5 (pick)** | **36.1 / 37.8** | **36.2 / 34.8** | 20.4 / 50.2 | **74 / 71 / 71%** | **10 / 0 / 6%** | 6 / 5 / 6 | **$270 / $37 / -$40** |
| 40%, then 100% from session 8 | 35.3 / 21.8 | 39.1 / 20.3 | 19.2 / 38.9 | 57 / 59 / 58% | 13 / 2 / 7% | 8 / 6 / 7 | $266 / $38 / -$39 |
| 50%, no new trade after -$250 on the day | 31.9 / 26.9 | 34.8 / 1.4 | 16.6 / 22.1 | 59 / 36 / 39% | 12 / 13 / 8% | 7 / 8.5 / 5 | $247 / $42 / -$39 |
| "need": what is left to pass / 2, <= 80% of the room | 25.2 / 37.8 | 17.4 / 31.9 | 10.6 / 44.2 | 63 / 49 / 55% | 26 / 4 / 20% | 10 / 9 / 9.5 | $255 / $36 / -$37 |

In plain words:
- **The money barely moves with the size** ($247-273 a month in H1, $36-42 in H2, -$34 to -$42 in 2021-25). The size only
  decides **how fast** the eval ends. The owner's rule is "passed or failed within 2 weeks, never more than 3 weeks to
  pass": the pick (40% for the first 4 sessions, then the full room from session 5) decides 71-74% of evals in 2 weeks and
  fewer than 10% of passes take longer than 3 weeks. Today's paper size leaves about 60% of evals undecided after 2 weeks.
- The price of speed: about as many evals fail as pass in 2026 (36 / 35-38), and in 2021-25 two fail for every pass. Each
  fail costs $63.
- **Once funded, the 25K gets stuck.** With a 60-point stop one micro risks about $122, so the $1,000 trailing room is only
  about 8 losses. In H1 45% of funded accounts got stuck under the floor before paying much ($108 a month funded); in H2
  every funded start got stuck ($0, only 6 starts); 2021-25 $2 a month. That is why the slot pays little.
- **Random directions** on the same signal bars (8 seeds, the pick's sizes) make -$49 / **+$30** / -$67 a month against the
  real $270 / **$37** / -$40. In H1 the edge shows; **in H2 the 25K slot money is no better than coin flips**: it is the
  eval lottery ($63 tickets with a ~1-in-3 pass), not BLITZ's edge.
- Compared with scalp-na-mffu.md's own-25K numbers ($224 / $3 / -$40 a month, BLITZ alone): **+$46 / +$34 / $0**, from the
  anti-hedge rule (+$31 / +$30 / -$1) and the faster size.

**What the anti-hedge rule costs (account C vs BLITZ alone):**

| | Trades skipped / added / closed early | $ / month at $150 a trade | 25K slot $ / month (pick's sizes) |
|---|---:|---:|---:|
| 2026 H1 | 9 / 5 / 0 (of 221) | $912 -> $963 | $239 -> $270 |
| 2026 H2 | 3 / 0 / 1 (of 109) | $577 -> $667 | $7 -> $37 |
| 2021-25 | 44 / 16 / 16 (of 1,869) | $89 -> $73 | -$39 -> -$40 |

"Added" = a later check that could trade because the skipped one no longer held the slot. **It costs nothing in 2026** (the
12 skipped 2026 trades averaged -0.14R: against LIT's or ATLAS's open side BLITZ mostly lost) and about $16 a month at $150
a trade in 2021-25 (there the 44 skipped trades averaged +0.11R). The stricter version, also never opposite a LIT setup
that is armed (limit working / waiting for its 1m CISD), is as good: $1,006 / $661 / $100 a month at $150. The engine can
use the strict version.

## The rule (exact) - unchanged, plus account C and the 25K size

CME NQ / MNQ, ET times, 1m bars, everything known at the signal bar's close (engine/blitz.py VERSION 2 = research/writeups/scalp-na-mffu.md):

1. **Noise band**: sigma per minute = the mean over the last 14 sessions of |close / 09:30 open - 1| at that minute; bands
   = today's 09:30 open x (1 +/- sigma).
2. **Day filter**: trade only if yesterday's 09:30-16:00 range >= 0.8 x the mean of the 14 RTH ranges before it.
3. **Checks** at the 1m closes 11:00, 11:30, ..., 15:30 (10 checks): close above the upper band = BUY, below the lower =
   SELL; while flat a later check can enter again.
4. **Entry** at market at the next bar's open (+1 tick). **Stop** = the signal close -/+ 1.5 x ATR(14) of 5m bars. No
   fixed target; after +1R the stop trails 1.5R behind the best price; out after 30 minutes or at 15:55. One position,
   at most 6 trades a day, no new trade after -3R on the day.
5. **Account C (new, from the MFFU no-hedge rule across one person's accounts)**: no BLITZ entry opposite a position LIT
   (account A) or ATLAS (account B) holds; when LIT or ATLAS enters opposite an open BLITZ trade, BLITZ is closed at the
   open of the first 1m bar at / after their entry (they go first). Stricter option (as good): also never opposite an armed
   LIT setup.
6. **25K eval size (new)**: risk per trade = 40% of the room to the trailing floor for eval sessions 1-4, then 100% from
   session 5, always at most $600 and 0.9 x what is left of the $600 soft daily loss; micros = risk / ((stop + 1 tick) x
   $2 + $1.90), at least 1 while one stop-out fits half the room. **Funded 25K**: 10% of the room, at most $150 (1 micro),
   no new trade after +$400 on the day.

The engine parameters are in `research/scalp/blitz_25k_pick.json` ("verdict": "no-change").

## What was tried (picked on 2026 H1, checked on H2 and 2021-25, all as account C)

**1. Structure stops (45, management as today).** 1 tick beyond the last confirmed 1m swing (strength 3) or 5m swing
(strength 2) before the signal, or beyond the lowest low / highest high of the last 15 / 30 / 60 minutes ("the move's
origin"), with a minimum distance (0-1 x the 5m ATR; closer = widened) and a maximum (1.5-3 x ATR, or none; wider =
skipped). Size follows the stop (the same $ risk, more micros on a tight stop).

| Stop | H1 avg R / $ a month | H2 | 2021-25 | 25K 2-week pass / fail H1 / H2 / 2021-25 (40%) |
|---|---:|---:|---:|---:|
| **today: 1.5 x 5m ATR (~60 pts)** | **+0.165 / $963** | **+0.200 / $667** | **+0.013 / $73** | 32.8/8.4, 36.2/2.9, 15.8/13.1 |
| last 5m swing, 0.5-3 ATR (best structure stop on H1) | +0.162 / $843 | +0.092 / $267 | -0.023 / -$134 | 21.0/10.9, 13.0/14.5, 14.4/22.8 |
| last 5m swing, no caps (~45-65 pts) | +0.072 / $729 | +0.171 / $871 | -0.044 / -$168 | 21.8/26.1, 20.3/17.4, 13.2/33.2 |
| last 1m swing, >= 0.75 ATR (~36 pts) | +0.166 / $962 | +0.098 / $610 | -0.029 / -$84 | 26.9/19.3, 17.4/18.8, 15.1/24.1 |
| lowest low of 60 min, 0.5-2 ATR | +0.228 / $610 | +0.229 / $502 | -0.018 / -$68 | 14.3/9.2, 18.8/1.4, 9.9/7.5 |
| 1.0 x ATR / 2.0 x ATR | +0.120 / $498, +0.113 / $881 | +0.052 / $104, +0.102 / $266 | +0.005 / $64, +0.015 / $109 | |

**Every structure stop makes less than today in 2021-25 (most lose money: -$168 to +$44 a month vs +$73)** and none
beats today's H1 t-stat. A swing right behind a momentum close is inside the normal noise of the move: a tight structure
stop gets hit by the next wiggle (raw 1m swings: about 26 points, -0.10R a trade in H1). The fixed-ATR stop is the
"protected" distance for this kind of entry.

**2. Targets and management "like a person" (1,920 variants on 5 stops: today's, 1.0 / 2.0 x ATR, the two best structure
stops).** Three families:
- *the clock* (today's shape): 30 / 45 / 60 minutes, trails 1-1.5R from +0.5-1R or none, half off at +1R or at the first
  liquidity level;
- *structure targets*: the whole position (or the runner after a partial at the first level, stop to breakeven) out at the
  next opposing liquidity at least 1-2R away and at most 4R or anywhere: prior RTH high / low, overnight high / low, the
  prior week's high / low, today's RTH high / low, untaken 5m swing highs / lows of the last 3 days ("eq" = only equal
  highs / lows: two untaken 5m swings within 3 points), with or without a clock;
- *structure management*: no clock (or 2 hours), the stop follows each new confirmed 1m or 5m swing that formed after the
  entry (from +0, +0.5 or +1R), out on a change of character (a close beyond the last swing formed after the entry),
  optional liquidity target / partial.

| Best of each family on H1 (t-stat) | H1 avg R / $ a month | H2 | 2021-25 | 25K slot $ / month (own H1 size pick) |
|---|---:|---:|---:|---:|
| **today** | **+0.165 / $963** | **+0.200 / $667** | **+0.013 / $73** | **$266 / $38 / -$39** |
| clock: 60-min low stop, half at the first liquidity level, 45 min, trail 1R from +0.5R (the overall H1 pick) | +0.256 / $770 | +0.172 / $410 | -0.038 / -$128 | $284 / $17 / -$69 |
| structure target: 60-min low stop, half at the first level >= 1R (then breakeven), runner to equal highs / lows (1-4R), 60 min | +0.357 / $901 | +0.453 / $685 | +0.026 / $59 | $224 / $137 / -$33 |
| structure management: 1m swing trail from +0.5R, out on a 1m change of character, half at the first level >= 0.5R (then breakeven), runner to equal highs / lows >= 1.5R, no clock | +0.146 / $746 | +0.098 / $462 | +0.024 / $127 | $249 / $55 / -$38 |
| best for the 25K eval on H1: 5m swing trail from entry, 1m change of character, half at the first level >= 0.5R, no clock | +0.127 / $610 | +0.063 / $229 | +0.015 / $84 | $167 / -$28 / -$41 |

- Today's own H1 size pick in this stage was the push from session 8 ($266 / $38 / -$39); the finer grid of today's rule
  picked the push from session 5 ($270 / $37 / -$40, the tables above).
- **Carry-over:** 18 of the 1,920 beat today in H1 on both avg R and $ a month; 4 of those also in H2 and 2021-25 (all with
  the 1.0 x ATR stop: three with a 45-minute clock and no trail, e.g. +$1,009 / +$1,043 / +$283 a month at $150 a trade, one
  with a 5m swing trail and change-of-character exit); **none also on the 25K eval** (their H2 2-week fail is 38-49% vs 33%
  at 60% of the room: a tighter stop loses more often in a row). Their whole 25K slot is $234 / $62 / $12 a month, worse
  than today in H1, so they fail the H1 gate too.
- Structure management ("like a person") lowers the swings: on a funded 25K at the same size (1 micro, +$400 day stop) the
  accounts got stuck far less in 2026 (H1 0% vs 45%, H2 33% vs 100%; 2021-25 38% vs 29%). But it cuts the winners on trend
  days, where BLITZ earns: about -$200 a month in H1 and -$80 to -$200 in H2 at $150 a trade, and the eval passes less.
- Holding to a liquidity target or to the close (no clock) is the strongest idea in 2021-25 (equal highs / lows target, no
  clock: avg R +0.116, PF 1.27, +$320 a month) but trades half as often and loses money against today in both 2026 halves
  (-$326 / -$76 a month).

**3. Windows, entries and higher-timeframe structure (32 new ideas).** Opening drive (checks 09:45-10:30 or 10:00 / 10:30,
the same band), London continuation (a band from the 03:00 open, checks 04:00-08:30), each alone and added to today's
window, with or without the day filter; a retest entry (a limit 0.25 / 0.5 / 0.75 x 5m-ATR back toward the band, or at the
band, working 5-20 minutes, the same stop price, so a smaller risk and more micros); only with / not against / half size
against the 15m or 1h break-of-structure state.

| Idea | H1 avg R / $ a month | H2 | 2021-25 |
|---|---:|---:|---:|
| opening drive alone (15-min checks, filter) | -0.097 / -$480 | +0.115 / $162 | +0.033 / $98 |
| opening drive (10:00, 10:30) added to today, no filter | +0.072 / $456 | +0.113 / $721 | +0.037 / $305 |
| London continuation alone, no filter | +0.005 / -$16 | -0.045 / -$107 | -0.083 / -$545 |
| retest 0.25 ATR, 20 min | +0.168 / $724 | +0.187 / $685 | -0.004 / $3 |
| with the 1h structure only | +0.177 / $914 | +0.248 / $739 | +0.013 / $59 |
| half size against the 1h structure | +0.165 / $963 | +0.200 / $667 | +0.013 / $61 |

None beats today in all three. The opening drive has no edge in H1. London continuation loses in every span (2021-25
-0.08R a trade, t -4). A retest entry misses the strongest moves, the ones that never come back. 90-94% of BLITZ's signals
already point the same way as the 15m / 1h break-of-structure state, so the structure filter changes little (and at $150
a trade half size is still 1 micro, so the "half size" line equals today's there; on the 25K eval it did not help either).

**4. Eval-speed sizing (63 eval sizes x 24 funded sizes, 360 whole slots; plus 272 eval sizes / 1,152 slots for the other
rules).** Room share 30-100%, $450 / $600 caps, a "push" (from session 4-10 the room share rises to 60-100%), "need"
(what is still needed to pass / 2-3), a daily loss stop ($250 / $350), at most 2-3 trades a day, and for target rules
"one winner passes" (micros so that the target pays what is left). Funded: 10-45% of the room, $150-450 caps, with or
without a +$400 day stop. **0 of the 360 slots for today's rule make money in H1, H2 and 2021-25** (as before: 0 of 768).
The push is the only knob that meets the 2-week rule without lowering the money; daily-trade caps kill the trend days (2
a day: H2 2-week pass 6%).

**5. Today's rule in the eval, a structure rule once funded (new idea).** Structure management gets stuck less on a funded
25K, so: pass the eval with today's rule (the pick's size), then trade the funded 25K with the stage-3 rule that paid the most
funded $ in H1 at 1 micro (the 60-minute-low stop with a partial at the first liquidity level and a 45-minute clock: $189 a
month in H1, 0% stuck). Its slot: $276 / $49 / **-$64** a month (H1 / H2 / 2021-25) vs $270 / $37 / -$40 for today's rule
in both stages; 0 of 24 funded sizes beat today's slot in all three spans. Rejected.

**6. A same-day pattern (checked, not used):** after a losing first trade of the day the next trades did better in H1 and
2021-25 (+0.236R / +0.090R) but not in H2 (+0.142R vs +0.270R after a winner). No consistent sizing rule.

## Honesty checks

- **Random directions** (today's rule as account C, the same signal bars, a coin-flip side, the stop mirrored, 40 seeds):
  avg R +0.165 vs -0.029 (H1, p 0.024), +0.200 vs -0.014 (H2, p 0.049), +0.013 vs -0.044 (2021-25, p 0.024). The edge is
  there in the trades; on the 25K slot it shows in H1 only (above).
- **Neighbours of the size pick** (40% +/- 10 points, push from session 3 / 7, push to 80% / 120%): $256-278 / $29-32 /
  -$40 to -$42 a month, i.e. flat. The pick is not a lucky corner, and nothing near it makes money in 2021-25.
- **Late entry**: 1 bar late (1 minute in 2026) H1 / H2 avg R +0.139 / +0.112 (from +0.165 / +0.200), 25K 2-week pass in H2
  36 -> 12% at 40% of the room; 2 bars late +0.063 / +0.066. **The entry must go in within a minute of the check** (as
  scalp-na-mffu.md found). (On 5m bars 1 bar late = 5 minutes; that line is not comparable.)
- **Extra slippage**: +1 tick a side $921 / $635 / $18 a month at $150 a trade; +2 ticks $879 / $603 / -$37.
- **Look-ahead**: swings count only after their confirming bars closed (1m: 3 bars; 5m: 2 five-minute bars, known at the
  last 1m bar of the confirming 5m bar); liquidity levels use the prior day / week and bars up to the signal; the account-C
  arrays use the LIT / ATLAS research trades' own fill times (a LIT limit filled inside a minute closes BLITZ at the next
  minute's open). The new executor reproduces scalp_na_lib's BLITZ trade for trade (330 / 330 on 1m, 2,237 / 2,237 on 5m);
  the eval engine equals scalp_na_lib's eval and slot (`tools/blitz25k_size.py selfcheck`). Hand-checked skips and hedge
  cuts (e.g. 2026-03-20 11:30 short skipped while LIT was long 11:25-12:32; 2026-08-06 11:00 long closed at 11:15 when the
  other account went short).
- **Short check half**: H2 has 78 sessions (69 eval starts with 10 sessions ahead, overlapping), so a 2-week pass or fail
  rate there moves by about +/-10 points on noise alone; H1 has 128 sessions, 2021-25 1,077.
- **Multiple testing**: 1,997 rule variants (+ 24 eval / funded hybrids). Picking on H1 alone found nothing that held; the
  4 that held on money in all three spans were found by looking at all three, and they fail the 25K eval anyway.
- **What is not modelled**: 2021-25 is the same rule on 5m bars (coarser fills; the 1m swings are 5m swings of strength 1
  there); LIT / ATLAS clashes come from their research trades (2026 lit_live, 2021-25 5m REF rows; ATLAS = account B's
  research trades); MFFU's funded payout rules as in scalp_na_lib (50% best-day, 5 payouts); H2 funded = only 6 starts.

## Verdict

- **Rule: no change ("no-change" in `research/scalp/blitz_25k_pick.json`).** No structure stop, liquidity target,
  partial, swing trail, change-of-character exit, window or entry beat today's rule in 2026 H1, H2 and 2021-25 together.
  "Like a person" ideas help in 2021-25 or lower the swings, but they cut the trend-day winners that make BLITZ's 2026 money.
- **Account C: use the anti-hedge rule** (strict version allowed). It costs nothing in 2026 and about $16 a month at $150 a
  trade in 2021-25.
- **25K size for its own account:** 40% of the room for eval sessions 1-4, then 100% (capped $600 and by the daily loss),
  funded 1 micro with a +$400 day stop. It meets the owner's 2-week rule (71-74% decided, <= 10% of passes slower than 3
  weeks) at the same money as today's paper size. Expect about a third of evals to pass in 2 weeks, a third to fail, and the
  slot to pay about $270 a month in an H1-like market, about $40 in an H2-like market (no better than random), and lose about
  $40 a month in a 2021-25-like market.
- **Honest bottom line:** BLITZ on its own 25K stays a small, 2026-regime bet. Its best use is still as an add-on on LIT's
  funded 50K (scalp-na-mffu.md: +$290-300 a month per slot), where the room is big enough for its losing streaks.

## What is left

- **The one lead is closed.** "1.0 x ATR stop, 45-minute clock, no trail" made more per trade than today in all three spans
  at a fixed $150 (+$46 / +$376 / +$210 a month) but loses more often in a row, which hurts a 25K. Tried where the room is
  bigger, as the add-on on LIT's funded 50K (tools/scalp_na_combo.lit_money, 20% of the room, <= $450, only while LIT is flat):
  the LIT slot gains +$253 / **-$31** / +$21 a month (H1 / H2 / 2021-25) against today's BLITZ +$301 / +$290 / +$16
  (`research/scalp/b25_lit50k_lead.json`). Worse in H2: today's BLITZ stays there too.
- The engine (engine/account_c.py, engine/blitz.py) needs: the anti-hedge skip / close-first, the push size, and an entry
  within a minute of the check.

## Files

- `tools/blitz25k_lib.py`: structure (1m / 5m swing pivots, 15m / 1h break-of-structure state), liquidity levels, the
  candidate builder (stops, targets, windows, retest entries, structure filters / size), account-C arrays, the numba
  executor (= scalp_na_lib's fills + targets, swing trail, change of character, retest limits, the anti-hedge skip / close).
- `tools/blitz25k_grid.py`: `baseline` (account C vs alone), `stops`, `mgmt`, `ideas`, `checks`, `lit50k` (the lead on
  LIT's 50K).
- `tools/blitz25k_size.py`: `selfcheck`, `grid` (the rule picks x sizes x slots), `today` (today's rule: eval sizes, slots,
  neighbours, random directions), `table`, `hybrid` (today's rule in the eval, a structure rule once funded).
- `tools/blitz25k_save.py`: the runs and `research/scalp/blitz_25k_pick.json`.
- Results: `research/scalp/b25_baseline.json`, `b25_stops.json`, `b25_mgmt.json` (summary; the full grid `b25_grid_mgmt.json`
  is local only), `b25_ideas.json`, `b25_checks.json`, `b25_size.json`, `b25_today_sizing.json`, `b25_size_table.json`,
  `b25_hybrid.json`, `b25_lit50k_lead.json`, `blitz_25k_pick.json` (the 25K / today grids `b25_grid_size.json`, `b25_grid_today.json` are local only).
- Runs: `blitz25k_today_acct_c` (today's rule as account C, $150 a trade), `blitz25k_h1pick` and `blitz25k_structure`
  (rejected).
