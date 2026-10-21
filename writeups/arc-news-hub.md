# News hub (`tools/news_hub.py` -> `data/news/hub.json`)

One file with everything that moves the dollar and NQ over the next 10 days: the scheduled USD calendar from several
free sources, the last 48 hours of headlines from free RSS feeds, a 0-100 **USD impact** score per event, and what each
day means for the bot (blackouts, FOMC afternoons, the heaviest day of the week). Built on every cloud-monitor run, so the
phone page shows it with the PC off; the PC dashboard reads the same file through `/api/next/news`.

    python tools/news_hub.py --out data/news/hub.json            # live build (10 days ahead, 2 back, headlines 48 h)
    python tools/news_hub.py --out data/news/hub.json --offline  # rebuild from data/news/raw/ + the FF snapshot (no network)
    python tools/news_hub.py --out data/news/hub.json --print    # ... and print the day summaries
    python -m tools.news_hub --selftest                          # fixtures in tests/fixtures/news/, no network

Every raw fetch is saved to `data/news/raw/<slug>.<ext>` (gitignored). `--offline` rebuilds from those files; when they are
missing it still builds a complete hub from `data/news/ff_thisweek.json` (the engine's ForexFactory snapshot) and the
**engine calendar** (`engine/calendar_week.py` SCHEDULE + `data/news/events.csv` + `ff_archive.csv`), which needs no network.

## Sources (all free, no keys)

| Role | Source | URL | Notes |
|---|---|---|---|
| calendar | ForexFactory this + next week | `nfs.faireconomy.media/ff_calendar_thisweek.json`, `_nextweek.json` | USD High/Medium kept with forecast/previous/actual; USD Low kept only for Fed/Treasury speakers; USD holidays kept. The feed is refreshed hourly by FF; we read it once per run. |
| calendar | Fed FOMC calendar | `federalreserve.gov/monetarypolicy/fomccalendars.htm` | parser shared with `data/build_news.py` (`parse_fomc_html`): decision 14:00, presser 14:30 ET |
| calendar | BLS release schedule | `bls.gov/schedule/news_release/` | CPI, Employment Situation, PPI, JOLTS, Real Earnings, Import prices, ECI, Productivity |
| calendar | BEA release schedule | `bea.gov/news/schedule` | GDP, Personal Income & Outlays (PCE), trade |
| calendar | Treasury auctions | `treasurydirect.gov/TA_WS/securities/announced?format=json&pagesize=50` | notes/bonds/TIPS only (bills skipped), 13:00 ET |
| calendar + headlines | Fed speeches RSS | `federalreserve.gov/feeds/speeches.xml` | delivered speeches become past events (chair = 70, others = 35) |
| calendar + headlines | Fed press releases RSS | `federalreserve.gov/feeds/press_all.xml` | FOMC statement / minutes become events; everything else is a headline |
| calendar | engine calendar | `engine/calendar_week.py` + `data/news/events.csv` + `ff_archive.csv` | always available; the same list the bot's news filter uses |
| headlines | BLS, BEA, US Treasury, White House | RSS | official releases; URLs are best guesses for Treasury / White House, marked ok=false if they do not answer |
| headlines | MarketWatch (top stories, Market Pulse), CNBC (top, markets), FXStreet, Investing.com, ForexLive | RSS | market coverage |

Skipped: Reuters (paywalled), CME Group (no free RSS found), NASDAQ-100 earnings dates (needs per-ticker Yahoo calls;
`engine/news.py earnings()` already does that on the PC when yfinance works). Each source is optional: a failed fetch or a
parser that finds no rows is written to `hub.json["sources"]` with `ok=false` and an `error`, and the rest still builds.

**In the cloud sandbox used to build this** every news host was blocked by the proxy (403 on CONNECT), so only the
offline path could be exercised here; parsers for BLS/BEA are tolerant table readers (any row with a date, a time and a
release name) and are verified against fixtures. On GitHub Actions (plain internet) all of the above should answer; the
first real run will tell (`sources[].ok` in hub.json, and the `notes`).

## Scoring

**USD impact (0-100)** by event kind, then floored at 60 when the source marks the event High:

FOMC decision 100 · FOMC press conference 90 · CPI 95 · Jobs report (NFP, unemployment rate, hourly earnings) 95 · PCE 80 ·
GDP 70 · Fed chair speech/testimony 70 · ISM manufacturing / services 65 · Retail sales 65 · FOMC minutes 60 · PPI 55 ·
JOLTS 50 · ADP 50 · Jobless claims 45 · CB confidence 45 · President 45 · UMich 40 · ECI 40 · 10-yr / 30-yr auction 40 ·
PMI 35 · Fed speaker 35 · Treasury Secretary 35 · durables 30 · 20-yr auction 30 · regional Fed surveys 25 · productivity 25 ·
housing / trade / import prices / other auctions 20 · real earnings 15 · unknown kinds: High 60 / Medium 35 / Low 15 · holiday 0.

**Impact** = the source's High/Medium/Low when it has one (ForexFactory, engine calendar), else from the score
(>= 65 high, >= 40 medium). The bot blacks out **high** only, like `engine/model.py` (`news_before_min 15`,
`news_after_min 30`, `fomc_pm_off`), so the hub's `blackout` flag matches the engine's rule. When any source calls a release
high the merged row is high.

**Surprise**: `actual - forecast` when both are numeric, with `surprise_side` above/below/inline and a `usd_hint`
(`USD+` when a beat is dollar-bullish: inflation, jobs, growth, surveys; inverted for claims and the unemployment rate).

**Headlines**: relevance 0-100 from keyword groups (Fed/FOMC/rates 30; inflation/CPI/PCE/jobs 25; yields/Treasury/
dollar/tariff/recession/GDP 20; Nasdaq/Nvidia/Apple/Microsoft/VIX/retail sales/ISM/claims/auction/earnings 15;
stocks/S&P/futures 10; shutdown/war/China/oil 10) plus a source weight (Fed +20, BLS/BEA +15, Treasury +10, FXStreet/
ForexLive/White House +5). Tone by keyword, first match wins: hawkish, dovish, risk-off, risk-on, else neutral. Deduped by
normalised title, last 48 h, max 80, newest first. Plain keyword rules, no model.

**Merging**: one row per (date, release kind) across sources, ForexFactory first (it carries forecast/previous/actual), then
the official calendars, then the engine calendar; the other sources are listed in `sources[]` on the row. ForexFactory's
separate lines of one release (CPI m/m, Core CPI m/m) stay separate. Speakers and auctions are keyed by time + title.

## What the owner sees (hub.json)

```
built, built_t, now_t, tz, range{from,to,days,past}, offline
sources[] {name, slug, kind: calendar|headlines, ok, n, url, error?, cached?, cached_age_h?, fetched?}
events[]  {t, date, time_et, weekday, label, title, kind, kind_label, impact, usd_score, country,
           forecast, previous, actual, surprise, surprise_side, usd_hint, source, sources[], url,
           blackout, blackout_start, blackout_end, blackout_start_t, blackout_end_t,
           in_killzone, killzone: AM|PM|null, blackout_hits_killzone}
headlines[] {t, time_et, title, source, url, score, tone}
days[]    {date, label, weekday, is_today, past, n_events, n_high, n_medium, fomc, holiday,
           blackouts: ["13:45-15:00 FOMC decision, FOMC press conference", "13:00-16:00 FOMC afternoon: no entries"],
           killzone_pauses: ["09:45-10:30"], fed_speakers[], usd_load, max_usd_score, heaviest, summary}
next      the next high-impact event (full event row) or null
bot_now   {in_blackout, reasons[], fomc_today, fomc_pm_off, next_blackout{title,date,start,end,start_t,in_s}, rules{...}}
notes[]   "Heaviest day ahead: ...", "FOMC: Wed Oct 28 ...", source failures, DST reminder
model     the score table and the blackout rule in words
```

`hub_for_dashboard(path)` returns the compact cut for the public site's `data.json`: events from yesterday to +7 days,
the 40 best headlines (by score, shown newest first), days, next, bot_now, source health, notes.

## Wiring

- `tools/build_web_dashboard.py` (coordinator): `from tools import news_hub` and
  `"news": news_hub.hub_for_dashboard(os.path.join(ROOT, "data", "news", "hub.json"))` in the `data` dict.
- `.github/workflows/cloud-monitor.yml`: `python tools/news_hub.py --out data/news/hub.json || true` before the
  "Publish web dashboard" build step (the hub never raises on a source failure, `|| true` only guards a crash). Nothing in
  `data/news/raw/` needs committing: the cloud run fetches fresh every time and the engine calendar covers an outage.
- PC dashboard: `GET /api/next/news` (full hub) or `/api/next/news?compact=1` (the data.json cut). The PC bot does not
  rebuild hub.json itself yet; run the command above, or add it to `scripts/run_bot.ps1` on a timer.

## Adding a source

1. Calendar: append a dict to `CAL_SOURCES` (`slug`, `name`, `urls`, `ext`, `parser`) and a `parse_<x>(raw) -> [raw events]`
   in `PARSERS`. A raw event needs `t` (unix), `title`, `country: "USD"`, optionally `impact`, `kind`, `forecast`,
   `previous`, `actual`, `url`. Kind and score come from `classify()` / `usd_score()`; add keywords to `KINDS` and a
   weight to `USD_SCORE` for a new kind.
2. Headlines: append to `HEADLINE_FEEDS` (`slug`, `name`, `urls`, `weight`). Any RSS 2.0 or Atom feed works.
3. Drop a small sample in `tests/fixtures/news/<slug>.<ext>` and an assertion in `selftest()`.

## Phone page (recommended sections)

1. **Now**: `bot_now` as a traffic light ("Clear: next blackout CPI Tue 08:15-09:00" / "Blocked: FOMC afternoon").
2. **Today**: the day's `summary`, then its events in ET with impact dots, forecast / previous / actual + surprise arrow.
3. **Week ahead**: one card per `days[]` row (label, n_high, blackouts, FOMC badge, heaviest badge) for 10 days.
4. **Headlines**: `headlines[]` with tone chips (hawkish / dovish / risk-on / risk-off) and a "market-moving only"
   toggle at score >= 40.
5. **Sources**: the `sources[]` health list so the owner sees when a feed is down, plus `built` and `notes`.
