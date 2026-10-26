## In one minute

- **Your order (2026-10-22):** find 1-2 strategies to trade next to LIT and make them profitable the way LIT was made
  profitable: tune on 2026. My two families: **MACD** and **supply/demand (S/D) zones**.
- **MACD works, a bit.** The version that came out of the January-June pick, with LIT's 15-minute check added:
  > On the 5m chart, in London (02:00-05:00 ET) or the NY open (09:30-11:00), wait for price to take a LIT level (session
  > high/low, yesterday's / last week's high/low, equal highs/lows...) by at least half an ATR. When a 5m candle closes back
  > through the CISD level **and** the MACD line shows divergence at the sweep (higher high in price, lower MACD), enter at
  > market. Stop 1 tick beyond the sweep extreme. Target the VIX band (like LIT), banked at 8R. Cut after 15 minutes if it
  > never reached +0.5R and is 0.3R down. Flat 15:55. 1 trade a day.
- **Money at $500 risk a trade:**

  | period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R |
  |---|---|---|---|---|---|---|---|---|
  | 2026 H1 (picked here) | 29 | 1.13 | 37.9 | 3.78 | **+22,087** | +3,624 | -2,527 | 1.68 |
  | 2026 H2 (untouched check) | 15 | 0.96 | 33.3 | 1.75 | **+2,569** | +692 | -1,717 | 0.41 |
  | 2025 (reference) | 72 | 1.40 | 22.2 | 1.35 | +8,183 | +666 | -13,533 | 0.27 |
  | 2021-11..2024 (reference) | 266 | 1.63 | 17.7 | 1.13 | +11,982 | +309 | -22,646 | 0.09 |

- **Next to LIT, one account, LIT first** (max 2 trades a day, never two positions at once, the MACD trade is closed
  the moment LIT enters): 2026 H1 **+$47,739** (LIT alone +$33,656), H2 **+$10,963** (LIT +$9,410), trades a week 4.3 / 3.5
  (LIT 3.1 / 2.6), drawdown -$2,329 / -$2,103 (LIT -$2,213 / -$1,419). Daily P&L correlation with LIT: -0.08 (H1), -0.01
  (H2), +0.23 (2025): almost unrelated.
- **The honest catch:** it is a "few big winners" strategy (VIX-band target, 18-38% winners). February 2026 alone made
  $14.1k; without its best 3 trades H2 is -5.5R and 2025 -4.7R. In the 5-year reference the drawdown at $500 risk is
  $22.6k (45R in a row of mostly losers, 2023 lost $8.2k). So it is positive in every period, but thin.
- **S/D zones do not work** as their own strategy (147,456 versions): the versions best in January-June lose in July-October,
  and they do it *more often* than a random version (11-26% positive in H2 vs 35% for all). Same as the earlier retail study.
- **Verdict:** I would **paper-trade the MACD sweep next to LIT** (same bot, LIT first, $300-$500 risk) for a few months;
  not real money yet. It fits next to LIT because it mostly trades days or hours LIT does not, but its H2 is small and
  rests on a handful of trades.

## What was built and how it was tested

- **Code:** `tools/second_md.py` (`run` all versions, `picks`, `save`, `check`). Nothing in `engine/lit.py`,
  `live_model*.json` or the live loop was touched.
- **Data:** CME NQ1! 5m bars 2021-11 to 2026-10-16 (`data/NQ_5m.csv`) through `engine.lit.Market` (the same LIT levels and
  the CBOE VIX one-day move); for 2026 the trade path runs on true 1m bars (`data/NQ_1m.csv`, cleaned like LIT); 5m before.
  Official CME data only (TradingView / NinjaTrader), no CFD.
- **Fills and costs:** signals at a 5m close; market entry at the next 5m open + 1 tick; limit entries (the other entry
  tested) at the CISD level, filled only 1 tick through, 30 min, cancelled if the stop trades first. Stops at the stop (or a
  worse open) - 1 tick; 15-minute cuts and the 15:55 flat at market - 1 tick; targets at the limit; stop and target in one
  bar = stop. **$1.90 a micro round trip.** LIT's stored trades (run `lit_live`, $1.40) were re-costed to $1.90.
- **Stops** where a trader puts them: 1 tick beyond the sweep extreme (MACD), beyond the zone's far edge or the retest
  low/high (S/D); 6-80 pts, else no trade. Size follows the stop.
- **Selection:** pick on **2026 H1 (Jan 2 - Jun 30)** only, 25+ trades (1+ a week), at most 4.5 a week. Two picks per
  family: **best** (top t-stat of R) and **plateau** (top median t of itself and every one-parameter neighbour). The same with
  "not negative in 2025 and 2021-24" (references, never H2). **H2 (Jul 1 - Oct 16) untouched.**
- **No look-ahead:** higher timeframes count only from the 5m bar where they closed; the MACD of a still-forming 15m bar
  uses the 5m close known at that moment; swings only once confirmed. `python tools/second_md.py check` rebuilds the chosen
  version on data **cut at each signal bar** (Market built from 120 days before to the signal, nothing after) for 40
  sampled trades: **0 of 40 differ** (signal, direction, stop, CISD level, target level, filter values).
- **Evals:** MFFU Builder 50K ($3,000 target, $2,000 trailing max loss, lock at +$100), a fresh eval started on every
  session, 2 weeks = 10 sessions, 1 month = 20 sessions, **eval-safe sizing** (micros = min($ risk / (stop x $2),
  0.6 x room / (stop x $2))). The same sizing is used for LIT in the combined eval so both are comparable. Note: with the
  0.6-of-room cap an eval practically never fails (each loss is at most 60% of what is left), it just stalls; so the pass
  rates are the number to read.

## How many versions, and is the H1 pick better than chance?

| family | versions | with 25+ H1 trades (distinct) | positive in H1 | positive in H2: all | top 50 by H1 | top 1% by H1 | positive in all 4 periods |
|---|---|---|---|---|---|---|---|
| MACD divergence at a sweep | 73,728 | 12,464 (3,707) | 50.6% | 34.3% | **66.0%** | **70.3%** | 79 |
| Supply/demand retest | 147,456 | 10,892 (1,892) | 43.1% | 34.8% | 26.0% | 11.1% | 4 |

- **MACD:** the versions that were best in January-June were twice as often positive in July-October as a random version
  (mean H2 +1.0R for the top 50 vs -3.3R for all). That is the "survivor better than chance" test, and MACD passes it. The
  top versions are near-copies of each other (same core: 5m MACD line, all LIT levels, VIX target, London), so this is
  one idea surviving, not 50 independent ones.
- **S/D:** the opposite. The better a version looked in H1, the worse it did in H2 (rank correlation -0.11). That is what
  curve-fitting noise looks like. Only 4 of 1,892 distinct versions were positive in all four periods.

## MACD divergence at a liquidity sweep: what was varied

- Generator: divergence chart 5m / 15m; oscillator MACD line / histogram; levels: PD+PW only / + session boxes / all LIT
  levels incl. build-ups and gaps / build-ups (equal highs/lows) + PD.
- Trade: market at the next open / limit at the CISD level; target VIX band / 2R / 3R / the opposite end of the divergence
  leg; breakeven off / BE at 1R to entry + 1.25 pts (LIT's); 15-minute check off / on.
- Filters: sweep depth >= 0 / 0.25 / 0.5 ATR; regime: none / 1h histogram with or against / 1h MACD line with or against /
  15m histogram with; session: all 02:00-15:30 / London + NY open / NY open / London; 1 or 2 trades a day.

**The H1 plateau pick** (run `md2_md_plateau`): 5m, MACD line, all LIT levels, market entry, VIX target, no BE, no
15-minute check, depth 0.5 ATR, no regime filter, London + NY open, 1 a day. Its neighbours (one setting changed):

| change | H1 R | H2 R | 2025 R | 2021-24 R |
|---|---|---|---|---|
| **the pick** | +58.7 | +7.9 | +20.5 | +6.3 |
| + LIT's 15-minute check (**chosen**) | +48.8 | +6.2 | +19.3 | **+23.8** |
| London only | +58.3 | +4.9 | +26.5 | -0.5 |
| all hours 02:00-15:30 | +43.6 | -3.9 | +14.0 | -27.4 |
| NY open only | -0.6 | +2.9 | -10.1 | -0.0 |
| 15m divergence | +18.9 | +15.2 | -3.6 | -14.3 |
| histogram instead of the line | +17.8 | +13.3 | +59.2 | -13.9 |
| session levels only (no build-ups/gaps/PM) | +44.9 | +9.9 | +15.6 | +5.7 |
| limit at the CISD level | +31.3 | +2.2 | +0.8 | +35.8 |
| 3R target | +23.1 | +6.6 | +14.1 | -39.0 |
| 2R target | +13.1 | +2.0 | +9.2 | -8.7 |
| BE + costs at 1R | +39.8 | -5.1 | +13.6 | +34.0 |
| against the 1h histogram | +51.9 | +8.6 | +23.6 | +25.1 |
| depth 0.25 ATR | +57.4 | +4.7 | +20.2 | -14.8 |

- **Where the edge is:** London. NY-only is flat; all-day loses in H2 and 2021-24. The VIX-band target matters (fixed 2R/3R
  are much weaker): like LIT, the money is in the far target.
- **Why the 15-minute check:** it is LIT's own exit rule (on since 2026-10-20), it costs a little in H1/H2 and triples the
  2021-24 result (+6.3R -> +23.8R) with a smaller drawdown. I chose it on H1 + the reference years; H2 was not used (and
  H2 is slightly lower with it, +6.2R vs +7.9R).
- "Against the 1h histogram" (divergence while the 1h momentum still points the old way) looks good everywhere, but it
  was not the H1 pick and I did not want to choose by peeking at H2; it is the first thing to watch in paper.

## The chosen version (run `md2_best`, trades `research/second/md_best.json`)

**Own account, by sizing** (eval columns = eval-safe sizing on that base, % pass / % fail):

| period | $300 risk net (DD) | $500 risk net (DD) | $800 risk net (DD) | eval 2 wk ($800 base) | eval 1 mo ($800 base) |
|---|---|---|---|---|---|
| 2026 H1 | +13,706 (-1,456) | +22,087 (-2,527) | +36,710 (-4,147) | 41.4 / 0.0 | 70.3 / 0.0 |
| 2026 H2 | +1,686 (-862) | +2,569 (-1,717) | +4,398 (-2,746) | 14.1 / 0.0 | 15.4 / 0.0 |
| 2025 | +5,308 (-8,012) | +8,183 (-13,533) | +14,297 (-21,851) | 22.1 / 0.0 | 27.5 / 0.0 |
| 2021-11..2024 | +7,645 (-12,773) | +11,982 (-22,646) | +18,646 (-38,367) | 18.4 / 0.0 | 24.2 / 0.0 |
| 2026 YTD | +15,392 | +24,656 ($2,513/mo) | +41,107 | 31.1 / 0.0 | 49.5 / 0.0 |

- Win rate 33-38% in 2026, 18-22% before (5m path, wider targets hit less). Median stop 37 pts (H1), 54 (H2).
- Exits 2026 H1: 15 stops, 8 targets, 3 cuts, 3 flat; H2: 5 stops, 5 cuts, 4 flat, 1 target.
- By month 2026 ($500): Jan -1,402, **Feb +14,094**, Mar +887, Apr +1,793, May +3,145, Jun +3,570, Jul +2,224, Aug -68,
  Sep -27, Oct +440. By year: 2021 (Nov-Dec) +4,474, 2022 +10,316, **2023 -8,157**, 2024 +5,453, 2025 +8,183.
- **Sensitivity:** 1 more tick of slippage on every entry and exit: H1 48.3R, H2 6.0R (small effect, stops are wide).
  Without the best 3 trades: H1 +24.8R, **H2 -5.5R**, 2025 -4.7R, 2021-24 -0.1R. Without the best 5: H1 +8.9R.

## Next to LIT on one account

LIT = run `lit_live` at the LIT size rule ($1.90 a micro); the MACD trade at $500 risk. Two ways:
**(a) LIT first, max 2 a day** (the MACD trade never opens while LIT is in a trade and is closed at market when LIT
enters; run `md2_combo_lit`) and **(b) max 1 trade a day, first come** (an earlier MACD trade takes LIT's slot).

| period | LIT alone | (a) LIT + MACD | (b) max 1 a day | (a) tr/wk | (a) DD (LIT DD) |
|---|---|---|---|---|---|
| 2026 H1 | +33,656 (PF 4.92) | **+47,739** (PF 4.42) | +41,710 | 4.26 | -2,329 (-2,213) |
| 2026 H2 | +9,410 (PF 2.66) | **+10,963** (PF 2.24) | +10,831 | 3.46 | -2,103 (-1,419) |
| 2025 | +2,812 | +6,377 | +8,667 | 3.57 | -16,421 (-7,326) |
| 2021-11..2024 | -3,527 | +511 | -10,708 | 3.99 | -31,864 (-20,388) |
| 2026 YTD | +43,066 ($4,390/mo) | **+58,701 ($5,984/mo)** | +52,541 | 3.96 | -2,329 (-2,213) |

- (a) is the way to run it: LIT keeps all 630 of its trades and the MACD side adds 371. Way (b) costs LIT 130 trades and
  is worse in 2021-24.
- Of the MACD trades, 21 of 29 (H1) and 6 of 15 (H2) fall on days LIT also trades (mostly earlier in the morning, LIT's
  London hours), so the overlap rule matters; the combined H2 gain (+$1.6k) is smaller than the MACD's own H2 (+$2.6k)
  because some MACD trades are closed early when LIT enters.
- **MFFU 50K eval, both on eval-safe sizing on one account** (2026, % of evals passed / failed):

  | | 2 weeks H1 | 2 weeks H2 | 1 month H1 | 1 month H2 |
  |---|---|---|---|---|
  | LIT alone (eval-safe) | 30.5 / 0.0 | 23.1 / 0.0 | 52.3 / 0.0 | 46.2 / 0.0 |
  | LIT + MACD at $300 | 41.4 / 0.0 | 30.8 / 0.0 | 70.3 / 0.0 | 55.1 / 0.0 |
  | LIT + MACD at $500 | **50.8 / 0.0** | **34.6 / 0.0** | **82.0 / 0.0** | 52.6 / 0.0 |
  | MACD alone ($500 base) | 43.0 / 0.0 | 0.0 / 0.0 | 65.6 / 0.0 | 0.0 / 0.0 |

  For reference, LIT's live two_week eval path (run `lit_adopt_t15_be_off_eval`, a different, more aggressive sizing):
  2-week pass/fail H1 57.1 / 5.9, H2 52.2 / 0.0. Combining the MACD side with the two_week sizing was not modelled
  (that sizing is built around one LIT winner passing the eval).

## Supply / demand: why it does not work here

- Zones on 15m / 1h / 4h: 1-3 small base candles and a displacement candle (body >= 1.0 / 1.5 ATR) closing beyond the base,
  with / without a break of structure; first retest only; with / without a sweep of a swing or LIT level just above the
  zone; 5m CISD out of the zone; stop beyond the zone edge or the retest extreme; market or limit; targets VIX band, 2R,
  3R, the next opposite fresh zone; BE, 15-minute check; zone age 1 / 3 / 10 sessions, zone size limit, 1h / 4h trend with /
  against; London + NY, London, NY, all day.
- The H1 picks (at $500 risk): best +$10.9k H1 -> **-$3.5k H2**, -$16.6k 2025; plateau +$8.2k -> -$0.1k, -$9.4k 2025;
  best with "not negative in the references" +$14.5k -> **-$3.8k**; plateau with references +$5.7k -> +$2.4k H2 but
  -$0.4k in 2025 and H1 t-stat only 1.1 (runs `md2_sd_*`).
- The earlier LIT add-on study (`lit-retail-entries.md`) found the 15m S/D retest positive in both halves on 5-18 trades; as
  its own strategy with more trades that does not hold up.

## Verdict

- **MACD divergence at a liquidity sweep: promising, not proven.** Positive in every period, low correlation with LIT,
  helps LIT's 2-week eval odds on one account, H1 selection beat chance. But H2 is small (+$2.6k at $500 in 3.5 months),
  depends on a few trades, and 2021-25 had a deep drawdown. Paper-trade it next to LIT (way (a), $300-$500 risk) and judge
  it on its first 20-30 live paper trades before real money.
- **Supply/demand: rejected** as a standalone strategy.
- Nothing changes in `live_model.json`; there is no live switch for it yet (it would be a separate module in the live loop).

## Files

- `tools/second_md.py`; all versions `research/second/md_variants.json.gz`; picks + reports `research/second/md_summary.json`;
  the chosen version's trades (2021-11..2026-10, $500 risk, common format + params + rules + full report + look-ahead
  check) `research/second/md_best.json`.
- Runs: `md2_best` (chosen), `md2_combo_lit` (LIT + it on one account), `md2_md_plateau`, `md2_md_best`, `md2_md_best_ref`,
  `md2_sd_best`, `md2_sd_plateau`, `md2_sd_best_ref`, `md2_sd_plateau_ref`.
