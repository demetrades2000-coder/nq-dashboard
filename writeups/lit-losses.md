## Adopted (2026-10-18)

- The pack is live: `engine/lit.py` options `monday` and `wk_stop` (off by default, so `lit_final` stays reproducible), on in
  `live_model.json`. Run **`lit_live`** = the engine with the options; it equals `lit_loss_pack` trade for trade (630 trades,
  `python tools/lit_losses.py live`).
- The PC bot and the cloud monitor apply both (`engine/lit_live.py`): the weekly stop counts this week's stop-outs from the
  bot's own ledger (cloud: its LIT paper ledger; PC: its routed exits, kept across the days of the week in
  `data/live_state.json`), and the model's replay for any day the ledger does not cover. `tests/test_lit_live.py` with the pack:
  every 2026 session gives the backtest's trades.

## In one minute

- **The order (owner, 2026-10-18):**
  - Make LIT a strategy a real trader would trade: profitable **and** consistent within 2026.
  - Find where and why it loses. Think where I wouldn't think.
  - Judge on 2026 only. Every rule is picked on **Jan-Jun (H1)** and checked on **Jul-Oct (H2)**. 2021-25 is a reference line.
- **Why LIT loses, in one sentence:** it loses when the sweep is *not* the day's turning point. In those trades the price never
  moves in our favour, and the stop is hit within the hour.
  - The **18 trades whose sweep turned out to be the day's high or low made +$30.0k**: 77% of the year, 78% winners.
  - The **53 trades taken after the day's opposite extreme was already in** lost −$2.5k (PF 0.73).
  - You only know which kind a trade was afterwards, so this can't be a rule. It is why LIT wins rarely and big.
- **What helps both halves** (picked on H1, checked on H2):
  1. **Weekly stop:** after 2 stop-outs in a calendar week, trade half size for the rest of that week.
  2. **Monday rule:** on Monday, once price has taken Friday's high, take only shorts. Once it has taken Friday's low, take only
     longs. This is a trade back toward Friday's other side.
  3. **Optional, money rather than safety:** 1.5× size on the trade after a winner.
- **Recommended: LIT final + rules 1 and 2** (run `lit_loss_pack`):

| | Trades/wk | Win % | PF | Net $ | $/month | Max DD | Eval 2 wk pass/fail | Eval 1 mo pass/fail | Pass rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Pack, 2026** | 2.91 | 26.7 | **3.66** | **+41,734** | **4,254** | **−2,315** | 26.7 / **1.9** | 55.3 / **3.9** | **95.5%** |
| LIT final, 2026 | 3.08 | 23.6 | 3.06 | +38,873 | 3,963 | −3,097 | 29.1 / 9.2 | 48.1 / 16.0 | 79.9% |
| Pack, H1 (picked on) | 3.12 | 22.5 | 4.44 | +32,773 | 5,377 | −2,315 | 28.9 / 3.1 | 61.7 / 6.2 | 92.3% |
| LIT final, H1 | 3.32 | 18.8 | 3.55 | +30,661 | 5,030 | −3,097 | 32.8 / 14.8 | 52.3 / 25.8 | 66.3% |
| Pack, H2 (check) | 2.56 | 35.0 | 2.46 | +8,962 | 2,413 | −1,466 | 23.1 / 0.0 | 44.9 / 0.0 | 100% |
| LIT final, H2 | 2.69 | 33.3 | 2.19 | +8,212 | 2,211 | −1,741 | 23.1 / 0.0 | 41.0 / 0.0 | 100% |
| Pack, 2021-25 (reference) | 2.38 | 17.5 | 1.01 | +1,275 | 25 | −20,462 | 6.6 / 14.3 | 12.9 / 34.4 | 28.4% |
| LIT final, 2021-25 | 2.49 | 18.4 | 1.03 | +3,806 | 75 | −20,695 | 7.1 / 16.3 | 15.0 / 39.2 | 31.6% |

- **What the pack changes:**
  - **2026:** the worst month goes from −$466 to −$34. The longest run without a winner goes from 14 to 12.
  - **Evals:** fails within a month drop from 16% to 4%. Back to back, 10 passed and 2 failed (was 10 and 3).
  - **The price:** a pass now takes a median 16 sessions (was 12), and 86% of weeks have 2+ trades (was 90%).
  - **2021-25 (reference):** $2.5k less. The Monday rule costs money there.

## How this was done

- **Code:** `tools/lit_losses.py`. It imports `engine/lit.py` and `tools/lit_final.py` and edits neither.
  - Its executor is a copy of `lit.simulate_x` / `lit._run_core` with extra options that are off by default.
  - With no options it gives LIT final's 661 trades exactly (`python tools/lit_losses.py check`).
- **Data:** CME NQ1! 5m, with true 1m bars for 2026 entries (`data/NQ_1m.csv`), plus `data/ES_5m.csv` (from 2025-04),
  `data/VIX_1d.csv` (CBOE) and `data/news/events.csv`. Official data only.
- **Size and costs:** same as LIT final. $800 risk up to a 20-pt stop, then 800×20/stop, MNQ, max 40 micros, $1.40 per micro and 1
  tick of slippage. A "half size" rule re-sizes the finished trade exactly, with a floor of 1 micro. A "skip" rule removes the
  setup, so the day stays free for a later one.
- **Pick and check:** each rule family is a small grid.
  - The pick is the best H1 net with 2+ trades a week. The weekly stop is the exception (see below).
  - H2 is only looked at afterwards.
  - "Helps both" means better net $ in H1 **and** H2 at 2+ trades a week. For the eval, the drawdown and fail rates were checked too.
- **Commands:** `anatomy`, `rules`, `refine`, `combos`, `masters`, `reim`, `tf`, `tf_relaxed`, `save`.
- **Results:** `research/lit/losses_*.json` (`anatomy`, `rules`, `refine`, `combos`, `masters`, `tf`).

## 1. Loss anatomy: every 2026 trade of LIT final

**How the 127 trades ended:**

| Exit | Trades | Net $ | What it means |
|---|---:|---:|---|
| Target (VIX band or the 8R bank) | 23 | +52,884 | the whole profit |
| End of day | 8 | +4,831 | 7 of 8 positive |
| Breakeven | 37 | −490 | costs only; went a median **+1.85R** first |
| Stop | 59 | **−18,352** | 97% of all lost dollars |

**What a losing trade looks like** (the 59 stop-outs):
- **It never worked.** The median best point before the stop was **+0.30R**, and 70% never reached +0.5R.
- **It isn't a fast shake-out either.** The median time to the stop is 45 minutes, and only 14% stopped within 15 minutes.
- So the loss is a setup that was wrong, not a good setup that got wicked out. That's why trailing, partials and tighter
  breakevens don't help (section 2).

**Where the losses cluster.** Each row compares a bucket against the rest. "H1 / H2" is the bucket's net $ in each half.

| Pattern (setup-time, usable as a rule) | Trades | Win % | PF | Net $ | H1 / H2 | Read |
|---|---:|---:|---:|---:|---:|---|
| Inducement older than 10 bars (50 min) | 35 | 11.4 | **0.67** | −1,954 | −3,864 / +1,910 | old inducement = stale trap |
| Inducement 5 bars or fresher | 50 | 30.0 | 6.03 | +28,272 | +21,955 / +6,317 | |
| Planned stop over 47 pts | 42 | 11.9 | **0.85** | −536 | −322 / −214 | loses in both halves, but small size keeps it cheap |
| CPI week | 26 | 11.5 | **0.86** | −810 | −1,011 / +201 | |
| Monday | 27 | 18.5 | 1.23 | +825 | +1,332 / −507 | Wednesday is best (PF 4.81) |
| Entry 05:00-06:00 ET | 17 | 5.9 | **0.88** | −428 | −2,408 / +1,980 | London lunch |
| Entry 07:00-09:00 ET | 25 | 16.0 | 1.63 | +3,000 | +5,044 / −2,044 | weak before the NY open |
| Previous trade was a stop-out | 60 | 16.7 | 1.42 | +4,294 | −1,205 / +5,499 | |
| Previous trade was a winner | 29 | 34.5 | **6.32** | +14,544 | +10,359 / +4,185 | winners come in clusters |
| ES did **not** sweep its own low (textbook SMT) | 28 | 25.0 | 1.62 | +3,270 | +4,440 / −1,170 | the opposite of the textbook |
| ES swept too (both indices agree) | 86 | 24.4 | 3.99 | +35,528 | +26,853 / +8,675 | |
| Last 4H candle already closed the trade's way | 44 | 20.5 | 1.46 | +2,975 | +264 / +2,710 | LIT likes the counter 4H candle |
| Last 4H candle closed against the trade | 83 | 25.3 | 3.88 | +35,899 | +30,397 / +5,502 | |
| Sweep in the first/last 3 min of a 15m candle | 49 | 18.4 | 1.74 | +5,732 | +1,256 / +4,476 | the "3-minute rule" is reversed here |
| No engineered liquidity (no near-miss of a pool within 0.1%) | 25 | 12.0 | 0.92 | −295 | −1,135 / +840 | |
| Monday, Friday's high taken, trade was long (or low taken, short) | 10 | 0 | 0 | −1,301 | −997 / −304 | the Monday rule |

**Hindsight facts** (can't be rules, but explain the shape):
- **The sweep was the day's extreme:** 18 trades, 78% winners, **+$30,009**.
- **The opposite extreme of the day was already in before the entry** (the long came after the day's high was made):
  53 trades, 11% winners, **−$2,510**.
- **Speed:** trades that lasted under 53 minutes made −$4,781. Trades over 132 minutes made +$29,540.

**No real difference between winners and losers (looked, found nothing):**
- the VIX level;
- the range already used vs the VIX move (exhaustion);
- sweep depth;
- the 1H trend;
- which side the 1H draw is on;
- news days themselves;
- the NWOG side;
- long vs short;
- the day after a big day;
- second sweeps of the same side, which are actually *better* (PF 3.81).

## 2. Rules: picked on H1, checked on H2

All numbers are the change in net $ vs LIT final (H1 +$30,661, H2 +$8,212).

### The ones that help both halves

| Rule | Picked on H1 from | H1 Δ$ | H2 Δ$ | H1 / H2 PF | H1 / H2 max DD | 1-month eval fail H1 / H2 | 2021-25 (ref) | Verdict |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Weekly stop: 2 stop-outs → half size for the rest of the week** | n 1/2/3 × size 0.5/0.25 | +33 | +713 | 3.99 / 2.45 | −2,766 / −1,613 | 16.4% / 0% (was 25.8 / 0) | +$4.6k, DD −19.9k (better) | **adopt** |
| **Monday rule: after Friday's high (low) is taken, only shorts (longs)** | one rule | +2,587 | +304 | 3.98 / 2.29 | −2,939 / −1,594 | 21.9% / 0% | +$0.5k (worse by $3.3k) | **adopt, small sample** |
| 1.5× size on the trade after a winner | 1.25/1.5/2 × next 1/2 | +4,850 | +1,675 | 3.86 / 2.32 | −3,267 / −1,741 | 26.6% / 0% | +$1.6k (worse) | optional, not during an eval |
| Inducement no older than 12 bars (was 36) | 8/12/18/24/30 | +1,246 | +2,023 | 3.96 / 2.54 | −2,799 / **−2,399** | 20.3% / **17.9%** | PF 0.90, −$9.6k | not adopted |
| Half size above a 60-pt stop | 45-70 | +253 | +128 | 3.62 / 2.23 | −2,970 / −1,613 | 21.9% / 0% | +$4.0k | harmless, too small to matter |

**Weekly stop.**
- **The pick:** by H1 money alone the grid picks "3 stop-outs → quarter size" (+$905 H1, +$2 H2: flat out of sample).
- It is a risk rule, so it was picked on H1 by the fewest 1-month eval fails without costing H1 money. That gives "2 stop-outs →
  half": H1 fails 16.4% vs 24.2%. Both are listed; the second is the one that also helps H2.
- **What it touched in 2026:** 17 trades were halved. 16 were losers or scratches. The cost was one winner (2026-02-13 at half size,
  +$1,735).
- It never pauses trading.

**Monday rule.**
- **What it did in 2026:** it removed 10 Monday trades, all losers (−$1,301 together). On 3 of those days a later setup filled the
  free day (+$1,589).
- **Caveat:** small sample. In 2021-25 it costs $3.3k, so watch it.
- **Source:** IET's week rhythm (masters study D16).
- **The target version is a no-op:** "aim for Friday's other extreme" changed nothing, because that extreme is always beyond the
  8R bank.

**After a winner, 1.5×.**
- **It is a real tilt, not just more size:** return per dollar risked rises in both halves, from 101% to 109% in H1 and from 65% to
  72% in H2.
- **But it adds risk:** it raises the H1 drawdown and doesn't lower eval fails.
- **The grid's own H1 pick is worse:** 2× for the next 2 trades makes more money (+$8.9k / +$5.3k), but H2 eval fails jump to 31%
  within a month. Not for an eval.

**Inducement age.**
- **Shorter is better in both halves at every age from 8 to 24 bars.** The H1 pick, 8 bars, drops H2 to 1.73 trades a week, so
  12 is the strongest age that keeps 2+ a week.
- **Not adopted, because it worsens what the owner asked for:**
  - the H2 drawdown grows from −$1,741 to −$2,399;
  - H2 eval fails within a month go from 0% to 18%;
  - the 2021-25 PF falls to 0.90.

### Tested and rejected: hurt at least one half

"Where you wouldn't think" ideas are marked ★.

| Idea | H1 Δ$ | H2 Δ$ | Note |
|---|---:|---:|---|
| ★ Exhaustion: skip when the day's range already used > 1.0 VIX moves | −887 | −3,726 | 0.8 and 1.2 also worse |
| ★ Skip when the trade's side already ran > 0.4 moves | −698 | −5,639 | |
| ★ Second sweep of the same side today: skip | −2,366 | −3,887 | second sweeps are better |
| ★ Only the first setup of the day | −10,274 | −4,337 | |
| ★ Time since the London open: no entries 05:00-08:00 | +2,672 | −2,107 | 06-08 and 07-08 also fail H2 |
| Half size 05:00-06:00 | +1,357 | −1,342 | |
| Monday half / skip | −486 / −1,331 | −128 / +507 | |
| Friday half | −5,299 | +471 | |
| ★ Day after a big day (range > 1.6 VIX moves): half | −4,050 | −1,029 | |
| CPI week: skip / half | +1,011 / +387 | −201 / −194 | H1 only |
| FOMC week half; CPI or FOMC half | −3,260 / −2,873 | +494 / +300 | |
| News day half | −3,378 | +22 | |
| ★ First trade after 2 / 3 / 5 non-winners: half | −9,896 / −10,932 / −11,217 | −1,684 / −1,333 / −2,075 | cutting size after losses misses the clustered winners |
| ★ Smaller size until the week's first winner | −10,067 | −2,473 | drawdown −$1.7k / −$1.0k, but costs $12.5k |
| ★ After a stop-out, half size until the next winner | −10,831 | −2,688 | |
| ★ Half size after the account is $1,000 below its peak | −8,597 | −2,075 | |
| Stop size: skip above 40-60 pts | −431 to −9,607 | −168 to −2,282 | skipping loses the later winners |
| ★ ES SMT: skip when ES did not sweep | −3,097 | +259 | |
| ★ Size up 1.5× only when ES confirms | +12,675 | +3,751 | return on risk up in both, but H1 DD −$4.1k and 2-week eval fails 19.5%: leverage, not for an eval |
| ES: half when ES did not sweep | −2,088 | −183 | |
| Premium/discount vs the 18:00 open (skip / half) | −6,920 / −4,708 | −4,638 / −2,616 | |
| Premium/discount vs the midnight open (skip) | −7,150 | −1,636 | |
| Displacement body > 1.3 / 1.5 ATR: skip | −4,829 / −5,908 | +333 / +1,401 | |
| Climax sweep candle half; V-turn leg ≤ 2 bars half | −7,616 / −4,690 | +944 / −2,338 | |
| 4H candle with the trade: half | −387 | −1,825 | |
| 4H / 1H EMA trend against: half | −5,956 / −8,423 | −3,996 / −2,283 | |
| 1H draw against: half / skip | −7,426 / −15,687 | −1,598 / −3,486 | |
| VIX fell into today: half | −5,311 | +851 | |
| Minimum room to the VIX band 3 / 4 / 5R | −752 / −460 / −660 | −97 / −2,653 / −6,100 | |
| **Exit management** | | | |
| ★ Scale out 50% at the swept box's opposite side | −9,442 | −2,082 | |
| Scale out 50% at 2R / 3R | −9,548 / −6,905 | −5,247 / −4,035 | |
| ★ Trail behind 1m swings after 3R (k=2 / k=3) | −6,462 / −7,038 | −3,821 / −2,350 | after 2R or 4R also worse |
| ★ At +1R move the stop to the inducement, not to breakeven | −1,670 | −116 | |
| At +1R move the stop to −0.5R | −1,028 | −738 | |
| Breakeven at 2R | −429 | −611 | |

**Two things to note:**
- **Daily loss stop for the eval:** LIT takes at most 1 trade a day, and the worst 2026 day was −$755, under MFFU's $1,000 daily
  limit. A daily stop never fires. The weekly stop above is the version that does something.
- **Why exit management can't fix the breakevens:** the 37 breakevens went a median +1.85R before coming back, but every way of
  banking that early also cuts the 5-8R days that pay for the year.

## 3. Masters-study filters (`research/lit/masters.md`)

| Filter (source) | Best version tested | H1 Δ$ | H2 Δ$ | Verdict |
|---|---|---:|---:|---|
| D2 engineered liquidity (Marco) | swing within 0.1% of an unbroken pool in the 6 h before the trap, skip without | +1,865 | −960 | rejected (H2) |
| | within 0.3%, skip without | −149 | +5,174 | rejected (H1); 0.02-0.05% and half-size versions worse in both |
| D6 time confluence (IET, LIT 3-minute rule) | key times ±2/±5 min, or 15m candle edges, 0.5-0.75× without | −7,653 to −15,092 | −1,854 to −4,797 | rejected. 2026 sweeps at the 15m edges are *worse* (PF 1.74 vs 3.96) |
| D9 day after an outside day (IET "brakes") | half / skip | −2,366 / −4,591 | −2,743 / −4,480 | rejected. Those days are *better* (16 trades, PF 6.99) |
| D1 two lines (IET) | respected = 2 ATR, skip other sweeps | +1,137 | −1,267 | rejected; half-size version +875 / −490 |
| D13 3-4 same-direction legs since midnight (DreamsFX) | skip / half the 4th+ | −2,893 to −12,835 | −2,204 to −4,687 | rejected |
| D8 bank holidays and early closes off | skip | −502 | +318 | rejected (6 trades a year; harmless) |
| D16 Monday took Friday's high/low (IET) | target Friday's other extreme | 0 | 0 | no effect (the 8R bank is closer) |
| | only trade back toward Friday's other side | **+2,587** | **+304** | **adopted (the Monday rule)** |
| Reim's Asia box decoded (18:05-01:00) | added to every level | −707 | −1,960 | rejected |
| | Reim's levels only (Asia 18:05-01:00, London 03-04, NY 08-09, PDH/PDL, PWH/PWL) | −5,730 | −3,034 | rejected; H2 1.54 trades/wk, 2021-25 PF 0.74 |

**How each filter was coded:**
- **Engineered liquidity:**
  - With a whole-session lookback, nearly every trade "had" a near-miss (median gap 0.012%), which tests nothing. So it uses the
    6 hours before the sweep.
  - Equal-high pools are excluded, because they are built from the same swings.
- **Time confluence:** uses the 1-minute bar of the sweep extreme.
- **Two lines:** the nearest unswept 5m swing below price before the sweep, with price having moved at least k ATR away from it.
- **Legs:** successive closes above higher 5m swing highs since midnight, before the extreme.

## 4. Timeframes and switching between them

How each was built:
- **3m bars:** built from the cleaned true 1m bars.
- **15m bars:** resampled from the 5m file. The detector's windows are scaled to the same clock time: leg and sweep window 8 bars
  (2 h), inducement age 12 bars (3 h), limit 30 min.
- **Bias and draw:**
  - The HTF draw is the nearest unswept 1H/4H swing. A trade is allowed when the nearest swing lies on its target side.
  - The candle bias is the last closed 1H/4H candle's direction.

The 2021-25 lines can't show the entry timeframe, because those years have no 1m data and run on 5m.

| Setup → entry | H1 net | H1 trades/wk | H1 PF | H2 net | H2 trades/wk | H2 PF | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| **5m → 1m (LIT final)** | **+30,661** | 3.32 | 3.55 | **+8,212** | 2.69 | 2.19 | keep |
| 5m → 3m | +10,723 | 2.42 | 2.07 | +3,807 | 1.86 | 1.94 | worse in both |
| 5m → 5m | +5,361 | 2.19 | 1.66 | +1,253 | 1.54 | 1.30 | worse in both |
| 15m → 1m | +3,256 | 0.51 | 2.89 | −309 | 0.26 | 0.54 | far too few trades |
| 15m → 3m / 15m → 5m | −3,102 / −1,200 | 0.35 / 0.16 | | +75 / −147 | | | |
| 15m relaxed (depth 0.4, displacement 0.7, inducement 24 bars, max stop 100) → 1m | +8,566 | 0.86 | 4.18 | −271 | 0.45 | 0.67 | best 15m: still < 1/wk, loses H2 |
| Top-down: 4H draw → 5m → 1m | +17,236 | 1.68 | 4.12 | +8,008 | 1.54 | 2.99 | higher PF, but less money and < 2/wk |
| Top-down: 1H draw → 5m → 1m | +14,974 | 1.95 | 3.05 | +4,726 | 1.73 | 2.03 | |
| Top-down: 1H candle bias → 5m → 1m | +12,432 | 1.02 | 6.47 | +3,508 | 0.77 | 2.98 | |
| Top-down: 4H candle bias → 5m → 1m | +3,880 | 1.37 | 1.77 | +2,021 | 1.41 | 1.54 | |
| Top-down on 3m entries (4 combos) | +18 to +6,741 | ≤ 1.4 | | +119 to +4,843 | ≤ 1.35 | | worse |
| Top-down on 15m setups (8 combos) | −3,102 to +3,904 | ≤ 0.5 | | ≤ +362 | ≤ 0.2 | | too few trades |
| Adaptive: ATR(5m) > 22.1 → 3m entry, else 1m | +28,090 | 2.93 | 3.46 | +5,797 | 2.12 | 2.00 | best adaptive on H1: worse in both |
| Adaptive: ATR > 16.3 / 19.0 → 3m | +17,729 / +24,692 | | | +2,973 / +4,996 | | | worse |
| Adaptive (mirror): high ATR → 1m, quiet → 3m (16.3 / 19 / 22.1) | +24,267 / +16,685 / +13,287 | | | +9,196 / +6,432 / +5,757 | | | H1 worse |
| Adaptive: VIX move > 296 / 319 pts → 3m entry | +13,311 / +24,081 | | | +6,839 / +7,605 | | | worse |
| Adaptive: VIX move > 296 / 319 pts → 15m setup that day | +14,593 / +21,125 | 1.17 / 1.91 | | +5,152 / +7,125 | | | worse |

**What the timeframe tests say:**
- **The edge is the 1-minute confirmation on a 5-minute setup.** Every slower entry (3m, 5m) loses most of it, in both halves.
  Switching to 3m on fast days loses too, whichever way round the switch goes.
- **A 15m setup rarely forms under LIT's rules.** Its ATR-scaled displacement and sweep depth are bigger moves, and its stops
  exceed 80 pts. Even relaxed, it trades under once a week and loses in H2.
- **HTF draw / bias filters raise PF but cut trading below 2 a week** and lose money in both halves. None is adopted.

## What to adopt

1. **Adopt the weekly stop:** after 2 stop-outs in a calendar week (Mon-Fri trading days), every further trade that week is half
   size (micros halved, rounded down, minimum 1). It resets on Monday.
2. **Adopt the Monday rule:**
   - On a Monday session, as soon as price has traded above Friday's high, take only short setups for the rest of the day.
   - As soon as it has traded below Friday's low, take only long setups.
   - If both happened, there's no restriction.
   - A skipped setup leaves the day free for the next one.
3. **Keep the exits exactly as they are:** breakeven at 1R, VIX-band target, bank at 8R, flat 15:55. All 11 exit variants lost in
   both halves.
4. **Not now:**
   - **1.5× after a winner:** more money in both halves, but more risk. It is an idea for a funded account, not for an eval.
   - **Inducement ≤ 12 bars:** more money, but a worse H2 drawdown and worse evals.
   - **Every timeframe change.**

Together these are run `lit_loss_pack`. For the wiring, the rules are pure size/skip layers on top of LIT final's signals. A size
layer needs no engine change; the Monday rule needs only Friday's high/low (the Monday session's PDH/PDL) and the day's
high/low so far.

## Honest caveats

- **Thin samples.** 2026 has 127 trades. The Monday rule rests on 10 removed trades, and the weekly stop's H1 gain is $33.
- **The real gain is in drawdown and evals, not in dollars.** The 1-month eval fail rate falls from 16% to 4%, and the pass rate
  rises from 80% to 95.5%.
- **2021-25 (5m only) is no better.** The pack makes +$1.3k there vs +$3.8k for LIT final. The Monday rule costs $3.3k, and the
  weekly stop adds $0.8k.
- **H2 is still the weaker half:** +$9.0k, about $2,400 a month. Plan on that, not on the full-year average.
- **Paper only.** Nothing here touches the live bot (`engine/live.py`, `tools/cloud_monitor.py`, `live_model.json`,
  `engine/lab_adapter.py` and `engine/lit.py` are unchanged).
