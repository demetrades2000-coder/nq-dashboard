# LIT execution spec

## How this was researched, and how far to trust it

- **Network:** this box blocks direct page fetches for almost every host (tradingview.com, ttrades.com, luxalgo.com and
  others return a proxy refusal). The sources were read through web-search summaries, plus two public GitHub repos
  cloned for reading:
  - `rpanchyk/mt5-lit-market-sessions-ind`, which carries a verbatim copy of **Reimfx's own "LIT - Timing" Pine v5 source**
    (`docs/LIT_Timing.txt`). This is the only *primary* code from the LIT author.
  - `drusiyani/commodity-desk`, PR #16, `docs/lit.md`: a third-party LIT bot rulebook (15m bars). It is not Reim's method,
    but it is the only fully written mechanical LIT spec found.
- **Source grades** used below:
  - **[P] primary:** Reim's Pine code; Reim's 2020 WWA call notes ("Reims PDF - Inducement Entries", via search summary);
    TTrades' own site pages (via search summary).
  - **[S] secondary:** TradingView LIT/SMC indicator descriptions ("LIT - Confirmations", LIT_Globas_sys, AriVestHub SMC,
    Structure TradingHub), LuxAlgo's concept library, the commodity-desk spec.
  - **[R] repo evidence:** our own `lit_A` grid (`research/writeups/lit-strategy.md`).
- **There is no public canonical LIT rulebook.** The paid course (weekly "Intraday Mastery" structure, an "Entry Helper"
  module) is not public. Where sources disagree, each variant is listed as a test option.

---

## A. Rule list (codeable, with test ranges)

Notation:
- Everything is written for a **long**; shorts mirror it.
- Times are ET. Bars are 5m unless marked otherwise.
- ATR = ATR(14) on the bar's own timeframe.
- Defaults marked **(default)** reproduce or extend `lit_A` so that each change can be scored on its own.

### R1. Session boxes and trap windows [P: Reim's Pine code]
- Reim's "LIT - Timing" uses fixed UTC-7 strings. Converted to ET, with his DST tables, they are:
  - **Asia box:** 18:05-01:00 for futures (415 min, Sun-Fri); 17:05-01:00 for forex.
  - **Frankfurt hour:** 02:00-03:00 (computed, not drawn).
  - **London inducement window:** 03:00-04:00 (1 hour, Mon-Fri).
  - **NY inducement window:** 08:00-09:00 (1 hour, Mon-Fri).
  - Boxes are shown only on charts of 59 min or less. The author says the M5 view is best.
- **DST bug in the published code:** the summer tables stop at 2023-10-29. From then on the script applies its winter
  strings all year, so from March to November 2024-2026 the boxes draw **one hour later in ET**:
  - Asia 19:05-02:00
  - London 04:00-05:00
  - NY 09:00-10:00
  - If the owner's indicator descends from this code, his "NY trap" in summer 2026 may be **09:00-10:00 ET**. Owner
    question 1 stays open until he confirms.
- Code both as session sets:
  - `reim_intended`: asia 1085→60 (crosses midnight; today `asia18` stops at 00:00, so a new box type is needed), lon34, ny89.
  - `reim_as_coded`: the same boxes, shifted +60 min on US-DST dates from 2023-11 on.
- The same script also plots PDH/PDL, PWH/PWL and a "Day Open" (the prior daily close). These five plus the boxes are
  LIT's reference levels.
- **Test:**
  - session set ∈ {reim_intended, reim_as_coded, current asia18/lon34/ny89}
  - entry window = trap-window start → +{1, 2, 3} h, plus NY 09:30-11:30

### R2. Which levels can be swept [P: Reim code + WWA notes; S]
- Levels:
  - Asia H/L (primary in Reim's code and description: "a break of Asia high/low induces liquidity, a reversal after the
    fake breakout is common")
  - London-window H/L and NY-window H/L
  - PDH/PDL, PWH/PWL
  - build-ups = EQH/EQL (Reim 2020: "liquidity is engineered (EQH/EQL) then grabbed by an aggressive run")
- A level is active from the close of its box or day until it is first traded through. After that it is used up.
- **Test:**
  - liquidity set ∈ {asia only; asia+lon+ny windows; + pd/pw; + buildups; all (`lit_A`)}
  - require ≥2 levels taken by the same sweep ∈ {no (default), yes}

### R3. Sweep validity [S: commodity-desk spec, LuxAlgo, ITI "sweep vs run"]
- (a) The wick trades beyond the level by ≥1 tick.
- (b) The close comes back inside **on the sweep bar or the next bar**. Two closes beyond means a breakout: the level is
  used up and there is no trade.
- (c) Overshoot ≤ X·ATR. Beyond that it is a breakout, not a stop run.
- (d) A gap through the level at the reopen does not count.
- (e) Optional: the first sweep of the session is the inducement and the second one is the trade (secondary sources:
  "the first sweep is often inducement, the second move is real").
- Today `candidates()` has no close-back rule and no max overshoot, only depth ≥ 0.5 ATR in `lit_A`.
- **Test:**
  - close-back bars ∈ {1, 2, off}
  - depth band [min, max] ATR, with min ∈ {0, 0.25, 0.5} and max ∈ {1.0, 1.5, 2.0, ∞}
  - timeframe of the check: 5m, or 15m as in the commodity-desk spec

### R4. Inducement (IDM): what counts, and on which timeframe [P: Reim WWA notes; S: AriVestHub, TradingHub, commodity-desk]
Four variants exist in the sources. Code each as a feature, and use none as a hard gate until it is scored.
- **I-a, pre-sweep IDM** (commodity-desk; closest to Reim's "trap before the real level"):
  - a minor swing low (fractal k=2) *above* the level, within `d_idm` ATR of it
  - formed after the level existed, and ≤ N bars before the sweep
  - **still untouched until the sweep run takes it together with the level**
  - The spec says: "No inducement, no trade."
- **I-b, structural IDM** (AriVestHub / LIT_Globas_sys):
  - IDM = the first valid pullback after a BOS. A valid pullback is a bar whose low breaks the low of the previous
    non-inside bar.
  - A new HH/LL counts as structure only after its IDM is taken.
  - TradingHub variant: the *last* minor-zigzag pullback before the major extreme.
- **I-c, POI-side IDM** (Reim 2020: "fake POI, no inducement"; LuxAlgo: "a zone with untouched IDM in front of it is not
  ready"):
  - after the structure shift, the entry zone (R7) is valid only if a minor swing low formed *between* price and the zone
    is taken before price taps the zone
  - also: no fresh liquidity pool resting just beyond the zone
- **I-d, build-up as IDM** (Reim 2020): an EQH/EQL cluster in front of the level, i.e. the `buildups()` levels.
- **Timeframe:** LIT maps structure on HTF and reads IDM on internal (lower-TF) structure. Reim's own material describes a
  "1-minute accumulation" with a "30-second fractal accumulation" as the entry window.
  - Code IDM on 5m k=2 (default) and on **1m k=2-3 for 2026** (`data/NQ_1m.csv` covers 2025-12-28 → 2026-10-16).
- Today `ind_n` counts fractal lows above the level that were taken in the 36 bars before the sweep. It has no proximity
  rule and no "untouched until the sweep" rule, which may be why "requiring it made no difference".
- **Test:**
  - `d_idm` ∈ {0.5, 1.0, 1.5} ATR
  - N ∈ {8, 16, 36} bars (5m)
  - IDM type ∈ {none, I-a, I-c, I-a∧I-c, I-d}
  - TF ∈ {5m, 1m (2026)}

### R5. Displacement [S: LuxAlgo/TradingView displacement conventions; P: Reim "aggressive run"]
- No canonical number exists. The common code:
  - a body ≥ k·ATR, in the trade direction, between the extreme and the trigger
  - body/range ≥ b
  - and/or it leaves an FVG: the bar-1 high is below the bar-3 low, gap ≥ g·ATR
- `lit_A` uses body ≥ 1.0 ATR. Its neighbours 0.8 and 1.2 were all profitable.
- **Test:**
  - k ∈ {0.8, 1.0, 1.2, 1.5}
  - b ∈ {0, 0.6, 0.7}
  - require FVG ∈ {no, yes}, with g ∈ {0, 0.1, 0.25}
  - The displacement must also produce R6 (one move: sweep → break).

### R6. Structure shift: which swing, which timeframe, what close [P: TTrades CISD/protected swing; S: LuxAlgo, LIT checklist "relevant BoS"]
- **Body close required:** a wick through the swing does not count.
  - Optional: close beyond by ≥ m ticks (TradingHub has a "min close beyond" input). m ∈ {0, 2, 4}.
- **Which swing** (the LIT checklist asks for the *relevant* BoS):
  - **S-cisd** (TTrades / ICT CISD, fastest): close above the **open of the first bar of the last unbroken run of
    down-close bars into the extreme**.
  - **S-frac** (default, what `candidates()` does today): close above the last confirmed k=2 fractal high before the extreme.
  - **S-leg** (the "relevant" BoS, slowest): close above the swing high that started the down-leg into the sweep, i.e. the
    lower-high that produced the swept low.
- **Window:** the shift must come within W bars of the sweep. It is cancelled if price trades below the sweep extreme first.
  - commodity-desk uses 8×15m = 2 h; `candidates()` uses `leg`=24 bars (5m).
- **TF:** 5m (default); 1m in 2026 (S-cisd on 1m is the "refined" entry); 15m (owner question 5).
- **Test:**
  - swing ∈ {S-cisd, S-frac, S-leg}
  - TF ∈ {1m (2026), 5m, 15m}
  - W ∈ {6, 12, 24} bars (5m)
  - m ∈ {0, 2, 4} ticks

### R7. Entry type [S: LIT checklist "mitigation after RBoS"; ICT 2022 / Asia-sweep scripts "never at market"; R: lit_A]
- **E-mkt:** next bar open + 1 tick. In `lit_A` this was the worst neighbour (2026 PF 0.80). Keep only as a control.
- **E-ref** (default, `lit_A`): limit at the broken swing level (breaker / retest).
- **E-fvg:** limit at the near edge of the displacement FVG, or at its 50% point (consequent encroachment).
- **E-ob:** limit at the open (or 50%) of the order block, i.e. the last down-close bar before the displacement.
  This is "mitigation after RBoS".
- **E-cisd:** limit at the CISD level (the open of that run).
- **E-1m** (2026): after the 5m shift, wait for a 1m S-cisd in the trade direction inside the POI, then enter at the 1m
  FVG or the CISD retest.
- **Rules for every limit:**
  - fill only if touched within `wait` bars
  - cancel if the target, or the opposite-side swept level, trades first
  - cancel if the sweep extreme breaks before the fill
  - no target credit on the fill bar (already in `simulate`)
- **Test:**
  - entry ∈ {E-ref, E-fvg (edge / 50%), E-ob (open / 50%), E-cisd, E-1m}
  - `wait` ∈ {6, 12, 24} bars (5m)
  - require I-c (POI-side IDM) before the fill ∈ {no, yes}

### R8. Stop: the protected low [P: TTrades protected swing; S: LuxAlgo strong/weak swings; repo hard rule]
- The protected low is the low from which price closed through the series of candles into it, i.e. the sweep extreme in
  a reversal. The stop goes beyond it.
  - TTrades: "stops go beyond the protected swing".
  - LuxAlgo: "stops beyond strong swings".
  - CLAUDE.md hard rule: beyond the sweep extreme, size follows the stop.
- Buffer options: 2 pts (`lit_A`), 0.25 ATR (commodity-desk), or 1-4 ticks.
- The 1m data does **not** move the extreme: the low is the same price on 1m and 5m. On 1m it only gives a smaller
  limit-to-stop distance when the entry is refined (E-1m).
- **Variant that needs the owner's OK** (it breaks the hard rule): a stop under a *later*, higher 1m protected low that
  formed after the sweep (the "1m accumulation" low in Reim's material). Keep it as a research line only.
- Stop limits: 8-80 pts in `lit_A`.
- **Test:**
  - buffer ∈ {1 tick, 2 pts, 0.1 ATR, 0.25 ATR}
  - max stop ∈ {40, 60, 80}
  - min stop ∈ {6, 8, 10}

### R9. Targets [P: Reim code levels; TTrades HTF liquidity / prior-candle range; S: commodity-desk, Asia-sweep script; R: lit_A]
- **T-pd** (default, `lit_A`): nearest unbroken PDH / PWH / PMH ≥ minR away, banked at maxR.
- **T-box:** the opposite side of the Asia box (the Asia-sweep script's T1); T2 = the next opposite inducement swing.
- **T-lvl:** nearest active opposite level of any class beyond 2R (commodity-desk).
- **T-bu:** nearest opposite build-up (EQH).
- **T-vec:** nearest unrecovered opposite-side PVSRA vector zone (R10).
- **T-htf:** the high of the previous 1H/4H candle (TTrades candle-range draw).
- No qualifying level means no trade, or a fixed fallback R.
- **Test:**
  - target ∈ {T-pd, T-pd ∪ T-box, T-lvl, T-bu, T-vec, T-htf}
  - minR ∈ {1.5, 2, 2.5}
  - maxR / bank ∈ {4, 5, 6}
  - fallback ∈ {none, 3R}

### R10. PVSRA vector candles: their role [S: Traders Reality / PVSRA scripts]
- **Definitions** (already in `vectors()`):
  - climax: vol ≥ 200% of the prior-10 average, or vol·range ≥ the highest of the prior 10
  - above average: ≥ 150%
  - colours: green/red = climax bull/bear; blue/violet = above-average bull/bear
- The sources say vectors are *context, not entry signals*. They mark zones that price tends to return to and
  "recover". An untouched vector stays an "unrecovered/unmitigated" vector, a magnet.
- **Three codeable roles:**
  - (V1) **Confirmation:** the sweep bar is a climax (`vec_sweep`), or the displacement contains a climax bar in the trade
    direction (`vec`).
  - (V2) **Target:** unrecovered opposite vector zones (T-vec).
  - (V3) **Obstacle:** an unrecovered vector zone between entry and target. Skip the trade, or bank at that zone.
- **Recovery:** price trades through the whole zone, using the body or the full range (option).
- **Test:**
  - V1 ∈ {off, sweep-bar, disp-bar, either}
  - V3 ∈ {off, skip, bank}
  - zone = body or wick
  - lookback ∈ {1, 3} sessions

### R11. Trade management [S only: no LIT source gives a rule]
- Options seen in the sources:
  - BE at 1R (`lit_A`)
  - 50% partial at 2R + BE + trail on the rest (commodity-desk)
  - partial at 1R, rest to liquidity, exit on an opposite BOS (SMC scripts)
  - TTrades: trail **only when a new protected swing forms**, never on every pullback
- **Test:**
  - BE ∈ {off, 1R, 1.5R, 2R, after the first 5m BOS in trade direction}
  - partial ∈ {0, 50% at 2R, 50% at the first opposing level}
  - trail ∈ {off, protected-swing (5m k=2 swing + buffer, moved only after a close beyond the series)}
  - time stop ∈ {off, 6, 12 bars, if < +0.5R}
  - flat at 15:55
- Partials and trails were rejected for the *engine*. They are cheap to re-test for LIT, which is a different strategy.

### R12. SMT [S: ambiguous]
- In the "LIT - Confirmations" checklist, SMT stands for "Smart Money Trap", meaning a trap (it is effectively the same
  check as the inducement).
- In ICT usage, SMT means NQ/ES divergence.
- Since `data/ES_5m.csv` starts 2025-04, the divergence version can be tested on 2026:
  - at the NQ sweep bar (±k bars), ES does **not** take its equivalent level, i.e. ES fails to break its own swing or
    session low
  - or the reverse: ES sweeps and NQ does not
- **Test:** SMT ∈ {off, required, size ×1.5 when present}; k ∈ {0, 2, 6} bars.

### R13. Mitigation to the left [S: LIT - Confirmations checklist]
- The entry POI lines up with an earlier zone: an unmitigated 5m/15m FVG, an OB or an unrecovered vector from the last
  1-3 sessions, within 0.25-0.5 ATR of the limit price.
- **Test:** as a feature first; as a filter only if it lifts Jan-Jun 2026.

### R14. Frequency and daily cap
- Max 1 trade a day (default).
- A second trade is allowed only in the other trap window (London vs NY) ∈ {no, yes}.
- With strict IDM (R4) and close-back sweeps (R3), expect fewer trades:
  - "LIT as taught" NY-only was 0.51/wk
  - keep London+NY windows and all level classes to stay in the 2-4/wk band

---

## B. Owner's 13 questions: what the sources say

1. **Session boxes:**
   - Reim's own code: Asia 18:05-01:00 ET (futures), London trap 03:00-04:00, NY trap 08:00-09:00.
   - It also has a DST bug: in summer 2024-2026 the published script draws them 1 h later (NY 09:00-10:00).
   - Ask the owner which version he runs, and test both (R1).
2. **Sweeps:**
   - Asia H/L first, then the two trap windows, PDH/PDL, PWH/PWL and EQH/EQL.
   - A valid sweep is a wick through with a close back inside within 1-2 bars, not too deep (R2-R3).
   - No source requires two levels at once.
3. **Inducement:**
   - In LIT it is the minor trap swing in front of the real level that the sweep takes (I-a), plus the swing in front of
     the POI that must be taken before entry (I-c).
   - In structure terms (I-b), the first valid pullback after a BOS.
   - Timeframe: internal / lower TF (5m; 1m in 2026). Today's `ind_n` is too loose (R4).
4. **Displacement:**
   - No fixed size. The convention is body ≥ 0.8-1.5 ATR, often leaving an FVG.
   - Vectors are confirmation or context, not a requirement in any source. Colour should match the direction:
     green/blue bull, red/violet bear (R5, R10).
5. **Structure shift:**
   - Body close through the relevant swing, on the internal TF (5m; 1m for refinement), within ~1-2 h of the sweep.
   - Three swing choices to test: CISD < last fractal < leg origin (R6).
6. **Entry:**
   - Sources prefer a limit at the POI after the break ("mitigation after RBoS"): the broken level, the FVG, the OB or the
     CISD level. Market at the break is the aggressive variant and lost in `lit_A`.
   - Wait 1-2 h, then cancel (R7).
7. **Stop:**
   - Beyond the protected low = the sweep extreme, plus a small buffer.
   - A later, closer 1m protected low is a Reim-style refinement that breaks the repo's hard rule, so it is a research
     line only (R8).
8. **Target:**
   - Reim's tool plots PDH/PDL, PWH/PWL and the Asia box; other sources target the opposite Asia side or the next opposite
     level beyond 2R.
   - Partials: no LIT rule. Common options are 50% at 2R or BE at 1R. The TTrades trail moves only on new protected
     swings (R9, R11).
9. **PO3 / opens:**
   - TTrades bias rule: a daily close below the PDL means continuation, a failure to close below means reversal.
   - Reim's tool has a "Day Open" line (the prior close).
   - This is outside the execution focus (bias spec).
10. **High/low of week:** outside the execution focus; no execution source uses it.
11. **VIX move:** outside the execution focus; no execution source uses it.
12. **Bias:**
    - TTrades sets one-sided daily bias first (prior-day close vs PDH/PDL, then a CISD on 1H).
    - Codeable as: trade only longs on a day where the prior day closed back above a swept PDL, and the mirror for shorts.
    - Test it as a feature (bias spec).
13. **Windows:**
    - Reim marks both London (03-04) and NY (08-09) trap windows, so both are used.
    - The trade comes after the trap, in the 1-3 h that follow (R1, R14).

---

## C. Mapping to code (`engine/lit.py`, research only)

| Rule | Exists today | New code needed |
|---|---|---|
| R1 sessions | asia18, lon34, ny89 | `asia_reim` box 18:05-01:00 (crosses midnight); `as_coded` +60 min on US-DST dates from 2023-11 |
| R3 sweep | depth_atr feature | close-back within 1-2 bars, max overshoot, gap-through exclusion |
| R4 IDM | `ind_n` (loose) | `idm_a` (proximity + untouched until sweep), `idm_c` (POI-side, checked in the fill loop), 1m swings |
| R5 disp | `disp` (max body/ATR) | body/range ratio, FVG flag + size |
| R6 shift | S-frac | S-cisd (open of the down-run), S-leg (leg-origin swing), close margin; 1m/15m versions |
| R7 entry | market, ref, fib50/62/70 | fvg edge/CE, ob open/50%, cisd level, 1m refinement; cancel if extreme breaks before the fill |
| R9 target | pd/pw/pm/session/buildup/gap classes | T-box (opposite Asia side), T-vec, T-htf (prior 1H/4H candle high/low) |
| R10 vectors | climax/above flags | vector zones with recovery state; obstacle check |
| R11 manage | BE, time stop | partial (needs a split-qty walk), protected-swing trail |
| R12 SMT | none | ES 5m swing/level alignment (2025-04 on) |

## D. Test order (1 CPU; select on Jan-Jun 2026, check on Jul-Oct 2026, 2021-25 as reference)

1. R3 close-back + max overshoot on top of `lit_A` (a cheap filter on the existing candidates).
2. R7 entry types (fvg / ob / cisd vs ref), with and without the cancel-if-extreme-breaks rule.
3. R4 IDM I-a with proximity, then I-c at the POI; watch trades/wk (stay ≥ 2).
4. R1 Reim session set (intended vs as-coded) as the liquidity plus entry windows.
5. R6 swing choice (cisd / frac / leg), then the 1m refinement (E-1m) on 2026 only.
6. R9 + R10 targets (T-box, T-vec) and the V3 obstacle.
7. R11 management (BE 1R vs 2R, 50% at 2R, protected-swing trail).
8. R12 SMT with ES (2026).

Rules for every round:
- Change one rule at a time from the current best.
- Keep a rule only if it improves **both** Jan-Jun and Jul-Oct 2026 PF and net $, and keeps 2-4 trades/wk.
- Report every run with: trades/wk, % weeks 2+, win %, PF, net $, $/month, max DD, eval pass/fail in 2 weeks and in 1
  month, pass rate, median sessions to pass. Store it with `rl.save(..., family="other", tags=["lit"])`.

## Sources

- Reimfx, "LIT - Timing" Pine v5 source, copied verbatim in `rpanchyk/mt5-lit-market-sessions-ind/docs/LIT_Timing.txt`
  (https://github.com/rpanchyk/mt5-lit-market-sessions-ind); original script https://www.tradingview.com/script/vukoCtAk/
- Reim WWA call notes, 19 Sep 2020, "Reims PDF - Inducement Entries":
  https://www.scribd.com/document/627160987/Reims-PDF-Inducement-Entries ,
  https://pdfcoffee.com/reims-pdf-inducement-entries-pdf-free.html
- ReimFX channel ("founder of the Liquidity Inducement Theorem, 2020"): https://www.youtube.com/@ReimFx
- LIT - Confirmations checklist (NicoSelman): https://www.tradingview.com/script/whsmlREo-LIT-Confirmations/
- LIT_Globas_sys (IDM structure): https://www.tradingview.com/script/elbmhvj5-lit-globas-sys-liquidity-inducement-theorem-smc-idm/
- AriVestHub SMC (valid pullback / major-minor IDM): https://in.tradingview.com/script/IrCFuo0M-AriVestHub-SMC
- Structure TradingHub (last-pullback IDM, min close beyond): https://kr.tradingview.com/script/wl2qV9eC-Structure-TradingHub
- LuxAlgo concept library: inducement https://www.luxalgo.com/library/concept/inducement/ , strong vs weak swings
  https://www.luxalgo.com/library/concept/strong-vs-weak-swings/ , liquidity sweep https://www.luxalgo.com/library/concept/liquidity-sweep/ ,
  CISD https://www.luxalgo.com/library/concept/change-in-state-of-delivery.md
- TTrades: protected swings https://ttrades.com/protected-swings-understanding-trends-and-invalidations/ , stop-loss mastery
  https://ttrades.com/stop-loss-mastery-using-protected-swings-for-precise-invalidations/ , trailing
  https://ttrades.com/quit-moving-your-stop-loss-before-you-know-this-trailing-stop-loss/ , fractal model playbook
  https://ttrades.com/fractal-model-playbook-aligning-daily-hourly-and-5-minute-charts/
- PVSRA: Traders Reality Main https://www.tradingview.com/script/Etj1ixAs-Traders-Reality-Main/ , Vector Candle Zones
  https://tw.tradingview.com/script/I604sNNd-Traders-Reality-Vector-Candle-Zones/
- Displacement conventions: https://www.tradingview.com/script/U5qHodUJ-ICT-PD-Arrays-LunqFX-FVG-Displacement-Smart-Money-Zones/ ,
  https://www.luxalgo.com/library/indicator/I4pp1V5g-ict-fvg-buy-sell-signals/
- Asia-sweep model (targets, POI-only entries): https://vn.tradingview.com/script/1ZcOyqs5-Asian-Range-Liquidity-Sweep-Kill-Zone-Reversal/
- SMC partial/BOS-exit template: https://www.tradingview.com/script/P47dlwL2/
- Third-party LIT bot rulebook (15m): https://github.com/drusiyani/commodity-desk/pull/16 (`docs/lit.md`)
