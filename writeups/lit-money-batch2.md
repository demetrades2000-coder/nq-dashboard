## In one minute (owner summary)

- **Seven ideas tested to make LIT pay more.** Same 120 trades of 2026, live eval sizing, $1.90 a micro, true 1m fills.
  Picked on Jan-Jun (H1), checked on Jul-Oct (H2). To count, an idea must add money in **both** halves and not raise 2-week
  eval fails.
- **Ranked by $ a month added:**

  | Rank | Idea | $ a month added (H1 / H2) | Eval / account risk | Verdict |
  |---|---|---|---|---|
  | 1 | **Funded payouts: ask only once $1,500+ is above the buffer** | **+$29 / +$32 per funded account** | accounts lost in 6 mo 1.0 → 0.8% / 1.5 → 1.4% | **adopt-candidate** (your habit, no code) |
  | 2 | NQ minis instead of 10 micros | +$36 / +$12 (exact commission saved) | no change (one eval fails a session earlier: noise) | real but tiny; later |
  | 3 | 15m setups only in eval sessions 1-10, half size | +$101 / +$45 | 2-week fails 9.2 → 7.6 / 2.9 → 1.4 | rejected: rests on 4 + 1 trades |
  | - | Second scale-in add | H1 up, **H2 −$4,800/mo** vs one add | - | rejected |
  | - | Funded compounding | −$5 to +$17 (noise) | same | rejected |
  | - | Profit lock (at +X R, stop to +Y R) | H1 −$600 to −$4,100 a month | - | rejected |
  | - | London vs New York size tilt | sign flips between halves | - | rejected |

- **The one to use: payouts.** On the funded Builder 50K, don't ask for a payout the moment $500 is available. Wait until the
  balance is at least **$53,600** ($50,000 + $2,100 buffer + $1,500), then ask for up to $2,000.
  - 6 months, per funded account: **$4,788 paid instead of $4,613 (H1), $4,622 instead of $4,433 (H2)**.
  - Accounts lost: 0.8% instead of 1.0% (H1), 1.4% instead of 1.5% (H2). About $1,750 stays on the account vs $1,650.
  - The cost: the first payout comes ~9 sessions later (session 36 instead of 27).
  - Why it works: MFFU allows 5 sim payouts. Small payouts use up those 5 slots and reset the room to the floor more often.
  - Never take only the $500 minimum each time: that pays $1,316 instead of $4,613 in 6 months.
- **Minis: correct, but small for now.** 1 NQ mini costs about $4.68 round turn at MFFU; 10 micros cost $19.00. The same
  exposure, $14.32 cheaper. But under the two-week sizing the median trade is 5 micros (H1) / 3 (H2). Only 15 trades in 2026
  reach 10 micros, so it saves about **$260 in the year**. It matters once size grows (funded with more room, or scale-in adds:
  40 micros = $57 saved a trade). It needs the bot to send an NQ order next to the MNQ one. Not worth that work yet.
- **Bonus finding (good news for scale-in):** the earlier scale-in study counted every add's worst point as if price went back to
  the entry. But the stop had already moved up, so price could not get there with the add still open. With the true worst
  point, the scale-in candidate's Jan-Jun 2-week fails are **7.6%, below live (9.2%)**, not 10.1% as reported. Its money is
  unchanged in H2 (+$26.0k). H1 shows +$45.5k instead of +$49.2k, because fewer evals fail and the restart sizes differ.
- **Nothing in `live_model.json` or the engine changed.**

## How it was measured

- **Trades:** the 120 live LIT trades of 2026 (`engine/lit.py` on `live_model.json` "lit"), via `tools/lit_big_ideas.py` /
  `tools/lit_adv_manage.py`. `python -X utf8 tools/lit_money2.py check`:
  - the new 1m path simulator with everything off == live: 119/119 1m trades;
  - with one add == `lit_big_ideas.padd`: 119/119;
  - the scorer with its hooks off gives exactly the live numbers (H1 +$36,723 / H2 +$9,674, 2-week 52.9/9.2 and 50.7/2.9).
- **Fills:** true 1m bars. In a bar the stop is checked before the target. Stop / breakeven / lock exits fill 1 tick worse.
  Adds fill at the next 1m open + 1 tick. Every decision is made on a closed bar and acts from the next one.
- **Sizing:** live `lit_sizing` via `engine/sizing.lit_qty`: two_week ("one winner passes", 60% room, $1,000 soft daily,
  40 micros) for 10 sessions, then safe_eval, no reset. Adds use `engine/sizing.scale_in_qty`.
- **Eval scores:** fresh MFFU Builder 50K evals started on every session of the half (2-week = 10 sessions, 1 month = 20), plus
  a 2,000-path Monte Carlo (MC). Money ($, $/month, PF, DD) is on the back-to-back eval path: a new eval only after a pass or a
  fail.
- **Funded (ideas 4, 5):** `tools/lit_funded.py`'s MFFU Builder 50K funded model:
  - EOD trailing $2,000, locking at +$100; $1,000 soft daily loss;
  - payouts: $2,100 buffer, $500-$2,000 a request, best day ≤ 50% of the cycle, 2 traded days, 5 sim payouts, 80% split;
  - 1,000 Monte Carlo accounts of 126 sessions (6 months), the same paths for every config (paired comparison).
- **2021-25:** no 1m bars, so none of this is tested there (reference only, never a gate).

Columns below: H1 / H2. "2-wk" = pass / fail % within 10 sessions.

## 1. NQ minis instead of micros (commission)

- **MFFU commission (searched 2026-10-19; MFFU's own pages could not be opened from this machine, DNS blocked):**
  - MNQ $1.90 round turn: MFFU's help-center instrument list (search snippet). It matches what the repo already uses.
  - NQ about **$4.68** round turn: a review site's MFFU table. **Unconfirmed: check the MFFU help center "Futures Instrument
    List" or ask support.**
  - Sensitivity: Topstep's all-in rates are $4.36 / $1.42 (NQ / MNQ); 10Four lists $5.76 / $1.82.
- **Rule tested:** an order of q ≥ 10 micros goes out as floor(q/10) NQ minis + (q mod 10) MNQ. For example 17 micros = 1 NQ +
  7 MNQ.
  - Same exposure, same points, same stop and target.
  - **No granularity change**, because the remainder stays in micros. Only a minis-only rule would force 10-micro steps, and
    that was not tested: it would cut or double every size.
- **Ticks and slippage:** NQ and MNQ both tick 0.25 pt ($5.00 vs $0.50 a tick). One tick of slippage in points is the same $
  per unit of exposure. NQ's book is deeper, so slippage per point is no worse.
- **Contract limit:** the MFFU Builder 50K allows 4 minis or 40 micros (`lit-prop-firms.md`). 1 mini counts as 10 micros, the
  usual prop-firm rule (not confirmed for MFFU). The bot's cap of 40 micros = 4 minis is the same limit.

| Variant | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|
| Live, all MNQ ($1.90) | 3.66 / 2.13 | +36,723 / +9,674 | 6,025 / 2,605 | -3,612 / -2,493 | 52.9 / 9.2 | 50.7 / 2.9 | 50.5/7.0 ; 54.0/6.8 |
| Minis at ≥ 10 micros, NQ $4.68 | 3.66 / 2.14 | +36,459 / +9,717 | 5,982 / 2,616 | -3,612 / -2,493 | 52.9 / 10.1 | 50.7 / 2.9 | 50.5/6.5 ; 54.2/6.6 |
| Minis, NQ $4.36 | 3.66 / 2.14 | +36,464 / +9,718 | 5,982 / 2,616 | -3,612 / -2,493 | 52.9 / 10.1 | 50.7 / 2.9 | 50.5/6.5 ; 54.2/6.6 |
| Minis, NQ $5.76 | 3.69 / 2.14 | +36,921 / +9,714 | 6,057 / 2,615 | -3,612 / -2,493 | 52.9 / 10.1 | 50.7 / 2.9 | 50.5/6.6 ; 54.2/6.6 |
| Scale-in candidate, all MNQ | 3.81 / 3.27 | +49,205 / +26,015 | 8,073 / 7,004 | -3,861 / -2,612 | 53.8 / 10.1 | 52.2 / 2.9 | 50.8/10.7 ; 57.1/6.3 |
| Scale-in candidate, minis | 3.80 / 3.28 | +48,851 / +26,072 | 8,015 / 7,020 | -3,897 / -2,612 | 53.8 / 10.1 | 52.2 / 2.9 | 50.8/10.3 ; 57.3/6.2 |

- **The direct saving is exact:**
  - On the eval path, 13 of 80 (H1) and 2 of 40 (H2) trades are ≥ 10 micros. Median 5 / 3 micros, max 29 / 25.
  - Saved: **$215 (H1) / $43 (H2)**, i.e. ~$36 / $12 a month.
  - At the plain LIT size ($800 up to 20 pts): 16 / 3 trades, $344 / $57.
- **Why the eval-path net goes down in H1 (−$264):** path noise, not cost.
  - Lower commissions change a balance by a few dollars. The two-week sizing then rounds one trade to a different micro count.
  - The eval started on 2026-02-18 then fails one session earlier (session 10 instead of 11): the same failed eval, now on the
    other side of the 2-week line. That is the 9.2 → 10.1.
  - Later evals start at different points, and the money follows.
  - The Monte Carlo fails go down (7.0 → 6.5, 6.8 → 6.6).
- **Verdict: promising, low priority.** It is correct money, but $260 a year at today's sizes. It needs an NQ bracket next to the
  MNQ one in the NinjaTrader route. Worth doing once the size is usually ≥ 10 micros (funded with more room, or scale-in on).

## 2. A second scale-in add

- **Rule:** on top of the scale_in candidate (`lit-big-ideas.md`), a second add.
  1. Wait until the 1st add is +1 of its own risk, so the whole stop has moved to the 1st add's price.
  2. Then wait for a 1m pullback ≥ pb2 R, then a 1m CISD close back our way.
  3. Add f2 x the first entry's micros at the next 1m open.
  4. Same caps: the adds' open risk stays inside the first entry's $ risk, 60% of the room and the soft daily loss left;
     40 micros in all.
  5. Optionally, once the 2nd add is +1 of its own risk, the stop moves to the 2nd add's price.
- **Scoring fix:** `lit_big_ideas` measured an add's worst open point as if price could return to the entry, but the stop had
  already moved above it. With two adds and 30-40 micros, that overstated the worst point by thousands of $ and produced fake
  eval fails. The grid is shown both ways. The verdict uses **true lows**: the real worst price after each add, capped at the
  stop in force.

| Variant (true lows) | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|
| **1 add (scale_in candidate)** | 3.89 / 3.27 | +45,539 / +26,015 | 7,471 / 7,004 | -3,882 / -2,612 | 54.6 / 7.6 | 52.2 / 2.9 | 51.0/7.7 ; 57.1/6.3 |
| 2nd add pb2 0.25, f2 0.5 | 4.02 / 1.98 | +49,931 / +8,235 | 8,192 / 2,217 | -3,706 / -2,493 | 55.5 / 7.6 | 50.7 / 2.9 | 51.1/7.7 ; 57.2/6.2 |
| 2nd add pb2 0.25, f2 1.0 | 4.17 / 1.95 | +51,725 / +8,284 | 8,486 / 2,230 | -3,706 / -2,493 | 55.5 / 8.4 | 50.7 / 2.9 | 50.8/7.8 ; 57.9/6.2 |
| 2nd add pb2 0.1, f2 1.0 | 4.33 / 1.95 | +53,492 / +8,247 | 8,776 / 2,220 | -3,706 / -2,493 | 56.3 / 8.4 | 50.7 / 2.9 | 50.9/7.7 ; 57.9/6.2 |
| 2nd add pb2 0.4, f2 1.0 | 4.16 / 1.97 | +51,457 / +8,428 | 8,442 / 2,269 | -3,706 / -2,493 | 55.5 / 8.4 | 50.7 / 2.9 | 50.7/7.8 ; 58.1/6.2 |
| 2nd add pb2 0.25, f2 0.5, no 2nd stop move | 3.95 / 2.99 | +46,540 / +19,497 | 7,636 / 5,249 | -3,882 / -2,493 | 56.3 / 7.6 | 55.1 / 2.9 | 52.3/7.7 ; 57.5/6.3 |
| 2nd add pb2 0.25, f2 1.0, no 2nd stop move | 4.08 / 3.06 | +48,040 / +20,007 | 7,882 / 5,387 | -3,904 / -2,493 | 56.3 / 8.4 | 55.1 / 2.9 | 52.0/7.8 ; 57.7/6.5 |
| 2nd add pb2 0.25, f2 0.25, no 2nd stop move | 4.01 / 3.33 | +46,505 / +26,790 | 7,630 / 7,213 | -3,882 / -2,612 | 56.3 / 7.6 | 52.2 / 2.9 | 52.1/7.7 ; 57.1/6.4 |
| 2nd add f2 0.5, rat_k2 1.5 | 4.02 / 2.97 | +49,931 / +19,504 | 8,192 / 5,251 | -3,706 / -2,493 | 55.5 / 7.6 | 56.5 / 2.9 | 51.1/7.7 ; 58.4/6.2 |
| stress: 2nd add f2 0.5, adds 2 pts worse | 3.54 / 3.72 | +43,790 / +27,996 | 7,184 / 7,537 | -3,751 / -2,495 | 55.5 / 6.7 | 49.3 / 2.9 | 52.8/8.1 ; 52.5/6.3 |
| 2nd add pb2 0.25, f2 1.0 (conservative lows, as lit-big-ideas) | 2.70 / 0.65 | +34,597 / -5,466 | 5,676 / -1,472 | -3,861 / -8,827 | 26.9 / 35.3 | 7.2 / 29.0 | 25.4/30.1 ; 7.0/40.8 |

- **What happens:**
  - 21 of the 52 add trades get a 2nd add (H1 11, H2 10).
  - The 2nd add comes late, often 50-100 pts above the 1st, so its own stop (the 1st add's price) is 20-100 pts away.
  - In H2, 4 of its 10 trades come back. Each 2nd add then loses a full own-risk (Feb 18, Feb 20, Aug 26: −60 to −70 pts a
    micro).
  - With the 2nd stop move, two H2 targets (Jul 20, and May 26 in H1) become exits at the 2nd add's price.
- **H2 loses $6k-$18k in every version but one.** That one (f2 0.25, no 2nd stop move) gains +$966 / +$775: noise, and its
  neighbours lose.
- The H2 "2 pts worse" line gains only because worse fills skip some 2nd adds (the minimum-risk rule).
- **Verdict: rejected.** Keep one add.
- **Side finding:** with true lows, the one-add candidate's H1 2-week fails are 7.6% (live 9.2%). Its "+0.9 pt fails" caveat in
  `lit-big-ideas.md` was a scoring artifact. Run `lit_m2_scale_true_lows`.

## 3. 15m setups as an eval-only booster

- **Setups:** 15m LIT setups from `tools/lit_more.py` m15:
  - live filters with inducement 12 bars;
  - the best `lit-more-setups.md` neighbour: depth 0.4, displacement 0.7, inducement 12, stop up to 100.
- In 2026 that is only 16 / 24 setups, and 13 / 18 of them fall on days with a 5m trade.
- **Allowed only in eval sessions 1-10** (the two_week phase), at x1, x0.5 or x0.25 of the two_week size. Two day rules:
  - "first": 1 trade a day, the first fill wins;
  - "pertf": the 5m keeps its trade, the 15m may trade too.

| Variant | PF | Net $ | $/month | Max DD $ | 2-wk H1 | 2-wk H2 | MC 2-wk H1 ; H2 |
|---|---|---|---|---|---|---|---|
| Live (5m only) | 3.66 / 2.13 | +36,723 / +9,674 | 6,025 / 2,605 | -3,612 / -2,493 | 52.9 / 9.2 | 50.7 / 2.9 | 50.5/7.0 ; 54.0/6.8 |
| relaxed 15m, s1-10, first, x1 | 3.65 / 2.85 | +38,054 / +14,626 | 6,243 / 3,938 | -3,615 / -1,870 | 57.1 / 9.2 | 52.2 / **7.2** | 53.0/7.7 ; 54.6/6.2 |
| **relaxed 15m, s1-10, first, x0.5** | 3.65 / 2.26 | +37,340 / +9,839 | 6,126 / 2,649 | -3,615 / -3,091 | 52.9 / **7.6** | 52.2 / **1.4** | 50.7/5.4 ; 54.4/5.6 |
| relaxed 15m, s1-10, first, x0.25 | 3.68 / 2.90 | +37,332 / +15,208 | 6,125 / 4,094 | -3,615 / -2,493 | 52.9 / 6.7 | 52.2 / 2.9 | 50.6/5.3 ; 54.9/6.1 |
| live-filter 15m, s1-10, first, x0.5 | 3.61 / 2.26 | +36,749 / +9,839 | 6,029 / 2,649 | -3,612 / -3,091 | 52.9 / 7.6 | 52.2 / 1.4 | 50.3/5.3 ; 54.4/5.6 |
| live-filter 15m, s1-10, first, x0.25 | 3.64 / 2.89 | +36,741 / +15,190 | 6,028 / 4,090 | -3,612 / -2,493 | 52.9 / 6.7 | 52.2 / 2.9 | 50.5/5.3 ; 54.9/6.0 |
| relaxed 15m, s1-10, pertf, x1 | 3.68 / 2.85 | +38,562 / +14,626 | 6,327 / 3,938 | -3,484 / -1,870 | 57.1 / 7.6 | 50.7 / **11.6** | 53.2/8.6 ; 53.2/12.7 |
| relaxed 15m, always, first, x0.5 | 3.65 / 2.10 | +36,999 / +9,722 | 6,070 / 2,618 | -3,615 / -3,475 | 52.9 / 7.6 | 52.2 / 1.4 | 50.7/5.4 ; 54.4/5.6 |
| relaxed 15m, always, pertf, x1 | 3.08 / 2.01 | +31,954 / +9,833 | 5,243 / 2,647 | -3,600 / -2,042 | 57.1 / 7.6 | 50.7 / 11.6 | 53.2/8.6 ; 53.2/12.7 |

- **At half size it looks good on paper:** money up a little in both halves, 2-week fails down in both (9.2 → 7.6, 2.9 → 1.4),
  pass rates equal or +1.5.
- **But it rests on very few trades.** On the eval path the booster takes 4 trades in H1 (Jan 5 −$277, Jan 27 −$7, Feb 5 +$593,
  Feb 24 −$2) and 1 in H2 (Jul 1 +$1,072).
  - The Jan 5 15m trade fills first and blocks that day's 5m trade, which made +$2,060 at full size.
  - The fail drop comes from these same few days. The fresh-start evals reuse them.
- **The H2 money jumps around** (x0.5 +$165, x0.25 +$5,534). One extra small trade shifts the whole back-to-back path (3 → 5
  passes), not because the 15m trades earn it.
- At full size the 15m trades raise H2 fails (2.9 → 7.2, or 11.6 when both can trade), as `lit-more-setups.md` found.
- **Verdict: rejected (too thin to adopt).** At most a paper shadow: log the 15m setups during evals and look again with 2027
  data.

## 4. Funded compounding

- **Rule:** start from the live funded sizing (`lit_sizing.funded`: 40% of the room, max $800, best day $1,500). Let the $ max
  per trade step up as the room above the floor grows:
  - A: $1,000 at $3k room, $1,200 at $4k;
  - B: $1,000 / $1,500 / $2,000 at $3k / $4.5k / $6k;
  - B + a best-day cap of $2,000 / $3,000;
  - C: 40% of the room with no $ max;
  - C + a best-day cap of 50% of (room − $2,000).
- Each one is tested with today's payout policy and with payouts held so the buffer can build.

| Funded sizing \| payout policy | Lost 6 mo H1 / H2 | Paid 6 mo H1 / H2 | $/month H1 / H2 | First payout (session) | Max risk a trade |
|---|---|---|---|---|---|
| **Flat (live funded) \| as soon as eligible** | 1.0 / 1.5% | $4,613 / $4,433 | 769 / 739 | 27 / 26 | $342 / $412 |
| Comp A \| as soon as eligible | 1.0 / 1.5% | $4,581 / $4,534 | 764 / 756 | 27 / 26 | $484 / $412 |
| Comp B \| as soon as eligible | 1.0 / 1.5% | $4,586 / $4,478 | 764 / 746 | 27 / 26 | $678 / $602 |
| Comp C \| as soon as eligible | 1.0 / 1.7% | $4,596 / $4,408 | 766 / 735 | 27 / 26 | $678 / $722 |
| Comp B + bigger best-day cap \| as soon as eligible | 1.0 / 1.5% | $4,357 / $4,295 | 726 / 716 | 27 / 26 | $791 / $824 |
| Flat \| full $2,000 | 0.7 / 1.3% | $4,715 / $4,595 | 786 / 766 | 41 / 39 | $342 / $412 |
| Comp A \| full $2,000 | 0.9 / 1.5% | $4,670 / $4,686 | 778 / 781 | 41 / 39 | $484 / $412 |
| Comp B \| full $2,000 | 0.8 / 1.5% | $4,678 / $4,602 | 780 / 767 | 41 / 39 | $678 / $602 |
| Comp C \| full $2,000 | 0.7 / 1.6% | $4,707 / $4,560 | 784 / 760 | 41 / 38 | $678 / $722 |
| Comp B \| hold $2,000 extra | 0.7 / 1.3% | $3,732 / $3,721 | 622 / 620 | 46 / 42 | $678 / $602 |

- **No compounding rule beats flat sizing in both halves.** The differences are −$32 to +$101 in 6 months: noise. Max risk a
  trade goes up 40-140%.
- **Why it doesn't help:**
  - The $1,500 best-day cap already sets the size on most trades, because LIT's targets are far (MFFU's 50% consistency rule).
  - Every payout takes the room back to ~$2,000, so the room rarely reaches the steps.
  - Raising the best-day cap makes payouts less often eligible and pays less ($4,357).
- **Verdict: rejected.** Keep the live funded sizing.

## 5. Payout policy (MFFU Builder 50K funded)

| Policy (live funded sizing) | Lost 3 / 6 mo H1 | Lost 3 / 6 mo H2 | Paid 6 mo H1 / H2 | $/month H1 / H2 | First payout | Payouts in 6 mo | Left on account (80%) |
|---|---|---|---|---|---|---|---|
| As soon as eligible (≥ $500, take up to $2,000): today's model | -/1.0% | -/1.5% | $4,613 / $4,433 | 769 / 739 | 27 / 26 | 3.28 / 3.15 | $1,649 / $1,662 |
| Take only the $500 minimum each time | -/1.1% | -/1.2% | $1,316 / $1,279 | 219 / 213 | 27 / 26 | 3.29 / 3.20 | $3,628 / $3,629 |
| Wait for $1,000+ | -/1.0% | -/1.5% | $4,726 / $4,524 | 788 / 754 | 30 / 29 | 3.20 / 3.08 | $1,661 / $1,671 |
| **Wait for $1,500+** | -/**0.8%** | -/**1.4%** | **$4,788 / $4,622** | **798 / 770** | 36 / 34 | 3.06 / 2.96 | $1,766 / $1,749 |
| Wait for a full $2,000 | -/0.7% | -/1.3% | $4,715 / $4,595 | 786 / 766 | 41 / 39 | 2.95 / 2.87 | $1,963 / $1,933 |
| Hold $1,000 above the buffer | -/0.7% | -/1.2% | $4,144 / $4,057 | 691 / 676 | 36 / 34 | 3.07 / 3.00 | $2,296 / $2,271 |
| Hold $2,000 above the buffer | -/0.7% | -/1.2% | $3,735 / $3,707 | 622 / 618 | 46 / 42 | 2.80 / 2.77 | $2,924 / $2,886 |
| Hold $4,000 above the buffer | -/0.7% | -/1.2% | $2,948 / $2,888 | 491 / 481 | 63 / 60 | 2.27 / 2.23 | $4,061 / $4,158 |

(3-month figures are in `research/lit/money2_funded.json`.)

- **"Wait until $1,500+ is available, then take up to $2,000" is best in both halves:** +$175 / +$189 in 6 months
  (+$29 / +$32 a month) and fewer accounts lost (1.0 → 0.8%, 1.5 → 1.4%).
- **Its neighbours agree:** $1,000+ gives +$113 / +$91, a full $2,000 gives +$102 / +$162, and both also lose fewer accounts.
- **The cost:** the first payout comes ~9 sessions later. About $100 more stays on the account at the 6-month mark (not lost).
- **Holding a cushion above the buffer and never withdrawing it** costs money: −$470 to −$1,660. It makes the account a bit
  safer, but the account is already safe (1%).
- **The $500 minimum each time is the worst:** cycles are limited by the 2-traded-days and 50% best-day rules, so small
  requests waste them.
- **It is small.** About $30 a month per funded account, on paired Monte Carlo paths (the same 1,000 paths for every policy).
  Real history is one account per half, so it cannot confirm it.
- **Verdict: adopt-candidate.**
- **The switch:** none in code. Payouts are requested by the owner in the MFFU dashboard. The rule: request only when the
  balance is ≥ $53,600 (start + $2,100 buffer + $1,500), and ask for min(balance − $52,100, $2,000).
  - `tools/lit_money2.py` policy `("atl", 1500)` is the model.
  - If the funded mode is wired later (`lit-funded-sizing.md`), a payout-ready alert at that balance is the natural home for it.

## 6. Profit lock in steps (eval)

- **Not covered before.** `lit-adv-management.md` tested later / structural breakeven, partials and target choice, and
  `lit-1m-management.md` tested a structure trail. Neither tested "at +X R move the stop to +Y R" once.
- **Rule:** after breakeven at 1R, once the high reaches entry + X R, the stop moves to entry + Y R. That is one move or a few
  fixed steps, not a trail. Applied in all sessions, or only in the two_week phase.

| Lock | Net $ all sessions | Net $ two_week phase only | 2-wk all (H1 ; H2) | Trades changed / ΔR H1 ; H2 |
|---|---|---|---|---|
| Live (BE at 1R only) | +36,723 / +9,674 | - | 52.9/9.2 ; 50.7/2.9 | - |
| 2R → 0.5R | +32,207 / +7,870 | +32,053 / +7,025 | 52.9/6.7 ; 49.3/2.9 | 13 / +4.5 ; −1.4 |
| 2R → 1R | +15,231 / +9,678 | +27,232 / +12,646 | 40.3/7.6 ; 40.6/2.9 | 19 / −15.6 ; −5.2 |
| 3R → 1R | +28,824 / +10,916 | +28,444 / +9,674 | 52.1/6.7 ; 50.7/2.9 | 7 / −1.5 ; +2.0 |
| 3R → 2R | +28,355 / +7,314 | +29,153 / +7,381 | 51.3/6.7 ; 46.4/2.9 | 13 / −5.0 ; −3.0 |
| 4R → 2R | +33,099 / +10,092 | +33,099 / +9,674 | 51.3/6.7 ; 52.2/2.9 | 4 / −4.9 ; +2.0 |
| 5R → 3R | +25,081 / +9,674 | +25,081 / +9,674 | 52.1/9.2 ; 50.7/2.9 | 2 / −8.1 ; 0 |
| 6R → 4R | +32,336 / +9,674 | +35,482 / +9,674 | 39.5/9.2 ; 50.7/2.9 | 2 / −6.5 ; 0 |
| 3R → 1R, 5R → 3R | +24,857 / +10,916 | +22,493 / +9,674 | 51.3/6.7 ; 50.7/2.9 | 9 / −9.6 ; +2.0 |
| 4R → 2R, 6R → 4R | +28,713 / +10,092 | +31,858 / +9,674 | 37.8/6.7 ; 52.2/2.9 | 6 / −11.4 ; +2.0 |
| 2R → 1R, 4R → 3R, 6R → 5R | +11,861 / +6,699 | +19,111 / +12,646 | 31.9/7.6 ; 39.1/2.9 | 25 / −24.0 ; −5.7 |

- **Every lock loses H1 money.** The −$3.6k to −$24.9k comes mostly from the few big winners (Jan, Mar, May) that dip after
  +3-6R before reaching the VIX target.
  - Under two_week sizing "one winner passes", so a lock that clips the winner also loses 2-week passes: 6R → 4R takes H1 from
    52.9% to 39.5%.
- Some locks gain a little in H2 (3R → 1R: +$1.2k; 4R → 2R: +$0.4k) and cut H1 2-week fails (9.2 → 6.7). But they fail the H1
  money test.
- **Verdict: rejected.**

## 7. Time-of-day size tilt (London vs New York)

- **Not covered before:** `lit-big-ideas.md` tilted by VIX / VXN / ATR only.
- **LIT's own trades by entry time:**

  | Half | London (02:00-08:00 ET) | New York (08:00-15:30 ET) |
  |---|---|---|
  | H1 | 63 trades, 19.0% win, +45.5R, **0.72R a trade** | 17 trades, 35.3% win, +17.9R, **1.05R a trade** |
  | H2 | 32 trades, 31.2% win, +25.7R, **0.80R a trade** | 8 trades, 50.0% win, +1.3R, **0.16R a trade** |

  New York was the better session per trade in H1 and the worse one in H2: the sign flips.
- **Tilts tested:** x0.5-1.5 on one session, or opposite tilts on both. Each in all sessions, or only in the safe_eval phase
  (after session 10, so the two-week "one winner passes" size is untouched).

| Tilt | Net $ | 2-wk H1 | 2-wk H2 |
|---|---|---|---|
| Live | +36,723 / +9,674 | 52.9 / 9.2 | 50.7 / 2.9 |
| NY x1.25, all | +38,065 / +9,644 | 54.6 / 9.2 | 50.7 / 2.9 |
| NY x1.5, all | +38,356 / +6,078 | 58.8 / 9.2 | 50.7 / 2.9 |
| NY x0.5, all | +33,817 / +12,175 | 51.3 / 7.6 | 52.2 / 2.9 |
| NY x0.75, all | +34,587 / +12,134 | 51.3 / 8.4 | 52.2 / 2.9 |
| London x0.75, all | +23,491 / +4,853 | 16.8 / 3.4 | 13.0 / 0.0 |
| London x1.25, all | +24,399 / +9,162 | 52.1 / 10.1 | 49.3 / 8.7 |
| **London x1.25 / NY x0.75, safe_eval only (best H1)** | +38,737 / +10,115 | 52.9 / 9.2 | 50.7 / 2.9 |
| London x1.25, safe_eval only (neighbour) | +34,347 / +9,728 | 52.9 / 9.2 | 50.7 / 2.9 |
| NY x0.75, safe_eval only (neighbour) | +36,179 / +10,061 | 52.9 / 9.2 | 50.7 / 2.9 |

- **No tilt holds.** The best H1 pick (+$2.0k / +$0.4k) has two neighbours that each lose H1 money, so the gain is an
  interaction of a few trades.
- New York up helps H1 and hurts H2; New York down does the opposite.
- **Any cut in London during the two-week phase breaks "one winner passes":** London x0.75 drops 2-week passes to 13-17%.
- **Verdict: rejected.** LIT needs NinjaTrader and the PC running from ~01:55 ET either way. 95 of 120 trades are London, at the
  same size as New York.

## What changes

- **Live:** nothing. No engine file, `live_model.json` or sizing changed.
- **Owner habit (adopt-candidate):** once funded on the Builder 50K, ask for a payout only when the balance is ≥ $53,600, and
  take up to $2,000.
- **Later, when sizes are bigger:** NQ minis for every full 10 micros. That needs an NQ bracket in `engine/ninjatrader.py`
  next to the MNQ remainder (not touched here). First confirm MFFU's NQ round turn and that 1 NQ = 10 MNQ toward the 4-mini
  limit.
- **Scale-in:** its H1 fail caveat was a scoring artifact. With true open lows it lowers H1 2-week fails (7.6% vs 9.2%).

## Files

- `tools/lit_money2.py`: `check` (simulator and scorer == live), `grid [1 2 3 6 7]`, `funded [save]`, `save`.
- `research/lit/money2.json`: the eval-side grids, with diagnostics in each group's `_info`.
- `research/lit/money2_funded.json`: the funded grids.
- Runs: `lit_m2_base`, `lit_m2_minis`, `lit_m2_scale_true_lows`, `lit_m2_add2`, `lit_m2_m15_eval_half`, `lit_m2_lock_3r1r`,
  `lit_m2_tod_l125_ny075`, `lit_m2_payout_1500`, `lit_m2_payout_min500`, `lit_m2_funded_compound_b`.

## Sources (commission search, 2026-10-19; pages not opened, DNS blocked)

- MFFU Futures Instrument List (help center, search snippet): <https://help.myfundedfutures.com/en/articles/9735811-futures-instrument-list>
- MFFU review with a $4.68 mini / $1.90 micro table: <https://www.bestpropfirms.com/reviews/myfundedfutures/>
- Topstep all-in fees: <https://help.topstep.com/en/articles/8284213-what-are-the-commissions-and-fees-in-the-trading-combine-and-express-funded-account>
- 10Four commissions: <https://intercom.help/10four/en/articles/15916843-commissions>
- Tradovate pricing: <https://www.tradovate.com/pricing/>
