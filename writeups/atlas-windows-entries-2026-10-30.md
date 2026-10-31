## Money first

**No change for ATLAS. No window cut and no limit entry passes every test.**

- **Windows.** One weak window per member was picked on 2026 H1, then frozen. It does not hold up as an edge:
  - Three cut sets pass the 25K test (2-week pass not down, dead not up and eval-path $ up in both 2026 halves, 2025 and
    2021-24 not worse).
  - Each one fails a stricter check. The S/R cut is the known 11:00 spike (atlas.md): its 3 H1 trades all entered at
    exactly 11:00. The weekday pair only works together, and every neighbouring day fails. 3 of all 25 possible single
    30-minute cuts pass the same test by luck.
- **The one window fact that keeps showing up is old news.** EMA entries in the 06:00 ET hour lost in every year
  2021-2026: 60 trades, -28R.
  - It is the neighbour of this round's pick, not the pick itself.
  - atlas-v2.md already found it (candidate 3: "no EMA entry 06:00-06:59").
  - It changes 3 trades in 2026, worth about +$140 a month in H1 and +$42 in H2. It stays in the ATLAS v2 paper package and
    is not a new switch.
- **Limit entries: rejected, as atlas.md found for a limit at the signal close.**
  - A limit at a better price does fill most losers, but the best winners never come back to it.
  - In H1 the 30-minute limit 0.25 of the stop back misses 27 winners (+86R) to save 9 losers (-9R).
  - Every one of the 24 limit variants loses H1 2-week passes: 29-58% vs today's 65.5%.
  - "Else market" (chase after the timeout) is no better: the late fills are the trades that already ran.

**Window cuts** (ATLAS on its Builder 25K: account-B need size, LIT first, no hedge, max 2 a day; eval paths =
back-to-back 25K evals started every 5th session, $ less the $63 fees, a month; R = R per $ risked at $500 a trade, costs
in; "dead" = failed or stuck):

| ATLAS | 2026 H1: 2-wk pass / dead, eval $/mo, R | 2026 H2 | 2025 | 2021-24 | v2 test |
|---|---|---|---|---|---|
| **Today** | 65.5 / 0.8, $1,394, +0.884 | 43.5 / 0.0, $547, +0.620 | 30.1 / 23.3, -$148, +0.084 | 22.9 / 27.1, -$36, +0.045 | |
| 30-min picks: EMA no 04:00-04:30, MD no 04:30-05:00, S/R no 11:00-11:30 | 72.3 / 0.0, $2,355, +1.101 | 43.5 / 0.0, $610, +0.701 | 28.9 / 8.4, -$1, +0.123 | 21.6 / 23.1, -$67, +0.056 | fails (2021-24) |
| S/R no 11:00-11:30 alone | 68.9 / 0.8, $1,598, +0.935 | 43.5 / 0.0, $591, +0.626 | 30.1 / 16.1, -$99, +0.096 | 22.7 / 24.7, -$23, +0.059 | passes |
| Hour picks: EMA no 05:00, MD no 10:00, S/R no 11:00 hour | 73.1 / 0.8, $2,065, +1.026 | 50.7 / 0.0, $480, +0.618 | 28.1 / 14.1, -$70, +0.122 | 24.1 / 19.6, -$24, +0.106 | fails (H2 $) |
| EMA no 06:00 hour (the neighbour, atlas-v2) | 65.5 / 0.8, $1,532, +0.909 | 43.5 / 0.0, $589, +0.652 | 30.5 / 18.9, -$144, +0.093 | 23.2 / 23.6, -$26, +0.078 | passes |
| Weekday picks: MD no Friday, S/R no Wednesday (EMA: none) | 65.5 / 0.0, $1,783, +1.066 | 43.5 / 0.0, $628, +0.760 | 27.7 / 14.9, -$139, +0.100 | 21.9 / 21.9, +$69, +0.048 | passes |

Trades a week stay at 2+:
- Candidates a week (eval-path trades in brackets): today 4.4 (2.1) / 3.3 (1.6) / 4.8 (2.6) / 5.4 (3.1).
- The cut sets: 3.8-4.3 / 2.7-3.2 / 4.2-4.7 / 4.6-5.2 candidates. 2+ candidates a week in 75-99% of weeks; the hour picks
  are the lowest, 75% in H2.

At $500 a trade the cut sets make $8,193-8,938 / $3,501-4,506 / $901-1,092 / $490-1,028 a month. Today makes
$8,112 / $4,260 / $857 / $510.

**Limit entries** (30-minute limits; "skip" = not filled in 30 minutes, no trade; "mkt" = then market at the next open + 1
tick; fill rate = the limit's own fills; missed winners / saved losers = the unfilled trades' R at today's entry):

| ATLAS entry | limit fill rate H1 / H2 / 2025 / 2021-24 | H1 missed winners vs saved losers | H1: 2-wk pass / dead, eval $/mo, R | H2 | 2025 | 2021-24 |
|---|---|---|---|---|---|---|
| **Today (market at the next 5m open)** | | | 65.5 / 0.8, $1,394, +0.884 | 43.5 / 0.0, $547, +0.620 | 30.1 / 23.3, -$148, +0.084 | 22.9 / 27.1, -$36, +0.045 |
| Midpoint of the signal bar, skip | 76 / 80 / 73 / 80% | 22 (+58.9R) vs 5 (-5.0R) | 47.1 / 2.5, $1,077, +0.857 | 46.4 / 0.0, $317, +0.819 | 30.9 / 14.1, $57, +0.185 | 23.0 / 31.3, $52, -0.006 |
| Midpoint, else market | 76 / 80 / 73 / 80% | 9 (+17.4R) vs 0 | 47.1 / 3.4, $676, +0.762 | 46.4 / 0.0, $387, +0.680 | 32.5 / 18.5, $311, +0.200 | 22.6 / 35.2, -$68, -0.009 |
| 0.25 of the stop back, skip | 70 / 81 / 74 / 78% | 27 (+86.2R) vs 9 (-9.0R) | 31.9 / 0.0, $559, +0.517 | 44.9 / 0.0, $1,192, +0.867 | 28.9 / 13.3, $281, +0.215 | 22.1 / 29.2, -$19, -0.019 |
| 0.25 back, else market | 70 / 81 / 74 / 78% | 11 (+26.5R) vs 0 | 31.9 / 0.0, $227, +0.511 | 60.9 / 0.0, $1,465, +0.846 | 27.7 / 22.5, $109, +0.189 | 21.4 / 33.8, -$181, -0.021 |
| 0.50 of the stop back, skip | 53 / 53 / 55 / 59% | 40 (+123.7R) vs 15 (-15.0R) | 39.5 / 1.7, $729, +1.017 | 14.5 / 0.0, $308, +0.896 | 26.1 / 8.8, -$207, +0.064 | 23.1 / 19.6, -$19, -0.082 |
| 0.50 back, else market | 53 / 53 / 55 / 59% | 13 (+30.4R) vs 0 | 42.9 / 4.2, $540, +0.771 | 40.6 / 1.4, $629, +0.585 | 35.7 / 23.7, -$104, +0.136 | 25.3 / 32.7, $24, -0.015 |

The 15-minute limits are worse: a 2-week H1 pass of 29.4-53.8%. The same 12 limits with the member's management kept at
today's price levels (BE trigger and 15-minute check levels unchanged, instead of in R of the smaller fill risk) are also
all worse in H1: 36.1-58.0%. None of the 24 passes the v2 test. All 24 are in `research/second/atw_entries.json`.

## 1. Per-member windows

**The rule (pre-registered in `tools/atw_atlas.py` before any score):**

1. For each member, take its 2026 H1 trades as account B really takes them (after the LIT and no-hedge rules).
2. Group them by one calendar fact.
3. Pick the one bucket with the lowest total R (costs in, at least 3 trades, a negative total) and skip it from then on.
   That is at most one cut per member.

The calendar facts:
- `m30`: the 30-minute bucket of the ET entry time;
- `m60`: the entry hour (atlas-v2 picked hours on 2021-24, this round picks on 2026 H1);
- `dow`: the weekday.

Checked on H2, 2025 and 2021-24 per year, with the buckets either side as neighbours and 30 random-window draws per family
(a random H1 bucket for each member, same scoring).

**What the rejected list already had:**
- atlas.md: 13 entry windows by hand, incl. S/R until 11:00 (a 5-minute spike: three S/R trades at exactly 11:00 in H1);
  14 weekday rules (EMA no Thursday).
- atlas-v2.md: per-member hour / weekday gates picked on 2021-24 (only "no EMA entry 06:00-06:59" passed).
- calendar-effects.md: 36 calendar factors on LIT, all chance.
- atlas-blitz-edge-2026-10-30.md: London-clock windows in the DST gap weeks.

New here: the 2026 H1 pick, the 30-minute grain, the random-window control and the full single-cut count.

**The picks** (H1 trades in the bucket and their R; then the skipped trades' R by year, 2021 ... 2025, 2026 H1, 2026 H2):

| Family | Member | Skip | H1 | By year (trades, R) |
|---|---|---|---|---|
| m30 | EMA | 04:00-04:30 | 4, -3.0R | 2/+7.5, 10/+1.7, 16/-1.0, 19/+11.3, 19/-12.0, 4/-3.0, 3/-0.5 |
| m30 | MD | 04:30-05:00 | 6, -4.1R | 1/-1.0, 5/-4.2, 10/-7.2, 1/-1.0, 5/+8.4, 6/-4.1, 1/-0.4 |
| m30 | S/R | 11:00-11:30 | 3, -3.0R (all entered at 11:00) | 2/+0.9, 10/-7.1, 8/-3.5, 6/-0.7, 8/-2.2, 3/-3.0, 2/+0.9 |
| m60 | EMA | 05:00-05:59 | 4, -2.6R | 1/-1.0, 15/-4.0, 19/-8.5, 12/-7.3, 14/+0.2, 4/-2.6, 5/+4.4 |
| m60 | MD | 10:00-10:59 | 3, -1.0R | -, 12/-3.0, 11/-0.3, 4/-2.9, 4/-1.9, 3/-1.0, 1/+1.4 |
| m60 | S/R | 11:00-11:59 | 4, -1.1R | 4/+1.7, 18/-6.0, 14/-3.2, 11/-5.7, 14/-3.7, 4/-1.1, 3/-0.1 |
| dow | EMA | none (no H1 weekday below 0) | | |
| dow | MD | Friday | 10, -4.5R | 3/-2.1, 16/+3.3, 15/-13.6, 12/+7.7, 11/-5.5, 10/-4.5, 3/-1.1 |
| dow | S/R | Wednesday | 4, -1.1R | 1/+1.6, 16/+5.6, 16/-1.1, 6/+0.2, 14/+4.0, 4/-1.1, 4/-0.8 |
| (neighbour) | EMA | 06:00-06:59 | 2, -1.0R | 3/-2.0, 13/-10.0, 15/-4.5, 13/-8.8, 13/-1.1, 2/-1.0, 1/-1.0 |

**Why none is adopted:**

- **S/R no 11:00-11:30** passes the v2 test, but:
  - It is atlas.md's "S/R until 11:00" spike again. Its 3 H1 trades (Mar 26, Apr 28, May 14) all entered at 11:00 sharp
    and stopped out.
  - Both neighbours fail. 10:30-11:00 makes less in H2 and 2021-24. 11:30-12:00 is better in H2 (53.6% pass) but loses
    2021-24 money (-$120 vs -$36 a month).
  - Counting every possible single 30-minute cut (each member x each bucket with an H1 trade): 25 cuts, 3 pass the test.
    They are EMA 06:00-06:30, MD 02:30-03:00 (whose 2 H1 trades include a +1.2R winner) and this one. Small cuts pass this
    test easily.
  - In H2 its eval-path gain is +$44 a month, on 2 trades.
- **MD no Friday + S/R no Wednesday** passes the v2 test as a pair, but:
  - Neither cut passes alone: MD no Friday makes less in H2 ($514), S/R no Wednesday makes less in 2025.
  - All four neighbouring days fail.
  - The skipped S/R Wednesday trades made +10.3R in 2021-25. The pair's 2021-24 gain is an eval-path accident, not better
    trades: R +0.048 vs +0.045.
  - 1 of 30 random weekday cuts passes too. In 2025, 93% of random weekday cuts make more eval-path $ than it does.
  - calendar-effects.md and atlas.md already found weekday rules to be chance.
- **The 30-minute set** is the best in H1 ($2,355 a month, 0.0% dead) and better in H2 and 2025. It fails 2021-24 (-$67 vs
  -$36 a month): the EMA 04:00 trades it skips made +19R in 2021-24. 0 of 30 random 30-minute cut sets pass the test, but
  this one does not pass either.
- **The hour set** makes less H2 eval-path $ ($480 vs $547) and drops H2 to 2.7 candidates a week (75% of weeks with 2+).
- **EMA no 06:00-06:59** is the only window fact negative in every year since 2021. It is the hour pick's neighbour and
  atlas-v2's own 2021-24 pick (candidate 3 there), so it is not new. In 2026 it touches 3 trades. It stays in the ATLAS v2
  paper package and is not switched on its own.

## 2. Limit entries

**The rule** (owner: a better price than market at the next open, the stop unchanged):

- **Price:**
  - `mid`: the signal 5m bar's midpoint, used only when it is better than the market entry; otherwise the trade keeps its
    market entry.
  - `q25` / `q50`: 0.25 / 0.50 of the stop distance back toward the stop, from today's entry.
- **Fill:** a limit fills only when price trades through it by 1 tick, or gaps through it at the open (filled at the open).
  It is cancelled if the target is touched first.
- **Timeout:** 15 or 30 minutes. Then the trade is skipped, or entered at market at the next bar's open + 1 tick.
- **Stop:** stays at the protected level (1 tick beyond the sweep extreme). The target price stays. The smaller stop
  distance gives more micros at the same $ risk (account-B need size on the fill's own risk).
- **On the fill bar** only the stop counts, so no target is booked on the fill bar. From the next bar the member's own
  management runs (engine/advisor.walk: EMA breakeven at +1R, MACD / S/R 15-minute check, flat 15:55). It is tested two
  ways: the management in R of the smaller fill risk, and the same price levels as today.
- **Bars:** true 1m bars for 2026 (days with full 1m coverage), 5m before.
- **Money:** the difference method of tools/structure_atlas.py (the stored trade + the new walk - the base walk).

**Executor check.** A limit at today's entry price (fills at the open without the entry tick; the fill-bar and next-bar
rules above) gives:
- H1 63.9 / 0.8, $1,256 a month, R +0.891;
- H2 44.9 / 0.0, $592, R +0.638;
- 2025 -$224, R +0.106; 2021-24 +$52, R +0.045.

That is within about $150 a month and 0.02R of today's ATLAS, so the losses above come from the limits, not the executor
(run `atw_entry_q0_15m_skip`). The stored research entries sit exactly 1 tick above the 5m open (1,395 trades), which is the
market slippage the limit saves.

**Why it fails:**
- **The winners do not come back.** ATLAS's best trades leave the entry at once: a sweep and a reclaim that works does not
  retrace 0.25-0.5 of the stop.
  - The losers do come back and fill, a little better priced.
  - So the skip versions lose 22-47 H1 winners (+59R to +126R) to avoid 5-21 losers (-5R to -20R).
- **Chasing at market after the timeout** puts the missed winners back, but late and at a worse price. The 0.25-back limit
  with "else market" drops H1 R from +0.884 to +0.511.
- **The per-trade R of the filled limits is better,** e.g. 0.50 back: H1 +1.017 vs +0.884, H2 +0.896 vs +0.620. But the
  account needs the trades it misses: H1 2-week passes fall to 29-58%. 2021-24 R goes below 0 in every skip version
  managed in R, and stays under today's +0.045 when managed at today's price levels.
- **H2 is the only half where some limits look better.** The 0.25-back limit with "else market" reaches a 60.9% 2-week pass
  and $1,465 a month there, against 43.5% and $547. It is the worst in H1 (31.9%, $227), so an H1 pick never chooses it.
  H2 has 51 trades.

## Verdict

- **Windows: no change.** Three frozen cut sets pass the v2 test. None passes the neighbour test, and single cuts pass it
  12% of the time by chance. The EMA 06:00-06:59 fact is real across years but small, already known and part of the atlas-v2
  paper package.
- **Limit entries: rejected.** All 24 limit variants lose 2026 H1 2-week passes (29-58% vs 65.5%) and eval-path $, and the
  skip versions lose R in 2021-24. ATLAS stays on market entries at the next 5m open.

**What a winner would need.** Two things:
- It passes the v2 test, its two neighbours do too (or the gain is a plateau), and it beats the single-cut base rate
  (3 / 25).
- The skipped trades lose in most years.

Its config would be the existing atlas-v2 key, which account B does not read yet:
`"hours_out": {"ema_lon_vix": [[6, 7]]}` (atlas-v2.md candidate 3). For a limit entry, account B can only place market
orders today; a limit would need `engine/account_b` limit support first (the same blocker as the trend hunt in
atlas-v2.md).

## Files

- **Code:** `tools/atw_atlas.py`, with commands `windows`, `singles`, `entries` and `save`.
- **Results:**
  - `research/second/atw_windows.json`: the picks, rows, neighbours and 30 random-window draws per family.
  - `research/second/atw_singles_m30.json`: all 25 single 30-minute cuts.
  - `research/second/atw_entries.json`: 24 limit variants + 2 executor checks, with fill rates and missed winners vs saved
    losers per span.
- **Runs:** `research/runs/atw_*.json`. These are the eval-path trades of the 4 spans, the same format as the ATLAS runs.

Paper research only. Nothing in `engine/`, `second_model.json` or `live_model*.json` was changed.
