## In one minute (owner summary)

- **I took LIT apart, one rule at a time**, and put it back together with as few rules as possible. Every result is judged the
  LIT way: pick on Jan-Jun 2026 (H1), check on Jul-Oct 2026 (H2), 2021-25 only as a reference. Money is with costs in.
- **Live LIT today:** H1 **+$33,901**, H2 **+$9,493** (~$2,550 a month), 2021-25 +$1,265. Eval path (two-week sizing): 2-week
  pass/fail **57.1 / 5.9 %** (H1) and **52.2 / 0.0 %** (H2).
- **What really makes the money (keep these, no question):**
  - **Displacement ≥ 0.8 ATR.** Without it H2 goes from +$9.5k to **−$1.3k**. It earns more than all of H2's profit.
  - **The 1m CISD entry.** Without it H1 loses $14.5k and the H2 2-week pass falls 52% → 36%.
  - **The VIX-band target.** A fixed 3R target loses $16.6k (H1) / $2.7k (H2); H2 2-week pass 52% → 35%.
  - **The inducement taken first.** Without it −$4.6k / −$2.1k, eval H2 +$9.1k → +$2.4k.
  - **On the eval:** the **Monday rule** is worth **$20k** on the H1 eval path and 6-8 points of 2-week pass;
    the **15-minute check** gives +4 / +1.5 points of 2-week pass and −2.5 / −2.9 points of fails.
- **What does nothing on today's eval (could go):**
  - **The weekly stop.** The two-week sizing ignores it, so on the eval it never changes a single micro in the first 10
    sessions. On the plain $800 size rule it is +$1.5k in H1 (all of it January) and −$0.2k in H2: noise. **But** it is
    insurance: in the Shapley test (LIT with other rules missing = LIT working badly) it saves ~$22k over 2021-25. I'd keep it.
  - **The $1,000 soft-daily-loss cap** in the two-week sizing never binds in 2026 (the 60% room cap is always smaller). Keep it
    as a seat belt: it costs nothing.
  - **Min target 1.5R, min stop 8 pts, entries after 14:30, the 15:55 flat time, BE + costs:** each moves less than ±$500 in
    2026. They are fine to keep and fine to drop.
- **A simpler LIT holds up.** Dropping the weekly stop, the 1.5R floor, the 15:55 flat and BE + costs (4 rules fewer):
  H1 +$34.9k, H2 +$9.6k, 2021-25 +$1.9k, eval 2-week 57.1 / 6.7 and 52.2 / 0.0. Same strategy, fewer moving parts.
- **Knobs on a cliff (overfitting risk):** displacement 0.8 (0.7 or 0.9 lose 4-21% of 2026 and 12-37% of H2), the 8R bank
  (a bank at 7.5 / 8.5 / 9R gives −$2.3k / +$2.8k / −$3.6k in 2026), the inducement distance 1.0 ATR (0.75 loses $7.5k of H2), the 02:00 start
  (02:30 loses $10.5k of H1) and the 1m CISD window 20 bars (19 bars loses $3.0k, 18 loses $9.6k).
- **My recommendation (needs your OK):**
  1. **1m CISD window 20 → 22 bars** (`"cisd1m": 22`). It moves LIT two bars away from a cliff. Same H1 to the dollar, H2
     +$426, eval odds unchanged. Insurance, not new money.
  2. *(optional safety dial)* **two-week room cap 60% → 55%** (`"room_f": 0.55`). H1 2-week fails 5.9% → 2.5%, H2 2-week the
     same, 1-month H2 fails 0% → 1.7%. It's a trade-off, not a free win.
  - Nothing big can be taken away. The rules that could go (weekly stop, 1.5R floor, flat time, BE + costs) earn nothing and
    cost nothing; the weekly stop is cheap insurance, so I would leave all of them as they are.
- **Not recommended:** the inducement-age lead (inducement at most 24 bars old: H2 +$4.8k, H2 2-week pass 52% → 67%). The whole
  gain is **one trade** (Aug 11, +$4,322 instead of −$276). Watch it on paper; don't trade it.
- **Honest count:** I scored 106 changed variants. 22 beat live in both halves. Chance alone would give about 25 (a coin flip
  in each half). So most "wins" here are luck. That's why the recommendations are about **taking things away** and
  **moving off cliffs**, not about new edges.

## Method

- **Engine:** `engine/lit.py` run_x (the live loop's code) on `live_model.json` "lit", through `tools/lit_final.py`
  (reproduces run `lit_live` trade for trade: 631/631 trades, 2026 120 trades +$43,394).
- **LIT size rule** = how `lit_live` is scored ($800 up to a 20-pt stop, then 800×20/stop, max 40 micros, weekly stop, $1.40
  commission). Shown for H1, H2 and 2021-25 (5m bars only there: the 15-minute check never acts; the 1m CISD runs on 5m bars).
- **Eval path** = the live two-week sizing (`engine/sizing.lit_qty`: two_week for 10 sessions, then safe_eval, no reset,
  $1.90 a micro, the pass / fail lock) on the engine's trades (`tools/lit_adopt_combo.units` + `tools/lit_big_ideas` /
  `lit_adv_manage` scoring, the executor behind every published eval number). Base reproduces `lit_adopt_t15_be_off_eval`:
  57.1/5.9 and 52.2/0.0. 2-week = pass / fail within 10 sessions of a fresh eval started on every session; 1 month = 20; Monte
  Carlo = 2,000 shuffled 5-session blocks.
- **Removal** = the setting that switches a rule off (table below). For targets: fixed 3R (also 2R / 4R / 5R / 8R) and
  "next PD / PW / PM level". The flat time can only go to 16:55 (the 17:00 halt) and the window only to 01:00-15:55 (all the
  detector builds).
- **Greedy minimal LIT:** at each step drop the rule whose removal makes the most H1 money, but only if H1 LIT $ does not
  fall (strict; tolerant run: at most −$600), H1 eval 2-week pass falls ≤ 1 point, fails rise ≤ 1 point, and H1 keeps 2+
  trades a week. Then look at H2.
- **Sensitivity:** each numeric knob moved 1-3 steps both ways. "Spike" = both neighbours < 85% of live (2026 $), "plateau" =
  both within 10%. I also read the H2 and 2021-25 columns by eye (a knob can be flat in 2026 and spiky in H2).
- **Shapley:** 80 random orders of the 17 rules, from the bare detector (every rule off) to live LIT, LIT size rule $.
- **Luck check:** paired day bootstrap (4,000 draws) of variant minus live in H1 and H2; count of variants that beat live
  in both halves vs a coin-flip expectation.
- `python -X utf8 tools/lit_ablation.py run` (main, ~1.5 h, 1 process), `follow` (fine grids), `greedy_tol`, `mtest`,
  `save` (runs `abl_*`). Results: `research/lit/ablation.json`, `research/lit/ablation_follow.json`. No engine file and no
  live_model*.json changed (so `tests.test_lit_live --days` is untouched).

## 1. Take one rule away at a time

The change in $ when the rule is removed (negative = the rule earns that much). Eval columns are the eval path *without* the
rule (live: 57.1 / 5.9 and 52.2 / 0.0).

| component taken away | H1 $ | H2 $ | 2021-25 $ | eval $ H1 / H2 | 2-wk pass/fail H1 | 2-wk pass/fail H2 |
|---|---|---|---|---|---|---|
| nothing (live LIT) | +33,901 | +9,493 | +1,265 | +34,253 / +9,059 | 57.1 / 5.9 | 52.2 / 0.0 |
| weekly stop (half size after 2 stop-outs) | +1,453 | -233 | -621 | +0 / +0 | 57.1 / 5.9 | 52.2 / 0.0 |
| Monday rule | -2,113 | -304 | +3,749 | -20,189 / -722 | 49.6 / 7.6 | 46.4 / 5.8 |
| 15-minute check | -639 | -439 | -252 | +3,171 / +695 | 52.9 / 8.4 | 50.7 / 2.9 |
| BE + costs (plain BE at entry) | -480 | -92 | +308 | -931 / -20 | 57.1 / 6.7 | 52.2 / 0.0 |
| breakeven at 1R altogether | -3,796 | -1,499 | +12,672 | -7,873 / +5,848 | 55.5 / 9.2 | 46.4 / 4.3 |
| inducement taken first (idm_a) | -4,567 | -2,140 | +90 | -10,040 / -6,652 | 47.9 / 6.7 | 49.3 / 4.3 |
| displacement body >= 0.8 ATR | -6,829 | **-10,787** | -9,473 | -13,512 / -8,367 | 54.6 / 7.6 | 43.5 / 11.6 |
| sweep depth >= 0.5 ATR | -1,898 | -1,029 | -5,038 | -2,194 / +3,123 | 53.8 / 5.9 | 43.5 / 2.9 |
| 30-minute limit (wait 6 bars) | -1,258 | -1,190 | -8,716 | +5,495 / -5,288 | 57.1 / 6.7 | 50.7 / 0.0 |
| 1m CISD step (plain limit at the CISD level) | **-14,487** | -2,928 | +8,496 | -20,276 / -2,085 | 47.1 / 7.6 | 36.2 / 1.4 |
| min / max stop 8 / 80 pts | -735 | +0 | -3,597 | -1,135 / +0 | 57.1 / 10.1 | 52.2 / 0.0 |
| min target 1.5R | +392 | +111 | +1,827 | +2,167 / +365 | 57.1 / 5.9 | 52.2 / 0.0 |
| 8R bank | +3,965 | -2,356 | +7,398 | +3,276 / +737 | **38.7** / 0.0 | 44.9 / 1.4 |
| VIX-band target (-> fixed 3R) | **-16,569** | -2,727 | +21,716 | -15,328 / -5,979 | 48.7 / 5.9 | 34.8 / 4.3 |
| flat 15:55 (-> hold to 16:55) | -334 | +373 | -1,016 | +255 / +2,568 | 57.1 / 5.9 | 52.2 / 0.0 |
| 02:00-15:30 window (-> 01:00-15:55) | -5,412 | +905 | -8,538 | +1,346 / +5,182 | 55.5 / 4.2 | 52.2 / 0.0 |
| 1 trade a day (-> up to 5, one at a time) | -3,399 | +2,937 | -5,411 | -8,307 / +4,362 | 47.1 / 3.4 | 50.7 / **11.6** |
| two_week 60% room cap (eval only) | - | - | - | -1,882 / +5,471 | 58.0 / **20.2** | 53.6 / **26.1** |
| two_week $1,000 soft-daily-loss cap (eval only) | - | - | - | +18 / -1 | 57.1 / 5.9 | 52.2 / 0.0 |

What it says, in plain words:

- **Load-bearing:** displacement, the 1m CISD entry, the VIX-band target, the inducement, the room cap. Take any of them away
  and LIT gets clearly worse in both halves (or on the eval).
- **Eval-only heroes:** the Monday rule (small on the $800 rule, $20k on the H1 eval path), the 15-minute check (pass odds),
  the 8R bank (H1 2-week pass 57% vs 39% without: with a nearer target the two-week sizing sizes up, and more evals finish in
  10 sessions), min/max stop (H1 2-week fails 5.9 vs 10.1).
- **Two-faced:** breakeven at 1R, the VIX target and the 1m entry all help 2026 and hurt 2021-25 (by $12.7k, $21.7k and
  $8.5k). That's the price of tuning on 2026; the owner's rule says 2026 decides, but it is worth knowing that a fixed 4R target
  with BE at 1.5R is the 2021-25 shape.
- **"More trades" (up to 5 a day, or a wider window)** makes more H2 money but fails many more H2 evals (11.6% vs 0%) and loses
  in H1. One trade a day stays.
- **Do-nothing rules:** the weekly stop on the eval, the soft-daily-loss cap, min target 1.5R, the flat time, BE + costs.

## 2. The minimal LIT

| version | rules dropped | H1 $ | H2 $ | 2021-25 $ | PF 2026 | trades/wk H1 / H2 | eval 2-wk H1 | eval 2-wk H2 | eval $ H1 / H2 |
|---|---|---|---|---|---|---|---|---|---|
| live LIT | - | +33,901 | +9,493 | +1,265 | 4.07 | 3.12 / 2.56 | 57.1 / 5.9 | 52.2 / 0.0 | +34,253 / +9,059 |
| strict greedy (`abl_minimal`) | weekly stop, min target 1.5R | +35,746 | +9,371 | +2,830 | 4.00 | 3.20 / 2.63 | 57.1 / 5.9 | 52.2 / 0.0 | +36,420 / +9,424 |
| tolerant greedy (`abl_minimal_tol`) | + flat 15:55 (hold to 16:55), BE + costs | +34,884 | +9,649 | +1,908 | 3.87 | 3.20 / 2.63 | 57.1 / 6.7 | 52.2 / 0.0 | +33,558 / +11,970 |

- The strict greedy stops after 2 drops: every other removal costs some H1 money or H1 eval odds.
- The tolerant greedy (allow −$600 a step) drops 4 rules and **H2 holds**: +$9.6k vs +$9.5k, same 2-week pass, eval H2 $ +$2.9k.
- So **yes, a simpler LIT holds up as well** - but it is not better. The rules it drops are the do-nothing ones from part 1.
  The heavy rules can't go.
- Practical note: "hold to 16:55" sits 5 minutes from the CME halt. I would keep 15:55 for safety; it costs nothing either way.

## 3. Sensitivity map (spikes and plateaus)

2026 $, in the step order shown; live in bold. Full table with H2, 2021-25 and the eval column at the end.

| knob | live | neighbours (2026 $, H2 $) | verdict |
|---|---|---|---|
| displacement (ATR) | 0.8 | 0.7: +41.5k / +8.3k · **0.8: +43.4k / +9.5k** · 0.9: +34.5k / +6.0k · 1.0: +25.9k / +2.2k; 0.75 / 0.85: +41.8k / +42.6k | **narrow peak**: 0.1 either way costs 4-21% of 2026 and 12-37% of H2; 2021-25 at 0.7 / 0.75 / 0.85 / 0.9: −$10.7k / −$5.8k / −$2.5k / −$6.8k (live +$1.3k) |
| 8R bank | 8 | 7: +38.0k · 7.5: +41.1k · **8: +43.4k** · 8.5: +46.2k · 9: +39.8k · 10: +41.6k | **jagged** (a handful of 8R+ trades); H2 8.1k / 8.8k / **9.5k** / 10.2k / 5.5k |
| inducement distance (ATR) | 1.0 | 0.75: +35.2k / +2.0k · **1.0: +43.4k / +9.5k** · 1.25: +41.9k / +11.1k | **cliff below**: 0.75 kills H2 (2-week pass 20%) |
| inducement age (bars) | 36 | 18-30: +47.0k to +48.4k / +12.8k to +14.3k · **36: +43.4k / +9.5k** | edge of a plateau, but H1 is flat (33.8-34.2k): the H2 difference is one trade (see 5) |
| 1m CISD window (bars) | 20 | 17: +31.6k · 18: +31.6k · 19: +40.3k · **20: +43.4k** · 21-22: +43.8k · 23-26: +43.6k | **one bar from a cliff**: 19 −$3.0k H1, 18 −$9.6k; 21-26 is a plateau |
| entry window start | 02:00 | 01:00: +38.9k · 01:30: +44.5k · **02:00: +43.4k** · 02:30: +31.1k · 03:00: +26.3k | cliff after: London's first 30 minutes carry ~$12k |
| breakeven trigger (R) | 1.0 | 0.75: +31.8k · 0.9: +41.9k · **1.0: +43.4k** · 1.1: +43.3k · 1.25: +40.3k | plateau 1.0-1.1, cliff below 0.9 |
| sweep depth (ATR) | 0.5 | 0.2-0.8: +41.3k to +44.1k | plateau |
| limit wait (5m bars) | 6 | 3: +38.2k · 4-9: +41.0k to +43.4k | plateau |
| stop buffer (pts) | 0.25 | 0-0.75: +42.9k to +44.1k | plateau |
| min stop / max stop | 8 / 80 | 4-12: identical · 60-100: +41.4k to +43.4k | plateau |
| VIX band × | 1.0 | 0.8: +40.1k · 0.9-1.2: +42.5k to +44.0k | plateau (0.8 hurts H2) |
| min target (R) | 1.5 | 1.0-2.0: +43.4k to +43.7k | plateau (does nothing) |
| BE offset (pts) | 1.25 | 0-2.0: +42.8k to +43.6k | plateau (does nothing much) |
| 15-min check at / x / mfe | 15 / 0.3 / 0.5 | 10-20 / 0.2-0.4 / 0.3-0.7: +42.1k to +45.1k | plateau |
| weekly stop n / size | 2 / 0.5 | 1-3 / 0.25-0.75: +41.7k to +44.8k | plateau (and idle on the eval) |
| flat time | 15:55 | 15:25-16:25: +43.3k to +43.6k | plateau |
| entry window end | 15:30 | 14:30-15:55: identical in 2026 | does nothing in 2026 (no LIT entry after 14:30) |
| eval room cap (two_week) | 60% | 40%: 51.3/0.0 & 39.1/0.0 · 50%: 57.1/2.5 & 50.7/0.0 · 55%: 57.1/2.5 & 52.2/0.0 · **60%: 57.1/5.9 & 52.2/0.0** · 65%: 57.1/7.6 & 52.2/0.0 · 70%: 57.1/6.7 & 52.2/5.8 · none: 58.0/20.2 & 53.6/26.1 | smooth slope: a lower cap means fewer fails, slower passes below 55% |

**Spike knobs to treat with care:** displacement 0.8 and the 8R bank are the two values most likely to be "fitted to 2026".
Neither has a better place to move to (the neighbours are worse in both halves), and neither can be removed (both earn money
or eval odds). They're the first thing to recheck after 3 more months of data. The 1m CISD window *can* move off its cliff,
for free (recommendation 2).

## 4. Who earns the money

**Shapley split of the LIT-rule $ (80 random orders, 1105 subsets; bare detector H1 -40.6k H2 -0.5k 2021-25 -176.1k -> live H1 +33.9k H2 +9.5k 2021-25 +1.3k)**

| component | H1 $ | H2 $ | 2021-25 $ | leave-one-out H1 / H2 $ |
|---|---|---|---|---|
| VIX-band target (-> fixed 3R) (`vix`) | +18.6k | +8.4k | +0.2k | +16.6k / +2.7k |
| displacement body >= 0.8 ATR (`disp`) | +4.9k | +4.7k | +34.1k | +6.8k / +10.8k |
| sweep depth >= 0.5 ATR (`depth`) | +0.5k | +2.7k | +2.2k | +1.9k / +1.0k |
| 15-minute check (`t_check`) | -2.4k | +1.7k | +0.3k | +0.6k / +0.4k |
| inducement taken first (idm_a) (`idm`) | +7.0k | +1.4k | +23.3k | +4.6k / +2.1k |
| 30-minute limit (wait 6 bars) (`wait`) | +7.0k | +0.9k | +14.4k | +1.3k / +1.2k |
| 1 trade a day (-> up to 5, one at a time) (`one_day`) | +6.8k | +0.4k | +37.2k | +3.4k / -2.9k |
| BE + costs (BE at entry + 1.25 -> plain BE at entry) (`be_off`) | -0.1k | +0.1k | +1.7k | +0.5k / +0.1k |
| Monday rule (`monday`) | +4.1k | +0.1k | -3.7k | +2.1k / +0.3k |
| flat 15:55 (-> hold to 16:55) (`flat`) | +0.2k | -0.0k | +1.6k | +0.3k / -0.4k |
| min target 1.5R (`min_rr`) | -0.1k | -0.1k | -0.7k | -0.4k / -0.1k |
| 8R bank (`max_rr`) | -1.2k | -0.2k | -3.0k | -4.0k / +2.4k |
| 1m CISD step (limit fill at the CISD level instead) (`cisd1m`) | +17.0k | -0.3k | +52.0k | +14.5k / +2.9k |
| weekly stop (half size after 2 stop-outs) (`wk_stop`) | +1.1k | -1.7k | +21.9k | -1.5k / +0.2k |
| 02:00-15:30 entry window (-> 01:00-15:55, all the detector sees) (`window`) | +3.5k | -2.0k | +15.5k | +5.4k / -0.9k |
| min / max stop 8 / 80 pts (`stops`) | +2.6k | -2.1k | +3.2k | +0.7k / +0.0k |
| breakeven at 1R altogether (`be`) | +4.9k | -4.1k | -22.9k | +3.8k / +1.5k |

How to read it: **leave-one-out** = what the rule earns on top of today's LIT (live minus "live without it"). **Shapley** =
its average share over every way of building LIT up from the bare detector (every rule off: H1 −$40.6k, H2 −$0.5k, 2021-25
−$176k), so it also shows what a rule does when LIT is in bad shape.

- **Earn money in both halves on both measures:** the **VIX-band target** (the biggest H2 share, +$8.4k), **displacement**
  (+$10.8k of H2 on top of live LIT), the **inducement**, the **sweep depth** floor and the **30-minute limit**.
- **The 1m CISD entry** is LIT's biggest H1 earner (+$14.5k / Shapley +$17.0k) and +$2.9k of H2 on top of live; its Shapley H2
  share is about 0, i.e. it only pays once the other filters are in.
- **Only helped H1:** the 02:00-15:30 window (+$5.4k H1, −$0.9k H2) and one trade a day (+$3.4k H1, −$2.9k H2 on the $800
  rule - but on the eval it is what keeps H2 fails at 0% instead of 11.6%). The 8R bank is the other way round on the $800
  rule (−$4.0k H1, +$2.4k H2) and is worth 18 points of H1 2-week pass on the eval.
- **Context-dependent:** breakeven at 1R earns +$3.8k / +$1.5k on top of today's LIT but has a −$4.1k H2 Shapley share and costs
  $12.7k in 2021-25. The weekly stop costs $1.5k in H1 on top of today's LIT, yet its Shapley 2021-25 share is +$21.9k: when
  the strategy is losing, halving size after two stop-outs saves real money. That is why I would keep it even though the
  eval sizing ignores it.
- **Passengers (< $0.6k anywhere):** BE + costs, flat 15:55, min target 1.5R, the 15-minute check on the $800 rule (its value is
  on the eval odds, see part 1).

## 5. Luck check (multiple testing) and month by month

- **106 changed variants** were scored (single removals, neighbours, alternatives, fine grids, combinations; the 22 knob maps
  share the same runs). **22 beat live in both halves** on the $800 rule, 9 of them also in 2021-25, 12 of them also without
  losing eval odds. A coin flip per half would give about 26 of 106. **That is what chance looks like.** Most of the 22 are the
  same one or two trades seen through different knobs (15 are inducement age / distance settings).
- **The paired bootstrap** (H2 days, variant minus live) puts only 3 variants under a 10% chance of "no real gain":
  inducement 1.25 ATR / 24 bars (p 0.09, +$6.4k), bank 8.5R (p 0.005, but only +$0.7k from a few trades that pay a bit more),
  1m CISD 25 bars (p 0.05, +$0.5k). With 106 tries, ~10 would land under 10% by chance. **Nothing here is a proven new edge.**
- **The inducement-age lead, honestly:** at most 24 bars old instead of 36 gives H2 +$4.8k and H2 2-week pass 52% → 67%. The H2
  gain is one day: on **Aug 11** the 36-bar setup is a −$276 stop-out, the 24-bar rule skips it and takes a later setup that hits
  the target for **+$4,322** (6.2R). In H1 it removes 4 small trades and changes nothing ($34.1k vs $33.9k), and the H1 eval
  path loses $8k. One trade is not a rule. Lead only (`abl_lead_idm_age24`), paper watch.

Month by month, change vs live, LIT size rule ($):

| month | live | no weekly stop | cisd1m 22 | both (rec. 1+2) | inducement age 24 (lead) | tolerant minimal |
|---|---|---|---|---|---|---|
| 2026-01 | 10,042 | +1,645 | 0 | +1,645 | +177 | +1,532 |
| 2026-02 | 2,322 | -202 | 0 | -202 | 0 | -307 |
| 2026-03 | 7,432 | 0 | 0 | 0 | 0 | -13 |
| 2026-04 | 6,705 | +8 | 0 | +8 | -1 | -192 |
| 2026-05 | 5,092 | +3 | 0 | +3 | 0 | -283 |
| 2026-06 | 2,309 | 0 | 0 | 0 | -1 | +245 |
| 2026-07 | 898 | 0 | 0 | 0 | +353 | -20 |
| 2026-08 | 33 | -127 | +426 | +298 | +4,470 | +178 |
| 2026-09 | 1,903 | -106 | 0 | -106 | 0 | -102 |
| 2026-10 | 6,660 | 0 | 0 | 0 | 0 | +100 |

## 6. Recommendations

### (a) Take away (simpler, no loss of H2 money or eval odds)

Only passengers can go, and none of them is worth a switch:

1. **The weekly stop** - the live two-week sizing never reads it in the first 10 sessions, so the eval numbers are identical
   without it (`abl_rec_no_wk_stop`: $800 rule H1 +$35,354 / H2 +$9,260 / 2021-25 +$644, PF 4.84 / 2.58 / 1.01; eval
   57.1 / 5.9 and 52.2 / 0.0). *But* after session 10 the eval runs in safe_eval, which does use the weekly-stop size, the
   funded mode (off) was designed with it, and its Shapley 2021-25 share is +$21.9k (it saves money when LIT is losing).
   **Keep it** - it is insurance that costs ~$0 on the eval. *Skeptic of dropping it:* the +$1.5k it "costs" in H1 is all
   January (one week of two stop-outs followed by winners at half size).
2. **Min target 1.5R** - a plateau from 1.0R to 2.0R that does nothing; dropping it adds 3 tiny trades (+$0.5k). Keep (a 0.4R
   target is not a LIT trade).
3. **BE + costs** (back to plain BE), **flat 15:55** and **entries after 14:30** - each moves < $500. Keep; flat 15:55 also
   keeps LIT away from the 17:00 halt.
4. **Do not take away** anything else: every other rule earns money in H2 or eval odds.

### (b) Knobs to move off a spike

- **1m CISD window 20 → 22 bars** (change 1). The only spike that can move for free.
- **Displacement 0.8, the 8R bank, inducement distance 1.0, the 02:00 start:** stay. They sit on narrow peaks, but every
  neighbour is worse in both halves. Recheck them first when 3 more months of data are in (Jan 2027).

### (c) Changes worth your approval

**Change 1 - 1m CISD window 20 → 22 bars.** Switch in both model files, "lit":

```json
"cisd1m": 22
```

| | H1 | H2 | 2021-25 |
|---|---|---|---|
| LIT size rule, live | +$33,901, PF 4.98, 80 trades | +$9,493, PF 2.69, 40 trades | +$1,265 |
| LIT size rule, cisd1m 22 | +$33,901, PF 4.98, 80 trades | +$9,919, PF 2.91, 40 trades | +$1,265 |
| eval path, live | +$34,253, 2-wk 57.1 / 5.9, MC 52.8 / 2.6 | +$9,059, 2-wk 52.2 / 0.0, MC 55.1 / 3.5 | - |
| eval path, cisd1m 22 | +$34,253, 2-wk 57.1 / 5.9, MC 52.8 / 2.6 | +$9,272, 2-wk 52.2 / 0.0, MC 55.5 / 3.4 | - |

*Why:* at 19 bars H1 loses $3.0k, at 18 bars $9.6k: live sits on the edge. 21-26 bars are all within $300 of each other.
22 is the middle of the flat part. *Skeptic:* this is insurance, not money. The +$426 is one trade (Aug 28: a −$422 stop
becomes two breakevens). If the real 1m CISD timing drifts by a bar (feed / latency), 22 keeps LIT on the plateau. The
live bot reads `cisd1m` from the model (no code change); the PC loop and the cloud monitor both use it. Runs `abl_rec_cisd22`,
`abl_rec_cisd22_eval`. Trades a week 3.12 / 2.56, weeks with 2+ 85% / 81%: unchanged.

**Change 2 (optional) - two-week room cap 60% → 55%.** Switch in both model files, "lit_sizing" → "two_week":

```json
"room_f": 0.55
```

| eval path | 2-wk pass / fail | 1-mo pass / fail | Monte Carlo 2-wk | eval $ | median sessions |
|---|---|---|---|---|---|
| H1 live (60%) | 57.1 / 5.9 | 74.3 / 11.9 | 52.8 / 2.6 | +$34,253 | 5 |
| H1 55% | 57.1 / **2.5** | 74.3 / **8.3** | 52.6 / 2.2 | +$34,409 | 5 |
| H2 live (60%) | 52.2 / 0.0 | 50.8 / 0.0 | 55.1 / 3.5 | +$9,059 | 4 |
| H2 55% | 52.2 / 0.0 | 49.2 / 1.7 | 52.4 / 2.4 | +$9,096 | 4 |

The trades don't change (the $800 rule and 2021-25 are identical). *Skeptic:* the H1 drop from 5.9% to 2.5% is about 4 eval
starts that share the same 1-2 bad days (starts on neighbouring sessions overlap). In H2 it slightly slows passes (Monte Carlo
2-week pass −2.7 points, 1-month fail 0 → 1.7%). It's a dial between "fail less" and "pass a bit faster", not a free win. The
slope is smooth (40% … 70%, no spike), so any value 50-60% is defensible. Runs `abl_rec_room055`, `abl_rec_room055_eval`.

**Both together** (`abl_rec_cisd22_room055`): $800 rule H1 +$33,901 / H2 +$9,919 / 2021-25 +$1,265; eval path H1 +$34,409,
2-week 57.1 / 2.5, 1-month 74.3 / 8.3; H2 +$9,309, 2-week 52.2 / 0.0, 1-month 49.2 / 1.7. Rerun after a switch: `python
tools/lit_losses.py live` + the dashboard data.

## Verdict

- LIT's money comes from four rules (displacement, the 1m CISD entry, the VIX target, the inducement), plus the Monday rule,
  the 15-minute check, the 8R bank and the room cap on the eval. Keep all of them.
- About a third of the rules are passengers. A 4-rules-shorter LIT makes the same money (H1 +$34.9k, H2 +$9.6k), so simpler
  is possible - but not better. Nothing big can be taken away, and the one idle rule (the weekly stop) is cheap insurance.
- Two knobs are the main overfitting risk: displacement 0.8 and the 8R bank. Nothing better is available; recheck them with
  new data. The 1m CISD window can move off its cliff for free (20 → 22).
- Nothing in this study is a new edge. With 106 variants, the "better in both halves" count is what chance gives. The
  inducement-age lead is one trade.
- Nothing in live_model.json changed. Changes 1-2 wait for the owner's OK.

## Full tables

#### Remove one component: LIT size rule

| variant | H1 $ | H2 $ | 2021-25 $ | PF 2026 | win % / >=0.5R % 2026 | trades/wk 2026 | % weeks 2+ | max DD 2026 | H2 $/month |
|---|---|---|---|---|---|---|---|---|---|
| **live LIT** | +33.9k | +9.5k | +1.3k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| weekly stop (half size after 2 stop-outs) (`wk_stop`) | +35.4k | +9.3k | +0.6k | 3.96 | 55.0 / 25.8 | 2.91 | 86 | -2.4k | $2,493 |
| Monday rule (`monday`) | +31.8k | +9.2k | +5.0k | 3.69 | 52.8 / 22.8 | 3.08 | 90 | -2.7k | $2,474 |
| 15-minute check (`t_check`) | +33.3k | +9.1k | +1.0k | 3.78 | 55.0 / 25.8 | 2.91 | 86 | -2.3k | $2,438 |
| BE + costs (BE at entry + 1.25 -> plain BE at entry) (`be_off`) | +33.4k | +9.4k | +1.6k | 3.94 | 26.7 / 25.8 | 2.91 | 86 | -2.2k | $2,531 |
| breakeven at 1R altogether (`be`) | +30.1k | +8.0k | +13.9k | 2.61 | 33.3 / 31.7 | 2.91 | 86 | -3.1k | $2,152 |
| inducement taken first (idm_a) (`idm`) | +29.3k | +7.4k | +1.4k | 2.82 | 49.3 / 23.9 | 3.35 | 95 | -3.7k | $1,980 |
| displacement body >= 0.8 ATR (`disp`) | +27.1k | -1.3k | -8.2k | 2.1 | 52.6 / 18.2 | 3.74 | 95 | -5.6k | $-348 |
| sweep depth >= 0.5 ATR (`depth`) | +32.0k | +8.5k | -3.8k | 3.44 | 52.4 / 23.8 | 3.06 | 86 | -2.2k | $2,279 |
| 30-minute limit (wait 6 bars) (`wait`) | +32.6k | +8.3k | -7.5k | 3.59 | 51.2 / 23.3 | 3.13 | 90 | -2.2k | $2,235 |
| 1m CISD step (limit fill at the CISD level instead) (`cisd1m`) | +19.4k | +6.6k | +9.8k | 2.11 | 51.0 / 17.5 | 3.47 | 95 | -4.1k | $1,768 |
| min / max stop 8 / 80 pts (`stops`) | +33.2k | +9.5k | -2.3k | 3.96 | 54.1 / 25.4 | 2.96 | 86 | -2.3k | $2,556 |
| min target 1.5R (`min_rr`) | +34.3k | +9.6k | +3.1k | 4.1 | 56.1 / 26.0 | 2.99 | 86 | -2.2k | $2,586 |
| 8R bank (`max_rr`) | +37.9k | +7.1k | +8.7k | 4.18 | 55.0 / 20.0 | 2.91 | 86 | -3.6k | $1,921 |
| VIX-band target (-> fixed 3R) (`vix`) | +17.3k | +6.8k | +23.0k | 2.7 | 56.1 / 30.1 | 2.99 | 86 | -1.9k | $1,822 |
| flat 15:55 (-> hold to 16:55) (`flat`) | +33.6k | +9.9k | +0.2k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,656 |
| 02:00-15:30 entry window (-> 01:00-15:55, all the detector sees) (`window`) | +28.5k | +10.4k | -7.3k | 3.45 | 54.3 / 24.0 | 3.13 | 90 | -2.2k | $2,800 |
| 1 trade a day (-> up to 5, one at a time) (`one_day`) | +30.5k | +12.4k | -4.1k | 3.3 | 55.1 / 23.7 | 3.79 | 86 | -2.5k | $3,347 |

#### Remove one component: eval path (two_week sizing)

| variant | H1 $ | H2 $ | 2-wk pass/fail H1 | 2-wk H2 | 1-mo pass/fail H1 | 1-mo H2 | median sessions to pass H1/H2 | Monte Carlo 2-wk H1 · H2 |
|---|---|---|---|---|---|---|---|---|
| **live LIT** | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| weekly stop (half size after 2 stop-outs) (`wk_stop`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| Monday rule (`monday`) | +14.1k | +8.3k | 49.6 / 7.6 | 46.4 / 5.8 | 64.2 / 16.5 | 42.4 / 16.9 | 4.0 / 4.0 | 48.6/5.0 · 50.3/5.8 |
| 15-minute check (`t_check`) | +37.4k | +9.8k | 52.9 / 8.4 | 50.7 / 2.9 | 72.5 / 16.5 | 50.8 / 3.4 | 5.0 / 4.0 | 50.4/6.6 · 54.4/6.2 |
| BE + costs (BE at entry + 1.25 -> plain BE at entry) (`be_off`) | +33.3k | +9.0k | 57.1 / 6.7 | 52.2 / 0.0 | 74.3 / 11.9 | 49.2 / 3.4 | 5.0 / 4.0 | 52.8/2.8 · 54.8/3.8 |
| breakeven at 1R altogether (`be`) | +26.4k | +14.9k | 55.5 / 9.2 | 46.4 / 4.3 | 68.8 / 14.7 | 42.4 / 16.9 | 4.0 / 3.0 | 54.4/11.1 · 52.2/6.7 |
| inducement taken first (idm_a) (`idm`) | +24.2k | +2.4k | 47.9 / 6.7 | 49.3 / 4.3 | 59.6 / 25.7 | 42.4 / 20.3 | 4.0 / 3.5 | 48.6/4.3 · 49.7/6.8 |
| displacement body >= 0.8 ATR (`disp`) | +20.7k | +0.7k | 54.6 / 7.6 | 43.5 / 11.6 | 67.0 / 10.1 | 35.6 / 33.9 | 4.0 / 4.0 | 51.8/6.1 · 37.4/10.7 |
| sweep depth >= 0.5 ATR (`depth`) | +32.1k | +12.2k | 53.8 / 5.9 | 43.5 / 2.9 | 72.5 / 11.9 | 39.0 / 3.4 | 5.0 / 3.0 | 51.6/3.5 · 52.0/6.2 |
| 30-minute limit (wait 6 bars) (`wait`) | +39.7k | +3.8k | 57.1 / 6.7 | 50.7 / 0.0 | 68.8 / 13.8 | 50.8 / 11.9 | 4.0 / 4.0 | 52.0/4.4 · 50.7/4.2 |
| 1m CISD step (limit fill at the CISD level instead) (`cisd1m`) | +14.0k | +7.0k | 47.1 / 7.6 | 36.2 / 1.4 | 58.7 / 26.6 | 45.8 / 1.7 | 4.0 / 6.0 | 44.6/5.3 · 35.8/0.7 |
| min / max stop 8 / 80 pts (`stops`) | +33.1k | +9.1k | 57.1 / 10.1 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.7/4.0 · 55.1/3.5 |
| min target 1.5R (`min_rr`) | +36.4k | +9.4k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.6/2.6 · 55.1/3.5 |
| 8R bank (`max_rr`) | +37.5k | +9.8k | 38.7 / 0.0 | 44.9 / 1.4 | 57.8 / 11.0 | 50.8 / 5.1 | 7.0 / 5.0 | 37.1/2.2 · 41.9/3.4 |
| VIX-band target (-> fixed 3R) (`vix`) | +18.9k | +3.1k | 48.7 / 5.9 | 34.8 / 4.3 | 64.2 / 16.5 | 30.5 / 5.1 | 7.0 / 6.0 | 44.4/5.0 · 37.4/6.4 |
| flat 15:55 (-> hold to 16:55) (`flat`) | +34.5k | +11.6k | 57.1 / 5.9 | 52.2 / 0.0 | 71.6 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.6/2.6 · 55.0/3.4 |
| 02:00-15:30 entry window (-> 01:00-15:55, all the detector sees) (`window`) | +35.6k | +14.2k | 55.5 / 4.2 | 52.2 / 0.0 | 68.8 / 13.8 | 50.8 / 0.0 | 4.5 / 4.0 | 50.8/2.2 · 57.9/0.7 |
| 1 trade a day (-> up to 5, one at a time) (`one_day`) | +25.9k | +13.4k | 47.1 / 3.4 | 50.7 / 11.6 | 78.9 / 8.3 | 57.6 / 22.0 | 7.0 / 5.0 | 51.0/5.8 · 53.9/9.8 |

#### Neighbours and alternatives: LIT size rule

| variant | H1 $ | H2 $ | 2021-25 $ | PF 2026 | win % / >=0.5R % 2026 | trades/wk 2026 | % weeks 2+ | max DD 2026 | H2 $/month |
|---|---|---|---|---|---|---|---|---|---|
| **live LIT** | +33.9k | +9.5k | +1.3k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| weekly stop after 1 stop-out (`wk_stop_n1`) | +32.0k | +9.6k | +5.6k | 4.48 | 55.0 / 25.8 | 2.91 | 86 | -1.9k | $2,591 |
| weekly stop after 3 stop-outs (`wk_stop_n3`) | +35.5k | +9.3k | +0.2k | 4.01 | 55.0 / 25.8 | 2.91 | 86 | -2.4k | $2,493 |
| weekly stop at 0.75 size (`wk_stop_m075`) | +34.5k | +9.5k | +0.9k | 4.05 | 55.0 / 25.8 | 2.91 | 86 | -2.3k | $2,556 |
| weekly stop at 0.25 size (`wk_stop_m025`) | +32.9k | +9.5k | +1.2k | 4.04 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| no 15-min check and plain BE (= the 2026-10-18 rules) (`t_check_be_off`) | +32.8k | +9.0k | +1.3k | 3.67 | 26.7 / 25.8 | 2.91 | 86 | -2.3k | $2,413 |
| BE at 0.75R (`be_r075`) | +27.4k | +4.4k | -12.9k | 3.41 | 58.3 / 20.8 | 2.91 | 86 | -2.1k | $1,197 |
| BE at 1.25R (`be_r125`) | +30.8k | +9.5k | +9.2k | 3.4 | 50.8 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| BE at 1.5R (`be_r15`) | +28.3k | +9.5k | +15.5k | 3.02 | 47.5 / 26.7 | 2.91 | 86 | -2.2k | $2,556 |
| BE at 2R (`be_r2`) | +29.6k | +8.9k | +7.5k | 2.86 | 40.0 / 29.2 | 2.91 | 86 | -2.7k | $2,386 |
| 2 inducements (`idm2`) | +14.4k | +4.6k | -0.8k | 4.0 | 60.0 / 25.5 | 1.33 | 36 | -1.8k | $1,235 |
| displacement 0.6 ATR (`disp06`) | +35.5k | +2.7k | -14.9k | 3.19 | 54.3 / 20.0 | 3.4 | 90 | -2.4k | $723 |
| displacement 1.0 ATR (`disp10`) | +23.7k | +2.2k | -13.2k | 3.31 | 53.3 / 25.0 | 2.23 | 67 | -2.0k | $601 |
| sweep depth 0.25 ATR (`depth025`) | +32.7k | +8.9k | -3.2k | 3.68 | 53.3 / 24.6 | 2.96 | 86 | -2.2k | $2,390 |
| sweep depth 0.75 ATR (`depth075`) | +34.9k | +9.5k | -2.4k | 4.38 | 56.0 / 26.7 | 2.82 | 83 | -1.8k | $2,555 |
| limit 15 min (`wait3`) | +28.8k | +9.4k | -4.1k | 3.97 | 56.5 / 25.0 | 2.62 | 81 | -2.5k | $2,530 |
| limit 60 min (`wait12`) | +33.9k | +9.4k | -7.5k | 4.06 | 53.7 / 25.2 | 2.99 | 88 | -2.2k | $2,519 |
| 5m bars only (no 1m fills / management) (`tf5m`) | +6.7k | +1.5k | +1.8k | 1.72 | 48.1 / 20.8 | 1.87 | 55 | -3.1k | $405 |
| 5m bars only, no CISD step (`tf5m_nocisd`) | +22.4k | +6.0k | +9.8k | 2.17 | 53.8 / 19.6 | 3.47 | 95 | -3.6k | $1,606 |
| no min stop (`min_stop0`) | +33.9k | +9.5k | -2.3k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| no max stop (`max_stop0`) | +33.2k | +9.5k | +1.3k | 3.96 | 54.1 / 25.4 | 2.96 | 86 | -2.3k | $2,556 |
| max stop 60 (`max_stop60`) | +32.7k | +8.7k | -0.0k | 4.09 | 54.5 / 26.7 | 2.45 | 74 | -1.8k | $2,345 |
| max stop 100 (`max_stop100`) | +33.2k | +9.5k | +1.3k | 3.96 | 54.1 / 25.4 | 2.96 | 86 | -2.3k | $2,556 |
| min target 1.0R (`min_rr10`) | +34.2k | +9.5k | +2.9k | 4.09 | 55.4 / 26.4 | 2.94 | 86 | -2.2k | $2,556 |
| min target 2.0R (`min_rr20`) | +33.9k | +9.5k | +4.5k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| bank at 6R (`max_rr6`) | +25.4k | +6.5k | +5.3k | 3.26 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $1,761 |
| bank at 10R (`max_rr10`) | +35.5k | +6.2k | -0.3k | 3.94 | 55.0 / 22.5 | 2.91 | 86 | -3.6k | $1,669 |
| fixed 2R target (`fix2`) | +12.3k | +4.7k | +8.2k | 2.23 | 56.6 / 37.7 | 2.96 | 83 | -2.0k | $1,256 |
| fixed 4R target (`fix4`) | +19.6k | +7.5k | +16.1k | 2.91 | 56.1 / 26.0 | 2.99 | 86 | -1.8k | $2,020 |
| fixed 5R target (`fix5`) | +23.8k | +8.1k | +5.1k | 3.26 | 56.1 / 22.8 | 2.99 | 86 | -2.2k | $2,180 |
| fixed 8R target (`fix8`) | +31.6k | +7.1k | +17.6k | 3.74 | 56.1 / 19.5 | 2.99 | 86 | -3.5k | $1,921 |
| next level target (PD / PW / PM high-low) (`lvl`) | +31.8k | +8.7k | -0.5k | 3.87 | 55.1 / 26.3 | 2.86 | 86 | -2.2k | $2,329 |
| nearest of VIX band or a PD / PW / PM level (`vix_lvl`) | +33.4k | +9.0k | +1.2k | 4.0 | 55.7 / 27.9 | 2.96 | 86 | -1.8k | $2,416 |
| VIX band, else a fixed 4R (no skip) (`vix_fb4`) | +34.3k | +9.5k | +2.3k | 4.09 | 55.7 / 26.2 | 2.96 | 86 | -2.2k | $2,556 |
| VIX band 0.75 x (`vix_k075`) | +32.8k | +6.0k | +1.2k | 3.76 | 54.3 / 25.0 | 2.82 | 86 | -2.2k | $1,615 |
| VIX band 1.25 x (`vix_k125`) | +33.1k | +10.5k | +5.6k | 4.08 | 55.7 / 24.6 | 2.96 | 86 | -2.2k | $2,823 |
| flat 15:25 (`flat925`) | +34.0k | +9.6k | +2.8k | 4.08 | 54.2 / 25.8 | 2.91 | 86 | -2.2k | $2,576 |
| flat 16:25 (`flat985`) | +33.7k | +9.6k | +0.4k | 4.06 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,586 |
| entries from 03:00 (`win_0300`) | +22.3k | +4.0k | +2.5k | 2.94 | 50.0 / 23.5 | 2.48 | 79 | -2.3k | $1,080 |
| entries from 01:00 (`win_0100`) | +28.5k | +10.4k | -7.1k | 3.46 | 54.3 / 24.4 | 3.08 | 90 | -2.2k | $2,799 |
| entries until 14:30 (`win_1430`) | +33.9k | +9.5k | +2.6k | 4.07 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,556 |
| entries until 15:55 (`win_1555`) | +33.9k | +9.5k | +1.1k | 4.06 | 54.9 / 25.4 | 2.96 | 86 | -2.2k | $2,556 |
| NY only 08:00-15:30 (`win_ny_only`) | +12.9k | -1.2k | -14.1k | 3.06 | 58.5 / 29.3 | 1.0 | 21 | -1.6k | $-313 |
| no afternoon (02:00-12:00) (`win_no_pm`) | +33.0k | +9.0k | +1.8k | 3.97 | 53.8 / 23.9 | 2.84 | 86 | -2.2k | $2,421 |
| 2 trades a day (`two_day`) | +28.9k | +12.1k | -4.4k | 3.2 | 52.7 / 23.0 | 3.59 | 86 | -2.7k | $3,246 |
| stop exactly at the sweep extreme (`buf0`) | +34.6k | +9.5k | +2.1k | 4.1 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,553 |
| stop 2 ticks beyond (`buf05`) | +34.0k | +9.6k | -5.6k | 4.14 | 55.5 / 26.1 | 2.89 | 86 | -2.2k | $2,574 |

#### Neighbours and alternatives: eval path (two_week sizing)

| variant | H1 $ | H2 $ | 2-wk pass/fail H1 | 2-wk H2 | 1-mo pass/fail H1 | 1-mo H2 | median sessions to pass H1/H2 | Monte Carlo 2-wk H1 · H2 |
|---|---|---|---|---|---|---|---|---|
| **live LIT** | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| weekly stop after 1 stop-out (`wk_stop_n1`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| weekly stop after 3 stop-outs (`wk_stop_n3`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| weekly stop at 0.75 size (`wk_stop_m075`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| weekly stop at 0.25 size (`wk_stop_m025`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| no 15-min check and plain BE (= the 2026-10-18 rules) (`t_check_be_off`) | +36.7k | +9.7k | 52.9 / 9.2 | 50.7 / 2.9 | 72.5 / 16.5 | 49.2 / 6.8 | 5.0 / 4.0 | 50.5/7.0 · 54.0/6.8 |
| BE at 0.75R (`be_r075`) | +36.7k | +1.7k | 49.6 / 4.2 | 50.7 / 4.3 | 68.8 / 8.3 | 49.2 / 6.8 | 5.0 / 4.5 | 50.2/2.5 · 41.8/2.4 |
| BE at 1.25R (`be_r125`) | +29.5k | +9.1k | 56.3 / 5.9 | 52.2 / 0.0 | 73.4 / 13.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.1/3.2 · 55.1/3.5 |
| BE at 1.5R (`be_r15`) | +29.5k | +9.1k | 55.5 / 5.0 | 52.2 / 0.0 | 66.1 / 12.8 | 50.8 / 0.0 | 4.0 / 4.0 | 53.1/3.8 · 55.1/3.5 |
| BE at 2R (`be_r2`) | +28.6k | +12.1k | 52.1 / 6.7 | 46.4 / 0.0 | 66.1 / 12.8 | 42.4 / 3.4 | 4.0 / 3.0 | 53.1/6.9 · 53.4/4.3 |
| 2 inducements (`idm2`) | +5.9k | +4.6k | 35.3 / 0.0 | 21.7 / 0.0 | 48.6 / 0.0 | 11.9 / 0.0 | 5.5 / 4.0 | 35.2/0.0 · 27.9/0.1 |
| displacement 0.6 ATR (`disp06`) | +29.4k | +1.3k | 63.0 / 6.7 | 47.8 / 10.1 | 75.2 / 9.2 | 44.1 / 22.0 | 4.0 / 4.0 | 58.2/3.6 · 41.2/8.7 |
| displacement 1.0 ATR (`disp10`) | +22.6k | +0.0k | 38.7 / 2.5 | 37.7 / 0.0 | 54.1 / 2.8 | 30.5 / 0.0 | 6.0 / 4.0 | 36.5/1.5 · 35.2/0.9 |
| sweep depth 0.25 ATR (`depth025`) | +34.5k | +8.5k | 56.3 / 5.9 | 43.5 / 0.0 | 72.5 / 11.9 | 39.0 / 0.0 | 5.0 / 3.0 | 52.8/2.8 · 52.9/3.5 |
| sweep depth 0.75 ATR (`depth075`) | +27.7k | +9.1k | 57.1 / 4.2 | 52.2 / 0.0 | 74.3 / 4.6 | 50.8 / 0.0 | 4.5 / 4.0 | 55.0/2.3 · 55.1/3.5 |
| limit 15 min (`wait3`) | +33.6k | +6.3k | 50.4 / 6.7 | 53.6 / 0.0 | 62.4 / 24.8 | 54.2 / 0.0 | 4.0 / 4.0 | 49.5/3.1 · 54.1/3.1 |
| limit 60 min (`wait12`) | +34.1k | +9.3k | 57.1 / 6.7 | 52.2 / 0.0 | 71.6 / 12.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.7/3.9 · 55.0/3.5 |
| 5m bars only (no 1m fills / management) (`tf5m`) | +11.2k | +0.0k | 25.2 / 0.0 | 34.8 / 0.0 | 29.4 / 30.3 | 37.3 / 1.7 | 4.0 / 4.5 | 24.9/4.7 · 29.5/4.6 |
| 5m bars only, no CISD step (`tf5m_nocisd`) | +21.5k | +7.8k | 48.7 / 15.1 | 26.1 / 1.4 | 64.2 / 29.4 | 33.9 / 8.5 | 4.0 / 5.0 | 48.6/13.4 · 32.2/3.5 |
| no min stop (`min_stop0`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| no max stop (`max_stop0`) | +33.1k | +9.1k | 57.1 / 10.1 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.7/4.0 · 55.1/3.5 |
| max stop 60 (`max_stop60`) | +29.6k | +15.7k | 48.7 / 2.5 | 55.1 / 0.0 | 68.8 / 4.6 | 50.8 / 0.0 | 5.5 / 4.0 | 48.1/1.7 · 55.5/2.4 |
| max stop 100 (`max_stop100`) | +33.1k | +9.1k | 57.1 / 10.1 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.7/4.0 · 55.1/3.5 |
| min target 1.0R (`min_rr10`) | +34.6k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.2/2.6 · 55.1/3.5 |
| min target 2.0R (`min_rr20`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| bank at 6R (`max_rr6`) | +30.0k | +8.4k | 59.7 / 5.9 | 43.5 / 5.8 | 74.3 / 9.2 | 44.1 / 13.6 | 4.0 / 5.0 | 55.4/3.9 · 44.0/7.5 |
| bank at 10R (`max_rr10`) | +33.0k | +5.4k | 48.7 / 2.5 | 50.7 / 0.0 | 65.1 / 19.3 | 49.2 / 0.0 | 5.0 / 4.0 | 46.0/3.1 · 49.5/3.0 |
| fixed 2R target (`fix2`) | +13.5k | +3.2k | 41.2 / 5.9 | 26.1 / 7.2 | 53.2 / 21.1 | 16.9 / 8.5 | 5.5 / 4.5 | 38.8/4.5 · 32.4/6.7 |
| fixed 4R target (`fix4`) | +23.5k | +11.8k | 53.8 / 3.4 | 42.0 / 4.3 | 66.1 / 8.3 | 39.0 / 8.5 | 4.0 / 3.0 | 54.0/5.0 · 48.9/6.8 |
| fixed 5R target (`fix5`) | +28.9k | +11.3k | 57.1 / 6.7 | 53.6 / 0.0 | 70.6 / 12.8 | 47.5 / 6.8 | 4.0 / 4.0 | 53.0/3.9 · 53.1/2.6 |
| fixed 8R target (`fix8`) | +31.7k | +5.9k | 49.6 / 2.5 | 46.4 / 1.4 | 65.1 / 13.8 | 49.2 / 1.7 | 5.0 / 6.0 | 47.2/2.0 · 38.4/1.1 |
| next level target (PD / PW / PM high-low) (`lvl`) | +27.9k | +15.5k | 51.3 / 5.0 | 46.4 / 0.0 | 68.8 / 12.8 | 39.0 / 6.8 | 4.0 / 3.0 | 52.4/3.6 · 51.4/3.5 |
| nearest of VIX band or a PD / PW / PM level (`vix_lvl`) | +33.0k | +7.9k | 49.6 / 4.2 | 50.7 / 0.0 | 75.2 / 10.1 | 50.8 / 6.8 | 6.0 / 4.0 | 50.0/3.6 · 51.5/3.8 |
| VIX band, else a fixed 4R (no skip) (`vix_fb4`) | +36.6k | +9.1k | 58.0 / 5.9 | 52.2 / 0.0 | 75.2 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.6/2.6 · 55.1/3.5 |
| VIX band 0.75 x (`vix_k075`) | +37.2k | +1.4k | 63.0 / 5.0 | 42.0 / 0.0 | 78.0 / 8.3 | 35.6 / 3.4 | 5.0 / 5.0 | 54.2/3.2 · 42.5/3.2 |
| VIX band 1.25 x (`vix_k125`) | +35.0k | +11.1k | 58.0 / 5.9 | 43.5 / 0.0 | 73.4 / 11.9 | 39.0 / 0.0 | 4.0 / 3.0 | 54.0/2.8 · 54.0/3.1 |
| flat 15:25 (`flat925`) | +34.4k | +8.4k | 58.8 / 5.9 | 53.6 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 4.0 / 4.0 | 54.6/2.6 · 55.2/3.0 |
| flat 16:25 (`flat985`) | +34.1k | +9.3k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.6/2.6 · 55.0/3.3 |
| entries from 03:00 (`win_0300`) | +19.4k | +5.8k | 41.2 / 3.4 | 24.6 / 0.0 | 57.8 / 13.8 | 13.6 / 5.1 | 5.5 / 3.0 | 39.5/3.5 · 36.8/2.5 |
| entries from 01:00 (`win_0100`) | +35.6k | +14.4k | 55.5 / 4.2 | 47.8 / 0.0 | 68.8 / 13.8 | 45.8 / 0.0 | 4.5 / 3.0 | 50.8/2.2 · 57.4/0.7 |
| entries until 14:30 (`win_1430`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| entries until 15:55 (`win_1555`) | +34.3k | +9.0k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| NY only 08:00-15:30 (`win_ny_only`) | +13.6k | -1.2k | 25.2 / 0.0 | 0.0 / 0.0 | 37.6 / 0.0 | 0.0 / 0.0 | 7.0 / None | 23.6/0.1 · 0.0/1.9 |
| no afternoon (02:00-12:00) (`win_no_pm`) | +32.1k | +9.2k | 55.5 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 47.5 / 0.0 | 5.0 / 4.0 | 52.2/2.8 · 53.9/3.5 |
| 2 trades a day (`two_day`) | +29.6k | +13.3k | 46.2 / 8.4 | 50.7 / 11.6 | 66.1 / 17.4 | 57.6 / 22.0 | 5.0 / 5.0 | 48.2/8.2 · 53.9/9.9 |
| stop exactly at the sweep extreme (`buf0`) | +34.5k | +9.0k | 57.1 / 5.0 | 52.2 / 0.0 | 73.4 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.9 · 54.9/3.4 |
| stop 2 ticks beyond (`buf05`) | +33.6k | +12.8k | 57.1 / 7.6 | 52.2 / 4.3 | 74.3 / 11.9 | 49.2 / 8.5 | 5.0 / 4.0 | 52.7/2.9 · 55.8/3.9 |

#### Eval caps (eval path only): eval path (two_week sizing)

| variant | H1 $ | H2 $ | 2-wk pass/fail H1 | 2-wk H2 | 1-mo pass/fail H1 | 1-mo H2 | median sessions to pass H1/H2 | Monte Carlo 2-wk H1 · H2 |
|---|---|---|---|---|---|---|---|---|
| **live LIT** | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| no 60% room cap (two_week) (`cap_room`) | +32.4k | +14.5k | 58.0 / 20.2 | 53.6 / 26.1 | 70.6 / 22.0 | 54.2 / 30.5 | 4.5 / 4.0 | 54.6/24.6 · 57.6/26.1 |
| no $1,000 soft-daily-loss cap (two_week) (`cap_dll`) | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.0/2.6 · 55.1/3.5 |
| neither cap (two_week) (`cap_both`) | +38.8k | +17.7k | 61.3 / 21.0 | 63.8 / 26.1 | 70.6 / 22.9 | 57.6 / 30.5 | 4.0 / 4.0 | 58.8/24.9 · 63.4/26.9 |
| room cap 50% (`cap_room05`) | +34.1k | +8.8k | 57.1 / 2.5 | 50.7 / 0.0 | 74.3 / 6.4 | 49.2 / 1.7 | 5.0 / 4.5 | 52.4/1.5 · 49.8/2.1 |
| room cap 70% (`cap_room07`) | +33.5k | +12.4k | 57.1 / 6.7 | 52.2 / 5.8 | 73.4 / 11.9 | 50.8 / 10.2 | 5.0 / 4.0 | 53.4/6.8 · 55.8/6.1 |

#### Follow-up grids: LIT size rule

| variant | H1 $ | H2 $ | 2021-25 $ | PF 2026 | win % / >=0.5R % 2026 | trades/wk 2026 | % weeks 2+ | max DD 2026 | H2 $/month |
|---|---|---|---|---|---|---|---|---|---|
| `idm_age14` {"idm_a": [1.0, 14, 1]} | +33.7k | +12.8k | -4.6k | 4.27 | 54.5 / 27.7 | 2.72 | 81 | -2.2k | $3,434 |
| `idm_age16` {"idm_a": [1.0, 16, 1]} | +33.9k | +12.8k | -4.1k | 4.34 | 55.4 / 27.7 | 2.72 | 81 | -2.2k | $3,434 |
| `idm_age18` {"idm_a": [1.0, 18, 1]} | +34.2k | +12.8k | -5.5k | 4.45 | 55.8 / 27.4 | 2.74 | 81 | -2.2k | $3,434 |
| `idm_age20` {"idm_a": [1.0, 20, 1]} | +34.1k | +12.6k | -2.3k | 4.34 | 55.3 / 27.2 | 2.77 | 81 | -2.2k | $3,389 |
| `idm_age21` {"idm_a": [1.0, 21, 1]} | +34.1k | +12.6k | +2.4k | 4.34 | 55.3 / 27.2 | 2.77 | 81 | -2.2k | $3,389 |
| `idm_age22` {"idm_a": [1.0, 22, 1]} | +34.1k | +12.6k | +1.9k | 4.34 | 55.3 / 27.2 | 2.77 | 81 | -2.2k | $3,389 |
| `idm_age23` {"idm_a": [1.0, 23, 1]} | +34.1k | +14.3k | +1.6k | 4.59 | 55.7 / 27.8 | 2.79 | 81 | -2.2k | $3,854 |
| `idm_age24` {"idm_a": [1.0, 24, 1]} | +34.1k | +14.3k | -0.6k | 4.59 | 55.7 / 27.8 | 2.79 | 81 | -2.2k | $3,854 |
| `idm_age25` {"idm_a": [1.0, 25, 1]} | +34.1k | +14.3k | -1.8k | 4.59 | 55.7 / 27.8 | 2.79 | 81 | -2.2k | $3,854 |
| `idm_age26` {"idm_a": [1.0, 26, 1]} | +34.1k | +14.0k | -1.9k | 4.48 | 55.6 / 27.4 | 2.84 | 83 | -2.2k | $3,759 |
| `idm_age27` {"idm_a": [1.0, 27, 1]} | +34.1k | +14.0k | +0.7k | 4.48 | 55.9 / 27.1 | 2.86 | 83 | -2.2k | $3,759 |
| `idm_age28` {"idm_a": [1.0, 28, 1]} | +34.1k | +14.0k | +0.8k | 4.48 | 55.9 / 27.1 | 2.86 | 83 | -2.2k | $3,759 |
| `idm_age30` {"idm_a": [1.0, 30, 1]} | +33.8k | +14.0k | +0.8k | 4.4 | 55.5 / 26.9 | 2.89 | 83 | -2.2k | $3,759 |
| `idm_age33` {"idm_a": [1.0, 33, 1]} | +33.8k | +9.5k | +0.9k | 4.05 | 54.6 / 26.1 | 2.89 | 83 | -2.2k | $2,556 |
| `idm_0.75_18` {"idm_a": [0.75, 18, 1]} | +33.3k | +7.4k | -3.2k | 4.23 | 54.9 / 26.5 | 2.48 | 74 | -2.8k | $2,004 |
| `idm_0.75_24` {"idm_a": [0.75, 24, 1]} | +33.5k | +6.5k | +6.4k | 3.9 | 53.8 / 25.5 | 2.57 | 74 | -3.0k | $1,749 |
| `idm_0.75_30` {"idm_a": [0.75, 30, 1]} | +33.1k | +6.5k | +6.5k | 3.79 | 53.2 / 24.8 | 2.65 | 74 | -3.0k | $1,749 |
| `idm_1.25_18` {"idm_a": [1.25, 18, 1]} | +34.9k | +14.2k | +0.7k | 4.39 | 55.5 / 27.7 | 2.89 | 83 | -2.5k | $3,821 |
| `idm_1.25_24` {"idm_a": [1.25, 24, 1]} | +34.5k | +15.9k | +5.0k | 4.52 | 54.9 / 27.9 | 2.96 | 88 | -2.6k | $4,281 |
| `idm_1.25_30` {"idm_a": [1.25, 30, 1]} | +30.7k | +15.5k | +4.1k | 4.08 | 54.4 / 26.4 | 3.03 | 90 | -3.4k | $4,186 |
| `idm_1.5_18` {"idm_a": [1.5, 18, 1]} | +34.9k | +11.8k | +1.3k | 4.03 | 53.7 / 27.3 | 2.94 | 86 | -2.5k | $3,182 |
| `idm_1.5_24` {"idm_a": [1.5, 24, 1]} | +30.7k | +13.5k | +5.7k | 3.84 | 53.6 / 26.4 | 3.03 | 88 | -3.4k | $3,643 |
| `idm_1.5_30` {"idm_a": [1.5, 30, 1]} | +30.7k | +13.2k | +4.2k | 3.75 | 53.2 / 26.2 | 3.06 | 90 | -3.4k | $3,547 |
| `disp0.7` {"disp": 0.7} | +33.2k | +8.3k | -10.7k | 3.62 | 54.1 / 22.6 | 3.23 | 88 | -2.7k | $2,247 |
| `disp0.75` {"disp": 0.75} | +32.6k | +9.2k | -5.8k | 3.81 | 55.1 / 22.8 | 3.08 | 88 | -2.4k | $2,466 |
| `disp0.78` {"disp": 0.78} | +33.9k | +9.2k | -1.5k | 4.04 | 54.5 / 24.8 | 2.94 | 86 | -2.2k | $2,468 |
| `disp0.82` {"disp": 0.82} | +34.0k | +9.7k | +3.6k | 4.15 | 55.5 / 26.1 | 2.89 | 83 | -2.2k | $2,611 |
| `disp0.85` {"disp": 0.85} | +33.4k | +9.2k | -2.5k | 4.06 | 54.3 / 25.9 | 2.82 | 81 | -2.2k | $2,481 |
| `disp0.9` {"disp": 0.9} | +28.5k | +6.0k | -6.8k | 3.69 | 55.6 / 25.0 | 2.62 | 81 | -2.0k | $1,605 |
| `max_rr7.0` {"max_rr": 7.0} | +29.9k | +8.1k | -0.8k | 3.69 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,185 |
| `max_rr7.5` {"max_rr": 7.5} | +32.3k | +8.8k | -0.1k | 3.9 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,376 |
| `max_rr8.5` {"max_rr": 8.5} | +36.1k | +10.2k | -2.4k | 4.27 | 55.0 / 25.8 | 2.91 | 86 | -2.2k | $2,736 |
| `max_rr9.0` {"max_rr": 9.0} | +34.3k | +5.5k | -0.9k | 3.82 | 55.0 / 23.3 | 2.91 | 86 | -2.7k | $1,479 |
| `idm24_nowk` {"idm_a": [1.0, 24, 1], "wk_stop": null} | +35.8k | +14.2k | -2.8k | 4.59 | 55.7 / 27.8 | 2.79 | 81 | -2.4k | $3,826 |
| `nowk_minrr` {"wk_stop": null, "min_rr": 0.01} | +35.7k | +9.4k | +2.8k | 4.0 | 56.1 / 26.0 | 2.99 | 86 | -2.4k | $2,523 |
| `cisd18` {"cisd1m": 18} | +24.3k | +7.3k | -1.6k | 3.18 | 51.7 / 23.3 | 2.82 | 81 | -2.1k | $1,957 |
| `cisd19` {"cisd1m": 19} | +30.9k | +9.5k | -1.6k | 3.94 | 54.2 / 25.4 | 2.86 | 86 | -2.1k | $2,552 |
| `cisd21` {"cisd1m": 21} | +33.9k | +9.9k | +1.3k | 4.19 | 55.8 / 25.8 | 2.91 | 86 | -2.2k | $2,670 |
| `cisd22` {"cisd1m": 22} | +33.9k | +9.9k | +1.3k | 4.19 | 55.8 / 25.8 | 2.91 | 86 | -2.2k | $2,670 |
| `cisd24` {"cisd1m": 24} | +33.6k | +9.9k | +1.3k | 4.12 | 55.7 / 25.4 | 2.96 | 86 | -2.2k | $2,673 |
| `cisd25` {"cisd1m": 25} | +33.6k | +10.0k | +8.2k | 4.12 | 56.5 / 25.0 | 3.01 | 86 | -2.2k | $2,692 |
| `nowk_cisd23` {"wk_stop": null, "cisd1m": 23} | +34.7k | +9.7k | +0.6k | 3.91 | 55.7 / 25.4 | 2.96 | 86 | -2.4k | $2,610 |
| `nowk_win1430` {"wk_stop": null, "window": [[120, 870]]} | +35.4k | +9.3k | +1.9k | 3.96 | 55.0 / 25.8 | 2.91 | 86 | -2.4k | $2,493 |
| `nowk_cisd22` {"wk_stop": null, "cisd1m": 22} | +35.4k | +9.7k | +0.6k | 4.08 | 55.8 / 25.8 | 2.91 | 86 | -2.4k | $2,608 |
| `minimal_tol` {"wk_stop": null, "min_rr": 0.01, "flat_mod": 1010, "be_off": 0.0} | +34.9k | +9.6k | +1.9k | 3.87 | 28.5 / 26.0 | 2.99 | 86 | -2.4k | $2,598 |

#### Follow-up grids: eval path

| variant | H1 $ | H2 $ | 2-wk pass/fail H1 | 2-wk H2 | 1-mo pass/fail H1 | 1-mo H2 | median sessions to pass H1/H2 | Monte Carlo 2-wk H1 · H2 |
|---|---|---|---|---|---|---|---|---|
| `idm_age14` {"idm_a": [1.0, 14, 1]} "" | +25.8k | +12.2k | 57.1 / 3.4 | 66.7 / 0.0 | 73.4 / 11.0 | 79.7 / 5.1 | 5.0 / 5.0 | 52.5/2.9 · 58.6/1.1 |
| `idm_age16` {"idm_a": [1.0, 16, 1]} "" | +27.7k | +12.2k | 57.1 / 3.4 | 66.7 / 5.8 | 74.3 / 9.2 | 79.7 / 6.8 | 5.0 / 5.0 | 52.6/3.0 · 58.5/1.6 |
| `idm_age18` {"idm_a": [1.0, 18, 1]} "" | +26.2k | +12.2k | 57.1 / 3.4 | 66.7 / 5.8 | 74.3 / 9.2 | 79.7 / 6.8 | 5.0 / 5.0 | 52.9/2.5 · 58.5/1.6 |
| `idm_age20` {"idm_a": [1.0, 20, 1]} "" | +26.2k | +11.3k | 57.1 / 3.4 | 65.2 / 7.2 | 74.3 / 9.2 | 78.0 / 8.5 | 5.0 / 5.0 | 52.9/2.5 · 57.9/2.2 |
| `idm_age21` {"idm_a": [1.0, 21, 1]} "" | +26.2k | +11.3k | 57.1 / 3.4 | 65.2 / 7.2 | 74.3 / 9.2 | 78.0 / 8.5 | 5.0 / 5.0 | 52.9/2.5 · 57.9/2.2 |
| `idm_age22` {"idm_a": [1.0, 22, 1]} "" | +26.2k | +11.3k | 57.1 / 3.4 | 65.2 / 7.2 | 74.3 / 9.2 | 78.0 / 8.5 | 5.0 / 5.0 | 52.9/2.5 · 57.9/2.2 |
| `idm_age23` {"idm_a": [1.0, 23, 1]} "" | +26.2k | +13.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 64.2/2.0 |
| `idm_age24` {"idm_a": [1.0, 24, 1]} "" | +26.2k | +13.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 64.2/2.0 |
| `idm_age25` {"idm_a": [1.0, 25, 1]} "" | +26.2k | +13.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 64.2/2.0 |
| `idm_age26` {"idm_a": [1.0, 26, 1]} "" | +26.2k | +10.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 63.5/2.4 |
| `idm_age27` {"idm_a": [1.0, 27, 1]} "" | +26.2k | +10.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 63.5/2.4 |
| `idm_age28` {"idm_a": [1.0, 28, 1]} "" | +26.2k | +10.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 63.5/2.4 |
| `idm_age30` {"idm_a": [1.0, 30, 1]} "" | +34.5k | +10.9k | 57.1 / 6.7 | 66.7 / 0.0 | 74.3 / 12.8 | 78.0 / 0.0 | 5.0 / 5.0 | 52.8/3.3 · 63.5/2.4 |
| `idm_age33` {"idm_a": [1.0, 33, 1]} "" | +34.5k | +9.1k | 57.1 / 6.7 | 52.2 / 0.0 | 74.3 / 12.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/3.3 · 55.1/3.5 |
| `idm_0.75_18` {"idm_a": [0.75, 18, 1]} "" | +29.3k | +8.5k | 54.6 / 1.7 | 40.6 / 0.0 | 74.3 / 3.7 | 50.8 / 18.6 | 5.5 / 6.0 | 49.6/1.9 · 39.2/0.0 |
| `idm_0.75_24` {"idm_a": [0.75, 24, 1]} "" | +33.8k | +5.5k | 54.6 / 1.7 | 34.8 / 5.8 | 74.3 / 3.7 | 42.4 / 27.1 | 5.5 / 6.0 | 49.6/1.7 · 37.1/1.8 |
| `idm_0.75_30` {"idm_a": [0.75, 30, 1]} "" | +33.8k | +5.5k | 54.6 / 5.0 | 34.8 / 5.8 | 74.3 / 7.3 | 42.4 / 27.1 | 5.5 / 6.0 | 49.4/2.5 · 37.1/1.8 |
| `idm_1.25_18` {"idm_a": [1.25, 18, 1]} "" | +42.0k | +16.0k | 59.7 / 8.4 | 63.8 / 7.2 | 77.1 / 12.8 | 81.4 / 10.2 | 5.0 / 5.0 | 53.6/3.6 · 59.5/4.5 |
| `idm_1.25_24` {"idm_a": [1.25, 24, 1]} "" | +42.0k | +15.1k | 59.7 / 8.4 | 63.8 / 4.3 | 76.1 / 12.8 | 81.4 / 5.1 | 5.0 / 5.0 | 53.3/3.9 · 63.9/4.5 |
| `idm_1.25_30` {"idm_a": [1.25, 30, 1]} "" | +38.9k | +8.4k | 52.1 / 8.4 | 63.8 / 4.3 | 67.0 / 21.1 | 81.4 / 5.1 | 5.0 / 5.0 | 48.4/4.7 · 63.1/5.0 |
| `idm_1.5_18` {"idm_a": [1.5, 18, 1]} "" | +42.0k | +11.0k | 59.7 / 8.4 | 56.5 / 7.2 | 77.1 / 12.8 | 74.6 / 13.6 | 5.0 / 5.0 | 53.6/3.6 · 54.3/6.5 |
| `idm_1.5_24` {"idm_a": [1.5, 24, 1]} "" | +38.9k | +11.2k | 52.1 / 8.4 | 59.4 / 4.3 | 67.0 / 21.1 | 76.3 / 6.8 | 5.0 / 5.0 | 48.4/4.7 · 61.1/5.3 |
| `idm_1.5_30` {"idm_a": [1.5, 30, 1]} "" | +38.9k | +14.9k | 52.1 / 8.4 | 59.4 / 4.3 | 67.0 / 21.1 | 76.3 / 6.8 | 5.0 / 5.0 | 48.4/4.7 · 60.5/5.8 |
| `disp0.7` {"disp": 0.7} "" | +29.2k | +3.3k | 59.7 / 9.2 | 49.3 / 10.1 | 71.6 / 14.7 | 45.8 / 22.0 | 4.0 / 3.0 | 55.1/4.2 · 52.0/8.2 |
| `disp0.75` {"disp": 0.75} "" | +34.0k | +8.5k | 57.1 / 4.2 | 50.7 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.6/2.6 · 53.5/4.2 |
| `disp0.78` {"disp": 0.78} "" | +34.3k | +8.5k | 57.1 / 5.9 | 50.7 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 53.6/4.2 |
| `disp0.82` {"disp": 0.82} "" | +34.3k | +9.1k | 57.1 / 4.2 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.7 · 55.2/3.2 |
| `disp0.85` {"disp": 0.85} "" | +30.5k | +8.5k | 57.1 / 1.7 | 43.5 / 0.0 | 74.3 / 9.2 | 39.0 / 0.0 | 5.0 / 3.0 | 52.5/2.6 · 53.1/2.2 |
| `disp0.9` {"disp": 0.9} "" | +22.4k | +6.1k | 44.5 / 2.5 | 42.0 / 0.0 | 63.3 / 4.6 | 35.6 / 0.0 | 5.0 / 4.0 | 44.5/1.9 · 46.5/1.5 |
| `max_rr7.0` {"max_rr": 7.0} "" | +33.6k | +9.6k | 63.9 / 4.2 | 50.7 / 4.3 | 77.1 / 11.9 | 45.8 / 8.5 | 4.0 / 4.0 | 55.6/3.6 · 51.6/7.1 |
| `max_rr7.5` {"max_rr": 7.5} "" | +34.8k | +7.5k | 63.9 / 5.0 | 50.7 / 4.3 | 78.0 / 8.3 | 49.2 / 5.1 | 4.5 / 4.0 | 55.9/3.0 · 51.9/6.9 |
| `max_rr8.5` {"max_rr": 8.5} "" | +35.7k | +10.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/3.0 · 55.7/2.5 |
| `max_rr9.0` {"max_rr": 9.0} "" | +35.2k | +4.9k | 49.6 / 5.0 | 50.7 / 0.0 | 65.1 / 15.6 | 47.5 / 0.0 | 5.0 / 4.0 | 48.7/3.0 · 48.6/2.8 |
| `room0.4` {} {"room_f": 0.4} | +26.9k | +9.0k | 51.3 / 0.0 | 39.1 / 0.0 | 75.2 / 3.7 | 37.3 / 0.0 | 6.0 / 4.0 | 49.8/0.5 · 44.8/0.0 |
| `room0.45` {} {"room_f": 0.45} | +30.3k | +10.6k | 57.1 / 1.7 | 47.8 / 0.0 | 74.3 / 6.4 | 45.8 / 0.0 | 5.0 / 5.0 | 51.9/1.1 · 47.9/0.3 |
| `room0.5` {} {"room_f": 0.5} | +34.1k | +8.8k | 57.1 / 2.5 | 50.7 / 0.0 | 74.3 / 6.4 | 49.2 / 1.7 | 5.0 / 4.5 | 52.4/1.5 · 49.8/2.1 |
| `room0.55` {} {"room_f": 0.55} | +34.4k | +9.1k | 57.1 / 2.5 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.2 · 52.4/2.4 |
| `room0.65` {} {"room_f": 0.65} | +33.3k | +9.4k | 57.1 / 7.6 | 52.2 / 0.0 | 73.4 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.0/3.8 · 55.4/4.7 |
| `idm24_room05` {"idm_a": [1.0, 24, 1]} {"room_f": 0.5} | +24.5k | +9.6k | 57.1 / 0.0 | 65.2 / 0.0 | 74.3 / 3.7 | 76.3 / 0.0 | 5.0 / 5.0 | 52.5/1.1 · 59.5/1.2 |
| `idm24_nowk` {"idm_a": [1.0, 24, 1], "wk_stop": null} "" | +26.2k | +13.9k | 57.1 / 3.4 | 66.7 / 0.0 | 74.3 / 9.2 | 78.0 / 0.0 | 5.0 / 5.0 | 52.9/2.5 · 64.2/2.0 |
| `nowk_room05` {"wk_stop": null} {"room_f": 0.5} | +34.1k | +8.8k | 57.1 / 2.5 | 50.7 / 0.0 | 74.3 / 6.4 | 49.2 / 1.7 | 5.0 / 4.5 | 52.4/1.5 · 49.8/2.1 |
| `nowk_minrr` {"wk_stop": null, "min_rr": 0.01} "" | +36.4k | +9.4k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 53.6/2.6 · 55.1/3.5 |
| `idm24_nowk_room05` {"idm_a": [1.0, 24, 1], "wk_stop": null} {"room_f": 0.5} | +24.5k | +9.6k | 57.1 / 0.0 | 65.2 / 0.0 | 74.3 / 3.7 | 76.3 / 0.0 | 5.0 / 5.0 | 52.5/1.1 · 59.5/1.2 |
| `cisd18` {"cisd1m": 18} "" | +34.3k | +3.4k | 41.2 / 4.2 | 43.5 / 7.2 | 58.7 / 18.3 | 39.0 / 18.6 | 5.0 / 4.0 | 42.8/3.4 · 45.4/6.5 |
| `cisd19` {"cisd1m": 19} "" | +33.0k | +8.0k | 49.6 / 4.2 | 52.2 / 7.2 | 65.1 / 15.6 | 50.8 / 11.9 | 5.0 / 4.0 | 48.5/2.7 · 54.2/5.4 |
| `cisd21` {"cisd1m": 21} "" | +34.3k | +9.3k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.5/3.4 |
| `cisd22` {"cisd1m": 22} "" | +34.3k | +9.3k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.5/3.4 |
| `cisd24` {"cisd1m": 24} "" | +40.3k | +9.3k | 57.1 / 6.7 | 52.2 / 0.0 | 74.3 / 12.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/3.7 · 55.5/3.4 |
| `cisd25` {"cisd1m": 25} "" | +40.3k | +9.3k | 57.1 / 6.7 | 52.2 / 0.0 | 74.3 / 12.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/3.9 · 55.5/3.4 |
| `room055_nowk` {"wk_stop": null} {"room_f": 0.55} | +34.4k | +9.1k | 57.1 / 2.5 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.2 · 52.4/2.4 |
| `room055_cisd23` {"cisd1m": 23} {"room_f": 0.55} | +40.5k | +9.3k | 57.1 / 4.2 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.8 · 52.7/2.3 |
| `nowk_cisd23` {"wk_stop": null, "cisd1m": 23} "" | +40.3k | +9.3k | 57.1 / 6.7 | 52.2 / 0.0 | 74.3 / 12.8 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/3.7 · 55.5/3.4 |
| `nowk_cisd23_room055` {"wk_stop": null, "cisd1m": 23} {"room_f": 0.55} | +40.5k | +9.3k | 57.1 / 4.2 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.8 · 52.7/2.3 |
| `nowk_win1430` {"wk_stop": null, "window": [[120, 870]]} "" | +34.3k | +9.1k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.1/3.5 |
| `simple_all` {"wk_stop": null, "window": [[120, 870]], "cisd1m": 23} {"room_f": 0.55} | +40.5k | +9.3k | 57.1 / 4.2 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.8 · 52.7/2.3 |
| `nowk_cisd22` {"wk_stop": null, "cisd1m": 22} "" | +34.3k | +9.3k | 57.1 / 5.9 | 52.2 / 0.0 | 74.3 / 11.9 | 50.8 / 0.0 | 5.0 / 4.0 | 52.8/2.6 · 55.5/3.4 |
| `nowk_cisd22_room055` {"wk_stop": null, "cisd1m": 22} {"room_f": 0.55} | +34.4k | +9.3k | 57.1 / 2.5 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.2 · 52.7/2.3 |
| `cisd22_room055` {"cisd1m": 22} {"room_f": 0.55} | +34.4k | +9.3k | 57.1 / 2.5 | 52.2 / 0.0 | 74.3 / 8.3 | 49.2 / 1.7 | 5.0 / 4.0 | 52.6/2.2 · 52.7/2.3 |
| `minimal_tol` {"wk_stop": null, "min_rr": 0.01, "flat_mod": 1010, "be_off": 0.0} "" | +33.6k | +12.0k | 57.1 / 6.7 | 52.2 / 0.0 | 71.6 / 11.9 | 49.2 / 3.4 | 5.0 / 4.0 | 53.2/2.7 · 54.9/3.7 |

#### Sensitivity (2026 $ / H2 $ / 2021-25 $ / eval 2-wk pass H1-H2; live value in bold)

| knob | verdict | values |
|---|---|---|
| disp | slope | 0.5: +31.2k / +1.3k / +1.7k / 58.0-44.9 · 0.6: +38.2k / +2.7k / -14.9k / 63.0-47.8 · 0.7: +41.5k / +8.3k / -10.7k / 59.7-49.3 · **0.8: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.9: +34.5k / +6.0k / -6.8k / 44.5-42.0 · 1.0: +25.9k / +2.2k / -13.2k / 38.7-37.7 · 1.1: +17.3k / -0.6k / -15.3k / 31.1-20.3 |
| depth | plateau | 0.2: +41.3k / +8.6k / -3.4k / 56.3-43.5 · 0.3: +42.8k / +8.9k / -0.1k / 57.1-43.5 · 0.4: +43.4k / +9.5k / -1.2k / 57.1-52.2 · **0.5: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.6: +43.9k / +9.5k / -1.1k / 57.1-52.2 · 0.7: +44.1k / +9.5k / -1.6k / 57.1-52.2 · 0.8: +43.0k / +8.0k / -13.6k / 57.1-40.6 |
| idm_dist | slope | 0.5: +37.7k / +2.0k / -1.9k / 53.8-18.8 · 0.75: +35.2k / +2.0k / +6.8k / 54.6-20.3 · **1.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 1.25: +41.9k / +11.1k / +3.6k / 52.1-55.1 · 1.5: +39.5k / +8.7k / +4.0k / 52.1-50.7 |
| idm_age | edge (a neighbour is better) | 12: +45.8k / +11.5k / -9.8k / 57.1-59.4 · 18: +47.0k / +12.8k / -5.5k / 57.1-66.7 · 24: +48.4k / +14.3k / -0.6k / 57.1-66.7 · 30: +47.8k / +14.0k / +0.8k / 57.1-66.7 · **36: +43.4k / +9.5k / +1.3k / 57.1-52.2** |
| wait | plateau | 3: +38.2k / +9.4k / -4.1k / 50.4-53.6 · 4: +41.0k / +8.9k / -1.9k / 57.1-52.2 · 5: +41.9k / +9.8k / -1.4k / 57.1-52.2 · **6: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 7: +43.4k / +9.5k / +0.2k / 57.1-52.2 · 8: +43.3k / +9.5k / -1.5k / 57.1-52.2 · 9: +43.3k / +9.5k / -2.3k / 57.1-52.2 |
| cisd1m | slope | 10: +22.4k / +8.5k / +3.3k / 40.3-43.5 · 14: +31.5k / +8.0k / +2.9k / 40.3-43.5 · 17: +31.6k / +7.3k / -1.6k / 41.2-43.5 · **20: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 23: +43.6k / +9.9k / +1.3k / 57.1-52.2 · 26: +43.6k / +10.0k / +8.2k / 57.1-52.2 · 30: +42.3k / +8.2k / +6.7k / 57.1-50.7 |
| stop_buf | plateau | 0.0: +44.1k / +9.5k / +2.1k / 57.1-52.2 · **0.25: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.5: +43.6k / +9.6k / -5.6k / 57.1-52.2 · 0.75: +42.9k / +9.7k / -8.7k / 57.1-52.2 |
| min_stop | plateau | 4.0: +43.4k / +9.5k / -2.3k / 57.1-52.2 · 6.0: +43.4k / +9.5k / +3.0k / 57.1-52.2 · **8.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 10.0: +43.4k / +9.5k / +1.8k / 57.1-52.2 · 12.0: +43.4k / +9.5k / -9.7k / 57.1-52.2 |
| max_stop | plateau | 60.0: +41.4k / +8.7k / -0.0k / 48.7-55.1 · 70.0: +42.5k / +9.5k / +0.7k / 53.8-52.2 · **80.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 90.0: +42.7k / +9.5k / +1.3k / 57.1-52.2 · 100.0: +42.7k / +9.5k / +1.3k / 57.1-52.2 |
| vix_k | plateau | 0.8: +40.1k / +7.2k / +0.8k / 62.2-42.0 · 0.9: +42.5k / +8.8k / -1.2k / 63.9-52.2 · **1.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 1.1: +43.2k / +10.0k / +3.6k / 57.1-52.2 · 1.2: +44.0k / +10.2k / +5.1k / 58.0-43.5 |
| min_rr | plateau | 1.0: +43.7k / +9.5k / +2.9k / 57.1-52.2 · 1.25: +43.7k / +9.5k / +2.7k / 57.1-52.2 · **1.5: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 1.75: +43.4k / +9.5k / +3.8k / 57.1-52.2 · 2.0: +43.4k / +9.5k / +4.5k / 57.1-52.2 |
| max_rr | slope | 6.0: +32.0k / +6.5k / +5.3k / 59.7-43.5 · 7.0: +38.0k / +8.1k / -0.8k / 63.9-50.7 · **8.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 9.0: +39.8k / +5.5k / -0.9k / 49.6-50.7 · 10.0: +41.6k / +6.2k / -0.3k / 48.7-50.7 |
| be_r | plateau | 0.75: +31.8k / +4.4k / -12.9k / 49.6-50.7 · 0.9: +41.9k / +8.9k / -3.1k / 57.1-50.7 · **1.0: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 1.1: +43.3k / +9.5k / +2.4k / 57.1-52.2 · 1.25: +40.3k / +9.5k / +9.2k / 56.3-52.2 · 1.5: +37.8k / +9.5k / +15.5k / 55.5-52.2 |
| be_off | plateau | 0.0: +42.8k / +9.4k / +1.6k / 57.1-52.2 · 0.5: +43.1k / +9.4k / +1.6k / 57.1-52.2 · 0.75: +43.2k / +9.5k / -0.3k / 57.1-52.2 · 1.0: +43.3k / +9.5k / +0.5k / 57.1-52.2 · **1.25: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 1.5: +43.5k / +9.5k / +2.0k / 57.1-52.2 · 2.0: +43.6k / +9.4k / +1.6k / 57.1-52.2 |
| t_check_at | plateau | 10: +45.1k / +9.1k / +1.3k / 57.1-50.7 · 12: +42.2k / +8.6k / +1.3k / 57.1-50.7 · **15: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 18: +42.6k / +9.3k / +1.3k / 57.1-52.2 · 20: +42.2k / +9.3k / +1.3k / 55.5-52.2 |
| t_check_x | plateau | 0.2: +42.1k / +8.0k / +1.3k / 57.1-43.5 · 0.25: +43.5k / +9.4k / +1.3k / 57.1-52.2 · **0.3: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.35: +42.7k / +9.1k / +1.3k / 57.1-52.2 · 0.4: +42.6k / +9.1k / +1.3k / 57.1-52.2 |
| t_check_mfe | plateau | 0.3: +43.1k / +9.2k / +1.3k / 57.1-52.2 · 0.4: +43.1k / +9.2k / +1.3k / 57.1-52.2 · **0.5: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.6: +43.7k / +9.7k / +1.3k / 57.1-52.2 · 0.7: +43.7k / +9.7k / +1.3k / 57.1-52.2 |
| wk_stop_n | plateau | 1: +41.7k / +9.6k / +5.6k / 57.1-52.2 · **2: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 3: +44.8k / +9.3k / +0.2k / 57.1-52.2 |
| wk_stop_m | plateau | 0.25: +42.4k / +9.5k / +1.2k / 57.1-52.2 · **0.5: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 0.75: +44.0k / +9.5k / +0.9k / 57.1-52.2 |
| flat_mod | plateau | 925: +43.6k / +9.6k / +2.8k / 58.8-53.6 · 940: +43.4k / +9.5k / +0.3k / 55.5-53.6 · **955: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 970: +43.5k / +9.8k / +0.4k / 57.1-52.2 · 985: +43.3k / +9.6k / +0.4k / 57.1-52.2 |
| win_start | slope | 60: +38.9k / +10.4k / -7.1k / 55.5-47.8 · 90: +44.5k / +10.8k / -6.0k / 57.1-55.1 · **120: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 150: +31.1k / +7.7k / +6.8k / 44.5-52.2 · 180: +26.3k / +4.0k / +2.5k / 41.2-24.6 |
| win_end | plateau | 870: +43.4k / +9.5k / +2.6k / 57.1-52.2 · 900: +43.4k / +9.5k / +3.9k / 57.1-52.2 · **930: +43.4k / +9.5k / +1.3k / 57.1-52.2** · 955: +43.4k / +9.5k / +1.1k / 57.1-52.2 |
