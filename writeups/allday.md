## In one minute

- **The ask:** trade 24/7 (CME NQ trades 23 hours a day, Sunday 18:00 to Friday 17:00 ET), with more setups at the same or a
  higher win rate than LIT.
- **What was done:** the day was cut into 10 windows. Each one was mapped, then 7,800 setups were tested in the 9 windows the
  MFFU account can trade (16:00-17:00 cannot: MFFU closes every position at 16:10).
- **Answer: no new setup or 24/5 schedule passes.** Nothing to switch on.
  - Every window's best setup on Jan-Jun 2026 failed its untouched check (Jul-Oct 2026, 2025, 2021-24).
  - As a group the 7,800 setups do no better than random entries: 1.1% are positive in all four periods; random entries with
    the same stops and targets manage 1.3%.
  - The full 24/5 schedule (LIT + one H1 pick in every window) looks great in H1 (10 trades a week, +$40.5k) and then loses
    $12.2k in H2. On LIT's 50K eval its 2-week fails go from 0% to 27-35% in H2.
- **What the map says:** in every window a swept high or low closes back inside about half the time (43-55%). The night is
  much busier in 2026 than in 2021-25 (Asia's range is 28% of the day vs 17%), but busy is not the same as tradable.
- **More trades are easy, good trades are not.** 4-5 trades a week at about LIT's win rate is reachable (LIT + one evening
  slot). 10 a week costs money in every check period.
- **Closest leads (paper only, nothing built, not switched on):**
  1. LIT's own Asia slot (lit-more-entries.md) put on ATLAS's Builder 25K instead of LIT's 50K: H2 2-week passes go from
     43.5% to 56.5% with no extra dead evals. But H1 is a little worse (68.9 -> 68.1% pass, 7.6 -> 8.4% dead) and 2021-24 is
     worse (38.9 -> 46.8% dead).
  2. An Asia reclaim of the evening range (20:00-00:00; it sweeps the 18:00-20:00 high or low and closes back inside with a
     CISD). It is positive in all four periods (234 trades, PF 1.11-1.85) at about 1 a week. But the win rate is only 40%,
     neighbouring settings fail H1, 2023 and 2024 lost money, and random entries match it 10-25% of the time.
- **Win rate, honestly:** LIT's 55% counts the breakeven + 1.25 scratches as wins. Its real winners (+0.5R or more) are 22.5%
  in H1 and 32.5% in H2. Several night setups beat that "clean" rate, but none of them makes money reliably.

## What is new compared with earlier work

- `lit-all-hours.md` (2026-10-18) and `lit-more-entries.md` (2026-10-22) tested LIT only: its own setups at night, more trades a
  day, re-arming, the Asia slot. New here:
  - **A 24-hour map**: every window's range, straight-move days, sweep -> reversal vs continuation of the prior window's box,
    the day so far and the prior day's high/low, by weekday and VIX band, and how often the LIT VIX-band target is reached.
  - **LIT tuned per window**: each window gets its own sweep depth, displacement, bank R and breakeven (128 settings x 9
    windows), not the day settings.
  - **Four non-LIT families in every window**: sweep-and-reclaim of a box (the prior window, the day so far, the prior day, the
    window's own 30-minute opening range = ORB failure), ORB breakout, mean reversion to VWAP / the window open, and
    continuation after a one-way window.
  - **Placebo per pick** (random entries in the same window, same side mix, stops, targets and exits), a **chance rate** for
    "positive everywhere", and a **long-sample view** (pick on 4 years, check on 2025 and 2026).
  - **Combinations on three accounts**: LIT's 50K eval, ATLAS's 25K (account B) and a third 25K, incl. the LIT Asia slot on
    ATLAS's account (new).

## How it was tested

- **Data:** CME NQ1! from TradingView only: 5m from 2021-11 to 2026-10-16, true 1m bars for 2026. Official CME data only (TradingView / NinjaTrader), no CFD.
- **Windows (ET, CME trading-day order):** 18:00-20:00 evening / Sunday open, 20:00-00:00 Asia, 00:00-02:00 late Asia,
  02:00-05:00 London open, 05:00-08:00 London, 08:00-09:30 NY pre-market, 09:30-11:00 NY open, 11:00-13:30 NY midday,
  13:30-15:55 NY afternoon, 16:00-17:00 post-close (mapped only). A Sunday 18:00 open belongs to Monday's trading day.
- **LIT per window:** `engine/lit.py` run_x with live_model.json "lit" (15-minute check, BE + 1.25, Monday rule, weekly stop,
  1m CISD entries), entries limited to the window, 1 trade a day, that window's own depth (0.3-1.0 ATR), displacement
  (0.6-1.2 ATR), bank (2-8R) and breakeven (1 or 1.5R). The live settings reproduce run `lit_live` exactly (120 trades, H1
  PF 4.98 +$33,891, H2 PF 2.69 +$9,493).
- **The other families (tools/allday.py):** signal at a 5m close, market entry at the next 5m open + 1 tick. Stops are
  structural: 1 tick beyond the sweep extreme, the 6-candle extreme, the pullback extreme or the other side of the opening
  range; 6-80 pts. Targets: 1.5R / 2R / 3R or the setup's own level (the box's other side, the VWAP, the move's extreme; >= 1R,
  banked at 8R). Breakeven at 1R (entry + 1.25) or none. Time exit at the window end + 60 min or 15:55. Managed on true 1m bars
  in 2026, 5m before; stop first when stop and target share a bar; target fills need a trade-through. Never held past 15:55
  (MFFU flat 16:10) or through the 17:00 halt.
- **Money:** LIT's size rule ($800 up to a 20-pt stop, then 800 x 20 / stop, max 40 micros), $1.40 a micro + slippage. Eval
  views use the live sizing and $1.90 a micro.
- **Pick and check:** each family x window picks one setting on 2026 H1 (Jan 2 - Jun 30) only: at least 8 trades, win
  >= 50% (the owner's win-rate ask), PF >= 1.3, best "plateau score" (half its own H1 $ + half the median of its one-step
  neighbours). Then H2 (Jul 1 - Oct 16), 2025 and 2021-24 are looked at, untouched. A non-LIT setup must hold in 2025 and
  2021-24 too (CLAUDE.md hard rule); LIT changes are judged on 2026.
- **Placebo:** 300 random-entry versions of each pick in the same window and half, with the same number of trades, long/short
  mix, stop sizes, target R and exit rule. p = the share of random versions that made at least as much.
- **Eval views:** the exact executors of `tools/second_mix.py` (LIT's 50K, LIT priority: a LIT signal flattens an open extra
  trade; one slot a day kept for LIT) and `tools/second_account_b.py` (an own Builder 25K, need size, never opposite to LIT).
  Both reproduce their stored baselines (LIT 57.1/5.9 and 52.2/0.0; ATLAS 25K 68.9/0.0 and 43.5/0.0).

## The 24-hour map

Range = the window's high - low (median); "% of day" = range / the prior 14 days' mean daily range. Straight-move = the window
closed at least 60% of its range away from its open. "Back inside" = of the sweeps, how many closed the window back inside
the level (the rest closed beyond it = continuation).

| Window (ET) | Range 2026: pts / % of day | Range 2021-25 | 5m bar 2026 / 21-25 | Straight-move windows % | Prior-window high/low swept % -> back inside % (2026; 21-25) | Prior-day high/low swept % -> back inside % (2026; 21-25) | Reaches the LIT VIX band % (2026) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 18:00-20:00 evening / Sunday open | 97 / 20% | 44 / 14% | 20 / 8 | 35 / 32 | 52.9 -> 47.5; 48.6 -> 50.7 | 11.1 -> 50.0; 10.4 -> 48.8 | 1.5 up / 0.0 down |
| 20:00-00:00 Asia | 139 / 28% | 54 / 17% | 19 / 8 | 32 / 28 | 61.4 -> 46.6; 54.0 -> 53.1 | 13.2 -> 46.0; 10.2 -> 49.8 | 1.0 up / 3.4 down |
| 00:00-02:00 late Asia | 84 / 16% | 34 / 11% | 16 / 7 | 35 / 31 | 36.7 -> 45.0; 31.8 -> 48.6 | 7.7 -> 35.7; 4.5 -> 47.1 | 2.0 up / 5.9 down |
| 02:00-05:00 London open | 133 / 26% | 72 / 24% | 21 / 12 | 36 / 33 | 61.2 -> 43.4; 70.3 -> 49.6 | 12.2 -> 31.8; 11.8 -> 52.7 | 4.5 up / 6.5 down |
| 05:00-08:00 London | 120 / 23% | 62 / 20% | 21 / 11 | 27 / 30 | 44.4 -> 53.0; 43.5 -> 51.7 | 11.7 -> 50.0; 9.1 -> 52.7 | 6.0 up / 4.6 down |
| 08:00-09:30 NY pre-market | 113 / 22% | 67 / 22% | 27 / 16 | 31 / 32 | 48.5 -> 52.0; 49.3 -> 49.0 | 11.5 -> 51.3; 11.8 -> 51.6 | 5.7 up / 5.7 down |
| 09:30-11:00 NY open | 249 / 52% | 155 / 50% | 59 / 36 | 38 / 36 | 69.9 -> 49.7; 70.5 -> 48.0 | 23.9 -> 43.8; 22.5 -> 51.5 | 12.8 up / 13.5 down |
| 11:00-13:30 NY midday | 181 / 36% | 117 / 39% | 34 / 22 | 33 / 33 | 41.0 -> 45.2; 42.6 -> 49.9 | 14.9 -> 43.5; 16.3 -> 49.6 | 11.1 up / 14.7 down |
| 13:30-15:55 NY afternoon | 140 / 27% | 107 / 36% | 27 / 21 | 29 / 33 | 38.3 -> 52.6; 47.4 -> 48.4 | 9.9 -> 34.5; 15.9 -> 46.2 | 8.0 up / 10.1 down |
| 16:00-17:00 post-close | 60 / 12% | 34 / 11% | 16 / 9 | 27 / 28 | 21.0 -> 54.5; 16.3 -> 50.3 | 5.1 -> 46.7; 4.7 -> 54.9 | 3.7 up / 3.0 down |

What it says, plainly:

- **Sweeps are a coin flip everywhere.** A swept high/low closes back inside 43-55% of the time in every window, in both
  periods. No window, weekday or VIX band gives a steady 60%+ reversal or continuation in both periods. The few that do in
  one period sit on 14-26 days (e.g. NY pre-market at VIX 25+: 77% back inside in 2026, 45% in 2021-25).
- **The NY open is where the day moves:** half the day's range in 90 minutes, 70% of its prior-window levels taken.
- **The night got busier in 2026.** Asia is 28% of the day's range in 2026 vs 17% in 2021-25; the evening open 20% vs 14%.
  In points that is 2-2.5x. So a night rule tuned on 2026 may not hold in a calmer year.
- **Sunday open (Monday's 18:00-20:00):** range 151 pts in 2026 (31% of the day) vs 79-108 on the other evenings;
  2021-25 66 vs 36-42. The weekend gap makes it the busiest evening. It is no more predictable: 42% of its prior-window
  sweeps closed back inside in 2026, 49% in 2021-25.
- **The VIX band (LIT's target) is a full-day move.** One night window almost never reaches it (0-6%). That is why night
  trades need a nearer target (the Asia slot's 3R bank).
- **16:00-17:00 is quiet (12% of the day) and closed for MFFU** (flat by 16:10).

## What works in each window

**Picked on 2026 H1, the best setup of every window** (win >= 50% in H1; "Neighbours" = how many one-step-different settings
were also positive in H2):

| Window | Best H1 pick (win % >= 50) | H1: n / win % / PF / net $ | H2 (untouched) | 2025 | 2021-24 | Placebo p (H2) | Neighbours positive in H2 | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 18:00-20:00 evening / Sunday open | ORB breakout `30,bar|R1.5,None,eod` | 95 / 51.6 / 1.46 / +14,558 | 60 / 35.0 / 0.66 / -9,486 | 176 / 39.2 / 0.89 / -8,629 | 415 / 38.3 / 0.85 / -28,542 | 0.817 | 1/5 | fails H2 |
| 20:00-00:00 Asia | ORB breakout `15,bar|R3,1.0,w` | 119 / 54.6 / 1.37 / +12,834 | 75 / 48.0 / 0.92 / -1,793 | 221 / 53.8 / 0.96 / -2,583 | 574 / 47.7 / 0.91 / -20,275 | 0.457 | 1/5 | fails H2 |
| 00:00-02:00 late Asia | ORB breakout `15,opp|R3,1.0,eod` | 122 / 59.0 / 1.85 / +23,605 | 76 / 46.1 / 1.01 / +165 | 244 / 47.5 / 0.85 / -13,347 | 757 / 49.8 / 0.9 / -26,668 | 0.6 | 1/5 | fails H2 |
| 02:00-05:00 London open | LIT chain `0.75,0.6,8.0,1.0` | 57 / 64.9 / 6.05 / +28,218 | 23 / 47.8 / 2.14 / +4,725 | 61 / 54.1 / 1.12 / +1,374 | 180 / 49.4 / 0.73 / -13,548 | 0.123 | 5/5 | fails H2 |
| 05:00-08:00 London | mean reversion `vwap,2.5|R1.5,1.0,eod` | 115 / 53.0 / 1.32 / +9,718 | 76 / 43.4 / 0.64 / -8,527 | 241 / 47.7 / 0.87 / -11,062 | 745 / 51.4 / 0.89 / -30,306 | 0.87 | 1/6 | fails H2 |
| 08:00-09:30 NY pre-market | LIT chain `0.5,0.8,8.0,1.0` | 17 / 64.7 / 6.11 / +11,954 | 7 / 14.3 / 0.0 / -1,905 | 24 / 50.0 / 1.34 / +1,739 | 80 / 40.0 / 0.34 / -14,819 | 0.963 | 0/6 | fails H2 |
| 09:30-11:00 NY open | sweep-reclaim `sofar,0.0,3,close|S,1.0,eod` | 51 / 52.9 / 1.53 / +6,052 | 30 / 46.7 / 0.02 / -7,155 | 126 / 44.4 / 0.74 / -9,444 | 449 / 43.9 / 0.8 / -27,430 | 0.913 | 1/9 | fails H2 |
| 11:00-13:30 NY midday | continuation `sofar,0.65,0.25|R1.5,None,w` | 23 / 52.2 / 1.92 / +2,668 | 12 / 33.3 / 0.31 / -2,404 | 44 / 47.7 / 1.75 / +5,525 | 139 / 39.6 / 0.88 / -5,364 | 0.9 | 0/6 | fails H2 |
| 13:30-15:55 NY afternoon | sweep-reclaim `prev,0.0,3,close|S,1.0,w` | 64 / 56.2 / 2.51 / +26,639 | 33 / 45.5 / 1.03 / +365 | 128 / 49.2 / 0.86 / -6,209 | 400 / 42.8 / 0.7 / -45,991 | 0.287 | 4/9 | fails H2 |

- **Nine windows, nine failures.** The London-open LIT pick is LIT itself with other thresholds: good in H2 (+$4.7k) but under
  50% win in H2, and its 2021-24 loses. It does not beat today's LIT (H2 +$9.5k with all windows).
- **The pattern is the classic over-fit:** H1 PF 1.3-6, H2 PF 0-1. The H1 pick's neighbours are mostly negative in H2.
- All 65 picks (9 windows x 5 families x 2 modes; the "money" mode drops the 50% win floor) are in `research/allday/picks.json`.
  None holds every check; 20 pass the H2 check but fail 2025 / 2021-24 or the placebo ("H2 only").

**The long view: picked on 2021-24 (4 years, 30+ trades), checked on 2025 and both 2026 halves:**

| Window | 2021-24 pick (money mode) | 2021-24 | 2025 | H1 | H2 | Placebo p 2025 / H2 |
|---|---|---:|---:|---:|---:|---:|
| 18:00-20:00 evening / Sunday open | sweep-reclaim `pd,0.0,3,close|R3,None,eod` | 96 / 36.5 / 1.51 / +20,985 | 41 / 19.5 / 0.6 / -8,037 | 19 / 26.3 / 1.09 / +650 | 12 / 16.7 / 0.63 / -2,322 | 0.82 / 0.67 |
| 20:00-00:00 Asia | sweep-reclaim `prev,0.5,6,cisd|S,None,eod` | 146 / 41.1 / 1.39 / +25,189 | 38 / 34.2 / 1.22 / +3,319 | 25 / 44.0 / 1.11 / +846 | 25 / 40.0 / 1.85 / +5,653 | 0.25 / 0.095 |
| 00:00-02:00 late Asia | sweep-reclaim `sofar,0.0,3,cisd|S,None,w` | 58 / 41.4 / 1.36 / +8,224 | 25 / 48.0 / 1.48 / +5,070 | 15 / 20.0 / 0.33 / -4,642 | 17 / 17.6 / 0.22 / -6,954 | 0.12 / 0.915 |
| 02:00-05:00 London open | sweep-reclaim `or30,0.5,6,cisd|R1.5,None,eod` | 340 / 48.2 / 1.33 / +36,724 | 96 / 35.4 / 0.87 / -4,126 | 46 / 34.8 / 0.71 / -4,080 | 29 / 31.0 / 0.84 / -1,101 | 0.575 / 0.615 |
| 05:00-08:00 London | LIT chain `0.5,0.8,8.0,1.5` | 134 / 44.0 / 1.31 / +11,744 | 32 / 40.6 / 0.65 / -2,324 | 33 / 39.4 / 1.4 / +2,685 | 16 / 37.5 / 1.55 / +1,451 | 0.645 / 0.28 |
| 08:00-09:30 NY pre-market | none with 30+ trades passing the gate | | | | | |
| 09:30-11:00 NY open | sweep-reclaim `pd,0.0,6,close|S,None,eod` | 81 / 22.2 / 1.56 / +19,800 | 18 / 27.8 / 2.13 / +6,906 | 5 / 20.0 / 0.31 / -1,416 | 3 / 0.0 / 0.0 / -1,968 | 0.11 / 0.695 |
| 11:00-13:30 NY midday | sweep-reclaim `pd,0.0,3,close|R3,None,w` | 36 / 44.4 / 1.45 / +6,735 | 15 / 26.7 / 1.47 / +2,453 | 11 / 18.2 / 0.32 / -4,100 | 1 / 0.0 / 0.0 / -437 | 0.17 / None |
| 13:30-15:55 NY afternoon | none with 30+ trades passing the gate | | | | | |

- 26 long-view picks; 3 (2 distinct setups) are positive in 2025, H1 and H2: the **Asia reclaim** above and an evening
  (18:00-20:00) **mean reversion to VWAP** (`vwap,2.5`, only 14 trades in 2026, 27 in 2025). With roughly 35-45% of random
  setups positive in each period, 1-2 of 26 would pass all three by chance.
- **The Asia reclaim in detail** (`research/allday/pick_long_asia.json`): Asia 20:00-00:00; the 18:00-20:00 high (low) is
  swept by >= 0.5 x the 5m ATR, then within 6 bars a 5m close back inside that is also beyond the open of the candle run into
  the extreme (CISD); short (long), stop 1 tick beyond the extreme, target the other side of the 18:00-20:00 range (median
  2.2R), flat 15:55 (median hold 1 hour). 2026 by month: Jan +1,600, Feb -984, Mar +54, Apr -2,542, May +1,658, Jun +1,060,
  Jul +1,482, Aug +5,834, Sep -1,348, Oct -314. By year: 2021 +5.3k, 2022 +25.5k, 2023 +3.5k, 2024 -9.1k, 2025 +3.3k,
  2026 +6.5k. Neighbours: no depth floor or no CISD lose $4.6-9.6k in H1. Not a plateau.

## Chance: how many of these would luck produce?

- **7,800 setups** (6,648 in the four new families, 1,152 LIT per window).
- **659** pass the H1 gate (8+ trades, win >= 50%, PF >= 1.3, money up). **258 of them (39%)** are still positive in H2.
- **89 (1.1%) are positive in all four periods**. 150 random-entry strategies with the same stops / targets / exits:
  **2 (1.3%)**. The grid is at chance level.
- **Placebo on the 65 picks:** 3 beat 90% of their random twins in H2. By chance about 6.5 would. 0 picks hold every check.
- **H1 -> H2 rank correlation** across each window's settings is positive in the London windows (LIT at the London open 0.65,
  reclaim at the London open 0.50 and London 0.52) and strongly negative for LIT in the NY pre-market (-0.79). So 2026's London
  behaviour carried from H1 into H2, but none of it carries into 2025 or 2021-24.

## 24/5 schedules (one position at a time, max 2 trades a day, LIT first)

**At the LIT size (costs in).** "Clean win" = trades that made +0.5R or more (LIT's 55% includes the breakeven scratches).

| Schedule | Half | /wk | Win % | Clean win % | PF | Net $ | $/mo | Max DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| LIT alone (today) | H1 | 3.12 | 58.8 | 22.5 | 4.98 | +33,891 | +5,560 | -2,196 |
|  | H2 | 2.56 | 47.5 | 32.5 | 2.69 | +9,493 | +2,556 | -1,396 |
|  | 2025 | 2.21 | 58.8 | 12.3 | 1.19 | +3,199 | +260 | -7,082 |
|  | 2021-24 | 2.43 | 52.3 | 14.9 | 0.98 | -1,988 | -51 | -19,436 |
| + LIT Asia slot (paper lead) | H1 | 4.65 | 59.7 | 23.5 | 3.78 | +37,410 | +6,138 | -2,516 |
|  | H2 | 3.97 | 53.2 | 35.5 | 2.57 | +14,210 | +3,826 | -1,712 |
|  | 2025 | 3.14 | 53.7 | 16.0 | 0.86 | -4,553 | -371 | -8,765 |
|  | 2021-24 | 3.18 | 50.9 | 16.2 | 0.9 | -12,643 | -326 | -24,090 |
| + one H1 pick in every window (24/5) | H1 | 10.0 | 55.1 | 35.5 | 1.55 | +40,485 | +6,642 | -5,759 |
|  | H2 | 10.0 | 41.7 | 25.0 | 0.79 | -12,198 | -3,284 | -14,732 |
|  | 2025 | 10.0 | 47.7 | 24.0 | 0.91 | -17,780 | -1,447 | -35,756 |
|  | 2021-24 | 9.97 | 45.6 | 22.8 | 0.85 | -98,229 | -2,534 | -100,453 |
| + H1 picks 18:00-02:00 only | H1 | 9.84 | 54.8 | 35.3 | 1.54 | +39,341 | +6,454 | -5,759 |
|  | H2 | 9.87 | 40.9 | 24.7 | 0.77 | -13,329 | -3,589 | -15,859 |
|  | 2025 | 9.79 | 47.7 | 24.0 | 0.91 | -16,906 | -1,376 | -35,848 |
|  | 2021-24 | 9.33 | 45.8 | 23.0 | 0.89 | -66,296 | -1,710 | -76,064 |
| + one 2021-24 pick per window | H1 | 6.52 | 38.9 | 26.9 | 1.19 | +8,820 | +1,447 | -7,310 |
|  | H2 | 6.86 | 33.6 | 29.0 | 1.01 | +217 | +58 | -9,264 |
|  | 2025 | 6.05 | 40.7 | 26.0 | 1.05 | +4,999 | +407 | -17,127 |
|  | 2021-24 | 5.98 | 46.4 | 33.0 | 1.37 | +114,468 | +2,953 | -12,409 |
| + 2021-24 picks 18:00-02:00 | H1 | 5.08 | 46.9 | 26.2 | 1.81 | +24,056 | +3,947 | -3,748 |
|  | H2 | 5.77 | 35.6 | 30.0 | 1.15 | +3,988 | +1,074 | -7,453 |
|  | 2025 | 4.07 | 45.2 | 20.5 | 1.01 | +742 | +60 | -14,116 |
|  | 2021-24 | 4.09 | 46.8 | 24.6 | 1.25 | +49,706 | +1,282 | -22,330 |
| + the 2 evening setups positive everywhere (peeked) | H1 | 4.38 | 54.5 | 28.6 | 3.0 | +37,102 | +6,087 | -3,214 |
|  | H2 | 4.49 | 44.3 | 35.7 | 2.12 | +16,125 | +4,341 | -2,766 |
|  | 2025 | 3.41 | 51.1 | 21.0 | 1.14 | +5,689 | +463 | -8,779 |
|  | 2021-24 | 3.57 | 49.5 | 24.2 | 1.19 | +29,839 | +770 | -21,179 |
| + Asia reclaim only (peeked) | H1 | 4.06 | 55.8 | 27.9 | 3.16 | +35,023 | +5,746 | -3,214 |
|  | H2 | 4.17 | 44.6 | 35.4 | 2.23 | +15,147 | +4,078 | -2,282 |
|  | 2025 | 2.93 | 52.3 | 17.9 | 1.2 | +6,506 | +530 | -9,979 |
|  | 2021-24 | 3.3 | 49.4 | 22.1 | 1.17 | +24,916 | +643 | -26,906 |

"Peeked" = picked because it was positive in 2025, H1 and H2, so its own numbers there are not a test.

**(i) LIT's Builder 50K eval (two_week path, fresh eval every session, LIT priority).** Base: 57.1/5.9 (H1), 52.2/0.0 (H2).

| Schedule on LIT 50K | Size of extras | H1 2-wk p/f | H1 1-mo p/f | H2 2-wk p/f | H2 1-mo p/f | 2025 2-wk p/f | 2021-24 2-wk p/f | Eval path $ H1 / H2 | /wk H1 / H2 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| LIT alone (today) | - | 57.1/5.9 | 74.3/11.9 | 52.2/0.0 | 50.8/0.0 | 14.1/1.2 | 14.7/6.8 | +34,234 / +9,059 | 3.12 / 2.56 |
| + LIT Asia slot | LIT two_week | 56.3/5.0 | 71.6/10.1 | 59.4/0.0 | 71.2/0.0 | 12.0/14.1 | 15.2/11.1 | +34,953 / +9,419 | 4.61 / 3.97 |
| + 24/5 H1 schedule | half need | 57.1/10.1 | 75.2/15.6 | 42.0/27.5 | 39.0/49.2 | 5.2/11.2 | 12.2/20.9 | +28,612 / +8,296 | 8.01 / 7.37 |
| + 24/5 H1 schedule | $300 safe | 64.7/13.4 | 78.9/18.3 | 40.6/34.8 | 40.7/55.9 | 9.6/20.9 | 14.7/38.1 | +41,491 / +3,655 | 8.12 / 7.5 |
| + 2021-24 picks, every window | half need | 42.9/8.4 | 54.1/17.4 | 43.5/11.6 | 37.3/27.1 | 11.6/12.4 | 20.9/11.2 | +23,222 / +9,062 | 6.25 / 6.35 |
| + 2021-24 evening picks (win mode) | half need | 43.7/2.5 | 66.1/16.5 | 40.6/5.8 | 33.9/23.7 | 12.4/6.0 | 19.9/11.8 | +26,876 / +8,042 | 5.08 / 5.32 |
| + 2 evening setups (peeked) | half need | 52.9/4.2 | 70.6/5.5 | 52.2/5.8 | 52.5/20.3 | 13.7/3.6 | 16.5/8.9 | +34,671 / +14,890 | 4.41 / 4.49 |
| + Asia reclaim (peeked) | need | 61.3/6.7 | 73.4/8.3 | 55.1/7.2 | 57.6/25.4 | 18.1/4.0 | 21.9/12.7 | +28,894 / +15,651 | 4.1 / 4.17 |

(The 24/5 and the evening H1 schedules give the same 2026 numbers: with one slot kept for LIT, the evening setups trade first
and use the day's free slot.) Every schedule with the new setups raises the H2 fails, the 24/5 one by 27-35 points. The
LIT Asia slot keeps H2 fails at 0 but raises 2025's from 1.2% to 14.1%.

**(ii) ATLAS on its own Builder 25K (account B) and (iii) a third Builder 25K** (need size, never opposite to LIT; "dead" =
failed or stuck under $100 of room). Base: ATLAS 68.9/7.6 (H1), 43.5/0.0 (H2).

| Account (Builder 25K, need size) | H1 2-wk pass / dead | H2 | 2025 | 2021-24 | Path $ H1 / H2 | /wk H1 / H2 |
|---|---:|---:|---:|---:|---:|---:|
| ATLAS alone (account B today) | 68.9/7.6 | 43.5/0.0 | 28.9/34.9 | 23.9/38.9 | +19,722 / +5,391 | 4.02 / 2.82 |
| ATLAS + LIT Asia slot | 68.1/8.4 | 56.5/0.0 | 31.3/32.9 | 23.1/46.8 | +20,779 / +7,880 | 5.27 / 4.36 |
| ATLAS + 24/5 H1 schedule | 61.3/33.6 | 26.1/68.1 | 21.3/73.9 | 21.6/74.0 | +16,147 / -4,263 | 9.65 / 9.94 |
| ATLAS + H1 evening picks | 61.3/34.5 | 26.1/68.1 | 22.5/71.5 | 22.6/71.7 | +18,104 / -6,580 | 9.53 / 9.68 |
| ATLAS + 2021-24 evening picks | 58.0/14.3 | 26.1/47.8 | 23.7/51.0 | 33.2/46.1 | +17,128 / +1,358 | 5.55 / 5.71 |
| ATLAS + 2 evening setups (peeked) | 63.0/11.8 | 34.8/18.8 | 26.5/43.8 | 30.8/45.6 | +17,650 / +6,040 | 5.04 / 4.62 |
| 3rd account: LIT Asia slot alone | 7.6/0.0 | 30.4/0.0 | 4.4/1.6 | 2.4/0.0 | +1,409 / +2,665 | 1.76 / 1.54 |
| 3rd account: 24/5 H1 schedule | 60.5/37.0 | 20.3/71.0 | 21.3/73.5 | 20.7/74.2 | +17,303 / -5,260 | 9.61 / 9.94 |
| 3rd account: H1 evening picks | 60.5/37.0 | 20.3/71.0 | 22.9/70.7 | 21.2/70.6 | +19,350 / -6,189 | 9.41 / 9.55 |
| 3rd account: 2021-24 picks | 18.5/50.4 | 7.2/68.1 | 24.1/41.0 | 38.9/28.4 | -4,500 / -845 | 4.84 / 5.64 |
| 3rd account: 2021-24 evening picks (win) | 23.5/15.1 | 26.1/31.9 | 3.2/12.0 | 15.8/2.2 | +2,314 / +234 | 2.23 / 2.88 |
| 3rd account: 2 evening setups (peeked) | 10.9/1.7 | 13.0/14.5 | 7.6/0.0 | 11.7/2.7 | +1,886 / +698 | 1.29 / 1.99 |

- **The only combination that is not clearly worse: ATLAS + LIT's Asia slot on the 25K.** H2 2-week passes 43.5 -> 56.5% with
  0% dead, path +$5.4k -> +$7.9k, 2025 slightly better; but H1 is a hair worse and 2021-24 has 8 points more dead evals. It
  needs the account-B route to accept 18:00-02:00 entries (not built, see below). Run `ad_atlas25k_asia_slot`.
- **A third account is not worth it:** every night-only set either rarely passes in 2 weeks (2-30%) or dies 30-75% of the time.

**Trades a week reachable:** at LIT's win rate (55%) and more money in 2026, about **4-4.7 a week** (LIT + one evening slot:
the Asia slot, or the Asia reclaim). The 2021-25 checks are negative or thin for both. **10 a week** (one setup in every
window) is reachable only at a lower win rate (42% in H2) and loses money in H2, 2025 and 2021-24.

## Practical: what 24/5 would need

- **PC uptime:** LIT needs NinjaTrader + the PC from ~01:55 to 15:55 ET today. Evening setups need it from 17:55 (Sunday
  included) to 02:00 as well, i.e. the whole week: Sunday 18:00 to Friday 15:55. The cloud monitor only waits when the PC is
  off (no_yahoo: no bars, no paper entries).
- **CME and MFFU clock:** daily halt 17:00-18:00; MFFU auto-flattens at 16:10 and its day runs 18:00 -> 16:10 (an evening
  trade counts in the next day's P&L and its trailing drawdown is set at the session close). Holidays: full closures and
  13:00 early closes; MFFU does not auto-flatten on half-days.
- **What already handles evenings:** LIT's own route with `all_hours` on (fixed 2026-10-22, lit-more-entries.md "PC route:
  fixed"): `engine/guards.calendar` uses the CME trading day (18:00 opens the next date's session, holidays, early closes,
  17:00-18:00 closed), the NinjaTrader adapter, the safety flatten, the daily counters, weekly stop / Monday rule and
  auto-update (16:00-17:30 and weekends). It stays OFF.
- **What does not:** account B (`engine/account_b.py`) calls `G.calendar(..., session_from=120, flat_mod=955)` without
  `all_hours`, so it refuses every 18:00-02:00 entry; ATLAS's strategies (`engine/second.py`) trade 02:00-12:00 only. The new
  families here have no live code at all (research only). None of this is worth building on these results; if the owner wants
  the "ATLAS + Asia slot" lead on paper, account B needs the same all_hours calendar switch as LIT's route first.

## Verdict

- **Do not switch to 24/5.** LIT (02:00-15:30, 1 a day) and ATLAS stay as they are. Nothing was built in the bot.
- The night can be traded more often, but no rule found here earns its slot: the in-sample winners of every window lose
  out of sample, and as a group they are at chance level.
- **Paper-watch only, if anything:** ATLAS + LIT's Asia slot on the 25K (needs account B's evening calendar) and the Asia
  reclaim of the 18:00-20:00 range. Neither passes the hard rules.

## Files

- `tools/allday.py`: map / lit / fam / pick / combo / save (all in this write-up). Paper only; no engine, model or UI file
  changed.
- `research/allday/map.json` (the 24-hour map, incl. weekday and VIX splits), `lit_grid.json` and `fam_grid.json` (every
  variant's H1 / H2 / 2025 / 2021-24 numbers), `picks.json` (picks, placebo, multiple-testing counts, the long view),
  `schedule.json` (every combination on the three accounts), `pick_*.json` (17 picks: params, plain rules, numbers,
  months, every trade in the common format {day, entry_t, exit_t, dir, entry, stop, target, exit, exit_kind, r, qty, pnl_usd,
  setup}), `picks_index.json`.
- Runs `ad_*` (22) in research/runs.

## Reproduce

- `python -X utf8 tools/allday.py map` (~10 s), `lit` (~4 min), `fam` (~2 min on 4 cores), `pick` (~2 min), `combo` (~2 min),
  `save`. `fam` / `lit` write their trades to research/runs/_cache (gitignored); `combo` needs
  research/runs/_cache/second_mix_units.pkl (`python -X utf8 tools/second_mix.py units`).

## Caveats

- The 2026 halves are short (25 and 15 weeks). One trade moves a half by $1-3k.
- 2021-25 has no 1m bars: entries and exits there run on 5m (stop first in a shared bar), the same for LIT.
- The families are simple, mechanical versions; a discretionary trader's night setups may differ. LIT's own chain was tuned
  per window, so "LIT at night" is covered.
- The placebo keeps each pick's stops and targets, so it tests the entry timing, not the stop/target shape.
