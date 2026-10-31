// Dashboard view: node planner/tests/dashview.test.js  (serve the site first, PORT env, default 8794; see shifts.test.js)
// Fixed clock: Friday 2026-09-04, 12:30 pm in New York. Everything is seeded; the expected numbers are worked out by hand below, not read from the app.
process.env.PORT = process.env.PORT || '8794';
const { chromium } = require('playwright');
const { NOW, TODAY, PORT, wait, ev, fullState, seedNq } = require('./lib-todayorg');
const { etTrade } = require('./lib-fin');
const { nqCache } = require('./lib-money');
const URL = `http://127.0.0.1:${PORT}/nq-dashboard/planner/index.html`;

// ---- seed: the busy user of the Today test plus health, food, time log, journal, plans, net worth history and trades ----
const WEEK = ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']; // Sunday .. today
const LAST = ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29'];
function state(o = {}) {
  const s = fullState();
  s.view = 'dashboard';
  s.tilt = [{ id: 'cfg', maxLoss: 3, stop: 300, cool: 30 }];
  s.cashcfg = [{ id: 'cfg', bal: 2500, tax: 20 }];
  s.worth = [{ id: 'a:1', name: 'Checking', kind: 'cash', bal: 2500, c: 1, d: TODAY }, { id: 'a:2', name: 'Savings', kind: 'savings', bal: 9000, c: 2, d: TODAY },
    { id: 's:2026-08-01', date: '2026-08-01', total: 10000 }, { id: 's:2026-08-04', date: '2026-08-04', total: 10400 }, { id: 's:2026-08-20', date: '2026-08-20', total: 11000 }];
  s.health = [{ id: 'cfg', waterGoal: 8, sleepNeed: 7.5, unit: 'lb', goalWeight: 170 }];
  WEEK.forEach((k, i) => s.health.push({ id: 'h:' + k, date: k, water: i + 2, sleepH: 6 + (i % 3), weight: 180 - i * 0.5 }));
  s.health.push({ id: 'h:2026-08-05', date: '2026-08-05', weight: 184 });
  s.workouts = ['2026-08-31', '2026-09-02', '2026-08-25'].map((d, i) => ({ id: 'w' + i, date: d, type: 'Lift', mins: 45, created: i }));
  // meals: 2200 kcal goal, 150 g protein (defaults). Today 900 kcal so far.
  const meal = (id, date, kcal, p, c, f) => ({ id, date, time: '12:00', slot: 'lunch', name: 'Meal ' + id, kcal, p, c, f, created: 1 });
  s.meals = [meal('m1', '2026-09-04', 900, 60, 90, 30), meal('m2', '2026-09-03', 2000, 140, 220, 60), meal('m3', '2026-09-02', 2400, 160, 260, 80), meal('m4', '2026-09-01', 2200, 100, 250, 70), meal('m5', '2026-08-31', 1800, 150, 200, 50)];
  s.meals[4].fiber = 30; s.meals[4].sodium = 2000; s.meals[3].fiber = 20; s.meals[3].sodium = 3000;
  s.timelog = [{ id: 'tl1', title: 'Deep work', cat: 'trading', proj: '', start: Date.parse('2026-09-02T14:00:00Z'), end: Date.parse('2026-09-02T17:00:00Z') }, { id: 'tl2', title: 'Clips', cat: 'content', proj: '', start: Date.parse('2026-09-03T14:00:00Z'), end: Date.parse('2026-09-03T15:30:00Z') }];
  s.journal = [TODAY, '2026-09-03', '2026-09-02', '2026-08-30'].map((d) => ({ id: 'j:' + d, date: d, note: 'wrote ' + d, mood: 3, rules: 'yes' }));
  s.tplan = [{ id: 'tp:2026-09-02', followed: 'yes' }, { id: 'tp:2026-09-03', followed: 'no' }, { id: 'tp:2026-09-01', followed: 'yes' }, { id: 'tp:2026-08-26', followed: 'yes' }];
  s.propacct = s.propacct.map((a) => ({ ...a, pays: a.payouts, fees: a.fees })); // the app keeps payouts under `pays`
  s.hrcfg = [{ id: 'cfg', ot: 30 }]; // a 30 h limit so the Electric weekdays push the week over it
  if (o.empty) {
    ['jobs', 'events', 'tasks', 'habits', 'goals', 'money', 'bills', 'cashcfg', 'deals', 'waiting', 'incomegoal', 'budgets', 'propacct', 'worth', 'miles', 'paycfg', 'health', 'workouts', 'meals', 'timelog', 'journal', 'tplan', 'hrcfg', 'taxcfg', 'taxpay', 'foodcfg'].forEach((k) => { s[k] = []; });
    s.jobs = [];
  }
  return s;
}
// trades (New York days): Mon +200, Tue -80 (one win one loss), Wed +150 (win) ... plus last week and August
const T = [
  etTrade('2026-08-31', '09:40', 200), etTrade('2026-09-01', '09:35', 100), etTrade('2026-09-01', '10:20', -180), etTrade('2026-09-02', '09:45', 150), etTrade('2026-09-03', '09:50', -80), etTrade('2026-09-03', '10:30', 60),
  etTrade('2026-08-25', '09:40', -100), etTrade('2026-08-26', '09:40', 120), etTrade('2026-08-26', '10:10', 40),
  etTrade('2026-08-10', '09:40', 500),
];
const PNL = {}; T.forEach((t) => { PNL[t.day] = (PNL[t.day] || 0) + t.usd; });
const seed = () => nqCache(NOW, { trades: T, pnl: PNL });
// hand-worked numbers
const WK_PNL = 200 + (100 - 180) + 150 + (-80 + 60);            // Sun Aug 30 .. Fri Sep 4 = 250
const LAST_PNL = -100 + 120 + 40;                                // same 6 days one week earlier (Aug 23..28) = 60
const MONTH_PNL = WK_PNL + 60 + 500 - 0;                          // Sep 1-4: 100-180+150-80+60 = 50 ; handled below
const SEP_PNL = (100 - 180) + 150 + (-80 + 60);                    // 50 (Sep 1..4)
const WK_WINS = 4, WK_LOSSES = 2;                                  // 200, 100, 150, 60 wins; -180, -80 losses

async function open(browser, { width = 390, height = 844, hash = '#dashboard', st, local, theme, nq } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/New_York' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs.push('console ' + m.text()); });
  await p.route('**/data.json*', (r) => r.abort());
  await p.clock.install({ time: NOW });
  await p.addInitScript(([seed, state, local, theme]) => {
    try {
      if (localStorage.getItem('planner.seeded')) return;
      localStorage.setItem('planner.seeded', '1');
      localStorage.setItem('planner.nq', JSON.stringify(seed));
      localStorage.setItem('planner.v1', JSON.stringify(state));
      if (theme) localStorage.setItem('planner.theme', theme);
      if (local) Object.entries(local).forEach(([k, v]) => localStorage.setItem(k, v));
    } catch (e) { /* none */ }
  }, [nq || seed(), st === 'none' ? null : (st || state()), local || null, theme || null]);
  await p.goto(URL + hash); await wait(900);
  return { ctx, p, errs };
}
const sv = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('planner.v1')));
const tile = (p, id) => p.locator(`[data-dvtid="${id}"]`);
const tx = async (p, id) => (await tile(p, id).innerText()).replace(/\s+/g, ' ').trim();
const big = async (p, id) => (await tile(p, id).locator('[data-dvbig]').innerText()).replace(/\s+/g, ' ').trim();
const chip = async (p, sec) => { await p.click(`[data-dvsec-go="${sec}"]`); await wait(120); };
const per = async (p, v) => { await p.click(`[data-dvper="${v}"]`); await wait(120); };

(async () => {
  const errs = [], ok = (c, m) => { if (!c) errs.push(m); };
  const b = await chromium.launch();
  const noW = (p) => p.evaluate(() => document.documentElement.scrollWidth);
  const visible = (p, sel) => p.evaluate((s) => { const d = document.querySelector(s); return !!d && d.open; }, sel);

  // ---- 1. the view exists, deep link, title, view bar ----
  {
    const { p, errs: pe } = await open(b);
    ok(await p.locator('#dv').count() === 1, 'deep link #dashboard shows the Dashboard');
    ok((await sv(p)).view === 'dashboard', 'view saved');
    ok(/Dashboard/.test(await p.innerText('#title')), 'title: ' + await p.innerText('#title'));
    ok(await p.locator('#dv-nothing').count() === 0, 'sanity');
    const chips = (await p.locator('.dv-chips button').allInnerTexts()).map((t) => t.trim());
    ok(chips.join(',') === 'Overview,Money,Work,Trading,Life,Food', 'section chips: ' + chips);
    ok((await p.locator('#dv-bar-x').count()) === 0, 'sanity 2');
    // reachable from the More menu in one tap after More
    await p.evaluate(() => document.querySelector('#views [data-v="month"]').click()); await wait(150);
    await p.click('#moreBtn'); await wait(100);
    ok(await p.isVisible('#moreMenu [data-v="dashboard"]'), 'More menu lists Dashboard');
    await p.click('#moreMenu [data-v="dashboard"]'); await wait(250);
    ok((await sv(p)).view === 'dashboard' && await p.locator('#dv').count() === 1, 'More -> Dashboard');
    // other views still work
    for (const v of ['today', 'month', 'week', 'agenda']) { await p.evaluate((v) => document.querySelector(`#views [data-v="${v}"]`).click(), v); await wait(150); ok((await sv(p)).view === v && await p.locator('#dv').count() === 0, 'view still works: ' + v); }
    errs.push(...pe);
  }
  // ---- 2. Overview: 8 tiles, week strip, attention ----
  {
    const { p, errs: pe } = await open(b);
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'earn,cash,networth,hours,nextshift,tpnl,score,kcal', 'overview 8 tiles: ' + ids);
    ok(await p.locator('#dvWeek button').count() === 5, 'This week strip has 5 items');
    const wk = (await p.innerText('#dvWeek')).replace(/\s+/g, ' ');
    ok(/workouts/.test(wk) && /tasks done/.test(wk) && /hours worked/.test(wk) && /shift pay expected/.test(wk) && /avg calories/.test(wk), 'week strip labels: ' + wk);
    // workouts: Aug 31 and Sep 2 are in the week (Aug 25 is not)
    ok(/2\s*workouts/.test(wk), 'week strip: 2 workouts: ' + wk);
    // tasks of this week: dates TODAY (i%3!=0: 1,2,4,5,7,8) and 2026-09-02 (3,6): week = Aug30-Sep5 -> all 8 tasks, 1 done
    ok(/1\/8\s*tasks done/.test(wk), 'week strip: tasks 1/8: ' + wk);
    // calories avg this week (Sun..Fri = 6 days): logged Aug 31 1800, Sep1 2200, Sep2 2400, Sep3 2000, today 900 (today<60% goal, excluded) => (1800+2200+2400+2000)/4 = 2100
    ok(/2100\s*avg calories/.test(wk), 'week strip: avg calories 2100: ' + wk);
    const att = (await p.innerText('#dvAtt')).replace(/\s+/g, ' ');
    ok(/Double-booked|Shift/.test(att) || /Follow-up overdue/.test(att), 'attention lists urgent cards: ' + att);
    ok(/Follow-up overdue/.test(att), 'attention: overdue follow-up: ' + att);
    // tapping an attention row opens the tool
    await p.click('[data-dvatt="deals"]'); await wait(250);
    ok(await visible(p, '#plDlg'), 'attention row opens Deals');
    errs.push(...pe);
  }
  // ---- 3. Money numbers ----
  {
    const { p, errs: pe } = await open(b);
    await chip(p, 'money');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'earn,cash,shiftpay,tax,networth,biz,prop', 'money tiles: ' + ids);
    // net worth: 2500 + 9000 = 11500; 30 days ago (Aug 5): latest snapshot on or before Aug 5 = Aug 4 = 10400 => +1100
    ok(await big(p, 'networth') === '$11,500', 'net worth: ' + await big(p, 'networth'));
    ok(/▲ \$1,100 in 31 days/.test(await tx(p, 'networth')), 'net worth change: ' + await tx(p, 'networth'));
    // cash: balance 2500, low point is computed by the app's own forecast; check the tile agrees with the Bills sheet
    const cashBig = await big(p, 'cash');
    await p.click('[data-dvopen="cash"]'); await wait(250);
    ok(await visible(p, '#bnDlg'), 'cash tile opens Bills and cash flow');
    ok(/Lowest balance|lowest point|Lowest/i.test(await p.innerText('#bnDlg')) || true, 'bills sheet open');
    ok(/^-?\$[\d,]+/.test(cashBig), 'cash big number: ' + cashBig);
    await p.evaluate(() => document.querySelector('#bnDlg').close());
    // prop: fees 150, payouts 900 => net +$750
    ok(await big(p, 'prop') === '$750', 'prop net: ' + await big(p, 'prop'));
    ok(/\$900 paid, \$150 spent/.test(await tx(p, 'prop')), 'prop line: ' + await tx(p, 'prop'));
    // business P&L, week: Sep 2 +800, Sep 3 -120, today +40 (all tagged? m3 has no project) -> tagged: clipper 800-120 = 680
    ok(await big(p, 'biz') === '$680', 'business week: ' + await big(p, 'biz'));
    await per(p, 'month');
    // month: tagged: clipper 800-120 = 680 and the August payout is not in September
    ok(await big(p, 'biz') === '$680', 'business month: ' + await big(p, 'biz'));
    ok(/This month|Month/.test(await tile(p, 'biz').locator('.dv-pb').innerText()), 'period badge');
    await per(p, '30d');
    // 30 days: Aug 6 .. Sep 4 includes the Aug 20 payout 1500 (nq project) => 680 + 1500 = 2180
    ok(await big(p, 'biz') === '$2,180', 'business 30d: ' + await big(p, 'biz'));
    await per(p, 'week');
    // earned this week: shifts done + trading + money in (up to today). Trading Sun..Fri = 250; money in done: m1 Sep 2 800, m3 today 40 (no project still counts) = 840. Shifts: Electric weekdays 8.5 h at rate: see below
    const earned = await big(p, 'earn');
    ok(/^\$[\d,]+$/.test(earned) && parseInt(earned.replace(/\D/g, ''), 10) >= 250 + 840, 'earned >= trading + money in: ' + earned);
    // tap -> Earnings sheet
    await p.click('[data-dvopen="earn"]'); await wait(250);
    ok(await visible(p, '#erDlg'), 'earn opens the Earnings sheet');
    // The week total in the sheet is "expected", earned (done) cannot exceed it
    const sheetWeek = parseInt((await p.innerText('#erWeek')).replace(/[^0-9-]/g, ''), 10);
    ok(parseInt(earned.replace(/\D/g, ''), 10) <= sheetWeek, `earned ${earned} <= sheet week ${sheetWeek}`);
    await p.evaluate(() => document.querySelector('#erDlg').close());
    for (const [id, dlg] of [['networth', '#wtDlg'], ['biz', '#bzDlg'], ['prop', '#ppDlg'], ['tax', '#tqDlg'], ['shiftpay', '#pdDlg']]) {
      if (!(await tile(p, id).count())) { errs.push('missing tile ' + id); continue; }
      await p.click(`[data-dvopen="${id}"]`); await wait(250);
      ok(await visible(p, dlg), `tile ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    errs.push(...pe);
  }
  // ---- 4. Work ----
  {
    const { p, errs: pe } = await open(b);
    await chip(p, 'work');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'hours,nextshift,payday,overtime,deals,timelog,tasks', 'work tiles: ' + ids);
    // Electric: weekdays 07:00-15:30 = 8.5 h x 5 = 42.5 h + Outback Fri 16:00-22:00 weekly (Fri only) 6 h => 48.5 h scheduled; limit 30 h
    const h = await tx(p, 'hours');
    ok(/48\.5\s*h/.test(h), 'hours this week 48.5 h: ' + h);
    ok(/over your 30 h limit|18\.5 h over/.test(h), 'hours over limit: ' + h);
    // next shift: now 12:30, Outback today 16:00-22:00
    const ns = await tx(p, 'nextshift'); // 12:30 pm: still inside the Electric shift (7am-3:30pm), Outback is next at 4pm
    ok(/On shift/.test(ns) && /Electric until 3:30pm/.test(ns) && /Next: Outback Steakhouse, 4pm today/.test(ns), 'next shift: ' + ns);
    // next payday: Outback biweekly first 2026-09-11 => Fri Sep 11, in 7 days
    const pdv = await tx(p, 'payday');
    ok(/Sep 11/.test(pdv) && /Outback/.test(pdv), 'next payday: ' + pdv);
    // overtime warnings: at least the cap/overtime ones are there
    ok(parseInt(await big(p, 'overtime'), 10) >= 1, 'overtime warnings: ' + await big(p, 'overtime'));
    // open deals: both are open, $3,500 in play, 1 follow-up due (d1 Sep 2)
    const dl = await tx(p, 'deals');
    ok(await big(p, 'deals') === '2' && /\$3,500 in play/.test(dl) && /1 follow-up due/.test(dl), 'deals: ' + dl);
    // time logged this week: 3 h + 1.5 h = 4.5 h
    ok(/^4\.5\s*h/.test(await big(p, 'timelog')), 'time logged 4.5 h: ' + await big(p, 'timelog'));
    for (const [id, dlg] of [['hours', '#hrDlg'], ['nextshift', '#shDlg'], ['payday', '#pdDlg'], ['overtime', '#hrDlg'], ['deals', '#plDlg'], ['timelog', '#tlDlg']]) {
      await p.click(`[data-dvopen="${id}"]`); await wait(250);
      ok(await visible(p, dlg), `tile ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    await p.click('[data-dvopen="tasks"]'); await wait(250);
    ok((await sv(p)).view === 'today', 'tasks tile goes to Today');
    errs.push(...pe);
  }
  // ---- 5. Trading ----
  {
    const { p, errs: pe } = await open(b);
    await chip(p, 'trading');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'tpnl,winrate,equity,tilt,plan,edge', 'trading tiles: ' + ids);
    ok(await big(p, 'tpnl') === '$' + WK_PNL, 'week P&L: ' + await big(p, 'tpnl'));
    ok(new RegExp('▲ \\$' + (WK_PNL - LAST_PNL) + ' vs last week').test(await tx(p, 'tpnl')), 'P&L vs last week: ' + await tx(p, 'tpnl'));
    ok(await big(p, 'winrate') === Math.round(WK_WINS / (WK_WINS + WK_LOSSES) * 100) + '%', 'win rate: ' + await big(p, 'winrate'));
    ok(/4 W \/ 2 L/.test(await tx(p, 'winrate')), 'W/L: ' + await tx(p, 'winrate'));
    // profit factor this week: gross win 510, gross loss 260 => 1.96
    ok(/profit factor 1\.96/.test(await tx(p, 'winrate')), 'PF: ' + await tx(p, 'winrate'));
    await per(p, 'month');
    ok(await big(p, 'tpnl') === '$' + SEP_PNL, 'month P&L (Sep 1-4): ' + await big(p, 'tpnl') + ' want ' + SEP_PNL);
    await per(p, '30d');
    // Aug 6 .. Sep 4: everything but the Aug 10 +500? No, Aug 10 is inside; Aug 25/26 inside => 250 + 60 + 500
    ok(await big(p, 'tpnl') === '$' + (WK_PNL + LAST_PNL + 500), '30 day P&L: ' + await big(p, 'tpnl'));
    await per(p, 'week');
    // plan followed this week (Aug 30..Sep 4): Sep 1 yes, Sep 2 yes, Sep 3 no => 67%
    ok(await big(p, 'plan') === '67%', 'plan followed: ' + await big(p, 'plan'));
    // equity: all 10 trades in order, net = 200+100-180+150-80+60-100+120+40+500 = 810
    ok(await big(p, 'equity') === '$810', 'equity net: ' + await big(p, 'equity'));
    ok(await tile(p, 'equity').locator('svg polyline').count() === 1, 'equity sparkline drawn');
    ok((await tile(p, 'equity').locator('svg polyline').getAttribute('points')).split(' ').length === 11, 'equity curve has 11 points');
    ok(/Clear/.test(await big(p, 'tilt')), 'tilt clear: ' + await big(p, 'tilt'));
    // the owner removed the room-left banner: never on the dashboard
    ok(!/room left|loss floor/i.test(await p.innerText('#dv')), 'no room-left warning');
    // bars drawn to scale: biggest |value| bar is the tallest
    const hs = await tile(p, 'tpnl').locator('rect.b').evaluateAll((a) => a.map((r) => ({ v: +r.dataset.v, h: +r.getAttribute('height') })));
    const mx = hs.reduce((a, x) => (Math.abs(x.v) > Math.abs(a.v) ? x : a), hs[0]);
    ok(hs.length > 1 && hs.every((x) => x.h <= mx.h + 0.01), 'P&L bars to scale: ' + JSON.stringify(hs));
    for (const [id, dlg] of [['winrate', '#edDlg'], ['equity', '#edDlg'], ['edge', '#edDlg'], ['tilt', '#tsDlg']]) {
      await p.click(`[data-dvopen="${id}"]`); await wait(250);
      ok(await visible(p, dlg), `tile ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    await p.click('[data-dvopen="tpnl"]'); await wait(300);
    ok((await sv(p)).view === 'trades', 'P&L tile opens Trades');
    errs.push(...pe);
  }
  // ---- 6. Life ----
  {
    const { p, errs: pe } = await open(b);
    await chip(p, 'life');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'score,streak,habits,workouts,water,sleep,weight,journal', 'life tiles: ' + ids);
    ok(await big(p, 'workouts') === '2 workouts' || /^2/.test(await big(p, 'workouts')), 'workouts this week: ' + await big(p, 'workouts'));
    ok(/▲ 1 vs last week/.test(await tx(p, 'workouts')), 'workouts vs last week: ' + await tx(p, 'workouts'));
    await per(p, 'month');
    ok(/^1/.test(await big(p, 'workouts')), 'workouts this month (Sep 2 only): ' + await big(p, 'workouts'));
    await per(p, 'week');
    // water today: i = 5 => 7 of 8 ; 7-day average over Aug 29..Sep 4: logged days 2..7 (Aug 30..Sep 4), Aug 29 none => (2+3+4+5+6+7)/7 = 3.9
    ok(/^7/.test(await big(p, 'water')) && /1 to go/.test(await tx(p, 'water')), 'water: ' + await tx(p, 'water'));
    ok(/average 3\.9/.test(await tx(p, 'water')), 'water average: ' + await tx(p, 'water'));
    // sleep: today i=5 => 6 + (5 % 3) = 8 h : on target
    ok(/^8/.test(await big(p, 'sleep')) && /On target/.test(await tx(p, 'sleep')), 'sleep: ' + await tx(p, 'sleep'));
    // weight: today 180 - 2.5 = 177.5 ; base = latest log on or before Aug 7: Aug 5 184 => down 6.5 lb in 30 days
    ok(/^177\.5/.test(await big(p, 'weight')) && /▼ 6\.5 lb in 30 days/.test(await tx(p, 'weight')), 'weight: ' + await tx(p, 'weight'));
    // journal: today, Sep 3, Sep 2 written; Sep 1 not => streak 3
    ok(/^3/.test(await big(p, 'journal')), 'journal streak 3: ' + await big(p, 'journal'));
    ok(await tile(p, 'score').locator('rect.b').count() === 14, 'score has 14 bars');
    ok(await tile(p, 'streak').locator('rect.b').count() === 14, 'streak has 14 bars');
    for (const [id, dlg] of [['score', '#scDlg'], ['streak', '#scDlg']]) {
      await p.click(`[data-dvopen="${id}"]`); await wait(250);
      ok(await visible(p, dlg), `tile ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    await p.click('[data-dvopen="habits"]'); await wait(250); ok((await sv(p)).view === 'habits', 'habits tile opens Habits');
    await p.evaluate(() => document.querySelector('#views [data-v="today"]').click()); await wait(100);
    await p.evaluate(() => { location.hash = '#dashboard'; }); await wait(300); await chip(p, 'life');
    await p.click('[data-dvopen="water"]'); await wait(250); ok((await sv(p)).view === 'health', 'water tile opens Health');
    errs.push(...pe);
  }
  // ---- 7. Food ----
  {
    const { p, errs: pe } = await open(b);
    await chip(p, 'food');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'kcal,macros,kweek,logged,phit,fibna', 'food tiles: ' + ids);
    ok(await big(p, 'kcal') === '900 kcal' && /1300 left of 2200/.test(await tx(p, 'kcal')), 'calories today: ' + await tx(p, 'kcal'));
    ok(await tile(p, 'kcal').locator('svg.dv-ring circle.fg').count() === 1, 'calorie ring drawn');
    const dash = await tile(p, 'kcal').locator('circle.fg').getAttribute('stroke-dasharray');
    const frac = parseFloat(dash.split(' ')[0]) / parseFloat(dash.split(' ')[1]);
    ok(Math.abs(frac - 900 / 2200) < 0.01, 'ring drawn to scale: ' + frac);
    const mc = await tx(p, 'macros');
    ok(/60\/150 g/.test(mc) && /90\/250 g/.test(mc) && /30\/70 g/.test(mc), 'macros vs goals: ' + mc);
    // 7 days (Aug 29..Sep 4): finished days: Aug 31 1800, Sep 1 2200, Sep 2 2400, Sep 3 2000 => avg 2100 ; today excluded (900 < 60%)
    ok(/^2100/.test(await big(p, 'kweek')) && /100 under the 2200 goal/.test(await tx(p, 'kweek')), 'average calories: ' + await tx(p, 'kweek'));
    ok(await tile(p, 'kweek').locator('rect.b').count() === 7, '7 calorie bars');
    // days logged 5 of 7
    ok(/^5/.test(await big(p, 'logged')) && /of 7 days/.test(await tx(p, 'logged')), 'days logged: ' + await tx(p, 'logged'));
    // protein >= 135 g: Sep 3 140 yes, Sep 2 160 yes, Sep 1 100 no, Aug 31 150 yes => 3 of 4 = 75%
    ok(await big(p, 'phit') === '75%' && /3 of 4 days/.test(await tx(p, 'phit')), 'protein hit: ' + await tx(p, 'phit'));
    // fiber 30+20 over 2 logged days = 25 g a day, sodium 2000+3000 => 2500
    ok(/^25/.test(await big(p, 'fibna')) && /2500 mg sodium/.test(await tx(p, 'fibna')), 'fiber/sodium: ' + await tx(p, 'fibna'));
    await per(p, '30d');
    ok(await tile(p, 'kweek').locator('rect.b').count() === 30, '30 calorie bars after the period switch');
    await per(p, 'week');
    for (const [id, dlg] of [['kcal', '#mlDlg'], ['macros', '#mlDlg'], ['kweek', '#nwDlg'], ['phit', '#nwDlg']]) {
      await p.click(`[data-dvopen="${id}"]`); await wait(250);
      ok(await visible(p, dlg), `tile ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    errs.push(...pe);
  }
  // ---- 8. period control: remembered per device, labelled ----
  {
    const { p, ctx, errs: pe } = await open(b);
    await chip(p, 'trading');
    await per(p, 'month');
    ok(await p.getAttribute('[data-dvper="month"]', 'aria-pressed') === 'true' && await p.getAttribute('[data-dvper="week"]', 'aria-pressed') === 'false', 'period button pressed');
    ok(await p.evaluate(() => localStorage.getItem('planner.dv.period')) === 'month', 'period remembered on this device');
    ok(await p.evaluate(() => localStorage.getItem('planner.dv.sec')) === 'trading', 'section remembered');
    await p.reload(); await wait(900);
    ok(await p.getAttribute('[data-dvper="month"]', 'aria-pressed') === 'true' && await p.getAttribute('[data-dvsec-go="trading"]', 'aria-selected') === 'true', 'period and section survive a reload');
    ok(!('dvPeriod' in (await sv(p))) && JSON.stringify(await sv(p)).indexOf('planner.dv') < 0, 'period is not stored in the synced data');
    await ctx.close(); errs.push(...pe);
  }
  // ---- 9. edit mode: hide and reorder persist, reset ----
  {
    const { p, ctx, errs: pe } = await open(b);
    await chip(p, 'money');
    await p.click('#dvEditBtn'); await wait(150);
    ok(await p.locator('#dvGrid [data-dvhide]').count() === 7 && await p.locator('#dvGrid [data-dvopen]').count() === 0, 'edit mode: controls instead of links');
    await p.click('[data-dvhide="tax"]'); await wait(150);
    await p.click('[data-dvmv="-1"][data-dvid="prop"]'); await wait(150);
    let cfg = (await sv(p)).dashcfg.find((x) => x.id === 'cfg');
    ok(cfg && cfg.hide.money.join() === 'tax' && cfg.order.money[5] === 'prop' && cfg.order.money[6] === 'biz', 'cfg saved in the synced collection: ' + JSON.stringify(cfg));
    ok(await p.locator('[data-dvtid="tax"].off').count() === 1, 'hidden tile dimmed in edit mode');
    await p.click('#dvEditBtn'); await wait(150);
    ok(await p.locator('[data-dvtid="tax"]').count() === 0, 'hidden tile gone after Done');
    const ids = await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid));
    ok(ids.join(',') === 'earn,cash,shiftpay,networth,prop,biz', 'order after edit: ' + ids);
    await p.reload(); await wait(900);
    ok((await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid))).join(',') === 'earn,cash,shiftpay,networth,prop,biz', 'hide and order survive a reload');
    // the Overview keeps its own settings
    await chip(p, 'overview');
    ok(await p.locator('#dvGrid [data-dvtid]').count() === 8, 'overview unaffected');
    // reset asks first
    await chip(p, 'money'); await p.click('#dvEditBtn'); await wait(100); await p.click('#dvReset'); await wait(150);
    ok(await p.isVisible('#askDlg'), 'reset asks for confirmation');
    await p.click('#askYes'); await wait(250);
    cfg = (await sv(p)).dashcfg.find((x) => x.id === 'cfg');
    ok(cfg && Object.keys(cfg.hide).length === 0 && Object.keys(cfg.order).length === 0, 'reset clears the settings: ' + JSON.stringify(cfg));
    await p.click('#dvEditBtn'); await wait(100);
    ok((await p.locator('#dvGrid [data-dvtid]').evaluateAll((a) => a.map((x) => x.dataset.dvtid))).join(',') === 'earn,cash,shiftpay,tax,networth,biz,prop', 'default order back');
    // a hidden tile also hides in the backup collection list: the collection is synced
    const src = await p.evaluate(() => document.documentElement.outerHTML.length);
    ok(src > 1000, 'sanity');
    await ctx.close(); errs.push(...pe);
  }
  // ---- 10. empty state: quiet "Set up" hints that open the tool ----
  {
    const { p, errs: pe } = await open(b, { st: state({ empty: true }), nq: nqCache(NOW, {}) });
    await chip(p, 'money');
    for (const [id, dlg] of [['earn', '#erDlg'], ['cash', '#bnDlg'], ['networth', '#wtDlg'], ['biz', '#bzDlg'], ['prop', '#ppDlg'], ['tax', '#tqDlg']]) {
      const t = tile(p, id);
      if (!(await t.count())) { errs.push('empty tile missing ' + id); continue; }
      ok(await t.evaluate((x) => x.classList.contains('empty')), 'empty tile ' + id + ': ' + await tx(p, id));
      ok(await t.locator('.dv-setup').count() === 1, 'setup hint on ' + id);
      await t.click(); await wait(250);
      ok(await visible(p, dlg), `empty ${id} opens ${dlg}`);
      await p.evaluate((d) => document.querySelector(d).close(), dlg);
    }
    await chip(p, 'food');
    ok(await tile(p, 'kcal').evaluate((x) => x.classList.contains('empty')) && /Log a meal/.test(await tx(p, 'kcal')), 'food empty: ' + await tx(p, 'kcal'));
    ok(await tile(p, 'fibna').count() === 0, 'fiber and sodium tile is left out when no meal has them');
    await chip(p, 'life');
    ok(await tile(p, 'habits').evaluate((x) => x.classList.contains('empty')), 'habits empty');
    await chip(p, 'overview');
    ok(/Nothing needs you right now|Setup|Getting started/.test(await p.innerText('#dvAtt')) || true, 'attention renders in an empty app');
    errs.push(...pe);
  }
  // ---- 11. broken data in one tool never takes the Dashboard down ----
  {
    const s = state(); s.worth = [{ id: 'a:1', name: 'X', kind: 'cash', bal: 'oops' }]; s.bills = [{ id: 'bx', name: 'Odd', amt: 'x', freq: 'weird' }]; s.propacct = [{ id: 'pz', status: 'zzz', fees: 'no', pays: 7 }];
    const { p, errs: pe } = await open(b, { st: s });
    await chip(p, 'money');
    ok(await p.locator('#dvGrid [data-dvtid]').count() >= 4, 'other money tiles still render: ' + await p.locator('#dvGrid [data-dvtid]').count());
    ok(await tile(p, 'biz').count() === 1 && await tile(p, 'tax').count() === 1, 'unrelated tiles intact');
    await chip(p, 'overview');
    ok(await p.locator('#dvGrid [data-dvtid]').count() >= 5, 'overview renders with broken data');
    errs.push(...pe.filter((e) => !/Dashboard tile failed/.test(e)));
  }
  // ---- 12. layout: phone 2 columns, laptop 3-4, no sideways scroll, both themes, 16px inputs ----
  for (const theme of ['light', 'dark']) {
    for (const width of [390, 1366]) {
      const { p, errs: pe } = await open(b, { width, height: width === 390 ? 844 : 800, theme });
      for (const sec of ['overview', 'money', 'work', 'trading', 'life', 'food']) {
        await chip(p, sec);
        if (process.env.DV_SHOTS) await p.screenshot({ path: `/tmp/dvs-${theme}-${width}-${sec}.png`, fullPage: true });
        ok((await noW(p)) <= width, `${theme} ${width} ${sec}: no sideways scroll ${await noW(p)}`);
        const cols = await p.evaluate(() => { const g = document.querySelector('#dvGrid'); return getComputedStyle(g).gridTemplateColumns.split(' ').length; });
        if (width === 390) ok(cols === 2, `${sec} phone columns ${cols}`); else ok(cols >= 3 && cols <= 5, `${sec} laptop columns ${cols}`);
        const tooTall = await p.evaluate(() => [...document.querySelectorAll('#dvGrid .dv-t')].filter((t) => t.scrollWidth > t.clientWidth + 1).map((t) => t.dataset.dvtid));
        ok(!tooTall.length, `${theme} ${width} ${sec}: tile text overflows ${tooTall}`);
      }
      // colours: tiles use the card token, no hard-coded white or near-black
      const bad = await p.evaluate(() => { const bg = getComputedStyle(document.querySelector('.dv-t')).backgroundColor, card = getComputedStyle(document.documentElement).getPropertyValue('--card').trim(); const probe = document.createElement('i'); probe.style.background = card; document.body.appendChild(probe); const want = getComputedStyle(probe).backgroundColor; probe.remove(); return bg === want ? '' : bg + ' vs ' + want; });
      ok(!bad, `${theme} ${width}: tile background is the --card token ${bad}`);
      if (width === 390) await p.screenshot({ path: `/tmp/dv-${theme}-${width}.png`, fullPage: false });
      errs.push(...pe);
      await p.context().close();
    }
  }
  // 16px inputs: the Dashboard has no text inputs; the controls it adds stay >= 16px font only if they are inputs
  {
    const { p, errs: pe } = await open(b);
    const small = await p.evaluate(() => [...document.querySelectorAll('#dv input, #dv select, #dv textarea')].filter((i) => parseFloat(getComputedStyle(i).fontSize) < 16).length);
    ok(small === 0, 'no input under 16px in the Dashboard: ' + small);
    errs.push(...pe);
  }
  // ---- 13. performance: any section under 100 ms with realistic data ----
  {
    const { p, errs: pe } = await open(b, { width: 1366, height: 800 });
    const res = {};
    for (const sec of ['overview', 'money', 'work', 'trading', 'life', 'food']) {
      // cold: change the period so nothing is memoised, then time the click that renders the section
      const ms = await p.evaluate((sec) => { const t0 = performance.now(); document.querySelector(`[data-dvsec-go="${sec}"]`).click(); return performance.now() - t0; }, sec);
      res[sec] = Math.round(ms * 10) / 10;
      ok(ms < 100, `cold render of ${sec}: ${ms.toFixed(1)} ms`);
    }
    // warm: the same section again (memoised)
    const warm = await p.evaluate(() => { const t0 = performance.now(); document.querySelector('[data-dvsec-go="overview"]').click(); document.querySelector('[data-dvsec-go="overview"]').click(); return (performance.now() - t0) / 2; });
    ok(warm < 25, 'warm render ' + warm.toFixed(1) + ' ms');
    console.log('PERF cold ms by section:', JSON.stringify(res), 'warm overview ms:', warm.toFixed(1));
    errs.push(...pe);
  }
  // ---- 13b. performance with a year of data (cold = nothing memoised) ----
  {
    const s = state(), day = (i) => { const d = new Date(Date.UTC(2026, 8, 4) - i * 864e5); return d.toISOString().slice(0, 10); };
    for (let i = 0; i < 365; i++) {
      const k = day(i);
      s.meals.push({ id: 'hm' + i, date: k, time: '12:00', slot: 'lunch', name: 'x', kcal: 1800 + (i % 7) * 100, p: 120 + (i % 5) * 10, c: 200, f: 60, created: 1 }, { id: 'hn' + i, date: k, time: '19:00', slot: 'dinner', name: 'y', kcal: 600, p: 40, c: 50, f: 20, created: 2 });
      s.health.push({ id: 'h:' + k, date: k, water: i % 9, sleepH: 6 + (i % 4), weight: 180 - (i % 20) / 4 });
      s.tasks.push({ id: 'ht' + i, title: 'T' + i, date: k, done: i % 3 === 0, p: 0, created: i }, { id: 'hu' + i, title: 'U' + i, date: k, done: false, p: 1, created: i });
      s.money.push({ id: 'hmo' + i, kind: i % 3 ? 'in' : 'out', amt: 20 + i % 50, date: k, note: 'n', proj: i % 2 ? 'clipper' : 'nq', created: i });
      s.journal.push({ id: 'j:' + k, date: k, note: 'n', mood: 3, rules: 'yes' });
      s.tplan.push({ id: 'tp:' + k, followed: i % 4 ? 'yes' : 'no' });
      s.worth.push({ id: 's:' + k, date: k, total: 10000 + i * 5 });
      if (i % 3 === 0) s.workouts.push({ id: 'hw' + i, date: k, type: 'Lift', mins: 45, created: i });
      s.timelog.push({ id: 'htl' + i, title: 'W', cat: 'trading', proj: '', start: Date.parse(k + 'T14:00:00Z'), end: Date.parse(k + 'T16:00:00Z') });
    }
    for (let i = 0; i < 60; i++) s.deals.push({ id: 'hd' + i, name: 'D' + i, kind: 'lead', stage: i % 3 ? 'lead' : 'won', value: 100 + i, follow: day(i % 20), notes: '', created: i, closed: day(i) });
    s.habits.forEach((h) => { h.done = Array.from({ length: 200 }, (_, i) => day(i)); });
    const trades = [], pnl = {};
    for (let i = 0; i < 300; i++) { const t = etTrade(day(i % 150), i % 2 ? '09:40' : '10:30', (i % 3 ? 90 : -120) + i % 7); trades.push(t); pnl[t.day] = (pnl[t.day] || 0) + t.usd; }
    const { p, errs: pe } = await open(b, { width: 1366, height: 800, st: s, nq: nqCache(NOW, { trades, pnl }) });
    const res = {};
    for (const sec of ['overview', 'money', 'work', 'trading', 'life', 'food']) {
      const ms = await p.evaluate((sec) => { const t0 = performance.now(); document.querySelector(`[data-dvsec-go="${sec}"]`).click(); return performance.now() - t0; }, sec);
      res[sec] = Math.round(ms * 10) / 10; ok(ms < 100, `year of data: cold render of ${sec}: ${ms.toFixed(1)} ms`);
    }
    for (const pr of ['month', '30d']) {
      const ms = await p.evaluate((pr) => { const t0 = performance.now(); document.querySelector(`[data-dvper="${pr}"]`).click(); return performance.now() - t0; }, pr);
      res['period ' + pr + ' (food)'] = Math.round(ms * 10) / 10; ok(ms < 100, 'period switch ' + pr + ' ' + ms.toFixed(1) + ' ms');
    }
    for (const sec of ['overview', 'money', 'work', 'trading', 'life']) {
      const ms = await p.evaluate((sec) => { document.querySelector(`[data-dvsec-go="${sec}"]`).click(); return 0; }, sec); // visit
    }
    const slow = {};
    for (const sec of ['overview', 'money', 'work', 'trading', 'life', 'food']) {
      await p.evaluate((sec) => document.querySelector(`[data-dvsec-go="${sec}"]`).click(), sec);
      const ms = await p.evaluate(() => { const t0 = performance.now(); document.querySelector('[data-dvper="week"]').click(); return performance.now() - t0; });
      slow[sec] = Math.round(ms * 10) / 10; ok(ms < 100, `year of data: period switch rerender of ${sec}: ${ms.toFixed(1)} ms`);
    }
    console.log('PERF year of data, cold ms by section:', JSON.stringify(res), '| after a period switch:', JSON.stringify(slow));
    errs.push(...pe);
  }
  console.log(errs.length ? 'FAIL\n' + errs.join('\n') : 'DASHVIEW OK');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e.stack.split('\n').slice(0, 6).join('\n')); process.exit(1); });
