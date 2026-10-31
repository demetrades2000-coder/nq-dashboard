## Money first

**Verdict: nothing passes cleanly. Keep ATLAS as it is. Drop the NA day-hold member from the plan. The real money lead is
the two stop hunts on the FUNDED 25K.**

"Slot $" = what one ATLAS 25K slot pays YOU a month over 6 months: the eval, the funded account, MFFU's payouts (80% to
you, the $1,100 buffer, $250-$1,000 a request, the 50% best-day rule, 2 traded days a cycle, 5 payouts = graduated), and a
new $63 eval after every fail, stuck account or graduation. "Eval-path $" = the profit made inside back-to-back evals
less the fees (last night's measure). **Eval profit is never paid out; slot $ is the money.**

| ATLAS 25K | H1 slot $/mo | **H2 slot $/mo** | 2021-25 slot $/mo | H1 / H2 / 2021-25 eval-path $/mo | 2-week pass / dead H1 · H2 · 2021-25 | Gate |
|---|---:|---:|---:|---|---|---|
| **Today** | $568 | **$382** | -$2 | $1,394 / $547 / -$63 | 65.5/0.8 · 43.5/0.0 · 24.6/26.2 | |
| Last night's lead (NA x0.5 + hunts x0.5) | $532 | $488 | $30 | $2,046 / $1,584 / +$159 | **62.2/5.9** · 55.1/0.0 · 31.1/29.0 | fails (H1 eval, H1 slot) |
| The lead fixed: NA only from eval session 11, no NA once funded | $671 | $610 | $30 | $1,923 / $861 / +$45 | 67.2/0.0 · 55.1/0.0 · 25.0/23.9 | passes, = hunts alone |
| **A. Eval = today; once funded + hunts x0.5** | **$661** | **$510** | **$23** | $1,394 / $547 / -$63 (same) | same as today | **passes every numeric gate** |
| A'. Eval = today; once funded + hunts x0.75 | $715 | $528 | $30 | same as today | same as today | passes |
| B. Hunts x0.5 in the eval, x1.0 once funded | $758 | $595 | $30 | $1,655 / $665 / -$4 | 67.2/0.0 · 55.1/0.0 · 25.0/23.9 | passes |
| C. Hunts x0.75 in the eval and once funded | $750 | $650 | $36 | $1,922 / $942 / +$80 | 68.1/0.0 · 59.4/0.0 · 28.2/24.2 | passes (neighbour x0.6 fails H2) |

- **A is the cleanest.** The eval does not change at all (same trades, same 2-week pass and dead), so it cannot make the
  25K eval worse. Once funded, ATLAS also trades the Asia resweep hunt and the trend inducement hunt at half size.
  - +$93 a month in H1, **+$128 in H2**, +$25 in 2021-25 (slot paths).
  - On the real 2026 days (one slot from each half's first session): $866 vs $596 a month in H1, $1,044 vs $414 in H2;
    2025 +$70 vs -$36, 2021-24 +$33 vs +$23.
- **Why it is not an adopt-candidate:**
  - The hunts' rules were picked on H1 + 2025 + 2021-24 from 28.7 million variants (`stophunt.md`). So H1 and 2021-25 are
    not clean checks for them; only 2026 H2 is.
  - Of A's H2 gain, the trend hunt alone brings +$91 a month, the Asia hunt alone +$16 (noise). The stop-hunt audit called
    the trend hunt "not real", and it needs a 30-minute limit entry that account B cannot place yet.
  - In its favour: in H2 (the clean span) 12 random-time twins of the hunts average a $246 slot (worse than today), and
    none reaches A's $510.
- **B and C make more on the slot paths, but they change the eval** (the atlas-v2 lead). Their single real H2 path is worse:
  the eval started on 2026-07-01 with the hunts never passes inside H2 (-$34 a month vs today's +$414). A keeps today's eval
  and has no such hole.
- **Funded rules do nothing worth switching.** These move the slot by about +-$30 a month or make it worse:
  - buffer-first size, and a $1,000 cap after the lock;
  - other payout ask lines and other winner caps;
  - the 50% best-day size cap;
  - giving up a funded account sooner;
  - a day take-profit or a day stop.

  MFFU's payout rules limit what comes out, not the size. Keep today's funded preset.

**Frequency and risk** (the slot on the real days, eval + funded trades together; A vs today):

| | trades / week | weeks with 2+ | PF | net $ | $ / month traded | max DD | payouts in 6 mo (slot paths) | slot paths that lose |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H1 today / **A** | 3.79 / **5.12** | 92.6 / 96.3% | 3.03 / 3.23 | $13,828 / $16,484 | $2,267 / $2,702 | -$1,032 / -$926 | 4.45 / 5.18 | 6.7 / 5.7% |
| H2 today / **A** | 2.88 / **5.19** | 75.0 / 87.5% | 2.88 / 3.02 | $5,779 / $9,114 | $1,558 / $2,457 | -$1,175 / -$1,071 | 3.01 / 4.01 | 18.0 / 18.0% |
| 2025 today / **A** | 3.35 / 3.95 | 77.4 / 77.4% | 1.19 / 1.11 | $2,775 / $1,613 | $226 / $131 | -$3,154 / -$4,449 | 0.48 / 0.56 | 69.3 / 67.3% |
| 2021-24 today / **A** | 3.88 / 5.00 | 87.9 / 87.3% | 1.07 / 1.03 | $3,972 / $1,855 | $102 / $48 | -$9,173 / -$8,885 | 0.37 / 0.58 | 73.7 / 64.7% |

The trading $ is the money made on the accounts (most of it is never paid out); the slot $ above is what MFFU pays you.
In 2025 / 2021-24 A trades less profitably on the real path but gets more payouts and fewer losing slots: the hunts make
the funded account reach the payout line more often, while the extra trades lose a little in between.

**The 25K eval for A = today's ATLAS** (the change is funded-only): 2-week pass / fail 65.5 / 0.0 (H1), 43.5 / 0.0 (H2),
30.1 / 0.0 (2025), 22.9 / 0.0 (2021-24); dead (fail + stuck) 0.8 / 0.0 / 23.3 / 27.1; decided in 2 weeks 66.3 / 43.5 /
53.4 / 50.0; 4-week pass / fail 76.1 / 0.0, 61.0 / 0.0, 33.9 / 0.0, 26.4 / 0.0; median sessions to pass 5 / 6 / 4 / 4;
passes slower than 3 weeks 4.3 / 13.3 / 2.4 / 3.3%.

## What was tested (written down before the runs)

| # | Direction | Idea | Variants | Result |
|---|---|---|---:|---|
| S1 | 1 | the extras (NA + hunts) only from eval session N (2-11) | 7 | rejected: H1 dead up or slot down |
| S2 | 1 | the extras at x0.25 before session N, x0.5 after | 3 | rejected: H1 pass down |
| S3 | 1 | hunts always, NA only from session N | 4 | rejected: slot down (NA still trades funded) |
| S4 / S5 | 1 | the extras / NA only while the room is >= $X | 8 | rejected: slot down |
| S6 | 1 | the extras off once the room is >= $X | 3 | rejected: H1 dead 5.9% |
| E1 / G1 / G2 | 1 | NA in the eval only (from session N / room >= $X), the funded account with the hunts only | 6 + 33 | pass vs today (20 of 33), **0 of 33 beat the hunts alone** |
| E3 | 1 + 2 | eval = today, the hunts added once funded (x0.4-1.0) | 5 | **5 of 5 pass** |
| E4 / E5 | 1 + 2 | hunts in the eval (x0.4-0.75) and once funded (x0.4-1.0) | 3 + 8 | all pass except the 3 with x0.6 in the eval (1 stuck H2 eval) |
| E2 | 1 + 2 | sh_asia only (market entry, routable today) | 6 | eval + funded fails H2; funded-only x0.5 / x0.75 pass, H2 +$8-16 (noise) |
| F1 | 2 | buffer-first: 30-60% of the room until the floor locks at start + $100, 60-80% after | 7 x 2 | noise or worse |
| F2 | 2 | the same with a $1,000 cap after the lock | 4 x 2 | noise (+$3 in H2) |
| F3 | 2 | ask for a payout at $250 / $500 / $1,000 / $1,500 above the buffer (live $750) | 4 x 2 | $750 stays best |
| F4 | 2 | funded winner cap $750 / $1,500 (live $1,000) | 2 x 2 | worse in H2 ($750: -$92 a month) |
| F5 | 2 | the 50% best-day rule in the size (`cons_aware`, always / after the 1st payout) | 2 x 2 | noise |
| F6 | 2 | give up a funded account under $200 / $300 / $400 of room (live $100) and buy the next eval sooner | 3 x 2 | worse |
| F7 | 2 | funded day take-profit: no new entry once the day is +$300 / $400 / $500 / $750 | 4 x 2 | noise (+$4 a month) |
| F8 | 2 | funded day stop at -$200 / $300 / $400 (live: the $600 soft daily loss) | 3 x 2 | worse or flat |
| W / D | 3 / 4 | per-member windows, member day limits (run before the scope change, not pursued) | 7 + 4 | see the end |

Gate (strict, the owner's): in H1 (pick), H2 (check) and 2021-25 (reference) all of - the 2-week pass not lower and dead
evals not higher than today (2021-25: pass minus dead not lower); the eval-path $ and the slot $ not lower, one of them
higher; 2+ candidate trades a week. A funded-only change keeps the eval by construction, so it needs a higher slot $ in all
three spans. Costs in everywhere: $1.90 a micro round trip, 1 tick on market and stop fills (tools/second_mix), CME NQ1!
TradingView exports only (1m 2026, 5m 2021-25).

## 1. Fixing last night's lead (the hunts + the NA day-hold member)

**What was wrong with it.** It looked better because of eval-path $ (profit inside evals). On the slot, H1 pays $532 a month
against today's $568. The funded account is where it loses:

| Funded 25K, 6 months (1,000-path funded simulator, tools/atlas_funded.mc) | H1 $/mo | H2 $/mo | stuck in 6 mo H1 / H2 | payouts a month H1 / H2 | trading profit a month H1 / H2 |
|---|---:|---:|---|---|---|
| today's ATLAS | $593 | $520 | 6.7 / 7.3% | 0.75 / 0.66 | $1,610 / $1,430 |
| + hunts x0.5 | **$629** | **$596** | 3.3 / 8.7% | 0.79 / 0.75 | $1,648 / $1,565 |
| + hunts x0.5 + NA x0.5 | $438 | $447 | **32.0 / 28.0%** | 0.56 / 0.56 | $1,158 / $1,496 |

The NA member holds a trend trade to the close and wins only 26-30% of the time. On a funded 25K its losses eat the $1,000
room before the floor locks at start + $100, and the account gets stuck (the bot stops under $100 of room).

**Schedules on the eval state (families S1-S6).** Turning the extras on only from eval session N, at a lower weight early,
only while the room is above $X, or off once it is: 0 of 25 pass. With NA still on the funded account, every one has a
lower H1 slot than today.

**NA in the eval only, never once funded (E1, G1, G2).** This passes the gate in 20 of 33 neighbours:

- NA from eval session 11 or 14, at any NA weight x0.25-0.75, with the hunts at x0.4-0.5;
- NA from session 8 with the hunts at x0.5;
- NA only while the room is >= $1,200-1,500.

Every neighbour with the hunts at x0.6 fails: one stuck H2 eval of 69. Example, NA from session 11: 67.2 / 0.0,
55.1 / 0.0, 25.0 / 23.9; slot $671 / $610 / $30.

**But against the hunts alone it wins 0 of 33.** At hunts x0.5, the NA member moves the slot by -$19 to +$7 a month. Late in
an eval NA adds a little eval-path $, and that is not money. **Drop the NA member from ATLAS v2.**

## 2. Funded-stage money

**Members matter, the size does not.** On today's funded account:

| Funded rule (eval = today) | H1 slot | H2 slot | 2021-25 slot | H2 payouts in 6 mo |
|---|---:|---:|---:|---:|
| live preset: 60% of the room, <= $750, a winner <= $1,000, ask at $750 above the buffer | $568 | $382 | -$2 | 3.01 |
| buffer-first 40% -> 60% after the lock | $561 | $372 | $0 | 2.93 |
| buffer-first 60% -> 80%, $1,000 cap after the lock | $600 | $385 | $0 | 3.04 |
| ask at $250 / $1,500 above the buffer | $557 / $540 | $371 / $357 | -$2 / -$10 | 3.07 / 2.78 |
| winner cap $750 / $1,500 | $573 / $568 | **$290** / $348 | -$1 / -$7 | 2.35 / 2.74 |
| 50% best-day rule in the size (cons_aware) | $561 | $387 | $6 | |
| give up a funded account under $200 / $400 of room (live $100) | $567 / $549 | $377 / $353 | -$5 / -$20 | |
| day take-profit: no new entry once the day is +$400 | $572 | $388 | $0 | |
| day stop at -$200 (live: the $600 soft daily loss) | $560 | $371 | -$3 | |
| **+ the hunts x0.5 once funded (A)** | **$661** | **$510** | **$23** | **4.01** |
| + the hunts x0.75 once funded (A') | $715 | $528 | $30 | 4.15 |
| + the hunts x1.0 once funded | $735 | $466 | $29 | |
| + sh_asia only x0.5 once funded (market entry) | $691 | $398 | $15 | |
| + sh_trend only x0.5 once funded (limit entry) | $590 | $473 | $14 | |

- The two size rules that "pass" on today's account (60% -> 80% after the lock, with or without a $1,000 cap) gain +$6 to
  +$32 / +$1 to +$3 / +$2 a month: that is path noise (a second path set moves today's slot by up to $16).
- The day take-profit "passes" on today's account by +$4 / +$3 to +$7 / +$1: ATLAS rarely takes a 2nd trade after a
  +$300 day. On top of A it costs H2 up to -$34.
- Giving up a funded account sooner buys more evals and pays less in every span.
- On top of A, the same rules move the slot by -$47 to +$28 a month. Only "60% -> 80%, $1,000 cap after the lock" beats A in
  all three spans (+$28 / +$12 / +$2): noise again.
- **Graduation at 5 payouts** is not changed: the simulator buys a new eval after a graduation (MFFU's live stage is not
  modelled), so every slot $ here is conservative for 2026-like markets.

**Checks on A (eval = today, funded + hunts x0.5):**

- **Neighbours:** funded weights x0.4 / 0.5 / 0.6 / 0.75 / 1.0 all pass (slot H1 $637-735, H2 $466-528, 2021-25 $15-30).
- **Random-time hunts** (`tools/atlas_v2.placebo_members`: each hunt's own mechanics, a random 5m signal bar of the same
  session bucket in a random session of the span, 12 draws, + the flipped twin): 0 of 12 pass. Their slot averages $489 /
  $246 / -$8 a month (A $661 / $510 / $23); 8% / 0% / 0% of draws reach A. The flipped twin: $589 / $256 / -$21.
  Extra trades as such do not pay; the hunts' trades do.
- **A second set of 500 slot paths (seed 7):** today $580 / $398, A $675 / $528 (H1 / H2); 2025 $14 -> $30, 2021-24
  -$18 -> +$6.
- **Each reference year (200 paths):** 2022 -$22 -> -$15, 2023 $23 -> $38, 2024 -$16 -> $15, 2025 $15 -> $19 a month.
  Better every year, but ATLAS's funded 25K still makes almost nothing outside 2026 (65-74% of slots lose their eval fees).
- **B and C on the same checks:**
  - seed 7: B $766 / $605 / $68 / $27, C $764 / $674 / $67 / $30 a month (H1 / H2 / 2025 / 2021-24);
  - each year 2022-25: B -$10 / $50 / $36 / $56, C -$18 / $49 / $45 / $64. Both are better than today every year.
  - Their weak spot is the eval with the hunts in it: the x0.6 neighbours fail H2 (1 stuck eval), and the real H2 path
    never passes.
- **What it needs before it can be built** (owner decides; nothing built):
  - account B must route the stop-hunt members in the FUNDED stage only. Today they are `"candidate": true` and never
    routed (`engine/second.py`), and account B has one member list for both stages;
  - the trend hunt needs a 30-minute limit entry at mid-candle; account B sends market orders only. Without it, A is
    "sh_asia only", which is noise in H2;
  - the hunts' paper scorecard (`research/second/atlas_v2_scorecard.json`) says decide after 20+ hunt trades.
  - Config shape it would take: `account_b` `"funded_members": {"sh_asia": 0.5, "sh_trend": 0.5}` (new key: members that
    trade only once `"stage": "funded"`, each at that share of the funded size, never above it), eval members unchanged.

## 3 and 4. Windows and day limits (run before the scope change, handed over)

At 13:00 the coordinator moved directions 3 (windows) and 4 (entry execution) to another agent. Two families had already
run; they are recorded, not pursued.

- **Per-member worst H1 window, with a shuffled-bucket control (7 rows):** one passes the numeric gate. On the NA + hunts
  lead, no NA entry in the 10:00-10:59 hour and none on Mondays: 76.5 / 0.0, 56.5 / 0.0, 28.8 / 25.0; slot $802 / $706 /
  $44. In H2, 0 of 12 random-bucket drops reach its eval-path $.
  - But NA's 10:xx entries are positive outside H1 (avg R +0.24 in H2, +0.26 in 2025, +0.21 in 2021-24, vs -0.65 in H1).
  - The pick removes NA's biggest bucket (43 of 98 H1 NA trades), and NA still trades on the funded account.
  - A count-matched random control was not run. Left to the windows agent.
- **Day limits for the extras** (never after a losing trade today, only as the day's first trade; for the extras or for
  NA): 0 of 4 pass. H2 dead evals go up to 7-9%, or H1 passes go down.

## Round 2 (13:20-15:05 ET): config A without sh_trend, funded member subsets, BLITZ on the funded 25K

The coordinator asked for three things:
1. Config A without the trend hunt (the audit calls it not real): the eval stays today's, the funded stage adds sh_asia only.
2. Which ATLAS members should trade the funded stage, picked on H1 only.
3. BLITZ as a funded-only member.

Every number here is the mean of 20 seeds x 200 slot paths (items 2 and 3: 10 seeds), paired on the same paths. Runs are
`atx2_*`.

**Verdict, round 2:**
- The clean config A passes the slot gate in H1, H2 and 2021-25 on 20 of 20 seeds at x0.4 / 0.5 / 0.75.
- The H1-only member pick lands on exactly this member set.
- But the clean span's gain is small: **H2 +$26 a month** at x0.5 on the slot paths, and **$0 on the real 2026 calendar
  path**.
- It is the lowest-risk change in this study (the eval does not move) and pays little. **Promising, not adopt.** The owner
  decides.

### Item 1: eval = today; once funded + sh_asia only

| Funded 25K adds | H1 slot $/mo | **H2** | 2021-25 | 2022 | 2023 | 2024 | 2025 | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| nothing (today) | $574 | **$374** | -$7 | -$25 | $2 | -$13 | $10 | |
| sh_asia x0.4 | $681 (+107) | $392 (+19) | $0 (+6) | -$9 (+16) | -$2 (-4) | -$10 (+3) | $16 (+6) | passes |
| **sh_asia x0.5** | **$697 (+124)** | **$399 (+26)** | **$4 (+11)** | -$6 (+20) | $1 (-1) | -$4 (+9) | $20 (+10) | **passes** |
| sh_asia x0.75 | $745 (+172) | $403 (+29) | $10 (+17) | $0 (+26) | $6 (+4) | $5 (+18) | $31 (+21) | passes |
| sh_asia x1.0 | $772 (+198) | $364 (-10) | $14 (+21) | $9 (+34) | $4 (+2) | $7 (+20) | $38 (+28) | fails H2 |

- **x0.5, share of the 20 seeds above today:** H1 100%, H2 100%, 2021-25 100%; 2022 100%, 2023 30%, 2024 90%, 2025 95%.
- **Random-time control** (12 random-time copies of sh_asia at x0.5, 4 seeds each; flipped twin):

  | | sh_asia x0.5 | random-time copies (mean) | copies >= sh_asia | flipped twin |
  |---|---:|---:|---:|---:|
  | H1 | $704 | $532 | 0 of 12 | $531 |
  | H2 | $404 | $306 | 1 of 12 | $296 |
  | 2021-25 | -$1 | -$14 | 0 of 12 | -$33 |

  Random extra trades make the funded account worse than today. sh_asia's own trades are what help.
- **The real 2026 calendar path** (one slot from each span's first session), $ a month:

  | | today | x0.5 | x0.75 |
  |---|---:|---:|---:|
  | H1 | $596 | $625 | $881 |
  | H2 | $414 | $414 | $160 |
  | 2025 | -$36 | -$31 | +$22 |
  | 2021-24 | +$23 | -$1 | +$10 |

  - On the one real path, H2 is unchanged at x0.5 (the same 2 payouts) and worse at x0.75.
  - Single paths are noisy; the paired 20-seed numbers above decide the gate, but the clean H2 gain is small.
- **Trades a week on the slot** (real path, eval + funded): H1 3.79 -> 4.18, H2 2.88 -> 4.74.

**Can account B route sh_asia? Not today.**

- **The entry is fine:** a market order at the next 5m open + 1 tick (`second_model.json` sh_asia `"entry": "mkt"`). No
  limit is needed, unlike sh_trend.
- **The hours block it:**
  - account B's guard calls `guards.calendar(entry_t, now, session_from=120, flat_mod=955)` without `all_hours`, so every
    entry before 02:00 ET is refused, and sh_asia enters 18:00-02:00;
  - it needs the all-hours calendar LIT's Asia slot uses (`all_hours=True`, `session_from=1080`) for this member;
  - the CME trading-day count must stay as it is: an 18:00-24:00 entry belongs to the next date's session, B's day label is
    already ET + 6 h, and max 2 a day counts on that day;
  - the 15:55 flat stays: an sh_asia trade can be held overnight to 2R, the stop, BE or 15:55.
- **The candidate flag blocks it:** sh_asia is `"candidate": true`, and `engine/second.load_cfg` forces it to paper. Account B
  also has one `strategies` list for both stages.
- **Anti-hedge against LIT:**
  - LIT's entries and armed setups run 02:00-15:30 (LIT `all_hours` is off), so nothing of LIT's is armed when sh_asia
    enters;
  - an sh_asia trade still open after 02:00 is handled by today's rules: `AccountB.lit_opposite` blocks new B entries only,
    and LIT entering the other way closes B first (HEDGE), which the research models;
  - if LIT's Asia slot is ever turned on, its evening setups need the same armed-window block (the research's armed windows
    cover 02:00-15:30 only).
- **The PC bot must route it:** the cloud monitor has no evening runs. The PC bot already computes the hunts every bar 24/5.
- **Config shape (new keys, not built):** `"account_b": {..., "strategies": ["ema_lon_vix", "macd_sweep", "sr_nyreclaim"],
  "funded_members": {"sh_asia": 0.5}}`. The member trades only in `"stage": "funded"`, at 0.5 x the funded size (never more).
  engine/account_b would need a per-member calendar (all hours for sh_asia) and would have to allow a candidate member in
  the funded stage only.

### Item 2: which members trade the funded stage (picked on H1 only)

The rule was fixed first: the subset of EMA / MACD / S/R / sh_asia x0.5 with the highest 2026 H1 slot $, eval unchanged,
10 seeds x 200 paths. The pick was frozen in `research/second/atx2_subset_pick.json` at 13:25 ET, before any H2 or 2021-25
number of the 15 subsets was computed.

One caveat for strictness: this pick's own H2 slot had already been seen in round 1 (E2, $398). The rule itself (the
highest H1) was mechanical.

| Funded members (eval = today) | H1 (pick) | H2 | 2021-25 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|---:|---:|
| **EMA + MACD + S/R + sh_asia (the H1 pick)** | **$696** | **$400** | **$0** | -$6 | $2 | -$4 | $21 |
| EMA + S/R + sh_asia | $647 | $386 | -$3 | -$25 | $47 | -$14 | $11 |
| EMA + MACD + S/R (today) | $569 | $375 | -$9 | -$25 | $6 | -$13 | $12 |
| MACD + S/R + sh_asia | $549 | $210 | $8 | $11 | -$22 | $32 | $32 |
| EMA + S/R | $504 | $323 | -$8 | -$31 | $36 | -$16 | $5 |
| the other 10 subsets | $72-483 | $22-342 | -$24 to +$11 | | | | |

- **The pick ranks 1st of 15 in H2 and 5th of 15 in 2021-25.** It passes the gate. Of its neighbours only "EMA + S/R +
  sh_asia" (no MACD once funded) also passes, and it pays less.
- **Dropping EMA or S/R from the funded account costs H2 $33-353 a month.** Keep all three members once funded; sh_asia is
  the only addition that helps.
- The pick is the same account as item 1 at x0.5 (run `atx2_funded_asia_w05`).

### Item 3: BLITZ as a funded-only member

How it was simulated:
- **BLITZ's trades:** `tools/blitz25k_lib.trades({}, "lit+atlas")`, 1m in 2026 and 5m in 2021-25; 2,164 trades, 323 in 2026.
- **Size:** BLITZ's own funded size (min($150, 10% of the room) x the weight, <= 0.9 x the soft daily loss left, 1 micro
  while a stop-out fits half the room), or always 1 micro.
- **Day rules:** its own 6 a day and the +$400 day take-profit. ATLAS's members keep their max 2 a day.
- **One position:** BLITZ trades only while no other ATLAS trade is open.
- **The eval is unchanged.**

| Funded 25K adds | H1 slot $/mo | H2 | 2021-25 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|---:|---:|
| nothing (today) | $569 | $375 | -$9 | -$25 | $6 | -$13 | $12 |
| BLITZ x0.5 (= 1 micro almost always) | $756 (+186) | $395 (+19, 90% of seeds) | -$7 (+2, 70%) | -$12 (+12) | $3 (-2) | -$18 (-5, 0% of seeds) | $14 (+2) |
| BLITZ x1.0 | $753 (+183) | $410 (+35, 100%) | -$6 (+3, 70%) | -$12 (+12) | $6 (+0) | -$20 (-7, 0%) | $15 (+4) |
| BLITZ 1 micro | $755 (+186) | $395 (+19) | -$7 (+2) | -$13 (+12) | $3 (-3) | -$18 (-5) | $14 (+2) |

- **Random-direction control** (BLITZ's own placebo: the same signal bars with a coin-flip side, 6 draws x 4 seeds, x0.5).
  Random-time copies would need a re-simulation that blitz25k_lib does not offer.
  - H1: $762 real vs $530 random, 0 of 6 reach it.
  - H2: $401 real vs $325 random, **2 of 6 reach it**.
  - 2021-25: -$9 real vs -$16 random, 0 of 6 reach it.
- **The real calendar path:** H1 $1,017 vs $596 a month, **H2 $182 vs $414**, 2025 -$31 vs -$36, 2021-24 $28 vs $23.
- **Verdict: rejected.**
  - It passes the paired mean gate, but only by noise outside H1: 2021-25 +$2-3 on 70% of seeds, and 2024 is below today on
    every seed.
  - Its H2 gain is matched by random-direction BLITZ in 2 of 6 draws.
  - The one real H2 path pays less.
  - BLITZ belongs on its own 25K (account C) or as LIT's funded add-on, not on ATLAS's funded account.
- Runs `atx2_funded_blitz_w05`, `atx2_funded_blitz_1micro`.

## Honesty checks

- **The baselines reproduce:** today's ATLAS 65.5 / 0.8, $8,504 eval path (H1), 43.5 / 0.0, $2,029 (H2) = atlas-v2.md;
  last night's lead 62.2 / 5.9, $12,482 = run ab_atlas_na_hunts_lead.
  - The funded simulator is tools/atlas_funded.account stepped day by day: today's funded H1 $593 / H2 $520 on 300 paths
    vs $582 / $517 on its 1,000 in atlas-funded.md.
  - Stepped vs the original on the same 120 funded paths (H1 / H2 / 2025): 0 differ in $ paid.
- **Same paths for every variant** (common random numbers): the slot differences are paired, not two independent draws. A
  second path set moves the slot by $10-25.
- **No look-ahead:** the schedule uses the eval tracker's own numbers at the entry (session number, room with the day's
  closed P&L). The funded size uses only the account's own past.
- **Multiple testing:** 171 variant rows, plus 26 placebo rows and 84 window-control rows:
  - sched 30, stage 22, round 4 39, funded 34, give-up / day limits 20;
  - e4 grid 8, finalists 7, windows 7, day limits 4.
- **Not modelled:**
  - MFFU's live stage after 5 payouts;
  - the second funded 25K (MFFU allows 2 a person; BLITZ is planned for the other);
  - the hunts' limit fills on account B;
  - the NA member's bar path (an opposite LIT entry drops the whole NA trade, conservative).

## What is left

- **Nothing to switch.** Keep `second_model.json` / `account_b` as they are.
- **Paper:**
  - in the ATLAS v2 paper shadow (`engine/atlas_v2.py`), track the hunts on the funded stage too (today it tracks an eval
    only);
  - **do not add the NA member**;
  - once 20+ paper hunt trades exist, re-run `python -X utf8 tools/atx_edge.py final` and `checks` with the new months
    as a clean check.
- **If the owner wants A built later:**
  - account B needs stage-specific members (`funded_members`) and the stop-hunt plugin routed on account B;
  - the trend hunt needs a limit-entry route;
  - then a Sim week.
- **The routable version (round 2):** only sh_asia once funded (`"funded_members": {"sh_asia": 0.5}`). It needs:
  - an all-hours calendar for that member on account B (entries 18:00-02:00, `session_from` 1080);
  - a candidate member allowed in the funded stage only;
  - routing from the PC bot.

  It is worth about +$26 a month on the clean H2 check. Build it only if ATLAS's funded 25K actually exists.

## Files

- **Code:** `tools/atx_edge.py`. Commands:
  - `base`, `sched`, `stage`, `round4`, `e4grid`, `funded`, `fmin`, `placebo`, `why`, `final`, `checks`, `save`;
  - `win` and `maxd` (directions 3 and 4, before the scope change);
  - round 2: `r2a` (sh_asia once funded), `r2b_pick` then `r2b_check` (funded member subsets, the pick frozen first), `r2c`
    (BLITZ), `save2`.
- **Results (`research/second/`):**
  - `atx_base.json`, `atx_sched.json`, `atx_stage.json`, `atx_round4.json`, `atx_e4grid.json`, `atx_funded.json`,
    `atx_fmin.json`, `atx_placebo.json`, `atx_why.json`, `atx_final.json`, `atx_checks.json`, `atx_win.json`,
    `atx_maxd.json`;
  - round 2: `atx2_asia.json`, `atx2_subset_pick.json`, `atx2_subset_check.json`, `atx2_blitz.json`.
- **Runs:** `research/runs/atx_*.json` and `atx2_*.json`. Trades = the slot on each span's real sessions (eval + funded trades, tagged
  `atlas-eval:<member>` / `atlas-funded:<member>`). The slot-path numbers are in each run's verdict.

Paper research only. Nothing in `engine/`, `second_model.json`, `live_model*.json` or `data/` was changed.
