// Features (phone, 2026-10-25; loaded by index.html with one <script defer> after goals.js; read-only, paper only).
//   More          one clean hub: a search box and six sections (Today & plan · Bot health · LIT strategy · Research ·
//                 Money & accounts · This app), each page one row with one plain line; pages of More show a "‹ More" back
//                 button instead of the long strip
//   #/features    "What's new / All features": every feature of the app, grouped, one plain line each, NEW badges, search
//   #/weekcal     Trades > Calendar heatmap: 12 weeks x Mon-Fri coloured by $, streaks, best / worst day, weekday averages
//   #/last10      Trades > Last 10: the newest 10 trades (LIT + ATLAS) with their pictures, CSV export, share
//   #/lights      More > Health lights: PC heartbeat, NinjaTrader feed, 1m bars, poll, cloud run, phone data, version,
//                 auto-update, auto-resume, push, clock
//   #/evaltl      Money > Eval timeline: sessions 1-15 with dates and $, the 10-session goal and the 15 limit, risk-per-trade
//                 gauge (one stop-out vs the room), the daily loss used
//   #/atstats     ATLAS > Setup stats: per member (EMA / MACD / S/R) the backtest per span and the paper result
//   every page    offline badge, haptic tick on taps (Android; iPhone Safari has no vibration), scroll-to-top button
// Data: data.json / home.json only (goals, accounts, second, charts, results, live). Every view says "no data yet" when empty.
(function () {
  'use strict';
  if (typeof GROUPS === 'undefined' || typeof VIEWS === 'undefined') return;
  const HD = () => (typeof D !== 'undefined' && D) || window.HOMEJ || null;
  const okN = (v) => v != null && v !== '' && !isNaN(v);
  const nowS = () => Date.now() / 1000;
  const ageTxt = (s) => !okN(s) ? '—' : s < 90 ? Math.round(s) + ' s' : s < 5400 ? Math.round(s / 60) + ' min' : s < 172800 ? Math.round(s / 3600) + ' h' : Math.round(s / 86400) + ' days';
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // ================================================================================ the feature list (one line each)
  const FEATS = [];
  const feat = (group, name, line, go, isNew) => FEATS.push({ group, name, line, go: go || '', isNew: !!isNew });
  // ---- Goals (new 2026-10-25)
  feat('Goals', 'Goals card on Home', 'The first card on Home: every goal with a ring or a bar and one plain sentence.', 'today', 1);
  feat('Goals', '50K progress ring', 'How much of the +$3,000 target the 50K has made, as a ring.', 'goals', 1);
  feat('Goals', 'Profit bar', 'Profit so far against the target, with the $ still to go.', 'goals', 1);
  feat('Goals', 'Room-to-floor bar', 'How far the balance is above the trailing floor; turns red when it gets thin.', 'goals', 1);
  feat('Goals', 'Session counter', 'Session X of 10 and how many sessions are left of the 2-week goal.', 'goals', 1);
  feat('Goals', 'Session dots 1-15', 'Fifteen dots: done, today, and the dashed ones past the 2-week goal up to the 3-week limit.', 'goals', 1);
  feat('Goals', '$ needed per session', 'The $ still to go divided by the sessions left.', 'goals', 1);
  feat('Goals', 'Pass-by dates', 'The calendar date of session 10 (goal) and session 15 (limit).', 'goals', 1);
  feat('Goals', 'Minimum days chip', 'Days traded against MFFU’s minimum days.', 'goals', 1);
  feat('Goals', 'Anchored check', 'Says when the numbers match the MFFU dashboard (the eval anchor).', 'goals', 1);
  feat('Goals', 'ATLAS 25K progress', 'The 25K eval for ATLAS: target $1,500, max loss $1,000, or "not started yet".', 'goals', 1);
  feat('Goals', 'Zlarior week ring', 'Zlarior trades this week against the 2-4 goal.', 'goals', 1);
  feat('Goals', 'ATLAS week ring', 'ATLAS trades this week against the 3-4 goal.', 'goals', 1);
  feat('Goals', 'Week day strip', 'Mon-Fri boxes with the trades and $ of each day.', 'goals', 1);
  feat('Goals', 'On-pace sentence', 'Says if the week is on pace, behind, met or above the goal.', 'goals', 1);
  feat('Goals', 'Month vs backtest band', 'This month’s $ on the backtest’s usual range (low, middle, high).', 'goals', 1);
  feat('Goals', 'ATLAS go-live ring', 'Paper trades collected of the 20 needed before ATLAS goes live.', 'goals', 1);
  feat('Goals', 'Payout progress', 'After the eval passes: $ to go before the first payout request.', 'goals', 1);
  feat('Goals', 'Scale step', 'Where you are on the account ladder and % to the next step.', 'goals', 1);
  feat('Goals', 'Goals in one look', 'Every goal as one line with a coloured dot (green good, amber watch, red act).', 'goals', 1);
  feat('Goals', 'Share goals', 'Sends the goal lines to Messages / WhatsApp, or copies them.', 'goals', 1);
  feat('Goals', 'Since you last looked', 'Shows how much closer to the target the 50K got since your last visit.', 'today', 1);
  feat('Goals', 'My goals: $10K month', 'This month so far against $10,000, one bar split into jobs, Kalshi and prop payouts.', 'goals', 1);
  feat('Goals', 'My goals: Stingray 3LT', 'Saved against the $38,000 target (stretch marker at $46,000), days left to Feb 22 2027, $ a week needed, on pace or behind by $X.', 'goals', 1);
  feat('Goals', 'My goals: C8 Z06', 'Saved against $60,000, one bar, no date.', 'goals', 1);
  feat('Goals', 'The 9-account stack', 'Each planned prop account (MFFU 50K, two 25Ks, four LucidPro, two FundedNext): not bought, eval, passed, funded or paying, and the $ a month once all are funded.', 'goals', 1);
  feat('Goals', 'Next money step', 'One line: the payout to request, the passed eval to switch, or the next evals to buy with the code to use.', 'goals', 1);
  // ---- Today (new)
  feat('Today', 'Today’s plan card', 'One card: what the bot waits for, the window, killzones, news.', 'today', 1);
  feat('Today', 'Next session countdown', 'Live countdown to the next Zlarior entry window (02:00 ET).', 'today', 1);
  feat('Today', 'Market-open countdown', 'On a weekend: the countdown to Sunday 18:00 ET.', 'today', 1);
  feat('Today', 'Cut-off countdown', 'Inside the window: time left until the 15:30 ET entry cut-off.', 'today', 1);
  feat('Today', 'Killzone now / next', 'Which killzone is on now, or which one is next and when.', 'today', 1);
  feat('Today', 'What the bot is waiting for', 'The bot’s own sentence of what it needs before it can enter.', 'today', 1);
  feat('Today', 'News-today chips', 'Today’s big US events (CPI, FOMC, jobs ...) as chips, or "no big news".', 'today', 1);
  feat('Today', 'Next news chip', 'The next big US event after today.', 'today', 1);
  feat('Today', 'FOMC week chip', 'A warning chip in a week with an FOMC decision.', 'today', 1);
  feat('Today', 'Early-close banner', 'A week ahead of a holiday early close: the halt time and what the bot does.', 'today', 1);
  feat('Today', 'Clock-change banner', 'UK / US clock changes and what they mean for the ET times.', 'today', 1);
  // ---- Trades (new)
  feat('Trades', 'Calendar heatmap', '12 weeks of Mon-Fri boxes coloured by the day’s $.', 'weekcal', 1);
  feat('Trades', 'Win / loss streaks', 'The current run of green or red days and the longest of each.', 'weekcal', 1);
  feat('Trades', 'Best and worst day', 'The best and the worst day with their dates.', 'weekcal', 1);
  feat('Trades', 'Green-day %', 'How many traded days ended green.', 'weekcal', 1);
  feat('Trades', 'Weekday averages', 'Average $ per weekday, as bars.', 'weekcal', 1);
  feat('Trades', 'Last 10 trades', 'The newest 10 trades of Zlarior and ATLAS in one list.', 'last10', 1);
  feat('Trades', 'Trade pictures in the list', 'Each of the last trades with its chart picture (tap = full screen).', 'last10', 1);
  feat('Trades', 'CSV export of the last trades', 'Saves the last trades as a spreadsheet file.', 'last10', 1);
  // ---- ATLAS (new)
  feat('ATLAS', 'Per-setup stats', 'EMA, MACD and S/R side by side: trades a week, win %, PF, $ a month.', 'atstats', 1);
  feat('ATLAS', 'Good year / bad year', 'Each setup in 2026 and in 2025 (its bad year), so you see both.', 'atstats', 1);
  feat('ATLAS', 'Paper result per setup', 'Each setup’s paper trades and $ so far.', 'atstats', 1);
  feat('ATLAS', 'Setup state today', 'What each ATLAS setup is doing today, in its own words.', 'atstats', 1);
  // ---- Health (new)
  feat('Health', 'Launch checklist', 'Tonight’s launch: anchor, allowlist, ATLAS account, startup, NinjaTrader, feed, Sim roundtrips, armed, up from 01:55 ET; each red line with its fix command.', 'launch', 1);
  feat('Health', 'Health lights', 'Green / amber / red lights for every part the bot needs.', 'lights', 1);
  feat('Health', 'PC heartbeat light', 'When the Surface last checked in.', 'lights', 1);
  feat('Health', 'NinjaTrader feed light', 'Age of the newest NinjaTrader bar; amber when it is behind.', 'lights', 1);
  feat('Health', 'Cloud run light', 'When the free cloud monitor last ran.', 'lights', 1);
  feat('Health', 'Phone data light', 'How old the data on this phone is.', 'lights', 1);
  feat('Health', 'Version light', 'The bot’s version and its last auto-update.', 'lights', 1);
  feat('Health', 'Auto-resume light', 'Whether the bot restarts by itself, and its last answer.', 'lights', 1);
  feat('Health', 'Push light', 'How many phones get notifications.', 'lights', 1);
  feat('Health', 'Clock light', 'This phone’s time zone next to ET.', 'lights', 1);
  // ---- Eval (new)
  feat('Eval', 'Eval timeline', 'Sessions 1 to 15 as a timeline with dates and each day’s $.', 'evaltl', 1);
  feat('Eval', 'Risk-per-trade gauge', 'What one stop-out costs, as a share of the room above the floor.', 'evaltl', 1);
  feat('Eval', 'Daily loss gauge', 'How much of the daily loss limit today used.', 'evaltl', 1);
  // ---- App (new)
  feat('App', 'New More page', 'Everything else in six clear sections, one plain line per page.', 'system', 1);
  feat('App', 'Search in More', 'Type a word to find any page.', 'system', 1);
  feat('App', 'Back to More', 'Pages under More have one "‹ More" button instead of a long strip.', 'system', 1);
  feat('App', 'All features page', 'This page: every feature with one line, NEW badges and search.', 'features', 1);
  feat('App', 'Quick theme switch', 'Dark / light from the More page in one tap.', 'system', 1);
  feat('App', 'Offline badge', 'A small "offline" badge in the header when the phone has no internet.', '', 1);
  feat('App', 'Haptic tick', 'A tiny vibration on taps (Android; iPhone Safari does not allow it).', 'settings', 1);
  feat('App', 'Scroll-to-top button', 'On long pages a round button takes you back to the top.', '', 1);
  feat('App', 'New app version', 'The app updates itself on the iPhone (new cache version).', '', 1);
  // ---- existing features (before 2026-10-25)
  feat('Home', 'Is the bot trading my eval?', 'The big verdict at the top: trading, checking, PC silent or stopped.', 'today');
  feat('Home', 'Surface check-in line', 'When the PC last reported; red when it is offline in trading hours.', 'today');
  feat('Home', 'Bot stopped banner', 'A red banner with the one-line fix when the bot is off.', 'today');
  feat('Home', 'Zlarior and ATLAS cards', 'The two strategies side by side: status, today, this week, eval.', 'today');
  feat('Home', 'Open trade mini chart', 'The open trade with entry, stop, target and breakeven lines.', 'today');
  feat('Home', 'Why no trade today', 'The model’s state, rejected setups and shallow sweeps.', 'today');
  feat('Home', 'Add to Home Screen guide', 'Step-by-step install for iPhone and Android.', 'today');
  feat('Zlarior', 'Zlarior plan', 'Today’s levels, the VIX target band, the sweeps seen.', 'plan');
  feat('Home', 'Levels radar', 'Nearest LIT levels above and below price.', 'radar');
  feat('Home', 'Market', 'News week, CME holidays, the contract roll, the VIX band.', 'market');
  feat('Home', 'Live detail', 'The Live Oracle, week ring, liquidity map, signals.', 'live');
  feat('Home', 'Briefing', 'The bot’s morning briefing, intraday log and recap.', 'brief');
  feat('Home', 'Day plan', 'The LIT day: sessions, entry window, news, what’s next.', 'day');
  feat('Home', 'Eval cockpit', 'What a stop-out or a winner does to the eval.', 'cockpit');
  feat('Brain', 'Bot Brain', 'What the bot is thinking: stage, levels, setups, the rule that stopped each one.', 'brain');
  feat('Brain', 'Sizing math', 'How many micros and why, in plain steps.', 'brain');
  feat('Brain', 'Thought log', 'The bot’s notes of the day, newest first.', 'brain');
  feat('ATLAS', 'ATLAS page', 'Status, brain, go / no-go, trades, rules, backtest for strategy 2.', 'atlas');
  feat('ATLAS', 'Go / no-go scorecard', 'Paper result against the expected range before going live.', 'atlas');
  feat('ATLAS', 'Account B card', 'ATLAS’s own 25K account and its eval tracker.', 'atlas');
  feat('Trades', 'Trades list', 'Every trade with its report.', 'trades');
  feat('Trades', 'Recaps', 'Every live trade: chart, why it entered, the lesson.', 'recaps');
  feat('Trades', 'Weekly review', 'Sunday review: trades, $, R, what to watch next week.', 'weekly');
  feat('Trades', 'Journal', 'Search, filter, notes on each trade, CSV export.', 'journal');
  feat('Trades', 'Stats', 'Key stats, streaks, R histogram, time of day.', 'stats');
  feat('Trades', 'Accounts', 'Every account: position, orders, past trades.', 'accounts');
  feat('Trades', 'Execution', 'Slippage, missed and extra trades vs the backtest.', 'execq');
  feat('Trades', 'Edge', 'Where Zlarior makes its money: R, MFE, stop size, hour, weekday.', 'edge');
  feat('Trades', 'P&L calendar', 'Daily P&L calendar with streaks.', 'pnlcal');
  feat('Trades', 'Results', 'The live settings, 5-year replay.', 'results');
  feat('Trades', 'Replays', 'Step through each trade day.', 'replays');
  feat('Trades', 'Trade replay', 'A past trade bar by bar: play, pause, step.', 'tplay');
  feat('Trades', 'Trade pictures', 'Chart pictures of each trade, full screen on tap.', 'trades');
  feat('Trades', 'Trade intel', 'Win / loss signs over every trade.', 'intel');
  feat('Trades', 'Stop sizes', 'Wide stop, smaller size: results by stop bucket.', 'stops');
  feat('Money', 'Money', '$ a month, your goal, the funded plan, payouts.', 'money');
  feat('Money', 'What if', 'The next trade at target, at the stop or at breakeven.', 'whatif');
  feat('Money', 'Prop firms', 'Prices, discount codes, rules, Zlarior fit, what to buy next.', 'props');
  feat('Money', 'Eval HQ', 'The 2-week pass path and the pass / fail odds.', 'evalhq');
  feat('Money', 'Eval curve', 'Balance per session with the target and the trailing floor.', 'curve');
  feat('Money', 'Share card', 'The month as a picture for the share sheet.', 'share');
  feat('Money', 'Performance', 'Is live inside the expected range, robustness, months.', 'perf');
  feat('Money', 'Scaling plan', 'The ladder from 2 to 10 accounts and the next step.', 'scale');
  feat('Health', 'Ops check', 'Health lights, the pre-session checklist, NinjaTrader messages.', 'ops');
  feat('Health', 'Paper bot', 'The cloud paper bot: state, position, events.', 'engine');
  feat('Health', 'Remote', 'Kill, stop, flatten or check the PC bot from the phone.', 'remote');
  feat('Health', 'Notifications', 'Phone notifications for every fill and outcome.', 'alerts');
  feat('Health', 'Critical alerts + Got it', 'Critical alerts repeat until you tap Got it.', 'ack');
  feat('Health', 'AI watch', 'Anomalies, drift, both accounts’ loss, rule changes.', 'aiwatch');
  feat('Health', 'Activity', 'Every fill and outcome, newest first.', 'activity');
  feat('Health', 'Stale-data banner', 'A banner when the data is older than 45 minutes.', '');
  feat('Health', 'Live feed from the PC', 'The PC’s live file refreshes Home every 30-60 seconds.', 'today');
  feat('Zlarior', 'Strategy in plain words', 'The live rules, upgrades, scoreboard and changelog.', 'strategy');
  feat('Zlarior', 'Risk & sizing', 'Size follows the stop; the weekly stop.', 'risk');
  feat('Zlarior', 'MFFU rules', 'The Builder 50K rulebook and how Zlarior fits it.', 'mffurules');
  feat('Zlarior', 'Rejected setups', 'Every LIT setup and the rule that stopped it.', 'setups');
  feat('Zlarior', 'News', 'USD events, the bot’s blackouts, headlines.', 'news');
  feat('Zlarior', 'Chart', 'Live 5-minute chart with the liquidity pools.', 'chart');
  feat('Research', 'Lab overview', 'Latest findings and every run.', 'lab');
  feat('Research', 'Experiments', 'Every backtest, stored with its data.', 'experiments');
  feat('Research', 'Write-ups', 'Findings in plain words, plus the archive.', 'writeups');
  feat('Research', 'Losses', 'Why the bot loses, and how much.', 'losses');
  feat('Research', 'Simulated evals', 'Monte Carlo MFFU evals: odds and paths.', 'evals');
  feat('Research', 'Intraday heat', 'When the bot wins: weekday by hour.', 'intraday');
  feat('Research', 'Lessons', 'What the replay trades teach.', 'learned');
  feat('Research', 'Archive', 'The previous strategy (Liquidity Engine, Oct 17).', 'archive');
  feat('App', 'Pull to refresh', 'Pull the page down to load fresh data.', '');
  feat('App', 'Works offline', 'Shows the last data it saw when there is no signal.', '');
  feat('App', 'Skeleton loading', 'Grey placeholders while the data loads; Home draws first from a small file.', '');
  feat('App', 'Dark / light theme', 'Light is easier to read outside.', 'settings');
  feat('App', 'Compact mode', 'Smaller cards, more on one screen.', 'settings');
  feat('App', 'Text size', 'A− / A+ for the whole app.', 'settings');
  feat('App', 'High contrast', 'Stronger colours and borders.', 'settings');
  feat('App', '3D effects', 'Max / Lite / Off for the moving background.', 'settings');
  feat('App', 'Monthly goal', 'Your own $ goal on the Money page.', 'settings');
  feat('App', 'Data sources', 'Where every number comes from.', 'sources');

  // ================================================================================ More: one clean hub
  const SECTIONS = [
    ['Today & plan', 'today', ['goals', 'plan', 'day', 'brief', 'levels', 'radar', 'market', 'live', 'cockpit', 'news']],
    ['Bot health & control', 'radar', ['launch', 'lights', 'ops', 'engine', 'aiwatch', 'remote', 'alerts', 'activity', 'chart']],
    ['Zlarior strategy', 'rules', ['strategy', 'risk', 'mffurules', 'setups', 'learned']],
    ['Research & backtests', 'lab', ['lab', 'experiments', 'writeups', 'losses', 'intraday', 'evals', 'results', 'replays', 'stops', 'intel']],
    ['Money & accounts', 'wallet', ['accounts', 'evaltl', 'evalhq', 'eval', 'curve', 'perf', 'scale', 'props', 'whatif', 'share']],
    ['This app', 'settings', ['features', 'settings', 'sources', 'parts', 'archive']],
  ];
  const tabOf = (id) => { const g = GROUPS.find((x) => x.pages.some((p) => p[0] === id)); return g ? g : null; };
  function moreView(el) {
    const q = String(store.get('more.q', '') || '');
    const used = new Set();
    const row = (id) => {
      const p = PAGES[id]; if (!p) return '';
      used.add(id);
      const g = tabOf(id), inTab = g && g.id !== 'system' ? `<i class="ft-tab">${esc(g.label)}</i>` : '';
      const nw = FEATS.some((f) => f.go === id && f.isNew) && !['today', 'settings'].includes(id) ? '<i class="ft-new">NEW</i>' : '';
      return `<button type="button" class="ft-row" data-go="${esc(id)}" data-s="${esc((p.label + ' ' + (p.desc || '')).toLowerCase())}"><span class="ft-i">${icon(p.icon) || icon('layers')}</span>
        <span class="ft-t"><b>${esc(p.label)}${nw}${inTab}</b><em>${esc(p.desc || '')}</em></span>${icon('right', 'ft-go')}</button>`;
    };
    const secs = SECTIONS.map(([t, ic, ids]) => { const rows = ids.map(row).join(''); return rows ? `<section class="ft-sec"><h4>${icon(ic)}${esc(t)}</h4><div class="ft-list">${rows}</div></section>` : ''; }).join('');
    const rest = (GROUPS.find((g) => g.id === 'system')?.pages || []).map((p) => p[0]).filter((id) => id !== 'system' && !used.has(id));
    const other = rest.length ? `<section class="ft-sec"><h4>${icon('layers')}Other pages</h4><div class="ft-list">${rest.map(row).join('')}</div></section>` : '';
    const th = store.get('theme', 'dark');
    el.innerHTML = `${head('More', 'Everything else', 'Every page of the app in six sections. Type to search.')}
      <div class="ft-bar"><label class="ft-q">${icon('search')}<input id="ftQ" type="search" placeholder="Search pages (e.g. news, eval, risk)" value="${esc(q)}" autocomplete="off"></label>
        <button type="button" class="chipbtn" id="ftTheme" aria-label="Switch theme">${icon('layers')}<span>${th === 'light' ? 'Dark' : 'Light'}</span></button></div>
      <button type="button" class="card ft-wn" data-go="features"><span class="ft-i">${icon('star')}</span><span class="ft-t"><b>What’s new · all ${FEATS.length} features</b><em>${FEATS.filter((f) => f.isNew).length} new today: Goals, Today’s plan, health lights, calendar heatmap, eval timeline, ATLAS setup stats …</em></span>${icon('right', 'ft-go')}</button>
      <div id="ftSecs">${secs}${other}</div><p class="ft-none mut" hidden>No page matches.</p>`;
    const inp = el.querySelector('#ftQ');
    const filt = () => {
      const s = inp.value.trim().toLowerCase(); store.set('more.q', s);
      let any = 0;
      el.querySelectorAll('.ft-sec').forEach((sec) => { let n = 0; sec.querySelectorAll('.ft-row').forEach((r) => { const on = !s || r.dataset.s.includes(s); r.hidden = !on; n += on; }); sec.hidden = !n; any += n; });
      el.querySelector('.ft-none').hidden = !!any;
    };
    inp.oninput = filt; filt();
    const tt = document.getElementById('title'); if (tt) tt.textContent = 'More'; document.title = 'More · Zenith';
    el.querySelector('#ftTheme').onclick = () => {
      store.set('theme', store.get('theme', 'dark') === 'light' ? 'dark' : 'light');
      const r = document.documentElement; r.dataset.theme = store.get('theme', 'dark');
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = r.dataset.theme === 'light' ? '#f4f6fb' : '#07080c';
      render(true);
    };
  }

  // ================================================================================ #/features
  VIEWS.features = (el) => {
    const q = String(store.get('feat.q', '') || ''), only = store.get('feat.new', false);
    const groups = [...new Set(FEATS.map((f) => f.group))];
    const nNew = FEATS.filter((f) => f.isNew).length;
    el.innerHTML = `${head('More · this app', 'What’s new · all features', `${FEATS.length} read-only features, ${nNew} of them new on 25 Oct 2026. Tap one to open it.`)}
      <div class="ft-bar"><label class="ft-q">${icon('search')}<input id="fQ" type="search" placeholder="Search features" value="${esc(q)}" autocomplete="off"></label>
        ${segHTML('fNew', [['all', 'All'], ['new', 'New']], only ? 'new' : 'all', 'sm')}</div>
      <div class="ft-cnt">${groups.map((g) => `<button type="button" class="chip ft-jump" data-j="${esc(g)}">${esc(g)} ${FEATS.filter((f) => f.group === g).length}</button>`).join('')}</div>
      ${groups.map((g, gi) => `<details class="ft-sec ft-d" data-g="${esc(g)}"${(store.get('feat.open', ['Goals']) || []).includes(g) ? ' open' : ''}><summary><h4>${esc(g)}<span class="ft-sn">${((nN, nA) => nN === nA ? nA + ' · all new' : nN ? nN + ' new of ' + nA : String(nA))(FEATS.filter((f) => f.group === g && f.isNew).length, FEATS.filter((f) => f.group === g).length)}</span>${icon('down', 'ft-chev')}</h4></summary><div class="ft-list">${FEATS.filter((f) => f.group === g).map((f, i) => `
        <${f.go && (PAGES[f.go] || f.go === 'ack') ? `button type="button" data-go="${esc(f.go)}"` : 'div'} class="ft-row ft-f${f.isNew ? ' isnew' : ''}" data-s="${esc((f.name + ' ' + f.line + ' ' + g).toLowerCase())}">
          <span class="ft-n">${FEATS.indexOf(f) + 1}</span><span class="ft-t"><b>${esc(f.name)}${f.isNew ? '<i class="ft-new">NEW</i>' : ''}</b><em>${esc(f.line)}</em></span>${f.go && PAGES[f.go] ? icon('right', 'ft-go') : ''}</${f.go && (PAGES[f.go] || f.go === 'ack') ? 'button' : 'div'}>`).join('')}</div></details>`).join('')}
      <p class="ft-none mut" hidden>No feature matches.</p>`;
    const opened = () => store.set('feat.open', [...el.querySelectorAll('details.ft-d[open]')].map((d) => d.dataset.g));
    el.querySelectorAll('details.ft-d').forEach((d) => d.addEventListener('toggle', () => { if (!inp.value.trim() && !nw) opened(); }));
    el.querySelectorAll('.ft-jump').forEach((b) => { b.onclick = () => { const d = el.querySelector(`details.ft-d[data-g="${b.dataset.j}"]`); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }; });
    const inp = el.querySelector('#fQ');
    let nw = only;
    const filt = () => {
      const s = inp.value.trim().toLowerCase(); store.set('feat.q', s);
      let any = 0;
      el.querySelectorAll('.ft-sec').forEach((sec) => { let n = 0; sec.querySelectorAll('.ft-row').forEach((r) => { const on = (!s || r.dataset.s.includes(s)) && (!nw || r.classList.contains('isnew')); r.hidden = !on; n += on; }); sec.hidden = !n; any += n;
        if (s || nw) sec.open = !!n; else sec.open = (store.get('feat.open', ['Goals']) || []).includes(sec.dataset.g); });
      el.querySelector('.ft-none').hidden = !!any;
    };
    inp.oninput = filt;
    onSeg('fNew', (v) => { nw = v === 'new'; store.set('feat.new', nw); filt(); });
    filt();
  };

  // ================================================================================ trade data helpers
  function mainAcct() {
    const A = ((HD() && HD().accounts) || []).filter((a) => a && a.id && !a.error);
    const pc = A.find((a) => a.source === 'pc' && a.eval), cl = A.find((a) => a.source === 'cloud');
    return pc && ((pc.conn || {}).connected || (pc.trades || []).length) ? pc : (cl || pc || null);
  }
  // [[day, $, trades]] of the account; when it has fewer than 5 traded days: the backtest's 2026 days
  function dayRows() {
    const a = mainAcct(), own = ((a && a.days) || []).filter((d) => d && d[0]);
    const tn = {}; for (const t of (a && a.trades) || []) tn[t.day] = (tn[t.day] || 0) + 1;
    if (own.filter((d) => Math.abs(+d[1] || 0) > 0).length >= 5) return { rows: own.map((d) => [d[0], +d[1] || 0, tn[d[0]] || 0]), src: (a.source === 'pc' ? 'the PC eval' : 'cloud paper') };
    const bt = ((HD() && HD().results) || {}).days || [];
    return { rows: bt.filter((d) => String(d[0]) >= '2026-01-01'), src: 'the 2026 backtest (live rules) until 5 live days exist' };
  }
  function allTrades() {
    const h = HD() || {}, a = mainAcct(), out = [];
    for (const t of (a && a.trades) || []) out.push({ who: 'Zlarior', day: t.day, entry_t: t.entry_t, side: t.side, r: t.r, usd: t.pnl, exit: t.exit, qty: t.qty, src: a.source === 'pc' ? 'PC' : 'paper' });
    const mem = new Set((((h.second || {}).atlas || {}).members || []).map((m) => m.key));
    for (const s of (h.second || {}).strategies || []) {
      if (mem.size ? !mem.has(s.key) : !['ema_lon_vix', 'macd_sweep', 'sr_nyreclaim'].includes(s.key)) continue;
      for (const t of s.trades || []) out.push({ who: 'ATLAS ' + (s.short || s.key), key: s.key, day: t.day, entry_t: t.entry_t, side: t.side || (t.dir > 0 ? 'LONG' : 'SHORT'), r: t.r, usd: t.usd, exit: t.exit_kind, qty: t.qty, src: 'paper' });
    }
    let src = 'live / paper';
    if (!out.length) {
      for (const t of (h.trades || []).slice().sort((x, y) => (y.entry_t || 0) - (x.entry_t || 0)).slice(0, 10)) out.push({ who: 'Zlarior', day: t.day, entry_t: t.entry_t, side: t.side, r: t.r, usd: t.pnl, exit: t.exit, qty: t.qty, src: 'backtest' });
      src = 'backtest (no live / paper trade yet)';
    }
    return { rows: out.sort((x, y) => (y.entry_t || 0) - (x.entry_t || 0)).slice(0, 10), src };
  }

  // ================================================================================ #/weekcal: heatmap, streaks, best / worst
  VIEWS.weekcal = (el) => {
    const { rows, src } = dayRows();
    el.innerHTML = head('Trades · calendar heatmap', 'Week calendar', `12 weeks of trading days coloured by $ · from ${esc(src)}`);
    if (!rows.length) { el.insertAdjacentHTML('beforeend', emptyBox('No days yet.', 'The calendar fills in with the first trading day.')); return; }
    const by = {}; rows.forEach((d) => { by[d[0]] = d; });
    const last = rows[rows.length - 1][0], end = new Date(last + 'T12:00:00');
    const mon = new Date(end); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const mx = Math.max(1, ...rows.map((d) => Math.abs(d[1])));
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const m = new Date(mon); m.setDate(m.getDate() - w * 7);
      const cells = []; let wsum = 0;
      for (let i = 0; i < 5; i++) { const d = new Date(m); d.setDate(d.getDate() + i); const k = d.toISOString().slice(0, 10), r = by[k]; wsum += r ? r[1] : 0;
        const a = r ? Math.min(1, Math.abs(r[1]) / mx) : 0, c = !r ? '' : r[1] > 0 ? `background:color-mix(in srgb,var(--good) ${(18 + a * 70).toFixed(0)}%,var(--surface-2))` : r[1] < 0 ? `background:color-mix(in srgb,var(--bad) ${(18 + a * 70).toFixed(0)}%,var(--surface-2))` : '';
        cells.push(`<button type="button" class="ft-cell ${r ? '' : 'none'}" style="${c}" data-tip="${esc(k + (r ? ` · ${susd(r[1])} · ${plural(r[2] || 0, 'trade')}` : ' · no data'))}"><em>${d.getDate()}</em></button>`); }
      weeks.push(`<div class="ft-wk"><span class="ft-wl">${m.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>${cells.join('')}<b class="${cls(wsum)}">${kusd(wsum)}</b></div>`);
    }
    // streaks, best / worst, green days, weekday averages
    const traded = rows.filter((d) => Math.abs(d[1]) > 0.005);
    let cur = 0, curK = '', bw = 0, bl = 0, run = 0, runK = '';
    for (const d of traded) { const k = d[1] > 0 ? 'w' : 'l'; run = k === runK ? run + 1 : 1; runK = k; if (k === 'w') bw = Math.max(bw, run); else bl = Math.max(bl, run); }
    cur = run; curK = runK;
    const best = traded.reduce((a, d) => (!a || d[1] > a[1] ? d : a), null), worst = traded.reduce((a, d) => (!a || d[1] < a[1] ? d : a), null);
    const green = traded.length ? traded.filter((d) => d[1] > 0).length / traded.length * 100 : null;
    const wdA = WD.map((_, i) => { const L = traded.filter((d) => (new Date(d[0] + 'T12:00:00').getDay() + 6) % 7 === i); return L.length ? L.reduce((s, d) => s + d[1], 0) / L.length : 0; });
    const wmx = Math.max(1, ...wdA.map(Math.abs));
    el.insertAdjacentHTML('beforeend', `<div class="card"><div class="ft-wh"><span></span>${WD.map((w) => `<em>${w}</em>`).join('')}<em>week</em></div>${weeks.join('')}
        <p class="small mut" id="ftTip">Tap a day for its $ and trades.</p></div>
      <div class="hb-tiles">${tile('Current streak', cur ? `${cur} ${curK === 'w' ? 'green' : 'red'}` : '—', 'days in a row', curK === 'w' ? 'up' : curK === 'l' ? 'dn' : '')}
        ${tile('Longest green', bw ? plural(bw, 'day') : '—', 'in a row', 'up')}${tile('Longest red', bl ? plural(bl, 'day') : '—', 'in a row', 'dn')}${tile('Green days', green != null ? pct(green) : '—', `${traded.length} traded days`)}</div>
      <div class="grid g2 astart"><div class="card"><div class="card-h"><h3>${icon('star')}Best and worst day</h3></div>
          <div class="ft-bw"><div><span>Best</span><b class="up">${best ? susd(best[1]) : '—'}</b><em>${best ? esc(fDate(best[0])) : ''}</em></div><div><span>Worst</span><b class="dn">${worst ? susd(worst[1]) : '—'}</b><em>${worst ? esc(fDate(worst[0])) : ''}</em></div></div></div>
        <div class="card"><div class="card-h"><h3>${icon('results')}Average $ by weekday</h3></div><div class="ft-wda">${WD.map((w, i) => `<div><i class="${cls(wdA[i])}" style="height:${(Math.abs(wdA[i]) / wmx * 70 + 2).toFixed(0)}px"></i><b class="${cls(wdA[i])}">${kusd(wdA[i])}</b><em>${w}</em></div>`).join('')}</div></div></div>`);
    el.querySelectorAll('.ft-cell').forEach((c) => { c.onclick = () => { const t = el.querySelector('#ftTip'); if (t) t.textContent = c.dataset.tip; }; });
  };
  const k4 = (b) => `<div class="ft-k4"><div><span>Trades / wk</span><b>${okN(b.tpw) ? num(b.tpw, 1) : '—'}</b><em>${b.n ?? 0} trades</em></div><div><span>Win</span><b>${okN(b.win) ? pct(b.win) : '—'}</b></div>
      <div><span>PF</span><b class="${(b.pf || 0) >= 1.5 ? 'up' : (b.pf || 0) < 1 ? 'dn' : ''}">${okN(b.pf) ? num(b.pf, 2) : '—'}</b></div><div><span>$ / month</span><b class="${cls(b.per_month)}">${okN(b.per_month) ? kusd(b.per_month) : '—'}</b><em>${okN(b.dd) ? 'DD ' + kusd(b.dd) : ''}</em></div></div>`;
  const tile = (label, value, sub = '', k = '') => `<div class="hb-tile"><span>${label}</span><b class="${k}">${value}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;

  // ================================================================================ #/last10
  VIEWS.last10 = (el) => {
    const { rows, src } = allTrades(), h = HD() || {}, T = window.TradePics;
    el.innerHTML = head('Trades · last 10', 'Last 10 trades', `Zlarior and ATLAS, newest first · ${esc(src)}`);
    if (!rows.length) { el.insertAdjacentHTML('beforeend', emptyBox('No trades yet.', 'The list fills in with the first paper or live trade.')); return; }
    const pics = [];
    if (T && h.charts) for (const k of ['lit', 'ema_lon_vix', 'macd_sweep', 'sr_nyreclaim']) pics.push(...T.list(h.charts, k));
    const picOf = (t) => pics.find((x) => x.entry_t === t.entry_t);
    const withPic = rows.map(picOf).filter(Boolean);
    el.insertAdjacentHTML('beforeend', `${withPic.length && T ? `<div class="card tp-trades"><div class="card-h"><h3>Pictures</h3><span class="meta">tap for full screen</span></div>${T.strip(withPic, { label: 'Last trade pictures' })}</div>` : ''}
      <div class="card"><div class="card-h"><h3>${icon('trades')}The list</h3><div class="row-btns"><button class="chipbtn wide" type="button" id="l10Csv">${icon('share')}<span>CSV</span></button><button class="chipbtn wide" type="button" id="l10Sh">${icon('share')}<span>Share</span></button></div></div>
      <div class="ft-tl">${rows.map((t) => `<div class="ft-tr"><span class="ft-tw">${esc(t.who)}<em>${esc(fDate(t.day))} · ${t.entry_t ? esc(et(t.entry_t).hm) + ' ET' : ''}</em></span><span class="${t.side === 'LONG' ? 'up' : 'dn'}">${esc(t.side || '')} ${t.qty ?? ''}</span>
        <span class="ft-tx">${esc(String(t.exit || '').toLowerCase())}</span><b class="${cls(t.usd)}">${susd(t.usd)}</b><em class="${cls(t.r)}">${fR(t.r)}</em>${picOf(t) ? '<i class="ft-pic" title="has a picture">▣</i>' : '<i></i>'}</div>`).join('')}</div>
      <p class="small mut">Source: ${esc(src)}.</p></div>`);
    if (T) T.settle(el);
    const csv = 'who,day,entry_time_et,side,qty,exit,usd,r,source\n' + rows.map((t) => [t.who, t.day, t.entry_t ? et(t.entry_t).hm : '', t.side, t.qty, t.exit, t.usd, t.r, t.src].map((v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
    el.querySelector('#l10Csv').onclick = () => { try { const b = new Blob([csv], { type: 'text/csv' }), u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'last-10-trades.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); toast('Saved last-10-trades.csv'); } catch (e) { toast('Download not allowed here'); } };
    el.querySelector('#l10Sh').onclick = () => (window.GoalsUI ? window.GoalsUI.shareText('Last trades\n' + rows.map((t) => `${t.day} ${t.who} ${t.side} ${susd(t.usd)} ${fR(t.r)}`).join('\n')) : null);
  };

  // ================================================================================ #/lights
  function lightsList() {
    const h = HD() || {}, L = h.live || {}, pc = L.pc || {}, hl = pc.health && typeof pc.health === 'object' ? pc.health : {};
    const feed = hl.feed || {}, poll = hl.poll || {}, auto = hl.auto || {}, now = nowS(), out = [];
    const add = (name, lvl, val, line) => out.push({ name, lvl, val, line });
    const hb = okN(pc.t) && pc.t > 0 ? now - pc.t : null;
    add('PC heartbeat', hb == null ? 'bad' : hb < 20 * 60 ? 'good' : 'warn', hb == null ? 'never' : ageTxt(hb) + ' ago', pc.host ? `the Surface (${pc.host}) ${pc.running === false ? 'reports the bot stopped' : 'reports in'}` : 'the PC bot has not reported');
    const a1 = feed.age_1m_s, a5 = feed.age_5m_s;
    add('NinjaTrader bars', feed.stale ? 'bad' : okN(a1) ? (a1 < 240 ? 'good' : 'warn') : 'idle', okN(a1) ? ageTxt(a1) + ' old (1m)' : okN(a5) ? ageTxt(a5) + ' old (5m)' : 'no bars now', feed.stale ? 'FEED STALE: new entries are blocked until the feed is back' : feed.used ? `bars from ${feed.used === 'yahoo' ? 'the old feed setting' : feed.used}${feed.no_yahoo ? ' · Yahoo is off: only NinjaTrader bars trade' : ''}` : 'no feed reported');
    add('Bot poll', poll.consecutive_errors ? 'warn' : okN(poll.age_s) ? 'good' : 'idle', okN(poll.age_s) ? ageTxt(poll.age_s) + ' ago' : '—', poll.last_error ? 'last error: ' + poll.last_error : `${poll.errors || 0} errors`);
    const cr = okN(L.last_run) ? now - L.last_run : null;
    add('Cloud monitor', cr == null ? 'bad' : cr < 45 * 60 ? 'good' : 'warn', cr == null ? 'never' : ageTxt(cr) + ' ago', 'the free GitHub Actions run (every 15-30 min on market days)');
    const bt = Date.parse(h.built || ''), da = Number.isFinite(bt) ? now - bt / 1000 : null;
    add('Phone data', da == null ? 'bad' : da < 45 * 60 ? 'good' : 'warn', da == null ? '—' : ageTxt(da) + ' old', pc.live ? 'the PC’s live file is on top' : 'pull down to refresh');
    add('Network', navigator.onLine === false ? 'bad' : 'good', navigator.onLine === false ? 'offline' : 'online', 'this phone’s internet');
    const up = auto.update || {};
    add('Bot version', auto.version ? (up.result === 'failed' ? 'warn' : 'good') : 'idle', auto.version || '—', up.reason ? `auto-update: ${up.result || ''} ${up.reason}` : 'auto-update not reported');
    const rs = auto.resume || {};
    add('Auto-resume', rs.on ? (rs.last_result === 'refused' ? 'warn' : 'good') : 'idle', rs.on ? 'on' : 'off', rs.last_reason ? `last: ${rs.last_result || ''} — ${rs.last_reason}` : 'restarts the bot after a reboot or crash');
    const ac = hl.account || {};
    add('Account route', ac.is_live ? 'warn' : ac.name ? 'good' : 'idle', ac.label || '—', ac.name ? `${ac.name} via ${ac.adapter || '—'}${ac.armed ? ' · armed' : ''}` : 'no account reported');
    const pu = L.push || {};
    add('Phone notifications', (pu.devices || 0) > 0 ? 'good' : 'warn', plural(pu.devices || 0, 'phone'), (pu.devices || 0) > 0 ? 'get a push for every fill and outcome' : 'turn them on in More › Notifications');
    const v = L.pc_verdict || {};
    add('Verdict', v.level || 'idle', v.label || '—', v.reason || '');
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone, e = et(now);
    add('Clock', 'good', `${e.hm} ET`, `this phone: ${tz}${tz === 'America/New_York' ? ' (same as ET)' : ' · every time in the app is ET'}`);
    return out;
  }
  VIEWS.lights = (el) => {
    const L = lightsList(), bad = L.filter((x) => x.lvl === 'bad').length, warn = L.filter((x) => x.lvl === 'warn').length;
    el.innerHTML = head('More · bot health', 'Health lights', bad ? `${plural(bad, 'red light')}: act on those first.` : warn ? `${plural(warn, 'amber light')} to watch, nothing red.` : 'Everything green.')
      + `<div class="ft-lights">${L.map((x) => `<div class="ft-light ${x.lvl}"><i></i><div><b>${esc(x.name)}</b><span>${esc(x.val)}</span><em>${esc(x.line)}</em></div></div>`).join('')}</div>
      <p class="small mut">Read-only: this app cannot start or stop the bot (More › Remote sends requests through GitHub).</p>`;
  };

  // ================================================================================ #/evaltl: timeline + risk gauge
  function weekdaysFrom(start, n) {
    const out = [], d = new Date(start + 'T12:00:00');
    while (out.length < n) { const w = d.getDay(); if (w > 0 && w < 6) out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function gauge(f, label, sub, col) {
    const v = Math.max(0, Math.min(1, +f || 0)), R = 70, a0 = Math.PI, a1 = Math.PI * (1 - v), cx = 90, cy = 86;
    const p = (a) => `${(cx + R * Math.cos(a)).toFixed(1)} ${(cy - R * Math.sin(a)).toFixed(1)}`;
    return `<div class="ft-gauge"><svg viewBox="0 0 180 100" width="180" height="100" aria-hidden="true"><path d="M ${p(a0)} A ${R} ${R} 0 0 1 ${p(0)}" class="ft-gt"/>
      ${v > 0.001 ? `<path d="M ${p(a0)} A ${R} ${R} 0 0 1 ${p(a1)}" class="ft-gv" style="stroke:${col}"/>` : ''}</svg><b>${label}</b><em>${sub}</em></div>`;
  }
  VIEWS.evaltl = (el) => {
    const G = (HD() || {}).goals || {}, lit = (Array.isArray(G.accounts) ? G.accounts[0] : null) || {}, a = mainAcct() || {}, ev = a.eval || {};
    el.innerHTML = head('Money · eval timeline', 'Eval timeline', 'The 50K session by session: the 2-week goal is session 10, the hard limit session 15.');
    const start = ev.start || ((HD() || {}).live || {}).eval_life?.start;
    if (!start) { el.insertAdjacentHTML('beforeend', emptyBox('No eval start yet.', 'The timeline appears once the eval reports its start day.')); return; }
    const days = {}; for (const d of a.days || []) days[d[0]] = +d[1] || 0;
    const S = weekdaysFrom(start, 15), today = G.today || et(nowS()).date;
    let bal = (ev.balance != null ? ev.balance : 50000) - Object.values(days).reduce((s, v) => s + v, 0);
    const rows = S.map((d, i) => { const v = days[d]; if (v != null) bal += v; const k = i + 1;
      return `<div class="ft-tlr ${d === today ? 'today' : ''} ${d > today ? 'future' : ''} ${k === 10 ? 'goal' : ''} ${k === 15 ? 'limit' : ''}"><span class="ft-tn">${k}</span><span class="ft-td">${esc(new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))}${k === 10 ? '<i>2-week goal</i>' : k === 15 ? '<i>3-week limit</i>' : ''}</span>
        <b class="${cls(v)}">${v != null && Math.abs(v) > 0.005 ? susd(v) : d > today ? '' : d === today ? 'today' : '—'}</b><em>${d <= today && v != null ? usd(Math.round(bal)) : ''}</em></div>`; }).join('');
    const h = HD() || {}, L = h.live || {}, br = (L.pc && L.pc.brain && !L.pc.brain.error ? L.pc.brain : L.brain) || {}, sz = br.sizing || {};
    const risk = sz.risk_usd, room = lit.room != null ? lit.room : ev.room;
    const rf = okN(risk) && okN(room) && room > 0 ? risk / room : null;
    const dll = ev.dll || 1000, du = ev.dll_used || 0;
    el.insertAdjacentHTML('beforeend', `<div class="grid g2 astart"><div class="card"><div class="card-h"><h3>${icon('risk')}Risk per trade</h3></div>
        ${gauge(rf, okN(risk) ? usd(risk) : '—', rf != null ? `one stop-out = ${pct(rf * 100)} of the ${usd(Math.round(room))} room` : 'no sizing reported yet', rf == null ? 'var(--muted)' : rf > 0.5 ? 'var(--bad)' : rf > 0.3 ? 'var(--warn)' : 'var(--good)')}
        <p class="small mut">${esc(sz.what || 'The bot sizes each trade from its stop and the room left (two-week sizing).')}${okN(sz.qty) ? ` · ${sz.qty} micros` : ''}</p></div>
      <div class="card"><div class="card-h"><h3>${icon('loss')}Daily loss used</h3></div>${gauge(du / dll, usd(du), `of the ${usd(dll)} daily loss limit today`, du / dll > 0.6 ? 'var(--bad)' : 'var(--good)')}</div></div>
      <div class="card"><div class="card-h"><h3>${icon('clock')}Sessions</h3><span class="meta">start ${esc(fDate(start))} · ${esc(a.name || '')}</span></div><div class="ft-tlist">${rows}</div>
      <p class="small mut">$ = the day’s closed P&amp;L; the last column = the balance after that day.</p></div>`);
  };

  // ================================================================================ #/atstats: per member
  VIEWS.atstats = (el) => {
    const S = (HD() || {}).second || {}, mem = ((S.atlas || {}).members || []).map((m) => m.key);
    const L = (S.strategies || []).filter((s) => (mem.length ? mem.includes(s.key) : ['ema_lon_vix', 'macd_sweep', 'sr_nyreclaim'].includes(s.key)));
    el.innerHTML = head('ATLAS · setup stats', 'ATLAS setups', 'EMA, MACD and S/R side by side: the backtest per year and the paper result so far.');
    if (!L.length) { el.insertAdjacentHTML('beforeend', emptyBox('No ATLAS data yet.', 'It arrives with the full data.json.')); return; }
    const span = store.get('at.span', 'H2');
    el.insertAdjacentHTML('beforeend', segHTML('atSpan', [['H2', 'Jul-Oct 2026'], ['2026', '2026'], ['2025', '2025'], ['2021-24', '2021-24']], span, 'sm') + '<div id="atBox"></div>');
    const draw = (sp) => {
      const rows = L.map((s) => { const b = (((s.backtest || {}).own) || {})[sp] || {}; return { s, b }; });
      const tot = rows.reduce((a, { b }) => ({ n: a.n + (b.n || 0), tpw: a.tpw + (b.tpw || 0), net: a.net + (b.net || 0), pm: a.pm + (b.per_month || 0) }), { n: 0, tpw: 0, net: 0, pm: 0 });
      const pn = L.reduce((a, s) => a + ((s.paper || {}).n || 0), 0), pu = L.reduce((a, s) => a + ((s.paper || {}).usd || 0), 0);
      el.querySelector('#atBox').innerHTML = `<div class="card ft-atall"><div class="card-h"><h3>${icon('atlas')}ATLAS together</h3><span class="meta">goal 3-4 trades a week</span></div>
        <div class="ft-k4"><div><span>Trades / week</span><b class="${tot.tpw >= 3 ? 'up' : ''}">${num(tot.tpw, 1)}</b></div><div><span>Trades</span><b>${tot.n}</b></div><div><span>$ a month</span><b class="${cls(tot.pm)}">${kusd(tot.pm)}</b></div><div><span>Paper</span><b class="${cls(pu)}">${pn} · ${kusd(pu)}</b></div></div>
        <p class="small mut" style="margin:8px 0 0">${tot.tpw >= 3 && tot.tpw <= 4.5 ? 'Inside the 3-4 a week goal in this span.' : tot.tpw < 3 ? 'Under the 3-4 a week goal in this span.' : 'Above 4 a week in this span.'} The members never trade opposite to LIT and share one 25K.</p></div>
        <div class="ft-at">${rows.map(({ s, b }) => `<div class="card ft-atc"><div class="card-h"><h3>${esc(s.short || s.key)}</h3><span class="meta">${esc(s.label || '')}</span></div>
        ${k4(b)}
        <div class="ft-atp"><span>Paper: <b>${(s.paper || {}).n || 0}</b> trades · <b class="${cls((s.paper || {}).usd)}">${susd((s.paper || {}).usd || 0)}</b></span><span>${esc((s.scorecard || {}).text || '')}</span></div>
        ${s.state && s.state.text ? `<p class="small mut">${esc(s.state.text)}</p>` : ''}</div>`).join('')}</div>
        <p class="small mut">${sp === '2025' || sp === '2021-24' ? 'A bad stretch for ATLAS: judge the 2026 rows next to these.' : 'Backtest with costs, $ at the paper ledger’s size.'}</p>`;
    };
    draw(span); onSeg('atSpan', (v) => { store.set('at.span', v); draw(v); });
  };

  // ================================================================================ every page: offline badge, haptics, scroll-to-top
  function offline() {
    let b = document.getElementById('ftOff');
    if (!b) { const top = document.querySelector('header.top'); if (!top) return; b = document.createElement('span'); b.id = 'ftOff'; b.className = 'ft-off'; b.textContent = 'offline'; top.insertBefore(b, document.getElementById('status')); }
    b.hidden = navigator.onLine !== false;
  }
  function haptics() {
    document.addEventListener('click', (e) => {
      if (store.get('haptics', true) === false || !navigator.vibrate) return;
      if (e.target.closest('#tabs a, [data-go], .seg button, .chipbtn')) { try { navigator.vibrate(8); } catch (x) { /* not allowed */ } }
    }, true);
  }
  function topBtn() {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'ftTop'; b.className = 'ft-top'; b.setAttribute('aria-label', 'Back to the top'); b.innerHTML = icon('up'); b.hidden = true;
    b.onclick = () => scrollTo({ top: 0, behavior: 'smooth' }); document.body.appendChild(b);
    addEventListener('scroll', () => { b.hidden = scrollY < 1400; }, { passive: true });
  }
  // Settings: the haptics switch
  function settingsHook() {
    const s0 = VIEWS.settings; if (!s0 || s0.__ft) return;
    VIEWS.settings = function (el) {
      s0.apply(this, arguments);
      try {
        el.insertAdjacentHTML('beforeend', `<div class="card"><div class="card-h"><h3>${icon('phone')}Taps</h3></div><label class="row"><span><b>Haptic tick</b><span class="small mut">A tiny vibration on taps (Android; iPhone Safari does not allow it)</span></span><input type="checkbox" class="switch" id="ftHap" ${store.get('haptics', true) !== false ? 'checked' : ''}></label></div>`);
        el.querySelector('#ftHap').onchange = (e) => store.set('haptics', e.target.checked);
      } catch (e) { console.warn('settings haptics', e); }
    };
    VIEWS.settings.__ft = true;
  }

  // ================================================================================ install
  function install() {
    const add = (gid, id, label, ic, desc, at) => {
      const G = GROUPS.find((g) => g.id === gid) || GROUPS.find((g) => g.id === 'system'); if (!G || G.pages.some((p) => p[0] === id)) return;
      G.pages.splice(at == null ? G.pages.length : Math.min(at, G.pages.length), 0, [id, label, ic, desc]);
      PAGES[id] = { id, label, icon: ic, desc, group: G.id };
    };
    // the old "Every part of the bot" tiles live on as More > All parts
    if (VIEWS.system && !VIEWS.parts) VIEWS.parts = VIEWS.system;
    VIEWS.system = moreView;
    const M = GROUPS.find((g) => g.id === 'system');
    if (M) { const p0 = M.pages.find((p) => p[0] === 'system'); if (p0) { p0[1] = 'More'; p0[3] = 'Every page in six sections'; } }
    add('system', 'features', 'All features', 'star', 'What’s new and every feature in one line', 1);
    add('system', 'lights', 'Health lights', 'radar', 'Green / amber / red for every part the bot needs', 2);
    add('system', 'parts', 'All parts (tiles)', 'modules', 'The old overview: every part of the bot with its live state');
    add('trades', 'weekcal', 'Week calendar', 'heat', '12-week heatmap, streaks, best and worst day', 2);
    add('trades', 'last10', 'Last 10', 'trades', 'The newest 10 trades with pictures, CSV, share', 1);
    add('money', 'evaltl', 'Eval timeline', 'clock', 'Sessions 1-15 with dates and $, risk-per-trade gauge', 1);
    add('atlas', 'atstats', 'Setup stats', 'results', 'EMA, MACD, S/R side by side', 1);
    if (PAGES.system) { PAGES.system.label = 'More'; PAGES.system.desc = 'Every page in six sections'; }
    Object.assign(SCENE, { features: 'engine', lights: 'engine', parts: 'engine', weekcal: 'results', last10: 'trades', evaltl: 'eval', atstats: 'eval' });
    for (const k of ['features', 'lights', 'parts', 'weekcal', 'last10', 'evaltl', 'atstats', 'goals']) delete ALIAS[k];   // a page id wins over an old alias (intel.js had "features")
    Object.assign(ALIAS, { whatsnew: 'features', new: 'features', allfeatures: 'features', health: 'lights', lightsboard: 'lights', heatmap: 'weekcal', weekcalendar: 'weekcal',
      last: 'last10', recent: 'last10', timeline: 'evaltl', riskgauge: 'evaltl', setupstats: 'atstats', atlasstats: 'atstats', overview_tiles: 'parts' });
    // pages under More: one "‹ More" back button instead of the long strip
    if (typeof subBar === 'function' && !subBar.__ft) {
      const sb0 = subBar;
      subBar = function (p, g) { // eslint-disable-line no-global-assign
        if (g === 'system' && p === 'system') { const sub = document.getElementById('sub'); sub.className = 'sub'; sub.innerHTML = ''; return; }
        if (g === 'system' && p !== 'system' && !(typeof DETAIL !== 'undefined' && DETAIL[p])) {
          const sub = document.getElementById('sub'); sub.className = 'sub mb';
          sub.innerHTML = `<div class="modbar"><button class="chipbtn back" type="button" data-go="system">${icon('back')}<span>More</span></button><span style="flex:1"></span></div>`;
          return;
        }
        return sb0.apply(this, arguments);
      };
      subBar.__ft = true;
    }
    settingsHook();
    const st = document.createElement('style'); st.id = 'feat-css'; st.textContent = CSS; document.head.appendChild(st);
    offline(); addEventListener('online', offline); addEventListener('offline', offline);
    haptics(); topBtn();
    window.Features = { list: FEATS, count: FEATS.length, newCount: FEATS.filter((f) => f.isNew).length, lights: lightsList, version: 1 };
    if (typeof nav === 'function') { nav(); if (typeof route === 'function') route(); }
  }

  const CSS = `
.ft-bar{display:flex;gap:8px;align-items:center;margin:0 0 14px}.ft-q{flex:1;display:flex;align-items:center;gap:8px;padding:0 12px;height:42px;border-radius:14px;border:1px solid var(--line);background:var(--surface-2)}
.ft-q input{all:unset;flex:1;min-width:0;font-size:15px;color:var(--ink)}.ft-q .ico{color:var(--muted)}
.ft-sec{margin:0 0 18px}.ft-sec h4{display:flex;align-items:center;gap:8px;font:650 11.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 2px 8px}.ft-sec h4 .ico{width:15px;height:15px}
.ft-sec h4 i{font-style:normal;margin-left:auto;font-family:var(--mono)}
.ft-list{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--surface)}
.ft-row{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-bottom:1px solid var(--line);cursor:pointer}.ft-row:last-child{border-bottom:0}.ft-row:active{background:var(--hover)}
.ft-row[hidden],.ft-sec[hidden]{display:none}
.ft-i{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent)}
.ft-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.ft-t b{font-size:15px;font-weight:650;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ft-t em{font-style:normal;font-size:12.5px;color:var(--ink-2);line-height:1.4}
.ft-go{flex:none;color:var(--muted);width:16px;height:16px}
.ft-new{font:750 9.5px var(--sans);font-style:normal;letter-spacing:.06em;padding:2px 6px;border-radius:6px;background:var(--good);color:#06100b}
.ft-tab{font:600 10px var(--sans);font-style:normal;padding:2px 6px;border-radius:6px;border:1px solid var(--line);color:var(--muted)}
.ft-wn{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:12px;width:100%;padding:14px;margin:0 0 18px;border-radius:var(--r);cursor:pointer;border:1px solid color-mix(in srgb,var(--good) 40%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--good) 12%,var(--surface)),var(--surface))}
.ft-wn .ft-i{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.ft-n{flex:none;width:30px;font:600 11px var(--mono);color:var(--muted);text-align:right}.ft-f.isnew .ft-n{color:var(--good)}
.ft-cnt{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.ft-jump{cursor:pointer;font:inherit}
.ft-d>summary{list-style:none;cursor:pointer;padding:12px 14px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}.ft-d>summary::-webkit-details-marker{display:none}
.ft-d>summary h4{margin:0;font-size:13px;color:var(--ink)}.ft-d .ft-sn{margin-left:auto;font:600 11.5px var(--mono);letter-spacing:0;text-transform:none;color:var(--muted)}.ft-chev{width:16px;height:16px;transition:transform .2s}
.ft-d[open]>summary{border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:0}.ft-d[open] .ft-chev{transform:rotate(180deg)}.ft-d[open]>.ft-list{border-top-left-radius:0;border-top-right-radius:0}
.ft-d{margin-bottom:10px}
.ft-wh,.ft-wk{display:grid;grid-template-columns:52px repeat(5,1fr) 52px;gap:5px;align-items:center}.ft-wh em{font-style:normal;font-size:10.5px;color:var(--muted);text-align:center}.ft-wk{margin-top:5px}
.ft-wl{font:600 10.5px var(--mono);color:var(--muted)}.ft-wk b{font:650 11px var(--mono);text-align:right}
.ft-cell{all:unset;box-sizing:border-box;height:30px;border-radius:7px;background:var(--surface-3);display:flex;align-items:flex-end;justify-content:flex-end;padding:2px 4px;cursor:pointer}.ft-cell.none{opacity:.45}.ft-cell em{font-style:normal;font:600 9px var(--mono);color:var(--ink-2)}
.ft-bw{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ft-bw div{display:flex;flex-direction:column;gap:2px}.ft-bw span{font:650 10.5px var(--sans);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.ft-bw b{font:750 22px var(--mono)}.ft-bw em{font-style:normal;font-size:12px;color:var(--ink-2)}
.ft-wda{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:end;min-height:110px}.ft-wda div{display:flex;flex-direction:column;align-items:center;gap:4px}.ft-wda i{display:block;width:70%;border-radius:5px;background:var(--muted)}.ft-wda i.up{background:var(--good)}.ft-wda i.dn{background:var(--bad)}.ft-wda b{font:650 11px var(--mono)}.ft-wda em{font-style:normal;font-size:11px;color:var(--muted)}
.ft-tl{display:flex;flex-direction:column}.ft-tr{display:grid;grid-template-columns:1.6fr .9fr .8fr auto auto 14px;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px}.ft-tr:last-child{border-bottom:0}
.ft-tw{display:flex;flex-direction:column;font-weight:650}.ft-tw em{font-style:normal;font-weight:400;font-size:11px;color:var(--muted)}.ft-tx{color:var(--ink-2);font-size:11.5px}.ft-tr b,.ft-tr em{font-family:var(--mono);font-style:normal}.ft-pic{font-style:normal;color:var(--accent)}
.ft-lights{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px}.ft-light{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--surface)}
.ft-light>i{flex:none;width:14px;height:14px;border-radius:50%;margin-top:3px;background:var(--muted);box-shadow:0 0 0 4px color-mix(in srgb,var(--muted) 18%,transparent)}
.ft-light.good>i{background:var(--good);box-shadow:0 0 0 4px color-mix(in srgb,var(--good) 18%,transparent),0 0 12px var(--good)}.ft-light.warn>i{background:var(--warn);box-shadow:0 0 0 4px color-mix(in srgb,var(--warn) 18%,transparent)}.ft-light.bad>i{background:var(--bad);box-shadow:0 0 0 4px color-mix(in srgb,var(--bad) 20%,transparent),0 0 12px var(--bad)}
.ft-light.bad{border-color:color-mix(in srgb,var(--bad) 45%,transparent)}.ft-light div{display:flex;flex-direction:column;gap:2px;min-width:0}.ft-light b{font-size:14.5px}.ft-light span{font:650 13px var(--mono)}.ft-light em{font-style:normal;font-size:12px;color:var(--ink-2);line-height:1.4}
.ft-gauge{position:relative;display:flex;flex-direction:column;align-items:center}.ft-gauge svg{display:block}.ft-gt{fill:none;stroke:var(--surface-3);stroke-width:12;stroke-linecap:round}.ft-gv{fill:none;stroke-width:12;stroke-linecap:round}
.ft-gauge b{margin-top:-34px;font:750 22px var(--mono)}.ft-gauge em{font-style:normal;font-size:12px;color:var(--ink-2);text-align:center;margin-top:8px}
.ft-tlist{display:flex;flex-direction:column}.ft-tlr{display:grid;grid-template-columns:30px 1fr auto 84px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}.ft-tlr:last-child{border-bottom:0}
.ft-tn{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font:650 11px var(--mono);background:var(--surface-3);color:var(--ink-2)}.ft-tlr.today .ft-tn{background:var(--accent);color:#fff}.ft-tlr.future{opacity:.55}
.ft-tlr.goal{border-bottom:2px solid color-mix(in srgb,var(--good) 60%,transparent)}.ft-tlr.limit{border-bottom:2px solid color-mix(in srgb,var(--bad) 60%,transparent)}
.ft-td i{font-style:normal;margin-left:8px;font:650 9.5px var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--good)}.ft-tlr.limit .ft-td i{color:var(--bad)}.ft-tlr b,.ft-tlr em{font-family:var(--mono);font-style:normal;text-align:right}.ft-tlr em{color:var(--muted);font-size:11.5px}
.ft-at{display:grid;grid-template-columns:1fr;gap:0}.ft-atp{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--ink-2);margin-top:8px}.ft-atp b{color:var(--ink);font-family:var(--mono)}
.ft-off{font:700 10.5px var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:99px;background:var(--bad);color:#fff;margin-right:6px}.ft-off[hidden]{display:none}
.ft-top{position:fixed;right:16px;bottom:calc(92px + env(safe-area-inset-bottom));z-index:40;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--surface-2);color:var(--ink);display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.35)}.ft-top[hidden]{display:none}
#atSpan{margin-bottom:12px}
.chipbtn.wide{width:auto;padding:0 12px}.chipbtn.wide span{display:inline}
.ft-k4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.ft-k4>div{display:flex;flex-direction:column;gap:2px;padding:9px 8px;border-radius:12px;background:var(--surface-2);min-width:0}
.ft-k4 span{font:650 9.5px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ft-k4 b{font:750 16px var(--mono);white-space:nowrap}.ft-k4 em{font-style:normal;font-size:10.5px;color:var(--muted)}
.ft-atall{border-color:color-mix(in srgb,var(--warn) 40%,transparent)}
`;
  install();
})();
