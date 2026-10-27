# LIT: bias and regime ideas nobody had tested yet

**The question.** Can the live LIT trade be helped by knowing *what kind of day or week it is*: how scared the market is (VIX),
how close the eval is to passing, where the week's high and low were made, how big the Asia range was, or whether it is an
expiry / month-end day? Five ideas from the owner's list, all inside LIT (liquidity, sessions, the week's rhythm). No
indicators, no VWAP, no outside data except the VIX close LIT already uses for its target.

**Short answer. Nothing is adopted.** Two ideas look good at first sight and fail on a closer look:
- **Bigger size when VIX >= 20** makes more money in Jan-Jun and in 2021-25, but Jul-Oct 2026 had only one day with VIX >= 20
  and no trade on it. There is nothing to check it on, so it stays a "maybe later" (NEUTRAL).
- **The weekly-profile skip** looks better in both halves, but the gain is luck of the eval sizing, not the rule (details in 3).

## How it was tested (plain words)
- **Data:** CME NQ1! futures from TradingView: 5-minute bars, plus true 1-minute bars for 2026. VIX daily closes
  (`data/VIX_1d.csv`). Official CME data only (TradingView / NinjaTrader), no CFD.
- **The trades:** the live LIT setups (sweep, inducement, displacement, 5m CISD, limit, 1m CISD entry), the stop 1 tick beyond
  the sweep extreme, the VIX-band target banked at 8R, breakeven at 1R, flat at 15:55, the Monday rule and the weekly stop.
- **What changes:** either a setup is **skipped** (the day stays free, so a later LIT setup that day can still be taken, like the
  Monday rule), or the **size** is multiplied (one rounding together with the weekly stop, at least 1 micro, at most 40, and the
  60% room cap still applies after it).
- **Size:** the live eval sizing: $800 risk up to a 25-pt stop, then 800 x 25 / stop, half size after 2 stop-outs in a week, never
  more than 60% of the room to the MFFU trailing max-loss floor. Costs in: $1.40 per micro, 1 tick slippage on market orders and on
  stop / breakeven / end-of-day exits.
- **The baseline** is the live strategy at that size (run `lit_tight_eval_800_25_room60`). The test wrapper
  (`tools/lit_t_bias.py`) reproduces it exactly: the same 630 trades (120 in 2026) as the live loop, trade for trade, and the same
  H1 +$33,305 / H2 +$10,465.
- **Judged on 2026 only** (owner's order): settings picked on **H1 = Jan 2 - Jun 30**, checked on **H2 = Jul 1 - Oct 16**.
  **ADOPT** = better in both halves and 2-4 trades a week. 2021-25 is only a reference line (no 1-minute data there).
- **Eval columns:** an MFFU Builder 50K eval ($3,000 target, $2,000 trailing max loss) started on every session: % passed / failed
  within 2 weeks (10 sessions) and 1 month (20 sessions), the pass rate (passed / decided) and the median sessions to a pass.
- **Money columns** come from the back-to-back eval path (a new eval after each pass or fail), as in the other LIT studies.
  Because the room cap changes the size from trade to trade on that path, an idea can look better only because one later winner
  happened to get more micros. So every idea is also shown at a **fixed size** (the same eval size, no eval path, no room cap):
  that column shows the rule's own effect.

**Words used below**
- **VIX** = the market's "fear gauge". 15 is calm, 20+ is nervous, 30 is panic. LIT already uses yesterday's VIX close to set
  its target (the expected one-day move).
- **High/low-of-week window** = Tuesday 03:00 ET to Wednesday 11:30 ET, when LIT teaching says the week's high or low is usually
  made.
- **Asia range** = the high minus the low from 18:00 to midnight ET.
- **OPEX** = monthly options expiry, the third Friday of the month.

## 1. VIX regime sizing

**The idea.** When yesterday's VIX closed at 18 / 20 / 22 or more, trade 1.25x or 1.5x the size; when it closed under 15, trade
0.75x. One rounding; the room cap still applies.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 vs baseline | Fixed size H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---|
| vix >= 18 x1.25 | +1,523 | +0 | +130 | +1,733 / +292 | 3.12 / 2.56 | REJECT |
| vix >= 18 x1.5 | +8,448 | +0 | -4,661 | +5,142 / +876 | 3.12 / 2.56 | REJECT |
| vix >= 20 x1.25 | +2,229 | +0 | -749 | +2,184 / +0 | 3.12 / 2.56 | NEUTRAL |
| vix >= 20 x1.5 | +5,296 | +0 | +1,408 | +5,912 / +0 | 3.12 / 2.56 | NEUTRAL |
| vix >= 22 x1.25 | +1,406 | +0 | -1,000 | +1,405 / +0 | 3.12 / 2.56 | NEUTRAL |
| vix >= 22 x1.5 | +4,187 | +0 | +3,861 | +4,187 / +0 | 3.12 / 2.56 | NEUTRAL |
| vix < 15 x0.75 | -2,625 | -98 | -4,920 | -2,795 / -604 | 3.12 / 2.56 | REJECT |
| vix >= 18 x1.25, < 15 x0.75 | -1,103 | -98 | -2,049 | -1,062 / -312 | 3.12 / 2.56 | REJECT |
| vix >= 20 x1.25, < 15 x0.75 | -397 | -98 | -6,072 | -611 / -604 | 3.12 / 2.56 | NEUTRAL |
| vix >= 22 x1.25, < 15 x0.75 | -1,220 | -98 | -6,093 | -1,389 / -604 | 3.12 / 2.56 | REJECT |
| vix >= 20 x1.5, < 15 x0.75 | +3,538 | -98 | -4,642 | +3,118 / -604 | 3.12 / 2.56 | REJECT |

<details><summary>Full table (H1 / H2 / 2021-25 for every variant)</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (live LIT, eval size) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| vix >= 18 x1.25 | H1 (pick) | 3.12 | 22.5 | 4.05 | +34,828 | 5,714 | -2,553 | 2,569 | -184 | 37.5/3.9 | 60.2/9.4 | 88.5 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.8 | 19.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.99 | -1,300 | -25 | -18,266 | 978 | -210 | 10.7/7.9 | 16.6/20.4 | 28.0 | 12.5 |
| vix >= 18 x1.5 | H1 (pick) | 3.12 | 22.5 | 4.48 | +41,753 | 6,850 | -2,772 | 2,986 | -194 | 37.5/7.8 | 60.2/13.3 | 80.2 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 32.1/0.0 | 50.0/0.0 | 95.9 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.93 | -6,091 | -119 | -21,627 | 932 | -212 | 10.9/9.6 | 16.3/24.3 | 26.2 | 11.0 |
| vix >= 20 x1.25 | H1 (pick) | 3.12 | 22.5 | 4.17 | +35,534 | 5,830 | -2,553 | 2,597 | -181 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,179 | -43 | -17,668 | 954 | -207 | 10.6/8.5 | 16.9/20.7 | 28.2 | 13.0 |
| vix >= 20 x1.5 | H1 (pick) | 3.12 | 22.5 | 4.34 | +38,601 | 6,333 | -2,811 | 2,787 | -187 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.0 | -22 | 0 | -18,224 | 992 | -210 | 11.2/9.8 | 16.6/23.8 | 27.6 | 12.0 |
| vix >= 22 x1.25 | H1 (pick) | 3.12 | 22.5 | 4.11 | +34,711 | 5,695 | -2,513 | 2,548 | -180 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,430 | -48 | -17,668 | 948 | -206 | 10.0/8.5 | 17.2/20.9 | 29.2 | 14.0 |
| vix >= 22 x1.5 | H1 (pick) | 3.12 | 22.5 | 4.26 | +37,492 | 6,151 | -2,773 | 2,723 | -186 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.03 | +2,431 | 48 | -17,750 | 1,025 | -211 | 10.7/9.3 | 16.5/23.4 | 27.9 | 13.0 |
| vix < 15 x0.75 | H1 (pick) | 3.12 | 22.5 | 3.85 | +30,680 | 5,033 | -2,513 | 2,303 | -174 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.62 | +10,367 | 2,791 | -2,157 | 1,197 | -246 | 23.1/0.0 | 47.4/0.0 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.92 | -6,350 | -124 | -18,811 | 849 | -194 | 7.5/6.2 | 14.1/17.4 | 28.1 | 16.0 |
| vix >= 18 x1.25, < 15 x0.75 | H1 (pick) | 3.12 | 22.5 | 3.9 | +32,202 | 5,283 | -2,553 | 2,407 | -179 | 37.5/3.9 | 60.2/9.4 | 88.5 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.62 | +10,367 | 2,791 | -2,157 | 1,197 | -246 | 23.1/0.0 | 47.4/0.0 | 95.9 | 20.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.96 | -3,479 | -68 | -19,747 | 909 | -200 | 9.4/6.0 | 14.9/16.9 | 25.5 | 12.0 |
| vix >= 20 x1.25, < 15 x0.75 | H1 (pick) | 3.12 | 22.5 | 4.02 | +32,908 | 5,399 | -2,553 | 2,435 | -176 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.62 | +10,367 | 2,791 | -2,157 | 1,197 | -246 | 23.1/0.0 | 47.4/0.0 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.91 | -7,502 | -147 | -19,188 | 839 | -195 | 9.3/6.5 | 15.2/17.2 | 25.6 | 12.5 |
| vix >= 22 x1.25, < 15 x0.75 | H1 (pick) | 3.12 | 22.5 | 3.95 | +32,085 | 5,264 | -2,513 | 2,386 | -175 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.62 | +10,367 | 2,791 | -2,157 | 1,197 | -246 | 23.1/0.0 | 47.4/0.0 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.91 | -7,523 | -147 | -18,957 | 835 | -194 | 8.7/6.5 | 15.5/17.4 | 26.7 | 13.0 |
| vix >= 20 x1.5, < 15 x0.75 | H1 (pick) | 3.12 | 22.5 | 4.27 | +36,843 | 6,044 | -2,811 | 2,673 | -182 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.62 | +10,367 | 2,791 | -2,157 | 1,197 | -246 | 23.1/0.0 | 47.4/0.0 | 95.9 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.93 | -6,072 | -119 | -19,445 | 883 | -201 | 9.9/7.8 | 15.0/20.4 | 25.0 | 12.0 |

</details>

**Verdict: NEUTRAL for "VIX >= 20 x1.5" (can't be checked), REJECT for the rest.**

**Why, in plain words.**
- **Jan-Jun 2026 was a nervous market** (VIX >= 20 on 37 of 124 days, up to 31). LIT's best trades came on those days (the
  coverage report found PF 8.19 at VIX >= 20), so sizing up there adds $1.4k-$8.4k in H1.
- **Jul-Oct 2026 was calm** (VIX >= 20 on 1 of 77 days, and no LIT trade that day). The rule never fired, so H2 is identical to
  the baseline. It cannot be checked out of sample, so it is not adopted.
- **The cost shows up in the eval at VIX >= 18:** x1.5 lifts H1 to +$41.8k but the H1 pass rate falls from 92.3% to 80.2% and
  2-week fails rise from 3.1% to 7.8%. 18 is too low a line: it catches ordinary days.
- **2021-25 is mixed:** +$1.4k at 20 x1.5 and +$3.9k at 22 x1.5, but -$4.7k at 18 x1.5.
- **Cutting size when VIX < 15 hurts everywhere** (H1 -$2.6k, H2 -$98, 2021-25 -$4.9k): calm days still give LIT winners.
- **Worth a re-check** after the next nervous stretch (VIX >= 20 for a few weeks), using that stretch as the new check half.

## 2. Target-aware eval sizing

**The idea.** Two parts.
- **Trim:** when the eval-size trade's target would already take the eval past +$3,000, trade only the micros a target hit
  needs to pass (x1.0, or x1.2 for a little spare), never more than the eval size. A loss then costs less.
- **Press:** when the room to the trailing max-loss floor is large ($1,500+ or $2,000+) and the target is close (no more than
  2.5x or 4x the stop away), size up so a target hit passes the eval. It is never below the eval size, and it is capped at 60%
  of the room, at a full stop-out inside the $1,000 soft daily loss, and at 40 micros.

There is no fixed-size column: both rules need the eval's balance.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 vs baseline | Fixed size H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---|
| tgt trim x1.0 | -14,902 | -2,502 | +9,676 | n/a | 3.12 / 2.56 | REJECT |
| tgt trim x1.2 | -13,105 | -1,084 | +6,864 | n/a | 3.12 / 2.56 | REJECT |
| tgt press room>=1500 tgt<=2.5R | +1,239 | -2,174 | -3,725 | n/a | 3.12 / 2.56 | REJECT |
| tgt press room>=1500 tgt<=4R | +2,785 | -1,709 | -1,186 | n/a | 3.12 / 2.56 | REJECT |
| tgt press room>=2000 tgt<=2.5R | +0 | -2,174 | +872 | n/a | 3.12 / 2.56 | REJECT |
| tgt press room>=2000 tgt<=4R | +0 | -2,546 | -1,578 | n/a | 3.12 / 2.56 | REJECT |
| tgt trim + press room>=2000 tgt<=4R | -14,902 | +632 | +4,209 | n/a | 3.12 / 2.56 | REJECT |

<details><summary>Full table (H1 / H2 / 2021-25 for every variant)</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (live LIT, eval size) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| tgt trim x1.0 | H1 (pick) | 3.12 | 22.5 | 2.91 | +18,403 | 3,019 | -2,483 | 1,556 | -155 | 36.7/2.3 | 60.9/5.5 | 92.2 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.29 | +7,963 | 2,144 | -2,142 | 1,010 | -238 | 29.5/0.0 | 53.8/0.0 | 97.3 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.12 | +8,246 | 162 | -12,609 | 889 | -168 | 8.2/5.6 | 16.0/16.6 | 38.7 | 21.0 |
| tgt trim x1.2 | H1 (pick) | 3.12 | 22.5 | 3.08 | +20,200 | 3,314 | -2,376 | 1,661 | -156 | 35.2/3.1 | 60.9/6.2 | 92.2 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.45 | +9,381 | 2,526 | -2,200 | 1,131 | -248 | 29.5/0.0 | 53.8/0.0 | 97.3 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.07 | +5,434 | 106 | -10,637 | 943 | -186 | 8.0/6.2 | 16.5/16.9 | 36.7 | 19.5 |
| tgt press room>=1500 tgt<=2.5R | H1 (pick) | 3.12 | 22.5 | 4.12 | +34,544 | 5,667 | -2,513 | 2,534 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.1 | +8,291 | 2,232 | -2,157 | 1,132 | -291 | 34.6/0.0 | 55.1/0.0 | 95.8 | 13.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.94 | -5,155 | -101 | -17,903 | 894 | -201 | 9.0/8.3 | 16.4/21.2 | 29.6 | 15.0 |
| tgt press room>=1500 tgt<=4R | H1 (pick) | 3.12 | 22.5 | 4.26 | +36,090 | 5,921 | -2,513 | 2,620 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.08 | +8,756 | 2,357 | -2,280 | 1,205 | -312 | 42.3/2.6 | 59.0/2.6 | 94.7 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,616 | -51 | -19,234 | 979 | -213 | 11.3/9.8 | 18.8/26.1 | 29.2 | 13.0 |
| tgt press room>=2000 tgt<=2.5R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.1 | +8,291 | 2,232 | -2,157 | 1,132 | -291 | 38.5/0.0 | 59.0/0.0 | 95.9 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.99 | -558 | -11 | -17,903 | 969 | -206 | 8.9/8.2 | 15.6/21.0 | 30.6 | 17.0 |
| tgt press room>=2000 tgt<=4R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 36.7/3.1 | 60.2/6.2 | 92.3 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 1.98 | +7,919 | 2,132 | -2,280 | 1,145 | -312 | 41.0/2.6 | 60.3/2.6 | 96.0 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -3,008 | -59 | -19,234 | 968 | -212 | 10.4/8.7 | 16.7/22.6 | 29.8 | 15.0 |
| tgt trim + press room>=2000 tgt<=4R | H1 (pick) | 3.12 | 22.5 | 2.91 | +18,403 | 3,019 | -2,483 | 1,556 | -155 | 35.9/2.3 | 60.9/5.5 | 92.2 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.23 | +11,097 | 2,988 | -2,280 | 1,439 | -348 | 41.0/2.6 | 64.1/2.6 | 97.3 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.04 | +2,779 | 54 | -19,476 | 865 | -176 | 9.9/6.2 | 17.9/18.9 | 37.6 | 19.0 |

</details>

**Verdict: REJECT.**

**Why, in plain words.**
- **Trim gives up money for almost nothing:**
  - it cuts the eval-path money by $15k in H1 and $2.5k in H2;
  - the eval odds barely move (H1 2-week pass 37.5% -> 36.7%, fails 3.1% -> 2.3%; H2 1-month pass 47.4% -> 53.8%, pass rate
    95.7% -> 97.3%).
  Money made beyond +$3,000 in an eval is not paid out, so the cut costs little there. But the rule only helps in the few evals
  where the last trade loses, and it hurts the ones where a big trade would have carried the next eval.
- **Press speeds up H2 but costs money in it:**
  - room >= $1,500 and target <= 4R lifts the H2 2-week pass from 29.5% to 42.3% (fails 0% -> 2.6%) and adds $2.8k in H1;
  - but it costs $1.7k in H2, so it is not better in both halves.
- **Already covered:** both ideas are pieces of the **two-week eval mode** that is now live in `live_model.json`
  (`lit_sizing.mode two_week`: "one winner passes", sized to what is still needed). That mode does the same thing more
  completely, so a separate rule adds nothing.

## 3. Weekly profile (Thursday / Friday)

**The idea.** On a Thursday or Friday, look at the week so far at the moment of the setup. If the week's high was made inside the
high/low-of-week window ("how": Tue 03:00 - Wed 11:30 ET; or "tw": anywhere on Tuesday or Wednesday), treat it as the week's
high and don't buy toward it: skip longs, or trade them at 0.5x / 0.25x. The mirror rule applies to a low made in the window and
shorts. If both the high and the low were made in the window, no rule.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 vs baseline | Fixed size H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---|
| wp how skip toward | +2,381 | +767 | -36 | -2,321 / +1,082 | 2.89 / 2.37 | REJECT |
| wp how x0.5 toward | -759 | +335 | -3,586 | -756 / +544 | 3.12 / 2.56 | REJECT |
| wp tw skip toward | +2,710 | +769 | +3,454 | -2,078 / +769 | 2.81 / 2.37 | REJECT |
| wp tw x0.5 toward | -719 | +335 | -2,264 | -614 / +335 | 3.12 / 2.56 | REJECT |
| wp how x0.25 toward | -1,268 | +469 | -385 | -1,263 / +678 | 3.12 / 2.56 | REJECT |

<details><summary>Full table (H1 / H2 / 2021-25 for every variant)</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (live LIT, eval size) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| wp how skip toward | H1 (pick) | 2.89 | 23.0 | 4.23 | +35,686 | 5,855 | -2,390 | 2,749 | -194 | 36.7/3.1 | 60.2/9.4 | 83.7 | 10.0 |
|  | H2 (check) | 2.37 | 37.8 | 2.75 | +11,232 | 3,024 | -2,157 | 1,262 | -280 | 32.1/0.0 | 53.8/0.0 | 97.2 | 16.5 |
|  | 2021-25 (ref) | 2.19 | 18.3 | 0.98 | -1,466 | -29 | -18,613 | 921 | -210 | 8.3/9.0 | 15.9/21.4 | 30.8 | 17.0 |
| wp how x0.5 toward | H1 (pick) | 3.12 | 22.5 | 4.06 | +32,546 | 5,340 | -2,380 | 2,398 | -171 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.64 | +10,800 | 2,908 | -2,157 | 1,241 | -253 | 32.1/0.0 | 50.0/0.0 | 97.1 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.94 | -5,016 | -98 | -19,878 | 862 | -194 | 8.3/8.1 | 15.3/20.7 | 30.2 | 17.0 |
| wp tw skip toward | H1 (pick) | 2.81 | 23.6 | 4.36 | +36,015 | 5,909 | -2,359 | 2,749 | -195 | 36.7/3.1 | 61.7/9.4 | 84.6 | 10.0 |
|  | H2 (check) | 2.37 | 37.8 | 2.83 | +11,234 | 3,025 | -2,157 | 1,241 | -267 | 32.1/0.0 | 53.8/0.0 | 95.8 | 15.5 |
|  | 2021-25 (ref) | 2.15 | 18.6 | 1.02 | +2,024 | 40 | -18,217 | 992 | -221 | 8.4/8.2 | 16.0/19.7 | 30.9 | 16.0 |
| wp tw x0.5 toward | H1 (pick) | 3.12 | 22.5 | 4.08 | +32,586 | 5,346 | -2,380 | 2,398 | -171 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.64 | +10,800 | 2,908 | -2,157 | 1,241 | -253 | 32.1/0.0 | 50.0/0.0 | 95.8 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.96 | -3,694 | -72 | -17,969 | 893 | -197 | 8.3/7.4 | 15.4/19.8 | 30.3 | 16.5 |
| wp how x0.25 toward | H1 (pick) | 3.12 | 22.5 | 4.04 | +32,037 | 5,256 | -2,380 | 2,364 | -170 | 37.5/3.1 | 60.2/6.2 | 91.3 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.7 | +10,934 | 2,944 | -2,157 | 1,241 | -248 | 32.1/0.0 | 51.3/0.0 | 97.1 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,815 | -36 | -19,587 | 896 | -194 | 8.3/8.1 | 15.7/20.6 | 30.4 | 16.0 |

</details>

**Verdict: REJECT** (the skip versions pass the letter of the rule on the eval path, but not on a closer look).

**Why, in plain words.**
- **On the eval path the skip looks good:** "tw skip" makes H1 +$2.7k, H2 +$0.8k and 2021-25 +$3.5k, at 2.81 / 2.37 trades a
  week.
- **At a fixed size H1 loses $2.1k:**
  - The "tw" skip removes 8 trades in H1 (6 with the "how" window), together +$1.3k at eval size. One of them is the +$2.4k
    target of 22 January.
  - The H1 "gain" comes from one later trade, 26 May. In the baseline the 60% room cap allowed only 1 micro that day (+$479).
    In the variant the eval path was in a different place, the trade got 11 micros, and it made +$5,265.
  - That is luck of where the eval happened to be, not the rule.
- **H2 is a real but tiny gain:** it skips 3 losers (+$0.8k).
- **It weakens the eval in H1:** the pass rate falls from 92.3% to 84.6% and 1-month fails rise from 6.2% to 9.4%.
- **The size-down versions (0.5x, 0.25x)** cost money in H1 and add only $0.3-0.5k in H2.
- **The point:** Thursday/Friday LIT trades toward a "made" weekly extreme are not reliably worse. On 22 January the extreme
  was not the week's last word.

## 4. Asia range gate

**The idea.** Measure the Asia range (18:00-24:00 ET) against the daily ATR(14). Compare it with the same measure on the last 20
days. When today's is below the 20th percentile (a "too quiet" Asia) or above the 80th (a "too wild" one), skip the day's LIT
trades or trade them at 0.5x. Also tested with the 10th / 90th percentiles. This is known at midnight, two hours before the
first LIT entry.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 vs baseline | Fixed size H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---|
| asia lo skip | -10,098 | -3,365 | +2,108 | -7,549 / -332 | 2.38 / 1.92 | REJECT |
| asia lo x0.5 | -3,918 | +22 | +1,436 | -3,319 / -133 | 3.12 / 2.56 | REJECT |
| asia hi skip | +826 | -6,676 | +6,866 | -16 / -7,068 | 2.46 / 2.12 | REJECT |
| asia hi x0.5 | -4,633 | -3,291 | +5,767 | +793 / -3,750 | 3.12 / 2.56 | REJECT |
| asia both skip | -9,336 | -9,242 | +9,444 | -7,565 / -7,400 | 1.72 / 1.47 | REJECT |
| asia both x0.5 | -7,358 | -3,835 | +6,484 | -2,526 / -3,884 | 3.12 / 2.56 | REJECT |
| asia both x0.5 p10/p90 | -2,475 | -2,442 | +4,956 | -2,257 / -2,597 | 3.12 / 2.56 | REJECT |

<details><summary>Full table (H1 / H2 / 2021-25 for every variant)</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (live LIT, eval size) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| asia lo skip | H1 (pick) | 2.38 | 23.0 | 3.6 | +23,207 | 3,807 | -2,376 | 2,295 | -190 | 26.6/3.1 | 46.1/4.7 | 92.7 | 12.0 |
|  | H2 (check) | 1.92 | 36.7 | 2.61 | +7,100 | 1,912 | -1,978 | 1,047 | -233 | 28.2/0.0 | 43.6/0.0 | 100.0 | 22.0 |
|  | 2021-25 (ref) | 1.81 | 18.3 | 1.01 | +678 | 13 | -16,261 | 945 | -210 | 6.7/5.7 | 14.4/12.3 | 35.1 | 17.0 |
| asia lo x0.5 | H1 (pick) | 3.12 | 22.5 | 3.94 | +29,387 | 4,821 | -2,376 | 2,189 | -161 | 33.6/3.1 | 63.3/5.5 | 93.4 | 12.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.74 | +10,487 | 2,823 | -2,187 | 1,180 | -232 | 29.5/0.0 | 47.4/0.0 | 96.0 | 19.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.0 | +6 | 0 | -14,851 | 888 | -188 | 6.1/6.1 | 13.7/15.6 | 32.0 | 20.0 |
| asia hi skip | H1 (pick) | 2.46 | 25.4 | 4.75 | +34,131 | 5,600 | -2,017 | 2,702 | -194 | 37.5/3.9 | 62.5/5.5 | 92.5 | 11.0 |
|  | H2 (check) | 2.12 | 33.3 | 1.56 | +3,789 | 1,020 | -2,119 | 955 | -305 | 3.8/0.0 | 24.4/0.0 | 88.6 | 19.0 |
|  | 2021-25 (ref) | 1.92 | 16.8 | 1.08 | +5,436 | 106 | -15,816 | 1,037 | -193 | 8.9/7.1 | 15.9/16.4 | 38.0 | 21.0 |
| asia hi x0.5 | H1 (pick) | 3.12 | 22.5 | 3.97 | +28,672 | 4,704 | -2,463 | 2,130 | -156 | 39.1/0.0 | 62.5/3.1 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.08 | +7,174 | 1,931 | -2,185 | 989 | -257 | 14.1/0.0 | 41.0/0.0 | 67.6 | 17.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.05 | +4,337 | 85 | -19,553 | 936 | -188 | 8.3/7.6 | 14.6/18.8 | 31.6 | 18.0 |
| asia both skip | H1 (pick) | 1.72 | 27.3 | 4.23 | +23,969 | 3,932 | -2,014 | 2,617 | -232 | 26.6/3.9 | 48.4/3.9 | 95.4 | 16.0 |
|  | H2 (check) | 1.47 | 34.8 | 1.26 | +1,223 | 329 | -1,718 | 742 | -314 | 0.0/0.0 | 11.5/0.0 | 100.0 | 28.0 |
|  | 2021-25 (ref) | 1.34 | 17.7 | 1.18 | +8,014 | 157 | -12,420 | 1,049 | -192 | 6.7/4.7 | 13.5/10.5 | 46.7 | 23.0 |
| asia both x0.5 | H1 (pick) | 3.12 | 22.5 | 3.85 | +25,947 | 4,257 | -2,336 | 1,947 | -147 | 35.2/0.0 | 67.2/1.6 | 95.4 | 12.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.16 | +6,630 | 1,785 | -2,162 | 883 | -221 | 12.8/0.0 | 32.1/0.0 | 97.0 | 23.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.07 | +5,054 | 99 | -16,792 | 846 | -167 | 5.6/5.5 | 12.2/14.1 | 33.2 | 21.0 |
| asia both x0.5 p10/p90 | H1 (pick) | 3.12 | 22.5 | 4.15 | +30,830 | 5,058 | -2,336 | 2,257 | -158 | 33.6/3.1 | 65.6/5.5 | 93.5 | 12.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.3 | +8,023 | 2,160 | -2,187 | 1,014 | -237 | 19.2/0.0 | 38.5/0.0 | 95.6 | 22.0 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 1.05 | +3,526 | 69 | -17,734 | 914 | -185 | 7.0/5.9 | 13.4/15.5 | 33.1 | 20.0 |

</details>

**Verdict: REJECT.**

**Why, in plain words.**
- **Every variant loses money in at least one half, and most lose in both.**
- **Skipping the wild-Asia days is the worst:** it removes H2's best days (H2 -$6.7k, 2-week pass 29.5% -> 3.8%). A big Asia
  range leaves big liquidity pools for London to sweep, which is what LIT trades.
- **Skipping the quiet-Asia days** drops H1 by $10k and H2 by $3.4k, and H2 falls to 1.9 trades a week.
- **2021-25 likes every Asia gate (+$1.4k to +$9.4k),** mostly because it trades less in a period where LIT has no edge. That
  is the opposite of 2026 and is only a reference line.

## 5. Event days

**The idea.** Monthly OPEX Fridays (the third Friday), the last session of each month, the last session of each quarter, and OPEX
+ month-end together: skip the day or trade it at 0.5x. **Big-tech earnings mornings (NVDA / AAPL / MSFT / AMZN / META /
GOOGL) could not be tested:** `data/news/events.csv` only holds macro releases (FOMC, CPI, PPI, NFP, claims, ISM...), with no
earnings dates. That part is skipped until a futures-safe earnings calendar is added to `data/news/`.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 vs baseline | Fixed size H1 / H2 | Trades/wk H1 / H2 | Verdict |
|---|---:|---:|---:|---:|---:|---|
| ev opex skip | -6,944 | +2 | -1,715 | -6,942 / +2 | 2.93 / 2.5 | REJECT |
| ev opex x0.5 | -3,759 | +0 | -1,793 | -3,586 / +0 | 3.12 / 2.56 | REJECT |
| ev month-end skip | +641 | -191 | +2,282 | +615 / -192 | 2.97 / 2.5 | REJECT |
| ev month-end x0.5 | +124 | +0 | -4,462 | +225 / +0 | 3.12 / 2.56 | NEUTRAL |
| ev quarter-end skip | +163 | -191 | -4,006 | +163 / -192 | 3.09 / 2.5 | NEUTRAL |
| ev quarter-end x0.5 | +0 | +0 | -997 | +0 / +0 | 3.12 / 2.56 | NEUTRAL |
| ev opex+month-end skip | -6,302 | -189 | +2,638 | -6,326 / -190 | 2.77 / 2.44 | REJECT |
| ev opex+month-end x0.5 | -3,635 | +0 | -4,666 | -3,361 / +0 | 3.12 / 2.56 | REJECT |

<details><summary>Full table (H1 / H2 / 2021-25 for every variant)</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (live LIT, eval size) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| ev opex skip | H1 (pick) | 2.93 | 21.3 | 3.46 | +26,361 | 4,325 | -2,511 | 2,317 | -182 | 29.7/2.3 | 43.8/5.5 | 92.2 | 14.0 |
|  | H2 (check) | 2.5 | 35.9 | 2.52 | +10,467 | 2,818 | -2,157 | 1,241 | -276 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.27 | 16.9 | 0.96 | -3,145 | -62 | -20,299 | 967 | -204 | 9.1/7.9 | 16.1/20.8 | 28.4 | 14.0 |
| ev opex x0.5 | H1 (pick) | 3.12 | 22.5 | 3.67 | +29,546 | 4,847 | -2,513 | 2,256 | -178 | 34.4/2.3 | 58.6/5.5 | 92.2 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.96 | -3,223 | -63 | -18,621 | 895 | -197 | 8.8/7.9 | 15.8/20.9 | 28.1 | 15.0 |
| ev month-end skip | H1 (pick) | 2.97 | 23.7 | 4.26 | +33,946 | 5,569 | -2,376 | 2,465 | -180 | 39.1/3.1 | 60.2/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.5 | 33.3 | 2.49 | +10,274 | 2,766 | -2,157 | 1,322 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.25 | 17.4 | 1.01 | +852 | 17 | -18,091 | 931 | -194 | 8.5/7.1 | 14.8/19.6 | 30.2 | 16.0 |
| ev month-end x0.5 | H1 (pick) | 3.12 | 22.5 | 4.05 | +33,429 | 5,484 | -2,513 | 2,465 | -177 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.93 | -5,892 | -115 | -17,376 | 901 | -205 | 8.4/7.4 | 15.0/20.5 | 30.7 | 17.5 |
| ev quarter-end skip | H1 (pick) | 3.09 | 22.8 | 4.07 | +33,468 | 5,491 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.5 | 33.3 | 2.49 | +10,274 | 2,766 | -2,157 | 1,322 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.33 | 17.6 | 0.93 | -5,436 | -106 | -15,898 | 882 | -202 | 8.6/8.1 | 15.2/20.4 | 30.8 | 17.0 |
| ev quarter-end x0.5 | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,427 | -48 | -17,624 | 948 | -206 | 8.6/8.1 | 15.2/20.9 | 30.8 | 17.0 |
| ev opex+month-end skip | H1 (pick) | 2.77 | 22.5 | 3.68 | +27,003 | 4,430 | -2,283 | 2,317 | -183 | 31.2/2.3 | 43.8/5.5 | 92.2 | 13.0 |
|  | H2 (check) | 2.44 | 34.2 | 2.49 | +10,276 | 2,767 | -2,157 | 1,322 | -276 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.14 | 16.8 | 1.02 | +1,208 | 24 | -18,954 | 1,020 | -203 | 8.9/6.9 | 15.4/19.5 | 28.5 | 14.0 |
| ev opex+month-end x0.5 | H1 (pick) | 3.12 | 22.5 | 3.71 | +29,670 | 4,868 | -2,513 | 2,256 | -176 | 34.4/2.3 | 58.6/5.5 | 92.2 | 11.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.93 | -6,096 | -119 | -19,191 | 865 | -197 | 8.4/7.2 | 15.2/20.8 | 28.1 | 15.0 |

</details>

**Verdict: REJECT** (OPEX, OPEX + month-end), **NEUTRAL** (quarter-end, month-end x0.5: a few hundred dollars, 1-5 trades).

**Why, in plain words.**
- **OPEX Fridays are good LIT days in 2026:** skipping them loses $6.9k in H1, and H2 is unchanged (+$2).
- **Month-end and quarter-end touch only 1-5 trades a half.** The differences are within a few hundred dollars and flip sign
  between the halves. Month-end skip is +$641 in H1 and -$191 in H2. That is noise.

## What this means for the bot
- **No change to `engine/lit.py`, `engine/lit_live.py` or `engine/sizing.py`.** The live rules stay as they are.
- **Re-check later:** VIX >= 20 x1.5 (or the safer 22 x1.5), once a nervous stretch (VIX >= 20 for several weeks) gives an
  out-of-sample half to check it on. Until then it is a backtest on the same months that showed LIT likes high VIX.
- **Add earnings dates** to `data/news/` if the owner wants the earnings-morning test run. It is the one idea of this group that
  was not tested.
- Reproduce: `python tools/lit_t_bias.py check` (baseline == live, exact), `grid` (all 39 variants ->
  `research/lit/t_bias_results.json`), `flat` (the fixed-size column), `save` (runs `lit_u_bias_*`). Paper research only.
