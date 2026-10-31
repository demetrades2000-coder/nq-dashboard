## In one minute

- **The problem.** ATLAS makes its money in 2026 and on a handful of trades. On the Builder 25K it loses in 2025 and is
  flat in 2021-24. In 2026 H2 the account trades only 1.6 times a week (idle evals), and only 38% of weeks have 2+ trades.
- **Best lead: add the two stop hunts as ATLAS members 4 and 5, at half size.**
  - The hunts are `sh_asia` (Asia resweep hunt) and `sh_trend` (trend inducement hunt).
  - Money (eval path less $63 fees, average over starts):
    - 2026 H1: +$10,090 ($1,682 a month), vs +$8,500 today;
    - 2026 H2: +$3,260 ($931 a month), vs +$2,029;
    - 2025: -$854, vs -$1,935;
    - 2021-24: +$2,542, vs -$1,429.
  - 2-week pass / fail: H1 67.2 / 0.0 (today 65.5 / 0.0). H2 **55.1 / 0.0** (43.5 / 0.0).
  - Frequency: 3.9-5.4 trades a week on the account, 76-93% of weeks with 2+ (today 1.6-3.1, 38-72%).
- **Second-tier lead: the same, plus buy a new eval when the room is under $200 (today $100).**
  - Money: +$10,876 / +$3,859 / **+$240** / **+$4,575** (H1 / H2 / 2025 / 2021-24). That is positive in every period.
  - Passes a month: 1.86 / 0.97 / 0.65 / 0.74 (candidate 1: 1.61 / 0.73 / 0.21 / 0.44).
  - The cost: about 25-150% more evals bought, because evals are given up with $100-200 of room left.
  - It was added after looking at the eval table, so it counts as a post-hoc stack.
- **Why it is only "paper first", not "switch it on":**
  - the hunts were picked using 2025 and 2021-24, so only H2 is a clean check;
  - the stop-hunt audit (`stophunt-audit.md`) called the trend hunt's pick "selection luck";
  - the trend hunt enters on a limit order, and account B can only send market orders today;
  - 2025 still loses money.
- **Everything else is rejected:**
  - regime gates (VIX, ATR, weekday, hour), dropping a member, a smaller EMA, smaller sizes;
  - on today's ATLAS (without the hunts), the "buy a new eval earlier" and "bigger size after session 10" rules. They
    make more trading $ in 2026 but less $ per $63 eval in H1, and they lose more in 2021-24.
  - **Without the hunts, keep the $100 stuck rule and the 30% cap after session 10.**
- **Max 1 trade per member per day is already true.** EMA, MACD and S/R each take 1 a day (checked: 636 / 387 / 372
  trades, never 2 on a day). Of the hunts only `sh_trend` can take 2 a session; "first one only" (SHT1) was no better.

## Ranked candidates (money first)

Money = eval-path $ less the $63 fees, averaged over back-to-back paths started on every 5th session. $/mo = that ÷ the
span's months (H1 6, H2 3.5, 2025 12, 2021-24 38). 2-week = pass / fail / stuck within 10 sessions.

| # | Candidate | 2026 H1 (pick) | 2026 H2 (check) | 2025 | 2021-24 | Trades / wk, % weeks 2+ (H2) | Verdict |
|---|---|---|---|---|---|---|---|
| - | **Today** | +$8,500 ($1,417/mo) · 65.5 / 0 / 0.8 | +$2,029 ($580/mo) · 43.5 / 0 / 0 | -$1,935 · 30.1 / 0 / 23.7 | -$1,429 · 22.9 / 0 / 27.1 | 1.6, 38% | baseline |
| 1 | **+ both hunts at 0.5 size** | **+$10,090 ($1,682/mo)** · 67.2 / 0 / 0 | **+$3,260 ($931/mo)** · 55.1 / 0 / 0 | -$854 · 26.5 / 0 / 20.5 | **+$2,542** · 24.5 / 0 / 25.1 | 4.7, 88% | **promising: paper first** |
| 1b | #1 + buy a new eval under $200 of room | +$10,876 ($1,813/mo) · 67.2 / 0 / 2.5 | +$3,859 ($1,103/mo) · 55.1 / 0 / 1.4 | **+$240** · 26.5 / 0 / 41.0 | **+$4,575** · 24.3 / 0 / 45.8 | 4.8, 88% | promising, post-hoc stack |
| 2 | + both hunts at 0.75 size | +$11,720 ($1,953/mo) · 68.1 / 0 / 0 | +$3,622 ($1,035/mo) · 59.4 / 0 / 0 | -$1,668 · 30.5 / 0 / 21.3 | +$5,790 · 27.3 / 0 / 25.1 | 4.4, 88% | promising, more risk |
| 3 | No EMA entry 06:00-06:59 + sh_trend evenings only (18:00-02:00), full size | +$9,678 ($1,613/mo) · 67.2 / 0 / 0.8 | +$2,432 ($695/mo) · 50.7 / 0 / 0 | **+$145** · 31.7 / 0 / 20.1 | +$1,418 · 24.8 / 0 / 26.5 | 1.9, 44% | weak (both rules near chance) |
| x | + sh_trend at full size | +$9,456 · **60.5** / 0 / 0 | +$3,208 · 62.3 / 0 / 0 | +$811 | +$7,188 | 2.4, 63% | rejected: H1 2-week pass -5 points |
| x | + sh_asia at full size | +$12,339 · 79.0 / 0 / 0 | +$2,128 · 53.6 / 0 / **1.4** | -$2,844 | +$5,059 | 1.5, 31% | rejected: H2 stuck up, 2025 worse |

More detail on the three candidates:

| | Today | #1 hunts 0.5 | #2 hunts 0.75 | #3 EMA no 06 + SHT eve |
|---|---|---|---|---|
| H1 p15 / f15, slow_pass, pass_med | 73.7 / 0, 4.3%, 5 | 79.8 / 0, 5.0%, 6 | 81.6 / 0, 5.8%, 5.5 | 71.1 / 0, 8.5%, 5 |
| H2 p15 / f15, slow_pass, pass_med | 54.7 / 0, 13.3%, 6 | 73.4 / 0, 1.9%, 7 | 68.8 / 0, 5.8%, 6 | 53.1 / 0, 0%, 3 |
| dec10 (H1 / H2) | 66.3 / 43.5 | 67.2 / 55.1 | 68.1 / 59.4 | 68.0 / 50.7 |
| $ per $63 eval (H1 / H2 / 2025 / 21-24) | +1,545 / +839 / -415 / -50 | +1,586 / +1,262 / -134 / +110 | +1,731 / +1,358 / -212 / +218 | +1,625 / +858 / +20 / +60 |
| Passes per eval bought (H1 / H2 / 2025 / 21-24) | 0.81 / 0.59 / 0.17 / 0.33 | 0.84 / 0.61 / 0.23 / 0.34 | 0.85 / 0.63 / 0.22 / 0.38 | 0.82 / 0.65 / 0.30 / 0.34 |
| One-start path (published style) H1 / H2 | +$6,481 / +$4,434 | +$13,136 / +$1,057 | +$14,580 / +$1,421 | +$8,661 / +$1,803 |
| PF / max DD on that path, H2 | 3.18 / -$816 | 1.32 / -$819 | 1.42 / -$833 | 1.80 / -$831 |
| Funded 25K, paid in 3 months (H1 / H2 starts) | $1,842 / $1,349 | $1,934 / $1,750 | $1,934 / $1,750 | $2,201 / $1,731 |

Note on the one-start path: in H2 the hunt versions start one eval on 2026-07-01 that is still open on 2026-10-16
(+$1.1k), so that single path shows less than today. Started on any other 5th session they average +$3.3k / +$3.6k.
This is why the average over starts decides here; both are shown.

## Why candidate 1 is the lead (evidence)

- **Plateau.** The 7 neighbours (each hunt at 0.4-0.75 size):
  - 5 of 7 beat today in both 2026 halves.
  - The same sizes for both hunts (0.4 / 0.5 / 0.6 / 0.75): H1 67.2-69.7%, H2 52.2-59.4%, 0 fails. At 0.6 H2 has 1.4%
    stuck.
  - Asia 0.5 + trend 0.75 drops H1 to 63.0%.
  - 2021-24: +$1.7k to +$5.8k in all 7 (today -$1.4k).
  - 2025: -$512 to -$2,807 (today -$1,935). So 2025 is not fixed.
  - At full size the hunts crowd the one position and cost H1 passes (60.5%).
- **Placebo members (20 random-time twins of each hunt + one flipped twin, same entry mechanics, same size, same
  account rules; `tools/stophunt_audit.placebo_rows`):**

| ATLAS + hunts at 0.5 | Real | Random-time members (mean of 20) | Share of random ≥ real | Flipped twin |
|---|---|---|---|---|
| H1 2-week pass / money | 67.2%, +$10,090 | 60.3%, +$8,513 | 30% / 25% | 66.4%, +$8,489 |
| H2 | 55.1%, +$3,260 | 38.3%, +$1,224 | 10% / 0% | 46.4%, +$675 |
| 2025 | 26.5%, -$854 | 26.1%, -$1,498 | 55% / 40% | 23.3%, -$3,402 |
| 2021-24 | 24.5%, +$2,542 | 21.3%, -$4,684 | 5% / 0% | 20.7%, -$5,901 |

  - 0 of 20 random members pass the v2 rule.
  - The hunts add something that random extra trades do not in H2 and 2021-24. In H1 and 2025 they do not.
- **Less concentration.** Remove each member's 3 best trades in every span:
  - today H2: 11.6% pass, -$326;
  - candidate 1 H2: 24.6% pass, +$819;
  - candidate 2 H2: 27.5% pass, +$1,911.
  - Removing the hunts' own 3 best trades leaves candidate 1 at H1 63.9%, H2 52.2% / +$2,913. Its 2021-24 money is
    unchanged.
- **Where the money comes from (H2, one-start path):**
  - EMA +$1,165;
  - sh_trend +$398;
  - sh_asia -$88;
  - MACD -$467.
  - In 2025 the hunts make +$2,771 while EMA, MACD and S/R lose -$1,521.
  - In H2 the Asia hunt is about flat. The trend hunt and the extra eval passes carry the gain.

## What did not work

**Regime gates picked on 2021-24 only, then checked on 2025 and 2026.** This is a new angle: earlier tries picked on
2026 H1.
- Rule (declared before scoring): per member and per fact (VIX tercile, ATR percentile tercile, weekday, entry hour), drop
  the worst bucket if its 2021-24 mean R < 0 with 30+ trades.
- Result: 12 gates picked.
  - The dropped buckets **do not stay bad**: 8 of 12 are positive in 2026 H1, several strongly. Examples: EMA on high-ATR
    days +0.71R in H1 / +1.08R in H2; MACD on Mondays +3.55R in H1.
  - At the account: 1 passes the v2 rule, no EMA entry in the 06:00 hour (+$843 in H1, +$156 in H2, 2025 / 2021-24 a
    little better).
  - 2% of same-size random skips also pass, but the gain is a few hundred dollars on 3 trades in 2026. Not adopted
    alone.
- S/R without the 11:00 hour is the one bucket that is negative in all four periods. It is better in both 2026 halves
  (68.9% / 53.6%) but loses $1.6k more in 2021-24 at the account. Rejected, as in `atlas.md`.

**Members and weights:**
- Dropping any member costs 2026 passes (MACD + S/R only: H2 24.6%).
- EMA at 0.5 / 0.75 size (the weakest 5-year member, PF 1.05 at $500) costs H1 and H2 passes.

**Eval path: buy a new eval earlier, or size up after session 10.** Measured as $ per $63 eval and passes per eval.

| Rule | H1 $ / per eval / passes per eval | H2 | 2025 | 2021-24 |
|---|---|---|---|---|
| Today (stuck under $100, 30% room after session 10) | +$8,500 / +$1,545 / 0.81 | +$2,029 / +$839 / 0.59 | -$1,935 / -$415 / 0.17 | -$1,429 / -$50 / 0.33 |
| Stuck under $300 | +$13,314 / +$1,263 / 0.72 | +$2,627 / +$701 / 0.38 | +$478 / +$27 / 0.29 | -$827 / -$14 / 0.25 |
| Idle: from session 15, under $300 room = stuck | +$12,505 / +$1,342 / 0.79 | +$3,283 / +$772 / 0.47 | -$1,913 / -$149 / 0.27 | **-$6,255** / -$149 / 0.27 |
| 50% room after session 10 | +$11,920 / +$1,703 / 0.83 | +$3,760 / +$921 / 0.57 | -$3,532 / -$279 / 0.24 | **-$6,811** / -$177 / 0.27 |

| Stuck under $200 | +$12,085 / +$1,214 / 0.73 | +$3,525 / +$940 / 0.53 | -$477 / -$38 / 0.28 | -$2,376 / -$46 / 0.30 |
| **Hunts 0.5 + stuck under $200** | **+$10,876 / +$1,344 / 0.77** | **+$3,859 / +$985 / 0.60** | **+$240 / +$15 / 0.31** | **+$4,575 / +$108 / 0.34** |

- On today's ATLAS, buying earlier adds trading $ in 2026 because a fresh eval sizes up again.
  - It also passes more evals a month (stuck under $200: 2.11 / 0.69 / 0.65 / 0.76 vs 1.40 / 0.49 / 0.18 / 0.45).
  - But in H1 each $63 eval is worth less.
  - In 2021-24 the extra evals mostly die, so it loses $1-5k more.
  - Without the hunts: keep today's rule.
- With the hunts it works in all four periods. The extra hunt trades give a fresh eval more chances, so fewer of the
  new evals die. It costs more evals: per back-to-back path, 8.1 vs 6.4 in H1 and 42 vs 23 in 2021-24. This is a
  post-hoc stack: decide it together with candidate 1, not alone.
- The "zombie" eval A3 found (room $100-300 after session 10) is real.

**Smaller sizes:**
- room 40% loses H1 passes;
- $300 cap and the $150 safe size drop the 2-week pass to 6-33%.

## Multiple-testing count

- **62 variants** in 11 families (`research/second/atlas_v2_grid.json`):
  - members 7, drops 3, weights 2, gates 12, eval rules 13, sizes 3;
  - hunt round 2: 8;
  - plateau: 7;
  - stacks: 7 (2 added after the eval table).
- 20 beat today in H1, 29 in H2, 15 in both (about 9.4 by chance if H1 and H2 were independent), and 10 pass the full v2
  rule.
- The two stuck stacks fail the "dead not up" part by design (an eval given up counts as stuck). On money they are tier
  A.
- 9 of the 10 contain the hunts at a reduced size, so they are one finding seen 9 times, not 9 findings.
- The finding's own placebo is the random-member test above. Outside the hunts, 1 of 43 passes (the EMA 06:00 gate),
  about what chance gives.
- The gate placebos (200 same-size random skips each):
  - EMA 06:00: 2.0% pass;
  - sh_trend evenings only: 12.0% pass (chance level);
  - S/R no 11:00: 3.5% pass.

## Exact JSON for the owner (not applied; each needs building first)

**Candidate 1: ATLAS + both hunts at half size (recommended for a paper shadow first).** It is not routable today:
- `engine/account_b.py` refuses `"candidate": true` strategies;
- it has no per-member size weight;
- it only places market orders at the 5m open, and the trend hunt uses a 30-minute limit at mid-candle;
- B would also need to trade 18:00-02:00 for the Asia hunt, with the day counted as the CME trading day.

```json
"account_b": {"account": "<NinjaTrader 25K name>", "plan": "builder25k", "eval_start": "<yyyy-mm-dd>", "sizing": "need",
              "strategies": ["ema_lon_vix", "macd_sweep", "sr_nyreclaim", "sh_asia", "sh_trend"],
              "weights": {"sh_asia": 0.5, "sh_trend": 0.5}}
```
and in `"strategies"`: `"sh_asia": {..., "candidate": false}`, `"sh_trend": {..., "candidate": false}`.
- `weights` = new key: micros = max(1, int(need micros x weight)), then the day guard (as `tools/atlas.q_variant`).
- Order on the same bar: EMA, MACD, S/R, Asia hunt, trend hunt.

**Candidate 1b:** candidate 1 plus a new key `"min_room": 200` in `account_b`. It replaces `engine/account_b.MIN_ROOM =
100` for this account: stuck = room under $200, push "buy a new one".

**Candidate 2:** the same JSON with `"weights": {"sh_asia": 0.75, "sh_trend": 0.75}`.

**Candidate 3:** members EMA + MACD + S/R + sh_trend at full size, with two new per-member hour filters (new keys):
```json
"strategies": ["ema_lon_vix", "macd_sweep", "sr_nyreclaim", "sh_trend"],
"hours_out": {"ema_lon_vix": [[6, 7]], "sh_trend": [[2, 18]]}
```
(no EMA entry 06:00-06:59 ET; trend hunt entries only 18:00-02:00 ET).

**Suggested next step:** log candidate 1 as a paper shadow next to the live ATLAS (no routing). It needs the cloud /
PC paper ledger to book the hunts on account B's rules. Revisit after 20+ hunt trades, using the scorecard bands.

**Built (2026-10-25): the paper shadow of candidate 1b** (`engine/atlas_v2.py`; cloud state `atlas_v2`, PC heartbeat
`second.atlas_v2`, ATLAS page card "ATLAS v2 (paper shadow)"). Never routed; `second_model.json` `account_b` untouched.
Its 2026 replay equals this research's executor trade for trade (`tests/test_atlas_v2_shadow.py`). Note: re-scored on
today's unit files (`research/second/*_best.json`), candidate 1b reads H1 +$10,882 / H2 +$3,990 / 2025 +$246 / 2021-24
+$4,771 (published above: +$10,876 / +$3,859 / +$240 / +$4,575; the stored runs used an older unit cache, 206 of 207
2026 trades identical). Same conclusion. `account_b` now accepts `"weights"` and `"min_room"` (off when absent).

## How it was tested

- **Executor:** `tools/atlas.py` + `tools/second_account_b.py`, which reproduces the audit's base exactly (H1 65.5 / H2
  43.5, path +$6,481 / +$4,434, 2025 -$2,156, 2021-24 +$2,419).
  - Rules: need size on the 25K preset (50% room, $600, 20 micros, 30% after session 10, skip if under 1 micro), one
    position, max 2 a day, never opposite LIT (open, entering or armed).
  - Costs: $1.90 a micro + 1 tick.
  - Data: TradingView CME NQ1! and the CBOE VIX file.
- **Hunt members:** the stored research trades (`research/stophunt/sh_*.json`), converted the way
  `second_mix.second_units` does it. They reproduce the research numbers exactly at $500, for example sh_trend H2 24
  trades +$4,916 and 2021-24 +$26,349.
- **Facts are known before the trade:**
  - VIX: the prior session's CBOE close;
  - ATR percentile: the prior session's daily ATR(14) vs its last 252 sessions;
  - weekday and entry hour.
- **v2 rule:**
  - in each 2026 half: 2-week pass up or equal, dead not up, money up;
  - 2025 and 2021-24: money ≥ $0 (tier A) or not worse than today (tier B);
  - 2+ candidate trades a week in every span.
  - Eval-rule variants are judged on $ per eval instead, since buying a new eval raises "stuck" by design.

## Commands

- `python -X utf8 tools/atlas_v2.py units`: hunt units (cache `research/runs/_cache/atlas_v2_sh_units.pkl`).
- `python -X utf8 tools/atlas_v2.py grid`: the 60 variants, about 1 min on 4 cores.
- `python -X utf8 tools/atlas_v2.py placebo <name> ...`: the gate placebos, 200 each.
- `python -X utf8 tools/atlas_v2.py plmem 20`: the placebo members.
- `python -X utf8 tools/atlas_v2.py save`: runs `atlas_v2_*`.
- `python -X utf8 tools/atlas_v2.py one '{"members": [...], "w": {...}}'`: score one variant.
- Needs `research/runs/_cache/second_mix_units.pkl`, `atlas_lit_armed.pkl` (see `atlas.md`).
- Paper research only. Unchanged: `second_model.json` (`"account_b"` and every strategy), `engine/*`, `live_model*.json`.
