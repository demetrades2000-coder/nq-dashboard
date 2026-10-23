# LIT: target and exit ideas nobody had tested yet

**The question.** LIT's live trade aims at the **VIX band** (the 18:00 open plus or minus one day of expected move from the VIX)
and banks the profit at 8R. Are there better places to take profit, still inside LIT (liquidity, imbalances, inducement,
sessions)? Five ideas from the owner's list, plus one more found on the way.

**Short answer.** No new target beats the VIX band. One small exit rule helps both halves of 2026: **take the profit at 12:00 ET
if the trade is at least +0.5R**. It changes 7 trades of 2026 and adds about $2k. Everything else is rejected.

## How it was tested (plain words)
- **Data:** CME NQ1! futures from TradingView: 5-minute bars, plus true 1-minute bars for 2026. VIX daily closes. The 08:30 ET
  high-impact releases come from `data/news/events.csv`. Official CME data only (TradingView / NinjaTrader), no CFD.
- **The trades:** the live LIT setups (sweep, inducement, displacement, 5m CISD, limit, 1m CISD entry), the stop 1 tick beyond
  the sweep extreme, breakeven at 1R, flat at 15:55, the Monday rule and the weekly stop. Only the target or the exit changes.
- **Size:** the live eval sizing: $800 risk up to a 25-pt stop, then 800 x 25 / stop, half size after 2 stop-outs in a week,
  and never more than 60% of the room to the MFFU trailing max-loss floor. Costs in: $1.40 per micro, 1 tick slippage on market
  orders and on stop / breakeven / time exits.
- **The baseline** is the live strategy at that size (run `lit_tight_eval_800_25_room60`). The test wrapper
  (`tools/lit_t_targets.py`) reproduces it exactly: 120 trades in 2026 and the same 630 trades in all, trade for trade.
- **Judged on 2026 only** (owner's order). Each idea's settings are picked on **H1 = Jan 2 - Jun 30** and checked on
  **H2 = Jul 1 - Oct 16**. **ADOPT** means better in both halves at 2-4 trades a week. 2021-25 is only a reference line (no
  1-minute data there, so those years run on 5m bars).
- **Eval columns:** an MFFU Builder 50K eval ($3,000 target, $2,000 trailing max loss) started on every session: % passed / failed
  within 2 weeks (10 sessions) and 1 month (20 sessions), the pass rate (passed / decided) and the median sessions to a pass.
- Money columns are from the back-to-back eval path (a new eval after each pass or fail), as in the eval-sizing study. At this
  size the 2021-25 reference of the baseline is PF 0.98, -$1,430.

**Words used below**
- **R** = the trade's risk (entry to stop). +2R = a profit of twice the risk.
- **FVG (fair value gap):** three candles where the first and the third do not overlap; the hole between them is the gap. "Unfilled"
  = price has not traded back through it.
- **Order block (OB):** the last up-candle before a down-candle that closes below its low (mirror for longs' targets below).
- **Inducement:** a small swing just in front of a liquidity level that tempts early traders in before the level gets swept.

## 1. 1H / 4H fair value gap or order block as the target

**The idea.** Instead of the VIX band, aim at the nearest unfilled 1-hour or 4-hour FVG (the edge price reaches first) or the
nearest untouched 1H / 4H order block in the trade's direction, at least 1.5R away. Tested alone, as "the nearer of the VIX band
and the HTF level", and as "the HTF level if there is one, else the VIX band". Also the far edge and the middle of the gap. HTF
candles are built from the 5m file (1H on the clock, 4H from 18:00 ET) and count only once closed; gaps up to 5 days (1H) or
20 days (4H) old.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| 1H FVG edge only | -28,728 | -8,265 | +4,855 | worse in both |
| Nearer of VIX band / 1H FVG | -13,145 | -5,287 | +3,641 | worse in both |
| 1H FVG, else VIX band | -14,275 | -5,287 | +2,438 | worse in both |
| 4H FVG edge only | -26,762 | -4,308 | -13,115 | worse in both |
| Nearer of VIX band / 4H FVG | -2,075 | -2,606 | -5,914 | worse in both |
| 4H FVG, else VIX band | -1,701 | -2,329 | -3,505 | worse in both |
| 1H order block only | -22,536 | -7,962 | +9,830 | worse in both |
| Nearer of VIX band / 1H OB | -6,880 | -1,510 | -1,579 | worse in both |
| 1H OB, else VIX band | -6,883 | -1,430 | -718 | worse in both |
| 4H order block only | -34,156 | -3,404 | -10,458 | worse in both |
| Nearer of VIX band / 4H OB | -3,323 | +746 | -153 | one half only |
| 4H OB, else VIX band | -3,618 | +1,383 | +3,960 | one half only |
| Nearer of VIX band / 1H FVG far edge | -9,057 | -2,789 | +9,615 | worse in both |
| Nearer of VIX band / 4H FVG far edge | -3,806 | -2,525 | +2,189 | worse in both |
| Nearer of VIX band / 4H FVG middle | -4,722 | -2,599 | +4,344 | worse in both |
| Nearer of VIX band / 4H FVG / 4H OB | -3,374 | -875 | -7,116 | worse in both |
| Nearer of VIX band / any 1H-4H FVG or OB | -12,278 | -5,847 | -462 | worse in both |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| 1H FVG edge only | H1 (pick) | 2.34 | 23.3 | 1.54 | +4,577 | 751 | -2,453 | 938 | -186 | 16.4/0.0 | 37.5/5.5 | 64.9 | 13.0 |
|  | H2 (check) | 1.92 | 33.3 | 1.34 | +2,200 | 592 | -2,324 | 874 | -327 | 14.1/0.0 | 30.8/7.7 | 82.2 | 18.0 |
|  | 2021-25 (ref) | 1.31 | 23.8 | 1.06 | +3,425 | 67 | -12,597 | 845 | -248 | 3.1/5.8 | 8.2/14.8 | 30.9 | 25.0 |
| Nearer of VIX band / 1H FVG | H1 (pick) | 2.93 | 28.0 | 3.18 | +20,160 | 3,308 | -2,610 | 1,400 | -171 | 34.4/0.0 | 60.2/1.6 | 94.2 | 12.0 |
|  | H2 (check) | 2.24 | 34.3 | 1.75 | +5,178 | 1,394 | -1,936 | 1,008 | -301 | 26.9/0.0 | 52.6/0.0 | 90.2 | 15.0 |
|  | 2021-25 (ref) | 1.87 | 22.2 | 1.03 | +2,211 | 43 | -13,356 | 832 | -231 | 2.7/7.7 | 8.2/19.3 | 28.7 | 28.0 |
| 1H FVG, else VIX band | H1 (pick) | 2.97 | 26.3 | 3.06 | +19,030 | 3,122 | -2,610 | 1,414 | -165 | 34.4/0.0 | 59.4/1.6 | 94.2 | 12.0 |
|  | H2 (check) | 2.24 | 34.3 | 1.75 | +5,178 | 1,394 | -1,936 | 1,008 | -301 | 26.9/0.0 | 52.6/0.0 | 90.2 | 15.0 |
|  | 2021-25 (ref) | 1.88 | 22.3 | 1.01 | +1,008 | 20 | -15,848 | 820 | -232 | 3.1/7.7 | 8.4/19.0 | 28.0 | 27.5 |
| 4H FVG edge only | H1 (pick) | 2.3 | 18.6 | 1.68 | +6,543 | 1,073 | -3,704 | 1,474 | -201 | 15.6/3.9 | 34.4/7.8 | 56.2 | 12.5 |
|  | H2 (check) | 1.99 | 35.5 | 2.26 | +6,157 | 1,658 | -1,978 | 1,002 | -243 | 23.1/0.0 | 35.9/0.0 | 95.2 | 22.0 |
|  | 2021-25 (ref) | 1.64 | 17.0 | 0.76 | -14,545 | -285 | -21,307 | 756 | -205 | 2.5/8.5 | 4.5/19.0 | 12.8 | 22.0 |
| Nearer of VIX band / 4H FVG | H1 (pick) | 3.09 | 24.1 | 3.94 | +31,230 | 5,124 | -2,513 | 2,203 | -177 | 39.1/2.3 | 58.6/5.5 | 87.7 | 10.0 |
|  | H2 (check) | 2.5 | 33.3 | 2.19 | +7,859 | 2,116 | -2,333 | 1,110 | -253 | 23.1/0.0 | 35.9/0.0 | 68.0 | 18.0 |
|  | 2021-25 (ref) | 2.15 | 18.4 | 0.91 | -7,344 | -144 | -18,775 | 878 | -218 | 5.3/10.4 | 9.7/23.2 | 20.9 | 18.0 |
| 4H FVG, else VIX band | H1 (pick) | 3.12 | 25.0 | 3.97 | +31,604 | 5,185 | -2,513 | 2,112 | -177 | 39.1/2.3 | 61.7/5.5 | 88.2 | 10.0 |
|  | H2 (check) | 2.5 | 33.3 | 2.24 | +8,136 | 2,190 | -2,333 | 1,132 | -253 | 23.1/0.0 | 35.9/0.0 | 68.0 | 18.0 |
|  | 2021-25 (ref) | 2.17 | 18.5 | 0.94 | -4,935 | -97 | -18,384 | 890 | -214 | 5.5/10.4 | 9.8/23.5 | 21.9 | 19.0 |
| 1H order block only | H1 (pick) | 1.99 | 23.5 | 2.52 | +10,769 | 1,767 | -2,544 | 1,488 | -182 | 17.2/0.0 | 32.0/3.9 | 68.8 | 15.5 |
|  | H2 (check) | 1.28 | 30.0 | 1.53 | +2,503 | 674 | -1,726 | 1,209 | -340 | 25.6/0.0 | 50.0/0.0 | 100.0 | 12.5 |
|  | 2021-25 (ref) | 1.15 | 17.5 | 1.19 | +8,400 | 165 | -8,237 | 1,237 | -221 | 5.5/5.8 | 8.7/14.6 | 28.4 | 22.5 |
| Nearer of VIX band / 1H OB | H1 (pick) | 3.05 | 24.4 | 3.64 | +26,425 | 4,335 | -2,762 | 1,917 | -170 | 43.8/2.3 | 57.0/5.5 | 92.3 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.2 | +8,955 | 2,411 | -2,398 | 1,171 | -286 | 37.2/1.3 | 59.0/7.7 | 86.7 | 12.0 |
|  | 2021-25 (ref) | 2.2 | 18.5 | 0.96 | -3,009 | -59 | -17,948 | 815 | -192 | 5.1/9.7 | 9.9/24.1 | 21.2 | 18.0 |
| 1H OB, else VIX band | H1 (pick) | 3.09 | 24.1 | 3.64 | +26,422 | 4,335 | -2,762 | 1,917 | -167 | 43.8/2.3 | 57.0/5.5 | 92.3 | 9.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.22 | +9,035 | 2,432 | -2,398 | 1,176 | -286 | 37.2/1.3 | 59.0/7.7 | 89.2 | 12.5 |
|  | 2021-25 (ref) | 2.21 | 18.4 | 0.97 | -2,148 | -42 | -17,265 | 833 | -193 | 6.2/9.7 | 11.6/23.9 | 24.2 | 17.0 |
| 4H order block only | H1 (pick) | 1.64 | 19.0 | 0.89 | -851 | -140 | -3,933 | 840 | -223 | 18.0/0.0 | 27.3/3.9 | 67.1 | 11.0 |
|  | H2 (check) | 1.41 | 31.8 | 2.91 | +7,061 | 1,901 | -1,920 | 1,536 | -246 | 23.1/0.0 | 35.9/0.0 | 100.0 | 34.0 |
|  | 2021-25 (ref) | 1.39 | 18.1 | 0.76 | -11,888 | -233 | -14,315 | 704 | -205 | 3.6/4.2 | 8.3/11.4 | 28.4 | 21.0 |
| Nearer of VIX band / 4H OB | H1 (pick) | 3.05 | 23.1 | 3.75 | +29,982 | 4,919 | -2,511 | 2,271 | -182 | 37.5/3.1 | 60.2/6.2 | 91.3 | 10.0 |
|  | H2 (check) | 2.63 | 36.6 | 2.57 | +11,211 | 3,018 | -2,157 | 1,224 | -275 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.32 | 18.7 | 0.98 | -1,583 | -31 | -18,712 | 885 | -207 | 7.7/7.9 | 14.0/20.6 | 33.3 | 21.0 |
| 4H OB, else VIX band | H1 (pick) | 3.05 | 23.1 | 3.72 | +29,687 | 4,871 | -2,511 | 2,255 | -182 | 37.5/3.1 | 60.2/6.2 | 91.3 | 10.0 |
|  | H2 (check) | 2.63 | 36.6 | 2.66 | +11,848 | 3,190 | -2,157 | 1,267 | -275 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.34 | 18.9 | 1.03 | +2,530 | 50 | -16,555 | 935 | -212 | 7.2/7.9 | 13.4/20.6 | 33.5 | 22.0 |
| Nearer of VIX band / 1H FVG far edge | H1 (pick) | 2.97 | 27.6 | 3.42 | +24,248 | 3,978 | -2,075 | 1,632 | -182 | 31.2/2.3 | 56.2/3.9 | 89.6 | 12.0 |
|  | H2 (check) | 2.44 | 39.5 | 2.06 | +7,676 | 2,067 | -2,193 | 993 | -314 | 37.2/1.3 | 59.0/7.7 | 86.7 | 12.0 |
|  | 2021-25 (ref) | 1.96 | 23.0 | 1.11 | +8,185 | 160 | -10,139 | 855 | -231 | 5.6/7.2 | 12.4/19.5 | 27.8 | 18.0 |
| Nearer of VIX band / 4H FVG far edge | H1 (pick) | 3.05 | 23.1 | 3.68 | +29,499 | 4,840 | -2,511 | 2,250 | -183 | 34.4/3.1 | 60.9/7.0 | 90.6 | 11.5 |
|  | H2 (check) | 2.56 | 32.5 | 2.15 | +7,940 | 2,138 | -2,256 | 1,143 | -256 | 23.1/0.0 | 30.8/0.0 | 68.0 | 22.0 |
|  | 2021-25 (ref) | 2.28 | 19.0 | 1.01 | +759 | 15 | -19,350 | 923 | -215 | 8.2/8.7 | 14.7/19.8 | 32.7 | 18.0 |
| Nearer of VIX band / 4H FVG middle | H1 (pick) | 3.09 | 22.8 | 3.6 | +28,583 | 4,689 | -2,513 | 2,198 | -180 | 36.7/3.1 | 57.8/6.2 | 87.5 | 10.0 |
|  | H2 (check) | 2.56 | 32.5 | 2.14 | +7,866 | 2,118 | -2,256 | 1,137 | -256 | 23.1/0.0 | 30.8/0.0 | 68.0 | 22.0 |
|  | 2021-25 (ref) | 2.25 | 19.3 | 1.03 | +2,914 | 57 | -19,453 | 931 | -214 | 8.5/8.7 | 15.1/19.3 | 32.5 | 16.0 |
| Nearer of VIX band / 4H FVG / 4H OB | H1 (pick) | 3.05 | 24.4 | 3.82 | +29,931 | 4,911 | -2,511 | 2,134 | -180 | 39.1/2.3 | 58.6/5.5 | 86.8 | 10.0 |
|  | H2 (check) | 2.5 | 38.5 | 2.53 | +9,590 | 2,582 | -2,333 | 1,057 | -261 | 23.1/0.0 | 42.3/0.0 | 68.0 | 16.0 |
|  | 2021-25 (ref) | 2.1 | 18.9 | 0.89 | -8,546 | -167 | -18,984 | 826 | -216 | 5.0/9.6 | 9.2/21.7 | 21.0 | 19.0 |
| Nearer of VIX band / any 1H-4H FVG or OB | H1 (pick) | 2.73 | 28.6 | 3.41 | +21,027 | 3,450 | -2,346 | 1,487 | -174 | 34.4/0.0 | 60.9/1.6 | 95.3 | 12.0 |
|  | H2 (check) | 2.18 | 35.3 | 1.84 | +4,618 | 1,243 | -2,051 | 842 | -249 | 20.5/0.0 | 38.5/0.0 | 97.3 | 23.0 |
|  | 2021-25 (ref) | 1.69 | 22.3 | 0.97 | -1,892 | -37 | -17,835 | 825 | -244 | 0.5/8.6 | 3.4/19.9 | 17.0 | 30.0 |

</details>

**Verdict: REJECT.** Every version loses money in H1, and all but two lose in H2 too. Best pair: "4H order block, else the VIX
band" (H1 -$3.6k, H2 +$1.4k), one half only.
**Why:** the HTF levels sit closer than the VIX band, so they cut the 5-8R days that carry LIT. "Alone" also drops a quarter to a
third of the trades (1.3-2.3 a week), because many setups have no HTF level 1.5R away.

## 2. Take profit before 08:30 news or at the London close, if the trade is in profit

**The idea.** Close an open trade at market at a set time if it shows at least +X R then; otherwise let it run as normal.
Times: 5 min (or 1 min) before a high-impact 08:30 ET release (NFP, CPI, PPI, claims, GDP...), and the London close at 11:00 or
11:30 ET. X = 0.5R, 1R, 2R. After 11:30 looked good in both halves, the neighbours 11:15, 11:45 and 12:00 were added to see if
it was a fluke.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| Out 5 min before 08:30 news if >= +0.5R | +254 | -815 | -490 | one half only |
| Out 5 min before 08:30 news if >= +1R | +0 | -815 | -1,175 | one half only |
| Out 5 min before 08:30 news if >= +2R | +0 | +0 | -1,175 | same |
| Out 1 min before 08:30 news if >= +1R | +0 | -701 | -1,075 | one half only |
| Out at 11:00 ET if >= +0.5R | -376 | +1,190 | +8,016 | one half only |
| Out at 11:00 ET if >= +1R | -376 | +932 | +9,461 | one half only |
| Out at 11:00 ET if >= +2R | -376 | +932 | +12,474 | one half only |
| Out at 11:30 ET if >= +0.5R | +178 | +968 | +4,746 | better in both |
| Out at 11:30 ET if >= +1R | +15 | +1,505 | +4,485 | better in both |
| Out at 11:30 ET if >= +2R | +15 | +949 | +5,413 | better in both |
| Out at 11:15 ET if >= +0.5R | -128 | +813 | +2,999 | one half only |
| Out at 11:15 ET if >= +1R | -128 | +988 | +4,403 | one half only |
| Out at 11:45 ET if >= +0.5R | +799 | +1,298 | +6,335 | better in both |
| Out at 11:45 ET if >= +1R | +356 | +1,298 | +6,979 | better in both |
| Out at 12:00 ET if >= +0.5R | +915 | +1,132 | +13,621 | better in both |
| Out at 12:00 ET if >= +1R | +301 | +901 | +14,207 | better in both |
| Out at 11:30 ET if >= +0R | +178 | +968 | +2,067 | better in both |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| Out 5 min before 08:30 news if >= +0.5R | H1 (pick) | 3.12 | 23.8 | 4.03 | +33,559 | 5,506 | -2,513 | 2,348 | -181 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.4 | +9,650 | 2,598 | -2,157 | 1,183 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.8 | 0.98 | -1,920 | -38 | -18,312 | 934 | -207 | 8.6/7.4 | 15.2/19.4 | 29.5 | 17.0 |
| Out 5 min before 08:30 news if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.4 | +9,650 | 2,598 | -2,157 | 1,183 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,605 | -51 | -18,869 | 944 | -206 | 8.6/8.1 | 15.6/21.0 | 30.5 | 17.0 |
| Out 5 min before 08:30 news if >= +2R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,605 | -51 | -18,869 | 944 | -206 | 8.6/8.1 | 15.6/21.0 | 30.5 | 17.0 |
| Out 1 min before 08:30 news if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.41 | +9,764 | 2,629 | -2,157 | 1,191 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.97 | -2,505 | -49 | -18,769 | 946 | -206 | 8.6/8.1 | 15.6/21.0 | 30.5 | 17.0 |
| Out at 11:00 ET if >= +0.5R | H1 (pick) | 3.12 | 22.5 | 3.97 | +32,929 | 5,402 | -2,513 | 2,444 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.69 | +11,655 | 3,138 | -2,157 | 1,238 | -276 | 29.5/0.0 | 50.0/0.0 | 90.1 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 20.4 | 1.07 | +6,586 | 129 | -14,769 | 909 | -217 | 7.9/8.1 | 13.3/20.1 | 27.6 | 16.0 |
| Out at 11:00 ET if >= +1R | H1 (pick) | 3.12 | 22.5 | 3.97 | +32,929 | 5,402 | -2,513 | 2,444 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,397 | 3,068 | -2,157 | 1,220 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.6 | 1.09 | +8,031 | 157 | -14,799 | 972 | -217 | 8.6/8.1 | 15.1/20.1 | 30.5 | 17.0 |
| Out at 11:00 ET if >= +2R | H1 (pick) | 3.12 | 22.5 | 3.97 | +32,929 | 5,402 | -2,513 | 2,444 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,397 | 3,068 | -2,157 | 1,220 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 18.6 | 1.12 | +11,044 | 216 | -13,266 | 1,047 | -213 | 9.0/8.1 | 15.8/19.8 | 31.2 | 16.0 |
| Out at 11:30 ET if >= +0.5R | H1 (pick) | 3.12 | 23.8 | 4.03 | +33,483 | 5,493 | -2,513 | 2,345 | -181 | 37.5/3.1 | 62.5/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,433 | 3,078 | -2,157 | 1,223 | -276 | 32.1/0.0 | 53.8/0.0 | 95.8 | 15.5 |
|  | 2021-25 (ref) | 2.38 | 19.4 | 1.04 | +3,316 | 65 | -17,339 | 927 | -215 | 8.1/8.1 | 13.2/20.0 | 29.2 | 19.0 |
| Out at 11:30 ET if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,320 | 5,467 | -2,513 | 2,466 | -179 | 37.5/3.1 | 62.5/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.73 | +11,970 | 3,223 | -2,157 | 1,259 | -276 | 32.1/0.0 | 53.8/0.0 | 95.8 | 15.5 |
|  | 2021-25 (ref) | 2.38 | 19.2 | 1.03 | +3,055 | 60 | -17,339 | 934 | -215 | 8.1/8.1 | 13.2/20.0 | 29.2 | 19.0 |
| Out at 11:30 ET if >= +2R | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,320 | 5,467 | -2,513 | 2,466 | -179 | 37.5/3.1 | 62.5/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,414 | 3,073 | -2,157 | 1,221 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 18.6 | 1.05 | +3,983 | 78 | -18,407 | 972 | -213 | 8.7/8.1 | 14.2/20.0 | 31.6 | 19.0 |
| Out at 11:15 ET if >= +0.5R | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,177 | 5,443 | -2,513 | 2,458 | -179 | 37.5/3.1 | 61.7/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.63 | +11,278 | 3,036 | -2,157 | 1,212 | -276 | 32.1/0.0 | 52.6/0.0 | 70.7 | 11.0 |
|  | 2021-25 (ref) | 2.38 | 20.2 | 1.02 | +1,569 | 31 | -18,632 | 845 | -210 | 8.0/8.1 | 13.4/19.8 | 29.0 | 18.0 |
| Out at 11:15 ET if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,177 | 5,443 | -2,513 | 2,458 | -179 | 37.5/3.1 | 61.7/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.66 | +11,453 | 3,083 | -2,157 | 1,224 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.0 | 1.03 | +2,973 | 58 | -19,608 | 918 | -208 | 8.7/8.1 | 14.8/20.4 | 30.7 | 18.0 |
| Out at 11:45 ET if >= +0.5R | H1 (pick) | 3.12 | 25.0 | 4.08 | +34,104 | 5,595 | -2,513 | 2,258 | -184 | 39.8/3.1 | 64.1/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.7 | +11,763 | 3,167 | -2,157 | 1,245 | -276 | 32.1/0.0 | 52.6/0.0 | 95.8 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 19.2 | 1.06 | +4,905 | 96 | -16,846 | 917 | -206 | 8.3/8.1 | 13.7/19.8 | 29.4 | 18.0 |
| Out at 11:45 ET if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.04 | +33,661 | 5,523 | -2,513 | 2,485 | -179 | 39.8/3.1 | 62.5/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.7 | +11,763 | 3,167 | -2,157 | 1,245 | -276 | 32.1/0.0 | 52.6/0.0 | 95.8 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 18.8 | 1.06 | +5,549 | 109 | -17,446 | 964 | -210 | 8.3/8.1 | 13.5/20.0 | 29.1 | 18.0 |
| Out at 12:00 ET if >= +0.5R | H1 (pick) | 3.12 | 25.0 | 4.09 | +34,220 | 5,614 | -2,513 | 2,264 | -184 | 39.8/3.1 | 64.1/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.68 | +11,597 | 3,122 | -2,157 | 1,234 | -276 | 29.5/0.0 | 52.6/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.2 | 1.14 | +12,191 | 239 | -10,742 | 1,012 | -211 | 8.1/8.1 | 14.6/20.1 | 31.2 | 19.0 |
| Out at 12:00 ET if >= +1R | H1 (pick) | 3.12 | 22.5 | 4.04 | +33,606 | 5,514 | -2,513 | 2,482 | -179 | 39.8/3.1 | 62.5/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,366 | 3,060 | -2,157 | 1,218 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.0 | 1.14 | +12,777 | 250 | -10,777 | 1,046 | -215 | 8.1/8.1 | 14.6/20.1 | 30.5 | 18.0 |
| Out at 11:30 ET if >= +0R | H1 (pick) | 3.12 | 23.8 | 4.03 | +33,483 | 5,493 | -2,513 | 2,345 | -181 | 37.5/3.1 | 62.5/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.65 | +11,433 | 3,078 | -2,157 | 1,223 | -276 | 32.1/0.0 | 53.8/0.0 | 95.8 | 15.5 |
|  | 2021-25 (ref) | 2.38 | 19.6 | 1.01 | +637 | 12 | -17,675 | 867 | -210 | 8.1/8.1 | 13.2/20.1 | 29.0 | 19.0 |

</details>

**News, verdict: REJECT.** Only 1-2 trades of 2026 are open and in profit 5 minutes before an 08:30 release. Closing them cost
$0.7-0.8k in H2 (the releases pushed them further). The earlier unconditional news exit (`lit-report-coverage.md`) was rejected
too.

**London close 11:00 / 11:15, verdict: REJECT** (H1 -$128 to -$376, H2 +$0.8k to +$1.2k: one half only).

**11:30 to 12:00, verdict: ADOPT-candidate (small).** Every setting from 11:30 to 12:00 at 0.5R or 1R is better in both halves
and in 2021-25. Picked on H1 (the best H1 of the family): **out at 12:00 ET if the trade is at least +0.5R**.

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| Out at 12:00 ET if >= +0.5R | H1 (pick) | 3.12 | 25.0 | 4.09 | +34,220 | 5,614 | -2,513 | 2,264 | -184 | 39.8/3.1 | 64.1/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.68 | +11,597 | 3,122 | -2,157 | 1,234 | -276 | 29.5/0.0 | 52.6/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 19.2 | 1.14 | +12,191 | 239 | -10,742 | 1,012 | -211 | 8.1/8.1 | 14.6/20.1 | 31.2 | 19.0 |

The 7 trades it changes in 2026 (R = result in units of the risk):

| Day | Side | Stop pts | With the 12:00 exit | Live |
|---|---|---:|---:|---:|
| 2026-03-17 | short | 67.5 | +0.87R | breakeven |
| 2026-03-20 | long | 43.0 | +0.87R | breakeven |
| 2026-03-27 | short | 80.25 | +4.30R | target +6.15R |
| 2026-05-01 | long | 42.75 | +7.29R | 15:55 exit +5.89R |
| 2026-09-07 | short | 30.0 | +0.74R | 15:55 exit +0.39R |
| 2026-09-18 | short | 52.25 | +3.94R | breakeven |
| 2026-10-07 | long | 80.25 | +1.43R | 15:55 exit +2.24R |

**Why it can work:** LIT is a London-morning strategy (most entries 02:00-08:00 ET). A trade still open at noon has had the whole
London and New York morning to reach the VIX band. After noon (New York lunch) moves get smaller and price often comes back,
so a trade that is up tends to drift back to breakeven or to a smaller 15:55 exit. **Honest caveats:** only 7 trades of 120, so
it adds about $2k a year and one trade (Sep 18, +3.9R instead of breakeven) carries most of H2. The 11:30 neighbour was seen in
both halves before the 11:45 / 12:00 neighbours were added, so the pick is not fully blind; it is shown because the whole block
11:30-12:00 x 0.5-1R improves both halves, not one lucky setting. Trades per week are unchanged; the 2-week eval pass rises in
H1 (37.5% to 39.8%), the 1-month pass in both (H1 60.2% to 64.1%, H2 47.4% to 52.6%), fails unchanged.

## 3. Exit when the reverse trade's inducement gets taken

**The idea.** While long, look at the small 5m swing highs that sit within 1 ATR below an untaken high-side LIT level: the swings
a short LIT setup would need as its inducement. When price trades through one while the trade is at least +X R, close at that
1m bar's close. Mirror for shorts. Second form ("reverse setup"): close at the next bar's open when a complete opposite LIT
setup (sweep + displacement + 5m CISD, live filters) triggers while the trade is at least +X R.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| Out when the reverse inducement is taken, any profit | -15,225 | -3,174 | +6,565 | worse in both |
| ... at >= +1R | -12,766 | -2,678 | +18,508 | worse in both |
| ... at >= +2R | -7,515 | -1,339 | +19,293 | worse in both |
| ... at >= +3R | -4,506 | -6 | +16,168 | worse in both |
| ... at >= +1R, swing within 0.5 ATR of the level | -11,679 | -1,667 | +3,711 | worse in both |
| Out on a full reverse LIT setup, any profit | -4,509 | -2,655 | +4,921 | worse in both |
| ... at >= +1R | -1,927 | +395 | +377 | one half only |
| ... at >= +2R | -4,150 | +0 | +3,596 | one half only |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| Out when the reverse inducement is taken, any profit | H1 (pick) | 3.12 | 43.8 | 2.79 | +18,080 | 2,966 | -2,305 | 806 | -225 | 26.6/0.0 | 41.4/4.7 | 84.3 | 9.0 |
|  | H2 (check) | 2.56 | 45.0 | 2.05 | +7,291 | 1,963 | -1,566 | 791 | -316 | 16.7/0.0 | 34.6/0.0 | 100.0 | 25.0 |
|  | 2021-25 (ref) | 2.38 | 47.1 | 1.07 | +5,135 | 101 | -15,407 | 313 | -259 | 4.5/5.1 | 8.8/14.0 | 41.0 | 25.5 |
| ... at >= +1R | H1 (pick) | 3.12 | 27.5 | 2.85 | +20,539 | 3,370 | -2,558 | 1,437 | -191 | 20.3/3.1 | 37.5/10.2 | 67.9 | 11.0 |
|  | H2 (check) | 2.56 | 40.0 | 2.13 | +7,787 | 2,096 | -2,200 | 916 | -286 | 23.1/0.0 | 41.0/0.0 | 95.2 | 18.5 |
|  | 2021-25 (ref) | 2.38 | 28.8 | 1.19 | +17,078 | 335 | -12,435 | 719 | -244 | 6.7/7.4 | 12.8/18.6 | 38.5 | 26.0 |
| ... at >= +2R | H1 (pick) | 3.12 | 23.8 | 3.32 | +25,790 | 4,231 | -2,376 | 1,942 | -182 | 24.2/3.1 | 58.6/6.2 | 90.5 | 13.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.32 | +9,126 | 2,457 | -2,216 | 1,069 | -276 | 29.5/0.0 | 47.4/0.0 | 95.4 | 15.5 |
|  | 2021-25 (ref) | 2.38 | 22.0 | 1.21 | +17,863 | 350 | -12,361 | 935 | -218 | 8.9/7.8 | 16.6/19.9 | 38.9 | 20.0 |
| ... at >= +3R | H1 (pick) | 3.12 | 23.8 | 3.56 | +28,799 | 4,725 | -2,376 | 2,107 | -184 | 29.7/3.1 | 58.6/4.7 | 94.2 | 13.0 |
|  | H2 (check) | 2.56 | 37.5 | 2.51 | +10,459 | 2,816 | -2,216 | 1,158 | -276 | 29.5/0.0 | 50.0/0.0 | 95.8 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 18.8 | 1.17 | +14,738 | 289 | -13,356 | 1,068 | -212 | 8.8/8.1 | 16.8/18.8 | 36.1 | 19.0 |
| ... at >= +1R, swing within 0.5 ATR of the level | H1 (pick) | 3.12 | 27.5 | 2.98 | +21,626 | 3,548 | -2,558 | 1,480 | -189 | 21.1/3.1 | 39.1/8.6 | 73.9 | 13.5 |
|  | H2 (check) | 2.56 | 40.0 | 2.27 | +8,798 | 2,369 | -2,263 | 984 | -290 | 26.9/0.0 | 44.9/0.0 | 95.2 | 16.5 |
|  | 2021-25 (ref) | 2.38 | 23.9 | 1.03 | +2,281 | 45 | -12,437 | 763 | -234 | 6.5/8.1 | 11.7/18.8 | 27.1 | 19.0 |
| Out on a full reverse LIT setup, any profit | H1 (pick) | 3.12 | 37.5 | 3.65 | +28,796 | 4,724 | -2,367 | 1,322 | -217 | 38.3/3.1 | 63.3/6.2 | 92.5 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.13 | +7,810 | 2,103 | -2,157 | 981 | -276 | 29.5/0.0 | 42.3/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.38 | 27.1 | 1.04 | +3,491 | 68 | -10,360 | 647 | -230 | 7.8/7.5 | 11.7/17.6 | 24.7 | 17.5 |
| ... at >= +1R | H1 (pick) | 3.12 | 28.7 | 3.84 | +31,378 | 5,148 | -2,513 | 1,844 | -194 | 38.3/2.3 | 60.9/5.5 | 93.3 | 10.5 |
|  | H2 (check) | 2.56 | 37.5 | 2.57 | +10,860 | 2,924 | -2,157 | 1,184 | -276 | 29.5/0.0 | 48.7/0.0 | 95.8 | 18.5 |
|  | 2021-25 (ref) | 2.38 | 20.8 | 0.99 | -1,053 | -21 | -20,076 | 813 | -216 | 8.5/8.1 | 13.2/20.1 | 27.6 | 18.0 |
| ... at >= +2R | H1 (pick) | 3.12 | 22.5 | 3.63 | +29,155 | 4,783 | -2,513 | 2,235 | -179 | 33.6/3.1 | 60.2/6.2 | 92.3 | 11.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 18.0 | 1.03 | +2,166 | 42 | -16,602 | 957 | -205 | 8.5/8.1 | 14.9/20.3 | 29.4 | 16.5 |

</details>

**Verdict: REJECT.** The inducement exit loses $4.5k-$15.2k in H1 and in H2 at every threshold; the reverse-setup exit at 1R is
-$1.9k / +$0.4k. **Why:** on the way to the VIX band price takes many small swings in front of levels. Leaving there raises the
win rate (22% to 44%) but turns 5-8R winners into 1-2R ones. It does help 2021-25 (+$17-19k), where far targets are rarely
reached on 5m bars, but 2026 decides.

## 4. A daily profit stop (and 2 trades a day)

**The idea.** "Done for the day after +$X" only matters with more than one trade a day, so it was run with 2 trades a day (the
second only after the first is closed), X = $500 / $800 / $1,200, plus 2 a day without a profit stop and 1 a day with one.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| 2 trades a day, no profit stop | -537 | -4,024 | -1,999 | worse in both |
| 2 a day, done after +$500 | -537 | -4,451 | -1,227 | worse in both |
| 2 a day, done after +$800 | -537 | -4,451 | -1,852 | worse in both |
| 2 a day, done after +$1,200 | -537 | -4,451 | -1,979 | worse in both |
| 1 a day, done after +$800 | +0 | +0 | +0 | same |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| 2 trades a day, no profit stop | H1 (pick) | 3.87 | 19.2 | 3.48 | +32,768 | 5,376 | -2,519 | 2,420 | -165 | 29.7/3.1 | 46.1/18.8 | 65.4 | 9.5 |
|  | H2 (check) | 3.14 | 32.7 | 1.91 | +6,441 | 1,734 | -3,120 | 846 | -215 | 29.5/0.0 | 51.3/0.0 | 96.0 | 19.0 |
|  | 2021-25 (ref) | 2.79 | 18.0 | 0.97 | -3,429 | -67 | -16,498 | 899 | -205 | 8.5/11.3 | 13.3/33.0 | 25.5 | 16.0 |
| 2 a day, done after +$500 | H1 (pick) | 3.87 | 19.2 | 3.48 | +32,768 | 5,376 | -2,519 | 2,420 | -165 | 29.7/3.1 | 46.1/18.8 | 65.4 | 9.5 |
|  | H2 (check) | 3.08 | 31.2 | 1.85 | +6,014 | 1,619 | -3,120 | 874 | -215 | 29.5/0.0 | 51.3/0.0 | 96.0 | 19.5 |
|  | 2021-25 (ref) | 2.78 | 18.2 | 0.97 | -2,657 | -52 | -15,852 | 902 | -205 | 8.5/11.3 | 13.3/33.0 | 25.9 | 17.0 |
| 2 a day, done after +$800 | H1 (pick) | 3.87 | 19.2 | 3.48 | +32,768 | 5,376 | -2,519 | 2,420 | -165 | 29.7/3.1 | 46.1/18.8 | 65.4 | 9.5 |
|  | H2 (check) | 3.08 | 31.2 | 1.85 | +6,014 | 1,619 | -3,120 | 874 | -215 | 29.5/0.0 | 51.3/0.0 | 96.0 | 19.5 |
|  | 2021-25 (ref) | 2.78 | 18.1 | 0.97 | -3,282 | -64 | -16,477 | 900 | -206 | 8.5/11.3 | 13.3/33.0 | 25.5 | 16.0 |
| 2 a day, done after +$1,200 | H1 (pick) | 3.87 | 19.2 | 3.48 | +32,768 | 5,376 | -2,519 | 2,420 | -165 | 29.7/3.1 | 46.1/18.8 | 65.4 | 9.5 |
|  | H2 (check) | 3.08 | 31.2 | 1.85 | +6,014 | 1,619 | -3,120 | 874 | -215 | 29.5/0.0 | 51.3/0.0 | 96.0 | 19.5 |
|  | 2021-25 (ref) | 2.78 | 18.1 | 0.97 | -3,409 | -67 | -16,477 | 899 | -205 | 8.5/11.3 | 13.3/33.0 | 25.5 | 16.0 |
| 1 a day, done after +$800 | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |

</details>

**Verdict: REJECT.** The second trade of the day costs money in both halves (H1 -$0.5k, H2 -$4.0k) and raises 1-month eval fails
in H1 from 6.2% to 18.8%. The profit stop almost never binds (once in H2): a big LIT winner usually closes late, leaving no time
for a second setup. With 1 trade a day it changes nothing.

## 5. Other bank levels and VIX band sizes

**The idea.** Bank at 6R / 10R / never instead of 8R; VIX band x 0.8 / 1.2 (x 0.9 / 1.1 were LIT final's neighbours; re-run here
at the eval size). Bank 6R / 10R / none were tested on LIT final in `lit-experiments.md`; re-run here on the live pack and size.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| Bank at 6R | -8,486 | -3,209 | +12,578 | worse in both |
| Bank at 10R | +864 | -4,072 | +16,312 | one half only |
| No bank | +3,022 | -6,468 | +26,023 | one half only |
| VIX band x 0.8 | -411 | -2,604 | -3,694 | worse in both |
| VIX band x 0.9 | -79 | -803 | -2,611 | worse in both |
| VIX band x 1.1 | -3,817 | +549 | +9,132 | one half only |
| VIX band x 1.2 | -3,238 | +1,507 | +8,914 | one half only |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| Bank at 6R | H1 (pick) | 3.12 | 22.5 | 3.24 | +24,819 | 4,072 | -2,513 | 1,994 | -179 | 30.5/3.1 | 48.4/6.2 | 78.0 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.06 | +7,256 | 1,954 | -2,187 | 1,008 | -264 | 21.8/0.0 | 43.6/0.0 | 67.6 | 15.5 |
|  | 2021-25 (ref) | 2.36 | 19.8 | 1.14 | +11,148 | 218 | -11,872 | 924 | -201 | 6.7/8.1 | 12.4/18.8 | 30.5 | 21.0 |
| Bank at 10R | H1 (pick) | 3.12 | 20.0 | 4.26 | +34,169 | 5,606 | -4,508 | 2,791 | -164 | 31.2/3.1 | 49.2/12.5 | 71.8 | 10.0 |
|  | H2 (check) | 2.56 | 30.0 | 1.9 | +6,393 | 1,721 | -2,327 | 1,124 | -253 | 15.4/0.0 | 29.5/0.0 | 76.9 | 22.0 |
|  | 2021-25 (ref) | 2.39 | 16.2 | 1.17 | +14,882 | 292 | -11,832 | 1,232 | -203 | 11.1/8.2 | 17.9/21.6 | 31.3 | 15.0 |
| No bank | H1 (pick) | 3.12 | 17.5 | 4.45 | +36,327 | 5,960 | -4,508 | 3,347 | -160 | 27.3/3.1 | 43.8/14.1 | 64.1 | 9.0 |
|  | H2 (check) | 2.56 | 27.5 | 1.57 | +3,997 | 1,076 | -2,464 | 999 | -241 | 24.4/0.0 | 38.5/0.0 | 80.3 | 17.0 |
|  | 2021-25 (ref) | 2.39 | 15.8 | 1.29 | +24,593 | 482 | -12,392 | 1,360 | -198 | 10.7/7.4 | 16.5/20.2 | 26.6 | 12.0 |
| VIX band x 0.8 | H1 (pick) | 3.05 | 21.8 | 4.04 | +32,894 | 5,397 | -2,513 | 2,572 | -178 | 37.5/3.1 | 62.5/6.2 | 92.5 | 11.0 |
|  | H2 (check) | 2.5 | 33.3 | 2.19 | +7,861 | 2,116 | -2,600 | 1,112 | -253 | 23.1/0.0 | 47.4/0.0 | 73.3 | 16.0 |
|  | 2021-25 (ref) | 2.32 | 18.3 | 0.94 | -5,124 | -100 | -18,565 | 862 | -206 | 7.2/8.1 | 13.0/20.6 | 28.7 | 18.5 |
| VIX band x 0.9 | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,226 | 5,451 | -2,513 | 2,461 | -179 | 39.8/3.1 | 62.5/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.41 | +9,662 | 2,601 | -2,229 | 1,180 | -264 | 29.5/0.0 | 47.4/0.0 | 92.8 | 17.5 |
|  | 2021-25 (ref) | 2.34 | 17.1 | 0.95 | -4,041 | -79 | -19,581 | 920 | -200 | 8.0/8.1 | 14.3/20.6 | 29.5 | 17.0 |
| VIX band x 1.1 | H1 (pick) | 3.16 | 21.0 | 3.69 | +29,488 | 4,838 | -2,513 | 2,379 | -171 | 36.7/3.1 | 63.3/6.2 | 92.1 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.57 | +11,014 | 2,965 | -2,137 | 1,288 | -270 | 29.5/0.0 | 50.0/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.42 | 18.0 | 1.09 | +7,702 | 151 | -13,001 | 1,033 | -208 | 8.9/8.1 | 15.2/20.1 | 29.8 | 18.0 |
| VIX band x 1.2 | H1 (pick) | 3.16 | 21.0 | 3.74 | +30,067 | 4,933 | -2,513 | 2,413 | -171 | 36.7/3.1 | 63.3/6.2 | 92.1 | 10.0 |
|  | H2 (check) | 2.63 | 34.1 | 2.83 | +11,972 | 3,223 | -2,284 | 1,323 | -243 | 32.1/0.0 | 51.3/0.0 | 95.7 | 14.5 |
|  | 2021-25 (ref) | 2.43 | 17.9 | 1.08 | +7,484 | 147 | -13,457 | 1,037 | -208 | 8.9/8.6 | 15.2/20.2 | 29.4 | 17.0 |

</details>

**Verdict: REJECT.** The 8R bank and the x 1.0 band stay. A bigger target (10R, no bank, x 1.1, x 1.2) wins one half and loses
the other; a smaller one (6R, x 0.8, x 0.9) loses both. No bank doubles the H1 drawdown (-$2.5k to -$4.5k) and drops the H1
pass rate from 92% to 64%.

## 6. Found on the way: front-run the VIX band

**The idea.** Set the target a little before the band (2 or 5 points, or 0.05 / 0.1 of a VIX move), so a target that stops just
short still fills.

| Variant | H1 net vs baseline | H2 net vs baseline | 2021-25 net vs baseline | Verdict |
|---|---:|---:|---:|---|
| Target 0.05 VIX move before the band | -394 | -326 | +1,259 | worse in both |
| Target 0.1 VIX move before the band | -79 | -803 | -2,610 | worse in both |
| Target 2 pts before the band | -48 | -44 | +2,193 | worse in both |
| Target 5 pts before the band | -120 | -110 | +1,812 | worse in both |

<details><summary>Full table</summary>

| Variant | Span | Trades/wk | Win % | PF | Net $ | $/mo | Max DD $ | Avg win $ | Avg loss $ | Eval 2 wk pass/fail % | 1 mo pass/fail % | Pass rate % | Median sessions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (VIX band, bank 8R) | H1 (pick) | 3.12 | 22.5 | 4.01 | +33,305 | 5,464 | -2,513 | 2,465 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,465 | 2,818 | -2,157 | 1,241 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.38 | 17.5 | 0.98 | -1,430 | -28 | -17,694 | 961 | -207 | 8.8/8.1 | 15.8/20.8 | 30.7 | 16.5 |
| Target 0.05 VIX move before the band | H1 (pick) | 3.12 | 22.5 | 3.97 | +32,911 | 5,399 | -2,513 | 2,443 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.47 | +10,139 | 2,730 | -2,218 | 1,218 | -266 | 29.5/0.0 | 47.4/0.0 | 95.7 | 17.5 |
|  | 2021-25 (ref) | 2.36 | 17.2 | 1.0 | -171 | -3 | -17,880 | 978 | -204 | 8.5/8.1 | 15.0/20.7 | 29.0 | 16.0 |
| Target 0.1 VIX move before the band | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,226 | 5,451 | -2,513 | 2,461 | -179 | 39.8/3.1 | 62.5/6.2 | 92.3 | 10.0 |
|  | H2 (check) | 2.56 | 35.0 | 2.41 | +9,662 | 2,601 | -2,229 | 1,180 | -264 | 29.5/0.0 | 47.4/0.0 | 92.8 | 17.5 |
|  | 2021-25 (ref) | 2.34 | 17.1 | 0.95 | -4,040 | -79 | -19,581 | 920 | -200 | 8.0/8.1 | 14.3/20.6 | 29.5 | 17.0 |
| Target 2 pts before the band | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,257 | 5,456 | -2,513 | 2,463 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.51 | +10,421 | 2,806 | -2,165 | 1,238 | -266 | 29.5/0.0 | 47.4/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.37 | 17.3 | 1.01 | +763 | 15 | -18,043 | 968 | -201 | 8.8/8.1 | 15.3/20.8 | 29.8 | 16.0 |
| Target 5 pts before the band | H1 (pick) | 3.12 | 22.5 | 4.0 | +33,185 | 5,444 | -2,513 | 2,459 | -179 | 37.5/3.1 | 60.2/6.2 | 92.3 | 10.5 |
|  | H2 (check) | 2.56 | 35.0 | 2.5 | +10,355 | 2,788 | -2,177 | 1,233 | -266 | 29.5/0.0 | 47.4/0.0 | 70.7 | 12.0 |
|  | 2021-25 (ref) | 2.37 | 17.3 | 1.0 | +382 | 7 | -18,130 | 963 | -201 | 8.7/8.1 | 15.1/20.7 | 29.6 | 16.0 |

</details>

**Verdict: REJECT.** Slightly worse in both halves. LIT's targets are run through, not just touched (the "1 tick through" stress
test in `lit-report-coverage.md` changed nothing), so giving up points buys nothing.

## What to do
- **Keep the VIX band banked at 8R.** No HTF FVG / order block, reverse-inducement, news or bank change goes live.
- **Optional, small:** a midday profit take, `"tx_mod": 720, "tx_r": 0.5` in the LIT settings (out at 12:00 ET at market if the
  trade is at least +0.5R). It is better in both halves (+$915 / +$1,132) and in 2021-25, and keeps 2.6-3.1 trades a week, but it
  rests on 7 trades. Default off in code; switch it on only together with a re-run of `tests.test_lit_live`.
- Every variant is stored in the run library (`lit_u_targets_*`, tags `lit`, `lit_untested`, `lit_targets`); all numbers are in
  `research/lit/t_targets_results.json`. Re-run: `python tools/lit_t_targets.py check` (baseline match) and `grid`.
