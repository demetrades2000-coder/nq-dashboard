## In one minute (owner summary)

- **Question:** do 13 "quality" ideas (ICT macro times, volume, a delta proxy, how the sweep candle rejects, how fast the
  displacement comes, how old / how often tested the swept level is, equal highs/lows, round numbers, which level was swept,
  sweeps on back-to-back days, level x session) make LIT more money or pass evals faster?
- **Answer: no. Nothing to switch on.** About 1,800 variants, two references (live LIT and live LIT + the three
  adopt-candidates), all on the real eval path. None passed the adoption test.
- **Closest calls (not adopted):**
  - **ICT macro time, 1.5x size** when the fill is within 10 min of a macro window (mostly 02:33-03:00 ET): live LIT
    **+$7,114 H1 / +$2,341 H2**, 2-week pass +4.2 / +0.0 pts, 2-week fails unchanged. But on top of the combo it **loses
    -$8,755 in H1**, it loses -$4,696 in 2021-25 (LIT size rule), and the Monte Carlo fail rate goes up 0.9 pts. Not robust.
  - **Round numbers, 1.5x size** when the swept level sits within ~8 pts of a 00/50 handle: under the LIT size rule it adds
    **+$9,977 / +$2,449 / +$8,246** (H1 / H2 / 2021-25) and beats a flat 1.18x size by $2-9k in every period. On the eval
    path it **loses -$6,678 in H1**: the two-week sizing already sizes for "one winner passes", so bigger trades only add
    fails. Kept as a note for a future funded sizing, not for the eval.
- **Learned:** equal highs/lows are already in LIT (the build-up levels). Taking them out costs **-$14,395 in H1**; looser or
  stricter versions also lose. The volume, delta, rejection and speed ideas flip between the halves or between the two
  references, and every filter costs money and most push trades below 2.5/week.
- **Money stays:** live LIT on the eval path H1 **+$36,723 ($6,025/mo)**, H2 **+$9,674 ($2,605/mo)**, 2-week pass/fail
  52.9/9.2 and 50.7/2.9. Quote the H2 rate.

## Ranked results (by $ added on the eval path, live LIT; the best variant of each idea)

Eval path = live two_week sizing, costs in. "Net +H1 / +H2" = change vs live LIT. 2-week = pass / fail change in points
(fresh MFFU 50K eval started on every session). MC = 2,000-path Monte Carlo 2-week fail change. "Combo" = the same idea's
best variant on top of t_check + scale_in + be_off. 2021-25 = LIT size rule change (reference only, no 1m bars there).

| # | Idea | Best variant (live LIT) | Net H1 / H2 | 2-week pass / fail H1, H2 | MC fail H1 / H2 | 2021-25 | Trades touched | On the combo (best) | Verdict |
|---:|---|---|---:|---|---|---:|---|---|---|
| 1 | ICT macro windows | fill within 10 min of a macro x1.5 | **+7,114 / +2,341** | +4.2/+0.0, +0.0/+0.0 | +0.9 / +0.0 | -4,696 | 27 / 17 | same tilt -8,755 / +1,154; best: extreme bar in a macro x1.5 +2,312 / +1,197 | rejected: flips on the combo, loses in 2021-25, MC fails up |
| 10 | Round numbers | level within 9.7 pts of a 00 handle x1.5 | +2,398 / +1,479 | +0.0/+0.0, +0.0/+0.0 | +1.1 / +0.0 | +3,606 | 16 / 6 | -4,871 / +579 | rejected on the eval; promising for funded sizing (see below) |
| 4 | Bar-delta proxy | delta at the sweep (3 bars) >= q0.2: x1.25 / else x0.75 | +2,148 / +3,706 | +5.1/-1.6, **-13.0**/+0.0 | -0.8 / -2.3 | +1,846 | 80 / 40 | +301 / -180 | rejected: H2 2-week pass -13 pts |
| 11 | Level type | a PWH/PWL was swept x1.5 | +1,606 / +1,093 | 0 / 0 | 0 / 0 | -1,053 | **2 / 1** | 1 class swept x1.5: +1,404 / +1,213 (fail +2.5) | rejected: 3 trades |
| 8 | Level touches | fewer than 3.5 near-tests (0.2 ATR) x1.5 | +868 / +1,351 | -0.8/+0.0, -1.4/+0.0 | +0.8 / +0.2 | -1,606 | 40 / 22 | +385 / +1,035 (fail +2.5) | rejected: pass down, fails up |
| 5 | Sweep rejection | extreme bar closed back inside the level x0.5 | +529 / +437 | 0/-3.3, 0/0 | -1.2 / -0.6 | -1,827 | **5 / 1** | close location >= 0.57 x1.5: +810 / +473 (fail +1.7) | rejected: 6 trades |
| 6 | Displacement speed | 6+ bars extreme to CISD x1.5 | +110 / -73 | +5.9/0, 0/+1.4 | +0.3 / +0.1 | -3,614 | 27 / 10 | 7+ bars x0.75 else x1.25: -1,336 / +8,063 | rejected: flips |
| 13 | Level type x session | H1-fitted cell weights 1.5 / 1.0 | +1,527 / -196 | 0 / 0 | +0.3 / 0 | -1,279 | 8 / 5 | +311 / 0 | rejected: H1 fit does not carry |
| 7 | Level age | level younger than 2 h x1.5 | +1,200 / -180 | -0.8/+0.9, -1.4/0 | +1.1 / 0 | +2,170 | 15 / 8 | +2,201 / +491 (fail +3.4) | rejected |
| 9 | Equal highs / lows | extra levels: build-up lookback 12 h | -18 / +0 | 0/-2.5, 0/0 | -2.0 / 0 | -3,877 | 1 / 0 | tol 0.10 ATR: -3,601 / -874 | rejected: today's build-ups are right |
| 3 | Displacement volume | displacement bar rel. volume < 1.38 x1.5 | -204 / -364 | -2.5/+0.9, -1.4/+5.8 | +1.7 / +3.8 | +5,235 | 53 / 30 | < 0.79 x1.5: +1,589 / +389 (pass -5.8, fail +4.3) | rejected |
| 2 | Rel. volume at the sweep | sweep bars rel. volume < 1.35 x1.5 | -305 / -364 | +1.7/0, -1.4/+5.8 | +1.3 / +3.8 | +7,751 | 53 / 29 | >= 1.35 x0.75 else x1.25: +1,694 / +5,118 (H1 pass -10.9) | rejected |
| 12 | Consecutive-day sweeps | filter: yesterday swept the same-name level | -2,554 / -600 | +0.9/-0.8, 0/0 | -0.8 / -1.3 | +1,329 | 6 / 3 | x1.5: -4,022 / -3,899 | rejected |

**Counts.** Live LIT: 910 variants (778 size tilts, 32 fitted weights, 92 filters, 8 level sets); 23 made more money in both
halves (2.5%, about chance for this many tries), 0 passed the strict test. Combo: 908 variants, 18 up in both halves, 0 strict.
Filters: 0 of 92 made money in both halves on either reference.

## The two closest calls in more detail

**1. ICT macro windows (size up at macro times).**
- Windows (ET): 02:33-03:00, 04:03-04:30, 08:50-09:10, 09:50-10:10, 10:50-11:10, 11:50-12:10, 13:10-13:40, 15:15-15:45.
  Tested on the sweep bar, the sweep extreme, the 5m CISD close and the 1m fill, exact and +/- 10 min.
- Only the **fill time** carries money, and only the **02:33 London macro** really: within 10 min of it alone +$4,869 /
  +$2,646; NY macros alone +$430 / -$196.
- Pad 0 / 5 / 10 / 15 min: +$2,876 / +$477, +$5,184 / +$477, +$7,114 / +$2,341, +$11,207 / +$1,328 (all up in both halves).
- **Placebo** (same windows shifted by -40 ... +40 min): all lose in H1 (-$2.0k to -$6.0k). So it is the time, not "any
  morning time".
- Flagged trades: H1 27 at +0.97R avg vs +0.67R for the rest; H2 17 at +1.65R vs -0.07R. Not one trade: dropping the best
  flagged trade of each half still leaves +$5,202 / +$1,724.
- Shuffle test (feature rows permuted within each half, the whole macro family of 28 variants re-run each time): in 31
  shuffles the best shuffled variant never reached the real one's smaller half gain of +$2,341 (median best: about +$300).
  So on live LIT it is probably not luck. It still fails on the combo and in 2021-25 (below).
- **Why not adopted:** on top of the combo the same tilt makes **-$8,755 in H1** (the combo already re-shapes those
  London trades: t_check cuts, scale-in adds; the eval path is path-dependent and a bigger early loss changes the next
  evals); 2021-25 (5m fills, reference) -$4,696; Monte Carlo 2-week fails +0.9 pts in H1. Three strikes.

**2. Round numbers (for funded sizing only).**
- Feature: distance from the swept level to the nearest 50-point handle, on the **real contract price** (the 5m file is
  back-adjusted; un-adjusted with `data/NQ_rolls.json`; roll uncertainty is about 4 pts, 9 pts at the June 2026 roll).
- LIT size rule ($800 up to a 20-pt stop, weekly stop), 1.5x when the level is within d pts of a 00/50 handle:

| within | trades H1 / H2 | H1 | H2 | 2021-25 | flat leverage with the same mean size (H1 / H2 / 2021-25) |
|---:|---|---:|---:|---:|---|
| 8.3 pts | 27 / 15 | +9,977 | +2,449 | +8,246 | +3,790 / +287 / -348 |
| 11.5 pts | 40 / 19 | +9,359 | +2,550 | +7,803 | +5,130 / +1,093 / -774 |
| 16 pts | 52 / 26 | +13,975 | +3,110 | +11,263 | +8,509 / +1,320 / -612 |
| 9.7 pts of a 00 handle | 16 / 6 | +3,787 | +2,763 | +3,606 | +1,791 / +231 / -381 |

- Run `lit_b3a_10_rn50_8pt_x1_5_litrule` (LIT size rule, costs in): H1 PF 5.03, +$42,750, DD -$2,428 (live LIT: PF 4.44,
  +$32,773, DD -$2,315); H2 PF 2.73, +$11,411 (~$3,075/mo), DD -$1,620 (live: PF 2.46, +$8,962, DD -$1,466); 2021-25 PF
  1.08, +$9,521, DD -$21,127 (live: PF 1.01, +$1,275, DD -$20,462). Trades/week unchanged (3.12 / 2.56).
- On the combo the 8.3-pt version adds +$14,751 / +$3,806 / +$8,931. A shuffle of the feature (within H1, H2 and 2021-25)
  never reached all three gains in 300 tries (p < 0.01). Drawdown rises a little (H1 -$2,428 vs -$2,315).
- **On the eval path it loses** (-$6,678 H1 / +$951 H2; on the combo +$1,564 / -$3,602, fails +1.7). The live eval
  sizing (two_week: micros so one winner covers the rest of the $3,000 target, capped at 60% of the room and the $1,000
  soft daily loss) has no headroom: a 1.5x trade is mostly capped, and where it is not it adds fails.
- **Status:** not for the eval. A candidate tilt for the `funded` sizing mode once funded_state is wired
  (`lit-funded-sizing.md`); it would need its own funded-path test first.

## What else the data said (plain)

- **Volume (ideas 2, 3):** heavy volume at the sweep or on the displacement means nothing stable. H1 says light volume pays,
  H2 says heavy volume pays; 2021-25 is flat.
- **Delta proxy (4):** buying into a long's sweep bar (absorption) was **worse** in both 2026 halves (+0.23R vs +1.31R, +0.45R
  vs +1.01R), better in 2021-25. Sizing on it cut 2-week passes by 13 pts in H2.
- **Rejection (5):** a long sweep wick vs the body was **worse** in both 2026 halves (+0.20R vs +1.34R; +0.35R vs +1.00R),
  flat in 2021-25. A cut on long-wick sweeps still lost money: the cut also shrinks the big winners the eval needs.
  Only 6 of 120 trades close back inside the swept level on the extreme bar.
- **Speed (6):** fast (1-3 bars) or slow (6+) displacement: flips between the halves.
- **Level age / touches (7, 8):** older and more-tested levels did a bit worse in both 2026 halves (avg R), not in
  2021-25; every size tilt on it raised fails.
- **Equal highs/lows (9):** 90 of 120 trades sweep a build-up (equal highs/lows) too. Those trades average less R than
  sweeps without one (+0.54R vs +1.50R H1, +0.25R vs +1.74R H2) but are still profitable, and the build-up levels create
  setups: with no build-up levels, 23 + 14 trades disappear and H1 loses $14,395. Wider tolerance (0.25 / 0.35 ATR),
  narrower (0.10), a 6-bar gap, 12 h or 2-day lookback: none better in both halves.
- **Level type (11, 13):** 84% of trades sweep a session box or build-up; PDH/PDL, PWH/PWL, PMH/PML and gaps are swept on
  only 10 of 120 trades in 2026, too few to size. Weights fitted on H1 cells (level group x London / early / NY) do not
  carry into H2.
- **Consecutive days (12):** 94% of trades come the day after a same-direction setup, so it cannot separate anything;
  filters on it cost money.

## Method

- Tool: `tools/lit_batch3a.py` (screen) -> `research/lit/batch3a.json`; `python -X utf8 tools/lit_batch3a.py store`
  stores the best variant of every idea on both references as runs `lit_b3a_*` / `lit_b3a_all3_*` (back-to-back eval path
  trades per half).
- Engine: `engine/lit.py` run_x on `live_model.json` lit (the live loop's code), unchanged; filters and extra levels re-run
  the engine on a filtered / re-built candidate list (a skipped setup frees the day, as a setup_ok filter would).
- Features use only bars up to the 5m CISD close (the moment the limit is placed); the macro-fill flag uses the fill
  minute, known when the order is sized. Relative volume = the bar's volume / the same 5m slot's average over the prior 20
  sessions. Delta proxy = sum over the 1m bars of volume x ((close - low) - (high - close)) / (high - low) (true 1m bars on
  every 2026 trade; 5m bars otherwise). Level age = time since the bar that printed the level; touches = approaches within
  max(2 pts, 0.1 / 0.2 ATR) before the sweep.
- Scoring: `tools/lit_context.py` (size multiplier on the eval path: a cut is int(q x m) min 1, an up-size is capped by the
  live caps) and its strict test: eval net up in H1 and H2, 2-week pass not down, 2-week fail and Monte Carlo fail not up,
  LIT-rule net not down, >= 10 / 5 trades touched, neighbouring thresholds hold, beats a flat multiplier of the same mean
  size; filters also need 2026 >= 2.5 trades/week.
- Not covered here (other agents): bias / meta-labelling, money management, the gap audit (opposite-session targets, time
  exits, re-entry, 2nd CISD, FVG/OTE, killzones, ATR stop caps, judas, turtle soup, opening range, CBDR/Asia SD, inside /
  outside days, Monday range, holidays). Earlier overlap: `lit-htf-confluences.md` (lt_major, lt_box, lt_bu_only, lt_vec:
  all "flips"), consistent with this study.
- **Paper only.** Nothing touches `live_model.json`, `engine/lit_live.py`, the PC route or the dashboards.
