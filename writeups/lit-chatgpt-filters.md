## In one minute (owner summary)

- **I tested all 20 of ChatGPT's LIT filters (3 versions each) and its VXN / VIX9D target idea: 66 tests. None makes clearly
  more money. Keep LIT as it is.**
- Live LIT for comparison (2026, costs in): 120 trades, 2.91 a week, PF 4.07, **+$43,394 (~$4,420 a month)**. H1 (Jan-Jun,
  where a rule is picked) +$33,901. **H2 (Jul-Oct, the check) +$9,493 (~$2,550 a month)**. Eval path (two_week): 2-week
  pass / fail 57.1 / 5.9 % (H1) and 52.2 / 0.0 % (H2).
- **Two versions pass the rule on paper, and both are no-ops.** "At most 1 earlier touch of the level" (L09 P) makes **+$144**
  in H1 and **$0** in H2 by changing 2 trades. "Stop at most 4x the sweep's depth" (L19 A2) makes **+$4** by changing 1
  trade. A random-skip placebo does as well 28-38% of the time. Not worth a switch.
- **The most tempting one is a trap:** "the sweep must come within 30 minutes of the inducement" (L08 P). It makes +$956 in H1
  and +$1,100 in H2 with a higher PF (5.36). But it drops 44 trades and **loses 4 of the 23 big runners** (MFE 4R+). It falls
  to 2.09 trades a week (only 67% of weeks with 2+, live 86%) and **lowers the H2 2-week eval pass from 52.2% to 47.8%**.
  Its 15-minute version loses $8k in H1. Measured on 5m bars over 2021-25 it **loses $7.4k**. Not adopted.
- **Most filters cut the winners.** LIT makes its money on a few far VIX-band runners. Demanding a "cleaner" setup (a bigger
  displacement body, a close near the high, a fast reclaim, a short CISD run, waiting for confirmation closes) removes those
  runners as often as the losers. The result is **-$5k to -$35k in 2026**.
- **Five filters barely fit LIT's timing.** LIT's displacement and CISD are 5-minute bars, so they come a median 70 minutes (displacement) and 86 minutes (CISD) after
  the 1-minute sweep bar. L04 and L05 ("within 1-5 one-minute bars / 5-15 minutes"), L13
  ("close beyond the last 2-5 one-minute bars") and L14 ("clear the last 5m swing high") almost never hold, so they **stop
  nearly every trade**. L12 is similar.
- **VXN / VIX9D instead of VIX for the target: no.** Every version moves a half by between -$3.2k and +$1.2k, which is the same
  size as simply making the VIX band 10% wider or narrower (control lines). VIX9D x1.1 is the best in H1 (+$1,249), but it
  loses $422 in H2. VXN x1.0 is -$753 in H1 and +$621 in H2. The VXN band was already rejected once (`lit-experiments.md`).

## How it was tested

- **The rules are ChatGPT's, as written** (`research/writeups/specs/chatgpt-2026-10-24-ideas.md`). For each filter I ran
  the primary threshold (P) and its two alternatives (A1, A2), and nothing else (no grid). Every rule removes a live LIT
  setup before the executor (`skip_keys`), and the day stays free for a later setup. Stop, target and size stay the live
  ones. Code: `tools/lit_gpt_filters.py`. Results: `research/lit/gpt_filters.json`. Runs: `lit_gpt_*`.
- **Shared terms** (long side; shorts are mirrored):
  - L = the nearest swept level.
  - s = the first 1m bar that trades through L.
  - I = the most recent inducement the live rule counts.
  - b = LIT's own displacement bar (5m, biggest body / ATR).
  - A = Wilder ATR(14) of the 5m bars, frozen at the bar before the sweep.
  - Anything that cannot be measured (no 1m bars, zero range, no pivot) = UNKNOWN = no change. In 2021-25 there are no 1m
    bars, so the 1m filters do nothing there.
- **My choices, fixed before any result:**
  - L09 "touch" = a 5m low within 0.1 A of L. The approach that runs into the sweep is not counted.
  - L10 counts distinct levels (more than 1 tick apart) that were untaken before s and that the 1m bar s trades through.
  - L12 overlap = shared range / the smaller of the two ranges.
  - L15 counts the bars from the CISD run's first bar to the CISD close, both included.
- **L16-L20 (while the entry waits).** LIT's 5m CISD limit is virtual (`research/lit/order_trace.md`): nothing sits at the
  broker until the 1m CISD decides a market entry. So "cancel the pending entry" means skip the setup when the rule fires
  on a 1m bar that closed before the 1m CISD decision bar. Each setup's own wait window decides this, and the run repeats
  until no new trade is flagged (3-5 rounds), which is exact. L16 is mapped the same way: the setup is kept only if N 1m
  closes above the CISD level come before the limit is touched.
- **Candidate** = H1 $ better AND H2 $ not worse AND tail retention >= 90% AND >= 2 trades a week. Tail retention = how
  many of the live 2026 trades that ran 4R+ in their favour (MFE >= 4R) are still taken. Live LIT has 23 of them (30 at 3R+,
  16 at 5R+).
- **Placebo:** for each candidate, and for the best H1 non-candidates, the same number of trades per half was removed at
  random 200 times.
- **Look-ahead check:** every 5m bar after the trigger and every 1m bar from the trigger's close onward was overwritten with
  noise, and each feature had to come out the same. For L16-L20 the 1m bars from the 1m CISD decision bar onward were
  overwritten. Result: 0 changes in 10,552 checks. Planted leaks (reading the next 5m or 1m bar, or the decision bar) were
  caught 100% of the time.
- **Number of tests:** 66 counted (60 filters + 6 V3/V4). 2 more are controls (VIX x0.9 / x1.1). By chance alone, about 3
  of 66 would pass a 5% test.
- **Data:** TradingView CME NQ1! 5m + 1m (2026). VIX from `data/VIX_1d.csv` (CBOE). VXN and VIX9D are CBOE's own History
  files (`cdn.cboe.com/api/global/us_indices/daily_prices/`), downloaded 2026-10-24 and stored in `research/lit/gpt_cboe/`.
  They match `data/VXN_1d.csv` and `data/CBOE_vol_1d.csv` on every overlapping day. The download also fills in VIX9D after
  2026-09-17. The band uses the prior-day close only, the same as the VIX band.

## What each idea did (plain words)

| rule (ChatGPT rank) | idea | result | overlap with earlier tests |
|---|---|---|---|
| L07 (1) | inducement well above the level (I - L >= 0.25 / 0.125 / 0.5 ATR) | -$18k to -$35k in H1. The best runners often have a tight inducement | `lit-report-tests.md` inducement room |
| L06 (2) | prominent inducement swing | no change at all: every live inducement already clears 0.5 ATR (median 1.37) | - |
| L13 (3) | displacement closes beyond the last 2-5 one-minute highs before the sweep | stops 95-104 of 120 trades | `lit-report-tests.md` displacement quality |
| L03 (4) | prompt reclaim of the level (within 1-3 one-minute bars) | -$7k to -$16k in H1, -$4k to -$5k in H2, tail 61-70% | `lit-report-tests.md` reclaim |
| L04 (5) | displacement within 1-5 one-minute bars of the sweep | not reachable with a 5m displacement bar: 0 trades in H2 | - |
| L14 (6) | CISD close clears the last 5m swing high | almost never (median -174 ticks): 0.3 trades a week | - |
| L05 (7) | CISD within 5-15 minutes of the sweep | not reachable (median 86 minutes): 0.1 trades a week | `lit-report-tests.md` confirmation deadline |
| L01 / L02 (8 / 9) | efficient displacement body / close near the high | -$7.6k to -$29k in H1, worse in H2 | `lit-report-tests.md` top-quarter close |
| L15 (10) | short CISD run (<= 3 / 6 / 12 bars) | -$10k to -$23k in H1 | - |
| L19 (11) | stop not too big next to the sweep's depth (<= 2 / 3 / 4x) | 3x: -$1.3k H1; 2x: -$13k H1; 4x: +$4 (1 trade) | stop-size studies |
| L08 (12) | sweep soon after the inducement (<= 15 / 30 / 60 min) | 30 min +$956 / +$1,100 but tail 82.6%, 2.09 / wk, eval worse, 2021-25 (5m) -$7.4k. 15 min -$8k H1. 60 min -$236 / +$3,262 | `hq-lit.md` fresh-inducement size-up, `lit-adv-continuation.md` inducement speed |
| L09 (13) | few earlier touches of the level | P: +$144 / $0 (2 trades). A1: +$307 / -$1,105. A2: no change | - |
| L11 / L12 (14 / 15) | clean, efficient approach into the sweep | -$4.5k to -$32k in H1 | - |
| L10 (16) | isolated raid (few other levels hit by the sweep bar) | P: $0 in H1, +$4.9k in H2 (2 trades). Nothing to pick on in H1. A1 -$2.5k H1 | `lit-report-tests.md` 2+ levels swept |
| L16 (17) | wait for 1-3 one-minute closes above the CISD before arming | -$1k to -$16k in H1, tail 48-78% | `lit-entry-precision.md` slower confirmations |
| L17 (18) | cancel on a big adverse 1m candle while waiting | -$3.9k to -$22k in H1 | - |
| L18 (19) | cancel 10-20 minutes after the CISD | -$16k to -$21k in H1: many runners fill after 15 min (median wait 11 min, 90th pct 27) | `lit-entry-precision.md` |
| L20 (20) | cancel after 1-3 closes beyond an opposite 1m CISD | -$26k to -$32k in H1: the pullback into the limit usually looks like that | - |
| V3 | target band from VXN (x1.0 / 0.9 / 1.1) | -$236 to -$1,613 in H1, +$621 to +$861 in H2; H2 2-week eval pass 52.2 -> 43.5 | `lit-experiments.md` VXN band |
| V4 | target band from VIX9D (x1.0 / 0.9 / 1.1) | x1.1 +$1,249 H1 / -$422 H2; x1.0 -$458 / -$1,421; x0.9 -$1,059 / -$3,232 | - |

## Placebo of the two that pass and of the best H1 lines

| variant | trades removed H1 / H2 | random skips of that many: mean $ H1 / H2 | share of placebos at least as good (H1 / H2 / both) | read |
|---|---|---|---|---|
| L09 P | 2 / 0 | -$847 / $0 | 0.28 / 1.00 / 0.28 | chance-sized |
| L19 A2 | 1 / 0 | -$467 / $0 | 0.38 / 1.00 / 0.38 | chance-sized |
| L08 P | 29 / 15 | -$11,826 / -$2,811 | 0.025 / 0.125 / 0.005 | better than random skipping. But it fails the tail rule, its neighbours fail, bootstrap p 0.38 / 0.46, and it reverses on 2021-25 |
| L09 A1 | 5 / 1 | -$2,023 / -$308 | 0.245 / 0.81 / 0.195 | noise |
| V4 x1.1 | (target change, not a skip) | - | - | a skip placebo does not apply. It is the same size as the VIX x0.9 / 1.1 controls |

After 66 tests, the L08 P placebo score (0.005) is not significant (Bonferroni 0.05 / 66 = 0.0008). Any filter that keeps
the money beats random skipping, because skipping LIT trades at random always costs money.

## Exact JSON of the two paper candidates (not recommended)

Neither has an engine option, because both were run through `skip_keys` in `tools/lit_gpt_filters.py`. Here they are as
research specs:

```json
{"gpt_filter": {"rule": "L09", "var": "P", "touch_tol_atr": 0.1, "reset_bars": 1, "max_prior_episodes": 1}}
{"gpt_filter": {"rule": "L19", "var": "A2", "max_stop_over_penetration": 4.0}}
```

## Verdict

- **Nothing to switch on.** The two lines that pass the rule change 1-2 trades for $4-$144. The only filter with real money
  in both halves (L08 P, +$2.1k) cuts the big winners and the eval odds, and it reverses on 5 years of 5m data.
- LIT's edge is the far VIX-band runner. Filters that ask for a prettier sweep, a faster reaction or a cleaner approach
  remove those runners about as often as the losers.
- The VXN / VIX9D band is no better than the VIX band. It is noise around the same target. VIX stays.
- Paper only. No engine file and no `live_model*.json` was changed.

## Full table (ranked: candidates first, then by H1 gain with an H2 loss counted against it)

$ = LIT size rule, costs in. Eval = two_week path, 2-week pass / fail %. Tail = % of the live 2026 trades with MFE >= 3R /
4R / 5R that are still taken.

| # | variant | 2026 /wk | win % | PF | net $ | $/mo | H1 $ (PF) | H2 $ (PF) | dH1 / dH2 | eval 2-wk pass/fail H1 · H2 | tail 3R/4R/5R % | 2021-25 $ (PF) | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| - | **live LIT (lit_live)** | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | - | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +1,265 (1.01) | reference |
| 1 | L09 P (N 1, k 1): prior touches of the level (episodes, reset after N quiet bars) <= k | 2.89 | 55.5 | 4.11 | +43,539 | 4,438 | +34,045 (5.07) | +9,493 (2.69) | +144 / +0 | 57.1/4.2 · 52.2/0.0 | 100/100/100 | +5,634 (1.06) | passes the rule, 2 trade(s) changed; placebo p 0.28: noise |
| 2 | L19 A2 (k 4): stop / sweep penetration beyond the level <= k | 2.91 | 55.0 | 4.07 | +43,399 | 4,424 | +33,905 (4.98) | +9,493 (2.69) | +4 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | -831 (0.99) | passes the rule, 1 trade(s) changed; placebo p 0.38: noise |
| 3 | L08 P (k 30): inducement recency: sweep within k minutes of the inducement being known | 2.09 | 55.8 | 5.36 | +45,449 | 4,633 | +34,857 (6.37) | +10,593 (3.7) | +956 / +1,100 | 55.5/0.0 · 47.8/0.0 | 80/82.6/81.2 | +1,918 (1.02) | tail < 90% |
| 4 | V4_k11: band from VIX9D x 1.1 | 2.91 | 55.8 | 4.22 | +44,221 | 4,508 | +35,150 (5.12) | +9,071 (2.74) | +1,249 / -422 | 63.9/6.7 · 52.2/0.0 | 100/100/100 | +1,954 (1.02) | H2 worse |
| 5 | L10 P (k 1): isolated raid: extra known levels crossed by the 1m sweep bar <= k | 2.89 | 56.3 | 4.57 | +48,332 | 4,927 | +33,901 (4.98) | +14,431 (3.88) | +0 / +4,938 | 57.1/5.9 · 68.1/0.0 | 100/100/100 | +1,265 (1.01) | H1 not better |
| 6 | L06 P (k 0.25): inducement prominence / ATR | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | +0 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +1,265 (1.01) | H1 not better |
| 7 | L06 A1 (k 0.125): inducement prominence / ATR | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | +0 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +1,265 (1.01) | H1 not better |
| 8 | L06 A2 (k 0.5): inducement prominence / ATR | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | +0 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +1,265 (1.01) | H1 not better |
| 9 | L09 A2 (N 3, k 2): prior touches of the level (episodes, reset after N quiet bars) <= k | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | +0 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +2,728 (1.03) | H1 not better |
| 10 | L10 A2 (k 2): isolated raid: extra known levels crossed by the 1m sweep bar <= k | 2.91 | 55.0 | 4.07 | +43,394 | 4,424 | +33,901 (4.98) | +9,493 (2.69) | +0 / +0 | 57.1/5.9 · 52.2/0.0 | 100/100/100 | +1,265 (1.01) | H1 not better |
| 11 | L08 A2 (k 60): inducement recency: sweep within k minutes of the inducement being known | 2.72 | 54.5 | 4.27 | +46,420 | 4,732 | +33,665 (4.85) | +12,755 (3.34) | -236 / +3,262 | 57.1/3.4 · 66.7/0.0 | 96.7/95.7/93.8 | +1,265 (1.01) | H1 not better |
| 12 | V3_k11: band from VXN x 1.1 | 2.99 | 56.1 | 4.1 | +43,861 | 4,471 | +33,665 (4.95) | +10,196 (2.81) | -236 / +703 | 59.7/5.9 · 43.5/0.0 | 100/100/100 | +6,068 (1.06) | H1 not better |
| 13 | CTRL_vix_k11: band from VIX x 1.1 | 2.94 | 55.4 | 4.05 | +43,186 | 4,402 | +33,156 (4.89) | +10,030 (2.78) | -745 / +537 | 57.1/7.6 · 52.2/0.0 | 100/100/100 | +3,633 (1.04) | control (not counted) |
| 14 | V3_k10: band from VXN x 1.0 | 2.99 | 56.1 | 4.06 | +43,262 | 4,410 | +33,148 (4.89) | +10,114 (2.8) | -753 / +621 | 58.0/5.9 · 43.5/0.0 | 100/100/100 | +5,016 (1.05) | H1 not better |
| 15 | L09 A1 (N 2, k 0): prior touches of the level (episodes, reset after N quiet bars) <= k | 2.79 | 54.8 | 4.08 | +42,596 | 4,342 | +34,208 (5.17) | +8,388 (2.49) | +307 / -1,105 | 57.1/4.2 · 43.5/0.0 | 96.7/95.7/93.8 | +8,943 (1.1) | H2 worse |
| 16 | CTRL_vix_k09: band from VIX x 0.9 | 2.91 | 55.0 | 4.01 | +42,527 | 4,335 | +33,729 (4.96) | +8,798 (2.56) | -172 / -695 | 63.9/6.7 · 52.2/0.0 | 100/100/100 | -1,237 (0.99) | control (not counted) |
| 17 | L19 P (k 3): stop / sweep penetration beyond the level <= k | 2.84 | 54.7 | 3.95 | +42,200 | 4,302 | +32,579 (4.7) | +9,621 (2.75) | -1,322 / +128 | 56.3/5.9 · 52.2/0.0 | 96.7/95.7/100 | -627 (0.99) | H1 not better |
| 18 | V3_k09: band from VXN x 0.9 | 2.96 | 55.7 | 4.01 | +42,642 | 4,347 | +32,288 (4.79) | +10,354 (2.84) | -1,613 / +861 | 58.0/7.6 · 43.5/0.0 | 100/100/100 | +4,064 (1.04) | H1 not better |
| 19 | V4_k10: band from VIX9D x 1.0 | 2.86 | 55.1 | 4.02 | +41,516 | 4,232 | +33,443 (4.92) | +8,072 (2.55) | -458 / -1,421 | 63.9/5.9 · 52.2/0.0 | 100/100/100 | +2,271 (1.02) | H1 not better; H2 worse |
| 20 | L16 A1 (N 1): after the 5m CISD wait N 1m closes on the favourable side before arming | 2.09 | 55.8 | 4.87 | +41,109 | 4,191 | +32,951 (5.86) | +8,157 (3.12) | -950 / -1,336 | 58.0/0.0 · 47.8/4.3 | 76.7/78.3/75 | +1,542 (1.02) | H1 not better; H2 worse; tail < 90% |
| 21 | L10 A1 (k 0): isolated raid: extra known levels crossed by the 1m sweep bar <= k | 2.6 | 54.2 | 4.36 | +44,224 | 4,508 | +31,445 (5.06) | +12,779 (3.36) | -2,456 / +3,286 | 57.1/5.0 · 63.8/4.3 | 86.7/91.3/87.5 | +1,265 (1.01) | H1 not better |
| 22 | L17 A2 (k 0.8): cancel when a 1m adverse body / ATR > k while waiting | 2.57 | 53.8 | 4.03 | +39,347 | 4,011 | +29,981 (4.89) | +9,366 (2.77) | -3,920 / -127 | 55.5/4.2 · 53.6/0.0 | 80/87/81.2 | +1,542 (1.02) | H1 not better; H2 worse; tail < 90% |
| 23 | V4_k09: band from VIX9D x 0.9 | 2.82 | 54.3 | 3.88 | +39,104 | 3,986 | +32,842 (5.09) | +6,261 (2.13) | -1,059 / -3,232 | 63.0/5.9 · 42.0/0.0 | 100/100/100 | +1,483 (1.02) | H1 not better; H2 worse |
| 24 | L11 A1 (N 3, k 0.5): approach efficiency over N 1m closes before the sweep >= k | 2.35 | 55.7 | 4.23 | +38,147 | 3,889 | +29,390 (5.15) | +8,757 (2.85) | -4,511 / -736 | 52.1/2.5 · 42.0/0.0 | 83.3/87/87.5 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90% |
| 25 | L08 A1 (k 15): inducement recency: sweep within k minutes of the inducement being known | 1.46 | 60.0 | 7.23 | +36,648 | 3,736 | +25,951 (9.54) | +10,697 (4.77) | -7,950 / +1,204 | 39.5/0.0 · 49.3/0.0 | 56.7/56.5/50 | +1,641 (1.02) | H1 not better; tail < 90%; < 2/wk |
| 26 | L01 A1 (k 0.6): displacement body efficiency |C-O|/(H-L) of LIT's displacement bar | 2.82 | 53.4 | 3.41 | +34,279 | 3,494 | +26,343 (4.05) | +7,935 (2.41) | -7,558 / -1,558 | 49.6/3.4 · 50.7/7.2 | 86.7/87/87.5 | +1,500 (1.02) | H1 not better; H2 worse; tail < 90% |
| 27 | L17 P (k 0.6): cancel when a 1m adverse body / ATR > k while waiting | 2.33 | 52.1 | 3.58 | +33,539 | 3,419 | +24,902 (3.92) | +8,637 (2.92) | -8,999 / -856 | 55.5/5.0 · 44.9/0.0 | 66.7/73.9/75 | +1,918 (1.02) | H1 not better; H2 worse; tail < 90% |
| 28 | L15 A2 (k 12): CISD run age: 5m bars from run start to the CISD close <= k | 2.52 | 51.9 | 3.29 | +32,449 | 3,308 | +23,902 (3.86) | +8,547 (2.47) | -9,999 / -946 | 46.2/4.2 · 55.1/0.0 | 80/78.3/81.2 | +5,907 (1.07) | H1 not better; H2 worse; tail < 90% |
| 29 | L03 A2 (k 3): prompt reclaim: 1m close back through the level within k 1m bars of the sweep bar | 2.16 | 52.8 | 3.91 | +31,879 | 3,250 | +26,613 (4.91) | +5,266 (2.27) | -7,288 / -4,227 | 45.4/0.0 · 30.4/0.0 | 70/69.6/62.5 | +1,265 (1.01) | H1 not better; H2 worse; tail < 90% |
| 30 | L19 A1 (k 2): stop / sweep penetration beyond the level <= k | 2.57 | 53.8 | 3.46 | +31,009 | 3,161 | +20,783 (3.69) | +10,226 (3.09) | -13,118 / +733 | 48.7/2.5 · 52.2/0.0 | 83.3/82.6/81.2 | -10,603 (0.89) | H1 not better; tail < 90% |
| 31 | L16 P (N 2): after the 5m CISD wait N 1m closes on the favourable side before arming | 1.7 | 55.7 | 4.45 | +28,517 | 2,907 | +22,500 (5.09) | +6,018 (3.18) | -11,401 / -3,475 | 46.2/0.0 · 37.7/0.0 | 53.3/56.5/50 | +1,542 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 32 | L01 P (k 0.7): displacement body efficiency |C-O|/(H-L) of LIT's displacement bar | 2.55 | 53.3 | 3.02 | +27,542 | 2,808 | +21,405 (3.53) | +6,137 (2.19) | -12,496 / -3,356 | 42.9/0.0 · 42.0/0.0 | 73.3/69.6/68.8 | +9,063 (1.11) | H1 not better; H2 worse; tail < 90% |
| 33 | L03 P (k 2): prompt reclaim: 1m close back through the level within k 1m bars of the sweep bar | 2.06 | 49.4 | 3.32 | +26,677 | 2,720 | +21,410 (3.91) | +5,267 (2.28) | -12,491 / -4,226 | 39.5/0.0 · 30.4/0.0 | 63.3/65.2/56.2 | +1,265 (1.01) | H1 not better; H2 worse; tail < 90% |
| 34 | L02 A1 (k 0.75): displacement close location (C-L)/(H-L) | 2.69 | 54.1 | 2.96 | +25,986 | 2,649 | +19,808 (3.48) | +6,179 (2.17) | -14,093 / -3,314 | 49.6/0.0 · 50.7/0.0 | 80/73.9/68.8 | +6,577 (1.07) | H1 not better; H2 worse; tail < 90% |
| 35 | L18 A2 (k 20): cancel the waiting entry k minutes after the 5m CISD | 2.52 | 51.9 | 2.95 | +25,412 | 2,591 | +17,770 (3.14) | +7,642 (2.61) | -16,131 / -1,851 | 40.3/5.0 · 42.0/7.2 | 73.3/73.9/75 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90% |
| 36 | L07 A1 (k 0.125): inducement-to-level separation (I - L) / ATR | 2.21 | 54.9 | 3.14 | +24,381 | 2,485 | +15,844 (3.08) | +8,536 (3.26) | -18,057 / -957 | 36.1/0.0 · 55.1/0.0 | 70/73.9/75 | -6,101 (0.93) | H1 not better; H2 worse; tail < 90% |
| 37 | L02 P (k 0.85): displacement close location (C-L)/(H-L) | 2.33 | 52.1 | 3.0 | +23,856 | 2,432 | +20,473 (3.8) | +3,383 (1.73) | -13,428 / -6,110 | 43.7/0.0 · 30.4/0.0 | 60/52.2/56.2 | +2,898 (1.04) | H1 not better; H2 worse; tail < 90% |
| 38 | L16 A2 (N 3): after the 5m CISD wait N 1m closes on the favourable side before arming | 1.48 | 55.7 | 4.39 | +23,172 | 2,362 | +18,187 (4.89) | +4,986 (3.31) | -15,714 / -4,507 | 43.7/0.0 · 23.2/0.0 | 40/47.8/43.8 | +1,542 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 39 | L03 A1 (k 1): prompt reclaim: 1m close back through the level within k 1m bars of the sweep bar | 1.89 | 50.0 | 3.05 | +22,098 | 2,253 | +17,899 (3.54) | +4,199 (2.12) | -16,002 / -5,294 | 45.4/0.0 · 27.5/0.0 | 56.7/60.9/50 | +1,265 (1.01) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 40 | L18 P (k 15): cancel the waiting entry k minutes after the 5m CISD | 2.16 | 50.6 | 2.58 | +19,037 | 1,941 | +14,193 (2.82) | +4,844 (2.14) | -19,708 / -4,649 | 37.0/2.5 · 42.0/8.7 | 60/56.5/56.2 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90% |
| 41 | L15 P (k 6): CISD run age: 5m bars from run start to the CISD close <= k | 1.77 | 47.9 | 2.52 | +17,846 | 1,819 | +10,663 (2.61) | +7,183 (2.4) | -23,238 / -2,310 | 33.6/0.0 · 50.7/4.3 | 40/39.1/43.8 | -31 (1.0) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 42 | L18 A1 (k 10): cancel the waiting entry k minutes after the 5m CISD | 1.67 | 49.3 | 2.75 | +17,314 | 1,765 | +13,030 (3.21) | +4,284 (2.08) | -20,871 / -5,209 | 43.7/0.0 · 40.6/1.4 | 50/47.8/50 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 43 | L15 A1 (k 3): CISD run age: 5m bars from run start to the CISD close <= k | 0.78 | 53.1 | 4.25 | +16,765 | 1,709 | +13,936 (8.33) | +2,828 (1.87) | -19,965 / -6,665 | 36.1/0.0 · 31.9/0.0 | 23.3/26.1/31.2 | -3,975 (0.87) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 44 | L12 A2 (N 8, k 0.65): approach overlap of consecutive 1m ranges over N bars <= k | 1.26 | 48.1 | 3.16 | +15,941 | 1,625 | +14,107 (3.88) | +1,833 (1.74) | -19,794 / -7,660 | 39.5/0.0 · 31.9/0.0 | 33.3/39.1/37.5 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 45 | L07 P (k 0.25): inducement-to-level separation (I - L) / ATR | 1.8 | 54.1 | 2.6 | +14,485 | 1,477 | +5,208 (1.87) | +9,276 (4.01) | -28,693 / -217 | 31.9/0.0 · 55.1/0.0 | 50/52.2/50 | -351 (0.99) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 46 | L01 A2 (k 0.8): displacement body efficiency |C-O|/(H-L) of LIT's displacement bar | 1.8 | 48.6 | 2.37 | +14,148 | 1,442 | +14,704 (3.47) | -557 (0.87) | -19,197 / -10,050 | 35.3/0.0 · 0.0/0.0 | 40/39.1/37.5 | +12,709 (1.23) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 47 | L11 P (N 5, k 0.65): approach efficiency over N 1m closes before the sweep >= k | 1.58 | 50.8 | 2.48 | +12,486 | 1,273 | +9,650 (3.36) | +2,836 (1.65) | -24,251 / -6,657 | 31.9/0.0 · 36.2/0.0 | 43.3/39.1/31.2 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 48 | L17 A1 (k 0.4): cancel when a 1m adverse body / ATR > k while waiting | 1.53 | 50.8 | 2.52 | +12,196 | 1,243 | +11,507 (3.56) | +689 (1.19) | -22,394 / -8,804 | 42.9/0.0 · 23.2/0.0 | 40/43.5/31.2 | +1,918 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 49 | L11 A2 (N 8, k 0.8): approach efficiency over N 1m closes before the sweep >= k | 0.49 | 65.0 | 9.22 | +11,881 | 1,211 | +7,925 (6.48) | +3,956 (0) | -25,976 / -5,537 | 10.9/0.0 · 5.8/0.0 | 13.3/13/12.5 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 50 | L12 P (N 5, k 0.5): approach overlap of consecutive 1m ranges over N bars <= k | 0.49 | 70.0 | 7.93 | +10,818 | 1,103 | +8,127 (6.21) | +2,691 (0) | -25,774 / -6,802 | 19.3/0.0 · 30.4/0.0 | 20/21.7/12.5 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 51 | L20 A2 (N 3): cancel after N 1m closes beyond an opposite 1m CISD level | 1.84 | 46.1 | 1.88 | +9,826 | 1,002 | +7,685 (2.18) | +2,141 (1.46) | -26,216 / -7,352 | 37.0/0.0 · 30.4/1.4 | 46.7/47.8/50 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 52 | L13 A1 (N 2, k 0): displacement closes beyond the last N 1m bars' opposite extreme by >= k ticks | 0.87 | 52.8 | 2.57 | +8,429 | 859 | +6,266 (2.96) | +2,163 (2.0) | -27,635 / -7,330 | 16.8/0.0 · 14.5/0.0 | 16.7/13/12.5 | +1,918 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 53 | L02 A2 (k 0.95): displacement close location (C-L)/(H-L) | 1.26 | 53.8 | 2.16 | +8,112 | 827 | +4,712 (2.54) | +3,400 (1.87) | -29,189 / -6,093 | 10.9/0.0 · 42.0/0.0 | 16.7/8.7/6.2 | -484 (0.98) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 54 | L07 A2 (k 0.5): inducement-to-level separation (I - L) / ATR | 1.43 | 55.9 | 2.09 | +7,888 | 804 | -1,186 (0.73) | +9,074 (4.24) | -35,087 / -419 | 24.4/0.0 · 56.5/0.0 | 43.3/43.5/37.5 | +7,114 (1.18) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 55 | L13 P (N 3, k 1): displacement closes beyond the last N 1m bars' opposite extreme by >= k ticks | 0.8 | 48.5 | 2.26 | +6,757 | 689 | +4,594 (2.44) | +2,163 (2.0) | -29,307 / -7,330 | 8.4/0.0 · 14.5/0.0 | 13.3/8.7/12.5 | +1,918 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 56 | L20 P (N 2): cancel after N 1m closes beyond an opposite 1m CISD level | 1.67 | 44.9 | 1.6 | +6,239 | 636 | +4,097 (1.7) | +2,141 (1.46) | -29,804 / -7,352 | 33.6/0.0 · 30.4/1.4 | 43.3/43.5/43.8 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 57 | L20 A1 (N 1): cancel after N 1m closes beyond an opposite 1m CISD level | 1.46 | 45.0 | 1.34 | +3,021 | 308 | +2,320 (1.42) | +701 (1.2) | -31,581 / -8,792 | 29.4/0.0 · 31.9/0.0 | 36.7/34.8/31.2 | +1,642 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 58 | L12 A1 (N 3, k 0.35): approach overlap of consecutive 1m ranges over N bars <= k | 0.41 | 52.9 | 2.32 | +2,442 | 249 | +1,380 (1.76) | +1,062 (25.18) | -32,521 / -8,431 | 10.9/0.0 · 14.5/0.0 | 10/13/12.5 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 59 | L13 A2 (N 5, k 2): displacement closes beyond the last N 1m bars' opposite extreme by >= k ticks | 0.58 | 54.2 | 1.56 | +2,282 | 233 | -796 (0.72) | +3,078 (3.47) | -34,697 / -6,415 | 0.0/0.0 · 14.5/0.0 | 6.7/4.3/6.2 | +1,918 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 60 | L14 P (k 1): 5m CISD close clears the latest opposite 5m pivot by >= k ticks | 0.27 | 54.5 | 2.21 | +1,104 | 113 | +1,462 (3.64) | -358 (0.0) | -32,439 / -9,851 | 0.0/0.0 · 0.0/0.0 | 6.7/4.3/6.2 | +4,223 (1.42) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 61 | L14 A1 (k 0): 5m CISD close clears the latest opposite 5m pivot by >= k ticks | 0.27 | 54.5 | 2.21 | +1,104 | 113 | +1,462 (3.64) | -358 (0.0) | -32,439 / -9,851 | 0.0/0.0 · 0.0/0.0 | 6.7/4.3/6.2 | +4,237 (1.42) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 62 | L14 A2 (k 2): 5m CISD close clears the latest opposite 5m pivot by >= k ticks | 0.24 | 50.0 | 2.21 | +1,103 | 112 | +1,462 (3.64) | -359 (0.0) | -32,439 / -9,852 | 0.0/0.0 · 0.0/0.0 | 6.7/4.3/6.2 | +5,426 (1.61) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 63 | L04 P (k 3): prompt displacement: qualifying displacement closes within k 1m bars of the sweep bar | 0.05 | 50.0 | 0.02 | -354 | -36 | -354 (0.02) | +0 (0) | -34,255 / -9,493 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 64 | L04 A1 (k 1): prompt displacement: qualifying displacement closes within k 1m bars of the sweep bar | 0.05 | 50.0 | 0.02 | -354 | -36 | -354 (0.02) | +0 (0) | -34,255 / -9,493 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 65 | L04 A2 (k 5): prompt displacement: qualifying displacement closes within k 1m bars of the sweep bar | 0.05 | 50.0 | 0.02 | -354 | -36 | -354 (0.02) | +0 (0) | -34,255 / -9,493 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 66 | L05 A1 (k 5): prompt 5m CISD: CISD close within k minutes of the 1m sweep bar's close | 0.05 | 50.0 | 0.02 | -354 | -36 | -354 (0.02) | +0 (0) | -34,255 / -9,493 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 67 | L05 P (k 10): prompt 5m CISD: CISD close within k minutes of the 1m sweep bar's close | 0.15 | 33.3 | 0.01 | -1,063 | -108 | -934 (0.01) | -129 (0.0) | -34,835 / -9,622 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
| 68 | L05 A2 (k 15): prompt 5m CISD: CISD close within k minutes of the 1m sweep bar's close | 0.17 | 28.6 | 0.0 | -1,409 | -144 | -1,279 (0.0) | -129 (0.0) | -35,180 / -9,622 | 0.0/0.0 · 0.0/0.0 | 0/0/0 | +1,641 (1.02) | H1 not better; H2 worse; tail < 90%; < 2/wk |
