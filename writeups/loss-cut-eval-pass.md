## The short answer

- **Nothing here turns this strategy into a 70-80% eval passer.** The best rules add 2-4 points of pass rate. That is about
  as much as a random rule does 1 time in 20.
- **The one rule worth considering is a week brake.** Inside an eval, after the first two trades of a week have both lost,
  trade the rest of that week at half size.
  - It adds money in both periods and cuts 1-month fails.
  - The rule is about protecting the eval, not about better trades: the trades it shrinks are average trades.
- **The intraday package fails the critic.**
  - CISD x1.25 is extra risk, and extra risk lowers the pass rate.
  - The 30-40 pt stop slice and the equal-highs/lows target slice change sign from year to year, or between odd and even
    months, or when the edges move by 5 points.
- **The honest ceiling:**
  - In a 2021-25 kind of market, about 40% of decided evals pass at today's size. Trading smaller barely helps, because
    almost half the trades are already 1 micro and cannot be cut.
  - On the 5-year mix the rate is 53%. To reach 70% you would have to trade at a quarter of today's size, and one eval would
    then take about a year.
  - In a 2026 kind of market the strategy already passes 91%.

## How it was measured

- **Same trades as the live strategy:** the exact live-loop replay, costs included, with the locked sizing (cold-streak
  quarter size, late-entry half size, $800 up to a 20-pt stop).
- **Eval rules:** the MFFU Builder 50K eval.
  - pass at +$3,000
  - fail when the balance touches $2,000 below the best end-of-day balance, checked against the worst open point of the day
  - the floor locks at $50,100
- **Two ways to count evals:**
  - **Real history.** A new eval starts on every session, plus back-to-back evals (a new one the day after each one ends).
    This is close to what really happened, but 2021-25 has only about 18 back-to-back evals, so one eval more or less moves
    the rate by 5 points.
  - **Week shuffle (MC).** 6,000 evals are built from real weeks drawn at random, until each one passes or fails. This gives
    a smooth pass rate that can be compared between rules. "Pass rate" in the tables is this number:
    passed / (passed + failed).
- **The fair comparison is with trading smaller.** Any size cut raises the pass rate a little and slows the evals down. So
  every rule is also compared with simply trading the same strategy uniformly smaller or bigger at the same number of passes
  a year (the column "vs smaller size"). Only a positive number there is a real improvement.
- **Eval-state rules** (week brake, cushion, lock) are applied inside each eval from that eval's own balance. The $ numbers
  for these rules come from back-to-back evals.

## 1. Critic of the intraday package

| piece | 2026 net | 2021-25 net | pass rate 2021-25 / 5y | vs smaller size (2021-25 / 5y) | by year (2021-26, $ vs live) | odd / even months 2021-25 | verdict |
|---|---:|---:|---:|---:|---|---|---|
| live (baseline) | +$20,487 | +$16,379 | 40.0% / 53.2% | 0 / 0 | | | |
| half size on 30-40 pt stops | +$20,900 | +$16,494 | 41.9% / 56.3% | +1.6 / +2.3 | -590, -192, +564, +162, +172, +412 | -$633 / +$749 | partly holds |
| neighbour: 25-35 pts | +$18,484 | +$16,098 | 41.4% / 55.2% | +0.8 / -0.3 | 2026 -$2,003 | | fails |
| neighbour: 35-45 pts | +$20,981 | +$14,968 | 40.1% / 54.5% | -0.2 / +0.5 | 2021-25 -$1,411 | | fails |
| neighbour: 28-42 pts | +$20,120 | +$18,216 | 44.1% / 58.5% | +3.8 / +4.3 | 2026 -$368 | +$602 / +$1,235 | mixed |
| neighbour: 32-38 pts | +$21,283 | +$17,870 | 41.8% / 55.8% | +2.1 / +2.9 | 5 of 6 years + | both + | only 7 trades in 2026 |
| half size on equal-highs/lows targets | +$20,879 | +$16,288 | 41.5% / 56.0% | +1.2 / +1.8 | -635, +1,476, -559, +132, -506, +392 | -$1,633 / +$1,542 | fails |
| CISD x1.25 | +$23,469 | +$17,710 | 38.7% / 51.1% | -0.3 / -0.9 | 5 of 6 years + | both + | more money, fewer passes |
| x1.25 on every trade (for scale) | +$24,282 | +$18,350 | 38.4% / 50.5% | 0 / 0 | | | |
| package: all three | +$24,234 | +$17,787 | 42.1% / 56.6% | +1.8 / +2.9 | 2021 and 2025 negative | -$767 / +$2,175 | fails |
| package: the two half sizes | +$21,251 | +$16,465 | 43.5% / 59.3% | +2.9 / +4.5 | 2021 and 2023 negative | -$1,754 / +$1,840 | fails |

**Random groups.** A random group of the same size beat the 30-40 slice 4.5% of the time in 2026 and 16.5% of the time in
2021-25. For the equal-highs slice the figures are 7.5% and 25%.

**What it means:**
- **CISD really is the better trigger.** It is positive in 5 of 6 years and in both odd and even months. But x1.25 is more
  risk, and more risk fails more evals: 2021-25 1-month fails go from 5.2% to 7.4%. It is good for money, bad for the eval.
- **30-40 pt stops** are a weak lean, not a rule:
  - two of six years are negative
  - the odd months of 2021-25 are negative
  - moving the edges 5 points either way breaks it
- **Equal-highs/lows targets** are a coin flip year by year.
- **Verdict:** nothing from the package is adopt-ready. If one piece is kept, "30-40 pt stops at half size" does the least
  harm, but it is inside the noise.

## 2. New loss-cutting ideas

One thing first: the bot takes at most one trade a day (all 768 days had exactly one), so a daily loss cap can never trigger.
The worst day is one stop-out, under $1,000. The next unit up is the week.

| idea (run) | 2026 net, $/mo | 2021-25 net, $/mo | PF 26 / 21-25 | max DD 26 / 21-25 | pass rate 2026 / 2021-25 / 5y | vs smaller size 2021-25 / 5y | 1-month pass/fail 2021-25 | verdict |
|---|---:|---:|---|---|---|---|---|---|
| **live (baseline)** | +$20,487, $2,088 | +$16,379, $321 | 3.94 / 1.27 | -2,249 / -9,265 | 91.5 / 40.0 / 53.2 | 0 / 0 | 8.8 / 5.2 | |
| **week brake: half size after 2 losing trades in the week** (`losscut_wk2loss_half`) | +$20,776, $2,118 | +$17,207, $337 | 4.16 / 1.31 | -1,912 / -8,372 | 93.6 / 42.2 / 56.3 | +1.9 / +2.2 | 9.0 / 3.1 | best new idea, small |
| same, x0.25 (`_q25`) | +$20,930 | +$17,910 | | | 94.4 / 42.9 / 57.8 | +2.5 / +3.6 | | neighbour agrees |
| same, x0.75 (`_q75`) | +$20,616 | +$16,899 | | | 92.6 / 41.2 / 55.5 | +1.0 / +1.8 | | neighbour agrees |
| week down after 2+ trades, half size (`losscut_wkneg2_half`) | +$20,519, $2,092 | +$18,100, $355 | 4.17 / 1.33 | -1,912 / -8,295 | 93.7 / 43.6 / 57.6 | +3.3 / +3.5 | 9.0 / 2.0 | neighbour agrees |
| week brake after -$200 / -$300 | +$19,499 / +$20,669 | +$18,766 / +$17,095 | | | | +3.4 / +1.2 (2021-25) | | -$200 costs 2026 $1k |
| week brake after -$400 / -$500 / -$800 | about the same | -$0.8k to -$1.5k | | | | -0.4 to -1.2 | | rejected |
| skip the rest of the week after 2 losses | +$18,993 | +$20,268 | | | | +6.5 (2021-25), -1.1 (2026) | | under 2 trades a week in 2026 |
| half size after 2 losses in a row, any week (`loss2`) | +$15,981 | +$11,660 | | | | -1.4 / -1.8 | | rejected |
| size with the cushion to the trailing loss (`cush_ladder`, `cush_prop`, `cush750`, `dd1000`) | -$1.8k to -$4.6k | -$2.7k to -$6.3k | | | up to 98.7 / 42.7 / 62.2 | -1.4 to +0.7 | down to 0.0 fails | slower evals, not better ones (as in eval-sizing.md) |
| x1.5 once the floor has locked (`lock_press`) | +$23,009 | +$17,116 | | | 90.2 / 38.4 / 51.2 | -1.3 / -1.7 | 8.9 / 6.2 | rejected |
| never risk more than what is still needed (`finish_cap`) | +$19,607 | +$15,839 | | | | +1.4 / +0.8 | | no effect |
| half size when the stop is over 20-30% of the 14-day ADR | about the same | -$0.4k to -$1.2k | | | | 0 to +0.7 | | rejected (wide stops are already small) |
| half size on the first trade after a cold streak ends | +$20,514 | +$17,195 | 4.04 / 1.29 | | 92.2 / 41.5 / 54.8 | +1.7 / +1.5 | 8.8 / 4.9 | flips by year |
| x1.25 on that first trade | -$76 | -$647 | | | | -0.8 / -1.3 | | rejected |
| half size 60+ minutes into the killzone | +$12,051 | +$12,328 | | | | -0.5 / -5.7 | | rejected |
| half size without a re-sweep | +$20,512 | +$14,560 | | | | +0.2 / +0.8 | | rejected |
| half size when inducement was taken first (84% of trades) | +$12,673 | +$11,662 | | | 97.2 / 51.1 / 68.3 | +7.6 / +7.3 | 5.6 / 0.0 | rejected: median 102 sessions to pass, money down in 4 of 6 years |
| x1.5 when no inducement was taken | +$23,124 | +$19,558 | | | | +1.1 / +0.1 | 6.4% fails | rejected |
| half size on IFVG against the 1H trend | +$17,878 | +$16,467 | | | | +2.2 / +1.6, 2026 -1.6 | | rejected |
| half size on IFVG that swept only a 15m swing | +$19,264 | +$14,716 | | | | -0.9 / -0.6 | | rejected |
| **week brake + 30-40 pt half** (`combo_wk2_stop3040`) | +$21,254, $2,167 | +$16,332, $320 | 4.73 / 1.33 | -1,906 / -7,482 | 95.5 / 44.0 / 60.4 | +3.4 / +5.6 | 9.4 / 2.9 | inherits the 30-40 critic |
| **week brake + both intraday half sizes** (`combo_wk2_defensive`) | +$21,506, $2,192 | +$16,659, $326 | 5.04 / 1.36 | -1,807 / -6,017 | 96.5 / 46.3 / 63.6 | +5.4 / +8.1 | 9.2 / 0.7 | highest pass rate, but 2 of 3 pieces fail the critic |

All rules trade 2.16 a week in 2026 and 3.17 in 2021-25 (every setup is still taken), except "skip the rest of the week".

**Real history, back-to-back evals over 5 years:**
- live: 12 passed / 11 failed
- week brake: 12 / 10
- week down after 2+ trades: 12 / 9
- week brake + both half sizes: 11 / 6

**Why the week brake might work, and why it might be luck:**
- **For it:**
  - Every neighbour points the same way: quarter, half or three-quarter size, "two losses" or "week down after two trades",
    -$200 or -$300.
  - It never blocks a trade, and it adds money in both periods.
  - On real history it raised the pass rate of evals started in 2021, 2023, 2025 and 2026, and lowered 2024 by 2 points.
- **Against it:**
  - The trades it shrinks are not worse than the others. In 2021-25 they average -0.01R against +0.02R for the rest, and a
    random group is as bad 41% of the time. In 2026: +0.22R against +0.43R.
  - Whether those trades lose flips by year and by odd/even month.
  - The gain looks more like timing (smaller size while the eval is under pressure) than like knowledge.
  - Half size on a random 20% of trades does as well 5% of the time, and about a dozen week variants were tried.
- **Verdict:** a reasonable, cheap safety rule. Its benefit is small and not proven.

## 3. What to adopt

- **Nothing is adopt-ready under the owner's rule** (better in 2026 AND 2021-25, holding up under the critic).
- **If one rule is added for the eval, take the week brake:** half size for the rest of the eval week after the first two
  trades of that week both lost.
  - It needs no engine change: one more multiplier in `engine/sizing.py` from the eval ledger.
  - It costs nothing in either period and trims 1-month fails.
  - Write it down as "eval safety, unproven", and do not expect a different eval experience from it.
- **Do not add CISD x1.25** while the goal is passing evals.
- **Leave the equal-highs and 30-40 pt slices alone** until 2027 data says more.

## 4. How high can the pass rate go? The math

**What one eval needs:**
- reach +$3,000 before falling $2,000 below the best day-end balance
- the floor stops trailing once it reaches $50,100

**What the strategy delivers per trade (today's sizing, costs in):**

| | win rate | avg win | avg loss | median loss | avg per trade | spread per trade | wins needed for +$3k | average losses for -$2k |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026 | 25.8% | +$1,194 | -$106 | -$48 | +$230 | $849 | 2.5 | 19 |
| 2021-25 | 21.1% | +$542 | -$114 | -$66 | +$24 | $439 | 5.5 | 18 |
| 5 years | 21.6% | +$632 | -$113 | -$62 | +$48 | $508 | 4.7 | 18 |

- **Pass chance as a coin game.** For a fair coin game the pass chance is 2,000 / 5,000 = 40%. A small edge raises it by
  P = (1 - e^(-k·2000)) / (1 - e^(-k·5000)), where k = 2 × average / spread².
  - 2021-25: k is about 0.00025, so P is about 55% with a fixed floor.
  - The trailing floor takes back part of every run-up before a pass, and the real result is 39-40%.
  - 2026: the edge is 10 times larger per trade, and the pass rate is 91-92%.
- **What 75% needs.** With a fixed floor it needs k·2000 ≈ 1.3, about 2.5 times the 2021-25 edge per unit of risk (+$62
  instead of +$24 a trade at the same spread). With the trailing floor it needs even more.
- **Trading smaller does not get there in practice:**

| size on every trade | 2021-25 pass rate | 2021-25 median sessions to pass | 5-year pass rate | 5-year median sessions to pass |
|---|---:|---:|---:|---:|
| x1.5 | 36.7% | 27 | 46.9% | 26 |
| x1 (today) | 40.0% | 43 | 53.2% | 42 |
| x0.75 | 43.2% | 73 | 59.5% | 72 |
| x0.5 | 44.3% | 136 | 64.0% | 127 |
| x0.25 | 44.6% (23% still open after 2 years) | 273 | 71.2% (16% open) | 254 |

  - In 2021-25, cutting the size hardly helps. 47% of trades are already 1 micro and cannot get smaller, so the 1-micro
    losers keep coming at full weight.
  - On the 5-year mix, x0.25 reaches 71%, but a pass takes about a year. That breaks the owner's 2-3 week rule by a factor
    of 15.

**Bottom line for the owner:**
- With this win rate (about 1 in 5) and this win/loss shape, expect:
  - about **40% of decided evals to pass** in a 2021-25 kind of market
  - **about 90%** in a 2026 kind of market
  - **50-55%** over a mix of the two
- A loss-cut rule adds 2-4 points at most.
- 70-80% needs a better edge (more average $ per trade for the same swings), not a better loss rule.
- The cheapest lever stays the one in eval-game.md: **buy the eval right after the cold-streak filter turns back to full
  size.** That roughly triples the 1-month pass odds in 2021-25.

## Files

- Script: `tools/research_losscut.py` (`critic`, `frontier`, `ideas`).
- Numbers: `research/lab/losscut.json` (every row, the uniform-size frontier, the math, the random-rule test) and
  `research/lab/losscut_week_critic.json` (trade-level test of the week brake).
- Runs: `research/runs/losscut_*.json`. They are stored under family "risk" with the tag "losscut", because the dashboards
  only know the existing families.
