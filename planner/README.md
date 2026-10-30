# Planner

## Where it runs

**claude.ai (the default):** https://claude.ai/artifact/L53tFQMxbGkhVdYZ7iKucR

- Your data is saved to your Claude account and syncs live to every device signed into it. There are no repos or keys to set up.
- The page's storage rules make it readable and writable only by you (and editors you add).
- `build_hosted.py` builds that page from `index.html`.
- **Bot events:** a daily scheduled task (7:37am ET) runs `bot/dashboard_events.py` on the NQ dashboard's `data.json` and saves the result as the `bots/nq` document. That brings in high-impact news with the windows when the bot pauses, FOMC days, early closes, clock changes and eval end dates.

**Self-hosted (optional):** the GitHub Pages and `planner-data` setup below still works, if you ever want the app off claude.ai.

A white, color-coded calendar, day planner and project tracker. It syncs between your phone and computer, and your bots can add events to it.

## Projects

The **Projects** tab (shortcut `P`) has a card for each project. It starts with Kalshi bot, NQ bot, Jarvis, Clipper and Portfolio. Each card shows:

- Status: Active, Blocked, Paused or Live.
- The next milestone and its due date. The milestone also appears on the calendar in the project's color.
- Progress, counted from the project's tasks.
- Open tasks, with priority and an optional due date.
- Project-tagged events coming up in the next 30 days.
- Notes and a link.

To tag something with a project:

- In any task box, write `#name`: `#kalshi fix order sizing`, `#nq review fills`, `#clip`, `#port`.
- Pick a project in the event editor.
- Have a bot pass `project=` (see below).

A task with a due date also shows in that day's plan.

- **App (this folder):** a static site with no data in it. It belongs in its own repo, `planner` (public, served by GitHub Pages), so the dashboard bot's publish can never delete it.
- **Data:** a private repo, `planner-data`.
  - `planner.json`: your events, tasks and event types. The app writes this file.
  - `bots/<bot>.json`: one file per bot. Each bot writes only its own file, so a bot can't change or erase your events.
  - Every save is a commit, so the repo history is a full backup you can roll back.

## One-time setup

1. **Create two repos on GitHub.**
   - `planner`: public, empty.
   - `planner-data`: **private**, empty.

   Give the Claude GitHub app access to both repos.
2. **Put this folder in `planner`.** Copy it to the repo root, then turn on Pages: Settings → Pages → Deploy from a branch → `main` / root. The app is then at `https://demetrades2000-coder.github.io/planner/`.
3. **Make a sync key.** Go to GitHub → Settings → Developer settings → [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
   - Repository access: *Only select repositories* → `planner-data`.
   - Permissions: *Contents* → **Read and write**.
   - Expiration: the longest available.
4. **On your computer,** open the app, then Connect (bottom of the sidebar). Paste the key.
5. **On your phone,** go to the computer and press **Link a device**. Open that link on the phone, then Share → Add to Home Screen. The link carries the key, so keep it private.

## Sync behavior

- The app syncs when it opens, about a second after each change, and every minute while it's on screen.
- Offline changes stay on the device and sync once you're back online.
- If the phone and computer edit at the same time, each event and task keeps its newest version. Deletes carry over to the other device.
- Bot events appear in their type's color with the bot's name. They're read-only in the app. **Dismiss** hides one on every device.

## Bots

`bot/planner_bot.py` uses only the Python standard library. Copy it next to any bot and set these environment variables:

```
PLANNER_TOKEN=github_pat_...                      # same kind of key as above (Contents: Read and write on planner-data)
PLANNER_REPO=demetrades2000-coder/planner-data    # this is the default
```

```python
from planner_bot import Planner
cal = Planner("Zlarior")                     # this bot writes bots/zlarior.json
cal.add("NY open", "2026-10-27", type="trading", start="09:30", end="11:30", repeat="weekdays", id="ny-open")
cal.add("Payout window", "2026-11-03", end_date="2026-11-05", type="deadline", id="payout-nov")
cal.remove("payout-nov")
cal.set_events([...])                        # replace all of this bot's events at once
cal.prune(keep_days=30)                      # drop old one-off events
```

```
python planner_bot.py --bot ATLAS add "Eval ends" 2026-11-14 --type deadline --id eval-end
python planner_bot.py --bot ATLAS list
```

- Pass `project="NQ bot"` (or `kalshi`, `jarvis`, `clipper`, `portfolio`) to file an event under a project.
- Give events a stable `id`. Then re-running updates the event instead of adding a duplicate.
- Calls that change nothing make no commit, so it's safe to call on every loop.
- In GitHub Actions, store the key as the repository secret `PLANNER_TOKEN`.
- Event types: `trading` (blue), `bots` (purple), `meetings` (teal), `business` (green), `content` (pink), `deadline` (red), `learning` (amber), `personal` (gray), or the name of any type you add in the app. Anything else shows as Bot ops.
- Times are 24h wall-clock times, exactly as you want them shown.

### Bot file format

You can write the file directly from any language:

```json
{
  "bot": "Zlarior",
  "events": [
    { "id": "ny-open", "title": "NY open", "type": "trading", "date": "2026-10-27", "start": "09:30", "end": "11:30", "repeat": "weekdays", "skip": ["2026-11-26"] },
    { "id": "payout-nov", "title": "Payout window", "type": "deadline", "date": "2026-11-03", "end_date": "2026-11-05", "project": "NQ bot", "notes": "Request before 4pm" }
  ]
}
```

Fields:

- `repeat`: one of `none`, `daily`, `weekdays`, `weekly`, `biweekly`, `monthly`, `yearly`.
- `until`: the last date a repeating event can happen.
- `skip`: dates where a repeating event doesn't happen.
- `project`: a project name or id (optional).
- Leave out `start`/`end` for an all-day event.

## Features (installed app)

- **Plan my day:** pick tasks (overdue and undated ones included), star the top ones, and auto-block them into free time. A "Now" bar on the phone shows what's happening now or next.
- **Time blocking:** tap a task, then Block time. Drag events to move them and drag the bottom edge to resize (long-press on touch). Swipe left and right to change day, week or month.
- **Task details:** steps, notes, link, time estimate and repeat. Quick add understands `call Sam fri 3pm #nq`.
- **Trading card:** eval progress, room above the floor, sessions left, bot status and the month's P&L, from the dashboard data.
- **Goals and Money:** targets with progress (manual, or live from the bots), plus an income and expense log with CSV export.
- **Habits, Journal, Weekly review, Day templates, Focus timer, Smart lists.** Bot P&L in the journal and review is the live and paper bots' results only, never the backtest. The app saves each day it sees, so the history grows over time.
- **Market news:** the dashboard's ForexFactory USD releases (high, medium and low, plus Fed speakers) and NQ mega-cap earnings go on the calendar, each layer switchable. London, NY AM and NY PM killzones are shaded on the day and week views. A News view lists upcoming releases with forecast and previous, headlines tagged risk-on/off, and a warning when the dashboard data is stale. All market times are converted from ET to the phone's own time zone.
- **Pre-trade checklist (Rules):** your own rules (or one-tap suggestions), a yes/no sheet each trading day, a streak of fully followed days and a 4-week grid. Status shows in the plan card and the phone Now bar, and Review shows the last 7 days.
- **Trades:** the closed live and paper trades from the dashboard (never the backtest), each with a note, 1-5 rating and tags. A summary shows the share tagged Followed plan and average R by tag. A "Path to payout" card turns the dashboard's remaining profit, sessions left and plan rules into a what-if estimate of weeks (simple arithmetic, not a prediction) and what a payout is worth after the split.
- **Risk alerts:** room above the loss floor under 25% (red) or 45% (amber), daily loss limit over 70% used, bot not running or a bot issue. They show in the Trading card and the Now bar, and say so when the dashboard data is stale.
- **Deep links** for the iOS Shortcuts app and Back Tap: `#today`, `#plan`, `#new-event`, `#new-task`, `#week`, `#day`, `#agenda`, `#projects`.
- **Work shifts:** the Shifts button (or `S`, or `#shifts`) adds weekly shifts for Outback, Electric or any job you add: pick the job, tap the days, choose how many weeks. It shows hours and pay per week from your hourly rate, and each job gets its own calendar color.
- **Paste a schedule:** in Shifts, paste lines like `Fri 10/30 4-10pm` and they become shifts for the selected job. Lines it can't read are listed, not guessed.
- **Tips:** Shifts has a one-tap tip log (it goes into Money) and shows tips and tips per hour for the last 30 days.
- **Week balance:** a Today card (and a sheet, `#week-balance`) that adds up the hours of your timed events per type for any week, shows bars against weekly targets you set once (Set targets), flags over/under, and shows free hours left assuming 8 h of sleep a day. All-day, bot and market events are skipped; targets sync as the `budgets` collection.
- **Earnings:** a Today card (and a sheet, `#earnings`) answering what you will make this week and this month, before tax: shift pay (hours x each job's hourly rate, including recurring shifts), live and paper bot P&L (never the backtest) and Money log "money in" entries, split by source, plus an editable monthly income goal (`incomegoal` collection) with a progress bar and the amount needed per week.
- **Conflict guard:** the shield button (or the banner on Today) opens Check my week: overlapping events (red) and work shifts that run into a NY killzone or a high-impact news pause (amber, in plain words such as "Outback 4pm-10pm starts during NY PM session"), for today and the next 7 days. All-day events and finished events are ignored; tap an issue to open the event.
- **Trading windows:** "When can I trade today?" on Today shows the free parts of the NY AM and NY PM killzones (local time) after shifts, events and bot news pauses, as chips like "NY AM 9:30am-10am free" or "NY PM blocked by Electric shift", plus the best free block of the week (up to 4 hours, outside the killzones) for deep work.
- **Bedtime planner:** finds tomorrow's first timed event, shift or (optionally) London / NY AM session, subtracts a get-ready buffer (default 45 min) and sleep (default 8 h) and says "Be asleep by 10:15 PM, wake 6:15 AM". Shown on Today in the evening and in the Plan day sheet; settings sync in the `guard` collection.
### Bills and cash flow
- **Bills and cash flow** (card on Today, or the link `#bills`): a list of your recurring bills (rent, phone, car, subscriptions, eval and prop-firm fees, a tax set-aside). Each has a name, an amount, how often it is due (every month on a day, every week, every 2 weeks, every 3 months or every year) and an optional last payment date.
- Bills show on the calendar as all-day red **Bills** items. They are drawn when the calendar is built, so they never add copies to your events. Tap one to open Bills. Hide them with the Bills event type like any other type.
- **30-day forecast** (an estimate): you type your balance. The line adds expected pay (calendar shift hours times each job's hourly rate, with an optional delay in days until pay arrives), the average of your last 4 weeks of live and paper trading (weekdays after today, only when it is positive, never the backtest) and money-log "in" entries dated after today. It subtracts your bills and money-log "out" entries dated after today.
- The lowest balance day is marked with a red dot. A plain warning says things like "You are short $240 before Nov 12 rent."
- **Tax set-aside**: a percentage (default 20%) of expected income, shown as a number. A checkbox takes it out of the line as well.
- Everything on that screen is labelled as an estimate. Bills, your balance and the settings sync with the rest of your planner.
### Tilt guard
- **Tilt guard** (card on Today): watches today's closed live and paper trades from the dashboard (never the backtest). Nothing triggers when there are no trades.
- A red **Stop trading** banner appears on Today, and in the Now bar on other screens, when you hit either limit: a number of losing trades in a row (default 2) or a daily loss in dollars (defaults to the smallest daily limit the dashboard reports, otherwise off). A live cooldown timer counts down from the trade that caused it (default 30 minutes). A daily loss stop stays up all day.
- **I understand, log why** opens a short sheet with quick reasons and one line of text. It adds a note to today's journal and marks the stop as acknowledged.
- The **discipline record** on the card counts, over the last 30 days, the days you hit a stop and respected it versus the days you started a new trade during the cooldown (or after a daily loss stop).
- Change the three numbers with **Settings** on the card (or the link `#tilt`). They sync with your planner. The guard is only as current as the last data the bot PC published; the card says when that data is old.
### Trade plan and debrief
- **Trade plan** (card on Today, weekdays, also the link `#trade-plan`): before the NY open, pick a bias (long, short, neutral), write the one setup you are allowed to take, a max number of trades and your key levels. It lists today's medium and high impact news windows in your local time and counts down to the NY open. One plan per day, synced.
- From 12pm New York time the card flips to a **Debrief** (the Plan and Debrief tabs switch by hand): trades taken against your max, live and paper P&L, wins and losses, "Did I follow the plan? Yes, partly, no" and a one-line lesson.
- It shows your plan-followed rate over the last 4 weeks (yes counts 1, partly counts half), and a link to the Weekly review.
- **Close out the day:** from 5 pm, Today shows your open tasks (move them to tomorrow in one tap), your first commitment tomorrow, and a box for one win from today.
Plain text for the Help sheet and README (merge by hand).

### Search and commands (Ctrl/Cmd+K, or the Find button in the header)
- Press Ctrl+K (Cmd+K on a Mac), or tap the magnifier button at the top, and type. One box searches your events, tasks, projects, goals, deals, money entries, jobs, habits, journal entries, trade notes and time entries at once. Results are grouped; tap one (or use the arrow keys and Enter on a computer) to open it.
- Type a command word to run it: "new event", "new task", "shifts", "plan day", "plan week", "earnings", "week balance", "check my week", "start timer", "time audit", "deals". Matching is forgiving, so "chk wk" finds "Check my week".
- Type a date to jump there: "today", "tomorrow", "next friday", "oct 5", "10/5", "in 3 days".
- Shortcuts typed in full: "new task call Sam fri" adds the task. "event dentist fri 3pm" opens the event editor filled in. "start clipper edit" starts the timer. "new deal Acme" starts a deal.
- With the box empty it shows your last 5 choices and the common actions. The last 5 choices are kept on this device only.
- Deep link: open the app with #search at the end of the address.

### Time log (what you actually did)
- On the Today screen, the Time log card asks "What are you working on?". Type it, optionally pick a type and a project, and tap Start. Recent things show as one-tap chips to start them again. On a phone the Now bar (on every screen except Today) has a Timer button to start and stop it.
- The timer keeps its start time, so closing the app or reloading never loses it. Starting a new timer stops the old one. Stop writes the end time and tells you how long it was (Undo is offered).
- "Log time I forgot" adds a past entry: pick the day and times, or tap Last 30 min, Last hour, Last 2 hours.
- A timer running over 8 hours is flagged: you get a warning on Today and the Now bar and a question when you open the app. Use Stop at 8 h, or Set the end time. A running timer is never counted past 8 hours in the audit.
- Time audit (button on the card, or Ctrl+K and "time audit"): hours you logged this week by project (or event type if there is no project) next to what you planned on the calendar, your top 3 time sinks, and plain sentences such as "You planned 6 h of Clipper and logged 2.5 h." Planned hours are timed calendar events; all-day, bot and market events are not counted. Tap an entry to fix or delete it. Use the arrows for other weeks.
- Deep links: #timer (start sheet) and #time-audit.
- Time entries sync and back up with the rest of your data.

### Deals (business pipeline)
- Open it with the Open board button on the Deals card on Today, or Ctrl+K and "deals", or the address ending #deals.
- Stages: Lead, Talking, Proposal, Won, Lost. Each card has a name, what it is (client, sponsor, job opportunity, other lead), a dollar value, a next follow-up date and notes. Tap a card to edit it.
- On a computer, drag a card to another column. On a phone, use the Move to buttons on the card.
- Totals at the top: open pipeline value (Lead, Talking and Proposal), won this month, and win rate (won out of won plus lost).
- Follow-up dates of open deals show on your calendar as all-day items called "Follow up: name" (red when overdue; tap one to open the deal). On Today, the Deals card lists a "Follow up today" chip for every deal due today or overdue (overdue ones are red).
- Moving a deal to Won shows a Log the money button. It opens the Money entry sheet already filled in (money in, the deal value, "Won: name", today). Once saved the card says Money logged.
- Waiting on: a small list under the board for who owes you what (person, what, since when). It turns amber after 3 days and shows on Today as an amber chip. Tap Got it when it arrives.
- Deals and the waiting list sync and back up with the rest of your data.
#### Edge finder
- **Edge finder** (card on Today, or the link `#edge`): answers "where do I make and lose money?" from the closed live and paper trades the dashboard published (never the backtest, last 300 trades kept in the app).
- Shows an equity curve with the biggest drawdown marked, net P&L, win rate, average win and average loss, expectancy per trade, profit factor, and your best and worst day.
- Breaks results down by weekday and by entry hour (New York time, with your local time in brackets when you are not in New York), by trade tag from your Trades notes, and compares plan followed against not followed (the Followed plan tag, the trade plan debrief and the journal rules answer).
- Ends with up to three plain sentences worked out from the numbers, for example "Your Tuesdays lost $X over N days". A weekday, hour or tag needs at least 5 trades (and plan or rules comparisons at least 3 days on each side) before it is used; smaller groups are greyed out and the sheet says "not enough trades yet". These are patterns in your own past trades, not predictions.

#### Daily score and streaks
- **Daily score** (card on Today, or the link `#score`): a 0 to 100 score for the day from what the app already knows: shifts worked (past scheduled shifts count as worked), tasks done, habits done, journal rules answer, trade plan followed, tilt stops respected and workout logged.
- The weights are shown on the sheet (shifts 15, tasks 20, habits 15, rules 15, plan 15, tilt 10, workout 10) and each part can be ticked on or off. The choice syncs with your planner.
- A part with no data that day (no shift, no tasks planned, no stop hit, rules not answered yet) is left out of the maths instead of counting as zero. A workout counts as zero only if you logged one in the 14 days before; switch it off if you take rest days.
- Shows what is missing today ("+17 if you log your workout"), a 14-day sparkline, your current streak of days at 70 or more and your best streak in the last 120 days. Days with nothing to score are skipped, and today only extends the streak once it reaches 70.

#### Net worth and savings
- **Net worth and savings** (card on Today, or the link `#worth`): your own list of accounts (cash, savings, brokerage, prop-firm payouts owed to you, other assets, and debts), with balances you type. Nothing is read from a bank or broker.
- Every time you add an account or change a balance the app stores a dated snapshot, which draws the 6-month line and the "change this month" figure.
- **Savings goal**: type a target and a date to see how much to save per month, counting your savings accounts.
- **Emergency fund**: months of expenses your cash and savings would cover, using the average monthly total of your Bills. If you have no bills, type your monthly expenses instead.
- All three features sync with your planner like the rest of your data.
### Phone alerts
- **Phone alerts** (button under Calendar alerts in the side menu, card on Today, or the link `#alerts`): your iPhone app cannot push notifications, so this saves a calendar file with reminders for the next 60 days. Open the file on your iPhone and tap **Add All** (pick a new calendar called Planner so you can delete it to start clean).
- It covers your work shifts (default 90 minutes before), your own events (10 minutes before), bills (default the day before at 9am), deal follow-ups (9am on the day), the NY trading sessions (15 minutes before) and high-impact news (15 minutes before). Turn each type on or off and pick its lead time in the sheet; the choices sync with your planner.
- Repeating events are written out one day at a time, so skipped days and end dates are right. Each item has a fixed ID, so saving and importing the file again updates items instead of duplicating them. Items you delete later stay on the phone until you delete the Planner calendar, so re-import into a fresh one now and then.
- Times are "floating" local times: they follow the time zone of your phone, which is what you want for shifts and bills. The Calendar alerts button is the older all-in-one export. Use one or the other, not both.

### Miles and expenses
- **Miles and expenses** (card on Today, or the link `#miles`): log trips for the electric job and your businesses (date, from, to, miles, job or purpose) and tools, materials and receipts (amount, category, note). **Repeat last trip** logs the same trip again today in one tap, and **Save as favorite** keeps a trip like Home to Job site as a one-tap button.
- It shows the year's miles, a **deduction estimate** (miles times the mileage rate, plus expenses) and **estimated tax saved** at your marginal tax rate, for the year and the month. The rate starts at $0.70 a mile and the tax rate at 22%. Both are assumptions you can change, and a trip keeps the rate it was logged at. Confirm the IRS standard mileage rate for the year.
- An expense can also be added to the money log as money out (the box is off unless you tick it). **Export CSV** saves the year for your tax preparer. Everything here is your own estimate, not tax advice.

### Daily brief
- **Brief** (card on Today, or the link `#brief`): one sheet with today's events and shifts, the free parts of the NY sessions, today's tilt guard and trade plan status, news windows, bills due in the next 3 days, deal follow-ups due or late, tasks due today and yesterday's win from your journal. **Copy** it or **Share** it to Notes or Messages (on a device without a share sheet, Share copies it).
- Parts of the brief appear only when there is something to say, and anything you do not use is left out.
### Payday and Check my paycheck
- **Payday** (card on Today, or the link `#payday`): pick a job, say how often it pays (every week, every 2 weeks, twice a month, once a month), give a payday date (or the day of the month), and how many days behind it pays (for example 5 if your Friday check covers work through the Sunday before). Tips you log in Shifts can be counted on the check too.
- Paydays then show on the calendar as all-day green **Payday** items with the pay you should expect: your scheduled hours in that pay period times the job's hourly rate, plus tips logged in the period. They are worked out each time you open the app and never stored as events, so changing your shifts updates them. Untick Show paydays on the calendar to hide a job's paydays.
- **Check my paycheck**: choose a payday, type the gross amount on your stub and it compares it with your calendar. If you were paid more than $5 less than the hours suggest it says so in plain words (for example "You were paid $38 less than your scheduled hours suggest: check your stub") and roughly how many hours are missing. The shifts counted are listed so you can spot a missing one. Saved checks are kept in a list that syncs.
- Estimates only, gross (before tax). Overtime, bonuses and tax are not included, and none of it is tax or payroll advice.

### Hours and overtime
- **Hours this week** (card on Today, or the link `#hours`): a bar of hours worked so far and hours projected with the shifts still to come, across all your jobs, with your weekly limit marked on it. It also shows next week's scheduled hours.
- Set a combined weekly limit (default 40 h), an overtime threshold per job (default 40 h, 0 for none) and the overtime rate (default 1.5x). When your scheduled shifts go over, it says which shift does it and the estimate, for example "Thursday's Outback shift puts you over 40 h. The week adds up to 43 h, 3 h overtime at 1.5x = about $X extra". The extra is the premium over your normal rate, before tax.
- Rest warnings: less than 8 h (you can change it) between the end of one shift and the start of the next (a closing shift into an opening shift, or two jobs on one day), and 6 or more days in a row with a shift and no day off. The settings sync.

### Availability and Request off
- **Availability** (card on Today, or the link `#availability`): for each job tap Free or No for morning, afternoon and evening on each weekday, add a note per day, and set when evening starts (for example 4pm). Days and parts of days that clash with something already on your calendar (your other job, a personal event, a vacation or day off) show as Busy and are left out automatically.
- **Copy availability message** gives a ready plain-text message for the week you pick (next week by default), such as "Mon Nov 9: 4pm-close (Electric 7am-3:30pm)". Edit the text first if you like, or untick the box to leave the reasons out. The Today card has a one-tap copy for next week.
- **Request off**: pick the first and last day and a reason and copy a polite message (it mentions any shifts you are scheduled for those days). The request is saved with a status of Sent, Approved or Denied so you remember to follow up. For an approved request, **Add Day off to calendar** puts an all-day Day off on the calendar, and that job is then shown as unavailable on those days.
Deep links: `#prop`, `#business`, `#taxes`. New synced collections: `propacct`, `taxcfg`, `taxpay` (Business P&L stores nothing; the bulk tag helper edits existing money entries).

### Help sheet bullets (one line each, same style as the others)
- **Prop firm ledger** (card on Today, or `#prop`): every eval and funded account you have tried, with its fees (eval, resets, monthly data fees) and the payouts you received. It says in one plain line what the evals have cost you and paid ("Evals have cost you $427 and paid $1,500: net $1,073") and shows ROI, pass rate, cost per pass, average days to pass and how much more you need in payouts to break even. Accounts that match a live dashboard account by name show its profit, target and sessions left. Typed by hand.
- **Business profit and loss** (card on Today, or `#business`): income and expenses from the money log for each project (Clipper, bots, portfolio, others) with untagged entries shown separately, a 6-month bar chart, best and worst month and a running year to date. **Tag untagged entries** lets you assign a project to many old money entries at once, with Undo. The mileage and tools deduction from Miles is a separate line (not cash).
- **Quarterly taxes** (`#taxes`; a **Tax due** card on Today in the 3 weeks before each date): an estimate of what to set aside, from money in and out tagged to a project (plus live and paper trading P&L if you tick it, minus the mileage deduction), at a rate you type (starts at 25%, an assumption). The US estimated-tax dates (Apr 15, Jun 15, Sep 15, Jan 15) show on the calendar as red all-day **Tax due** items. Log what you paid to see paid against suggested per quarter. An estimate, not tax advice: confirm with a tax professional, and note that futures trading may be taxed differently (Section 1256, 60/40).

### README additions
#### Prop firm ledger (`#prop`)
- One entry per eval or funded account: firm, name, size, start date, status (eval running, passed, funded, payout received, failed), the date it passed or failed, your profit split, and an optional link to a live dashboard account. Fees are separate lines (eval fee, reset fee, monthly data fee, activation fee, other) and payouts are separate lines (amount and date).
- Totals: total spent, total paid out, net, ROI (net divided by spent), pass rate (passed accounts of passed plus failed), cost per pass (spent divided by passes), average days from start to pass, and the break-even payout still needed (spent minus paid out, plus the profit that takes at your split).
- Each fee and payout has an optional "also log in the money log" checkbox (off by default). When ticked it adds a money out or money in entry tagged with the account's project (default: NQ bot); removing the fee or payout removes that money entry.
- Dashboard accounts that are not in the ledger yet are offered as one-tap chips that prefill the form.

#### Business profit and loss (`#business`)
- Reads the money log only. Entries whose project tag is empty or points to a deleted project are "Untagged" and shown on their own row, never mixed into a project.
- Per project: income, expenses and net for the month shown, plus year to date. Pick a row to filter the 6-month chart (income and expenses bars drawn to scale, net under each month), best and worst month of the year, and the month-by-month running total.
- The mileage and tools deduction (Miles log) is a separate non-cash line. Expenses you added to the money log through Miles (the checkbox) are skipped there so nothing counts twice.

#### Quarterly tax planner (`#taxes`)
- Net business result for the tax year = money in tagged to a project, plus live and paper trading P&L if ticked, minus money out tagged to a project, minus the mileage and tools deduction. Untagged entries are left out unless you tick that box. When trading P&L is ticked, payouts logged by the prop ledger are left out of income so they are not counted twice.
- Suggested payment per quarter = that quarter's net result times your rate (never below zero). Quarters are the IRS payment periods: Jan-Mar (due Apr 15), Apr-May (Jun 15), Jun-Aug (Sep 15), Sep-Dec (Jan 15). A due date on a weekend moves to Monday; holidays are not checked.
- Log each payment with its date and quarter. The table shows suggested against paid, and a quarter past its date with a shortfall is marked Late.
- The due dates are drawn on the calendar when it is built (never stored), so turning them off or changing the rate never leaves copies behind.
- Always an estimate from your own numbers, not tax advice.
### All tools and setup
- **All tools** (button in the header, or the link `#tools`): every tool in one place, grouped as Money, Work, Trading, Me and Calendar. Search the list, tap a tile to open the tool. Recently opened tools are listed first, and you can pin up to 4 favorites that show on Today as **Quick tools**.
- **Get set up** (card on Today until you finish or hide it): a checklist of the steps that make the tools useful (real shift times and pay, bills, tilt limits, income goal, backup). Each step shows done or not from your real data, and a button opens the right tool.
- **Backup:** Back up opens the share sheet so you can save the file to iCloud Drive. The app reminds you if it's been 14 days.

Tests: `node planner/tests/<name>.test.js` (Playwright). `lead`, `money`, `swipe` and `now` need the app served next to `data.json` (see the header of each).
