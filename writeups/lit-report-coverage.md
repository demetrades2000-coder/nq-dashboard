## In one minute

- **The question (owner, 2026-10-18):** make sure everything in the LIT Complete Report is extracted for the bot.
- **What was done:** the report was split into 436 items, each with a chapter, a one-line statement, a type and its status in
  the bot (`research/lit/report_inventory.md`). Every tradable rule not yet tested was tested on LIT live: picked on 2026 Jan-Jun
  (H1), checked on Jul-Oct (H2). The first pass did 49 variants (`lit-report-tests.md`); this pass did 38 more.
- **Result: nothing to adopt.** No new rule makes more money in both halves. LIT live stays at 2026 +$41,734, PF 3.66, 2.91 trades
  a week, max DD −$2,315, eval pass rate 95.5%; H1 +$32,773; H2 +$8,962 (about $2,400 a month).

| Status in the bot | Items |
|---|---:|
| In the bot | 210 |
| In the bot, partly | 50 |
| Tested and rejected | 67 |
| Tested as evidence (a number for the record) | 5 |
| Tested, no effect in 2026 | 2 |
| Missing | 22 |
| Context only (theory, sources, other markets' audit facts) | 80 |
| **Total** | **436** |

## The new tests (2026; Δ = change in net $ against LIT live)

Base LIT live: H1 +$32,773, H2 +$8,962, 2.91/wk, win 26.7%, PF 3.66, +$41,734 ($4,254/mo), DD −$2,315, eval 2 weeks 26.7% pass /
1.9% fail, 1 month 55.3 / 3.9, pass rate 95.5%. Costs included; entries on true 1m bars.

| # | Rule (report chapter) | H1 net (Δ) | H2 net (Δ) | /wk | Win % | PF | 2026 net | $/mo | Max DD | Eval 2 wk p/f | 1 mo p/f | Pass % | 2021-25 PF / net |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---|
| 01 | Final sweep: 2+ levels, else skip (ch.7 ETM) | +29,223 (−3,550) | +7,703 (−1,259) | 2.43 | 25.0 | 3.62 | +36,927 | 3,764 | −2,905 | 24.8/1.9 | 48.1/1.9 | 97.7 | 0.90 / −8,466 |
| 02 | Final sweep: half size with 1 level | +31,515 (−1,258) | +8,221 (−741) | 2.91 | 26.7 | 3.79 | +39,737 | 4,051 | −2,145 | 26.2/1.9 | 52.9/3.9 | 95.3 | 0.95 / −4,198 |
| 03 | Final sweep: 3+ levels | +20,411 (−12,362) | +7,811 (−1,151) | 2.01 | 24.1 | 3.35 | +28,222 | 2,877 | −3,811 | 21.4/1.0 | 39.8/4.9 | 87.2 | 0.72 / −19,368 |
| 04 | Tiers: skip build-up-only sweeps (ch.7) | +30,721 (−2,052) | +7,553 (−1,409) | 2.52 | 25.0 | 3.77 | +38,274 | 3,902 | −2,091 | 24.8/1.9 | 49.0/3.4 | 88.2 | 0.84 / −14,095 |
| 05 | Tiers: half size on build-up-only sweeps | +31,852 (−921) | +8,214 (−748) | 2.91 | 26.7 | 3.78 | +40,066 | 4,084 | −2,145 | 26.2/1.9 | 53.4/3.9 | 95.3 | 0.95 / −4,993 |
| 06 | Tiers: half size unless PD/PW/PM/gap swept | +16,860 (−15,913) | +5,575 (−3,387) | 2.91 | 26.7 | 3.41 | +22,435 | 2,287 | −1,438 | 11.7/0.0 | 33.0/0.0 | 100 | 0.93 / −4,016 |
| 07 | Tiers: only PD/PW/PM/gap sweeps | −296 (−33,069) | +2,556 (−6,406) | 0.49 | 20.0 | 1.61 | +2,260 | 230 | −2,146 | 0/0 | 0/0 | – | 0.32 / −11,645 |
| 08 | Discount: skip premium of the prior-day range (ch.11) | +14,969 (−17,804) | +4,711 (−4,251) | 2.26 | 23.7 | 2.29 | +19,679 | 2,006 | −3,397 | 18.4/4.9 | 32.0/14.1 | 72.2 | 0.95 / −3,215 |
| 09 | Discount: half in prior-day premium | +23,859 (−8,914) | +6,499 (−2,463) | 2.91 | 26.7 | 3.18 | +30,358 | 3,095 | −2,058 | 18.4/2.4 | 39.8/3.4 | 86.5 | 0.98 / −1,933 |
| 10 | Discount: skip premium of the prior-week range | +13,058 (−19,715) | +6,576 (−2,386) | 1.72 | 26.8 | 2.63 | +19,633 | 2,001 | −3,612 | 13.1/2.9 | 29.6/13.6 | 77.4 | 0.74 / −17,398 |
| 11 | Discount: half in prior-week premium | +22,692 (−10,081) | +8,075 (−887) | 2.91 | 26.7 | 3.52 | +30,768 | 3,137 | −2,018 | 15.0/0.0 | 42.7/1.0 | 88.0 | 0.89 / −8,826 |
| 12 | Discount: skip premium of the Asia (18-24) range | +34,519 (+1,746) | +8,165 (−797) | 2.35 | 24.7 | 4.29 | +42,684 | 4,351 | −2,091 | 29.1/1.9 | 52.4/1.9 | 97.8 | 1.04 / +2,932 |
| 13 | Discount: half in Asia premium | +31,764 (−1,009) | +6,710 (−2,252) | 2.91 | 26.7 | 3.85 | +38,475 | 3,922 | −2,055 | 22.3/1.9 | 47.6/2.9 | 96.4 | 1.02 / +1,356 |
| 14 | Flat at 11:00 (ch.21) | +30,537 (−2,236) | +8,624 (−338) | 2.79 | 25.2 | 3.50 | +39,162 | 3,992 | −2,315 | 26.7/1.9 | 52.4/3.9 | 88.4 | 1.07 / +6,838 |
| 15 | Flat at 12:00 | +31,686 (−1,087) | +8,920 (−42) | 2.82 | 27.6 | 3.61 | +40,606 | 4,139 | −2,315 | 26.7/1.9 | 52.4/3.9 | 88.4 | 1.03 / +2,911 |
| 16 | Flat at 13:30 | +32,331 (−442) | +8,939 (−23) | 2.86 | 27.1 | 3.64 | +41,270 | 4,207 | −2,315 | 26.7/1.9 | 52.9/3.9 | 95.5 | 1.04 / +4,258 |
| 17 | Out after 60 min if best < 0.5R (ch.16) | +33,976 (+1,203) | +7,296 (−1,666) | 2.91 | 30.8 | 3.98 | +41,272 | 4,207 | −2,315 | 30.6/0.0 | 52.9/1.9 | 97.8 | 0.96 / −3,390 |
| 18 | Out after 120 min if best < 0.5R | +33,012 (+239) | +8,799 (−163) | 2.91 | 26.7 | 3.71 | +41,811 | 4,262 | −2,315 | 26.7/1.9 | 55.3/3.9 | 95.5 | 1.03 / +2,850 |
| 19 | Out after 120 min if best < 1R | +30,307 (−2,466) | +7,522 (−1,440) | 2.91 | 31.7 | 3.64 | +37,829 | 3,856 | −2,315 | 25.7/0.0 | 51.9/1.9 | 97.8 | 1.01 / +1,013 |
| 20 | Out after 240 min if best < 1R | +32,773 (0) | +7,890 (−1,072) | 2.91 | 26.7 | 3.60 | +40,663 | 4,145 | −2,315 | 26.2/1.9 | 52.9/3.9 | 95.5 | 1.01 / +1,114 |
| 21 | Close 5 min before any high-impact release (ch.18/26) | +33,160 (+387) | +8,418 (−544) | 2.91 | 27.5 | 3.69 | +41,578 | 4,238 | −2,315 | 24.8/1.9 | 53.9/3.9 | 95.5 | 1.02 / +2,310 |
| 22 | Same, NFP / CPI / FOMC only | same as 21 | | | | | | | | | | | 1.02 / +2,310 |
| 23 | Same, NFP only (ReimFX) | same as 21 | | | | | | | | | | | 1.01 / +1,488 |
| 24 | Stop 2 ticks beyond the extreme (ch.21) | +32,891 (+118) | +8,811 (−151) | 2.89 | 26.9 | 3.67 | +41,702 | 4,251 | −2,331 | 26.2/1.9 | 54.9/3.9 | 95.5 | 0.95 / −5,533 |
| 25 | Stop 4 ticks beyond | +32,159 (−614) | +8,731 (−231) | 2.91 | 26.7 | 3.65 | +40,890 | 4,168 | −2,096 | 26.2/1.9 | 55.8/2.9 | 96.6 | 0.93 / −7,572 |
| 26 | London box in Berlin time, DST-correct (ch.12/28) | +32,773 (0) | +8,962 (0) | 2.91 | 26.7 | 3.66 | +41,734 | 4,254 | −2,315 | 26.7/1.9 | 55.3/3.9 | 95.5 | 1.04 / +3,914 |
| 27 | Equal-level tolerance 0.10 ATR (ch.3) | +32,012 (−761) | +6,485 (−2,477) | 2.79 | 25.2 | 3.55 | +38,498 | 3,925 | −2,584 | 26.7/1.9 | 51.5/2.9 | 83.4 | 1.00 / +203 |
| 28 | Equal-level tolerance 0.25 ATR | +31,270 (−1,503) | +7,143 (−1,819) | 3.08 | 25.2 | 3.42 | +38,414 | 3,916 | −2,942 | 30.1/3.4 | 56.8/9.2 | 73.4 | 1.15 / +16,125 |
| 29 | Round 100: skip unless crossed (ch.3) | +7,246 (−25,527) | +2,863 (−6,099) | 1.55 | 20.3 | 2.14 | +10,109 | 1,031 | −4,165 | 11.7/0.0 | 21.4/2.4 | 55.8 | 0.89 / −4,165 |
| 30 | Round 100: half unless crossed | +18,502 (−14,271) | +5,591 (−3,371) | 2.91 | 26.7 | 3.06 | +24,093 | 2,456 | −1,712 | 23.8/0.0 | 43.2/0.0 | 100 | 0.97 / −1,966 |
| 31 | Round 50: skip unless crossed | +23,885 (−8,888) | +5,457 (−3,505) | 2.31 | 24.2 | 3.43 | +29,342 | 2,991 | −2,346 | 24.8/0.0 | 44.7/1.9 | 74.1 | 1.14 / +9,141 |
| 32 | Round 50: half unless crossed | +28,436 (−4,337) | +6,594 (−2,368) | 2.91 | 26.7 | 3.61 | +35,029 | 3,571 | −1,881 | 29.6/1.0 | 51.0/1.5 | 98.2 | 1.05 / +4,060 |
| 33 | Cancel on a close through the block's mean threshold (ch.8) | +16,480 (−16,293) | +3,863 (−5,099) | 2.48 | 24.5 | 2.36 | +20,343 | 2,074 | −3,800 | 6.8/0.0 | 15.0/7.8 | 60.0 | 0.91 / −7,889 |
| 34 | Stress: target must trade 1 tick through (ch.22) | +32,773 (0) | +8,962 (0) | 2.91 | 26.7 | 3.66 | +41,734 | 4,254 | −2,315 | 26.7/1.9 | 55.3/3.9 | 95.5 | 1.01 / +1,275 |
| 35 | Stress: limit tap must trade 1 tick through | +31,315 (−1,458) | +7,406 (−1,556) | 2.89 | 25.2 | 3.41 | +38,722 | 3,947 | −2,315 | 26.7/1.9 | 49.5/3.9 | 95.4 | 0.91 / −8,550 |
| 36 | Stress: +1 tick slippage | +32,410 (−363) | +8,650 (−312) | 2.91 | 26.7 | 3.60 | +41,060 | 4,186 | −2,348 | 26.2/1.9 | 54.9/3.9 | 95.4 | 0.97 / −3,340 |
| 37 | Stress: +2 ticks slippage | +31,193 (−1,580) | +8,584 (−378) | 2.91 | 26.7 | 3.53 | +39,777 | 4,055 | −2,242 | 26.2/1.9 | 55.3/2.9 | 96.6 | 0.93 / −7,357 |
| 38 | Stress: 34 + 35 + 37 together | +29,811 (−2,962) | +7,117 (−1,845) | 2.89 | 25.2 | 3.31 | +36,929 | 3,765 | −2,242 | 26.2/1.9 | 49.5/2.9 | 96.5 | 0.84 / −16,859 |

## What it means

- **Rules: nothing helps both halves.** The few H1 gains do not hold in H2 (skip the Asia premium side +$1.7k / −$0.8k; the
  60-minute no-progress exit +$1.2k / −$1.7k; the news exit +$0.4k / −$0.5k). Every "major level only", round-number,
  premium/discount and mean-threshold rule removes the trades that pay for the year.
- **News:** only 3 of the 120 trades in 2026 were open across a high-impact release, all on NFP mornings. Closing before the
  release costs a little in H2. ReimFX gives no NQ blackout rule.
- **Stress:** a tap that must trade through by a tick plus 2 extra ticks of slippage cost $4.8k together: 2026 +$36.9k, PF 3.31.
  Both halves stay clearly profitable. Targets are run through by more than a point, never just touched.
- **Evidence the report asked for (2026, 120 trades):**
  - Win rate 26.7%; the true rate could be anywhere from 19.6% to 35.2% (95% Wilson interval).
  - The average win ($1,794) is 10× the average loss ($178), so LIT breaks even at a 9.0% win rate.
  - Expect up to 12 non-winners in a row and 7 stop-outs in a row.
  - By session: 02:00-05:00 ET +$26.1k (PF 4.11); 05:00-08:00 +$9.0k; 08:00-09:30 +$4.0k; after 09:30 only 10 trades (+$2.7k).
  - By side: longs +$20.0k (PF 4.16), shorts +$21.7k (PF 3.33). By VIX: profitable in every band; VIX ≥ 20 best (PF 8.19).
  - Overfitting check: of the 10 report variants that did best in H1, only 1 was positive in H2 (+$10).
- **Optional for the owner (not an edge):** the London box in Berlin time (ReimFX's 09:00-10:00 Berlin = 04:00-05:00 ET in the
  weeks the US and Europe change clocks on different dates). No effect in 2026, +$2.6k in 2021-25. If adopted, the next change in
  behaviour is Oct 26-30, 2026.

## Still missing (not in the bot, not tested)

- **Ideas the report leaves undefined, or entry models that are not LIT:** trendline traps, the "zone reacts, then fails" smart
  money trap, a breakout-continuation entry, a deeper-zone continuation, ETM's early recross of the operating candle's open,
  rejection block and unicorn entries, EDM/LET.
- **Data and clock:** the contract roll in the live window (most important, before the December roll: Yahoo NQ=F's unadjusted bars
  are joined to the back-adjusted file, so the prior week's and month's levels can sit on old-contract prices for up to 5 weeks);
  a rule-based holiday calendar instead of CME's versioned one; no "unknown" state for missing data; the NQ-to-MNQ price mapping is
  not written down; no exception procedure for a fill at or through the stop; no exchange states (not needed while paper).
- **Journal:** rule adherence vs result, a cause for each loss, no-trade reason codes, the chart at decision time, the time-zone
  database version and data-file hashes.

## Files and how to rerun

- `python tools/lit_report2.py check`: the copy equals LIT live (120 trades, +$41,734). `test` runs every variant (1 process,
  about 15 min). `facts` prints the evidence numbers. `save` stores `lit_rep2_*`. Results: `research/lit/report2_results.json`.
- Item list: `research/lit/report_inventory.md`. First pass: `research/writeups/lit-report-tests.md`.
