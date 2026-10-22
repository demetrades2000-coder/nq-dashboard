# LIT entry models

**Question.** lit_A's sessions, levels, filters and PDH/PWH/PMH targets stay fixed. Which entry model makes LIT pay in 2026?
The entry models tested:
- inducement definitions
- the structure-shift swing and its timeframe
- break vs retest vs order block vs FVG vs breaker
- limit vs market
- 1m precision

**Method.**
- Code: `tools/lit_entry.py`. It imports `engine/lit.py` and does not edit it.
- Reproduction check: `gen_cands(ref="frac")` + `run_v` give lit_A's 1,000 trades exactly (`python tools/lit_entry.py check`).
- Data: CME NQ1! 5m. In 2026 the 1m variants run on true 1m bars (`data/NQ_1m.csv`, which matches the 5m file in 2026).
  2021-25 has no 1m data, so the same rule runs on 5m bars there.
- Sizing: stop 2 pts beyond the 5m sweep extreme (hard rule), $800 risk up to a 20-pt stop, then 800×20/stop, MNQ, max
  40 micros. Costs: $1.40 per micro and 1 tick of slippage on market entries and on stop/EOD exits. No cold-streak filter.
- **Overfitting guard:** every choice was made on **2026 H1 (Jan 2-Jun 30)** and checked on **2026 H2 (Jul 1-Oct 16)**.
  2021-25 is only a reference line. 79 variants were run in 5 rounds: single changes, then combinations, then neighbours
  of the best as a robustness check. Results: `research/lab/lit_entry_results.json`.

## The best two (exact parameters)

Both are lit_A (`window 02:00-15:30, all liquidity classes, sweep depth >= 0.5 ATR, targets PD/PW/PM >= 1.5R banked at 5R,
stop buffer 2 pts, stop 8-80 pts, BE at 1R, 1 trade/day`) with these entry changes:

1. **Structure shift = 5m CISD** (`gen_cands(ref="cisd")`). The trigger is the first 5m close above the open of the last
   run of down-close bars into the sweep extreme (mirror for shorts). lit_A used a close above the last 5m fractal high.
2. **Displacement** body >= **0.8** ATR between the extreme and the trigger (lit_A: 1.0).
3. **Inducement I-a** (`idm_a=(1.0, 36, 1)`): at least one 5m k=2 fractal low above the swept level, at most 1.0 ATR above
   it and formed at most 36 bars before the sweep. It must stay untouched until the final run into the extreme takes it.
4. **Entry** (`tf="1m"`, `cisd1m=20`):
   - The limit sits at the 5m CISD level.
   - Once price taps it, wait up to 20 one-minute bars for a 1m CISD, a 1m close above the open of the last run of 1m
     down-close bars into the tap low.
   - Enter at the next 1m open plus 1 tick.
   - Cancel the setup if the sweep extreme breaks, the target trades first, the tap does not come in time, or it is 15:55.
   - Target = the PD/PW/PM level, which must be at least 1.5R from the real fill, banked at 5R.
   - 2021-25 reference: the same rule on 5m bars (4 bars).
5. **Tap wait:** **6** 5m bars (`lit_entry_best`) or the lit_A 12 bars (`lit_entry_best_w12`).

| | Trades/wk | % wks 2+ | Win % | PF | Net $ | $/month | Max DD | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate (decided) | Median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **lit_entry_best** 2026 H1 (pick) | 3.12 | 85% | 22.5 | 2.46 | +15,975 | 2,621 | -2,669 | 17.2 / 4.7 | 37.5 / 16.4 | 71.3% | 14 |
| lit_entry_best 2026 H2 (check) | 2.76 | 88% | 34.9 | 1.71 | +4,550 | 1,225 | -2,489 | 5.1 / 0.0 | 20.5 / 0.0 | 95.2% | 30 |
| **lit_entry_best 2026 full** | **2.99** | 88% | 26.8 | **2.18** | **+20,526** | **2,092** | **-2,669** | 12.6 / 2.9 | 31.1 / 11.2 | 69.2% | 20 |
| lit_entry_best 2021-25 (ref) | 2.27 | 74% | 21.6 | 1.01 | +1,174 | 23 | -15,082 | 4.5 / 15.0 | 8.7 / 33.9 | 26.0% | 26 |
| **lit_entry_best_w12** 2026 H1 | 3.16 | 85% | 21.0 | 2.34 | +15,221 | 2,497 | -2,720 | 17.2 / 7.0 | 35.9 / 20.3 | 64.4% | 13 |
| lit_entry_best_w12 2026 H2 | 2.82 | 94% | 36.4 | 1.96 | +6,152 | 1,656 | -1,661 | 5.1 / 0.0 | 20.5 / 0.0 | 100% | 31.5 |
| **lit_entry_best_w12 2026 full** | **3.03** | 90% | 26.4 | **2.20** | **+21,373** | **2,179** | **-2,720** | 12.6 / 4.4 | 30.1 / 13.6 | 68.4% | 20 |
| lit_entry_best_w12 2021-25 (ref) | 2.33 | 75% | 20.8 | 0.96 | -4,439 | -87 | -16,777 | 4.5 / 15.6 | 8.1 / 34.8 | 21.4% | 24 |
| lit_A 2026 H1 | 2.93 | 78% | 16.0 | 0.70 | -4,420 | -725 | -6,883 | 0.0 / 6.2 | 0.0 / 39.1 | 0% | - |
| lit_A 2026 H2 | 3.08 | 94% | 31.2 | 2.63 | +9,679 | 2,606 | -3,729 | 26.9 / 12.8 | 55.1 / 21.8 | 69.1% | 11 |
| lit_A 2026 full | 2.99 | 83% | 22.0 | 1.26 | +5,258 | 536 | -6,883 | 10.2 / 8.7 | 21.4 / 32.5 | 38.3% | 15 |
| lit_A 2021-25 (ref) | 4.09 | 98% | 17.4 | 1.15 | +31,469 | 616 | -20,948 | 19.0 / 35.1 | 27.6 / 57.5 | 32.4% | 8 |

Checks on lit_entry_best in 2026:
- +2 ticks of slippage: PF 2.12, +$19.9k.
- Longs PF 1.99 (+$6.6k), shorts PF 2.30 (+$13.9k).
- Months: 8 of 10 positive; July -$0.9k, August -$0.4k.
- The top 3 trades are 48% of the net.
- Median stop 48 pts, median 3 micros.
- Exits: 27 target, 33 breakeven, 56 stop, 7 end of day.

## What clearly helped (and what did not)

- **The CISD structure shift is the biggest single change.**
  - Alone (`S_cisd_ref`): H1 PF 0.70 → 1.38 (-$4.4k → +$7.5k), H2 1.28.
  - It triggers earlier and closer to the extreme than the fractal-high break.
  - The 15m swing (`S_frac15_ref`) and the leg's swing high (`S_leg_ref`) are slower, give fewer than 2 trades a week, and
    are worse.
- **Inducement I-a** (an untouched minor low near the level, taken by the run into the sweep) helps **only on top of the
  CISD shift**: H1 1.38 → 1.39, H2 1.28 → 1.73 (`C_cisd_idma`).
  - On the lit_A trigger, I-a hurts H1 (0.40-0.57).
  - **I-c** (POI-side inducement before the fill) almost never happens on 5m: 4 trades in 2026. On 1m it gives 42 trades,
    PF 1.06. Not useful.
  - **I-d** (a build-up swept together with another level) is good per trade but cuts frequency below 2 a week.
- **A 1m CISD confirmation inside the POI is the 1m use that works:** H1 1.39 → 1.98, H2 1.73 → 2.05, DD down to -$3.7k.
  - All its neighbours stay profitable in both halves (H1 PF 1.20-2.46, H2 PF 1.65-2.68):
    - inducement distance 0.5/1.0/1.5 ATR
    - inducement age 16/36 bars
    - confirmation window 10/15/20 one-minute bars
    - tap wait 6/12/24 bars
    - displacement 0.8/1.0 ATR
  - Without I-a, H2 drops to PF 1.16. With the lit_A fractal trigger, H1 is negative.
- **1m fills alone are not an edge, and they expose 5m optimism.**
  - The lit_A limit filled on 1m gives about the same result (2026 PF 1.32 vs 1.26).
  - Deeper limits look worse once filled on 1m. The CISD-level retest drops from H2 1.28 to 0.93, and the order-block
    entry from H2 1.48 to 0.97.
  - Reason: on 5m, the 1R breakeven move and a pullback inside the same bar cannot both be seen. On 1m the breakeven
    scratches show up.
  - **Trust only 1m-executed numbers in 2026.** Every 1m number above is 1m-executed.
- **Entry type on the lit_A trigger:**
  - Market entry is still the worst (2026 PF 0.80).
  - The near edge of the last displacement FVG (`E_fvg_top_last`) is the only zone that beats the retest in H1 (1.16)
    and stays good in H2 (2.02). On 1m it gives 2026 PF 1.43, +$7.6k, and it is the only entry change that is also
    positive in 2021-25 (PF 1.04).
  - Order-block open, CISD level, breaker, fib 50/62 and FVG 50% are worse in H1, or blow up in 2021-25 (order-block open
    -$54k).
- **Rejected:** displacement 1.2 ATR on CISD (PF 0.73), CISD + market entry (PF 1.00), CISD + FVG entry (PF 0.81-0.87),
  max 6/12 bars from extreme to shift.

**Honest caveats.**
- (1) The gain is in H1, the half the choices were made on: lit_A lost $4.4k there and the best variant made $16.0k.
  - In H2 the best variant makes **less** than lit_A: +$4.6k to +$6.2k against +$9.7k, PF 1.7-2.0 against 2.63.
  - It does so with a smaller drawdown (-$1.7k to -$2.5k against -$3.7k) and a better decided-eval pass rate.
  - It is still clearly profitable out of sample, but it did not improve both halves.
- (2) **The CISD-shift edge does not hold in 2021-25:**
  - The best variant is at PF 1.01, its runner-up at 0.96, and plain CISD at 0.95.
  - The lit_A fractal trigger is the only family that is positive there.
  - This is a 2026 edge. The owner asked to judge on 2026 only, so it is reported, not used as a gate.
- (3) The sample is small: 123 trades in 2026, and the top 3 trades are 48% of the net.
- (4) About 0.4% of 2026 5-minute windows have no clean 1m data. Those minutes are skipped during a 1m walk.

Rerun:
> _Code omitted on the public site._
`search` uses 1 CPU and takes about 1 min per 20 variants. Saved runs: `lit_entry_best`, `lit_entry_best_w12`,
`lit_entry_cisd_idm_1m20`, `lit_entry_cisd_idm_5m`, `lit_entry_fvg_1m` (family other, tags lit, lit_entry).

**Merge notes for the combine step.**
- New functions: `gen_cands(ref=...)` (pluggable structure shift; it also adds `idm_a` and `zones` to every candidate),
  `zones()`, `f15_swings()`, `Bars1` (5m/1m executor bars), `sim()` (limit / market / 1m-CISD-confirmation executor) and
  `run_v()` (lit_A filters plus entry keys `zone`, `tf`, `cisd1m`, `idm_a`, `idm_c`, `idm_d`, `need_fvg`).
- `run_v` accepts any `R.make` filter keys, so the session and target agents' filters can be passed straight through.

## Every variant tried

Cells: trades · trades/week · PF · net $. H1 = Jan-Jun 2026 (selection), H2 = Jul-Oct 16 2026 (check). "frac/cisd/leg/frac15"
= structure-shift swing. For `tf 1m` variants the 2021-25 reference runs the same rule on 5m bars.

| `lit_A` | lit_A as is (all levels, 02:00-15:30, 1 trade/day) | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 877 / 4.09 / 1.15 / +31,469 |
| `sw_add_asia18_02` | + Asia box 18:00-02:00 (P1) | 75 / 2.93 / 0.79 / -2,968 | 49 / 3.14 / 2.58 / +9,544 | 124 / 3.01 / 1.32 / +6,576 | -6,883 | 879 / 4.1 / 1.15 / +31,596 |
| `sw_add_asia19_03` | + Asia box 19:00-03:00 (P2) | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 878 / 4.1 / 1.15 / +31,247 |
| `sw_add_asia20_04` | + Asia box 20:00-04:00 (P3) | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 878 / 4.1 / 1.15 / +31,247 |
| `sw_add_asia18_01` | + Reim Asia 18:05-01:00 | 75 / 2.93 / 0.79 / -2,983 | 50 / 3.21 / 2.49 / +9,326 | 125 / 3.03 / 1.31 / +6,343 | -6,898 | 879 / 4.1 / 1.14 / +30,248 |
| `sw_add_all_asiaX` | + all 4 new Asia boxes | 75 / 2.93 / 0.79 / -2,983 | 50 / 3.21 / 2.49 / +9,326 | 125 / 3.03 / 1.31 / +6,343 | -6,898 | 879 / 4.1 / 1.14 / +30,248 |
| `sw_add_lon15` | + London 01:00-05:00 | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 878 / 4.1 / 1.15 / +31,247 |
| `sw_add_ny8_830` | + NY 08:00-08:30 | 78 / 3.05 / 0.88 / -1,738 | 48 / 3.08 / 2.63 / +9,679 | 126 / 3.06 / 1.39 / +7,941 | -6,883 | 884 / 4.12 / 1.15 / +31,516 |
| `sw_add_h4` | + 06:00-10:00 4H candle high/low as a level | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 877 / 4.09 / 1.15 / +31,469 |
| `sw_add_reim_coded` | + Reim boxes as coded (+60 min in summer from 2023-11) | 75 / 2.93 / 0.79 / -2,968 | 51 / 3.27 / 2.51 / +9,383 | 126 / 3.06 / 1.31 / +6,416 | -6,883 | 882 / 4.11 / 1.12 / +26,738 |
| `sw_drop_nytrap` | - NY 08:30/09:30/09:30-10:30 and premarket boxes | 74 / 2.89 / 0.7 / -4,284 | 48 / 3.08 / 2.63 / +9,679 | 122 / 2.96 / 1.26 / +5,394 | -6,746 | 869 / 4.05 / 1.15 / +32,715 |
| `sw_drop_ny_all` | - every NY box and premarket | 74 / 2.89 / 0.7 / -4,284 | 47 / 3.01 / 2.31 / +7,786 | 121 / 2.94 / 1.17 / +3,502 | -6,746 | 854 / 3.98 / 1.15 / +31,984 |
| `sw_only_sessions` | only session boxes (no daily, gap, build-up sweeps) | 62 / 2.42 / 0.96 / -387 | 37 / 2.37 / 1.62 / +2,844 | 99 / 2.4 / 1.17 / +2,457 | -3,724 | 769 / 3.59 / 1.17 / +29,137 |
| `sw_only_asia_lon` | only Asia + London boxes (all definitions) | 56 / 2.19 / 1.04 / +364 | 40 / 2.56 / 1.46 / +2,526 | 96 / 2.33 / 1.19 / +2,890 | -3,617 | 700 / 3.26 / 1.16 / +26,223 |
| `sw_reim_intended` | Reim intended boxes only (Asia 18:05-01, Lon 03-04, NY 08-09) + PDH/PWH/PMH | 53 / 2.07 / 1.34 / +2,591 | 38 / 2.44 / 2.05 / +4,767 | 91 / 2.21 / 1.6 / +7,358 | -2,694 | 645 / 3.01 / 1.04 / +6,046 |
| `sw_reim_coded` | Reim boxes as coded only + PDH/PWH/PMH | 47 / 1.84 / 1.38 / +3,137 | 28 / 1.79 / 2.03 / +3,561 | 75 / 1.82 / 1.57 / +6,698 | -2,813 | 635 / 2.96 / 1.05 / +6,692 |
| `sw_no_session` | no session boxes (daily, gap, build-ups only) | 63 / 2.46 / 0.89 / -1,364 | 38 / 2.44 / 2.47 / +7,083 | 101 / 2.45 / 1.33 / +5,718 | -5,147 | 780 / 3.64 / 1.12 / +24,299 |
| `trap0` | sweep counts only with a close back inside within 0 bars of the breach | 47 / 1.84 / 0.91 / -740 | 30 / 1.92 / 1.56 / +2,263 | 77 / 1.87 / 1.13 / +1,524 | -4,318 | 684 / 3.19 / 1.12 / +19,181 |
| `trap1` | sweep counts only with a close back inside within 1 bars of the breach | 64 / 2.5 / 0.71 / -3,487 | 36 / 2.31 / 1.89 / +4,188 | 100 / 2.43 / 1.04 / +701 | -5,752 | 771 / 3.6 / 1.17 / +30,846 |
| `trap2` | sweep counts only with a close back inside within 2 bars of the breach | 66 / 2.58 / 0.7 / -3,511 | 39 / 2.5 / 2.09 / +5,514 | 105 / 2.55 / 1.12 / +2,004 | -5,558 | 805 / 3.75 / 1.24 / +45,681 |
| `trap3` | sweep counts only with a close back inside within 3 bars of the breach | 68 / 2.66 / 0.65 / -4,546 | 41 / 2.63 / 2.14 / +6,072 | 109 / 2.65 / 1.08 / +1,527 | -5,780 | 823 / 3.84 / 1.25 / +48,862 |
| `win_london` | entry window london: [(120, 300)] | 42 / 1.64 / 0.59 / -4,183 | 27 / 1.73 / 3.29 / +7,484 | 69 / 1.67 / 1.25 / +3,302 | -5,902 | 547 / 2.55 / 1.13 / +19,918 |
| `win_ny_am` | entry window ny_am: [(570, 690)] | 12 / 0.47 / 2.19 / +1,179 | 3 / 0.19 / 6.89 / +1,618 | 15 / 0.36 / 3.21 / +2,797 | -601 | 283 / 1.32 / 0.92 / -2,983 |
| `win_ny_both` | entry window ny_both: [(570, 690), (810, 930)] | 14 / 0.55 / 1.8 / +967 | 5 / 0.32 / 2.4 / +1,276 | 19 / 0.46 / 2.06 / +2,243 | -635 | 358 / 1.67 / 0.93 / -3,440 |
| `win_lon_nyam` | entry window lon_nyam: [(120, 300), (570, 690)] | 48 / 1.88 / 0.72 / -3,021 | 29 / 1.86 / 3.72 / +9,242 | 77 / 1.87 / 1.44 / +6,221 | -6,259 | 672 / 3.13 / 1.13 / +21,327 |
| `win_lon_ny` | entry window lon_ny: [(120, 300), (570, 690), (810, 930)] | 50 / 1.95 / 0.7 / -3,233 | 29 / 1.86 / 3.72 / +9,242 | 79 / 1.92 / 1.42 / +6,009 | -6,471 | 713 / 3.33 / 1.13 / +22,737 |
| `win_lon_ny830` | entry window lon_ny830: [(120, 300), (510, 690), (810, 930)] | 54 / 2.11 / 0.68 / -3,503 | 31 / 1.99 / 3.82 / +9,630 | 85 / 2.06 / 1.42 / +6,128 | -6,582 | 745 / 3.47 / 1.15 / +27,546 |
| `win_no_lunch` | entry window no_lunch: [(120, 720), (810, 930)] | 71 / 2.77 / 0.72 / -4,050 | 47 / 3.01 / 2.54 / +9,090 | 118 / 2.86 / 1.25 / +5,040 | -6,444 | 864 / 4.03 / 1.15 / +32,212 |
| `win_no_lunch1130` | entry window no_lunch1130: [(120, 690), (810, 930)] | 71 / 2.77 / 0.72 / -4,050 | 47 / 3.01 / 2.54 / +9,090 | 118 / 2.86 / 1.25 / +5,040 | -6,444 | 862 / 4.02 / 1.15 / +31,811 |
| `win_no_lon_lunch` | entry window no_lon_lunch: [(120, 300), (420, 720), (810, 930)] | 65 / 2.54 / 0.63 / -4,895 | 42 / 2.69 / 3.24 / +10,372 | 107 / 2.6 / 1.31 / +5,478 | -6,450 | 804 / 3.75 / 1.17 / +33,406 |
| `win_no_pm` | entry window no_pm: [(120, 720)] | 70 / 2.73 / 0.72 / -3,871 | 47 / 3.01 / 2.54 / +9,090 | 117 / 2.84 / 1.26 / +5,219 | -6,266 | 842 / 3.93 / 1.15 / +31,170 |
| `po3_00_None` | PO3 filter: extreme beyond the 00 open, entry within NoneR of it | 68 / 2.66 / 0.95 / -618 | 38 / 2.44 / 2.44 / +7,170 | 106 / 2.57 / 1.36 / +6,552 | -4,973 | 830 / 3.87 / 1.15 / +29,980 |
| `po3_00_0.5` | PO3 filter: extreme beyond the 00 open, entry within 0.5R of it | 63 / 2.46 / 0.9 / -1,277 | 35 / 2.24 / 2.31 / +6,233 | 98 / 2.38 / 1.29 / +4,956 | -4,692 | 804 / 3.75 / 1.09 / +17,142 |
| `po3_00_0.0` | PO3 filter: extreme beyond the 00 open, entry within 0.0R of it | 56 / 2.19 / 0.85 / -1,673 | 35 / 2.24 / 2.34 / +6,098 | 91 / 2.21 / 1.28 / +4,425 | -4,463 | 701 / 3.27 / 1.12 / +19,546 |
| `po3_06_None` | PO3 filter: extreme beyond the 06 open, entry within NoneR of it | 71 / 2.77 / 0.73 / -3,834 | 46 / 2.95 / 2.47 / +8,692 | 117 / 2.84 / 1.24 / +4,858 | -6,296 | 869 / 4.05 / 1.14 / +30,362 |
| `po3_0730_None` | PO3 filter: extreme beyond the 0730 open, entry within NoneR of it | 73 / 2.85 / 0.71 / -4,086 | 47 / 3.01 / 2.54 / +9,090 | 120 / 2.91 / 1.25 / +5,004 | -6,548 | 873 / 4.07 / 1.14 / +28,977 |
| `po3_0830_None` | PO3 filter: extreme beyond the 0830 open, entry within NoneR of it | 73 / 2.85 / 0.71 / -4,086 | 47 / 3.01 / 2.54 / +9,090 | 120 / 2.91 / 1.25 / +5,004 | -6,548 | 871 / 4.06 / 1.14 / +29,356 |
| `po3_0930_None` | PO3 filter: extreme beyond the 0930 open, entry within NoneR of it | 73 / 2.85 / 0.71 / -4,086 | 47 / 3.01 / 2.54 / +9,090 | 120 / 2.91 / 1.25 / +5,004 | -6,548 | 872 / 4.07 / 1.14 / +29,271 |
| `po3_1000_None` | PO3 filter: extreme beyond the 1000 open, entry within NoneR of it | 73 / 2.85 / 0.71 / -4,086 | 48 / 3.08 / 2.63 / +9,679 | 121 / 2.94 / 1.28 / +5,593 | -6,548 | 875 / 4.08 / 1.14 / +30,650 |
| `po3_18_None` | PO3 filter: extreme beyond the 18 open, entry within NoneR of it | 61 / 2.38 / 1.17 / +1,910 | 34 / 2.18 / 1.57 / +2,704 | 95 / 2.31 / 1.29 / +4,614 | -4,827 | 807 / 3.76 / 1.05 / +8,823 |
| `po3_22_None` | PO3 filter: extreme beyond the 22 open, entry within NoneR of it | 63 / 2.46 / 0.98 / -244 | 38 / 2.44 / 2.44 / +6,982 | 101 / 2.45 / 1.41 / +6,739 | -4,400 | 822 / 3.83 / 1.11 / +21,556 |
| `po3_06_0.5` | PO3 filter: extreme beyond the 06 open, entry within 0.5R of it | 69 / 2.7 / 0.61 / -5,425 | 44 / 2.82 / 2.37 / +7,642 | 113 / 2.74 / 1.11 / +2,218 | -7,052 | 845 / 3.94 / 1.11 / +22,579 |
| `h4rev_600_660` | + IET 06-10 4H candle swept 10:00-11:00, target its other end | 76 / 2.97 / 0.7 / -4,424 | 48 / 3.08 / 2.63 / +9,679 | 124 / 3.01 / 1.26 / +5,254 | -6,883 | 881 / 4.11 / 1.14 / +29,718 |
| `h4rev_590_690` | + IET 06-10 4H candle swept 09:50-11:30, target its other end | 77 / 3.01 / 0.68 / -4,766 | 49 / 3.14 / 2.57 / +9,518 | 126 / 3.06 / 1.23 / +4,752 | -7,224 | 884 / 4.12 / 1.13 / +29,038 |
| `h4rev_600_630` | + IET 06-10 4H candle swept 10:00-10:30, target its other end | 75 / 2.93 / 0.7 / -4,420 | 48 / 3.08 / 2.63 / +9,679 | 123 / 2.99 / 1.26 / +5,258 | -6,883 | 878 / 4.1 / 1.14 / +30,562 |
| `how_tue03_wed1130_05` | size 0.5 outside the HOW window tue03_wed1130 | 75 / 2.93 / 0.85 / -1,522 | 48 / 3.08 / 3.14 / +7,581 | 123 / 2.99 / 1.45 / +6,059 | -4,833 | 877 / 4.09 / 1.16 / +21,956 |
| `how_mon18_wed1130_05` | size 0.5 outside the HOW window mon18_wed1130 | 75 / 2.93 / 0.76 / -2,610 | 48 / 3.08 / 2.97 / +7,370 | 123 / 2.99 / 1.32 / +4,760 | -5,315 | 877 / 4.09 / 1.09 / +14,586 |
| `how_tue02_wed0930_05` | size 0.5 outside the HOW window tue02_wed0930 | 75 / 2.93 / 0.82 / -1,806 | 48 / 3.08 / 2.97 / +7,370 | 123 / 2.99 / 1.4 / +5,564 | -5,117 | 877 / 4.09 / 1.11 / +16,092 |
| `how_tue03_wed12_05` | size 0.5 outside the HOW window tue03_wed12 | 75 / 2.93 / 0.85 / -1,522 | 48 / 3.08 / 3.14 / +7,581 | 123 / 2.99 / 1.45 / +6,059 | -4,833 | 877 / 4.09 / 1.16 / +21,835 |
| `how_mon18_wed12_05` | size 0.5 outside the HOW window mon18_wed12 | 75 / 2.93 / 0.76 / -2,610 | 48 / 3.08 / 2.97 / +7,370 | 123 / 2.99 / 1.32 / +4,760 | -5,315 | 877 / 4.09 / 1.09 / +14,465 |
| `how_dir` | HOW direction: a window sweep making a new weekly extreme sets the week's side | 66 / 2.58 / 0.54 / -6,043 | 42 / 2.69 / 3.13 / +10,173 | 108 / 2.62 / 1.23 / +4,130 | -7,802 | 786 / 3.67 / 1.09 / +18,004 |
| `mw_filter` | Thu/Fri: only trades in the direction that broke the Mon-Wed range | 70 / 2.73 / 0.77 / -3,119 | 44 / 2.82 / 3.01 / +10,410 | 114 / 2.77 / 1.39 / +7,291 | -5,581 | 783 / 3.65 / 1.13 / +26,780 |
| `mw_half` | Thu/Fri: half size against the Mon-Wed range break | 75 / 2.93 / 0.73 / -3,841 | 48 / 3.08 / 2.83 / +10,090 | 123 / 2.99 / 1.32 / +6,250 | -6,303 | 877 / 4.09 / 1.16 / +32,539 |
| `fri_half` | Friday half size | 75 / 2.93 / 0.79 / -2,508 | 48 / 3.08 / 2.99 / +9,828 | 123 / 2.99 / 1.43 / +7,320 | -6,110 | 877 / 4.09 / 1.12 / +23,616 |
| `fri_skip` | no Friday trades | 56 / 2.19 / 0.87 / -1,246 | 37 / 2.37 / 3.24 / +8,900 | 93 / 2.26 / 1.56 / +7,654 | -6,071 | 709 / 3.31 / 1.09 / +16,894 |
| `bias_first_sweep_f` | bias first_sweep as a filter | 62 / 2.42 / 0.72 / -3,527 | 35 / 2.24 / 2.78 / +7,089 | 97 / 2.35 / 1.21 / +3,562 | -7,061 | 692 / 3.23 / 1.06 / +9,744 |
| `bias_first_sweep_h` | bias first_sweep: half size against it | 75 / 2.93 / 0.6 / -5,553 | 48 / 3.08 / 2.64 / +8,033 | 123 / 2.99 / 1.13 / +2,480 | -7,547 | 877 / 4.09 / 1.12 / +21,026 |
| `bias_opp_off_f` | bias opp_off as a filter | 53 / 2.07 / 0.42 / -6,983 | 26 / 1.67 / 2.68 / +5,270 | 79 / 1.92 / 0.89 / -1,712 | -8,697 | 477 / 2.22 / 1.1 / +11,868 |
| `bias_opp_off_h` | bias opp_off: half size against it | 75 / 2.93 / 0.56 / -6,145 | 48 / 3.08 / 2.51 / +7,050 | 123 / 2.99 / 1.05 / +905 | -7,723 | 877 / 4.09 / 1.13 / +21,106 |
| `bias_tt_f` | bias tt as a filter | 58 / 2.27 / 0.88 / -1,107 | 40 / 2.56 / 1.91 / +4,878 | 98 / 2.38 / 1.26 / +3,771 | -3,551 | 788 / 3.68 / 1.11 / +21,227 |
| `bias_tt_h` | bias tt: half size against it | 75 / 2.93 / 0.67 / -3,930 | 48 / 3.08 / 2.24 / +6,913 | 123 / 2.99 / 1.17 / +2,984 | -5,923 | 877 / 4.09 / 1.17 / +30,389 |
| `bias_pd_mid_f` | bias pd_mid as a filter | 45 / 1.76 / 0.77 / -2,022 | 20 / 1.28 / 1.06 / +176 | 65 / 1.58 / 0.84 / -1,846 | -5,652 | 597 / 2.78 / 1.05 / +8,025 |
| `bias_pd_mid_h` | bias pd_mid: half size against it | 75 / 2.93 / 0.75 / -2,748 | 48 / 3.08 / 2.11 / +4,977 | 123 / 2.99 / 1.14 / +2,229 | -5,346 | 877 / 4.09 / 1.2 / +31,616 |
| `perday2` | max 2 trades/day | 97 / 3.79 / 0.58 / -7,828 | 61 / 3.91 / 2.18 / +8,962 | 158 / 3.83 / 1.04 / +1,134 | -9,451 | 1322 / 6.17 / 1.14 / +42,121 |
| `perday2_onedir` | max 2 trades/day, same direction only | 90 / 3.52 / 0.61 / -6,830 | 57 / 3.65 / 2.16 / +8,374 | 147 / 3.57 / 1.06 / +1,544 | -8,523 | 1169 / 5.45 / 1.18 / +47,427 |
| `flat_am_1130` | AM entries flat by 11:30 | 75 / 2.93 / 0.72 / -4,058 | 48 / 3.08 / 2.57 / +9,322 | 123 / 2.99 / 1.26 / +5,263 | -6,521 | 872 / 4.07 / 1.14 / +30,910 |
| `flat_am_1200` | AM entries flat by 12:00 | 75 / 2.93 / 0.71 / -4,298 | 48 / 3.08 / 2.58 / +9,367 | 123 / 2.99 / 1.25 / +5,069 | -6,761 | 876 / 4.09 / 1.15 / +31,550 |
| `r_no_daily` | Reim boxes only (no PDH/PWH/PMH sweeps) | 52 / 2.03 / 1.34 / +2,597 | 35 / 2.24 / 2.09 / +4,663 | 87 / 2.11 / 1.61 / +7,260 | -2,806 | 633 / 2.95 / 1.06 / +8,094 |
| `r_plus_bu` | Reim boxes + daily + build-ups | 71 / 2.77 / 1.05 / +664 | 49 / 3.14 / 2.73 / +9,895 | 120 / 2.91 / 1.57 / +10,559 | -5,227 | 842 / 3.93 / 1.11 / +23,822 |
| `r_plus_gap` | Reim boxes + daily + NWOG/NDOG | 53 / 2.07 / 1.34 / +2,591 | 38 / 2.44 / 2.05 / +4,767 | 91 / 2.21 / 1.6 / +7,358 | -2,694 | 651 / 3.04 / 1.07 / +9,765 |
| `r_asia20` | Reim set with Asia 20:00-00:00 instead of 18:05-01:00 | 49 / 1.91 / 1.54 / +3,305 | 36 / 2.31 / 2.54 / +6,018 | 85 / 2.06 / 1.93 / +9,323 | -2,400 | 656 / 3.06 / 1.16 / +22,877 |
| `r_asia18_02` | Reim set with Asia 18:00-02:00 instead | 46 / 1.8 / 1.88 / +5,107 | 37 / 2.37 / 2.05 / +4,760 | 83 / 2.01 / 1.95 / +9,867 | -2,694 | 616 / 2.87 / 0.97 / -3,973 |
| `r_no_ny` | Reim set without the NY 08-09 box | 46 / 1.8 / 1.31 / +2,268 | 37 / 2.37 / 1.63 / +2,874 | 83 / 2.01 / 1.43 / +5,142 | -2,694 | 574 / 2.68 / 1.02 / +2,024 |
| `r_lon25` | Reim set with London 02:00-05:00 instead of 03-04 | 48 / 1.88 / 1.05 / +387 | 26 / 1.67 / 2.8 / +5,369 | 74 / 1.8 / 1.54 / +5,756 | -3,027 | 638 / 2.98 / 1.03 / +3,637 |
| `r_plus_ny8_830` | Reim set + NY 08:00-08:30 | 57 / 2.23 / 1.63 / +5,026 | 38 / 2.44 / 2.05 / +4,767 | 95 / 2.31 / 1.79 / +9,793 | -2,918 | 685 / 3.19 / 1.05 / +7,587 |
| `r_how05` | Reim set + size 0.5 outside the HOW window | 53 / 2.07 / 1.68 / +3,408 | 38 / 2.44 / 2.6 / +4,304 | 91 / 2.21 / 2.0 / +7,712 | -1,552 | 645 / 3.01 / 0.94 / -5,752 |
| `r_fri05` | Reim set + Friday half size | 53 / 2.07 / 1.65 / +4,039 | 38 / 2.44 / 2.43 / +5,478 | 91 / 2.21 / 1.95 / +9,516 | -2,425 | 645 / 3.01 / 1.01 / +1,112 |
| `r_po3_18` | Reim set + PO3 18:00 open filter | 46 / 1.8 / 1.49 / +3,204 | 30 / 1.92 / 1.8 / +3,043 | 76 / 1.84 / 1.61 / +6,247 | -2,715 | 599 / 2.79 / 0.94 / -8,454 |
| `r_po3_00` | Reim set + PO3 midnight open filter | 50 / 1.95 / 1.32 / +2,349 | 29 / 1.86 / 1.98 / +3,203 | 79 / 1.92 / 1.52 / +5,552 | -2,789 | 610 / 2.85 / 0.96 / -5,243 |
| `r_po3_00_h` | Reim set + half size when not beyond the midnight open | 53 / 2.07 / 1.36 / +2,713 | 38 / 2.44 / 2.07 / +4,233 | 91 / 2.21 / 1.6 / +6,946 | -2,548 | 645 / 3.01 / 1.01 / +1,222 |
| `r_tt_f` | Reim set + TTrades PDH/PDL bias filter | 41 / 1.6 / 1.4 / +2,064 | 33 / 2.12 / 2.15 / +4,669 | 74 / 1.8 / 1.73 / +6,732 | -2,463 | 552 / 2.57 / 0.95 / -5,976 |
| `r_trap2` | Reim set + close back within 2 bars | 39 / 1.52 / 1.4 / +2,370 | 25 / 1.6 / 1.65 / +1,924 | 64 / 1.55 / 1.49 / +4,294 | -3,181 | 521 / 2.43 / 1.19 / +20,576 |
| `r_mw_f` | Reim set + Mon-Wed break filter on Thu/Fri | 50 / 1.95 / 1.38 / +2,828 | 33 / 2.12 / 2.59 / +5,716 | 83 / 2.01 / 1.77 / +8,543 | -2,434 | 565 / 2.64 / 1.06 / +6,932 |
| `r_perday2_od` | Reim set + max 2/day same direction | 57 / 2.23 / 1.25 / +2,077 | 40 / 2.56 / 1.95 / +4,535 | 97 / 2.35 / 1.51 / +6,612 | -2,926 | 770 / 3.59 / 1.03 / +4,585 |
| `r_win_lon_ny830` | Reim set + entries only London + NY 08:30-11:30 + PM | 34 / 1.33 / 0.71 / -1,647 | 19 / 1.22 / 3.74 / +5,094 | 53 / 1.29 / 1.46 / +3,448 | -3,181 | 485 / 2.26 / 1.02 / +2,301 |
| `r_win_no_lunch` | Reim set + no entries 12:00-13:30 | 52 / 2.03 / 1.33 / +2,524 | 38 / 2.44 / 2.05 / +4,767 | 90 / 2.18 / 1.6 / +7,290 | -2,738 | 626 / 2.92 / 1.04 / +5,062 |
| `b1_asia19` | B1 with Asia 19:00-00:00 | 50 / 1.95 / 1.46 / +2,976 | 35 / 2.24 / 2.39 / +5,413 | 85 / 2.06 / 1.81 / +8,389 | -2,400 | 654 / 3.05 / 1.09 / +11,974 |
| `b1_asia18` | B1 with Asia 18:00-00:00 | 48 / 1.88 / 1.61 / +3,570 | 35 / 2.24 / 2.39 / +5,413 | 83 / 2.01 / 1.92 / +8,984 | -2,400 | 637 / 2.97 / 1.0 / -360 |
| `b1_two_asia` | B1 + Asia 18:00-02:00 as well | 54 / 2.11 / 1.6 / +4,560 | 38 / 2.44 / 2.18 / +5,364 | 92 / 2.23 / 1.82 / +9,924 | -2,694 | 686 / 3.2 / 1.15 / +22,000 |
| `b1_ny8_830` | B1 + NY 08:00-08:30 box | 53 / 2.07 / 1.9 / +5,740 | 36 / 2.31 / 2.54 / +6,018 | 89 / 2.16 / 2.14 / +11,758 | -2,400 | 693 / 3.23 / 1.17 / +25,432 |
| `b1_mw_f` | B1 + Mon-Wed break filter Thu/Fri | 46 / 1.8 / 1.6 / +3,542 | 32 / 2.05 / 3.13 / +6,749 | 78 / 1.89 / 2.13 / +10,290 | -1,900 | 580 / 2.71 / 1.19 / +23,442 |
| `b1_fri05` | B1 + Friday half size | 49 / 1.91 / 1.79 / +4,143 | 36 / 2.31 / 3.01 / +6,620 | 85 / 2.06 / 2.26 / +10,763 | -1,916 | 656 / 3.06 / 1.14 / +18,030 |
| `b1_how05` | B1 + size 0.5 outside the HOW window | 49 / 1.91 / 2.03 / +4,128 | 36 / 2.31 / 3.24 / +5,251 | 85 / 2.06 / 2.48 / +9,379 | -1,048 | 656 / 3.06 / 1.1 / +9,671 |
| `b1_perday2_od` | B1 + max 2/day, same direction | 54 / 2.11 / 1.34 / +2,383 | 37 / 2.37 / 2.54 / +6,016 | 91 / 2.21 / 1.77 / +8,399 | -2,402 | 782 / 3.65 / 1.14 / +21,836 |
| `b1_ny8_830_mw_f` | B1 + NY 08-08:30 + Mon-Wed break filter | 50 / 1.95 / 1.97 / +5,977 | 32 / 2.05 / 3.13 / +6,749 | 82 / 1.99 / 2.37 / +12,726 | -1,900 | 614 / 2.86 / 1.18 / +24,329 |
| `b1_ny8_830_od2` | B1 + NY 08-08:30 + max 2/day same direction | 58 / 2.27 / 1.66 / +4,818 | 39 / 2.5 / 2.46 / +5,879 | 97 / 2.35 / 1.94 / +10,697 | -2,538 | 837 / 3.9 / 1.14 / +24,560 |
| `b1_ny8_830_mw_f_od2` | B1 + NY 08-08:30 + Mon-Wed filter + max 2/day same dir | 55 / 2.15 / 1.71 / +5,054 | 35 / 2.24 / 3.0 / +6,610 | 90 / 2.18 / 2.12 / +11,664 | -2,138 | 739 / 3.45 / 1.15 / +23,237 |
| `b1_ny8_830_fri05` | B1 + NY 08-08:30 + Friday half | 53 / 2.07 / 2.1 / +6,042 | 36 / 2.31 / 3.01 / +6,620 | 89 / 2.16 / 2.44 / +12,662 | -1,916 | 693 / 3.23 / 1.15 / +21,043 |
| `b2_ny8_830` | B2 + NY 08-08:30 | 52 / 2.03 / 2.03 / +6,900 | 37 / 2.37 / 2.05 / +4,760 | 89 / 2.16 / 2.04 / +11,659 | -2,694 | 657 / 3.06 / 0.98 / -2,106 |
| `b2_mw_f` | B2 + Mon-Wed break filter | 43 / 1.68 / 1.96 / +5,343 | 33 / 2.12 / 2.44 / +5,491 | 76 / 1.84 / 2.16 / +10,834 | -2,194 | 536 / 2.5 / 0.96 / -4,682 |
| `b2_ny8_830_mw_f_od2` | B2 + NY 08-08:30 + Mon-Wed filter + max 2/day same dir | 51 / 1.99 / 2.15 / +7,410 | 38 / 2.44 / 2.22 / +5,120 | 89 / 2.16 / 2.18 / +12,530 | -2,561 | 674 / 3.14 / 0.95 / -7,071 |
| `b1n_mw_f_fri05` | B1 + NY 08-08:30 + Mon-Wed filter + Friday half | 50 / 1.95 / 2.15 / +6,165 | 32 / 2.05 / 3.34 / +6,941 | 82 / 1.99 / 2.57 / +13,106 | -1,710 | 614 / 2.86 / 1.18 / +22,442 |
| `b1n_how05` | B1 + NY 08-08:30 + size 0.5 outside HOW window | 53 / 2.07 / 2.38 / +5,646 | 36 / 2.31 / 3.24 / +5,251 | 89 / 2.16 / 2.69 / +10,897 | -1,126 | 693 / 3.23 / 1.11 / +10,862 |
