## Money first

**The strategy (noise-area momentum, "NA"),** joint pick `na_vm125_1000_n99_fixed`, $500 risk a trade, costs in ($1.90 a micro +
1 tick on every market fill), CME NQ1! 5m, regular hours only:

| Span | Trades | /week | Weeks with 2+ | Win % | PF | Net | **$ / month** | Max DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 H1 (Jan-Jun, in sample) | 100 | 3.7 | 82% | 26.0 | 1.28 | +$9,115 | **+$1,556** | -$8,845 |
| **2026 H2 (Jul-Oct, untouched)** | 50 | 3.1 | 69% | 30.0 | **2.01** | **+$16,083** | **+$4,444** | -$5,832 |
| **2025 (untouched)** | 167 | 3.2 | 68% | 25.1 | 1.21 | **+$12,063** | **+$1,026** | -$11,320 |
| 2021-24 (in sample) | 630 | 3.8 | 82% | 29.0 | 1.25 | +$52,268 | +$1,374 | -$10,442 |
| 2026 | 150 | 3.6 | 79% | 27.3 | 1.52 | +$25,198 | +$2,659 | -$8,845 |
| 2021-25 | 797 | 3.6 | 78% | 28.2 | 1.24 | +$64,331 | +$1,292 | -$11,320 |

- By year: 2021 (Nov-Dec) +$7.2k, 2022 +$28.0k, 2023 -$1.7k, 2024 +$18.7k, 2025 +$12.1k, 2026 +$25.2k; 53% of 60 months
  positive. **It earns where LIT does not:** LIT made +$1.3k over 2021-25 (run `lit_live`, 5m-only there) and +$43.8k in 2026;
  NA made +$64k over 2021-25 and +$25k in 2026. It is not a mirror year by year (both made money in 2022, both were weak in
  2023), but in LIT's 24 losing months of 2021-25 NA made +$24,140 (about +$1,000 in each) at $500 a trade.
- **Correlation with LIT** (run `lit_live`): daily P&L -0.08 in 2026, -0.01 in 2021-25; monthly -0.22 / +0.27. It trades
  10:00-15:55 (428 of 947 entries in the 10:00 hour); LIT enters 02:00-08:00 in 95 of 120 2026 trades. Only 5% of NA trades
  overlap a LIT trade in time.
- **What it costs on a prop account is the problem** (section 4): 26-30% winners, a drawdown of 18-23R, and the 5 best trades
  carry each 2026 half (without them H1 -$12.7k, H2 -$5.9k, 2025 -$21.9k; 2021-24 stays +$21.3k). That is how trend following
  works, and it is exactly what the MFFU rules punish.

**On prop accounts (what the owner can actually trade):**

| Use | 2026 H1 | **2026 H2** | 2025 | 2021-24 |
|---|---:|---:|---:|---:|
| NA alone on a Builder 50K eval: pass / fail in 2 weeks (best size, 20% of the room a trade) | 7.8 / 0.4 | 17.6 / 0.4 | 9.4 / 0.0 | 9.8 / 0.6 |
| LIT alone, same eval (live two_week) | 50.6 / 20.2 | 57.0 / 21.0 | 12.4 / 17.6 | 19.2 / 30.8 |
| NA alone on a funded 50K, $ a month to you (best size) | $67 | $117 | $13 | $74 |
| LIT alone on a funded 50K (live funded sizing) | $929 | $915 | $72 | $58 |
| **LIT + NA on the funded 50K** (NA 3% of the room, <= $150 a trade) | **$993** | **$969** | **$81** | **$68** |
| LIT + NA, H1 pick (NA 4% of the room, <= $150) | $1,012 | $971 | $79 | $70 |
| 7 funded-account slots, all LIT (12 months, net of evals; section 5) | $5,016 | **$4,772** | $75 | $30 |
| **7 slots, LIT + NA on each funded account** | **$5,423** | **$5,080** | **$86** | **$63** |
| ... chance of 3 months in a row with no payout (months 4-12) | 18.8% -> 16.4% | **20.3% -> 14.2%** | 98.6% -> 98.7% | 98.9% -> 98.6% |

Eval and NA-alone funded rows: MC 500 paths (`tools/div_stack.py solo`); funded LIT / LIT + NA rows: 1,000 x 6 months; stack:
1,000 x 12 months, 5-session blocks.

## 1. What was tested, and why these two families

The rejected list already covers the obvious candidates: opening ranges with fixed R targets (allday.md, atlas-chatgpt-breakouts.md
A01/A02, retail-standalone.md), Gao's first-to-last half-hour momentum, overnight drift, gap fill / gap-and-go, end-of-day
momentum, turn of the month, pre-FOMC, VIX regimes (quant-anomalies.md), fades of stretched moves and failed ORBs
(hq-reversion.md), first pullbacks in a leg (hq-continuation.md), inside / narrow-range breakouts (A06-A10). ES-NQ relative moves
cannot be tested on 2021-24: the official ES1! file starts 2025-04-14.

Two families nobody here had tested:

1. **Noise-area intraday momentum** (Zarattini, Aziz & Barbon 2024, "Beat the Market", SFI WP 24-97; it was listed but untested
   in research/lab/TRADER_HEURISTICS.md). For every 5m bar of the day, sigma = the average distance |close - 09:30 open| at that
   same time of day over the last 14 sessions. Upper band = max(today's open, yesterday's 16:00 close) + vm x sigma; lower band =
   min(open, previous close) - vm x sigma. At the half-hour checks (bar closes at HH:00 / HH:30, from `start`) a close above the
   upper band = long, below the lower band = short, at the next 5m open. The stop is max(upper band, VWAP) for a long (the
   paper's trailing exit), at least max(10 pts, 0.25 sigma) away; `trail` moves it with the band / VWAP (only toward profit) at
   each check (`check`, the paper's cadence) or each 5m close (`bar`); `fixed` keeps the first stop. Flat 15:55. After a stop a
   later check may enter again (`n99` = no limit, the paper's rule; `n1` / `n2` = 1 / 2 a day). Option: only days with VXN above
   its 1-year median (the paper finds momentum stronger in high volatility).
2. **Initial-balance breakout, VXN-normalised** (new angle on the ORB family): the 09:30-10:30 range divided by the move the
   options market prices for the day (VXN / 100 / sqrt(252) x price); `narrow` = only when that ratio is below its own 1-year
   median (a quiet first hour on a day priced to move). First 5m close beyond the IB until 13:00 / 15:00, stop 1 tick beyond
   the IB middle or the far side, exit at 15:55, at 2R, or trailed at VWAP.

The stop sits at the structure that defines each setup (the band / VWAP, the IB) and size follows the stop: micros =
$500 / (stop x $2 + $1.90). CLAUDE.md's "beyond the sweep extreme" is LIT's rule; these trades have no sweep.

## 2. The grids, the picks and what chance says

| Family | Settings | Positive in all four spans (H1, H2, 2025, 2021-24) | Strict H1 pick | Joint pick (H1 + 2021-24 in sample) |
|---|---:|---:|---|---|
| NA, pre-declared (vm 1.0 / 1.5, 10:00 / 10:30, 1-2 a day, 3 exits, VXN filter) | 48 | 9 | | |
| NA, all (+ vm 1.25 and unlimited re-entries, **added after the first look**) | 108 | **38** | `na_vm125_1030_n99_trail_check_vxh`: **fails 2025** | `na_vm125_1000_n99_fixed`: **holds** |
| "2nd break only" (added after looking: the day's 2nd+ break on the 1st's side) | 36 | 10 | | |
| IB, VXN-normalised | 24 | **0** | `ib_nar_mid_r2_15`: fails H2 and 2025 | |

- **Honesty about the order of work:** the first 48 NA settings were declared before any run. They showed that the money sits
  in the day's later breaks (after a first stop-out), so vm 1.25 and the paper's unlimited re-entries (which the first grid had
  wrongly left out) were added and counted; the "2nd break only" family was found by looking and is only reported. The pick
  rules were written after the first look too. **The cleanest evidence is the paper's own rule** (vm 1, 10:00, half-hour trail,
  re-entries: the paper fixed these in 2024, so 2025-26 is out of sample for it, and nothing was tuned here) and the placebo.
- **Strict H1 pick** (2026 H1 only, n >= 15, PF >= 1.2, 2-4 a week, plateau score): picks the VXN-high filter: H1 +$21.5k,
  H2 +$2.5k, **2025 -$2.7k**, 2021-24 +$5.6k. **Rejected** by the 2026-AND-2021-25 rule. The VXN filter helps H1 and fails out of
  it in nearly every pair.
- **Joint pick** (H1 AND 2021-24 both in sample: money up, PF >= 1.2 / 1.1, 2-4 a week in both; plateau of the smaller $ a
  month): `na_vm125_1000_n99_fixed`; out of sample for this pick are 2026 H2 and 2025, both positive (+$16.1k PF 2.01, +$12.1k PF
  1.21).
- **Plateau:** the 10:30 start without the VXN filter is positive in all four spans in 17 of 18 settings (vm 1 / 1.25 / 1.5 x 2 a
  day / unlimited x 3 exits). Example `na_vm125_1030_n2_fixed` (2.7 a week): H1 +$17.0k, H2 +$16.6k, 2025 +$11.0k, 2021-24
  +$33.7k, 2026 PF 1.99, DD -$5.5k. The one-a-day versions lose in 2026 H1 (the paper's rule with 1 a day: H1 -$9.0k).
- **The IB family is dead:** every setting loses in H2 and 2025; it only made money in 2021-24 (the ORB story again).

**Every NA headline line** ($500 a trade):

| Setting | /wk 2026 / 2021-25 | H1 | H2 | 2025 | 2021-24 | PF 2026 / 2021-25 | Max DD 2021-25 |
|---|---|---:|---:|---:|---:|---|---:|
| Paper rule (vm 1, 10:00, trail, re-entries) | 5.2 / 5.3 | +$3,495 | +$14,820 | +$2,655 | +$68,529 | 1.33 / 1.23 | -$19,002 |
| Paper rule, 1 a day | 2.7 / 2.7 | -$9,037 | +$4,944 | +$2,366 | +$52,125 | 0.87 / 1.33 | -$14,599 |
| **Joint pick (vm 1.25, 10:00, fixed stop, re-entries)** | 3.6 / 3.6 | **+$9,115** | **+$16,083** | **+$12,063** | **+$52,268** | 1.52 / 1.24 | -$11,320 |
| Plateau: vm 1.25, 10:30, 2 a day, fixed | 2.7 / 2.8 | +$16,978 | +$16,588 | +$11,027 | +$33,660 | 1.99 / 1.22 | -$12,669 |
| Strict H1 pick (VXN-high filter) | 2.6 / 1.7 | +$21,534 | +$2,522 | -$2,663 | +$5,580 | 2.06 / 1.03 | -$13,185 |
| IB H1 pick | 2.2 / 2.2 | +$2,521 | -$4,513 | -$2,996 | +$2,191 | 0.89 / 0.99 | -$8,635 |

## 3. Is it luck? Placebo, costs, look-ahead

**Random-entry placebo** (300 twins per setting: the same days, a random half-hour check in the window, the setting's long /
short mix, the trade's own stop distance, the same exits; share of twins that made at least as much):

| Setting | H1 | H2 | 2025 | 2021-24 | 2026 | all 5 years |
|---|---:|---:|---:|---:|---:|---:|
| Paper rule | 0.38 | **0.000** | 0.25 | **0.003** | 0.05 | **0.000** |
| Joint pick | 0.20 | **0.007** | 0.47 | 0.07 | **0.007** | **0.023** |
| Plateau (10:30, 2 a day) | **0.043** | **0.003** | 0.42 | 0.16 | **0.003** | **0.047** |
| Strict H1 pick (VXN filter) | **0.003** | 0.10 | 0.75 | 0.51 | **0.003** | 0.22 |
| Paper rule, 1 a day | 0.88 | 0.15 | 0.46 | **0.003** | 0.59 | **0.047** |

- The entry signal beats random entries with the same stops in 2026 and over the five years. **2025 is positive but no better
  than random**: there the money came from the exit (wide stops held to the close in a rising year), not the signal.
- **Costs:** one more tick on every fill keeps 94% / 98% / 90% / 89% of H1 / H2 / 2025 / 2021-24 (joint pick); two more ticks
  88% / 96% / 80% / 77%. The micros are big enough (median 8 at $500) that costs are not the weak spot.
- **Look-ahead:** 300 signals of the joint pick and 300 of the paper rule re-derived with every bar after the signal bar
  scrambled: 0 change (side, entry, first stop). Sigma uses the 14 sessions before the day, the bands today's 09:30 open and
  yesterday's close, VWAP the bars up to the signal close.
- **5m resolution:** exits move only at 5m closes and there is no profit target, so a 1m walk changes only gap fills through
  the stop; not re-run on 1m.

## 4. Why the prop accounts choke it

- **The eval:** NA alone on a Builder 50K eval, sized at f of the room a trade (MC 500 paths x 60 sessions): f 10-20% passes 2-18%
  in 2 weeks with ~0% fails (it neither passes nor fails: 20-33% ever pass, the rest drift); f 30-40% passes 9-22% and fails
  3-29%. LIT passes 51-57% in 2 weeks. A trend strategy with 27% winners cannot make $3,000 inside a $2,000 trailing floor in
  10 sessions; the 25K is the same.
- **The funded account:** alone it pays $13-117 a month (50K) and $0-29 (25K). At a size the $2,000 floor survives (10% of the
  room = ~$200 a trade) it makes only $95-404 a month of trading profit, it must first build the $2,100 buffer, and its money
  comes in a few big trend days, so the 50% best-day rule holds the payouts. Bigger sizes (30% of the room) lose up to 48% of
  the accounts in 6 months.
- **Next to LIT on the same funded account it helps a little:** NA's extra, mostly small days make LIT's cycles valid a bit
  sooner (days held by the 50% rule 45 -> 41 in H1), and its money in LIT's cold stretches adds payouts.

| Funded Builder 50K, $ a month to you (1,000 x 6 months) | H1 | **H2** | 2025 | 2021-24 | payouts in 6 mo H2 |
|---|---:|---:|---:|---:|---:|
| LIT alone (live funded sizing; = uprisk.md $929 / $915) | $929 | **$915** | $72 | $58 | 3.47 |
| + NA 2% of the room, <= $100 | $946 | $957 | $75 | $61 | 3.62 |
| + NA 3%, <= $100 | $960 | $976 | $80 | $65 | 3.70 |
| **+ NA 3%, <= $150** (the stack setting) | **$993** | **$969** | **$81** | **$68** | 3.67 |
| + NA 3%, <= $200 | $987 | $976 | $81 | $68 | 3.70 |
| **+ NA 4%, <= $150** (H1 pick) | **$1,012** | **$971** | $79 | $70 | 3.68 |
| + NA 5%, <= $250 | $983 | $906 | $74 | $71 | 3.43 |
| + NA 10%, <= $400 | $862 | $653 | $64 | $84 | 2.48 |

- 2-4% of the room with a $100-200 cap is positive in all four spans (a plateau); 5% and up cost money in H2. 0% of accounts
  lost in every row.
- **Builder 25K** (same rule at half scale): +$0 to +$17 a month, about neutral (LIT alone $445 / $405 / $36 / $28).
- **The account rule:** one position, LIT first: an NA trade is skipped when it would overlap a LIT trade in time (48 of 948 NA
  trades; the account-B route's "LIT PRIORITY" idea). LIT's armed but unfilled setups are not modelled.

## 5. The copied stack: months with no payout

The owner's plan: about 7 funded accounts at 3 firms, all copying LIT. Modelled as MFFU Builder 50K + 2 x Builder 25K (MFFU's
per-person limit, exact rules) + 4 x "50K-type" for LucidPro / FundedNext (MFFU 50K rules as the proxy, as uprisk.md did),
bought a week apart, 12 months, all on the **same** market path, live eval + funded sizing, net of every eval bought.
"3 dry months" = the chance that the whole stack pays $0 for 3 calendar months in a row somewhere in months 4-12; "$0 months" =
the share of months 4-12 in which no account pays. MC 1,000 paths; 5-session blocks (as tools/uprisk.py) and 21-session blocks
(keeps a cold month in one piece: the honest dry-spell check).

| Stack (12 months) | H1: $/mo net | **H2: $/mo net** | H2: 1 in 10 paths | **H2: 3 dry months** | H2: $0 months | 2025: $/mo | 2021-24: $/mo |
|---|---:|---:|---:|---:|---:|---:|---:|
| **A: 7 x LIT** (today's plan) | $5,016 | **$4,772** | $2,412 | **20.3%** | 29.8% | $75 | $30 |
| **B: 7 x (LIT + NA 3% / $150 once funded)** | **$5,423** | **$5,080** | $2,558 | **14.2%** | 25.9% | $86 | $63 |
| E: 3 x LIT + 4 x (LIT + NA) | $5,202 | $4,899 | $2,455 | 14.7% | 25.2% | $79 | $43 |
| C: 5 x LIT + 2 x NA-only 50Ks | $3,345 | $3,195 | $1,632 | 21.0% | 30.4% | $26 | $48 |
| 21-session blocks: A | $5,210 | $4,171 | $2,759 | 13.0% | 25.7% | $180 | $31 |
| 21-session blocks: **B** | **$5,759** | **$4,434** | $2,913 | **10.2%** | 21.6% | $197 | $59 |

- **The owner's "about 1 in 8"** is the 21-session-block number for A (13.0% in H2, 10.7% in H1). With NA on every funded
  account it falls to 10.2% (H2) / 9.8% (H1); with 5-session blocks from 20.3% to 14.2%. **+$263 to +$407 a month** on the stack
  in 2026, +$11 to +$33 in 2025 / 2021-24. NA never goes on an eval (LIT's evals are unchanged).
- **NA on its own accounts (C) is worse on every line:** those accounts rarely pass and pay little (section 4).
- **The cold-year risk does not go away.** In a 2025 or 2021-24 market every stack pays $0 in 91-95% of months after month 3,
  has 3 dry months in a row 98-99% of the time, and loses money over 12 months (fees > payouts) in 54-71% of paths. That is
  LIT's 2021-25 break-even showing through 7 copies; NA's money in those years (+$1,292 a month at $500 a trade) cannot get out
  through MFFU-type rules. The only real fix is a second strategy that passes evals and pays out on its own in those years,
  and none has been found (ATLAS: $39-64 a month there, atlas-funded.md).
- How the dry spells are counted: `tools/div_stack.py stack` (book) and `tools/payout_policy.py` (the same stack stepped
  together; its baseline reproduces A to the dollar).

## 6. Verdict

- **Found: a real, uncorrelated futures edge.** The noise-area momentum holds in 2026 H1, H2, 2025 and 2021-24, at 3-4 trades a
  week, beats random entries in 2026 and over 5 years, and makes money in the 2021-25 years where LIT is flat (daily
  correlation with LIT about 0). As plain futures trading at $500 a trade it made $1,292 a month over 2021-25 and $2,659 in
  2026.
- **But not a prop strategy on its own.** It cannot pass an MFFU eval in 2 weeks and a funded MFFU account pays it almost
  nothing: low win rate, deep drawdowns and lumpy days are what the $2,000 floor and the 50% best-day rule are built to stop.
  Do not buy accounts for it.
- **As a small add-on on LIT's funded accounts it is a small, consistent gain** (+$54-83 a month per funded 50K in 2026,
  +$7-12 in 2021-25, about $300 a month on the 7-account stack, fewer dry spells). It never goes on an eval (it would slow LIT's
  "one winner passes").
- **What it does not fix:** in a 2021-25-like market the whole LIT stack pays almost nothing for months, and NA cannot get its
  money out through these prop rules. The cold-year risk of a copied LIT stack stays.
- **Next step if the owner wants it:** a paper slot next to ATLAS / the stop-hunt candidates (cloud only, never routed), scored
  for 20+ trades; then, on a funded account only, the 3% / $150 add-on behind the "LIT first, one position" rule. A finding is
  adopted only by the owner.

## Reproduce

    python -X utf8 tools/div_search.py grid        # NA + RE + IB grids -> research/second/div_search.json (~10 s)
    python -X utf8 tools/div_search.py placebo <ids>
    python -X utf8 tools/div_search.py lookahead
    python -X utf8 tools/div_search.py save        # runs div_*
    python -X utf8 tools/div_stack.py solo|mix|stack [--n 1000]   # prop accounts -> research/second/div_stack.json

The runs' eval columns in the Lab are at $500 a trade (2026 2-week pass / fail 23.1 / 44.7 for the joint pick), not an eval
sizing; the eval numbers above come from `tools/div_stack.py`.
