## In one minute

- **The owner's order (2026-10-18):** "study how live fills on a broker / prop firm would work; we need this 200% accurate."
- **The honest answer first:** no backtest is ever exactly live. Our data are 1-minute candles, not every trade and every order in
  the queue. So we built (1) the most realistic fill model we can defend from how CME, NinjaTrader and the bot really work, and
  (2) a tool that measures the real fills on Sim101 / the MFFU account, so measured numbers can replace the guesses.
- **How the orders fill costs little.** MFFU's real commission ($1.90, not $1.40), stop slippage, the bid/ask spread and the
  target limit cost **about $1,200 of 2026's $41,734** (LIT size rule): +$40,532, PF 3.48. Expect the H2 rate as before, about
  **$2,400-2,500 a month**.
- **What matters is the bot's timing.** As coded today, the PC bot buys about **95 seconds after** the backtest does. On average
  that costs nothing, because price is as likely to be lower as higher by then. But each entry lands somewhere from 9 points
  better to 25 points worse (sd 7.5 pts), and a trade can end up risking **1.65x what was planned**. On the eval sizing the bots
  use, that randomness costs eval odds: 2026 **pass rate 84.8% → 71.2%**, 1-month passes 55.3% → 49.5%.
- **Fix (done 2026-10-18 evening, see "The timing fix" below):** decide the entry when the 1m CISD candle closes, and poll
  2 seconds after each minute. Then the entry is about 6 s late, the error is 0.6 pts, and the eval odds are back to the
  backtest's: **pass rate 84.8%, 2 weeks 34.5% pass / 2.4% fail, 1 month 56.3% / 3.9%**.
- **Order types:** keep **stop-market** stops (a stop-limit can leave you in a runaway trade) and keep the **target limit where it is**
  (1 tick inside costs about $80 a year and saved no target: none of the 25 targets would have been missed even if it needed
  2 ticks of trade-through). The entry "limit at the CISD level" is a price the bot **watches**, not an order at the broker, so
  entries have no queue risk.

## How an order really fills (for a beginner)

The bot trades **MNQ** (Micro Nasdaq, $2 a point, 1 tick = 0.25 pt = $0.50) on CME Globex. Order path: the bot writes an order
file → **NinjaTrader 8** picks it up → sends it through the MFFU account's **Tradovate** connection → CME. Every price in the book
has a queue of orders, first come, first served (price-time priority).

| Order | What it does | Where the price comes from |
|---|---|---|
| **Market** (our entries, our end-of-day / model exits) | Buy/sell now | You pay the other side's price: a buy fills at the **ask**, a sell at the **bid**. The last-trade prices on a chart sit between the two, so a market order costs about **half the spread** compared with the chart price, plus more if the book is thin. CME turns market orders into "market with protection": they never fill beyond a protection band, and anything left over rests as a limit there. |
| **Limit** (our target) | Fill at this price or better | Your order **waits in the queue** at that price. When price only **touches** your price, the orders ahead of you may use up all the trading there, and you get **no fill**. When price trades **through** your price (one tick beyond it), every order at your price must have been filled first, so a trade-through is a sure fill. |
| **Stop-market** (our stop and breakeven) | Becomes a market order once price **trades at the stop** | Fills at the next available price. Usually that is the stop or 1 tick worse. In fast moves (news, thin overnight hours) it can be several ticks worse. On CME stops also get the protection band (half the product's "non-reviewable range"), so even a stop-market has an exchange-side worst case. |
| **Stop-limit** | Becomes a **limit** at your limit price | It protects the price but **may not fill**: if price jumps past the limit, you stay in the trade while it runs against you. That is why protective stops should be stop-market. |

**The bid/ask spread and depth by hour.** MNQ usually has a 1-tick spread in New York hours and 1-2 ticks overnight. Our 2026
NQ 1m file shows how thin the hours are. The median NQ volume per minute is 57-128 contracts from 18:00 to 02:00, 85-125 from
02:00 to 08:00 (London, where 95 of 120 LIT trades enter), 202 at 08:00, and 530-1,316 from 09:30 to 16:00. The median 1m range
is 7-9 pts in London and 11-22 pts in New York. London is about 10 times thinner than New York, so stops slip more there.
**Partial fills** hardly matter at 1-10 micros. A limit target can fill in pieces, and the NinjaTrader adapter already resizes the
other leg when that happens.

**News.** Around CPI/NFP/FOMC the book empties for seconds. Forum reports talk of 5-20+ ticks of stop slippage on NQ and a 10-lot
MNQ stop filling 15 ticks late. Only 3 of the 120 LIT trades in 2026 were open across a high-impact release (all NFP mornings).

**The daily halt (17:00-18:00 ET)** and **price limits / circuit breakers** (a 2-minute pause on a 3.5% move overnight, 7% limits)
do not touch LIT: it is flat by 15:55, and its stops sit 8-80 pts away.

**MFFU rules that change execution** (Builder 50K; from MFFU's help-centre pages as quoted in search results, see Sources):
- $3,000 target. **End-of-day trailing max loss of $2,000.** The floor moves only at the session close and stops at $100 above the
  start balance, but open losses count when checking a breach.
- **$1,000 daily loss limit as a soft pause**: trades are closed and the day ends, the account is not failed. The eval scoring
  includes it.
- **Max 40 micros / 4 minis.** No consistency rule in the eval, news trading allowed on Builder.
- Trading hours to 16:10 ET (LIT is flat at 15:55). A "2% price limit" rule applies on funded accounts.
- **MNQ costs $1.90 per round trip** on MFFU's instrument list. We used $1.40.
- **Eval and "Sim Funded" accounts are simulated accounts.** Their fills come from the platform's simulator on real market data,
  not from the real CME queue. Only a Live Funded account fills at the exchange. The Sim101 / eval fills we will measure are
  therefore the **simulator's** rules (a Tradovate community post from 2021 says its limits needed a trade-through). That is good
  for measuring latency and plumbing, and only a hint about real exchange slippage.

## What the backtest assumed, line by line (and what is really true)

| # | Item | Backtest (`engine/lit.py` simulate_x) | Reality (code + broker) | Verdict |
|---|---|---|---|---|
| 1 | **Entry timing** | Buy at the **open of the 1m bar after the 1m CISD close** (+1 tick) | `simulate_x` needs that next 1m bar **in the data** (`k + 1 < B.n`), and `live.clean_bars` drops the bar still forming. So the bot sees the entry only after that bar has **closed** (+60 s). Its loop then waits for the next poll: 60 s after the last poll ended, **not aligned to the minute**, ~31.5 s on average. Then ~3 s to compute (we measured 1.3-2.9 s for `lit_live.run`), ~0.3 s for OIF → NinjaTrader → Tradovate → CME, and ~0.5 s for the bar feed (NinjaTrader writes a closed bar on the first tick of the next one, `OnBarClose`). **Total ≈ 95 s late.** | **Biggest gap.** Fix below. |
| 2 | Entry order type | Market | `place_bracket` sends a MARKET entry, then the STOPMARKET stop + LIMIT target as one OCO pair once the fill is reported (≤ 6 s unprotected) | Same type; latency as row 1 |
| 3 | Entry price | open + 1 tick | price when the order arrives, plus half the spread (0.5 tick in New York, 0.75 London, 1 Asia) | 1 tick was a fair cost *without* latency |
| 4 | "Limit at the CISD level, 30 min" | A **tap** of the level starts the 1m-CISD watch | **No limit order is placed.** The tap is only information, the order is the market entry of row 1 | No queue risk on entries |
| 5 | Target | Filled at the exact (unrounded) VIX-band price on a **touch** | LIMIT at the tick **toward the entry** (`live.tick_px`). The VIX band is almost never a tick price, so any bar whose high reaches the model's level has already traded at least 1 tick through the broker's limit | Sure fill. 0 of 25 targets missed even with 2 ticks of trade-through required. Cost: up to 1 tick of rounding |
| 6 | Stop | Touch → stop − 1 tick | STOPMARKET. Fills at the next price: 1-2 ticks normally, more on fast bars; **a bar that opens through the stop fills at its open**, which the backtest did not model | Small cost (below) |
| 7 | Breakeven at +1R | Stop moves to entry from the next bar | The bot sees +1R when that 1m bar closes, then polls: the CHANGE reaches the broker ~35 s into the next bar, and if price has already gone back below the entry the move is refused. The model's BE exit is then routed as a CLOSEPOSITION one poll later. The BE stop sits at the **model's** entry price, not the real fill | Costs ~$500 a year today |
| 8 | Flat 15:55 | Close of the 15:55 bar − 1 tick | The adapter's `tick()` flattens at the first poll at/after 15:55:00 (≈15:55:30); `live.py` safety flatten at 15:58 | Same thing, a few seconds earlier |
| 9 | Commission | $1.40 per micro round trip | **$1.90** (MFFU instrument list) | −$336 in 2026 |
| 10 | Prices | NQ1! back-adjusted (additive, anchored to NQZ26) | The bot trades **MNQ front month** on its own MNQ bars. Points (stop, R, P&L) are unaffected by an additive adjustment. Absolute levels are not: the VIX-band target is a % of the 18:00 open, so a back-adjusted level shifts it by a few points. MNQ's own highs/lows can differ from NQ's by a tick (separate order book, kept in line by arbitrage) | Small noise. The bigger issue is the roll: stored back-adjusted history is joined to unadjusted live bars in the live window (already open work in `lit-report-coverage.md`) |
| 11 | Bar times | TradingView export: bar **open** time | `LE_BarFeed.cs` converts NinjaTrader's **close** stamp to UTC, then steps back one bar: **open** time. Same convention. It needs NinjaTrader's time zone set right and the "CME US Index Futures ETH" template; `NinjaTraderBars` refuses files with bars stamped 17:00-17:59 ET | Consistent |
| 12 | Cloud monitor | n/a | Runs every 30 min: a **paper ledger** at the model's prices, not an execution path | Not used for fills |

## The realistic fill model (`engine/lit_fills.py`, option `"fills"`, off by default)

- **Same signals and same plan.** It runs the model exactly as the bot does (same setups, same stop, target, size and breakeven
  rule, same 120 trades in 2026), then executes the model's plan the way the broker and the bot really would.
- **Entry:** at the moment the order reaches CME (row 1). The price is the expected price at that second inside its 1m candle
  (open + share of the minute × (close − open), the best estimate for a random walk between two known prices), plus half the
  hour's spread. If the model's trade had already ended before the bot would route it, nothing is traded (it never happened in
  2026).
- **Stop / breakeven:** stop-market, fill = min(stop, bar open) − max(base slippage of the hour, 2.5% of the 1m bar's range),
  never below the bar's low. Base: 1 tick New York and 08:00, 1.5 London, 2 Asia. A 20-pt London bar slips 2 ticks, a 60-pt
  news bar 6 ticks.
- **Target:** limit at the tick toward the entry, filled only if price trades 1 tick through it.
- **Breakeven and model exits** reach the broker one poll late (row 7). The flatten at 15:55 happens on the clock.
- **Commission $1.90.** The size is the bot's: from the model's planned stop.
- **Check:** with every setting at the backtest's own assumptions (run `lit_fill_n0`) it gives +$41,709 vs +$41,734 (11 trades
  differ by cents from target tick rounding, one breakeven by $20 from a gap-through stop).

## What it does to the numbers (2026; costs in)

**LIT size rule** ($800 up to a 20-pt stop; run `lit_live` is the backtest):

| | Backtest (`lit_live`) | **Realistic, bot as coded** (`lit_fill_live_today`) | Realistic, bot fixed (`lit_fill_live_fixed`) | Realistic stress (`lit_fill_stress`) |
|---|---:|---:|---:|---:|
| Trades · per week · weeks with 2+ | 120 · 2.91 · 86% | 120 · 2.91 · 86% | 120 · 2.91 · 86% | 120 · 2.91 · 86% |
| Win rate | 26.7% | 36.7% * | 26.7% | 36.7% * |
| Profit factor | 3.66 | **3.48** | 3.58 | 3.40 |
| Net · per month | +$41,734 · $4,254 | **+$40,532 · $4,132** | +$41,280 · $4,208 | +$40,070 · $4,085 |
| H1 (Jan-Jun, picked) net · PF | +$32,773 · 4.44 | +$31,198 · 3.95 | +$32,436 · 4.31 | +$30,867 · 3.85 |
| **H2 (Jul-Oct, check) net · $/month** | +$8,962 · $2,413 | **+$9,334 · $2,513** | +$8,844 · $2,381 | +$9,203 · $2,478 |
| Max drawdown | −$2,315 | −$2,188 | −$2,347 | −$2,225 |
| MFFU eval 2 weeks pass / fail | 26.7 / 1.9 | 27.2 / 1.0 | 26.2 / 1.9 | 27.2 / 1.0 |
| 1 month pass / fail | 55.3 / 3.9 | 52.4 / 2.4 | 54.9 / 3.9 | 52.4 / 2.4 |
| Pass rate · median sessions to pass | 95.5% · 16 | 97.2% · 17 | 95.5% · 16 | 97.2% · 17 |
| 2021-25 reference PF · net (5m only, no 1m data) | 1.01 · +$1,275 | 0.96 · −$3,789 | 0.96 · −$3,777 | 0.92 · −$8,917 |

\* The late entry turns breakeven exits into small wins or small losses (the breakeven stop sits at the model's price, not the
real fill), so the win rate jumps without more money.

**Eval sizing, what the bots trade** ($800 up to a 25-pt stop + never more than 60% of the room; the MFFU $1,000 soft daily loss
included; base = run `lit_tight_eval_800_25_room60`):

| | Backtest | **Realistic, bot as coded** (`lit_fill_live_today_eval`) | Realistic, bot fixed (`lit_fill_live_fixed_eval`) | Stress (`lit_fill_stress_eval`) |
|---|---:|---:|---:|---:|
| 2026 eval 2 weeks pass / fail | 34.5 / 1.9 | **31.6 / 1.5** | 34.5 / 2.4 | 31.6 / 1.5 |
| 2026 1 month pass / fail | 55.3 / 3.9 | **49.5 / 4.4** | 56.3 / 3.9 | 49.5 / 4.4 |
| 2026 pass rate · median sessions | 84.8% · 12 | **71.2% · 12** | 84.8% · 12 | 70.4% · 11.5 |
| H1 2 weeks · 1 month · pass rate | 37.5/3.1 · 60.2/6.2 · 92.3% | 31.2/2.3 · 47.7/7.0 · 70.9% | 37.5/3.9 · 61.7/6.2 · 92.3% | 31.2/2.3 · 47.7/7.0 · 69.9% |
| H2 2 weeks · 1 month · pass rate | 29.5/0.0 · 47.4/0.0 · 95.7% | 32.1/0.0 · 52.6/0.0 · 95.8% | 29.5/0.0 · 47.4/0.0 · 95.7% | 32.1/0.0 · 52.6/0.0 · 95.8% |
| $ a month on the eval path (H1 / H2) | $5,464 / $2,818 | $5,901 / $3,088 | $5,404 / $2,785 | $5,833 / $3,056 |
| Max drawdown (2026) | −$2,513 | −$2,307 | −$2,543 | −$3,147 |

The eval-path $ are back-to-back evals (a new eval after each pass or fail), so they move with the pass/fail sequence. Judge the
eval columns by the odds, not the $.

**Where the $1.2k goes** (realistic, bot as coded, vs the backtest, 2026): commission and tick rounding −$336 · stop slippage −$180 · spread and
target rounding +$96 (the backtest's 1 tick on entries was a bit more than half a spread) · breakeven lag −$500 · late entries
−$283 net. Trades that stopped out lost **$761 less** (the late entry was often lower), winners made **$878 less** (the late entry
was often higher), and breakeven exits lost $1,099 more. Stop slippage averaged 0.6-0.75 pt (2.5-3 ticks; worst 13 pts, a
breakeven stop placed after price had already dropped through it).

**Why the eval odds drop when the $ hardly move.** The size comes from the planned stop. A 95-second-late entry can add up to 25
points to the real stop distance (up to 1.65x the planned risk), and the eval's $2,000 trailing room is tight. In H1 two clusters
of these did it: the Mar 3 stop lost 74 pts instead of 57, and in late May three breakeven exits lost 8-13 pts each instead of
0. Together they turned about 20 eval starts from pass into fail. The effect is noise, not a lost edge: H2 even did a little better.
But noise is exactly what an eval cannot afford, and the fix removes it.

## The timing fix (done 2026-10-18 evening, paper / Sim tested)

What the PC bot does now (`engine/live.py`, `engine/lit_live.py`, `engine/lit.py` live mode, `engine/ninjatrader.py`,
`ninjatrader/LE_BarFeed.cs`):

- **The entry is decided the moment the 1m CISD candle closes.** The model no longer waits for the next 1m bar to exist: it
  reports "enter now" (state `enter_now`) and the bot sends the MARKET order (with its stop and target) in that same poll.
  The backtest's fill is the open of the next bar, which is exactly what a market order sent within seconds of that open gets.
- **The size uses the backtest's own fill price.** The feed shows the minute that has just started from its first trade
  (Yahoo's last row; NinjaTrader: LE_BarFeed now also writes `le_feed\MNQ_1m_open.csv` = that minute's open), so the micros,
  stop and target are the backtest's. Without that open the size would come from the CISD close: in a test of every 2026 trade
  that would have routed other micros on 27 of 120 trades (and a slightly different 8R target on a few); the bot logs it and
  flattens at once if the real open turns out to fail a rule (e.g. the 1.5R minimum).
- **A setup is seen as soon as its 5m trigger bar closes.** Before, the live loop needed the next 5m bar to close too, so 18
  of 120 trades were seen 1-3 minutes after their fill (the old fill model missed this). The forming 5m bar is now added to the
  market as a flat bar at its open, never used as a trigger, an executor bar or a level.
- **Polls are aligned to the clock:** 2 s after every minute (a bar has just closed) and a mid-minute poll for exits. With
  NinjaTrader's 1m file, a bar not yet written at +2 s is re-polled the moment the file changes. The breakeven CHANGE and the
  15:55 TIME exit go out in the first poll after their 1m bar closes.

**Proof (fake clock that runs on during each poll, paper / NinjaTrader Sim simulator, nothing armed):**
- `tests/test_lit_oif.py --part=1/6` (20 trades spread over Jan-Oct 2026; one process): **20/20 MARKET order files written by
  the first poll after the 1m CISD close, at the backtest's entry bar, with the backtest's side, micros, stop and target; 0
  missed.** Delay from the candle close to the order file: median **3.6 s**, 2.5-3.7 s on a quiet box; 5 trades took 17-26 s
  because the test box was overloaded (one poll took 15-24 s of CPU); on the PC a poll takes ~1-1.5 s.
- `tests/test_lit_timing.py`: entry 2-3 s, breakeven CHANGE 2 s after the +1R bar closed, 15:55 TIME exit 2 s after the 15:55
  bar closed (10/10 checks).
- `tests/test_lit_live.py`: the day-end replay is still 120/120 trades identical; the intraday polls (early mode) show no new
  differences and every "enter now" matches the backtest trade.

**Re-measured with the fill model** (`python tools/lit_fills.py run live_today live_fixed live_now`; `live_now` = the code
above: decision on the CISD close, poll 2 s after the minute, 1.5 s compute):

| 2026 | Bot before the fix (`live_today`) | **Bot now (`live_now`)** | Backtest (`lit_live`) |
|---|---:|---:|---:|
| Median entry delay | 95 s | **4.3 s** | 0 |
| Entry error vs the backtest price: sd / worst | 7.5 / 25 pts | **0.45 / 1.2 pts** | 0 |
| Real risk vs planned, worst | 1.65x | **1.02x** | 1.00x |
| LIT size rule: net · PF · H2 $/month | +$40,532 · 3.48 · $2,513 | **+$41,281 · 3.58 · $2,378** | +$41,734 · 3.66 · $2,413 |
| Eval sizing: pass rate · 2 wk pass/fail · 1 mo pass/fail | 71.2% · 31.6/1.5 · 49.5/4.4 | **84.8% · 34.5/1.9 · 56.3/3.9** | 84.8% · 34.5/1.9 · 55.3/3.9 |

The remaining -$453 against the backtest is costs, not timing: $1.90 commission, stop slippage, spread, target rounding.
The fill model places the "seen late" trades at the CISD close too, so the old column was even a little optimistic for the
18 trades the old loop saw 1-3 minutes late.

## Exits and adds on the route: the adopt-candidates (2026-10-19, all OFF in live_model.json)

The three adopt-candidates now go through the PC route exactly as the backtest books them. Switching one on is a
`live_model.json` "lit" change only.

| Option (live_model.json "lit") | What the bot sends | When | Test |
|---|---|---|---|
| `"t_check": {"at": 15, "x": 0.3, "mfe": 0.5}` (15-minute check) | the model's exit CUT_T15: CLOSEPOSITION (NinjaTrader `route_all_exits`) | the poll 2 s after the check bar's close = the open of the backtest's exit bar | `tests/test_lit_exit_route.py`: 13/13 cuts of 2026 routed 2 s after the close, exit time and P&L = backtest |
| `"be_off": 1.25` (breakeven at entry + 1.25 pts) | one CHANGE of the stop to entry + 1.25 (long) / entry - 1.25 (short), tick-exact | 2 s after the +1R bar's close | same test: 6/6 breakeven trades (3 long, 3 short), stop and BE-exit P&L = backtest |
| `"scale_in": {"pb": 0.25, "f": 1.0, "rat_k": 1.0, "min_rk": 2.0, "n": 1}` | a MARKET add, then CHANGE of the quantity of the one OCO stop + target to the whole position; the later stop move to the add's price is a normal CHANGE | 2 s after the add's 1m CISD candle closes = the open of the backtest's add bar | `tests/test_lit_scale_in.py` part 5: every 2026 add trade (`--all`) routed 2 s after the close with the backtest's micros and price; exit flattens entry + add with the backtest's P&L |

**Why the cut looked "~3 min late".** In the replay before this fix the cut itself was already sent 2-3 s after the check
bar closed (all 13 trades). What was off: the live loop priced it from the check bar's **close** (the paper ledger's exit
price and P&L were an estimate, up to $26 a trade away from the backtest) and reported its exit **one bar early**. Now the
live loop prices it from the forming bar's open (LE_BarFeed `MNQ_1m_open.csv` / the feed's last row), the same trick as the
entry, and reports the backtest's exit bar, so ledger = backtest to the cent. (A 1-minute "late" also appears if the cut is
compared with the backtest's `exit_t`, which is the close of the exit bar, not the moment of the exit.)

**How the add goes to NinjaTrader (`engine/ninjatrader.py` `add_to_position`).** NinjaTrader ATI has no "add to bracket"
command, so the cleanest route is: (1) `PLACE ... BUY|SELL n MARKET ... <id>A1` (same side, own order id, no OCO), (2) once
NinjaTrader reports the fill, `CHANGE;;;;<total>;;0;0;;;<stop id>;;` and the same for the target id: the one OCO pair now
covers the whole position at the stop and target already working. The bracket grows only after the fill (a stop bigger than
the position would reverse it). A fill reported late is picked up by `tick()` on the next poll; an add never filled within
45 s is cancelled. Refused (no order file): no protected bracket, kill switch / outside the session, other side, NinjaTrader's
position file disagreeing with the bracket, the whole position above 40 micros. A second bracket was not used: two OCO
groups on one position can both fill on a fast bar and leave a reverse position.

**Add size on the route** (`engine/live.py _add_qty`). Normal mode: the model's add at the routed size (= the backtest's).
Eval modes (two_week / eval / safe_eval): `engine/sizing.scale_in_qty` at the routed size with the eval state, as the eval-path
research does: the add's open risk inside the first entry's $ risk, 60% of the room to the trailing floor and the $1,000 soft
daily loss left today, the whole position at most 40 micros; a sizing error means no add. The exit and the paper ledger count
entry + adds (`_routed_pnl`), and the kill switch / safety flatten close the whole position.

Gaps, honestly: other adapters (Tradovate, TradersPost) do not add (logged "cannot add"); the cloud paper ledger re-sizes a
scale-in trade by the entry's size ratio (close, not exact); an add priced from an estimate (feed without the forming bar's
open) that the model later does not book stays at the broker under the same stop and target (logged). Not tested on a real
NinjaTrader install yet: run it on Sim101 first.

## What changes a decision

1. **Fix the entry timing in the live loop (recommended; not done here, because it changes `engine/lit.py` live mode and
   `engine/live.py`, and the task was research only):**
   - In live mode, report the 1m-CISD entry as "buy now" when the CISD candle closes, instead of waiting for the next 1m bar to
     appear in the data. The backtest stays the same: the entry is still "the next open", which is what a market order at that
     moment gets.
   - Poll ~2 s after each minute boundary instead of `stop_flag.wait(60)` after each poll.
   - Effect in the model: delay 95 s → 6 s, entry error sd 7.5 → 0.6 pts, worst 25 → 1.6 pts, real risk ≤ 1.03x planned;
     eval pass rate 71% → 85%; LIT-rule net +$40,532 → +$41,280. The same fix makes breakeven moves arrive in the first seconds
     of the next bar (the breakeven lag's ~$500 a year goes to about $0). `tests/test_lit_live.py` should still give 120/120: the trades do not change,
     only when the order is sent.
2. **Keep stop-market stops.** Stop-limit only trades slippage for the risk of no fill. LIT's median stop is ~47 pts, so 2-3 ticks
   of slippage is 1-2% of the risk, and CME's protection band already caps a stop-market's worst case.
3. **Keep the target limit where it is** (tick toward the entry). 1 tick inside costs $83 (LIT rule) and saves nothing.
4. **Use $1.90 per micro round trip in the backtest** (MFFU instrument list). It costs $336 in 2026. Not changed here: the
   constant drives every stored run, so changing it needs an `ENGINE_EPOCH` bump and a rerun. Until then, take 2026 −$0.3k.
5. **No change to the strategy.** Every realistic variant keeps 2.91 trades a week, PF 3.4-3.6 and H2 +$8.8-9.3k.

## Week one on Sim101: what to measure

Setup (NinjaTrader, paper only): LE_BarFeed on one MNQ 5-minute chart (ETH template, NinjaTrader time zone = Eastern), the PC
bot with `data_source: "ninjatrader"` and the NinjaTrader adapter on **Sim101**.

Every day after 16:00 ET:
1. `python tools/fill_audit.py archive`. NinjaTrader wipes its `outgoing` folder when it restarts, so this keeps every order
   state.
2. Export NinjaTrader's **Executions** tab (right click → Export) to a CSV. It is the only place with the fill price and time of
   the end-of-day / model-exit CLOSEPOSITION orders.

At the end of the week: `python tools/fill_audit.py report --executions <csv> --since <first day>` (it finds `le_feed\MNQ_1m.csv`
itself). It reports:

| Measure | What the model assumes | Why it matters |
|---|---|---|
| Decision latency (route time − model's entry bar open) | ~95 s today (~6 s after the fix) | The biggest effect: the eval odds |
| Fill latency (fill − route) | ~0.3 s | NinjaTrader / Tradovate plumbing |
| Entry vs the price at send time, by hour | half the spread: 0.5 tick NY, 0.75 London, 1 Asia | The spread we pay |
| Entry vs the model price | mean ~0, ±7.5 pts today | Latency cost |
| Stop / breakeven slippage, by hour and by 1m range | 1-2 ticks, or 2.5% of the bar's range | The stop cost |
| Target: touched only / traded 1 tick / 2+ ticks through, and filled or not | fills on 1 tick through | Whether the limit target is safe |
| Model TARGET exits that the limit missed | 0 | Queue risk |
| Rejected CHANGE (breakeven) or bracket, partial fills | rare | Plumbing |
| $ per trade vs the model's P&L | −$10 a trade (bot as coded) | The bottom line |

It also writes `suggested_fills` in `logs/fill_audit_report.json`. `python tools/lit_fills.py run measured` then reruns LIT live
with the measured numbers in place of the assumptions.

Be realistic about a week: LIT makes ~3 trades a week, so week one checks the latency and the plumbing, not the slippage
statistics. Plan on 10-20 trades (4-6 weeks) before replacing the slippage numbers. Sim101 is NinjaTrader's simulator and the MFFU
eval is Tradovate's: both measure our timing for real, but their fills only approximate the exchange.

## Honest limits

- 1-minute candles, not ticks: the price inside a minute is an estimate, and the stop-first rule inside a candle stays
  conservative.
- The slippage and spread numbers are assumptions taken from public descriptions and the NQ volume by hour, not measurements.
  The stress run doubles them: −$1.7k in 2026 instead of −$1.2k.
- The latency is an average (half a poll). Real polls land anywhere in the minute, so single trades vary more than the model.
- 2021-25 runs on 5m candles (no 1m data), so a 95 s delay is placed inside a 5-minute candle there: reference only.
- The research tool had no working page fetch (every site failed to resolve), so the facts in "How an order really fills" come
  from search-result summaries of the pages below, not from reading the pages. Check the MFFU rules and the $1.90 against
  MFFU's help centre before relying on them.

## Sources (from search results; the pages could not be opened)

- CME order types, protection points (market and stop with protection): https://cmegroupclientsite.atlassian.net/wiki/spaces/EPICSANDBOX/pages/457087412/Order+Types+for+Futures+and+Options,
  https://www.capitalfutures.com.tw/en-us/funding/marketwithprotection, https://www.elitetrader.com/et/threads/cme-stop-with-protection-rule.345419/
- CME price limits and circuit breakers: https://www.cmegroup.com/education/articles-and-reports/understanding-price-limits-and-circuit-breakers
- MFFU Builder plan: https://help.myfundedfutures.com/en/articles/14290805-builder-plan-a-comprehensive-guide; instrument list (MNQ $1.90
  round turn, hours, 2% price limit rule): https://help.myfundedfutures.com/en/articles/9735811-futures-instrument-list; daily loss
  limit: https://www.quantvps.com/blog/what-is-the-my-funded-futures-daily-loss-limit
- NinjaTrader OIF (processed the moment the file is written): https://ninjatrader.com/support/helpGuides/nt8/order_instruction_files_oif.htm;
  OnBarClose fires on the first tick of the next bar: https://forum.ninjatrader.com/forum/ninjatrader-8/strategy-development/1337572-is-onbarclose-triggered-on-bar-open;
  the sim engine's fill rules: https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/104492-feature-request-realistic-queue-positioning-for-limit-order-fills,
  https://ninjatrader.com/support/helpGuides/nt8/isfilllimitontouch.htm
- Tradovate limit fills needing a trade-through (community, 2021): https://community.tradovate.com/t/order-limit-fill-speed-quality/2279
- MNQ spread overnight vs RTH: https://damnpropfirms.com/glossary/mnq-futures/, https://www.quantvps.com/blog/nq-mnq-futures-market-hours
- Stop slippage in fast markets: https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/1117594-stop-loss-gaps,
  https://discourse.ninjatrader.com/t/stop-loss-slippage/4844, https://proptradingvibes.com/blog/trading-during-news-events
- CME daily halt 16:00-17:00 CT: https://damnpropfirms.com/trading-guides/cme-trading-hours-explained/

## Files and how to rerun

- `engine/lit_fills.py`: the realistic fill model (engine/lit.py `"fills"`; None = the plain backtest, the live loop ignores it).
- `python tools/lit_fills.py check`: base == run `lit_live` (120 trades, +$41,734); n0 ≈ base. `run`: every scenario →
  `research/lit/fills_results.json` (1 process, ~10 min). `save`: runs `lit_fill_*`. `expect`: per-trade expected fills →
  `research/lit/fills_expected.json`.
- `python tools/fill_audit.py selftest`: synthetic NinjaTrader fills, every number checked (15 checks). `archive` / `report`
  as above.
