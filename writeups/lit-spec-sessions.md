# LIT session and timing spec (research only)

All times are America/New_York with DST handled by the clock, not by a fixed offset. The trading day runs 18:00 to 17:00.
"mod" means minutes after midnight ET, as in `engine/lit.py`. Each rule is tagged with where it comes from and how sure that is:

- **[R]** Reimfx "LIT - Timing" TradingView indicator (the only public tool by a LIT author; closed source, description only).
- **[ICT]** ICT's own lectures, quoted with timestamps in the open `SrsBlack/ict-knowledge-library` (2016-17 mentorship and the 2022 YouTube mentorship).
- **[IET]** Inter Equity Trading "liquidity inducement" videos (index futures and gold, 2026), transcribed in the open `PravinderSamra/CTrader-Bots` repo ("Liquidity Trap" folder).
- **[TT]** TTrades material as published in community TradingView scripts (Daily Bias @ttrades x joshuuu, Fractal Model).
- **[QT]** Daye Quarterly Theory (community scripts).
- **[C]** Common community convention only, with no single authoritative source.

Blocked during this run: tradingview.com, luxalgo.com, scribd.com, selar.com and innercircletrader.net all refused the fetch (proxy
policy), so the TradingView pages are known only from search-engine extracts. No LIT author publishes exact box times as text.
**The owner's own indicator settings remain the only way to get "the" LIT times.** Until then, test the candidates below.

Priors from the existing grid (`research/lab/lit_results_day.json`, run on top of "every LIT setup"). 2026 is now the only gate,
so the 2026 column matters most. Small samples are marked:

| Component | 2026 trades | 2026 PF | 2026 net | Note |
|---|---:|---:|---:|---|
| London-open hour 03:00-04:00 swept | 98 | 1.34 | +$4,050 | best session box, also fine in 2021-25 |
| NY trap 08:00-09:00 swept | 31 | 1.65 | +$1,919 | thin; 2021-25 PF 0.79 |
| NY trap 08:30-09:30 / 09:30-10:00 swept | 22 / 27 | 0.44 / 0.51 | -$1.3k / -$1.4k | avoid |
| Inside high/low-of-week window | 66 | 1.26 | +$2,549 | holds in both periods |
| PO3: sweep beyond the midnight open | 155 | 1.12 | +$3,162 | small edge |
| PO3: sweep beyond the 18:00 open | 145 | 0.84 | -$3,893 | negative |
| VIX: sweep within 0.5 moves of the 18:00 open | 139 | 1.10 | +$2,516 | "don't chase" filter works |
| VIX: sweep beyond 0.5 moves | 80 | 0.58 | -$4,935 | the mirror image |
| Entries London only / NY only / both | 98 / 44 / 108 | 0.93 / 0.99 / 1.08 | | no window alone carries it |

---

## Q1. Session boxes: Asia, London and the NY trap box

**What the sources say**
- [R] "LIT - Timing" draws **one purple Asia box covering "the full 8 hours of Asia Session"** that "respects the day open gap"
  (it starts after the 17:00-18:00 break, not across it), then **two grey one-hour boxes: the London Open Inducement Window and
  the NY Open Inducement Window**. Times are built on a UTC-7 clock and are DST-adjusted. Exact hours are not printed.
  The author says a break of the Asia high/low is liquidity grabbing, often followed by a reversal after the false break, and that
  the grey windows are "when major liquidity is typically introduced" (look for grabs or mitigations).
- [ICT] Asia range **20:00-00:00** (the only clocked Asia window in ICT's own material). Size gate: "Asian range has to be 20 to 30
  pips"; above 40 pips use the "delayed protraction" profile (London is not traded normally). Draw it from bodies but include wicks.
- [ICT] London killzone **02:00-05:00** (2022) or **01:00-05:00** (2017, which ICT calls "the real one"). London lunch 05:00-07:00
  is a stand-down. NY killzone 07:00-10:00 (forex) or **08:30-11:00 for index futures**; CME open **08:20**.
- [ICT] Index futures opening range = **09:30-10:30** (volume in the first 30 min); "tends to create the high or low of the day".
  Small range: expect expansion. Large range: expect a later violation of one side and trade retracements into it.
- [ICT] NY AM open-range model: **08:00-08:30 or 08:00-09:00** box; a sweep of one side during 09:00-11:00 is the trigger,
  and HTF bias picks the side.
- [C] Session-trap scripts (STRX, Session Liquidity Signals): a trap means a wick beyond the box high/low with a **close back inside**.
- [IET] "Moves at stock open are presumed traps": an entry around 09:30 is usually the trap; trade the reversal after it.

**Inference (to test, not proven):** an 8-hour Asia box that respects the gap and ends where the London window begins gives
these consistent pairs (London summer time is 5 h ahead of NY; the US and UK switch DST on different dates, so a few weeks in March
and Oct/Nov shift by an hour):

| Pair | Asia box | London inducement hour | Reasoning |
|---|---|---|---|
| P1 | 18:00-02:00 | 02:00-03:00 (Frankfurt open = 08:00 CET) | starts right at the reopen |
| P2 | 19:00-03:00 | 03:00-04:00 (London 08:00-09:00) | Tokyo 08:00 to London open |
| P3 | 20:00-04:00 | 03:00-04:00 | ICT Asia start, 8 h |

NY inducement hour candidates: **08:00-09:00** (forex NY open, ICT open-range model), 08:30-09:30 (data hour), 09:30-10:30 (index opening range).

**Codeable rules**
- `asia_box`: start in {18:00, 19:00, 20:00}, end in {00:00, 02:00, 03:00, 04:00}. **New:** the code only has boxes ending at midnight;
  add boxes that end at 02:00/03:00/04:00 (they live across midnight, so keep them inside the 18:00 trading day). Known only at its close.
- `asia_size_gate`: trade the Asia-sweep setup only if the Asia range is between `a_min` and `a_max` points. NQ scale: test
  a_min in {0, 40, 60} and a_max in {150, 200, 300, none}, or as a fraction of ATR(daily, 14) in {0.15-0.45}.
- `lon_box`: one hour starting at {02:00, 03:00}, or the killzone {01:00-05:00, 02:00-05:00}.
- `ny_box`: {08:00-09:00, 08:00-08:30, 08:30-09:30, 09:30-10:30}. Priors say 08:00-09:00 is the only one worth keeping in 2026.
- `trap_close_back`: a sweep counts only if a bar closes back inside the box within `n_back` bars (test n_back in {1, 2, 3, 6} on 5m,
  or {1-5} on 1m in 2026).
- `or_size_rule` (09:30-10:30 range): if OR < `k_small`×ATR expect expansion (trade the break-and-retest); if OR > `k_big`×ATR,
  trade only sweeps of its far side. k_small in {0.3, 0.5}, k_big in {0.8, 1.0, 1.2}.

## Q2. Which sweeps to take

**Sources**
- [ICT]/[C] Sequence: London takes one side of Asia; NY continues London or reverses after taking a London extreme. ICT lists four
  session Judas swings: Asia (20:00), London open, CME/NY open (08:20) and London close.
- [ICT] NY Judas targets: London session high/low, premarket extremes, PDH/PDL. "When London already delivered the daily direction,
  NY tends to extend rather than reverse."
- [IET] Two-lines rule: mark the nearest confirmed pool above and below; everything between is noise; "wait for one of them to get
  taken, and react accordingly". Only confirmed pools (several touches, untaken) count.

**Codeable rules**
- `sweep_set` in {asia, london, ny_box, pdh/pdl, pwh/pwl, buildups} and the combos {asia+london}, {london in NY}, {any external}.
- `session_sequence` (new): in NY, take a sweep of the **London** high/low only. In London, take a sweep of the **Asia**
  high/low only. A "later session sweeps the earlier session" flag.
- `double_sweep` (new): two levels inside `tol` points (tol in {5, 10, 15}) swept by the same leg, e.g. Asia high plus PDH.
- `london_delivered` (new): if London (02:00-05:00) moved more than `m`×ATR in one direction (m in {0.5, 0.8, 1.0}), NY takes only
  continuation setups (a sweep of the pullback low in London's direction); otherwise reversal setups are allowed.

## Q9. PO3 and the opens

**Sources**
- [ICT] PO3 is defined on the **daily bar with the midnight open**: "when you're bullish, you want to be buying near or below the
  opening price"; "if we're bullish we're gonna be looking for the opening price at midnight" to buy below it. The 2017 "IPDA true
  day" is **00:00-15:00**. The weekly version uses the **Monday 00:00 open** (Sunday 18:00 as a second line).
- [TT] Bias candle opens: the 4H candles open at **18:00, 22:00, 02:00, 06:00, 10:00, 14:00** (the 14:00 candle ends 17:00). The Fractal
  Model pairs 5m execution with the 1H candle and 15m with the 4H, and special "T-spots" are the 4th-5th candle of the day or the 4th
  candle after 13:00. Buy below the midnight open on a bullish day, sell above it on a bearish day.
- [IET] The **06:00-10:00 4H candle** frames NY: at 10:00 the next 4H opens; on a bullish day take longs only after that candle's
  low is taken, around or after 10:00 (the "10:00 reversal"). Target the previous 4H high.
- [QT] Four 6-hour quarters: 18-00 Asia, **00-06 London (true day open = 00:00)**, 06-12 NY AM, 12-18 PM. Each splits into 90-min
  cycles with the second cycle as the "true open": **19:30, 01:30, 07:30, 13:30**.
- [ICT] Session pivots used as levels: 00:00, 08:30, 09:30 (and 08:20 CME open).

**Codeable rules**
- `po3_open` in {00:00 (default), 06:00 4H, 07:30 true session open, 08:30, 09:30, 10:00 4H, 18:00}. The rule: long only if the sweep
  extreme is **below** the open and the entry is at most `x` points above it, with x in {0, 0.25R, 0.5R, 1R, no cap}. Short is the mirror.
- `h4_reversal` (new, IET): from 10:00 to 11:30, a long requires the 06:00-10:00 4H low to be swept and a short requires its high to be
  swept. Target = the other end of that 4H candle (or at least 1.5R). Test start in {09:50, 10:00} and end in {10:30, 11:00, 11:30}.
- `po3_scale`: daily (midnight open) vs 4H (current 4H open) vs 1H (current hour open: buy below the hour open when bullish).
  The priors favour midnight only.

## Q10. High/low of week window

**Sources**
- [ICT] Weekly profiles: the classic **Tuesday low (or high) of the week, formed in Tuesday's London open and/or NY session**. The
  Wednesday version is when Monday and Tuesday hover without reaching the HTF array. "The weekly high or low forms Monday-Wednesday
  with ~70% odds". 30-50% of the weekly range is done by **Wednesday's London close**. Breaking the Monday-Wednesday range on Thursday
  or Friday is "aggressive confirmation" toward the weekly target.
- [ICT] Thursday reversal: Mon-Wed consolidates, then it runs the intraweek low or high around **14:00 on FOMC / rate news**.
  The "seek and destroy Friday" profile is to be avoided altogether.
- [C] Indicator wording: weekly high or low has the best odds between **Tuesday London open and Wednesday NY open**.

**Codeable rules**
- `how_window` (exists): Tue 03:00 to Wed 11:30. Test end in {Wed 09:30, Wed 11:30, Wed 12:00 (London close)} and start in
  {Mon 18:00, Tue 02:00, Tue 03:00}. Use it as a **size multiplier** (for example 1.0 in the window and 0.5 outside) instead of a hard
  filter, so trades stay at 2+ a week.
- `how_direction` (new): a sweep in the window that makes a **new weekly low** is long-only for the rest of the week until the
  weekly target (PWH or the HTF level) is hit, mirror for highs. The 2021-25 prior is bad (PF 0.68), so judge it on 2026 only.
- `mw_break` (new): on Thu/Fri, take continuation setups only in the direction that broke the Mon-Wed range.
- `friday_rule`: Friday size in {1.0, 0.5, 0}. Thursday 14:00 on FOMC days: skip or allow.

## NWOG / NDOG

**Sources**
- [ICT 2022] On CME index futures the weekly gap is **Friday's last trade to the Sunday 18:00 reopen**, plotted across the whole
  week as a "dynamic price level": support while price is above it, resistance below. ICT keeps about five of them. Areas: high, low
  and **CE (the midpoint)**. No fill rate is given in ICT's own material.
- NDOG: the 17:00 close to the 18:00 reopen each day. ICT's own examples are only the holiday and Sunday reopens; midnight is an
  open price, never a gap edge.

**Codeable rules**
- `gap_levels`: NWOG (Fri 16:59 close to Sun 18:00 open) and NDOG (17:00 close to 18:00 open); edges plus CE as targets/levels.
  Keep the last `n` NWOGs, n in {1, 3, 5}.
- `gap_side_filter` (new): long only above the current NWOG CE, short only below it (or the reverse, to test).
- `gap_min`: ignore gaps under {4, 8, 16} points.

## Q11. VIX implied move

**Sources**
- [C] One-day expected move = **price × VIX / 100 / √252** (1 standard deviation). For NQ, the VXN is the matching index (both files
  are in `data/`). Usual readings: the ±1 SD band is the day's "normal" range, ±2 SD is extreme, and the band edge is a target or a
  fade zone.
- No LIT author gives a rule. The prior grid says the "don't chase" use works (the sweep must sit within 0.5 moves of the 18:00 open)
  and that sweeps far out lose.

**Codeable rules**
- `vix_src` in {VIX, VXN}; `vix_anchor` in {18:00 open, 00:00 open, 09:30 open}.
- `vix_filter`: the sweep extreme must be within `k`×move of the anchor, k in {0.3, 0.5, 0.75, 1.0}.
- `vix_room` (new): skip if the target lies beyond anchor ± `k2`×move (k2 in {1.0, 1.5}). The target is capped at the band edge.
- `vix_fade` (new): treat a sweep that touches the ±1 move edge as an exhaustion reversal (the opposite use; test it only as a variant).
- `vix_size`: risk × {1.0 if VIX < 20, 0.75 for 20-30, 0.5 above 30} (a size rule, not a skip).

## Q12. Bias: one direction per day

**Sources**
- [TT] Daily bias from the previous day's candle: **close above PDH → bullish; close below PDL → bearish**. A wick below PDL that closes
  back inside the body or above is bullish (mirror for bearish). The bias ends (neutral) when its target (PDH or PDL) is hit. When
  bullish, buy below the midnight open.
- [ICT] Bullish daily bias wants price at or below the midnight open (discount). Stand-aside days: the previous day's range was
  above 2× the 5-day average; after 3 up closes no longs on day 4 (mirror for shorts); NFP Friday; the day before a holiday;
  several high-impact news events.
- [IET] "Once price starts taking out this high, buys should be out of your mind": after the opposite pool is taken, that side is off
  for the day. A two-sided "ping pong" day is allowed only when paired with time (the 10:00 / 10:30 pivot).

**Codeable rules**
- `bias_rule` in {none, tt_pdhl (close beyond PDH/PDL plus the wick rule), midnight_open (price vs the 00:00 open at 09:30),
  first_sweep (the side of the first London or NY sweep sets the day)}.
- `one_dir`: after the first trade or the first qualified sweep, only that direction for the rest of the day. 1 trade/day already
  enforces this; test `max_trades=2` with one_dir on.
- `bias_expire`: the bias ends when PDH (bullish) or PDL (bearish) is hit; then no new trade that day.
- `stand_aside` (size, not skip, by owner rule): previous range > `r`×ADR5 (r in {1.8, 2.0, 2.5}) → 0.5 size; the 4th day after
  3 same closes → no trades in that direction.

## Q13. London vs NY

**Sources**
- [IET] **Index futures: NY only**, anchored on the 09:30 open ("sometimes around 8:00 but mainly after stock open"). Avoid NY lunch;
  never enter right before scheduled news, wait 2-4 min after it. In their own 22-session replay London gave comparable frequency
  and no demonstrated edge.
- [ICT] Index AM swing 09:30-12:00, with the day's high or low usually set 09:30-10:30. Lunch 12:00-13:00 (elastic 11:00-14:00).
  PM swing 13:00-16:00, the move starting about 14:00; the 15:00-16:00 hour makes the opposite extreme of the AM one. London close
  10:00-11:00 (to 12:00 on news days) reverses the London move when it reached an HTF level.
- [ICT] Index SMT: compare NQ with ES over **05:00-09:30** for the AM swing and **12:00-15:00** for the PM swing. Bullish when one index
  fails to make the lower low. ES 5m starts 2025-04, so 2026 is fully covered.

**Codeable rules**
- `entry_window` in {lon 02:00-05:00, ny 08:30-11:00, ny 09:30-11:30, lc 10:00-12:00, pm 13:30-15:30, combos}. The 2026 priors are
  flat for every window alone; combine with a better sweep set instead.
- `news_guard`: no entry from 2 min before to `w` min after high-impact US news, w in {2, 5, 15} (calendar in `data/news`).
- `lunch_block`: no entries 12:00-13:30 (test 11:30-13:30).
- `smt_gate` (new): a long needs NQ to make a lower low while ES does not (or the reverse) on the same leg, inside 05:00-09:30
  or 12:00-15:00. Use it as a size multiplier (1.25 or 1.0) or a filter.
- `time_stop`: flat by {11:30, 12:00, 15:55} for AM trades.

---

## What to test first (2026, picked on Jan-Jun, checked on Jul-Oct)

1. Asia box variants ending at 02:00/03:00/04:00 (P1-P3), paired with the London hour that follows (new code).
2. London-open hour 03:00-04:00 swept, plus the NY 08:00-09:00 box, as the sweep set, with `trap_close_back`.
3. IET `h4_reversal` at 10:00 (06:00-10:00 4H candle swept, target the other end).
4. PO3 midnight-open entry cap (`x` ≤ 0.5R) and the TT `tt_pdhl` bias, as size multipliers.
5. The high/low-of-week window and VIX/VXN 0.5-move "don't chase" filter as size multipliers (keeps 2-4/week).
6. NQ/ES SMT at the sweep (new; 2026 data is complete).

Guards: count trades/week after each filter (owner band 2-4, up to 5 allowed); prefer size changes to skips. Report each half
of 2026 separately and 2021-25 as a reference line only.

## Sources

- Reimfx, "LIT - Timing" (TradingView, closed source; read via search extract): https://de.tradingview.com/script/vukoCtAk/
- "LIT - Confirmations" checklist (TradingView): https://de.tradingview.com/script/whsmlREo-LIT-Confirmations
- ICT knowledge library (ICT transcripts with timestamps): https://github.com/SrsBlack/ict-knowledge-library (concepts/10-killzones,
  14-asian-range, 15-sessions, 12-power-of-three, 22-quarterly-theory, 25-htf-bias, 31-models/nwog.md, ndog.md, 16-smt-divergence)
- Inter Equity Trading "liquidity inducement" transcripts and docs: https://github.com/PravinderSamra/CTrader-Bots ("Liquidity Trap")
- Daily Bias @ttrades x joshuuu: https://es.tradingview.com/script/ezS0ydMQ-daily-bias-ttrades-x-joshuuu
- Fractal Model (TTrades) and HTF candle scripts: https://cn.tradingview.com/script/8TXxTSl8-Fractal-Model-TTrades
- Daye Quarterly Theory scripts: https://pl.tradingview.com/script/n2aeO1GB-Daye-Quarterly-Theory-by-toodegrees
- ES VIX expected daily move: https://www.tradingview.com/script/f2SY63Gz-ES-VIX-Expected-Daily-Move
- ICT NWOG/NDOG (TradingFinder): https://vn.tradingview.com/script/EEnbbfQH-ICT-NWOG-NDOG-Gaps-TradingFinder-New-Opening-Gaps
- Judas swing scripts (midnight 15m range; 09:30-09:45): https://tw.tradingview.com/script/TYoIs4Q3 and https://ar.tradingview.com/script/vT3NRUzp-ICT-Judas-Swing-Flux-Charts
- STRX Session Range Traps (trap = wick beyond, close back inside): https://vn.tradingview.com/script/u0QTFBr0/
- ICT kill zone times (blog): https://backtrex.com/en/blog/ict-kill-zones-trading-sessions-timing-guide
