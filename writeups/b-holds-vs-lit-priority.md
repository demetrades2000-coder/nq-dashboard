## In one minute

- **The question:** ATLAS (account B, Builder 25K) is in a trade. LIT (Zlarior, Builder 50K) signals the other way. MFFU
  bans long and short at the same time, so one of them has to give way.
  - **LIT priority (live today):** ATLAS is closed at market, then LIT takes its trade.
  - **B-holds (the owner's idea):** LIT's trade is skipped. ATLAS runs to its own stop or target. LIT trades in the same
    direction are not affected.
- **Money, both accounts together** (LIT at its own size, ATLAS on its 25K eval path, $1.90 a micro):
  - 2026: **+$52,337 now vs +$53,558 with B-holds (+$1,221, about +$125 a month)**. That is +$1,031 in H1 and +$190 in H2.
  - 2021-25: **-$3,160 now vs -$4,983 with B-holds (-$1,823)**.
- **Eval speed:** LIT's 50K odds do not change in 2026. ATLAS's 25K 2-week pass drops from **65.5% to 60.5%** in 2026 H1
  (the half we pick on), and more ATLAS evals get stuck (0.8% to 3.4%). H2 is the same with both rules.
- **Verdict: don't adopt.** B-holds wins in 2026 and loses in 2021-25, and it slows ATLAS's evals in H1. Our rule is to
  adopt only what is better in both periods. LIT priority stays.
- **How often it happens:** rarely. 9 clashes in 2026 (8 in H1, 1 in H2) and 35 in 2021-25, so about once a month or less.
  Either way it moves a few hundred dollars a month at most.

## Today, 2026-10-27

| | LIT priority (what the bot did) | B-holds |
|---|---:|---:|
| ATLAS LONG 3 micros 03:30 (MACD) | closed at 06:12 (HEDGE) **+$525** | held to its 8R target at 06:48 **+$1,662** |
| LIT SHORT 7 micros 06:12 | stopped at 06:40 **-$965** | skipped **$0** |
| **Day, both accounts** | **-$440** | **+$1,662** (+$2,102) |

So today B-holds was clearly better. But the backtest has the exact mirror image on **2026-03-16**:
- ATLAS MACD short at 03:30, LIT long at 06:12.
- With LIT priority, ATLAS was closed at about breakeven (+0.06R) and LIT hit its target (+3.65R, +$1,110 at LIT's size).
- With B-holds, ATLAS would have run to its stop (-1.0R) and LIT's winner would have been lost.

So it is one win each. One day tells us nothing. Only the full count can decide.

(The bot's log shows that neither of today's orders actually reached the broker. ATLAS's 03:30 order answered NOT OK, and
LIT's 06:12 SELL was never filled. The fix of 2026-10-27 books both at $0. The table above is the model's view.)

## The numbers

Spans: 2026 H1 = Jan-Jun (pick), H2 = Jul-Oct 16 (check), 2021-25 = 5 years (reference). LIT $ = the run `lit_live` trades
at LIT's own size rule, minus the trades B-holds skips. ATLAS $ = its back-to-back Builder 25K eval path, sized the way the
bot sizes it (need). Eval odds = a fresh eval started on every session (p10/f10 = passed / failed within 10 sessions).
For ATLAS "fail" also counts **stuck** (less than $100 of room left).

### Clashes

| | 2026 H1 | 2026 H2 | 2026 | 2021-25 |
|---|---:|---:|---:|---:|
| Clashes (ATLAS open, LIT signals the other way) | 8 | 1 | 9 | 35 |
| LIT trades skipped with B-holds | 8 | 1 | 9 | 35 |
| ATLAS trades on the eval path: closed now / held with B-holds | 2 / 2 | 0 / 0 | 2 / 2 | 23 / 26 |
| ATLAS on the clash trades, held vs closed (R per trade) | +14.4R vs +7.2R | +1.3R vs -0.5R | +15.7R vs +6.7R | +23.3R vs +19.8R |
| The LIT trades B-holds skips, at LIT's size | -$659 | -$190 | -$848 | -$2,302 |

On the clash trades alone B-holds looks good: ATLAS keeps more, and the skipped LIT trades were losers on balance. But over
5 years ATLAS kept the better result in only 8 of 35 clashes. The gain comes from a few big ATLAS winners, mostly two
MACD 8R winners in February 2026. On the eval path it does not show up as more money, except in 2026.

### Money and risk

| | Rule | 2026 H1 | 2026 H2 | 2021-25 |
|---|---|---:|---:|---:|
| **Both accounts, net** | LIT priority | +$40,151 ($6,587/mo) | +$14,269 ($3,842/mo) | -$3,160 (-$62/mo) |
| | **B-holds** | **+$41,182 ($6,757/mo)** | **+$14,459 ($3,893/mo)** | **-$4,983 (-$98/mo)** |
| Both, PF / max DD | LIT priority | 3.96 / -$2,247 | 2.96 / -$1,512 | 0.98 / -$20,145 |
| | B-holds | 4.48 / -$2,261 | 3.04 / -$1,512 | 0.97 / -$21,250 |
| LIT 50K, net (PF, DD) | LIT priority | +$33,666 (4.92, -$2,213) | +$9,836 (2.88, -$1,419) | -$664 (0.99, -$20,378) |
| | B-holds | +$34,325 (6.03, -$1,858) | +$10,025 (2.99, -$1,419) | +$1,638 (1.02, -$17,395) |
| ATLAS 25K path, net (PF, DD) | LIT priority | +$6,485 (2.30, -$926) | +$4,434 (3.18, -$816) | -$2,496 (0.95, -$10,002) |
| | B-holds | +$6,858 (2.37, -$940) | +$4,434 (3.18, -$816) | -$6,622 (0.89, -$15,368) |
| Trades a week, LIT / ATLAS | LIT priority | 3.12 / 2.11 | 2.56 / 1.60 | 2.38 / 2.83 |
| | B-holds | 2.81 / 2.11 | 2.50 / 1.60 | 2.22 / 2.94 |

- LIT alone does a bit better with B-holds in both periods, because the trades it skips were losers on balance.
- ATLAS does a bit better in 2026 H1, the same in H2, and **-$4,126 worse over 2021-25**. That is the eval path running
  differently: other evals get stuck, other new evals start. B-holds also lets ATLAS take some later trades that the
  skipped LIT trade would have blocked, and over 2021-25 those were losers.

### MFFU eval speed (2-week pass / fail)

| | Rule | 2026 H1 | 2026 H2 | 2021-25 |
|---|---|---|---|---|
| **LIT 50K** p10/f10, dec10 | LIT priority | 57.1 / 1.7, 58.8 | 52.2 / 5.8, 58.0 | 18.9 / 7.8, 26.7 |
| | B-holds | 57.1 / 1.7, 58.8 | 52.2 / 5.8, 58.0 | 17.5 / 7.1, 24.6 |
| LIT p15/f15, slow_pass, pass_med | LIT priority | 64.9 / 1.8, 7.5%, 5 | 53.1 / 6.2, 2.1%, 4 | 20.9 / 8.9, 4.7%, 5 |
| | B-holds | 64.9 / 1.8, 6.3%, 5 | 53.1 / 6.2, 2.1%, 4 | 19.8 / 8.6, 5.0%, 5 |
| **ATLAS 25K** p10/f10 (+stuck), dec10 | LIT priority | **65.5** / 0.0 (+0.8), 66.3 | 43.5 / 0.0, 43.5 | 24.4 / 0.0 (+26.0), 50.4 |
| | B-holds | **60.5** / 0.0 (+3.4), 63.9 | 43.5 / 0.0, 43.5 | 25.5 / 0.0 (+28.3), 53.8 |
| ATLAS p15/dead15, slow_pass, pass_med | LIT priority | 73.7 / 0.9, 4.3%, 5 | 54.7 / 0.0, 13.3%, 6 | 26.7 / 31.1, 3.1%, 4 |
| | B-holds | 68.4 / 3.5, 8.8%, 4 | 54.7 / 0.0, 13.3%, 6 | 27.9 / 33.1, 3.0%, 4 |

- ATLAS's H1 evals slow down with B-holds: 5 points fewer 2-week passes, twice as many slow passes, and more stuck evals.
  A held ATLAS trade that runs to its full stop costs more than closing it early for a small win or a small loss (e.g.
  2026-02-12 -0.61R becomes -1.01R, 2026-03-16 +0.06R becomes -1.0R). On a $1,000 trailing floor that pushes some evals
  under $100 of room.
- In 2021-25 ATLAS passes 1.1 points more within 2 weeks with B-holds, but also gets stuck 2.3 points more often. LIT passes
  1.4 points less.

## Why it is not adopted

1. **Not better in both periods.** 2026: +$1,221 for both accounts together. 2021-25: -$1,823.
2. **It slows ATLAS's evals in the pick half** (2-week pass 65.5% to 60.5%, stuck 0.8% to 3.4%). The 2-week eval goal is an
   owner rule.
3. **The 2026 gain is small and comes from a few trades:** about +$125 a month, mostly two ATLAS 8R winners in February.
   Today's +$2,102 day is real, but 2026-03-16 is the exact mirror and went the other way.
4. Trades a week are fine with both rules: LIT 2.5-3.1 a week in 2026, ATLAS unchanged. So frequency is not the reason.

**"First in holds, both ways":** half of it is already live. When LIT is in a trade, an opposite ATLAS entry is blocked,
and so is one while LIT has an opposite setup armed. The other half, ATLAS in a trade blocking LIT, is exactly B-holds,
and the numbers above reject it.

## How it was tested

- `python -X utf8 tools/bholds.py [save]` -> `research/second/bholds.json`, runs `bholds_*`. Paper research only: no
  engine file, `live_model*.json` or `second_model.json` was changed.
- LIT trades = run `lit_live` (live_model.json "lit", 120 trades in 2026, 511 in 2021-25 on 5m bars), $1.90 a micro. The
  LIT eval odds use `tools/second_mix.run_eval` with the live `lit_sizing` (two_week, room_f 0.8, safe_eval after session
  10) on the Builder 50K. LIT's own back-to-back eval path is not used for $ because, with no reset, one eval can drift for
  months at 1 micro.
- ATLAS = `tools/atlas.py` BASE (EMA + MACD + S/R) on `tools/second_account_b.score` (Builder 25K, need size =
  `engine/account_b.qty`, one position, at most 2 a day, $600 soft daily loss, stuck under $100). LIT priority reproduces
  the published ATLAS numbers (H1 65.5/0.0 +$6,485 vs +$6,481 published, H2 43.5/0.0 +$4,434, 2025 30.1, 2021-24 22.9).
  The armed-setup windows were rebuilt on today's LIT (631 trades; the stored cache had 630).
- A clash = an ATLAS trade that is open when LIT enters the other way. Which ATLAS trades hold is decided on the candidate
  trades, using ATLAS's own one-position and 2-a-day rules in time order. A skipped LIT signal is lost for that day (LIT
  takes one trade a day). The closed ATLAS trade exits at the next bar's open with 1 tick of slippage, as in the live HEDGE.
- Limits: there were only 9 clashes in 2026. Today's trade is after the data ends (2026-10-16), so it is not in the backtest.
  Its numbers come from the bot's heartbeat.
