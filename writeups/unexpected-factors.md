## The question

Earlier studies tested the obvious things: the clock, the weekday, the calendar, the pool type, the stop size, EMAs,
VWAP, the daily bias. This one asks whether something less obvious, that the bot could know at the moment of entry,
separates the winning trades from the losing ones. Thirty-three conditions, each with a reason it *could* matter:

- **Volatility context** (yesterday's values only): VIX against its 20-day average, VIX change over 5 days, the VXN-VIX
  spread (how dear tech vol is vs the S&P), dealer gamma sign and 1-year percentile (SqueezeMetrics GEX), dark-pool
  buying (DIX).
- **The day's structure**: yesterday's range vs the 20-day ADR, the overnight range vs ADR, the 09:30 gap (size, and
  with or against the trade), the opening 15-minute range, whether yesterday was an inside day, 3+ closes in a row in
  the trade's direction, days since the last 2% day, last week's range vs the prior 4 weeks, where yesterday closed in
  its range, how much of the day's range was already used when the signal fired, the entry's distance from the 09:30
  open (on the trade's side or not).
- **The setup's micro-structure**: whether the sweep extreme was made before 09:30 (pre-market) or in the cash session,
  minutes from the sweep to the trigger, the size of the sweep bar and of the trigger candle vs the 5-minute ATR, the
  height of the IFVG / CISD zone, how many pools were swept at once, the distance to the target, how far into the
  killzone the entry is, the signal bar's volume vs the same clock bar over the prior 20 days, whether the swept pool
  was a prior-day / prior-week level.
- **The week's own history** (finished trades only): trades already taken this week, the last 10 trades' net R, whether
  the last trading day's trade won, days since the previous trade, month-to-date R.

Everything is on the exact live-loop replay of the locked strategy (768 trades, costs included), with the live sizing
(quarter size in cold streaks, half size on late entries). Nothing looks ahead: bars up to the signal bar, daily data
up to the previous session, and only trades that had finished before the entry.

## How it was judged

1. Each factor splits the 2021-25 trades in two (yes / no, or above / below the 2021-25 median), at least 60 trades on
   each side. The factors are ranked by the gap in average R between the two sides, **on 2021-25 only**.
2. 2026 is then shown untouched for every factor: same direction or not.
3. The top 8 are tested as size rules in both directions: half size on the worse side, and 1.25x on the better side.
4. Each size rule gets a fair control: the same multipliers on a **random group of trades of the same size**, 4,000
   times, in each period. If random groups do as well, the rule is leverage, not information.
5. The best factor gets a shuffle test: 5,000 random relabellings of the 2021-25 trades, once for that factor alone
   and once taking the biggest gap across all 33 factors each time (that is the honest number after 33 tries).

## The ranking (2021-25), with 2026 untouched

| # | Factor (split) | 2021-25 above/yes: n, avg R, PF | 2021-25 below/no: n, avg R, PF | Gap (R) | t | 2026 gap (n) | Same sign? |
|---:|---|---|---|---:|---:|---:|:--:|
| 1 | Sweep extreme made before 09:30 | 125, +0.159, 1.43 | 554, -0.022, 0.93 | +0.181 | 1.31 | +0.365 (21/68) | yes |
| 2 | Month-to-date R positive (split at 0.0) | 232, +0.105, 1.27 | 447, -0.037, 0.89 | +0.142 | 1.30 | +0.372 (46/43) | yes |
| 3 | Days since the previous trade (gap of 2+ days) (split at 1.0) | 324, +0.080, 1.09 | 354, -0.048, 0.96 | +0.128 | 1.27 | -0.303 (62/27) | no |
| 4 | Overnight range vs ADR (split at 0.593) | 339, +0.074, 1.13 | 340, -0.051, 0.92 | +0.125 | 1.24 | +0.345 (74/15) | yes |
| 5 | Minutes into the killzone at entry (split at 45.0) | 272, -0.056, 0.89 | 407, +0.057, 1.1 | -0.113 | -1.13 | +0.857 (36/53) | no |
| 6 | Size of the 09:30 gap vs ADR (split at 0.263) | 339, +0.063, 1.15 | 340, -0.039, 0.9 | +0.102 | 1.00 | +0.048 (49/40) | yes |
| 7 | VIX vs its 20-day average (split at 1.0) | 273, +0.070, 1.21 | 406, -0.027, 0.9 | +0.097 | 0.91 | +0.124 (34/55) | yes |
| 8 | Pools swept at once (1 vs 2+) (split at 1.0) | 469, +0.037, 1.01 | 210, -0.044, 1.03 | +0.081 | 0.76 | +0.085 (53/36) | yes |
| 9 | GEX percentile (1 year) (split at 0.628) | 338, +0.049, 1.14 | 341, -0.025, 0.91 | +0.074 | 0.73 | +0.245 (27/62) | yes |
| 10 | Signal-bar volume vs the same clock bar (20 days) (split at 1.0) | 317, -0.024, 0.82 | 362, +0.043, 1.18 | -0.067 | -0.66 | -0.501 (34/55) | yes |
| 11 | Opening 15-minute range vs ADR (split at 0.304) | 339, +0.044, 1.1 | 340, -0.021, 0.95 | +0.065 | 0.64 | +0.663 (61/28) | yes |
| 12 | Gap in the trade's direction | 297, +0.047, 1.17 | 382, -0.016, 0.92 | +0.063 | 0.62 | -0.173 (45/44) | no |
| 13 | DIX (dark-pool buying) above its median (split at 0.473) | 339, +0.043, 1.08 | 340, -0.020, 0.96 | +0.063 | 0.62 | +1.009 (17/72) | yes |
| 14 | Dealer gamma positive (SqueezeMetrics GEX) | 596, +0.019, 1.01 | 83, -0.041, 1.09 | +0.060 | 0.37 | -1.338 (85/4) | no |
| 15 | Yesterday was an inside day (split at 1.0) | 78, -0.039, 1.08 | 601, +0.018, 1.01 | -0.057 | -0.37 | +1.342 (4/85) | no |
| 16 | Days since the last 2% day (recent vs old) (split at 10.0) | 353, -0.013, 1.04 | 326, +0.038, 1.0 | -0.051 | -0.50 | +0.227 (50/39) | no |
| 17 | Equity slope: last 10 trades net positive (split at 0.0) | 297, +0.028, 1.03 | 372, -0.022, 0.96 | +0.050 | 0.49 | +0.675 (62/27) | yes |
| 18 | Size of the sweep bar vs 5m ATR (split at 1.238) | 339, +0.035, 1.07 | 340, -0.012, 0.97 | +0.047 | 0.46 | -0.271 (49/40) | no |
| 19 | Distance to target vs 5m ATR (split at 5.032) | 339, -0.011, 1.07 | 340, +0.034, 0.99 | -0.045 | -0.44 | -0.148 (40/49) | yes |
| 20 | VIX change over 5 days (split at 0.0) | 292, +0.036, 1.12 | 387, -0.006, 0.94 | +0.042 | 0.41 | +0.140 (39/50) | yes |
| 21 | Yesterday's range vs 20-day ADR (split at 0.917) | 339, +0.032, 1.1 | 340, -0.008, 0.95 | +0.040 | 0.39 | -0.059 (46/43) | no |
| 22 | VXN minus VIX (tech vol premium) (split at 4.25) | 339, +0.032, 1.01 | 340, -0.008, 1.03 | +0.040 | 0.39 | +0.153 (72/17) | yes |
| 23 | The last trading day's trade won | 142, -0.014, 1.04 | 536, +0.020, 1.01 | -0.034 | -0.26 | -0.073 (24/65) | yes |
| 24 | Trades already taken this week (split at 1.0) | 267, -0.008, 0.94 | 412, +0.024, 1.07 | -0.032 | -0.31 | +1.065 (19/70) | no |
| 25 | Minutes from the sweep to the trigger (split at 10.0) | 310, +0.029, 1.14 | 369, -0.002, 0.95 | +0.031 | 0.31 | -0.176 (40/49) | no |
| 26 | Entry on the trade's side of the 09:30 open (split at 0.0) | 266, -0.006, 0.85 | 413, +0.023, 1.12 | -0.029 | -0.29 | -0.242 (34/55) | yes |
| 27 | Range already travelled before the signal vs ADR (split at 0.444) | 339, -0.002, 0.97 | 340, +0.025, 1.06 | -0.027 | -0.27 | +0.294 (60/29) | no |
| 28 | 3+ closes in a row in the trade's direction | 334, +0.000, 1.09 | 345, +0.023, 0.95 | -0.023 | -0.23 | +0.113 (39/50) | no |
| 29 | IFVG / CISD zone height vs 5m ATR (split at 0.347) | 339, +0.002, 1.02 | 340, +0.022, 1.01 | -0.020 | -0.20 | -0.566 (32/57) | yes |
| 30 | Trigger candle size vs 5m ATR (split at 1.374) | 339, +0.019, 1.08 | 340, +0.005, 0.96 | +0.014 | 0.14 | -0.586 (35/54) | no |
| 31 | Swept pool is a prior-day / prior-week level (split at 1.0) | 101, +0.015, 1.07 | 578, +0.011, 1.01 | +0.004 | 0.03 | -0.142 (11/78) | no |
| 32 | Last week's range vs the prior 4 weeks (split at 0.929) | 338, +0.013, 1.05 | 341, +0.010, 0.99 | +0.003 | 0.03 | +0.123 (49/40) | yes |
| 33 | Where yesterday closed in its range (split at 0.617) | 339, +0.012, 1.01 | 340, +0.011, 1.02 | +0.001 | 0.01 | +0.209 (45/44) | yes |

How to read it: a t of about 2 is the usual bar for "probably not luck" on a single test. **The best of 33 factors reaches
1.31.** With 33 tries you expect the best to land around there by chance alone. The 2026 column is on 89 trades, so a
gap of ±0.3R there is one or two trades.

**Shuffle test for the #1 factor (pre-market sweep):** the observed gap is +0.181R. Relabelling the 2021-25 trades at
random (same group sizes) produces a gap at least that big **16% of the time** for this one factor, and **95% of the
time** when the biggest gap across all 33 factors is taken on each shuffle. In plain words: a ranking like this would look
the same if the factors were made up.

What the pre-market sweeps actually are, for the record: 146 trades over 5 years where the swept extreme was made between
08:00 and 09:30 and the trigger came later, typically 15 minutes into a killzone (median) and almost half of them in the
afternoon (median 175 minutes from sweep to trigger). By year: 2021 +1.59R vs +0.18R on 3 trades, 2022 +0.18 vs -0.20,
2023 +0.07 vs +0.08, 2024 +0.02 vs +0.04, 2025 +0.29 vs -0.07, 2026 +0.69 vs +0.32. Two flat years out of six, and 2022
carries most of the 2021-25 gap.

## The top 8 as size rules (exact replays, costs included)

Half size on the worse side, or 1.25x on the better side. "Random group as good" is the share of 4,000 random groups of
the same size that add at least as much net as the rule, in both periods at once (and in each period alone).

| Rule | 2026 net | 2026 PF | 2026 max DD | 2026 eval 2w pass/fail | 2021-25 net | 2021-25 PF | 2021-25 max DD | 2021-25 eval 1m pass/fail | Random group as good (both periods) | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Baseline (locked strategy) | +20,487 ($2,088/mo) | 3.94 | -2,249 | 20.4% / 0.0% | +16,379 ($321/mo) | 1.27 | -9,265 | 8.8% / 5.2% | – | baseline |
| Flat 1.25x on every trade (reference) | +24,282 ($2,475/mo) | 4.13 | -2,767 | 22.8% / 0.0% | +18,350 ($359/mo) | 1.27 | -10,452 | 11.3% / 10.8% | – | reference |
| Half size, sweep made in the cash session (wild_sweep_premarket_half) | +13,866 ($1,413/mo) | 4.35 | -1,519 | 5.8% / 0.0% | +12,480 ($244/mo) | 1.33 | -5,046 | 4.3% / 1.5% | 0.6% (2021-25 alone 4%, 2026 alone 17%) | rejected |
| 1.25x, sweep made pre-market (wild_sweep_premarket_x125) | +22,223 ($2,265/mo) | 4.17 | -2,274 | 22.3% / 0.0% | +17,472 ($342/mo) | 1.28 | -9,228 | 9.1% / 6.2% | 0.6% (2021-25 alone 4%, 2026 alone 17%) | promising |
| Half size when month-to-date R is negative (wild_mtd_r_half) | +16,803 ($1,713/mo) | 3.6 | -1,930 | 11.2% / 0.0% | +14,385 ($282/mo) | 1.29 | -7,835 | 7.5% / 1.2% | 1.3% (2021-25 alone 5%, 2026 alone 26%) | rejected |
| 1.25x when month-to-date R is positive (wild_mtd_r_x125) | +22,766 ($2,321/mo) | 3.96 | -2,718 | 22.3% / 0.0% | +17,087 ($335/mo) | 1.26 | -10,222 | 9.9% / 8.1% | 1.3% (2021-25 alone 5%, 2026 alone 26%) | promising |
| Half size the day after a trade (wild_days_since_trade_half) | +16,363 ($1,668/mo) | 3.69 | -2,148 | 14.6% / 0.0% | +11,732 ($230/mo) | 1.25 | -6,230 | 4.8% / 1.3% | 22% (36%, 61%) | rejected |
| 1.25x after 2+ days without a trade (wild_days_since_trade_x125) | +23,170 ($2,362/mo) | 4.09 | -2,542 | 21.8% / 0.0% | +17,778 ($348/mo) | 1.28 | -9,607 | 9.5% / 6.2% | 22% (36%, 61%) | promising |
| Half size on a quiet overnight (wild_on_share_half) | +20,674 ($2,108/mo) | 4.3 | -1,839 | 20.4% / 0.0% | +12,669 ($248/mo) | 1.28 | -6,143 | 3.8% / 1.4% | 3.3% (28%, 11%) | promising |
| 1.25x on a wide overnight (wild_on_share_x125) | +24,463 ($2,494/mo) | 4.23 | -2,617 | 22.8% / 0.0% | +17,919 ($351/mo) | 1.28 | -9,620 | 11.3% / 7.0% | 3.3% (28%, 11%) | promising |
| Half size after 45 min into the killzone (wild_kz_minutes_half) | +10,910 ($1,112/mo) | 2.77 | -2,566 | 2.9% / 0.0% | +12,858 ($252/mo) | 1.25 | -7,746 | 6.2% / 2.9% | 38% (39%, 99%) | rejected |
| 1.25x in the first 45 min of the killzone (wild_kz_minutes_x125) | +20,606 ($2,101/mo) | 3.73 | -2,680 | 21.8% / 0.0% | +18,312 ($359/mo) | 1.28 | -10,205 | 10.8% / 7.6% | 38% (39%, 99%) | promising |
| Half size on a small gap (wild_gap_abs_adr_half) | +16,879 ($1,721/mo) | 4.13 | -1,842 | 18.4% / 0.0% | +13,178 ($258/mo) | 1.28 | -6,477 | 5.6% / 1.2% | 4.7% (21%, 22%) | rejected |
| 1.25x on a big gap (wild_gap_abs_adr_x125) | +23,556 ($2,401/mo) | 4.2 | -2,530 | 22.3% / 0.0% | +17,562 ($344/mo) | 1.27 | -9,500 | 9.6% / 6.8% | 4.7% (21%, 22%) | promising |
| Half size when VIX is below its 20-day mean (wild_vix_vs_20d_half) | +15,641 ($1,595/mo) | 3.99 | -1,559 | 11.2% / 0.0% | +11,073 ($217/mo) | 1.25 | -5,003 | 3.8% / 0.0% | 6.9% (40%, 16%) | rejected |
| 1.25x when VIX is above its 20-day mean (wild_vix_vs_20d_x125) | +23,128 ($2,358/mo) | 4.19 | -2,355 | 22.3% / 0.0% | +17,093 ($335/mo) | 1.27 | -9,430 | 10.0% / 7.5% | 6.9% (40%, 16%) | promising |
| Half size on a single-pool sweep (wild_n_pools_half) | +16,300 ($1,662/mo) | 4.02 | -2,087 | 15.5% / 0.0% | +13,465 ($264/mo) | 1.25 | -9,275 | 6.5% / 3.6% | 17% (45%, 40%) | rejected |
| 1.25x on a stacked sweep (wild_n_pools_x125) | +22,915 ($2,336/mo) | 4.12 | -2,462 | 22.3% / 0.0% | +17,446 ($342/mo) | 1.26 | -10,445 | 9.9% / 9.6% | 17% (45%, 40%) | promising |

Trades a week never change (2.16 in 2026, 3.17 in 2021-25): every setup is still taken.

## What the size-rule table really says

- **Every half-size rule loses money in both periods.** Halving the "bad" half of the trades costs $3-10k in 2026 and
  $3-5k in 2021-25, because the "bad" half still has winners in it. Several cut the drawdown (to -$5k in 2021-25) and cut
  eval fails, but at the price of far fewer passes: the pre-market rule drops 2026 evals passed within 2 weeks from 20% to
  6%. That is the wrong trade-off for the owner's 2-week rule.
- **Every 1.25x rule "beats the baseline" in both periods, and that is a trap.** The locked strategy is profitable in
  both periods, so adding size to *any* half of its trades that has a positive average R adds net. The honest yardstick
  is flat 1.25x on every trade: **+$24,282 in 2026 and +$18,350 in 2021-25.** Not one of the eight 1.25x rules beats
  that in 2021-25 (they make +$17.1-17.9k), and only the wide-overnight rule edges it in 2026 (+$24,463). The rules do
  carry a little less drawdown than flat 1.25x (-$9.2-10.4k vs -$10.5k in 2021-25) and fewer 1-month eval fails
  (6.2-9.6% vs 10.8%), which is what you get from sizing up only half the trades. The risk research already rejected
  flat 1.25x because the drawdown and the eval fails grow faster than the profit; the same applies here.
- **The random-group control agrees.** The best control value, 0.6% for the pre-market rule, is the product of a 4%
  result in 2021-25 (about what the best of 33 tries should produce by luck) and a 17% result in 2026 (nothing). No
  rule beats random groups in both periods on its own.
- The rules are stored as "promising" when they beat the baseline on net and PF in both periods, which eight of them do
  on the mechanical rule. **None is an adopt candidate**: the family-wise shuffle test (95%) and the flat-leverage
  reference say the gain is leverage, not information.

## Things worth knowing anyway (information, not rules)

- **Month-to-date R** and **the last 10 trades' net R** both lean the same way as the 15-trade cold-streak filter; the
  filter already has that, with a lookback the robustness study showed is sensitive (13-17). Adding a second
  equity-state rule on top would stack two noisy versions of the same idea.
- **Dealer gamma, DIX, the VXN-VIX spread and the VIX trend** did nothing stable. GEX was positive on 596 of 679 trading
  days in 2021-25 and on 85 of 89 in 2026, so "negative gamma" is 83 old trades and 4 new ones: too thin to say anything.
- **Inside days** (78 trades) and **the first trade after 2+ quiet days** flipped sign between the periods.
- **Early vs late in the killzone** flips hard: in 2021-25 the first 45 minutes were better (+0.057R vs -0.056R), in
  2026 the opposite (+0.063R in the first 45 minutes vs +0.92R later, on 36 trades). This matches the intraday study: the
  clock does not decide the trade.
- **Relative volume on the trigger bar** leaned the same way in both periods (quiet trigger bars did better: PF 1.18 vs
  0.82 in 2021-25, 2026 gap -0.50R) but at t = -0.66 it is well inside noise. If one factor here deserves a second look
  when another year of data exists, it is this one and the pre-market sweep, because both have a story that does not
  depend on the equity curve.

## Honest limits

- 33 factors, two directions each, on 679 trades: the biggest gap will always look interesting. The shuffle test is the
  answer to that, and it says 95%.
- Several factors were split at the 2021-25 median, which is the fairest single cut but not the only one; a different
  threshold could look better or worse, which is exactly the kind of search that produces fake edges.
- 2026 has 89 trades and 21 pre-market sweeps; its numbers decide nothing on their own.
- The size-rule numbers are exact replays; the random-group control is a linear approximation on the live-sized trades
  (it ignores micro rounding and the 40-micro cap), which is why it is quoted to the nearest percent only.

## Bottom line

Nothing here should change the locked strategy. The owner was right to ask, and the answer is useful in its own way:
the strategy's edge is in what the trade is made of (the sweep, the trigger, the stop, the target), not in the weather
around it. Any future "unusual factor" claim should be held to the same bar: t above 2 on 2021-25, the same sign in 2026,
and a win against both random groups and flat leverage.

Method and data: `tools/research_wild.py` (features, ranking, size rules, shuffle and random-group controls),
`research/lab/unexpected_factors.json` (every factor and run), runs `wild_*` in `research/runs/`.
