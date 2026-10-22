# The LIT masters: how they trade, and what a bot can copy

Research only. Nothing here was backtested. Every rule is tagged with its source and how sure the source is:

- **[P]** primary: the author's own code, playbook or videos (transcribed).
- **[S]** a student's notes of the author's paid or public lessons (good fidelity, but second hand).
- **[C]** community or vendor description (TradingView script text, blog, course listing). Marketing grade.
- **[A]** my analysis or a coding choice. Not a source claim.

"Claim" means the source says it works. None of the sources publishes audited results. All dollar and win-rate figures are
self-reported, mostly on sponsored YouTube shows.

**How this was gathered (and what could not be read).** WebFetch failed on every host (DNS) and direct HTTPS is blocked by the
proxy, so TradingView, YouTube, Reddit, Scribd and Forex Factory pages were read only through search-engine extracts. Public GitHub
repositories could be cloned, and three of them carry primary material: Reimfx's own Pine code, a LIT student's lesson notes, and
verbatim transcripts of 23 liquidity-inducement videos plus a first-party playbook. Reddit and Forex Factory turned up almost
nothing specific to LIT (one BabyPips thread asking whether the Reimfx mentorship is worth its "very high" price, with no replies).

**Two schools, one idea.** "LIT" in the strict sense is **Reim FX's Liquidity Inducement Theorem** (founded 2020; it started as a
private mentorship inside the WWA community; co-founders "Saqbar" and "Stockcy" per a 2023 paid press release; paid "LIT
Awakening Masterguide" and the invite-only "8 Chapter LIT Adventure"). Its curriculum is not public. The richest public, NQ-traded
version of the same idea is the **liquidity-inducement / "liquidity trap" model of Marco Trades** (Chart Fanatics; same teaching on
the Inter Equity Trading channel, which appears to be Marco himself). Both say the same thing: **the market induces early entries,
runs the stops those entries create, and the trade is taken after the trap, toward the next pool.** Where they differ is noted.

---

## 1. The LIT model in codeable steps

All times are New York (America/New_York, DST by the clock). Where the live LIT bot (`research/lit/lit_final.json`, model `lit`)
already does a step, its current setting is shown as **now:**.

### 1.1 Session boxes and windows (Reim's own code) [P]

Reim's "LIT - Timing" Pine v5 source is copied verbatim in `rpanchyk/mt5-lit-market-sessions-ind/docs/LIT_Timing.txt` (header
`// LIT Reimfx`; original https://www.tradingview.com/script/vukoCtAk/). This settles the authorship: "LIT - Timing" is Reim's.
"LIT - Confirmations" is by NicoSelman, a different author. All strings are on a fixed UTC-7 clock, so they convert as follows.

| Box (as drawn) | UTC-7 string, winter / summer | New York time | Days |
|---|---|---|---|
| Asia (purple, with high/mid/low lines extended 2× the box length) | futures `1605-2300` / `1505-2200` (forex starts 1 h earlier) | **18:05 to 01:00** (forex 17:05 to 01:00) | Sun-Fri evenings |
| Frankfurt (computed, never drawn) | `0000-0100` / `2300-2401` | 02:00 to 03:00 | Mon-Fri |
| London Open Inducement Window (grey) | `0100-0200` / `0000-0100` | **03:00 to 04:00** (= 08:00 to 09:00 London time) | Mon-Fri |
| NY Open Inducement Window (grey) | `0600-0700` / `0500-0600` | **08:00 to 09:00** | Mon-Fri |
| Lines | daily `high[1]`, `low[1]`; weekly `high[1]`, `low[1]`; "Day Open" = the prior daily close | PDH/PDL, PWH/PWL | |

- The boxes are hidden on charts above 59 minutes (Asia above 60), so Reim works on 1m-15m charts.
- **DST caveat:** the summer strings are only switched on for 2022-2023 dates. From late 2023 on, the code as published shifts every
  box by **+60 min in US summer** (Asia 19:05-02:00, London 04:00-05:00, NY 09:00-10:00). The current TradingView version (about 50
  updates) says it is DST-correct, so the intended times are the ones in the table. The workflow already tested both versions
  (`sw_reim_intended`, `sw_reim_coded` in `sessions.md`).
- **Reim's own reading [P, script description]:** a break of the Asia high/low "induces liquidity", and price often reverses after
  the false break. The two grey windows are "when major liquidity is typically introduced": look for grabs or mitigations there.
  PDH/PDL and PWH/PWL are targets, or inducement once taken.
- Other session maps in the school: PhronesisKnight's session liquidity Asia 18:00-01:00, London 02:00-06:00, NY 07:00-10:00 [S].
  Marco and IET trade **futures only in New York, "mainly after stock open" (09:30), sometimes from 08:00**, and want to be out
  before lunch [P].
- A LIT TradingView script adds a **"three-minute rule"**: manipulation in the first and last three minutes of each 15-minute candle
  (especially in the last quarter of the hour) is an extra entry factor [C, https://br.tradingview.com/scripts/lit].
- The paid Selar LIT e-book lists "Asia, London and New York session traps, **90-minute cycles**, multi-day reversals" [C]. The
  90-minute grid is Daye's Quarterly Theory (19:30, 01:30, 07:30, 13:30 as "true opens"; see `spec_sessions.md`).

### 1.2 What counts as liquidity, and how strong it is [S]

DreamsFX's taxonomy (student notes of his Mastermind bootcamp; "IDM strength = amount of time spent on the chart; larger IDM, more
gas, larger move"):

| Class | Timeframes | Levels |
|---|---|---|
| **Major** | 4H, D, W, M | HTF equal highs/lows and trendlines, any swing point older than a week, **PWH/PWL**, multiple 4H inducements |
| **Medium** | 15m-2H | intraday equal highs/lows, **PDH/PDL**, **session open/high/low**, **Asia high/low** |
| **Minor** | 1m-15m | internal swing points, highs/lows of consolidations. "Used for entries" |

Marco's filter on top of that [P]: **only a level that was respected and made price move away holds liquidity.** "Not every high/low
has liquidity"; "if a big move has already happened and left no clear highs/lows with liquidity, there is no trade."
Equal highs/lows ("build-ups", "engineered liquidity") are the classic pool [P Reim notes: "liquidity is engineered (EQH/EQL),
then grabbed by an aggressive run"].

### 1.3 Inducement: three definitions that are not the same

1. **Structure inducement (the LIT/SMC mapping rule)** [C, LIT_Globas_sys docs; S DreamsFX]: after a break of structure, the
   **first valid pullback** is the inducement (IDM). A new HH/LL only counts once that IDM has been taken. "IDM is needed before any
   order-block mitigation"; "IDM is the most recent structural point." A POI with untaken IDM in front of it is a **fake POI** [P Reim
   2020 notes: "Fake POI ... as there was no inducement"].
2. **Inducing sweep vs trapping sweep** (Marco/IET) [P]: an *inducing* sweep takes an internal level and pulls early traders in
   ("we take out these internal lows, we induce sellers"). Mark it, don't trade it. The *trapping* sweep takes the pool where those
   induced traders' stops sit, and that is the entry. "A sweep by itself is nothing ... that's called patterns and we're not trading
   patterns."
3. **IDM1 / IDM2 / IDM3** (DreamsFX) [S]: IDM1 = HTF false BOS (continuation inducement: "buy below the HL" in an uptrend). IDM2 =
   LTF false continuation inside an HTF pullback ("buy below the LL"). IDM3 = LTF false BOS. These grade setups (section 2.3).

Validity details from the same school [S]:
- A swing point is established only after a **close** beyond it (StoicTA). Trending BOS needs a full-body close; a counter-trend
  CHoCH may be a wick (BornaFX). "In an up-trend the first CHoCH is inducement: wait for a BOS as confirmation" (BornaFX).
- A healthy pullback reaches at least 50% of the valid trading range (DreamsFX).
- "LTF BOS = HTF pullback": a 5m BOS is a 15m pullback, a 15m BOS a 1h pullback (DreamsFX, PhronesisKnight).
- After 3 consecutive mitigations in one direction, stop following that order flow: it is now "engineered liquidity for trendline
  traders" (DreamsFX).
- DTFX: "if we fail to run the low before the move back up, that makes this high a **weak high**, and we run it."

### 1.4 The trap, the sweep and the displacement

- Marco's playbook [P]: "**Buy below lows, sell above highs, never the other way, and only when those lows/highs respected structure
  and moved away.** Execute after liquidity is taken, not before."
- Arming conditions in his "Da Vinci" version [P, Chart Fanatics ep. 2]: (1) something was taken from the left in the opposite
  direction; (2) a confirmed target pool exists; (3) **engineered liquidity printed**: on the way, price approached the target pool,
  respected it and pulled back, leaving a fresh high just under it ("no engineered liquidity, no model"); (4) early buyers were
  induced and a pool built below them; (5) a liquidity block (LB, a prior sweep wick with no liquidity left behind it) sits beyond the
  entry.
- The sweep often stabs more than once; reactions above the lows before the real sweep are "false" (V1). A trap candle closes back
  inside (DTFX: "liquidity grab, come back to range, body closed inside the range").
- Displacement: Reim's notes call it an "aggressive run" into imbalance [P]. IET treats the imbalance left by the sweep as the LB
  itself ("leaving this imbalance area, otherwise known as a liquidity block") [P].
- "The LTF IDM is the trigger for HTF expansion" (DreamsFX) [S].

### 1.5 Structure shift and entry types

DreamsFX "Entry Management Protocol" [S], from lowest to highest perceived risk:
1. LTF refined limit order (in the extreme POI).
2. BOS entry (after reacting from a true OB).
3. Continuation entry (missed the move or adding: a 1m pullback after the main mitigation).
4. Order flow with BOS (consecutive extremes mitigated, new internal structure made).
5. Order flow without BOS (medium risk).

His own risk ladder: **1st entry, refined limit, $100 risk; 2nd entry, BOS / order flow, $400 risk.**

Marco [P]: enter **the moment the pool is swept, at market, no over-refinement** ("people over-refine and start missing entries");
a resting limit at the level is the passive equivalent. When the structural stop makes RR worse than 1:3, drop to the 1m and wait
for the same model to print fractally there (rescue entry).

**now:** 5m CISD shift, limit at the CISD level for 30 min, then a 1m CISD close confirmation (`entry.md`; 2026 PF 2.18 vs 1.26).
The workflow found that market entry after the shift wrecks 2026 because stops get too wide.

### 1.6 The stop: protected high/low and liquidity block

- PhronesisKnight [S]: uptrend = strong low + weak high. The **strong (protected) low** must not be violated; violating it means a
  directional change. TTrades' published version [C]: a protected high forms when price sweeps a prior high, closes back inside, and
  then closes below the open of the up-close run that made it.
- Marco [P]: "Always cover the last high/low with your stop." "Stop covers this high always. I don't want to get greedy." On futures
  "a tick or two above the high" is enough (one central feed); CFDs need breathing room. **Never a fixed distance.**
- IET [P]: "No liquidity block, no stop loss. So we need an LB to take an entry." "Stop loss is going to go just above our liquidity
  block. That will never change." Do not roll the stop in early: price often stabs deeper into the LB before the move.
- Disagreement: IET's own chart once put the stop inside the lower half of the HTF LB; another time it went beyond a deeper
  left-hand low ~530 NQ pts away. The anchor is chosen case by case, always behind structure that already swept liquidity.
- **now:** 1 tick beyond the 5m sweep extreme, 8-80 pts. That matches the school.

### 1.7 Targets: the draw on liquidity

- Target = the **opposing confirmed pool, never a fixed R** [P Marco: "a fixed R is literally just a random point on the chart"].
  Layered: partial at the internal/LTF pool, the rest at the HTF/external pool.
- **Minimum reward:** Marco performs best at **RR ≥ 1:3** and skips small absolute moves ("only a 140-tick move [35 NQ pts], not
  interested") [P]. ICT: "nothing less than three to one" [P via ict-knowledge-library].
- **Bias lasts while the target is intact** [P IET]: "As long as the highs stay intact, whatever happens below this high, buys are
  valid." Once the target is taken, that side is finished for the leg.
- **IET's daily-candle script** [P]: after an outside day, expect an inside day ("no trading for me ... I'm on the brakes"). If
  yesterday closed up and left its low unrun while the day before's low was already run: expect a spike below yesterday's low, hold
  the older low as an LB, then trade higher toward yesterday's high (intraday) or the older high (swing). Same logic on 30m candles.
- **IET's 10:00 model** [P]: reference = the 06:00-10:00 4H candle; longs only after its low is taken, at or after 10:00 (the "10:00
  a.m. reversal"); target its high. Mirror for shorts. (Tested by the workflow: no edge.)
- **now:** target = 18:00 open ± 1 VIX one-day move, at least 1.5R, banked at 8R. The VIX band is not a LIT-school target as such:
  the "rule of 16" daily range is a common index-futures tool [C, e.g. https://www.tradingview.com/script/mVcozynO-VIX-Range-Levels-Rule-of-16/].

### 1.8 Invalidation and re-arming

- A stop-out does not flip the bias while the target pool is still there [P Marco]: "then I need to wait for this to occur again:
  early buyers induced, those early buyers taken out, then I look for my entry again."
- ICT's matching size rule [P, `ICT-2016-MITIGATE-LOSING-TRADES`]: re-enter the same idea at **half** the size of the loser, with
  a wider stop. At +2R the loss is recovered, at +3R take it off. Halve again on a second failure.
- Missed it (the pool was respected and price ran without sweeping): "not a move I was supposed to be in." No chasing [P].

---

## 2. How the pros decide (the discretion, as rules)

### 2.1 Their pre-trade checklists

| Source | Checklist (verbatim order) |
|---|---|
| LIT - Confirmations (NicoSelman) [C] | liquidity pools identified · inducement before the reversal · relevant BOS · mitigation after the BOS · Smart Money Trap · **timing** (high-probability window) · mitigation to the left · targets set |
| Marco playbook [P] | liquidity built? · respected level that moved price away · trade below the low / above the high · confirmation (internal structure, false reaction, trap) · stop covers the taken low · target = respected opposing pool · inside my session window · after news, not before |
| IET [P] | HTF first ("if you don't see anything relevant on the higher, don't go to the lower") · two lines marked · inducement happened · trap happened · LB exists · target intact · time confluence for counter-sequence trades |
| DreamsFX warm-up [S] | main structure · internal structure · HTF IDM destination · internal IDM "gas" · extreme/decisional POI · engineered liquidity · wall · SMTs · projection |
| Reim 2020 call notes [P] | liquidity engineered (EQH/EQL) · grabbed by an aggressive run · mitigated into imbalance · POI with inducement in front of it (else fake POI) |

### 2.2 The discretion turned into rules (D-rules)

"Tested" means the LIT workflow already ran it on 2026 (`sessions.md`, `filters.md`, `entry.md`, `risk.md`). Ranges are where to
search; tune on 2026 H1, check on 2026 H2, show 2021-25 as reference, as the workflow does.

| # | Rule (what the trader does) | How to code it | Parameter range | Source | Tested? |
|---|---|---|---|---|---|
| D1 | **Two lines / no man's land.** Mark the nearest confirmed pool above and below; ignore everything in between; "I will wait days if I have to." | At each bar: nearest unswept respected high above and low below (respected = price moved ≥ k·ATR away after it). Only sweeps of those two lines arm a setup; a sweep of a level between them does not. | k 0.5-2.0 ATR(14,5m); line age ≤ 1-10 sessions | IET [P] | no |
| D2 | **Engineered liquidity required** ("no ENG LQ, no model"). | Before the trap: on the way toward the target pool, a swing high (for longs) that came within x% of the pool without taking it, after the opposite-side sweep. As a filter or as a size factor (1.0 with, 0.5 without). | x 0.1-0.3% of price (V2 chart); lookback 1-3 sessions | Marco [P] | no |
| D3 | **Liquidity-block stop anchor.** The stop sits beyond a wick that already swept liquidity. | Require the sweep extreme to be a wick that took a prior swing (it is, by construction). Option: if a deeper left-hand low lies within 0.3·stop, use it instead. | 0-0.5×stop | IET, Marco [P] | partly (stop = sweep extreme) |
| D4 | **Target must be intact; stack while it is.** | A second same-direction trade is allowed only if the first trade's target is untouched, a new inducement + trap happened, and a new LB exists. All stacked trades exit at the shared target. | max 2 trades/day; 2nd at 0.5-1.0 size | IET "Stacking" [P] | partly: `perday2_onedir` full size, no new-sweep rule, lower PF |
| D5 | **Bias lockout as a grade, not a ban.** Against the day's taken side = "lower probability", allowed only with time confluence. | Side taken first (first of the two lines swept) sets the side. A counter trade needs its sweep extreme within ±10 min of 09:30 or 10:00, else 0.5 size or skip. | window ±5-15 min; size 0-0.5 | IET [P] | partly: `bias_opp_off_f/_h` without the time exception, worse |
| D6 | **Time confluence.** Sweeps at 09:30, at the 10:00 4H roll, at 08:00 and at the Asia open, or in the first/last 3 minutes of a 15m candle, are stronger. "The only time I take a candle-close entry is with time confluence to a T." | Flag `t_conf` if the sweep extreme's minute is in {:57-:02, :12-:17, :27-:32, :42-:47} or within ±5 min of 08:00/09:30/10:00/20:00. Size 1.0 with, 0.5-0.75 without. | ±2-5 min | IET [P]; LIT 3-minute rule [C] | no |
| D7 | **News.** Never enter before a scheduled release; enter 2-4 min after. Liquidity builds the day before news. | No entry from 2 min before to 3 min after 08:30/10:00/14:00 releases. | 0-5 min | Marco [P] | yes: guard never triggers (LIT entries are not near releases) |
| D8 | **Bank holidays: no trade.** | Skip US exchange holidays and early-close days (and the day after Thanksgiving). | on/off | IET [P] | no (trivial) |
| D9 | **Day after an outside day: brakes.** | If yesterday took both PDH and PDL of the day before: size 0.5 (or skip) today. | size 0-0.5 | IET [P] | close cousin tested: prior range > 1.8-2.5× average, no effect |
| D10 | **Daily-candle script** (spike yesterday's unrun low, hold the older low, target yesterday's high). | Long only if today's sweep is of PDL while the low of 2 days ago was taken yesterday and holds; target PDH. Mirror. As a size boost (1.25) rather than a filter. | | IET [P]; TTrades bias [C] | TTrades PDH/PDL bias tested: no help |
| D11 | **Session window, out before lunch.** | Entries 08:00-11:00 (Marco/IET), exits by 12:00. | entry end 10:30-11:30 | Marco, IET [P] | yes: NY-only windows cut trades below 1/week; lunch blocks no gain |
| D12 | **Minimum RR 3 and a minimum absolute move.** | Skip if target < 3R or target distance < N pts. | RR 2-3.5; N 25-50 NQ pts | Marco, ICT [P] | min RR up to 2.5 tested (small effect); RR 3 and N not |
| D13 | **Order flow exhausted after 3 mitigations.** | Count same-direction 5m BOS legs since the session's first sweep; skip (or half) the 4th+. | 3-4 legs | DreamsFX [S] | no |
| D14 | **Weak extremes get run.** A high made without first running the opposite low is weak. | When choosing between targets, prefer a weak extreme; as a size factor if the target is weak. | | DTFX [S] | no |
| D15 | **First CHoCH is inducement; wait for a BOS.** | Require a second structure break in the trade's direction (BOS of the first pullback) before the entry. | | BornaFX [S] | no (entry.md tested CISD variants, not a 2nd break) |
| D16 | **Week rhythm.** High/low of week tends to form Tue-Wed; Monday that takes Friday's high gives Friday's low as target. | HOW window size rule; Monday rule: after Monday sweeps Friday's high/low, target = Friday's opposite extreme. | | IET [P]; ICT [P] | HOW size rule tested (helps); Monday rule no |
| D17 | **Patterns are not trades.** A sweep without a prior inducement and an intact opposing pool is not a setup. | Require: inducement (`idm_a`) AND target pool unbroken since the inducement. | | IET [P]; Reim "fake POI" [P] | `idm_a` is in the live LIT bot |

### 2.3 Grading A/B/C, as the sources do it

- DreamsFX "Mastermind probability scale" [S, his numbers are claims]: **A+ ≈ 85%** = IDM1 + extreme POI; **B+ 65-80%** = IDM2 +
  extreme, or IDM1/IDM2 + decisional POI; lowest = IDM3 + decisional order flow. "The lower the probability, the more you take off at
  the first target."
- Marco [P]: the "higher probable ones" have engineered liquidity, an LB, RR ≥ 3 and a target pool the market itself "communicated"
  (equal highs, respected highs).
- Coded grade [A]: start at C; +1 if the swept level is medium or major (section 1.2); +1 if inducement was taken first; +1 if the
  stop is at the leg's extreme (protected low) rather than an internal low; +1 for engineered liquidity (D2); +1 for time confluence
  (D6). A ≥ 4, B = 2-3, C ≤ 1. **Size A 1.0, B 0.5, C skip, and use it only if grade is monotonic in 2026 H1 and H2.** The house
  tested grade sizing on the engine before and rejected it (CLAUDE.md), so this is low priority unless D2/D6 alone show an effect.

### 2.4 When they stop for the day

- Marco: a fixed daily risk figure (not disclosed) [P]; "if it doesn't reach target, no profits, it is what it is"; out before
  lunch.
- IET: "these days [two good trades both ways] do not come often"; after an outside day, brakes.
- ICT: after recovering a loss at +2R, "get back to even and relax, especially late in the week ... **do not go into the weekend
  with a net loss**" (developing traders) [P].
- Prop coaches (TRADER_HEURISTICS R2/R3): stop after 2 losses or a dollar cap; one and done after a good win [C].
- **now:** max 1 trade a day, flat by 15:55. A ping-pong second trade is the only school-approved exception, and it is rare.

---

## 3. Risk and sizing on the MFFU Builder 50K

### 3.1 The account rules (official help centre, checked by search 2026-10-18)

- $50,000 start, **$3,000 profit target**, **$2,000 end-of-day trailing max loss** (MLL; $1,500 with the add-on), **$1,000 soft-pause
  daily loss limit** (ends the day, does not breach), **max 4 minis / 40 micros**, no consistency rule in the evaluation
  (https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide). Third-party pages disagree on the
  DLL and on where the trailing floor locks; the repo models it locking at $50,100 and checks the floor against the intraday low.
- MNQ = $2 per point. Micros = risk $ ÷ (stop pts × $2). At $800 risk: 10-pt stop → 40 micros (the cap), 20 → 20, 40 → 10, 80 → 5.
  At $400: 20 → 10, 40 → 5, 80 → 2.

### 3.2 What the traders say about risk

| Source | Risk per trade | After losses | Other |
|---|---|---|---|
| ICT [P] | 1% baseline ("1% makes millionaires"), 0.5% for beginners, never above 2% | **halve after a loss**, halve again after a second; return to full only after making back **50% of what was lost** (2022 mentorship ep. 41) | RR ≥ 3; at 3:1 you can lose 70% of trades |
| Marco [P] | a fixed daily risk figure; host suggests **0.5-0.75%** on prop accounts | re-arm the same idea only after a new trap | partials 20-25% (V2) or 50-70% at the first target when less confident (V1) |
| DreamsFX [S] | **$100** on the aggressive refined limit, **$400** on the confirmed entry | | partial schedules per grade (below) |
| IET [P] | start with small prop accounts, not 100-200K | | prop firms to "build experience" |
| r/FuturesTrading (mirrored thread) [C] | 0.5-1% of 50K = **$250-500**; 1-3 MNQ for most consistent traders | | "above 1% gets risky with daily drawdown rules" |
| NexusFi, PropFirmMap [C] | size from the **buffer**, not the account: early wins raise the trailing floor | | grow until the floor locks, then add size |

**What this means for the bot [A].** The live engine risks $800 per trade, which is 40% of the $2,000 MLL: two full losses and a
slipped third end the eval. Every source above would call that aggressive. The owner's two-week rule needs it, though: $3,000 in
about 10 sessions (2-6 trades) is 3.75R at $800 but 7.5R at $400. The pros' answer to this tension is not a fixed size but a
**ladder tied to the buffer and the last result** (rules S1-S4 below). All of them are pure re-sizing, so `rl.size(raw, rule=...)`
scores them exactly without a new replay.

### 3.3 Sizing rules to test (S-rules)

| # | Rule | Code | Range | Source |
|---|---|---|---|---|
| S1 | **ICT halving with 50% recovery.** After a full loss, risk × 0.5 until the P&L since that loss reaches +50% of it; after a second loss × 0.25; floor 1 micro. | state machine on closed trades | multiplier 0.5 / 0.25; recovery 25-100% | ICT [P] |
| S2 | **Buffer sizing.** risk = clamp(f × buffer, lo, hi), buffer = balance − EOD MLL floor. | needs the eval simulator's balance path | f 0.25-0.45; lo $200, hi $800-1,000 | NexusFi, TRADER_HEURISTICS R4 [C] |
| S3 | **Cushion first, then press.** Start at $400-500; after +$1,000-1,500 closed profit go to $800; if the buffer falls below $1,000 go to $300. | eval-path state | thresholds as listed | prop coaches [C]; owner's `sizing.press` exists and is OFF |
| S4 | **Two-stage entry (DreamsFX ladder).** 20-25% of the trade's risk on the first limit at the CISD level; the other 75-80% only on the 1m confirmation. | split fills; needs the replay | split 0.2-0.33 | DreamsFX [S] |
| S5 | **Grade sizing.** A 1.0, B 0.5, C skip (section 2.3). | grade at signal time | | DreamsFX [S], Marco [P] |

Compare every S-rule against the existing cold-streak filter (cold × 0.25 after 15 signals sum ≤ 0R), not against flat size; the
filter already does a slow version of S1.

### 3.4 Loss management: partials, breakeven, time stops, trades per day

**Partials.** All sources: only at a liquidity level, never at a fixed R. Sizes disagree:

| Setup (DreamsFX) [S] | TP1 | TP2 | TP3 |
|---|---|---|---|
| IDM1 + extreme | 70% at the 1st IDM | 20% engineered liquidity / OB | 10% new swing |
| IDM2 + extreme | 10% at the 1st IDM | 60% previous structural swing | 30% new swing |
| IDM1 + decisional | 20% minor IDM | 50% medium IDM | 30% major IDM |
| IDM3 + decisional order flow | 20% | 70% | 10% |

Marco [P]: small partials, "20-25% of my position", and he urges holding to the target ("once I started holding more volume the
profits did increase"); in an earlier video 50-70% at the first LTF target when less sure of the HTF. The playbook: **"Don't take
partials at arbitrary R-multiples."** The workflow tested R-based partials (50% at 1R/2R, 33% at 2R): all worse. **Liquidity-based
partials were not tested.**

**Breakeven.** Three versions, all structural, none R-based:
- Marco V2 / IET [P]: once price, after the entry, **takes out an opposing internal high** (buyers now induced), roll the stop to
  breakeven or tuck it below the new higher low.
- Marco V1 and the playbook [P]: **no breakeven unless partials were taken.** Move the stop only after a new HL forms beyond entry.
- Prop/retail default (traderpeter and others, via TRADER_HEURISTICS M3) [C]: +1R is the common default, and early BE kills winners (63% of trades that reached +1R came back to
  entry in one 265-trade sample).
- **now:** BE at +1R. The workflow tested BE at 0.75/1.5/2/3R and none; 1R stayed best. The structural triggers were not tested.

**Trailing.** "Only move your stop after price moves in your favour and forms a higher low" [P playbook]. Tested by the workflow as
"trail behind new 5m protected swings": worse after BE, flat after 2R.

**Time stops.** Not a LIT-school tool; Marco just avoids holding into lunch. The engine's 30-min time stop belongs to the other
strategy; for LIT the workflow found AM time stops at 11:30/12:00 changed nothing.

**Trades per day.** One, with two exceptions the sources allow: the ping-pong reversal (a second, independent setup after the first
target is hit, with its own inducement, trap, LB and target, often at 10:00-10:30) and stacking under an intact target (D4).

**Scale-ins.** Only below a fresh mini-sweep, each add with its own invalidation, easier once the first entry's risk has been rolled
off; forced adds "to the original trade idea" are how traders leak profits [P Marco V1]. Prop guidance: off during the eval.

---

## 4. Idea → code → what the sources claim → priority

Priority weighs four things: how strongly the sources agree, whether the workflow already tested it, whether it can help the
owner's targets (2026 and 2021-25, 2-4 trades a week, eval decided within 2 weeks), and how cheap it is to test (re-sizing is exact
and fast with `rl.size`).

| Idea | How to code it | What the sources claim | Priority |
|---|---|---|---|
| Structural breakeven (after an opposing internal swing beyond entry is taken, or a new 5m HL/LH forms) instead of +1R | in `lit.simulate`: track 5m swings after the fill; move the stop to entry + 1 tick when the first opposing swing high (long) formed after entry is broken; variant: to below the new HL | Marco/IET: "roll to BE once highs are taken"; prevents the early-BE scratch that kills winners | **P1** |
| ICT halving with 50% recovery (S1) | `rl.size` rule on the trade list | halves drawdown in losing strings without stopping trading; never increase after a loss | **P1** |
| Cushion-then-press eval ladder (S3) and buffer sizing (S2) | eval-path sizing in the Monte Carlo/eval scorer | prop consensus: protect the trailing buffer early; matches the owner's 2-week rule better than flat $800 | **P1** |
| Liquidity-based partial (20-30% at the first opposing internal pool ≥ 1R, rest to the VIX target) | partial at the nearest unswept 5m/15m swing in the trade's direction | Marco: small partials only at liquidity; holding more volume raised profits | **P1** (R-partials lost; this one is untested) |
| Engineered-liquidity gate (D2) as a size factor | detect the near-miss swing under the target pool | "no engineered liquidity, no model"; the single most emphasised arming rule in V2 | **P2** |
| Half-size re-entry after a stop if the target is intact and a new inducement + trap forms (D4 + ICT) | allow trade 2 same direction at 0.5 size, only after a new sweep beyond the first stop | Marco re-arm rule; ICT half-size mitigation; adds frequency in slow weeks | **P2** |
| Minimum RR 3 and minimum 30-40 pt target (D12) | filter at signal time | Marco and ICT both use 1:3 minimum; skip small moves | **P2** (watch the 2/week floor) |
| Time confluence / 3-minute rule (D6) as a size factor | sweep-extreme minute flag | IET: time confluence is required for counter-sequence trades; LIT 3-minute rule | **P2** |
| Day after an outside day at half size (D9) | daily flag | IET: expect an inside, choppy day | **P2** |
| Two lines / no man's land (D1) | nearest respected pools above/below | IET: everything between the two lines is noise | **P3** (overlaps the existing level set) |
| Two-stage entry, 20-25% at the limit, rest on the 1m confirmation (S4) | split fills | DreamsFX risk ladder $100 / $400 | **P3** |
| Order flow exhausted after 3 legs (D13) | count BOS legs | DreamsFX: after 3 mitigations it is engineered liquidity | **P3** |
| BOS after the first CHoCH (D15) | second break required | BornaFX: first CHoCH is inducement | **P3** (likely cuts frequency) |
| Weak-extreme target preference (D14) | swing classification | DTFX | **P3** |
| Grade A/B/C sizing (2.3) | additive score | DreamsFX probability scale (A+ 85% claimed) | **P3** (grade sizing failed before) |
| Bank-holiday and early-close skip (D8) | calendar | IET: "simply a no trading day" | **P3** (housekeeping; do it anyway) |
| Monday-takes-Friday rule (D16) | weekly flag | IET | **P3** |
| Already tested, no need to redo | NY-only / London-only windows, lunch blocks, 10:00 4H reversal, TTrades PDH/PDL bias, opposite-pool lockout, first-sweep bias, PO3 opens, news guard, R-partials, R-based BE variants, trailing, 2 trades/day, PVSRA vectors, VIX-distance filter, SMT with ES, NDOG | see `sessions.md`, `filters.md`, `entry.md`, `risk.md` | — |

---

## 5. Who is who, and what each adds

| Trader / educator | Where | What they add for this bot |
|---|---|---|
| **Reim FX (Reimfx)**, founder of LIT (2020) | YouTube @ReimFx; lit-trading.com; TradingView "LIT - Timing"; 2020 WWA call notes ("Reims PDF - Inducement Entries") | The exact session boxes (Asia 18:05-01:00, London 03-04, NY 08-09); PDH/PDL/PWH/PWL as targets; "engineered EQH/EQL grabbed by an aggressive run"; "fake POI = no inducement" |
| **Marco Trades** (Chart Fanatics guest; "$500K+ in payouts", self-reported) | Chart Fanatics videos DAnXM7C16h0, T_djSNBmV00; ChartFanatics/Tradezella playbook | NQ futures, NY session; buy below lows / sell above highs only after respect + move away; engineered-liquidity arming; stop covers the taken low; target = opposing respected pool; RR ≥ 3; no R-partials; BE only after highs taken or partials; never before news |
| **Inter Equity Trading** (appears to be Marco) | YouTube, 20+ videos 2026 | Inducing vs trapping sweep; "no LB, no entry"; two-lines doctrine; target-intact stacking; ping-pong days; 10:00 4H model; outside-day brakes; bank holidays off |
| **DreamsFX** (the notes list Instagram griffin_starcher next to the DreamsFX links) | YouTube @dreamsfxtrading; Mastermind bootcamp (notes in the LIT journal repo) | IDM1/2/3; major/medium/minor liquidity; A+/B+ probability scale with partial schedules; entry protocol; $100/$400 risk ladder; "after 3 mitigations don't follow" |
| **PhronesisKnight** | phronesisknightfx.com (notes in the LIT journal repo) | Strong/protected low vs weak high; session liquidity times; "if everybody sees the setup it is the inducement" |
| **BornaFX** | Telegram/Instagram (notes) | BOS needs a body close, CHoCH may be a wick; first CHoCH is inducement; ITF/STF/ETF stack (scalper: 4H / 15m / 1m) |
| **DTFX** | YouTube masterclass (notes) | Manipulation wick = grab + back in range + body closes inside; weak high = failed to run the low first |
| **StoicTA** | X / YouTube | Swing point only after a close beyond; engineering liquidity = inducement = accumulation |
| **TTrades** | YouTube; community TradingView scripts | Protected high/low definition; PDH/PDL daily-bias script (tested: no edge here) |
| **ICT (Michael Huddleston)** | 2016-17 and 2022 mentorships (quoted in `SrsBlack/ict-knowledge-library`) | 1% risk, halve after a loss, back to full after 50% recovery; half-size re-entry; RR ≥ 3; don't carry a weekly loss into the weekend |
| **NicoSelman** | TradingView "LIT - Confirmations" | The LIT confirmation checklist, including "timing" |
| **ysorokin85** | TradingView "LIT_Globas_sys" | IDM-based structure mapping; inside bars ignored; OB must take the prior candle's liquidity and have an FVG |

---

## 6. Where the sources disagree (keep both sides when testing)

- **Breakeven:** after the first opposing high is taken (Marco V2, IET) vs only after partials (Marco V1, playbook) vs +1R (prop
  default, the bot today).
- **Partial size:** 20-25% (Marco V2) vs 50-70% when unsure (Marco V1) vs schedules from 10% to 70% by grade (DreamsFX).
- **Entry:** at market on the stab (Marco), resting limit in the LB/imbalance (IET for forex, Marco for HTF), refined LTF limit
  with small risk first (DreamsFX). The workflow found the confirmed 1m CISD best in 2026.
- **Session:** Reim's London 03-04 and NY 08-09 windows vs Marco/IET "NY after 09:30, out before lunch".
- **Inducement:** structural "first valid pullback" (LIT/SMC) vs "a sweep that creates early participants" (Marco/IET). As coded
  (`idm_a`: a swing within 1 ATR beyond the level, taken by the final run) it is closest to the second.
- **Stop:** strictly beyond the sweep extreme vs sometimes inside the LB vs a deeper left-hand low.
- **Asia box:** Reim 18:05-01:00 vs ICT 20:00-00:00 (the workflow's 2026 test preferred ICT's by a little).

## 7. Sources

Primary and student material (read in full from public GitHub clones):
- Reim's "LIT - Timing" Pine source: https://github.com/rpanchyk/mt5-lit-market-sessions-ind (`docs/LIT_Timing.txt`); original
  https://www.tradingview.com/script/vukoCtAk/
- LIT student journal with DreamsFX, PhronesisKnight, BornaFX, DTFX, StoicTA notes: https://github.com/ah-meisami/LIT-Trading-Journal
  (DreamsFX playlist https://www.youtube.com/playlist?list=PLwd8nEnMy4FmnncIBvsCebIjzglbUG18h ; https://www.youtube.com/@dreamsfxtrading ;
  DTFX masterclass e.g. https://www.youtube.com/watch?v=Xw1CG5HWVts , https://www.youtube.com/watch?v=-O1_MSMVBPc ; StoicTA
  https://www.youtube.com/watch?v=pP3UsqAT_V4 ; https://phronesisknightfx.com/)
- Marco Trades / Inter Equity Trading transcripts, playbook and synthesis: https://github.com/PravinderSamra/CTrader-Bots ("Liquidity
  Trap" folder). Videos: https://www.youtube.com/watch?v=DAnXM7C16h0 , https://www.youtube.com/watch?v=T_djSNBmV00 ,
  https://www.youtube.com/watch?v=aKoGbAe-xTE ; IET: https://www.youtube.com/watch?v=lEsZYpeGNVQ (10:00 4H model),
  https://www.youtube.com/watch?v=GIYrW7FC06M (liquidity blocks), https://www.youtube.com/watch?v=ZLTo-Fct8Ks (ping pong),
  https://www.youtube.com/watch?v=fTAVvXYvhi4 (stacking), https://www.youtube.com/watch?v=HEBP5I3z__c (daily-candle logic),
  https://www.youtube.com/watch?v=x-7H1E4ToC8 (bias, Monday/Friday, holidays), https://www.youtube.com/watch?v=lWTb3oiugDo (two lines),
  https://www.youtube.com/watch?v=x4ZUCA0GO48 (masterclass 3), https://www.youtube.com/watch?v=pQ4WTVQnwBc (no man's land)
- ICT lectures quoted with timestamps: https://github.com/SrsBlack/ict-knowledge-library (`concepts/32-risk-management/`)

Search-engine extracts only (pages could not be fetched):
- ReimFX channel https://www.youtube.com/@ReimFx ; press release
  https://www.prnewswire.com/news-releases/reim-fx-revolutionising-the-trading-game-with-a-unique-method-301894383.html ; reviews
  https://uk.trustpilot.com/review/lit-trading.com ; BabyPips thread https://forums.babypips.com/t/lit-trading-official/1199837
- Reim's 2020 notes: https://www.scribd.com/document/627160987/Reims-PDF-Inducement-Entries ,
  https://pdfcoffee.com/reims-pdf-inducement-entries-pdf-free.html
- LIT - Confirmations: https://www.tradingview.com/script/whsmlREo-LIT-Confirmations/ ; LIT_Globas_sys:
  https://www.tradingview.com/script/elbmhvj5-lit-globas-sys-liquidity-inducement-theorem-smc-idm/ ; LIT scripts list (three-minute
  rule): https://br.tradingview.com/scripts/lit
- LIT courses: https://selar.com/liquidityinducementtheorem , https://udcourse.com/product/lit-trading-course/ ,
  https://faciltrades.odoo.com/slides/1-the-lit-basics-lit-liquidity-inducement-theorem-1
- Inducement concept and its critique: https://www.luxalgo.com/library/concept/inducement/ ,
  https://www.alphaexcapital.com/smart-money-concepts/ict-inducement-and-draw-on-liquidity , https://videohighlight.com/v/e5f-Ua5xbkU ,
  https://videohighlight.com/v/aax5cgjitaw , https://videohighlight.com/v/vbhXQXUEntM
- TTrades: https://www.tradingview.com/script/xdwgV3Fx-TTrades-Daily-Bias-TFO/ ,
  https://vn.tradingview.com/script/ezS0ydMQ-daily-bias-ttrades-x-joshuuu ,
  https://de.tradingview.com/script/ZIDH4WXJ-Hardwaybets-Protected-Highs-Protected-Lows-Trading ,
  https://liquidityscan.io/blog/what-is-a-protected-swing-high-and-low-in-ict
- Session traps: https://sozai.app/transcript/advanced-liquidity-concepts-path-profitability/ ,
  https://www.luxalgo.com/library/concept/session-liquidity.md
- VIX range: https://www.tradingview.com/script/mVcozynO-VIX-Range-Levels-Rule-of-16/ ,
  https://br.tradingview.com/script/eQXycKvv-NQ-Implied-Range-Governor/
- MFFU: https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide ,
  https://myfundedfutures.com/plans/builder , https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified ,
  https://www.quantvps.com/blog/what-is-the-my-funded-futures-daily-loss-limit
- Prop risk: https://reddit.sentinel-team.org/posts/1rdnw9t/snapshots/2026-02-27T22%3A12%3A05.0165Z ,
  https://nexusfi.com/a/prop-firms/evaluation-strategies , https://nexusfi.com/a/prop-firms/scaling-plans ,
  https://propfirmmap.com/blog/understanding-prop-firm-drawdown-rules-complete-guide-2026 ,
  https://it.tradingview.com/chart/BTCUSDT/orDEw7v3-The-Two-Types-of-Risk-Management-Plan ,
  https://curvedtrading.com/articles/en/how/risk-management-beginners/
- Related house notes: `research/lab/TRADER_HEURISTICS.md` (general NQ heuristics, risk R1-R6, management M1-M4),
  `research/lit/spec_sessions.md`, `research/lit/spec_execution.md`.
