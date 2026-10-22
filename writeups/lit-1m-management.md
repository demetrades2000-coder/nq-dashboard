## In one minute

- **The order (owner, 2026-10-18):** "trading off the 1-minute timeframe for entry, smart loss management, think like a person,
  not how a bot would trade."
- **The question:** what would an experienced tape reader do on the 1m chart, from the moment the limit is tapped to the exit?
  We tested that in three groups:
  - **1m entry intelligence (5 ideas, 50 variants).**
  - **"The trade is wrong" exits (6 signals, 69 variants, full and half exits).**
  - **Human profit management (3 ideas, 31 variants), plus 3 combinations.**
- **The answer, in plain words:**
  - **On LIT's 1m chart, a losing trade and a winning trade look the same for the first 30-60 minutes.**
    - In Jan-Jun the winners barely dipped: the median low was 0.12R against the entry.
    - In Jul-Oct the winners dipped as deep as the losers before they ran: a median of 0.54R, and 57% went 0.5R or more
      against us.
    - So every "the trade is wrong" signal a person would act on (a 1m CISD against, a new 1m low, price back below the swept
      level, the higher low taken, a volume surge against) catches most of the losers. It also kills the Jul-Oct winners, and
      those winners pay for the losers.
  - **The 1m entry filters remove winners as often as losers,** in both halves. Today's entry is the best one found: the
    first 1m CISD after the tap, at the next open.
  - **One signal is real: ES not confirming.** When ES (the S&P future) breaks its own sweep low (for a long) on a 5m
    close, and NQ then prints a 1m CISD against us, before we are +0.75R, the trade is wrong.
    - It fired on 8 of the 120 trades in 2026. All 8 were going to be full stop-outs.
    - Exiting saved about half of each loss, and no winner was touched.
- **Recommendation:**
  - **Adopt-candidate, small:** the ES exit. In 2026 it adds +$446 in Jan-Jun and +$1,514 in Jul-Oct on the eval path. The
    2-week pass and fail rates are unchanged. The 1-month pass rate rises from 60.2% to 64.8% (H1) and from 47.4% to 50.0%
    (H2). It rests on only 8 trades, and on 5m bars in Apr-Dec 2025 (no 1m data there) it changed 4 trades and broke even.
  - **Keep everything else as it is:** the 1m CISD entry at the next open, the breakeven at 1R, the VIX target and the
    sweep-extreme stop.

## How this was done

- **Data:** CME NQ1! 5m with true 1m bars for every 2026 day (data/NQ_1m.csv; 119 of the 120 trades are on 1m days). ES1!
  5m (data/ES_5m.csv, from 2025-04) for the ES signal. Futures only.
- **The signals are the live ones:** the same 5m LIT setups, the same 30-min limit at the 5m CISD level, the same 1m CISD
  within 20 bars and the same stop 1 tick beyond the sweep extreme.
  - `tools/lit_1m_manage.py` wraps `engine/lit.py` (not edited). With every new option off it gives run `lit_live` trade for
    trade (120 trades, +$41,734) and run `lit_tight_eval_800_25_room60` at the eval size (`check`).
- **No look-ahead:** every decision uses closed 1m bars (ES: closed 5m bars) and acts at the next 1m open, minus 1 tick of
  slippage. A "touch" exit is a resting stop order: it fills at its level, or at the bar's open on a gap, minus 1 tick.
- **Money:** the eval sizing that is live in `lit_sizing` mode "eval":
  - $800 up to a 25-pt stop, then 800 × 25 ÷ stop;
  - times the weekly stop;
  - then never more than 60% of the room to the trailing max-loss floor (`engine/sizing.py` lit_qty).
  - Costs: $1.40 per micro and 1 tick of slippage. The MFFU $1,000 soft daily limit applies.
  - Net $, drawdown and the eval columns come from MFFU 50K evals played back to back. The eval odds count a fresh eval
    started on every session.
  - A losing early exit counts as a stop-out for the weekly stop.
- **Judging (owner, LIT):** pick on 2026 H1 (Jan 2 - Jun 30), check on H2 (Jul 1 - Oct 16). A rule is adopted only if both
  halves make more money at 2-4 trades a week.
  - 2021-25 has no 1m bars, so none of these rules can be tested there.
  - The ES exit was also run on 5m bars in Apr-Dec 2025 as a rough reference (below).
- **Results files:**
  - `research/lit/m1_results.json`: every variant.
  - `research/lit/m1_diag.json`: trade by trade, losers cut vs winners killed.
  - `research/lit/m1_es_2025.json`: the 2025 reference.

## 1. What the 1m chart tells us after entry

How the 120 trades of 2026 end:

| Half | Trades | Stop-outs | Breakeven | Target | End of day | Winners' median dip before they run | Winners that dip ≥ 0.5R | Losers' median best point | Minutes to the stop (median) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 | 80 | 32 | 29 | 15 | 4 | **0.12R** | 22% | +0.27R | 42 |
| H2 | 40 | 21 | 5 | 10 | 4 | **0.54R** | 57% | +0.30R | 44 |

- **Losers never work:** their best point is about +0.3R, and they take 40-45 minutes to reach the stop. A person watching would
  "know" they are wrong.
- **But in H2 the winners look exactly like that too** for their first part. That is why the human exits below win in H1 and lose in
  H2. It is the most important thing this study found: **the 1m chart cannot tell a LIT loser from a slow LIT winner.**

## 2. "The trade is wrong" signals: real or noise

Each signal exits the whole trade at the next 1m open. It only works while the trade has not yet worked (its best point so far is
under the R shown). The $ are per trade at the eval size, compared with the live exit of the same trade.

| Signal (exit at the next 1m open) | H1 losers cut early | H1 $ saved | H1 winners killed | H1 $ lost | H1 net | H2 losers cut early | H2 $ saved | H2 winners killed | H2 $ lost | H2 net | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **ES exit** (ES new 5m close beyond its extreme + 1m CISD, < +0.75R) | 3/32 | +458 | **0/18** | +0 | **+458** | 5/21 | +1,178 | **0/14** | +0 | **+1,178** | **real** |
| ES exit on an ES wick (< +0.75R) | 6/32 | +552 | 1/18 | -5,400 | -4,656 | 7/21 | +1,398 | 1/14 | -368 | +900 | noise |
| 1m CISD against before +0.25R | 22/32 | +5,834 | 2/18 | -3,525 | +1,331 | 15/21 | +3,869 | 6/14 | -10,625 | -7,114 | noise |
| 1m CISD against before +0.5R | 28/32 | +7,722 | 6/18 | -17,028 | -10,169 | 19/21 | +4,963 | 8/14 | -11,404 | -6,800 | noise |
| 1m CISD against before +1R | 31/32 | +8,490 | 10/18 | -25,550 | -17,207 | 21/21 | +5,926 | 11/14 | -13,662 | -7,867 | noise |
| 1m close below the CISD candle's low, first 15 min | 27/32 | +7,405 | 1/18 | -2,560 | +3,890 | 13/21 | +3,470 | 7/14 | -12,880 | -9,753 | noise |
| 1m close below the entry candle's low, first 5 min | 20/32 | +5,798 | 3/18 | -14,374 | -9,120 | 10/21 | +2,218 | 7/14 | -14,022 | -12,096 | noise |
| New low below the entry candle (stop order), first 10 min | 31/32 | +9,748 | 10/18 | -23,160 | -14,472 | 20/21 | +6,272 | 12/14 | -18,794 | -12,791 | noise |
| 1 close back beyond the swept level | 31/32 | +7,637 | 9/18 | -32,580 | -25,538 | 21/21 | +5,106 | 9/14 | -14,627 | -9,993 | noise |
| 3 closes back beyond the swept level | 26/32 | +5,868 | 7/18 | -24,140 | -19,068 | 19/21 | +3,810 | 6/14 | -11,071 | -7,628 | noise |
| 5 closes back beyond the swept level | 23/32 | +5,276 | 6/18 | -19,679 | -12,986 | 18/21 | +3,532 | 7/14 | -10,907 | -7,868 | noise |
| The 1m higher low after the fill is taken | 27/32 | +6,726 | 5/18 | -14,791 | -8,586 | 18/21 | +4,429 | 5/14 | -6,022 | -2,023 | noise |
| 1m volume surge against (2× volume, body ≥ 0.5 ATR) | 19/32 | +5,052 | 2/18 | -7,483 | -2,886 | 14/21 | +3,380 | 4/14 | -7,086 | -3,670 | noise |
| 1m volume surge against (3×) | 11/32 | +2,316 | 2/18 | -7,691 | -5,408 | 8/21 | +1,317 | 1/14 | -1,705 | -388 | noise |

What to take from it:

- **Cutting losers is easy, and that is not the problem.** Most signals catch 60-100% of the stop-outs and save $5-10k in H1 and
  $2-6k in H2.
- **The bill is the winners.** LIT wins about 1 trade in 4, and a winner is worth 5-15 losers. Killing even 1 winner in 7 costs more
  than all the saved losses.
- **"Back beyond the swept level" is the worst signal of all.** LIT winners very often trade back below the level they swept before
  they turn. On the 1m chart that is the normal path, not a failure.
- **The best-looking H1 signal is a trap.** "A 1m close below the CISD candle's low in the first 15 minutes" makes +$7.3k in H1 (PF
  8.2) and loses $11.7k in H2. That is exactly what a rule tuned on one half looks like.
- **Half-size versions** (close half on the signal, keep half) shrink both sides but leave the sign the same. The best one, a half
  exit on a 1m CISD against before +0.25R, lowers the H1 1-month eval fails from 6.2% to 3.1%, but H2 loses $1.8k.
- **ES is the exception.** It is a second market and not NQ's own path, so it does not fire on NQ's normal dips.
  - It needs both things: ES closing beyond its own sweep extreme and NQ then turning against us on 1m.
  - Close-based is better than wick-based: a wick version killed a $5.4k winner in H1.

## 3. Results at the eval size (both halves)

Net $, $ per month, drawdown and the eval columns come from MFFU evals played back to back; the eval odds start a fresh eval on every
session. "Avg win / loss" is per trade at the eval size.

| Rule | Half | Net $ | $/mo | PF | Trades/wk | Win % | Max DD | Avg win / loss $ | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **LIT live, eval size (today)** | H1 | +33,305 | 5,464 | 4.01 | 3.12 | 22.5 | -2,513 | 2,731 / -195 | 37.5 / 3.1 | 60.2 / 6.2 | 92.3% | 10.5 |
| | H2 | +10,465 | 2,818 | 2.51 | 2.56 | 35.0 | -2,157 | 1,390 / -300 | 29.5 / 0.0 | 47.4 / 0.0 | 95.7% | 17.5 |
| **ES exit** (5m close + 1m CISD, < +0.75R) | H1 | **+33,751** | 5,537 | 4.18 | 3.12 | 22.5 | -2,513 | 2,731 / -188 | 37.5 / 3.1 | 64.8 / 6.2 | 92.6% | 11.0 |
| | H2 | **+11,979** | 3,225 | 2.99 | 2.56 | 35.0 | -2,086 | 1,390 / -255 | 29.5 / 0.0 | 50.0 / 0.0 | 96.0% | 18.5 |
| ES exit, simplest (5m ES close beyond its extreme, < +0.5R) | H1 | +33,358 | 5,473 | 4.03 | 3.12 | 22.5 | -2,513 | 2,731 / -195 | 37.5 / 3.1 | 61.7 / 6.2 | 92.3% | 10.5 |
| | H2 | +11,795 | 3,175 | 2.90 | 2.56 | 35.0 | -2,214 | 1,390 / -268 | 29.5 / 0.0 | 50.0 / 0.0 | 95.8% | 17.5 |
| ES exit on an ES wick, < +0.75R | H1 | +29,216 | 4,793 | 3.76 | 3.12 | 22.5 | -2,448 | 2,477 / -197 | 36.7 / 3.9 | 64.1 / 7.0 | 91.7% | 11.0 |
| | H2 | +11,502 | 3,097 | 2.88 | 2.56 | 32.5 | -2,125 | 1,469 / -242 | 29.5 / 0.0 | 50.0 / 0.0 | 97.3% | 18.5 |
| Take profit at the 18:00 open on a stall, if ≥ 1.5R away | H1 | +34,212 | 5,613 | 4.08 | 3.12 | 27.5 | -2,376 | 2,205 / -209 | 38.3 / 3.1 | 61.7 / 6.2 | 92.5% | 10.5 |
| | H2 | +11,404 | 3,070 | 2.65 | 2.56 | 37.5 | -2,157 | 1,318 / -312 | 29.5 / 0.0 | 50.0 / 0.0 | 95.8% | 17.5 |
| same, ≥ 1.0R | H1 | +32,994 | 5,413 | 3.97 | 3.12 | 27.5 | -2,376 | 2,150 / -209 | 37.5 / 3.1 | 60.2 / 6.2 | 92.1% | 10.0 |
| | H2 | +11,281 | 3,037 | 2.63 | 2.56 | 37.5 | -2,157 | 1,310 / -312 | 29.5 / 0.0 | 50.0 / 0.0 | 70.7% | 12.0 |
| same, ≥ 2.0R | H1 | +32,911 | 5,399 | 3.98 | 3.12 | 23.8 | -2,513 | 2,524 / -198 | 38.3 / 3.1 | 60.2 / 6.2 | 92.3% | 10.0 |
| | H2 | +11,404 | 3,070 | 2.65 | 2.56 | 37.5 | -2,157 | 1,318 / -312 | 29.5 / 0.0 | 50.0 / 0.0 | 95.8% | 17.5 |
| Take profit at the midnight open on a stall, ≥ 1R | H1 | +27,943 | 4,584 | 3.56 | 3.12 | 27.5 | -2,513 | 1,877 / -207 | 31.2 / 3.9 | 61.7 / 7.0 | 90.4% | 12.0 |
| | H2 | +9,219 | 2,482 | 2.31 | 2.56 | 40.0 | -2,136 | 1,082 / -325 | 20.5 / 0.0 | 41.0 / 0.0 | 95.3% | 20.0 |
| Take profit at the swept box's other side on a stall, ≥ 2R | H1 | +26,833 | 4,402 | 3.43 | 3.12 | 23.8 | -2,513 | 2,200 / -198 | 31.2 / 3.1 | 53.1 / 10.9 | 84.2% | 10.5 |
| | H2 | +9,149 | 2,463 | 2.32 | 2.56 | 35.0 | -2,157 | 1,296 / -300 | 26.9 / 0.0 | 44.9 / 0.0 | 95.5% | 18.5 |
| Exit on a 1m CISD against, before +0.25R | H1 | +32,727 | 5,369 | 5.65 | 3.12 | 22.5 | -1,758 | 2,506 / -117 | 39.1 / 0.0 | 67.2 / 0.0 | 100% | 11.0 |
| | H2 | -275 | -74 | 0.94 | 2.56 | 20.0 | -1,874 | 876 / -151 | 0.0 / 0.0 | 11.5 / 0.0 | 100% | 20.5 |
| Close HALF on a 1m CISD against, before +0.25R | H1 | +34,279 | 5,624 | 4.59 | 3.12 | 22.5 | -2,031 | 2,647 / -163 | 38.3 / 1.6 | 60.2 / 3.1 | 95.3% | 11.0 |
| | H2 | +8,660 | 2,332 | 2.46 | 2.56 | 35.0 | -2,130 | 1,076 / -247 | 19.2 / 0.0 | 38.5 / 0.0 | 95.3% | 21.0 |
| Exit on a 1m close below the CISD candle's low, first 15 min | H1 | +40,593 | 6,660 | 8.23 | 3.12 | 21.2 | -1,484 | 2,718 / -90 | 37.5 / 0.0 | 68.0 / 0.0 | 100% | 11.5 |
| | H2 | -1,195 | -322 | 0.72 | 2.56 | 17.5 | -1,958 | 1,024 / -166 | 0.0 / 0.0 | 0.0 / 0.0 | 83.3% | 26.5 |
| Close HALF on that new 1m low, first 15 min | H1 | +32,538 | 5,338 | 4.68 | 3.12 | 22.5 | -2,046 | 2,660 / -153 | 37.5 / 0.0 | 67.2 / 1.6 | 95.5% | 12.0 |
| | H2 | +7,288 | 1,962 | 2.14 | 2.56 | 32.5 | -2,048 | 1,070 / -245 | 12.8 / 0.0 | 38.5 / 0.0 | 96.4% | 19.0 |
| Exit after 3 1m closes back beyond the swept level | H1 | +18,554 | 3,044 | 3.81 | 3.12 | 22.5 | -1,992 | 1,403 / -121 | 15.6 / 0.0 | 32.0 / 0.0 | 91.8% | 18.5 |
| | H2 | +3,445 | 928 | 1.65 | 2.56 | 30.0 | -1,332 | 752 / -190 | 0.0 / 0.0 | 0.0 / 0.0 | 100% | 34.0 |
| Exit when the 1m higher low after the fill is taken | H1 | +26,230 | 4,303 | 5.26 | 3.12 | 23.8 | -1,622 | 1,824 / -104 | 29.7 / 0.0 | 57.8 / 0.0 | 100% | 13.0 |
| | H2 | +6,640 | 1,788 | 2.82 | 2.56 | 27.5 | -1,536 | 1,019 / -132 | 12.8 / 0.0 | 37.2 / 0.0 | 100% | 24.0 |
| Exit on a 1m volume surge against (3× volume, body ≥ 0.5 ATR) | H1 | +29,733 | 4,878 | 4.34 | 3.12 | 22.5 | -2,290 | 2,333 / -165 | 36.7 / 0.0 | 60.9 / 7.0 | 89.6% | 11.0 |
| | H2 | +10,014 | 2,696 | 2.62 | 2.56 | 35.0 | -1,589 | 1,273 / -239 | 23.1 / 0.0 | 41.0 / 0.0 | 100% | 22.5 |
| Stop to the 1m higher low after a 1m BOS + displacement (after 1R) | H1 | +21,085 | 3,459 | 2.90 | 3.12 | 36.2 | -2,367 | 1,253 / -236 | 22.7 / 3.1 | 45.3 / 6.2 | 89.7% | 13.0 |
| | H2 | +8,879 | 2,391 | 2.30 | 2.56 | 40.0 | -2,253 | 1,074 / -325 | 19.2 / 0.0 | 39.7 / 0.0 | 95.2% | 20.0 |
| Same, no breakeven at 1R, from the start | H1 | +19,027 | 3,122 | 2.87 | 3.12 | 45.0 | -2,532 | 1,040 / -306 | 17.2 / 0.0 | 37.5 / 0.0 | 93.9% | 19.0 |
| | H2 | +1,236 | 333 | 1.28 | 2.56 | 37.5 | -1,956 | 653 / -241 | 12.8 / 0.0 | 24.4 / 0.0 | 52.2% | 12.5 |
| No breakeven when 1R came within 5 min | H1 | +34,788 | 5,707 | 3.91 | 3.12 | 23.8 | -2,678 | 2,501 / -231 | 31.2 / 3.1 | 54.7 / 17.2 | 75.7% | 10.0 |
| | H2 | +10,465 | 2,818 | 2.51 | 2.56 | 35.0 | -2,157 | 1,390 / -300 | 29.5 / 0.0 | 47.4 / 0.0 | 95.7% | 17.5 |
| Breakeven at 2R instead when 1R came within 15 min | H1 | +20,923 | 3,433 | 2.50 | 3.12 | 22.5 | -2,762 | 2,513 / -240 | 28.9 / 3.1 | 43.8 / 12.5 | 69.6% | 9.0 |
| | H2 | +10,465 | 2,818 | 2.51 | 2.56 | 35.0 | -2,157 | 1,390 / -300 | 29.5 / 0.0 | 47.4 / 0.0 | 95.7% | 17.5 |

Trades a week stay at 3.12 (H1) and 2.56 (H2) for every exit rule, because exits don't change which setups are taken. 86% of
weeks keep 2+ trades (H1 85%, H2 81%), as live.

## 4. 1m entry intelligence: all worse

| Entry rule | H1 net $ | H1 trades/wk | H1 PF | H2 net $ | H2 trades/wk | H2 PF | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| **LIT live (the first 1m CISD after the tap, next open)** | **+33,305** | 3.12 | 4.01 | **+10,465** | 2.56 | 2.51 | keep |
| Inner 1m inducement required (a 1m swing low formed after the tap, then taken by the 1m low) | +26,064 | 1.52 | 5.49 | -1,039 | 0.58 | 0.54 | worse in both |
| Half size without an inner 1m inducement (swing up to 15 bars before the tap) | +32,857 | 3.12 | 4.68 | +4,262 | 2.56 | 1.78 | worse in both |
| 1m CISD candle body ≥ 0.5 ATR(1m) required | +17,385 | 2.38 | 2.91 | +3,161 | 1.54 | 1.70 | worse in both |
| ... half size without | +26,999 | 3.12 | 3.95 | +8,647 | 2.56 | 2.51 | worse in both |
| 1m CISD candle closes in its top half, required | +27,891 | 2.97 | 3.64 | +10,422 | 2.18 | 2.67 | worse in both |
| 1m CISD candle volume ≥ 1.5× the last 20 bars, required | +10,290 | 0.78 | 5.37 | +5,070 | 0.71 | 3.87 | worse in both, < 1 a week |
| All three (body ≥ 1 ATR, top half, volume ≥ 1.5×), half size without | +20,386 | 3.12 | 4.36 | +5,390 | 2.56 | 2.17 | worse in both |
| Absorption: the tap bar's wick ≥ 50% of its range, required | +7,247 | 1.02 | 2.52 | +2,649 | 0.71 | 1.95 | worse in both |
| ... half size without | +25,481 | 3.12 | 4.29 | +6,459 | 2.56 | 2.31 | worse in both |
| Absorption: tap bar volume ≥ 2×, half size without | +18,353 | 3.12 | 3.70 | +6,445 | 2.56 | 2.34 | worse in both |
| Absorption on the 1m low bar (wick ≥ 50%), half size without | +23,795 | 3.12 | 3.88 | +5,181 | 2.56 | 1.96 | worse in both |
| Patience: skip when price already ran > 10% of the way to the target | +28,899 | 2.89 | 4.21 | -385 | 2.18 | 0.94 | worse in both |
| ... > 20% | +33,305 | 3.12 | 4.01 | +10,501 | 2.50 | 2.47 | 1 trade, no change |
| Patience: skip when the CISD close is > 0.5R above the limit | +37,449 | 2.89 | 4.70 | +5,402 | 2.24 | 1.88 | H1 only |
| ... > 0.25R | +26,351 | 2.50 | 3.86 | -114 | 1.73 | 0.98 | worse in both |
| Pullback entry: limit at the 1m CISD candle's body 50%, 20 bars | +28,975 | 2.81 | 3.78 | +5,107 | 2.37 | 1.73 | worse in both |
| Pullback entry: candle range 50%, 10 bars | +28,831 | 2.73 | 3.46 | +305 | 2.31 | 1.04 | worse in both |

- **Why the 1m entry filters fail:** LIT's 1m confirmation already does what a person looks for. The good trades are the
  ones where the 5m setup is right, not the ones with a prettier 1m candle. Demanding a strong, high-volume 1m CISD candle
  removes as many big winners as losers.
- **The pullback entry** misses the winners that leave at once (the best ones), the same lesson as the rejected 1m limit
  refinements.
- **Patience** (not chasing) removes winners: a CISD that closes far above the limit usually means a strong move, not a late
  one.

## 5. Human profit management: nothing holds in both halves

- **Structure trail** (stop to the 1m higher low after a 1m BOS made by a displacement candle): it turns 5-8R winners into
  1-2R exits, since NQ's 1m pullbacks are deep. The best version gives −$12.2k in H1 and −$1.6k in H2.
- **Close at a key level when price stalls there** (1m CISD against after touching it):
  - At the **18:00 open, 1.5R or more away,** both halves come out a little ahead on the eval path (+$907 / +$939).
  - But per trade at the eval size, H1 loses $637. The 1.0R and 2.0R versions lose H1 money too.
  - It is a lone spike: of the 8 trades it touched, it turned 5 breakevens into profits and cut 3 targets short. Not adopted.
  - The **midnight open** and the **swept box's other side** lose in both halves.
- **Skip breakeven when the move to 1R is fast:** no H2 trade reached 1R within 5-30 minutes, so H2 is unchanged. In H1 the
  1-month eval fails jump from 6% to 17%. Rejected; the breakeven at 1R stays.

## 6. The top 3, exactly

1. **ES exit: adopt-candidate (small).** Run `lit_1m_es_exit`; options `x_es = {mfe 0.75, how "close", cisd True}`.
   - **Definition:**
     - At the fill, note ES's own extreme of the sweep: the lowest 5m low (for a long; the highest 5m high for a short) from
       30 minutes before the NQ sweep extreme to the last 5m bar closed before the fill.
     - While the trade's best point is still under +0.75R, watch ES.
     - Once a closed ES 5m bar **closes** beyond that extreme, wait for the next NQ 1m CISD against the trade. That is a
       1m close beyond the open of the last run of with-trade candles into the high since the fill.
     - Exit at the next 1m open (market, 1 tick of slippage).
   - **Numbers (eval size):**
     - H1 +$33,751 (+$446), PF 4.18, DD −$2,513, 2-week eval 37.5 / 3.1, 1-month 64.8 / 6.2, pass rate 92.6%.
     - H2 +$11,979 (+$1,514), PF 2.99, DD −$2,086, 2-week 29.5 / 0.0, 1-month 50.0 / 0.0, pass rate 96.0%.
     - 3.12 / 2.56 trades a week.
   - **Per trade:** 8 trades cut, all would-be stop-outs, exited at a median of about −0.57R instead of −1R. +$458 in H1
     (3 trades), +$1,178 in H2 (5 trades), no winner touched.
   - **Neighbours:** every close-based version gains in both halves (under +0.25R, +0.5R or +0.75R, with or without the
     1m CISD). Wick-based versions lose a $5.4k winner in H1 at +0.75R.
   - **Reference, Apr-Dec 2025 (5m only, coarser):**
     - It changed 4 of 87 trades: 3 stop-outs cut a little earlier, and 1 breakeven turned into a −38.5-pt loss.
     - Net +$17 in total at the eval size (trade by trade, no room cap), and −$723 on the eval path. Not a confirmation, not a contradiction: too few
       trades.
   - **To wire it:** the live loop needs ES 5m bars (the cloud monitor already loads ES for SMT; `engine/live.py` has
     `ES=F`). It is a market exit, so the NinjaTrader route needs `route_all_exits`.
2. **Take profit at the 18:00 open on a stall at ≥ 1.5R (rejected: a lone spike).** Run `lit_1m_o18_stall`; options
   `p_lvl = {lv ["o18"], min_r 1.5}`.
   - **Definition:**
     - The 18:00 open lies between entry + 1.5R and the target.
     - Once price has traded to it, the next 1m CISD against, with the price still above the entry, closes the trade at the
       next open.
   - **Numbers:**
     - H1 +$34,212 (+$907), PF 4.08, 2-week 38.3 / 3.1, 1-month 61.7 / 6.2.
     - H2 +$11,404 (+$939), PF 2.65, 2-week 29.5 / 0.0, 1-month 50.0 / 0.0.
   - **Why rejected:** per trade it is −$637 in H1, and 1.0R / 2.0R lose H1 money. It rests on 8 trades.
3. **Close half on a 1m CISD against before +0.25R (rejected: H1 only).** Run `lit_1m_halfcut_cisd`; options
   `x_cisd = {mfe 0.25}`, `cut_frac 0.5`.
   - **Definition:** while the trade's best point is under +0.25R, a 1m close beyond the open of the last with-trade run
     into the high closes half the micros (rounded down) at the next open. The rest runs on the live rules.
   - **Numbers:**
     - H1 +$34,279 (+$974), PF 4.59, DD −$2,031 (better), 1-month eval fails 6.2% → 3.1%, pass rate 95.3%.
     - H2 +$8,660 (−$1,805), PF 2.46, 2-week passes 29.5% → 19.2%.
   - **Why rejected:** H2 winners dip first; the full-exit version makes H2 lose money (−$275).

## Honest caveats

- **Thin samples.** 2026 has 120 trades, 53 of them stop-outs. The ES exit rests on 8 trades, and its 2026 gain ($1.9k)
  is the size of one average winner.
- **H1 and H2 are different markets for this question.** H1 winners ran almost straight away, H2 winners dipped first. Any
  rule picked on H1 that cuts early dips will look great there and fail in H2. That is what the pick/check split is for.
- **The eval-path $ move with the order of passes and fails** (a different trade can start a new eval). The per-trade
  table in section 2 is the cleaner like-for-like comparison.
- **No 1m bars before 2026**, so 2021-25 can't test these rules. The ES reference on 5m bars (Apr-Dec 2025) is coarse.
- **Paper only.** Nothing live changed: `live_model.json`, `engine/lit.py`, `engine/lit_live.py`, `STRATEGY.md` and the
  dashboards are untouched.

## Files and how to rerun

- `python -X utf8 tools/lit_1m_manage.py check`: options off == `lit_live` (120 trades, +$41,734) and the eval base.
- `python -X utf8 tools/lit_1m_manage.py grid entry|loss|profit|more`: every variant → `research/lit/m1_results.json`
  (about 5 minutes per group, 1 process).
- `python -X utf8 tools/lit_1m_manage.py diag [names]`: losers cut vs winners killed → `research/lit/m1_diag.json`.
- `python -X utf8 tools/lit_1m_manage.py save`: stores the `lit_1m_*` runs (family other, tags lit, lit_1m).
