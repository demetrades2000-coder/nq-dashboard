## Money first

**BLITZ: one sizing change for the owner to approve before its own 25K starts. ATLAS: keep it exactly as it is.**

- **BLITZ, the 25K eval size ("later-break size").** Trade the day's first band break on a side at half of today's size.
  Trade a later break on the same side (the move already broke out at an earlier check) at 1.75 x today's size, never more
  than the room to the floor. The rule and the trades stay the same; only the eval size changes. In every test period it
  passes more evals in 2 weeks or as many, fails fewer, and the whole 25K account slot pays the same or more:
  **+$16 a month in H1, +$15 in H2, +$1 in 2021-25.** That is small money. The win is the eval: in H1 about 12 more passes
  and 14 fewer fails per 100 evals.
- **The honest limit.** BLITZ on its own 25K still loses about $40 a month in a 2021-25-like market with any size. This
  change makes the eval better; it does not create edge.
- **ATLAS: 110 new variants, 0 pass the test.** Member weights, member agreement, LIT copied in, a 4th member, size by
  setup quality, London-clock windows in the DST weeks. ATLAS stays as it is. The best lead is still the two stop-hunt
  members at half size (atlas-v2.md), which passed again tonight.
- **One new ATLAS lead for paper only: the hunts + the noise-area day-hold member at half size.**
  - It makes more passes a month and more eval-path $ than today in all four periods: H1 $2,046 vs $1,394 a month, H2
    $1,584 vs $547, 2025 +$47 vs -$148, 2021-24 +$194 vs -$36. 13 of 15 neighbouring weights do the same.
  - But it fails the 2-week test in H1: 62.2% pass with 5.9% dead, against today's 65.5% and 0.8%.
  - It is a lead for the ATLAS v2 paper shadow, not a switch.
- **Slippage is BLITZ's real enemy.** With 1 tick more per side, 2026 keeps most of its edge (avg R +0.155 / +0.191
  instead of +0.165 / +0.200). 2021-25 drops to zero (+0.000). One bar late kills H2 (the 25K slot goes from +$37 to
  -$36 a month). The entry must go in within the minute of the check.

**The later-break size on the 25K eval** (BLITZ as account C: never opposite LIT or ATLAS; costs in; a fresh eval every
session; "slot" = the whole account life over 6 months, net of every $63 eval; funded size unchanged):

| | 2-week pass / fail | decided in 2 wks | 3-week pass / fail | median sessions to pass | passes slower than 3 wks | **25K slot $ / month** |
|---|---:|---:|---:|---:|---:|---:|
| 2026 H1, today's pick | 36.1 / 37.8 | 73.9% | 45.6 / 46.5 | 6 | 9.8% | $270 |
| **2026 H1, later-break** | **47.9 / 23.5** | 71.4% | 63.2 / 24.6 | 7 | 12.0% | **$286** |
| 2026 H2, today's pick | 36.2 / 34.8 | 71.0% | 32.8 / 57.8 | 5 | 0% | $37 |
| **2026 H2, later-break** | **36.2 / 21.7** | 57.9% | 35.9 / 39.1 | 5 | 0% | **$52** |
| 2021-25, today's pick | 20.4 / 50.2 | 70.6% | 23.8 / 64.8 | 6 | 5.6% | -$40 |
| **2021-25, later-break** | **24.7 / 48.4** | 73.1% | 29.0 / 60.9 | 5 | 2.8% | **-$39** |

BLITZ's trades do not change: 8.5 / 6.8 / 8.6 trades a week, 2+ trades in 89 / 75 / 80% of weeks. At $500 a trade
(fractional micros, costs in) today's BLITZ is PF 1.61 / 1.82 / 1.04, $2,928 / $2,851 / $232 a month. With the
later-break sizes it is PF 1.74 / 1.88 / 1.05 and $4,711 / $4,093 / $414 a month, but about 1.4 x the average risk. Per
unit of risk the gain is small: +0.189 / +0.205 / +0.016 R instead of +0.165 / +0.200 / +0.013.

## The hypotheses (written down before any test)

| # | Bot | Idea | Why it could work | Result |
|---|---|---|---|---|
| 1 | BLITZ | Trend-day predictor at the signal (range so far, first-hour range, first-hour volume, overnight range, where the open sits in it, gap, VIX change), used to SIZE x1.25-2 up / x0.5-0.75 down | BLITZ earns on trend days (5-6 trades) and bleeds on chop days | rejected: survivors at chance |
| 2 | BLITZ | Later-break size: the day's first band break small, later same-side breaks bigger | the second break is the "break-and-hold" a person waits for: the day has confirmed | **adopt-candidate (25K eval)** |
| 3 | BLITZ | Break-and-hold over 2 checks (the previous check also beyond the band) as a size | the same idea, stricter | rejected (flips in H2) |
| 4 | BLITZ | 2-sigma excursion: bigger when the close is 1.5-2+ sigma beyond the open | a stronger break is more momentum | rejected (chance, 2023 / 2021 worse) |
| 5 | BLITZ | VWAP side / distance as a size | momentum on the VWAP side | rejected: 95% of trades already on the VWAP side; distance flips |
| 6 | BLITZ | One more check at 10:30 (with the day filter) | the owner's "first check at 10:30 vs 11:00" | rejected (H1 collapses) |
| 7 | BLITZ | The 25K eval sizing with a day-type size | faster decisions on trend days | rejected: the slot $ does not move |
| 8 | BLITZ | Real slippage: +1 / +2 ticks a side, 1-2 bars late, on the 25K numbers | "1 tick late = big H2 drop" | info: see the table |
| 9 | BLITZ | The later-break size on LIT's funded 50K (BLITZ's add-on home) | same mechanism | neutral: no change there |
| 10 | BLITZ | Time of day as a size | lunch chop | rejected (flips between spans) |
| 11 | ATLAS | Member weights from the member's own last 5 / 10 / 20 trades (hot x up, cold x down) | regimes last weeks | rejected (0 of 24) |
| 12 | ATLAS | Member agreement: another member already took the same side today -> bigger, the other side -> smaller | two independent setups agreeing | rejected: H2 up, H1 down |
| 13 | ATLAS | The day's 2nd trade sized by the 1st trade's result | a loss warns, a win confirms | rejected (0 of 7) |
| 14 | ATLAS | A 4th member: LIT itself, copied onto the 25K (account-B size) | LIT is the strongest edge | rejected: 2021-24 worse, and it ties the two accounts together |
| 15 | ATLAS | A 4th member: the noise-area day-hold strategy (diversifier-search.md, positive in all four spans alone) | a proven, uncorrelated family | alone: rejected (dead evals up); **on top of the hunts lead: promising** |
| 16 | ATLAS | S/R level quality -> size (how many levels sit inside the sweep; a prior-day / week level among them) | stacked liquidity = a stronger level | rejected (0 of 16) |
| 17 | ATLAS | EMA pullback depth -> size (sweep depth below the swing, distance from the EMA 50) | a deeper stop hunt = a better entry | rejected (0 of 32) |
| 18 | ATLAS | Windows on the London clock in the US / UK DST gap weeks (EMA 04:00-09:30, MACD 03:00-06:00) | London opens at 04:00 ET in those weeks (this week is one) | rejected: the fact is true, the members lose |
| 19 | ATLAS | MACD sweep divergence on 15m | slower, cleaner divergences | not redone: second-md.md (15m: -3.6R in 2025, -14.3R in 2021-24) |
| 20 | ATLAS | Size by the day's range so far / trend-day | as BLITZ | not redone: atlas-confluences.md fact "range so far" (chance) |

## BLITZ 1: the later-break size (adopt-candidate, 25K eval only)

**The rule (exact).** Everything about BLITZ stays as it is (engine/blitz.py VERSION 2, blitz-25k.md). The checks are the
1m closes at 11:00, 11:30 ... 15:30, and a close beyond the noise band is a break on that side. Each day, count the checks
whose close was beyond the band on each side. Every check counts, traded or not. A BLITZ signal is a **first break** when
its count is 1 and a **later break** when it is 2 or more. The 25K eval size becomes:

- risk = min($600 x m, min(f x m, 1.0) x room, 0.9 x what is left of the $600 soft daily loss);
- m = 0.5 on a first break, 1.75 on a later break;
- f = 0.4 for eval sessions 1-4, then 1.0 from session 5 (today's push);
- micros = risk / ((stop + 1 tick) x $2 + $1.90), at least 1 while one stop-out fits half the room (as today).

The room (balance minus the trailing floor) is the hard limit: no single trade can take the account through the floor.
Funded 25K: unchanged (10% of the room, at most $150, no new trade after +$400 on the day).

**Why it works.** The first break of the day is BLITZ's weakest trade (avg R +0.066 in H1, +0.178 in H2, -0.001 in
2021-25). Later breaks are better: +0.203 / +0.209 / +0.018. On a chop day BLITZ usually gets one break and loses, and it
now loses half. On a trend day the move breaks again at the next check. Those later breaks get the bigger size, often
paid from the day's own profit, because the daily-loss room grows after a winning start. 49 of the 60 days BLITZ
traded in H1 had a later break (23 of 28 in H2, 417 of 502 in 2021-25).

**Checks:**

- **Shuffled sizes** (the same 0.5 / 1.75 sizes on random trades, 40 draws): they reach the pick's 2-week pass-minus-fail
  in 0% / 2.5% / 7.5% of draws (H1 / H2 / 2021-25). They match its slot $ in 20% / 0% / 10% of 20 draws. So the gain
  comes from which trades get the size, not from the average size.
- **Random directions** with the same sizes (the same signal bars, a coin-flip side, 8 seeds): slot -$56 / +$27 / -$66
  a month. Today's pick with random directions: -$49 / +$30 / -$67. The size does not help trades without BLITZ's edge.
- **Neighbours:** all 54 room-capped variants beat today's pick on 2-week pass, fail and slot $ in all three spans
  (later x1.5-2.0, first x0.5, room share 0.4-0.6, push from session 4-6, eval only or eval + funded). The pick sits in
  the middle of a flat plateau. With the $600 cap kept fixed, 0 of 54 beat today. The gain needs the later break to be
  pressed with the day's profit.
- **Years (2021-25, 5m bars), 2-week pass / fail:** 2022 30.1 / 49.8 (today 24.9 / 50.2), 2023 25.3 / 49.0 (24.9 / 47.0),
  2024 22.0 / 61.2 (15.2 / 58.4), 2025 26.1 / 39.4 (20.9 / 48.2). Passes go up every year; fails go up in 2023 and 2024.
- **Half-years and 2026 quarters:** pass minus fail is better in 9 of 13 periods. 2026 Q1 29.6 / 22.2 (today 31.5 / 40.7),
  Q2 57.1 / 28.6 (37.5 / 33.9), Q3 22.8 / 26.3 (24.6 / 38.6). It is worse in 2021 H2 (44 sessions), 2023 H2 (17.5 / 56.7 vs
  20.0 / 49.2) and 2024 H2 (15.6 / 69.7 vs 13.9 / 61.5); Oct 1-16 is the same. In a choppy half-year the press on later
  breaks adds fails.
- **Stress, 25K slot $ a month (pick vs today):**
  - +1 tick a side: $272 / $42 / -$48 vs $257 / $28 / -$49;
  - +2 ticks: $251 / $33 / -$54 vs $236 / $20 / -$59;
  - 1 bar late: $206 / -$36 / -$67 vs $192 / -$36 / -$67.
  The pick is never worse than today's pick.
- **The risk it takes in the eval:** a median trade risks $318 (today $370) and the 90th percentile $905 ($548). The
  maximum is $1,050 ($589): a later break after a winning start. Expect bigger single trades on trend days.

**The weak spots:**

- **H2 decides fewer evals inside 2 weeks** (57.9% vs 71.0%). That is because fewer fail (21.7% vs 34.8%); the extra
  evals stay open, and by 3 weeks 75% are decided (today 91%).
- **H1 passes slower than 3 weeks:** 12.0% vs 9.8%.
- **Per trade, the size is within chance.** The multiplier placebo p (x1.5 / x0.5) is 0.16 / 0.42 / 0.32, and in the
  2021-25 years the per-trade gain flips sign. The evidence is the eval path, not a better trade.

**On LIT's funded 50K** (BLITZ's add-on home, scalp-na-mffu.md, 20% of the room, at most $450): the later-break size is
neutral. At x1.5 / x0.5, BLITZ adds +$314 / +$289 / +$20 a month to LIT's slot (today's size: +$301 / +$290 / +$16);
x2.0 / x0.5 hurts (+$193 / +$164 / +$14). Keep today's add-on size there.

**Exact change for the owner to approve** (not switched; `research/scalp/blitz_25k_pick_v2.json`):

- `engine/account_c.py` `qty()`, eval stage only:
  - `m = later_x if day_breaks(side) >= 2 else first_x`, with `first_x` 0.5, `later_x` 1.75;
  - `f_eff = min(f x m, 1.0)`, `cap_eff = cap x m`, then `frac_qty(...)` as today.
- `engine/blitz.Engine` keeps a per-day count of check closes beyond the band on each side (the research counts every check
  close, traded or not).
- Pick-file keys: `"eval_25k": {..., "later_break": {"first_x": 0.5, "later_x": 1.75, "f_max": 1.0, "cap_scales": true}}`.
- The funded block stays as it is.

## BLITZ 2: trend-day predictors as a size (rejected)

430 size tilts: 17 facts known at the signal, x both directions, x tercile / median / quartile cuts from 2026 H1, x 5
multiplier pairs. A tilt counts as better when it is better per unit of risk AND in $ in a span.

Average R a trade by the fact's H1 tercile (low / middle / high third):

| Fact at the signal | 2026 H1 | 2026 H2 | 2021-25 |
|---|---|---|---|
| range so far (09:30 to the signal) vs the 14-day RTH range | +0.085 / +0.181 / +0.227 | +0.104 / +0.192 / +0.250 | -0.013 / +0.060 / +0.001 |
| first-hour range vs its 20-day mean | +0.166 / +0.031 / +0.284 | -0.001 / +0.398 / +0.138 | +0.034 / +0.016 / -0.006 |
| first-hour volume vs its 20-day mean | +0.204 / +0.095 / +0.193 | +0.141 / +0.454 / +0.084 | -0.028 / +0.063 / -0.001 |
| overnight range vs its 14-day mean | +0.124 / +0.169 / +0.196 | +0.163 / +0.357 / +0.084 | -0.002 / +0.051 / -0.005 |
| the 09:30 open's place in the overnight range (trade's side) | +0.052 / +0.196 / +0.241 | +0.000 / +0.084 / +0.729 | +0.010 / +0.028 / +0.001 |
| gap size | +0.102 / +0.132 / +0.253 | +0.168 / +0.159 / +0.250 | +0.004 / -0.003 / +0.049 |
| VIX change into the day | +0.141 / +0.271 / +0.083 | +0.244 / +0.365 / -0.014 | +0.026 / +0.056 / -0.050 |
| excursion from the open in sigmas (the "2-sigma" idea) | +0.011 / +0.184 / +0.297 | -0.075 / +0.345 / +0.195 | +0.045 / +0.016 / -0.014 |
| distance from VWAP in ATR | +0.288 / +0.133 / +0.073 | +0.016 / +0.127 / +0.689 | +0.017 / -0.025 / +0.052 |

- **39 of 430 tilts beat today in all three spans.** The same grid on shuffled facts finds 36 on average (95th percentile
  57), so 39 is what chance gives.
- **The best family, range so far, wins 11 of its 15 variants.** A shuffled run's best family reaches 11 or more in 49%
  of runs.
- **The cleanest one, x1.5 above the H1 median of the range so far and x0.5 below:**
  - per unit of risk +0.193 / +0.233 / +0.020 R (today +0.165 / +0.200 / +0.013);
  - multiplier placebo p 0.18 / 0.16 / 0.25;
  - worse in 2023 and 2024;
  - the 25K slot does not move ($293 / $30 / -$39 vs $277 / $30 / -$41 on 300 paths).
- **The others:**
  - VWAP side carries no information: 95% of BLITZ's trades are already on the VWAP side.
  - "Held at the previous check" is worse in H2.
  - Time of day flips between spans.
- BLITZ is a trend-day machine, but **the day type is not predictable enough at the signal to size on.** The later-break
  count works because it is the trend day showing itself inside BLITZ's own signals.

## BLITZ 3: slippage, a late entry and a 10:30 check

Today's rule, the $500 view and the 25K slot (today's pick):

| Stress | avg R H1 / H2 / 2021-25 | $ / month at $500 | 25K 2-week pass / fail H1 / H2 / 2021-25 | 25K slot $ / month |
|---|---|---|---|---|
| none | +0.165 / +0.200 / +0.013 | $2,928 / $2,851 / $232 | 36.1/37.8, 36.2/34.8, 20.4/50.2 | $267 / $38 / -$40 |
| +1 tick a side | +0.155 / +0.191 / +0.000 | $2,765 / $2,725 / $1 | 37.8/38.7, 34.8/36.2, 19.4/51.9 | $257 / $28 / -$49 |
| +2 ticks a side | +0.146 / +0.182 / -0.013 | $2,602 / $2,599 / -$230 | 32.8/43.7, 34.8/37.7, 16.4/53.7 | $236 / $20 / -$59 |
| 1 bar late (1 minute) | +0.139 / +0.112 / -0.032 | $2,489 / $1,623 / -$579 | 40.3/29.4, 11.6/40.6, 17.5/54.7 | $192 / -$36 / -$67 |
| 2 bars late | +0.063 / +0.066 / -0.061 | $1,137 / $971 / -$1,089 | 25.2/42.9, 13.0/39.1, 16.3/57.3 | $46 / -$43 / -$72 |
| **+ a 10:30 check** | **+0.092** / +0.154 / +0.030 | $1,797 / $2,475 / $580 | 22.7/46.2, 26.1/29.0, 25.7/44.9 | **$54** / $62 / -$13 |

- **Slippage:** each extra tick a side costs about 0.01 R a trade. That is enough to erase 2021-25, which is the reason the
  2021-25 reference shows almost nothing.
- **Latency:** one minute late loses half of the H2 edge, so the entry must go in within the minute of the check.
- **The 10:30 check:** it helps 2021-25 and H2, but H1 loses more than half its edge. Rejected; the window stays at
  11:00-15:30.

## ATLAS (account B, Builder 25K): 110 variants, none passes

The test is atlas-v2.md's (the real account-B rules: need size, one position, max 2 a day, never opposite LIT incl. its
armed setups, $600 soft daily loss, stuck under $100). A change passes when the 2-week pass rate goes up or stays the same,
dead evals (fail + stuck) do not go up, and the eval-path $ goes up, in both 2026 halves. 2025 and 2021-24 must also not
lose more than today. "$ / month" = back-to-back eval paths started every 5th session, less the $63 fees.

| Variant (best of its family) | H1 2-wk pass / dead, $ / mo | H2 | 2025 | 2021-24 | Verdict |
|---|---|---|---|---|---|
| **ATLAS today** | **65.5 / 0.8, $1,394** | **43.5 / 0.0, $547** | 30.1 / 23.3, -$148 | 22.9 / 27.1, -$36 | |
| member weights, last 5 trades vs own mean x1.25 / x1.0 (24 variants) | 67.2 / 0.8, $1,440 | 43.5 / 0.0, $512 | -$97 | -$21 | H2 $ down |
| member weights, last 20 trades x1.5 / x0.5 | 64.7 / 8.4, $1,864 | 46.4 / 10.1, $727 | +$6 | -$96 | dead evals up |
| member agreement x1.25 / against x0.75 (6) | 62.2 / 3.4, $1,517 | **53.6** / 0.0, $599 | -$134 | -$1 | H1 down |
| 2nd trade after a loss x0.5 (7) | 60.5 / 0.0, $1,312 | 53.6 / 0.0, $571 | -$104 | +$35 | H1 down |
| + LIT copied in x0.25 (9) | **69.7 / 0.0, $1,853** | 49.3 / 0.0, **$1,297** | -$133 | **-$79** | 2021-24 worse |
| + NA day-hold x0.25 (12) | 70.6 / **9.2**, $1,625 | 44.9 / 2.9, $792 | +$107 | -$160 | dead evals up |
| + NA day-hold x0.5 + hunts x0.5 | 62.2 / 5.9, $2,046 | 55.1 / 0.0, $1,584 | +$47 | +$194 | H1 down |
| EMA sweep depth: deep x1.25 / shallow x0.75 (48 geometry sizes) | 66.4 / 0.8, $1,490 | 43.5 / 0.0, $547 | -$124 | -$13 | H2 $ flat (-$1) |
| London clock in the DST gap weeks (3) | 64.7 / 0.8, $1,245 | 43.5 / 0.0, $547 | -$207 | -$7 | H1 down |
| *reference: the stop hunts x0.5 (atlas-v2.md lead)* | *67.2 / 0.0, $1,655* | *55.1 / 0.0, $665* | *-$69* | *+$16* | *passes again* |

- **Member weights from recent trades:** 0 of 24 pass. Down-weighting a cold member removes the eval's "one winner
  passes" trade as often as a loser. Up-weighting either sits at the 25K caps or kills evals (dead 8-10%).
- **Member agreement and the 2nd trade's size:** both lift H2 to 53.6% but cost H1 (60-62% vs 65.5%). It is the same trade
  of passes between the halves that atlas-confluences.md found for its confluences.
- **LIT copied in:**
  - at x0.25 it is better in both 2026 halves (H1 $1,853, H2 $1,297 a month);
  - but 2021-24 loses more than today (-$3,044 vs -$1,388 over the span), so it fails the reference;
  - it also makes the 25K a second LIT account: one LIT losing day hits both (lit-builder-25k.md: two accounts on the same
    LIT signals pass or fail together 92-95% of the time).
  Not adopted.
- **The NA day-hold member** (Zarattini's rule, held to the close): it adds money in 2025 but raises dead evals in H1 (5.9-17%).
  A trend trade with 26-30% winners does not fit a 25K's $1,000 room.
- **Setup geometry:**
  - every S/R trade has a prior-day or prior-week level inside its sweep, so that fact carries no information;
  - the level count flips between spans;
  - EMA sweep depth and distance from the EMA 50 are better in some spans and worse in others.
- **DST gap weeks:**
  - **The fact holds.** In the 106 gap sessions since 2021-11 (US already on summer time while the UK is not, or the
    reverse), the biggest overnight volume jump moves from 03:00 ET (x2.45 on normal days) to 04:00 ET (x2.68): London's
    08:00 open. Frankfurt's jump moves from 02:00 to 03:00 ET.
  - **But on those days, EMA and MACD do better in their New York windows.** On the London clock, EMA's gap-week trades go
    from 52 to 41 and from +3.7R to -0.4R; MACD's go from +18.8R to +14.9R.
  - The windows stay on the New York clock, including this week (2026-10-26 to 10-30 is a gap week).

### The one ATLAS lead (promising, paper only): the hunts + the NA day-hold member

The NA day-hold member is the noise-area intraday momentum held to the close (Zarattini 2024; diversifier-search.md's
joint pick, positive as futures trading in all four spans, random-entry placebo p 0.007 in 2026). Alone it adds dead evals.
On top of atlas-v2.md's lead (sh_asia + sh_trend at half size) it changes the account:

| ATLAS 25K | H1 2-wk pass / dead | passes a month H1 / H2 / 2025 / 2021-24 | eval-path $ a month H1 / H2 / 2025 / 2021-24 |
|---|---:|---:|---:|
| today | 65.5 / 0.8 | 1.40 / 0.49 / 0.18 / 0.45 | $1,394 / $547 / -$148 / -$36 |
| + hunts x0.5 (atlas-v2.md) | 67.2 / 0.0 | 1.61 / 0.73 / 0.21 / 0.37 | $1,655 / $665 / -$69 / +$16 |
| **+ hunts x0.5 + NA day-hold x0.5** | **62.2 / 5.9** | **2.12 / 1.50 / 0.34 / 0.68** | **$2,046 / $1,584 / +$47 / +$194** |

- **Neighbours:** 13 of 15 weight pairs (NA x0.25-0.75 by hunts x0.4-0.6) have more passes a month and more eval-path $
  than today in all four spans.
- **Why it fails the test:** in H1 it passes 2-4 points less in 2 weeks and kills 5-8% of evals in 2 weeks. A trend trade
  held to the close with 26-30% winners sometimes eats the room early. H2's 2-week pass is 55.1% (today 43.5%).
- **Caveats:**
  - the hunts' own caveats carry over (picked on H1 + 2025 + 2021-24; sh_trend needs a limit entry account B cannot place);
  - the NA member has no bar path in this executor, so an opposite LIT entry drops the whole trade (conservative);
  - more ATLAS positions mean BLITZ (account C) yields more often;
  - eval-path $ is not withdrawable money, and MFFU allows at most 2 funded 25Ks per person, so more passes a month help
    only while a funded slot is free.
- **Next step:** add it to the ATLAS v2 paper shadow (`engine/atlas_v2.py`) as an optional member (owner's call). Decide
  after 20+ paper NA trades. Run `ab_atlas_na_hunts_lead`.

## Honesty checks

- **Costs in everywhere:** $1.90 a micro round trip, 1 tick on every market and stop fill, a same-bar tie counts as a loss,
  limits fill only when traded through. CME NQ1! futures only (1m 2026, 5m 2021-25).
- **No look-ahead:** the break count is known at the signal close, from the band and the check closes up to it. Day facts
  use the prior session, or bars up to the signal. The executor and the eval / slot engines are the ones blitz-25k.md
  checked: 330 / 330 trades = scalp_na_lib, and the eval = scalp_na_lib.run_eval.
- **The baselines reproduce the stored studies:**
  - BLITZ's 25K pick: 36.1 / 37.8, 36.2 / 34.8, 20.4 / 50.2; slot $270 / $37 / -$40 = blitz-25k.md;
  - ATLAS today: H1 65.5 / 0.8, $8,504, H2 43.5 / 0.0, $2,029 = atlas-v2.md.
- **Multiple testing:** BLITZ about 1,080 rows (430 tilts, 192 eval sizes, 180 + 162 later-break neighbours, 78 + 30
  robustness rows, 5 on LIT's 50K) and ATLAS 110.
  - The later-break idea was first seen as one of the 430 tilts (nth: 4 of 5 variants better in all three spans). It was
    then sized on the 25K, picked on H1 within a pre-set speed rule, and checked on H2 and 2021-25.
  - Its eval effect beats shuffled sizes in all three spans. Its per-trade effect does not.
- **Short H2:** 78 sessions (69 eval starts). One more pass or fail moves the H2 2-week rates by about 1.4 points, and noise
  alone moves them by about +/-10.
- **Not modelled:**
  - 2021-25 is 5m bars, so coarser fills;
  - LIT / ATLAS clashes use their research trades;
  - the engine's own count of breaks has to be built (research counts every check close beyond the band on a side).

## What is left

- **If the owner approves the BLITZ v2 eval size,** build it in `engine/account_c.py` + `engine/blitz.py` (break counter,
  `later_break` block). Replay 2026 through account C's live loop (`tests/test_account_c`) against these numbers before the
  25K starts. Paper first.
- **ATLAS:** nothing to switch. Two leads stay on paper.
  - The stop-hunt members at half size (atlas-v2.md; sh_trend needs a limit entry account B cannot place yet).
  - The new one: the same + the NA day-hold member at half size.
  Next step: add the NA member to the ATLAS v2 paper shadow (owner's call).
- **BLITZ in 2021-25:** BLITZ itself is near break-even there, and +1 tick erases it. A 25K for BLITZ is a bet that 2026's
  intraday momentum continues; watch account C's performance contract (BLITZ_STRATEGY.md) from the first week.

## Files

- **Code:** `tools/ab_edge.py`.
  - BLITZ: `blitz`, `blitz2`, `blitz_eval`, `blitz_nth`, `blitz_pick`, `blitz_safe`, `blitz_final_safe`, `blitzx`, `blitz50`.
  - ATLAS: `atlas`, `atlas_geo`, `atlas_na`, `dst`.
  - Output: `pick_v2`, `save`.
- **BLITZ results (`research/scalp/`):** `ab_blitz.json` (430 tilts), `ab_blitz2.json` (family placebo, per year),
  `ab_blitz_eval.json`, `ab_blitz_nth.json`, `ab_blitz_pick.json`, `ab_blitz_safe.json`, `ab_blitz_final.json`,
  `ab_blitz_final_safe.json` (the pick's numbers and checks), `ab_blitz_x.json` (slippage / late / 10:30),
  `ab_blitz_lit50k.json`.
- **ATLAS results (`research/second/`):** `ab_atlas.json`, `ab_atlas_geo.json`, `ab_atlas_na.json`, `ab_atlas_na_hunts.json`
  (the lead's neighbour grid), `ab_atlas_dst.json`. Command `atlas_na_hunts`.
- **The adopt-candidate:** `research/scalp/blitz_25k_pick_v2.json`, the same shape as `blitz_25k_pick.json`. The new keys are
  `engine.eval_25k.later_break`, `sizing.eval.later_break` and `checks`.
- **Runs:** `research/runs/ab_*.json`. BLITZ runs are stored at $500 x the size multiplier a trade; ATLAS runs store the
  eval-path trades of the 4 spans.

Paper research only. Nothing in `engine/`, `second_model.json` or `live_model*.json` was changed.
