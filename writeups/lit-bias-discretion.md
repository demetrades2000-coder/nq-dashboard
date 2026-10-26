# LIT with bias and discretion

## In one minute (owner summary)

- **Question:** does a daily bias, or a discretionary "A+ setup" judgement, make LIT more money or pass evals faster?
  The bias had to be known before the entry. It could change the size, the target, or which setups are taken.
- **Answer: nothing is switched on.** 1,842 variants were scored on the real MFFU 50K eval path, picked on Jan-Jun 2026
  and checked on Jul-Oct 2026.
- **Bias as size: no.** Under the live two_week sizing, each trade is already sized so one winner passes the eval.
  Cutting the size on "against the bias" trades turns some of those winners into non-passes. Raising the size on "with
  the bias" trades mostly hits the caps (60% of the room, the $1,000 daily loss). Only 3 of 279 size tilts made more money
  in both halves, and those lost 2-week passes.
- **Bias as a filter: no.** Every bias skips 3-50% of the trades. Jul-Oct already has only 2.56 trades a week, so it falls
  under 2.5 a week. None of the 31 filters made money in both halves.
- **A+ checklist: no.** A 7-point checklist was scored: major level, strong displacement, 2+ inducements, with the bias,
  killzone, fresh trap, clear path. A score of 5-6 earned +2.2R in Jan-Jun, but -0.5R in Jul-Oct and -0.3R in 2021-25.
- **Meta-labeling (a small model that sizes trades): no.** A logistic model and a boosted-stumps model were tried. They
  were trained on 2021-25, on 2021-25 + Jan-Jun, and month by month. None predicted Jul-Oct winners better than chance
  (AUC 0.46-0.52; a model with labels shuffled at random does as well 47-81% of the time).
- **The one lead: a farther target on Power-of-3 days.** A Power-of-3 day here means: after Asia, the market took the Asia
  low (for a long) or the Asia high (for a short), and not the other side. On those days the target is set 1.25x as far
  and is not banked at 8R:
  - **Live LIT:** +$11.3k in Jan-Jun and +$3.1k in Jul-Oct on the eval path ($7,885/mo vs $6,025; $3,430/mo vs $2,605).
    2-week fails fall from 9.2% to 7.6% and from 2.9% to 0.0%. 2-week passes: 52.1% vs 52.9% in Jan-Jun, 50.7% vs 50.7%
    in Jul-Oct. Trades a week are unchanged (3.12 / 2.56).
  - **On the adopt-candidate combo:** +$17.2k / +$0.8k.
  - **Random control:** random trade sets of the same size do as well in both halves only 3% of the time.
- **Why it is still not adopted:**
  - The Jul-Oct gain is 4 trades.
  - The idea came out of a follow-up that was run after both halves had been seen.
  - On the combo, the x1.2 and x1.3 versions lose $2.6-3.1k in Jul-Oct.
  - It is ready as a default-off engine switch so it can be checked forward on paper (Oct-Dec 2026).

## Ranked results (eval path, costs in, vs today's live LIT)

Reference = today's live LIT on the eval path (run `lit_bias_ref_base`):

| Half | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | 2-wk pass / fail % | 1-mo pass / fail % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 Jan-Jun (pick) | 3.12 | 22.5 | 3.66 | +36,723 | 6,025 | -3,612 | 52.9 / 9.2 | 72.5 / 16.5 |
| H2 Jul-Oct (check) | 2.56 | 35.0 | 2.13 | +9,674 | 2,605 | -2,493 | 50.7 / 2.9 | 49.2 / 6.8 |

The combo t_check + scale_in + be_off on the same path (run `lit_bias_ref_all3`):

| Half | Trades/wk | PF | Net $ | $/mo | Max DD $ | 2-wk pass / fail % |
|---|---:|---:|---:|---:|---:|---:|
| H1 | 3.12 | 4.85 | +53,116 | 8,714 | -3,059 | 58.0 / 2.5 |
| H2 | 2.56 | 2.85 | +17,262 | 4,647 | -3,076 | 52.2 / 0.0 |

| # | Variant (best of its kind) | Eval net H1 / H2 vs live | 2-wk pass H1 / H2 | 2-wk fail H1 / H2 | Same on the combo: net H1 / H2 | Random-set p (both halves) | Verdict |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | Power-of-3 day -> target x1.25, no 8R bank | +11,336 / +3,067 | 52.1 / 50.7 (was 52.9 / 50.7) | 7.6 / 0.0 (was 9.2 / 2.9) | +17,161 / +789 | 0.03 | LEAD, not adopted |
| 2 | Power-of-3 OR PDH/PDL draw -> target x1.25, no 8R bank | +2,611 / +618 | 56.3 / 52.2 | 7.6 / 0.0 | +13,200 / -3,557 | 0.14 | passed the strict test on live LIT only; not adopted |
| 3 | PDH/PDL draw -> target x1.25, no 8R bank | +5,045 / +2,193 | 56.3 / 52.2 | 9.2 / 2.9 | +14,359 / -3,578 | 0.12 | reject (combo H2) |
| 4 | A+ score >= 5 -> 1.5x size | +10,045 / +630 | 58.0 / 50.7 | 9.2 / 4.3 | +3,192 / -7,066 | - | reject (H2 fails up, 2021-25 -$6.7k) |
| 5 | Best size tilt: Power of 3 with 1.4x / against 0.6x | +8,843 / -837 | 50.4 / 42.0 | 5.9 / 0.0 | - | - | reject |
| 6 | Best filter: skip setups against the NY Power of 3 | -1,437 / +5,599 | 51.3 / 52.2 | 9.2 / 2.9 | -7,577 / +10,292 | - | reject (2.31 trades/wk in H2) |
| 7 | Meta-label, trained on Jan-Jun only, tested on Jul-Oct | n/a / +2,285 | - / 50.7 | - / 0.0 | n/a / +5,783 | 0.20 (label shuffle) | reject (one half out of sample only) |
| 8 | Meta-label, trained on 2021-25, tested on 2026 | -11,882 / -1,798 | 36.1 / 27.5 | 3.4 / 0.0 | - | 0.75 | reject (AUC 0.49 / 0.46) |

How many made more money in both halves (eval path): size 3 of 279 (both references), target 15 of 416 (live) and 36 of
416 (combo), filter 0 of 31, follow-up 42 of 144 (live) and 23 of 144 (combo), A+ 5 + 1 of 70, meta 0 of 32.
Passing the full strict test: 6 follow-up variants on live LIT (1 with neighbours and beating the same change on every day),
0 on the combo.

## How it was tested

- **Data:** CME NQ1! 5m + true 1m bars for 2026 (TradingView exports); ES 5m (2025-04 on) and ES daily for SMT; CBOE VIX
  for the target.
  **Data note (2026-10-23, `data-official.md`):** the ES daily file used here was not official data; it was replaced by
  daily bars built from the official ES1! 5m. Only the "NQ-ES daily SMT" row (17 trades in 2026) read it; that row was not
  rerun (a 1,842-variant grid; nothing was adopted from it). 2021-25 is a reference line at the LIT size rule (5m entries, no 1m).
- **Trades:** today's live LIT (`live_model.json` lit: sweep, inducement, displacement, 5m CISD, limit, 1m CISD entry, stop 1 tick beyond the
  sweep extreme, VIX-band target banked at 8R, BE at 1R, Monday rule, weekly stop), 630 trades, 120 in 2026. Second
  reference: the same + t_check + scale_in + be_off ("the combo").
- **Eval path:** engine/sizing.lit_qty two_week for 10 sessions then safe_eval, no reset, $1.90 a micro. A fresh MFFU
  Builder 50K eval is started on every session (2-week = 10 sessions, 1 month = 20). There is also a 2,000-path Monte Carlo,
  and a back-to-back path for $ / PF / drawdown. Tools: tools/lit_adv_manage.py + tools/lit_big_ideas.py, the same scoring
  as tools/lit_idm_eval.py / lit_adopt_combo.py.
- **No look-ahead:** every bias reads only 5m bars up to the setup's trigger bar, and only closed days and weeks. The
  features were recomputed on data cut at the entry bar of 8 random 2026 trades: 8 of 8 identical
  (`python -X utf8 tools/lit_bias.py lookahead`).
- **Uses:**
  - **Size:** with / against multipliers (1.15-1.4x / 0.6-0.85x, up-only, cut-only, reversed). A cut is int(q x m), min 1;
    a size-up is capped by the live caps.
  - **Target:** applied after the fill, so the trade list is identical (asserted).
    - Against the bias: bank at 3 / 4 / 5R, a nearer target x0.6 / x0.75, or BE at 0.5 / 0.75R.
    - With the bias: hold to 12R, no bank, or a farther target x1.25 / x1.5.
    - Pairs of the two.
  - **Filter:** skip setups against the bias. The day stays free for a later setup, like the Monday rule (new research
    option `skip_keys`).
- **Adopt test:** these must all hold in BOTH halves:
  - eval net $ up; 2-week passes not down; 2-week fails (exact and Monte Carlo) not up; LIT-size-rule $ not down;
  - >= 10 / 5 trades touched, >= 5 / 3 trades changed, no single trade carrying more than half of the gain;
  - the neighbouring strengths also up in both halves;
  - for targets: better than the same change on every day; for size: better than a flat multiplier of the same average
    size.

## 1. The daily-bias methods

"With" = the bias points the trade's way, "against" = the other way. Average R per trade at the LIT size (live LIT,
trades with / against):

| Bias | H1 with | H1 against | H2 with | H2 against | 2021-25 with | 2021-25 against |
|---|---:|---:|---:|---:|---:|---:|
| HTF draw: nearer untaken of PDH/PDL/PWH/PWL on the target side | 35 x +0.97R | 45 x +0.62R | 19 x +1.04R | 21 x +0.32R | +0.02R | +0.02R |
| Draw: nearer untaken PDH / PDL | 39 x +0.96R | 41 x +0.60R | 23 x +0.82R | 17 x +0.44R | +0.05R | -0.03R |
| Previous day closed in the trade's half of its range | 43 x +0.78R | 37 x +0.76R | 16 x +0.34R | 24 x +0.87R | +0.05R | -0.01R |
| Premium / discount of the previous day's range (long in discount = with) | 24 x +0.56R | 56 x +0.86R | 10 x +0.23R | 30 x +0.80R | -0.16R | +0.08R |
| Power of 3 / AMD (Asia low taken = bullish day) | 42 x +1.25R | 16 x +0.57R | 17 x +0.98R | 14 x +0.40R | -0.06R | +0.09R |
| ICT weekly profile (Wed-Fri) | 28 x +0.92R | 23 x +0.70R | 12 x +0.72R | 11 x +0.78R | -0.08R | +0.08R |
| Above / below the midnight open | 18 x +0.46R | 62 x +0.86R | 11 x +0.56R | 29 x +0.70R | +0.05R | +0.00R |
| Above / below the 18:00 open | 24 x +0.80R | 56 x +0.76R | 19 x +0.79R | 21 x +0.54R | +0.11R | -0.04R |
| Above / below the weekly open | 37 x +0.85R | 43 x +0.71R | 18 x +0.85R | 22 x +0.50R | +0.05R | -0.00R |
| Asia session closed the trade's way | 31 x +0.67R | 49 x +0.84R | 18 x +0.80R | 22 x +0.54R | +0.04R | +0.01R |
| Previous day's body >= 0.5 x 20-day range, the trade's way | 19 x +1.72R | 19 x +0.75R | 9 x -0.19R | 10 x +0.53R | +0.17R | -0.16R |
| Last daily FVG / IFVG points the trade's way | 42 x +0.79R | 37 x +0.80R | 19 x +0.66R | 21 x +0.65R | +0.11R | -0.05R |
| Last 4H break of structure the trade's way | 39 x +1.03R | 41 x +0.53R | 17 x +0.56R | 23 x +0.73R | +0.07R | -0.02R |
| Last daily break of structure the trade's way | 48 x +1.13R | 32 x +0.23R | 17 x +0.39R | 23 x +0.86R | +0.14R | -0.09R |
| NQ-ES daily SMT | 8 x +0.71R | 2 x +0.58R | 3 x -0.56R | 4 x +1.72R | -0.11R | +0.19R |
| Vote of five (draw, previous close, 4H structure, AMD, daily FVG), 2+ net | 27 x +0.91R | 18 x +0.30R | 9 x +1.05R | 12 x +0.43R | +0.09R | -0.07R |

The 08:30 / 09:30 opens and the NQ-ES SMT read at PDH/PDL apply to fewer than 12 trades a half. They are in
research/lit/bias.json ("flags").

**What the table says.** Only the HTF draw, Power of 3 and the 2-vote composite are better "with" than "against" in both
2026 halves. None of them is in 2021-25: there both sides are flat. The previous day's close, its displacement and daily
structure all flip between the halves.

**Verdict per use (live LIT; the combo is the same picture, see research/lit/bias.json):**
- **Size:** every bias method loses 2-week passes or money in a half. Example: Power of 3 with 1.25x / against 0.75x
  makes +$2.2k in H1, -$0.8k in H2, and 2-week passes fall 52.9 -> 45.4% and 50.7 -> 40.6%.
- **Filter:** 0 of 31. Skipping trades against the HTF draw leaves 1.6 / 1.5 trades a week.
- **Target:**
  - Banking early against the bias loses money in H1 every time (the 3-5R bank cuts the big winners).
  - A nearer target against the bias loses in H2.
  - A farther target WITH the bias is the only family that wins in both halves (section 3).

## 2. Discretion: the A+ checklist

Seven points a discretionary LIT trader looks for, all known at the setup:
1. the sweep took a major level (PDH/PDL, PWH/PWL, PMH/PML, an opening-gap edge);
2. strong displacement (biggest body >= 1.2 ATR);
3. 2+ inducement swings taken;
4. with the HTF bias (vote);
5. killzone (02:00-05:00 or 08:30-11:00 entry);
6. fresh trap (inducement swing <= 30 min old);
7. clear path (no opposing 1H FVG before the target).

Average R by score (LIT size, live LIT):

| Score | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| H1 | 7 x +0.88 | 8 x +0.59 | 16 x -0.08 | 29 x +0.20 | 15 x +2.36 | 5 x +2.19 |
| H2 | 1 x -1.02 | 7 x -0.82 | 13 x +0.77 | 10 x +1.56 | 6 x -0.50 | 2 x +4.51 |
| 2021-25 | 27 x -0.47 | 83 x +0.14 | 154 x +0.20 | 135 x +0.12 | 82 x -0.31 | 24 x -0.34 |

How each item does alone (R yes / no):
- **Fresh trap:** H1 +1.46 / -0.16, H2 +0.78 / +0.45.
- **2+ inducements:** H1 +0.97 / +0.22, H2 +1.15 / -0.01.
- **Strong displacement:** worse in both halves, H1 +0.47 / +0.96, H2 -0.01 / +0.98.
- **Major level:** too rare to read (7 trades in H1).
- **All items in 2021-25:** flat.

35 sizing rules on the score were tried: steps at scores 1-6, linear, leave-one-item-out. On the eval path none passes.
- "Score >= 5 at 1.5x" makes +$10.0k / +$0.6k but raises Jul-Oct 2-week fails 2.9 -> 4.3% and loses $6.7k in 2021-25.
- On the combo it loses $7.1k in H2.

## 3. The lead: a farther target when the bias agrees

The screen's only family that wins both halves is "with the bias: a farther target, no 8R bank". A follow-up (288 variants)
tried strengths x1.1-x1.4, a version that keeps the 8R bank, and AND / OR of the two best biases.

| Variant (live LIT) | Eval net H1 | Eval net H2 | PF H1 / H2 | DD H1 / H2 | 2-wk pass / fail H1 | 2-wk pass / fail H2 | LIT rule $ H1 / H2 | 2021-25 $ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Live LIT (reference) | +36,723 | +9,674 | 3.66 / 2.13 | -3,612 / -2,493 | 52.9 / 9.2 | 50.7 / 2.9 | +32,773 / +8,962 | +1,275 |
| Power of 3 -> x1.1 | +44,989 | +10,282 | | | 52.1 / 7.6 | 50.7 / 2.9 | +13,941 / +607 vs ref | -941 vs ref |
| Power of 3 -> x1.25 | +48,059 | +12,741 | 4.57 / 2.43 | -3,632 / -2,009 | 52.1 / 7.6 | 50.7 / 0.0 | +19,181 / +1,518 vs ref | -427 vs ref |
| Power of 3 -> x1.3 | +48,991 | +12,828 | | | 52.1 / 7.6 | 49.3 / 0.0 | +20,766 / +1,388 vs ref | +937 vs ref |
| Power of 3 OR draw -> x1.25 | +39,334 | +10,292 | 4.25 / 2.25 | -3,644 / -2,009 | 56.3 / 7.6 | 52.2 / 0.0 | +16,857 / +159 vs ref | -65 vs ref |
| Every day -> x1.25 (control) | +35,622 | +6,999 | 3.70 / 1.85 | -6,582 / -2,009 | 43.7 / 6.7 | 52.2 / 0.0 | +12,314 / -2,398 vs ref | +1,473 vs ref |

**Why the Power-of-3 version is the lead:**
- It makes more money in both halves at every strength from x1.1 to x1.4, on the eval path and at the LIT size.
- It beats the same change on every day by $12.4k / $5.7k.
- 2-week fails fall in both halves.
- On the combo it also wins both halves (+$17.2k / +$0.8k, 2-week pass 58.0 / 56.5 vs 58.0 / 52.2, fails 0.0 / 0.0 vs
  2.5 / 0.0).
- Random sets of the same number of trades (42 in H1, 17 in H2) given the same x1.25 target beat it in both halves only 3%
  of the time on the eval path. At the LIT size, 0% of the time in H1 and 5% in H2.

**Why it is not adopted:**
1. **The Jul-Oct gain is 4 trades.** No H2 trade reached 8R, so all of the H2 gain is the x1.25 target on 4 trades. In H1
   about half of the gain is three trades that ran past 8R.
2. **The pick was not clean.** The "farther target" family was found in the screen, where both halves were visible, and
   the strengths and the OR combination were tried after that. Jul-Oct is no longer a clean check for it. 31 biases were
   screened, so a 3% random-set p is about what the best of 31 would show by chance.
3. **On the combo its neighbours break.** Power of 3 x1.2 and x1.3 lose $3.1k and $2.6k on the eval path in Jul-Oct. They
   still gain at the LIT size there.
4. **2021-25 does not support it** (-$427 at x1.25, 5m entries only). LIT itself is flat there (PF 1.01).
5. **Two smaller points:**
   - It lowers the H1 2-week pass by one eval start (52.9 -> 52.1%).
   - "Power of 3 OR draw" passed the full strict test on live LIT, but loses $3.6k in H2 on the combo, and random sets do
     as well 14% of the time.

**Next step:** a forward paper check on Oct-Dec 2026 data. It is one switch, off by default, and is NOT for live trading.
The PC route was not tested with it.

## 4. Meta-labeling (a small model that sizes the trade)

- **Inputs:** 15 facts known at the setup: the vote, draw, previous close, 4H and daily structure, AMD, displacement,
  sweep depth, inducement count and age, stop size, target R, VIX, killzone, major level.
- **Label:** a winner (> 0.5R).
- **Models:** an L2 logistic regression and 60 boosted stumps.
- **Size rule:** 1.25x on the top third of the model's training predictions, 0.75x on the bottom third (also 1.5 / 0.5).
- **Training schemes:**
  - A: train on 2021-25, test 2026 H1 + H2.
  - B: train on 2021-25 + H1, test H2.
  - C: train on H1, test H2.
  - D: monthly walk-forward, each 2026 month trained on everything before it.
- **Honesty check:** the same with the training labels shuffled at random (200 times for the logistic model, 30 for the
  boosted one).

| Scheme | Model | Test AUC H1 / H2 | Eval net vs live H1 / H2 | 2-wk pass H1 / H2 (pts) | Shuffle p (H2 $) |
|---|---|---:|---:|---:|---:|
| A 2021-25 -> 2026 | logistic | 0.49 / 0.46 | -11,882 / -1,798 | -16.8 / -23.2 | 0.75 |
| A | boosted | 0.34 / 0.46 | -14,128 / -1,487 | -21.0 / -17.4 | 0.80 |
| B 2021-25 + H1 -> H2 | logistic | - / 0.47 | - / -1,823 | - / -8.7 | 0.81 |
| C H1 -> H2 | logistic | - / 0.62 | - / +2,285 | - / +0.0 | 0.20 (AUC p 0.05) |
| D monthly walk-forward | logistic | 0.52 / 0.48 | -10,342 / -16 | -8.4 / -23.2 | 0.47 |

**Verdict:** no skill.
- What wins in 2021-25 (5m LIT) does not carry into 2026.
- The only positive line (C) is trained and tested inside 2026, has one out-of-sample half, and its $ gain is what
  shuffled labels give 20% of the time.

## Switch (backtest only, off)

`live_model.json` "lit": `"bias_tgt": {"feat": "amd", "tgt_m": 1.25, "max_rr": null}`
- Other `feat` values: "draw_pd" and "or_dpd_amd".
- `engine/lit.py bias_with()` reads the bias at the trigger bar. It matches the research features on 8,091 of 8,091 reads.
- The engine option equals the research path trade for trade (630 / 630, both references; `python -X utf8 tools/lit_bias.py engine`).
- Off by default. `tests.test_lit_live` passes: day-end replay 120 / 120 identical; 10,041 intraday polls with 0
  differences, plus the 29 already known on Good Friday 2026-04-03 (the old engine shows the same 29); the paper bot
  routes 2 / 2 entries and exits.
- NOT recommended for the live eval.

## Files
- `tools/lit_bias.py`: features, look-ahead check, screen, follow-up, random-set control, A+, meta-labeling, engine check,
  tables, run storage. Results are in `research/lit/bias.json`, `bias_followup.json`, `bias_random.json`,
  `bias_aplus.json` and `bias_meta.json`.
- `engine/lit.py`: `bias_tgt` (wider target with the bias) and `skip_keys` (research filter), both default off, plus
  `bias_with()`.
- Runs: `lit_bias_*` (41 runs: the references, the best 3 of every group per reference and the leads).
