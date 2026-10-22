## In one minute (owner summary)

- **Nothing new to switch on.** I tested 10 new ideas, about 1,850 versions in all, on today's live LIT and on the combo
  (15-minute check + scale-in + breakeven + costs). None made more money in both halves (Jan-Jun and Jul-Oct 2026) on both
  versions without more 2-week fails, a broken neighbour setting, or resting on a handful of trades. Trades per week never
  changed: 3.12 in H1 and 2.56 in H2, the same trades every time.
- **Closest idea: aim for an untouched FVG just past the target** (5m, from today or yesterday).
  - On live LIT: +$887 (H1) / +$7,045 (H2) on the eval path, and +$1,591 / +$1,186 on the plain LIT size. Fewer 2-week fails
    (9.2 to 7.6%), and the neighbouring versions hold. It changes 6 trades in H1 and 5 in H2. Most of them reach the band
    and then the FVG; one turned a win into a breakeven.
  - On the combo it loses -$4.1k on the H1 eval path. It still gains +$1.9k / +$1.8k on the plain LIT size.
  - So it is **promising, not adopted**. Simply widening every target (tested before) loses $3-25k, so the FVG is doing
    something. But 10 trades a year is thin.
- **The combo holds up against costs** (plain LIT size, 2026):
  - +2 ticks on every fill (entries, exits, even targets): keeps 96% (H1) / 95% (H2) of its money.
  - +4 ticks: 96% / 85%. Commission +50%: 99% / 99%.
  - A random 10% / 20% of missed fills: 91% / 81% (H1) and 92% / 83% (H2).
  - On the eval path the same stresses keep 72-79% (H1). That path is jumpier, because one bigger or smaller win moves when
    each eval passes.
- **The weak spot is a late entry.** If the PC enters 1 minute after the 1m CISD instead of at its open, the combo keeps 93%
  in H1 but only 53% in H2 (plain LIT size). Almost all of the H2 loss is one trade (2026-10-13): the late fill puts the
  +1.25-pt breakeven just under a wick, so a $9.2k win ends at breakeven (+$0.9k). Live LIT under the same delay keeps
  82% / 127%. The PC's timing fix (route about 3 s after the CISD close) is what protects this. Keep it.
- **Is today's combo setting a lucky spike? No, but one knob is sharp.**
  - Grid: 1,215 settings around the pick (15-minute check time / depth / progress, scale-in pullback / size, breakeven
    offset). On the plain LIT size **all 11 one-step neighbours beat live in both halves**. On the eval path 550 of the
    1,215 points beat live in both halves, and 9 of the 11 neighbours do.
  - The two neighbours that fall short in H1: the check at 10 min (+$28.9k vs live +$36.7k) and the add at 0.75x
    (+$35.4k).
  - The sharp knob is the check time. 15 min is clearly best (H1 average over the grid: $42.3k at 15 min vs $33.6k at 10
    and $37.6k at 20). The add size works best at the full 1.0x.
  - Month by month the combo beats live in 9 of 10 months (LIT size: all but January; eval path: all but July).
  - Walk-forward (pick the best setting on the 3 months before, trade the next month, Apr-Oct): +$35,061 (LIT size) /
    +$32,535 (eval path). Today's fixed setting made +$36,121 / +$41,430 and live +$22,859 / +$26,145. Re-tuning every
    month does not beat today's setting, so keep it fixed.
- **ES confirmation is not information.** ES took its matching level within 5 minutes on 88 of 120 trades. It took it
  within 15 minutes on 98, and held every copy on only 10. Sizing on it does nothing useful.
- Structure breakeven (BE on the first new 1m swing) **costs $2-32k a half**. The 10:00 day read and the stop-scaled
  target change only 1-6 trades: almost no trade is still open and near its target by 10:00. News days and calendar rules
  are a handful of trades each.
- Nothing in `live_model.json` changed. The new engine options are research only and off by default (`be_swing`,
  `day_mgmt`, `entry_delay`, `ctx_day.tgt_px`). `tests.test_lit_live` still replays 120/120 identical trades.

## How it was judged

- 2026 only: pick on H1 (Jan 2 - Jun 30), check on H2 (Jul 1 - Oct 16). 2021-25 is a reference (LIT size rule, no 1m bars).
- Two references:
  - **live** = `lit_live`: eval path H1 +$36,723 ($6,025/mo), PF 3.66, DD -$3,612, 2-week pass/fail 52.9 / 9.2%; H2
    +$9,674 ($2,605/mo), PF 2.13, DD -$2,493, 50.7 / 2.9%. LIT size rule: H1 +$32,773, H2 +$8,962.
  - **combo (all3)** = t_check + scale_in + be_off: eval H1 +$53,116 ($8,714/mo), PF 4.85, 58.0 / 2.5%; H2 +$17,262
    ($4,647/mo), PF 2.85, 52.2 / 0.0%. LIT size rule: H1 +$44,507, H2 +$15,192.
- The eval path:
  - live sizing: `engine/sizing.lit_qty` two_week for 10 sessions, then safe_eval, no reset, $1.90 a micro, true 1m
  - scored on a fresh MFFU 50K started on every session, a 2,000-path Monte Carlo, and the back-to-back path ($, PF, DD)
  - executor: `tools/lit_context.py` / `lit_adopt_combo.py`; it reproduces both references exactly
- **Strict adopt test** (both halves):
  - eval net up; 2-week pass not down; 2-week fail (exact and Monte Carlo) not up; LIT-rule net not down
  - at least 10 / 5 flagged trades; for management changes, at least 5 / 3 changed trades, none carrying 50% of the gain
  - neighbouring settings also up in both halves
  - a size tilt must also beat a flat size change of the same average (plain leverage)
- Size tilts:
  - a cut is int(micros x m), at least 1 micro
  - an increase is capped by the live caps (60% of the room, the $1,000 soft daily loss, 40 micros)
- Caveat for target ideas: under two_week sizing the size depends on the target distance. A farther target means fewer
  micros, so a target change moves eval-path $ even on trades whose result did not change. Look at the LIT-rule column for
  the pure effect.
- No look-ahead:
  - every feature uses bars that closed before the entry (the 10:00 read: bars that closed before 10:00)
  - ES levels are copied from the same bars and must be taken before the trigger
  - news comes from the calendar file; holidays come from the exchange calendar

## Ranked: the best variant of each idea (change vs the reference, eval path unless marked LIT)

"Best" = the largest smaller-of-the-two-halves net gain. Fails are exact 2-week fails. n = flagged (or changed) trades H1/H2.

| # | Idea | Ref | Best variant | Δ net H1 / H2 | Δ 2-wk pass | Δ 2-wk fail | Δ LIT H1 / H2 | n | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 9 FVG target | live | target -> untouched opposite 5m FVG (today + yesterday) beyond the band | **+$887 / +$7,045** | 0 / +1.5 | **-1.6** / 0 | +$1,591 / +$1,186 | 6/5 changed | strict + neighbours pass; **promising** |
| 1b | 9 FVG target | combo | same rule | -$4,079 / +$7,367 | +0.8 / +5.8 | 0 / 0 | +$1,918 / +$1,818 | 5/5 changed | eval H1 down: not adopted |
| 2 | 4 day type 10:00 | live | range used ≤ median of the VIX move -> bank at 4R | +$3,824 / +$837 | 0 / +1.5 | 0 / 0 | -$912 / +$418 | 2/1 changed | a handful, LIT H1 down |
| 3 | 8 seasonality | live | 4th week of the month x1.5 | +$6,905 / +$798 | 0 / 0 | **+0.9** / 0 | +$3,226 / +$1,420 | 18/8 | more fails, neighbour (x1.25) breaks |
| 4 | 5 Asia range | combo | Asia range ≥ median of the ATR -> London trade x1.5 | +$3,137 / +$385 | -1.7 / **-5.8** | **+1.7** / 0 | +$7,108 / +$5,427 | 32/23 | fewer passes, more fails |
| 5 | 2 NQ/ES strength | combo | NQ stronger than ES over 45 min (top 20%) x1.5 | +$3,076 / +$491 | 0 / 0 | **+1.7** / 0 | +$2,390 / +$2,996 | 16/17 | more fails, 2021-25 -$1.2k |
| 6 | 6 London range | live | London range high -> NY trade x1.25, low x0.75 | +$390 / +$2,031 | -1.6 / +1.5 | -0.8 / 0 | -$672 / -$273 | 17/8 | LIT down, only ~25 NY trades a year |
| 7 | 8 seasonality | combo | first trading day of the month x1.5 | +$869 / +$552 | 0 / 0 | 0 / 0 | +$1,872 / +$1,570 | 4/3 | 7 trades in 2026 |
| 8 | 10 stop-scaled target | live | (mirror) tight stop < 30 -> target x (30/stop)^0.25 | +$221 / +$81 | 0 / 0 | 0 / 0 | +$1,594 / +$108 | 4/1 changed | a handful; the asked direction (wide stop -> nearer) loses up to -$8.6k / -$6.9k |
| 9 | 7 news days | combo | FOMC days x1.25 | +$844 / $0 | 0 / 0 | 0 / 0 | +$1,196 / $0 | 4/1 | 5 trades; nothing in H2 |
| 10 | 3 structure BE | live | swing BE only after 1R (k=2) | +$2,129 / $0 | +1.7 / 0 | 0 / 0 | -$592 / $0 | 3/0 changed | the pure swing BE loses $2-18k a half |
| 11 | 1 ES confirmation | live | ES took its copy within 60 min: unconfirmed x1.25 | +$521 / -$46 | 0 / 0 | 0 / 0 | -$4 / +$80 | 5/7 | ES almost always confirms |

Counts (both references): 1,850 variants; 58 made more money in both halves (about the 3-4% chance gives at this many
tries); 6 passed the strict test, all FVG-target variants on live LIT, and 3 of those held at their neighbours.

## What each idea found

1. **ES confirmation.** ES's own copy of the swept level (same bars), taken before the trigger:
   - within 5 min of NQ: 88 of 120 trades; within 15 min: 98; 15-60 min: 10; later: 2
   - ES held every copy: 10 trades
   - So "ES confirmed" is true on almost every trade and carries no edge. Every shape (confirmed x1.25 / x1.5, unconfirmed
     x0.5-x1.25, both ways, N = 5-120 min) loses in at least one half. The SMT study (`lit-adv-audit-smt.md`) already
     showed that the divergence side is not better either.
2. **NQ/ES relative strength (30 / 45 / 60 min before the entry).**
   - 180 tilts; 1 per reference up in both halves.
   - The LIT-rule gains of "NQ weaker x1.5" come with +1.7 to +5.8 points of 2-week fails, which the eval path punishes.
3. **Structure breakeven.**
   - Moving to BE on the first new 1m swing low above the entry (or a swing high), instead of or as well as 1R, costs
     money: -$2k to -$18k a half on live and -$10k to -$32k on the combo.
   - It shakes the trade out before the move. LIT's winners pull back below the first swing.
   - "Swing BE only after 1R" changes 3 trades (+$2.1k H1 eval, -$592 LIT). Not a rule.
4. **Day type at 10:00 (also 09:30 and 10:30)** for a trade still open:
   - day read: range since midnight vs the ATR or the VIX move, trend efficiency, direction with the trade, the trade's own
     progress
   - action: bank at 3 / 4 / 5R on one side
   - Of the ~37 / 16 trades still open at 10:00, only 1-2 a half are ever between 3R and their target after 10:00. So
     whatever the read says, it touches 1-3 trades. 27 of 333 variants were up in both halves on live; none passed the
     trade-count test.
5. **Asia range -> London trades** (02:00-08:00 entries, 95 of 120 trades):
   - Size: big-Asia x1.5 gains on the LIT rule (+$7.1k / +$5.4k on the combo), but 2-week passes fall 1.7 / 5.8 points and
     fails rise.
   - Target / BE changes on small- or big-Asia days: nothing holds.
   - Small Asia ranges are rare in H2 (3 trades below the H1 tercile), so the halves do not even see the same regime.
6. **London range -> NY trades** (08:00+ entries): only ~25 trades in 2026 (17 / 8). The best gains are a few hundred
   dollars with the LIT rule down. Not testable at a useful size.
7. **News days (size only)**:
   - CPI 3/2, NFP 4/3, FOMC 4/1, PPI 5/1 trades (H1/H2); every news-day trade is open into the release
   - No shape gains in both halves: H2 has 1-3 trades per type
   - The eve of news (14/7 trades) loses too
8. **Seasonality** (week of month, first / last trading day, first / last week, pre / post holiday, holiday or early
   close):
   - 3 of 48 up in both halves on live, 1 on the combo; each is 4-26 trades with broken neighbours or more fails
   - "4th week x1.5" looks best (+$6.9k / +$0.8k), but its x1.25 neighbour fails, it adds fails, and it is a calendar rule
   - (Month-end and turn of month were in `lit-market-context.md`: no.)
9. **Untouched 5m FVG as the target:**
   - **alt** (the nearest FVG ≥ 1.5R instead of the band) and **near** (only when nearer): lose
   - **far** (only when the FVG lies beyond the band; the 8R bank still caps it): see the closest idea above
   - Lookback: today + yesterday works; today only flags just 5 / 3 trades. FVG size ≥ 0 / 0.25 / 0.5 ATR; near / middle /
     far edge.
   - The near, middle and far edges all pass on live. ≥ 0.25 ATR passes strict but breaks a neighbour.
   - On the combo, the H1 eval path loses (-$4.1k) while the LIT rule gains (+$1.9k): this is the path / size effect of
     two_week (one bigger win changes which eval passes when).
   - Status: promising. It would need more trades (2027 data, or the same rule on 2021-25 once 1m bars exist) before
     adoption.
10. **Target scaled by the stop:**
    - wide stop (> 20 / 30 / 40 / 50 pts) -> target x (S/stop)^a, or bank at 3-5R: every version loses in at least one half
      (up to -$8.6k / -$6.9k)
    - the band is already in points, so a wide stop already has a nearer target in R
    - The mirror (a tight stop gets a farther target) changes 1-5 trades: noise

## 11. Robustness of the combo (and of live LIT under the same stress)

% of the as-tested net that survives. LIT = the LIT size rule (smooth, linear). Eval = the two_week eval path (jumpy,
path-dependent). Missed fills: 50 seeded random draws, mean.

| Stress | Combo LIT H1 / H2 | Combo eval H1 / H2 | Live LIT H1 / H2 | Live eval H1 / H2 | Combo minus live, eval H1 / H2 |
|---|---|---|---|---|---|
| as tested | $44,507 / $15,192 | $53,116 / $17,262 | $32,773 / $8,962 | $36,723 / $9,674 | +$16,393 / +$7,588 |
| +1 tick on market fills | 98% / 94% | 78% / 78% | 99% / 97% | 101% / 130% | +$4,324 / +$801 |
| +2 ticks on market fills | 96% / 95% | 72% / 130% | 95% / 96% | 83% / 128% | +$7,948 / +$10,080 |
| +4 ticks on market fills | 96% / 86% | 79% / 75% | 94% / 87% | 58% / 123% | +$20,649 / +$1,024 |
| +2 ticks on every fill (targets too) | 96% / 95% | 72% / 130% | 95% / 95% | 82% / 128% | +$7,900 / +$10,046 |
| +4 ticks on every fill | 96% / 85% | 78% / 74% | 93% / 86% | 57% / 122% | +$20,533 / +$1,008 |
| commission +50% ($2.85 / $2.10) | 99% / 99% | 78% / 98% | 99% / 99% | 99% / 128% | +$4,846 / +$4,578 |
| 1-minute entry delay | 93% / **53%** | 63% / **11%** | 82% / 127% | 64% / 101% | +$10,146 / **-$7,838** |
| 2-minute entry delay | 75% / 31% | 47% / 41% | 76% / 94% | 64% / 0% | +$1,625 / +$7,116 |
| 10% missed fills | 91% / 92% | 72% / 94% | 91% / 92% | 81% / 94% | +$8,734 / +$7,046 |
| 20% missed fills | 81% / 83% | 59% / 85% | 80% / 84% | 64% / 80% | +$7,524 / +$6,857 |
| worst case (+2 ticks all, comm +50%, 1-min delay, 10% missed) | 82% / 44% | 46% / 21% | 67% / 113% | 50% / 90% | +$6,051 / -$5,198 |

2-week fails under stress stay low:
- combo: 1.2-5.0% (H1) / 0-5.8% (H2)
- live: 3.4-9.2% / 0-4.3%

**Verdict:**
- Slippage, commission and missed fills: the combo keeps 81-99% of its LIT-rule money and stays ahead of live in every
  case.
- Eval-path percentages swing both ways, even above 100%. That swing is path noise (when evals pass), not a cost effect.
- The one fragile case is a late entry. Under a 1-minute delay, the scale-in alone keeps its edge (H2 LIT +$15.5k vs live
  +$11.4k) and so does the 15-minute check. The combo's H2 falls to +$8.1k. Nearly all of the drop is the 2026-10-13
  trade: the delayed fill plus the +1.25-pt breakeven offset stops a $9k scale-in winner at breakeven.
- That is one trade, but it shows the be_off part leans on an exact entry price. The live route's ~3 s CISD-close timing
  (`lit-live-fills.md`) must stay. Going live with the combo needs the execution tracker
  (`engine/fill_audit.py`) watching entry lag.

## 12. Stability of the combo's parameters

Grid around the pick:
- t_check at {10, 15, 20} min, x {0.2, 0.3, 0.4} R, mfe {0.3, 0.5, 0.7} R
- scale_in pb {0.15, 0.25, 0.35} R, f {0.5, 0.75, 1.0}
- be_off {0, 0.75, 1.25, 1.75, 2.5} pts

That is 1,215 points, each run through the engine and the eval path (adds sized at each point's f).

**One-step neighbours of the pick** (eval path net, 2-week pass/fail; LIT = LIT size rule). Live: eval H1 +$36,723 /
H2 +$9,674, LIT H1 +$32,773 / H2 +$8,962.

| Setting | Eval H1 | 2-wk H1 | Eval H2 | 2-wk H2 | LIT H1 / H2 |
|---|---|---|---|---|---|
| **pick** (at 15, x 0.3, mfe 0.5, pb 0.25, f 1.0, be_off 1.25) | **+$53,116** | 58.0 / 2.5 | **+$17,262** | 52.2 / 0.0 | +$44,507 / +$15,192 |
| at 10 | +$28,852 | 58.0 / 5.9 | +$14,970 | 52.2 / 0.0 | +$45,098 / +$14,831 |
| at 20 | +$40,311 | 56.3 / 5.9 | +$17,824 | 52.2 / 0.0 | +$43,214 / +$14,978 |
| x 0.2 | +$42,561 | 58.0 / 2.5 | +$12,284 | 43.5 / 0.0 | +$44,658 / +$13,314 |
| x 0.4 | +$42,417 | 58.0 / 5.9 | +$26,747 | 52.2 / 2.9 | +$44,077 / +$14,812 |
| mfe 0.3 | +$53,116 | 58.0 / 2.5 | +$27,256 | 52.2 / 0.0 | +$44,507 / +$14,900 |
| mfe 0.7 | +$53,159 | 58.0 / 2.5 | +$22,965 | 52.2 / 0.0 | +$44,593 / +$15,438 |
| pb 0.15 | +$53,963 | 60.5 / 2.5 | +$12,838 | 53.6 / 0.0 | +$45,312 / +$14,510 |
| pb 0.35 | +$55,384 | 58.0 / 2.5 | +$17,936 | 52.2 / 0.0 | +$47,935 / +$14,673 |
| f 0.75 | +$35,351 | 58.8 / 2.5 | +$15,447 | 53.6 / 0.0 | +$43,169 / +$14,530 |
| be_off 0.75 | +$41,559 | 58.0 / 2.5 | +$17,249 | 52.2 / 0.0 | +$44,293 / +$15,150 |
| be_off 1.75 | +$53,476 | 58.8 / 2.5 | +$15,392 | 52.2 / 0.0 | +$44,738 / +$15,195 |

- The LIT-rule column is flat: +$43-48k in H1 and +$13.3-15.4k in H2 for every neighbour. That is a plateau.
- The eval column swings by $10-25k between neighbours. That swing is two_week path noise: one trade more or less moves
  when each eval passes.
- Grid average per value (eval H1 / H2):
  - check time: 10 min $33.6k / $14.7k, **15 min $42.3k / $17.9k**, 20 min $37.6k / $14.9k
  - check depth x: 0.2 $34.3k / $12.3k, 0.3 $37.8k / $15.0k, 0.4 $41.4k / $20.2k (deeper is slightly better; 0.4 has
    more H1 fails at the pick)
  - add size f: 0.5 $34.4k, 0.75 $37.0k, **1.0 $42.1k** (H1)
  - mfe, pb and be_off: flat
- The best H1 point (at 15, x 0.2, mfe 0.7, pb 0.35, be_off 0) makes +$63.0k in H1 but only +$15.9k in H2, with the
  2-week pass at 36.2%. The pick does better in H2 (+$17.3k, 52.2%). Picking harder on H1 would have overfit.
- Month by month (2026, combo vs live):
  - LIT size: Jan +$8.1k vs +$9.5k (the only month behind), Feb +$6.0k vs +$2.2k, Mar +$9.5k vs +$7.2k, Apr +$8.4k vs
    +$6.3k, May +$9.2k vs +$5.3k, Jun +$3.3k vs +$2.2k, Jul +$1.4k vs +$0.5k, Aug +$0.9k vs -$0.0k, Sep +$3.6k vs +$1.8k,
    Oct (to the 16th) +$9.4k vs +$6.7k
  - eval path: behind only in July (-$1.4k vs +$1.2k)
- Walk-forward (Apr-Oct; each month traded with the grid point that made the most in the 3 months before):

| View | Walk-forward | Fixed pick | Live |
|---|---|---|---|
| LIT size rule | +$35,061 | +$36,121 | +$22,859 |
| eval path | +$32,535 | +$41,430 | +$26,145 |

  The walk-forward picks wander: check time 10 / 15 / 20, be_off 0 to 2.5. They still beat live in both views, but never
  beat the fixed pick.

**Verdict:** today's pick sits on a plateau, not a spike, on the LIT size rule. Every neighbour keeps the combo's edge over
live. Keep the check at 15 minutes and the add at full size; those are the two knobs that matter. Re-tuning month by month
adds nothing.

## Files and how to rerun

- `tools/lit_batch3b.py`:
  - `python -X utf8 tools/lit_batch3b.py [idea ...]` screens everything to `research/lit/batch3b.json`. Ideas: es_conf,
    rs, be_swing, day10, asia, london, news, season, fvg, stop_tgt, robust, stable. The full run takes about 1.5 h on one
    core; robust and stable can run separately with `B3B_OUT=<file>`.
  - `python -X utf8 tools/lit_batch3b.py store` saves the runs `lit_b3b_*`.
- New engine options in `engine/lit.py` (research only, off by default; `tests.test_lit_live` 120/120 with them off):
  - `be_swing` (structure breakeven)
  - `day_mgmt` (a bank change at a set time for a trade still open)
  - `entry_delay` (the 1m-CISD entry n bars late)
  - `ctx_day[day].tgt_px` (an absolute target price after the fill)
- Paper only. `live_model.json` is unchanged.
