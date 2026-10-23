## In one minute

- **The question:** once the eval is passed, how big should LIT trade on the funded account so the owner takes out the most
  money and does not lose the account?
- **The trades are the real LIT trades:** the 120 trades of 2026 the live loop takes (same signals, 1m entries, stops 1 tick
  beyond the sweep extreme). Only the size changes.
- **The answer (mode `funded`, recommended):**
  1. Risk **40% of the room** to the max-loss floor, never more than **$800** (so a fresh funded account with $2,000 room
     trades the normal LIT size, and size shrinks as the room shrinks).
  2. **Wide stop means less risk:** $ risk up to a 20-pt stop, then x 20 / stop (the LIT rule).
  3. **Best-day cap:** micros so the trade's target pays at most **$1,500**. MFFU pays out only when no single day is more than
     50% of the cycle's profit; LIT's big winners otherwise lock the payout until the account earns that day again.
  4. **Weekly stop on** (half size after 2 stop-outs in a week).
  5. **Never risk the account on 1 micro:** if even 1 micro's stop-out (stop + 2 ticks + commission) would reach the floor,
     no trade.
- **Results (Monte Carlo, 2,000 funded accounts of 6 months each, $1.90 commission; H1 = Jan-Jun picked · H2 = Jul-Oct check):**

  | Funded sizing | Account lost 3 mo / 6 mo (H1 · H2) | Paid to you 3 mo / 6 mo (H1 · H2) | $ a month (H1 · H2) | Median first payout (session) | 5 payouts within 6 mo | Max DD (median) |
  |---|---|---|---|---|---|---|
  | Today's normal size ($800 up to 20 pts) | 19.8 / 20.3% · 25.8 / 27.8% | $1,624 / $3,423 · $1,469 / $3,020 | $570 · $503 | 31 · 29 | 5.3% · 4.1% | −$2,135 |
  | Today's eval mode ($800 up to 25 pts, 60% room) | 21.3 / 22.4% · 26.0 / 28.6% | $1,577 / $3,319 · $1,642 / $3,258 | $553 · $543 | 31 · 28 | 4.8% · 5.1% | −$2,658 |
  | Normal size + 60% room cap + floor guard | 3.5 / 4.4% · 4.1 / 4.9% | $1,664 / $3,590 · $1,496 / $3,210 | $598 · $535 | 33 · 30 | 5.2% · 4.3% | −$2,189 |
  | Half Kelly (10% of the room) + $1,500 best-day cap | 0.0 / 0.2% · 0.1 / 0.2% | $1,131 / $3,243 · $405 / $1,805 | $540 · $301 | 43 · 64 | 9.2% · 4.8% | −$1,015 |
  | Tiers ($400 under $2,000 room, $800 above) + $1,500 best-day cap | 0.8 / 1.6% · 1.7 / 3.2% | $1,918 / $4,604 · $1,507 / $3,929 | $767 · $655 | 29 · 34 | 22.7% · 16.8% | −$1,420 |
  | **Recommended: 40% of the room (max $800) + $1,500 best-day cap** | **0.6 / 1.0% · 0.6 / 1.5%** | **$2,012 / $4,613 · $1,919 / $4,433** | **$769 · $739** | **27 · 26** | **24.5% · 23.8%** | **−$1,494** |

  - "Paid to you" is the 80% share, within the 3 or 6 months. The cap is 5 sim payouts x $2,000 x 80% = $8,000, then MFFU moves
    the account to live (not modelled: the path stops there as "graduated").
  - 3 months: 86% / 81% of accounts have had a payout. The worst 10% of accounts paid $1,358 / $776 in 6 months.
  - Max risk on one trade in the recommended mode: $342 / $412 (the best-day cap keeps size small on far targets).
  - Numbers in `research/lit/funded_final.json` (the grids before it ran at $1.40 commission; the ranking does not change).

- **What does not matter much:** once the best-day cap is on, fixed $ tiers, tiers by the floor's lock, % of the room
  (0.15-0.6) and a $800-1,200 maximum all land on a plateau of $4,300-4,850 in 6 months with 0.3-4% accounts lost. The
  difference between them is noise (1,000 paths, overlapping 2026 blocks). The recommended one is picked because it has the
  lowest loss rate near the top of H1 and it is the easiest to explain.
- **Kelly:** full Kelly on the 2026 LIT trades is 22% (H1) / 20% (H2) of the bankroll per trade, with the room as the
  bankroll. 40% of the room is about 2x Kelly, but Kelly is not the right yardstick here: the payouts are capped ($2,000 a
  request, 5 requests) and every payout resets the room to $2,000, so growth past the cap is worthless and a smaller size
  only slows the payouts. Half Kelly (10%) loses almost nothing (0.2%) but pays $3,243 / $1,805 and the first payout takes 43 / 64 sessions.
- **Holding back more than the buffer** (asking for $1,000 less each time) lowers the payouts by $200-300 in 6 months and
  barely moves the loss rate (it is already 1-2%): not worth it.
- **2021-25 (reference only, 5m entries, LIT PF 1.01 there):** no sizing makes LIT pay there; normal size loses 24 of 25
  back-to-back funded accounts in 5 years ($125 a month paid), the recommended mode 2 of 3 ($44 a month): it shrinks with the room
  instead of dying.
- **Nothing live changed.** To switch it on after a pass: see "The config" below.

## How it was measured

- **Account rules modelled (MFFU Builder 50K funded / sim-funded; MFFU help-center summaries via search 2026-10-18, partly
  unconfirmed, see `lit-prop-firms.md`):**
  - Max loss $2,000 trailing the end-of-day high, locks at start + $100 ($50,100). Checked against the worst open loss inside
    the day.
  - $1,000 soft daily loss: the position is flattened, the day ends.
  - Payout request at a session's end when: balance − $2,100 buffer >= $500; at most $2,000 a request; at least 2 traded days
    in the cycle; best day <= 50% of the cycle's profit; first after 2 sessions; 5 sim payouts. 80% to the trader. A payout
    lowers the balance, never the floor (so after a payout the room is back to $2,000).
  - $1.40 a micro, 1 tick of slippage on market entries and stop exits, max 40 micros.
- **Samples:** 1,000 Monte Carlo accounts of 126 sessions (6 months; 63 = 3 months) in 5-session blocks from the half; the
  same paths for every config. Back to back on real history (a new account the session after one is lost or reaches 5
  payouts) is in each run's verdict; real H1 / H2 is only one account long, so it is a sanity check, not a score.
- **Pick on H1, check on H2.** The recommended config is in the top group of H1 and holds in H2 (loss 2.2%, $4,479).
- Code: `tools/lit_funded.py` (grid, `research/lit/funded.json`), stage 2 / 3 grids `research/lit/funded_stage2.json`,
  `funded_stage3.json`. Sizing: `engine/sizing.funded_qty` (the same function the live loop calls).

## Why today's sizes lose funded accounts

- On a fresh funded account the room is $2,000 and does not grow until the floor locks (the floor trails the end-of-day high
  until +$2,100). Three $800 stop-outs before the first good winner end the account.
- Every payout takes the balance back to the $2,100 buffer, so the room is back at $2,000 after each payout: the account is
  "fresh" again five times.
- The recommended mode risks 40% of what is left: $800, then about $480, $290 ... A losing run shrinks the size instead of
  ending the account, and the floor guard never lets 1 micro reach the floor.

## The config (do not switch on without the owner)

```json
"lit_sizing": {"mode": "funded",
               "funded": {"pct": 0.4, "pct_min_usd": 100, "pct_max_usd": 800, "ref": 20, "wk": true,
                          "room_f": null, "max_win": 1500, "slip_ticks": 2, "skip_breach": true},
               "guard": {}}
```

- The room comes from the funded account: `engine.sizing.funded_state(day_pnl, today_cum, payouts)` (payouts lower the
  balance, never the floor). The callers (engine/live.py `_equity_qty`, tools/cloud_monitor.py `paper_size`) must pass
  `state=funded_state(...)` when the mode is "funded"; without it the mode trades the smallest size ($100) and logs why.
- The eval stays on `two_week`. Switch to `funded` on the first session of the funded account.

## Risk guard audit (2026-10-18)

| Guard | Where it is today | Finding | Fix |
|---|---|---|---|
| Max 1 trade a day | the model only (`engine/lit.py` max_per_day) | the router (`engine/live.py`) routes any new model entry_t; a feed revision that drops the day's first trade and creates a later one routes a 2nd trade | `lit_sizing.guard.max_per_day` (sizing.py, done); live.py must pass `n_today = self.trades_today()` in the state |
| No new trade once the eval target is reached | `two_week` only (`stop_at_target`) | eval / safe_eval / fast_eval keep trading a passed eval | `guard.stop_at_target` (done) for every eval mode, needs `profit`/`cum` in the state |
| Stop-out inside the floor / DLL with 2 ticks and the ~88-pt 1m stop | two_week: 1 tick, no commission in the room cap; safe_eval / eval: no slip or commission | with the 60% room cap it only fails near an empty account; with all-room configs (A0) it can pass the floor | `guard` worst case = (stop + 2 ticks [+ 2 pts when the stop is an estimate]) x $2 + $1.40 per micro, must stay below the room and the daily loss left (done) |
| Min 1 micro when the cap says 0 | every mode | 1 micro can still breach: a 47-pt stop at $50 room loses $96 | `guard.breach = "skip"` (default when the guard is on); `"one"` keeps the old rule. Funded mode always skips |
| Sized from an estimate (1m CISD close) | live.py `_confirm_provisional` only warns | the real open can widen the stop after the size is fixed | pass `est: true` with the trade (done in sizing: +2 pts in the worst case) |
| Max 40 micros | sizing (min(q, 40)) + NinjaTrader refuses > 40 | ok | guard re-checks 40 |
| Sizing error | live.py `_equity_qty` routes the engine's size on an exception | fail-open: the room caps are skipped | fail closed (0) when the mode is an eval or funded mode |
| Kill switch | live.py, saved in live_state.json | restored only on the same trading day: a restart the next day re-arms it silently | keep the flag until cleared by hand |

## No reset: the eventual pass (owner 2026-10-18: "I'm not resetting it at all")

The eval is a one-time fee, so an eval that is not passed in 10 sessions just keeps going. `tools/lit_eventual.py`
(`research/lit/eventual.json`): one eval with no reset, sized by `engine/sizing.lit_qty` exactly as live, $1.90 commission.
Exact = a fresh eval on every session of the half, played on that half's sessions; MC = 2,000 evals x 120 sessions in
5-session blocks.

| Eval sizing (no reset) | p10 exact H1 / H2 | p10 MC H1 / H2 | eventual pass MC H1 / H2 | eventual fail MC H1 / H2 | exact eventual pass / fail H1 · H2 | median sessions to pass MC H1 / H2 |
|---|---|---|---|---|---|---|
| C (two_week) to the end | 53.4 / 51.5 | 51.5 / 54.1 | 77.3 / 75.0 | 22.6 / 25.0 | 73.7 / 18.6 · 70.6 / 29.4 | 6 / 5 |
| C 10 sessions, then eval | 53.4 / 51.5 | 51.5 / 54.1 | 78.4 / 75.8 | 21.6 / 24.1 | 73.7 / 18.6 · 77.9 / 22.1 | 6 / 5 |
| **C 10 sessions, then safe_eval (recommended)** | **53.4 / 51.5** | **51.5 / 54.1** | **80.0 / 77.3** | **19.9 / 22.6** | **72.9 / 17.8 · 91.2 / 8.8** | **7 / 5** |
| C 15 sessions, then eval | 53.4 / 51.5 | 51.5 / 54.1 | 78.0 / 75.8 | 22.1 / 24.1 | 73.7 / 18.6 · 73.5 / 26.5 | 6 / 5 |
| eval mode only | 40.7 / 23.5 | 38.8 / 25.6 | 80.3 / 76.2 | 19.7 / 23.6 | 81.4 / 6.8 · 95.6 / 4.4 | 11 / 15 |
| normal LIT size only | 30.5 / 16.2 | 34.5 / 18.7 | 80.2 / 76.5 | 19.8 / 23.6 | 81.4 / 6.8 · 100 / 0 | 12 / 19 |

- **Eventually about 3 in 4 evals pass whatever the sizing** (MC 75-80%); the sizing decides how fast. Two_week passes half of
  the evals in 10 sessions; the slow modes pass a quarter to 40%.
- **Recommended: two_week for 10 sessions, then safe_eval** (the normal LIT size capped at 60% of the room, min 1 micro): the same
  fast start as C, the best eventual pass of the fast configs (MC 80.0 / 77.3%, real H2 91%), median 7 / 5 sessions.
  The gap to "C to the end" is 2-3 points in the MC (noise-sized) but 14 points on the real H2 path, and it never risks
  "one winner passes" size on an eval that has had a bad run.
- Exact H1 starts near the end of June stay open (data ends), so the exact eventual numbers are lower bounds.
- **With the day guard on** (`lit_sizing.guard {}`: worst case = stop + 2 ticks + commission must stay inside the room and the
  soft daily loss; when even 1 micro would reach the floor, no trade):

  | C 10 sessions, then safe_eval | p10 / f10 exact H1 · H2 | eventual pass / fail / still open MC H1 · H2 |
  |---|---|---|
  | without the guard (min 1 micro) | 53.4 / 9.3 · 51.5 / 2.9 | 80.0 / 19.9 / 0.0 · 77.3 / 22.6 / 0.1 |
  | **with the guard** | **53.4 / 2.5 · 51.5 / 0.0** | **81.8 / 5.5 / 12.7 · 76.5 / 5.7 / 17.8** |

  The guard does not slow the passes and turns most fails into "parked" evals: near the floor the eval waits for a setup
  whose stop is narrow enough for 1 micro instead of blowing up on a wide one. With no reset fee a parked eval still has a
  chance; while parked it trades less than 2 a week (say so on the dashboard when room < ~$180).
- `lit_sizing.two_week_until 10` + `after_mode "safe_eval"` (engine/sizing.py) do the switch; `eval_clock` no longer says
  "reset recommended": after session 10 it says "session N, $X to go" (`reset` stays False).

## Exact code changes for files owned by others (not edited)

- **engine/live.py `_equity_qty`** (LIT branch):
  - pass the state to every mode when `lit_sizing.guard` is set or the mode is two_week / auto / funded:
    `st = self.eval_state() if mode in ("two_week", "auto") or lsz.get("guard") is not None else None`;
    `if st is not None: st = {**st, "n_today": self.trades_today()}`;
    room for `("safe_eval", "eval", "two_week", "auto")` (add "auto");
    for mode "funded" (or "auto" after the pass): `st["funded"] = _sz.funded_state(<routed P&L per day since lit_sizing.funded_start>,
    self.day_pnl_routed(), payouts=<lit_sizing.funded_payouts {day: $}>)` (and `st = st["funded"]` for mode "funded").
  - fail closed: in the `except` branch, `if (lsz or {}).get("mode") in ("eval", "safe_eval", "fast_eval", "two_week", "auto", "funded"): return 0`
    instead of routing the engine's size.
  - kill switch: in `_restore`, read `kill` before the same-day check (`self.kill = bool(s.get("kill")) and not clear_kill` above
    `if s.get("day") != today ...: return`) so a kill survives the next day's restart until cleared by hand.
- **tools/cloud_monitor.py `paper_size`**: the same state (`lit_eval_state(...)` for two_week / auto / guard, with
  `"n_today"` = ledger entries on that trading day before t), room for "auto" too.
- **tools/lit_2wk.py**: its P&L still uses $1.40; the sizing (engine/sizing.py) now uses $1.90 and a 2-tick daily-loss cap.
  tests.test_lit_2wk_sizing stays 22/22 (no stored number moved).
