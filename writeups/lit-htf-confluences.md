## In one minute

- **The owner's order (2026-10-18):** "Higher time frame stuff, look at that. Look at all confluences, deep dive it."
- **What was done:**
  1. Every LIT setup of 2026 was collected: 330 setups, 176 that would fill if taken alone, and the 120 the bot takes. They
     come from `tools/lit_select.py`; its one-a-day replay equals the live LIT trades exactly.
  2. Each setup got **42 higher-time-frame facts** (read as 49 confluences), all known at the moment of the decision:
     - the draw on liquidity (daily, weekly and monthly highs and lows, opening gaps, 1H/4H swings and equal highs/lows);
     - where price sits in the daily, weekly, 20-day, week-so-far and 4H ranges (premium / discount);
     - the daily, 4H, weekly and midnight candle profile (PO3);
     - the prior day and week bias;
     - the 1H/4H/daily market structure;
     - 1H/4H fair value gaps (FVGs) in the way;
     - the time of week.

     26 LIT (5m/1m) facts were added on top, for **75 confluences** in all.
  3. A **confluence map**: each confluence was scored on Jan-Jun 2026 (H1, the pick half) and on Jul-Oct 2026 (H2, the
     check half), with a shuffle p-value and a multiple-testing correction.
  4. The **best 2- and 3-way combinations** were tried: 86,000 of them, picked on H1 and checked on H2.
  5. The survivors were turned into rules three ways and scored on the real LIT path at the eval size:
     - **skip** the setup;
     - **size** it (1.25x with the confluence, 0.75x without);
     - **"HTF-aligned only in London"** (skip a London setup that is not aligned).

     The main score is the **MFFU 50K eval passed within 2 weeks (10 sessions)** and the **cost per 2-week pass**
     ($91.80 ÷ pass rate).
- **What we found:**
  - **The HTF picture does not pick better LIT trades.** No confluence survives the multiple-testing correction (best
    corrected q = 0.35). 18 of the 65 testable confluences point the same way in both halves, and pure chance gives 17.7.
  - **Trading WITH the HTF draw doesn't work for LIT.** It looked better in Jan-Jun and worse in Jul-Oct. As a filter it
    halves the trading (1.7 a week) and costs $17k in H1. "London setups only when aligned" costs $12k in H1 and $7.5k in H2.
    LIT is a reversal strategy: it buys a swept low, which often means it is against the higher-time-frame flow.
  - **Combinations are worse than single confluences.** The best HTF-only combinations picked on Jan-Jun held in Jul-Oct
    **0 times out of 22**. By chance about 1 in 4 would. Several flipped hard (Jul-Oct p 0.03-0.05 the other way).
  - **Skipping setups never pays.** Every skip rule drops below 2 trades a week or loses money in a half.
  - **Three size tilts help both halves.** They are the adopt-candidates, at low confidence:

| Rule (eval size, costs in) | 2-wk pass / fail H1 (base 37.5 / 3.1) | 2-wk pass / fail H2 (base 29.5 / 0.0) | Cost per 2-wk pass H1 / H2 (base $245 / $311) | Net $ H1 / H2 (base +33,305 / +10,465) | Shuffle p H1 / H2 |
|---|---|---|---|---|---|
| **1. 4H draw, size-neutral:** 1.4x when the nearest unswept 4H swing is on the target side, else 0.8x | **42.2 / 2.3** | **34.6 / 0.0** | **$218 / $265** | +32,590 / **+12,527** | 0.095 / **0.013** |
| **2. Fresh trap × clear HTF path** (1.25x / 0.75x each) | **52.3 / 3.1** | 29.5 / 0.0 | **$176** / $311 | **+43,621 / +11,987** | **0.003** / 0.10 |
| **3. Clear 1H path:** 1.25x when no opposing 1H FVG sits before the target, else 0.75x | 41.4 / 3.1 | 29.5 / 0.0 | $222 / $311 | +39,863 / +10,884 | 0.10 / 0.16 |

- **The honest verdict:**
  - Only rule 1 raises the 2-week pass in **both** halves, and its sizes land on better trades in both halves.
  - Its price: Jul-Oct evals that miss the 2-week window fail more often later (1-month fails 10.3% vs 0%).
  - Rules 2 and 3 help Jan-Jun a lot and leave the Jul-Oct 2-week pass where it is.
  - All three are size tilts that were partly shaped after looking at both halves (see the caveats), so none is proven.
  - **Recommendation:** add rule 1 as an optional sizing switch, off by default. Log rules 1-3 on every paper trade and
    decide after about 40 more trades. Nothing else from the HTF study should go live.

## Words used here (for a beginner)

| Word | Meaning here |
|---|---|
| HTF / LTF | Higher / lower time frame. HTF here = 1-hour (1H), 4-hour (4H), daily and weekly candles. LTF = LIT's own 5m and 1m candles. |
| Candles from the 5m file | 1H candles are clock hours. 4H candles start at 18:00 ET (18, 22, 02, 06, 10, 14). A day runs 18:00-17:00. A week runs Monday to Friday. All are built from the CME NQ1! 5-minute export. |
| Liquidity / untaken | Resting orders above an old high or below an old low. A level is "taken" once price trades through it. |
| PDH / PDL, PWH / PWL, PMH / PML | The previous day's, week's and month's high / low. |
| NWOG / NDOG | The new week / new day opening gap: the jump between the last close and the next open. |
| Draw on liquidity | The untaken level price is most likely to reach next (here: the nearest one). |
| Swing (fractal) | A 1H/4H candle whose high (low) is above (below) the 2 candles before and after it. It is known only once the 2nd candle after it has closed. |
| Equal highs / lows | Two swings within 0.1 candle-range of each other, untouched in between: a pool of stops. |
| Dealing range, premium / discount | A high-low range. The top half is "premium", the bottom half is "discount". The textbook buys in discount and sells in premium. |
| PO3 (power of three) | A candle's three phases: open, a fake move the wrong way (manipulation), then the real move. A bullish day often dips below its open first. |
| BOS (break of structure) | A candle that closes beyond the last swing. The last BOS gives the trend direction. |
| FVG (fair value gap) | Three candles where the 1st and 3rd don't overlap. The hole between them is the gap. "Opposing" = a gap that pushes against the trade. "Unfilled" = price hasn't traded fully through it. |
| R | Profit in units of the money at risk. +2R = twice the risk. |
| H1 / H2 | Jan 2 - Jun 30 2026 (the pick half) / Jul 1 - Oct 16 2026 (the check half). A rule is picked on H1 and must also help in H2. |
| p-value (shuffle test) | Shuffle the outcomes 4,000 times. p is the share of shuffles that look as good as the real thing. Small (under 0.05) = unlikely to be luck. |
| Multiple-testing correction | Test 75 things and about 4 look "significant" at p < 0.05 by luck alone. The correction (Benjamini-Hochberg q, Westfall-Young family p) adjusts for the number tried. |
| Cost per 2-week pass | $91.80 (the owner's MFFU 50K price) ÷ the share of evals passed within 10 sessions. |

## How this was done

- **Code:** `tools/lit_htf.py` (new). It wraps `tools/lit_select.py`, `engine/lit.py` and `tools/lit_tightstop.py`; no engine
  file was changed.
- **Data:** CME NQ1! 5m (2021-11 → 2026-10-16) and true 1m bars for the 2026 entries. Every HTF candle is built from the 5m
  file. No CFD, no Yahoo.
- **Candidates and outcomes:** from `lit_select.py`. Every setup that passes the live LIT filters was simulated alone with
  the live executor:
  - limit at the CISD level, then a 1m CISD;
  - stop 1 tick beyond the sweep extreme;
  - VIX-band target banked at 8R, breakeven at 1R, flat at 15:55.

  "Win" means more than +0.5R. Costs are in.
- **Causal:** every HTF fact uses only candles that had closed by the trigger bar's close, and prices up to that bar.
  - A 1H/4H candle counts once its last 5m bar has closed.
  - A swing counts once the 2nd candle after it has closed.
  - An FVG is "unfilled" only by prices up to the trigger bar.
- **Look-ahead test:** the 5m data was cut at a setup's entry bar (that bar reduced to its open) and everything was rebuilt.
  30 random 2026 setups (`python tools/lit_htf.py lookahead`, 2 seeds) gave **0 differences** in all 42 HTF facts.
- **Size (the base):** the live eval mode:
  - $800 up to a 25-pt stop, then 800 × 25 ÷ stop;
  - the weekly stop;
  - never more than 60% of the room to the trailing max-loss floor.

  A size multiplier is applied with one rounding, minimum 1 micro. A sized-up trade never risks more than $900 (MFFU's daily
  loss limit is $1,000).
- **Money:**
  - **Net $ and max DD** come from back-to-back MFFU 50K evals.
  - **Eval odds** come from a fresh eval started on every session: 128 starts in H1, 78 in H2. One H2 start = 1.3 points
    of pass rate.
  - **"No room cap $"** is the same trades at $800 / 25 pts without the room cap. It is a steadier money line.
- **Base** (LIT live, eval size): H1 3.12 trades/wk, PF 4.01, +$33,305, 2-week pass/fail 37.5% / 3.1% ($245 per 2-week
  pass). H2 2.56/wk, PF 2.51, +$10,465, 29.5% / 0.0% ($311). This equals run `lit_tight_eval_800_25_room60`.

## 1. HTF context at each LIT setup: what LIT setups look like

A few plain facts about the 330 setups of 2026, before any rule:
- **LIT mostly trades against the HTF flow** (shares of the setups that would fill):
  - The last closed 4H candle is against the trade 66% of the time, the last 1H candle 77%.
  - The sweep goes beyond the midnight open 86% of the time, beyond the 18:00 open 76%.
  - That is the point of LIT: it buys a swept low.
- **The textbook "buy in discount" is rare.** A long enters in the lower half of the previous day's range only 24% of the
  time (19% for this week's range so far). After the sweep, the CISD entry is already back up in the range.
- **The HTF draw is a coin flip.** The nearest untaken daily/weekly/monthly level is on the trade's target side 45% of
  the time. The last 4H break of structure is with the trade 47% of the time.

## 2. The confluence map

**How to read it:**
- Each row is one confluence. "With / without" compares setups that have it against those that don't, each taken alone at
  unit size.
- "Taken trades $" is the money the bot's own trades with that confluence made at the eval size (no room cap).
- **Verdicts:**
  - **holds, helps / holds, hurts:** the avg-R difference has the same sign in H1 and H2, is at least 0.2R in both, and the
    taken trades agree in both halves;
  - **flips:** it changes sign between the halves;
  - **too few:** under 8 filled setups on one side in a half.
- **Sample sizes:** H1 121 filled setups (80 taken), H2 55 (40 taken). 2021-25 (5m entries only, reference): 669 (510).

Bold verdicts held in both halves. **None of the p-values survives the multiple-testing correction:**
- 75 confluences × 4 tests (setups / taken trades × H1 / H2) = 300 tests.
- The best Benjamini-Hochberg q is 0.53 on H1 setups, 0.35 on H1 taken trades and 0.83-0.87 on H2.
- Combining H1 and H2 (Fisher) gives a best q of 0.80.


**HTF draw**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `dr_all` | the nearest untaken daily/weekly/monthly level or opening-gap edge (PDH/PDL, PWH/PWL, PMH/PML, NWOG/NDOG) is on the trade's target side | 45% | 50: 18% · +0.56 / +0.53 | 29: 31% · +0.85 / +0.14 | +16,401 / +8,410 | 0.95 / 0.23 | +0.03 | same sign, small |
| `dr_pd` | daily draw: the previous day's high (long) is untaken and nearer than an untaken PDL (or PDL is taken) | 55% | 62: 21% · +0.67 / +0.41 | 35: 31% · +0.67 / +0.24 | +17,158 / +7,178 | 0.56 / 0.49 | +0.15 | **holds, helps** |
| `dr_pw` | weekly draw: the previous week's high/low on the target side is the untaken / nearer one | 50% | 60: 18% · +0.35 / +0.73 | 27: 30% · +0.60 / +0.49 | +10,121 / +4,726 | 0.38 / 0.85 | -0.10 | flips |
| `dr_pm` | monthly draw: the previous month's high/low on the target side is the untaken / nearer one | 50% | 59: 12% · +0.08 / +0.98 | 29: 34% · +0.90 / +0.09 | +8,864 / +11,454 | 0.04 / 0.17 | +0.08 | flips |
| `dr_gap` | the nearest unfilled NWOG/NDOG edge is on the target side | 54% | 23: 17% · +0.23 / +1.49 | 5: 0% · -0.53 / -0.49 | +6,163 / -573 | 0.12 / 0.99 | -0.07 | too few |
| `dr_more` | more untaken HTF levels within 1.5 VIX moves on the target side than behind the trade | 48% | 33: 9% · -0.07 / +1.35 | 18: 22% · +0.43 / -0.43 | -196 / +42 | 0.01 / 0.19 | +0.08 | flips |
| `dr_reach` | an untaken HTF level sits between the entry and the VIX-band target (a draw on the way) | 23% | 29: 10% · +0.17 / +0.66 | 11: 9% · -0.39 / +0.74 | +7,753 / -1,038 | 0.35 / 0.13 | -0.01 | **holds, hurts** |
| `dr_swept_htf` | the sweep took a daily, weekly or monthly level (PDL/PWL/PML for a long) | 9% | 9: 11% · +0.04 / +0.58 | 7: 29% · +1.06 / +0.44 | +1,642 / +4,172 | 0.53 / 0.49 | -0.22 | too few |
| `dr_pd_rev` | the sweep took PDL (long) while PDH is still untaken: the classic daily reversal | 6% | 5: 0% · -0.81 / +0.60 | 6: 17% · +0.31 / +0.54 | -883 / +891 | 0.16 / 0.83 | -0.08 | too few |
| `pl_eq1h` | the nearest untaken 1H equal-highs/lows pool is on the target side | 51% | 29: 28% · +1.00 / +0.51 | 10: 50% · +0.99 / +0.36 | +11,212 / +3,794 | 0.52 / 0.51 | +0.23 | **holds, helps** |
| `pl_eq4h` | the nearest untaken 4H equal-highs/lows pool is on the target side | 59% | 25: 28% · +0.93 / +0.49 | 19: 37% · +1.00 / -0.02 | +8,129 / +6,946 | 0.61 / 0.20 | +0.01 | flips |
| `pl_sw1h` | the nearest unswept 1H swing is on the target side | 56% | 68: 21% · +0.69 / +0.35 | 31: 26% · +0.39 / +0.68 | +24,860 / +7,307 | 0.46 / 0.63 | -0.19 | flips |
| `pl_sw4h` | the nearest unswept 4H swing is on the target side | 43% | 48: 21% · +0.83 / +0.35 | 28: 36% · +1.06 / -0.05 | +24,226 / +12,245 | 0.29 / 0.06 | +0.09 | **holds, helps** |
| `pl_take1h` | the sweep took an unswept 1H swing low (long) / high (short) | 22% | 28: 14% · +0.53 / +0.54 | 11: 27% · +1.04 / +0.39 | +8,653 / +5,877 | 0.99 / 0.38 | -0.26 | flips |
| `pl_take4h` | the sweep took an unswept 4H swing low (long) / high (short) | 6% | 4: 0% · -0.50 / +0.58 | 6: 17% · +0.59 / +0.51 | -736 / +3,115 | 0.45 / 0.95 | -0.09 | too few |
| `pl_take_eq` | the sweep took 1H or 4H equal lows (long) / highs (short) | 5% | 4: 0% · -0.51 / +0.58 | 4: 50% · +2.40 / +0.37 | -687 / +3,347 | 0.43 / 0.06 | -0.15 | too few |

**HTF range**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `rg_pd` | entry in the discount (long) / premium (short) half of the previous day's range | 24% | 28: 21% · +0.46 / +0.56 | 14: 29% · +0.56 / +0.50 | +6,341 / +962 | 0.84 / 0.92 | -0.19 | flips |
| `rg_pw` | entry in the discount / premium half of the previous week's range | 13% | 14: 36% · +0.91 / +0.49 | 9: 33% · +0.46 / +0.53 | +3,115 / +2,991 | 0.56 / 0.94 | -0.15 | flips |
| `rg_20d` | entry in the discount / premium half of the last 20 days' range | 15% | 15: 27% · +0.63 / +0.53 | 11: 9% · -0.40 / +0.75 | +1,735 / -118 | 0.88 / 0.12 | -0.17 | flips |
| `rg_wk` | entry in the discount / premium half of this week's range so far | 19% | 21: 19% · +0.47 / +0.56 | 12: 25% · +0.62 / +0.49 | +5,554 / +663 | 0.88 / 0.85 | -0.12 | flips |
| `rg_4h` | entry in the discount / premium half of the 4H dealing range (last confirmed 4H swing high-low) | 23% | 26: 19% · +0.30 / +0.63 | 14: 29% · +0.59 / +0.49 | +1,770 / +1,061 | 0.56 / 0.89 | -0.20 | flips |

**HTF PO3**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `po3_d` | the sweep went beyond the 18:00 daily open (the manipulation leg of the day's candle) | 76% | 93: 17% · +0.56 / +0.50 | 40: 28% · +0.47 / +0.64 | +30,624 / +5,410 | 0.91 / 0.80 | -0.07 | flips |
| `po3_d_buy` | the entry is still on the cheap side of the 18:00 open (below it for a long) | 25% | 30: 20% · +0.59 / +0.53 | 14: 21% · +0.23 / +0.61 | +11,165 / -293 | 0.90 / 0.58 | -0.13 | flips |
| `po3_4h` | the sweep went beyond the 4H candle's open within the first 2 hours of that 4H candle | 47% | 58: 12% · +0.27 / +0.79 | 25: 36% · +0.76 / +0.32 | +15,688 / +7,538 | 0.23 / 0.47 | +0.13 | flips |
| `po3_wk` | the sweep went beyond the weekly open | 62% | 70: 17% · +0.45 / +0.67 | 39: 31% · +0.60 / +0.32 | +15,601 / +6,846 | 0.63 / 0.69 | +0.00 | flips |
| `po3_00` | the sweep went beyond the midnight open | 86% | 107: 19% · +0.58 / +0.20 | 44: 30% · +0.58 / +0.26 | +36,946 / +10,151 | 0.60 / 0.68 | +0.15 | **holds, helps** |
| `c1h_counter` | the last closed 1H candle closed against the trade | 77% | 93: 19% · +0.46 / +0.82 | 42: 29% · +0.56 / +0.38 | +21,786 / +11,991 | 0.49 / 0.80 | +0.01 | flips |
| `c4h_counter` | the last closed 4H candle closed against the trade | 66% | 81: 21% · +0.73 / +0.17 | 35: 26% · +0.54 / +0.48 | +35,028 / +7,579 | 0.22 / 0.94 | -0.04 | same sign, small |
| `cd_counter` | the previous day's candle closed against the trade | 51% | 61: 21% · +0.50 / +0.58 | 28: 29% · +0.60 / +0.43 | +14,803 / +4,813 | 0.85 / 0.77 | +0.00 | flips |

**HTF bias**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `bi_pdc` | the previous day closed in the half of its range on the trade's side (upper half for a long) | 49% | 63: 18% · +0.54 / +0.54 | 23: 22% · +0.08 / +0.83 | +22,365 / +4,313 | 1.00 / 0.22 | -0.04 | flips |
| `bi_pdbos` | the previous day closed beyond the day before's high (long) / low (short) | 27% | 33: 24% · +1.14 / +0.32 | 14: 36% · +0.77 / +0.43 | +23,613 / +5,322 | 0.10 / 0.62 | -0.02 | **holds, helps** |
| `bi_pdts` | the previous day swept the day before's low (long) and closed back above it (daily turtle soup) | 22% | 30: 13% · +0.19 / +0.66 | 9: 22% · +0.45 / +0.53 | +4,003 / +4,831 | 0.36 / 0.92 | -0.12 | flips |
| `bi_pwc` | the previous week closed in the half of its range on the trade's side | 48% | 56: 21% · +0.87 / +0.26 | 29: 21% · +0.22 / +0.84 | +30,876 / +1,923 | 0.16 / 0.30 | +0.16 | flips |

**HTF structure**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `ms_1h` | the last 1H break of structure (close beyond a fractal swing) was in the trade's direction | 34% | 42: 24% · +0.72 / +0.45 | 18: 33% · +0.51 / +0.52 | +20,217 / +4,516 | 0.58 / 0.99 | +0.13 | flips |
| `ms_4h` | the last 4H break of structure was in the trade's direction | 47% | 58: 21% · +0.70 / +0.40 | 24: 25% · +0.46 / +0.56 | +26,650 / +4,579 | 0.50 / 0.87 | +0.02 | flips |
| `ms_d` | the last daily break of structure was in the trade's direction | 51% | 66: 21% · +0.76 / +0.28 | 24: 25% · +0.43 / +0.58 | +30,452 / +1,071 | 0.29 / 0.80 | +0.13 | flips |

**HTF FVG**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `fv_way1h` | an unfilled opposing 1H FVG sits between the entry and the target | 29% | 34: 15% · +0.24 / +0.66 | 17: 24% · +0.33 / +0.60 | +4,891 / -113 | 0.39 / 0.69 | -0.02 | **holds, hurts** |
| `fv_way4h` | an unfilled opposing 4H FVG sits between the entry and the target | 18% | 22: 18% · +0.49 / +0.55 | 10: 10% · -0.20 / +0.68 | +5,817 / +127 | 0.92 / 0.25 | -0.04 | same sign, small |
| `fv_sweep1h` | the sweep ran into an unfilled supportive 1H FVG | 32% | 38: 16% · +0.49 / +0.56 | 19: 26% · +0.41 / +0.57 | +12,308 / +4,576 | 0.88 / 0.79 | -0.06 | same sign, small |
| `fv_sweep4h` | the sweep ran into an unfilled supportive 4H FVG | 19% | 21: 14% · +0.38 / +0.57 | 12: 25% · +0.48 / +0.53 | +4,224 / +4,267 | 0.74 / 0.95 | -0.09 | flips |

**time of week**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `tw_tuewed` | Tuesday or Wednesday | 48% | 52: 15% · +0.43 / +0.62 | 33: 36% · +0.87 / -0.01 | +16,895 / +10,912 | 0.66 / 0.15 | +0.30 | flips |
| `tw_how` | the sweep extreme is inside Tue 03:00 - Wed 11:30 (the high/low-of-week window) | 40% | 44: 14% · +0.41 / +0.62 | 26: 31% · +0.81 / +0.26 | +12,836 / +8,601 | 0.65 / 0.37 | +0.40 | flips |
| `tw_wkext` | the sweep made a new low (long) / high (short) of the week | 18% | 20: 20% · +0.41 / +0.57 | 12: 25% · +1.03 / +0.37 | +2,740 / +5,742 | 0.79 / 0.36 | -0.01 | flips |
| `tw_wkext_mw` | the sweep made a new weekly low/high on Monday-Wednesday (weekly low/high formation) | 15% | 18: 17% · +0.09 / +0.62 | 9: 22% · +0.87 / +0.45 | +328 / +3,065 | 0.42 / 0.60 | -0.10 | flips |
| `tw_mon` | Monday | 14% | 16: 38% · +1.02 / +0.47 | 9: 11% · -0.22 / +0.66 | +4,314 / -347 | 0.41 / 0.28 | -0.17 | flips |
| `tw_fri` | Friday | 21% | 31: 19% · +0.57 / +0.53 | 6: 17% · -0.10 / +0.59 | +13,234 / -820 | 0.95 / 0.50 | -0.05 | too few |

**HTF composite**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `cx_with` | WITH the HTF draw: at least 2 of (nearest untaken HTF level on the target side, last 4H BOS with the trade, previous day closed on the trade's side) | 45% | 53: 21% · +0.72 / +0.40 | 26: 23% · +0.45 / +0.57 | +22,023 / +6,116 | 0.47 / 0.84 | +0.05 | flips |
| `cx_full` | all 3 of the HTF-draw items agree with the trade | 17% | 26: 23% · +0.98 / +0.42 | 4: 25% · -0.19 / +0.57 | +15,183 / +65 | 0.31 / 0.55 | -0.09 | too few |
| `cx_against` | AGAINST the HTF draw: none of the 3 items agrees | 22% | 29: 28% · +0.93 / +0.42 | 9: 33% · +0.20 / +0.58 | +8,835 / +539 | 0.34 / 0.65 | -0.01 | flips |

**LTF LIT**

| Confluence | What it means | Share of setups | H1: win % · avg R with / without | H2: win % · avg R with / without | Taken trades with it: $ H1 / H2 | p H1 / H2 | 2021-25 Δ avg R | Verdict |
|---|---|---:|---|---|---:|---|---:|---|
| `lt_trap6` | fresh trap: the inducement swing was made <= 6 bars (30 min) before the sweep | 48% | 57: 28% · +1.14 / +0.01 | 27: 33% · +0.72 / +0.32 | +36,591 / +8,943 | 0.01 / 0.50 | -0.01 | **holds, helps** |
| `lt_trap_close` | close trap: the inducement swing sits < 0.39 ATR above the swept level | 64% | 81: 24% · +0.80 / +0.03 | 31: 26% · +0.23 / +0.89 | +33,839 / +3,444 | 0.09 / 0.28 | +0.01 | flips |
| `lt_idm2` | 2+ inducement swings qualified | 35% | 48: 19% · +0.52 / +0.56 | 13: 38% · +0.70 / +0.46 | +16,021 / +5,434 | 0.93 / 0.73 | +0.09 | flips |
| `lt_multi` | the sweep took 2+ levels | 76% | 97: 19% · +0.56 / +0.48 | 37: 30% · +0.73 / +0.09 | +33,971 / +10,670 | 0.89 / 0.32 | -0.17 | same sign, small |
| `lt_major` | the sweep took a daily/weekly/monthly level or an opening-gap edge | 12% | 12: 8% · -0.05 / +0.61 | 9: 33% · +0.95 / +0.43 | +1,117 / +4,312 | 0.38 / 0.55 | -0.33 | flips |
| `lt_box` | the sweep took a session box (Asia / London / NY / premarket) | 81% | 104: 18% · +0.52 / +0.66 | 39: 26% · +0.52 / +0.51 | +34,276 / +7,099 | 0.84 / 0.98 | -0.29 | flips |
| `lt_bu_only` | the sweep took only build-up (equal 5m) liquidity | 18% | 17: 24% · +0.66 / +0.52 | 15: 33% · +0.17 / +0.65 | +2,770 / +1,279 | 0.85 / 0.51 | +0.26 | flips |
| `lt_depth_mid` | sweep depth 1.6-2.7 ATR | 31% | 38: 32% · +1.05 / +0.31 | 16: 50% · +1.20 / +0.24 | +19,169 / +7,091 | 0.12 / 0.14 | +0.00 | **holds, helps** |
| `lt_disp_big` | displacement body > 1.25 ATR | 31% | 41: 22% · +0.49 / +0.56 | 14: 14% · -0.39 / +0.83 | +8,185 / -1,308 | 0.88 / 0.07 | -0.04 | same sign, small |
| `lt_stop_small` | planned stop < 31.5 pts | 35% | 40: 20% · +0.86 / +0.39 | 21: 29% · +0.73 / +0.38 | +20,784 / +8,202 | 0.32 / 0.57 | +0.14 | **holds, helps** |
| `lt_rr4` | the VIX-band target is 4R or more away | 94% | 117: 18% · +0.53 / +0.94 | 48: 31% · +0.65 / -0.42 | +35,603 / +12,184 | 0.85 / 0.25 | -0.08 | too few |
| `lt_room` | room to run: the first opposing level is >= 1.5R away | 56% | 64: 14% · +0.32 / +0.79 | 35: 37% · +0.82 / -0.01 | +15,576 / +11,609 | 0.31 / 0.19 | -0.00 | flips |
| `lt_london` | London-morning entry (before 08:00 ET) | 74% | 91: 14% · +0.41 / +0.93 | 39: 31% · +0.76 / -0.08 | +29,091 / +11,488 | 0.32 / 0.19 | +0.07 | flips |
| `lt_early` | entry before 04:05 ET | 31% | 40: 18% · +0.69 / +0.47 | 15: 40% · +1.29 / +0.23 | +16,463 / +8,550 | 0.64 / 0.11 | -0.10 | **holds, helps** |
| `lt_lv30` | 30 or fewer levels already taken today | 41% | 49: 20% · +0.81 / +0.35 | 23: 35% · +0.99 / +0.18 | +21,861 / +11,505 | 0.32 / 0.18 | +0.14 | **holds, helps** |
| `lt_news_clear` | no high-impact release in the next 60 min | 98% | 119: 19% · +0.56 / -0.51 | 54: 30% · +0.53 / -0.01 | +37,321 / +11,659 | – / – | +0.57 | too few |
| `lt_news_day` | a high-impact news day | 16% | 18: 11% · +0.36 / +0.57 | 11: 18% · -0.04 / +0.66 | +8,409 / +109 | 0.74 / 0.35 | -0.01 | flips |
| `lt_es_swept` | ES swept its own low/high too (no SMT divergence) | 72% | 95: 19% · +0.54 / +0.56 | 31: 36% · +0.82 / +0.12 | +31,538 / +11,670 | 0.97 / 0.24 | -0.10 | flips |
| `lt_day_ext` | the sweep is the day's extreme so far | 49% | 63: 19% · +0.60 / +0.48 | 23: 26% · +0.60 / +0.45 | +26,263 / +6,371 | 0.78 / 0.81 | -0.21 | same sign, small |
| `lt_opp_lon` | the day's opposite extreme was made in London | 15% | 15: 7% · -0.16 / +0.64 | 11: 27% · +0.26 / +0.58 | -205 / +1,252 | 0.22 / 0.68 | -0.00 | **holds, hurts** |
| `lt_vec` | a vector (climax volume) candle at the sweep | 39% | 55: 20% · +0.57 / +0.52 | 13: 8% · -0.48 / +0.82 | +17,582 / -2,219 | 0.90 / 0.06 | +0.06 | flips |
| `lt_first` | the first accepted setup of the day | 56% | 66: 23% · +0.86 / +0.16 | 32: 28% · +0.61 / +0.39 | +31,014 / +9,464 | 0.12 / 0.71 | +0.17 | flips |
| `lt_prev_win` | the previous LIT trade was a winner | 24% | 28: 18% · +0.77 / +0.47 | 15: 40% · +0.74 / +0.43 | +10,676 / +4,128 | 0.58 / 0.64 | -0.10 | **holds, helps** |
| `lt_wk_clean` | no stop-out yet this week | 54% | 65: 20% · +0.75 / +0.29 | 30: 40% · +0.96 / -0.02 | +28,211 / +13,047 | 0.30 / 0.10 | +0.10 | **holds, helps** |
| `lt_cisd_long` | the CISD run into the extreme is 5+ bars | 16% | 22: 23% · +0.66 / +0.52 | 6: 17% · +0.13 / +0.56 | +4,499 / -93 | 0.80 / 0.67 | -0.10 | too few |
| `lt_long` | a long (vs a short) | 45% | 56: 20% · +0.57 / +0.51 | 24: 25% · +0.35 / +0.65 | +19,663 / +2,711 | 0.89 / 0.61 | -0.01 | flips |

### What the map says

- **Is it more than chance?** 18 of the 65 confluences with enough data "hold" on the setups (same sign in both halves, 0.2R
  or more). With outcomes shuffled within each half, the count is 17.7 on average (95% of shuffles: 26 or fewer,
  `python tools/lit_htf.py chance`). **As a whole, the map is at chance level.**
- **Single rows can still be real.** That is why the survivors go through the real path and the shuffle test below.

**HTF facts that pointed the same way in both halves:**

| Confluence | H1 avg R with / without | H2 avg R with / without | Read |
|---|---|---|---|
| **4H draw** (nearest unswept 4H swing on the target side) | +0.83 / +0.35 | +1.06 / −0.05 | Clearest HTF effect. Taken trades with it made +$24.2k / +$12.2k. As a filter it was already rejected in `lit-losses.md` (too few trades). |
| **Clear path: no opposing 1H FVG before the target** (the row shows "in the way") | +0.24 / +0.66 | +0.33 / +0.60 | A 1H gap in the way stalls the move before the VIX band. |
| **Clear path: no untaken HTF level before the target** (the row shows "in the way") | +0.17 / +0.66 | −0.39 / +0.74 | Same story: a PDH / PWH / gap edge on the way stops the run. A textbook "draw on the way" is a *bad* sign for LIT's far target. |
| Daily draw (PDH side untaken / nearer, long) | +0.67 / +0.41 | +0.67 / +0.24 | Small. Loses as a filter. |
| 1H equal-highs pool on the target side | +1.00 / +0.51 | +0.99 / +0.36 | Only 137 of the 330 setups have an untouched 1H pool on either side. |
| Sweep beyond the midnight open (PO3) | +0.58 / +0.20 | +0.58 / +0.26 | 86% of setups have it, so the "without" group is tiny (14 / 11). |
| Prior day closed beyond the day before's high (long) | +1.14 / +0.32 | +0.77 / +0.43 | Only 27% of setups. Skipping the rest leaves 1 trade a week. |

**LIT (LTF) facts that held:**
- the **fresh trap** (inducement ≤ 6 bars; the strongest, H1 p 0.01, known from `lit-trade-selection.md`);
- sweep depth 1.6-2.7 ATR;
- a small stop;
- an early entry (before 04:05);
- 30 or fewer levels already taken today;
- the previous trade a winner;
- no stop-out yet this week (the weekly stop already uses it);
- the day's opposite extreme made in London (hurts).

**What flipped** (better in one half, worse in the other; don't use):
- every premium / discount range (prior day, prior week, 20 days, week so far, 4H);
- the weekly and monthly draw;
- the **WITH-the-HTF-draw composite**;
- every structure reading (1H, 4H, daily BOS);
- the prior-day and prior-week close bias and the daily turtle soup;
- the daily, 4H and weekly PO3;
- the sweep into a 1H/4H FVG;
- Tuesday/Wednesday, the high/low-of-week window and the weekly-extreme sweep.

**Notes on single rows:**
- **Tuesday/Wednesday and the high/low-of-week window** are worse in H1 and better in H2 and in 2021-25 (+0.30R / +0.40R).
  That window is the existing eval-safe switch `how_out`, so nothing new here.
- **"More untaken HTF levels ahead"** looked strongly *bad* in H1 (p 0.01) and was good in H2. This is the kind of H1
  "finding" that breaks the combinations below.

## 3. 2- and 3-way combinations

- **The method:**
  1. Each confluence was turned the way that helped in H1 (or its NOT).
  2. Every AND of 2 or 3 was scored on H1 setups by the z-score of the avg-R difference, with at least 15 setups on each side.
  3. The family-wise correction (Westfall-Young) shuffles the outcomes 1,000 times and takes the best z of all
     combinations each time.
  4. The top combinations were checked on H2. "Holds" = H2 avg R at least 0.2R better, with 8+ setups.
- `python tools/lit_htf.py combos` → `research/lit/htf_combos.json`.

| Set | Combinations tried | Valid in H1 | Best H1 z (family p) | 95% of max z by chance | Top 25 that hold in H2 | Chance that an H1-positive combination holds in H2 |
|---|---:|---:|---|---:|---|---:|
| All 74 confluences | 2,701 pairs + 64,824 triples | 31,203 | 3.82 (p 0.45) | 4.72 | **7 of 20** with enough H2 data | 33.6% |
| HTF only (48) | 1,128 pairs + 17,296 triples | 10,016 | 3.62 (p 0.29) | 4.35 | **0 of 22** | 24.4% |

- **No combination beats chance after the correction.** The best family-wise p is 0.29.
- **The HTF-only winners of H1 all failed in H2.**
  - The top H1 pick was "NOT 4H discount AND last 4H candle against AND prior week closed with the trade": H1 +2.14R
    (24 setups) → H2 −0.06R.
  - "Fewer HTF levels ahead AND not in 4H discount" went from +1.78R in H1 to −0.39R in H2 (16 setups, p 0.047 the
    wrong way).
- **The 7 combinations that held all contain the fresh trap** (e.g. fresh trap AND first setup of the day; fresh trap AND
  sweep beyond the midnight open). 7 of 20 is what chance gives (34%). The trap carries them.
- **Verdict:** combinations add nothing that the fresh trap alone doesn't give. They were still run as rules below, and
  none beats the fresh-trap tilt in H2.

## 4. Rules on the real LIT path (eval size, costs in)

- **The tests:** every survivor was tried three ways (skip, size 1.25x / 0.75x, "London only when aligned"; 76 rules), then
  22 follow-ups. All in `research/lit/htf_rules.json` and `htf_followups.json`.
- **Columns:**
  - "Cost per 2-wk pass" = $91.80 ÷ the 2-week pass rate;
  - "No room cap $" = the same trades at $800 / 25 pts without the room cap;
  - "Shuffle p" = the same multipliers moved to random trades of the same half, 400 times. Small = the sizes sit on better
    trades, not just more size.
- **Trades a week** is unchanged for every size rule.

| Rule | Half | Trades/wk · weeks 2+ | **2-wk pass / fail %** | **Cost per 2-wk pass** | Win % | PF | Net $ | $/month | Max DD | 1-month pass / fail % | Pass rate % | No room cap $ | Shuffle p |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| **Base: LIT live, eval size** | H1 (pick) | 3.12 · 85% | 37.5 / 3.1 | $245 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 60.2 / 6.2 | 92.3 | +37,046 |  |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 47.4 / 0.0 | 95.7 | +11,659 |  |
|  | 2021-25 (ref) | 2.38 · 76% | 8.8 / 8.1 | $1,043 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 15.8 / 20.8 | 30.7 | +4,252 |  |
| **1. 4H draw, size-neutral 1.4x / 0.8x** (`lit_htf_draw4h_neutral`) | H1 (pick) | 3.12 · 85% | 42.2 / 2.3 | $218 | 22.5 | 4.27 | +32,590 | 5,347 | -2,081 | 64.8 / 3.9 | 94.5 | +37,962 | 0.095 |
|  | H2 (check) | 2.56 · 81% | 34.6 / 0.0 | $265 | 35.0 | 2.84 | +12,527 | 3,373 | -2,190 | 53.8 / 10.3 | 80.6 | +15,047 | 0.013 |
|  | 2021-25 (ref) | 2.38 · 76% | 9.8 / 7.6 | $937 | 17.5 | 1.04 | +3,295 | 65 | -12,474 | 15.0 / 20.5 | 31.7 | +11,515 |  |
| **2. Fresh trap × clear HTF path** (`lit_htf_trap_x_clearlv`) | H1 (pick) | 3.12 · 85% | 52.3 / 3.1 | $176 | 22.5 | 5.49 | +43,621 | 7,157 | -2,196 | 71.1 / 6.2 | 92.7 | +43,377 | 0.003 |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.61 | +11,987 | 3,227 | -2,101 | 47.4 / 0.0 | 97.3 | +14,300 | 0.102 |
|  | 2021-25 (ref) | 2.38 · 76% | 10.6 / 7.9 | $866 | 17.5 | 1.03 | +2,152 | 42 | -17,442 | 15.9 / 20.1 | 29.7 | +4,885 |  |
| **3. Clear 1H path 1.25x / 0.75x** (`lit_htf_clear1h_size`) | H1 (pick) | 3.12 · 85% | 41.4 / 3.1 | $222 | 22.5 | 4.8 | +39,863 | 6,540 | -2,369 | 64.1 / 10.9 | 85.5 | +39,783 | 0.102 |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.48 | +10,884 | 2,930 | -2,183 | 50.0 / 0.0 | 96.0 | +13,253 | 0.155 |
|  | 2021-25 (ref) | 2.38 · 76% | 11.0 / 7.7 | $835 | 17.5 | 0.97 | -2,320 | -45 | -17,543 | 17.4 / 20.5 | 30.5 | +8,762 |  |
| Fresh trap × clear 1H path (`lit_htf_trap_x_clear1h`) | H1 (pick) | 3.12 · 85% | 52.3 / 2.3 | $176 | 22.5 | 5.18 | +42,095 | 6,906 | -2,196 | 71.1 / 3.9 | 94.5 | +42,493 | 0.003 |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.56 | +11,382 | 3,064 | -2,101 | 47.4 / 0.0 | 97.3 | +13,470 | 0.185 |
|  | 2021-25 (ref) | 2.38 · 76% | 8.9 / 7.0 | $1,031 | 17.5 | 1.07 | +5,769 | 113 | -14,305 | 16.2 / 19.3 | 31.5 | +2,591 |  |
| Clear HTF path 1.25x / 0.75x (`lit_htf_clearlv_size`) | H1 (pick) | 3.12 · 85% | 42.2 / 3.9 | $218 | 22.5 | 4.45 | +38,184 | 6,265 | -2,886 | 64.8 / 10.9 | 84.5 | +38,509 | 0.328 |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.25 | +9,397 | 2,530 | -2,183 | 43.6 / 0.0 | 96.0 | +13,371 | 0.135 |
|  | 2021-25 (ref) | 2.38 · 76% | 10.1 / 9.2 | $909 | 17.5 | 0.95 | -4,738 | -93 | -17,295 | 16.3 / 21.7 | 28.1 | +8,837 |  |
| Clear path, both kinds (`lit_htf_clearpath_size`) | H1 (pick) | 3.12 · 85% | 42.2 / 3.1 | $218 | 22.5 | 4.7 | +37,996 | 6,234 | -2,369 | 64.8 / 10.9 | 85.5 | +38,103 | 0.182 |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.48 | +10,884 | 2,930 | -2,183 | 50.0 / 0.0 | 96.0 | +13,366 | 0.113 |
|  | 2021-25 (ref) | 2.38 · 76% | 10.3 / 7.7 | $891 | 17.5 | 1.06 | +5,018 | 98 | -15,726 | 17.0 / 20.6 | 30.8 | +9,526 |  |
| Reference: fresh trap only (`lit_sel_trap6_size`) | H1 (pick) | 3.12 · 85% | 43.0 / 2.3 | $213 | 22.5 | 5.09 | +39,712 | 6,515 | -2,206 | 67.2 / 5.5 | 92.7 | +41,476 |  |
|  | H2 (check) | 2.56 · 81% | 29.5 / 0.0 | $311 | 35.0 | 2.63 | +11,353 | 3,057 | -2,003 | 47.4 / 0.0 | 97.2 | +12,361 |  |
|  | 2021-25 (ref) | 2.38 · 76% | 7.6 / 6.7 | $1,208 | 17.5 | 0.96 | -3,168 | -62 | -15,862 | 14.6 / 20.3 | 29.5 | +1,414 |  |
| 4H draw 1.25x / 0.75x, as first declared (`lit_htf_draw4h_size`) | H1 (pick) | 3.12 · 85% | 39.1 / 0.0 | $235 | 22.5 | 3.8 | +24,991 | 4,100 | -1,975 | 66.4 / 0.0 | 100.0 | +36,062 | 0.117 |
|  | H2 (check) | 2.56 · 81% | 25.6 / 0.0 | $359 | 35.0 | 2.76 | +11,871 | 3,196 | -2,066 | 53.8 / 10.3 | 70.7 | +13,273 | 0.013 |
|  | 2021-25 (ref) | 2.38 · 76% | 8.3 / 6.2 | $1,106 | 17.5 | 1.01 | +728 | 14 | -14,908 | 13.6 / 16.3 | 30.3 | +8,706 |  |
| Fresh trap × 4H draw (`lit_htf_trap_x_draw4h`) | H1 (pick) | 3.12 · 85% | 42.2 / 0.0 | $218 | 22.5 | 4.93 | +33,788 | 5,543 | -2,043 | 68.0 / 1.6 | 95.5 | +39,910 | 0.005 |
|  | H2 (check) | 2.56 · 81% | 23.1 / 0.0 | $397 | 35.0 | 2.59 | +10,760 | 2,897 | -1,783 | 47.4 / 0.0 | 100.0 | +13,430 | 0.028 |
|  | 2021-25 (ref) | 2.38 · 76% | 6.4 / 5.4 | $1,434 | 17.5 | 0.98 | -1,800 | -35 | -17,835 | 13.5 / 19.2 | 31.0 | +4,107 |  |
| WITH the HTF draw: 1.25x / 0.75x (`lit_htf_with_draw_size`) | H1 (pick) | 3.12 · 85% | 35.9 / 2.3 | $256 | 22.5 | 4.12 | +30,551 | 5,012 | -2,116 | 60.2 / 3.9 | 93.9 | +35,128 | 0.268 |
|  | H2 (check) | 2.56 · 81% | 25.6 / 0.0 | $359 | 35.0 | 2.62 | +10,602 | 2,854 | -2,000 | 51.3 / 10.3 | 68.0 | +10,564 | 0.400 |
|  | 2021-25 (ref) | 2.38 · 76% | 7.7 / 6.6 | $1,192 | 17.5 | 1.09 | +7,631 | 149 | -12,780 | 13.6 / 16.6 | 29.1 | +11,078 |  |
| WITH the HTF draw: skip without | H1 (pick) | 1.68 · 41% | 26.6 / 0.0 | $345 | 20.9 | 3.97 | +16,005 | 2,626 | -2,319 | 46.9 / 0.0 | 95.9 | +20,485 |  |
|  | H2 (check) | 1.35 · 31% | 17.9 / 0.0 | $513 | 28.6 | 2.21 | +4,713 | 1,269 | -2,173 | 42.3 / 0.0 | 78.7 | +4,629 |  |
|  | 2021-25 (ref) | 1.29 · 38% | 6.5 / 5.0 | $1,412 | 21.4 | 1.05 | +2,614 | 51 | -8,116 | 11.5 / 9.6 | 36.0 | +2,943 |  |
| WITH the HTF draw: London only when aligned (`lit_htf_with_draw_london`) | H1 (pick) | 2.23 · 63% | 37.5 / 0.0 | $245 | 26.3 | 3.74 | +21,006 | 3,446 | -2,039 | 54.7 / 0.0 | 100.0 | +31,012 |  |
|  | H2 (check) | 1.67 · 44% | 17.9 / 0.0 | $513 | 30.8 | 1.61 | +2,963 | 798 | -2,173 | 43.6 / 0.0 | 74.2 | +3,839 |  |
|  | 2021-25 (ref) | 1.75 · 57% | 5.2 / 7.6 | $1,765 | 21.3 | 0.89 | -7,805 | -153 | -19,741 | 9.2 / 15.5 | 25.2 | -6,583 |  |
| AGAINST the HTF draw: skip (`lit_htf_against_skip`) | H1 (pick) | 2.62 · 81% | 28.1 / 2.3 | $327 | 17.9 | 3.41 | +21,298 | 3,494 | -2,804 | 52.3 / 3.1 | 93.0 | +26,965 |  |
|  | H2 (check) | 2.12 · 75% | 34.6 / 0.0 | $265 | 33.3 | 3.58 | +12,273 | 3,304 | -2,665 | 56.4 / 0.0 | 78.7 | +10,693 |  |
|  | 2021-25 (ref) | 2.01 · 62% | 7.1 / 6.6 | $1,293 | 19.1 | 0.99 | -637 | -12 | -9,148 | 13.2 / 16.6 | 25.8 | +3,815 |  |
| 4H draw: skip without | H1 (pick) | 1.56 · 41% | 26.6 / 0.0 | $345 | 22.5 | 4.58 | +17,287 | 2,836 | -1,770 | 50.0 / 0.0 | 100.0 | +22,060 |  |
|  | H2 (check) | 1.41 · 44% | 25.6 / 0.0 | $359 | 36.4 | 3.35 | +10,524 | 2,833 | -1,968 | 44.9 / 0.0 | 78.1 | +11,274 |  |
|  | 2021-25 (ref) | 1.32 · 39% | 6.5 / 3.2 | $1,412 | 19.0 | 1.12 | +6,159 | 121 | -12,911 | 12.6 / 6.8 | 39.5 | +2,387 |  |
| 4H draw: London only when aligned (`lit_htf_draw4h_london`) | H1 (pick) | 2.07 · 67% | 40.6 / 0.0 | $226 | 28.3 | 5.17 | +27,753 | 4,553 | -1,732 | 64.1 / 0.0 | 100.0 | +34,641 |  |
|  | H2 (check) | 1.86 · 56% | 28.2 / 0.0 | $326 | 41.4 | 3.44 | +12,141 | 3,269 | -2,096 | 53.8 / 0.0 | 78.7 | +12,027 |  |
|  | 2021-25 (ref) | 1.76 · 57% | 5.8 / 6.7 | $1,583 | 21.2 | 1.08 | +4,990 | 98 | -10,416 | 12.5 / 16.3 | 30.4 | -1,668 |  |
| Prior day closed beyond: London only when aligned (`lit_htf_pdbos_london`) | H1 (pick) | 1.8 · 48% | 46.1 / 0.0 | $199 | 32.6 | 9.14 | +35,766 | 5,868 | -1,496 | 59.4 / 0.0 | 100.0 | +38,588 |  |
|  | H2 (check) | 1.41 · 44% | 12.8 / 0.0 | $717 | 36.4 | 1.0 | +12 | 3 | -1,734 | 17.9 / 0.0 | 100.0 | +2,969 |  |
|  | 2021-25 (ref) | 1.46 · 48% | 2.5 / 7.9 | $3,672 | 22.9 | 0.9 | -5,689 | -111 | -13,906 | 5.1 / 15.7 | 21.3 | -14,565 |  |
| Clear HTF path: London only when aligned (`lit_htf_clearlv_london`) | H1 (pick) | 2.7 · 85% | 28.9 / 0.0 | $318 | 24.6 | 3.81 | +25,303 | 4,151 | -2,293 | 47.7 / 4.7 | 83.8 | +29,841 |  |
|  | H2 (check) | 2.37 · 81% | 42.3 / 0.0 | $217 | 40.5 | 3.47 | +15,305 | 4,121 | -1,767 | 73.1 / 0.0 | 100.0 | +17,895 |  |
|  | 2021-25 (ref) | 2.1 · 68% | 8.3 / 8.1 | $1,106 | 19.7 | 1.24 | +17,598 | 345 | -8,886 | 13.4 / 21.5 | 32.1 | +10,580 |  |
| Daily draw: skip without | H1 (pick) | 1.95 · 63% | 28.9 / 0.0 | $318 | 22.0 | 3.17 | +14,383 | 2,360 | -2,375 | 48.4 / 0.0 | 87.4 | +21,930 |  |
|  | H2 (check) | 1.73 · 44% | 19.2 / 0.0 | $478 | 29.6 | 2.4 | +6,937 | 1,868 | -2,186 | 43.6 / 0.0 | 93.8 | +6,485 |  |
|  | 2021-25 (ref) | 1.5 · 46% | 5.6 / 4.1 | $1,639 | 19.9 | 0.92 | -4,288 | -84 | -12,609 | 9.9 / 9.6 | 35.2 | +3,981 |  |

### What the rules say

- **Skip rules fail the frequency rule or lose money.**
  - "WITH the HTF draw, skip without" trades 1.7 / 1.35 a week (41% / 31% of weeks with 2+). It loses $17.3k / $5.8k and
    the 2-week pass falls to 26.6% / 17.9%.
  - The 4H draw as a filter: 1.56 / 1.41 a week, −$16k in H1.
  - The daily draw as a filter: 1.95 / 1.73 a week, −$18.9k / −$3.5k.
- **"HTF-aligned only on the London setups" fails in one half every time.**
  - WITH the draw: −$12.3k / −$7.5k.
  - Prior day closed beyond: the best H1 of all (46.1% 2-week pass, PF 9.1), then H2 12.8% and +$12. A textbook H1 mirage.
  - The clear HTF path: the reverse. H1 28.9% (−$8.0k), H2 42.3% ($217 per pass), 2021-25 +$17.6k with the DD down to
    −$8.9k. It fails the pick half, so it is not adopted. It is the one to re-check after 40 more trades.
- **AGAINST the HTF draw: skip** helps H2 (34.6%, +$1.8k) and costs H1 $12k (28.1%). Rejected.
- **Size rules** keep every trade (3.12 / 2.56 a week, 85% / 81% of weeks with 2+). They only move money between trades:
  - **The 4H draw** puts its size on better trades in both halves (shuffle p 0.12 / 0.013 as first declared).
    - As first declared (1.25x / 0.75x) it shrinks the average size to 0.94x, so H1 lost $8.3k on the eval path. The
      pass rate was still up (39.1% / 0.0% fail), but H2 fell to 25.6%.
    - Made size-neutral (1.4x / 0.8x, average 1.03x) it is **the only rule that raises the 2-week pass in both halves**.
    - **Neighbours agree:** 1.25 / 0.85 gives 39.1% / 30.8%. 1.5 / 0.75 gives 42.2% / 34.6%. A 10-day or 40-day 4H swing
      memory (instead of 20) gives 42.2% / 34.6%.
    - **2021-25 agrees:** +$3.3k vs −$1.4k, DD −$12.5k vs −$17.7k, no-room-cap $ +$7.3k.
    - **The cost:** H2 evals that don't pass in 2 weeks fail more often later. H2 1-month fails go 0% → 10.3% and the H2
      pass rate 95.7% → 80.6%. H1 fails go down (1-month 6.2% → 3.9%).
  - **The clear paths** (no opposing 1H FVG, or no untaken HTF level, between entry and target) raise H1 a lot and leave
    H2's 2-week pass at 29.5%.
    - **Money:** +$1.6k to +$1.7k in H2 without the room cap.
    - **The 1H FVG version is stable:** a 2, 5 or 10-day FVG memory gives the same result (41.4% / 29.5%). The 4H FVG
      version lowers H2 to 23.1%.
    - **Stacked with the fresh trap** (1.25 × 1.25 = 1.56x down to 0.75 × 0.75 = 0.56x, capped at $900 at risk), they
      give the best H1: 52.3% 2-week pass, $176 per pass, pass rate 92.7-94.5%. H2 stays at 29.5% with +$0.9k to +$1.5k.
      Most of that is the fresh trap: alone it gives 43.0% / 29.5%.
  - **WITH the HTF draw as a size rule:** worse in H1 and H2. Rejected.
  - **Fresh trap × 4H draw:** H2 falls to 23.1%. Rejected.

## 5. Recommendation

**Nothing from the HTF study should be a filter.** No skip rule, no "WITH the HTF draw", no "London only when aligned".
They cut LIT below 2 trades a week or fail one half.

**Top 3 adopt-candidates** (optional sizing switches, off by default, low confidence):

1. **4H draw, size-neutral** (run `lit_htf_draw4h_neutral`).
   - **The rule:**
     1. Build 4H candles from the 5m bars, starting at 18:00 ET (18, 22, 02, 06, 10, 14).
     2. A 4H swing high is a 4H candle whose high is above the 2 candles before it and at least the 2 after it. It counts
        once the 2nd candle after it has closed. Swing lows are the mirror.
     3. "Unswept" = price hasn't traded beyond it since it was confirmed, and it is at most 20 trading days old.
     4. At the close of the LIT trigger bar, find the nearest unswept 4H swing high above price and the nearest unswept
        4H swing low below price.
     5. If the nearer of the two is on the trade's target side (above for a long, below for a short), size **1.4x**. If it
        is behind the trade, **0.8x**. If there is none, 1x.
     6. Apply it on the eval size, with the weekly stop, one rounding, at least 1 micro. A sized-up trade never risks more
        than $900. The 60% room cap still applies.
   - **Numbers:**
     - 2-week pass / fail: H1 42.2% / 2.3% (base 37.5 / 3.1); H2 34.6% / 0.0% (base 29.5 / 0.0).
     - Cost per 2-week pass: $218 / $265 (base $245 / $311).
     - Net: +$32,590 / +$12,527 (base +$33,305 / +$10,465); $/month $5,347 / $3,373.
     - PF 4.27 / 2.84; max DD −$2,081 / −$2,190.
     - No room cap: +$0.9k / +$3.4k.
     - 2021-25: +$3.3k, DD −$12.5k (base −$1.4k, −$17.7k).
     - Shuffle p 0.095 / 0.013.
   - **The cost:** H2 1-month fails 10.3% (base 0%); the H2 pass rate 80.6% instead of 95.7%.
   - **The caveat:** the 1.4 / 0.8 split was set after the declared 1.25 / 0.75 version lost size in H1. Its neighbours
     give the same 2-week numbers.
2. **Fresh trap × clear HTF path** (run `lit_htf_trap_x_clearlv`).
   - **The rule:** multiply two tilts.
     - The fresh-trap tilt: 1.25x when the qualifying inducement swing was made at most 6 five-minute bars before the
       sweep, else 0.75x.
     - The clear-path tilt: 1.25x when **no untaken HTF level** lies between the entry and the VIX-band target, else
       0.75x. HTF levels are PDH/PDL, PWH/PWL, PMH/PML and the NWOG/NDOG edges. "Untaken" = not traded through since
       today / this week / this month started (for gaps: since the gap opened).

     So the size is 1.56x, 0.94x or 0.56x, with one rounding and the $900 cap.
   - **Numbers:**
     - 2-week pass / fail: H1 52.3% / 3.1%; H2 29.5% / 0.0% (unchanged).
     - Cost per 2-week pass: $176 / $311.
     - Net: +$43,621 / +$11,987 (+$10.3k / +$1.5k); PF 5.49 / 2.61; max DD −$2,196 / −$2,101.
     - Median sessions to pass: 7 in H1 (base 10.5).
     - 2021-25: +$2.2k (base −$1.4k).
     - Shuffle p 0.003 / 0.10.
   - **The caveat:** most of the gain is the fresh trap (`lit_sel_trap6_size`: 43.0% / 29.5%). The pairing was chosen after
     both pieces were seen to hold in H2.
3. **Clear 1H path** (run `lit_htf_clear1h_size`).
   - **The rule:** 1.25x when no unfilled opposing 1H FVG sits between the entry and the VIX-band target, else 0.75x.
     - For a long, an opposing 1H FVG is three clock-hour candles where the 3rd candle's high is below the 1st candle's
       low. It is at most 5 days old, and price has not yet traded above its top.
     - "Between" means the gap's bottom is above the entry and below the target.
     - For a short it is the mirror.
   - **Numbers:**
     - 2-week pass / fail: H1 41.4% / 3.1%; H2 29.5% / 0.0%.
     - Cost per 2-week pass: $222 / $311.
     - Net: +$39,863 / +$10,884 (+$6.6k / +$0.4k); no room cap +$2.7k / +$1.6k.
     - 2021-25 no room cap +$4.5k.
     - The same result with a 2 or 10-day FVG memory.
     - Shuffle p 0.10 / 0.16.
   - **The cost:** H1 1-month fails 10.9% (base 6.2%).

**What I'd do:**
- Log the three tilts (and the trader's A/B/C grade from `lit-trade-selection.md`) on every paper trade.
- If one goes in now, make it **rule 1**, as `lit_sizing` multiplier 1.4 / 0.8, off by default. It is the only one that
  helps the owner's 2-week number in both halves.
- **Re-decide after about 40 more trades (about 3-4 months).**
  - The H2 gains are 4 extra passes out of 78 eval starts.
  - The shuffle tests pass in one half each, except rule 1, which passes in H2 and nearly in H1.
- **Live wiring would be small.** Every fact uses only 5m bars, and the live loop already holds bars from the previous
  month's first day, which covers a 20-day 4H swing memory. Nothing was wired. `live_model.json`, `engine/lit_live.py`,
  `STRATEGY.md` and the dashboards are untouched.

## Honest caveats

- **2026 is one year:** 176 filled setups and 120 trades. A handful of 5-8R winners decides every comparison. H2 has 40
  trades.
- **Post-hoc steps are marked.** The follow-ups (the size-neutral 4H split, the stacks, the combined clear path) were run
  after the map had shown both halves. H2 is therefore not a perfectly clean check for them. The map itself, the combos
  and the first 76 rules were picked on H1 and checked on H2 as declared.
- **Setups on the same day are correlated** (2+ setups on 97 of 167 days). The setup-level p-values are a bit optimistic.
  The taken-trade p-values (one a day) don't have that problem.
- **2021-25 has no 1m data** (5m entries, LIT has no edge there). It is a reference line only.
- **Already tested elsewhere, not redone:** HTF FVG / order-block targets (`lit-untested-targets.md`, rejected); 4H / 1H
  draw and candle bias as top-down filters, 4H/1H EMA trend, premium/discount vs the 18:00 and midnight opens, ES SMT
  (`lit-losses.md`, rejected); prior-day / prior-week / Asia premium-discount skips and halves (`lit-report-coverage.md`,
  rejected); PO3 vs the opens on the early LIT (`lit-strategy.md`). Order blocks were left to the OB study
  (`tools/lit_ob.py`).

## Files and how to rerun

1 CPU process; each step takes 1-3 minutes.
- `python tools/lit_htf.py build`: the 42 HTF facts for every candidate → `research/runs/_cache/lithtf_*.pkl`.
- `python tools/lit_htf.py lookahead 10`: the truncation test (0 differences on 10 + 20 setups).
- `python tools/lit_htf.py map`: the confluence map → `research/lit/htf_map.json`.
- `python tools/lit_htf.py chance`: holders vs chance.
- `python tools/lit_htf.py combos`: 2- and 3-way combinations → `research/lit/htf_combos.json`.
- `python tools/lit_htf.py rules`: skip / size / London-only for every survivor → `research/lit/htf_rules.json`.
- `python tools/lit_htf.py followups`: neighbours, FVG and 4H swing memory, stacks → `research/lit/htf_followups.json`.
- `python tools/lit_htf.py final` / `save`: the shuffle tests → `research/lit/htf_final.json`, and the runs `lit_htf_*`
  (family other, tags lit, lit_htf).
- Nothing was committed by this study.
