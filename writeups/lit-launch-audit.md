## 0. Real MFFU eval from 21:00 ET tonight: go / no-go

The repo's hard rule is still "paper only". Arming a real account is the owner's own decision and step (SETUP.md
section 11). Nothing here arms anything.

**Verdict: GO only if the five checks below pass tonight. No code blocker was found.** The live locks, the account
name handling, the instrument name, the bracket, the 15:55 flat, the kill switch and the restart rule all do what
SETUP.md says (self-test 55/55).

Must pass before arming:
1. **First real-install test.** The NinjaTrader route and LE_BarFeed have never run on a real install. After the
   18:00 ET open, on the Surface and on Sim101, run SETUP.md 5.1 `--status`, 5.2 `--sim-check` and 5.3
   `--sim-roundtrip`. All three must say OK and the round trip must end FLAT. Then check that `--status` shows a fresh
   `MNQ_5m.csv` **and** `MNQ_1m.csv` (LIT needs the 1m file). If 5.3 fails on CLOSEPOSITION, use `--close-suffix " Globex"`.
   If anything fails: no go.
2. **Maximum position size of the plan.** The bot can send up to 40 micros (`two_week` max 40). If the MFFU 50K Builder
   allows fewer (check in the MFFU dashboard; many 50K plans allow 3 minis = 30 micros), a large order is rejected and
   that trade is missed. It is not a rule breach, because the broker refuses it. To cap it, the start config needs
   `lit_sizing` with `two_week.max_micros` at the plan limit (the CLI `--start` cannot pass it today: use POST
   `/api/live/start`, or ask for a `--max-micros` flag).
3. **Only the eval account connected** in NinjaTrader. The kill switch flattens every connected account.
4. **The eval clock.** `live_model.json` `lit_sizing.eval_start` is `2026-10-19`, which is tonight's session (Sunday
   evening counts as Monday). That is right only if the eval is new or reset tonight. The two_week size counts the eval's
   profit from the bot's own trades since that day: it knows nothing of earlier manual trades or the broker's fees.
5. **Being there 02:00-08:00 ET** (95 of 120 trades enter then), and MFFU's OK for automation (SETUP.md 13 item 12).
   A live bot never restarts by itself (`engine/watchdog.py` AUTO_MODES = paper/demo). After a crash or a Windows restart,
   it stays off until you start it. Today the phone gets no alert for that before 08:00 ET (#2 below; the PC
   watchdog's stale-feed alert also only runs 09:00-16:00 ET).
   Pause Windows Update tonight, and run `scripts\setup_dedicated_pc.ps1` again as Administrator.

Known limits (accept or fix later):
- The stop and target go in only after NinjaTrader reports the fill, normally under 1 s. If that report takes more than
  6 s, the position is open without a stop until the next poll (up to ~60 s), with a "fill not reported yet" log line.
- Both legs are `DAY` orders. A dead PC means no 15:55 flat and no breakeven move. The bracket stays at the broker until
  it fills or the 17:00 ET close. Whether the OCO link holds without NinjaTrader running depends on the connection
  (SETUP.md 13 item 6, unverified).
- In LIT mode the PC can send news "STAND DOWN" messages, but LIT does not stand down (section 3).
- The roll (section 2) is not an issue until 2026-12-10.

Doc fixes done for this: SETUP.md `lit_sizing` row (it said default `normal`; it is `two_week` with `eval_start`), a
new `eval_start` row, and a pre-arm checklist in section 11. Section 11's command is correct as written: `--start`
sends armed + present + `data_source ninjatrader`, and the server needs `NINJATRADER_LIVE=1` and the exact phrase.
Section 13 item 11 (NinjaTrader's own rollover date equals the bot's 8-day rule) is unverified, but it does not matter
for the bot. The bot names the contract itself (`MNQ 12-26` until 2026-12-09, then `MNQ 03-27`). Only the chart has to
be switched by hand.

## Verdict

**Paper: ready tonight (18:00 ET).** The rules, the clock and the order route work, and the self-tests pass
(see the table at the end). Three things need doing before a set date:

| # | What | Before | Who / where |
|---|------|--------|-------------|
| 1 | **Contract roll fix** (December to March). Otherwise the bot's levels are about 300 pts off for weeks, and on the PC the stop and target could land in the wrong place. | **Wed 2026-12-09** | code: `engine/live.py` (patch below) |
| 2 | **"PC silent" alert from 01:50 ET.** It only watches 08:00-16:30 ET today, while 95 of 120 LIT trades enter before 08:00. | this week | code: `tools/cloud_monitor.py`, one number |
| 3 | **Cloud end-of-day summary is hit-or-miss** on the :02/:32 schedule. It needs 16:05 or later, the guard stops at 16:25, and the runs come at 16:02 and 16:32. So it only goes out when GitHub starts the 16:02 run 3+ minutes late. | this week | `.github/workflows/cloud-monitor.yml` or `tools/cloud_monitor.py`, one number |

Fixed today (scripts and docs only, no strategy change):
- `scripts/setup_dedicated_pc.ps1`: Windows Update "active hours" were 08:00-17:00 on the PC's clock, so a forced restart
  could land at 02:00-08:00 ET, LIT's busiest time. Now 01:00-17:00 **New York time**, converted to the PC's own clock.
  It also sets "no automatic restart while you are signed in" and tells you to restart by hand on Friday after 17:00 ET.
- `scripts/schedule_pc.ps1` (option B, PC wakes itself): the wake time was 07:50 ET and missed London. It is now 01:30 ET.
  `scripts/PC_OFF_OPTIONS.md` is updated to match.
- `ninjatrader/SETUP.md`: the roll step now says when to switch the chart (Wed 12-09 after 17:00 ET) and why it matters.

## 1. Calendar and clock

- **DST (US clocks go back Sun 2026-11-01).** Every bar's time is converted with the `America/New_York` zone (`engine/data.py`),
  and so are `engine/lit_live.py`, `engine/ninjatrader.py` and the cloud guard (`TZ=America/New_York`). The 02:00-15:30 entry
  window and the 15:55 flat stay on New York time on both sides of the change. Nothing to do.
- **Cloud schedule** `2,32 6-21 * * 1-5` (UTC): in summer it starts 02:02 ET, in winter 01:02 ET (the guard skips the 01:02 and
  01:32 runs). The last run is 16:02 ET in both. **So it covers 02:00-16:05 ET after the change too.** GitHub often starts
  scheduled runs 5-15 minutes late. The guard accepts up to 14 minutes late, so a run that comes later is skipped (only a
  paper-ledger delay, no lost trade).
- **Sunday 18:00 ET open:** Sunday evening belongs to Monday's trading day. Setups can form from 01:00 ET, but entries only
  start at 02:00. **So the first possible LIT entry is Monday 02:00 ET.** Confirmed in `engine/lit.py` (window `[[120, 930]]`,
  evening minutes >= 1080 never trigger).
- **Holidays and early closes, Oct 2026-Mar 2027** (`engine/lit_live.early_close`, checked):

| Date | CME equity futures | Bot |
|------|-------------------|-----|
| Thu 2026-11-26 Thanksgiving | halt 13:00 ET | entries stop 12:45, flat 12:55 (NinjaTrader route), paper closes at the last bar |
| Fri 2026-11-27 | early close 13:15 ET | entries stop 13:00, flat 13:10 |
| Thu 2026-12-24 | early close 13:15 ET | same as above |
| Fri 2026-12-25, Fri 2027-01-01 | closed | no bars, so no trade (the README shows "stale" that day; harmless) |
| Thu 2026-12-31 | normal hours | normal |
| Mon 2027-01-18 MLK, Mon 2027-02-15 Presidents Day | halt 13:00 ET | entries stop 12:45, flat 12:55 |
| Fri 2027-03-26 Good Friday | most likely closed (no jobs report that day) | the code assumes a 09:15 close if it opens; closed = no bars, no trade |

  Known gap (already listed in `lit-report-tests.md`): the calendar is rule-based, not CME's published one. A one-off closure
  (for example a national day of mourning) is not known in advance: the bot just sees no bars.

## 2. Contract roll (MNQ Dec 2026 -> Mar 2027)

- **Order instrument:** `engine/ninjatrader.nt_instrument` names it `MNQ 12-26` (minis `NQ 12-26`) and switches by itself on
  **Thu 2026-12-10** to `MNQ 03-27` (8 days before the Dec 18 expiry; next switch 2027-03-11 to `MNQ 06-27`). Checked.
  Positions never stay open overnight (flat at 15:55), so no position has to be rolled.
- **The chart that feeds bars** (`LE_BarFeed`) does not switch by itself: the owner switches it (SETUP.md step 7, now with
  a date). Its file name holds only the root (`MNQ_5m.csv`), so the bot cannot tell which contract it is reading.
- **The real problem:** three feeds roll on three different days, about 300 pts apart (the Sep 2026 gap was 295.75 pts, about 1%):

| Feed | Roll day (Dec 2026) | Used by |
|------|---------------------|---------|
| NinjaTrader orders | Thu 12-10 (rule) | PC orders |
| NinjaTrader chart (LE_BarFeed) | when the owner switches it | PC bars when `data_source` is ninjatrader |
| TradingView NQ1! file (`data/NQ_5m.csv`, back-adjusted, anchored on NQZ26) | Tue 12-15 in the file's own pattern | history part of the window |
| Yahoo NQ=F | Yahoo's choice (expiry week) | cloud bars, PC fallback |

  After the roll, the window still holds December-priced bars from the 1st of the previous month (so into February for the
  monthly levels). Previous day, week and month highs and lows, and the gaps, sit about 300 pts below the March price. The bot
  then sees false sweeps and wrong targets. On the PC there is a second danger: from 12-10 the signal can be on December prices
  while the order goes to March. The entry is a market order, so the stop and target end up about 300 pts from the fill.

**Exact patch (for the agent that owns `engine/live.py` / `engine/ninjatrader.py`):**

1. `engine/live.py`, `LiveBot._merged`, after the `frames = [...]` line: back-adjust the stored history to the fresh feed's
   contract.
> _Code omitted on the public site._
   Then a roll *inside* the fresh feed (Yahoo switching on its own day): in the same function, after `clean_bars`, during the
   roll weeks only (the 7 days before and the 3 days after each 3rd-Friday expiry), find the first bar of an 18:00 ET session
   whose open is more than max(60 pts, 6 x the 5m ATR) away from the previous close. Shift every bar before it by that jump.
   Use the same rule for the 1m frame in `_lit_1m` (and its `data/NQ_1m.csv` part), with the gap taken from the 5m result.
2. `engine/ninjatrader.py`, `place_bracket`, right after `_note_fill` and before `_protect`: refuse a bracket whose fill is
   far from the signal's planned entry.
> _Code omitted on the public site._
3. `engine/ninjatrader.py`, `NinjaTraderBars`: refuse a feed whose last close is more than 40 pts from Yahoo NQ=F's last
   close at the same minute while `nt_instrument()` and `front_month("NQ")` disagree. The bot then says "switch the chart to
   MNQ 03-27" instead of trading on the wrong contract.
4. Test (`tests/test_roll.py`): take Sep 2026 (switch 2026-09-14 18:00 ET, gap 295.75 from `data/NQ_rolls.json`). Build a
   "Yahoo" frame by un-adjusting the bars before the switch by -295.75. Cut the stored history at 09-11. Run `lit_live.run`
   on 09-15 to 09-25. Pass when the trades equal the back-adjusted file's trades.
5. Owner, after Dec 15: refresh `data/NQ_5m.csv` / `NQ_1m.csv` with a new TradingView export (anchored on NQH27).

If the patch is not in by Dec 9: keep the cloud paper bot running, but do not run LIT on the PC Dec 10-16. Expect wrong
levels until mid-January in either case (paper only, so nothing is lost but signal quality).

## 3. News

- **LIT has no news rule** (`engine/lit.py`, `live_model.json`). The news guard in `engine/news.py` (15 minutes before to 30
  after a high-impact release, no afternoon trades on FOMC days) is wired into the *old* engine (`engine/model.py`
  `news_filter`). In LIT mode the PC bot still refreshes it and can send "STAND DOWN" messages (`engine/live.py`
  `_refresh_guard`), but it **does not block LIT**. That is misleading. Patch: in `_refresh_guard`, when the live model is lit,
  send the transition as an info line ("news: CPI 08:30 ET (LIT has no news rule)") and not as "STAND DOWN".
- **Test (2026, H1 pick / H2 check), on run `lit_live`'s 120 trades.** The release list is `data/news/events.csv`, built by
  `data/build_news.py` from the bls.gov release archives (CPI, jobs report, PPI at 08:30 ET) and the federalreserve.gov FOMC
  calendar (14:00 decision, 14:30 press conference). That gives 31 high-impact events Jan 2-Oct 16. PPI is rated medium there,
  and retail sales is not in the list.

| Block entries within | H1 trades removed | H1 change | H2 trades removed | H2 change |
|---------------------|-------------------|-----------|-------------------|-----------|
| 15 min | 1 (NFP 2026-05-08, -1.03R) | +$207 | 0 | $0 |
| 30 min | 1 | +$207 | 0 | $0 |
| 60 min | 1 | +$207 | 0 | $0 |

  LIT enters mostly 02:00-08:00, before the 08:30 releases. Only 3 trades were open during a release, and together they made
  **+$559 (+2.38R)**, so flattening before news would cost money. H2 does not change, so the rule fails the "both halves"
  test. It would change one trade a year and leaves 2.9 trades a week. The 2-week MFFU pass rate cannot move by more than
  one eval start. **Verdict: no news rule for LIT.** This is an upper bound from removing trades, not a full re-run (a blocked
  day could have taken a later setup). No run is stored, since it changes nothing.

## 4. Failure modes

| What happens | What the bot does | Gap / action |
|--------------|-------------------|--------------|
| Yahoo outage or stale bars | Cloud: falls back to the stored file, README shows STALE. PC: `DATA STALE` warning, new entries blocked after 3 stale polls inside the entry window. The NinjaTrader feed falls back to Yahoo after 7 min. | Fine for paper. Remember the cloud bars are Yahoo `NQ=F`, not CME data. |
| PC sleeps | `setup_dedicated_pc.ps1`: never sleep or hibernate on AC, lid = nothing. `schedule_pc.ps1`: wakes 01:30 ET (was 07:50, fixed). | Run the setup script again on the PC (Administrator) so the new settings apply. |
| Windows Update restart at night | Was able to restart 17:00-08:00 PC time, i.e. during London. **Fixed:** restarts only 17:00-01:00 ET, no automatic restart while signed in. | A PC outside the US: run the script again after a clock change (Europe Oct 25 vs US Nov 1, US Mar 14 vs Europe Mar 28). |
| PC restarts | Autologon (by hand, Microsoft's free tool), logon task starts `run_bot.ps1`, `data/autostart.json` resumes the bot, a Startup shortcut opens NinjaTrader. | NinjaTrader still needs "connect on startup" ticked and its login saved, or it sits at the login screen. Check once by restarting the PC on a Saturday. |
| Bot crash | `run_bot.ps1` restarts `server.py` after 5 s, 15 s, then 60 s; one supervisor only (mutex + port check). | A server that hangs without exiting is not restarted by the supervisor. The heartbeat (below) catches it. |
| Duplicate orders on restart | Open legs are saved. A new entry is refused while a bracket is open or NinjaTrader shows a position on that contract. 1 trade a day. | OK (self-test 55/55 covers it). |
| Internet or PC dies with a position open | Stop (STOPMARKET) and target (LIMIT) are sent as one OCO pair right after the fill, so they sit in NinjaTrader / at the broker. | On **Sim101** the orders live inside NinjaTrader: PC dead = orders dead (no real money). On a real connection they rest at the broker, but: (a) both legs are TIF **DAY** and expire at the 17:00 ET close; (b) the 15:55 flat is sent by the bot, so a dead PC means no 15:55 flat; (c) whether OCO is held at the broker or in NinjaTrader depends on the connection: check before any real account. |
| Kill switch | `FLATTENEVERYTHING`, kill flag kept until the bot is started again with `clear_kill`. | OK. |
| PC goes silent | Heartbeat every 5 min. The cloud alerts after 20 min of silence, **but only 08:00-16:30 ET**. | Patch `tools/cloud_monitor.py`: `in_session = ... 480 <= mod <= 990` -> `110 <= mod <= 990` (from 01:50 ET). Then an alert comes about 20-50 min after the PC dies (half-hourly runs). |
| Cloud end-of-day summary | Needs ET minute >= 965 (16:05). It only goes out when the 16:02 run starts late, and the guard drops the 16:32 run. | Patch `.github/workflows/cloud-monitor.yml`: in the guard, `$mod -le 985` -> `$mod -le 1000` in the end-of-day line (lets the 16:32 run through). Or `tools/cloud_monitor.py` line 569: `>= 965` -> `>= 960`. |

## 5. Self-tests (2026-10-18, on a shared, overloaded 4-CPU container, one process at a time)

| Test | Result |
|------|--------|
| `python -m engine.ninjatrader --selftest` | **PASS 55/55** |
| `python -X utf8 -m engine.sizing` | **OK** (lit_qty two_week fallbacks to eval mode checked) |
| `python -X utf8 -m tests.test_lit_2wk_sizing` | **22/22** |
| `python -X utf8 -m tests.test_lit_live` | day-end replay **120/120 trades identical** (0 missing, 0 extra). The per-poll part was cut off at 15 min. |
| `python -X utf8 -m tests.test_lit_learn` | **13/14**: `test_noise_false_change_rate` gives 5 false changes in 36 weeks (13.9%) vs the 12% limit. The file was being edited by another agent at the time. |
| `tests.test_ledger_freeze` | ALL PASS |
| `tests.test_lit_lookahead` | PASS (36,604 setups, 0 differences) |
| `tests.test_push` | 41/41 |
| `tests.test_lit_oif` (~30 min test) | stopped at 15 min. 1 of 5 checked days within 10 s; the others 10-15 s late because each poll took 8-35 s on the overloaded box. Prices, size and bracket were right on every day. Rerun on the PC. |
| `tests.test_lit_timing` | stopped at 4 min (overload). The first day: entry routed 2 s after the 1m close, same as the backtest. |
| `tests.test_live_dryrun --quick` | **not finished**: stopped at the 20-minute limit inside part 1 (3-session replay) on the overloaded box. Expected 41/44 (old engine); rerun on the PC. |
| `tools/cloud_monitor.py --out <tmp>` | **OK** (exit 0, 9 min under load). README, chart, state written; LIT "market closed", ledger 0. Yahoo NQ=F returned no data from this container (weekend / network), so it ran on the stored bars. |
