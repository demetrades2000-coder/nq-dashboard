## In one minute (owner summary)

- **Yes, stacking Rapid EOD accounts makes money on the 2026 trades.** It needs two written answers from MFFU first (below).
  It also **breaks your 2-week eval rule**: a Rapid EOD eval takes about 2 months to pass (median 41-43 sessions), and a
  Rapid eval about 5 weeks (22-27). No sizing fixes that (see "Why the Rapid eval is slow").
- **The news ban is small on the real calendar.** On CPI, jobs report (NFP), FOMC and FOMC-minutes days the bot must be
  flat from 2 minutes before to 2 minutes after the release. In 2026 that touched **5 of 120 trades**, not 25. Jan-Jun lost
  nothing (+66 points, two losers got closed early). Jul-Oct lost 501 points, mostly on one trade: the 14 Oct CPI-day
  short (+290 points in the replay, −41.5 if closed at 08:28).
- **Rapid EOD beats Rapid** for the bot. The money is about the same, but it loses a funded account half as often
  (9-12% in 6 months vs 16-22%), because its floor moves only at the close.
- **Stacked copies win and lose together.** Accounts bought the same day are identical (same signals, same size, same
  rules). Five accounts give 5× the money and the same 36% (Jul-Oct) chance that all of them pay nothing in 6 months.
  Buying them a week apart barely changes that.

| (6 months from buying, net of fees, 2026 Monte Carlo) | Jan-Jun $/mo | **Jul-Oct $/mo (quote this)** | Jul-Oct months 4-6 $/mo | Jul-Oct: 6 months lose money | Jul-Oct: all pay $0 in months 4-6 | cash up front | 2021-25 $/mo |
|---|---:|---:|---:|---:|---:|---:|---:|
| Builder + Lucid + FundedNext (the plan in `lit-funded-firms.md`) | $2,315 | **$1,754** | $2,373 | 7.8% | 11.9% | $377 | −$92 |
| Builder + 1 Rapid EOD | $2,634 | **$1,220** | $1,824 | 9.7% | 15.7% | $186 | −$35 |
| Builder + 2 Rapid EOD | $4,650 | **$1,879** | $2,866 | 9.8% | 15.7% | $280 | −$49 |
| Builder + 3 Rapid EOD (the stated cap) | $6,666 | **$2,538** | $3,908 | 10.2% | 15.7% | $374 | −$63 |
| Builder + 1 Rapid EOD + Lucid + FundedNext | $4,331 | **$2,413** | $3,416 | 7.7% | 11.3% | $471 | −$106 |
| Builder + 3 Rapid EOD + Lucid + FundedNext | $8,363 | **$3,730** | $5,500 | 8.8% | 11.3% | $660 | −$134 |
| Builder + 3 Rapid EOD + 2 Rapid (if the caps are separate) | $11,699 | **$3,998** | $5,976 | 14.9% | 14.9% | $563 | −$205 |
| Builder + 1 Rapid (intraday floor when funded) | $3,135 | **$1,291** | $1,815 | 10.3% | 15.6% | $186 | −$92 |

- **Verdict:** the best use of MFFU Rapid is **1 Rapid EOD next to Lucid + FundedNext**, not a pure MFFU stack. Jul-Oct
  rises from $1,754 to $2,413 a month for $94 more, and the risk of nothing paying stays the same (11.3%). Going to 3 Rapid EOD
  adds ~$660 a month (Jul-Oct) per account, but every extra copy is the same bet again, and everything sits with one firm. If
  MFFU closes or changes the plan, it all goes at once. Do not buy any Rapid until MFFU answers questions 1-3 below in
  writing. 2021-25 (LIT has no edge there): every mix loses money, so this is a bet that 2026 continues.
- Prices assume your 40% MFFU code on the $157 list ($94.20). At list price, add $63 per Rapid account. Rapid (not EOD) is
  modelled as a monthly renewal, which is the worse case.

## The rules (searched 2026-10-19)

The MFFU pages could not be opened from this machine (DNS blocked), so every value is the search engine's reading of the
page. "Confirmed" means several sources agree. All of it is in `research/lit/mffu_rapid_stack.json` → `rules` with sources.

| rule | Rapid 50K | Rapid EOD 50K | status |
|---|---|---|---|
| eval target / max loss | $3,000 / $2,000 EOD trailing | $3,000 / $2,000 EOD trailing | confirmed |
| eval daily loss | none | none | confirmed |
| eval best day (consistency) | ≤ 50% of the eval profit | **≤ 30%** of the eval profit (eval only) | Rapid: conflict (one source: none); EOD: confirmed |
| eval min days | 2 | 4 | confirmed |
| max size | 5 minis / 50 micros | 3 minis / 30 micros | Rapid unconfirmed, EOD confirmed |
| price | $157 list, 30-day renewal per an Aug-2026 guide (MFFU went one-time for Builder on 2026-08-25) | **$157 one-time**, 365 days (Aug 2026; the 20% code ended) | conflict / confirmed |
| funded floor | **intraday** trailing $2,000 (open P&L counts), locks at +$100 | **EOD** trailing $2,000 | confirmed |
| payouts | daily, after the $2,100 buffer, $500 min, no stated cap, 90%, no consistency | daily, $2,100 buffer first, $500 min, then ≥ $500 profit since the last one, no cap, 90%, no consistency | confirmed (help center + news) |
| move to live | after a $10,000 day or a risk decision (profit above forfeited) | not found | unconfirmed |
| **funded news** | Tier-1 banned: no position or working order from **2 min before to 2 min after** FOMC (statement / meeting), FOMC minutes, the Employment Report (NFP), CPI (EIA / ag reports only for those markets). Evals: allowed. Penalty: not stated | same as Rapid | confirmed in substance (third-party wording; the MFFU page itself was not readable) |
| accounts | up to 5 active sim-funded on 25K/50K plans (Builder: 1) | **3** sim-funded Rapid EOD (MFFU on X) | unconfirmed; whether the caps are shared with the Builder: **not stated anywhere** |
| bots | allowed when set to your own parameters; HFT and sim-fill exploits banned. Some third-party guides say "semi-automated only" | same | conflict |
| copying across your own accounts | not stated; fair-play bans copying / coordinating trades "for an unfair advantage" | same | **unconfirmed: ask** |

Sources: <https://myfundedfutures.com/plans/rapid>, <https://myfundedfutures.com/plans/rapid-eod>,
<https://help.myfundedfutures.com/en/articles/16158363-rapid-eod-50k-a-comprehensive-look>,
<https://help.myfundedfutures.com/en/articles/13745661> (Rapid payouts),
<https://help.myfundedfutures.com/en/articles/8230009-news-trading-policy>,
<https://help.myfundedfutures.com/en/articles/8444599-fair-play-and-prohibited-trading-practices>,
<https://www.financemagnates.com/forex/myfundedfutures-trades-intraday-drawdown-for-a-30-consistency-rule/>,
<https://www.eltraderfinanciado.com/en/news/myfundedfutures/my-funded-futures-launches-rapid-eod-50k-august-2026>,
<https://proptradingvibes.com/blog/myfundedfutures-rapid-eod>, <https://proptradingvibes.com/blog/myfundedfutures-news-trading-policy>,
<https://phidiaspropfirm.com/education/myfundedfutures-news-trading>, <https://proptradingvibes.com/blog/myfundedfutures-pricing>,
<https://proptradingvibes.com/blog/myfundedfutures-position-limits>, <https://propfirmsfinder.com/prop-firm/my-funded-futures/payouts/>,
<https://daytradingz.com/my-funded-futures-review/>, <https://propfirmapp.com/?p=265>, <https://blog.traderspost.io/article/my-funded-futures-review>,
<https://fundedtrading.com/propfirm/my-funded-futures/>.

## The Rapid eval (fresh eval on every session, no reset, 60 sessions)

| | p10 / f10 H1 · H2 | dec10 H1 · H2 | p15 / f15 H1 · H2 | p20 H1 · H2 | eventual pass / fail H1 · H2 | pass_med H1 · H2 | slow_pass H1 · H2 | $ per pass H1 · H2 |
|---|---|---|---|---|---|---|---|---|
| Rapid 50K (picked: "one winner passes" + best-day guard, ≤ 40% of room, ≤ $600 a trade) | 9.4 / 0 · 6.4 / 0 | 9.4 · 6.4 | 18.0 / 0 · 20.5 / 0 | 32.0 · 24.4 | 66.4 / 0 · 79.5 / 0 | 22 · 26.5 | 73 · 74% | $238 · $219 |
| Rapid EOD 50K (picked: normal LIT size, ≤ 60% of room, 30% day guard) | 0 / 0 · 0 / 0 | 0 · 0 | 2.3 / 0 · 0 / 0 | 7.0 · 2.6 | 47.7 / 0 · 57.7 / 0 | 43 · 41 | 95 · 100% | $198 · $163 |
| reference 2021-25 (Rapid · EOD) | 1.5 / 0 · 0 / 0 | | | | 24.3 / 35.9 · 1.8 / 10.0 | 37 · 51 | | $986 · $5,315 |

- Monte Carlo (2,000 evals, 60 sessions): Rapid p10 8.3 / 9.6%, eventual pass 79 / 77%; Rapid EOD p10 1.0 / 0.1%,
  eventual pass 55 / 58%. The exact "eventual" column runs out of data for late starts (H2 has 78 sessions), so the
  MC figure is the fairer eventual pass.
- **Why the Rapid eval is slow (and no sizing fixes it):** the best day must be ≤ 50% of the total. If any day lost
  money, two winners can never pass. Day 1 being the best needs day 2 ≥ day 1 + the losses; day 2 being the best needs
  day 2 ≤ day 1 − the losses. So you need **3 winning days**; under the 30% rule you need **4**. LIT wins 27% of its 2.9
  trades a week. In 2026 only 12% (Jan-Jun) / 31% (Jul-Oct) of 10-session windows hold 3 winning days, and 1% / 14% hold
  4. That is the ceiling for p10 with perfect sizing.
- **New sizing tried ("plan"):** the first winner aims at $A, later winners match the best day so far (so the best day
  never rises), and it passes the day one winner fits the pass window. Grid: A × room cap × $ cap × at most k × the
  normal LIT size, 200+ settings. It did **not** beat the old guard. Sizing winners to a $ amount puts more risk on low-R
  trades, and the losers between winners eat the total. Best plan settings: Rapid p10 9.4 / eventual 55.5% (old guard
  66.4%); Rapid EOD p10 0 / eventual 36.7% (old 47.7%). The picks above are therefore the `lit-funded-firms.md` settings.

## The funded Rapid with the real Tier-1 calendar

Calendar: `data/news/events.csv` + `ff_archive.csv` (the 14 Oct CPI) + FOMC minutes (decision + 21 days, which matches
all six 2026 dates). Releases: 08:30 for CPI / NFP, 14:00 for the FOMC statement and minutes, 14:30 for the press conference.
In the model, a trade open at release − 2 min is closed at that minute's open (1 tick of slippage), and an entry inside the window is
skipped. 2026 has 19 Tier-1 days in H1 and 13 in H2 (to 16 Oct).

| 2026 trades touched | H1 | H2 |
|---|---|---|
| trades on Tier-1 days | 13 of 80 | 9 of 40 |
| closed early by the rule | 2 (09 Jan BE → +37 pts; 08 May stop −34 → −5.5) | 3 (02 Oct NFP: +193 → +75; 07 Oct minutes: +180 → +130; 14 Oct CPI: +290 → −41.5) |
| points lost | **−66 (gained)** | **+501 (38% of H2's points)** |

Funded sizing (picked on H1, the same with or without the rule): **risk 60% of the room, at most $1,200 a trade, no
winner cap**, weekly-stop half size, skip a trade if 1 micro could reach the floor.

| funded, 6 months (1,500 paths) | Rapid H1 · H2 | Rapid EOD H1 · H2 |
|---|---|---|
| $ a month, **real calendar** | $3,224 · **$1,078** | $3,612 · **$1,291** |
| $ a month, no news rule | $3,074 · $1,345 | $3,464 · $1,607 |
| $ a month, worst case (every 08:30 trade skipped, the old estimate) | $1,003 · $378 | $1,215 · $484 |
| funded account lost in 6 months | 16.3 · 22.4% | **9.4 · 11.9%** |
| pays $0 in 6 months | 20.0 · 31.4% | 8.2 · 18.3% |
| first payout (median sessions after funding) | 14 · 14 | 13 · 15 |
| 2021-25 reference: $ a month / lost | $80 / 66% | $130 / 64% |

- One account, 6 months from purchase, net of fees: Rapid $2,517 / **$730** a month (H1 / H2), Rapid EOD $2,016 /
  **$659**. In H2 a third of 6-month windows (34-36%) lose the fees, because the eval takes 1-2 months and the
  first payout ~3 more weeks.
- Not modelled: resting bracket orders inside the window (MFFU says "no positions **or orders**": the bot would have to
  pull the stop/target too, so it simply flattens); re-entry after the window (LIT trades once a day); the 14:30 press
  conference may not count as Tier-1 (treated as Tier-1 here, the stricter reading).

## Stacking N accounts

- **Per-account sizing:** each account keeps the sizing above on its own room, floor and payouts. Bought the same day,
  the copies stay identical. Bought a week apart they differ a little: in H2, the chance all pay $0 in months 4-6 is 15.5% vs
  15.7%, and losing at least one funded account goes 7.1% → 7.7% (N = 2).

| Jul-Oct (H2), with the Builder, bought the same day | N=1 | N=2 | N=3 | N=4* | N=5* |
|---|---:|---:|---:|---:|---:|
| Rapid EOD: $ a month (6 months) | $1,220 | $1,879 | $2,538 | $3,197 | $3,856 |
| Rapid EOD: months 4-6 $ a month | $1,824 | $2,866 | $3,908 | $4,950 | $5,992 |
| Rapid EOD: 6 months lose money | 9.7% | 9.8% | 10.2% | 11.3% | 12.3% |
| Rapid EOD: all pay $0 in months 4-6 | 15.7% | 15.7% | 15.7% | 15.7% | 15.7% |
| Rapid: $ a month (6 months) | $1,291 | $2,021 | $2,751 | $3,480 | $4,210 |
| Rapid: 6 months lose money | 10.3% | 13.8% | 15.9% | 17.5% | 18.8% |
| cash up front (40% code; list +$63 each) | $186 | $280 | $374 | $469 | $563 |

\* above the stated cap of 3 Rapid EOD; Rapid 4-5 only if MFFU's 5-account cap is not shared with the Builder.

- Jan-Jun (H1) for the same rows: Rapid EOD $2,634 → $10,698 a month, Rapid $3,135 → $13,201. 2021-25: Rapid EOD
  −$35 → −$91, Rapid −$92 → −$377 a month, 87-94% of 6-month windows negative.
- **All lose together:** without the Builder, N Rapid EOD copies all lose a funded account in 5.5% (H2) of paths and all
  pay $0 for 6 months in 36%, for every N. The Builder is the only account that differs (different rules), so adding it
  lowers "all pay $0 in 6 months" to 9.7%.
- **Your cash at risk is the fees, not the account size.** A blown sim account costs a new eval ($94), and the 6-month
  fee bill for N Rapid EOD is ~$100 × N.

## Exact questions for MFFU support (ask in writing, keep the reply)

1. "I hold a Builder 50K. Can I also hold Rapid EOD 50K (and/or Rapid 50K) sim-funded accounts at the same time? Are the
   limits (1 Builder, 3 Rapid EOD, 5 on 25K/50K plans) separate per plan or one shared cap? How many Rapid EOD evaluations
   can be open at once?"
2. "I run my own automated NinjaTrader strategy. May the same strategy trade several of my own MFFU accounts at the same
   time (same signal, same entries), either as separate strategy instances or through a trade copier? Is there a limit
   on the combined position across my accounts?"
3. "Rapid / Rapid EOD sim-funded Tier-1 rule: exactly which releases count (CPI, Employment Report, FOMC statement, FOMC
   press conference, FOMC minutes; PPI, PCE, GDP?), and is the window 2 minutes before to 2 minutes after? Must a position
   opened hours earlier be closed before the window? Do resting stop-loss / take-profit bracket orders count as 'orders'?
   What happens on a breach (account closed, that day's profit removed, warning)?"
4. "Is the Rapid 50K a one-time payment or monthly now? What is the current Rapid EOD 50K price, and is there a code?"
5. "Rapid EOD evaluation 30% rule: is it the best session's net P&L divided by the total net profit including losing
   days? What is a session (18:00-17:00 ET)?"
6. "Rapid EOD funded: any cap per payout, days between payouts, or winning-day requirement? When does a Rapid EOD move
   to live, and does a live move end my other sim-funded accounts?"

## How it was measured

- Trades: the 120 live LIT trades of 2026 (run `lit_live`, 1m entries), $1.90 a micro, 1 tick of slippage; 2021-25 =
  5m entries (reference). The same eval / funded / 6-month engines and the same Monte Carlo paths as
  `lit-funded-firms.md` (its Builder + Lucid + FundedNext result is reproduced exactly: $2,315 / $1,754).
- Eval: exact = a fresh eval on every session of the half, played on that half's sessions, no reset. Sizing picked on
  H1 by p15 − f15 + ½ (p60 − f60); H2 is the check. $ per pass = fees (price × months for a monthly plan) / passes.
- Funded: 1,500 paths × 126 sessions (5-session blocks); sizing grid (`engine.sizing.funded_qty`: 25/40/60% of the room ×
  $800/$1,200 × winner cap) picked on H1. News rule on the funded account only.
- Stacks and mixes: every account on the same 1,500 paths (same trades), the 6-month life model (eval → funded; a fail or
  lost account → a new eval the next session; net = payouts − fees).
- Code: `tools/lit_mffu_rapid_stack.py` (`all`, then `save`; `news` prints the news effect). Numbers:
  `research/lit/mffu_rapid_stack.json` (rules + sources, news detail, eval grids, funded grids, every stack and mix).
  Runs: `lit_mrs_rapid`, `lit_mrs_rapid_eod` (back-to-back real history, funded trades with the news rule).
- Not built: multi-account routing in `engine/ninjatrader.py` (one account per order today), a per-account
  sizing state and the news flatten (`lit-funded-firms.md` checklist item 3). Nothing live changed.
