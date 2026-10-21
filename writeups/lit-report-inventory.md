Status codes: **IN BOT** / **IN BOT (partly)**; **TESTED-REJECTED** (`lit_rep_*` = first pass, `lit_rep2_NN` = second pass run NN,
other names = earlier study files); **TESTED (evidence)** / **TESTED (neutral)**; **MISSING**; **n/a** = context.
Categories: def, rule, risk, exec, clock, gloss, ex, evid. Short names: `lit.py` = `engine/lit.py`, `P.x` = `live_model.json` "lit"
parameter, `live` = `engine/lit_live.py`, `nt` = `engine/ninjatrader.py`; studies in `research/lit/` (`risk.md`, `entry.md`,
`filters.md`, `masters.md`); write-ups in `research/writeups/` (`lit-losses`, `lit-experiments`).

Source: `word/document.xml`, 28 tables, 193 headings, 2 page-number footers, no footnotes. Figures: (1) range map: external
high/low, internal swing, premarked POI, midpoint; (2) bullish/bearish FVG intervals; (3) bullish reversal: excursion, reclaim,
break + displacement, return to the zone, structural stop, objective; (4) bearish mirror of 3; (5) journal balances; (6) two ZenG
M5 cases with 2R/3R/4R lines; (7) ZenG demo P&L; (8) payoff arithmetic: 10R vs half at 3R vs 80% at 3R.

| ID | Ch | Item | Cat | Status |
|---|---|---|---|---|
| 0.1 | intro | Sweep alone ≠ trade; entry/invalidation/exit must be observable | evid | IN BOT (sweep is step 1 of `lit.candidates`) |
| 0.2 | intro | Facts / teaching / interpretation / research rules separated | evid | n/a |
| 0.3 | intro | No validated NQ/MNQ LIT profitability in sources | evid | n/a |
| 1.1 | 1 | LIT = hypotheses; edge = defined, tested strategy incl. costs | evid | IN BOT (frozen params, $1.40 + 1 tick) |
| 1.2 | 1 | Liquidity → inducement → response → return → preselected objective | def | IN BOT |
| 1.3 | 1 | Failed-reversal continuation vs failed-breakout reversal: keep apart | def | IN BOT; continuation TESTED-REJECTED (`lit_rep_continuation_*`) |
| 1.4 | 1 | Location ≠ signal | def | IN BOT |
| 1.5 | 1 | Public episodes precede private material | evid | n/a |
| 1.6 | 1 | Three evidence types | evid | n/a |
| 1.7 | 1 | Only what is observable before the outcome | def | IN BOT (`tests/test_lit_live.py` 120/120) |
| 2.1 | 2 | Market liquidity: spread, depth, impact | def | n/a |
| 2.2 | 2 | Buyer and seller in every trade | def | n/a |
| 2.3 | 2 | Chart liquidity = inferred | def | IN BOT (`Market.levels`) |
| 2.4 | T1 | Stops above highs buy / below lows sell; breakout stops; limits | def | n/a |
| 2.5 | 2 | Stop-limit may not fill; CME stop-with-protection range | exec | IN BOT (partly) (`nt` STOPMARKET; protection range not modelled) |
| 2.6 | 2 | No public data for stop entry/cancel | evid | n/a |
| 2.7 | 2 | Osler round-number clustering, cascades | evid | n/a |
| 2.8 | 2 | Stops can carry a breakout; don't fade on "liquidity taken" | rule | IN BOT |
| 2.9 | 2 | Cont et al. order-book study | evid | n/a |
| 3.1 | 3 | BSL / SSL | gloss | IN BOT |
| 3.2 | T2 | Confirmed swings as references | rule | IN BOT (partly) (fractals feed build-ups/inducement) |
| 3.3 | T2 | Equal highs/lows | rule | IN BOT (`lit.buildups` 0.15 ATR) |
| 3.4 | T2 | PDH/PDL with a stated convention | rule | IN BOT (Globex day) |
| 3.5 | T2 | PWH/PWL untouched | rule | IN BOT (+PMH/PML; first breach only) |
| 3.6 | T2 | Session high/low | rule | IN BOT (`lit.SESSIONS`) |
| 3.7 | T2 | Trendline/channel | rule | MISSING (anchors undefined; "two lines" D1 rejected) |
| 3.8 | T2 | Round number | rule | TESTED-REJECTED (`lit_rep2_29-32`) |
| 3.9 | 3 | Equal tolerance is a fixed test parameter | rule | IN BOT; 0.10/0.25 TESTED-REJECTED (`lit_rep2_27-28`) |
| 3.10 | 3 | Internal/external relative to a range | def | n/a |
| 3.11 | 3 | IRL = FVG, ERL = swings (ICT) | gloss | n/a |
| 3.12 | 3 | Taken level is spent; new pool = new ID | rule | IN BOT |
| 3.13 | 3 | Low/high resistance liquidity | gloss | n/a |
| 3.14 | 3 | ReimFX "retail" | gloss | n/a |
| 3.15 | T3 | Seven trader groups, entries and stop clusters | def | IN BOT (implicit) |
| 3.16 | 3 | Episode 4 four groups | def | n/a |
| 3.17 | 3 | Breakout liquidity; a breakout can work | rule | IN BOT (only failed breakouts) |
| 3.18 | 3 | Reversal (pullback) traders | def | n/a |
| 3.19 | 3 | Trend liquidity: lines/MAs | rule | MISSING (see 3.7) |
| 3.20 | 3 | Map example 100/104/101/106 | ex | n/a |
| 4.1 | 4 | Swing confirmation delay (3-/5-bar) | clock | IN BOT |
| 4.2 | 4 | HH/HL, don't force trend labels | def | n/a |
| 4.3 | T4 | BOS/CHOCH/MSS/CISD/protected swing | gloss | IN BOT (CISD, extreme) |
| 4.4 | 4 | Wick vs close; act at the next executable price | rule | IN BOT |
| 4.5 | 4 | Strong/weak swing with evidence at the time | def | IN BOT |
| 4.6 | 4 | 1m MSS into 15m supply: pair with location | rule | TESTED-REJECTED (`lit-losses` §4) |
| 4.7 | 4 | ReimFX BOS, no CHOCH | gloss | n/a |
| 4.8 | 4 | TTrades CISD | def | IN BOT (`P.ref cisd`) |
| 4.9 | 4 | Fix run start/end, dojis, qualifying close | rule | IN BOT (`_cisd_level`) |
| 4.10 | 4 | Earlier confirmation changes fills | evid | IN BOT (`entry.md`) |
| 5.1 | 5 | Inducement definition | def | IN BOT (`P.idm_a`) |
| 5.2 | 5 | Level / event / response separated | def | IN BOT |
| 5.3 | 5 | Reference visible at decision time | rule | IN BOT |
| 5.4 | 5 | Name the attracted trade | def | n/a |
| 5.5 | 5 | Separate destination | rule | IN BOT |
| 5.6 | 5 | Confirm/invalidate defined | rule | IN BOT |
| 5.7 | 5 | Inducement-zone distance | rule | IN BOT (≤ 1 ATR); min room TESTED-REJECTED (`lit_rep_inducement_*`) |
| 5.8 | 5 | Sweep observable, motive inferred | def | IN BOT |
| 5.9 | 5 | Stopping rule for "one more stop-out" | rule | IN BOT (1/day) |
| 5.10 | 5 | Enigma narrative | evid | n/a |
| 5.11 | 5 | Judge the whole sample | evid | IN BOT |
| 5.12 | 5 | Need an event policy | rule | TESTED-REJECTED (`filters.md`, `lit-losses`, `lit_rep2_21-23`) |
| 5.13 | 5 | Journal: adherence vs result | exec | MISSING |
| 5.14 | 5 | Fixed review schedule | risk | IN BOT |
| 5.15 | 5 | SMT = smart money trap | gloss | n/a |
| 5.16 | 5 | Trap test 104-106 / 105 / 102 / >106 | ex | MISSING (zone-trap model) |
| 6.1 | 6 | Buildup, inducement, mitigation | def | IN BOT |
| 6.2 | 6 | 100/98 sequence example | ex | n/a |
| 6.3 | T5 | Build up, excursion, response, return, delivery | def | IN BOT |
| 6.4 | 6 | Range sweep reversal | rule | IN BOT |
| 6.5 | 6 | Breakout continuation | rule | MISSING (entry model); 2nd-trade continuation TESTED-REJECTED |
| 6.6 | 6 | Double-sided sweep | rule | TESTED-REJECTED (`lit_rep_double_sided_*`) |
| 6.7 | 6 | Shallow return | rule | IN BOT (30-min limit, no chase) |
| 6.8 | 6 | Multiple inducements | rule | TESTED-REJECTED (`lit_rep_inducements_*`) |
| 6.9 | 6 | Nested buildup IDs | def | IN BOT (partly) |
| 6.10 | 6 | No fixed weekday schedule | evid | IN BOT (note: Monday rule is data-picked) |
| 6.11 | 6 | No completed-day extremes | clock | IN BOT |
| 7.1 | 7 | Failed breakout | rule | IN BOT |
| 7.2 | 7 | Failed continuation into a deeper zone | rule | MISSING |
| 7.3 | 7 | False structural shift | rule | IN BOT (partly); flip TESTED-REJECTED (`lit_rep_failed_reversal_*`) |
| 7.4 | 7 | S/R/trendline traps | rule | IN BOT (partly) (build-ups); lines MISSING |
| 7.5 | 7 | Zone that attracts the wrong trade | rule | MISSING |
| 7.6 | 7 | Minor/medium/major tiers | rule | TESTED-REJECTED (`lit_rep2_04-07`) |
| 7.7 | 7 | Bigger label ≠ bigger risk | risk | IN BOT |
| 7.8 | 7 | Score sweep vs reaction separately | evid | MISSING |
| 7.9 | 7 | ETM micro breaks | def | n/a |
| 7.10 | 7 | ETM final sweep (2+ levels; early recross) | rule | TESTED-REJECTED (`lit_rep2_01-03`, `lit_rep_final_sweep_*`); recross part MISSING |
| 7.11 | 7 | Smart Risk 50% retracement | rule | TESTED-REJECTED (`lit_rep_discount_*`) |
| 8.1 | 8 | POI vs trigger; skip run-through zones | rule | IN BOT |
| 8.2 | 8 | Order block definition | def | IN BOT (CISD run) |
| 8.3 | 8 | Record OB details | exec | IN BOT (partly) (live `signals`) |
| 8.4 | 8 | Don't mix zone conventions | rule | IN BOT |
| 8.5 | 8 | ReimFX zone narrowness | evid | n/a |
| 8.6 | 8 | ETM block choice; skip mitigated | rule | IN BOT (partly) (first tap only) |
| 8.7 | 8 | Mean threshold / close-through invalidation | rule | TESTED-REJECTED (`entry.md`; `lit_rep2_33`) |
| 8.8 | 8 | Five relevance tests | rule | IN BOT |
| 8.9 | 8 | Fresh vs mitigated; touch vs close | rule | IN BOT |
| 8.10 | 8 | Beat a simpler benchmark | evid | IN BOT (SRR v2: 0 trades) |
| 9.1 | 9 | FVG definition | def | TESTED-REJECTED (`lit_rep_displacement_fvg_*`) |
| 9.2 | 9 | FVG numeric examples | ex | n/a |
| 9.3 | 9 | CE, inversion | def | TESTED-REJECTED (`entry.md`) |
| 9.4 | 9 | CE wick vs close vs far edge | rule | n/a |
| 9.5 | 9 | No retroactive inversion swap | rule | IN BOT |
| 9.6 | 9 | Breaker | def | TESTED-REJECTED (`entry.md`) |
| 9.7 | 9 | Mitigation block | def | n/a (LIT needs a sweep) |
| 9.8 | 9 | Rejection block | def | MISSING |
| 9.9 | 9 | Unicorn | def | MISSING |
| 9.10 | 9 | FVG ≠ footprint; no forced fill | evid | n/a |
| 10.1 | 10 | Displacement | def | IN BOT (0.8 ATR + CISD) |
| 10.2 | 10 | 1.5× median body, top quarter | rule | TESTED-REJECTED (`lit_rep_displacement_*`) |
| 10.3 | 10 | Big candle can be late | rule | TESTED-REJECTED (`lit-losses`) |
| 10.4 | 10 | Vector candles | def | TESTED-REJECTED (`filters.md`) |
| 10.5 | 10 | Order flow / delta / DOM | def | n/a |
| 11.1 | 11 | HTF/MTF/LTF stack | rule | IN BOT (partly); HTF TESTED-REJECTED |
| 11.2 | 11 | M5 / M1 / M15 direction | rule | IN BOT (partly) |
| 11.3 | 11 | More TFs ≠ confidence | evid | n/a |
| 11.4 | 11 | Premium/discount | def | TESTED-REJECTED (NWOG, opens, leg, `lit_rep2_08-13`) |
| 11.5 | 11 | 19,900-20,100 example | ex | n/a |
| 11.6 | 11 | Causal range selection | clock | IN BOT |
| 11.7 | 11 | Conflict resolution rule | rule | TESTED-REJECTED |
| 12.1 | 12 | Time / Timing script | def | IN BOT (02:00-15:30) |
| 12.2 | T6 | London 08:00 London | clock | IN BOT (partly) |
| 12.3 | T6 | 09:30 NY | clock | IN BOT |
| 12.4 | T6 | Asia frozen | clock | IN BOT |
| 12.5 | T6 | Futures trading day | clock | IN BOT |
| 12.6 | T6 | Midnight open | clock | IN BOT; P/D use TESTED-REJECTED |
| 12.7 | T6 | Releases | rule | TESTED-REJECTED |
| 12.8 | T7 | ReimFX Asia 17-01 | clock | TESTED-REJECTED (`lit-losses` §3) |
| 12.9 | T7 | ReimFX London 09-10 Berlin | clock | TESTED (neutral) (`lit_rep2_26`) |
| 12.10 | T7 | ReimFX NY 08-09 | clock | IN BOT (`ny89`) |
| 12.11 | 12 | Day Open = prior close | clock | IN BOT (partly) (NDOG) |
| 12.12 | 12 | 475/415-min boxes | clock | n/a |
| 12.13 | 12 | Check every box's times | clock | IN BOT |
| 12.14 | 12 | Named tz, UTC | clock | IN BOT |
| 12.15 | 12 | One PDH convention everywhere | clock | IN BOT |
| 12.16 | 12 | Daily scenarios | evid | n/a |
| 12.17 | 12 | MMM1/2 undefined | gloss | n/a |
| 13.1 | 13 | Premark level + reason | rule | IN BOT |
| 13.2 | 13 | Record the excursion | rule | IN BOT |
| 13.3 | 13 | Reclaim close | rule | TESTED-REJECTED (`lit_rep_reclaim_*`) |
| 13.4 | 13 | Swing break with displacement | rule | IN BOT (CISD); fractal break TESTED-REJECTED |
| 13.5 | 13 | Entry area FVG/OB/retest | rule | IN BOT (CISD level); others TESTED-REJECTED |
| 13.6 | 13 | No order before its information | clock | IN BOT |
| 13.7 | 13 | Stop + buffer, size from it | risk | IN BOT |
| 13.8 | 13 | Target first; cancel if it trades | rule | IN BOT |
| 13.9 | 13 | Confirmation tradeoff | evid | n/a |
| 13.10 | 13 | Bearish mirror | rule | IN BOT |
| 13.11 | 13 | Deadlines | rule | IN BOT (partly); tighter TESTED-REJECTED (`lit_rep_deadline_*`) |
| 13.12 | 13 | Four cancel conditions | exec | IN BOT |
| 13.13 | 13 | No chase | rule | IN BOT |
| 14.1 | 14 | Continuation | rule | TESTED-REJECTED |
| 14.2 | 14 | Protected low | rule | IN BOT |
| 14.3 | 14 | Why continuations fail | evid | TESTED-REJECTED ("exhaustion", `lit-losses`) |
| 14.4 | 14 | Second confirmation | rule | TESTED-REJECTED (I-c, two-stage) |
| 14.5 | 14 | Momentum mitigation expiry | rule | IN BOT (target-cancel) |
| 14.6 | 14 | Eligibility/expiry times | exec | IN BOT (partly) |
| 14.7 | 14 | Two-stage inducement | rule | IN BOT (partly) |
| 14.8 | 14 | Failed reversal → continuation | rule | TESTED-REJECTED |
| 15.1 | T8 | First touch entry | exec | TESTED-REJECTED |
| 15.2 | T8 | Midpoint entry | exec | TESTED-REJECTED |
| 15.3 | T8 | Confirming close entry | exec | IN BOT |
| 15.4 | T8 | Retest entry | exec | IN BOT |
| 15.5 | T8 | Second-inducement entry | exec | TESTED-REJECTED |
| 15.6 | 15 | Stop beyond swept extreme | risk | IN BOT |
| 15.7 | 15 | Buffer parameter | risk | IN BOT (1 tick); others TESTED-REJECTED (`lit_rep2_24-25`, `lit-experiments` D) |
| 15.8 | 15 | Never widen | risk | IN BOT |
| 15.9 | 15 | q = floor(B/(dV+fees+slip)) | risk | IN BOT (partly); fees inside TESTED-REJECTED (`lit_rep_sizing_*`) |
| 15.10 | 15 | Margin ≠ loss | risk | IN BOT |
| 15.11 | 15 | Touch ≠ fill | exec | IN BOT; TESTED (evidence) `lit_rep2_35` |
| 15.12 | 15 | Protective lifecycle | exec | IN BOT (`nt` OCO) |
| 15.13 | 15 | Reconciliation | exec | IN BOT |
| 16.1 | 16 | Target types | rule | IN BOT (VIX band); others TESTED-REJECTED |
| 16.2 | 16 | First obstacle | rule | TESTED-REJECTED (`lit_rep_first_obstacle_*`) |
| 16.3 | 16 | 70% × 0.5R arithmetic | evid | n/a |
| 16.4 | 16 | R definition | exec | IN BOT |
| 16.5 | 16 | Break-even p = L/(W+L) | evid | TESTED (evidence): 9.0% vs 26.7% |
| 16.6 | 16 | Partials | rule | TESTED-REJECTED |
| 16.7 | 16 | BE not economic | rule | IN BOT (1R); others TESTED-REJECTED |
| 16.8 | 16 | Time exits | rule | IN BOT (15:55); others TESTED-REJECTED (`lit_rep2_14-20`) |
| 16.9 | 16 | Trailing | rule | TESTED-REJECTED |
| 16.10 | 16 | Management fixed from the start | exec | IN BOT |
| 17.1 | 17 | Location/event/response/geometry/execution | def | IN BOT |
| 17.2 | T9 | Counting errors | evid | n/a |
| 17.3 | 17 | Score ≠ probability | evid | TESTED-REJECTED (grade sizing) |
| 17.4 | 17 | One filter at a time | evid | IN BOT |
| 17.5 | 17 | Required vs optional (SMT etc.) | rule | TESTED-REJECTED |
| 18.1 | 18 | Acceptance | rule | TESTED-REJECTED (`lit_rep_acceptance_*`) |
| 18.2 | 18 | Second sweep / re-entry | rule | IN BOT (none) |
| 18.3 | 18 | Unlimited attempts lose | risk | IN BOT |
| 18.4 | 18 | Geometry skip | rule | IN BOT |
| 18.5 | 18 | Ambiguity → pass | rule | IN BOT |
| 18.6 | 18 | Event policy incl. open positions | rule | TESTED-REJECTED |
| 18.7 | 18 | Spread/volatility/feed | exec | IN BOT (stale block) |
| 18.8 | 18 | Skip: reference unknown | rule | IN BOT |
| 18.9 | 18 | Skip: reclaim/disp/return absent | rule | IN BOT |
| 18.10 | 18 | Skip: objective traded / no room | rule | IN BOT |
| 18.11 | 18 | Skip: size 0 / allowance used | risk | IN BOT |
| 18.12 | 18 | Skip: data quality | clock | IN BOT (partly) |
| 18.13 | 18 | Skip: needs a changed rule | rule | IN BOT |
| 19.1 | T10 | NQ/MNQ specs | def | IN BOT |
| 19.2 | 19 | Separate books | exec | IN BOT (partly) |
| 19.3 | 19 | Research the traded session | evid | IN BOT |
| 19.4 | 19 | Roll policy | clock | IN BOT (partly) (research yes, live roll MISSING) |
| 19.5 | 19 | Sizing example (17.5 pts, 5 MNQ = $190) | ex | n/a |
| 19.6 | 19 | Prop budget = loss capacity | risk | IN BOT |
| 19.7 | 19 | Eval simulation | risk | IN BOT |
| 20.1 | 20 | Ex 1: +$335 = +1.91R | ex | n/a |
| 20.2 | 20 | Ex 2: +$159 = +1.89R, from the fill | ex | IN BOT |
| 20.3 | 20 | Ex 3: −$200 = −1.14R with slip | ex | IN BOT |
| 20.4 | 20 | 1.76 / 1.71 payoff | ex | n/a |
| 20.5 | 20 | Ex 4 no fill | ex | IN BOT |
| 20.6 | 20 | Ex 5 sweep that continues | ex | IN BOT |
| 21.1 | 21 | Data, roll, MNQ variant | clock | IN BOT (partly) |
| 21.2 | 21 | Bar stamping | clock | IN BOT |
| 21.3-21.14 | 21 | SRR v2: range 08:00-09:25; from 09:30; cutoff 10:30, flat 11:00; one candidate; S; reclaim S..S+3; strict pivot; C body/close/FVG; opposite edge; before 10:30; FVG-mid limit, 2-tick stop; 2R | rule/clock/exec | TESTED-REJECTED (SRR v2: 0 trades; pieces `lit_rep_*`, `lit_rep2_14`, `lit_rep2_24`) (12 items) |
| 21.15 | 21 | Fill at or through the stop is an exception | exec | MISSING |
| 21.16-21.18 | 21 | Limit C+1..C+5 with cancels; no partials/BE/second attempt; short symmetry | exec/rule | TESTED-REJECTED (SRR) (3 items) |
| 21.19 | 21 | Publish execution config | exec | IN BOT (partly) |
| 21.20 | 21 | OHLC ambiguity | exec | IN BOT (partly) |
| 22.1 | 22 | Holdout discipline | evid | IN BOT (H2 no longer untouched) |
| 22.2 | 22 | Variants tried = evidence | evid | TESTED (evidence) |
| 22.3-22.8 | 22 | Pivots after delay; FVG after c3; last completed HTF bar; holidays; contract and bad-data checks; costs | clock/exec | IN BOT (6 items) |
| 22.9 | 22 | Signal categories | exec | IN BOT (partly) |
| 22.10 | 22 | Intrabar order | exec | IN BOT |
| 22.11 | 22 | Touch ≠ fill | exec | TESTED (evidence) |
| 22.12 | T11 | Metrics table | evid | IN BOT |
| 22.13 | T12 | Wilson table | evid | TESTED (evidence) (19.6-35.2%) |
| 22.14 | 22 | Evaluation sequence | evid | IN BOT |
| 22.15 | 22 | Benchmark model | evid | TESTED-REJECTED (SRR) |
| 22.16 | 22 | Community/YouTube claims | evid | n/a |
| 23.1 | 23 | Stored events | exec | IN BOT |
| 23.2-23.5, 23.7, 23.10 | 23 | State table with reason codes; contract per trade; reference/POI fields; order fields; no-trade reasons | exec | IN BOT (partly) (6 items) |
| 23.6, 23.8, 23.9, 23.11-23.15 | 23 | Event times; fills; R/MFE; two clocks; risk separation; faults; kill/restart; progression | exec/clock/evid | IN BOT (8 items) |
| 24.1, 24.2, 24.12, 24.28, 24.29, 24.32, 24.33 | 24 | LIT/SMC/ICT; liquidity; BOS/CHOCH/MSS; DOM/delta; LRLR/HRLR; branded setups; meaning table | gloss | n/a (7 items) |
| 24.3-24.9, 24.13-24.16, 24.19, 24.20, 24.22, 24.24-24.27, 24.36 | 24 | BSL/SSL, EQH/EQL, PDH/PWH, AH/AL, HOD/LOD, IDM, sweep, CISD, protected swing, POI, OB, mitigation, displacement, build up, HTF/LTF, R/RR, MAE/MFE, BE, core task | gloss/def | IN BOT (19 items) |
| 24.10, 24.11, 24.17, 24.18, 24.21, 24.23, 24.30, 24.31 | 24 | Reclaim, acceptance, FVG/CE/IFVG, breaker, vector, P/D, AMD, SMT divergence | gloss | TESTED-REJECTED (8 items; rejection block / trap parts MISSING via 9.8, 5.16) |
| 24.34 | 24 | NicoSelman checklist | rule | IN BOT (partly) |
| 24.35 | 24 | EDM/LET | rule | MISSING |
| 25.1, 25.15, 25.16 | 25 | Study plan, questions, exercises | evid | n/a (3) |
| 25.2-25.5, 25.7, 25.8, 25.12-25.14 | 25 | Before/after checklist items | exec/risk/evid | IN BOT (9) |
| 25.6, 25.9, 25.11 | 25 | Cost allowance; intended vs actual fill; decision-time chart | exec | IN BOT (partly) (3) |
| 25.10 | 25 | Rule execution vs result | exec | MISSING |
| 26.1 | 26 | Target next liquidity, stop first, net of costs | rule | IN BOT |
| 26.2-26.5, 26.7, 26.8, 26.13, 26.14, 26.17, 26.19, 26.21, 26.22, 26.24-26.26 | 26 | Audit facts: journal ($4,904.12 / $9,169.38 / $4,657.93), six rows, May 19 / 21, cTrader +$8.01, ReimFX Jun 16 / 20, 19 projections, Romz 11R, WWA 69.5R vs 140R, TTS 77.28% PF 3.46 DD 40.66%, ZenG +247R PF 5.49, OHLC limits, forward −$39.88 PF 0.937, Signal Start 71% PF 0.83 | evid | n/a (15) |
| 26.6, 26.11, 26.15, 26.20, 26.23, 26.27, 26.29, 26.38, 26.39 | 26 | Half at 3R; Asia target; news / NFP exit; HTF-boundary target; ZenG management; first obstacle; runner; news policy; partial arithmetic | rule/evid | TESTED-REJECTED (9) |
| 26.9, 26.10, 26.12, 26.16, 26.18, 26.28, 26.30, 26.31, 26.33, 26.34, 26.36, 26.37, 26.40, 26.41 | 26 | Stop not at the exact tick; stop covers the proper zone; no over-refinement; cover the swing / BE; bank; R from the fill; stop first; no 10R vanity; no forced small stop; protection; re-entry limits; 1/day; same-signal comparisons | risk/rule/exec | IN BOT (14) |
| 26.32 | 26 | B and D budgets with fees inside | risk | IN BOT (partly) |
| 26.35 | 26 | Loss classification | exec | MISSING |
| 27.1 | 27 | TRUE/FALSE/UNKNOWN | exec | MISSING |
| 27.7, 27.35 | 27 | Fill at or through the stop: exception plus fixture | exec | MISSING (2) |
| 27.28 | 27 | NQ→MNQ mapping | exec | MISSING |
| 27.11, 27.26, 27.27, 27.30, 27.31 | 27 | Notion recheck; MNQ $40 example; integer partials; TradingView / Pine settings | evid/ex/risk/exec | n/a (5) |
| 27.9, 27.13, 27.16, 27.19, 27.25, 27.38, 27.40, 27.41, 27.44, 27.46, 27.50 | 27 | Loss capacity; stage table; immutable events; manual intervention; cost-inclusive c; stale broker; contract inputs; calendar inputs; queue; latency; late inputs | exec/risk/clock | IN BOT (partly) (11) |
| 27.2-27.6, 27.8, 27.10, 27.12, 27.14, 27.15, 27.17, 27.18, 27.20-27.24, 27.29, 27.32-27.34, 27.36, 27.37, 27.39, 27.42, 27.43, 27.45, 27.47-27.49 | 27 | Contract items and fixtures: cancel-pending, partial-exit resize, ledger freeze (the last three are first-pass fixes) | exec/rule/risk/clock | IN BOT (30) |
| 28.1, 28.2, 28.4, 28.5, 28.23 | 28 | Indicator internals; 16:59/18:00/18:01 example; TBBO | clock/ex/exec | n/a (5) |
| 28.3, 28.6-28.10, 28.16, 28.17, 28.20, 28.25, 28.27 | 28 | No left-edge look-ahead; complete ranges; Globex hours; 09:30 anchor; obsolete 16:15 pause; trading date; coarse bars; display tz; frozen dataset; 2026 holiday snapshot (13:15 since the first pass); preopen date | clock | IN BOT (11) |
| 28.14, 28.15, 28.18, 28.19, 28.21, 28.24 | 28 | tzdata version; session contract; lateness; DST fixtures; vendor bars; manifest | clock/evid | IN BOT (partly) (6) |
| 28.12 | 28 | 2026 DST dates / mismatch weeks | clock | TESTED (neutral) |
| 28.13 | T25 | DST table reproduced | clock | TESTED (evidence) |
| 28.11, 28.22, 28.26, 28.28 | 28 | CME calendar; live roll; exchange states; matching-state coverage | clock/exec | MISSING (4) |
| 29.1-29.3 | 29 | Scope, 116 sources, private material excluded | evid | n/a (3) |

Rows 0.1–21.2 are listed one by one. From 21.3 on, rows with the same status are grouped, with counts in brackets. The totals add
to 436.
