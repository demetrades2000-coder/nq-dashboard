## In one minute

- **Question (owner, 2026-10-22):** how do LIT and the second strategies make the most money and pass evals within 2 weeks -
  together on one eval, or on separate accounts, and at what size?
- **Check first:** this tool's executor gives exactly LIT's stored eval path (run `lit_adopt_t15_be_off_eval`): 2-week
  pass/fail **57.1 / 5.9** (H1) and **52.2 / 0.0** (H2), eval-path $ +$34,234 / +$9,059. The LIT Asia-slot run also matches
  its own stored numbers (56.3 / 6.7, 59.4 / 2.9).
- **375 combinations tested:** 310 on LIT's eval (every subset of EMA / MACD / S/R / Asia x 11 sizes x 2 rules for who gets
  the position), 65 on separate accounts.
- **Answer 1 - do not add second strategies to the LIT eval.** The H1 winner (LIT + MACD at LIT's size: 2-week 81.5 / 3.4)
  drops to 46.4 / 0.0 in H2, below LIT alone. None of the 20 best H1 picks beats LIT in H2. The second strategies take the
  one position LIT needs in London (12-15 LIT trades lost per half).
- **Answer 2 - use two accounts.** Account A: LIT alone, as today. Account B: a second Builder 50K ($91.80) that trades EMA +
  MACD + S/R together, sized like LIT ("one winner passes"), never opposite to LIT's open trade.
  - Account B: 2-week pass/fail **72.3 / 4.2** (H1, pick) and **53.6 / 0.0** (H2, check); 1 month 83.5 / 9.2 and 55.9 / 8.5;
    median 5 sessions to pass.
  - Both accounts on the eval paths: H1 **+$76,254** (vs LIT alone +$34,234), H2 **+$16,701** (vs +$9,059).
  - Funded (same strategies at $300 risk, 60% room cap): about **$3,760 to you per funded account in 3 months** from the
    2026 H1 starts, none lost.
- **The honest catch:** this works in 2026. In 2025 and 2021-24 account B fails 15-18% of evals within 2 weeks (LIT alone
  1-7%) and only 31-37% of its evals ever pass; over 5 years it makes about **+$360 per eval bought**.
- **Next:** paper-trade account B in the cloud next to LIT. Before buying it, ask MFFU support if you may hold two funded
  Builder 50Ks at once (`mffu_rules.json` says one sim-funded Builder per person).

## What was tested

**Inputs** (nothing was tuned again here):

- **LIT:** the live LIT (t_check + BE + costs on), run `lit_live`; 2026 on 1m bars, 2021-25 on 5m bars only (weaker).
- **Asia slot:** the 18:00-02:00 trades of run `lit_more_ent_asia_slot_rr3` (sized as LIT).
- **EMA** (`ema_best.json`), **MACD sweep** (`md_best.json`), **S/R NY reclaim** (`sr_best.json`): every trade from 2021-11
  to 2026-10.

**One eval with LIT (LIT first):**

- one position at a time; max 2 trades a day, and one slot is always kept for LIT's day trade;
- the $1,000 soft daily loss counts every trade of the day;
- LIT and Asia always use the live two-week sizing;
- two rules for a clash: **skip** (LIT's signal is lost while a second trade is open) or **pre** (LIT closes the second trade
  at that minute and takes its entry).

**Sizes for the second strategies (11):**

- $300 or $500 risk;
- each with or without the 60% room cap (min 1 micro) and the shared daily-loss cap;
- 0.25 / 0.5 / 1.0 of LIT's own two-week "need" micros.

**Separate accounts:**

- each second strategy alone, EMA + S/R, and EMA + MACD + S/R on their own Builder 50K, with 6 sizes each;
- each one with and without a **no-hedge guard**. MFFU bans long and short at the same time, also across your own accounts.
  In 2026, 14 EMA trades overlap an opposite LIT trade, so the guard is needed. It skips or closes the second trade.

**Scoring:**

- a fresh eval starts on every session and runs 20 sessions;
- 2-week and 1-month pass/fail %;
- median sessions to pass;
- eval-path $ (back-to-back evals, no reset);
- eventual pass within 60 sessions;
- the MFFU sim-funded account for 3 and 6 months (EOD trailing $2,000 locked at +$100, buffer $2,100, payouts $500-$2,000
  at 80%, 50% consistency, 5 payouts).

Pick on 2026 H1 (Jan-Jun), check on H2 (Jul-Oct 16), with 2025 and 2021-24 as reference.

## The top 3 setups

| Setup | H1 2-wk pass/fail | H1 1-mo | H1 net / DD | H2 2-wk | H2 1-mo | H2 net / DD | med | 2025 2-wk | 2021-24 2-wk |
|---|---|---|---|---|---|---|---|---|---|
| LIT alone (today) | 57.1 / 5.9 | 74.3 / 11.9 | +$34,234 / -$3,314 | 52.2 / 0.0 | 50.8 / 0.0 | +$9,059 / -$3,073 | 5 / 4 | 14.1 / 1.2 | 14.7 / 6.8 |
| **1. Two accounts: B = EMA+MACD+S/R, need size, no-hedge** | **72.3 / 4.2** | 83.5 / 9.2 | +$42,020 / -$1,933 | **53.6 / 0.0** | 55.9 / 8.5 | +$7,642 / -$3,804 | 5 / 5 | 29.7 / 14.9 | 25.3 / 17.6 |
| (A + B together, $) | | | **+$76,254** / -$2,748 | | | **+$16,701** / -$3,302 | | | |
| 2. One eval: LIT + EMA + Asia, EMA at need size | 61.3 / 2.5 | 67.0 / 11.0 | +$42,250 / -$2,033 | 66.7 / 0.0 | 74.6 / 0.0 | +$13,375 / -$1,919 | 4 / 4 | 22.1 / 24.1 | 22.9 / 23.7 |
| 3. One eval: LIT + MACD at need size (H1 pick) | 81.5 / 3.4 | 89.0 / 3.7 | +$43,874 / -$1,952 | 46.4 / 0.0 | 50.8 / 6.8 | +$8,539 / -$1,913 | 4 / 4 | 24.5 / 6.0 | 22.9 / 19.8 |

Net = $ on the back-to-back eval path (paper $; the real money comes from funded payouts). med = median sessions to pass
(H1 / H2).

Trades a week:

| Setup | H1 | H2 |
|---|---|---|
| LIT alone | 3.1 | 2.6 |
| Account B | 4.1 | 3.1 |
| Setup 2 | 5.5 | 4.6 |
| Setup 3 | 3.8 | 3.3 |

**1. Two accounts (recommended):**

- **Account A** is LIT alone, unchanged, so it keeps its odds.
- **Account B** trades EMA + MACD + S/R together, at most 2 trades a day.
  - Size: LIT's two-week rule (micros so the target covers what is left to +$3,000), capped at 60% of the room and the
    $1,000 soft daily loss.
  - It never holds a trade opposite to LIT's open trade.
- In H1, B's money came from EMA +$19.0k, MACD +$13.0k and S/R +$10.0k. In H2: EMA +$6.6k, MACD +$0.1k, S/R +$0.9k.
- **Funded view** (B on its funded account at $300 risk, 60% room cap):
  - 2026 H1 starts: $3,762 to you in 3 months and $7,349 in 6 months, 0% of accounts lost;
  - $ per eval bought = pass in 60 sessions (91%) x funded $ - $91.80 = **+$3,347** (3 months);
  - over 5 years: +$361 per eval (6 months), 77% of funded accounts lost within 6 months.
- **Gentler B:** $300 risk + room cap, run `mix_acct2_ema_md_sr_300safe`.
  - It never fails within 2 weeks or 1 month in 2026.
  - It is slow: 2-week passes only 32.8% (H1) and 8.7% (H2), median 12 sessions. That breaks the 2-week goal.

**2. LIT + EMA + Asia on one eval:**

- This is the only family that beats LIT in both halves on every gate (6 of its 22 sizes, plus LIT + Asia alone).
- Not recommended:
  - it needs the Asia slot, which the PC route blocks before midnight and which `lit-more-entries.md` rejected (2021-25
    -$15.5k);
  - 15 LIT trades are lost in H1;
  - in 2025 it fails 24.1% of evals within 2 weeks (LIT 1.2%).

**3. LIT + MACD on one eval:**

- The best H1 setup by far, with 2-week pass 81.5%.
- Rejected by the H2 check: 46.4%, below LIT alone, and less money. Its H1 gain is MACD's strong first half.

## Separate accounts, one by one

All rows have the no-hedge guard. Ev $ = $ per eval bought = pass in 60 sessions x funded $ (3 months, 2026 H1 starts) - $91.80.

| Account B trades | Size | H1 2-wk | H2 2-wk | 2025 2-wk | 2021-24 2-wk | funded 3 mo (H1 starts) | ev $ per eval (H1) | 5-yr ev $ (6 mo) |
|---|---|---|---|---|---|---|---|---|
| EMA | need | 42.9 / 0.0 | 40.6 / 0.0 | 24.9 / 0.0 | 22.2 / 0.6 | $1,495 | +$947 | +$87 |
| EMA | $500 + cap | 37.8 / 0.0 | 24.6 / 0.0 | 18.5 / 0.0 | 14.2 / 0.1 | $1,738 | +$1,293 | +$43 |
| MACD | need | 41.2 / 0.0 | 14.5 / 0.0 | 21.3 / 0.0 | 17.6 / 0.1 | $882 | +$556 | +$234 |
| S/R | need | 40.3 / 0.0 | 24.6 / 0.0 | 11.6 / 0.0 | 12.2 / 1.2 | $509 | +$194 | +$16 |
| EMA + S/R | need | 64.7 / 1.7 | 43.5 / 0.0 | 22.9 / 10.8 | 24.2 / 8.9 | $2,396 | +$2,079 | +$238 |
| **EMA + MACD + S/R** | **need** | **72.3 / 4.2** | **53.6 / 0.0** | 29.7 / 14.9 | 25.3 / 17.6 | **$3,762** | **+$3,347** | +$361 |
| EMA + MACD + S/R | $300 + cap | 32.8 / 0.0 | 8.7 / 0.0 | 9.2 / 0.0 | 9.6 / 2.9 | $3,762 | +$3,670 | +$410 |
| LIT alone (reference) | two_week | 57.1 / 5.9 | 52.2 / 0.0 | 14.1 / 1.2 | 14.7 / 6.8 | $1,206 | +$785 | +$132 |

- **One second strategy alone** passes too slowly for the 2-week goal: each one trades about 1-2 times a week. Together they
  trade about 4 times a week.
- **The no-hedge guard** costs a little: EMA + MACD + S/R at need size goes from 73.1 / 4.2 to 72.3 / 4.2 in H1, with H2
  unchanged.
- **H2 funded $** comes from only 16 starts (early July), so it is not quoted.

## Other findings

- **Pick vs check:**
  - 25 of 310 one-eval combinations beat LIT alone in H2, and none of the 20 best H1 picks does: on LIT's eval, H1 does not
    predict H2.
  - 7 of 310 beat LIT in both halves on every gate: LIT + Asia, and 6 sizes of LIT + EMA + Asia.
- **Who gets the position:**
  - "Skip" loses 11-15 LIT trades per half (EMA and MACD trade London hours, like LIT).
  - "Pre" (LIT closes the second trade) keeps every LIT trade, but often adds H1 fails. EMA at $500 goes from 14.3% to
    19.3% 2-week fails, because the cut trades are often the ones about to win.
- **Sizes:**
  - The 60% room cap is what keeps the fails down: $500 without it gives 14% 2-week fails on LIT + EMA in H1.
  - The shared daily-loss cap changes almost nothing (LIT's own sizing already caps the day).
  - Need-share 0.25 / 0.5 slows passes without cutting fails much.
- **Reference years:** LIT there is the weaker 5m version (2021-24 eval path -$17.8k). Almost every combination adds fails in
  2025 and 2021-24. The second strategies' extra trades add risk faster than edge outside 2026.

## Recommendation (plain)

1. **Keep LIT alone on its Builder 50K eval.** Add nothing to it; it keeps 57 / 52% 2-week passes.
2. **Paper-trade "account B" in the cloud:** EMA + MACD + S/R together, LIT's two-week size, never opposite to LIT. In 2026 it
   passes 72% (H1) and 54% (H2) of evals within 2 weeks and adds about +$42k / +$8k on the eval path.
3. **Buy the second Builder 50K ($91.80) only after** 2-4 weeks of paper that look like the backtest, and after MFFU support
   confirms two funded Builder 50Ks are allowed. If they are not, account B should go to another firm.

Its 2021-25 record is weak, about +$360 per eval over 5 years, so treat it as a 2026 bet with small stakes.

## Files

- Code: `tools/second_mix.py`.
  - `units` builds the trade units;
  - `check` reproduces the LIT eval path;
  - `grid` runs the one-eval combinations;
  - `separate` runs the account-B and funded view;
  - `save` stores the runs.
- Numbers: `research/second/mix.json` (`grid`, `separate`, `picks`, `two_accounts`).
- Runs `mix_*`: each stores the back-to-back eval path trades of 2021-24, 2025, H1 and H2. The library's own eval columns
  re-score that path and are not the odds above; the verdicts carry the real odds.
- Limits:
  - second-strategy worst open points come from 5m bars (1m in 2026);
  - a LIT signal is assumed to be taken on account A when the no-hedge guard is checked;
  - funded sizing uses $300 + 60% room cap for every second strategy, and LIT's safe_eval sizing for LIT.
