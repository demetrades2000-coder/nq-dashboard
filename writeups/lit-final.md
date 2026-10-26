## In one minute

- **The order (owner, 2026-10-18):** LIT is now the strategy. Tune it and judge it on **2026 only** (Jan 2 to Oct 16). 2021-25 is
  shown as a reference line, never as a pass/fail test.
- **What was done:**
  - Four studies each tuned one part of LIT: entry, sessions, risk and filters.
  - Their winning pieces were merged into one rule set in `engine/lit.py` (`run_x`). The final variant is defined in one place,
    `research/lit/lit_final.json`.
  - The pieces were then tested together, with neighbouring settings around them, and put through a critic pass.
- **How the final was picked:**
  - On **Jan-Jun 2026 (H1)**, by H1 profit **without its 3 best trades**, so one lucky trade cannot choose the strategy.
  - Then checked on **Jul-Oct 2026 (H2)**, which was not used to choose.
- **Result:** LIT final makes **+$38,873 in 2026** (PF 3.06, $3,963 a month, 3.1 trades a week, max drawdown −$3,097). It
  stays profitable in both halves, with every one of 23 neighbouring settings, and with 2 extra ticks of slippage.
- **The honest part:**
  - **H1 was tuned, H2 was not.** H1 made +$30.7k. H2, the out-of-sample half, made +$8.2k (PF 2.19, about **$2,200 a month**).
    Plan on the H2 rate, not the full-year average.
  - **The old bot did better in H2.** Over the same Jul-Oct months it made +$15.6k. The old bot was locked using all of 2026,
    so its H2 is not out of sample either.
  - **The edge needs 1-minute bars.** Run on 5-minute bars, the same rules make only +$6.6k in 2026.
  - **2021-25 shows no edge** (PF 1.03). There is no 1m data for those years, so the 1m entry can't be tested there.
  - **It is mostly a London-morning strategy:** 100 of the 127 trades in 2026 entered between 02:00 and 08:00 ET.

## The rules (what the bot does, in order)

Market: NQ futures traded as MNQ micros ($2 a point). Setups are found on 5-minute bars. Entries and exits run on true 1-minute
bars when the day has clean 1m data (every 2026 session but one). All times are New York (ET). The trading day runs 18:00 to 17:00.

1. **Mark the liquidity.** Every level counts:
   - **Session boxes:** the high and low of each session:
     - Asia: 18:00, 19:00 or 20:00 to midnight.
     - London: 02:00-05:00, 03:00-04:00 and 02:00-03:00.
     - New York: 08:00-09:00, 08:30-09:30, 09:30-10:00 and 09:30-10:30.
     - Premarket: 04:00-09:30.

     A box counts only once its last candle has closed.
   - **Daily, weekly and monthly levels:** the previous day's high and low (PDH/PDL), the previous week's (PWH/PWL) and the
     previous month's (PMH/PML).
   - **Opening gaps:** both edges of the weekly gap (NWOG, Friday 17:00 close to Sunday 18:00 open) and of the daily gap (NDOG).
   - **Equal highs and lows ("build-ups"):** two 5m swing lows (or highs) within 0.15 ATR of each other, at least 3 candles apart,
     not traded through between them.
2. **Wait for a sweep.**
   - Price makes a new 2-hour low, the **extreme**. That move must take out a level that had not been traded through before.
   - The level must be taken in the 2 hours before the extreme.
   - The extreme must be at least **0.5 ATR** (14-bar, 5m) below the nearest level it took.
   - A swept low arms a **long**; a swept high arms a **short**. Shorts mirror everything below.
3. **Check the inducement.**
   - Before the sweep, there was at least one small 5m swing low **above** the swept level, at most **1.0 ATR** above it, made
     in the last **36 candles** (3 hours) before the sweep.
   - It stayed untouched until the final drop into the extreme took it, so early buyers were trapped.
4. **Wait for displacement and a structure shift (CISD).**
   - Find the last run of down-close 5m candles into the extreme. Its first open is the **CISD level**.
   - The trigger is the first 5m candle that closes above it.
   - Between the extreme and the trigger, at least one candle body must be **≥ 0.8 ATR**.
   - The candle after the trigger must open between **02:00 and 15:30**.
5. **Enter with a 1-minute confirmation.**
   - Place a limit at the CISD level, valid for **30 minutes** (6 five-minute candles).
   - When price taps it, wait up to **20 one-minute candles** for a 1m CISD: a 1m close above the open of the last run of 1m
     down-close candles into the low made since the tap.
   - Then **buy at the next 1m open** (+1 tick of slippage).
   - **Cancel** if any of these happens first:
     - price breaks the sweep extreme;
     - the target trades before the tap;
     - 30 minutes pass without a tap, or 20 minutes without the 1m confirmation;
     - it is 15:55.
6. **Stop:** 1 tick (0.25 pt) beyond the **sweep extreme**. Skip the setup if the planned stop (limit to stop) is under 8 or
   over 80 points. Size follows the stop at the real fill.
7. **Target: the VIX one-day band.**
   - **One VIX move** = yesterday's VIX close ÷ 100 ÷ √252 × the 18:00 open.
   - Long target: the 18:00 open **+ 1 move**. Short target: the 18:00 open **− 1 move**.
   - The target must be at least **1.5R** from the fill. If it is farther than **8R**, take profit at 8R.
   - If the band is behind price or less than 1.5R away, there is **no trade**.
8. **Manage the trade.**
   - Move the stop to **breakeven at +1R**.
   - Be flat by **15:55**.
   - Take **1 trade a day**, never two at once.
9. **Size:**
   - $800 risk up to a 20-point stop. Beyond that, 800 × 20 ÷ stop.
   - MNQ micros, rounded down, maximum 40.
   - In 2026 the median stop is 47 points: 3 micros, about **$290 at risk**.
   - No cold-streak filter.

Costs in every number below: $1.40 per micro round trip, plus 1 tick of slippage on market entries and on stop, breakeven and
end-of-day exits. Limit fills and targets fill at their price.

**Where each piece comes from:**
- **Entry study** (`lit_entry_best`): the CISD shift, inducement, displacement 0.8, the 1m confirmation and the 30-minute limit.
- **Risk study** (`lit_risk_vix_bank8`): the VIX-band target, the 8R bank, the 1-tick stop buffer and 1m execution.
- **lit_A**: everything else.
- **Dropped in the merge:** two risk-study settings, the 4R fallback target and stops up to 100 points. Neither changed H1 or H2
  by more than $0.5k once the other pieces were in, so the simpler lit_A value is used.

## Results (same 1,278 sessions as the old bot, costs included)

| | Trades/wk | % weeks 2+ | Win % | PF | Net $ | $/month | Max DD | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate | Median sessions to pass |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **LIT final, 2026 full** | 3.08 | 90% | 23.6 | **3.06** | **+38,873** | **3,963** | −3,097 | 29.1 / 9.2 | 48.1 / 16.0 | 79.9% | 12 |
| LIT final, 2026 H1 (picked on) | 3.32 | 89% | 18.8 | 3.55 | +30,661 | 5,030 | −3,097 | 32.8 / 14.8 | 52.3 / 25.8 | 66.3% | 8 |
| LIT final, 2026 H2 (check) | 2.69 | 88% | 33.3 | 2.19 | +8,212 | 2,211 | −1,741 | 23.1 / 0.0 | 41.0 / 0.0 | 100% | 22.5 |
| LIT final, 2021-25 (reference) | 2.49 | 78% | 18.4 | 1.03 | +3,806 | 75 | −20,695 | 7.1 / 16.3 | 15.0 / 39.2 | 31.6% | 20 |
| **Old bot (`baseline`), 2026 full** | 2.16 | 71% | 25.8 | 3.94 | +20,487 | 2,088 | −2,249 | 20.4 / 0.0 | 34.0 / 0.0 | 100% | 18 |
| Old bot, 2026 H1 | 2.03 | 70% | 19.2 | 2.06 | +4,919 | 807 | −1,959 | 9.4 / 0.0 | 17.2 / 0.0 | 100% | 19.5 |
| Old bot, 2026 H2 | 2.37 | 69% | 35.1 | 7.62 | +15,568 | 4,191 | −1,170 | 38.5 / 0.0 | 61.5 / 0.0 | 100% | 12 |
| Old bot, 2021-25 (reference) | 3.17 | 92% | 21.1 | 1.27 | +16,379 | 321 | −9,265 | 4.1 / 1.9 | 8.8 / 5.2 | 55.3% | 32.5 |
| *LIT final, eval-safe option, 2026* | 3.08 | 90% | 23.6 | 3.17 | +27,761 | 2,830 | −2,343 | 16.5 / 0.0 | 35.4 / 5.8 | 86.0% | 21 |
| *LIT final, eval-safe option, 2021-25* | 2.49 | 78% | 18.4 | 1.19 | +14,219 | 279 | −11,414 | 5.5 / 6.9 | 11.4 / 18.3 | 39.7% | 27 |

How to read the eval columns:
- **The test:** a fresh MFFU Builder 50K eval is started on every session ($3,000 target, $2,000 trailing drawdown).
- **"2 wk" / "1 mo":** passed or failed within 10 or 20 sessions.
- **Pass rate:** passed ÷ (passed + failed), over evals run up to 60 sessions.
- **H1 and H2 pass rates** only see their own half, so evals that start near the end of a half are still open and don't count.
- **LIT final, other 2026 numbers:** 3-week pass/fail 41.3% / 12.1%. 38.8% of passes take more than 15 sessions. Back to back,
  10 evals passed and 3 failed.

**Eval-safe option** (`how_out: 0.5` in `lit_final.json`). This is the filter study's size rule: half size when the sweep
extreme falls outside the Tuesday 03:00 to Wednesday 11:30 high/low-of-week window.
- It costs about $11k in 2026: −$9.8k in H1 and −$1.3k in H2.
- In return, no eval failed within 2 weeks, the 2026 drawdown fits inside the $2,000 eval limit more often, and the 2021-25
  drawdown halves.
- It is not the final because it makes less money in both halves. It is the switch to flip if eval failures matter more than
  money.

## Month by month, 2026

| Month | LIT trades | LIT wins | LIT net $ | Worst drawdown inside the month | Old bot trades | Old bot net $ |
|---|---:|---:|---:|---:|---:|---:|
| Jan | 18 | 4 | +10,824 | −2,806 | 10 | +2,444 |
| Feb | 14 | 2 | +1,780 | −1,906 | 6 | −368 |
| Mar | 12 | 3 | +5,508 | −1,191 | 9 | +4,443 |
| Apr | 14 | 2 | +5,513 | −1,070 | 8 | −290 |
| May | 18 | 3 | +4,798 | −2,086 | 12 | −1,096 |
| Jun | 9 | 2 | +2,239 | −353 | 7 | −213 |
| Jul | 9 | 2 | +498 | −1,444 | 7 | −120 |
| Aug | 11 | 2 | −466 | −1,739 | 13 | +4,975 |
| Sep | 14 | 5 | +1,728 | −1,341 | 10 | +7,294 |
| Oct (to the 16th) | 8 | 5 | +6,452 | −620 | 7 | +3,420 |

- **LIT:** 9 of 10 months are positive.
- **The two bots peak at different times.** LIT is strongest in Jan-Jun. The old bot is strongest in Aug-Sep, when LIT was flat.
  That points to an idea for later: run both.

## How the pieces were merged (2026, before the two neutral settings were dropped)

| Variant | H1 net $ | H1 without its top 3 trades | H2 net $ | 2026 net $ | 2026 PF | 2026 max DD | Trades/wk | 2021-25 PF |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| lit_A (starting point) | −4,420 | −10,357 | +9,679 | +5,258 | 1.26 | −6,883 | 2.99 | 1.15 |
| Entry study pick (E) | +15,990 | +6,114 | +3,851 | +19,841 | 2.13 | −2,669 | 2.99 | 1.00 |
| Risk study pick, no bank (R) | +23,592 | −1,270 | +11,691 | +35,282 | 2.64 | −3,814 | 3.45 | 1.28 |
| Risk study pick, bank 8R (R8) | +11,786 | −1,270 | +10,531 | +22,317 | 2.04 | −3,814 | 3.45 | 1.24 |
| R + E (no bank) | +32,558 | −117 | +5,331 | +37,888 | 2.93 | −6,192 | 3.20 | 1.08 |
| **R8 + E (picked)** | +30,870 | **+14,845** | +7,734 | +38,605 | 2.98 | −3,125 | 3.20 | 1.04 |
| R8 + E + sessions sweep set | +31,777 | +15,752 | +9,747 | +41,524 | 4.34 | −3,207 | 2.28 (H2 1.92) | 0.78 |
| R8 + E + NWOG/HOW filters | +10,562 | −856 | +3,272 | +13,833 | 2.35 | −2,142 | 2.09 | 1.04 |
| R + sessions | +12,091 | +1,545 | +6,058 | +18,150 | 2.58 | −2,846 | 2.50 | 1.29 |
| R + filters | +19,479 | −2,236 | +4,226 | +23,705 | 3.40 | −3,262 | 2.31 | 1.29 |

- **No bank:** without the 8R bank, almost all of H1's profit sits in one to three trades. "Without its top 3" falls to about $0.
- **Sessions sweep set:** adding it scores a little higher on the H1 test. It is not used, for three reasons:
  - it cuts trading below 2 a week in H2 (1.92);
  - the H1 gain is within noise ($0.9k);
  - its 2021-25 line collapses (PF 0.78).
- **Other pieces:** the NWOG filter, the Monday-Wednesday rule and the full filters package all lowered H1 on top of R8 + E.
- Every variant with numbers: `research/lit/final_results.json`.

## What the critic found (`research/lit/final_critic.json`)

**Halves and months.**
- **H1 / H2:** +$30.7k (PF 3.55) and +$8.2k (PF 2.19). Profitable out of sample, but about 2.3 times weaker per month.
- **Odd / even months of 2026:** odd months PF 3.23, +$23.4k (71 trades). Even months PF 2.84, +$15.5k (56 trades).

**Slippage.** Each trade is small (median 3 micros), so extra ticks cost little:
- **+1 tick:** 2026 +$38.5k, PF 3.01.
- **+2 ticks:** 2026 +$38.2k, PF 2.97; H2 +$8.0k.

**Each piece removed, one at a time** (2026 H1 / H2 net):

| Removed | H1 | H2 | 2026 | Verdict |
|---|---:|---:|---:|---|
| (none, the final) | +30,661 | +8,212 | +38,873 | |
| CISD shift → lit_A fractal break | +1,557 | +4,939 | +6,496 | needed in both halves |
| Inducement gate | +28,917 | +7,088 | +36,006 | helps both (small) |
| Displacement back to 1.0 ATR | +21,840 | +1,863 | +23,703 | needed in both |
| 1m confirmation (plain limit fill instead) | +23,619 | +6,456 | +30,075 | needed in both |
| 30-min limit → 60 min | +28,537 | +8,057 | +36,594 | helps both (small) |
| Whole entry study (= R8 with lit_A's 80-pt max stop, no fallback) | +10,827 | +8,405 | +19,232 | H1 +$19.8k, H2 neutral |
| VIX band → PDH/PWH/PMH targets | +28,141 | +6,885 | +35,026 | helps both |
| Bank 8R → 5R | +18,192 | +4,392 | +22,584 | needed in both |
| 1-tick stop buffer → 2 pts | +30,085 | +5,232 | +35,317 | helps both, mostly H2 |
| **1m execution → everything on 5m** | +5,361 | +1,253 | +6,614 | **the edge needs 1m bars** |
| Whole risk study (= `lit_entry_best`) | +15,990 | +3,851 | +19,841 | needed in both |

**23 neighbouring settings.** All are profitable in both halves of 2026. The 2026 net ranges from +$26.9k to +$44.3k (PF 2.45 to
3.49). The ones tried:
- VIX move 0.9 / 1.1
- bank 7R / 9R
- 1m confirmation 15 / 30 bars
- inducement within 0.75 / 1.25 ATR, and age 24 / 48 bars
- limit valid 4 / 8 bars
- displacement 0.7 / 0.9
- max stop 70 / 90
- minimum target 1.25R / 2R
- breakeven 0.75R / 1.5R
- sweep depth 0.4 / 0.6
- stop buffer 1 pt

Weak spots:
- **Inducement within 0.75 ATR:** H2 only +$0.9k (PF 1.13).
- **Breakeven at 0.75R:** H2 +$3.1k.
- **Bank 9R:** H2 +$4.2k.
- **1m confirmation within 15 bars:** H1 drops to +$19.9k.

The best neighbour is an inducement age of 24 bars: +$44.3k, and better in both halves (H2 +$13.2k). It was **not** adopted.
Switching to it would mean choosing on H2, which the guard forbids. It does show the region around the final is solid.

**Pieces from the other two studies, added on top:**
- **4R fallback target and stops up to 100:** no effect, ±$0.4k.
- **HOW half size:** −$11.1k, but safer evals (see above).
- **NWOG discount filter:** −$19.0k.
- **Monday-Wednesday rule:** −$5.5k.
- **Sessions sweep set:** +$2.5k, but 2.2 trades a week and PF 0.76 in 2021-25.

**Concentration.**
- The win rate is 23.6%. The average winner is +$1,926 and the average loser −$195.
- The 3 best trades are **41%** of 2026's net. Without them, 2026 is still +$22.8k, but H2 is only +$0.9k.
- 2026 had a run of **14 trades in a row with no winner**: 11 stops plus breakevens.
- The worst day was −$755.

**Longs and shorts.** Both made money in 2026: longs +$17.2k (PF 3.31), shorts +$21.7k (PF 2.89). In H2, longs made only +$2.0k
(PF 1.79).

**When trades happen (2026).**

| Entry time | Trades | Net $ | PF |
|---|---:|---:|---:|
| London, 02:00-08:00 | 100 | +31.7k | 2.94 |
| NY morning, 08:00-12:00 | 23 | +4.8k | |
| NY afternoon | 4 | +2.4k | |

**2021-25 reference** (5m bars only, so the 1m confirmation runs on 5m candles):
- PF 1.03, +$3.8k, max DD −$20.7k.
- By year: 2021 (Nov-Dec only) −$3.9k, 2022 +$11.8k, 2023 −$13.3k, 2024 +$4.7k, 2025 +$4.5k.
- No edge outside 2026 on 5m. That is consistent with the "everything on 5m" line above.

**Data bug found and fixed.**
- **What was wrong:** on 12 days of 2026 (Jan 14-15 and Aug 31 to Sep 14), the 1m regular-session bars in `data/NQ_1m.csv` sit on
  another contract's price basis. They are a constant +765.75 or +295.75 points away from the back-adjusted 5m file.
- **The fix:** `engine/lit.bars_1m` now checks every 1m window against its 5m bar. It shifts constant-offset windows onto the 5m
  basis and drops anything else that doesn't match.
- **Effect on the earlier studies' 2026 numbers:**
  - entry study: +$20.5k → +$19.8k;
  - risk study, no bank: +$36.4k → +$35.3k.
- Every number in this write-up uses the fixed data. The bug also affects any other study that fills trades on the 1m file
  (`engine.data.load_ltf`); that loader was not changed.

## What to watch before and during paper trading

1. **It needs a live 1-minute feed.** The edge is in the 1m confirmation; on 5m bars it mostly disappears.
   - The cloud monitor polls Yahoo `NQ=F` every 15 minutes, which is far too slow.
   - The NinjaTrader bar feed (`LE_BarFeed.cs`) writes 5m bars.
   - **Update 2026-10-18:** LIT is now wired into the paper bot (`live_model.json` model `lit`, `engine/lit_live.py`). Both the
     PC bot and the cloud monitor fetch 1m bars (stored `data/NQ_1m.csv` + Yahoo `NQ=F` 1m, 7 days) and run the same executor;
     `tests/test_lit_live.py` replays every 2026 session through it and gets the backtest's trades. The cloud monitor now runs
     every 30 minutes from 02:00 ET, so its alerts can be ~30 minutes late; its paper ledger still records every trade at the
     model's prices. `engine/model.py` and the Pine script are untouched.
2. **It trades the London morning.** 79% of trades enter between 02:00 and 08:00 ET, and MFFU requires the owner to be present
   for live trading.
   - **New York only (08:00-15:30):** 44 trades in 2026 (1.1 a week), and it loses in H2 (PF 0.42).
   - **London only (02:00-08:00):** 2.5 trades a week, PF 2.94, +$31.7k (H2 +$8.8k). Almost the whole strategy.
3. **Expect long dry spells.** About 3 in 4 trades lose a little or scratch at breakeven, and 14 in a row without a winner already
   happened in 2026. The money comes from a few 5-8R days: the 2 largest were +$6.2k and +$5.2k.
4. **Plan on the H2 rate:** about **$2,200 a month** and PF ~2, not the full-year $3,963.
   - **Stop and review:** after 40 paper trades, if PF is below 1.2 or the drawdown is past −$3.5k.
5. **Evals.** The 2026 max drawdown (−$3.1k) is bigger than the $2,000 eval limit.
   - In Jan-Jun, 15% of evals failed within 2 weeks; in Jul-Oct none did.
   - With the eval-safe option (`how_out: 0.5`): no 2-week failures in 2026, and an 86% pass rate.
6. **The VIX band needs yesterday's VIX close each day** (`data/VIX_1d.csv`).
7. **2026 may be unusual.** The same rules on 2021-25 (5m only) are flat, and 2023 lost $13.3k. 2026 is all we can test the 1m
   entry on.

## Files and how to rerun

- **`engine/lit.py`:**
  - `DEFAULTS` = lit_A; `run_x(M, cands, P)` is the combined executor.
  - `candidates(..., ref="cisd")`, `Market(extra_boxes=[...])` and `bars_1m` (with the 1m data check).
  - With no options set, it gives lit_A's 1,000 trades exactly.
- **`research/lit/lit_final.json`:** the final variant (every parameter, explained), plus the eval-safe switch.
- **`tools/lit_final.py`:**
  - `check`: lit_A is identical; the sessions, risk and filters picks are reproduced trade for trade; the entry pick matches to
    within 4 trades, because of the 1m fix.
  - `search`: merge combinations → `research/lit/final_results.json`.
  - `critic` → `research/lit/final_critic.json`.
  - `save`: stores run `lit_final` (family other, tags lit and lit_final).
- **Runtime:** about 40 s per command on one process.
- Nothing was committed.
