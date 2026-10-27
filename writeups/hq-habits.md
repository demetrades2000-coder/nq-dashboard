## In one minute (owner summary)

- **Your question:** do the habits that successful traders swear by make LIT more money? Four were tested: (1) stay out
  around big news, (2) risk the house's money when you are up and less when you are down, (3) slow down after a losing streak,
  (4) a weekly self-check that cuts the weekday or hour that has been losing.
- **Short answer: none of them makes money that holds up. Adopt none.**

| habit | best version | 2026 money (LIT rule) H1 / H2 | 50K eval path H1 / H2 | 50K 2-week pass/fail H1 · H2 | verdict |
|---|---|---|---|---|---|
| live LIT today | - | +$33.7k / +$9.4k | +$34.3k / +$9.1k | 57.1/5.9 · 52.2/0.0 | - |
| 1. news blackout | no new entry 15 min around CPI / NFP / FOMC / PCE / GDP | **+$0.5k** / same | +$4.4k / same | 57.1/4.2 · 52.2/0.0 | passes the gate on **1 trade**: not evidence, harmless |
| 2. house money | two_week + 25% of the eval profit as extra risk | (sizing only) | +$4.4k / +$0.9k | 55.5/**6.7** · 52.2/0.0 | no: more fails, fewer passes |
| 3. cool-off | half size after 2 losses in a row (reset on any non-loss) | +$0.7k / **-$0.8k** | +$4.1k / +$0.2k | 54.6/**0.0** · 52.2/0.0 | no: H2 money down; the weekly loss stop already does the safety part |
| 4. weekly self-check | halve a losing weekday, learning from 2021-25 | **-$3.2k / -$0.9k** | -$11.3k / -$2.0k | 44.5/0.0 · 53.6/0.0 | no: learns the wrong lesson from old years |

- **Why the news blackout does almost nothing:** LIT takes 95 of its 120 trades of 2026 between 02:00 and 08:00 ET, before the
  08:30 releases. In all of 2026 only **one** trade filled within 15 minutes of a release (May 8, NFP day, 08:23, a -$486 stop-out)
  and **none** in July-October. Skipping it is +$486 on the LIT rule. On the eval path that one trade is worth +$4.4k on the live
  sizing but **-$10.5k** on the scale-in set (the whole chain of back-to-back evals shifts by one trade). One trade can't prove a
  rule. If you like the comfort of "no entries at 08:30 on NFP / CPI days", it costs nothing measurable: ~1 trade a year.
- **House money:** today's two_week sizing already sizes from what is left to the target and from the room to the floor. Adding
  25-50% of the profit on top makes a bit more money on the 50K (+$4.4k / +$0.9k) and on the 25K (+$5.5k / +$0.4k), but every
  base gets more 2-week fails or fewer 2-week passes. Shrinking the size when the eval is below start (a 25K at -$300 trades
  70% size) **costs up to 15 points of 2-week passes**, because a smaller winner no longer passes. Classic house money without
  two_week halves the passes (57 -> 35, 52 -> 28).
- **Cool-off:** halving after 2 losses in a row does pick worse-than-random trades in H1 (98th percentile against random
  halving of the same 18 trades), but in H2 it is a coin flip (50th-63rd percentile) and loses $835 on the LIT rule. Its one
  good side, 50K H1 2-week fails 5.9% -> 0.0%, is exactly what the hq-lit weekly loss stop already gives (the combo base has
  0.0% fails without it). Waiting for a real win (>= +0.5R) before going back to full size is clearly worse (-$3k / -$2.5k).
- **Self-check:** learning only from 2026 changes nothing: no weekday or hour reached 15 trades with a loss in 2026. Learning
  from all trades since 2021 halves Thursday all year and Monday until April (or the 02 / 05 / 10 o'clock hours), because those lost in
  2021-25. That costs $3-7k in H1 and about $1k in H2, and helps only the 2021-25 reference line (+$5k), which is the known
  "2026 is not 2021-25" split.
- **Honest count:** 18 variants x 3 bases = **54 tests**. 8 pass the pre-declared gate, all of them news blackouts (15 or 30
  min) on the live and the no-scale-in base, and all on the same 1-2 trades of H1 with nothing changed in H2. No other test
  passes.

## Method

- **Bases** (every rule is scored on each):
  1. `live` = today's live LIT (`live_model.json` "lit", two_week sizing).
  2. `combo` = the hq-lit candidate set without scale-in: `cisd1m 22` + `room_f 0.55` + `wk_loss_usd 1200`.
  3. `combo_scale` = the same + scale-in `{"pb":0.25,"f":1.0,"rat_k":1.0,"min_rk":2.0,"n":1}`.
  The 25K plan gets the same set scaled: room 50% -> 45%, weekly loss stop $600.
- **Money views:**
  - LIT size rule: $800 up to a 20-pt stop, then 800x20/stop, max 40, weekly stop, $1.90 a micro + 1 tick (as `hq_lit.py`).
  - Eval path: the live two_week sizing (`engine/sizing.lit_qty`, two_week for 10 sessions then safe_eval, no reset), the
    eval weekly loss stop state, back-to-back evals per half. MFFU Builder 50K ($3,000 target, $2,000 trailing, $1,000 soft daily
    loss, 40 micros) and Builder 25K (the `engine/account_b` preset: $1,500 / $1,000 / $600, 20 micros, 50% room, the soft daily
    loss guard on every trade, "stuck" at room < $100 counted as a fail).
  - The generic eval runner in `tools/hq_habits.py` reproduces `tools/hq_lit.py` exactly: live 50K +$34,253 57.1/5.9 and
    +$9,059 52.2/0.0; combo 50K +$29,827 57.1/0.0 and +$9,780 52.2/0.0.
- **Gate (pre-declared, against the same base without the rule):** LIT rule H1 net higher and H2 net not lower (rule 2 is
  sizing only: eval path alone); 50K eval path H1 net higher, H2 net not lower, 2-week fails not higher in either half,
  2-week passes not lower in H2; 2+ trades a week in both halves.
- **No look-ahead:** the news windows are fixed release times; the cool-off uses only trades already closed (LIT is one trade
  a day); the self-check is decided on Sunday from trades of earlier weeks only; the cushion uses only the closed eval balance.
- **Placebo:** for every gate pass (and the cool-off near miss), the same number of trades per half, chosen at random, get the
  same treatment (dropped or halved), 200 draws.

## 1. News blackout

**Calendar** (`research/hq/news_calendar.csv`, 234 rows, built by `tools/hq_habits.py`):

- **FOMC** statement 14:00 + press conference 14:30, 2021-2026: federalreserve.gov FOMC calendars (from `data/news/events.csv`).
- **CPI and NFP (Employment Situation)**, 08:30, Oct 2023 - Oct 2026: bls.gov release archives (`data/news/events.csv`; the
  2025-26 dates include the shutdown delays). The Oct 14 2026 CPI comes from the repo's Forex Factory archive.
- **NFP before Oct 2023:** the BLS schedule rule (the third Friday after the reference week that holds the 12th). This matches
  every BLS date the repo has from 2023-10 on, but a holiday shift before that may be off by a week. CPI before Oct 2023 is not
  in the calendar, so the 2021-25 reference line is a partial calendar.
- **GDP and PCE (Personal Income & Outlays), 2026:** bea.gov release schedule and release pages. 08:30 on Feb 20, Mar 13,
  Apr 9, Apr 30, May 28, Jun 25, Jul 30, Aug 26 and Sep 30. Jan 22 had GDP at 08:30 and PCE at 10:00 (the post-shutdown
  schedule). None before 2026 (reference only).
- **Window:** a new fill within X minutes before or after a release. Skip = the engine is re-run with those setups removed, so
  a later setup of the same day can still trade (it happened once: May 28, 09:22, -$234). Half = the same trades at half size.

| variant (live base) | 2026 trades touched (H1 / H2) | LIT $ vs live H1 / H2 | 50K eval $ vs live H1 / H2 | 25K eval $ vs live H1 / H2 | 2021-25 vs live |
|---|---|---|---|---|---|
| skip 15 min | 1 / 0 | +$486 / $0 | +$4.4k / $0 | -$0.2k / $0 | -$2 |
| skip 30 min | 2 / 0 (+1 later setup) | +$252 / $0 | +$1.9k / $0 | -$0.1k / $0 | +$641 |
| skip 60 min | 3 / 0 | -$1.6k / $0 (skips a +$2.1k winner on Jan 22) | +$1.3k / $0 | -$3.2k / $0 | +$783 |
| half 15 min | 1 / 0 | +$278 / $0 | +$1.7k / $0 | -$0.2k / $0 | $0 |
| half 30 min | 2 / 0 | +$278 / $0 | +$1.7k / $0 | -$0.2k / $0 | +$370 |
| half 60 min | 3 / 0 | -$931 / $0 | -$1.6k / $0 | -$1.4k / $0 | +$367 |

- **Placebo:** dropping 1 random H1 trade instead of the NFP one: the real result is at the 96th percentile on money, simply
  because the NFP trade was a loser (about 1 random trade in 3 is a stop-out of similar size). With 1-2 trades there is no
  statistical test that can tell a rule from luck, and H2 has nothing to test at all.
- **On the scale-in set** the same single skip turns the 50K eval path from +$53.6k to +$43.1k in H1. This is path luck: one
  trade fewer changes which day each later eval starts. It is a good reminder that eval-path money moves by $5-10k on one trade.

## 2. House-money / cushion sizing

Variants (eval path; the LIT-rule column is a funded-style running balance, extra size capped at 2x):

- `cush_hm25` / `cush_hm50`: two_week size + 25% / 50% of the eval profit (closed balance + today) as extra risk, inside the
  plan's room cap, soft daily loss and max micros.
- `cush_down`: two_week size x room / max loss while the eval is below its start (a 25K at -$300: room $700 / $1,000 = 70% size).
- `cush_classic`: no two_week. The LIT $ rule on the plan ($800 / $400 up to a 20-pt stop) + 50% of the profit, x room / max loss
  when down, same caps.

| variant | 50K eval $ H1 / H2 | 50K 2-wk pass/fail H1 · H2 | 25K eval $ H1 / H2 | 25K 2-wk pass/fail H1 · H2 |
|---|---|---|---|---|
| live two_week | +$34.3k / +$9.1k | 57.1/5.9 · 52.2/0.0 | +$15.0k / +$5.4k | 59.7/12.6 · 47.8/4.3 |
| + 25% of profit | +$38.7k / +$10.0k | 55.5/6.7 · 52.2/0.0 | +$20.5k / +$5.7k | 58.0/12.6 · 47.8/4.3 |
| + 50% of profit | +$39.1k / +$11.8k | 55.5/5.9 · 52.2/1.4 | +$18.1k / +$5.1k | 58.0/12.6 · 46.4/7.2 |
| x room when down | +$20.1k / +$7.8k | 42.0/0.0 · 46.4/0.0 | +$14.2k / +$5.0k | 41.2/2.5 · 37.7/0.0 |
| classic house money | +$10.7k / +$10.0k | 35.3/0.0 · 27.5/1.4 | +$13.6k / +$5.7k | 37.8/1.7 · 23.2/0.0 |
| combo base | +$29.8k / +$9.8k | 57.1/0.0 · 52.2/0.0 | +$15.8k / +$5.4k | 56.3/8.4 · 39.1/0.0 |
| combo + 25% of profit | +$34.8k / +$12.7k | 55.5/0.8 · 50.7/0.0 | +$21.6k / +$5.7k | 54.6/8.4 · 39.1/0.0 |
| scale-in combo base | +$53.6k / +$14.8k | 57.1/0.0 · 52.2/0.0 | +$14.2k / +$6.3k | 54.6/5.0 · 52.2/0.0 |
| scale-in combo + 25% of profit | +$43.6k / +$20.0k | 55.5/0.0 · 55.1/0.0 | +$20.0k / +$8.0k | 54.6/5.9 · 52.2/0.0 |

- The extra money is real but small next to the eval odds: on every base it costs 1.6 points of H1 2-week passes, and on two
  of the three it adds H1 fails (5.9 -> 6.7, 0.0 -> 0.8).
- **"Size down when down" is the expensive habit:** two_week already shrinks with the room (60% / 50% of it). Shrinking again
  means the next winner no longer reaches the target, so the eval drags on: 2-week passes fall by up to 15 points.
- On the LIT rule a running "house money" balance simply doubles the size for most of 2026 (+$26k / +$9k), with twice the
  drawdown (-$4.4k vs -$2.2k) and a worse 2021-25 (-$1.9k to -$2.3k). That is leverage, not an edge.

## 3. Cool-off after a losing streak

| variant (live base) | trades halved 2026 H1 / H2 | LIT $ vs live H1 / H2 | 50K eval $ vs live H1 / H2 | 50K 2-wk H1 · H2 | 25K eval $ vs live H1 / H2 | 2021-25 vs live |
|---|---|---|---|---|---|---|
| 2 losses, reset on any non-loss | 18 / 10 | +$0.7k / -$0.8k | +$4.1k / +$0.2k | 54.6/0.0 · 52.2/0.0 | -$2.3k / -$0.6k | +$2.2k |
| 2 losses, reset on a win >= 0.5R | 33 / 18 | -$3.2k / -$2.5k | -$3.8k / +$0.3k | 49.6/0.0 · 43.5/0.0 | -$1.7k / -$0.4k | -$9.7k |
| 3 losses, reset on any non-loss | 13 / 4 | +$0.1k / -$0.9k | -$5.3k / -$0.2k | 59.7/1.7 · 52.2/0.0 | -$2.0k / $0 | -$0.2k |
| 3 losses, reset on a win >= 0.5R | 25 / 11 | -$4.2k / -$1.9k | -$10.6k / +$2.4k | 57.1/0.0 · 50.7/0.0 | -$2.6k / -$0.5k | -$8.5k |

- **Placebo for the best one** (2 losses, any reset): random halving of 18 H1 / 10 H2 trades. H1: 97th percentile on LIT money,
  98th on the 50K eval path. H2: **63rd and 50th percentile**. So the streak picks weak trades in H1, and in H2 it does what
  random halving does. On the combo base it is the same (H1 98 / 100, H2 63 / 54), and the H2 eval path is $131 lower.
- **On the scale-in set** every cool-off loses $3.4-3.6k of H2 and up to $7.1k of H1, because halving also halves the adds
  of the next big winner.
- Not adopted. The safety part (no 2-week fails in H1) is already in the combo's eval weekly loss stop.

## 4. Walk-forward weekday / hour self-check

- Every Sunday, trades of earlier weeks only. A bucket (weekday, or entry hour ET) with 15+ past trades and a negative R sum is
  halved for the coming week. History: everything since 2021-10 (`all`) or the calendar year to date (`ytd`).
- `ytd`: in 2026 no bucket ever qualified (the year's trades are too few and too good), so 2026 is unchanged. It only acts in
  2021-25 (-$2.8k weekday, +$0.2k hour).
- `all`: the 2021-25 losers decide 2026. Weekday: Monday and Thursday halved in the first 13 weeks, then Thursday all year
  (19 H1 / 6 H2 trades). Hour: 02, 05 and 10 o'clock halved (06 too in the first 13 weeks; 32 H1 / 12 H2 trades). LIT money -$3.2k / -$0.9k (weekday) and
  -$6.6k / -$1.0k (hour); 50K eval path -$11.3k / -$2.0k and -$14.6k / +$1.5k; 2-week passes H1 57 -> 44 / 35.
- This is a different angle from `lit-learning-loop.md` (which learned setup buckets such as trap age with shrinkage): plain
  calendar buckets, no shrinkage, half size only. It confirms that loop's finding: with LIT's few trades a self-check either
  never fires or learns from the wrong years.

## What this means

- LIT's money is in a few far targets. Each of these habits cuts size on some trades. Unless it can tell the losers apart at
  the moment of entry, it cuts winners as often as losers. On the eval it is worse, because two_week needs every winner at full
  size ("one winner passes").
- The safety habits a pro uses are already in the hq-lit set: the eval weekly loss stop ($1,200) and the 55% room cap get the
  H1 2-week fails to 0.0% without touching the H2 money.
- **Recommendation:** keep the live rules (and the hq-lit set when you adopt it). Do not add a cushion, a cool-off or a
  self-check. A news blackout of 15 minutes is allowed as a comfort rule if you want one, but it is not a money rule: it
  changed one trade in 2026.

## Reproduce

    python -X utf8 tools/hq_habits.py check     # runner == hq_lit, 25K sanity, the calendar
    python -X utf8 tools/hq_habits.py run       # 54 tests -> research/hq/habits.json
    python -X utf8 tools/hq_habits.py placebo   # gate passes -> research/hq/habits_placebo.json
    python -X utf8 tools/hq_habits.py placebo cool2_any@live,cool2_any@combo
    python -X utf8 tools/hq_habits.py save      # runs hq_habit_*

Runs: `hq_habit_base_<base>` (+ `_eval` = 50K, `_eval25` = 25K), every variant on the live base `hq_habit_<variant>` (+ `_eval`,
`_eval25`), and the gate passes on the combo base `hq_habit_<variant>_combo`.

## Appendix - every variant on every base

### Base: live LIT

| variant | 2026 trades/wk | win % (> $0) | PF | 2026 net | $/month | max DD | H1 net / PF | H2 net / PF | 50K eval $ H1 / H2 | 50K 2-wk pass/fail H1 · H2 | 25K eval $ H1 / H2 | 25K 2-wk pass/fail H1 · H2 | 2021-25 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **base: live** | 2.91 | 55.0 | 4.02 | +43.1k | $4,391 | -2.2k | +33.7k / 4.92 | +9.4k / 2.66 | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | +15.0k / +5.4k | 59.7/12.6 · 47.8/4.3 | -0.7k |
| `news_skip15` (gate passed) | 2.89 | 55.5 | 4.16 | +43.6k | $4,441 | -2.2k | +34.2k / 5.21 | +9.4k / 2.66 | +38.6k / +9.1k | 57.1/4.2 · 52.2/0.0 | +14.8k / +5.4k | 59.7/10.9 · 47.8/4.3 | -0.7k |
| `news_skip30` (gate passed) | 2.89 | 54.6 | 4.09 | +43.3k | $4,417 | -2.2k | +33.9k / 5.07 | +9.4k / 2.66 | +36.1k / +9.1k | 56.3/4.2 · 52.2/0.0 | +14.9k / +5.4k | 58.8/10.9 · 47.8/4.3 | -0.0k |
| `news_skip60` | 2.84 | 54.7 | 4.01 | +41.4k | $4,225 | -2.2k | +32.0k / 4.95 | +9.4k / 2.66 | +35.6k / +9.1k | 56.3/4.2 · 52.2/0.0 | +11.8k / +5.4k | 58.8/10.9 · 47.8/4.3 | +0.1k |
| `news_half15` (gate passed) | 2.91 | 55.0 | 4.1 | +43.4k | $4,420 | -2.2k | +33.9k / 5.08 | +9.4k / 2.66 | +35.9k / +9.1k | 57.1/4.2 · 52.2/0.0 | +14.8k / +5.4k | 59.7/10.9 · 47.8/4.3 | -0.7k |
| `news_half30` (gate passed) | 2.91 | 55.0 | 4.1 | +43.4k | $4,420 | -2.2k | +33.9k / 5.08 | +9.4k / 2.66 | +35.9k / +9.1k | 57.1/4.2 · 52.2/0.0 | +14.8k / +5.4k | 59.7/10.9 · 47.8/4.3 | -0.3k |
| `news_half60` | 2.91 | 55.0 | 4.02 | +42.1k | $4,296 | -2.2k | +32.7k / 4.94 | +9.4k / 2.66 | +32.7k / +9.1k | 57.1/4.2 · 52.2/0.0 | +13.6k / +5.4k | 59.7/10.9 · 47.8/4.3 | -0.3k |
| `cush_hm25` | 2.91 | 55.0 | 3.74 | +78.2k | $7,967 | -4.4k | +59.3k / 4.45 | +18.8k / 2.66 | +38.7k / +10.0k | 55.5/6.7 · 52.2/0.0 | +20.5k / +5.7k | 58.0/12.6 · 47.8/4.3 | -2.6k |
| `cush_hm50` | 2.91 | 55.0 | 3.78 | +79.1k | $8,068 | -4.4k | +60.3k / 4.51 | +18.8k / 2.66 | +39.1k / +11.8k | 55.5/5.9 · 52.2/1.4 | +18.1k / +5.1k | 58.0/12.6 · 46.4/7.2 | -3.0k |
| `cush_down` | 2.91 | 55.0 | 4.02 | +43.1k | $4,391 | -2.2k | +33.7k / 4.92 | +9.4k / 2.66 | +20.1k / +7.8k | 42.0/0.0 · 46.4/0.0 | +14.2k / +5.0k | 41.2/2.5 · 37.7/0.0 | -1.2k |
| `cush_classic` | 2.91 | 55.0 | 3.78 | +79.1k | $8,068 | -4.4k | +60.3k / 4.51 | +18.8k / 2.66 | +10.7k / +10.0k | 35.3/0.0 · 27.5/1.4 | +13.6k / +5.7k | 37.8/1.7 · 23.2/0.0 | -1.3k |
| `cool2_any` | 2.91 | 55.0 | 4.4 | +42.9k | $4,378 | -2.0k | +34.4k / 5.81 | +8.6k / 2.56 | +38.4k / +9.3k | 54.6/0.0 · 52.2/0.0 | +12.7k / +4.8k | 57.1/3.4 · 47.8/4.3 | +1.5k |
| `cool2_win` | 2.91 | 55.0 | 4.29 | +37.4k | $3,812 | -1.4k | +30.5k / 5.69 | +6.9k / 2.42 | +30.5k / +9.4k | 49.6/0.0 · 43.5/0.0 | +13.4k / +5.0k | 50.4/1.7 · 34.8/4.3 | -10.4k |
| `cool3_any` | 2.91 | 55.0 | 4.16 | +42.3k | $4,311 | -2.0k | +33.8k / 5.39 | +8.5k / 2.5 | +28.9k / +8.9k | 59.7/1.7 · 52.2/0.0 | +13.0k / +5.4k | 62.2/8.4 · 47.8/4.3 | -0.9k |
| `cool3_win` | 2.91 | 55.0 | 3.93 | +37.0k | $3,773 | -1.8k | +29.4k / 4.91 | +7.6k / 2.48 | +23.6k / +11.5k | 57.1/0.0 · 50.7/0.0 | +12.4k / +4.8k | 57.1/5.9 · 39.1/4.3 | -9.1k |
| `wf_weekday_all` | 2.91 | 55.0 | 4.03 | +39.0k | $3,973 | -2.0k | +30.5k / 4.95 | +8.5k / 2.66 | +22.9k / +7.1k | 44.5/0.0 · 53.6/0.0 | +12.1k / +6.8k | 47.1/6.7 · 46.4/4.3 | +4.9k |
| `wf_weekday_ytd` | 2.91 | 55.0 | 4.02 | +43.1k | $4,391 | -2.2k | +33.7k / 4.92 | +9.4k / 2.66 | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | +15.0k / +5.4k | 59.7/12.6 · 47.8/4.3 | -3.5k |
| `wf_hour_all` | 2.91 | 55.0 | 4.08 | +35.5k | $3,617 | -1.5k | +27.1k / 5.3 | +8.4k / 2.6 | +19.6k / +10.5k | 35.3/0.0 · 43.5/0.0 | +8.7k / +4.2k | 37.8/1.7 · 39.1/4.3 | +4.7k |
| `wf_hour_ytd` | 2.91 | 55.0 | 4.02 | +43.1k | $4,391 | -2.2k | +33.7k / 4.92 | +9.4k / 2.66 | +34.3k / +9.1k | 57.1/5.9 · 52.2/0.0 | +15.0k / +5.4k | 59.7/12.6 · 47.8/4.3 | -0.5k |

### Base: hq-lit set without scale-in (cisd1m 22 + room_f 0.55 + wk_loss_usd 1200)

| variant | 2026 trades/wk | win % (> $0) | PF | 2026 net | $/month | max DD | H1 net / PF | H2 net / PF | 50K eval $ H1 / H2 | 50K 2-wk pass/fail H1 · H2 | 25K eval $ H1 / H2 | 25K 2-wk pass/fail H1 · H2 | 2021-25 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **base: combo** | 2.91 | 55.8 | 4.15 | +43.5k | $4,435 | -2.2k | +33.7k / 4.92 | +9.8k / 2.88 | +29.8k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/8.4 · 39.1/0.0 | -0.7k |
| `news_skip15` (gate passed) | 2.89 | 56.3 | 4.3 | +44.0k | $4,484 | -2.2k | +34.2k / 5.21 | +9.8k / 2.88 | +34.2k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/6.7 · 39.1/0.0 | -0.7k |
| `news_skip30` (gate passed) | 2.89 | 55.5 | 4.22 | +43.8k | $4,460 | -2.2k | +33.9k / 5.07 | +9.8k / 2.88 | +31.2k / +9.8k | 56.3/0.0 · 52.2/0.0 | +15.7k / +5.4k | 56.3/6.7 · 39.1/0.0 | -0.0k |
| `news_skip60` | 2.84 | 55.6 | 4.14 | +41.9k | $4,269 | -2.2k | +32.0k / 4.95 | +9.8k / 2.88 | +30.2k / +9.8k | 56.3/0.0 · 52.2/0.0 | +14.3k / +5.4k | 55.5/6.7 · 39.1/0.0 | +0.1k |
| `news_half15` (gate passed) | 2.91 | 55.8 | 4.23 | +43.8k | $4,463 | -2.2k | +33.9k / 5.08 | +9.8k / 2.88 | +31.5k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/6.7 · 39.1/0.0 | -0.7k |
| `news_half30` (gate passed) | 2.91 | 55.8 | 4.23 | +43.8k | $4,463 | -2.2k | +33.9k / 5.08 | +9.8k / 2.88 | +31.5k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/6.7 · 39.1/0.0 | -0.3k |
| `news_half60` | 2.91 | 55.8 | 4.14 | +42.6k | $4,340 | -2.2k | +32.7k / 4.94 | +9.8k / 2.88 | +28.6k / +9.8k | 57.1/0.0 · 52.2/0.0 | +14.9k / +5.4k | 56.3/6.7 · 39.1/0.0 | -0.3k |
| `cush_hm25` | 2.91 | 55.8 | 3.86 | +79.0k | $8,054 | -4.4k | +59.3k / 4.45 | +19.7k / 2.88 | +34.8k / +12.7k | 55.5/0.8 · 50.7/0.0 | +21.6k / +5.7k | 54.6/8.4 · 39.1/0.0 | -2.6k |
| `cush_hm50` | 2.91 | 55.8 | 3.89 | +80.0k | $8,155 | -4.4k | +60.3k / 4.51 | +19.7k / 2.88 | +33.8k / +14.9k | 55.5/0.0 · 50.7/0.0 | +23.0k / +5.5k | 54.6/8.4 · 39.1/0.0 | -3.0k |
| `cush_down` | 2.91 | 55.8 | 4.15 | +43.5k | $4,435 | -2.2k | +33.7k / 4.92 | +9.8k / 2.88 | +27.4k / +8.3k | 42.0/0.0 · 46.4/0.0 | +12.1k / +4.9k | 41.2/0.0 · 39.1/0.0 | -1.2k |
| `cush_classic` | 2.91 | 55.8 | 3.89 | +80.0k | $8,155 | -4.4k | +60.3k / 4.51 | +19.7k / 2.88 | +26.5k / +10.2k | 35.3/0.0 · 27.5/0.0 | +11.7k / +5.4k | 37.8/0.0 · 24.6/0.0 | -1.3k |
| `cool2_any` | 2.91 | 55.8 | 4.55 | +43.4k | $4,421 | -2.0k | +34.4k / 5.81 | +9.0k / 2.78 | +39.2k / +9.6k | 54.6/0.0 · 52.2/0.0 | +13.8k / +6.2k | 52.9/3.4 · 39.1/0.0 | +1.5k |
| `cool2_win` | 2.91 | 55.8 | 4.45 | +37.8k | $3,856 | -1.4k | +30.5k / 5.69 | +7.3k / 2.65 | +28.4k / +9.1k | 49.6/0.0 · 43.5/0.0 | +13.3k / +4.6k | 47.1/0.0 · 31.9/0.0 | -10.4k |
| `cool3_any` | 2.91 | 55.8 | 4.3 | +42.7k | $4,355 | -2.0k | +33.8k / 5.39 | +8.9k / 2.7 | +33.2k / +9.1k | 59.7/0.0 · 52.2/0.0 | +17.2k / +5.4k | 58.0/7.6 · 39.1/0.0 | -0.9k |
| `cool3_win` | 2.91 | 55.8 | 4.07 | +37.4k | $3,816 | -1.8k | +29.4k / 4.91 | +8.0k / 2.71 | +29.4k / +10.4k | 57.1/0.0 · 50.7/0.0 | +15.8k / +6.2k | 53.8/6.7 · 36.2/0.0 | -9.1k |
| `wf_weekday_all` | 2.91 | 55.8 | 4.17 | +39.4k | $4,016 | -2.0k | +30.5k / 4.95 | +8.9k / 2.9 | +23.9k / +9.4k | 44.5/0.0 · 53.6/0.0 | +12.3k / +4.1k | 47.1/1.7 · 46.4/0.0 | +4.9k |
| `wf_weekday_ytd` | 2.91 | 55.8 | 4.15 | +43.5k | $4,435 | -2.2k | +33.7k / 4.92 | +9.8k / 2.88 | +29.8k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/8.4 · 39.1/0.0 | -3.5k |
| `wf_hour_all` | 2.91 | 55.8 | 4.23 | +35.9k | $3,661 | -1.5k | +27.1k / 5.3 | +8.8k / 2.83 | +20.0k / +11.3k | 35.3/0.0 · 43.5/0.0 | +8.9k / +4.8k | 34.5/0.0 · 27.5/0.0 | +4.7k |
| `wf_hour_ytd` | 2.91 | 55.8 | 4.15 | +43.5k | $4,435 | -2.2k | +33.7k / 4.92 | +9.8k / 2.88 | +29.8k / +9.8k | 57.1/0.0 · 52.2/0.0 | +15.8k / +5.4k | 56.3/8.4 · 39.1/0.0 | -0.5k |

### Base: hq-lit set with scale-in

| variant | 2026 trades/wk | win % (> $0) | PF | 2026 net | $/month | max DD | H1 net / PF | H2 net / PF | 50K eval $ H1 / H2 | 50K 2-wk pass/fail H1 · H2 | 25K eval $ H1 / H2 | 25K 2-wk pass/fail H1 · H2 | 2021-25 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **base: combo_scale** | 2.91 | 44.2 | 4.39 | +59.4k | $6,053 | -2.5k | +44.2k / 4.88 | +15.2k / 3.48 | +53.6k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/5.0 · 52.2/0.0 | -0.7k |
| `news_skip15` | 2.89 | 44.5 | 4.52 | +59.9k | $6,102 | -2.0k | +44.7k / 5.09 | +15.2k / 3.48 | +43.1k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/4.2 · 52.2/0.0 | -0.7k |
| `news_skip30` | 2.89 | 43.7 | 4.45 | +59.5k | $6,062 | -2.0k | +44.3k / 4.97 | +15.2k / 3.48 | +42.7k / +14.8k | 56.3/0.0 · 52.2/0.0 | +13.8k / +6.3k | 53.8/4.2 · 52.2/0.0 | -0.0k |
| `news_skip60` | 2.84 | 43.6 | 4.49 | +59.4k | $6,050 | -2.1k | +44.2k / 5.05 | +15.2k / 3.48 | +42.8k / +14.8k | 56.3/0.0 · 52.2/0.0 | +13.8k / +6.3k | 53.8/4.2 · 52.2/0.0 | +0.1k |
| `news_half15` | 2.91 | 44.2 | 4.46 | +59.6k | $6,081 | -2.3k | +44.5k / 5.0 | +15.2k / 3.48 | +43.1k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/4.2 · 52.2/0.0 | -0.7k |
| `news_half30` | 2.91 | 44.2 | 4.46 | +59.6k | $6,081 | -2.3k | +44.5k / 5.0 | +15.2k / 3.48 | +43.1k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/4.2 · 52.2/0.0 | -0.3k |
| `news_half60` | 2.91 | 44.2 | 4.45 | +59.5k | $6,061 | -2.3k | +44.3k / 4.98 | +15.2k / 3.48 | +43.0k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.1k / +6.3k | 53.8/4.2 · 52.2/0.0 | -0.3k |
| `cush_hm25` | 2.91 | 44.2 | 4.08 | +108.0k | $11,012 | -5.1k | +77.7k / 4.41 | +30.3k / 3.48 | +43.6k / +20.0k | 55.5/0.0 · 55.1/0.0 | +20.0k / +8.0k | 54.6/5.9 · 52.2/0.0 | -2.6k |
| `cush_hm50` | 2.91 | 44.2 | 4.13 | +109.8k | $11,188 | -5.1k | +79.4k / 4.48 | +30.3k / 3.48 | +33.8k / +20.3k | 53.8/0.0 · 55.1/0.0 | +20.3k / +7.8k | 52.1/6.7 · 50.7/0.0 | -3.0k |
| `cush_down` | 2.91 | 44.2 | 4.39 | +59.4k | $6,053 | -2.5k | +44.2k / 4.88 | +15.2k / 3.48 | +29.0k / +11.3k | 47.1/0.0 · 52.2/0.0 | +11.4k / +6.6k | 43.7/0.8 · 37.7/0.0 | -1.2k |
| `cush_classic` | 2.91 | 44.2 | 4.13 | +109.8k | $11,188 | -5.1k | +79.4k / 4.48 | +30.3k / 3.48 | +17.4k / +10.1k | 40.3/0.0 · 30.4/0.0 | +10.1k / +5.1k | 37.8/0.0 · 26.1/0.0 | -1.3k |
| `cool2_any` | 2.91 | 44.2 | 4.45 | +51.3k | $5,232 | -1.8k | +39.7k / 5.16 | +11.7k / 3.19 | +33.3k / +11.4k | 47.1/0.0 · 46.4/0.0 | +13.3k / +6.2k | 45.4/1.7 · 34.8/0.0 | +1.5k |
| `cool2_win` | 2.91 | 44.2 | 4.35 | +48.9k | $4,984 | -1.8k | +37.1k / 4.95 | +11.8k / 3.26 | +25.0k / +12.1k | 38.7/0.0 · 46.4/0.0 | +12.8k / +6.2k | 38.7/1.7 · 34.8/0.0 | -10.4k |
| `cool3_any` | 2.91 | 44.2 | 4.64 | +55.9k | $5,701 | -1.8k | +44.3k / 5.44 | +11.6k / 3.16 | +36.9k / +7.3k | 57.1/0.0 · 44.9/0.0 | +14.9k / +6.5k | 56.3/2.5 · 34.8/0.0 | -0.9k |
| `cool3_win` | 2.91 | 44.2 | 4.32 | +50.4k | $5,139 | -1.8k | +38.8k / 4.95 | +11.6k / 3.16 | +31.4k / +7.3k | 51.3/0.0 · 44.9/0.0 | +13.2k / +6.5k | 49.6/2.5 · 34.8/0.0 | -9.1k |
| `wf_weekday_all` | 2.91 | 44.2 | 4.56 | +55.5k | $5,660 | -2.3k | +41.7k / 5.16 | +13.8k / 3.48 | +25.2k / +19.0k | 46.2/0.0 · 50.7/0.0 | +11.4k / +11.7k | 46.2/2.5 · 53.6/0.0 | +4.9k |
| `wf_weekday_ytd` | 2.91 | 44.2 | 4.39 | +59.4k | $6,053 | -2.5k | +44.2k / 4.88 | +15.2k / 3.48 | +53.6k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/5.0 · 52.2/0.0 | -3.5k |
| `wf_hour_all` | 2.91 | 44.2 | 4.34 | +48.3k | $4,922 | -2.1k | +34.2k / 4.93 | +14.1k / 3.45 | +29.8k / +20.5k | 42.9/0.8 · 53.6/0.0 | +11.3k / +11.1k | 39.5/0.0 · 46.4/0.0 | +4.7k |
| `wf_hour_ytd` | 2.91 | 44.2 | 4.39 | +59.4k | $6,053 | -2.5k | +44.2k / 4.88 | +15.2k / 3.48 | +53.6k / +14.8k | 57.1/0.0 · 52.2/0.0 | +14.2k / +6.3k | 54.6/5.0 · 52.2/0.0 | -0.5k |
