## The question

The owner asked: "I think ... VP / VWAP could be additional confluence in our strategy. Remember we still want a decent
amount of trades per week."

So the test was whether VWAP and the volume profile can tell us which Liquidity Engine setups deserve more or less
size. Each idea was tried mainly as a **size rule** (x0.5 or x1.25), so every setup is still traded. Trades per week
stay exactly where they are: 2.2 a week in 2026 (2+ in 71% of weeks) and 3.2 a week in 2021-25 (2+ in 92%).

## Short answer

- **No VWAP or volume-profile rule beats the live strategy in both 2026 and 2021-25 once it is checked for luck.**
  Keep the live strategy as it is.
- The old claim that entries on the **value side of VWAP** are better (the old x1.33 "conviction" size and the grade's
  "proven" item) does not hold on today's strategy over 5 years. In 2021-25, value-side entries made slightly *less*
  (-0.02R vs +0.02R per trade).
- Halving the size of "weak" trades always looks good in 2021-25 (smaller drawdown, fewer failed evals). It always costs
  2026 profit, from $620 to $11,112. That is just less risk, not an edge.
- One rule passed the raw test by a hair: **1.25x size on days that open inside yesterday's value area** ("balance
  days"). It added +$942 in 2026 and +$1,308 in 2021-25. It fails the robustness checks:
  - Neighbouring value-area settings don't work.
  - All of the 5-year gain comes from 2023; 2024 and 2025 got worse.
  - The drawdown is bigger in both periods.

## How it was tested (and why the numbers can be trusted)

- **Same trades as the live strategy.** The 768 trades come from the exact live-loop replay, costs included. Only their
  size changes, which is exact: profit, commission and slippage scale with the number of micros. No engine replays were
  run.
- **Skips are only a check.** A skip done after the fact only approximates an engine filter, because with a 1-trade-a-day
  limit the engine might have taken a later setup that day instead.
- **Every size rule sits on top of the live sizing**, including the cold-streak half size.
- **No peeking.** Every feature is computed at the moment of the decision, which is the close of the signal candle.
  The engine prices its plan at that close too. Only candles that had closed are used.
  - Test: for 20 random trades, the features were recomputed on data cut off right after the signal candle. They came
    out identical.
- **Real futures data:** `data/NQ_5m.csv` (TradingView CME NQ1!, back-adjusted, with volume).
- **VWAP:**
  - Two anchors, each with standard-deviation bands:
    - 09:30, the session VWAP the engine uses. It matches the engine's own "value side of session VWAP" flag on
      768/768 trades.
    - 18:00, the CME session open.
  - The 09:30 bands only count from 10:00. 297 of the 768 trades enter before 10:00, when the bands are still
    squeezed onto the VWAP.
  - Anchored VWAPs from the start of the sweep leg and from the sweep extreme.
- **Volume profile:**
  - **Approximation:** we only have 5-minute candles, so each candle's volume is spread evenly over every tick between
    its low and high. A real profile needs tick or 1-minute data, which we only have for 2026.
  - Point of control (POC) and the 70% value area come from 5-point rows, regular hours only. This matches the engine's
    own open location on 753/768 trades. The engine splits a candle's volume by the 5-point rows it touches, while we
    split it by tick. On the other 15 trades that moves a value-area edge, usually by one 5-point row (12 of 15), with
    the 09:30 open sitting within a few points of that edge.
  - Naked POC: a POC from the last 10 sessions that no candle has traded through since.
  - Composite profile: the last 5 sessions. Developing POC: today's profile from 18:00.
- **Choice made on 2021-25 only.** The rule was fixed before any sized result was looked at. An idea was kept if
  "trades with it" vs "trades without it":
  - differed by at least 0.05R per trade,
  - pointed the same way in average R and in dollars per trade,
  - and the idea covered 5-95% of trades.

  12 of 24 ideas qualified. The with/without table printed 2026 next to 2021-25, so 2026 was seen, but the rule only
  reads 2021-25.
- **Two re-checks were added by hand**, sized the way they were claimed rather than by the rule:
  - the old "value side of VWAP is better" claim,
  - the open location vs yesterday's value, in both directions.

  The AMT "balance day" direction was added after the table had been seen. That is one more reason to distrust its
  narrow pass below.
- **Four ways per idea:**
  - (a1) x0.5 on the weak side.
  - (a2) x1.25 on the strong side.
  - (b) skip the weak side (check only).
  - (c) cold-streak interplay: during a cold streak, strong-side trades go back to full size and weak-side trades stay
    at half.
- **Robustness gate.** A rule that beats the baseline in both periods must also:
  - work at neighbouring settings,
  - improve at least 3 of the 4 full years 2022-25,
  - be compared with a placebo: random groups of trades of the same size, sized the same way.
- **How much was tried:** 24 ideas, 76 sized variants, all saved (listed at the end).

**Small catch with x1.25:** micros are rounded down. A trade with 2-3 micros (stops wider than about 45 points) stays at
2-3 micros, so x1.25 only acts on tighter stops. That is the "size follows the stop" rule doing its job.

## What each idea did on its own

Every trade at today's live size, split into trades **with** and **without** the condition. Avg R is per trade, before sizing. Net $ is at the live size. Only the 2021-25 columns were used to choose; 2026 is shown for honesty.

| Idea | 2021-25 with: n, avg R, net $, PF | 2021-25 without | 2026 with | 2026 without | Chosen on 2021-25? |
|---|---|---|---|---|---|
| `vwap_side`: Entry on the value side of the session (09:30) VWAP: long below it, short above it | 358, -0.02R, +1,457, 1.03 | 321, +0.02R, +5,033, 1.17 | 57, +0.41R, +14,429, 3.78 | 32, +0.33R, +5,682, 2.94 | no |
| `vwap_eth_side`: Entry on the value side of the overnight-anchored (18:00) VWAP | 474, -0.00R, +4,090, 1.07 | 205, -0.01R, +2,401, 1.12 | 63, +0.50R, +15,855, 4.16 | 26, +0.07R, +4,256, 2.37 | no |
| `vwap_chase1`: Entry already more than 1 SD beyond the 18:00 VWAP in the trade's direction (chasing) | 61, +0.00R, -1,220, 0.79 | 618, -0.00R, +7,710, 1.11 | 4, +0.39R, +804, 3.94 | 85, +0.38R, +19,307, 3.46 | no |
| `vwap_deep1`: Entry more than 1 SD on the value side of the 18:00 VWAP (deep discount / premium) | 218, -0.04R, -3,124, 0.9 | 461, +0.02R, +9,614, 1.22 | 36, +0.71R, +15,162, 7.27 | 53, +0.15R, +4,949, 1.87 | yes: absent is strong |
| `vwap_rth_band1`: From 10:00: entry more than 1 SD beyond the 09:30 VWAP in the trade's direction | 52, +0.03R, -153, 0.96 | 382, -0.06R, -1,523, 0.96 | 1, -1.02R, -106, - | 59, +0.38R, +15,708, 4.12 | yes: present is strong |
| `vwap_atr_chase2`: Entry at least 2 ATR past the 09:30 VWAP in the trade's direction (stretched away from value) | 15, +0.37R, +883, 1.7 | 664, -0.01R, +5,608, 1.08 | 3, -0.38R, -134, - | 86, +0.40R, +20,245, 3.54 | no |
| `vwap_atr_deep2`: Entry at least 2 ATR on the value side of the 09:30 VWAP | 98, +0.06R, +3,574, 1.3 | 581, -0.01R, +2,917, 1.05 | 26, +0.39R, +6,771, 6.59 | 63, +0.37R, +13,340, 2.93 | yes: present is strong |
| `vwap_ext_late`: Late entry: more than 0.5R past the VWAP anchored at the sweep extreme | 156, +0.06R, +1,676, 1.1 | 523, -0.02R, +4,815, 1.08 | 28, +0.24R, +2,617, 2.01 | 61, +0.44R, +17,494, 4.16 | yes: present is strong |
| `vwap_sweep2`: The sweep extreme reached the 2-SD band of the 18:00 VWAP (stretched raid) | 268, +0.05R, +8,066, 1.3 | 411, -0.04R, -1,576, 0.97 | 20, +0.47R, +2,603, 5.6 | 69, +0.35R, +17,508, 3.32 | yes: present is strong |
| `vwap_leg`: Entry back beyond the VWAP anchored at the start of the sweep leg (leg's average price reclaimed) | 292, +0.04R, +4,658, 1.18 | 387, -0.04R, +1,832, 1.04 | 26, +0.30R, +2,887, 2.23 | 63, +0.41R, +17,224, 3.99 | yes: present is strong |
| `vp_sweep_out`: The sweep ran outside yesterday's value area (long: below VAL; short: above VAH) | 388, -0.01R, -3,616, 0.92 | 291, +0.01R, +10,107, 1.33 | 42, +0.64R, +12,516, 4.85 | 47, +0.14R, +7,595, 2.56 | no |
| `vp_fail_auction`: Failed auction: swept outside yesterday's value and the trigger closed back inside it | 90, -0.03R, -629, 0.93 | 589, +0.00R, +7,120, 1.11 | 7, +0.92R, +2,744, 20.12 | 82, +0.33R, +17,367, 3.18 | no |
| `vp_in_value`: Entry inside yesterday's value area (VAL..VAH) | 229, -0.04R, +5,366, 1.24 | 450, +0.02R, +1,125, 1.02 | 21, +0.53R, +7,388, 6.07 | 68, +0.33R, +12,723, 2.91 | no |
| `vp_open_in`: Day opened (09:30) inside yesterday's value area (balance day) | 264, -0.01R, +7,801, 1.31 | 415, +0.00R, -1,310, 0.97 | 27, +0.64R, +6,919, 4.67 | 62, +0.26R, +13,192, 3.12 | no |
| `vp_open_with`: Day opened outside value in the trade's direction (long after an open above VAH) | 195, +0.02R, +1,483, 1.06 | 484, -0.01R, +5,007, 1.1 | 34, +0.23R, +7,337, 3.15 | 55, +0.47R, +12,774, 3.71 | no |
| `vp_open_against`: Day opened outside value against the trade (long after an open below VAL: back toward value) | 220, -0.01R, -2,793, 0.9 | 459, -0.00R, +9,284, 1.19 | 28, +0.30R, +5,855, 3.08 | 61, +0.41R, +14,256, 3.69 | no |
| `vp_poc_side`: Entry on the value side of yesterday's POC (long below it, short above it) | 424, -0.01R, +721, 1.01 | 255, +0.01R, +5,770, 1.21 | 47, +0.44R, +11,127, 3.66 | 42, +0.30R, +8,984, 3.29 | no |
| `vp_sweep_level5`: The sweep extreme was within 5 pts of a volume level (yesterday's POC/VAH/VAL or a naked POC) | 45, -0.36R, -5,933, 0.36 | 634, +0.02R, +12,424, 1.19 | 6, +1.31R, +5,266, 18.91 | 83, +0.31R, +14,845, 2.9 | yes: absent is strong |
| `vp_target_level5`: The target sits within 5 pts of a volume level (yesterday's POC/VAH/VAL or a naked POC) | 50, +0.20R, +4,166, 1.95 | 629, -0.02R, +2,325, 1.03 | 6, -0.07R, -134, 0.57 | 83, +0.41R, +20,245, 3.59 | yes: present is strong |
| `vp_naked_between`: A naked POC lies between the entry and the target (a magnet on the way) | 34, +0.17R, +672, 1.23 | 645, -0.01R, +5,818, 1.08 | 0 | 89, +0.38R, +20,111, 3.48 | yes: present is strong |
| `vp_poc_between`: Yesterday's POC lies between the entry and the target (a high-volume shelf on the way) | 256, +0.05R, +9,072, 1.36 | 423, -0.04R, -2,581, 0.95 | 21, +0.34R, +3,220, 2.79 | 68, +0.39R, +16,892, 3.67 | yes: present is strong |
| `vp_thin_path`: Thin path: the last 5 sessions traded little volume between entry and target (< 0.7x median) | 221, -0.06R, -6,185, 0.78 | 458, +0.03R, +12,676, 1.27 | 27, +0.30R, +6,156, 5.02 | 62, +0.41R, +13,955, 3.12 | yes: absent is strong |
| `vp_week_sweep_out`: The sweep ran outside last week's value area | 323, -0.00R, -2,882, 0.92 | 356, -0.00R, +9,373, 1.23 | 47, +0.29R, +10,845, 3.59 | 42, +0.47R, +9,266, 3.36 | no |
| `vp_dev_poc_side`: Entry on the value side of today's developing POC (from 18:00) | 418, +0.03R, +6,739, 1.13 | 261, -0.05R, -249, 0.99 | 63, +0.54R, +19,394, 4.45 | 26, -0.02R, +717, 1.29 | yes: present is strong |

None of the 12 chosen differences is statistically clear. Shuffling the labels (permutation test) gives p = 0.05 to 0.62, with 24 ideas tried. The smallest, "the sweep extreme was at a volume level" (p = 0.048 on 45 trades, -0.36R), flips sign in 2026 (6 trades, +1.31R).

## Sized versions against the live strategy

All of them still take every setup, except the one skip row. The live strategy row comes first.

**2026 (Jan 2 - Oct 16)**

| 2026 | Status | Trades/wk (% weeks 2+) | PF | Net $ | Max DD $ | Eval pass / fail % in 2 wks | in 1 month | Passes slower than 3 wks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Live strategy (baseline) | baseline | 2.16 (71%) | 3.48 | +20,111 | -2,661 | 19.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vwap_side_up` 1.25x size when entry on the value side of the 09:30 VWAP | rejected | 2.16 (71%) | 3.56 | +22,781 | -2,979 | 21.4 / 0.0 | 34.0 / 0.0 | 53.8% |
| `vwap_side_half` Half size when entry on the expensive side of the 09:30 VWAP | rejected | 2.16 (71%) | 3.44 | +16,888 | -2,570 | 15.5 / 0.0 | 32.0 / 0.0 | 60.2% |
| `vp_open_in_half` Half size when the day opened inside yesterday's value | rejected | 2.16 (71%) | 3.22 | +16,238 | -2,336 | 17.5 / 0.0 | 32.0 / 0.0 | 55.2% |
| `vwap_sweep2_half` Half size when the sweep stayed inside the 2-SD band of the 18:00 VWAP | rejected | 2.16 (71%) | 3.46 | +10,810 | -1,624 | 4.9 / 0.0 | 17.5 / 0.0 | 79.0% |
| `vwap_sweep2_up` 1.25x size when the sweep stretched to the 2-SD band of the 18:00 VWAP | rejected | 2.16 (71%) | 3.47 | +20,098 | -2,663 | 19.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vwap_deep1_half` Half size when entry more than 1 SD on the value side of the 18:00 VWAP | rejected | 2.16 (71%) | 2.71 | +11,924 | -2,018 | 4.9 / 0.0 | 14.6 / 0.0 | 81.8% |
| `vp_dev_poc_side_half` Half size when entry on the expensive side of today's developing POC | rejected | 2.16 (71%) | 3.78 | +19,491 | -2,497 | 18.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vp_dev_poc_side_up` 1.25x size when entry on the value side of today's developing POC | rejected | 2.16 (71%) | 3.64 | +23,677 | -2,978 | 21.4 / 0.0 | 34.0 / 0.0 | 53.8% |
| `vp_poc_between_up` 1.25x size when yesterday's POC lies between entry and target | rejected | 2.16 (71%) | 3.44 | +20,406 | -2,707 | 21.8 / 0.0 | 35.0 / 0.0 | 52.3% |
| `vp_thin_path_half` Half size when little volume traded between entry and target (thin path) | rejected | 2.16 (71%) | 3.22 | +16,796 | -2,530 | 14.1 / 0.0 | 25.2 / 0.0 | 65.6% |
| `vp_thin_path10_half` Half size when little volume traded between entry and target (thin path) (neighbour: 1 x median instead of 0.7 x median) | rejected | 2.16 (71%) | 3.27 | +16,058 | -2,386 | 11.2 / 0.0 | 24.8 / 0.0 | 69.2% |
| `vp_sweep_level5_half` Half size when the sweep extreme was within 5 pts of a volume level | rejected | 2.16 (71%) | 3.18 | +17,452 | -2,661 | 14.6 / 0.0 | 23.3 / 0.0 | 58.7% |
| `vp_target_level5_up` 1.25x size when the target sits within 5 pts of a volume level | rejected | 2.16 (71%) | 3.47 | +20,098 | -2,661 | 19.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vp_thin_path_cold` Cold streak: full size again when the path to the target runs through traded volume | rejected | 2.16 (71%) | 3.28 | +21,061 | -3,778 | 23.8 / 0.0 | 39.8 / 1.0 | 47.1% |
| `vp_thin_path_skip` Skip when little volume traded between entry and target (thin path) | info | 1.5 (48%) | 3.12 | +13,955 | -2,289 | 11.7 / 0.0 | 21.4 / 0.0 | 67.9% |

**2021-25 (5 years)**

| 2021-25 | Status | Trades/wk (% weeks 2+) | PF | Net $ | Max DD $ | Eval pass / fail % in 2 wks | in 1 month | Passes slower than 3 wks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Live strategy (baseline) | baseline | 3.17 (92%) | 1.09 | +6,491 | -11,401 | 4.1 / 2.1 | 8.7 / 9.4 | 70.5% |
| `vwap_side_up` 1.25x size when entry on the value side of the 09:30 VWAP | rejected | 3.17 (92%) | 1.06 | +4,810 | -12,645 | 4.2 / 3.4 | 7.9 / 13.9 | 67.8% |
| `vwap_side_half` Half size when entry on the expensive side of the 09:30 VWAP | rejected | 3.17 (92%) | 1.07 | +4,084 | -8,755 | 3.7 / 0.7 | 7.6 / 5.3 | 74.6% |
| `vp_open_in_half` Half size when the day opened inside yesterday's value | rejected | 3.17 (92%) | 1.03 | +1,717 | -10,231 | 3.4 / 1.3 | 6.8 / 3.8 | 70.7% |
| `vwap_sweep2_half` Half size when the sweep stayed inside the 2-SD band of the 18:00 VWAP | rejected | 3.17 (92%) | 1.14 | +7,207 | -7,949 | 2.9 / 0.1 | 7.1 / 1.6 | 81.3% |
| `vwap_sweep2_up` 1.25x size when the sweep stretched to the 2-SD band of the 18:00 VWAP | rejected | 3.17 (92%) | 1.08 | +6,529 | -12,453 | 4.2 / 3.3 | 8.6 / 11.9 | 68.5% |
| `vwap_deep1_half` Half size when entry more than 1 SD on the value side of the 18:00 VWAP | rejected | 3.17 (92%) | 1.14 | +8,270 | -7,447 | 2.2 / 0.3 | 5.6 / 1.8 | 79.8% |
| `vp_dev_poc_side_half` Half size when entry on the expensive side of today's developing POC | rejected | 3.17 (92%) | 1.09 | +5,915 | -9,362 | 3.6 / 1.1 | 7.2 / 4.7 | 75.9% |
| `vp_dev_poc_side_up` 1.25x size when entry on the value side of today's developing POC | rejected | 3.17 (92%) | 1.06 | +5,183 | -12,785 | 4.4 / 3.3 | 9.0 / 13.4 | 68.9% |
| `vp_poc_between_up` 1.25x size when yesterday's POC lies between entry and target | rejected | 3.17 (92%) | 1.1 | +7,891 | -12,036 | 4.2 / 2.6 | 8.6 / 10.9 | 70.0% |
| `vp_thin_path_half` Half size when little volume traded between entry and target (thin path) | rejected | 3.17 (92%) | 1.14 | +8,972 | -9,662 | 4.0 / 0.5 | 8.7 / 1.9 | 77.2% |
| `vp_thin_path10_half` Half size when little volume traded between entry and target (thin path) (neighbour: 1 x median instead of 0.7 x median) | rejected | 3.17 (92%) | 1.23 | +12,718 | -8,933 | 4.0 / 0.5 | 9.0 / 1.7 | 78.5% |
| `vp_sweep_level5_half` Half size when the sweep extreme was within 5 pts of a volume level | rejected | 3.17 (92%) | 1.13 | +9,237 | -9,693 | 4.1 / 1.7 | 8.5 / 7.3 | 73.4% |
| `vp_target_level5_up` 1.25x size when the target sits within 5 pts of a volume level | rejected | 3.17 (92%) | 1.09 | +7,021 | -11,541 | 4.1 / 2.1 | 8.5 / 9.6 | 70.2% |
| `vp_thin_path_cold` Cold streak: full size again when the path to the target runs through traded volume | rejected | 3.17 (92%) | 1.01 | +1,123 | -14,380 | 4.1 / 4.1 | 8.6 / 21.2 | 67.2% |
| `vp_thin_path_skip` Skip when little volume traded between entry and target (thin path) | info | 2.14 (70%) | 1.27 | +12,676 | -8,460 | 4.0 / 0.0 | 8.6 / 1.5 | 73.7% |

What the table says:
- **x0.5 on the weak side** (30 runs) shrinks the 2021-25 drawdown in 30 of 30 and the 1-month eval fail rate in 30. It lifts 2021-25 PF in 15. It costs 2026 profit in 30 of 30, by $620 to $11,112. That is less risk, not an edge: halving almost any large group of trades does the same.
- **x1.25 on the strong side** (15 runs) usually adds a few hundred to a few thousand dollars. That is because it puts more money on a strategy that makes money overall. PF rises in both periods in 1 of them (the balance-day rule below), and the 2021-25 drawdown grows in 14 of 15.
- **The old VWAP-side conviction** (`vwap_side_up`) is better in 2026 but worse in 2021-25. Over 5 years, value-side entries are not better trades.
- **"Thin path"** (little traded volume between entry and target) is the clearest 2021-25 effect. Halving those trades lifts 2021-25 PF from 1.09 to 1.14-1.23 at every threshold tried (0.6x to 1.0x the median volume). 2026 says the opposite: thin-path trades did fine there (PF 5.0), and halving them costs about $3-4k.
- **Skipping** is not an option. It drops 2026 below 2 trades a week for every idea but one. Skipping sweeps that end at a volume level keeps 2.0 a week, but 2026 PF falls from 3.48 to 2.90.

## The one raw pass: bigger size on balance days

AMT says a day that opens inside yesterday's value area is a balance day: price tends to rotate, so fading the edges works. That is exactly what a sweep-and-reverse setup does. The engine already prints this note at 09:30. The earlier confluence lab found the opposite on short 2025-26 test beds (`vp_open_in_half` re-checks that claim: worse in both periods, so it does not hold).

Sizing balance-day trades 1.25x (`vp_balance_up`) beats the live strategy in both periods, but only by a hair:

**2026**

| 2026 | Status | Trades/wk (% weeks 2+) | PF | Net $ | Max DD $ | Eval pass / fail % in 2 wks | in 1 month | Passes slower than 3 wks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Live strategy (baseline) | baseline | 2.16 (71%) | 3.48 | +20,111 | -2,661 | 19.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vp_balance_up` 1.25x size when the day opened inside yesterday's value | rejected | 2.16 (71%) | 3.5 | +21,053 | -2,771 | 22.3 / 0.0 | 38.3 / 0.0 | 47.7% |
| `vp_balance_up110` 1.1x size when the day opened inside yesterday's value | rejected | 2.16 (71%) | 3.51 | +20,414 | -2,685 | 19.4 / 0.0 | 33.0 / 0.0 | 55.4% |
| `vp_balance_up150` 1.5x size when the day opened inside yesterday's value | rejected | 2.16 (71%) | 3.62 | +23,185 | -2,984 | 22.3 / 0.0 | 34.5 / 0.0 | 50.0% |
| `vp_balance_va60_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 60% value area) | rejected | 2.16 (71%) | 3.42 | +20,165 | -2,771 | 20.4 / 0.0 | 34.5 / 0.0 | 53.8% |
| `vp_balance_va70_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 70% value area) | rejected | 2.16 (71%) | 3.41 | +20,260 | -2,771 | 20.4 / 0.0 | 34.5 / 0.0 | 53.8% |
| `vp_balance_va80_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 80% value area) | rejected | 2.16 (71%) | 3.41 | +20,544 | -2,876 | 21.8 / 0.0 | 38.3 / 0.0 | 47.7% |
| `vp_balance_half` Half size when the day opened outside yesterday's value | rejected | 2.16 (71%) | 3.51 | +12,914 | -1,928 | 6.3 / 0.0 | 17.5 / 0.0 | 73.1% |
| `vp_balance_cold` Cold streak: full size again when the day opened inside yesterday's value | rejected | 2.16 (71%) | 3.23 | +19,599 | -3,173 | 19.4 / 0.0 | 33.0 / 1.0 | 55.4% |

**2021-25**

| 2021-25 | Status | Trades/wk (% weeks 2+) | PF | Net $ | Max DD $ | Eval pass / fail % in 2 wks | in 1 month | Passes slower than 3 wks |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Live strategy (baseline) | baseline | 3.17 (92%) | 1.09 | +6,491 | -11,401 | 4.1 / 2.1 | 8.7 / 9.4 | 70.5% |
| `vp_balance_up` 1.25x size when the day opened inside yesterday's value | rejected | 3.17 (92%) | 1.1 | +7,799 | -11,654 | 4.2 / 3.3 | 8.8 / 11.0 | 68.9% |
| `vp_balance_up110` 1.1x size when the day opened inside yesterday's value | rejected | 3.17 (92%) | 1.1 | +7,302 | -11,286 | 4.1 / 2.4 | 8.8 / 9.7 | 69.8% |
| `vp_balance_up150` 1.5x size when the day opened inside yesterday's value | rejected | 3.17 (92%) | 1.1 | +8,966 | -12,593 | 4.8 / 5.1 | 9.6 / 15.2 | 68.7% |
| `vp_balance_va60_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 60% value area) | rejected | 3.17 (92%) | 1.08 | +6,496 | -11,650 | 4.2 / 2.6 | 8.8 / 10.6 | 70.0% |
| `vp_balance_va70_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 70% value area) | rejected | 3.17 (92%) | 1.1 | +7,543 | -11,763 | 4.2 / 3.3 | 8.8 / 11.0 | 68.9% |
| `vp_balance_va80_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 80% value area) | rejected | 3.17 (92%) | 1.09 | +6,941 | -12,031 | 4.2 / 3.5 | 8.8 / 11.2 | 68.9% |
| `vp_balance_half` Half size when the day opened outside yesterday's value | rejected | 3.17 (92%) | 1.14 | +7,214 | -6,473 | 1.4 / 0.2 | 4.8 / 1.2 | 83.6% |
| `vp_balance_cold` Cold streak: full size again when the day opened inside yesterday's value | rejected | 3.17 (92%) | 1.04 | +3,250 | -12,311 | 4.1 / 2.6 | 9.0 / 16.0 | 67.3% |

Why it is not adopted:
- **Neighbours fail.** With our own tick profile and a 60%, 70% or 80% value area, 2026 PF drops below the baseline (3.41-3.42 vs 3.48). The pass depends on the 15 trades where the engine's 5-point bins and our tick profile disagree about the open location.
- **One year carries it.** Change vs the live strategy by year: 2022 +$95, 2023 +$2,082, 2024 -$550, 2025 -$910, 2026 +$942. The two most recent full years got worse.
- **Not free.** Max drawdown is bigger in both periods (-2,661 -> -2,771 in 2026, -11,401 -> -11,654 in 2021-25). The 1-month eval fail rate in 2021-25 rises from 9.4% to 11.0%. 2026 evals do improve (1-month pass 33.0% -> 38.3%), but that is the year that was seen.
- **Luck check, mixed.**
  - At 1.25x, random groups of 38% of the trades beat the live strategy in both periods 11 times in 200 (5.5%). 18 "x1.25" rules were tried here, so about one chance pass is expected, and there was one.
  - At 1.5x, random groups pass 17 times in 200.
  - At 1.1x, no random group passed (0/200) while the balance-day group did. That is the one point in its favour. But a 10% size change only moves trades with 10+ micros (stops under about 28 points), and the 1.1x version still loses money in 2024 and 2025.
- **The R numbers don't back it.** Per trade, balance-day trades were no better in 2021-25 (-0.01R vs +0.00R). The dollar gap comes from tight-stop trades (stops of 30 points or less: +0.22R vs -0.14R), while wide-stop trades went the other way (-0.09R vs +0.05R). 2026 shows a different pattern. A split that changes shape between periods is not a rule to trade.

## Why VWAP and the volume profile add so little here

- **The setups already use the same information.** Liquidity pools are where orders rest: prior-day and prior-week
  highs and lows, overnight, London and Asia ranges, and equal highs and lows. The confluence score already checks
  discount/premium of the 1H range, which is a version of "value side". VWAP side and open location mostly answer
  "is today trending against the trade?". The 1H trend score and the cold-streak filter already react to that.
- **The money sits in a few trades.** 19 trades with stops of 30 points or less made about $19.1k of 2026's $20.1k.
  Any rule that changes the size of a third of the trades moves 2026 by thousands of dollars through luck alone. That is
  why x0.5 rules look like "less profit" in 2026 and x1.25 rules look like "more profit", whatever the idea is.
- **The profile is an approximation.** It is built from 5-minute candles. Levels such as the POC are only accurate to
  a few points, which matters most for "the sweep hit a volume level"-type ideas.
- **The earlier results agree.** The confluence lab (2026-10-16, short test beds) and the learning cycles found the same
  kind of sign-flipping. "Value side of VWAP" was "active" in one cycle and "probation" in the next. No AMT feature
  survived the multiple-testing check.

## Next steps

1. **Volume levels as targets, not filters.** In 2021-25, trades whose target sat within 5 points of a volume level
   (yesterday's POC, VAH or VAL, or a naked POC) did +0.22R better per trade (50 trades, 4 of 4 years agree). There
   were only 6 such trades in 2026. The engine already has `amt_targets`, which adds yesterday's POC/VAH/VAL as target
   candidates. It was cut under the old settings and has not been tested on today's. It needs one engine replay judged
   the usual way (2026 and 2021-25, 2-4 trades a week). That belongs to the targets work, so it is not run here.
2. **Keep the tags, re-test later.** Open location (`open_loc`) and VWAP side (in the trade checklist) are already
   recorded on every trade. Re-test balance-day sizing when 2027 gives a truly new year, rather than trimming it further
   on the same data.
3. **A better profile.** If 1-minute data for 2021-25 ever becomes available, rebuild the profile from 1-minute candles
   and re-run `python tools/research_vp.py all`.

## How hard it would be to add (if a rule is ever adopted)

- **Engine (`engine/model.py`):**
  - Easy for the 09:30 VWAP side and the open location. Both already exist (`vwap_disc`, `open_loc` and the prior
    regular-hours profile `prof`). A size multiplier is about 5 lines in the sizing step plus one `live_model.json` key
    that defaults to off.
  - About 40-60 new lines for the 18:00 VWAP bands, the developing POC, naked POCs and the "thin path" measure.
- **TradingView Pine (`tradingview/liquidity_engine.pine`):**
  - VWAP side is trivial (`ta.vwap`, or an anchored VWAP).
  - Open location vs yesterday's value needs a volume profile built bar by bar in Pine arrays: about 60-80 lines,
    medium effort. It will differ slightly from the Python profile; the 5-point rows keep the differences small.
  - The Pine port still lacks the cold-streak filter and the new size/target rules, which come first.

## Every run

76 runs, all post-hoc on the live replay, saved in `research/runs/` with the prefix `vwap_` or `vp_`: info 16, rejected 60. Reproduce everything with `python tools/research_vp.py all` (about 10 minutes, no engine replay).

| Run | Status | 2026 PF / net $ | 2021-25 PF / net $ |
|---|---|---:|---:|
| `vp_balance_cold` Cold streak: full size again when the day opened inside yesterday's value | rejected | 3.23 / +19,599 | 1.04 / +3,250 |
| `vp_balance_half` Half size when the day opened outside yesterday's value | rejected | 3.51 / +12,914 | 1.14 / +7,214 |
| `vp_balance_skip` Skip when the day opened outside yesterday's value | info | 4.67 / +6,919 | 1.31 / +7,801 |
| `vp_balance_up` 1.25x size when the day opened inside yesterday's value | rejected | 3.5 / +21,053 | 1.1 / +7,799 |
| `vp_balance_up110` 1.1x size when the day opened inside yesterday's value | rejected | 3.51 / +20,414 | 1.1 / +7,302 |
| `vp_balance_up150` 1.5x size when the day opened inside yesterday's value | rejected | 3.62 / +23,185 | 1.1 / +8,966 |
| `vp_balance_va60_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 60% value area) | rejected | 3.42 / +20,165 | 1.08 / +6,496 |
| `vp_balance_va70_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 70% value area) | rejected | 3.41 / +20,260 | 1.1 / +7,543 |
| `vp_balance_va80_up` 1.25x size when the day opened inside yesterday's value (neighbour: own tick profile, 80% value area) | rejected | 3.41 / +20,544 | 1.09 / +6,941 |
| `vp_dev_poc_side_cold` Cold streak: full size again when entry on the value side of today's developing POC | rejected | 3.3 / +21,104 | 1.02 / +2,160 |
| `vp_dev_poc_side_half` Half size when entry on the expensive side of today's developing POC | rejected | 3.78 / +19,491 | 1.09 / +5,915 |
| `vp_dev_poc_side_skip` Skip when entry on the expensive side of today's developing POC | info | 4.45 / +19,394 | 1.13 / +6,739 |
| `vp_dev_poc_side_up` 1.25x size when entry on the value side of today's developing POC | rejected | 3.64 / +23,677 | 1.06 / +5,183 |
| `vp_naked_between_cold` Cold streak: full size again when a naked POC lies between entry and target | info | 3.48 / +20,111 | 1.1 / +7,914 |
| `vp_naked_between_half` Half size when no naked POC between entry and target | rejected | 3.09 / +9,042 | 1.06 / +2,607 |
| `vp_naked_between_skip` Skip when no naked POC between entry and target | info | no trades | 1.23 / +672 |
| `vp_naked_between_up` 1.25x size when a naked POC lies between entry and target | info | 3.48 / +20,111 | 1.09 / +6,605 |
| `vp_open_in_half` Half size when the day opened inside yesterday's value | rejected | 3.22 / +16,238 | 1.03 / +1,717 |
| `vp_open_in_up` 1.25x size when the day opened outside yesterday's value | rejected | 3.55 / +22,847 | 1.06 / +4,744 |
| `vp_poc_between_cold` Cold streak: full size again when yesterday's POC lies between entry and target | rejected | 3.3 / +19,679 | 1.07 / +5,842 |
| `vp_poc_between_half` Half size when yesterday's POC is not between entry and target | rejected | 3.17 / +11,157 | 1.15 / +7,857 |
| `vp_poc_between_skip` Skip when yesterday's POC is not between entry and target | info | 2.79 / +3,220 | 1.36 / +9,072 |
| `vp_poc_between_up` 1.25x size when yesterday's POC lies between entry and target | rejected | 3.44 / +20,406 | 1.1 / +7,891 |
| `vp_sweep_level3_half` Half size when the sweep extreme was within 5 pts of a volume level (neighbour: 3 pts instead of 5 pts) | rejected | 3.16 / +17,537 | 1.11 / +8,242 |
| `vp_sweep_level5_cold` Cold streak: full size again when the sweep extreme was not at a volume level | rejected | 3.09 / +20,576 | 1.0 / -27 |
| `vp_sweep_level5_half` Half size when the sweep extreme was within 5 pts of a volume level | rejected | 3.18 / +17,452 | 1.13 / +9,237 |
| `vp_sweep_level5_skip` Skip when the sweep extreme was within 5 pts of a volume level | info | 2.9 / +14,845 | 1.19 / +12,424 |
| `vp_sweep_level5_up` 1.25x size when the sweep extreme was not at a volume level | rejected | 3.45 / +22,674 | 1.09 / +7,525 |
| `vp_sweep_level8_half` Half size when the sweep extreme was within 5 pts of a volume level (neighbour: 8 pts instead of 5 pts) | rejected | 3.29 / +17,726 | 1.09 / +6,089 |
| `vp_target_level3_half` Half size when the target is not at a volume level (neighbour: 3 pts instead of 5 pts) | rejected | 3.06 / +8,999 | 1.05 / +2,089 |
| `vp_target_level5_cold` Cold streak: full size again when the target sits within 5 pts of a volume level | rejected | 3.38 / +19,868 | 1.1 / +7,529 |
| `vp_target_level5_half` Half size when the target is not at a volume level | rejected | 3.06 / +8,999 | 1.12 / +5,059 |
| `vp_target_level5_skip` Skip when the target is not at a volume level | info | 0.57 / -134 | 1.95 / +4,166 |
| `vp_target_level5_up` 1.25x size when the target sits within 5 pts of a volume level | rejected | 3.47 / +20,098 | 1.09 / +7,021 |
| `vp_target_level8_half` Half size when the target is not at a volume level (neighbour: 8 pts instead of 5 pts) | rejected | 3.06 / +8,999 | 1.13 / +5,423 |
| `vp_thin_path06_half` Half size when little volume traded between entry and target (thin path) (neighbour: 0.6 x median instead of 0.7 x median) | rejected | 3.22 / +16,796 | 1.14 / +9,200 |
| `vp_thin_path08_half` Half size when little volume traded between entry and target (thin path) (neighbour: 0.8 x median instead of 0.7 x median) | rejected | 3.21 / +16,279 | 1.17 / +10,275 |
| `vp_thin_path10_half` Half size when little volume traded between entry and target (thin path) (neighbour: 1 x median instead of 0.7 x median) | rejected | 3.27 / +16,058 | 1.23 / +12,718 |
| `vp_thin_path_cold` Cold streak: full size again when the path to the target runs through traded volume | rejected | 3.28 / +21,061 | 1.01 / +1,123 |
| `vp_thin_path_half` Half size when little volume traded between entry and target (thin path) | rejected | 3.22 / +16,796 | 1.14 / +8,972 |
| `vp_thin_path_skip` Skip when little volume traded between entry and target (thin path) | info | 3.12 / +13,955 | 1.27 / +12,676 |
| `vp_thin_path_up` 1.25x size when the path to the target runs through traded volume | rejected | 3.45 / +22,515 | 1.09 / +7,240 |
| `vwap_atr_deep15_half` Half size when entry not 2 ATR on the value side of the 09:30 VWAP (neighbour: 1.5 ATR instead of 2 ATR) | rejected | 4.35 / +16,607 | 1.09 / +4,093 |
| `vwap_atr_deep2_cold` Cold streak: full size again when entry 2+ ATR on the value side of the 09:30 VWAP | rejected | 3.35 / +19,810 | 1.07 / +5,849 |
| `vwap_atr_deep2_half` Half size when entry not 2 ATR on the value side of the 09:30 VWAP | rejected | 3.61 / +12,745 | 1.1 / +4,411 |
| `vwap_atr_deep2_skip` Skip when entry not 2 ATR on the value side of the 09:30 VWAP | info | 6.59 / +6,771 | 1.3 / +3,574 |
| `vwap_atr_deep2_up` 1.25x size when entry 2+ ATR on the value side of the 09:30 VWAP | rejected | 3.61 / +21,601 | 1.08 / +5,819 |
| `vwap_atr_deep3_half` Half size when entry not 2 ATR on the value side of the 09:30 VWAP (neighbour: 3 ATR instead of 2 ATR) | rejected | 3.29 / +10,881 | 1.04 / +1,761 |
| `vwap_deep05_half` Half size when entry more than 1 SD on the value side of the 18:00 VWAP (neighbour: 0.5 SD instead of 1 SD) | rejected | 2.9 / +12,030 | 1.09 / +4,846 |
| `vwap_deep15_half` Half size when entry more than 1 SD on the value side of the 18:00 VWAP (neighbour: 1.5 SD instead of 1 SD) | rejected | 2.89 / +14,935 | 1.08 / +5,550 |
| `vwap_deep1_cold` Cold streak: full size again when entry not deep on the value side of the 18:00 VWAP | rejected | 3.28 / +21,157 | 1.03 / +2,562 |
| `vwap_deep1_half` Half size when entry more than 1 SD on the value side of the 18:00 VWAP | rejected | 2.71 / +11,924 | 1.14 / +8,270 |
| `vwap_deep1_skip` Skip when entry more than 1 SD on the value side of the 18:00 VWAP | info | 1.87 / +4,949 | 1.22 / +9,614 |
| `vwap_deep1_up` 1.25x size when entry not deep on the value side of the 18:00 VWAP | rejected | 3.33 / +20,905 | 1.09 / +7,682 |
| `vwap_ext_late04_half` Half size when entry within 0.5R of the sweep-anchored VWAP (neighbour: 0.4 R instead of 0.5 R) | rejected | 2.91 / +11,260 | 1.08 / +4,393 |
| `vwap_ext_late06_half` Half size when entry within 0.5R of the sweep-anchored VWAP (neighbour: 0.6 R instead of 0.5 R) | rejected | 2.9 / +9,601 | 1.08 / +3,816 |
| `vwap_ext_late_cold` Cold streak: full size again when entry more than 0.5R past the sweep-anchored VWAP (late) | rejected | 3.3 / +20,091 | 1.07 / +5,910 |
| `vwap_ext_late_half` Half size when entry within 0.5R of the sweep-anchored VWAP | rejected | 3.02 / +10,934 | 1.08 / +3,855 |
| `vwap_ext_late_skip` Skip when entry within 0.5R of the sweep-anchored VWAP | info | 2.01 / +2,617 | 1.1 / +1,676 |
| `vwap_ext_late_up` 1.25x size when entry more than 0.5R past the sweep-anchored VWAP (late) | rejected | 3.4 / +20,244 | 1.08 / +6,266 |
| `vwap_leg_cold` Cold streak: full size again when entry back beyond the sweep leg's anchored VWAP | rejected | 3.31 / +20,106 | 1.05 / +4,405 |
| `vwap_leg_half` Half size when entry still short of the sweep leg's anchored VWAP | rejected | 3.07 / +10,973 | 1.1 / +5,196 |
| `vwap_leg_skip` Skip when entry still short of the sweep leg's anchored VWAP | info | 2.23 / +2,887 | 1.18 / +4,658 |
| `vwap_leg_up` 1.25x size when entry back beyond the sweep leg's anchored VWAP | rejected | 3.44 / +20,338 | 1.09 / +7,431 |
| `vwap_rth_band1_cold` Cold streak: full size again when entry more than 1 SD past the 09:30 VWAP (from 10:00) | rejected | 3.43 / +20,005 | 1.08 / +6,241 |
| `vwap_rth_band1_half` Half size when entry within 1 SD of the 09:30 VWAP (from 10:00) | rejected | 3.09 / +11,874 | 1.12 / +6,589 |
| `vwap_rth_band1_skip` Skip when entry within 1 SD of the 09:30 VWAP (from 10:00) | info | 2.43 / +4,403 | 1.24 / +8,014 |
| `vwap_rth_band1_up` 1.25x size when entry more than 1 SD past the 09:30 VWAP (from 10:00) | info | 3.48 / +20,111 | 1.08 / +6,252 |
| `vwap_side_half` Half size when entry on the expensive side of the 09:30 VWAP | rejected | 3.44 / +16,888 | 1.07 / +4,084 |
| `vwap_side_up` 1.25x size when entry on the value side of the 09:30 VWAP | rejected | 3.56 / +22,781 | 1.06 / +4,810 |
| `vwap_sweep15_half` Half size when the sweep stayed inside the 2-SD band of the 18:00 VWAP (neighbour: 1.5 SD instead of 2 SD) | rejected | 3.85 / +16,877 | 1.08 / +5,275 |
| `vwap_sweep25_half` Half size when the sweep stayed inside the 2-SD band of the 18:00 VWAP (neighbour: 2.5 SD instead of 2 SD) | rejected | 3.21 / +9,556 | 1.05 / +2,185 |
| `vwap_sweep2_cold` Cold streak: full size again when the sweep stretched to the 2-SD band of the 18:00 VWAP | rejected | 3.38 / +20,293 | 1.07 / +5,951 |
| `vwap_sweep2_half` Half size when the sweep stayed inside the 2-SD band of the 18:00 VWAP | rejected | 3.46 / +10,810 | 1.14 / +7,207 |
| `vwap_sweep2_skip` Skip when the sweep stayed inside the 2-SD band of the 18:00 VWAP | info | 5.6 / +2,603 | 1.3 / +8,066 |
| `vwap_sweep2_up` 1.25x size when the sweep stretched to the 2-SD band of the 18:00 VWAP | rejected | 3.47 / +20,098 | 1.08 / +6,529 |
