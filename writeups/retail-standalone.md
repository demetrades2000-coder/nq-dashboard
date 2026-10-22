## In one minute

- **The question (owner, 2026-10-22):** "Could those strategies on their own, separate to LIT, make money?" EMAs, MACD,
  support/resistance and supply/demand, run the way retail traders run them, as their own strategy on NQ.
- **Yes, some versions do.** Three of the four families have versions that made money in 2021-24, in 2025 and in 2026:
  - **Support/resistance bounce at yesterday's high/low and the overnight high/low** (best robust version): at $500 risk a
    trade **+$40.3k in 2021-24, +$36.1k in 2025, +$6.1k in 2026** ($1,034 / $2,951 / $629 a month), PF 1.20 / 1.79 / 1.16,
    about 3 trades a week.
  - **8/21 EMA opening-hour momentum** (09:35-10:30): **+$37.9k / +$23.8k / +$5.4k** ($973 / $1,944 / $557 a month), PF
    1.11 / 1.25 / 1.07, about 7 trades a week.
  - **15m EMA ribbon (8-13-21-34-55) trend ride**: **+$41.6k / +$12.6k / +$2.5k**, PF 1.26 / 1.24 / 1.06, 4 a week.
  - **Break of yesterday's / the overnight high or low, limit at the broken level**: the best 2026 result of all (PF 3.13,
    +$21.2k, 1.2 trades a week) and +$44.7k in 2021-24, but **flat in 2025 (-$0.8k)**.
  - **Opening-range breakout (15 min)**: +$32.5k in 2021-24, then only +$3.0k in 2025 and +$1.3k in 2026.
- **MACD:** every version picked on 2021-24 made money in 2021-24 and 2025 and then went flat or negative in 2026 (best:
  zero-line cross, +$22.3k / +$8.0k / -$0.4k). The only MACD versions positive in all three periods were found with
  hindsight and are small (+$7.5k / +$3.4k / +$2.1k).
- **Supply/demand** (base-then-impulse zones, first retest, stop beyond the zone): 4,608 versions, only 3.8% positive in
  2021-24 and **none positive in all three periods**. As coded here it loses.
- **The honest catch:** these edges are thin. In 2026 the best ones have PF 1.07-1.2 (LIT: 4.07), **2026 Jul-Oct is
  negative for most of them**, drawdowns are $7-16k at $500 risk, and they pass an MFFU 50K eval in 2 weeks 12-21% of the
  time (LIT 31.6%) while failing much more often at full size. Their daily P&L is nearly unrelated to LIT's (correlation
  -0.1 to +0.26), so they would add something different, but not a lot of money. Several also lean on a few big winners
  (the bounce without its best 5 trades a period: +15R / +5R / -16R; the opening-hour EMA holds up better: +69R / +43R / -1R).
- **What to do:** paper-trade the PD/ON bounce and the opening-hour EMA as a possible second-account strategy (both are
  simple, low-correlated with LIT, positive in every period here). Not worth real money until 2026 H2-type markets show they
  still work. Sizing that fits them: **$300-$500 fixed risk a trade** for $; for an eval, the eval-path sizing (micros capped at
  60% of the room to the trailing max loss) never failed an eval in these tests but passes only 1.5-21% in 2 weeks.

## How it was tested (no look-ahead, costs in)

- **Data:** TradingView CME NQ1! 5m bars 2021-11 to 2026-10-16 (`data/NQ_5m.csv`); 15m / 1h / 4h built from them. A
  higher-timeframe value is used only from the 5m bar where that bar closed. Round numbers use the unadjusted price
  (`data/NQ_rolls.json`). No Yahoo, no CFD.
- **Fills:** a signal is known at a bar close; a market entry fills at the next 5m open + 1 tick. Limit entries (zone /
  level retests) fill only when price trades 1 tick through the limit; no target on the fill bar. Stops fill at the stop
  (or a worse open) - 1 tick; signal exits and the 15:55 flat at the next open - 1 tick; stop and target in the same bar =
  stop. **$1.40 commission a micro round trip.**
- **Stops where a trader would put them** (owner, 2026-10-22), never a fixed distance, 1-2 placements per family: the
  setup candle / last 3 bars vs the last confirmed swing (EMA, MACD), the rejection candle vs the pullback low (EMA
  pullback), the divergence low vs the wider swing (MACD divergence), the poke candle vs the 6-bar extreme (S/R bounce),
  the retest candle vs the breakout candle (break-retest), the other side vs the middle of the opening range (ORB), the
  zone edge vs the leg low (S/D). Stops under 4 pts or over 120 pts are skipped (a cap study is below).
- **Sessions:** entries 02:00-15:30 ET or RTH 09:30-15:30 (ORB / opening hour: RTH only), flat 15:55, 1 or 2 trades a day.
- **Targets:** 1.5 / 2 / 3R, the next level / opposite zone / swing (>= 1.5R), the strategy's own exit signal (opposite
  cross, close through the EMA), or a 6-bar swing trail; BE at 1R on/off.
- **Scored in R first**, then in $ under six sizings: the LIT rule ($800 up to a 20-pt stop, then 800x20/stop, max 40),
  $500 and $300 risk a trade, 2 / 5 / 10 fixed micros, and the MFFU 50K eval path (LIT-rule micros capped at 0.6 x room
  to the trailing max loss / (stop x $2), a fresh eval started on every session). Eval odds = MFFU Builder 50K ($3,000
  target, $2,000 trailing max loss, `engine.analytics.simulate_eval` via `tools/runlib.py`).
- **Against overfitting:** each sub-strategy's parameters are picked on **2021-11 to 2024-12 only**, with at least 1 trade
  a week. Two picks per sub-strategy: **best** (highest t-stat of R) and **plateau** (every one-step neighbour in the grid
  also profitable; highest median t of itself + neighbours). 2025, 2026, 2026 H1 (Jan-Jun) and H2 (Jul-Oct 16) are never
  used to pick. A third, **hindsight** row per family shows the version positive in all three periods with the best worst
  t-stat: it answers "which versions did make money", but it is chosen by looking at 2025 and 2026, so it proves less.
- **Correlation with LIT:** daily P&L vs run `lit_live` (LIT's 2021-25 line is a 5m-only reference).
- Code: `tools/retail_standalone.py` (`run` = all variants, `save` = picks + runs, `tables`, `detail <id>`). All variant
  scores: `research/retail/variants.json`; the picks with every trade and all sizings: `research/retail/picks.json`; runs
  `retail_sa_*` in the run library (stored at the LIT size rule; the other sizings are in each run's params).

## How many versions were tried

| family | versions | with different trades | positive 2021-24 | positive 2025 | positive 2026 | positive in all three |
|---|---|---|---|---|---|---|
| EMA (cross, pullback, ribbon, opening hour) | 3,072 | 2,673 | 41.2% | 53.8% | 52.3% | 209 |
| MACD (signal cross, zero cross, histogram, divergence) | 3,200 | 2,434 | 26.7% | 36.2% | 45.1% | 76 |
| Support/resistance (bounce, retest, limit retest, ORB) | 2,440 | 1,917 | 39.2% | 27.9% | 27.5% | 121 |
| Supply/demand (limit at zone, confirmation entry) | 4,608 | 1,612 | 3.8% | 2.6% | 29.7% | 0 |
| **Total** | **13,320** | **8,636** | | | | **406** |

(Percentages over versions with at least 1 trade a week in 2021-24.) With thousands of versions, a few hundred will be
positive in all three periods by luck alone, so the in-sample picks below are the fairer test; the "positive in all three"
count is a ceiling, not proof.

## Every pick, per family

Money columns at **$500 risk a trade** (micros = 500 / (stop x $2), max 40), the sizing closest to R. "R" = sum of R per
period (costs in). tr/wk = 2021-24 / 2026. Max DD = worst of the three periods. Eval 2 wk = % of MFFU 50K evals started in
2026 that passed / failed within 10 sessions at this size.

#### EMA: 3072 variants (2673 with different trades); in-sample positive 41.2%, 2025 53.8%, 2026 52.3%; positive in all three: 209

| version | pick | R 21-24 / 25 / 26 | $ 21-24 | $ 2025 | $ 2026 (H1 / H2) | $/mo 2026 | PF 21-24 / 25 / 26 | tr/wk | max DD | eval 2wk 2026 | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ema_cross tf=15 fs=[8, 21] trend=tf200; stop=tight tgt=3.0 be=False sess=rth maxpd=1 | best | +50 / +5 / -8 | +20,859 | +1,529 | -3,921 (-329 / -3,592) | -402 | 1.27 / 1.08 / 0.66 | 2.19 / 1.1 | -7,432 | 0.0/1.0 | -0.04 |
| ema_cross tf=15 fs=[8, 21] trend=tf200; stop=tight tgt=3.0 be=False sess=rth maxpd=1 | plateau | +50 / +5 / -8 | +20,859 | +1,529 | -3,921 (-329 / -3,592) | -402 | 1.27 / 1.08 / 0.66 | 2.19 / 1.1 | -7,432 | 0.0/1.0 | -0.04 |
| ema_pullback tf=60 pe=21 trend=stack; stop=candle tgt=sig be=True sess=rth maxpd=1 | best | +35 / +6 / -3 | +13,991 | +2,017 | -1,149 (+550 / -1,699) | -118 | 1.4 / 1.21 / 0.78 | 1.27 / 0.63 | -3,132 | 0.0/0.0 | 0.01 |
| ema_pullback tf=60 pe=21 trend=stack; stop=candle tgt=sig be=True sess=rth maxpd=1 | plateau | +35 / +6 / -3 | +13,991 | +2,017 | -1,149 (+550 / -1,699) | -118 | 1.4 / 1.21 / 0.78 | 1.27 / 0.63 | -3,132 | 0.0/0.0 | 0.01 |
| ema_ribbon tf=15 trend=none xema=21; stop=tight tgt=sig be=False sess=rth maxpd=1 | best | +96 / +26 / +7 | +41,641 | +12,623 | +2,501 (+2,054 / +447) | +256 | 1.26 / 1.24 / 1.06 | 4.39 / 3.83 | -15,987 | 15.1/25.9 | -0.02 |
| ema_ribbon tf=15 trend=none xema=34; stop=swing tgt=3.0 be=True sess=rth maxpd=1 | plateau | +9 / +9 / -2 | +2,480 | +3,320 | -814 (-3,642 / +2,829) | -83 | 1.02 / 1.11 / 0.96 | 3.54 / 2.46 | -17,136 | 0.0/2.9 | 0.14 |
| ema_openhour trig=cross filt=none; stop=tight tgt=3.0 be=False sess=rth maxpd=1 | best | +57 / +35 / -19 | +26,092 | +15,063 | -7,690 (-5,127 / -2,563) | -788 | 1.25 / 1.5 / 0.66 | 2.35 / 1.68 | -11,025 | 0.0/6.8 | 0.06 |
| ema_openhour trig=state filt=none; stop=tight tgt=3.0 be=False sess=rth maxpd=2 | plateau | +84 / +58 / +14 | +37,884 | +23,794 | +5,433 (+7,905 / -2,472) | +557 | 1.11 / 1.25 / 1.07 | 7.11 / 6.66 | -14,973 | 17.6/48.8 | 0.13 |
| ema_openhour trig=state filt=none; stop=tight tgt=3.0 be=False sess=rth maxpd=1 | hindsight | +58 / +32 / +27 | +26,853 | +13,223 | +11,294 (+10,786 / +508) | +1,157 | 1.11 / 1.18 / 1.2 | 4.99 / 4.88 | -16,162 | 18.5/44.4 | 0.18 |

#### MACD: 3200 variants (2434 with different trades); in-sample positive 26.7%, 2025 36.2%, 2026 45.1%; positive in all three: 76

| version | pick | R 21-24 / 25 / 26 | $ 21-24 | $ 2025 | $ 2026 (H1 / H2) | $/mo 2026 | PF 21-24 / 25 / 26 | tr/wk | max DD | eval 2wk 2026 | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| macd_cross tf=15 trend=h1_200 zone=any; stop=swing tgt=3.0 be=False sess=all maxpd=1 | best | +65 / +4 / -3 | +27,867 | +1,838 | -1,974 (+3,914 / -5,889) | -202 | 1.31 / 1.08 / 0.9 | 2.0 / 1.51 | -7,225 | 0.0/2.9 | -0.02 |
| macd_cross tf=5 trend=h1_200 zone=zero; stop=swing tgt=sig be=True sess=all maxpd=2 | plateau | +66 / +6 / -6 | +32,189 | +3,430 | -2,232 (-2,238 / +6) | -229 | 1.63 / 1.23 / 0.78 | 1.47 / 1.29 | -7,098 | 4.9/0.0 | 0.02 |
| macd_zero tf=5 trend=tf200; stop=swing tgt=1.5 be=True sess=rth maxpd=1 | best | +49 / +20 / -2 | +22,250 | +8,043 | -398 (-655 / +257) | -41 | 1.24 / 1.34 / 0.98 | 3.35 / 2.41 | -10,686 | 0.5/4.4 | 0.06 |
| macd_hist tf=15 trend=h1_200 nfall=3; stop=swing tgt=sig be=False sess=rth maxpd=2 | best | +36 / +4 / -11 | +18,685 | +1,020 | -5,178 (-4,147 / -1,032) | -530 | 1.51 / 1.15 / 0.35 | 1.13 / 0.85 | -5,178 | 0.0/2.4 | 0.03 |
| macd_div tf=5 k=2 osc=hist trend=none; stop=swing tgt=lvl be=False sess=rth maxpd=2 | best | +24 / +12 / -3 | +11,054 | +5,295 | -1,630 (-3,176 / +1,547) | -167 | 1.12 / 1.23 / 0.89 | 1.72 / 1.1 | -16,968 | 2.9/4.9 | -0.07 |
| macd_cross tf=15 trend=h1_200 zone=any; stop=swing tgt=2.0 be=True sess=all maxpd=2 | hindsight | +20 / +8 / +6 | +7,527 | +3,362 | +2,126 (+6,215 / -4,089) | +218 | 1.1 / 1.19 / 1.13 | 2.33 / 1.76 | -10,511 | 0.0/1.0 | -0.06 |

#### Support / resistance (incl. ORB): 2440 variants (1917 with different trades); in-sample positive 39.2%, 2025 27.9%, 2026 27.5%; positive in all three: 121

| version | pick | R 21-24 / 25 / 26 | $ 21-24 | $ 2025 | $ 2026 (H1 / H2) | $/mo 2026 | PF 21-24 / 25 / 26 | tr/wk | max DD | eval 2wk 2026 | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sr_bounce src=on tf=5; stop=swing tgt=3.0 be=False sess=all maxpd=1 | best | +70 / +14 / -19 | +30,142 | +6,782 | -7,632 (-3,725 / -3,907) | -782 | 1.18 / 1.18 / 0.75 | 3.62 / 2.39 | -10,347 | 0.0/18.5 | -0.06 |
| sr_bounce src=pdon tf=5; stop=swing tgt=lvl be=False sess=all maxpd=2 | plateau | +91 / +74 / +17 | +40,274 | +36,110 | +6,144 (+9,989 / -3,845) | +629 | 1.2 / 1.79 / 1.16 | 3.48 / 2.78 | -15,586 | 15.6/25.9 | 0.05 |
| sr_retest src=sw tf=15; stop=swing tgt=2.0 be=False sess=all maxpd=2 | best | +60 / -6 / -13 | +25,101 | -2,436 | -6,141 (-290 / -5,851) | -629 | 1.39 / 0.89 / 0.7 | 1.66 / 1.63 | -8,726 | 0.0/4.4 | -0.03 |
| sr_retest src=sw tf=15; stop=swing tgt=3.0 be=False sess=rth maxpd=2 | plateau | +45 / -4 / -11 | +18,196 | -1,704 | -4,855 (-2,656 / -2,199) | -497 | 1.46 / 0.85 / 0.4 | 1.1 / 0.68 | -6,816 | 0.0/0.0 | -0.04 |
| sr_limit src=pdon tf=5; stop=swing tgt=lvl be=False sess=all maxpd=1 | best | +98 / -2 / +47 | +44,705 | -773 | +21,218 (+16,038 / +5,180) | +2,174 | 1.67 / 0.96 / 3.13 | 1.58 / 1.17 | -8,206 | 12.7/0.0 | 0.26 |
| sr_limit src=sw tf=15; stop=swing tgt=3.0 be=False sess=rth maxpd=1 | plateau | +50 / -8 / -2 | +20,518 | -3,316 | -864 (+36 / -900) | -88 | 1.41 / 0.68 / 0.79 | 1.67 / 0.51 | -5,068 | 0.0/0.0 | -0.07 |
| orb orm=15 filt=none cutoff=720; stop=opp tgt=2.0 be=True sess=rth | best | +84 / +13 / +0 | +35,377 | +5,348 | -26 (+1,158 / -1,185) | -3 | 1.32 / 1.22 / 1.0 | 3.78 / 1.24 | -5,136 | 0.0/0.0 | 0.07 |
| orb orm=15 filt=none cutoff=720; stop=opp tgt=2.0 be=False sess=rth | plateau | +76 / +6 / +3 | +32,502 | +3,021 | +1,260 (+2,857 / -1,598) | +129 | 1.25 / 1.1 / 1.12 | 3.78 / 1.24 | -6,154 | 0.0/0.0 | 0.12 |
| sr_limit src=sw tf=5; stop=swing tgt=2.0 be=False sess=rth maxpd=1 | hindsight | +24 / +11 / +9 | +10,518 | +5,143 | +3,884 (+3,256 / +627) | +398 | 1.13 / 1.33 / 1.41 | 2.19 / 1.12 | -8,220 | 0.0/0.0 | -0.05 |

#### Supply / demand: 4608 variants (1612 with different trades); in-sample positive 3.8%, 2025 2.6%, 2026 29.7%; positive in all three: 0

| version | pick | R 21-24 / 25 / 26 | $ 21-24 | $ 2025 | $ 2026 (H1 / H2) | $/mo 2026 | PF 21-24 / 25 / 26 | tr/wk | max DD | eval 2wk 2026 | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sd_confirm tf=15 imp=1.5 age=5 trend=none; stop=edge tgt=3.0 be=True sess=all maxpd=2 | best | +18 / -27 / +2 | +7,941 | -12,183 | +832 (+90 / +742) | +85 | 1.19 / 0.3 / 1.09 | 1.02 / 0.95 | -14,359 | 0.0/0.0 | -0.1 |
| sd_zone tf=15 imp=1.0 age=20 trend=none; stop=leg tgt=lvl be=False sess=rth maxpd=2 | best | +0 / -27 / -16 | -160 | -13,041 | -6,457 (-3,128 / -3,329) | -661 | 1.0 / 0.38 / 0.69 | 1.05 / 1.49 | -16,708 | 3.4/7.3 | -0.02 |

## The versions that work, in detail

### EMA: the 8/21 opening-hour momentum (best robust EMA version)

Rule: 5m chart, 09:35-10:30 ET. Long when the 8 EMA is above the 21 EMA, the bar closes above the 8 EMA and is a green
candle (short = mirror). Stop 1 tick beyond the low/high of the last 3 bars. Target 3R, else flat at 15:55. Up to 2 trades
a day. It is a plateau pick (all its neighbours were profitable in 2021-24) and stayed positive in 2025 and 2026.

**ema_openhour trig=state filt=none | stop=tight tgt=3.0 be=False sess=rth maxpd=2** (`retail_sa_ema_ema_openhour_plateau`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 1163 | 7.11 | 34.3 | 1.11 | +37,884 | +973 | -14,973 | 0.072 | 20.3/55.4 | 29.2/67.8 | 0.03 |
| 2025 | 356 | 6.93 | 37.6 | 1.25 | +23,794 | +1,944 | -7,130 | 0.162 | 28.4/46.7 | 42.8/55.3 | -0.02 |
| 2026 | 273 | 6.66 | 32.2 | 1.07 | +5,433 | +557 | -10,625 | 0.05 | 17.6/48.8 | 31.7/58.5 | 0.13 |
| 2026H1 | 171 | 6.73 | 34.5 | 1.16 | +7,905 | +1,307 | -4,839 | 0.116 | 13.4/43.3 | 33.1/59.1 | 0.21 |
| 2026H2 | 102 | 6.54 | 28.4 | 0.92 | -2,472 | -666 | -10,131 | -0.06 | 24.4/51.3 | 29.5/51.3 | -0.09 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +18,979 | +6,715 | -2,223 | -9,048 | 1.5/10.2 | 1.5/36.1 |
| $500 risk | +37,884 | +23,794 | +5,433 | -10,625 | 17.6/48.8 | 31.7/58.5 |
| $300 risk | +21,000 | +14,044 | +3,536 | -5,894 | 3.9/15.1 | 9.8/38.0 |
| 2 micros | +21,024 | +17,758 | +4,828 | -7,752 | 9.3/31.7 | 25.4/49.3 |
| 5 micros | +52,559 | +44,396 | +12,069 | -19,379 | 29.8/66.8 | 32.2/66.8 |
| 10 micros | +105,118 | +88,791 | +24,138 | -38,758 | 29.8/70.2 | 29.8/70.2 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 1.5/0.0 | 1.5/0.0 |

Eval path in 2021-24: 10.1/0.0 in 2 weeks, 20.3/0.0 in a month; 2025: 4.3/0.0, 13.6/0.0.

With 1 trade a day instead of 2 (the hindsight row) it made +$26.9k / +$13.2k / +$11.3k at $500 risk, PF 1.11 / 1.18 / 1.20.
The 9/21 and 20/50 crosses, the 200 EMA filter and the EMA pullback did not hold: their in-sample picks lost in 2026.

### EMA: 15m ribbon trend ride (in-sample best)

Rule: 15m EMAs 8-13-21-34-55. Enter when the ribbon turns fully stacked (8 > 13 > 21 > 34 > 55 and the close above the 8),
RTH only, 1 a day. Stop beyond the low of the last 3 15m bars. Exit on a 15m close back through the 21 EMA (or 15:55).
Its plateau neighbours are weak (the plateau pick, a 3R target with the swing stop, lost in 2026), so treat it as fragile.

**ema_ribbon tf=15 trend=none xema=21 | stop=tight tgt=sig be=False sess=rth maxpd=1** (`retail_sa_ema_ema_ribbon_best`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 719 | 4.39 | 35.0 | 1.26 | +41,641 | +1,069 | -15,987 | 0.133 | 17.5/20.5 | 29.7/50.9 | 0.06 |
| 2025 | 222 | 4.32 | 31.5 | 1.24 | +12,623 | +1,031 | -5,442 | 0.115 | 17.1/19.1 | 23.0/51.4 | -0.06 |
| 2026 | 157 | 3.83 | 31.2 | 1.06 | +2,501 | +256 | -8,203 | 0.042 | 15.1/25.9 | 23.4/50.7 | -0.02 |
| 2026H1 | 99 | 3.9 | 29.3 | 1.08 | +2,054 | +340 | -7,320 | 0.056 | 18.9/33.1 | 27.6/54.3 | -0.01 |
| 2026H2 | 58 | 3.72 | 34.5 | 1.03 | +447 | +120 | -3,350 | 0.02 | 9.0/12.8 | 16.7/30.8 | -0.05 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +34,824 | +15,449 | +459 | -7,348 | 7.3/5.9 | 15.6/24.9 |
| $500 risk | +41,641 | +12,623 | +2,501 | -8,203 | 15.1/25.9 | 23.4/50.7 |
| $300 risk | +29,404 | +6,751 | +1,521 | -5,213 | 6.3/0.0 | 14.6/11.2 |
| 2 micros | +10,000 | +4,707 | +1,789 | -3,636 | 4.4/0.0 | 10.7/11.7 |
| 5 micros | +25,000 | +11,768 | +4,474 | -9,090 | 22.9/44.9 | 28.3/64.9 |
| 10 micros | +49,999 | +23,537 | +8,947 | -18,181 | 25.4/70.7 | 25.4/71.2 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 7.3/0.0 | 15.6/0.0 |

Eval path in 2021-24: 13.2/0.0 in 2 weeks, 24.0/0.0 in a month; 2025: 10.9/0.0, 11.3/0.0.

### Support/resistance: bounce at the prior-day and overnight high/low (best robust version of all)

Rule: levels = yesterday's RTH high and low (all day) and the overnight high and low (from 09:30). A 5m bar pokes through a
level and closes back on the other side as a rejection candle (for a long: low under the level, close above it, green,
the bar before closed above). Market entry at the next open. Stop 1 tick beyond the 6-bar low/high (the wider protected
swing; the tight version beyond the poke candle also worked: +112R / +71R / +27R, but on a 22% win rate). Target = the next level
the other way, only if at least 1.5R away. First touch of each level per day, up to 2 trades a day, 02:00-15:30.

**sr_bounce src=pdon tf=5 | stop=swing tgt=lvl be=False sess=all maxpd=2** (`retail_sa_sr_sr_bounce_plateau`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 570 | 3.48 | 28.6 | 1.2 | +40,274 | +1,034 | -15,586 | 0.159 | 19.8/40.3 | 27.0/64.8 | 0.05 |
| 2025 | 141 | 2.74 | 30.5 | 1.79 | +36,110 | +2,951 | -5,985 | 0.526 | 21.0/19.1 | 32.7/49.0 | -0.05 |
| 2026 | 114 | 2.78 | 26.3 | 1.16 | +6,144 | +629 | -7,219 | 0.153 | 15.6/25.9 | 30.7/56.1 | 0.05 |
| 2026H1 | 72 | 2.83 | 33.3 | 1.46 | +9,989 | +1,652 | -5,338 | 0.359 | 21.3/18.9 | 38.6/40.2 | 0.03 |
| 2026H2 | 42 | 2.69 | 14.3 | 0.76 | -3,845 | -1,035 | -7,219 | -0.201 | 6.4/34.6 | 7.7/76.9 | 0.06 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +46,376 | +57,263 | +27 | -8,465 | 12.2/13.2 | 19.0/50.2 |
| $500 risk | +40,274 | +36,110 | +6,144 | -7,219 | 15.6/25.9 | 30.7/56.1 |
| $300 risk | +25,158 | +20,864 | +4,177 | -4,007 | 2.4/0.0 | 7.3/14.6 |
| 2 micros | +8,831 | +3,501 | +4,630 | -3,912 | 1.0/0.0 | 1.5/4.9 |
| 5 micros | +22,078 | +8,753 | +11,574 | -9,781 | 22.9/27.3 | 32.2/55.1 |
| 10 micros | +44,155 | +17,506 | +23,149 | -19,562 | 27.8/62.4 | 27.8/67.8 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 12.2/0.0 | 18.0/0.0 |

Eval path in 2021-24: 20.8/0.0 in 2 weeks, 27.4/0.0 in a month; 2025: 23.0/0.0, 35.0/0.0.

Weak spots: Jul-Oct 2026 (-$3.8k, win 14%), and the profit leans on the far-level winners: without its best 5 trades of
each period the R is +15 / +5 / -16. Of the 40 most consistent "positive in all three periods" versions of all families,
12 are ORBs, 11 PD/ON break-and-limit, 7 opening-hour EMA and 6 S/R bounces.

### Support/resistance: break of the prior-day / overnight level, limit at the broken level

Rule: a 5m close through yesterday's or the overnight high/low; a limit order at the broken level for the next hour
(filled only when price trades 1 tick through it). Stop beyond the 6-bar extreme before the break. Target = the next
level, at least 1.5R. 1 a day.

**sr_limit src=pdon tf=5 | stop=swing tgt=lvl be=False sess=all maxpd=1** (`retail_sa_sr_sr_limit_best`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 259 | 1.58 | 40.2 | 1.67 | +44,705 | +1,148 | -4,455 | 0.38 | 7.3/2.1 | 19.8/17.4 | -0.07 |
| 2025 | 73 | 1.42 | 31.5 | 0.96 | -773 | -63 | -8,206 | -0.023 | 5.8/7.4 | 7.8/32.7 | -0.08 |
| 2026 | 48 | 1.17 | 47.9 | 3.13 | +21,218 | +2,174 | -2,249 | 0.986 | 12.7/0.0 | 28.8/3.4 | 0.26 |
| 2026H1 | 30 | 1.18 | 46.7 | 3.57 | +16,038 | +2,652 | -2,249 | 1.165 | 15.0/0.0 | 28.3/5.5 | 0.29 |
| 2026H2 | 18 | 1.15 | 50.0 | 2.39 | +5,180 | +1,395 | -1,394 | 0.687 | 9.0/0.0 | 29.5/0.0 | 0.11 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +40,240 | +4,691 | +17,242 | -1,894 | 8.3/0.0 | 20.0/0.0 |
| $500 risk | +44,705 | -773 | +21,218 | -2,249 | 12.7/0.0 | 28.8/3.4 |
| $300 risk | +25,618 | -140 | +12,571 | -1,392 | 4.4/0.0 | 12.2/0.0 |
| 2 micros | +17,369 | -2,100 | +8,542 | -1,058 | 0.0/0.0 | 0.5/0.0 |
| 5 micros | +43,422 | -5,251 | +21,354 | -2,645 | 12.2/0.5 | 32.7/7.3 |
| 10 micros | +86,844 | -10,502 | +42,708 | -5,290 | 43.4/12.7 | 58.0/21.5 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 8.3/0.0 | 19.5/0.0 |

Eval path in 2021-24: 9.9/0.0 in 2 weeks, 17.6/0.0 in a month; 2025: 7.0/0.0, 8.9/0.0.

The best 2026 numbers here (PF 3.13), but 2025 was flat and the result leans on a few big winners (without its best 5
trades the 2025 R is -27). It is the one with some overlap with LIT (correlation 0.26 in 2026: both trade the prior-day
levels).

### Support/resistance: opening-range breakout (15 minutes)

Rule: the 09:30-09:45 range; first 5m close beyond it before 12:00; stop at the other side of the range; target 2R; 1 a
day. Very good in 2021-24, weak since. In 2026 the 15-minute range is often over 120 pts, so most days are skipped (51
trades in 2026 vs 143 in 2025); allowing stops up to 200 pts brings 150 trades but 2026 turns negative (-6.7R).

**orb orm=15 filt=none cutoff=720 | stop=opp tgt=2.0 be=False sess=rth** (`retail_sa_sr_orb_plateau`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 618 | 3.78 | 45.3 | 1.25 | +32,502 | +834 | -4,231 | 0.122 | 4.0/9.0 | 10.8/31.5 | -0.09 |
| 2025 | 143 | 2.78 | 44.8 | 1.1 | +3,021 | +247 | -6,154 | 0.045 | 3.1/5.8 | 9.7/17.9 | -0.05 |
| 2026 | 51 | 1.24 | 47.1 | 1.12 | +1,260 | +129 | -4,114 | 0.065 | 0.0/0.0 | 1.0/5.9 | 0.12 |
| 2026H1 | 36 | 1.42 | 55.6 | 1.44 | +2,857 | +472 | -1,637 | 0.214 | 0.0/0.0 | 1.6/0.0 | 0.18 |
| 2026H2 | 15 | 0.96 | 26.7 | 0.58 | -1,598 | -430 | -2,595 | -0.293 | 0.0/0.0 | 0.0/15.4 | -0.13 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +6,988 | +2,603 | -419 | -1,176 | 0.0/0.0 | 0.0/0.0 |
| $500 risk | +32,502 | +3,021 | +1,260 | -4,114 | 0.0/0.0 | 1.0/5.9 |
| $300 risk | +17,026 | +1,056 | +906 | -1,958 | 0.0/0.0 | 0.0/0.0 |
| 2 micros | +26,577 | +1,909 | +1,145 | -3,787 | 0.0/0.0 | 0.0/5.9 |
| 5 micros | +66,442 | +4,772 | +2,863 | -9,468 | 8.3/19.5 | 8.8/33.2 |
| 10 micros | +132,883 | +9,543 | +5,726 | -18,936 | 8.8/49.3 | 8.8/64.4 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 0.0/0.0 | 0.0/0.0 |

Eval path in 2021-24: 0.0/0.0 in 2 weeks, 0.0/0.0 in a month; 2025: 0.0/0.0, 0.0/0.0.

The swing-cluster levels, round numbers and the confirmation retest picked in-sample all lost in 2025 and 2026.

### MACD

Every in-sample pick (signal-line cross, zero-line cross, histogram turn, divergence; 5m / 15m / 1h; 200 EMA or 1h trend
filter) was profitable in 2021-24 and lost or was flat in 2026. The best in-sample one:

**macd_zero tf=5 trend=tf200 | stop=swing tgt=1.5 be=True sess=rth maxpd=1** (`retail_sa_macd_macd_zero_best`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 548 | 3.35 | 43.2 | 1.24 | +22,250 | +571 | -10,686 | 0.089 | 2.9/7.5 | 12.2/27.0 | 0.05 |
| 2025 | 147 | 2.86 | 47.6 | 1.34 | +8,043 | +657 | -6,149 | 0.138 | 3.1/4.7 | 10.1/14.4 | -0.02 |
| 2026 | 99 | 2.41 | 35.4 | 0.98 | -398 | -41 | -5,968 | -0.024 | 0.5/4.4 | 1.0/13.7 | 0.06 |
| 2026H1 | 59 | 2.32 | 33.9 | 0.95 | -655 | -108 | -4,346 | -0.032 | 0.0/0.0 | 0.0/6.3 | 0.14 |
| 2026H2 | 40 | 2.56 | 37.5 | 1.04 | +257 | +69 | -3,750 | -0.011 | 1.3/11.5 | 2.6/25.6 | -0.19 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +5,451 | +676 | +226 | -2,387 | 0.0/0.0 | 0.0/0.0 |
| $500 risk | +22,250 | +8,043 | -398 | -5,968 | 0.5/4.4 | 1.0/13.7 |
| $300 risk | +11,884 | +4,277 | -589 | -3,360 | 0.0/0.0 | 0.0/0.0 |
| 2 micros | +14,564 | +7,091 | -1,619 | -4,654 | 0.0/3.4 | 0.0/12.2 |
| 5 micros | +36,409 | +17,727 | -4,047 | -11,635 | 5.9/29.8 | 11.7/52.7 |
| 10 micros | +72,818 | +35,454 | -8,094 | -23,270 | 23.9/57.6 | 25.4/69.8 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 0.0/0.0 | 0.0/0.0 |

Eval path in 2021-24: 0.0/0.0 in 2 weeks, 1.3/0.0 in a month; 2025: 0.0/0.0, 2.7/0.0.

The best one found with hindsight (15m signal cross with the 1h 200 EMA trend, swing stop, 2R, BE at 1R, 2 a day):

**macd_cross tf=15 trend=h1_200 zone=any | stop=swing tgt=2.0 be=True sess=all maxpd=2** (`retail_sa_macd_macd_cross_hindsight`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 382 | 2.33 | 31.7 | 1.1 | +7,527 | +193 | -10,511 | 0.053 | 1.5/5.5 | 8.3/21.5 | 0.07 |
| 2025 | 97 | 1.89 | 33.0 | 1.19 | +3,362 | +275 | -3,773 | 0.083 | 2.7/0.0 | 9.3/2.7 | 0.01 |
| 2026 | 72 | 1.76 | 33.3 | 1.13 | +2,126 | +218 | -5,569 | 0.077 | 0.0/1.0 | 2.9/20.0 | -0.06 |
| 2026H1 | 43 | 1.69 | 41.9 | 1.79 | +6,215 | +1,028 | -1,480 | 0.358 | 0.0/0.0 | 4.7/0.0 | -0.03 |
| 2026H2 | 29 | 1.86 | 20.7 | 0.49 | -4,089 | -1,101 | -5,266 | -0.338 | 0.0/2.6 | 0.0/44.9 | -0.21 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +5,869 | +2,484 | +1,803 | -2,813 | 0.0/0.0 | 0.0/1.5 |
| $500 risk | +7,527 | +3,362 | +2,126 | -5,569 | 0.0/1.0 | 2.9/20.0 |
| $300 risk | +5,143 | +1,658 | +1,726 | -2,914 | 0.0/0.0 | 0.0/0.0 |
| 2 micros | +4,709 | +1,030 | +293 | -4,285 | 0.0/0.0 | 1.5/3.4 |
| 5 micros | +11,774 | +2,576 | +734 | -10,713 | 10.2/27.8 | 23.4/51.7 |
| 10 micros | +23,547 | +5,152 | +1,467 | -21,426 | 18.0/49.8 | 26.3/65.9 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 0.0/0.0 | 0.0/0.0 |

Eval path in 2021-24: 0.4/0.0 in 2 weeks, 4.8/0.0 in a month; 2025: 1.2/0.0, 5.1/0.0.

### Supply/demand

Zones: 1-3 small base candles then an impulse candle (body >= 1-1.5 ATR) on 15m / 1h / 4h; first retest within 5 or 20
sessions; with and without a 1h / 4h trend filter; limit at the zone or a confirmation candle out of the zone; stop beyond
the zone edge or the leg low; fixed R or the opposite zone. Only 3.8% of versions made money in 2021-24 and none in all
three periods. The best in-sample version:

**sd_confirm tf=15 imp=1.5 age=5 trend=none | stop=edge tgt=3.0 be=True sess=all maxpd=2** (`retail_sa_sd_sd_confirm_best`), sized at $500 risk a trade

| period | trades | tr/wk | win % | PF | net $ | $/month | max DD | avg R | eval 2 wk pass/fail | eval 1 mo pass/fail | corr LIT |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2021-24 | 167 | 1.02 | 23.4 | 1.19 | +7,941 | +204 | -8,899 | 0.107 | 0.7/0.0 | 5.7/7.0 | -0.01 |
| 2025 | 61 | 1.19 | 8.2 | 0.3 | -12,183 | -996 | -14,359 | -0.44 | 0.0/2.3 | 0.0/19.5 | -0.04 |
| 2026 | 39 | 0.95 | 28.2 | 1.09 | +832 | +85 | -2,310 | 0.048 | 0.0/0.0 | 2.4/0.0 | -0.1 |
| 2026H1 | 21 | 0.83 | 23.8 | 1.02 | +90 | +15 | -2,260 | 0.001 | 0.0/0.0 | 3.9/0.0 | -0.13 |
| 2026H2 | 18 | 1.15 | 33.3 | 1.19 | +742 | +200 | -1,980 | 0.102 | 0.0/0.0 | 0.0/0.0 | -0.04 |

| sizing | $ 2021-24 | $ 2025 | $ 2026 | max DD 2026 | eval 2 wk 2026 pass/fail | eval 1 mo 2026 pass/fail |
|---|---|---|---|---|---|---|
| LIT rule ($800 to 20 pts) | +7,458 | -15,119 | -1,439 | -3,063 | 0.0/0.0 | 2.4/6.3 |
| $500 risk | +7,941 | -12,183 | +832 | -2,310 | 0.0/0.0 | 2.4/0.0 |
| $300 risk | +4,253 | -7,542 | +569 | -1,401 | 0.0/0.0 | 0.0/0.0 |
| 2 micros | +2,365 | -3,387 | +774 | -986 | 0.0/0.0 | 0.0/0.0 |
| 5 micros | +5,914 | -8,467 | +1,934 | -2,465 | 0.0/1.5 | 0.0/6.3 |
| 10 micros | +11,827 | -16,934 | +3,869 | -4,930 | 9.3/12.7 | 22.9/32.2 |
| eval path (LIT rule, capped at 60% of the room) | - | - | - | - | 0.0/0.0 | 2.4/0.0 |

Eval path in 2021-24: 4.9/0.0 in 2 weeks, 9.4/0.0 in a month; 2025: 0.0/0.0, 0.0/0.0.

## Does a stop cap help? (max stop 60 / 80 / 120 / 200 / 400 pts, R per period)

| version | cap 60 | cap 80 | cap 120 (used) | cap 200 | cap 400 |
|---|---|---|---|---|---|
| S/R bounce PD/ON | +86 / +76 / +11 | +88 / +75 / +16 | +91 / +74 / +17 | +87 / +71 / +19 | +85 / +70 / +18 |
| EMA opening hour | +66 / +16 / +12 | +65 / +67 / +23 | +84 / +58 / +14 | +88 / +51 / -9 | +86 / +60 / -12 |
| EMA ribbon 15m | +94 / +7 / -9 | +133 / +17 / +4 | +96 / +26 / +7 | +103 / +17 / +5 | +103 / +20 / +3 |
| PD/ON break, limit | +73 / +5 / +35 | +90 / -1 / +45 | +98 / -2 / +47 | +94 / -1 / +50 | +94 / +4 / +48 |
| ORB 15 min | +1 / +4 / 0 | +30 / +2 / +1 | +76 / +6 / +3 | +83 / +11 / -7 | +80 / +16 / -7 |

(R in 2021-24 / 2025 / 2026.) The bounce does not care about the cap. For the opening-hour EMA the cap matters in 2026: NQ
at 25,000 makes the 3-bar opening stops wide (median 79 pts in 2026 vs 55 in 2021-24) and the widest ones lose. An 80-pt
cap (the LIT limit) is as good as 120 for both.

## Which size fits

- **In $, $300-$500 fixed risk a trade fits best.** It keeps every trade worth the same, so the R edge shows up in $. The LIT
  rule ($800 up to 20 pts, then less) shrinks these strategies too much in 2026: their stops are mostly 25-80 pts, so the
  bounce made +$27 in 2026 at the LIT rule vs +$6.1k at $500 risk. Fixed micros (5 or 10) make more $ but ignore the stop:
  a 100-pt stop at 10 micros risks $2,000 = the whole eval, and fail rates jump to 50-80%.
- **For an MFFU 50K eval** none of them is good. At $500 risk the 2-week pass/fail in 2026 is 15.6/25.9 (bounce), 17.6/48.8
  (opening hour), 15.1/25.9 (ribbon); LIT is 31.6/1.0. The eval-path sizing (LIT micros capped at 60% of the room to the
  trailing max loss) never failed an eval here, because the size shrinks as the room shrinks, but it passes slowly: bounce
  12.2% in 2 weeks / 18.0% in a month in 2026 (20.8 / 27.4 in 2021-24), opening hour 1.5% / 1.5%.
- So: if one of these runs on a second account, run it funded-style at **$300-$500 a trade** (bounce at $300: +$25.2k /
  +$20.9k / +$4.2k, max DD -$4.0k in 2026, 0% failed evals in 2 weeks in 2025 and 2026), not as an eval-passing tool.

## Verdict

- **Do they make money? Some versions, yes, measured honestly:** the PD/ON bounce, the 8/21 opening-hour EMA and the 15m
  ribbon made money in 2021-24, 2025 and 2026 with costs in, structural stops and parameters chosen before 2025. The best
  robust one made about $1,000 a month in 2021-24, $2,950 a month in 2025 and $630 a month in 2026 at $500 risk.
- **How much next to LIT:** much less. LIT 2026 is PF 4.07 and +$43.4k; the best retail version is PF 1.16 and +$6.1k, with
  a losing Jul-Oct 2026. MACD and supply/demand did not hold up out of sample in any version picked fairly.
- **As a second strategy:** low correlation with LIT (-0.1 to +0.13 for the robust ones) is the good part. **Paper-trade the
  PD/ON bounce and the opening-hour EMA** (both rules are short enough for the cloud monitor) and judge them on live paper
  months before any account. Nothing here changes LIT; `engine/lit.py`, `live_model*.json` and the live loop are untouched.
- Open idea: the bounce and LIT both live on prior-day levels; a bounce only on levels LIT did not sweep that day would be the
  natural next test.
