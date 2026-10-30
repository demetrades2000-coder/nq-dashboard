# Prop ledger, business P&L and quarterly taxes: text for the Help sheet and README (merge by hand)

Deep links: `#prop`, `#business`, `#taxes`. New synced collections: `propacct`, `taxcfg`, `taxpay` (Business P&L stores nothing; the bulk tag helper edits existing money entries).

## Help sheet bullets (one line each, same style as the others)
- **Prop firm ledger** (card on Today, or `#prop`): every eval and funded account you have tried, with its fees (eval, resets, monthly data fees) and the payouts you received. It says in one plain line what the evals have cost you and paid ("Evals have cost you $427 and paid $1,500: net $1,073") and shows ROI, pass rate, cost per pass, average days to pass and how much more you need in payouts to break even. Accounts that match a live dashboard account by name show its profit, target and sessions left. Typed by hand.
- **Business profit and loss** (card on Today, or `#business`): income and expenses from the money log for each project (Clipper, bots, portfolio, others) with untagged entries shown separately, a 6-month bar chart, best and worst month and a running year to date. **Tag untagged entries** lets you assign a project to many old money entries at once, with Undo. The mileage and tools deduction from Miles is a separate line (not cash).
- **Quarterly taxes** (`#taxes`; a **Tax due** card on Today in the 3 weeks before each date): an estimate of what to set aside, from money in and out tagged to a project (plus live and paper trading P&L if you tick it, minus the mileage deduction), at a rate you type (starts at 25%, an assumption). The US estimated-tax dates (Apr 15, Jun 15, Sep 15, Jan 15) show on the calendar as red all-day **Tax due** items. Log what you paid to see paid against suggested per quarter. An estimate, not tax advice: confirm with a tax professional, and note that futures trading may be taxed differently (Section 1256, 60/40).

## README additions
### Prop firm ledger (`#prop`)
- One entry per eval or funded account: firm, name, size, start date, status (eval running, passed, funded, payout received, failed), the date it passed or failed, your profit split, and an optional link to a live dashboard account. Fees are separate lines (eval fee, reset fee, monthly data fee, activation fee, other) and payouts are separate lines (amount and date).
- Totals: total spent, total paid out, net, ROI (net divided by spent), pass rate (passed accounts of passed plus failed), cost per pass (spent divided by passes), average days from start to pass, and the break-even payout still needed (spent minus paid out, plus the profit that takes at your split).
- Each fee and payout has an optional "also log in the money log" checkbox (off by default). When ticked it adds a money out or money in entry tagged with the account's project (default: NQ bot); removing the fee or payout removes that money entry.
- Dashboard accounts that are not in the ledger yet are offered as one-tap chips that prefill the form.

### Business profit and loss (`#business`)
- Reads the money log only. Entries whose project tag is empty or points to a deleted project are "Untagged" and shown on their own row, never mixed into a project.
- Per project: income, expenses and net for the month shown, plus year to date. Pick a row to filter the 6-month chart (income and expenses bars drawn to scale, net under each month), best and worst month of the year, and the month-by-month running total.
- The mileage and tools deduction (Miles log) is a separate non-cash line. Expenses you added to the money log through Miles (the checkbox) are skipped there so nothing counts twice.

### Quarterly tax planner (`#taxes`)
- Net business result for the tax year = money in tagged to a project, plus live and paper trading P&L if ticked, minus money out tagged to a project, minus the mileage and tools deduction. Untagged entries are left out unless you tick that box. When trading P&L is ticked, payouts logged by the prop ledger are left out of income so they are not counted twice.
- Suggested payment per quarter = that quarter's net result times your rate (never below zero). Quarters are the IRS payment periods: Jan-Mar (due Apr 15), Apr-May (Jun 15), Jun-Aug (Sep 15), Sep-Dec (Jan 15). A due date on a weekend moves to Monday; holidays are not checked.
- Log each payment with its date and quarter. The table shows suggested against paid, and a quarter past its date with a shortfall is marked Late.
- The due dates are drawn on the calendar when it is built (never stored), so turning them off or changing the rate never leaves copies behind.
- Always an estimate from your own numbers, not tax advice.
