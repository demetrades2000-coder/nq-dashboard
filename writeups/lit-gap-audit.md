## For the owner (one minute)

- **What I did:** read every LIT study we have (36 write-ups, the report-2 list, 584 LIT runs) and listed every idea already
  tested (about 130). Then I searched the LIT / ICT / SMC material for ideas that were still missing. I found 22. I built the 10
  best ones into the bot's engine, switched off by default, and tested **96 versions**. Each one ran on today's LIT and on
  LIT + the three adopt-candidates (15-minute check + scale-in + breakeven + costs, "the combo"): 192 runs.
- **How it was judged:** pick on Jan-Jun 2026, check on Jul-Oct 2026. Money comes first, on the real MFFU 50K eval path (the
  live two-week sizing, $1.90 a micro). To count, an idea must make more money in **both** halves, not raise 2-week fails, hold
  at neighbouring settings and not rest on a few trades.
- **The answer: nothing new to switch on.** Every idea fails at least one of those tests.
- **Closest: take the profit at 12:00 ET if the trade is up +0.5R or more** (the 2026-10-18 "small candidate", now scored
  properly for the first time):
  - **More money at the LIT size in both halves:** live +$595 / +$463, combo +$1,656 / +$849.
  - **More 2-week passes:** live 52.9% → 55.5% (Jan-Jun) and 50.7% → 52.2% (Jul-Oct). Combo 58.0% → 58.8% and 52.2% → 56.5%.
    **Fails unchanged.**
  - **More money per eval:** an average eval makes +$84 / +$63 more in its first 2 weeks (combo +$71 / +$114).
  - **Neighbours hold:** every time from 11:30 to 12:00 at 0.25-1R helps.
  - **The catch:** it changes only 7 trades in 2026. On the back-to-back eval path (buy the next eval after a pass or a fail)
    it makes less money in Jan-Jun: live −$5.2k, combo −$10.7k. That comes from where evals restart, not from the trades. So
    it stays **"promising"**, not switched on.
  - If you want it later, it is one setting: `"tx": [{"at": 720, "lo": 0.5}]`. The PC route can't send it yet.
- **Today's numbers stay** (eval path, costs in):
  - **Live LIT:** Jan-Jun +$36,723 ($6,025/mo), Jul-Oct +$9,674 ($2,605/mo); 2-week pass/fail 52.9/9.2% and 50.7/2.9%.
  - **Combo:** Jan-Jun +$53,116 ($8,714/mo), Jul-Oct +$17,262 ($4,647/mo); 2-week 58.0/2.5% and 52.2/0.0%.
  - Trades stay at 3.1 / 2.6 a week.

## 1. The gap table: every LIT idea already tested

Status: **R** rejected, **A** adopted (live), **C** adopt-candidate (not live), **P** promising / watch, **N** neutral or not
testable. Write-ups are in `research/writeups/` (prefix `lit-` left out).

| Area | Ideas tested (verdict) | Where |
|---|---|---|
| Core build | raw LIT components (R), best component set (R vs old bot), textbook LIT (R), LIT final merge of entry/sessions/risk/filters (A) | strategy, final, `research/lit/{entry,sessions,risk,filters}.md` |
| Sizing for the eval | fast-eval $800/40 pts (C), 60% room cap (A in eval modes), flat $, risk ladders, ICT halving, cushion-then-press, room sizing, grade sizing, smaller until the week's winner (all R), two_week "one winner passes" (A), clock press, profit protection, start timing (R) | experiments, two-week-eval, tight-stops-size |
| Loss rules | weekly stop (A), Monday rule (A), 1.5x after a winner (P), inducement age 12 (R), half above 60 pts (N), ~100 loss filters: exhaustion, second sweep, first setup only, 05-08 skip, day-of-week, CPI/FOMC weeks, news days, after-loss cuts, ES SMT skip/size, premium/discount vs 18:00 / midnight open, displacement caps, climax / V-turn, 4H candle, 1H/4H EMA, HTF draw, VIX fell, min room 3-5R (R) | losses |
| Masters' filters | engineered liquidity, time confluence / key times, day after an outside day, two lines, 3-4 legs, bank holidays, Reim Asia box (R) | losses, `research/lit/masters.md` |
| Timeframes | 5m→3m/5m, 15m setups, top-down 4H/1H draw and bias, ATR / VIX adaptive timeframe (R) | losses |
| Sessions | NY second session (3 ways), all hours / Asia, 2 a day, 1 per session, re-arm after target / BE, F-BoS at 18:00 (P), trendline liquidity, London box in Berlin time (N), Asia→London / London→NY carryover (R) | experiments, all-hours, adv-continuation, report-coverage |
| Entry | 43 entry rules (direct limit, BOS / close / CISD-window confirmations, refined limits at CISD close / body 50% / 1m CISD / 1m FVG, 5m leg 50%, inducement / swept-level zones), two-stage entry, buy-stop beyond the CISD candle, chase a missed limit, ES SMT trigger / size / filter (R), opening model 09:30-10:00 (C, thin), refined 1m retest limits (R) | entry-precision, experiments, untested-entries, tight-stops-size |
| 1m management | 1m entry filters (inner inducement, displacement, volume, absorption, patience, pullback), "trade is wrong" exits (1m CISD against, new low, back inside level, HL taken, volume surge), human profit management (R), ES-confirms-against exit (C, 8 trades), 15-minute check t_check (C) | 1m-management, loss-learning |
| Stops | sweep + 2 pts / 4 ticks / 0.1-0.25 ATR, protected 1m swing, post-sweep HL, pool / inducement stop, stop caps 15-40, close-based stop + emergency, stop behind the next liquidity, volatility buffer (R) | experiments, tight-stops-size, untested-stops, report-coverage |
| Breakeven | BE on 1m / 5m structure, no BE, BE 1.5R / 2R, time-in-profit BE, BE after N minutes, BE on a close, BE vs mitigation / zone 50% / 1m gap, profit locks (R or N), BE at entry + 1.25 pts be_off (C) | experiments, untested-stops, adv-management |
| Targets | 15 draws (weekly, monthly, PD/PW/PM, NWOG/NDOG, Asia + London extremes, build-ups, nearer-of combos), VXN band, bank 6/10R / none, band x0.8-1.2, front-run the band, 1H/4H FVG or OB targets, reverse-inducement exits, daily profit stop, next-pool continuation, targets by entry location / day range / deadline, target before fill (R), midday profit take 11:30-12:00 (C, 7 trades) | experiments, untested-targets, adv-management, adv-continuation |
| Partials | half at first pool / PD-PW-PM, 20-50% at internal swing pool, 50% at 2R/3R or at the box's other side, trail after 3R, partials at the first obstacle (R) | experiments, losses, adv-management |
| Time exits | flat 11:00 / 12:00 / 13:30, no-progress exits at 60 / 120 / 240 min, close before high-impact news, 08:30 news profit take, London close 11:00 (R) | report-coverage, untested-targets |
| Report rules | final sweep 2+/3+ levels, tiers, premium/discount (PD, PW, Asia), round numbers, equal-level tolerance, mean threshold, reclaim, deadline, acceptance, displacement quality, 2+ inducements, inducement room, double-sided sweep, first obstacle, failed reversal, costs inside the $800, report ch.21 model (R) | report-tests, report-coverage |
| Report 2 | 176 continuation / session / Smart Money Trap / inducement-speed variants (R; "huge-bar sweep" P), 9 boundary selectors, carryover vs reset, audit (clocks, bar edges -$500), NQ/ES divergence (R) | adv-continuation, adv-audit-smt, `research/lit/report2_inventory.md` |
| HTF context | 75 confluences (draw, dealing ranges, PO3, bias, structure, HTF FVGs, time of week), 86,000 combinations (R), 4H-draw size tilt (C, low confidence) | htf-confluences |
| Order blocks | 84 variants: OB as POI / entry / target / obstacle, HTF OB setups, mitigation notes, breakers (R; opposing-OB skip P) | order-blocks |
| New entry types | MSNR levels, QM, SnR flips, IDM into OB, stacked confluence, 15m/30m/1h setups, ES as a 2nd market, missed-fill re-arms, looser filters, 2nd trade for major sweeps (R), inducement-count size idm_size (C at LIT size, R on the eval path) | new-entries, more-setups |
| Selection | A/B/C grade, wait for a better setup, walk-forward model (R), fresh-trap size tilt (C, low confidence), learning loop (observe only) | trade-selection, learning-loop |
| Bias / regime | VIX regime size (N), target-aware eval size, weekly profile, Asia range gate, OPEX / month-end / quarter-end (R), trend-day mode, volatility sizing, news-release setups (R / N) | untested-bias, big-ideas |
| Market context | 2,520 variants: GEX / DIX, vanna proxies, VIX term structure, VVIX / SKEW, 0DTE move, options calendar (R) | market-context |
| Money | scale-in after BE (C), 2nd add, minis, 15m eval booster, profit lock, London/NY tilt, funded compounding (R), payout policy (C) | big-ideas, money-batch2 |
| Discovery (no write-up until now) | failed-zone flip, deeper-zone continuation, ETM early recross, multi-inducement continuation, 2nd trade after a target, Asia-only Mondays, London-only on low VIX, walk-forward retune (all R; flip re-tested below) | `research/lit/t_discovery_results.json` |
| Execution | realistic fills, latency, timing fix, route tests (info) | live-fills, launch-audit |

**Counts:** about 130 distinct ideas in 40 study families, roughly 4,500 variants with the context and HTF grids. Adopted live:
the LIT final rules, the Monday rule, the weekly stop and the two_week eval sizing. Not live yet (adopt-candidates): t_check,
scale_in, be_off, fast-eval / room cap options, funded sizing, the opening model, the ES exit, the midday profit take, the
4H-draw and fresh-trap tilts, idm_size (LIT size only), the payout policy.

## 2. Ideas still untested (from the LIT / ICT / SMC literature)

| # | Idea | Source idea | Tested here? |
|---|---|---|---|
| 1 | Killzone-specific settings (London vs NY own depth / displacement / target) | ICT killzones; LIT session traps | yes (27 variants) |
| 2 | ATR-regime stop limits (stop as a multiple of ATR, not points) | volatility-normalised risk | yes (8) |
| 3 | Maximum sweep depth (too deep = breakout) | SMC "a sweep is a wick, not a run" | yes (5) |
| 4 | Asia range / CBDR standard-deviation targets | ICT SD projections (whole and half multiples of the range) | yes, Asia box (15); CBDR not testable cleanly: 14:00-20:00 straddles the 17:00 halt and two trading days |
| 5 | Monday range and N-day highs/lows as liquidity (turtle soup) | ICT weekly profiles, Raschke / ICT turtle soup | yes (6) |
| 6 | Time exits: London trade out by the NY open / 10:00 / 11:00 if not at breakeven; midday profit take on the eval path | ICT "London closes by NY", lunch | yes (18) |
| 7 | Re-entry after a breakeven scratch, same side | prop-trader re-entry | yes (4) |
| 8 | Entry on the 2nd 1m CISD | "second confirmation" | yes (2) |
| 9 | Judas swing at 09:30: the opening model on the real eval path and on the combo | ICT Judas swing / opening range | yes (6) |
| 10 | Failed-zone flip (Smart Money Trap: zone reacts, then fails) | LIT report 5.15-5.16 | yes (5) |
| 11 | Inside-day / outside-day context (inside day untested; outside day tested) | IET | no: bias / context, covered by the bias agent |
| 12 | First presented FVG at 09:30 (FPFVG) | ICT 2023 | no: only ~10 LIT trades a year after 09:30 |
| 13 | Silver Bullet 10-11 / 14-15 windows | ICT | no: tested as a published model (old engine, rejected); LIT has few NY trades |
| 14 | Rejection block / unicorn entries | ICT | no: report leaves them undefined; refined-entry family already lost |
| 15 | Liquidity void / volume imbalance targets | ICT | no: the FVG / OB target family lost in both halves |
| 16 | Previous-day close / settlement as a magnet | futures practice | no |
| 17 | SMT with YM / RTY | ICT SMT | no data (ES only), ES SMT already rejected |
| 18 | Earnings-day (big-tech) handling | NQ practice | no earnings calendar in data/news |
| 19 | 90-minute cycles / quarterly theory | Daye | no: key-time confluence (D6) already lost |
| 20 | Opening range 09:30-09:45 sweeps | ORB literature | partly: the 09:30-10:00 box is already a LIT level; idea 9 covers the sweep |
| 21 | Session-based inside / outside bars (Asia inside London) | PO3 | no: HTF PO3 family lost |
| 22 | Daily bias from the prior close position | many | no: bias agent |

## 3. Results (2026, costs in; Δ vs the base; "eval" = back-to-back eval path, "per eval" = average $ a fresh eval makes in 10 sessions)

Bases: **live** = eval H1 +$36,723 / H2 +$9,674, LIT size +$32,773 / +$8,962, 2-wk 52.9/9.2 and 50.7/2.9.
**combo** = eval H1 +$53,116 / H2 +$17,262, LIT size +$44,507 / +$15,192, 2-wk 58.0/2.5 and 52.2/0.0.

Best version of each idea (picked on H1), roughly ranked by money added in both halves:

| # | Idea, best version | Base | Eval Δ H1 / H2 | LIT size Δ H1 / H2 | Per-eval Δ H1 / H2 | 2-wk pass/fail H1, H2 | Trades changed | Verdict |
|---|---|---|---:|---:|---:|---|---:|---|
| 1 | **Midday profit take: out at 12:00 if ≥ +0.5R** | live | −5,159 / +1,018 | **+595 / +463** | +84 / +63 | 55.5/9.2, 52.2/2.9 | 8 / 6 | **promising** (b2b $ H1 down) |
| | | combo | −10,655 / −3,855 | **+1,656 / +849** | +71 / +114 | 58.8/2.5, 56.5/0.0 | 6 / 6 | |
| 2 | Opening model, overnight range, depth 0.25, by 10:00 | live | +176 / +3,596 | +1,152 / +654 | −43 / +359 | 49.6/9.2, 62.3/**8.7** | 6 / 8 | rejected: H2 2-wk fails 2.9 → 8.7, H1 2-wk pass down |
| | | combo | −5,749 / +7,088 | −119 / +1,536 | −127 / +350 | 56.3/2.5, 63.8/**5.8** | 6 / 8 | |
| 3 | Asia SD target: farther of the band and the Asia high/low ± 1.5 ranges | live | +65 / +137 | +429 / +180 | +33 / +61 | 53.8/7.6, 50.7/0.0 | 4 / 5 | rejected: passes on live only; 1.0 and 2.0 fail H2; combo eval H1 −8.1k |
| | | combo | −8,149 / +5,391 | +907 / +67 | +117 / +113 | 58.8/2.5, 55.1/0.0 | 4 / 5 | |
| 4 | London-only depth 0.75 ATR (killzone) | live | +2,822 / +2,885 | +876 / +13 | +12 / +9 | 52.9/6.7, 50.7/0.0 | 8 / **1** | rejected: H2 is one trade; 0.8 loses $1.4k in H2 |
| | | combo | −1,421 / +63 | +837 / +400 | +43 / +164 | 58.0/2.5, 53.6/0.0 | 8 / 1 | |
| 5 | London trades all out at 11:00 | combo | 0 / +882 | 0 / +441 | 0 / −2 | 58.0/2.5, 53.6/0.0 | 0 / 2 | rejected: 2 trades |
| 6 | Re-entry after a BE scratch, same side | combo | −10,872 / +6,145 | −556 / +392 | −61 / +60 | 58.0/2.5, 52.2/0.0 | 4 / 1 | rejected: H1 loses |
| 7 | Max sweep depth 4 ATR | live | −5,290 / +2,138 | +1,782 / +1,804 | −53 / +702 | 50.4/5.9, 65.2/**4.3** | 25 / 10 | rejected: combo H2 −3.5k, fails up; 2-2.5 ATR halves fails but costs $7-27k |
| 8 | Failed-zone flip (ref / ext, react 0.5-1.5) | live | −14,518 / −1,741 | −2,009 / +1,169 | −249 / −99 | 52.9/**13.4**, 49.3/**8.7** | 6 / 5 | rejected: 7 new trades, 1 winner; fails up |
| 9 | Killzone NY variants (disp 0.6-1.2, depth, vix_k, min_rr 2.5, bank 5R) | both | mixed | best +426 / +127 | | | 1-11 | rejected: 0-2 NY trades change per half; disp 0.6 raises fails |
| 10 | ATR stop limits (max 3-8 ATR, min 1-2 ATR) | both | −2.6k to −44k | all down | | | 0-47 | rejected: max 5-8 changes nothing, tighter / min limits cut winners |
| 11 | Asia SD target replace / nearer (k 1-4, Asia 18:00 or 20:00 box) | both | mostly down | H1 or H2 down | | | 9-30 | rejected: the band is better; the deviation projection helps 2021-25 only (+$4-14k) |
| 12 | Monday high/low, 10/20-day highs/lows as liquidity | both | 0 / 0 | 0 / 0 | | | 0 / 0 | rejected: those levels are always swept together with PDH/PDL/PWH/PML, so no new trade; as targets they lose (−$0.8-1.2k H1) |
| 13 | London out at 09:30 / 10:00 / 11:00 if not at BE or below 0R | both | ≈0 | ≈0 | | | 0-2 | rejected: by then those trades are already stopped |
| 14 | 2nd 1m CISD entry | both | −27k to −34k / −9k to −14k | −11k to −16k / −8k to −9k | | | 126-135 | rejected: later and worse fills, misses the winners (as every slower entry before) |

What the midday take changes (live, 2026): 2026-03-17 short +0.86R (was BE), 03-20 long +0.83R (BE), 03-27 short +4.31R (target
+6.14R), 05-01 long +7.28R (15:55 exit +5.88R), 09-07 short +0.74R (15:55 +0.37R), 09-18 short +3.93R (BE), 10-07 long +1.43R
(15:55 +2.24R). Five better, two worse. On the back-to-back path the combo has 8 passes and 1 fail in H1 instead of 10 and 2
(the evals restart on other days), so the path $ falls although the trades are better: that is why it stays promising, not a
candidate.

2021-25 reference (5m only, LIT size): midday take +$2.1k / +$2.3k (live / combo), opening model −$0.0k / −$0.7k, Asia SD
targets +$1k to +$14k, max depth 2-2.5 ATR +$10-14k, failed-zone flip −$5k to −$20k.

## 4. What changes

- **Nothing in `live_model.json`.** No idea passes every gate.
- **Engine options added (all default off; `tests.test_lit_live` stays 120/120 identical):** `kz`, `stop_atr`, `depth_max`,
  `sd_tgt`, `tx`, `re_be`, `cisd_nth`, `Market(extra_levels=...)`, and market-entry / pre-filtered candidates (`mkt`, `pre_ok`)
  for the opening model and the failed-zone flip. The live loop does not route `tx` exits or these candidates (backtest only).
- **If the owner wants the midday take later:** `"tx": [{"at": 720, "lo": 0.5}]` in `live_model.json` "lit", after a PC-route
  test (a market exit at 12:00 ET). Watch the 7-trades-a-year sample first.

## Files and how to rerun

- `tools/lit_gaps.py check`: options off == run `lit_live` (630 trades) and the eval scores == `research/lit/adopt_combo.json`
  (live and combo).
- `tools/lit_gaps.py grid [family ...]`: the 96 variants x 2 bases → `research/lit/gaps_results.json` (~10 min, 1 process).
- `tools/lit_gaps.py save`: runs `lit_gap_<family>_<live|combo>` (the H1 pick of each family).
- The opening-model and failed-zone candidates reproduce `tools/lit_t_entries.erun` (132/132 trades) and
  `tools/lit_t_discovery.drun` (125/125) trade for trade before they go through the engine.
- Sources for the literature list: TradingView LIT / inducement / CISD notes, LuxAlgo's ICT session-range and
  standard-deviation-projection notes (secondary, practitioner material; no published LIT backtest).
