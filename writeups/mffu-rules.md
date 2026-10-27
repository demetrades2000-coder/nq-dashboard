> **Source and date.** All rules come from MFFU's help center and plan pages, searched on **2026-10-18**. The pages
> themselves could not be opened from the cloud sandbox, so each value is from the search engine's reading of the page.
> The machine-readable copy, with a source and a status (confirmed / conflict / unconfirmed) for every field, is
> `research/lit/mffu_rules.json`. Re-check the four "check" items below with MFFU support before the first payout.

## The rules (Builder 50K, what you bought for $91.80)

| Rule | Evaluation | Sim funded (after the pass) | Live (after 5 payouts) |
|---|---|---|---|
| Price | $153 list, **$91.80 paid**, one-time, $0 activation, no renewals | - | - |
| Profit target | **+$3,000** | - | - |
| Max loss | **$2,000 EOD trailing**: moves up only at the close, from the end-of-day high; **locks at $50,100** (start + $100). **Open losses count**: touching the floor intraday fails the account | same, from a $0 start, locks at +$100 | $2,000, static once the floor reaches $0 |
| Daily loss | **$1,000 soft**: trading paused for the rest of the session, account stays open | $1,000 soft | $1,000 soft |
| Consistency | **none** (one big day can pass) | best day **<= 50%** of the cycle's profit at payout time (not a fail: you trade more days) | none |
| Minimum days | **1** (check: the plan page says 2) | 2 trading days per payout cycle | - |
| Max size | **4 minis / 40 micros**, minis and micros count together, no scaling plan | 4 / 40 | not published |
| News | **allowed, no limits** (the Builder is the exception to the Tier-1 rule) | allowed | allowed, MFFU advises against it |
| Hours | from 18:00 ET; **flat by 16:10 ET** (auto-closed then); never overnight or over a weekend | same | same |
| Holidays | **half-days: MFFU does NOT auto-flatten**, you must be flat before the early halt | same | same |
| Bots | allowed with your own settings; **no HFT**, no exploiting sim fills; NinjaTrader supported (OIF/ATM not mentioned: check) | same | must follow CME rules |
| Copiers / others | nobody else may trade it, no device shared with another trader, no hedging (long + short same market, also across accounts); own-account copier not stated (check) | same | same |
| VPS / IP | no published rule (check) | | |
| Inactivity | **7 calendar days in a row without a trade: the account can be closed** | same | none |
| Accounts | - | 1 active Builder 50K sim funded per person | 1 |
| Payouts | - | clear the **$2,100 buffer**; first payout needs **$500 above it** (balance $2,600) and 48 h after the first trade; **$500 min, $2,000 max** per cycle, **80/20**, **5 sim payouts** then live | daily, $250 min, 80/20 |
| Commission | **MNQ $1.90**, NQ $4.68 per round trip (MFFU instrument list; one review says $1.74) | same | |
| Live breach | - | - | 21 days: no sim trading, no new evals or resets |
| Refund | none once you trade | | |

**Builder 25K ($63 paid):** target $1,500, $1,000 EOD trailing (lock +$100), $600 soft daily loss (the legacy 25K had
none), 2 minis / 20 micros, buffer $1,100, payouts $250-$1,000, 50% consistency, up to 2 sim-funded 25K accounts.

## Does the bot follow them? (`python -X utf8 -m tests.test_mffu_rules`)

**Yes: 43 checks ok, 0 broken rules.** The bot stays at 40 micros max (4 minis) and is flat at 15:55, 15 minutes before
MFFU's 16:10. It enters only 02:00-15:30 and goes flat 5 minutes before every CME half-day halt on the NinjaTrader route.
The eval tracker uses the right numbers ($3,000, $2,000 EOD, lock $50,100), and the funded constants match ($2,100
buffer, $500-$2,000, 80/20, 50%, 5 payouts). A full stop-out never comes near the max-loss floor: it stays under 60% of
the room, so open losses cannot fail you.

**5 gaps (none is a rule breach today):**

1. **Commission.** MFFU charges $1.90 per micro round trip, but the backtests and the sizing use $1.40. That costs
   about **$310-$350 a year** (2026: 621-697 micros traded), or about $3 a trade. In the "one winner passes" sizing it
   can leave a winning trade a few dollars short of $3,000, roughly 2% of the winners that should pass; the next trade
   then finishes the job.
2. **The 7-day inactivity rule.** In 2026 LIT went 7 or more calendar days without a trade 3 times (8 days after Mar 4,
   7 after Jun 8, 7 after Aug 3), and nothing warns you. **Until it is built: if no trade has happened for 5 days,
   place 1 MNQ by hand (in and out, a few dollars).**
3. **Minimum days.** The help guides say 1 day, but the plan page says 2. Once the target is reached, the bot never
   trades that account again. **If the eval is not marked passed the next morning, place 1 small MNQ trade yourself.**
4. **After the pass.** `lit_sizing.mode` stays `two_week` until you change it. On the sim-funded account switch it to
   `funded`, or the bot keeps sizing "one winner passes", which breaks the 50% payout rule.
5. **Daily loss.** At the real $1.90 cost, a full stop-out can reach **$1,008** against the $1,000 soft limit. That is
   only a pause, and the bot trades once a day anyway, so it costs about $0.

**Other things to know:** never run two bots (LIT and the old engine) on the MFFU account, because opposite positions
count as hedging. On half-days the PC must be on during a trade, because MFFU will not close a position for you. If you
ever move to Rapid or Pro, you will need a news filter (flat 2 minutes either side of CPI, NFP and FOMC); Builder does
not need one.

## Sources (searched 2026-10-18)
- Builder 50K guide: https://help.myfundedfutures.com/en/articles/14290805-builder-plan-50k-a-comprehensive-guide
- Builder 25K: https://help.myfundedfutures.com/en/articles/17036130-builder-plan-25k-a-comprehensive-look (legacy: .../15862870-builder-plan-25k-legacy-no-dll)
- Builder plan page: https://myfundedfutures.com/plans/builder
- EOD drawdown: https://help.myfundedfutures.com/en/articles/8348565-max-eod-trailing
- Permitted times to trade: https://help.myfundedfutures.com/en/articles/9558251-permitted-times-to-trade
- Instrument list (commissions, hours): https://help.myfundedfutures.com/en/articles/9735811-futures-instrument-list
- News policy: https://help.myfundedfutures.com/en/articles/8230009-news-trading-policy
- Fair play / prohibited: https://help.myfundedfutures.com/en/articles/8444599-fair-play-and-prohibited-trading-practices
- Hedging: https://help.myfundedfutures.com/en/articles/12011241-hedging-what-you-should-know
- Cross-instrument: https://help.myfundedfutures.com/en/articles/10244682-cross-instrument-policy
- Inactivity (one-time model): https://help.myfundedfutures.com/en/articles/16596524-inactivity-rule-one-time-payment-model
- Consistency: https://help.myfundedfutures.com/en/articles/11994562-consistency-rule-at-my-fundedfutures
- Payouts: https://help.myfundedfutures.com/en/articles/13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts
- Live FAQ: https://help.myfundedfutures.com/en/articles/12109396-comprehensive-faq-live-accounts-at-myfunded-futures
- Terms: https://myfundedfutures.com/terms
