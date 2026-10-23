## In one minute
- The backtest's timing is honest. Fixing every clock and bar-edge issue costs about $500 of 2026's $41.7k (1.2%), almost all in H1.
- Quote H2's eval odds on full windows: 2-week pass 17.4% (not 23.1%), 1 month 32.2% (not 44.9%) at the LIT size. The two_week numbers (52.9 / 50.7%) were already on full windows.
- NQ/ES divergence as a size rule: rejected. Note: this is the market divergence; LIT's "SMT" (smart money trap) is a different idea, tested in `lit-adv-continuation.md`.

## Part 1: the audit (chapter 7)
How: `python tools/lit_adv_audit.py audit` re-makes the live LIT trades with engine/lit.py run_x (120 trades, +$41,734, the same as run `lit_live`) and checks every trade bar by bar. Results in `research/lit/adv_audit.json`.

| Check | 2026 trades | $ | Meaning |
|---|---:|---:|---|
| Stop/breakeven bar also reached the target (order unknown) | 0 | 0 | the 1m entry is at the bar's open; nothing is ambiguous |
| Exit on the fill bar | 0 | 0 | |
| Stop bar opened beyond the stop (a real stop fills at the open) | 1 (06-17) | -20 | backtest a little kind |
| Target bar opened beyond the target | 0 | 0 | |
| 1m minutes missing inside a trade (windows that do not rebuild the 5m bar) | 9 trades, 50 min | -165 | fix "gap5m" (fill each dropped window with its 5m bar): 1 trade changes, 05-05 (run lit_adv_audit_gap5m) |
| Flat 15:55: backtest = close of the 15:55 1m bar, bot = 15:55:00 | 8 | -32 | |
| Exit inside the 15:55 bar (the bot is already flat) | 1 (09-18) | +74 | |
| Early-close holidays held to the 13:00 halt (bot flattens 5 min before) | 3 | -358 | 06-19 is -$343 |
| Fills after 15:30 / on another date than the day label | 0 / 0 | | |
| 5m setup close to 1m fill | median 11 min, max 37 | | by design (30-min limit + 1m CISD) |
| Timezone / DST | 0 mismatched bars | | 2 London-box trades in US-only DST weeks (+$5,756): the Berlin-time boxes change nothing (lit-report-tests.md) |
| Lowest point set on the exit bar | 13 | | only makes the eval's intraday low a little worse (safe side) |
| Open or dropped trades at the data end | 0 | | |
| Worst day vs MFFU's $1,000 soft daily loss | -$797 | | runlib does not model the daily loss; harmless at this size |

Scoring: an eval started 5 sessions before the data ends can only pass early or stay open. Counting only full windows (`runlib.eval_speed(full_only=True)`, default off):

| Span | 2 wk now | full windows | 1 mo now | full windows |
|---|---:|---:|---:|---:|
| 2026 | 26.7 / 1.9 | 24.9 / 2.0 | 55.3 / 3.9 | 52.4 / 4.3 |
| H1 | 28.9 / 3.1 | 28.9 / 3.1 (letting starts run into July) | 61.7 / 6.2 | 61.7 / 6.2 |
| H2 | 23.1 / 0.0 | 17.4 / 0.0 | 44.9 / 0.0 | 32.2 / 0.0 |

The live bot already flattens at 15:55:00 and before early-close halts, so nothing changes live. Realistic broker fills (latency, slippage, commission) are in `lit-live-fills.md`: about -$1.2k in 2026.

## Part 2: experiment 5, synchronized divergence
- Data: CME NQ1! and ES1! 5m from TradingView, same timestamps only. In 2026 ES has every NQ timestamp. Any missing ES bar in a level's defining bars or in the sweep window would make the trade "unknown".
- Matching: for each level NQ swept (session box, PDH/PDL, PWH/PWL, PMH/PML, build-up, NDOG/NWOG), ES's copy comes from the same bars. ES "took" it when it traded beyond the copy between the level's known bar and NQ's trigger bar. Closed bars only.
- Labels: NQ only = NQ took the level, ES held (10 trades); both = ES took it too (91); mixed (19); vice versa = a level of the same day that NQ held through the trigger while ES took its copy during the sweep leg (26).
- $ = the LIT size ($800 / 20 + weekly stop) × the rule. Eval odds under lit_qty two_week (live config C, full 10 / 20-session windows).

| Rule | Half | Net $ | Max DD | 2 wk pass/fail | 1 mo pass/fail | Δ net |
|---|---|---:|---:|---:|---:|---:|
| LIT live | H1 | +32,773 | -2,315 | 52.9/8.4 | 75.2/17.4 | |
| | H2 | +8,962 | -1,466 | 50.7/2.9 | 61.0/16.9 | |
| NQ only ×1.25 | H1 | +32,769 | -2,315 | 52.9/8.4 | 75.2/18.3 | -4 |
| | H2 | +9,042 | -1,624 | 50.7/2.9 | 61.0/16.9 | +80 |
| NQ only ×1.25, both ×0.75 | H1 | +26,090 | -1,677 | 19.3/4.2 | 45.0/10.1 | -6,683 |
| | H2 | +6,455 | -1,988 | 30.4/0.0 | 39.0/13.6 | -2,507 |
| NQ only ×0.75 | H1 | +32,845 | -2,315 | 52.9/7.6 | 75.2/17.4 | +72 |
| | H2 | +8,631 | -1,316 | 50.7/0.0 | 55.9/3.4 | -331 |
| Vice versa ×1.25 | H1 | +33,129 | -2,315 | 54.6/8.4 | 75.2/17.4 | +356 |
| | H2 | +9,389 | -1,466 | 50.7/2.9 | 61.0/16.9 | +427 |
| Vice versa ×0.75 | H1 | +32,488 | -2,201 | 57.1/7.6 | 75.2/13.8 | -285 |
| | H2 | +8,000 | -1,466 | 43.5/0.0 | 50.8/13.6 | -962 |
| Any divergence ×1.25 | H1 | +33,125 | -2,315 | 54.6/8.4 | 75.2/18.3 | +352 |
| | H2 | +9,469 | -1,624 | 50.7/2.9 | 61.0/16.9 | +507 |
| No divergence ×0.75 | H1 | +24,389 | -1,790 | 18.5/5.9 | 34.9/11.9 | -8,384 |
| | H2 | +6,594 | -1,361 | 27.5/0.0 | 42.4/3.4 | -2,368 |

Trades a week (3.12 / 2.56) and win % (22.5 / 35.0) are the same for every rule.

Why everything is rejected:
- The divergence trades are not better. NQ only: H1 4 trades at -$89 each, H2 6 at +$175. Vice versa: H1 $84 a trade vs $509 for the rest; H2 0.28R vs 0.66R.
- The ×1.25 rules add money in both halves only because more size makes money in a winning year. Sizing up the same number of random trades adds more: H1 +$1,542 on average vs the rule's +$315 (p 0.84); H2 p 0.44.
- Under two_week sizing a size-up is mostly capped. A size cut breaks "one winner passes".
- Earlier tests agree: `lit/filters.md`, `lit-losses.md`, `lit-untested-entries.md`, `lit-htf-confluences.md`, `lit-adv-continuation.md`.
- Experiment 6 (order-book gate): we have no order-book data; not testable.

## Files and how to rerun
- `python tools/lit_adv_audit.py audit` (about 2.5 min) → `research/lit/adv_audit.json`.
- `python tools/lit_adv_audit.py smt` → `research/lit/adv_smt.json`.
- `python tools/lit_adv_audit.py save` → stores the runs above.
