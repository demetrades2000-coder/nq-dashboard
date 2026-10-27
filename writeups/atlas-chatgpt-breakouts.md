## In one minute

- **The ask:** ChatGPT's dossier (2026-10-24, `research/writeups/specs/chatgpt-2026-10-24-ideas.md`) proposed 10 breakout
  templates (A01-A10) as new members for ATLAS on the Builder 25K (account B). Each was built as specified, with its
  primary setting (P) and two alternatives (A1, A2): 30 tests.
- **Money first.** The best setting of each template was picked on 2026 H1. The 10 picks make between -$662 and +$6,175
  in H1, and between -$5,518 and +$4,381 in H2. Only 5 of the 10 stay positive in H2, which is what chance gives.
- **On the 25K next to ATLAS, none helps.** ATLAS alone passes 72.3% of evals within 2 weeks in H1, with 5.0% dead and
  +$19,751. In H2 it is 43.5%, 0.0% dead and +$5,448. Adding any template costs 2-week passes, dead evals or money. Out of
  30 settings, 0 beat ATLAS in H1 and 0 in H2.
- **Alone on a 25K they cannot pass an eval.** The stops sit at the structure, which is far away: the 2026 median is 55-165
  pts. At the $500 ceiling that leaves 1-2 micros. ATLAS's need size gives 0 micros above about 89 pts. Results run from
  0% passed in 2 weeks to at most 43% passed with 39-60% dead.
- **One real finding, still no use.** A09 (a 5m close beyond the prior 6/12/24 bars) made +$34k to +$56k over 5 years at
  1-2 micros. It beats random directions at the same times (placebo 0.5-6.5%). But in 2026 it made only +$1.5k to +$5.4k,
  which random directions match (placebo 36-46%). It also makes ATLAS's evals worse.
- **Tsai et al. 2019 (1-min TORB):** in 2026, A01 is flat: PF 0.96-1.07, 29-34% winners, -$2.1k to +$3.3k. 2021-25
  cannot be tested at 1 minute, because there are no official 1m bars before 2026. The closest proxy is the 5-min opening
  range (A02): it made +$45k in 2021-25, then lost $1.3k-$5.1k in 2026. The published edge does not show up now.
- **Verdict: reject all 10 for account B.** Nothing was built. `second_model.json` and account_b are untouched.

## Ranked: the H1 pick of each template (spec size, never opposite LIT, costs in)

- **Order:** first by whether the template holds up in every period, then by its 5-year money.
- **"ATLAS +" columns:** the 25K eval path with ATLAS plus the template (need size, max 2 trades a day combined), as
  2-week pass / dead (fail + stuck) %, then the path $.
- **ATLAS alone for comparison:** 72.3 / 5.0, +$19,751 in H1 and 43.5 / 0.0, +$5,448 in H2.

| # | Template (H1 pick) | 2026 /wk | weeks 2+ | win % | PF 2026 | net 2026 ($/mo) | max DD 2026 | H1 | H2 | 2025 | 2021-24 | 5 y net ($/mo) | corr LIT | ATLAS + H1 | ATLAS + H2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A09 A2: 5m close beyond the prior 24 bars, 4R | 4.6 | 98% | 41 | 1.14 | +$5,352 ($546) | -$5,428 | +$4,188 | +$1,165 | +$19,962 | +$30,445 | +$55,760 ($916) | 0.00 | 61.3 / 11.8, +$13,207 | 44.9 / 0.0, +$4,687 |
| 2 | A05 P: previous week high/low, 3R | 1.2 | 26% | 52 | 1.67 | +$5,135 ($523) | -$1,323 | +$4,826 | +$309 | +$2,641 | +$241 | +$8,016 ($132) | 0.02 | 72.3 / 11.8, +$19,586 | 44.9 / 0.0, +$4,916 |
| 3 | A04 P: previous RTH range, 1 tick, 3R | 2.6 | 88% | 44 | 1.30 | +$5,581 ($569) | -$3,916 | +$6,175 | -$594 | +$748 | +$13,289 | +$19,618 ($322) | 0.05 | 73.1 / 14.3, +$21,453 | 44.9 / 8.7, +$7,949 |
| 4 | A03 A1: overnight box, freeze 03:00, 2 ticks, 2R | 4.7 | 98% | 38 | 1.13 | +$5,987 ($610) | -$8,849 | +$1,606 | +$4,381 | -$376 | -$40,204 | -$34,593 (-$568) | 0.02 | 56.3 / 25.2, +$13,416 | 39.1 / 20.3, +$6,383 |
| 5 | A01 A2: 3-min opening range, 4 ticks, 4R | 4.7 | 98% | 33 | 1.07 | +$3,322 ($339) | -$7,517 | +$280 | +$3,043 | 3 trades | no 1m data | +$4,306 | -0.09 | 63.9 / 25.2, +$14,704 | 46.4 / 20.3, +$5,268 |
| 6 | A08 A1: 5m inside bar, 10 min, 2R | 4.9 | 98% | 38 | 1.02 | +$1,222 ($125) | -$3,592 | +$579 | +$642 | -$9,121 | -$2,034 | -$9,934 (-$163) | -0.12 | 63.0 / 19.3, +$15,002 | 59.4 / 17.4, +$6,846 |
| 7 | A02 A2: 20-min opening range, 4 ticks, 4R | 4.0 | 93% | 47 | 0.95 | -$1,332 (-$136) | -$7,856 | +$4,186 | -$5,518 | +$1,855 | +$24,410 | +$24,933 ($410) | 0.05 | 71.4 / 4.2, +$17,997 | 43.5 / 1.4, +$7,559 |
| 8 | A07 P: 1m narrowest of 7, 5 bars, 3R | 4.6 | 98% | 26 | 0.99 | -$677 (-$69) | -$18,091 | +$4,337 | -$5,014 | +$7,328 | +$2,392 | +$9,043 ($149) | 0.00 | 66.4 / 29.4, +$15,472 | 50.7 / 43.5, +$3,121 |
| 9 | A10 A2: 4-pivot compression, 40 min, 4R | 0.1 | 0% | 25 | 1.32 | +$405 ($41) | -$760 | +$405 | 0 trades | -$63 | +$2,338 | +$2,680 ($44) | 0.33 | 70.6 / 5.0, +$21,584 | 43.5 / 0.0, +$5,448 |
| 10 | A06 P: inside-day breakout, 3R | 0.2 | 0% | 33 | 0.65 | -$555 (-$57) | -$1,591 | -$662 | +$107 | -$1,004 | -$2,750 | -$4,309 (-$71) | 0.18 | 69.7 / 5.0, +$19,751 | 43.5 / 0.0, +$5,448 |

Every pick is rejected: none beats ATLAS alone in either half.

- **#1, A09 A2:** a finding only. It has a direction edge in 2021-25, but none in 2026.
- **#2, A05 P:** too rare (1.2 trades a week), and no better than random (placebo 16-24%).
- **#3-#8:** rejected outright.
- **#9, A10 A2:** about 4 trades a year.
- **#10, A06 P:** loses money.

Each template alone on its own 25K (need size), 2-week pass / dead %, H1 then H2:

| Template | H1 | H2 |
|---|---|---|
| A09A2 | 5.9 / 3.4 | 1.4 / 0.0 |
| A05P | 5.0 / 0.0 | 1.4 / 0.0 |
| A04P | 1.7 / 0.0 | 0.0 / 0.0 |
| A03A1 | 12.6 / 18.5 | 23.2 / 4.3 |
| A01A2 | 21.0 / 21.0 | 31.9 / 20.3 |
| A08A1 | 13.4 / 25.2 | 18.8 / 11.6 |
| A02A2 | 0.0 / 0.0 | 0.0 / 0.0 |
| A07P | 42.9 / 38.7 | 29.0 / 55.1 |
| A10A2 | 8.4 / 0.0 | 0.0 / 0.0 |
| A06P | 0.0 / 0.0 | 0.0 / 0.0 |

All 30 settings (P, A1 and A2 of each template) are in `research/second/atlas_gpt.json` and in the runs `atlas_gpt_<key>`
(for example `atlas_gpt_a09a2`).

## How it was tested

- **Data:** TradingView CME NQ1! 5m for 2021-11 to 2026-10-16, plus the clean true 1m bars from `engine/lit.bars_1m`
  (2026 only, 208 days). No Yahoo.
- **Spec rules:**
  - One attempt a day per template.
  - Entry at the next bar's open + 1 tick; entries until 15:30 ET; flat at 15:55.
  - Stop 1 tick beyond the structure: the range extreme, the mother bar, the narrow bar, or the latest opposite 5m pivot.
  - The pivot is a strict 2/2 fractal, known 2 bars later, within 12 5m bars. No pivot means no trade.
  - Target 3R (P), 2R (A1) or 4R (A2), measured from the real fill.
  - A stop exit fills 1 tick worse. A bar that touches both the stop and the target counts as the stop.
- **Size:**
  - Spec: q = floor(min($500, today's budget, room) / (stop x $2 + $1.90 + $0.50)). If q < 1, the trade is skipped. On
    top, the 25K's 20-micro limit.
  - Standalone: today's budget is the $600 soft daily loss; no floor.
  - 25K eval path: the ATLAS executor (`tools/atlas.py` on `tools/second_account_b.py`) with today's need size. That
    means 50% of the room, 20 micros max, the $600 day guard, and 30% of the room after session 10.
  - Account rules on the eval path: one position at a time, at most 2 trades a day combined.
  - No entry opposite LIT, including LIT's armed setups. If LIT enters the other way, ATLAS closes first (HEDGE). LIT's
    trades come from its live replay (run `lit_live`).
- **My choices where the spec was silent:**
  - **Trading windows:** A03 trades from its freeze time (02:00 / 03:00 / 04:00); every other template trades 09:30-15:30.
  - **Real crosses:** the level breakouts A03-A06 need a real cross, meaning the previous close was not already beyond the
    level.
  - **5m closes everywhere:** A02, A03, A04, A06 and A09.
  - **1m closes in 2026:** A01, A05, A07, A08 and A10. Before 2026 they use 5m closes as a proxy, and A01 has no trades
    there.
  - **Which signal counts:** "first valid signal" = the first breakout that has a usable stop.
  - **Pivot alternatives:** the spec's alternatives (1/3 bars, 6/24 bars) were not crossed in.
- **Resolution check (2026 re-run on 5m bars instead of 1m):**
  - A02, A04, A05 and A09 move by at most $140, so the gap between 2026 and 2021-25 is not a bar-size effect.
  - A07 moves from -$677 to -$4,831, because its 5m proxy is a different setup.
- **Look-ahead check:** all 25,116 signals (30 settings x every day) were regenerated on the day's bars cut at their own
  signal close, with only the pivots confirmed by then. 0 differ.
- **Picking:** each template's setting was picked on 2026 H1 standalone net. H2, 2025 and 2021-24 were read only afterwards.
- **Count of tests:** 30 settings, 10 picks.
  - 5 of the 10 picks are positive in H2; chance gives 5.
  - 4 of the 30 settings are positive in all four periods (A05P and the three A09s). Chance gives about 2 if the periods
    were independent, and the three A09s are one idea.

## Placebo: random directions at the same entry times (200 draws)

Each draw keeps the trade's entry time, stop distance and R target, and only the direction is random.

| Setting | 2026: real / placebo median / share >= real | 5 years: real / placebo median / share >= real |
|---|---|---|
| A09P | +$3,392 / +$963 / 36% | +$50,833 / +$13,508 / 1.5% |
| A09A1 | +$1,475 / +$839 / 46% | +$34,024 / +$1,120 / 6.5% |
| A09A2 | +$5,353 / +$3,336 / 36% | +$55,760 / +$16,415 / 0.5% |
| A05P | +$5,135 / +$1,704 / 16% | +$8,016 / +$2,269 / 24% |
| A04A2 | +$5,807 / +$5,541 / 47% | +$27,758 / +$6,635 / 5% |
| A02P | -$5,099 / -$2,792 / 70% | +$39,884 / +$16,731 / 16% |

- **Why random is positive:** wide stops plus 3-4R targets, in a market that rose, make even random-direction trades a
  little positive over 5 years.
- **A09:** its direction edge is real in 2021-25 (0.5-6.5%) and gone in 2026 (36-46%). 2026 is the year ATLAS is judged on.
- **A05 and A04:** no better than random.

## Overlaps with earlier work

- **The same ORB family:** the opening-range and 1m breakouts (A01, A02, A07) repeat the ORB family in `allday.md`, which
  was rejected as no better than random.
- **The continuation family:** A09 and A10 are close to the continuation family in `hq-continuation.md`. It was rejected:
  its 2026 picks lost $35-44k in 2021-24.
- **The opposite trade failed too:** the failed-ORB fade in `hq-reversion.md` also lost. The market neither breaks out
  nor fades reliably at these levels.
- **The same levels as ATLAS:** ATLAS's S/R member already trades the levels A03-A06 use (previous RTH, overnight and week
  high/low), as a sweep-and-reclaim, which is the opposite trade. The breakout templates take the other side of the same
  levels.

## Why they fail on the 25K

- **Wide stops mean tiny size.** Structural stops in 2026 have a median of 55-165 pts; ATLAS's members are about 25-40. The
  $500 ceiling gives 1-2 micros. ATLAS's need size (LIT's 800 x 20 / stop base) gives 0 micros above about 89 pts, so most
  template trades vanish on the eval path.
- **Low win rates.** The trades that remain win only 26-47% of the time. On a 25K with $1,000 of room, they add losing days
  before ATLAS's winners arrive.
- **The best "pass" lift is not real.** A04P lifts H1 passes from 72.3 to 73.1, but nearly triples dead evals (5.0 -> 14.3),
  and in H2 it brings 8.7% dead evals where ATLAS alone has 0.0.

## Reproduce

    python -X utf8 tools/second_mix.py units        # unit caches (once, ~1 min)
    python -X utf8 tools/atlas_gpt.py run           # 30 settings -> research/second/atlas_gpt.json (~10 min)
    python -X utf8 tools/atlas_gpt.py lookahead     # 25,116 signals on cut data, 0 differ
    python -X utf8 tools/atlas_gpt.py placebo A09P A09A1 A09A2 A05P A04A2 A02P
    python -X utf8 tools/atlas_gpt.py save          # runs atlas_gpt_*

The run library's own eval columns re-score each run on its default plan. The 25K numbers in this write-up come from
`atlas_gpt.json`.
