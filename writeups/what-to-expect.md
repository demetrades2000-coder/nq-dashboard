## The short version

Everything below is the locked strategy's exact 5-year replay (768 trades, Nov 2021 - Oct 16 2026, costs and the live
sizing included: quarter size in cold streaks, half size on late entries). Nothing was changed or optimised; this page is
about what living with it feels like, in numbers.

- **It wins 1 trade in 4 in 2026 and 1 in 5 in 2021-25.** The other trades are full stop-outs (31%) or scratches near zero (34%).
- **Long runs without a winner are the normal state, not a sign that something is broken.** 2021-25 had a 4+ run about 13 times a year and a 6+ run about 9 times a year. The record is 33 trades in a row without a winner (Sep 1 - Nov 17 2025, -$3,126). 2026 had 16 in a row (Apr 20 - May 29, -$1,667). The longest time between two winning trades was 82 days (Aug 29 - Nov 19 2025); in 2026, 65 days (Jun 2 - Aug 6).
- **A loss does not make the next trade worse.** After a loss the next trade averaged +0.02R, after a win -0.01R (2021-25, 679 trades); the chance that this difference is noise is 79%. After a full-size stop-out the next trade was actually a little better than average (+0.15R vs +0.01R). So **do not sit out or size down after a big loss**: every version of that rule lost money in both periods (table at the end).
- **But losing stretches run longer than coin flips would.** If the trades were shuffled at random the longest run without a winner in 2021-25 would typically be 22, not 33 (only 4% of shuffles reach 33). That clustering lives at the level of weeks and regimes, not trade to trade, and it is exactly what the cold-streak filter handles.
- **Drawdowns are long and shallow, not sudden.** The worst, -$9,265 at the close (-$9,440 intraday), took 58 weeks to bottom (Mar 2022 - May 2023) and 67 weeks to recover. 2026's worst was -$2,249 (Mar 13 - Aug 24, recovered Aug 27). A drawdown of $1,000 or more happened 10 times in 5 years, $2,000+ six times, $4,000+ three times.
- **Most months lose a little; a few months make the year.** Over 5 years the median month is -$184 and only 40% of months are positive, yet the average month is +$614. 2026: median +$1,162, half the months positive, average +$2,049. The worst month was -$2,570 (Nov 2024), the best +$7,294 (Sep 2026).
- **The profit is concentrated.** The best 5% of trades (38 of 768) made $69,001, 66% of all gross profit; without them the 5 years would be -$32,135. The 13 best trades equal the entire 5-year net; the other 755 trades net to zero. You must take every setup to catch them.
- **Kelly says $800 is tiny for a $50,000 account (7% of Kelly) but about 1.8x Kelly against the $2,000 eval drawdown allowance** on the 5-year record (half Kelly on 2026 alone). That is the real reason evals fail: the eval account is a $2,000 account, not a $50,000 one.

## 1. What one trade looks like

| | 2026 (89 trades) | 2021-25 (679) | All 5 years (768) |
|---|---:|---:|---:|
| Winners (P&L above 0) | 25.8% | 21.1% | 21.6% |
| Full stop-outs (about -1R) | 28.1% | 31.8% | 31.4% |
| Scratches (between -0.25R and +0.25R) | 38.2% | 32.8% | 33.5% |
| Trades of +2R or more | 15.7% | 9.9% | 10.5% |
| Trades of +3R or more | 12.4% | 5.3% | 6.1% |
| Average winner | +2.96R, +$1,194 | +2.09R, +$542 | +2.21R, +$632 |
| Average loser (incl. scratches) | -0.48R, -$106 | -0.54R, -$114 | -0.54R, -$113 |
| Average trade | +0.41R, +$230 | +0.01R, +$24 | +0.06R, +$48 |
| Biggest winner / biggest loser | +$3,932 / -$524 | +$3,922 / -$875 | +$3,932 / -$875 |

R and $ of a single trade, from worst to best (all 5 years): 5% of trades are at -1.04R or worse, a quarter at -1.02R, the median
trade is -0.21R, three quarters are below -0.01R, the top 10% start at +2.11R, the top 5% at +3.36R, the top 1% at +4.98R. In
dollars: 5% lose $420 or more, a quarter lose $106 or more, the median trade is -$26, the top 10% make $405 or more, the top
5% $739 or more, the top 1% $2,548 or more. The median trade losing a little is what "1 winner in 5" looks like day to day.

## 2. Streaks

Two ways to count a losing run. "No winner" counts every non-winning trade, scratches included (a breakeven exit at -$2 is a
"loss" here). "Real losses" counts only trades of -0.5R or worse and lets scratches pass without breaking the run.

| | 2026 (0.8 yr) | 2021-25 (4.2 yr) | All 5 years |
|---|---:|---:|---:|
| Runs of 4+ without a winner | 5 (about 6 a year) | 56 (about 13 a year) | 61 |
| Runs of 6+ without a winner | 3 | 36 (about 9 a year) | 39 |
| Runs of 8+ without a winner | 3 | 21 (about 5 a year) | 24 |
| Longest run without a winner | 16: Apr 20 - May 29 2026, -$1,667 (-10.8R) | 33: Sep 1 - Nov 17 2025, -$3,126 (-19.1R) | 33 |
| Runs of 4+ real losses | 1 | 25 (about 6 a year) | 26 |
| Runs of 6+ real losses | 1 | 10 (about 2 a year) | 11 |
| Longest run of real losses | 10: Apr 27 - May 27 2026 (12 trades, -$1,551) | 19: Sep 1 - Nov 5 2025 (31 trades, -$3,123) | 19 |
| Longest run of winners | 2 | 4 (once) | 4 |
| Longest gap between two winning trades | 65 days (Jun 2 - Aug 6 2026) | 82 days (Aug 29 - Nov 19 2025) | 82 days |
| Longest run without a winner if the order were random (typical / 1 in 10 worse) | 11 / 16 | 22 / 29 | 22 / 29 |

- **Winners come alone.** Of 113 winning runs in 2021-25, 89 were a single winner; never more than 4 in a row. Do not expect a
  "hot hand" either.
- **The 33-run was at quarter size.** The record losing run cost $3,126 because the cold-streak filter had most of it at 1-6
  micros; its sizes ran from 1 to 17 micros at the start.
- The shuffle test says the real losing runs are longer than chance (33 vs a typical 22, 4% of random orders reach 33; the
  real-loss run of 19 vs 13, 8%; the 2026 run of 10 real losses vs 5, 3%). The strategy goes out of step with the market
  for weeks at a time. The cold-streak filter is the answer to that; a trade-by-trade rule is not (next section).

## 3. Does a loss make the next trade worse? No.

| after ... | trades | next trade avg R | next trade win % | next trade full stop-out % |
|---|---:|---:|---:|---:|
| **2021-25** any loss | 536 | +0.02R | 21.1% | 30.2% |
| any win | 142 | -0.01R | 21.1% | 37.3% |
| a full stop-out (any size) | 216 | +0.10R | 22.7% | 28.2% |
| a full-size stop-out (no cold / late cut) | 94 | +0.15R | 25.5% | 27.7% |
| a $500+ loss | 26 | +0.26R | 34.6% | 30.8% |
| every trade | 679 | +0.01R | 21.1% | 31.8% |
| **2026** any loss | 65 | +0.43R | 24.6% | 26.2% |
| any win | 23 | +0.29R | 26.1% | 34.8% |
| a full-size stop-out | 14 | +0.09R | 21.4% | 42.9% |
| every trade | 89 | +0.41R | 25.8% | 28.1% |

- The win rate after a win and after a loss is the same to the decimal in 2021-25 (21.1% / 21.1%). The number of
  alternations between wins and losses is 226 against 227 expected from a coin with the same win rate. The trade-to-trade
  correlation of R is -0.01 (2021-25) and -0.05 (2026). Shuffling the order 3,000 times, a gap as big as the observed
  "after loss minus after win" appears 79% of the time (2021-25) and 75% (2026): pure noise.
- If anything the trade after a big loss is slightly better. The full-size stop-outs tend to happen on tight stops in
  rotational days; the next setup is then often the one that works. That is a tendency in 94 trades, not a rule to size on.

## 4. Drawdowns and flat stretches

Measured on the daily equity of the sized trades, with the intraday low of every day. Dips smaller than $300 are ignored.

| | 2026 | 2021-25 | All 5 years |
|---|---:|---:|---:|
| Drawdowns of $300+ | 7 | 18 | 24 |
| Typical drawdown (median depth) | $518 | $1,097 | $840 |
| 1 in 4 is deeper than | $836 | $2,608 | $1,938 |
| 1 in 10 is deeper than | $1,520 | $4,457 | $3,951 |
| Worst (intraday / at the close) | $2,309 / $2,249 | $9,440 / $9,265 | $9,440 / $9,265 |
| Drawdowns of $1,000+ / $2,000+ / $4,000+ | 1 / 1 / 0 | 9 / 5 / 3 | 10 / 6 / 3 |
| Typical length, peak to new high (median) | 8 sessions | 12 sessions | 10 sessions |
| 1 in 4 lasts longer than | 16 sessions (3 weeks) | 74 sessions (15 weeks) | 51 sessions (10 weeks) |
| 1 in 10 lasts longer than | 62 sessions (12 weeks) | 160 sessions (32 weeks) | 146 sessions (29 weeks) |
| Longest stretch without a new equity high | 24 weeks | 67 weeks | 67 weeks |
| Sessions from the bottom back to a new high (median / 1 in 10 worse than) | 2 / 4 | 2 / 56 | 2.5 / 44 |

The six biggest, with dates:

| peak | bottom | new high | depth (intraday) | weeks to the bottom | weeks under water |
|---|---|---|---:|---:|---:|
| 2022-03-16 | 2023-05-03 | 2023-07-04 | -$9,440 | 58 | 67 |
| 2023-09-12 | 2024-02-15 | 2024-04-17 | -$5,139 | 22 | 31 |
| 2024-11-14 | 2025-04-02 | 2025-07-24 | -$4,165 | 19 | 35 |
| 2025-08-29 | 2025-12-26 | 2026-01-23 | -$3,451 | 17 | 21 |
| 2024-04-29 | 2024-07-16 | 2024-10-29 | -$2,872 | 11 | 26 |
| 2026-03-13 | 2026-08-24 | 2026-08-27 | -$2,309 | 23 | 24 |

- **Recoveries are fast once they start** (median 2 sessions from the bottom to a new high): the bottom is usually a
  quarter-size stretch and the new high comes from one or two full-size winners. The long part is the slide and the flat
  grind before it, not the climb out.
- **2026 spent 24 of its 41 weeks under its March high.** Even the best year on record had half a year with no new high.
- As of 2026-10-16 the equity high is 2 sessions old (Oct 14).

## 5. Where the money comes from

| | 2026 | 2021-25 | All 5 years |
|---|---:|---:|---:|
| Net | +$20,487 | +$16,379 | +$36,866 |
| Best 5% of trades: count, $ | 4 trades, $14,028 | 34 trades, $50,241 | 38 trades, $69,001 |
| Their share of all gross profit | 51% | 65% | 66% |
| Net without them | +$6,460 | -$33,862 | -$32,135 |
| Net without the single best trade | +$16,556 | +$12,457 | +$32,935 |
| Net without the best 3 trades | +$8,879 | +$6,190 | +$25,100 |
| Best trades that add up to the whole net (all the others net to zero) | 8 | 6 | 13 |
| Best 10% of trades, $ | $21,800 | $67,483 | $91,253 |

This is why the owner's rule "every setup is traded, only the size changes" matters so much: missing a handful of trades a
year can turn a year negative. It is also why the strategy feels like losing most of the time while making money.

## 6. Kelly: is $800 a lot or a little?

"Kelly" here is the multiplier on today's whole sizing (the $800-per-20-pt rule with the wide-stop scaling, the cold quarter
and the late half all kept) that would have maximised long-run growth of a given bankroll. It is a growth number, not a
safety number; full Kelly means huge drawdowns.

| bankroll | 2026 | 2021-25 | All 5 years |
|---|---:|---:|---:|
| **$50,000 account:** Kelly multiplier on today's sizing | 48x | 7.8x | 13.8x |
| Kelly $ risk per 20-pt stop (today $800) | $38,280 | $6,200 | $11,040 |
| Today's $800 as a fraction of Kelly | 2% | 13% | 7% |
| **$2,000 bankroll (the MFFU trailing max loss):** Kelly multiplier | 1.9x | 0.30x | 0.55x |
| Kelly $ risk per 20-pt stop | $1,520 | $240 | $440 |
| Today's $800 as a fraction of Kelly | 0.53x (half Kelly) | 3.3x (over Kelly) | 1.8x (over Kelly) |
| Average $ actually at risk per trade (after the wide-stop scaling, cold and late cuts) | $259 | $212 | $218 |

- Against a real $50,000 account the bot risks very little: 0.4% of the account on an average trade, 1.6% at full size.
  The textbook formula on the 5-year stats (win 21.6%, average winner 4.1x the average loser) says 2.6% of the bankroll per
  1R; $800 is 1.6%.
- **Against the eval's $2,000 allowance it is a different story.** On the 5-year record the growth-optimal unit would be about
  $440, and $800 is 1.8x that; on 2021-25 alone 3.3x. Only 2026's numbers justify $800 (half Kelly). Betting above Kelly on a
  bankroll means the bankroll usually dies before the edge shows up, which is what "more back-to-back evals failed than
  passed over 5 years" says in plain words. This is not an argument to change the size: the eval also needs $3,000 within a
  reasonable time, and smaller size passes fewer evals (`risk-summary.md`: $600 and $400 were worse). It is an argument to
  expect to buy more than one eval per funded account (`monte-carlo-evals.md`: 1.9 evals per funded account).

## 7. Inside a 2-week eval (10 sessions)

Every 10-session stretch in the history was treated as the first two weeks of an eval.

| | 2026 (197 starts) | 2021-25 (1,063 starts) | All 5 years (1,269) |
|---|---:|---:|---:|
| Trades in the 2 weeks (median; 1 in 10 fewer / more than) | 4 (3 / 6) | 6 (4 / 9) | 6 (3 / 8) |
| 4+ trades in a row without a winner | 27% | 58% | 53% |
| ... what a coin with the same win rate would give | 30% | 55% | 54% |
| 6+ in a row without a winner | 4% | 23% | 20% |
| ... coin flip | 0% | 24% | 23% |
| 4+ real losses (-0.5R or worse) in a row | 9% | 13% | 13% |
| 6+ real losses in a row | 0% | 1% | 1% |
| 4 or more losing trades in total (not in a row) | 37% | 80% | 73% |
| Eval down $1,000 or more at some point in the 2 weeks | 1% | 12% | 10% |
| Eval down $2,000 or more (failed) | 0% | 1.1% | 0.9% |
| Net after 2 weeks: bad (1 in 10) / typical / good (1 in 10) | -$486 / +$108 / +$3,781 | -$748 / -$134 / +$1,257 | -$709 / -$95 / +$1,644 |

- **A 4-loss streak inside the first two weeks is the normal case in 2021-25** (58%), and about 1 in 4 starts in 2026. A
  6-loss streak happens in about 1 eval in 4 (2021-25) and 1 in 25 (2026). Counting only real -1R losses (not the scratches),
  4 in a row is 9-13% and 6 in a row about 1%.
- The observed odds match the coin-flip odds. A streak in the first two weeks tells you nothing about the strategy's
  health; the cold-streak filter already reads the last 15 signals.
- **Failing inside 2 weeks is rare (about 1%)** because the wide-stop scaling keeps most losses at $100-400. Being $1,000 down
  at some point happens in 1 start in 8 in 2021-25.

## 8. What to expect: a typical, bad and good month

Months with at least 10 sessions. "Bad" is the month that 1 in 10 is worse than, "good" the month that 1 in 10 is better than.

| | 2026 (10 months) | 2021-25 (50 months) | All 5 years (60 months) |
|---|---:|---:|---:|
| Bad month (1 in 10 worse) | -$440 | -$1,340 | -$1,119 |
| 1 in 4 worse than | -$271 | -$772 | -$692 |
| Typical month (median) | +$1,162 | -$204 | -$184 |
| 1 in 4 better than | +$4,187 | +$590 | +$1,133 |
| Good month (1 in 10 better) | +$5,207 | +$2,770 | +$3,509 |
| Average month | +$2,049 | +$328 | +$614 |
| Months that end positive | 50% | 38% | 40% |
| Months losing $1,000 or more | 10% | 16% | 15% |
| Months making $2,000 or more | 50% | 18% | 23% |
| Trades in a month (median; 1 in 10 fewer / more) | 8.5 (7 / 12) | 14 (10 / 17) | 14 (7 / 17) |
| Winners in a month (median; 1 in 10 fewer / more) | 2.5 (0 / 5) | 3 (1 / 4) | 3 (0 / 5) |
| Longest run of losing months | 4 | 6 | 6 |
| Best / worst month | Sep 2026 +$7,294 / May 2026 -$1,096 | Apr 2024 +$7,015 / Nov 2024 -$2,570 | same |

By week: the median week is -$20 in 2026 and -$72 in 2021-25; 1 week in 10 loses $461 / $537 or more; 1 in 10 makes $2,129 /
$710 or more; only about a third of weeks end positive (36% / 34%). A month with zero winners happens about 1 month in 10.

Said plainly: **over 5 years the bot lost a little in 6 months out of 10 and made the year in the other 4.** Six losing
months in a row happened (2022). 2026 was twice as good as the 5-year average in every line of this table; plan with the
5-year column.

## 9. The rule tested: sit out, or half size, the trade right after a max-size loss

Post-hoc on the same trades, exact. "Previous trade" is the last signal that had finished before the entry (the live shadow
record), so a skipped signal does not count as a loss. "Full-size stop-out" is a -1R stop at the full engine size, with no
cold-streak or late-entry cut. All rules sit on top of the live sizing.

| run | rule | status | 2026 net / PF / max DD | 2026 evals 2w pass/fail, 1m pass/fail | 2021-25 net / PF / max DD | 2021-25 evals 2w, 1m | trades changed 2026 / 2021-25 |
|---|---|---|---:|---:|---:|---:|---:|
| baseline | live strategy | | +$20,487 / 3.94 / -$2,249 | 20.4/0.0, 34.0/0.0 | +$16,379 / 1.27 / -$9,265 | 4.1/1.9, 8.8/5.2 | |
| seq_after_fullstop_skip | sit out after a full-size stop-out | rejected | +$20,513 / 4.50 / -$1,643, **1.92/wk** | 20.9/0.0, 35.9/0.0 | **+$14,286** / 1.28 / -$11,316, 2.78/wk | 4.1/0.3, 9.6/2.7 | 10 / 82 |
| seq_after_fullstop_half | half size after a full-size stop-out | rejected | +$20,264 / 4.13 / -$1,912 | 19.4/0.0, 34.5/0.0 | +$15,432 / 1.27 / -$9,179 | 4.1/0.8, 9.0/3.5 | 7 / 57 |
| seq_after_stop_half | half size after any stop-out | rejected | **+$16,336** / 3.52 / -$1,912 | 13.6/0.0, 23.3/0.0 | +$16,155 / 1.30 / -$8,843 | 4.1/0.6, 8.8/3.3 | 11 / 98 |
| seq_after_loss_half | half size after any loss | rejected | +$9,453 / 2.70 / -$1,518 | 4.9/0.0, 15.0/0.0 | +$10,161 / 1.24 / -$6,480 | 2.7/0.0, 5.5/0.4 | 37 / 258 |
| seq_after_loss_150 | 1.5x after any loss (the opposite) | rejected | +$29,059 / 4.53 / -$3,101 | 23.3/0.0, 38.3/0.0 | +$21,762 / 1.29 / **-$11,466** | 6.2/**5.6**, 11.3/**16.5** | 37 / 255 |
| seq_after_big500_skip | sit out after a $500+ loss | info | +$20,490 / 3.94 / -$2,246 | 20.4/0.0, 34.0/0.0 | +$16,990 / 1.30 / -$9,488 | 4.1/0.3, 8.9/2.4 | 1 / 22 |
| seq_after_big500_half | half size after a $500+ loss | info | +$20,489 / 3.94 / -$2,247 | 20.4/0.0, 34.0/0.0 | +$16,729 / 1.28 / -$9,249 | 4.1/0.8, 8.9/3.6 | 1 / 20 |
| seq_after_big300_half | half size after a $300+ loss | rejected | +$20,674 / 4.05 / -$2,110 | 20.4/0.0, 34.0/0.0 | +$17,718 / 1.31 / -$9,052 | 4.1/0.6, 8.9/2.4 | 4 / 40 |

- **Sitting out after a full-size stop-out** costs $2,093 in 2021-25 and drops 2026 to 1.92 setups a week (under the owner's
  2). **Half size after it** loses in both periods. The trade after a max-size loss is a normal-to-good trade; cutting it only
  cuts winners.
- **Half size after any stop-out** throws away $4,151 in 2026: several of the year's big winners came right after a stop-out.
- **1.5x after a loss** makes more money in both periods, but it is simply more size: it raises the $ at risk by 25%, and a
  flat 1.25x on every trade gets most of the same money (2026 +$24,282, 2021-25 +$18,350). The price is the one the owner
  rejected in `risk-summary.md`: 2021-25 1-month eval fails 16.5% instead of 5.2%, 2-week fails 5.6% instead of 1.9%, max
  drawdown -$11.5k. There is no sequence effect to exploit in either direction.
- **The $-threshold versions are not evidence.** Half size after a $300+ loss looks better in both periods (+$187 / +$1,339)
  and a random halving of the same 44 trades beats it only 1 time in 100, but the neighbouring thresholds give it away:

| previous trade lost | cases 2026 / 2021-25 | next trade avg R 2026 / 2021-25 | half size vs live: 2026 | 2021-25 | sit out vs live: 2026 | 2021-25 |
|---|---:|---:|---:|---:|---:|---:|
| $150+ | 17 / 108 | +0.66 / +0.16 | -$3,453 | +$1,269 | -$5,601 | -$185 |
| $200+ | 12 / 84 | +0.35 / +0.11 | -$421 | -$297 | -$318 | +$1,042 |
| $250+ | 9 / 68 | -0.10 / +0.24 | +$187 | **-$668** | +$538 | **-$1,655** |
| $300+ | 8 / 55 | -0.10 / +0.17 | +$187 | +$1,339 | +$526 | +$1,226 |
| $350+ | 7 / 48 | +0.03 / +0.18 | +$187 | +$770 | +$418 | +$1,678 |
| $400+ | 3 / 39 | -0.03 / +0.33 | +$10 | **-$1,461** | +$19 | **-$2,694** |
| $500+ | 1 / 26 | -0.01 / +0.26 | +$2 | +$350 | +$3 | +$611 |
| $600+ | 0 / 14 | - / -0.23 | $0 | +$1,169 | $0 | +$2,245 |

  The sign flips from one threshold to the next ($250 and $400 lose money in 2021-25, $300 and $350 make it), the 2026 side
  rests on 1-9 trades, and in every row the trade after the big loss averaged a positive R in 2021-25. That is the signature
  of a lucky threshold, not of an effect. **Verdict: rejected. Trade the setup after a loss exactly like any other.** The
  earlier runs `risk_streak3_half` and `risk_streak5_half` (half size after 3 or 5 losers in a row) were rejected for the same
  reason.

## 10. Honest caveats

- **2026 is 89 trades and 10 months.** Its streak, drawdown and month tables describe one good year; one cold stretch (Apr-Aug)
  is in them. Plan with the 5-year column and treat 2026 as the good case.
- **The $-loss rules have 1-17 cases in 2026.** Nothing with so few cases can be adopted or rejected on 2026 alone; they were
  judged on the threshold sweep and 2021-25.
- **Streak counts depend on the definition.** "No winner" runs count -$2 breakeven exits as losses, which is how a losing run
  feels but overstates it; "real losses" (-0.5R or worse) understate it. Both are given.
- **Drawdowns use the intraday low of each day** (the way MFFU checks the trailing limit); the dashboard's -$9,265 / -$2,249
  are at the close. Dips under $300 are ignored in the counts.
- **Kelly assumes the future looks like the past and a fixed bankroll.** The MFFU allowance trails upward, so the $2,000
  bankroll is a simplification; it is the right order of magnitude, not a precise number. Kelly is not a sizing
  recommendation here.
- **The dependence test cannot see effects smaller than about 0.1R.** With 679 trades and a standard deviation of 1.3R, a real
  after-loss effect of a few hundredths of an R would be invisible. It would also be too small to matter for sizing.
- Nothing here uses information that was not known at the time: a rule sees only the setup and trades that had already
  finished.

## How it was done

The baseline run's 768 trades and 1,278 daily rows (`research/runs/baseline.json`) were taken as they are. Streak lengths,
conditional averages, drawdown episodes, monthly and weekly sums, rolling 10-session windows and the growth-optimal multiplier
were computed directly on them; the shuffle and permutation tests reorder the same trades 3,000 times; the noise check
re-sizes 44 random trades 400 times with the run library's exact sizing. The rules were applied with `runlib.size` on the
cached exact live-loop replay and scored with `runlib.score`, the same way as every other run in the Lab. No engine replay was
needed. All numbers on this page are also in `research/lab/expectations.json` for the dashboard. Reproduce with
`python tools/research_seq.py all` (tables) or `python tools/research_seq.py sweep` (the threshold sweep and noise check).
