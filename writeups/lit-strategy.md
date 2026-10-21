## In one minute

- **Question:** the owner trades LIT with a LIT TradingView indicator and thinks it beats the Liquidity Engine. Is that true on our futures data?
- **What was built:** every component of the indicator (session boxes, opens, PO3, high/low-of-week window, NWOG/NDOG, VIX move,
  vector candles, inducement, build-ups, protected highs/lows), computed from CME NQ1! 5m bars only (`data/NQ_5m.csv`, 2021-11 to
  2026-10-16, real volume) plus `data/VIX_1d.csv`. It runs as a **separate, pure LIT strategy**: none of the engine's rules, no
  cold-streak filter, no late-entry rule, no engine targets. Only the size rule and the scoring are shared, so the numbers compare.
- **Answer: no.** Mechanical LIT, as the components define it, breaks even. With the best combination of its own components it
  makes a small, steady profit in both periods, but in 2026 it earns about a quarter of what the current bot earns. Its drawdowns
  are 2-3x larger, so it fails the 50K eval far more often.

## Head to head (same 1,278 sessions, costs included, $800 up to a 20-pt stop then 800×20/stop, MNQ, max 40 micros)

| | Trades/wk | % weeks 2+ | Win % | PF | Net $ | $/month | Max DD | Eval pass/fail in 2 weeks | Eval pass/fail in 1 month | Eval pass rate (MC) | Back-to-back evals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **Current bot, 2026** | 2.16 | 71% | 25.8% | **3.94** | **+20,487** | **2,088** | −2,249 | 20.4% / 0.0% | 34.0% / 0.0% | **95.9%** | 4 / 1 |
| **Best LIT (lit_A), 2026** | 2.99 | 83% | 22.0% | 1.26 | +5,258 | 536 | −6,883 | 10.2% / 8.7% | 21.4% / 32.5% | 43.0% | 3 / 4 |
| **Current bot, 2021-25** | 3.17 | 92% | 21.1% | **1.27** | +16,379 | 321 | **−9,265** | 4.1% / 1.9% | 8.8% / 5.2% | **46.7%** | 8 / 10 |
| **Best LIT (lit_A), 2021-25** | 4.09 | 98% | 17.4% | 1.15 | **+31,469** | **616** | −20,948 | 19.0% / 35.1% | 27.6% / 57.5% | 36.0% | 30 / 70 |
| Current bot, 5 years | 3.00 | 89% | 21.6% | 1.54 | +36,866 | 606 | −9,265 | 6.7% / 1.6% | 13.1% / 4.4% | 59.6% | 12 / 11 |
| Best LIT, 5 years | 3.91 | 96% | 18.0% | 1.16 | +36,727 | 603 | −20,948 | 17.6% / 30.9% | 26.6% / 53.8% | 33.9% | 33 / 75 |
| LIT as taught (NY killzones, market entry), 2026 | 0.51 | 5% | 38.1% | 0.94 | −192 | −20 | −1,697 | 0 / 0 | 0 / 0 | 21.9% | 0 / 0 |
| LIT as taught, 2021-25 | 1.25 | 36% | 31.0% | 0.77 | −10,171 | −199 | −11,503 | 0.0% / 0.9% | 0.2% / 3.7% | 6.1% | 0 / 9 |
| Every LIT setup, no filter, 2026 | 4.17 | 95% | 23.8% | 0.97 | −841 | −86 | −7,962 | 7.3% / 6.3% | 15.5% / 34.5% | 24.5% | 2 / 7 |
| Every LIT setup, no filter, 2021-25 | 4.66 | 99% | 21.9% | 1.01 | +3,907 | 77 | −32,558 | 12.8% / 40.4% | 20.6% / 68.4% | 29.3% | 24 / 80 |

"Eval pass rate (MC)" = passed / (passed + failed) over 2,000 random 60-session MFFU Builder 50K evals built from that period's days.
The current bot's row is the locked strategy (run `baseline`, with its cold-streak filter); the LIT rows have no filter at all.

How to read it: over five years both make about the same money (+$36.7k vs +$36.9k). The bot made most of its money in 2026 with a
small drawdown; LIT made its money mostly in 2024 with a drawdown of −$21k, more than ten times the 50K eval's $2,000 loss limit.
On an eval that means: LIT passes more evals inside 2 weeks (it trades more and swings harder), but it **fails** 35% of them inside 2
weeks in 2021-25, against 1.9% for the bot.

## What LIT is, and how each part was built

LIT ("Liquidity Inducement Theorem") reads the market as a hunt for stops. Traders are first **induced** into early entries (a small
high or low that looks like a turning point); price then **sweeps** the real pool of stops (a session high/low, a day/week high, or a
**build-up** of equal highs/lows), **displaces** hard the other way, often on a high-volume **vector candle**, and **shifts
structure** (breaks the last swing). The trade goes in that new direction, with the stop beyond the **protected** high/low (the
extreme that started the break) and the target at the next resting liquidity.

The owner's indicator files were not in `tradingview/lit/` while this ran, so the standard public definitions were used. The one
public LIT indicator found ("LIT - Timing" by Reimfx on TradingView) draws an Asia range plus two **one-hour** inducement windows at
the London and NY opens, so those are among the session definitions tested. Every definition below is a parameter in `engine/lit.py`.

| Component | How it was built (all times New York, each value known at the close of its bar; no look-ahead) |
|---|---|
| Asia box | High/low of 20:00-00:00 (also tested 18:00-00:00 and 19:00-00:00). A level only after the box closes. |
| London box | 02:00-05:00 (killzone), 03:00-04:00 (London-open hour, Reimfx style), 02:00-03:00 (Frankfurt hour). |
| NY trap box | 08:00-09:00, 08:30-09:30, 09:30-10:00, 09:30-10:30; premarket 04:00-09:30. |
| Session markers | Frankfurt 02:00, London 03:00, London close 11:00 (tested as entry windows and box edges). |
| Daily levels | PDH/PDL (previous 18:00-17:00 day), PWH/PWL, PMH/PML (previous calendar month). Weekday is recorded. |
| Opens | Weekly open, 18:00, 22:00, midnight, 08:30, 09:30, 10:00, plus the open of the current 1H and 4H candle (4H from 18:00). |
| PO3 | For each open: did the sweep go beyond the open (manipulation)? Is the entry still on the cheap side of it (accumulation)? |
| High/low-of-week window | Tuesday 03:00 to Wednesday 11:30. Also recorded: "this sweep made a new low/high of the week". |
| NWOG / NDOG | Friday 17:00 close to Sunday 18:00 open; previous 17:00 close to 18:00 open. Both edges used as levels/targets. |
| VIX one-day move | Previous VIX close ÷ 100 ÷ √252 × the 18:00 open. The sweep's distance from the 18:00 open is measured in these moves. |
| Vector candles (PVSRA) | The data has real volume. Climax = volume ≥ 200% of the 10-bar average, or volume × range ≥ the highest of the last 10. Above average = 150%. |
| Build-ups | Two swing lows (or highs) within 0.15 ATR of each other, at least 3 bars apart, untouched in between. These are the "equal lows". |
| Inducement | Minor swing lows (above the swept level for a long) that were taken out before the real sweep. Counted (0, 1, 2, 3+). |
| Sweep | A known level breached for the first time in the 2 hours before the leg's extreme. |
| Displacement + shift | First close beyond the last swing high made before the extreme. Displacement strength = largest candle body ÷ ATR. |
| Entry / stop / target | Limit on the retest of the broken swing (or at market, or 50/62/70% retrace), valid 1 hour. Stop 2 pts beyond the protected low/high. Target = the nearest unbroken level of the chosen kind at least 1.5R away, banked at 5R. Breakeven at 1R, flat by 15:55, 1 trade a day. |

Costs: 1 tick of slippage on market entries and on stop and market exits, plus $1.40 per micro round trip. A bar that touches both
stop and target counts as a stop.

## Which components matter

Each line adds one component on top of "every LIT setup, 02:00-15:30, retest entry". "Better in both" means the PF rose in 2026 and
in 2021-25. Most effects are small; results for the NY-only and London+NY bases point the same way (`research/lab/lit_results_*.json`).

| Component tested | 2026 trades | 2026 PF | 2026 net $ | 2021-25 trades | 2021-25 PF | 2021-25 net $ | Better in both? |
|---|---:|---:|---:|---:|---:|---:|---|
| Every LIT setup (no filter) | 172 | 0.97 | -841 | 999 | 1.01 | +3,907 | - |
| Enter at market after the shift (instead of on the retest) | 161 | 0.52 | -12,234 | 1003 | 1.03 | +6,480 | no |
| Inducement: at least 1 minor low/high taken first | 171 | 0.95 | -1,583 | 994 | 1.01 | +2,484 | no |
| Inducement: at least 2 taken first | 160 | 0.92 | -2,192 | 967 | 0.95 | -12,252 | no |
| Inducement: at least 3 taken first | 140 | 1.06 | +1,542 | 875 | 1.0 | -239 | no |
| Displacement has a PVSRA climax vector candle | 122 | 1.05 | +1,025 | 861 | 1.02 | +4,961 | barely |
| No vector candle at all | 103 | 1.21 | +3,159 | 621 | 0.96 | -6,701 | no |
| Displacement candle body ≥ 1 ATR | 135 | 1.12 | +2,788 | 921 | 1.04 | +9,130 | **yes** |
| Sweep runs ≥ 0.5 ATR through the level | 164 | 1.09 | +2,428 | 975 | 1.05 | +11,440 | **yes** |
| Only Asia/London box sweeps | 144 | 0.81 | -4,441 | 895 | 1.13 | +27,345 | no |
| Only NY trap-box sweeps | 47 | 1.38 | +1,716 | 494 | 0.71 | -22,160 | no |
| Only build-up (equal highs/lows) sweeps | 144 | 1.18 | +4,347 | 941 | 1.01 | +3,096 | no |
| Only PDH/PDL, PWH/PWL, PMH/PML sweeps | 23 | 1.31 | +812 | 209 | 0.79 | -8,576 | no |
| Asia box 20:00-00:00 swept | 54 | 0.99 | -103 | 559 | 1.09 | +11,873 | barely |
| Asia box 18:00-00:00 swept | 52 | 1.06 | +515 | 540 | 1.03 | +3,245 | barely |
| London box 02:00-05:00 swept | 67 | 1.31 | +2,984 | 545 | 0.94 | -7,312 | no |
| London-open hour 03:00-04:00 swept | 98 | 1.34 | +4,050 | 567 | 1.04 | +5,342 | **yes** |
| Frankfurt hour 02:00-03:00 swept | 96 | 0.78 | -3,362 | 633 | 1.2 | +27,431 | no |
| NY trap 08:00-09:00 swept | 31 | 1.65 | +1,919 | 377 | 0.79 | -11,787 | no |
| NY trap 08:30-09:30 swept | 22 | 0.44 | -1,287 | 334 | 0.8 | -8,345 | no |
| NY trap 09:30-10:00 swept | 27 | 0.51 | -1,407 | 291 | 0.62 | -16,606 | no |
| Premarket 04:00-09:30 swept | 20 | 0.41 | -1,351 | 288 | 0.73 | -9,609 | no |
| PO3: sweep beyond the midnight open | 155 | 1.12 | +3,162 | 973 | 1.02 | +5,060 | barely |
| PO3: sweep beyond the 18:00 open | 145 | 0.84 | -3,893 | 962 | 0.98 | -3,726 | no |
| PO3: sweep beyond the 4H open | 164 | 1.02 | +442 | 996 | 1.01 | +3,068 | no |
| PO3: entry still on the cheap side of the 18:00 open | 127 | 0.86 | -3,264 | 895 | 0.95 | -11,368 | no |
| PO3: sweep beyond the 09:30 open | 57 | 0.9 | -668 | 579 | 0.77 | -19,646 | no |
| VIX move: sweep within 0.5 implied moves of the 18:00 open | 139 | 1.1 | +2,516 | 933 | 1.04 | +11,095 | **yes** |
| VIX move: sweep beyond 0.5 implied moves | 80 | 0.58 | -4,935 | 448 | 0.81 | -14,464 | no |
| Inside the high/low-of-week window (Tue 03:00 to Wed 11:30) | 66 | 1.26 | +2,549 | 395 | 1.13 | +11,949 | **yes** |
| Sweep makes a new low/high of the week | 50 | 1.09 | +707 | 406 | 0.68 | -30,479 | no |
| Entries in London only (02:00-05:00) | 98 | 0.93 | -1,315 | 685 | 0.95 | -9,341 | no |
| Entries in the NY killzones only | 44 | 0.99 | -42 | 496 | 0.87 | -8,977 | no |
| London + NY AM | 108 | 1.08 | +1,484 | 803 | 0.95 | -11,222 | no |
| Target: nearest build-up | 131 | 0.94 | -1,613 | 862 | 0.91 | -19,642 | no |
| Target: nearest session-box level | 154 | 0.84 | -4,621 | 839 | 0.92 | -17,463 | no |
| Target: PDH/PDL, PWH/PWL, PMH/PML | 167 | 1.03 | +807 | 990 | 1.12 | +31,647 | **yes** |
| Target: fixed 2R | 173 | 0.88 | -3,627 | 1007 | 0.97 | -8,603 | no |
| Target: fixed 4R | 173 | 1.11 | +3,148 | 1008 | 1.02 | +5,551 | barely |
| No breakeven move | 172 | 0.78 | -8,556 | 999 | 1.04 | +13,172 | no |
| 30-min time stop | 172 | 1.1 | +1,741 | 999 | 0.98 | -2,603 | no |

**Hold in both periods (small but real):** a strong displacement candle (≥ 1 ATR), a deep sweep (≥ 0.5 ATR through the level), the
VIX move (sweeps that are **not** stretched beyond half an implied move from the 18:00 open), the high/low-of-week window, and taking
profit at the **previous day/week/month** highs and lows. Less clear: the London-open hour box, a PVSRA climax vector candle, the
midnight-open PO3, a fixed 4R target.

**No edge, or the wrong sign:** inducement (requiring 1, 2 or 3 taken first changes nothing or makes it worse, which matches the
engine's earlier `x_inducement` result), the NY trap boxes and the premarket box (all lose money in 2021-25), the 18:00-open and
09:30-open PO3 reading, "new low/high of the week", build-up and session-box targets, a fixed 2R target. Entering at market after the
shift instead of on the retest wrecks 2026 (PF 0.52), because 2026 stops are wide and the retest halves them.

## The best combination, and the critic pass

Combinations of up to three of the nine strongest components (122 in total) were ranked on the **odd months only**. The **even
months** were kept back as the check. Rule set `lit_A` came first:

> Every LIT setup 02:00-15:30 (London and New York), **displacement candle ≥ 1 ATR**, **sweep ≥ 0.5 ATR deep**, limit entry on the
> retest of the broken swing, stop 2 pts beyond the protected low/high (8-80 pts), **target = nearest previous day/week/month high or
> low** at least 1.5R away (bank at 5R), breakeven at 1R, 1 trade a day.

| Check | Result |
|---|---|
| Odd months (used to choose) / even months (held back) | PF 1.23 +$26.3k / PF 1.09 +$10.5k: holds, weaker out of sample |
| Year by year | 2021 +$0.9k · 2022 +$3.7k · 2023 +$5.7k · **2024 +$23.3k** · 2025 **−$2.3k** · 2026 +$5.3k. Two thirds of the money is one year. |
| Longs / shorts (2021-25) | PF 1.14 / 1.15: balanced |
| +2 ticks of slippage | 2026 PF 1.23 +$4.8k; 2021-25 PF 1.10 +$23.0k |
| 25 neighbouring settings (displacement 0.8/1.2, depth 0.3/0.75, max stop 60/100, windows, breakeven, min R, bank, stop buffer, retest wait, targets, swing look-backs) | All profitable in both periods except market entry (2026 PF 0.80) and a 3R bank (2026 PF 1.01). PF 1.07-1.44 in 2026, 1.07-1.28 in 2021-25. |

**Critic verdict:** `lit_A` is a real but **thin** edge (PF 1.15-1.26). It survives every robustness check, but most of its money
comes from 2024 and it lost in 2025. It does **not** beat the current bot. In 2026 it is far behind on PF, money and drawdown. In
2021-25 it makes more money only by trading more and swinging much harder: a −$21k drawdown, and evals that fail 35% of the time
within 2 weeks. It also runs at 4.1 trades a week in 2021-25, just above the owner's 2-4 band. The runner-up `lit_B` (VIX-move filter
instead of displacement) makes the most 2021-25 money (+$43.6k, PF 1.19), but 2026 is weaker (PF 1.15, +$3.2k) and all its 2021-25
edge comes from longs, so it is likely riding the bull market. Nothing here should replace or be blended into the live bot.

## Example trades

Eight `lit_A` trades are charted in `research/study/lit/`: four targets, two stops, one breakeven and one end-of-day exit. Each chart
marks the swept level, the sweep, the protected low/high (circle), the swing that broke (square), entry, stop and target. PVSRA climax
candles are drawn darker.

## Questions for the owner (the "discretion" a computer can't see)

1. **Session boxes:** what exact times does your indicator use for the Asia box, the London box and the NY trap box? Is the NY trap
   08:00-09:00, 08:30-09:30 or 09:30-10:00? (09:30-10:00 lost money here: PF 0.51 / 0.62.) Please drop the Pine file or a
   screenshot of its settings into `tradingview/lit/`.
2. **Which sweeps do you take?** Any box high/low, only Asia/London, only the trap box, or only PDH/PDL and equal highs/lows? Do you
   need two levels swept together?
3. **Inducement:** what counts as "the" inducement? The first pullback low after a break of structure, or any minor low? How close to
   the real level must it be? (As coded, requiring it made no difference.)
4. **Displacement:** how big must the move be? Must it leave a fair value gap? Must the candle be a vector candle, and which colour?
5. **Structure shift:** which timeframe (1m, 5m, 15m), and which swing has to break: the last minor swing or the swing that made the
   leg?
6. **Entry:** at the break, on the retest of the broken level, or in the order block / FVG? How long do you wait for the retest?
   (The retest is what keeps 2026 stops small enough to trade.)
7. **Stop:** beyond the sweep extreme (as coded), or beyond a closer protected low on the lower timeframe?
8. **Target:** the nearest build-up, the session high/low, or PDH/PWH? Do you take partials? (Previous day/week/month levels were
   clearly best.)
9. **PO3 and opens:** which candle do you read (1H, 4H, daily from 18:00 or from midnight) and what exactly must happen relative to the
   open? (Only the midnight open helped, a little.)
10. **High/low-of-week:** do you trade only inside the Tuesday-Wednesday window, or use it to choose the direction?
11. **VIX move:** do you use the band as a target, as a "too far, don't chase" filter (helped here), or as a reversal zone?
12. **Bias:** do you take only one direction per day (daily or weekly bias)? If so, how do you decide it before the open?
13. **Time windows:** London and New York both, or New York only? (New York only gives 1 trade a week in 2026.)

## Files and how to rerun

- `engine/lit.py`: every component plus the setup detector and the executor. Research only; the live engine is untouched.
- `tools/research_lit.py`: `grid <day|ny|lon_ny>` runs the one-component tests (`research/lab/lit_results_<base>.json`), `combos`
  searches combinations (odd-month selection), `critic` runs the robustness checks (`research/lab/lit_critic.json`), `save` stores the
  runs (`lit_textbook_ny`, `lit_raw_day`, `lit_A`, `lit_B`, tag `lit`), and `charts` draws the example trades.
- Data: CME NQ1! 5m (back-adjusted), `VIX_1d.csv` and `VXN_1d.csv`. The 1m file only covers 2026, so it was not used (both periods
  must be judged the same way). `ES_5m.csv` starts in 2025-04, so no ES/NQ SMT was tested.
