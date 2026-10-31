# Money features: text for the Help sheet and README (merge by hand)

## Bills and cash flow
- **Bills and cash flow** (card on Today, or the link `#bills`): a list of your recurring bills (rent, phone, car, subscriptions, eval and prop-firm fees, a tax set-aside). Each has a name, an amount, how often it is due (every month on a day, every week, every 2 weeks, every 3 months or every year) and an optional last payment date.
- Bills show on the calendar as all-day red **Bills** items. They are drawn when the calendar is built, so they never add copies to your events. Tap one to open Bills. Hide them with the Bills event type like any other type.
- **30-day forecast** (an estimate): you type your balance. The line adds expected pay (calendar shift hours times each job's hourly rate, with an optional delay in days until pay arrives), the average of your last 4 weeks of live and paper trading (weekdays after today, only when it is positive, never the backtest) and money-log "in" entries dated after today. It subtracts your bills and money-log "out" entries dated after today.
- The lowest balance day is marked with a red dot. A plain warning says things like "You are short $240 before Nov 12 rent."
- **Tax set-aside**: a percentage (default 20%) of expected income, shown as a number. A checkbox takes it out of the line as well.
- Everything on that screen is labelled as an estimate. Bills, your balance and the settings sync with the rest of your planner.

## Tilt guard
- **Tilt guard** (card on Today): watches today's closed live and paper trades from the dashboard (never the backtest). Nothing triggers when there are no trades.
- A red **Stop trading** banner appears on Today, and in the Now bar on other screens, when you hit either limit: a number of losing trades in a row (default 2) or a daily loss in dollars (defaults to the smallest daily limit the dashboard reports, otherwise off). A live cooldown timer counts down from the trade that caused it (default 30 minutes). A daily loss stop stays up all day.
- **I understand, log why** opens a short sheet with quick reasons and one line of text. It adds a note to today's journal and marks the stop as acknowledged.
- The **discipline record** on the card counts, over the last 30 days, the days you hit a stop and respected it versus the days you started a new trade during the cooldown (or after a daily loss stop).
- Change the three numbers with **Settings** on the card (or the link `#tilt`). They sync with your planner. The guard is only as current as the last data the bot PC published; the card says when that data is old.

## Trade plan and debrief
- **Trade plan** (card on Today, weekdays, also the link `#trade-plan`): before the NY open, pick a bias (long, short, neutral), write the one setup you are allowed to take, a max number of trades and your key levels. It lists today's medium and high impact news windows in your local time and counts down to the NY open. One plan per day, synced.
- From 12pm New York time the card flips to a **Debrief** (the Plan and Debrief tabs switch by hand): trades taken against your max, live and paper P&L, wins and losses, "Did I follow the plan? Yes, partly, no" and a one-line lesson.
- It shows your plan-followed rate over the last 4 weeks (yes counts 1, partly counts half), and a link to the Weekly review.
